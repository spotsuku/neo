# 画像最適化設定ガイド

## 概要
NEO Digital Platformでは、Next.js 15の画像最適化機能を活用して、パフォーマンスとユーザーエクスペリエンスを向上させています。

## 実装されている最適化機能

### 1. Next.js Image最適化設定
- **フォーマット自動変換**: AVIF → WebP → JPEG/PNG の優先順位で配信
- **レスポンシブ画像**: デバイスサイズに応じた適切なサイズの画像配信
- **遅延読み込み**: viewport外の画像は必要時のみ読み込み
- **プレースホルダー**: 読み込み中の適切な代替表示

### 2. カスタム最適化コンポーネント

#### OptimizedImage
```tsx
import { OptimizedImage } from '@/components/ui/optimized-image';

<OptimizedImage
  src="/images/hero.jpg"
  alt="ヒーロー画像"
  width={1200}
  height={600}
  priority={true}
  quality={90}
/>
```

**特徴:**
- ローディング状態の表示
- エラーハンドリング（フォールバック表示）
- プライオリティ設定に基づく読み込み最適化
- 品質とファイルサイズのバランス調整

#### OptimizedAvatar
```tsx
import { OptimizedAvatar } from '@/components/ui/optimized-image';

<OptimizedAvatar
  src="/avatars/user.jpg"
  alt="ユーザーアバター"
  size={48}
  fallbackText="U"
/>
```

**特徴:**
- 円形画像の最適化
- 文字フォールバック対応
- 複数サイズ対応

#### ResponsiveImage
```tsx
import { ResponsiveImage } from '@/components/ui/optimized-image';

<ResponsiveImage
  src="/images/content.jpg"
  alt="コンテンツ画像"
  aspectRatio="16/9"
  className="rounded-lg"
/>
```

**特徴:**
- アスペクト比固定
- レスポンシブ対応
- Fill表示モード

### 3. 画像最適化設定（next.config.js）

```javascript
images: {
  // 本番環境では画像最適化を無効化（Cloudflare Pages制限）
  unoptimized: process.env.NODE_ENV === 'production',
  
  // 対応フォーマット（優先順位順）
  formats: ['image/avif', 'image/webp'],
  
  // デバイス別画像サイズ
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  
  // 小サイズ用
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
  
  // 外部画像ドメインの許可
  domains: [
    'images.unsplash.com',
    'avatars.githubusercontent.com',
    // その他許可ドメイン
  ],
  
  // 最小キャッシュ時間
  minimumCacheTTL: 60,
}
```

### 4. 画像ディレクトリ構造

```
public/
├── images/          # 一般的な画像
├── icons/           # アイコン画像
├── avatars/         # ユーザーアバター
├── logos/           # ロゴ画像
├── thumbnails/      # サムネイル画像
└── gallery/         # ギャラリー画像
```

## パフォーマンス最適化のベストプラクティス

### 1. 画像サイズとフォーマット
- **ヒーロー画像**: AVIF/WebP, 品質90%, 優先読み込み
- **サムネイル**: AVIF/WebP, 品質70%, 遅延読み込み
- **アバター**: AVIF/WebP, 品質85%, サイズ固定
- **アイコン**: PNG/SVG, 品質90%, 小サイズ

### 2. 読み込み戦略
```tsx
// 重要な画像（above the fold）
<OptimizedImage priority={true} quality={90} />

// 通常の画像
<OptimizedImage priority={false} quality={75} loading="lazy" />

// ギャラリー画像
<OptimizedImage priority={false} quality={60} loading="lazy" />
```

### 3. sizes属性の設定
```tsx
// レスポンシブ画像
sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"

// 固定サイズ
sizes="64px"

// フルワイド
sizes="100vw"
```

## 開発環境での最適化

### 1. 画像フォーマット対応チェック
```tsx
import { checkImageFormatSupport } from '@/lib/image-optimization';

const support = checkImageFormatSupport();
console.log('WebP対応:', support.webp);
console.log('AVIF対応:', support.avif);
```

### 2. 画像品質とサイズのバランス調整
- 開発時は品質を高めに設定（85-90%）
- 本番では用途に応じて調整（60-80%）
- ファイルサイズとの兼ね合いを常にチェック

### 3. エラーハンドリング
```tsx
<OptimizedImage
  src={imageSrc}
  alt="画像"
  onError={() => console.log('画像読み込みエラー')}
  onLoad={() => console.log('画像読み込み完了')}
/>
```

## Cloudflare Pages環境での注意事項

### 1. 画像最適化制限
- Cloudflare Pages環境では `unoptimized: true` を設定
- 本番では事前最適化された画像を使用
- 開発環境でのみNext.js最適化機能を活用

### 2. 外部画像の使用
```javascript
// next.config.js
remotePatterns: [
  {
    protocol: 'https',
    hostname: '**.unsplash.com',
  }
]
```

### 3. キャッシュ戦略
```javascript
// next.config.js - キャッシュヘッダー設定
async headers() {
  return [
    {
      source: '/images/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}
```

## トラブルシューティング

### よくある問題と解決策

1. **priority と loading='lazy' の競合**
   ```tsx
   // 修正前（エラー）
   <Image priority={true} loading="lazy" />
   
   // 修正後
   <Image priority={true} loading="eager" />
   ```

2. **blur placeholder と blurDataURL の不整合**
   ```tsx
   // 修正前（エラー）
   <Image placeholder="blur" />
   
   // 修正後
   <Image placeholder="blur" blurDataURL="data:..." />
   // または
   <Image placeholder="empty" />
   ```

3. **外部画像ドメインの未許可**
   ```javascript
   // next.config.js で許可ドメインを追加
   domains: ['example.com']
   ```

## パフォーマンス測定

### 1. 画像読み込み時間の測定
```typescript
const startTime = performance.now();
image.onLoad = () => {
  const loadTime = performance.now() - startTime;
  console.log(`画像読み込み時間: ${loadTime}ms`);
};
```

### 2. Core Web Vitals への影響
- LCP (Largest Contentful Paint) の改善
- CLS (Cumulative Layout Shift) の最小化
- FID (First Input Delay) への影響評価

この画像最適化により、ページ読み込み速度の向上とユーザーエクスペリエンスの向上を実現しています。