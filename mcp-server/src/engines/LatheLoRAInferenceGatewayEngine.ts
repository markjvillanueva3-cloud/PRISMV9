/**
 * LatheLoRAInferenceGatewayEngine — LATHE-LORA-MS0 U-LLR22
 * ========================================================
 *
 * Routes inference requests to appropriate LatheLoRA models
 * with load balancing, fallback handling, and request validation.
 *
 * Features:
 *   - Multi-model routing
 *   - Load balancing (round-robin, least-connections)
 *   - Request validation and sanitization
 *   - Response caching
 *   - Fallback chains
 *   - Rate limiting
 *
 * @module engines/LatheLoRAInferenceGatewayEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Load balancing strategy */
export type LoadBalanceStrategy = "round_robin" | "least_connections" | "random" | "weighted";

/** Model endpoint */
export interface ModelEndpoint {
  id: string;
  name: string;
  url: string;
  weight: number;
  active: boolean;
  max_connections: number;
  current_connections: number;
  capabilities: string[];
  avg_latency_ms: number;
  error_rate: number;
}

/** Inference request */
export interface InferenceRequest {
  id: string;
  prompt: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  stop_sequences?: string[];
  require_physics?: boolean;
  require_safety?: boolean;
  timeout_ms?: number;
  priority?: "low" | "normal" | "high";
}

/** Inference response */
export interface InferenceResponse {
  id: string;
  request_id: string;
  model_id: string;
  content: string;
  tokens_used: number;
  latency_ms: number;
  cached: boolean;
  metadata: {
    finish_reason: "stop" | "length" | "error";
    model_version?: string;
    physics_validated?: boolean;
    safety_checked?: boolean;
  };
}

/** Gateway configuration */
export interface GatewayConfig {
  strategy: LoadBalanceStrategy;
  cache_enabled: boolean;
  cache_ttl_seconds: number;
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
  rate_limit_rpm: number;
}

