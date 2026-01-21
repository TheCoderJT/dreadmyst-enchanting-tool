import { internalMutation } from "./_generated/server";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const cleanupOldData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deletedRateLimits = 0;
    let deletedRefreshTokens = 0;

    // Clean up old rate limits (older than 7 days)
    const oldRateLimits = await ctx.db
      .query("rateLimits")
      .collect();

    for (const rateLimit of oldRateLimits) {
      if (now - rateLimit.windowStart > SEVEN_DAYS_MS) {
        await ctx.db.delete(rateLimit._id);
        deletedRateLimits++;
      }
    }

    // Clean up old auth refresh tokens (older than 30 days)
    // These are from @convex-dev/auth
    const oldRefreshTokens = await ctx.db
      .query("authRefreshTokens")
      .collect();

    for (const token of oldRefreshTokens) {
      // Check if token is expired (expirationTime is in ms)
      if (token.expirationTime && token.expirationTime < now) {
        await ctx.db.delete(token._id);
        deletedRefreshTokens++;
      }
      // Also delete tokens older than 30 days regardless
      else if (token._creationTime && now - token._creationTime > THIRTY_DAYS_MS) {
        await ctx.db.delete(token._id);
        deletedRefreshTokens++;
      }
    }

    console.log(`Cleanup completed: ${deletedRateLimits} rate limits, ${deletedRefreshTokens} refresh tokens deleted`);

    return {
      deletedRateLimits,
      deletedRefreshTokens,
    };
  },
});
