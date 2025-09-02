/**
 * Individual User Heroes Steps API
 * Handles single user hero progression data and history
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/cloudflare-d1';
import { validateAuth } from '@/lib/auth-utils';
import { broadcastHeroStepUpdate } from '../stream/route.js';

// GET /api/heroes-steps/[userId] - Get specific user's hero step data
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('include_history') === 'true';
    const includeNextActions = searchParams.get('include_next_actions') === 'true';

    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can access this data
    const canAccess = authResult.user.role === 'admin' || 
                     authResult.user.role === 'staff' || 
                     authResult.user.id === userId;

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's current step with definition
    const heroStep = await db.query(`
      SELECT hs.*, hsd.step_name, hsd.step_description, hsd.step_objectives,
             hsd.next_actions, hsd.badge_icon, hsd.badge_color
      FROM heroes_steps hs
      LEFT JOIN heroes_step_definitions hsd ON hs.current_step = hsd.step_level
      WHERE hs.user_id = ?
    `, [userId]);

    if (heroStep.length === 0) {
      // Create initial step record if doesn't exist
      const now = new Date().toISOString();
      await db.execute(`
        INSERT INTO heroes_steps (user_id, current_step, step_achieved_at, created_at, updated_at)
        VALUES (?, 0, ?, ?, ?)
      `, [userId, now, now, now]);

      // Get the newly created step
      const newStep = await db.query(`
        SELECT hs.*, hsd.step_name, hsd.step_description, hsd.step_objectives,
               hsd.next_actions, hsd.badge_icon, hsd.badge_color
        FROM heroes_steps hs
        LEFT JOIN heroes_step_definitions hsd ON hs.current_step = hsd.step_level
        WHERE hs.user_id = ?
      `, [userId]);

      return NextResponse.json({
        success: true,
        hero_step: newStep[0],
        is_new_user: true
      });
    }

    let response = {
      success: true,
      hero_step: heroStep[0]
    };

    // Include step history if requested
    if (includeHistory) {
      const history = await db.query(`
        SELECT hsh.*, from_def.step_name as from_step_name, to_def.step_name as to_step_name
        FROM heroes_step_history hsh
        LEFT JOIN heroes_step_definitions from_def ON hsh.from_step = from_def.step_level
        LEFT JOIN heroes_step_definitions to_def ON hsh.to_step = to_def.step_level
        WHERE hsh.user_id = ?
        ORDER BY hsh.changed_at DESC
      `, [userId]);

      response.step_history = history;
    }

    // Include next actions if requested
    if (includeNextActions) {
      const currentStep = heroStep[0].current_step;
      const nextStep = Math.min(currentStep + 1, 5);
      
      const nextStepDef = await db.query(`
        SELECT * FROM heroes_step_definitions WHERE step_level = ?
      `, [nextStep]);

      response.next_step_info = nextStepDef[0] || null;
      response.progress_percentage = Math.round((currentStep / 5) * 100);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting user hero step:', error);
    return NextResponse.json({
      error: 'ユーザーのヒーローステップデータの取得に失敗しました',
      details: error.message
    }, { status: 500 });
  }
}

// PUT /api/heroes-steps/[userId] - Update specific user's hero step
export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const { new_step, reason, evidence_urls } = await request.json();

    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admin/staff can update others' steps
    const canUpdate = authResult.user.role === 'admin' || 
                     authResult.user.role === 'staff';

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (new_step === undefined) {
      return NextResponse.json({ 
        error: 'new_stepは必須です' 
      }, { status: 400 });
    }

    if (new_step < 0 || new_step > 5) {
      return NextResponse.json({ 
        error: 'ステップは0〜5の範囲で指定してください' 
      }, { status: 400 });
    }

    // Get current step
    const currentStep = await db.query(`
      SELECT current_step FROM heroes_steps WHERE user_id = ?
    `, [userId]);

    if (currentStep.length === 0) {
      return NextResponse.json({ 
        error: 'ユーザーのヒーローステップが見つかりません' 
      }, { status: 404 });
    }

    const now = new Date().toISOString();
    const oldStep = currentStep[0].current_step;

    // Update step
    await db.execute(`
      UPDATE heroes_steps 
      SET current_step = ?, previous_step = ?, step_achieved_at = ?, 
          step_updated_by = ?, notes = ?, updated_at = ?
      WHERE user_id = ?
    `, [new_step, oldStep, now, authResult.user.id, reason || null, now, userId]);

    // Add to history with evidence if provided
    if (evidence_urls && evidence_urls.length > 0) {
      await db.execute(`
        INSERT INTO heroes_step_history (user_id, from_step, to_step, changed_at, 
                                        changed_by, reason, evidence_urls)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, oldStep, new_step, now, authResult.user.id, reason || null, JSON.stringify(evidence_urls)]);
    }

    // Get updated step with definition
    const updatedStep = await db.query(`
      SELECT hs.*, hsd.step_name, hsd.step_description, hsd.next_actions, 
             hsd.badge_icon, hsd.badge_color
      FROM heroes_steps hs
      LEFT JOIN heroes_step_definitions hsd ON hs.current_step = hsd.step_level
      WHERE hs.user_id = ?
    `, [userId]);

    // Broadcast real-time update
    try {
      const updateData = {
        userId: userId,
        fromStep: oldStep,
        toStep: new_step,
        stepName: updatedStep[0]?.step_name,
        badgeIcon: updatedStep[0]?.badge_icon,
        badgeColor: updatedStep[0]?.badge_color,
        updatedBy: authResult.user.id,
        reason: reason,
        companyId: updatedStep[0]?.company_id,
        timestamp: now
      };

      const notificationsSent = broadcastHeroStepUpdate(updateData);
      console.log(`Hero step update broadcasted to ${notificationsSent} connections`);

    } catch (broadcastError) {
      console.error('Error broadcasting hero step update:', broadcastError);
      // Don't fail the main operation if broadcast fails
    }

    return NextResponse.json({
      success: true,
      message: `${userId}のヒーローステップが${oldStep}次から${new_step}次に更新されました`,
      hero_step: updatedStep[0],
      step_progression: new_step - oldStep
    });

  } catch (error) {
    console.error('Error updating user hero step:', error);
    return NextResponse.json({
      error: 'ヒーローステップの更新に失敗しました',
      details: error.message
    }, { status: 500 });
  }
}