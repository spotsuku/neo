import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { NotionService } from './services/notion'
import { AuthService } from './services/auth'
import { 
  authenticateUser, 
  createTentativeRegistration, 
  completeProfile, 
  approveProfile, 
  processBulkRegistration, 
  getAdminDashboardStats 
} from './services/registration'
import { 
  validateCSVFile, 
  parseCSVText, 
  processCSVImport, 
  createCSVImportSession, 
  generateSampleCSV,
  DEFAULT_CSV_FORMAT,
  DEFAULT_CSV_IMPORT_CONFIG 
} from './services/csvImport'
import { 
  createSession, 
  getSession, 
  deleteSession, 
  getUserInfoFromSession,
  getRedirectUrl 
} from './services/session'
import type { User, UserRole, RegionId, TentativeRegistration, BulkRegistrationData, ProfileCompletionData, ProfileApprovalRequest, CSVFileInfo, CSVParseResult } from './types'

type Bindings = {
  NOTION_API_KEY: string;
  // 13のデータベースID
  PRIVATE_COMPANY_CARDS_DB: string;
  PUBLIC_COMPANIES_DB: string;
  PRIVATE_MEMBER_CARDS_DB: string;
  PUBLIC_MEMBERS_DB: string;
  PRIVATE_SURVEYS_DB: string;
  PUBLIC_ATTENDANCE_DB: string;
  PRIVATE_MATCHING_DB: string;
  PRIVATE_HERO_CANDIDATES_DB: string;
  CLASSES_DB: string;
  ANNOUNCEMENTS_DB: string;
  NEO_OFFICIAL_PROJECTS_DB: string;
  COMMITTEES_DB: string;
  SYLLABUS_AND_DOCS_DB: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// 認証ミドルウェア
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  const demoRole = c.req.query('demo_role') as UserRole;
  const demoRegion = c.req.query('demo_region') as RegionId || 'FUK';
  
  // デモモード（実際の認証システムができるまでの暫定措置）
  if (demoRole) {
    const demoUser = AuthService.createDemoUser(demoRole, demoRegion, {
      companyId: c.req.query('company_id'),
      memberId: c.req.query('member_id')
    });
    c.set('user', demoUser);
    c.set('currentRegion', demoRegion);
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  const user = await AuthService.getUserFromToken(token);
  
  if (!user) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  // 現在の地域コンテキストを設定（URLパラメータまたはユーザーのデフォルト地域）
  const currentRegion = c.req.query('region_id') as RegionId || user.regionId;
  
  // 地域アクセス権限チェック
  if (!AuthService.canAccessRegion(user, currentRegion)) {
    return c.json({ error: 'Region access denied' }, 403);
  }
  
  c.set('user', user);
  c.set('currentRegion', currentRegion);
  
  // 監査ログ記録
  await AuthService.logAuditEvent(user, 'ACCESS', 'API', c.req.path);
  
  return next();
}

// Notion Service初期化ヘルパー
function createNotionService(env: Bindings): NotionService {
  return new NotionService(env.NOTION_API_KEY, {
    PRIVATE_COMPANY_CARDS_DB: env.PRIVATE_COMPANY_CARDS_DB,
    PUBLIC_COMPANIES_DB: env.PUBLIC_COMPANIES_DB,
    PRIVATE_MEMBER_CARDS_DB: env.PRIVATE_MEMBER_CARDS_DB,
    PUBLIC_MEMBERS_DB: env.PUBLIC_MEMBERS_DB,
    PRIVATE_SURVEYS_DB: env.PRIVATE_SURVEYS_DB,
    PUBLIC_ATTENDANCE_DB: env.PUBLIC_ATTENDANCE_DB,
    PRIVATE_MATCHING_DB: env.PRIVATE_MATCHING_DB,
    PRIVATE_HERO_CANDIDATES_DB: env.PRIVATE_HERO_CANDIDATES_DB,
    CLASSES_DB: env.CLASSES_DB,
    ANNOUNCEMENTS_DB: env.ANNOUNCEMENTS_DB,
    NEO_OFFICIAL_PROJECTS_DB: env.NEO_OFFICIAL_PROJECTS_DB,
    COMMITTEES_DB: env.COMMITTEES_DB,
    SYLLABUS_AND_DOCS_DB: env.SYLLABUS_AND_DOCS_DB
  });
}

// ハイブリッド登録システム API Routes

// ログイン
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'メールアドレスとパスワードは必須です' }, 400);
    }
    
    const userSession = await authenticateUser(email, password);
    if (!userSession) {
      return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
    }
    
    // セッション作成
    const sessionToken = createSession(userSession);
    
    // リダイレクト先決定
    const redirectUrl = getRedirectUrl(userSession);
    
    return c.json({
      success: true,
      sessionToken,
      user: {
        userId: userSession.userId,
        email: userSession.email,
        role: userSession.role,
        regionId: userSession.regionId,
        status: userSession.status,
        isFirstLogin: userSession.isFirstLogin
      },
      redirectUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'ログイン処理中にエラーが発生しました' }, 500);
  }
});

