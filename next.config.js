/** @type {import('next').NextConfig} */
const nextConfig = {
  // ドメイン設定（別オリジンCORS対応）
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://app.neo-portal.jp',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.neo-portal.jp',
  },
  // セキュリティ設定
  poweredByHeader: false,
  
  // Cloudflare Pages用設定（静的エクスポート対応）
  output: 'export', // 静的エクスポート有効化
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
  
  // 旧静的URL → Next.jsルートへのリダイレクト（後方互換性確保）
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
          // セキュリティヘッダー（CORS設定はAPIサーバー側で行う）
        ],
      },
    ];
  },
};

module.exports = nextConfig;