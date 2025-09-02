-- Heroes Steps Management System
-- 6段階のヒーローステップでNEOアカデミア生の成長を管理

-- Heroes steps definition table
CREATE TABLE IF NOT EXISTS heroes_step_definitions (
  step_level INTEGER PRIMARY KEY CHECK (step_level >= 0 AND step_level <= 5),
  step_name TEXT NOT NULL,
  step_description TEXT NOT NULL,
  step_objectives TEXT NOT NULL,         -- JSON array of objectives/criteria
  next_actions TEXT,                     -- JSON array of recommended next actions
  badge_icon TEXT DEFAULT 'fas fa-star',
  badge_color TEXT DEFAULT '#f59e0b',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User heroes steps tracking
CREATE TABLE IF NOT EXISTS heroes_steps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0 AND current_step <= 5),
  previous_step INTEGER DEFAULT 0 CHECK (previous_step >= 0 AND previous_step <= 5),
  step_achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  step_updated_by TEXT,                  -- Who updated this step (admin/system)
  notes TEXT,                           -- Optional notes about the step achievement
  company_id TEXT,                      -- For company filtering
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (current_step) REFERENCES heroes_step_definitions(step_level),
  FOREIGN KEY (previous_step) REFERENCES heroes_step_definitions(step_level)
);

-- Heroes step history for tracking progression
CREATE TABLE IF NOT EXISTS heroes_step_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  from_step INTEGER NOT NULL CHECK (from_step >= 0 AND from_step <= 5),
  to_step INTEGER NOT NULL CHECK (to_step >= 0 AND to_step <= 5),
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by TEXT,                      -- Who made the change
  reason TEXT,                          -- Reason for step change
  evidence_urls TEXT,                   -- JSON array of evidence/proof URLs
  -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_step) REFERENCES heroes_step_definitions(step_level),
  FOREIGN KEY (to_step) REFERENCES heroes_step_definitions(step_level)
);

-- Heroes KPI targets and configurations
CREATE TABLE IF NOT EXISTS heroes_kpi_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kpi_name TEXT NOT NULL UNIQUE,
  target_percentage REAL NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
  step_level INTEGER NOT NULL CHECK (step_level >= 0 AND step_level <= 5),
  description TEXT,
  alert_threshold REAL DEFAULT 5.0,    -- Alert if below target by this much
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (step_level) REFERENCES heroes_step_definitions(step_level)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_heroes_steps_user_id ON heroes_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_heroes_steps_current_step ON heroes_steps(current_step);
CREATE INDEX IF NOT EXISTS idx_heroes_steps_company_id ON heroes_steps(company_id);
CREATE INDEX IF NOT EXISTS idx_heroes_steps_updated_at ON heroes_steps(updated_at);

CREATE INDEX IF NOT EXISTS idx_heroes_step_history_user_id ON heroes_step_history(user_id);
CREATE INDEX IF NOT EXISTS idx_heroes_step_history_changed_at ON heroes_step_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_heroes_step_history_to_step ON heroes_step_history(to_step);

CREATE UNIQUE INDEX IF NOT EXISTS idx_heroes_steps_user_unique ON heroes_steps(user_id);

-- Insert step definitions (0-5次)
INSERT OR REPLACE INTO heroes_step_definitions (step_level, step_name, step_description, step_objectives, next_actions, badge_icon, badge_color) VALUES
(0, '0次：スタート', 'NEOアカデミアへの参加開始段階', 
 '["プラットフォームへの登録", "基本プロフィールの設定", "オリエンテーション参加"]',
 '["初回面談の予約", "基礎学習コンテンツの確認", "メンター紹介の確認"]',
 'fas fa-seedling', '#6b7280'),

(1, '1次：基礎習得', '基本的なスキルと知識の習得段階',
 '["基礎コースの修了", "初回プロジェクト参加", "メンターとの定期面談"]',
 '["応用コースへの参加", "チームプロジェクトの提案", "スキル評価の実施"]',
 'fas fa-book', '#3b82f6'),

(2, '2次：実践参加', 'プロジェクト実践と協働経験の積み重ね段階',
 '["チームプロジェクト完遂", "他メンバーとの協働実績", "中間評価パス"]',
 '["リーダーシップ役割の挑戦", "外部プロジェクト参加", "専門分野の深掘り"]',
 'fas fa-users', '#10b981'),

(3, '3次：リーダーシップ', 'チームを牽引し他者を導く段階',
 '["プロジェクトリーダー経験", "後輩メンバーのメンタリング", "成果発表・共有"]',
 '["複数プロジェクトの管理", "企業との連携プロジェクト", "専門性の確立"]',
 'fas fa-crown', '#f59e0b'),

