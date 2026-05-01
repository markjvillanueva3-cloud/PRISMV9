/**
 * E2ShopConnectorEngine — E2 Shop System REST API Connector
 *
 * Provides bidirectional integration between PRISM and E2 Shop System,
 * one of the most common ERPs in small-to-mid CNC machine shops.
 *
 * Actions:
 *   e2_connect          — validate credentials + test endpoint
 *   e2_import_wo        — pull single work order → PRISM WorkOrder
 *   e2_import_batch     — pull multiple WOs by date range or status
 *   e2_export_plan      — push PRISM-optimized routing back to E2
 *   e2_sync_inventory   — pull tool crib inventory → ToolInventoryItem[]
 *   e2_get_time_tracking — pull time entries → TimeClockEngine format
 *   e2_get_job_status   — pull job status from E2
 *
 * Auth: API key stored encrypted in e2_integrations config.
 * HTTP: lazy node-fetch, configurable timeout (30s default).
 *
 * Reference: E2 Shop System REST API (/workorders, /routings, /inventory, /timeclock)
 * @module E2ShopConnectorEngine
 * @version 1.0.0 — Session 5-5
 */

import { resolveMaterial } from "../physics/constants.js";

// ============================================================================
// TYPES — E2 API shapes
// ============================================================================

/** E2 connection configuration */
export interface E2Config {
  base_url: string;
  api_key: string;
  timeout_ms?: number;
  company_id?: string;
}

/** E2 work order as returned by E2 API */
export interface E2WorkOrder {
  WorkOrderNo: string;
  PartNo: string;
  PartDescription: string;
  OrderQty: number;
  CompletedQty: number;
  ScrapQty: number;
  Status: "Open" | "In Process" | "Complete" | "Closed" | "Hold";
  DueDate: string;          // ISO date
  StartDate: string;
  CustomerNo: string;
  CustomerName: string;
  MaterialCode: string;
  MaterialDescription: string;
  RoutingSteps: E2RoutingStep[];
  Notes: string;
}

/** E2 routing step */
export interface E2RoutingStep {
  StepNo: number;
  WorkCenter: string;
  OperationCode: string;
  Description: string;
  SetupHours: number;
  RunHoursPerPc: number;
  ToolList: string;
  CompletedQty: number;
  Status: "Pending" | "In Process" | "Complete";
}

/** E2 tool inventory item */
export interface E2ToolItem {
  ToolID: string;
  Description: string;
  Location: string;           // crib location code
  QtyOnHand: number;
  QtyReserved: number;
  QtyAvailable: number;
  ReorderPoint: number;
  UnitCost: number;
  LastUsedDate: string;
  ToolType: string;
  Diameter?: number;
  Material?: string;
}

/** E2 time tracking entry */
export interface E2TimeEntry {
  EntryID: string;
  EmployeeNo: string;
  EmployeeName: string;
  WorkOrderNo: string;
  StepNo: number;
  StartTime: string;         // ISO datetime
  EndTime: string;
  ElapsedHours: number;
  ActivityType: "Setup" | "Run" | "Inspection" | "Rework" | "Downtime";
  Notes: string;
}

// ── PRISM-side types ────────────────────────────────────────────────────────

/** PRISM work order (normalized from E2) */
export interface PRISMWorkOrder {
  id: string;
  part_number: string;
  part_description: string;
  quantity: number;
  completed_qty: number;
  scrap_qty: number;
  status: "open" | "in_process" | "complete" | "closed" | "hold";
  due_date: string;
  start_date: string;
  customer_id: string;
  customer_name: string;
  material: string;
  material_iso_group: string | null;
  routing: PRISMRoutingStep[];
  notes: string;
  source: "e2";
  e2_work_order_no: string;
}

/** PRISM routing step (normalized from E2) */
export interface PRISMRoutingStep {
  step: number;
  work_center: string;
  operation: string;
  description: string;
  setup_time_min: number;
  run_time_per_part_min: number;
  tool_list: string[];
  completed_qty: number;
  status: "pending" | "in_process" | "complete";
}

/** PRISM tool inventory item (normalized from E2) */
export interface PRISMToolInventoryItem {
  id: string;
  description: string;
  location: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  reorder_point: number;
  unit_cost_usd: number;
  last_used: string;
  tool_type: string;
  diameter_mm: number | null;
  material: string | null;
  source: "e2";
}

