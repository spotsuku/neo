/**
 * NEO Digital Platform - 会員管理システム
 * 事務局向け会員一覧・検索・フィルタ・編集機能
 */

// グローバル変数
let currentPage = 1;
let totalPages = 1;
let totalMembers = 0;
let currentMemberId = null;
let membersCache = [];

// デモデータ（実際の本番環境ではAPIから取得）
const demoMembers = [
    {
        id: 'member_001',
        name: '田中 学',
        email: 'student@neo-academy.jp',
        student_id: 'NEO2024001',
        company_name: '',
        membership_types: 'student,youth_selected',
        all_roles: 'student',
        status: 'active',
        hero_step: 3,
        is_hero_certified: false,
        last_login_at: '2025-01-15T10:30:00Z',
        is_inactive_30d: false,
        created_at: '2025-01-01T00:00:00Z',
        // 詳細情報
        birthdate: '2002-04-15',
        primary_role: 'student',
        tagline: '未来を切り開く学生エンジニア',
        hometown: '東京都',
        high_school: '東京都立高校',
        university: '東京大学',
        affiliation: '工学部情報科学科',
        title: '学生',
        profile_text: 'プログラミングとAIに興味があります。将来は社会課題を解決するサービスを作りたいです。',
        sns_x: '@tanaka_gaku',
        sns_instagram: 'tanaka.gaku',
        sns_tiktok: '',
        neo_motivation: 'テクノロジーで社会を変えたいから',
        admin_checks: {
            slack_connected: true,
            notion_connected: true,
            fee_paid: true,
            pledge_signed: true,
            welcome_kit_issued: true,
            notes: '積極的に参加している'
        },
        memberships: [
            { type: 'student', started_at: '2025-01-01', ended_at: null },
            { type: 'youth_selected', started_at: '2025-01-10', ended_at: null }
        ]
    },
    {
        id: 'member_002',
        name: '佐藤 花子',
        email: 'hanako@neo-academy.jp',
        student_id: 'NEO2024002',
        company_name: '',
        membership_types: 'student',
        all_roles: 'student',
        status: 'active',
        hero_step: 2,
        is_hero_certified: false,
        last_login_at: '2025-01-14T15:20:00Z',
        is_inactive_30d: false,
        created_at: '2025-01-02T00:00:00Z',
        birthdate: '2001-08-22',
        primary_role: 'student',
        tagline: 'デザインとテクノロジーの架け橋',
        hometown: '大阪府',
        high_school: '大阪府立高校',
        university: '京都大学',
        affiliation: '芸術学部デザイン科',
        title: '学生',
        profile_text: 'UI/UXデザインとフロントエンド開発に取り組んでいます。',
        sns_x: '@sato_hanako',
        sns_instagram: 'hanako.design',
        sns_tiktok: 'hanako_design',
        neo_motivation: '新しい技術を学んで成長したい',
        admin_checks: {
            slack_connected: true,
            notion_connected: false,
            fee_paid: true,
            pledge_signed: true,
            welcome_kit_issued: false,
            notes: 'Notion接続要フォローアップ'
        },
        memberships: [
            { type: 'student', started_at: '2025-01-02', ended_at: null }
        ]
    },
    {
        id: 'member_003',
        name: '企業管理者',
        email: 'staff@techcorp.com',
        student_id: '',
        company_name: 'テックコープ株式会社',
        membership_types: 'company,company_selected',
        all_roles: 'company',
        status: 'active',
        hero_step: 5,
        is_hero_certified: true,
        last_login_at: '2025-01-15T09:00:00Z',
        is_inactive_30d: false,
        created_at: '2024-12-15T00:00:00Z',
        birthdate: '1985-03-10',
        primary_role: 'company',
        tagline: '次世代人材の育成に貢献',
        hometown: '福岡県',
        high_school: '福岡県立高校',
        university: '九州大学',
        affiliation: 'テックコープ株式会社',
        title: '人事部長',
        profile_text: '新卒採用と人材育成を担当しています。若い才能の発掘に情熱を注いでいます。',
        sns_x: '@techcorp_hr',
        sns_instagram: '',
        sns_tiktok: '',
        neo_motivation: '優秀な人材との出会いを求めて',
        admin_checks: {
            slack_connected: true,
            notion_connected: true,
            fee_paid: true,
            pledge_signed: true,
            welcome_kit_issued: true,
            notes: 'VIP企業パートナー'
        },
        memberships: [
            { type: 'company', started_at: '2024-12-15', ended_at: null },
            { type: 'company_selected', started_at: '2025-01-01', ended_at: null }
        ]
    },
    {
        id: 'member_004',
        name: '山田 太郎',
        email: 'yamada@example-corp.com',
        student_id: '',
        company_name: 'エグザンプル株式会社',
        membership_types: 'company',
        all_roles: 'company',
        status: 'inactive',
        hero_step: 1,
        is_hero_certified: false,
        last_login_at: '2024-12-20T14:30:00Z',
        is_inactive_30d: true,
        created_at: '2024-11-01T00:00:00Z',
        birthdate: '1980-07-05',
        primary_role: 'company',
        tagline: 'スタートアップのCTO',
        hometown: '愛知県',
        high_school: '愛知県立高校',
        university: '名古屋大学',
        affiliation: 'エグザンプル株式会社',
        title: 'CTO',
        profile_text: 'スタートアップでCTOをしています。技術と事業の両面から会社を支えています。',
        sns_x: '@yamada_cto',
        sns_instagram: '',
        sns_tiktok: '',
        neo_motivation: '新しい技術トレンドのキャッチアップ',
        admin_checks: {
            slack_connected: false,
            notion_connected: false,
            fee_paid: false,
            pledge_signed: true,
            welcome_kit_issued: false,
            notes: '参加費未納、フォローアップ必要'
        },
        memberships: [
            { type: 'company', started_at: '2024-11-01', ended_at: null }
        ]
    },
    {
        id: 'member_005',
        name: 'デモユーザー',
        email: 'demo@neo.com',
        student_id: 'DEMO001',
        company_name: '',
        membership_types: 'student',
        all_roles: 'student',
        status: 'active',
        hero_step: 0,
        is_hero_certified: false,
        last_login_at: '2025-01-15T12:00:00Z',
        is_inactive_30d: false,
        created_at: '2025-01-15T00:00:00Z',
        birthdate: '2000-01-01',
        primary_role: 'student',
        tagline: 'テスト用アカウント',
        hometown: 'テスト県',
        high_school: 'テスト高校',
        university: 'テスト大学',
        affiliation: 'テスト学部',
        title: 'デモ',
        profile_text: 'このアカウントはデモ用です。',
        sns_x: '@demo_user',
        sns_instagram: 'demo.user',
        sns_tiktok: '',
        neo_motivation: 'デモ用アカウントです',
        admin_checks: {
            slack_connected: false,
            notion_connected: false,
            fee_paid: false,
            pledge_signed: false,
            welcome_kit_issued: false,
            notes: 'デモアカウント'
        },
        memberships: [
            { type: 'student', started_at: '2025-01-15', ended_at: null }
        ]
    }
];

