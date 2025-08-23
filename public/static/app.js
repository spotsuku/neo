// NEO福岡 企業マイページ フロントエンドアプリケーション

class NEOFukuokaApp {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.data = {
      companies: [],
      members: [],
      attendance: [],
      lectures: [],
      dashboard: null
    };
    
    this.init();
  }

  async init() {
    // URL パラメータからデモユーザー情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const demoRole = urlParams.get('demo_role') || 'company_admin';
    const companyId = urlParams.get('company_id') || 'company-001';
    const memberId = urlParams.get('member_id') || 'member-001';
    
    // デモユーザー設定
    this.currentUser = {
      role: demoRole,
      companyId: companyId,
      memberId: memberId
    };
    
    // APIクライアント設定
    axios.defaults.params = {
      demo_role: demoRole,
      company_id: companyId,
      member_id: memberId
    };
    
    await this.loadInitialData();
    this.renderApp();
    this.setupEventListeners();
  }

  async loadInitialData() {
    try {
      // 並列でデータを取得
      const [dashboardRes, companiesRes, membersRes, attendanceRes, lecturesRes] = await Promise.all([
        axios.get('/api/dashboard'),
        axios.get('/api/companies'),
        axios.get('/api/members'),
        axios.get('/api/attendance'),
        axios.get('/api/lectures')
      ]);

      this.data.dashboard = dashboardRes.data.data;
      this.data.companies = companiesRes.data.data;
      this.data.members = membersRes.data.data;
      this.data.attendance = attendanceRes.data.data;
      this.data.lectures = lecturesRes.data.data;
      
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      this.showError('データの読み込みに失敗しました。');
    }
  }

  renderApp() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
      <div class="flex h-screen bg-gray-50">
        <!-- 左サイドバー -->
        <div class="w-64 bg-white shadow-lg">
          <div class="p-6 border-b border-gray-200">
            <h1 class="text-xl font-bold text-gray-800">
              <i class="fas fa-building mr-2 text-blue-600"></i>
              NEO福岡
            </h1>
            <p class="text-sm text-gray-600 mt-1">企業マイページ</p>
          </div>
          
          <nav class="p-4">
            <ul class="space-y-2">
              <li>
                <button onclick="app.navigateTo('home')" 
                        class="nav-item w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors ${this.currentPage === 'home' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}">
                  <i class="fas fa-home mr-3"></i>ホーム
                </button>
              </li>
              <li>
                <button onclick="app.navigateTo('lectures')" 
                        class="nav-item w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors ${this.currentPage === 'lectures' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}">
                  <i class="fas fa-chalkboard-teacher mr-3"></i>講義サマリー
                </button>
              </li>
              <li>
                <button onclick="app.navigateTo('attendance')" 
                        class="nav-item w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors ${this.currentPage === 'attendance' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}">
                  <i class="fas fa-users mr-3"></i>受講状況
                </button>
              </li>
              ${this.currentUser.role === 'academia_student' ? `
              <li>
                <button onclick="app.navigateTo('learning')" 
                        class="nav-item w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors ${this.currentPage === 'learning' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}">
                  <i class="fas fa-graduation-cap mr-3"></i>マイ学習
                </button>
              </li>
              ` : ''}
            </ul>
          </nav>
          
          <!-- ユーザー情報 -->
          <div class="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-gray-200 bg-white">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-white text-sm"></i>
              </div>
              <div class="ml-3">
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
              <h2 class="text-2xl font-semibold text-gray-800" id="page-title">
                ${this.getPageTitle()}
              </h2>
              
              <!-- フィルター -->
              <div class="flex items-center space-x-4">
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

  renderCurrentPage() {
    switch (this.currentPage) {
      case 'home':
        return this.renderHomePage();
      case 'lectures':
        return this.renderLecturesPage();
      case 'attendance':
        return this.renderAttendancePage();
      case 'learning':
        return this.renderLearningPage();
      default:
        return this.renderHomePage();
    }
  }

  renderHomePage() {
    const dashboard = this.data.dashboard || {};
    
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- 統計カード -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-chalkboard-teacher text-blue-600 text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">講義数</p>
              <p class="text-2xl font-bold text-gray-900">${dashboard.totalLectures || 0}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-users text-green-600 text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">参加者数</p>
              <p class="text-2xl font-bold text-gray-900">${dashboard.totalParticipants || 0}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-star text-yellow-600 text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">平均満足度</p>
              <p class="text-2xl font-bold text-gray-900">${dashboard.avgSatisfaction || 0}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-chart-line text-purple-600 text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">平均NPS</p>
              <p class="text-2xl font-bold text-gray-900">${dashboard.avgNPS || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- ヒーロージャーニー進捗 -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            <i class="fas fa-route mr-2"></i>ヒーロージャーニー進捗
          </h3>
          <div class="space-y-3">
            ${this.renderHeroJourneyProgress(dashboard.heroStepDistribution || {})}
          </div>
        </div>

        <!-- 最近の講義 -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            <i class="fas fa-clock mr-2"></i>最近の講義
          </h3>
          <div class="space-y-4">
            ${this.renderRecentLectures()}
          </div>
        </div>
      </div>
    `;
  }

  renderLecturesPage() {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            <i class="fas fa-chalkboard-teacher mr-2"></i>講義一覧
          </h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">講義名</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">講師</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">参加者数</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">満足度</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">理解度</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NPS</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${this.data.lectures.map(lecture => `
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${lecture.title}</div>
                    <div class="text-sm text-gray-500">${lecture.theme}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lecture.instructor}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatDate(lecture.date)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${lecture.participantCount}名</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm text-gray-900">${lecture.avgSatisfaction}</span>
                      <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div class="bg-yellow-400 h-2 rounded-full" style="width: ${(lecture.avgSatisfaction/5)*100}%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm text-gray-900">${lecture.avgUnderstanding}</span>
                      <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-400 h-2 rounded-full" style="width: ${(lecture.avgUnderstanding/5)*100}%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-900 ${lecture.avgNPS >= 0 ? 'text-green-600' : 'text-red-600'}">
                      ${lecture.avgNPS}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderAttendancePage() {
    // ロール別表示
    if (this.currentUser.role === 'academia_student') {
      return this.renderStudentAttendance();
    } else {
      return this.renderCompanyAttendance();
    }
  }

  renderStudentAttendance() {
    const myAttendance = this.data.attendance.filter(a => a.memberId === this.currentUser.memberId);
    
    return `
      <div class="space-y-6">
        <!-- 個人統計 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h4 class="text-sm font-medium text-gray-600">出席率</h4>
            <p class="text-2xl font-bold text-gray-900 mt-2">
              ${Math.round((myAttendance.filter(a => a.status === 'present').length / myAttendance.length) * 100)}%
            </p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h4 class="text-sm font-medium text-gray-600">平均満足度</h4>
            <p class="text-2xl font-bold text-gray-900 mt-2">
              ${this.calculateAverage(myAttendance.map(a => a.satisfactionScore).filter(Boolean))}
            </p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h4 class="text-sm font-medium text-gray-600">平均理解度</h4>
            <p class="text-2xl font-bold text-gray-900 mt-2">
              ${this.calculateAverage(myAttendance.map(a => a.understandingScore).filter(Boolean))}
            </p>
          </div>
        </div>

        <!-- 出席履歴 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">出席履歴</h3>
          </div>
          <div class="divide-y divide-gray-200">
            ${myAttendance.map(attendance => `
              <div class="p-6">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="text-sm font-medium text-gray-900">${attendance.lectureTitle}</h4>
                    <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(attendance.lectureDate)}</span>
                      <span><i class="fas fa-user-tie mr-1"></i>${attendance.instructor}</span>
                    </div>
                    ${attendance.comment ? `
                      <div class="mt-3 p-3 bg-gray-50 rounded-md">
                        <p class="text-sm text-gray-700">${attendance.comment}</p>
                      </div>
                    ` : ''}
                  </div>
                  <div class="ml-6 flex flex-col items-end space-y-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      attendance.status === 'present' ? 'bg-green-100 text-green-800' : 
                      attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }">
                      ${attendance.status === 'present' ? '出席' : attendance.status === 'late' ? '遅刻' : '欠席'}
                    </span>
                    ${attendance.satisfactionScore ? `
                      <div class="flex items-center space-x-2 text-xs text-gray-600">
                        <span>満足度: ${attendance.satisfactionScore}/5</span>
                        <span>理解度: ${attendance.understandingScore}/5</span>
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

  renderCompanyAttendance() {
    // 企業管理者向け受講状況表示
    const companyMembers = this.data.members;
    const companyAttendance = this.data.attendance;
    
    return `
      <div class="space-y-6">
        <!-- メンバー一覧 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">所属メンバー受講状況</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区分</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出席率</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平均満足度</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平均理解度</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ヒーローステップ</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${companyMembers.map(member => {
                  const memberAttendance = companyAttendance.filter(a => a.memberId === member.id);
                  const attendanceRate = memberAttendance.length > 0 
                    ? Math.round((memberAttendance.filter(a => a.status === 'present').length / memberAttendance.length) * 100) 
                    : 0;
                  const avgSatisfaction = this.calculateAverage(memberAttendance.map(a => a.satisfactionScore).filter(Boolean));
                  const avgUnderstanding = this.calculateAverage(memberAttendance.map(a => a.understandingScore).filter(Boolean));
                  
                  return `
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${member.name}</div>
                        <div class="text-sm text-gray-500">${member.email}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.type === 'company_selected' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }">
                          ${member.type === 'company_selected' ? '企業選抜' : 'ユース選抜'}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${attendanceRate}%</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${avgSatisfaction}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${avgUnderstanding}</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <span class="text-sm text-gray-900">Step ${member.heroStep}</span>
                          <div class="ml-2 w-20 bg-gray-200 rounded-full h-2">
                            <div class="bg-green-400 h-2 rounded-full" style="width: ${(member.heroStep/5)*100}%"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderLearningPage() {
    // アカデミア生専用のマイ学習ページ
    const myMember = this.data.members.find(m => m.id === this.currentUser.memberId);
    const myAttendance = this.data.attendance.filter(a => a.memberId === this.currentUser.memberId);
    
    return `
      <div class="space-y-6">
        <!-- 学習進捗サマリー -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            <i class="fas fa-user-graduate mr-2"></i>あなたの学習進捗
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="text-sm font-medium text-gray-600 mb-3">ヒーロージャーニー</h4>
              <div class="space-y-2">
                ${Array.from({length: 6}, (_, i) => `
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${
                      (myMember?.heroStep || 0) >= i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }">
                      ${(myMember?.heroStep || 0) >= i ? '<i class="fas fa-check text-xs"></i>' : i}
                    </div>
                    <span class="ml-3 text-sm ${(myMember?.heroStep || 0) >= i ? 'text-green-700 font-medium' : 'text-gray-500'}">
                      Step ${i}: ${this.getHeroStepName(i)}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-600 mb-3">学習統計</h4>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">総出席回数:</span>
                  <span class="text-sm font-medium text-gray-900">${myAttendance.filter(a => a.status === 'present').length}回</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">出席率:</span>
                  <span class="text-sm font-medium text-gray-900">
                    ${myAttendance.length > 0 ? Math.round((myAttendance.filter(a => a.status === 'present').length / myAttendance.length) * 100) : 0}%
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">平均満足度:</span>
                  <span class="text-sm font-medium text-gray-900">
                    ${this.calculateAverage(myAttendance.map(a => a.satisfactionScore).filter(Boolean))}/5
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">平均理解度:</span>
                  <span class="text-sm font-medium text-gray-900">
                    ${this.calculateAverage(myAttendance.map(a => a.understandingScore).filter(Boolean))}/5
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近のフィードバック -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">最近のフィードバック</h3>
          </div>
          <div class="divide-y divide-gray-200">
            ${myAttendance
              .filter(a => a.comment)
              .slice(0, 5)
              .map(attendance => `
                <div class="p-6">
                  <div class="flex items-start">
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900">${attendance.lectureTitle}</h4>
                      <p class="text-xs text-gray-500 mt-1">${this.formatDate(attendance.lectureDate)}</p>
                      <div class="mt-3 p-3 bg-blue-50 rounded-md">
                        <p class="text-sm text-gray-700">${attendance.comment}</p>
                      </div>
                    </div>
                    <div class="ml-4 flex space-x-2 text-xs">
                      <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">満足度: ${attendance.satisfactionScore}/5</span>
                      <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">理解度: ${attendance.understandingScore}/5</span>
                    </div>
                  </div>
                </div>
              `).join('') || '<div class="p-6 text-center text-gray-500">フィードバックはまだありません</div>'}
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
            <span class="text-sm text-gray-600 w-20">Step ${index}</span>
            <span class="text-sm text-gray-800 ml-2">${stepName}</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-32 bg-gray-200 rounded-full h-2">
              <div class="bg-blue-500 h-2 rounded-full" style="width: ${percentage}%"></div>
            </div>
            <span class="text-sm text-gray-600 w-8">${count}名</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderRecentLectures() {
    const recentLectures = this.data.lectures.slice(0, 3);
    
    return recentLectures.map(lecture => `
      <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
        <div class="flex-1">
          <h4 class="text-sm font-medium text-gray-900">${lecture.title}</h4>
          <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500">
            <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(lecture.date)}</span>
            <span><i class="fas fa-user-tie mr-1"></i>${lecture.instructor}</span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-900">${lecture.participantCount}名参加</div>
          <div class="text-xs text-gray-500">満足度 ${lecture.avgSatisfaction}/5</div>
        </div>
      </div>
    `).join('');
  }

  // ユーティリティメソッド
  navigateTo(page) {
    this.currentPage = page;
    this.renderApp();
  }

  getRoleDisplayName(role) {
    const roleNames = {
      'company_admin': '企業管理者',
      'academia_student': 'アカデミア生',
      'staff': '事務局',
      'owner': 'オーナー'
    };
    return roleNames[role] || role;
  }

  getPageTitle() {
    const titles = {
      'home': 'ホーム',
      'lectures': '講義サマリー',
      'attendance': '受講状況',
      'learning': 'マイ学習'
    };
    return titles[this.currentPage] || 'ホーム';
  }

  getHeroStepName(step) {
    const stepNames = ['基礎理解', '実践開始', '成果創出', 'リーダーシップ', '変革実行', 'ヒーロー'];
    return stepNames[step] || `ステップ${step}`;
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
    alert(message);
  }

  setupEventListeners() {
    // 必要に応じてイベントリスナーを設定
  }
}

// アプリケーション初期化
window.app = new NEOFukuokaApp();