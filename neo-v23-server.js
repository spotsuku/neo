const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0';

// NEO v2.3専用サーバー - 実運用データ収集・安定化準備版
console.log('🎯 NEO Digital Platform v2.3 専用サーバー起動中...');
console.log('🔧 v2.3新機能: 相談・アンケートAPI、新規API群DB専用化、運用性強化');

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

// v2.3: DB統合機能強化（フォールバック削減対応）
let globalMembersData = null;
let dbIntegrationEnabled = false;

// v2.3: レート制限機能
const rateLimitStore = new Map(); // userIP -> { count, resetTime }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REQUESTS = 3; // 相談・アンケートPOST制限

// DB統合機能（wrangler経由）
async function executeDBQuery(query) {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const command = `cd /home/user/webapp && npx wrangler d1 execute neo-portal-production --local --command="${query.replace(/"/g, '\\"')}"`;
    const { stdout, stderr } = await execPromise(command, { timeout: 10000 });
    
    if (stderr && stderr.includes('ERROR')) {
      throw new Error(stderr);
    }
    
    // wrangler出力からJSON部分のみを抽出
    const lines = stdout.split('\\n');
    let jsonStartIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('[') || lines[i].trim().startsWith('{')) {
        jsonStartIndex = i;
        break;
      }
    }
    
    if (jsonStartIndex === -1) {
      return [];
    }
    
    const jsonLines = lines.slice(jsonStartIndex);
    const jsonText = jsonLines.join('\\n');
    
    try {
      return JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('⚠️  JSON parse warning:', parseError.message);
      return [];
    }
  } catch (error) {
    console.error('❌ DB Query Error:', error.message);
    throw error;
  }
}

// v2.3: 監査ログ記録強化
async function logAuditEvent(action, userId, targetType, targetId, oldValue, newValue, userRole) {
  try {
    const auditQuery = `
      INSERT INTO audit_logs (action, user_id, target_type, target_id, old_value, new_value, user_role, created_at)
      VALUES ('${action}', '${userId}', '${targetType}', '${targetId}', 
              '${JSON.stringify(oldValue).replace(/'/g, "''")}', 
              '${JSON.stringify(newValue).replace(/'/g, "''")}', 
              '${userRole}', datetime('now'))
    `;
    await executeDBQuery(auditQuery);
    console.log(`📋 Audit logged: ${action} by ${userRole} on ${targetType}:${targetId}`);
  } catch (error) {
    console.error('❌ Audit log error:', error.message);
  }
}

