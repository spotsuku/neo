'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ComponentLoadingSpinner } from './loading-spinner';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'eager' | 'lazy';
}

/**
 * 最適化されたイメージコンポーネント
 * Next.js Imageをベースに、遅延読み込み、エラーハンドリング、ローディング状態を提供
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  onLoad,
  onError,
  loading = 'lazy',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

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
          <svg 
            className="w-8 h-8 mx-auto mb-2 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">画像を読み込めませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10"
          style={fill ? {} : { width, height }}
        >
          <ComponentLoadingSpinner size="sm" />
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        loading={priority ? 'eager' : loading}
        className={cn("transition-opacity duration-300", {
          "opacity-0": isLoading,
          "opacity-100": !isLoading
        })}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}

/**
 * アバター用の最適化イメージコンポーネント
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  fallbackText,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number;
  fallbackText?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-300 text-gray-600 font-medium rounded-full",
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallbackText ? fallbackText.charAt(0).toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      quality={85}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

/**
 * レスポンシブイメージコンポーネント
 */
export function ResponsiveImage({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'fill'> & {
  aspectRatio?: string;
}) {
  const [aspectWidth, aspectHeight] = aspectRatio.split('/').map(Number);
  
  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        {...props}
      />
    </div>
  );
}

/**
 * ギャラリー用の最適化イメージコンポーネント
 */
export function GalleryImage({
  src,
  alt,
  thumbnail,
  onClick,
  className,
  ...props
}: OptimizedImageProps & {
  thumbnail?: string;
  onClick?: () => void;
}) {
  const imageSrc = thumbnail || src;
  
  return (
    <div 
      className={cn(
        "cursor-pointer transition-transform hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      <ResponsiveImage
        src={imageSrc}
        alt={alt}
        aspectRatio="1/1"
        quality={60}
        loading="lazy"
        {...props}
      />
    </div>
  );
}