const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Next.js アプリケーションのパス
  dir: './',
});

// Jest の設定
const customJestConfig = {
  // テスト環境の設定
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  
  // モジュールパスマッピング（Next.jsのパス解決と合わせる）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // カバレッジ設定
  collectCoverage: false,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/out/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // タイムアウト設定
  testTimeout: 10000,
  
  // テスト実行時の設定
  verbose: true,
  
  // モック設定
  moduleDirectories: ['node_modules', '<rootDir>/'],
  
  // 変換設定
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // 無視するファイル
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
  ],
  
  // 環境変数の設定
  setupFiles: ['<rootDir>/jest.env.js'],
};

module.exports = createJestConfig(customJestConfig);