// ログアウト
app.post('/api/auth/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionToken = authHeader.substring(7);
      deleteSession(sessionToken);
    }
    
    return c.json({ success: true, message: 'ログアウトしました' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'ログアウト処理中にエラーが発生しました' }, 500);
  }
});

// セッション検証
app.get('/api/auth/session', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'セッショントークンが必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo) {
      return c.json({ error: 'セッションが無効または期限切れです' }, 401);
    }
    
    return c.json({
      success: true,
      user: userInfo
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return c.json({ error: 'セッション検証中にエラーが発生しました' }, 500);
  }
});

// 事務局用：仮登録作成
app.post('/api/admin/tentative-registration', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    const registrationData: BulkRegistrationData = await c.req.json();
    const registration = await createTentativeRegistration(registrationData, userInfo.userId);
    
    return c.json({
      success: true,
      data: registration,
      message: '仮登録を作成し、メール通知を送信しました'
    });
  } catch (error) {
    console.error('Tentative registration error:', error);
    return c.json({ error: '仮登録作成中にエラーが発生しました' }, 500);
  }
});

// 事務局用：CSV一括登録（従来版）
app.post('/api/admin/bulk-registration', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    const { csvData }: { csvData: BulkRegistrationData[] } = await c.req.json();
    const result = await processBulkRegistration(csvData, userInfo.userId);
    
    return c.json({
      success: true,
      data: result,
      message: `${result.successCount}件の仮登録を作成しました（エラー：${result.errorCount}件）`
    });
  } catch (error) {
    console.error('Bulk registration error:', error);
    return c.json({ error: '一括登録処理中にエラーが発生しました' }, 500);
  }
});

// 事務局用：CSVファイルアップロード & パース
app.post('/api/admin/csv-import/parse', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    // CSVテキストを受信
    const { csvText, filename, fileSize } = await c.req.json();
    
    if (!csvText || !filename) {
      return c.json({ error: 'CSVデータまたはファイル名が指定されていません' }, 400);
    }
    
    // CSVファイル情報作成
    const fileInfo: CSVFileInfo = {
      filename,
      size: fileSize || csvText.length,
      lastModified: Date.now(),
      mimeType: 'text/csv'
    };
    
    // ファイルバリデーション（模擬）
    const mockFile = new File([csvText], filename, { type: 'text/csv' });
    const fileValidation = validateCSVFile(mockFile);
    
    if (!fileValidation.isValid) {
      return c.json({ 
        error: 'CSVファイルが無効です',
        details: fileValidation.errors 
      }, 400);
    }
    
    // CSVパース
    const parseResult = parseCSVText(csvText);
    
    // インポートセッション作成
    const session = createCSVImportSession(fileInfo, userInfo.userId);
    session.parseResult = parseResult;
    session.status = 'parsed';
    
    // TODO: セッションを一時保存（Cloudflare KV等を使用）
    
    return c.json({
      success: true,
      sessionId: session.sessionId,
      parseResult,
      message: `CSVファイルを解析しました（有効行：${parseResult.summary.validCount}件、エラー行：${parseResult.summary.errorCount}件）`
    });
  } catch (error) {
    console.error('CSV parse error:', error);
    return c.json({ error: 'CSVファイル解析中にエラーが発生しました' }, 500);
  }
});

