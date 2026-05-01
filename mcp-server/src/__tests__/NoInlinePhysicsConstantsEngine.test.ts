/**
 * NoInlinePhysicsConstantsEngine tests — MS0/U-PPGM04.
 *
 * Verifies tier-aware HARD BLOCK / WARN / PASS verdicts on real CPS-shaped
 * source samples. Uses canonical kc1_1 / Taylor C / tool-modulus values
 * sourced from src/physics/constants.ts so when constants recalibrate, the
 * test target moves with them (no inline test literals against frozen values).
 */

import { describe, it, expect } from "vitest";
import { NoInlinePhysicsConstantsEngine } from "../engines/NoInlinePhysicsConstantsEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, CANONICAL_TOOL_MODULUS } from "../physics/constants.js";

const KC1_1_P = CANONICAL_KIENZLE.P.kc1_1;
const KC1_1_S = CANONICAL_KIENZLE.S.kc1_1;
const TAYLOR_C_P = CANONICAL_TAYLOR.P.C;
const E_CARBIDE = CANONICAL_TOOL_MODULUS.carbide;

// ============================================================================
// HAPPY PATH — clean source returns PASS on every tier
// ============================================================================

describe("NoInlinePhysicsConstants — happy path (clean source returns PASS)", () => {
  it("empty source returns PASS with zero findings on shop_floor tier", () => {
    const r = NoInlinePhysicsConstantsEngine.scan("", { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
    expect(r.findings).toHaveLength(0);
  });

  it("source that loads from sidecar (no inlined literals) returns PASS on shop_floor", () => {
    const src = `
      var sidecar = loadPhysicsSidecar(loadText("post.physics.json"), { expectedSchemaVersion: "1.0.0" });
      var kc = sidecar.kienzle.P.kc1_1;
      var taylorC = sidecar.taylor.P.C;
      var modulus = sidecar.tool_modulus_MPa.carbide;
      function force(ap, fz) { return kc * ap * Math.pow(fz, 1 - sidecar.kienzle.P.mc); }
    `;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
    expect(r.summary.high).toBe(0);
  });

  it("source with completely unrelated numeric literals (RPM, feed) returns PASS on shop_floor (low confidence pruned)", () => {
    const src = `
      var rpm = 5000;
      var feedrate_mm_min = 1500;
      var depth = 0.5;
      var coolant_psi = 250;
    `;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
    expect(r.summary.high).toBe(0);
    expect(r.summary.medium).toBe(0);
  });
});

// ============================================================================
// FAILURE MODES — explicit inlined constants → HARD_BLOCK on shop_floor
// ============================================================================

describe("NoInlinePhysicsConstants — failure modes (HARD_BLOCK on shop_floor)", () => {
  it("inlined kc1_1 = <P-canonical> with explicit kc1_1 variable name → HARD_BLOCK on shop_floor", () => {
    const src = `var kc1_1 = ${KC1_1_P};\nfunction kienzleForce(ap, fz) { return kc1_1 * ap * Math.pow(fz, 0.75); }`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.summary.high).toBeGreaterThan(0);
    const top = r.findings.find((f) => f.confidence === "HIGH" && f.constant_class === "kienzle_kc1_1");
    expect(top?.value).toBe(KC1_1_P);
    expect(top?.matched_key).toBe("ISO-P");
  });

  it("inlined Taylor C = <P-canonical> with 'taylor' keyword in context → HARD_BLOCK on shop_floor", () => {
    const src = `var taylorC = ${TAYLOR_C_P}; function life(Vc) { return Math.pow(taylorC / Vc, 4); }`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    const top = r.findings.find((f) => f.confidence === "HIGH" && f.constant_class === "taylor_C");
    expect(top?.value).toBe(TAYLOR_C_P);
  });

  it("inlined tool modulus E = <carbide-canonical> with 'modulus' keyword → HARD_BLOCK on shop_floor", () => {
    const src = `var tool_modulus = ${E_CARBIDE}; var deflection = F * Math.pow(L, 3) / (3 * tool_modulus * I);`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    const top = r.findings.find((f) => f.confidence === "HIGH" && f.constant_class === "tool_modulus");
    expect(top?.value).toBe(E_CARBIDE);
  });

  it("multiple inlined constants → all flagged with summary.high >= 2", () => {
    const src = `
      var kc1_1 = ${KC1_1_P};
      var taylor_C = ${TAYLOR_C_P};
      var modulus_carbide = ${E_CARBIDE};
    `;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.summary.high).toBeGreaterThanOrEqual(3);
  });

  it("scanOrThrow throws on HARD_BLOCK with descriptive message containing line numbers", () => {
    const src = `var kienzle_P = ${KC1_1_P};`;
    expect(() => NoInlinePhysicsConstantsEngine.scanOrThrow(src, { tier: "shop_floor" })).toThrow(/HARD_BLOCK/);
    expect(() => NoInlinePhysicsConstantsEngine.scanOrThrow(src, { tier: "shop_floor" })).toThrow(/L1:/);
  });
});

// ============================================================================
// TIER AWARENESS — same source, different verdicts
// ============================================================================

