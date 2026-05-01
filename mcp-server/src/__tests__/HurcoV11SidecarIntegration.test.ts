/**
 * HurcoV11 master post -> sidecar -> verify chain (MS0/U-PPGM13).
 *
 * End-to-end: a master post engine populates block_annotations[] during
 * generateProgram(), the caller passes that array through to
 * PhysicsSidecarBuilderEngine.buildAndSeal, and the build pipeline runs
 * verifyBlockAnnotations against the emitted G-code. This is the
 * integration target Sprint 2 was built for: physics-driven posts that
 * cannot quietly emit S/F values no chain produced.
 *
 * Coverage: 1 happy-path full chain + ≥3 failure modes (drift caught,
 * tamper caught, missing-engine output caught).
 *
 * NOTE: this file MUST NOT inline kc1_1/Taylor C/tool-modulus literals.
 * Operation S/F values below are arbitrary positivity-guard inputs that
 * drive the engine's labelling/annotation pipeline, not physics constants.
 */

import { describe, it, expect } from "vitest";

import {
  HurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import { verifyBlockAnnotations, verifyOrThrow } from "../cps/verifyBlockAnnotations.js";

const FIXED_OPTS = {
  source_engine_versions: { "src/physics/constants.ts": "abcdef1234567890" },
  generated_at: "2026-05-01T19:00:00.000Z",
};

function makeOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12mm 4-flute carbide endmill",
    material_iso: "P",
    spindle_rpm: 4000,
    feed_mm_min: 800,
    axial_depth_mm: 2,
    radial_depth_mm: 6,
    coolant: "flood",
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -2, type: "linear" },
      { x: 50, y: 0, z: -2, type: "linear" },
      { x: 50, y: 50, z: -2, type: "linear" },
      { x: 0, y: 50, z: -2, type: "linear" },
      { x: 0, y: 0, z: 5, type: "rapid" },
    ],
    ...overrides,
  };
}

const engine = new HurcoV11MillMasterPostEngine();

// ============================================================================
// HAPPY PATH — full chain produces shop_floor PASS
// ============================================================================

describe("U-PPGM13 — HurcoV11 → sidecar → verify (happy path)", () => {
  it("single-op program: generateProgram emits Nxxx-labelled block_annotations[1] that gate-PASSes", () => {
    const out = engine.generateProgram([makeOp()], { program_number: 9001 });
    expect(out.block_annotations).toHaveLength(1);
    expect(out.block_annotations[0].block_id).toBe("N100");
    expect(out.block_annotations[0].physics_basis).toBe("kienzle");
    expect(out.block_annotations[0].emitted.S_rpm).toBe(4000);
    expect(out.block_annotations[0].emitted.F_mmpm).toBe(800);

    // Seal the sidecar with the engine's block_annotations
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: out.block_annotations,
    });

    // Run the gate against emitted G-code
    const gcode = out.gcode.join("\n");
    const result = verifyBlockAnnotations(
      gcode,
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(result.verdict).toBe("PASS");
    expect(result.mismatches).toEqual([]);
    expect(result.blocks_with_sf).toBe(1);
  });

  it("3-op program: each operation gets a unique Nxxx-labelled annotation; gate PASSes shop_floor", () => {
    const ops = [
      makeOp({ tool_number: 1, spindle_rpm: 4000, feed_mm_min: 600, material_iso: "P" }),
      makeOp({ tool_number: 2, spindle_rpm: 6000, feed_mm_min: 900, material_iso: "M" }),
      makeOp({ tool_number: 3, spindle_rpm: 8000, feed_mm_min: 1200, material_iso: "N" }),
    ];
    const out = engine.generateProgram(ops, { program_number: 9002 });
    expect(out.block_annotations).toHaveLength(3);
    expect(out.block_annotations.map((b) => b.block_id)).toEqual(["N100", "N110", "N120"]);

    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
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

  it("annotation source_constants reference canonical Kienzle + Taylor (no inlined values)", () => {
    const out = engine.generateProgram([makeOp({ material_iso: "K" })]);
    expect(out.block_annotations[0].source_constants).toEqual([
      "CANONICAL_KIENZLE.K",
      "CANONICAL_TAYLOR.K",
    ]);
  });

  it("annotation emitted carries derived vc and fpt (computed, not inlined)", () => {
    const out = engine.generateProgram([
      makeOp({ tool_diameter_mm: 10, spindle_rpm: 5000, feed_mm_min: 1000, tool_flutes: 2 }),
    ]);
    const ann = out.block_annotations[0];
    // vc = π * D * N / 1000 = π * 10 * 5000 / 1000 ≈ 157.08 m/min
    expect(ann.emitted.vc_mpm).toBeCloseTo((Math.PI * 10 * 5000) / 1000, 5);
    // fpt = F / (N * z) = 1000 / (5000 * 2) = 0.1 mm
    expect(ann.emitted.fpt_mm).toBeCloseTo(0.1, 5);
    expect(ann.emitted.ap_mm).toBe(2);
    expect(ann.emitted.ae_mm).toBe(6);
  });

  it("emitted G-code embeds Nxxx label so the gate's parser can join annotation by block_id", () => {
    const out = engine.generateProgram([makeOp()]);
    const gcode = out.gcode.join("\n");
    expect(gcode).toMatch(/^N100 S4000 M03 F800/m);
  });
});

// ============================================================================
// FAILURE MODES — gate catches drift / tamper / missing chain
// ============================================================================

describe("U-PPGM13 — failure mode catches", () => {
  it("manual S drift in emitted G-code is caught by the gate (HARD_BLOCK shop_floor)", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 4000 })]);
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: out.block_annotations,
    });
    // Simulate an operator hand-edit: bump S on the labelled line
    const tamperedGcode = out.gcode
      .join("\n")
      .replace("N100 S4000", "N100 S3500");
    expect(() =>
      verifyOrThrow(tamperedGcode, sealed as unknown as Record<string, unknown>, {
        tier: "shop_floor",
      }),
    ).toThrow(/HARD_BLOCK/);
  });

  it("manual F drift in emitted G-code is caught by the gate", () => {
    const out = engine.generateProgram([makeOp({ feed_mm_min: 800 })]);
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: out.block_annotations,
    });
    const tamperedGcode = out.gcode.join("\n").replace("F800", "F500");
    const r = verifyBlockAnnotations(
      tamperedGcode,
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches.some((m) => m.reason === "F_mismatch")).toBe(true);
  });

  it("sidecar SHA tamper caught by builder.verify before gate even runs", () => {
    const out = engine.generateProgram([makeOp()]);
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: out.block_annotations,
    });
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(true);
    sealed.block_annotations![0].emitted.S_rpm = sealed.block_annotations![0].emitted.S_rpm + 1;
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(false);
  });

  it("forgetting to pass block_annotations to buildAndSeal yields no_block_annotations HARD_BLOCK", () => {
    const out = engine.generateProgram([makeOp()]);
    // Caller "forgets" to pass block_annotations through — the engine emits
    // labelled S/F lines, but the sidecar has no telemetry.
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({ ...FIXED_OPTS });
    const r = verifyBlockAnnotations(
      out.gcode.join("\n"),
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("no_block_annotations");
  });
});
