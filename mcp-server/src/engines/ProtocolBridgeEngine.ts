/**
 * PRISM F7: Protocol Bridge Engine
 * ==================================
 * 
 * Multi-protocol gateway for external system integration.
 * Routes external requests through REST/gRPC/GraphQL/WebSocket
 * to internal PRISM dispatchers with auth, rate limiting, and logging.
 * 
 * SAFETY: Bridge failure = external integrations unavailable.
 * All internal PRISM operations continue independently.
 * Bridge is OUTWARD-FACING ONLY — never in the safety path.
 * 
 * @version 1.0.0
 * @feature F7
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  ProtocolEndpoint, ProtocolType, AuthMethod, EndpointStatus,
  ApiKeyRecord, BridgeRequest, BridgeResponse, RateLimit,
  ProtocolBridgeConfig, DEFAULT_BRIDGE_CONFIG, DEFAULT_RATE_LIMIT,
  RouteMap, RouteEntry,
} from '../types/bridge-types.js';
import { log } from '../utils/Logger.js';

// ============================================================================
// STATE PATHS
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'bridge');
const ENDPOINTS_PATH = path.join(STATE_DIR, 'endpoints.json');
const KEYS_PATH = path.join(STATE_DIR, 'api_keys.json');
const REQUEST_LOG = path.join(STATE_DIR, 'request_log.jsonl');

function ensureDirs(): void {
  try { if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true }); } catch { /* non-fatal */ }
}

// ============================================================================
// RATE LIMITER — Token bucket per key/endpoint
// ============================================================================

interface BucketState {
  tokens: number;
  last_refill: number;
  minute_count: number;
  minute_reset: number;
  hour_count: number;
  hour_reset: number;
}

class RateLimiter {
  private buckets: Map<string, BucketState> = new Map();

  check(key: string, limit: RateLimit): { allowed: boolean; reason?: string; retry_after_ms?: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: limit.burst_size, last_refill: now, minute_count: 0, minute_reset: now + 60_000, hour_count: 0, hour_reset: now + 3_600_000 };
      this.buckets.set(key, bucket);
    }

    // Reset minute/hour counters
    if (now > bucket.minute_reset) { bucket.minute_count = 0; bucket.minute_reset = now + 60_000; }
    if (now > bucket.hour_reset) { bucket.hour_count = 0; bucket.hour_reset = now + 3_600_000; }

    // Check limits
    if (bucket.minute_count >= limit.requests_per_minute) {
      return { allowed: false, reason: 'Rate limit: per-minute exceeded', retry_after_ms: bucket.minute_reset - now };
    }
    if (bucket.hour_count >= limit.requests_per_hour) {
      return { allowed: false, reason: 'Rate limit: per-hour exceeded', retry_after_ms: bucket.hour_reset - now };
    }

    // Refill burst tokens
    const elapsed = (now - bucket.last_refill) / 1000;
    const refill = Math.floor(elapsed * (limit.requests_per_minute / 60));
    if (refill > 0) {
      bucket.tokens = Math.min(limit.burst_size, bucket.tokens + refill);
      bucket.last_refill = now;
    }

    if (bucket.tokens <= 0) {
      return { allowed: false, reason: 'Rate limit: burst exceeded', retry_after_ms: 1000 };
    }

    bucket.tokens--;
    bucket.minute_count++;
    bucket.hour_count++;
    return { allowed: true };
  }
}

// ============================================================================
// PROTOCOL BRIDGE ENGINE — SINGLETON
// ============================================================================