// 事務局用：CSVインポート実行
app.post('/api/admin/csv-import/execute', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    const { sessionId, config } = await c.req.json();
    
    if (!sessionId) {
      return c.json({ error: 'セッションIDが必要です' }, 400);
    }
    
    // TODO: セッションデータを取得（Cloudflare KV等から）
    // 現在はサンプルデータを使用
    const sampleParseResult: CSVParseResult = {
      isValid: true,
      totalRows: 1,
      validRows: [
        {
          row: 2,
          data: {
            email: 'demo@example.com',
            name: 'デモユーザー',
            name_kana: 'デモユーザー',
            region_id: 'FUK',
            role: 'student'
          },
          isValid: true,
          errors: [],
          warnings: []
        }
      ],
      invalidRows: [],
      headers: ['email', 'name', 'name_kana', 'region_id', 'role'],
      summary: {
        totalCount: 1,
        validCount: 1,
        errorCount: 0,
        warningCount: 0
      },
      globalErrors: []
    };
    
    // インポート処理実行
    const importConfig = config || DEFAULT_CSV_IMPORT_CONFIG;
    const importResult = await processCSVImport(sampleParseResult, importConfig, userInfo.userId);
    
    return c.json({
      success: true,
      importResult,
      message: `インポートが完了しました（成功：${importResult.importSummary.successfulImports}件、失敗：${importResult.importSummary.failedImports}件）`
    });
  } catch (error) {
    console.error('CSV import execution error:', error);
    return c.json({ error: 'CSVインポート実行中にエラーが発生しました' }, 500);
  }
});

// 事務局用：CSVサンプルファイル生成
app.get('/api/admin/csv-import/sample', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    const sampleCsv = generateSampleCSV();
    
    return new Response(sampleCsv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="neo-member-import-sample.csv"'
      }
    });
  } catch (error) {
    console.error('Sample CSV generation error:', error);
    return c.json({ error: 'サンプルCSVファイル生成中にエラーが発生しました' }, 500);
  }
});

// 事務局用：CSVフォーマット情報取得
app.get('/api/admin/csv-import/format', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    return c.json({
      success: true,
      format: DEFAULT_CSV_FORMAT,
      config: DEFAULT_CSV_IMPORT_CONFIG
    });
  } catch (error) {
    console.error('CSV format info error:', error);
    return c.json({ error: 'CSVフォーマット情報取得中にエラーが発生しました' }, 500);
  }
});

