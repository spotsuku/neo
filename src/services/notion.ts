import { Client } from '@notionhq/client';
import type { 
  Company, 
  Member, 
  Attendance, 
  Lecture,
  NotionDatabase,
  NotionPage 
} from '../types';

export class NotionService {
  private notion: Client;
  
  // Database IDs (環境変数から取得)
  private databases = {
    publicCompanies: '', // 公開企業DB
    publicMembers: '',   // メンバーDB  
    publicAttendance: '' // 出欠管理DB
  };

  constructor(apiKey: string, databaseIds: Record<string, string>) {
    this.notion = new Client({ auth: apiKey });
    this.databases = {
      publicCompanies: databaseIds.PUBLIC_COMPANIES_DB || '',
      publicMembers: databaseIds.PUBLIC_MEMBERS_DB || '',
      publicAttendance: databaseIds.PUBLIC_ATTENDANCE_DB || ''
    };
  }

  // 公開企業データを取得
  async getPublicCompanies(): Promise<Company[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.publicCompanies,
        filter: {
          property: 'Status',
          select: {
            equals: 'Active'
          }
        }
      }) as NotionDatabase;

      return response.results.map(page => this.parseCompanyFromNotion(page));
    } catch (error) {
      console.error('Error fetching public companies:', error);
      return [];
    }
  }

  // 特定企業の情報を取得
  async getCompanyById(companyId: string): Promise<Company | null> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databases.publicCompanies,
        filter: {
          property: 'ID',
          rich_text: {
            equals: companyId
          }
        }
      }) as NotionDatabase;

      if (response.results.length === 0) return null;
      return this.parseCompanyFromNotion(response.results[0]);
    } catch (error) {
      console.error('Error fetching company by ID:', error);
      return null;
    }
  }

  // メンバーデータを取得
  async getPublicMembers(companyId?: string): Promise<Member[]> {
    try {
      const filter = companyId ? {
        property: 'CompanyID',
        rich_text: {
          equals: companyId
        }
      } : undefined;

      const response = await this.notion.databases.query({
        database_id: this.databases.publicMembers,
        filter
      }) as NotionDatabase;

      return response.results.map(page => this.parseMemberFromNotion(page));
    } catch (error) {
      console.error('Error fetching public members:', error);
      return [];
    }
  }

  // 出欠データを取得
  async getPublicAttendance(memberId?: string): Promise<Attendance[]> {
    try {
      const filter = memberId ? {
        property: 'MemberID',
        rich_text: {
          equals: memberId
        }
      } : undefined;

      const response = await this.notion.databases.query({
        database_id: this.databases.publicAttendance,
        filter,
        sorts: [
          {
            property: 'LectureDate',
            direction: 'descending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parseAttendanceFromNotion(page));
    } catch (error) {
      console.error('Error fetching public attendance:', error);
      return [];
    }
  }

  // 講義サマリーデータを取得（出欠データから集計）
  async getLectureSummaries(): Promise<Lecture[]> {
    try {
      const attendanceData = await this.getPublicAttendance();
      
      // 講義ごとにデータを集計
      const lectureMap = new Map<string, {
        id: string;
        title: string;
        theme: string;
        instructor: string;
        date: string;
        participants: Attendance[];
      }>();

      attendanceData.forEach(attendance => {
        const key = attendance.lectureId;
        if (!lectureMap.has(key)) {
          lectureMap.set(key, {
            id: attendance.lectureId,
            title: attendance.lectureTitle,
            theme: attendance.lectureTitle, // テーマとタイトルが同じと仮定
            instructor: attendance.instructor,
            date: attendance.lectureDate,
            participants: []
          });
        }
        lectureMap.get(key)!.participants.push(attendance);
      });

      // 統計値を計算
      const lectures: Lecture[] = Array.from(lectureMap.values()).map(lecture => {
        const participants = lecture.participants;
        const presentParticipants = participants.filter(p => p.status === 'present');
        
        return {
          id: lecture.id,
          title: lecture.title,
          theme: lecture.theme,
          instructor: lecture.instructor,
          date: lecture.date,
          participantCount: presentParticipants.length,
          avgSatisfaction: this.calculateAverage(presentParticipants.map(p => p.satisfactionScore).filter(Boolean)),
          avgUnderstanding: this.calculateAverage(presentParticipants.map(p => p.understandingScore).filter(Boolean)),
          avgNPS: this.calculateAverage(presentParticipants.map(p => p.npsScore).filter(Boolean))
        };
      });

      return lectures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching lecture summaries:', error);
      return [];
    }
  }

  // Notionページから企業データをパース
  private parseCompanyFromNotion(page: NotionPage): Company {
    const props = page.properties;
    return {
      id: this.getPropertyValue(props.ID, 'rich_text') || page.id,
      name: this.getPropertyValue(props.Name, 'title') || '名称未設定',
      industry: this.getPropertyValue(props.Industry, 'select') || '未分類',
      status: this.getPropertyValue(props.Status, 'select') || 'Unknown',
      joinDate: this.getPropertyValue(props.JoinDate, 'date') || '',
      csStep: parseInt(this.getPropertyValue(props.CSStep, 'number')) || 1
    };
  }

  // Notionページからメンバーデータをパース
  private parseMemberFromNotion(page: NotionPage): Member {
    const props = page.properties;
    return {
      id: this.getPropertyValue(props.ID, 'rich_text') || page.id,
      name: this.getPropertyValue(props.Name, 'title') || '名前未設定',
      email: this.getPropertyValue(props.Email, 'email') || '',
      companyId: this.getPropertyValue(props.CompanyID, 'rich_text') || '',
      type: this.getPropertyValue(props.Type, 'select') === '企業選抜' ? 'company_selected' : 'youth_selected',
      heroStep: parseInt(this.getPropertyValue(props.HeroStep, 'number')) || 0,
      status: this.getPropertyValue(props.Status, 'select') || 'Active'
    };
  }

  // Notionページから出欠データをパース
  private parseAttendanceFromNotion(page: NotionPage): Attendance {
    const props = page.properties;
    return {
      id: page.id,
      memberId: this.getPropertyValue(props.MemberID, 'rich_text') || '',
      lectureId: this.getPropertyValue(props.LectureID, 'rich_text') || '',
      lectureTitle: this.getPropertyValue(props.LectureTitle, 'rich_text') || '',
      lectureDate: this.getPropertyValue(props.LectureDate, 'date') || '',
      instructor: this.getPropertyValue(props.Instructor, 'rich_text') || '',
      status: this.mapAttendanceStatus(this.getPropertyValue(props.Status, 'select')),
      satisfactionScore: parseInt(this.getPropertyValue(props.SatisfactionScore, 'number')) || undefined,
      understandingScore: parseInt(this.getPropertyValue(props.UnderstandingScore, 'number')) || undefined,
      npsScore: parseInt(this.getPropertyValue(props.NPSScore, 'number')) || undefined,
      comment: this.getPropertyValue(props.Comment, 'rich_text') || undefined
    };
  }

  // Notionプロパティの値を取得
  private getPropertyValue(property: any, type: string): string {
    if (!property) return '';
    
    switch (type) {
      case 'title':
        return property.title?.[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || '';
      case 'select':
        return property.select?.name || '';
      case 'email':
        return property.email || '';
      case 'date':
        return property.date?.start || '';
      case 'number':
        return property.number?.toString() || '';
      default:
        return '';
    }
  }

  // 出欠ステータスをマッピング
  private mapAttendanceStatus(status: string): 'present' | 'absent' | 'late' {
    switch (status) {
      case '出席':
        return 'present';
      case '欠席':
        return 'absent';
      case '遅刻':
        return 'late';
      default:
        return 'absent';
    }
  }

  // 平均値を計算
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100;
  }
}