// ハイブリッド登録システム - 登録管理サービス
import { 
  TentativeRegistration, 
  ProfileCompletionData, 
  BulkRegistrationData, 
  BulkRegistrationResult, 
  AdminDashboardStats, 
  EmailNotificationData,
  ProfileApprovalRequest,
  UserRole, 
  RegionId, 
  MemberStatus,
  UserSession
} from '../types';

// UUID生成
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 一時パスワード生成
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// セッショントークン生成
export function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// パスワードハッシュ化（簡易版 - 本番環境では bcrypt 等を使用）
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// パスワード検証
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

// 仮登録作成
export async function createTentativeRegistration(
  data: BulkRegistrationData,
  createdBy: string
): Promise<TentativeRegistration> {
  const tempPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(tempPassword);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
  
  const registration: TentativeRegistration = {
    id: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    tempName: data.tempName,
    email: data.email,
    regionId: data.regionId,
    role: data.role,
    companyId: data.companyId,
    status: 'tentative',
    temporaryPassword: hashedPassword,
    tempPasswordExpiresAt: expiresAt.toISOString(),
    isFirstLogin: true,
    createdBy,
    createdAt: now.toISOString()
  };
  
  // TODO: Notion API で private_member_cards に保存
  await saveTentativeRegistrationToNotion(registration, tempPassword);
  
  // メール通知データ作成
  const emailData: EmailNotificationData = {
    type: 'tentative_registration',
    recipientEmail: data.email,
    recipientName: data.tempName,
    data: {
      loginUrl: `${getBaseUrl()}/login`,
      temporaryPassword: tempPassword,
      expiresAt: expiresAt.toISOString()
    }
  };
  
  // TODO: メール送信
  await sendEmailNotification(emailData);
  
  return registration;
}

