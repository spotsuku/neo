// メール通知サービス
import { EmailNotificationData } from '../types';

export class EmailService {
  private baseUrl: string;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://your-app.pages.dev';
  }

  // 仮登録メール送信
  async sendTentativeRegistrationEmail(
    email: string, 
    name: string, 
    temporaryPassword: string, 
    expiresAt: string
  ): Promise<boolean> {
    const emailData: EmailNotificationData = {
      type: 'tentative_registration',
      recipientEmail: email,
      recipientName: name,
      data: {
        loginUrl: `${this.baseUrl}/login`,
        temporaryPassword,
        expiresAt
      }
    };

    return this.sendNotification(emailData);
  }

  // 承認通知メール送信
  async sendApprovalNotificationEmail(
    email: string, 
    name: string, 
    approvalMessage?: string
  ): Promise<boolean> {
    const emailData: EmailNotificationData = {
      type: 'approval_notification',
      recipientEmail: email,
      recipientName: name,
      data: {
        approvalMessage: approvalMessage || 'プロフィールが承認されました。ポータルサイトをご利用いただけます。'
      }
    };

    return this.sendNotification(emailData);
  }

  // パスワードリセットメール送信
  async sendPasswordResetEmail(
    email: string, 
    name: string, 
    resetToken: string
  ): Promise<boolean> {
    const emailData: EmailNotificationData = {
      type: 'password_reset',
      recipientEmail: email,
      recipientName: name,
      data: {
        loginUrl: `${this.baseUrl}/reset-password?token=${resetToken}`
      }
    };

    return this.sendNotification(emailData);
  }

  // 共通メール送信処理
  private async sendNotification(emailData: EmailNotificationData): Promise<boolean> {
    try {
      // 実際の実装では外部メールサービス（SendGrid、AWS SES等）を使用
      console.log('📧 メール送信:', emailData);
      
      // メールテンプレート生成
      const emailContent = this.generateEmailContent(emailData);
      
      // TODO: 実際のメール送信処理
      // 例: SendGrid API、AWS SES、Cloudflare Email Workers など
      
      // 簡易実装：コンソール出力
      console.log('=== EMAIL CONTENT ===');
      console.log(emailContent);
      console.log('=== END EMAIL ===');
      
      return true;
    } catch (error) {
      console.error('メール送信エラー:', error);
      return false;
    }
  }

  // メールテンプレート生成
  private generateEmailContent(emailData: EmailNotificationData): string {
    const { type, recipientName, data } = emailData;

    switch (type) {
      case 'tentative_registration':
        return this.generateTentativeRegistrationTemplate(recipientName, data);
      case 'approval_notification':
        return this.generateApprovalTemplate(recipientName, data);
      case 'password_reset':
        return this.generatePasswordResetTemplate(recipientName, data);
      default:
        return this.generateGenericTemplate(recipientName, data);
    }
  }

  // 仮登録メールテンプレート
  private generateTentativeRegistrationTemplate(name: string, data: any): string {
    const expirationDate = new Date(data.expiresAt!).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
件名: 【NEO統合システム】アカウント仮登録完了のお知らせ

${name} 様

NEO統合システムへの仮登録が完了いたしました。

以下の情報でログインしてください：

ログインURL: ${data.loginUrl}
メールアドレス: ${data.recipientEmail}
一時パスワード: ${data.temporaryPassword}

【重要】
・一時パスワードの有効期限: ${expirationDate}
・初回ログイン後、プロフィール補完が必要です
・プロフィール補完後、事務局による承認をお待ちください

ご質問がございましたら、事務局までお気軽にお問い合わせください。

---
NEO統合システム事務局
`;
  }

  // 承認通知メールテンプレート
  private generateApprovalTemplate(name: string, data: any): string {
    return `
件名: 【NEO統合システム】プロフィール承認完了のお知らせ

${name} 様

お疲れ様です。

プロフィールの承認が完了いたしました。
これでNEO統合システムの全機能をご利用いただけます。

${data.approvalMessage}

ログインURL: ${this.baseUrl}/login

今後ともよろしくお願いいたします。

---
NEO統合システム事務局
`;
  }

  // パスワードリセットメールテンプレート
  private generatePasswordResetTemplate(name: string, data: any): string {
    return `
件名: 【NEO統合システム】パスワードリセットのご案内

${name} 様

パスワードリセットのご依頼を承りました。

以下のリンクをクリックして、新しいパスワードを設定してください：

${data.loginUrl}

※このリンクは24時間有効です。

身に覚えのない場合は、このメールを無視してください。

---
NEO統合システム事務局
`;
  }

  // 汎用メールテンプレート
  private generateGenericTemplate(name: string, data: any): string {
    return `
件名: 【NEO統合システム】システム通知

${name} 様

NEO統合システムからの通知です。

詳細については、システムにログインしてご確認ください。

ログインURL: ${this.baseUrl}/login

---
NEO統合システム事務局
`;
  }

  // メール送信履歴記録（ログ用）
  static async logEmailSent(
    emailData: EmailNotificationData, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: emailData.type,
      recipient: emailData.recipientEmail,
      success,
      error: error || null
    };

    // TODO: 実際の実装では監査ログDBに保存
    console.log('📧 メール送信ログ:', logEntry);
  }

  // バルクメール送信（一括登録時）
  async sendBulkEmails(emailList: EmailNotificationData[]): Promise<{
    successCount: number;
    errorCount: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const result = {
      successCount: 0,
      errorCount: 0,
      errors: [] as Array<{ email: string; error: string }>
    };

    for (const emailData of emailList) {
      try {
        const success = await this.sendNotification(emailData);
        if (success) {
          result.successCount++;
        } else {
          result.errorCount++;
          result.errors.push({
            email: emailData.recipientEmail,
            error: 'メール送信に失敗しました'
          });
        }
        
        // レート制限対応（100ms間隔）
        await this.delay(100);
        
      } catch (error) {
        result.errorCount++;
        result.errors.push({
          email: emailData.recipientEmail,
          error: error instanceof Error ? error.message : '不明なエラー'
        });
      }
    }

    return result;
  }

  // 遅延処理
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // メール設定検証
  static validateEmailConfiguration(): boolean {
    // TODO: メール送信設定の検証
    // 例: API キー、送信者アドレス、設定値等の確認
    return true;
  }

  // メールアドレス形式チェック
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Cloudflare Workers用のメール送信実装例
export class CloudflareEmailService extends EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string, baseUrl?: string) {
    super(baseUrl);
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  protected async sendNotification(emailData: EmailNotificationData): Promise<boolean> {
    try {
      // Cloudflare Email Workers や外部API を使用した実装
      // 例: SendGrid API
      const response = await fetch('https://api.sendgrid.v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: emailData.recipientEmail, name: emailData.recipientName }]
          }],
          from: { email: this.fromEmail, name: 'NEO統合システム事務局' },
          subject: this.getEmailSubject(emailData.type),
          content: [{
            type: 'text/plain',
            value: this.generateEmailContent(emailData)
          }]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Cloudflare email send error:', error);
      return false;
    }
  }

  private getEmailSubject(type: string): string {
    switch (type) {
      case 'tentative_registration':
        return '【NEO統合システム】アカウント仮登録完了のお知らせ';
      case 'approval_notification':
        return '【NEO統合システム】プロフィール承認完了のお知らせ';
      case 'password_reset':
        return '【NEO統合システム】パスワードリセットのご案内';
      default:
        return '【NEO統合システム】システム通知';
    }
  }
}