/**
 * MultiERPConnectorEngine — SQ4-0-ERP Unified Multi-ERP Connector Framework
 * ===========================================================================
 *
 * Provides a unified `IERPConnector` interface that abstracts ERP-specific
 * operations, plus concrete adapters for:
 *   - E2 Shop System (wraps existing E2ShopConnectorEngine)
 *   - Epicor Kinetic (REST OData API)
 *   - ProShop ERP (cloud-based, CNC-shop focused)
 *   - Generic CSV (configurable column mapping)
 *
 * The MultiERPConnectorEngine routes operations to the correct adapter based
 * on a registered system ID, enabling shops to connect multiple ERPs
 * simultaneously (e.g., E2 for production + ProShop for quality).
 *
 * Actions (wired to integrationDispatcher):
 *   multi_erp_connect       — test connection to a registered ERP
 *   multi_erp_import_wo     — import work order(s) via unified interface
 *   multi_erp_export_plan   — push PRISM-optimized routing back to ERP
 *   multi_erp_sync_inventory — pull tool inventory from ERP
 *   multi_erp_status        — health/sync status for all registered ERPs
 *   multi_erp_list_systems  — list supported ERP systems and their capabilities
 *
 * Reference: E2 Shop System REST API, Epicor Kinetic REST v2 (OData),
 *            ProShop ERP API, RFC 4180 (CSV format)
 *
 * @module MultiERPConnectorEngine
 * @version 1.0.0 — SQ4-0-ERP
 */

import { resolveMaterial } from "../physics/constants.js";

// ============================================================================
// SHARED PRISM TYPES (normalized from any ERP)
// ============================================================================

/** ERP system identifier */
export type ERPSystemType = "e2" | "epicor_kinetic" | "proshop" | "generic_csv";

/** Connection configuration common to all ERPs */
export interface ERPConnectionConfig {
  system: ERPSystemType;
  base_url?: string;
  api_key?: string;
  username?: string;
  password?: string;
  timeout_ms?: number;
  company_id?: string;
  /** CSV-specific: file path or data string */
  csv_source?: string;
  /** CSV-specific: column mapping overrides */
  csv_mapping?: Partial<CSVColumnMapping>;
}

/** Normalized work order (ERP-agnostic) */
export interface UnifiedWorkOrder {
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
  routing: UnifiedRoutingStep[];
  notes: string;
  source: ERPSystemType;
  source_id: string;
}

/** Normalized routing step */
export interface UnifiedRoutingStep {
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

/** Normalized tool inventory item */
export interface UnifiedToolInventory {
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
  source: ERPSystemType;
}

/** Export plan (PRISM-optimized routing pushed back to ERP) */
export interface UnifiedExportPlan {
  work_order_id: string;
  steps: Array<{
    step: number;
    setup_time_min: number;
    run_time_per_part_min: number;
    tools: string;
    notes: string;
  }>;
}

/** Connection test result */
export interface ConnectResult {
  connected: boolean;
  system: ERPSystemType;
  version: string | null;
  company: string | null;
  error: string | null;
  latency_ms: number;
  capabilities: ERPCapability[];
}

/** What operations an ERP connector supports */
export type ERPCapability =
  | "import_wo"
  | "import_batch"
  | "export_plan"
  | "sync_inventory"
  | "time_tracking"
  | "quality_import"
  | "bidirectional_sync";

/** CSV column mapping configuration */
export interface CSVColumnMapping {
  wo_number: string;
  part_number: string;
  part_description: string;
  quantity: string;
  material: string;
  due_date: string;
  status: string;
  customer: string;
  step_number: string;
  operation: string;
  work_center: string;
  setup_hours: string;
  run_hours_per_part: string;
  delimiter: string;
  date_format: string;
  encoding: string;
}

// ============================================================================
// IERPConnector INTERFACE
// ============================================================================

/**
 * Common interface all ERP connectors implement.
 * Each connector maps its native API types to unified PRISM types.
 *
 * Design: adapter pattern — each ERP's quirks are isolated in its connector.
 * The MultiERPConnectorEngine delegates to connectors without knowing specifics.
 */
export interface IERPConnector {
  /** System identifier */
  readonly system: ERPSystemType;
  /** Human-readable name */
  readonly displayName: string;
  /** Supported capabilities */
  readonly capabilities: ERPCapability[];

  /** Test connection and return status */
  connect(config: ERPConnectionConfig): Promise<ConnectResult>;

  /** Import a single work order by ID */
  importWorkOrder(config: ERPConnectionConfig, woId: string): Promise<{
    work_order: UnifiedWorkOrder | null;
    warnings: string[];
    error: string | null;
  }>;

