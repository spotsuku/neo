import { NextRequest, NextResponse } from 'next/server';
import { AdminStats } from '@/types/admin';

// 管理者統計情報を取得するAPI
export async function GET(request: NextRequest) {
  try {
    // TODO: 実際のデータベースから統計情報を取得
    // 現在はモックデータを返す
    const stats: AdminStats = {
      totalUsers: 1247,
      activeUsers: 892,
      totalCompanies: 156,
      activeCompanies: 134,
      totalMembers: 2340,
      activeMembers: 1987,
      totalProjects: 89,
      activeProjects: 67,
      totalEvents: 234,
      upcomingEvents: 12,
      totalNotices: 445,
      publishedNotices: 398,
      systemHealth: 'healthy',
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('統計情報の取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: '統計情報の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}