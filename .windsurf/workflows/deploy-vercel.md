---
name: deploy-vercel
description: Deploy frontend changes to Vercel (auto-deploys on push to main)
---

# Deploy to Vercel

The frontend is hosted on Vercel and auto-deploys when you push to the main branch.

## Production URL
`https://isitp2w.com/games/dreadmyst/orb-enchanting-tool`

## Steps

### 1. Verify Build Locally
```bash
npm run build
```
Ensure no build errors before pushing.

### 2. Push to GitHub
// turbo
```bash
git add .
git commit -m "Your commit message"
git push
```

Vercel will automatically:
- Detect the push to main
- Build the Next.js app
- Deploy to production

### 3. Verify Deployment
- Check Vercel dashboard for build status
- Visit `https://isitp2w.com/games/dreadmyst/orb-enchanting-tool`
- Test critical functionality

## Environment Variables (Vercel Dashboard)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | Convex deployment ID |
| `OPENAI_API_KEY` | OpenAI API key |

## Architecture

```
User Request
    ↓
isitp2w.com/games/dreadmyst/orb-enchanting-tool
    ↓ (Vercel Rewrite)
dreadmyst-enchanting-tool.vercel.app
    ↓
Convex Backend (sensible-whale-414.convex.cloud)
```

## Rollback

If issues occur:
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

## Notes

- GitHub Pages is deprecated (shows migration banner)
- Assets load from `dreadmyst-enchanting-tool.vercel.app` via `assetPrefix`
- SEO canonical URL points to `isitp2w.com/games/dreadmyst/orb-enchanting-tool`
