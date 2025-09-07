// NEO Portal Database Types
// D1データベーステーブル型定義

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'owner' | 'secretariat' | 'company_admin' | 'student';
  region_id: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  accessible_regions: string; // JSON array format
  profile_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  key: 'owner' | 'secretariat' | 'company_admin' | 'student';
  label: string;
  description?: string;
  level: number;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
  is_active: boolean;
  expires_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_info?: string;
  ip_address?: string;
  expires_at: string;
  last_activity: string;
  is_revoked: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG';
  name: string;
  industry: string;
  status: 'active' | 'inactive' | 'pending';
  logo_url?: string;
  description?: string;
  cs_step: number;
  next_action?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG';
  user_id?: string;
  name: string;
  furigana?: string;
  email?: string;
  company_id?: string;
  selection_type?: 'company_selected' | 'youth_selected';
  member_category?: string;
  hero_step: number;
  class_number?: number;
  team_number?: number;
  attendance_number?: number;
  profile_image?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'graduated';
  attendance_rate: number;
  mentor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  published_at?: string;
  author_id: string;
  visibility: 'public' | 'role';
  target_roles?: string; // JSON array
  region_id: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  title: string;
  content: string;
  summary?: string;
  author_id: string;
  target_roles: string; // JSON array
  is_published: boolean;
  is_important: boolean;
  publish_date?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG';
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
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  title: string;
  description?: string;
  summary?: string;
  owner_id: string;
  status: 'planning' | 'active' | 'completed' | 'suspended';
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  end_date?: string;
  budget: number;
  progress_percentage: number;
  tags?: string; // JSON array
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Committee {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  name: string;
  description?: string;
  purpose?: string;
  lead_id: string;
  status: 'active' | 'inactive' | 'dissolved';
  meeting_frequency?: string;
  next_meeting_date?: string;
  member_count: number;
  is_open_recruitment: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  source: 'manual' | 'google';
  google_event_id?: string;
  region_id: 'FUK' | 'ISK' | 'NIG' | 'ALL';
  organizer_id: string;
  max_participants?: number;
  registration_required: boolean;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  region_id: 'FUK' | 'ISK' | 'NIG';
  member_id: string;
  class_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  satisfaction_score?: number;
  understanding_score?: number;
  nps_score?: number;
  comment?: string;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  status: 'attending' | 'absent' | 'maybe';
  registered_at: string;
  updated_at: string;
  notes?: string;
}

export interface File {
  id: string;
  r2_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  upload_purpose?: 'profile' | 'document' | 'material' | 'attachment';
  is_public: boolean;
  access_count: number;
  created_at: string;
}

export interface Audit {
  id: string;
  actor_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  meta_json?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// D1 Database interface (Cloudflare binding)
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
    changed_db: boolean;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Environment bindings for Cloudflare Workers
export interface CloudflareBindings {
  DB: D1Database;
  // Add other bindings here (KV, R2, etc.)
}

// Helper types for API responses
export type UserWithRoles = User & {
  roles: Role[];
  accessible_regions_parsed: string[];
};

export type NoticeWithAuthor = Notice & {
  author_name: string;
  target_roles_parsed: string[];
};

export type ProjectWithOwner = Project & {
  owner_name: string;
  tags_parsed: string[];
};

export type ClassWithInstructor = Class & {
  instructor?: User;
  attendance_count?: number;
};

export type CommitteeWithLead = Committee & {
  lead_name: string;
};

export type EventWithOrganizer = Event & {
  organizer_name: string;
  attendance_count?: number;
};

export type MemberWithDetails = Member & {
  company?: Company;
  user?: User;
  mentor?: Member;
};