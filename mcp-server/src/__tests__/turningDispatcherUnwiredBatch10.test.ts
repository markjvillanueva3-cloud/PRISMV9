/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH10 — 6 unwired
 * LoRA cadence-orch/knowledge-graph/master-orch/model-selector/monitoring/resource-mgr engines.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRACadenceOrchestratorEngine } from "../engines/LatheLoRACadenceOrchestratorEngine.js";
import { latheLoRAKnowledgeGraphEngine } from "../engines/LatheLoRAKnowledgeGraphEngine.js";
import { latheLoRAMasterOrchestratorEngine } from "../engines/LatheLoRAMasterOrchestratorEngine.js";
import { latheLoRAModelSelectorEngine } from "../engines/LatheLoRAModelSelectorEngine.js";
import { latheLoRAMonitoringEngine } from "../engines/LatheLoRAMonitoringEngine.js";
import { latheLoRAResourceManagerEngine } from "../engines/LatheLoRAResourceManagerEngine.js";

const NEW_ACTIONS = [
  "lathe_lora_cadence_orch_config",
  "lathe_lora_knowledge_graph_stats",
  "lathe_lora_master_orch_stats",
  "lathe_lora_model_selector_stats",
  "lathe_lora_monitoring_stats",
  "lathe_lora_resource_manager_stats",
] as const;

const EXPECTED_MASTER_ZERO = {
  initialized: false,
  current_phase: null,
  overall_health: null,
  total_subsystems: 0,
  healthy_subsystems: 0,
  degraded_subsystems: 0,
  unhealthy_subsystems: 0,
  active_operations: 0,
  total_operations: 0,
  uptime_ms: 0,
} as const;

const EXPECTED_SELECTOR_ZERO = {
  total_models: 0,
  enabled_models: 0,
  avg_accuracy: 0,
  avg_latency_ms: 0,
  total_load: 0,
  total_capacity: 0,
  total_selections: 0,
} as const;

