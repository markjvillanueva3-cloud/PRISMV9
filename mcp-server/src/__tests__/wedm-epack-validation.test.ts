/**
 * E-Pack Validation Test Suite (U-W100-13)
 *
 * Validates that generated E-pack codes map to valid machine parameters.
 * Cross-references codes against machine capabilities and physics bounds.
 *
 * Tests:
 *   1. Format validation — all generated codes match E#### pattern
 *   2. Field range validation — material_group, thickness_code, condition_code, pass_number in bounds
 *   3. Machine capability validation — codes within machine's tech table range
 *   4. Physics cross-validation — imported params consistent with code meaning
 *   5. Discrepancy detection — flags unusual combinations for calibration
 *   6. Real program validation — ITW SHAKEPROOF and NOZE TEST codes validate
 */

import { describe, it, expect } from "vitest";
import {
  generateEPackCode,
  decodeEPackCode,
  validateEPackCode,
  crossValidateEPackParams,
  resolveEPackMaterialGroup,
  resolveEPackThicknessCode,
  resolveEPackConditionCode,
} from "../engines/WEDMPrintToProgramEngine.js";

// ============================================================================
// 1. FORMAT + FIELD RANGE VALIDATION
// ============================================================================

describe("E-pack code format validation", () => {
  it("valid code E1221 passes all checks", () => {
    const r = validateEPackCode("E1221");
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.decoded).toEqual({
      material_group: 1,
      thickness_code: 2,
      condition_code: 2,
      pass_number: 1,
    });
  });

  it("rejects non-E prefix", () => {
    const r = validateEPackCode("F1221");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Invalid E-pack format");
  });

  it("rejects too few digits", () => {
    const r = validateEPackCode("E122");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Invalid E-pack format");
  });

  it("rejects too many digits", () => {
    const r = validateEPackCode("E12210");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Invalid E-pack format");
  });

  it("rejects empty string", () => {
    const r = validateEPackCode("");
    expect(r.valid).toBe(false);
  });

  it("rejects material group 0", () => {
    const r = validateEPackCode("E0221");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Material group 0 out of range");
  });

  it("rejects material group 8", () => {
    const r = validateEPackCode("E8221");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Material group 8 out of range");
  });

  it("rejects condition code 0", () => {
    const r = validateEPackCode("E1201");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Condition code 0 out of range");
  });

  it("accepts condition codes 1-9 per Mitsubishi FA/MV spec", () => {
    // Conditions 1-9 are valid — CHOCTAW DEFENSE uses E1281 (condition 8)
    for (let c = 1; c <= 9; c++) {
      const code = `E12${c}1`;
      const r = validateEPackCode(code);
      expect(r.valid).toBe(true);
    }
  });


  it("rejects pass number 0", () => {
    const r = validateEPackCode("E1220");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("Pass number 0 out of range");
  });

  it("accepts all valid thickness codes 0-9", () => {
    for (let t = 0; t <= 9; t++) {
      const code = `E1${t}21`;
      const r = validateEPackCode(code);
      expect(r.valid).toBe(true);
    }
  });

  it("accepts all valid material groups 1-7", () => {
    for (let g = 1; g <= 7; g++) {
      const code = `E${g}221`;
      const r = validateEPackCode(code);
      expect(r.valid).toBe(true);
    }
  });

  it("accepts all valid condition codes 1-5", () => {
    for (let c = 1; c <= 5; c++) {
      const code = `E12${c}1`;
      const r = validateEPackCode(code);
      expect(r.valid).toBe(true);
    }
  });

  it("accepts all valid pass numbers 1-9", () => {
    for (let p = 1; p <= 9; p++) {
      const code = `E122${p}`;
      const r = validateEPackCode(code);
      expect(r.valid).toBe(true);
    }
  });
});

// ============================================================================
// 2. MACHINE CAPABILITY VALIDATION
// ============================================================================

