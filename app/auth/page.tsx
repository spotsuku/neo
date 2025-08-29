// NEO Digital Platform - 認証テストページ
// ログイン・RBAC動作確認デモ

'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  region_id: string;
  accessible_regions: string[];
}

interface LoginResponse {
  user: User;
  token: string;
  expires_at: string;
}

export default function AuthTestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // テストユーザー
  const testUsers = [
    { email: 'admin@neo-fukuoka.jp', role: 'オーナー', region: 'FUK (全地域アクセス可)' },
    { email: 'company1@example.com', role: '企業管理者', region: 'FUK' },
    { email: 'student1@example.com', role: '学生', region: 'FUK' }
  ];

  // ページ読み込み時の認証状態確認
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 認証状態確認
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('認証状態確認エラー:', error);
    }
  };

  // ログイン
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data: LoginResponse = await response.json();
        setUser(data.user);
        setPassword('');
        alert(`ログイン成功: ${data.user.name} (${data.user.role})`);
      } else {
        const error = await response.json();
        alert(`ログインエラー: ${error.message}`);
      }
    } catch (error) {
      alert('ログイン処理中にエラーが発生しました');
    }

    setLoading(false);
  };

  // ログアウト
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setTestResults(null);
      alert('ログアウトしました');
    } catch (error) {
      alert('ログアウト処理中にエラーが発生しました');
    }
  };

  // クイックログイン
  const quickLogin = (testEmail: string) => {
    setEmail(testEmail);
    setPassword(''); // 開発用：空パスワードでログイン可能
  };

  // 認証テスト実行
  const runAuthTest = async () => {
    try {
      const response = await fetch('/api/test-auth');
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      } else {
        const error = await response.json();
        alert(`テストエラー: ${error.message}`);
      }
    } catch (error) {
      alert('認証テスト中にエラーが発生しました');
    }
  };

  // 管理者テスト実行
  const runAdminTest = async () => {
    try {
      const response = await fetch('/api/test-auth', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        alert(`管理者テスト成功: ${data.message}`);
      } else {
        const error = await response.json();
        alert(`管理者テストエラー: ${error.message}`);
      }
    } catch (error) {
      alert('管理者テスト中にエラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          🛡️ NEO Digital Platform - 認証・RBAC テスト
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* ログインセクション */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">ログイン</h2>
            
            {!user ? (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      パスワード
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="開発環境：空白でもOK"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'ログイン中...' : 'ログイン'}
                  </button>
                </form>

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">テストユーザー（クリックで入力）</h3>
                  {testUsers.map((testUser, index) => (
                    <button
                      key={index}
                      onClick={() => quickLogin(testUser.email)}
                      className="block w-full text-left p-2 mb-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                    >
                      <div className="font-medium">{testUser.email}</div>
                      <div className="text-gray-600">{testUser.role} - {testUser.region}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-green-800">ログイン中</h3>
                  <p><strong>名前:</strong> {user.name}</p>
                  <p><strong>ロール:</strong> {user.role}</p>
                  <p><strong>地域:</strong> {user.region_id}</p>
                  <p><strong>アクセス可能地域:</strong> {user.accessible_regions.join(', ')}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>

          {/* テストセクション */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">認証テスト</h2>
            
            {user ? (
              <div className="space-y-4">
                <button
                  onClick={runAuthTest}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  🔒 一般認証テスト実行
                </button>
                
                <button
                  onClick={runAdminTest}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
                >
                  👑 管理者権限テスト実行
                </button>

                {testResults && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">テスト結果</h4>
                    <pre className="text-sm text-blue-700 whitespace-pre-wrap">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                ログインしてテストを実行してください
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 実装機能</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-green-600 mb-2">✅ 完了した機能</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• JWT認証システム</li>
                <li>• ログイン・ログアウト API</li>
                <li>• 認証middleware</li>
                <li>• RBAC権限システム</li>
                <li>• セッション管理</li>
                <li>• 地域別アクセス制御</li>
                <li>• 4ロール対応 (owner/secretariat/company_admin/student)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">🔄 次の実装予定</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• shadcn/ui コンポーネント</li>
                <li>• 基本CMS (お知らせ・クラス・プロジェクト・委員会)</li>
                <li>• A11y対応</li>
                <li>• Cloudflare Pages デプロイ</li>
                <li>• E2Eテスト</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}