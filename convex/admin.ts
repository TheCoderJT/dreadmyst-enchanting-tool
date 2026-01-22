import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Helper to check if user is admin or moderator
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    throw new Error("Unauthorized: Admin or moderator access required");
  }

  return { userId, profile };
}

// Helper to check if user is specifically admin (not just moderator)
async function requireAdminOnly(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  return { userId, profile };
}

// Check if current user is admin/moderator
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isAdmin: false, isModerator: false, role: null };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return { isAdmin: false, isModerator: false, role: null };

    return {
      isAdmin: profile.role === "admin",
      isModerator: profile.role === "moderator" || profile.role === "admin",
      role: profile.role || "user",
    };
  },
});

// Get all users with their profiles for admin dashboard - OPTIMIZED: Batch fetching
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    filterBanned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 100;

    if (args.filterBanned) {
      // For banned filter, query profiles directly (already has all data we need)
      const bannedProfiles = await ctx.db
        .query("userProfiles")
        .withIndex("by_banned", (q) => q.eq("isBanned", true))
        .take(limit);
      
      // Batch fetch users for email
      const userIds = bannedProfiles.map(p => p.userId);
      const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
      const userMap = new Map(users.filter(Boolean).map(u => [u!._id, u!]));

      return bannedProfiles.map(profile => ({
        _id: profile.userId,
        displayName: profile.displayName || "Not Set",
        email: userMap.get(profile.userId)?.email || "Unknown",
        role: profile.role || "user",
        totalItemsCompleted: profile.totalItemsCompleted || 0,
        totalAttempts: profile.totalAttempts || 0,
        totalSuccesses: profile.totalSuccesses || 0,
        overallSuccessRate: profile.overallSuccessRate || 0,
        isBanned: profile.isBanned || false,
        banReason: profile.banReason,
        bannedAt: profile.bannedAt,
        bannedUntil: profile.bannedUntil,
        bannedBy: profile.bannedBy,
        savedOrbInventory: profile.savedOrbInventory,
      }));
    }

    // Get all registered users first (from users table)
    const users = await ctx.db
      .query("users")
      .take(limit);

    // Batch fetch all profiles for these users
    const profiles = await Promise.all(
      users.map(user => 
        ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first()
      )
    );
    const profileMap = new Map(
      profiles.filter(Boolean).map(p => [p!.userId, p!])
    );

    return users.map(user => {
      const profile = profileMap.get(user._id);
      return {
        _id: user._id,
        displayName: profile?.displayName || "Not Set",
        email: user.email || "Unknown",
        role: profile?.role || "user",
        totalItemsCompleted: profile?.totalItemsCompleted || 0,
        totalAttempts: profile?.totalAttempts || 0,
        totalSuccesses: profile?.totalSuccesses || 0,
        overallSuccessRate: profile?.overallSuccessRate || 0,
        isBanned: profile?.isBanned || false,
        banReason: profile?.banReason,
        bannedAt: profile?.bannedAt,
        bannedUntil: profile?.bannedUntil,
        bannedBy: profile?.bannedBy,
        savedOrbInventory: profile?.savedOrbInventory,
      };
    });
  },
});

// Get all completed items for moderation review - OPTIMIZED: Batch fetching
export const getAllCompletedItems = query({
  args: {
    limit: v.optional(v.number()),
    onlyVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 100;

    let items;
    if (args.onlyVerified) {
      items = await ctx.db
        .query("completedItems")
        .withIndex("by_verified", (q) => q.eq("isVerified", true))
        .order("desc")
        .take(limit);
    } else {
      items = await ctx.db
        .query("completedItems")
        .withIndex("by_completed_at")
        .order("desc")
        .take(limit);
    }

    // Batch fetch all user profiles at once (instead of N+1 queries)
    const uniqueUserIds = Array.from(new Set(items.map(item => item.userId)));
    const profiles = await Promise.all(
      uniqueUserIds.map(userId => 
        ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first()
      )
    );
    const profileMap = new Map(
      profiles.filter(Boolean).map(p => [p!.userId, p!])
    );

    return items.map(item => ({
      ...item,
      userDisplayName: profileMap.get(item.userId)?.displayName || "Unknown",
      userIsBanned: profileMap.get(item.userId)?.isBanned || false,
    }));
  },
});

