/**
 * OkumaOSPMillMasterPostEngine — sidecar + verify chain integration.
 *
 * Mirrors HurcoV11SidecarIntegration / OkumaB250LatheMasterPostEngine.
 * SidecarIntegration: exercises the full post → sidecar → tier-gate path
 * for the new OSP-P*M mill engine (PPG-WIRE-MS5/U-PPGW-OkumaMill).
 *
 * Coverage:
 *   - Single-op happy path: N100-labelled annotation, gate PASS
 *   - 3-op program: N100/N110/N120 progression, all PASS
 *   - All four tier verdicts (sim / proven_out / production / shop_floor)
 *     on clean input
 *   - shop_floor HARD_BLOCK on emitted-S drift; proven_out demotes to WARN
 *   - SHA tamper of returned sidecar invalidates verify()
 *   - sealMasterPostOutput end-to-end (engine_output + sidecar + verify)
 *   - P500 + Super-NURBS path emits the bracket and still verifies clean
 *   - Empty operations array emits sealed sidecar with empty annotations
 *
 * NOTE: per project safety rules this file MUST NOT inline kc1_1 / Taylor C /
 * tool-modulus literals. Fixture S/F values below are arbitrary positivity-
 * guard inputs that drive the engine's labelling and gate behaviour, not
 * physics constants.
 */

import { describe, it, expect } from "vitest";

import {
  OkumaOSPMillMasterPostEngine,
  type MillOperation,
  type OkumaOSPMillPostConfig,
} from "../engines/OkumaOSPMillMasterPostEngine.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import { verifyBlockAnnotations, verifyOrThrow } from "../cps/verifyBlockAnnotations.js";
import { sealMasterPostOutput } from "../cps/sealMasterPostOutput.js";

const FIXED_SEAL_OPTS = {
  source_engine_versions: { OkumaOSPMillMasterPostEngine: "1.0.0" },
  generated_at: "2026-05-01T20:00:00.000Z",
};

const engine = new OkumaOSPMillMasterPostEngine();

function makeOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12mm carbide endmill",
    material_iso: "P",
    spindle_rpm: 4000,
    feed_mm_min: 800,
    axial_depth_mm: 2.0,
    radial_depth_mm: 6.0,
    coolant: "flood",
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -2, type: "linear" },
      { x: 50, y: 0, z: -2, type: "linear" },
      { x: 0, y: 0, z: 5, type: "rapid" },
    ],
    ...overrides,
  };
}

function makeCfg(overrides: Partial<OkumaOSPMillPostConfig> = {}): OkumaOSPMillPostConfig {
  return { program_number: 1234, osp_family: "P300", ...overrides };
}

// ============================================================================
// HAPPY PATH — single-op, multi-op, all 4 tiers
// ============================================================================

describe("OkumaOSPMill → sidecar → verify (happy path)", () => {
  it("single op: N100-labelled annotation, gate PASS at shop_floor", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    expect(out.block_annotations).toHaveLength(1);
    const ann = out.block_annotations[0];
    expect(ann.block_id).toBe("N100");
    expect(ann.physics_basis).toBe("kienzle");
    expect(ann.emitted.S_rpm).toBe(4000);
    expect(ann.emitted.F_mmpm).toBe(800);

    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });

    const result = verifyBlockAnnotations(
      out.gcode.join("\n"),
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(result.verdict).toBe("PASS");
    expect(result.mismatches).toEqual([]);
  });

  it("3-op program: N100/N110/N120 progression, all PASS at shop_floor", () => {
    const ops = [
      makeOp({ tool_number: 1, spindle_rpm: 4000, feed_mm_min: 800 }),
      makeOp({ tool_number: 2, spindle_rpm: 5000, feed_mm_min: 1000, material_iso: "M" }),
      makeOp({ tool_number: 3, spindle_rpm: 6000, feed_mm_min: 1200, material_iso: "K" }),
    ];
    const out = engine.generateProgram(ops, makeCfg());
    expect(out.block_annotations).toHaveLength(3);
    expect(out.block_annotations.map((b) => b.block_id)).toEqual(["N100", "N110", "N120"]);

    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });
    const result = verifyOrThrow(
      out.gcode.join("\n"),
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(result.verdict).toBe("PASS");
    expect(result.blocks_with_sf).toBe(3);
  });

  it("emitted G-code embeds the N100 label on the spindle-start line", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 4000, feed_mm_min: 800 })], makeCfg());
    const gcode = out.gcode.join("\n");
    expect(gcode).toMatch(/^N100 S4000 M3 F800/m);
  });

  it("clean program PASSes at all four tiers", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });
    const tiers = ["sim", "proven_out", "production", "shop_floor"] as const;
    for (const tier of tiers) {
      const r = verifyBlockAnnotations(
        out.gcode.join("\n"),
        sealed as unknown as Record<string, unknown>,
        { tier },
      );
      expect(r.verdict).toBe("PASS");
      expect(r.tier).toBe(tier);
    }
  });
});

