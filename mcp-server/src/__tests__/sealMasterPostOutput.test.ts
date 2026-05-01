/**
 * sealMasterPostOutput tests — MS0/U-PPGM15 dispatcher-side helper.
 *
 * The helper bridges a master-post engine's generateProgram() output
 * to the sealed sidecar + (optional) gate verdict expected by physics-
 * driven dispatcher callers. This test exercises:
 *   - Happy path: output threaded through with sidecar + verify result
 *   - Optional verify: skipped when verify_tier omitted; runs when set
 *   - All four tier values produce coherent verdicts
 *   - SHA seal includes block_annotations (tamper of returned sidecar
 *     invalidates verify())
 *   - Failure modes: null / non-object / missing-array engineOutput,
 *     missing source_engine_versions
 *
 * Per project safety rules this file MUST NOT inline kc1_1/Taylor C/
 * tool-modulus literals. Fixture S/F values below are arbitrary
 * positivity-guard inputs that drive the helper's behavior, not
 * physics constants.
 */

import { describe, it, expect } from "vitest";

import { sealMasterPostOutput } from "../cps/sealMasterPostOutput.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import { type BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";

const FIXED_OPTS = {
  source_engine_versions: { "TestEngine": "1.0.0" },
  generated_at: "2026-05-01T20:00:00.000Z",
};

function makeBlock(overrides: Partial<BlockAnnotation> = {}): BlockAnnotation {
  return {
    block_id: "N100",
    op_id: "test_op",
    iso_group: "P",
    tool_material: "carbide",
    emitted: {
      vc_mpm: 220,
      ap_mm: 2,
      S_rpm: 4000,
      F_mmpm: 800,
    },
    physics_basis: "kienzle",
    confidence: 0.85,
    safety_margin: 0.9,
    source_constants: ["CANONICAL_KIENZLE.P"],
    ...overrides,
  };
}

function makeOutput(
  overrides: Partial<{ gcode: string[]; block_annotations: BlockAnnotation[] }> = {},
) {
  return {
    gcode: ["O1000 (TEST)", "N100 G1 X10 S4000 M03 F800", "M30"],
    block_annotations: [makeBlock()],
    ...overrides,
  };
}

// ============================================================================
// HAPPY PATH
// ============================================================================

describe("sealMasterPostOutput — happy path", () => {
  it("returns engine_output verbatim, sealed sidecar with block_annotations, no verify by default", () => {
    const out = makeOutput();
    const r = sealMasterPostOutput(out, FIXED_OPTS);
    expect(r.engine_output).toBe(out);
    expect(r.sidecar.meta.schema_version).toBe("1.1.0");
    expect(r.sidecar.block_annotations).toHaveLength(1);
    expect(r.sidecar.block_annotations?.[0].block_id).toBe("N100");
    // Verify field is genuinely absent (not just undefined-valued) when
    // verify_tier was omitted from opts.
    expect(r).not.toHaveProperty("verify");
  });

  it("sealed sidecar includes block_annotations in SHA — tamper invalidates verify()", () => {
    const r = sealMasterPostOutput(makeOutput(), FIXED_OPTS);
    expect(PhysicsSidecarBuilderEngine.verify(r.sidecar).ok).toBe(true);
    const blocks = r.sidecar.block_annotations;
    if (!blocks) throw new Error("expected block_annotations on sealed sidecar");
    blocks[0].emitted.S_rpm = blocks[0].emitted.S_rpm + 1;
    expect(PhysicsSidecarBuilderEngine.verify(r.sidecar).ok).toBe(false);
  });

  it("seals an empty block_annotations array when engine output has none", () => {
    const r = sealMasterPostOutput(makeOutput({ block_annotations: [] }), FIXED_OPTS);
    expect(r.sidecar.block_annotations).toEqual([]);
  });

  it("threads multiple block_annotations through the seal", () => {
    const blocks = [
      makeBlock({ block_id: "N100", op_id: "op_1" }),
      makeBlock({ block_id: "N110", op_id: "op_2" }),
      makeBlock({ block_id: "N120", op_id: "op_3" }),
    ];
    const r = sealMasterPostOutput(makeOutput({ block_annotations: blocks }), FIXED_OPTS);
    expect(r.sidecar.block_annotations).toHaveLength(3);
    expect(r.sidecar.block_annotations?.map((b) => b.block_id)).toEqual([
      "N100",
      "N110",
      "N120",
    ]);
  });
});

// ============================================================================
// OPTIONAL VERIFY — gate runs when tier provided
// ============================================================================