// Get moderation action history - OPTIMIZED: Batch fetching
export const getModerationHistory = query({
  args: {
    limit: v.optional(v.number()),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 50;

    let actions;
    if (args.targetUserId) {
      actions = await ctx.db
        .query("moderationActions")
        .withIndex("by_target", (q) => q.eq("targetUserId", args.targetUserId!))
        .order("desc")
        .take(limit);
    } else {
      actions = await ctx.db
        .query("moderationActions")
        .withIndex("by_timestamp")
        .order("desc")
        .take(limit);
    }

    // Batch fetch all unique user profiles at once (instead of 2N queries)
    const allUserIds = new Set<string>();
    for (const action of actions) {
      allUserIds.add(action.moderatorId);
      allUserIds.add(action.targetUserId);
    }
    
    const profiles = await Promise.all(
      Array.from(allUserIds).map(userId => 
        ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId as any))
          .first()
      )
    );
    const profileMap = new Map(
      profiles.filter(Boolean).map(p => [p!.userId, p!])
    );

    return actions.map(action => ({
      ...action,
      moderatorName: profileMap.get(action.moderatorId)?.displayName || "Unknown",
      targetName: profileMap.get(action.targetUserId)?.displayName || "Unknown",
    }));
  },
});

// Ban a user
export const banUser = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.string(),
    durationDays: v.optional(v.number()), // null = permanent
  },
  handler: async (ctx, args) => {
    const { userId: moderatorId } = await requireAdmin(ctx);

    // Get target user's profile
    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetProfile) {
      throw new Error("User not found");
    }

    // Prevent banning admins
    if (targetProfile.role === "admin") {
      throw new Error("Cannot ban an admin");
    }

    // Calculate ban end time
    const now = Date.now();
    const bannedUntil = args.durationDays
      ? now + args.durationDays * 24 * 60 * 60 * 1000
      : undefined; // undefined = permanent

    // Update user profile
    await ctx.db.patch(targetProfile._id, {
      isBanned: true,
      banReason: args.reason,
      bannedAt: now,
      bannedUntil,
      bannedBy: moderatorId,
    });

    // Log the moderation action
    await ctx.db.insert("moderationActions", {
      moderatorId,
      targetUserId: args.targetUserId,
      action: "ban",
      reason: args.reason,
      timestamp: now,
      details: JSON.stringify({
        durationDays: args.durationDays || "permanent",
        bannedUntil,
      }),
    });

    return { success: true };
  },
});

