/** @type {import('next').NextConfig} */
const nextConfig = {
  // セキュリティ設定
  poweredByHeader: false,
  
  // Cloudflare Pages用設定（API Routesサポート）
  trailingSlash: false,
  
  // 画像最適化無効（Cloudflare Pages制限）
  images: {
    unoptimized: true,
  },
  
  // 環境変数設定
  env: {
    NODE_ENV: 'production',
  },
  
  // TypeScript厳密チェック
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint厳密チェック
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // 最適化設定
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },
  
  // セキュリティヘッダー
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

module.exports = nextConfig;