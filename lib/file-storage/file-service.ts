/**
 * ファイルストレージサービス - Cloudflare R2統合
 * NEO Digital Platform - Step 7 File Upload Implementation
 */
import { z } from 'zod'

// ファイル関連のスキーマ
export const FileUploadSchema = z.object({
  id: z.string(),
  filename: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  
  // R2ストレージパス
  r2_key: z.string(),
  r2_url: z.string(),
  
  // ファイル分類
  file_type: z.enum(['image', 'document', 'video', 'audio', 'other']),
  category: z.string().optional(),
  
  // 関連性
  related_type: z.string().optional(),
  related_id: z.string().optional(),
  
  // セキュリティ
  access_level: z.enum(['public', 'authenticated', 'private', 'restricted']),
  allowed_roles: z.array(z.string()).default([]),
  allowed_users: z.array(z.string()).default([]),
  
  // アップロード情報
  uploaded_by: z.string(),
  uploaded_by_name: z.string(),
  
  // メタデータ
  description: z.string().optional(),
  alt_text: z.string().optional(),
  tags: z.array(z.string()).default([]),
  
  // 画像メタデータ
  width: z.number().optional(),
  height: z.number().optional(),
  has_thumbnail: z.boolean().default(false),
  thumbnail_r2_key: z.string().optional(),
  
  // バージョン管理
  version: z.string().default('1'),
  is_current: z.boolean().default(true),
  parent_file_id: z.string().optional(),
  
  // スキャン・セキュリティ
  virus_scan_status: z.enum(['pending', 'clean', 'infected', 'error']).default('pending'),
  virus_scan_at: z.string().optional(),
  
  // 統計
  download_count: z.number().default(0),
  last_accessed_at: z.string().optional(),
  
  created_at: z.string(),
  updated_at: z.string(),
  expires_at: z.string().optional()
})

export type FileUpload = z.infer<typeof FileUploadSchema>

// ファイル共有リンク
export const ShareLinkSchema = z.object({
  id: z.string(),
  file_id: z.string(),
  share_token: z.string(),
  
  created_by: z.string(),
  created_by_name: z.string(),
  share_type: z.enum(['public', 'password', 'limited_time']),
  password_hash: z.string().optional(),
  
  max_downloads: z.number().default(0),
  current_downloads: z.number().default(0),
  expires_at: z.string().optional(),
  
  permissions: z.array(z.string()).default(['view']),
  
  created_at: z.string(),
  last_accessed_at: z.string().optional(),
  is_active: z.boolean().default(true)
})

export type ShareLink = z.infer<typeof ShareLinkSchema>

/**
 * ファイルストレージサービス
 */
export class FileStorageService {
  constructor(
    private db: D1Database,
    private r2: R2Bucket
  ) {}

