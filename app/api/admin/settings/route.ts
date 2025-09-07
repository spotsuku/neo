import { NextRequest, NextResponse } from 'next/server';
import { SystemSetting } from '@/types/admin';

// システム設定一覧を取得するAPI
export async function GET(request: NextRequest) {
  try {
    // TODO: 実際のデータベースからシステム設定を取得
    // 現在はモックデータを返す
    const mockSettings: SystemSetting[] = [
      // 一般設定
      {
        id: '1',
        category: 'general',
        key: 'app_name',
        value: 'NEO Portal',
        type: 'string',
        description: 'アプリケーション名',
        isEditable: true,
        updatedBy: 'system',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '2',
        category: 'general',
        key: 'app_description',
        value: '地域産業とスタートアップを結ぶプラットフォーム',
        type: 'string',
        description: 'アプリケーションの説明',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-20T10:30:00Z'
      },
      {
        id: '3',
        category: 'general',
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        description: 'メンテナンスモードを有効にする',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '4',
        category: 'general',
        key: 'default_timezone',
        value: 'Asia/Tokyo',
        type: 'string',
        description: 'デフォルトのタイムゾーン',
        isEditable: true,
        updatedBy: 'system',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '5',
        category: 'general',
        key: 'session_timeout',
        value: '3600',
        type: 'number',
        description: 'セッションタイムアウト（秒）',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-18T14:20:00Z'
      },

      // セキュリティ設定
      {
        id: '6',
        category: 'security',
        key: 'password_min_length',
        value: '8',
        type: 'number',
        description: 'パスワード最小文字数',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '7',
        category: 'security',
        key: 'login_attempts_limit',
        value: '5',
        type: 'number',
        description: 'ログイン試行回数制限',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '8',
        category: 'security',
        key: 'two_factor_required',
        value: 'false',
        type: 'boolean',
        description: '二要素認証を必須にする',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-22T11:15:00Z'
      },
      {
        id: '9',
        category: 'security',
        key: 'jwt_secret',
        value: '••••••••••••••••',
        type: 'string',
        description: 'JWT署名シークレット',
        isEditable: true,
        updatedBy: 'system',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '10',
        category: 'security',
        key: 'cors_origins',
        value: '["https://neo-portal.pages.dev", "http://localhost:3000"]',
        type: 'json',
        description: '許可するCORSオリジン',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-20T16:45:00Z'
      },

      // メール設定
      {
        id: '11',
        category: 'email',
        key: 'smtp_host',
        value: 'smtp.gmail.com',
        type: 'string',
        description: 'SMTPサーバーホスト',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '12',
        category: 'email',
        key: 'smtp_port',
        value: '587',
        type: 'number',
        description: 'SMTPサーバーポート',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '13',
        category: 'email',
        key: 'smtp_user',
        value: 'noreply@neo-portal.com',
        type: 'string',
        description: 'SMTPユーザー名',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '14',
        category: 'email',
        key: 'smtp_password',
        value: '••••••••',
        type: 'string',
        description: 'SMTPパスワード',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '15',
        category: 'email',
        key: 'from_email',
        value: 'NEO Portal <noreply@neo-portal.com>',
        type: 'string',
        description: 'メール送信者',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },

      // API設定
      {
        id: '16',
        category: 'api',
        key: 'google_client_id',
        value: '••••••••••••••••.apps.googleusercontent.com',
        type: 'string',
        description: 'Google OAuth クライアントID',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '17',
        category: 'api',
        key: 'google_client_secret',
        value: '••••••••••••••••',
        type: 'string',
        description: 'Google OAuth クライアントシークレット',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '18',
        category: 'api',
        key: 'slack_webhook_url',
        value: 'https://hooks.slack.com/services/••••••••••••••••',
        type: 'string',
        description: 'Slack Webhook URL',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-18T13:30:00Z'
      },
      {
        id: '19',
        category: 'api',
        key: 'sentry_dsn',
        value: 'https://••••••••••••••••@sentry.io/••••••••',
        type: 'string',
        description: 'Sentry DSN',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '20',
        category: 'api',
        key: 'rate_limit_requests',
        value: '100',
        type: 'number',
        description: 'API レート制限（リクエスト/分）',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-19T09:15:00Z'
      },

      // ストレージ設定
      {
        id: '21',
        category: 'storage',
        key: 'file_upload_max_size',
        value: '10485760',
        type: 'number',
        description: 'ファイルアップロード最大サイズ（バイト）',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '22',
        category: 'storage',
        key: 'allowed_file_types',
        value: '["image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv"]',
        type: 'json',
        description: '許可するファイルタイプ',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-17T14:20:00Z'
      },
      {
        id: '23',
        category: 'storage',
        key: 'backup_schedule',
        value: '0 3 * * *',
        type: 'string',
        description: 'バックアップスケジュール（cron形式）',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '24',
        category: 'storage',
        key: 'backup_retention_days',
        value: '30',
        type: 'number',
        description: 'バックアップ保存期間（日）',
        isEditable: true,
        updatedBy: 'admin',
        updatedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: '25',
        category: 'storage',
        key: 'r2_bucket_name',
        value: 'neo-portal-storage',
        type: 'string',
        description: 'R2 バケット名',
        isEditable: false,
        updatedBy: 'system',
        updatedAt: '2024-01-15T09:00:00Z'
      }
    ];

    // カテゴリによるフィルタリング
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    
    let filteredSettings = mockSettings;
    if (category) {
      filteredSettings = filteredSettings.filter(setting => setting.category === category);
    }

    return NextResponse.json(filteredSettings, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('システム設定の取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'システム設定の取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

// システム設定を更新するAPI
export async function PATCH(request: NextRequest) {
  try {
    const changes: Record<string, any> = await request.json();

    if (!changes || Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: '更新する設定が指定されていません' },
        { status: 400 }
      );
    }

    // 設定の検証
    for (const [settingId, value] of Object.entries(changes)) {
      // TODO: 設定値の検証ロジック
      // - 型の検証
      // - 許可される値の範囲の検証
      // - 必須設定の検証など
      
      console.log('設定更新:', { settingId, value });
    }

    // TODO: データベースで設定値を更新
    // 実際の実装では、設定テーブルを更新し、変更履歴を記録

    // 更新の監査ログ
    const auditLog = {
      action: 'update_settings',
      changes: Object.keys(changes),
      timestamp: new Date().toISOString(),
      // TODO: 実際のユーザーIDを取得
      userId: 'current_user_id'
    };

    console.log('設定更新ログ:', auditLog);

    return NextResponse.json({
      success: true,
      message: `${Object.keys(changes).length}件の設定を更新しました`,
      updatedSettings: Object.keys(changes)
    });

  } catch (error) {
    console.error('システム設定の更新でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'システム設定の更新に失敗しました'
      },
      { status: 500 }
    );
  }
}