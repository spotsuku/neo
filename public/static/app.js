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
        { key: 'member-management', label: 'メンバー管理', icon: 'fas fa-user-cog' },
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
}

// アプリケーション初期化
window.app = new NEODigitalPlatform();