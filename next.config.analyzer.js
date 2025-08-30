const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発環境では通常のNext.js（API Routes使用可能）
  trailingSlash: false,
  
  // 画像最適化を無効化（Cloudflare Pages制限）
  images: {
    unoptimized: true,
    // 画像最適化設定
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
    // Web Assembly サポート
    webpackBuildWorker: true,
    // ページの並列処理
    optimizeCss: true,
    // 静的最適化
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

  // キャッシュ設定
  async headers() {
    return [
      {
        // Static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // HTML pages
        source: '/((?!api).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);