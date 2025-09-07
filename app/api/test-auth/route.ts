// NEO Portal - Authentication Test API
// GET/POST /api/test-auth - 認証・セキュリティテスト用エンドポイント

import { NextRequest } from 'next/server';
import { AuthService, requiresTOTP } from '@/lib/auth-enhanced';
import { SecurityLogger, getClientIP, setSecurityHeaders } from '@/lib/security';

interface CloudflareBindings {
  DB: D1Database;
}

// GET: 基本認証テスト
export const GET = async (request: NextRequest) => {
  const env = process.env as any as CloudflareBindings;
  
  if (!env.DB) {
    return setSecurityHeaders(new Response(
      JSON.stringify({ 
        error: 'DATABASE_UNAVAILABLE', 
        message: 'データベースに接続できません' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const authService = new AuthService(env.DB);
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // 認証チェック
    const authUser = await authService.getAuthUser(request);
    
    if (!authUser) {
      await securityLogger.log({
        action: 'TEST_AUTH_UNAUTHORIZED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        riskLevel: 'LOW'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: '認証が必要です',
          test_result: 'FAILED',
          reason: 'No valid token provided'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // TOTP必須チェック
    if (requiresTOTP(authUser)) {
      await securityLogger.log({
        userId: authUser.id,
        action: 'TEST_AUTH_TOTP_REQUIRED',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        riskLevel: 'LOW'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'TOTP_REQUIRED',
          message: '2段階認証が必要です',
          test_result: 'PARTIAL',
          reason: 'TOTP verification required',
          user: {
            id: authUser.id,
            email: authUser.email,
            totp_enabled: authUser.totp_enabled,
            totp_verified: authUser.totp_verified
          }
        }),
        { status: 428, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    await securityLogger.log({
      userId: authUser.id,
      action: 'TEST_AUTH_SUCCESS',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      riskLevel: 'LOW'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        success: true,
        message: '認証テスト成功',
        test_result: 'PASSED',
        user: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          region_id: authUser.region_id,
          accessible_regions: authUser.accessible_regions,
          totp_enabled: authUser.totp_enabled,
          totp_verified: authUser.totp_verified,
          session_id: authUser.session_id
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('Auth test error:', error);

    await securityLogger.log({
      action: 'TEST_AUTH_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: '認証テスト中にエラーが発生しました',
        test_result: 'ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
};

// POST: 管理者権限テスト
export const POST = async (request: NextRequest) => {
  const env = process.env as any as CloudflareBindings;
  
  if (!env.DB) {
    return setSecurityHeaders(new Response(
      JSON.stringify({ 
        error: 'DATABASE_UNAVAILABLE', 
        message: 'データベースに接続できません' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const authService = new AuthService(env.DB);
  const securityLogger = new SecurityLogger(env.DB);
  const clientIP = getClientIP(request);

  try {
    // 認証チェック
    const authUser = await authService.getAuthUser(request);
    
    if (!authUser) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: '認証が必要です',
          test_result: 'FAILED',
          reason: 'No authentication'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // TOTP必須チェック
    if (requiresTOTP(authUser)) {
      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'TOTP_REQUIRED',
          message: '2段階認証が必要です',
          test_result: 'FAILED',
          reason: 'TOTP verification required'
        }),
        { status: 428, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 管理者権限チェック
    const isAdmin = authUser.role === 'owner' || authUser.role === 'secretariat';
    
    if (!isAdmin) {
      await securityLogger.log({
        userId: authUser.id,
        action: 'TEST_AUTH_INSUFFICIENT_PRIVILEGE',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        details: { 
          requiredRole: 'admin',
          userRole: authUser.role
        },
        riskLevel: 'MEDIUM'
      });

      return setSecurityHeaders(new Response(
        JSON.stringify({
          error: 'FORBIDDEN',
          message: '管理者権限が必要です',
          test_result: 'FAILED',
          reason: 'Insufficient privileges',
          required_roles: ['owner', 'secretariat'],
          user_role: authUser.role
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    await securityLogger.log({
      userId: authUser.id,
      action: 'TEST_AUTH_ADMIN_SUCCESS',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      riskLevel: 'LOW'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        success: true,
        message: '管理者権限テスト成功',
        test_result: 'PASSED',
        privilege_level: 'ADMIN',
        user: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          region_id: authUser.region_id,
          accessible_regions: authUser.accessible_regions
        },
        permissions: {
          user_management: true,
          system_administration: true,
          security_logs: true,
          all_regions: authUser.role === 'owner'
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('Admin auth test error:', error);

    await securityLogger.log({
      action: 'TEST_AUTH_ADMIN_ERROR',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent'),
      details: { error: String(error) },
      riskLevel: 'HIGH'
    });

    return setSecurityHeaders(new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: '管理者権限テスト中にエラーが発生しました',
        test_result: 'ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
};

// OPTIONS method for CORS
export const OPTIONS = async () => {
  return setSecurityHeaders(new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  }));
};