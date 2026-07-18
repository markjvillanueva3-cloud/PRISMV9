import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmLoRASafetyEvaluatorEngine,
  type WedmSafetyConfig,
} from "./WEDMLoRASafetyEvaluatorEngine.js";

/**
 * Test coverage for U-WCTP-A2b-SAFETY — WEDMLoRASafetyEvaluatorEngine.
 *
 * Comprehensive-build-enforce coverage:
 *   - Happy path                        — well-formed WEDM output passes
 *   - 3 failure modes                   — out-of-envelope diameter / tension / pulse-energy
 *   - 2 adversarial inputs              — empty + 6-digit numeric overflow
 *   - 3+ variability configurations     — FA-10S, Sodick NF80, Mitsubishi MV2400
 *   - Critical-pattern hard vetoes      — dry-fire, oversized diameter, runaway parameter
 *   - Per-axis isolation                — each axis can be assessed independently
 *   - S(x) threshold gate               — shop_floor vs production tiers
 *
 * Named constants mirror the engine's DEFAULT_CONFIG so the test stays
 * anchored to documented behavior rather than engine internals.
 */

// shared test constants
const SHOP_FLOOR_SX = 0.70;     // CLAUDE.md §safety gates shop_floor tier
const PRODUCTION_SX = 0.95;     // production-release tier
const WIRE_W = 0.30;
const DIELECTRIC_W = 0.25;
const THERMAL_W = 0.25;
const FIXATION_W = 0.20;
const NF80_MAX_IP_A = 63.5;     // Sodick NF80 generator-tier ceiling
const FA10S_MAX_IP_A = 50;      // FA-10S generator-tier ceiling (default)
const CLEAN_PROGRAM =
  "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm wire tension 12 N flushing 8 bar T_ON 6 us IP 2 A " +
  "AWT recovery armed dielectric conductivity verify anti-electrolysis on wire-break-detect armed thickness 12.7 mm verify";

