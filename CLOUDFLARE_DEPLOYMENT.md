# Cloudflare Deployment Guide

## Migration from Vercel to Cloudflare Workers/Pages

This project has been configured to deploy on Cloudflare Workers using the OpenNext adapter.

### Prerequisites

1. A Cloudflare account
2. Node.js >= 20.18.1 (recommended)
3. Git repository

### Local Development

```bash
# Standard Next.js development (fastest)
npm run dev

# Test with Cloudflare adapter locally
npm run preview
```

### Environment Variables

You need to set up the following environment variables in Cloudflare:

1. Go to your Cloudflare Dashboard
2. Navigate to Workers & Pages > Your Project > Settings > Environment Variables
3. Add the following variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- Any other environment variables from your `.env.local` file

### Deployment Steps

#### Option 1: Deploy from Local Machine

1. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

#### Option 2: Deploy via Git Integration (Recommended)

1. Push your code to GitHub/GitLab
2. Go to Cloudflare Dashboard > Workers & Pages > Create Application
3. Select "Pages" > "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run asbuild && npx opennextjs-cloudflare build`
   - **Build output directory**: `.open-next/assets`
   - **Root directory**: `/` (or your project root)
6. Add environment variables in the Cloudflare dashboard
7. Click "Save and Deploy"

### Important Notes

1. **WebAssembly Files**: Your WASM files are built before deployment and included in the public folder
2. **Image Optimization**: Cloudflare uses their own image optimization, so `unoptimized: true` is set
3. **Middleware**: Your authentication middleware is fully supported
4. **API Routes**: All your Next.js API routes will work as expected
5. **Supabase**: Works perfectly with Cloudflare Workers

### Differences from Vercel

- **Edge Runtime**: Cloudflare Workers is similar to Vercel's Edge Runtime
- **Image Optimization**: Use Cloudflare Images or keep images unoptimized
- **Build Process**: Uses OpenNext adapter instead of Vercel's build system
- **Caching**: Configure via `open-next.config.ts`

### Troubleshooting

If you encounter issues:

1. Check the build logs in Cloudflare Dashboard
2. Ensure all environment variables are set correctly
3. Verify Node.js compatibility flags in `wrangler.json`
4. Run `npm run preview` locally to test before deploying

### Custom Domain

After deployment, you can add a custom domain:

1. Go to Workers & Pages > Your Project > Custom Domains
2. Add your domain
3. Update DNS records as instructed

### Performance

Cloudflare Workers offers:
- Global edge network (faster than single-region deployments)
- Automatic CDN
- DDoS protection
- Free tier: 100,000 requests/day

### Resources

- [OpenNext Documentation](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
