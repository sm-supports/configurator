# Environment Variables for Vercel Deployment

## Required Environment Variables

Set these in your Vercel dashboard under Project Settings → Environment Variables:

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin functions)

## Deployment Steps

### 1. Final Code Preparation
```bash
# Ensure all changes are committed
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sm-supports/configurator)

#### Option B: Manual Import
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository: `sm-supports/configurator`
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

### 3. Configure Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the three Supabase variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://grgffjkykyghiluhaqzk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Set environment to "Production, Preview, and Development"
5. Click "Save"

### 4. Redeploy
After adding environment variables, trigger a new deployment:
1. Go to Deployments tab
2. Click the three dots on the latest deployment
3. Select "Redeploy"

### 5. Verification
- Visit your deployed URL
- Check `/api/health` endpoint for system status
- Test authentication flows
- Verify editor functionality
- Check admin panel access

## Features Ready for Production

✅ **Next.js 15** with App Router
✅ **TypeScript** with strict typing
✅ **Tailwind CSS** for styling
✅ **Supabase** integration with environment variables
✅ **Konva.js** canvas editor with webpack configuration
✅ **Image optimization** configured for Supabase domains
✅ **Static generation** where possible
✅ **ESLint** configuration
✅ **Responsive design** for all screen sizes

## Performance Optimizations

- Static page generation for marketing pages
- Dynamic imports for heavy components (Editor)
- Image optimization for template previews
- Webpack optimization for canvas libraries
- Standalone output for faster cold starts

## Security Features

- Environment variables properly configured
- Supabase RLS (Row Level Security) ready
- Admin route protection
- Type-safe API calls

## Monitoring

After deployment, monitor:
- Build logs in Vercel dashboard
- Runtime logs for any errors
- Performance metrics
- Database usage in Supabase dashboard
