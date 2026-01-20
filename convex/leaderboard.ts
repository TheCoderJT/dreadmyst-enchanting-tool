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

// Get community stats (public) - OPTIMIZED: Uses pre-computed globalStats
export const getCommunityStats = query({
  args: {},
  handler: async (ctx) => {
    // Get pre-computed global stats (O(1) instead of O(n) full table scan)
    const globalStats = await ctx.db
      .query("globalStats")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    // Only fetch top players for luckiest/most dedicated (small indexed queries)
    const topBySuccessRate = await ctx.db
      .query("userProfiles")
      .withIndex("by_items_completed")
      .order("desc")
      .take(50);

    // Find luckiest player (min 3 items completed)
    let luckiestPlayer = null;
    let highestSuccessRate = 0;
    let mostDedicated = null;
    let mostItems = 0;

    for (const profile of topBySuccessRate) {
      if (profile.totalItemsCompleted >= 3 && profile.overallSuccessRate > highestSuccessRate) {
        highestSuccessRate = profile.overallSuccessRate;
        luckiestPlayer = {
          displayName: profile.displayName,
          successRate: profile.overallSuccessRate,
          itemsCompleted: profile.totalItemsCompleted,
        };
      }
      if (profile.totalItemsCompleted > mostItems) {
        mostItems = profile.totalItemsCompleted;
        mostDedicated = {
          displayName: profile.displayName,
          itemsCompleted: profile.totalItemsCompleted,
          successRate: profile.overallSuccessRate,
        };
      }
    }

    // Use pre-computed stats or fallback to defaults
    const totalUsers = globalStats?.totalUsers ?? 0;
    const totalItemsMaxed = globalStats?.totalCompletedItems ?? 0;
    const totalVerified = globalStats?.totalVerifiedItems ?? 0;
    const totalAttempts = globalStats?.totalAttempts ?? 0;
    const totalSuccesses = globalStats?.totalSuccesses ?? 0;
    const totalOrbsUsed = globalStats?.totalOrbsUsed ?? 0;

    const globalSuccessRate = totalAttempts > 0
      ? (totalSuccesses / totalAttempts) * 100
      : 0;

    // Build quality breakdown from pre-computed stats
    const qualityBreakdown = globalStats ? [
      { quality: 1, itemsCompleted: globalStats.qualityCounts.white, avgAttempts: globalStats.qualityCounts.white > 0 ? globalStats.qualityAttempts.white / globalStats.qualityCounts.white : 0, successRate: globalStats.qualityAttempts.white > 0 ? (globalStats.qualitySuccesses.white / globalStats.qualityAttempts.white) * 100 : 0 },
      { quality: 2, itemsCompleted: globalStats.qualityCounts.radiant, avgAttempts: globalStats.qualityCounts.radiant > 0 ? globalStats.qualityAttempts.radiant / globalStats.qualityCounts.radiant : 0, successRate: globalStats.qualityAttempts.radiant > 0 ? (globalStats.qualitySuccesses.radiant / globalStats.qualityAttempts.radiant) * 100 : 0 },
      { quality: 3, itemsCompleted: globalStats.qualityCounts.blessed, avgAttempts: globalStats.qualityCounts.blessed > 0 ? globalStats.qualityAttempts.blessed / globalStats.qualityCounts.blessed : 0, successRate: globalStats.qualityAttempts.blessed > 0 ? (globalStats.qualitySuccesses.blessed / globalStats.qualityAttempts.blessed) * 100 : 0 },
      { quality: 4, itemsCompleted: globalStats.qualityCounts.holy, avgAttempts: globalStats.qualityCounts.holy > 0 ? globalStats.qualityAttempts.holy / globalStats.qualityCounts.holy : 0, successRate: globalStats.qualityAttempts.holy > 0 ? (globalStats.qualitySuccesses.holy / globalStats.qualityAttempts.holy) * 100 : 0 },
      { quality: 5, itemsCompleted: globalStats.qualityCounts.godly, avgAttempts: globalStats.qualityCounts.godly > 0 ? globalStats.qualityAttempts.godly / globalStats.qualityCounts.godly : 0, successRate: globalStats.qualityAttempts.godly > 0 ? (globalStats.qualitySuccesses.godly / globalStats.qualityAttempts.godly) * 100 : 0 },
    ].filter(q => q.itemsCompleted > 0) : [];

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
