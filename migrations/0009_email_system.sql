-- メール通知システムテーブル - Step 8 Email Notification System
-- NEO Digital Platform

-- 1. メールテンプレートテーブル
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- テンプレート分類
  category TEXT NOT NULL CHECK (category IN ('system', 'notification', 'marketing', 'transactional', 'reminder')),
  template_type TEXT NOT NULL CHECK (template_type IN ('announcement', 'class_notification', 'project_update', 'committee_meeting', 'user_invitation', 'password_reset', 'welcome', 'reminder')),
  
  -- メール内容
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  
  -- 変数定義
  variables TEXT DEFAULT '[]', -- JSONアレイ: 使用可能変数リスト
  required_variables TEXT DEFAULT '[]', -- JSONアレイ: 必須変数
  
  -- 送信設定
  from_email TEXT,
  from_name TEXT,
  reply_to_email TEXT,
  
  -- 送信条件
  is_active TEXT DEFAULT '1',
  send_condition TEXT, -- JSON: 送信条件設定
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- 制限設定
  daily_limit TEXT DEFAULT '0', -- 0は無制限
  rate_limit_minutes TEXT DEFAULT '0', -- 同一ユーザーへの再送制限（分）
  
  -- メタデータ
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 2. メール送信キューテーブル
CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  
  -- 受信者情報
  to_email TEXT NOT NULL,
  to_name TEXT,
  
  -- 送信内容
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  
  -- 送信設定
  from_email TEXT,
  from_name TEXT,
  reply_to_email TEXT,
  
  -- 変数データ
  template_variables TEXT DEFAULT '{}', -- JSON: テンプレート変数の実際の値
  
  -- 送信ステータス
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- スケジューリング
  scheduled_at TEXT, -- 送信予定時刻（nullなら即時送信）
  max_retry_attempts TEXT DEFAULT '3',
  retry_count TEXT DEFAULT '0',
  
  -- 送信結果
  sent_at TEXT,
  failed_at TEXT,
  error_message TEXT,
  provider_message_id TEXT, -- 送信プロバイダーのメッセージID
  
  -- 追跡情報
  related_type TEXT, -- 'announcement', 'class', 'project', 'committee', 'system'
  related_id TEXT,   -- 関連エンティティのID
  
  -- メタデータ
  created_by TEXT,
  created_by_name TEXT,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES email_templates(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 3. メール送信履歴テーブル
CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  
  -- 配信情報
  provider TEXT NOT NULL, -- 'sendgrid', 'mailgun', 'resend', 'ses'
  provider_message_id TEXT,
  
  -- 配信ステータス
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'bounced', 'dropped', 'deferred', 'blocked')),
  
  -- イベント情報
  event_type TEXT NOT NULL CHECK (event_type IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'dropped', 'deferred', 'blocked', 'spam_report', 'unsubscribed')),
  event_timestamp TEXT NOT NULL,
  
  -- 詳細情報
  bounce_reason TEXT,
  user_agent TEXT,
  ip_address TEXT,
  clicked_url TEXT,
  
  -- 統計用
  processing_time_ms TEXT, -- 処理時間（ミリ秒）
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (queue_id) REFERENCES email_queue(id) ON DELETE CASCADE
);

-- 4. メール配信統計テーブル
CREATE TABLE IF NOT EXISTS email_statistics (
  id TEXT PRIMARY KEY,
  
  -- 統計対象
  stat_date TEXT NOT NULL, -- YYYY-MM-DD
  template_id TEXT,
  category TEXT,
  
  -- カウント
  total_sent TEXT DEFAULT '0',
  total_delivered TEXT DEFAULT '0',
  total_opened TEXT DEFAULT '0',
  total_clicked TEXT DEFAULT '0',
  total_bounced TEXT DEFAULT '0',
  total_spam_reports TEXT DEFAULT '0',
  total_unsubscribed TEXT DEFAULT '0',
  
  -- レート（％）
  delivery_rate TEXT DEFAULT '0',
  open_rate TEXT DEFAULT '0',
  click_rate TEXT DEFAULT '0',
  bounce_rate TEXT DEFAULT '0',
  
  -- 集計メタデータ
  last_updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(stat_date, template_id, category),
  FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

-- 5. ユーザー配信設定テーブル
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- 全般設定
  email_notifications_enabled TEXT DEFAULT '1',
  
  -- カテゴリ別設定
  announcements_enabled TEXT DEFAULT '1',
  class_notifications_enabled TEXT DEFAULT '1',
  project_updates_enabled TEXT DEFAULT '1',
  committee_meetings_enabled TEXT DEFAULT '1',
  marketing_emails_enabled TEXT DEFAULT '0',
  
  -- 頻度設定
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'disabled')),
  
  -- 配信時間設定
  preferred_send_time TEXT DEFAULT '09:00', -- HH:MM format
  timezone TEXT DEFAULT 'Asia/Tokyo',
  
  -- 言語設定
  preferred_language TEXT DEFAULT 'ja',
  
  -- 購読解除
  unsubscribed_at TEXT,
  unsubscribe_reason TEXT,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. メール購読解除トークンテーブル
CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  
  -- 購読解除設定
  unsubscribe_type TEXT NOT NULL CHECK (unsubscribe_type IN ('all', 'category', 'template')),
  target_category TEXT,  -- カテゴリ単位の場合
  target_template_id TEXT, -- テンプレート単位の場合
  
  -- トークン有効期限
  expires_at TEXT NOT NULL,
  used_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_template_id) REFERENCES email_templates(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_email ON email_queue(to_email);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_queue ON email_delivery_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON email_delivery_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_event ON email_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_timestamp ON email_delivery_logs(event_timestamp);

CREATE INDEX IF NOT EXISTS idx_email_statistics_date ON email_statistics(stat_date);
CREATE INDEX IF NOT EXISTS idx_email_statistics_template ON email_statistics(template_id);

CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user ON user_email_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON email_unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_user ON email_unsubscribe_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_expires ON email_unsubscribe_tokens(expires_at);