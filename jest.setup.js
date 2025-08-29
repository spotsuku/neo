// Jest セットアップファイル
// テスト実行前に必要な設定を行う

import '@testing-library/jest-dom';

// テスト環境でのコンソール出力を制御
global.console = {
  ...console,
  // テスト中のログ出力を制御（必要に応じて）
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Next.js Router のモック
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Next.js Navigation のモック
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Cloudflare D1 のモック
global.mockD1Database = {
  prepare: jest.fn().mockReturnValue({
    bind: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue({ 
      success: true, 
      meta: { changes: 1, last_row_id: 1 } 
    }),
    all: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
  }),
  batch: jest.fn().mockResolvedValue([]),
  exec: jest.fn().mockResolvedValue({ success: true }),
};

// Web APIs のモック（jsdom環境では既に存在するためskip）
if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
  });
}

// Crypto API のモック（Node.js環境で利用可能に）
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Date.now(),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// TextEncoder/TextDecoder のモック
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Fetch API のモック（必要に応じて）
global.fetch = jest.fn();

// IntersectionObserver のモック（React コンポーネントで使用される場合）
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// カスタムマッチャーの追加（必要に応じて）
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toHaveRole(received, expectedRole) {
    const pass = received && received.role === expectedRole;
    
    if (pass) {
      return {
        message: () => `expected user not to have role ${expectedRole}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected user to have role ${expectedRole}, but got ${received?.role || 'undefined'}`,
        pass: false,
      };
    }
  },
});

// テスト開始前の処理
beforeAll(() => {
  // 必要に応じてグローバルセットアップ処理を追加
});

// 各テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks();
});

// 全テスト完了後のクリーンアップ
afterAll(() => {
  // 必要に応じてグローバルクリーンアップ処理を追加
});