import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { NotionService } from './services/notion'
import { AuthService } from './services/auth'
import type { User, UserRole } from './types'

type Bindings = {
  NOTION_API_KEY: string;
  PUBLIC_COMPANIES_DB: string;
  PUBLIC_MEMBERS_DB: string;
  PUBLIC_ATTENDANCE_DB: string;
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
  
  // デモモード（実際の認証システムができるまでの暫定措置）
  if (demoRole) {
    const demoUser = AuthService.createDemoUser(demoRole, {
      companyId: c.req.query('company_id'),
      memberId: c.req.query('member_id')
    });
    c.set('user', demoUser);
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
  
  c.set('user', user);
  return next();
}

// API Routes

// 企業一覧取得
app.get('/api/companies', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    
    const notionService = new NotionService(env.NOTION_API_KEY, {
      PUBLIC_COMPANIES_DB: env.PUBLIC_COMPANIES_DB,
      PUBLIC_MEMBERS_DB: env.PUBLIC_MEMBERS_DB,
      PUBLIC_ATTENDANCE_DB: env.PUBLIC_ATTENDANCE_DB
    });
    
    const companies = await notionService.getPublicCompanies();
    
    // ロール別データフィルタリング
    if (user.role === 'company_admin') {
      // 会員企業管理者は自社の詳細データ + 他社の統計のみ
      const ownCompany = companies.find(c => c.id === user.companyId);
      const otherCompanies = companies.filter(c => c.id !== user.companyId);
      
      return c.json({
        success: true,
        data: {
          ownCompany,
          statistics: {
            totalCompanies: companies.length,
            avgCsStep: Math.round(companies.reduce((sum, comp) => sum + comp.csStep, 0) / companies.length * 100) / 100
          }
        }
      });
    }
    
    return c.json({ success: true, data: companies });
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
    const companyId = c.req.query('company_id');
    
    const notionService = new NotionService(env.NOTION_API_KEY, {
      PUBLIC_COMPANIES_DB: env.PUBLIC_COMPANIES_DB,
      PUBLIC_MEMBERS_DB: env.PUBLIC_MEMBERS_DB,
      PUBLIC_ATTENDANCE_DB: env.PUBLIC_ATTENDANCE_DB
    });
    
    let members;
    
    if (user.role === 'company_admin') {
      // 自社メンバーのみ取得
      members = await notionService.getPublicMembers(user.companyId);
    } else if (user.role === 'academia_student') {
      // 自分の情報のみ
      members = await notionService.getPublicMembers();
      members = members.filter(m => m.id === user.memberId);
    } else {
      // 事務局・オーナーは全体データ
      members = await notionService.getPublicMembers(companyId);
    }
    
    return c.json({ success: true, data: members });
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
    const memberId = c.req.query('member_id');
    
    const notionService = new NotionService(env.NOTION_API_KEY, {
      PUBLIC_COMPANIES_DB: env.PUBLIC_COMPANIES_DB,
      PUBLIC_MEMBERS_DB: env.PUBLIC_MEMBERS_DB,
      PUBLIC_ATTENDANCE_DB: env.PUBLIC_ATTENDANCE_DB
    });
    
    let attendance;
    
    if (user.role === 'academia_student') {
      // 自分の出欠データのみ
      attendance = await notionService.getPublicAttendance(user.memberId);
    } else if (user.role === 'company_admin') {
      // 自社メンバーの出欠データのみ
      const companyMembers = await notionService.getPublicMembers(user.companyId);
      const memberIds = companyMembers.map(m => m.id);
      const allAttendance = await notionService.getPublicAttendance();
      attendance = allAttendance.filter(a => memberIds.includes(a.memberId));
    } else {
      // 事務局・オーナーは全体データ
      attendance = await notionService.getPublicAttendance(memberId);
    }
    
    return c.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error in /api/attendance:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 講義サマリー取得
app.get('/api/lectures', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    
    const notionService = new NotionService(env.NOTION_API_KEY, {
      PUBLIC_COMPANIES_DB: env.PUBLIC_COMPANIES_DB,
      PUBLIC_MEMBERS_DB: env.PUBLIC_MEMBERS_DB,
      PUBLIC_ATTENDANCE_DB: env.PUBLIC_ATTENDANCE_DB
    });
    
    const lectures = await notionService.getLectureSummaries();
    
    return c.json({ success: true, data: lectures });
  } catch (error) {
    console.error('Error in /api/lectures:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ダッシュボード統計データ取得
app.get('/api/dashboard', authMiddleware, async (c) => {
  try {
    const { env } = c;
    const user = c.get('user') as User;
    
    const notionService = new NotionService(env.NOTION_API_KEY, {
      PUBLIC_COMPANIES_DB: env.PUBLIC_COMPANIES_DB,
      PUBLIC_MEMBERS_DB: env.PUBLIC_MEMBERS_DB,
      PUBLIC_ATTENDANCE_DB: env.PUBLIC_ATTENDANCE_DB
    });
    
    const [companies, members, attendance, lectures] = await Promise.all([
      notionService.getPublicCompanies(),
      notionService.getPublicMembers(user.role === 'company_admin' ? user.companyId : undefined),
      notionService.getPublicAttendance(),
      notionService.getLectureSummaries()
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
    
    const dashboard = {
      totalLectures: lectures.length,
      totalParticipants: members.length,
      avgSatisfaction,
      avgUnderstanding: presentAttendance.length > 0 
        ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.understandingScore || 0), 0) / presentAttendance.length * 100) / 100
        : 0,
      avgNPS: presentAttendance.length > 0 
        ? Math.round(presentAttendance.reduce((sum, a) => sum + (a.npsScore || 0), 0) / presentAttendance.length * 100) / 100
        : 0,
      companyMemberCount: members.length,
      heroStepDistribution
    };
    
    return c.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error in /api/dashboard:', error);
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
        <title>NEO福岡 企業マイページ</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app" class="min-h-screen">
            <!-- ローディング表示 -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">NEO福岡 企業マイページを読み込み中...</p>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
