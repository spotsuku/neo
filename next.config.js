/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発環境では通常のNext.js、本番では静的エクスポート
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  // 画像最適化を無効化（Cloudflare Pages制限）
  images: {
    unoptimized: true
  },
  // TypeScript設定
  typescript: {
    // 本番ビルド時の型チェックを継続
    ignoreBuildErrors: false
  },
  eslint: {
    // 本番ビルド時のESLintを継続  
    ignoreDuringBuilds: false
  }
}

module.exports = nextConfig