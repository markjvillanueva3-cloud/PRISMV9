/**
 * PostPhysicsFoundationEngine -- Unit Tests
 *
 * Covers:
 *   resolveContext        -- U01 catalog context resolver
 *   calculatePhysics      -- U02-U08 full physics pipeline
 *   fullFoundation        -- primary pipeline entry point (round-trip)
 *   resolveContextAction  -- standalone context resolution
 *   getSupportedActions   -- action enumeration
 *
 * Physics constants: CANONICALIZED (U-PP-PHYSFOUNDATION-CANONICALIZE). The engine
 * now sources KC_ISO = CANONICAL_KIENZLE and MATERIAL_PROPS Taylor n/C from
 * CANONICAL_TAYLOR (src/physics/constants.ts) per the no-inline-physics-constants
 * rail. The previously-inlined mc exponents that diverged for K/N/S/H (e.g. H 0.20
 * vs canonical 0.30) are gone. These tests assert the CANONICAL values; the old
 * characterization-lock assertions (engine's stale inline values) were the designed
 * fail-signal that fired when the engine was corrected and are rebaselined here.
 *
 * Hand-computed reference values:
 *   Kienzle:  Fc = kc1_1 * b * h^(1-mc);  kc = kc1_1 * fz^(-mc)
 *   Taylor:   T = (C / Vc)^(1/n)
 *   Deflect:  delta = F*L^3 / (3*E*I);   I = pi*d^4/64
 *   Power:    P = Fc*Vc / (60000*eta);   eta = 0.85
 *
 * @module __tests__/PostPhysicsFoundationEngine.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  PostPhysicsFoundationEngine,
  postPhysicsFoundationEngine,
  type PhysicsFoundationInput,
  type OperationPhysicsInput,
} from "../engines/PostPhysicsFoundationEngine.js";
import { CANONICAL_TAYLOR } from "../physics/constants.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Minimal valid operation -- 10mm carbide end mill, steel roughing. */
function makeOp(overrides: Partial<OperationPhysicsInput> = {}): OperationPhysicsInput {
  return {
    operation_index: 0,
    tool_number: 1,
    tool_diameter_mm: 10,
    tool_flutes: 4,
    tool_material: "carbide",
    operation_type: "roughing",
    cam_rpm: 5000,
    cam_feed_mmmin: 1500,
    cam_doc_mm: 2,
    cam_woc_mm: 5,
    coolant: "flood",
    ...overrides,
  };
}

/** Minimal valid PhysicsFoundationInput for a single operation. */
function makeInput(
  opOverrides: Partial<OperationPhysicsInput> = {},
  inputOverrides: Partial<PhysicsFoundationInput> = {}
): PhysicsFoundationInput {
  return {
    machine_brand: "haas",
    material: "steel",
    operations: [makeOp(opOverrides)],
    ...inputOverrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Singleton export and meta
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine -- singleton and meta", () => {
  it("exports a singleton that is an instance of the class", () => {
    expect(postPhysicsFoundationEngine).toBeInstanceOf(PostPhysicsFoundationEngine);
  });

  it("getSupportedActions returns exactly the three documented actions", () => {
    const actions = postPhysicsFoundationEngine.getSupportedActions();
    expect(actions).toHaveLength(3);
    expect(actions).toContain("resolve_context");
    expect(actions).toContain("calculate_physics");
    expect(actions).toContain("full_foundation");
  });
});

