import type { User, UserRole, RegionId } from '../types';

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
        role: decoded.role || 'student',
        regionId: decoded.regionId || 'FUK',
        accessibleRegions: decoded.accessibleRegions || [decoded.regionId || 'FUK'],
        companyId: decoded.companyId,
        memberId: decoded.memberId,
        profileImage: decoded.profileImage,
        joinDate: decoded.joinDate
      };
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }

  // デモ用ユーザー作成（実際には認証システムと連携）
  static createDemoUser(
    role: UserRole, 
    regionId: RegionId = 'FUK',
    options?: { companyId?: string; memberId?: string }
  ): User {
    const baseUser = {
      id: `demo-${role}-${regionId}-${Date.now()}`,
      email: `demo-${role}@neo-${regionId.toLowerCase()}.com`,
      role,
      regionId,
      joinDate: '2024-01-01'
    };

    switch (role) {
      case 'company_admin':
        return {
          ...baseUser,
          name: '企業管理者（デモ）',
          accessibleRegions: [regionId], // 企業管理者は自地域のみ
          companyId: options?.companyId || `company-${regionId}-001`,
          profileImage: 'https://via.placeholder.com/100x100?text=企業'
        };
      case 'student':
        return {
          ...baseUser,
          name: 'アカデミア生（デモ）',
          accessibleRegions: [regionId], // 学生は自地域のみ
          memberId: options?.memberId || `member-${regionId}-001`,
          companyId: options?.companyId || `company-${regionId}-001`,
          profileImage: 'https://via.placeholder.com/100x100?text=学生'
        };
      case 'secretariat':
        return {
          ...baseUser,
          name: '事務局スタッフ（デモ）',
          accessibleRegions: ['FUK', 'ISK', 'NIG'], // 事務局は全地域アクセス可能
          profileImage: 'https://via.placeholder.com/100x100?text=事務'
        };
      case 'owner':
        return {
          ...baseUser,
          name: 'オーナー（デモ）',
          accessibleRegions: ['FUK', 'ISK', 'NIG', 'ALL'], // オーナーは全地域+横断比較可能
          profileImage: 'https://via.placeholder.com/100x100?text=Owner'
        };
      default:
        return {
          ...baseUser,
          name: 'ゲストユーザー',
          role: 'student',
          accessibleRegions: [regionId]
        };
    }
  }

  // 地域アクセス権限チェック
  static canAccessRegion(user: User, targetRegionId: RegionId): boolean {
    return user.accessibleRegions.includes(targetRegionId) || user.accessibleRegions.includes('ALL');
  }

  // 横断比較データアクセス権限チェック
  static canAccessCrossRegionData(user: User): boolean {
    return user.role === 'owner' || user.role === 'secretariat';
  }

  // ロール別企業データアクセス権限チェック
  static canAccessCompanyData(user: User, targetCompanyId: string, targetRegionId: RegionId): boolean {
    // 地域アクセス権限チェック
    if (!this.canAccessRegion(user, targetRegionId)) {
      return false;
    }

    switch (user.role) {
      case 'owner':
      case 'secretariat':
        return true;
      case 'company_admin':
        // 自社かつ同一地域のデータのみアクセス可能
        return user.companyId === targetCompanyId && user.regionId === targetRegionId;
      case 'student':
        return false; // 学生は企業詳細データにアクセス不可
      default:
        return false;
    }
  }

  // ロール別メンバーデータアクセス権限チェック
  static canAccessMemberData(user: User, targetMemberId: string, targetRegionId: RegionId): boolean {
    // 地域アクセス権限チェック
    if (!this.canAccessRegion(user, targetRegionId)) {
      return false;
    }

    switch (user.role) {
      case 'owner':
      case 'secretariat':
        return true;
      case 'company_admin':
        // 自社メンバーかつ同一地域のみアクセス可能（実装では企業IDでフィルタ）
        return user.regionId === targetRegionId;
      case 'student':
        // 自分自身のデータのみアクセス可能
        return user.memberId === targetMemberId && user.regionId === targetRegionId;
      default:
        return false;
    }
  }

  // 非公開データアクセス権限チェック
  static canAccessPrivateData(user: User, dataType: string, targetId?: string): boolean {
    switch (dataType) {
      case 'company_cards':
        return user.role === 'owner' || user.role === 'secretariat';
      case 'member_cards':
        return user.role === 'owner' || user.role === 'secretariat';
      case 'surveys':
        return user.role === 'owner' || user.role === 'secretariat';
      case 'matching':
        if (user.role === 'owner' || user.role === 'secretariat') return true;
        // 企業管理者は自社の相談のみ閲覧可能
        return user.role === 'company_admin' && targetId === user.companyId;
      case 'hero_candidates':
        if (user.role === 'owner' || user.role === 'secretariat') return true;
        // 企業管理者は自社関連のヒーロー候補のみ閲覧可能
        return user.role === 'company_admin';
      default:
        return false;
    }
  }

  // 統計データのみ表示許可チェック
  static shouldShowStatisticsOnly(user: User, targetRegionId?: RegionId, targetCompanyId?: string): boolean {
    // owner/secretariatは詳細データ表示可能
    if (user.role === 'owner' || user.role === 'secretariat') {
      return false;
    }
    
    // 地域が異なる場合は統計のみ
    if (targetRegionId && user.regionId !== targetRegionId) {
      return true;
    }
    
    // 企業管理者の場合、自社以外は統計のみ
    if (user.role === 'company_admin' && targetCompanyId && user.companyId !== targetCompanyId) {
      return true;
    }
    
    return false;
  }

  // データマスキング（統計値のみ表示）
  static maskSensitiveData<T extends Record<string, any>>(
    data: T[], 
    user: User, 
    targetRegionId?: RegionId,
    companyId?: string
  ): Partial<T>[] {
    if (!this.shouldShowStatisticsOnly(user, targetRegionId, companyId)) {
      return data; // フルデータ表示
    }

    // 統計値のみ返却（個別データは除外）
    return [];
  }

  // 地域横断比較用の匿名化データ生成
  static generateAnonymizedCrossRegionData<T extends Record<string, any>>(
    data: Record<RegionId, T[]>,
    aggregateFields: string[]
  ): Record<RegionId, Record<string, number>> {
    const result: Record<RegionId, Record<string, number>> = {};
    
    Object.keys(data).forEach(regionId => {
      result[regionId as RegionId] = this.generateAggregatedData(data[regionId as RegionId], aggregateFields);
    });
    
    return result;
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
        result[`${field}_median`] = this.calculateMedian(values);
      }
    });
    
    result['total_count'] = data.length;
    return result;
  }

  // 中央値を計算
  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // メンバーのアンケート比較データを計算
  static calculateMemberSurveyComparisons(
    personalSurveys: any[],
    surveyAnalytics: any,
    userRole: UserRole
  ): any {
    if (personalSurveys.length === 0 || !surveyAnalytics) {
      return {
        memberPercentiles: {},
        regionAverages: {},
        overallAverages: {},
        growthTrends: {},
        lastCalculated: new Date().toISOString()
      };
    }

    const memberPercentiles: Record<string, number> = {};
    const growthTrends: Record<string, any> = {};

    // 最新のアンケート結果からパーセンタイル計算
    const latestSurvey = personalSurveys[0];
    if (latestSurvey && surveyAnalytics.regionStats) {
      Object.entries(latestSurvey.scores).forEach(([key, value]) => {
        const percentiles = surveyAnalytics.regionStats.percentileRanges[key];
        if (percentiles && typeof value === 'number') {
          memberPercentiles[key] = this.calculateMemberPercentile(value, percentiles);
        }
      });
    }

    // 成長トレンド計算（最初と最新の比較）
    if (personalSurveys.length >= 2) {
      const oldestSurvey = personalSurveys[personalSurveys.length - 1];
      Object.keys(latestSurvey.scores).forEach(key => {
        const initial = oldestSurvey.scores[key];
        const current = latestSurvey.scores[key];
        
        if (typeof initial === 'number' && typeof current === 'number') {
          const growth = current - initial;
          growthTrends[key] = {
            initial,
            current,
            growth,
            trend: growth > 0.5 ? 'improving' : growth < -0.5 ? 'declining' : 'stable'
          };
        }
      });
    }

    return {
      memberPercentiles,
      regionAverages: surveyAnalytics.regionStats.averageScores,
      overallAverages: surveyAnalytics.regionStats.averageScores, // 実際は全体平均を取得
      growthTrends,
      lastCalculated: new Date().toISOString()
    };
  }

  // メンバーのパーセンタイル位置を計算
  private static calculateMemberPercentile(value: number, percentiles: any): number {
    if (value <= percentiles.p25) return 25;
    if (value <= percentiles.p50) return 50;
    if (value <= percentiles.p75) return 75;
    if (value <= percentiles.p90) return 90;
    return 95;
  }

  // メンバーカルテアクセス権限チェック
  static canAccessMemberCard(user: User, targetMemberId: string, targetCompanyId?: string): boolean {
    switch (user.role) {
      case 'student':
        // 自分のカルテのみアクセス可能
        return user.memberId === targetMemberId;
      
      case 'company_admin':
        // 自社メンバーのカルテのみアクセス可能
        return user.companyId === targetCompanyId;
      
      case 'secretariat':
      case 'owner':
        // 全メンバーのカルテにアクセス可能
        return true;
      
      default:
        return false;
    }
  }

  // メンバーカルテ編集権限チェック
  static canEditMemberCard(user: User): boolean {
    return user.role === 'secretariat' || user.role === 'owner';
  }

  // 事務局コメント表示権限チェック
  static canViewPrivateComments(user: User, targetMemberId: string): boolean {
    if (user.role === 'secretariat' || user.role === 'owner') {
      return true;
    }
    
    // 学生は自分の非プライベートコメントのみ表示
    return user.memberId === targetMemberId;
  }

  // 監査ログ記録（本番環境では外部ログサービスに送信）
  static async logAuditEvent(
    user: User,
    action: string,
    resource: string,
    resourceId: string,
    details?: Record<string, any>
  ): Promise<void> {
    const logEntry = {
      userId: user.id,
      userRole: user.role,
      regionId: user.regionId,
      action,
      resource,
      resourceId,
      companyId: user.companyId,
      timestamp: new Date().toISOString(),
      ipAddress: 'sandbox-ip', // 実装時にリクエストから取得
      userAgent: 'sandbox-ua',  // 実装時にリクエストから取得
      details
    };
    
    // 本番環境では監査ログDBまたは外部サービスに送信
    console.log('Audit Log:', logEntry);
  }
}