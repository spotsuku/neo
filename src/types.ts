// 地域コード定義
export type RegionId = 'FUK' | 'ISK' | 'NIG' | 'ALL'; // ALL は横断比較用

// ユーザーロール定義
export type UserRole = 'company_admin' | 'student' | 'secretariat' | 'owner';

// 選抜区分
export type SelectionType = 'company_selected' | 'youth_selected';

// ユーザー情報
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  regionId: RegionId;        // ユーザーの所属地域
  accessibleRegions: RegionId[]; // アクセス可能な地域（secretariat/ownerは複数）
  companyId?: string;        // 会員企業管理者の場合
  memberId?: string;         // 学生の場合
  profileImage?: string;     // プロフィール画像URL
  joinDate?: string;
}

// 企業情報
export interface Company {
  id: string;
  regionId: RegionId;
  name: string;
  industry: string;
  status: string;
  joinDate: string;
  logoUrl?: string;
  description?: string;
  csStep: number; // 企業CSステップ (1-10)
  nextAction?: string; // 次の推奨アクション
  displayOrder?: number; // 表示順序（FUK地域の例外ルール用）
}

// メンバー情報
export interface Member {
  id: string;
  regionId: RegionId;
  name: string;
  email: string;
  companyId: string;
  type: SelectionType;
  heroStep: number; // ヒーロージャーニーステップ (0-5)
  status: string;
  profileImage?: string;
  attendanceRate?: number;
  joinDate?: string;
  mentorId?: string;
  bio?: string;
}

// 出欠管理
export interface Attendance {
  id: string;
  regionId: RegionId;
  memberId: string;
  eventId: string;          // クラスID
  eventTitle: string;
  eventDate: string;
  instructor: string;
  status: 'present' | 'absent' | 'late';
  satisfactionScore?: number;  // 満足度 (1-5)
  understandingScore?: number; // 理解度 (1-5)
  npsScore?: number;          // NPS (-100 to 100)
  comment?: string;           // 自由記述
  timestamp: string;
}

// 授業情報
export interface Class {
  id: string;
  regionId: RegionId;
  title: string;
  theme: string;
  instructor: string;
  date: string;
  time: string;
  venue?: string;
  description?: string;
  materials?: string[];
  participantCount: number;
  avgSatisfaction: number;
  avgUnderstanding: number;
  avgNPS: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// お知らせ情報
export interface Announcement {
  id: string;
  regionId: RegionId;
  title: string;
  content: string;
  category: 'important' | 'event' | 'operation' | 'general';
  priority: 'high' | 'medium' | 'low';
  targetRoles: UserRole[];
  publishDate: string;
  expiryDate?: string;
  attachments?: string[];
  isActive: boolean;
}

// NEO公認プロジェクト
export interface NEOProject {
  id: string;
  regionId: RegionId;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'suspended';
  leaderId: string;
  memberIds: string[];
  startDate: string;
  endDate?: string;
  progress: number; // 0-100
  category: string;
  isRecruting: boolean;
}

// 委員会
export interface Committee {
  id: string;
  regionId: RegionId;
  name: string;
  description: string;
  chairPersonId: string;
  memberIds: string[];
  meetingSchedule: string;
  responsibilities: string[];
  isRecruting: boolean;
  applicationDeadline?: string;
}

// シラバス・資料
export interface Document {
  id: string;
  regionId: RegionId;
  title: string;
  type: 'syllabus' | 'guide' | 'regulation' | 'faq' | 'material';
  url: string;
  description?: string;
  category: string;
  uploadDate: string;
  updatedDate: string;
  accessLevel: 'public' | 'member_only' | 'admin_only';
}

// アンケート
export interface Survey {
  id: string;
  regionId: RegionId;
  respondentType: 'company_admin' | 'student';
  respondentId: string;
  companyId?: string;
  eventId?: string;
  scores: Record<string, number>;
  npsScore?: number;
  freeText?: string;
  submittedAt: string;
}

// 相談・マッチング
export interface Matching {
  id: string;
  regionId: RegionId;
  companyId: string;
  category: 'business_consultation' | 'collaboration' | 'recruitment' | 'other';
  title: string;
  content: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigneeId?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

// ヒーロー候補
export interface HeroCandidate {
  id: string;
  regionId: RegionId;
  memberId: string;
  stage: number; // 0-5
  mentorId?: string;
  notes: string[];
  achievements: string[];
  nextMilestones: string[];
  evaluationDate: string;
  isNominated: boolean;
}

// 監査ログ
export interface AuditLog {
  id: string;
  regionId: RegionId;
  userId: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId: string;
  companyId?: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
}

// ダッシュボード統計情報
export interface DashboardStats {
  regionId: RegionId;
  totalClasses: number;
  totalParticipants: number;
  totalCompanies: number;
  avgSatisfaction: number;
  avgUnderstanding: number;
  avgNPS: number;
  companyMemberCount: number;
  heroStepDistribution: Record<number, number>;
  attendanceRate: number;
  activeProjects: number;
  openConsultations: number;
  recentActivity: ActivityItem[];
}

// 地域横断比較統計
export interface CrossRegionStats {
  regionComparison: Record<RegionId, {
    totalParticipants: number;
    avgSatisfaction: number;
    avgNPS: number;
    heroStepDistribution: Record<number, number>;
    attendanceRate: number;
  }>;
  globalStats: DashboardStats;
}

// 活動アイテム
export interface ActivityItem {
  id: string;
  type: 'class' | 'announcement' | 'project' | 'committee';
  title: string;
  date: string;
  participants?: number;
  status?: string;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  regionId?: RegionId;
  timestamp?: string;
}

// ページネーション
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// フィルター
export interface FilterParams {
  regionId?: RegionId;
  year?: string;
  program?: string;
  selectionType?: SelectionType;
  committee?: string;
  category?: string;
  status?: string;
}

// Notion API レスポンス型
export interface NotionPage {
  id: string;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
}

export interface NotionDatabase {
  results: NotionPage[];
  has_more: boolean;
  next_cursor?: string;
}