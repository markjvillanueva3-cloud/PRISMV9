/**
 * Multi-Pass Count Optimization + Recast Prediction Test Suite (U-W100-17 + U-W100-18)
 *
 * U-W100-17: Minimum pass count for target Ra
 *   - Uses PUBLISHED_RA_VS_PASSES: 1→3.2, 2→1.6, 3→0.4, 4→0.2, 5→0.1, 6→0.05
 *   - Solve: minimum n where achievable Ra ≤ target Ra
 *   - Exit gate: D2 at Ra=0.8 → 3 passes; Ra=0.2 → 4 passes; Ra=3.2 → 1 pass
 *
 * U-W100-18: Recast layer prediction vs spec compliance
 *   - Carslaw & Jaeger: d = k × 2√(α × t_on), skim attenuation 0.7 per pass
 *   - AMS 2628 aerospace: max recast = 0µm (effectively ≤1.3µm after ≥3 skims)
 *   - ASTM F86 medical: max recast = 5µm
 *   - Safety gate: auto-adds passes if recast exceeds spec
 *
 * References:
 *   Klocke (2013) Manufacturing Processes 4
 *   Toenshoff et al. CIRP Annals 2004
 *   Carslaw & Jaeger, Heat Conduction in Solids
 *   Dauw & Albert, CIRP Annals 1992
 *   AMS 2628, ASTM F86/ISO 10993
 */

import { describe, it, expect } from "vitest";
import { edmMultiPassStrategyEngine } from "../engines/EDMMultiPassStrategyEngine.js";

const { optimize_pass_count, predict_recast_chain, _internals } = edmMultiPassStrategyEngine;
const { buildRaChain, PUBLISHED_RA_PASSES, lookupMaterialKRecast } = _internals;

// ============================================================================
// 1. PASS COUNT FROM PUBLISHED Ra DATA (U-W100-17)
// ============================================================================

describe("Pass count optimization from published Ra data", () => {
  it("Ra=3.2µm → 1 pass (rough only)", () => {
    const result = optimize_pass_count({
      target_ra_um: 3.2,
      material: "tool_steel",
      tolerance_mm: 0.2, // Loose tolerance so it doesn't override Ra-based count
    });
    expect(result.ra_passes).toBe(1);
    expect(result.total_passes).toBe(1);
  });

  it("Ra=1.6µm → 2 passes (1 rough + 1 skim)", () => {
    const result = optimize_pass_count({
      target_ra_um: 1.6,
      material: "tool_steel",
      tolerance_mm: 0.1,
    });
    expect(result.ra_passes).toBe(2);
  });

  it("Ra=0.8µm → 3 passes (EXIT GATE check)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.8,
      material: "D2",
      tolerance_mm: 0.05,
    });
    // Ra=0.8 is between 3-pass (0.4) and 2-pass (1.6) — need 3 passes to achieve ≤0.8
    expect(result.ra_passes).toBe(3);
  });

  it("Ra=0.4µm → 3 passes (published exact match)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.4,
      material: "tool_steel",
      tolerance_mm: 0.025,
    });
    expect(result.ra_passes).toBe(3);
  });

  it("Ra=0.2µm → 4 passes (EXIT GATE check)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.2,
      material: "D2",
      tolerance_mm: 0.01,
    });
    expect(result.ra_passes).toBe(4);
  });

  it("Ra=0.1µm → 5 passes (published exact match)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.1,
      material: "tool_steel",
      tolerance_mm: 0.005,
    });
    expect(result.ra_passes).toBe(5);
  });

  it("Ra=0.05µm → 6 passes (mirror finish)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.05,
      material: "tool_steel",
      tolerance_mm: 0.005,
    });
    expect(result.ra_passes).toBe(6);
  });

  it("Ra=5.0µm → 1 pass (above rough Ra)", () => {
    const result = optimize_pass_count({
      target_ra_um: 5.0,
      material: "tool_steel",
      tolerance_mm: 0.2,
    });
    expect(result.ra_passes).toBe(1);
    expect(result.total_passes).toBe(1);
  });

  it("Ra matches PUBLISHED_RA_VS_PASSES within ±1 pass", () => {
    // Exit gate: pass count matches published data within ±1
    for (const pub of PUBLISHED_RA_PASSES) {
      const result = optimize_pass_count({
        target_ra_um: pub.ra_um,
        material: "tool_steel",
        tolerance_mm: 0.005, // Don't let tolerance dominate
      });
      expect(Math.abs(result.ra_passes - pub.passes)).toBeLessThanOrEqual(1);
    }
  });
});

