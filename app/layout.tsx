/**
 * ルートレイアウト - NEO Digital Platform
 */
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NEO Digital Platform',
  description: 'デジタル学習管理システム - 効率的な学習体験を提供',
  keywords: ['学習管理', 'デジタル教育', 'プラットフォーム'],
  authors: [{ name: 'NEO Digital Platform Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'NEO Digital Platform',
    description: 'デジタル学習管理システム - 効率的な学習体験を提供',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'NEO Digital Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEO Digital Platform',
    description: 'デジタル学習管理システム - 効率的な学習体験を提供',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        {children}
      </body>
    </html>
  )
}