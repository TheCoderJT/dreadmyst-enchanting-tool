import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

const MAX_ENCHANT: Record<number, number> = {
  1: 1,  // White
  2: 3,  // Radiant
  3: 4,  // Blessed
  4: 7,  // Holy
  5: 10, // Godly
};

const ORB_QUALITY_MAP: Record<string, number> = {
  minor: 1,
  lesser: 2,
  greater: 3,
  major: 4,
  divine: 5,
};

// Item rarities for server-side validation
const ITEM_RARITIES = ["white", "radiant", "blessed", "holy", "godly"];
const RARITY_TO_QUALITY: Record<string, number> = {
  white: 1,
  radiant: 2,
  blessed: 3,
  holy: 4,
  godly: 5,
};

// Start a new enchanting session
export const startSession = mutation({
  args: {
    itemName: v.string(),
    itemQuality: v.number(),
    orbInventory: v.object({
      minor: v.number(),
      lesser: v.number(),
      greater: v.number(),
      major: v.number(),
      divine: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is banned
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (userProfile?.isBanned) {
      // Check if ban has expired
      if (userProfile.bannedUntil && userProfile.bannedUntil < Date.now()) {
        // Ban expired, unban the user
        await ctx.db.patch(userProfile._id, {
          isBanned: false,
          banReason: undefined,
          bannedAt: undefined,
          bannedUntil: undefined,
          bannedBy: undefined,
        });
      } else {
        const banMessage = userProfile.bannedUntil
          ? `You are banned until ${new Date(userProfile.bannedUntil).toLocaleDateString()}. Reason: ${userProfile.banReason || "No reason provided"}`
          : `You are permanently banned. Reason: ${userProfile.banReason || "No reason provided"}`;
        throw new Error(banMessage);
      }
    }

    // Rate limit check for session creation (10 per minute)
    const SESSION_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };
    const now = Date.now();
    const existingRateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) => q.eq("userId", userId).eq("action", "session_creation"))
      .first();

    if (existingRateLimit) {
      if (now - existingRateLimit.windowStart > SESSION_RATE_LIMIT.windowMs) {
        await ctx.db.patch(existingRateLimit._id, { count: 1, windowStart: now });
      } else if (existingRateLimit.count >= SESSION_RATE_LIMIT.limit) {
        const resetIn = Math.ceil((SESSION_RATE_LIMIT.windowMs - (now - existingRateLimit.windowStart)) / 1000);
        throw new Error(`Too many sessions created. Please wait ${resetIn} seconds.`);
      } else {
        await ctx.db.patch(existingRateLimit._id, { count: existingRateLimit.count + 1 });
      }
    } else {
      await ctx.db.insert("rateLimits", {
        userId,
        action: "session_creation",
        count: 1,
        windowStart: now,
      });
    }

    // SERVER-SIDE VALIDATION: Reject +level in item name
    if (/\+\d+/.test(args.itemName)) {
      throw new Error("Item name should not include +level. We track items from +0 to max.");
    }

    // SERVER-SIDE VALIDATION: Check rarity matches
    const nameLower = args.itemName.toLowerCase();
    const rarityInName = ITEM_RARITIES.find(r => nameLower.startsWith(r + ' '));
    
    if (rarityInName) {
      const expectedQuality = RARITY_TO_QUALITY[rarityInName];
      if (expectedQuality !== args.itemQuality) {
        throw new Error(`Rarity mismatch: Item name says "${rarityInName}" but quality ${args.itemQuality} was selected.`);
      }
    }

    // SERVER-SIDE VALIDATION: Check affix exists in database
    const hasAffixPattern = nameLower.includes(" of the ") || nameLower.includes(" of ");
    if (hasAffixPattern) {
      const ofTheMatch = nameLower.match(/of the (.+?)$/);
      const ofMatch = nameLower.match(/of (.+?)$/);
      const potentialAffix = ofTheMatch ? `of the ${ofTheMatch[1]}` : (ofMatch ? `of ${ofMatch[1]}` : "");
      
      if (potentialAffix) {
        const affixExists = await ctx.db
          .query("validAffixes")
          .withIndex("by_name", (q) => q.eq("affixName", potentialAffix.toLowerCase()))
          .first();
        
        if (!affixExists) {
          // Fallback: Check partial match (only runs when exact match fails)
          // This is rare since most valid affixes match exactly
          const allAffixes = await ctx.db.query("validAffixes").collect();
          const affixWords = potentialAffix.toLowerCase().split(/\s+/).filter(w => w !== "of" && w !== "the");
          const hasMatch = allAffixes.some(a => {
            const dbWords = a.affixName.toLowerCase().split(/\s+/);
            return affixWords.every(w => dbWords.includes(w));
          });
          
          if (!hasMatch) {
            throw new Error(`Invalid affix: "${potentialAffix}" is not a recognized item affix.`);
          }
        }
      }
    }

    // Check if user has an in-progress session
    const existingSession = await ctx.db
      .query("enchantSessions")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", userId).eq("status", "in_progress")
      )
      .first();

    if (existingSession) {
      throw new Error("You already have an item in progress. Complete or abandon it first.");
    }

    const targetLevel = MAX_ENCHANT[args.itemQuality] || 10;

    const sessionId = await ctx.db.insert("enchantSessions", {
      userId,
      itemName: args.itemName,
      itemQuality: args.itemQuality,
      currentLevel: 0,
      targetLevel,
      status: "in_progress",
      orbInventory: args.orbInventory,
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalOrbsUsed: 0,
      bestStreak: 0,
      worstStreak: 0,
      currentStreak: 0,
      startedAt: Date.now(),
    });

    return { sessionId, targetLevel };
  },
});