(4, '4次：エキスパート', '専門領域でのエキスパートとして認定される段階',
 '["専門分野での高い成果", "企業からの評価獲得", "アカデミア運営への貢献"]',
 '["産学連携プロジェクト主導", "新人育成プログラム設計", "外部発信・講演活動"]',
 'fas fa-medal', '#8b5cf6'),

(5, '5次：ヒーロー', 'NEOアカデミアを代表するヒーロー人材として活躍する段階',
 '["産業界での実績と認知", "アカデミア発展への貢献", "次世代リーダー育成"]',
 '["業界リーダーとしての活動", "アカデミア戦略への参画", "社会課題解決への貢献"]',
 'fas fa-trophy', '#ef4444');

-- Insert KPI configuration
INSERT OR REPLACE INTO heroes_kpi_config (kpi_name, target_percentage, step_level, description, alert_threshold) VALUES
('3次以上到達率', 85.0, 3, '3次（リーダーシップ）以上に到達したユーザーの割合', 5.0),
('4次到達率', 20.0, 4, '4次（エキスパート）に到達したユーザーの割合', 3.0),
('5次到達率', 5.0, 5, '5次（ヒーロー）に到達したユーザーの割合', 1.0);

-- Create trigger to update step history when heroes_steps changes
CREATE TRIGGER IF NOT EXISTS heroes_steps_history_trigger
AFTER UPDATE OF current_step ON heroes_steps
FOR EACH ROW
WHEN NEW.current_step != OLD.current_step
BEGIN
  INSERT INTO heroes_step_history (user_id, from_step, to_step, changed_at, changed_by)
  VALUES (NEW.user_id, OLD.current_step, NEW.current_step, datetime('now'), NEW.step_updated_by);
END;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS heroes_steps_updated_at_trigger
AFTER UPDATE ON heroes_steps
FOR EACH ROW
BEGIN
  UPDATE heroes_steps SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS heroes_step_definitions_updated_at_trigger
AFTER UPDATE ON heroes_step_definitions
FOR EACH ROW
BEGIN
  UPDATE heroes_step_definitions SET updated_at = datetime('now') WHERE step_level = NEW.step_level;
END;

-- Insert sample data for testing (optional)
-- This would be populated by actual user registrations and step progressions
INSERT OR IGNORE INTO heroes_steps (user_id, current_step, company_id, notes, step_updated_by) VALUES
('sample-user-1', 5, 'company-1', 'Hero level achieved', 'system'),
('sample-user-2', 4, 'company-1', 'Expert level achieved', 'system'),
('sample-user-3', 4, 'company-2', 'Expert level achieved', 'system'),
('sample-user-4', 4, 'company-2', 'Expert level achieved', 'system'),
('sample-user-5', 4, 'company-3', 'Expert level achieved', 'system'),
('sample-user-6', 3, 'company-1', 'Leadership level achieved', 'system'),
('sample-user-7', 3, 'company-1', 'Leadership level achieved', 'system'),
('sample-user-8', 3, 'company-2', 'Leadership level achieved', 'system'),
('sample-user-9', 3, 'company-2', 'Leadership level achieved', 'system'),
('sample-user-10', 3, 'company-3', 'Leadership level achieved', 'system'),
('sample-user-11', 3, NULL, 'Leadership level achieved', 'system'),
('sample-user-12', 3, NULL, 'Leadership level achieved', 'system'),
('sample-user-13', 3, NULL, 'Leadership level achieved', 'system'),
('sample-user-14', 3, NULL, 'Leadership level achieved', 'system'),
('sample-user-15', 3, NULL, 'Leadership level achieved', 'system'),
('sample-user-16', 2, 'company-1', 'Practice level achieved', 'system'),
('sample-user-17', 2, 'company-2', 'Practice level achieved', 'system'),
('sample-user-18', 2, 'company-3', 'Practice level achieved', 'system'),
('sample-user-19', 2, NULL, 'Practice level achieved', 'system'),
('sample-user-20', 2, NULL, 'Practice level achieved', 'system'),
('sample-user-21', 1, NULL, 'Basic level achieved', 'system'),
('sample-user-22', 1, NULL, 'Basic level achieved', 'system'),
('sample-user-23', 1, NULL, 'Basic level achieved', 'system'),
('sample-user-24', 0, NULL, 'Just started', 'system'),
('sample-user-25', 0, NULL, 'Just started', 'system');