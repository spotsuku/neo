# NEOポータル 恒久対処チェックリスト

## 🎯 **目標: 正しい配信経路の確立**

**UI**: `app.neo-portal.jp` → Cloudflare Pages  
**API**: `api.neo-portal.jp` → APIオリジンサーバー

---

## ✅ **1. DNS / Custom Domain を正す**

### **DNS設定 (Cloudflare DNS)**
```bash
# 必要なレコード
app.neo-portal.jp    CNAME   neo-portal.pages.dev    (🟠 Proxy ON)
api.neo-portal.jp    A/AAAA  <API_SERVER_IP>         (🟠 Proxy ON)
```

### **Pages Custom Domain設定**
1. Cloudflare Pages Dashboard → `neo-portal` プロジェクト
2. **Custom domains** → **Add a custom domain**
3. `app.neo-portal.jp` を入力
4. **Status: Verified/Active** まで待機（数分〜1時間）

---

## ✅ **2. Worker/Route を厳密化**

### **重要: ルート設定の厳密化**
```bash
# ✅ 正しい設定
app.neo-portal.jp/api/*     → https://api.neo-portal.jp/*

# ❌ 危険な設定（削除必須）
app.neo-portal.jp/*         # UIがAPIに奪われる
app.neo-portal.jp/          # ルートがAPIに奪われる
```

### **設定場所**
- **Cloudflare Dashboard** → **Workers & Pages** → **Overview**
- **Routes** タブで確認・修正

---

## ✅ **3. APIサーバーの公開パス限定**

### **APIサーバー側で実装必須**
```javascript
// 有効パス
GET /api/*          → APIエンドポイント
GET /health         → 200 {"status": "ok"}
GET /status         → 200 {"status": "ok", "version": "..."}

// 無効化必須
GET /               → 404 または 301 redirect to /status
GET /dashboard      → 404 (UIはPages経由のみ)
GET /admin          → 404 (UIはPages経由のみ)
```

### **実装例 (Express.js)**
```javascript
// ルート制限
app.get('/', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Use /status for health check' });
});

// または /status にリダイレクト
app.get('/', (req, res) => {
  res.redirect(301, '/status');
});

app.get('/status', (req, res) => {
  res.json({ status: 'ok', service: 'NEO Portal API', version: '2.0.0' });
});
```

---

## ✅ **4. UIをPagesから確実に配信**

### **デプロイ実行**
```bash
# 自動デプロイスクリプト使用（推奨）
./scripts/deploy-neo-portal.sh production

# 手動デプロイ
npm ci
npm run build  # output: 'export' で自動的に out/ 生成
npx wrangler pages deploy ./out --project-name neo-portal
```

### **環境変数設定 (Pages)**
```bash
# Cloudflare Pages Dashboard → Settings → Environment variables
NEXT_PUBLIC_APP_URL=https://app.neo-portal.jp
NEXT_PUBLIC_API_BASE_URL=https://api.neo-portal.jp
```

---

## ✅ **5. CORS/Cookie（別オリジンの場合）**

### **APIサーバー側CORS設定**
```javascript
// レスポンスヘッダー
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://app.neo-portal.jp');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

### **フロントエンド側fetch設定**
```javascript
// lib/api-client.ts で実装済み
fetch('https://api.neo-portal.jp/api/endpoint', {
  credentials: 'include',  // 🔑 Cookie送信のため必須
  headers: {
    'Content-Type': 'application/json'
  }
});
```

---

## ✅ **6. 後方互換リダイレクト**

**next.config.js で実装済み：**
```javascript
async redirects() {
  return [
    { source: '/index.html', destination: '/', permanent: true },
    { source: '/login.html', destination: '/login', permanent: false },
    { source: '/dashboard.html', destination: '/dashboard', permanent: false },
    { source: '/admin-dashboard.html', destination: '/admin', permanent: false },
  ];
}
```

---

## 🔍 **検証コマンド（配信経路確認）**

### **1. UIドメイン確認**
```bash
# Pages経由かチェック
curl -I https://app.neo-portal.jp | sed -n '1p;/^server:/Ip;/^cf-cache-status:/Ip'

# 期待値: Cloudflare/Pages系のserver、cf-cache-statusあり
```

### **2. APIドメイン確認**
```bash
# API経由かチェック
curl -I https://api.neo-portal.jp/status | sed -n '1p;/^server:/Ip'

# 期待値: APIサーバー由来のレスポンス
```

### **3. ヘルスチェック**
```bash
# APIエンドポイント
curl https://api.neo-portal.jp/api/health

# API root (404であることを確認)
curl -I https://api.neo-portal.jp/
```

### **4. オリジン直接アクセス確認**
```bash
# API IPを直接叩いてUIが返されないことを確認
curl -sS -H 'Host: app.neo-portal.jp' http://<API_ORIGIN_IP>/ | head -n 2

# 期待値: 404またはAPI応答（UIのHTMLが返されない）
```

---

## ⚠️ **トラブルシューティング**

### **問題1: UIにAPIレスポンスが表示される**
**原因**: Worker ルートが広すぎる (`/*`, `/` など)  
**解決**: 
```bash
1. Workers Dashboard でルート確認
2. app.neo-portal.jp/* を削除
3. app.neo-portal.jp/api/* のみに限定
```

### **問題2: app.neo-portal.jpでAPIが応答**
**原因**: DNSがAPIオリジンを指している  
**解決**:
```bash
1. DNS確認: dig app.neo-portal.jp
2. CNAME を neo-portal.pages.dev に修正
3. Proxy ON (🟠) を確認
```

### **問題3: Custom Domain が Active にならない**
**原因**: DNS設定不備または時間不足  
**解決**:
```bash
1. DNS設定を再確認
2. 10-60分待機
3. Pages Dashboard で再試行
```

### **問題4: CORS エラー**
**原因**: APIサーバーのCORS設定不備  
**解決**:
```bash
1. API側で Access-Control-Allow-Origin 設定
2. credentials: 'include' の場合 Allow-Credentials: true
3. API再起動
```

---

## 🚨 **緊急時ロールバック手順**

### **1. Pages デプロイロールバック**
```bash
1. Cloudflare Pages Dashboard
2. Deployments タブ
3. 前の成功デプロイを選択
4. "Rollback to this deployment"
```

### **2. DNS一時変更**
```bash
1. app.neo-portal.jp をA recordに変更
2. 直接IPアドレスを指定
3. Workerを一時無効化
```

### **3. キャッシュクリア**
```bash
1. Cloudflare Dashboard → Caching
2. "Purge Everything" 実行
3. ブラウザのハードリフレッシュ (Ctrl+F5)
```

---

## 📞 **サポート情報**

- **Pages Dashboard**: https://dash.cloudflare.com → Pages → neo-portal
- **DNS Dashboard**: https://dash.cloudflare.com → DNS → neo-portal.jp
- **Workers Dashboard**: https://dash.cloudflare.com → Workers & Pages
- **ドキュメント**: https://developers.cloudflare.com/pages/