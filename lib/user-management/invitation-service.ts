/**
 * ユーザー招待・管理サービス - Step 16 User Management UI & Invitations  
 * NEO Digital Platform
 */
import { z } from 'zod'

export const InvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['owner', 'secretariat', 'company_admin', 'student']),
  company_id: z.string(),
  region_id: z.string(),
  invited_by: z.string(),
  token: z.string(),
  expires_at: z.string(),
  accepted_at: z.string().optional(),
  created_at: z.string()
})

export type Invitation = z.infer<typeof InvitationSchema>

export class InvitationService {
  constructor(private db: D1Database) {}

  async inviteUser(invitation: Omit<Invitation, 'id' | 'token' | 'created_at' | 'expires_at'>): Promise<Invitation> {
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    
    const newInvitation: Invitation = {
      ...invitation,
      id: crypto.randomUUID(),
      token,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    }

    await this.db.prepare(`
      INSERT INTO invitation_tokens (
        id, email, role, company_id, region_id, invited_by, token, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newInvitation.id, newInvitation.email, newInvitation.role,
      newInvitation.company_id, newInvitation.region_id, newInvitation.invited_by,
      newInvitation.token, newInvitation.expires_at, newInvitation.created_at
    ).run()

    return newInvitation
  }

  async acceptInvitation(token: string): Promise<Invitation | null> {
    const invitation = await this.db.prepare(`
      SELECT * FROM invitation_tokens WHERE token = ? AND expires_at > ? AND accepted_at IS NULL
    `).bind(token, new Date().toISOString()).first()

    if (!invitation) return null

    await this.db.prepare(`
      UPDATE invitation_tokens SET accepted_at = ? WHERE token = ?
    `).bind(new Date().toISOString(), token).run()

    return invitation as Invitation
  }
}