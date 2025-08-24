import { Client } from '@notionhq/client';
import type { 
  RegionId,
  Company, 
  Member, 
  Attendance, 
  Class,
  Announcement,
  NEOProject,
  Committee,
  Document,
  Survey,
  Matching,
  HeroCandidate,
  MemberCard,
  PersonalSurveyData,
  ClassAssignment,
  ClassMember,
  SurveyAnalytics,
  NotionDatabase,
  NotionPage,
  FilterParams,
  PaginationParams
} from '../types';

export class NotionService {
  private notion: Client;
  
  // Database IDs (環境変数から取得)
  private databases = {
    privateCompanyCards: '',    // 企業カルテ（非公開）
    publicCompanies: '',        // 公開企業
    privateMemberCards: '',     // メンバーカルテ（非公開）
    publicMembers: '',          // 公開メンバー
    privateSurveys: '',         // アンケート（非公開）
    publicAttendance: '',       // 出欠（公開）
    privateMatching: '',        // 相談・マッチング（非公開）
    privateHeroCandidates: '',  // ヒーロー候補（非公開）
    classes: '',                // 授業
    announcements: '',          // お知らせ
    neoOfficialProjects: '',    // NEO公認プロジェクト
    committees: '',             // 委員会
    syllabusAndDocs: ''         // シラバス・各種資料
  };

  constructor(apiKey: string, databaseIds: Record<string, string>) {
    this.notion = new Client({ auth: apiKey });
    this.databases = {
      privateCompanyCards: databaseIds.PRIVATE_COMPANY_CARDS_DB || '',
      publicCompanies: databaseIds.PUBLIC_COMPANIES_DB || '',
      privateMemberCards: databaseIds.PRIVATE_MEMBER_CARDS_DB || '',
      publicMembers: databaseIds.PUBLIC_MEMBERS_DB || '',
      privateSurveys: databaseIds.PRIVATE_SURVEYS_DB || '',
      publicAttendance: databaseIds.PUBLIC_ATTENDANCE_DB || '',
      privateMatching: databaseIds.PRIVATE_MATCHING_DB || '',
      privateHeroCandidates: databaseIds.PRIVATE_HERO_CANDIDATES_DB || '',
      classes: databaseIds.CLASSES_DB || '',
      announcements: databaseIds.ANNOUNCEMENTS_DB || '',
      neoOfficialProjects: databaseIds.NEO_OFFICIAL_PROJECTS_DB || '',
      committees: databaseIds.COMMITTEES_DB || '',
      syllabusAndDocs: databaseIds.SYLLABUS_AND_DOCS_DB || ''
    };
  }

  // 地域フィルタを生成
  private createRegionFilter(regionId: RegionId) {
    if (regionId === 'ALL') return undefined;
    return {
      property: 'RegionID',
      rich_text: {
        equals: regionId
      }
    };
  }

  // 複合フィルタを生成
  private createCompoundFilter(filters: any[]) {
    if (filters.length === 0) return undefined;
    if (filters.length === 1) return filters[0];
    return {
      and: filters
    };
  }

