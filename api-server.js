const http = require('http');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const PORT = process.env.PORT || 8001;
const HOST = '0.0.0.0';

console.log('🚀 API専用サーバー(ポート7001)起動中...');
console.log('🔧 v2.3機能: 相談・アンケートAPI、レート制限、監査ログ');

// レート制限設定
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.connection.remoteAddress,
  points: 3, // 3回のリクエスト
  duration: 60, // 1分間
});

// 基本レスポンス用データ
const analyticsData = {
  'engagement-distribution': {
    total: 247,
    buckets: [
      { status: 'highly_engaged', count: 78, percentage: 31.6 },
      { status: 'moderately_engaged', count: 102, percentage: 41.3 },
      { status: 'low_engaged', count: 59, percentage: 23.9 },
      { status: 'at_risk', count: 8, percentage: 3.2 }
    ],
    ratio: {
      active: 180,
      inactive: 67
    }
  },
  'hero-steps-distribution': [
    { step: 0, count: 98, percentage: 39.7 },
    { step: 1, count: 76, percentage: 30.8 },
    { step: 2, count: 41, percentage: 16.6 },
    { step: 3, count: 19, percentage: 7.7 },
    { step: 4, count: 9, percentage: 3.6 },
    { step: 5, count: 4, percentage: 1.6 }
  ]
};

const membersData = [
  { id: 1, name: '田中太郎', email: 'tanaka@example.com', status: 'active', role: 'student', engagement: 'high' },
  { id: 2, name: '佐藤花子', email: 'sato@example.com', status: 'active', role: 'student', engagement: 'moderate' },
  { id: 3, name: '鈴木一郎', email: 'suzuki@example.com', status: 'active', role: 'corporate', engagement: 'high' },
  { id: 4, name: '高橋美咲', email: 'takahashi@example.com', status: 'pending', role: 'student', engagement: 'low' },
  { id: 5, name: '伊藤健太', email: 'ito@example.com', status: 'active', role: 'youth', engagement: 'high' },
  { id: 6, name: '渡辺真理', email: 'watanabe@example.com', status: 'active', role: 'corporate_select', engagement: 'moderate' },
  { id: 7, name: '山田次郎', email: 'yamada@example.com', status: 'inactive', role: 'student', engagement: 'at_risk' },
  { id: 8, name: '中村愛', email: 'nakamura@example.com', status: 'active', role: 'student', engagement: 'moderate' }
];

const consultationsData = [
  { id: 1, title: 'プロジェクト進行相談', member_id: 1, status: 'open', created_at: '2024-01-15T10:00:00Z' },
  { id: 2, title: 'キャリア相談', member_id: 2, status: 'resolved', created_at: '2024-01-10T14:30:00Z' }
];

const surveysData = [
  { id: 1, title: 'プログラム満足度調査', status: 'active', responses: 124, created_at: '2024-01-01T09:00:00Z' },
  { id: 2, title: '今後の要望アンケート', status: 'draft', responses: 0, created_at: '2024-01-20T11:00:00Z' }
];

// ユーティリティ関数
function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Role'
  });
  res.end(JSON.stringify(data));
}

