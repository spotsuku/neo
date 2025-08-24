// NEO デジタルプラットフォーム - マルチテナント統合アプリケーション

class NEODigitalPlatform {
  constructor() {
    this.currentUser = null;
    this.currentRegion = 'FUK';
    this.currentPage = 'home';
    this.data = {
      companies: [],
      members: [],
      attendance: [],
      classes: [],
      announcements: [],
      neoProjects: [],
      committees: [],
      documents: [],
      dashboard: null,
      crossRegionStats: null
    };
    
    this.regionNames = {
      'FUK': '福岡',
      'ISK': '石川',
      'NIG': '新潟',
      'ALL': '全地域'
    };
    
    this.init();
  }

  async init() {
    // URL パラメータからユーザー情報と地域情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const demoRole = urlParams.get('demo_role') || 'student';
    const demoRegion = urlParams.get('demo_region') || 'FUK';
    const companyId = urlParams.get('company_id') || `company-${demoRegion}-001`;
    const memberId = urlParams.get('member_id') || `member-${demoRegion}-001`;
    
    // ユーザー情報設定
    this.currentUser = {
      role: demoRole,
      regionId: demoRegion,
      companyId: companyId,
      memberId: memberId,
      accessibleRegions: this.getAccessibleRegions(demoRole, demoRegion)
    };
    
    this.currentRegion = demoRegion;
    
    // APIクライアント設定
    axios.defaults.params = {
      demo_role: demoRole,
      demo_region: demoRegion,
      company_id: companyId,
      member_id: memberId
    };
    
    await this.loadInitialData();
    this.renderApp();
    this.setupEventListeners();
  }

  getAccessibleRegions(role, regionId) {
    switch (role) {
      case 'owner':
        return ['FUK', 'ISK', 'NIG', 'ALL'];
      case 'secretariat':
        return ['FUK', 'ISK', 'NIG'];
      case 'company_admin':
      case 'student':
      default:
        return [regionId];
    }
  }

  async loadInitialData() {
    try {
      // 基本データの並列取得
      const [dashboardRes, companiesRes, membersRes, attendanceRes, classesRes, announcementsRes] = await Promise.all([
        axios.get('/api/dashboard', { params: { region_id: this.currentRegion } }),
        axios.get('/api/companies', { params: { region_id: this.currentRegion } }),
        axios.get('/api/members', { params: { region_id: this.currentRegion } }),
        axios.get('/api/attendance', { params: { region_id: this.currentRegion } }),
        axios.get('/api/classes', { params: { region_id: this.currentRegion } }),
        axios.get('/api/announcements', { params: { region_id: this.currentRegion } })
      ]);

      this.data.dashboard = dashboardRes.data.data;
      this.data.companies = companiesRes.data.data;
      this.data.members = membersRes.data.data;
      this.data.attendance = attendanceRes.data.data;
      this.data.classes = classesRes.data.data;
      this.data.announcements = announcementsRes.data.data;

      // ロール別追加データ取得
      if (this.currentUser.role === 'student') {
        await this.loadStudentData();
      }
      
      if (this.currentUser.role === 'owner' || this.currentUser.role === 'secretariat') {
        await this.loadCrossRegionData();
      }
      
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      this.showError('データの読み込みに失敗しました。');
    }
  }

  async loadStudentData() {
    try {
      const [neoProjectsRes, committeesRes, documentsRes] = await Promise.all([
        axios.get('/api/neo-projects', { params: { region_id: this.currentRegion } }),
        axios.get('/api/committees', { params: { region_id: this.currentRegion } }),
        axios.get('/api/documents', { params: { region_id: this.currentRegion } })
      ]);

      this.data.neoProjects = neoProjectsRes.data.data;
      this.data.committees = committeesRes.data.data;
      this.data.documents = documentsRes.data.data;
    } catch (error) {
      console.error('学生データ読み込みエラー:', error);
    }
  }

  async loadCrossRegionData() {
    try {
      const crossRegionRes = await axios.get('/api/cross-region-stats');
      this.data.crossRegionStats = crossRegionRes.data.data;
    } catch (error) {
      console.error('地域横断データ読み込みエラー:', error);
    }
  }

  renderApp() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
      <div class="flex h-screen bg-gray-50">
        <!-- 左サイドバー -->
        <div class="w-64 bg-white shadow-lg">
          <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-neo-blue to-neo-light">
            <h1 class="text-xl font-bold text-white mb-1">
              <i class="fas fa-globe-asia mr-2"></i>NEO
            </h1>
            <p class="text-sm text-blue-100">デジタルプラットフォーム</p>
            <div class="mt-2 text-xs text-blue-100">
              <i class="fas fa-map-marker-alt mr-1"></i>${this.regionNames[this.currentRegion]}地域
            </div>
          </div>
          
          <nav class="p-4">
            ${this.renderNavigation()}
          </nav>
          
          <!-- ユーザー情報 -->
          <div class="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-gray-200 bg-white">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-gradient-to-br from-neo-blue to-neo-light rounded-full flex items-center justify-center">
                <i class="fas fa-user text-white text-sm"></i>
              </div>
              <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-gray-700">
                  ${this.getRoleDisplayName(this.currentUser.role)}
                </p>
                <p class="text-xs text-gray-500">デモモード</p>
              </div>
            </div>
          </div>
        </div>