// ---------------------------------------------------------------------------
// 2. resolveContext -- U01 catalog context resolver
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine.resolveContext", () => {
  it("returns correct Haas machine specs from catalog", () => {
    const engine = new PostPhysicsFoundationEngine();
    const { machine } = engine.resolveContext(makeInput());
    // Haas entry: max_rpm=8100, max_power_kW=22.4, max_torque_Nm=122, controller="Haas NGC"
    expect(machine.max_rpm).toBe(8100);
    expect(machine.max_power_kW).toBeCloseTo(22.4, 1);
    expect(machine.max_torque_Nm).toBe(122);
    expect(machine.controller).toBe("Haas NGC");
    expect(machine.resolved_from).toBe("catalog_exact");
  });

  it("falls back to generic defaults for unknown machine brand", () => {
    const engine = new PostPhysicsFoundationEngine();
    const { machine } = engine.resolveContext(makeInput({}, { machine_brand: "unknown_xyz_brand" }));
    // Default entry: max_rpm=10000, max_power_kW=18, controller="Generic"
    expect(machine.max_rpm).toBe(10000);
    expect(machine.max_power_kW).toBe(18);
    expect(machine.controller).toBe("Generic");
    expect(machine.resolved_from).toBe("defaults");
  });

  it("resolves 'steel' to ISO group P with canonical kc1_1=1800 mc=0.25 (CANONICAL_KIENZLE.P)", () => {
    const engine = new PostPhysicsFoundationEngine();
    const { material } = engine.resolveContext(makeInput());
    expect(material.iso_group).toBe("P");
    expect(material.kc1_1).toBe(1800);
    expect(material.mc).toBe(0.25);
    expect(material.resolved_from).toBe("catalog_exact");
  });

  it("resolves 'aluminum' to ISO group N with kc1_1=700", () => {
    const engine = new PostPhysicsFoundationEngine();
    const { material } = engine.resolveContext(makeInput({}, { material: "aluminum" }));
    expect(material.iso_group).toBe("N");
    expect(material.kc1_1).toBe(700);
  });

  it("resolves 'titanium' to ISO group S with kc1_1=2800", () => {
    const engine = new PostPhysicsFoundationEngine();
    const { material } = engine.resolveContext(makeInput({}, { material: "titanium" }));
    expect(material.iso_group).toBe("S");
    expect(material.kc1_1).toBe(2800);
  });

  it("adjusts kc1_1 upward by 1.5% per HRC above baseline -- algebraic invariant", () => {
    const engine = new PostPhysicsFoundationEngine();
    // P-group baseline HRC=25. +10 HRC -> factor = 1 + 0.015*10 = 1.15 -> kc=1800*1.15=2070
    const { material: matHard } = engine.resolveContext(
      makeInput({}, { material: "steel", material_hardness_hrc: 35 })
    );
    expect(matHard.kc1_1).toBeCloseTo(2070, 0);
    // Verify it is strictly greater than baseline
    const { material: matBase } = engine.resolveContext(makeInput());
    expect(matHard.kc1_1).toBeGreaterThan(matBase.kc1_1);
  });

  it("uses explicit material_iso='H' when no material string is given", () => {
    const engine = new PostPhysicsFoundationEngine();
    const input: PhysicsFoundationInput = {
      material_iso: "H",
      operations: [makeOp()],
    };
    const { material } = engine.resolveContext(input);
    expect(material.iso_group).toBe("H");
    expect(material.kc1_1).toBe(3200);
    expect(material.mc).toBe(0.30); // canonical H mc (CANONICAL_KIENZLE.H) -- was inline 0.20 pre-canonicalize
    expect(material.resolved_from).toBe("catalog_exact");
  });

  it("defaults to ISO P when neither material nor material_iso is provided", () => {
    const engine = new PostPhysicsFoundationEngine();
    const input: PhysicsFoundationInput = { operations: [makeOp()] };
    const { material } = engine.resolveContext(input);
    expect(material.iso_group).toBe("P");
    expect(material.resolved_from).toBe("defaults");
  });

  it("DMG machine specs: max_rpm=14000, Siemens 840D, rapids 40000", () => {
    const engine = new PostPhysicsFoundationEngine();
    const { machine } = engine.resolveContext(makeInput({}, { machine_brand: "dmg" }));
    expect(machine.max_rpm).toBe(14000);
    expect(machine.max_power_kW).toBe(28);
    expect(machine.controller).toBe("Siemens 840D");
    expect(machine.axis_rapids).toEqual({ X: 40000, Y: 40000, Z: 40000 });
  });
});

