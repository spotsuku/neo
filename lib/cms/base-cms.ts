// CMS基盤システム - CRUD・公開設定・配信キュー機能
'use client';

import { z } from 'zod';

// 共通ステータス定義
export enum ContentStatus {
  DRAFT = 'draft',           // 下書き
  SCHEDULED = 'scheduled',   // 予約投稿
  PUBLISHED = 'published',   // 公開中  
  ARCHIVED = 'archived',     // アーカイブ
}

// ロール可視性設定
export enum VisibilityScope {
  ALL = 'all',               // 全員
  OWNER = 'owner',           // オーナーのみ
  SECRETARIAT = 'secretariat', // 事務局のみ
  COMPANY_ADMIN = 'company_admin', // 企業管理者のみ
  STUDENT = 'student',       // 学生のみ
  CUSTOM = 'custom',         // カスタム設定
}

// 配信キュー設定
export interface NotificationQueue {
  id: string;
  content_type: 'announcement' | 'class' | 'project' | 'committee';
  content_id: string;
  target_roles: string[];
  target_regions: string[];
  scheduled_at: Date;
  sent_at?: Date;
  status: 'pending' | 'sent' | 'failed';
  created_at: Date;
}

// 基本CMS項目スキーマ
export const BaseCMSSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  content: z.string().min(1, '内容は必須です').max(10000, '内容は10000文字以内で入力してください'),
  status: z.nativeEnum(ContentStatus),
  visibility_scope: z.nativeEnum(VisibilityScope),
  target_roles: z.array(z.string()).optional(),
  target_regions: z.array(z.string()).optional(),
  published_at: z.date().optional(),
  scheduled_at: z.date().optional(),
  expires_at: z.date().optional(),
  author_id: z.string(),
  region_id: z.string(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type BaseCMSItem = z.infer<typeof BaseCMSSchema>;

// ファイル添付スキーマ
export const FileAttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  size: z.number(),
  r2_key: z.string(),
  created_at: z.date(),
});

export type FileAttachment = z.infer<typeof FileAttachmentSchema>;

// CMS操作インターフェース
export interface CMSService<T extends BaseCMSItem> {
  // 基本CRUD
  getAll(filters?: CMSFilters): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(item: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;

  // 公開管理
  publish(id: string, publishedAt?: Date): Promise<T>;
  unpublish(id: string): Promise<T>;
  schedule(id: string, scheduledAt: Date): Promise<T>;
  archive(id: string): Promise<T>;

  // 配信管理
  queueNotification(id: string, options: NotificationOptions): Promise<void>;
  
  // 権限チェック
  canAccess(item: T, userRole: string, userId: string, regionId: string): boolean;
  canEdit(item: T, userRole: string, userId: string): boolean;
}

// フィルター設定
export interface CMSFilters {
  status?: ContentStatus[];
  visibility_scope?: VisibilityScope[];
  region_id?: string[];
  author_id?: string;
  published_after?: Date;
  published_before?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

// 通知オプション
export interface NotificationOptions {
  target_roles?: string[];
  target_regions?: string[];
  scheduled_at?: Date;
  send_email?: boolean;
  send_push?: boolean;
}

// 共通CMS基底クラス
export abstract class BaseCMSService<T extends BaseCMSItem> implements CMSService<T> {
  protected abstract tableName: string;
  protected abstract contentType: string;

  // 権限チェック
  canAccess(item: T, userRole: string, userId: string, regionId: string): boolean {
    // 下書きは作者のみ
    if (item.status === ContentStatus.DRAFT) {
      return item.author_id === userId;
    }

    // アーカイブは管理者のみ
    if (item.status === ContentStatus.ARCHIVED) {
      return ['owner', 'secretariat'].includes(userRole);
    }

    // 地域制限チェック
    if (item.region_id !== 'ALL' && item.region_id !== regionId) {
      return false;
    }

    // ロール可視性チェック
    switch (item.visibility_scope) {
      case VisibilityScope.ALL:
        return true;
      case VisibilityScope.OWNER:
        return userRole === 'owner';
      case VisibilityScope.SECRETARIAT:
        return ['owner', 'secretariat'].includes(userRole);
      case VisibilityScope.COMPANY_ADMIN:
        return ['owner', 'secretariat', 'company_admin'].includes(userRole);
      case VisibilityScope.STUDENT:
        return userRole === 'student';
      case VisibilityScope.CUSTOM:
        return item.target_roles?.includes(userRole) ?? false;
      default:
        return false;
    }
  }

