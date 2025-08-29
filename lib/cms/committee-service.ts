/**
 * 委員会管理CMS - 組織委員会・部会管理サービス
 * NEO Digital Platform - Step 6 CMS Implementation
 */
import { z } from 'zod'
import { BaseCMSService, BaseCMSItem, ContentStatus, VisibilityScope, NotificationQueue } from './base-cms'

// 委員会関連のZodスキーマ
export const CommitteeTypeSchema = z.enum(['standing', 'special', 'working_group', 'task_force', 'advisory'])
export const CommitteeStatusSchema = z.enum(['active', 'inactive', 'dissolved', 'suspended'])
export const MemberRoleSchema = z.enum(['chairperson', 'vice_chair', 'secretary', 'treasurer', 'member', 'observer'])
export const MeetingTypeSchema = z.enum(['regular', 'emergency', 'special', 'online', 'hybrid'])

export const CommitteeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '委員会名は必須です'),
  description: z.string().optional(),
  purpose: z.string().optional(), // 目的・設立趣旨
  
  // 委員会分類
  type: CommitteeTypeSchema,
  committee_status: CommitteeStatusSchema, // CMS statusと区別
  
  // リーダーシップ
  chairperson_id: z.string(),
  chairperson_name: z.string(),
  vice_chair_id: z.string().optional(),
  vice_chair_name: z.string().optional(),
  secretary_id: z.string().optional(),
  secretary_name: z.string().optional(),
  
  // メンバーシップ
  members: z.array(z.object({
    user_id: z.string(),
    user_name: z.string(),
    role: MemberRoleSchema,
    joined_at: z.string(),
    term_end: z.string().optional()
  })).default([]),
  max_members: z.number().min(1).max(200).optional(),
  
  // 活動期間
  established_date: z.string(), // ISO date
  term_end_date: z.string().optional(),
  meeting_frequency: z.string().optional(), // "月1回", "隔週"など
  
  // 会議情報
  regular_meeting_day: z.string().optional(), // "第1火曜日"など
  meeting_location: z.string().optional(),
  default_meeting_duration: z.number().min(30).max(480).default(120), // minutes
  
  // 権限・責任
  decision_authority: z.string().optional(),
  reporting_to: z.string().optional(), // 報告先委員会・役職
  budget_authority: z.number().min(0).default(0),
  
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
  meeting_count: z.number().default(0),
  member_count: z.number().default(0)
})

export type Committee = z.infer<typeof CommitteeSchema>
export type CommitteeMember = Committee['members'][0]

// 委員会会議
export const MeetingSchema = z.object({
  id: z.string(),
  committee_id: z.string(),
  title: z.string().min(1, '会議名は必須です'),
  type: MeetingTypeSchema,
  
  // 日程・場所
  scheduled_date: z.string(), // ISO datetime
  duration_minutes: z.number().min(30).max(480),
  location: z.string().optional(),
  meeting_url: z.string().url().optional(),
  meeting_password: z.string().optional(),
  
  // 議事・決議
  agenda: z.string().optional(),
  minutes: z.string().optional(), // 議事録
  decisions: z.array(z.object({
    item: z.string(),
    decision: z.string(),
    votes_for: z.number().default(0),
    votes_against: z.number().default(0),
    abstentions: z.number().default(0)
  })).default([]),
  
  // 参加者
  attendees: z.array(z.object({
    user_id: z.string(),
    user_name: z.string(),
    status: z.enum(['present', 'absent', 'late', 'early_leave'])
  })).default([]),
  
  // 資料・添付
  documents: z.array(z.string()).default([]), // file URLs
  
  // ステータス
  meeting_status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().optional()
})

export type Meeting = z.infer<typeof MeetingSchema>

// 委員会決議事項
export const ResolutionSchema = z.object({
  id: z.string(),
  committee_id: z.string(),
  meeting_id: z.string().optional(),
  title: z.string().min(1, '決議事項名は必須です'),
  content: z.string(),
  
  // 採決結果
  votes_for: z.number().default(0),
  votes_against: z.number().default(0),
  abstentions: z.number().default(0),
  
  // 実施・フォローアップ
  implementation_status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  responsible_member_id: z.string().optional(),
  due_date: z.string().optional(),
  
  decided_at: z.string(),
  implemented_at: z.string().optional()
})

export type Resolution = z.infer<typeof ResolutionSchema>

/**
 * 委員会管理サービス
 */
export class CommitteeService extends BaseCMSService<Committee> {
  protected tableName = 'cms_committees'
  protected schema = CommitteeSchema

  /**
   * 委員会作成
   */
  async create(item: Omit<Committee, 'id' | 'created_at' | 'updated_at'>): Promise<Committee> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    
    const committee: Committee = {
      ...item,
      id,
      created_at: now,
      updated_at: now,
      view_count: 0,
      meeting_count: 0,
      member_count: item.members.length
    }