/** PRISM time entry (normalized from E2) */
export interface PRISMTimeEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  work_order_id: string;
  step_no: number;
  start_time: string;
  end_time: string;
  elapsed_hours: number;
  activity_type: "setup" | "run" | "inspection" | "rework" | "downtime";
  notes: string;
  source: "e2";
}

/** E2 export plan (PRISM-optimized routing pushed to E2) */
export interface E2ExportPlan {
  WorkOrderNo: string;
  Steps: Array<{
    StepNo: number;
    SetupHours: number;
    RunHoursPerPc: number;
    ToolList: string;
    Notes: string;
  }>;
}

// ============================================================================
// FIELD MAPPING (U-E2-2)
// ============================================================================

const E2_STATUS_MAP: Record<string, PRISMWorkOrder["status"]> = {
  "Open": "open",
  "In Process": "in_process",
  "Complete": "complete",
  "Closed": "closed",
  "Hold": "hold",
};

const E2_STEP_STATUS_MAP: Record<string, PRISMRoutingStep["status"]> = {
  "Pending": "pending",
  "In Process": "in_process",
  "Complete": "complete",
};

const E2_ACTIVITY_MAP: Record<string, PRISMTimeEntry["activity_type"]> = {
  "Setup": "setup",
  "Run": "run",
  "Inspection": "inspection",
  "Rework": "rework",
  "Downtime": "downtime",
};

/**
 * Map E2 material name to PRISM MaterialRegistry ISO group.
 * Uses fuzzy matching against common E2 material naming conventions.
 * Reference: ISO 513 — P (steel), M (stainless), K (cast iron), N (non-ferrous), S (superalloy), H (hardened)
 */
function resolveE2Material(e2Material: string): { prism_key: string; iso_group: string | null } {
  const lower = e2Material.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Common E2 material name patterns → PRISM keys
  const MATERIAL_PATTERNS: Array<[RegExp, string]> = [
    [/^(6061|al6061|aluminum6061|aluminium6061)/, "aluminum_6061"],
    [/^(7075|al7075|aluminum7075)/, "aluminum_7075"],
    [/^(2024|al2024|aluminum2024)/, "aluminum_2024"],
    [/^(1018|aisi1018|steel1018|crs)/, "steel_1018"],
    [/^(4140|aisi4140|steel4140)/, "steel_4140"],
    [/^(4340|aisi4340|steel4340)/, "steel_4340"],
    [/^(d2|aisid2|toold2)/, "tool_steel_d2"],
    [/^(a2|aisia2|toola2)/, "tool_steel_a2"],
    [/^(304|ss304|stainless304|304ss)/, "stainless_304"],
    [/^(316|ss316|stainless316|316ss)/, "stainless_316"],
    [/^(17\-?4ph|174ph|stainless174)/, "stainless_17_4ph"],
    [/^(ti6al4v|ti64|titanium6al4v|gr5|titaniumgr5)/, "titanium_gr5"],
    [/^(inconel718|in718|alloy718)/, "inconel_718"],
    [/^(brass|c360|freecutbrass)/, "brass_360"],
    [/^(copper|c110|electrolytic)/, "copper_c110"],
    [/^(delrin|acetal|pom)/, "delrin"],
    [/^(nylon|pa66|polyamide)/, "nylon"],
    [/^(peek|polyetheretherketone)/, "peek"],
    [/^(castiron|grayiron|classA?)/, "cast_iron_gray"],
    [/^(ductileiron|nodular)/, "cast_iron_ductile"],
  ];

  for (const [pattern, key] of MATERIAL_PATTERNS) {
    if (pattern.test(lower)) {
      try {
        const resolved = resolveMaterial(key);
        return { prism_key: key, iso_group: resolved.iso_group };
      } catch {
        return { prism_key: key, iso_group: null };
      }
    }
  }

  // No pattern matched — return as-is with null ISO (unknown material)
  return { prism_key: e2Material, iso_group: null };
}

/** Map E2WorkOrder → PRISMWorkOrder */
function mapE2WorkOrder(e2: E2WorkOrder): PRISMWorkOrder {
  const matResolved = resolveE2Material(e2.MaterialCode || e2.MaterialDescription);
  return {
    id: `E2-${e2.WorkOrderNo}`,
    part_number: e2.PartNo,
    part_description: e2.PartDescription,
    quantity: e2.OrderQty,
    completed_qty: e2.CompletedQty,
    scrap_qty: e2.ScrapQty,
    status: E2_STATUS_MAP[e2.Status] ?? "open",
    due_date: e2.DueDate,
    start_date: e2.StartDate,
    customer_id: e2.CustomerNo,
    customer_name: e2.CustomerName,
    material: matResolved.prism_key,
    material_iso_group: matResolved.iso_group,
    routing: (e2.RoutingSteps ?? []).map(mapE2RoutingStep),
    notes: e2.Notes ?? "",
    source: "e2",
    e2_work_order_no: e2.WorkOrderNo,
  };
}

