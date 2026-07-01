/**
 * PRISM F7: Protocol Bridge Types
 * =================================
 * 
 * Multi-protocol gateway for external system integration.
 * Supports REST, gRPC, GraphQL, and WebSocket protocols.
 * 
 * SAFETY: Protocol bridge failure = external integrations unavailable.
 * All internal PRISM operations, S(x)≥0.70, hooks, and Ω gates
 * continue independently. Bridge is OUTWARD-FACING ONLY.
 * 
 * @version 1.0.0
 * @feature F7
 */

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

export type ProtocolType = 'rest' | 'grpc' | 'graphql' | 'websocket';
export type AuthMethod = 'api_key' | 'bearer_token' | 'mtls' | 'none';
export type EndpointStatus = 'active' | 'disabled' | 'rate_limited' | 'error';

// ============================================================================
// ENDPOINT DEFINITION
// ============================================================================

export interface ProtocolEndpoint {
  readonly id: string;
  readonly protocol: ProtocolType;
  readonly path: string;               // e.g. '/api/v1/calc/speed_feed'
  readonly dispatcher: string;          // Target PRISM dispatcher
  readonly action: string;              // Target action
  readonly auth: AuthMethod;
  readonly rate_limit: RateLimit;
  readonly status: EndpointStatus;
  readonly created_at: number;
  readonly request_count: number;
  readonly error_count: number;
  readonly avg_latency_ms: number;
}

export interface RateLimit {
  requests_per_minute: number;         // Default 60
  requests_per_hour: number;           // Default 1000
  burst_size: number;                  // Default 10
}

export const DEFAULT_RATE_LIMIT: RateLimit = {
  requests_per_minute: 60,
  requests_per_hour: 1000,
  burst_size: 10,
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export interface ApiKeyRecord {
  readonly key_id: string;             // Public identifier
  readonly key_hash: string;           // SHA-256 of actual key
  readonly name: string;
  readonly created_at: number;
  readonly expires_at?: number;
  readonly scopes: string[];           // Allowed dispatcher:action pairs
  readonly rate_limit: RateLimit;
  readonly status: 'active' | 'revoked' | 'expired';
  readonly last_used: number;
  readonly request_count: number;
}

// ============================================================================
// REQUEST/RESPONSE ENVELOPE
// ============================================================================

export interface BridgeRequest {
  readonly request_id: string;
  readonly protocol: ProtocolType;
  readonly endpoint_id: string;
  readonly dispatcher: string;
  readonly action: string;
  readonly params: Record<string, unknown>;
  readonly auth: { method: AuthMethod; key_id?: string };
  readonly timestamp: number;
  readonly client_ip?: string;
}

export interface BridgeResponse {
  readonly request_id: string;
  readonly status: 'success' | 'error' | 'rate_limited' | 'unauthorized';
  readonly data?: unknown;
  readonly error?: string;
  readonly latency_ms: number;
  readonly timestamp: number;
}

// ============================================================================
// PROTOCOL BRIDGE CONFIG
// ============================================================================

export interface ProtocolBridgeConfig {
  enabled: boolean;
  default_auth: AuthMethod;
  default_rate_limit: RateLimit;
  max_endpoints: number;               // Default 200
  max_api_keys: number;                // Default 100
  request_timeout_ms: number;          // Default 30000
  log_requests: boolean;               // Default true
  cors_origins: string[];              // Default ['*']
  require_tls: boolean;                // Reject non-TLS connections (default true)
}

export const DEFAULT_BRIDGE_CONFIG: ProtocolBridgeConfig = {
  enabled: true,
  default_auth: 'api_key',
  default_rate_limit: DEFAULT_RATE_LIMIT,
  max_endpoints: 200,
  max_api_keys: 100,
  request_timeout_ms: 30_000,
  log_requests: true,
  cors_origins: ['*'],
  require_tls: true,
};

// ============================================================================
// ROUTE MAP — Auto-generated from dispatchers
// ============================================================================

export interface RouteMap {
  readonly generated_at: number;
  readonly total_routes: number;
  readonly routes: RouteEntry[];
}

export interface RouteEntry {
  readonly path: string;
  readonly methods: string[];           // ['GET', 'POST']
  readonly dispatcher: string;
  readonly action: string;
  readonly auth_required: boolean;
  readonly rate_limited: boolean;
}