const EXPECTED_MONITORING_ZERO = {
  monitored_deployments: 0,
  total_requests: 0,
  total_errors: 0,
  overall_error_rate: 0,
  active_alerts: 0,
  total_alerts: 0,
  health_distribution: { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
} as const;

const EXPECTED_RESOURCE_ZERO = {
  total_pools: 0,
  total_allocations: 0,
  pools_at_soft_limit: 0,
  pools_at_hard_limit: 0,
  avg_utilization: 0,
} as const;

describe("U-WIRE-LATHE-BATCH10 — engines", () => {
  // The ModelSelector zero-state assertion below shares the exported singleton with
  // dispatcher.latheLoRASelectorLoop.test.ts (which registers models). Safe under vitest
  // isolate:true, but reset here so the zero-state assertion is robust if isolation ever changes.
  beforeEach(() => {
    latheLoRAModelSelectorEngine.reset();
  });

  it("CadenceOrchestrator.getConfig has enabled=false (DEFAULT_CONFIG line 106)", () => {
    const c = latheLoRACadenceOrchestratorEngine.getConfig();
    expect(c.enabled).toBe(false);
  });

  it("CadenceOrchestrator.getConfig notify_on_events deep-equals canonical 4-element list", () => {
    const c = latheLoRACadenceOrchestratorEngine.getConfig();
    expect(c.notify_on_events).toEqual(["drift_detected", "training_complete", "deploy_complete", "error"]);
  });

  it("KnowledgeGraph.getStats total_nodes=0 and total_edges=0 on fresh singleton", () => {
    const g = latheLoRAKnowledgeGraphEngine.getStats();
    expect(g.total_nodes).toBe(0);
    expect(g.total_edges).toBe(0);
    expect(g.avg_degree).toBe(0);
  });

  it("KnowledgeGraph.getStats nodes_by_type and edges_by_relation are empty objects", () => {
    const g = latheLoRAKnowledgeGraphEngine.getStats();
    expect(g.nodes_by_type).toEqual({});
    expect(g.edges_by_relation).toEqual({});
  });

  it("MasterOrchestrator.getStats deep-equals EXPECTED_MASTER_ZERO on uninitialized state", () => {
    const m = latheLoRAMasterOrchestratorEngine.getStats();
    expect(m).toEqual(EXPECTED_MASTER_ZERO);
  });

  it("ModelSelector.getStats deep-equals EXPECTED_SELECTOR_ZERO with no registered models", () => {
    const s = latheLoRAModelSelectorEngine.getStats();
    expect(s).toEqual(EXPECTED_SELECTOR_ZERO);
  });

  it("ModelSelector counting invariants: enabled<=total, load<=capacity", () => {
    const s = latheLoRAModelSelectorEngine.getStats();
    expect(s.enabled_models).toBeLessThanOrEqual(s.total_models);
    expect(s.total_load).toBeLessThanOrEqual(s.total_capacity);
  });

  it("Monitoring.getStats deep-equals EXPECTED_MONITORING_ZERO with health_distribution map", () => {
    const m = latheLoRAMonitoringEngine.getStats();
    expect(m).toEqual(EXPECTED_MONITORING_ZERO);
  });

  it("Monitoring.getStats: overall_error_rate=0 when total_requests=0 (div-by-zero guard)", () => {
    const m = latheLoRAMonitoringEngine.getStats();
    expect(m.overall_error_rate).toBe(0);
    expect(m.active_alerts).toBeLessThanOrEqual(m.total_alerts);
  });

  it("ResourceManager.getStats deep-equals EXPECTED_RESOURCE_ZERO with no pools", () => {
    const r = latheLoRAResourceManagerEngine.getStats();
    expect(r).toEqual(EXPECTED_RESOURCE_ZERO);
  });

  it("ResourceManager: pools_at_hard <= pools_at_soft (quota threshold invariant)", () => {
    const r = latheLoRAResourceManagerEngine.getStats();
    expect(r.pools_at_hard_limit).toBeLessThanOrEqual(r.pools_at_soft_limit);
  });

  it("All 6 BATCH10 engines are idempotent across 2 successive reads", () => {
    expect(latheLoRACadenceOrchestratorEngine.getConfig()).toEqual(latheLoRACadenceOrchestratorEngine.getConfig());
    expect(latheLoRAKnowledgeGraphEngine.getStats()).toEqual(latheLoRAKnowledgeGraphEngine.getStats());
    expect(latheLoRAMasterOrchestratorEngine.getStats()).toEqual(latheLoRAMasterOrchestratorEngine.getStats());
    expect(latheLoRAModelSelectorEngine.getStats()).toEqual(latheLoRAModelSelectorEngine.getStats());
    expect(latheLoRAMonitoringEngine.getStats()).toEqual(latheLoRAMonitoringEngine.getStats());
    expect(latheLoRAResourceManagerEngine.getStats()).toEqual(latheLoRAResourceManagerEngine.getStats());
  });
});

describe("U-WIRE-LATHE-BATCH10 — dispatcher wiring", () => {
  it("turningDispatcher source contains case-block for each new action", async () => {
    const src = await fsp.readFile(path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    expect(src.includes('case "lathe_lora_cadence_orch_config":')).toBe(true);
    expect(src.includes('case "lathe_lora_knowledge_graph_stats":')).toBe(true);
    expect(src.includes('case "lathe_lora_master_orch_stats":')).toBe(true);
    expect(src.includes('case "lathe_lora_model_selector_stats":')).toBe(true);
    expect(src.includes('case "lathe_lora_monitoring_stats":')).toBe(true);
    expect(src.includes('case "lathe_lora_resource_manager_stats":')).toBe(true);
  });

  it("All 6 schemas registered with safeParse function in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>;
    expect(typeof m.lathe_lora_cadence_orch_config?.safeParse).toBe("function");
    expect(typeof m.lathe_lora_knowledge_graph_stats?.safeParse).toBe("function");
    expect(typeof m.lathe_lora_master_orch_stats?.safeParse).toBe("function");
    expect(typeof m.lathe_lora_model_selector_stats?.safeParse).toBe("function");
    expect(typeof m.lathe_lora_monitoring_stats?.safeParse).toBe("function");
    expect(typeof m.lathe_lora_resource_manager_stats?.safeParse).toBe("function");
  });

  it("Schemas accept zero-input object {}", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_lora_cadence_orch_config!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_knowledge_graph_stats!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_master_orch_stats!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_model_selector_stats!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_monitoring_stats!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_resource_manager_stats!.safeParse({}).success).toBe(true);
  });

  it("Schemas REJECT string (failure mode 1)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_lora_cadence_orch_config!.safeParse("x").success).toBe(false);
    expect(m.lathe_lora_knowledge_graph_stats!.safeParse("x").success).toBe(false);
    expect(m.lathe_lora_master_orch_stats!.safeParse("x").success).toBe(false);
  });

  it("Schemas REJECT null (failure mode 2)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_lora_model_selector_stats!.safeParse(null).success).toBe(false);
    expect(m.lathe_lora_monitoring_stats!.safeParse(null).success).toBe(false);
    expect(m.lathe_lora_resource_manager_stats!.safeParse(null).success).toBe(false);
  });

  it("Schemas REJECT array (failure mode 3 — array is object but not record)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_lora_cadence_orch_config!.safeParse([]).success).toBe(false);
    expect(m.lathe_lora_knowledge_graph_stats!.safeParse([1, 2]).success).toBe(false);
    expect(m.lathe_lora_master_orch_stats!.safeParse([{ x: 1 }]).success).toBe(false);
  });
});