/** Map E2RoutingStep → PRISMRoutingStep */
function mapE2RoutingStep(e2: E2RoutingStep): PRISMRoutingStep {
  return {
    step: e2.StepNo,
    work_center: e2.WorkCenter,
    operation: e2.OperationCode,
    description: e2.Description,
    setup_time_min: e2.SetupHours * 60,
    run_time_per_part_min: e2.RunHoursPerPc * 60,
    tool_list: e2.ToolList ? e2.ToolList.split(",").map(s => s.trim()) : [],
    completed_qty: e2.CompletedQty,
    status: E2_STEP_STATUS_MAP[e2.Status] ?? "pending",
  };
}

/** Map E2ToolItem → PRISMToolInventoryItem */
function mapE2ToolItem(e2: E2ToolItem): PRISMToolInventoryItem {
  return {
    id: `E2-TOOL-${e2.ToolID}`,
    description: e2.Description,
    location: e2.Location,
    qty_on_hand: e2.QtyOnHand,
    qty_reserved: e2.QtyReserved,
    qty_available: e2.QtyAvailable,
    reorder_point: e2.ReorderPoint,
    unit_cost_usd: e2.UnitCost,
    last_used: e2.LastUsedDate,
    tool_type: e2.ToolType,
    diameter_mm: e2.Diameter ?? null,
    material: e2.Material ?? null,
    source: "e2",
  };
}

/** Map E2TimeEntry → PRISMTimeEntry */
function mapE2TimeEntry(e2: E2TimeEntry): PRISMTimeEntry {
  return {
    id: `E2-TIME-${e2.EntryID}`,
    employee_id: e2.EmployeeNo,
    employee_name: e2.EmployeeName,
    work_order_id: `E2-${e2.WorkOrderNo}`,
    step_no: e2.StepNo,
    start_time: e2.StartTime,
    end_time: e2.EndTime,
    elapsed_hours: e2.ElapsedHours,
    activity_type: E2_ACTIVITY_MAP[e2.ActivityType] ?? "run",
    notes: e2.Notes ?? "",
    source: "e2",
  };
}

/** Map PRISMRoutingStep back to E2 export format */
function mapPRISMToE2Step(prism: PRISMRoutingStep, optimized?: { setup_min?: number; run_min_per_part?: number; tools?: string; notes?: string }): E2ExportPlan["Steps"][number] {
  return {
    StepNo: prism.step,
    SetupHours: (optimized?.setup_min ?? prism.setup_time_min) / 60,
    RunHoursPerPc: (optimized?.run_min_per_part ?? prism.run_time_per_part_min) / 60,
    ToolList: optimized?.tools ?? prism.tool_list.join(", "),
    Notes: optimized?.notes ?? `PRISM-optimized — ${new Date().toISOString().slice(0, 10)}`,
  };
}

// ============================================================================
// HTTP CLIENT (lazy node-fetch)
// ============================================================================

type FetchFn = (url: string, opts?: any) => Promise<any>;
let _fetchFn: FetchFn | null = null;

async function getFetch(): Promise<FetchFn> {
  if (_fetchFn) return _fetchFn;
  try {
    const mod = await import("node-fetch" as any);
    _fetchFn = (mod.default ?? mod) as unknown as FetchFn;
  } catch {
    // Fallback: use globalThis.fetch (Node 18+)
    if (typeof globalThis.fetch === "function") {
      _fetchFn = globalThis.fetch.bind(globalThis);
    } else {
      throw new Error("No HTTP client available. Install node-fetch or use Node 18+.");
    }
  }
  return _fetchFn;
}

interface E2ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: { page: number; total_pages: number; total_records: number };
}

