-- NEO Digital Platform 初期データシード
-- 4ロール代表ユーザー + ダミーデータ投入

-- ロール定義データ
INSERT OR REPLACE INTO roles (id, key, label, description, level) VALUES 
('role_owner', 'owner', 'オーナー', '全システムの最高管理者権限', 4),
('role_secretariat', 'secretariat', '事務局', '各地域の運営管理権限', 3),
('role_company_admin', 'company_admin', '企業管理者', '所属企業の管理権限', 2),
('role_student', 'student', '学生', '基本的な学習・参加権限', 1);

-- 4ロール代表ユーザー（パスワードは全て "password123"）
-- password_hash は bcrypt でハッシュ化済み
INSERT OR REPLACE INTO users (id, email, password_hash, name, role, region_id, accessible_regions, is_active) VALUES 
('user_owner_01', 'owner@neo-digital.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '山田太郎', 'owner', 'ALL', '["FUK","ISK","NIG","ALL"]', 1),
('user_sec_fuk', 'secretariat-fuk@neo-digital.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '佐藤花子', 'secretariat', 'FUK', '["FUK"]', 1),
('user_comp_admin', 'company.admin@example-corp.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '田中次郎', 'company_admin', 'FUK', '["FUK"]', 1),
('user_student_01', 'student01@neo-digital.jp', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '鈴木三郎', 'student', 'FUK', '["FUK"]', 1);

-- ユーザー・ロール関連付け
INSERT OR REPLACE INTO user_roles (id, user_id, role_id, assigned_by, is_active) VALUES 
('ur_01', 'user_owner_01', 'role_owner', 'user_owner_01', 1),
('ur_02', 'user_sec_fuk', 'role_secretariat', 'user_owner_01', 1),
('ur_03', 'user_comp_admin', 'role_company_admin', 'user_sec_fuk', 1),
('ur_04', 'user_student_01', 'role_student', 'user_sec_fuk', 1);

-- 企業データ
INSERT OR REPLACE INTO companies (id, region_id, name, industry, status, description, cs_step) VALUES 
('company_01', 'FUK', '株式会社サンプル', 'IT・ソフトウェア', 'active', '福岡を拠点とするソフトウェア開発会社', 3),
('company_02', 'FUK', '九州商事株式会社', '商社・貿易', 'active', '九州地域の総合商社', 2),
('company_03', 'ISK', '石川テクノロジー', '製造業', 'active', '精密機械製造メーカー', 4);

-- メンバーデータ
INSERT OR REPLACE INTO members (id, region_id, user_id, name, furigana, email, company_id, selection_type, member_category, hero_step, class_number, team_number, attendance_number) VALUES 
('member_01', 'FUK', 'user_comp_admin', '田中次郎', 'たなかじろう', 'company.admin@example-corp.jp', 'company_01', 'company_selected', 'company_selected', 2, 1, 1, 1001),
('member_02', 'FUK', 'user_student_01', '鈴木三郎', 'すずきさぶろう', 'student01@neo-digital.jp', NULL, 'youth_selected', 'youth_selected', 1, 1, 1, 1002),
('member_03', 'FUK', NULL, '高橋四郎', 'たかはししろう', 'takahashi@example.com', 'company_02', 'company_selected', 'company_selected', 3, 2, 2, 2001);

-- お知らせデータ
INSERT OR REPLACE INTO notices (id, title, body, published_at, author_id, visibility, target_roles, region_id, is_important) VALUES 
('notice_01', 'NEOデジタルプラットフォーム リリースのお知らせ', 'NEOデジタルプラットフォームが正式にリリースされました。全ユーザーがアクセス可能です。', datetime('now'), 'user_owner_01', 'public', '["owner","secretariat","company_admin","student"]', 'ALL', 1),
('notice_02', '第1回クラス開催について', '来週火曜日に第1回のクラスを開催します。詳細は別途メールにてお送りします。', datetime('now'), 'user_sec_fuk', 'role', '["company_admin","student"]', 'FUK', 0),
('notice_03', 'システムメンテナンスのお知らせ', '来月第1土曜日にシステムメンテナンスを実施予定です。', datetime('now'), 'user_sec_fuk', 'public', '["owner","secretariat","company_admin","student"]', 'FUK', 0);

-- クラスデータ
INSERT OR REPLACE INTO classes (id, region_id, title, description, instructor_name, instructor_id, class_date, duration_minutes, location, class_type, max_participants, is_mandatory, status) VALUES 
('class_01', 'FUK', 'デジタルトランスフォーメーション基礎', 'DXの基本概念と企業への導入方法について学習', '山田講師', 'user_sec_fuk', datetime('now', '+7 days'), 120, '福岡会場A', 'lecture', 30, 1, 'scheduled'),
('class_02', 'FUK', 'プロジェクトマネジメント実践', 'アジャイル開発手法を用いたプロジェクト管理', '佐藤講師', 'user_sec_fuk', datetime('now', '+14 days'), 90, '福岡会場B', 'workshop', 20, 1, 'scheduled');

-- プロジェクトデータ
INSERT OR REPLACE INTO projects (id, region_id, title, description, summary, owner_id, status, priority, start_date, end_date, progress_percentage, tags, is_public) VALUES 
('project_01', 'FUK', '地域DX推進プロジェクト', '福岡地域の中小企業向けDX支援プログラムの企画・運営', '地域企業のデジタル化支援', 'user_sec_fuk', 'active', 'high', date('now'), date('now', '+6 months'), 25, '["DX","地域活性化","中小企業支援"]', 1),
('project_02', 'ALL', 'NEOプラットフォーム機能拡張', 'システムの新機能開発と既存機能改善', 'プラットフォーム改善', 'user_owner_01', 'planning', 'medium', date('now'), date('now', '+3 months'), 10, '["開発","機能拡張","UX改善"]', 0);

-- 委員会データ
INSERT OR REPLACE INTO committees (id, region_id, name, description, purpose, lead_id, status, meeting_frequency, member_count, is_open_recruitment) VALUES 
('committee_01', 'FUK', 'カリキュラム検討委員会', '教育プログラムの企画・改善を行う委員会', '質の高い教育コンテンツの提供', 'user_sec_fuk', 'active', '月1回', 8, 0),
('committee_02', 'ALL', 'デジタル戦略委員会', '全地域のデジタル戦略立案・推進', 'デジタル人材育成の戦略策定', 'user_owner_01', 'active', '隔週', 12, 0);

-- イベントデータ  
INSERT OR REPLACE INTO events (id, title, description, starts_at, ends_at, location, source, region_id, organizer_id, max_participants, registration_required, is_cancelled) VALUES 
('event_01', 'NEO Digital Platform キックオフイベント', 'プラットフォーム開始記念イベント', '2025-09-05 10:00:00', '2025-09-05 13:00:00', '福岡国際会議場', 'manual', 'FUK', 'user_sec_fuk', 100, 1, 0),
('event_02', '月次定例会議', '各地域の進捗共有と課題検討', '2025-09-10 14:00:00', '2025-09-10 16:00:00', 'オンライン', 'manual', 'ALL', 'user_owner_01', 50, 0, 0);

-- 出席データ（サンプル）
INSERT OR REPLACE INTO attendance (id, region_id, member_id, class_id, status, satisfaction_score, understanding_score, comment) VALUES 
('attendance_01', 'FUK', 'member_01', 'class_01', 'present', 4, 4, 'とても分かりやすい講義でした'),
('attendance_02', 'FUK', 'member_02', 'class_01', 'present', 5, 3, '実践的な内容で勉強になりました');

-- イベント出席データ
INSERT OR REPLACE INTO event_attendance (id, event_id, user_id, status, notes) VALUES 
('ea_01', 'event_01', 'user_comp_admin', 'attending', 'キックオフイベント参加予定'),
('ea_02', 'event_01', 'user_student_01', 'attending', '楽しみにしています'),
('ea_03', 'event_02', 'user_owner_01', 'attending', '議事進行予定');

-- 監査ログサンプル
INSERT OR REPLACE INTO audits (id, actor_id, action, entity, entity_id, meta_json, ip_address) VALUES 
('audit_01', 'user_owner_01', 'CREATE', 'users', 'user_student_01', '{"email":"student01@neo-digital.jp","role":"student"}', '192.168.1.100'),
('audit_02', 'user_sec_fuk', 'CREATE', 'notices', 'notice_02', '{"title":"第1回クラス開催について","visibility":"role"}', '192.168.1.101'),
('audit_03', 'user_comp_admin', 'LOGIN', 'sessions', 'session_001', '{"device":"Chrome/Windows"}', '203.0.113.45');

-- ファイルデータ（サンプル）
INSERT OR REPLACE INTO files (id, r2_key, original_name, mime_type, size_bytes, uploaded_by, upload_purpose, is_public) VALUES 
('file_01', 'profiles/user_owner_01/avatar.jpg', 'profile_photo.jpg', 'image/jpeg', 245760, 'user_owner_01', 'profile', 0),
('file_02', 'materials/class_01/slides.pdf', 'DX基礎資料.pdf', 'application/pdf', 2097152, 'user_sec_fuk', 'material', 1),
('file_03', 'documents/committee_01/meeting_minutes.pdf', '議事録_2024年1月.pdf', 'application/pdf', 512000, 'user_sec_fuk', 'document', 0);