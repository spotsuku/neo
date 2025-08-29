// お知らせ一覧コンポーネント - CMS管理画面
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Pin, 
  Clock,
  Users,
  AlertCircle
} from 'lucide-react';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { AccessibleInput } from '@/components/ui/accessible-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRBAC } from '@/components/auth/rbac-components';
import { 
  announcementService, 
  Announcement, 
  ContentStatus,
  VisibilityScope,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getCategoryLabel,
  getCategoryIcon
} from '@/lib/cms/announcement-service';

interface AnnouncementListProps {
  canCreate?: boolean;
  canEdit?: boolean;
  showDrafts?: boolean;
}

export function AnnouncementList({ 
  canCreate = false, 
  canEdit = false, 
  showDrafts = false 
}: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const rbac = useRBAC();

  // お知らせ一覧を取得
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        limit: 20,
        offset: 0,
      };

      const data = await announcementService.getAll(filters);
      setAnnouncements(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setError('お知らせの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [searchQuery, statusFilter]);

  // お知らせ削除
  const handleDelete = async (id: string) => {
    if (!confirm('このお知らせを削除してもよろしいですか？')) {
      return;
    }

    try {
      await announcementService.delete(id);
      await fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      alert('お知らせの削除に失敗しました');
    }
  };

  // 公開/非公開切り替え
  const handlePublishToggle = async (announcement: Announcement) => {
    try {
      if (announcement.status === ContentStatus.PUBLISHED) {
        await announcementService.unpublish(announcement.id!);
      } else {
        await announcementService.publish(announcement.id!);
      }
      await fetchAnnouncements();
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
      alert('公開状態の切り替えに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <AccessibleButton 
            onClick={fetchAnnouncements} 
            className="mt-4"
            variant="outline"
          >
            再読み込み
          </AccessibleButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">お知らせ管理</h2>
        
        {canCreate && rbac.can('announcements', 'create') && (
          <Link href="/cms/announcements/create">
            <AccessibleButton className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              新規作成
            </AccessibleButton>
          </Link>
        )}
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AccessibleInput
              label="検索"
              placeholder="タイトルや内容で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              helperText="タイトルや内容の文字列で検索できます"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(ContentStatus).map((status) => (
                  <AccessibleButton
                    key={status}
                    variant={statusFilter.includes(status) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setStatusFilter(prev => 
                        prev.includes(status) 
                          ? prev.filter(s => s !== status)
                          : [...prev, status]
                      );
                    }}
                  >
                    {getStatusLabel(status)}
                  </AccessibleButton>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <AccessibleButton
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter([]);
                }}
              >
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                クリア
              </AccessibleButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* お知らせ一覧 */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>お知らせが見つかりません</p>
                {canCreate && rbac.can('announcements', 'create') && (
                  <Link href="/cms/announcements/create">
                    <AccessibleButton className="mt-4">
                      最初のお知らせを作成
                    </AccessibleButton>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              canEdit={canEdit}
              onDelete={handleDelete}
              onPublishToggle={handlePublishToggle}
              onView={setSelectedAnnouncement}
            />
          ))
        )}
      </div>

      {/* 詳細表示ダイアログ */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <AnnouncementDetail announcement={selectedAnnouncement} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// お知らせカードコンポーネント
interface AnnouncementCardProps {
  announcement: Announcement;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onPublishToggle: (announcement: Announcement) => void;
  onView: (announcement: Announcement) => void;
}

function AnnouncementCard({ 
  announcement, 
  canEdit, 
  onDelete, 
  onPublishToggle, 
  onView 
}: AnnouncementCardProps) {
  const rbac = useRBAC();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg" aria-hidden="true">
                {getCategoryIcon(announcement.category)}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground line-clamp-2">
                  {announcement.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {announcement.content}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(announcement.status)}`}>
                {getStatusLabel(announcement.status)}
              </span>
              
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                {getPriorityLabel(announcement.priority)}
              </span>

              <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                {getCategoryLabel(announcement.category)}
              </span>

              {announcement.is_pinned && (
                <span className="flex items-center text-xs text-yellow-600">
                  <Pin className="h-3 w-3 mr-1" aria-hidden="true" />
                  固定
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              作成: {new Date(announcement.created_at || '').toLocaleDateString()}
              {announcement.published_at && (
                <span className="ml-2">
                  公開: {new Date(announcement.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2">
            <AccessibleButton
              size="sm"
              variant="outline"
              onClick={() => onView(announcement)}
              aria-label={`${announcement.title}を詳細表示`}
            >
              <Eye className="h-4 w-4" />
            </AccessibleButton>

            {canEdit && rbac.can('announcements', 'update', { targetUserId: announcement.author_id }) && (
              <>
                <Link href={`/cms/announcements/${announcement.id}/edit`}>
                  <AccessibleButton
                    size="sm"
                    variant="outline"
                    aria-label={`${announcement.title}を編集`}
                  >
                    <Edit className="h-4 w-4" />
                  </AccessibleButton>
                </Link>

                <AccessibleButton
                  size="sm"
                  variant="outline"
                  onClick={() => onPublishToggle(announcement)}
                  aria-label={
                    announcement.status === ContentStatus.PUBLISHED 
                      ? `${announcement.title}を非公開にする` 
                      : `${announcement.title}を公開する`
                  }
                >
                  {announcement.status === ContentStatus.PUBLISHED ? '非公開' : '公開'}
                </AccessibleButton>

                <AccessibleButton
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(announcement.id!)}
                  aria-label={`${announcement.title}を削除`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </AccessibleButton>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// お知らせ詳細コンポーネント
function AnnouncementDetail({ announcement }: { announcement: Announcement }) {
  return (
    <div className="space-y-4">
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap text-sm">
          {announcement.content}
        </div>
      </div>

      <div className="border-t pt-4">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-muted-foreground">ステータス</dt>
            <dd className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(announcement.status)}`}>
              {getStatusLabel(announcement.status)}
            </dd>
          </div>
          
          <div>
            <dt className="font-medium text-muted-foreground">優先度</dt>
            <dd className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
              {getPriorityLabel(announcement.priority)}
            </dd>
          </div>

          <div>
            <dt className="font-medium text-muted-foreground">カテゴリ</dt>
            <dd>{getCategoryLabel(announcement.category)}</dd>
          </div>

          <div>
            <dt className="font-medium text-muted-foreground">可視性</dt>
            <dd>{announcement.visibility_scope}</dd>
          </div>

          {announcement.published_at && (
            <div>
              <dt className="font-medium text-muted-foreground">公開日時</dt>
              <dd>{new Date(announcement.published_at).toLocaleString()}</dd>
            </div>
          )}

          {announcement.expires_at && (
            <div>
              <dt className="font-medium text-muted-foreground">有効期限</dt>
              <dd>{new Date(announcement.expires_at).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </div>

      {announcement.attachments && announcement.attachments.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2">添付ファイル</h4>
          <ul className="space-y-1">
            {announcement.attachments.map((file: any) => (
              <li key={file.id} className="text-sm">
                <a 
                  href={`/api/files/${file.id}`} 
                  className="text-primary hover:underline"
                  download={file.filename}
                >
                  {file.filename} ({Math.round(file.size / 1024)}KB)
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}