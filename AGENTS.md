# Dreadmyst Enchanting Tool - AI Agent Guidelines

This is a Next.js 14 App Router application with Convex backend for tracking enchanting sessions in the game Dreadmyst.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Backend**: Convex (serverless functions + database)
- **Authentication**: @convex-dev/auth with Password provider
- **Styling**: CSS Modules (mobile-first, no Tailwind inline classes)
- **Language**: TypeScript
- **AI Integration**: OpenAI API (gpt-4o-mini) for moderation and verification

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main application page with tab navigation
│   ├── layout.tsx         # Root layout with Convex provider
│   └── globals.css        # CSS variables and global styles
├── components/            # React components organized by feature
│   ├── Auth/              # Authentication components
│   │   ├── AuthForm.tsx
│   │   └── AuthForm.module.css
│   ├── EnchantTracker/    # Item tracking functionality
│   │   ├── EnchantTracker.tsx
│   │   └── EnchantTracker.module.css
│   ├── Leaderboard/       # Leaderboard display
│   │   ├── Leaderboard.tsx
│   │   └── Leaderboard.module.css
│   └── ...                # Each component has co-located .module.css

convex/
├── schema.ts              # Database schema definitions
├── sessions.ts            # Session management mutations/queries
├── admin.ts               # Admin functionality
├── moderation.ts          # OpenAI display name moderation
├── verification.ts        # Screenshot verification with OpenAI Vision
└── leaderboard.ts         # Leaderboard queries
```

## Coding Conventions

### CSS Modules (CRITICAL)
- **NEVER use inline Tailwind classes**
- All styling must be in `.module.css` files
- Use CSS variables from `globals.css` for theming
- Write mobile-first CSS with `min-width` media queries
- Reference: `docs/THEME.md` for available CSS variables

### Convex Backend
- All database operations go through Convex mutations/queries
- Use `auth.getUserId(ctx)` for authentication checks
- Actions are for external API calls (OpenAI)
- Mutations are for database writes
- Queries are for database reads

### TypeScript
- Use strict typing
- Define interfaces for component props
- Use Convex's generated types from `convex/_generated/`

### Component Structure
- Functional components with hooks
- CSS module import at top: `import styles from './Component.module.css'`
- Use `className={styles.className}` syntax
- Combine classes with template literals or clsx

## Key Files Reference

| Purpose | File |
|---------|------|
| Database Schema | `convex/schema.ts` |
| Session Logic | `convex/sessions.ts` |
| OpenAI Moderation | `convex/moderation.ts` |
| Screenshot Verification | `convex/verification.ts` |
| Main Page | `src/app/page.tsx` |
| Theme Variables | `src/app/globals.css` |
| Integration Plan | `docs/OPENAI_INTEGRATION_PLAN.md` |

## Security Rules

1. **Never hardcode API keys** - Use Convex environment variables
2. **Server-side validation** - All user input validated in Convex mutations
3. **Authentication required** - Protected routes check `auth.getUserId(ctx)`
4. **Rate limiting** - Implemented in `convex/verification.ts`

## Common Patterns

### Adding a New Convex Query
```typescript
export const myQuery = query({
  args: { /* arg definitions */ },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    // Query logic
  },
});
```

### Adding a New Component
1. Create `ComponentName.tsx` in appropriate folder
2. Create `ComponentName.module.css` in same folder
3. Write mobile-first CSS
4. Import and use CSS module classes
