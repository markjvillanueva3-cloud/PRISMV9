/**
 * WEDM-CAL-MS2 / U-CAL10 .. U-CAL13 — Mitsubishi Dialect Hardening
 *
 * Validates that the post engine emits syntactically-correct Mitsubishi
 * M-codes, picks the right E-code family by material × thickness × taper,
 * matches real-program structure section-for-section, and generates
 * UV-taper programs that parallel the NOZE TEST reference.
 *
 * Reference programs: data/programs/wire-edm/
 *   - ITW SHAKEPROOF (D2, 25.4mm, E1221-E1224, no taper)
 *   - NOZE TEST (SS, UV taper, E2821-E2825)
 *   - CHOCTAW 38CAL CANNELURE (thin die, E1281-E1285)
 *
 * Engines: MitsubishiMV1200RWireEDMMasterPostEngine
 */
import { describe, it, expect } from "vitest";
import {
  MitsubishiMV1200RWireEDMMasterPostEngine,
  mitsubishiMV1200RWireEDMMasterPostEngine,
  type MitsubishiWEDMPostConfig,
  type WireEDMOperation,
  type WireEDMMaterial,
} from "../../engines/MitsubishiMV1200RWireEDMMasterPostEngine.js";

function cfg(overrides: Partial<MitsubishiWEDMPostConfig> = {}): MitsubishiWEDMPostConfig {
  return {
    program_number: "L999",
    program_comment: "TEST PROGRAM",
    units: "imperial",
    submerged: true,
    auto_wire_thread: true,
    wire_diameter_mm: 0.25,
    e_pack_base: 8,
    ...overrides,
  };
}

const d2Steel: WireEDMMaterial = {
  name: "D2 tool steel",
  hardness_hrc: 60,
  conductivity_class: "medium",
};
const ss304: WireEDMMaterial = {
  name: "304 stainless steel",
  conductivity_class: "medium",
};
const thinDieSteel: WireEDMMaterial = {
  name: "A2 tool steel",
  conductivity_class: "medium",
};
const carbide: WireEDMMaterial = {
  name: "Tungsten carbide",
  conductivity_class: "low",
};
const aluminum: WireEDMMaterial = {
  name: "Aluminum 6061",
  conductivity_class: "high",
};

