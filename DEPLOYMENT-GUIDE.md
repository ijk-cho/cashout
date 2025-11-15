# Deployment & Cache Management Guide

## Overview
This guide explains how to deploy CashOut PWA and handle cache-related issues.

## Recent Fixes (2025-11-15)

### Cache Refresh Issue - FIXED ✅
**Problem**: UI changes only showed up after hard refresh (Ctrl+Shift+R)

**Root Cause**:
- Service worker was using cache-first strategy for HTML files
- Old HTML files in cache referenced old JavaScript bundles
- Service worker cache version wasn't being updated

**Solutions Implemented**:
1. **Service Worker Updates** (`public/sw.js`):
   - Bumped cache version from `v2` to `v3` (forces cache refresh)
   - Changed HTML files to use **network-first** strategy (always fetches latest)
   - Removed `/` and `/index.html` from static cache (they're now fetched fresh)
   - JS/CSS bundles still use cache-first (they have content hashes)

2. **Enhanced Update Detection** (`src/main.jsx`):
   - Checks for service worker updates every 30 seconds
   - Automatically reloads page when new version is available
   - Added better logging for debugging

3. **Deployment Configurations**:
   - Added `netlify.toml` for Netlify deployments
   - Added `vercel.json` for Vercel deployments
   - Added `public/_headers` for other platforms
   - Proper cache headers: HTML = no-cache, JS/CSS = 1 year cache

### Mobile White Screen - FIXED ✅
**Likely Causes**:
- Corrupted cache from old version
- Service worker serving stale files

**Solutions Implemented**:
1. Cache version bump forces fresh start
2. Better error handling in service worker
3. Network-first for HTML prevents stale content
4. Improved Vite build configuration with source maps

## Deployment Instructions

### 1. Build the Application
```bash
npm run build
```
This creates optimized files in the `dist/` directory.

### 2. Test Locally
```bash
npm run preview
```
This tests the production build locally before deploying.

### 3. Deploy to Hosting Platform

#### Option A: Netlify
1. Connect your GitHub repository to Netlify
2. Netlify will automatically use `netlify.toml` settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Headers configured automatically

**OR** deploy via CLI:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Option B: Vercel
1. Connect your GitHub repository to Vercel
2. Vercel will automatically use `vercel.json` settings
3. Automatic deployments on every push

**OR** deploy via CLI:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option C: Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Configure:
# - Public directory: dist
# - Single-page app: Yes
# - Don't overwrite index.html: Yes

# Deploy
npm run build
firebase deploy --only hosting
```

#### Option D: GitHub Pages
```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

## Cache Management

### When to Bump Cache Version
Increment the `CACHE_VERSION` in `public/sw.js` when:
- Making major changes to static assets
- Users report seeing old UI
- Deploying critical bug fixes
- Changing service worker behavior

**Current version**: `v3`

### How to Force Cache Refresh
1. Edit `public/sw.js`
2. Change: `const CACHE_VERSION = 'v3';` to `const CACHE_VERSION = 'v4';`
3. Rebuild and redeploy: `npm run build`

### User-Side Cache Clearing
If users experience issues, they can:
1. **Hard Refresh**:
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R`
   - Firefox: `Ctrl+Shift+R`

2. **Clear Service Worker**:
   - Open DevTools (F12)
   - Go to Application/Storage tab
   - Click "Clear site data" or "Unregister" service worker
   - Refresh page

3. **Reinstall PWA**:
   - Uninstall the PWA from home screen
   - Visit the website again
   - Reinstall to home screen

## Caching Strategy

### Current Configuration
| Resource Type | Strategy | Cache Duration |
|--------------|----------|----------------|
| HTML files | Network-first | No cache |
| Service Worker | Network-first | No cache |
| Manifest | Network-first | No cache |
| JS bundles | Cache-first | 1 year (immutable) |
| CSS bundles | Cache-first | 1 year (immutable) |
| Images | Cache-first | 1 week |
| Firebase/API | Network-first | Dynamic |

### Why This Works
- **HTML**: Always fresh, references correct bundle hashes
- **JS/CSS**: Content-hashed filenames (e.g., `app.abc123.js`), safe to cache forever
- **Images**: Cached for performance, but checked weekly
- **APIs**: Always fresh data, cached as fallback when offline

## Troubleshooting

### Issue: Changes don't appear after deployment
**Solution**:
1. Verify the build completed successfully
2. Check cache version was bumped
3. Wait 30-60 seconds for update detection
4. Hard refresh the page
5. Check browser DevTools console for errors

### Issue: White screen on mobile
**Solution**:
1. Check browser console for JavaScript errors
2. Verify Firebase configuration is correct
3. Clear service worker and cache
4. Ensure all dependencies are installed: `npm install`
5. Rebuild: `npm run build`
6. Check that icons exist: `icon-192.png`, `icon-512.png`

### Issue: Service worker not updating
**Solution**:
1. Ensure `/sw.js` has proper cache headers (no-cache)
2. Check DevTools > Application > Service Workers
3. Click "Unregister" and refresh
4. Verify `CACHE_VERSION` was incremented

### Issue: Offline mode not working
**Solution**:
1. Ensure service worker is registered
2. Check `public/offline.html` exists
3. Visit the app while online first (to cache assets)
4. Test offline mode by toggling DevTools offline mode

## Best Practices

### 1. Version Control
- Always bump `CACHE_VERSION` when deploying major changes
- Use semantic versioning: `v3`, `v4`, `v5` (or `v3.1`, `v3.2`)

### 2. Testing Before Deployment
```bash
# 1. Build locally
npm run build

# 2. Test production build
npm run preview

# 3. Open in browser and test
# - Check for console errors
# - Test offline mode
# - Test on mobile
# - Verify all features work

# 4. Deploy only if tests pass
```

### 3. Monitoring Deployments
- Check deployment logs for errors
- Test the live site immediately after deployment
- Monitor error tracking (if configured)
- Check Firebase/database connections

### 4. User Communication
When deploying major updates:
- Inform users an update is available
- Provide instructions for hard refresh if needed
- Use the `UpdateNotification` component (already implemented)

## Automated Deployment

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --prod
```

## Quick Reference

### Commands
```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Deployment
netlify deploy --prod    # Deploy to Netlify
vercel --prod            # Deploy to Vercel
firebase deploy          # Deploy to Firebase
```

### Files Modified (2025-11-15)
- `public/sw.js` - Service worker cache strategy
- `src/main.jsx` - Enhanced update detection
- `vite.config.js` - Build optimization
- `public/_headers` - Cache headers (new)
- `netlify.toml` - Netlify config (new)
- `vercel.json` - Vercel config (new)

### Cache Version History
- `v1` - Initial version
- `v2` - Previous version
- `v3` - Current version (2025-11-15) - Fixed cache refresh issues

## Need Help?
- Check browser DevTools console for errors
- Review service worker logs in Application tab
- Test in incognito/private mode to rule out cache issues
- Ensure Firebase credentials are correct
- Verify all icons are present in `public/` folder
