import { describe, it, expect } from "vitest";
import { latheProgramSignoffDossierEngine } from "../engines/LatheProgramSignoffDossierEngine.js";

const CLEAN_INPUT = {
  program_id: "PRG-001",
  engagement: { peak_doc_mm: 2.5, peak_mrr_mm3_s: 120, cutting_blocks: 30, warnings: [] },
  stock: { final_length_mm: 95, min_r_mm: 10, max_r_mm: 25, sample_count: 200 },
  breach: { hits_count: 0, components_hit: [] },
  time: { total_seconds: 180, dominant_category: "feed", dominant_share_pct: 62 },
  deviation: { max_abs_delta_mm: 0.005, rms_delta_mm: 0.002, out_of_tol_count: 0, signed_bias_mm: 0.0005 },
  deviation_tol_mm: 0.01,
};

describe("LatheProgramSignoffDossierEngine", () => {
  it("returns pass verdict when clean", () => {
    const r = latheProgramSignoffDossierEngine.assemble(CLEAN_INPUT);
    expect(r.verdict).toBe("pass");
    expect(r.reason_codes.length).toBe(0);
  });

  it("fail verdict on envelope breach", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      ...CLEAN_INPUT,
      breach: { first_breach_block: 42, hits_count: 3, components_hit: ["chuck"] },
    });
    expect(r.verdict).toBe("fail");
    expect(r.reason_codes).toContain("ENVELOPE_BREACH");
  });

  it("fail verdict when deviation exceeds tolerance", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      ...CLEAN_INPUT,
      deviation: { max_abs_delta_mm: 0.05, rms_delta_mm: 0.03, out_of_tol_count: 5, signed_bias_mm: 0.01 },
    });
    expect(r.verdict).toBe("fail");
    expect(r.reason_codes).toContain("DEVIATION_OUT_OF_TOL");
  });

  it("warn verdict on engagement warnings only", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      ...CLEAN_INPUT,
      engagement: { ...CLEAN_INPUT.engagement, warnings: ["High DoC 6mm"] },
    });
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("ENGAGEMENT_WARNING");
  });

  it("warn on systematic bias > tol/2", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      ...CLEAN_INPUT,
      deviation: { max_abs_delta_mm: 0.008, rms_delta_mm: 0.006, out_of_tol_count: 0, signed_bias_mm: 0.008 },
      deviation_tol_mm: 0.01,
    });
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("SYSTEMATIC_BIAS");
  });

  it("program_id echoed on result", () => {
    const r = latheProgramSignoffDossierEngine.assemble(CLEAN_INPUT);
    expect(r.program_id).toBe("PRG-001");
  });

  it("highlights include cycle time info", () => {
    const r = latheProgramSignoffDossierEngine.assemble(CLEAN_INPUT);
    expect(r.highlights.some((h) => /Cycle/.test(h))).toBe(true);
  });

  it("highlights include peak DoC info", () => {
    const r = latheProgramSignoffDossierEngine.assemble(CLEAN_INPUT);
    expect(r.highlights.some((h) => /Peak DoC/.test(h))).toBe(true);
  });

  it("highlights include envelope clear message when no breach", () => {
    const r = latheProgramSignoffDossierEngine.assemble(CLEAN_INPUT);
    expect(r.highlights.some((h) => /Envelope clear/.test(h))).toBe(true);
  });

  it("warn propagates engagement warning texts", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      ...CLEAN_INPUT,
      engagement: { ...CLEAN_INPUT.engagement, warnings: ["WEAR"] },
    });
    expect(r.warnings).toContain("WEAR");
  });

  it("breach takes precedence over warn (fail wins)", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      ...CLEAN_INPUT,
      breach: { first_breach_block: 1, hits_count: 1, components_hit: ["chuck"] },
      engagement: { ...CLEAN_INPUT.engagement, warnings: ["warn"] },
    });
    expect(r.verdict).toBe("fail");
  });

  it("deviation summary absent is acceptable", () => {
    const r = latheProgramSignoffDossierEngine.assemble({
      program_id: "PRG-002",
      engagement: CLEAN_INPUT.engagement,
      stock: CLEAN_INPUT.stock,
      breach: CLEAN_INPUT.breach,
      time: CLEAN_INPUT.time,
    });
    expect(r.verdict).toBe("pass");
  });

  it("reasoning mentions verdict", () => {
    const r = latheProgramSignoffDossierEngine.assemble(CLEAN_INPUT);
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/verdict/);
  });

  it("getStats lists verdicts + reference", () => {
    const s = latheProgramSignoffDossierEngine.getStats();
    expect(s.verdicts).toContain("pass");
    expect(s.verdicts).toContain("fail");
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
