# Authentication Setup Guide

This guide will help you set up authentication for the License Plate Designer application.

## Quick Setup (5 minutes)

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up (it's free)
3. Create a new project:
   - Give it a name (e.g., "license-plate-designer")
   - Create a database password (save this somewhere safe)
   - Choose a region close to you
   - Click "Create new project"

### 2. Get Your Credentials

1. Wait for your project to finish setting up (takes 1-2 minutes)
2. In your Supabase dashboard, go to **Settings** → **API**
3. Copy these two values:
   - **Project URL** (looks like `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (long string under "Project API keys")

### 3. Configure Your App

1. In your project folder, open the `.env.local` file
2. Replace the placeholder values with your actual credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 4. Restart Your Server

1. Stop your development server (Ctrl+C)
2. Start it again: `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)

### 5. Test Authentication

1. Click "Sign Up" on the homepage
2. Create an account with any email and password
3. You should be redirected to the templates page
4. Try signing out and signing back in

## 🎉 That's it!

Your authentication is now working. Users can:
- ✅ Sign up with email/password
- ✅ Sign in to existing accounts
- ✅ Access protected pages (Dashboard, Admin)
- ✅ Sign out securely

## Troubleshooting

### "Authentication is not configured" error
- Double-check your `.env.local` file has the correct URL and key
- Make sure there are no extra spaces or quotes
- Restart your development server

### Sign up/Sign in buttons don't work
- Check the browser console for errors
- Verify your Supabase project is active (not paused)
- Ensure your Site URL in Supabase settings includes `http://localhost:3000`

### Email verification issues
- For development, email verification is not required
- For production, you'll need to configure email templates in Supabase

## Production Setup

For production deployment:

1. Add your production URL to Supabase:
   - Go to **Authentication** → **Settings** → **Site URL**
   - Add your production domain (e.g., `https://yourdomain.com`)

2. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and reset password emails

3. Set up RLS policies if you add database tables:
   - Go to **Authentication** → **Policies**
   - Enable Row Level Security on your tables

## Need Help?

- 📚 [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- 💬 [Supabase Discord](https://discord.supabase.com)
- 📖 Check the main README.md for more details
