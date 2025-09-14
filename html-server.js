const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 7000;
const HOST = '0.0.0.0';

console.log('🌐 HTML配信サーバー(ポート7000)起動中...');
console.log('📁 配信ディレクトリ: /out');

// MIMEタイプの定義
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2'
};

const server = http.createServer((req, res) => {
  console.log(`📝 ${new Date().toISOString()}: ${req.method} ${req.url}`);
  
  // API リクエストをAPIサーバー（7001）にプロキシ
  if (req.url.startsWith('/api/')) {
    const proxyOptions = {
      hostname: 'localhost',
      port: 8001,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const proxyReq = http.request(proxyOptions, (proxyRes) => {
      // レスポンスヘッダーをコピー
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    // リクエストボディをプロキシ
    req.pipe(proxyReq);
    
    proxyReq.on('error', (err) => {
      console.error('❌ API プロキシエラー:', err);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'API Server Unavailable', message: err.message }));
    });
    
    return;
  }

  // ルート / は admin-dashboard.html を返却（現状どおり）
  let filePath = path.join(__dirname, 'out', req.url === '/' ? 'admin-dashboard.html' : req.url);
  
  // 存在しないファイルはadmin-dashboard.htmlにフォールバック（SPA的動作）
  if (!fs.existsSync(filePath) && !req.url.includes('.')) {
    filePath = path.join(__dirname, 'out', 'admin-dashboard.html');
  }
  
  // ファイル配信
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html><head><title>404 Not Found</title></head>
      <body>
        <h1>404 Not Found</h1>
        <p>ファイルが見つかりません: ${req.url}</p>
        <a href="/">ダッシュボードに戻る</a>
      </body></html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`✅ HTML配信サーバー起動完了: http://${HOST}:${PORT}`);
  console.log('📄 メインページ: http://localhost:7000/admin-dashboard.html');
  console.log('🔐 ログインページ: http://localhost:7000/login.html');
  console.log('👥 会員管理: http://localhost:7000/admin-members.html');
});

// エラーハンドリング
server.on('error', (err) => {
  console.error('❌ HTML配信サーバーエラー:', err);
  process.exit(1);
});