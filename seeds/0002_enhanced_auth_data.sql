-- NEO Digital Platform Enhanced Auth Seed Data
-- 新しい認証システム用のサンプルデータ

-- 既存ユーザーのパスワードをArgon2idハッシュに更新（パスワード: password123）
-- 注意: 実際のArgon2idハッシュは@node-rs/argon2ライブラリで生成される
-- ここではテスト用の固定値を使用（開発環境のみ）

UPDATE users SET 
  password_hash = '$argon2id$v=19$m=19456,t=2,p=1$randomsalthere$hashedpasswordhere',
  password_changed_at = datetime('now'),
  login_attempts = 0,
  totp_enabled = 0,
  email_verified = 1
WHERE id IN ('user_owner_01', 'user_sec_fuk', 'user_comp_admin', 'user_student_01');

-- 開発用のセキュリティログエントリ
INSERT OR REPLACE INTO security_logs (id, user_id, action, ip_address, user_agent, risk_level, created_at) VALUES
('sec_001', 'user_owner_01', 'LOGIN_SUCCESS', '127.0.0.1', 'Mozilla/5.0 (Development)', 'LOW', datetime('now', '-1 hour')),
('sec_002', 'user_sec_fuk', 'LOGIN_SUCCESS', '127.0.0.1', 'Mozilla/5.0 (Development)', 'LOW', datetime('now', '-30 minutes')),
('sec_003', NULL, 'LOGIN_FAILED', '192.168.1.100', 'Mozilla/5.0 (Unknown)', 'MEDIUM', datetime('now', '-15 minutes'));

-- 開発用の有効セッション
INSERT OR REPLACE INTO sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, session_type, is_revoked) VALUES
('session_dev_01', 'user_owner_01', 'hash_owner_refresh_token', 'Development Browser', '127.0.0.1', datetime('now', '+7 days'), 'web', 0),
('session_dev_02', 'user_sec_fuk', 'hash_secretariat_refresh_token', 'Development Browser', '127.0.0.1', datetime('now', '+7 days'), 'web', 0);

-- レート制限テスト用データ（既にリセット済み状態）
INSERT OR REPLACE INTO rate_limits (id, key_type, key_value, endpoint, attempts, reset_at) VALUES
('rl_test_01', 'ip', '127.0.0.1', '/auth/login', 1, datetime('now', '+15 minutes')),
('rl_test_02', 'email', 'test@example.com', '/auth/register', 1, datetime('now', '+1 hour'));

-- パスワードリセット用期限切れトークンサンプル
INSERT OR REPLACE INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at) VALUES
('pwrt_expired_01', 'user_student_01', 'expired_token_hash_sample', datetime('now', '-1 day'), NULL),
('pwrt_used_01', 'user_comp_admin', 'used_token_hash_sample', datetime('now', '+1 day'), datetime('now', '-1 hour'));

-- TOTP設定サンプル（無効化状態）
INSERT OR REPLACE INTO user_totp (id, user_id, secret_key, backup_codes, is_enabled, last_used_counter) VALUES
('totp_dev_01', 'user_owner_01', 'DEVELOPMENT_SECRET_KEY_BASE32', '[]', 0, 0);

-- 招待トークンサンプル
INSERT OR REPLACE INTO invitation_tokens (id, email, token_hash, invited_by, role, region_id, expires_at, used_at) VALUES
('inv_sample_01', 'new.user@example.com', 'invitation_token_hash_sample', 'user_sec_fuk', 'company_admin', 'FUK', datetime('now', '+7 days'), NULL),
('inv_expired_01', 'expired@example.com', 'expired_invitation_hash', 'user_sec_fuk', 'student', 'FUK', datetime('now', '-1 day'), NULL);

-- ユーザーデバイス管理サンプル
INSERT OR REPLACE INTO user_devices (id, user_id, device_name, device_fingerprint, ip_address, user_agent, last_active, is_trusted) VALUES
('device_01', 'user_owner_01', 'Development Chrome', 'dev_fingerprint_001', '127.0.0.1', 'Mozilla/5.0 Chrome/Development', datetime('now'), 1),
('device_02', 'user_sec_fuk', 'Development Firefox', 'dev_fingerprint_002', '127.0.0.1', 'Mozilla/5.0 Firefox/Development', datetime('now'), 1);