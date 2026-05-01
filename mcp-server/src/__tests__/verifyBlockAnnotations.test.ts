/**
 * verifyBlockAnnotations tests — MS0/U-PPGM10 (schema 1.1.0).
 *
 * Exercises the per-block S/F gate: G-code parser, annotation cross-ref,
 * tier verdicts, operator_override skip semantics, and the no-annotations
 * sidecar fail-closed posture for shop_floor.
 *
 * NOTE: per project safety rules this file MUST NOT inline kc1_1/Taylor C/
 * tool-modulus literals. The fixture S/F values below are arbitrary
 * positivity-guard values used to drive parser + comparator behavior, not
 * to assert physical correctness.
 */

import { describe, it, expect } from "vitest";

import {
  verifyBlockAnnotations,
  verifyOrThrow,
  type Tier,
} from "../cps/verifyBlockAnnotations.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import { type BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";

const FIXED_OPTS = {
  source_engine_versions: { "src/physics/constants.ts": "abcdef1234567890" },
  generated_at: "2026-04-29T00:00:00.000Z",
};

function block(overrides: Partial<BlockAnnotation> = {}): BlockAnnotation {
  return {
    block_id: "N100",
    op_id: "rough_pocket_1",
    iso_group: "P",
    tool_material: "carbide",
    emitted: {
      vc_mpm: 220,
      fpt_mm: 0.08,
      ap_mm: 2.5,
      ae_mm: 6.0,
      S_rpm: 7000,
      F_mmpm: 1120,
    },
    physics_basis: "kienzle",
    confidence: 0.82,
    safety_margin: 0.9,
    source_constants: ["CANONICAL_KIENZLE.P", "CANONICAL_MILLING_SPEEDS.P"],
    ...overrides,
  };
}

function sidecarWith(blocks: BlockAnnotation[]): Record<string, unknown> {
  return PhysicsSidecarBuilderEngine.buildAndSeal({
    ...FIXED_OPTS,
    block_annotations: blocks,
  }) as unknown as Record<string, unknown>;
}

// ============================================================================
// G-CODE BLOCK PARSER — labels + S/F extraction
// ============================================================================

describe("verifyBlockAnnotations parser — Nxxx + S/F extraction", () => {
  it("extracts S/F from a labelled line and matches a single annotation", () => {
    const sidecar = sidecarWith([block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } })]);
    const gcode = "N100 G1 X10 Y20 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
    expect(r.blocks_with_sf).toBe(1);
    expect(r.mismatches).toEqual([]);
  });

  it("skips lines without an Nxxx label (anonymous blocks)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "G1 X10 S7000 F1120\nN100 G1 X20 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.blocks_with_sf).toBe(1);
    expect(r.verdict).toBe("PASS");
  });

  it("skips labelled lines with no S and no F (nothing to verify)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N100 G0 Z5\nN110 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecarWith([
      block({ block_id: "N110" }),
    ]));
    expect(r.blocks_with_sf).toBe(1);
    void sidecar;
  });

  it("strips parenthesis comments before tokenizing S/F", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N100 G1 X10 (RPM 9999 IGNORED) S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
    expect(r.mismatches).toEqual([]);
  });

  it("accepts decimal F values", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, F_mmpm: 350.5 } }),
    ]);
    const gcode = "N100 G1 X10 S7000 F350.5";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
  });

  it("accepts decimal S values (some controls allow fractional RPM)", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000.5 } }),
    ]);
    const gcode = "N100 G1 X10 S7000.5 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
  });

  it("verifies only S when only S is present on the line", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    // Line emits S only; even if F differs, F is not on this line so not checked.
    const gcode = "N100 M3 S7000";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
  });

  it("verifies only F when only F is present (modal feed change)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N100 G1 X20 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
  });

  it("counts multiple labelled lines independently", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100" }),
      block({ block_id: "N110", emitted: { ...block().emitted, S_rpm: 8000, F_mmpm: 1500 } }),
      block({ block_id: "N120", emitted: { ...block().emitted, S_rpm: 9000, F_mmpm: 2000 } }),
    ]);
    const gcode = [
      "N100 G1 X10 S7000 F1120",
      "N110 G1 X20 S8000 F1500",
      "N120 G1 X30 S9000 F2000",
    ].join("\n");
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.blocks_with_sf).toBe(3);
    expect(r.verdict).toBe("PASS");
  });
});

