'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // モック認証状態の初期化
    const initializeAuth = async () => {
      try {
        // モックユーザー（実際の実装では API から取得）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setUser({
          id: 1,
          email: 'admin@neo-portal.local',
          name: 'システム管理者',
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // モックログイン処理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUser({
        id: 1,
        email,
        name: 'システム管理者',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // モックログアウト処理
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    login,
    logout
  };
};