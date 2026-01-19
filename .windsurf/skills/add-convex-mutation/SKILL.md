---
name: add-convex-mutation
description: Creates a new Convex mutation with authentication, validation, and proper error handling
---

# Add Convex Mutation Skill

Creates a new Convex mutation function following project conventions.

## Steps

1. **Choose the right file**
   - `sessions.ts` - Session CRUD operations
   - `admin.ts` - Admin actions (ban, unban, delete)
   - `verification.ts` - Verification status updates

2. **Add the mutation with proper structure**
   - Import `mutation` from `./_generated/server`
   - Import `auth` from `./auth`
   - Define args using Convex validators
   - Check authentication (required for mutations)
   - Validate inputs
   - Check ownership/permissions
   - Perform database operations

3. **Handle errors properly**

## Mutation Template

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { auth } from "./auth";

export const myMutation = mutation({
  args: {
    itemId: v.id("completedItems"),
    newValue: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check authentication (REQUIRED)
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 2. Check if user is banned
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (userProfile?.isBanned) {
      throw new Error("You are banned from performing this action");
    }

    // 3. Validate inputs
    if (args.newValue.length > 100) {
      throw new Error("Value too long (max 100 characters)");
    }

    // 4. Check ownership
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found or access denied");
    }

    // 5. Perform the update
    await ctx.db.patch(args.itemId, {
      someField: args.newValue,
    });

    return { success: true };
  },
});
```

## Rate-Limited Mutation Template

```typescript
export const rateLimitedMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check rate limit
    const RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };
    const now = Date.now();
    
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) => 
        q.eq("userId", userId).eq("action", "my_action")
      )
      .first();

    if (existing) {
      if (now - existing.windowStart > RATE_LIMIT.windowMs) {
        await ctx.db.patch(existing._id, { count: 1, windowStart: now });
      } else if (existing.count >= RATE_LIMIT.limit) {
        throw new Error("Rate limited. Please try again later.");
      } else {
        await ctx.db.patch(existing._id, { count: existing.count + 1 });
      }
    } else {
      await ctx.db.insert("rateLimits", {
        userId,
        action: "my_action",
        count: 1,
        windowStart: now,
      });
    }

    // Continue with mutation logic...
  },
});
```

## Common Validators

```typescript
v.string()              // String
v.number()              // Number
v.boolean()             // Boolean
v.id("tableName")       // Document ID
v.optional(v.string())  // Optional string
v.union(v.literal("a"), v.literal("b"))  // Enum
v.object({ key: v.string() })  // Object
v.array(v.string())     // Array
```

## Rules

- Always check authentication first
- Always validate input lengths and formats
- Always check ownership before updates/deletes
- Use descriptive error messages
- Return `{ success: true }` or meaningful result
- Consider rate limiting for expensive operations
