import { v } from "convex/values";
import { query } from "./_generated/server";

// Get recent completed items (public - no auth required)
export const getRecentCompletions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const completions = await ctx.db
      .query("completedItems")
      .withIndex("by_completed_at")
      .order("desc")
      .take(limit);

    return completions;
  },
});

// Get top completions by success rate (public)
export const getTopBySuccessRate = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const completions = await ctx.db
      .query("completedItems")
      .withIndex("by_success_rate")
      .order("desc")
      .take(limit);

    return completions;
  },
});

// Get unluckiest completions by success rate (ascending - lowest first)
export const getUnluckiest = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const completions = await ctx.db
      .query("completedItems")
      .withIndex("by_success_rate")
      .order("asc")
      .take(limit);

    return completions;
  },
});

// Get community stats (public)
export const getCommunityStats = query({
  args: {},
  handler: async (ctx) => {
    // Get all completed items for stats
    const allCompletions = await ctx.db
      .query("completedItems")
      .collect();

    // Get all user profiles
    const allProfiles = await ctx.db
      .query("userProfiles")
      .collect();

    const totalUsers = allProfiles.length;
    const totalItemsMaxed = allCompletions.length;
    const totalVerified = allCompletions.filter(c => c.isVerified).length;

    // Calculate global stats
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalOrbsUsed = 0;

    for (const completion of allCompletions) {
      totalAttempts += completion.totalAttempts;
      totalSuccesses += completion.totalSuccesses;
      totalOrbsUsed += completion.totalOrbsUsed;
    }

    const globalSuccessRate = totalAttempts > 0
      ? (totalSuccesses / totalAttempts) * 100
      : 0;

    // Find luckiest player (min 3 items completed)
    let luckiestPlayer = null;
    let highestSuccessRate = 0;

    for (const profile of allProfiles) {
      if (profile.totalItemsCompleted >= 3 && profile.overallSuccessRate > highestSuccessRate) {
        highestSuccessRate = profile.overallSuccessRate;
        luckiestPlayer = {
          displayName: profile.displayName,
          successRate: profile.overallSuccessRate,
          itemsCompleted: profile.totalItemsCompleted,
        };
      }
    }

    // Find most dedicated player
    let mostDedicated = null;
    let mostItems = 0;

    for (const profile of allProfiles) {
      if (profile.totalItemsCompleted > mostItems) {
        mostItems = profile.totalItemsCompleted;
        mostDedicated = {
          displayName: profile.displayName,
          itemsCompleted: profile.totalItemsCompleted,
          successRate: profile.overallSuccessRate,
        };
      }
    }

    // Stats by item quality
    const qualityStats: Record<number, { count: number; totalAttempts: number; totalSuccesses: number }> = {};
    
    for (const completion of allCompletions) {
      if (!qualityStats[completion.itemQuality]) {
        qualityStats[completion.itemQuality] = { count: 0, totalAttempts: 0, totalSuccesses: 0 };
      }
      qualityStats[completion.itemQuality].count++;
      qualityStats[completion.itemQuality].totalAttempts += completion.totalAttempts;
      qualityStats[completion.itemQuality].totalSuccesses += completion.totalSuccesses;
    }

    const qualityBreakdown = Object.entries(qualityStats).map(([quality, stats]) => ({
      quality: Number(quality),
      itemsCompleted: stats.count,
      avgAttempts: stats.count > 0 ? stats.totalAttempts / stats.count : 0,
      successRate: stats.totalAttempts > 0 ? (stats.totalSuccesses / stats.totalAttempts) * 100 : 0,
    }));

    return {
      totalUsers,
      totalItemsMaxed,
      totalVerified,
      totalAttempts,
      totalSuccesses,
      totalOrbsUsed,
      globalSuccessRate,
      luckiestPlayer,
      mostDedicated,
      qualityBreakdown,
    };
  },
});

// Get completions with optional verified filter
export const getFilteredCompletions = query({
  args: {
    limit: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    quality: v.optional(v.number()),
    sortBy: v.optional(v.union(
      v.literal("recent"),
      v.literal("successRate"),
      v.literal("attempts")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const sortBy = args.sortBy ?? "recent";

    let completions;
    
    if (sortBy === "successRate") {
      completions = await ctx.db
        .query("completedItems")
        .withIndex("by_success_rate")
        .order("desc")
        .take(limit * 2); // Get extra to filter
    } else {
      completions = await ctx.db
        .query("completedItems")
        .withIndex("by_completed_at")
        .order("desc")
        .take(limit * 2);
    }

    // Apply filters
    let filtered = completions;
    
    if (args.verifiedOnly) {
      filtered = filtered.filter(c => c.isVerified === true);
    }
    
    if (args.quality !== undefined) {
      filtered = filtered.filter(c => c.itemQuality === args.quality);
    }

    // Sort by attempts if needed
    if (sortBy === "attempts") {
      filtered = filtered.sort((a, b) => b.totalAttempts - a.totalAttempts);
    }

    return filtered.slice(0, limit);
  },
});

// Get leaderboard by most items completed (public)
export const getTopPlayers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_items_completed")
      .order("desc")
      .take(limit);

    return profiles.filter(p => p.totalItemsCompleted > 0);
  },
});
