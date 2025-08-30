# バンドル最適化ガイド

## 概要
NEO Digital Platformでは、Next.js 15のビルド最適化機能とカスタム分析ツールを活用して、バンドルサイズの最小化とパフォーマンス向上を実現しています。

## 実装された最適化機能

### 1. 自動バンドル分析システム

#### バンドル分析スクリプト
```bash
# 完全分析の実行
npm run analyze:full

# バンドルのみ分析
npm run analyze:bundle

# 依存関係のみ分析
npm run analyze:deps
```

#### 生成されるレポート
- **bundle-analysis-report.json**: バンドルサイズ、チャンク情報、最適化提案
- **dependency-analysis-report.json**: 依存関係使用状況、未使用パッケージ
- **.next/analyze/client.html**: 視覚的バンドル分析レポート

### 2. パフォーマンススコア算出

スコア算出基準（100点満点）：
- **バンドルサイズ**: 2MB以上で-30点、1MB以上で-15点
- **チャンク数**: 20個以上で-10点、10個以上で-5点
- **読み込み時間**: 5秒以上で-20点、3秒以上で-10点
- **最適化提案**: 警告レベルの提案1件につき-10点

```javascript
// スコア計算例
function calculatePerformanceScore(metrics, suggestions) {
  let score = 100;
  
  // サイズペナルティ
  if (metrics.totalBundleSize > 2000000) score -= 30;
  else if (metrics.totalBundleSize > 1000000) score -= 15;
  
  // 提案ペナルティ
  const severeSuggestions = suggestions.filter(s => s.severity === 'warning').length;
  score -= severeSuggestions * 10;
  
  return Math.max(0, Math.min(100, score));
}
```

### 3. Next.js Webpack最適化設定

#### カスタムチャンク分割戦略
```javascript
// next.config.js
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        // React & Next.js フレームワーク
        framework: {
          name: 'framework',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
          priority: 40,
          enforce: true,
        },
        // UIライブラリ
        lib: {
          test: /[\\/]node_modules[\\/]/,
          name: 'lib',
          priority: 30,
          chunks: 'all',
          enforce: true,
        },
        // 管理画面コンポーネント
        admin: {
          name: 'admin',
          test: /[\\/](admin|components[\\/]lazy)[\\/]/,
          priority: 20,
          chunks: 'all',
        },
        // 共通コンポーネント
        commons: {
          name: 'commons',
          minChunks: 2,
          priority: 10,
          chunks: 'all',
        },
      },
    };
  }
  return config;
}
```

#### 最適化オプション
```javascript
// コンパイラ最適化
compiler: {
  // 本番環境でconsole.logを削除
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
},

// 実験的最適化
experimental: {
  optimizeServerReact: true,
}
```

### 4. 依存関係最適化

#### 未使用パッケージ検出
自動スキャンにより以下を検出：
- ES6 import文の解析
- CommonJS require文の解析
- 実際に使用されているパッケージの特定
- 未使用依存関係の特定

#### 大きなライブラリの代替提案
| ライブラリ | サイズ | 推奨代替案 |
|----------|--------|-----------|
| moment | 2.3MB | date-fns, dayjs (90%削減) |
| lodash | 1.4MB | 個別インポート (70%削減) |
| @fortawesome/fontawesome-free | 2.1MB | 個別アイコン、SVG |
| bootstrap | 1.2MB | Tailwind CSS |
| jquery | 280KB | Vanilla JS, React |

#### 最適化コマンド
```bash
# 未使用依存関係の削除
npm run optimize:deps

# 手動での依存関係削除
npm uninstall package-name

# 個別インポートの使用例
import { debounce } from 'lodash/debounce';  // ❌ 全体インポート
import debounce from 'lodash/debounce';     // ✅ 個別インポート
```

### 5. Tree Shaking最適化

#### ES Modules使用の徹底
```javascript
// ❌ CommonJS (Tree shakingできない)
const { Component } = require('library');

// ✅ ES Modules (Tree shaking対応)
import { Component } from 'library';
```

#### サイドエフェクトの管理
```json
// package.json
{
  "sideEffects": false,  // Tree shaking有効化
  // または
  "sideEffects": [
    "src/polyfills.js",  // 特定ファイルのみ保持
    "*.css"              // CSSファイルを保持
  ]
}
```

### 6. 動的インポートとコード分割

#### React.lazy使用パターン
```typescript
// ページレベルの分割
const AdminDashboard = lazy(() => import('./admin/dashboard'));

// 機能レベルの分割
const ChartComponent = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
);

// 条件付き読み込み
const loadFeature = async () => {
  if (userHasFeature) {
    const { AdvancedFeature } = await import('./advanced-feature');
    return AdvancedFeature;
  }
};
```

