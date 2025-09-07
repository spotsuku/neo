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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Eye,
  Filter
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: 'core' | 'active' | 'peripheral' | 'at_risk' | 'inactive' | 'suspended'; // 拡張されたステータス
  heroStep: number; // ヒーローステップ追加
  membershipTypes?: string[];
  affiliation?: string;
  lastLogin: string;
  createdAt: string;
  notes?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditHeroStepOpen, setIsEditHeroStepOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editHeroStep, setEditHeroStep] = useState(1);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    status: 'active' as User['status'],
    heroStep: 1,
    membershipTypes: [] as string[],
    affiliation: '',
    notes: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // モックデータ（実際の実装では API から取得）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers([
        {
          id: 1,
          email: 'admin@neo-portal.local',
          name: 'システム管理者',
          firstName: 'システム',
          lastName: '管理者',
          role: 'admin',
          status: 'core',
          heroStep: 5,
          membershipTypes: ['admin'],
          affiliation: 'NEOポータル',
          lastLogin: '2024-01-18 14:30',
          createdAt: '2024-01-01',
          notes: 'システム管理者アカウント'
        },
        {
          id: 2,
          email: 'editor@neo-portal.local', 
          name: 'コンテンツ編集者',
          firstName: 'コンテンツ',
          lastName: '編集者',
          role: 'editor',
          status: 'active',
          heroStep: 3,
          membershipTypes: ['editor'],
          affiliation: 'NEOポータル',
          lastLogin: '2024-01-18 10:15',
          createdAt: '2024-01-05'
        },
        {
          id: 3,
          email: 'teacher@example.com',
          name: '田中教授',
          firstName: '田中',
          lastName: '教授',
          role: 'teacher',
          status: 'active',
          heroStep: 4,
          membershipTypes: ['teacher', 'mentor'],
          affiliation: '東京大学',
          lastLogin: '2024-01-17 16:45',
          createdAt: '2024-01-10'
        },
        {
          id: 4,
          email: 'student@example.com',
          name: '佐藤太郎',
          firstName: '佐藤',
          lastName: '太郎',
          role: 'student',
          status: 'peripheral',
          heroStep: 2,
          membershipTypes: ['student'],
          affiliation: '東京工業大学',
          lastLogin: '2024-01-18 09:20',
          createdAt: '2024-01-15'
        },
        {
          id: 5,
          email: 'company@example.com',
          name: '企業ユーザー',
          firstName: '企業',
          lastName: 'ユーザー',
          role: 'company_user',
          status: 'at_risk',
          heroStep: 1,
          membershipTypes: ['company'],
          affiliation: '株式会社ABC',
          lastLogin: '2024-01-10 13:00',
          createdAt: '2024-01-12',
          notes: '長期間ログインなし'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: '管理者',
      editor: '編集者',
      teacher: '教師',
      student: '学生',
      company_user: '企業ユーザー',
      committee_member: '委員会メンバー',
      user: '一般ユーザー'
    };
    return roleLabels[role] || role;
  };

  const getRoleVariant = (role: string) => {
    const variants: Record<string, any> = {
      admin: 'destructive',
      editor: 'default',
      teacher: 'secondary',
      student: 'outline',
      company_user: 'default',
      committee_member: 'secondary',
      user: 'outline'
    };
    return variants[role] || 'outline';
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, any> = {
      core: 'destructive', // 赤 - 最重要
      active: 'default', // 青 - アクティブ
      peripheral: 'secondary', // グレー - 周辺
      at_risk: 'outline', // 黄色/オレンジ - 注意
      inactive: 'secondary',
      suspended: 'destructive'
    };
    return variants[status] || 'outline';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      core: 'コア',
      active: 'アクティブ',
      peripheral: '周辺',
      at_risk: '離脱予備軍',
      inactive: '非アクティブ',
      suspended: '停止中'
    };
    return labels[status] || status;
  };

  const createUser = async () => {
    try {
      // バリデーション
      if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.role) {
        alert('必須項目を入力してください');
        return;
      }

      // メール重複チェック
      if (users.some(u => u.email === newUser.email)) {
        alert('このメールアドレスは既に登録されています');
        return;
      }

      const user: User = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        name: `${newUser.firstName} ${newUser.lastName}`,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        heroStep: newUser.heroStep,
        membershipTypes: newUser.membershipTypes,
        affiliation: newUser.affiliation,
        notes: newUser.notes,
        lastLogin: '',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setUsers(prev => [...prev, user]);
      setIsCreateDialogOpen(false);
      
      // フォームリセット
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        status: 'active',
        heroStep: 1,
        membershipTypes: [],
        affiliation: '',
        notes: ''
      });

      alert(`新しいユーザー「${user.name}」を作成しました`);
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      alert('ユーザーの作成に失敗しました');
    }
  };

  const openEditHeroStep = (userId: number, currentStep: number) => {
    setSelectedUserId(userId);
    setEditHeroStep(currentStep);
    setIsEditHeroStepOpen(true);
  };

  const updateHeroStep = () => {
    if (selectedUserId === null) return;

    setUsers(prev => prev.map(user => 
      user.id === selectedUserId 
        ? { ...user, heroStep: editHeroStep }
        : user
    ));

    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      alert(`${user.name}のヒーローステップをステップ${editHeroStep}に変更しました`);
    }

    setIsEditHeroStepOpen(false);
    setSelectedUserId(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
      <PermissionGuard permissions={['users.manage']}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Users className="h-8 w-8 mr-3 text-blue-600" />
                  ユーザー管理
                </h1>
                <p className="mt-2 text-gray-600">システムユーザーの作成・編集・削除を行います。</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    新規ユーザー作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>新規ユーザー作成</DialogTitle>
                    <DialogDescription>
                      新しいユーザーを作成します。必須項目を入力してください。
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 gap-6 py-4">
                    {/* 基本情報 */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-900">基本情報</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">姓 *</Label>
                          <Input
                            id="firstName"
                            value={newUser.firstName}
                            onChange={(e) => setNewUser(prev => ({...prev, firstName: e.target.value}))}
                            placeholder="田中"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">名 *</Label>
                          <Input
                            id="lastName"
                            value={newUser.lastName}
                            onChange={(e) => setNewUser(prev => ({...prev, lastName: e.target.value}))}
                            placeholder="太郎"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">メールアドレス *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({...prev, email: e.target.value}))}
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    {/* 詳細設定 */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-900">詳細設定</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">ロール *</Label>
                          <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({...prev, role: value}))}>
                            <SelectTrigger>
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">学生</SelectItem>
                              <SelectItem value="teacher">教師</SelectItem>
                              <SelectItem value="company_user">企業ユーザー</SelectItem>
                              <SelectItem value="admin">管理者</SelectItem>
                              <SelectItem value="editor">編集者</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">ステータス</Label>
                          <Select value={newUser.status} onValueChange={(value) => setNewUser(prev => ({...prev, status: value as User['status']}))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="core">コア</SelectItem>
                              <SelectItem value="active">アクティブ</SelectItem>
                              <SelectItem value="peripheral">周辺</SelectItem>
                              <SelectItem value="at_risk">離脱予備軍</SelectItem>
                              <SelectItem value="inactive">非アクティブ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="heroStep">ヒーローステップ</Label>
                        <Select value={newUser.heroStep.toString()} onValueChange={(value) => setNewUser(prev => ({...prev, heroStep: parseInt(value)}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">ステップ1: エントリー</SelectItem>
                            <SelectItem value="2">ステップ2: 基礎学習</SelectItem>
                            <SelectItem value="3">ステップ3: 実践参加</SelectItem>
                            <SelectItem value="4">ステップ4: プロジェクト実行</SelectItem>
                            <SelectItem value="5">ステップ5: リーダーシップ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="affiliation">所属</Label>
                        <Input
                          id="affiliation"
                          value={newUser.affiliation}
                          onChange={(e) => setNewUser(prev => ({...prev, affiliation: e.target.value}))}
                          placeholder="東京大学 / 株式会社ABC"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">備考</Label>
                        <Textarea
                          id="notes"
                          value={newUser.notes}
                          onChange={(e) => setNewUser(prev => ({...prev, notes: e.target.value}))}
                          placeholder="追加情報やメモ"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button onClick={createUser}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      ユーザー作成
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-gray-600">全ユーザー</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">コア会員</CardTitle>
                <Shield className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.status === 'core').length}
                </div>
                <p className="text-xs text-red-600">最重要メンバー</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">離脱予備軍</CardTitle>
                <Shield className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.status === 'at_risk').length}
                </div>
                <p className="text-xs text-orange-600">要注意メンバー</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日のログイン</CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.lastLogin.includes('2024-01-18')).length}
                </div>
                <p className="text-xs text-blue-600">本日アクセス</p>
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
                      placeholder="名前またはメールアドレスで検索..."
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
                      ステータス: {statusFilter === 'all' ? '全て' : getStatusLabel(statusFilter)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>ステータスで絞り込み</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                      全て
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('core')}>
                      コア
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                      アクティブ
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('peripheral')}>
                      周辺
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('at_risk')}>
                      離脱予備軍
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                      非アクティブ
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('suspended')}>
                      停止中
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* ユーザー一覧テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>ユーザー一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>役割</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>ヒーローステップ</TableHead>
                    <TableHead>最終ログイン</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(user.status)}>
                          {getStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => openEditHeroStep(user.id, user.heroStep)}
                          >
                            ステップ {user.heroStep}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{user.lastLogin}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{user.createdAt}</span>
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
                            <DropdownMenuItem onClick={() => openEditHeroStep(user.id, user.heroStep)}>
                              <Shield className="h-4 w-4 mr-2" />
                              ヒーローステップ変更
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="h-4 w-4 mr-2" />
                              権限変更
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              削除
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

          {/* ヒーローステップ編集ダイアログ */}
          <Dialog open={isEditHeroStepOpen} onOpenChange={setIsEditHeroStepOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>ヒーローステップ変更</DialogTitle>
                <DialogDescription>
                  {selectedUserId && users.find(u => u.id === selectedUserId)?.name}のヒーローステップを変更します。
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="space-y-2">
                  <Label htmlFor="heroStepSelect">ヒーローステップを選択</Label>
                  <Select value={editHeroStep.toString()} onValueChange={(value) => setEditHeroStep(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">ステップ1: エントリー</SelectItem>
                      <SelectItem value="2">ステップ2: 基礎学習</SelectItem>
                      <SelectItem value="3">ステップ3: 実践参加</SelectItem>
                      <SelectItem value="4">ステップ4: プロジェクト実行</SelectItem>
                      <SelectItem value="5">ステップ5: リーダーシップ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">ステップ説明</h4>
                  <div className="text-sm text-blue-700">
                    {editHeroStep === 1 && "新規参加者、基本的な参加レベル"}
                    {editHeroStep === 2 && "基礎知識習得中、学習フェーズ"}
                    {editHeroStep === 3 && "実際の活動に参加、実践フェーズ"}
                    {editHeroStep === 4 && "プロジェクトを主導、実行フェーズ"}
                    {editHeroStep === 5 && "リーダーシップ発揮、指導的役割"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditHeroStepOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={updateHeroStep}>
                  変更を保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </MainLayout>
  );
}