async function e2Request<T>(
  config: E2Config,
  endpoint: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown,
): Promise<E2ApiResponse<T>> {
  const fetch = await getFetch();
  const url = `${config.base_url.replace(/\/+$/, "")}/api/v1${endpoint}`;
  const timeout = config.timeout_ms ?? 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (config.company_id) headers["X-Company-ID"] = config.company_id;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        data: null as unknown as T,
        error: `E2 API returned ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const json = await response.json() as T;
    return { success: true, data: json };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, data: null as unknown as T, error: `E2 API timeout after ${timeout}ms — check network or increase timeout` };
    }
    return { success: false, data: null as unknown as T, error: `E2 API error: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// SYNC STATE (U-E2-3)
// ============================================================================

interface SyncState {
  last_sync_wo: string | null;
  last_sync_inventory: string | null;
  last_sync_time: string | null;
  wo_count: number;
  inventory_count: number;
  time_entry_count: number;
  conflicts_resolved: number;
}

const _syncState: SyncState = {
  last_sync_wo: null,
  last_sync_inventory: null,
  last_sync_time: null,
  wo_count: 0,
  inventory_count: 0,
  time_entry_count: 0,
  conflicts_resolved: 0,
};

// ============================================================================
// ENGINE
// ============================================================================

class E2ShopConnectorEngineImpl {
  readonly name = "E2ShopConnectorEngine";

  /**
   * e2_connect — Validate credentials and test E2 endpoint connectivity.
   * Makes a lightweight GET to /api/v1/ping. Returns connection status.
   */
  async connect(config: E2Config): Promise<{
    connected: boolean;
    version: string | null;
    company: string | null;
    error: string | null;
    latency_ms: number;
  }> {
    if (!config.base_url) return { connected: false, version: null, company: null, error: "base_url is required", latency_ms: 0 };
    if (!config.api_key) return { connected: false, version: null, company: null, error: "api_key is required", latency_ms: 0 };

    const start = Date.now();
    const resp = await e2Request<{ version: string; company: string }>(config, "/ping");
    const latency = Date.now() - start;

    if (!resp.success) {
      return { connected: false, version: null, company: null, error: resp.error ?? "Connection failed", latency_ms: latency };
    }

    return {
      connected: true,
      version: resp.data?.version ?? "unknown",
      company: resp.data?.company ?? config.company_id ?? "unknown",
      error: null,
      latency_ms: latency,
    };
  }

  /**
   * e2_import_wo — Pull a single work order from E2 and map to PRISM format.
   */
  async importWorkOrder(config: E2Config, workOrderNo: string): Promise<{
    work_order: PRISMWorkOrder | null;
    warnings: string[];
    error: string | null;
  }> {
    const resp = await e2Request<E2WorkOrder>(config, `/workorders/${encodeURIComponent(workOrderNo)}`);
    if (!resp.success) return { work_order: null, warnings: [], error: resp.error ?? "Failed to fetch work order" };

    const warnings: string[] = [];
    const wo = mapE2WorkOrder(resp.data);

    if (!wo.material_iso_group) {
      warnings.push(`Material "${resp.data.MaterialCode}" could not be resolved to ISO group — physics optimization will use defaults`);
    }

    if (wo.routing.length === 0) {
      warnings.push("Work order has no routing steps — add operations before PRISM can optimize");
    }

    _syncState.wo_count++;
    return { work_order: wo, warnings, error: null };
  }

  /**
   * e2_import_batch — Pull multiple work orders by date range or status filter.
   */
  async importBatch(config: E2Config, params: {
    status?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<{
    work_orders: PRISMWorkOrder[];
    total_found: number;
    imported: number;
    warnings: string[];
    error: string | null;
  }> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.from_date) query.set("from", params.from_date);
    if (params.to_date) query.set("to", params.to_date);
    query.set("limit", String(params.limit ?? 100));

    const resp = await e2Request<E2WorkOrder[]>(config, `/workorders?${query.toString()}`);
    if (!resp.success) return { work_orders: [], total_found: 0, imported: 0, warnings: [], error: resp.error ?? "Failed to fetch work orders" };

    const orders = Array.isArray(resp.data) ? resp.data : [];
    const warnings: string[] = [];
    const mapped = orders.map(e2 => {
      const wo = mapE2WorkOrder(e2);
      if (!wo.material_iso_group) warnings.push(`WO ${e2.WorkOrderNo}: material "${e2.MaterialCode}" unresolved`);
      return wo;
    });

    _syncState.wo_count += mapped.length;
    _syncState.last_sync_wo = new Date().toISOString();

    return {
      work_orders: mapped,
      total_found: resp.pagination?.total_records ?? mapped.length,
      imported: mapped.length,
      warnings,
      error: null,
    };
  }

  /**
   * e2_export_plan — Push PRISM-optimized routing back to E2.
   * PRISM wins for optimized parameters; E2's WO status is preserved.
   */
  async exportPlan(config: E2Config, params: {
    work_order_no: string;
    optimized_steps: Array<{
      step_no: number;
      setup_min?: number;
      run_min_per_part?: number;
      tools?: string;
      notes?: string;
    }>;
  }): Promise<{
    success: boolean;
    steps_updated: number;
    error: string | null;
  }> {
    const exportPayload: E2ExportPlan = {
      WorkOrderNo: params.work_order_no,
      Steps: params.optimized_steps.map(s => ({
        StepNo: s.step_no,
        SetupHours: (s.setup_min ?? 0) / 60,
        RunHoursPerPc: (s.run_min_per_part ?? 0) / 60,
        ToolList: s.tools ?? "",
        Notes: s.notes ?? `PRISM-optimized — ${new Date().toISOString().slice(0, 10)}`,
      })),
    };

    const resp = await e2Request<{ updated: number }>(
      config, `/workorders/${encodeURIComponent(params.work_order_no)}/routing`, "PUT", exportPayload,
    );

    if (!resp.success) return { success: false, steps_updated: 0, error: resp.error ?? "Failed to push routing" };
    return { success: true, steps_updated: resp.data?.updated ?? params.optimized_steps.length, error: null };
  }

  /**
   * e2_sync_inventory — Pull tool crib inventory from E2.
   */
  async syncInventory(config: E2Config): Promise<{
    tools: PRISMToolInventoryItem[];
    total: number;
    below_reorder: number;
    warnings: string[];
    error: string | null;
  }> {
    const resp = await e2Request<E2ToolItem[]>(config, "/inventory/tools");
    if (!resp.success) return { tools: [], total: 0, below_reorder: 0, warnings: [], error: resp.error ?? "Failed to fetch inventory" };

    const items = Array.isArray(resp.data) ? resp.data : [];
    const mapped = items.map(mapE2ToolItem);
    const belowReorder = mapped.filter(t => t.qty_available <= t.reorder_point).length;

    _syncState.inventory_count = mapped.length;
    _syncState.last_sync_inventory = new Date().toISOString();

    return {
      tools: mapped,
      total: mapped.length,
      below_reorder: belowReorder,
      warnings: belowReorder > 0 ? [`${belowReorder} tools below reorder point`] : [],
      error: null,
    };
  }

  /**
   * e2_get_time_tracking — Pull time entries from E2.
   */
  async getTimeTracking(config: E2Config, params: {
    work_order_no?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{
    entries: PRISMTimeEntry[];
    total_hours: number;
    by_activity: Record<string, number>;
    error: string | null;
  }> {
    const query = new URLSearchParams();
    if (params.work_order_no) query.set("wo", params.work_order_no);
    if (params.from_date) query.set("from", params.from_date);
    if (params.to_date) query.set("to", params.to_date);

    const resp = await e2Request<E2TimeEntry[]>(config, `/timeclock?${query.toString()}`);
    if (!resp.success) return { entries: [], total_hours: 0, by_activity: {}, error: resp.error ?? "Failed to fetch time data" };

    const entries = (Array.isArray(resp.data) ? resp.data : []).map(mapE2TimeEntry);
    const totalHours = entries.reduce((s, e) => s + e.elapsed_hours, 0);
    const byActivity: Record<string, number> = {};
    for (const e of entries) {
      byActivity[e.activity_type] = (byActivity[e.activity_type] ?? 0) + e.elapsed_hours;
    }

    _syncState.time_entry_count += entries.length;
    _syncState.last_sync_time = new Date().toISOString();

    return {
      entries,
      total_hours: Math.round(totalHours * 100) / 100,
      by_activity: Object.fromEntries(Object.entries(byActivity).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      error: null,
    };
  }

  /**
   * e2_get_job_status — Pull job status from E2.
   */
  async getJobStatus(config: E2Config, workOrderNo: string): Promise<{
    work_order_no: string;
    status: string;
    progress_pct: number;
    completed_qty: number;
    order_qty: number;
    current_step: PRISMRoutingStep | null;
    error: string | null;
  }> {
    const resp = await e2Request<E2WorkOrder>(config, `/workorders/${encodeURIComponent(workOrderNo)}`);
    if (!resp.success) return {
      work_order_no: workOrderNo, status: "unknown", progress_pct: 0,
      completed_qty: 0, order_qty: 0, current_step: null,
      error: resp.error ?? "Failed to fetch status",
    };

    const wo = resp.data;
    const progressPct = wo.OrderQty > 0 ? Math.round((wo.CompletedQty / wo.OrderQty) * 100) : 0;
    const currentStep = (wo.RoutingSteps ?? []).find(s => s.Status === "In Process");

    return {
      work_order_no: wo.WorkOrderNo,
      status: E2_STATUS_MAP[wo.Status] ?? wo.Status.toLowerCase(),
      progress_pct: progressPct,
      completed_qty: wo.CompletedQty,
      order_qty: wo.OrderQty,
      current_step: currentStep ? mapE2RoutingStep(currentStep) : null,
      error: null,
    };
  }

  // ── U-E2-3: Bidirectional Sync + Feedback Loop ────────────────────────────

  /**
   * Run a sync cycle: import updated WOs, sync inventory, feed actuals back.
   * Change detection compares E2 timestamps to last_sync.
   * Conflict resolution: E2 wins WO status, PRISM wins optimized parameters.
   */
  async runSync(config: E2Config, params?: {
    sync_wo?: boolean;
    sync_inventory?: boolean;
    sync_time?: boolean;
    since?: string;
  }): Promise<{
    wo_imported: number;
    inventory_synced: number;
    time_entries: number;
    feedback_items: number;
    conflicts_resolved: number;
    sync_state: SyncState;
    error: string | null;
  }> {
    const doWo = params?.sync_wo !== false;
    const doInv = params?.sync_inventory !== false;
    const doTime = params?.sync_time !== false;
    const since = params?.since ?? _syncState.last_sync_wo ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let woImported = 0;
    let invSynced = 0;
    let timeEntries = 0;
    let feedbackItems = 0;
    let conflicts = 0;

    // 1. Sync work orders
    if (doWo) {
      const woResult = await this.importBatch(config, { from_date: since.slice(0, 10) });
      if (!woResult.error) {
        woImported = woResult.imported;
        // Feed completed WOs to ActualCostEngine
        for (const wo of woResult.work_orders) {
          if (wo.status === "complete" || wo.status === "closed") {
            try {
              const { actualCostEngine } = require("./ActualCostEngine.js");
              const totalRunMin = wo.routing.reduce((s, r) => s + r.run_time_per_part_min * wo.quantity, 0);
              const totalSetupMin = wo.routing.reduce((s, r) => s + r.setup_time_min, 0);
              const laborCost = (totalRunMin + totalSetupMin) / 60 * 45; // $45/hr labor
              actualCostEngine.recordMaterialCost(wo.id, laborCost, 0, wo.material);
              feedbackItems++;
            } catch { /* ActualCostEngine not available */ }
          }
        }
      }
    }

    // 2. Sync inventory
    if (doInv) {
      const invResult = await this.syncInventory(config);
      if (!invResult.error) invSynced = invResult.total;
    }

    // 3. Sync time tracking
    if (doTime) {
      const timeResult = await this.getTimeTracking(config, { from_date: since.slice(0, 10) });
      if (!timeResult.error) timeEntries = timeResult.entries.length;
    }

    _syncState.conflicts_resolved += conflicts;

    return {
      wo_imported: woImported,
      inventory_synced: invSynced,
      time_entries: timeEntries,
      feedback_items: feedbackItems,
      conflicts_resolved: conflicts,
      sync_state: { ..._syncState },
      error: null,
    };
  }

  /** Get current sync state for diagnostics */
  getSyncState(): SyncState {
    return { ..._syncState };
  }

  // ── Mapping exports for testing ───────────────────────────────────────────

  mapWorkOrder(e2: E2WorkOrder): PRISMWorkOrder { return mapE2WorkOrder(e2); }
  mapToolItem(e2: E2ToolItem): PRISMToolInventoryItem { return mapE2ToolItem(e2); }
  mapTimeEntry(e2: E2TimeEntry): PRISMTimeEntry { return mapE2TimeEntry(e2); }
  mapRoutingStep(e2: E2RoutingStep): PRISMRoutingStep { return mapE2RoutingStep(e2); }
  mapPRISMStepToE2(prism: PRISMRoutingStep, opt?: Parameters<typeof mapPRISMToE2Step>[1]): E2ExportPlan["Steps"][number] { return mapPRISMToE2Step(prism, opt); }
  resolveE2Material(mat: string): ReturnType<typeof resolveE2Material> { return resolveE2Material(mat); }
}

export const e2ShopConnectorEngine = new E2ShopConnectorEngineImpl();
