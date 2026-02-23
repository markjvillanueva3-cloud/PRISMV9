/**
 * IntegrationGatewayEngine — R20-MS4
 *
 * Structured API for external system integration. Allows registering
 * external endpoints (ERP, CAM, MES, PLM, IoT), invoking them through
 * a unified interface, inspecting their schemas, and monitoring health.
 *
 * Actions:
 *   ig_register — register an external integration endpoint
 *   ig_invoke   — invoke a registered endpoint with parameters
 *   ig_schema   — inspect the schema/capabilities of an endpoint
 *   ig_health   — check health status of registered integrations
 */

// ── Types ──────────────────────────────────────────────────────────────────

type IntegrationType = "erp" | "cam" | "mes" | "plm" | "iot" | "custom";
type EndpointStatus = "active" | "degraded" | "offline" | "unknown";

interface EndpointParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  default_value?: unknown;
}

interface IntegrationEndpoint {
  id: string;
  name: string;
  type: IntegrationType;
  version: string;
  base_url: string;
  auth_method: "api_key" | "oauth2" | "basic" | "none";
  parameters: EndpointParameter[];
  capabilities: string[];
  rate_limit_rpm: number;
  timeout_ms: number;
  registered_at: string;
  last_invoked_at: string | null;
  invocation_count: number;
  success_count: number;
  failure_count: number;
  avg_latency_ms: number;
  status: EndpointStatus;
  metadata: Record<string, unknown>;
}

interface InvocationRecord {
  id: string;
  endpoint_id: string;
  timestamp: string;
  parameters: Record<string, unknown>;
  status: "success" | "failure" | "timeout";
  latency_ms: number;
  response_summary: string;
}

// ── In-Memory Store ────────────────────────────────────────────────────────

const endpoints: Map<string, IntegrationEndpoint> = new Map();
const invocationLog: InvocationRecord[] = [];
let endpointCounter = 1;
let invocationCounter = 1;

// ── Seed Default Integrations ──────────────────────────────────────────────

