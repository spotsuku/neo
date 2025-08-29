// NEO Digital Platform - RBAC Unit Tests
// RBAC権限システムのユニットテスト

import { 
  can, 
  canAny, 
  requireRole, 
  isAdmin, 
  isCompanyLevel,
  canAccessRegion,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  assertPermission,
  PermissionError,
  PERMISSION_MATRIX,
  type PermissionContext 
} from '@/lib/rbac';
import type { AuthUser } from '@/lib/auth-enhanced';

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
  id: 'owner-user-id',
  role: 'owner',
  accessible_regions: ['ALL'],
});

const secretariatUser = createTestUser({
  id: 'secretariat-user-id', 
  role: 'secretariat',
  accessible_regions: ['FUK', 'ISK'],
});

const companyAdminUser = createTestUser({
  id: 'company-admin-user-id',
  role: 'company_admin',
  accessible_regions: ['FUK'],
});

const studentUser = createTestUser({
  id: 'student-user-id',
  role: 'student',
  accessible_regions: ['FUK'],
});

describe('RBAC Permission System', () => {
  
  describe('基本権限チェック - can()', () => {
    
    test('owner は全てのリソースにアクセス可能', () => {
      const context: PermissionContext = {
        user: ownerUser,
        resource: 'user',
        action: 'delete',
      };
      
      expect(can(context)).toBe(true);
    });
    
    test('student は限定的なアクションのみ実行可能', () => {
      // 読み取り権限はある
      expect(can({
        user: studentUser,
        resource: 'announcement',
        action: 'read',
      })).toBe(true);
      
      // 作成権限はない
      expect(can({
        user: studentUser,
        resource: 'announcement', 
        action: 'create',
      })).toBe(false);
    });
    
    test('company_admin は通知の作成・配信が可能', () => {
      expect(can({
        user: companyAdminUser,
        resource: 'notice',
        action: 'create',
      })).toBe(true);
      
      expect(can({
        user: companyAdminUser,
        resource: 'notice',
        action: 'publish',
      })).toBe(true);
    });
    
    test('地域制限が正しく機能する', () => {
      // 自分の地域はアクセス可能
      expect(can({
        user: studentUser,
        resource: 'class',
        action: 'read',
        targetRegionId: 'FUK',
      })).toBe(true);
      
      // 他の地域はアクセス不可
      expect(can({
        user: studentUser,
        resource: 'class', 
        action: 'read',
        targetRegionId: 'ISK',
      })).toBe(false);
    });
    
    test('所有者制限が正しく機能する', () => {
      // 自分のリソースは編集可能
      expect(can({
        user: studentUser,
        resource: 'user',
        action: 'update',
        targetUserId: studentUser.id,
      })).toBe(true);
      
      // 他人のリソースは編集不可
      expect(can({
        user: studentUser,
        resource: 'user',
        action: 'update', 
        targetUserId: 'other-user-id',
      })).toBe(false);
    });
  });
  
  describe('ロール権限チェック', () => {
    
    test('canAny() - 複数ロールのいずれかをチェック', () => {
      expect(canAny(ownerUser, ['owner', 'secretariat'])).toBe(true);
      expect(canAny(studentUser, ['owner', 'secretariat'])).toBe(false);
      expect(canAny(companyAdminUser, ['company_admin', 'student'])).toBe(true);
    });
    
    test('requireRole() - 単一ロール要件チェック', () => {
      expect(requireRole(ownerUser, 'owner')).toBe(true);
      expect(requireRole(ownerUser, 'student')).toBe(false);
      
      // 配列での複数ロール指定
      expect(requireRole(secretariatUser, ['owner', 'secretariat'])).toBe(true);
      expect(requireRole(studentUser, ['owner', 'secretariat'])).toBe(false);
    });
    
    test('isAdmin() - 管理者権限チェック', () => {
      expect(isAdmin(ownerUser)).toBe(true);
      expect(isAdmin(secretariatUser)).toBe(true);
      expect(isAdmin(companyAdminUser)).toBe(false);
      expect(isAdmin(studentUser)).toBe(false);
    });
    
    test('isCompanyLevel() - 企業レベル権限チェック', () => {
      expect(isCompanyLevel(ownerUser)).toBe(true);
      expect(isCompanyLevel(secretariatUser)).toBe(true);
      expect(isCompanyLevel(companyAdminUser)).toBe(true);
      expect(isCompanyLevel(studentUser)).toBe(false);
    });
  });
  
  describe('地域アクセス権限', () => {
    
    test('canAccessRegion() - 地域アクセス権限チェック', () => {
      // ALL権限を持つユーザーは全地域アクセス可能
      expect(canAccessRegion(ownerUser, 'FUK')).toBe(true);
      expect(canAccessRegion(ownerUser, 'ISK')).toBe(true);
      expect(canAccessRegion(ownerUser, 'NIG')).toBe(true);
      
      // 限定地域ユーザーは指定地域のみアクセス可能
      expect(canAccessRegion(studentUser, 'FUK')).toBe(true);
      expect(canAccessRegion(studentUser, 'ISK')).toBe(false);
      
      // 複数地域アクセス権限
      expect(canAccessRegion(secretariatUser, 'FUK')).toBe(true);
      expect(canAccessRegion(secretariatUser, 'ISK')).toBe(true);
      expect(canAccessRegion(secretariatUser, 'NIG')).toBe(false);
    });
  });
  
  describe('リソース別権限ヘルパー', () => {
    
    test('canCreate() - 作成権限チェック', () => {
      expect(canCreate(ownerUser, 'announcement')).toBe(true);
      expect(canCreate(studentUser, 'announcement')).toBe(false);
      expect(canCreate(companyAdminUser, 'notice')).toBe(true);
    });
    
    test('canRead() - 読み取り権限チェック', () => {
      expect(canRead(studentUser, 'class')).toBe(true);
      expect(canRead(studentUser, 'audit')).toBe(false); // 監査ログは管理者のみ
    });
    
    test('canUpdate() - 更新権限チェック', () => {
      expect(canUpdate(ownerUser, 'user')).toBe(true);
      expect(canUpdate(studentUser, 'user', undefined, studentUser.id)).toBe(true); // 自分のプロフィール
      expect(canUpdate(studentUser, 'user', undefined, 'other-user')).toBe(false); // 他人のプロフィール
    });
    
    test('canDelete() - 削除権限チェック', () => {
      expect(canDelete(ownerUser, 'user')).toBe(true);
      expect(canDelete(secretariatUser, 'announcement')).toBe(true); // secretariat は削除可能
      expect(canDelete(studentUser, 'announcement')).toBe(false); // student は削除不可
      expect(canDelete(studentUser, 'file', undefined, studentUser.id)).toBe(false); // ファイル削除は管理者のみ
    });
  });
  
  describe('権限エラーハンドリング', () => {
    
    test('assertPermission() - 権限不足時にエラーを投げる', () => {
      const context: PermissionContext = {
        user: studentUser,
        resource: 'user',
        action: 'delete',
      };
      
      expect(() => assertPermission(context)).toThrow(PermissionError);
      
      try {
        assertPermission(context);
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        expect(error.message).toContain('cannot delete user');
        expect((error as PermissionError).context).toEqual(context);
      }
    });
    
    test('assertPermission() - 権限がある場合はエラーを投げない', () => {
      const context: PermissionContext = {
        user: ownerUser,
        resource: 'user',
        action: 'delete',
      };
      
      expect(() => assertPermission(context)).not.toThrow();
    });
  });
  
  describe('権限マトリックス検証', () => {
    
    test('PERMISSION_MATRIX が正しく定義されている', () => {
      expect(PERMISSION_MATRIX).toBeDefined();
      expect(Array.isArray(PERMISSION_MATRIX)).toBe(true);
      expect(PERMISSION_MATRIX.length).toBeGreaterThan(0);
      
      // 各権限設定が必要なプロパティを持つことを確認
      PERMISSION_MATRIX.forEach(permission => {
        expect(permission.resource).toBeDefined();
        expect(permission.actions).toBeDefined();
        expect(typeof permission.actions).toBe('object');
      });
    });
    
    test('主要リソースの権限設定が存在する', () => {
      const resourceTypes = [
        'user', 'company', 'member', 'announcement', 'notice',
        'class', 'project', 'committee', 'event', 'attendance'
      ];
      
      resourceTypes.forEach(resourceType => {
        const permission = PERMISSION_MATRIX.find(p => p.resource === resourceType);
        expect(permission).toBeDefined();
      });
    });
  });
  
  describe('エッジケーステスト', () => {
    
    test('存在しないリソースタイプの場合は権限なし', () => {
      const context: PermissionContext = {
        user: ownerUser,
        resource: 'non-existent-resource' as any,
        action: 'read',
      };
      
      expect(can(context)).toBe(false);
    });
    
    test('ALL地域権限を持つユーザーは任意の地域にアクセス可能', () => {
      const allRegionUser = createTestUser({
        role: 'owner',
        accessible_regions: ['ALL'],
      });
      
      expect(canAccessRegion(allRegionUser, 'FUK')).toBe(true);
      expect(canAccessRegion(allRegionUser, 'ISK')).toBe(true);
      expect(canAccessRegion(allRegionUser, 'NIG')).toBe(true);
    });
    
    test('未定義のアクションは権限なし', () => {
      const context: PermissionContext = {
        user: ownerUser,
        resource: 'user',
        action: 'undefined-action' as any,
      };
      
      expect(can(context)).toBe(false);
    });
  });
});

// パフォーマンステスト
describe('RBAC Performance Tests', () => {
  
  test('権限チェックは高速に実行される', () => {
    const context: PermissionContext = {
      user: ownerUser,
      resource: 'user',
      action: 'read',
    };
    
    const startTime = performance.now();
    
    // 1000回の権限チェック
    for (let i = 0; i < 1000; i++) {
      can(context);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 1000回で100ms以内に完了することを期待
    expect(duration).toBeLessThan(100);
  });
});