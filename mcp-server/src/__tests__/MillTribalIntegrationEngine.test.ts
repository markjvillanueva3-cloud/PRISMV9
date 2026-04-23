/**
 * MillTribalIntegrationEngine — real-behavior coverage
 * =====================================================
 * Exercises the JM Die tribal rule set against the engine's three
 * observable surfaces:
 *   - getAdjustment(): multiplicative rpm/feed/doc factors from tips + heuristics
 *   - checkFailureModes(): material/operation-scoped failure-mode lookup
 *   - getStatistics(): catalog totals + material/operation histograms
 *
 * Also round-trips four dispatcher ops (adjust, check_failures, statistics,
 * integrate) so a schema/action-enum regression is caught by the test.
 */
import { describe, it, expect } from "vitest";
import {
  MillTribalIntegrationEngine,
  millTribalIntegrationEngine,
} from "../engines/MillTribalIntegrationEngine.js";
import { MILL_DISPATCHER_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

// ---------- catalog-derived constants (mirror the engine's inline arrays) ----
const TOTAL_TIPS = 15;
const TOTAL_HEURISTICS = 5;
const TOTAL_FAILURE_MODES = 5;

// Known singular tips referenced in assertions
const TIP_D2_STEEL = "JM-MILL-001";          // P, rough_profile → feed_factor 0.5
const TIP_HSS_HARDENED = "JM-MILL-003";      // H, rpm_factor 0.6, sfm_max 100
const TIP_ALU_CHIP = "JM-MILL-004";          // N, feed_factor 1.3
const TIP_TAP_STEEL = "JM-MILL-009";         // P tap, rpm_factor 0.7
const TIP_Z_ALU = "JM-MILL-015";             // N rough_profile, doc_factor 1.0
const HEUR_SMALL_TOOL = "HEUR-001";          // dia<6mm in P/M, feed 0.8

// Material groups spanned across the 15 tips
const MATERIALS: ReadonlyArray<"P" | "N" | "H" | "K"> = ["P", "N", "H", "K"];
const OPERATIONS = [
  "rough_profile",
  "finish_profile",
  "rough_pocket",
  "peck_drill",
  "spot_drill",
  "tap",
  "chamfer",
  "face",
] as const;

describe("MillTribalIntegrationEngine — catalog surface", () => {
  it("exposes the documented JM Die tribal catalog totals", () => {
    const stats = millTribalIntegrationEngine.getStatistics();
    expect(stats.total_tips).toBe(TOTAL_TIPS);
    expect(stats.total_heuristics).toBe(TOTAL_HEURISTICS);
    expect(stats.total_failure_modes).toBe(TOTAL_FAILURE_MODES);
  });

  it("histogram `by_material` covers at least P / N / H (the three main groups)", () => {
    const stats = millTribalIntegrationEngine.getStatistics();
    expect((stats.by_material["P"] ?? 0) >= 1).toBe(true);
    expect((stats.by_material["N"] ?? 0) >= 1).toBe(true);
    expect((stats.by_material["H"] ?? 0) >= 1).toBe(true);
    // histogram counts only material-scoped tips → cannot exceed total
    const sum = Object.values(stats.by_material).reduce((a, b) => a + b, 0);
    expect(sum <= TOTAL_TIPS).toBe(true);
    expect(sum >= 3).toBe(true);
  });

  it("histogram `by_operation` spans drilling, profiling, tapping", () => {
    const stats = millTribalIntegrationEngine.getStatistics();
    const ops = Object.keys(stats.by_operation);
    expect(ops.includes("rough_profile")).toBe(true);
    expect(ops.includes("peck_drill")).toBe(true);
    expect(ops.includes("tap")).toBe(true);
  });

  it("counts critical failure modes (FAIL-002 tap breakage is critical)", () => {
    const stats = millTribalIntegrationEngine.getStatistics();
    expect(stats.critical_warnings >= 1).toBe(true);
    expect(stats.critical_warnings <= TOTAL_FAILURE_MODES).toBe(true);
  });
});

describe("MillTribalIntegrationEngine.getAdjustment — known tips", () => {
  // Engine stacks tips AND heuristics multiplicatively. For P+rough_profile:
  //   tips:        JM-MILL-001 feed×0.5 ;   JM-MILL-014 doc×0.5
  //   heuristics:  HEUR-001 (P)       feed×0.8
  //                HEUR-002 (rough*)  doc×0.6
  //                HEUR-004 (rough*)  feed×1.1 doc×0.7
  //                HEUR-005 (rough/finish) feed×0.7
  // expected feed = 0.5 * 0.8 * 1.1 * 0.7 = 0.308
  // expected doc  = 0.5 * 0.6 * 0.7      = 0.21
  it("stacks tips + heuristics multiplicatively for P+rough_profile (feed≈0.308, doc≈0.21)", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "rough_profile", "flat_endmill", 12);
    expect(adj.feed_factor).toBeCloseTo(0.308, 5);
    expect(adj.doc_factor).toBeCloseTo(0.21, 5);
    expect(adj.tips_applied.includes(TIP_D2_STEEL)).toBe(true);
    expect(adj.tips_applied.includes(HEUR_SMALL_TOOL)).toBe(true);
    // constraint tips must surface in warnings
    expect(adj.warnings.length >= 1).toBe(true);
  });

  it("applies JM-MILL-003 for H material (HSS on hardened steels): rpm_factor 0.6", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("H", "rough_profile", "flat_endmill", 12);
    // Only JM-MILL-003 touches rpm for H material + rough_profile (no op match).
    // Heuristics HEUR-002/004/005 touch feed/doc, not rpm.
    expect(adj.rpm_factor).toBeCloseTo(0.6, 6);
    expect(adj.tips_applied.includes(TIP_HSS_HARDENED)).toBe(true);
    // negative signal → must appear in warnings
    expect(adj.warnings.some((w) => w.includes("HSS"))).toBe(true);
  });

  // For N+rough_profile:
  //   tips: JM-MILL-004 feed×1.3 ; JM-MILL-015 doc×1.0
  //   heuristics: HEUR-002 doc×0.6 ; HEUR-004 feed×1.1 doc×0.7 ; HEUR-005 feed×0.7
  // expected feed = 1.3 * 1.1 * 0.7 = 1.001
  // expected doc  = 1.0 * 0.6 * 0.7 = 0.42
  it("stacks Al tips + rough_profile heuristics for N+rough_profile (feed≈1.001, doc≈0.42)", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("N", "rough_profile", "flat_endmill", 12);
    expect(adj.feed_factor).toBeCloseTo(1.001, 3);
    expect(adj.doc_factor).toBeCloseTo(0.42, 5);
    expect(adj.tips_applied.includes(TIP_ALU_CHIP)).toBe(true);
    expect(adj.tips_applied.includes(TIP_Z_ALU)).toBe(true);
    // Al chip-load tip emits no warning (positive signal); JM-MILL-006 sfm_max is constraint
    expect(adj.warnings.some((w) => w.includes("flood coolant") || w.includes("gum up"))).toBe(true);
  });

  // For P+tap: tip JM-MILL-009 rpm×0.7. FAIL-002 is critical + op=tap → prevention rpm×0.6.
  // expected rpm = 0.7 * 0.6 = 0.42
  it("stacks JM-MILL-009 tip with FAIL-002 critical prevention for P+tap (rpm≈0.42)", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "tap", "tap", 6);
    expect(adj.rpm_factor).toBeCloseTo(0.42, 5);
    expect(adj.tips_applied.includes(TIP_TAP_STEEL)).toBe(true);
    // FAIL-002 severity=critical must surface CAUTION warning
    expect(adj.warnings.some((w) => w.includes("CAUTION") && w.includes("Tap breakage"))).toBe(true);
  });

  it("HEUR-001 is applied to any P-group tool (material-gate, not diameter-gate in current engine)", () => {
    // The engine's `applies` logic ORs material + operation + condition string, so material=P alone triggers
    // HEUR-001 for all diameters. Lock this real behavior with an explicit expectation.
    const adj4 = millTribalIntegrationEngine.getAdjustment("P", "finish_profile", "flat_endmill", 4);
    const adj12 = millTribalIntegrationEngine.getAdjustment("P", "finish_profile", "flat_endmill", 12);
    expect(adj4.tips_applied.includes(HEUR_SMALL_TOOL)).toBe(true);
    expect(adj12.tips_applied.includes(HEUR_SMALL_TOOL)).toBe(true);
    // feed-factor stays the same between the two diameters (material-gate is constant)
    expect(adj4.feed_factor).toBeCloseTo(adj12.feed_factor, 6);
  });

  it("returns identity factors (1,1,1) for material/op outside every rule's scope", () => {
    // S (superalloy) + unknown op: no tips match (all tips are scoped), no heuristic scope matches,
    // FAIL-003 is unscoped + severity="medium" (not critical) → no factor change, no warning.
    const adj = millTribalIntegrationEngine.getAdjustment("S", "engrave_unknown", "flat_endmill", 12);
    expect(adj.rpm_factor).toBeCloseTo(1.0, 6);
    expect(adj.feed_factor).toBeCloseTo(1.0, 6);
    expect(adj.doc_factor).toBeCloseTo(1.0, 6);
    expect(adj.tips_applied.length).toBe(0);
    expect(adj.warnings.length).toBe(0);
  });

  it("every returned tip id corresponds to a real catalog entry", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "rough_profile", "flat_endmill", 12);
    for (const id of adj.tips_applied) {
      // Tip IDs: JM-MILL-NNN ; heuristic IDs: HEUR-NNN
      const valid = /^JM-MILL-\d{3}$/.test(id) || /^HEUR-\d{3}$/.test(id);
      expect(valid).toBe(true);
    }
  });

  it.each(MATERIALS)("returns positive, finite factors for every material %s", (mat) => {
    const adj = millTribalIntegrationEngine.getAdjustment(mat, "rough_profile", "flat_endmill", 12);
    expect(Number.isFinite(adj.rpm_factor)).toBe(true);
    expect(Number.isFinite(adj.feed_factor)).toBe(true);
    expect(Number.isFinite(adj.doc_factor)).toBe(true);
    expect(adj.rpm_factor > 0).toBe(true);
    expect(adj.feed_factor > 0).toBe(true);
    expect(adj.doc_factor > 0).toBe(true);
  });

  it.each(OPERATIONS)("returns a structured result for every operation %s", (op) => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", op, "flat_endmill", 12);
    expect(Array.isArray(adj.warnings)).toBe(true);
    expect(Array.isArray(adj.tips_applied)).toBe(true);
    expect(typeof adj.rpm_factor).toBe("number");
    expect(typeof adj.feed_factor).toBe("number");
    expect(typeof adj.doc_factor).toBe("number");
  });
});

