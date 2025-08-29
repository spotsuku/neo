/**
 * プロジェクト管理CMS - 学習プロジェクト・グループワーク管理サービス
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { z } from 'zod'
import { BaseCMSService, BaseCMSItem, ContentStatus, VisibilityScope, NotificationQueue } from './base-cms'

// プロジェクト関連のZodスキーマ
export const ProjectStatusSchema = z.enum(['planning', 'active', 'review', 'completed', 'cancelled', 'archived'])
export const ProjectTypeSchema = z.enum(['individual', 'group', 'team', 'company_wide', 'cross_regional'])
export const ProjectPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'プロジェクト名は必須です'),
  description: z.string().optional(),
  objectives: z.string().optional(), // プロジェクト目標
  
  // プロジェクト分類
  type: ProjectTypeSchema,
  priority: ProjectPrioritySchema,
  project_status: ProjectStatusSchema, // CMS statusと区別
  
  // 責任者・メンバー
  manager_id: z.string(),
  manager_name: z.string(),
  team_members: z.array(z.string()).default([]), // user IDs
  max_members: z.number().min(1).max(100).optional(),
  
  // スケジュール
  start_date: z.string(), // ISO date
  due_date: z.string().optional(),
  estimated_hours: z.number().min(0).optional(),
  actual_hours: z.number().min(0).default(0),
  
  // 進捗・成果
  progress_percentage: z.number().min(0).max(100).default(0),
  deliverables: z.string().optional(), // 成果物の説明
  deliverable_urls: z.array(z.string()).default([]), // ファイル・リンク
  
  // 予算・リソース
  budget: z.number().min(0).default(0),
  currency: z.string().default('JPY'),
  resources_required: z.string().optional(),
  
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
  
  created_at: z.string(),
  updated_at: z.string(),
  published_at: z.string().optional(),
  
  // 統計データ
  view_count: z.number().default(0),
  participant_count: z.number().default(0)
})

export type Project = z.infer<typeof ProjectSchema>

// プロジェクトタスク
export const TaskSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  title: z.string().min(1, 'タスク名は必須です'),
  description: z.string().optional(),
  
  // 担当・期限
  assignee_id: z.string().optional(),
  assignee_name: z.string().optional(),
  due_date: z.string().optional(),
  
  // 進捗
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'cancelled']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  estimated_hours: z.number().min(0).optional(),
  actual_hours: z.number().min(0).default(0),
  
  // 依存関係
  depends_on: z.array(z.string()).default([]), // task IDs
  
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().optional()
})

export type Task = z.infer<typeof TaskSchema>

// プロジェクト参加申請
export const ParticipationRequestSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  message: z.string().optional(), // 申請メッセージ
  status: z.enum(['pending', 'approved', 'rejected']),
  requested_at: z.string(),
  reviewed_at: z.string().optional(),
  reviewed_by: z.string().optional()
})

export type ParticipationRequest = z.infer<typeof ParticipationRequestSchema>

/**
 * プロジェクト管理サービス
 */
export class ProjectService extends BaseCMSService<Project> {
  protected tableName = 'cms_projects'
  protected schema = ProjectSchema

