-- NEO Digital Platform Enhanced Schema
-- 新要件対応: roles, user_roles, sessions, files, events, audits テーブル追加

-- ロール定義テーブル
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL CHECK (key IN ('owner', 'secretariat', 'company_admin', 'student')),
  label TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1, -- 権限レベル (1=最低, 4=最高)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー・ロール関連テーブル
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  device_info TEXT, -- ブラウザ・OS情報
  ip_address TEXT,
  expires_at DATETIME NOT NULL,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- usersテーブルのstatusカラム追加（既存テーブルの拡張）
-- ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended'));

-- お知らせテーブル（既存のannouncementsを拡張してnotices風に）
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at DATETIME,
  author_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'role')),
  target_roles TEXT, -- JSON配列 '["student","company_admin"]'
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  is_important BOOLEAN NOT NULL DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- ファイル管理テーブル（R2連携）
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE, -- R2オブジェクトキー
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  upload_purpose TEXT CHECK (upload_purpose IN ('profile', 'document', 'material', 'attachment')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  access_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- イベント管理テーブル
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  location TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'google')),
  google_event_id TEXT, -- Googleカレンダー連携用
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  organizer_id TEXT NOT NULL,
  max_participants INTEGER,
  registration_required BOOLEAN NOT NULL DEFAULT false,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id)
);

-- 出席管理テーブル（既存のattendanceと統合）
-- イベント出席を追加
CREATE TABLE IF NOT EXISTS event_attendance (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('attending', 'absent', 'maybe')),
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  actor_id TEXT, -- 実行者（NULLの場合はシステム）
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT等
  entity TEXT NOT NULL, -- テーブル名/リソース名
  entity_id TEXT, -- 対象レコードのID
  meta_json TEXT, -- 追加メタデータ（JSON形式）
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- 新しいインデックス作成
CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(key);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(published_at);
CREATE INDEX IF NOT EXISTS idx_notices_visibility ON notices(visibility);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_r2_key ON files(r2_key);
CREATE INDEX IF NOT EXISTS idx_events_region_starts ON events(region_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_actor ON audits(actor_id);
CREATE INDEX IF NOT EXISTS idx_audits_entity ON audits(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at);

-- コメント: 
-- 1. usersテーブルは既存のものを使用（statusカラムは後で追加）
-- 2. classesテーブルは既存のものを継続使用
-- 3. projectsテーブルは既存のものを継続使用
-- 4. committeesテーブルは既存のものを継続使用
-- 5. attendanceテーブルは既存（クラス出席）+ event_attendance（イベント出席）で分離