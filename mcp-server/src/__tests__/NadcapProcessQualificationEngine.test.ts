import { describe, it, expect } from "vitest";
import { nadcapProcessQualificationEngine } from "../engines/NadcapProcessQualificationEngine.js";

describe("NadcapProcessQualificationEngine", () => {
  it("approved with all compliant and no findings", () => {
    const r = nadcapProcessQualificationEngine.qualify({
      process: "ndt",
      line_items: Array.from({ length: 20 }, (_, i) => ({
        ref: `AC7114 §${i + 1}`,
        description: `Item ${i + 1}`,
        status: "compliant" as const,
      })),
      operator_certs: ["NAS-410 L2 UT"],
      last_audit_date: new Date().toISOString(),
    });
    expect(r.verdict).toBe("approved");
    expect(r.findings_A).toBe(0);
  });

  it("A-finding triggers denied verdict", () => {
    const r = nadcapProcessQualificationEngine.qualify({
      process: "heat_treat",
      line_items: [
        { ref: "AC7102 §5", description: "Pyrometry", status: "critical" },
      ],
      tus_last_date: new Date().toISOString(),
      operator_certs: ["pyrometry_qualified"],
    });
    expect(r.verdict).toBe("denied");
    expect(r.findings_A).toBe(1);
  });

  it("conditional for >2 B-findings", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      ref: `AC7102 §${i}`,
      description: `Item ${i}`,
      status: i < 3 ? ("major" as const) : ("compliant" as const),
    }));
    const r = nadcapProcessQualificationEngine.qualify({
      process: "heat_treat",
      line_items: items,
      tus_last_date: new Date().toISOString(),
      operator_certs: ["pyrometry_qualified"],
    });
    expect(r.verdict).toBe("conditional");
  });

  it("overdue audit denies approval", () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 30); // 30mo ago
    const r = nadcapProcessQualificationEngine.qualify({
      process: "ndt",
      line_items: [{ ref: "AC7114 §1", description: "X", status: "compliant" }],
      operator_certs: ["NAS-410 L2 UT"],
      last_audit_date: old.toISOString(),
    });
    expect(r.audit_overdue).toBe(true);
    expect(r.verdict).toBe("denied");
  });

  it("TUS overdue for heat treat forces denial", () => {
    const old = new Date();
    old.setDate(old.getDate() - 120);
    const r = nadcapProcessQualificationEngine.qualify({
      process: "heat_treat",
      line_items: [{ ref: "AC7102 §1", description: "X", status: "compliant" }],
      tus_last_date: old.toISOString(),
      operator_certs: ["pyrometry_qualified"],
    });
    expect(r.tus_overdue).toBe(true);
    expect(r.verdict).toBe("denied");
  });

  it("missing TUS for heat treat denies", () => {
    const r = nadcapProcessQualificationEngine.qualify({
      process: "heat_treat",
      line_items: [{ ref: "AC7102 §1", description: "X", status: "compliant" }],
      operator_certs: ["pyrometry_qualified"],
    });
    expect(r.tus_overdue).toBe(true);
  });

  it("missing NAS-410 cert denies NDT", () => {
    const r = nadcapProcessQualificationEngine.qualify({
      process: "ndt",
      line_items: [{ ref: "AC7114 §1", description: "X", status: "compliant" }],
      operator_certs: [], // no NAS-410
    });
    expect(r.cert_gaps.length).toBeGreaterThan(0);
    expect(r.verdict).toBe("denied");
  });

  it("remediation priority lists A first", () => {
    const r = nadcapProcessQualificationEngine.qualify({
      process: "chemical_processing",
      line_items: [
        { ref: "AC7108 §1", description: "bath", status: "minor" },
        { ref: "AC7108 §2", description: "filter", status: "critical" },
        { ref: "AC7108 §3", description: "alarm", status: "major" },
      ],
      operator_certs: ["process_inspector_qualified"],
    });
    expect(r.remediation_priority[0]?.severity).toBe("A");
    expect(r.remediation_priority[1]?.severity).toBe("B");
    expect(r.remediation_priority[2]?.severity).toBe("C");
  });

  it("not_applicable items excluded from applicable count", () => {
    const r = nadcapProcessQualificationEngine.qualify({
      process: "composites",
      line_items: [
        { ref: "AC7117 §1", description: "a", status: "compliant" },
        { ref: "AC7117 §2", description: "b", status: "not_applicable" },
      ],
      operator_certs: ["layup_qualified"],
    });
    expect(r.applicable_count).toBe(1);
  });

  it("compliance_pct below 85 → conditional", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      ref: `AC7118 §${i}`,
      description: `X${i}`,
      status: i < 5 ? ("minor" as const) : ("compliant" as const),
    }));
    const r = nadcapProcessQualificationEngine.qualify({
      process: "conventional_machining",
      line_items: items,
      operator_certs: ["operator_trained"],
    });
    expect(r.compliance_pct).toBeLessThan(85);
    expect(r.verdict).toBe("conditional");
  });

  it("getStats returns all processes", () => {
    const s = nadcapProcessQualificationEngine.getStats();
    expect(s.processes.length).toBeGreaterThanOrEqual(9);
    expect(s.reference).toMatch(/Nadcap/);
  });
});
