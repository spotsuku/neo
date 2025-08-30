import { NextRequest, NextResponse } from 'next/server';
import { SystemAlert } from '@/types/admin';

// システムアラートを取得するAPI
export async function GET(request: NextRequest) {
  try {
    // TODO: 実際のデータベースから alerts テーブルのデータを取得
    // 現在はモックデータを返す
    const alerts: SystemAlert[] = [
      {
        id: '1',
        type: 'warning',
        title: 'データベース接続数が上限に近づいています',
        message: '現在のデータベース接続数: 485/500。新しい接続プールの追加を検討してください。',
        source: 'database',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15分前
        isRead: false,
        isResolved: false,
        metadata: {
          currentConnections: 485,
          maxConnections: 500,
          utilizationRate: 0.97
        }
      },
      {
        id: '2',
        type: 'info',
        title: '定期バックアップが正常に完了しました',
        message: '本日 03:00 のデータベースバックアップが正常に完了しました。',
        source: 'system',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6時間前
        isRead: true,
        isResolved: true,
        resolvedBy: 'system',
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        metadata: {
          backupSize: '2.3GB',
          duration: '4.2 minutes',
          backupType: 'full'
        }
      },
      {
        id: '3',
        type: 'error',
        title: 'メール送信サービスでエラーが発生しています',
        message: 'SMTPサーバーへの接続でタイムアウトが発生しています。メール送信が遅延している可能性があります。',
        source: 'system',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45分前
        isRead: false,
        isResolved: false,
        metadata: {
          errorCount: 12,
          lastAttempt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          smtpServer: 'smtp.gmail.com'
        }
      },
      {
        id: '4',
        type: 'critical',
        title: 'セキュリティ: 異常なログイン試行を検出',
        message: '同一IPアドレスから短時間で大量のログイン試行が行われています。',
        source: 'security',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分前
        isRead: false,
        isResolved: false,
        metadata: {
          ipAddress: '192.168.1.100',
          attemptCount: 45,
          timeWindow: '10 minutes',
          blockedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
        }
      }
    ];

    // クエリパラメータでフィルタリング
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type');
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredAlerts = alerts;

    if (typeFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === typeFilter);
    }

    if (unreadOnly) {
      filteredAlerts = filteredAlerts.filter(alert => !alert.isRead);
    }

    // 最新のものから順にソート
    filteredAlerts = filteredAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json(filteredAlerts, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('アラート情報の取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'アラート情報の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

// アラートを既読にマークするAPI
export async function PATCH(request: NextRequest) {
  try {
    const { alertIds, markAsRead } = await request.json();

    if (!Array.isArray(alertIds)) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'alertIds must be an array' },
        { status: 400 }
      );
    }

    // TODO: データベースでアラートの状態を更新
    console.log(`アラートを${markAsRead ? '既読' : '未読'}にマーク:`, alertIds);

    return NextResponse.json({ 
      success: true, 
      message: `${alertIds.length}件のアラートを${markAsRead ? '既読' : '未読'}にマークしました` 
    });

  } catch (error) {
    console.error('アラート状態の更新でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'アラート状態の更新に失敗しました'
      },
      { status: 500 }
    );
  }
}