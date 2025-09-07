// NEOポータル - API クライアント設定
// 別オリジン（app.neo-portal.jp → api.neo-portal.jp）でのCORS対応

/**
 * API Base URL設定
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.neo-portal.jp';

/**
 * 認証付きAPI fetch（credentials: 'include' でCookie送信）
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const config: RequestInit = {
    credentials: 'include', // 🔑 重要: Cookie認証のため必須
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return response as any;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * 認証状態取得
 */
export async function getCurrentUser() {
  return apiRequest('/api/auth/me');
}

/**
 * ログイン
 */
export async function login(email: string, password: string) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * ログアウト
 */
export async function logout() {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * トークンリフレッシュ
 */
export async function refreshTokens() {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
  });
}

/**
 * ヘルスチェック
 */
export async function healthCheck() {
  return apiRequest('/api/health');
}

/**
 * ステータス確認
 */
export async function getStatus() {
  return apiRequest('/status');
}