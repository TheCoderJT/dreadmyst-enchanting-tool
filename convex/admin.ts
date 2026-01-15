import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

// Get all users with their profiles for admin dashboard
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    filterBanned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 100;

    let profiles;
    if (args.filterBanned) {
      profiles = await ctx.db
        .query("userProfiles")
        .withIndex("by_banned", (q) => q.eq("isBanned", true))
        .take(limit);
    } else {
      profiles = await ctx.db
        .query("userProfiles")
        .take(limit);
    }

    // Get user emails for each profile
    const usersWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          email: user?.email || "Unknown",
        };
      })
    );

    return usersWithDetails;
  },
});

// Get all completed items for moderation review
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

    // Get user details for each item
    const itemsWithUsers = await Promise.all(
      items.map(async (item) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", item.userId))
          .first();
        return {
          ...item,
          userDisplayName: profile?.displayName || "Unknown",
          userIsBanned: profile?.isBanned || false,
        };
      })
    );

    return itemsWithUsers;
  },
});

// Get moderation action history
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

    // Get moderator and target user details
    const actionsWithDetails = await Promise.all(
      actions.map(async (action) => {
        const moderatorProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", action.moderatorId))
          .first();
        const targetProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", action.targetUserId))
          .first();
        return {
          ...action,
          moderatorName: moderatorProfile?.displayName || "Unknown",
          targetName: targetProfile?.displayName || "Unknown",
        };
      })
    );

    return actionsWithDetails;
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

// Get dashboard stats for admin
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [
      totalUsers,
      bannedUsers,
      totalCompletedItems,
      verifiedItems,
      recentActions,
    ] = await Promise.all([
      ctx.db.query("userProfiles").collect().then((p) => p.length),
      ctx.db
        .query("userProfiles")
        .withIndex("by_banned", (q) => q.eq("isBanned", true))
        .collect()
        .then((p) => p.length),
      ctx.db.query("completedItems").collect().then((i) => i.length),
      ctx.db
        .query("completedItems")
        .withIndex("by_verified", (q) => q.eq("isVerified", true))
        .collect()
        .then((i) => i.length),
      ctx.db
        .query("moderationActions")
        .withIndex("by_timestamp")
        .order("desc")
        .take(10),
    ]);

    return {
      totalUsers,
      bannedUsers,
      totalCompletedItems,
      verifiedItems,
      recentActionsCount: recentActions.length,
    };
  },
});