    // 委員長を最初のメンバーに追加
    if (!committee.members.find(m => m.user_id === committee.chairperson_id)) {
      committee.members.unshift({
        user_id: committee.chairperson_id,
        user_name: committee.chairperson_name,
        role: 'chairperson' as MemberRoleSchema,
        joined_at: now
      })
      committee.member_count = committee.members.length
    }

    // データベース挿入
    const query = `
      INSERT INTO cms_committees (
        id, name, description, purpose, type, committee_status,
        chairperson_id, chairperson_name, vice_chair_id, vice_chair_name,
        secretary_id, secretary_name, members, max_members,
        established_date, term_end_date, meeting_frequency,
        regular_meeting_day, meeting_location, default_meeting_duration,
        decision_authority, reporting_to, budget_authority, status,
        visibility_scope, visibility_roles, visibility_regions,
        author_id, author_name, tags, category, featured,
        created_at, updated_at, view_count, meeting_count, member_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await this.db.prepare(query).bind(
      committee.id, committee.name, committee.description, committee.purpose,
      committee.type, committee.committee_status, committee.chairperson_id,
      committee.chairperson_name, committee.vice_chair_id, committee.vice_chair_name,
      committee.secretary_id, committee.secretary_name, JSON.stringify(committee.members),
      committee.max_members, committee.established_date, committee.term_end_date,
      committee.meeting_frequency, committee.regular_meeting_day,
      committee.meeting_location, committee.default_meeting_duration,
      committee.decision_authority, committee.reporting_to, committee.budget_authority,
      committee.status, committee.visibility_scope, JSON.stringify(committee.visibility_roles),
      JSON.stringify(committee.visibility_regions), committee.author_id,
      committee.author_name, JSON.stringify(committee.tags), committee.category,
      committee.featured ? 1 : 0, committee.created_at, committee.updated_at,
      committee.view_count, committee.meeting_count, committee.member_count
    ).run()

    // 公開時は通知キューに追加
    if (committee.status === ContentStatus.PUBLISHED) {
      await this.addToNotificationQueue({
        id: crypto.randomUUID(),
        content_type: 'committee',
        content_id: committee.id,
        title: `新しい委員会: ${committee.name}`,
        message: committee.description || '',
        target_roles: committee.visibility_roles,
        target_regions: committee.visibility_regions,
        scheduled_at: now,
        priority: 4
      })
    }

    return committee
  }

  /**
   * 委員会メンバー追加
   */
  async addMember(
    committeeId: string,
    userId: string,
    userName: string,
    role: MemberRoleSchema = 'member'
  ): Promise<void> {
    const committee = await this.getById(committeeId)
    if (!committee) {
      throw new Error('委員会が見つかりません')
    }

    // 既にメンバーかチェック
    if (committee.members.find(m => m.user_id === userId)) {
      throw new Error('既に委員会のメンバーです')
    }

    // 定員チェック
    if (committee.max_members && committee.members.length >= committee.max_members) {
      throw new Error('委員会の定員に達しています')
    }

    const newMember: CommitteeMember = {
      user_id: userId,
      user_name: userName,
      role,
      joined_at: new Date().toISOString()
    }

    const updatedMembers = [...committee.members, newMember]

    await this.db.prepare(`
      UPDATE cms_committees 
      SET members = ?, member_count = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(updatedMembers),
      updatedMembers.length,
      new Date().toISOString(),
      committeeId
    ).run()
  }

  /**
   * 委員会メンバー削除
   */
  async removeMember(committeeId: string, userId: string): Promise<void> {
    const committee = await this.getById(committeeId)
    if (!committee) {
      throw new Error('委員会が見つかりません')
    }

    // 委員長は削除できない
    if (committee.chairperson_id === userId) {
      throw new Error('委員長は削除できません')
    }

    const updatedMembers = committee.members.filter(m => m.user_id !== userId)

    await this.db.prepare(`
      UPDATE cms_committees 
      SET members = ?, member_count = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(updatedMembers),
      updatedMembers.length,
      new Date().toISOString(),
      committeeId
    ).run()
  }

  /**
   * 会議開催
   */
  async scheduleMeeting(meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>): Promise<Meeting> {
    const now = new Date().toISOString()
    const meetingItem: Meeting = {
      ...meeting,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      meeting_status: 'scheduled'
    }

    await this.db.prepare(`
      INSERT INTO cms_committee_meetings (
        id, committee_id, title, type, scheduled_date, duration_minutes,
        location, meeting_url, meeting_password, agenda, minutes,
        decisions, attendees, documents, meeting_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      meetingItem.id, meetingItem.committee_id, meetingItem.title,
      meetingItem.type, meetingItem.scheduled_date, meetingItem.duration_minutes,
      meetingItem.location, meetingItem.meeting_url, meetingItem.meeting_password,
      meetingItem.agenda, meetingItem.minutes, JSON.stringify(meetingItem.decisions),
      JSON.stringify(meetingItem.attendees), JSON.stringify(meetingItem.documents),
      meetingItem.meeting_status, meetingItem.created_at, meetingItem.updated_at
    ).run()

    // 会議回数更新
    await this.db.prepare(`
      UPDATE cms_committees SET meeting_count = meeting_count + 1, updated_at = ? WHERE id = ?
    `).bind(now, meeting.committee_id).run()

    // 委員会メンバーに通知
    const committee = await this.getById(meeting.committee_id)
    if (committee) {
      const memberIds = committee.members.map(m => m.user_id)
      await this.addToNotificationQueue({
        id: crypto.randomUUID(),
        content_type: 'meeting',
        content_id: meetingItem.id,
        title: `会議開催のお知らせ: ${meetingItem.title}`,
        message: `${committee.name}の会議が開催されます`,
        target_users: memberIds,
        scheduled_at: now,
        priority: 4
      })
    }

    return meetingItem
  }

  /**
   * 委員会の会議一覧取得
   */
  async getCommitteeMeetings(committeeId: string): Promise<Meeting[]> {
    const meetings = await this.db.prepare(`
      SELECT * FROM cms_committee_meetings 
      WHERE committee_id = ? 
      ORDER BY scheduled_date DESC
    `).bind(committeeId).all()

    return meetings.results.map(row => ({
      ...row,
      decisions: JSON.parse((row as any).decisions || '[]'),
      attendees: JSON.parse((row as any).attendees || '[]'),
      documents: JSON.parse((row as any).documents || '[]')
    })) as Meeting[]
  }

  /**
   * 決議事項記録
   */
  async recordResolution(resolution: Omit<Resolution, 'id' | 'decided_at'>): Promise<Resolution> {
    const resolutionItem: Resolution = {
      ...resolution,
      id: crypto.randomUUID(),
      decided_at: new Date().toISOString()
    }

    await this.db.prepare(`
      INSERT INTO cms_committee_resolutions (
        id, committee_id, meeting_id, title, content, votes_for,
        votes_against, abstentions, implementation_status,
        responsible_member_id, due_date, decided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resolutionItem.id, resolutionItem.committee_id, resolutionItem.meeting_id,
      resolutionItem.title, resolutionItem.content, resolutionItem.votes_for,
      resolutionItem.votes_against, resolutionItem.abstentions,
      resolutionItem.implementation_status, resolutionItem.responsible_member_id,
      resolutionItem.due_date, resolutionItem.decided_at
    ).run()

    return resolutionItem
  }

  /**
   * 高度な検索・フィルタリング
   */
  async searchCommittees(filters: {
    search?: string
    type?: string
    committee_status?: string
    chairperson_id?: string
    member_id?: string
    established_after?: string
    established_before?: string
    user_role?: string
    user_id?: string
    region_id?: string
  }): Promise<Committee[]> {
    let query = `
      SELECT c.*, u.name as chairperson_name
      FROM cms_committees c
      LEFT JOIN users u ON c.chairperson_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.search) {
      query += ` AND (c.name LIKE ? OR c.description LIKE ? OR c.tags LIKE ?)`
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (filters.type) {
      query += ` AND c.type = ?`
      params.push(filters.type)
    }

    if (filters.committee_status) {
      query += ` AND c.committee_status = ?`
      params.push(filters.committee_status)
    }

    if (filters.chairperson_id) {
      query += ` AND c.chairperson_id = ?`
      params.push(filters.chairperson_id)
    }

    if (filters.member_id) {
      query += ` AND JSON_EXTRACT(c.members, '$') LIKE ?`
      params.push(`%"user_id":"${filters.member_id}"%`)
    }

    if (filters.established_after) {
      query += ` AND c.established_date >= ?`
      params.push(filters.established_after)
    }

    if (filters.established_before) {
      query += ` AND c.established_date <= ?`
      params.push(filters.established_before)
    }

    // 権限・地域フィルタリング
    if (filters.user_role && filters.user_id && filters.region_id) {
      query += ` AND ${this.buildPermissionFilter(filters.user_role, filters.user_id, filters.region_id)}`
    }

    query += ` ORDER BY c.committee_status ASC, c.established_date DESC, c.featured DESC`

    const result = await this.db.prepare(query).bind(...params).all()
    return result.results.map(row => this.parseItem(row as any))
  }

  /**
   * データベース行をCommitteeオブジェクトに変換
   */
  protected parseItem(row: any): Committee {
    return {
      ...row,
      featured: !!row.featured,
      members: JSON.parse(row.members || '[]'),
      visibility_roles: JSON.parse(row.visibility_roles || '[]'),
      visibility_regions: JSON.parse(row.visibility_regions || '[]'),
      tags: JSON.parse(row.tags || '[]')
    }
  }
}