  /** Import multiple work orders by filter */
  importBatch(config: ERPConnectionConfig, filter: {
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<{
    work_orders: UnifiedWorkOrder[];
    total_available: number;
    warnings: string[];
    error: string | null;
  }>;

  /** Export PRISM-optimized routing back to ERP */
  exportPlan(config: ERPConnectionConfig, plan: UnifiedExportPlan): Promise<{
    success: boolean;
    updated_steps: number;
    error: string | null;
  }>;

  /** Pull tool inventory */
  syncInventory(config: ERPConnectionConfig): Promise<{
    items: UnifiedToolInventory[];
    total: number;
    error: string | null;
  }>;
}

// ============================================================================
// MATERIAL RESOLUTION (shared across all adapters)
// ============================================================================

/** Map raw material strings to PRISM keys + ISO groups via constants.ts */
function resolveERPMaterial(raw: string): { prism_key: string; iso_group: string | null } {
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Common ERP material name patterns → CANONICAL_MATERIAL_DB keys
  // Each key MUST exist in constants.ts CANONICAL_MATERIAL_DB (13 entries).
  // Reference: ISO 513 — P (steel), M (stainless), K (cast iron), N (non-ferrous), S (superalloy), H (hardened)
  const PATTERNS: Array<[RegExp, string]> = [
    // ISO N — Non-ferrous
    [/^(6061|al6061|aluminum6061|aluminium6061)/, "aluminum_6061"],
    [/^(7075|al7075|aluminum7075)/, "aluminum_7075"],
    [/^(2024|al2024|aluminum2024)/, "aluminum_6061"],       // 2024 → closest canonical N-group
    [/^(aluminum|aluminium|alu)/, "aluminum_6061"],          // Generic aluminum
    [/^(brass|c360|freecutbrass|cuzn)/, "brass"],
    [/^(copper|c110|electrolytic|bronze)/, "brass"],         // Copper → brass (closest N-group)
    // ISO P — Steels
    [/^(1018|aisi1018|steel1018|crs|coldrolled)/, "steel"],  // 1018 → generic carbon steel
    [/^(1045|aisi1045|steel1045)/, "steel"],                 // 1045 → generic carbon steel
    [/^(4140|aisi4140|steel4140)/, "alloy_steel"],
    [/^(4340|aisi4340|steel4340)/, "alloy_steel"],
    [/^(8620|aisi8620)/, "alloy_steel"],
    [/^(steel|carbonsteel|mildsteel)/, "steel"],             // Generic steel
    // ISO M — Stainless
    [/^(304|ss304|stainless304|304ss)/, "stainless_304"],
    [/^(316|ss316|stainless316|316ss)/, "stainless_316"],
    [/^(17\-?4ph|174ph|stainless174)/, "stainless_304"],    // 17-4PH → closest M-group
    [/^(stainless|ss)/, "stainless_304"],                    // Generic stainless
    // ISO H — Hardened / Tool Steel
    [/^(d2|aisid2|toold2)/, "tool_steel"],
    [/^(a2|aisia2|toola2)/, "tool_steel"],
    [/^(h13|aisih13|toolh13)/, "tool_steel"],
    [/^(toolsteel)/, "tool_steel"],
    [/^(hardened|hrc5[0-9]|hrc6[0-5])/, "hardened_steel"],
    // ISO S — Superalloys
    [/^(ti6al4v|ti64|titanium6al4v|gr5|titaniumgr5)/, "titanium_gr5"],
    [/^(titanium|ti)/, "titanium_gr5"],                      // Generic titanium
    [/^(inconel718|in718|alloy718)/, "inconel_718"],
    [/^(inconel|hastelloy|waspaloy)/, "inconel_718"],        // Generic superalloy
    // ISO K — Cast Iron
    [/^(castiron|grayiron|class[a-d]?|gg25)/, "cast_iron"],
    [/^(ductileiron|nodular|ggg50)/, "ductile_iron"],
  ];

  for (const [pattern, key] of PATTERNS) {
    if (pattern.test(lower)) {
      try {
        const resolved = resolveMaterial(key);
        if (resolved === undefined) {
          return { prism_key: key, iso_group: null };
        }
        return { prism_key: key, iso_group: resolved.iso_group };
      } catch {
        return { prism_key: key, iso_group: null };
      }
    }
  }

  return { prism_key: raw, iso_group: null };
}

// ============================================================================
// E2 ADAPTER (wraps existing E2ShopConnectorEngine)
// ============================================================================

class E2Adapter implements IERPConnector {
  readonly system: ERPSystemType = "e2";
  readonly displayName = "E2 Shop System";
  readonly capabilities: ERPCapability[] = [
    "import_wo", "import_batch", "export_plan",
    "sync_inventory", "time_tracking", "bidirectional_sync",
  ];

  async connect(config: ERPConnectionConfig): Promise<ConnectResult> {
    try {
      const { e2ShopConnectorEngine } = await import("./E2ShopConnectorEngine.js");
      const result = await e2ShopConnectorEngine.connect({
        base_url: config.base_url ?? "",
        api_key: config.api_key ?? "",
        timeout_ms: config.timeout_ms,
        company_id: config.company_id,
      });
      return {
        connected: result.connected,
        system: "e2",
        version: result.version,
        company: result.company,
        error: result.error,
        latency_ms: result.latency_ms,
        capabilities: this.capabilities,
      };
    } catch (err: any) {
      return {
        connected: false, system: "e2", version: null, company: null,
        error: `E2 adapter error: ${err.message}`, latency_ms: 0,
        capabilities: this.capabilities,
      };
    }
  }

  async importWorkOrder(config: ERPConnectionConfig, woId: string) {
    try {
      const { e2ShopConnectorEngine } = await import("./E2ShopConnectorEngine.js");
      const result = await e2ShopConnectorEngine.importWorkOrder(
        { base_url: config.base_url ?? "", api_key: config.api_key ?? "", timeout_ms: config.timeout_ms, company_id: config.company_id },
        woId,
      );
      if (!result.work_order) return { work_order: null, warnings: result.warnings, error: result.error };
      const wo = result.work_order;
      const unified: UnifiedWorkOrder = {
        id: wo.id, part_number: wo.part_number, part_description: wo.part_description,
        quantity: wo.quantity, completed_qty: wo.completed_qty, scrap_qty: wo.scrap_qty,
        status: wo.status, due_date: wo.due_date, start_date: wo.start_date,
        customer_id: wo.customer_id, customer_name: wo.customer_name,
        material: wo.material, material_iso_group: wo.material_iso_group,
        routing: wo.routing, notes: wo.notes, source: "e2",
        source_id: wo.e2_work_order_no,
      };
      return { work_order: unified, warnings: result.warnings, error: null };
    } catch (err: any) {
      return { work_order: null, warnings: [], error: `E2 import error: ${err.message}` };
    }
  }

  async importBatch(config: ERPConnectionConfig, filter: { status?: string; date_from?: string; date_to?: string; limit?: number }) {
    try {
      const { e2ShopConnectorEngine } = await import("./E2ShopConnectorEngine.js");
      const result = await e2ShopConnectorEngine.importBatch(
        { base_url: config.base_url ?? "", api_key: config.api_key ?? "", timeout_ms: config.timeout_ms, company_id: config.company_id },
        { status: filter.status as any, from_date: filter.date_from, to_date: filter.date_to, limit: filter.limit },
      );
      const orders: UnifiedWorkOrder[] = (result.work_orders ?? []).map((wo: any) => ({
        ...wo, source: "e2" as const, source_id: wo.e2_work_order_no ?? wo.id,
      }));
      return { work_orders: orders, total_available: result.total_found ?? orders.length, warnings: result.warnings ?? [], error: result.error ?? null };
    } catch (err: any) {
      return { work_orders: [], total_available: 0, warnings: [], error: `E2 batch error: ${err.message}` };
    }
  }

  async exportPlan(config: ERPConnectionConfig, plan: UnifiedExportPlan) {
    try {
      const { e2ShopConnectorEngine } = await import("./E2ShopConnectorEngine.js");
      const result = await e2ShopConnectorEngine.exportPlan(
        { base_url: config.base_url ?? "", api_key: config.api_key ?? "", timeout_ms: config.timeout_ms, company_id: config.company_id },
        { work_order_no: plan.work_order_id, optimized_steps: plan.steps.map(s => ({ step_no: s.step, setup_min: s.setup_time_min, run_min_per_part: s.run_time_per_part_min, tools: s.tools, notes: s.notes })) },
      );
      return { success: result.success ?? false, updated_steps: result.steps_updated ?? 0, error: result.error ?? null };
    } catch (err: any) {
      return { success: false, updated_steps: 0, error: `E2 export error: ${err.message}` };
    }
  }

  async syncInventory(config: ERPConnectionConfig) {
    try {
      const { e2ShopConnectorEngine } = await import("./E2ShopConnectorEngine.js");
      const result = await e2ShopConnectorEngine.syncInventory(
        { base_url: config.base_url ?? "", api_key: config.api_key ?? "", timeout_ms: config.timeout_ms, company_id: config.company_id },
      );
      const items: UnifiedToolInventory[] = (result.tools ?? []).map((item: any) => ({
        ...item, source: "e2" as const,
      }));
      return { items, total: items.length, error: result.error ?? null };
    } catch (err: any) {
      return { items: [], total: 0, error: `E2 inventory error: ${err.message}` };
    }
  }
}

// ============================================================================
// EPICOR KINETIC ADAPTER
// ============================================================================

/**
 * Epicor Kinetic REST v2 (OData) adapter.
 * Reference: Epicor Kinetic REST API — /api/v2/odata/Erp.BO.JobEntrySvc
 * Jobs = work orders, JobOper = routing steps, JobMtl = materials
 */
class EpicorKineticAdapter implements IERPConnector {
  readonly system: ERPSystemType = "epicor_kinetic";
  readonly displayName = "Epicor Kinetic";
  readonly capabilities: ERPCapability[] = [
    "import_wo", "import_batch", "export_plan", "sync_inventory", "quality_import",
  ];

  private async _request<T>(config: ERPConnectionConfig, endpoint: string, method = "GET", body?: unknown): Promise<{ ok: boolean; data: T | null; error: string | null }> {
    const baseUrl = (config.base_url ?? "").replace(/\/+$/, "");
    const url = `${baseUrl}/api/v2/odata/${endpoint}`;
    const timeout = config.timeout_ms ?? 30000;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const headers: Record<string, string> = {
        "Authorization": `Basic ${Buffer.from(`${config.username ?? ""}:${config.password ?? ""}`).toString("base64")}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": config.api_key ?? "",
      };
      if (config.company_id) headers["CallSettings"] = JSON.stringify({ Company: config.company_id });

      const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return { ok: false, data: null, error: `Epicor API ${resp.status}: ${text.slice(0, 200)}` };
      }
      const json = await resp.json() as T;
      return { ok: true, data: json, error: null };
    } catch (err: any) {
      if (err.name === "AbortError") return { ok: false, data: null, error: `Epicor API timeout after ${timeout}ms` };
      return { ok: false, data: null, error: `Epicor API error: ${err.message}` };
    }
  }

  async connect(config: ERPConnectionConfig): Promise<ConnectResult> {
    const start = Date.now();
    const resp = await this._request<{ value: any[] }>(config, "Erp.BO.CompanySvc/Companies?$top=1");
    const latency = Date.now() - start;
    if (!resp.ok) {
      return { connected: false, system: "epicor_kinetic", version: null, company: null, error: resp.error, latency_ms: latency, capabilities: this.capabilities };
    }
    const company = resp.data?.value?.[0]?.Company ?? config.company_id ?? "unknown";
    return { connected: true, system: "epicor_kinetic", version: "Kinetic 2023+", company, error: null, latency_ms: latency, capabilities: this.capabilities };
  }

  async importWorkOrder(config: ERPConnectionConfig, woId: string) {
    const resp = await this._request<{ value: any[] }>(config,
      `Erp.BO.JobEntrySvc/JobHeads?$filter=JobNum eq '${woId}'&$expand=JobOpers,JobMtls`);
    if (!resp.ok) return { work_order: null, warnings: [], error: resp.error };
    const jobs = resp.data?.value ?? [];
    if (jobs.length === 0) return { work_order: null, warnings: [], error: `Job ${woId} not found in Epicor` };

    const job = jobs[0];
    const warnings: string[] = [];
    const mat = resolveERPMaterial(job.PartDescription ?? job.IUM ?? "unknown");
    if (!mat.iso_group) warnings.push(`Material "${job.PartDescription}" could not be resolved to ISO group`);

    const statusMap: Record<string, UnifiedWorkOrder["status"]> = {
      "Engineered": "open", "Released": "open", "Unfirm": "open",
      "Firm": "in_process", "Started": "in_process",
      "Complete": "complete", "Closed": "closed",
    };

    const routing: UnifiedRoutingStep[] = (job.JobOpers ?? []).map((op: any) => ({
      step: op.OprSeq ?? 0,
      work_center: op.WCCode ?? "",
      operation: op.OpCode ?? "",
      description: op.OpDesc ?? "",
      setup_time_min: (op.SetupHours ?? 0) * 60,
      run_time_per_part_min: (op.ProdHours ?? 0) * 60 / Math.max(job.ProdQty ?? 1, 1),
      tool_list: op.ToolList ? String(op.ToolList).split(",").map((s: string) => s.trim()) : [],
      completed_qty: op.QtyCompleted ?? 0,
      status: op.OpComplete ? "complete" as const : "pending" as const,
    }));

    const wo: UnifiedWorkOrder = {
      id: `EPICOR-${job.JobNum}`,
      part_number: job.PartNum ?? "",
      part_description: job.PartDescription ?? "",
      quantity: job.ProdQty ?? 0,
      completed_qty: job.QtyCompleted ?? 0,
      scrap_qty: job.ScrapQty ?? 0,
      status: statusMap[job.JobStatus] ?? "open",
      due_date: job.ReqDueDate ?? job.DueDate ?? "",
      start_date: job.StartDate ?? "",
      customer_id: job.CustNum?.toString() ?? "",
      customer_name: job.CustomerName ?? "",
      material: mat.prism_key,
      material_iso_group: mat.iso_group,
      routing,
      notes: job.CommentText ?? "",
      source: "epicor_kinetic",
      source_id: job.JobNum,
    };

    return { work_order: wo, warnings, error: null };
  }

  async importBatch(config: ERPConnectionConfig, filter: { status?: string; date_from?: string; date_to?: string; limit?: number }) {
    const filters: string[] = [];
    if (filter.status) filters.push(`JobStatus eq '${filter.status}'`);
    if (filter.date_from) filters.push(`ReqDueDate ge ${filter.date_from}`);
    if (filter.date_to) filters.push(`ReqDueDate le ${filter.date_to}`);
    const filterStr = filters.length > 0 ? `&$filter=${filters.join(" and ")}` : "";
    const top = filter.limit ? `&$top=${filter.limit}` : "&$top=100";

    const resp = await this._request<{ value: any[]; "@odata.count"?: number }>(config,
      `Erp.BO.JobEntrySvc/JobHeads?$expand=JobOpers${filterStr}${top}&$count=true`);
    if (!resp.ok) return { work_orders: [], total_available: 0, warnings: [], error: resp.error };

    const warnings: string[] = [];
    const work_orders: UnifiedWorkOrder[] = [];
    for (const job of (resp.data?.value ?? [])) {
      const single = await this.importWorkOrder(config, job.JobNum);
      if (single.work_order) work_orders.push(single.work_order);
      warnings.push(...single.warnings);
    }

    return { work_orders, total_available: resp.data?.["@odata.count"] ?? work_orders.length, warnings, error: null };
  }

  async exportPlan(config: ERPConnectionConfig, plan: UnifiedExportPlan) {
    let updated = 0;
    for (const step of plan.steps) {
      const body = { OprSeq: step.step, SetupHours: step.setup_time_min / 60, ProdHours: step.run_time_per_part_min / 60, CommentText: step.notes };
      const resp = await this._request(config,
        `Erp.BO.JobEntrySvc/JobOpers('${plan.work_order_id}',${step.step})`, "PATCH", body);
      if (resp.ok) updated++;
    }
    return { success: updated > 0, updated_steps: updated, error: updated === 0 ? "No steps updated" : null };
  }

  async syncInventory(config: ERPConnectionConfig) {
    const resp = await this._request<{ value: any[] }>(config,
      "Erp.BO.WhseBinSvc/WhseBins?$top=500&$select=BinNum,Description,OnhandQty,PartNum,WarehouseCode");
    if (!resp.ok) return { items: [], total: 0, error: resp.error };

    const items: UnifiedToolInventory[] = (resp.data?.value ?? []).map((bin: any) => ({
      id: `EPICOR-${bin.BinNum}`,
      description: bin.Description ?? "",
      location: `${bin.WarehouseCode ?? ""}-${bin.BinNum ?? ""}`,
      qty_on_hand: bin.OnhandQty ?? 0,
      qty_reserved: 0,
      qty_available: bin.OnhandQty ?? 0,
      reorder_point: 0,
      unit_cost_usd: 0,
      last_used: "",
      tool_type: "",
      diameter_mm: null,
      material: null,
      source: "epicor_kinetic" as const,
    }));

    return { items, total: items.length, error: null };
  }
}

// ============================================================================
// PROSHOP ADAPTER
// ============================================================================

/**
 * ProShop ERP adapter (cloud-based, CNC-shop focused).
 * Reference: ProShop REST API — OAuth2 bearer token auth.
 * Work orders, quality management, document control integrated.
 */
class ProShopAdapter implements IERPConnector {
  readonly system: ERPSystemType = "proshop";
  readonly displayName = "ProShop ERP";
  readonly capabilities: ERPCapability[] = [
    "import_wo", "import_batch", "export_plan", "sync_inventory", "quality_import",
  ];

  private async _request<T>(config: ERPConnectionConfig, endpoint: string, method = "GET", body?: unknown): Promise<{ ok: boolean; data: T | null; error: string | null }> {
    const baseUrl = (config.base_url ?? "").replace(/\/+$/, "");
    const url = `${baseUrl}/api/v1/${endpoint}`;
    const timeout = config.timeout_ms ?? 30000;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${config.api_key ?? ""}`,
        "Content-Type": "application/json",
      };

      const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return { ok: false, data: null, error: `ProShop API ${resp.status}: ${text.slice(0, 200)}` };
      }
      return { ok: true, data: await resp.json() as T, error: null };
    } catch (err: any) {
      if (err.name === "AbortError") return { ok: false, data: null, error: `ProShop API timeout after ${timeout}ms` };
      return { ok: false, data: null, error: `ProShop API error: ${err.message}` };
    }
  }