describe("NoInlinePhysicsConstants — tier-aware verdict", () => {
  const dirty = `var kc1_1 = ${KC1_1_S}; // inlined ISO-S kc1.1`;

  it("HIGH-confidence inline → HARD_BLOCK on shop_floor", () => {
    expect(NoInlinePhysicsConstantsEngine.scan(dirty, { tier: "shop_floor" }).verdict).toBe("HARD_BLOCK");
  });

  it("HIGH-confidence inline → HARD_BLOCK on production", () => {
    expect(NoInlinePhysicsConstantsEngine.scan(dirty, { tier: "production" }).verdict).toBe("HARD_BLOCK");
  });

  it("HIGH-confidence inline → WARN on proven_out (allows legacy posts to load)", () => {
    expect(NoInlinePhysicsConstantsEngine.scan(dirty, { tier: "proven_out" }).verdict).toBe("WARN");
  });

  it("HIGH-confidence inline → WARN on sim (exploration tier)", () => {
    expect(NoInlinePhysicsConstantsEngine.scan(dirty, { tier: "sim" }).verdict).toBe("WARN");
  });

  it("default tier is shop_floor (fail-closed) when not supplied", () => {
    expect(NoInlinePhysicsConstantsEngine.scan(dirty).verdict).toBe("HARD_BLOCK");
  });
});

// ============================================================================
// ADVERSARIAL — comments, strings, ambiguous values
// ============================================================================

describe("NoInlinePhysicsConstants — adversarial", () => {
  it("constant inside a // line comment is IGNORED (no findings)", () => {
    const src = `// kc1_1 reference: ${KC1_1_P} N/mm² for ISO-P\nvar safe = sidecar.kienzle.P.kc1_1;`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
    expect(r.summary.high).toBe(0);
  });

  it("constant inside a /* block comment */ is IGNORED", () => {
    const src = `/* documentation: kc1_1 = ${KC1_1_P} */ var safe = sidecar.kienzle.P.kc1_1;`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
  });

  it("constant inside a 'string literal' is IGNORED", () => {
    const src = `var msg = "kienzle reference: ${KC1_1_P} from Sandvik 2024"; var safe = sidecar.kienzle.P.kc1_1;`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
  });

  it("ambiguous: var rpm = <kc1_1-value> with NO physics keyword → not HARD_BLOCK on shop_floor (low confidence pruned)", () => {
    const src = `var rpm = ${KC1_1_P}; var feed = 0.05;`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
  });

  it("source that mixes legitimate sidecar use AND one inlined constant → HARD_BLOCK only on the inlined one", () => {
    const src = `
      var sc = loadPhysicsSidecar(text, { expectedSchemaVersion: "1.0.0" });
      var safeKc = sc.kienzle.M.kc1_1;
      var BAD_kc1_1 = ${KC1_1_P};  // forgotten inline
    `;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.summary.high).toBe(1);
    expect(r.findings[0]?.line).toBeGreaterThanOrEqual(3);
  });

  it("scan completes on a 5000-line synthetic source in <500ms (perf budget)", () => {
    let big = "";
    for (let i = 0; i < 5000; i++) big += `var line${i} = ${i % 100};\n`;
    const start = Date.now();
    const r = NoInlinePhysicsConstantsEngine.scan(big, { tier: "shop_floor" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(r.verdict).toBe("PASS");
  });

  it("source must be a string — non-string throws", () => {
    expect(() => NoInlinePhysicsConstantsEngine.scan(undefined as unknown as string)).toThrow();
    expect(() => NoInlinePhysicsConstantsEngine.scan(123 as unknown as string)).toThrow();
  });
});

// ============================================================================
// CANONICAL TRACEABILITY — findings cite ISO group / tool material
// ============================================================================

describe("NoInlinePhysicsConstants — canonical traceability", () => {
  it("finding for inlined kc1_1=<S-canonical> identifies matched_key as ISO-S", () => {
    const src = `var kc1_1 = ${KC1_1_S};`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    const isoS = r.findings.find((f) => f.matched_key === "ISO-S");
    expect(isoS?.value).toBe(KC1_1_S);
    expect(isoS?.constant_class).toBe("kienzle_kc1_1");
  });

  it("finding for inlined modulus=<carbide-canonical> identifies matched_key as 'carbide'", () => {
    const src = `var tool_modulus = ${E_CARBIDE};`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    const carbide = r.findings.find((f) => f.matched_key === "carbide");
    expect(carbide?.value).toBe(E_CARBIDE);
    expect(carbide?.constant_class).toBe("tool_modulus");
  });

  it("forbidden value set is sourced from canonical at scan time (recalibration-safe)", () => {
    // Construct a source using the LIVE canonical value; if canonicals
    // recalibrate, the test still passes because it pulls the new value.
    const src = `var kc1_1 = ${CANONICAL_KIENZLE.H.kc1_1};`;
    const r = NoInlinePhysicsConstantsEngine.scan(src, { tier: "shop_floor" });
    const hMatch = r.findings.find((f) => f.matched_key === "ISO-H");
    expect(hMatch?.value).toBe(CANONICAL_KIENZLE.H.kc1_1);
  });
});
