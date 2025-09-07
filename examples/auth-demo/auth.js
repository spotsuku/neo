/**
 * NEO Digital Platform - 認証システム
 * 統合認証マネージャー
 */

class AuthManager {
    constructor() {
        this.apiBase = ''; // 同一オリジンなので空文字
        this.currentUser = null;
        this.isAuthenticated = false;
        
        console.log('🔐 AuthManager initialized');
        this.initializeAuth();
    }

    // 認証状態の初期化
    initializeAuth() {
        const token = localStorage.getItem('neo_token');
        const user = localStorage.getItem('neo_user');
        
        if (token && user) {
            try {
                this.currentUser = JSON.parse(user);
                this.isAuthenticated = true;
                console.log('✅ 既存認証セッション復元:', this.currentUser);
            } catch (error) {
                console.error('❌ セッション復元エラー:', error);
                this.clearSession();
            }
        }
    }

    // ログイン処理
    async login(email, password, totpCode = '') {
        console.log('🔐 ログイン処理開始:', { email, totpCode: totpCode ? '有り' : '無し' });

        try {
            // テスト用ユーザーデータベース
            const testUsers = {
                'student@neo.jp': {
                    email: 'student@neo.jp',
                    password: 'password123',
                    role: 'student',
                    name: '田中 太郎',
                    id: 'student-001',
                    status: 'active'
                },
                'company@neo.jp': {
                    email: 'company@neo.jp',
                    password: 'password123',
                    role: 'company',
                    name: 'NEO株式会社',
                    id: 'company-001',
                    status: 'active'
                },
                'admin@neo.jp': {
                    email: 'admin@neo.jp',
                    password: 'password123',
                    role: 'admin',
                    name: '管理者',
                    id: 'admin-001',
                    status: 'active'
                }
            };

            // ユーザー存在確認
            const user = testUsers[email.toLowerCase()];
            if (!user) {
                return {
                    success: false,
                    error: 'ユーザーが見つかりません',
                    message: '無効なメールアドレスまたはパスワードです'
                };
            }

            // パスワード確認
            if (user.password !== password) {
                return {
                    success: false,
                    error: 'パスワードが間違っています',
                    message: '無効なメールアドレスまたはパスワードです'
                };
            }

            // TOTP検証（簡単な実装）
            if (totpCode && totpCode !== '123456') {
                return {
                    success: false,
                    error: '認証コードが間違っています',
                    message: '認証コードを確認してください',
                    requiresTOTP: true
                };
            }

            // 認証成功
            const authUser = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                loginTime: new Date().toISOString()
            };

            // トークン生成（簡易版）
            const token = btoa(JSON.stringify({
                userId: user.id,
                email: user.email,
                role: user.role,
                exp: Date.now() + (24 * 60 * 60 * 1000) // 24時間
            }));

            // セッション保存
            this.currentUser = authUser;
            this.isAuthenticated = true;
            localStorage.setItem('neo_token', token);
            localStorage.setItem('neo_user', JSON.stringify(authUser));

            console.log('✅ ログイン成功:', authUser);

            return {
                success: true,
                user: authUser,
                token: token,
                message: 'ログインしました'
            };

        } catch (error) {
            console.error('❌ ログインエラー:', error);
            return {
                success: false,
                error: 'システムエラー',
                message: 'ログイン処理中にエラーが発生しました'
            };
        }
    }

    // ログアウト処理
    async logout() {
        console.log('🚪 ログアウト処理開始');
        
        try {
            // API呼び出し（オプション）
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('neo_token')}`
                }
            }).catch(err => console.log('Logout API call failed:', err));

        } catch (error) {
            console.error('ログアウトAPI呼び出しエラー:', error);
        }

        // ローカルセッションクリア
        this.clearSession();
        
        console.log('✅ ログアウト完了');
        return { success: true };
    }

    // セッションクリア
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('neo_token');
        localStorage.removeItem('neo_user');
        console.log('🧹 セッションクリア完了');
    }

    // 現在のユーザー取得
    getCurrentUser() {
        return this.currentUser;
    }

    // 認証状態確認
    isLoggedIn() {
        return this.isAuthenticated;
    }

    // トークン取得
    getToken() {
        return localStorage.getItem('neo_token');
    }

    // ロール確認
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // 認証が必要なAPI呼び出し
    async authenticatedFetch(url, options = {}) {
        const token = this.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, {
            ...options,
            headers
        });
    }
}

// グローバルインスタンス作成
if (!window.authManager) {
    window.authManager = new AuthManager();
    console.log('🌍 Global authManager created');
}

// 認証状態チェック関数
function requireAuth() {
    if (!window.authManager || !window.authManager.isLoggedIn()) {
        console.log('🚫 認証が必要です。ログインページにリダイレクト');
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// ロールベースアクセス制御
function requireRole(requiredRole) {
    if (!requireAuth()) return false;
    
    if (!window.authManager.hasRole(requiredRole)) {
        console.log(`🚫 ${requiredRole}権限が必要です`);
        alert('このページにアクセスする権限がありません');
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

// ページ読み込み時の自動認証チェック
document.addEventListener('DOMContentLoaded', function() {
    // ログインページ以外で認証チェック
    if (!window.location.pathname.includes('login') && 
        !window.location.pathname.includes('index')) {
        
        console.log('🔍 ページアクセス時の認証チェック');
        
        // 管理者ページ
        if (window.location.pathname.includes('admin')) {
            requireRole('admin');
        }
        // 企業ページ  
        else if (window.location.pathname.includes('company')) {
            requireRole('company');
        }
        // その他のダッシュボードページ
        else if (window.location.pathname.includes('dashboard')) {
            requireAuth();
        }
    }
});

console.log('🔐 Auth system loaded successfully');