/**
 * クラス管理CMS - 学習クラス・講座管理サービス
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { z } from 'zod'
import { BaseCMSService, BaseCMSItem, ContentStatus, VisibilityScope, NotificationQueue } from './base-cms'

// クラス関連のZodスキーマ
export const ClassTypeSchema = z.enum(['regular', 'intensive', 'workshop', 'seminar', 'online'])
export const ClassLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'all'])
export const RecurrenceSchema = z.enum(['none', 'weekly', 'biweekly', 'monthly'])

export const ClassSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'クラス名は必須です'),
  description: z.string().optional(),
  type: ClassTypeSchema,
  level: ClassLevelSchema,
  instructor_id: z.string(),
  instructor_name: z.string(),
  
  // 日程関連
  start_date: z.string(), // ISO date
  end_date: z.string().optional(),
  start_time: z.string(), // HH:MM format
  duration_minutes: z.number().min(30).max(480),
  recurrence: RecurrenceSchema,
  max_participants: z.number().min(1).max(1000),
  current_participants: z.number().default(0),
  
  // 場所・形式
  location: z.string().optional(),
  is_online: z.boolean().default(false),
  meeting_url: z.string().url().optional(),
  meeting_password: z.string().optional(),
  
  // 費用・条件
  fee: z.number().min(0).default(0),
  currency: z.string().default('JPY'),
  prerequisites: z.string().optional(),
  materials_required: z.string().optional(),
  
  // CMS基本フィールド
  status: z.nativeEnum(ContentStatus),
  visibility_scope: z.nativeEnum(VisibilityScope),
  visibility_roles: z.array(z.string()).default([]),
  visibility_regions: z.array(z.string()).default([]),
  author_id: z.string(),
  author_name: z.string(),
  
  // メタデータ
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  featured: z.boolean().default(false),
  priority: z.number().min(1).max(5).default(3),
  
  created_at: z.string(),
  updated_at: z.string(),
  published_at: z.string().optional(),
  
  // 統計データ
  view_count: z.number().default(0),
  enrollment_count: z.number().default(0)
})

export type Class = z.infer<typeof ClassSchema>

// 参加者情報
export const EnrollmentSchema = z.object({
  id: z.string(),
  class_id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  enrolled_at: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
  payment_status: z.enum(['none', 'pending', 'paid', 'refunded']),
  notes: z.string().optional()
})

export type Enrollment = z.infer<typeof EnrollmentSchema>

/**
 * クラス管理サービス
 */
export class ClassService extends BaseCMSService<Class> {
  protected tableName = 'cms_classes'
  protected schema = ClassSchema

  /**
   * クラス作成
   */
  async create(item: Omit<Class, 'id' | 'created_at' | 'updated_at'>): Promise<Class> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    
    const classItem: Class = {
      ...item,
      id,
      created_at: now,
      updated_at: now,
      current_participants: 0,
      view_count: 0,
      enrollment_count: 0
    }

    // データベース挿入
    const query = `
      INSERT INTO cms_classes (
        id, title, description, type, level, instructor_id, instructor_name,
        start_date, end_date, start_time, duration_minutes, recurrence,
        max_participants, current_participants, location, is_online,
        meeting_url, meeting_password, fee, currency, prerequisites,
        materials_required, status, visibility_scope, visibility_roles,
        visibility_regions, author_id, author_name, tags, category,
        featured, priority, created_at, updated_at, view_count,
        enrollment_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await this.db.prepare(query).bind(
      classItem.id, classItem.title, classItem.description, classItem.type,
      classItem.level, classItem.instructor_id, classItem.instructor_name,
      classItem.start_date, classItem.end_date, classItem.start_time,
      classItem.duration_minutes, classItem.recurrence, classItem.max_participants,
      classItem.current_participants, classItem.location, classItem.is_online ? 1 : 0,
      classItem.meeting_url, classItem.meeting_password, classItem.fee,
      classItem.currency, classItem.prerequisites, classItem.materials_required,
      classItem.status, classItem.visibility_scope, JSON.stringify(classItem.visibility_roles),
      JSON.stringify(classItem.visibility_regions), classItem.author_id,
      classItem.author_name, JSON.stringify(classItem.tags), classItem.category,
      classItem.featured ? 1 : 0, classItem.priority, classItem.created_at,
      classItem.updated_at, classItem.view_count, classItem.enrollment_count
    ).run()

    // 公開時は通知キューに追加
    if (classItem.status === ContentStatus.PUBLISHED) {
      await this.addToNotificationQueue({
        id: crypto.randomUUID(),
        content_type: 'class',
        content_id: classItem.id,
        title: `新しいクラス: ${classItem.title}`,
        message: classItem.description || '',
        target_roles: classItem.visibility_roles,
        target_regions: classItem.visibility_regions,
        scheduled_at: now,
        priority: classItem.priority
      })
    }

    return classItem
  }

  /**
   * クラス参加申し込み
   */
  async enrollUser(classId: string, userId: string, userName: string): Promise<Enrollment> {
    const classItem = await this.getById(classId)
    if (!classItem) {
      throw new Error('クラスが見つかりません')
    }

    if (classItem.current_participants >= classItem.max_participants) {
      throw new Error('定員に達しています')
    }

    // 既に申し込み済みかチェック
    const existingEnrollment = await this.db.prepare(`
      SELECT * FROM cms_enrollments WHERE class_id = ? AND user_id = ?
    `).bind(classId, userId).first()

    if (existingEnrollment) {
      throw new Error('既に申し込み済みです')
    }

    const enrollment: Enrollment = {
      id: crypto.randomUUID(),
      class_id: classId,
      user_id: userId,
      user_name: userName,
      enrolled_at: new Date().toISOString(),
      status: 'pending',
      payment_status: classItem.fee > 0 ? 'pending' : 'none'
    }

    // 参加者情報挿入
    await this.db.prepare(`
      INSERT INTO cms_enrollments (
        id, class_id, user_id, user_name, enrolled_at, status, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      enrollment.id, enrollment.class_id, enrollment.user_id,
      enrollment.user_name, enrollment.enrolled_at, enrollment.status,
      enrollment.payment_status, enrollment.notes
    ).run()