// v2.3: レート制限チェック
function checkRateLimit(clientIP, endpoint) {
  if (!endpoint.includes('consultations') && !endpoint.includes('surveys')) {
    return true; // 相談・アンケート以外は制限なし
  }

  const now = Date.now();
  const key = `${clientIP}:${endpoint}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  const record = rateLimitStore.get(key);
  
  if (now > record.resetTime) {
    // リセット時間を過ぎた場合、カウントをリセット
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // 制限に達した
  }
  
  record.count++;
  return true;
}

// v2.3 DB初期化チェック
async function initializeDatabase() {
  try {
    console.log('🔄 Checking database connection...');
    await executeDBQuery('SELECT 1');
    dbIntegrationEnabled = true;
    console.log('✅ Database connection established');
    
    // 基本テーブル存在確認
    const tables = await executeDBQuery("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    
    if (tableNames.includes('users') && tableNames.includes('consultations') && tableNames.includes('surveys')) {
      console.log('✅ Required tables found:', tableNames.length);
    } else {
      console.log('⚠️  Some tables missing, but continuing...');
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('🔄 Fallback mode for members/analytics APIs only');
    dbIntegrationEnabled = false;
  }
}

// API処理関数（v2.3強化版）
async function handleAPIRequest(req, res, pathname, query) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  console.log(`🔌 API Request: ${req.method} ${pathname}`);

  // RBAC認証チェック
  const userRole = req.headers['x-user-role'] || 'admin'; // デバッグモードでは常にadmin
  const clientIP = req.connection.remoteAddress || '127.0.0.1';
  
  // v2.3: レート制限チェック（POSTメソッドのみ）
  if (req.method === 'POST' && !checkRateLimit(clientIP, pathname)) {
    res.writeHead(429);
    res.end(JSON.stringify({ 
      error: 'Rate limit exceeded', 
      message: 'Maximum 3 requests per minute for consultation/survey submissions'
    }));
    return;
  }

  // === v2.3: 新規API群 - DB専用稼働（フォールバック削除） ===
  
  if (req.method === 'GET' && pathname === '/api/lectures') {
    // RBAC: 全ユーザー（admin|editor|staff|user）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    try {
      // v2.3: フォールバック削除 - DB専用
      if (!dbIntegrationEnabled) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database service unavailable' }));
        return;
      }
      
      const lectures = await executeDBQuery('SELECT * FROM lectures WHERE status = "active" ORDER BY created_at DESC');
      res.writeHead(200);
      res.end(JSON.stringify(lectures)); // 配列形式で返却
      console.log(`✅ Lectures sent: ${lectures.length} items (DB-only)`);
    } catch (error) {
      console.error('❌ Lectures API error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }
  
  if (req.method === 'GET' && pathname === '/api/schedules') {
    // RBAC: 全ユーザー（admin|editor|staff|user）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    try {
      // v2.3: フォールバック削除 - DB専用
      if (!dbIntegrationEnabled) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database service unavailable' }));
        return;
      }
      
      const schedules = await executeDBQuery('SELECT * FROM schedules WHERE status = "scheduled" ORDER BY start_at ASC');
      res.writeHead(200);
      res.end(JSON.stringify(schedules)); // 配列形式で返却
      console.log(`✅ Schedules sent: ${schedules.length} items (DB-only)`);
    } catch (error) {
      console.error('❌ Schedules API error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }
  
  if (req.method === 'GET' && pathname === '/api/announcements') {
    // RBAC: 全ユーザー（admin|editor|staff|user）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    try {
      // v2.3: フォールバック削除 - DB専用
      if (!dbIntegrationEnabled) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database service unavailable' }));
        return;
      }
      
      const announcements = await executeDBQuery('SELECT * FROM announcements ORDER BY published_at DESC');
      res.writeHead(200);
      res.end(JSON.stringify(announcements)); // 配列形式で返却
      console.log(`✅ Announcements sent: ${announcements.length} items (DB-only)`);
    } catch (error) {
      console.error('❌ Announcements API error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }
  
  if (req.method === 'GET' && pathname === '/api/events') {
    // RBAC: 全ユーザー（admin|editor|staff|user）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    try {
      // v2.3: フォールバック削除 - DB専用
      if (!dbIntegrationEnabled) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database service unavailable' }));
        return;
      }
      
      const events = await executeDBQuery('SELECT * FROM events WHERE status = "upcoming" ORDER BY start_at ASC');
      res.writeHead(200);
      res.end(JSON.stringify(events)); // 配列形式で返却
      console.log(`✅ Events sent: ${events.length} items (DB-only)`);
    } catch (error) {
      console.error('❌ Events API error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }

  // === v2.3: 相談管理API ===
  
  if (req.method === 'GET' && pathname === '/api/consultations') {
    // RBAC: admin|editor|staff|user（全ユーザー参照可能）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    try {
      let consultationsQuery = 'SELECT * FROM consultations ORDER BY created_at DESC';
      
      // クエリパラメータによるフィルタリング
      const whereConditions = [];
      
      if (query.type) {
        whereConditions.push(`type = '${query.type}'`);
      }
      if (query.assigned_to) {
        whereConditions.push(`assigned_to = '${query.assigned_to}'`);
      }
      if (query.status) {
        whereConditions.push(`status = '${query.status}'`);
      }
      
      if (whereConditions.length > 0) {
        consultationsQuery = `SELECT * FROM consultations WHERE ${whereConditions.join(' AND ')} ORDER BY created_at DESC`;
      }
      
      const consultations = await executeDBQuery(consultationsQuery);
      res.writeHead(200);
      res.end(JSON.stringify({ consultations }));
      console.log(`✅ Consultations sent: ${consultations.length} items`);
    } catch (error) {
      console.error('❌ Consultations GET error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }
  
  if (req.method === 'POST' && pathname === '/api/consultations') {
    // RBAC: 全ユーザー（学生・企業から送信）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { type, subject, content, requester_name, requester_email, requester_affiliation } = data;
        
        // 必須フィールドチェック
        if (!type || !subject || !content || !requester_name || !requester_email) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }
        
        const consultationId = `consultation_${Date.now()}`;
        const insertQuery = `
          INSERT INTO consultations 
          (id, type, subject, content, requester_name, requester_email, requester_affiliation, status, created_at)
          VALUES 
          ('${consultationId}', '${type}', '${subject}', '${content.replace(/'/g, "''")}', 
           '${requester_name}', '${requester_email}', '${requester_affiliation || ''}', 
           'submitted', datetime('now'))
        `;
        
        await executeDBQuery(insertQuery);
        
        // 監査ログ記録
        await logAuditEvent('create', requester_email, 'consultation', consultationId, null, data, userRole);
        
        res.writeHead(201);
        res.end(JSON.stringify({ 
          success: true, 
          id: consultationId,
          message: '相談を受け付けました。担当者からの連絡をお待ちください。'
        }));
        console.log(`✅ Consultation created: ${consultationId} by ${requester_name}`);
      } catch (error) {
        console.error('❌ Consultation POST error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to create consultation' }));
      }
    });
    return;
  }
  
  if (req.method === 'PATCH' && pathname.startsWith('/api/consultations/')) {
    // RBAC: admin|editor|staff のみ（事務局による状態更新）
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'admin, editor, or staff role required for consultation updates'
      }));
      return;
    }
    
    const consultationId = pathname.split('/')[3];
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { status, assigned_to, response_content, priority } = data;
        
        // 現在の値を取得
        const current = await executeDBQuery(`SELECT * FROM consultations WHERE id = '${consultationId}'`);
        if (current.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Consultation not found' }));
          return;
        }
        
        const updates = [];
        if (status) updates.push(`status = '${status}'`);
        if (assigned_to) updates.push(`assigned_to = '${assigned_to}'`);
        if (response_content) updates.push(`response_content = '${response_content.replace(/'/g, "''")}'`);
        if (priority) updates.push(`priority = '${priority}'`);
        updates.push(`updated_at = datetime('now')`);
        
        const updateQuery = `UPDATE consultations SET ${updates.join(', ')} WHERE id = '${consultationId}'`;
        await executeDBQuery(updateQuery);
        
        // 監査ログ記録
        await logAuditEvent('update', 'system', 'consultation', consultationId, current[0], data, userRole);
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          success: true,
          message: 'Consultation updated successfully'
        }));
        console.log(`✅ Consultation updated: ${consultationId} by ${userRole}`);
      } catch (error) {
        console.error('❌ Consultation PATCH error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to update consultation' }));
      }
    });
    return;
  }

  // === v2.3: アンケート管理API ===
  
  if (req.method === 'GET' && pathname === '/api/surveys') {
    // RBAC: 全ユーザー（公開済みアンケート一覧）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    try {
      const surveys = await executeDBQuery(`
        SELECT s.*, COUNT(sr.id) as response_count 
        FROM surveys s 
        LEFT JOIN survey_responses sr ON s.id = sr.survey_id 
        WHERE s.status = 'published' 
        GROUP BY s.id 
        ORDER BY s.created_at DESC
      `);
      res.writeHead(200);
      res.end(JSON.stringify({ surveys }));
      console.log(`✅ Surveys sent: ${surveys.length} items`);
    } catch (error) {
      console.error('❌ Surveys GET error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }
  
  if (req.method === 'POST' && pathname === '/api/surveys') {
    // RBAC: admin|editor のみ（アンケート作成）
    if (!['admin', 'editor'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'admin or editor role required for survey creation'
      }));
      return;
    }
    
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { title, description, questions, target_audience, expires_at } = data;
        
        // 必須フィールドチェック
        if (!title || !description || !questions) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }
        
        const surveyId = `survey_${Date.now()}`;
        const insertQuery = `
          INSERT INTO surveys 
          (id, title, description, questions, target_audience, expires_at, status, created_at)
          VALUES 
          ('${surveyId}', '${title}', '${description}', '${JSON.stringify(questions)}', 
           '${target_audience || 'all'}', '${expires_at || ''}', 'published', datetime('now'))
        `;
        
        await executeDBQuery(insertQuery);
        
        // 監査ログ記録
        await logAuditEvent('create', 'system', 'survey', surveyId, null, data, userRole);
        
        res.writeHead(201);
        res.end(JSON.stringify({ 
          success: true, 
          id: surveyId,
          message: 'アンケートを作成しました'
        }));
        console.log(`✅ Survey created: ${surveyId} by ${userRole}`);
      } catch (error) {
        console.error('❌ Survey POST error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to create survey' }));
      }
    });
    return;
  }
  
  if (req.method === 'POST' && pathname.match(/^\/api\/surveys\/[^/]+\/responses$/)) {
    // RBAC: 全ユーザー（回答送信）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }
    
    const surveyId = pathname.split('/')[3];
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { responses, respondent_name, respondent_email, respondent_affiliation } = data;
        
        // 必須フィールドチェック
        if (!responses || !respondent_email) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }
        
        // アンケート存在確認
        const survey = await executeDBQuery(`SELECT * FROM surveys WHERE id = '${surveyId}' AND status = 'published'`);
        if (survey.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Survey not found or not available' }));
          return;
        }
        
        const responseId = `response_${Date.now()}`;
        const insertQuery = `
          INSERT INTO survey_responses 
          (id, survey_id, responses, respondent_name, respondent_email, respondent_affiliation, created_at)
          VALUES 
          ('${responseId}', '${surveyId}', '${JSON.stringify(responses)}', 
           '${respondent_name || ''}', '${respondent_email}', '${respondent_affiliation || ''}', datetime('now'))
        `;
        
        await executeDBQuery(insertQuery);
        
        // 監査ログ記録
        await logAuditEvent('create', respondent_email, 'survey_response', responseId, null, data, userRole);
        
        res.writeHead(201);
        res.end(JSON.stringify({ 
          success: true, 
          id: responseId,
          message: 'アンケート回答を受け付けました'
        }));
        console.log(`✅ Survey response created: ${responseId} for survey ${surveyId}`);
      } catch (error) {
        console.error('❌ Survey response POST error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to submit response' }));
      }
    });
    return;
  }
  
  if (req.method === 'GET' && pathname.match(/^\/api\/surveys\/[^/]+\/results$/)) {
    // RBAC: admin|staff のみ（集計結果取得）
    if (!['admin', 'staff'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'admin or staff role required for survey results'
      }));
      return;
    }
    
    const surveyId = pathname.split('/')[3];
    
    try {
      // アンケート基本情報
      const survey = await executeDBQuery(`SELECT * FROM surveys WHERE id = '${surveyId}'`);
      if (survey.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Survey not found' }));
        return;
      }
      
      // 回答データ
      const responses = await executeDBQuery(`SELECT * FROM survey_responses WHERE survey_id = '${surveyId}'`);
      
      // 簡単な集計
      const totalResponses = responses.length;
      const responseRate = totalResponses > 0 ? 100 : 0; // 実際の計算は対象者数が必要
      
      res.writeHead(200);
      res.end(JSON.stringify({
        survey: survey[0],
        totalResponses,
        responseRate,
        responses: responses,
        generatedAt: new Date().toISOString()
      }));
      console.log(`✅ Survey results sent for: ${surveyId} (${totalResponses} responses)`);
    } catch (error) {
      console.error('❌ Survey results GET error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }

  // === v2.3: ダッシュボード分析API強化 ===
  
  if (req.method === 'GET' && pathname === '/api/analytics/consultation-kpis') {
    // RBAC: admin|editor|staff のみ
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'admin, editor, or staff role required for consultation KPIs'
      }));
      return;
    }
    
    try {
      // 相談系KPI計算
      const totalConsultations = await executeDBQuery('SELECT COUNT(*) as count FROM consultations');
      const pendingConsultations = await executeDBQuery('SELECT COUNT(*) as count FROM consultations WHERE status = "submitted"');
      const resolvedConsultations = await executeDBQuery('SELECT COUNT(*) as count FROM consultations WHERE status = "resolved"');
      
      // 平均対応日数（簡易版）
      const avgResponseTime = await executeDBQuery(`
        SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days 
        FROM consultations 
        WHERE status = 'resolved'
      `);
      
      const kpis = {
        totalConsultations: totalConsultations[0].count,
        pendingConsultations: pendingConsultations[0].count,
        resolvedConsultations: resolvedConsultations[0].count,
        resolutionRate: totalConsultations[0].count > 0 
          ? (resolvedConsultations[0].count / totalConsultations[0].count * 100).toFixed(1) 
          : 0,
        avgResponseDays: avgResponseTime[0].avg_days ? parseFloat(avgResponseTime[0].avg_days).toFixed(1) : 0,
        updatedAt: new Date().toISOString()
      };
      
      // 60秒キャッシュ
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.writeHead(200);
      res.end(JSON.stringify(kpis));
      console.log(`✅ Consultation KPIs sent: ${kpis.totalConsultations} total`);
    } catch (error) {
      console.error('❌ Consultation KPIs error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }
  
  if (req.method === 'GET' && pathname === '/api/analytics/survey-kpis') {
    // RBAC: admin|editor|staff のみ
    if (!['admin', 'editor', 'staff'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'admin, editor, or staff role required for survey KPIs'
      }));
      return;
    }
    
    try {
      // アンケート系KPI計算
      const totalSurveys = await executeDBQuery('SELECT COUNT(*) as count FROM surveys WHERE status = "published"');
      const totalResponses = await executeDBQuery('SELECT COUNT(*) as count FROM survey_responses');
      
      // 満足度スコア（簡易版 - 実際は質問内容に依存）
      const avgSatisfaction = await executeDBQuery(`
        SELECT AVG(CAST(json_extract(responses, '$.satisfaction') AS REAL)) as avg_score
        FROM survey_responses 
        WHERE json_extract(responses, '$.satisfaction') IS NOT NULL
      `);
      
      const kpis = {
        totalSurveys: totalSurveys[0].count,
        totalResponses: totalResponses[0].count,
        avgResponsesPerSurvey: totalSurveys[0].count > 0 
          ? (totalResponses[0].count / totalSurveys[0].count).toFixed(1) 
          : 0,
        avgSatisfactionScore: avgSatisfaction[0].avg_score ? parseFloat(avgSatisfaction[0].avg_score).toFixed(1) : 0,
        updatedAt: new Date().toISOString()
      };
      
      // 60秒キャッシュ
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.writeHead(200);
      res.end(JSON.stringify(kpis));
      console.log(`✅ Survey KPIs sent: ${kpis.totalSurveys} surveys, ${kpis.totalResponses} responses`);
    } catch (error) {
      console.error('❌ Survey KPIs error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database service unavailable' }));
    }
    return;
  }

  // === v2.3: 運用性強化 - ヘルスチェック拡張 ===
  
  if (req.method === 'GET' && pathname === '/api/health') {
    try {
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.3',
        services: {
          database: {
            status: dbIntegrationEnabled ? 'connected' : 'fallback',
            type: 'D1 Local'
          },
          fallback: {
            status: globalMembersData ? 'available' : 'unavailable',
            records: globalMembersData ? globalMembersData.length : 0
          }
        },
        endpoints: {
          members: 'operational',
          analytics: 'operational', 
          lectures: 'operational',
          schedules: 'operational',
          announcements: 'operational',
          events: 'operational',
          consultations: 'operational',  // v2.3新規
          surveys: 'operational'         // v2.3新規
        }
      };

      // v2.3: DB応答時間測定
      if (dbIntegrationEnabled) {
        try {
          const startTime = Date.now();
          await executeDBQuery('SELECT 1');
          const responseTime = Date.now() - startTime;
          
          healthStatus.services.database.last_check = 'success';
          healthStatus.services.database.responseTime = `${responseTime}ms`;
          
          // v2.3: レコード件数サマリ
          const recordCounts = await executeDBQuery(`
            SELECT 
              (SELECT COUNT(*) FROM users) as users,
              (SELECT COUNT(*) FROM consultations) as consultations,
              (SELECT COUNT(*) FROM surveys) as surveys,
              (SELECT COUNT(*) FROM survey_responses) as survey_responses,
              (SELECT COUNT(*) FROM audit_logs) as audit_logs
          `);
          
          if (recordCounts.length > 0) {
            healthStatus.recordCounts = recordCounts[0];
          }
          
          // v2.3: 直近エラー件数（監査ログから）
          const errorCount = await executeDBQuery(`
            SELECT COUNT(*) as count 
            FROM audit_logs 
            WHERE action LIKE '%error%' 
            AND created_at > datetime('now', '-1 hour')
          `);
          
          healthStatus.recentErrors = errorCount[0] ? errorCount[0].count : 0;
          
        } catch (error) {
          healthStatus.services.database.status = 'error';
          healthStatus.services.database.last_error = error.message;
          healthStatus.status = 'degraded';
        }
      }

      const httpStatus = healthStatus.status === 'ok' ? 200 : 503;
      res.writeHead(httpStatus);
      res.end(JSON.stringify(healthStatus));
      console.log(`✅ Health check: ${healthStatus.status}`);
    } catch (error) {
      console.error('❌ Health check error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Health check failed', timestamp: new Date().toISOString() }));
    }
    return;
  }

  // === 既存のAPI（members/analytics）は従来通りDB+フォールバック維持 ===
  // 注意: v2.3では新規API群のみフォールバック削除、既存APIは互換性維持
  
  if (req.method === 'GET' && pathname === '/api/members') {
    // 従来通りDB+フォールバック（v2.3では変更なし）
    if (!['admin', 'editor', 'staff', 'user'].includes(userRole)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Permission denied - authentication required' }));
      return;
    }

    try {
      let members = [];

      if (dbIntegrationEnabled) {
        // DB優先取得
        members = await executeDBQuery(`
          SELECT u.*, up.*, hs.current_step as hero_step
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id  
          LEFT JOIN heroes_steps hs ON u.id = hs.user_id
          ORDER BY u.created_at DESC
        `);
        
        // ヒーローステップラベル付与
        members = members.map(member => ({
          ...member,
          hero_step_label: getHeroStepLabel(member.hero_step || 0)
        }));
      } else if (globalMembersData) {
        // フォールバック
        members = globalMembersData;
      } else {
        // データなし
        members = [];
      }

      res.writeHead(200);
      res.end(JSON.stringify({ members }));
      console.log(`✅ Members sent: ${members.length} records`);
    } catch (error) {
      console.error('❌ Members API error:', error);
      
      // フォールバック
      if (globalMembersData) {
        res.writeHead(200);
        res.end(JSON.stringify({ members: globalMembersData }));
        console.log(`✅ Members sent (fallback): ${globalMembersData.length} records`);
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Service unavailable' }));
      }
    }
    return;
  }

  // 404エラー
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

