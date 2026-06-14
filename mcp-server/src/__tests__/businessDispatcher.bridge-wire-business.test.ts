/**
 * BRIDGE-WIRING/U-BRIDGE-WIRE-BUSINESS — wire test (slot:hotel, 2026-05-20)
 *
 * Round-trips 6 actions through businessDispatcher's prism_business tool,
 * surfacing 3 previously-unwired Business engines:
 *
 *   EngineeringChangeOrderEngine  → eco_validate, eco_stats
 *   QdrantCapacityPlannerEngine   → qdrant_capacity_plan, qdrant_capacity_max_fraction
 *   ERPToolInventoryEngine        → erp_tool_search, erp_tool_reorder_alerts
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - ECO Class II required approvers = [engineering, quality]; Class I adds
 *     manufacturing + supply_chain; regulated_industry adds regulatory.
 *   - Qdrant per-vector bytes = vectorDim × bytesPerComponent (float32=4, int8=1);
 *     384-dim float32 + 256B payload + 128B overhead = 1920 B/point.
 *   - ERP seed inventory: DR-0312 (qtyOnHand 3 ≤ reorderPoint 4) is the ONLY
 *     tool below reorder point → exactly 1 alert, estimatedCost = 6 × 32.50 = 195.
 *
 * Each test invokes through the dispatcher handler, not the engine singleton —
 * verifies action-enum entry + Zod schema + case dispatch end-to-end.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

interface ToolCall {
  action: string;
  params?: Record<string, any>;
}

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: any,
      fn: (args: any) => Promise<any>,
    ) => {
      if (_name === "prism_business") handler = fn;
    },
  };
  registerBusinessDispatcher(fakeServer as any);
  if (!handler) throw new Error("businessDispatcher did not register prism_business tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r = await handler(c);
  // Shape A: { content: [{ type: "text", text: "<json>" }] }
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape B: { type: "text", text: "<json>" }  (slimResponse output direct)
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape C: raw { error: "..." } envelope from dispatcherError
  if (r && typeof r === "object" && "error" in r) {
    return { raw: r, success: false, error: (r as any).error };
  }
  return { raw: r, success: true };
}

const NOW_ISO = "2026-05-20T12:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);
const FUTURE = new Date(NOW_MS + 30 * 86400000).toISOString();
const PAST = new Date(NOW_MS - 30 * 86400000).toISOString();

/** A complete Class II ECO that should be ready_to_release. */
function cleanClassII(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: "ECO-1001",
    title: "Add chamfer to drawing 4500",
    change_class: "II",
    regulated_industry: false,
    reason: "DFM clarification — sharp edge flagged at inspection",
    impact: [
      { artifact_type: "drawing", artifact_id: "DWG-4500", current_rev: "A", new_rev: "B" },
    ],
    approvals: [
      { role: "engineering", approver: "J. Smith", approved_date: NOW_ISO },
      { role: "quality", approver: "R. Jones", approved_date: NOW_ISO },
    ],
    in_stock: [
      { part_number: "PN-4500", quantity: 12, disposition: "use_as_is" },
    ],
    effectivity_date: FUTURE,
    config_record_closed: true,
    ...overrides,
  };
}

// ───────────────────────────── eco_validate ─────────────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — eco_validate (EngineeringChangeOrderEngine)", () => {
  it("a clean Class II ECO is ready_to_release with no findings", async () => {
    const r = await call({
      action: "eco_validate",
      params: { record: cleanClassII(), now: NOW_ISO },
    });
    expect(r.success).toBe(true);
    expect(r.raw.eco_id).toBe("ECO-1001");
    expect(r.raw.change_class).toBe("II");
    expect(r.raw.required_approvers.sort()).toEqual(["engineering", "quality"]);
    expect(r.raw.missing_approvers).toEqual([]);
    expect(r.raw.unsigned_approvers).toEqual([]);
    expect(r.raw.effectivity_valid).toBe(true);
    expect(r.raw.findings).toEqual([]);
    expect(r.raw.ready_to_release).toBe(true);
  });

  it("a Class I ECO missing required approvers is NOT ready and flags criticals", async () => {
    const r = await call({
      action: "eco_validate",
      params: {
        record: cleanClassII({ id: "ECO-1002", change_class: "I" }),
        now: NOW_ISO,
      },
    });
    expect(r.success).toBe(true);
    // Class I default required = engineering, quality, manufacturing, supply_chain
    expect(r.raw.required_approvers.sort()).toEqual([
      "engineering", "manufacturing", "quality", "supply_chain",
    ]);
    expect(r.raw.missing_approvers.sort()).toEqual(["manufacturing", "supply_chain"]);
    expect(r.raw.ready_to_release).toBe(false);
    expect(r.raw.findings.some((f: any) => f.severity === "critical")).toBe(true);
  });

  it("an effectivity date in the past invalidates the ECO", async () => {
    const r = await call({
      action: "eco_validate",
      params: { record: cleanClassII({ id: "ECO-1003", effectivity_date: PAST }), now: NOW_ISO },
    });
    expect(r.success).toBe(true);
    expect(r.raw.effectivity_valid).toBe(false);
    expect(r.raw.ready_to_release).toBe(false);
    expect(r.raw.findings.some((f: any) => /past/i.test(f.message))).toBe(true);
  });

  it("regulated_industry adds 'regulatory' to the required approver set", async () => {
    const r = await call({
      action: "eco_validate",
      params: {
        record: cleanClassII({ id: "ECO-1004", regulated_industry: true }),
        now: NOW_ISO,
      },
    });
    expect(r.success).toBe(true);
    expect(r.raw.required_approvers).toContain("regulatory");
    // regulatory has no approval supplied → it is missing
    expect(r.raw.missing_approvers).toContain("regulatory");
  });

  it("an impact item with current_rev === new_rev raises a minor finding", async () => {
    const r = await call({
      action: "eco_validate",
      params: {
        record: cleanClassII({
          id: "ECO-1005",
          impact: [
            { artifact_type: "bom", artifact_id: "BOM-9", current_rev: "C", new_rev: "C" },
          ],
        }),
        now: NOW_ISO,
      },
    });
    expect(r.success).toBe(true);
    expect(r.raw.findings.some(
      (f: any) => f.severity === "minor" && /revision bump/i.test(f.message),
    )).toBe(true);
  });

  it("rejects params that are missing the required 'record' object", async () => {
    const r = await call({ action: "eco_validate", params: { now: NOW_ISO } });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/record|Invalid params/i);
  });
});