/**
 * 会員データを読み込む
 * APIからデータを取得してテーブルに表示
 */
async function loadMembersData() {
    console.log('🔄 会員データ読み込み開始');
    
    try {
        showLoading();
        
        // フィルタ・検索条件を取得
        const params = buildQueryParams();
        console.log('📋 検索パラメータ:', params.toString());
        
        // 本番環境ではAPIを呼び出し
        // const response = await fetch(`/api/admin/members?${params}`, {
        //     headers: {
        //         'x-user-id': window.authManager?.getCurrentUser()?.id,
        //         'x-user-role': window.authManager?.getCurrentUser()?.role
        //     }
        // });
        
        // デモ用：ローカルフィルタリング
        const filteredMembers = filterMembersDemo(demoMembers, params);
        const result = {
            success: true,
            data: {
                page: currentPage,
                per_page: parseInt(params.get('per_page') || '25'),
                total: filteredMembers.length,
                total_pages: Math.ceil(filteredMembers.length / parseInt(params.get('per_page') || '25')),
                members: paginateMembers(filteredMembers, currentPage, parseInt(params.get('per_page') || '25'))
            }
        };
        
        if (result.success) {
            membersCache = result.data.members;
            totalMembers = result.data.total;
            totalPages = result.data.total_pages;
            
            renderMembersTable(result.data.members);
            updatePaginationInfo(result.data);
            updateMemberCount(result.data.total);
            
            console.log(`✅ 会員データ読み込み完了: ${result.data.members.length}件`);
        } else {
            throw new Error(result.message || '会員データの取得に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ 会員データ読み込みエラー:', error);
        showToast(`データ読み込みエラー: ${error.message}`, 'error');
        
        // エラー時はキャッシュされたデータを表示
        if (membersCache.length > 0) {
            renderMembersTable(membersCache);
        } else {
            renderEmptyState();
        }
    } finally {
        hideLoading();
    }
}

/**
 * デモ用フィルタリング関数
 */
function filterMembersDemo(members, params) {
    let filtered = [...members];
    
    // 検索
    const searchQuery = params.get('q');
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(member => 
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query) ||
            (member.company_name && member.company_name.toLowerCase().includes(query))
        );
    }
    
    // 会員区分フィルタ
    const membershipTypes = params.getAll('membership[]');
    if (membershipTypes.length > 0) {
        filtered = filtered.filter(member => {
            const types = member.membership_types.split(',');
            return membershipTypes.some(type => types.includes(type));
        });
    }
    
    // ロールフィルタ
    const roles = params.getAll('role[]');
    if (roles.length > 0) {
        filtered = filtered.filter(member => {
            const memberRoles = member.all_roles.split(',');
            return roles.some(role => memberRoles.includes(role));
        });
    }
    
    // ステータスフィルタ
    const statuses = params.getAll('status[]');
    if (statuses.length > 0) {
        filtered = filtered.filter(member => statuses.includes(member.status));
    }
    
    // ソート
    const sortField = params.get('sort') || 'last_login_at';
    const sortOrder = params.get('order') || 'desc';
    
    filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // 日付フィールドの処理
        if (sortField.includes('_at')) {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }
        
        // 数値フィールドの処理
        if (typeof aValue === 'number') {
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        }
        
        // 文字列フィールドの処理
        if (sortOrder === 'desc') {
            return bValue > aValue ? 1 : -1;
        } else {
            return aValue > bValue ? 1 : -1;
        }
    });
    
    return filtered;
}

