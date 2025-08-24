// CSV一括インポートサービス
import { 
  CSVFileInfo, 
  CSVFileValidationResult, 
  CSVRowData, 
  CSVColumnDefinition, 
  CSVParseResult, 
  CSVImportResult, 
  CSVFormatConfig, 
  CSVImportConfig, 
  CSVImportSession,
  RegionId,
  UserRole,
  TentativeRegistration,
  BulkRegistrationData
} from '../types';
import { generateUUID, generateTemporaryPassword, hashPassword } from './registration';

// CSVフォーマット設定
export const DEFAULT_CSV_FORMAT: CSVFormatConfig = {
  requiredColumns: [
    {
      name: 'email',
      displayName: 'メールアドレス',
      required: true,
      type: 'email',
      example: 'user@example.com',
      validation: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return '有効なメールアドレス形式ではありません';
        }
        return null;
      }
    },
    {
      name: 'name',
      displayName: '氏名',
      required: true,
      type: 'string',
      example: '山田太郎',
      validation: (value: string) => {
        if (value.trim().length < 1) {
          return '氏名は必須です';
        }
        if (value.length > 50) {
          return '氏名は50文字以内で入力してください';
        }
        return null;
      }
    },
    {
      name: 'name_kana',
      displayName: '氏名（カナ）',
      required: true,
      type: 'string',
      example: 'ヤマダタロウ',
      validation: (value: string) => {
        if (value.trim().length < 1) {
          return '氏名（カナ）は必須です';
        }
        const kanaRegex = /^[ァ-ヶー\s]+$/;
        if (!kanaRegex.test(value)) {
          return 'カタカナで入力してください';
        }
        return null;
      }
    },
    {
      name: 'region_id',
      displayName: '地域ID',
      required: true,
      type: 'region',
      example: 'FUK, ISK, NIG',
      validation: (value: string) => {
        const validRegions: RegionId[] = ['FUK', 'ISK', 'NIG'];
        if (!validRegions.includes(value as RegionId)) {
          return '有効な地域ID（FUK, ISK, NIG）を入力してください';
        }
        return null;
      }
    },
    {
      name: 'role',
      displayName: 'ロール',
      required: true,
      type: 'role',
      example: 'student, company_admin',
      validation: (value: string) => {
        const validRoles: UserRole[] = ['student', 'company_admin', 'secretariat', 'owner'];
        if (!validRoles.includes(value as UserRole)) {
          return '有効なロール（student, company_admin, secretariat, owner）を入力してください';
        }
        return null;
      }
    }
  ],
  optionalColumns: [
    {
      name: 'company_id',
      displayName: '会社ID',
      required: false,
      type: 'string',
      example: 'COMP001',
      validation: (value: string) => {
        if (value && value.length > 20) {
          return '会社IDは20文字以内で入力してください';
        }
        return null;
      }
    },
    {
      name: 'phone',
      displayName: '電話番号',
      required: false,
      type: 'phone',
      example: '090-1234-5678',
      validation: (value: string) => {
        if (value) {
          const phoneRegex = /^[\d\-\+\(\)\s]+$/;
          if (!phoneRegex.test(value)) {
            return '有効な電話番号形式ではありません';
          }
        }
        return null;
      }
    },
    {
      name: 'notes',
      displayName: '備考',
      required: false,
      type: 'string',
      example: '追加情報',
      validation: (value: string) => {
        if (value && value.length > 200) {
          return '備考は200文字以内で入力してください';
        }
        return null;
      }
    }
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['text/csv', 'application/csv'],
  encoding: 'utf-8',
  delimiter: ',',
  hasHeader: true
};

// デフォルトCSVインポート設定
export const DEFAULT_CSV_IMPORT_CONFIG: CSVImportConfig = {
  format: DEFAULT_CSV_FORMAT,
  processingOptions: {
    batchSize: 100,
    skipDuplicateEmails: true,
    sendNotificationEmails: true,
    autoGeneratePasswords: true,
    passwordExpiryDays: 7,
    defaultStatus: 'tentative'
  },
  validation: {
    strictMode: false,
    maxErrorCount: 50,
    requireAllColumns: true
  }
};

