// フォーカス管理とキーボードナビゲーションのhooks
'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

export interface UseFocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: RefObject<HTMLElement>;
}

/**
 * フォーカス管理のためのhook
 * モーダルやドロワーでのフォーカストラップ機能を提供
 */
export function useFocusManagement(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean,
  options: UseFocusManagementOptions = {}
) {
  const { trapFocus = true, restoreFocus = true, initialFocus } = options;
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // 現在のフォーカス要素を保存
    previousActiveElement.current = document.activeElement;

    // 初期フォーカスの設定
    const focusElement = initialFocus?.current || containerRef.current;
    const firstFocusableElement = focusElement || getFocusableElements(containerRef.current)[0];
    
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    }

    if (trapFocus) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        const focusableElements = getFocusableElements(containerRef.current!);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        
        // フォーカスを復元
        if (restoreFocus && previousActiveElement.current) {
          (previousActiveElement.current as HTMLElement).focus?.();
        }
      };
    }
  }, [isActive, containerRef, trapFocus, restoreFocus, initialFocus]);
}

/**
 * フォーカス可能な要素を取得
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
  ];

  const elements = Array.from(
    container.querySelectorAll(focusableSelectors.join(', '))
  ) as HTMLElement[];

  return elements.filter(element => {
    return isVisible(element) && !element.hasAttribute('inert');
  });
}

/**
 * 要素が表示されているかチェック
 */
function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetHeight > 0 &&
    element.offsetWidth > 0
  );
}

/**
 * キーボードショートカットのhook
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const shortcutKey = `${event.ctrlKey ? 'ctrl+' : ''}${event.altKey ? 'alt+' : ''}${event.shiftKey ? 'shift+' : ''}${key}`;
      
      const handler = shortcuts[shortcutKey] || shortcuts[key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isActive]);
}

/**
 * スクリーンリーダー通知のhook
 */
export function useScreenReaderAnnouncements() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById(priority === 'assertive' ? 'alerts' : 'announcements');
    if (announcer) {
      announcer.textContent = '';
      // 少し遅延させて確実に通知されるようにする
      setTimeout(() => {
        announcer.textContent = message;
      }, 100);
    }
  };

  return { announce };
}

/**
 * レスポンシブブレークポイントの検出hook
 */
export function useBreakpoint() {
  const getBreakpoint = (): string => {
    if (typeof window === 'undefined') return 'sm';
    
    const width = window.innerWidth;
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  };

  const [breakpoint, setBreakpoint] = useState(getBreakpoint);

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl',
  };
}

