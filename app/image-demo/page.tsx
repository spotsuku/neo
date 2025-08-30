'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptimizedImage, OptimizedAvatar, ResponsiveImage, GalleryImage } from '@/components/ui/optimized-image';
import { generateSizes, getImageOptimizationConfig, checkImageFormatSupport } from '@/lib/image-optimization';

export default function ImageDemoPage() {
  const [formatSupport, setFormatSupport] = useState<{webp: boolean; avif: boolean} | null>(null);
  
  // コンポーネントマウント時にフォーマット対応状況をチェック
  useState(() => {
    setFormatSupport(checkImageFormatSupport());
  });

  // サンプル画像URL（実際のプロジェクトでは適切な画像に変更）
  const sampleImages = {
    hero: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    gallery: [
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1518756131217-31eb79b20e8f?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop'
    ]
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          画像最適化デモンストレーション
        </h1>
        <p className="text-gray-600">
          Next.js Image最適化とカスタムコンポーネントの動作確認
        </p>
      </div>

      {/* フォーマット対応状況 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>ブラウザ対応状況</span>
            <Badge variant="outline">リアルタイム検出</Badge>
          </CardTitle>
          <CardDescription>
            現在のブラウザでサポートされている次世代画像フォーマット
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">WebP</span>
              <Badge variant={formatSupport?.webp ? "default" : "secondary"}>
                {formatSupport?.webp ? "対応" : "未対応"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">AVIF</span>
              <Badge variant={formatSupport?.avif ? "default" : "secondary"}>
                {formatSupport?.avif ? "対応" : "未対応"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">ヒーロー画像</TabsTrigger>
          <TabsTrigger value="avatar">アバター</TabsTrigger>
          <TabsTrigger value="responsive">レスポンシブ</TabsTrigger>
          <TabsTrigger value="gallery">ギャラリー</TabsTrigger>
        </TabsList>

        {/* ヒーロー画像デモ */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>ヒーロー画像最適化</CardTitle>
              <CardDescription>
                高品質・優先読み込み・ぼかしプレースホルダー対応
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <OptimizedImage
                  src={sampleImages.hero}
                  alt="ヒーロー画像のデモ"
                  width={1200}
                  height={600}
                  priority={true}
                  quality={90}
                  placeholder="empty"
                  className="w-full rounded-lg shadow-lg"
                  sizes="100vw"
                />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="font-medium">品質</div>
                    <div className="text-blue-600">90%</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="font-medium">優先度</div>
                    <div className="text-green-600">高</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <div className="font-medium">フォーマット</div>
                    <div className="text-purple-600">AVIF/WebP</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded">
                    <div className="font-medium">プレースホルダー</div>
                    <div className="text-orange-600">ぼかし</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* アバター画像デモ */}
        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>アバター画像最適化</CardTitle>
              <CardDescription>
                円形画像・フォールバック対応・複数サイズ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <OptimizedAvatar
                    src={sampleImages.avatar}
                    alt="ユーザーアバター"
                    size={64}
                    fallbackText="U"
                  />
                  <OptimizedAvatar
                    src={sampleImages.avatar}
                    alt="ユーザーアバター"
                    size={48}
                    fallbackText="U"
                  />
                  <OptimizedAvatar
                    src={sampleImages.avatar}
                    alt="ユーザーアバター"
                    size={32}
                    fallbackText="U"
                  />
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">エラーハンドリングテスト</h4>
                  <div className="flex items-center gap-4">
                    <OptimizedAvatar
                      src="/invalid-image.jpg"
                      alt="存在しない画像"
                      size={64}
                      fallbackText="E"
                    />
                    <span className="text-sm text-gray-600">
                      画像が存在しない場合、フォールバックテキストが表示されます
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* レスポンシブ画像デモ */}
        <TabsContent value="responsive">
          <Card>
            <CardHeader>
              <CardTitle>レスポンシブ画像最適化</CardTitle>
              <CardDescription>
                デバイスサイズに応じた画像配信・アスペクト比固定
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveImage
                    src={sampleImages.gallery[0]}
                    alt="レスポンシブ画像 16:9"
                    aspectRatio="16/9"
                    className="rounded-lg"
                  />
                  <ResponsiveImage
                    src={sampleImages.gallery[1]}
                    alt="レスポンシブ画像 1:1"
                    aspectRatio="1/1"
                    className="rounded-lg"
                  />
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">sizes属性の例</h4>
                  <code className="text-sm bg-white p-2 rounded border block">
                    {generateSizes({ 
                      mobile: '100vw', 
                      tablet: '50vw', 
                      desktop: '33vw', 
                      default: '25vw' 
                    })}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ギャラリー画像デモ */}
        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>ギャラリー画像最適化</CardTitle>
              <CardDescription>
                遅延読み込み・ホバー効果・グリッドレイアウト
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sampleImages.gallery.map((src, index) => (
                    <GalleryImage
                      key={index}
                      src={src}
                      alt={`ギャラリー画像 ${index + 1}`}
                      onClick={() => alert(`画像 ${index + 1} がクリックされました`)}
                      className="rounded-lg overflow-hidden shadow-md"
                    />
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">遅延読み込み対応</Badge>
                  <Badge variant="outline">ホバーエフェクト</Badge>
                  <Badge variant="outline">クリックハンドラー</Badge>
                  <Badge variant="outline">品質: 60%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* パフォーマンス情報 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>最適化効果</CardTitle>
          <CardDescription>
            実装されている画像最適化技術
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">フォーマット最適化</h4>
              <ul className="text-sm space-y-1">
                <li>• AVIF形式優先配信</li>
                <li>• WebP形式フォールバック</li>
                <li>• 従来形式の互換性維持</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">サイズ最適化</h4>
              <ul className="text-sm space-y-1">
                <li>• レスポンシブ画像配信</li>
                <li>• デバイス別サイズ調整</li>
                <li>• 品質とサイズのバランス</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">UX最適化</h4>
              <ul className="text-sm space-y-1">
                <li>• 遅延読み込み</li>
                <li>• プレースホルダー表示</li>
                <li>• エラーハンドリング</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}