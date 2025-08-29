-- NEO Digital Platform シードデータ（外部キー制約無効版）
PRAGMA foreign_keys=OFF;

-- 1. テストユーザー
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, region_id, accessible_regions, is_active, created_at, updated_at) VALUES
('user_admin001', 'admin@neo-fukuoka.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '福岡管理者', 'owner', 'FUK', '["FUK","ISK","NIG"]', true, datetime('now'), datetime('now')),
('user_comp001', 'company1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '田中企業管理者', 'company_admin', 'FUK', '["FUK"]', true, datetime('now'), datetime('now')),
('user_sec001', 'sec@neo-fukuoka.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '事務局担当者', 'secretariat', 'FUK', '["FUK","ISK","NIG"]', true, datetime('now'), datetime('now')),
('user_stu001', 'student1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '山田学生', 'student', 'FUK', '["FUK"]', true, datetime('now'), datetime('now'));

-- 2. テスト企業
INSERT OR IGNORE INTO companies (id, region_id, name, industry, status, description, cs_step, display_order, created_at, updated_at) VALUES
('comp_001', 'FUK', '株式会社テックイノベーション', 'IT・ソフトウェア', 'active', 'AI・IoTソリューションを提供する福岡発のスタートアップ', 5, 1, datetime('now'), datetime('now')),
('comp_002', 'FUK', '九州マニュファクチャリング', '製造業', 'active', '伝統工芸とテクノロジーの融合で新商品を開発', 3, 2, datetime('now'), datetime('now')),
('comp_003', 'ISK', '石川食品イノベーション', '食品・農業', 'active', '地域食材を活用した新食品開発・ブランディング', 7, 1, datetime('now'), datetime('now'));

-- 3. テストお知らせ
INSERT OR IGNORE INTO announcements (id, region_id, title, content, summary, author_id, target_roles, is_published, is_important, publish_date, created_at, updated_at) VALUES
('ann_001', 'FUK', '第3回NEO福岡セッション開催のお知らせ', 'NEO Digital Platform活用セッションを開催いたします。', 'NEO福岡セッション - 地域DX推進戦略', 'user_sec001', '["student","company_admin"]', true, true, datetime('now'), datetime('now'), datetime('now')),
('ann_002', 'ALL', '新機能「メンバーカルテ」リリースのご案内', 'NEO Digital Platformに新機能「メンバーカルテ」を追加いたします。', 'メンバーカルテ機能リリース予定', 'user_admin001', '["student","company_admin","secretariat"]', true, false, datetime('now'), datetime('now'), datetime('now'));

-- 4. テストプロジェクト
INSERT OR IGNORE INTO projects (id, region_id, title, description, summary, owner_id, status, priority, start_date, end_date, progress_percentage, tags, is_public, created_at, updated_at) VALUES
('prj_001', 'FUK', '福岡スマートシティ推進プロジェクト', 'IoTとAIを活用した持続可能な都市環境の構築を目指すプロジェクト', 'IoT・AI活用のスマートシティ', 'user_admin001', 'active', 'high', '2024-08-01', '2024-12-31', 35, '["IoT","AI","sustainability","smart-city"]', true, datetime('now'), datetime('now')),
('prj_002', 'ALL', 'NEO地域間連携プラットフォーム', '3地域の知見共有と相互学習を促進するデジタルプラットフォーム', '地域間連携プラットフォーム', 'user_admin001', 'planning', 'high', '2024-10-01', '2025-03-31', 15, '["collaboration","knowledge-sharing","platform"]', true, datetime('now'), datetime('now'));

-- 再度外部キー制約を有効化
PRAGMA foreign_keys=ON;