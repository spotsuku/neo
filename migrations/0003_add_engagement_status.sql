-- Migration: Add engagement_status column to users table
-- 関与度ステータスフィールドの追加（4区分対応）

-- users テーブルに engagement_status 列を追加
ALTER TABLE users 
ADD COLUMN engagement_status TEXT 
CHECK (engagement_status IN ('core', 'active', 'peripheral', 'at_risk')) 
DEFAULT 'active';

-- 既存データのマイグレーション（既存のstatusから推定）
UPDATE users 
SET engagement_status = CASE 
    WHEN status = 'active' THEN 'active'
    WHEN status = 'inactive' THEN 'peripheral' 
    WHEN status = 'suspended' THEN 'at_risk'
    ELSE 'active'
END
WHERE engagement_status IS NULL;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_engagement_status ON users(engagement_status);

-- 監査ログ記録
INSERT INTO audit_logs (
    action,
    resource_type, 
    resource_id,
    user_id,
    details,
    created_at
) VALUES (
    'migration_engagement_status',
    'schema',
    'users',
    1,
    '{"description": "Added engagement_status column with 4-tier classification", "migration_version": "0003"}',
    datetime('now')
);