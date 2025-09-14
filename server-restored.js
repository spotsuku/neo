const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const HOST = '0.0.0.0';

// MIMEタイプの定義
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let urlPath = req.url === '/' ? '/admin-dashboard.html' : req.url;
  
  // Remove query parameters
  urlPath = urlPath.split('?')[0];
  
  // 特別なルーティング（v2.1 NEOポータル用）
  const routeMap = {
    '/': '/admin-dashboard.html',
    '/dashboard': '/admin-dashboard.html',
    '/dashboard.html': '/admin-dashboard.html',
    '/admin': '/admin-dashboard.html',
    '/admin.html': '/admin-dashboard.html',
    '/members': '/admin-members.html',
    '/members.html': '/admin-members.html',
    '/login': '/login.html',
    '/auth.js': '/auth.js'
  };

  if (routeMap[urlPath]) {
    urlPath = routeMap[urlPath];
  }
  
  // 静的ファイルの提供順序（v2.1復元版用）
  const possiblePaths = [
    path.join(__dirname, 'out', urlPath),        // NEO v2.1 files
    path.join(__dirname, 'dist', urlPath),       // Next.js build output  
    path.join(__dirname, 'public', urlPath),     // Public assets
    path.join(__dirname, urlPath.substring(1))   // Root files
  ];

  let filePath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).isFile()) {
      filePath = possiblePath;
      break;
    }
  }

  if (!filePath) {
    // 404 Page with NEO Portal links
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - NEO Digital Platform v2.1</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center">
        <div class="text-center max-w-md">
          <div class="mb-8">
            <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
            <h1 class="text-4xl font-bold text-gray-800 mb-2">404</h1>
            <h2 class="text-xl font-semibold text-gray-600 mb-4">ページが見つかりません</h2>
          </div>
          
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 class="text-lg font-medium text-gray-700 mb-4">
              <i class="fas fa-rocket mr-2 text-pink-600"></i>
              NEO Digital Platform v2.1
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span>管理ダッシュボード</span>
                <a href="/admin-dashboard.html" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-external-link-alt"></i>
                </a>
              </div>
              <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span>会員一覧管理</span>
                <a href="/admin-members.html" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-external-link-alt"></i>
                </a>
              </div>
              <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span>ログイン</span>
                <a href="/login.html" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-external-link-alt"></i>
                </a>
              </div>
            </div>
          </div>
          
          <a href="/admin-dashboard.html" class="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
            <i class="fas fa-home mr-2"></i>ダッシュボードに戻る
          </a>
          
          <p class="text-xs text-gray-500 mt-4">
            NEO Digital Platform v2.1 - 復元版<br>
            Tag: 2025/09/08_ver2.1_NEOポータル
          </p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  const ext = path.extname(filePath);
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (error) {
    console.error('File read error:', error);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>500 - Server Error</title></head>
      <body>
        <h1>500 - Internal Server Error</h1>
        <p>ファイルの読み込みに失敗しました: ${filePath}</p>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 NEO Digital Platform v2.1 Server running on http://${HOST}:${PORT}`);
  console.log(`📁 Serving files from:`);
  console.log(`   - out/ (NEO v2.1 restored files) ⭐ PRIMARY`);
  console.log(`   - dist/ (Next.js build)`);
  console.log(`   - public/ (Static assets)`);
  console.log(`   - / (Root files)`);
  console.log(`🎯 Available pages:`);
  console.log(`   - / → admin-dashboard.html (管理ダッシュボード)`);
  console.log(`   - /admin-members.html (会員一覧管理)`);
  console.log(`   - /login.html (ログイン)`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Please stop other services or use a different port.`);
  }
});