// Log an attempt (success or failure)
export const logAttempt = mutation({
  args: {
    sessionId: v.id("enchantSessions"),
    orbType: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const orbQuality = ORB_QUALITY_MAP[args.orbType];
    if (!orbQuality) {
      throw new Error("Invalid orb type");
    }

    // Check if user has this orb
    const orbKey = args.orbType as keyof typeof session.orbInventory;
    if (session.orbInventory[orbKey] <= 0) {
      throw new Error(`No ${args.orbType} orbs remaining`);
    }

    const fromLevel = session.currentLevel;
    
    // Prevent failure attempts when already at level 0
    if (!args.success && fromLevel === 0) {
      throw new Error("Cannot fail when item is already at +0");
    }
    
    let toLevel: number;

    if (args.success) {
      toLevel = fromLevel + 1;
    } else {
      toLevel = fromLevel - 1; // Safe now since we checked above
    }

    // Update streak tracking
    let newCurrentStreak = session.currentStreak;
    let newBestStreak = session.bestStreak;
    let newWorstStreak = session.worstStreak;

    if (args.success) {
      if (newCurrentStreak >= 0) {
        newCurrentStreak++;
      } else {
        newCurrentStreak = 1;
      }
      if (newCurrentStreak > newBestStreak) {
        newBestStreak = newCurrentStreak;
      }
    } else {
      if (newCurrentStreak <= 0) {
        newCurrentStreak--;
      } else {
        newCurrentStreak = -1;
      }
      if (Math.abs(newCurrentStreak) > newWorstStreak) {
        newWorstStreak = Math.abs(newCurrentStreak);
      }
    }

    // Log the attempt
    await ctx.db.insert("sessionAttempts", {
      sessionId: args.sessionId,
      orbQuality,
      fromLevel,
      toLevel,
      success: args.success,
      timestamp: Date.now(),
    });

    // Update orb inventory
    const newInventory = { ...session.orbInventory };
    newInventory[orbKey]--;

    // Update session
    const newTotalSuccesses = session.totalSuccesses + (args.success ? 1 : 0);
    const newTotalFailures = session.totalFailures + (args.success ? 0 : 1);
    const newTotalAttempts = session.totalAttempts + 1;

    // Check if item is maxed
    const isMaxed = toLevel >= session.targetLevel;

    if (isMaxed) {
      // Complete the session
      const completedAt = Date.now();
      const successRate = newTotalAttempts > 0 
        ? (newTotalSuccesses / newTotalAttempts) * 100 
        : 0;

      await ctx.db.patch(args.sessionId, {
        currentLevel: toLevel,
        status: "completed",
        orbInventory: newInventory,
        totalAttempts: newTotalAttempts,
        totalSuccesses: newTotalSuccesses,
        totalFailures: newTotalFailures,
        totalOrbsUsed: newTotalAttempts,
        bestStreak: newBestStreak,
        worstStreak: newWorstStreak,
        currentStreak: newCurrentStreak,
        completedAt,
      });

      // Get user profile for display name
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      // Calculate orb usage breakdown from session attempts
      const allAttempts = await ctx.db
        .query("sessionAttempts")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();

      const orbsUsedByType = {
        minor: 0,
        lesser: 0,
        greater: 0,
        major: 0,
        divine: 0,
      };

      for (const attempt of allAttempts) {
        const orbName = ["minor", "lesser", "greater", "major", "divine"][attempt.orbQuality - 1] as keyof typeof orbsUsedByType;
        if (orbName) {
          orbsUsedByType[orbName]++;
        }
      }

      // Add to completed items leaderboard
      await ctx.db.insert("completedItems", {
        userId,
        sessionId: args.sessionId,
        displayName: profile?.displayName,
        itemName: session.itemName,
        itemQuality: session.itemQuality,
        finalLevel: toLevel,
        totalAttempts: newTotalAttempts,
        totalSuccesses: newTotalSuccesses,
        totalFailures: newTotalFailures,
        successRate,
        totalOrbsUsed: newTotalAttempts,
        bestStreak: newBestStreak,
        completedAt,
        orbsUsedByType,
      });

      // Update global stats (incremental - O(1) instead of recalculating)
      await ctx.scheduler.runAfter(0, internal.stats.incrementCompletedItem, {
        itemQuality: session.itemQuality,
        totalAttempts: newTotalAttempts,
        totalSuccesses: newTotalSuccesses,
        totalOrbsUsed: newTotalAttempts,
        isVerified: false,
      });

      // Update user profile stats
      if (profile) {
        const newTotalItems = profile.totalItemsCompleted + 1;
        const newProfileAttempts = profile.totalAttempts + newTotalAttempts;
        const newProfileSuccesses = profile.totalSuccesses + newTotalSuccesses;
        const newOverallRate = newProfileAttempts > 0
          ? (newProfileSuccesses / newProfileAttempts) * 100
          : 0;

        await ctx.db.patch(profile._id, {
          totalItemsCompleted: newTotalItems,
          totalAttempts: newProfileAttempts,
          totalSuccesses: newProfileSuccesses,
          overallSuccessRate: newOverallRate,
        });
      }

      return {
        success: true,
        newLevel: toLevel,
        isMaxed: true,
        orbsRemaining: newInventory,
        stats: {
          totalAttempts: newTotalAttempts,
          totalSuccesses: newTotalSuccesses,
          totalFailures: newTotalFailures,
          successRate,
          bestStreak: newBestStreak,
        },
      };
    }

    // Update session (not maxed yet)
    await ctx.db.patch(args.sessionId, {
      currentLevel: toLevel,
      orbInventory: newInventory,
      totalAttempts: newTotalAttempts,
      totalSuccesses: newTotalSuccesses,
      totalFailures: newTotalFailures,
      totalOrbsUsed: newTotalAttempts,
      bestStreak: newBestStreak,
      worstStreak: newWorstStreak,
      currentStreak: newCurrentStreak,
    });

    return {
      success: true,
      newLevel: toLevel,
      isMaxed: false,
      orbsRemaining: newInventory,
    };
  },
});

