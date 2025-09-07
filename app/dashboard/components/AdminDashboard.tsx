'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Server,
  TrendingUp,
  UserPlus,
  Settings,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar,
  MessageSquare,
  Bell,
  BookOpen,
  HelpCircle
} from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  systemLoad: number;
  uptime: number;
  alerts: number;
  storage: number;
  recentActivities: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
    type: 'info' | 'warning' | 'success' | 'error';
  }>;
}

interface DashboardSection {
  id: string;
  title: string;
  icon: string;
  isExpanded: boolean;
  isEnabled: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<DashboardSection[]>([
    { id: 'communityHealth', title: 'コミュニティ健康度', icon: '📊', isExpanded: true, isEnabled: true },
    { id: 'heroStepKPI', title: 'ヒーローステップ KPI', icon: '🏆', isExpanded: true, isEnabled: true },
    { id: 'classEvents', title: '授業・イベント運営', icon: '📚', isExpanded: false, isEnabled: true },
    { id: 'consultingMatch', title: '相談マッチング管理', icon: '🤝', isExpanded: false, isEnabled: true },
    { id: 'systemStatus', title: 'システム・運営状況', icon: '⚡', isExpanded: true, isEnabled: true },
    { id: 'publicRelations', title: '広報・発信管理', icon: '📢', isExpanded: false, isEnabled: true },
    { id: 'memberManagement', title: '会員管理', icon: '👥', isExpanded: false, isEnabled: true },
    { id: 'settings', title: '設定・カスタマイズ', icon: '⚙️', isExpanded: false, isEnabled: true }
  ]);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isExpanded: !section.isExpanded }
        : section
    ));
  };

  const toggleSectionEnabled = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isEnabled: !section.isEnabled }
        : section
    ));
  };

  const fetchSystemStats = async () => {
    try {
      // モックデータ（実際の実装では API から取得）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalUsers: 1247,
        activeUsers: 892,
        adminUsers: 3,
        systemLoad: 12,
        uptime: 99.9,
        alerts: 2,
        storage: 45,
        recentActivities: [
          {
            id: '1',
            action: '新規ユーザー登録',
            user: 'tanaka@example.com',
            timestamp: '5分前',
            type: 'info'
          },
          {
            id: '2',
            action: 'システム設定変更',
            user: 'admin@neo-portal.local',
            timestamp: '15分前',
            type: 'warning'
          },
          {
            id: '3',
            action: 'データベースバックアップ完了',
            user: 'system',
            timestamp: '30分前',
            type: 'success'
          },
          {
            id: '4',
            action: '権限変更',
            user: 'manager@example.com',
            timestamp: '1時間前',
            type: 'info'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">システム統計の取得に失敗しました。</p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <Activity className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      case 'success': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="neo-admin-dashboard">
      <style jsx>{`
        .neo-admin-dashboard {
          --neo-bg: #f8fafc;
          --neo-card: #ffffff;
          --neo-text: #0f172a;
          --neo-text-secondary: #64748b;
          --neo-primary: #2563eb;
          --neo-secondary: #7c3aed;
          --neo-success: #059669;
          --neo-warning: #d97706;
          --neo-danger: #dc2626;
          --neo-border: #e2e8f0;
          --neo-header-height: 72px;
          background-color: var(--neo-bg);
          min-height: 100vh;
        }
        
        .neo-header {
          background: linear-gradient(135deg, var(--neo-primary) 0%, var(--neo-secondary) 100%);
          color: white;
          padding: 1rem 1.5rem;
          margin: -2rem -2rem 2rem -2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .neo-section {
          background: var(--neo-card);
          border-radius: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .neo-section:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .neo-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          cursor: pointer;
          border-bottom: 1px solid var(--neo-border);
          transition: background-color 0.2s ease;
        }
        
        .neo-section-header:hover {
          background-color: #f8fafc;
        }
        
        .neo-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: var(--neo-text);
        }
        
        .neo-section-icon {
          font-size: 1.25rem;
        }
        
        .neo-section-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .neo-toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background-color: #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .neo-toggle-switch.enabled {
          background-color: var(--neo-primary);
        }
        
        .neo-toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.2s ease;
        }
        
        .neo-toggle-switch.enabled .neo-toggle-knob {
          transform: translateX(20px);
        }
        
        .neo-toggle-icon {
          transition: transform 0.2s ease;
        }
        
        .neo-section.collapsed .neo-toggle-icon {
          transform: rotate(-90deg);
        }
        
        .neo-section-content {
          padding: 1.5rem;
          display: block;
        }
        
        .neo-section.collapsed .neo-section-content {
          display: none;
        }
        
        .neo-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .neo-kpi-card {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }
        
        .neo-kpi-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--neo-primary);
        }
        
        .neo-kpi-label {
          font-size: 0.875rem;
          color: var(--neo-text-secondary);
          margin-top: 0.25rem;
        }
        
        .neo-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }
        
        .neo-alert.warning {
          background-color: #fef3c7;
          border-left: 4px solid var(--neo-warning);
        }
        
        .neo-alert.error {
          background-color: #fee2e2;
          border-left: 4px solid var(--neo-danger);
        }
        
        .neo-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--neo-border);
        }
        
        .neo-list-item:last-child {
          border-bottom: none;
        }
      `}</style>
      
      {/* NEO Platform Header */}
      <div className="neo-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🚀</div>
            <div>
              <h1 className="text-2xl font-bold">NEO Digital Platform</h1>
              <p className="text-blue-100">事務局ダッシュボード</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30">
              管理者
            </Badge>
            <div className="text-right">
              <p className="font-medium">田中 太郎</p>
              <p className="text-xs text-blue-100">最終ログイン: 10分前</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Sections */}
      <div className="space-y-0">
        {sections.map((section) => (
          <div key={section.id} className={`neo-section ${section.isExpanded ? '' : 'collapsed'}`}>
            <div className="neo-section-header" onClick={() => toggleSection(section.id)}>
              <div className="neo-section-title">
                <span className="neo-section-icon">{section.icon}</span>
                {section.title}
              </div>
              <div className="neo-section-controls">
                <div 
                  className={`neo-toggle-switch ${section.isEnabled ? 'enabled' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleSectionEnabled(section.id); }}
                >
                  <div className="neo-toggle-knob"></div>
                </div>
                <div className="neo-toggle-icon">
                  {section.isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>
            
            {section.isEnabled && (
              <div className="neo-section-content">
                {renderSectionContent(section.id, stats)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderSectionContent(sectionId: string, stats: SystemStats | null) {
  if (!stats) return null;

  switch (sectionId) {
    case 'communityHealth':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">{stats.totalUsers.toLocaleString()}</div>
              <div className="neo-kpi-label">総ユーザー数</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">{stats.activeUsers.toLocaleString()}</div>
              <div className="neo-kpi-label">アクティブユーザー</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">87%</div>
              <div className="neo-kpi-label">関与度スコア</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">+12%</div>
              <div className="neo-kpi-label">前月比増加</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">コミュニティの健康度は良好です。アクティブユーザー数が前月から12%増加しています。</p>
        </div>
      );
    
    case 'heroStepKPI':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">156</div>
              <div className="neo-kpi-label">アクティブヒーロー</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">23</div>
              <div className="neo-kpi-label">承認待ち</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">4.8</div>
              <div className="neo-kpi-label">平均評価</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">92%</div>
              <div className="neo-kpi-label">完了率</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">新規ヒーロー候補</h4>
            <div className="space-y-2">
              <div className="neo-list-item">
                <span>佐藤花子 - ウェブ開発</span>
                <Badge variant="secondary">審査中</Badge>
              </div>
              <div className="neo-list-item">
                <span>鈴木一郎 - データ分析</span>
                <Badge variant="outline">書類確認中</Badge>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'classEvents':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">8</div>
              <div className="neo-kpi-label">今週の授業</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">85%</div>
              <div className="neo-kpi-label">平均出席率</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">4.6</div>
              <div className="neo-kpi-label">授業評価</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">3</div>
              <div className="neo-kpi-label">準備中</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">今週のスケジュール</h4>
            <div className="space-y-2">
              <div className="neo-list-item">
                <span>React基礎講座 - 12/20 19:00</span>
                <Badge variant="default">準備完了</Badge>
              </div>
              <div className="neo-list-item">
                <span>Python入門 - 12/21 20:00</span>
                <Badge variant="outline">準備中</Badge>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'consultingMatch':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">42</div>
              <div className="neo-kpi-label">新規相談</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">28</div>
              <div className="neo-kpi-label">対応中</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">156</div>
              <div className="neo-kpi-label">解決済み</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">4.9</div>
              <div className="neo-kpi-label">満足度</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">緊急対応が必要な相談</h4>
            <div className="space-y-2">
              <div className="neo-list-item">
                <span>キャリア相談 - 田中様</span>
                <Badge variant="destructive">緊急</Badge>
              </div>
              <div className="neo-list-item">
                <span>技術相談 - 佐藤様</span>
                <Badge variant="secondary">優先</Badge>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'systemStatus':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">{stats.systemLoad}%</div>
              <div className="neo-kpi-label">システム負荷</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">{stats.uptime}%</div>
              <div className="neo-kpi-label">稼働率</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">{stats.storage}%</div>
              <div className="neo-kpi-label">ストレージ</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">{stats.alerts}</div>
              <div className="neo-kpi-label">アラート数</div>
            </div>
          </div>
          {stats.alerts > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">アクティブアラート</h4>
              <div className="neo-alert warning">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">CPU使用率が高くなっています</p>
                  <p className="text-sm text-gray-600">15分前に検出</p>
                </div>
              </div>
              <div className="neo-alert error">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">データベース接続エラー</p>
                  <p className="text-sm text-gray-600">5分前に検出</p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    
    case 'publicRelations':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">12</div>
              <div className="neo-kpi-label">予定投稿</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">3,456</div>
              <div className="neo-kpi-label">今月のリーチ</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">8.2%</div>
              <div className="neo-kpi-label">エンゲージメント率</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">5</div>
              <div className="neo-kpi-label">進行中企画</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">今週の投稿予定</h4>
            <div className="space-y-2">
              <div className="neo-list-item">
                <span>年末イベント告知 - 12/20</span>
                <Badge variant="default">準備完了</Badge>
              </div>
              <div className="neo-list-item">
                <span>ヒーロー紹介記事 - 12/22</span>
                <Badge variant="outline">作成中</Badge>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'memberManagement':
      return (
        <div>
          <div className="neo-kpi-grid">
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">23</div>
              <div className="neo-kpi-label">新規登録</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">156</div>
              <div className="neo-kpi-label">審査待ち</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">2</div>
              <div className="neo-kpi-label">要注意ユーザー</div>
            </div>
            <div className="neo-kpi-card">
              <div className="neo-kpi-value">892</div>
              <div className="neo-kpi-label">アクティブ会員</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">最近の新規登録</h4>
            <div className="space-y-2">
              <div className="neo-list-item">
                <span>山田太郎 - 12/19登録</span>
                <Badge variant="secondary">審査中</Badge>
              </div>
              <div className="neo-list-item">
                <span>鈴木花子 - 12/18登録</span>
                <Badge variant="default">承認済み</Badge>
              </div>
            </div>
          </div>
        </div>
      );
    
    case 'settings':
      return (
        <div>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">表示設定</h4>
              <p className="text-sm text-gray-600 mb-4">各セクションの表示/非表示は右側のトグルスイッチで設定できます。</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">自動更新設定</h4>
              <div className="space-y-2">
                <div className="neo-list-item">
                  <span>リアルタイム更新</span>
                  <div className="neo-toggle-switch enabled">
                    <div className="neo-toggle-knob"></div>
                  </div>
                </div>
                <div className="neo-list-item">
                  <span>アラート通知</span>
                  <div className="neo-toggle-switch enabled">
                    <div className="neo-toggle-knob"></div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">データ管理</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  データエクスポート
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  システム設定
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    
    default:
      return <div>セクションコンテンツ</div>;
  }
}