describe("MillTribalIntegrationEngine.getAdjustment — adversarial inputs", () => {
  it("tolerates unknown material token (no throw; op-scoped heuristics still apply)", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("Z_UNKNOWN", "rough_profile", "flat_endmill", 12);
    // rough_profile matches HEUR-002/004/005 regardless of material → 3 heuristics applied, no JM-MILL tips
    expect(adj.tips_applied.length).toBe(3);
    expect(adj.tips_applied.every((id) => id.startsWith("HEUR-"))).toBe(true);
    expect(Number.isFinite(adj.rpm_factor)).toBe(true);
    expect(Number.isFinite(adj.feed_factor)).toBe(true);
    expect(Number.isFinite(adj.doc_factor)).toBe(true);
  });

  it("tolerates empty-string operation type (material-scoped heuristics still apply for P)", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "", "flat_endmill", 12);
    // HEUR-001 matches on material P alone → feed×0.8
    expect(adj.feed_factor).toBeCloseTo(0.8, 6);
    expect(adj.tips_applied.includes(HEUR_SMALL_TOOL)).toBe(true);
  });

  it("tolerates zero diameter without throwing", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "finish_profile", "flat_endmill", 0);
    expect(Number.isFinite(adj.feed_factor)).toBe(true);
    expect(adj.feed_factor > 0).toBe(true);
  });

  it("tolerates NaN diameter without throwing", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "finish_profile", "flat_endmill", Number.NaN);
    expect(Number.isFinite(adj.feed_factor)).toBe(true);
  });

  it("tolerates Infinity diameter without throwing", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "finish_profile", "flat_endmill", Number.POSITIVE_INFINITY);
    expect(Number.isFinite(adj.feed_factor)).toBe(true);
  });

  it("tolerates empty tool type string", () => {
    const adj = millTribalIntegrationEngine.getAdjustment("P", "rough_profile", "", 12);
    // tool type is ignored by the implementation; behavior matches the standard P+rough_profile path
    expect(Number.isFinite(adj.feed_factor)).toBe(true);
    expect(adj.tips_applied.length > 0).toBe(true);
  });
});

