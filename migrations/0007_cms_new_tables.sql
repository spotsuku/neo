-- CMS新規テーブル作成 - Step 6 Basic CMS
-- 既存テーブルと区別するため、新しいテーブル名を使用

-- 1. CMS クラス管理テーブル
CREATE TABLE IF NOT EXISTS cms_classes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('regular', 'intensive', 'workshop', 'seminar', 'online')),
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')),
  instructor_id TEXT NOT NULL,
  instructor_name TEXT NOT NULL,
  
  -- 日程関連
  start_date TEXT NOT NULL,
  end_date TEXT,
  start_time TEXT NOT NULL,
  duration_minutes TEXT NOT NULL,
  recurrence TEXT NOT NULL CHECK (recurrence IN ('none', 'weekly', 'biweekly', 'monthly')),
  max_participants TEXT NOT NULL,
  current_participants TEXT DEFAULT '0',
  
  -- 場所・形式
  location TEXT,
  is_online TEXT DEFAULT '0',
  meeting_url TEXT,
  meeting_password TEXT,
  
  -- 費用・条件
  fee TEXT DEFAULT '0',
  currency TEXT DEFAULT 'JPY',
  prerequisites TEXT,
  materials_required TEXT,
  
  -- CMS基本フィールド
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('public', 'authenticated', 'role_based', 'region_based', 'private')),
  visibility_roles TEXT DEFAULT '[]',
  visibility_regions TEXT DEFAULT '[]',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  
  -- メタデータ
  tags TEXT DEFAULT '[]',
  category TEXT,
  featured TEXT DEFAULT '0',
  priority TEXT DEFAULT '3',
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  
  -- 統計データ
  view_count TEXT DEFAULT '0',
  enrollment_count TEXT DEFAULT '0',
  
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 2. CMS クラス参加申し込みテーブル
CREATE TABLE IF NOT EXISTS cms_enrollments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  enrolled_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('none', 'pending', 'paid', 'refunded')),
  notes TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (class_id) REFERENCES cms_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(class_id, user_id)
);

-- 3. CMS プロジェクト管理テーブル
CREATE TABLE IF NOT EXISTS cms_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  
  -- プロジェクト分類
  type TEXT NOT NULL CHECK (type IN ('individual', 'group', 'team', 'company_wide', 'cross_regional')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  project_status TEXT NOT NULL CHECK (project_status IN ('planning', 'active', 'review', 'completed', 'cancelled', 'archived')),
  
  -- 責任者・メンバー
  manager_id TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  team_members TEXT DEFAULT '[]',
  max_members TEXT,
  
  -- スケジュール
  start_date TEXT NOT NULL,
  due_date TEXT,
  estimated_hours TEXT DEFAULT '0',
  actual_hours TEXT DEFAULT '0',
  
  -- 進捗・成果
  progress_percentage TEXT DEFAULT '0',
  deliverables TEXT,
  deliverable_urls TEXT DEFAULT '[]',
  
  -- 予算・リソース
  budget TEXT DEFAULT '0',
  currency TEXT DEFAULT 'JPY',
  resources_required TEXT,
  
  -- CMS基本フィールド
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('public', 'authenticated', 'role_based', 'region_based', 'private')),
  visibility_roles TEXT DEFAULT '[]',
  visibility_regions TEXT DEFAULT '[]',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  
  -- メタデータ
  tags TEXT DEFAULT '[]',
  category TEXT,
  featured TEXT DEFAULT '0',
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  
  -- 統計データ
  view_count TEXT DEFAULT '0',
  participant_count TEXT DEFAULT '0',
  
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- 4. CMS プロジェクトタスクテーブル
CREATE TABLE IF NOT EXISTS cms_project_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- 担当・期限
  assignee_id TEXT,
  assignee_name TEXT,
  due_date TEXT,
  
  -- 進捗
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_hours TEXT DEFAULT '0',
  actual_hours TEXT DEFAULT '0',
  
  -- 依存関係
  depends_on TEXT DEFAULT '[]',
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  
  FOREIGN KEY (project_id) REFERENCES cms_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- 5. CMS プロジェクト参加申請テーブル
CREATE TABLE IF NOT EXISTS cms_participation_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  
  FOREIGN KEY (project_id) REFERENCES cms_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