/**
 * ページネーション処理
 */
function paginateMembers(members, page, perPage) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return members.slice(startIndex, endIndex);
}

/**
 * クエリパラメータを構築
 */
function buildQueryParams() {
    const params = new URLSearchParams();
    
    // ページネーション
    params.set('page', currentPage.toString());
    params.set('per_page', document.getElementById('per-page')?.value || '25');
    
    // ソート
    params.set('sort', document.getElementById('sort-field')?.value || 'last_login_at');
    params.set('order', document.getElementById('sort-order')?.value || 'desc');
    
    // 検索
    const searchQuery = document.getElementById('search-input')?.value.trim();
    if (searchQuery) {
        params.set('q', searchQuery);
    }
    
    // フィルタ
    const membershipFilter = document.getElementById('membership-filter');
    if (membershipFilter) {
        const selected = Array.from(membershipFilter.selectedOptions).map(option => option.value);
        selected.forEach(value => params.append('membership[]', value));
    }
    
    const roleFilter = document.getElementById('role-filter');
    if (roleFilter) {
        const selected = Array.from(roleFilter.selectedOptions).map(option => option.value);
        selected.forEach(value => params.append('role[]', value));
    }
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        const selected = Array.from(statusFilter.selectedOptions).map(option => option.value);
        selected.forEach(value => params.append('status[]', value));
    }
    
    return params;
}

/**
 * 会員テーブルをレンダリング
 */
function renderMembersTable(members) {
    const tbody = document.getElementById('members-table-body');
    if (!tbody) {
        console.error('❌ members-table-body要素が見つかりません');
        return;
    }
    
    if (members.length === 0) {
        renderEmptyState();
        return;
    }
    
    tbody.innerHTML = members.map((member, index) => `
        <tr class="table-row cursor-pointer hover:bg-gray-50 focus:outline-none focus:bg-gray-50" 
            tabindex="0" 
            role="button"
            onclick="openMemberDrawer('${member.id}')"
            onkeydown="handleRowKeyDown(event, '${member.id}')">
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" 
                       class="member-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                       value="${member.id}"
                       onclick="event.stopPropagation()"
                       onchange="updateBulkActionButton()">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span class="text-sm font-medium text-white">
                                ${member.name.charAt(0)}
                            </span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(member.name)}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(member.email)}</div>
                        ${member.student_id ? `<div class="text-xs text-gray-400">ID: ${escapeHtml(member.student_id)}</div>` : ''}
                        ${member.company_name ? `<div class="text-xs text-gray-400">${escapeHtml(member.company_name)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${formatMembershipBadges(member.membership_types)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${formatStatusBadge(member.status)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex items-center">
                    <div class="flex-1">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${(member.hero_step / 5) * 100}%"></div>
                        </div>
                    </div>
                    <span class="ml-2 text-xs text-gray-600">${member.hero_step}/5</span>
                    ${member.is_hero_certified ? '<i class="fas fa-certificate text-yellow-500 ml-1" title="認定済み"></i>' : ''}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>${formatDate(member.last_login_at)}</div>
                ${member.is_inactive_30d ? '<span class="text-xs text-red-600">30日以上未ログイン</span>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="openMemberDrawer('${member.id}'); event.stopPropagation();" 
                        class="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline">
                    <i class="fas fa-edit"></i>
                    編集
                </button>
            </td>
        </tr>
    `).join('');
    
    console.log(`📊 ${members.length}件の会員データをテーブルに表示しました`);
}

/**
 * 空の状態を表示
 */
function renderEmptyState() {
    const tbody = document.getElementById('members-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-12 text-center">
                <div class="text-gray-500">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p class="text-lg font-medium">会員が見つかりません</p>
                    <p class="text-sm">検索条件を変更してお試しください</p>
                </div>
            </td>
        </tr>
    `;
}

/**
 * 会員区分バッジをフォーマット
 */
function formatMembershipBadges(membershipTypes) {
    if (!membershipTypes) return '';
    
    const typeLabels = {
        'student': { label: '学生', color: 'bg-blue-100 text-blue-800' },
        'youth_selected': { label: 'ユース選出', color: 'bg-purple-100 text-purple-800' },
        'company': { label: '企業', color: 'bg-green-100 text-green-800' },
        'company_selected': { label: '企業選出', color: 'bg-indigo-100 text-indigo-800' }
    };
    
    return membershipTypes.split(',').map(type => {
        const config = typeLabels[type.trim()] || { label: type, color: 'bg-gray-100 text-gray-800' };
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} mr-1 mb-1">
                    ${config.label}
                </span>`;
    }).join('');
}

/**
 * ステータスバッジをフォーマット
 */
function formatStatusBadge(status) {
    const statusConfig = {
        'active': { label: 'アクティブ', color: 'bg-green-100 text-green-800', icon: 'fa-check-circle' },
        'inactive': { label: '非アクティブ', color: 'bg-gray-100 text-gray-800', icon: 'fa-pause-circle' },
        'suspended': { label: '停止', color: 'bg-red-100 text-red-800', icon: 'fa-ban' }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}">
                <i class="fas ${config.icon} mr-1"></i>
                ${config.label}
            </span>`;
}

/**
 * 日付をフォーマット
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今日';
        } else if (diffDays === 1) {
            return '昨日';
        } else if (diffDays < 7) {
            return `${diffDays}日前`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}週間前`;
        } else {
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } catch (error) {
        console.error('日付フォーマットエラー:', error);
        return dateString;
    }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ページネーション情報を更新
 */
function updatePaginationInfo(data) {
    const start = (data.page - 1) * data.per_page + 1;
    const end = Math.min(data.page * data.per_page, data.total);
    
    // ページネーション情報を更新
    const paginationInfo = document.getElementById('pagination-info');
    const resultsStart = document.getElementById('results-start');
    const resultsEnd = document.getElementById('results-end');
    const totalResults = document.getElementById('total-results');
    const currentPageSpan = document.getElementById('current-page');
    
    if (paginationInfo) {
        paginationInfo.textContent = `${start}-${end} / ${data.total}件`;
    }
    
    if (resultsStart) resultsStart.textContent = start.toString();
    if (resultsEnd) resultsEnd.textContent = end.toString();
    if (totalResults) totalResults.textContent = data.total.toString();
    if (currentPageSpan) currentPageSpan.textContent = data.page.toString();
    
    // ページネーションボタンの状態を更新
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (prevButton) {
        prevButton.disabled = data.page <= 1;
        prevButton.classList.toggle('opacity-50', data.page <= 1);
        prevButton.classList.toggle('cursor-not-allowed', data.page <= 1);
    }
    
    if (nextButton) {
        nextButton.disabled = data.page >= data.total_pages;
        nextButton.classList.toggle('opacity-50', data.page >= data.total_pages);
        nextButton.classList.toggle('cursor-not-allowed', data.page >= data.total_pages);
    }
    
    // グローバル変数を更新
    currentPage = data.page;
    totalPages = data.total_pages;
}

/**
 * 会員数を更新
 */
function updateMemberCount(total) {
    const memberCount = document.getElementById('member-count');
    if (memberCount) {
        memberCount.textContent = `全${total}名の会員`;
    }
}

/**
 * 前のページに移動
 */
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadMembersData();
    }
}

/**
 * 次のページに移動
 */
function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadMembersData();
    }
}

/**
 * 行のキーボード操作
 */
function handleRowKeyDown(event, memberId) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMemberDrawer(memberId);
    }
}

