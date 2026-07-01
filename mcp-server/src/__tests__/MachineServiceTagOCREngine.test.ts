/**
 * Tests for MachineServiceTagOCREngine — QUOTING-PIPELINE-MS0 / U-QP04.
 * Concrete field-extraction invariants across 5 vendor tag formats.
 */
import { describe, it, expect } from "vitest";
import { MachineServiceTagOCREngine } from "../engines/MachineServiceTagOCREngine.js";

const eng = new MachineServiceTagOCREngine();

describe("MachineServiceTagOCREngine.extract — happy path per vendor", () => {
  it("Haas VF-2: extracts make=HAAS, model=VF-2, serial=1098761", () => {
    const r = eng.extract({ text: "HAAS Automation Inc Model VF-2 S/N: 1098761" });
    expect(r.success).toBe(true);
    expect(r.fields.make).toBe("HAAS");
    expect(r.fields.model).toBe("VF-2");
    expect(r.fields.serial).toBe("1098761");
  });

  it("Hurco VM-1: extracts make=HURCO, model=VM-1, serial=56781", () => {
    const r = eng.extract({ text: "HURCO Model VM-1 Serial No 56781 Voltage 230" });
    expect(r.success).toBe(true);
    expect(r.fields.make).toBe("HURCO");
    expect(r.fields.model).toBe("VM-1");
    expect(r.fields.serial).toBe("56781");
    expect(r.fields.voltage).toBe("230");
  });

  it("Mazak Integrex i-200: extracts make=MAZAK, model=INTEGREX-I-200", () => {
    const r = eng.extract({ text: "MAZAK INTEGREX i-200 S/N: 2026-A123" });
    expect(r.fields.make).toBe("MAZAK");
    expect(r.fields.model).toBe("INTEGREX-I-200");
    expect(r.fields.serial).toBe("2026-A123");
  });

  it("Sodick AQ327L wire-EDM: extracts make=SODICK, model=AQ327L, serial=SD-7891", () => {
    const r = eng.extract({ text: "SODICK AQ327L S/N: SD-7891 Mfg date 2026-04" });
    expect(r.fields.make).toBe("SODICK");
    expect(r.fields.model).toBe("AQ327L");
    expect(r.fields.serial).toBe("SD-7891");
    expect(r.fields.mfg_date).toBe("2026-04");
  });

  it("Okuma LB3000: extracts make=OKUMA, model=LB3000", () => {
    const r = eng.extract({ text: "OKUMA LB3000-EX2 Serial Number 11234567" });
    expect(r.fields.make).toBe("OKUMA");
    expect(r.fields.model).toContain("LB3000");
  });
});

describe("MachineServiceTagOCREngine.extract — failure modes (R12 fail-loud)", () => {
  it("empty text → success=false with reason=empty-or-missing-text + all 6 fields missing", () => {
    const r = eng.extract({ text: "" });
    expect(r.success).toBe(false);
    expect(r.reason).toBe("empty-or-missing-text");
    expect(r.missing.length).toBe(6);
    expect(r.overall_confidence).toBe(0);
  });

  it("text with only voltage (no make/model/serial) → success=false with required-fields reason", () => {
    const r = eng.extract({ text: "Voltage 230V 3-phase" });
    expect(r.success).toBe(false);
    expect(r.reason).toMatch(/missing-required-fields/);
    expect(r.missing).toContain("make");
    expect(r.missing).toContain("model");
    expect(r.missing).toContain("serial");
  });

  it("unknown builder → make=null, success=false", () => {
    const r = eng.extract({ text: "ACME-MFG Model XYZ-100 S/N: ABC-123" });
    expect(r.fields.make).toBeNull();
    expect(r.success).toBe(false);
  });
});

describe("MachineServiceTagOCREngine.extract — adversarial inputs", () => {
  it("NaN ocrConfidence → still extracts fields, no crash", () => {
    const r = eng.extract({ text: "HAAS Model VF-2 S/N: 1098761", ocrConfidence: NaN });
    expect(r.success).toBe(true);
    expect(r.fields.make).toBe("HAAS");
  });

  it("Infinity ocrConfidence → clamped to 1.0, overall_confidence ≤ 1", () => {
    const r = eng.extract({ text: "HAAS Model VF-2 S/N: 1098761", ocrConfidence: Infinity });
    expect(r.overall_confidence).toBeLessThanOrEqual(1);
    expect(r.overall_confidence).toBeGreaterThan(0);
  });

  it("oversized text (10K chars) still extracts the tag fields", () => {
    const filler = "X".repeat(10000);
    const r = eng.extract({ text: `HAAS Model VF-2 S/N: 1098761 ${filler}` });
    expect(r.fields.make).toBe("HAAS");
  });
});

describe("MachineServiceTagOCREngine.extract — field_confidence + per-field detection", () => {
  it("per-field confidence aligns: make=0.90, model=0.85, serial=0.90 when all 3 present", () => {
    const r = eng.extract({ text: "HAAS Model VF-2 S/N: 1098761" });
    expect(r.field_confidence.make).toBe(0.90);
    expect(r.field_confidence.model).toBe(0.85);
    expect(r.field_confidence.serial).toBe(0.90);
  });

  it("overall_confidence is mean of the 3 required field confidences", () => {
    const r = eng.extract({ text: "HAAS Model VF-2 S/N: 1098761" });
    expect(r.overall_confidence).toBeCloseTo((0.90 + 0.85 + 0.90) / 3, 4);
  });
});
