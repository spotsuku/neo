// 地域コード定義
export type RegionId = 'FUK' | 'ISK' | 'NIG' | 'ALL'; // ALL は横断比較用

// ユーザーロール定義
export type UserRole = 'company_admin' | 'student' | 'secretariat' | 'owner';

// 選抜区分
export type SelectionType = 'company_selected' | 'youth_selected';

// 会員区分
export type MemberCategory = 
  | 'youth_selected' 
  | 'company_selected' 
  | 'corporate_member' 
  | 'council_member' 
  | 'club_member' 
  | 'supporting_partner' 
  | 'mentor' 
  | 'lecturer' 
  | 'communicator' 
  | 'secretariat' 
  | 'observer' 
  | 'committee_advisor';

// 福岡との繋がり
export type FukuokaConnection = 
  | 'resident_worker_student' 
  | 'originally_from_fukuoka' 
  | 'want_to_connect_with_fukuoka';

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

// メンバープロフィール（編集可能なプロフィール情報）
export interface MemberProfile {
  id: string;
  regionId: RegionId;
  memberId: string;
  companyId?: string;
  
  // 基本情報
  fullName: string;              // 氏名
  fullNameKana: string;          // 氏名（カナ）
  birthPlace?: string;           // 出身地
  schools?: string;              // 出身校（高校/大学）
  birthday?: string;             // 誕生日 (YYYY-MM-DD)
  jobTitle?: string;             // 肩書き
  catchPhrase?: string;          // キャッチコピー
  
  // 自己紹介・動機
  profileDescription: string;     // プロフィール（200文字程度）
  neoMotivation?: string;        // NEO参加動機
  
  // 画像・SNS
  profileImageUrl?: string;      // プロフィール画像URL
  socialLinks: {
    twitter?: string;            // X（Twitter）@username形式
    instagram?: string;          // Instagram @username形式
    otherUrl?: string;          // その他URL
  };
  
  // 区分・繋がり
  memberCategories: MemberCategory[];    // 会員区分（複数選択）
  fukuokaConnections: FukuokaConnection[]; // 福岡との繋がり（複数選択）
  
  // システム情報
  isPublic: boolean;             // 公開フラグ
  lastUpdated: string;           // 最終更新日時
  updatedBy: string;            // 更新者ID
}

// プロフィールフォームデータ
export interface ProfileFormData {
  fullName: string;
  fullNameKana: string;
  birthPlace: string;
  schools: string;
  birthday: string;
  jobTitle: string;
  catchPhrase: string;
  profileDescription: string;
  neoMotivation: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    otherUrl: string;
  };
  memberCategories: MemberCategory[];
  fukuokaConnections: FukuokaConnection[];
  isPublic: boolean;
}

// プロフィール更新リクエスト
export interface ProfileUpdateRequest {
  profileData: ProfileFormData;
  profileImage?: File;  // 画像ファイル（オプション）
}

// プロフィール権限情報
export interface ProfilePermissions {
  canView: boolean;     // 閲覧権限
  canEdit: boolean;     // 編集権限
  isOwner: boolean;     // 本人かどうか
  accessLevel: 'owner' | 'company' | 'secretariat' | 'public' | 'none';
}

// バリデーションエラー
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ハイブリッド登録システム関連の型定義

// メンバーステータス
export type MemberStatus = 'tentative' | 'active' | 'suspended' | 'withdrawn';

// 認証情報
export interface AuthCredentials {
  email: string;
  password: string;
}

// セッション情報
export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  regionId: RegionId;
  companyId?: string;
  memberId?: string;
  status: MemberStatus;
  isFirstLogin: boolean;
  loginTime: string;
  expiresAt: string;
}

// 一時パスワード情報
export interface TemporaryPassword {
  id: string;
  userId: string;
  tempPassword: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
}

// 仮登録データ
export interface TentativeRegistration {
  id: string;
  // 事務局入力項目（必須）
  tempName: string;          // 仮氏名
  email: string;             // メールアドレス
  regionId: RegionId;        // 地域ID
  role: UserRole;            // ロール
  companyId?: string;        // 企業ID（必要時）
  
  // システム情報
  status: MemberStatus;      // 'tentative' | 'active'
  temporaryPassword: string; // 一時パスワード
  tempPasswordExpiresAt: string; // 一時パスワード有効期限
  isFirstLogin: boolean;     // 初回ログインフラグ
  
  // 登録情報
  createdBy: string;         // 作成者（事務局）
  createdAt: string;         // 作成日時
  approvedBy?: string;       // 承認者
  approvedAt?: string;       // 承認日時
  lastLoginAt?: string;      // 最終ログイン日時
}

// プロフィール補完データ
export interface ProfileCompletionData {
  // 補完必須項目
  fullName: string;              // 正式氏名
  fullNameKana: string;          // 氏名カナ
  profileImageUrl?: string;      // プロフィール画像
  birthday: string;              // 誕生日 (YYYY-MM-DD)
  catchPhrase: string;           // キャッチコピー
  profileDescription: string;     // プロフィール説明（200文字程度）
  neoMotivation: string;         // NEO参加動機
  
