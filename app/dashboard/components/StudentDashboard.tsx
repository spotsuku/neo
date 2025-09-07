'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Target
} from 'lucide-react';

interface StudentStats {
  studentId: string;
  academicYear: number;
  major: string;
  gpa: number;
  creditsEarned: number;
  totalCredits: number;
  attendanceRate: number;
  upcomingClasses: Array<{
    id: string;
    name: string;
    time: string;
    room: string;
    instructor: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    subject: string;
    dueDate: string;
    status: 'pending' | 'submitted' | 'graded';
    score?: number;
  }>;
  recentGrades: Array<{
    id: string;
    subject: string;
    assignment: string;
    score: number;
    maxScore: number;
    date: string;
  }>;
}

export default function StudentDashboard() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentStats();
  }, []);

  const fetchStudentStats = async () => {
    try {
      // モックデータ（実際の実装では API から取得）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        studentId: 'S2024001',
        academicYear: 3,
        major: 'コンピュータサイエンス',
        gpa: 3.7,
        creditsEarned: 98,
        totalCredits: 124,
        attendanceRate: 94,
        upcomingClasses: [
          {
            id: '1',
            name: 'データベース設計',
            time: '10:00-11:30',
            room: 'A301',
            instructor: '田中教授'
          },
          {
            id: '2',
            name: 'ソフトウェア工学',
            time: '13:00-14:30',
            room: 'B205',
            instructor: '佐藤教授'
          },
          {
            id: '3',
            name: 'AI基礎',
            time: '15:00-16:30',
            room: 'C102',
            instructor: '山田教授'
          }
        ],
        assignments: [
          {
            id: '1',
            title: 'データベース設計課題',
            subject: 'データベース設計',
            dueDate: '2024-01-20',
            status: 'pending'
          },
          {
            id: '2',
            title: 'プログラミング演習',
            subject: 'ソフトウェア工学',
            dueDate: '2024-01-22',
            status: 'submitted'
          },
          {
            id: '3',
            title: 'AI論文レビュー',
            subject: 'AI基礎',
            dueDate: '2024-01-25',
            status: 'graded',
            score: 92
          }
        ],
        recentGrades: [
          {
            id: '1',
            subject: 'データベース設計',
            assignment: '中間テスト',
            score: 88,
            maxScore: 100,
            date: '2024-01-15'
          },
          {
            id: '2',
            subject: 'ソフトウェア工学',
            assignment: 'プロジェクト発表',
            score: 95,
            maxScore: 100,
            date: '2024-01-12'
          },
          {
            id: '3',
            subject: 'AI基礎',
            assignment: '期末レポート',
            score: 90,
            maxScore: 100,
            date: '2024-01-10'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch student stats:', error);
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
        <p className="text-gray-500">学生情報の取得に失敗しました。</p>
      </div>
    );
  }

  const getAssignmentStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'submitted': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'graded': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'submitted': return 'default';
      case 'graded': return 'secondary';
      default: return 'outline';
    }
  };

  const creditProgress = (stats.creditsEarned / stats.totalCredits) * 100;

  return (
    <div className="space-y-6">
      {/* 学生情報ヘッダー */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-900">学生ダッシュボード</CardTitle>
                <p className="text-blue-700">学籍番号: {stats.studentId} | {stats.academicYear}年生 | {stats.major}</p>
              </div>
            </div>
            <Badge variant="default" className="bg-blue-600">
              GPA: {stats.gpa}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 学習統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPA</CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gpa}</div>
            <p className="text-xs text-blue-600">優秀</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">取得単位</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.creditsEarned}</div>
            <div className="mt-2">
              <Progress value={creditProgress} className="h-2" />
              <p className="text-xs text-gray-600 mt-1">
                {stats.totalCredits}単位中 ({Math.round(creditProgress)}%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">出席率</CardTitle>
            <Users className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <p className="text-xs text-green-600">良好</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日の授業</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingClasses.length}</div>
            <p className="text-xs text-gray-600">コマ</p>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム - 授業と課題 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 今日の授業 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                今日の授業スケジュール
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.upcomingClasses.map((classItem) => (
                  <div key={classItem.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-blue-600">
                        {classItem.time}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{classItem.name}</p>
                        <p className="text-sm text-gray-600">{classItem.instructor} • {classItem.room}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      詳細
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 課題一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-500" />
                課題・提出物
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getAssignmentStatusIcon(assignment.status)}
                      <div>
                        <p className="font-medium text-gray-900">{assignment.title}</p>
                        <p className="text-sm text-gray-600">{assignment.subject}</p>
                        <p className="text-xs text-gray-500">締切: {assignment.dueDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {assignment.score && (
                        <Badge variant="default">{assignment.score}点</Badge>
                      )}
                      <Badge variant={getAssignmentStatusBadge(assignment.status) as any}>
                        {assignment.status === 'pending' ? '未提出' : 
                         assignment.status === 'submitted' ? '提出済' : '採点済'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右カラム - 成績と統計 */}
        <div className="space-y-6">
          {/* 最近の成績 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                最近の成績
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentGrades.map((grade) => (
                  <div key={grade.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{grade.subject}</p>
                      <Badge variant="default">
                        {grade.score}/{grade.maxScore}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{grade.assignment}</p>
                    <p className="text-xs text-gray-500">{grade.date}</p>
                    <div className="mt-2">
                      <Progress value={(grade.score / grade.maxScore) * 100} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 学習進捗 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-500" />
                学習進捗
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">単位取得進捗</span>
                    <span className="text-sm font-medium">{Math.round(creditProgress)}%</span>
                  </div>
                  <Progress value={creditProgress} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">出席率</span>
                    <span className="text-sm font-medium">{stats.attendanceRate}%</span>
                  </div>
                  <Progress value={stats.attendanceRate} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">課題提出率</span>
                    <span className="text-sm font-medium">87%</span>
                  </div>
                  <Progress value={87} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  時間割確認
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  課題提出
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Award className="h-4 w-4 mr-2" />
                  成績確認
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <Users className="h-4 w-4 mr-2" />
                  クラス掲示板
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}