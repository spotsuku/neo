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
  // クラス編成関連
  classNumber?: number; // 1-3クラス
  teamNumber?: number;  // 1-5チーム
  attendanceNumber?: number; // 出席番号
  furigana?: string;    // ひらがな読み仮名（ソート用）
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

// メンバーカルテ（非公開）
export interface MemberCard {
  id: string;
  regionId: RegionId;
  memberId: string;
  // 基本プロフィール
  personalProfile: {
    age?: number;
    birthPlace?: string;
    education?: string;
    skills?: string[];
    interests?: string[];
    careerGoals?: string;
  };
  // 個人アンケート結果
  personalSurveys: PersonalSurveyData[];
  // アンケート比較データ
  surveyComparisons: SurveyComparison;
  // 事務局コメント
  secretariatComments: SecretariatComment[];
  // 目標設定
  goals: Goal[];
  // 学習ログ
  learningLogs: LearningLog[];
  // 最終更新情報
  lastUpdated: string;
  updatedBy: string;
}

// 個人アンケートデータ
export interface PersonalSurveyData {
  id: string;
  surveyType: 'pre_program' | 'mid_program' | 'post_program' | 'monthly' | 'event_specific';
  surveyTitle: string;
  submittedAt: string;
  scores: Record<string, number>;  // 項目名: スコア
  textResponses: Record<string, string>; // 項目名: 自由記述
  npsScore?: number;
  overallSatisfaction?: number;
}

// アンケート比較分析
export interface SurveyComparison {
  memberPercentiles: Record<string, number>; // 項目別パーセンタイル
  regionAverages: Record<string, number>;     // 地域平均
  overallAverages: Record<string, number>;    // 全体平均
  growthTrends: Record<string, {
    initial: number;
    current: number;
    growth: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  lastCalculated: string;
}

// 事務局コメント
export interface SecretariatComment {
  id: string;
  authorId: string;
  authorName: string;
  category: 'progress' | 'behavior' | 'skills' | 'concerns' | 'achievements' | 'general';
  priority: 'high' | 'medium' | 'low';
  comment: string;
  isPrivate: boolean; // true: 事務局内のみ, false: 本人も閲覧可能
  createdAt: string;
  updatedAt?: string;
}

// 目標設定
export interface Goal {
  id: string;
  category: 'learning' | 'project' | 'skill' | 'network' | 'career';
  title: string;
  description: string;
  targetDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

// マイルストーン
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
}

// 学習ログ
export interface LearningLog {
  id: string;
  date: string;
  category: 'class_attendance' | 'self_study' | 'project_work' | 'networking' | 'reflection';
  title: string;
  description: string;
  hoursSpent?: number;
  skillsLearned?: string[];
  reflections?: string;
  attachments?: string[];
  createdAt: string;
}

// クラス編成情報
export interface ClassAssignment {
  regionId: RegionId;
  year: string;
  assignments: ClassMember[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// クラスメンバー
export interface ClassMember {
  memberId: string;
  memberName: string;
  furigana: string;
  classNumber: number; // 1-3
  teamNumber: number;  // 1-5 (クラス内でのチーム番号)
  attendanceNumber: number; // 出席番号（クラス内での五十音順）
  companyId: string;
  companyName: string;
}

// アンケート分析統計
export interface SurveyAnalytics {
  regionId: RegionId;
  analysisDate: string;
  memberCount: number;
  surveyTypes: string[];
  
  // 地域統計
  regionStats: {
    averageScores: Record<string, number>;
    medianScores: Record<string, number>;
    standardDeviations: Record<string, number>;
    percentileRanges: Record<string, {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    }>;
  };
  
  // 比較データ
  comparisonData: {
    byCompany: Record<string, Record<string, number>>;
    byHeroStep: Record<number, Record<string, number>>;
    bySelectionType: Record<SelectionType, Record<string, number>>;
  };
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