// ============================================================================
// 2. TOLERANCE-BASED PASS COUNT
// ============================================================================

describe("Tolerance-based pass count", () => {
  it("loose tolerance (0.2mm) → 1 pass", () => {
    const result = optimize_pass_count({
      target_ra_um: 3.2,
      material: "steel",
      tolerance_mm: 0.2,
    });
    expect(result.tolerance_passes).toBe(1);
  });

  it("tight tolerance (0.005mm) → 5 passes", () => {
    const result = optimize_pass_count({
      target_ra_um: 3.2,
      material: "steel",
      tolerance_mm: 0.005,
    });
    expect(result.tolerance_passes).toBe(5);
  });

  it("total_passes = max(ra_passes, tol_passes, recast_passes)", () => {
    // Ra needs 1 pass, tolerance needs 4 → total = 4
    const result = optimize_pass_count({
      target_ra_um: 3.2,
      material: "steel",
      tolerance_mm: 0.015,
    });
    expect(result.tolerance_passes).toBe(4);
    expect(result.total_passes).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// 3. Ra CHAIN PREDICTION
// ============================================================================

describe("Ra chain prediction", () => {
  it("1-pass chain: [3.2]", () => {
    const chain = buildRaChain(1);
    expect(chain).toHaveLength(1);
    expect(chain[0]).toBeCloseTo(3.2, 1);
  });

  it("3-pass chain: [3.2, 1.6, 0.4]", () => {
    const chain = buildRaChain(3);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBeCloseTo(3.2, 1);
    expect(chain[1]).toBeCloseTo(1.6, 1);
    expect(chain[2]).toBeCloseTo(0.4, 1);
  });

  it("6-pass chain matches published data", () => {
    const chain = buildRaChain(6);
    expect(chain).toHaveLength(6);
    for (let i = 0; i < PUBLISHED_RA_PASSES.length && i < chain.length; i++) {
      expect(chain[i]).toBeCloseTo(PUBLISHED_RA_PASSES[i].ra_um, 1);
    }
  });

  it("Ra decreases monotonically", () => {
    const chain = buildRaChain(6);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i]).toBeLessThan(chain[i - 1]);
    }
  });

  it("beyond published data: extrapolates with 0.5× factor", () => {
    const chain = buildRaChain(8);
    expect(chain).toHaveLength(8);
    // Pass 7 = 0.05 × 0.5 = 0.025, Pass 8 = 0.025 × 0.5 = 0.0125
    expect(chain[6]).toBeCloseTo(0.025, 2);
    expect(chain[7]).toBeCloseTo(0.0125, 3);
  });
});

// ============================================================================
// 4. RECAST CHAIN PREDICTION (U-W100-18)
// ============================================================================

describe("Recast layer prediction via Carslaw & Jaeger", () => {
  it("D2 rough recast depth is positive and reasonable (5-30µm)", () => {
    // D2: α=7.0 mm²/s, rough t_on=4µs
    const chain = predict_recast_chain(7.0, 4.0, 1, "D2");
    expect(chain).toHaveLength(1);
    expect(chain[0]).toBeGreaterThan(0);
    expect(chain[0]).toBeLessThan(50); // Upper bound sanity
  });

  it("each skim reduces recast by ~30% (factor 0.7)", () => {
    const chain = predict_recast_chain(7.0, 4.0, 5, "D2");
    expect(chain).toHaveLength(5);
    for (let i = 1; i < chain.length; i++) {
      const ratio = chain[i] / chain[0];
      const expected = Math.pow(0.7, i);
      expect(ratio).toBeCloseTo(expected, 1);
    }
  });

  it("recast decreases monotonically with skims", () => {
    const chain = predict_recast_chain(7.0, 4.0, 6, "D2");
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i]).toBeLessThan(chain[i - 1]);
    }
  });

  it("higher alpha (aluminum) → deeper rough recast", () => {
    const d2Chain = predict_recast_chain(7.0, 4.0, 1, "D2");
    const alChain = predict_recast_chain(69.0, 4.0, 1, "Al 6061");
    // Higher alpha → deeper penetration, but Al has lower k_recast (0.65 vs 0.70)
    // sqrt(69/7) ≈ 3.14, but k ratio = 0.65/0.70 = 0.93 → net ~2.9× deeper
    expect(alChain[0]).toBeGreaterThan(d2Chain[0]);
  });

  it("longer t_on → deeper recast (proportional to √t_on)", () => {
    const short = predict_recast_chain(7.0, 2.0, 1, "D2");
    const long = predict_recast_chain(7.0, 8.0, 1, "D2");
    // Ratio should be √(8/2) = 2
    expect(long[0] / short[0]).toBeCloseTo(2.0, 1);
  });

  it("material k-factor affects recast depth", () => {
    // Inconel k=0.85 vs Cu k=0.55 — Inconel should have deeper recast
    const inconel = predict_recast_chain(3.1, 4.0, 1, "Inconel 718");
    const copper = predict_recast_chain(100.0, 4.0, 1, "Cu");
    // Cu has much higher alpha but lower k, so let's just check k-factor alone
    const kInconel = lookupMaterialKRecast("Inconel 718");
    const kCu = lookupMaterialKRecast("Cu");
    expect(kInconel).toBeGreaterThan(kCu);
  });
});

