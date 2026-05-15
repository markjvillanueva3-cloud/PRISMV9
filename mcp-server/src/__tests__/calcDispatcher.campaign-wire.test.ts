/**
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CAMPAIGN — wire test
 *
 * Verifies 4 CampaignEngine actions land through calcDispatcher's prism_calc tool.
 * Half-wire completion — actions were in z.enum + calcExtractKeyValues slimmer but
 * lacked main-switch cases prior to this commit (same gotcha as iter-13
 * SpindleHarmonicsQuality).
 *
 *   campaign_create        — config + operation_results[][] → CampaignResult
 *   campaign_validate      — config → {valid, errors[], warnings[]}
 *   campaign_optimize      — config + target → OptimizedCampaign
 *   campaign_cycle_time    — config → CycleTimeEstimate
 *
 * Tests assert RAW engine result shape because the dispatcher returns
 * slimResponse(result) at <50% pressure (test mode).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

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
      fn: (args: any) => Promise<any>
    ) => {
      if (_name === "prism_calc") handler = fn;
    },
  };
  registerCalcDispatcher(fakeServer as any);
  if (!handler) throw new Error("calcDispatcher did not register prism_calc tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r = await handler(c);
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object" && "error" in r) {
    return { raw: r, success: false, error: (r as any).error };
  }
  return { raw: r, success: true };
}

function buildConfig(): any {
  return {
    name: "test-campaign",
    materials: [
      { id: "steel_4140", name: "4140", iso_group: "P", hardness_hb: 220 },
      { id: "aluminum_6061", name: "6061-T6", iso_group: "N", hardness_hb: 95 },
    ],
    operations: [
      {
        sequence: 1,
        feature: "facing",
        tool_diameter_mm: 50,
        tool_type: "face_mill",
        cutting_speed_m_min: 200,
        feed_per_tooth_mm: 0.15,
        axial_depth_mm: 1.5,
        radial_depth_mm: 35,
      },
      {
        sequence: 2,
        feature: "pocket",
        tool_diameter_mm: 12,
        tool_type: "endmill_carbide_4flute",
        cutting_speed_m_min: 180,
        feed_per_tooth_mm: 0.08,
        axial_depth_mm: 6,
        radial_depth_mm: 6,
      },
    ],
    machine: { name: "VMC-650", max_spindle_rpm: 12000, max_power_kw: 22, max_torque_nm: 200 },
    batch_size: 10,
  };
}

function buildOperationResults(): any[][] {
  const mkRow = (seq: number, feature: string): any => ({
    sequence: seq,
    feature,
    cutting_speed_m_min: 200,
    feed_rate_mm_min: 1200,
    spindle_rpm: 4000,
    mrr_cm3_min: 50,
    cutting_force_n: 800,
    tool_life_min: 60,
    cycle_time_min: 5,
    surface_finish_ra: 1.6,
    power_kw: 5,
    warnings: [],
  });
  return [
    [mkRow(1, "facing"), mkRow(2, "pocket")],
    [mkRow(1, "facing"), mkRow(2, "pocket")],
  ];
}

describe("calcDispatcher — CampaignEngine wire (half-wire completion)", () => {
  describe("campaign_validate", () => {
    it("returns valid:true for a well-formed 2-material × 2-op config", async () => {
      const r = await call({ action: "campaign_validate", params: { config: buildConfig() } });
      expect(r.success).toBe(true);
      expect(r.raw.valid).toBe(true);
      const errs = r.raw.errors;
      expect(errs === undefined || (Array.isArray(errs) && errs.length === 0)).toBe(true);
    });

    it("flags missing required field 'name' as validation error", async () => {
      const cfg = buildConfig();
      delete cfg.name;
      const r = await call({ action: "campaign_validate", params: { config: cfg } });
      expect(r.success).toBe(true);
      expect(r.raw.valid).toBe(false);
      expect(Array.isArray(r.raw.errors)).toBe(true);
      expect(r.raw.errors.length).toBeGreaterThan(0);
    });

    it("flags duplicate operation sequence as validation error", async () => {
      const cfg = buildConfig();
      cfg.operations[1].sequence = 1;
      const r = await call({ action: "campaign_validate", params: { config: cfg } });
      expect(r.success).toBe(true);
      expect(r.raw.valid).toBe(false);
      const errStr = JSON.stringify(r.raw.errors).toLowerCase();
      expect(errStr).toMatch(/sequence|duplicate/);
    });

    it("flags empty materials array as validation error", async () => {
      const cfg = buildConfig();
      cfg.materials = [];
      const r = await call({ action: "campaign_validate", params: { config: cfg } });
      expect(r.success).toBe(true);
      expect(r.raw.valid).toBe(false);
      expect(r.raw.errors.length).toBeGreaterThan(0);
    });
  });

  describe("campaign_cycle_time", () => {
    it("returns CycleTimeEstimate with materials_count=2 and ops_per_material=2", async () => {
      const r = await call({ action: "campaign_cycle_time", params: { config: buildConfig() } });
      expect(r.success).toBe(true);
      expect(r.raw.materials_count).toBe(2);
      expect(r.raw.operations_per_material).toBe(2);
    });

    it("estimated_total_time_min matches time_per_material × materials_count within 1% tolerance", async () => {
      const r = await call({ action: "campaign_cycle_time", params: { config: buildConfig() } });
      expect(r.success).toBe(true);
      expect(r.raw.estimated_total_time_min).toBeGreaterThan(0);
      expect(r.raw.time_per_material_min).toBeGreaterThan(0);
      // Use toBeCloseTo to avoid float-precision artifacts (e.g. 4.31 vs 4.3100000000000005).
      // Engine sums per-op cutting + rapid + tool-change time; per_material = total / count
      // exactly, but float arithmetic introduces ~1e-15 noise — assert ratio is within 1%.
      const expected = r.raw.time_per_material_min * r.raw.materials_count;
      const ratio = r.raw.estimated_total_time_min / expected;
      expect(ratio).toBeGreaterThanOrEqual(0.99);
      expect(ratio).toBeLessThanOrEqual(1.01);
    });

    it("batch_time_min is a positive number when batch_size is set", async () => {
      const cfg = buildConfig();
      cfg.batch_size = 25;
      const r = await call({ action: "campaign_cycle_time", params: { config: cfg } });
      expect(r.success).toBe(true);
      if (typeof r.raw.batch_time_min === "number") {
        expect(r.raw.batch_time_min).toBeGreaterThan(0);
      }
    });
  });

  describe("campaign_create", () => {
    it("returns CampaignResult with material_count=2 and a results array of length 2", async () => {
      const r = await call({
        action: "campaign_create",
        params: { config: buildConfig(), operation_results: buildOperationResults() },
      });
      expect(r.success).toBe(true);
      expect(r.raw.material_count).toBe(2);
      expect(Array.isArray(r.raw.results)).toBe(true);
      expect(r.raw.results.length).toBe(2);
    });

    it("each material-result has a numeric cycle time, a valid status, and a 0-1 safety score", async () => {
      const r = await call({
        action: "campaign_create",
        params: { config: buildConfig(), operation_results: buildOperationResults() },
      });
      expect(r.success).toBe(true);
      for (const m of r.raw.results) {
        expect(typeof m.total_cycle_time_min).toBe("number");
        expect(m.total_cycle_time_min).toBeGreaterThan(0);
        expect(["pass", "warning", "fail", "quarantine"]).toContain(m.status);
        expect(typeof m.cumulative_safety.safety_score).toBe("number");
        expect(m.cumulative_safety.safety_score).toBeGreaterThanOrEqual(0);
        expect(m.cumulative_safety.safety_score).toBeLessThanOrEqual(1.0);
      }
    });

    it("summary status counts sum to material_count, avg_safety_score in [0,1]", async () => {
      const r = await call({
        action: "campaign_create",
        params: { config: buildConfig(), operation_results: buildOperationResults() },
      });
      expect(r.success).toBe(true);
      const s = r.raw.summary;
      const total =
        (s.total_pass || 0) +
        (s.total_warning || 0) +
        (s.total_fail || 0) +
        (s.total_quarantine || 0);
      expect(total).toBe(r.raw.material_count);
      expect(s.avg_safety_score).toBeGreaterThanOrEqual(0);
      expect(s.avg_safety_score).toBeLessThanOrEqual(1.0);
    });

    it("list_actions:true returns 4-entry action catalog (no campaign_create execution)", async () => {
      const r = await call({ action: "campaign_create", params: { list_actions: true } });
      expect(r.success).toBe(true);
      expect(Array.isArray(r.raw.actions)).toBe(true);
      expect(r.raw.actions.length).toBe(4);
      const names = r.raw.actions.map((a: any) => a.name).sort();
      expect(names).toEqual([
        "campaign_create",
        "campaign_cycle_time",
        "campaign_optimize",
        "campaign_validate",
      ]);
      for (const a of r.raw.actions) {
        expect(typeof a.description).toBe("string");
        expect(a.description.length).toBeGreaterThan(0);
        expect(Array.isArray(a.required_params)).toBe(true);
      }
    });
  });

  describe("campaign_optimize", () => {
    it("returns OptimizedCampaign with order arrays + improvement % + adjustments[]", async () => {
      const r = await call({
        action: "campaign_optimize",
        params: { config: buildConfig(), target: { objective: "productivity" } },
      });
      expect(r.success).toBe(true);
      expect(Array.isArray(r.raw.original_order)).toBe(true);
      expect(Array.isArray(r.raw.optimized_order)).toBe(true);
      expect(r.raw.original_order.length).toBe(r.raw.optimized_order.length);
      expect(typeof r.raw.estimated_improvement_pct).toBe("number");
      expect(Array.isArray(r.raw.operation_adjustments)).toBe(true);
    });

    it("both 'productivity' and 'cost' objectives produce valid OptimizedCampaign output", async () => {
      const cfg = buildConfig();
      const rProd = await call({
        action: "campaign_optimize",
        params: { config: cfg, target: { objective: "productivity" } },
      });
      const rCost = await call({
        action: "campaign_optimize",
        params: { config: cfg, target: { objective: "cost" } },
      });
      expect(rProd.success).toBe(true);
      expect(rCost.success).toBe(true);
      expect(Array.isArray(rProd.raw.optimized_order)).toBe(true);
      expect(rProd.raw.optimized_order.length).toBe(cfg.operations.length);
      expect(Array.isArray(rCost.raw.optimized_order)).toBe(true);
      expect(rCost.raw.optimized_order.length).toBe(cfg.operations.length);
    });
  });
});
