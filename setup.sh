#!/bin/bash

# Setup script for License Plate Designer
echo "🚀 Setting up License Plate Designer..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: You need to add your Supabase credentials to .env.local"
    echo "   1. Go to https://supabase.com and create a project"
    echo "   2. Get your Project URL and anon key from Settings → API"
    echo "   3. Edit .env.local and add your credentials"
    echo "   4. Run this script again after setting up Supabase"
    echo ""
else
    echo "✅ .env.local already exists"
fi

# Check if Supabase env vars are set
if grep -q "your_supabase_project_url_here" .env.local 2>/dev/null || grep -q "your_supabase_anon_key_here" .env.local 2>/dev/null; then
    echo "⚠️  Please configure your Supabase credentials in .env.local first"
    echo "   Edit .env.local and replace the placeholder values with your actual Supabase URL and anon key"
    echo ""
    echo "   Get them from: https://supabase.com → Your Project → Settings → API"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the development server
echo "🎉 Setup complete! Starting development server..."
echo "📍 Visit http://localhost:3000 to see your app"
echo "🔐 Test authentication by clicking 'Sign Up' on the homepage"
echo ""

npm run dev