/** Handler function type for routing bridge requests to actual dispatchers */
export type DispatchHandler = (dispatcher: string, action: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>;

export class ProtocolBridgeEngine {
  private config: ProtocolBridgeConfig;
  private endpoints: Map<string, ProtocolEndpoint> = new Map();
  private apiKeys: Map<string, ApiKeyRecord> = new Map();
  private rateLimiter = new RateLimiter();
  private initialized: boolean = false;
  private dispatchHandler: DispatchHandler | null = null;

  private metrics = {
    requests_total: 0, requests_success: 0, requests_error: 0,
    requests_rate_limited: 0, requests_unauthorized: 0,
    endpoints_created: 0, endpoints_removed: 0,
    keys_created: 0, keys_revoked: 0,
    avg_latency_ms: 0,
  };

  constructor(configOverrides?: Partial<ProtocolBridgeConfig>) {
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...configOverrides };
  }

  /** Register a dispatch handler for routing bridge requests to actual PRISM dispatchers */
  setDispatchHandler(handler: DispatchHandler): void {
    this.dispatchHandler = handler;
    log.info('[BRIDGE] Dispatch handler registered — live routing enabled');
  }

  init(): void {
    if (this.initialized) return;
    ensureDirs();
    this.loadEndpoints();
    this.loadApiKeys();
    this.initialized = true;
    log.info(`[BRIDGE] Engine initialized (${this.endpoints.size} endpoints, ${this.apiKeys.size} API keys)`);
  }

  // ==========================================================================
  // ENDPOINT MANAGEMENT
  // ==========================================================================

  registerEndpoint(protocol: ProtocolType, pathStr: string,
    dispatcher: string, action: string, auth?: AuthMethod,
    rateLimit?: Partial<RateLimit>): { success: boolean; endpoint?: ProtocolEndpoint; reason?: string } {
    this.init();
    if (this.endpoints.size >= this.config.max_endpoints) {
      return { success: false, reason: `Maximum ${this.config.max_endpoints} endpoints reached` };
    }

    // Check for duplicate path+protocol
    const existing = [...this.endpoints.values()].find(e => e.path === pathStr && e.protocol === protocol);
    if (existing) {
      return { success: false, reason: `Endpoint already exists: ${protocol}:${pathStr}` };
    }

    const endpoint: ProtocolEndpoint = {
      id: randomUUID(), protocol, path: pathStr,
      dispatcher, action,
      auth: auth || this.config.default_auth,
      rate_limit: { ...DEFAULT_RATE_LIMIT, ...rateLimit },
      status: 'active', created_at: Date.now(),
      request_count: 0, error_count: 0, avg_latency_ms: 0,
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.saveEndpoints();
    this.metrics.endpoints_created++;
    return { success: true, endpoint };
  }

  removeEndpoint(endpointId: string): { success: boolean; reason?: string } {
    this.init();
    if (!this.endpoints.has(endpointId)) {
      return { success: false, reason: 'Endpoint not found' };
    }
    this.endpoints.delete(endpointId);
    this.saveEndpoints();
    this.metrics.endpoints_removed++;
    return { success: true };
  }

  setEndpointStatus(endpointId: string, status: EndpointStatus): { success: boolean; reason?: string } {
    this.init();
    const ep = this.endpoints.get(endpointId);
    if (!ep) return { success: false, reason: 'Endpoint not found' };
    const updated: ProtocolEndpoint = { ...ep, status };
    this.endpoints.set(endpointId, updated);
    this.saveEndpoints();
    return { success: true };
  }

  // ==========================================================================
  // API KEY MANAGEMENT
  // ==========================================================================

  createApiKey(name: string, scopes: string[], expiresInDays?: number,
    rateLimit?: Partial<RateLimit>): { success: boolean; key?: string; key_id?: string; reason?: string } {
    this.init();
    if (this.apiKeys.size >= this.config.max_api_keys) {
      return { success: false, reason: `Maximum ${this.config.max_api_keys} API keys reached` };
    }

    // Generate secure key
    const rawKey = `prism_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyId = `key_${crypto.randomBytes(8).toString('hex')}`;

    const record: ApiKeyRecord = {
      key_id: keyId, key_hash: keyHash, name,
      created_at: Date.now(),
      expires_at: expiresInDays ? Date.now() + expiresInDays * 86_400_000 : undefined,
      scopes, rate_limit: { ...DEFAULT_RATE_LIMIT, ...rateLimit },
      status: 'active', last_used: 0, request_count: 0,
    };

    this.apiKeys.set(keyId, record);
    this.saveApiKeys();
    this.metrics.keys_created++;

    // Return raw key only at creation (never stored or returned again)
    return { success: true, key: rawKey, key_id: keyId };
  }

  revokeApiKey(keyId: string): { success: boolean; reason?: string } {
    this.init();
    const record = this.apiKeys.get(keyId);
    if (!record) return { success: false, reason: 'API key not found' };
    const updated: ApiKeyRecord = { ...record, status: 'revoked' };
    this.apiKeys.set(keyId, updated);
    this.saveApiKeys();
    this.metrics.keys_revoked++;
    return { success: true };
  }

  validateApiKey(rawKey: string): { valid: boolean; key_id?: string; scopes?: string[]; reason?: string } {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    for (const [, record] of this.apiKeys) {
      // Timing-safe comparison to prevent side-channel attacks
      const hashBuf = Buffer.from(keyHash, 'hex');
      const recordBuf = Buffer.from(record.key_hash, 'hex');
      if (hashBuf.length === recordBuf.length && crypto.timingSafeEqual(hashBuf, recordBuf)) {
        if (record.status !== 'active') return { valid: false, reason: `Key is ${record.status}` };
        if (record.expires_at && Date.now() > record.expires_at) return { valid: false, reason: 'Key expired' };
        // Update last_used
        const updated: ApiKeyRecord = { ...record, last_used: Date.now(), request_count: record.request_count + 1 };
        this.apiKeys.set(record.key_id, updated);
        return { valid: true, key_id: record.key_id, scopes: record.scopes };
      }
    }
    return { valid: false, reason: 'Invalid API key' };
  }

  // ==========================================================================
  // REQUEST ROUTING — Process incoming bridge requests
  // ==========================================================================

  async routeRequest(request: BridgeRequest): Promise<BridgeResponse> {
    this.init();
    const start = Date.now();
    this.metrics.requests_total++;

    // INPUT VALIDATION — Sanitize external requests before routing
    if (!request.dispatcher || typeof request.dispatcher !== 'string' || request.dispatcher.length > 100) {
      this.metrics.requests_error++;
      return this.errorResponse(request.request_id, 'Invalid dispatcher name', start);
    }
    if (!request.action || typeof request.action !== 'string' || request.action.length > 100) {
      this.metrics.requests_error++;
      return this.errorResponse(request.request_id, 'Invalid action name', start);
    }
    // Reject path traversal and injection patterns
    const DANGEROUS = /[;|&`$\\<>{}]|\.\.|\x00/;
    if (DANGEROUS.test(request.dispatcher) || DANGEROUS.test(request.action)) {
      this.metrics.requests_error++;
      return this.errorResponse(request.request_id, 'Invalid characters in request', start);
    }
    // Validate params is plain object (no prototype pollution)
    if (request.params && (typeof request.params !== 'object' || Array.isArray(request.params))) {
      this.metrics.requests_error++;
      return this.errorResponse(request.request_id, 'Invalid params format', start);
    }

    try {
      // Find endpoint
      const endpoint = this.endpoints.get(request.endpoint_id) ||
        [...this.endpoints.values()].find(e =>
          e.dispatcher === request.dispatcher && e.action === request.action && e.protocol === request.protocol);

      if (!endpoint || endpoint.status !== 'active') {
        this.metrics.requests_error++;
        return this.errorResponse(request.request_id, 'Endpoint not found or disabled', start);
      }

      // Auth check
      if (endpoint.auth !== 'none') {
        if (!request.auth.key_id) {
          this.metrics.requests_unauthorized++;
          return { request_id: request.request_id, status: 'unauthorized', error: 'Authentication required', latency_ms: Date.now() - start, timestamp: Date.now() };
        }
        const keyRecord = this.apiKeys.get(request.auth.key_id);
        if (!keyRecord || keyRecord.status !== 'active') {
          this.metrics.requests_unauthorized++;
          return { request_id: request.request_id, status: 'unauthorized', error: 'Invalid or revoked API key', latency_ms: Date.now() - start, timestamp: Date.now() };
        }
        // Scope check
        const requiredScope = `${endpoint.dispatcher}:${endpoint.action}`;
        if (!keyRecord.scopes.includes('*') && !keyRecord.scopes.includes(requiredScope)) {
          this.metrics.requests_unauthorized++;
          return { request_id: request.request_id, status: 'unauthorized', error: `Key lacks scope: ${requiredScope}`, latency_ms: Date.now() - start, timestamp: Date.now() };
        }
      }

      // Rate limit check
      const limitKey = request.auth.key_id || request.client_ip || 'anonymous';
      const rateCheck = this.rateLimiter.check(limitKey, endpoint.rate_limit);
      if (!rateCheck.allowed) {
        this.metrics.requests_rate_limited++;
        return { request_id: request.request_id, status: 'rate_limited', error: rateCheck.reason, latency_ms: Date.now() - start, timestamp: Date.now() };
      }

      // Route to dispatcher — live routing via dispatchHandler, or simulated passthrough
      let responseData: Record<string, unknown>;
      if (this.dispatchHandler) {
        try {
          responseData = await this.dispatchHandler(endpoint.dispatcher, endpoint.action, request.params || {});
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.metrics.requests_error++;
          endpoint.error_count = (endpoint.error_count || 0) + 1;
          return this.errorResponse(request.request_id, `Dispatch failed: ${errMsg}`, start);
        }
      } else {
        // Simulated passthrough (no handler registered)
        responseData = { routed_to: `${endpoint.dispatcher}:${endpoint.action}`, params: request.params, protocol: endpoint.protocol, _simulated: true };
      }

      const response: BridgeResponse = {
        request_id: request.request_id, status: 'success',
        data: responseData,
        latency_ms: Date.now() - start, timestamp: Date.now(),
      };

      // Update endpoint stats
      const reqCount = endpoint.request_count + 1;
      const updated: ProtocolEndpoint = {
        ...endpoint,
        request_count: reqCount,
        avg_latency_ms: endpoint.avg_latency_ms * 0.9 + response.latency_ms * 0.1,
      };
      this.endpoints.set(endpoint.id, updated);

      this.metrics.requests_success++;
      this.updateAvgLatency(response.latency_ms);

      // Log if enabled
      if (this.config.log_requests) {
        this.logRequest(request, response);
      }

      return response;
    } catch (e) {
      this.metrics.requests_error++;
      return this.errorResponse(request.request_id, (e as Error).message, start);
    }
  }

  private errorResponse(requestId: string, error: string, startMs: number): BridgeResponse {
    return { request_id: requestId, status: 'error', error, latency_ms: Date.now() - startMs, timestamp: Date.now() };
  }

  private updateAvgLatency(latencyMs: number): void {
    this.metrics.avg_latency_ms = this.metrics.requests_total === 1
      ? latencyMs : this.metrics.avg_latency_ms * 0.95 + latencyMs * 0.05;
  }

  private logRequest(request: BridgeRequest, response: BridgeResponse): void {
    try {
      const entry = { request_id: request.request_id, protocol: request.protocol, dispatcher: request.dispatcher, action: request.action, auth_method: request.auth.method, status: response.status, latency_ms: response.latency_ms, timestamp: Date.now() };
      fs.appendFileSync(REQUEST_LOG, JSON.stringify(entry) + '\n');
    } catch { /* non-fatal */ }
  }

  // ==========================================================================
  // ROUTE MAP — Auto-generate from registered endpoints
  // ==========================================================================

  generateRouteMap(): RouteMap {
    this.init();
    const routes: RouteEntry[] = [...this.endpoints.values()]
      .filter(e => e.status === 'active')
      .map(e => ({
        path: e.path, methods: e.protocol === 'rest' ? ['GET', 'POST'] : [e.protocol.toUpperCase()],
        dispatcher: e.dispatcher, action: e.action,
        auth_required: e.auth !== 'none', rate_limited: true,
      }));

    return { generated_at: Date.now(), total_routes: routes.length, routes };
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getEndpoint(endpointId: string): ProtocolEndpoint | null {
    this.init();
    return this.endpoints.get(endpointId) || null;
  }

  listEndpoints(protocol?: ProtocolType, status?: EndpointStatus): ProtocolEndpoint[] {
    this.init();
    let eps = [...this.endpoints.values()];
    if (protocol) eps = eps.filter(e => e.protocol === protocol);
    if (status) eps = eps.filter(e => e.status === status);
    return eps;
  }

  listApiKeys(): Omit<ApiKeyRecord, 'key_hash'>[] {
    this.init();
    return [...this.apiKeys.values()].map(({ key_hash, ...rest }) => rest);
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private saveEndpoints(): void {
    try {
      ensureDirs();
      const data = JSON.stringify({ endpoints: Object.fromEntries(this.endpoints), saved_at: Date.now() });
      const tmp = ENDPOINTS_PATH + '.tmp';
      fs.writeFileSync(tmp, data);
      fs.renameSync(tmp, ENDPOINTS_PATH);
    } catch (e) { log.warn(`[BRIDGE] Endpoints save failed: ${(e as Error).message}`); }
  }

  private loadEndpoints(): void {
    try {
      if (fs.existsSync(ENDPOINTS_PATH)) {
        const raw = JSON.parse(fs.readFileSync(ENDPOINTS_PATH, 'utf-8'));
        if (raw.endpoints) {
          for (const [k, v] of Object.entries(raw.endpoints)) this.endpoints.set(k, v as ProtocolEndpoint);
        }
      }
    } catch (e) { log.warn(`[BRIDGE] Endpoints load failed: ${(e as Error).message}`); }
  }

  private saveApiKeys(): void {
    try {
      ensureDirs();
      const data = JSON.stringify({ keys: Object.fromEntries(this.apiKeys), saved_at: Date.now() });
      const tmp = KEYS_PATH + '.tmp';
      fs.writeFileSync(tmp, data);
      fs.renameSync(tmp, KEYS_PATH);
    } catch (e) { log.warn(`[BRIDGE] API keys save failed: ${(e as Error).message}`); }
  }

  private loadApiKeys(): void {
    try {
      if (fs.existsSync(KEYS_PATH)) {
        const raw = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf-8'));
        if (raw.keys) {
          for (const [k, v] of Object.entries(raw.keys)) this.apiKeys.set(k, v as ApiKeyRecord);
        }
      }
    } catch (e) { log.warn(`[BRIDGE] API keys load failed: ${(e as Error).message}`); }
  }

  // ==========================================================================
  // METRICS & CONFIG
  // ==========================================================================

  getStats(): {
    endpoints: number; active_endpoints: number; api_keys: number; active_keys: number;
    metrics: typeof this.metrics;
    by_protocol: Record<string, number>;
  } {
    this.init();
    const eps = [...this.endpoints.values()];
    const keys = [...this.apiKeys.values()];
    const byProtocol: Record<string, number> = {};
    for (const ep of eps.filter(e => e.status === 'active')) {
      byProtocol[ep.protocol] = (byProtocol[ep.protocol] || 0) + 1;
    }
    return {
      endpoints: eps.length,
      active_endpoints: eps.filter(e => e.status === 'active').length,
      api_keys: keys.length,
      active_keys: keys.filter(k => k.status === 'active').length,
      metrics: { ...this.metrics },
      by_protocol: byProtocol,
    };
  }

  getConfig(): ProtocolBridgeConfig { return { ...this.config }; }

  updateConfig(updates: Partial<ProtocolBridgeConfig>): ProtocolBridgeConfig {
    this.config = { ...this.config, ...updates };
    return { ...this.config };
  }

  shutdown(): void {
    this.saveEndpoints();
    this.saveApiKeys();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const protocolBridgeEngine = new ProtocolBridgeEngine();

// ============================================================================
// SOURCE FILE CATALOG — LOW-priority extracted JS modules targeting ProtocolBridgeEngine
// ============================================================================

export const PROTOCOL_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
}> = {
  // ── extracted/systems/ (7 files) ────────────────────────────────────────────

  PRISM_ERROR_BOUNDARY: {
    filename: "PRISM_ERROR_BOUNDARY.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 154,
    safety_class: "LOW",
    description: "Error boundary wrapper isolating subsystem failures from propagating upstream",
  },
  PRISM_ERROR_HANDLER: {
    filename: "PRISM_ERROR_HANDLER.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 63,
    safety_class: "LOW",
    description: "Centralized error handler with severity classification and notification routing",
  },
  PRISM_ERROR_LOOKUP: {
    filename: "PRISM_ERROR_LOOKUP.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 89,
    safety_class: "LOW",
    description: "Error code lookup table mapping numeric codes to human-readable messages and remedies",
  },
  PRISM_UI_ADAPTER: {
    filename: "PRISM_UI_ADAPTER.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 262,
    safety_class: "LOW",
    description: "UI adapter layer translating internal data models to front-end display formats",
  },
  PRISM_UI_BACKEND_INTEGRATOR: {
    filename: "PRISM_UI_BACKEND_INTEGRATOR.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 293,
    safety_class: "LOW",
    description: "Backend integration bridge connecting UI state management to server-side APIs",
  },
  PRISM_UI_INTEGRATION_ENGINE: {
    filename: "PRISM_UI_INTEGRATION_ENGINE.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 208,
    safety_class: "LOW",
    description: "UI integration engine coordinating widget lifecycle, data binding, and event forwarding",
  },
  PRISM_UI_SYSTEM: {
    filename: "PRISM_UI_SYSTEM.js",
    source_dir: "extracted/systems",
    category: "systems",
    lines: 347,
    safety_class: "LOW",
    description: "Top-level UI system managing layout, theming, and component registration",
  },
};

/**
 * Return the ProtocolBridgeEngine source-file catalog for audit and traceability.
 */
export function getProtocolSourceFileCatalog(): typeof PROTOCOL_SOURCE_FILE_CATALOG {
  return PROTOCOL_SOURCE_FILE_CATALOG;
}