// CSVファイルバリデーション
export function validateCSVFile(file: File): CSVFileValidationResult {
  const result: CSVFileValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fileInfo: {
      filename: file.name,
      size: file.size,
      lastModified: file.lastModified,
      mimeType: file.type
    }
  };

  // ファイルサイズチェック
  if (file.size > DEFAULT_CSV_FORMAT.maxFileSize) {
    result.isValid = false;
    result.errors.push(`ファイルサイズが上限（${DEFAULT_CSV_FORMAT.maxFileSize / 1024 / 1024}MB）を超えています`);
  }

  // ファイル拡張子チェック
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'csv') {
    result.isValid = false;
    result.errors.push('CSVファイル（.csv）のみ対応しています');
  }

  // MIMEタイプチェック（警告のみ）
  if (file.type && !DEFAULT_CSV_FORMAT.allowedMimeTypes.includes(file.type)) {
    result.warnings.push(`MIMEタイプ（${file.type}）が一般的ではありません。問題がある場合はファイルを確認してください。`);
  }

  // 空ファイルチェック
  if (file.size === 0) {
    result.isValid = false;
    result.errors.push('ファイルが空です');
  }

  return result;
}

// CSVテキストパース
export function parseCSVText(csvText: string, config: CSVFormatConfig = DEFAULT_CSV_FORMAT): CSVParseResult {
  const result: CSVParseResult = {
    isValid: true,
    totalRows: 0,
    validRows: [],
    invalidRows: [],
    headers: [],
    summary: {
      totalCount: 0,
      validCount: 0,
      errorCount: 0,
      warningCount: 0
    },
    globalErrors: []
  };

  try {
    // 行に分割
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      result.isValid = false;
      result.globalErrors.push('CSVファイルが空です');
      return result;
    }

    // ヘッダー行の処理
    const headerLine = lines[0];
    const headers = headerLine.split(config.delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    result.headers = headers;

    // 必須カラムの存在チェック
    const missingRequiredColumns = config.requiredColumns.filter(
      col => !headers.includes(col.name)
    );
    
    if (missingRequiredColumns.length > 0) {
      result.isValid = false;
      result.globalErrors.push(
        `必須カラムが不足しています: ${missingRequiredColumns.map(c => c.displayName).join(', ')}`
      );
      
      if (config.hasHeader && result.isValid) {
        return result; // ヘッダーエラーの場合は処理を停止
      }
    }

    // データ行の処理
    const dataLines = config.hasHeader ? lines.slice(1) : lines;
    result.totalRows = dataLines.length;
    result.summary.totalCount = dataLines.length;

    dataLines.forEach((line, index) => {
      const rowNumber = config.hasHeader ? index + 2 : index + 1;
      const rowData = parseCSVRow(line, headers, config, rowNumber);
      
      if (rowData.isValid) {
        result.validRows.push(rowData);
        result.summary.validCount++;
      } else {
        result.invalidRows.push(rowData);
        result.summary.errorCount++;
      }
      
      if (rowData.warnings.length > 0) {
        result.summary.warningCount++;
      }
    });

    // 全体の検証
    if (result.summary.errorCount > 0 && config.requiredColumns.length > 0) {
      result.isValid = false;
    }

  } catch (error) {
    result.isValid = false;
    result.globalErrors.push(`CSVパースエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }

  return result;
}

// CSV行データパース
function parseCSVRow(
  line: string, 
  headers: string[], 
  config: CSVFormatConfig, 
  rowNumber: number
): CSVRowData {
  const rowData: CSVRowData = {
    row: rowNumber,
    data: {},
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // CSV行をパース（簡易版 - 本格的な実装では専用ライブラリを推奨）
    const values = line.split(config.delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    
    // ヘッダーと値の対応
    headers.forEach((header, index) => {
      rowData.data[header] = values[index] || '';
    });

    // 各カラムの検証
    const allColumns = [...config.requiredColumns, ...config.optionalColumns];
    
    allColumns.forEach(column => {
      const value = rowData.data[column.name] || '';
      
      // 必須チェック
      if (column.required && !value.trim()) {
        rowData.isValid = false;
        rowData.errors.push(`${column.displayName}は必須です`);
        return;
      }

      // バリデーション実行
      if (value.trim() && column.validation) {
        const validationError = column.validation(value.trim());
        if (validationError) {
          rowData.isValid = false;
          rowData.errors.push(`${column.displayName}: ${validationError}`);
        }
      }
    });

    // 値の数チェック
    if (values.length !== headers.length) {
      rowData.warnings.push(`カラム数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`);
    }

  } catch (error) {
    rowData.isValid = false;
    rowData.errors.push(`行パースエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }

  return rowData;
}

// CSVインポート処理
export async function processCSVImport(
  parseResult: CSVParseResult,
  config: CSVImportConfig,
  uploadedBy: string
): Promise<CSVImportResult> {
  const startTime = Date.now();
  
  const result: CSVImportResult = {
    status: 'failed',
    processedAt: new Date().toISOString(),
    processingTimeMs: 0,
    fileInfo: {
      filename: 'unknown.csv',
      size: 0,
      lastModified: Date.now(),
      mimeType: 'text/csv'
    },
    parseResult,
    importSummary: {
      totalRows: parseResult.totalRows,
      successfulImports: 0,
      failedImports: 0,
      skippedRows: 0,
      duplicateEmails: 0
    },
    createdUsers: [],
    failedRows: [],
    downloadUrls: {
      successReport: '',
      errorReport: ''
    }
  };

  try {
    // 厳格モードでパースエラーがある場合は処理を停止
    if (config.validation.strictMode && !parseResult.isValid) {
      result.status = 'failed';
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // バッチ処理
    const batchSize = config.processingOptions.batchSize;
    const validRows = parseResult.validRows;
    
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      
      for (const rowData of batch) {
        try {
          // 重複チェック
          const existingUser = await findUserByEmail(rowData.data.email);
          if (existingUser) {
            if (config.processingOptions.skipDuplicateEmails) {
              result.importSummary.duplicateEmails++;
              result.importSummary.skippedRows++;
              continue;
            } else {
              throw new Error('既に登録済みのメールアドレスです');
            }
          }

          // BulkRegistrationData形式に変換
          const bulkData: BulkRegistrationData = {
            tempName: rowData.data.name,
            email: rowData.data.email,
            regionId: rowData.data.region_id as RegionId,
            role: rowData.data.role as UserRole,
            companyId: rowData.data.company_id || undefined
          };

          // ユーザー作成
          const userId = await createUserFromCSVRow(bulkData, config, uploadedBy);
          result.createdUsers.push(userId);
          result.importSummary.successfulImports++;

        } catch (error) {
          result.importSummary.failedImports++;
          result.failedRows.push({
            row: rowData.row,
            data: rowData.data,
            error: error instanceof Error ? error.message : '不明なエラー',
            category: 'system'
          });
        }
      }
    }

    // ステータス決定
    if (result.importSummary.successfulImports === 0) {
      result.status = 'failed';
    } else if (result.importSummary.failedImports > 0) {
      result.status = 'partial';
    } else {
      result.status = 'completed';
    }

    // レポートCSV生成
    result.downloadUrls = await generateImportReports(result);

  } catch (error) {
    result.status = 'failed';
    console.error('CSV import processing error:', error);
  }

  result.processingTimeMs = Date.now() - startTime;
  return result;
}

// CSVからユーザー作成
async function createUserFromCSVRow(
  data: BulkRegistrationData,
  config: CSVImportConfig,
  createdBy: string
): Promise<string> {
  const userId = generateUUID();
  const tempPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(tempPassword);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.processingOptions.passwordExpiryDays * 24 * 60 * 60 * 1000);
  
  const registration: TentativeRegistration = {
    id: userId,
    tempName: data.tempName,
    email: data.email,
    regionId: data.regionId,
    role: data.role,
    companyId: data.companyId,
    status: config.processingOptions.defaultStatus,
    temporaryPassword: hashedPassword,
    tempPasswordExpiresAt: expiresAt.toISOString(),
    isFirstLogin: true,
    createdBy,
    createdAt: now.toISOString()
  };
  
  // TODO: Notion APIに保存
  await saveTentativeRegistrationToNotion(registration, tempPassword);
  
  // メール通知（オプション）
  if (config.processingOptions.sendNotificationEmails) {
    // TODO: メール送信実装
    console.log('Email notification would be sent to:', data.email);
  }
  
  return userId;
}

