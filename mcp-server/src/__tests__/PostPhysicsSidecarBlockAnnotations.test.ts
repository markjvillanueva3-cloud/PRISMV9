/**
 * PostPhysicsSidecar — block_annotations[] (MS0/U-PPGM07 + U-PPGM08, schema 1.1.0).
 *
 * Schema: optional per-block S/F annotations array; entries carry the
 * physics chain that produced the emitted values + the canonical-constant
 * references that drove them. Operator overrides bypass physics so their
 * source_constants must be empty.
 *
 * Builder: threads block_annotations through buildAndSeal, includes them in
 * the SHA seal so any post-emit tamper invalidates verify().
 *
 * Coverage budget: schema acceptance (1) + schema rejection edge cases (≥6)
 * + builder integration (≥3) + SHA-tamper detection (≥2). Plus the
 * 1.1.0-bump back-compat case.
 *
 * NOTE: Per project safety rules this file MUST NOT inline kc1_1 / Taylor C
 * / tool-modulus literals. The fixture S/F values below are not physics
 * constants — they are arbitrary positive numbers chosen to exercise schema
 * validation, not to assert any physical correctness.
 */

import { describe, it, expect } from "vitest";

import {
  postPhysicsSidecarSchema,
  parseSidecarSafe,
  parseSidecarStrict,
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  blockAnnotationSchema,
  type BlockAnnotation,
  type PostPhysicsSidecar,
} from "../schemas/postPhysicsSidecarSchema.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";

// ----------------------------------------------------------------------------
// FIXTURES — non-physics values; chosen only to satisfy positivity guards.
// ----------------------------------------------------------------------------

const FIXED_GENERATED_AT = "2026-05-01T12:00:00.000Z";
const FIXED_VERSIONS = { "test-runner": "1.0.0" };

function validBlock(overrides: Partial<BlockAnnotation> = {}): BlockAnnotation {
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

// ============================================================================
// SCHEMA — block_annotations entry-level validation
// ============================================================================

describe("blockAnnotationSchema (U-PPGM07) — entry-level validation", () => {
  it("accepts a well-formed kienzle-derived block", () => {
    const r = blockAnnotationSchema.safeParse(validBlock());
    expect(r.success).toBe(true);
  });

  it("accepts an operator_override block at entry-level (cross-field rule is array-level)", () => {
    const r = blockAnnotationSchema.safeParse(
      validBlock({ physics_basis: "operator_override", source_constants: [] }),
    );
    expect(r.success).toBe(true);
  });

  it("rejects empty block_id", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ block_id: "" }));
    expect(r.success).toBe(false);
  });

  it("rejects empty op_id", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ op_id: "" }));
    expect(r.success).toBe(false);
  });

  it("rejects unknown iso_group", () => {
    const r = blockAnnotationSchema.safeParse(
      // @ts-expect-error — testing runtime rejection of bad enum
      validBlock({ iso_group: "Z" }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects negative S_rpm", () => {
    const r = blockAnnotationSchema.safeParse(
      validBlock({ emitted: { ...validBlock().emitted, S_rpm: -10 } }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects zero F_mmpm", () => {
    const r = blockAnnotationSchema.safeParse(
      validBlock({ emitted: { ...validBlock().emitted, F_mmpm: 0 } }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects NaN vc_mpm", () => {
    const r = blockAnnotationSchema.safeParse(
      validBlock({ emitted: { ...validBlock().emitted, vc_mpm: NaN } }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects Infinity in emitted block", () => {
    const r = blockAnnotationSchema.safeParse(
      validBlock({ emitted: { ...validBlock().emitted, S_rpm: Number.POSITIVE_INFINITY } }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects confidence above 1", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ confidence: 1.01 }));
    expect(r.success).toBe(false);
  });

  it("rejects confidence below 0", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ confidence: -0.01 }));
    expect(r.success).toBe(false);
  });

  it("accepts confidence boundaries 0 and 1", () => {
    expect(blockAnnotationSchema.safeParse(validBlock({ confidence: 0 })).success).toBe(true);
    expect(blockAnnotationSchema.safeParse(validBlock({ confidence: 1 })).success).toBe(true);
  });

  it("rejects safety_margin = 0", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ safety_margin: 0 }));
    expect(r.success).toBe(false);
  });

  it("rejects safety_margin > 1.5 (upstream-bug guard)", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ safety_margin: 1.51 }));
    expect(r.success).toBe(false);
  });

  it("accepts safety_margin = 1.5 boundary", () => {
    const r = blockAnnotationSchema.safeParse(validBlock({ safety_margin: 1.5 }));
    expect(r.success).toBe(true);
  });
});

