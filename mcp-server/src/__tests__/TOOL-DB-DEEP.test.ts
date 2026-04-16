/**
 * TOOL-DB-DEEP.test.ts
 * Tests for ToolDatabaseDeepLearningEngine
 * Coverage: selectOptimalTool, buildToolAssembly, predictToolLife,
 *           synchronizeToolData, validateToolSetup, searchTools,
 *           getPerformanceSummary, learning features, schema, holders
 * @milestone TOOL-DB-DEEP-MS0
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolDatabaseDeepLearningEngine,
  toolDatabaseDeepLearningEngine,
} from "../engines/ToolDatabaseDeepLearningEngine.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function freshEngine(): ToolDatabaseDeepLearningEngine {
  return new ToolDatabaseDeepLearningEngine();
}

// ============================================================================
// SECTION 1 — selectOptimalTool
// ============================================================================

describe("selectOptimalTool", () => {
  it("returns a result for roughing + tool_steel", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "tool_steel");
    expect(result.selected_tool).toBeDefined();
    expect(result.selected_tool.geometry_class).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns ISO group H for tool_steel", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "tool_steel");
    expect(result.query.iso_group).toBe("H");
  });

  it("selects a ball endmill for 3D contour finishing", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("3d contour finishing", "hardened_steel", {
      diameter_range_mm: [4, 10],
    });
    expect(result.selected_tool.geometry_class).toMatch(/Ball|Radius|Lollipop/);
  });

  it("respects diameter range constraints", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "steel", {
      diameter_range_mm: [8, 12],
    });
    expect(result.selected_tool.diameter_mm).toBeGreaterThanOrEqual(8);
    expect(result.selected_tool.diameter_mm).toBeLessThanOrEqual(12);
  });

  it("includes cutting data entry in result", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "tool_steel");
    expect(result.cutting_data).toBeDefined();
    expect(result.cutting_data.vc_m_min).toBeGreaterThan(0);
    expect(result.cutting_data.fz_mm).toBeGreaterThan(0);
    expect(result.cutting_data.iso_group).toBe("H");
  });

  it("includes reasoning chain", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "tool_steel");
    expect(result.reasoning.length).toBeGreaterThan(2);
    expect(result.reasoning.some(r => r.includes("ISO group"))).toBe(true);
  });

  it("provides alternatives when available", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "steel");
    // At minimum we should have a selected tool
    expect(result.selected_tool).toBeDefined();
  });

  it("handles unknown material key gracefully", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("roughing", "unknown_material_xyz");
    // Defaults to ISO group P
    expect(result.query.iso_group).toBe("P");
    expect(result.selected_tool).toBeDefined();
  });

  it("selects Drilltool for drilling operation", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("drilling", "steel", { diameter_range_mm: [8, 12] });
    expect(result.selected_tool.geometry_class).toMatch(/Drill/);
  });

  it("confidence is between 0 and 1", () => {
    const eng = freshEngine();
    const result = eng.selectOptimalTool("finishing", "hardened_steel");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// SECTION 2 — buildToolAssembly
// ============================================================================

describe("buildToolAssembly", () => {
  it("builds a valid assembly for AC_EM_001 + CAT40-ER32-080", () => {
    const eng = freshEngine();
    const result = eng.buildToolAssembly("AC_EM_001", "CAT40-ER32-080");
    expect(result.success).toBe(true);
    expect(result.assembly).toBeDefined();
    expect(result.gauge_length_mm).toBeGreaterThan(0);
    expect(result.stick_out_mm).toBeGreaterThan(0);
  });

  it("returns fail for unknown tool", () => {
    const eng = freshEngine();
    const result = eng.buildToolAssembly("NONEXISTENT_TOOL", "CAT40-ER32-080");
    expect(result.success).toBe(false);
    expect(result.issues.some(i => i.includes("not found"))).toBe(true);
  });

  it("returns fail for unknown holder", () => {
    const eng = freshEngine();
    const result = eng.buildToolAssembly("AC_EM_001", "NONEXISTENT_HOLDER");
    expect(result.success).toBe(false);
    expect(result.issues.some(i => i.includes("not found"))).toBe(true);
  });

  it("gauge_length_mm = holder.gauge + oal - shank*0.5", () => {
    const eng = freshEngine();
    // AC_EM_001: oal=72, shank=10; CAT40-ER32-080: gauge=80
    // Expected: 80 + 72 - 5 = 147
    const result = eng.buildToolAssembly("AC_EM_001", "CAT40-ER32-080");
    expect(result.gauge_length_mm).toBeCloseTo(147, 0);
  });

  it("rpm_limit is set and positive", () => {
    const eng = freshEngine();
    const result = eng.buildToolAssembly("AC_EM_001", "CAT40-ER32-080");
    expect(result.rpm_limit).toBeGreaterThan(0);
  });

  it("assembly config has correct taper from holder", () => {
    const eng = freshEngine();
    const result = eng.buildToolAssembly("AC_EM_001", "CAT40-ER32-080");
    expect(result.assembly?.config.taper_shank).toBe("CAT40");
  });

  it("builds BBT40 shrink fit assembly", () => {
    const eng = freshEngine();
    // JM Die BM tool + BBT40 shrink fit
    const result = eng.buildToolAssembly("JM-BM-006-2F-ALT", "BBT40-SHK-D6-060");
    expect(result.assembly?.holder.taper).toBe("BBT40");
    expect(result.assembly?.holder.style).toBe("shrink_fit");
  });

  it("collision check returns one of pass/marginal/fail", () => {
    const eng = freshEngine();
    const result = eng.buildToolAssembly("AC_EM_001", "CAT40-ER32-080");
    expect(["pass", "marginal", "fail"]).toContain(result.collision_check);
  });
});

// ============================================================================
// SECTION 3 — predictToolLife
// ============================================================================

describe("predictToolLife", () => {
  it("returns a positive Taylor life estimate", () => {
    const eng = freshEngine();
    const pred = eng.predictToolLife(
      { vc_m_min: 80, fz_mm: 0.025, ap_mm: 0.5, tool_id: "JM-EM-010-4F-ALT" },
      "tool_steel",
    );
    expect(pred.predicted_life_min).toBeGreaterThan(0);
  });

  it("uses CANONICAL_TAYLOR C and n values for H group", () => {
    const eng = freshEngine();
    const pred = eng.predictToolLife(
      { vc_m_min: 100, fz_mm: 0.02, ap_mm: 0.3, tool_id: "AC_EM_001" },
      "hardened_steel",
    );
    // CANONICAL_TAYLOR H: C=200, n=0.20
    expect(pred.taylor_C).toBe(200);
    expect(pred.taylor_n).toBe(0.20);
    expect(pred.iso_group).toBe("H");
  });

  it("uses CANONICAL_TAYLOR C and n values for P group", () => {
    const eng = freshEngine();
    const pred = eng.predictToolLife(
      { vc_m_min: 200, fz_mm: 0.05, ap_mm: 1.0, tool_id: "AC_EM_001" },
      "steel",
    );
    // CANONICAL_TAYLOR P: C=350, n=0.25
    expect(pred.taylor_C).toBe(350);
    expect(pred.taylor_n).toBe(0.25);
  });

  it("Taylor formula: T = (C/Vc)^(1/n) verified", () => {
    const eng = freshEngine();
    const vc = 120;
    const pred = eng.predictToolLife(
      { vc_m_min: vc, fz_mm: 0.04, ap_mm: 1.0, tool_id: "AC_EM_001" },
      "steel",
    );
    // T = (350/120)^(1/0.25) = (2.917)^4 = 72.2 min
    const expected = Math.pow(350 / vc, 1 / 0.25);
    expect(pred.predicted_life_min).toBeCloseTo(expected, 0);
  });

  it("Weibull B10 < B50 < B90", () => {
    const eng = freshEngine();
    const pred = eng.predictToolLife(
      { vc_m_min: 80, fz_mm: 0.02, ap_mm: 0.3, tool_id: "AC_EM_001" },
      "tool_steel",
    );
    expect(pred.life_b10_min).toBeLessThan(pred.life_b50_min);
    expect(pred.life_b50_min).toBeLessThan(pred.life_b90_min);
  });

  it("confidence is between 0 and 1", () => {
    const eng = freshEngine();
    const pred = eng.predictToolLife(
      { vc_m_min: 60, fz_mm: 0.015, ap_mm: 0.2, tool_id: "JM-BM-006-2F-ALT" },
      "hardened_steel",
    );
    expect(pred.confidence).toBeGreaterThan(0);
    expect(pred.confidence).toBeLessThanOrEqual(1);
  });

  it("notes contain Taylor constants source", () => {
    const eng = freshEngine();
    const pred = eng.predictToolLife(
      { vc_m_min: 80, fz_mm: 0.025, ap_mm: 0.5, tool_id: "AC_EM_001" },
      "steel",
    );
    expect(pred.notes.some(n => n.includes("ISO 3685") || n.includes("Taylor"))).toBe(true);
  });

  it("higher Vc → shorter life (Taylor behavior)", () => {
    const eng = freshEngine();
    const low = eng.predictToolLife({ vc_m_min: 60, fz_mm: 0.02, ap_mm: 0.3, tool_id: "AC_EM_001" }, "steel");
    const high = eng.predictToolLife({ vc_m_min: 120, fz_mm: 0.02, ap_mm: 0.3, tool_id: "AC_EM_001" }, "steel");
    expect(high.predicted_life_min).toBeLessThan(low.predicted_life_min);
  });
});

// ============================================================================
// SECTION 4 — synchronizeToolData
// ============================================================================

describe("synchronizeToolData", () => {
  it("returns a sync result with workflow_id", () => {
    const eng = freshEngine();
    const result = eng.synchronizeToolData("hypermill_sql", "fusion360");
    expect(result.workflow_id).toMatch(/^SYNC-/);
  });

  it("reports tools_added + tools_updated + tools_skipped > 0", () => {
    const eng = freshEngine();
    const result = eng.synchronizeToolData("hypermill_sql", "fusion360");
    const total = result.tools_added + result.tools_updated + result.tools_skipped;
    expect(total).toBeGreaterThan(0);
  });

  it("dry_run reports 0 added and 0 updated", () => {
    const eng = freshEngine();
    const result = eng.synchronizeToolData("hypermill_sql", "mastercam", { dry_run: true });
    expect(result.tools_added).toBe(0);
    expect(result.tools_updated).toBe(0);
  });

  it("source_wins strategy produces no conflicts", () => {
    const eng = freshEngine();
    const result = eng.synchronizeToolData("ac_standard", "fusion360", { strategy: "source_wins" });
    expect(result.conflicts.length).toBe(0);
  });

  it("executed_at is a valid ISO timestamp", () => {
    const eng = freshEngine();
    const result = eng.synchronizeToolData("hypermill_sql", "shopfloor_csv");
    expect(new Date(result.executed_at).toISOString()).toBe(result.executed_at);
  });

  it("errors array is present (empty on success)", () => {
    const eng = freshEngine();
    const result = eng.synchronizeToolData("hypermill_sql", "fusion360");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ============================================================================
// SECTION 5 — validateToolSetup
// ============================================================================

describe("validateToolSetup", () => {
  function makeAssembly(taper: "CAT40" | "BBT40", rpmLimit: number, gaugeLen: number) {
    const eng = freshEngine();
    const holders = eng.getJMDieHolders({ taper });
    const holder = holders[0];
    return {
      assembly_id: "test-assembly",
      tool: {} as never,
      holder,
      config: {
        config_id: "test",
        description: "Test",
        taper_shank: taper,
        holder_id: holder.holder_id,
        cutting_tool_id: "AC_EM_001",
        total_gauge_length_mm: gaugeLen,
        stick_out_mm: 45,
        max_reach_depth_mm: 20,
        rpm_limit: rpmLimit,
        runout_um: holder.runout_um,
        coolant_path: "external" as const,
      },
      collision_risk: "none" as const,
      clearance_mm: 10,
      estimated_life_min: 45,
      confidence: 0.85,
      notes: [],
    };
  }

  it("passes for compatible CAT40 assembly on hurco-vm10i", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("CAT40", 12000, 200);
    const result = eng.validateToolSetup(assembly, "hurco-vm10i");
    expect(result.pass).toBe(true);
    expect(result.checks.taper_compatible).toBe(true);
  });

  it("fails for BBT40 holder on hurco-vm10i (expects CAT40)", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("BBT40", 12000, 200);
    const result = eng.validateToolSetup(assembly, "hurco-vm10i");
    expect(result.pass).toBe(false);
    expect(result.checks.taper_compatible).toBe(false);
    expect(result.issues.some(i => i.code === "TAPER_MISMATCH")).toBe(true);
  });

  it("fails for RPM over machine limit", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("CAT40", 50000, 200);  // 50k > hurco 15k
    const result = eng.validateToolSetup(assembly, "hurco-vm10i");
    expect(result.checks.rpm_within_limit).toBe(false);
    expect(result.issues.some(i => i.code === "RPM_EXCEEDED")).toBe(true);
  });

  it("warns for gauge_length > machine limit", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("CAT40", 8000, 500);  // 500 > hurco 350
    const result = eng.validateToolSetup(assembly, "hurco-vm10i");
    expect(result.checks.gauge_length_ok).toBe(false);
    expect(result.issues.some(i => i.code === "GAUGE_LONG")).toBe(true);
  });

  it("returns error for unknown machine", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("CAT40", 8000, 200);
    const result = eng.validateToolSetup(assembly, "nonexistent-machine");
    expect(result.pass).toBe(false);
    expect(result.issues.some(i => i.code === "MACH_NOT_FOUND")).toBe(true);
  });

  it("passes for BBT40 assembly on okuma-mu4000", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("BBT40", 10000, 250);
    const result = eng.validateToolSetup(assembly, "okuma-mu4000");
    expect(result.checks.taper_compatible).toBe(true);
  });

  it("score is 0–100", () => {
    const eng = freshEngine();
    const assembly = makeAssembly("CAT40", 8000, 200);
    const result = eng.validateToolSetup(assembly, "hurco-vm10i");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// SECTION 6 — searchTools
// ============================================================================

describe("searchTools", () => {
  it("returns all tools with no filter", () => {
    const eng = freshEngine();
    const tools = eng.searchTools({});
    expect(tools.length).toBeGreaterThan(0);
  });

  it("filters by prism_type flat_endmill", () => {
    const eng = freshEngine();
    const tools = eng.searchTools({ prism_type: "flat_endmill" });
    tools.forEach(t => expect(t.prism_type).toBe("flat_endmill"));
  });

  it("filters by diameter range", () => {
    const eng = freshEngine();
    const tools = eng.searchTools({ diameter_min_mm: 8, diameter_max_mm: 12 });
    tools.forEach(t => {
      expect(t.diameter_mm).toBeGreaterThanOrEqual(8);
      expect(t.diameter_mm).toBeLessThanOrEqual(12);
    });
  });

  it("filters by substrate Carbide", () => {
    const eng = freshEngine();
    const tools = eng.searchTools({ substrate: "Carbide" });
    tools.forEach(t => expect(t.substrate.toLowerCase()).toContain("carbide"));
  });

  it("filters by iso_group H (hardened)", () => {
    const eng = freshEngine();
    const tools = eng.searchTools({ iso_group: "H" });
    tools.forEach(t => {
      const hasH = t.material_compat.some(mc => mc.iso_group === "H");
      expect(hasH).toBe(true);
    });
  });

  it("returns empty array for impossible filter", () => {
    const eng = freshEngine();
    const tools = eng.searchTools({ diameter_min_mm: 9999 });
    expect(tools.length).toBe(0);
  });
});

// ============================================================================
// SECTION 7 — getToolDatabaseSchema
// ============================================================================

describe("getToolDatabaseSchema", () => {
  it("returns tables including tool_db_tool", () => {
    const eng = freshEngine();
    const schema = eng.getToolDatabaseSchema();
    expect(schema.tables).toContain("tool_db_tool");
  });

  it("returns tables including tool_db_holder", () => {
    const eng = freshEngine();
    const schema = eng.getToolDatabaseSchema();
    expect(schema.tables).toContain("tool_db_holder");
  });

  it("version field references hyperMILL", () => {
    const eng = freshEngine();
    const schema = eng.getToolDatabaseSchema();
    expect(schema.version).toMatch(/hyperMILL/i);
  });

  it("fields contain diameter_mm", () => {
    const eng = freshEngine();
    const schema = eng.getToolDatabaseSchema();
    expect(schema.fields.diameter_mm).toBeDefined();
  });
});

// ============================================================================
// SECTION 8 — getJMDieHolders
// ============================================================================

describe("getJMDieHolders", () => {
  it("returns holders without filter", () => {
    const eng = freshEngine();
    const holders = eng.getJMDieHolders();
    expect(holders.length).toBeGreaterThan(0);
  });

  it("filters CAT40 holders", () => {
    const eng = freshEngine();
    const holders = eng.getJMDieHolders({ taper: "CAT40" });
    holders.forEach(h => expect(h.taper).toBe("CAT40"));
    expect(holders.length).toBeGreaterThan(0);
  });

  it("filters BBT40 holders", () => {
    const eng = freshEngine();
    const holders = eng.getJMDieHolders({ taper: "BBT40" });
    holders.forEach(h => expect(h.taper).toBe("BBT40"));
  });

  it("filters shrink_fit style", () => {
    const eng = freshEngine();
    const holders = eng.getJMDieHolders({ style: "shrink_fit" });
    holders.forEach(h => expect(h.style).toBe("shrink_fit"));
    expect(holders.length).toBeGreaterThan(0);
  });

  it("each holder has positive max_rpm", () => {
    const eng = freshEngine();
    const holders = eng.getJMDieHolders();
    holders.forEach(h => expect(h.max_rpm).toBeGreaterThan(0));
  });
});

// ============================================================================
// SECTION 9 — Learning Features
// ============================================================================

describe("recordToolPerformance and learning", () => {
  it("record gets assigned an ID and timestamp", () => {
    const eng = freshEngine();
    const rec = eng.recordToolPerformance({
      tool_id: "AC_EM_001", material_key: "steel",
      vc_actual_m_min: 120, fz_actual_mm: 0.04,
      ap_actual_mm: 1.0, cycles_completed: 80,
      wear_vb_mm: 0.18,
    });
    expect(rec.record_id).toMatch(/^TLR-/);
    expect(rec.recorded_at).toBeDefined();
    expect(new Date(rec.recorded_at).getTime()).toBeGreaterThan(0);
  });

  it("getPerformanceSummary returns 0 records for unknown tool", () => {
    const eng = freshEngine();
    const summary = eng.getPerformanceSummary("NO_SUCH_TOOL");
    expect(summary.record_count).toBe(0);
  });

  it("getPerformanceSummary accumulates records", () => {
    const eng = freshEngine();
    eng.recordToolPerformance({
      tool_id: "JM-EM-010-4F-ALT", material_key: "tool_steel",
      vc_actual_m_min: 70, fz_actual_mm: 0.025, ap_actual_mm: 0.5,
      cycles_completed: 60, wear_vb_mm: 0.20,
    });
    eng.recordToolPerformance({
      tool_id: "JM-EM-010-4F-ALT", material_key: "tool_steel",
      vc_actual_m_min: 70, fz_actual_mm: 0.025, ap_actual_mm: 0.5,
      cycles_completed: 55, wear_vb_mm: 0.22,
    });
    const summary = eng.getPerformanceSummary("JM-EM-010-4F-ALT");
    expect(summary.record_count).toBe(2);
    expect(summary.avg_life_cycles).toBeCloseTo(57.5, 0);
  });

  it("learnOptimalParams returns factor=1.0 with no data", () => {
    const eng = freshEngine();
    const adj = eng.learnOptimalParams("AC_EM_001", "P");
    expect(adj.vc_factor).toBeCloseTo(1.0, 2);
    expect(adj.n).toBe(0);
  });

  it("learned factor applies to predictToolLife after recording", () => {
    const eng = freshEngine();
    // Record usage at Vc=240 (vs nominal 120 for AC_EM_001) — 2× factor
    eng.recordToolPerformance({
      tool_id: "AC_EM_001", material_key: "steel",
      vc_actual_m_min: 240, fz_actual_mm: 0.04, ap_actual_mm: 1.0,
      cycles_completed: 30, wear_vb_mm: 0.30,
    });
    const adj = eng.learnOptimalParams("AC_EM_001", "P");
    expect(adj.n).toBe(1);
    // Factor should reflect the 240/120 = 2.0 ratio
    expect(adj.vc_factor).toBeCloseTo(2.0, 1);
  });
});

// ============================================================================
// SECTION 10 — detectFailurePattern
// ============================================================================

describe("detectFailurePattern", () => {
  it("returns empty array with fewer than 3 records", () => {
    const eng = freshEngine();
    eng.recordToolPerformance({
      tool_id: "AC_BM_001", material_key: "tool_steel",
      vc_actual_m_min: 55, fz_actual_mm: 0.015, ap_actual_mm: 0.3,
      cycles_completed: 40, wear_vb_mm: 0.15, failure_mode: "chipping",
    });
    const patterns = eng.detectFailurePattern("AC_BM_001");
    expect(patterns).toEqual([]);
  });

  it("detects chipping pattern above threshold", () => {
    const eng = freshEngine();
    for (let i = 0; i < 5; i++) {
      eng.recordToolPerformance({
        tool_id: "AC_BM_001", material_key: "hardened_steel",
        vc_actual_m_min: 60, fz_actual_mm: 0.02, ap_actual_mm: 0.2,
        cycles_completed: 30, wear_vb_mm: 0.25, failure_mode: "chipping",
      });
    }
    // Add 1 normal wear to make total 6 with 5 chipping
    eng.recordToolPerformance({
      tool_id: "AC_BM_001", material_key: "hardened_steel",
      vc_actual_m_min: 60, fz_actual_mm: 0.02, ap_actual_mm: 0.2,
      cycles_completed: 50, wear_vb_mm: 0.20, failure_mode: "normal_wear",
    });
    const patterns = eng.detectFailurePattern("AC_BM_001");
    const chipping = patterns.find(p => p.pattern === "chipping");
    expect(chipping).toBeDefined();
    expect(chipping?.severity).toMatch(/medium|high/);
    expect(chipping?.recommendation).toContain("fz");
  });

  it("detects breakage pattern with high severity", () => {
    const eng = freshEngine();
    for (let i = 0; i < 4; i++) {
      eng.recordToolPerformance({
        tool_id: "JM-DT-010-CRB", material_key: "tool_steel",
        vc_actual_m_min: 90, fz_actual_mm: 0.12, ap_actual_mm: 10.0,
        cycles_completed: 5, wear_vb_mm: 0.5, failure_mode: "breakage",
      });
    }
    const patterns = eng.detectFailurePattern("JM-DT-010-CRB");
    const breakage = patterns.find(p => p.pattern === "breakage");
    expect(breakage).toBeDefined();
    expect(breakage?.severity).toBe("high");
  });
});

// ============================================================================
// SECTION 11 — getCuttingDataTable
// ============================================================================

describe("getCuttingDataTable", () => {
  it("returns entries for known tool + ISO group", () => {
    const eng = freshEngine();
    const table = eng.getCuttingDataTable("AC_EM_001", "H");
    expect(table.tool_id).toBe("AC_EM_001");
    expect(table.entries.length).toBeGreaterThan(0);
    expect(table.entries[0].iso_group).toBe("H");
  });

  it("returns empty entries for unknown tool", () => {
    const eng = freshEngine();
    const table = eng.getCuttingDataTable("NO_SUCH_TOOL", "P");
    expect(table.entries.length).toBe(0);
  });

  it("cutting data vc_m_min is positive", () => {
    const eng = freshEngine();
    const table = eng.getCuttingDataTable("AC_EM_001", "P");
    table.entries.forEach(e => expect(e.vc_m_min).toBeGreaterThan(0));
  });
});

// ============================================================================
// SECTION 12 — Singleton export
// ============================================================================

describe("singleton export", () => {
  it("toolDatabaseDeepLearningEngine is an instance of the class", () => {
    expect(toolDatabaseDeepLearningEngine).toBeInstanceOf(ToolDatabaseDeepLearningEngine);
  });

  it("singleton selectOptimalTool works", () => {
    const result = toolDatabaseDeepLearningEngine.selectOptimalTool("roughing", "steel");
    expect(result.selected_tool).toBeDefined();
  });
});
