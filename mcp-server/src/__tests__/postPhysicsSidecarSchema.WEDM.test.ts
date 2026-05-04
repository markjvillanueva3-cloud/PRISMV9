/**
 * postPhysicsSidecarSchema — Wire EDM block annotations
 *
 * @milestone PPG-WIRE-MS6/U-PPGM16
 *
 * Validates the new `wedm_block_annotations[]` shape introduced at schema
 * 1.2.0 + the cross-cutting `validateWEDMBlockAnnotationsArray` refinement
 * (duplicate block_id detection, operator_override invariant, off-time/
 * on-time thermal-recovery rule).
 */
import { describe, it, expect } from "vitest";
import {
  postPhysicsSidecarSchema,
  wedmBlockAnnotationSchema,
  buildCanonicalSidecarPayload,
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  type WEDMBlockAnnotation,
  type BlockAnnotation,
} from "../schemas/postPhysicsSidecarSchema.js";

const ROUGH_E_PACK = 12;
const ROUGH_ON_TIME_US = 8;
const ROUGH_OFF_TIME_US = 20;
const ROUGH_SERVO_V = 50;
const ROUGH_WIRE_SPEED = 12;
const ROUGH_WIRE_TENSION = 1200;
const ROUGH_FLUSHING = 10;

const SKIM_E_PACK = 12;
const SKIM_ON_TIME_US = 4;
const SKIM_OFF_TIME_US = 12;
const SKIM_SERVO_V = 40;
const SKIM_WIRE_SPEED = 8;
const SKIM_WIRE_TENSION = 800;
const SKIM_FLUSHING = 5;

function validRoughBlock(overrides: Partial<WEDMBlockAnnotation> = {}): WEDMBlockAnnotation {
  return {
    block_id: "OP1_rough",
    op_id: "rough_pocket_1",
    material_class: "tool_steel",
    wire_diameter_mm: 0.25,
    thickness_mm: 25,
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
    confidence: 0.85,
    safety_margin: 1.0,
    source_constants: ["E_PACK_TABLE[12]"],
    ...overrides,
  };
}

describe("schema 1.2.0 — version bump", () => {
  it("POST_PHYSICS_SIDECAR_SCHEMA_VERSION is exactly '1.2.0'", () => {
    expect(POST_PHYSICS_SIDECAR_SCHEMA_VERSION).toBe("1.2.0");
  });
});

describe("wedmBlockAnnotationSchema — happy path", () => {
  it("accepts a fully populated rough block with epack_lookup basis", () => {
    const result = wedmBlockAnnotationSchema.safeParse(validRoughBlock());
    expect(result.success).toBe(true);
  });

  it("accepts skim block with pass_factor_table basis (multi-source constants)", () => {
    const skim = validRoughBlock({
      block_id: "OP2_skim2",
      op_id: "skim_pocket_2",
      emitted: {
        power_setting: SKIM_E_PACK,
        on_time_us: SKIM_ON_TIME_US,
        off_time_us: SKIM_OFF_TIME_US,
        servo_voltage_v: SKIM_SERVO_V,
        wire_speed_m_min: SKIM_WIRE_SPEED,
        wire_tension_g: SKIM_WIRE_TENSION,
        flushing_pressure: SKIM_FLUSHING,
        pass_type: "skim2",
      },
      physics_basis: "pass_factor_table",
      source_constants: ['PASS_DEFAULTS["skim2"]', "E_PACK_TABLE[12]"],
    });
    const result = wedmBlockAnnotationSchema.safeParse(skim);
    expect(result.success).toBe(true);
  });

  it("accepts operator_override with empty source_constants (override bypasses physics)", () => {
    const overridden = validRoughBlock({
      physics_basis: "operator_override",
      confidence: 1.0,
      source_constants: [],
    });
    const result = wedmBlockAnnotationSchema.safeParse(overridden);
    expect(result.success).toBe(true);
  });

  it("accepts all 5 pass types (rough + skim1..skim4)", () => {
    for (const pass of ["rough", "skim1", "skim2", "skim3", "skim4"] as const) {
      const block = validRoughBlock({
        block_id: `OP1_${pass}`,
        emitted: { ...validRoughBlock().emitted, pass_type: pass },
      });
      expect(wedmBlockAnnotationSchema.safeParse(block).success).toBe(true);
    }
  });

  it("accepts all 9 material classes", () => {
    for (const mc of [
      "tool_steel", "carbide", "graphite", "aluminum", "copper",
      "brass", "titanium", "inconel", "ceramic",
    ] as const) {
      const block = validRoughBlock({ material_class: mc });
      expect(wedmBlockAnnotationSchema.safeParse(block).success).toBe(true);
    }
  });
});