// ============================================================================
// FAILURE MODES — drift, tamper, schema reject, SHA invalidation
// ============================================================================

describe("OkumaOSPMill — failure mode catches", () => {
  it("manual S drift in emitted G-code is HARD_BLOCKed at shop_floor", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 4000 })], makeCfg());
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });
    const tampered = out.gcode.join("\n").replace("N100 S4000", "N100 S3500");
    expect(() =>
      verifyOrThrow(tampered, sealed as unknown as Record<string, unknown>, {
        tier: "shop_floor",
      }),
    ).toThrow(/HARD_BLOCK/);
  });

  it("manual F drift is HARD_BLOCKed at shop_floor", () => {
    const out = engine.generateProgram(
      [makeOp({ spindle_rpm: 4000, feed_mm_min: 800 })],
      makeCfg(),
    );
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });
    const tampered = out.gcode
      .join("\n")
      .replace("N100 S4000 M3 F800", "N100 S4000 M3 F600");
    const r = verifyBlockAnnotations(
      tampered,
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches.some((m) => m.reason === "F_mismatch")).toBe(true);
  });

  it("S drift demotes to WARN at proven_out tier", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 4000 })], makeCfg());
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });
    const tampered = out.gcode.join("\n").replace("N100 S4000", "N100 S3500");
    const r = verifyBlockAnnotations(
      tampered,
      sealed as unknown as Record<string, unknown>,
      { tier: "proven_out" },
    );
    expect(r.verdict).toBe("WARN");
  });

  it("SHA tamper of returned sidecar invalidates PhysicsSidecarBuilderEngine.verify()", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_SEAL_OPTS,
      block_annotations: out.block_annotations,
    });
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(true);
    // Mutating a single annotation breaks the SHA seal
    const blocks = sealed.block_annotations;
    if (!blocks) throw new Error("expected block_annotations on sealed sidecar");
    blocks[0].emitted.S_rpm = blocks[0].emitted.S_rpm + 1;
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(false);
  });
});

// ============================================================================
// sealMasterPostOutput END-TO-END — single-call dispatcher path
// ============================================================================

describe("OkumaOSPMill → sealMasterPostOutput (dispatcher contract)", () => {
  it("returns engine_output + sealed sidecar + verify result when verify_tier set", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    const sealed = sealMasterPostOutput(out, {
      ...FIXED_SEAL_OPTS,
      verify_tier: "shop_floor",
    });
    expect(sealed.engine_output).toBe(out);
    expect(sealed.sidecar.block_annotations).toHaveLength(1);
    expect(sealed.verify?.verdict).toBe("PASS");
    expect(sealed.verify?.tier).toBe("shop_floor");
  });

  it("omits verify field when verify_tier is not provided", () => {
    const out = engine.generateProgram([makeOp()], makeCfg());
    const sealed = sealMasterPostOutput(out, FIXED_SEAL_OPTS);
    expect(sealed.sidecar.block_annotations).toHaveLength(1);
    expect(sealed).not.toHaveProperty("verify");
  });

  it("seals an empty block_annotations array when given zero operations", () => {
    const out = engine.generateProgram([], makeCfg());
    expect(out.block_annotations).toHaveLength(0);
    const sealed = sealMasterPostOutput(out, {
      ...FIXED_SEAL_OPTS,
      verify_tier: "production",
    });
    expect(sealed.sidecar.block_annotations).toEqual([]);
    // Empty annotations + no labelled blocks → gate PASSes (nothing to verify)
    expect(sealed.verify?.verdict).toBe("PASS");
    expect(sealed.verify?.blocks_with_sf).toBe(0);
  });
});

// ============================================================================
// P500 PATH — Super-NURBS bracket emitted; chain still verifies clean
// ============================================================================

describe("OkumaOSPMill — P500 Super-NURBS path", () => {
  it("P500 + use_super_nurbs: G05.1 Q1/Q0 bracket present and gate still PASSes", () => {
    const out = engine.generateProgram(
      [makeOp({ operation_type: "3d_surface" })],
      makeCfg({ osp_family: "P500", use_super_nurbs: true }),
    );
    const gcode = out.gcode.join("\n");
    expect(gcode).toContain("G05.1 Q1");
    expect(gcode).toContain("G05.1 Q0");

    const sealed = sealMasterPostOutput(out, {
      ...FIXED_SEAL_OPTS,
      verify_tier: "shop_floor",
    });
    expect(sealed.verify?.verdict).toBe("PASS");
  });
});