// ============================================================================
// SCHEMA — array-level superRefine invariants
// ============================================================================

describe("blockAnnotations[] superRefine (U-PPGM07) — array-level invariants", () => {
  function buildShellWithBlocks(blocks: BlockAnnotation[]): PostPhysicsSidecar {
    return PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
  }

  it("accepts undefined block_annotations (back-compat with 1.0.0)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });
    expect(sealed).not.toHaveProperty("block_annotations");
    expect(parseSidecarSafe(sealed).ok).toBe(true);
  });

  it("accepts an empty block_annotations array", () => {
    const sealed = buildShellWithBlocks([]);
    expect(sealed.block_annotations).toEqual([]);
  });

  it("accepts multiple unique-block_id entries", () => {
    const sealed = buildShellWithBlocks([
      validBlock({ block_id: "N100" }),
      validBlock({ block_id: "N110" }),
      validBlock({ block_id: "N120" }),
    ]);
    expect(sealed.block_annotations).toHaveLength(3);
    expect(sealed.block_annotations!.map((b) => b.block_id)).toEqual(["N100", "N110", "N120"]);
  });

  it("rejects duplicate block_id within the same sidecar", () => {
    const dup = () => buildShellWithBlocks([
      validBlock({ block_id: "N100" }),
      validBlock({ block_id: "N100", op_id: "rough_pocket_2" }),
    ]);
    expect(dup).toThrow(/duplicate block_id/);
  });

  it("rejects operator_override with non-empty source_constants", () => {
    const bad = () => buildShellWithBlocks([
      validBlock({
        physics_basis: "operator_override",
        source_constants: ["CANONICAL_KIENZLE.P"],
      }),
    ]);
    expect(bad).toThrow(/operator_override blocks must have empty source_constants/);
  });

  it("rejects non-override with empty source_constants", () => {
    const bad = () => buildShellWithBlocks([
      validBlock({ physics_basis: "kienzle", source_constants: [] }),
    ]);
    expect(bad).toThrow(/requires at least one source constant reference/);
  });

  it("accepts operator_override with empty source_constants", () => {
    const sealed = buildShellWithBlocks([
      validBlock({ physics_basis: "operator_override", source_constants: [] }),
    ]);
    expect(sealed.block_annotations![0].physics_basis).toBe("operator_override");
    expect(sealed.block_annotations![0].source_constants).toEqual([]);
  });

  it("accepts physics_basis = kienzle", () => {
    const sealed = buildShellWithBlocks([
      validBlock({ physics_basis: "kienzle", source_constants: ["CANONICAL_KIENZLE.P"] }),
    ]);
    expect(sealed.block_annotations![0].physics_basis).toBe("kienzle");
  });

  it("accepts physics_basis = taylor", () => {
    const sealed = buildShellWithBlocks([
      validBlock({ physics_basis: "taylor", source_constants: ["CANONICAL_TAYLOR.P"] }),
    ]);
    expect(sealed.block_annotations![0].physics_basis).toBe("taylor");
  });

  it("accepts physics_basis = sle_chatter", () => {
    const sealed = buildShellWithBlocks([
      validBlock({ physics_basis: "sle_chatter", source_constants: ["CANONICAL_TOOL_MODULUS.carbide"] }),
    ]);
    expect(sealed.block_annotations![0].physics_basis).toBe("sle_chatter");
  });

  it("accepts physics_basis = empirical_table", () => {
    const sealed = buildShellWithBlocks([
      validBlock({ physics_basis: "empirical_table", source_constants: ["CANONICAL_MILLING_SPEEDS.P"] }),
    ]);
    expect(sealed.block_annotations![0].physics_basis).toBe("empirical_table");
  });
});

