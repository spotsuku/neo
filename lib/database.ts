/**
 * データベース接続とクエリユーティリティ
 * Cloudflare D1 SQLiteデータベース用のORM風インターフェース
 */

// Cloudflare D1のTypeScript型定義
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = Record<string, any>> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
    changed_db: boolean;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// データベーステーブルの型定義
export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  department?: string;
  position?: string;
  preferences: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_id: number;
  status: 'draft' | 'published' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  publish_at?: string;
  expires_at?: string;
  target_roles?: string; // JSON array
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  data: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: string; // JSON string
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: number;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  uploaded_by: number;
  checksum: string;
  metadata?: string; // JSON string
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: string; // JSON string
  read_at?: string;
  created_at: string;
}

export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  key_hash: string;
  permissions?: string; // JSON array
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * データベースクエリビルダークラス
 */
export class DatabaseQuery<T> {
  private db: D1Database;
  private tableName: string;
  private whereClause: string = '';
  private whereValues: any[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';

  constructor(db: D1Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  where(column: string, operator: string, value: any): this {
    const condition = this.whereClause ? ' AND ' : ' WHERE ';
    this.whereClause += `${condition}${column} ${operator} ?`;
    this.whereValues.push(value);
    return this;
  }

  whereIn(column: string, values: any[]): this {
    const condition = this.whereClause ? ' AND ' : ' WHERE ';
    const placeholders = values.map(() => '?').join(', ');
    this.whereClause += `${condition}${column} IN (${placeholders})`;
    this.whereValues.push(...values);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.limitClause = ` LIMIT ${count}`;
    return this;
  }

  async first(): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName}${this.whereClause}${this.orderByClause} LIMIT 1`;
    const stmt = this.db.prepare(query);
    if (this.whereValues.length > 0) {
      stmt.bind(...this.whereValues);
    }
    return await stmt.first<T>();
  }

  async all(): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName}${this.whereClause}${this.orderByClause}${this.limitClause}`;
    const stmt = this.db.prepare(query);
    if (this.whereValues.length > 0) {
      stmt.bind(...this.whereValues);
    }
    const result = await stmt.all<T>();
    return result.results || [];
  }

