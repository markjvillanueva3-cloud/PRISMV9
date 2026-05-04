/**
 * MitsubishiMV1200RWireEDMMasterPostEngine — sidecar block_annotations emit
 *
 * @milestone PPG-WIRE-MS6/U-PPGM16
 *
 * Validates that `generateProgram()` emits one `WEDMBlockAnnotation` per
 * operation under the sealed-sidecar contract — same pattern HurcoV11 +
 * OkumaB250 + OkumaOSPMill use, but routed through `wedm_block_annotations`
 * (schema 1.2.0 additive field) because WEDM physics doesn't fit S_rpm/F_mmpm.
 *
 * Coverage targets per comprehensive-build floor:
 *   - happy path: rough-only, multi-pass (rough+skim), operator override
 *   - failure modes: bad input, boundary, missing material
 *   - adversarial: NaN inputs, Infinity, empty op array
 *   - variability: 3 spanning material classes (tool_steel, carbide, aluminum)
 */
import { describe, it, expect } from "vitest";
import {
  mitsubishiMV1200RWireEDMMasterPostEngine,
  type WireEDMOperation,
  type WireEDMMaterial,
} from "../engines/MitsubishiMV1200RWireEDMMasterPostEngine.js";
import {
  postPhysicsSidecarSchema,
  buildCanonicalSidecarPayload,
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
} from "../schemas/postPhysicsSidecarSchema.js";

const D2: WireEDMMaterial = {
  name: "D2 Tool Steel",
  hardness_hrc: 60,
  conductivity_class: "low",
};
const TUNGSTEN_CARBIDE: WireEDMMaterial = {
  name: "Tungsten Carbide",
  hardness_hrc: 90,
  conductivity_class: "low",
};
const AL_6061: WireEDMMaterial = {
  name: "Aluminum 6061",
  hardness_hrc: 30,
  conductivity_class: "high",
};
const GRAPHITE: WireEDMMaterial = {
  name: "Graphite EDM-3",
  conductivity_class: "high",
};
const TI_6AL_4V: WireEDMMaterial = {
  name: "Titanium Ti-6Al-4V",
  hardness_hrc: 36,
  conductivity_class: "low",
};

const PROGRAM_NUM = "9100";
const STD_THICKNESS_MM = 25;

function profileSquare(): WireEDMOperation["profile_points"] {
  return [
    { x: 0, y: 0, type: "linear" },
    { x: 50, y: 0, type: "linear" },
    { x: 50, y: 50, type: "linear" },
    { x: 0, y: 50, type: "linear" },
    { x: 0, y: 0, type: "linear" },
  ];
}

function roughOp(material: WireEDMMaterial, overrides: Partial<WireEDMOperation> = {}): WireEDMOperation {
  return {
    operation_type: "profile",
    pass: "rough",
    start_x: 0,
    start_y: 0,
    profile_points: profileSquare(),
    material,
    thickness_mm: STD_THICKNESS_MM,
    offset_direction: "left",
    ...overrides,
  };
}

