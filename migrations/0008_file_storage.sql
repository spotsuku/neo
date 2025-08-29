-- ファイルストレージテーブル - Step 7 File Upload (R2)
-- NEO Digital Platform

-- 1. ファイルメタデータテーブル
CREATE TABLE IF NOT EXISTS file_uploads (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes TEXT NOT NULL,
  
  -- R2ストレージパス
  r2_key TEXT NOT NULL UNIQUE,
  r2_url TEXT NOT NULL,
  
  -- ファイル分類
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'video', 'audio', 'other')),
  category TEXT, -- 'announcement', 'profile', 'class', 'project', 'committee'
  
  -- 関連性
  related_type TEXT, -- 'announcement', 'class', 'project', 'committee', 'user'
  related_id TEXT,   -- 関連するエンティティのID
  
  -- セキュリティ
  access_level TEXT NOT NULL CHECK (access_level IN ('public', 'authenticated', 'private', 'restricted')),
  allowed_roles TEXT DEFAULT '[]', -- JSONアレイ: アクセス許可ロール
  allowed_users TEXT DEFAULT '[]', -- JSONアレイ: アクセス許可ユーザー
  
  -- アップロード情報
  uploaded_by TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  
  -- メタデータ
  description TEXT,
  alt_text TEXT, -- 画像のalt属性用
  tags TEXT DEFAULT '[]', -- JSONアレイ
  
  -- 画像メタデータ（画像ファイルの場合）
  width TEXT,
  height TEXT,
  has_thumbnail TEXT DEFAULT '0',
  thumbnail_r2_key TEXT,
  
  -- バージョン管理
  version TEXT DEFAULT '1',
  is_current TEXT DEFAULT '1',
  parent_file_id TEXT, -- 元ファイルのID（リサイズ・変換後の場合）
  
  -- スキャン・セキュリティ
  virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  virus_scan_at TEXT,
  
  -- 統計
  download_count TEXT DEFAULT '0',
  last_accessed_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT, -- 一時ファイルの場合の有効期限
  
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (parent_file_id) REFERENCES file_uploads(id)
);

-- 2. ファイルアクセスログテーブル
CREATE TABLE IF NOT EXISTS file_access_logs (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  
  -- アクセス情報
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'share', 'delete')),
  ip_address TEXT,
  user_agent TEXT,
  
  -- セキュリティ
  access_granted TEXT NOT NULL CHECK (access_granted IN ('granted', 'denied')),
  denial_reason TEXT, -- 'no_permission', 'file_not_found', 'virus_detected'
  
  accessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (file_id) REFERENCES file_uploads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. ファイル共有リンクテーブル
CREATE TABLE IF NOT EXISTS file_share_links (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  
  -- 共有設定
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('public', 'password', 'limited_time')),
  password_hash TEXT, -- パスワード保護の場合
  
  -- アクセス制限
  max_downloads TEXT DEFAULT '0', -- 0は無制限
  current_downloads TEXT DEFAULT '0',
  expires_at TEXT,
  
  -- 権限
  permissions TEXT DEFAULT '["view"]', -- JSONアレイ: 'view', 'download'
  
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TEXT,
  is_active TEXT DEFAULT '1',
  
  FOREIGN KEY (file_id) REFERENCES file_uploads(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_file_uploads_type ON file_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_category ON file_uploads(category);
CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON file_uploads(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploader ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created ON file_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_r2_key ON file_uploads(r2_key);

CREATE INDEX IF NOT EXISTS idx_file_access_logs_file ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_accessed ON file_access_logs(accessed_at);

CREATE INDEX IF NOT EXISTS idx_file_share_links_file ON file_share_links(file_id);
CREATE INDEX IF NOT EXISTS idx_file_share_links_token ON file_share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_file_share_links_active ON file_share_links(is_active);