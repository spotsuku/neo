// NEO Digital Platform - 認証テストAPI
// GET /api/test-auth - RBAC動作確認用

import { NextRequest } from 'next/server';
import { withAuth, withAdminAuth, withCompanyAdminAuth } from '@/lib/middleware';
import { hasResourcePermission, ResourceType, PermissionLevel } from '@/lib/permissions';
import { createAuthenticatedResponse } from '@/lib/session';

// 一般認証テスト
export const GET = withAuth(async (request) => {
  const user = request.user!;
  
  // 権限テスト結果
  const permissions = {
    canReadUsers: hasResourcePermission(user, ResourceType.USER, PermissionLevel.READ),
    canWriteAnnouncements: hasResourcePermission(user, ResourceType.ANNOUNCEMENT, PermissionLevel.WRITE),
    canDeleteProjects: hasResourcePermission(user, ResourceType.PROJECT, PermissionLevel.DELETE),
    canAdminMembers: hasResourcePermission(user, ResourceType.MEMBER, PermissionLevel.ADMIN)
  };
  
  return createAuthenticatedResponse({
    message: '認証テスト成功',
    permissions,
    accessibleRegions: user.accessible_regions,
    timestamp: new Date().toISOString()
  }, user);
});

// 管理者限定テスト
export const POST = withAdminAuth(async (request) => {
  const user = request.user!;
  
  return createAuthenticatedResponse({
    message: '管理者認証テスト成功',
    adminLevel: user.role === 'owner' ? 'システムオーナー' : '事務局管理者',
    timestamp: new Date().toISOString()
  }, user);
});

// 企業管理者以上テスト
export const PUT = withCompanyAdminAuth(async (request) => {
  const user = request.user!;
  
  return createAuthenticatedResponse({
    message: '企業管理者以上認証テスト成功',
    level: user.role,
    timestamp: new Date().toISOString()
  }, user);
});