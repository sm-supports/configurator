# Cloudflare Pages Node.js Compatibility Fix

## Problem
The deployment is failing because Node.js built-in modules (`async_hooks`, `fs`, `path`, etc.) cannot be resolved. This requires the `nodejs_compat` compatibility flag to be enabled.

## Solution

### Option 1: Configure via Cloudflare Dashboard (RECOMMENDED)

1. Go to your Cloudflare Pages project dashboard
2. Navigate to **Settings** → **Functions**
3. Scroll to **Compatibility Flags**
4. Add `nodejs_compat` to the compatibility flags
5. Set the **Compatibility Date** to `2025-03-25` or later
6. Save the settings
7. Trigger a new deployment

### Option 2: Use wrangler.toml (Alternative)

Create a `wrangler.toml` file in the project root:

```toml
name = "configurator"
compatibility_date = "2025-03-25"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".open-next/assets"
```

**Note:** This file must be in the root of your repository.

### Option 3: Environment Variable

Set the following environment variables in your Cloudflare Pages project settings:

- `CLOUDFLARE_COMPATIBILITY_DATE` = `2025-03-25`
- `CLOUDFLARE_COMPATIBILITY_FLAGS` = `nodejs_compat`

## Verification

After applying any of the above solutions, push a new commit to trigger a deployment. The build should complete successfully without Node.js module resolution errors.

## Current Configuration Files

### `wrangler.json` (Currently in use)
```json
{
  "compatibility_date": "2025-03-25",
  "compatibility_flags": ["nodejs_compat"]
}
```

This file is read during the build but may not be applied to the Pages deployment. **Option 1 (Dashboard configuration) is the most reliable method.**

## References

- [Cloudflare Pages + Next.js Guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Node.js Compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
