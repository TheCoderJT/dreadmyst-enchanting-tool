# Convex Backend Guidelines

This directory contains all Convex serverless functions for the Dreadmyst Enchanting Tool.

## File Organization

| File | Purpose |
|------|---------|
| `schema.ts` | Database table definitions with indexes |
| `sessions.ts` | Enchanting session CRUD operations |
| `admin.ts` | Admin panel queries and mutations |
| `moderation.ts` | OpenAI display name moderation |
| `verification.ts` | Screenshot verification with OpenAI Vision |
| `leaderboard.ts` | Leaderboard queries with filters |
| `validation.ts` | Item name and affix validation |
| `auth.ts` | Authentication configuration |

## Coding Standards

### Authentication Pattern
Always check authentication at the start of mutations/queries:
```typescript
const userId = await auth.getUserId(ctx);
if (!userId) {
  throw new Error("Not authenticated");
}
```

### Query Pattern
```typescript
export const myQuery = query({
  args: { /* use v.string(), v.number(), etc */ },
  handler: async (ctx, args) => {
    // Return data, never throw for missing data
    return result || null;
  },
});
```

### Mutation Pattern
```typescript
export const myMutation = mutation({
  args: { /* arg definitions */ },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Validate inputs
    // Perform database operations
    // Return result
  },
});
```

### Action Pattern (for external APIs)
```typescript
export const myAction = action({
  args: { /* arg definitions */ },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "API not configured" };
    }
    
    // Call external API
    // Use ctx.runMutation() to save results
  },
});
```

## Database Tables

- `enchantSessions` - Active tracking sessions
- `completedItems` - Finished items for leaderboard
- `userProfiles` - User display names and stats
- `validAffixes` - 4,677 valid item affixes
- `rateLimits` - API rate limiting
- `moderationActions` - Admin action logs

## Security Rules

1. **Never expose API keys** - Use `process.env.OPENAI_API_KEY`
2. **Validate all inputs** - Check lengths, patterns, types
3. **Check ownership** - Verify `userId` matches before updates
4. **Rate limit** - Use `rateLimits` table for expensive operations
5. **Ban checks** - Check `isBanned` before allowing actions

## Index Usage

Always use indexes for queries:
```typescript
// Good - uses index
ctx.db.query("completedItems")
  .withIndex("by_user", (q) => q.eq("userId", userId))

// Bad - full table scan
ctx.db.query("completedItems")
  .filter((q) => q.eq(q.field("userId"), userId))
```