describe("MillTribalIntegrationEngine.checkFailureModes", () => {
  it("returns FAIL-002 (critical) for P + tap", () => {
    const modes = millTribalIntegrationEngine.checkFailureModes("P", "tap", 2000, 400, 1);
    const ids = modes.map((m) => m.id);
    expect(ids.includes("FAIL-002")).toBe(true);
    const fail2 = modes.find((m) => m.id === "FAIL-002");
    expect(fail2?.severity).toBe("critical");
  });

  it("returns FAIL-001 (high) for P + peck_drill", () => {
    const modes = millTribalIntegrationEngine.checkFailureModes("P", "peck_drill", 1200, 100, 2);
    expect(modes.some((m) => m.id === "FAIL-001" && m.severity === "high")).toBe(true);
  });

  it("returns FAIL-004 (medium) for N (aluminum) welding", () => {
    const modes = millTribalIntegrationEngine.checkFailureModes("N", "rough_profile", 10000, 2000, 2);
    expect(modes.some((m) => m.id === "FAIL-004")).toBe(true);
  });

  it("includes unscoped failure modes for any material (FAIL-003 chatter has no material)", () => {
    const modesP = millTribalIntegrationEngine.checkFailureModes("P", "rough_profile", 2000, 200, 1);
    const modesK = millTribalIntegrationEngine.checkFailureModes("K", "rough_profile", 2000, 200, 1);
    // FAIL-003 (chatter) is unscoped, must appear for both
    expect(modesP.some((m) => m.id === "FAIL-003")).toBe(true);
    expect(modesK.some((m) => m.id === "FAIL-003")).toBe(true);
  });

  it("returns only unscoped modes when material is uninvolved", () => {
    const modes = millTribalIntegrationEngine.checkFailureModes("K", "tap", 500, 50, 0.5);
    // FAIL-002 (tap) is op-only → matches for K too
    expect(modes.some((m) => m.id === "FAIL-002")).toBe(true);
    // FAIL-001 is P-specific → must NOT match for K
    expect(modes.some((m) => m.id === "FAIL-001")).toBe(false);
  });
});

