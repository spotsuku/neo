'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

interface PermissionGuardProps {
  permissions: string[];
  fallbackPermissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showFallback?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  fallbackPermissions = [],
  fallback,
  children,
  showFallback = true
}) => {
  const { user, loading, hasAnyPermission } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">権限を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showFallback ? (
      <UnauthorizedFallback 
        title="認証が必要です" 
        message="このページにアクセスするにはログインが必要です。"
        showLoginButton={true}
      />
    ) : null;
  }

  const hasRequiredPermission = hasAnyPermission(permissions);
  const hasFallbackPermission = fallbackPermissions.length > 0 && hasAnyPermission(fallbackPermissions);

  if (hasRequiredPermission) {
    return <>{children}</>;
  }

  if (hasFallbackPermission) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              制限付きアクセス: 一部の機能が制限されています。
            </p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return showFallback ? (
    <UnauthorizedFallback 
      title="アクセス権限がありません" 
      message="このページにアクセスする権限がありません。"
      requiredPermissions={permissions}
    />
  ) : null;
};

// 役割ベースのガード
interface RoleGuardProps {
  roles: string[];
  fallbackRoles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showFallback?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  fallbackRoles = [],
  fallback,
  children,
  showFallback = true
}) => {
  const { user, loading, hasRole } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">権限を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showFallback ? (
      <UnauthorizedFallback 
        title="認証が必要です" 
        message="このページにアクセスするにはログインが必要です。"
        showLoginButton={true}
      />
    ) : null;
  }

  const hasRequiredRole = roles.some(role => hasRole(role));
  const hasFallbackRole = fallbackRoles.length > 0 && fallbackRoles.some(role => hasRole(role));

  if (hasRequiredRole) {
    return <>{children}</>;
  }

  if (hasFallbackRole) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              制限付きアクセス: 一部の機能が制限されています。
            </p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return showFallback ? (
    <UnauthorizedFallback 
      title="アクセス権限がありません" 
      message="この機能にアクセスする役割が割り当てられていません。"
      requiredRoles={roles}
    />
  ) : null;
};

// レベルベースのガード
interface LevelGuardProps {
  minimumLevel: number;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showFallback?: boolean;
}

export const LevelGuard: React.FC<LevelGuardProps> = ({
  minimumLevel,
  fallback,
  children,
  showFallback = true
}) => {
  const { user, loading, hasMinimumRoleLevel, roleLevel } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">権限を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showFallback ? (
      <UnauthorizedFallback 
        title="認証が必要です" 
        message="このページにアクセスするにはログインが必要です。"
        showLoginButton={true}
      />
    ) : null;
  }

  if (hasMinimumRoleLevel(minimumLevel)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return showFallback ? (
    <UnauthorizedFallback 
      title="アクセスレベル不足" 
      message={`この機能にアクセスするには最低レベル${minimumLevel}が必要です。現在のレベル: ${roleLevel}`}
    />
  ) : null;
};

// 未認証・権限不足時の表示コンポーネント
interface UnauthorizedFallbackProps {
  title: string;
  message: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  showLoginButton?: boolean;
}

const UnauthorizedFallback: React.FC<UnauthorizedFallbackProps> = ({
  title,
  message,
  requiredPermissions,
  requiredRoles,
  showLoginButton = false
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-600 mt-4">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{message}</p>
          
          {requiredPermissions && requiredPermissions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 mb-2">必要な権限:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {requiredPermissions.map((permission) => (
                  <span 
                    key={permission}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}

          {requiredRoles && requiredRoles.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 mb-2">必要な役割:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {requiredRoles.map((role) => (
                  <span 
                    key={role}
                    className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {showLoginButton ? (
              <Button asChild>
                <Link href="/login">ログイン</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ダッシュボードへ戻る
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                ホーム
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// 条件付き表示用の軽量コンポーネント
interface ConditionalRenderProps {
  permissions?: string[];
  roles?: string[];
  minimumLevel?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  permissions = [],
  roles = [],
  minimumLevel,
  children,
  fallback = null
}) => {
  const { hasAnyPermission, hasRole, hasMinimumRoleLevel } = usePermissions();

  let hasAccess = true;

  if (permissions.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(permissions);
  }

  if (roles.length > 0) {
    hasAccess = hasAccess && roles.some(role => hasRole(role));
  }

  if (minimumLevel !== undefined) {
    hasAccess = hasAccess && hasMinimumRoleLevel(minimumLevel);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;