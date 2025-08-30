/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発環境では通常のNext.js（API Routes使用可能）
  trailingSlash: false,
  // 画像最適化を無効化（Cloudflare Pages制限）
  images: {
    unoptimized: true
  },
  // TypeScript設定
  typescript: {
    // 高速ビルドのため型チェックをスキップ
    ignoreBuildErrors: true
  },
  eslint: {
    // 高速ビルドのためESLintをスキップ  
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig