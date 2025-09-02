/**
 * Heroes Steps Real-time Updates API
 * Server-Sent Events (SSE) for real-time hero step change notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth-utils';

// In-memory store for SSE connections (in production, use Redis or similar)
const sseConnections = new Map();

// GET /api/heroes-steps/stream - SSE endpoint for real-time updates
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const userId = searchParams.get('user_id');

    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check permissions
    const canAccess = authResult.user.role === 'admin' || 
                     authResult.user.role === 'staff' || 
                     (userId && authResult.user.id === userId);

    if (!canAccess) {
      return new Response('Forbidden', { status: 403 });
    }

    // Create SSE response
    const stream = new ReadableStream({
      start(controller) {
        // Generate unique connection ID
        const connectionId = `${authResult.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Store connection info
        const connectionInfo = {
          controller,
          userId: authResult.user.id,
          userRole: authResult.user.role,
          companyId: companyId || authResult.user.company_id,
          targetUserId: userId,
          lastPing: Date.now()
        };

        sseConnections.set(connectionId, connectionInfo);

        // Send initial connection message
        const initialMessage = {
          type: 'connection',
          data: {
            message: 'ヒーローステップ更新の監視を開始しました',
            connectionId,
            timestamp: new Date().toISOString()
          }
        };

        try {
          controller.enqueue(formatSSEMessage(initialMessage));
        } catch (error) {
          console.error('Error sending initial SSE message:', error);
        }

        // Set up periodic ping to keep connection alive
        const pingInterval = setInterval(() => {
          try {
            const connection = sseConnections.get(connectionId);
            if (!connection) {
              clearInterval(pingInterval);
              return;
            }

            const pingMessage = {
              type: 'ping',
              data: {
                timestamp: new Date().toISOString(),
                connectionCount: sseConnections.size
              }
            };

            connection.controller.enqueue(formatSSEMessage(pingMessage));
            connection.lastPing = Date.now();

          } catch (error) {
            console.error('Error sending SSE ping:', error);
            clearInterval(pingInterval);
            sseConnections.delete(connectionId);
          }
        }, 30000); // Ping every 30 seconds

        // Clean up on connection close
        request.signal?.addEventListener('abort', () => {
          clearInterval(pingInterval);
          sseConnections.delete(connectionId);
          try {
            controller.close();
          } catch (error) {
            // Connection already closed
          }
        });

        // Set timeout for inactive connections (5 minutes)
        setTimeout(() => {
          const connection = sseConnections.get(connectionId);
          if (connection && Date.now() - connection.lastPing > 300000) {
            clearInterval(pingInterval);
            sseConnections.delete(connectionId);
            try {
              controller.close();
            } catch (error) {
              // Connection already closed
            }
          }
        }, 300000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper function to format SSE messages
function formatSSEMessage(message) {
  const data = JSON.stringify(message);
  return new TextEncoder().encode(`event: ${message.type}\ndata: ${data}\n\n`);
}

// Function to broadcast hero step updates (called from other API endpoints)
export function broadcastHeroStepUpdate(updateData) {
  const message = {
    type: 'hero_step_update',
    data: {
      ...updateData,
      timestamp: new Date().toISOString()
    }
  };

  const messagesToSend = [];
  
  // Determine which connections should receive this update
  for (const [connectionId, connection] of sseConnections.entries()) {
    let shouldSend = false;

    // Admin users get all updates
    if (connection.userRole === 'admin') {
      shouldSend = true;
    }
    // Staff users get updates for their company
    else if (connection.userRole === 'staff' && connection.companyId === updateData.companyId) {
      shouldSend = true;
    }
    // Users get updates for their own progress
    else if (connection.targetUserId === updateData.userId || connection.userId === updateData.userId) {
      shouldSend = true;
    }
    // Company-filtered connections
    else if (connection.companyId && connection.companyId === updateData.companyId) {
      shouldSend = true;
    }

    if (shouldSend) {
      messagesToSend.push({ connectionId, connection });
    }
  }

  // Send messages
  messagesToSend.forEach(({ connectionId, connection }) => {
    try {
      connection.controller.enqueue(formatSSEMessage(message));
    } catch (error) {
      console.error(`Error sending SSE message to ${connectionId}:`, error);
      // Remove failed connection
      sseConnections.delete(connectionId);
    }
  });

  return messagesToSend.length;
}

// Function to broadcast KPI alerts
export function broadcastKPIAlert(alertData) {
  const message = {
    type: 'kpi_alert',
    data: {
      ...alertData,
      timestamp: new Date().toISOString()
    }
  };

  let sentCount = 0;

  // Send to admin users only
  for (const [connectionId, connection] of sseConnections.entries()) {
    if (connection.userRole === 'admin') {
      try {
        connection.controller.enqueue(formatSSEMessage(message));
        sentCount++;
      } catch (error) {
        console.error(`Error sending KPI alert to ${connectionId}:`, error);
        sseConnections.delete(connectionId);
      }
    }
  }

  return sentCount;
}

// Function to get connection statistics
export function getSSEStats() {
  const stats = {
    totalConnections: sseConnections.size,
    connectionsByRole: {},
    connectionsByCompany: {},
    oldestConnection: null,
    newestConnection: null
  };

  let oldestTime = Date.now();
  let newestTime = 0;

  for (const [connectionId, connection] of sseConnections.entries()) {
    // Count by role
    stats.connectionsByRole[connection.userRole] = (stats.connectionsByRole[connection.userRole] || 0) + 1;
    
    // Count by company
    if (connection.companyId) {
      stats.connectionsByCompany[connection.companyId] = (stats.connectionsByCompany[connection.companyId] || 0) + 1;
    }

    // Track oldest/newest
    const connectionTime = parseInt(connectionId.split('-')[1]);
    if (connectionTime < oldestTime) {
      oldestTime = connectionTime;
      stats.oldestConnection = connectionId;
    }
    if (connectionTime > newestTime) {
      newestTime = connectionTime;
      stats.newestConnection = connectionId;
    }
  }

  return stats;
}

// Cleanup function for stale connections
export function cleanupStaleConnections() {
  const now = Date.now();
  const staleThreshold = 300000; // 5 minutes
  let cleaned = 0;

  for (const [connectionId, connection] of sseConnections.entries()) {
    if (now - connection.lastPing > staleThreshold) {
      try {
        connection.controller.close();
      } catch (error) {
        // Connection already closed
      }
      sseConnections.delete(connectionId);
      cleaned++;
    }
  }

  return cleaned;
}

// Periodic cleanup of stale connections
setInterval(cleanupStaleConnections, 60000); // Run every minute