/**
 * PostPhysicsSidecar — Block-annotation round-trip integration (MS0/U-PPGM11).
 *
 * Cross-component E2E that exercises the whole 1.1.0 per-block S/F chain
 * in one go:
 *
 *   U-PPGM07 schema  -> U-PPGM08 builder  -> JSON serialisation
 *   -> on-disk file  -> U-PPGM03 loader   -> U-PPGM09 lookup
 *   -> emitted G-code -> U-PPGM10 verify   -> tier-aware verdict
 *
 * The unit tests for each piece (PostPhysicsSidecarBlockAnnotations,
 * loadPhysicsSidecar, verifyBlockAnnotations) cover branches in isolation.
 * This file verifies the SEAMS — that the Node-side builder, the
 * Rhino-portable loader, the lookup helpers, and the gate all agree
 * byte-for-byte and produce a coherent verdict end-to-end.
 *
 * Coverage budget per spec: 1 happy path + ≥3 failure modes + ≥2 adversarial.
 *
 * SAFETY: per project rules this file MUST NOT inline kc1_1/Taylor C/
 * tool-modulus literals. The fixture S/F values below are arbitrary
 * positivity-guard values used to drive the chain, not physics constants.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  PhysicsSidecarBuilderEngine,
  physicsSidecarBuilderEngine,
} from "../engines/PhysicsSidecarBuilderEngine.js";
import {
  loadPhysicsSidecar,
  getBlockAnnotation,
  getBlockAnnotationsByOp,
} from "../cps/loadPhysicsSidecar.js";
import { verifyBlockAnnotations, verifyOrThrow } from "../cps/verifyBlockAnnotations.js";
import {
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  type BlockAnnotation,
} from "../schemas/postPhysicsSidecarSchema.js";

const FIXED_GENERATED_AT = "2026-04-30T12:00:00.000Z";
const FIXED_VERSIONS = { "src/physics/constants.ts": "abcdef1234567890" };

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

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ppgm11-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ============================================================================
// HAPPY PATH — full chain produces PASS
// ============================================================================

describe("U-PPGM11 round-trip — happy path (3-block program)", () => {
  it("builder -> file -> loader -> lookup -> verify yields PASS at shop_floor", () => {
    // 1. Build sidecar with three operation blocks
    const blocks: BlockAnnotation[] = [
      block({ block_id: "N100", op_id: "face_1", emitted: { ...block().emitted, S_rpm: 4000, F_mmpm: 600 } }),
      block({ block_id: "N110", op_id: "rough_pocket_1", physics_basis: "kienzle",
              emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
      block({ block_id: "N120", op_id: "finish_pocket_1", physics_basis: "taylor",
              source_constants: ["CANONICAL_TAYLOR.P"],
              emitted: { ...block().emitted, S_rpm: 9000, F_mmpm: 800 } }),
    ];

    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });

    // 2. Serialize to JSON file (mimics post-emit-time disk write)
    const sidecarPath = join(tmpDir, "physics_sidecar.json");
    writeFileSync(sidecarPath, JSON.stringify(sealed, null, 2), "utf8");

    // 3. Read back as raw text (CPS load contract: caller reads file)
    const rawText = readFileSync(sidecarPath, "utf8");

    // 4. Load + verify SHA via the pure-JS loader
    const loaded = loadPhysicsSidecar(rawText, {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });

    // 5. Lookup individual blocks — values survive the round-trip
    const annN110 = getBlockAnnotation(loaded, "N110");
    expect(annN110?.emitted.S_rpm).toBe(7000);
    expect(annN110?.emitted.F_mmpm).toBe(1120);
    expect(annN110?.physics_basis).toBe("kienzle");

    // 6. Lookup by op_id — multi-block per op
    const allBlocks = getBlockAnnotationsByOp(loaded, "rough_pocket_1");
    expect(allBlocks).toHaveLength(1);
    expect(allBlocks[0].block_id).toBe("N110");

    // 7. Generate matching G-code and run the gate
    const gcode = [
      "(PROGRAM HEADER)",
      "N100 G0 X0 Y0 S4000 F600",
      "N110 G1 X10 Y20 S7000 F1120",
      "N120 G1 X30 Y40 S9000 F800",
      "M30",
    ].join("\n");
    const result = verifyBlockAnnotations(gcode, loaded, { tier: "shop_floor" });
    expect(result.verdict).toBe("PASS");
    expect(result.blocks_with_sf).toBe(3);
    expect(result.mismatches).toEqual([]);
  });
});

// ============================================================================
// FAILURE MODES (≥3) — drift catches at each layer of the chain
// ============================================================================

describe("U-PPGM11 round-trip — failure modes", () => {
  it("FAILURE 1: post-emit S drift caught by gate (HARD_BLOCK at shop_floor)", () => {
    const blocks: BlockAnnotation[] = [
      block({ block_id: "N100", emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 } }),
    ];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    const sidecarPath = join(tmpDir, "sidecar.json");
    writeFileSync(sidecarPath, JSON.stringify(sealed), "utf8");
    const loaded = loadPhysicsSidecar(readFileSync(sidecarPath, "utf8"), {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });

    // Post emits S drifted from annotation
    const gcode = "N100 G1 X10 S6500 F1120";
    expect(() => verifyOrThrow(gcode, loaded, { tier: "shop_floor" })).toThrow(/HARD_BLOCK/);
  });

  it("FAILURE 2: sidecar SHA tamper caught by loader before gate even runs", () => {
    const blocks: BlockAnnotation[] = [block({ block_id: "N100" })];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });

    // Tamper with the on-disk JSON: bump emitted.S_rpm by 1, leave SHA stale
    const tampered = JSON.parse(JSON.stringify(sealed)) as Record<string, unknown>;
    const ba = tampered.block_annotations as BlockAnnotation[];
    ba[0].emitted.S_rpm = ba[0].emitted.S_rpm + 1;
    const sidecarPath = join(tmpDir, "tampered.json");
    writeFileSync(sidecarPath, JSON.stringify(tampered), "utf8");

    expect(() =>
      loadPhysicsSidecar(readFileSync(sidecarPath, "utf8"), {
        expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
      }),
    ).toThrow(/SHA mismatch/);
  });

  it("FAILURE 3: missing annotation for block_id emitted by post (gate HARD_BLOCK)", () => {
    const blocks: BlockAnnotation[] = [block({ block_id: "N100" })];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    const loaded = loadPhysicsSidecar(JSON.stringify(sealed), {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });

    // Post emits a block_id not in the sidecar
    const gcode = "N999 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, loaded, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("missing_annotation");
  });

  it("FAILURE 4: schema version mismatch caught by loader at expected-version check", () => {
    const blocks: BlockAnnotation[] = [block({ block_id: "N100" })];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    expect(() =>
      loadPhysicsSidecar(JSON.stringify(sealed), {
        expectedSchemaVersion: "9.9.9", // post compiled against future schema
      }),
    ).toThrow(/schema version mismatch/);
  });
});

// ============================================================================
// ADVERSARIAL (≥2) — sophisticated post-emit tampers
// ============================================================================

describe("U-PPGM11 round-trip — adversarial scenarios", () => {
  it("ADVERSARIAL 1: silent operator_override insertion bypasses S/F check (designed behavior)", () => {
    // An operator who overrides S/F should be able to. The annotation
    // should reflect physics_basis="operator_override" with empty
    // source_constants. This adversarial test confirms the gate honors
    // that bypass — the user has explicitly declared "I'm off-physics".
    const blocks: BlockAnnotation[] = [
      block({
        block_id: "N100",
        physics_basis: "operator_override",
        source_constants: [],
        // Annotation S/F is what physics WOULD have emitted; the operator
        // chose differently, but the bypass is recorded.
        emitted: { ...block().emitted, S_rpm: 7000, F_mmpm: 1120 },
      }),
    ];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    const loaded = loadPhysicsSidecar(JSON.stringify(sealed), {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });
    // Operator emits a deliberately conservative S/F
    const gcode = "N100 G1 X10 S5000 F600";
    const r = verifyBlockAnnotations(gcode, loaded, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
  });

  it("ADVERSARIAL 2: legacy v1.0.0 sidecar with new physics-driven post HARD_BLOCKs at shop_floor", () => {
    // Attacker (or stale build pipeline) ships a v1.0.0 sidecar (no
    // block_annotations) alongside a 1.1.0-aware post that claims to be
    // physics-driven. The gate must catch this — physics-driven post
    // without per-block telemetry is exactly the regression to prevent.
    const v1Sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      // No block_annotations -> v1.0.0-shaped sidecar (still parses under
      // 1.1.0 schema because the field is optional)
    });
    const loaded = loadPhysicsSidecar(JSON.stringify(v1Sealed), {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });
    const gcode = "N100 G1 X10 S7000 F1120";
    const r = verifyBlockAnnotations(gcode, loaded, { tier: "shop_floor" });
    expect(r.verdict).toBe("HARD_BLOCK");
    expect(r.mismatches[0].reason).toBe("no_block_annotations");
  });

  it("ADVERSARIAL 3: byte-identical SHA across two independent builds (canonicalization invariant)", () => {
    // Cross-process determinism — if Build A and Build B produce different
    // SHAs for the same logical input, the gate becomes non-reproducible
    // and CI flakes.
    const inputs = {
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [
        block({ block_id: "N100" }),
        block({ block_id: "N110", op_id: "op_b" }),
        block({ block_id: "N120", op_id: "op_c" }),
      ],
    };
    const a = PhysicsSidecarBuilderEngine.buildAndSeal(inputs);
    const b = PhysicsSidecarBuilderEngine.buildAndSeal(inputs);
    expect(a.meta.sha256).toBe(b.meta.sha256);

    // Loader must agree with builder on canonical form — both texts
    // verify against the same SHA.
    const text = JSON.stringify(a);
    expect(() =>
      loadPhysicsSidecar(text, { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).not.toThrow();
  });
});

// ============================================================================
// SEAM CHECK — builder/loader/canonicalize agree (Node vs pure-JS)
// ============================================================================

describe("U-PPGM11 round-trip — Node/Rhino seam invariants", () => {
  it("PhysicsSidecarBuilderEngine.canonicalize and pure-JS canonicalize agree on block_annotations[]", async () => {
    // The whole sidecar bridge collapses if Node's canonicalize and the
    // CPS-side pure-JS canonicalize diverge — that produces a phantom SHA
    // mismatch even on a clean build. Empirical seam check:
    const { pureCanonicalize } = await import("../cps/loadPhysicsSidecar.js");
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: [
        block({ block_id: "N100" }),
        block({ block_id: "N110", op_id: "op_b" }),
      ],
    });
    const { meta, ...payload } = sealed;
    const { sha256: _ignore, ...metaWithoutSha } = meta;
    void _ignore;
    const sealable = { ...payload, _meta_without_sha: metaWithoutSha };
    const nodeForm = PhysicsSidecarBuilderEngine.canonicalize(sealable);
    const pureForm = pureCanonicalize(sealable);
    expect(nodeForm).toBe(pureForm);
  });

  it("verify->load->verify chain: post-load tamper of a block_annotation invalidates verify()", () => {
    const blocks: BlockAnnotation[] = [block({ block_id: "N100" })];
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
      block_annotations: blocks,
    });
    expect(physicsSidecarBuilderEngine.verify(sealed).ok).toBe(true);

    // Mutate IN MEMORY (no SHA recompute) — verify() must fail
    sealed.block_annotations![0].emitted.S_rpm = sealed.block_annotations![0].emitted.S_rpm + 1;
    expect(physicsSidecarBuilderEngine.verify(sealed).ok).toBe(false);
  });
});