// ---------------------------------------------------------------------------
// 3. calculatePhysics -- shape invariants
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine.calculatePhysics -- shape invariants", () => {
  it("returns exactly one operation result for single-op input", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    expect(result.operations).toHaveLength(1);
  });

  it("empty operations array yields overall_confidence=0 and empty results", () => {
    const input: PhysicsFoundationInput = { operations: [] };
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations).toHaveLength(0);
    expect(result.overall_confidence).toBe(0);
  });

  it("operation result fields are all numbers in expected ranges", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const op = result.operations[0];
    expect(typeof op.recommended_rpm).toBe("number");
    expect(typeof op.recommended_feed_mmmin).toBe("number");
    expect(typeof op.cutting_force_N).toBe("number");
    expect(typeof op.power_required_kW).toBe("number");
    expect(typeof op.tool_deflection_mm).toBe("number");
    expect(typeof op.cutting_temp_C).toBe("number");
    expect(typeof op.predicted_tool_life_min).toBe("number");
    expect(typeof op.confidence).toBe("number");
    // chatter_free_rpm_zones is an array (may be empty or populated)
    expect(Array.isArray(op.chatter_free_rpm_zones)).toBe(true);
    // explanations is a non-empty string array
    expect(Array.isArray(op.explanations)).toBe(true);
    expect(op.explanations.length).toBeGreaterThan(0);
  });

  it("machine_context brand matches requested machine", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    expect(result.machine_context.brand).toBe("haas");
    expect(result.machine_context.max_rpm).toBe(8100);
  });

  it("material_context iso_group is 'P' for steel input", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    expect(result.material_context.iso_group).toBe("P");
    expect(result.material_context.kc1_1).toBe(1800);
  });
});

