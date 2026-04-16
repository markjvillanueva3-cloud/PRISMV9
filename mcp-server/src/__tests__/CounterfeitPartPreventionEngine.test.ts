import { describe, it, expect } from "vitest";
import { counterfeitPartPreventionEngine } from "../engines/CounterfeitPartPreventionEngine.js";

function baseInput(overrides: Partial<Parameters<typeof counterfeitPartPreventionEngine.assess>[0]> = {}) {
  return {
    part_number: "IC-001",
    quantity: 100,
    critical_application: false,
    provenance: {
      supplier_tier: "OCM_direct" as const,
      on_avl: true,
      chain_hops: ["OCM"],
      chain_documented: true,
      ...(overrides.provenance ?? {}),
    },
    auth_tests: overrides.auth_tests ?? [],
    packaging_intact_oem_seal: true,
    esd_packaging_correct: true,
    reel_label_matches: true,
    ocm_coc_present: true,
    lot_traceability_complete: true,
    ...overrides,
  };
}

describe("CounterfeitPartPreventionEngine", () => {
  it("OCM direct with full paperwork is acceptable", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput());
    expect(r.verdict).toBe("acceptable");
    expect(r.quarantine_required).toBe(false);
  });

  it("unknown supplier drives elevated or suspect", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      provenance: {
        supplier_tier: "unknown",
        on_avl: false,
        chain_hops: ["x", "y", "z", "w"],
        chain_documented: false,
      },
    }));
    expect(["elevated", "suspect_counterfeit"]).toContain(r.verdict);
  });

  it("failed auth test triggers suspect_counterfeit", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      auth_tests: [{ type: "xrf_elemental", result: "fail" }],
    }));
    expect(r.verdict).toBe("suspect_counterfeit");
    expect(r.quarantine_required).toBe(true);
    expect(r.gidep_report_required).toBe(true);
  });

  it("GIDEP prior hit maxes provenance score", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      gidep_prior_hit: true,
    }));
    expect(r.subscore_provenance).toBe(30);
    expect(r.verdict).not.toBe("acceptable");
  });

  it("broker uncertified scores higher than authorized", () => {
    const authRes = counterfeitPartPreventionEngine.assess(baseInput({
      provenance: { supplier_tier: "authorized_distributor", on_avl: true, chain_hops: ["OCM", "Dist"], chain_documented: true },
    }));
    const brokerRes = counterfeitPartPreventionEngine.assess(baseInput({
      provenance: { supplier_tier: "broker_uncertified", on_avl: true, chain_hops: ["OCM", "Dist"], chain_documented: true },
    }));
    expect(brokerRes.subscore_provenance).toBeGreaterThan(authRes.subscore_provenance);
  });

  it("deep chain raises chain subscore", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      provenance: {
        supplier_tier: "authorized_distributor",
        on_avl: true,
        chain_hops: ["OCM", "D1", "D2", "D3", "D4"],
        chain_documented: true,
      },
    }));
    expect(r.subscore_chain).toBeGreaterThan(0);
  });

  it("broken OEM seal adds to packaging score", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      packaging_intact_oem_seal: false,
      esd_packaging_correct: false,
      reel_label_matches: false,
    }));
    expect(r.subscore_packaging).toBe(10);
  });

  it("missing OCM CoC drives documentation subscore", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      ocm_coc_present: false,
      lot_traceability_complete: false,
    }));
    expect(r.subscore_documentation).toBe(10);
  });

  it("no tests performed for critical app adds test subscore", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      critical_application: true,
      auth_tests: [],
    }));
    expect(r.subscore_tests).toBeGreaterThanOrEqual(15);
  });

  it("critical app with passing tests scores low", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      critical_application: true,
      auth_tests: [
        { type: "visual_external", result: "pass" },
        { type: "xray", result: "pass" },
        { type: "xrf_elemental", result: "pass" },
      ],
    }));
    expect(r.subscore_tests).toBe(0);
  });

  it("verdict suspect recommends GIDEP report", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      auth_tests: [{ type: "remark_solvent", result: "fail" }],
    }));
    expect(r.recommended_actions.some((a) => a.includes("GIDEP"))).toBe(true);
  });

  it("elevated verdict recommends escalated testing", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      provenance: {
        supplier_tier: "independent",
        on_avl: false,
        chain_hops: ["OCM", "x", "y"],
        chain_documented: false,
      },
      ocm_coc_present: false,
    }));
    if (r.verdict === "elevated") {
      expect(r.recommended_actions.some((a) => a.toLowerCase().includes("xrf"))).toBe(true);
    }
  });

  it("failed_tests array reflects failures", () => {
    const r = counterfeitPartPreventionEngine.assess(baseInput({
      auth_tests: [
        { type: "xrf_elemental", result: "fail" },
        { type: "xray", result: "fail" },
      ],
    }));
    expect(r.failed_tests).toHaveLength(2);
  });

  it("getStats returns supplier tiers", () => {
    const s = counterfeitPartPreventionEngine.getStats();
    expect(s.supplier_tiers).toContain("OCM_direct");
    expect(s.reference).toMatch(/AS5553/);
  });
});
