// ユーザーロール定義
export type UserRole = 'company_admin' | 'academia_student' | 'staff' | 'owner';

// ユーザー情報
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string; // 会員企業管理者の場合
  memberId?: string;  // アカデミア生の場合
}

// 企業情報
export interface Company {
  id: string;
  name: string;
  industry: string;
  status: string;
  joinDate: string;
  csStep: number; // 企業CSステップ (1-10)
}

// メンバー情報
export interface Member {
  id: string;
  name: string;
  email: string;
  companyId: string;
  type: 'company_selected' | 'youth_selected'; // 企業選抜 | ユース選抜
  heroStep: number; // ヒーロージャーニーステップ (0-5)
  status: string;
}

// 出欠管理
export interface Attendance {
  id: string;
  memberId: string;
  lectureId: string;
  lectureTitle: string;
  lectureDate: string;
  instructor: string;
  status: 'present' | 'absent' | 'late';
  satisfactionScore?: number;  // 満足度 (1-5)
  understandingScore?: number; // 理解度 (1-5)
  npsScore?: number;          // NPS (-100 to 100)
  comment?: string;           // 自由記述
}

// 講義情報
export interface Lecture {
  id: string;
  title: string;
  theme: string;
  instructor: string;
  date: string;
  participantCount: number;
  avgSatisfaction: number;
  avgUnderstanding: number;
  avgNPS: number;
}

// ダッシュボード統計情報
export interface DashboardStats {
  totalLectures: number;
  totalParticipants: number;
  avgSatisfaction: number;
  avgUnderstanding: number;
  avgNPS: number;
  companyMemberCount: number;
  heroStepDistribution: Record<number, number>;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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