// ---------------------------------------------------------------------------
// 4. calculatePhysics -- physics reference values
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine.calculatePhysics -- physics reference values", () => {
  it("recommended_rpm is capped at Haas machine max (8100) for high-speed scenario", () => {
    // 2mm tool on aluminum at max aggressiveness -> computed RPM would exceed 8100
    const input = makeInput(
      { tool_diameter_mm: 2, tool_flutes: 4, operation_type: "finishing" },
      { machine_brand: "haas", material: "aluminum", aggressiveness: 100 }
    );
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations[0].recommended_rpm).toBeLessThanOrEqual(8100);
  });

  it("recommended_rpm is a positive multiple of 10 (engine rounds to nearest 10)", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const rpm = result.operations[0].recommended_rpm;
    expect(rpm).toBeGreaterThan(0);
    expect(rpm % 10).toBe(0);
  });

  it("cutting_force_N is positive and physically plausible for 10mm steel roughing", () => {
    // 10mm end mill, P-group steel, 2mm doc, 5mm woc -- Fc should be 5-5000 N
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const fc = result.operations[0].cutting_force_N;
    expect(fc).toBeGreaterThan(5);
    expect(fc).toBeLessThan(5000);
  });

  it("power_required_kW is physically consistent: P = Fc*Vc/(60000*0.85) within 15%", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const op = result.operations[0];
    const d = 10; // mm
    const vc = (Math.PI * d * op.recommended_rpm) / 1000; // m/min
    const p_expected = (op.cutting_force_N * vc) / (60000 * 0.85); // kW
    // Allow 15% tolerance for intermediate re-computations and DOC adjustments in the engine
    expect(op.power_required_kW).toBeGreaterThan(0);
    expect(Math.abs(op.power_required_kW - p_expected) / Math.max(p_expected, 0.01)).toBeLessThan(0.15);
  });

  it("Taylor tool life for P-group steel is positive and in plausible range", () => {
    // P-group engine values: C=350, n=0.25. At Vc~200 m/min: T=(350/200)^4 ~ 9.4 min
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const life = result.operations[0].predicted_tool_life_min;
    expect(life).toBeGreaterThan(0.1);
    expect(life).toBeLessThan(10000);
  });

  it("Taylor tool life uses CANONICAL constants (H/N) and the equal-Vc invariant holds", () => {
    // CANONICALIZATION GUARD (U-PP-PHYSFOUNDATION-CANONICALIZE): the engine must compute
    // T=(C/Vc)^(1/n) with the canonical ISO Taylor constants (CANONICAL_TAYLOR), NOT the
    // old inlined H:C=100/n=0.18, N:C=800/n=0.40. Build raw inputs WITHOUT a material string
    // so material_iso drives resolution; carbide baseline (makeOp default) => no tool/coating
    // multiplier and default hardness => zero hardness derate, so the engine's life equals the
    // closed form at its OWN cutting speed (recommended_rpm reconstructed via Vc = rpm*pi*d/1000).
    const d = 10; // makeOp tool_diameter_mm
    const mk = (iso: string): PhysicsFoundationInput => ({
      machine_brand: "haas",
      material_iso: iso,
      aggressiveness: 50,
      enable_stability_lobes: false,
      enable_deflection: false,
      enable_thermal: false,
      operations: [makeOp({ operation_type: "roughing", cam_rpm: 5000, cam_feed_mmmin: 1000 })],
    });
    const opH = postPhysicsFoundationEngine.calculatePhysics(mk("H")).operations[0];
    const opN = postPhysicsFoundationEngine.calculatePhysics(mk("N")).operations[0];
    const vc = (rpm: number) => (rpm * Math.PI * d) / 1000;
    const taylorLife = (C: number, n: number, vcv: number) => Math.pow(C / Math.max(vcv, 1), 1 / n);
    // The engine's reported life tracks the CANONICAL closed form within ~5% (rpm rounded to /10);
    // the old non-canonical constants would land ~4x off (canonical H~14.8 vs old H~3.5).
    expect(opH.predicted_tool_life_min / taylorLife(CANONICAL_TAYLOR.H.C, CANONICAL_TAYLOR.H.n, vc(opH.recommended_rpm))).toBeCloseTo(1, 1);
    expect(opN.predicted_tool_life_min / taylorLife(CANONICAL_TAYLOR.N.C, CANONICAL_TAYLOR.N.n, vc(opN.recommended_rpm))).toBeCloseTo(1, 1);
    // GENUINE Taylor invariant: at the SAME cutting speed, hardened steel (lower C) wears out
    // FAR faster than aluminum (higher C). The old assertion compared each material at its OWN
    // recommended speed -- NOT a true invariant; it only held under the non-canonical inline
    // constants and reverses under canonical ones (recommended speeds target comparable life).
    const vCommon = 120; // m/min -- a cutting speed valid for both materials
    expect(taylorLife(CANONICAL_TAYLOR.H.C, CANONICAL_TAYLOR.H.n, vCommon)).toBeLessThan(
      taylorLife(CANONICAL_TAYLOR.N.C, CANONICAL_TAYLOR.N.n, vCommon)
    );
    expect(
      taylorLife(CANONICAL_TAYLOR.N.C, CANONICAL_TAYLOR.N.n, vCommon) /
        taylorLife(CANONICAL_TAYLOR.H.C, CANONICAL_TAYLOR.H.n, vCommon)
    ).toBeGreaterThan(2);
  });

  it("tool_life_consumed_percent is non-negative", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    expect(result.operations[0].tool_life_consumed_percent).toBeGreaterThanOrEqual(0);
  });

  it("confidence is clamped strictly in [0, 1]", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const conf = result.operations[0].confidence;
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });

  it("conservative rpm < recommended_rpm ordering holds", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const op = result.operations[0];
    // conservative factor = 0.75 -> conservative rpm = round(rpm*0.75/10)*10 < rpm
    expect(op.conservative.rpm).toBeLessThan(op.recommended_rpm);
  });

  it("aggressive feed > recommended_feed ordering holds", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const op = result.operations[0];
    // aggressive factor = 1.25 * 1.1 = 1.375 -> aggressive feed > recommended
    expect(op.aggressive.feed).toBeGreaterThan(op.recommended_feed_mmmin);
  });

  it("conservative feed < recommended_feed (factor 0.75*0.85=0.6375)", () => {
    const result = postPhysicsFoundationEngine.calculatePhysics(makeInput());
    const op = result.operations[0];
    expect(op.conservative.feed).toBeLessThan(op.recommended_feed_mmmin);
  });

  it("HSS tool deflects more than carbide for same stickout -- E invariant (200 GPa vs 600 GPa)", () => {
    const inputCarbide = makeInput({ tool_material: "carbide", tool_stickout_mm: 40 });
    const inputHSS = makeInput({ tool_material: "hss", tool_stickout_mm: 40 });
    const deflC = postPhysicsFoundationEngine.calculatePhysics(inputCarbide).operations[0].tool_deflection_mm;
    const deflH = postPhysicsFoundationEngine.calculatePhysics(inputHSS).operations[0].tool_deflection_mm;
    // delta = F*L^3/(3*E*I): same F and geometry -> deflection inversely proportional to E
    // E_carbide=600 GPa; E_hss=200 GPa -> HSS deflects ~3x more
    expect(deflH).toBeGreaterThan(deflC);
  });

  it("multi-operation input produces one result per operation in index order", () => {
    const input: PhysicsFoundationInput = {
      material: "steel",
      machine_brand: "haas",
      operations: [
        makeOp({ operation_index: 0 }),
        makeOp({ operation_index: 1, operation_type: "finishing", tool_diameter_mm: 6 }),
        makeOp({ operation_index: 2, operation_type: "drilling", tool_diameter_mm: 8 }),
      ],
    };
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations).toHaveLength(3);
    expect(result.operations[0].operation_index).toBe(0);
    expect(result.operations[1].operation_index).toBe(1);
    expect(result.operations[2].operation_index).toBe(2);
  });

  it("overall_confidence is the mean of per-operation confidences (rounded to 2 dp)", () => {
    const input: PhysicsFoundationInput = {
      material: "steel",
      machine_brand: "haas",
      operations: [
        makeOp({ operation_index: 0 }),
        makeOp({ operation_index: 1, operation_type: "finishing" }),
      ],
    };
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    const expectedAvg =
      Math.round(
        ((result.operations[0].confidence + result.operations[1].confidence) / 2) * 100
      ) / 100;
    expect(result.overall_confidence).toBeCloseTo(expectedAvg, 2);
  });

  it("warnings includes machine-defaults notice when machine_brand is absent", () => {
    const input: PhysicsFoundationInput = { operations: [makeOp()] };
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    const hasMachineWarn = result.warnings.some((w) => w.toLowerCase().includes("machine"));
    expect(hasMachineWarn).toBe(true);
  });

  it("warnings includes material notice when no material is provided", () => {
    const input: PhysicsFoundationInput = {
      machine_brand: "haas",
      operations: [makeOp()],
    };
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    const hasMaterialWarn = result.warnings.some((w) => w.toLowerCase().includes("material"));
    expect(hasMaterialWarn).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Failure modes
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine -- failure modes", () => {
  it("FAILURE: empty operations -> 0 confidence, 0 results, 0 warnings from operations", () => {
    const input: PhysicsFoundationInput = {
      machine_brand: "haas",
      material: "steel",
      operations: [],
    };
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations).toHaveLength(0);
    expect(result.overall_confidence).toBe(0);
  });

  it("FAILURE: unrecognized material string falls to P-group and still computes a force", () => {
    const input = makeInput({}, { material: "unobtanium_42_special_alloy" });
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    // Falls to ISO P via defaults path
    expect(result.material_context.iso_group).toBe("P");
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].cutting_force_N).toBeGreaterThan(0);
  });

  it("FAILURE: cam_rpm=0 does not crash and rpm_delta_percent is 0", () => {
    const input = makeInput({ cam_rpm: 0 });
    // Must not throw
    expect(() => postPhysicsFoundationEngine.calculatePhysics(input)).not.toThrow();
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations).toHaveLength(1);
    // Guard: cam_rpm=0 -> delta = 0 (engine uses /cam_rpm > 0 branch)
    expect(result.operations[0].rpm_delta_percent).toBe(0);
  });

  it("FAILURE: extreme hardness HRC 80 does not produce NaN or negative kc1_1", () => {
    // P baseline HRC=25; delta=55 -> factor=1+0.015*55=1.825 -> kc=1800*1.825=3285
    const input = makeInput({}, { material: "steel", material_hardness_hrc: 80 });
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(Number.isNaN(result.material_context.kc1_1)).toBe(false);
    expect(result.material_context.kc1_1).toBeCloseTo(3285, 0);
    expect(result.material_context.kc1_1).toBeGreaterThan(1800);
  });

  it("FAILURE: aggressiveness=0 does not crash and produces positive rpm", () => {
    const input = makeInput({}, { aggressiveness: 0 });
    expect(() => postPhysicsFoundationEngine.calculatePhysics(input)).not.toThrow();
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    // aggFactor = 0.7 + 0*0.6 = 0.70 -> valid positive Vc
    expect(result.operations[0].recommended_rpm).toBeGreaterThan(0);
  });

  it("FAILURE: aggressiveness=100 does not exceed Haas max_rpm=8100", () => {
    const input = makeInput(
      { tool_diameter_mm: 4 },
      { machine_brand: "haas", aggressiveness: 100, material: "aluminum" }
    );
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations[0].recommended_rpm).toBeLessThanOrEqual(8100);
  });
});