  /**
   * プロジェクト作成
   */
  async create(item: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    
    const project: Project = {
      ...item,
      id,
      created_at: now,
      updated_at: now,
      actual_hours: 0,
      progress_percentage: 0,
      view_count: 0,
      participant_count: item.team_members.length
    }

    // データベース挿入
    const query = `
      INSERT INTO cms_projects (
        id, title, description, objectives, type, priority, project_status,
        manager_id, manager_name, team_members, max_members, start_date,
        due_date, estimated_hours, actual_hours, progress_percentage,
        deliverables, deliverable_urls, budget, currency, resources_required,
        status, visibility_scope, visibility_roles, visibility_regions,
        author_id, author_name, tags, category, featured, created_at,
        updated_at, view_count, participant_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await this.db.prepare(query).bind(
      project.id, project.title, project.description, project.objectives,
      project.type, project.priority, project.project_status, project.manager_id,
      project.manager_name, JSON.stringify(project.team_members), project.max_members,
      project.start_date, project.due_date, project.estimated_hours,
      project.actual_hours, project.progress_percentage, project.deliverables,
      JSON.stringify(project.deliverable_urls), project.budget, project.currency,
      project.resources_required, project.status, project.visibility_scope,
      JSON.stringify(project.visibility_roles), JSON.stringify(project.visibility_regions),
      project.author_id, project.author_name, JSON.stringify(project.tags),
      project.category, project.featured ? 1 : 0, project.created_at,
      project.updated_at, project.view_count, project.participant_count
    ).run()

    // 公開時は通知キューに追加
    if (project.status === ContentStatus.PUBLISHED) {
      await this.addToNotificationQueue({
        id: crypto.randomUUID(),
        content_type: 'project',
        content_id: project.id,
        title: `新しいプロジェクト: ${project.title}`,
        message: project.description || '',
        target_roles: project.visibility_roles,
        target_regions: project.visibility_regions,
        scheduled_at: now,
        priority: project.priority === 'urgent' ? 5 : project.priority === 'high' ? 4 : 3
      })
    }

    return project
  }

  /**
   * プロジェクト参加申請
   */
  async requestParticipation(
    projectId: string,
    userId: string,
    userName: string,
    message?: string
  ): Promise<ParticipationRequest> {
    const project = await this.getById(projectId)
    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    // 既に参加中かチェック
    if (project.team_members.includes(userId)) {
      throw new Error('既にプロジェクトに参加しています')
    }

    // 定員チェック
    if (project.max_members && project.team_members.length >= project.max_members) {
      throw new Error('プロジェクトの定員に達しています')
    }

    // 既に申請済みかチェック
    const existing = await this.db.prepare(`
      SELECT * FROM cms_participation_requests 
      WHERE project_id = ? AND user_id = ? AND status = 'pending'
    `).bind(projectId, userId).first()

    if (existing) {
      throw new Error('既に参加申請済みです')
    }

    const request: ParticipationRequest = {
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: userId,
      user_name: userName,
      message,
      status: 'pending',
      requested_at: new Date().toISOString()
    }

    await this.db.prepare(`
      INSERT INTO cms_participation_requests (
        id, project_id, user_id, user_name, message, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      request.id, request.project_id, request.user_id, request.user_name,
      request.message, request.status, request.requested_at
    ).run()

    // プロジェクトマネージャーに通知
    await this.addToNotificationQueue({
      id: crypto.randomUUID(),
      content_type: 'participation_request',
      content_id: request.id,
      title: `プロジェクト参加申請: ${project.title}`,
      message: `${userName}さんがプロジェクトへの参加を希望しています`,
      target_users: [project.manager_id],
      scheduled_at: new Date().toISOString(),
      priority: 4
    })

    return request
  }

  /**
   * 参加申請の承認/拒否
   */
  async reviewParticipationRequest(
    requestId: string,
    reviewerId: string,
    action: 'approve' | 'reject'
  ): Promise<void> {
    const request = await this.db.prepare(`
      SELECT * FROM cms_participation_requests WHERE id = ?
    `).bind(requestId).first() as ParticipationRequest | null

    if (!request || request.status !== 'pending') {
      throw new Error('有効な申請が見つかりません')
    }

    const now = new Date().toISOString()
    const status = action === 'approve' ? 'approved' : 'rejected'

    // 申請ステータス更新
    await this.db.prepare(`
      UPDATE cms_participation_requests 
      SET status = ?, reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `).bind(status, now, reviewerId, requestId).run()

    if (action === 'approve') {
      // プロジェクトメンバーに追加
      const project = await this.getById(request.project_id)
      if (project) {
        const updatedMembers = [...project.team_members, request.user_id]
        await this.update(project.id, {
          team_members: updatedMembers,
          participant_count: updatedMembers.length
        })
      }
    }

    // 申請者に通知
    await this.addToNotificationQueue({
      id: crypto.randomUUID(),
      content_type: 'participation_result',
      content_id: request.project_id,
      title: `プロジェクト参加申請の結果`,
      message: action === 'approve' ? 
        'プロジェクトへの参加が承認されました' : 
        'プロジェクトへの参加が見送られました',
      target_users: [request.user_id],
      scheduled_at: now,
      priority: 4
    })
  }