  async connect(config: ERPConnectionConfig): Promise<ConnectResult> {
    const start = Date.now();
    const resp = await this._request<{ version: string; company: string }>(config, "system/info");
    const latency = Date.now() - start;
    if (!resp.ok) return { connected: false, system: "proshop", version: null, company: null, error: resp.error, latency_ms: latency, capabilities: this.capabilities };
    return { connected: true, system: "proshop", version: resp.data?.version ?? "unknown", company: resp.data?.company ?? config.company_id ?? "unknown", error: null, latency_ms: latency, capabilities: this.capabilities };
  }

  async importWorkOrder(config: ERPConnectionConfig, woId: string) {
    const resp = await this._request<any>(config, `work-orders/${encodeURIComponent(woId)}?include=routing`);
    if (!resp.ok) return { work_order: null, warnings: [], error: resp.error };

    const job = resp.data;
    const warnings: string[] = [];
    const mat = resolveERPMaterial(job?.material ?? "unknown");
    if (!mat.iso_group) warnings.push(`Material "${job?.material}" could not be resolved to ISO group`);

    const statusMap: Record<string, UnifiedWorkOrder["status"]> = {
      "Quote": "open", "Order": "open", "Planning": "open",
      "In Production": "in_process", "Active": "in_process",
      "Complete": "complete", "Shipped": "closed", "Closed": "closed",
    };

    const routing: UnifiedRoutingStep[] = (job?.routing ?? []).map((op: any, idx: number) => ({
      step: op.step_number ?? idx + 1,
      work_center: op.work_center ?? "",
      operation: op.operation_code ?? "",
      description: op.description ?? "",
      setup_time_min: op.setup_minutes ?? 0,
      run_time_per_part_min: op.run_minutes_per_part ?? 0,
      tool_list: op.tools ? String(op.tools).split(",").map((s: string) => s.trim()) : [],
      completed_qty: op.completed_qty ?? 0,
      status: op.status === "Complete" ? "complete" as const : op.status === "Active" ? "in_process" as const : "pending" as const,
    }));

    const wo: UnifiedWorkOrder = {
      id: `PROSHOP-${job?.wo_number ?? woId}`,
      part_number: job?.part_number ?? "",
      part_description: job?.part_description ?? "",
      quantity: job?.qty_ordered ?? 0,
      completed_qty: job?.qty_completed ?? 0,
      scrap_qty: job?.qty_scrapped ?? 0,
      status: statusMap[job?.status] ?? "open",
      due_date: job?.due_date ?? "",
      start_date: job?.start_date ?? "",
      customer_id: job?.customer_id ?? "",
      customer_name: job?.customer_name ?? "",
      material: mat.prism_key,
      material_iso_group: mat.iso_group,
      routing,
      notes: job?.notes ?? "",
      source: "proshop",
      source_id: job?.wo_number ?? woId,
    };

    return { work_order: wo, warnings, error: null };
  }

