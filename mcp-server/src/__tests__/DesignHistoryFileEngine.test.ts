import { describe, it, expect } from "vitest";
import { designHistoryFileEngine } from "../engines/DesignHistoryFileEngine.js";

function buildArtifact(overrides: Partial<Parameters<typeof designHistoryFileEngine.evaluate>[0]["artifacts"][number]> = {}) {
  return {
    id: overrides.id ?? "A1",
    type: overrides.type ?? ("design_plan" as const),
    title: overrides.title ?? "T",
    revision: overrides.revision ?? "A",
    approved: overrides.approved ?? true,
    approver: overrides.approver ?? "Alice",
    approved_date: overrides.approved_date ?? "2026-03-01",
    traces_to: overrides.traces_to,
    esig_part11_compliant: overrides.esig_part11_compliant ?? true,
  };
}

function fullDHF() {
  return [
    buildArtifact({ id: "PLAN", type: "design_plan" }),
    buildArtifact({ id: "IN1", type: "design_input" }),
    buildArtifact({ id: "OUT1", type: "design_output", traces_to: ["IN1"] }),
    buildArtifact({ id: "REV1", type: "design_review" }),
    buildArtifact({ id: "VER1", type: "design_verification", traces_to: ["IN1"] }),
    buildArtifact({ id: "VAL1", type: "design_validation", traces_to: ["IN1"] }),
    buildArtifact({ id: "XFR1", type: "design_transfer" }),
  ];
}

describe("DesignHistoryFileEngine", () => {
  it("full DHF with traces is ready", () => {
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: fullDHF(),
    });
    expect(r.dhf_ready).toBe(true);
    expect(r.missing_types).toHaveLength(0);
    expect(r.traceability_gaps).toHaveLength(0);
  });

  it("missing design_validation is critical", () => {
    const arts = fullDHF().filter((a) => a.type !== "design_validation");
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: arts,
    });
    expect(r.dhf_ready).toBe(false);
    expect(r.missing_types).toContain("design_validation");
    expect(r.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("output without traceability flagged", () => {
    const arts = fullDHF();
    const out = arts.find((a) => a.type === "design_output")!;
    out.traces_to = [];
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: arts,
    });
    expect(r.traceability_gaps.some((g) => g.from_id === "OUT1")).toBe(true);
  });

  it("verification without trace to input flagged", () => {
    const arts = fullDHF();
    const ver = arts.find((a) => a.type === "design_verification")!;
    ver.traces_to = [];
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: arts,
    });
    expect(r.traceability_gaps.some((g) => g.from_id === "VER1")).toBe(true);
  });

  it("validation without trace flagged", () => {
    const arts = fullDHF();
    const val = arts.find((a) => a.type === "design_validation")!;
    val.traces_to = undefined;
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: arts,
    });
    expect(r.traceability_gaps.some((g) => g.from_id === "VAL1")).toBe(true);
  });

  it("unapproved artifact flagged", () => {
    const arts = fullDHF();
    arts[0]!.approved = false;
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: arts,
    });
    expect(r.unapproved_artifacts).toContain(arts[0]!.id);
  });

  it("non-Part11 esig on Class II flagged", () => {
    const arts = fullDHF();
    arts[0]!.esig_part11_compliant = false;
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "II",
      artifacts: arts,
    });
    expect(r.findings.some((f) => f.message.includes("Part 11"))).toBe(true);
  });

  it("Class I does not require Part 11 esig", () => {
    const arts = fullDHF();
    arts[0]!.esig_part11_compliant = false;
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "I",
      artifacts: arts,
    });
    expect(r.findings.some((f) => f.message.includes("Part 11"))).toBe(false);
  });

  it("completeness percentage reflects missing", () => {
    const arts = fullDHF().slice(0, 4); // 4 of 7
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "I",
      artifacts: arts,
    });
    expect(r.completeness_pct).toBeCloseTo((4 / 7) * 100, 0);
  });

  it("empty artifacts list is not ready", () => {
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "I",
      artifacts: [],
    });
    expect(r.dhf_ready).toBe(false);
    expect(r.missing_types.length).toBe(7);
  });

  it("reasoning mentions device class", () => {
    const r = designHistoryFileEngine.evaluate({
      device_name: "DevA",
      device_class: "III",
      artifacts: fullDHF(),
    });
    expect(r.reasoning.join(" ")).toMatch(/III/);
  });

  it("getStats returns required types", () => {
    const s = designHistoryFileEngine.getStats();
    expect(s.required_artifacts.length).toBe(7);
    expect(s.reference).toMatch(/820\.30/);
  });
});
