import { NextRequest, NextResponse } from 'next/server';
import { AuditLogEntry, PaginatedResponse } from '@/types/admin';

// 監査ログ一覧を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // クエリパラメータを取得
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const severity = url.searchParams.get('severity') || '';
    const category = url.searchParams.get('category') || '';
    const actor = url.searchParams.get('actor') || '';
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';
    const sortBy = url.searchParams.get('sortBy') || 'timestamp';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // TODO: 実際のデータベースから監査ログを取得
    // 現在はモックデータを返す
    const mockLogs: AuditLogEntry[] = [
      {
        id: 'audit_1',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分前
        actor: {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@neo.com',
          role: 'owner'
        },
        action: 'user_login',
        entity: 'authentication',
        entityId: 'session_12345',
        changes: {
          login_method: 'password',
          success: true
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        severity: 'info',
        category: 'auth'
      },
      {
        id: 'audit_2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1時間前
        actor: {
          id: '2',
          name: '佐藤花子',
          email: 'sato@neo.com',
          role: 'secretariat'
        },
        action: 'user_update',
        entity: 'user',
        entityId: 'user_123',
        changes: {
          name: { from: '山田太郎', to: '山田次郎' },
          role: { from: 'student', to: 'company_admin' }
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        severity: 'info',
        category: 'user'
      },
      {
        id: 'audit_3',
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5時間前
        action: 'system_backup',
        entity: 'database',
        entityId: 'backup_20240130_030000',
        changes: {
          backup_type: 'full',
          size_mb: 2340,
          duration_seconds: 252
        },
        ipAddress: null,
        userAgent: null,
        severity: 'info',
        category: 'system'
      },
      {
        id: 'audit_4',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2時間前
        actor: {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@neo.com',
          role: 'owner'
        },
        action: 'settings_update',
        entity: 'system_settings',
        entityId: 'setting_jwt_secret',
        changes: {
          key: 'jwt_secret',
          old_value: '[REDACTED]',
          new_value: '[REDACTED]'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        severity: 'warning',
        category: 'security'
      },
      {
        id: 'audit_5',
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3時間前
        action: 'failed_login_attempts',
        entity: 'authentication',
        entityId: 'brute_force_detected',
        changes: {
          ip_address: '203.0.113.50',
          attempt_count: 15,
          time_window: '10 minutes',
          blocked: true
        },
        ipAddress: '203.0.113.50',
        userAgent: 'curl/7.68.0',
        severity: 'critical',
        category: 'security'
      },
      {
        id: 'audit_6',
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4時間前
        actor: {
          id: '3',
          name: '鈴木一郎',
          email: 'suzuki@company.com',
          role: 'company_admin'
        },
        action: 'data_export',
        entity: 'user_data',
        entityId: 'export_20240130_120000',
        changes: {
          export_type: 'csv',
          record_count: 156,
          file_size_kb: 89
        },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        severity: 'warning',
        category: 'data'
      },
      {
        id: 'audit_7',
        timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5時間前
        action: 'database_error',
        entity: 'database',
        entityId: 'connection_timeout',
        changes: {
          error_type: 'connection_timeout',
          query: 'SELECT * FROM users WHERE...',
          duration_ms: 30000
        },
        ipAddress: null,
        userAgent: null,
        severity: 'error',
        category: 'system'
      },
      {
        id: 'audit_8',
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6時間前
        actor: {
          id: '4',
          name: '高橋美咲',
          email: 'takahashi@student.com',
          role: 'student'
        },
        action: 'file_upload',
        entity: 'file',
        entityId: 'file_abc123def456',
        changes: {
          original_name: 'profile_image.jpg',
          size_bytes: 245760,
          mime_type: 'image/jpeg'
        },
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        severity: 'info',
        category: 'data'
      }
    ];

    // フィルタリング
    let filteredLogs = mockLogs;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        log.entity.toLowerCase().includes(searchLower) ||
        (log.actor?.name.toLowerCase().includes(searchLower)) ||
        (log.entityId?.toLowerCase().includes(searchLower))
      );
    }

    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (actor) {
      filteredLogs = filteredLogs.filter(log => 
        log.actor?.name.toLowerCase().includes(actor.toLowerCase()) ||
        log.actor?.email.toLowerCase().includes(actor.toLowerCase())
      );
    }

    // 日付フィルター
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // 終日まで含める
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
    }

    // ソート
    filteredLogs.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        case 'entity':
          aValue = a.entity;
          bValue = b.entity;
          break;
        case 'severity':
          const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
          aValue = severityOrder[a.severity as keyof typeof severityOrder];
          bValue = severityOrder[b.severity as keyof typeof severityOrder];
          break;
        case 'timestamp':
        default:
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // ページネーション
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    const response: PaginatedResponse<AuditLogEntry> = {
      data: paginatedLogs,
      pagination: {
        page,
        limit,
        total: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / limit),
        hasNext: endIndex < filteredLogs.length,
        hasPrev: page > 1
      }
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('監査ログの取得でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: '監査ログの取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

// 新しい監査ログを作成するAPI
export async function POST(request: NextRequest) {
  try {
    const logData = await request.json();

    // バリデーション
    if (!logData.action || !logData.entity) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'アクションとエンティティは必須です' },
        { status: 400 }
      );
    }

    // IPアドレスとUser-Agentをヘッダーから取得
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';
    const userAgent = request.headers.get('user-agent');

    const auditLog: Partial<AuditLogEntry> = {
      ...logData,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date().toISOString(),
      ipAddress: clientIP,
      userAgent: userAgent,
      severity: logData.severity || 'info',
      category: logData.category || 'system'
    };

    // TODO: データベースに監査ログを挿入
    console.log('監査ログ作成:', auditLog);

    return NextResponse.json(
      { 
        success: true, 
        message: '監査ログを作成しました',
        logId: auditLog.id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('監査ログの作成でエラーが発生しました:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: '監査ログの作成に失敗しました'
      },
      { status: 500 }
    );
  }
}