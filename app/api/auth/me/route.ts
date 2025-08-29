// NEO Digital Platform - 認証情報取得API
// GET /api/auth/me

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 認証ユーザー取得
    const user = await getCurrentUser(request);

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