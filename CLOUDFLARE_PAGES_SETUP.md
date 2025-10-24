# Cloudflare Pages Build Configuration

## For Git-based Automatic Deployments

### Build Settings in Cloudflare Dashboard:

**Framework preset:** `Next.js`

**Production branch:** `main`

**Build command:**
```bash
npm run pages:build
```

**Build output directory:**
```
.open-next/assets
```

**Root directory:** `/` (leave empty or use `/`)

**Node.js version:** `20.12.0` (auto-detected from .node-version)

---

## Important: Pages vs Workers

Cloudflare Pages with automatic GitHub deployments works perfectly with the OpenNext adapter. When you connect your GitHub repo, Cloudflare will:
1. Detect code pushes
2. Run the build command
3. Deploy automatically to a `*.pages.dev` URL

---

## Environment Variables

Add these in Cloudflare Dashboard → Pages → Settings → Environment Variables:

**Production:**
- `NEXT_PUBLIC_SUPABASE_URL` = your_supabase_url
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your_supabase_anon_key
- `NODE_VERSION` = `20.12.0`

**Preview (optional):**
- Same as production or use different values for testing

---

## Setup Steps

### Step 1: Push Your Code to GitHub

```bash
git add .
git commit -m "Configure for Cloudflare Pages deployment"
git push origin main
```

### Step 2: Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **Create Application** → **Pages** → **Connect to Git**
4. Select your GitHub repository: `sm-supports/configurator`
5. Configure the build settings (see above)
6. Add environment variables
7. Click **Save and Deploy**

### Step 3: Automatic Deployments

Every time you push to GitHub:
- **Main branch** → Production deployment
- **Pull requests** → Preview deployments
- **Other branches** → Preview deployments (optional)

---

## Troubleshooting

### If build fails:
- Check build logs in Cloudflare Dashboard
- Verify environment variables are set
- Ensure Node.js version matches (.node-version file)

### If SSR doesn't work:
- Cloudflare Pages automatically handles SSR when it detects Next.js build output
- Check that `.vercel/output/static` directory is being generated
- Verify middleware and API routes are in the build output
