// NEO Digital Platform - RBAC Components Unit Tests
// RBACコンポーネントのユニットテスト

import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  RBACProvider,
  useRBAC,
  IfCan,
  IfRole,
  IfAdmin,
  IfCompanyLevel,
  IfRegion,
  IfAuthenticated,
  IfGuest,
  IfPermission,
  RBACDebugInfo
} from '@/components/auth/rbac-components';
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

// テスト用コンポーネント
const TestComponent = ({ children }: { children?: React.ReactNode }) => {
  const rbac = useRBAC();
  return (
    <div data-testid="test-component">
      <div data-testid="user-id">{rbac.user?.id}</div>
      <div data-testid="user-role">{rbac.user?.role}</div>
      <div data-testid="is-loading">{rbac.isLoading.toString()}</div>
      <div data-testid="is-admin">{rbac.isAdmin().toString()}</div>
      {children}
    </div>
  );
};

const renderWithRBAC = (
  component: React.ReactElement, 
  user: AuthUser | null = null,
  isLoading = false
) => {
  return render(
    <RBACProvider user={user} isLoading={isLoading}>
      {component}
    </RBACProvider>
  );
};

describe('RBACProvider', () => {
  
  test('ユーザー情報を正しく提供する', () => {
    renderWithRBAC(<TestComponent />, ownerUser);
    
    expect(screen.getByTestId('user-id')).toHaveTextContent(ownerUser.id);
    expect(screen.getByTestId('user-role')).toHaveTextContent(ownerUser.role);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
  });
  
  test('ローディング状態を正しく表示する', () => {
    renderWithRBAC(<TestComponent />, null, true);
    
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
  
  test('ユーザーなしの状態を正しく処理する', () => {
    renderWithRBAC(<TestComponent />, null);
    
    expect(screen.getByTestId('user-id')).toHaveTextContent('');
    expect(screen.getByTestId('user-role')).toHaveTextContent('');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });
});

describe('useRBAC フック', () => {
  
  test('RBACProvider外で使用するとエラーを投げる', () => {
    // エラーログを一時的に無効化
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useRBAC must be used within RBACProvider');
    
    consoleSpy.mockRestore();
  });
  
  test('権限チェック関数が正しく動作する', () => {
    const TestPermissions = () => {
      const rbac = useRBAC();
      return (
        <div>
          <div data-testid="can-create-user">
            {rbac.can('user', 'create').toString()}
          </div>
          <div data-testid="has-owner-role">
            {rbac.hasRole('owner').toString()}
          </div>
          <div data-testid="has-any-admin-role">
            {rbac.hasAnyRole(['owner', 'secretariat']).toString()}
          </div>
          <div data-testid="can-access-fuk">
            {rbac.canAccessRegion('FUK').toString()}
          </div>
        </div>
      );
    };
    
    renderWithRBAC(<TestPermissions />, ownerUser);
    
    expect(screen.getByTestId('can-create-user')).toHaveTextContent('true');
    expect(screen.getByTestId('has-owner-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-any-admin-role')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-fuk')).toHaveTextContent('true');
  });
});

describe('IfCan コンポーネント', () => {
  
  test('権限がある場合に子要素を表示する', () => {
    renderWithRBAC(
      <IfCan resource="user" action="create">
        <div data-testid="create-button">Create User</div>
      </IfCan>,
      ownerUser
    );
    
    expect(screen.getByTestId('create-button')).toBeInTheDocument();
  });
  
  test('権限がない場合に子要素を表示しない', () => {
    renderWithRBAC(
      <IfCan resource="user" action="delete">
        <div data-testid="delete-button">Delete User</div>
      </IfCan>,
      studentUser
    );
    
    expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
  });
  
  test('権限がない場合にフォールバックを表示する', () => {
    renderWithRBAC(
      <IfCan 
        resource="user" 
        action="delete"
        fallback={<div data-testid="no-permission">権限がありません</div>}
      >
        <div data-testid="delete-button">Delete User</div>
      </IfCan>,
      studentUser
    );
    
    expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('no-permission')).toBeInTheDocument();
  });
  
  test('ローディング中にローディング表示する', () => {
    renderWithRBAC(
      <IfCan 
        resource="user" 
        action="create"
        loading={<div data-testid="loading">Loading...</div>}
      >
        <div data-testid="create-button">Create User</div>
      </IfCan>,
      null,
      true
    );
    
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('create-button')).not.toBeInTheDocument();
  });
});

describe('IfRole コンポーネント', () => {
  
  test('単一ロールチェックが正常に動作する', () => {
    renderWithRBAC(
      <IfRole roles="owner">
        <div data-testid="owner-content">Owner Content</div>
      </IfRole>,
      ownerUser
    );
    
    expect(screen.getByTestId('owner-content')).toBeInTheDocument();
  });
  
  test('複数ロールチェック（いずれかあり）が正常に動作する', () => {
    renderWithRBAC(
      <IfRole roles={['owner', 'secretariat']}>
        <div data-testid="admin-content">Admin Content</div>
      </IfRole>,
      secretariatUser
    );
    
    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });
  
  test('複数ロールチェック（全て必要）が正常に動作する', () => {
    renderWithRBAC(
      <IfRole roles={['owner', 'secretariat']} requireAll>
        <div data-testid="strict-content">Strict Content</div>
      </IfRole>,
      secretariatUser
    );
    
    expect(screen.queryByTestId('strict-content')).not.toBeInTheDocument();
  });
  
  test('ロールが一致しない場合は表示しない', () => {
    renderWithRBAC(
      <IfRole roles="owner">
        <div data-testid="owner-content">Owner Content</div>
      </IfRole>,
      studentUser
    );
    
    expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument();
  });
});

describe('IfAdmin コンポーネント', () => {
  
  test('owner ユーザーに管理者コンテンツを表示する', () => {
    renderWithRBAC(
      <IfAdmin>
        <div data-testid="admin-panel">Admin Panel</div>
      </IfAdmin>,
      ownerUser
    );
    
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
  });
  
  test('secretariat ユーザーに管理者コンテンツを表示する', () => {
    renderWithRBAC(
      <IfAdmin>
        <div data-testid="admin-panel">Admin Panel</div>
      </IfAdmin>,
      secretariatUser
    );
    
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
  });
  
  test('非管理者ユーザーには表示しない', () => {
    renderWithRBAC(
      <IfAdmin>
        <div data-testid="admin-panel">Admin Panel</div>
      </IfAdmin>,
      studentUser
    );
    
    expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
  });
});

describe('IfCompanyLevel コンポーネント', () => {
  
  test('company_admin ユーザーに企業コンテンツを表示する', () => {
    renderWithRBAC(
      <IfCompanyLevel>
        <div data-testid="company-panel">Company Panel</div>
      </IfCompanyLevel>,
      companyAdminUser
    );
    
    expect(screen.getByTestId('company-panel')).toBeInTheDocument();
  });
  
  test('管理者ユーザーに企業コンテンツを表示する', () => {
    renderWithRBAC(
      <IfCompanyLevel>
        <div data-testid="company-panel">Company Panel</div>
      </IfCompanyLevel>,
      ownerUser
    );
    
    expect(screen.getByTestId('company-panel')).toBeInTheDocument();
  });
  
  test('student ユーザーには表示しない', () => {
    renderWithRBAC(
      <IfCompanyLevel>
        <div data-testid="company-panel">Company Panel</div>
      </IfCompanyLevel>,
      studentUser
    );
    
    expect(screen.queryByTestId('company-panel')).not.toBeInTheDocument();
  });
});

describe('IfRegion コンポーネント', () => {
  
  test('アクセス可能な地域のコンテンツを表示する', () => {
    renderWithRBAC(
      <IfRegion regionId="FUK">
        <div data-testid="fukuoka-content">Fukuoka Content</div>
      </IfRegion>,
      studentUser
    );
    
    expect(screen.getByTestId('fukuoka-content')).toBeInTheDocument();
  });
  
  test('アクセス不可能な地域のコンテンツは表示しない', () => {
    renderWithRBAC(
      <IfRegion regionId="ISK">
        <div data-testid="ishikawa-content">Ishikawa Content</div>
      </IfRegion>,
      studentUser
    );
    
    expect(screen.queryByTestId('ishikawa-content')).not.toBeInTheDocument();
  });
  
  test('ALL権限ユーザーは全地域のコンテンツを表示できる', () => {
    renderWithRBAC(
      <IfRegion regionId="NIG">
        <div data-testid="niigata-content">Niigata Content</div>
      </IfRegion>,
      ownerUser
    );
    
    expect(screen.getByTestId('niigata-content')).toBeInTheDocument();
  });
});

describe('IfAuthenticated コンポーネント', () => {
  
  test('認証済みユーザーにコンテンツを表示する', () => {
    renderWithRBAC(
      <IfAuthenticated>
        <div data-testid="auth-content">Authenticated Content</div>
      </IfAuthenticated>,
      ownerUser
    );
    
    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
  });
  
  test('未認証ユーザーにはコンテンツを表示しない', () => {
    renderWithRBAC(
      <IfAuthenticated>
        <div data-testid="auth-content">Authenticated Content</div>
      </IfAuthenticated>,
      null
    );
    
    expect(screen.queryByTestId('auth-content')).not.toBeInTheDocument();
  });
  
  test('requireAuth=false で未認証ユーザーにコンテンツを表示する', () => {
    renderWithRBAC(
      <IfAuthenticated requireAuth={false}>
        <div data-testid="guest-content">Guest Content</div>
      </IfAuthenticated>,
      null
    );
    
    expect(screen.getByTestId('guest-content')).toBeInTheDocument();
  });
});

describe('IfGuest コンポーネント', () => {
  
  test('未認証ユーザーにコンテンツを表示する', () => {
    renderWithRBAC(
      <IfGuest>
        <div data-testid="guest-content">Guest Only Content</div>
      </IfGuest>,
      null
    );
    
    expect(screen.getByTestId('guest-content')).toBeInTheDocument();
  });
  
  test('認証済みユーザーにはコンテンツを表示しない', () => {
    renderWithRBAC(
      <IfGuest>
        <div data-testid="guest-content">Guest Only Content</div>
      </IfGuest>,
      ownerUser
    );
    
    expect(screen.queryByTestId('guest-content')).not.toBeInTheDocument();
  });
});

describe('IfPermission コンポーネント', () => {
  
  test('複合権限チェック（AND）が正常に動作する', () => {
    renderWithRBAC(
      <IfPermission
        conditions={{
          roles: ['owner'],
          adminRequired: true,
          regions: ['FUK'],
        }}
        operator="AND"
      >
        <div data-testid="complex-content">Complex Permission Content</div>
      </IfPermission>,
      ownerUser
    );
    
    expect(screen.getByTestId('complex-content')).toBeInTheDocument();
  });
  
  test('複合権限チェック（OR）が正常に動作する', () => {
    renderWithRBAC(
      <IfPermission
        conditions={{
          roles: ['student'],
          adminRequired: true, // これは満たさないが、OR条件なので表示される
        }}
        operator="OR"
      >
        <div data-testid="or-content">OR Permission Content</div>
      </IfPermission>,
      studentUser
    );
    
    expect(screen.getByTestId('or-content')).toBeInTheDocument();
  });
  
  test('複合権限チェックでリソース権限も含む', () => {
    renderWithRBAC(
      <IfPermission
        conditions={{
          roles: ['owner'],
          resources: [
            { resource: 'user', action: 'create' },
            { resource: 'company', action: 'manage' }
          ],
        }}
        operator="AND"
      >
        <div data-testid="resource-content">Resource Permission Content</div>
      </IfPermission>,
      ownerUser
    );
    
    expect(screen.getByTestId('resource-content')).toBeInTheDocument();
  });
});

describe('RBACDebugInfo コンポーネント', () => {
  
  const originalNodeEnv = process.env.NODE_ENV;
  
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  test('開発環境でデバッグ情報を表示する', () => {
    process.env.NODE_ENV = 'development';
    
    renderWithRBAC(<RBACDebugInfo />, ownerUser);
    
    expect(screen.getByText(/RBAC Debug Info/)).toBeInTheDocument();
    expect(screen.getByText(/User: Test User/)).toBeInTheDocument();
    expect(screen.getByText(/Role: owner/)).toBeInTheDocument();
  });
  
  test('本番環境ではデバッグ情報を表示しない', () => {
    process.env.NODE_ENV = 'production';
    
    renderWithRBAC(<RBACDebugInfo />, ownerUser);
    
    expect(screen.queryByText(/RBAC Debug Info/)).not.toBeInTheDocument();
  });
  
  test('ユーザーがいない場合はデバッグ情報を表示しない', () => {
    process.env.NODE_ENV = 'development';
    
    renderWithRBAC(<RBACDebugInfo />, null);
    
    expect(screen.queryByText(/RBAC Debug Info/)).not.toBeInTheDocument();
  });
});

describe('統合テスト', () => {
  
  test('複数のRBACコンポーネントが組み合わせて動作する', () => {
    const ComplexUI = () => (
      <div>
        <IfAdmin>
          <div data-testid="admin-section">
            <h2>管理者セクション</h2>
            <IfCan resource="user" action="create">
              <button data-testid="create-user-btn">ユーザー作成</button>
            </IfCan>
            <IfCan resource="user" action="delete">
              <button data-testid="delete-user-btn">ユーザー削除</button>
            </IfCan>
          </div>
        </IfAdmin>
        
        <IfCompanyLevel>
          <div data-testid="company-section">
            <h2>企業セクション</h2>
            <IfCan resource="notice" action="create">
              <button data-testid="create-notice-btn">通知作成</button>
            </IfCan>
          </div>
        </IfCompanyLevel>
        
        <IfRole roles={['student']}>
          <div data-testid="student-section">
            <h2>学生セクション</h2>
            <IfCan resource="attendance" action="create">
              <button data-testid="mark-attendance-btn">出席登録</button>
            </IfCan>
          </div>
        </IfRole>
      </div>
    );
    
    renderWithRBAC(<ComplexUI />, ownerUser);
    
    // owner は管理者なので管理者セクションが表示される
    expect(screen.getByTestId('admin-section')).toBeInTheDocument();
    expect(screen.getByTestId('create-user-btn')).toBeInTheDocument();
    expect(screen.getByTestId('delete-user-btn')).toBeInTheDocument();
    
    // owner は企業レベルなので企業セクションも表示される
    expect(screen.getByTestId('company-section')).toBeInTheDocument();
    expect(screen.getByTestId('create-notice-btn')).toBeInTheDocument();
    
    // owner は学生ではないので学生セクションは表示されない
    expect(screen.queryByTestId('student-section')).not.toBeInTheDocument();
  });
});