async function handleRateLimit(req, res) {
  try {
    await rateLimiter.consume(req.connection.remoteAddress);
    return true;
  } catch (rejRes) {
    sendJSON(res, { 
      error: 'Rate limit exceeded',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) 
    }, 429);
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const pathname = url.split('?')[0];

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Role'
    });
    res.end();
    return;
  }

  // POST操作のレート制限
  if (method === 'POST' && !(await handleRateLimit(req, res))) {
    return;
  }

  try {
    // ===== 認証API =====
    if (pathname.startsWith('/api/auth/')) {
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJSON(req);
        // 簡易認証（既存HTMLと互換）
        sendJSON(res, { 
          ok: true, 
          user: { id: 'admin-user', role: 'admin', name: '事務局' },
          token: 'mock-jwt-token'
        });
      } else if (pathname === '/api/auth/me' && method === 'GET') {
        sendJSON(res, { 
          user: { id: 'admin-user', role: 'admin', name: '事務局' } 
        });
      } else if (pathname === '/api/auth/logout' && method === 'POST') {
        sendJSON(res, { ok: true });
      } else {
        sendJSON(res, { error: 'Auth endpoint not found' }, 404);
      }
    }

    // ===== 分析API =====
    else if (pathname.startsWith('/api/analytics/')) {
      const endpoint = pathname.replace('/api/analytics/', '');
      if (analyticsData[endpoint]) {
        sendJSON(res, analyticsData[endpoint]);
      } else {
        sendJSON(res, { error: 'Analytics endpoint not found' }, 404);
      }
    }

    // ===== メンバーAPI =====
    else if (pathname.startsWith('/api/members')) {
      if (method === 'GET') {
        sendJSON(res, { members: membersData, total: membersData.length });
      } else if (method === 'POST') {
        const body = await parseJSON(req);
        const newMember = { 
          id: membersData.length + 1, 
          ...body, 
          created_at: new Date().toISOString() 
        };
        membersData.push(newMember);
        sendJSON(res, newMember, 201);
      } else {
        sendJSON(res, { error: 'Method not allowed' }, 405);
      }
    }

    // ===== 相談API =====
    else if (pathname.startsWith('/api/consultations')) {
      if (method === 'GET') {
        sendJSON(res, { consultations: consultationsData, total: consultationsData.length });
      } else if (method === 'POST') {
        const body = await parseJSON(req);
        const newConsultation = { 
          id: consultationsData.length + 1, 
          ...body,
          status: 'open',
          created_at: new Date().toISOString() 
        };
        consultationsData.push(newConsultation);
        sendJSON(res, newConsultation, 201);
      } else {
        sendJSON(res, { error: 'Method not allowed' }, 405);
      }
    }

    // ===== アンケートAPI =====
    else if (pathname.startsWith('/api/surveys')) {
      if (method === 'GET') {
        sendJSON(res, { surveys: surveysData, total: surveysData.length });
      } else if (method === 'POST') {
        const body = await parseJSON(req);
        const newSurvey = { 
          id: surveysData.length + 1, 
          ...body,
          status: 'draft',
          responses: 0,
          created_at: new Date().toISOString() 
        };
        surveysData.push(newSurvey);
        sendJSON(res, newSurvey, 201);
      } else {
        sendJSON(res, { error: 'Method not allowed' }, 405);
      }
    }

    // ===== ヘルスチェック =====
    else if (pathname === '/api/health') {
      sendJSON(res, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'neo-api-v2.3',
        recordCounts: {
          members: membersData.length,
          consultations: consultationsData.length,
          surveys: surveysData.length
        }
      });
    }

    // ===== その他のエンドポイント（モック） =====
    else if (pathname.startsWith('/api/')) {
      sendJSON(res, { 
        error: 'API endpoint not implemented',
        endpoint: pathname,
        available: [
          '/api/auth/login',
          '/api/auth/me', 
          '/api/auth/logout',
          '/api/analytics/engagement-distribution',
          '/api/analytics/hero-steps-distribution',
          '/api/members',
          '/api/consultations',
          '/api/surveys',
          '/api/health'
        ]
      }, 404);
    }

    else {
      sendJSON(res, { error: 'Not Found' }, 404);
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    sendJSON(res, { error: 'Internal Server Error', message: error.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`✅ API専用サーバー起動完了: http://${HOST}:${PORT}`);
  console.log('🔗 ヘルスチェック: http://localhost:7001/api/health');
  console.log('📊 分析API: http://localhost:7001/api/analytics/engagement-distribution');
  console.log('👥 メンバーAPI: http://localhost:7001/api/members');
});

// エラーハンドリング
server.on('error', (err) => {
  console.error('❌ API専用サーバーエラー:', err);
  process.exit(1);
});