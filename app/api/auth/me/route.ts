// NEO Digital Platform - 認証情報取得API
// GET /api/auth/me

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';

export async function GET(request: NextRequest) {
  try {
    // Enhanced認証システムを使用 (Cookie + Header対応)
    // TODO: Cloudflare Workers環境では env.DB を使用
    // 開発環境では一時的に null DB で動作確認
    const authService = new AuthService(null as any);
    const user = await authService.getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED',
          message: '認証が必要です'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user,
      authenticated: true
    });

  } catch (error) {
    console.error('Auth me API error:', error);
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: '認証情報取得中にエラーが発生しました'
      },
      { status: 500 }
    );
  }
}