  async importBatch(config: ERPConnectionConfig, filter: { status?: string; date_from?: string; date_to?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.date_from) params.set("due_after", filter.date_from);
    if (filter.date_to) params.set("due_before", filter.date_to);
    if (filter.limit) params.set("limit", String(filter.limit));

    const resp = await this._request<{ work_orders: any[]; total: number }>(config, `work-orders?${params.toString()}`);
    if (!resp.ok) return { work_orders: [], total_available: 0, warnings: [], error: resp.error };

    const warnings: string[] = [];
    const work_orders: UnifiedWorkOrder[] = [];
    for (const job of (resp.data?.work_orders ?? [])) {
      const single = await this.importWorkOrder(config, job.wo_number ?? job.id);
      if (single.work_order) work_orders.push(single.work_order);
      warnings.push(...single.warnings);
    }

    return { work_orders, total_available: resp.data?.total ?? work_orders.length, warnings, error: null };
  }

  async exportPlan(config: ERPConnectionConfig, plan: UnifiedExportPlan) {
    const body = {
      wo_number: plan.work_order_id,
      routing_updates: plan.steps.map(s => ({
        step_number: s.step,
        setup_minutes: s.setup_time_min,
        run_minutes_per_part: s.run_time_per_part_min,
        tools: s.tools,
        notes: s.notes,
      })),
    };

    const resp = await this._request(config, `work-orders/${encodeURIComponent(plan.work_order_id)}/routing`, "PUT", body);
    return { success: resp.ok, updated_steps: resp.ok ? plan.steps.length : 0, error: resp.error };
  }