/**
 * 全選択チェックボックスの切り替え
 */
function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.member-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateBulkActionButton();
}

/**
 * 一括操作ボタンの状態を更新
 */
function updateBulkActionButton() {
    const checkboxes = document.querySelectorAll('.member-checkbox');
    const checkedBoxes = document.querySelectorAll('.member-checkbox:checked');
    const bulkActionBtn = document.getElementById('bulk-action-btn');
    const selectAllCheckbox = document.getElementById('select-all');
    
    if (bulkActionBtn) {
        const hasSelected = checkedBoxes.length > 0;
        bulkActionBtn.disabled = !hasSelected;
        bulkActionBtn.classList.toggle('bg-gray-400', !hasSelected);
        bulkActionBtn.classList.toggle('cursor-not-allowed', !hasSelected);
        bulkActionBtn.classList.toggle('bg-blue-600', hasSelected);
        bulkActionBtn.classList.toggle('hover:bg-blue-700', hasSelected);
        
        if (hasSelected) {
            bulkActionBtn.textContent = `${checkedBoxes.length}件選択中`;
        } else {
            bulkActionBtn.innerHTML = '<i class="fas fa-check-square mr-2"></i>一括操作';
        }
    }
    
    // 全選択チェックボックスの状態を更新
    if (selectAllCheckbox) {
        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
        selectAllCheckbox.checked = checkedBoxes.length === checkboxes.length && checkboxes.length > 0;
    }
}

/**
 * 会員詳細を読み込む
 */
