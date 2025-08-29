// NEO Digital Platform - Database Helper Functions
// D1データベース操作のヘルパー関数

import type { 
  User, Company, Member, Announcement, Class, Project, Committee, Attendance,
  RegionId, UserRole, PaginationParams, PaginatedResponse, ApiError
} from '@/types/database';

// D1データベースバインディング型（Cloudflare Workers用）
export interface DatabaseBinding {
  prepare: (sql: string) => {
    bind: (...params: any[]) => {
      first: () => Promise<any>;
      all: () => Promise<{ results: any[]; meta: any }>;
      run: () => Promise<{ success: boolean; meta: any }>;
    };
  };
  exec: (sql: string) => Promise<any>;
}

// エラーハンドリング
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string = 'DATABASE_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ユーティリティ関数
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${prefix}${timestamp}${random}`;
}

export function parseJsonField<T>(field: string | null | undefined): T | null {
  if (!field) return null;
  try {
    return JSON.parse(field) as T;
  } catch {
    return null;
  }
}

export function stringifyJsonField(value: any): string {
  return JSON.stringify(value);
}

// ページネーション計算
export function calculatePagination(
  page: number = 1, 
  limit: number = 10, 
  total: number
): PaginatedResponse<any>['pagination'] {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1
  };
}

// SQLクエリビルダー
export class QueryBuilder {
  private conditions: string[] = [];
  private params: any[] = [];
  
  where(condition: string, value?: any): this {
    this.conditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }
  
  getWhereClause(): string {
    return this.conditions.length > 0 ? ` WHERE ${this.conditions.join(' AND ')}` : '';
  }
  
  getParams(): any[] {
    return this.params;
  }
  
  reset(): this {
    this.conditions = [];
    this.params = [];
    return this;
  }
}

// ユーザー管理関数
export class UserService {
  constructor(private db: DatabaseBinding) {}
  
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const id = generateId('user_');
    const now = new Date().toISOString();
    
    try {
      const result = await this.db.prepare(`
        INSERT INTO users (
          id, email, password_hash, name, role, region_id, 
          accessible_regions, profile_image, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, userData.email, userData.password_hash, userData.name, userData.role,
        userData.region_id, stringifyJsonField(userData.accessible_regions),
        userData.profile_image || null, userData.is_active, now, now
      ).run();
      
      if (!result.success) {
        throw new DatabaseError('Failed to create user');
      }
      
      return await this.getUserById(id);
    } catch (error) {
      throw new DatabaseError(`Failed to create user: ${error.message}`);
    }
  }
  
  async getUserById(id: string): Promise<User> {
    const result = await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    
    if (!result) {
      throw new DatabaseError('User not found', 'USER_NOT_FOUND');
    }
    
    return {
      ...result,
      accessible_regions: parseJsonField<string[]>(result.accessible_regions) || [],
    } as User;
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    
    if (!result) return null;
    
    return {
      ...result,
      accessible_regions: parseJsonField<string[]>(result.accessible_regions) || [],
    } as User;
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'accessible_regions' ? stringifyJsonField(value) : value);
      }
    });
    
    if (fields.length === 0) {
      return await this.getUserById(id);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    
    return await this.getUserById(id);
  }
}

// お知らせ管理関数
export class AnnouncementService {
  constructor(private db: DatabaseBinding) {}
  
  async createAnnouncement(
    data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>,
    authorId: string
  ): Promise<Announcement> {
    const id = generateId('ann_');
    const now = new Date().toISOString();
    
    const result = await this.db.prepare(`
      INSERT INTO announcements (
        id, region_id, title, content, summary, author_id, target_roles,
        is_published, is_important, publish_date, expiry_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.region_id, data.title, data.content, data.summary || null,
      authorId, stringifyJsonField(data.target_roles), data.is_published,
      data.is_important, data.publish_date || null, data.expiry_date || null,
      now, now
    ).run();
    
    if (!result.success) {
      throw new DatabaseError('Failed to create announcement');
    }
    
    return await this.getAnnouncementById(id);
  }
  
  async getAnnouncementById(id: string): Promise<Announcement> {
    const result = await this.db.prepare('SELECT * FROM announcements WHERE id = ?').bind(id).first();
    
    if (!result) {
      throw new DatabaseError('Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
    }
    
    return {
      ...result,
      target_roles: parseJsonField<UserRole[]>(result.target_roles) || [],
    } as Announcement;
  }
  
  async getAnnouncements(
    regionId: RegionId,
    userRole: UserRole,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Announcement>> {
    const { page = 1, limit = 10, sort_by = 'created_at', sort_order = 'desc' } = params;
    const offset = (page - 1) * limit;
    
    // 権限チェック用のクエリ条件
    const query = new QueryBuilder();
    query.where('(region_id = ? OR region_id = ?)', regionId).where('ALL');
    query.where('is_published = true');
    query.where('(target_roles LIKE ? OR target_roles LIKE ?)', `%"${userRole}"%`).where('%"all"%');
    
    // 総件数取得
    const countResult = await this.db.prepare(
      `SELECT COUNT(*) as total FROM announcements${query.getWhereClause()}`
    ).bind(...query.getParams()).first();
    
    const total = countResult?.total || 0;
    
    // データ取得
    const dataResult = await this.db.prepare(`
      SELECT * FROM announcements${query.getWhereClause()}
      ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      LIMIT ? OFFSET ?
    `).bind(...query.getParams(), limit, offset).all();
    
    const announcements = dataResult.results.map(row => ({
      ...row,
      target_roles: parseJsonField<UserRole[]>(row.target_roles) || [],
    })) as Announcement[];
    
    return {
      data: announcements,
      pagination: calculatePagination(page, limit, total)
    };
  }
}

// データベース初期化関数
export async function initializeDatabase(db: DatabaseBinding): Promise<void> {
  try {
    // マイグレーション実行は wrangler コマンドで行うため、ここでは接続テストのみ
    await db.prepare('SELECT 1').first();
    console.log('Database connection established');
  } catch (error) {
    throw new DatabaseError(`Database initialization failed: ${error.message}`);
  }
}

// 開発用シードデータ関数
export async function seedDevelopmentData(db: DatabaseBinding): Promise<void> {
  const userService = new UserService(db);
  
  try {
    // テストユーザー作成
    const testUsers = [
      {
        email: 'admin@neo-fukuoka.jp',
        password_hash: '$2a$10$dummy.hash.for.development', // 開発用ダミーハッシュ
        name: '管理者',
        role: 'owner' as UserRole,
        region_id: 'FUK' as RegionId,
        accessible_regions: ['FUK', 'ISK', 'NIG'] as RegionId[],
        is_active: true
      },
      {
        email: 'company@example.com',
        password_hash: '$2a$10$dummy.hash.for.development',
        name: '企業管理者',
        role: 'company_admin' as UserRole,
        region_id: 'FUK' as RegionId,
        accessible_regions: ['FUK'] as RegionId[],
        is_active: true
      }
    ];
    
    for (const user of testUsers) {
      const existing = await userService.getUserByEmail(user.email);
      if (!existing) {
        await userService.createUser(user);
        console.log(`Created test user: ${user.email}`);
      }
    }
    
    console.log('Development seed data created successfully');
  } catch (error) {
    console.error('Failed to seed development data:', error);
  }
}