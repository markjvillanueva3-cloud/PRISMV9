/**
 * Webhook receiver for external system events.
 *
 * Receives POST from CAM software, machine controllers, CI systems,
 * MTConnect adapters, and OPC-UA connectors.
 * Routes notifications to appropriate messaging channels.
 *
 * Port: 18362 (configurable via PRISM_WEBHOOK_PORT)
 *
 * Endpoints:
 *   POST /webhook           — generic event ingestion
 *   POST /webhook/alarm     — machine alarm forwarding
 *   POST /webhook/build     — CI/CD build status
 *   POST /webhook/wear      — tool wear threshold alerts
 *   GET  /webhook/health    — health check
 *   GET  /webhook/stats     — event statistics
 *
 * @module bot/webhook-receiver
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { BOT_CONFIG } from './bot-config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  source: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export type WebhookHandler = (event: WebhookEvent) => Promise<void>;

interface WebhookStats {
  totalReceived: number;
  totalProcessed: number;
  totalErrors: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  lastEventAt: string | null;
  startedAt: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const webhookHandlers: Map<string, WebhookHandler> = new Map();
const wildcardHandlers: WebhookHandler[] = [];

const stats: WebhookStats = {
  totalReceived: 0,
  totalProcessed: 0,
  totalErrors: 0,
  bySource: {},
  byType: {},
  lastEventAt: null,
  startedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Handler registration
// ---------------------------------------------------------------------------

/**
 * Register a handler for a specific source (e.g., 'mtconnect', 'fusion360', 'ci').
 */
export function registerWebhookHandler(source: string, handler: WebhookHandler): void {
  webhookHandlers.set(source, handler);
}

/**
 * Register a handler that receives ALL events regardless of source.
 */
export function registerWildcardHandler(handler: WebhookHandler): void {
  wildcardHandlers.push(handler);
}

/**
 * Unregister a handler.
 */
