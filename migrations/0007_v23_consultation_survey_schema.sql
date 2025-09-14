-- NEO Digital Platform v2.3 - 相談・アンケート機能テーブル
-- 作成日: 2025-09-14
-- 目的: 実運用データ収集開始に向けた相談管理とアンケート管理機能

-- 相談管理テーブル
CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,                    -- consultation_xxxxxxxxx 形式
  type TEXT NOT NULL,                     -- career, academic, business, technical, other
  subject TEXT NOT NULL,                  -- 相談件名
  content TEXT NOT NULL,                  -- 相談内容
  requester_name TEXT NOT NULL,           -- 相談者名
  requester_email TEXT NOT NULL,          -- 相談者メールアドレス
  requester_affiliation TEXT,             -- 相談者所属（学校・企業等）
  assigned_to TEXT,                       -- 担当者ID（事務局メンバー）
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'assigned', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response_content TEXT,                  -- 対応内容・回答
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- アンケート管理テーブル
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,                    -- survey_xxxxxxxxx 形式
  title TEXT NOT NULL,                    -- アンケートタイトル
  description TEXT NOT NULL,              -- アンケート説明
  questions TEXT NOT NULL,                -- 質問内容（JSON形式）
  target_audience TEXT DEFAULT 'all',     -- 対象者（all, student, corporate, staff）
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  expires_at DATETIME,                    -- 回答期限
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- アンケート回答テーブル
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,                    -- response_xxxxxxxxx 形式
  survey_id TEXT NOT NULL,               -- surveys.id への外部キー
  responses TEXT NOT NULL,                -- 回答内容（JSON形式）
  respondent_name TEXT,                   -- 回答者名（任意）
  respondent_email TEXT NOT NULL,         -- 回答者メールアドレス
  respondent_affiliation TEXT,            -- 回答者所属
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

-- インデックス作成（パフォーマンス最適化）

-- 相談管理インデックス
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(type);
CREATE INDEX IF NOT EXISTS idx_consultations_assigned_to ON consultations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_requester_email ON consultations(requester_email);

-- アンケート管理インデックス
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_target_audience ON surveys(target_audience);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at);

-- アンケート回答インデックス
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_respondent_email ON survey_responses(respondent_email);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);

-- テストデータ挿入

-- 相談テストデータ
INSERT OR IGNORE INTO consultations (
  id, type, subject, content, requester_name, requester_email, 
  requester_affiliation, status, priority, created_at
) VALUES
('consultation_001', 'career', 'AI分野へのキャリア転換について', 
 '現在は営業職ですが、AI・機械学習分野への転職を考えています。必要なスキルや学習方法について相談したいです。',
 '田中健太', 'tanaka.kenta@example.com', '株式会社ABC', 'submitted', 'normal', '2024-09-01 10:00:00'),
 
('consultation_002', 'academic', '研究テーマ選択の相談',
 '修士論文のテーマで迷っています。サステナビリティとテクノロジーの融合について研究したいのですが、具体的な方向性を決められません。',
 '山田美香', 'yamada.mika@university.ac.jp', '東京大学大学院', 'assigned', 'high', '2024-09-03 14:30:00'),
 
('consultation_003', 'business', 'スタートアップ立ち上げ支援',
 'EdTech系のスタートアップを立ち上げたいと考えています。事業計画の作成や資金調達について相談したいです。',
 '佐藤雄介', 'sato.yusuke@gmail.com', 'フリーランス', 'in_progress', 'high', '2024-09-05 16:45:00');

-- アンケートテストデータ
INSERT OR IGNORE INTO surveys (
  id, title, description, questions, target_audience, status, created_at
) VALUES
('survey_001', 'NEOアカデミア満足度調査 2024',
 'NEOアカデミアのサービス向上のため、皆様のご意見をお聞かせください。',
 '[
   {
     "id": "q1",
     "type": "rating", 
     "question": "NEOアカデミアの総合的な満足度を5段階で評価してください",
     "scale": 5
   },
   {
     "id": "q2",
     "type": "multiple_choice",
     "question": "最も役立ったサービスはどれですか？",
     "options": ["講座", "コミュニティ", "キャリア相談", "イベント", "その他"]
   },
   {
     "id": "q3",
     "type": "text",
     "question": "改善してほしい点があれば自由にお書きください"
   }
 ]',
 'all', 'published', '2024-08-15 09:00:00'),

('survey_002', '2024年秋学期講座ニーズ調査',
 '秋学期に開講予定の講座について、皆様のニーズを調査します。',
 '[
   {
     "id": "q1",
     "type": "multiple_choice",
     "question": "最も受講したい分野はどれですか？",
     "options": ["AI・機械学習", "データサイエンス", "プログラミング", "ビジネス", "デザイン"]
   },
   {
     "id": "q2", 
     "type": "text",
     "question": "具体的に学びたい技術やツールがあれば教えてください"
   }
 ]',
 'student', 'published', '2024-08-20 12:00:00');

-- アンケート回答テストデータ
INSERT OR IGNORE INTO survey_responses (
  id, survey_id, responses, respondent_name, respondent_email, 
  respondent_affiliation, created_at
) VALUES
('response_001', 'survey_001', 
 '{"q1": 4, "q2": "講座", "q3": "もう少し実践的な内容があるといいです"}',
 '鈴木太郎', 'suzuki.taro@example.com', '早稲田大学', '2024-08-25 15:30:00'),
 
('response_002', 'survey_001',
 '{"q1": 5, "q2": "コミュニティ", "q3": "とても満足しています。今後も継続してほしいです"}',
 '田中花子', 'tanaka.hanako@company.co.jp', '株式会社XYZ', '2024-08-26 10:15:00'),
 
('response_003', 'survey_002',
 '{"q1": "AI・機械学習", "q2": "TensorFlow, PyTorchの実践的な使い方"}',
 '伊藤学', 'ito.manabu@univ.ac.jp', '慶應義塾大学', '2024-08-28 13:45:00');

-- 統計情報更新
ANALYZE;