import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NEO Portal - 統合ダッシュボードシステム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="/static/styles.css" rel="stylesheet" />
      </head>
      <body class="bg-gray-50 min-h-screen">
        <header class="neo-header text-white p-4 mb-6">
          <div class="container mx-auto">
            <h1 class="text-2xl font-bold">🎯 NEO Portal</h1>
            <p class="text-sm opacity-90">統合ダッシュボードシステム - Cloudflare Pages版</p>
          </div>
        </header>
        <main class="container mx-auto px-4">
          {children}
        </main>
        <footer class="mt-12 py-6 bg-gray-800 text-white text-center">
          <p>&copy; 2024 NEO Portal - Version 2.0.0 CF</p>
        </footer>
      </body>
    </html>
  )
})
