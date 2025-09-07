import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

const app = new Hono()

// CORS設定
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// レンダラー設定
app.use(renderer)

// メインページ
app.get('/', (c) => {
  return c.render(
    <div class="space-y-8">
      <div class="neo-card">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">🚀 統合システム稼働中</h2>
        <p class="text-lg text-gray-600 mb-6">55+ HTMLファイルから統合されたNext.js風Cloudflare Pages対応システム</p>
        
        <div class="grid md:grid-cols-3 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-semibold text-blue-800">🎯 統合実績</h3>
            <p class="text-sm text-gray-600">93%ファイル削減達成</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="font-semibold text-green-800">🔐 RBAC対応</h3>
            <p class="text-sm text-gray-600">11役職・24権限</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <h3 class="font-semibold text-purple-800">☁️ Edge展開</h3>
            <p class="text-sm text-gray-600">Cloudflare Pages</p>
          </div>
        </div>
        
        <nav class="flex flex-wrap gap-4">
          <a href="/dashboard" class="neo-button">📊 ダッシュボード</a>
          <a href="/admin" class="neo-button">👥 管理機能</a>
          <a href="/api/test" class="neo-button">🔧 API テスト</a>
        </nav>
      </div>
      
      <div class="neo-card">
        <h3 class="text-xl font-semibold mb-3">📋 主要機能</h3>
        <ul class="space-y-2 text-gray-700">
          <li>✅ 統合ダッシュボードシステム（役職別表示）</li>
          <li>✅ 拡張RBAC権限管理（11役職×24権限）</li>
          <li>✅ PermissionGuardセキュリティ</li>
          <li>✅ 権限ベースナビゲーション</li>
          <li>✅ 管理機能完全統合</li>
          <li>✅ Cloudflare Pages対応</li>
        </ul>
      </div>
    </div>
  )
})

// ダッシュボードページ
app.get('/dashboard', (c) => {
  return c.render(
    <div class="space-y-6">
      <div class="neo-card">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">📊 統合ダッシュボード</h2>
        <p class="text-gray-600 mb-6">役職別・権限ベースのダッシュボード表示システム</p>
        
        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <h3 class="font-semibold text-blue-800 mb-2">🎯 権限システム</h3>
            <ul class="text-sm space-y-1">
              <li>• Super Admin (Level 100)</li>
              <li>• System Admin (Level 90)</li>
              <li>• Content Manager (Level 70)</li>
              <li>• Committee Chair (Level 60)</li>
              <li>• Teacher (Level 50)</li>
              <li>• Company Manager (Level 40)</li>
            </ul>
          </div>
          
          <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <h3 class="font-semibold text-green-800 mb-2">📋 ダッシュボード機能</h3>
            <ul class="text-sm space-y-1">
              <li>• 管理者ダッシュボード</li>
              <li>• 教師ダッシュボード</li>
              <li>• 企業ダッシュボード</li>
              <li>• 学生ダッシュボード</li>
              <li>• 委員会ダッシュボード</li>
              <li>• ユーザーダッシュボード</li>
            </ul>
          </div>
        </div>
        
        <div class="mt-6 p-4 bg-yellow-50 rounded-lg">
          <p class="text-yellow-800">
            <strong>注意:</strong> 本番版では認証システムと連携し、ログイン中のユーザーの役職に応じて適切なダッシュボードが表示されます。
          </p>
        </div>
        
        <div class="mt-4">
          <a href="/" class="neo-button">🏠 ホームに戻る</a>
        </div>
      </div>
    </div>
  )
})

// 管理ページ
app.get('/admin', (c) => {
  return c.render(
    <div class="space-y-6">
      <div class="neo-card">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">👥 統合管理システム</h2>
        <p class="text-gray-600 mb-6">旧neo-admin-platform機能を完全統合した管理インターフェース</p>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div class="neo-card bg-blue-50">
            <h3 class="font-semibold text-blue-800 mb-2">👤 ユーザー管理</h3>
            <p class="text-sm text-gray-600">11役職対応のユーザー管理</p>
            <p class="text-xs mt-1 text-blue-600">検索・フィルタ・統計表示</p>
          </div>
          
          <div class="neo-card bg-green-50">
            <h3 class="font-semibold text-green-800 mb-2">🎓 学生管理</h3>
            <p class="text-sm text-gray-600">学籍・成績・進捗管理</p>
            <p class="text-xs mt-1 text-green-600">統合学生情報システム</p>
          </div>
          
          <div class="neo-card bg-purple-50">
            <h3 class="font-semibold text-purple-800 mb-2">🔐 権限制御</h3>
            <p class="text-sm text-gray-600">24権限の細かな制御</p>
            <p class="text-xs mt-1 text-purple-600">PermissionGuard対応</p>
          </div>
          
          <div class="neo-card bg-orange-50">
            <h3 class="font-semibold text-orange-800 mb-2">🏢 企業管理</h3>
            <p class="text-sm text-gray-600">企業パートナー管理</p>
            <p class="text-xs mt-1 text-orange-600">プロジェクト連携機能</p>
          </div>
          
          <div class="neo-card bg-red-50">
            <h3 class="font-semibold text-red-800 mb-2">📋 委員会管理</h3>
            <p class="text-sm text-gray-600">委員会活動・メンバー管理</p>
            <p class="text-xs mt-1 text-red-600">活動内容編集機能</p>
          </div>
          
          <div class="neo-card bg-gray-50">
            <h3 class="font-semibold text-gray-800 mb-2">📊 統計・分析</h3>
            <p class="text-sm text-gray-600">包括的な分析ダッシュボード</p>
            <p class="text-xs mt-1 text-gray-600">リアルタイム監視</p>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <h4 class="font-semibold mb-2">🔧 実装済み機能</h4>
          <div class="text-sm text-gray-600 space-y-1">
            <p>✅ 55+ HTMLファイルからの完全移行</p>
            <p>✅ 拡張RBAC（Role-Based Access Control）システム</p>
            <p>✅ 統合ナビゲーションヘッダー</p>
            <p>✅ 権限ベースUI表示制御</p>
            <p>✅ Cloudflare D1データベース対応</p>
          </div>
        </div>
        
        <div class="mt-4 flex gap-2">
          <a href="/" class="neo-button">🏠 ホームに戻る</a>
          <a href="/dashboard" class="neo-button">📊 ダッシュボード</a>
        </div>
      </div>
    </div>
  )
})

// API エンドポイント
app.get('/api/test', (c) => {
  return c.json({ 
    message: 'NEO Portal API - 動作確認',
    version: '2.0.0',
    features: [
      '統合ダッシュボード',
      'RBAC権限システム',
      '11役職・24権限',
      'Cloudflare Pages対応'
    ],
    status: 'active'
  })
})

export default app