describe("WEDMLoRASafetyEvaluatorEngine", () => {
  beforeEach(() => {
    wedmLoRASafetyEvaluatorEngine.setConfig({
      limits: {
        max_wire_diameter_mm: 0.36,
        min_wire_diameter_mm: 0.05,
        max_wire_tension_n: 25,
        max_flushing_pressure_bar: 20,
        max_pulse_on_us: 50,
        max_peak_current_a: FA10S_MAX_IP_A,
        max_thickness_mm: 300,
      },
      require_double_m78: true,
      require_awt_recovery: true,
      safety_keywords_required: 2,
      s_x_threshold: SHOP_FLOOR_SX,
    });
  });

  it("setConfig merges with current; getConfig returns defensive copy of nested limits", () => {
    wedmLoRASafetyEvaluatorEngine.setConfig({ s_x_threshold: PRODUCTION_SX });
    const a = wedmLoRASafetyEvaluatorEngine.getConfig();
    a.s_x_threshold = 0.01;
    a.limits.max_wire_diameter_mm = 99;
    const b = wedmLoRASafetyEvaluatorEngine.getConfig();
    expect(b.s_x_threshold).toBe(PRODUCTION_SX);
    expect(b.limits.max_wire_diameter_mm).toBe(0.36);
  });

  it("setConfig limits patch merges (preserves untouched limits)", () => {
    wedmLoRASafetyEvaluatorEngine.setConfig({ limits: { max_peak_current_a: NF80_MAX_IP_A } as WedmSafetyConfig["limits"] });
    const cfg = wedmLoRASafetyEvaluatorEngine.getConfig();
    expect(cfg.limits.max_peak_current_a).toBe(NF80_MAX_IP_A);
    expect(cfg.limits.max_wire_diameter_mm).toBe(0.36);
    expect(cfg.limits.max_pulse_on_us).toBe(50);
    expect(cfg.limits.max_thickness_mm).toBe(300);
  });

  it("overall_score equals Math.round of the documented weighted sum", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    const expected =
      r.wire_safety * WIRE_W +
      r.dielectric_safety * DIELECTRIC_W +
      r.thermal_safety * THERMAL_W +
      r.fixation_safety * FIXATION_W;
    expect(r.overall_score).toBe(Math.round(expected));
  });

  it("s_x_score equals overall_score / 100 rounded to 2 decimals", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    expect(r.s_x_score).toBe(Math.round((r.overall_score / 100) * 100) / 100);
  });

  it("passed flag equals (s_x_score >= s_x_threshold)", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    expect(r.passed).toBe(r.s_x_score >= SHOP_FLOOR_SX);
  });

  it("HAPPY PATH: clean WEDM output produces wire=100 and dielectric=100", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    expect(r.passed).toBe(true);
    expect(r.wire_safety).toBe(100);
    expect(r.dielectric_safety).toBe(100);
    expect(r.veto_reason).toBe(undefined);
    expect(r.issues.filter((i) => i.severity === "critical")).toHaveLength(0);
  });

  it("FAILURE: wire diameter 0.5 mm > 0.36 mm envelope drops wire_safety to ≤70", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.5 mm AWT armed dielectric verify"
    );
    expect(r.wire_safety).toBeLessThanOrEqual(70);
    const diameterIssue = r.issues.find((i) => i.category === "wire" && /diameter.*exceeds/i.test(i.message));
    expect(diameterIssue?.severity).toBe("critical");
    expect(diameterIssue?.recommendation).toMatch(/0\.36 mm|brass is 0\.20-0\.30/i);
  });

  it("FAILURE: wire diameter 0.03 mm < 0.05 mm floor drops wire_safety to ≤70", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.03 mm AWT armed dielectric verify"
    );
    expect(r.wire_safety).toBeLessThanOrEqual(70);
    const wireIssue = r.issues.find((i) => i.category === "wire" && /below.*minimum|threadable/i.test(i.message));
    expect(wireIssue?.severity).toBe("critical");
    expect(wireIssue?.recommendation).toMatch(/micro-WEDM|tungsten/i);
  });

  it("FAILURE: wire tension 40 N > 25 N envelope flags wire severity=high", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm wire tension 40 N AWT armed dielectric verify"
    );
    expect(r.wire_safety).toBeLessThanOrEqual(75);
    const tensionIssue = r.issues.find((i) => i.category === "wire" && /tension.*exceeds/i.test(i.message));
    expect(tensionIssue?.severity).toBe("high");
  });

  it("FAILURE: wire tension 1 N < 3 N floor flags bow risk severity=medium", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm wire tension 1 N AWT armed dielectric verify"
    );
    expect(r.wire_safety).toBeLessThanOrEqual(85);
    const bowIssue = r.issues.find((i) => i.category === "wire" && /bow|below 3 N/i.test(i.message));
    expect(bowIssue?.severity).toBe("medium");
  });

  it("FAILURE: pulse-on 100 µs > 50 µs Klocke ceiling drops thermal_safety to ≤75", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm T_ON 100 us AWT armed dielectric verify"
    );
    expect(r.thermal_safety).toBeLessThanOrEqual(75);
    const tonIssue = r.issues.find((i) => i.category === "thermal" && /pulse-on/i.test(i.message));
    expect(tonIssue?.severity).toBe("high");
    expect(tonIssue?.recommendation).toMatch(/reduce TON|multi-pass/i);
  });

  it("FAILURE: TON 30 × IP 40 = 1200 µs·A combined energy emits recast cascade warning", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm T_ON 30 us IP 40 A AWT armed dielectric verify"
    );
    const recastIssue = r.issues.find((i) => /recast/i.test(i.message));
    expect(recastIssue?.category).toBe("thermal");
    expect(recastIssue?.severity).toBe("medium");
    expect(recastIssue?.message).toMatch(/1200|50 µm|recast layer/i);
  });

  it("ADVERSARIAL: empty string fails (s_x < shop_floor) without triggering veto", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate("");
    expect(r.passed).toBe(false);
    expect(r.s_x_score).toBeLessThan(SHOP_FLOOR_SX);
    expect(r.veto_reason).toBe(undefined);
  });

  it("ADVERSARIAL: whitespace-only input scores below shop_floor threshold", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate("   \n\n\t   ");
    expect(r.passed).toBe(false);
    expect(r.s_x_score).toBeLessThan(SHOP_FLOOR_SX);
  });

  it("ADVERSARIAL: 6-digit T_ON value triggers hard veto (overall_score=0, s_x=0)", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate("M91 M20 M78 M78 M82 T_ON 999999 AWT dielectric");
    expect(r.veto_reason).toMatch(/>5 digits|likely error|>200 µs/i);
    expect(r.overall_score).toBe(0);
    expect(r.s_x_score).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.issues[0].category).toBe("critical");
    expect(r.issues[0].severity).toBe("critical");
  });

  it("ADVERSARIAL: wire diameter parsed as 2.5 mm typo triggers hard veto", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate("M91 M20 M78 M78 wire diameter 2.5 mm");
    expect(r.veto_reason).toMatch(/>1 mm|envelope/i);
    expect(r.overall_score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("ADVERSARIAL: M82 wire-on with no prior M78 triggers dry-fire hard veto", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate("M82 wire on with no fill");
    expect(r.veto_reason).toMatch(/dry-fire|M82|M78/i);
    expect(r.overall_score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("VARIABILITY #1: FA-10S default — IP 60 A > 50 A ceiling drops thermal_safety to ≤75", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm IP 60 A AWT armed dielectric verify"
    );
    expect(r.thermal_safety).toBeLessThanOrEqual(75);
    const issue = r.issues.find((i) => i.category === "thermal" && /current.*exceeds/i.test(i.message));
    expect(issue?.severity).toBe("high");
  });

  it("VARIABILITY #2: Sodick NF80 (IP cap 63.5 A) — IP 60 A passes thermal_safety=100", () => {
    wedmLoRASafetyEvaluatorEngine.setConfig({
      limits: { max_peak_current_a: NF80_MAX_IP_A } as WedmSafetyConfig["limits"],
    });
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm IP 60 A AWT armed dielectric verify"
    );
    expect(r.thermal_safety).toBe(100);
    const currentIssues = r.issues.filter((i) => i.category === "thermal" && /current/i.test(i.message));
    expect(currentIssues).toHaveLength(0);
  });

  it("VARIABILITY #3: MV2400 (double-M78 not required) — single M78 keeps dielectric_safety=100", () => {
    wedmLoRASafetyEvaluatorEngine.setConfig({ require_double_m78: false });
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M80 M82 M84 M90 wire diameter 0.25 mm AWT armed dielectric verify"
    );
    expect(r.dielectric_safety).toBe(100);
    const m78Issues = r.issues.filter((i) => /double M78|M78 M78|tank-fill/i.test(i.message));
    expect(m78Issues).toHaveLength(0);
  });

  it("VARIABILITY: clean program passes both shop_floor s_x>=0.70 AND production s_x>=0.95", () => {
    const shop = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    expect(shop.passed).toBe(true);
    expect(shop.s_x_score).toBeGreaterThanOrEqual(SHOP_FLOOR_SX);

    wedmLoRASafetyEvaluatorEngine.setConfig({ s_x_threshold: PRODUCTION_SX });
    const prod = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    expect(prod.passed).toBe(true);
    expect(prod.s_x_score).toBeGreaterThanOrEqual(PRODUCTION_SX);
  });

  it("FIXATION: flushing 30 bar > 20 bar drops fixation_safety to ≤80, severity=high", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm flushing pressure 30 bar AWT armed dielectric"
    );
    expect(r.fixation_safety).toBeLessThanOrEqual(80);
    const fixIssue = r.issues.find((i) => i.category === "fixation" && /pressure.*exceeds/i.test(i.message));
    expect(fixIssue?.severity).toBe("high");
  });

  it("FIXATION: multi-cutout without M01 drops fixation_safety to ≤85, severity=medium", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm multiple contour cutout AWT armed dielectric"
    );
    expect(r.fixation_safety).toBeLessThanOrEqual(85);
    const m01Issue = r.issues.find((i) => /M01|glue-stop|dropout/i.test(i.message));
    expect(m01Issue?.category).toBe("fixation");
    expect(m01Issue?.severity).toBe("medium");
  });

  it("FIXATION: thickness 500 mm > 300 mm envelope drops fixation_safety to ≤75, critical severity", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm thickness 500 mm AWT armed dielectric verify"
    );
    expect(r.fixation_safety).toBeLessThanOrEqual(75);
    const thkIssue = r.issues.find((i) => i.category === "fixation" && /thickness.*exceeds/i.test(i.message));
    expect(thkIssue?.severity).toBe("critical");
  });

  it("veto_reason carries a descriptive non-empty string when critical pattern fires", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate("M82 wire-on T_ON 555555");
    expect(r.veto_reason).toMatch(/dry-fire|likely error|>5 digits|>200 µs/i);
    expect(r.issues[0].severity).toBe("critical");
    expect(r.overall_score).toBe(0);
  });

  it("veto_reason stays undefined on a clean output (no false-positive veto)", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(CLEAN_PROGRAM);
    expect(r.veto_reason).toBe(undefined);
  });

  it("every issue emitted carries non-empty message and recommendation fields", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.5 mm AWT armed dielectric"
    );
    const wireIssues = r.issues.filter((i) => i.category === "wire");
    expect(wireIssues.filter((i) => i.recommendation === "")).toHaveLength(0);
    expect(wireIssues.filter((i) => i.message === "")).toHaveLength(0);
  });

  it("ENVELOPE: Ti-6Al-4V at TON=30 IP=40 (1200 µs·A) flags recast per research-021", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm T_ON 30 us IP 40 A AWT armed dielectric Ti-6Al-4V"
    );
    const recastIssue = r.issues.find((i) => /recast/i.test(i.message));
    expect(recastIssue?.category).toBe("thermal");
    expect(recastIssue?.severity).toBe("medium");
  });
});
