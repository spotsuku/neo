// NEO Digital Platform Database Utilities
// D1データベースアクセス用ユーティリティ関数

import type { 
  D1Database, 
  User, 
  Role, 
  UserRole, 
  Notice, 
  Company, 
  Member, 
  Class, 
  Project, 
  Committee, 
  Event, 
  Attendance, 
  EventAttendance, 
  Audit, 
  File,
  Session 
} from '@/types/database';

/**
 * D1データベースクエリユーティリティクラス
 */
export class DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * ユーザー関連クエリ
   */
  async getUserById(id: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first<User>();
    return result || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first<User>();
    return result || null;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE role = ? AND is_active = 1'
    ).bind(role).all<User>();
    return result.results || [];
  }

  async getUsersByRegion(regionId: string): Promise<User[]> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE region_id = ? OR region_id = "ALL" AND is_active = 1'
    ).bind(regionId).all<User>();
    return result.results || [];
  }

  /**
   * ロール関連クエリ
   */
  async getAllRoles(): Promise<Role[]> {
    const result = await this.db.prepare(
      'SELECT * FROM roles ORDER BY level DESC'
    ).all<Role>();
    return result.results || [];
  }

  async getRoleByKey(key: string): Promise<Role | null> {
    const result = await this.db.prepare(
      'SELECT * FROM roles WHERE key = ?'
    ).bind(key).first<Role>();
    return result || null;
  }

  /**
   * お知らせ関連クエリ
   */
  async getNoticesByRegion(regionId: string): Promise<Notice[]> {
    const result = await this.db.prepare(`
      SELECT n.*, u.name as author_name 
      FROM notices n
      JOIN users u ON n.author_id = u.id
      WHERE (n.region_id = ? OR n.region_id = "ALL") 
        AND n.published_at IS NOT NULL
      ORDER BY n.is_important DESC, n.published_at DESC
    `).bind(regionId).all<Notice & { author_name: string }>();
    return result.results || [];
  }

  async getNoticeById(id: string): Promise<Notice | null> {
    const result = await this.db.prepare(
      'SELECT * FROM notices WHERE id = ?'
    ).bind(id).first<Notice>();
    return result || null;
  }

  /**
   * 企業関連クエリ
   */
  async getCompaniesByRegion(regionId: string): Promise<Company[]> {
    const result = await this.db.prepare(
      'SELECT * FROM companies WHERE region_id = ? ORDER BY display_order, name'
    ).bind(regionId).all<Company>();
    return result.results || [];
  }

  /**
   * クラス関連クエリ
   */
  async getClassesByRegion(regionId: string): Promise<Class[]> {
    const result = await this.db.prepare(`
      SELECT c.*, u.name as instructor_name_full
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.region_id = ?
      ORDER BY c.class_date DESC
    `).bind(regionId).all<Class & { instructor_name_full?: string }>();
    return result.results || [];
  }

  async getClassById(id: string): Promise<Class | null> {
    const result = await this.db.prepare(
      'SELECT * FROM classes WHERE id = ?'
    ).bind(id).first<Class>();
    return result || null;
  }

  /**
   * プロジェクト関連クエリ
   */
  async getProjectsByRegion(regionId: string): Promise<Project[]> {
    const result = await this.db.prepare(`
      SELECT p.*, u.name as owner_name
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE (p.region_id = ? OR p.region_id = "ALL")
        AND p.is_public = 1
      ORDER BY p.priority DESC, p.created_at DESC
    `).bind(regionId).all<Project & { owner_name: string }>();
    return result.results || [];
  }

  /**
   * 委員会関連クエリ
   */
  async getCommitteesByRegion(regionId: string): Promise<Committee[]> {
    const result = await this.db.prepare(`
      SELECT c.*, u.name as lead_name
      FROM committees c
      JOIN users u ON c.lead_id = u.id
      WHERE (c.region_id = ? OR c.region_id = "ALL")
        AND c.status = "active"
      ORDER BY c.created_at DESC
    `).bind(regionId).all<Committee & { lead_name: string }>();
    return result.results || [];
  }

  /**
   * イベント関連クエリ
   */
  async getEventsByRegion(regionId: string): Promise<Event[]> {
    const result = await this.db.prepare(`
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE (e.region_id = ? OR e.region_id = "ALL")
        AND e.is_cancelled = 0
      ORDER BY e.starts_at ASC
    `).bind(regionId).all<Event & { organizer_name: string }>();
    return result.results || [];
  }

  /**
   * 統計情報クエリ
   */
  async getDashboardStats(regionId: string): Promise<{
    totalUsers: number;
    totalCompanies: number;
    totalProjects: number;
    totalNotices: number;
    recentClasses: number;
    upcomingEvents: number;
  }> {
    const [users, companies, projects, notices, classes, events] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM users WHERE (region_id = ? OR region_id = "ALL") AND is_active = 1').bind(regionId).first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM companies WHERE region_id = ? AND status = "active"').bind(regionId).first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM projects WHERE (region_id = ? OR region_id = "ALL") AND status IN ("planning", "active")').bind(regionId).first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM notices WHERE (region_id = ? OR region_id = "ALL") AND published_at IS NOT NULL').bind(regionId).first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM classes WHERE region_id = ? AND class_date >= date("now", "-30 days")').bind(regionId).first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM events WHERE (region_id = ? OR region_id = "ALL") AND starts_at >= datetime("now") AND is_cancelled = 0').bind(regionId).first<{ count: number }>()
    ]);

    return {
      totalUsers: users?.count || 0,
      totalCompanies: companies?.count || 0,
      totalProjects: projects?.count || 0,
      totalNotices: notices?.count || 0,
      recentClasses: classes?.count || 0,
      upcomingEvents: events?.count || 0,
    };
  }

  /**
   * セッション関連クエリ
   */
  async createSession(session: Omit<Session, 'created_at'>): Promise<void> {
    await this.db.prepare(`
      INSERT INTO sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, is_revoked)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      session.id,
      session.user_id,
      session.refresh_token_hash,
      session.device_info || null,
      session.ip_address || null,
      session.expires_at,
      session.is_revoked ? 1 : 0
    ).run();
  }

  async getValidSession(sessionId: string): Promise<Session | null> {
    const result = await this.db.prepare(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now") AND is_revoked = 0'
    ).bind(sessionId).first<Session>();
    return result || null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db.prepare(
      'UPDATE sessions SET is_revoked = 1 WHERE id = ?'
    ).bind(sessionId).run();
  }

  /**
   * 監査ログ
   */
  async createAuditLog(audit: Omit<Audit, 'id' | 'created_at'>): Promise<void> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.prepare(`
      INSERT INTO audits (id, actor_id, action, entity, entity_id, meta_json, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      audit.actor_id || null,
      audit.action,
      audit.entity,
      audit.entity_id || null,
      audit.meta_json || null,
      audit.ip_address || null,
      audit.user_agent || null
    ).run();
  }

  /**
   * トランザクション実行
   */
  async transaction<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
    // D1はトランザクションをサポートしていないため、
    // 順次実行でエラーハンドリングを行う
    const results: T[] = [];
    for (const query of queries) {
      try {
        const result = await query();
        results.push(result);
      } catch (error) {
        // ロールバック的な処理が必要な場合は手動で実装
        throw error;
      }
    }
    return results;
  }
}

/**
 * D1データベースサービスインスタンスを取得
 */
export function getDbService(db: D1Database): DatabaseService {
  return new DatabaseService(db);
}

/**
 * ID生成ユーティリティ
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * JSON配列パース用ヘルパー
 */
export function parseJsonArray(jsonString: string | null): string[] {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}