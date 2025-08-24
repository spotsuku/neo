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
    // セッション確認
    await this.checkSession();
    
    // URL パラメータからユーザー情報と地域情報を取得（デモモード用）
    const urlParams = new URLSearchParams(window.location.search);
    const demoRole = urlParams.get('demo_role') || 'student';
    const demoRegion = urlParams.get('demo_region') || 'FUK';
    const companyId = urlParams.get('company_id') || `company-${demoRegion}-001`;
    const memberId = urlParams.get('member_id') || `member-${demoRegion}-001`;
    
    // セッションがない場合の処理
    if (!this.currentUser) {
      // デモモードの場合はデモユーザー情報設定
      if (demoRole) {
        this.currentUser = {
          role: demoRole,
          regionId: demoRegion,
          companyId: companyId,
          memberId: memberId,
          accessibleRegions: this.getAccessibleRegions(demoRole, demoRegion)
        };
      } else {
        // デモモードでない場合はログインページにリダイレクト
        this.navigateTo('login');
        return;
      }
    }
    
    this.currentRegion = this.currentUser.regionId;
    
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

      // プロフィールデータを初期読み込み
      if (this.currentUser.memberId) {
        await this.loadCurrentUserProfile();
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
    
    // ログインが必要なページの場合は、専用レイアウトを使用
    if (this.currentPage === 'login' || this.currentPage === 'profile-completion') {
      app.innerHTML = this.renderCurrentPage();
      
      // プロフィール補完画面の場合、文字数カウンターを設定
      if (this.currentPage === 'profile-completion') {
        this.setupCharacterCounter('profileDescription', 200);
      }
      return;
    }
    
    // 通常のアプリケーションレイアウト
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
                <p class="text-xs text-gray-500">${this.currentUser.email || 'デモモード'}</p>
              </div>
              <button onclick="app.logout()" 
                      class="ml-2 text-gray-400 hover:text-gray-600 transition-colors" 
                      title="ログアウト">
                <i class="fas fa-sign-out-alt"></i>
              </button>
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
        { key: 'admin', label: '管理ダッシュボード', icon: 'fas fa-cogs' },
        { key: 'dashboard', label: 'ダッシュボード', icon: 'fas fa-tachometer-alt' },
        { key: 'members', label: 'メンバー管理', icon: 'fas fa-users' },
        { key: 'member-management', label: 'メンバーカルテ', icon: 'fas fa-user-cog' },
        { key: 'consultation-management', label: '相談管理', icon: 'fas fa-clipboard-list' },
        { key: 'analytics', label: 'アンケート分析', icon: 'fas fa-poll' },
        { key: 'regional-comparison', label: '地域比較', icon: 'fas fa-globe' }
      ],
      owner: [
        { key: 'admin', label: '管理ダッシュボード', icon: 'fas fa-cogs' },
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
      case 'login':
        return this.renderLoginPage();
      case 'profile-completion':
        return this.renderProfileCompletionPage();
      case 'admin':
        return this.renderAdminDashboard();
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
    const profile = this.data.currentProfile;
    const isEditing = this.data.isEditingProfile || false;
    
    if (!profile) {
      return `
        <div class="text-center py-12">
          <i class="fas fa-user-slash text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-500 mb-4">プロフィールが見つかりません</p>
          <button onclick="app.loadCurrentUserProfile()" 
                  class="bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-dark transition-colors">
            <i class="fas fa-reload mr-2"></i>プロフィールを読み込む
          </button>
        </div>
      `;
    }

    return `
      <div class="space-y-6">
        <!-- プロフィールヘッダー -->
        ${this.renderProfileHeader(profile, isEditing)}
        
        <!-- プロフィールコンテンツ -->
        ${isEditing ? this.renderProfileEditForm(profile) : this.renderProfileDisplay(profile)}
      </div>
    `;
  }

  // プロフィールヘッダー
  renderProfileHeader(profile, isEditing) {
    const permissions = profile.permissions || {};
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <!-- プロフィール画像 -->
              <div class="relative">
                ${profile.profileImageUrl ? `
                  <img src="${profile.profileImageUrl}" alt="${profile.fullName}" 
                       class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg">
                ` : `
                  <div class="w-20 h-20 rounded-full bg-gradient-to-br from-neo-blue to-neo-light flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    ${profile.fullName ? profile.fullName.charAt(0) : '?'}
                  </div>
                `}
                ${permissions.canEdit ? `
                  <button onclick="app.uploadProfileImage()" 
                          class="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <i class="fas fa-camera text-gray-600 text-sm"></i>
                  </button>
                ` : ''}
              </div>
              
              <!-- 基本情報 -->
              <div>
                <h1 class="text-2xl font-bold text-gray-800">${profile.fullName || '未設定'}</h1>
                ${profile.fullNameKana ? `<p class="text-sm text-gray-600 mt-1">${profile.fullNameKana}</p>` : ''}
                ${profile.jobTitle ? `<p class="text-lg text-gray-700 mt-2">${profile.jobTitle}</p>` : ''}
                ${profile.catchPhrase ? `<p class="text-neo-blue font-medium mt-1">${profile.catchPhrase}</p>` : ''}
              </div>
            </div>
            
            <!-- 編集ボタン -->
            ${permissions.canEdit ? `
              <div class="flex items-center space-x-3">
                ${isEditing ? `
                  <button onclick="app.cancelProfileEdit()" 
                          class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                    <i class="fas fa-times mr-2"></i>キャンセル
                  </button>
                  <button onclick="app.saveProfile()" 
                          class="bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-dark transition-colors">
                    <i class="fas fa-save mr-2"></i>保存
                  </button>
                ` : `
                  <button onclick="app.editProfile()" 
                          class="bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-dark transition-colors">
                    <i class="fas fa-edit mr-2"></i>編集
                  </button>
                `}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // プロフィール表示モード
  renderProfileDisplay(profile) {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左カラム: 基本情報 -->
        <div class="lg:col-span-1 space-y-6">
          ${this.renderBasicInfoCard(profile)}
          ${this.renderSocialLinksCard(profile)}
          ${this.renderConnectionsCard(profile)}
        </div>
        
        <!-- 右カラム: 自己紹介・動機 -->
        <div class="lg:col-span-2 space-y-6">
          ${this.renderProfileDescriptionCard(profile)}
          ${this.renderNEOMotivationCard(profile)}
        </div>
      </div>
    `;
  }

  // プロフィール編集フォーム
  renderProfileEditForm(profile) {
    return `
      <form id="profileForm" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左カラム: 基本情報入力 -->
        <div class="lg:col-span-1 space-y-6">
          ${this.renderBasicInfoForm(profile)}
          ${this.renderSocialLinksForm(profile)}
          ${this.renderConnectionsForm(profile)}
        </div>
        
        <!-- 右カラム: 自己紹介・動機入力 -->
        <div class="lg:col-span-2 space-y-6">
          ${this.renderProfileDescriptionForm(profile)}
          ${this.renderNEOMotivationForm(profile)}
        </div>
      </form>
    `;
  }

  // 基本情報カード（表示）
  renderBasicInfoCard(profile) {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-user mr-2 text-neo-blue"></i>基本情報
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-600">出身地</label>
              <p class="text-gray-900">${profile.birthPlace || '-'}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">出身校</label>
              <p class="text-gray-900">${profile.schools || '-'}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">誕生日</label>
              <p class="text-gray-900">${profile.birthday ? this.formatBirthday(profile.birthday) : '-'}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 基本情報フォーム（編集）
  renderBasicInfoForm(profile) {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-user mr-2 text-neo-blue"></i>基本情報
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              氏名 <span class="text-red-500">*</span>
            </label>
            <input type="text" name="fullName" value="${profile.fullName || ''}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue"
                   required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              氏名（カナ） <span class="text-red-500">*</span>
            </label>
            <input type="text" name="fullNameKana" value="${profile.fullNameKana || ''}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue"
                   required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">出身地</label>
            <input type="text" name="birthPlace" value="${profile.birthPlace || ''}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">出身校（高校/大学）</label>
            <input type="text" name="schools" value="${profile.schools || ''}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              誕生日
              <span class="text-xs text-gray-500 block">みんなでお祝いしたいので教えてください！</span>
            </label>
            <input type="date" name="birthday" value="${profile.birthday || ''}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">肩書き</label>
            <input type="text" name="jobTitle" value="${profile.jobTitle || ''}" 
                   placeholder="例：〇〇大学△△学部×年生 / 〇〇株式会社 課長"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">キャッチコピー</label>
            <input type="text" name="catchPhrase" value="${profile.catchPhrase || ''}" 
                   placeholder="例：スポーツで国を創るプロデューサー" maxlength="50"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
            <p class="text-xs text-gray-500 mt-1">50文字以内</p>
          </div>
        </div>
      </div>
    `;
  }

  // SNSリンクカード（表示）
  renderSocialLinksCard(profile) {
    const links = profile.socialLinks || {};
    const hasLinks = links.twitter || links.instagram || links.otherUrl;
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-link mr-2 text-neo-blue"></i>SNS / Web
          </h3>
        </div>
        <div class="p-6">
          ${hasLinks ? `
            <div class="space-y-3">
              ${links.twitter ? `
                <a href="https://twitter.com/${links.twitter.replace('@', '')}" target="_blank" 
                   class="flex items-center space-x-3 text-blue-600 hover:text-blue-800 transition-colors">
                  <i class="fab fa-twitter"></i>
                  <span>${links.twitter}</span>
                </a>
              ` : ''}
              ${links.instagram ? `
                <a href="https://instagram.com/${links.instagram.replace('@', '')}" target="_blank" 
                   class="flex items-center space-x-3 text-pink-600 hover:text-pink-800 transition-colors">
                  <i class="fab fa-instagram"></i>
                  <span>${links.instagram}</span>
                </a>
              ` : ''}
              ${links.otherUrl ? `
                <a href="${links.otherUrl}" target="_blank" 
                   class="flex items-center space-x-3 text-gray-600 hover:text-gray-800 transition-colors">
                  <i class="fas fa-globe"></i>
                  <span>その他URL</span>
                </a>
              ` : ''}
            </div>
          ` : `
            <p class="text-gray-500 text-center py-4">SNS情報が登録されていません</p>
          `}
        </div>
      </div>
    `;
  }

  // SNSリンクフォーム（編集）
  renderSocialLinksForm(profile) {
    const links = profile.socialLinks || {};
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-link mr-2 text-neo-blue"></i>SNS / Web
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fab fa-twitter mr-2"></i>X（Twitter）
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
              <input type="text" name="twitter" value="${(links.twitter || '').replace('@', '')}" 
                     placeholder="username"
                     class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fab fa-instagram mr-2"></i>Instagram
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
              <input type="text" name="instagram" value="${(links.instagram || '').replace('@', '')}" 
                     placeholder="username"
                     class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-globe mr-2"></i>その他URL
            </label>
            <input type="url" name="otherUrl" value="${links.otherUrl || ''}" 
                   placeholder="https://example.com"
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue">
          </div>
        </div>
      </div>
    `;
  }

  // プロフィール文カード（表示）
  renderProfileDescriptionCard(profile) {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-user-edit mr-2 text-neo-blue"></i>プロフィール
          </h3>
        </div>
        <div class="p-6">
          ${profile.profileDescription ? `
            <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">${profile.profileDescription}</p>
          ` : `
            <p class="text-gray-500 text-center py-8">プロフィールが登録されていません</p>
          `}
        </div>
      </div>
    `;
  }

  // プロフィール文フォーム（編集）
  renderProfileDescriptionForm(profile) {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-user-edit mr-2 text-neo-blue"></i>プロフィール
          </h3>
        </div>
        <div class="p-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              プロフィール文 <span class="text-red-500">*</span>
            </label>
            <textarea name="profileDescription" rows="6" maxlength="200" required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue resize-none"
                      placeholder="自己紹介を200文字以内で記入してください">${profile.profileDescription || ''}</textarea>
            <div class="flex justify-between items-center mt-2">
              <p class="text-xs text-gray-500">200文字以内（必須）</p>
              <span id="profileDescriptionCount" class="text-xs text-gray-500">
                ${(profile.profileDescription || '').length}/200
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // NEO参加動機カード（表示）
  renderNEOMotivationCard(profile) {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-lightbulb mr-2 text-neo-blue"></i>NEO参加動機
          </h3>
        </div>
        <div class="p-6">
          ${profile.neoMotivation ? `
            <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">${profile.neoMotivation}</p>
          ` : `
            <p class="text-gray-500 text-center py-8">NEO参加動機が登録されていません</p>
          `}
        </div>
      </div>
    `;
  }

  // NEO参加動機フォーム（編集）
  renderNEOMotivationForm(profile) {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-lightbulb mr-2 text-neo-blue"></i>NEO参加動機
          </h3>
        </div>
        <div class="p-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              NEOを活用して経験したいことやチャレンジしたいことを教えてください
            </label>
            <textarea name="neoMotivation" rows="8"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neo-blue focus:border-neo-blue resize-none"
                      placeholder="NEOでの目標や挑戦したいことを自由に記述してください">${profile.neoMotivation || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  // 繋がりカード（表示・編集両対応）
  renderConnectionsCard(profile) {
    const categories = profile.memberCategories || [];
    const connections = profile.fukuokaConnections || [];
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-tags mr-2 text-neo-blue"></i>区分・繋がり
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-600 block mb-2">会員区分</label>
            ${categories.length > 0 ? `
              <div class="flex flex-wrap gap-2">
                ${categories.map(cat => `
                  <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    ${this.getMemberCategoryDisplayName(cat)}
                  </span>
                `).join('')}
              </div>
            ` : `
              <p class="text-gray-500 text-sm">未設定</p>
            `}
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600 block mb-2">福岡との繋がり</label>
            ${connections.length > 0 ? `
              <div class="flex flex-wrap gap-2">
                ${connections.map(conn => `
                  <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    ${this.getFukuokaConnectionDisplayName(conn)}
                  </span>
                `).join('')}
              </div>
            ` : `
              <p class="text-gray-500 text-sm">未設定</p>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // 繋がりフォーム（編集）
  renderConnectionsForm(profile) {
    const categories = profile.memberCategories || [];
    const connections = profile.fukuokaConnections || [];
    
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-tags mr-2 text-neo-blue"></i>区分・繋がり
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会員区分（複数選択可）</label>
            <div class="grid grid-cols-1 gap-2">
              ${this.getMemberCategoryOptions().map(option => `
                <label class="flex items-center">
                  <input type="checkbox" name="memberCategories" value="${option.value}" 
                         ${categories.includes(option.value) ? 'checked' : ''}
                         class="rounded border-gray-300 text-neo-blue focus:ring-neo-blue mr-2">
                  <span class="text-sm text-gray-700">${option.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">福岡との繋がり（複数選択可）</label>
            <div class="space-y-2">
              ${this.getFukuokaConnectionOptions().map(option => `
                <label class="flex items-center">
                  <input type="checkbox" name="fukuokaConnections" value="${option.value}" 
                         ${connections.includes(option.value) ? 'checked' : ''}
                         class="rounded border-gray-300 text-neo-blue focus:ring-neo-blue mr-2">
                  <span class="text-sm text-gray-700">${option.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div>
            <label class="flex items-center">
              <input type="checkbox" name="isPublic" ${profile.isPublic ? 'checked' : ''}
                     class="rounded border-gray-300 text-neo-blue focus:ring-neo-blue mr-2">
              <span class="text-sm text-gray-700">プロフィールを公開する</span>
            </label>
          </div>
        </div>
      </div>
    `;
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

  // プロフィール関連メソッド
  async loadCurrentUserProfile() {
    try {
      const memberId = this.currentUser.memberId;
      if (!memberId) {
        alert('ユーザー情報が不正です');
        return;
      }

      const response = await axios.get(`/api/profile/${memberId}`, {
        params: { region_id: this.currentRegion }
      });

      if (response.data.success) {
        this.data.currentProfile = response.data.data;
        this.data.isEditingProfile = false;
        this.renderApp();
      } else {
        alert('プロフィールの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('プロフィールの読み込み中にエラーが発生しました');
    }
  }

  editProfile() {
    this.data.isEditingProfile = true;
    this.renderApp();
    
    // プロフィール文字数カウンター設定
    this.setupCharacterCounter('profileDescription', 200);
  }

  cancelProfileEdit() {
    this.data.isEditingProfile = false;
    this.renderApp();
  }

  async saveProfile() {
    try {
      const form = document.getElementById('profileForm');
      if (!form) return;

      // フォームデータ収集
      const formData = new FormData(form);
      const profileData = this.collectProfileFormData(formData);

      // クライアントサイドバリデーション
      const validationErrors = this.validateProfileForm(profileData);
      if (validationErrors.length > 0) {
        this.showValidationErrors(validationErrors);
        return;
      }

      const memberId = this.currentUser.memberId;
      const response = await axios.put(`/api/profile/${memberId}`, profileData, {
        params: { region_id: this.currentRegion }
      });

      if (response.data.success) {
        alert('プロフィールを更新しました');
        this.data.isEditingProfile = false;
        await this.loadCurrentUserProfile();
      } else {
        if (response.data.validationErrors) {
          this.showValidationErrors(response.data.validationErrors);
        } else {
          alert('プロフィールの更新に失敗しました');
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('プロフィールの保存中にエラーが発生しました');
    }
  }

  collectProfileFormData(formData) {
    const memberCategories = [];
    const fukuokaConnections = [];

    // チェックボックスの値を収集
    formData.getAll('memberCategories').forEach(value => {
      memberCategories.push(value);
    });
    
    formData.getAll('fukuokaConnections').forEach(value => {
      fukuokaConnections.push(value);
    });

    // SNSハンドルに@を付加
    const twitter = formData.get('twitter');
    const instagram = formData.get('instagram');

    return {
      fullName: formData.get('fullName'),
      fullNameKana: formData.get('fullNameKana'),
      birthPlace: formData.get('birthPlace'),
      schools: formData.get('schools'),
      birthday: formData.get('birthday'),
      jobTitle: formData.get('jobTitle'),
      catchPhrase: formData.get('catchPhrase'),
      profileDescription: formData.get('profileDescription'),
      neoMotivation: formData.get('neoMotivation'),
      socialLinks: {
        twitter: twitter ? `@${twitter}` : '',
        instagram: instagram ? `@${instagram}` : '',
        otherUrl: formData.get('otherUrl')
      },
      memberCategories,
      fukuokaConnections,
      isPublic: formData.get('isPublic') === 'on'
    };
  }

  validateProfileForm(profileData) {
    const errors = [];

    // 必須項目チェック
    if (!profileData.fullName || profileData.fullName.trim().length === 0) {
      errors.push({ field: 'fullName', message: '氏名は必須です' });
    }

    if (!profileData.fullNameKana || profileData.fullNameKana.trim().length === 0) {
      errors.push({ field: 'fullNameKana', message: '氏名（カナ）は必須です' });
    }

    if (!profileData.profileDescription || profileData.profileDescription.trim().length === 0) {
      errors.push({ field: 'profileDescription', message: 'プロフィール文は必須です' });
    }

    // 文字数制限チェック
    if (profileData.profileDescription && profileData.profileDescription.length > 200) {
      errors.push({ field: 'profileDescription', message: 'プロフィール文は200文字以内で入力してください' });
    }

    if (profileData.catchPhrase && profileData.catchPhrase.length > 50) {
      errors.push({ field: 'catchPhrase', message: 'キャッチコピーは50文字以内で入力してください' });
    }

    // 日付フォーマットチェック
    if (profileData.birthday && !this.isValidDateFormat(profileData.birthday)) {
      errors.push({ field: 'birthday', message: '誕生日はYYYY-MM-DD形式で入力してください' });
    }

    // SNSハンドルチェック
    if (profileData.socialLinks.twitter && !this.isValidSNSHandle(profileData.socialLinks.twitter)) {
      errors.push({ field: 'twitter', message: 'Twitterハンドルは@から始まる文字列で入力してください' });
    }

    if (profileData.socialLinks.instagram && !this.isValidSNSHandle(profileData.socialLinks.instagram)) {
      errors.push({ field: 'instagram', message: 'Instagramハンドルは@から始まる文字列で入力してください' });
    }

    // URLチェック
    if (profileData.socialLinks.otherUrl && !this.isValidUrl(profileData.socialLinks.otherUrl)) {
      errors.push({ field: 'otherUrl', message: '有効なURLを入力してください' });
    }

    return errors;
  }

  showValidationErrors(errors) {
    const errorMessages = errors.map(error => error.message).join('\n');
    alert('入力エラー:\n\n' + errorMessages);
  }

  setupCharacterCounter(textareaName, maxLength) {
    const textarea = document.querySelector(`textarea[name="${textareaName}"]`);
    const counter = document.getElementById(`${textareaName}Count`);
    
    if (textarea && counter) {
      const updateCounter = () => {
        const currentLength = textarea.value.length;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength) {
          counter.classList.add('text-red-500');
          counter.classList.remove('text-gray-500');
        } else {
          counter.classList.add('text-gray-500');
          counter.classList.remove('text-red-500');
        }
      };

      textarea.addEventListener('input', updateCounter);
      updateCounter(); // 初期表示
    }
  }

  async uploadProfileImage() {
    // 簡易実装：ファイル選択ダイアログを表示
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const memberId = this.currentUser.memberId;
        const response = await axios.post(`/api/profile/${memberId}/upload-image`, {}, {
          params: { region_id: this.currentRegion }
        });

        if (response.data.success) {
          alert('画像をアップロードしました');
          // プロフィールを再読み込み
          await this.loadCurrentUserProfile();
        } else {
          alert('画像のアップロードに失敗しました');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('画像のアップロード中にエラーが発生しました');
      }
    };

    input.click();
  }

  // ヘルパーメソッド
  formatBirthday(birthday) {
    if (!birthday) return '-';
    const date = new Date(birthday);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  isValidDateFormat(dateString) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const [year, month, day] = dateString.split('-').map(Number);
    
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  }

  isValidSNSHandle(handle) {
    return /^@[a-zA-Z0-9_]+$/.test(handle);
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  getMemberCategoryOptions() {
    return [
      { value: 'youth_selected', label: 'ユース選抜会員' },
      { value: 'company_selected', label: '企業選抜会員' },
      { value: 'corporate_member', label: '企業会員' },
      { value: 'council_member', label: '評議会会員' },
      { value: 'club_member', label: 'クラブ会員' },
      { value: 'supporting_partner', label: '応援パートナー' },
      { value: 'mentor', label: 'メンター' },
      { value: 'lecturer', label: '講師' },
      { value: 'communicator', label: 'コミュニケーター' },
      { value: 'secretariat', label: '事務局' },
      { value: 'observer', label: 'オブザーバー' },
      { value: 'committee_advisor', label: '委員会顧問' }
    ];
  }

  getFukuokaConnectionOptions() {
    return [
      { value: 'resident_worker_student', label: '福岡在住/在勤/在学' },
      { value: 'originally_from_fukuoka', label: '福岡出身で今は福岡外' },
      { value: 'want_to_connect_with_fukuoka', label: '福岡外だけど福岡と繋がりたい' }
    ];
  }

  getMemberCategoryDisplayName(category) {
    const options = this.getMemberCategoryOptions();
    const option = options.find(opt => opt.value === category);
    return option ? option.label : category;
  }

  getFukuokaConnectionDisplayName(connection) {
    const options = this.getFukuokaConnectionOptions();
    const option = options.find(opt => opt.value === connection);
    return option ? option.label : connection;
  }

  // ハイブリッド登録システム関連メソッド

  // セッション確認
  async checkSession() {
    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) return;

      const response = await axios.get('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        this.currentUser = response.data.user;
        this.currentUser.accessibleRegions = this.getAccessibleRegions(
          response.data.user.role, 
          response.data.user.regionId
        );
        
        // 初回ログインの場合、プロフィール補完画面にリダイレクト
        if (response.data.user.status === 'tentative' && response.data.user.isFirstLogin) {
          this.navigateTo('profile-completion');
        }
      } else {
        localStorage.removeItem('sessionToken');
      }
    } catch (error) {
      console.error('Session check error:', error);
      localStorage.removeItem('sessionToken');
    }
  }

  // ログイン処理
  async login() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      alert('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem('sessionToken', response.data.sessionToken);
        this.currentUser = response.data.user;
        this.currentUser.accessibleRegions = this.getAccessibleRegions(
          response.data.user.role, 
          response.data.user.regionId
        );

        // リダイレクト先に移動
        const redirectUrl = response.data.redirectUrl;
        if (redirectUrl === '/profile-completion') {
          this.navigateTo('profile-completion');
        } else {
          this.navigateTo('dashboard');
        }
      } else {
        alert('ログインに失敗しました: ' + response.data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('ログイン中にエラーが発生しました');
    }
  }

  // ログアウト処理
  async logout() {
    try {
      const token = localStorage.getItem('sessionToken');
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('sessionToken');
      this.currentUser = null;
      this.navigateTo('login');
    }
  }

  // 事務局用メンバー管理ダッシュボード
  async renderAdminDashboard() {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await axios.get('/api/admin/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const stats = response.data.data;
        
        return `
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
              <h1 class="text-3xl font-bold text-gray-900">事務局管理ダッシュボード</h1>
              <p class="mt-2 text-gray-600">ハイブリッド登録システムの管理と承認</p>
            </div>

            ${this.renderAdminStatsCards(stats)}
            ${this.renderAdminActions()}
            ${this.renderTentativeRegistrationsList()}
            ${this.renderPendingApprovalsList()}
          </div>
        `;
      } else {
        return '<div class="text-red-500">統計データの取得に失敗しました</div>';
      }
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      return '<div class="text-red-500">管理ダッシュボードの読み込み中にエラーが発生しました</div>';
    }
  }

  renderAdminStatsCards(stats) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-users text-2xl text-blue-600"></i>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500">総メンバー数</h3>
              <p class="text-2xl font-bold text-gray-900">${stats.totalMembers}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-user-clock text-2xl text-yellow-600"></i>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500">仮登録</h3>
              <p class="text-2xl font-bold text-gray-900">${stats.tentativeMembers}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-user-check text-2xl text-green-600"></i>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500">有効メンバー</h3>
              <p class="text-2xl font-bold text-gray-900">${stats.activeMembers}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-hourglass-half text-2xl text-orange-600"></i>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-500">承認待ち</h3>
              <p class="text-2xl font-bold text-gray-900">${stats.pendingApprovals}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderAdminActions() {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">管理アクション</h2>
        <div class="flex flex-wrap gap-4">
          <button onclick="app.showTentativeRegistrationForm()" 
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <i class="fas fa-user-plus mr-2"></i>仮登録作成
          </button>
          <button onclick="app.showBulkRegistrationForm()" 
                  class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <i class="fas fa-upload mr-2"></i>CSV一括登録
          </button>
          <button onclick="app.exportMemberData()" 
                  class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            <i class="fas fa-download mr-2"></i>データエクスポート
          </button>
        </div>
      </div>
    `;
  }

  renderTentativeRegistrationsList() {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">仮登録一覧</h2>
        </div>
        <div class="p-6">
          <div id="tentativeRegistrationsList">
            <p class="text-gray-500 text-center py-8">読み込み中...</p>
          </div>
        </div>
      </div>
    `;
  }

  renderPendingApprovalsList() {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">承認待ちプロフィール</h2>
        </div>
        <div class="p-6">
          <div id="pendingApprovalsList">
            <p class="text-gray-500 text-center py-8">読み込み中...</p>
          </div>
        </div>
      </div>
    `;
  }

  // 仮登録フォーム表示
  showTentativeRegistrationForm() {
    const modal = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full m-4" onclick="event.stopPropagation()">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">仮登録作成</h3>
          </div>
          <form id="tentativeRegistrationForm" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">氏名（仮）</label>
              <input type="text" name="tempName" required 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
              <input type="email" name="email" required 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">地域</label>
              <select name="regionId" required 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="FUK">福岡</option>
                <option value="ISK">石川</option>
                <option value="NIG">新潟</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">ロール</label>
              <select name="role" required 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="student">学生</option>
                <option value="company_admin">企業管理者</option>
                <option value="secretariat">事務局</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">企業ID（企業管理者の場合）</label>
              <input type="text" name="companyId" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </form>
          
          <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button onclick="this.closest('.fixed').remove()" 
                    class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              キャンセル
            </button>
            <button onclick="app.submitTentativeRegistration()" 
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              作成
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
  }

  // 仮登録作成実行
  async submitTentativeRegistration() {
    try {
      const form = document.getElementById('tentativeRegistrationForm');
      const formData = new FormData(form);
      
      const registrationData = {
        tempName: formData.get('tempName'),
        email: formData.get('email'),
        regionId: formData.get('regionId'),
        role: formData.get('role'),
        companyId: formData.get('companyId') || undefined
      };

      const token = localStorage.getItem('sessionToken');
      const response = await axios.post('/api/admin/tentative-registration', registrationData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        alert('仮登録を作成し、メール通知を送信しました');
        document.querySelector('.fixed').remove();
        this.renderApp(); // ダッシュボードを再読み込み
      } else {
        alert('仮登録の作成に失敗しました: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error creating tentative registration:', error);
      alert('仮登録の作成中にエラーが発生しました');
    }
  }

  // CSV一括登録フォーム表示
  showBulkRegistrationForm() {
    const modal = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-96 overflow-y-auto" onclick="event.stopPropagation()">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">CSV一括登録</h3>
            <p class="text-sm text-gray-600 mt-1">CSVファイルから複数のメンバーを一括で仮登録できます</p>
          </div>
          
          <div class="p-6">
            <div class="mb-4">
              <h4 class="font-medium text-gray-900 mb-2">CSVフォーマット</h4>
              <div class="bg-gray-50 p-3 rounded text-sm font-mono">
                tempName,email,regionId,role,companyId<br>
                田中太郎,tanaka@example.com,FUK,student,<br>
                佐藤花子,sato@example.com,ISK,company_admin,company-isk-001<br>
                山田次郎,yamada@example.com,NIG,secretariat,
              </div>
              <p class="text-xs text-gray-500 mt-2">
                ※ companyIdは企業管理者の場合のみ必要です<br>
                ※ regionId: FUK（福岡）、ISK（石川）、NIG（新潟）<br>
                ※ role: student（学生）、company_admin（企業管理者）、secretariat（事務局）
              </p>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">CSVファイル選択</label>
              <input type="file" id="csvFileInput" accept=".csv,.txt" 
                     class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
            </div>

            <div id="csvPreview" class="hidden mb-4">
              <h4 class="font-medium text-gray-900 mb-2">プレビュー</h4>
              <div id="csvPreviewContent" class="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto"></div>
            </div>
          </div>
          
          <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button onclick="this.closest('.fixed').remove()" 
                    class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              キャンセル
            </button>
            <button onclick="app.submitBulkRegistration()" 
                    class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              一括登録実行
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    
    // ファイル選択時のプレビュー機能
    document.getElementById('csvFileInput').addEventListener('change', this.previewCsvFile.bind(this));
  }

  // CSVファイルプレビュー
  async previewCsvFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const preview = lines.slice(0, 6).join('\n'); // 最初の6行をプレビュー

      document.getElementById('csvPreview').classList.remove('hidden');
      document.getElementById('csvPreviewContent').textContent = preview + (lines.length > 6 ? '\n...' : '');
    } catch (error) {
      console.error('Error reading CSV file:', error);
      alert('CSVファイルの読み込みに失敗しました');
    }
  }

  // CSV一括登録実行
  async submitBulkRegistration() {
    try {
      const fileInput = document.getElementById('csvFileInput');
      const file = fileInput.files[0];
      
      if (!file) {
        alert('CSVファイルを選択してください');
        return;
      }

      const text = await file.text();
      const csvData = this.parseCsvData(text);
      
      if (csvData.length === 0) {
        alert('有効なCSVデータが見つかりません');
        return;
      }

      const token = localStorage.getItem('sessionToken');
      const response = await axios.post('/api/admin/bulk-registration', { csvData }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const result = response.data.data;
        let message = `一括登録完了\n成功: ${result.successCount}件\nエラー: ${result.errorCount}件`;
        
        if (result.errors.length > 0) {
          message += '\n\nエラー詳細:';
          result.errors.slice(0, 5).forEach(error => {
            message += `\n行${error.row}: ${error.error}`;
          });
          if (result.errors.length > 5) {
            message += `\nほか${result.errors.length - 5}件のエラーがあります`;
          }
        }
        
        alert(message);
        document.querySelector('.fixed').remove();
        this.renderApp(); // ダッシュボードを再読み込み
      } else {
        alert('一括登録に失敗しました: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error submitting bulk registration:', error);
      alert('一括登録中にエラーが発生しました');
    }
  }

  // CSV データパース
  parseCsvData(text) {
    try {
      const lines = text.trim().split('\n');
      const header = lines[0].split(',').map(h => h.trim());
      const data = [];

      // ヘッダーチェック
      const expectedHeaders = ['tempName', 'email', 'regionId', 'role', 'companyId'];
      const isValidHeader = expectedHeaders.every(h => header.includes(h));
      
      if (!isValidHeader) {
        throw new Error('CSVヘッダーが正しくありません。期待するヘッダー: ' + expectedHeaders.join(', '));
      }

      // データ行処理
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 4) continue; // 最低4カラム必要

        const row = {};
        header.forEach((h, index) => {
          row[h] = values[index] || '';
        });

        // 必須項目チェック
        if (row.tempName && row.email && row.regionId && row.role) {
          // companyIdが空の場合はundefinedに変換
          if (!row.companyId) {
            row.companyId = undefined;
          }
          data.push(row);
        }
      }

      return data;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw error;
    }
  }

  // データエクスポート機能
  async exportMemberData() {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await axios.get('/api/admin/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const stats = response.data.data;
        
        // CSVデータ生成
        const csvContent = this.generateStatsCSV(stats);
        
        // ファイルダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `neo-stats-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('統計データをエクスポートしました');
      } else {
        alert('データエクスポートに失敗しました');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('データエクスポート中にエラーが発生しました');
    }
  }

  // 統計データをCSV形式に変換
  generateStatsCSV(stats) {
    let csv = 'NEO統合システム統計データ\n';
    csv += `生成日時,${new Date().toLocaleString('ja-JP')}\n\n`;
    
    csv += '全体統計\n';
    csv += 'メトリクス,値\n';
    csv += `総メンバー数,${stats.totalMembers}\n`;
    csv += `仮登録メンバー数,${stats.tentativeMembers}\n`;
    csv += `有効メンバー数,${stats.activeMembers}\n`;
    csv += `承認待ち数,${stats.pendingApprovals}\n`;
    csv += `補完率,${stats.completionRate}%\n\n`;
    
    csv += '地域別統計\n';
    csv += '地域,総数,仮登録,有効,補完率\n';
    Object.entries(stats.regionStats).forEach(([regionId, stat]) => {
      if (regionId !== 'ALL') {
        csv += `${this.regionNames[regionId] || regionId},${stat.total},${stat.tentative},${stat.active},${stat.completionRate}%\n`;
      }
    });
    
    csv += '\n最近の登録\n';
    csv += 'ID,名前,メール,地域,ステータス,作成日時\n';
    stats.recentRegistrations.forEach(reg => {
      csv += `${reg.id},${reg.name},${reg.email},${this.regionNames[reg.regionId] || reg.regionId},${reg.status},${new Date(reg.createdAt).toLocaleString('ja-JP')}\n`;
    });
    
    return csv;
  }

  // プロフィール補完画面
  renderProfileCompletionPage() {
    return `
      <div class="min-h-screen bg-gray-50 py-12">
        <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900">プロフィール補完</h1>
              <p class="mt-2 text-gray-600">初回ログインのため、プロフィール情報を補完してください</p>
            </div>

            <form id="profileCompletionForm" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">正式氏名 <span class="text-red-500">*</span></label>
                  <input type="text" name="fullName" required 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">氏名カナ <span class="text-red-500">*</span></label>
                  <input type="text" name="fullNameKana" required 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">誕生日 <span class="text-red-500">*</span></label>
                <input type="date" name="birthday" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">キャッチコピー <span class="text-red-500">*</span></label>
                <input type="text" name="catchPhrase" required maxlength="50"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">プロフィール説明（200文字以内） <span class="text-red-500">*</span></label>
                <textarea name="profileDescription" required rows="4" maxlength="200"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                <p class="mt-1 text-sm text-gray-500">
                  <span id="profileDescriptionCount">0/200</span>
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">NEO参加動機 <span class="text-red-500">*</span></label>
                <textarea name="neoMotivation" required rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">出身地</label>
                  <input type="text" name="birthPlace" 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">肩書き</label>
                  <input type="text" name="jobTitle" 
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">出身校</label>
                <input type="text" name="schools" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
            </form>

            <div class="mt-8 flex justify-end space-x-4">
              <button onclick="app.logout()" 
                      class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                ログアウト
              </button>
              <button onclick="app.submitProfileCompletion()" 
                      class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                プロフィール完成
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // プロフィール補完実行
  async submitProfileCompletion() {
    try {
      const form = document.getElementById('profileCompletionForm');
      const formData = new FormData(form);
      
      const profileData = {
        fullName: formData.get('fullName'),
        fullNameKana: formData.get('fullNameKana'),
        birthday: formData.get('birthday'),
        catchPhrase: formData.get('catchPhrase'),
        profileDescription: formData.get('profileDescription'),
        neoMotivation: formData.get('neoMotivation'),
        birthPlace: formData.get('birthPlace'),
        jobTitle: formData.get('jobTitle'),
        schools: formData.get('schools'),
        isCompleted: true,
        completedAt: new Date().toISOString()
      };

      const token = localStorage.getItem('sessionToken');
      const response = await axios.post('/api/profile-completion', profileData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        alert('プロフィール補完が完了しました。事務局の承認をお待ちください。');
        this.logout(); // セッションをクリアしてログアウト
      } else {
        alert('プロフィール補完に失敗しました: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error submitting profile completion:', error);
      alert('プロフィール補完中にエラーが発生しました');
    }
  }

  // ログイン画面の表示
  renderLoginPage() {
    return `
      <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
            NEO統合システム
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            ログインしてください
          </p>
        </div>

        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form id="loginForm" class="space-y-6">
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <div class="mt-1">
                  <input id="email" name="email" type="email" required 
                         class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
              </div>

              <div>
                <label for="password" class="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <div class="mt-1">
                  <input id="password" name="password" type="password" required 
                         class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
              </div>

              <div>
                <button type="button" onclick="app.login()" 
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  ログイン
                </button>
              </div>
            </form>

            <div class="mt-6">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300" />
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-2 bg-white text-gray-500">デモモード</span>
                </div>
              </div>

              <div class="mt-6 grid grid-cols-2 gap-3">
                <button onclick="window.location.href='/?demo_role=secretariat&demo_region=FUK'" 
                        class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  事務局デモ
                </button>
                <button onclick="window.location.href='/?demo_role=student&demo_region=FUK'" 
                        class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  学生デモ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// アプリケーション初期化
window.app = new NEODigitalPlatform();