describe("wedmBlockAnnotationSchema — failure modes", () => {
  it("rejects negative on_time_us", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, on_time_us: -2 },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects power_setting=0 (out of [1,20] range)", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, power_setting: 0 },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects power_setting=21 (above max)", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, power_setting: 21 },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects non-integer power_setting (12.5)", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, power_setting: 12.5 },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    expect(wedmBlockAnnotationSchema.safeParse(
      validRoughBlock({ confidence: 1.5 })
    ).success).toBe(false);
  });

  it("rejects safety_margin = 0 (must be strictly positive)", () => {
    expect(wedmBlockAnnotationSchema.safeParse(
      validRoughBlock({ safety_margin: 0 })
    ).success).toBe(false);
  });

  it("rejects safety_margin > 1.5 (sign of upstream bug)", () => {
    expect(wedmBlockAnnotationSchema.safeParse(
      validRoughBlock({ safety_margin: 1.6 })
    ).success).toBe(false);
  });

  it("rejects empty block_id", () => {
    expect(wedmBlockAnnotationSchema.safeParse(
      validRoughBlock({ block_id: "" })
    ).success).toBe(false);
  });

  it("rejects unknown material_class", () => {
    const bad = validRoughBlock({ material_class: "unobtainium" as never });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown pass_type", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, pass_type: "skim5" as never },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });
});

describe("wedmBlockAnnotationSchema — adversarial inputs", () => {
  it("rejects NaN on_time_us", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, on_time_us: Number.NaN },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects Infinity wire_speed_m_min", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, wire_speed_m_min: Number.POSITIVE_INFINITY },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects negative Infinity servo_voltage_v", () => {
    const bad = validRoughBlock({
      emitted: { ...validRoughBlock().emitted, servo_voltage_v: Number.NEGATIVE_INFINITY },
    });
    expect(wedmBlockAnnotationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects empty wire_diameter_mm field via finitePositive guard (0)", () => {
    expect(wedmBlockAnnotationSchema.safeParse(
      validRoughBlock({ wire_diameter_mm: 0 })
    ).success).toBe(false);
  });
});

