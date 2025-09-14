/**
 * NEO Digital Platform - 新規会員作成機能
 * 既存のUI/UXを変更せず、機能のみを追加
 */

(function() {
    'use strict';

    // 新規会員作成モード判定フラグ
    let isCreateMode = false;

    // 初期化
    function init() {
        console.log('🔧 会員作成機能初期化');
        
        // 新規追加ボタンのイベントリスナー設定
        const newMemberBtn = document.querySelector('[data-hook="new-member-btn"]');
        if (newMemberBtn) {
            newMemberBtn.addEventListener('click', handleNewMemberClick);
            console.log('✅ 新規追加ボタンにイベントリスナー設定完了');
        }

        // 既存の保存ボタンのイベントリスナー拡張
        const saveBtn = document.getElementById('save-member-btn');
        const saveCloseBtn = document.getElementById('save-close-btn');
        
        if (saveBtn) {
            // 既存のイベントリスナーを削除して新しいものを設定
            saveBtn.removeEventListener('click', window.saveMemberData);
            saveBtn.addEventListener('click', handleSaveClick);
        }
        
        if (saveCloseBtn) {
            // 既存のイベントリスナーを削除して新しいものを設定
            saveCloseBtn.removeEventListener('click', window.saveMemberData);
            saveCloseBtn.addEventListener('click', (e) => handleSaveClick(e, true));
        }
    }

    // 新規追加ボタンクリックハンドラー
    function handleNewMemberClick(e) {
        e.preventDefault();
        console.log('➕ 新規会員追加開始');
        
        // 新規作成モードに設定
        isCreateMode = true;
        window.currentMemberId = null;
        
        // ドロワーのタイトルを変更
        const drawerTitle = document.querySelector('#member-drawer h2');
        if (drawerTitle) {
            drawerTitle.innerHTML = '<i class="fas fa-user-plus mr-2"></i>新規会員登録';
        }

        // フォームをクリア
        clearMemberForm();
        
        // 管理チェックタブを非表示（新規作成時は不要）
        const checksTab = document.getElementById('checks-tab');
        if (checksTab) {
            checksTab.style.display = 'none';
        }
        
        // 基本情報タブをアクティブに
        if (typeof window.switchTab === 'function') {
            window.switchTab('basic');
        }
        
        // ドロワーを開く
        if (typeof window.openMemberDrawer === 'function') {
            // 既存関数を使用（memberIdなしで呼び出し）
            const drawer = document.getElementById('member-drawer');
            drawer.classList.remove('hidden');
            setTimeout(() => {
                drawer.classList.remove('translate-x-full');
            }, 10);
        }
    }

    // フォームクリア関数
    function clearMemberForm() {
        console.log('🧹 フォームクリア');
        
        // 基本情報フィールド
        const fields = [
            'member-name', 'member-email', 'member-student-id', 'member-company-name',
            'member-role', 'member-status', 'member-hero-step'
        ];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });

        // プロフィールフィールド
        const profileFields = [
            'member-birthdate', 'member-tagline', 'member-hometown', 'member-high-school',
            'member-university', 'member-affiliation', 'member-title', 'member-profile-text',
            'member-sns-x', 'member-sns-instagram', 'member-sns-tiktok', 'member-neo-motivation'
        ];
        
        profileFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });

        // 会員区分リストクリア
        const membershipsList = document.getElementById('memberships-list');
        if (membershipsList) {
            membershipsList.innerHTML = '';
        }
    }

    // 保存ボタンクリックハンドラー
    async function handleSaveClick(e, shouldClose = false) {
        e.preventDefault();
        
        if (isCreateMode) {
            console.log('💾 新規会員作成保存開始');
            await createNewMember(shouldClose);
        } else {
            console.log('💾 既存会員更新保存開始');
            // 既存の更新処理を呼び出し
            if (typeof window.saveMemberData === 'function') {
                window.saveMemberData(shouldClose);
            }
        }
    }

    // 新規会員作成API呼び出し
    async function createNewMember(shouldClose = false) {
        try {
            showLoading();
            
            // フォームデータ収集
            const memberData = collectMemberData();
            
            // バリデーション
            const validationResult = validateMemberData(memberData);
            if (!validationResult.isValid) {
                showToast(validationResult.message, 'error');
                return;
            }

            // API呼び出し
            const response = await fetch('/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(memberData)
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ 新規会員作成成功:', result);
                showToast('新規会員を作成しました', 'success');
                
                // 作成モード終了
                isCreateMode = false;
                
                // ドロワータイトルを元に戻す
                const drawerTitle = document.querySelector('#member-drawer h2');
                if (drawerTitle) {
                    drawerTitle.innerHTML = '<i class="fas fa-user-edit mr-2"></i>会員詳細編集';
                }
                
                // 会員一覧を再読み込み
                if (typeof window.loadMembersData === 'function') {
                    window.loadMembersData();
                }
                
                if (shouldClose) {
                    if (typeof window.closeMemberDrawer === 'function') {
                        window.closeMemberDrawer();
                    }
                }
            } else {
                console.error('❌ 新規会員作成失敗:', result);
                showToast(result.error || '会員作成に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('❌ 新規会員作成エラー:', error);
            showToast('ネットワークエラーが発生しました', 'error');
        } finally {
            hideLoading();
        }
    }

    // フォームデータ収集
    function collectMemberData() {
        const getValue = (id) => {
            const field = document.getElementById(id);
            return field ? field.value.trim() : '';
        };

        // 会員区分収集
        const membershipTypes = [];
        document.querySelectorAll('#memberships-list input[type="checkbox"]:checked').forEach(checkbox => {
            membershipTypes.push(checkbox.value);
        });

        return {
            // 必須フィールド
            email: getValue('member-email'),
            name: getValue('member-name'),
            role: getValue('member-role'),
            status: getValue('member-status'),
            
            // オプションフィールド
            hero_step: getValue('member-hero-step'),
            student_id: getValue('member-student-id'),
            company_name: getValue('member-company-name'),
            membership_types: membershipTypes.join(','),
            
            // プロフィール情報
            birthdate: getValue('member-birthdate'),
            tagline: getValue('member-tagline'),
            hometown: getValue('member-hometown'),
            high_school: getValue('member-high-school'),
            university: getValue('member-university'),
            affiliation: getValue('member-affiliation'),
            title: getValue('member-title'),
            profile_text: getValue('member-profile-text'),
            sns_x: getValue('member-sns-x'),
            sns_instagram: getValue('member-sns-instagram'),
            sns_tiktok: getValue('member-sns-tiktok'),
            neo_motivation: getValue('member-neo-motivation')
        };
    }

    // バリデーション
    function validateMemberData(data) {
        // 必須フィールドチェック
        if (!data.email) {
            return { isValid: false, message: 'メールアドレスは必須です' };
        }
        if (!data.name) {
            return { isValid: false, message: '氏名は必須です' };
        }
        if (!data.role) {
            return { isValid: false, message: 'ロールは必須です' };
        }
        if (!data.status) {
            return { isValid: false, message: 'ステータスは必須です' };
        }

        // メールアドレス形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { isValid: false, message: 'メールアドレスの形式が正しくありません' };
        }

        return { isValid: true };
    }

    // ユーティリティ関数（既存の関数を利用）
    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // フォールバック
            console.log(`Toast: ${message} (${type})`);
            alert(message);
        }
    }

    function showLoading() {
        if (typeof window.showLoading === 'function') {
            window.showLoading();
        }
    }

    function hideLoading() {
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
    }

    // ドロワー閉じる時のリセット処理
    function setupDrawerCloseReset() {
        const closeBtn = document.querySelector('#member-drawer .close-drawer-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (isCreateMode) {
                    isCreateMode = false;
                    // タイトルを元に戻す
                    const drawerTitle = document.querySelector('#member-drawer h2');
                    if (drawerTitle) {
                        drawerTitle.innerHTML = '<i class="fas fa-user-edit mr-2"></i>会員詳細編集';
                    }
                }
            });
        }
    }

    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 追加の初期化処理
    setTimeout(() => {
        setupDrawerCloseReset();
    }, 1000);

    console.log('📦 会員作成モジュール読み込み完了');

})();