        <!-- メインコンテンツ -->
        <div class="flex-1 flex flex-col">
          <!-- ヘッダー -->
          <header class="bg-white shadow-sm border-b border-gray-200 p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <h2 class="text-2xl font-semibold text-gray-800" id="page-title">
                  ${this.getPageTitle()}
                </h2>
                <div class="text-sm text-gray-500">
                  <i class="fas fa-map-marker-alt mr-1"></i>${this.regionNames[this.currentRegion]}
                </div>
              </div>
              
              <!-- 右側: 地域スイッチャーとフィルター -->
              <div class="flex items-center space-x-4">
                <!-- 地域スイッチャー -->
                ${this.renderRegionSwitcher()}
                
                <!-- フィルター -->
                <select class="border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option>2024年度</option>
                  <option>2023年度</option>
                </select>
                <select class="border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option>全プログラム</option>
                  <option>企業選抜</option>
                  <option>ユース選抜</option>
                </select>
              </div>
            </div>
          </header>

          <!-- ページコンテンツ -->
          <main class="flex-1 p-6 overflow-y-auto" id="main-content">
            ${this.renderCurrentPage()}
          </main>
        </div>
      </div>
    `;
  }

  renderNavigation() {
    const role = this.currentUser.role;
    const navItems = this.getNavigationItems(role);
    
    return `
      <ul class="space-y-2">
        ${navItems.map(item => `
          <li>
            <button onclick="app.navigateTo('${item.key}')" 
                    class="nav-item w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors ${this.currentPage === item.key ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}">
              <i class="${item.icon} mr-3"></i>${item.label}
            </button>
          </li>
        `).join('')}
      </ul>
    `;
  }

  getNavigationItems(role) {
    const commonItems = [
      { key: 'home', label: 'ホーム', icon: 'fas fa-home' }
    ];

    const roleSpecificItems = {
      student: [
        { key: 'classes', label: '授業', icon: 'fas fa-chalkboard-teacher' },
        { key: 'members', label: '受講生一覧', icon: 'fas fa-users' },
        { key: 'announcements', label: 'お知らせ', icon: 'fas fa-bullhorn' },
        { key: 'neo-projects', label: 'NEO公認プロジェクト', icon: 'fas fa-project-diagram' },
        { key: 'profile', label: 'プロフィール', icon: 'fas fa-user-circle' },
        { key: 'committees', label: '委員会', icon: 'fas fa-users-cog' },
        { key: 'companies', label: '企業情報', icon: 'fas fa-building' },
        { key: 'documents', label: '資料', icon: 'fas fa-folder-open' }
      ],
      company_admin: [
        { key: 'lecture-summary', label: '講義サマリー', icon: 'fas fa-chart-line' },
        { key: 'attendance', label: '受講状況', icon: 'fas fa-users' },
        { key: 'hero-journey', label: 'ヒーロージャーニー', icon: 'fas fa-route' },
        { key: 'cs-steps', label: '企業CSステップ', icon: 'fas fa-stairs' },
        { key: 'consultations', label: '共創・相談', icon: 'fas fa-handshake' },
        { key: 'hero-candidates', label: 'ヒーロー候補', icon: 'fas fa-star' },
        { key: 'export', label: 'エクスポート', icon: 'fas fa-download' }
      ],
      secretariat: [
        { key: 'dashboard', label: 'ダッシュボード', icon: 'fas fa-tachometer-alt' },
        { key: 'members', label: 'メンバー管理', icon: 'fas fa-users' },
        { key: 'member-management', label: 'メンバーカルテ', icon: 'fas fa-user-cog' },
        { key: 'consultation-management', label: '相談管理', icon: 'fas fa-clipboard-list' },
        { key: 'analytics', label: 'アンケート分析', icon: 'fas fa-poll' },
        { key: 'regional-comparison', label: '地域比較', icon: 'fas fa-globe' }
      ],
      owner: [
        { key: 'audit-logs', label: '監査ログ', icon: 'fas fa-shield-alt' },
        { key: 'cross-region', label: '地域横断比較', icon: 'fas fa-globe-americas' },
        { key: 'system-settings', label: 'システム設定', icon: 'fas fa-cogs' }
      ]
    };

    return [...commonItems, ...(roleSpecificItems[role] || [])];
  }

  renderRegionSwitcher() {
    if (this.currentUser.accessibleRegions.length <= 1) {
      return ''; // アクセス可能地域が1つのみの場合は表示しない
    }

    return `
      <div class="relative">
        <select id="region-switcher" onchange="app.switchRegion(this.value)" 
                class="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-neo-blue">
          ${this.currentUser.accessibleRegions.map(region => `
            <option value="${region}" ${region === this.currentRegion ? 'selected' : ''}>
              ${region === 'ALL' ? '🌐 ' : '📍 '}${this.regionNames[region]}
            </option>
          `).join('')}
        </select>
        <i class="fas fa-chevron-down absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
      </div>
    `;
  }

  renderCurrentPage() {
    switch (this.currentPage) {
      case 'home':
        return this.renderHomePage();
      case 'classes':
        return this.renderClassesPage();
      case 'announcements':
        return this.renderAnnouncementsPage();
      case 'neo-projects':
        return this.renderNEOProjectsPage();
      case 'profile':
        return this.renderProfilePage();
      case 'committees':
        return this.renderCommitteesPage();
      case 'companies':
        return this.renderCompaniesPage();
      case 'documents':
        return this.renderDocumentsPage();
      case 'lecture-summary':
        return this.renderLectureSummaryPage();
      case 'attendance':
        return this.renderAttendancePage();
      case 'members':
        return this.renderMembersPage();
      case 'member-card':
        return this.renderMemberCardPage();
      case 'cross-region':
        return this.renderCrossRegionPage();
      default:
        return this.renderHomePage();
    }
  }

  renderHomePage() {
    const dashboard = this.data.dashboard || {};
    
    return `
      <div class="space-y-6">
        <!-- 統計カードグリッド -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${this.renderStatCard('授業数', dashboard.totalClasses || 0, 'fas fa-chalkboard-teacher', 'from-blue-500 to-blue-600')}
          ${this.renderStatCard('参加者数', dashboard.totalParticipants || 0, 'fas fa-users', 'from-green-500 to-green-600')}
          ${this.renderStatCard('平均満足度', dashboard.avgSatisfaction || 0, 'fas fa-star', 'from-yellow-500 to-yellow-600')}
          ${this.renderStatCard('平均NPS', dashboard.avgNPS || 0, 'fas fa-chart-line', 'from-purple-500 to-purple-600')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- ヒーロージャーニー進捗 -->
          <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
              <i class="fas fa-route mr-2 text-neo-blue"></i>ヒーロージャーニー進捗
            </h3>
            <div class="space-y-3">
              ${this.renderHeroJourneyProgress(dashboard.heroStepDistribution || {})}
            </div>
          </div>

          <!-- 右パネル: 最近の活動とお知らせ -->
          <div class="space-y-6">
            <!-- 最近の活動 -->
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">
                <i class="fas fa-clock mr-2 text-neo-blue"></i>最近の活動
              </h3>
              <div class="space-y-3">
                ${this.renderRecentActivity()}
              </div>
            </div>

            <!-- 重要なお知らせ -->
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">
                <i class="fas fa-bullhorn mr-2 text-neo-blue"></i>重要なお知らせ
              </h3>
              <div class="space-y-3">
                ${this.renderImportantAnnouncements()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderStatCard(title, value, icon, gradient) {
    return `
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center">
            <i class="${icon} text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">${title}</p>
            <p class="text-2xl font-bold text-gray-900">${value}</p>
          </div>
        </div>
      </div>
    `;
  }

  renderHeroJourneyProgress(distribution) {
    const steps = ['基礎理解', '実践開始', '成果創出', 'リーダーシップ', '変革実行', 'ヒーロー'];
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    return steps.map((stepName, index) => {
      const count = distribution[index] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      
      return `
        <div class="flex items-center justify-between">
          <div class="flex items-center flex-1">
            <span class="text-sm font-medium text-gray-600 w-16">Step ${index}</span>
            <span class="text-sm text-gray-800 ml-3">${stepName}</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-32 bg-gray-200 rounded-full h-2">
              <div class="bg-gradient-to-r from-neo-blue to-neo-light h-2 rounded-full transition-all duration-500" 
                   style="width: ${percentage}%"></div>
            </div>
            <span class="text-sm text-gray-600 w-12 text-right">${count}名</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderRecentActivity() {
    const activities = this.data.dashboard?.recentActivity || [];
    if (activities.length === 0) {
      return '<p class="text-sm text-gray-500">最近の活動はありません</p>';
    }

    return activities.slice(0, 3).map(activity => `
      <div class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
        <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <i class="fas ${activity.type === 'class' ? 'fa-chalkboard-teacher' : 'fa-bullhorn'} text-gray-600 text-sm"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-900">${activity.title}</p>
          <p class="text-xs text-gray-500">${this.formatDate(activity.date)}</p>
        </div>
      </div>
    `).join('');
  }

  renderImportantAnnouncements() {
    const important = this.data.announcements.filter(a => a.category === 'important').slice(0, 3);
    if (important.length === 0) {
      return '<p class="text-sm text-gray-500">重要なお知らせはありません</p>';
    }

    return important.map(announcement => `
      <div class="border-l-4 border-red-500 bg-red-50 p-3 rounded-r">
        <p class="text-sm font-medium text-red-800">${announcement.title}</p>
        <p class="text-xs text-red-600 mt-1">${this.formatDate(announcement.publishDate)}</p>
      </div>
    `).join('');
  }

  // 学生向けページ実装
  renderClassesPage() {
    return `
      <div class="space-y-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">授業一覧</h3>
          </div>
          
          <div class="divide-y divide-gray-200">
            ${this.data.classes.map(cls => `
              <div class="p-6 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="text-lg font-medium text-gray-900">${cls.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${cls.theme}</p>
                    <div class="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                      <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(cls.date)}</span>
                      <span><i class="fas fa-clock mr-1"></i>${cls.time || '時間未定'}</span>
                      <span><i class="fas fa-user-tie mr-1"></i>${cls.instructor}</span>
                      ${cls.venue ? `<span><i class="fas fa-map-marker-alt mr-1"></i>${cls.venue}</span>` : ''}
                    </div>
                  </div>
                  <div class="ml-6 text-right">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      cls.status === 'completed' ? 'bg-green-100 text-green-800' :
                      cls.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                      'bg-red-100 text-red-800'
                    }">
                      ${cls.status === 'completed' ? '完了' : cls.status === 'scheduled' ? '予定' : 'キャンセル'}
                    </span>
                    ${cls.status === 'completed' ? `
                      <div class="mt-2 space-y-1 text-xs text-gray-600">
                        <div>満足度: ${cls.avgSatisfaction}/5</div>
                        <div>理解度: ${cls.avgUnderstanding}/5</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderAnnouncementsPage() {
    const groupedAnnouncements = this.groupAnnouncementsByCategory();
    
    return `
      <div class="space-y-6">
        ${Object.entries(groupedAnnouncements).map(([category, announcements]) => `
          <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="p-6 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800">
                ${this.getCategoryIcon(category)} ${this.getCategoryName(category)}
              </h3>
            </div>
            
            <div class="divide-y divide-gray-200">
              ${announcements.map(announcement => `
                <div class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="text-lg font-medium text-gray-900">${announcement.title}</h4>
                      <p class="text-sm text-gray-600 mt-2 line-clamp-3">${announcement.content}</p>
                      <div class="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                        <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(announcement.publishDate)}</span>
                        ${announcement.expiryDate ? `<span><i class="fas fa-hourglass-end mr-1"></i>期限: ${this.formatDate(announcement.expiryDate)}</span>` : ''}
                      </div>
                    </div>
                    <div class="ml-6">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${this.getPriorityBadgeClass(announcement.priority)}">
                        ${announcement.priority === 'high' ? '重要' : announcement.priority === 'medium' ? '通常' : '低'}
                      </span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderCrossRegionPage() {
    if (!this.data.crossRegionStats) {
      return `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <i class="fas fa-lock text-gray-400 text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">アクセス権限が必要です</h3>
          <p class="text-gray-600">地域横断比較データにアクセスするにはオーナー権限が必要です。</p>
        </div>
      `;
    }

    const stats = this.data.crossRegionStats;
    
    return `
      <div class="space-y-6">
        <!-- 地域比較グリッド -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${Object.entries(stats.regionComparison).map(([regionId, data]) => `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">
                <i class="fas fa-map-marker-alt mr-2"></i>${this.regionNames[regionId]}
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">参加者数:</span>
                  <span class="text-sm font-medium text-gray-900">${data.totalParticipants}名</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">満足度:</span>
                  <span class="text-sm font-medium text-gray-900">${data.avgSatisfaction}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">NPS:</span>
                  <span class="text-sm font-medium text-gray-900 ${data.avgNPS >= 0 ? 'text-green-600' : 'text-red-600'}">${data.avgNPS}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">出席率:</span>
                  <span class="text-sm font-medium text-gray-900">${data.attendanceRate}%</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 全体統計 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            <i class="fas fa-globe mr-2"></i>全体統計
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-neo-blue">${stats.globalStats.totalParticipants}</div>
              <div class="text-sm text-gray-600">総参加者数</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-600">${stats.globalStats.avgSatisfaction}</div>
              <div class="text-sm text-gray-600">平均満足度</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold ${stats.globalStats.avgNPS >= 0 ? 'text-green-600' : 'text-red-600'}">${stats.globalStats.avgNPS}</div>
              <div class="text-sm text-gray-600">平均NPS</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">3</div>
              <div class="text-sm text-gray-600">活動地域数</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ユーティリティメソッド
  async switchRegion(newRegionId) {
    if (newRegionId === this.currentRegion) return;
    
    this.currentRegion = newRegionId;
    
    // URL パラメータを更新
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('demo_region', newRegionId);
    const newUrl = window.location.pathname + '?' + urlParams.toString();
    window.history.pushState({}, '', newUrl);
    
    // API パラメータ更新
    axios.defaults.params.demo_region = newRegionId;
    
    // データを再読み込み
    await this.loadInitialData();
    this.renderApp();
  }

  navigateTo(page) {
    this.currentPage = page;
    this.renderApp();
  }

  groupAnnouncementsByCategory() {
    return this.data.announcements.reduce((groups, announcement) => {
      const category = announcement.category || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(announcement);
      return groups;
    }, {});
  }

  getCategoryIcon(category) {
    const icons = {
      important: '<i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>',
      event: '<i class="fas fa-calendar-star text-blue-500 mr-2"></i>',
      operation: '<i class="fas fa-cog text-gray-500 mr-2"></i>',
      general: '<i class="fas fa-info-circle text-green-500 mr-2"></i>'
    };
    return icons[category] || icons.general;
  }

  getCategoryName(category) {
    const names = {
      important: '重要なお知らせ',
      event: 'イベント情報',
      operation: '運営からのお知らせ',
      general: '一般のお知らせ'
    };
    return names[category] || '一般のお知らせ';
  }

  getPriorityBadgeClass(priority) {
    const classes = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return classes[priority] || classes.medium;
  }

  getRoleDisplayName(role) {
    const roleNames = {
      'company_admin': '企業管理者',
      'student': '学生',
      'secretariat': '事務局',
      'owner': 'オーナー'
    };
    return roleNames[role] || role;
  }

  getPageTitle() {
    const titles = {
      'home': 'ホーム',
      'classes': '授業',
      'members': '受講生一覧',
      'member-card': 'メンバーカルテ',
      'announcements': 'お知らせ',
      'neo-projects': 'NEO公認プロジェクト',
      'profile': 'プロフィール',
      'committees': '委員会',
      'companies': '企業情報',
      'documents': '資料',
      'lecture-summary': '講義サマリー',
      'attendance': '受講状況',
      'hero-journey': 'ヒーロージャーニー',
      'cross-region': '地域横断比較'
    };
    return titles[this.currentPage] || 'ホーム';
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  showError(message) {
    // エラー表示（実装簡略化）
    console.error(message);
    // 実際の実装では toast notification などを使用
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 5000);
  }

  setupEventListeners() {
    // 必要に応じてグローバルイベントリスナーを設定
    window.addEventListener('resize', () => {
      // レスポンシブ対応
    });
  }
  
  // 追加のページレンダリングメソッドは必要に応じて実装
  renderNEOProjectsPage() {
    return '<div class="p-8 text-center text-gray-500">NEO公認プロジェクトページ（実装予定）</div>';
  }

  renderProfilePage() {
    return '<div class="p-8 text-center text-gray-500">プロフィールページ（実装予定）</div>';
  }

  renderCommitteesPage() {
    return '<div class="p-8 text-center text-gray-500">委員会ページ（実装予定）</div>';
  }

  renderCompaniesPage() {
    return '<div class="p-8 text-center text-gray-500">企業情報ページ（実装予定）</div>';
  }

  renderDocumentsPage() {
    return '<div class="p-8 text-center text-gray-500">資料ページ（実装予定）</div>';
  }

  renderLectureSummaryPage() {
    return '<div class="p-8 text-center text-gray-500">講義サマリーページ（実装予定）</div>';
  }

  renderAttendancePage() {
    return '<div class="p-8 text-center text-gray-500">受講状況ページ（実装予定）</div>';
  }

  // メンバー一覧ページ（受講生一覧）
  renderMembersPage() {
    const members = this.data.members || [];
    const role = this.currentUser.role;
    
    // クラス編成情報の表示（secretariat/ownerのみ）
    const showClassAssignments = role === 'secretariat' || role === 'owner';
    
    return `
      <div class="space-y-6">
        <!-- ヘッダー -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-800">受講生一覧</h3>
              <p class="text-sm text-gray-600 mt-1">
                ${this.regionNames[this.currentRegion]}地域の受講生 ${members.length}名
              </p>
            </div>
            ${showClassAssignments ? `
              <button onclick="app.loadClassAssignments()" 
                      class="bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-dark transition-colors">
                <i class="fas fa-layer-group mr-2"></i>クラス編成表示
              </button>
            ` : ''}
          </div>
        </div>

        <!-- フィルター・検索 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex flex-wrap gap-4">
            <div class="flex-1 min-w-64">
              <input type="text" id="memberSearch" placeholder="氏名で検索..." 
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue"
                     onkeyup="app.filterMembers()">
            </div>
            <select id="selectionTypeFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue"
                    onchange="app.filterMembers()">
              <option value="">全選抜区分</option>
              <option value="company_selected">企業推薦</option>
              <option value="youth_selected">ユース選抜</option>
            </select>
            <select id="heroStepFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue"
                    onchange="app.filterMembers()">
              <option value="">全ステップ</option>
              <option value="0">ステップ0</option>
              <option value="1">ステップ1</option>
              <option value="2">ステップ2</option>
              <option value="3">ステップ3</option>
              <option value="4">ステップ4</option>
              <option value="5">ステップ5</option>
            </select>
          </div>
        </div>

        <!-- メンバーグリッド -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="membersGrid">
          ${this.renderMemberCards(members)}
        </div>
      </div>
    `;
  }

  // メンバーカード表示
  renderMemberCards(members) {
    if (members.length === 0) {
      return `
        <div class="col-span-full text-center py-12">
          <i class="fas fa-users text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-500">表示するメンバーがありません</p>
        </div>
      `;
    }

    return members.map(member => `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div class="p-6">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              ${member.profileImage ? `
                <img src="${member.profileImage}" alt="${member.name}" 
                     class="w-12 h-12 rounded-full object-cover border-2 border-gray-200">
              ` : `
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-neo-blue to-neo-light flex items-center justify-center text-white font-bold text-lg">
                  ${member.name.charAt(0)}
                </div>
              `}
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <button onclick="app.openMemberCard('${member.id}')" 
                        class="text-lg font-semibold text-gray-900 hover:text-neo-blue transition-colors cursor-pointer">
                  ${member.name}
                </button>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  member.type === 'company_selected' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }">
                  ${member.type === 'company_selected' ? '企業推薦' : 'ユース選抜'}
                </span>
              </div>
              
              <div class="mt-2 space-y-2">
                <div class="flex items-center text-sm text-gray-600">
                  <i class="fas fa-route mr-2 text-gray-400"></i>
                  <span>ヒーローステップ ${member.heroStep}/5</span>
                  <div class="ml-2 flex-1 bg-gray-200 rounded-full h-1.5">
                    <div class="bg-gradient-to-r from-neo-blue to-neo-light h-1.5 rounded-full transition-all duration-500" 
                         style="width: ${(member.heroStep / 5) * 100}%"></div>
                  </div>
                </div>
                
                ${member.attendanceRate !== undefined ? `
                  <div class="flex items-center text-sm text-gray-600">
                    <i class="fas fa-calendar-check mr-2 text-gray-400"></i>
                    <span>出席率 ${member.attendanceRate}%</span>
                  </div>
                ` : ''}
                
                ${this.currentUser.role === 'secretariat' || this.currentUser.role === 'owner' ? `
                  <div class="flex items-center text-sm text-gray-600">
                    <i class="fas fa-users-cog mr-2 text-gray-400"></i>
                    <span>クラス ${member.classNumber || '-'} / チーム ${member.teamNumber || '-'}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // メンバーカルテ詳細ページ
  renderMemberCardPage() {
    const memberCard = this.data.currentMemberCard;
    
    if (!memberCard) {
      return `
        <div class="text-center py-12">
          <i class="fas fa-user-slash text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-500">メンバーカルテが見つかりません</p>
          <button onclick="app.navigateTo('members')" 
                  class="mt-4 bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-dark transition-colors">
            メンバー一覧に戻る
          </button>
        </div>
      `;
    }

    return `
      <div class="space-y-6">
        <!-- ヘッダー・ナビゲーション -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button onclick="app.navigateTo('members')" 
                      class="text-gray-500 hover:text-gray-700 transition-colors">
                <i class="fas fa-arrow-left mr-2"></i>メンバー一覧に戻る
              </button>
              <div class="h-6 border-l border-gray-300"></div>
              <h2 class="text-xl font-bold text-gray-800">メンバーカルテ</h2>
            </div>
            ${this.currentUser.role === 'secretariat' || this.currentUser.role === 'owner' ? `
              <button onclick="app.editMemberCard('${memberCard.memberId}')" 
                      class="bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-dark transition-colors">
                <i class="fas fa-edit mr-2"></i>編集
              </button>
            ` : ''}
          </div>
        </div>

        <!-- メンバーカルテ7セクション -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左カラム: 基本情報・アンケート -->
          <div class="lg:col-span-2 space-y-6">
            ${this.renderMemberProfileSection(memberCard)}
            ${this.renderPersonalSurveysSection(memberCard)}
            ${this.renderSurveyComparisonsSection(memberCard)}
            ${this.renderLearningLogsSection(memberCard)}
          </div>
          
          <!-- 右カラム: コメント・目標・チーム -->
          <div class="space-y-6">
            ${this.renderSecretariatCommentsSection(memberCard)}
            ${this.renderGoalsSection(memberCard)}
            ${this.renderTeamMembersSection(memberCard)}
          </div>
        </div>
      </div>
    `;
  }

  // メンバーカルテセクション実装
  renderMemberProfileSection(memberCard) {
    const profile = memberCard.personalProfile || {};
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-user-circle mr-2 text-neo-blue"></i>基本プロフィール
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-600">年齢</label>
              <p class="text-gray-900">${profile.age || '-'}歳</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">出身地</label>
              <p class="text-gray-900">${profile.birthPlace || '-'}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">学歴</label>
              <p class="text-gray-900">${profile.education || '-'}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">キャリア目標</label>
              <p class="text-gray-900">${profile.careerGoals || '-'}</p>
            </div>
          </div>
          
          ${profile.skills && profile.skills.length > 0 ? `
            <div>
              <label class="text-sm font-medium text-gray-600">スキル</label>
              <div class="mt-2 flex flex-wrap gap-2">
                ${profile.skills.map(skill => `
                  <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">${skill}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${profile.interests && profile.interests.length > 0 ? `
            <div>
              <label class="text-sm font-medium text-gray-600">関心分野</label>
              <div class="mt-2 flex flex-wrap gap-2">
                ${profile.interests.map(interest => `
                  <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">${interest}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderPersonalSurveysSection(memberCard) {
    const surveys = memberCard.personalSurveys || [];
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-poll mr-2 text-neo-blue"></i>個人アンケート結果
          </h3>
        </div>
        <div class="p-6">
          ${surveys.length === 0 ? `
            <p class="text-gray-500 text-center py-8">アンケート結果がありません</p>
          ` : `
            <div class="space-y-4">
              ${surveys.slice(0, 3).map(survey => `
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-medium text-gray-800">${survey.surveyTitle}</h4>
                    <span class="text-sm text-gray-500">${this.formatDate(survey.submittedAt)}</span>
                  </div>
                  
                  ${Object.entries(survey.scores).length > 0 ? `
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      ${Object.entries(survey.scores).slice(0, 4).map(([key, value]) => `
                        <div class="flex justify-between">
                          <span class="text-gray-600">${key}:</span>
                          <span class="font-medium">${value}/5</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  ${survey.npsScore !== undefined ? `
                    <div class="mt-3 pt-3 border-t border-gray-100">
                      <div class="flex justify-between text-sm">
                        <span class="text-gray-600">NPS:</span>
                        <span class="font-medium ${survey.npsScore >= 0 ? 'text-green-600' : 'text-red-600'}">
                          ${survey.npsScore}
                        </span>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderSurveyComparisonsSection(memberCard) {
    const comparisons = memberCard.surveyComparisons || {};
    const percentiles = comparisons.memberPercentiles || {};
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-chart-bar mr-2 text-neo-blue"></i>アンケート比較分析
          </h3>
        </div>
        <div class="p-6">
          ${Object.keys(percentiles).length === 0 ? `
            <p class="text-gray-500 text-center py-8">比較データがありません</p>
          ` : `
            <div class="space-y-4">
              <div>
                <h4 class="font-medium text-gray-800 mb-3">地域内パーセンタイル</h4>
                <div class="space-y-3">
                  ${Object.entries(percentiles).slice(0, 5).map(([key, percentile]) => `
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">${key}</span>
                      <div class="flex items-center space-x-3">
                        <div class="w-24 bg-gray-200 rounded-full h-2">
                          <div class="bg-gradient-to-r from-neo-blue to-neo-light h-2 rounded-full" 
                               style="width: ${percentile}%"></div>
                        </div>
                        <span class="text-sm font-medium text-gray-800 w-12 text-right">${percentile}%</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              ${Object.keys(comparisons.growthTrends || {}).length > 0 ? `
                <div class="pt-4 border-t border-gray-200">
                  <h4 class="font-medium text-gray-800 mb-3">成長トレンド</h4>
                  <div class="space-y-2">
                    ${Object.entries(comparisons.growthTrends).slice(0, 3).map(([key, trend]) => `
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600">${key}</span>
                        <div class="flex items-center space-x-2">
                          <span class="text-gray-500">${trend.initial} → ${trend.current}</span>
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            trend.trend === 'improving' ? 'bg-green-100 text-green-800' :
                            trend.trend === 'declining' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }">
                            ${trend.trend === 'improving' ? '改善' : trend.trend === 'declining' ? '低下' : '安定'}
                          </span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderSecretariatCommentsSection(memberCard) {
    const comments = memberCard.secretariatComments || [];
    const canViewPrivate = this.currentUser.role === 'secretariat' || this.currentUser.role === 'owner';
    const visibleComments = canViewPrivate ? comments : comments.filter(c => !c.isPrivate);
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-comments mr-2 text-neo-blue"></i>事務局コメント
          </h3>
        </div>
        <div class="p-6">
          ${visibleComments.length === 0 ? `
            <p class="text-gray-500 text-center py-8">コメントがありません</p>
          ` : `
            <div class="space-y-4">
              ${visibleComments.slice(0, 5).map(comment => `
                <div class="border-l-4 ${
                  comment.priority === 'high' ? 'border-red-500 bg-red-50' :
                  comment.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-gray-500 bg-gray-50'
                } p-4 rounded-r">
                  <div class="flex items-start justify-between mb-2">
                    <span class="text-sm font-medium text-gray-800">${comment.authorName}</span>
                    <div class="flex items-center space-x-2">
                      ${comment.isPrivate ? '<i class="fas fa-lock text-red-500 text-xs"></i>' : ''}
                      <span class="text-xs text-gray-500">${this.formatDate(comment.createdAt)}</span>
                    </div>
                  </div>
                  <p class="text-sm text-gray-700">${comment.comment}</p>
                  <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    comment.category === 'progress' ? 'bg-blue-100 text-blue-800' :
                    comment.category === 'achievements' ? 'bg-green-100 text-green-800' :
                    comment.category === 'concerns' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }">
                    ${comment.category}
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderGoalsSection(memberCard) {
    const goals = memberCard.goals || [];
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-target mr-2 text-neo-blue"></i>目標設定
          </h3>
        </div>
        <div class="p-6">
          ${goals.length === 0 ? `
            <p class="text-gray-500 text-center py-8">設定された目標がありません</p>
          ` : `
            <div class="space-y-4">
              ${goals.slice(0, 3).map(goal => `
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="font-medium text-gray-800">${goal.title}</h4>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                      goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }">
                      ${goal.status === 'completed' ? '完了' :
                        goal.status === 'in_progress' ? '進行中' :
                        goal.status === 'paused' ? '一時停止' : '未開始'}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-3">${goal.description}</p>
                  <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>期限: ${this.formatDate(goal.targetDate)}</span>
                    <span>進捗: ${goal.progress}%</span>
                  </div>
                  <div class="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div class="bg-gradient-to-r from-neo-blue to-neo-light h-1.5 rounded-full" 
                         style="width: ${goal.progress}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderTeamMembersSection(memberCard) {
    // クラス編成情報から同じクラス・チームのメンバーを表示
    const classAssignment = memberCard.classAssignment;
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-users mr-2 text-neo-blue"></i>チームメンバー
          </h3>
        </div>
        <div class="p-6">
          ${!classAssignment ? `
            <p class="text-gray-500 text-center py-8">クラス編成情報がありません</p>
          ` : `
            <div class="space-y-4">
              <div class="text-center bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-800">クラス ${classAssignment.classNumber} / チーム ${classAssignment.teamNumber}</h4>
                <p class="text-sm text-gray-600 mt-1">出席番号: ${classAssignment.attendanceNumber}</p>
              </div>
              <p class="text-sm text-gray-500 text-center">
                チームメンバー情報は実装予定です
              </p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderLearningLogsSection(memberCard) {
    const logs = memberCard.learningLogs || [];
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-book mr-2 text-neo-blue"></i>学習ログ
          </h3>
        </div>
        <div class="p-6">
          ${logs.length === 0 ? `
            <p class="text-gray-500 text-center py-8">学習ログがありません</p>
          ` : `
            <div class="space-y-4">
              ${logs.slice(0, 5).map(log => `
                <div class="border-l-4 border-neo-blue bg-blue-50 p-4 rounded-r">
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="font-medium text-gray-800">${log.title}</h4>
                    <span class="text-xs text-gray-500">${this.formatDate(log.date)}</span>
                  </div>
                  <p class="text-sm text-gray-700 mb-2">${log.description}</p>
                  <div class="flex items-center justify-between text-xs text-gray-600">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">${log.category}</span>
                    ${log.hoursSpent ? `<span>学習時間: ${log.hoursSpent}時間</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // メンバーカルテ関連の操作メソッド
  async openMemberCard(memberId) {
    try {
      const response = await axios.get(`/api/member-card/${memberId}`, {
        params: { region_id: this.currentRegion }
      });
      
      if (response.data.success) {
        this.data.currentMemberCard = response.data.data;
        this.navigateTo('member-card');
      } else {
        alert('メンバーカルテの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error loading member card:', error);
      alert('メンバーカルテの読み込み中にエラーが発生しました');
    }
  }

  async loadClassAssignments() {
    try {
      const response = await axios.get('/api/class-assignments', {
        params: { region_id: this.currentRegion }
      });
      
      if (response.data.success) {
        this.data.classAssignments = response.data.data;
        this.showClassAssignmentModal();
      }
    } catch (error) {
      console.error('Error loading class assignments:', error);
      alert('クラス編成の読み込み中にエラーが発生しました');
    }
  }

  showClassAssignmentModal() {
    const assignments = this.data.classAssignments;
    if (!assignments) return;

    // 簡易モーダル表示（実際はより詳細な実装が必要）
    const modalContent = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-96 overflow-y-auto" onclick="event.stopPropagation()">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">クラス編成表 (${assignments.year}年度)</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              ${[1, 2, 3].map(classNum => `
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="font-medium text-gray-800 mb-3">クラス ${classNum}</h4>
                  <div class="space-y-2">
                    ${assignments.assignments
                      .filter(a => a.classNumber === classNum)
                      .sort((a, b) => a.attendanceNumber - b.attendanceNumber)
                      .map(member => `
                        <div class="text-sm">
                          <span class="text-gray-600">${member.attendanceNumber}.</span>
                          <span class="font-medium">${member.memberName}</span>
                          <span class="text-gray-500">(チーム${member.teamNumber})</span>
                        </div>
                      `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="p-6 border-t border-gray-200 text-right">
            <button onclick="this.closest('.fixed').remove()" 
                    class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
  }

  filterMembers() {
    const searchTerm = document.getElementById('memberSearch')?.value.toLowerCase() || '';
    const selectionType = document.getElementById('selectionTypeFilter')?.value || '';
    const heroStep = document.getElementById('heroStepFilter')?.value || '';
    
    let filteredMembers = this.data.members || [];
    
    if (searchTerm) {
      filteredMembers = filteredMembers.filter(member => 
        member.name.toLowerCase().includes(searchTerm)
      );
    }
    
    if (selectionType) {
      filteredMembers = filteredMembers.filter(member => 
        member.type === selectionType
      );
    }
    
    if (heroStep) {
      filteredMembers = filteredMembers.filter(member => 
        member.heroStep === parseInt(heroStep)
      );
    }
    
    const membersGrid = document.getElementById('membersGrid');
    if (membersGrid) {
      membersGrid.innerHTML = this.renderMemberCards(filteredMembers);
    }
  }

  async editMemberCard(memberId) {
    // メンバーカルテ編集機能は実装予定
    alert('メンバーカルテ編集機能は実装予定です');
  }
}

// アプリケーション初期化
window.app = new NEODigitalPlatform();