describe("postPhysicsSidecarSchema — wedm_block_annotations array refinements", () => {
  const meta = {
    schema_version: "1.2.0",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    generated_at: "2026-05-04T00:00:00.000Z",
    source_engine_versions: { post: "1.0.0" },
    constants_source: "src/physics/constants.ts",
  };

  // Build a real sidecar shell using the canonical builder so the
  // kienzle/taylor/edm/canonical-S+F tables match the schema's strict
  // P/M/K/N/S/H shape exactly. Avoids hand-rolling brittle fixtures.
  const minimalShell = { meta, ...buildCanonicalSidecarPayload() };

  it("accepts sidecar with valid wedm_block_annotations array", () => {
    const sidecar = {
      ...minimalShell,
      wedm_block_annotations: [validRoughBlock()],
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(true);
  });

  it("rejects duplicate block_id within wedm_block_annotations", () => {
    const sidecar = {
      ...minimalShell,
      wedm_block_annotations: [
        validRoughBlock({ block_id: "OP1_rough" }),
        validRoughBlock({ block_id: "OP1_rough" }),  // duplicate
      ],
    };
    const result = postPhysicsSidecarSchema.safeParse(sidecar);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error)).toMatch(/duplicate block_id/);
    }
  });

  it("rejects operator_override with non-empty source_constants", () => {
    const sidecar = {
      ...minimalShell,
      wedm_block_annotations: [
        validRoughBlock({
          physics_basis: "operator_override",
          source_constants: ["something"],  // must be empty for override
        }),
      ],
    };
    const result = postPhysicsSidecarSchema.safeParse(sidecar);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error)).toMatch(/operator_override blocks must have empty source_constants/);
    }
  });

  it("rejects epack_lookup with empty source_constants (must cite at least one)", () => {
    const sidecar = {
      ...minimalShell,
      wedm_block_annotations: [
        validRoughBlock({
          physics_basis: "epack_lookup",
          source_constants: [],
        }),
      ],
    };
    const result = postPhysicsSidecarSchema.safeParse(sidecar);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error)).toMatch(/requires at least one source constant/);
    }
  });

  it("rejects block where off_time < 20% of on_time (thermal heat-soak rule)", () => {
    const sidecar = {
      ...minimalShell,
      wedm_block_annotations: [
        validRoughBlock({
          emitted: {
            ...validRoughBlock().emitted,
            on_time_us: 10,
            off_time_us: 1,  // 10% — below 20% safety floor
          },
        }),
      ],
    };
    const result = postPhysicsSidecarSchema.safeParse(sidecar);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error)).toMatch(/wire-break risk from heat soak/);
    }
  });

  it("accepts off_time exactly at 20% boundary (edge of heat-soak rule)", () => {
    const sidecar = {
      ...minimalShell,
      wedm_block_annotations: [
        validRoughBlock({
          emitted: {
            ...validRoughBlock().emitted,
            on_time_us: 10,
            off_time_us: 2,  // exactly 20%
          },
        }),
      ],
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(true);
  });

  it("accepts sidecar without wedm_block_annotations (backward compat)", () => {
    expect(postPhysicsSidecarSchema.safeParse(minimalShell).success).toBe(true);
  });

  it("accepts sidecar with both block_annotations and wedm_block_annotations populated (combined cycle)", () => {
    const milling: BlockAnnotation = {
      block_id: "N100",
      op_id: "drill_pre_edm",
      iso_group: "P",
      tool_material: "carbide",
      emitted: {
        vc_mpm: 80, fpt_mm: 0.05, ap_mm: 5, ae_mm: 8,
        S_rpm: 2122, F_mmpm: 425,
      },
      physics_basis: "kienzle",
      confidence: 0.9,
      safety_margin: 0.85,
      source_constants: ["CANONICAL_KIENZLE.P"],
    };
    const sidecar = {
      ...minimalShell,
      block_annotations: [milling],
      wedm_block_annotations: [validRoughBlock()],
    };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(true);
  });

  it("accepts 5-block multi-pass sidecar (rough + 4 skims, descending power)", () => {
    const blocks: WEDMBlockAnnotation[] = [
      validRoughBlock({
        block_id: "OP1_rough", emitted: { ...validRoughBlock().emitted, pass_type: "rough" },
      }),
      validRoughBlock({
        block_id: "OP2_skim1",
        emitted: { ...validRoughBlock().emitted, pass_type: "skim1", on_time_us: 4, off_time_us: 12 },
        physics_basis: "pass_factor_table",
        source_constants: ['PASS_DEFAULTS["skim1"]', "E_PACK_TABLE[12]"],
      }),
      validRoughBlock({
        block_id: "OP3_skim2",
        emitted: { ...validRoughBlock().emitted, pass_type: "skim2", on_time_us: 2, off_time_us: 8 },
        physics_basis: "pass_factor_table",
        source_constants: ['PASS_DEFAULTS["skim2"]', "E_PACK_TABLE[12]"],
      }),
      validRoughBlock({
        block_id: "OP4_skim3",
        emitted: { ...validRoughBlock().emitted, pass_type: "skim3", on_time_us: 1, off_time_us: 6 },
        physics_basis: "pass_factor_table",
        source_constants: ['PASS_DEFAULTS["skim3"]', "E_PACK_TABLE[12]"],
      }),
      validRoughBlock({
        block_id: "OP5_skim4",
        emitted: { ...validRoughBlock().emitted, pass_type: "skim4", on_time_us: 0.5, off_time_us: 5 },
        physics_basis: "pass_factor_table",
        source_constants: ['PASS_DEFAULTS["skim4"]', "E_PACK_TABLE[12]"],
      }),
    ];
    const sidecar = { ...minimalShell, wedm_block_annotations: blocks };
    expect(postPhysicsSidecarSchema.safeParse(sidecar).success).toBe(true);
  });
});
