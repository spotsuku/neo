/**
 * お知らせ一覧画面 - NEO Digital Platform
 * カード表示・フィルタリング・ページネーション対応
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Calendar, AlertCircle, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/auth-context'
import { useNoticePermissions } from '@/components/notices/notice-permission-wrapper'
import type { Notice, NoticeListResponse, NoticeFilters } from '@/types/notices'

// 優先度別の色設定
const priorityColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200'
}

const priorityLabels = {
  low: '低',
  normal: '通常',
  high: '高',
  urgent: '緊急'
}

// カテゴリ別の色設定
const categoryColors = {
  general: 'bg-slate-100 text-slate-700',
  event: 'bg-purple-100 text-purple-700',
  system: 'bg-yellow-100 text-yellow-700',
  academic: 'bg-green-100 text-green-700',
  important: 'bg-red-100 text-red-700'
}

const categoryLabels = {
  general: '一般',
  event: 'イベント',
  system: 'システム',
  academic: '学習',
  important: '重要'
}

// お知らせカードコンポーネント
function NoticeCard({ notice }: { notice: Notice }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = notice.expires_at && new Date(notice.expires_at) < new Date()

  return (
    <Link href={`/notices/${notice.id}`}>
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${isExpired ? 'opacity-60' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-lg leading-tight ${isExpired ? 'line-through' : ''}`}>
                {notice.title}
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {notice.summary || notice.content.substring(0, 100) + '...'}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              <Badge 
                variant="outline" 
                className={priorityColors[notice.priority]}
              >
                {priorityLabels[notice.priority]}
              </Badge>
              <Badge 
                variant="secondary" 
                className={categoryColors[notice.category]}
              >
                {categoryLabels[notice.category]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(notice.published_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{notice.read_count} 閲覧</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {notice.author_name}
              </span>
              {isExpired && (
                <Badge variant="secondary" className="text-xs">
                  期限切れ
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function NoticesPage() {
  const { user, isAuthenticated } = useAuth()
  const permissions = useNoticePermissions()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [filters, setFilters] = useState<NoticeFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // お知らせ一覧を取得
  const fetchNotices = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '10',
        ...(filters.category && { category: filters.category }),
        ...(filters.priority && { priority: filters.priority }),
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/notices?${params}`)
      const data: NoticeListResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'お知らせの取得に失敗しました')
      }

      setNotices(data.notices)
      setTotalCount(data.total)
      setTotalPages(data.total_pages)
    } catch (error) {
      console.error('お知らせ取得エラー:', error)
      setError(error instanceof Error ? error.message : 'お知らせの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込みと条件変更時に実行
  useEffect(() => {
    fetchNotices()
  }, [currentPage, filters, searchQuery])

  // 検索実行
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // フィルタ変更
  const handleFilterChange = (key: keyof NoticeFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
    setCurrentPage(1)
  }

  // 権限チェック（既存のコメントアウト）

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">お知らせ</h1>
              <p className="mt-2 text-gray-600">
                重要な情報やお知らせをご確認ください
              </p>
            </div>
            {permissions.canCreate && (
              <Link href="/notices/new">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  新規作成
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* 検索・フィルタ */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 検索 */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="タイトルや内容で検索..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* カテゴリフィルタ */}
              <div>
                <Select
                  value={filters.category || ''}
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全カテゴリ</SelectItem>
                    <SelectItem value="general">一般</SelectItem>
                    <SelectItem value="event">イベント</SelectItem>
                    <SelectItem value="system">システム</SelectItem>
                    <SelectItem value="academic">学習</SelectItem>
                    <SelectItem value="important">重要</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 優先度フィルタ */}
              <div>
                <Select
                  value={filters.priority || ''}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="優先度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全優先度</SelectItem>
                    <SelectItem value="urgent">緊急</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="normal">通常</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 統計情報 */}
        {!loading && (
          <div className="mb-6 text-sm text-gray-600">
            {totalCount > 0 ? (
              <span>{totalCount}件のお知らせが見つかりました</span>
            ) : (
              <span>お知らせが見つかりませんでした</span>
            )}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ローディング */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* お知らせ一覧 */}
        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6">
            {notices.length > 0 ? (
              notices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    お知らせがありません
                  </h3>
                  <p className="text-gray-600">
                    現在表示可能なお知らせがありません。
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ページネーション */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                  if (page > totalPages) return null
                  
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                次へ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}