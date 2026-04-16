import { describe, it, expect } from "vitest";
import { strategyFallbackChainEngine } from "../engines/StrategyFallbackChainEngine.js";

describe("StrategyFallbackChainEngine", () => {
  it("returns preferred when controller is fully compatible", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "face_milling",
      controller: "fanuc_30i",
    });
    expect(r.chosen).toBe("face_milling");
    expect(r.used_preferred).toBe(true);
  });

  it("walks default chain when preferred is not set via custom_chain", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "morphed_spiral",
      controller: "fanuc_30i",
    });
    expect(r.chain_walked.length).toBeGreaterThanOrEqual(1);
  });

  it("custom_chain overrides default", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "face_milling",
      controller: "fanuc_30i",
      custom_chain: ["face_milling", "peck_drilling"],
    });
    expect(r.chain_walked[0].strategy).toBe("face_milling");
  });

  it("machine flag: no HSM rejects high_speed_finishing", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "high_speed_finishing",
      controller: "fanuc_30i",
      machine_flags: { hsm_capable: false, nurbs_capable: true, max_axes_available: 5 },
    });
    expect(r.chain_walked[0].compatible).toBe(false);
    expect(r.chain_walked[0].blocking_issues).toContain("no_hsm");
  });

  it("machine flag: no NURBS rejects morphed_spiral", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "morphed_spiral",
      controller: "fanuc_30i",
      machine_flags: { hsm_capable: true, nurbs_capable: false, max_axes_available: 5 },
    });
    expect(r.chain_walked[0].compatible).toBe(false);
    expect(r.chain_walked[0].blocking_issues).toContain("no_nurbs");
  });

  it("machine flag: insufficient axes rejects 5axis_simultaneous", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "5axis_simultaneous",
      controller: "fanuc_30i",
      machine_flags: { hsm_capable: true, nurbs_capable: true, max_axes_available: 3 },
    });
    expect(r.chain_walked[0].compatible).toBe(false);
    expect(r.chain_walked[0].blocking_issues).toContain("insufficient_axes");
  });

  it("used_preferred is false when fallback occurs", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "5axis_simultaneous",
      controller: "fanuc_30i",
      machine_flags: { hsm_capable: true, nurbs_capable: true, max_axes_available: 3 },
    });
    expect(r.used_preferred).toBe(false);
  });

  it("chain_walked entries carry reason text", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "morphed_spiral",
      controller: "fanuc_30i",
      machine_flags: { hsm_capable: true, nurbs_capable: false, max_axes_available: 5 },
    });
    expect(r.chain_walked[0].reason.length).toBeGreaterThan(0);
  });

  it("explanation describes fallback path", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "face_milling",
      controller: "fanuc_30i",
    });
    expect(typeof r.explanation).toBe("string");
    expect(r.explanation.length).toBeGreaterThan(5);
  });

  it("getDefaultChain returns non-empty array for known strategy", () => {
    const chain = strategyFallbackChainEngine.getDefaultChain("adaptive_clearing");
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[0]).toBe("adaptive_clearing");
  });

  it("getDefaultChain returns single-element chain for unknown strategy", () => {
    const chain = strategyFallbackChainEngine.getDefaultChain("custom");
    expect(chain[0]).toBe("custom");
  });

  it("reasoning mentions walk count or failure", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "peck_drilling",
      controller: "fanuc_30i",
    });
    const text = r.reasoning.join(" ");
    expect(text.length).toBeGreaterThan(0);
  });

  it("getStats reports chain count and reference", () => {
    const s = strategyFallbackChainEngine.getStats();
    expect(s.chains).toBeGreaterThan(5);
    expect(s.reference.length).toBeGreaterThan(5);
  });

  it("chain stops at first compatible option", () => {
    const r = strategyFallbackChainEngine.choose({
      preferred: "face_milling",
      controller: "fanuc_30i",
    });
    const compatIdx = r.chain_walked.findIndex((s) => s.compatible);
    expect(compatIdx).toBeGreaterThanOrEqual(0);
    expect(r.chain_walked.length).toBe(compatIdx + 1);
  });
});