// プロフィール取得
app.get('/api/profile/:memberId', async (c) => {
  try {
    const { env } = c;
    const memberId = c.req.param('memberId');
    const regionId = c.req.query('region_id') as RegionId;
    
    if (!regionId) {
      return c.json({ error: 'region_id が必要です' }, 400);
    }
    
    const notionService = createNotionService(env);
    
    // デモプロフィールデータを返す
    const demoProfile = {
      id: memberId,
      fullName: 'デモ ユーザー',
      fullNameKana: 'デモ ユーザー',
      email: 'demo@example.com',
      birthPlace: '福岡県福岡市',
      schools: 'デモ大学',
      birthday: '1995-01-01',
      jobTitle: 'システムエンジニア',
      catchPhrase: 'テクノロジーで社会を変える',
      profileDescription: 'プログラミングとデザインが好きなシステムエンジニアです。NEOで新しい技術と人とのつながりを学びたいと思っています。',
      neoMotivation: 'NEOでは様々な分野の専門家と交流し、自分のスキルを活かしてイノベーションを創出したいと考えています。',
      profileImageUrl: null,
      socialLinks: {
        twitter: '@demo_user',
        instagram: '@demo_user',
        otherUrl: 'https://demo.example.com'
      },
      memberCategories: ['youth_selected'],
      fukuokaConnections: ['resident_worker_student'],
      permissions: {
        canEdit: true
      }
    };
    
    return c.json({ 
      success: true, 
      data: demoProfile 
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    return c.json({ error: 'プロフィール取得中にエラーが発生しました' }, 500);
  }
});

// プロフィール更新
app.put('/api/profile/:memberId', async (c) => {
  try {
    const { env } = c;
    const memberId = c.req.param('memberId');
    const regionId = c.req.query('region_id') as RegionId;
    
    if (!regionId) {
      return c.json({ error: 'region_id が必要です' }, 400);
    }
    
    const profileData = await c.req.json();
    
    // バリデーション
    const validationErrors = [];
    if (!profileData.fullName?.trim()) {
      validationErrors.push('氏名は必須です');
    }
    if (!profileData.fullNameKana?.trim()) {
      validationErrors.push('氏名（カナ）は必須です');
    }
    if (profileData.profileDescription && profileData.profileDescription.length > 200) {
      validationErrors.push('プロフィール文は200文字以内で入力してください');
    }
    
    if (validationErrors.length > 0) {
      return c.json({ 
        success: false, 
        validationErrors 
      }, 400);
    }
    
    // デモでは更新成功を返す
    return c.json({
      success: true,
      message: 'プロフィールが更新されました'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ error: 'プロフィール更新中にエラーが発生しました' }, 500);
  }
});

// プロフィール補完（初回ログイン後）
app.post('/api/profile-completion', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || userInfo.status !== 'tentative') {
      return c.json({ error: 'プロフィール補完は仮登録状態のユーザーのみ利用可能です' }, 403);
    }
    
    const profileData: ProfileCompletionData = await c.req.json();
    const success = await completeProfile(userInfo.userId, profileData);
    
    if (!success) {
      return c.json({ error: 'プロフィール補完に失敗しました' }, 400);
    }
    
    return c.json({
      success: true,
      message: 'プロフィール補完が完了しました。事務局の承認をお待ちください。'
    });
  } catch (error) {
    console.error('Profile completion error:', error);
    return c.json({ error: 'プロフィール補完中にエラーが発生しました' }, 500);
  }
});

// 事務局用：プロフィール承認
app.post('/api/admin/approve-profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    const approvalRequest: ProfileApprovalRequest = await c.req.json();
    approvalRequest.approvedBy = userInfo.userId;
    
    const success = await approveProfile(approvalRequest);
    
    if (!success) {
      return c.json({ error: 'プロフィール承認に失敗しました' }, 400);
    }
    
    return c.json({
      success: true,
      message: approvalRequest.status === 'approve' ? 'プロフィールを承認しました' : 'プロフィールを却下しました'
    });
  } catch (error) {
    console.error('Profile approval error:', error);
    return c.json({ error: 'プロフィール承認中にエラーが発生しました' }, 500);
  }
});

// 事務局用：管理ダッシュボード統計
app.get('/api/admin/dashboard-stats', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '認証が必要です' }, 401);
    }
    
    const sessionToken = authHeader.substring(7);
    const userInfo = getUserInfoFromSession(sessionToken);
    
    if (!userInfo || (userInfo.role !== 'secretariat' && userInfo.role !== 'owner')) {
      return c.json({ error: 'この機能は事務局のみ利用可能です' }, 403);
    }
    
    const stats = await getAdminDashboardStats();
    
    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return c.json({ error: '統計データ取得中にエラーが発生しました' }, 500);
  }
});

// API Routes

