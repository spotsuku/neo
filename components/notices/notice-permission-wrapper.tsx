/**
 * お知らせ権限ラッパー - NEO Portal
 * 役割別表示制御・権限チェック
 */
'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import type { Notice, NoticePermissions } from '@/types/notices'

interface NoticePermissionWrapperProps {
  children: (permissions: NoticePermissions) => ReactNode
  notice?: Notice
}

export function NoticePermissionWrapper({ children, notice }: NoticePermissionWrapperProps) {
  const { user, isAuthenticated } = useAuth()

  // 権限計算
  const getPermissions = (): NoticePermissions => {
    // 未認証の場合
    if (!isAuthenticated || !user) {
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canViewUnpublished: false
      }
    }

    const userRole = user.role

    // Owner（オーナー）は全権限
    if (userRole === 'owner') {
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canPublish: true,
        canViewUnpublished: true
      }
    }

    // Secretariat（事務局）の権限
    if (userRole === 'secretariat') {
      return {
        canCreate: true,
        canEdit: true,
        canDelete: notice ? (notice.author_id === user.id || notice.author_role === 'secretariat') : true,
        canPublish: true,
        canViewUnpublished: true
      }
    }

    // Company Admin（企業管理者）の権限
    if (userRole === 'company_admin') {
      return {
        canCreate: false, // お知らせ作成は不可
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canViewUnpublished: false // 公開されたもののみ閲覧可能
      }
    }

    // Student（学生）の権限
    if (userRole === 'student') {
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canViewUnpublished: false // 公開されたもののみ閲覧可能
      }
    }

    // デフォルト（権限なし）
    return {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canViewUnpublished: false
    }
  }

  const permissions = getPermissions()

  return <>{children(permissions)}</>
}

// 権限チェックフック
export function useNoticePermissions(notice?: Notice): NoticePermissions {
  const { user, isAuthenticated } = useAuth()

  // 未認証の場合
  if (!isAuthenticated || !user) {
    return {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canViewUnpublished: false
    }
  }

  const userRole = user.role

  // Owner（オーナー）は全権限
  if (userRole === 'owner') {
    return {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true,
      canViewUnpublished: true
    }
  }

  // Secretariat（事務局）の権限
  if (userRole === 'secretariat') {
    return {
      canCreate: true,
      canEdit: true,
      canDelete: notice ? (notice.author_id === user.id || notice.author_role === 'secretariat') : true,
      canPublish: true,
      canViewUnpublished: true
    }
  }

  // Company Admin（企業管理者）の権限
  if (userRole === 'company_admin') {
    return {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canViewUnpublished: false
    }
  }

  // Student（学生）の権限
  if (userRole === 'student') {
    return {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canViewUnpublished: false
    }
  }

  // デフォルト（権限なし）
  return {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canPublish: false,
    canViewUnpublished: false
  }
}

// 条件付きレンダリングコンポーネント
interface IfCanProps {
  action: keyof NoticePermissions
  notice?: Notice
  children: ReactNode
  fallback?: ReactNode
}

export function IfCan({ action, notice, children, fallback = null }: IfCanProps) {
  const permissions = useNoticePermissions(notice)
  
  return permissions[action] ? <>{children}</> : <>{fallback}</>
}

// 役割チェックコンポーネント
interface IfRoleProps {
  roles: ('owner' | 'secretariat' | 'company_admin' | 'student')[]
  children: ReactNode
  fallback?: ReactNode
}

export function IfRole({ roles, children, fallback = null }: IfRoleProps) {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated || !user) {
    return <>{fallback}</>
  }
  
  return roles.includes(user.role) ? <>{children}</> : <>{fallback}</>
}