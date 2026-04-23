/**
 * FirstArticleInspectionPipelineEngine Tests (U-MIO32)
 * ====================================================
 * Covers: characteristic evaluation, disposition logic (ACCEPT/REJECT/MRB),
 * AS9102 Form 1/2/3 generation, CMM/probe lazy-loading, edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  firstArticleInspectionPipelineEngine,
  evaluateCharacteristic,
  dispositionRecommendation,
  type FAIInput,
  type FeatureInput,
  type CharacteristicResult,
} from "../engines/FirstArticleInspectionPipelineEngine.js";

function feature(
  id: string,
  nominal: number,
  tolPlus: number,
  tolMinus: number,
  designator: "critical" | "major" | "minor" = "major",
): FeatureInput {
  return {
    feature_id: id,
    feature_name: `Feature ${id}`,
    reference_location: `Zone-${id}`,
    designator,
    nominal,
    tolerance_plus: tolPlus,
    tolerance_minus: tolMinus,
    unit: "mm",
  };
}

describe("evaluateCharacteristic", () => {
  it("passes when measured == nominal (margin 100%)", () => {
    const r = evaluateCharacteristic(10, 0.1, -0.1, 10);
    expect(r.pass).toBe(true);
    expect(r.deviation).toBe(0);
    expect(r.margin_pct).toBeCloseTo(100, 1);
  });

  it("passes within tolerance band", () => {
    const r = evaluateCharacteristic(10, 0.1, -0.1, 10.05);
    expect(r.pass).toBe(true);
    expect(r.deviation).toBeCloseTo(0.05, 6);
    expect(r.margin_pct).toBeCloseTo(50, 1);
  });

  it("fails above upper limit", () => {
    const r = evaluateCharacteristic(10, 0.1, -0.1, 10.2);
    expect(r.pass).toBe(false);
    expect(r.deviation).toBeCloseTo(0.2, 6);
    expect(r.margin_pct).toBeLessThan(0);
  });

  it("fails below lower limit", () => {
    const r = evaluateCharacteristic(10, 0.1, -0.1, 9.8);
    expect(r.pass).toBe(false);
    expect(r.deviation).toBeCloseTo(-0.2, 6);
  });

  it("passes at the exact upper limit", () => {
    const r = evaluateCharacteristic(10, 0.1, -0.1, 10.1);
    expect(r.pass).toBe(true);
  });

  it("handles asymmetric tolerances", () => {
    // 10 +0.2 / -0.05
    const r = evaluateCharacteristic(10, 0.2, -0.05, 10.15);
    expect(r.pass).toBe(true);
  });
});

describe("dispositionRecommendation", () => {
  function result(
    num: number,
    designator: "critical" | "major" | "minor",
    pass: boolean | null,
    deviation: number = 0,
  ): CharacteristicResult {
    return {
      char_number: num,
      feature_id: `F${num}`,
      feature_name: `F${num}`,
      reference_location: `Zone-${num}`,
      designator,
      nominal: 10,
      tolerance_plus: 0.1,
      tolerance_minus: -0.1,
      measured_value: pass === null ? null : 10 + deviation,
      deviation: pass === null ? null : deviation,
      margin_pct: pass === null ? null : 50,
      pass,
      inspection_method: "CMM",
      equipment_id: "CMM-01",
      unit: "mm",
    };
  }

  it("ACCEPT when all characteristics pass and measured", () => {
    const d = dispositionRecommendation([
      result(1, "critical", true),
      result(2, "major", true),
      result(3, "minor", true),
    ]);
    expect(d.verdict).toBe("ACCEPT");
  });

  it("REJECT when any critical fails", () => {
    const d = dispositionRecommendation([
      result(1, "critical", false, 0.15),
      result(2, "major", true),
    ]);
    expect(d.verdict).toBe("REJECT");
    expect(d.critical_failures).toBe(1);
  });

  it("REJECT when multiple failures (any designator)", () => {
    const d = dispositionRecommendation([
      result(1, "major", false, 0.15),
      result(2, "minor", false, 0.15),
    ]);
    expect(d.verdict).toBe("REJECT");
    expect(d.fail_count).toBe(2);
  });

  it("MRB when single minor fail within 10% of band", () => {
    // band = 0.2, 10% = 0.02. Deviation 0.11 → exceedance = 0.01 ≤ 0.02
    const d = dispositionRecommendation([
      result(1, "minor", false, 0.11),
    ]);
    expect(d.verdict).toBe("MRB");
  });

  it("REJECT when single minor fail beyond 10% of band", () => {
    const d = dispositionRecommendation([
      result(1, "minor", false, 0.25),
    ]);
    expect(d.verdict).toBe("REJECT");
  });

  it("MRB when unmeasured and no failures (incomplete FAI)", () => {
    const d = dispositionRecommendation([
      result(1, "major", true),
      result(2, "critical", null),
    ]);
    expect(d.verdict).toBe("MRB");
    expect(d.unmeasured_count).toBe(1);
  });
});

describe("FirstArticleInspectionPipelineEngine.runFAI", () => {
  it("runs end-to-end FAI with all measurements present → ACCEPT", async () => {
    const input: FAIInput = {
      part_number: "PN-001",
      revision: "A",
      features: [
        feature("F1", 10.0, 0.1, -0.1, "critical"),
        feature("F2", 20.0, 0.05, -0.05, "major"),
        feature("F3", 5.0, 0.2, -0.2, "minor"),
      ],
      measurements: [
        { feature_id: "F1", measured_value: 10.02 },
        { feature_id: "F2", measured_value: 20.01 },
        { feature_id: "F3", measured_value: 4.99 },
      ],
    };
    const fai = await firstArticleInspectionPipelineEngine.runFAI(input);
    expect(fai.status).toBe("complete");
    expect(fai.disposition.verdict).toBe("ACCEPT");
    expect(fai.characteristics.length).toBe(3);
    expect(fai.fai_id).toMatch(/^FAI-/);
  });

  it("marks status=in_progress when some features unmeasured", async () => {
    const input: FAIInput = {
      part_number: "PN-002",
      revision: "A",
      features: [
        feature("F1", 10, 0.1, -0.1),
        feature("F2", 20, 0.1, -0.1),
      ],
      measurements: [{ feature_id: "F1", measured_value: 10 }],
    };
    const fai = await firstArticleInspectionPipelineEngine.runFAI(input);
    expect(fai.status).toBe("in_progress");
    expect(fai.disposition.verdict).toBe("MRB");
    expect(fai.disposition.unmeasured_count).toBe(1);
  });

  it("REJECTs when critical dimension is out of tolerance", async () => {
    const input: FAIInput = {
      part_number: "PN-003",
      revision: "A",
      features: [feature("F1", 10, 0.1, -0.1, "critical")],
      measurements: [{ feature_id: "F1", measured_value: 11 }],
    };
    const fai = await firstArticleInspectionPipelineEngine.runFAI(input);
    expect(fai.disposition.verdict).toBe("REJECT");
    expect(fai.disposition.critical_failures).toBe(1);
  });

  it("assigns sequential char numbers starting at 1", async () => {
    const input: FAIInput = {
      part_number: "PN-004",
      revision: "A",
      features: [
        feature("A", 10, 0.1, -0.1),
        feature("B", 20, 0.1, -0.1),
        feature("C", 30, 0.1, -0.1),
      ],
      measurements: [],
    };
    const fai = await firstArticleInspectionPipelineEngine.runFAI(input);
    expect(fai.characteristics.map(c => c.char_number)).toEqual([1, 2, 3]);
  });
});

describe("FirstArticleInspectionPipelineEngine.generateForms", () => {
  it("generates AS9102 Form 1, Form 2, Form 3, and Markdown", async () => {
    const input: FAIInput = {
      part_number: "PN-FORMS",
      revision: "B",
      serial_number: "SN-1001",
      purchase_order: "PO-42",
      drawing_number: "DWG-99",
      organization: "JM Die",
      inspector: "Alice",
      material_cert_id: "CERT-AISI1045-2026",
      supplier: "Steelmaster Inc",
      features: [
        feature("F1", 10, 0.1, -0.1, "critical"),
        feature("F2", 20, 0.05, -0.05, "major"),
      ],
      measurements: [
        { feature_id: "F1", measured_value: 10.01 },
        { feature_id: "F2", measured_value: 20.02 },
      ],
    };
    const fai = await firstArticleInspectionPipelineEngine.runFAI(input);
    const forms = firstArticleInspectionPipelineEngine.generateForms(fai.fai_id);

    expect(forms.form1.title).toMatch(/AS9102 Form 1/);
    expect(forms.form1.part_number).toBe("PN-FORMS");
    expect(forms.form1.revision).toBe("B");
    expect(forms.form1.drawing_number).toBe("DWG-99");
    expect(forms.form1.organization).toBe("JM Die");
    expect(forms.form1.inspector).toBe("Alice");

    expect(forms.form2.title).toMatch(/AS9102 Form 2/);
    expect(forms.form2.material_cert_id).toBe("CERT-AISI1045-2026");
    expect(forms.form2.supplier).toBe("Steelmaster Inc");

    expect(forms.form3.title).toMatch(/AS9102 Form 3/);
    expect(forms.form3.rows.length).toBe(2);
    expect(forms.form3.summary.total).toBe(2);
    expect(forms.form3.summary.pass).toBe(2);

    // Markdown contains all three form titles
    expect(forms.markdown).toContain("AS9102 Form 1");
    expect(forms.markdown).toContain("AS9102 Form 2");
    expect(forms.markdown).toContain("AS9102 Form 3");
    expect(forms.markdown).toContain("Disposition: **ACCEPT**");
  });

  it("throws when FAI id not found", () => {
    expect(() => firstArticleInspectionPipelineEngine.generateForms("FAI-99999"))
      .toThrow(/not found/);
  });
});
