/**
 * Cloudflareストレージサービス（KV、R2）のユーティリティ
 */

// KV Namespace型定義
export interface KVNamespace {
  get(key: string, options?: KVGetOptions): Promise<string | null>;
  getWithMetadata<Metadata = unknown>(key: string, options?: KVGetOptions): Promise<KVGetResult<string, Metadata>>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

export interface KVGetResult<Value, Metadata> {
  value: Value | null;
  metadata: Metadata | null;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

export interface KVListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

export interface KVListResult {
  keys: KVKey[];
  list_complete: boolean;
  cursor?: string;
}

export interface KVKey {
  name: string;
  expiration?: number;
  metadata?: any;
}

// R2 Bucket型定義
export interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  head(key: string): Promise<R2Object | null>;
  createMultipartUpload(key: string, options?: R2CreateMultipartUploadOptions): Promise<R2MultipartUpload>;
}

export interface R2GetOptions {
  onlyIf?: R2Conditional;
  range?: R2Range;
}

export interface R2PutOptions {
  onlyIf?: R2Conditional;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
  sha1?: ArrayBuffer | string;
  sha256?: ArrayBuffer | string;
  sha384?: ArrayBuffer | string;
  sha512?: ArrayBuffer | string;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  checksums: R2Checksums;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  range?: R2Range;
  body?: ReadableStream;
  bodyUsed?: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
  toJSON(): R2StringChecksums;
}

export interface R2StringChecksums {
  md5?: string;
  sha1?: string;
  sha256?: string;
  sha384?: string;
  sha512?: string;
}

export interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

export interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

export interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  startAfter?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

export interface R2MultipartUpload {
  key: string;
  uploadId: string;
  complete(parts: R2UploadedPart[]): Promise<R2Object>;
  abort(): Promise<void>;
  uploadPart(partNumber: number, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob): Promise<R2UploadedPart>;
}

export interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

export interface R2CreateMultipartUploadOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

/**
 * KVストレージ管理クラス
 */
export class KVManager {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  // キャッシュ管理
  async getCache<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, { type: 'json' });
      return value as T;
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  async setCache<T = any>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const options: KVPutOptions = {};
      if (ttlSeconds) {
        options.expirationTtl = ttlSeconds;
      }
      await this.kv.put(key, JSON.stringify(value), options);
      return true;
    } catch (error) {
      console.error('KV put error:', error);
      return false;
    }
  }

  async deleteCache(key: string): Promise<boolean> {
    try {
      await this.kv.delete(key);
      return true;
    } catch (error) {
      console.error('KV delete error:', error);
      return false;
    }
  }

  // セッション管理
  async getSession(sessionId: string): Promise<any | null> {
    return await this.getCache(`session:${sessionId}`);
  }

  async setSession(sessionId: string, sessionData: any, ttlSeconds = 86400): Promise<boolean> {
    return await this.setCache(`session:${sessionId}`, sessionData, ttlSeconds);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return await this.deleteCache(`session:${sessionId}`);
  }

  // 設定キャッシュ
  async getSettings(cacheKey = 'system:settings'): Promise<Record<string, any> | null> {
    return await this.getCache(cacheKey);
  }

  async setSettings(settings: Record<string, any>, cacheKey = 'system:settings', ttlSeconds = 3600): Promise<boolean> {
    return await this.setCache(cacheKey, settings, ttlSeconds);
  }

  // 一時データ管理
  async getTempData(key: string): Promise<any | null> {
    return await this.getCache(`temp:${key}`);
  }

  async setTempData(key: string, data: any, ttlSeconds = 3600): Promise<boolean> {
    return await this.setCache(`temp:${key}`, data, ttlSeconds);
  }

  // リスト操作
  async listKeys(prefix?: string, limit = 1000): Promise<string[]> {
    try {
      const options: KVListOptions = { limit };
      if (prefix) {
        options.prefix = prefix;
      }
      const result = await this.kv.list(options);
      return result.keys.map(key => key.name);
    } catch (error) {
      console.error('KV list error:', error);
      return [];
    }
  }

  // メタデータ付きの操作
  async getCacheWithMetadata<T = any, M = any>(key: string): Promise<{ value: T | null; metadata: M | null }> {
    try {
      const result = await this.kv.getWithMetadata(key, { type: 'json' });
      return {
        value: result.value as T,
        metadata: result.metadata as M
      };
    } catch (error) {
      console.error('KV getWithMetadata error:', error);
      return { value: null, metadata: null };
    }
  }

  async setCacheWithMetadata<T = any>(
    key: string, 
    value: T, 
    metadata: any, 
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const options: KVPutOptions = { metadata };
      if (ttlSeconds) {
        options.expirationTtl = ttlSeconds;
      }
      await this.kv.put(key, JSON.stringify(value), options);
      return true;
    } catch (error) {
      console.error('KV put with metadata error:', error);
      return false;
    }
  }
}