  // 任意項目
  birthPlace?: string;           // 出身地
  schools?: string;              // 出身校
  jobTitle?: string;             // 肩書き
  socialLinks?: {                // SNSリンク
    twitter?: string;
    instagram?: string;
    otherUrl?: string;
  };
  memberCategories?: MemberCategory[];    // 会員区分（複数選択）
  fukuokaConnections?: FukuokaConnection[]; // 福岡との繋がり（複数選択）
  
  // 補完状態
  isCompleted: boolean;          // 補完完了フラグ
  completedAt?: string;          // 補完完了日時
}

// CSV一括インポート用データ
export interface BulkRegistrationData {
  tempName: string;
  email: string;
  regionId: RegionId;
  role: UserRole;
  companyId?: string;
  companyName?: string; // 表示用（参照）
}

// CSV一括インポート結果
export interface BulkRegistrationResult {
  totalCount: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  createdUsers: string[]; // 作成されたユーザーIDの配列
}

// 事務局管理ダッシュボード用統計
export interface AdminDashboardStats {
  totalMembers: number;
  tentativeMembers: number;     // 仮登録状態のメンバー数
  activeMembers: number;        // 有効メンバー数
  pendingApprovals: number;     // 承認待ちプロフィール数
  completionRate: number;       // プロフィール補完率
  
  // 地域別統計
  regionStats: Record<RegionId, {
    total: number;
    tentative: number;
    active: number;
    completionRate: number;
  }>;
  
  // 最近の活動
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    regionId: RegionId;
    status: MemberStatus;
    createdAt: string;
  }>;
}

// メール通知用データ
export interface EmailNotificationData {
  type: 'tentative_registration' | 'approval_notification' | 'password_reset';
  recipientEmail: string;
  recipientName: string;
  data: {
    loginUrl?: string;
    temporaryPassword?: string;
    expiresAt?: string;
    approvalMessage?: string;
  };
}

// プロフィール承認リクエスト
export interface ProfileApprovalRequest {
  memberId: string;
  status: 'approve' | 'reject';
  approvalMessage?: string;
  approvedBy: string;
}

// CSVインポート関連型定義

// CSVファイル情報
export interface CSVFileInfo {
  filename: string;
  size: number;
  lastModified: number;
  mimeType: string;
}

// CSVファイルバリデーション結果
export interface CSVFileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: CSVFileInfo;
}

// CSV行データ
export interface CSVRowData {
  row: number;
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// CSVカラム定義
export interface CSVColumnDefinition {
  name: string;
  displayName: string;
  required: boolean;
  type: 'string' | 'email' | 'region' | 'role' | 'date' | 'phone';
  validation?: (value: string) => string | null; // null = valid, string = error message
  example?: string;
}

// CSVパース結果
export interface CSVParseResult {
  isValid: boolean;
  totalRows: number;
  validRows: CSVRowData[];
  invalidRows: CSVRowData[];
  headers: string[];
  summary: {
    totalCount: number;
    validCount: number;
    errorCount: number;
    warningCount: number;
  };
  globalErrors: string[]; // ファイル全体のエラー
}

// CSV一括インポート処理結果
export interface CSVImportResult {
  status: 'completed' | 'partial' | 'failed';
  processedAt: string;
  processingTimeMs: number;
  fileInfo: CSVFileInfo;
  parseResult: CSVParseResult;
  importSummary: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    skippedRows: number;
    duplicateEmails: number;
  };
  createdUsers: string[]; // 作成されたユーザーIDリスト
  failedRows: Array<{
    row: number;
    data: Record<string, string>;
    error: string;
    category: 'validation' | 'duplicate' | 'system' | 'database';
  }>;
  downloadUrls: {
    successReport: string; // 成功レポートCSVのURL
    errorReport: string;   // エラーレポートCSVのURL
  };
}

// CSV形式設定
export interface CSVFormatConfig {
  requiredColumns: CSVColumnDefinition[];
  optionalColumns: CSVColumnDefinition[];
  maxFileSize: number; // バイト
  allowedMimeTypes: string[];
  encoding: string;
  delimiter: string;
  hasHeader: boolean;
}

// CSVインポート設定
export interface CSVImportConfig {
  format: CSVFormatConfig;
  processingOptions: {
    batchSize: number;
    skipDuplicateEmails: boolean;
    sendNotificationEmails: boolean;
    autoGeneratePasswords: boolean;
    passwordExpiryDays: number;
    defaultStatus: MemberStatus;
  };
  validation: {
    strictMode: boolean; // true = エラーがあれば全体を停止
    maxErrorCount: number; // 最大許容エラー数
    requireAllColumns: boolean; // 全ての必須カラムの存在を要求
  };
}

// CSVインポートセッション（プレビュー用）
export interface CSVImportSession {
  sessionId: string;
  uploadedBy: string;
  uploadedAt: string;
  expiresAt: string;
  status: 'uploaded' | 'parsed' | 'previewed' | 'processed' | 'expired';
  fileInfo: CSVFileInfo;
  parseResult?: CSVParseResult;
  importResult?: CSVImportResult;
  config: CSVImportConfig;
}