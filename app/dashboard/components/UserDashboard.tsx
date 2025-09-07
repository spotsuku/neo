'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Bell, Settings, FileText, Calendar, Activity } from 'lucide-react';

export default function UserDashboard() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-gray-900">
            <User className="h-6 w-6 mr-3" />
            個人ダッシュボード
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">未読通知</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-blue-600">件</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">完了タスク</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-green-600">今週</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">予定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-gray-600">今日</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">アクティビティ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-purple-600">今日</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-500" />
              最新通知
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium">システムメンテナンス予告</h4>
                <p className="text-sm text-gray-600">1月25日 02:00-04:00にメンテナンスを実施</p>
                <p className="text-xs text-gray-500">2時間前</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium">プロフィール更新のお願い</h4>
                <p className="text-sm text-gray-600">最新情報を反映してください</p>
                <p className="text-xs text-gray-500">1日前</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-green-500" />
              クイック設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm">
                <User className="h-4 w-4 mr-2" />
                プロフィール編集
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Settings className="h-4 w-4 mr-2" />
                設定変更
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <FileText className="h-4 w-4 mr-2" />
                ドキュメント
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Activity className="h-4 w-4 mr-2" />
                活動履歴
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}