// インポートレポートCSV生成
async function generateImportReports(result: CSVImportResult): Promise<{successReport: string, errorReport: string}> {
  // 成功レポートCSV
  const successCsvLines = ['ユーザーID,氏名,メールアドレス,地域,ロール,作成日時'];
  
  // TODO: 実際の成功データを使用
  result.createdUsers.forEach((userId, index) => {
    successCsvLines.push(`${userId},ユーザー${index + 1},user${index + 1}@example.com,FUK,student,${new Date().toISOString()}`);
  });
  
  // エラーレポートCSV
  const errorCsvLines = ['行番号,メールアドレス,エラー内容,エラーカテゴリ'];
  
  result.failedRows.forEach(failedRow => {
    errorCsvLines.push(`${failedRow.row},"${failedRow.data.email}","${failedRow.error}",${failedRow.category}`);
  });
  
  // TODO: 実際のファイル保存/URL生成実装
  const successCsv = successCsvLines.join('\n');
  const errorCsv = errorCsvLines.join('\n');
  
  return {
    successReport: `data:text/csv;charset=utf-8,${encodeURIComponent(successCsv)}`,
    errorReport: `data:text/csv;charset=utf-8,${encodeURIComponent(errorCsv)}`
  };
}

// CSVインポートセッション作成
export function createCSVImportSession(
  fileInfo: CSVFileInfo,
  uploadedBy: string,
  config: CSVImportConfig = DEFAULT_CSV_IMPORT_CONFIG
): CSVImportSession {
  const sessionId = generateUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30分後

  return {
    sessionId,
    uploadedBy,
    uploadedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'uploaded',
    fileInfo,
    config
  };
}