-- 6. CMS 委員会管理テーブル
CREATE TABLE IF NOT EXISTS cms_committees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  purpose TEXT,
  
  -- 委員会分類
  type TEXT NOT NULL CHECK (type IN ('standing', 'special', 'working_group', 'task_force', 'advisory')),
  committee_status TEXT NOT NULL CHECK (committee_status IN ('active', 'inactive', 'dissolved', 'suspended')),
  
  -- リーダーシップ
  chairperson_id TEXT NOT NULL,
  chairperson_name TEXT NOT NULL,
  vice_chair_id TEXT,
  vice_chair_name TEXT,
  secretary_id TEXT,
  secretary_name TEXT,
  
  -- メンバーシップ
  members TEXT DEFAULT '[]',
  max_members TEXT,
  
  -- 活動期間
  established_date TEXT NOT NULL,
  term_end_date TEXT,
  meeting_frequency TEXT,
  
  -- 会議情報
  regular_meeting_day TEXT,
  meeting_location TEXT,
  default_meeting_duration TEXT DEFAULT '120',
  
  -- 権限・責任
  decision_authority TEXT,
  reporting_to TEXT,
  budget_authority TEXT DEFAULT '0',
  
  -- CMS基本フィールド
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('public', 'authenticated', 'role_based', 'region_based', 'private')),
  visibility_roles TEXT DEFAULT '[]',
  visibility_regions TEXT DEFAULT '[]',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  
  -- メタデータ
  tags TEXT DEFAULT '[]',
  category TEXT,
  featured TEXT DEFAULT '0',
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  
  -- 統計データ
  view_count TEXT DEFAULT '0',
  meeting_count TEXT DEFAULT '0',
  member_count TEXT DEFAULT '0',
  
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (chairperson_id) REFERENCES users(id)
);

-- 7. CMS 委員会会議テーブル
CREATE TABLE IF NOT EXISTS cms_committee_meetings (
  id TEXT PRIMARY KEY,
  committee_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('regular', 'emergency', 'special', 'online', 'hybrid')),
  
  -- 日程・場所
  scheduled_date TEXT NOT NULL,
  duration_minutes TEXT NOT NULL,
  location TEXT,
  meeting_url TEXT,
  meeting_password TEXT,
  
  -- 議事・決議
  agenda TEXT,
  minutes TEXT,
  decisions TEXT DEFAULT '[]',
  
  -- 参加者
  attendees TEXT DEFAULT '[]',
  
  -- 資料・添付
  documents TEXT DEFAULT '[]',
  
  -- ステータス
  meeting_status TEXT NOT NULL CHECK (meeting_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  
  FOREIGN KEY (committee_id) REFERENCES cms_committees(id) ON DELETE CASCADE
);

-- 8. CMS 委員会決議事項テーブル
CREATE TABLE IF NOT EXISTS cms_committee_resolutions (
  id TEXT PRIMARY KEY,
  committee_id TEXT NOT NULL,
  meeting_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- 採決結果
  votes_for TEXT DEFAULT '0',
  votes_against TEXT DEFAULT '0',
  abstentions TEXT DEFAULT '0',
  
  -- 実施・フォローアップ
  implementation_status TEXT NOT NULL CHECK (implementation_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  responsible_member_id TEXT,
  due_date TEXT,
  
  decided_at TEXT NOT NULL,
  implemented_at TEXT,
  
  FOREIGN KEY (committee_id) REFERENCES cms_committees(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES cms_committee_meetings(id),
  FOREIGN KEY (responsible_member_id) REFERENCES users(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_cms_classes_status ON cms_classes(status);
CREATE INDEX IF NOT EXISTS idx_cms_classes_instructor ON cms_classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_cms_classes_start_date ON cms_classes(start_date);
CREATE INDEX IF NOT EXISTS idx_cms_classes_type_level ON cms_classes(type, level);

CREATE INDEX IF NOT EXISTS idx_cms_enrollments_class ON cms_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_cms_enrollments_user ON cms_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_cms_projects_status ON cms_projects(status);
CREATE INDEX IF NOT EXISTS idx_cms_projects_manager ON cms_projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_cms_projects_start_date ON cms_projects(start_date);

CREATE INDEX IF NOT EXISTS idx_cms_project_tasks_project ON cms_project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_cms_project_tasks_assignee ON cms_project_tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_cms_committees_status ON cms_committees(status);
CREATE INDEX IF NOT EXISTS idx_cms_committees_chairperson ON cms_committees(chairperson_id);
CREATE INDEX IF NOT EXISTS idx_cms_committees_established ON cms_committees(established_date);

CREATE INDEX IF NOT EXISTS idx_cms_committee_meetings_committee ON cms_committee_meetings(committee_id);
CREATE INDEX IF NOT EXISTS idx_cms_committee_meetings_date ON cms_committee_meetings(scheduled_date);