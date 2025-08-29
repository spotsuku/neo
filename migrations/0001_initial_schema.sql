-- NEO Digital Platform 初期スキーマ
-- M0 MVP基盤用テーブル定義

-- ユーザー認証・権限管理
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('company_admin', 'student', 'secretariat', 'owner')),
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  accessible_regions TEXT NOT NULL, -- JSON配列形式 '["FUK","ISK"]'
  profile_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 企業管理
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG')),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  logo_url TEXT,
  description TEXT,
  cs_step INTEGER DEFAULT 1 CHECK (cs_step >= 1 AND cs_step <= 10),
  next_action TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- メンバー管理
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG')),
  user_id TEXT, -- users.idとの外部キー（オプション）
  name TEXT NOT NULL,
  furigana TEXT, -- ひらがな読み仮名（出席番号ソート用）
  email TEXT,
  company_id TEXT,
  selection_type TEXT CHECK (selection_type IN ('company_selected', 'youth_selected')),
  member_category TEXT CHECK (member_category IN (
    'youth_selected', 'company_selected', 'corporate_member', 'council_member',
    'club_member', 'supporting_partner', 'mentor', 'lecturer', 'communicator',
    'secretariat', 'observer', 'committee_advisor'
  )),
  hero_step INTEGER DEFAULT 0 CHECK (hero_step >= 0 AND hero_step <= 5),
  class_number INTEGER CHECK (class_number >= 1 AND class_number <= 3),
  team_number INTEGER CHECK (team_number >= 1 AND team_number <= 5),
  attendance_number INTEGER,
  profile_image TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  attendance_rate REAL DEFAULT 0.0,
  mentor_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (mentor_id) REFERENCES members(id)
);

-- CMS: お知らせ管理
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- 要約（一覧表示用）
  author_id TEXT NOT NULL,
  target_roles TEXT NOT NULL, -- JSON配列 '["student","company_admin"]'
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,
  publish_date DATETIME,
  expiry_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- CMS: クラス管理
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG')),
  title TEXT NOT NULL,
  description TEXT,
  instructor_name TEXT NOT NULL,
  instructor_id TEXT,
  class_date DATETIME NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  location TEXT,
  class_type TEXT CHECK (class_type IN ('lecture', 'workshop', 'presentation', 'discussion')),
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  materials_url TEXT,
  recording_url TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- CMS: プロジェクト管理
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT, -- 短い概要
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'suspended')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  start_date DATE,
  end_date DATE,
  budget REAL DEFAULT 0.0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  tags TEXT, -- JSON配列 '["innovation","AI","sustainability"]'
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- CMS: 委員会管理
CREATE TABLE IF NOT EXISTS committees (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  name TEXT NOT NULL,
  description TEXT,
  purpose TEXT, -- 設立目的
  lead_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dissolved')),
  meeting_frequency TEXT, -- '月1回', '隔週' など
  next_meeting_date DATETIME,
  member_count INTEGER DEFAULT 0,
  is_open_recruitment BOOLEAN NOT NULL DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES users(id)
);

-- 出欠管理
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG')),
  member_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  check_in_time DATETIME,
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  understanding_score INTEGER CHECK (understanding_score >= 1 AND understanding_score <= 5),
  nps_score INTEGER CHECK (nps_score >= -100 AND nps_score <= 100),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE(member_id, class_id)
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_region_role ON users(region_id, role);
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region_id);
CREATE INDEX IF NOT EXISTS idx_members_region ON members(region_id);
CREATE INDEX IF NOT EXISTS idx_members_company ON members(company_id);
CREATE INDEX IF NOT EXISTS idx_announcements_region_published ON announcements(region_id, is_published);
CREATE INDEX IF NOT EXISTS idx_classes_region_date ON classes(region_id, class_date);
CREATE INDEX IF NOT EXISTS idx_projects_region_status ON projects(region_id, status);
CREATE INDEX IF NOT EXISTS idx_committees_region_status ON committees(region_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);