  canEdit(item: T, userRole: string, userId: string): boolean {
    // 作者は常に編集可能
    if (item.author_id === userId) {
      return true;
    }

    // 管理者権限
    return ['owner', 'secretariat'].includes(userRole);
  }

  // 公開状態管理
  async publish(id: string, publishedAt?: Date): Promise<T> {
    const item = await this.getById(id);
    if (!item) throw new Error('Item not found');

    const updatedItem = await this.update(id, {
      status: ContentStatus.PUBLISHED,
      published_at: publishedAt || new Date(),
    } as Partial<T>);

    // 配信キューに追加
    await this.queueNotification(id, {
      target_roles: item.target_roles,
      target_regions: item.target_regions,
    });

    return updatedItem;
  }

  async unpublish(id: string): Promise<T> {
    return await this.update(id, {
      status: ContentStatus.DRAFT,
      published_at: undefined,
    } as Partial<T>);
  }

  async schedule(id: string, scheduledAt: Date): Promise<T> {
    return await this.update(id, {
      status: ContentStatus.SCHEDULED,
      scheduled_at: scheduledAt,
    } as Partial<T>);
  }

  async archive(id: string): Promise<T> {
    return await this.update(id, {
      status: ContentStatus.ARCHIVED,
    } as Partial<T>);
  }

  // 配信キュー管理
  async queueNotification(id: string, options: NotificationOptions): Promise<void> {
    const queueItem: NotificationQueue = {
      id: crypto.randomUUID(),
      content_type: this.contentType as any,
      content_id: id,
      target_roles: options.target_roles || ['all'],
      target_regions: options.target_regions || ['ALL'],
      scheduled_at: options.scheduled_at || new Date(),
      status: 'pending',
      created_at: new Date(),
    };

    // キューテーブルに挿入（実装は各サブクラスで）
    await this.insertNotificationQueue(queueItem);
  }

  protected abstract insertNotificationQueue(item: NotificationQueue): Promise<void>;
  
  // 抽象メソッド（各CMSサービスで実装）
  abstract getAll(filters?: CMSFilters): Promise<T[]>;
  abstract getById(id: string): Promise<T | null>;
  abstract create(item: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  abstract update(id: string, item: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}

// 公開状態表示用ヘルパー
export function getStatusLabel(status: ContentStatus): string {
  switch (status) {
    case ContentStatus.DRAFT: return '下書き';
    case ContentStatus.SCHEDULED: return '予約投稿';
    case ContentStatus.PUBLISHED: return '公開中';
    case ContentStatus.ARCHIVED: return 'アーカイブ';
    default: return '不明';
  }
}

export function getStatusColor(status: ContentStatus): string {
  switch (status) {
    case ContentStatus.DRAFT: return 'bg-gray-100 text-gray-700';
    case ContentStatus.SCHEDULED: return 'bg-blue-100 text-blue-700';
    case ContentStatus.PUBLISHED: return 'bg-green-100 text-green-700';
    case ContentStatus.ARCHIVED: return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getVisibilityLabel(scope: VisibilityScope): string {
  switch (scope) {
    case VisibilityScope.ALL: return '全員';
    case VisibilityScope.OWNER: return 'オーナーのみ';
    case VisibilityScope.SECRETARIAT: return '事務局のみ';
    case VisibilityScope.COMPANY_ADMIN: return '企業管理者のみ';
    case VisibilityScope.STUDENT: return '学生のみ';
    case VisibilityScope.CUSTOM: return 'カスタム設定';
    default: return '不明';
  }
}