async function loadMemberDetail(memberId) {
    console.log('📋 会員詳細読み込み:', memberId);
    
    try {
        // 本番環境ではAPIを呼び出し
        // const response = await fetch(`/api/admin/members/${memberId}`, {
        //     headers: {
        //         'x-user-id': window.authManager?.getCurrentUser()?.id,
        //         'x-user-role': window.authManager?.getCurrentUser()?.role
        //     }
        // });
        
        // フィーチャーフラグによる実装切り替え
        const useApiData = window.FEATURE_MEMBER_AFFILIATION_BINDING === 'on';
        let result;
        
        if (useApiData) {
            console.log('🌐 API から会員詳細を取得:', memberId);
            
            try {
                // APIから会員データを取得
                const response = await fetch('/api/members', {
                    headers: {
                        'X-User-Role': 'admin',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }
                
                const apiData = await response.json();
                const apiMember = apiData.members?.find(m => m.id === memberId);
                
                if (!apiMember) {
                    throw new Error('会員が見つかりません');
                }
                
                result = {
                    success: true,
                    data: apiMember
                };
                
                console.log('✅ API から会員詳細取得完了:', apiMember.name);
                
            } catch (apiError) {
                console.warn('⚠️ API取得エラー、ローカルデータにフォールバック:', apiError);
                
                // APIエラー時はローカルデータにフォールバック
                const member = demoMembers.find(m => m.id === memberId);
                if (!member) {
                    throw new Error('会員が見つかりません');
                }
                
                result = {
                    success: true,
                    data: member
                };
            }
        } else {
            console.log('💾 ローカルデータから会員詳細を取得');
            
            // デモ用：ローカルデータから取得
            const member = demoMembers.find(m => m.id === memberId);
            if (!member) {
                throw new Error('会員が見つかりません');
            }
            
            result = {
                success: true,
                data: member
            };
        }
        
        if (result.success) {
            currentMemberId = memberId;
            populateMemberForm(result.data);
            
            // 管理者のみ管理チェックタブを表示
            const checksTab = document.getElementById('checks-tab');
            const currentUser = window.authManager?.getCurrentUser();
            if (checksTab && currentUser?.role === 'admin') {
                checksTab.style.display = 'block';
            }
            
            console.log('✅ 会員詳細読み込み完了');
        } else {
            throw new Error(result.message || '会員詳細の取得に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ 会員詳細読み込みエラー:', error);
        showToast(`詳細取得エラー: ${error.message}`, 'error');
    }
}

/**
 * 会員フォームに詳細データを入力
 */
function populateMemberForm(member) {
    // 基本情報
    const nameInput = document.getElementById('edit-name');
    const emailInput = document.getElementById('edit-email');
    const statusSelect = document.getElementById('edit-status');
    const birthdateInput = document.getElementById('edit-birthdate');
    const roleSelect = document.getElementById('edit-role');
    
    if (nameInput) nameInput.value = member.name || '';
    if (emailInput) emailInput.value = member.email || '';
    if (statusSelect) statusSelect.value = member.status || 'active';
    if (birthdateInput) birthdateInput.value = member.birthdate || '';
    if (roleSelect) roleSelect.value = member.primary_role || member.all_roles?.split(',')[0] || 'student';
    
    // 基本情報タブの所属名フィールドも更新
    const affiliationBasicInput = document.getElementById('edit-affiliation-basic');
    if (affiliationBasicInput) affiliationBasicInput.value = member.affiliation || '';
    
    // ヒーローステップセレクターも更新
    const heroStepSelect = document.getElementById('edit-hero-step');
    if (heroStepSelect && member.hero_step !== undefined) {
        heroStepSelect.value = member.hero_step.toString();
    }
    
    // エンゲージメントステータスも適切に設定
    if (statusSelect && member.engagement_status) {
        statusSelect.value = member.engagement_status;
    }
    
    // プロフィール情報
    const taglineInput = document.getElementById('edit-tagline');
    const hometownInput = document.getElementById('edit-hometown');
    const highSchoolInput = document.getElementById('edit-high-school');
    const universityInput = document.getElementById('edit-university');
    const affiliationInput = document.getElementById('edit-affiliation');
    const titleInput = document.getElementById('edit-title');
    const profileTextArea = document.getElementById('edit-profile-text');
    const snsXInput = document.getElementById('edit-sns-x');
    const snsInstagramInput = document.getElementById('edit-sns-instagram');
    const snsTiktokInput = document.getElementById('edit-sns-tiktok');
    const neoMotivationTextArea = document.getElementById('edit-neo-motivation');
    
    if (taglineInput) taglineInput.value = member.tagline || '';
    if (hometownInput) hometownInput.value = member.hometown || '';
    if (highSchoolInput) highSchoolInput.value = member.high_school || '';
    if (universityInput) universityInput.value = member.university || '';
    if (affiliationInput) affiliationInput.value = member.affiliation || '';
    if (titleInput) titleInput.value = member.title || '';
    if (profileTextArea) profileTextArea.value = member.profile_text || '';
    if (snsXInput) snsXInput.value = member.sns_x || '';
    if (snsInstagramInput) snsInstagramInput.value = member.sns_instagram || '';
    if (snsTiktokInput) snsTiktokInput.value = member.sns_tiktok || '';
    if (neoMotivationTextArea) neoMotivationTextArea.value = member.neo_motivation || '';
    
    // 管理チェック
    if (member.admin_checks) {
        const slackCheck = document.getElementById('check-slack');
        const notionCheck = document.getElementById('check-notion');
        const feeCheck = document.getElementById('check-fee');
        const pledgeCheck = document.getElementById('check-pledge');
        const kitCheck = document.getElementById('check-kit');
        const notesTextArea = document.getElementById('checks-notes');
        
        if (slackCheck) slackCheck.checked = member.admin_checks.slack_connected || false;
        if (notionCheck) notionCheck.checked = member.admin_checks.notion_connected || false;
        if (feeCheck) feeCheck.checked = member.admin_checks.fee_paid || false;
        if (pledgeCheck) pledgeCheck.checked = member.admin_checks.pledge_signed || false;
        if (kitCheck) kitCheck.checked = member.admin_checks.welcome_kit_issued || false;
        if (notesTextArea) notesTextArea.value = member.admin_checks.notes || '';
    }
    
    // 会員区分リストを更新
    populateMembershipsList(member.memberships || []);
    
    console.log('📝 フォームデータを入力しました');
}

/**
 * 会員区分リストを表示
 */
function populateMembershipsList(memberships) {
    const membershipsList = document.getElementById('memberships-list');
    if (!membershipsList) return;
    
    membershipsList.innerHTML = memberships.map((membership, index) => `
        <div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
            <select class="membership-type flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="student" ${membership.type === 'student' ? 'selected' : ''}>学生</option>
                <option value="youth_selected" ${membership.type === 'youth_selected' ? 'selected' : ''}>ユース選出</option>
                <option value="company" ${membership.type === 'company' ? 'selected' : ''}>企業</option>
                <option value="company_selected" ${membership.type === 'company_selected' ? 'selected' : ''}>企業選出</option>
            </select>
            <input type="date" 
                   class="membership-start px-3 py-2 border border-gray-300 rounded-md text-sm"
                   value="${membership.started_at || ''}"
                   title="開始日">
            <input type="date" 
                   class="membership-end px-3 py-2 border border-gray-300 rounded-md text-sm"
                   value="${membership.ended_at || ''}"
                   title="終了日（空白の場合は継続中）">
            <button type="button" 
                    onclick="removeMembership(${index})"
                    class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

/**
 * 会員区分を削除
 */
function removeMembership(index) {
    const membershipsList = document.getElementById('memberships-list');
    if (!membershipsList) return;
    
    const items = membershipsList.children;
    if (items[index]) {
        items[index].remove();
    }
}

/**
 * 会員区分を追加
 */
function addMembership() {
    const membershipsList = document.getElementById('memberships-list');
    if (!membershipsList) return;
    
    const newMembership = document.createElement('div');
    newMembership.className = 'flex items-center space-x-3 p-3 border border-gray-200 rounded-md';
    newMembership.innerHTML = `
        <select class="membership-type flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="student">学生</option>
            <option value="youth_selected">ユース選出</option>
            <option value="company">企業</option>
            <option value="company_selected">企業選出</option>
        </select>
        <input type="date" 
               class="membership-start px-3 py-2 border border-gray-300 rounded-md text-sm"
               title="開始日">
        <input type="date" 
               class="membership-end px-3 py-2 border border-gray-300 rounded-md text-sm"
               title="終了日（空白の場合は継続中）">
        <button type="button" 
                onclick="this.parentElement.remove()"
                class="text-red-600 hover:text-red-800">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    membershipsList.appendChild(newMembership);
}

// 会員区分追加ボタンのイベントリスナーを設定
document.addEventListener('DOMContentLoaded', function() {
    const addMembershipBtn = document.getElementById('add-membership-btn');
    if (addMembershipBtn) {
        addMembershipBtn.addEventListener('click', addMembership);
    }
});

/**
 * 会員データを保存
 */
async function saveMemberData(closeAfterSave = false) {
    if (!currentMemberId) {
        showToast('保存する会員が選択されていません', 'error');
        return;
    }
    
    console.log('💾 会員データ保存開始:', currentMemberId);
    
    try {
        // フォームデータを収集
        const formData = collectFormData();
        
        // 本番環境ではAPIを呼び出し
        // const response = await fetch(`/api/admin/members/${currentMemberId}`, {
        //     method: 'PUT',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'x-user-id': window.authManager?.getCurrentUser()?.id,
        //         'x-user-role': window.authManager?.getCurrentUser()?.role
        //     },
        //     body: JSON.stringify(formData)
        // });
        
        // API経由でデータを更新（統一されたデータソース使用）
        let result = { success: true };
        
        // フィーチャーフラグによるAPI更新制御
        if (window.FEATURE_MEMBER_AFFILIATION_BINDING === 'on') {
            try {
                // ヒーローステップとステータスの更新を実行
                console.log('🌐 API経由でデータ更新実行');
                
                // hero-step-update.jsで実装されている更新処理を呼び出し
                if (window.currentMemberId) {
                    console.log('🔄 API更新処理を実行');
                    
                    // ヒーローステップ更新
                    const heroStepSelect = document.getElementById('edit-hero-step');
                    if (heroStepSelect) {
                        await updateMemberHeroStep(window.currentMemberId, parseInt(heroStepSelect.value));
                    }
                    
                    // ステータス更新
                    const statusSelect = document.getElementById('edit-status');
                    if (statusSelect && ['core', 'active', 'peripheral', 'at_risk'].includes(statusSelect.value)) {
                        await updateMemberStatus(window.currentMemberId, statusSelect.value);
                    }
                }
                
            } catch (error) {
                console.warn('⚠️ API更新エラー、ローカルフォールバック:', error);
                // フォールバック：ローカルデータを更新
                const memberIndex = demoMembers.findIndex(m => m.id === currentMemberId);
                if (memberIndex >= 0) {
                    demoMembers[memberIndex] = { ...demoMembers[memberIndex], ...formData };
                }
            }
        } else {
            // フィーチャーフラグOFF：従来のローカル更新
            const memberIndex = demoMembers.findIndex(m => m.id === currentMemberId);
            if (memberIndex >= 0) {
                demoMembers[memberIndex] = { ...demoMembers[memberIndex], ...formData };
            }
        }
        
        if (result.success) {
            showToast('会員情報を保存しました', 'success');
            
            // テーブルを再読み込み（新しいAPIデータ取得）
            if (typeof window.loadMembersData === 'function') {
                console.log('🔄 APIデータを再読み込み');
                // 少し遅延を入れてAPIの更新が完了してから再読み込み
                setTimeout(() => {
                    window.loadMembersData();
                }, 500);
            } else {
                console.log('🔄 従来のデータを再読み込み');
                loadMembersData();
            }
            
            if (closeAfterSave) {
                closeMemberDrawer();
            }
            
            console.log('✅ 会員データ保存完了');
        } else {
            throw new Error(result.message || '保存に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ 会員データ保存エラー:', error);
        showToast(`保存エラー: ${error.message}`, 'error');
    }
}

/**
 * ヒーローステップ更新API呼び出し
 */
async function updateMemberHeroStep(memberId, heroStep) {
    try {
        console.log('📈 ヒーローステップ更新:', { memberId, heroStep });
        
        const response = await fetch(`/api/members/${memberId}/hero-step`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': 'admin'
            },
            body: JSON.stringify({
                current_step: heroStep,
                notes: `Updated via admin interface at ${new Date().toISOString()}`,
                step_updated_by: 1
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ ヒーローステップ更新成功:', result);
        } else {
            const error = await response.json();
            console.error('❌ ヒーローステップ更新失敗:', error);
        }
    } catch (error) {
        console.error('❌ ヒーローステップ更新エラー:', error);
    }
}

/**
 * ステータス更新API呼び出し
 */
async function updateMemberStatus(memberId, status) {
    try {
        console.log('📊 ステータス更新:', { memberId, status });
        
        const response = await fetch(`/api/members/${memberId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': 'admin'
            },
            body: JSON.stringify({
                engagement_status: status
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ ステータス更新成功:', result);
        } else {
            const error = await response.json();
            console.error('❌ ステータス更新失敗:', error);
        }
    } catch (error) {
        console.error('❌ ステータス更新エラー:', error);
    }
}

/**
 * フォームデータを収集
 */
function collectFormData() {
    const formData = {};
    
    // 基本情報
    const nameInput = document.getElementById('edit-name');
    const statusSelect = document.getElementById('edit-status');
    const birthdateInput = document.getElementById('edit-birthdate');
    const roleSelect = document.getElementById('edit-role');
    
    if (nameInput) formData.name = nameInput.value;
    if (statusSelect) formData.status = statusSelect.value;
    if (birthdateInput) formData.birthdate = birthdateInput.value;
    if (roleSelect) formData.primary_role = roleSelect.value;
    
    // プロフィール情報
    const taglineInput = document.getElementById('edit-tagline');
    const hometownInput = document.getElementById('edit-hometown');
    const highSchoolInput = document.getElementById('edit-high-school');
    const universityInput = document.getElementById('edit-university');
    const affiliationInput = document.getElementById('edit-affiliation');
    const titleInput = document.getElementById('edit-title');
    const profileTextArea = document.getElementById('edit-profile-text');
    const snsXInput = document.getElementById('edit-sns-x');
    const snsInstagramInput = document.getElementById('edit-sns-instagram');
    const snsTiktokInput = document.getElementById('edit-sns-tiktok');
    const neoMotivationTextArea = document.getElementById('edit-neo-motivation');
    
    if (taglineInput) formData.tagline = taglineInput.value;
    if (hometownInput) formData.hometown = hometownInput.value;
    if (highSchoolInput) formData.high_school = highSchoolInput.value;
    if (universityInput) formData.university = universityInput.value;
    if (affiliationInput) formData.affiliation = affiliationInput.value;
    if (titleInput) formData.title = titleInput.value;
    if (profileTextArea) formData.profile_text = profileTextArea.value;
    if (snsXInput) formData.sns_x = snsXInput.value;
    if (snsInstagramInput) formData.sns_instagram = snsInstagramInput.value;
    if (snsTiktokInput) formData.sns_tiktok = snsTiktokInput.value;
    if (neoMotivationTextArea) formData.neo_motivation = neoMotivationTextArea.value;
    
    // 管理チェック
    const slackCheck = document.getElementById('check-slack');
    const notionCheck = document.getElementById('check-notion');
    const feeCheck = document.getElementById('check-fee');
    const pledgeCheck = document.getElementById('check-pledge');
    const kitCheck = document.getElementById('check-kit');
    const notesTextArea = document.getElementById('checks-notes');
    
    formData.admin_checks = {
        slack_connected: slackCheck?.checked || false,
        notion_connected: notionCheck?.checked || false,
        fee_paid: feeCheck?.checked || false,
        pledge_signed: pledgeCheck?.checked || false,
        welcome_kit_issued: kitCheck?.checked || false,
        notes: notesTextArea?.value || ''
    };
    
    // 会員区分
    const membershipsList = document.getElementById('memberships-list');
    if (membershipsList) {
        const memberships = [];
        const membershipItems = membershipsList.children;
        
        for (let i = 0; i < membershipItems.length; i++) {
            const item = membershipItems[i];
            const typeSelect = item.querySelector('.membership-type');
            const startInput = item.querySelector('.membership-start');
            const endInput = item.querySelector('.membership-end');
            
            if (typeSelect?.value) {
                memberships.push({
                    type: typeSelect.value,
                    started_at: startInput?.value || null,
                    ended_at: endInput?.value || null
                });
            }
        }
        
        formData.memberships = memberships;
    }
    
    return formData;
}

/**
 * CSV出力
 */
async function exportMembersCSV() {
    console.log('📊 CSV出力開始');
    
    try {
        // 現在のフィルタ条件でデータを取得
        const params = buildQueryParams();
        
        // 本番環境ではAPIを呼び出し
        // const response = await fetch(`/api/admin/members/export.csv?${params}`, {
        //     headers: {
        //         'x-user-id': window.authManager?.getCurrentUser()?.id,
        //         'x-user-role': window.authManager?.getCurrentUser()?.role
        //     }
        // });
        
        // デモ用：ローカルデータからCSVを生成
        const filteredMembers = filterMembersDemo(demoMembers, params);
        const csvContent = generateCSV(filteredMembers);
        downloadCSV(csvContent, 'members.csv');
        
        showToast('CSV出力が完了しました', 'success');
        console.log('✅ CSV出力完了');
        
    } catch (error) {
        console.error('❌ CSV出力エラー:', error);
        showToast(`CSV出力エラー: ${error.message}`, 'error');
    }
}

/**
 * CSVを生成
 */
function generateCSV(members) {
    const headers = [
        'ID', '氏名', 'メールアドレス', '学籍番号', '企業名', '会員区分', 
        'ロール', 'ステータス', 'ヒーローステップ', '最終ログイン', '登録日'
    ];
    
    const rows = members.map(member => [
        member.id,
        member.name,
        member.email,
        member.student_id || '',
        member.company_name || '',
        member.membership_types,
        member.all_roles,
        member.status,
        member.hero_step,
        member.last_login_at,
        member.created_at
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    return '\uFEFF' + csvContent; // BOM付きで日本語対応
}

/**
 * CSVをダウンロード
 */
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 初期化時にイベントリスナーをバインド
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 会員管理システム初期化');
});

/**
 * ドロワーを開く
 */
function openMemberDrawer(memberId) {
    console.log('📂 会員ドロワーを開く:', memberId);
    const drawer = document.getElementById('member-drawer');
    
    drawer.classList.remove('hidden');
    setTimeout(() => {
        drawer.classList.remove('translate-x-full');
    }, 10);
    
    // 削除ボタンの表示制御（遅延実行で確実に要素が存在することを保証）
    setTimeout(() => {
        const deleteBtn = document.getElementById('delete-member-btn');
        console.log('🔍 削除ボタン要素検索:', deleteBtn ? '見つかりました' : '見つかりません');
        
        if (deleteBtn) {
            if (memberId) {
                // 既存会員の場合は削除ボタンを表示
                deleteBtn.style.display = 'inline-flex';
                deleteBtn.style.visibility = 'visible';
                console.log('🗑️ 削除ボタンを表示 (既存会員):', memberId);
            } else {
                // 新規作成の場合は削除ボタンを非表示
                deleteBtn.style.display = 'none';
                console.log('🚫 削除ボタンを非表示 (新規作成)');
            }
        } else {
            console.error('❌ 削除ボタン要素が見つかりません');
        }
    }, 100);
    
    // 会員詳細データを読み込み
    if (typeof loadMemberDetail === 'function') {
        loadMemberDetail(memberId);
    }
}

/**
 * ドロワーを閉じる
 */
function closeMemberDrawer() {
    console.log('📂 会員ドロワーを閉じる');
    const drawer = document.getElementById('member-drawer');
    
    drawer.classList.add('translate-x-full');
    setTimeout(() => {
        drawer.classList.add('hidden');
    }, 300);
}

// グローバル関数として公開
window.loadMembersData = loadMembersData;
window.openMemberDrawer = openMemberDrawer;
window.closeMemberDrawer = closeMemberDrawer;
window.saveMemberData = saveMemberData;
window.loadMemberDetail = loadMemberDetail;
window.exportMembersCSV = exportMembersCSV;
window.goToPrevPage = goToPrevPage;
window.goToNextPage = goToNextPage;
window.toggleSelectAll = toggleSelectAll;
window.updateBulkActionButton = updateBulkActionButton;
window.handleRowKeyDown = handleRowKeyDown;
window.addMembership = addMembership;
window.removeMembership = removeMembership;