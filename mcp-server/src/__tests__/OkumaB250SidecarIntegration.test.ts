/**
 * OkumaB250 master post -> sidecar -> verify chain (MS0/U-PPGM14).
 *
 * Mirrors HurcoV11SidecarIntegration.test.ts but for the lathe engine.
 * Lathe-specific concerns:
 *
 *   - G97 (fixed RPM) ops are annotated; G96 (CSS) ops bypass the gate
 *     because CSS dynamically varies RPM with workpiece diameter — there
 *     is no fixed S to verify (anonymous-block rule applies).
 *   - block_ids start at N9000 to avoid collision with G72/G73 contour
 *     labels (N100/N200 are reserved by the canned-cycle declarations).
 *   - Per-rev feed (mm/rev, F0.25) is recorded in annotation.emitted.F_mmpm
 *     as the equivalent linear feed (F_mmpm = feed_mm_rev * spindle_rpm)
 *     for downstream consumers, but the gate label is on the G97 line
 *     which carries only S — so only S is gate-verified per op. F-on-rev
 *     verification is a separate schema-extension concern.
 *
 * Coverage: 1 happy-path full chain + ≥3 failure modes + 1 G96 bypass
 * confirmation.
 *
 * NOTE: per project safety rules this file MUST NOT inline kc1_1/Taylor C/
 * tool-modulus literals. Operation S/F values below are arbitrary
 * positivity-guard inputs that drive the engine's labelling/annotation
 * pipeline, not physics constants.
 */

import { describe, it, expect } from "vitest";

import {
  OkumaB250LatheMasterPostEngine,
  type TurningOperation,
} from "../engines/OkumaB250LatheMasterPostEngine.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import { verifyBlockAnnotations, verifyOrThrow } from "../cps/verifyBlockAnnotations.js";

const FIXED_OPTS = {
  source_engine_versions: { "src/physics/constants.ts": "abcdef1234567890" },
  generated_at: "2026-05-01T19:30:00.000Z",
};

function makeOp(overrides: Partial<TurningOperation> = {}): TurningOperation {
  return {
    operation_type: "od_rough",
    tool_number: 1,
    tool_orientation: 3,
    insert_radius_mm: 0.4,
    tool_description: "CNMG roughing insert",
    material_iso: "P",
    spindle_rpm: 2000,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2.0,
    start_x: 50,
    start_z: 0,
    end_x: 30,
    end_z: -50,
    coolant: "flood",
    ...overrides,
  };
}

const engine = new OkumaB250LatheMasterPostEngine();

// ============================================================================
// HAPPY PATH — G97 ops produce N9000-labelled annotations, gate PASSes
// ============================================================================

describe("U-PPGM14 — OkumaB250 → sidecar → verify (G97 happy path)", () => {
  it("single G97 op: N9000-labelled annotation, gate PASS at shop_floor", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 2000 })], {
      program_number: 9001,
      use_css: false,
    });
    expect(out.block_annotations).toHaveLength(1);
    const ann = out.block_annotations[0];
    expect(ann.block_id).toBe("N9000");
    expect(ann.physics_basis).toBe("kienzle");
    expect(ann.emitted.S_rpm).toBe(2000);
    expect(ann.emitted.fn_mmrev).toBe(0.25);
    expect(ann.emitted.F_mmpm).toBe(2000 * 0.25);

    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
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

  it("3-op G97 program: unique N9000/N9010/N9020 block_ids, all PASS", () => {
    // Note: generateFacingPass lacks a G97 fallback when cfg.use_css=false
    // (pre-existing engine gap, separate from U-PPGM14). Test uses op-types
    // that all have G97 fallback paths: od_rough, od_finish, id_rough.
    const ops = [
      makeOp({ tool_number: 1, spindle_rpm: 2000, operation_type: "od_rough" }),
      makeOp({
        tool_number: 2,
        spindle_rpm: 2500,
        operation_type: "od_finish",
        material_iso: "M",
        feed_mm_rev: 0.15,
      }),
      makeOp({
        tool_number: 3,
        spindle_rpm: 1500,
        operation_type: "id_rough",
        material_iso: "K",
        feed_mm_rev: 0.30,
      }),
    ];
    const out = engine.generateProgram(ops, { program_number: 9002, use_css: false });
    expect(out.block_annotations).toHaveLength(3);
    expect(out.block_annotations.map((b) => b.block_id)).toEqual([
      "N9000",
      "N9010",
      "N9020",
    ]);

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
  });

  it("annotation source_constants reference Kienzle + Taylor + turning S/F by ISO group", () => {
    const out = engine.generateProgram(
      [makeOp({ spindle_rpm: 2000, material_iso: "K" })],
      { use_css: false },
    );
    expect(out.block_annotations[0].source_constants).toEqual([
      "CANONICAL_KIENZLE.K",
      "CANONICAL_TAYLOR.K",
      "CANONICAL_TURNING_SPEEDS.K",
      "CANONICAL_TURNING_FEEDS.K",
    ]);
  });

  it("emitted vc_mpm is derived from average diameter (start_x + end_x)/2 and spindle_rpm", () => {
    // start=50, end=30 → avg D = 40 mm; vc = π * 40 * 2000 / 1000 ≈ 251.33 m/min
    const out = engine.generateProgram(
      [makeOp({ start_x: 50, end_x: 30, spindle_rpm: 2000 })],
      { use_css: false },
    );
    expect(out.block_annotations[0].emitted.vc_mpm).toBeCloseTo(
      (Math.PI * 40 * 2000) / 1000,
      5,
    );
  });

  it("emitted G-code embeds the N9000 label on the G97 spindle line", () => {
    const out = engine.generateProgram([makeOp()], { use_css: false });
    const gcode = out.gcode.join("\n");
    expect(gcode).toMatch(/^N9000 G97 S2000 M03/m);
  });
});