  async syncInventory(config: ERPConnectionConfig) {
    const resp = await this._request<{ tools: any[]; total: number }>(config, "inventory/tools?limit=500");
    if (!resp.ok) return { items: [], total: 0, error: resp.error };

    const items: UnifiedToolInventory[] = (resp.data?.tools ?? []).map((t: any) => ({
      id: `PROSHOP-${t.tool_id ?? t.id}`,
      description: t.description ?? "",
      location: t.location ?? "",
      qty_on_hand: t.qty_on_hand ?? 0,
      qty_reserved: t.qty_reserved ?? 0,
      qty_available: t.qty_available ?? t.qty_on_hand ?? 0,
      reorder_point: t.reorder_point ?? 0,
      unit_cost_usd: t.unit_cost ?? 0,
      last_used: t.last_used ?? "",
      tool_type: t.tool_type ?? "",
      diameter_mm: t.diameter_mm ?? null,
      material: t.material ?? null,
      source: "proshop" as const,
    }));

    return { items, total: resp.data?.total ?? items.length, error: null };
  }
}

// ============================================================================
// GENERIC CSV ADAPTER
// ============================================================================

const DEFAULT_CSV_MAPPING: CSVColumnMapping = {
  wo_number: "WO#",
  part_number: "Part#",
  part_description: "Description",
  quantity: "Qty",
  material: "Material",
  due_date: "DueDate",
  status: "Status",
  customer: "Customer",
  step_number: "Step",
  operation: "Operation",
  work_center: "WorkCenter",
  setup_hours: "SetupHrs",
  run_hours_per_part: "RunHrsPerPart",
  delimiter: ",",
  date_format: "YYYY-MM-DD",
  encoding: "utf-8",
};

/**
 * Generic CSV adapter for shops without REST APIs.
 * Parses CSV data from a string or file path.
 * Reference: RFC 4180 (CSV format)
 */
class GenericCSVAdapter implements IERPConnector {
  readonly system: ERPSystemType = "generic_csv";
  readonly displayName = "Generic CSV Import/Export";
  readonly capabilities: ERPCapability[] = ["import_wo", "import_batch"];