/**
 * R2オブジェクトストレージ管理クラス
 */
export class R2Manager {
  private r2: R2Bucket;

  constructor(r2: R2Bucket) {
    this.r2 = r2;
  }

  // ファイルアップロード
  async uploadFile(
    key: string, 
    file: File | Blob | ArrayBuffer | string, 
    options: {
      contentType?: string;
      metadata?: Record<string, string>;
      cacheControl?: string;
    } = {}
  ): Promise<{ success: boolean; key: string; size: number; etag: string }> {
    try {
      const putOptions: R2PutOptions = {
        httpMetadata: {
          contentType: options.contentType,
          cacheControl: options.cacheControl || 'public, max-age=31536000'
        }
      };

      if (options.metadata) {
        putOptions.customMetadata = options.metadata;
      }

      const result = await this.r2.put(key, file, putOptions);
      
      return {
        success: true,
        key: result.key,
        size: result.size,
        etag: result.etag
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      return {
        success: false,
        key,
        size: 0,
        etag: ''
      };
    }
  }

  // ファイル取得
  async getFile(key: string): Promise<R2Object | null> {
    try {
      return await this.r2.get(key);
    } catch (error) {
      console.error('R2 get error:', error);
      return null;
    }
  }

  // ファイル情報取得（ボディなし）
  async getFileInfo(key: string): Promise<R2Object | null> {
    try {
      return await this.r2.head(key);
    } catch (error) {
      console.error('R2 head error:', error);
      return null;
    }
  }

  // ファイル削除
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.r2.delete(key);
      return true;
    } catch (error) {
      console.error('R2 delete error:', error);
      return false;
    }
  }

  // 複数ファイル削除
  async deleteFiles(keys: string[]): Promise<boolean> {
    try {
      await this.r2.delete(keys);
      return true;
    } catch (error) {
      console.error('R2 batch delete error:', error);
      return false;
    }
  }

  // ファイル一覧取得
  async listFiles(
    prefix?: string, 
    limit = 1000
  ): Promise<{ files: R2Object[]; hasMore: boolean; cursor?: string }> {
    try {
      const options: R2ListOptions = { 
        limit,
        include: ['httpMetadata', 'customMetadata']
      };
      
      if (prefix) {
        options.prefix = prefix;
      }

      const result = await this.r2.list(options);
      
      return {
        files: result.objects,
        hasMore: result.truncated,
        cursor: result.cursor
      };
    } catch (error) {
      console.error('R2 list error:', error);
      return { files: [], hasMore: false };
    }
  }

  // ファイル存在チェック
  async fileExists(key: string): Promise<boolean> {
    const info = await this.getFileInfo(key);
    return info !== null;
  }

  // ファイルコピー
  async copyFile(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      const sourceFile = await this.getFile(sourceKey);
      if (!sourceFile) return false;

      const body = await sourceFile.arrayBuffer();
      const copyOptions: R2PutOptions = {
        httpMetadata: sourceFile.httpMetadata,
        customMetadata: sourceFile.customMetadata
      };

      await this.r2.put(destKey, body, copyOptions);
      return true;
    } catch (error) {
      console.error('R2 copy error:', error);
      return false;
    }
  }

  // 大容量ファイル用マルチパートアップロード
  async createMultipartUpload(
    key: string, 
    options: R2CreateMultipartUploadOptions = {}
  ): Promise<R2MultipartUpload | null> {
    try {
      return await this.r2.createMultipartUpload(key, options);
    } catch (error) {
      console.error('R2 multipart upload create error:', error);
      return null;
    }
  }

  // プリサインドURL生成用のヘルパー（実際の署名は別途実装が必要）
  generatePublicUrl(key: string, bucketName: string): string {
    return `https://pub-${bucketName}.r2.dev/${key}`;
  }
}