#### Dynamic imports for libraries
```typescript
// 重いライブラリの動的読み込み
const loadChart = async (data: ChartData) => {
  const [
    { Chart as ChartJS },
    { Line }
  ] = await Promise.all([
    import('chart.js/auto'),
    import('react-chartjs-2')
  ]);
  
  return <Line data={data} />;
};
```

### 7. パフォーマンス監視

#### Web Vitals収集
```typescript
import { getPerformanceMonitor } from '@/lib/performance-monitor';

const monitor = getPerformanceMonitor();

// 自動収集されるメトリクス
// - CLS (Cumulative Layout Shift)
// - LCP (Largest Contentful Paint)  
// - FID (First Input Delay)
// - INP (Interaction to Next Paint)
// - TTFB (Time to First Byte)
```

#### API応答時間監視
```typescript
import { measureAPICall } from '@/lib/performance-monitor';

const fetchData = () => measureAPICall(
  '/api/data',
  'GET',
  () => fetch('/api/data').then(res => res.json())
);
```

### 8. キャッシュ戦略最適化

#### 静的アセットキャッシュ
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/_next/static/:path*',
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

#### Service Worker活用
```javascript
// 重要リソースの事前キャッシュ
const CACHE_NAME = 'neo-platform-v1';
const urlsToCache = [
  '/_next/static/chunks/framework.js',
  '/_next/static/chunks/commons.js',
  '/_next/static/css/globals.css',
];
```

## 最適化チェックリスト

### ビルド時最適化
- [ ] Bundle Analyzerで大きなチャンクを特定
- [ ] 未使用依存関係の削除
- [ ] Tree shaking対応のES Modulesを使用
- [ ] 動的インポートでコード分割実装
- [ ] 画像最適化（WebP/AVIF対応）
- [ ] CSS最適化（未使用スタイル削除）

### ランタイム最適化
- [ ] React.lazyでコンポーネント分割
- [ ] Suspenseでローディング状態管理
- [ ] メモ化（useMemo, useCallback）の適切な使用
- [ ] 仮想化（大量データ表示時）
- [ ] Service Workerでキャッシュ戦略
- [ ] Critical CSSの抽出

### 監視とメンテナンス
- [ ] Web Vitalsの定期監視
- [ ] パフォーマンススコアの追跡
- [ ] 依存関係の定期的な見直し
- [ ] バンドルサイズの成長監視
- [ ] 新機能追加時の影響測定

## トラブルシューティング

### よくある問題と解決策

#### 1. バンドルサイズの急激な増加
```bash
# 原因分析
npm run analyze:bundle

# 大きなライブラリの特定
npm ls --depth=0 --json | jq '.dependencies | to_entries | sort_by(.value.version) | reverse'

# 解決策
npm run analyze:deps  # 未使用依存関係の確認
```

#### 2. Tree shakingが効かない
```javascript
// ❌ デフォルトインポート
import _ from 'lodash';

// ✅ 名前付きインポート
import { debounce, throttle } from 'lodash';

// ✅ 個別ファイルインポート
import debounce from 'lodash/debounce';
```

#### 3. 動的インポートエラー
```typescript
// ❌ 不正なパス
const Component = lazy(() => import('./invalid-path'));

// ✅ 正しいパス + エラーハンドリング
const Component = lazy(() => 
  import('./valid-path').catch(() => ({ default: () => <div>読み込みエラー</div> }))
);
```

#### 4. チャンク読み込み失敗
```javascript
// next.config.js - リトライ機能追加
webpack: (config) => {
  config.output.crossOriginLoading = 'anonymous';
  config.output.chunkLoadTimeout = 30000;
  return config;
}
```

## パフォーマンス目標値

### 基準値（推奨）
- **バンドルサイズ**: < 1MB (gzip圧縮後)
- **初回読み込み時間**: < 3秒 (3G環境)
- **パフォーマンススコア**: > 80点
- **未使用依存関係**: 0個
- **Web Vitals**: すべてGoodレンジ

### 警告値
- **バンドルサイズ**: > 2MB (改善必要)
- **初回読み込み時間**: > 5秒 (改善必要)
- **パフォーマンススコア**: < 60点 (改善必要)
- **未使用依存関係**: > 5個 (クリーンアップ必要)

この最適化により、優れたユーザーエクスペリエンスと効率的なリソース利用を実現します。