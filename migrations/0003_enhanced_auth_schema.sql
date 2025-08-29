-- NEO Digital Platform Enhanced Auth Schema
-- JWT認証、2FA、セキュリティ機能のためのスキーマ拡張

-- パスワードリセット用トークン管理
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL, -- SHA-256ハッシュ値
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- TOTP 2FA設定
CREATE TABLE IF NOT EXISTS user_totp (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  secret_key TEXT NOT NULL, -- Base32エンコード済み秘密鍵
  backup_codes TEXT, -- JSON配列 (ハッシュ化済み)
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  last_used_counter INTEGER DEFAULT 0, -- リプレイ攻撃防止
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  enabled_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- レート制限用カウンター
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  key_type TEXT NOT NULL, -- 'ip', 'user', 'email'
  key_value TEXT NOT NULL, -- IPアドレス、ユーザーID、メールアドレス
  endpoint TEXT NOT NULL, -- '/auth/login', '/auth/register'など
  attempts INTEGER NOT NULL DEFAULT 1,
  reset_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key_type, key_value, endpoint)
);

-- 招待トークン（ユーザー招待用）
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'secretariat', 'company_admin', 'student')),
  region_id TEXT NOT NULL CHECK (region_id IN ('FUK', 'ISK', 'NIG', 'ALL')),
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  used_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invited_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);

-- デバイス管理（セッション詳細）
CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT, -- "Chrome on Windows 11"
  device_fingerprint TEXT, -- ブラウザフィンガープリント
  ip_address TEXT,
  user_agent TEXT,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- セキュリティログ（詳細な監査）
CREATE TABLE IF NOT EXISTS security_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', '2FA_ENABLED', etc.
  ip_address TEXT,
  user_agent TEXT,
  details TEXT, -- JSON形式の詳細情報
  risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- usersテーブルの拡張カラム追加（SQLite制限対応）
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN login_attempts INTEGER;
ALTER TABLE users ADD COLUMN locked_until DATETIME;
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;

-- デフォルト値を手動で設定
UPDATE users SET password_changed_at = CURRENT_TIMESTAMP WHERE password_changed_at IS NULL;
UPDATE users SET login_attempts = 0 WHERE login_attempts IS NULL;
UPDATE users SET totp_enabled = 0 WHERE totp_enabled IS NULL;
UPDATE users SET email_verified = 0 WHERE email_verified IS NULL;

-- sessionsテーブル拡張
ALTER TABLE sessions ADD COLUMN device_id TEXT;
ALTER TABLE sessions ADD COLUMN session_type TEXT;
UPDATE sessions SET session_type = 'web' WHERE session_type IS NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_totp_user ON user_totp(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key_type, key_value, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires ON invitation_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_locked ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id);