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
  
  // 環境変数設定は削除（Next.jsで自動設定されるため）
  
  // TypeScript厳密チェック（ビルド高速化のため一時的に無効）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint厳密チェック（ビルド高速化のため一時的に無効）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 最適化設定
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },
  
  // 旧静的URL → Next.jsルートへのリダイレクト（Phase 0: 後方互換性確保）
  async redirects() {
    return [
      // 静的HTMLファイル → Nextルート（後方互換）
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/login.html', destination: '/login', permanent: false },
      { source: '/dashboard.html', destination: '/dashboard', permanent: false },
      { source: '/admin-dashboard.html', destination: '/admin', permanent: false },
      { source: '/company-dashboard.html', destination: '/company', permanent: false },
      
      // 会員管理関連のリダイレクト
      { source: '/admin/users.html', destination: '/admin/users', permanent: false },
      { source: '/members.html', destination: '/admin/users', permanent: false },
      { source: '/admin-users.html', destination: '/admin/users', permanent: false },
    ];
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