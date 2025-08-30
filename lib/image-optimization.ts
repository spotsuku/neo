/**
 * 画像最適化ユーティリティ
 * 画像形式変換、サイズ最適化、プレースホルダー生成などを提供
 */

interface ImageOptimizationConfig {
  quality: number;
  format: 'webp' | 'avif' | 'jpeg' | 'png';
  sizes: string;
  priority: boolean;
  placeholder: 'blur' | 'empty';
}

interface ResponsiveImageConfig {
  breakpoints: { [key: string]: number };
  defaultQuality: number;
  formats: string[];
}

/**
 * 画像タイプ別の最適化設定
 */
export const IMAGE_OPTIMIZATION_CONFIGS: Record<string, Partial<ImageOptimizationConfig>> = {
  hero: {
    quality: 90,
    format: 'webp',
    sizes: '100vw',
    priority: true,
    placeholder: 'blur'
  },
  thumbnail: {
    quality: 70,
    format: 'webp',
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw',
    priority: false,
    placeholder: 'blur'
  },
  avatar: {
    quality: 85,
    format: 'webp',
    sizes: '(max-width: 768px) 64px, 96px',
    priority: false,
    placeholder: 'blur'
  },
  gallery: {
    quality: 75,
    format: 'webp',
    sizes: '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw',
    priority: false,
    placeholder: 'blur'
  },
  icon: {
    quality: 90,
    format: 'png',
    sizes: '32px',
    priority: false,
    placeholder: 'empty'
  }
};

/**
 * レスポンシブ画像設定
 */
export const RESPONSIVE_CONFIG: ResponsiveImageConfig = {
  breakpoints: {
    mobile: 640,
    tablet: 768,
    laptop: 1024,
    desktop: 1280,
    wide: 1536
  },
  defaultQuality: 75,
  formats: ['avif', 'webp', 'jpeg']
};

/**
 * 画像URLから最適化された設定を取得
 */
export function getImageOptimizationConfig(
  src: string,
  type: keyof typeof IMAGE_OPTIMIZATION_CONFIGS = 'thumbnail'
): Partial<ImageOptimizationConfig> {
  return IMAGE_OPTIMIZATION_CONFIGS[type] || IMAGE_OPTIMIZATION_CONFIGS.thumbnail;
}

/**
 * レスポンシブ画像のsizes属性を生成
 */
export function generateSizes(config: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  default: string;
}): string {
  const { mobile = '100vw', tablet = '50vw', desktop = '33vw', default: defaultSize } = config;
  
  return [
    `(max-width: ${RESPONSIVE_CONFIG.breakpoints.mobile}px) ${mobile}`,
    `(max-width: ${RESPONSIVE_CONFIG.breakpoints.laptop}px) ${tablet}`,
    `(max-width: ${RESPONSIVE_CONFIG.breakpoints.desktop}px) ${desktop}`,
    defaultSize
  ].join(', ');
}

/**
 * 画像のプレースホルダーBlur Data URLを生成
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) {
    // サーバーサイドでは固定のblur data URLを返す
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bPvXkDxaHonehAACJSgMIJM7OOtfwnJMWiKyoP8AjBUBkgNXclskuCM8TNNgU3JZD3uj4sBCbSA=';
  }
  
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  
  if (ctx) {
    // グラデーションのぼかし効果を作成
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * 画像ファイルサイズを最適化するためのクエリパラメータを生成
 */
export function getOptimizedImageUrl(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}
): string {
  const { width, height, quality = 75, format } = options;
  
  if (src.startsWith('http') || src.startsWith('//')) {
    // 外部画像の場合はそのまま返す
    return src;
  }
  
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 75) params.set('q', quality.toString());
  if (format) params.set('f', format);
  
  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
}

/**
 * 画像の遅延読み込み用のIntersection Observerを設定
 */
export function createImageObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }
  
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px 0px',
    threshold: 0.01,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
}

/**
 * 画像フォーマット対応状況をチェック
 */
export function checkImageFormatSupport(): {
  webp: boolean;
  avif: boolean;
} {
  if (typeof window === 'undefined') {
    return { webp: true, avif: true }; // サーバーサイドでは対応ありとする
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return {
    webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
    avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0
  };
}

/**
 * 画像の色彩解析からテーマカラーを抽出
 */
export async function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('#f3f4f6'); // デフォルトカラー
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let r = 0, g = 0, b = 0;
          const pixelCount = data.length / 4;
          
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          
          r = Math.floor(r / pixelCount);
          g = Math.floor(g / pixelCount);
          b = Math.floor(b / pixelCount);
          
          resolve(`rgb(${r}, ${g}, ${b})`);
        } catch (error) {
          resolve('#f3f4f6');
        }
      } else {
        resolve('#f3f4f6');
      }
    };
    
    img.onerror = () => resolve('#f3f4f6');
    img.src = imageSrc;
  });
}