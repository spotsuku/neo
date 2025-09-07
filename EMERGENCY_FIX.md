# 🚨 緊急修正: UIドメインでAPI側が表示される問題

## 📋 **現在の症状**
**問題**: `app.neo-portal.jp` にアクセスするとUI（Next.js）ではなくAPI側のレスポンスが表示される

## 🎯 **即座の修正手順**

### **📍 Step 1: Worker Routes の緊急修正**

1. **Cloudflare Dashboard** にアクセス
2. **Workers & Pages** → **Overview** → **Routes** タブ
3. 以下のルートを **即座に削除**:
   ```
   ❌ app.neo-portal.jp/*
   ❌ app.neo-portal.jp/
   ❌ */app.neo-portal.jp
   ```
4. 以下のルートのみ **残す**:
   ```
   ✅ app.neo-portal.jp/api/*  →  https://api.neo-portal.jp/*
   ```

### **📍 Step 2: DNS設定の確認・修正**

1. **Cloudflare Dashboard** → **DNS** → **Records**
2. `app.neo-portal.jp` レコードを確認
3. **正しい設定に修正**:
   ```
   Type: CNAME
   Name: app.neo-portal.jp  
   Target: neo-portal.pages.dev
   Proxy Status: 🟠 Proxied (ON)
   ```

### **📍 Step 3: Pages Custom Domain設定**

1. **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. `neo-portal` プロジェクトを選択
3. **Custom domains** → **Add a custom domain**
4. `app.neo-portal.jp` を入力して追加
5. **Status: Active** になるまで待機（5-30分）

### **📍 Step 4: Pages デプロイの確認**

1. **Pages** → `neo-portal` → **Deployments**
2. 最新のデプロイが **Success** 状態であることを確認
3. もしデプロイがない場合:
   ```bash
   cd /home/user/webapp
   ./scripts/deploy-neo-portal.sh production
   ```

### **📍 Step 5: キャッシュクリア（重要）**

1. **Cloudflare Dashboard** → **Caching** → **Configuration**
2. **Purge Everything** をクリック
3. ブラウザでハードリフレッシュ（Ctrl+F5 または Cmd+Shift+R）

## 🔍 **修正確認コマンド**

### **即座実行**
```bash
# UI確認（Pages経由になったか）
curl -I https://app.neo-portal.jp

# 期待結果: server: cloudflare + cf-cache-status ヘッダー
# ❌ NGパターン: APIサーバーのレスポンス
```

### **詳細確認**
```bash
# 検証スクリプト実行
./scripts/verify-deployment.sh

# 手動確認
curl -sI https://app.neo-portal.jp | grep -E "(HTTP|server|cf-cache-status)"
```

## ⚡ **最も可能性の高い原因順**

### **1. Worker Route の広すぎる設定 (90%)**
```
問題: app.neo-portal.jp/* がAPIにプロキシ
結果: 全てのUIリクエストがAPIサーバーに流れる
修正: ルートを /api/* のみに限定
```

### **2. DNS設定の向き先間違い (80%)**  
```
問題: app.neo-portal.jp → API_SERVER_IP (A record)
結果: Pages経由でなく直接APIサーバーに到達
修正: CNAME → neo-portal.pages.dev
```

### **3. Pages Custom Domain未設定 (70%)**
```
問題: app.neo-portal.jp がPages側で認識されていない
結果: Cloudflareが適切にルーティングできない
修正: Custom Domain を Active 状態にする
```

### **4. Pages デプロイ未実行 (60%)**
```
問題: UIのコンテンツがPages側にデプロイされていない
結果: フォールバックでAPIに流れる
修正: Pages デプロイを実行
```

## 🚨 **緊急時の一時的回避策**

### **A. Worker無効化による切り分け**
```bash
1. Workers Dashboard で該当Workerを一時的に無効化
2. app.neo-portal.jp が直接Pages/APIどちらに流れるか確認
3. 原因特定後にWorkerを再有効化
```

### **B. DNS一時変更による確認**
```bash
1. app.neo-portal.jp を一時的にPages IPに直接向ける
2. UIが表示されることを確認
3. 確認後にCNAME設定に戻す
```

## 📞 **エスカレーション先**

問題が解決しない場合:
1. **Cloudflare Support** - DNS/Pages/Worker設定支援
2. **Pages Community** - https://community.cloudflare.com/c/developers/pages
3. **Discord** - Cloudflare Developers Discord

## ⏰ **修正予想時間**
- **Worker Route修正**: 1-3分（即座反映）
- **DNS変更**: 5-15分（TTL依存）
- **Pages Custom Domain**: 5-60分（SSL証明書生成時間）
- **キャッシュクリア**: 1-5分

---

**🎯 重要**: 上記Step1（Worker Routes修正）だけで90%の確率で解決します！