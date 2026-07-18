import { describe, it, expect } from "vitest";
import {
  medicalCFR820TraceabilityEngine as eng,
  MedicalCFR820TraceabilityEngine,
  type MedicalTraceabilityInput,
} from "../engines/MedicalCFR820TraceabilityEngine.js";

function nominal(o: Partial<MedicalTraceabilityInput> = {}): MedicalTraceabilityInput {
  return {
    device_class: "II",
    contact_type: "surface_skin",
    sterilization: "ethylene_oxide",
    lot_size: 500,
    ...o,
  };
}

describe("MedicalCFR820TraceabilityEngine", () => {
  it("exports singleton with classify()", () => {
    expect(eng).toBeInstanceOf(MedicalCFR820TraceabilityEngine);
    expect(typeof eng.classify).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.classify({} as MedicalTraceabilityInput))
      .toThrow(/device_class \+ contact_type \+ sterilization required/);
  });

  it("throws on non-positive lot_size", () => {
    expect(() => eng.classify(nominal({ lot_size: 0 }))).toThrow(/positive lot_size/);
    expect(() => eng.classify(nominal({ lot_size: -1 }))).toThrow(/positive lot_size/);
  });

  it("Class I no-contact baseline → minimal requirements (exempt, IQ only)", () => {
    const r = eng.classify(nominal({
      device_class: "I",
      contact_type: "no_contact",
      sterilization: "none",
    }));
    expect(r.process_validation_required.value).toBe(false);
    expect(r.validation_protocol.value).toBe("IQ_only");
    expect(r.premarket_pathway.value).toBe("exempt");
    expect(r.biocompatibility_cert_required).toBe(false);
    expect(r.udi_marking_required).toBe(false);
    expect(r.risk_class_iso14971.value).toBe("low");
  });

  it("Class II + sterile → IQ_OQ_PQ full validation", () => {
    const r = eng.classify(nominal());
    expect(r.validation_protocol.value).toBe("IQ_OQ_PQ_full");
    expect(r.process_validation_required.value).toBe(true);
    expect(r.risk_class_iso14971.value).toBe("moderate");
  });

  it("Class III always full validation + serial trace + PMA", () => {
    const r = eng.classify(nominal({ device_class: "III", contact_type: "blood_contact" }));
    expect(r.validation_protocol.value).toBe("IQ_OQ_PQ_full");
    expect(r.serial_traceability_required).toBe(true);
    expect(r.premarket_pathway.value).toBe("pma_required");
    expect(r.premarket_lead_months.value).toBe(18);
    expect(r.risk_class_iso14971.value).toBe("high");
  });

  it("Class III + no 510(k) → PMA warning", () => {
    const r = eng.classify(nominal({ device_class: "III", has_510k_clearance: false }));
    expect(r.warnings.some(w => /Class III.*PMA.*18\+.*FDA review/.test(w))).toBe(true);
  });

  it("Class II + 510(k) → 510k_predicate path with no lead-time", () => {
    const r = eng.classify(nominal({ has_510k_clearance: true }));
    expect(r.premarket_pathway.value).toBe("510k_predicate");
    expect(r.premarket_lead_months.value).toBe(0);
  });

  it("Class II + no 510(k) → 510k_no_predicate + 6mo lead", () => {
    const r = eng.classify(nominal({ has_510k_clearance: false }));
    expect(r.premarket_pathway.value).toBe("510k_no_predicate");
    expect(r.premarket_lead_months.value).toBe(6);
  });

  it("implant forces full validation + serial trace + UDI even at Class I", () => {
    const r = eng.classify(nominal({
      device_class: "I",
      is_implant: true,
      contact_type: "implant_long",
    }));
    expect(r.validation_protocol.value).toBe("IQ_OQ_PQ_full");
    expect(r.serial_traceability_required).toBe(true);
    expect(r.udi_marking_required).toBe(true);
    expect(r.risk_class_iso14971.value).toBe("high");
  });

  it("bioabsorbable + Class I forces full validation", () => {
    const r = eng.classify(nominal({
      device_class: "I",
      is_bioabsorbable: true,
      contact_type: "implant_short",
      sterilization: "none",
    }));
    expect(r.validation_protocol.value).toBe("IQ_OQ_PQ_full");
  });

  it("lot + DHR traceability ALWAYS required for medical", () => {
    const r = eng.classify(nominal({ device_class: "I", contact_type: "no_contact", sterilization: "none" }));
    expect(r.lot_traceability_required).toBe(true);
    expect(r.dhr_required).toBe(true);
  });

  it("no_contact → no biocompatibility tests", () => {
    const r = eng.classify(nominal({ contact_type: "no_contact" }));
    expect(r.biocompatibility_cert_required).toBe(false);
    expect(r.biocompatibility_iso_tests).toEqual([]);
  });

  it("surface_skin → ISO 10993-5 + -10 cytotoxicity + irritation", () => {
    const r = eng.classify(nominal({ contact_type: "surface_skin" }));
    expect(r.biocompatibility_cert_required).toBe(true);
    expect(r.biocompatibility_iso_tests.some(t => /10993-5/.test(t))).toBe(true);
    expect(r.biocompatibility_iso_tests.some(t => /10993-10/.test(t))).toBe(true);
  });

  it("blood_contact → hemocompatibility + systemic toxicity tests", () => {
    const r = eng.classify(nominal({ contact_type: "blood_contact" }));
    expect(r.biocompatibility_iso_tests.some(t => /10993-4/.test(t))).toBe(true);
    expect(r.biocompatibility_iso_tests.some(t => /10993-11/.test(t))).toBe(true);
  });

  it("long-term implant → local + systemic + genotoxicity + degradation", () => {
    const r = eng.classify(nominal({
      device_class: "III",
      is_implant: true,
      contact_type: "implant_long",
      is_bioabsorbable: true,
    }));
    expect(r.biocompatibility_iso_tests.some(t => /10993-6/.test(t))).toBe(true);
    expect(r.biocompatibility_iso_tests.some(t => /10993-3/.test(t))).toBe(true);
    expect(r.biocompatibility_iso_tests.some(t => /10993-13/.test(t))).toBe(true);
  });

  it("EtO + bioabsorbable → residue warning (ISO 10993-7)", () => {
    const r = eng.classify(nominal({
      sterilization: "ethylene_oxide",
      is_bioabsorbable: true,
      contact_type: "implant_short",
    }));
    expect(r.warnings.some(w => /EtO.*bioabsorbable.*residue/.test(w))).toBe(true);
  });

  it("gamma + bioabsorbable → polymer degradation warning", () => {
    const r = eng.classify(nominal({
      sterilization: "gamma_radiation",
      is_bioabsorbable: true,
      contact_type: "implant_short",
    }));
    expect(r.warnings.some(w => /Gamma.*bioabsorbable.*polymers/.test(w))).toBe(true);
  });

  it("steam autoclave on implant → polymer/coating tolerance warning", () => {
    const r = eng.classify(nominal({
      sterilization: "steam_autoclave",
      contact_type: "implant_short",
      is_implant: true,
    }));
    expect(r.warnings.some(w => /Steam autoclave.*implant.*121-134/.test(w))).toBe(true);
  });

  it("Class III + high patient population → PMSF warning", () => {
    const r = eng.classify(nominal({
      device_class: "III",
      patient_population_per_year: 250000,
    }));
    expect(r.warnings.some(w => /PMSF.*post-market surveillance.*822/.test(w))).toBe(true);
  });

  it("UDI required for Class II+ or any implant", () => {
    expect(eng.classify(nominal({ device_class: "I" })).udi_marking_required).toBe(false);
    expect(eng.classify(nominal({ device_class: "II" })).udi_marking_required).toBe(true);
    expect(eng.classify(nominal({ device_class: "III" })).udi_marking_required).toBe(true);
    expect(eng.classify(nominal({ device_class: "I", is_implant: true })).udi_marking_required).toBe(true);
  });

  it("source cites 21 CFR + ISO 13485 + ISO 14971 + ISO 10993", () => {
    const r = eng.classify(nominal());
    expect(r.source).toMatch(/21 CFR.*820|ISO 13485|ISO 14971|ISO 10993/);
  });
});
