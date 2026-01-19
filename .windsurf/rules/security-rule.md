---
name: security-best-practices
trigger: always_on
---

# Security Best Practices Rule

## API Keys
- NEVER hardcode API keys in source code
- Use Convex environment variables: `process.env.OPENAI_API_KEY`
- Never use `NEXT_PUBLIC_` prefix for sensitive keys

## Authentication
- All mutations must check `auth.getUserId(ctx)`
- Return early if user is not authenticated
- Check `isBanned` status before allowing actions

## Input Validation
- Validate all user inputs server-side in Convex
- Check string lengths before saving
- Reject patterns like `+\d+` in item names
- Validate against `validAffixes` table

## Rate Limiting
- Implement rate limits for expensive operations
- Use `rateLimits` table in Convex
- Screenshot verification: 5 per hour
- Display name changes: 3 per hour

## Data Access
- Always verify ownership before updates/deletes
- Check `item.userId === userId` before modifications
- Admin functions must use `requireAdmin()` helper