  /** Parse CSV string into rows of key-value pairs */
  private _parseCSV(data: string, delimiter: string): Record<string, string>[] {
    const lines = data.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = this._splitCSVLine(lines[0], delimiter);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this._splitCSVLine(lines[i], delimiter);
      if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h.trim()] = (values[idx] ?? "").trim(); });
      rows.push(row);
    }

    return rows;
  }

  /** Split a CSV line respecting quoted fields */
  private _splitCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /** Read CSV source: if it looks like CSV data (has newlines), parse directly; otherwise try file read */
  private async _readCSVSource(config: ERPConnectionConfig): Promise<{ data: string | null; error: string | null }> {
    const source = config.csv_source ?? "";
    if (!source) return { data: null, error: "csv_source is required — provide CSV data string or file path" };

    // If source contains newlines, treat as inline CSV data
    if (source.includes("\n")) return { data: source, error: null };

    // Otherwise attempt file read
    try {
      const fs = await import("fs");
      const encoding = (config.csv_mapping?.encoding ?? "utf-8") as BufferEncoding;
      const data = fs.readFileSync(source, { encoding });
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: `Failed to read CSV file: ${err.message}` };
    }
  }

  async connect(config: ERPConnectionConfig): Promise<ConnectResult> {
    const start = Date.now();
    const { data, error } = await this._readCSVSource(config);
    const latency = Date.now() - start;

    if (error) return { connected: false, system: "generic_csv", version: null, company: null, error, latency_ms: latency, capabilities: this.capabilities };

    const mapping = { ...DEFAULT_CSV_MAPPING, ...config.csv_mapping };
    const rows = this._parseCSV(data!, mapping.delimiter);

    return {
      connected: true, system: "generic_csv",
      version: "CSV/RFC4180",
      company: config.company_id ?? "local",
      error: null, latency_ms: latency,
      capabilities: this.capabilities,
    };
  }

  async importWorkOrder(config: ERPConnectionConfig, woId: string) {
    const { data, error } = await this._readCSVSource(config);
    if (error) return { work_order: null, warnings: [], error };

    const mapping = { ...DEFAULT_CSV_MAPPING, ...config.csv_mapping };
    const rows = this._parseCSV(data!, mapping.delimiter);
    const woRows = rows.filter(r => r[mapping.wo_number] === woId);

    if (woRows.length === 0) return { work_order: null, warnings: [], error: `WO ${woId} not found in CSV data` };

    const first = woRows[0];
    const warnings: string[] = [];
    const mat = resolveERPMaterial(first[mapping.material] ?? "unknown");
    if (!mat.iso_group) warnings.push(`Material "${first[mapping.material]}" could not be resolved to ISO group`);

    const statusMap: Record<string, UnifiedWorkOrder["status"]> = {
      "open": "open", "Open": "open",
      "in process": "in_process", "In Process": "in_process", "active": "in_process",
      "complete": "complete", "Complete": "complete", "done": "complete",
      "closed": "closed", "Closed": "closed",
      "hold": "hold", "Hold": "hold",
    };

    const routing: UnifiedRoutingStep[] = woRows
      .filter(r => r[mapping.step_number])
      .map((r, idx) => ({
        step: parseInt(r[mapping.step_number], 10) || (idx + 1),
        work_center: r[mapping.work_center] ?? "",
        operation: r[mapping.operation] ?? "",
        description: r[mapping.operation] ?? "",
        setup_time_min: (parseFloat(r[mapping.setup_hours]) || 0) * 60,
        run_time_per_part_min: (parseFloat(r[mapping.run_hours_per_part]) || 0) * 60,
        tool_list: [],
        completed_qty: 0,
        status: "pending" as const,
      }));

    const wo: UnifiedWorkOrder = {
      id: `CSV-${woId}`,
      part_number: first[mapping.part_number] ?? "",
      part_description: first[mapping.part_description] ?? "",
      quantity: parseInt(first[mapping.quantity], 10) || 0,
      completed_qty: 0,
      scrap_qty: 0,
      status: statusMap[first[mapping.status]] ?? "open",
      due_date: first[mapping.due_date] ?? "",
      start_date: "",
      customer_id: "",
      customer_name: first[mapping.customer] ?? "",
      material: mat.prism_key,
      material_iso_group: mat.iso_group,
      routing,
      notes: "",
      source: "generic_csv",
      source_id: woId,
    };

    return { work_order: wo, warnings, error: null };
  }

  async importBatch(config: ERPConnectionConfig, filter: { status?: string; date_from?: string; date_to?: string; limit?: number }) {
    const { data, error } = await this._readCSVSource(config);
    if (error) return { work_orders: [], total_available: 0, warnings: [], error };

    const mapping = { ...DEFAULT_CSV_MAPPING, ...config.csv_mapping };
    const rows = this._parseCSV(data!, mapping.delimiter);

    // Group by WO number
    const woGroups = new Map<string, Record<string, string>[]>();
    for (const row of rows) {
      const woNum = row[mapping.wo_number];
      if (!woNum) continue;
      if (!woGroups.has(woNum)) woGroups.set(woNum, []);
      woGroups.get(woNum)!.push(row);
    }

    const warnings: string[] = [];
    const work_orders: UnifiedWorkOrder[] = [];
    let count = 0;
    const limit = filter.limit ?? 100;

    for (const woNum of woGroups.keys()) {
      if (count >= limit) break;
      const single = await this.importWorkOrder(config, woNum);
      if (single.work_order) {
        // Apply status filter
        if (filter.status && single.work_order.status !== filter.status) continue;
        work_orders.push(single.work_order);
        count++;
      }
      warnings.push(...single.warnings);
    }

    return { work_orders, total_available: woGroups.size, warnings, error: null };
  }

  async exportPlan(_config: ERPConnectionConfig, _plan: UnifiedExportPlan) {
    return { success: false, updated_steps: 0, error: "CSV adapter does not support export — use API-based ERP connector" };
  }

  async syncInventory(_config: ERPConnectionConfig) {
    return { items: [], total: 0, error: "CSV adapter does not support inventory sync — use API-based ERP connector" };
  }
}

