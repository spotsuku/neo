# NEO Digital Platform - 統一ヘッダーデザイン標準仕様書

## 📋 概要

NEO Digital Platformの全ダッシュボードで使用する統一ヘッダーデザインの標準仕様書です。
今後の開発では、この仕様に従ってヘッダーを実装してください。

## 🎨 デザインコンセプト

**「統一感を保ちつつ、各役割の特色を明確に表現」**

- **統一要素**: 構造・サイズ・コンポーネント配置
- **差別化要素**: テーマカラー・アイコン・ナビゲーション内容

## 🎯 役割別テーマカラー

### 学生ダッシュボード
```css
--student-primary: #0ea5e9    /* 水色 - 清新さ・学習意欲 */
--student-secondary: #38bdf8
--student-gradient: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)
--student-light: #f0f9ff      /* ホバー・背景用 */
```

### 企業管理者ダッシュボード  
```css
--company-primary: #059669    /* 緑色 - 成長・ビジネス成功 */
--company-secondary: #10b981
--company-gradient: linear-gradient(135deg, #059669 0%, #10b981 100%)
--company-light: #f0fdf4      /* ホバー・背景用 */
```

### 事務局ダッシュボード
```css
--admin-primary: #ec4899      /* ピンク - 親しみやすさ・サポート */
--admin-secondary: #f472b6
--admin-gradient: linear-gradient(135deg, #ec4899 0%, #f472b6 100%)
--admin-light: #fdf2f8        /* ホバー・背景用 */
```

## 📐 構造仕様

### HTML構造（必須）
```html
<nav class="bg-white shadow-lg border-b-2 border-{ROLE}-500 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between items-center py-4">
            <!-- ロゴエリア -->
            <div class="flex items-center space-x-4">
                <div class="{ROLE}-gradient text-white p-2 rounded-lg shadow-md">
                    <i class="fas fa-{ROLE_ICON} text-xl"></i>
                </div>
                <div>
                    <h1 class="text-xl font-bold text-gray-800">NEO Digital Platform</h1>
                    <p class="text-sm text-{ROLE}-600 font-medium">{ROLE_TITLE}ダッシュボード</p>
                </div>
            </div>

            <!-- ナビゲーションメニュー -->
            <div class="hidden md:flex items-center space-x-6">
                <!-- 役割別ナビゲーションリンク -->
            </div>

            <!-- ユーザーメニュー -->
            <div class="flex items-center space-x-4">
                <!-- 通知ボタン -->
                <!-- ユーザードロップダウン -->
                <!-- モバイルメニューボタン -->
            </div>
        </div>
        
        <!-- モバイルナビゲーション -->
        <div id="mobile-menu" class="hidden md:hidden pb-4 border-t border-gray-200">
            <!-- モバイル用メニュー -->
        </div>
    </div>
</nav>
```

### CSS必須クラス
```css
/* 役割別グラデーション */
.student-gradient { background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%); }
.company-gradient { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
.admin-gradient { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); }

/* アニメーション */
.animate-bounce { animation: bounce 1s infinite; }
.transition-all { transition: all 0.3s ease; }

/* ドロップダウンシャドウ */
#user-menu { box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
```

## 📱 レスポンシブ仕様

### デスクトップ（1024px+）
- **ヘッダー高さ**: 64px固定
- **ナビゲーション**: フル表示
- **フィルター**: 事務局のみ表示

### タブレット（768px-1023px）  
- **ナビゲーション**: 主要項目のみ
- **フィルター**: 一部非表示

### モバイル（767px以下）
- **ハンバーガーメニュー**: 必須
- **ナビゲーション**: 縦積み表示
- **ユーザー名**: 非表示

## 🎭 役割別アイコン仕様

| 役割 | アイコン | FontAwesome | 説明 |
|------|----------|-------------|------|
| 学生 | 🎓 | `fa-graduation-cap` | 学習・成長を象徴 |
| 企業 | 🏢 | `fa-building` | ビジネス・組織を象徴 |
| 事務局 | 👔 | `fa-user-tie` | 管理・運営を象徴 |

## 🧭 ナビゲーション標準

### 学生ダッシュボード
```html
<a href="/dashboard" class="text-student-700 font-medium border-b-2 border-student-500 pb-1">
    <i class="fas fa-home mr-2"></i>ホーム
</a>
<a href="/student/hero-progress" class="text-gray-600 hover:text-student-600 font-medium transition-colors">
    <i class="fas fa-trophy mr-2"></i>ヒーロー進捗
</a>
<a href="/classes" class="text-gray-600 hover:text-student-600 font-medium transition-colors">
    <i class="fas fa-chalkboard-teacher mr-2"></i>授業
</a>
<a href="/projects" class="text-gray-600 hover:text-student-600 font-medium transition-colors">
    <i class="fas fa-project-diagram mr-2"></i>プロジェクト
</a>
```

