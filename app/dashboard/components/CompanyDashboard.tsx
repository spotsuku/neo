'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Briefcase,
  Target,
  BarChart3,
  FileText,
  Calendar,
  Star
} from 'lucide-react';

interface CompanyStats {
  companyName: string;
  employees: number;
  activeProjects: number;
  monthlyRevenue: number;
  completionRate: number;
  departments: Array<{
    id: string;
    name: string;
    employees: number;
    performance: number;
  }>;
  projects: Array<{
    id: string;
    name: string;
    progress: number;
    deadline: string;
    status: 'active' | 'completed' | 'delayed';
  }>;
  recentActivities: Array<{
    id: string;
    activity: string;
    user: string;
    timestamp: string;
  }>;
}

export default function CompanyDashboard() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyStats();
  }, []);

  const fetchCompanyStats = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        companyName: 'NEO Corporation',
        employees: 156,
        activeProjects: 12,
        monthlyRevenue: 2500000,
        completionRate: 87,
        departments: [
          { id: '1', name: '開発部', employees: 45, performance: 92 },
          { id: '2', name: '営業部', employees: 32, performance: 88 },
          { id: '3', name: 'マーケティング部', employees: 28, performance: 85 },
          { id: '4', name: '人事部', employees: 15, performance: 90 }
        ],
        projects: [
          { id: '1', name: 'Webプラットフォーム開発', progress: 75, deadline: '2024-02-15', status: 'active' },
          { id: '2', name: 'モバイルアプリ開発', progress: 45, deadline: '2024-03-01', status: 'active' },
          { id: '3', name: 'データ分析システム', progress: 90, deadline: '2024-01-30', status: 'delayed' },
          { id: '4', name: 'セキュリティ強化', progress: 100, deadline: '2024-01-15', status: 'completed' }
        ],
        recentActivities: [
          { id: '1', activity: 'プロジェクト進捗更新', user: '開発チーム', timestamp: '10分前' },
          { id: '2', activity: '新規契約締結', user: '営業部', timestamp: '30分前' },
          { id: '3', activity: '週次レポート提出', user: 'マーケティング部', timestamp: '1時間前' },
          { id: '4', activity: '従業員評価完了', user: '人事部', timestamp: '2時間前' }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch company stats:', error);
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
        <p className="text-gray-500">企業情報の取得に失敗しました。</p>
      </div>
    );
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'active': return 'secondary';
      case 'delayed': return 'destructive';
      default: return 'outline';
    }
  };

  const getProjectStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'active': return '進行中';
      case 'delayed': return '遅延';
      default: return '未定';
    }
  };

  return (
    <div className="space-y-6">
      {/* 企業情報ヘッダー */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-purple-900">企業ダッシュボード</CardTitle>
                <p className="text-purple-700">{stats.companyName} • 総従業員数: {stats.employees.toLocaleString()}名</p>
              </div>
            </div>
            <Badge variant="default" className="bg-purple-600">
              完了率: {stats.completionRate}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 企業統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">従業員数</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees.toLocaleString()}</div>
            <p className="text-xs text-blue-600">全部署</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">月次売上</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(stats.monthlyRevenue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-green-600">前月比 +12%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中プロジェクト</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-gray-600">件</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了率</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-green-600">目標達成</p>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* プロジェクトと部署 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 部署別パフォーマンス */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                部署別パフォーマンス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.departments.map((dept) => (
                  <div key={dept.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{dept.name}</h4>
                        <Badge variant="outline">{dept.employees}名</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{dept.performance}%</span>
                      </div>
                    </div>
                    <Progress value={dept.performance} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* プロジェクト進捗 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-purple-500" />
                プロジェクト進捗
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.projects.map((project) => (
                  <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getProjectStatusColor(project.status) as any}>
                          {getProjectStatusText(project.status)}
                        </Badge>
                        <span className="text-sm text-gray-600">{project.progress}%</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>締切: {project.deadline}</span>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 最近のアクティビティ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-500" />
                最近のアクティビティ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 text-sm">{activity.activity}</p>
                    <p className="text-xs text-gray-600">{activity.user}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 今月の目標 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-orange-500" />
                今月の目標
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">売上目標</span>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                  <Progress value={85} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">プロジェクト完了</span>
                    <span className="text-sm font-medium">75%</span>
                  </div>
                  <Progress value={75} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">顧客満足度</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <Progress value={92} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-500" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  売上レポート
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Users className="h-4 w-4 mr-2" />
                  従業員管理
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  会議予定
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  レポート作成
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}