# 🚀 Switch to Cloudflare Workers with GitHub Actions

## Why This Is Better

Your app needs **Cloudflare Workers** (not Pages) because it's a full-stack SSR Next.js app. However, you can still have automatic Git-based deployments using **GitHub Actions**.

## ✅ What I Just Created

Created `.github/workflows/deploy.yml` - This will automatically deploy to Cloudflare Workers every time you push to `main`.

---

## 🎯 Setup Steps

### Step 1: Delete the Cloudflare Pages Project

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Find your `configurator` project
3. Click **Settings** → **Danger Zone** → **Delete project**

### Step 2: Get Your Cloudflare Credentials

#### A. Get Your Account ID:
1. Go to Cloudflare Dashboard
2. Click on **Workers & Pages** (left sidebar)
3. On the right side, you'll see **Account ID** - copy it

#### B. Create an API Token:
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit Cloudflare Workers**
4. Click **Continue to summary**
5. Click **Create Token**
6. **Copy the token** (you won't see it again!)

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/sm-supports/configurator
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:

**Secret 1:**
- Name: `CLOUDFLARE_API_TOKEN`
- Value: (paste the API token from Step 2B)
- Click **Add secret**

**Secret 2:**
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: (paste the Account ID from Step 2A)
- Click **Add secret**

### Step 4: Add Environment Variables (Optional)

If you want to add your Supabase environment variables:

1. Create a file `.dev.vars` in your project root (this is gitignored):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
   ```

For production, add them via Cloudflare Dashboard after first deployment:
1. Workers & Pages → configurator → Settings → Variables
2. Add your environment variables

### Step 5: Push and Deploy!

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow for Cloudflare Workers deployment"
git push origin main
```

### Step 6: Watch It Deploy

1. Go to your GitHub repo
2. Click **Actions** tab
3. You'll see the deployment running
4. When it's done, your app will be live at: `https://configurator.YOUR-SUBDOMAIN.workers.dev`

---

## 🎉 Benefits of This Approach

✅ **Automatic deployments** - Every push to `main` triggers deployment
✅ **Full SSR support** - All Next.js features work
✅ **No routing issues** - Worker handles everything correctly
✅ **Preview deployments** - Can add for pull requests too
✅ **Free tier** - 100,000 requests/day

---

## 🔧 After First Deployment

1. Check your Workers dashboard for the URL
2. Add a custom domain if you want (Settings → Triggers → Custom Domains)
3. Add environment variables if needed

---

## 📝 Notes

- The workflow runs on every push to `main`
- You can manually trigger it from the Actions tab
- Build time: ~2-3 minutes
- Your app will be at: `configurator.YOUR-SUBDOMAIN.workers.dev`

This is the **correct way** to deploy a full-stack Next.js app on Cloudflare with automatic Git deployments! 🚀