function makeOp(o: Partial<WireEDMOperation> = {}): WireEDMOperation {
  return {
    operation_type: "profile",
    pass: "rough",
    start_x: 0,
    start_y: 0,
    profile_points: [
      { x: 10, y: 0, type: "linear" },
      { x: 10, y: 10, type: "linear" },
      { x: 0, y: 10, type: "linear" },
      { x: 0, y: 0, type: "linear" },
    ],
    material: d2Steel,
    thickness_mm: 25.4,
    offset_direction: "right",
    ...o,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// U-CAL10: Complete Mitsubishi M-Code Coverage
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL10: M-code dialect coverage", () => {
  const engine = mitsubishiMV1200RWireEDMMasterPostEngine;

  it("default dialect is M800 (matches JM Die real programs)", () => {
    const c = cfg();
    expect(engine.rawMCode(c, "wire_thread")).toBe("M20");
    expect(engine.rawMCode(c, "wire_cut")).toBe("M21");
    expect(engine.rawMCode(c, "tank_fill")).toBe("M78");
    expect(engine.rawMCode(c, "tank_drain")).toBe("M58");
    expect(engine.rawMCode(c, "water_on")).toBe("M80");
    expect(engine.rawMCode(c, "wire_on")).toBe("M82");
    expect(engine.rawMCode(c, "power_on")).toBe("M84");
    expect(engine.rawMCode(c, "adaptive_on")).toBe("M90");
    expect(engine.rawMCode(c, "adaptive_off")).toBe("M91");
    expect(engine.rawMCode(c, "program_end")).toBe("M02");
  });

  it("M700V dialect falls back to legacy M-codes", () => {
    const c = cfg({ dialect: "M700V" });
    expect(engine.rawMCode(c, "wire_thread")).toBe("M6");
    expect(engine.rawMCode(c, "wire_cut")).toBe("M7");
    expect(engine.rawMCode(c, "tank_fill")).toBe("M28");
    expect(engine.rawMCode(c, "tank_drain")).toBe("M29");
    expect(engine.rawMCode(c, "program_end")).toBe("M2");
  });

  it("M700V marks water_on / wire_on / power_on as unsupported (comment fallback)", () => {
    const c = cfg({ dialect: "M700V" });
    expect(engine.emitMCode(c, "water_on").startsWith("(M700V:")).toBe(true);
    expect(engine.emitMCode(c, "wire_on").startsWith("(M700V:")).toBe(true);
    expect(engine.emitMCode(c, "power_on").startsWith("(M700V:")).toBe(true);
    expect(engine.emitMCode(c, "adaptive_on").startsWith("(M700V:")).toBe(true);
  });

  it("emitMCode formats supported codes as `CODE (Label)`", () => {
    const c = cfg();
    expect(engine.emitMCode(c, "wire_thread")).toBe("M20 (Thread Wire)");
    expect(engine.emitMCode(c, "tank_fill")).toBe("M78 (Fill Tank)");
    expect(engine.emitMCode(c, "adaptive_on")).toBe("M90 (Adaptive Control On)");
  });

  it("generated M800 program contains the full M-code sequence", () => {
    const out = engine.generateProgram([makeOp()], cfg());
    const joined = out.gcode.join("\n");

    // Pre-cut sequence: tank fill → water → wire → power → adaptive on
    expect(joined).toMatch(/M78/);
    expect(joined).toMatch(/M80/);
    expect(joined).toMatch(/M82/);
    expect(joined).toMatch(/M84/);
    expect(joined).toMatch(/M90/);
    // Thread the wire
    expect(joined).toMatch(/M20/);
    // End sequence: adaptive off → drain → program end
    expect(joined).toMatch(/M91/);
    expect(joined).toMatch(/M58/);
    expect(joined).toMatch(/M02/);
    // Final wire cut
    expect(joined).toMatch(/M21/);
  });

  it("M800 program does NOT emit legacy M6/M7/M28/M29", () => {
    const out = engine.generateProgram([makeOp()], cfg());
    const joined = out.gcode.join("\n");
    // Use word-boundary-safe regex so M02 isn't matched by /M2/
    expect(joined).not.toMatch(/\bM6\b/);
    expect(joined).not.toMatch(/\bM7\b/);
    expect(joined).not.toMatch(/\bM28\b/);
    expect(joined).not.toMatch(/\bM29\b/);
  });

  it("M700V program emits legacy codes and skips standalone water/wire/power", () => {
    const out = engine.generateProgram([makeOp()], cfg({ dialect: "M700V" }));
    const joined = out.gcode.join("\n");
    expect(joined).toMatch(/\bM6\b/);  // Thread
    expect(joined).toMatch(/\bM7\b/);  // Cut
    expect(joined).toMatch(/\bM28\b/); // Submerge
    expect(joined).toMatch(/\bM29\b/); // Drain
    expect(joined).toMatch(/\bM2\b/);  // Program end
    // M800-only power-drive codes should be absent
    expect(joined).not.toMatch(/\bM80\b/);
    expect(joined).not.toMatch(/\bM82\b/);
    expect(joined).not.toMatch(/\bM84\b/);
    expect(joined).not.toMatch(/\bM90\b/);
    expect(joined).not.toMatch(/\bM91\b/);
  });

  it("set_work_origin=true (default) emits G92 X0 Y0", () => {
    const out = engine.generateProgram([makeOp()], cfg());
    expect(out.gcode.some((l) => /G92\s+X0\.0\s+Y0\.0/.test(l))).toBe(true);
  });

  it("set_work_origin=false suppresses G92", () => {
    const out = engine.generateProgram([makeOp()], cfg({ set_work_origin: false }));
    expect(out.gcode.some((l) => /G92\s+X0\.0\s+Y0\.0/.test(l))).toBe(false);
  });

  it("adaptive_control=false suppresses M90/M91 even in M800 dialect", () => {
    const out = engine.generateProgram([makeOp()], cfg({ adaptive_control: false }));
    const joined = out.gcode.join("\n");
    expect(joined).not.toMatch(/\bM90\b/);
    expect(joined).not.toMatch(/\bM91\b/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL11: E-Code Group Selection Logic
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL11: E-code group selection by material × thickness × taper", () => {
  const e = new MitsubishiMV1200RWireEDMMasterPostEngine();

  it("D2 tool steel 25.4mm 2D → E122X family (ITW SHAKEPROOF reference)", () => {
    const r = e.selectECodeGroup({
      material: d2Steel,
      thickness_mm: 25.4,
      has_taper: false,
      pass_number: 1,
    });
    expect(r.family).toBe("E122");
    expect(r.full_code).toBe("E1221");
    expect(r.rationale).toMatch(/ITW SHAKEPROOF/i);
  });

  it("A2 tool steel 5mm thin die 2D → E128X family (CHOCTAW reference)", () => {
    const r = e.selectECodeGroup({
      material: thinDieSteel,
      thickness_mm: 5,
      has_taper: false,
      pass_number: 3,
    });
    expect(r.family).toBe("E128");
    expect(r.full_code).toBe("E1283");
    expect(r.rationale).toMatch(/CHOCTAW/i);
  });

  it("SS304 + taper → E282X family (NOZE TEST reference)", () => {
    const r = e.selectECodeGroup({
      material: ss304,
      thickness_mm: 25,
      has_taper: true,
      pass_number: 5,
    });
    expect(r.family).toBe("E282");
    expect(r.full_code).toBe("E2825");
    expect(r.rationale).toMatch(/taper/i);
  });

  it("Tungsten carbide → E162X low-energy family", () => {
    const r = e.selectECodeGroup({
      material: carbide,
      thickness_mm: 15,
      has_taper: false,
      pass_number: 1,
    });
    expect(r.family).toBe("E162");
  });

  it("Aluminum (high conductivity) → E142X family", () => {
    const r = e.selectECodeGroup({
      material: aluminum,
      thickness_mm: 25,
      has_taper: false,
      pass_number: 2,
    });
    expect(r.family).toBe("E142");
    expect(r.full_code).toBe("E1422");
  });

  it("fallback: unknown material → E122X family (safe default)", () => {
    const unknown: WireEDMMaterial = { name: "inconel", conductivity_class: "low" };
    const r = e.selectECodeGroup({
      material: unknown,
      thickness_mm: 15,
      has_taper: false,
      pass_number: 2,
    });
    expect(r.family).toBe("E122");
    expect(r.full_code).toBe("E1222");
    expect(r.rationale).toMatch(/fallback/i);
  });

  it("pass number out of range throws", () => {
    expect(() => e.selectECodeGroup({
      material: d2Steel, thickness_mm: 25, has_taper: false, pass_number: 0,
    })).toThrow(/pass_number/);
    expect(() => e.selectECodeGroup({
      material: d2Steel, thickness_mm: 25, has_taper: false, pass_number: 10,
    })).toThrow(/pass_number/);
  });

  it("pass numbers 1-5 produce sequential E-codes in the same family", () => {
    const codes = [1, 2, 3, 4, 5].map((p) =>
      e.selectECodeGroup({
        material: d2Steel, thickness_mm: 25.4, has_taper: false, pass_number: p,
      }).full_code,
    );
    expect(codes).toEqual(["E1221", "E1222", "E1223", "E1224", "E1225"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL12: Program Structure Match — section-by-section vs real format
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL12: Generated program structure mirrors real Mitsubishi M800", () => {
  const engine = mitsubishiMV1200RWireEDMMasterPostEngine;

  it("header: % → O<number> → (comment) appears at the top", () => {
    const out = engine.generateProgram([makeOp()], cfg({ program_number: "L777" }));
    expect(out.gcode[0]).toBe("%");
    expect(out.gcode[1]).toBe("OL777");
    expect(out.gcode[2]).toMatch(/\(/);
  });

  it("closing: retract → program_end → % is the last three distinct lines", () => {
    const out = engine.generateProgram([makeOp()], cfg());
    const tail = out.gcode.filter((l) => l.length > 0).slice(-3);
    expect(tail[0]).toMatch(/G00\s+Z0/);
    expect(tail[1]).toMatch(/M02\s+\(Program End\)/);
    expect(tail[2]).toBe("%");
  });

  it("section order: safe-start → G92 → tank_fill → water → wire → power → adaptive_on → thread → cut → adaptive_off → drain → end", () => {
    const out = engine.generateProgram([makeOp()], cfg());
    // Build an ordered list of block markers actually present
    const markerRegex: Array<[string, RegExp]> = [
      ["safe_start", /\(SAFE START\)/],
      ["g92",        /G92\s+X0\.0\s+Y0\.0/],
      ["m78",        /\bM78\b/],
      ["m80",        /\bM80\b/],
      ["m82",        /\bM82\b/],
      ["m84",        /\bM84\b/],
      ["m90",        /\bM90\b/],
      ["m20",        /\bM20\b/],
      ["m21",        /\bM21\b/],
      ["m91",        /\bM91\b/],
      ["m58",        /\bM58\b/],
      ["m02",        /\bM02\b/],
    ];
    const positions = markerRegex.map(([name, r]) => {
      const idx = out.gcode.findIndex((l) => r.test(l));
      return { name, idx };
    });
    // None should be missing
    for (const p of positions) {
      expect(p.idx, `${p.name} missing from program`).toBeGreaterThanOrEqual(0);
    }
    // They should appear in the declared order
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i].idx,
        `${positions[i].name} (${positions[i].idx}) must come after ${positions[i - 1].name} (${positions[i - 1].idx})`,
      ).toBeGreaterThan(positions[i - 1].idx);
    }
  });

  it("each operation block opens with an operation comment", () => {
    const ops = [
      makeOp({ pass: "rough" }),
      makeOp({ pass: "skim1" }),
      makeOp({ pass: "skim2" }),
    ];
    const out = engine.generateProgram(ops, cfg());
    const opHeaders = out.gcode.filter((l) => /\(OPERATION \d+:/.test(l));
    expect(opHeaders).toHaveLength(3);
    expect(opHeaders[0]).toMatch(/ROUGH/i);
    expect(opHeaders[1]).toMatch(/SKIM1/i);
    expect(opHeaders[2]).toMatch(/SKIM2/i);
  });

  it("offset direction G41/G42 appears for profile ops, G40 cancels at end", () => {
    const out = engine.generateProgram(
      [makeOp({ offset_direction: "right" })],
      cfg(),
    );
    const joined = out.gcode.join("\n");
    expect(joined).toMatch(/G42/);
    expect(joined).toMatch(/G40/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL13: UV Taper Program Generation
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL13: UV taper program generation", () => {
  const engine = mitsubishiMV1200RWireEDMMasterPostEngine;

  function makeTaperOp(): WireEDMOperation {
    return {
      operation_type: "taper",
      pass: "rough",
      start_x: 0,
      start_y: 0,
      profile_points: [
        { x: 5, y: 0, u: 0.048, v: 0.003, type: "linear" },
        { x: 5, y: 5, u: 0.048, v: 0.003, type: "linear" },
        { x: 0, y: 5, u: -0.048, v: 0.003, type: "linear" },
        { x: 0, y: 0, u: -0.048, v: -0.003, type: "linear" },
      ],
      material: ss304,
      thickness_mm: 25,
      offset_direction: "right",
      taper_angle_deg: 5,
      taper_height_mm: 25,
    };
  }

  it("taper program emits G51 (taper on) and G50 (taper off)", () => {
    const out = engine.generateProgram([makeTaperOp()], cfg());
    const joined = out.gcode.join("\n");
    expect(joined).toMatch(/G51/);
    expect(joined).toMatch(/G50/);
  });

  it("taper op contour lines include U and V coordinates", () => {
    const out = engine.generateProgram([makeTaperOp()], cfg());
    const uvLines = out.gcode.filter(
      (l) => /\bU-?\d/.test(l) && /\bV-?\d/.test(l) && /^G01/.test(l),
    );
    expect(uvLines.length).toBeGreaterThanOrEqual(3);
  });

  it("taper mode ON comes before any U/V coordinate line", () => {
    const out = engine.generateProgram([makeTaperOp()], cfg());
    const taperOnIdx = out.gcode.findIndex((l) => /G51/.test(l));
    const firstUV = out.gcode.findIndex((l) => /^G01.+\bU-?\d/.test(l));
    expect(taperOnIdx).toBeGreaterThanOrEqual(0);
    expect(firstUV).toBeGreaterThan(taperOnIdx);
  });

  it("taper mode OFF comes after the last U/V coordinate line", () => {
    const out = engine.generateProgram([makeTaperOp()], cfg());
    const lastUVIdx = (() => {
      let last = -1;
      out.gcode.forEach((l, i) => {
        if (/^G01.+\bU-?\d/.test(l)) last = i;
      });
      return last;
    })();
    // Safe-start block emits "G50" as part of "G90 G17 G40 G50 (ABSOLUTE…)"
    // before any UV move — we want the explicit taper-OFF block that closes
    // the operation, so match on "TAPER MODE OFF" specifically.
    const taperOffIdx = out.gcode.findIndex((l) => /G50\b.*TAPER MODE OFF/i.test(l));
    expect(taperOffIdx).toBeGreaterThan(lastUVIdx);
  });

  it("taper + SS material routes through E282X E-code family", () => {
    const r = engine.selectECodeGroup({
      material: ss304,
      thickness_mm: 25,
      has_taper: true,
      pass_number: 1,
    });
    expect(r.family).toBe("E282");
  });

  it("taper warning: rough pass triggers wire-break power-reduction advisory", () => {
    const out = engine.generateProgram([makeTaperOp()], cfg());
    const advisory = out.warnings.find((w) => /power reduction/i.test(w));
    expect(advisory).toBeDefined();
  });

  it("5 skim passes over the same taper profile yield 5 E-coded operations", () => {
    const ops: WireEDMOperation[] = ["rough", "skim1", "skim2", "skim3", "skim4"].map((p) => ({
      ...makeTaperOp(),
      pass: p as WireEDMOperation["pass"],
    }));
    const out = engine.generateProgram(ops, cfg());
    expect(out.passes_generated).toBe(5);
    const opHeaders = out.gcode.filter((l) => /\(OPERATION \d+:/.test(l));
    expect(opHeaders).toHaveLength(5);
  });
});
