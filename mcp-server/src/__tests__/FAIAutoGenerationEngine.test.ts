import { describe, it, expect } from "vitest";
import {
  faiAutoGenerationEngine as fai,
  FAIAutoGenerationEngine,
  type FAIAutoGenerationInput,
} from "../engines/FAIAutoGenerationEngine.js";

function nominal(o: Partial<FAIAutoGenerationInput> = {}): FAIAutoGenerationInput {
  return {
    part: {
      part_number: "NORTHROP-BR-001",
      part_revision: "A",
      part_name: "Aerospace bracket",
      fair_number: "FAIR-2026-001",
      fair_type: "full",
      organization: "JM Die Mfg",
      customer: "Northrop Grumman",
      drawing_number: "DWG-12345",
      drawing_revision: "B",
      serial_number: "SN-0001",
      manufacturing_process: "5-axis mill",
    },
    materials: [
      { material_designation: "Ti-6Al-4V", spec_number: "AMS 4928", cert_number: "CERT-A1", cert_attached: true },
    ],
    special_processes: [
      { process_name: "Anodize Type III", spec_number: "MIL-A-8625", supplier: "Vendor-X", cert_attached: true },
    ],
    functional_tests: [
      { test_name: "Pull test 5kN", spec_number: "ASTM E8", result: "pass" },
    ],
    characteristics: [
      { char_number: 1, drawing_zone: "A2", requirement: "Ø.500 ± .002", inspection_method: "CMM", measured: "Ø.5005", verdict: "accept" },
      { char_number: 2, drawing_zone: "B3", requirement: "Flatness 0.005", inspection_method: "CMM", measured: "0.003", verdict: "accept" },
    ],
    inspector_name: "J. Smith",
    inspection_date_iso: "2026-05-24",
    ...o,
  };
}

