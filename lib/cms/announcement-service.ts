// お知らせ管理サービス - CMS基盤を使用した実装
'use client';

import { z } from 'zod';
import { BaseCMSService, BaseCMSSchema, CMSFilters, NotificationQueue, ContentStatus, VisibilityScope } from './base-cms';

// お知らせ拡張スキーマ
export const AnnouncementSchema = BaseCMSSchema.extend({
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category: z.enum(['general', 'event', 'system', 'emergency']).default('general'),
  is_pinned: z.boolean().default(false),
  read_confirmation_required: z.boolean().default(false),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    size: z.number(),
    mime_type: z.string(),
  })).optional(),
  tags: z.array(z.string()).optional(),
});

export type Announcement = z.infer<typeof AnnouncementSchema>;

// お知らせ作成・編集フォームスキーマ
export const AnnouncementFormSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください').max(200),
  content: z.string().min(1, '内容を入力してください').max(10000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  category: z.enum(['general', 'event', 'system', 'emergency']),
  visibility_scope: z.nativeEnum(VisibilityScope),
  target_roles: z.array(z.string()).optional(),
  target_regions: z.array(z.string()).optional(),
  is_pinned: z.boolean(),
  read_confirmation_required: z.boolean(),
  published_at: z.string().optional(), // ISO string for form
  expires_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type AnnouncementFormData = z.infer<typeof AnnouncementFormSchema>;

// お知らせサービスクラス
export class AnnouncementService extends BaseCMSService<Announcement> {
  protected tableName = 'announcements';
  protected contentType = 'announcement';

  // お知らせ一覧取得（フィルター対応）
  async getAll(filters: CMSFilters = {}): Promise<Announcement[]> {
    const params = new URLSearchParams();
    
    if (filters.status?.length) {
      params.append('status', filters.status.join(','));
    }
    if (filters.visibility_scope?.length) {
      params.append('visibility', filters.visibility_scope.join(','));
    }
    if (filters.region_id?.length) {
      params.append('region', filters.region_id.join(','));
    }
    if (filters.author_id) {
      params.append('author', filters.author_id);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }

    const response = await fetch(`/api/cms/announcements?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }
    
    const data = await response.json();
    return data.announcements;
  }

  // 個別お知らせ取得
  async getById(id: string): Promise<Announcement | null> {
    const response = await fetch(`/api/cms/announcements/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch announcement');
    }
    
    const data = await response.json();
    return data.announcement;
  }

  // お知らせ作成
  async create(item: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<Announcement> {
    const response = await fetch('/api/cms/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create announcement');
    }

    const data = await response.json();
    return data.announcement;
  }

  // お知らせ更新
  async update(id: string, item: Partial<Announcement>): Promise<Announcement> {
    const response = await fetch(`/api/cms/announcements/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update announcement');
    }

    const data = await response.json();
    return data.announcement;
  }

  // お知らせ削除
  async delete(id: string): Promise<boolean> {
    const response = await fetch(`/api/cms/announcements/${id}`, {
      method: 'DELETE',
    });

    return response.ok;
  }

  // 既読状態管理
  async markAsRead(announcementId: string, userId: string): Promise<void> {
    await fetch(`/api/cms/announcements/${announcementId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async getReadStatus(announcementId: string, userId: string): Promise<boolean> {
    const response = await fetch(`/api/cms/announcements/${announcementId}/read-status?user_id=${userId}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.is_read;
  }

  // 統計情報取得
  async getStats(filters?: { region_id?: string; date_from?: Date; date_to?: Date }): Promise<{
    total: number;
    by_status: Record<ContentStatus, number>;
    by_priority: Record<string, number>;
    by_category: Record<string, number>;
  }> {
    const params = new URLSearchParams();
    if (filters?.region_id) params.append('region_id', filters.region_id);
    if (filters?.date_from) params.append('date_from', filters.date_from.toISOString());
    if (filters?.date_to) params.append('date_to', filters.date_to.toISOString());

    const response = await fetch(`/api/cms/announcements/stats?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    return await response.json();
  }

  // ファイル添付管理
  async uploadAttachment(announcementId: string, file: File): Promise<{
    id: string;
    filename: string;
    size: number;
    mime_type: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/cms/announcements/${announcementId}/attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return await response.json();
  }

  async deleteAttachment(announcementId: string, attachmentId: string): Promise<void> {
    const response = await fetch(`/api/cms/announcements/${announcementId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete attachment');
    }
  }

  // 配信キュー管理（ベースクラスの実装）
  protected async insertNotificationQueue(item: NotificationQueue): Promise<void> {
    await fetch('/api/cms/notification-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
  }
}

// シングルトンインスタンス
export const announcementService = new AnnouncementService();

// お知らせ用のユーティリティ関数
export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'low': return '低';
    case 'normal': return '通常';
    case 'high': return '高';
    case 'urgent': return '緊急';
    default: return '不明';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-700';
    case 'normal': return 'bg-blue-100 text-blue-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'urgent': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'general': return '一般';
    case 'event': return 'イベント';
    case 'system': return 'システム';
    case 'emergency': return '緊急';
    default: return '不明';
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'general': return '📢';
    case 'event': return '📅';
    case 'system': return '⚙️';
    case 'emergency': return '🚨';
    default: return '📝';
  }
}