---
name: convex-patterns
trigger: glob
globs: convex/**/*.ts
---

# Convex Backend Patterns Rule

## Authentication
Always check authentication at the start of mutations:
```typescript
const userId = await auth.getUserId(ctx);
if (!userId) {
  throw new Error("Not authenticated");
}
```

## Queries
- Return `null` for missing data, don't throw errors
- Always use indexes with `.withIndex()` instead of `.filter()`
- Use `v.optional()` for optional arguments

## Mutations
- Check authentication first
- Validate input lengths and formats
- Check ownership before updates/deletes
- Use descriptive error messages

## Actions (External APIs)
- Check for API key: `process.env.OPENAI_API_KEY`
- Handle API failures gracefully
- Use `ctx.runMutation()` to save results

## Security
- Never expose API keys in code
- Check `isBanned` before allowing actions
- Implement rate limiting for expensive operations