// ============================================================================
// MISMATCH DETECTION — S/F drift between G-code and annotation
// ============================================================================

describe("verifyBlockAnnotations — S/F mismatch detection", () => {
  it("flags S_mismatch when emitted S differs from annotation", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S6500 F1120"; // S drifted
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches).toHaveLength(1);
    expect(r.mismatches[0].reason).toBe("S_mismatch");
    expect(r.mismatches[0].emitted.S_rpm).toBe(6500);
    expect(r.mismatches[0].expected.S_rpm).toBe(7000);
  });

  it("flags F_mismatch when emitted F differs from annotation", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S7000 F800";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches.some((m) => m.reason === "F_mismatch")).toBe(true);
  });

  it("flags both S and F when both drift on the same line", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S6500 F800";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.mismatches).toHaveLength(2);
    expect(r.mismatches.map((m) => m.reason).sort()).toEqual(["F_mismatch", "S_mismatch"]);
  });

  it("flags missing_annotation when block emits S/F but no annotation has block_id", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N999 G1 X10 S7000 F1120"; // unmatched block_id
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("missing_annotation");
  });

  it("strict equality on F — 1120 vs 1120.0 is identical (parseFloat normalizes)", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S7000 F1120.0";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.verdict).toBe("PASS");
  });

  it("strict equality on F — 1120 vs 1120.5 is mismatch", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S7000 F1120.5";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "production" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("F_mismatch");
  });
});

// ============================================================================
// OPERATOR OVERRIDE — physics chain bypassed by design
// ============================================================================

describe("verifyBlockAnnotations — operator_override semantics", () => {
  it("PASS when annotation is operator_override even if S/F differs (override bypasses physics)", () => {
    const sidecar = sidecarWith([
      block({
        block_id: "N100",
        physics_basis: "operator_override",
        source_constants: [],
        emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 },
      }),
    ]);
    // Even with "wrong" S/F by physics standards, operator_override skips check.
    const gcode = "N100 G1 X10 S5000 F500";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
  });

  it("emits operator_override_skip informational at sim tier", () => {
    const sidecar = sidecarWith([
      block({
        block_id: "N100",
        physics_basis: "operator_override",
        source_constants: [],
      }),
    ]);
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "sim" });
    expect(r.verdict).toBe("PASS");
    expect(r.mismatches.some((m) => m.reason === "operator_override_skip")).toBe(true);
  });

  it("does not emit operator_override_skip at shop_floor (informational suppressed)", () => {
    const sidecar = sidecarWith([
      block({
        block_id: "N100",
        physics_basis: "operator_override",
        source_constants: [],
      }),
    ]);
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.mismatches.every((m) => m.reason !== "operator_override_skip")).toBe(true);
  });
});

// ============================================================================
// NO_BLOCK_ANNOTATIONS — sidecar pre-1.1.0 or omits the field
// ============================================================================

describe("verifyBlockAnnotations — sidecar without block_annotations[]", () => {
  it("HARD_BLOCK on shop_floor when post emits S/F but sidecar has no annotations", () => {
    // v1.0.0-shaped sidecar (no block_annotations field)
    const sidecar = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS) as unknown as Record<string, unknown>;
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("no_block_annotations");
  });

  it("WARN on production when sidecar lacks annotations (production allows but warns)", () => {
    const sidecar = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS) as unknown as Record<string, unknown>;
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "production" });
    expect(r.verdict).toBe("WARN");
  });

  it("WARN at sim tier — explore mode is permissive but reports", () => {
    const sidecar = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS) as unknown as Record<string, unknown>;
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "sim" });
    expect(r.verdict).toBe("WARN");
  });

  it("PASS when sidecar lacks annotations AND post emits no labelled S/F (slim post)", () => {
    const sidecar = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS) as unknown as Record<string, unknown>;
    const gcode = "G0 X10 Y20\nG1 Z-1\n(no labels here)";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
    expect(r.mismatches).toEqual([]);
  });

  it("empty array block_annotations is distinct from missing — still flags missing per block", () => {
    const sidecar = sidecarWith([]);
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    // sidecar HAS block_annotations (just empty). Per-block check fires
    // missing_annotation, not no_block_annotations.
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("missing_annotation");
  });
});

// ============================================================================
// TIER VERDICT POLICY
// ============================================================================

