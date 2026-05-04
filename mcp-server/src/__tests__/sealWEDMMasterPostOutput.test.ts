/**
 * sealWEDMMasterPostOutput — round-trip integration test
 *
 * @milestone PPG-WIRE-MS6/U-PPGM17a
 *
 * Verifies the WEDM-shaped master-post seal helper:
 *   1. Builder accepts wedm_block_annotations and seals them under the
 *      schema's wedm_block_annotations field (NOT block_annotations).
 *   2. Builder rejects mixing block_annotations + wedm_block_annotations
 *      (mutually exclusive — milling vs WEDM emit shapes diverge).
 *   3. Helper round-trips a Mitsubishi-style engine output to a sealed
 *      sidecar that re-verifies via PhysicsSidecarBuilderEngine.verify().
 *   4. Helper rejects bad shapes (non-array gcode, missing block_annotations,
 *      missing source_engine_versions).
 *   5. Tampering with any block annotation field invalidates the SHA seal.
 */
import { describe, it, expect } from "vitest";
import {
  sealWEDMMasterPostOutput,
  sealMasterPostOutput,
} from "../cps/sealMasterPostOutput.js";
import {
  PhysicsSidecarBuilderEngine,
} from "../engines/PhysicsSidecarBuilderEngine.js";
import {
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  type WEDMBlockAnnotation,
  type BlockAnnotation,
} from "../schemas/postPhysicsSidecarSchema.js";

// ---------------------------------------------------------------------------
// Named constants (no magic numbers)
// ---------------------------------------------------------------------------
// E-pack rough power lookup index (Mitsubishi MV1200R E1..E20 lookup table).
const ROUGH_E_PACK = 12;
// Spark on-time / off-time microseconds (rough cut typical defaults).
const ROUGH_ON_TIME_US = 8;
const ROUGH_OFF_TIME_US = 20;
// Servo voltage volts at the wire-workpiece gap (rough cut typical).
const ROUGH_SERVO_V = 50;
// Wire feed speed m/min (rough cut typical for tool steel + 0.25mm wire).
const ROUGH_WIRE_SPEED = 12;
// Wire tension grams (rough cut typical).
const ROUGH_WIRE_TENSION = 1200;
// Flushing pressure (rough cut typical, kg/cm^2 vendor units).
const ROUGH_FLUSHING = 10;

// Skim pass: lower power, shorter on-time, narrower off-time, lower flush.
const SKIM_E_PACK = 8;
const SKIM_ON_TIME_US = 4;
const SKIM_OFF_TIME_US = 12;
const SKIM_SERVO_V = 40;
const SKIM_WIRE_SPEED = 8;
const SKIM_WIRE_TENSION = 1000;
const SKIM_FLUSHING = 6;

// Wire diameters (mm) — 0.25mm brass standard, 0.30mm coated for thicker carbide.
const STD_WIRE_DIAMETER_MM = 0.25;
const CARBIDE_WIRE_DIAMETER_MM = 0.30;
// Workpiece thickness (mm).
const STD_THICKNESS_MM = 25;
const THICK_PART_MM = 50;
// Confidence + safety margin scalars used in WEDM physics_basis fields.
const STD_CONFIDENCE = 0.85;
const ROUGH_CONFIDENCE = 0.9;
const OPERATOR_CONFIDENCE = 1.0;
const SAFETY_MARGIN_NEUTRAL = 1.0;

// Heat-soak invariant violation: on=100us off=5us → ratio 0.05 < 0.20 minimum.
const HEATSOAK_VIOLATION_ON_US = 100;
const HEATSOAK_VIOLATION_OFF_US = 5;

// Tamper sentinel for tamper-detection test (must remain schema-valid so
// verify() reaches SHA comparison rather than rejecting on schema first).

// Operator-override (manual) emit sample.
const OVERRIDE_E_PACK = 15;
const OVERRIDE_ON_TIME_US = 10;
const OVERRIDE_OFF_TIME_US = 25;
const OVERRIDE_SERVO_V = 55;
const OVERRIDE_WIRE_SPEED = 10;
const OVERRIDE_WIRE_TENSION = 1500;
const OVERRIDE_FLUSHING = 12;

// Milling sanity sample for cross-shape rejection test.
const MILLING_S_RPM = 5000;
const MILLING_F_MM_MIN = 500;
const MILLING_VC_MPM = 80;
const MILLING_FPT_MM = 0.05;
const MILLING_AP_MM = 5;
const MILLING_AE_MM = 6.35;
const TAMPER_OP_ID = "tampered_op_id_value";

