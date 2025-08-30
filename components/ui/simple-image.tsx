'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SimpleOptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
}

/**
 * シンプルで安全な最適化イメージコンポーネント
 * 基本的なNext.js Imageの最適化機能のみ使用
 */
export function SimpleOptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  ...props
}: SimpleOptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-200 text-gray-500",
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <div className="text-xs">画像を読み込めませんでした</div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      quality={quality}
      className={cn("transition-opacity duration-300", className, {
        "opacity-0": isLoading,
        "opacity-100": !isLoading
      })}
      onLoad={() => setIsLoading(false)}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

/**
 * レスポンシブイメージ用のシンプルコンポーネント
 */
export function SimpleResponsiveImage({
  src,
  alt,
  className,
  priority = false,
  ...props
}: Omit<SimpleOptimizedImageProps, 'width' | 'height'>) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={cn("bg-gray-200 flex items-center justify-center", className)}>
        <span className="text-gray-500 text-sm">画像エラー</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={75}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        onError={() => setHasError(true)}
        {...props}
      />
    </div>
  );
}