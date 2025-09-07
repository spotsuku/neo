-- NEO Portalの本番環境用シードデータ
-- 管理者アカウントとサンプルデータの挿入

-- 管理者ユーザーの作成
-- パスワード: admin123 (本番環境では必ず変更してください)
-- ハッシュ化されたパスワード（bcrypt）
INSERT OR IGNORE INTO users (email, name, password_hash, role, status, email_verified) VALUES 
  ('admin@neo-portal.local', 'システム管理者', '$2b$10$rOvCFQjBqkf6HwLv1.YS.eCQSS6xN7fzY1r8vGJK7zOo2kL3mZ4eq', 'admin', 'active', TRUE);

-- 編集者ユーザーの作成
-- パスワード: editor123
INSERT OR IGNORE INTO users (email, name, password_hash, role, status, email_verified) VALUES 
  ('editor@neo-portal.local', 'コンテンツ編集者', '$2b$10$SomeHashedPasswordForEditor123456789abcdef', 'editor', 'active', TRUE);

-- 一般ユーザーの作成  
-- パスワード: user123
INSERT OR IGNORE INTO users (email, name, password_hash, role, status, email_verified) VALUES 
  ('user@neo-portal.local', '一般ユーザー', '$2b$10$AnotherHashedPasswordForUser123456789abcdef', 'user', 'active', TRUE);

-- ユーザープロフィールの作成
INSERT OR IGNORE INTO user_profiles (user_id, bio, department, position, preferences) VALUES 
  (1, 'NEO Portalのシステム管理者です。', 'IT部門', 'システム管理者', '{"theme":"dark","language":"ja","notifications":true}'),
  (2, 'コンテンツの作成と編集を担当しています。', 'マーケティング部', 'コンテンツエディター', '{"theme":"light","language":"ja","notifications":true}'),
  (3, 'プラットフォームを利用する一般ユーザーです。', '営業部', '営業担当', '{"theme":"light","language":"ja","notifications":false}');

-- システム設定の初期化
INSERT OR IGNORE INTO system_settings (key, value, description, is_public) VALUES 
  ('site_name', 'NEO Portal', 'サイト名', TRUE),
  ('site_description', 'Digital Transformation Platform for Modern Business', 'サイト説明', TRUE),
  ('site_version', '1.0.0', 'システムバージョン', TRUE),
  ('maintenance_mode', 'false', 'メンテナンスモード', FALSE),
  ('max_file_size', '10485760', '最大ファイルサイズ (10MB)', FALSE),
  ('allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip', '許可されるファイル形式', FALSE),
  ('session_timeout', '86400', 'セッションタイムアウト (24時間)', FALSE),
  ('enable_registration', 'false', '新規登録の有効化', FALSE),
  ('require_email_verification', 'true', 'メール認証の必須化', FALSE),
  ('password_min_length', '8', 'パスワード最小長', FALSE),
  ('max_login_attempts', '5', '最大ログイン試行回数', FALSE),
  ('lockout_duration', '1800', 'アカウントロック時間 (30分)', FALSE),
  ('backup_enabled', 'true', 'バックアップ機能の有効化', FALSE),
  ('backup_frequency', 'daily', 'バックアップ頻度', FALSE),
  ('log_retention_days', '90', 'ログ保持期間 (90日)', FALSE),
  ('enable_api_access', 'true', 'API アクセスの有効化', FALSE),
  ('rate_limit_requests', '100', 'レート制限 (1時間あたりのリクエスト数)', FALSE),
  ('enable_audit_log', 'true', '監査ログの有効化', FALSE),
  ('notification_email', 'admin@neo-portal.local', '通知メールアドレス', FALSE),
  ('smtp_host', '', 'SMTPサーバーホスト', FALSE),
  ('smtp_port', '587', 'SMTPサーバーポート', FALSE),
  ('smtp_user', '', 'SMTPユーザー名', FALSE),
  ('smtp_password', '', 'SMTPパスワード', FALSE),
  ('enable_ssl', 'true', 'SSL/TLSの有効化', FALSE);