/** Route result */
export interface RouteResult {
  endpoint: ModelEndpoint;
  fallbacks: ModelEndpoint[];
  estimated_wait_ms: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: GatewayConfig = {
  strategy: "least_connections",
  cache_enabled: true,
  cache_ttl_seconds: 300,
  max_retries: 2,
  retry_delay_ms: 500,
  timeout_ms: 30000,
  rate_limit_rpm: 60,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAInferenceGatewayEngine {
  private config: GatewayConfig = DEFAULT_CONFIG;
  private endpoints: Map<string, ModelEndpoint> = new Map();
  private cache: Map<string, { response: InferenceResponse; expires: number }> = new Map();
  private roundRobinIndex: number = 0;
  private requestCounts: Map<string, number[]> = new Map(); // endpoint -> timestamps

  /**
   * Set gateway configuration
   */
  setConfig(config: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  /**
   * Register model endpoint
   */
  registerEndpoint(endpoint: Omit<ModelEndpoint, "current_connections" | "avg_latency_ms" | "error_rate">): void {
    const full: ModelEndpoint = {
      ...endpoint,
      current_connections: 0,
      avg_latency_ms: 0,
      error_rate: 0,
    };
    this.endpoints.set(endpoint.id, full);
    log.info(`Registered endpoint: ${endpoint.id} at ${endpoint.url}`);
  }

  /**
   * Remove endpoint
   */
  removeEndpoint(id: string): boolean {
    return this.endpoints.delete(id);
  }

  /**
   * Get endpoint
   */
  getEndpoint(id: string): ModelEndpoint | undefined {
    return this.endpoints.get(id);
  }

  /**
   * List active endpoints
   */
  listEndpoints(): ModelEndpoint[] {
    return Array.from(this.endpoints.values()).filter(e => e.active);
  }

  /**
   * Set endpoint active state
   */
  setEndpointActive(id: string, active: boolean): boolean {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return false;
    endpoint.active = active;
    return true;
  }

  /**
   * Route request to best endpoint
   */
  route(request: InferenceRequest): RouteResult | null {
    const activeEndpoints = this.listEndpoints();

    if (activeEndpoints.length === 0) {
      log.warn("No active endpoints available");
      return null;
    }

    // Filter by capabilities if needed
    let candidates = activeEndpoints;
    if (request.require_physics) {
      candidates = candidates.filter(e => e.capabilities.includes("physics"));
    }
    if (request.require_safety) {
      candidates = candidates.filter(e => e.capabilities.includes("safety"));
    }

    if (candidates.length === 0) {
      log.warn("No endpoints match required capabilities");
      candidates = activeEndpoints; // Fallback to all active
    }

    // Select based on strategy
    let selected: ModelEndpoint;
    switch (this.config.strategy) {
      case "round_robin":
        selected = this.selectRoundRobin(candidates);
        break;
      case "least_connections":
        selected = this.selectLeastConnections(candidates);
        break;
      case "weighted":
        selected = this.selectWeighted(candidates);
        break;
      case "random":
      default:
        selected = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Build fallback chain
    const fallbacks = candidates
      .filter(e => e.id !== selected.id)
      .sort((a, b) => a.current_connections - b.current_connections)
      .slice(0, 2);

    // Estimate wait time based on connections
    const estimatedWait = selected.current_connections * selected.avg_latency_ms;

    return {
      endpoint: selected,
      fallbacks,
      estimated_wait_ms: estimatedWait,
    };
  }

  /**
   * Select using round-robin
   */
  private selectRoundRobin(endpoints: ModelEndpoint[]): ModelEndpoint {
    const selected = endpoints[this.roundRobinIndex % endpoints.length];
    this.roundRobinIndex++;
    return selected;
  }

  /**
   * Select endpoint with least connections
   */
  private selectLeastConnections(endpoints: ModelEndpoint[]): ModelEndpoint {
    return endpoints.reduce((min, e) =>
      e.current_connections < min.current_connections ? e : min
    );
  }

  /**
   * Select using weighted random
   */
  private selectWeighted(endpoints: ModelEndpoint[]): ModelEndpoint {
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) return endpoint;
    }

    return endpoints[0];
  }

  /**
   * Check cache for response
   */
  checkCache(request: InferenceRequest): InferenceResponse | null {
    if (!this.config.cache_enabled) return null;

    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return { ...cached.response, cached: true };
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Store response in cache
   */
  cacheResponse(request: InferenceRequest, response: InferenceResponse): void {
    if (!this.config.cache_enabled) return;

    const cacheKey = this.getCacheKey(request);
    this.cache.set(cacheKey, {
      response,
      expires: Date.now() + this.config.cache_ttl_seconds * 1000,
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(request: InferenceRequest): string {
    // Simple hash based on prompt and key parameters
    const key = `${request.prompt}|${request.temperature || 0.7}|${request.max_tokens || 2048}`;
    return Buffer.from(key).toString("base64").substring(0, 64);
  }

  /**
   * Validate inference request
   */
  validateRequest(request: Partial<InferenceRequest>): {
    valid: boolean;
    errors: string[];
    sanitized?: InferenceRequest;
  } {
    const errors: string[] = [];

    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.push("Prompt is required");
    }

    if (request.prompt && request.prompt.length > 32000) {
      errors.push("Prompt exceeds maximum length (32000 characters)");
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      errors.push("Temperature must be between 0 and 2");
    }

    if (request.max_tokens !== undefined && (request.max_tokens < 1 || request.max_tokens > 8192)) {
      errors.push("max_tokens must be between 1 and 8192");
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const sanitized: InferenceRequest = {
      id: request.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: request.prompt!.trim(),
      system_prompt: request.system_prompt?.trim(),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048,
      stop_sequences: request.stop_sequences ?? [],
      require_physics: request.require_physics ?? false,
      require_safety: request.require_safety ?? false,
      timeout_ms: request.timeout_ms ?? this.config.timeout_ms,
      priority: request.priority ?? "normal",
    };

    return { valid: true, errors: [], sanitized };
  }

  /**
   * Check rate limit
   */
  checkRateLimit(endpointId: string): { allowed: boolean; wait_ms: number } {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = this.config.rate_limit_rpm;

    let timestamps = this.requestCounts.get(endpointId) || [];

    // Remove old timestamps
    timestamps = timestamps.filter(t => t > now - windowMs);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = Math.min(...timestamps);
      const waitMs = oldestInWindow + windowMs - now;
      return { allowed: false, wait_ms: waitMs };
    }

    // Record this request
    timestamps.push(now);
    this.requestCounts.set(endpointId, timestamps);

    return { allowed: true, wait_ms: 0 };
  }

  /**
   * Record request completion
   */
  recordCompletion(
    endpointId: string,
    latencyMs: number,
    success: boolean
  ): void {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return;

    // Update average latency (exponential moving average)
    const alpha = 0.2;
    endpoint.avg_latency_ms = alpha * latencyMs + (1 - alpha) * endpoint.avg_latency_ms;

    // Update error rate
    const errorAlpha = 0.1;
    endpoint.error_rate = errorAlpha * (success ? 0 : 1) + (1 - errorAlpha) * endpoint.error_rate;

    // Release connection
    if (endpoint.current_connections > 0) {
      endpoint.current_connections--;
    }
  }

  /**
   * Acquire connection (for tracking)
   */
  acquireConnection(endpointId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    if (endpoint.current_connections >= endpoint.max_connections) {
      return false;
    }

    endpoint.current_connections++;
    return true;
  }

  /**
   * Generate API client code
   */
  generateClientCode(language: "python" | "typescript" | "curl"): string {
    const endpoints = this.listEndpoints();
    const primaryEndpoint = endpoints[0];

    if (!primaryEndpoint) {
      return "// No endpoints configured";
    }

    if (language === "python") {
      return `import requests

def lathe_lora_inference(prompt: str, temperature: float = 0.7) -> str:
    response = requests.post(
        "${primaryEndpoint.url}/api/generate",
        json={
            "model": "${primaryEndpoint.name}",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature}
        }
    )
    return response.json()["response"]

# Example
result = lathe_lora_inference("Calculate speed and feed for 4140 steel")
print(result)`;
    }

    if (language === "typescript") {
      return `async function latheLoRAInference(
  prompt: string,
  temperature = 0.7
): Promise<string> {
  const response = await fetch("${primaryEndpoint.url}/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "${primaryEndpoint.name}",
      prompt,
      stream: false,
      options: { temperature }
    })
  });
  const data = await response.json();
  return data.response;
}

// Example
const result = await latheLoRAInference("Calculate speed and feed for 4140 steel");
console.log(result);`;
    }

    // curl
    return `curl -X POST ${primaryEndpoint.url}/api/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${primaryEndpoint.name}",
    "prompt": "Calculate speed and feed for 4140 steel",
    "stream": false,
    "options": {"temperature": 0.7}
  }'`;
  }

  /**
   * Get gateway statistics
   */
  getStats(): {
    total_endpoints: number;
    active_endpoints: number;
    total_connections: number;
    cache_size: number;
    avg_latency_ms: number;
    avg_error_rate: number;
  } {
    const endpoints = Array.from(this.endpoints.values());
    const active = endpoints.filter(e => e.active);

    return {
      total_endpoints: endpoints.length,
      active_endpoints: active.length,
      total_connections: active.reduce((sum, e) => sum + e.current_connections, 0),
      cache_size: this.cache.size,
      avg_latency_ms: active.length > 0
        ? active.reduce((sum, e) => sum + e.avg_latency_ms, 0) / active.length
        : 0,
      avg_error_rate: active.length > 0
        ? active.reduce((sum, e) => sum + e.error_rate, 0) / active.length
        : 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): number {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.endpoints.clear();
    this.cache.clear();
    this.requestCounts.clear();
    this.roundRobinIndex = 0;
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAInferenceGatewayEngine = new LatheLoRAInferenceGatewayEngine();