// Get current active session
export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const session = await ctx.db
      .query("enchantSessions")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", userId).eq("status", "in_progress")
      )
      .first();

    return session;
  },
});

// Get user's completed sessions - OPTIMIZED: Server-side pagination
export const getUserCompletedSessions = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // completedAt timestamp for cursor-based pagination
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return { items: [], hasMore: false };
    }

    const limit = args.limit ?? 50;

    // Use cursor-based pagination for efficiency
    let query = ctx.db
      .query("completedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    const completed = await query.take(limit + 1); // Fetch one extra to check if there's more

    const hasMore = completed.length > limit;
    const items = hasMore ? completed.slice(0, limit) : completed;

    return {
      items,
      hasMore,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].completedAt : null,
    };
  },
});

// Abandon current session
export const abandonSession = mutation({
  args: {
    sessionId: v.id("enchantSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    await ctx.db.patch(args.sessionId, {
      status: "abandoned",
    });

    return { success: true };
  },
});

// Pause current session (to resume later)
export const pauseSession = mutation({
  args: {
    sessionId: v.id("enchantSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    await ctx.db.patch(args.sessionId, {
      status: "paused",
    });

    return { success: true };
  },
});

// Resume a paused session
export const resumeSession = mutation({
  args: {
    sessionId: v.id("enchantSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already has an active session
    const existingActive = await ctx.db
      .query("enchantSessions")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", userId).eq("status", "in_progress")
      )
      .first();

    if (existingActive) {
      throw new Error("You already have an active session. Please complete or pause it first.");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    if (session.status !== "paused") {
      throw new Error("Session is not paused");
    }

    // Get user's current saved orb inventory from profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Sync orb inventory from profile if available
    const updatedInventory = profile?.savedOrbInventory || session.orbInventory;

    await ctx.db.patch(args.sessionId, {
      status: "in_progress",
      orbInventory: updatedInventory,
    });

    return { success: true };
  },
});

// Get user's paused sessions
export const getPausedSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }

    const paused = await ctx.db
      .query("enchantSessions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "paused"))
      .order("desc")
      .take(10);

    return paused;
  },
});