### 企業管理者ダッシュボード
```html
<a href="/company-dashboard" class="text-company-700 font-medium border-b-2 border-company-500 pb-1">
    <i class="fas fa-chart-line mr-2"></i>パフォーマンス
</a>
<a href="/company/hero-distribution" class="text-gray-600 hover:text-company-600 font-medium transition-colors">
    <i class="fas fa-crown mr-2"></i>ヒーロー管理
</a>
<a href="/company/projects" class="text-gray-600 hover:text-company-600 font-medium transition-colors">
    <i class="fas fa-project-diagram mr-2"></i>プロジェクト
</a>
<a href="/company/reports" class="text-gray-600 hover:text-company-600 font-medium transition-colors">
    <i class="fas fa-file-alt mr-2"></i>レポート
</a>
```

### 事務局ダッシュボード
```html
<a href="/admin/dashboard" class="text-admin-700 font-medium border-b-2 border-admin-500 pb-1">
    <i class="fas fa-chart-line mr-2"></i>KPI管理
</a>
<a href="/admin/users" class="text-gray-600 hover:text-admin-600 font-medium transition-colors">
    <i class="fas fa-users mr-2"></i>ユーザー管理
</a>
<a href="/admin/monitoring" class="text-gray-600 hover:text-admin-600 font-medium transition-colors">
    <i class="fas fa-server mr-2"></i>システム監視
</a>
<a href="/admin/settings" class="text-gray-600 hover:text-admin-600 font-medium transition-colors">
    <i class="fas fa-cog mr-2"></i>設定
</a>
```

## ⚙️ JavaScript標準実装

### 必須イベントリスナー
```javascript
function setupUnifiedHeaderEvents() {
    // ユーザーメニューの切り替え
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenu = document.getElementById('user-menu');
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
    }
    
    // モバイルメニューの切り替え
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // 通知ボタン
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            console.log('🔔 通知クリック');
            showNotification('新しい通知があります', 'info');
        });
    }
    
    // 外側クリックでメニューを閉じる
    document.addEventListener('click', function(e) {
        if (userMenu && !userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
            userMenu.classList.add('hidden');
        }
    });
}

// 標準ログアウト機能
function logout() {
    console.log('👋 ログアウト中...');
    if (window.authManager) {
        window.authManager.logout();
    }
    window.location.href = '/login.html';
}

// 初期化時に必ず呼び出し
document.addEventListener('DOMContentLoaded', function() {
    setupUnifiedHeaderEvents();
    // その他の初期化処理...
});
```

## 🔧 TailwindCSS設定

### 必須カラーパレット
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'student': {
                    50: '#f0f9ff',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1'
                },
                'company': {
                    50: '#f0fdf4',
                    500: '#059669',
                    600: '#047857',
                    700: '#065f46'
                },
                'admin': {
                    50: '#fdf2f8',
                    500: '#ec4899',
                    600: '#db2777',
                    700: '#be185d'
                }
            }
        }
    }
}
```

## 📋 実装チェックリスト

### ✅ 新しいページ作成時の確認事項
- [ ] 適切な役割別テーマカラーを使用
- [ ] HTML構造が標準仕様に準拠  
- [ ] 必須CSSクラスを定義
- [ ] JavaScriptイベントリスナーを実装
- [ ] レスポンシブ対応を確認
- [ ] アクセシビリティ要件を満たす
- [ ] 通知機能を統合

### ✅ 既存ページ修正時の確認事項
- [ ] ヘッダー部分を標準仕様に更新
- [ ] カラーテーマの一貫性を確認
- [ ] ナビゲーション項目が適切
- [ ] モバイル対応が完了
- [ ] JavaScript機能が動作

## 🚫 禁止事項

1. **独自ヘッダー構造**: 標準構造以外の使用禁止
2. **非標準カラー**: 定義外のテーマカラー使用禁止
3. **固定サイズ**: ヘッダー高さの変更禁止
4. **非レスポンシブ**: モバイル対応の省略禁止
5. **アニメーション改変**: 標準アニメーション以外の使用禁止

## 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-09-02 | v1.0.0 | 統一ヘッダーデザイン仕様策定 |

## 📞 問い合わせ

統一ヘッダーデザインに関する質問や提案は、開発チームまでお問い合わせください。

**この仕様書に従って実装することで、NEO Digital Platform全体の一貫性とユーザビリティを保つことができます。**