function seedDefaults(): void {
  if (endpoints.size > 0) return;

  const defaults: Omit<IntegrationEndpoint, "id" | "registered_at" | "last_invoked_at" | "invocation_count" | "success_count" | "failure_count" | "avg_latency_ms" | "status">[] = [
    {
      name: "ERP_OrderManagement",
      type: "erp",
      version: "2.1",
      base_url: "https://erp.example.com/api/v2",
      auth_method: "oauth2",
      parameters: [
        { name: "order_id", type: "string", required: false, description: "Filter by order ID" },
        { name: "material", type: "string", required: false, description: "Filter by material code" },
        { name: "status", type: "string", required: false, description: "Filter by order status" },
      ],
      capabilities: ["query_orders", "update_status", "get_inventory", "create_work_order"],
      rate_limit_rpm: 60,
      timeout_ms: 5000,
      metadata: { department: "production_planning" },
    },
    {
      name: "CAM_ToolpathGenerator",
      type: "cam",
      version: "5.0",
      base_url: "https://cam.example.com/api/v5",
      auth_method: "api_key",
      parameters: [
        { name: "geometry_id", type: "string", required: true, description: "CAD geometry reference" },
        { name: "operation", type: "string", required: true, description: "Machining operation type" },
        { name: "tool_id", type: "string", required: false, description: "Preferred tool ID" },
        { name: "parameters", type: "object", required: false, description: "Cutting parameters override" },
      ],
      capabilities: ["generate_toolpath", "simulate_nc", "optimize_feeds", "export_gcode"],
      rate_limit_rpm: 30,
      timeout_ms: 30000,
      metadata: { supported_formats: ["step", "iges", "stl"] },
    },
    {
      name: "MES_ShopFloor",
      type: "mes",
      version: "3.2",
      base_url: "https://mes.example.com/api/v3",
      auth_method: "basic",
      parameters: [
        { name: "machine_id", type: "string", required: false, description: "Filter by machine" },
        { name: "job_id", type: "string", required: false, description: "Filter by job" },
        { name: "time_range", type: "string", required: false, description: "Time range (ISO 8601 interval)" },
      ],
      capabilities: ["get_machine_status", "get_job_progress", "submit_quality_data", "get_oee"],
      rate_limit_rpm: 120,
      timeout_ms: 3000,
      metadata: { machines_monitored: 24 },
    },
    {
      name: "PLM_DocumentVault",
      type: "plm",
      version: "4.0",
      base_url: "https://plm.example.com/api/v4",
      auth_method: "oauth2",
      parameters: [
        { name: "part_number", type: "string", required: false, description: "Part number to look up" },
        { name: "revision", type: "string", required: false, description: "Document revision" },
        { name: "doc_type", type: "string", required: false, description: "Document type filter" },
      ],
      capabilities: ["get_drawing", "get_bom", "get_process_plan", "check_revision"],
      rate_limit_rpm: 60,
      timeout_ms: 5000,
      metadata: { total_documents: 45000 },
    },
    {
      name: "IoT_MachineSensors",
      type: "iot",
      version: "1.5",
      base_url: "wss://iot.example.com/stream",
      auth_method: "api_key",
      parameters: [
        { name: "sensor_ids", type: "array", required: true, description: "List of sensor IDs to query" },
        { name: "metric", type: "string", required: false, description: "Specific metric (vibration, temperature, power)" },
        { name: "interval_s", type: "number", required: false, description: "Sampling interval in seconds", default_value: 1 },
      ],
      capabilities: ["stream_realtime", "get_historical", "set_alert_threshold", "get_anomalies"],
      rate_limit_rpm: 300,
      timeout_ms: 2000,
      metadata: { total_sensors: 156, protocols: ["mqtt", "opcua"] },
    },
  ];

  for (const d of defaults) {
    const id = `IG${String(endpointCounter++).padStart(4, "0")}`;
    endpoints.set(id, {
      ...d,
      id,
      registered_at: new Date().toISOString(),
      last_invoked_at: null,
      invocation_count: 0,
      success_count: 0,
      failure_count: 0,
      avg_latency_ms: 0,
      status: "active",
    });
  }
}

// ── Helper Functions ───────────────────────────────────────────────────────

function round2(v: number): number { return Math.round(v * 100) / 100; }

function simulateInvocation(endpoint: IntegrationEndpoint, params: Record<string, unknown>): {
  success: boolean;
  latency_ms: number;
  response: Record<string, unknown>;
} {
  // Simulate latency based on endpoint type
  const baseLatency: Record<IntegrationType, number> = {
    erp: 120, cam: 800, mes: 80, plm: 150, iot: 30, custom: 200,
  };
  const jitter = Math.random() * 100 - 50;
  const latency = Math.max(10, baseLatency[endpoint.type] + jitter);

  // Simulate success rate (95% for active, 70% for degraded, 0% for offline)
  const successRate = endpoint.status === "active" ? 0.95
    : endpoint.status === "degraded" ? 0.70 : 0;
  const success = Math.random() < successRate;

  // Generate simulated response based on endpoint type
  const response: Record<string, unknown> = {
    endpoint: endpoint.name,
    type: endpoint.type,
    simulated: true,
  };

  if (success) {
    switch (endpoint.type) {
      case "erp":
        response.orders = [{ id: "WO-2024-001", material: params.material ?? "steel_1045", status: "in_progress" }];
        response.inventory_available = true;
        break;
      case "cam":
        response.toolpath_id = `TP-${Date.now()}`;
        response.estimated_cycle_time_min = round2(15 + Math.random() * 30);
        response.operations_count = Math.floor(3 + Math.random() * 8);
        break;
      case "mes":
        response.machine_status = "running";
        response.oee = round2(0.65 + Math.random() * 0.25);
        response.current_job = params.job_id ?? "JOB-AUTO";
        break;
      case "plm":
        response.document_found = true;
        response.revision = params.revision ?? "C";
        response.part_number = params.part_number ?? "P-10045";
        break;
      case "iot":
        response.readings = (params.sensor_ids as string[] ?? ["S001"]).map(id => ({
          sensor_id: id,
          vibration_mm_s: round2(0.5 + Math.random() * 3),
          temperature_c: round2(20 + Math.random() * 40),
          power_kw: round2(1 + Math.random() * 10),
        }));
        break;
      default:
        response.result = "ok";
    }
  } else {
    response.error = endpoint.status === "offline"
      ? "Connection refused — endpoint is offline"
      : "Request timeout — endpoint is degraded";
  }

  return { success, latency_ms: round2(latency), response };
}

