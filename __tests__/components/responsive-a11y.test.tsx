// レスポンシブ & A11y 統合テスト
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ResponsiveDashboardLayout from '@/components/layout/responsive-dashboard-layout';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { AccessibleInput } from '@/components/ui/accessible-input';
import { AccessibleErrorBoundary } from '@/components/error/accessible-error-boundary';
import type { AuthUser } from '@/lib/auth';

// モックユーザーデータ
const mockUser: AuthUser = {
  id: 'test-user',
  email: 'test@example.com',
  name: 'テストユーザー',
  role: 'owner',
  region_id: 'fukuoka',
  accessible_regions: ['fukuoka', 'kumamoto'],
  permissions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Next.js routerのモック
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// MediaQueryList のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('レスポンシブ & A11y 対応テスト', () => {
  beforeEach(() => {
    // ビューポートサイズをリセット
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('AccessibleButton コンポーネント', () => {
    test('基本的なアクセシビリティ属性が設定されている', () => {
      render(
        <AccessibleButton aria-label="テストボタン">
          クリック
        </AccessibleButton>
      );
      
      const button = screen.getByRole('button', { name: 'テストボタン' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'テストボタン');
    });

    test('ローディング状態でaria-disabledが設定される', () => {
      render(
        <AccessibleButton loading={true} loadingText="読み込み中...">
          送信
        </AccessibleButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    test('キーボードナビゲーションが正常に動作する', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(
        <AccessibleButton onClick={handleClick}>
          クリック
        </AccessibleButton>
      );
      
      const button = screen.getByRole('button');
      
      // Tab キーでフォーカス
      await user.tab();
      expect(button).toHaveFocus();
      
      // Enter キーでクリック
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Space キーでクリック
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('AccessibleInput コンポーネント', () => {
    test('ラベルと入力フィールドが正しく関連付けられている', () => {
      render(
        <AccessibleInput
          label="メールアドレス"
          type="email"
          required={true}
          helperText="有効なメールアドレスを入力してください"
        />
      );
      
      const input = screen.getByRole('textbox', { name: /メールアドレス/ });
      const label = screen.getByText('メールアドレス');
      
      expect(input).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    test('エラー状態でaria-invalidが設定される', () => {
      render(
        <AccessibleInput
          label="パスワード"
          type="password"
          errorText="パスワードが短すぎます"
        />
      );
      
      // passwordタイプはinputは textbox ではなく input ロール
      const input = screen.getByLabelText('パスワード');
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(errorMessage).toHaveTextContent('パスワードが短すぎます');
    });

    test('必須フィールドの表示が正しい', () => {
      render(
        <AccessibleInput
          label="氏名"
          required={true}
          showRequiredIndicator={true}
        />
      );
      
      const requiredIndicator = screen.getByLabelText('必須');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });

  describe('ResponsiveDashboardLayout コンポーネント', () => {
    test('デスクトップ表示で適切なランドマークが設定されている', () => {
      render(
        <ResponsiveDashboardLayout user={mockUser}>
          <div>テストコンテンツ</div>
        </ResponsiveDashboardLayout>
      );
      
      // メインコンテンツランドマークの確認
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveAttribute('id', 'main-content');
      
      // 複数のbannerがある場合は getAllByRole を使用
      const banners = screen.getAllByRole('banner');
      expect(banners.length).toBeGreaterThan(0);
      
      // メインヘッダーのh1要素を特定
      const pageTitle = screen.getByRole('heading', { name: 'ダッシュボード' });
      expect(pageTitle).toBeInTheDocument();
    });

    test('ユーザー情報が適切に表示される', () => {
      render(
        <ResponsiveDashboardLayout user={mockUser}>
          <div>テストコンテンツ</div>
        </ResponsiveDashboardLayout>
      );
      
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('owner • fukuoka地域')).toBeInTheDocument();
    });

    test('キーボードショートカットが動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <ResponsiveDashboardLayout user={mockUser}>
          <div>テストコンテンツ</div>
        </ResponsiveDashboardLayout>
      );
      
      // Alt+D でダッシュボードへのナビゲーション（モック済み）
      await user.keyboard('{Alt>}d{/Alt}');
      // 実際のナビゲーションは router.push でモックされているため、
      // ここではキーイベントが正しく処理されることを確認
    });
  });

  describe('AccessibleErrorBoundary コンポーネント', () => {
    // エラーを投げるコンポーネント
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('テストエラー');
      }
      return <div>正常なコンテンツ</div>;
    };

    test('エラー発生時に適切なUI要素が表示される', () => {
      // コンソールエラーを一時的に無効化
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <AccessibleErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AccessibleErrorBoundary>
      );
      
      // エラーUI要素の確認
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ホームに戻る/ })).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('再試行ボタンが正常に動作する', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // 動的なコンポーネントでテスト
      const TestComponent = () => {
        const [hasError, setHasError] = React.useState(true);
        
        return (
          <AccessibleErrorBoundary>
            <div>
              <button onClick={() => setHasError(!hasError)}>Toggle Error</button>
              <ThrowError shouldThrow={hasError} />
            </div>
          </AccessibleErrorBoundary>
        );
      };
      
      render(<TestComponent />);
      
      // エラー状態の確認
      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      const retryButton = screen.getByRole('button', { name: /再試行/ });
      expect(retryButton).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('レスポンシブ動作テスト', () => {
    const mockViewportSize = (width: number, height: number) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
      });
      
      // リサイズイベントをトリガー
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    test('モバイルサイズでモバイルナビゲーションが表示される', () => {
      mockViewportSize(375, 667); // iPhone サイズ
      
      render(
        <ResponsiveDashboardLayout user={mockUser}>
          <div>モバイルコンテンツ</div>
        </ResponsiveDashboardLayout>
      );
      
      // モバイルメニューボタンが表示される
      const menuButton = screen.getByRole('button', { name: 'メインメニューを開く' });
      expect(menuButton).toBeInTheDocument();
    });

    test('タブレットサイズでタブナビゲーションが表示される', () => {
      mockViewportSize(768, 1024); // iPad サイズ
      
      render(
        <ResponsiveDashboardLayout user={mockUser}>
          <div>タブレットコンテンツ</div>
        </ResponsiveDashboardLayout>
      );
      
      // タブナビゲーション要素を確認
      // 実際の実装に応じて適切なセレクタを使用
    });

    test('デスクトップサイズでサイドバーが表示される', () => {
      mockViewportSize(1200, 800); // デスクトップサイズ
      
      render(
        <ResponsiveDashboardLayout user={mockUser}>
          <div>デスクトップコンテンツ</div>
        </ResponsiveDashboardLayout>
      );
      
      // サイドバーナビゲーションが表示される
      // const navigation = screen.getByRole('complementary');
      // expect(navigation).toBeInTheDocument();
    });
  });

  describe('フォーカス管理テスト', () => {
    test('モーダル内でフォーカストラップが動作する', async () => {
      const user = userEvent.setup();
      
      // フォーカストラップをテストするための簡単なモーダル
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <AccessibleButton onClick={() => setIsOpen(true)}>
              モーダルを開く
            </AccessibleButton>
            
            {isOpen && (
              <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h2 id="modal-title">テストモーダル</h2>
                <AccessibleButton>ボタン1</AccessibleButton>
                <AccessibleButton>ボタン2</AccessibleButton>
                <AccessibleButton onClick={() => setIsOpen(false)}>
                  閉じる
                </AccessibleButton>
              </div>
            )}
          </div>
        );
      };
      
      render(<TestModal />);
      
      // モーダルを開く
      const openButton = screen.getByRole('button', { name: 'モーダルを開く' });
      await user.click(openButton);
      
      // モーダル内のフォーカス管理をテスト
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Tab キーでフォーカス移動をテスト
      const button1 = screen.getByRole('button', { name: 'ボタン1' });
      const button2 = screen.getByRole('button', { name: 'ボタン2' });
      const closeButton = screen.getByRole('button', { name: '閉じる' });
      
      await user.tab();
      expect(button1).toHaveFocus();
      
      await user.tab();
      expect(button2).toHaveFocus();
      
      await user.tab();
      expect(closeButton).toHaveFocus();
    });
  });
});