  /**
   * タスク作成
   */
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const now = new Date().toISOString()
    const taskItem: Task = {
      ...task,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      actual_hours: 0
    }

    await this.db.prepare(`
      INSERT INTO cms_project_tasks (
        id, project_id, title, description, assignee_id, assignee_name,
        due_date, status, priority, estimated_hours, actual_hours,
        depends_on, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskItem.id, taskItem.project_id, taskItem.title, taskItem.description,
      taskItem.assignee_id, taskItem.assignee_name, taskItem.due_date,
      taskItem.status, taskItem.priority, taskItem.estimated_hours,
      taskItem.actual_hours, JSON.stringify(taskItem.depends_on),
      taskItem.created_at, taskItem.updated_at
    ).run()

    return taskItem
  }

  /**
   * プロジェクトのタスク一覧取得
   */
  async getProjectTasks(projectId: string): Promise<Task[]> {
    const tasks = await this.db.prepare(`
      SELECT * FROM cms_project_tasks 
      WHERE project_id = ? 
      ORDER BY priority DESC, created_at ASC
    `).bind(projectId).all()

    return tasks.results.map(row => ({
      ...row,
      depends_on: JSON.parse((row as any).depends_on || '[]')
    })) as Task[]
  }

  /**
   * 進捗更新（タスク完了時の自動計算）
   */
  async updateProgress(projectId: string): Promise<void> {
    const tasks = await this.getProjectTasks(projectId)
    if (tasks.length === 0) return

    const completedTasks = tasks.filter(t => t.status === 'done').length
    const progress = Math.round((completedTasks / tasks.length) * 100)

    await this.db.prepare(`
      UPDATE cms_projects SET progress_percentage = ?, updated_at = ? WHERE id = ?
    `).bind(progress, new Date().toISOString(), projectId).run()
  }

  /**
   * 高度な検索・フィルタリング
   */
  async searchProjects(filters: {
    search?: string
    type?: string
    project_status?: string
    priority?: string
    manager_id?: string
    participant_id?: string
    start_date_from?: string
    start_date_to?: string
    user_role?: string
    user_id?: string
    region_id?: string
  }): Promise<Project[]> {
    let query = `
      SELECT p.*, u.name as manager_name
      FROM cms_projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.search) {
      query += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)`
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (filters.type) {
      query += ` AND p.type = ?`
      params.push(filters.type)
    }

    if (filters.project_status) {
      query += ` AND p.project_status = ?`
      params.push(filters.project_status)
    }

    if (filters.priority) {
      query += ` AND p.priority = ?`
      params.push(filters.priority)
    }

    if (filters.manager_id) {
      query += ` AND p.manager_id = ?`
      params.push(filters.manager_id)
    }

    if (filters.participant_id) {
      query += ` AND JSON_EXTRACT(p.team_members, '$') LIKE ?`
      params.push(`%"${filters.participant_id}"%`)
    }

    if (filters.start_date_from) {
      query += ` AND p.start_date >= ?`
      params.push(filters.start_date_from)
    }

    if (filters.start_date_to) {
      query += ` AND p.start_date <= ?`
      params.push(filters.start_date_to)
    }

    // 権限・地域フィルタリング
    if (filters.user_role && filters.user_id && filters.region_id) {
      query += ` AND ${this.buildPermissionFilter(filters.user_role, filters.user_id, filters.region_id)}`
    }

    query += ` ORDER BY p.priority DESC, p.start_date DESC, p.featured DESC`

    const result = await this.db.prepare(query).bind(...params).all()
    return result.results.map(row => this.parseItem(row as any))
  }

  /**
   * データベース行をProjectオブジェクトに変換
   */
  protected parseItem(row: any): Project {
    return {
      ...row,
      featured: !!row.featured,
      team_members: JSON.parse(row.team_members || '[]'),
      deliverable_urls: JSON.parse(row.deliverable_urls || '[]'),
      visibility_roles: JSON.parse(row.visibility_roles || '[]'),
      visibility_regions: JSON.parse(row.visibility_regions || '[]'),
      tags: JSON.parse(row.tags || '[]')
    }
  }
}