function validateParameters(endpoint: IntegrationEndpoint, params: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const p of endpoint.parameters) {
    if (p.required && params[p.name] === undefined) {
      errors.push(`Missing required parameter: ${p.name} (${p.description})`);
    }
    if (params[p.name] !== undefined) {
      const val = params[p.name];
      const typeOk =
        (p.type === "string" && typeof val === "string") ||
        (p.type === "number" && typeof val === "number") ||
        (p.type === "boolean" && typeof val === "boolean") ||
        (p.type === "object" && typeof val === "object" && !Array.isArray(val)) ||
        (p.type === "array" && Array.isArray(val));
      if (!typeOk) {
        errors.push(`Parameter ${p.name}: expected ${p.type}, got ${typeof val}`);
      }
    }
  }
  return errors;
}

// ── Action Handlers ────────────────────────────────────────────────────────

function igRegister(params: Record<string, unknown>): unknown {
  seedDefaults();

  const id = `IG${String(endpointCounter++).padStart(4, "0")}`;
  const name = String(params.name ?? `Custom_${id}`);
  const type = (params.type as IntegrationType) ?? "custom";
  const version = String(params.version ?? "1.0");
  const base_url = String(params.base_url ?? "https://custom.example.com/api");
  const auth_method = (params.auth_method as IntegrationEndpoint["auth_method"]) ?? "api_key";

  // Parse capabilities
  const capabilities: string[] = [];
  if (Array.isArray(params.capabilities)) {
    for (const c of params.capabilities) capabilities.push(String(c));
  } else if (typeof params.capabilities === "string") {
    capabilities.push(...params.capabilities.split(",").map(s => s.trim()));
  }

  // Parse parameters schema
  const paramDefs: EndpointParameter[] = [];
  if (Array.isArray(params.parameters)) {
    for (const p of params.parameters) {
      const pObj = p as Record<string, unknown>;
      paramDefs.push({
        name: String(pObj.name ?? "param"),
        type: (pObj.type as EndpointParameter["type"]) ?? "string",
        required: Boolean(pObj.required ?? false),
        description: String(pObj.description ?? ""),
      });
    }
  }

  const endpoint: IntegrationEndpoint = {
    id,
    name,
    type,
    version,
    base_url,
    auth_method,
    parameters: paramDefs,
    capabilities,
    rate_limit_rpm: Number(params.rate_limit_rpm ?? 60),
    timeout_ms: Number(params.timeout_ms ?? 5000),
    registered_at: new Date().toISOString(),
    last_invoked_at: null,
    invocation_count: 0,
    success_count: 0,
    failure_count: 0,
    avg_latency_ms: 0,
    status: "active",
    metadata: (params.metadata as Record<string, unknown>) ?? {},
  };

  endpoints.set(id, endpoint);

  return {
    endpoint_id: id,
    status: "registered",
    name,
    type,
    version,
    base_url,
    auth_method,
    capabilities,
    parameters_count: paramDefs.length,
    total_endpoints: endpoints.size,
  };
}