describe("Machine capability validation", () => {
  it("Mitsubishi MV: 5-pass at condition 2 is valid", () => {
    const r = validateEPackCode("E1225", "mitsubishi_mv");
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("Mitsubishi MV: 6-pass at condition 2 exceeds typical max", () => {
    const r = validateEPackCode("E1226", "mitsubishi_mv");
    expect(r.valid).toBe(true); // still valid code, just a warning
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.discrepancies.some(d => d.field === "pass_number")).toBe(true);
  });

  it("Mitsubishi MV: 7-pass at condition 5 (ultra-fine) is within limit", () => {
    const r = validateEPackCode("E1257", "mitsubishi_mv");
    expect(r.valid).toBe(true);
    expect(r.discrepancies.filter(d => d.field === "pass_number")).toHaveLength(0);
  });

  it("Sodick: thickness code 9 exceeds capability", () => {
    const r = validateEPackCode("E1921", "sodick");
    expect(r.valid).toBe(true);
    expect(r.discrepancies.some(d => d.field === "thickness_code")).toBe(true);
  });

  it("default machine: 4-pass high-speed is flagged", () => {
    const r = validateEPackCode("E1214", "default");
    expect(r.valid).toBe(true);
    // Pass 4 at condition 1 — exceeds max_passes_by_condition[1]=4
    // But condition_code 1 + pass > 1 is also flagged as unusual
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("unknown machine family falls back to default", () => {
    const r = validateEPackCode("E1221", "nonexistent_machine");
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});

// ============================================================================
// 3. PHYSICS CONSISTENCY FLAGS
// ============================================================================

describe("Physics consistency checks", () => {
  it("high-speed condition on skim pass is flagged", () => {
    const r = validateEPackCode("E1212"); // condition=1, pass=2
    expect(r.valid).toBe(true);
    expect(r.discrepancies.some(d =>
      d.field === "condition_vs_pass" && d.severity === "info",
    )).toBe(true);
  });

  it("ultra-fine condition on rough pass is warned", () => {
    const r = validateEPackCode("E1251"); // condition=5, pass=1
    expect(r.valid).toBe(true);
    expect(r.discrepancies.some(d =>
      d.field === "condition_vs_pass" && d.severity === "warning",
    )).toBe(true);
  });

  it("standard condition on rough pass has no physics warnings", () => {
    const r = validateEPackCode("E1221"); // condition=2, pass=1
    expect(r.discrepancies.filter(d => d.field === "condition_vs_pass")).toHaveLength(0);
  });

  it("fine condition on pass 3 has no physics warnings", () => {
    const r = validateEPackCode("E1233"); // condition=3, pass=3
    expect(r.discrepancies.filter(d => d.field === "condition_vs_pass")).toHaveLength(0);
  });
});

// ============================================================================
// 4. CROSS-VALIDATION WITH IMPORTED PARAMS
// ============================================================================

describe("Cross-validation with imported tech table params", () => {
  it("valid rough pass params — no issues", () => {
    const issues = crossValidateEPackParams(
      "E1221",
      { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0, wire_speed_m_min: 12 },
    );
    expect(issues).toHaveLength(0);
  });

  it("skim with lower current than rough — no issues", () => {
    const roughParams = { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0 };
    const issues = crossValidateEPackParams(
      "E1222",
      { t_on_us: 2.0, t_off_us: 12.0, peak_current_A: 8.0 },
      roughParams,
    );
    expect(issues).toHaveLength(0);
  });

  it("skim with HIGHER current than rough — warning", () => {
    const roughParams = { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0 };
    const issues = crossValidateEPackParams(
      "E1222",
      { t_on_us: 2.0, t_off_us: 12.0, peak_current_A: 25.0 },
      roughParams,
    );
    expect(issues.some(i => i.field === "peak_current_A" && i.severity === "warning")).toBe(true);
  });

  it("skim with LONGER t_on than rough — warning", () => {
    const roughParams = { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0 };
    const issues = crossValidateEPackParams(
      "E1223",
      { t_on_us: 6.0, t_off_us: 12.0, peak_current_A: 5.0 },
      roughParams,
    );
    expect(issues.some(i => i.field === "t_on_us" && i.severity === "warning")).toBe(true);
  });

  it("t_on outside physics range — error", () => {
    const issues = crossValidateEPackParams(
      "E1221",
      { t_on_us: 0.01, t_off_us: 16.0, peak_current_A: 20.0 },
    );
    expect(issues.some(i => i.field === "t_on_us" && i.severity === "error")).toBe(true);
  });

  it("t_off outside physics range — error", () => {
    const issues = crossValidateEPackParams(
      "E1221",
      { t_on_us: 4.0, t_off_us: 150.0, peak_current_A: 20.0 },
    );
    expect(issues.some(i => i.field === "t_off_us" && i.severity === "error")).toBe(true);
  });

  it("peak current outside physics range — error", () => {
    const issues = crossValidateEPackParams(
      "E1221",
      { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 80.0 },
    );
    expect(issues.some(i => i.field === "peak_current_A" && i.severity === "error")).toBe(true);
  });

  it("wire speed outside range — error", () => {
    const issues = crossValidateEPackParams(
      "E1221",
      { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0, wire_speed_m_min: 30 },
    );
    expect(issues.some(i => i.field === "wire_speed_m_min" && i.severity === "error")).toBe(true);
  });

  it("invalid code format — error", () => {
    const issues = crossValidateEPackParams(
      "INVALID",
      { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0 },
    );
    expect(issues.some(i => i.field === "code" && i.severity === "error")).toBe(true);
  });
});

// ============================================================================
// 5. REAL PROGRAM VALIDATION — ITW SHAKEPROOF + NOZE TEST
// ============================================================================

describe("Real program E-pack codes validate", () => {
  it("ITW SHAKEPROOF E1221-E1224 all valid for Mitsubishi", () => {
    for (let pass = 1; pass <= 4; pass++) {
      const code = `E122${pass}`;
      const r = validateEPackCode(code, "mitsubishi_mv");
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    }
  });

  it("NOZE TEST E2821-E2825 all valid for Mitsubishi", () => {
    for (let pass = 1; pass <= 5; pass++) {
      const code = `E282${pass}`;
      const r = validateEPackCode(code, "mitsubishi_mv");
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    }
  });

  it("ITW SHAKEPROOF codes match generator output", () => {
    // D2 tool steel, 25.4mm, standard condition (Ra 3.2 → condition 2)
    for (let pass = 1; pass <= 4; pass++) {
      const generated = generateEPackCode("D2", 25.4, pass, 3.2, "brass_0.25");
      expect(generated).toBe(`E122${pass}`);
      expect(validateEPackCode(generated, "mitsubishi_mv").valid).toBe(true);
    }
  });

  it("NOZE TEST codes match generator output", () => {
    // Stainless, 250mm, standard condition (Ra 3.2 → condition 2)
    for (let pass = 1; pass <= 5; pass++) {
      const generated = generateEPackCode("stainless", 250, pass, 3.2, "brass_0.25");
      expect(generated).toBe(`E282${pass}`);
      expect(validateEPackCode(generated, "mitsubishi_mv").valid).toBe(true);
    }
  });

  it("generated codes always have valid field ranges (exhaustive)", () => {
    // Test all material groups × representative thicknesses × conditions × passes
    const materials = ["D2", "stainless 304", "6061", "copper", "carbide", "titanium", "inconel 718"];
    const thicknesses = [2, 8, 20, 40, 60, 90, 120, 175, 250, 400];
    const raTargets = [5.0, 2.5, 1.2, 0.6, 0.3];

    for (const mat of materials) {
      for (const thick of thicknesses) {
        for (const ra of raTargets) {
          for (let pass = 1; pass <= 5; pass++) {
            const code = generateEPackCode(mat, thick, pass, ra);
            const r = validateEPackCode(code);
            expect(r.valid).toBe(true);
          }
        }
      }
    }
    // 7 materials × 10 thicknesses × 5 Ra × 5 passes = 1,750 codes validated
  });
});

// ============================================================================
// 6. ITW SHAKEPROOF CROSS-VALIDATION WITH PUBLISHED PARAMS
// ============================================================================

describe("ITW SHAKEPROOF cross-validation with typical params", () => {
  // Typical Mitsubishi D2 25.4mm tech table params (from published data)
  const roughParams = { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0 };
  const skim1Params = { t_on_us: 2.0, t_off_us: 12.0, peak_current_A: 8.0 };
  const skim2Params = { t_on_us: 1.0, t_off_us: 10.0, peak_current_A: 4.0 };
  const skim3Params = { t_on_us: 0.5, t_off_us: 8.0, peak_current_A: 2.0 };

  it("rough pass params are physics-valid", () => {
    expect(crossValidateEPackParams("E1221", roughParams)).toHaveLength(0);
  });

  it("skim 1 consistent with rough (lower current, shorter t_on)", () => {
    expect(crossValidateEPackParams("E1222", skim1Params, roughParams)).toHaveLength(0);
  });

  it("skim 2 consistent with rough", () => {
    expect(crossValidateEPackParams("E1223", skim2Params, roughParams)).toHaveLength(0);
  });

  it("skim 3 consistent with rough", () => {
    expect(crossValidateEPackParams("E1224", skim3Params, roughParams)).toHaveLength(0);
  });

  it("energy cascade verified: each skim has lower energy than previous", () => {
    const params = [roughParams, skim1Params, skim2Params, skim3Params];
    for (let i = 1; i < params.length; i++) {
      expect(params[i].peak_current_A).toBeLessThan(params[i - 1].peak_current_A);
      expect(params[i].t_on_us).toBeLessThan(params[i - 1].t_on_us);
    }
  });
});

// ============================================================================
// 7. DISCREPANCY LOGGING STRUCTURE
// ============================================================================

describe("Discrepancy structure", () => {
  it("discrepancies have required fields", () => {
    const r = validateEPackCode("E1251"); // ultra-fine on rough
    expect(r.discrepancies.length).toBeGreaterThan(0);
    for (const d of r.discrepancies) {
      expect(d).toHaveProperty("field");
      expect(d).toHaveProperty("expected");
      expect(d).toHaveProperty("actual");
      expect(d).toHaveProperty("severity");
      expect(["info", "warning", "error"]).toContain(d.severity);
    }
  });

  it("cross-validation issues have required fields", () => {
    const issues = crossValidateEPackParams(
      "E1222",
      { t_on_us: 6.0, t_off_us: 12.0, peak_current_A: 25.0 },
      { t_on_us: 4.0, t_off_us: 16.0, peak_current_A: 20.0 },
    );
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue).toHaveProperty("field");
      expect(issue).toHaveProperty("issue");
      expect(issue).toHaveProperty("severity");
    }
  });
});