describe("MitsubishiMV1200R — block_annotations happy path", () => {
  it("emits exactly one block annotation per operation (rough-only)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations).toHaveLength(1);
    expect(out.block_annotations[0].pass_type ?? out.block_annotations[0].emitted.pass_type).toBe("rough");
  });

  it("emits 4 block annotations for rough + skim1 + skim2 + skim3 multi-pass", () => {
    const ops: WireEDMOperation[] = [
      roughOp(D2),
      roughOp(D2, { pass: "skim1" }),
      roughOp(D2, { pass: "skim2" }),
      roughOp(D2, { pass: "skim3" }),
    ];
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      ops,
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations).toHaveLength(4);
    expect(out.block_annotations.map(b => b.emitted.pass_type)).toEqual([
      "rough", "skim1", "skim2", "skim3",
    ]);
  });

  it("block_id format is OP{i+1}_{pass} matching the OPERATION header convention", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim1" })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations.map(b => b.block_id)).toEqual([
      "OP1_rough", "OP2_skim1",
    ]);
  });

  it("op_id defaults to OP{i+1}_{pass} but honors explicit override", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { op_id: "rough_pocket_main" }), roughOp(D2, { pass: "skim1" })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].op_id).toBe("rough_pocket_main");
    expect(out.block_annotations[1].op_id).toBe("OP2_skim1");
  });

  it("rough pass uses epack_lookup basis with single E_PACK_TABLE source", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2)],
      { program_number: PROGRAM_NUM },
    );
    const block = out.block_annotations[0];
    expect(block.physics_basis).toBe("epack_lookup");
    expect(block.source_constants).toHaveLength(1);
    expect(block.source_constants[0]).toMatch(/^E_PACK_TABLE\[\d+\]$/);
  });

  it("skim pass uses pass_factor_table basis with PASS_DEFAULTS + E_PACK_TABLE sources", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim2" })],
      { program_number: PROGRAM_NUM },
    );
    const skim = out.block_annotations[1];
    expect(skim.physics_basis).toBe("pass_factor_table");
    expect(skim.source_constants).toEqual(['PASS_DEFAULTS["skim2"]', expect.stringMatching(/^E_PACK_TABLE\[\d+\]$/)]);
  });

  it("operator_override basis when on_time_us explicitly supplied (and source_constants empty)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { on_time_us: 9.5, off_time_us: 24, servo_voltage_v: 48 })],
      { program_number: PROGRAM_NUM },
    );
    const block = out.block_annotations[0];
    expect(block.physics_basis).toBe("operator_override");
    expect(block.source_constants).toEqual([]);
    expect(block.confidence).toBe(1.0);
    expect(block.emitted.on_time_us).toBe(9.5);
    expect(block.emitted.off_time_us).toBe(24);
    expect(block.emitted.servo_voltage_v).toBe(48);
  });
});

describe("MitsubishiMV1200R — material classification (3 spanning configs)", () => {
  it("classifies 'D2 Tool Steel' → 'tool_steel'", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("tool_steel");
  });

  it("classifies 'Tungsten Carbide' → 'carbide'", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(TUNGSTEN_CARBIDE)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("carbide");
  });

  it("classifies 'Aluminum 6061' → 'aluminum'", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(AL_6061)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("aluminum");
  });

  it("classifies 'Graphite EDM-3' → 'graphite'", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(GRAPHITE)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("graphite");
  });

  it("classifies 'Titanium Ti-6Al-4V' → 'titanium'", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(TI_6AL_4V)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("titanium");
  });

  it("falls back to tool_steel for unrecognized material names", () => {
    const exotic: WireEDMMaterial = { name: "Unobtainium-X", conductivity_class: "medium" };
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(exotic)],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("tool_steel");
  });

  it("explicit op.material_class overrides classifyMaterial fallback", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { material_class: "inconel" })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].material_class).toBe("inconel");
  });
});

