---
name: deploy-convex
description: Deploy Convex backend changes to production
---

# Deploy Convex Backend

Deploys schema and function changes to the Convex production environment.

## Steps

### 1. Verify Schema Changes
Check if `convex/schema.ts` has been modified:
- Review new tables and fields
- Verify indexes are properly defined
- Ensure backward compatibility

### 2. Run Type Check
```bash
npx tsc --noEmit
```
Ensure no TypeScript errors in Convex functions.

### 3. Test Locally
```bash
npx convex dev
```
Verify functions work correctly in development.

### 4. Deploy to Production
```bash
npx convex deploy
```

### 5. Verify Deployment
- Check Convex Dashboard for successful deployment
- Test critical queries/mutations in production
- Monitor for any errors in logs

## Pre-Deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] Schema changes are backward compatible
- [ ] New indexes added for new queries
- [ ] Rate limiting added for expensive operations
- [ ] Authentication checks in place
- [ ] Environment variables set in Convex Dashboard

## Rollback

If issues occur:
1. Revert code changes in git
2. Run `npx convex deploy` again
3. Check Convex Dashboard for deployment status
