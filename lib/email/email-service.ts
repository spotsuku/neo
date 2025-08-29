/**
 * メール通知サービス - Step 8 Email Notification System
 * NEO Digital Platform
 */
import { z } from 'zod'

// メールテンプレート関連スキーマ
export const EmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().optional(),
  
  category: z.enum(['system', 'notification', 'marketing', 'transactional', 'reminder']),
  template_type: z.enum(['announcement', 'class_notification', 'project_update', 'committee_meeting', 'user_invitation', 'password_reset', 'welcome', 'reminder']),
  
  subject_template: z.string(),
  html_template: z.string(),
  text_template: z.string(),
  
  variables: z.array(z.string()).default([]),
  required_variables: z.array(z.string()).default([]),
  
  from_email: z.string().optional(),
  from_name: z.string().optional(),
  reply_to_email: z.string().optional(),
  
  is_active: z.boolean().default(true),
  send_condition: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  
  daily_limit: z.number().default(0),
  rate_limit_minutes: z.number().default(0),
  
  created_by: z.string(),
  created_by_name: z.string(),
  
  created_at: z.string(),
  updated_at: z.string()
})

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>

// メール送信キューのスキーマ
export const EmailQueueSchema = z.object({
  id: z.string(),
  template_id: z.string().optional(),
  
  to_email: z.string().email(),
  to_name: z.string().optional(),
  
  subject: z.string(),
  html_body: z.string(),
  text_body: z.string(),
  
  from_email: z.string().optional(),
  from_name: z.string().optional(),
  reply_to_email: z.string().optional(),
  
  template_variables: z.record(z.any()).default({}),
  
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  
  scheduled_at: z.string().optional(),
  max_retry_attempts: z.number().default(3),
  retry_count: z.number().default(0),
  
  sent_at: z.string().optional(),
  failed_at: z.string().optional(),
  error_message: z.string().optional(),
  provider_message_id: z.string().optional(),
  
  related_type: z.string().optional(),
  related_id: z.string().optional(),
  
  created_by: z.string().optional(),
  created_by_name: z.string().optional(),
  
  created_at: z.string(),
  updated_at: z.string()
})

export type EmailQueue = z.infer<typeof EmailQueueSchema>

/**
 * メール通知サービス
 */
export class EmailNotificationService {
  constructor(private db: D1Database) {}

  /**
   * メールテンプレート作成
   */
  async createTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
    const now = new Date().toISOString()
    const templateId = crypto.randomUUID()
    
    const newTemplate: EmailTemplate = {
      ...template,
      id: templateId,
      created_at: now,
      updated_at: now
    }

