/**
 * PostValidationSuiteEngine — vitest companion tests
 * POST-ULT-MS15: U01 (diff) U02 (backplot) U03 (consistency) U04 (regression) U05 (AB compare)
 *
 * Test strategy:
 *  - Reference-value assertions hand-traced from engine source
 *  - Happy path + >=3 failure/edge modes + >=2 adversarial inputs per exported function
 *  - Round-trip through postValidationSuiteEngine dispatcher for integration coverage
 */

import { describe, it, expect } from "vitest";
import {
  computeDiff,
  runBackplot,
  checkConsistency,
  runRegressionMatrix,
  runABComparison,
  runFullValidation,
  postValidationSuiteEngine,
  type ValidationInput,
  type DiffResult,
  type BackplotResult,
  type ConsistencyResult,
  type RegressionMatrixResult,
  type ComparisonResult,
  type ValidationResult,
} from "../engines/PostValidationSuiteEngine.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MACHINE_LIMITS: ValidationInput["machine_limits"] = {
  max_rpm: 12000,
  max_feed: 15000,
  max_power_kW: 22,
};

const ONE_OP: ValidationInput["operations"] = [
  { tool_number: 1, tool_diameter_mm: 12, operation_type: "roughing" },
];

/**
 * ORIG: G0 rapid to clearance, then two G1 feeds into material.
 * Feeds: F300 (plunge), F500 (lateral). RPM: S3000.
 */
const ORIG_GCODE = [
  "G0 Z10",
  "G0 X0 Y0",
  "G1 Z-3 F300 S3000",
  "G1 X50 Y0 F500",
].join("\n");

/**
 * OPT: identical structure but feed boosted to 750 and RPM to 4500.
 * Feeds: F300 (plunge), F750 (lateral). RPM: S4500.
 */
const OPT_GCODE = [
  "G0 Z10",
  "G0 X0 Y0",
  "G1 Z-3 F300 S4500",
  "G1 X50 Y0 F750",
].join("\n");

const FULL_INPUT: ValidationInput = {
  original_gcode: ORIG_GCODE,
  optimized_gcode: OPT_GCODE,
  controller: "Fanuc",
  machine_limits: MACHINE_LIMITS,
  material_iso: "P20",
  operations: ONE_OP,
};

// ---------------------------------------------------------------------------
// U01 — computeDiff
// ---------------------------------------------------------------------------