// G-code preamble for fixture lines (constant length used in length assertion).
const FIXTURE_GCODE_LINE_COUNT = 8;
const SHA256_HEX_LENGTH = 64;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const FIXED_GENERATED_AT = "2026-05-04T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Block factories
// ---------------------------------------------------------------------------
function validRoughBlock(overrides: Partial<WEDMBlockAnnotation> = {}): WEDMBlockAnnotation {
  return {
    block_id: "OP1_rough",
    op_id: "rough_pocket_1",
    material_class: "tool_steel",
    wire_diameter_mm: STD_WIRE_DIAMETER_MM,
    thickness_mm: STD_THICKNESS_MM,
    emitted: {
      power_setting: ROUGH_E_PACK,
      on_time_us: ROUGH_ON_TIME_US,
      off_time_us: ROUGH_OFF_TIME_US,
      servo_voltage_v: ROUGH_SERVO_V,
      wire_speed_m_min: ROUGH_WIRE_SPEED,
      wire_tension_g: ROUGH_WIRE_TENSION,
      flushing_pressure: ROUGH_FLUSHING,
      pass_type: "rough",
    },
    physics_basis: "epack_lookup",
    confidence: ROUGH_CONFIDENCE,
    safety_margin: SAFETY_MARGIN_NEUTRAL,
    source_constants: [`E_PACK_TABLE[${ROUGH_E_PACK}]`],
    ...overrides,
  };
}

function validSkimBlock(overrides: Partial<WEDMBlockAnnotation> = {}): WEDMBlockAnnotation {
  return {
    block_id: "OP2_skim1",
    op_id: "skim_pass_1",
    material_class: "tool_steel",
    wire_diameter_mm: STD_WIRE_DIAMETER_MM,
    thickness_mm: STD_THICKNESS_MM,
    emitted: {
      power_setting: SKIM_E_PACK,
      on_time_us: SKIM_ON_TIME_US,
      off_time_us: SKIM_OFF_TIME_US,
      servo_voltage_v: SKIM_SERVO_V,
      wire_speed_m_min: SKIM_WIRE_SPEED,
      wire_tension_g: SKIM_WIRE_TENSION,
      flushing_pressure: SKIM_FLUSHING,
      pass_type: "skim1",
    },
    physics_basis: "pass_factor_table",
    confidence: STD_CONFIDENCE,
    safety_margin: SAFETY_MARGIN_NEUTRAL,
    source_constants: [`PASS_DEFAULTS["skim1"]`, `E_PACK_TABLE[${SKIM_E_PACK}]`],
    ...overrides,
  };
}