    // 参加者数更新
    await this.db.prepare(`
      UPDATE cms_classes SET 
        current_participants = current_participants + 1,
        enrollment_count = enrollment_count + 1,
        updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), classId).run()

    return enrollment
  }

  /**
   * 参加申し込み取り消し
   */
  async cancelEnrollment(classId: string, userId: string): Promise<void> {
    const enrollment = await this.db.prepare(`
      SELECT * FROM cms_enrollments WHERE class_id = ? AND user_id = ?
    `).bind(classId, userId).first()

    if (!enrollment) {
      throw new Error('申し込みが見つかりません')
    }

    // 参加申し込み取り消し
    await this.db.prepare(`
      UPDATE cms_enrollments SET status = 'cancelled', updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), enrollment.id).run()

    // 参加者数減算
    await this.db.prepare(`
      UPDATE cms_classes SET 
        current_participants = CASE 
          WHEN current_participants > 0 THEN current_participants - 1 
          ELSE 0 
        END,
        updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), classId).run()
  }

  /**
   * クラス参加者一覧取得
   */
  async getEnrollments(classId: string): Promise<Enrollment[]> {
    const cms_enrollments = await this.db.prepare(`
      SELECT * FROM cms_enrollments 
      WHERE class_id = ? 
      ORDER BY enrolled_at DESC
    `).bind(classId).all()

    return cms_enrollments.results as Enrollment[]
  }

  /**
   * ユーザーの参加クラス一覧取得
   */
  async getUserEnrollments(userId: string): Promise<(Enrollment & { class_title: string })[]> {
    const cms_enrollments = await this.db.prepare(`
      SELECT e.*, c.title as class_title
      FROM cms_enrollments e
      JOIN classes c ON e.class_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).bind(userId).all()

    return cms_enrollments.results as (Enrollment & { class_title: string })[]
  }

  /**
   * 高度な検索・フィルタリング
   */
  async searchClasses(filters: {
    search?: string
    type?: string
    level?: string
    instructor_id?: string
    start_date_from?: string
    start_date_to?: string
    is_online?: boolean
    status?: ContentStatus
    user_role?: string
    user_id?: string
    region_id?: string
  }): Promise<Class[]> {
    let query = `
      SELECT c.*, u.name as instructor_name
      FROM cms_classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.search) {
      query += ` AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ?)`
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (filters.type) {
      query += ` AND c.type = ?`
      params.push(filters.type)
    }

    if (filters.level) {
      query += ` AND c.level = ?`
      params.push(filters.level)
    }

    if (filters.instructor_id) {
      query += ` AND c.instructor_id = ?`
      params.push(filters.instructor_id)
    }

    if (filters.start_date_from) {
      query += ` AND c.start_date >= ?`
      params.push(filters.start_date_from)
    }

    if (filters.start_date_to) {
      query += ` AND c.start_date <= ?`
      params.push(filters.start_date_to)
    }

    if (filters.is_online !== undefined) {
      query += ` AND c.is_online = ?`
      params.push(filters.is_online ? 1 : 0)
    }

    if (filters.status) {
      query += ` AND c.status = ?`
      params.push(filters.status)
    }

    // 権限・地域フィルタリング
    if (filters.user_role && filters.user_id && filters.region_id) {
      query += ` AND ${this.buildPermissionFilter(filters.user_role, filters.user_id, filters.region_id)}`
    }

    query += ` ORDER BY c.featured DESC, c.start_date ASC, c.priority DESC`

    const result = await this.db.prepare(query).bind(...params).all()
    return result.results.map(row => this.parseItem(row as any))
  }

  /**
   * データベース行をClassオブジェクトに変換
   */
  protected parseItem(row: any): Class {
    return {
      ...row,
      is_online: !!row.is_online,
      featured: !!row.featured,
      visibility_roles: JSON.parse(row.visibility_roles || '[]'),
      visibility_regions: JSON.parse(row.visibility_regions || '[]'),
      tags: JSON.parse(row.tags || '[]')
    }
  }
}