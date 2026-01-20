---
name: add-feature
description: Complete workflow for adding a new feature to the Dreadmyst Enchanting Tool
---

# Add New Feature Workflow

Complete workflow for implementing a new feature end-to-end.

## Steps

### 1. Plan the Feature
- Define what the feature does
- Identify required database changes
- List components needed
- Determine API endpoints (Convex queries/mutations)

### 2. Update Database Schema (if needed)
Edit `convex/schema.ts`:
- Add new tables or fields
- Add appropriate indexes
- Run `npx convex dev` to apply changes

### 3. Create Convex Functions
Add to appropriate file in `convex/`:
- Queries for reading data
- Mutations for writing data
- Actions for external API calls

### 4. Create React Components
For each component:
1. Create `ComponentName.tsx` in `src/components/FeatureName/`
2. Create `ComponentName.module.css` in same directory
3. Use CSS modules with theme variables
4. Write mobile-first responsive CSS

### 5. Integrate with Main App
Update `src/app/page.tsx`:
- Add new tab if needed
- Import and render component
- Handle authentication if required

### 6. Test the Feature
- Test on mobile viewport (320px)
- Test on tablet viewport (768px)
- Test on desktop viewport (1024px+)
- Test authenticated and unauthenticated states
- Test error states

### 7. Deploy

#### Deploy Convex Backend
// turbo
```bash
npx convex deploy
```

#### Deploy Frontend (Vercel)
Push changes to GitHub - Vercel auto-deploys from main branch:
```bash
git add .
git commit -m "Add [feature name]"
git push
```

The frontend is hosted at: `https://isitp2w.com/games/dreadmyst/orb-enchanting-tool`

## Checklist

- [ ] Database schema updated (if needed)
- [ ] Convex functions created with auth checks
- [ ] Components use CSS modules (no inline Tailwind)
- [ ] Mobile-first responsive design
- [ ] Theme variables used for colors
- [ ] Touch targets are 44px minimum
- [ ] Error handling implemented
- [ ] Loading states shown
- [ ] Tested on Vercel deployment