function makeEngineOutput(blocks: WEDMBlockAnnotation[]): {
  gcode: string[];
  block_annotations: WEDMBlockAnnotation[];
} {
  return {
    gcode: [
      "(MITSUBISHI MV1200R - WEDM)",
      "G54",
      "M03 S0",
      "(BLOCK OP1_rough)",
      "G01 X10.0 Y10.0",
      "(BLOCK OP2_skim1)",
      "G01 X10.0 Y10.0",
      "M30",
    ],
    block_annotations: blocks,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sealWEDMMasterPostOutput — happy path", () => {
  it("seals a single-block WEDM engine output and returns a 1.2.0 sidecar", () => {
    const blocks = [validRoughBlock()];
    const result = sealWEDMMasterPostOutput(makeEngineOutput(blocks), {
      source_engine_versions: { "MitsubishiMV1200RWireEDMMasterPostEngine": "test-1.0.0" },
      generated_at: FIXED_GENERATED_AT,
    });

    expect(result.engine_output.gcode.length).toBe(FIXTURE_GCODE_LINE_COUNT);
    expect(result.sidecar.meta.schema_version).toBe(POST_PHYSICS_SIDECAR_SCHEMA_VERSION);
    expect(result.sidecar.meta.schema_version).toBe("1.2.0");
    expect(result.sidecar.wedm_block_annotations).toHaveLength(1);
    expect(result.sidecar.wedm_block_annotations?.[0].block_id).toBe("OP1_rough");
    expect(result.sidecar.wedm_block_annotations?.[0].emitted.power_setting).toBe(ROUGH_E_PACK);
    // wedm shape, NOT milling shape — confirm milling field is absent
    expect(Object.prototype.hasOwnProperty.call(result.sidecar, "block_annotations")).toBe(false);
  });

  it("seals multi-block (rough + skim) engine output and preserves order", () => {
    const blocks = [validRoughBlock(), validSkimBlock()];
    const result = sealWEDMMasterPostOutput(makeEngineOutput(blocks), {
      source_engine_versions: { "MitsubishiMV1200RWireEDMMasterPostEngine": "test-1.0.0" },
      generated_at: FIXED_GENERATED_AT,
    });

    expect(result.sidecar.wedm_block_annotations).toHaveLength(2);
    expect(result.sidecar.wedm_block_annotations?.[0].block_id).toBe("OP1_rough");
    expect(result.sidecar.wedm_block_annotations?.[1].block_id).toBe("OP2_skim1");
    expect(result.sidecar.wedm_block_annotations?.[0].emitted.pass_type).toBe("rough");
    expect(result.sidecar.wedm_block_annotations?.[1].emitted.pass_type).toBe("skim1");
    expect(result.sidecar.wedm_block_annotations?.[0].emitted.power_setting).toBe(ROUGH_E_PACK);
    expect(result.sidecar.wedm_block_annotations?.[1].emitted.power_setting).toBe(SKIM_E_PACK);
  });

  it("seals empty block_annotations array (engine that does not annotate)", () => {
    const result = sealWEDMMasterPostOutput(makeEngineOutput([]), {
      source_engine_versions: { "MitsubishiMV1200RWireEDMMasterPostEngine": "test-1.0.0" },
      generated_at: FIXED_GENERATED_AT,
    });

    expect(result.sidecar.wedm_block_annotations).toEqual([]);
  });

  it("attaches a deterministic SHA-256 to the sealed sidecar", () => {
    const blocks = [validRoughBlock()];
    const result = sealWEDMMasterPostOutput(makeEngineOutput(blocks), {
      source_engine_versions: { test: "v1" },
      generated_at: FIXED_GENERATED_AT,
    });

    expect(result.sidecar.meta.sha256).toMatch(SHA256_HEX_PATTERN);
    expect(result.sidecar.meta.sha256.length).toBe(SHA256_HEX_LENGTH);
  });

  it("round-trips: sealed sidecar re-verifies via PhysicsSidecarBuilderEngine.verify()", () => {
    const blocks = [validRoughBlock(), validSkimBlock()];
    const result = sealWEDMMasterPostOutput(makeEngineOutput(blocks), {
      source_engine_versions: { "MitsubishiMV1200RWireEDMMasterPostEngine": "test-1.0.0" },
      generated_at: FIXED_GENERATED_AT,
    });

    const verified = PhysicsSidecarBuilderEngine.verify(result.sidecar);
    expect(verified.ok).toBe(true);
    expect(verified.reason).toBe("ok");
    expect(verified.recomputed_sha).toBe(result.sidecar.meta.sha256);
    expect(verified.recomputed_sha).toBe(verified.expected_sha);
  });

  it("preserves all block annotation fields verbatim through the seal", () => {
    const customBlock = validRoughBlock({
      block_id: "OP_custom",
      material_class: "carbide",
      wire_diameter_mm: CARBIDE_WIRE_DIAMETER_MM,
      thickness_mm: THICK_PART_MM,
      physics_basis: "operator_override",
      source_constants: [],
      confidence: OPERATOR_CONFIDENCE,
      emitted: {
        power_setting: OVERRIDE_E_PACK,
        on_time_us: OVERRIDE_ON_TIME_US,
        off_time_us: OVERRIDE_OFF_TIME_US,
        servo_voltage_v: OVERRIDE_SERVO_V,
        wire_speed_m_min: OVERRIDE_WIRE_SPEED,
        wire_tension_g: OVERRIDE_WIRE_TENSION,
        flushing_pressure: OVERRIDE_FLUSHING,
        pass_type: "rough",
      },
    });

    const result = sealWEDMMasterPostOutput(makeEngineOutput([customBlock]), {
      source_engine_versions: { test: "v1" },
      generated_at: FIXED_GENERATED_AT,
    });

    const sealed = result.sidecar.wedm_block_annotations?.[0];
    expect(sealed?.block_id).toBe("OP_custom");
    expect(sealed?.material_class).toBe("carbide");
    expect(sealed?.wire_diameter_mm).toBe(CARBIDE_WIRE_DIAMETER_MM);
    expect(sealed?.thickness_mm).toBe(THICK_PART_MM);
    expect(sealed?.physics_basis).toBe("operator_override");
    expect(sealed?.source_constants).toEqual([]);
    expect(sealed?.confidence).toBe(OPERATOR_CONFIDENCE);
    expect(sealed?.emitted.power_setting).toBe(OVERRIDE_E_PACK);
    expect(sealed?.emitted.servo_voltage_v).toBe(OVERRIDE_SERVO_V);
    expect(sealed?.emitted.on_time_us).toBe(OVERRIDE_ON_TIME_US);
    expect(sealed?.emitted.off_time_us).toBe(OVERRIDE_OFF_TIME_US);
  });

  it("returns engine_output unmodified (pass-through reference semantics)", () => {
    const engineOutput = makeEngineOutput([validRoughBlock()]);
    const result = sealWEDMMasterPostOutput(engineOutput, {
      source_engine_versions: { test: "v1" },
      generated_at: FIXED_GENERATED_AT,
    });

    expect(result.engine_output).toBe(engineOutput);
    expect(result.engine_output.gcode).toBe(engineOutput.gcode);
    expect(result.engine_output.block_annotations).toBe(engineOutput.block_annotations);
  });
});

