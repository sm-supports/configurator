# ✅ Cloudflare Pages Setup - GitHub Automatic Deployments

## Quick Reference for Your Screenshot

Based on your Cloudflare Pages configuration screen, here are the **correct settings**:

### ✅ Correct Configuration:

| Setting | Value |
|---------|-------|
| **Project name** | `configurator` (or your choice) |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `npm run pages:build` |
| **Build output directory** | `.open-next/assets` |
| **Root directory** | `/` (leave empty) |

---

## Step-by-Step Setup

### 1. Commit and Push Your Code

```bash
git add .
git commit -m "Configure for Cloudflare Pages with automatic deployments"
git push origin main
```

### 2. Configure in Cloudflare Dashboard

In the screen you're currently looking at:

1. **Project name**: Enter `configurator` (or any name you prefer)
2. **Production branch**: Select `main`
3. **Framework preset**: Select `Next.js` from the dropdown
4. **Build command**: Enter exactly:
   ```
   npm run pages:build
   ```
5. **Build output directory**: Enter exactly:
   ```
   .open-next/assets
   ```
6. **Root directory**: Leave empty or enter `/`

### 3. Add Environment Variables

Click on "Environment variables (advanced)" and add:

**Variable Name** → **Value**
- `NEXT_PUBLIC_SUPABASE_URL` → `your_supabase_project_url`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `your_supabase_anon_key`
- `NODE_VERSION` → `20.12.0`

### 4. Save and Deploy

Click the **"Save and Deploy"** button at the bottom right.

---

## What Happens Next

1. ✅ Cloudflare will clone your repository
2. ✅ Install dependencies (`npm install`)
3. ✅ Build WebAssembly files (`npm run asbuild`)
4. ✅ Build Next.js app with OpenNext adapter
5. ✅ Deploy to `https://configurator-xxx.pages.dev`

### First Deployment
- Takes ~3-5 minutes
- You can watch progress in the Cloudflare dashboard
- You'll get a unique `*.pages.dev` URL

### Future Deployments
Every time you `git push` to GitHub:
- **Main branch** → Automatic production deployment
- **Other branches** → Preview deployments
- **Pull requests** → Preview deployments with unique URLs

---

## Features Working

✅ **Server-Side Rendering (SSR)**
✅ **API Routes** (`/api/*`)
✅ **Middleware** (authentication)
✅ **Static Assets** (images, WASM files)
✅ **Dynamic Routes**
✅ **Environment Variables**
✅ **Supabase Integration**

---

## After Deployment

### Add Custom Domain

1. Go to **Pages** → **Your Project** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow DNS instructions
5. Wait for SSL certificate (automatic, ~1-5 minutes)

### Monitor Deployments

- View deployment history: **Pages** → **Your Project** → **Deployments**
- View build logs: Click any deployment
- Rollback if needed: Click "···" → "Rollback to this deployment"

---

## Troubleshooting

### Build Fails?

Check the build logs in Cloudflare Dashboard. Common issues:

1. **Missing environment variables** → Add them in Settings
2. **Wrong build command** → Should be `npm run pages:build`
3. **Wrong output directory** → Should be `.open-next/assets`
4. **Node.js version** → Add `NODE_VERSION=20.12.0` environment variable

### App Doesn't Work After Deploy?

1. Check environment variables are set correctly
2. Verify build logs show successful completion
3. Check browser console for errors
4. Ensure `.node-version` file is committed to repo

---

## Comparison: Vercel vs Cloudflare Pages

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| Free tier requests | 100GB bandwidth | Unlimited requests |
| Build minutes | 6,000/month | 500/month |
| Edge network | ✅ | ✅ (faster globally) |
| Auto Git deploys | ✅ | ✅ |
| Preview deploys | ✅ | ✅ |
| Custom domains | ✅ | ✅ |
| DDoS protection | Paid | Free |

---

## Quick Commands

```bash
# Local development
npm run dev

# Test Cloudflare build locally
npm run preview

# Deploy manually (without GitHub)
npm run deploy

# Build for Pages
npm run pages:build
```

---

## Your Deployment URL

After deployment, your app will be available at:
- **Production**: `https://configurator-xxx.pages.dev`
- **Custom domain**: After you add it
- **Preview**: `https://[commit-hash].configurator-xxx.pages.dev`

---

## Support

- [OpenNext Documentation](https://opennext.js.org/cloudflare)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

**Status**: ✅ Ready for GitHub Push & Cloudflare Pages Setup