// ───────────────────────────── eco_stats ────────────────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — eco_stats", () => {
  it("returns the 6 approver roles, 5 dispositions, and the standards reference", async () => {
    const r = await call({ action: "eco_stats" });
    expect(r.success).toBe(true);
    expect(r.raw.approver_roles).toHaveLength(6);
    expect(r.raw.approver_roles).toContain("regulatory");
    expect(r.raw.dispositions).toHaveLength(5);
    expect(r.raw.dispositions).toContain("scrap");
    expect(r.raw.reference).toMatch(/EIA-649/);
  });
});

// ─────────────────────── qdrant_capacity_plan ───────────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — qdrant_capacity_plan (QdrantCapacityPlannerEngine)", () => {
  // 384-dim float32 → 1536 B vector; +256 payload +128 overhead = 1920 B/point.
  const COLLECTION = {
    existingPoints: 0,
    addingPoints: 1000,
    vectorDim: 384,
    precision: "float32",
    payloadAvgBytes: 256,
  };

  it("computes exact per-point byte breakdown for a 384-dim float32 collection", async () => {
    const r = await call({
      action: "qdrant_capacity_plan",
      params: { collection: COLLECTION, host: { diskFreeMB: 1_000_000, ramFreeMB: 1_000_000 } },
    });
    expect(r.success).toBe(true);
    expect(r.raw.breakdown.vectorBytesPerPoint).toBe(1536);
    expect(r.raw.breakdown.payloadBytesPerPoint).toBe(256);
    expect(r.raw.breakdown.overheadBytesPerPoint).toBe(128);
    expect(r.raw.breakdown.bytesPerPointTotal).toBe(1920);
    expect(r.raw.breakdown.totalPoints).toBe(1000);
    // 1920 × 1000 = 1,920,000 B → ceil(/1048576) = 2 MB
    expect(r.raw.breakdown.diskRequiredMB).toBe(2);
  });

  it("returns decision 'ok' when the host has ample headroom", async () => {
    const r = await call({
      action: "qdrant_capacity_plan",
      params: { collection: COLLECTION, host: { diskFreeMB: 1_000_000, ramFreeMB: 1_000_000 } },
    });
    expect(r.success).toBe(true);
    expect(r.raw.decision).toBe("ok");
    expect(r.raw.shortfallDiskMB).toBe(0);
    expect(r.raw.shortfallRamMB).toBe(0);
  });

  it("returns decision 'insufficient' with a positive shortfall when the host is too small", async () => {
    const r = await call({
      action: "qdrant_capacity_plan",
      params: { collection: COLLECTION, host: { diskFreeMB: 1, ramFreeMB: 1 } },
    });
    expect(r.success).toBe(true);
    expect(r.raw.decision).toBe("insufficient");
    expect(r.raw.shortfallDiskMB).toBeGreaterThan(0);
  });

  it("int8 precision uses 1 byte per vector component", async () => {
    const r = await call({
      action: "qdrant_capacity_plan",
      params: {
        collection: { ...COLLECTION, precision: "int8" },
        host: { diskFreeMB: 1_000_000, ramFreeMB: 1_000_000 },
      },
    });
    expect(r.success).toBe(true);
    // 384 dim × 1 byte = 384
    expect(r.raw.breakdown.vectorBytesPerPoint).toBe(384);
  });

  it("rejects a non-positive vectorDim via the Zod schema", async () => {
    const r = await call({
      action: "qdrant_capacity_plan",
      params: {
        collection: { ...COLLECTION, vectorDim: -5 },
        host: { diskFreeMB: 1000, ramFreeMB: 1000 },
      },
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/vectorDim|Invalid params/i);
  });
});

