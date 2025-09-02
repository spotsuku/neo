const http = require('http');
const fs = require('fs');
const path = require('path');
const { ItemsAPI } = require('./api/items.js');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // CORS headers for GenSpark compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API routes
  if (req.url.startsWith('/api/items')) {
    handleItemsAPI(req, res);
    return;
  }
  
  // Handle Heroes Steps API routes
  if (req.url.startsWith('/api/heroes-steps')) {
    handleHeroesStepsAPI(req, res);
    return;
  }
  
  // Handle Admin Dashboard API routes
  if (req.url.startsWith('/api/admin')) {
    handleAdminDashboardAPI(req, res);
    return;
  }
  
  // Handle Export API routes
  if (req.url.startsWith('/api/export')) {
    handleExportAPI(req, res);
    return;
  }
  
  // Handle Health Check API
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString(), service: 'NEO Platform' }));
    return;
  }
  
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Route mappings for authentication pages
  if (filePath === '/auth') {
    filePath = '/auth.html';
  } else if (filePath === '/auth/login') {
    filePath = '/login.html';
  } else if (filePath === '/auth/signup') {
    filePath = '/signup.html';
  } else if (filePath === '/auth/password-reset') {
    filePath = '/password-reset.html';
  } else if (filePath === '/auth/password-reset/confirm') {
    filePath = '/password-reset-confirm.html';
  } else if (filePath === '/dashboard') {
    filePath = '/dashboard.html';
  } else if (filePath === '/company-dashboard') {
    filePath = '/company-dashboard.html';
  } else if (filePath === '/admin-dashboard') {
    filePath = '/admin-dashboard.html';
  } else if (filePath === '/admin/dashboard') {
    filePath = '/admin-dashboard.html';
  } else if (filePath === '/student/hero-progress' || filePath === '/student/hero-progress.html') {
    filePath = '/student/hero-progress.html';
  } else if (filePath === '/profile') {
    filePath = '/profile.html';
  } else if (filePath === '/announcements') {
    filePath = '/announcements.html';
  } else if (filePath.startsWith('/announcements/')) {
    filePath = '/announcement-detail.html';
  } else if (filePath === '/notices') {
    filePath = '/notices.html';
  } else if (filePath === '/notices/new') {
    filePath = '/notices-new.html';
  } else if (filePath.startsWith('/notices/') && !filePath.includes('/new')) {
    filePath = '/notice-detail.html';
  } else if (filePath === '/admin') {
    filePath = '/admin.html';
  } else if (filePath === '/admin/users') {
    filePath = '/admin/users.html';
  } else if (filePath === '/admin/settings') {
    filePath = '/admin/settings.html';
  } else if (filePath === '/admin/audit') {
    filePath = '/admin/audit.html';
  } else if (filePath === '/admin/monitoring') {
    filePath = '/admin/monitoring.html';
  } else if (filePath === '/admin/performance') {
    filePath = '/admin/performance.html';
  } else if (filePath === '/security-dashboard') {
    filePath = '/security-dashboard.html';
  } else if (filePath === '/error-test') {
    filePath = '/error-test.html';
  } else if (filePath === '/classes') {
    filePath = '/classes.html';
  } else if (filePath.startsWith('/classes/') && filePath.includes('/report')) {
    filePath = '/classes/report.html';
  } else if (filePath.startsWith('/classes/') && !filePath.includes('.html')) {
    filePath = '/classes/detail.html';
  } else if (filePath === '/projects') {
    filePath = '/projects.html';
  } else if (filePath === '/projects/new') {
    filePath = '/projects/new.html';
  } else if (filePath.startsWith('/projects/') && !filePath.includes('.html') && !filePath.includes('/new')) {
    filePath = '/projects/detail.html';
  } else if (filePath === '/committees') {
    filePath = '/committees.html';
  } else if (filePath.startsWith('/committees/') && !filePath.includes('.html')) {
    filePath = '/committees/detail.html';
  } else if (filePath === '/files') {
    filePath = '/files.html';
  } else if (filePath === '/files/upload') {
    filePath = '/files/upload.html';
  } else if (filePath.startsWith('/files/') && !filePath.includes('.html') && !filePath.includes('/upload')) {
    filePath = '/files/detail.html';
  } else if (filePath === '/events') {
    filePath = '/events.html';
  } else if (filePath.startsWith('/events/') && filePath.includes('/attendance')) {
    filePath = '/events/attendance.html';
  } else if (filePath.startsWith('/events/') && !filePath.includes('.html') && !filePath.includes('/attendance')) {
    filePath = '/events/detail.html';
  } else if (filePath === '/install') {
    filePath = '/install.html';
  } else if (filePath === '/offline') {
    filePath = '/offline.html';
  } else if (filePath === '/push-test') {
    filePath = '/push-test.html';
  }
  
  // Simple API endpoints for testing
  if (filePath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'NEO Digital Platform API',
      version: '1.0.0',
      status: 'active',
      timestamp: new Date().toISOString(),
      server: 'Simple HTTP Server'
    }));
    return;
  }
  
  if (filePath === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Simple server test successful',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Monitoring API endpoints
  if (filePath === '/api/monitoring/system') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
      status: 'healthy'
    }));
    return;
  }

  if (filePath === '/api/monitoring/performance') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      responseTime: Math.floor(Math.random() * 200) + 50,
      requestCount: Math.floor(Math.random() * 100) + 50,
      errorRate: (Math.random() * 2).toFixed(2),
      cacheHitRate: (75 + Math.random() * 20).toFixed(1),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (filePath === '/api/security/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      threatLevel: 'low',
      blockedThreats: Math.floor(Math.random() * 50) + 20,
      cspViolations: Math.floor(Math.random() * 10) + 2,
      rateLimitHits: Math.floor(Math.random() * 30) + 5,
      securityScore: 85 + Math.floor(Math.random() * 10),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Error test endpoints
  if (filePath === '/api/timeout-test') {
    // Simulate a slow endpoint that might timeout
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Slow response' }));
    }, 5000);
    return;
  }

  if (filePath === '/api/cause-server-error') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Simulated server error for testing',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Serve static files
  const publicPath = path.join(__dirname, 'out', filePath);
  
  fs.readFile(publicPath, (err, data) => {
    if (err) {
      // If file not found, serve a basic HTML response
      if (err.code === 'ENOENT') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEO Digital Platform - Simple Server</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-blue-50 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">🚀</h1>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">NEO Digital Platform</h2>
        <p class="text-gray-600 mb-6">Simple HTTP Server Running</p>
        <div class="bg-green-100 text-green-800 p-3 rounded-lg">
            ✅ Server Active<br>
            <small>Port 3000</small>
        </div>
        <div class="mt-4 space-y-2">
            <a href="/api/health" class="block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                API Health Check
            </a>
            <a href="/api/heroes-steps" class="block bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
                🏆 Heroes Steps API
            </a>
            <a href="/api/heroes-steps/analytics" class="block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                📊 Heroes KPI Analytics
            </a>
            <a href="/test.html" class="block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                Test Page
            </a>
        </div>
    </div>
    <script>
        console.log('🚀 NEO Digital Platform - Simple Server Active');
        console.log('📅 Loaded at:', new Date().toLocaleString('ja-JP'));
    </script>
</body>
</html>
        `);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }
    
    // Determine content type
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    
    switch (ext) {
      case '.html':
        contentType = 'text/html';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'application/javascript';
        break;
      case '.json':
        contentType = 'application/json';
        break;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// API Handlers

// Items API Handler (mock implementation)
function handleItemsAPI(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'success', 
    message: 'Items API endpoint', 
    data: [] 
  }));
}

// Heroes Steps API Handler
function handleHeroesStepsAPI(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Mock data for heroes steps
  const mockHeroesSteps = [
    {
      user_id: 'test-student-1',
      current_step: 3,
      step_name: '3次：リーダーシップ',
      progress_percentage: 60,
      company_id: 'test-company-alpha',
      updated_at: '2025-09-02T02:00:00Z'
    },
    {
      user_id: 'test-student-2', 
      current_step: 2,
      step_name: '2次：アマチュア',
      progress_percentage: 40,
      company_id: 'test-company-beta',
      updated_at: '2025-09-02T01:30:00Z'
    }
  ];

  const mockAnalytics = {
    kpi_data: [
      {
        kpi_name: '3次以上到達率',
        target_percentage: 85.0,
        actual_percentage: 82.5,
        status: 'warning',
        alert_triggered: true
      },
      {
        kpi_name: '4次到達率', 
        target_percentage: 20.0,
        actual_percentage: 25.0,
        status: 'success',
        alert_triggered: false
      },
      {
        kpi_name: '5次到達率',
        target_percentage: 5.0,
        actual_percentage: 10.0,
        status: 'success', 
        alert_triggered: false
      }
    ],
    total_users: 20,
    distribution: mockHeroesSteps
  };

  try {
    if (pathname === '/api/heroes-steps' && req.method === 'GET') {
      // Get all heroes steps
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: mockHeroesSteps,
        total: mockHeroesSteps.length
      }));
      
    } else if (pathname === '/api/heroes-steps/analytics' && req.method === 'GET') {
      // Get analytics data
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: mockAnalytics
      }));
      
    } else if (pathname === '/api/heroes-steps/stream' && req.method === 'GET') {
      // Server-Sent Events endpoint
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      res.write('data: {"type": "connected", "message": "Heroes Steps SSE Connected"}\n\n');
      
      // Keep connection alive
      const heartbeat = setInterval(() => {
        res.write('data: {"type": "heartbeat", "timestamp": "' + new Date().toISOString() + '"}\n\n');
      }, 30000);
      
      req.on('close', () => {
        clearInterval(heartbeat);
      });
      
    } else if (pathname === '/api/heroes-steps/current-user' && req.method === 'GET') {
      // Get current user's hero step (for dashboard)
      const currentUserStep = mockHeroesSteps[0]; // Assume first user is current user
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          ...currentUserStep,
          next_step: '4次：エキスパート',
          next_requirements: 'プロジェクトリーダー経験 + 企業評価4.0以上',
          attendance_rate: 92,
          badges: [
            { name: '出席王', icon: 'fas fa-calendar-check', color: 'gold' },
            { name: 'チーム貢献', icon: 'fas fa-users', color: 'blue' },
            { name: 'アイデア王', icon: 'fas fa-lightbulb', color: 'purple' }
          ]
        }
      }));
      
    } else if (pathname.match(/^\/api\/heroes-steps\/(.+)$/) && req.method === 'GET') {
      // Get specific user hero step (must be last to avoid matching analytics/stream/current-user)
      const userId = pathname.split('/')[3];
      const userStep = mockHeroesSteps.find(step => step.user_id === userId);
      
      if (userStep) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: userStep
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'User not found'
        }));
      }
      
    } else {
      // Method not allowed or endpoint not found
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }));
    }
    
  } catch (error) {
    console.error('Heroes Steps API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }));
  }
}

// Admin Dashboard API Handler
function handleAdminDashboardAPI(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  console.log(`🔐 Admin API: ${req.method} ${pathname}`);
  
  // Mock data for admin dashboard
  const mockKPIData = {
    totalMembers: 247,
    studentCount: 203,
    companyCount: 28,
    youthCount: 12,
    corporateCount: 4,
    npsScore: 68,
    certifiedProjects: 18,
    heroCertificationRate: 8.2,
    atRiskCount: 7,
    slackWAU: 142,
    slackActions: 1247
  };

  const mockSlackData = {
    weeklyActiveUsers: 142,
    weeklyActions: 1247,
    engagementRate: 78.5,
    channelActivity: [
      { channel: 'general', messages: 234, participants: 89 },
      { channel: 'hero-steps', messages: 156, participants: 45 },
      { channel: 'project-dev', messages: 89, participants: 23 }
    ]
  };

  const mockConsultationData = {
    new: [
      { id: 'new-1', type: 'キャリア相談', student: '田中太郎', assignee: null, created: '2時間前' },
      { id: 'new-2', type: '技術相談', student: '佐藤花子', assignee: null, created: '5時間前' },
      { id: 'new-3', type: 'プロジェクト相談', student: '山田次郎', assignee: null, created: '1日前' }
    ],
    inProgress: [
      { id: 'progress-1', type: '企業紹介依頼', student: '高橋美咲', assignee: '山田事務局員', duration: '2日' },
      { id: 'progress-2', type: 'イベント企画', student: '渡辺由美', assignee: '佐藤事務局員', duration: '1日' }
    ],
    completed: [
      { id: 'completed-1', type: '資格取得相談', student: '中村雄大', assignee: '鈴木事務局員', duration: '5日' },
      { id: 'completed-2', type: '学習計画作成', student: '小林直美', assignee: '山田事務局員', duration: '3日' }
    ]
  };

  try {
    if (pathname === '/api/admin/kpi' && req.method === 'GET') {
      // KPI データの取得
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: mockKPIData
      }));
      
    } else if (pathname === '/api/admin/slack' && req.method === 'GET') {
      // Slack データの取得
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: mockSlackData
      }));
      
    } else if (pathname === '/api/admin/consultations' && req.method === 'GET') {
      // 相談データの取得
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: mockConsultationData
      }));
      
    } else if (pathname === '/api/admin/consultation/status' && req.method === 'POST') {
      // 相談ステータス更新
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { consultationId, newStatus } = JSON.parse(body);
          console.log(`📋 相談ステータス更新: ${consultationId} → ${newStatus}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: '相談ステータスが更新されました'
          }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid request body'
          }));
        }
      });
      
    } else if (pathname === '/api/admin/hero/approve' && req.method === 'POST') {
      // ヒーロー承認
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { heroId, action } = JSON.parse(body);
          console.log(`🏆 ヒーロー${action}: ${heroId}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `ヒーローが${action === 'approve' ? '承認' : '差し戻し'}されました`
          }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid request body'
          }));
        }
      });
      
    } else if (pathname === '/api/admin/system-status' && req.method === 'GET') {
      // システム状況の取得
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          apiUptime: 99.8,
          avgResponse: 125,
          errorCount: 3,
          securityScore: 85,
          alerts: [
            { type: 'error', message: 'バックアップ失敗', detail: '日次バックアップでエラーが発生しました', time: '2時間前' },
            { type: 'warning', message: 'CSP違反検出', detail: '外部スクリプトの読み込み試行を検出', time: '4時間前' },
            { type: 'info', message: 'Rate Limit到達', detail: 'API呼び出し制限に達しました (IP: 192.168.1.100)', time: '6時間前' }
          ]
        }
      }));
      
    } else {
      // 存在しないエンドポイント
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Admin API endpoint not found'
      }));
    }
    
  } catch (error) {
    console.error('Admin Dashboard API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }));
  }
}

// Export API Handler
function handleExportAPI(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  console.log(`📊 Export API: ${req.method} ${pathname}`);
  
  try {
    if (pathname === '/api/export/csv' && req.method === 'POST') {
      // CSV エクスポート
      const csvData = generateMockCSV();
      
      res.writeHead(200, { 
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="neo-dashboard-data.csv"'
      });
      res.end(csvData);
      
    } else if (pathname === '/api/export/pdf' && req.method === 'POST') {
      // PDF エクスポート（理事会用）
      const pdfData = generateMockPDFInfo();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'PDFレポートの生成を開始しました。完了後にダウンロードリンクをお送りします。',
        data: pdfData
      }));
      
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Export endpoint not found'
      }));
    }
    
  } catch (error) {
    console.error('Export API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Export failed'
    }));
  }
}

// Mock CSV data generation
function generateMockCSV() {
  const headers = [
    '日付', '総会員数', '学生数', '企業数', 'NPS', '公認プロジェクト数', 
    'ヒーロー認定率', '離脱予備軍数', 'Slack WAU', 'Slack週次アクション数'
  ];
  
  const rows = [
    ['2025-09-02', '247', '203', '28', '68', '18', '8.2%', '7', '142', '1247'],
    ['2025-09-01', '245', '201', '28', '67', '17', '8.0%', '8', '138', '1203'],
    ['2025-08-31', '244', '200', '27', '66', '17', '7.8%', '9', '135', '1189'],
  ];
  
  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  return csv;
}

// Mock PDF info generation
function generateMockPDFInfo() {
  return {
    filename: 'neo-dashboard-report-202509.pdf',
    pages: 12,
    sections: [
      'エグゼクティブサマリー',
      'KPI達成状況',
      'ヒーローズプログラム進捗',
      'コミュニティ健康度',
      '授業・イベント運営状況',
      '課題と改善提案'
    ],
    generatedAt: new Date().toISOString()
  };
}

const PORT = 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 NEO Digital Platform Simple Server running on http://${HOST}:${PORT}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('ja-JP')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});