// ============================================================================
// MULTI-ERP CONNECTOR ENGINE
// ============================================================================

/** Registered connector state */
interface RegisteredSystem {
  connector: IERPConnector;
  config: ERPConnectionConfig;
  last_connect: string | null;
  last_status: "connected" | "disconnected" | "error" | "untested";
  last_error: string | null;
}

/**
 * MultiERPConnectorEngine — routes operations to the correct ERP adapter.
 * Manages connector registration, health checks, and unified operations.
 */
class MultiERPConnectorEngine {
  readonly name = "MultiERPConnectorEngine";

  /** Built-in adapter instances */
  private readonly _adapters = new Map<ERPSystemType, IERPConnector>([
    ["e2", new E2Adapter()],
    ["epicor_kinetic", new EpicorKineticAdapter()],
    ["proshop", new ProShopAdapter()],
    ["generic_csv", new GenericCSVAdapter()],
  ]);

  /** Registered (configured) systems */
  private readonly _registered: Map<string, RegisteredSystem> = new Map();

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register an ERP system for use. Each registration gets a unique alias
   * (e.g., "production_e2", "quality_proshop") so shops can connect multiple
   * instances of the same ERP type.
   */
  register(alias: string, config: ERPConnectionConfig): {
    registered: boolean;
    alias: string;
    system: ERPSystemType;
    capabilities: ERPCapability[];
    error: string | null;
  } {
    const adapter = this._adapters.get(config.system);
    if (!adapter) {
      return {
        registered: false, alias, system: config.system,
        capabilities: [],
        error: `Unsupported ERP system: "${config.system}". Supported: ${[...this._adapters.keys()].join(", ")}`,
      };
    }

    this._registered.set(alias, {
      connector: adapter,
      config,
      last_connect: null,
      last_status: "untested",
      last_error: null,
    });

    return {
      registered: true, alias, system: config.system,
      capabilities: adapter.capabilities, error: null,
    };
  }

  /** Unregister an ERP system */
  unregister(alias: string): boolean {
    return this._registered.delete(alias);
  }

  // ── Connection ────────────────────────────────────────────────────────────

  /**
   * multi_erp_connect — Test connection to a registered ERP system.
   */
  async connect(params: {
    alias?: string;
    system?: ERPSystemType;
    config?: ERPConnectionConfig;
  }): Promise<ConnectResult> {
    // If alias provided, use registered system
    if (params.alias) {
      const reg = this._registered.get(params.alias);
      if (!reg) return { connected: false, system: "e2", version: null, company: null, error: `No system registered with alias "${params.alias}"`, latency_ms: 0, capabilities: [] };

      const result = await reg.connector.connect(reg.config);
      reg.last_connect = new Date().toISOString();
      reg.last_status = result.connected ? "connected" : "error";
      reg.last_error = result.error;
      return result;
    }

    // Ad-hoc connection with inline config
    const config = params.config;
    if (!config) return { connected: false, system: "e2", version: null, company: null, error: "Either alias or config is required", latency_ms: 0, capabilities: [] };

    const adapter = this._adapters.get(config.system);
    if (!adapter) return { connected: false, system: config.system, version: null, company: null, error: `Unsupported system: ${config.system}`, latency_ms: 0, capabilities: [] };

    return adapter.connect(config);
  }

  // ── Import ────────────────────────────────────────────────────────────────