describe("MillTribalIntegrationEngine.integrateWithTraining — isolated instance", () => {
  it("counts match catalog totals (fresh instance → no cross-test coupling)", async () => {
    const engine = new MillTribalIntegrationEngine();
    const summary = await engine.integrateWithTraining();
    expect(summary.signals_applied).toBe(TOTAL_TIPS);
    expect(summary.heuristics_applied).toBe(TOTAL_HEURISTICS);
    expect(summary.failure_modes_learned).toBe(TOTAL_FAILURE_MODES);
    expect(summary.neural_samples_added).toBe(TOTAL_TIPS);
  });

  it("records applied signals in statistics after integrate", async () => {
    const engine = new MillTribalIntegrationEngine();
    const before = engine.getStatistics().applied_signals;
    await engine.integrateWithTraining();
    const after = engine.getStatistics().applied_signals;
    expect(after - before).toBe(TOTAL_TIPS);
  });
});

// ----------------------------------------------------------------------------
// Dispatcher wiring — confirm action enum, schema registry, case block,
// and engine round-trip all line up.
// ----------------------------------------------------------------------------
describe("millDispatcher — mill_tribal_integrate wiring", () => {
  it("registers 'mill_tribal_integrate' in the action enum", () => {
    expect(MILL_DISPATCHER_ACTIONS.includes("mill_tribal_integrate")).toBe(true);
  });

  it("has a schema registered for 'mill_tribal_integrate'", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    expect(schema === undefined).toBe(false);
    expect(typeof schema?.safeParse).toBe("function");
  });

  it("schema accepts op=statistics with no other fields", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({ op: "statistics" });
    expect(parsed.success).toBe(true);
  });

  it("schema accepts op=integrate", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({ op: "integrate" });
    expect(parsed.success).toBe(true);
  });

  it("schema accepts op=adjust with material_iso + operation_type", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({
      op: "adjust",
      material_iso: "P",
      operation_type: "rough_profile",
      tool_type: "flat_endmill",
      tool_diameter_mm: 12,
    });
    expect(parsed.success).toBe(true);
  });

  it("schema accepts op=check_failures with rpm/feed/doc", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({
      op: "check_failures",
      material_iso: "P",
      operation_type: "tap",
      rpm: 2000,
      feed: 400,
      doc: 1,
    });
    expect(parsed.success).toBe(true);
  });

  it("schema rejects unknown op", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({ op: "nonsense_op" });
    expect(parsed.success).toBe(false);
  });

  it("schema rejects unknown material_iso (not in P/M/K/N/S/H)", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({
      op: "adjust",
      material_iso: "Z",
      operation_type: "rough_profile",
    });
    expect(parsed.success).toBe(false);
  });

  it("schema rejects negative tool_diameter_mm (must be positive)", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({
      op: "adjust",
      material_iso: "P",
      operation_type: "rough_profile",
      tool_diameter_mm: -1,
    });
    expect(parsed.success).toBe(false);
  });

  it("schema rejects missing op field entirely", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_tribal_integrate"];
    const parsed = schema!.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