function igInvoke(params: Record<string, unknown>): unknown {
  seedDefaults();

  const endpointId = String(params.endpoint_id ?? "");
  const endpoint = endpoints.get(endpointId);

  // Try to find by name if ID didn't match
  let resolvedEndpoint = endpoint;
  if (!resolvedEndpoint && params.endpoint_name) {
    const name = String(params.endpoint_name).toLowerCase();
    for (const ep of endpoints.values()) {
      if (ep.name.toLowerCase().includes(name)) {
        resolvedEndpoint = ep;
        break;
      }
    }
  }

  // Try to find by type if still not found
  if (!resolvedEndpoint && params.type) {
    const type = String(params.type).toLowerCase();
    for (const ep of endpoints.values()) {
      if (ep.type === type) {
        resolvedEndpoint = ep;
        break;
      }
    }
  }

  if (!resolvedEndpoint) {
    return {
      status: "error",
      error: `Endpoint not found: ${endpointId || params.endpoint_name || params.type}`,
      available_endpoints: [...endpoints.values()].map(e => ({ id: e.id, name: e.name, type: e.type })),
    };
  }

  // Validate parameters
  const invokeParams = (params.parameters as Record<string, unknown>) ?? {};
  const validationErrors = validateParameters(resolvedEndpoint, invokeParams);
  if (validationErrors.length > 0) {
    return {
      status: "validation_error",
      endpoint_id: resolvedEndpoint.id,
      endpoint_name: resolvedEndpoint.name,
      errors: validationErrors,
      expected_parameters: resolvedEndpoint.parameters,
    };
  }

  // Check endpoint status
  if (resolvedEndpoint.status === "offline") {
    return {
      status: "error",
      endpoint_id: resolvedEndpoint.id,
      endpoint_name: resolvedEndpoint.name,
      error: "Endpoint is offline — cannot invoke",
      last_known_status: resolvedEndpoint.status,
    };
  }

  // Simulate invocation
  const result = simulateInvocation(resolvedEndpoint, invokeParams);

  // Update endpoint stats
  resolvedEndpoint.invocation_count++;
  resolvedEndpoint.last_invoked_at = new Date().toISOString();
  if (result.success) {
    resolvedEndpoint.success_count++;
  } else {
    resolvedEndpoint.failure_count++;
  }
  resolvedEndpoint.avg_latency_ms = round2(
    (resolvedEndpoint.avg_latency_ms * (resolvedEndpoint.invocation_count - 1) + result.latency_ms)
    / resolvedEndpoint.invocation_count
  );

  // Log invocation
  const record: InvocationRecord = {
    id: `INV${String(invocationCounter++).padStart(5, "0")}`,
    endpoint_id: resolvedEndpoint.id,
    timestamp: new Date().toISOString(),
    parameters: invokeParams,
    status: result.success ? "success" : "failure",
    latency_ms: result.latency_ms,
    response_summary: result.success ? "OK" : "Failed",
  };
  invocationLog.push(record);
  if (invocationLog.length > 5000) invocationLog.splice(0, invocationLog.length - 5000);

  return {
    invocation_id: record.id,
    endpoint_id: resolvedEndpoint.id,
    endpoint_name: resolvedEndpoint.name,
    status: result.success ? "success" : "failure",
    latency_ms: result.latency_ms,
    response: result.response,
    endpoint_stats: {
      total_invocations: resolvedEndpoint.invocation_count,
      success_rate: resolvedEndpoint.invocation_count > 0
        ? round2(resolvedEndpoint.success_count / resolvedEndpoint.invocation_count)
        : 0,
      avg_latency_ms: resolvedEndpoint.avg_latency_ms,
    },
  };
}

