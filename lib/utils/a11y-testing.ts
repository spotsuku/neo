// A11y テストユーティリティ
'use client';

interface A11yCheckResult {
  element: HTMLElement;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

/**
 * 基本的なA11yチェックを実行
 */
export function performA11yCheck(): A11yCheckResult[] {
  const issues: A11yCheckResult[] = [];

  // 画像のalt属性チェック
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        element: img,
        issue: '画像にalt属性が設定されていません',
        severity: 'error',
        suggestion: 'alt属性を追加して画像の説明を提供してください'
      });
    } else if (img.getAttribute('alt') === '') {
      // 装飾画像の場合は問題なし
      if (!img.closest('[role="presentation"]') && !img.hasAttribute('aria-hidden')) {
        issues.push({
          element: img,
          issue: '空のalt属性が設定された画像があります',
          severity: 'warning',
          suggestion: '装飾画像の場合はaria-hidden="true"を追加することを検討してください'
        });
      }
    }
  });

  // ボタンのアクセシブル名チェック
  document.querySelectorAll('button').forEach(button => {
    const accessibleName = getAccessibleName(button);
    if (!accessibleName) {
      issues.push({
        element: button,
        issue: 'ボタンにアクセシブル名が設定されていません',
        severity: 'error',
        suggestion: 'ボタンにテキスト、aria-label、またはaria-labelledby属性を追加してください'
      });
    }
  });

  // リンクのアクセシブル名チェック
  document.querySelectorAll('a[href]').forEach(link => {
    const accessibleName = getAccessibleName(link);
    if (!accessibleName) {
      issues.push({
        element: link,
        issue: 'リンクにアクセシブル名が設定されていません',
        severity: 'error',
        suggestion: 'リンクにテキスト、aria-label、またはaria-labelledby属性を追加してください'
      });
    } else if (accessibleName.toLowerCase().includes('ここをクリック') || 
               accessibleName.toLowerCase().includes('click here')) {
      issues.push({
        element: link,
        issue: '意味のないリンクテキストが使用されています',
        severity: 'warning',
        suggestion: 'リンク先の内容を説明するテキストに変更してください'
      });
    }
  });

  // フォーム入力要素のラベルチェック
  document.querySelectorAll('input, select, textarea').forEach(input => {
    if (input.getAttribute('type') === 'hidden') return;
    
    const hasLabel = hasAssociatedLabel(input as HTMLInputElement);
    if (!hasLabel) {
      issues.push({
        element: input as HTMLElement,
        issue: 'フォーム入力要素にラベルが関連付けられていません',
        severity: 'error',
        suggestion: 'label要素を使用するか、aria-label属性を追加してください'
      });
    }
  });

  // 見出し構造のチェック
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let previousLevel = 0;
  
  headings.forEach(heading => {
    const level = parseInt(heading.tagName.substring(1));
    
    if (level > previousLevel + 1) {
      issues.push({
        element: heading as HTMLElement,
        issue: `見出しレベルが飛んでいます (h${previousLevel} から h${level})`,
        severity: 'warning',
        suggestion: '見出しレベルは段階的に使用してください'
      });
    }
    
    previousLevel = level;
  });

  // コントラスト比の簡易チェック（近似値）
  document.querySelectorAll('*').forEach(element => {
    const style = getComputedStyle(element);
    const fontSize = parseFloat(style.fontSize);
    const color = style.color;
    const backgroundColor = style.backgroundColor;
    
    if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const contrast = calculateContrastRatio(color, backgroundColor);
      const minContrast = fontSize >= 18 || (fontSize >= 14 && style.fontWeight === 'bold') ? 3 : 4.5;
      
      if (contrast < minContrast) {
        issues.push({
          element: element as HTMLElement,
          issue: `コントラスト比が不十分です (${contrast.toFixed(2)}:1, 必要: ${minContrast}:1)`,
          severity: 'warning',
          suggestion: 'テキストと背景のコントラスト比を改善してください'
        });
      }
    }
  });

  // focusable要素のfocus表示チェック
  document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').forEach(element => {
    const style = getComputedStyle(element);
    if (style.outlineWidth === '0px' && 
        !style.boxShadow.includes('ring') && 
        !element.classList.toString().includes('focus')) {
      issues.push({
        element: element as HTMLElement,
        issue: 'フォーカス表示が設定されていない可能性があります',
        severity: 'warning',
        suggestion: 'フォーカス時の視覚的な表示を追加してください'
      });
    }
  });

  return issues;
}

/**
 * 要素のアクセシブル名を取得
 */
function getAccessibleName(element: Element): string {
  // aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElements = ariaLabelledBy.split(' ')
      .map(id => document.getElementById(id))
      .filter(el => el !== null);
    
    if (labelElements.length > 0) {
      return labelElements.map(el => el!.textContent || '').join(' ').trim();
    }
  }

  // テキストコンテンツ
  const textContent = element.textContent || '';
  if (textContent.trim()) return textContent.trim();

  // title属性
  const title = element.getAttribute('title');
  if (title) return title.trim();

  return '';
}

/**
 * フォーム要素にラベルが関連付けられているかチェック
 */
function hasAssociatedLabel(input: HTMLInputElement): boolean {
  // aria-label
  if (input.hasAttribute('aria-label')) return true;

  // aria-labelledby
  if (input.hasAttribute('aria-labelledby')) return true;

  // label要素による関連付け
  const id = input.id;
  if (id && document.querySelector(`label[for="${id}"]`)) return true;

  // 親のlabel要素
  if (input.closest('label')) return true;

  return false;
}

/**
 * 色のコントラスト比を計算（簡易版）
 */
function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseRgbColor(color1);
  const rgb2 = parseRgbColor(color2);
  
  if (!rgb1 || !rgb2) return 21; // 計算不可の場合は最高値を返す

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * RGB色をパース
 */
function parseRgbColor(color: string): { r: number; g: number; b: number } | null {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    };
  }
  return null;
}

/**
 * 相対輝度を計算
 */
function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * A11yチェック結果をコンソールに出力
 */
export function logA11yIssues(issues: A11yCheckResult[]): void {
  if (issues.length === 0) {
    console.log('✅ A11yチェック: 問題は見つかりませんでした');
    return;
  }

  console.group(`⚠️ A11yチェック: ${issues.length}件の問題が見つかりました`);
  
  issues.forEach((issue, index) => {
    const emoji = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    
    console.group(`${emoji} ${index + 1}. ${issue.issue}`);
    console.log('要素:', issue.element);
    console.log('提案:', issue.suggestion);
    console.groupEnd();
  });
  
  console.groupEnd();
}

/**
 * 開発環境でA11yチェックを自動実行
 */
export function enableA11yDevMode(): void {
  if (process.env.NODE_ENV !== 'development') return;

  let checkTimeout: NodeJS.Timeout;

  const runCheck = () => {
    clearTimeout(checkTimeout);
    checkTimeout = setTimeout(() => {
      const issues = performA11yCheck();
      if (issues.length > 0) {
        logA11yIssues(issues);
      }
    }, 1000);
  };

  // DOM変更を監視
  const observer = new MutationObserver(runCheck);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['alt', 'aria-label', 'aria-labelledby', 'role']
  });

  // 初回チェック
  runCheck();
}