// NEO Digital Platform - Database Types
// M0 MVP基盤用型定義

// 地域コード
export type RegionId = 'FUK' | 'ISK' | 'NIG' | 'ALL';

// ユーザーロール
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

// ステータス型
export type ActiveStatus = 'active' | 'inactive';
export type CompanyStatus = 'active' | 'inactive' | 'pending';
export type MemberStatus = 'active' | 'inactive' | 'graduated';
export type AnnouncementStatus = 'draft' | 'published' | 'expired';
export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'suspended';
export type CommitteeStatus = 'active' | 'inactive' | 'dissolved';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// 基本エンティティ型
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  region_id: RegionId;
  accessible_regions: RegionId[]; // JSON配列から変換
  profile_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  region_id: RegionId;
  name: string;
  industry: string;
  status: CompanyStatus;
  logo_url?: string;
  description?: string;
  cs_step: number; // 1-10
  next_action?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  region_id: RegionId;
  user_id?: string;
  name: string;
  furigana?: string;
  email?: string;
  company_id?: string;
  selection_type?: SelectionType;
  member_category?: MemberCategory;
  hero_step: number; // 0-5
  class_number?: number; // 1-3
  team_number?: number; // 1-5
  attendance_number?: number;
  profile_image?: string;
  bio?: string;
  status: MemberStatus;
  attendance_rate: number;
  mentor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  region_id: RegionId;
  title: string;
  content: string;
  summary?: string;
  author_id: string;
  target_roles: UserRole[]; // JSON配列から変換
  is_published: boolean;
  is_important: boolean;
  publish_date?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  region_id: RegionId;
  title: string;
  description?: string;
  instructor_name: string;
  instructor_id?: string;
  class_date: string;
  duration_minutes: number;
  location?: string;
  class_type?: 'lecture' | 'workshop' | 'presentation' | 'discussion';
  max_participants?: number;
  current_participants: number;
  materials_url?: string;
  recording_url?: string;
  is_mandatory: boolean;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  region_id: RegionId;
  title: string;
  description?: string;
  summary?: string;
  owner_id: string;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  end_date?: string;
  budget: number;
  progress_percentage: number;
  tags?: string[]; // JSON配列から変換
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Committee {
  id: string;
  region_id: RegionId;
  name: string;
  description?: string;
  purpose?: string;
  lead_id: string;
  status: CommitteeStatus;
  meeting_frequency?: string;
  next_meeting_date?: string;
  member_count: number;
  is_open_recruitment: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  region_id: RegionId;
  member_id: string;
  class_id: string;
  status: AttendanceStatus;
  check_in_time?: string;
  satisfaction_score?: number; // 1-5
  understanding_score?: number; // 1-5
  nps_score?: number; // -100 to 100
  comment?: string;
  created_at: string;
}

// リクエスト/レスポンス型
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  region_id: RegionId;
  accessible_regions: RegionId[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  expires_at: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  summary?: string;
  target_roles: UserRole[];
  is_important?: boolean;
  publish_date?: string;
  expiry_date?: string;
}

export interface UpdateAnnouncementRequest extends Partial<CreateAnnouncementRequest> {
  is_published?: boolean;
}

// 統計・分析用型
export interface DashboardStats {
  region_id: RegionId;
  total_members: number;
  active_members: number;
  total_companies: number;
  active_companies: number;
  recent_announcements: number;
  upcoming_classes: number;
  active_projects: number;
  active_committees: number;
}

// ページネーション型
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// フィルタ型
export interface AnnouncementFilter extends PaginationParams {
  region_id?: RegionId;
  is_published?: boolean;
  is_important?: boolean;
  author_id?: string;
  target_role?: UserRole;
}

export interface MemberFilter extends PaginationParams {
  region_id?: RegionId;
  company_id?: string;
  status?: MemberStatus;
  class_number?: number;
  team_number?: number;
}

// エラー型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}