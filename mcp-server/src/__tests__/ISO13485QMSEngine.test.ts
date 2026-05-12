import { describe, it, expect } from "vitest";
import { iso13485QmsEngine } from "../engines/ISO13485QMSEngine.js";

const allCore = [
  "4.2.3_MDF",
  "4.2.4_document_control",
  "4.2.5_records_control",
  "6.2_competence",
  "7.1_planning",
  "7.2_customer_requirements",
  "7.3_design_development",
  "7.4_purchasing",
  "7.5.1_production_controls",
  "7.5.6_process_validation",
  "7.5.8_identification",
  "7.6_monitoring_measuring",
  "8.2.1_feedback",
  "8.2.2_complaint_handling",
  "8.3_nonconforming_product",
  "8.4_data_analysis",
  "8.5.1_improvement",
  "8.5.2_CAPA",
] as const;

function fullEvidence() {
  return allCore.map((cl) => ({
    clause: cl,
    procedure_documented: true,
    records_kept: true,
    last_audited: "2026-01-15",
    audit_result: "pass" as const,
  }));
}

describe("ISO13485QMSEngine", () => {
  it("audit_ready for Class I with full evidence", () => {
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence: fullEvidence(),
    });
    expect(r.readiness).toBe("audit_ready");
    expect(r.compliance_score).toBeCloseTo(1.0, 2);
    expect(r.findings.filter((f) => f.severity === "major")).toHaveLength(0);
  });

  it("sterile Class IIa adds 3 sterilization clauses", () => {
    const r = iso13485QmsEngine.evaluate({
      device_class: "IIa",
      sterile: true,
      evidence: fullEvidence(),
    });
    expect(r.clauses_applicable).toBeGreaterThanOrEqual(21);
    expect(r.missing_clauses).toContain("7.5.5_sterilization_validation");
  });

  it("implantable adds UDI clause", () => {
    const r = iso13485QmsEngine.evaluate({
      device_class: "IIa",
      implantable: true,
      evidence: fullEvidence(),
    });
    expect(r.missing_clauses).toContain("7.5.7_UDI_traceability");
  });

  it("Class III auto-adds UDI + reg reporting", () => {
    const r = iso13485QmsEngine.evaluate({
      device_class: "III",
      evidence: fullEvidence(),
    });
    expect(r.missing_clauses).toContain("7.5.7_UDI_traceability");
    expect(r.missing_clauses).toContain("8.2.3_regulatory_reporting");
  });

  it("missing clause produces major finding", () => {
    const evidence = fullEvidence().slice(0, 5); // drop many
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence,
    });
    expect(r.readiness).not.toBe("audit_ready");
    expect(r.findings.some((f) => f.severity === "major")).toBe(true);
  });

  it("procedure missing but present in list → major finding", () => {
    const evidence = fullEvidence();
    evidence[0]!.procedure_documented = false;
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence,
    });
    expect(r.findings.some((f) => f.message.includes("no documented procedure"))).toBe(true);
  });

  it("records not kept → minor finding", () => {
    const evidence = fullEvidence();
    evidence[0]!.records_kept = false;
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence,
    });
    expect(r.findings.some((f) => f.severity === "minor")).toBe(true);
  });

  it("failed internal audit produces major finding", () => {
    const evidence = fullEvidence();
    evidence[0]!.audit_result = "fail";
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence,
    });
    expect(r.findings.some((f) => f.message.includes("audit FAILED"))).toBe(true);
  });

  it("remediation_needed intermediate state", () => {
    const evidence = fullEvidence();
    evidence[0]!.procedure_documented = false;
    evidence[1]!.procedure_documented = false;
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence,
    });
    expect(r.readiness).toBe("remediation_needed");
  });

  it("not_ready when many majors", () => {
    const evidence = fullEvidence().slice(0, 3); // most missing
    const r = iso13485QmsEngine.evaluate({
      device_class: "I",
      evidence,
    });
    expect(r.readiness).toBe("not_ready");
  });

  it("reasoning includes device class and counts", () => {
    const r = iso13485QmsEngine.evaluate({
      device_class: "III",
      evidence: fullEvidence(),
    });
    expect(r.reasoning.join(" ")).toMatch(/Device class III/);
    expect(r.reasoning.join(" ")).toMatch(/applicable/);
  });

  it("getStats returns reference and core count", () => {
    const s = iso13485QmsEngine.getStats();
    expect(s.core_clauses).toBe(18);
    expect(s.reference).toMatch(/ISO 13485/);
  });
});