    await this.db.prepare(`
      INSERT INTO email_templates (
        id, name, display_name, description, category, template_type,
        subject_template, html_template, text_template, variables,
        required_variables, from_email, from_name, reply_to_email,
        is_active, send_condition, priority, daily_limit, rate_limit_minutes,
        created_by, created_by_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newTemplate.id, newTemplate.name, newTemplate.display_name,
      newTemplate.description, newTemplate.category, newTemplate.template_type,
      newTemplate.subject_template, newTemplate.html_template, newTemplate.text_template,
      JSON.stringify(newTemplate.variables), JSON.stringify(newTemplate.required_variables),
      newTemplate.from_email, newTemplate.from_name, newTemplate.reply_to_email,
      newTemplate.is_active ? '1' : '0', newTemplate.send_condition, newTemplate.priority,
      newTemplate.daily_limit.toString(), newTemplate.rate_limit_minutes.toString(),
      newTemplate.created_by, newTemplate.created_by_name, newTemplate.created_at, newTemplate.updated_at
    ).run()

    return newTemplate
  }

  /**
   * テンプレートを使用してメール送信
   */
  async sendTemplateEmail(
    templateName: string,
    recipients: Array<{ email: string; name?: string }>,
    variables: Record<string, any>,
    options?: {
      scheduled_at?: string
      priority?: 'low' | 'normal' | 'high' | 'urgent'
      related_type?: string
      related_id?: string
      sender?: { id: string; name: string }
    }
  ): Promise<EmailQueue[]> {
    // テンプレート取得
    const template = await this.getTemplateByName(templateName)
    if (!template || !template.is_active) {
      throw new Error(`アクティブなテンプレート '${templateName}' が見つかりません`)
    }

    // 必須変数チェック
    for (const requiredVar of template.required_variables) {
      if (!(requiredVar in variables)) {
        throw new Error(`必須変数 '${requiredVar}' が不足しています`)
      }
    }

    const queueItems: EmailQueue[] = []
    const now = new Date().toISOString()

    for (const recipient of recipients) {
      // ユーザーの配信設定チェック
      const canSend = await this.canSendToUser(recipient.email, template.category)
      if (!canSend) {
        console.log(`配信設定により ${recipient.email} への送信をスキップ`)
        continue
      }

      // テンプレート処理
      const processedContent = this.processTemplate(template, variables)
      
      const queueItem: EmailQueue = {
        id: crypto.randomUUID(),
        template_id: template.id,
        to_email: recipient.email,
        to_name: recipient.name,
        subject: processedContent.subject,
        html_body: processedContent.html,
        text_body: processedContent.text,
        from_email: template.from_email,
        from_name: template.from_name,
        reply_to_email: template.reply_to_email,
        template_variables: variables,
        status: 'pending',
        priority: options?.priority || template.priority,
        scheduled_at: options?.scheduled_at,
        max_retry_attempts: 3,
        retry_count: 0,
        related_type: options?.related_type,
        related_id: options?.related_id,
        created_by: options?.sender?.id,
        created_by_name: options?.sender?.name,
        created_at: now,
        updated_at: now
      }

      await this.addToQueue(queueItem)
      queueItems.push(queueItem)
    }

    return queueItems
  }

  /**
   * 直接メール送信（テンプレート無し）
   */
  async sendDirectEmail(
    recipients: Array<{ email: string; name?: string }>,
    content: {
      subject: string
      html_body: string
      text_body?: string
      from_email?: string
      from_name?: string
      reply_to_email?: string
    },
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'urgent'
      scheduled_at?: string
      related_type?: string
      related_id?: string
      sender?: { id: string; name: string }
    }
  ): Promise<EmailQueue[]> {
    const queueItems: EmailQueue[] = []
    const now = new Date().toISOString()

    for (const recipient of recipients) {
      const queueItem: EmailQueue = {
        id: crypto.randomUUID(),
        to_email: recipient.email,
        to_name: recipient.name,
        subject: content.subject,
        html_body: content.html_body,
        text_body: content.text_body || this.htmlToText(content.html_body),
        from_email: content.from_email,
        from_name: content.from_name,
        reply_to_email: content.reply_to_email,
        template_variables: {},
        status: 'pending',
        priority: options?.priority || 'normal',
        scheduled_at: options?.scheduled_at,
        max_retry_attempts: 3,
        retry_count: 0,
        related_type: options?.related_type,
        related_id: options?.related_id,
        created_by: options?.sender?.id,
        created_by_name: options?.sender?.name,
        created_at: now,
        updated_at: now
      }

      await this.addToQueue(queueItem)
      queueItems.push(queueItem)
    }

    return queueItems
  }

  /**
   * 送信キュー処理（Cron / Worker用）
   */
  async processQueue(batchSize: number = 10): Promise<{ processed: number; failed: number }> {
    // 送信対象のメール取得
    const pendingEmails = await this.db.prepare(`
      SELECT * FROM email_queue 
      WHERE status = 'pending' 
        AND (scheduled_at IS NULL OR scheduled_at <= ?)
      ORDER BY priority DESC, created_at ASC 
      LIMIT ?
    `).bind(new Date().toISOString(), batchSize).all()

    let processed = 0
    let failed = 0

    for (const email of pendingEmails.results) {
      try {
        await this.sendEmail(email as any)
        processed++
      } catch (error) {
        console.error('Email sending failed:', error)
        await this.markEmailFailed(email.id as string, error instanceof Error ? error.message : 'Unknown error')
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * ユーザーの配信設定更新
   */
  async updateUserPreferences(
    userId: string,
    preferences: {
      email_notifications_enabled?: boolean
      announcements_enabled?: boolean
      class_notifications_enabled?: boolean
      project_updates_enabled?: boolean
      committee_meetings_enabled?: boolean
      marketing_emails_enabled?: boolean
      digest_frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'disabled'
      preferred_send_time?: string
      timezone?: string
      preferred_language?: string
    }
  ): Promise<void> {
    const now = new Date().toISOString()
    
    // UPSERT操作
    await this.db.prepare(`
      INSERT INTO user_email_preferences (
        id, user_id, email_notifications_enabled, announcements_enabled,
        class_notifications_enabled, project_updates_enabled,
        committee_meetings_enabled, marketing_emails_enabled,
        digest_frequency, preferred_send_time, timezone,
        preferred_language, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email_notifications_enabled = COALESCE(?, email_notifications_enabled),
        announcements_enabled = COALESCE(?, announcements_enabled),
        class_notifications_enabled = COALESCE(?, class_notifications_enabled),
        project_updates_enabled = COALESCE(?, project_updates_enabled),
        committee_meetings_enabled = COALESCE(?, committee_meetings_enabled),
        marketing_emails_enabled = COALESCE(?, marketing_emails_enabled),
        digest_frequency = COALESCE(?, digest_frequency),
        preferred_send_time = COALESCE(?, preferred_send_time),
        timezone = COALESCE(?, timezone),
        preferred_language = COALESCE(?, preferred_language),
        updated_at = ?
    `).bind(
      crypto.randomUUID(), userId,
      preferences.email_notifications_enabled ? '1' : '0',
      preferences.announcements_enabled ? '1' : '0',
      preferences.class_notifications_enabled ? '1' : '0',
      preferences.project_updates_enabled ? '1' : '0',
      preferences.committee_meetings_enabled ? '1' : '0',
      preferences.marketing_emails_enabled ? '1' : '0',
      preferences.digest_frequency,
      preferences.preferred_send_time,
      preferences.timezone,
      preferences.preferred_language,
      now, now,
      // UPDATE部分の値
      preferences.email_notifications_enabled ? '1' : '0',
      preferences.announcements_enabled ? '1' : '0',
      preferences.class_notifications_enabled ? '1' : '0',
      preferences.project_updates_enabled ? '1' : '0',
      preferences.committee_meetings_enabled ? '1' : '0',
      preferences.marketing_emails_enabled ? '1' : '0',
      preferences.digest_frequency,
      preferences.preferred_send_time,
      preferences.timezone,
      preferences.preferred_language,
      now
    ).run()
  }

  // プライベートメソッド

  private async getTemplateByName(name: string): Promise<EmailTemplate | null> {
    const result = await this.db.prepare(`
      SELECT * FROM email_templates WHERE name = ? AND is_active = '1'
    `).bind(name).first()

    if (!result) return null

    return this.parseTemplate(result as any)
  }

  private processTemplate(template: EmailTemplate, variables: Record<string, any>) {
    let subject = template.subject_template
    let html = template.html_template
    let text = template.text_template

    // 変数置換
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
      html = html.replace(new RegExp(placeholder, 'g'), String(value))
      text = text.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return { subject, html, text }
  }

  private async canSendToUser(email: string, category: string): Promise<boolean> {
    // ユーザーの配信設定チェック
    const preferences = await this.db.prepare(`
      SELECT * FROM user_email_preferences 
      WHERE user_id = (SELECT id FROM users WHERE email = ?)
    `).bind(email).first()

    if (!preferences) return true // 設定がない場合は送信許可

    // 全般的な通知無効の場合
    if (preferences.email_notifications_enabled === '0') return false

    // カテゴリ別チェック
    switch (category) {
      case 'notification':
        return preferences.announcements_enabled === '1'
      case 'marketing':
        return preferences.marketing_emails_enabled === '1'
      default:
        return true
    }
  }

  private async addToQueue(queueItem: EmailQueue): Promise<void> {
    await this.db.prepare(`
      INSERT INTO email_queue (
        id, template_id, to_email, to_name, subject, html_body, text_body,
        from_email, from_name, reply_to_email, template_variables,
        status, priority, scheduled_at, max_retry_attempts, retry_count,
        related_type, related_id, created_by, created_by_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      queueItem.id, queueItem.template_id, queueItem.to_email, queueItem.to_name,
      queueItem.subject, queueItem.html_body, queueItem.text_body,
      queueItem.from_email, queueItem.from_name, queueItem.reply_to_email,
      JSON.stringify(queueItem.template_variables), queueItem.status, queueItem.priority,
      queueItem.scheduled_at, queueItem.max_retry_attempts.toString(), queueItem.retry_count.toString(),
      queueItem.related_type, queueItem.related_id, queueItem.created_by, queueItem.created_by_name,
      queueItem.created_at, queueItem.updated_at
    ).run()
  }

  private async sendEmail(queueItem: EmailQueue): Promise<void> {
    // 実際の送信処理（Resend, SendGrid, Mailgun等のAPIを使用）
    // この例ではResend APIを使用
    
    const emailPayload = {
      from: queueItem.from_email || 'noreply@example.com',
      to: [queueItem.to_email],
      subject: queueItem.subject,
      html: queueItem.html_body,
      text: queueItem.text_body
    }

    // 実際の送信API呼び出し（環境変数からAPIキー取得）
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(emailPayload)
    // })

    // 送信成功の場合
    await this.markEmailSent(queueItem.id, 'mock_message_id')
  }

  private async markEmailSent(queueId: string, messageId: string): Promise<void> {
    const now = new Date().toISOString()
    
    await this.db.prepare(`
      UPDATE email_queue 
      SET status = 'sent', sent_at = ?, provider_message_id = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, messageId, now, queueId).run()
  }

  private async markEmailFailed(queueId: string, errorMessage: string): Promise<void> {
    const now = new Date().toISOString()
    
    await this.db.prepare(`
      UPDATE email_queue 
      SET status = 'failed', failed_at = ?, error_message = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, errorMessage, now, queueId).run()
  }

  private htmlToText(html: string): string {
    // 簡易HTML→テキスト変換（実際はより高度なライブラリを使用）
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private parseTemplate(row: any): EmailTemplate {
    return {
      ...row,
      variables: JSON.parse(row.variables || '[]'),
      required_variables: JSON.parse(row.required_variables || '[]'),
      is_active: row.is_active === '1',
      daily_limit: parseInt(row.daily_limit || '0'),
      rate_limit_minutes: parseInt(row.rate_limit_minutes || '0')
    }
  }
}