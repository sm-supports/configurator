import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure images for Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'grgffjkykyghiluhaqzk.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    unoptimized: true,
  },

  // Performance optimizations
  experimental: {
    // optimizeCss: true, // Temporarily disabled due to critters module issue
  },

  // Compression
  compress: true,

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Client-side only: resolve canvas to false for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    
    // Handle canvas module for both server and client
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    // Production optimizations
    if (!dev) {
      // Aggressive chunk splitting for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          editorComponents: {
            test: /[\\/]components[\\/]Editor[\\/]/,
            chunks: 'async',
            priority: 10,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
