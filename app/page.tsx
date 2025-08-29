export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 neo-text-gradient">
            NEO Digital Platform
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            企業マイページとアカデミア生ポータルを統合した
            <br />
            地域展開対応プラットフォーム
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                🌐 マルチテナント対応
              </h3>
              <p className="text-gray-600">
                FUK・ISK・NIG地域別のデータ分離と
                権限別アクセス制御を実現
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                🔐 4ロール認証
              </h3>
              <p className="text-gray-600">
                企業管理者・学生・事務局・オーナーの
                役割別セキュアなアクセス管理
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                📊 統合CMS
              </h3>
              <p className="text-gray-600">
                お知らせ・クラス・プロジェクト・委員会の
                統合管理システム
              </p>
            </div>
          </div>
          
          <div className="mt-12">
            <div className="bg-neo-primary text-white px-8 py-4 rounded-lg inline-block">
              🚀 M0 MVP基盤 構築中...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}