describe("MitsubishiMV1200R — emitted parameter integrity", () => {
  it("rough pass emits PASS_DEFAULTS.rough wire speed/tension when no override", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2)],
      { program_number: PROGRAM_NUM },
    );
    const e = out.block_annotations[0].emitted;
    // PASS_DEFAULTS.rough: wire_speed=12 m/min, wire_tension=1200 g, servo=50V
    expect(e.wire_speed_m_min).toBe(12);
    expect(e.wire_tension_g).toBe(1200);
    expect(e.servo_voltage_v).toBe(50);
  });

  it("skim4 pass emits PASS_DEFAULTS.skim4 (wire_speed=4, tension=450, servo=28)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim4" })],
      { program_number: PROGRAM_NUM },
    );
    const e = out.block_annotations[1].emitted;
    expect(e.wire_speed_m_min).toBe(4);
    expect(e.wire_tension_g).toBe(450);
    expect(e.servo_voltage_v).toBe(28);
  });

  it("multi-pass: skim on/off times scale by PASS_DEFAULTS factors (rough on > skim2 on)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim2" })],
      { program_number: PROGRAM_NUM },
    );
    const rough = out.block_annotations[0].emitted;
    const skim2 = out.block_annotations[1].emitted;
    expect(skim2.on_time_us).toBeLessThan(rough.on_time_us);
    expect(skim2.off_time_us).toBeLessThan(rough.off_time_us);
  });

  it("op.wire override takes precedence over PASS_DEFAULTS", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { wire: { speed_m_min: 14, tension_g: 1500, diameter_mm: 0.30, type: "zinc_coated" } })],
      { program_number: PROGRAM_NUM },
    );
    const e = out.block_annotations[0].emitted;
    expect(e.wire_speed_m_min).toBe(14);
    expect(e.wire_tension_g).toBe(1500);
    expect(out.block_annotations[0].wire_diameter_mm).toBe(0.30);
  });

  it("safety_margin defaults to 1.0 across all passes (no derate from engine)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim1" }), roughOp(D2, { pass: "skim4" })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations.every(b => b.safety_margin === 1.0)).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────
  // PPG-WIRE-MS6/U-PPGM17c — confidence per physics_basis + safety_margin override
  // ──────────────────────────────────────────────────────────────────────

  it("confidence varies per physics_basis: rough(epack_lookup)=0.90, skim(pass_factor_table)=0.85", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim1" }), roughOp(D2, { pass: "skim4" })],
      { program_number: PROGRAM_NUM },
    );
    // Index 0: rough → epack_lookup → 0.90
    expect(out.block_annotations[0].physics_basis).toBe("epack_lookup");
    expect(out.block_annotations[0].confidence).toBe(0.90);
    // Index 1: skim1 → pass_factor_table → 0.85
    expect(out.block_annotations[1].physics_basis).toBe("pass_factor_table");
    expect(out.block_annotations[1].confidence).toBe(0.85);
    // Index 2: skim4 → pass_factor_table → 0.85
    expect(out.block_annotations[2].physics_basis).toBe("pass_factor_table");
    expect(out.block_annotations[2].confidence).toBe(0.85);
  });

  it("operator_override stays at confidence=1.0 even when other ops use derived basis", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [
        roughOp(D2),                                                       // epack_lookup
        roughOp(D2, { on_time_us: 9.5, off_time_us: 24, servo_voltage_v: 48 }), // operator_override
      ],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].physics_basis).toBe("epack_lookup");
    expect(out.block_annotations[0].confidence).toBe(0.90);
    expect(out.block_annotations[1].physics_basis).toBe("operator_override");
    expect(out.block_annotations[1].confidence).toBe(1.0);
  });

  it("op.safety_margin overrides the default 1.0 for the overriding op only", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [
        roughOp(D2),                              // default safety_margin
        roughOp(D2, { pass: "skim1", safety_margin: 1.25 }), // op-overridden
        roughOp(D2, { pass: "skim4" }),           // default again
      ],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].safety_margin).toBe(1.0);
    expect(out.block_annotations[1].safety_margin).toBe(1.25);
    expect(out.block_annotations[2].safety_margin).toBe(1.0);
  });

  it("thickness_mm threads through from operation to annotation verbatim", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { thickness_mm: 80 })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].thickness_mm).toBe(80);
  });
});