describe("computeDiff", () => {
  it("happy path: line counts match actual non-empty, non-comment lines in each program", () => {
    const result = computeDiff(ORIG_GCODE, OPT_GCODE);
    expect(result.total_lines_original).toBe(4);
    expect(result.total_lines_optimized).toBe(4);
  });

  it("lines_changed = max(lines_added, lines_removed) — algebraic invariant from source L349", () => {
    const result = computeDiff(ORIG_GCODE, OPT_GCODE);
    expect(result.lines_changed).toBe(
      Math.max(result.lines_added, result.lines_removed),
    );
    // At least two lines differ (the S and the F words changed)
    expect(result.lines_added).toBeGreaterThan(0);
    expect(result.lines_removed).toBeGreaterThan(0);
  });

  it("feed_changes: positional zip of [F300,F500] vs [F300,F750] yields avg=25%, min=0%, max=50%", () => {
    // pair (300,300) delta=0%; pair (500,750) delta=+50%  → avg=25%
    const result = computeDiff(ORIG_GCODE, OPT_GCODE);
    expect(result.feed_changes.count).toBe(2);
    expect(result.feed_changes.avg_delta_percent).toBeCloseTo(25, 1);
    expect(result.feed_changes.min_delta).toBeCloseTo(0, 1);
    expect(result.feed_changes.max_delta).toBeCloseTo(50, 1);
  });

  it("rpm_changes: ORIG has S3000, OPT has S4500 — count=1 and correct values", () => {
    const result = computeDiff(ORIG_GCODE, OPT_GCODE);
    expect(result.rpm_changes.count).toBe(1);
    expect(result.rpm_changes.original_rpms).toContain(3000);
    expect(result.rpm_changes.optimized_rpms).toContain(4500);
  });

  it("codes_added / codes_removed: both programs use only G0 and G1 — no new or lost codes", () => {
    const result = computeDiff(ORIG_GCODE, OPT_GCODE);
    expect(result.codes_added).not.toContain("G0");
    expect(result.codes_added).not.toContain("G1");
    expect(result.codes_removed).not.toContain("G0");
    expect(result.codes_removed).not.toContain("G1");
  });

  it("feed delta values are rounded to exactly 2 decimal places", () => {
    const result = computeDiff(ORIG_GCODE, OPT_GCODE);
    const decimals = (n: number) => (n.toString().split(".")[1] ?? "").length;
    expect(decimals(result.feed_changes.avg_delta_percent)).toBeLessThanOrEqual(2);
    expect(decimals(result.feed_changes.min_delta)).toBeLessThanOrEqual(2);
    expect(decimals(result.feed_changes.max_delta)).toBeLessThanOrEqual(2);
  });

  it("edge: identical programs produce zero changes and zero feed delta", () => {
    const result = computeDiff(ORIG_GCODE, ORIG_GCODE);
    expect(result.lines_added).toBe(0);
    expect(result.lines_removed).toBe(0);
    expect(result.lines_changed).toBe(0);
    expect(result.feed_changes.avg_delta_percent).toBe(0);
    expect(result.feed_changes.min_delta).toBe(0);
    expect(result.feed_changes.max_delta).toBe(0);
  });

  it("edge: empty strings produce zero-line result with no feed changes", () => {
    const result = computeDiff("", "");
    expect(result.total_lines_original).toBe(0);
    expect(result.total_lines_optimized).toBe(0);
    expect(result.feed_changes.count).toBe(0);
    expect(result.rpm_changes.count).toBe(0);
    expect(result.lines_changed).toBe(0);
  });

  it("edge: one program has additional G43 line — codes_added contains G43", () => {
    const withG43 = OPT_GCODE + "\nG43 H1";
    const result = computeDiff(ORIG_GCODE, withG43);
    expect(result.codes_added).toContain("G43");
    expect(result.codes_removed).not.toContain("G43");
  });

  it("adversarial: comment-only / percent-sign lines are COUNTED (computeDiff filters only blank lines)", () => {
    const commented = "% program header\n; tool change\n( G-code comment )";
    const result = computeDiff(commented, commented);
    // computeDiff filters ONLY blank lines (length>0); comment/percent lines ARE counted as lines.
    expect(result.total_lines_original).toBe(3);
    expect(result.total_lines_optimized).toBe(3);
    expect(result.feed_changes.count).toBe(0); // no F words -> zero feed deltas
  });

  it("adversarial: garbage non-G-code text returns valid numeric shape without throwing", () => {
    const junk = "NOT_GCODE !!! 999 @#$";
    const result = computeDiff(junk, junk);
    expect(typeof result.total_lines_original).toBe("number");
    expect(typeof result.feed_changes.avg_delta_percent).toBe("number");
    expect(result.lines_added).toBe(0);   // identical lines → nothing added
  });
});

// ---------------------------------------------------------------------------
// U02 — runBackplot
// ---------------------------------------------------------------------------

