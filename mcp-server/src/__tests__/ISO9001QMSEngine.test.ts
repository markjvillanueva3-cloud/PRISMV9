/**
 * ISO9001QMSEngine.test.ts — HOTEL/U-ISO9001-QMS (iter4)
 */
import { describe, it, expect } from "vitest";
import {
  iso9001QMSEngine,
  type ISO9001ClauseEvidence,
  type ISO9001ClauseId,
  type ISO9001QMSInput,
} from "../engines/ISO9001QMSEngine.js";

function passingEvidence(clauses: ISO9001ClauseId[]): ISO9001ClauseEvidence[] {
  return clauses.map((c) => ({
    clause: c,
    procedure_documented: true,
    records_kept: true,
    audit_result: "pass",
    last_audited: "2026-05-01",
  }));
}

describe("ISO9001QMSEngine", () => {
  describe("validate — happy path", () => {
    it("returns audit_ready when all clauses pass + zero major findings", () => {
      const allClauses = iso9001QMSEngine.listClauses();
      const r = iso9001QMSEngine.validate({ evidence: passingEvidence([...allClauses]) });
      expect(r.readiness).toBe("audit_ready");
      expect(r.compliance_score).toBe(1);
      expect(r.findings.filter((f) => f.severity === "major")).toHaveLength(0);
    });

    it("excludes §8.3 design_development when not in scope", () => {
      const evidence = passingEvidence([
        ...iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes"),
      ]);
      const r = iso9001QMSEngine.validate({ evidence });
      expect(r.readiness).toBe("audit_ready");
      expect(r.missing_clauses).not.toContain("8.3_design_development");
    });

    it("includes §8.3 when design_development_in_scope=true", () => {
      const evidence = passingEvidence([
        ...iso9001QMSEngine.listClauses().filter((c) => c !== "8.4_externally_provided_processes"),
      ]);
      const r = iso9001QMSEngine.validate({ evidence, design_development_in_scope: true });
      expect(r.readiness).toBe("audit_ready");
    });

    it("includes §8.4 when uses_external_providers=true", () => {
      const evidence = passingEvidence([
        ...iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development"),
      ]);
      const r = iso9001QMSEngine.validate({ evidence, uses_external_providers: true });
      expect(r.readiness).toBe("audit_ready");
    });
  });

  describe("validate — missing-clause findings", () => {
    it("flags missing clauses as major nonconformities", () => {
      const partial = passingEvidence([
        "4.1_context",
        "5.1_leadership_commitment",
      ]);
      const r = iso9001QMSEngine.validate({ evidence: partial });
      expect(r.missing_clauses.length).toBeGreaterThan(0);
      expect(r.findings.filter((f) => f.severity === "major").length).toBeGreaterThan(0);
      expect(r.readiness).toBe("not_ready");
    });

    it("score decreases as more clauses go missing", () => {
      const allClauses = [...iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes")];
      const full = iso9001QMSEngine.validate({ evidence: passingEvidence(allClauses) });
      const half = iso9001QMSEngine.validate({
        evidence: passingEvidence(allClauses.slice(0, Math.floor(allClauses.length / 2))),
      });
      expect(half.compliance_score).toBeLessThan(full.compliance_score);
    });
  });

  describe("validate — clause-level findings", () => {
    it("undocumented-procedure produces minor finding", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      const evidence = passingEvidence([...allClauses]);
      // Break one clause's procedure_documented flag
      evidence[0] = { ...evidence[0], procedure_documented: false };
      const r = iso9001QMSEngine.validate({ evidence });
      expect(r.findings.some((f) => f.severity === "minor" && /procedure not documented/.test(f.message))).toBe(true);
    });

    it("failed audit produces major finding", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      const evidence = passingEvidence([...allClauses]);
      evidence[0] = { ...evidence[0], audit_result: "fail" };
      const r = iso9001QMSEngine.validate({ evidence });
      expect(r.findings.some((f) => f.severity === "major" && /last audit failed/.test(f.message))).toBe(true);
    });

    it("missing records produces minor finding", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      const evidence = passingEvidence([...allClauses]);
      evidence[0] = { ...evidence[0], records_kept: false };
      const r = iso9001QMSEngine.validate({ evidence });
      expect(r.findings.some((f) => /records not kept/.test(f.message))).toBe(true);
    });
  });

  describe("validate — audit + management-review recency (§9.2 + §9.3)", () => {
    it("flags management review >12mo as major (§9.3)", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      const r = iso9001QMSEngine.validate({
        evidence: passingEvidence(allClauses),
        months_since_management_review: 15,
      });
      expect(r.findings.some((f) => f.clause === "9.3_management_review" && f.severity === "major")).toBe(true);
      expect(r.readiness).not.toBe("audit_ready");
    });

    it("flags internal audit >12mo as major (§9.2)", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      const r = iso9001QMSEngine.validate({
        evidence: passingEvidence(allClauses),
        months_since_internal_audit: 18,
      });
      expect(r.findings.some((f) => f.clause === "9.2_internal_audit" && f.severity === "major")).toBe(true);
    });

    it("does NOT flag management review at 12mo or earlier", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      const r = iso9001QMSEngine.validate({
        evidence: passingEvidence(allClauses),
        months_since_management_review: 11,
      });
      expect(r.findings.some((f) => f.clause === "9.3_management_review")).toBe(false);
    });
  });

  describe("Readiness gates", () => {
    it("audit_ready requires score >= 0.95 AND no major findings", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      // All passing → 1.0, no majors → audit_ready
      const r = iso9001QMSEngine.validate({ evidence: passingEvidence(allClauses) });
      expect(r.readiness).toBe("audit_ready");
    });

    it("remediation_needed when 0.70 ≤ score < 0.95", () => {
      const allClauses = iso9001QMSEngine.listClauses().filter((c) => c !== "8.3_design_development" && c !== "8.4_externally_provided_processes");
      // Drop ~10% to get score ~0.9 but no missing-clause major
      // Mark a few as minor failures instead
      const evidence = passingEvidence(allClauses);
      // Mark 2 clauses with undocumented procedure → 2 minor findings
      evidence[0] = { ...evidence[0], procedure_documented: false };
      evidence[1] = { ...evidence[1], procedure_documented: false };
      const r = iso9001QMSEngine.validate({ evidence });
      expect(r.compliance_score).toBeLessThan(0.95);
      expect(r.compliance_score).toBeGreaterThan(0.7);
      expect(r.readiness).toBe("remediation_needed");
    });

    it("not_ready when score < 0.70", () => {
      const r = iso9001QMSEngine.validate({
        evidence: passingEvidence(["4.1_context", "5.1_leadership_commitment"]),
      });
      expect(r.readiness).toBe("not_ready");
    });
  });

  describe("R12 fail-loud", () => {
    it("throws on missing input", () => {
      expect(() => iso9001QMSEngine.validate(null as any)).toThrow(/input required/);
    });

    it("throws on missing evidence array", () => {
      expect(() => iso9001QMSEngine.validate({} as any)).toThrow(/evidence must be an array/);
    });

    it("throws on evidence record missing clause id", () => {
      expect(() =>
        iso9001QMSEngine.validate({
          evidence: [{ procedure_documented: true, records_kept: true } as any],
        }),
      ).toThrow(/clause id/);
    });
  });

  describe("Defensive immutability", () => {
    it("returned result is frozen", () => {
      const r = iso9001QMSEngine.validate({ evidence: [] });
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.findings)).toBe(true);
      expect(Object.isFrozen(r.missing_clauses)).toBe(true);
      expect(Object.isFrozen(r.reasoning)).toBe(true);
    });

    it("listClauses returns a defensive copy", () => {
      const a = iso9001QMSEngine.listClauses();
      expect(Object.isFrozen(a)).toBe(true);
    });

    it("source pins v1 implementation", () => {
      const r = iso9001QMSEngine.validate({ evidence: [] });
      expect(r.source).toBe("ISO9001QMSEngine.v1");
    });
  });
});