  // 公開企業データを取得
  async getPublicCompanies(regionId: RegionId = 'FUK', includeInactive = false): Promise<Company[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // ステータスフィルタ
      if (!includeInactive) {
        filters.push({
          property: 'Status',
          select: {
            equals: 'Active'
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.publicCompanies,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: regionId === 'FUK' ? 'DisplayOrder' : 'Name',
            direction: 'ascending'
          }
        ]
      }) as NotionDatabase;

      let companies = response.results.map(page => this.parseCompanyFromNotion(page));
      
      // FUK地域の表示順例外ルール適用
      if (regionId === 'FUK') {
        companies = this.applyFukuokaDisplayOrder(companies);
      }

      return companies;
    } catch (error) {
      console.error('Error fetching public companies:', error);
      return [];
    }
  }

  // FUK地域の表示順例外ルール
  private applyFukuokaDisplayOrder(companies: Company[]): Company[] {
    const priorityCompanies = ['やずや'];
    const sorted = [...companies];
    
    // 優先企業を先頭に移動
    priorityCompanies.forEach((priorityName, index) => {
      const priorityIndex = sorted.findIndex(c => c.name.includes(priorityName));
      if (priorityIndex > -1) {
        const [priorityCompany] = sorted.splice(priorityIndex, 1);
        sorted.splice(index, 0, priorityCompany);
      }
    });
    
    return sorted;
  }

  // 特定企業の情報を取得
  async getCompanyById(regionId: RegionId, companyId: string): Promise<Company | null> {
    try {
      const filters = [
        {
          property: 'ID',
          rich_text: {
            equals: companyId
          }
        }
      ];

      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);

      const response = await this.notion.databases.query({
        database_id: this.databases.publicCompanies,
        filter: this.createCompoundFilter(filters)
      }) as NotionDatabase;

      if (response.results.length === 0) return null;
      return this.parseCompanyFromNotion(response.results[0]);
    } catch (error) {
      console.error('Error fetching company by ID:', error);
      return null;
    }
  }

  // メンバーデータを取得
  async getPublicMembers(regionId: RegionId = 'FUK', companyId?: string): Promise<Member[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // 企業フィルタ
      if (companyId) {
        filters.push({
          property: 'CompanyID',
          rich_text: {
            equals: companyId
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.publicMembers,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parseMemberFromNotion(page));
    } catch (error) {
      console.error('Error fetching public members:', error);
      return [];
    }
  }

  // 出欠データを取得
  async getPublicAttendance(regionId: RegionId = 'FUK', memberId?: string, eventId?: string): Promise<Attendance[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // メンバーフィルタ
      if (memberId) {
        filters.push({
          property: 'MemberID',
          rich_text: {
            equals: memberId
          }
        });
      }
      
      // イベントフィルタ
      if (eventId) {
        filters.push({
          property: 'EventID',
          rich_text: {
            equals: eventId
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.publicAttendance,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: 'EventDate',
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

  // 授業データを取得
  async getClasses(regionId: RegionId = 'FUK', filters?: FilterParams): Promise<Class[]> {
    try {
      const queryFilters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) queryFilters.push(regionFilter);
      
      // 年度フィルタ
      if (filters?.year) {
        queryFilters.push({
          property: 'Date',
          date: {
            on_or_after: `${filters.year}-01-01`
          }
        });
        queryFilters.push({
          property: 'Date',
          date: {
            before: `${parseInt(filters.year) + 1}-01-01`
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.classes,
        filter: this.createCompoundFilter(queryFilters),
        sorts: [
          {
            property: 'Date',
            direction: 'descending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parseClassFromNotion(page));
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  // お知らせデータを取得
  async getAnnouncements(regionId: RegionId = 'FUK', targetRole?: string): Promise<Announcement[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // アクティブなお知らせのみ
      filters.push({
        property: 'IsActive',
        checkbox: {
          equals: true
        }
      });
      
      // 有効期限内
      filters.push({
        or: [
          {
            property: 'ExpiryDate',
            date: {
              is_empty: true
            }
          },
          {
            property: 'ExpiryDate',
            date: {
              on_or_after: new Date().toISOString().split('T')[0]
            }
          }
        ]
      });

      const response = await this.notion.databases.query({
        database_id: this.databases.announcements,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: 'Priority',
            direction: 'descending'
          },
          {
            property: 'PublishDate',
            direction: 'descending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parseAnnouncementFromNotion(page));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  }

  // NEO公認プロジェクトを取得
  async getNEOProjects(regionId: RegionId = 'FUK', isRecruting?: boolean): Promise<NEOProject[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // 募集中フィルタ
      if (isRecruting !== undefined) {
        filters.push({
          property: 'IsRecruting',
          checkbox: {
            equals: isRecruting
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.neoOfficialProjects,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: 'StartDate',
            direction: 'descending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parseNEOProjectFromNotion(page));
    } catch (error) {
      console.error('Error fetching NEO projects:', error);
      return [];
    }
  }

  // 授業サマリーデータを取得（出欠データから集計）
  async getClassSummaries(regionId: RegionId = 'FUK'): Promise<Class[]> {
    try {
      const [classes, attendanceData] = await Promise.all([
        this.getClasses(regionId),
        this.getPublicAttendance(regionId)
      ]);
      
      // 授業ごとに出欠データを集計
      return classes.map(classData => {
        const classAttendance = attendanceData.filter(a => a.eventId === classData.id);
        const presentParticipants = classAttendance.filter(a => a.status === 'present');
        
        return {
          ...classData,
          participantCount: presentParticipants.length,
          avgSatisfaction: this.calculateAverage(presentParticipants.map(p => p.satisfactionScore).filter(Boolean)),
          avgUnderstanding: this.calculateAverage(presentParticipants.map(p => p.understandingScore).filter(Boolean)),
          avgNPS: this.calculateAverage(presentParticipants.map(p => p.npsScore).filter(Boolean))
        };
      });
    } catch (error) {
      console.error('Error fetching class summaries:', error);
      return [];
    }
  }

  // 委員会データを取得
  async getCommittees(regionId: RegionId = 'FUK', isRecruting?: boolean): Promise<Committee[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // 募集中フィルタ
      if (isRecruting !== undefined) {
        filters.push({
          property: 'IsRecruting',
          checkbox: {
            equals: isRecruting
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.committees,
        filter: this.createCompoundFilter(filters)
      }) as NotionDatabase;

      return response.results.map(page => this.parseCommitteeFromNotion(page));
    } catch (error) {
      console.error('Error fetching committees:', error);
      return [];
    }
  }

  // 資料データを取得
  async getDocuments(regionId: RegionId = 'FUK', type?: string, accessLevel = 'public'): Promise<Document[]> {
    try {
      const filters = [];
      
      // 地域フィルタ
      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);
      
      // タイプフィルタ
      if (type) {
        filters.push({
          property: 'Type',
          select: {
            equals: type
          }
        });
      }
      
      // アクセスレベルフィルタ
      filters.push({
        or: [
          {
            property: 'AccessLevel',
            select: {
              equals: 'public'
            }
          },
          {
            property: 'AccessLevel',
            select: {
              equals: accessLevel
            }
          }
        ]
      });

      const response = await this.notion.databases.query({
        database_id: this.databases.syllabusAndDocs,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: 'UpdatedDate',
            direction: 'descending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parseDocumentFromNotion(page));
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  // Notionページから企業データをパース
  private parseCompanyFromNotion(page: NotionPage): Company {
    const props = page.properties;
    return {
      id: this.getPropertyValue(props.ID, 'rich_text') || page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      name: this.getPropertyValue(props.Name, 'title') || '名称未設定',
      industry: this.getPropertyValue(props.Industry, 'select') || '未分類',
      status: this.getPropertyValue(props.Status, 'select') || 'Unknown',
      joinDate: this.getPropertyValue(props.JoinDate, 'date') || '',
      logoUrl: this.getPropertyValue(props.LogoURL, 'url') || undefined,
      description: this.getPropertyValue(props.Description, 'rich_text') || undefined,
      csStep: parseInt(this.getPropertyValue(props.CSStep, 'number')) || 1,
      nextAction: this.getPropertyValue(props.NextAction, 'rich_text') || undefined,
      displayOrder: parseInt(this.getPropertyValue(props.DisplayOrder, 'number')) || 999
    };
  }

  // Notionページからメンバーデータをパース
  private parseMemberFromNotion(page: NotionPage): Member {
    const props = page.properties;
    return {
      id: this.getPropertyValue(props.ID, 'rich_text') || page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      name: this.getPropertyValue(props.Name, 'title') || '名前未設定',
      email: this.getPropertyValue(props.Email, 'email') || '',
      companyId: this.getPropertyValue(props.CompanyID, 'rich_text') || '',
      type: this.getPropertyValue(props.Type, 'select') === '企業選抜' ? 'company_selected' : 'youth_selected',
      heroStep: parseInt(this.getPropertyValue(props.HeroStep, 'number')) || 0,
      status: this.getPropertyValue(props.Status, 'select') || 'Active',
      profileImage: this.getPropertyValue(props.ProfileImage, 'url') || undefined,
      attendanceRate: parseFloat(this.getPropertyValue(props.AttendanceRate, 'number')) || undefined,
      joinDate: this.getPropertyValue(props.JoinDate, 'date') || undefined,
      mentorId: this.getPropertyValue(props.MentorID, 'rich_text') || undefined,
      bio: this.getPropertyValue(props.Bio, 'rich_text') || undefined
    };
  }

  // Notionページから出欠データをパース
  private parseAttendanceFromNotion(page: NotionPage): Attendance {
    const props = page.properties;
    return {
      id: page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      memberId: this.getPropertyValue(props.MemberID, 'rich_text') || '',
      eventId: this.getPropertyValue(props.EventID, 'rich_text') || '',
      eventTitle: this.getPropertyValue(props.EventTitle, 'rich_text') || '',
      eventDate: this.getPropertyValue(props.EventDate, 'date') || '',
      instructor: this.getPropertyValue(props.Instructor, 'rich_text') || '',
      status: this.mapAttendanceStatus(this.getPropertyValue(props.Status, 'select')),
      satisfactionScore: parseInt(this.getPropertyValue(props.SatisfactionScore, 'number')) || undefined,
      understandingScore: parseInt(this.getPropertyValue(props.UnderstandingScore, 'number')) || undefined,
      npsScore: parseInt(this.getPropertyValue(props.NPSScore, 'number')) || undefined,
      comment: this.getPropertyValue(props.Comment, 'rich_text') || undefined,
      timestamp: this.getPropertyValue(props.Timestamp, 'date') || page.created_time
    };
  }

  // Notionページから授業データをパース
  private parseClassFromNotion(page: NotionPage): Class {
    const props = page.properties;
    return {
      id: page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      title: this.getPropertyValue(props.Title, 'title') || '授業',
      theme: this.getPropertyValue(props.Theme, 'rich_text') || '',
      instructor: this.getPropertyValue(props.Instructor, 'rich_text') || '',
      date: this.getPropertyValue(props.Date, 'date') || '',
      time: this.getPropertyValue(props.Time, 'rich_text') || '',
      venue: this.getPropertyValue(props.Venue, 'rich_text') || undefined,
      description: this.getPropertyValue(props.Description, 'rich_text') || undefined,
      materials: this.getMultiSelectValues(props.Materials) || [],
      participantCount: 0, // 初期値、集計で更新
      avgSatisfaction: 0,
      avgUnderstanding: 0,
      avgNPS: 0,
      status: this.mapClassStatus(this.getPropertyValue(props.Status, 'select'))
    };
  }

  // Notionページからお知らせデータをパース
  private parseAnnouncementFromNotion(page: NotionPage): Announcement {
    const props = page.properties;
    return {
      id: page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      title: this.getPropertyValue(props.Title, 'title') || 'お知らせ',
      content: this.getPropertyValue(props.Content, 'rich_text') || '',
      category: this.mapAnnouncementCategory(this.getPropertyValue(props.Category, 'select')),
      priority: this.mapPriority(this.getPropertyValue(props.Priority, 'select')),
      targetRoles: this.getMultiSelectValues(props.TargetRoles).map(role => this.mapUserRole(role)),
      publishDate: this.getPropertyValue(props.PublishDate, 'date') || '',
      expiryDate: this.getPropertyValue(props.ExpiryDate, 'date') || undefined,
      attachments: this.getMultiSelectValues(props.Attachments) || [],
      isActive: this.getPropertyValue(props.IsActive, 'checkbox') === 'true'
    };
  }

  // Notionページから NEO公認プロジェクトデータをパース
  private parseNEOProjectFromNotion(page: NotionPage): NEOProject {
    const props = page.properties;
    return {
      id: page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      title: this.getPropertyValue(props.Title, 'title') || 'プロジェクト',
      description: this.getPropertyValue(props.Description, 'rich_text') || '',
      status: this.mapProjectStatus(this.getPropertyValue(props.Status, 'select')),
      leaderId: this.getPropertyValue(props.LeaderID, 'rich_text') || '',
      memberIds: this.getMultiSelectValues(props.MemberIDs) || [],
      startDate: this.getPropertyValue(props.StartDate, 'date') || '',
      endDate: this.getPropertyValue(props.EndDate, 'date') || undefined,
      progress: parseInt(this.getPropertyValue(props.Progress, 'number')) || 0,
      category: this.getPropertyValue(props.Category, 'select') || '',
      isRecruting: this.getPropertyValue(props.IsRecruting, 'checkbox') === 'true'
    };
  }

  // Notionページから委員会データをパース
  private parseCommitteeFromNotion(page: NotionPage): Committee {
    const props = page.properties;
    return {
      id: page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      name: this.getPropertyValue(props.Name, 'title') || '委員会',
      description: this.getPropertyValue(props.Description, 'rich_text') || '',
      chairPersonId: this.getPropertyValue(props.ChairPersonID, 'rich_text') || '',
      memberIds: this.getMultiSelectValues(props.MemberIDs) || [],
      meetingSchedule: this.getPropertyValue(props.MeetingSchedule, 'rich_text') || '',
      responsibilities: this.getMultiSelectValues(props.Responsibilities) || [],
      isRecruting: this.getPropertyValue(props.IsRecruting, 'checkbox') === 'true',
      applicationDeadline: this.getPropertyValue(props.ApplicationDeadline, 'date') || undefined
    };
  }

  // Notionページから資料データをパース
  private parseDocumentFromNotion(page: NotionPage): Document {
    const props = page.properties;
    return {
      id: page.id,
      regionId: this.getPropertyValue(props.RegionID, 'rich_text') as RegionId || 'FUK',
      title: this.getPropertyValue(props.Title, 'title') || '資料',
      type: this.mapDocumentType(this.getPropertyValue(props.Type, 'select')),
      url: this.getPropertyValue(props.URL, 'url') || '',
      description: this.getPropertyValue(props.Description, 'rich_text') || undefined,
      category: this.getPropertyValue(props.Category, 'select') || '',
      uploadDate: this.getPropertyValue(props.UploadDate, 'date') || '',
      updatedDate: this.getPropertyValue(props.UpdatedDate, 'date') || '',
      accessLevel: this.mapAccessLevel(this.getPropertyValue(props.AccessLevel, 'select'))
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
      case 'url':
        return property.url || '';
      case 'date':
        return property.date?.start || '';
      case 'number':
        return property.number?.toString() || '';
      case 'checkbox':
        return property.checkbox?.toString() || 'false';
      default:
        return '';
    }
  }

  // マルチセレクトの値を取得
  private getMultiSelectValues(property: any): string[] {
    if (!property || !property.multi_select) return [];
    return property.multi_select.map((item: any) => item.name);
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

  // 授業ステータスをマッピング
  private mapClassStatus(status: string): 'scheduled' | 'completed' | 'cancelled' {
    switch (status) {
      case '予定':
        return 'scheduled';
      case '完了':
        return 'completed';
      case 'キャンセル':
        return 'cancelled';
      default:
        return 'scheduled';
    }
  }

  // お知らせカテゴリをマッピング
  private mapAnnouncementCategory(category: string): 'important' | 'event' | 'operation' | 'general' {
    switch (category) {
      case '重要':
        return 'important';
      case 'イベント':
        return 'event';
      case '運営':
        return 'operation';
      default:
        return 'general';
    }
  }

  // 優先度をマッピング
  private mapPriority(priority: string): 'high' | 'medium' | 'low' {
    switch (priority) {
      case '高':
        return 'high';
      case '中':
        return 'medium';
      case '低':
        return 'low';
      default:
        return 'medium';
    }
  }

  // ユーザーロールをマッピング
  private mapUserRole(role: string): UserRole {
    switch (role) {
      case '企業管理者':
        return 'company_admin';
      case '学生':
        return 'student';
      case '事務局':
        return 'secretariat';
      case 'オーナー':
        return 'owner';
      default:
        return 'student';
    }
  }

  // プロジェクトステータスをマッピング
  private mapProjectStatus(status: string): 'planning' | 'active' | 'completed' | 'suspended' {
    switch (status) {
      case '企画中':
        return 'planning';
      case '進行中':
        return 'active';
      case '完了':
        return 'completed';
      case '中断':
        return 'suspended';
      default:
        return 'planning';
    }
  }

  // 資料タイプをマッピング
  private mapDocumentType(type: string): 'syllabus' | 'guide' | 'regulation' | 'faq' | 'material' {
    switch (type) {
      case 'シラバス':
        return 'syllabus';
      case 'ガイド':
        return 'guide';
      case '規約':
        return 'regulation';
      case 'FAQ':
        return 'faq';
      default:
        return 'material';
    }
  }

  // アクセスレベルをマッピング
  private mapAccessLevel(level: string): 'public' | 'member_only' | 'admin_only' {
    switch (level) {
      case '公開':
        return 'public';
      case 'メンバー限定':
        return 'member_only';
      case '管理者限定':
        return 'admin_only';
      default:
        return 'public';
    }
  }

  // 平均値を計算
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100;
  }

  // メンバーカルテ情報を取得
  async getMemberCard(regionId: RegionId, memberId: string): Promise<MemberCard | null> {
    try {
      const filters = [
        {
          property: 'MemberID',
          rich_text: {
            equals: memberId
          }
        }
      ];

      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);

      const response = await this.notion.databases.query({
        database_id: this.databases.privateMemberCards,
        filter: this.createCompoundFilter(filters)
      }) as NotionDatabase;

      if (response.results.length === 0) return null;
      return this.parseMemberCardFromNotion(response.results[0]);
    } catch (error) {
      console.error('Error fetching member card:', error);
      return null;
    }
  }

  // 個人アンケートデータを取得
  async getPersonalSurveys(regionId: RegionId, memberId: string): Promise<PersonalSurveyData[]> {
    try {
      const filters = [
        {
          property: 'RespondentID',
          rich_text: {
            equals: memberId
          }
        },
        {
          property: 'RespondentType',
          select: {
            equals: 'student'
          }
        }
      ];

      const regionFilter = this.createRegionFilter(regionId);
      if (regionFilter) filters.push(regionFilter);

      const response = await this.notion.databases.query({
        database_id: this.databases.privateSurveys,
        filter: this.createCompoundFilter(filters),
        sorts: [
          {
            property: 'SubmittedAt',
            direction: 'descending'
          }
        ]
      }) as NotionDatabase;

      return response.results.map(page => this.parsePersonalSurveyFromNotion(page));
    } catch (error) {
      console.error('Error fetching personal surveys:', error);
      return [];
    }
  }

  // クラス編成情報を取得
  async getClassAssignment(regionId: RegionId, year: string = new Date().getFullYear().toString()): Promise<ClassAssignment | null> {
    try {
      // 実際の実装では、クラス編成情報は別のデータベースまたは
      // メンバーデータベースのプロパティから取得
      const members = await this.getPublicMembers(regionId);
      
      // 日本語名前ソートとクラス編成のロジックを適用
      const assignments = this.generateClassAssignments(regionId, members, year);
      
      return assignments;
    } catch (error) {
      console.error('Error fetching class assignment:', error);
      return null;
    }
  }

  // クラス編成を生成（3クラス・5人1チーム・五十音順）
  private generateClassAssignments(regionId: RegionId, members: Member[], year: string): ClassAssignment {
    // ひらがな変換とソート
    const sortedMembers = members
      .map(member => ({
        ...member,
        furigana: this.convertToHiragana(member.name)
      }))
      .sort((a, b) => a.furigana.localeCompare(b.furigana, 'ja'));

    const assignments: ClassMember[] = [];
    const membersPerClass = Math.ceil(sortedMembers.length / 3);

    sortedMembers.forEach((member, index) => {
      const classNumber = Math.floor(index / membersPerClass) + 1;
      const positionInClass = index % membersPerClass;
      const teamNumber = Math.floor(positionInClass / 5) + 1;
      const attendanceNumber = positionInClass + 1;
      
      assignments.push({
        memberId: member.id,
        memberName: member.name,
        furigana: member.furigana || this.convertToHiragana(member.name),
        classNumber: Math.min(classNumber, 3), // 最大3クラス
        teamNumber,
        attendanceNumber,
        companyId: member.companyId,
        companyName: '' // 実際の実装では企業名を取得
      });
    });

    return {
      regionId,
      year,
      assignments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    };
  }

  // 日本語名前をひらがなに変換（簡易版）
  private convertToHiragana(name: string): string {
    // カタカナからひらがなへの変換
    return name.replace(/[\u30A1-\u30F6]/g, (match) => {
      const code = match.charCodeAt(0) - 0x60;
      return String.fromCharCode(code);
    });
  }

  // アンケート分析統計を計算
  async calculateSurveyAnalytics(regionId: RegionId): Promise<SurveyAnalytics | null> {
    try {
      const surveys = await this.getAllSurveys(regionId);
      const members = await this.getPublicMembers(regionId);
      
      if (surveys.length === 0) return null;

      // 統計計算のロジック
      const analytics = this.computeSurveyStatistics(regionId, surveys, members);
      
      return analytics;
    } catch (error) {
      console.error('Error calculating survey analytics:', error);
      return null;
    }
  }

  // 全アンケートデータを取得（内部用）
  private async getAllSurveys(regionId: RegionId): Promise<Survey[]> {
    const filters = [];
    const regionFilter = this.createRegionFilter(regionId);
    if (regionFilter) filters.push(regionFilter);

    const response = await this.notion.databases.query({
      database_id: this.databases.privateSurveys,
      filter: this.createCompoundFilter(filters)
    }) as NotionDatabase;

    return response.results.map(page => this.parseSurveyFromNotion(page));
  }

  // 統計計算（詳細実装）
  private computeSurveyStatistics(regionId: RegionId, surveys: Survey[], members: Member[]): SurveyAnalytics {
    // 統計計算のロジック実装
    const surveyTypes = [...new Set(surveys.map(s => s.eventId || 'general'))];
    
    // 平均スコア計算
    const averageScores: Record<string, number> = {};
    const allScores: Record<string, number[]> = {};
    
    surveys.forEach(survey => {
      Object.entries(survey.scores).forEach(([key, value]) => {
        if (!allScores[key]) allScores[key] = [];
        allScores[key].push(value);
      });
    });

    Object.entries(allScores).forEach(([key, values]) => {
      averageScores[key] = this.calculateAverage(values);
    });

    // パーセンタイル計算
    const percentileRanges: Record<string, any> = {};
    Object.entries(allScores).forEach(([key, values]) => {
      const sorted = values.sort((a, b) => a - b);
      percentileRanges[key] = {
        p25: this.calculatePercentile(sorted, 25),
        p50: this.calculatePercentile(sorted, 50),
        p75: this.calculatePercentile(sorted, 75),
        p90: this.calculatePercentile(sorted, 90)
      };
    });

    return {
      regionId,
      analysisDate: new Date().toISOString(),
      memberCount: members.length,
      surveyTypes,
      regionStats: {
        averageScores,
        medianScores: Object.fromEntries(
          Object.entries(allScores).map(([key, values]) => [
            key, 
            this.calculatePercentile(values.sort((a, b) => a - b), 50)
          ])
        ),
        standardDeviations: Object.fromEntries(
          Object.entries(allScores).map(([key, values]) => [
            key, 
            this.calculateStandardDeviation(values)
          ])
        ),
        percentileRanges
      },
      comparisonData: {
        byCompany: {},
        byHeroStep: {},
        bySelectionType: {}
      }
    };
  }

  // パーセンタイル計算
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = (percentile / 100) * (sortedValues.length - 1);
    if (Number.isInteger(index)) {
      return sortedValues[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
    }
  }

  // 標準偏差計算
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = this.calculateAverage(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  // NotionページからMemberCardオブジェクトをパース
  private parseMemberCardFromNotion(page: NotionPage): MemberCard {
    const props = page.properties;
    
    return {
      id: page.id,
      regionId: props.RegionID?.rich_text?.[0]?.text?.content || 'FUK',
      memberId: props.MemberID?.rich_text?.[0]?.text?.content || '',
      personalProfile: {
        age: props.Age?.number || undefined,
        birthPlace: props.BirthPlace?.rich_text?.[0]?.text?.content || undefined,
        education: props.Education?.rich_text?.[0]?.text?.content || undefined,
        skills: props.Skills?.multi_select?.map((s: any) => s.name) || [],
        interests: props.Interests?.multi_select?.map((s: any) => s.name) || [],
        careerGoals: props.CareerGoals?.rich_text?.[0]?.text?.content || undefined
      },
      personalSurveys: [], // 別途取得
      surveyComparisons: {
        memberPercentiles: {},
        regionAverages: {},
        overallAverages: {},
        growthTrends: {},
        lastCalculated: new Date().toISOString()
      },
      secretariatComments: this.parseSecretariatComments(props.SecretariatComments),
      goals: this.parseGoals(props.Goals),
      learningLogs: this.parseLearningLogs(props.LearningLogs),
      lastUpdated: page.last_edited_time,
      updatedBy: props.UpdatedBy?.rich_text?.[0]?.text?.content || 'system'
    };
  }

  // NotionページからPersonalSurveyDataオブジェクトをパース
  private parsePersonalSurveyFromNotion(page: NotionPage): PersonalSurveyData {
    const props = page.properties;
    
    return {
      id: page.id,
      surveyType: this.mapSurveyType(props.SurveyType?.select?.name || 'general'),
      surveyTitle: props.SurveyTitle?.title?.[0]?.text?.content || '',
      submittedAt: props.SubmittedAt?.date?.start || page.created_time,
      scores: this.parseScoresFromNotion(props.Scores),
      textResponses: this.parseTextResponsesFromNotion(props.TextResponses),
      npsScore: props.NPSScore?.number || undefined,
      overallSatisfaction: props.OverallSatisfaction?.number || undefined
    };
  }

  // アンケートタイプをマッピング
  private mapSurveyType(type: string): 'pre_program' | 'mid_program' | 'post_program' | 'monthly' | 'event_specific' {
    switch (type) {
      case 'プログラム前':
        return 'pre_program';
      case 'プログラム中間':
        return 'mid_program';
      case 'プログラム後':
        return 'post_program';
      case '月次':
        return 'monthly';
      case 'イベント固有':
        return 'event_specific';
      default:
        return 'monthly';
    }
  }

  // スコアをパース（JSON形式から変換）
  private parseScoresFromNotion(scoresProperty: any): Record<string, number> {
    if (!scoresProperty?.rich_text?.[0]?.text?.content) return {};
    try {
      return JSON.parse(scoresProperty.rich_text[0].text.content);
    } catch {
      return {};
    }
  }

  // テキスト回答をパース（JSON形式から変換）
  private parseTextResponsesFromNotion(textProperty: any): Record<string, string> {
    if (!textProperty?.rich_text?.[0]?.text?.content) return {};
    try {
      return JSON.parse(textProperty.rich_text[0].text.content);
    } catch {
      return {};
    }
  }

  // 事務局コメントをパース（簡易版）
  private parseSecretariatComments(commentsProperty: any): any[] {
    // 実際の実装では、コメントの詳細構造をパース
    return [];
  }

  // 目標をパース（簡易版）
  private parseGoals(goalsProperty: any): any[] {
    // 実際の実装では、目標の詳細構造をパース
    return [];
  }

  // 学習ログをパース（簡易版）
  private parseLearningLogs(logsProperty: any): any[] {
    // 実際の実装では、ログの詳細構造をパース
    return [];
  }
}