describe("MitsubishiMV1200R — schema round-trip (sealed-sidecar contract)", () => {
  it("emitted block_annotations validate against wedm_block_annotations Zod schema", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2), roughOp(D2, { pass: "skim1" }), roughOp(D2, { pass: "skim2" })],
      { program_number: PROGRAM_NUM },
    );
    const sidecar = {
      meta: {
        schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
        sha256: "a".repeat(64),
        generated_at: new Date().toISOString(),
        source_engine_versions: { post: "1.0.0" },
        constants_source: "src/physics/constants.ts",
      },
      ...buildCanonicalSidecarPayload(),
      wedm_block_annotations: out.block_annotations,
    };
    const result = postPhysicsSidecarSchema.safeParse(sidecar);
    if (!result.success) {
      console.error("Schema validation failed:", JSON.stringify(result.error, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("operator_override annotations also validate (empty source_constants accepted)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { on_time_us: 9, off_time_us: 22, servo_voltage_v: 50 })],
      { program_number: PROGRAM_NUM },
    );
    const sidecar = {
      meta: {
        schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
        sha256: "b".repeat(64),
        generated_at: new Date().toISOString(),
        source_engine_versions: { post: "1.0.0" },
        constants_source: "src/physics/constants.ts",
      },
      ...buildCanonicalSidecarPayload(),
      wedm_block_annotations: out.block_annotations,
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(true);
  });

  it("thermal heat-soak rule passes for all PASS_DEFAULTS-derived emissions", () => {
    // Every default pass should satisfy off_time ≥ 20% on_time.
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [
        roughOp(D2),
        roughOp(D2, { pass: "skim1" }),
        roughOp(D2, { pass: "skim2" }),
        roughOp(D2, { pass: "skim3" }),
        roughOp(D2, { pass: "skim4" }),
      ],
      { program_number: PROGRAM_NUM },
    );
    for (const b of out.block_annotations) {
      expect(b.emitted.off_time_us).toBeGreaterThanOrEqual(b.emitted.on_time_us * 0.2);
    }
  });
});

describe("MitsubishiMV1200R — failure modes + adversarial inputs", () => {
  it("empty operation array returns block_annotations=[] (no spurious entries)", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations).toEqual([]);
  });

  it("operator_override with only on_time_us still flags as override (partial override)", () => {
    // Even if only one EDM param is overridden, the basis should be operator_override.
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { on_time_us: 7.7 })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].physics_basis).toBe("operator_override");
    expect(out.block_annotations[0].emitted.on_time_us).toBe(7.7);
  });

  it("malformed annotation (manually corrupted to negative on_time) is caught by schema", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2)],
      { program_number: PROGRAM_NUM },
    );
    const corrupted = JSON.parse(JSON.stringify(out.block_annotations));
    corrupted[0].emitted.on_time_us = -1;  // post-emit tampering
    const sidecar = {
      meta: {
        schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
        sha256: "c".repeat(64),
        generated_at: new Date().toISOString(),
        source_engine_versions: { post: "1.0.0" },
        constants_source: "src/physics/constants.ts",
      },
      ...buildCanonicalSidecarPayload(),
      wedm_block_annotations: corrupted,
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(false);
  });

  it("operations with NaN thickness_mm flow through but schema rejects", () => {
    // Engine populates the annotation verbatim; schema is the integrity gate.
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { thickness_mm: Number.NaN })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].thickness_mm).toBeNaN();
    const sidecar = {
      meta: {
        schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
        sha256: "d".repeat(64),
        generated_at: new Date().toISOString(),
        source_engine_versions: { post: "1.0.0" },
        constants_source: "src/physics/constants.ts",
      },
      ...buildCanonicalSidecarPayload(),
      wedm_block_annotations: out.block_annotations,
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(false);
  });

  it("Infinity wire_diameter_mm via op.wire override is rejected by schema", () => {
    const out = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
      [roughOp(D2, { wire: { speed_m_min: 12, tension_g: 1200, diameter_mm: Number.POSITIVE_INFINITY, type: "brass" } })],
      { program_number: PROGRAM_NUM },
    );
    expect(out.block_annotations[0].wire_diameter_mm).toBe(Number.POSITIVE_INFINITY);
    const sidecar = {
      meta: {
        schema_version: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
        sha256: "e".repeat(64),
        generated_at: new Date().toISOString(),
        source_engine_versions: { post: "1.0.0" },
        constants_source: "src/physics/constants.ts",
      },
      ...buildCanonicalSidecarPayload(),
      wedm_block_annotations: out.block_annotations,
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(false);
  });
});