-- 初期お知らせの作成
INSERT OR IGNORE INTO announcements (title, content, author_id, status, priority, target_roles) VALUES 
  (
    'NEO Portalへようこそ',
    'NEO Portalにアクセスいただき、ありがとうございます。このプラットフォームは、現代のビジネスにおけるデジタル変革を支援するために設計されています。

主な機能：
• ユーザー管理とアクセス制御
• セキュアなファイル管理
• リアルタイム通知システム
• 包括的な監査ログ
• API アクセスとintegration

ご不明な点がございましたら、システム管理者までお問い合わせください。',
    1,
    'published',
    'high',
    '["admin","editor","user"]'
  ),
  (
    'セキュリティガイドライン',
    'システムのセキュリティを保つため、以下のガイドラインをお守りください：

1. パスワードは定期的に変更してください
2. 不審なアクティビティを発見した場合は、すぐに管理者に報告してください
3. ファイルのアップロード時は、ウイルススキャンを実行してください
4. 機密情報の取り扱いには十分注意してください
5. ログアウト時は必ずセッションを終了してください

皆様のご協力により、安全なプラットフォーム運営が可能になります。',
    1,
    'published',
    'medium',
    '["admin","editor","user"]'
  ),
  (
    'システムメンテナンス予告',
    'システムの性能向上とセキュリティ強化のため、定期メンテナンスを実施いたします。

予定日時：毎月第1日曜日 02:00 - 04:00
影響範囲：システム全体（一時的にアクセスできなくなります）

メンテナンス中は以下の作業を行います：
• セキュリティアップデート
• データベース最適化
• ログファイルのアーカイブ
• システムバックアップ

ご不便をおかけしますが、ご理解とご協力をお願いいたします。',
    1,
    'published',
    'low',
    '["admin","editor","user"]'
  );

-- 初期API キーの作成（管理者用）
INSERT OR IGNORE INTO api_keys (user_id, name, key_hash, permissions, expires_at) VALUES 
  (
    1, 
    'Admin API Key', 
    '$2b$10$AdminAPIKeyHashForSystemAdministration123456789', 
    '["read","write","delete","admin"]',
    datetime('now', '+1 year')
  );

-- 監査ログの初期エントリ（システム初期化）
INSERT OR IGNORE INTO audit_logs (action, resource_type, resource_id, changes, ip_address, user_agent) VALUES 
  (
    'system_initialization',
    'system',
    'initial_setup',
    '{"action":"Database initialized with seed data","timestamp":"' || datetime('now') || '"}',
    '127.0.0.1',
    'NEO-Platform-Setup/1.0'
  );

-- 初期通知（管理者への歓迎メッセージ）
INSERT OR IGNORE INTO notifications (user_id, type, title, message, data) VALUES 
  (
    1,
    'welcome',
    'NEO Portalへようこそ',
    'システム管理者としてログインいただき、ありがとうございます。プラットフォームの設定を確認し、必要に応じてカスタマイズしてください。',
    '{"action":"check_settings","priority":"high"}'
  ),
  (
    2,
    'welcome', 
    '編集者アクセス許可',
    'コンテンツ編集者として登録されました。お知らせや記事の作成・編集が可能です。',
    '{"action":"start_editing","priority":"medium"}'
  ),
  (
    3,
    'welcome',
    'ユーザー登録完了',
    'NEO Portalへの登録が完了しました。プロフィール情報を更新して、プラットフォームをお楽しみください。',
    '{"action":"update_profile","priority":"low"}'
  );

-- データ整合性チェック用のビューを作成
CREATE VIEW IF NOT EXISTS user_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.status,
    u.created_at as user_created_at,
    up.department,
    up.position,
    COUNT(DISTINCT a.id) as announcement_count,
    COUNT(DISTINCT n.id) as notification_count,
    MAX(al.created_at) as last_activity
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN announcements a ON u.id = a.author_id
LEFT JOIN notifications n ON u.id = n.user_id  
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.email, u.name, u.role, u.status, u.created_at, up.department, up.position;

-- システム統計用のビューを作成
CREATE VIEW IF NOT EXISTS system_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
    (SELECT COUNT(*) FROM users WHERE role = 'editor') as editor_users,
    (SELECT COUNT(*) FROM users WHERE role = 'user') as regular_users,
    (SELECT COUNT(*) FROM announcements WHERE status = 'published') as published_announcements,
    (SELECT COUNT(*) FROM files) as total_files,
    (SELECT SUM(size) FROM files) as total_file_size,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > datetime('now', '-24 hours')) as recent_activities,
    (SELECT COUNT(*) FROM notifications WHERE read_at IS NULL) as unread_notifications,
    (SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')) as active_sessions;

-- インデックスの作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_announcements_status_priority ON announcements(status, priority);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON announcements(publish_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_expires ON api_keys(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- データベース統計の更新
ANALYZE;

-- 初期設定完了のマーカー
INSERT OR IGNORE INTO system_settings (key, value, description, is_public) VALUES 
  ('database_initialized', 'true', 'データベース初期化完了フラグ', FALSE),
  ('seed_data_version', '1.0.0', 'シードデータのバージョン', FALSE),
  ('initialization_date', datetime('now'), '初期化実行日時', FALSE);