// NEO Portal - RBAC Test API
// 権限システムの動作テスト用エンドポイント

import { NextRequest } from 'next/server';
import { 
  withAuth, 
  withAdminAuth, 
  withCompanyAuth,
  withRoleAuth,
  withResourceAuth,
  getRequestUser,
  AuthorizedResponse 
} from '@/lib/auth-guards';

/**
 * GET /api/test-rbac - 基本認証テスト
 * 任意の認証済みユーザーがアクセス可能
 */
export const GET = withAuth()(async (request: NextRequest) => {
  const user = getRequestUser(request);
  
  if (!user) {
    return AuthorizedResponse.unauthorized('User not found in request');
  }
  
  return AuthorizedResponse.success({
    message: 'Basic authentication successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      region_id: user.region_id,
      accessible_regions: user.accessible_regions,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/test-rbac - 管理者権限テスト
 * owner または secretariat ロールが必要
 */
export const POST = withAdminAuth()(async (request: NextRequest) => {
  const user = getRequestUser(request);
  
  return AuthorizedResponse.success({
    message: 'Admin authentication successful',
    adminUser: user?.name,
    role: user?.role,
    permissions: ['user_management', 'system_configuration', 'audit_access'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/test-rbac - 企業レベル権限テスト  
 * owner, secretariat, または company_admin ロールが必要
 */
export const PUT = withCompanyAuth()(async (request: NextRequest) => {
  const user = getRequestUser(request);
  
  return AuthorizedResponse.success({
    message: 'Company-level authentication successful',
    companyUser: user?.name,
    role: user?.role,
    permissions: ['notice_management', 'member_management', 'event_creation'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/test-rbac - 特定ロール権限テスト
 * secretariat または company_admin ロールが必要
 */
export const PATCH = withRoleAuth(['secretariat', 'company_admin'])(async (request: NextRequest) => {
  const user = getRequestUser(request);
  
  return AuthorizedResponse.success({
    message: 'Role-specific authentication successful',
    authorizedUser: user?.name,
    role: user?.role,
    allowedRoles: ['secretariat', 'company_admin'],
    permissions: ['content_moderation', 'user_support'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/test-rbac - リソース権限テスト
 * 'user' リソースへの 'delete' アクションが必要
 */
export const DELETE = withResourceAuth('user', 'delete')(async (request: NextRequest) => {
  const user = getRequestUser(request);
  
  return AuthorizedResponse.success({
    message: 'Resource-specific authentication successful',
    authorizedUser: user?.name,
    role: user?.role,
    resource: 'user',
    action: 'delete',
    description: 'User deletion privileges confirmed',
    timestamp: new Date().toISOString(),
  });
});

/*
テスト手順：

1. 基本認証テスト（全ロール）:
curl -X GET http://localhost:3000/api/test-rbac \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

2. 管理者権限テスト（owner, secretariat）:
curl -X POST http://localhost:3000/api/test-rbac \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

3. 企業レベル権限テスト（owner, secretariat, company_admin）:
curl -X PUT http://localhost:3000/api/test-rbac \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

4. 特定ロール権限テスト（secretariat, company_admin）:
curl -X PATCH http://localhost:3000/api/test-rbac \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

5. リソース権限テスト（user削除権限）:
curl -X DELETE http://localhost:3000/api/test-rbac \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

期待される結果：
- owner: 全てのテストが成功
- secretariat: 全てのテストが成功  
- company_admin: GET, PUT, PATCH が成功、POST, DELETE は失敗
- student: GET のみ成功、他は失敗
*/