function igSchema(params: Record<string, unknown>): unknown {
  seedDefaults();

  const endpointId = params.endpoint_id ? String(params.endpoint_id) : undefined;
  const type = params.type ? String(params.type) : undefined;

  let targetEndpoints: IntegrationEndpoint[] = [];

  if (endpointId) {
    const ep = endpoints.get(endpointId);
    if (ep) targetEndpoints = [ep];
  } else if (type) {
    targetEndpoints = [...endpoints.values()].filter(e => e.type === type);
  } else {
    targetEndpoints = [...endpoints.values()];
  }

  if (targetEndpoints.length === 0) {
    return {
      status: "not_found",
      query: { endpoint_id: endpointId, type },
      available_types: [...new Set([...endpoints.values()].map(e => e.type))],
    };
  }

  return {
    total_endpoints: targetEndpoints.length,
    schemas: targetEndpoints.map(ep => ({
      id: ep.id,
      name: ep.name,
      type: ep.type,
      version: ep.version,
      base_url: ep.base_url,
      auth_method: ep.auth_method,
      parameters: ep.parameters.map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
        ...(p.default_value !== undefined ? { default: p.default_value } : {}),
      })),
      capabilities: ep.capabilities,
      constraints: {
        rate_limit_rpm: ep.rate_limit_rpm,
        timeout_ms: ep.timeout_ms,
      },
      metadata: ep.metadata,
    })),
  };
}

function igHealth(params: Record<string, unknown>): unknown {
  seedDefaults();

  const type = params.type ? String(params.type) : undefined;
  let targetEndpoints = [...endpoints.values()];
  if (type) targetEndpoints = targetEndpoints.filter(e => e.type === type);

  // Calculate health metrics
  const activeCount = targetEndpoints.filter(e => e.status === "active").length;
  const degradedCount = targetEndpoints.filter(e => e.status === "degraded").length;
  const offlineCount = targetEndpoints.filter(e => e.status === "offline").length;

  const totalInvocations = targetEndpoints.reduce((s, e) => s + e.invocation_count, 0);
  const totalSuccesses = targetEndpoints.reduce((s, e) => s + e.success_count, 0);
  const totalFailures = targetEndpoints.reduce((s, e) => s + e.failure_count, 0);

  const latencies = targetEndpoints
    .filter(e => e.invocation_count > 0)
    .map(e => e.avg_latency_ms);
  const avgLatency = latencies.length > 0
    ? round2(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;

  // Recent invocations (last 20)
  const recentInvocations = invocationLog.slice(-20).reverse();

  // Error rate by endpoint
  const errorRates = targetEndpoints
    .filter(e => e.invocation_count > 0)
    .map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      error_rate: round2(e.failure_count / e.invocation_count),
      invocations: e.invocation_count,
    }))
    .sort((a, b) => b.error_rate - a.error_rate);

  // Overall system health
  const overallHealth = offlineCount > 0
    ? "degraded"
    : degradedCount > 0
      ? "warning"
      : activeCount === targetEndpoints.length
        ? "healthy"
        : "unknown";

  return {
    overall_health: overallHealth,
    filter: type ?? "all",
    endpoint_summary: {
      total: targetEndpoints.length,
      active: activeCount,
      degraded: degradedCount,
      offline: offlineCount,
    },
    invocation_summary: {
      total_invocations: totalInvocations,
      total_successes: totalSuccesses,
      total_failures: totalFailures,
      success_rate: totalInvocations > 0 ? round2(totalSuccesses / totalInvocations) : 0,
      avg_latency_ms: avgLatency,
    },
    endpoints: targetEndpoints.map(ep => ({
      id: ep.id,
      name: ep.name,
      type: ep.type,
      status: ep.status,
      invocations: ep.invocation_count,
      success_rate: ep.invocation_count > 0
        ? round2(ep.success_count / ep.invocation_count) : 1,
      avg_latency_ms: ep.avg_latency_ms,
      last_invoked_at: ep.last_invoked_at,
    })),
    error_rates: errorRates.filter(e => e.error_rate > 0),
    recent_invocations: recentInvocations.map(r => ({
      id: r.id,
      endpoint_id: r.endpoint_id,
      status: r.status,
      latency_ms: r.latency_ms,
      timestamp: r.timestamp,
    })),
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeIntegrationGatewayAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "ig_register": return igRegister(params);
    case "ig_invoke":   return igInvoke(params);
    case "ig_schema":   return igSchema(params);
    case "ig_health":   return igHealth(params);
    default:
      throw new Error(`IntegrationGatewayEngine: unknown action "${action}"`);
  }
}