// ============================================================================
// G96 (CSS) BYPASS — no annotation; gate skips anonymous lines
// ============================================================================

describe("U-PPGM14 — G96 CSS ops bypass annotation (dynamic RPM)", () => {
  it("G96 op produces zero annotations; gate PASS (anonymous-block skip)", () => {
    const out = engine.generateProgram(
      [
        makeOp({
          spindle_rpm: undefined,
          css_m_min: 250,
          css_max_rpm: 3500,
        }),
      ],
      { use_css: true },
    );
    expect(out.block_annotations).toHaveLength(0);

    // Even with no annotations, the sidecar can still seal and the gate
    // PASSes at production tier (no labelled S/F lines, nothing to verify).
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [],
    });
    const result = verifyBlockAnnotations(
      out.gcode.join("\n"),
      sealed as unknown as Record<string, unknown>,
      { tier: "production" },
    );
    expect(result.verdict).toBe("PASS");
    expect(result.blocks_with_sf).toBe(0);
  });

  it("mixed G97 + G96 program: only G97 op produces an annotation", () => {
    const out = engine.generateProgram(
      [
        makeOp({ tool_number: 1, spindle_rpm: 2000 }),
        // Second op has no spindle_rpm so it falls through to G96 if cfg.use_css,
        // OR emits no spindle line at all if cfg.use_css=false. With use_css=false
        // and no spindle_rpm set, the engine emits no G97 line — no annotation.
        makeOp({ tool_number: 2, spindle_rpm: undefined, css_m_min: 200 }),
      ],
      { use_css: false },
    );
    // Only the G97 op (op_1) annotated; op_2 has no spindle_rpm → skipped.
    expect(out.block_annotations).toHaveLength(1);
    expect(out.block_annotations[0].block_id).toBe("N9000");
    expect(out.block_annotations[0].op_id).toMatch(/^op_1_/);
  });
});

// ============================================================================
// FAILURE MODES — gate catches drift / tamper / missing chain
// ============================================================================

describe("U-PPGM14 — failure mode catches", () => {
  it("manual S drift in emitted G-code is HARD_BLOCKed at shop_floor", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 2000 })], {
      use_css: false,
    });
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: out.block_annotations,
    });
    const tampered = out.gcode
      .join("\n")
      .replace("N9000 G97 S2000", "N9000 G97 S1500");
    expect(() =>
      verifyOrThrow(tampered, sealed as unknown as Record<string, unknown>, {
        tier: "shop_floor",
      }),
    ).toThrow(/HARD_BLOCK/);
  });

  it("forgetting to pass block_annotations yields no_block_annotations HARD_BLOCK", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 2000 })], {
      use_css: false,
    });
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({ ...FIXED_OPTS });
    const result = verifyBlockAnnotations(
      out.gcode.join("\n"),
      sealed as unknown as Record<string, unknown>,
      { tier: "shop_floor" },
    );
    expect(result.verdict).toBe("HARD_BLOCK");
    expect(result.mismatches[0].reason).toBe("no_block_annotations");
  });

  it("sidecar SHA tamper detected by builder.verify before gate runs", () => {
    const out = engine.generateProgram([makeOp({ spindle_rpm: 2000 })], {
      use_css: false,
    });
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: out.block_annotations,
    });
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(true);
    sealed.block_annotations![0].emitted.S_rpm =
      sealed.block_annotations![0].emitted.S_rpm + 1;
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(false);
  });
});