describe("verifyBlockAnnotations — tier-aware verdicts", () => {
  it("sim never HARD_BLOCKs", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S6500 F800"; // both drift
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "sim" });
    expect(r.verdict).toBe("WARN");
  });

  it("proven_out never HARD_BLOCKs", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S6500 F800";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "proven_out" });
    expect(r.verdict).toBe("WARN");
  });

  it("production HARD_BLOCKs on S_mismatch / F_mismatch", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S6500 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "production" });
    expect(r.verdict).toBe("HARD_BLOCK");
  });

  it("production WARNs (does NOT hard-block) on missing_annotation", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N999 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "production" });
    expect(r.verdict).toBe("WARN");
  });

  it("shop_floor HARD_BLOCKs on every mismatch class", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N999 G1 X10 S7000 F1120"; // missing
    const r = verifyBlockAnnotations(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
  });

  it("defaults to shop_floor tier when options omit tier (fail-closed default)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N999 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, sidecar);
    expect(r.tier).toBe("shop_floor");
    expect(r.verdict).toBe("HARD_BLOCK");
  });

  it("rejects unknown tier with explicit error", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    expect(() =>
      verifyBlockAnnotations("N100 G1 S7000 F1120", sidecar, {
        // @ts-expect-error — runtime rejection of unknown tier
        tier: "extreme",
      }),
    ).toThrow(/unknown tier/);
  });
});

// ============================================================================
// verifyOrThrow — convenience for build pipelines
// ============================================================================

describe("verifyOrThrow — pipeline convenience", () => {
  it("returns the result on PASS (no throw)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyOrThrow(gcode, sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
  });

  it("returns the result on WARN (no throw)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N999 G1 X10 S7000 F1120";
    const r = verifyOrThrow(gcode, sidecar, { tier: "proven_out" });
    expect(r.verdict).toBe("WARN");
  });

  it("throws on HARD_BLOCK with the top mismatch lines in the message", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N999 G1 X10 S7000 F1120";
    expect(() => verifyOrThrow(gcode, sidecar, { tier: "shop_floor" })).toThrow(
      /HARD_BLOCK on tier=shop_floor/,
    );
  });

  it("error message names the failing block_id and reason", () => {
    const sidecar = sidecarWith([
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ]);
    const gcode = "N100 G1 X10 S6500 F1120";
    expect(() => verifyOrThrow(gcode, sidecar, { tier: "shop_floor" })).toThrow(
      /N100.*S_mismatch/,
    );
  });
});

// ============================================================================
// FAILURE MODES — invalid inputs
// ============================================================================

describe("verifyBlockAnnotations — invalid inputs", () => {
  it("throws when emittedGcode is not a string", () => {
    const sidecar = sidecarWith([block()]);
    expect(() =>
      // @ts-expect-error — runtime rejection of non-string
      verifyBlockAnnotations(12345, sidecar),
    ).toThrow(/must be a string/);
  });

  it("propagates loader's shape-violation error when block_annotations is not an array", () => {
    const malformed = {
      meta: { schema_version: "1.1.0", sha256: "x".repeat(64) },
      block_annotations: { bad: "shape" },
    } as unknown as Record<string, unknown>;
    expect(() => verifyBlockAnnotations("N100 G1 S7000 F1120", malformed)).toThrow(
      /not an array/,
    );
  });

  it("PASS on empty G-code (nothing to verify)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const r = verifyBlockAnnotations("", sidecar);
    expect(r.verdict).toBe("PASS");
    expect(r.blocks_with_sf).toBe(0);
  });

  it("counts blocks_scanned across all lines (incl. blanks)", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "\n\nN100 G1 X10 S7000 F1120\n\n";
    const r = verifyBlockAnnotations(gcode, sidecar);
    // 5 lines total (incl. trailing newline = empty 5th). Parser counts all
    // for blocks_scanned; blocks_with_sf counts only labelled S/F lines.
    expect(r.blocks_scanned).toBe(5);
    expect(r.blocks_with_sf).toBe(1);
  });

  it("accepts all four tier values without error", () => {
    const sidecar = sidecarWith([block({ block_id: "N100" })]);
    const gcode = "N100 G1 X10 S7000 F1120";
    const tiers: Tier[] = ["sim", "proven_out", "production", "shop_floor"];
    for (let i = 0; i < tiers.length; i++) {
      const r = verifyBlockAnnotations(gcode, sidecar, { tier: tiers[i] });
      expect(r.tier).toBe(tiers[i]);
    }
  });
});
