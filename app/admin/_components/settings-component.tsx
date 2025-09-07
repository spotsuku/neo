'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Shield, 
  Mail, 
  Database, 
  Cloud, 
  Bell,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Key,
  Globe,
  Server,
  Lock
} from 'lucide-react';
import { SystemSetting } from '@/types/admin';

interface SettingGroup {
  category: string;
  title: string;
  description: string;
  icon: React.ElementType;
  settings: SystemSetting[];
}

export function AdminSettingsComponent() {
  const [settingGroups, setSettingGroups] = useState<SettingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('設定情報の取得に失敗しました');

      const data = await response.json();
      
      // 設定をカテゴリ別にグループ化
      const groups: SettingGroup[] = [
        {
          category: 'general',
          title: '一般設定',
          description: 'アプリケーションの基本設定',
          icon: Settings,
          settings: data.filter((s: SystemSetting) => s.category === 'general')
        },
        {
          category: 'security',
          title: 'セキュリティ',
          description: '認証とアクセス制御の設定',
          icon: Shield,
          settings: data.filter((s: SystemSetting) => s.category === 'security')
        },
        {
          category: 'email',
          title: 'メール設定',
          description: 'メール送信とテンプレートの設定',
          icon: Mail,
          settings: data.filter((s: SystemSetting) => s.category === 'email')
        },
        {
          category: 'api',
          title: 'API設定',
          description: '外部API連携の設定',
          icon: Key,
          settings: data.filter((s: SystemSetting) => s.category === 'api')
        },
        {
          category: 'storage',
          title: 'ストレージ',
          description: 'ファイルストレージとバックアップの設定',
          icon: Database,
          settings: data.filter((s: SystemSetting) => s.category === 'storage')
        }
      ];

      setSettingGroups(groups);
    } catch (error) {
      console.error('設定取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (settingId: string, value: any) => {
    setChanges(prev => ({ ...prev, [settingId]: value }));
    setUnsavedChanges(true);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });

      if (!response.ok) throw new Error('設定の保存に失敗しました');

      setChanges({});
      setUnsavedChanges(false);
      await fetchSettings();
    } catch (error) {
      console.error('設定保存エラー:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setChanges({});
    setUnsavedChanges(false);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = changes[setting.id] !== undefined ? changes[setting.id] : setting.value;

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.id}
              checked={currentValue === 'true' || currentValue === true}
              onCheckedChange={(checked) => handleSettingChange(setting.id, checked)}
              disabled={!setting.isEditable}
            />
            <Label htmlFor={setting.id}>有効</Label>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            disabled={!setting.isEditable}
          />
        );

      case 'json':
        return (
          <Textarea
            value={typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2)}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            disabled={!setting.isEditable}
            rows={4}
            className="font-mono text-sm"
          />
        );

      case 'string':
      default:
        // パスワード系の設定は非表示
        const isPassword = setting.key.toLowerCase().includes('password') || 
                          setting.key.toLowerCase().includes('secret') ||
                          setting.key.toLowerCase().includes('key');
        
        return (
          <Input
            type={isPassword ? 'password' : 'text'}
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            disabled={!setting.isEditable}
            placeholder={isPassword ? '••••••••' : ''}
          />
        );
    }
  };

  const getSettingStatus = (setting: SystemSetting) => {
    if (!setting.isEditable) {
      return <Badge variant="secondary">読み取り専用</Badge>;
    }
    if (changes[setting.id] !== undefined) {
      return <Badge variant="outline">変更あり</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">システム設定</h1>
          <p className="text-gray-600 mt-1">アプリケーションの設定を管理</p>
        </div>
        <div className="flex items-center space-x-2">
          {unsavedChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              未保存の変更があります
            </Badge>
          )}
          <Button variant="outline" onClick={resetChanges} disabled={!unsavedChanges}>
            リセット
          </Button>
          <Button onClick={saveSettings} disabled={!unsavedChanges || saving}>
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存
          </Button>
        </div>
      </div>

      {/* 設定タブ */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">一般</TabsTrigger>
          <TabsTrigger value="security">セキュリティ</TabsTrigger>
          <TabsTrigger value="email">メール</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="storage">ストレージ</TabsTrigger>
        </TabsList>

        {settingGroups.map((group) => (
          <TabsContent key={group.category} value={group.category}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <group.icon className="w-5 h-5 mr-2" />
                  {group.title}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {group.settings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    このカテゴリに設定項目はありません
                  </div>
                ) : (
                  group.settings.map((setting) => (
                    <div key={setting.id} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">{setting.key}</Label>
                          {setting.description && (
                            <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getSettingStatus(setting)}
                        </div>
                      </div>
                      <div className="mt-2">
                        {renderSettingInput(setting)}
                      </div>
                      <div className="text-xs text-gray-500">
                        最終更新: {new Date(setting.updatedAt).toLocaleString('ja-JP')}
                        {setting.updatedBy && ` by ${setting.updatedBy}`}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* システム情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="w-5 h-5 mr-2" />
            システム情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">アプリケーション</div>
              <div className="text-lg font-semibold">NEO Portal</div>
              <div className="text-sm text-gray-500">v1.0.0</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">データベース</div>
              <div className="text-lg font-semibold">Cloudflare D1</div>
              <div className="text-sm text-gray-500">接続正常</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">ストレージ</div>
              <div className="text-lg font-semibold">Cloudflare R2</div>
              <div className="text-sm text-gray-500">接続正常</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">CDN</div>
              <div className="text-lg font-semibold">Cloudflare Pages</div>
              <div className="text-sm text-gray-500">配信中</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}