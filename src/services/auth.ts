import type { User, UserRole } from '../types';

export class AuthService {
  // 簡単なJWTデコード（本番環境では適切なライブラリを使用）
  static decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  // ユーザー情報を取得（実際にはJWTトークンから取得）
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return null;

      return {
        id: decoded.userId || '',
        name: decoded.name || '',
        email: decoded.email || '',
        role: decoded.role || 'academia_student',
        companyId: decoded.companyId,
        memberId: decoded.memberId
      };
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }

  // デモ用ユーザー作成（実際には認証システムと連携）
  static createDemoUser(role: UserRole, options?: { companyId?: string; memberId?: string }): User {
    const baseUser = {
      id: `demo-${role}-${Date.now()}`,
      email: `demo-${role}@neo-fukuoka.com`,
      role
    };

    switch (role) {
      case 'company_admin':
        return {
          ...baseUser,
          name: '企業管理者',
          companyId: options?.companyId || 'company-001'
        };
      case 'academia_student':
        return {
          ...baseUser,
          name: 'アカデミア生',
          memberId: options?.memberId || 'member-001'
        };
      case 'staff':
        return {
          ...baseUser,
          name: '事務局スタッフ'
        };
      case 'owner':
        return {
          ...baseUser,
          name: 'オーナー'
        };
      default:
        return {
          ...baseUser,
          name: 'ゲストユーザー',
          role: 'academia_student'
        };
    }
  }

  // ロール別データアクセス権限チェック
  static canAccessCompanyData(user: User, targetCompanyId: string): boolean {
    switch (user.role) {
      case 'owner':
      case 'staff':
        return true;
      case 'company_admin':
        return user.companyId === targetCompanyId;
      case 'academia_student':
        return false; // アカデミア生は企業データにアクセス不可
      default:
        return false;
    }
  }

  // ロール別メンバーデータアクセス権限チェック
  static canAccessMemberData(user: User, targetMemberId: string): boolean {
    switch (user.role) {
      case 'owner':
      case 'staff':
        return true;
      case 'company_admin':
        // 自社のメンバーのみアクセス可能
        return true; // 実際にはメンバーの所属企業をチェック
      case 'academia_student':
        return user.memberId === targetMemberId;
      default:
        return false;
    }
  }

  // 統計データのみ表示許可チェック
  static shouldShowStatisticsOnly(user: User, targetCompanyId?: string): boolean {
    if (user.role === 'owner' || user.role === 'staff') {
      return false; // 全データ表示可能
    }
    
    if (user.role === 'company_admin' && targetCompanyId) {
      return user.companyId !== targetCompanyId; // 他社データは統計のみ
    }
    
    return true; // その他は統計のみ
  }

  // データマスキング（統計値のみ表示）
  static maskSensitiveData<T extends Record<string, any>>(
    data: T[], 
    user: User, 
    companyId?: string
  ): Partial<T>[] {
    if (!this.shouldShowStatisticsOnly(user, companyId)) {
      return data; // フルデータ表示
    }

    // 統計値のみ返却（個別データは除外）
    return [];
  }

  // 集計データを生成
  static generateAggregatedData<T extends Record<string, any>>(
    data: T[], 
    aggregateFields: string[]
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    aggregateFields.forEach(field => {
      const values = data
        .map(item => item[field])
        .filter(val => typeof val === 'number' && !isNaN(val));
      
      if (values.length > 0) {
        result[`${field}_avg`] = Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100;
        result[`${field}_min`] = Math.min(...values);
        result[`${field}_max`] = Math.max(...values);
        result[`${field}_count`] = values.length;
      }
    });
    
    return result;
  }
}