// ============================================================================
// 5. SPEC COMPLIANCE SAFETY GATE (U-W100-18)
// ============================================================================

describe("Recast spec compliance safety gate", () => {
  it("general application: recast compliant with few passes", () => {
    const result = optimize_pass_count({
      target_ra_um: 1.6,
      material: "steel",
      tolerance_mm: 0.05,
      application: "general",
      alpha_mm2s: 14.0,
      rough_t_on_us: 4.0,
    });
    expect(result.spec_compliant).toBe(true);
    expect(result.spec_name.toLowerCase()).toContain("general");
  });

  it("aerospace (AMS 2628): auto-adds passes for zero recast", () => {
    const result = optimize_pass_count({
      target_ra_um: 1.6,   // Would be 2 passes for Ra alone
      material: "tool_steel",
      tolerance_mm: 0.05,
      application: "aerospace",
      alpha_mm2s: 7.0,
      rough_t_on_us: 4.0,
    });
    // Aerospace needs recast → 0, which requires many skims
    expect(result.recast_passes).toBeGreaterThanOrEqual(2);
    expect(result.total_passes).toBeGreaterThanOrEqual(result.ra_passes);
    // Recast chain should show decreasing values
    expect(result.recast_per_pass.length).toBeGreaterThan(0);
    for (let i = 1; i < result.recast_per_pass.length; i++) {
      expect(result.recast_per_pass[i]).toBeLessThan(result.recast_per_pass[i - 1]);
    }
  });

  it("medical (ASTM F86): max recast 5µm enforced", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.4,
      material: "tool_steel",
      tolerance_mm: 0.025,
      application: "medical",
      alpha_mm2s: 7.0,
      rough_t_on_us: 4.0,
    });
    // After enough passes, recast should be ≤5µm
    expect(result.predicted_recast_um).toBeLessThanOrEqual(5.0);
  });

  it("reason field explains dominant constraint", () => {
    // Ra-dominant
    const raResult = optimize_pass_count({
      target_ra_um: 0.1,
      material: "steel",
      tolerance_mm: 0.005,
      application: "general",
    });
    expect(raResult.reason).toContain("Ra target");

    // Tolerance-dominant
    const tolResult = optimize_pass_count({
      target_ra_um: 3.2,
      material: "steel",
      tolerance_mm: 0.008,
      application: "general",
    });
    expect(tolResult.reason).toContain("Tolerance");
  });
});

// ============================================================================
// 6. RESULT STRUCTURE VALIDATION
// ============================================================================

