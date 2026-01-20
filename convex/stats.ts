import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const QUALITY_KEYS = ["white", "radiant", "blessed", "holy", "godly"] as const;
type QualityKey = typeof QUALITY_KEYS[number];

const qualityToKey = (quality: number): QualityKey => {
  return QUALITY_KEYS[quality - 1] || "white";
};

const defaultStats = {
  key: "global" as const,
  totalUsers: 0,
  totalCompletedItems: 0,
  totalVerifiedItems: 0,
  totalAttempts: 0,
  totalSuccesses: 0,
  totalOrbsUsed: 0,
  qualityCounts: { white: 0, radiant: 0, blessed: 0, holy: 0, godly: 0 },
  qualityAttempts: { white: 0, radiant: 0, blessed: 0, holy: 0, godly: 0 },
  qualitySuccesses: { white: 0, radiant: 0, blessed: 0, holy: 0, godly: 0 },
  lastUpdated: Date.now(),
};

// Get or create global stats document
async function getOrCreateGlobalStats(ctx: any): Promise<Doc<"globalStats">> {
  const existing = await ctx.db
    .query("globalStats")
    .withIndex("by_key", (q: any) => q.eq("key", "global"))
    .first();

  if (existing) return existing;

  // Create initial stats document
  const id = await ctx.db.insert("globalStats", defaultStats);
  return (await ctx.db.get(id))!;
}

// Internal mutation to increment stats when a completed item is added
export const incrementCompletedItem = internalMutation({
  args: {
    itemQuality: v.number(),
    totalAttempts: v.number(),
    totalSuccesses: v.number(),
    totalOrbsUsed: v.number(),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stats = await getOrCreateGlobalStats(ctx);
    const qualityKey = qualityToKey(args.itemQuality);

    await ctx.db.patch(stats._id, {
      totalCompletedItems: stats.totalCompletedItems + 1,
      totalVerifiedItems: stats.totalVerifiedItems + (args.isVerified ? 1 : 0),
      totalAttempts: stats.totalAttempts + args.totalAttempts,
      totalSuccesses: stats.totalSuccesses + args.totalSuccesses,
      totalOrbsUsed: stats.totalOrbsUsed + args.totalOrbsUsed,
      qualityCounts: {
        ...stats.qualityCounts,
        [qualityKey]: stats.qualityCounts[qualityKey] + 1,
      },
      qualityAttempts: {
        ...stats.qualityAttempts,
        [qualityKey]: stats.qualityAttempts[qualityKey] + args.totalAttempts,
      },
      qualitySuccesses: {
        ...stats.qualitySuccesses,
        [qualityKey]: stats.qualitySuccesses[qualityKey] + args.totalSuccesses,
      },
      lastUpdated: Date.now(),
    });
  },
});

// Internal mutation to decrement stats when a completed item is deleted
export const decrementCompletedItem = internalMutation({
  args: {
    itemQuality: v.number(),
    totalAttempts: v.number(),
    totalSuccesses: v.number(),
    totalOrbsUsed: v.number(),
    wasVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stats = await getOrCreateGlobalStats(ctx);
    const qualityKey = qualityToKey(args.itemQuality);

    await ctx.db.patch(stats._id, {
      totalCompletedItems: Math.max(0, stats.totalCompletedItems - 1),
      totalVerifiedItems: Math.max(0, stats.totalVerifiedItems - (args.wasVerified ? 1 : 0)),
      totalAttempts: Math.max(0, stats.totalAttempts - args.totalAttempts),
      totalSuccesses: Math.max(0, stats.totalSuccesses - args.totalSuccesses),
      totalOrbsUsed: Math.max(0, stats.totalOrbsUsed - args.totalOrbsUsed),
      qualityCounts: {
        ...stats.qualityCounts,
        [qualityKey]: Math.max(0, stats.qualityCounts[qualityKey] - 1),
      },
      qualityAttempts: {
        ...stats.qualityAttempts,
        [qualityKey]: Math.max(0, stats.qualityAttempts[qualityKey] - args.totalAttempts),
      },
      qualitySuccesses: {
        ...stats.qualitySuccesses,
        [qualityKey]: Math.max(0, stats.qualitySuccesses[qualityKey] - args.totalSuccesses),
      },
      lastUpdated: Date.now(),
    });
  },
});

// Internal mutation to increment verified count
export const incrementVerified = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await getOrCreateGlobalStats(ctx);
    await ctx.db.patch(stats._id, {
      totalVerifiedItems: stats.totalVerifiedItems + 1,
      lastUpdated: Date.now(),
    });
  },
});

// Internal mutation to increment user count
export const incrementUserCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = await getOrCreateGlobalStats(ctx);
    await ctx.db.patch(stats._id, {
      totalUsers: stats.totalUsers + 1,
      lastUpdated: Date.now(),
    });
  },
});

// Fast query for global stats (O(1) instead of O(n))
export const getGlobalStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("globalStats")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    return stats || defaultStats;
  },
});

// One-time migration to populate stats from existing data
export const rebuildGlobalStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all completed items
    const allCompletions = await ctx.db.query("completedItems").collect();
    // Count from users table (registered users), not userProfiles
    const allUsers = await ctx.db.query("users").collect();

    const stats = {
      key: "global" as const,
      totalUsers: allUsers.length,
      totalCompletedItems: allCompletions.length,
      totalVerifiedItems: allCompletions.filter(c => c.isVerified).length,
      totalAttempts: 0,
      totalSuccesses: 0,
      totalOrbsUsed: 0,
      qualityCounts: { white: 0, radiant: 0, blessed: 0, holy: 0, godly: 0 },
      qualityAttempts: { white: 0, radiant: 0, blessed: 0, holy: 0, godly: 0 },
      qualitySuccesses: { white: 0, radiant: 0, blessed: 0, holy: 0, godly: 0 },
      lastUpdated: Date.now(),
    };

    for (const completion of allCompletions) {
      const qualityKey = qualityToKey(completion.itemQuality);
      stats.totalAttempts += completion.totalAttempts;
      stats.totalSuccesses += completion.totalSuccesses;
      stats.totalOrbsUsed += completion.totalOrbsUsed;
      stats.qualityCounts[qualityKey]++;
      stats.qualityAttempts[qualityKey] += completion.totalAttempts;
      stats.qualitySuccesses[qualityKey] += completion.totalSuccesses;
    }

    // Delete existing and insert new
    const existing = await ctx.db
      .query("globalStats")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("globalStats", stats);

    return stats;
  },
});