// ============================================================================
// BUILDER — threading + SHA seal (U-PPGM08)
// ============================================================================

describe("PhysicsSidecarBuilder + block_annotations (U-PPGM08) — seal integration", () => {
  it("schema version reports 1.1.0 after the additive bump", () => {
    expect(POST_PHYSICS_SIDECAR_SCHEMA_VERSION).toBe("1.1.0");
  });

  it("threads block_annotations into the sealed payload verbatim", () => {
    const blocks = [validBlock({ block_id: "N100" }), validBlock({ block_id: "N200" })];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    expect(sealed.block_annotations).toEqual(blocks);
  });

  it("defensive-clones block_annotations — caller mutation does not leak into the sealed sidecar", () => {
    const blocks = [validBlock({ block_id: "N100" })];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    blocks[0].emitted.S_rpm = 1;
    blocks.push(validBlock({ block_id: "N200" }));
    expect(sealed.block_annotations).toHaveLength(1);
    expect(sealed.block_annotations![0].emitted.S_rpm).toBe(7000);
  });

  it("includes block_annotations in the SHA seal — tampering invalidates verify()", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [validBlock({ block_id: "N100" })],
    });
    expect(PhysicsSidecarBuilderEngine.verify(sealed).ok).toBe(true);

    // Tamper: bump emitted RPM by 1 — schema-valid (positive number) but
    // SHA must no longer match.
    const tampered = JSON.parse(JSON.stringify(sealed)) as PostPhysicsSidecar;
    tampered.block_annotations![0].emitted.S_rpm =
      sealed.block_annotations![0].emitted.S_rpm + 1;
    const v2 = PhysicsSidecarBuilderEngine.verify(tampered);
    expect(v2.ok).toBe(false);
    expect(v2.reason).toBe("sha_mismatch");
  });

  it("changing block_annotations order changes the SHA (arrays preserve order)", () => {
    const a = validBlock({ block_id: "N100" });
    const b = validBlock({ block_id: "N110" });
    const sealedAB = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [a, b],
    });
    const sealedBA = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [b, a],
    });
    expect(sealedAB.meta.sha256).not.toBe(sealedBA.meta.sha256);
  });

  it("identical inputs (incl. block order) produce byte-identical SHA across two builds", () => {
    const inputs = {
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [validBlock({ block_id: "N100" })],
    };
    const a = PhysicsSidecarBuilderEngine.buildAndSeal(inputs);
    const b = PhysicsSidecarBuilderEngine.buildAndSeal(inputs);
    expect(a.meta.sha256).toBe(b.meta.sha256);
  });

  it("absence vs empty-array produce different SHAs (semantically distinct sidecars)", () => {
    const sealedAbsent = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });
    const sealedEmpty = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [],
    });
    expect(sealedAbsent.meta.sha256).not.toBe(sealedEmpty.meta.sha256);
  });

  it("sidecar with block_annotations round-trips through strict parse", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [
        validBlock({ block_id: "N100", physics_basis: "kienzle" }),
        validBlock({
          block_id: "N110",
          physics_basis: "operator_override",
          source_constants: [],
        }),
      ],
    });
    expect(() => parseSidecarStrict(sealed)).not.toThrow();
  });

  it("v1.0.0-shaped sidecar (no block_annotations field) still parses under v1.1.0 schema", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });
    const asV1 = JSON.parse(JSON.stringify(sealed)) as PostPhysicsSidecar;
    asV1.meta.schema_version = "1.0.0";
    const r = postPhysicsSidecarSchema.safeParse(asV1);
    expect(r.success).toBe(true);
  });
});
