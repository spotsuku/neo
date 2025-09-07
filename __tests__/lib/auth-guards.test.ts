// NEO Portal - Auth Guards Unit Tests  
// 認証ガードシステムのユニットテスト

import { NextRequest } from 'next/server';
import { 
  authenticateRequest,
  authorizeRequest,
  withAuth,
  withAdminAuth,
  withCompanyAuth, 
  withRoleAuth,
  withResourceAuth,
  getRequestUser,
  AuthorizedResponse,
  type AuthGuardOptions,
  type AuthGuardResult
} from '@/lib/auth-guards';
import { AuthService } from '@/lib/auth-enhanced';
import { SecurityLogger } from '@/lib/security';
import type { AuthUser } from '@/lib/auth-enhanced';

// モック設定
jest.mock('@/lib/auth-enhanced');
jest.mock('@/lib/security');

const MockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const MockSecurityLogger = SecurityLogger as jest.MockedClass<typeof SecurityLogger>;

// テスト用ユーザーデータ
const createTestUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'test-user-id',
  email: 'test@neo-digital.jp', 
  name: 'Test User',
  role: 'student',
  region_id: 'FUK',
  accessible_regions: ['FUK'],
  session_id: 'test-session-id',
  totp_verified: false,
  ...overrides,
});

const ownerUser = createTestUser({
  id: 'owner-id',
  role: 'owner',
  accessible_regions: ['ALL'],
});

const secretariatUser = createTestUser({
  id: 'secretariat-id',
  role: 'secretariat',
  accessible_regions: ['FUK', 'ISK'],
});

const companyAdminUser = createTestUser({
  id: 'company-admin-id',
  role: 'company_admin', 
  accessible_regions: ['FUK'],
});

const studentUser = createTestUser({
  id: 'student-id',
  role: 'student',
  accessible_regions: ['FUK'],
});

// テスト用リクエスト作成ヘルパー
const createTestRequest = (options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}): NextRequest => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    cookies = {},
  } = options;
  
  const request = new NextRequest(url, { method });
  
  // ヘッダー設定
  Object.entries(headers).forEach(([key, value]) => {
    request.headers.set(key, value);
  });
  
  // Cookie設定（モック）
  Object.entries(cookies).forEach(([key, value]) => {
    // NextRequestのcookiesはReadOnlyなのでモック
    jest.spyOn(request.cookies, 'get').mockImplementation((name) => {
      if (name === key) return { name, value };
      return undefined;
    });
  });
  
  return request;
};

