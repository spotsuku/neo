/**
 * Heroes Steps Management API
 * Handles NEO Academia student hero progression tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/cloudflare-d1';
import { validateAuth } from '@/lib/auth-utils';
import { broadcastHeroStepUpdate, broadcastKPIAlert } from './stream/route.js';

// GET /api/heroes-steps - Get all hero steps data (with optional filtering)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const companyId = searchParams.get('company_id');
    const includeDefinitions = searchParams.get('include_definitions') === 'true';
    const includeKpis = searchParams.get('include_kpis') === 'true';
    
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = `
      SELECT hs.*, hsd.step_name, hsd.step_description, hsd.badge_icon, hsd.badge_color
      FROM heroes_steps hs
      LEFT JOIN heroes_step_definitions hsd ON hs.current_step = hsd.step_level
    `;
    const params = [];

    // Build WHERE clause based on filters
    const conditions = [];
    if (userId) {
      conditions.push('hs.user_id = ?');
      params.push(userId);
    }
    if (companyId) {
      conditions.push('hs.company_id = ?');
      params.push(companyId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY hs.updated_at DESC';

    const heroesSteps = await db.query(query, params);

    let response = {
      success: true,
      heroes_steps: heroesSteps,
      total_count: heroesSteps.length
    };

    // Include step definitions if requested
    if (includeDefinitions) {
      const definitions = await db.query(`
        SELECT * FROM heroes_step_definitions 
        ORDER BY step_level
      `);
      response.step_definitions = definitions;
    }

    // Include KPI data if requested
    if (includeKpis) {
      const kpiConfig = await db.query(`
        SELECT * FROM heroes_kpi_config 
        ORDER BY step_level
      `);
      
      // Calculate actual KPI values
      const totalUsers = await db.query(`
        SELECT COUNT(*) as total FROM heroes_steps
      `);
      const total = totalUsers[0]?.total || 0;

      const kpiResults = [];
      for (const kpi of kpiConfig) {
        let achievedCount = 0;
        
        if (kpi.step_level === 3) {
          // 3次以上到達率
          const result = await db.query(`
            SELECT COUNT(*) as count FROM heroes_steps 
            WHERE current_step >= 3
          `);
          achievedCount = result[0]?.count || 0;
        } else {
          // 特定レベル到達率
          const result = await db.query(`
            SELECT COUNT(*) as count FROM heroes_steps 
            WHERE current_step >= ?
          `, [kpi.step_level]);
          achievedCount = result[0]?.count || 0;
        }

        const actualPercentage = total > 0 ? (achievedCount / total) * 100 : 0;
        const isAlert = actualPercentage < (kpi.target_percentage - kpi.alert_threshold);

        kpiResults.push({
          ...kpi,
          achieved_count: achievedCount,
          total_users: total,
          actual_percentage: Math.round(actualPercentage * 100) / 100,
          target_percentage: kpi.target_percentage,
          is_alert: isAlert,
          gap: kpi.target_percentage - actualPercentage
        });
      }

      response.kpi_data = kpiResults;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting heroes steps:', error);
    return NextResponse.json({
      error: 'ヒーローステップデータの取得に失敗しました',
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/heroes-steps - Create or update hero step
export async function POST(request) {
  try {
    const { user_id, new_step, reason, evidence_urls, updated_by } = await request.json();

    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update steps
    const canUpdate = authResult.user.role === 'admin' || 
                     authResult.user.role === 'staff' || 
                     authResult.user.id === user_id;
    
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user_id || new_step === undefined) {
      return NextResponse.json({ 
        error: 'user_idとnew_stepは必須です' 
      }, { status: 400 });
    }

    if (new_step < 0 || new_step > 5) {
      return NextResponse.json({ 
        error: 'ステップは0〜5の範囲で指定してください' 
      }, { status: 400 });
    }

    // Get current step
    const currentHeroStep = await db.query(`
      SELECT * FROM heroes_steps WHERE user_id = ?
    `, [user_id]);

    const now = new Date().toISOString();
    const updatedBy = updated_by || authResult.user.id;

    if (currentHeroStep.length > 0) {
      // Update existing step
      const currentStep = currentHeroStep[0].current_step;
      
      await db.execute(`
        UPDATE heroes_steps 
        SET current_step = ?, previous_step = ?, step_achieved_at = ?, 
            step_updated_by = ?, notes = ?, updated_at = ?
        WHERE user_id = ?
      `, [new_step, currentStep, now, updatedBy, reason || null, now, user_id]);

      // Add to history (triggered automatically by database trigger)
      
    } else {
      // Create new step record
      await db.execute(`
        INSERT INTO heroes_steps (user_id, current_step, previous_step, step_achieved_at, 
                                 step_updated_by, notes, created_at, updated_at)
        VALUES (?, ?, 0, ?, ?, ?, ?, ?)
      `, [user_id, new_step, now, updatedBy, reason || null, now, now]);
    }

    // Add evidence to history if provided
    if (evidence_urls && evidence_urls.length > 0) {
      await db.execute(`
        INSERT INTO heroes_step_history (user_id, from_step, to_step, changed_at, 
                                        changed_by, reason, evidence_urls)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id, 
        currentHeroStep[0]?.current_step || 0, 
        new_step, 
        now, 
        updatedBy, 
        reason || null,
        JSON.stringify(evidence_urls)
      ]);
    }

    // Get updated step with definition
    const updatedStep = await db.query(`
      SELECT hs.*, hsd.step_name, hsd.step_description, hsd.next_actions, 
             hsd.badge_icon, hsd.badge_color
      FROM heroes_steps hs
      LEFT JOIN heroes_step_definitions hsd ON hs.current_step = hsd.step_level
      WHERE hs.user_id = ?
    `, [user_id]);

    const stepChanged = currentHeroStep.length > 0 ? 
      currentHeroStep[0].current_step !== new_step : true;

    // Broadcast real-time update
    if (stepChanged) {
      try {
        const updateData = {
          userId: user_id,
          fromStep: currentHeroStep[0]?.current_step || 0,
          toStep: new_step,
          stepName: updatedStep[0]?.step_name,
          badgeIcon: updatedStep[0]?.badge_icon,
          badgeColor: updatedStep[0]?.badge_color,
          updatedBy: updatedBy,
          reason: reason,
          companyId: updatedStep[0]?.company_id,
          timestamp: now
        };

        const notificationsSent = broadcastHeroStepUpdate(updateData);
        console.log(`Hero step update broadcasted to ${notificationsSent} connections`);

        // Check if this update affects KPIs and send alerts if needed
        await checkAndBroadcastKPIAlerts();

      } catch (broadcastError) {
        console.error('Error broadcasting hero step update:', broadcastError);
        // Don't fail the main operation if broadcast fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ヒーローステップが更新されました',
      hero_step: updatedStep[0],
      step_changed: stepChanged
    });

  } catch (error) {
    console.error('Error updating hero step:', error);
    return NextResponse.json({
      error: 'ヒーローステップの更新に失敗しました',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to check KPIs and broadcast alerts
async function checkAndBroadcastKPIAlerts() {
  try {
    // Get current KPI status
    const kpiConfig = await db.query(`
      SELECT * FROM heroes_kpi_config ORDER BY step_level
    `);

    const totalUsers = await db.query(`
      SELECT COUNT(*) as total FROM heroes_steps
    `);
    const total = totalUsers[0]?.total || 0;

    const alerts = [];

    for (const kpi of kpiConfig) {
      let achievedCount = 0;
      
      if (kpi.step_level === 3) {
        // 3次以上到達率
        const result = await db.query(`
          SELECT COUNT(*) as count FROM heroes_steps 
          WHERE current_step >= 3
        `);
        achievedCount = result[0]?.count || 0;
      } else {
        // 特定レベル到達率
        const result = await db.query(`
          SELECT COUNT(*) as count FROM heroes_steps 
          WHERE current_step >= ?
        `, [kpi.step_level]);
        achievedCount = result[0]?.count || 0;
      }

      const actualPercentage = total > 0 ? (achievedCount / total) * 100 : 0;
      const isAlert = actualPercentage < (kpi.target_percentage - kpi.alert_threshold);

      if (isAlert) {
        alerts.push({
          kpiName: kpi.kpi_name,
          actualPercentage: Math.round(actualPercentage * 100) / 100,
          targetPercentage: kpi.target_percentage,
          gap: Math.round((kpi.target_percentage - actualPercentage) * 100) / 100,
          achievedCount,
          totalUsers: total
        });
      }
    }

    // Broadcast alerts if any
    if (alerts.length > 0) {
      const alertData = {
        alerts,
        totalAlerts: alerts.length,
        message: 'KPI目標未達成の項目があります'
      };
      
      const alertsSent = broadcastKPIAlert(alertData);
      console.log(`KPI alerts broadcasted to ${alertsSent} admin connections`);
    }

  } catch (error) {
    console.error('Error checking KPI alerts:', error);
  }
}