import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const logAttempt = mutation({
  args: {
    itemQuality: v.number(),
    orbQuality: v.number(),
    fromLevel: v.number(),
    success: v.boolean(),
    itemName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const toLevel = args.success ? args.fromLevel + 1 : Math.max(0, args.fromLevel - 1);

    await ctx.db.insert("enchantAttempts", {
      userId,
      itemQuality: args.itemQuality,
      orbQuality: args.orbQuality,
      fromLevel: args.fromLevel,
      toLevel,
      success: args.success,
      timestamp: Date.now(),
      itemName: args.itemName,
    });

    return { success: true, newLevel: toLevel };
  },
});

export const getRecentAttempts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = args.limit ?? 50;

    const attempts = await ctx.db
      .query("enchantAttempts")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return attempts;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const attempts = await ctx.db
      .query("enchantAttempts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        successRate: 0,
        orbsUsed: 0,
        byItemQuality: {},
        byOrbQuality: {},
        currentStreak: 0,
        bestStreak: 0,
        worstStreak: 0,
      };
    }

    const totalAttempts = attempts.length;
    const totalSuccesses = attempts.filter((a) => a.success).length;
    const totalFailures = totalAttempts - totalSuccesses;
    const successRate = (totalSuccesses / totalAttempts) * 100;

    // Stats by item quality
    const byItemQuality: Record<number, { attempts: number; successes: number }> = {};
    for (const attempt of attempts) {
      if (!byItemQuality[attempt.itemQuality]) {
        byItemQuality[attempt.itemQuality] = { attempts: 0, successes: 0 };
      }
      byItemQuality[attempt.itemQuality].attempts++;
      if (attempt.success) {
        byItemQuality[attempt.itemQuality].successes++;
      }
    }

    // Stats by orb quality
    const byOrbQuality: Record<number, { attempts: number; successes: number }> = {};
    for (const attempt of attempts) {
      if (!byOrbQuality[attempt.orbQuality]) {
        byOrbQuality[attempt.orbQuality] = { attempts: 0, successes: 0 };
      }
      byOrbQuality[attempt.orbQuality].attempts++;
      if (attempt.success) {
        byOrbQuality[attempt.orbQuality].successes++;
      }
    }

    // Calculate streaks (sorted by timestamp)
    const sortedAttempts = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let tempSuccessStreak = 0;
    let tempFailStreak = 0;

    for (const attempt of sortedAttempts) {
      if (attempt.success) {
        tempSuccessStreak++;
        tempFailStreak = 0;
        if (tempSuccessStreak > bestStreak) {
          bestStreak = tempSuccessStreak;
        }
      } else {
        tempFailStreak++;
        tempSuccessStreak = 0;
        if (tempFailStreak > worstStreak) {
          worstStreak = tempFailStreak;
        }
      }
    }

    // Current streak (from most recent)
    const reversed = [...sortedAttempts].reverse();
    if (reversed.length > 0) {
      const isWinning = reversed[0].success;
      for (const attempt of reversed) {
        if (attempt.success === isWinning) {
          currentStreak++;
        } else {
          break;
        }
      }
      if (!isWinning) {
        currentStreak = -currentStreak;
      }
    }

    return {
      totalAttempts,
      totalSuccesses,
      totalFailures,
      successRate,
      orbsUsed: totalAttempts,
      byItemQuality,
      byOrbQuality,
      currentStreak,
      bestStreak,
      worstStreak,
    };
  },
});

export const deleteAttempt = mutation({
  args: {
    attemptId: v.id("enchantAttempts"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new Error("Attempt not found or unauthorized");
    }

    await ctx.db.delete(args.attemptId);
    return { success: true };
  },
});