describe('Authentication Guards', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // AuthService のモック設定
    MockAuthService.mockImplementation(() => ({
      verifyToken: jest.fn(),
    } as any));
    
    // SecurityLogger のモック設定  
    MockSecurityLogger.logSecurityEvent = jest.fn().mockResolvedValue(undefined);
  });
  
  describe('authenticateRequest()', () => {
    
    test('Authorization ヘッダーからトークンを取得して認証成功', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: ownerUser.id,
        email: ownerUser.email,
        name: ownerUser.name,
        role: ownerUser.role,
        region_id: ownerUser.region_id,
        accessible_regions: ownerUser.accessible_regions,
        session_id: ownerUser.session_id,
        totp_verified: ownerUser.totp_verified,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });
      
      const result = await authenticateRequest(request);
      
      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        id: ownerUser.id,
        email: ownerUser.email,
        role: ownerUser.role,
      });
      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token', 'access');
    });
    
    test('Cookie からトークンを取得して認証成功', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: studentUser.id,
        email: studentUser.email,
        name: studentUser.name,
        role: studentUser.role,
        region_id: studentUser.region_id,
        accessible_regions: studentUser.accessible_regions,
        session_id: studentUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        cookies: {
          'access-token': 'cookie-token'
        }
      });
      
      const result = await authenticateRequest(request);
      
      expect(result.success).toBe(true);
      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token', 'access');
    });
    
    test('トークンが提供されない場合は認証失敗', async () => {
      const request = createTestRequest();
      
      const result = await authenticateRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No authentication token provided');
      expect(result.status).toBe(401);
    });
    
    test('無効なトークンの場合は認証失敗', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue(null);
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      const result = await authenticateRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
      expect(result.status).toBe(401);
    });
    
    test('トークン検証でエラーが発生した場合', async () => {
      const mockVerifyToken = jest.fn().mockRejectedValue(new Error('Token verification failed'));
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: {
          'Authorization': 'Bearer error-token'
        }
      });
      
      const result = await authenticateRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(result.status).toBe(500);
    });
  });
  
  describe('authorizeRequest()', () => {
    
    beforeEach(() => {
      // 基本認証は常に成功するようにモック
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: ownerUser.id,
        email: ownerUser.email,
        name: ownerUser.name,
        role: ownerUser.role,
        region_id: ownerUser.region_id,
        accessible_regions: ownerUser.accessible_regions,
        session_id: ownerUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
    });
    
    test('管理者権限チェックが成功', async () => {
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer owner-token' }
      });
      
      const options: AuthGuardOptions = {
        adminOnly: true,
      };
      
      const result = await authorizeRequest(request, options);
      
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('owner');
    });
    
    test('管理者権限チェックが失敗（student ユーザー）', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: studentUser.id,
        email: studentUser.email,
        name: studentUser.name,
        role: studentUser.role,
        region_id: studentUser.region_id,
        accessible_regions: studentUser.accessible_regions,
        session_id: studentUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer student-token' }
      });
      
      const options: AuthGuardOptions = {
        adminOnly: true,
      };
      
      const result = await authorizeRequest(request, options);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin privileges required');
      expect(result.status).toBe(403);
      expect(MockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        studentUser.id,
        'permission_denied',
        'Admin access required',
        request
      );
    });
    
    test('特定ロール権限チェックが成功', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: companyAdminUser.id,
        email: companyAdminUser.email,
        name: companyAdminUser.name,
        role: companyAdminUser.role,
        region_id: companyAdminUser.region_id,
        accessible_regions: companyAdminUser.accessible_regions,
        session_id: companyAdminUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer company-admin-token' }
      });
      
      const options: AuthGuardOptions = {
        roles: ['secretariat', 'company_admin'],
      };
      
      const result = await authorizeRequest(request, options);
      
      expect(result.success).toBe(true);
    });
    
    test('特定ロール権限チェックが失敗', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: studentUser.id,
        email: studentUser.email,
        name: studentUser.name,
        role: studentUser.role,
        region_id: studentUser.region_id,
        accessible_regions: studentUser.accessible_regions,
        session_id: studentUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer student-token' }
      });
      
      const options: AuthGuardOptions = {
        roles: ['owner', 'secretariat'],
      };
      
      const result = await authorizeRequest(request, options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient role permissions');
      expect(result.status).toBe(403);
    });
    
    test('リソース権限チェックが成功', async () => {
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer owner-token' }
      });
      
      const options: AuthGuardOptions = {
        resource: 'user',
        action: 'delete',
      };
      
      const result = await authorizeRequest(request, options);
      
      expect(result.success).toBe(true);
    });
    
    test('企業レベル権限チェックが成功', async () => {
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: companyAdminUser.id,
        email: companyAdminUser.email,
        name: companyAdminUser.name,
        role: companyAdminUser.role,
        region_id: companyAdminUser.region_id,
        accessible_regions: companyAdminUser.accessible_regions,
        session_id: companyAdminUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer company-admin-token' }
      });
      
      const options: AuthGuardOptions = {
        companyLevel: true,
      };
      
      const result = await authorizeRequest(request, options);
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('AuthorizedResponse', () => {
    
    test('forbidden() - 権限不足レスポンス', () => {
      const response = AuthorizedResponse.forbidden('Custom message');
      
      expect(response.status).toBe(403);
      // レスポンスボディのテストは実際のNext.jsレスポンスオブジェクトでは困難
    });
    
    test('unauthorized() - 認証エラーレスポンス', () => {
      const response = AuthorizedResponse.unauthorized('Custom auth message');
      
      expect(response.status).toBe(401);
    });
    
    test('success() - 成功レスポンス', () => {
      const testData = { message: 'Test success' };
      const response = AuthorizedResponse.success(testData);
      
      expect(response.status).toBe(200);
    });
    
    test('error() - エラーレスポンス', () => {
      const response = AuthorizedResponse.error('Custom error', 400);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('デコレーター機能', () => {
    
    test('withAuth() デコレーターが正しく動作', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        AuthorizedResponse.success({ message: 'Handler executed' })
      );
      
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: ownerUser.id,
        email: ownerUser.email,
        name: ownerUser.name,
        role: ownerUser.role,
        region_id: ownerUser.region_id,
        accessible_regions: ownerUser.accessible_regions,
        session_id: ownerUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const decoratedHandler = withAuth()(mockHandler);
      
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer valid-token' }
      });
      
      const response = await decoratedHandler(request, {});
      
      expect(mockHandler).toHaveBeenCalledWith(request, {});
      expect((request as any).user).toBeDefined();
      expect((request as any).user.id).toBe(ownerUser.id);
    });
    
    test('withAdminAuth() デコレーターが権限不足時にエラーレスポンス', async () => {
      const mockHandler = jest.fn();
      
      const mockVerifyToken = jest.fn().mockResolvedValue({
        sub: studentUser.id,
        email: studentUser.email,
        name: studentUser.name,
        role: studentUser.role,
        region_id: studentUser.region_id,
        accessible_regions: studentUser.accessible_regions,
        session_id: studentUser.session_id,
      });
      
      MockAuthService.mockImplementation(() => ({
        verifyToken: mockVerifyToken,
      } as any));
      
      const decoratedHandler = withAdminAuth()(mockHandler);
      
      const request = createTestRequest({
        headers: { 'Authorization': 'Bearer student-token' }
      });
      
      const response = await decoratedHandler(request, {});
      
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });
  
  describe('getRequestUser()', () => {
    
    test('リクエストからユーザー情報を取得', () => {
      const request = createTestRequest();
      (request as any).user = ownerUser;
      
      const user = getRequestUser(request);
      
      expect(user).toEqual(ownerUser);
    });
    
    test('ユーザー情報が設定されていない場合はnull', () => {
      const request = createTestRequest();
      
      const user = getRequestUser(request);
      
      expect(user).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  
  test('完全な認証・認可フローが正常に動作', async () => {
    const mockVerifyToken = jest.fn().mockResolvedValue({
      sub: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      role: ownerUser.role,
      region_id: ownerUser.region_id,
      accessible_regions: ownerUser.accessible_regions,
      session_id: ownerUser.session_id,
    });
    
    MockAuthService.mockImplementation(() => ({
      verifyToken: mockVerifyToken,
    } as any));
    
    const request = createTestRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/admin/users',
      headers: { 'Authorization': 'Bearer owner-token' }
    });
    
    // 1. 認証チェック
    const authResult = await authenticateRequest(request);
    expect(authResult.success).toBe(true);
    
    // 2. 認可チェック（管理者権限）
    const authzResult = await authorizeRequest(request, {
      adminOnly: true,
      resource: 'user',
      action: 'create'
    });
    expect(authzResult.success).toBe(true);
    
    // 3. セキュリティログ記録確認
    expect(MockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
      ownerUser.id,
      'api_access_granted',
      expect.stringContaining('POST'),
      request
    );
  });
});