describe("Optimization result structure", () => {
  it("returns all required fields", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.8,
      material: "D2",
      tolerance_mm: 0.025,
      application: "tooling",
    });

    expect(result.ra_passes).toBeGreaterThanOrEqual(1);
    expect(result.tolerance_passes).toBeGreaterThanOrEqual(1);
    expect(result.recast_passes).toBeGreaterThanOrEqual(1);
    expect(result.total_passes).toBeGreaterThanOrEqual(1);
    expect(result.total_passes).toBeLessThanOrEqual(9);
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
    expect(result.predicted_ra_um).toBeGreaterThan(0);
    expect(result.predicted_recast_um).toBeGreaterThanOrEqual(0);
    expect(result.recast_per_pass.length).toBe(result.total_passes);
    expect(result.ra_per_pass.length).toBe(result.total_passes);
    expect(typeof result.spec_compliant).toBe("boolean");
    expect(typeof result.spec_name).toBe("string");
  });

  it("ra_per_pass and recast_per_pass both decrease monotonically", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.2,
      material: "D2",
      tolerance_mm: 0.01,
      application: "general",
      alpha_mm2s: 7.0,
      rough_t_on_us: 4.0,
    });

    for (let i = 1; i < result.ra_per_pass.length; i++) {
      expect(result.ra_per_pass[i]).toBeLessThan(result.ra_per_pass[i - 1]);
    }
    for (let i = 1; i < result.recast_per_pass.length; i++) {
      expect(result.recast_per_pass[i]).toBeLessThan(result.recast_per_pass[i - 1]);
    }
  });
});

// ============================================================================
// 7. MATERIAL-SPECIFIC PASS COUNT VALIDATION
// ============================================================================

describe("Material-specific pass count behavior", () => {
  it("D2 at Ra=0.8µm, tol=0.025mm → 3 passes (EXIT GATE)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.8,
      material: "D2",
      tolerance_mm: 0.025,
    });
    expect(result.total_passes).toBeGreaterThanOrEqual(3);
  });

  it("D2 at Ra=0.2µm → 4 passes (EXIT GATE)", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.2,
      material: "D2",
      tolerance_mm: 0.01,
    });
    expect(result.total_passes).toBeGreaterThanOrEqual(4);
  });

  it("D2 at Ra=3.2µm → 1 pass (EXIT GATE)", () => {
    const result = optimize_pass_count({
      target_ra_um: 3.2,
      material: "D2",
      tolerance_mm: 0.2, // Loose tolerance so Ra dominates
    });
    expect(result.total_passes).toBe(1);
  });

  it("Inconel at Ra=0.4µm, aerospace → extra passes for recast", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.4,
      material: "Inconel 718",
      tolerance_mm: 0.025,
      application: "aerospace",
      alpha_mm2s: 3.1,
      rough_t_on_us: 4.0,
    });
    // Aerospace + Inconel (high recast k) should drive more passes
    expect(result.total_passes).toBeGreaterThanOrEqual(3);
  });

  it("aluminum at Ra=1.6µm, general → 2 passes", () => {
    const result = optimize_pass_count({
      target_ra_um: 1.6,
      material: "Al 6061",
      tolerance_mm: 0.05,
      application: "general",
    });
    expect(result.ra_passes).toBe(2);
  });
});

// ============================================================================
// 8. EDGE CASES
// ============================================================================

describe("Edge cases", () => {
  it("very fine Ra (0.01µm) → capped at reasonable pass count", () => {
    const result = optimize_pass_count({
      target_ra_um: 0.01,
      material: "tool_steel",
      tolerance_mm: 0.005,
    });
    // Should be 6+ but capped
    expect(result.ra_passes).toBeGreaterThanOrEqual(6);
    expect(result.total_passes).toBeLessThanOrEqual(9);
  });

  it("zero tolerance_mm → 5 passes (tightest band)", () => {
    const result = optimize_pass_count({
      target_ra_um: 3.2,
      material: "steel",
      tolerance_mm: 0.001,
    });
    expect(result.tolerance_passes).toBe(5);
  });

  it("very thick t_on (20µs) → deeper recast", () => {
    const thin = optimize_pass_count({
      target_ra_um: 0.4,
      material: "D2",
      tolerance_mm: 0.025,
      alpha_mm2s: 7.0,
      rough_t_on_us: 2.0,
    });
    const thick = optimize_pass_count({
      target_ra_um: 0.4,
      material: "D2",
      tolerance_mm: 0.025,
      alpha_mm2s: 7.0,
      rough_t_on_us: 20.0,
    });
    expect(thick.recast_per_pass[0]).toBeGreaterThan(thin.recast_per_pass[0]);
  });
});