export function unregisterWebhookHandler(source: string): boolean {
  return webhookHandlers.delete(source);
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX_BODY = 1_048_576; // 1MB

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Powered-By': 'PRISM v9' });
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleGenericWebhook(body: string, res: ServerResponse): Promise<void> {
  const event: WebhookEvent = JSON.parse(body);
  event.timestamp = event.timestamp || new Date().toISOString();
  event.priority = event.priority || 'normal';

  stats.totalReceived++;
  stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
  stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
  stats.lastEventAt = event.timestamp;

  // Source-specific handler
  const handler = webhookHandlers.get(event.source);
  if (handler) {
    await handler(event);
    stats.totalProcessed++;
  }

  // Wildcard handlers
  for (const wh of wildcardHandlers) {
    await wh(event);
  }

  if (!handler && wildcardHandlers.length === 0) {
    sendJSON(res, 404, { error: `No handler for source: ${event.source}`, registeredSources: [...webhookHandlers.keys()] });
    return;
  }

  sendJSON(res, 200, { status: 'ok', source: event.source, type: event.type });
}

async function handleAlarmWebhook(body: string, res: ServerResponse): Promise<void> {
  const data = JSON.parse(body);
  const event: WebhookEvent = {
    source: data.source || 'machine',
    type: 'alarm',
    payload: data,
    timestamp: new Date().toISOString(),
    priority: data.severity === 'critical' ? 'critical' : 'high',
  };

  stats.totalReceived++;
  stats.byType['alarm'] = (stats.byType['alarm'] || 0) + 1;
  stats.lastEventAt = event.timestamp;

  const handler = webhookHandlers.get('alarm') || webhookHandlers.get(event.source);
  if (handler) {
    await handler(event);
    stats.totalProcessed++;
  }
  for (const wh of wildcardHandlers) {
    await wh(event);
  }

  sendJSON(res, 200, { status: 'ok', type: 'alarm', code: data.code });
}

async function handleBuildWebhook(body: string, res: ServerResponse): Promise<void> {
  const data = JSON.parse(body);
  const event: WebhookEvent = {
    source: 'ci',
    type: data.status === 'failure' ? 'build_failure' : 'build_success',
    payload: data,
    timestamp: new Date().toISOString(),
    priority: data.status === 'failure' ? 'high' : 'low',
  };

  stats.totalReceived++;
  stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
  stats.lastEventAt = event.timestamp;

  const handler = webhookHandlers.get('ci');
  if (handler) {
    await handler(event);
    stats.totalProcessed++;
  }
  for (const wh of wildcardHandlers) {
    await wh(event);
  }

  sendJSON(res, 200, { status: 'ok', type: event.type });
}

async function handleWearWebhook(body: string, res: ServerResponse): Promise<void> {
  const data = JSON.parse(body);
  const event: WebhookEvent = {
    source: data.source || 'tool_monitor',
    type: 'tool_wear_alert',
    payload: data,
    timestamp: new Date().toISOString(),
    priority: (data.wearPercent || 0) > 90 ? 'critical' : 'high',
  };

  stats.totalReceived++;
  stats.byType['tool_wear_alert'] = (stats.byType['tool_wear_alert'] || 0) + 1;
  stats.lastEventAt = event.timestamp;

  const handler = webhookHandlers.get('wear') || webhookHandlers.get(event.source);
  if (handler) {
    await handler(event);
    stats.totalProcessed++;
  }
  for (const wh of wildcardHandlers) {
    await wh(event);
  }

  sendJSON(res, 200, { status: 'ok', type: 'tool_wear_alert' });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function startWebhookServer(port?: number) {
  const listenPort = port || BOT_CONFIG.webhook.port;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers for browser-based tools
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // GET endpoints
    if (req.method === 'GET') {
      if (req.url === '/webhook/health') {
        sendJSON(res, 200, {
          status: 'ok',
          uptime: Date.now() - new Date(stats.startedAt).getTime(),
          handlers: [...webhookHandlers.keys()],
        });
        return;
      }
      if (req.url === '/webhook/stats') {
        sendJSON(res, 200, stats);
        return;
      }
      sendJSON(res, 404, { error: 'Not found' });
      return;
    }

    // POST endpoints
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);

        switch (req.url) {
          case '/webhook':       await handleGenericWebhook(body, res); break;
          case '/webhook/alarm': await handleAlarmWebhook(body, res);   break;
          case '/webhook/build': await handleBuildWebhook(body, res);   break;
          case '/webhook/wear':  await handleWearWebhook(body, res);    break;
          default:
            sendJSON(res, 404, { error: 'Unknown webhook endpoint', available: ['/webhook', '/webhook/alarm', '/webhook/build', '/webhook/wear'] });
        }
      } catch (e) {
        stats.totalErrors++;
        const message = e instanceof Error ? e.message : 'Unknown error';
        sendJSON(res, 400, { error: message });
      }
      return;
    }

    sendJSON(res, 405, { error: 'Method not allowed' });
  });

  const webhookHost = process.env.PRISM_BIND_HOST || '127.0.0.1';
  server.listen(listenPort, webhookHost, () => {
    console.log(`[PRISM Webhook] Listening on ${webhookHost}:${listenPort}`);
    console.log(`[PRISM Webhook] Endpoints: POST /webhook, /webhook/alarm, /webhook/build, /webhook/wear`);
    console.log(`[PRISM Webhook] Health: GET /webhook/health | Stats: GET /webhook/stats`);
  });

  return server;
}

/**
 * Get current webhook stats (for monitoring/dashboards).
 */
export function getWebhookStats(): Readonly<WebhookStats> {
  return { ...stats };
}

/**
 * Reset stats (for testing).
 */
export function resetWebhookStats(): void {
  stats.totalReceived = 0;
  stats.totalProcessed = 0;
  stats.totalErrors = 0;
  stats.bySource = {};
  stats.byType = {};
  stats.lastEventAt = null;
}
