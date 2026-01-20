import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,

  // Active enchanting sessions (items being tracked)
  enchantSessions: defineTable({
    userId: v.id("users"),
    itemName: v.string(),
    itemQuality: v.number(),
    currentLevel: v.number(),
    targetLevel: v.number(),
    status: v.union(v.literal("in_progress"), v.literal("paused"), v.literal("completed"), v.literal("abandoned")),
    orbInventory: v.object({
      minor: v.number(),
      lesser: v.number(),
      greater: v.number(),
      major: v.number(),
      divine: v.number(),
    }),
    totalAttempts: v.number(),
    totalSuccesses: v.number(),
    totalFailures: v.number(),
    totalOrbsUsed: v.number(),
    bestStreak: v.number(),
    worstStreak: v.number(),
    currentStreak: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    // Screenshot verification fields
    screenshotUrl: v.optional(v.string()),
    verificationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("failed"),
      v.literal("skipped")
    )),
    verificationDetails: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"]),

  // Individual attempts within a session
  sessionAttempts: defineTable({
    sessionId: v.id("enchantSessions"),
    orbQuality: v.number(),
    fromLevel: v.number(),
    toLevel: v.number(),
    success: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_session", ["sessionId"]),

  // Completed items for leaderboard (denormalized for fast queries)
  completedItems: defineTable({
    userId: v.id("users"),
    sessionId: v.id("enchantSessions"),
    displayName: v.optional(v.string()),
    itemName: v.string(),
    itemQuality: v.number(),
    finalLevel: v.number(),
    totalAttempts: v.number(),
    totalSuccesses: v.number(),
    totalFailures: v.number(),
    successRate: v.number(),
    totalOrbsUsed: v.number(),
    bestStreak: v.number(),
    completedAt: v.number(),
    // Orb usage breakdown
    orbsUsedByType: v.optional(v.object({
      minor: v.number(),
      lesser: v.number(),
      greater: v.number(),
      major: v.number(),
      divine: v.number(),
    })),
    // Verification fields
    isVerified: v.optional(v.boolean()),
    verifiedAt: v.optional(v.number()),
    screenshotUrl: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
  })
    .index("by_completed_at", ["completedAt"])
    .index("by_success_rate", ["successRate"])
    .index("by_user", ["userId"])
    .index("by_verified", ["isVerified"]),

  // User profiles for display names
  userProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    totalItemsCompleted: v.number(),
    totalAttempts: v.number(),
    totalSuccesses: v.number(),
    overallSuccessRate: v.number(),
    // Saved orb inventory (persists between sessions)
    savedOrbInventory: v.optional(v.object({
      minor: v.number(),
      lesser: v.number(),
      greater: v.number(),
      major: v.number(),
      divine: v.number(),
    })),
    // Role and moderation fields
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("moderator"))),
    isBanned: v.optional(v.boolean()),
    banReason: v.optional(v.string()),
    bannedAt: v.optional(v.number()),
    bannedUntil: v.optional(v.number()), // null/undefined = permanent if isBanned is true
    bannedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_items_completed", ["totalItemsCompleted"])
    .index("by_role", ["role"])
    .index("by_banned", ["isBanned"]),

  // Valid item affixes (scraped from dreadmystdb.com)
  validAffixes: defineTable({
    affixName: v.string(),
  })
    .index("by_name", ["affixName"]),

  // Rate limiting for API calls
  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(), // "screenshot_verification", "display_name_moderation"
    count: v.number(),
    windowStart: v.number(),
  })
    .index("by_user_action", ["userId", "action"]),

  // Moderation action logs
  moderationActions: defineTable({
    moderatorId: v.id("users"),
    targetUserId: v.id("users"),
    action: v.union(
      v.literal("ban"),
      v.literal("unban"),
      v.literal("delete_submission"),
      v.literal("warn"),
      v.literal("update_role")
    ),
    reason: v.string(),
    timestamp: v.number(),
    details: v.optional(v.string()), // JSON string for additional context
  })
    .index("by_moderator", ["moderatorId"])
    .index("by_target", ["targetUserId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

  // Pre-computed global statistics (updated incrementally)
  globalStats: defineTable({
    key: v.literal("global"),
    totalUsers: v.number(),
    totalCompletedItems: v.number(),
    totalVerifiedItems: v.number(),
    totalAttempts: v.number(),
    totalSuccesses: v.number(),
    totalOrbsUsed: v.number(),
    // Quality breakdown counts
    qualityCounts: v.object({
      white: v.number(),
      radiant: v.number(),
      blessed: v.number(),
      holy: v.number(),
      godly: v.number(),
    }),
    qualityAttempts: v.object({
      white: v.number(),
      radiant: v.number(),
      blessed: v.number(),
      holy: v.number(),
      godly: v.number(),
    }),
    qualitySuccesses: v.object({
      white: v.number(),
      radiant: v.number(),
      blessed: v.number(),
      holy: v.number(),
      godly: v.number(),
    }),
    lastUpdated: v.number(),
  })
    .index("by_key", ["key"]),
});

export default schema;
