# Vercel Migration Plan

## Overview
Migrate the Dreadmyst Enchanting Tool frontend from GitHub Pages to Vercel while keeping the Convex backend unchanged. The tool will be accessible at `isitp2w.com/games/dreadmyst/orb-enchanting-tool` using Vercel rewrites from your main site.

## Current Setup
- **Frontend**: GitHub Pages (static export)
- **Backend**: Convex (serverless)
- **URL**: `thecoderjt.github.io/dreadmyst-enchanting-tool`
- **Build**: `next export` with basePath for GitHub Pages

## Target Setup
- **Frontend**: Vercel (SSR/SSG capable)
- **Backend**: Convex (unchanged)
- **URL**: `isitp2w.com/games/dreadmyst/orb-enchanting-tool`
- **Build**: Standard Next.js build
- **Architecture**: Vercel rewrite from main isitp2w.com project to tool's Vercel deployment

---

## Migration Phases

### Phase 1: Prepare Codebase for Cross-Compatibility
**Status**: Pending
**Time**: 30 minutes

#### 1.1 Update next.config.js
Make the config detect the deployment platform and adjust accordingly:

```javascript
/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // Only use static export for GitHub Pages
  ...(isGitHubPages && { output: 'export' }),
  images: {
    unoptimized: true,
  },
  // Only use basePath for GitHub Pages
  ...(isGitHubPages && { 
    basePath: '/dreadmyst-enchanting-tool',
    assetPrefix: '/dreadmyst-enchanting-tool/',
  }),
}

module.exports = nextConfig
```

#### 1.2 Update GitHub Actions Workflow
Add `GITHUB_PAGES=true` environment variable to the deploy workflow.

#### 1.3 Add Environment Variable Detection
Create a utility to detect the current deployment environment.

---

### Phase 2: Update Convex Auth Configuration
**Status**: Pending
**Time**: 15 minutes

#### 2.1 Update Convex Dashboard
In the Convex dashboard, add the new domain to allowed origins:
- `https://isitp2w.com`

#### 2.2 Update Environment Variables in Convex
Update `SITE_URL` to `https://isitp2w.com` in Convex environment variables.

---

### Phase 3: Deploy to Vercel
**Status**: Pending
**Time**: 30 minutes

#### 3.1 Create New Vercel Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `dreadmyst-enchanting-tool` repository
3. Framework: Next.js (auto-detected)
4. Build Command: `npm run build` (default)
5. Output Directory: `.next` (default for Vercel)

#### 3.2 Add Environment Variables in Vercel
Add these environment variables in Vercel project settings:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | Required |
| `CONVEX_DEPLOYMENT` | Your Convex deployment ID | Required |
| `OPENAI_API_KEY` | Your OpenAI API key | For AI moderation/verification |
| `OPENAI_MODERATION_MODEL` | `gpt-4o-mini` | Optional (defaults in code) |
| `OPENAI_VISION_MODEL` | `gpt-4o-mini` | Optional (defaults in code) |
| `OPENAI_MAX_TOKENS_MODERATION` | `50` | Optional |
| `OPENAI_MAX_TOKENS_VISION` | `200` | Optional |

**Note**: Screenshots are stored in Convex Storage (built-in), no external storage service needed.

#### 3.3 Initial Deploy
Deploy and verify the site works at the Vercel-provided URL (e.g., `dreadmyst-enchanting-tool.vercel.app`).

---

### Phase 4: Configure Vercel Rewrite in Main Site
**Status**: Pending
**Time**: 20 minutes

This phase sets up the URL `isitp2w.com/games/dreadmyst/orb-enchanting-tool` to proxy to your tool's Vercel deployment.

#### 4.1 Get Your Tool's Vercel URL
After deploying in Phase 3, note your tool's Vercel URL:
- Example: `dreadmyst-enchanting-tool.vercel.app`
- Or: `dreadmyst-enchanting-tool-yourusername.vercel.app`

#### 4.2 Add Rewrite to Main isitp2w.com Project
In your **main isitp2w.com Next.js project**, add a rewrite rule.

**Option A: Using next.config.js** (Recommended for Next.js)
```javascript
// next.config.js in isitp2w.com project
module.exports = {
  // ... your existing config
  async rewrites() {
    return [
      {
        source: '/games/dreadmyst/orb-enchanting-tool',
        destination: 'https://dreadmyst-enchanting-tool.vercel.app',
      },
      {
        source: '/games/dreadmyst/orb-enchanting-tool/:path*',
        destination: 'https://dreadmyst-enchanting-tool.vercel.app/:path*',
      },
    ];
  },
};
```

**Option B: Using vercel.json**
```json
{
  "rewrites": [
    {
      "source": "/games/dreadmyst/orb-enchanting-tool",
      "destination": "https://dreadmyst-enchanting-tool.vercel.app"
    },
    {
      "source": "/games/dreadmyst/orb-enchanting-tool/:path*",
      "destination": "https://dreadmyst-enchanting-tool.vercel.app/:path*"
    }
  ]
}
```

#### 4.3 Deploy Main Site
Push the rewrite changes to your main isitp2w.com repository. Vercel will auto-deploy.

#### 4.4 Verify the Rewrite Works
1. Visit `https://isitp2w.com/games/dreadmyst/orb-enchanting-tool`
2. Confirm the tool loads correctly
3. Check browser URL stays as `isitp2w.com/...` (not redirected)

---

### Phase 5: SEO Configuration
**Status**: Pending
**Time**: 20 minutes

This phase ensures Google indexes your custom URL correctly.

#### 5.1 Update Metadata in Tool
Update the tool's `layout.tsx` to set the correct canonical URL:

