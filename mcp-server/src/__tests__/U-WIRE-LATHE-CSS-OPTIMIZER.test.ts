/**
 * U-WIRE-LATHE-CSS-OPTIMIZER — wiring-gate test
 * ===============================================
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheCSSOptimizerEngine,
  type CSSOptimizationInput,
} from "../engines/LatheCSSOptimizerEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const CANONICAL: CSSOptimizationInput = {
  Vc_m_min: 250,
  max_od_mm: 50,
  min_od_mm: 5,
  rated_max_rpm: 4000,
  cut_length_mm: 60,
  f_mm_rev: 0.2,
};

describe("U-WIRE-LATHE-CSS-OPTIMIZER — turning-dispatcher wiring", () => {
  it("registers all 3 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ["lathe_css_optimize", "lathe_css_select_mode", "lathe_css_stats"]) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("optimize schema accepts canonical input", () => {
    expect(SCHEMA_MAP["lathe_css_optimize"]!.safeParse(CANONICAL).success).toBe(true);
  });

  it("optimize schema rejects non-positive Vc / max_od / min_od / rated_max_rpm", () => {
    expect(SCHEMA_MAP["lathe_css_optimize"]!.safeParse({ ...CANONICAL, Vc_m_min: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_css_optimize"]!.safeParse({ ...CANONICAL, max_od_mm: -1 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_css_optimize"]!.safeParse({ ...CANONICAL, min_od_mm: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_css_optimize"]!.safeParse({ ...CANONICAL, rated_max_rpm: 0 }).success).toBe(false);
  });

  it("select_mode schema rejects non-positive Vc / diameter / rated_max_rpm", () => {
    expect(SCHEMA_MAP["lathe_css_select_mode"]!.safeParse({
      Vc_m_min: 250, diameter_mm: 0, rated_max_rpm: 4000, feature_length_mm: 10,
    }).success).toBe(false);
  });

  it("dispatcher source contains all 3 actions in enum AND case form", () => {
    for (const a of ["lathe_css_optimize", "lathe_css_select_mode", "lathe_css_stats"]) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  function caseBlock(action: string): string {
    const startIdx = DISPATCHER_SRC.indexOf(`case "${action}":`);
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${action}":`.length);
    return DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
  }

  it("optimize case calls .optimize (negative-guards selectMode/getStats)", () => {
    const block = caseBlock("lathe_css_optimize");
    expect(block.includes("latheCSSOptimizerEngine.optimize(")).toBe(true);
    if (block.includes("latheCSSOptimizerEngine.selectMode(") || block.includes("latheCSSOptimizerEngine.getStats(")) {
      throw new Error("optimize case wired to sibling");
    }
  });

  it("select_mode case calls .selectMode (negative-guards optimize/getStats)", () => {
    const block = caseBlock("lathe_css_select_mode");
    expect(block.includes("latheCSSOptimizerEngine.selectMode(")).toBe(true);
    if (block.includes("latheCSSOptimizerEngine.optimize(") || block.includes("latheCSSOptimizerEngine.getStats(")) {
      throw new Error("select_mode case wired to sibling");
    }
  });

  it("stats case calls .getStats (negative-guards optimize/selectMode)", () => {
    const block = caseBlock("lathe_css_stats");
    expect(block.includes("latheCSSOptimizerEngine.getStats(")).toBe(true);
    if (block.includes("latheCSSOptimizerEngine.optimize(") || block.includes("latheCSSOptimizerEngine.selectMode(")) {
      throw new Error("stats case wired to sibling");
    }
  });
});

describe("U-WIRE-LATHE-CSS-OPTIMIZER — engine semantic round-trip", () => {
  it("optimize formula: RPM at max_od = 1000*Vc / (π*max_od) (integer-rounded)", () => {
    const r = latheCSSOptimizerEngine.optimize(CANONICAL);
    const expected = (1000 * CANONICAL.Vc_m_min) / (Math.PI * CANONICAL.max_od_mm);
    // Engine returns integer-rounded RPM — assert against Math.round of the exact formula.
    expect(r.rpm_at_max_od).toBe(Math.round(expected));
  });

  it("clamp_activates_at_diameter is consistent with recommended_clamp_rpm", () => {
    const r = latheCSSOptimizerEngine.optimize(CANONICAL);
    const expected = (1000 * CANONICAL.Vc_m_min) / (Math.PI * r.recommended_clamp_rpm);
    // Diameter is also rounded — within 1mm tolerance is plenty for this invariant.
    if (Math.abs(r.clamp_activates_at_diameter_mm - expected) > 1) {
      throw new Error(`clamp diameter inconsistent — got ${r.clamp_activates_at_diameter_mm} expected ~${expected}`);
    }
  });

  it("uncapped RPM at min OD exceeds RPM at max OD (smaller D → faster spin)", () => {
    const r = latheCSSOptimizerEngine.optimize(CANONICAL);
    if (r.uncapped_rpm_at_min_od <= r.rpm_at_max_od) {
      throw new Error(`uncapped min-OD RPM should exceed max-OD RPM — got ${r.uncapped_rpm_at_min_od} vs ${r.rpm_at_max_od}`);
    }
  });

  it("rejects min_od_mm > max_od_mm (engine R12 throws)", () => {
    expect(() => latheCSSOptimizerEngine.optimize({ ...CANONICAL, min_od_mm: 100, max_od_mm: 50 })).toThrow();
  });

  it("rejects non-positive diameters (engine R12 throws)", () => {
    expect(() => latheCSSOptimizerEngine.optimize({ ...CANONICAL, min_od_mm: 0 })).toThrow();
    expect(() => latheCSSOptimizerEngine.optimize({ ...CANONICAL, max_od_mm: -1 })).toThrow();
  });

  it("selectMode picks G97 for very short features (length < 5mm)", () => {
    const r = latheCSSOptimizerEngine.selectMode(250, 25, 4000, 3);
    expect(r.mode).toBe("G97");
    expect(typeof r.rpm).toBe("number");
    expect(r.rpm).toBeGreaterThan(0);
  });

  it("selectMode for a long feature returns G96 (CSS is worth it)", () => {
    const r = latheCSSOptimizerEngine.selectMode(250, 25, 4000, 100);
    expect(r.mode).toBe("G96");
  });

  it("selectMode RPM caps at rated_max_rpm (small-diameter clamp invariant)", () => {
    // Vc=500, D=1 → uncapped RPM ~ 159000. Must clamp to rated_max_rpm.
    const r = latheCSSOptimizerEngine.selectMode(500, 1, 4000, 100);
    expect(r.rpm).toBeLessThanOrEqual(4000);
  });

  it("getStats returns canonical RPM=1000*Vc/(π*D) formula + 0.95 safety_factor", () => {
    const s = latheCSSOptimizerEngine.getStats();
    expect(Array.isArray(s.formulas)).toBe(true);
    expect(s.formulas.length).toBeGreaterThanOrEqual(3);
    if (!s.formulas.some((f) => /RPM\s*=.*Vc.*D/i.test(f))) {
      throw new Error(`getStats missing canonical RPM=1000*Vc/(π*D) formula — got ${JSON.stringify(s.formulas)}`);
    }
    // safety_factor is 0.95 per engine (5% margin on rated_max_rpm).
    expect(s.safety_factor).toBe(0.95);
  });
});
