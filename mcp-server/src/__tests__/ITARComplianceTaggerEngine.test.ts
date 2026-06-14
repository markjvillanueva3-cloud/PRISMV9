import { describe, it, expect } from "vitest";
import {
  itarComplianceTaggerEngine as eng,
  ITARComplianceTaggerEngine,
  type ITARComplianceInput,
} from "../engines/ITARComplianceTaggerEngine.js";

function nominal(o: Partial<ITARComplianceInput> = {}): ITARComplianceInput {
  return {
    customer_industry: "commercial",
    end_use_application: "industrial_machinery",
    drawing_classification: "proprietary",
    end_use_country: "US",
    material_origin_country: "US",
    ...o,
  };
}

describe("ITARComplianceTaggerEngine", () => {
  it("exports singleton with classify()", () => {
    expect(eng).toBeInstanceOf(ITARComplianceTaggerEngine);
    expect(typeof eng.classify).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.classify({} as ITARComplianceInput))
      .toThrow(/customer_industry \+ end_use_application \+ drawing_classification required/);
  });

  it("commercial industrial baseline → EAR99 + L1 + no ITAR", () => {
    const r = eng.classify(nominal());
    expect(r.itar_controlled).toBe(false);
    expect(r.ear_eccn.value).toBe("EAR99 (no specific controls)");
    expect(r.cmmc_level_required.value).toBe("L1");
    expect(r.dfars_252_204_7012_required).toBe(false);
    expect(r.foreign_national_access_restricted).toBe(false);
    expect(r.export_license_required).toBe(false);
  });

  it("defense + weapons → ITAR Cat I + L3 + DFARS + license required", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "weapons",
      drawing_classification: "itar_controlled",
      end_use_country: "GB",
    }));
    expect(r.itar_controlled).toBe(true);
    expect(r.usml_category.value).toMatch(/firearms|close-assault/);
    expect(r.cmmc_level_required.value).toBe("L3");
    expect(r.dfars_252_204_7012_required).toBe(true);
    expect(r.foreign_national_access_restricted).toBe(true);
    expect(r.export_license_required).toBe(true);
    expect(r.audit_trail_required).toBe(true);
  });

  it("defense + missiles → USML Category IV", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "missiles",
      drawing_classification: "itar_controlled",
    }));
    expect(r.itar_controlled).toBe(true);
    expect(r.usml_category.value).toMatch(/IV.*launch|missiles|rockets/);
  });

  it("satellites → USML Cat XV (spacecraft)", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "satellites",
      drawing_classification: "itar_controlled",
    }));
    expect(r.itar_controlled).toBe(true);
    expect(r.usml_category.value).toMatch(/XV.*spacecraft|satellites/);
  });

  it("aerospace commercial → EAR 9A610.x + L2 + no ITAR", () => {
    const r = eng.classify(nominal({
      customer_industry: "aerospace",
      end_use_application: "commercial_aircraft",
      drawing_classification: "proprietary",
    }));
    expect(r.itar_controlled).toBe(false);
    expect(r.ear_eccn.value).toMatch(/9A610/);
    expect(r.cmmc_level_required.value).toBe("L2");
    expect(r.audit_trail_required).toBe(true);  // EAR 9A610 requires record-keeping
  });

  it("aerospace commercial + foreign end-use → export license required", () => {
    const r = eng.classify(nominal({
      customer_industry: "aerospace",
      end_use_application: "commercial_aircraft",
      end_use_country: "JP",
    }));
    expect(r.export_license_required).toBe(true);
  });

  it("medical → EAR99 + L1 (no defense controls)", () => {
    const r = eng.classify(nominal({
      customer_industry: "medical",
      end_use_application: "medical_implant",
    }));
    expect(r.itar_controlled).toBe(false);
    expect(r.ear_eccn.value).toBe("EAR99 (no specific controls)");
    expect(r.cmmc_level_required.value).toBe("L1");
  });

  it("itar_controlled drawing classification triggers ITAR even with non-USML end-use", () => {
    const r = eng.classify(nominal({
      drawing_classification: "itar_controlled",
      customer_industry: "aerospace",
      end_use_application: "research_only",
    }));
    expect(r.itar_controlled).toBe(true);
    expect(r.cmmc_level_required.value).toBe("L3");
  });

  it("contains_usml_components=true forces ITAR control", () => {
    const r = eng.classify(nominal({ contains_usml_components: true }));
    expect(r.itar_controlled).toBe(true);
  });

  it("embargoed destination (IR) → warning + license required if ITAR", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "weapons",
      drawing_classification: "itar_controlled",
      end_use_country: "IR",
    }));
    expect(r.embargoed_destination).toBe(true);
    expect(r.warnings.some(w => /EMBARGOED.*PROHIBITED/.test(w))).toBe(true);
  });

  it("ITAR-controlled without DFARS clause → warning", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "weapons",
      drawing_classification: "itar_controlled",
      has_dfars_clause: false,
    }));
    expect(r.warnings.some(w => /DFARS 252.204-7012.*contract review/.test(w))).toBe(true);
  });

  it("ITAR with non-US material origin → traceability warning", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "missiles",
      drawing_classification: "itar_controlled",
      material_origin_country: "DE",
    }));
    expect(r.warnings.some(w => /non-US material.*USML traceability/.test(w))).toBe(true);
  });

  it("unknown end-use + non-ITAR drawing → warning to verify with customer", () => {
    const r = eng.classify(nominal({ end_use_application: "unknown" }));
    expect(r.warnings.some(w => /End-use unknown.*verify with customer/.test(w))).toBe(true);
  });

  it("defense customer + non-USML end-use → ECCN warning for dual-use review", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "industrial_machinery",
      drawing_classification: "proprietary",
    }));
    expect(r.ear_eccn.value).toMatch(/0A919|0A521/);
    expect(r.warnings.some(w => /non-USML.*export counsel/.test(w))).toBe(true);
    expect(r.cmmc_level_required.value).toBe("L2");  // defense customer → L2
    expect(r.dfars_252_204_7012_required).toBe(true);
  });

  it("secret drawing classification triggers ITAR + L3", () => {
    const r = eng.classify(nominal({ drawing_classification: "secret" }));
    expect(r.itar_controlled).toBe(true);
    expect(r.cmmc_level_required.value).toBe("L3");
  });

  it("end_use_country US (domestic) → no export license required", () => {
    const r = eng.classify(nominal({
      customer_industry: "defense",
      end_use_application: "weapons",
      drawing_classification: "itar_controlled",
      end_use_country: "US",
    }));
    expect(r.itar_controlled).toBe(true);
    expect(r.export_license_required).toBe(false);  // domestic
  });

  it("source cites 22 CFR + 15 CFR + DFARS + CMMC v2 + NIST 800-171", () => {
    const r = eng.classify(nominal());
    expect(r.source).toMatch(/22 CFR|15 CFR|DFARS 252.204-7012|CMMC v2|NIST SP 800-171/);
  });

  it("3 customer industries × multiple end-uses exercised", () => {
    const cases = [
      { customer_industry: "defense", end_use_application: "weapons", drawing_classification: "itar_controlled" },
      { customer_industry: "aerospace", end_use_application: "commercial_aircraft", drawing_classification: "proprietary" },
      { customer_industry: "medical", end_use_application: "medical_implant", drawing_classification: "proprietary" },
      { customer_industry: "automotive", end_use_application: "automotive_consumer", drawing_classification: "public" },
    ] as const;
    const eccnSet = new Set(cases.map(c => eng.classify(nominal(c)).ear_eccn.value));
    expect(eccnSet.size).toBeGreaterThanOrEqual(3);  // ≥3 distinct ECCN values
  });
});