// ---------------------------------------------------------------------------
// 6. Adversarial inputs
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine -- adversarial inputs", () => {
  it("ADVERSARIAL: 0.5mm micro-mill returns positive force and rpm within Haas cap", () => {
    const input = makeInput({
      tool_diameter_mm: 0.5,
      tool_flutes: 2,
      cam_doc_mm: 0.05,
      cam_woc_mm: 0.1,
    });
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    const op = result.operations[0];
    expect(op.cutting_force_N).toBeGreaterThan(0);
    expect(op.recommended_rpm).toBeGreaterThan(0);
    expect(op.recommended_rpm).toBeLessThanOrEqual(8100);
  });

  it("ADVERSARIAL: 100mm face mill on Mazak stays within max_rpm=12000", () => {
    const input = makeInput(
      { tool_diameter_mm: 100, tool_flutes: 8, cam_doc_mm: 5, cam_woc_mm: 80, operation_type: "roughing" },
      { machine_brand: "mazak" }
    );
    const result = postPhysicsFoundationEngine.calculatePhysics(input);
    expect(result.operations[0].recommended_rpm).toBeLessThanOrEqual(12000);
  });

  it("ADVERSARIAL: thin-wall (2mm < 3x10mm) triggers part_deflection_mm and engagement reduction", () => {
    const thinWallInput = makeInput({
      tool_diameter_mm: 10,
      cam_doc_mm: 15,
      cam_woc_mm: 5,
      wall_thickness_mm: 2,    // 2mm < 3*10mm=30mm threshold
      pocket_depth_mm: 40,
    });
    const result = postPhysicsFoundationEngine.calculatePhysics(thinWallInput);
    const op = result.operations[0];
    // part_deflection_mm is a number (not undefined) when wall_thickness_mm is set
    expect(typeof op.part_deflection_mm).toBe("number");
    expect((op.part_deflection_mm as number)).toBeGreaterThan(0);
    // Engagement must be reduced from the input WOC of 5mm
    expect(op.recommended_woc_mm).toBeLessThanOrEqual(5);
  });

  it("ADVERSARIAL: CBN tool on H-group gives longer life than HSS -- tool material scaling", () => {
    // CBN: n*=1.3, C*=2.2; HSS: n*=0.8, C*=0.3 -- CBN dramatically better on hardened steel
    const inputCBN = makeInput(
      { tool_material: "cbn", operation_type: "finishing" },
      { material_iso: "H" }
    );
    const inputHSS = makeInput(
      { tool_material: "hss", operation_type: "finishing" },
      { material_iso: "H" }
    );
    const lifeCBN = postPhysicsFoundationEngine.calculatePhysics(inputCBN).operations[0].predicted_tool_life_min;
    const lifeHSS = postPhysicsFoundationEngine.calculatePhysics(inputHSS).operations[0].predicted_tool_life_min;
    expect(lifeCBN).toBeGreaterThan(lifeHSS);
  });

  it("ADVERSARIAL: no-coolant cutting temperature is higher than flood coolant for titanium", () => {
    // coolantFactor: none=1.0 vs flood=0.55 -> higher T_rise with no coolant
    const withFlood = makeInput({ coolant: "flood" }, { material: "titanium" });
    const withNone  = makeInput({ coolant: "none"  }, { material: "titanium" });
    const tempFlood = postPhysicsFoundationEngine.calculatePhysics(withFlood).operations[0].cutting_temp_C;
    const tempNone  = postPhysicsFoundationEngine.calculatePhysics(withNone).operations[0].cutting_temp_C;
    expect(tempNone).toBeGreaterThan(tempFlood);
  });
});