  /**
   * ファイルアップロード
   */
  async uploadFile(
    file: File,
    metadata: {
      category?: string
      related_type?: string
      related_id?: string
      access_level: 'public' | 'authenticated' | 'private' | 'restricted'
      allowed_roles?: string[]
      allowed_users?: string[]
      description?: string
      alt_text?: string
      tags?: string[]
    },
    uploadedBy: { id: string; name: string }
  ): Promise<FileUpload> {
    // ファイル検証
    await this.validateFile(file)
    
    const fileId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    // ファイル拡張子取得
    const extension = this.getFileExtension(file.name)
    const fileType = this.getFileType(file.type)
    
    // R2キー生成（日付ベースの階層構造）
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    const r2Key = `uploads/${year}/${month}/${day}/${fileId}${extension}`
    
    // R2にファイルアップロード
    const arrayBuffer = await file.arrayBuffer()
    await this.r2.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000' // 1年
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: uploadedBy.id,
        category: metadata.category || '',
        fileId
      }
    })
    
    // 画像の場合はサムネイル生成
    let thumbnailKey: string | undefined
    let width: number | undefined
    let height: number | undefined
    
    if (fileType === 'image') {
      try {
        const imageInfo = await this.getImageInfo(arrayBuffer)
        width = imageInfo.width
        height = imageInfo.height
        
        // サムネイル生成（簡易版 - 実際は画像処理ライブラリを使用）
        if (width > 300 || height > 300) {
          thumbnailKey = `thumbnails/${year}/${month}/${day}/${fileId}_thumb${extension}`
          const thumbnailBuffer = await this.createThumbnail(arrayBuffer, file.type)
          
          await this.r2.put(thumbnailKey, thumbnailBuffer, {
            httpMetadata: {
              contentType: file.type,
              cacheControl: 'public, max-age=31536000'
            }
          })
        }
      } catch (error) {
        console.warn('Thumbnail generation failed:', error)
      }
    }
    
    // データベースに記録
    const fileUpload: FileUpload = {
      id: fileId,
      filename: `${fileId}${extension}`,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      r2_key: r2Key,
      r2_url: `https://r2.example.com/${r2Key}`, // 実際のR2 URLに置き換え
      file_type: fileType,
      category: metadata.category,
      related_type: metadata.related_type,
      related_id: metadata.related_id,
      access_level: metadata.access_level,
      allowed_roles: metadata.allowed_roles || [],
      allowed_users: metadata.allowed_users || [],
      uploaded_by: uploadedBy.id,
      uploaded_by_name: uploadedBy.name,
      description: metadata.description,
      alt_text: metadata.alt_text,
      tags: metadata.tags || [],
      width,
      height,
      has_thumbnail: !!thumbnailKey,
      thumbnail_r2_key: thumbnailKey,
      version: '1',
      is_current: true,
      virus_scan_status: 'pending',
      download_count: 0,
      created_at: now,
      updated_at: now
    }
    
    await this.db.prepare(`
      INSERT INTO file_uploads (
        id, filename, original_name, mime_type, size_bytes, r2_key, r2_url,
        file_type, category, related_type, related_id, access_level,
        allowed_roles, allowed_users, uploaded_by, uploaded_by_name,
        description, alt_text, tags, width, height, has_thumbnail,
        thumbnail_r2_key, version, is_current, virus_scan_status,
        download_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fileUpload.id, fileUpload.filename, fileUpload.original_name,
      fileUpload.mime_type, fileUpload.size_bytes.toString(), fileUpload.r2_key,
      fileUpload.r2_url, fileUpload.file_type, fileUpload.category,
      fileUpload.related_type, fileUpload.related_id, fileUpload.access_level,
      JSON.stringify(fileUpload.allowed_roles), JSON.stringify(fileUpload.allowed_users),
      fileUpload.uploaded_by, fileUpload.uploaded_by_name, fileUpload.description,
      fileUpload.alt_text, JSON.stringify(fileUpload.tags),
      fileUpload.width?.toString(), fileUpload.height?.toString(),
      fileUpload.has_thumbnail ? '1' : '0', fileUpload.thumbnail_r2_key,
      fileUpload.version, fileUpload.is_current ? '1' : '0',
      fileUpload.virus_scan_status, fileUpload.download_count.toString(),
      fileUpload.created_at, fileUpload.updated_at
    ).run()
    
    return fileUpload
  }

  /**
   * ファイル取得（権限チェック付き）
   */
  async getFile(fileId: string, user: { id: string; role: string }): Promise<FileUpload | null> {
    const result = await this.db.prepare(`
      SELECT * FROM file_uploads WHERE id = ? AND is_current = '1'
    `).bind(fileId).first()
    
    if (!result) return null
    
    const file = this.parseFileUpload(result as any)
    
    // 権限チェック
    if (!this.canAccessFile(file, user)) {
      return null
    }
    
    return file
  }

  /**
   * ファイルダウンロード
   */
  async downloadFile(fileId: string, user: { id: string; role: string }): Promise<{ file: FileUpload; data: ArrayBuffer } | null> {
    const file = await this.getFile(fileId, user)
    if (!file) return null
    
    // R2からファイル取得
    const r2Object = await this.r2.get(file.r2_key)
    if (!r2Object) {
      throw new Error('ファイルが見つかりません')
    }
    
    // ダウンロード回数更新 & ログ記録
    await Promise.all([
      this.incrementDownloadCount(fileId),
      this.logFileAccess(fileId, user.id, 'download', true)
    ])
    
    return {
      file,
      data: await r2Object.arrayBuffer()
    }
  }

  /**
   * 共有リンク作成
   */
  async createShareLink(
    fileId: string,
    shareConfig: {
      share_type: 'public' | 'password' | 'limited_time'
      password?: string
      max_downloads?: number
      expires_at?: string
      permissions?: string[]
    },
    createdBy: { id: string; name: string }
  ): Promise<ShareLink> {
    const shareToken = crypto.randomUUID().replace(/-/g, '')
    const shareId = crypto.randomUUID()
    
    const shareLink: ShareLink = {
      id: shareId,
      file_id: fileId,
      share_token: shareToken,
      created_by: createdBy.id,
      created_by_name: createdBy.name,
      share_type: shareConfig.share_type,
      password_hash: shareConfig.password ? await this.hashPassword(shareConfig.password) : undefined,
      max_downloads: shareConfig.max_downloads || 0,
      current_downloads: 0,
      expires_at: shareConfig.expires_at,
      permissions: shareConfig.permissions || ['view'],
      created_at: new Date().toISOString(),
      is_active: true
    }
    
    await this.db.prepare(`
      INSERT INTO file_share_links (
        id, file_id, share_token, created_by, created_by_name, share_type,
        password_hash, max_downloads, current_downloads, expires_at,
        permissions, created_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      shareLink.id, shareLink.file_id, shareLink.share_token,
      shareLink.created_by, shareLink.created_by_name, shareLink.share_type,
      shareLink.password_hash, shareLink.max_downloads.toString(),
      shareLink.current_downloads.toString(), shareLink.expires_at,
      JSON.stringify(shareLink.permissions), shareLink.created_at,
      shareLink.is_active ? '1' : '0'
    ).run()
    
    return shareLink
  }

  /**
   * ファイル削除
   */
  async deleteFile(fileId: string, user: { id: string; role: string }): Promise<void> {
    const file = await this.getFile(fileId, user)
    if (!file) {
      throw new Error('ファイルが見つかりません')
    }
    
    // 削除権限チェック
    if (!this.canDeleteFile(file, user)) {
      throw new Error('ファイルを削除する権限がありません')
    }
    
    // R2からファイル削除
    await this.r2.delete(file.r2_key)
    if (file.thumbnail_r2_key) {
      await this.r2.delete(file.thumbnail_r2_key)
    }
    
    // データベースから削除（論理削除）
    await this.db.prepare(`
      UPDATE file_uploads SET is_current = '0', updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), fileId).run()
    
    // アクセスログ記録
    await this.logFileAccess(fileId, user.id, 'delete', true)
  }

  // プライベートメソッド
  
  private async validateFile(file: File): Promise<void> {
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      throw new Error('ファイルサイズが上限を超えています')
    }
    
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('サポートされていないファイル形式です')
    }
  }
  
  private getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : ''
  }
  
  private getFileType(mimeType: string): 'image' | 'document' | 'video' | 'audio' | 'other' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document'
    return 'other'
  }
  
  private async getImageInfo(arrayBuffer: ArrayBuffer): Promise<{ width: number; height: number }> {
    // 簡易画像情報取得（実際はimage-sizeライブラリなどを使用）
    return { width: 1920, height: 1080 } // プレースホルダー
  }
  
  private async createThumbnail(arrayBuffer: ArrayBuffer, mimeType: string): Promise<ArrayBuffer> {
    // 簡易サムネイル作成（実際は画像処理ライブラリを使用）
    return arrayBuffer // プレースホルダー
  }
  
  private canAccessFile(file: FileUpload, user: { id: string; role: string }): boolean {
    // アクセスレベルチェック
    switch (file.access_level) {
      case 'public':
        return true
      case 'authenticated':
        return !!user.id
      case 'private':
        return file.uploaded_by === user.id
      case 'restricted':
        return file.allowed_roles.includes(user.role) || 
               file.allowed_users.includes(user.id) ||
               file.uploaded_by === user.id
      default:
        return false
    }
  }
  
  private canDeleteFile(file: FileUpload, user: { id: string; role: string }): boolean {
    return file.uploaded_by === user.id || 
           user.role === 'owner' || 
           user.role === 'secretariat'
  }
  
  private async incrementDownloadCount(fileId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE file_uploads SET 
        download_count = CAST(download_count AS INTEGER) + 1,
        last_accessed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), new Date().toISOString(), fileId).run()
  }
  
  private async logFileAccess(
    fileId: string,
    userId: string | null,
    accessType: 'view' | 'download' | 'share' | 'delete',
    granted: boolean,
    denialReason?: string
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO file_access_logs (
        id, file_id, user_id, access_type, access_granted, denial_reason, accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      fileId,
      userId,
      accessType,
      granted ? 'granted' : 'denied',
      denialReason,
      new Date().toISOString()
    ).run()
  }
  
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  private parseFileUpload(row: any): FileUpload {
    return {
      ...row,
      size_bytes: parseInt(row.size_bytes),
      allowed_roles: JSON.parse(row.allowed_roles || '[]'),
      allowed_users: JSON.parse(row.allowed_users || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      width: row.width ? parseInt(row.width) : undefined,
      height: row.height ? parseInt(row.height) : undefined,
      has_thumbnail: row.has_thumbnail === '1',
      is_current: row.is_current === '1',
      download_count: parseInt(row.download_count || '0')
    }
  }
}