describe("sealMasterPostOutput — verify_tier opt-in", () => {
  it("runs gate at shop_floor when verify_tier set and emitted G-code matches annotations", () => {
    const r = sealMasterPostOutput(makeOutput(), {
      ...FIXED_OPTS,
      verify_tier: "shop_floor",
    });
    expect(r.verify?.verdict).toBe("PASS");
    expect(r.verify?.tier).toBe("shop_floor");
    expect(r.verify?.blocks_with_sf).toBe(1);
  });

  it("verify HARD_BLOCKs at shop_floor when emitted S drifts from annotation", () => {
    const out = makeOutput({
      gcode: ["O1000", "N100 G1 X10 S3500 M03 F800", "M30"], // S drifted 4000->3500
    });
    const r = sealMasterPostOutput(out, { ...FIXED_OPTS, verify_tier: "shop_floor" });
    expect(r.verify?.verdict).toBe("HARD_BLOCK");
    expect(r.verify?.mismatches.some((m) => m.reason === "S_mismatch")).toBe(true);
  });

  it("verify reports WARN at proven_out when same S drift occurs", () => {
    const out = makeOutput({
      gcode: ["O1000", "N100 G1 X10 S3500 M03 F800", "M30"],
    });
    const r = sealMasterPostOutput(out, { ...FIXED_OPTS, verify_tier: "proven_out" });
    expect(r.verify?.verdict).toBe("WARN");
  });

  it("verify reports WARN at sim tier on missing annotation", () => {
    const out = makeOutput({
      gcode: ["O1000", "N999 G1 X10 S4000 M03 F800", "M30"],
      block_annotations: [makeBlock({ block_id: "N100" })],
    });
    const r = sealMasterPostOutput(out, { ...FIXED_OPTS, verify_tier: "sim" });
    expect(r.verify?.verdict).toBe("WARN");
  });

  it("explicit sim tier yields PASS verdict and tier=sim on the result", () => {
    const r = sealMasterPostOutput(makeOutput(), { ...FIXED_OPTS, verify_tier: "sim" });
    expect(r.verify?.tier).toBe("sim");
    expect(r.verify?.verdict).toBe("PASS");
  });

  it("explicit proven_out tier yields PASS verdict and tier=proven_out", () => {
    const r = sealMasterPostOutput(makeOutput(), { ...FIXED_OPTS, verify_tier: "proven_out" });
    expect(r.verify?.tier).toBe("proven_out");
    expect(r.verify?.verdict).toBe("PASS");
  });

  it("explicit production tier yields PASS verdict and tier=production", () => {
    const r = sealMasterPostOutput(makeOutput(), { ...FIXED_OPTS, verify_tier: "production" });
    expect(r.verify?.tier).toBe("production");
    expect(r.verify?.verdict).toBe("PASS");
  });

  it("explicit shop_floor tier yields PASS verdict and tier=shop_floor", () => {
    const r = sealMasterPostOutput(makeOutput(), { ...FIXED_OPTS, verify_tier: "shop_floor" });
    expect(r.verify?.tier).toBe("shop_floor");
    expect(r.verify?.verdict).toBe("PASS");
  });
});

// ============================================================================
// FAILURE MODES — invalid inputs
// ============================================================================

describe("sealMasterPostOutput — invalid inputs", () => {
  it("throws on null engineOutput", () => {
    expect(() =>
      // @ts-expect-error — runtime rejection of null
      sealMasterPostOutput(null, FIXED_OPTS),
    ).toThrow(/non-null object/);
  });

  it("throws on undefined engineOutput", () => {
    expect(() =>
      // @ts-expect-error — runtime rejection of undefined
      sealMasterPostOutput(undefined, FIXED_OPTS),
    ).toThrow(/non-null object/);
  });

  it("throws when gcode is not an array", () => {
    expect(() =>
      sealMasterPostOutput(
        // @ts-expect-error — gcode wrong shape
        { gcode: "not-an-array", block_annotations: [] },
        FIXED_OPTS,
      ),
    ).toThrow(/gcode must be an array/);
  });

  it("throws when block_annotations is missing", () => {
    expect(() =>
      sealMasterPostOutput(
        // @ts-expect-error — missing field
        { gcode: ["x"] },
        FIXED_OPTS,
      ),
    ).toThrow(/block_annotations must be an array/);
  });

  it("throws when block_annotations is not an array", () => {
    expect(() =>
      sealMasterPostOutput(
        // @ts-expect-error — wrong shape
        { gcode: ["x"], block_annotations: { bad: "shape" } },
        FIXED_OPTS,
      ),
    ).toThrow(/block_annotations must be an array/);
  });

  it("throws when opts is missing", () => {
    expect(() =>
      // @ts-expect-error — missing opts
      sealMasterPostOutput(makeOutput()),
    ).toThrow(/opts is required/);
  });

  it("throws when source_engine_versions is missing", () => {
    expect(() =>
      // @ts-expect-error — missing required key
      sealMasterPostOutput(makeOutput(), { generated_at: FIXED_OPTS.generated_at }),
    ).toThrow(/source_engine_versions/);
  });

  it("propagates schema rejection from buildAndSeal (duplicate block_id)", () => {
    const out = makeOutput({
      block_annotations: [
        makeBlock({ block_id: "N100" }),
        makeBlock({ block_id: "N100", op_id: "duplicate" }),
      ],
    });
    expect(() => sealMasterPostOutput(out, FIXED_OPTS)).toThrow(/duplicate block_id/);
  });

  it("propagates schema rejection for operator_override invariant", () => {
    const out = makeOutput({
      block_annotations: [
        makeBlock({
          physics_basis: "operator_override",
          source_constants: ["CANONICAL_KIENZLE.P"], // INVALID: override + non-empty
        }),
      ],
    });
    expect(() => sealMasterPostOutput(out, FIXED_OPTS)).toThrow(/operator_override/);
  });
});
