-- NEO Digital Platform シードデータ
-- 開発・デモ用初期データ（外部キー制約対応版）

-- 1. テストユーザー (パスワードは全て "password123" のハッシュ)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, region_id, accessible_regions, is_active, created_at, updated_at) VALUES
('user_admin001', 'admin@neo-fukuoka.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '福岡管理者', 'owner', 'FUK', '["FUK","ISK","NIG"]', true, datetime('now'), datetime('now')),
('user_comp001', 'company1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '田中企業管理者', 'company_admin', 'FUK', '["FUK"]', true, datetime('now'), datetime('now')),
('user_comp002', 'company2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '佐藤企業管理者', 'company_admin', 'ISK', '["ISK"]', true, datetime('now'), datetime('now')),
('user_sec001', 'sec@neo-fukuoka.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '事務局担当者', 'secretariat', 'FUK', '["FUK","ISK","NIG"]', true, datetime('now'), datetime('now')),
('user_stu001', 'student1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '山田学生', 'student', 'FUK', '["FUK"]', true, datetime('now'), datetime('now')),
('user_stu002', 'student2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '鈴木学生', 'student', 'ISK', '["ISK"]', true, datetime('now'), datetime('now'));

-- 2. テスト企業
INSERT OR IGNORE INTO companies (id, region_id, name, industry, status, description, cs_step, display_order, created_at, updated_at) VALUES
('comp_001', 'FUK', '株式会社テックイノベーション', 'IT・ソフトウェア', 'active', 'AI・IoTソリューションを提供する福岡発のスタートアップ', 5, 1, datetime('now'), datetime('now')),
('comp_002', 'FUK', '九州マニュファクチャリング', '製造業', 'active', '伝統工芸とテクノロジーの融合で新商品を開発', 3, 2, datetime('now'), datetime('now')),
('comp_003', 'ISK', '石川食品イノベーション', '食品・農業', 'active', '地域食材を活用した新食品開発・ブランディング', 7, 1, datetime('now'), datetime('now')),
('comp_004', 'NIG', '新潟エネルギーソリューションズ', 'エネルギー', 'active', '再生可能エネルギーとスマートグリッドの研究開発', 4, 1, datetime('now'), datetime('now')),
('comp_005', 'FUK', 'フクオカデザインラボ', 'デザイン・クリエイティブ', 'active', 'UI/UXデザイン・ブランディングの専門企業', 6, 3, datetime('now'), datetime('now'));

-- 3. テストメンバー（外部キー制約対応）
INSERT OR IGNORE INTO members (id, region_id, user_id, name, furigana, email, company_id, selection_type, member_category, hero_step, class_number, team_number, attendance_number, status, attendance_rate, bio, created_at, updated_at) VALUES
('mem_001', 'FUK', 'user_stu001', '山田太郎', 'やまだたろう', 'student1@example.com', 'comp_001', 'company_selected', 'company_selected', 2, 1, 1, 1, 'active', 85.5, 'AIエンジニアを目指している大学院生', datetime('now'), datetime('now')),
('mem_002', 'FUK', NULL, '田中花子', 'たなかはなこ', 'hanako@example.com', 'comp_002', 'youth_selected', 'youth_selected', 3, 1, 1, 2, 'active', 92.3, 'デザイン思考でものづくりの革新を目指す', datetime('now'), datetime('now')),
('mem_003', 'ISK', NULL, '佐藤次郎', 'さとうじろう', 'jiro@example.com', 'comp_003', 'company_selected', 'company_selected', 1, 2, 2, 3, 'active', 78.9, '地域資源活用のマーケティング担当', datetime('now'), datetime('now')),
('mem_004', 'NIG', NULL, '鈴木美咲', 'すずきみさき', 'misaki@example.com', 'comp_004', 'youth_selected', 'youth_selected', 4, 3, 3, 4, 'active', 94.1, '持続可能エネルギーの研究者', datetime('now'), datetime('now')),
('mem_005', 'FUK', NULL, '高橋健太', 'たかはしけんた', 'kenta@example.com', 'comp_005', 'company_selected', 'corporate_member', 2, 1, 2, 5, 'active', 88.7, 'UI/UXデザイナー兼フロントエンド開発者', datetime('now'), datetime('now'));

-- 4. テストお知らせ
INSERT OR IGNORE INTO announcements (id, region_id, title, content, summary, author_id, target_roles, is_published, is_important, publish_date, created_at, updated_at) VALUES
('ann_001', 'FUK', '第3回NEO福岡セッション開催のお知らせ', 'NEO Digital Platform活用セッションを以下の日程で開催いたします。\n\n日時: 2024年9月15日(日) 13:00-17:00\n場所: 福岡市スタートアップカフェ\n\n今回のテーマ「地域DX推進戦略」について、各地域の取り組み事例を共有し、相互学習を深めます。', 'NEO福岡セッション - 地域DX推進戦略', 'user_sec001', '["student","company_admin"]', true, true, datetime('now'), datetime('now'), datetime('now')),
('ann_002', 'ALL', '新機能「メンバーカルテ」リリースのご案内', 'NEO Digital Platformに新機能「メンバーカルテ」を追加いたします。\n\n機能概要:\n- 個人プロフィール詳細表示\n- 学習進捗追跡\n- チーム編成情報\n\nリリース日: 2024年9月20日予定', 'メンバーカルテ機能リリース予定', 'user_admin001', '["student","company_admin","secretariat"]', true, false, datetime('now'), datetime('now'), datetime('now')),
('ann_003', 'ISK', '石川地域限定ワークショップのご案内', '石川地域メンバー限定でワークショップを開催します。\n\n内容: 地域ブランディング戦略\n講師: マーケティング専門家\n\n参加希望の方はお早めにお申し込みください。', '石川地域限定ワークショップ', 'user_sec001', '["student","company_admin"]', true, false, datetime('now'), datetime('now'), datetime('now'));

-- 5. テストクラス
INSERT OR IGNORE INTO classes (id, region_id, title, description, instructor_name, instructor_id, class_date, duration_minutes, location, class_type, max_participants, current_participants, is_mandatory, status, created_at, updated_at) VALUES
('cls_001', 'FUK', 'デザイン思考基礎講座', 'ユーザー中心設計の基本概念から実践的なワークショップまで', '田中デザイン講師', NULL, datetime('2024-09-20 10:00:00'), 120, '福岡市スタートアップカフェ', 'workshop', 20, 15, true, 'scheduled', datetime('now'), datetime('now')),
('cls_002', 'ISK', 'マーケティング戦略立案', '地域資源を活用したマーケティング戦略の立て方', '佐藤マーケティング専門家', NULL, datetime('2024-09-22 14:00:00'), 90, '石川県産業創造機構', 'lecture', 15, 8, true, 'scheduled', datetime('now'), datetime('now')),
('cls_003', 'ALL', 'NEOプラットフォーム活用法', 'デジタルプラットフォームを最大限活用するためのノウハウ', 'システム管理者', 'user_admin001', datetime('2024-09-25 13:00:00'), 60, 'オンライン', 'presentation', 50, 32, false, 'scheduled', datetime('now'), datetime('now'));

-- 6. テストプロジェクト
INSERT OR IGNORE INTO projects (id, region_id, title, description, summary, owner_id, status, priority, start_date, end_date, progress_percentage, tags, is_public, created_at, updated_at) VALUES
('prj_001', 'FUK', '福岡スマートシティ推進プロジェクト', 'IoTとAIを活用した持続可能な都市環境の構築を目指すプロジェクト', 'IoT・AI活用のスマートシティ', 'user_admin001', 'active', 'high', '2024-08-01', '2024-12-31', 35, '["IoT","AI","sustainability","smart-city"]', true, datetime('now'), datetime('now')),
('prj_002', 'ISK', '地域ブランド価値向上イニシアチブ', '石川県の伝統工芸と現代技術の融合による新ブランド創出', '伝統工芸×現代技術のブランド創出', 'user_comp002', 'active', 'medium', '2024-07-15', '2024-11-30', 58, '["branding","tradition","innovation"]', true, datetime('now'), datetime('now')),
('prj_003', 'ALL', 'NEO地域間連携プラットフォーム', '3地域の知見共有と相互学習を促進するデジタルプラットフォーム', '地域間連携プラットフォーム', 'user_admin001', 'planning', 'high', '2024-10-01', '2025-03-31', 15, '["collaboration","knowledge-sharing","platform"]', true, datetime('now'), datetime('now'));

-- 7. テスト委員会
INSERT OR IGNORE INTO committees (id, region_id, name, description, purpose, lead_id, status, meeting_frequency, next_meeting_date, member_count, is_open_recruitment, created_at, updated_at) VALUES
('com_001', 'FUK', 'イノベーション推進委員会', '地域のイノベーション活動を企画・推進する委員会', '福岡地域でのイノベーション創出と起業支援', 'user_admin001', 'active', '月1回', datetime('2024-09-30 15:00:00'), 8, true, datetime('now'), datetime('now')),
('com_002', 'ALL', 'デジタル化推進委員会', '各地域のデジタル化促進と知見共有を担う委員会', '3地域のDX推進と相互学習支援', 'user_sec001', 'active', '月2回', datetime('2024-09-28 10:00:00'), 12, true, datetime('now'), datetime('now')),
('com_003', 'ISK', '産学連携委員会', '地域の大学・研究機関と企業の連携促進', '産学連携による地域産業の高度化', 'user_comp002', 'active', '隔月1回', datetime('2024-10-15 14:00:00'), 6, false, datetime('now'), datetime('now'));

-- 8. テスト出欠データ
INSERT OR IGNORE INTO attendance (id, region_id, member_id, class_id, status, check_in_time, satisfaction_score, understanding_score, nps_score, comment, created_at) VALUES
('att_001', 'FUK', 'mem_001', 'cls_001', 'present', datetime('2024-09-20 09:55:00'), 5, 4, 80, '実践的な内容で非常に勉強になりました', datetime('now')),
('att_002', 'FUK', 'mem_002', 'cls_001', 'present', datetime('2024-09-20 10:02:00'), 4, 5, 75, 'ワークショップ形式が良かったです', datetime('now')),
('att_003', 'ISK', 'mem_003', 'cls_002', 'present', datetime('2024-09-22 13:58:00'), 5, 4, 90, 'マーケティング戦略が具体的で参考になった', datetime('now')),
('att_004', 'FUK', 'mem_001', 'cls_003', 'absent', NULL, NULL, NULL, NULL, '体調不良のため欠席', datetime('now')),
('att_005', 'NIG', 'mem_004', 'cls_003', 'present', datetime('2024-09-25 12:55:00'), 4, 4, 70, 'オンライン参加でしたが問題なく受講できました', datetime('now'));