// 企業一覧取得
app.get('/api/companies', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    
    const notionService = createNotionService(env);
    const companies = await notionService.getPublicCompanies(currentRegion);
    
    // ロール別データフィルタリング
    if (user.role === 'company_admin') {
      // 会員企業管理者は自社の詳細データ + 他社の統計のみ
      const ownCompany = companies.find(c => c.id === user.companyId);
      const otherCompanies = companies.filter(c => c.id !== user.companyId);
      
      return c.json({
        success: true,
        data: {
          ownCompany,
          otherCompaniesCount: otherCompanies.length,
          statistics: AuthService.generateAggregatedData(otherCompanies, ['csStep'])
        },
        regionId: currentRegion
      });
    }
    
    // secretariat/ownerは全データ、studentは基本情報のみ
    const responseData = user.role === 'student' 
      ? companies.map(c => ({ id: c.id, name: c.name, industry: c.industry, logoUrl: c.logoUrl }))
      : companies;
    
    return c.json({ 
      success: true, 
      data: responseData,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/companies:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メンバー一覧取得
app.get('/api/members', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const companyId = c.req.query('company_id');
    
    const notionService = createNotionService(env);
    let members;
    
    if (user.role === 'company_admin') {
      // 自社メンバーのみ取得
      members = await notionService.getPublicMembers(currentRegion, user.companyId);
    } else if (user.role === 'student') {
      // 学生は全メンバーの基本プロフィールのみ閲覧可能
      const allMembers = await notionService.getPublicMembers(currentRegion);
      members = allMembers.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        profileImage: m.profileImage,
        heroStep: m.heroStep,
        companyId: m.companyId
      }));
    } else {
      // 事務局・オーナーは全体データ
      members = await notionService.getPublicMembers(currentRegion, companyId);
    }
    
    return c.json({ 
      success: true, 
      data: members,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/members:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 出欠データ取得
app.get('/api/attendance', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const memberId = c.req.query('member_id');
    const eventId = c.req.query('event_id');
    
    const notionService = createNotionService(env);
    let attendance;
    
    if (user.role === 'student') {
      // 自分の出欠データのみ
      attendance = await notionService.getPublicAttendance(currentRegion, user.memberId);
    } else if (user.role === 'company_admin') {
      // 自社メンバーの出欠データのみ
      const companyMembers = await notionService.getPublicMembers(currentRegion, user.companyId);
      const memberIds = companyMembers.map(m => m.id);
      const allAttendance = await notionService.getPublicAttendance(currentRegion);
      attendance = allAttendance.filter(a => memberIds.includes(a.memberId));
    } else {
      // 事務局・オーナーは全体データ
      attendance = await notionService.getPublicAttendance(currentRegion, memberId, eventId);
    }
    
    return c.json({ 
      success: true, 
      data: attendance,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/attendance:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 授業・講義サマリー取得
app.get('/api/classes', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const year = c.req.query('year');
    
    const notionService = createNotionService(env);
    const classes = await notionService.getClassSummaries(currentRegion);
    
    return c.json({ 
      success: true, 
      data: classes,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/classes:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// お知らせ取得
app.get('/api/announcements', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    
    const notionService = createNotionService(env);
    const announcements = await notionService.getAnnouncements(currentRegion, user.role);
    
    // ロール別フィルタリング
    const filteredAnnouncements = announcements.filter(a => 
      a.targetRoles.length === 0 || a.targetRoles.includes(user.role)
    );
    
    return c.json({ 
      success: true, 
      data: filteredAnnouncements,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/announcements:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// NEO公認プロジェクト取得
app.get('/api/neo-projects', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const recruitingOnly = c.req.query('recruiting') === 'true';
    
    const notionService = createNotionService(env);
    const projects = await notionService.getNEOProjects(currentRegion, recruitingOnly ? true : undefined);
    
    return c.json({ 
      success: true, 
      data: projects,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/neo-projects:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 委員会取得
app.get('/api/committees', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    
    const notionService = createNotionService(env);
    const committees = await notionService.getCommittees(currentRegion);
    
    return c.json({ 
      success: true, 
      data: committees,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/committees:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 資料・ドキュメント取得
app.get('/api/documents', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const type = c.req.query('type');
    
    const accessLevel = user.role === 'owner' || user.role === 'secretariat' ? 'admin_only' : 'member_only';
    
    const notionService = createNotionService(env);
    const documents = await notionService.getDocuments(currentRegion, type, accessLevel);
    
    return c.json({ 
      success: true, 
      data: documents,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/documents:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ダッシュボード統計データ取得
app.get('/api/dashboard', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    
    const notionService = createNotionService(env);
    
    const [companies, members, attendance, classes, projects, announcements] = await Promise.all([
      notionService.getPublicCompanies(currentRegion),
      notionService.getPublicMembers(currentRegion, user.role === 'company_admin' ? user.companyId : undefined),
      notionService.getPublicAttendance(currentRegion),
      notionService.getClasses(currentRegion),
      notionService.getNEOProjects(currentRegion),
      notionService.getAnnouncements(currentRegion)
    ]);
    
    // ヒーロージャーニーステップ分布
    const heroStepDistribution: Record<number, number> = {};
    for (let step = 0; step <= 5; step++) {
      heroStepDistribution[step] = members.filter(m => m.heroStep === step).length;
    }
    
    // 統計計算
    const presentAttendance = attendance.filter(a => a.status === 'present');
    const avgSatisfaction = presentAttendance.length > 0 
      ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.satisfactionScore || 0), 0) / presentAttendance.length * 100) / 100
      : 0;
      
    const attendanceRate = attendance.length > 0
      ? Math.round((presentAttendance.length / attendance.length) * 100)
      : 0;
    
    // 最近の活動
    const recentActivity = [
      ...classes.slice(0, 3).map(c => ({
        id: c.id,
        type: 'class' as const,
        title: c.title,
        date: c.date,
        participants: c.participantCount
      })),
      ...announcements.slice(0, 2).map(a => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        date: a.publishDate
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    
    const dashboard = {
      regionId: currentRegion,
      totalClasses: classes.length,
      totalParticipants: members.length,
      totalCompanies: companies.length,
      avgSatisfaction,
      avgUnderstanding: presentAttendance.length > 0 
        ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.understandingScore || 0), 0) / presentAttendance.length * 100) / 100
        : 0,
      avgNPS: presentAttendance.length > 0 
        ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.npsScore || 0), 0) / presentAttendance.length * 100) / 100
        : 0,
      companyMemberCount: members.length,
      heroStepDistribution,
      attendanceRate,
      activeProjects: projects.filter(p => p.status === 'active').length,
      openConsultations: 0, // マッチングDBから取得（第2スプリント）
      recentActivity
    };
    
    return c.json({ 
      success: true, 
      data: dashboard,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/dashboard:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メンバーカルテ詳細取得（role-based access control）
app.get('/api/member-card/:memberId', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const memberId = c.req.param('memberId');
    
    // 権限チェック
    if (user.role === 'student' && user.memberId !== memberId) {
      return c.json({ error: 'Access denied to other member cards' }, 403);
    }
    
    if (user.role === 'company_admin') {
      // 自社メンバーのみアクセス可能
      const notionService = createNotionService(env);
      const member = await notionService.getMemberById(currentRegion, memberId);
      if (!member || member.companyId !== user.companyId) {
        return c.json({ error: 'Access denied to member card' }, 403);
      }
    }
    
    const notionService = createNotionService(env);
    
    // メンバーカルテデータを並行取得
    const [memberCard, personalSurveys, classAssignment] = await Promise.all([
      notionService.getMemberCard(currentRegion, memberId),
      notionService.getPersonalSurveys(currentRegion, memberId),
      notionService.getClassAssignment(currentRegion)
    ]);
    
    if (!memberCard) {
      return c.json({ error: 'Member card not found' }, 404);
    }
    
    // アンケート分析データを取得
    const surveyAnalytics = await notionService.calculateSurveyAnalytics(currentRegion);
    
    // メンバーのクラス・チーム情報を取得
    const memberAssignment = classAssignment?.assignments.find(a => a.memberId === memberId);
    
    // アンケート比較データを計算
    const surveyComparisons = personalSurveys.length > 0 && surveyAnalytics
      ? AuthService.calculateMemberSurveyComparisons(personalSurveys, surveyAnalytics, user.role)
      : memberCard.surveyComparisons;
    
    const responseData = {
      ...memberCard,
      personalSurveys,
      surveyComparisons,
      classAssignment: memberAssignment,
      // データマスキング: ロール別に表示内容を制御
      secretariatComments: user.role === 'student' 
        ? memberCard.secretariatComments.filter(c => !c.isPrivate)
        : memberCard.secretariatComments
    };
    
    return c.json({
      success: true,
      data: responseData,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/member-card:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// クラス編成情報取得
app.get('/api/class-assignments', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const year = c.req.query('year') || new Date().getFullYear().toString();
    
    // 権限チェック（secretariat/ownerのみ全体編成を表示）
    if (user.role === 'student' || user.role === 'company_admin') {
      return c.json({ error: 'Access denied to class assignments' }, 403);
    }
    
    const notionService = createNotionService(env);
    const classAssignment = await notionService.getClassAssignment(currentRegion, year);
    
    if (!classAssignment) {
      return c.json({ error: 'Class assignments not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: classAssignment,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/class-assignments:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メンバーカルテ更新（secretariat/ownerのみ）
app.put('/api/member-card/:memberId', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const memberId = c.req.param('memberId');
    
    // 権限チェック
    if (user.role !== 'secretariat' && user.role !== 'owner') {
      return c.json({ error: 'Access denied to update member card' }, 403);
    }
    
    const updateData = await c.req.json();
    
    // 実際の実装では、Notionページを更新
    // const notionService = createNotionService(env);
    // await notionService.updateMemberCard(currentRegion, memberId, updateData);
    
    return c.json({
      success: true,
      message: 'Member card updated successfully',
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/member-card update:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// アンケート分析統計取得（secretariat/ownerのみ）
app.get('/api/survey-analytics', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    
    // 権限チェック
    if (user.role !== 'secretariat' && user.role !== 'owner') {
      return c.json({ error: 'Access denied to survey analytics' }, 403);
    }
    
    const notionService = createNotionService(env);
    const analytics = await notionService.calculateSurveyAnalytics(currentRegion);
    
    return c.json({
      success: true,
      data: analytics,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/survey-analytics:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メンバープロフィール取得
app.get('/api/profile/:memberId', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const memberId = c.req.param('memberId');
    
    const notionService = createNotionService(env);
    
    // 対象メンバーの基本情報を取得（権限チェック用）
    const targetMember = await notionService.getMemberById(currentRegion, memberId);
    if (!targetMember) {
      return c.json({ error: 'Member not found' }, 404);
    }
    
    // 権限チェック
    const permissions = AuthService.getProfilePermissions(user, memberId, targetMember.companyId);
    if (!permissions.canView) {
      return c.json({ error: 'Access denied to profile' }, 403);
    }
    
    // プロフィール取得
    const profile = await notionService.getMemberProfile(currentRegion, memberId);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    // 権限に応じてデータをフィルタリング
    const responseData = {
      ...profile,
      permissions
    };
    
    // 会社管理者の場合、個人的な情報を制限
    if (permissions.accessLevel === 'company' && !permissions.isOwner) {
      responseData.socialLinks = { twitter: '', instagram: '', otherUrl: '' };
      responseData.neoMotivation = '';
      responseData.birthday = '';
    }
    
    return c.json({
      success: true,
      data: responseData,
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/profile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メンバープロフィール更新
app.put('/api/profile/:memberId', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const memberId = c.req.param('memberId');
    
    // 権限チェック
    const permissions = AuthService.getProfilePermissions(user, memberId);
    if (!permissions.canEdit) {
      return c.json({ error: 'Access denied to edit profile' }, 403);
    }
    
    const profileData = await c.req.json();
    
    // バリデーション
    const validationErrors = AuthService.validateProfileData(profileData);
    if (validationErrors.length > 0) {
      return c.json({
        success: false,
        error: 'Validation failed',
        validationErrors
      }, 400);
    }
    
    const notionService = createNotionService(env);
    const success = await notionService.updateMemberProfile(currentRegion, memberId, profileData);
    
    if (!success) {
      return c.json({ error: 'Failed to update profile' }, 500);
    }
    
    // 監査ログ記録
    await AuthService.logAuditEvent(user, 'UPDATE', 'PROFILE', memberId, {
      updatedFields: Object.keys(profileData)
    });
    
    return c.json({
      success: true,
      message: 'Profile updated successfully',
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/profile update:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// プロフィール画像アップロード
app.post('/api/profile/:memberId/upload-image', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    const currentRegion = c.get('currentRegion') as RegionId;
    const memberId = c.req.param('memberId');
    
    // 権限チェック
    const permissions = AuthService.getProfilePermissions(user, memberId);
    if (!permissions.canEdit) {
      return c.json({ error: 'Access denied to upload image' }, 403);
    }
    
    // 実際の実装では、画像をCloudflare R2やS3にアップロード
    // ここでは簡易実装として、画像URLを返す
    const imageUrl = `https://example.com/profiles/${memberId}/profile-image.jpg`;
    
    // 監査ログ記録
    await AuthService.logAuditEvent(user, 'UPLOAD', 'PROFILE_IMAGE', memberId);
    
    return c.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully',
      regionId: currentRegion
    });
  } catch (error) {
    console.error('Error in /api/profile image upload:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 地域横断比較データ取得（owner/secretariatのみ）
app.get('/api/cross-region-stats', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    
    // 権限チェック
    if (!AuthService.canAccessCrossRegionData(user)) {
      return c.json({ error: 'Cross-region access denied' }, 403);
    }
    
    const notionService = createNotionService(env);
    const regions: RegionId[] = ['FUK', 'ISK', 'NIG'];
    
    const regionData = await Promise.all(regions.map(async (region) => {
      const [members, attendance] = await Promise.all([
        notionService.getPublicMembers(region),
        notionService.getPublicAttendance(region)
      ]);
      
      const presentAttendance = attendance.filter(a => a.status === 'present');
      const heroStepDistribution: Record<number, number> = {};
      for (let step = 0; step <= 5; step++) {
        heroStepDistribution[step] = members.filter(m => m.heroStep === step).length;
      }
      
      return {
        regionId: region,
        totalParticipants: members.length,
        avgSatisfaction: presentAttendance.length > 0 
          ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.satisfactionScore || 0), 0) / presentAttendance.length * 100) / 100
          : 0,
        avgNPS: presentAttendance.length > 0 
          ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.npsScore || 0), 0) / presentAttendance.length * 100) / 100
          : 0,
        heroStepDistribution,
        attendanceRate: attendance.length > 0 
          ? Math.round((presentAttendance.length / attendance.length) * 100)
          : 0
      };
    }));
    
    const regionComparison = regionData.reduce((acc, data) => {
      acc[data.regionId] = data;
      return acc;
    }, {} as Record<RegionId, any>);
    
    return c.json({
      success: true,
      data: {
        regionComparison,
        globalStats: {
          totalParticipants: regionData.reduce((sum, r) => sum + r.totalParticipants, 0),
          avgSatisfaction: Math.round(regionData.reduce((sum, r) => sum + r.avgSatisfaction, 0) / regionData.length * 100) / 100,
          avgNPS: Math.round(regionData.reduce((sum, r) => sum + r.avgNPS, 0) / regionData.length * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error in /api/cross-region-stats:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// メインページ
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NEO デジタルプラットフォーム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
        <script>
          // Tailwind CSS の設定
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'neo-blue': '#1e40af',
                  'neo-light': '#3b82f6',
                  'neo-dark': '#1e3a8a'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="app" class="min-h-screen">
            <!-- ローディング表示 -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-neo-blue mx-auto mb-6"></div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">NEO デジタルプラットフォーム</h2>
                    <p class="text-gray-600">マルチテナント対応システムを読み込み中...</p>
                    <div class="mt-4 flex justify-center space-x-4">
                      <div class="w-2 h-2 bg-neo-blue rounded-full animate-pulse"></div>
                      <div class="w-2 h-2 bg-neo-light rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                      <div class="w-2 h-2 bg-neo-dark rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// 地域別ルーティング（将来実装）
app.get('/app/:regionId/*', (c) => {
  const regionId = c.req.param('regionId');
  // 現在は単一アプリでregionIdをパラメータとして処理
  return c.redirect(`/?demo_region=${regionId}`);
})

export default app
