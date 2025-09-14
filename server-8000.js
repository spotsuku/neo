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

  let urlPath = req.url === '/' ? '/index.html' : req.url;
  
  // Remove query parameters
  urlPath = urlPath.split('?')[0];
  
  // 静的ファイルの提供順序
  const possiblePaths = [
    path.join(__dirname, 'dist', urlPath),      // Next.js build output
    path.join(__dirname, 'public', urlPath),   // Public assets
    path.join(__dirname, urlPath.substring(1)) // Root files
  ];

  let filePath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).isFile()) {
      filePath = possiblePath;
      break;
    }
  }

  if (!filePath) {
    // 404 Page
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - NEOポータル</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 class="text-2xl font-semibold text-gray-600 mb-4">ページが見つかりません</h2>
          <p class="text-gray-500 mb-8">お探しのページは存在しないか、移動された可能性があります。</p>
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-medium text-gray-700 mb-2">利用可能なページ:</h3>
              <div class="space-y-2 text-sm">
                <div><a href="/admin.html" class="text-blue-600 hover:text-blue-800">管理画面</a></div>
                <div><a href="/dashboard.html" class="text-blue-600 hover:text-blue-800">ダッシュボード</a></div>
                <div><a href="/profile.html" class="text-blue-600 hover:text-blue-800">プロフィール</a></div>
              </div>
            </div>
          </div>
          <a href="/" class="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            ホームに戻る
          </a>
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
        <p>ファイルの読み込みに失敗しました。</p>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 NEO Portal Server running on http://${HOST}:${PORT}`);
  console.log(`📁 Serving files from:`);
  console.log(`   - dist/ (Next.js build)`);
  console.log(`   - public/ (Static assets)`);
  console.log(`   - / (Root files)`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Please stop other services or use a different port.`);
  }
});