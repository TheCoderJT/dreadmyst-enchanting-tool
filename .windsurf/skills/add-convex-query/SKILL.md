---
name: add-convex-query
description: Creates a new Convex query with proper authentication and typing
---

# Add Convex Query Skill

Creates a new Convex query function following project conventions.

## Steps

1. **Choose the right file**
   - `sessions.ts` - User session and tracking data
   - `leaderboard.ts` - Public leaderboard queries
   - `admin.ts` - Admin-only queries (requires role check)
   - `verification.ts` - Screenshot verification queries

2. **Add the query with proper structure**
   - Import `query` from `./_generated/server`
   - Import `auth` from `./auth`
   - Define args using Convex validators
   - Check authentication if needed
   - Use indexes for efficient queries

3. **Export from the file**

## Query Template

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

export const myQuery = query({
  args: {
    // Define arguments with validators
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check authentication (if required)
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null; // Return null for unauthenticated, don't throw
    }

    // Use indexes for efficient queries
    const results = await ctx.db
      .query("completedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);

    return results;
  },
});
```

## Admin Query Template

```typescript
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return { userId, profile };
}

export const adminQuery = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Admin-only logic here
  },
});
```

## Available Indexes

| Table | Index | Fields |
|-------|-------|--------|
| enchantSessions | by_user | userId |
| enchantSessions | by_user_status | userId, status |
| enchantSessions | by_status | status |
| completedItems | by_user | userId |
| completedItems | by_completed_at | completedAt |
| completedItems | by_verified | isVerified |
| userProfiles | by_user | userId |
| userProfiles | by_role | role |
| userProfiles | by_banned | isBanned |

## Rules

- Always use indexes with `.withIndex()` instead of `.filter()`
- Return `null` for missing data, don't throw errors in queries
- Use `v.optional()` for optional arguments
- Check authentication at the start if data is user-specific