// Update orb inventory mid-session
export const updateOrbInventory = mutation({
  args: {
    sessionId: v.id("enchantSessions"),
    orbInventory: v.object({
      minor: v.number(),
      lesser: v.number(),
      greater: v.number(),
      major: v.number(),
      divine: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    await ctx.db.patch(args.sessionId, {
      orbInventory: args.orbInventory,
    });

    return { success: true };
  },
});

// Get or create user profile
export const getOrCreateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      const profileId = await ctx.db.insert("userProfiles", {
        userId,
        displayName: args.displayName || "Anonymous",
        totalItemsCompleted: 0,
        totalAttempts: 0,
        totalSuccesses: 0,
        overallSuccessRate: 0,
      });
      profile = await ctx.db.get(profileId);
      
      // Increment global user count
      await ctx.scheduler.runAfter(0, internal.stats.incrementUserCount, {});
    } else if (args.displayName && args.displayName !== profile.displayName) {
      await ctx.db.patch(profile._id, {
        displayName: args.displayName,
      });
      profile = { ...profile, displayName: args.displayName };
    }

    return profile;
  },
});

// Get user profile
export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return profile;
  },
});

// Save orb inventory to user profile (persists between sessions)
export const saveOrbInventory = mutation({
  args: {
    orbInventory: v.object({
      minor: v.number(),
      lesser: v.number(),
      greater: v.number(),
      major: v.number(),
      divine: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        savedOrbInventory: args.orbInventory,
      });
    } else {
      // Create profile if it doesn't exist
      await ctx.db.insert("userProfiles", {
        userId,
        displayName: "Anonymous",
        totalItemsCompleted: 0,
        totalAttempts: 0,
        totalSuccesses: 0,
        overallSuccessRate: 0,
        savedOrbInventory: args.orbInventory,
      });
    }

    return { success: true };
  },
});

// Delete a completed item (user can only delete their own)
export const deleteCompletedItem = mutation({
  args: {
    completedItemId: v.id("completedItems"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const completedItem = await ctx.db.get(args.completedItemId);
    if (!completedItem) {
      throw new Error("Completed item not found");
    }

    if (completedItem.userId !== userId) {
      throw new Error("You can only delete your own completed items");
    }

    // Update user profile stats (subtract the deleted item's stats)
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      const newTotalItems = Math.max(0, profile.totalItemsCompleted - 1);
      const newTotalAttempts = Math.max(0, profile.totalAttempts - completedItem.totalAttempts);
      const newTotalSuccesses = Math.max(0, profile.totalSuccesses - completedItem.totalSuccesses);
      const newOverallRate = newTotalAttempts > 0
        ? (newTotalSuccesses / newTotalAttempts) * 100
        : 0;

      await ctx.db.patch(profile._id, {
        totalItemsCompleted: newTotalItems,
        totalAttempts: newTotalAttempts,
        totalSuccesses: newTotalSuccesses,
        overallSuccessRate: newOverallRate,
      });
    }

    // Delete the associated enchant session if it exists
    if (completedItem.sessionId) {
      const session = await ctx.db.get(completedItem.sessionId);
      if (session && session.userId === userId) {
        // Delete all attempts for this session first
        const attempts = await ctx.db
          .query("sessionAttempts")
          .withIndex("by_session", (q) => q.eq("sessionId", completedItem.sessionId))
          .collect();
        
        for (const attempt of attempts) {
          await ctx.db.delete(attempt._id);
        }
        
        // Delete the session
        await ctx.db.delete(completedItem.sessionId);
      }
    }

    // Delete the screenshot from storage if it exists
    if (completedItem.screenshotStorageId) {
      try {
        await ctx.storage.delete(completedItem.screenshotStorageId);
      } catch (e) {
        // Storage file may already be deleted, continue
        console.log("Could not delete storage file:", e);
      }
    }

    // Update global stats (decrement)
    await ctx.scheduler.runAfter(0, internal.stats.decrementCompletedItem, {
      itemQuality: completedItem.itemQuality,
      totalAttempts: completedItem.totalAttempts,
      totalSuccesses: completedItem.totalSuccesses,
      totalOrbsUsed: completedItem.totalOrbsUsed,
      wasVerified: completedItem.isVerified || false,
    });

    // Delete the completed item
    await ctx.db.delete(args.completedItemId);

    return { success: true };
  },
});
