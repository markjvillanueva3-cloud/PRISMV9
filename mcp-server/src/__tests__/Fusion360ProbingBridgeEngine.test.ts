/**
 * Fusion360ProbingBridgeEngine.test.ts
 *
 * Coverage:
 *   - happy path: 13 probe operations, audit OK
 *   - per-operation lookup with concrete macro vocabulary + feed envelopes
 *   - validateProbeParams enforces feed/retract envelope (PASS + FAIL)
 *   - listToolSetter / listMultiAxis filter helpers
 *   - schema rejection on bad inputs
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360ProbingBridgeEngine,
  ProbeOperationSchema,
  ProbeOperationKindSchema,
  ProbeBrandSchema,
  type ProbeOperation,
} from "../engines/Fusion360ProbingBridgeEngine.js";

function mustFind(id: string): ProbeOperation {
  const p = Fusion360ProbingBridgeEngine.lookup(id);
  if (p === null) throw new Error(`expected probe op ${id}, got null`);
  return p;
}

// ── 1. Catalog shape ───────────────────────────────────────────────────────

describe("Fusion360ProbingBridgeEngine — catalog shape", () => {
  it("exposes exactly 13 probe operations", () => {
    expect(Fusion360ProbingBridgeEngine.count()).toBe(13);
    expect(Fusion360ProbingBridgeEngine.EXPECTED_TOTAL).toBe(13);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = Fusion360ProbingBridgeEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("every op has ≥1 macro_vocabulary entry + non-empty notes", () => {
    for (const p of Fusion360ProbingBridgeEngine.list()) {
      expect(p.macro_vocabulary.length).toBeGreaterThan(0);
      expect(p.notes.length).toBeGreaterThan(0);
    }
  });
});

// ── 2. Per-operation lookup ────────────────────────────────────────────────

describe("Fusion360ProbingBridgeEngine — per-operation lookup", () => {
  it("probe_wcs_4side has Renishaw O9810 macro", () => {
    const p = mustFind("probe_wcs_4side");
    expect(p.kind).toBe("wcs_origin");
    expect(p.macro_vocabulary).toContain("O9810");
    expect(p.fusion_cycle_code).toBe("PROBE:WCS");
  });

  it("probe_tool_length has lower fast_feed than work probing", () => {
    const tool = mustFind("probe_tool_length");
    const work = mustFind("probe_wcs_4side");
    expect(tool.fast_feed_max_mmpm).toBeLessThan(work.fast_feed_max_mmpm);
    expect(tool.feed_max_mmpm).toBeLessThan(work.feed_max_mmpm);
  });

  it("probe_angle_align requires ≥4 axes (rotational alignment)", () => {
    const p = mustFind("probe_angle_align");
    expect(p.required_axis_count).toBeGreaterThanOrEqual(4);
  });

  it("lookup returns null for unknown id; mustLookup throws", () => {
    expect(Fusion360ProbingBridgeEngine.lookup("nope")).toBeNull();
    expect(() => Fusion360ProbingBridgeEngine.mustLookup("nope")).toThrow(/unknown probe operation id/);
  });
});

// ── 3. listByKind / listMultiAxis / listToolSetter ────────────────────────

describe("Fusion360ProbingBridgeEngine — filter helpers", () => {
  it("listByKind('wcs_origin') returns the WCS operations", () => {
    const wcs = Fusion360ProbingBridgeEngine.listByKind("wcs_origin");
    expect(wcs.length).toBeGreaterThanOrEqual(1);
    for (const p of wcs) expect(p.kind).toBe("wcs_origin");
  });

  it("listMultiAxis returns operations needing ≥4 axes", () => {
    const ma = Fusion360ProbingBridgeEngine.listMultiAxis();
    expect(ma.length).toBeGreaterThanOrEqual(1);
    for (const p of ma) expect(p.required_axis_count).toBeGreaterThanOrEqual(4);
  });

  it("listToolSetter returns the 3 tool-setter operations", () => {
    const ts = Fusion360ProbingBridgeEngine.listToolSetter();
    expect(ts.length).toBe(3);
    const kinds = new Set(ts.map(p => p.kind));
    expect(kinds.has("tool_length")).toBe(true);
    expect(kinds.has("tool_diameter")).toBe(true);
    expect(kinds.has("tool_breakage")).toBe(true);
  });
});

// ── 4. validateProbeParams ────────────────────────────────────────────────

describe("Fusion360ProbingBridgeEngine — validateProbeParams", () => {
  it("returns ok when params within envelope", () => {
    const r = Fusion360ProbingBridgeEngine.validateProbeParams({
      operation_id: "probe_wcs_4side", retract_mm: 10, feed_mmpm: 500, fast_feed_mmpm: 2000,
    });
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("flags retract below minimum", () => {
    const r = Fusion360ProbingBridgeEngine.validateProbeParams({
      operation_id: "probe_wcs_4side", retract_mm: 2, feed_mmpm: 500, fast_feed_mmpm: 2000,
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("retract"))).toBe(true);
  });

  it("flags probing feed above max", () => {
    const r = Fusion360ProbingBridgeEngine.validateProbeParams({
      operation_id: "probe_wcs_4side", retract_mm: 10, feed_mmpm: 1200, fast_feed_mmpm: 2000,
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("probing feed"))).toBe(true);
  });

  it("flags fast feed above max", () => {
    const r = Fusion360ProbingBridgeEngine.validateProbeParams({
      operation_id: "probe_wcs_4side", retract_mm: 10, feed_mmpm: 500, fast_feed_mmpm: 5000,
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.some(s => s.includes("fast feed"))).toBe(true);
  });

  it("throws on unknown operation id", () => {
    expect(() => Fusion360ProbingBridgeEngine.validateProbeParams({
      operation_id: "nope", retract_mm: 10, feed_mmpm: 500, fast_feed_mmpm: 2000,
    })).toThrow(/unknown probe operation id/);
  });
});

// ── 5. Schema validation ──────────────────────────────────────────────────

describe("Fusion360ProbingBridgeEngine — schema validation", () => {
  it("ProbeBrandSchema rejects unknown brand", () => {
    const bad: unknown = "starrett_dial";
    expect(() => ProbeBrandSchema.parse(bad)).toThrow();
  });

  it("ProbeOperationKindSchema rejects unknown kind", () => {
    const bad: unknown = "thread_check";
    expect(() => ProbeOperationKindSchema.parse(bad)).toThrow();
  });

  it("ProbeOperationSchema rejects axis count < 3", () => {
    expect(() => ProbeOperationSchema.parse({
      id: "ok_id", kind: "wcs_origin", display_name: "x", fusion_cycle_code: "PROBE:WCS",
      macro_vocabulary: ["O9810"], required_axis_count: 2, retract_min_mm: 5,
      feed_max_mmpm: 600, fast_feed_max_mmpm: 3000, notes: "x",
    })).toThrow();
  });

  it("ProbeOperationSchema rejects negative retract", () => {
    expect(() => ProbeOperationSchema.parse({
      id: "ok_id", kind: "wcs_origin", display_name: "x", fusion_cycle_code: "PROBE:WCS",
      macro_vocabulary: ["O9810"], required_axis_count: 3, retract_min_mm: -1,
      feed_max_mmpm: 600, fast_feed_max_mmpm: 3000, notes: "x",
    })).toThrow();
  });
});

// ── 6. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360ProbingBridgeEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the probing bridge actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_probing_list");
    expect(mod.ACTIONS).toContain("cam_fusion360_probing_lookup");
    expect(mod.ACTIONS).toContain("cam_fusion360_probing_validate");
    expect(mod.ACTIONS).toContain("cam_fusion360_probing_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/Fusion360ProbingBridgeEngine.js");
    expect(mod.Fusion360ProbingBridgeEngine.count()).toBe(13);
  });
});