// CSVサンプルファイル生成
export function generateSampleCSV(): string {
  const headers = [
    ...DEFAULT_CSV_FORMAT.requiredColumns.map(col => col.name),
    ...DEFAULT_CSV_FORMAT.optionalColumns.map(col => col.name)
  ];
  
  const sampleRows = [
    ['yamada@example.com', '山田太郎', 'ヤマダタロウ', 'FUK', 'student', 'COMP001', '090-1234-5678', 'サンプル学生'],
    ['suzuki@company.com', '鈴木花子', 'スズキハナコ', 'ISK', 'company_admin', 'COMP002', '090-5678-9012', '企業管理者'],
    ['tanaka@test.org', '田中次郎', 'タナカジロウ', 'NIG', 'student', '', '080-1111-2222', '']
  ];
  
  const csvLines = [
    headers.join(','),
    ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ];
  
  return csvLines.join('\n');
}

// ダミー関数（実際の実装で置き換え）
async function findUserByEmail(email: string): Promise<any> {
  // TODO: 実際のNotion API実装
  console.log('Finding user by email:', email);
  return null;
}

async function saveTentativeRegistrationToNotion(registration: TentativeRegistration, tempPassword: string): Promise<void> {
  // TODO: 実際のNotion API実装
  console.log('Saving registration to Notion:', registration.id);
}