# NEO Digital Platform - ファイル構造マップ

## 📁 現在のファイル構造（2025年9月5日現在）

### 🚨 **重複・競合ファイルの問題**

#### 🔄 **認証システム重複**
```
認証関連ファイル (8個):
├── lib/auth.ts              [Next.js - サーバーサイド認証]
├── lib/auth-enhanced.ts     [Next.js - 拡張認証]
├── lib/auth-guards.ts       [Next.js - 認証ガード] 
├── lib/auth/auth-context.tsx [Next.js - Reactコンテキスト]
├── out/auth.js              [静的 - クライアントサイド認証] ⚠️
├── test-auth.js             [テスト用]
└── __tests__/unit/auth.test.ts [テスト]
```

#### 🔄 **ログインページ重複**
```
ログインページ (2個):
├── out/login.html           [静的 - 複雑な認証システム] ❌ エラー発生源
├── out/login-test.html      [静的 - シンプル動作版] ✅ 正常動作
└── app/auth/login/page.tsx  [Next.js - 未使用]
```

#### 🔄 **ダッシュボード重複**
```
ダッシュボード (6個):
├── out/dashboard.html           [静的 - 学生用]
├── out/admin-dashboard.html     [静的 - 管理者用]
├── out/company-dashboard.html   [静的 - 企業用]
├── app/dashboard/page.tsx       [Next.js - 学生用]
├── app/admin/page.tsx          [Next.js - 管理者用]
└── components/layout/dashboard-layout.tsx [Next.js - レイアウト]
```

#### 🔄 **ホームページ重複**
```
ホームページ (2個):
├── out/index.html           [静的 - ランディングページ] ✅ 使用中
└── app/page.tsx            [Next.js - 同等機能] 🔄 未使用
```

### 🏗️ **現在のアーキテクチャ**

#### 📂 **静的ファイル提供 (out/)**
```
out/
├── index.html           ✅ ホームページ
├── login.html           ❌ エラー発生（複雑な認証）
├── login-test.html      ✅ 正常動作（シンプル認証）
├── dashboard.html       ✅ 学生ダッシュボード
├── admin-dashboard.html ✅ 管理者ダッシュボード  
├── company-dashboard.html ✅ 企業ダッシュボード
└── auth.js             ✅ 認証システム
```

#### 📂 **Next.jsアプリケーション (app/)**
```
app/
├── page.tsx                    [ホームページ - 未使用]
├── auth/login/page.tsx         [ログインページ - 未使用]
├── dashboard/page.tsx          [ダッシュボード - 未使用]
├── admin/page.tsx             [管理者ダッシュボード - 未使用]
├── api/                       [API Routes - 部分的使用]
└── layout.tsx                 [レイアウト - 未使用]
```

### 🚨 **ネットワークエラーの根本原因**

#### 🔍 **特定された問題**
1. **`out/login.html`** - 存在しないメソッド呼び出し
   - `findUserByEmail()` - 未定義
   - `getUsers()` - 未定義
   - 複雑な認証フロー - 不要なサーバーリクエスト

2. **404エラー** - 存在しないリソース参照
   - `/password-reset.html` - 未作成
   - `/signup.html` - 未作成
   - 外部リソース競合

3. **認証システム競合**
   - Next.js認証 vs 静的認証の混在
   - 異なる認証APIエンドポイント期待

### ✅ **動作中のファイル**
```
✅ 正常動作:
├── out/index.html       [ホームページ]
├── out/login-test.html  [シンプルログイン]  
├── out/dashboard.html   [学生ダッシュボード]
├── out/admin-dashboard.html [管理者ダッシュボード]
├── out/company-dashboard.html [企業ダッシュボード]
├── out/auth.js         [認証システム]
└── simple-server.js    [静的ファイルサーバー]
```

```
❌ エラー発生:
├── out/login.html      [複雑すぎる認証システム]
└── app/**/*.tsx       [Next.js - 静的ファイルと競合]
```

### 🎯 **推奨解決策**

#### 1️⃣ **即座の修正**
- `out/login.html` → `out/login-backup.html` にリネーム
- `out/login-test.html` → `out/login.html` にリネーム
- シンプル認証システムを正式版に昇格

#### 2️⃣ **ファイル構造クリーンアップ**
- Next.jsファイル（app/）を一時的に無効化
- 静的ファイル（out/）に統一
- 重複ファイルの段階的統合

#### 3️⃣ **長期的アーキテクチャ**
```
推奨構造:
├── static/              [静的ファイル - 現在の out/]
├── next/               [Next.jsアプリ - 将来の移行用]
├── api/                [APIエンドポイント]
└── shared/             [共通ライブラリ]
```

### 🔗 **ルーティング設定**
```javascript
// simple-server.js での現在のルーティング
'/' → '/index.html'           ✅ 動作
'/login' → '/login.html'      ❌ エラー（複雑な認証）  
'/login-test' → '/login-test.html' ✅ 動作（シンプル認証）
'/dashboard' → '/dashboard.html' ✅ 動作
'/admin' → '/admin-dashboard.html' ✅ 動作
'/company' → '/company-dashboard.html' ✅ 動作
```

---

**📅 更新日**: 2025年9月5日  
**🔍 ステータス**: ネットワークエラー調査中  
**✅ 動作環境**: 静的ファイル + simple-server.js  
**❌ 問題環境**: 複雑な認証システム（login.html）