  /**
   * multi_erp_import_wo — Import work order(s) from any registered ERP.
   */
  async importWorkOrder(params: {
    alias?: string;
    system?: ERPSystemType;
    config?: ERPConnectionConfig;
    wo_id?: string;
    filter?: { status?: string; date_from?: string; date_to?: string; limit?: number };
  }): Promise<{
    work_orders: UnifiedWorkOrder[];
    total_available: number;
    warnings: string[];
    error: string | null;
    source_system: ERPSystemType;
  }> {
    const { connector, cfg, error } = this._resolve(params);
    if (error) return { work_orders: [], total_available: 0, warnings: [], error, source_system: params.system ?? "e2" };

    // Single WO import
    if (params.wo_id) {
      const result = await connector!.importWorkOrder(cfg!, params.wo_id);
      return {
        work_orders: result.work_order ? [result.work_order] : [],
        total_available: result.work_order ? 1 : 0,
        warnings: result.warnings, error: result.error,
        source_system: connector!.system,
      };
    }

    // Batch import
    const result = await connector!.importBatch(cfg!, params.filter ?? {});
    return { ...result, source_system: connector!.system };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  /**
   * multi_erp_export_plan — Push PRISM-optimized routing back to ERP.
   */
  async exportPlan(params: {
    alias?: string;
    system?: ERPSystemType;
    config?: ERPConnectionConfig;
    plan: UnifiedExportPlan;
  }): Promise<{ success: boolean; updated_steps: number; error: string | null; source_system: ERPSystemType }> {
    const { connector, cfg, error } = this._resolve(params);
    if (error) return { success: false, updated_steps: 0, error, source_system: params.system ?? "e2" };

    if (!connector!.capabilities.includes("export_plan")) {
      return { success: false, updated_steps: 0, error: `${connector!.displayName} does not support plan export`, source_system: connector!.system };
    }

    const result = await connector!.exportPlan(cfg!, params.plan);
    return { ...result, source_system: connector!.system };
  }

  // ── Inventory Sync ────────────────────────────────────────────────────────

  /**
   * multi_erp_sync_inventory — Pull tool inventory from ERP.
   */
  async syncInventory(params: {
    alias?: string;
    system?: ERPSystemType;
    config?: ERPConnectionConfig;
  }): Promise<{ items: UnifiedToolInventory[]; total: number; error: string | null; source_system: ERPSystemType }> {
    const { connector, cfg, error } = this._resolve(params);
    if (error) return { items: [], total: 0, error, source_system: params.system ?? "e2" };

    if (!connector!.capabilities.includes("sync_inventory")) {
      return { items: [], total: 0, error: `${connector!.displayName} does not support inventory sync`, source_system: connector!.system };
    }

    const result = await connector!.syncInventory(cfg!);
    return { ...result, source_system: connector!.system };
  }

  // ── Status ────────────────────────────────────────────────────────────────

  /**
   * multi_erp_status — Health and sync status for all registered ERPs.
   */
  status(): {
    registered_count: number;
    systems: Array<{
      alias: string;
      system: ERPSystemType;
      display_name: string;
      status: RegisteredSystem["last_status"];
      last_connect: string | null;
      last_error: string | null;
      capabilities: ERPCapability[];
    }>;
  } {
    const systems = [...this._registered.entries()].map(([alias, reg]) => ({
      alias,
      system: reg.connector.system,
      display_name: reg.connector.displayName,
      status: reg.last_status,
      last_connect: reg.last_connect,
      last_error: reg.last_error,
      capabilities: reg.connector.capabilities,
    }));

    return { registered_count: systems.length, systems };
  }

  // ── List Supported Systems ────────────────────────────────────────────────

  /**
   * multi_erp_list_systems — List all supported ERP systems with capabilities.
   */
  listSystems(): Array<{
    system: ERPSystemType;
    display_name: string;
    capabilities: ERPCapability[];
    auth_method: string;
    api_style: string;
  }> {
    return [
      {
        system: "e2", display_name: "E2 Shop System",
        capabilities: ["import_wo", "import_batch", "export_plan", "sync_inventory", "time_tracking", "bidirectional_sync"],
        auth_method: "API key (Bearer token)", api_style: "REST JSON",
      },
      {
        system: "epicor_kinetic", display_name: "Epicor Kinetic",
        capabilities: ["import_wo", "import_batch", "export_plan", "sync_inventory", "quality_import"],
        auth_method: "Basic auth + API key", api_style: "OData v4 REST",
      },
      {
        system: "proshop", display_name: "ProShop ERP",
        capabilities: ["import_wo", "import_batch", "export_plan", "sync_inventory", "quality_import"],
        auth_method: "OAuth2 Bearer token", api_style: "REST JSON",
      },
      {
        system: "generic_csv", display_name: "Generic CSV Import/Export",
        capabilities: ["import_wo", "import_batch"],
        auth_method: "File system / inline data", api_style: "CSV (RFC 4180)",
      },
    ];
  }

  // ── Internal: resolve connector + config from params ──────────────────────

  private _resolve(params: { alias?: string; system?: ERPSystemType; config?: ERPConnectionConfig }): {
    connector: IERPConnector | null;
    cfg: ERPConnectionConfig | null;
    error: string | null;
  } {
    if (params.alias) {
      const reg = this._registered.get(params.alias);
      if (!reg) return { connector: null, cfg: null, error: `No system registered with alias "${params.alias}"` };
      return { connector: reg.connector, cfg: reg.config, error: null };
    }

    const config = params.config;
    if (!config) return { connector: null, cfg: null, error: "Either alias (for registered system) or config (for ad-hoc) is required" };

    const adapter = this._adapters.get(config.system);
    if (!adapter) return { connector: null, cfg: null, error: `Unsupported ERP system: "${config.system}". Supported: ${[...this._adapters.keys()].join(", ")}` };

    return { connector: adapter, cfg: config, error: null };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const multiERPConnectorEngine = new MultiERPConnectorEngine();
export { MultiERPConnectorEngine, E2Adapter, EpicorKineticAdapter, ProShopAdapter, GenericCSVAdapter };
