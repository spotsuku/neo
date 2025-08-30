'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
  Shield,
  User,
  Database,
  Settings as SettingsIcon,
  Calendar,
  Clock
} from 'lucide-react';
import { AuditLogEntry, FilterOptions, PaginatedResponse } from '@/types/admin';

export function AdminAuditComponent() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // フィルター・検索状態
  const [filters, setFilters] = useState<FilterOptions & { 
    severity?: string;
    category?: string;
    actor?: string;
  }>({
    search: '',
    severity: '',
    category: '',
    actor: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  
  // ページネーション状態
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, pagination.page]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/admin/audit?${queryParams}`);
      if (!response.ok) throw new Error('監査ログの取得に失敗しました');

      const data: PaginatedResponse<AuditLogEntry> = await response.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('監査ログ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        export: 'true',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/admin/audit/export?${queryParams}`);
      if (!response.ok) throw new Error('エクスポートに失敗しました');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('エクスポートエラー:', error);
    }
  };

  const openDetailDialog = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      error: 'bg-red-50 text-red-700 border-red-100',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      info: 'bg-blue-50 text-blue-700 border-blue-100'
    };
    
    return (
      <Badge className={colors[severity as keyof typeof colors] || colors.info}>
        {severity === 'critical' ? '緊急' : 
         severity === 'error' ? 'エラー' : 
         severity === 'warning' ? '警告' : '情報'}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Shield className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      case 'system':
        return <SettingsIcon className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'auth': return '認証';
      case 'user': return 'ユーザー';
      case 'data': return 'データ';
      case 'system': return 'システム';
      case 'security': return 'セキュリティ';
      default: return category;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('ja-JP'),
      time: date.toLocaleTimeString('ja-JP')
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">監査ログ</h1>
          <p className="text-gray-600 mt-1">システム内の全ての操作ログを確認</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>
          <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="アクション、エンティティで検索..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
              <SelectTrigger>
                <SelectValue placeholder="重要度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全ての重要度</SelectItem>
                <SelectItem value="critical">緊急</SelectItem>
                <SelectItem value="error">エラー</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="info">情報</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全カテゴリ</SelectItem>
                <SelectItem value="auth">認証</SelectItem>
                <SelectItem value="user">ユーザー</SelectItem>
                <SelectItem value="data">データ</SelectItem>
                <SelectItem value="system">システム</SelectItem>
                <SelectItem value="security">セキュリティ</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              placeholder="開始日"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              placeholder="終了日"
            />
          </div>
        </CardContent>
      </Card>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ログ数</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">エラー</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.severity === 'error' || log.severity === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">セキュリティ</p>
                <p className="text-2xl font-bold text-orange-600">
                  {logs.filter(log => log.category === 'security' || log.category === 'auth').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今日</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(log => {
                    const logDate = new Date(log.timestamp).toDateString();
                    const today = new Date().toDateString();
                    return logDate === today;
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ログテーブル */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">日時</TableHead>
                <TableHead className="w-24">重要度</TableHead>
                <TableHead className="w-24">カテゴリ</TableHead>
                <TableHead>アクション</TableHead>
                <TableHead>エンティティ</TableHead>
                <TableHead>実行者</TableHead>
                <TableHead className="w-20">詳細</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                      読み込み中...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    ログが見つかりませんでした
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const { date, time } = formatTimestamp(log.timestamp);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{date}</div>
                          <div className="text-gray-500">{time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(log.severity)}
                          {getSeverityBadge(log.severity)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(log.category)}
                          <span className="text-sm">{getCategoryLabel(log.category)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{log.action}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{log.entity}</span>
                          {log.entityId && (
                            <span className="text-gray-500 ml-1">({log.entityId})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.actor ? (
                          <div className="text-sm">
                            <div className="font-medium">{log.actor.name}</div>
                            <div className="text-gray-500">{log.actor.email}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">システム</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailDialog(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {pagination.total}件中 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPrev}
            >
              前へ
            </Button>
            <span className="flex items-center px-3 text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNext}
            >
              次へ
            </Button>
          </div>
        </div>
      )}

      {/* 詳細ダイアログ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>監査ログ詳細</span>
            </DialogTitle>
            <DialogDescription>
              ログID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">日時</Label>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString('ja-JP')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">重要度</Label>
                  <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">カテゴリ</Label>
                  <p className="text-sm">{getCategoryLabel(selectedLog.category)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">アクション</Label>
                  <p className="text-sm font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">エンティティ</Label>
                  <p className="text-sm">{selectedLog.entity}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">エンティティID</Label>
                  <p className="text-sm">{selectedLog.entityId || '-'}</p>
                </div>
              </div>
              
              {selectedLog.actor && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">実行者</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">{selectedLog.actor.name}</p>
                    <p className="text-sm text-gray-600">{selectedLog.actor.email}</p>
                    <p className="text-sm text-gray-600">役割: {selectedLog.actor.role}</p>
                  </div>
                </div>
              )}
              
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">変更内容</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">IPアドレス</Label>
                  <p className="text-sm">{selectedLog.ipAddress || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">User Agent</Label>
                  <p className="text-sm break-all">{selectedLog.userAgent || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}