// CSV一括登録処理
export async function processBulkRegistration(
  csvData: BulkRegistrationData[],
  createdBy: string
): Promise<BulkRegistrationResult> {
  const result: BulkRegistrationResult = {
    totalCount: csvData.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdUsers: []
  };
  
  for (let i = 0; i < csvData.length; i++) {
    const data = csvData[i];
    try {
      // バリデーション
      if (!data.email || !data.tempName || !data.regionId || !data.role) {
        throw new Error('必須項目が不足しています');
      }
      
      // 重複チェック
      const existingUser = await findUserByEmail(data.email);
      if (existingUser) {
        throw new Error('既に登録済みのメールアドレスです');
      }
      
      // 仮登録作成
      const registration = await createTentativeRegistration(data, createdBy);
      result.createdUsers.push(registration.id);
      result.successCount++;
      
    } catch (error) {
      result.errorCount++;
      result.errors.push({
        row: i + 1,
        email: data.email,
        error: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }
  
  return result;
}

// ユーザー認証
export async function authenticateUser(email: string, password: string): Promise<UserSession | null> {
  try {
    // Notion から仮登録情報取得
    const user = await findUserByEmail(email);
    if (!user) {
      return null;
    }
    
    // パスワード検証
    const isValid = await verifyPassword(password, user.temporaryPassword);
    if (!isValid) {
      return null;
    }
    
    // 一時パスワード有効期限チェック
    if (user.isFirstLogin && new Date() > new Date(user.tempPasswordExpiresAt)) {
      throw new Error('一時パスワードの有効期限が切れています');
    }
    
    // セッション作成
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      role: user.role,
      regionId: user.regionId,
      companyId: user.companyId,
      memberId: user.status === 'active' ? user.id : undefined,
      status: user.status,
      isFirstLogin: user.isFirstLogin,
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24時間
    };
    
    // 最終ログイン時刻更新
    await updateLastLogin(user.id);
    
    return session;
    
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// プロフィール補完
export async function completeProfile(
  userId: string,
  profileData: ProfileCompletionData
): Promise<boolean> {
  try {
    // バリデーション
    const validationErrors = validateProfileCompletion(profileData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    
    // private_member_cards に保存
    await saveProfileCompletionToNotion(userId, profileData);
    
    return true;
  } catch (error) {
    console.error('Profile completion error:', error);
    return false;
  }
}

// プロフィール承認
export async function approveProfile(request: ProfileApprovalRequest): Promise<boolean> {
  try {
    if (request.status === 'approve') {
      // ステータスを 'active' に変更
      await updateMemberStatus(request.memberId, 'active', request.approvedBy);
      
      // public_members に同期
      await syncToPublicMembers(request.memberId);
      
      // 承認通知メール送信
      const user = await findUserById(request.memberId);
      if (user) {
        const emailData: EmailNotificationData = {
          type: 'approval_notification',
          recipientEmail: user.email,
          recipientName: user.tempName,
          data: {
            approvalMessage: request.approvalMessage || 'プロフィールが承認されました。ポータルサイトをご利用いただけます。'
          }
        };
        await sendEmailNotification(emailData);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Profile approval error:', error);
    return false;
  }
}

// 管理ダッシュボード統計取得
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  // TODO: Notion API から統計データ取得
  const mockStats: AdminDashboardStats = {
    totalMembers: 0,
    tentativeMembers: 0,
    activeMembers: 0,
    pendingApprovals: 0,
    completionRate: 0,
    regionStats: {
      'FUK': { total: 0, tentative: 0, active: 0, completionRate: 0 },
      'ISK': { total: 0, tentative: 0, active: 0, completionRate: 0 },
      'NIG': { total: 0, tentative: 0, active: 0, completionRate: 0 },
      'ALL': { total: 0, tentative: 0, active: 0, completionRate: 0 }
    },
    recentRegistrations: []
  };
  
  return mockStats;
}

// プロフィール補完バリデーション
function validateProfileCompletion(data: ProfileCompletionData): string[] {
  const errors: string[] = [];
  
  if (!data.fullName.trim()) errors.push('正式氏名は必須です');
  if (!data.fullNameKana.trim()) errors.push('氏名カナは必須です');
  if (!data.birthday) errors.push('誕生日は必須です');
  if (!data.catchPhrase.trim()) errors.push('キャッチコピーは必須です');
  if (!data.profileDescription.trim()) errors.push('プロフィール説明は必須です');
  if (!data.neoMotivation.trim()) errors.push('NEO参加動機は必須です');
  
  // 文字数制限チェック
  if (data.profileDescription.length > 200) {
    errors.push('プロフィール説明は200文字以内で入力してください');
  }
  
  // 誕生日形式チェック
  if (data.birthday && !isValidDateFormat(data.birthday)) {
    errors.push('誕生日の形式が正しくありません（YYYY-MM-DD）');
  }
  
  return errors;
}

// 日付形式チェック
function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// ベースURL取得
function getBaseUrl(): string {
  // 環境に応じてベースURLを返す
  return 'https://your-app.pages.dev'; // TODO: 実際のURLに変更
}

// Notion API 関連関数（実装）
async function saveTentativeRegistrationToNotion(
  registration: TentativeRegistration, 
  tempPassword: string
): Promise<void> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // await notionService.saveTentativeRegistration(registration);
  console.log('Saving tentative registration to Notion:', registration.id);
}

async function findUserByEmail(email: string): Promise<TentativeRegistration | null> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // return await notionService.findUserByEmail(email);
  console.log('Finding user by email:', email);
  
  // デモ用のモックデータ
  if (email === 'demo@test.com') {
    return {
      id: 'demo-user-001',
      tempName: 'テストユーザー',
      email: 'demo@test.com',
      regionId: 'FUK',
      role: 'student',
      status: 'tentative',
      temporaryPassword: await hashPassword('demo123'),
      tempPasswordExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isFirstLogin: true,
      createdBy: 'system',
      createdAt: new Date().toISOString()
    };
  }
  
  return null;
}

async function findUserById(id: string): Promise<TentativeRegistration | null> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // return await notionService.findUserById(id);
  console.log('Finding user by ID:', id);
  return null;
}

async function updateLastLogin(userId: string): Promise<void> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // await notionService.updateLastLogin(userId);
  console.log('Updating last login for user:', userId);
}

async function saveProfileCompletionToNotion(
  userId: string, 
  profileData: ProfileCompletionData
): Promise<void> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // await notionService.saveProfileCompletion(userId, profileData);
  console.log('Saving profile completion to Notion:', userId);
}

async function updateMemberStatus(
  memberId: string, 
  status: MemberStatus, 
  approvedBy: string
): Promise<void> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // await notionService.updateMemberStatus(memberId, status, approvedBy);
  console.log('Updating member status:', memberId, status);
}

async function syncToPublicMembers(memberId: string): Promise<void> {
  // TODO: 実際のNotionServiceインスタンスを使用
  // const notionService = new NotionService(apiKey, databaseIds);
  // await notionService.syncToPublicMembers(memberId);
  console.log('Syncing to public members:', memberId);
}

async function sendEmailNotification(emailData: EmailNotificationData): Promise<void> {
  const { EmailService } = await import('./email');
  const emailService = new EmailService();
  
  try {
    let success = false;
    
    switch (emailData.type) {
      case 'tentative_registration':
        success = await emailService.sendTentativeRegistrationEmail(
          emailData.recipientEmail,
          emailData.recipientName,
          emailData.data.temporaryPassword!,
          emailData.data.expiresAt!
        );
        break;
        
      case 'approval_notification':
        success = await emailService.sendApprovalNotificationEmail(
          emailData.recipientEmail,
          emailData.recipientName,
          emailData.data.approvalMessage
        );
        break;
        
      case 'password_reset':
        success = await emailService.sendPasswordResetEmail(
          emailData.recipientEmail,
          emailData.recipientName,
          emailData.data.loginUrl!
        );
        break;
    }
    
    // メール送信ログ記録
    await EmailService.logEmailSent(emailData, success);
    
    if (!success) {
      throw new Error('メール送信に失敗しました');
    }
    
  } catch (error) {
    console.error('Email notification error:', error);
    // メール送信失敗をログに記録（システムは継続）
    await EmailService.logEmailSent(emailData, false, error instanceof Error ? error.message : '不明なエラー');
  }
}