// Unban a user
export const unbanUser = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: moderatorId } = await requireAdmin(ctx);

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetProfile) {
      throw new Error("User not found");
    }

    // Update user profile
    await ctx.db.patch(targetProfile._id, {
      isBanned: false,
      banReason: undefined,
      bannedAt: undefined,
      bannedUntil: undefined,
      bannedBy: undefined,
    });

    // Log the moderation action
    await ctx.db.insert("moderationActions", {
      moderatorId,
      targetUserId: args.targetUserId,
      action: "unban",
      reason: args.reason,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Delete a completed item (admin moderation)
export const deleteCompletedItemAdmin = mutation({
  args: {
    completedItemId: v.id("completedItems"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: moderatorId } = await requireAdmin(ctx);

    const item = await ctx.db.get(args.completedItemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Get the user's profile to update stats
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", item.userId))
      .first();

    // Delete the screenshot from storage if it exists
    if (item.screenshotStorageId) {
      try {
        await ctx.storage.delete(item.screenshotStorageId);
      } catch (e) {
        console.log("Could not delete storage file:", e);
      }
    }

    // Delete the item
    await ctx.db.delete(args.completedItemId);

    // Update user stats if profile exists
    if (userProfile) {
      const newTotalItems = Math.max(0, userProfile.totalItemsCompleted - 1);
      const newTotalAttempts = Math.max(0, userProfile.totalAttempts - item.totalAttempts);
      const newTotalSuccesses = Math.max(0, userProfile.totalSuccesses - item.totalSuccesses);
      const newSuccessRate = newTotalAttempts > 0
        ? (newTotalSuccesses / newTotalAttempts) * 100
        : 0;

      await ctx.db.patch(userProfile._id, {
        totalItemsCompleted: newTotalItems,
        totalAttempts: newTotalAttempts,
        totalSuccesses: newTotalSuccesses,
        overallSuccessRate: newSuccessRate,
      });
    }

    // Update global stats (decrement)
    await ctx.scheduler.runAfter(0, internal.stats.decrementCompletedItem, {
      itemQuality: item.itemQuality,
      totalAttempts: item.totalAttempts,
      totalSuccesses: item.totalSuccesses,
      totalOrbsUsed: item.totalOrbsUsed,
      wasVerified: item.isVerified || false,
    });

    // Log the moderation action
    await ctx.db.insert("moderationActions", {
      moderatorId,
      targetUserId: item.userId,
      action: "delete_submission",
      reason: args.reason,
      timestamp: Date.now(),
      details: JSON.stringify({
        itemName: item.itemName,
        finalLevel: item.finalLevel,
        completedItemId: args.completedItemId,
      }),
    });

    return { success: true };
  },
});

// Warn a user
export const warnUser = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: moderatorId } = await requireAdmin(ctx);

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetProfile) {
      throw new Error("User not found");
    }

    // Log the warning
    await ctx.db.insert("moderationActions", {
      moderatorId,
      targetUserId: args.targetUserId,
      action: "warn",
      reason: args.reason,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Update user role (admin only)
export const updateUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("user"), v.literal("admin"), v.literal("moderator")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: moderatorId } = await requireAdminOnly(ctx);

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetProfile) {
      throw new Error("User not found");
    }

    const oldRole = targetProfile.role || "user";

    // Update role
    await ctx.db.patch(targetProfile._id, {
      role: args.newRole,
    });

    // Log the action
    await ctx.db.insert("moderationActions", {
      moderatorId,
      targetUserId: args.targetUserId,
      action: "update_role",
      reason: args.reason,
      timestamp: Date.now(),
      details: JSON.stringify({
        oldRole,
        newRole: args.newRole,
      }),
    });

    return { success: true };
  },
});

// Get user warnings count
export const getUserWarnings = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const warnings = await ctx.db
      .query("moderationActions")
      .withIndex("by_target", (q) => q.eq("targetUserId", args.targetUserId))
      .filter((q) => q.eq(q.field("action"), "warn"))
      .collect();

    return {
      count: warnings.length,
      warnings,
    };
  },
});

// Get dashboard stats for admin - REAL-TIME: Direct counts for accuracy, indexed for performance
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // All queries run in parallel for speed
    // Using .collect() for small tables and indexed queries for filtered data
    const [
      allUsers,
      bannedProfiles,
      allCompletedItems,
      verifiedItems,
      inProgressSessions,
      pausedSessions,
      recentActions,
    ] = await Promise.all([
      // Direct count from users table - always accurate, table is small
      ctx.db.query("users").collect(),
      // Indexed query for banned users
      ctx.db
        .query("userProfiles")
        .withIndex("by_banned", (q) => q.eq("isBanned", true))
        .collect(),
      // Direct count from completedItems - accurate real-time
      ctx.db.query("completedItems").collect(),
      // Indexed query for verified items
      ctx.db
        .query("completedItems")
        .withIndex("by_verified", (q) => q.eq("isVerified", true))
        .collect(),
      // Indexed query for in-progress sessions
      ctx.db
        .query("enchantSessions")
        .withIndex("by_status", (q) => q.eq("status", "in_progress"))
        .collect(),
      // Indexed query for paused sessions
      ctx.db
        .query("enchantSessions")
        .withIndex("by_status", (q) => q.eq("status", "paused"))
        .collect(),
      // Recent moderation actions
      ctx.db
        .query("moderationActions")
        .withIndex("by_timestamp")
        .order("desc")
        .take(10),
    ]);

    return {
      totalUsers: allUsers.length,
      bannedUsers: bannedProfiles.length,
      totalCompletedItems: allCompletedItems.length,
      verifiedItems: verifiedItems.length,
      inProgressSessions: inProgressSessions.length,
      pausedSessions: pausedSessions.length,
      recentActionsCount: recentActions.length,
    };
  },
});