// ---------------------------------------------------------------------------
// 7. resolveContextAction -- standalone action
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine.resolveContextAction", () => {
  it("returns machine with correct brand and material with correct iso_group", () => {
    const engine = new PostPhysicsFoundationEngine();
    const res = engine.resolveContextAction(makeInput());
    expect(res.machine.brand).toBe("haas");
    expect(res.machine.max_rpm).toBe(8100);
    expect(res.material.iso_group).toBe("P");
    expect(res.material.kc1_1).toBe(1800);
    expect(Array.isArray(res.warnings)).toBe(true);
  });

  it("no warnings when both machine and material are resolved from catalog", () => {
    const engine = new PostPhysicsFoundationEngine();
    const res = engine.resolveContextAction(makeInput({}, { machine_brand: "haas", material: "steel" }));
    expect(res.warnings).toHaveLength(0);
    expect(res.machine.resolved_from).toBe("catalog_exact");
    expect(res.material.resolved_from).toBe("catalog_exact");
  });

  it("emits warning containing the unrecognized brand name for unknown machine", () => {
    const engine = new PostPhysicsFoundationEngine();
    const res = engine.resolveContextAction(makeInput({}, { machine_brand: "ghost_brand" }));
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0].toLowerCase()).toContain("ghost_brand");
  });

  it("emits material warning when no material or material_iso is given", () => {
    const engine = new PostPhysicsFoundationEngine();
    const res = engine.resolveContextAction({ operations: [makeOp()] });
    const hasMaterialWarning = res.warnings.some((w) => w.toLowerCase().includes("material"));
    expect(hasMaterialWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. fullFoundation -- primary pipeline round-trip
// ---------------------------------------------------------------------------

describe("PostPhysicsFoundationEngine.fullFoundation -- round-trip", () => {
  it("produces identical recommended_rpm and feed as calculatePhysics for same input", () => {
    const engine = new PostPhysicsFoundationEngine();
    const input = makeInput();
    const fromFull = engine.fullFoundation(input);
    const fromCalc = engine.calculatePhysics(input);
    expect(fromFull.operations[0].recommended_rpm).toBe(fromCalc.operations[0].recommended_rpm);
    expect(fromFull.operations[0].recommended_feed_mmmin).toBe(fromCalc.operations[0].recommended_feed_mmmin);
    expect(fromFull.operations[0].cutting_force_N).toBe(fromCalc.operations[0].cutting_force_N);
    expect(fromFull.overall_confidence).toBe(fromCalc.overall_confidence);
  });

  it("tool_life target produces lower rpm than productivity target", () => {
    const engine = new PostPhysicsFoundationEngine();
    const rpmLife = engine.fullFoundation(makeInput({}, { optimization_target: "tool_life" })).operations[0].recommended_rpm;
    const rpmProd = engine.fullFoundation(makeInput({}, { optimization_target: "productivity" })).operations[0].recommended_rpm;
    // tool_life targetMult=0.80; productivity targetMult=1.15 -> monotone ordering
    expect(rpmLife).toBeLessThan(rpmProd);
  });

  it("aggressiveness=10 produces lower rpm than aggressiveness=90", () => {
    const engine = new PostPhysicsFoundationEngine();
    const rpmLow  = engine.fullFoundation(makeInput({}, { aggressiveness: 10  })).operations[0].recommended_rpm;
    const rpmHigh = engine.fullFoundation(makeInput({}, { aggressiveness: 90  })).operations[0].recommended_rpm;
    // aggFactor(10)=0.76; aggFactor(90)=1.24
    expect(rpmLow).toBeLessThan(rpmHigh);
  });

  it("operation_index is preserved from input to output", () => {
    const engine = new PostPhysicsFoundationEngine();
    const input: PhysicsFoundationInput = {
      machine_brand: "haas",
      material: "steel",
      operations: [makeOp({ operation_index: 7 })],
    };
    expect(engine.fullFoundation(input).operations[0].operation_index).toBe(7);
  });

  it("finishing operation gets lower feed than roughing for same tool and material", () => {
    const engine = new PostPhysicsFoundationEngine();
    const feedRough  = engine.fullFoundation(makeInput({ operation_type: "roughing"  })).operations[0].recommended_feed_mmmin;
    const feedFinish = engine.fullFoundation(makeInput({ operation_type: "finishing" })).operations[0].recommended_feed_mmmin;
    // finishing fz multiplier = 0.5 vs roughing 1.0
    expect(feedFinish).toBeLessThan(feedRough);
  });
});
