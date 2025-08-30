/**
 * お知らせ管理システム - 型定義
 * NEO Digital Platform
 */

export interface Notice {
  id: string
  title: string
  content: string
  summary?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: 'general' | 'event' | 'system' | 'academic' | 'important'
  published_at: string
  created_at: string
  updated_at: string
  author_id: string
  author_name: string
  author_role: 'owner' | 'secretariat' | 'company_admin' | 'student'
  region_id: string
  is_published: boolean
  expires_at?: string
  attachments?: NoticeAttachment[]
  read_count: number
}

export interface NoticeAttachment {
  id: string
  notice_id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  thumbnail_url?: string
  uploaded_at: string
}

export interface CreateNoticeRequest {
  title: string
  content: string
  summary?: string
  priority: Notice['priority']
  category: Notice['category']
  expires_at?: string
  attachments?: File[]
}

export interface UpdateNoticeRequest extends Partial<CreateNoticeRequest> {
  id: string
  is_published?: boolean
}

export interface NoticeListResponse {
  notices: Notice[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface NoticeFilters {
  category?: Notice['category']
  priority?: Notice['priority']
  author_id?: string
  region_id?: string
  is_published?: boolean
  search?: string
  date_from?: string
  date_to?: string
}

// ページネーション
export interface PaginationParams {
  page?: number
  per_page?: number
}

// お知らせ作成・編集フォーム用の型
export interface NoticeFormData {
  title: string
  content: string
  summary: string
  priority: Notice['priority']
  category: Notice['category']
  expires_at: string
  attachments: File[]
}

// お知らせ一覧表示用の型
export interface NoticeCardProps {
  notice: Notice
  onEdit?: (notice: Notice) => void
  onDelete?: (noticeId: string) => void
  onClick?: (notice: Notice) => void
  showActions?: boolean
}

// 権限チェック用の型
export interface NoticePermissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canPublish: boolean
  canViewUnpublished: boolean
}