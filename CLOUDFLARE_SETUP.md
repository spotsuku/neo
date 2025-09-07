# NEOポータル Cloudflare設定ガイド

## 🎯 **設定目標**
- **UI**: `app.neo-portal.jp` → Cloudflare Pages
- **API**: `api.neo-portal.jp` → Origin Server (API専用)

## 📋 **設定チェックリスト**

### 1. **DNS設定** (Cloudflare Dashboard)

```bash
# 必要なDNSレコード
app.neo-portal.jp    CNAME   neo-portal.pages.dev    (Proxy ON 🟠)
api.neo-portal.jp    A/AAAA  YOUR_API_SERVER_IP      (Proxy ON 🟠)
```

**確認コマンド:**
```bash
# DNSの向き先確認
dig app.neo-portal.jp
dig api.neo-portal.jp
```

### 2. **Cloudflare Pages設定**

#### **2.1 プロジェクト作成**
```bash
npx wrangler pages project create neo-portal --production-branch main
```

#### **2.2 Custom Domain追加**
```bash
# Pages Dashboard → Custom domains で設定
app.neo-portal.jp → Verified & Active まで完了
```

**確認方法:**
- Cloudflare Pages Dashboard
- Custom domains セクション
- Status: `Active` 🟢

#### **2.3 Environment Variables**
```bash
# Cloudflare Pages → Settings → Environment variables
NEXT_PUBLIC_APP_URL=https://app.neo-portal.jp
NEXT_PUBLIC_API_BASE_URL=https://api.neo-portal.jp
JWT_SECRET=your-secure-jwt-secret
```

### 3. **Workers ルート設定** (必要な場合)

⚠️ **重要**: ルート設定は慎重に！

```bash
# 正しいルート (API のみプロキシ)
app.neo-portal.jp/api/*  → https://api.neo-portal.jp/*

# ❌ 避けるべきルート (UIがAPIに奪われる)
app.neo-portal.jp/*      → NG!!
```

**設定場所:**
- Cloudflare Dashboard → Workers & Pages → Overview → Routes

### 4. **API サーバー CORS設定**

API サーバー側で以下を設定:

```javascript
// レスポンスヘッダー
Access-Control-Allow-Origin: https://app.neo-portal.jp
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 5. **API サーバー ルート制限**

```javascript
// API サーバーのルート設定
GET /           → 404 or redirect to /status
GET /status     → 200 (health check)
GET /api/*      → API エンドポイント
GET /health     → 200 (health check)

// ❌ UIを返すルートは削除
GET / → UIを返すのはNG (Pagesと衝突)
```

## 🧪 **動作確認コマンド**

### **Step 1: サーバー確認**
```bash
# UIはPages経由か？
curl -I https://app.neo-portal.jp | grep -E "(^HTTP|^server:|^cf-cache-status:)"
# 期待: Pages由来のヘッダー

# APIはOrigin経由か？
curl -I https://api.neo-portal.jp/status | grep -E "(^HTTP|^server:)"
# 期待: API server由来のヘッダー
```

### **Step 2: ルート確認**
```bash
# UIが表示されるか？
curl -s https://app.neo-portal.jp/ | head -n 5
# 期待: HTML（Next.js UI）

# APIルートが正しく動くか？
curl https://api.neo-portal.jp/api/health
# 期待: {"status": "ok"} など

# API root は 404/redirect か？
curl -I https://api.neo-portal.jp/
# 期待: 404 or 302 redirect to /status
```

### **Step 3: CORS確認**
```bash
# CORS ヘッダーが設定されているか？
curl -H "Origin: https://app.neo-portal.jp" -I https://api.neo-portal.jp/api/health
# 期待: Access-Control-Allow-Origin ヘッダー
```

## 🚨 **トラブルシューティング**

### **問題1: UIにAPIレスポンスが表示される**
**原因**: Workers ルートが `/*` など広すぎる
**解決**: ルートを `/api/*` のみに限定

### **問題2: Custom Domain が Active にならない**
**原因**: DNS設定が間違っている
**解決**: 
1. DNS確認: `dig app.neo-portal.jp`
2. CNAME が `neo-portal.pages.dev` を指しているか確認

### **問題3: CORS エラー**
**原因**: API サーバーのCORS設定不備
**解決**:
1. API サーバーで `Access-Control-Allow-Origin` 設定
2. `credentials: 'include'` の場合は `Access-Control-Allow-Credentials: true` 必須

### **問題4: Cookie 認証が効かない**
**原因**: SameSite設定やドメイン違い
**解決**:
1. Cookie設定: `SameSite=None; Secure=true` (別ドメインの場合)
2. API サーバーで `Access-Control-Allow-Credentials: true`

## 🔄 **ロールバック手順**

### **緊急時の即時対応**
```bash
# 1. Pages デプロイをロールバック
# Cloudflare Pages Dashboard → Deployments → 前バージョン選択

# 2. DNS を一時的に直接IPに向ける
# app.neo-portal.jp A record → 直接IPアドレス

# 3. Workers ルートを無効化
# Workers Dashboard → Routes → 一時的に無効化
```

## 📞 **サポート情報**

- **Pages設定**: Cloudflare Pages Dashboard
- **DNS設定**: Cloudflare DNS Dashboard  
- **Workers**: Cloudflare Workers Dashboard
- **ドキュメント**: https://developers.cloudflare.com/pages/