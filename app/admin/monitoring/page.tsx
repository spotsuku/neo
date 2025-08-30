/**
 * 管理者向けシステム監視ページ
 */
import { Metadata } from 'next';
import MonitoringDashboard from '@/components/admin/monitoring-dashboard';
import { webVitalsScript } from '@/lib/monitoring';

export const metadata: Metadata = {
  title: 'システム監視 | NEO Digital Platform',
  description: 'システムの健全性とパフォーマンスを監視',
};

export default function MonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <MonitoringDashboard />
      </div>

      {/* Web Vitals測定スクリプト */}
      <script
        dangerouslySetInnerHTML={{
          __html: webVitalsScript
        }}
      />
    </div>
  );
}