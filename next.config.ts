import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // إخفاء X-Powered-By: Next.js

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'mktygmlnergthbbpedmh.supabase.co' }
    ],
  },
  experimental: {
    // Using newer app router features
  },
  allowedDevOrigins: ['192.168.100.3', '192.168.100.3:3000'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;