```typescript
// src/app/layout.tsx
export const metadata = {
  metadataBase: new URL('https://isitp2w.com'),
  title: 'Dreadmyst Orb Enchanting Tool - Track Your Enchanting Sessions',
  description: 'Track your Dreadmyst enchanting sessions, view success rates, and compete on the leaderboard.',
  alternates: {
    canonical: '/games/dreadmyst/orb-enchanting-tool',
  },
  openGraph: {
    title: 'Dreadmyst Orb Enchanting Tool',
    description: 'Track your Dreadmyst enchanting sessions and compete on the leaderboard.',
    url: 'https://isitp2w.com/games/dreadmyst/orb-enchanting-tool',
    siteName: 'IsItP2W',
    type: 'website',
  },
};
```

#### 5.2 Verify .vercel.app is Not Indexed
Vercel automatically adds `X-Robots-Tag: noindex` to non-production URLs. Verify by checking:
```
curl -I https://dreadmyst-enchanting-tool.vercel.app
```
Look for: `X-Robots-Tag: noindex`

#### 5.3 Add to Sitemap (Optional)
If your main isitp2w.com has a sitemap, add the tool's URL:
```xml
<url>
  <loc>https://isitp2w.com/games/dreadmyst/orb-enchanting-tool</loc>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

#### 5.4 Submit to Google Search Console
1. Go to Google Search Console for isitp2w.com
2. Request indexing for `/games/dreadmyst/orb-enchanting-tool`

---

### Phase 6: Update Convex for New Domain
**Status**: Pending
**Time**: 15 minutes

#### 6.1 Update Convex Environment Variables
In Convex dashboard → Settings → Environment Variables:
- Update `SITE_URL` to `https://isitp2w.com`

#### 6.2 Test Authentication
1. Log out of the app
2. Log back in
3. Verify all authenticated features work

#### 6.3 Test All Features
- [ ] User registration/login
- [ ] Display name moderation (AI)
- [ ] Start enchanting session
- [ ] Log attempts
- [ ] Complete items
- [ ] Screenshot verification (AI)
- [ ] Leaderboard
- [ ] Admin panel (if admin)

---

### Phase 7: Add Migration Notice to GitHub Pages
**Status**: Pending
**Time**: 30 minutes

#### 7.1 Create Migration Banner Component
Add a banner to the GitHub Pages version announcing the migration.

#### 7.2 Update GitHub Pages Site
Deploy the banner to GitHub Pages with a message like:
> "We've moved! This site is now at isitp2w.com/games/dreadmyst/orb-enchanting-tool. You will be redirected in 10 seconds..."

#### 7.3 Optional: Auto-Redirect
Add JavaScript to auto-redirect users after a delay:
```javascript
setTimeout(() => {
  window.location.href = 'https://isitp2w.com/games/dreadmyst/orb-enchanting-tool';
}, 10000);
```

---

### Phase 8: Cleanup (After 2-4 Weeks)
**Status**: Pending

#### 8.1 Monitor Traffic
Check Vercel analytics to ensure users are using the new URL.

#### 8.2 Disable GitHub Pages
Once traffic has fully migrated:
1. Go to GitHub repo → Settings → Pages
2. Set Source to "None" to disable GitHub Pages

#### 8.3 Remove GitHub Pages Config
Remove the GitHub Actions workflow for GitHub Pages deployment.

#### 8.4 Simplify next.config.js
Remove the cross-compatibility code since only Vercel is used.

---

## Rollback Plan

If issues occur during migration:

1. **Vercel Issues**: GitHub Pages remains live, users can continue using old URL
2. **Auth Issues**: Revert Convex environment variables to old domain
3. **DNS Issues**: Remove CNAME record, Vercel URL still works as backup

---

## Checklist

### Pre-Migration
- [ ] Backup current Convex data (export if needed)
- [ ] Document current environment variables
- [ ] Test local build works

### During Migration
- [ ] Update next.config.js for cross-compatibility
- [ ] Update GitHub Actions with GITHUB_PAGES env var
- [ ] Deploy to Vercel
- [ ] Add environment variables in Vercel
- [ ] Configure subdomain DNS
- [ ] Update Convex allowed origins
- [ ] Test all features on new domain

### Post-Migration
- [ ] Add migration banner to GitHub Pages
- [ ] Monitor for issues
- [ ] Disable GitHub Pages after 2-4 weeks
- [ ] Remove cross-compatibility code

---

## Environment Variables Reference

### Vercel Environment Variables (for dreadmyst-enchanting-tool project)
```
# Required
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-id
OPENAI_API_KEY=sk-...

# Optional (have defaults in code)
OPENAI_MODERATION_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS_MODERATION=50
OPENAI_MAX_TOKENS_VISION=200

# Note: Screenshots are stored in Convex Storage (built-in), not UploadThing
```

### Convex Environment Variables
```
SITE_URL=https://isitp2w.com
OPENAI_API_KEY=sk-...
```

---

## Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Prepare Codebase | 30 min | 30 min |
| Phase 2: Update Convex Auth | 15 min | 45 min |
| Phase 3: Deploy to Vercel | 30 min | 1h 15min |
| Phase 4: Configure Rewrite | 20 min | 1h 35min |
| Phase 5: SEO Configuration | 20 min | 1h 55min |
| Phase 6: Update Convex | 15 min | 2h 10min |
| Phase 7: Migration Notice | 30 min | 2h 40min |
| Phase 8: Cleanup | After 2-4 weeks | - |

**Total Active Time**: ~2.5-3 hours
**Total Calendar Time**: 2-4 weeks (for full transition)

---

## Notes

- **Zero Downtime**: Both sites will work during transition
- **No Data Loss**: Convex backend is unchanged
- **Gradual Migration**: Users can transition at their own pace
- **Rollback Ready**: GitHub Pages remains as fallback