describe("sealWEDMMasterPostOutput — input validation", () => {
  it("throws on null engineOutput", () => {
    expect(() =>
      sealWEDMMasterPostOutput(null as unknown as { gcode: string[]; block_annotations: WEDMBlockAnnotation[] }, {
        source_engine_versions: { test: "v1" },
      }),
    ).toThrow(/engineOutput must be a non-null object/);
  });

  it("throws when gcode is missing", () => {
    expect(() =>
      sealWEDMMasterPostOutput(
        { block_annotations: [] } as unknown as { gcode: string[]; block_annotations: WEDMBlockAnnotation[] },
        { source_engine_versions: { test: "v1" } },
      ),
    ).toThrow(/gcode must be an array/);
  });

  it("throws when gcode is not an array", () => {
    expect(() =>
      sealWEDMMasterPostOutput(
        { gcode: "not an array", block_annotations: [] } as unknown as {
          gcode: string[];
          block_annotations: WEDMBlockAnnotation[];
        },
        { source_engine_versions: { test: "v1" } },
      ),
    ).toThrow(/gcode must be an array/);
  });

  it("throws when block_annotations is missing", () => {
    expect(() =>
      sealWEDMMasterPostOutput(
        { gcode: ["G01 X0"] } as unknown as { gcode: string[]; block_annotations: WEDMBlockAnnotation[] },
        { source_engine_versions: { test: "v1" } },
      ),
    ).toThrow(/block_annotations must be an array/);
  });

  it("throws when opts.source_engine_versions is missing", () => {
    expect(() =>
      sealWEDMMasterPostOutput(makeEngineOutput([]), {} as { source_engine_versions: Record<string, string> }),
    ).toThrow(/source_engine_versions must be an object/);
  });

  it("throws when opts is null", () => {
    expect(() =>
      sealWEDMMasterPostOutput(
        makeEngineOutput([]),
        null as unknown as { source_engine_versions: Record<string, string> },
      ),
    ).toThrow(/opts is required/);
  });
});

describe("sealWEDMMasterPostOutput — schema invariants surface from builder", () => {
  it("propagates duplicate block_id rejection from schema superRefine", () => {
    const dup = [validRoughBlock(), validRoughBlock()]; // both block_id=OP1_rough
    expect(() =>
      sealWEDMMasterPostOutput(makeEngineOutput(dup), {
        source_engine_versions: { test: "v1" },
      }),
    ).toThrow(/duplicate block_id/);
  });

  it("propagates operator_override empty-source-constants rule", () => {
    const bad = [
      validRoughBlock({
        physics_basis: "operator_override",
        source_constants: ["should_be_empty"],
      }),
    ];
    expect(() =>
      sealWEDMMasterPostOutput(makeEngineOutput(bad), {
        source_engine_versions: { test: "v1" },
      }),
    ).toThrow();
  });

  it("propagates off_time/on_time heat-soak invariant (off_time >= 20% on_time)", () => {
    const tooShort = [
      validRoughBlock({
        emitted: {
          power_setting: ROUGH_E_PACK,
          on_time_us: HEATSOAK_VIOLATION_ON_US,
          off_time_us: HEATSOAK_VIOLATION_OFF_US,
          servo_voltage_v: ROUGH_SERVO_V,
          wire_speed_m_min: ROUGH_WIRE_SPEED,
          wire_tension_g: ROUGH_WIRE_TENSION,
          flushing_pressure: ROUGH_FLUSHING,
          pass_type: "rough",
        },
      }),
    ];
    expect(() =>
      sealWEDMMasterPostOutput(makeEngineOutput(tooShort), {
        source_engine_versions: { test: "v1" },
      }),
    ).toThrow();
  });
});

