/**
 * Heroes Steps Analytics API
 * Provides KPI data, distribution charts, and aggregate statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/cloudflare-d1';
import { validateAuth } from '@/lib/auth-utils';

// GET /api/heroes-steps/analytics - Get analytics and KPI data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const reportType = searchParams.get('report_type') || 'full'; // full, kpi, distribution, trends

    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let response = {
      success: true,
      generated_at: new Date().toISOString()
    };

    // Build base query with optional company filter
    const whereClause = companyId ? 'WHERE company_id = ?' : '';
    const params = companyId ? [companyId] : [];

    // 1. KPI Data
    if (reportType === 'full' || reportType === 'kpi') {
      const kpiConfig = await db.query(`
        SELECT * FROM heroes_kpi_config ORDER BY step_level
      `);

      const totalUsersQuery = `SELECT COUNT(*) as total FROM heroes_steps ${whereClause}`;
      const totalUsers = await db.query(totalUsersQuery, params);
      const total = totalUsers[0]?.total || 0;

      const kpiResults = [];
      for (const kpi of kpiConfig) {
        let achievedQuery;
        let achievedParams = [...params];

        if (kpi.step_level === 3) {
          // 3次以上到達率
          achievedQuery = `
            SELECT COUNT(*) as count FROM heroes_steps 
            ${whereClause} ${whereClause ? 'AND' : 'WHERE'} current_step >= 3
          `;
        } else {
          // 特定レベル到達率
          achievedQuery = `
            SELECT COUNT(*) as count FROM heroes_steps 
            ${whereClause} ${whereClause ? 'AND' : 'WHERE'} current_step >= ?
          `;
          achievedParams.push(kpi.step_level);
        }

        const achievedResult = await db.query(achievedQuery, achievedParams);
        const achievedCount = achievedResult[0]?.count || 0;
        const actualPercentage = total > 0 ? (achievedCount / total) * 100 : 0;
        const isAlert = actualPercentage < (kpi.target_percentage - kpi.alert_threshold);

        kpiResults.push({
          ...kpi,
          achieved_count: achievedCount,
          total_users: total,
          actual_percentage: Math.round(actualPercentage * 100) / 100,
          target_percentage: kpi.target_percentage,
          is_alert: isAlert,
          gap: Math.round((kpi.target_percentage - actualPercentage) * 100) / 100,
          status: isAlert ? 'alert' : actualPercentage >= kpi.target_percentage ? 'achieved' : 'in_progress'
        });
      }

      response.kpi_data = kpiResults;
      response.total_users = total;
    }

    // 2. Step Distribution
    if (reportType === 'full' || reportType === 'distribution') {
      const distributionQuery = `
        SELECT hs.current_step, hsd.step_name, hsd.badge_color,
               COUNT(*) as user_count,
               ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM heroes_steps ${whereClause})), 2) as percentage
        FROM heroes_steps hs
        LEFT JOIN heroes_step_definitions hsd ON hs.current_step = hsd.step_level
        ${whereClause}
        GROUP BY hs.current_step, hsd.step_name, hsd.badge_color
        ORDER BY hs.current_step
      `;

      const distribution = await db.query(distributionQuery, params);
      
      // Ensure all steps 0-5 are represented
      const completeDistribution = [];
      for (let step = 0; step <= 5; step++) {
        const existing = distribution.find(d => d.current_step === step);
        if (existing) {
          completeDistribution.push(existing);
        } else {
          const stepDef = await db.query(
            'SELECT step_name, badge_color FROM heroes_step_definitions WHERE step_level = ?', 
            [step]
          );
          completeDistribution.push({
            current_step: step,
            step_name: stepDef[0]?.step_name || `${step}次`,
            badge_color: stepDef[0]?.badge_color || '#6b7280',
            user_count: 0,
            percentage: 0
          });
        }
      }

      response.step_distribution = completeDistribution;
    }

    // 3. Company Breakdown (for admin users)
    if (reportType === 'full' && authResult.user.role === 'admin' && !companyId) {
      const companyBreakdown = await db.query(`
        SELECT 
          COALESCE(company_id, 'Individual') as company_id,
          COUNT(*) as total_users,
          AVG(current_step) as avg_step,
          MAX(current_step) as max_step,
          COUNT(CASE WHEN current_step >= 3 THEN 1 END) as leaders_count,
          COUNT(CASE WHEN current_step >= 4 THEN 1 END) as experts_count,
          COUNT(CASE WHEN current_step = 5 THEN 1 END) as heroes_count
        FROM heroes_steps
        GROUP BY company_id
        ORDER BY total_users DESC
      `);

      response.company_breakdown = companyBreakdown.map(company => ({
        ...company,
        avg_step: Math.round(company.avg_step * 100) / 100,
        leaders_percentage: Math.round((company.leaders_count / company.total_users) * 100 * 100) / 100,
        experts_percentage: Math.round((company.experts_count / company.total_users) * 100 * 100) / 100,
        heroes_percentage: Math.round((company.heroes_count / company.total_users) * 100 * 100) / 100
      }));
    }

    // 4. Recent Activity/Trends
    if (reportType === 'full' || reportType === 'trends') {
      const recentActivity = await db.query(`
        SELECT 
          hsh.to_step,
          COUNT(*) as progression_count,
          DATE(hsh.changed_at) as progression_date
        FROM heroes_step_history hsh
        ${companyId ? 'JOIN heroes_steps hs ON hsh.user_id = hs.user_id' : ''}
        ${companyId ? 'WHERE hs.company_id = ?' : ''}
        ${companyId ? '' : 'WHERE 1=1'}
        AND hsh.changed_at >= date('now', '-30 days')
        AND hsh.to_step > hsh.from_step
        GROUP BY hsh.to_step, DATE(hsh.changed_at)
        ORDER BY progression_date DESC, hsh.to_step DESC
        LIMIT 50
      `, companyId ? [companyId] : []);

      response.recent_progressions = recentActivity;

      // Top performers (recent step increases)
      const topPerformersQuery = `
        SELECT 
          hsh.user_id,
          hsh.from_step,
          hsh.to_step,
          hsh.to_step - hsh.from_step as step_increase,
          hsh.changed_at,
          hsd.step_name as new_step_name,
          hsd.badge_color
        FROM heroes_step_history hsh
        LEFT JOIN heroes_step_definitions hsd ON hsh.to_step = hsd.step_level
        ${companyId ? 'JOIN heroes_steps hs ON hsh.user_id = hs.user_id' : ''}
        ${companyId ? 'WHERE hs.company_id = ?' : 'WHERE 1=1'}
        AND hsh.changed_at >= date('now', '-7 days')
        AND hsh.to_step > hsh.from_step
        ORDER BY step_increase DESC, hsh.changed_at DESC
        LIMIT 10
      `;

      const topPerformers = await db.query(topPerformersQuery, companyId ? [companyId] : []);
      response.recent_top_performers = topPerformers;
    }

    // 5. Alerts and Notifications
    if (reportType === 'full' || reportType === 'alerts') {
      const alerts = [];

      // Check KPI alerts
      if (response.kpi_data) {
        response.kpi_data.forEach(kpi => {
          if (kpi.is_alert) {
            alerts.push({
              type: 'kpi_alert',
              severity: 'warning',
              title: `${kpi.kpi_name}が目標を下回っています`,
              message: `現在${kpi.actual_percentage}%（目標: ${kpi.target_percentage}%）`,
              gap: kpi.gap,
              kpi_name: kpi.kpi_name
            });
          }
        });
      }

      // Check for stagnant users (no progression in 30 days)
      const stagnantUsersQuery = `
        SELECT COUNT(*) as count
        FROM heroes_steps hs
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} hs.current_step < 3
        AND hs.updated_at <= date('now', '-30 days')
      `;

      const stagnantResult = await db.query(stagnantUsersQuery, params);
      const stagnantCount = stagnantResult[0]?.count || 0;

      if (stagnantCount > 0) {
        alerts.push({
          type: 'stagnant_users',
          severity: 'info',
          title: '長期停滞ユーザーの確認',
          message: `${stagnantCount}人のユーザーが30日間ステップアップしていません`,
          count: stagnantCount
        });
      }

      response.alerts = alerts;
      response.alerts_count = alerts.length;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting heroes steps analytics:', error);
    return NextResponse.json({
      error: 'ヒーローステップ分析データの取得に失敗しました',
      details: error.message
    }, { status: 500 });
  }
}