describe("FAIAutoGenerationEngine", () => {
  it("exports a singleton with generate()", () => {
    expect(fai).toBeInstanceOf(FAIAutoGenerationEngine);
    expect(typeof fai.generate).toBe("function");
  });

  it("throws on missing part or characteristics", () => {
    expect(() => fai.generate({} as FAIAutoGenerationInput)).toThrow(/part \+ characteristics\[\] required/);
  });

  it("fair_pass when all characteristics accepted + no missing certs", () => {
    const r = fai.generate(nominal());
    expect(r.verdict).toBe("fair_pass");
    expect(r.accept_count).toBe(2);
    expect(r.reject_count).toBe(0);
    expect(r.incomplete_count).toBe(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("fair_fail when any characteristic rejected", () => {
    const r = fai.generate(nominal({
      characteristics: [
        { char_number: 1, drawing_zone: "A2", requirement: "Ø.500 ± .002", inspection_method: "CMM", measured: "Ø.510", verdict: "reject" },
        { char_number: 2, drawing_zone: "B3", requirement: "Flatness 0.005", inspection_method: "CMM", measured: "0.003", verdict: "accept" },
      ],
    }));
    expect(r.verdict).toBe("fair_fail");
    expect(r.reject_count).toBe(1);
    expect(r.warnings.some(w => /Char #1 REJECTED/.test(w))).toBe(true);
  });

  it("fair_incomplete when characteristic has no measurement", () => {
    const r = fai.generate(nominal({
      characteristics: [
        { char_number: 1, drawing_zone: "A2", requirement: "Ø.500 ± .002", inspection_method: "CMM" },
      ],
    }));
    expect(r.verdict).toBe("fair_incomplete");
    expect(r.incomplete_count).toBe(1);
  });

  it("Form 1 includes part number + rev + FAIR number + customer", () => {
    const r = fai.generate(nominal());
    expect(r.form1_markdown).toMatch(/AS9102 Form 1/);
    expect(r.form1_markdown).toMatch(/NORTHROP-BR-001/);
    expect(r.form1_markdown).toMatch(/\| Part revision \| A \|/);
    expect(r.form1_markdown).toMatch(/FAIR-2026-001/);
    expect(r.form1_markdown).toMatch(/Northrop Grumman/);
  });

  it("Form 2 includes materials table with cert attached marker", () => {
    const r = fai.generate(nominal());
    expect(r.form2_markdown).toMatch(/AS9102 Form 2/);
    expect(r.form2_markdown).toMatch(/Ti-6Al-4V \| AMS 4928 \| CERT-A1 \| ✓/);
  });

  it("Form 2 warns + marks ✗ when material cert missing", () => {
    const r = fai.generate(nominal({
      materials: [
        { material_designation: "Ti-6Al-4V", spec_number: "AMS 4928", cert_number: "", cert_attached: false },
      ],
    }));
    expect(r.form2_markdown).toMatch(/✗/);
    expect(r.warnings.some(w => /Material cert missing/.test(w))).toBe(true);
  });

  it("Form 2 functional test FAIL surfaces in warnings", () => {
    const r = fai.generate(nominal({
      functional_tests: [{ test_name: "Pull test 5kN", spec_number: "ASTM E8", result: "fail" }],
    }));
    expect(r.warnings.some(w => /Functional test FAILED/.test(w))).toBe(true);
    expect(r.form2_markdown).toMatch(/FAIL/);
  });

  it("Form 3 includes per-characteristic row with verdict mark", () => {
    const r = fai.generate(nominal());
    expect(r.form3_markdown).toMatch(/AS9102 Form 3/);
    expect(r.form3_markdown).toMatch(/\| 1 \| A2 \| Ø\.500 ± \.002 \| CMM \| Ø\.5005 \| ✓ Accept \|/);
  });

  it("Form 3 marks rejected characteristics with ✗ REJECT", () => {
    const r = fai.generate(nominal({
      characteristics: [
        { char_number: 1, drawing_zone: "A2", requirement: "Ø.500 ± .002", inspection_method: "CMM", measured: "Ø.510", verdict: "reject", notes: "scrap" },
      ],
    }));
    expect(r.form3_markdown).toMatch(/✗ REJECT/);
    expect(r.form3_markdown).toMatch(/\| scrap \|/);
  });

  it("Form 3 marks incomplete with ⚠ + warns", () => {
    const r = fai.generate(nominal({
      characteristics: [
        { char_number: 1, drawing_zone: "A2", requirement: "Ø.500 ± .002", inspection_method: "CMM" },
      ],
    }));
    expect(r.form3_markdown).toMatch(/⚠ Incomplete/);
    expect(r.warnings.some(w => /INCOMPLETE/.test(w))).toBe(true);
  });

  it("delta FAIR type appears in Form 1", () => {
    const r = fai.generate(nominal({
      part: { ...nominal().part, fair_type: "delta" },
    }));
    expect(r.form1_markdown).toMatch(/\| FAIR type \| delta \|/);
  });

  it("inspector signature + date appear in full markdown", () => {
    const r = fai.generate(nominal());
    expect(r.full_markdown).toMatch(/\*\*Inspector:\*\* J\. Smith/);
    expect(r.full_markdown).toMatch(/\*\*Date:\*\* 2026-05-24/);
    expect(r.full_markdown).toMatch(/\*\*Verdict:\*\* FAIR PASS/);
  });

  it("handles partial FAIR with mixed accept/reject characteristics", () => {
    const r = fai.generate(nominal({
      characteristics: [
        { char_number: 1, drawing_zone: "A2", requirement: "Ø.500 ± .002", inspection_method: "CMM", measured: "Ø.5005", verdict: "accept" },
        { char_number: 2, drawing_zone: "B3", requirement: "Flatness 0.005", inspection_method: "CMM", measured: "0.010", verdict: "reject" },
        { char_number: 3, drawing_zone: "C1", requirement: "Surface 32 Ra", inspection_method: "profilometer" },
      ],
    }));
    expect(r.accept_count).toBe(1);
    expect(r.reject_count).toBe(1);
    expect(r.incomplete_count).toBe(1);
    expect(r.verdict).toBe("fair_fail");  // reject wins over incomplete
    expect(r.total_characteristics).toBe(3);
  });

  it("source cites AS9102 Rev C + AS9100 + SAE ARP9162", () => {
    const r = fai.generate(nominal());
    expect(r.source).toMatch(/AS9102 Rev C|AS9100|ARP9162/);
  });
});
