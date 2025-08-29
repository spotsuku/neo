#!/usr/bin/env tsx

// NEO Digital Platform - Schema Validation Tool
// データベーススキーマとAPIスキーマの整合性チェック

import fs from 'fs';
import path from 'path';
import { Schemas } from '../lib/schema-validation';
import { validateApiSchemas } from '../lib/openapi-generator';
import { z } from 'zod';

/**
 * マイグレーションファイルの分析
 */
function analyzeMigrationFiles(): {
  tables: Set<string>;
  columns: Map<string, Set<string>>;
  relationships: Map<string, string[]>;
} {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const tables = new Set<string>();
  const columns = new Map<string, Set<string>>();
  const relationships = new Map<string, string[]>();
  
  if (!fs.existsSync(migrationsDir)) {
    console.warn('⚠️  Migrations directory not found');
    return { tables, columns, relationships };
  }
  
  // マイグレーションファイルを読み込み
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // CREATE TABLE文の解析
    const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?\`?(\w+)\`?\s*\(([\s\S]*?)\)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      tables.add(tableName);
      
      // カラム定義の解析
      const columnSet = new Set<string>();
      const columnLines = tableDefinition.split(',');
      
      for (const line of columnLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          // カラム名を抽出（型定義より前の部分）
          const columnMatch = trimmed.match(/^\`?(\w+)\`?\s+/);
          if (columnMatch && !['PRIMARY', 'FOREIGN', 'INDEX', 'UNIQUE', 'CHECK'].includes(columnMatch[1])) {
            columnSet.add(columnMatch[1]);
          }
          
          // 外部キー制約の解析
          const foreignKeyMatch = trimmed.match(/FOREIGN KEY \(\`?(\w+)\`?\) REFERENCES \`?(\w+)\`?\(\`?(\w+)\`?\)/);
          if (foreignKeyMatch) {
            const relatedTable = foreignKeyMatch[2];
            const existing = relationships.get(tableName) || [];
            if (!existing.includes(relatedTable)) {
              existing.push(relatedTable);
              relationships.set(tableName, existing);
            }
          }
        }
      }
      
      columns.set(tableName, columnSet);
    }
  }
  
  return { tables, columns, relationships };
}

/**
 * APIスキーマの分析
 */
function analyzeApiSchemas(): {
  userFields: Set<string>;
  companyFields: Set<string>;
  authFields: Set<string>;
  requiredValidations: Map<string, string[]>;
} {
  const userFields = new Set<string>();
  const companyFields = new Set<string>();
  const authFields = new Set<string>();
  const requiredValidations = new Map<string, string[]>();
  
  // ユーザースキーマの分析
  const createUserSchema = Schemas.User.createUser;
  if (createUserSchema instanceof z.ZodObject) {
    const shape = createUserSchema.shape;
    Object.keys(shape).forEach(key => userFields.add(key));
    
    // 必須フィールドの抽出
    const required: string[] = [];
    Object.entries(shape).forEach(([key, schema]) => {
      if (!(schema instanceof z.ZodOptional)) {
        required.push(key);
      }
    });
    requiredValidations.set('user', required);
  }
  
  // 企業スキーマの分析
  const createCompanySchema = Schemas.Company.createCompany;
  if (createCompanySchema instanceof z.ZodObject) {
    const shape = createCompanySchema.shape;
    Object.keys(shape).forEach(key => companyFields.add(key));
    
    const required: string[] = [];
    Object.entries(shape).forEach(([key, schema]) => {
      if (!(schema instanceof z.ZodOptional)) {
        required.push(key);
      }
    });
    requiredValidations.set('company', required);
  }
  
  // 認証スキーマの分析
  const loginSchema = Schemas.Auth.loginRequest;
  if (loginSchema instanceof z.ZodObject) {
    const shape = loginSchema.shape;
    Object.keys(shape).forEach(key => authFields.add(key));
  }
  
  return { userFields, companyFields, authFields, requiredValidations };
}

/**
 * スキーマ整合性の検証
 */
function validateSchemaConsistency(): {
  success: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  console.log('📊 データベーススキーマとAPIスキーマの整合性を検証中...\n');
  
  // データベーススキーマ分析
  const dbSchema = analyzeMigrationFiles();
  console.log('📁 検出されたテーブル:', Array.from(dbSchema.tables).join(', '));
  
  // APIスキーマ分析
  const apiSchema = analyzeApiSchemas();
  console.log('🔧 API スキーマフィールド数:');
  console.log(`  - User: ${apiSchema.userFields.size} fields`);
  console.log(`  - Company: ${apiSchema.companyFields.size} fields`);
  console.log(`  - Auth: ${apiSchema.authFields.size} fields`);
  
  // テーブル存在チェック
  const expectedTables = ['users', 'companies', 'announcements', 'auth_sessions', 'password_reset_tokens'];
  for (const table of expectedTables) {
    if (!dbSchema.tables.has(table)) {
      errors.push(`Missing required table: ${table}`);
    }
  }
  
  // ユーザーテーブルのカラムチェック
  const userColumns = dbSchema.columns.get('users');
  if (userColumns) {
    const expectedUserColumns = ['id', 'email', 'name', 'role', 'region_id', 'accessible_regions'];
    for (const column of expectedUserColumns) {
      if (!userColumns.has(column)) {
        errors.push(`Missing column in users table: ${column}`);
      }
    }
    
    // API スキーマとの比較
    for (const apiField of apiSchema.userFields) {
      if (apiField === 'accessible_regions') continue; // JSON 配列として保存
      if (apiField === 'company_id') continue; // オプショナルフィールド
      
      if (!userColumns.has(apiField)) {
        warnings.push(`API user field not found in database: ${apiField}`);
      }
    }
  } else {
    errors.push('Users table not found in database schema');
  }
  
  // 企業テーブルのカラムチェック
  const companyColumns = dbSchema.columns.get('companies');
  if (companyColumns) {
    for (const apiField of apiSchema.companyFields) {
      if (!companyColumns.has(apiField)) {
        warnings.push(`API company field not found in database: ${apiField}`);
      }
    }
  }
  
  // OpenAPI スキーマの検証
  console.log('\n🔍 OpenAPI スキーマを検証中...');
  const apiValidation = validateApiSchemas();
  
  if (!apiValidation.isValid) {
    errors.push(...apiValidation.errors);
  }
  warnings.push(...apiValidation.warnings);
  
  // 提案の生成
  if (dbSchema.tables.size > 0) {
    suggestions.push('✅ データベーススキーマが適切に検出されました');
  }
  
  if (apiSchema.userFields.size > 0) {
    suggestions.push('✅ APIスキーマが適切に定義されています');
  }
  
  if (apiValidation.isValid) {
    suggestions.push('✅ OpenAPI仕様が有効です');
  }
  
  // 不整合の自動修正提案
  if (errors.length === 0 && warnings.length > 0) {
    suggestions.push('⚠️  警告がありますが、システムは動作可能です');
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * バリデーション結果のレポート生成
 */
function generateValidationReport(results: ReturnType<typeof validateSchemaConsistency>) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 スキーマ検証レポート');
  console.log('='.repeat(60));
  
  if (results.success) {
    console.log('✅ 検証成功: スキーマは整合性があります');
  } else {
    console.log('❌ 検証失敗: 修正が必要な問題があります');
  }
  
  if (results.errors.length > 0) {
    console.log('\n🚨 エラー:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  警告:');
    results.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (results.suggestions.length > 0) {
    console.log('\n💡 提案:');
    results.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  return results.success;
}

/**
 * メイン実行
 */
async function main() {
  console.log('🚀 NEO Digital Platform - スキーマ検証ツール\n');
  
  try {
    const results = validateSchemaConsistency();
    const success = generateValidationReport(results);
    
    // 終了コード設定
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ 検証ツールの実行でエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト直接実行時のみメイン関数を呼ぶ
if (require.main === module) {
  main();
}

export { validateSchemaConsistency, analyzeMigrationFiles, analyzeApiSchemas };