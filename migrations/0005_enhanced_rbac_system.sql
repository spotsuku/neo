-- Migration: Enhanced RBAC System Integration
-- 旧バージョン（neo-admin-platform）の複雑な権限システムを統合

-- 1. 拡張権限ロールテーブル
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, -- admin, editor, user, student, company_admin, committee_member
  display_name TEXT NOT NULL, -- 表示用名称
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0, -- 権限レベル（数値が高いほど権限大）
  is_system_role BOOLEAN DEFAULT FALSE, -- システム標準ロールかどうか
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 詳細権限定義テーブル
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, -- users.create, admin.dashboard, students.manage
  resource TEXT NOT NULL, -- users, admin, students, companies, committees
  action TEXT NOT NULL, -- create, read, update, delete, manage, view
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. ロール-権限関連テーブル
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- 4. ユーザー-ロール関連テーブル（複数ロール対応）
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_by INTEGER, -- 誰がロールを付与したか
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- ロールの有効期限（オプション）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

-- 5. 組織・部門テーブル（旧バージョンのcompany/department機能）
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('company', 'department', 'committee', 'class')),
  parent_id INTEGER, -- 階層構造対応
  description TEXT,
  settings TEXT, -- JSON形式の設定
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES organizations(id)
);

-- 6. ユーザー-組織関連テーブル
CREATE TABLE IF NOT EXISTS user_organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  role_in_org TEXT, -- 組織内での役割
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  left_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 7. 拡張ユーザープロフィール（旧バージョンの学生・会社情報統合）
ALTER TABLE user_profiles ADD COLUMN student_id TEXT; -- 学籍番号
ALTER TABLE user_profiles ADD COLUMN employee_id TEXT; -- 社員番号  
ALTER TABLE user_profiles ADD COLUMN academic_year INTEGER; -- 学年
ALTER TABLE user_profiles ADD COLUMN major TEXT; -- 専攻
ALTER TABLE user_profiles ADD COLUMN company_id INTEGER REFERENCES organizations(id); -- 所属会社
ALTER TABLE user_profiles ADD COLUMN committee_roles TEXT; -- JSON: 委員会での役割

-- 8. 基本ロールと権限の挿入
INSERT OR IGNORE INTO roles (name, display_name, description, level, is_system_role) VALUES
  ('super_admin', 'スーパー管理者', 'システム全体の完全な権限', 100, TRUE),
  ('admin', 'システム管理者', 'システム管理権限', 90, TRUE),
  ('company_admin', '企業管理者', '企業関連の管理権限', 80, TRUE),
  ('committee_admin', '委員会管理者', '委員会の管理権限', 70, TRUE),
  ('editor', 'コンテンツ編集者', 'コンテンツ編集権限', 60, TRUE),
  ('teacher', '教師', '授業・学生管理権限', 50, TRUE),
  ('committee_member', '委員会メンバー', '委員会活動権限', 40, TRUE),
  ('student_leader', '学生リーダー', 'クラス代表権限', 30, TRUE),
  ('student', '学生', '学生用権限', 20, TRUE),
  ('company_user', '企業ユーザー', '企業向け権限', 25, TRUE),
  ('user', '一般ユーザー', '基本的な閲覧権限', 10, TRUE);

