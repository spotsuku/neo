'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BookOpen, 
  UserPlus, 
  Search, 
  MoreHorizontal,
  Edit,
  Eye,
  Filter,
  GraduationCap,
  Award,
  TrendingUp,
  Users
} from 'lucide-react';

interface Student {
  id: number;
  studentId: string;
  name: string;
  email: string;
  academicYear: number;
  major: string;
  gpa: number;
  creditsEarned: number;
  attendanceRate: number;
  status: 'enrolled' | 'graduated' | 'suspended' | 'on_leave';
  enrolledAt: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // モックデータ（実際の実装では API から取得）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStudents([
        {
          id: 1,
          studentId: 'S2024001',
          name: '佐藤太郎',
          email: 'sato@example.com',
          academicYear: 3,
          major: 'コンピュータサイエンス',
          gpa: 3.7,
          creditsEarned: 98,
          attendanceRate: 94,
          status: 'enrolled',
          enrolledAt: '2022-04-01'
        },
        {
          id: 2,
          studentId: 'S2024002',
          name: '田中花子',
          email: 'tanaka@example.com',
          academicYear: 2,
          major: 'データサイエンス',
          gpa: 3.9,
          creditsEarned: 68,
          attendanceRate: 97,
          status: 'enrolled',
          enrolledAt: '2023-04-01'
        },
        {
          id: 3,
          studentId: 'S2024003',
          name: '鈴木次郎',
          email: 'suzuki@example.com',
          academicYear: 4,
          major: 'ソフトウェア工学',
          gpa: 3.5,
          creditsEarned: 118,
          attendanceRate: 89,
          status: 'enrolled',
          enrolledAt: '2021-04-01'
        },
        {
          id: 4,
          studentId: 'S2023001',
          name: '高橋美咲',
          email: 'takahashi@example.com',
          academicYear: 4,
          major: 'AI・機械学習',
          gpa: 4.0,
          creditsEarned: 124,
          attendanceRate: 98,
          status: 'graduated',
          enrolledAt: '2020-04-01'
        },
        {
          id: 5,
          studentId: 'S2024004',
          name: '山田健太',
          email: 'yamada@example.com',
          academicYear: 1,
          major: 'コンピュータサイエンス',
          gpa: 3.2,
          creditsEarned: 32,
          attendanceRate: 85,
          status: 'enrolled',
          enrolledAt: '2024-04-01'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, any> = {
      enrolled: 'default',
      graduated: 'secondary',
      suspended: 'destructive',
      on_leave: 'outline'
    };
    return variants[status] || 'outline';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      enrolled: '在籍中',
      graduated: '卒業',
      suspended: '停学',
      on_leave: '休学'
    };
    return labels[status] || status;
  };

  const getGPABadgeVariant = (gpa: number) => {
    if (gpa >= 3.7) return 'default';
    if (gpa >= 3.0) return 'secondary';
    return 'destructive';
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = yearFilter === 'all' || student.academicYear.toString() === yearFilter;
    
    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PermissionGuard permissions={['students.manage', 'students.view']} fallbackPermissions={['students.view']}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <BookOpen className="h-8 w-8 mr-3 text-blue-600" />
                  学生管理
                </h1>
                <p className="mt-2 text-gray-600">学生の登録・成績・出席状況を管理します。</p>
              </div>
              <Button className="flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                新規学生登録
              </Button>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総学生数</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-xs text-gray-600">全学生</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">在籍学生</CardTitle>
                <GraduationCap className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {students.filter(s => s.status === 'enrolled').length}
                </div>
                <p className="text-xs text-green-600">アクティブ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均GPA</CardTitle>
                <Award className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(students.reduce((sum, s) => sum + s.gpa, 0) / students.length).toFixed(1)}
                </div>
                <p className="text-xs text-yellow-600">全体平均</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均出席率</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length)}%
                </div>
                <p className="text-xs text-blue-600">全体平均</p>
              </CardContent>
            </Card>
          </div>

          {/* フィルター・検索 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                フィルター・検索
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="学生名、学籍番号、メールアドレスで検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      学年: {yearFilter === 'all' ? '全て' : `${yearFilter}年生`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>学年で絞り込み</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setYearFilter('all')}>
                      全て
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setYearFilter('1')}>
                      1年生
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setYearFilter('2')}>
                      2年生
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setYearFilter('3')}>
                      3年生
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setYearFilter('4')}>
                      4年生
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* 学生一覧テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>学生一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生情報</TableHead>
                    <TableHead>学年・専攻</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>取得単位</TableHead>
                    <TableHead>出席率</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-600">{student.studentId}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.academicYear}年生</div>
                          <div className="text-sm text-gray-600">{student.major}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getGPABadgeVariant(student.gpa)}>
                          {student.gpa.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{student.creditsEarned}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{student.attendanceRate}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(student.status)}>
                          {getStatusLabel(student.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              詳細表示
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              編集
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Award className="h-4 w-4 mr-2" />
                              成績管理
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    </MainLayout>
  );
}