// ヘルパー関数
function getHeroStepLabel(step) {
  const labels = ['目的', '主体性', '初期行動', 'テーマ決め', 'リーダー', 'ヒーロー'];
  return labels[step] || '未設定';
}

// ファイル提供関数
function serveFile(req, res, filePath) {
  const fullPath = path.join(__dirname, filePath.startsWith('/') ? filePath.substring(1) : filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // 404エラーページを表示
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - NEO Digital Platform v2.3</title>
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
            <h1 class="text-2xl font-bold">NEO Digital Platform v2.3</h1>
            <p class="text-sm opacity-90 mt-2">実運用データ収集・安定化版</p>
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
            ファイル: ${path.basename(filePath)}
          </p>
        </div>
      </body>
      </html>
    `);
      console.log(`❌ File not found: ${fullPath}`);
      return;
    }

    const ext = path.extname(fullPath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
    
    console.log(`✅ File served: ${filePath} (${mimeType})`);
  });
}

// メインサーバー
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams);

  console.log(`📡 ${req.method} ${pathname}`);
  
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Role');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API処理
  if (pathname.startsWith('/api/')) {
    await handleAPIRequest(req, res, pathname, query);
    return;
  }

  // 静的ファイル処理
  if (pathname === '/') {
    serveFile(req, res, '/index.html');
  } else {
    serveFile(req, res, pathname);
  }
});

// サーバー起動
server.listen(PORT, HOST, async () => {
  console.log(`🚀 NEO Digital Platform v2.3 Server running on http://${HOST}:${PORT}`);
  console.log('🔧 v2.3 Features:');
  console.log('  - 相談管理API (consultations)');
  console.log('  - アンケート管理API (surveys)'); 
  console.log('  - 新規API群 DB専用化');
  console.log('  - レート制御強化');
  console.log('  - 運用監視拡張');
  
  // DB初期化
  await initializeDatabase();
});