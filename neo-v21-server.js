const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '0.0.0.0';

// NEO v2.1専用サーバー - Next.jsを完全に無視
console.log('🎯 NEO Digital Platform v2.1 専用サーバー起動中...');

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
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// グローバルデータストア（メモリ内永続化）
let globalMembersData = null;

// API処理関数（新機能）
function handleAPIRequest(req, res, pathname, query) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  console.log(`🔌 API Request: ${req.method} ${pathname}`);

  // RBAC認証チェック（簡略版）
  const userRole = req.headers['x-user-role'] || 'admin'; // デバッグモードでは常にadmin
  
  if (req.method === 'GET' && pathname === '/api/analytics/hero-steps-distribution') {
    // ヒーローステップ分布API
    const mockData = {
      total: 25,
      buckets: [
        { step: 0, count: 8 },
        { step: 1, count: 5 },
        { step: 2, count: 4 },
        { step: 3, count: 3 },
        { step: 4, count: 3 },
        { step: 5, count: 2 }
      ],
      ratio: [32.0, 20.0, 16.0, 12.0, 12.0, 8.0]
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(mockData));
    console.log('✅ Hero steps distribution data sent');
    return;
  }
  
  if (req.method === 'GET' && pathname === '/api/analytics/engagement-distribution') {
    // RBAC権限チェック: admin|editor|staff のみ許可
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'admin, editor, or staff role required for analytics access'
      }));
      console.log(`❌ Access denied for role: ${userRole}`);
      return;
    }
    
    // 関与度ステータス分布API（実データ接続予定）
    const mockData = {
      total: 1234,
      buckets: [
        { status: 'core', count: 123 },
        { status: 'active', count: 678 },
        { status: 'peripheral', count: 345 },
        { status: 'at_risk', count: 88 }
      ],
      ratio: {
        core: 0.0997,
        active: 0.5498, 
        peripheral: 0.2797,
        at_risk: 0.0713
      },
      updated_at: new Date().toISOString()
    };
    
    // キャッシュヘッダー設定（1分間）
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.writeHead(200);
    res.end(JSON.stringify(mockData));
    console.log('✅ Engagement distribution data sent (with RBAC and cache)');
    return;
  }
  
  if (req.method === 'PATCH' && pathname.startsWith('/api/members/') && pathname.endsWith('/hero-step')) {
    // ヒーローステップ更新API
    const memberId = pathname.split('/')[3];
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(`📈 Hero step update for member ${memberId}:`, data);
        
        // 実際にデータを更新
        if (globalMembersData) {
          const member = globalMembersData.find(m => m.id === memberId);
          if (member) {
            const heroStepLabels = {
              0: '目的', 1: '主体性', 2: '初期行動',
              3: 'テーマ決め', 4: 'リーダー', 5: 'ヒーロー'
            };
            
            member.hero_step = data.current_step;
            member.hero_step_label = heroStepLabels[data.current_step];
            member.updated_at = new Date().toISOString();
            
            console.log('💾 Member data updated:', { id: memberId, hero_step: member.hero_step, hero_step_label: member.hero_step_label });
          }
        }
        
        const response = {
          id: Date.now(),
          current_step: data.current_step,
          previous_step: 0,
          message: 'Hero step updated successfully'
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(response));
        console.log('✅ Hero step updated');
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  if (req.method === 'PATCH' && pathname.startsWith('/api/members/') && pathname.endsWith('/status')) {
    // ステータス更新API
    const memberId = pathname.split('/')[3];
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(`📊 Status update for member ${memberId}:`, data);
        
        // 実際にデータを更新
        if (globalMembersData) {
          const member = globalMembersData.find(m => m.id === memberId);
          if (member) {
            member.engagement_status = data.engagement_status;
            member.updated_at = new Date().toISOString();
            
            console.log('💾 Member status updated:', { id: memberId, engagement_status: member.engagement_status });
          }
        }
        
        const response = {
          id: memberId,
          name: 'Sample User',
          engagement_status: data.engagement_status,
          message: 'Member status updated successfully'
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(response));
        console.log('✅ Member status updated');
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/members') {
    // 新規会員作成API
    if (!['admin', 'editor'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - admin or editor role required' }));
      console.log('❌ Member creation access denied for role:', userRole);
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const memberData = JSON.parse(body);
        console.log('➕ New member creation request:', memberData);

        // バリデーション
        if (!memberData.email || !memberData.name || !memberData.role || !memberData.status) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing required fields: email, name, role, status' }));
          return;
        }

        // メールアドレス重複チェック
        if (globalMembersData && globalMembersData.some(m => m.email === memberData.email)) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: 'Email already exists' }));
          return;
        }

        // 新規メンバーデータ作成
        const newId = 'member_' + Date.now().toString();
        const heroStepLabels = {
          0: '目的', 1: '主体性', 2: '初期行動',
          3: 'テーマ決め', 4: 'リーダー', 5: 'ヒーロー'
        };

        const newMember = {
          id: newId,
          name: memberData.name,
          email: memberData.email,
          role: memberData.role,
          status: memberData.status,
          engagement_status: memberData.status, // デフォルトは status と同じ
          hero_step: 0, // デフォルトは 0（目的）
          hero_step_label: heroStepLabels[0],
          affiliation: memberData.affiliation || '',
          birthdate: memberData.birthdate || '',
          tagline: memberData.tagline || '',
          hometown: memberData.hometown || '',
          high_school: memberData.high_school || '',
          university: memberData.university || '',
          title: memberData.title || '',
          profile_text: memberData.profile_text || '',
          sns_x: memberData.sns_x || '',
          sns_instagram: memberData.sns_instagram || '',
          sns_tiktok: memberData.sns_tiktok || '',
          neo_motivation: memberData.neo_motivation || '',
          membership_types: memberData.membership_types || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: null
        };

        // グローバルデータに追加
        if (!globalMembersData) {
          globalMembersData = [];
        }
        globalMembersData.push(newMember);

        console.log('✅ New member created:', { id: newId, name: newMember.name, email: newMember.email });

        res.writeHead(201);
        res.end(JSON.stringify({ 
          message: 'Member created successfully', 
          member: newMember 
        }));
      } catch (error) {
        console.error('❌ Member creation error:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON or server error' }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/members/')) {
    // 会員削除API
    if (!['admin'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - admin role required' }));
      console.log('❌ Member deletion access denied for role:', userRole);
      return;
    }

    const memberId = pathname.split('/')[3];
    console.log('🗑️ Member deletion request:', memberId);

    if (!globalMembersData) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'No members data available' }));
      return;
    }

    const memberIndex = globalMembersData.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Member not found' }));
      return;
    }

    const deletedMember = globalMembersData[memberIndex];
    globalMembersData.splice(memberIndex, 1);

    console.log('✅ Member deleted:', { id: memberId, name: deletedMember.name });

    res.writeHead(200);
    res.end(JSON.stringify({ 
      message: 'Member deleted successfully',
      member: { id: memberId, name: deletedMember.name }
    }));
    return;
  }

  if (req.method === 'PUT' && pathname.startsWith('/api/members/') && !pathname.includes('/hero-step') && !pathname.includes('/status')) {
    // 会員情報更新API（名前変更など）
    if (!['admin', 'editor'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - admin or editor role required' }));
      console.log('❌ Member update access denied for role:', userRole);
      return;
    }

    const memberId = pathname.split('/')[3];

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updateData = JSON.parse(body);
        console.log('📝 Member update request:', { memberId, updateData });

        if (!globalMembersData) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'No members data available' }));
          return;
        }

        const memberIndex = globalMembersData.findIndex(m => m.id === memberId);
        if (memberIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Member not found' }));
          return;
        }

        const member = globalMembersData[memberIndex];

        // メールアドレス変更時の重複チェック
        if (updateData.email && updateData.email !== member.email) {
          if (globalMembersData.some(m => m.email === updateData.email)) {
            res.writeHead(409);
            res.end(JSON.stringify({ error: 'Email already exists' }));
            return;
          }
        }

        // 更新可能なフィールドのみを更新
        const updatableFields = [
          'name', 'email', 'role', 'status', 'engagement_status',
          'affiliation', 'birthdate', 'tagline', 'hometown', 'high_school',
          'university', 'title', 'profile_text', 'sns_x', 'sns_instagram',
          'sns_tiktok', 'neo_motivation', 'membership_types'
        ];

        updatableFields.forEach(field => {
          if (updateData[field] !== undefined) {
            member[field] = updateData[field];
          }
        });

        member.updated_at = new Date().toISOString();

        console.log('✅ Member updated:', { id: memberId, name: member.name });

        res.writeHead(200);
        res.end(JSON.stringify({ 
          message: 'Member updated successfully',
          member: member
        }));
      } catch (error) {
        console.error('❌ Member update error:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON or server error' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/members') {
    // 会員一覧API（RBAC対応）
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied' }));
      console.log('❌ Member list access denied for role:', userRole);
      return;
    }

    // ヒーローステップラベルマッピング
    const heroStepLabels = {
      0: '目的',
      1: '主体性', 
      2: '初期行動',
      3: 'テーマ決め',
      4: 'リーダー',
      5: 'ヒーロー'
    };

    // モックデータ（正しい構造で返却）
    if (!globalMembersData) {
      // 初回のみデータを初期化
      globalMembersData = [
      {
        id: 'member_001',
        name: '田中太郎',
        email: 'tanaka@example.com',
        role: 'student',
        status: 'active',
        engagement_status: 'active',
        hero_step: 2,
        hero_step_label: heroStepLabels[2],
        affiliation: '東京大学',
        birthdate: '1995-04-15',
        tagline: '革新的なアイデアで未来を創る',
        hometown: '東京都',
        high_school: '開成高等学校',
        university: '東京大学',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z',
        last_login_at: '2024-09-01T10:30:00Z'
      },
      {
        id: 'member_002',
        name: '佐藤花子',
        email: 'sato@example.com',
        role: 'company',
        status: 'active',
        engagement_status: 'core',
        hero_step: 4,
        hero_step_label: heroStepLabels[4],
        affiliation: 'テクノロジー株式会社',
        birthdate: '1988-08-22',
        tagline: 'デジタル変革のパートナー',
        hometown: '大阪府',
        university: '早稲田大学',
        created_at: '2024-02-10T14:20:00Z',
        updated_at: '2024-02-10T14:20:00Z',
        last_login_at: '2024-08-28T16:45:00Z'
      },
      {
        id: 'member_003',
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        role: 'admin',
        status: 'active',
        engagement_status: 'core',
        hero_step: 5,
        hero_step_label: heroStepLabels[5],
        affiliation: 'NEO事務局',
        birthdate: '1985-12-03',
        tagline: 'コミュニティを支える架け橋',
        hometown: '神奈川県',
        university: '慶應義塾大学',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: '2024-09-08T08:15:00Z'
      },
      {
        id: 'member_004',
        name: '山田美咲',
        email: 'yamada@example.com',
        role: 'student',
        status: 'active',
        engagement_status: 'peripheral',
        hero_step: 1,
        hero_step_label: heroStepLabels[1],
        affiliation: '京都大学',
        birthdate: '1997-06-12',
        tagline: 'サステナブルな社会を目指して',
        hometown: '京都府',
        high_school: '洛南高等学校',
        university: '京都大学',
        created_at: '2024-03-20T11:15:00Z',
        updated_at: '2024-03-20T11:15:00Z',
        last_login_at: '2024-08-15T14:22:00Z'
      },
      {
        id: 'member_005',
        name: '高橋健治',
        email: 'takahashi@example.com',
        role: 'company',
        status: 'active',
        engagement_status: 'at_risk',
        hero_step: 0,
        hero_step_label: heroStepLabels[0],
        affiliation: 'イノベーション企業',
        birthdate: '1990-11-28',
        tagline: 'ビジネスで社会課題を解決',
        hometown: '愛知県',
        university: '名古屋大学',
        created_at: '2024-04-08T16:30:00Z',
        updated_at: '2024-04-08T16:30:00Z',
        last_login_at: '2024-07-20T09:45:00Z'
      }
      ];
      
      console.log('🔄 Global members data initialized');
    }

    // Cache headers
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5分キャッシュ

    res.writeHead(200);
    res.end(JSON.stringify({ members: globalMembersData }));
    console.log('✅ Members list sent with RBAC and correct data structure');
    return;
  }
  
  // 404 for unknown API endpoints
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
  console.log('❌ API endpoint not found:', pathname);
}

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Role');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let urlPath = req.url;
  
  // Remove query parameters for file routing (but keep for API)
  const [pathname, query] = urlPath.split('?');
  
  // API処理（新機能）
  if (pathname.startsWith('/api/')) {
    handleAPIRequest(req, res, pathname, query);
    return;
  }
  
  // NEO v2.1専用ルーティング（Next.jsを完全に回避）
  let targetFile = null;
  urlPath = pathname;
  
  if (urlPath === '/' || urlPath === '/index.html') {
    // ルートアクセスは管理ダッシュボードに
    targetFile = 'admin-dashboard.html';
  } else if (urlPath === '/dashboard' || urlPath === '/dashboard.html') {
    targetFile = 'admin-dashboard.html';
  } else if (urlPath === '/admin' || urlPath === '/admin.html') {
    targetFile = 'admin-dashboard.html';
  } else if (urlPath === '/members' || urlPath === '/members.html') {
    targetFile = 'admin-members.html';
  } else if (urlPath === '/login' || urlPath === '/login.html') {
    targetFile = 'login.html';
  } else if (urlPath === '/auth.js') {
    targetFile = 'auth.js';
  } else if (urlPath === '/members.js') {
    targetFile = 'members.js';
  } else if (urlPath.startsWith('/admin-')) {
    // admin-で始まるファイルは直接提供
    targetFile = urlPath.substring(1);
  } else if (urlPath.startsWith('/test-')) {
    // test-で始まるファイルは直接提供
    targetFile = urlPath.substring(1);
  } else {
    // その他のファイルも直接提供を試行
    targetFile = urlPath.substring(1);
  }

  // NEO v2.1ファイルのパス（outフォルダ内のみ）
  const filePath = path.join(__dirname, 'out', targetFile);
  
  console.log(`🔍 Requested: ${urlPath} -> Target: ${targetFile} -> Path: ${filePath}`);
  
  // ファイル存在確認
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    
    // 404 Page - NEO v2.1スタイル
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
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
        </style>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center">
        <div class="text-center max-w-lg">
          <div class="gradient-bg text-white p-6 rounded-lg shadow-lg mb-8">
            <i class="fas fa-rocket text-4xl mb-4"></i>
            <h1 class="text-2xl font-bold">NEO Digital Platform v2.1</h1>
            <p class="text-sm opacity-90 mt-2">復元版 - Tag: 2025/09/08_ver2.1_NEOポータル</p>
          </div>
          
          <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
            <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
            <h2 class="text-3xl font-bold text-gray-800 mb-2">404</h2>
            <p class="text-gray-600 mb-6">ページが見つかりません</p>
            
            <div class="space-y-3">
              <h3 class="text-lg font-medium text-gray-700 mb-4">
                <i class="fas fa-sitemap mr-2 text-pink-600"></i>
                利用可能なページ
              </h3>
              
              <div class="grid gap-3">
                <a href="/" class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <span class="flex items-center">
                    <i class="fas fa-tachometer-alt text-pink-600 mr-3"></i>
                    管理ダッシュボード
                  </span>
                  <i class="fas fa-arrow-right text-gray-400"></i>
                </a>
                
                <a href="/admin-members.html" class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <span class="flex items-center">
                    <i class="fas fa-users text-pink-600 mr-3"></i>
                    会員一覧管理
                  </span>
                  <i class="fas fa-arrow-right text-gray-400"></i>
                </a>
                
                <a href="/login.html" class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <span class="flex items-center">
                    <i class="fas fa-sign-in-alt text-pink-600 mr-3"></i>
                    ログイン
                  </span>
                  <i class="fas fa-arrow-right text-gray-400"></i>
                </a>
              </div>
            </div>
          </div>
          
          <a href="/" class="inline-block px-8 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
            <i class="fas fa-home mr-2"></i>ダッシュボードに戻る
          </a>
          
          <p class="text-xs text-gray-500 mt-6">
            リクエスト: ${req.url}<br>
            ファイル: ${targetFile}
          </p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // ファイルが存在する場合は提供
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    console.log(`❌ Not a file: ${filePath}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not a file');
    return;
  }

  const ext = path.extname(filePath);
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    console.log(`✅ Serving: ${filePath} (${content.length} bytes, ${mimeType})`);
    
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Content-Length': content.length,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (error) {
    console.error(`❌ File read error: ${filePath}`, error);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>500 - Server Error</title></head>
      <body>
        <h1>500 - Internal Server Error</h1>
        <p>ファイルの読み込みに失敗しました: ${filePath}</p>
        <p>エラー: ${error.message}</p>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`
🚀 NEO Digital Platform v2.1 Server Started!
📍 URL: http://${HOST}:${PORT}
📁 Serving ONLY from: out/ directory (NEO v2.1 files)
⚠️  Next.js is COMPLETELY BYPASSED

🎯 Available Pages:
   / → admin-dashboard.html (管理ダッシュボード)
   /admin-members.html (会員一覧管理)  
   /login.html (ログイン)
   
🔧 File mapping:
   - Root (/) routes to admin-dashboard.html
   - All files served from out/ directory only
   - No Next.js, no dist/, no other directories
   
🔌 API Endpoints (新機能):
   - GET    /api/analytics/hero-steps-distribution
   - GET    /api/analytics/engagement-distribution
   - GET    /api/members (会員一覧)
   - POST   /api/members (新規作成)
   - PUT    /api/members/:id (会員情報更新)
   - DELETE /api/members/:id (会員削除)
   - PATCH  /api/members/:id/hero-step
   - PATCH  /api/members/:id/status

📊 NEO v2.1 Features:
   - 事務局ダッシュボード会員管理システム
   - KPI起点ナビゲーション
   - 包括的会員一覧ページ（検索・フィルタ・CSV出力）
   - リアルタイムKPI数値同期
   - ヒーローステップ・関与度ステータス管理（新機能）
  `);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Stopping other services...`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});