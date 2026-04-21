/**
 * TurningComplianceCheckEngine — per-engine tests (MS9 / U-LPR05-06)
 */
import { describe, it, expect } from "vitest";
import { turningComplianceCheckEngine } from "../engines/TurningComplianceCheckEngine.js";

function goodCert() {
  return { heat_lot: "H-99", validated: true, on_file: true, expires_at: "2030-01-01" };
}
function goodThread() {
  return { linkage_complete: true };
}
function goodDHR() {
  return {
    part_id: "P-1",
    parameters: [{ name: "S", value: 1500, source: "parameter_file" as const }],
    tool_records: [{ tool_number: 1, insert_lot: "L1", holder_serial: "H1", edge_number: 2 }],
    signatures: [{ signer: "op1", role: "operator" as const, timestamp: "2026-04-21T00:00:00Z", manifest_hash: "abc" }],
    immutable_log: true,
  };
}
function goodValidation() {
  return { validated_mode: true, iq_complete: true, oq_complete: true, pq_complete: true, expires_at: "2030-01-01" };
}

describe("TurningComplianceCheckEngine", () => {
  it("regime=none passes with only cert+thread", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-1", regime: "none", cert: goodCert(), thread: goodThread(),
    });
    expect(r.is_compliant).toBe(true);
  });

  it("aerospace requires cmtr + thread, not DHR", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-2", regime: "aerospace", cert: goodCert(), thread: goodThread(),
    });
    expect(r.is_compliant).toBe(true);
    expect(r.artefacts.find(a => a.name === "dhr")!.required).toBe(false);
  });

  it("BLOCKS aerospace when CMTR is not on file", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-3", regime: "aerospace",
      cert: { ...goodCert(), on_file: false },
      thread: goodThread(),
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /CMTR NOT on file/.test(b))).toBe(true);
  });

  it("BLOCKS aerospace when CMTR is expired", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-4", regime: "aerospace",
      cert: { ...goodCert(), expires_at: "2020-01-01" },
      thread: goodThread(),
    }, Date.now());
    expect(r.is_compliant).toBe(false);
  });

  it("BLOCKS when digital thread linkage is incomplete", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-5", regime: "medical",
      cert: goodCert(),
      thread: { linkage_complete: false, missing_node: "part_serial" },
      dhr: goodDHR(), validation: goodValidation(),
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /digital-thread/i.test(b))).toBe(true);
  });

  it("medical requires DHR payload — BLOCKS when missing", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-6", regime: "medical",
      cert: goodCert(), thread: goodThread(),
      validation: goodValidation(),
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /DHR payload missing/.test(b))).toBe(true);
  });

  it("DHR without signatures is rejected (21 CFR §11.200)", () => {
    const dhr = goodDHR();
    (dhr as any).signatures = [];
    const r = turningComplianceCheckEngine.check({
      part_id: "P-7", regime: "medical",
      cert: goodCert(), thread: goodThread(),
      dhr, validation: goodValidation(),
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /electronic signatures/.test(b))).toBe(true);
  });

  it("DHR with immutable_log=false rejected (21 CFR §11.10(e))", () => {
    const dhr = goodDHR();
    dhr.immutable_log = false;
    const r = turningComplianceCheckEngine.check({
      part_id: "P-8", regime: "medical",
      cert: goodCert(), thread: goodThread(),
      dhr, validation: goodValidation(),
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /append-only/.test(b))).toBe(true);
  });

  it("validation IQ/OQ/PQ partial → BLOCK", () => {
    const v = goodValidation();
    v.pq_complete = false;
    const r = turningComplianceCheckEngine.check({
      part_id: "P-9", regime: "medical",
      cert: goodCert(), thread: goodThread(),
      dhr: goodDHR(), validation: v,
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /PQ=false/.test(b))).toBe(true);
  });

  it("expired validation blocks", () => {
    const v = goodValidation();
    v.expires_at = "2020-01-01";
    const r = turningComplianceCheckEngine.check({
      part_id: "P-10", regime: "medical",
      cert: goodCert(), thread: goodThread(),
      dhr: goodDHR(), validation: v,
    }, Date.now());
    expect(r.is_compliant).toBe(false);
  });

  it("validated_mode deviations block", () => {
    const v = goodValidation();
    v.deviations = ["feed changed from 0.15 to 0.20", "rpm raised to 3200"];
    const r = turningComplianceCheckEngine.check({
      part_id: "P-11", regime: "medical",
      cert: goodCert(), thread: goodThread(),
      dhr: goodDHR(), validation: v,
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /deviation/i.test(b))).toBe(true);
  });

  it("safety_critical demands all 4 artefacts", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-12", regime: "safety_critical",
      cert: goodCert(), thread: goodThread(),
      dhr: goodDHR(), validation: goodValidation(),
    });
    expect(r.is_compliant).toBe(true);
    expect(r.artefacts.filter(a => a.required).length).toBe(4);
  });

  it("returns 4 artefact records regardless of regime", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-13", regime: "none", cert: goodCert(), thread: goodThread(),
    });
    expect(r.artefacts).toHaveLength(4);
  });

  it("carries part_id and regime on output", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-XYZ", regime: "aerospace", cert: goodCert(), thread: goodThread(),
    });
    expect(r.part_id).toBe("P-XYZ");
    expect(r.regime).toBe("aerospace");
  });

  it("CMTR invalid (on file but not validated) → BLOCK for aerospace", () => {
    const r = turningComplianceCheckEngine.check({
      part_id: "P-14", regime: "aerospace",
      cert: { ...goodCert(), validated: false },
      thread: goodThread(),
    });
    expect(r.is_compliant).toBe(false);
    expect(r.blocking_issues.some(b => /fails spec validation/.test(b))).toBe(true);
  });
});