describe("PhysicsSidecarBuilderEngine — mixed block_annotations rejection", () => {
  function makeMillingBlock(): BlockAnnotation {
    return {
      block_id: "MILLING_OP1",
      op_id: "milling_drill_1",
      iso_group: "P",
      tool_material: "carbide",
      emitted: {
        vc_mpm: MILLING_VC_MPM,
        fpt_mm: MILLING_FPT_MM,
        ap_mm: MILLING_AP_MM,
        ae_mm: MILLING_AE_MM,
        S_rpm: MILLING_S_RPM,
        F_mmpm: MILLING_F_MM_MIN,
      },
      physics_basis: "kienzle",
      confidence: ROUGH_CONFIDENCE,
      safety_margin: SAFETY_MARGIN_NEUTRAL,
      source_constants: ["CANONICAL_KIENZLE.P"],
    };
  }

  it("throws when caller passes both block_annotations and wedm_block_annotations", () => {
    expect(() =>
      PhysicsSidecarBuilderEngine.buildAndSeal({
        source_engine_versions: { test: "v1" },
        block_annotations: [makeMillingBlock()],
        wedm_block_annotations: [validRoughBlock()],
      }),
    ).toThrow(/mutually exclusive/);
  });

  it("accepts block_annotations alone (milling/turning path unaffected)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: { test: "v1" },
      block_annotations: [makeMillingBlock()],
    });
    expect(sealed.block_annotations).toHaveLength(1);
    expect(sealed.block_annotations?.[0].block_id).toBe("MILLING_OP1");
    expect(Object.prototype.hasOwnProperty.call(sealed, "wedm_block_annotations")).toBe(false);
  });

  it("accepts wedm_block_annotations alone (Wire EDM path)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: { test: "v1" },
      wedm_block_annotations: [validRoughBlock()],
    });
    expect(sealed.wedm_block_annotations).toHaveLength(1);
    expect(sealed.wedm_block_annotations?.[0].block_id).toBe("OP1_rough");
    expect(Object.prototype.hasOwnProperty.call(sealed, "block_annotations")).toBe(false);
  });
});

describe("sealWEDMMasterPostOutput — tamper detection", () => {
  it("modifying a block annotation field after seal breaks SHA verification", () => {
    const blocks = [validRoughBlock()];
    const result = sealWEDMMasterPostOutput(makeEngineOutput(blocks), {
      source_engine_versions: { test: "v1" },
      generated_at: FIXED_GENERATED_AT,
    });

    const before = PhysicsSidecarBuilderEngine.verify(result.sidecar);
    expect(before.ok).toBe(true);
    expect(before.reason).toBe("ok");

    // Tamper: change op_id to a different valid string. Schema still passes
    // (op_id is just z.string().min(1)) but the SHA seal must catch the swap.
    // We can't use power_setting=99 because schema rejects power_setting>20
    // before SHA verification fires.
    const tampered = JSON.parse(JSON.stringify(result.sidecar));
    tampered.wedm_block_annotations[0].op_id = TAMPER_OP_ID;

    const after = PhysicsSidecarBuilderEngine.verify(tampered);
    expect(after.ok).toBe(false);
    expect(after.reason).toBe("sha_mismatch");
    expect(after.expected_sha).toBe(result.sidecar.meta.sha256);
    expect(after.recomputed_sha).not.toBe(after.expected_sha);
  });

  it("modifying gcode does not affect sidecar SHA (gcode is not in seal coverage)", () => {
    const blocks = [validRoughBlock()];
    const result = sealWEDMMasterPostOutput(makeEngineOutput(blocks), {
      source_engine_versions: { test: "v1" },
      generated_at: FIXED_GENERATED_AT,
    });
    const originalSha = result.sidecar.meta.sha256;

    result.engine_output.gcode.push("G01 X999.0");
    const verified = PhysicsSidecarBuilderEngine.verify(result.sidecar);
    expect(verified.ok).toBe(true);
    expect(verified.recomputed_sha).toBe(originalSha);
  });
});

describe("sealWEDMMasterPostOutput vs sealMasterPostOutput — shape divergence", () => {
  it("milling helper rejects WEDM annotations at schema validation", () => {
    const wedmBlock = validRoughBlock();
    expect(() =>
      sealMasterPostOutput(
        {
          gcode: ["G01"],
          block_annotations: [wedmBlock] as unknown as BlockAnnotation[],
        },
        { source_engine_versions: { test: "v1" } },
      ),
    ).toThrow();
  });
});
