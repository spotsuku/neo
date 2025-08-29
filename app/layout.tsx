import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NEO Digital Platform',
  description: '企業マイページとアカデミア生ポータルを統合した地域展開対応プラットフォーム',
  keywords: 'NEO, 福岡, デジタルプラットフォーム, 企業, 学生, マルチテナント',
  authors: [{ name: 'NEO Digital Platform Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}