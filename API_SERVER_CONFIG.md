# APIサーバー設定例 - NEOポータル

## 🎯 **APIサーバー側で実装必須の設定**

### **1. パス制限の実装**

#### **Express.js 例**
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// CORS設定（重要）
app.use(cors({
  origin: 'https://app.neo-portal.jp',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ 有効なエンドポイント
app.use('/api', require('./routes/api'));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'NEO Portal API'
  });
});

app.get('/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.0.0',
    service: 'NEO Portal API',
    environment: process.env.NODE_ENV || 'production'
  });
});

// ❌ ルートアクセス制限（重要）
app.get('/', (req, res) => {
  // Option 1: 404を返す
  res.status(404).json({ 
    error: 'Not Found', 
    message: 'Use /status for health check' 
  });
  
  // Option 2: /statusにリダイレクト
  // res.redirect(301, '/status');
});

// その他のパスも404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    path: req.originalUrl 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`NEO Portal API running on port ${PORT}`);
});
```

#### **Fastify 例**
```javascript
const fastify = require('fastify')({ logger: true });

// CORS設定
fastify.register(require('@fastify/cors'), {
  origin: 'https://app.neo-portal.jp',
  credentials: true
});

// ✅ 有効なエンドポイント
fastify.register(require('./routes/api'), { prefix: '/api' });

fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'NEO Portal API'
  };
});

fastify.get('/status', async (request, reply) => {
  return { 
    status: 'ok', 
    version: '2.0.0',
    service: 'NEO Portal API',
    environment: process.env.NODE_ENV || 'production'
  };
});

// ❌ ルートアクセス制限
fastify.get('/', async (request, reply) => {
  reply.code(404);
  return { 
    error: 'Not Found', 
    message: 'Use /status for health check' 
  };
});

// 404ハンドラー
fastify.setNotFoundHandler(async (request, reply) => {
  reply.code(404);
  return { 
    error: 'Not Found', 
    path: request.url 
  };
});
```

### **2. Nginx リバースプロキシ設定例**

```nginx
# /etc/nginx/sites-available/neo-portal-api
server {
    listen 80;
    server_name api.neo-portal.jp;
    
    # Cloudflare Only
    # real_ip_header CF-Connecting-IP;
    # set_real_ip_from 0.0.0.0/0;

    # CORS Headers
    add_header 'Access-Control-Allow-Origin' 'https://app.neo-portal.jp' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health endpoints
    location ~ ^/(health|status)$ {
        proxy_pass http://localhost:3001$request_uri;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Root redirect
    location = / {
        return 301 /status;
    }

    # Block everything else
    location / {
        return 404;
    }
}
```

### **3. Docker 設定例**

#### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["node", "server.js"]
```

#### **docker-compose.yml**
```yaml
version: '3.8'
services:
  neo-portal-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### **4. 環境変数設定**

#### **.env**
```bash
# サーバー設定
NODE_ENV=production
PORT=3001

# CORS設定
CORS_ORIGIN=https://app.neo-portal.jp

# JWT設定
JWT_SECRET=your-secure-jwt-secret-key

# データベース設定
DATABASE_URL=your-database-url

# ログレベル
LOG_LEVEL=info
```

### **5. PM2 設定例**

#### **ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'neo-portal-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### **6. セキュリティ強化**

#### **Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // リクエスト数制限
  message: 'Too many requests from this IP'
});

app.use('/api', apiLimiter);
```

#### **Helmet (セキュリティヘッダー)**
```javascript
const helmet = require('helmet');

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // CORS使用時は無効化
}));
```

## 🔍 **動作確認コマンド**

### **ローカルテスト**
```bash
# サーバー起動
npm start

# エンドポイントテスト
curl http://localhost:3001/health
curl http://localhost:3001/status
curl http://localhost:3001/  # 404 or redirect
curl http://localhost:3001/api/some-endpoint
```

### **本番環境テスト**
```bash
# 検証スクリプト実行
./scripts/verify-deployment.sh

# 手動確認
curl -I https://api.neo-portal.jp/status
curl -I https://api.neo-portal.jp/
curl -H "Origin: https://app.neo-portal.jp" -I https://api.neo-portal.jp/status
```

## 📚 **参考資料**

- **Express CORS**: https://expressjs.com/en/resources/middleware/cors.html
- **Fastify CORS**: https://github.com/fastify/fastify-cors
- **Nginx CORS**: https://enable-cors.org/server_nginx.html
- **PM2 Config**: https://pm2.keymetrics.io/docs/usage/application-declaration/