// ─────────────────── qdrant_capacity_max_fraction ───────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — qdrant_capacity_max_fraction", () => {
  const COLLECTION = {
    existingPoints: 0,
    addingPoints: 1_000_000,
    vectorDim: 384,
    precision: "float32",
    payloadAvgBytes: 256,
  };

  it("returns 1 when the full corpus fits within thresholds", async () => {
    const r = await call({
      action: "qdrant_capacity_max_fraction",
      params: {
        collection: COLLECTION,
        host: { diskFreeMB: 100_000_000, ramFreeMB: 100_000_000 },
      },
    });
    expect(r.success).toBe(true);
    expect(r.raw.maxIngestFraction).toBe(1);
  });

  it("returns a fraction in (0,1) when the full corpus is insufficient but a subset fits", async () => {
    // Full 1M-point corpus needs ~1832 MB disk; with only 2000 MB free the full
    // ingestion lands "insufficient" (headroom 168 < 512 tight floor), so the
    // binary search backs off to the largest non-insufficient fraction (~0.81).
    const r = await call({
      action: "qdrant_capacity_max_fraction",
      params: { collection: COLLECTION, host: { diskFreeMB: 2000, ramFreeMB: 5000 } },
    });
    expect(r.success).toBe(true);
    expect(r.raw.maxIngestFraction).toBeGreaterThan(0);
    expect(r.raw.maxIngestFraction).toBeLessThan(1);
  });

  it("returns 1 when there are no points to add", async () => {
    const r = await call({
      action: "qdrant_capacity_max_fraction",
      params: {
        collection: { ...COLLECTION, addingPoints: 0 },
        host: { diskFreeMB: 1, ramFreeMB: 1 },
      },
    });
    expect(r.success).toBe(true);
    expect(r.raw.maxIngestFraction).toBe(1);
  });
});

// ─────────────────────────── erp_tool_search ────────────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — erp_tool_search (ERPToolInventoryEngine)", () => {
  it("matches both carbide tools on a description keyword", async () => {
    const r = await call({ action: "erp_tool_search", params: { query: "carbide" } });
    expect(r.success).toBe(true);
    const ids = r.raw.tools.map((t: any) => t.toolId).sort();
    expect(ids).toEqual(["DR-0312", "EM-0500-4FL"]);
  });

  it("matches a single tool on a tool-id substring", async () => {
    const r = await call({ action: "erp_tool_search", params: { query: "EM" } });
    expect(r.success).toBe(true);
    expect(r.raw.tools).toHaveLength(1);
    expect(r.raw.tools[0].toolId).toBe("EM-0500-4FL");
  });

  it("applies the category filter after the text match", async () => {
    const r = await call({
      action: "erp_tool_search",
      params: { query: "insert", category: "insert" },
    });
    expect(r.success).toBe(true);
    expect(r.raw.tools).toHaveLength(1);
    expect(r.raw.tools[0].category).toBe("insert");
  });

  it("returns no tools when the category excludes every text match", async () => {
    const r = await call({
      action: "erp_tool_search",
      params: { query: "carbide", category: "insert" },
    });
    expect(r.success).toBe(true);
    expect(r.raw.tools).toEqual([]);
  });

  it("returns no tools for a query that matches nothing", async () => {
    const r = await call({ action: "erp_tool_search", params: { query: "titanium-coated-z9" } });
    expect(r.success).toBe(true);
    expect(r.raw.tools).toEqual([]);
  });
});

// ──────────────────────── erp_tool_reorder_alerts ───────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — erp_tool_reorder_alerts", () => {
  it("flags only the tool below its reorder point with the correct cost + urgency", async () => {
    const r = await call({ action: "erp_tool_reorder_alerts" });
    expect(r.success).toBe(true);
    // DR-0312: qtyOnHand 3 ≤ reorderPoint 4 → the only seeded tool below point.
    expect(r.raw.alerts).toHaveLength(1);
    const alert = r.raw.alerts[0];
    expect(alert.toolId).toBe("DR-0312");
    // estimatedCost = reorderQuantity(6) × unitCost(32.50) = 195
    expect(alert.estimatedCost).toBeCloseTo(195, 5);
    // qtyOnHand 3 is not 0 and not < reorderPoint×0.5 (2) → "suggested"
    expect(alert.urgency).toBe("suggested");
  });
});

// ──────────────────────────── anti-regression ───────────────────────────────

describe("U-BRIDGE-WIRE-BUSINESS — dispatcher integrity", () => {
  it("an unknown action still routes to the dispatcher default branch", async () => {
    const r = await call({ action: "eco_not_a_real_action" as any });
    // Either the MCP tool z.enum rejects it, or the switch default returns an error.
    expect(r.success).toBe(false);
  });
});
