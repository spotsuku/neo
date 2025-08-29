// NEO Digital Platform - ログアウトAPI
// POST /api/auth/logout

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // クッキーからトークンを削除
    const response = NextResponse.json({ 
      message: 'ログアウトしました',
      success: true 
    });
    
    response.cookies.delete('neo-auth-token');

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: 'ログアウト処理中にエラーが発生しました'
      },
      { status: 500 }
    );
  }
}