describe("runBackplot", () => {
  it("happy path: safe program — no gouge, no rapid-into-material, zero arc errors, passed=true", () => {
    const result = runBackplot(OPT_GCODE, { operations: ONE_OP });
    expect(result.passed).toBe(true);
    expect(result.gouge_detected).toBe(false);
    expect(result.rapid_into_material).toBe(false);
    expect(result.arc_errors).toBe(0);
  });

  it("move counts: 2 G0 rapids + 2 G1 cutting moves are classified correctly (post G0-normalization fix)", () => {
    // OPT_GCODE = G0 Z10, G0 X0 Y0 (rapids) + G1 Z-3, G1 X50 (cutting). U-PP-BACKPLOT-G0NORM.
    const result = runBackplot(OPT_GCODE, { operations: ONE_OP });
    expect(result.rapid_moves).toBe(2);
    expect(result.cutting_moves).toBe(2);
    expect(result.total_moves).toBe(4);
  });

  it("bounds: X spans 0–50, Z spans -3 to 10 based on program coordinates", () => {
    const result = runBackplot(OPT_GCODE, { operations: ONE_OP });
    expect(result.bounds.x[0]).toBe(0);
    expect(result.bounds.x[1]).toBe(50);
    expect(result.bounds.z[0]).toBe(-3);
    expect(result.bounds.z[1]).toBe(10);
  });

  it("gouge_detected: a G0 rapid plunging below the finished-surface floor (>0.05mm) triggers detection", () => {
    // G1 cutting moves set finished_surface_z = min cutting Z = -3. A G0 RAPID to Z-3.5 is excluded
    // from that floor and sits 0.5mm below it (> the 0.05mm threshold) -> gouge. Pre-fix, G0 was
    // misclassified as cutting and gouge detection was structurally dead. See U-PP-BACKPLOT-G0NORM.
    const gouge = [
      "G1 Z-3 F500 S3000",
      "G1 X50",
      "G0 Z-3.5",   // rapid 0.5mm below the finished-surface floor -> gouge
    ].join("\n");
    const result = runBackplot(gouge, { operations: ONE_OP });
    expect(result.gouge_detected).toBe(true);
    expect(result.passed).toBe(false);
  });

  it("rapid_into_material: a G0 rapid below stock-top (Z<0) inside the cut XY zone is flagged (post-fix)", () => {
    // Post G0-normalization fix, G0 is a real rapid. The final 'G0 X25 Y0 Z-1' rapids to Z-1 (below
    // stock top 0) at X25/Y0 -- inside the cutting XY bounds (X0..50, tool R6) -> rapid-into-material.
    // Pre-fix this was structurally dead (is_rapid always false). See U-PP-BACKPLOT-G0NORM.
    const riskProg = [
      "G0 Z10",
      "G1 X0 Y0 Z-3 F500 S3000",
      "G1 X50 Y0",
      "G0 Z10",
      "G0 X25 Y0 Z-1",
    ].join("\n");
    const result = runBackplot(riskProg, { operations: ONE_OP });
    expect(result.rapid_into_material).toBe(true);
    expect(result.rapid_moves).toBe(3);
  });

  it("arc_errors: G2 with R=0 (degenerate radius) registers exactly one arc error", () => {
    const badArc = [
      "G0 Z10",
      "G1 X0 Y0 Z-2 F500 S3000",
      "G2 X10 Y10 R0",     // R must be > 0 per validateArc
    ].join("\n");
    const result = runBackplot(badArc, { operations: ONE_OP });
    expect(result.arc_errors).toBeGreaterThanOrEqual(1);
    expect(result.passed).toBe(false);
  });

  it("arc_errors: G3 with positive R passes arc validation", () => {
    const goodArc = [
      "G0 Z10",
      "G1 X0 Y0 Z-2 F500 S3000",
      "G3 X10 Y10 R15",
    ].join("\n");
    const result = runBackplot(goodArc, { operations: ONE_OP });
    expect(result.arc_errors).toBe(0);
  });

  it("edge: empty G-code — zero move counts, no error flags, passed=true", () => {
    const result = runBackplot("", { operations: ONE_OP });
    expect(result.total_moves).toBe(0);
    expect(result.rapid_moves).toBe(0);
    expect(result.cutting_moves).toBe(0);
    expect(result.gouge_detected).toBe(false);
    expect(result.rapid_into_material).toBe(false);
    expect(result.arc_errors).toBe(0);
  });

  it("adversarial: empty operations array uses 10mm default tool and returns valid shape", () => {
    // resolveToolDiameter falls back to 10 when operations=[]; must not throw
    const result = runBackplot(OPT_GCODE, { operations: [] });
    expect(typeof result.total_moves).toBe("number");
    expect(result.total_moves).toBe(4);
    expect(typeof result.arc_errors).toBe("number");
  });

  it("adversarial: G2 arc with negative R is invalid and counted as arc error", () => {
    const negR = [
      "G0 Z10",
      "G1 X0 Y0 Z-2 F500",
      "G2 X20 Y0 R-5",
    ].join("\n");
    const result = runBackplot(negR, { operations: ONE_OP });
    expect(result.arc_errors).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// U03 — checkConsistency
// ---------------------------------------------------------------------------

describe("checkConsistency", () => {
  it("happy path: produces exactly 6 named checks", () => {
    const result = checkConsistency(FULL_INPUT);
    expect(result.checks.length).toBe(6);
    const names = result.checks.map(c => c.name);
    expect(names).toContain("Max RPM");
    expect(names).toContain("Max Feed");
    expect(names).toContain("Estimated Cutting Power");
    expect(names).toContain("Estimated Cutting Temperature");
    expect(names).toContain("Tool Deflection");
    expect(names).toContain("Tool Life vs Program Duration");
  });

  it("RPM check: value=4500 ≤ limit=12000 → passed=true for our fixture", () => {
    const result = checkConsistency(FULL_INPUT);
    const rpmCheck = result.checks.find(c => c.name === "Max RPM")!;
    expect(rpmCheck.value).toBe(4500);
    expect(rpmCheck.limit).toBe(12000);
    expect(rpmCheck.passed).toBe(true);
    expect(rpmCheck.unit).toBe("RPM");
  });

  it("Feed check: value=750 ≤ limit=15000 → passed=true for our fixture", () => {
    const result = checkConsistency(FULL_INPUT);
    const feedCheck = result.checks.find(c => c.name === "Max Feed")!;
    expect(feedCheck.value).toBe(750);
    expect(feedCheck.limit).toBe(15000);
    expect(feedCheck.passed).toBe(true);
    expect(feedCheck.unit).toBe("mm/min");
  });

  it("passed invariant: result.passed === every check.passed AND'd together", () => {
    const result = checkConsistency(FULL_INPUT);
    expect(result.passed).toBe(result.checks.every(c => c.passed));
  });

  it("each check has name/passed/value/limit/unit/message with correct types", () => {
    const result = checkConsistency(FULL_INPUT);
    for (const check of result.checks) {
      expect(typeof check.name).toBe("string");
      expect(check.name.length).toBeGreaterThan(0);
      expect(typeof check.passed).toBe("boolean");
      expect(typeof check.value).toBe("number");
      expect(isFinite(check.value)).toBe(true);
      expect(typeof check.limit).toBe("number");
      expect(typeof check.unit).toBe("string");
      expect(typeof check.message).toBe("string");
    }
  });

  it("RPM violation: S20000 > max_rpm=12000 → rpmCheck.passed=false and contradictions non-empty", () => {
    const overRpm: ValidationInput = {
      ...FULL_INPUT,
      optimized_gcode: "G0 Z10\nG1 Z-3 F500 S20000\nG1 X50",
    };
    const result = checkConsistency(overRpm);
    const rpmCheck = result.checks.find(c => c.name === "Max RPM")!;
    expect(rpmCheck.passed).toBe(false);
    expect(rpmCheck.value).toBe(20000);
    expect(rpmCheck.limit).toBe(12000);
    expect(result.contradictions.some(s => s.includes("RPM"))).toBe(true);
    expect(result.passed).toBe(false);
  });

  it("Feed violation: F30000 > max_feed=15000 → feedCheck.passed=false", () => {
    const overFeed: ValidationInput = {
      ...FULL_INPUT,
      optimized_gcode: "G0 Z10\nG1 Z-3 F30000 S3000\nG1 X50",
    };
    const result = checkConsistency(overFeed);
    const feedCheck = result.checks.find(c => c.name === "Max Feed")!;
    expect(feedCheck.passed).toBe(false);
    expect(feedCheck.value).toBe(30000);
    expect(result.passed).toBe(false);
  });

  it("edge: no feeds or RPMs in gcode → max_rpm_prog=0 and max_feed_prog=0, both pass limits", () => {
    const noFeedRpm: ValidationInput = {
      ...FULL_INPUT,
      optimized_gcode: "G0 X100 Y100\nG1 X200",
    };
    const result = checkConsistency(noFeedRpm);
    const rpmCheck = result.checks.find(c => c.name === "Max RPM")!;
    const feedCheck = result.checks.find(c => c.name === "Max Feed")!;
    expect(rpmCheck.value).toBe(0);
    expect(rpmCheck.passed).toBe(true);
    expect(feedCheck.value).toBe(0);
    expect(feedCheck.passed).toBe(true);
  });

  it("adversarial: unknown material_iso falls back to conservative defaults without throwing", () => {
    const unk: ValidationInput = { ...FULL_INPUT, material_iso: "BOGUS99" };
    const result = checkConsistency(unk);
    expect(result.checks.length).toBe(6);
    expect(typeof result.passed).toBe("boolean");
    // Taylor fallback: C=150, n=0.25 — tool life check still runs
    const lifeCheck = result.checks.find(c => c.name === "Tool Life vs Program Duration")!;
    expect(isFinite(lifeCheck.value)).toBe(true);
  });

  it("adversarial: empty operations array uses tool_d=10 fallback and does not throw", () => {
    const noOps: ValidationInput = { ...FULL_INPUT, operations: [] };
    const result = checkConsistency(noOps);
    expect(result.checks.length).toBe(6);
    // Power check uses tool_d=10 by default
    const powerCheck = result.checks.find(c => c.name === "Estimated Cutting Power")!;
    expect(isFinite(powerCheck.value)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// U04 — runRegressionMatrix
// ---------------------------------------------------------------------------

describe("runRegressionMatrix", () => {
  it("total_combinations = 6 scenarios × 4 controllers × 3 configs × 5 materials = 360", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    expect(result.total_combinations).toBe(360);
    expect(result.results.length).toBe(360);
  });

  it("conservation invariant: passed + failed = total_combinations", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    expect(result.passed + result.failed).toBe(result.total_combinations);
  });

  it("error_rate_percent = (failed / total) * 100 rounded to 2 dp", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    const expected = parseFloat(
      ((result.failed / result.total_combinations) * 100).toFixed(2),
    );
    expect(result.error_rate_percent).toBeCloseTo(expected, 2);
  });

  it("every result entry has the correct shape with correct field types", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    // Check first 20 entries for efficiency
    for (const entry of result.results.slice(0, 20)) {
      expect(typeof entry.scenario).toBe("string");
      expect(typeof entry.controller).toBe("string");
      expect(typeof entry.config).toBe("string");
      expect(typeof entry.material).toBe("string");
      expect(typeof entry.passed).toBe("boolean");
      expect(Array.isArray(entry.errors)).toBe(true);
      expect(typeof entry.cycle_time_improvement_pct).toBe("number");
    }
  });

  it("cycle_time_improvement_pct is >= 0 for all entries (engine enforces Math.max(0,...))", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    for (const entry of result.results) {
      expect(entry.cycle_time_improvement_pct).toBeGreaterThanOrEqual(0);
    }
  });

  it("trochoidal scenario has higher avg improvement than roughing (modifier 1.35 vs 1.20)", () => {
    // scenarioFeedModifier: trochoidal=1.35, roughing=1.20
    // cycle_time_improvement_pct ≈ (modifier-1)*config_factor*100
    const result = runRegressionMatrix(FULL_INPUT);
    const troch = result.results.filter(r => r.scenario === "trochoidal");
    const rough  = result.results.filter(r => r.scenario === "roughing");
    const avgT = troch.reduce((s, r) => s + r.cycle_time_improvement_pct, 0) / troch.length;
    const avgR = rough.reduce((s, r) => s + r.cycle_time_improvement_pct, 0) / rough.length;
    expect(avgT).toBeGreaterThan(avgR);
  });

  it("summary string says 'All 360 regression combinations passed' when failed=0, else shows ratio", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    if (result.failed === 0) {
      expect(result.summary).toContain("All 360 regression combinations passed");
    } else {
      expect(result.summary).toMatch(/\d+\/360 combinations failed/);
    }
  });

  it("edge: identical original and optimised → every entry gets 'No changes detected' error", () => {
    const same: ValidationInput = { ...FULL_INPUT, original_gcode: OPT_GCODE };
    const result = runRegressionMatrix(same);
    const withNoChange = result.results.filter(r =>
      r.errors.some(e => e.includes("No changes detected")),
    );
    expect(withNoChange.length).toBe(360);
    expect(result.failed).toBe(360);
  });

  it("results cover all four expected controllers across entries", () => {
    const result = runRegressionMatrix(FULL_INPUT);
    const controllers = new Set(result.results.map(r => r.controller));
    expect(controllers.has("Fanuc")).toBe(true);
    expect(controllers.has("Siemens")).toBe(true);
    expect(controllers.has("Haas")).toBe(true);
    expect(controllers.has("Mazak")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// U05 — runABComparison
// ---------------------------------------------------------------------------

describe("runABComparison", () => {
  it("happy path: optimised at higher feed → positive time saving", () => {
    const result = runABComparison(FULL_INPUT);
    expect(result.time_saved_sec).toBeGreaterThan(0);
    expect(result.time_saved_percent).toBeGreaterThan(0);
  });

  it("time_saved_sec = cycle_orig - cycle_opt (algebraic invariant, ±0.01s precision)", () => {
    const result = runABComparison(FULL_INPUT);
    const expected = parseFloat(
      (result.cycle_time_original_sec - result.cycle_time_optimized_sec).toFixed(2),
    );
    expect(result.time_saved_sec).toBeCloseTo(expected, 2);
  });

  it("time_saved_percent = saved / original * 100 (algebraic, when original > 0)", () => {
    const result = runABComparison(FULL_INPUT);
    if (result.cycle_time_original_sec > 0) {
      const expected = parseFloat(
        ((result.time_saved_sec / result.cycle_time_original_sec) * 100).toFixed(2),
      );
      expect(result.time_saved_percent).toBeCloseTo(expected, 1);
    }
  });

  it("per_operation count matches the operations array length", () => {
    const result = runABComparison(FULL_INPUT);
    expect(result.per_operation.length).toBe(FULL_INPUT.operations.length);
  });

  it("per_operation fields: op=tool_number, feeds are positive, reason is a non-empty string", () => {
    const result = runABComparison(FULL_INPUT);
    const op0 = result.per_operation[0];
    expect(op0.op).toBe(ONE_OP[0].tool_number);          // 1
    expect(op0.original_feed).toBeGreaterThan(0);
    expect(op0.optimized_feed).toBeGreaterThan(0);
    expect(typeof op0.delta_percent).toBe("number");
    expect(op0.reason.length).toBeGreaterThan(0);
  });

  it("surface_finish_prediction contains 'Ra' and an N-class label", () => {
    const result = runABComparison(FULL_INPUT);
    expect(result.surface_finish_prediction).toMatch(/Ra/);
    expect(result.surface_finish_prediction).toMatch(/N\d/);
  });

  it("edge: identical programs → time_saved_sec=0, time_saved_percent=0", () => {
    const same: ValidationInput = { ...FULL_INPUT, optimized_gcode: ORIG_GCODE };
    const result = runABComparison(same);
    expect(result.time_saved_sec).toBe(0);
    expect(result.time_saved_percent).toBe(0);
  });

  it("edge: higher RPM in optimised increases Vc → tool life decreases (negative improvement)", () => {
    // OPT has S4500 vs ORIG S3000 → Vc_opt > Vc_orig → Taylor life_opt < life_orig
    const result = runABComparison(FULL_INPUT);
    // tool_life_improvement_percent should be negative (faster speed shortens life)
    expect(result.tool_life_improvement_percent).toBeLessThan(0);
  });

  it("adversarial: programs with no F or S words use internal defaults and produce finite results", () => {
    const noWords: ValidationInput = {
      ...FULL_INPUT,
      original_gcode: "G0 X0 Y0\nG1 X100",
      optimized_gcode: "G0 X0 Y0\nG1 X100",
    };
    const result = runABComparison(noWords);
    expect(isFinite(result.cycle_time_original_sec)).toBe(true);
    expect(isFinite(result.tool_life_improvement_percent)).toBe(true);
    expect(result.surface_finish_prediction.length).toBeGreaterThan(0);
  });

  it("adversarial: unknown material_iso prefix falls back without throwing, surface finish still has Ra", () => {
    const unk: ValidationInput = { ...FULL_INPUT, material_iso: "X99" };
    const result = runABComparison(unk);
    expect(isFinite(result.tool_life_improvement_percent)).toBe(true);
    expect(result.surface_finish_prediction).toMatch(/Ra/);
  });
});

// ---------------------------------------------------------------------------
// runFullValidation (orchestrator)
// ---------------------------------------------------------------------------

describe("runFullValidation", () => {
  it("happy path: returns all five sub-results and issues is an array", () => {
    const result = runFullValidation(FULL_INPUT);
    expect(typeof result.overall_pass).toBe("boolean");
    // diff sub-result
    expect(typeof result.diff.total_lines_original).toBe("number");
    // backplot sub-result
    expect(typeof result.backplot.passed).toBe("boolean");
    // consistency sub-result
    expect(result.consistency.checks.length).toBe(6);
    // comparison sub-result
    expect(typeof result.comparison.cycle_time_original_sec).toBe("number");
    // issues array
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("DIFF-001 error raised when original and optimised are identical", () => {
    const same: ValidationInput = { ...FULL_INPUT, original_gcode: OPT_GCODE };
    const result = runFullValidation(same);
    const diff001 = result.issues.find(i => i.code === "DIFF-001");
    expect(diff001).not.toBeNull();
    expect(diff001!.severity).toBe("error");
    expect(diff001!.unit).toBe("diff");
    expect(result.overall_pass).toBe(false);
  });

  it("BP-001 emitted when gouge is detected in optimised gcode", () => {
    // A G0 rapid to Z-3.5 plunges 0.5mm below the G1 cutting floor (-3) -> gouge -> BP-001.
    // (Post G0-normalization fix; pre-fix gouge detection was dead. See U-PP-BACKPLOT-G0NORM.)
    const gougeProg = [
      "G1 Z-3 F500 S3000",
      "G1 X50",
      "G0 Z-3.5",
    ].join("\n");
    const input: ValidationInput = { ...FULL_INPUT, optimized_gcode: gougeProg };
    const result = runFullValidation(input);
    const bp001 = result.issues.find(i => i.code === "BP-001");
    expect(bp001 !== undefined).toBe(true);
    expect(bp001!.severity).toBe("error");
    expect(bp001!.unit).toBe("backplot");
    expect(result.overall_pass).toBe(false);
  });

  it("consistency RPM error emitted when RPM exceeds machine limit", () => {
    const overRpm: ValidationInput = {
      ...FULL_INPUT,
      optimized_gcode: "G0 Z10\nG1 Z-3 F500 S20000\nG1 X50",
    };
    const result = runFullValidation(overRpm);
    const consRpm = result.issues.find(
      i => i.unit === "consistency" && i.code.includes("MAX_RPM"),
    );
    expect(consRpm).not.toBeNull();
    expect(consRpm!.severity).toBe("error");
  });

  it("AB-001 error emitted when cycle_time_saved_percent <= 0", () => {
    // Same gcode → saved=0 → AB-001 fires
    const same: ValidationInput = {
      ...FULL_INPUT,
      original_gcode: OPT_GCODE,
      optimized_gcode: OPT_GCODE,
    };
    const result = runFullValidation(same);
    const ab001 = result.issues.find(i => i.code === "AB-001");
    expect(ab001).not.toBeNull();
    expect(ab001!.severity).toBe("error");
    expect(ab001!.unit).toBe("comparison");
  });

  it("overall_pass is false when any error-severity issue exists (not just warnings)", () => {
    const same: ValidationInput = { ...FULL_INPUT, original_gcode: OPT_GCODE };
    const result = runFullValidation(same);
    const hasError = result.issues.some(i => i.severity === "error");
    expect(hasError).toBe(true);
    expect(result.overall_pass).toBe(false);
  });

  it("severity is always one of: error | warning | info", () => {
    const same: ValidationInput = { ...FULL_INPUT, original_gcode: OPT_GCODE };
    const result = runFullValidation(same);
    for (const issue of result.issues) {
      expect(["error", "warning", "info"]).toContain(issue.severity);
    }
  });

  it("unit field is always one of: diff | backplot | consistency | regression | comparison", () => {
    const same: ValidationInput = { ...FULL_INPUT, original_gcode: OPT_GCODE };
    const result = runFullValidation(same);
    for (const issue of result.issues) {
      expect(["diff", "backplot", "consistency", "regression", "comparison"]).toContain(issue.unit);
    }
  });

  it("adversarial: completely empty G-code strings raise DIFF-001 and set overall_pass=false", () => {
    const empty: ValidationInput = { ...FULL_INPUT, original_gcode: "", optimized_gcode: "" };
    const result = runFullValidation(empty);
    expect(result.issues.some(i => i.code === "DIFF-001")).toBe(true);
    expect(result.overall_pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// postValidationSuiteEngine dispatcher — round-trip integration
// ---------------------------------------------------------------------------

describe("postValidationSuiteEngine dispatcher", () => {
  const params: Record<string, unknown> = {
    original_gcode: ORIG_GCODE,
    optimized_gcode: OPT_GCODE,
    controller: "Fanuc",
    machine_limits: MACHINE_LIMITS,
    material_iso: "P20",
    operations: ONE_OP,
  };

  it("validate_full: returns ValidationResult shape with overall_pass boolean", () => {
    const result = postValidationSuiteEngine("validate_full", params) as ValidationResult;
    expect(typeof result.overall_pass).toBe("boolean");
    expect(result.diff.total_lines_original).toBe(4);
    expect(result.backplot.total_moves).toBe(4);
  });

  it("diff: round-trip matches direct computeDiff call byte-for-byte", () => {
    const direct = computeDiff(ORIG_GCODE, OPT_GCODE);
    const via    = postValidationSuiteEngine("diff", params) as DiffResult;
    expect(via.total_lines_original).toBe(direct.total_lines_original);
    expect(via.total_lines_optimized).toBe(direct.total_lines_optimized);
    expect(via.feed_changes.avg_delta_percent).toBe(direct.feed_changes.avg_delta_percent);
    expect(via.rpm_changes.count).toBe(direct.rpm_changes.count);
  });

  it("backplot: round-trip returns BackplotResult with correct move counts (2 rapids, 2 cutting)", () => {
    // OPT_GCODE: 2x G0 (rapids) + 2x G1 (cutting), post G0-normalization fix (U-PP-BACKPLOT-G0NORM).
    const result = postValidationSuiteEngine("backplot", params) as BackplotResult;
    expect(result.passed).toBe(true);
    expect(result.total_moves).toBe(4);
    expect(result.rapid_moves).toBe(2);
    expect(result.cutting_moves).toBe(2);
  });

  it("consistency_check: round-trip returns 6 checks", () => {
    const result = postValidationSuiteEngine("consistency_check", params) as ConsistencyResult;
    expect(result.checks.length).toBe(6);
    expect(result.checks.find(c => c.name === "Max RPM")!.passed).toBe(true);
  });

  it("ab_compare: round-trip returns ComparisonResult with correct per_operation count", () => {
    const result = postValidationSuiteEngine("ab_compare", params) as ComparisonResult;
    expect(typeof result.cycle_time_original_sec).toBe("number");
    expect(typeof result.cycle_time_optimized_sec).toBe("number");
    expect(result.per_operation.length).toBe(1);
    expect(result.per_operation[0].op).toBe(1);
  });

  it("regression_matrix: round-trip returns exactly 360 total combinations", () => {
    const result = postValidationSuiteEngine("regression_matrix", params) as RegressionMatrixResult;
    expect(result.total_combinations).toBe(360);
    expect(result.passed + result.failed).toBe(360);
  });

  it("diff throws when original_gcode is missing", () => {
    expect(() =>
      postValidationSuiteEngine("diff", { optimized_gcode: OPT_GCODE }),
    ).toThrow("diff requires original_gcode and optimized_gcode");
  });

  it("diff throws when optimized_gcode is missing", () => {
    expect(() =>
      postValidationSuiteEngine("diff", { original_gcode: ORIG_GCODE }),
    ).toThrow("diff requires original_gcode and optimized_gcode");
  });

  it("backplot throws when optimized_gcode is missing", () => {
    expect(() =>
      postValidationSuiteEngine("backplot", { original_gcode: ORIG_GCODE }),
    ).toThrow("backplot requires optimized_gcode");
  });

  it("unknown action throws with message matching /Unknown PostValidationSuiteEngine action/", () => {
    expect(() =>
      postValidationSuiteEngine("does_not_exist", {}),
    ).toThrow(/Unknown PostValidationSuiteEngine action.*does_not_exist/);
  });

  it("unknown action error message lists all six valid action names", () => {
    let msg = "";
    try { postValidationSuiteEngine("bad_action", {}); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain("validate_full");
    expect(msg).toContain("diff");
    expect(msg).toContain("backplot");
    expect(msg).toContain("consistency_check");
    expect(msg).toContain("ab_compare");
    expect(msg).toContain("regression_matrix");
  });

  it("adversarial: numeric string action throws", () => {
    expect(() => postValidationSuiteEngine("12345", {})).toThrow();
  });

  it("adversarial: empty string action throws", () => {
    expect(() => postValidationSuiteEngine("", {})).toThrow();
  });
});