-- 9. 基本権限の定義
INSERT OR IGNORE INTO permissions (name, resource, action, description) VALUES
  -- システム管理
  ('system.manage', 'system', 'manage', 'システム全体の管理'),
  ('system.settings', 'system', 'settings', 'システム設定の変更'),
  
  -- ユーザー管理
  ('users.create', 'users', 'create', 'ユーザーの作成'),
  ('users.read', 'users', 'read', 'ユーザー情報の閲覧'),
  ('users.update', 'users', 'update', 'ユーザー情報の更新'),
  ('users.delete', 'users', 'delete', 'ユーザーの削除'),
  ('users.manage', 'users', 'manage', 'ユーザーの完全管理'),
  
  -- 管理ダッシュボード
  ('admin.dashboard', 'admin', 'view', '管理ダッシュボードの表示'),
  ('admin.analytics', 'admin', 'view', 'システム分析の表示'),
  ('admin.monitoring', 'admin', 'view', 'システム監視'),
  
  -- 学生管理（旧バージョン対応）
  ('students.manage', 'students', 'manage', '学生の管理'),
  ('students.grades', 'students', 'grades', '成績管理'),
  ('classes.manage', 'classes', 'manage', 'クラス管理'),
  
  -- 企業管理（旧バージョン対応）
  ('companies.manage', 'companies', 'manage', '企業管理'),
  ('companies.dashboard', 'companies', 'view', '企業ダッシュボード'),
  
  -- 委員会管理（旧バージョン対応）
  ('committees.manage', 'committees', 'manage', '委員会管理'),
  ('committees.member', 'committees', 'member', '委員会メンバー'),
  
  -- イベント管理（旧バージョン対応）
  ('events.create', 'events', 'create', 'イベント作成'),
  ('events.manage', 'events', 'manage', 'イベント管理'),
  ('events.attend', 'events', 'attend', 'イベント参加'),
  
  -- ファイル管理（旧バージョン対応）
  ('files.upload', 'files', 'upload', 'ファイルアップロード'),
  ('files.manage', 'files', 'manage', 'ファイル管理'),
  
  -- プロジェクト管理（旧バージョン対応）
  ('projects.create', 'projects', 'create', 'プロジェクト作成'),
  ('projects.manage', 'projects', 'manage', 'プロジェクト管理'),
  ('projects.view', 'projects', 'view', 'プロジェクト閲覧'),
  
  -- お知らせ管理
  ('announcements.create', 'announcements', 'create', 'お知らせ作成'),
  ('announcements.manage', 'announcements', 'manage', 'お知らせ管理');

-- 10. ロールと権限の関連付け
-- スーパー管理者（全権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin';

-- システム管理者（システム関連権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' AND p.name IN (
  'system.settings', 'users.manage', 'admin.dashboard', 'admin.analytics', 'admin.monitoring',
  'announcements.manage', 'files.manage'
);

-- 企業管理者（企業関連権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'company_admin' AND p.name IN (
  'companies.manage', 'companies.dashboard', 'users.read', 'projects.manage', 'events.manage'
);

-- 委員会管理者（委員会関連権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'committee_admin' AND p.name IN (
  'committees.manage', 'events.manage', 'announcements.create', 'files.upload'
);

-- 教師（学生・授業管理権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'teacher' AND p.name IN (
  'students.manage', 'students.grades', 'classes.manage', 'announcements.create'
);

-- 学生（基本権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'student' AND p.name IN (
  'events.attend', 'files.upload', 'projects.view'
);

-- 企業ユーザー（企業向け権限）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'company_user' AND p.name IN (
  'companies.dashboard', 'projects.view', 'events.attend'
);

-- 11. インデックス作成
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org ON user_organizations(organization_id);

-- 12. 権限チェック用のビューを作成
CREATE VIEW IF NOT EXISTS user_permissions_view AS
SELECT DISTINCT 
    u.id as user_id,
    u.email,
    u.name as user_name,
    r.name as role_name,
    r.display_name as role_display_name,
    r.level as role_level,
    p.name as permission_name,
    p.resource,
    p.action,
    ur.expires_at as role_expires_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
AND u.status = 'active';

-- 13. 旧usersテーブルとの互換性保持
-- 既存のroleカラムに基づいてuser_rolesテーブルにデータを移行
INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, u.created_at
FROM users u
JOIN roles r ON u.role = r.name
WHERE r.is_system_role = TRUE;

-- 14. 組織の初期データ
INSERT OR IGNORE INTO organizations (name, type, description) VALUES
  ('NEOポータル', 'company', 'メインプラットフォーム'),
  ('IT部門', 'department', 'システム開発部門'),
  ('マーケティング部', 'department', 'マーケティング部門'),
  ('営業部', 'department', '営業部門'),
  ('システム委員会', 'committee', 'システム運営委員会'),
  ('コンテンツ委員会', 'committee', 'コンテンツ管理委員会');