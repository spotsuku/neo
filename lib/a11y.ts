// NEO Portal - アクセシビリティ（A11y）サポート
// WCAG 2.1 AA準拠のアクセシビリティ機能

import { useEffect, useRef } from 'react';

// フォーカス管理
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
      focusRef.current = element;
    }
  };

  const restoreFocus = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  return { setFocus, restoreFocus };
}

// キーボードナビゲーション
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          if (onEnter) {
            event.preventDefault();
            onEnter();
          }
          break;
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            event.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            event.preventDefault();
            onArrowDown();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape, onArrowUp, onArrowDown]);
}

// スクリーンリーダー用ライブリージョン
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// カラーコントラスト検証
export function validateColorContrast(foreground: string, background: string): {
  ratio: number;
  aaPass: boolean;
  aaaPass: boolean;
} {
  // RGB値を0-1の範囲に正規化
  function parseColor(color: string): [number, number, number] {
    const hex = color.replace('#', '');
    return [
      parseInt(hex.substr(0, 2), 16) / 255,
      parseInt(hex.substr(2, 2), 16) / 255,
      parseInt(hex.substr(4, 2), 16) / 255
    ];
  }

  // 相対輝度計算
  function getRelativeLuminance(r: number, g: number, b: number): number {
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  }

  const [r1, g1, b1] = parseColor(foreground);
  const [r2, g2, b2] = parseColor(background);

  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);

  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio,
    aaPass: ratio >= 4.5,   // WCAG AA基準
    aaaPass: ratio >= 7     // WCAG AAA基準
  };
}

// フォーカス可視化
export function enhanceFocusVisibility() {
  const style = document.createElement('style');
  style.textContent = `
    /* 高コントラストフォーカスリング */
    .focus-visible:focus {
      outline: 3px solid #0066CC;
      outline-offset: 2px;
      box-shadow: 0 0 0 1px #ffffff, 0 0 0 4px #0066CC;
    }

    /* キーボードナビゲーション用のフォーカススタイル */
    .keyboard-navigation *:focus {
      outline: 2px solid #0066CC;
      outline-offset: 2px;
    }

    /* スクリーンリーダー専用テキスト */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* 高コントラストモード対応 */
    @media (prefers-contrast: high) {
      .neo-gradient {
        background: #000000;
        color: #ffffff;
      }
      
      .border {
        border-color: #000000;
      }
    }

    /* 動きの軽減設定 */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* 大きなテキスト用フォントサイズ */
    @media (prefers-font-size: large) {
      html {
        font-size: 120%;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// ARIA属性ヘルパー
export interface AriaProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
}

export function createAriaProps(props: AriaProps): Record<string, any> {
  return Object.entries(props).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
}

// フォーム検証メッセージ
export function createValidationMessage(fieldName: string, error: string): string {
  return `${fieldName}に入力エラーがあります: ${error}`;
}

// ページタイトル管理
export function updatePageTitle(title: string) {
  document.title = `${title} | NEO Portal`;
  
  // スクリーンリーダーにページ変更を通知
  announceToScreenReader(`${title}ページに移動しました`, 'polite');
}

// ランドマークロール検証
export function validateLandmarks(): string[] {
  const issues: string[] = [];
  
  if (!document.querySelector('main')) {
    issues.push('main要素が見つかりません');
  }
  
  if (!document.querySelector('nav')) {
    issues.push('nav要素が見つかりません');
  }
  
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    issues.push('見出し要素が見つかりません');
  }
  
  const h1s = document.querySelectorAll('h1');
  if (h1s.length === 0) {
    issues.push('h1要素が見つかりません');
  } else if (h1s.length > 1) {
    issues.push('h1要素が複数あります');
  }
  
  return issues;
}

// キーボードトラップ防止
export function preventKeyboardTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleTabKey);
  
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}