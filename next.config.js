const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // セキュリティ設定
  poweredByHeader: false, // X-Powered-By ヘッダーを無効化
  
  // 開発環境では通常のNext.js（API Routes使用可能）
  trailingSlash: false,
  
  // 画像最適化設定
  images: {
    // Cloudflare Pages環境では無効化、開発環境では有効化
    unoptimized: process.env.NODE_ENV === 'production',
    
    // 対応フォーマット（優先順位順）
    formats: ['image/avif', 'image/webp'],
    
    // デバイス別画像サイズ（レスポンシブ対応）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    
    // アイコンやサムネイル用の小さなサイズ
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    
    // 外部画像ドメインの許可（必要に応じて追加）
    domains: [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'cdn.pixabay.com',
      'images.pexels.com'
    ],
    
    // 外部画像パターンの許可
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: '**.pexels.com',
      }
    ],
    
    // 画像の遅延読み込み設定
    loader: 'default',
    
    // 危険な画像変換を許可（本番では false にする）
    dangerouslyAllowSVG: process.env.NODE_ENV === 'development',
    
    // SVG画像のコンテンツタイプ検証
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // 最小キャッシュ時間（秒）
    minimumCacheTTL: 60,
  },
  
  // パフォーマンス最適化
  compiler: {
    // 本番環境でconsole.logを削除
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 実験的機能
  experimental: {
    // 静的最適化のみ有効化
    optimizeServerReact: true,
  },
  
  // TypeScript設定
  typescript: {
    // 高速ビルドのため型チェックをスキップ
    ignoreBuildErrors: true
  },
  eslint: {
    // 高速ビルドのためESLintをスキップ  
    ignoreDuringBuilds: true
  },

  // Webpack設定のカスタマイズ
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // バンドルサイズ最適化
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // React & Next.js
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // UI Libraries
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 30,
            chunks: 'all',
            enforce: true,
          },
          // Admin Components
          admin: {
            name: 'admin',
            test: /[\\/](admin|components[\\/]lazy)[\\/]/,
            priority: 20,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          // Common components
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
            chunks: 'all',
            reuseExistingChunk: true,
          },
        },
      };
    }

    // gzip/brotli圧縮の設定
    if (!dev) {
      config.optimization.minimize = true;
    }

    return config;
  },

  // キャッシュ設定（開発環境用、本番はCloudflare _headersが優先）
  async headers() {
    return [
      {
        // Static assets - 長期キャッシュ
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        // Images - 長期キャッシュ + セキュリティ
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        // API routes - キャッシュなし + セキュリティ強化
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // 管理画面 - セキュリティ強化
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
      {
        // 認証ページ - セキュリティ強化
        source: '/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
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
            value: 'no-referrer',
          },
        ],
      },
      {
        // HTML pages - 基本セキュリティヘッダー
        source: '/((?!api|admin|auth).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);