  async count(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName}${this.whereClause}`;
    const stmt = this.db.prepare(query);
    if (this.whereValues.length > 0) {
      stmt.bind(...this.whereValues);
    }
    const result = await stmt.first<{ count: number }>();
    return result?.count || 0;
  }
}

/**
 * データベースモデルクラス
 */
export class DatabaseModel {
  protected db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // ユーザー関連メソッド
  users() {
    return new DatabaseQuery<User>(this.db, 'users');
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, name, password_hash, role, status, email_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(userData.email, userData.name, userData.password_hash, userData.role, userData.status, userData.email_verified)
      .run();
    return result.meta.last_row_id;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<boolean> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);
    
    const stmt = this.db.prepare(`
      UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = await stmt.bind(...values, id).run();
    return result.meta.changed_db;
  }

  // プロフィール関連メソッド
  profiles() {
    return new DatabaseQuery<UserProfile>(this.db, 'user_profiles');
  }

  async createProfile(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO user_profiles (user_id, avatar_url, bio, phone, department, position, preferences)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(
        profileData.user_id,
        profileData.avatar_url || null,
        profileData.bio || null,
        profileData.phone || null,
        profileData.department || null,
        profileData.position || null,
        profileData.preferences
      )
      .run();
    return result.meta.last_row_id;
  }

  // お知らせ関連メソッド
  announcements() {
    return new DatabaseQuery<Announcement>(this.db, 'announcements');
  }

  async createAnnouncement(data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO announcements (title, content, author_id, status, priority, publish_at, expires_at, target_roles)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(
        data.title,
        data.content,
        data.author_id,
        data.status,
        data.priority,
        data.publish_at || null,
        data.expires_at || null,
        data.target_roles || null
      )
      .run();
    return result.meta.last_row_id;
  }

  // セッション関連メソッド
  sessions() {
    return new DatabaseQuery<Session>(this.db, 'sessions');
  }

  async createSession(sessionData: Omit<Session, 'created_at' | 'updated_at'>): Promise<boolean> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, data)
      VALUES (?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(sessionData.id, sessionData.user_id, sessionData.expires_at, sessionData.data)
      .run();
    return result.success;
  }

  // 監査ログ関連メソッド
  auditLogs() {
    return new DatabaseQuery<AuditLog>(this.db, 'audit_logs');
  }

  async logAction(logData: Omit<AuditLog, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(
        logData.user_id || null,
        logData.action,
        logData.resource_type,
        logData.resource_id || null,
        logData.changes || null,
        logData.ip_address || null,
        logData.user_agent || null
      )
      .run();
    return result.meta.last_row_id;
  }

  // システム設定関連メソッド
  settings() {
    return new DatabaseQuery<SystemSetting>(this.db, 'system_settings');
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settings().where('key', '=', key).first();
    return setting?.value || null;
  }

  async setSetting(key: string, value: string, description?: string, isPublic = false): Promise<boolean> {
    const stmt = this.db.prepare(`
      INSERT INTO system_settings (key, value, description, is_public, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        description = excluded.description,
        is_public = excluded.is_public,
        updated_at = CURRENT_TIMESTAMP
    `);
    const result = await stmt.bind(key, value, description || null, isPublic).run();
    return result.success;
  }

  // ファイル関連メソッド
  files() {
    return new DatabaseQuery<File>(this.db, 'files');
  }

  async createFile(fileData: Omit<File, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO files (name, path, mime_type, size, uploaded_by, checksum, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(
        fileData.name,
        fileData.path,
        fileData.mime_type,
        fileData.size,
        fileData.uploaded_by,
        fileData.checksum,
        fileData.metadata || null
      )
      .run();
    return result.meta.last_row_id;
  }

  // 通知関連メソッド
  notifications() {
    return new DatabaseQuery<Notification>(this.db, 'notifications');
  }

  async createNotification(data: Omit<Notification, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(data.user_id, data.type, data.title, data.message, data.data || null)
      .run();
    return result.meta.last_row_id;
  }

  // APIキー関連メソッド
  apiKeys() {
    return new DatabaseQuery<ApiKey>(this.db, 'api_keys');
  }

  async createApiKey(data: Omit<ApiKey, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO api_keys (user_id, name, key_hash, permissions, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = await stmt
      .bind(
        data.user_id,
        data.name,
        data.key_hash,
        data.permissions || null,
        data.expires_at || null
      )
      .run();
    return result.meta.last_row_id;
  }

  // バッチ操作
  async batch(operations: (() => D1PreparedStatement)[]): Promise<D1Result[]> {
    const statements = operations.map(op => op());
    return await this.db.batch(statements);
  }

  // トランザクション風操作（SQLiteなので実際のトランザクションではない）
  async transaction<T>(callback: (db: DatabaseModel) => Promise<T>): Promise<T> {
    try {
      return await callback(this);
    } catch (error) {
      // ロールバック機能はD1では限定的なので、エラーハンドリングのみ
      throw error;
    }
  }
}

/**
 * データベースヘルパー関数
 */
export function createDatabaseModel(db: D1Database): DatabaseModel {
  return new DatabaseModel(db);
}

/**
 * データベース初期化関数
 */
export async function initializeDatabase(db: D1Database): Promise<boolean> {
  try {
    // スキーマが適用されているかチェック
    const tables = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    const requiredTables = [
      'users', 'user_profiles', 'announcements', 'sessions',
      'audit_logs', 'system_settings', 'files', 'notifications', 'api_keys'
    ];

    const existingTables = tables.results?.map((table: any) => table.name) || [];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.warn('Missing database tables:', missingTables);
      return false;
    }

    // デフォルト設定の挿入
    const model = createDatabaseModel(db);
    
    await model.setSetting('site_name', 'NEO Digital Platform', 'サイト名', true);
    await model.setSetting('site_description', 'Digital Transformation Platform', 'サイト説明', true);
    await model.setSetting('max_file_size', '10485760', '最大ファイルサイズ (10MB)', false);
    await model.setSetting('session_timeout', '86400', 'セッションタイムアウト (24時間)', false);
    await model.setSetting('enable_registration', 'false', '新規登録の有効化', false);

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}