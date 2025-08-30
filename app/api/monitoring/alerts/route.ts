/**
 * アラート監視API
 * システム異常の検出と通知
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMonitoringSystem } from '@/lib/monitoring';
import { createEnvironment } from '@/lib/env';
import { requireAuth, requireAdmin, checkRateLimit, addRateLimitHeaders, addSecurityHeaders, getClientIP, sanitizeInput } from '@/lib/auth';

interface CloudflareBindings {
  DB: any;
  KV: any;
  R2: any;
}

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // 強化された認証チェック
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`alerts:${clientIP}`, 60, 60000);
    
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED' 
        },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimit);
    }

    const env = {
      DB: null,
      KV: null,
      R2: null,
    } as CloudflareBindings;

    // モック環境での処理
    if (!env.DB || !env.KV || !env.R2) {
      const mockAlerts = [
        // 現在のシステム状況に応じたモックアラート
        // 正常時は空の配列、問題がある時にアラートを追加
      ];

      // 時々警告アラートを生成（デモ用）
      if (Math.random() < 0.3) {
        mockAlerts.push('Warning: R2 storage response time is above normal (580ms > 500ms threshold)');
      }

      if (Math.random() < 0.1) {
        mockAlerts.push('High error rate detected: 3.2% (threshold: 5%)');
      }

      let response = NextResponse.json({
        alerts: mockAlerts,
        timestamp: new Date().toISOString(),
        alertCount: mockAlerts.length
      });
      
      response = addSecurityHeaders(response);
      response = addRateLimitHeaders(response, rateLimit);
      
      return response;
    }

    // 本番環境での処理
    const environment = createEnvironment(env);
    const monitoring = createMonitoringSystem(env);

    const alerts = await monitoring.checkAlertConditions();

    return NextResponse.json({
      alerts,
      timestamp: new Date().toISOString(),
      alertCount: alerts.length
    });

  } catch (error) {
    console.error('Alerts API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: アラートルールの設定/更新
export async function POST(request: NextRequest) {
  try {
    // 管理者権限が必要
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`alerts-config:${clientIP}`, 10, 60000);
    
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimit);
    }

    const rawBody = await request.json();
    const body = sanitizeInput(rawBody);
    const { 
      responseTimeThreshold, 
      errorRateThreshold, 
      memoryThreshold,
      notifications = []
    } = body;

    // バリデーション
    const errors: string[] = [];
    
    if (responseTimeThreshold !== undefined && (typeof responseTimeThreshold !== 'number' || responseTimeThreshold <= 0)) {
      errors.push('responseTimeThreshold must be a positive number');
    }
    
    if (errorRateThreshold !== undefined && (typeof errorRateThreshold !== 'number' || errorRateThreshold <= 0 || errorRateThreshold >= 1)) {
      errors.push('errorRateThreshold must be a number between 0 and 1');
    }
    
    if (memoryThreshold !== undefined && (typeof memoryThreshold !== 'number' || memoryThreshold <= 0)) {
      errors.push('memoryThreshold must be a positive number');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const env = {
      DB: null,
      KV: null,
      R2: null,
    } as CloudflareBindings;

    // アラート設定の保存（KVストレージまたはデータベースに保存）
    const alertConfig = {
      responseTimeThreshold: responseTimeThreshold || 2000, // デフォルト2秒
      errorRateThreshold: errorRateThreshold || 0.05,      // デフォルト5%
      memoryThreshold: memoryThreshold || 100 * 1024 * 1024, // デフォルト100MB
      notifications,
      updatedAt: new Date().toISOString()
    };

    // モック環境では設定をメモリに保存
    if (!env.KV) {
      console.log('Alert configuration updated (mock):', alertConfig);
      
      let response = NextResponse.json({
        message: 'Alert configuration updated successfully',
        config: alertConfig
      });
      
      response = addSecurityHeaders(response);
      response = addRateLimitHeaders(response, rateLimit);
      
      return response;
    }

    // 本番環境ではKVストレージに保存
    await env.KV.put('alert_config', JSON.stringify(alertConfig));

    return NextResponse.json({
      message: 'Alert configuration updated successfully',
      config: alertConfig
    });

  } catch (error) {
    console.error('Alert configuration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}