/**
 * 統合ストレージマネージャー
 */
export class StorageManager {
  public kv: KVManager;
  public r2: R2Manager;

  constructor(kvNamespace: KVNamespace, r2Bucket: R2Bucket) {
    this.kv = new KVManager(kvNamespace);
    this.r2 = new R2Manager(r2Bucket);
  }

  // ファイルアップロードとメタデータ管理の統合
  async uploadWithMetadata(
    file: File | Blob | ArrayBuffer | string,
    options: {
      key?: string;
      folder?: string;
      contentType?: string;
      userId?: number;
      description?: string;
      tags?: string[];
    } = {}
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    metadata?: any;
  }> {
    try {
      // ファイルキーの生成
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const folder = options.folder || 'uploads';
      const key = options.key || `${folder}/${timestamp}-${randomStr}`;

      // R2へアップロード
      const uploadResult = await this.r2.uploadFile(key, file, {
        contentType: options.contentType,
        metadata: {
          userId: options.userId?.toString() || '',
          description: options.description || '',
          tags: options.tags?.join(',') || '',
          uploadedAt: new Date().toISOString()
        }
      });

      if (!uploadResult.success) {
        return { success: false };
      }

      // KVにメタデータをキャッシュ
      const metadata = {
        key,
        size: uploadResult.size,
        etag: uploadResult.etag,
        contentType: options.contentType,
        userId: options.userId,
        description: options.description,
        tags: options.tags,
        uploadedAt: new Date().toISOString()
      };

      await this.kv.setCache(`file:${key}`, metadata, 3600); // 1時間キャッシュ

      return {
        success: true,
        fileId: key,
        url: `/api/files/${key}`,
        metadata
      };
    } catch (error) {
      console.error('Upload with metadata error:', error);
      return { success: false };
    }
  }

  // ファイル取得とキャッシュ管理の統合
  async getFileWithCache(key: string): Promise<{
    file: R2Object | null;
    metadata: any;
    fromCache: boolean;
  }> {
    // まずKVからメタデータを取得
    const cachedMetadata = await this.kv.getCache(`file:${key}`);
    
    // R2からファイルを取得
    const file = await this.r2.getFile(key);
    
    if (file && !cachedMetadata) {
      // キャッシュが無い場合は作成
      const metadata = {
        key: file.key,
        size: file.size,
        etag: file.etag,
        uploadedAt: file.uploaded.toISOString(),
        customMetadata: file.customMetadata
      };
      await this.kv.setCache(`file:${key}`, metadata, 3600);
      
      return {
        file,
        metadata,
        fromCache: false
      };
    }

    return {
      file,
      metadata: cachedMetadata,
      fromCache: !!cachedMetadata
    };
  }

  // ファイル削除とキャッシュクリア
  async deleteFileComplete(key: string): Promise<boolean> {
    try {
      // R2から削除
      await this.r2.deleteFile(key);
      
      // KVからキャッシュ削除
      await this.kv.deleteCache(`file:${key}`);
      
      return true;
    } catch (error) {
      console.error('Complete file delete error:', error);
      return false;
    }
  }
}

/**
 * ストレージヘルパー関数
 */
export function createStorageManager(kv: KVNamespace, r2: R2Bucket): StorageManager {
  return new StorageManager(kv, r2);
}

export function createKVManager(kv: KVNamespace): KVManager {
  return new KVManager(kv);
}

export function createR2Manager(r2: R2Bucket): R2Manager {
  return new R2Manager(r2);
}