/**
 * loadPhysicsSidecar tests — MS0/U-PPGM03.
 *
 * The CPS-side loader runs in Rhino without Node crypto; it embeds its own
 * pure-JS SHA-256 + canonicalize. These tests verify that the pure-JS
 * implementations produce byte-identical output to the Node-side engine
 * (PhysicsSidecarBuilderEngine), so the CPS loader's SHA verification will
 * agree with the seal computed at emit time.
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

import {
  pureSha256Hex,
  pureCanonicalize,
  loadPhysicsSidecar,
  getBlockAnnotation,
  getBlockAnnotationsByOp,
  type SidecarBlockAnnotation,
} from "../cps/loadPhysicsSidecar.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import {
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  type BlockAnnotation,
} from "../schemas/postPhysicsSidecarSchema.js";

const FIXED_OPTS = {
  source_engine_versions: { "src/physics/constants.ts": "abcdef1234567890" },
  generated_at: "2026-04-29T00:00:00.000Z",
};

// ============================================================================
// PURE-JS SHA-256 — FIPS 180-4 known vectors
// ============================================================================

describe("pureSha256Hex — FIPS 180-4 known vectors", () => {
  it("empty string → e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", () => {
    expect(pureSha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("'abc' → ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", () => {
    expect(pureSha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq' (FIPS 180-4 multi-block test) → 248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1", () => {
    expect(
      pureSha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
    ).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("matches Node crypto SHA-256 for ASCII input", () => {
    const input = "PRISM Path constant-engagement spiral";
    const nodeSha = createHash("sha256").update(input, "utf8").digest("hex");
    expect(pureSha256Hex(input)).toBe(nodeSha);
  });

  it("matches Node crypto SHA-256 for UTF-8 multi-byte input (German umlaut, math symbol, emoji)", () => {
    const input = "ü ∂² 🔧 Nümmüller";
    const nodeSha = createHash("sha256").update(input, "utf8").digest("hex");
    expect(pureSha256Hex(input)).toBe(nodeSha);
  });

  it("matches Node crypto SHA-256 for 1024-byte random-pattern input", () => {
    let input = "";
    for (let i = 0; i < 1024; i++) input += String.fromCharCode((i * 31 + 7) % 95 + 32);
    const nodeSha = createHash("sha256").update(input, "utf8").digest("hex");
    expect(pureSha256Hex(input)).toBe(nodeSha);
  });
});

// ============================================================================
// PURE-JS CANONICALIZE — parity with Node engine
// ============================================================================

describe("pureCanonicalize — parity with PhysicsSidecarBuilderEngine.canonicalize", () => {
  it("simple object produces identical output to Node canonicalize (sorted keys)", () => {
    const obj = { z: 1, a: 0, m: 5 };
    expect(pureCanonicalize(obj)).toBe(PhysicsSidecarBuilderEngine.canonicalize(obj));
  });

  it("nested object produces identical output", () => {
    const obj = { z: { y: 1, a: 2 }, a: { z: { c: 1, a: 2 }, a: 0 } };
    expect(pureCanonicalize(obj)).toBe(PhysicsSidecarBuilderEngine.canonicalize(obj));
  });

  it("array of mixed types produces identical output (arrays preserved, not sorted)", () => {
    const arr = [3, "hello", { z: 1, a: 0 }, null, true];
    expect(pureCanonicalize(arr)).toBe(PhysicsSidecarBuilderEngine.canonicalize(arr));
  });

  it("full sealed sidecar canonicalizes identically to engine canonicalize", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const enginePayload: Record<string, unknown> = JSON.parse(JSON.stringify(sealed));
    const nodeOut = PhysicsSidecarBuilderEngine.canonicalize(enginePayload);
    const pureOut = pureCanonicalize(enginePayload);
    expect(pureOut).toBe(nodeOut);
  });

  it("rejects NaN with throw (matches Node engine behaviour)", () => {
    expect(() => pureCanonicalize({ x: Number.NaN })).toThrow();
    expect(() => PhysicsSidecarBuilderEngine.canonicalize({ x: Number.NaN })).toThrow();
  });

  it("rejects Infinity with throw (matches Node engine behaviour)", () => {
    expect(() => pureCanonicalize({ x: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => PhysicsSidecarBuilderEngine.canonicalize({ x: Number.POSITIVE_INFINITY })).toThrow();
  });
});

// ============================================================================
// LOADER — happy path
// ============================================================================

describe("loadPhysicsSidecar — happy path", () => {
  it("accepts a freshly built + serialised sidecar and returns the parsed object", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const text = JSON.stringify(sealed);
    const result = loadPhysicsSidecar(text, { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION });
    const meta = result.meta as Record<string, unknown>;
    expect(meta.sha256).toBe(sealed.meta.sha256);
    const kienzle = result.kienzle as Record<string, { kc1_1: number }>;
    expect(kienzle.P.kc1_1).toBe(sealed.kienzle.P.kc1_1);
  });

  it("accepts a sidecar serialised with extra whitespace (pretty-printed JSON)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const pretty = JSON.stringify(sealed, null, 2);
    const result = loadPhysicsSidecar(pretty, { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION });
    const meta = result.meta as Record<string, unknown>;
    expect(meta.sha256).toBe(sealed.meta.sha256);
  });
});

// ============================================================================
// LOADER — failure modes
// ============================================================================

describe("loadPhysicsSidecar — failure modes (fail-closed contract)", () => {
  it("throws when jsonText is empty string", () => {
    expect(() =>
      loadPhysicsSidecar("", { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).toThrow(/non-empty string/);
  });

  it("throws when expectedSchemaVersion is missing", () => {
    expect(() =>
      loadPhysicsSidecar('{"meta":{}}', {} as unknown as { expectedSchemaVersion: string }),
    ).toThrow(/expectedSchemaVersion is required/);
  });

  it("throws on malformed JSON", () => {
    expect(() =>
      loadPhysicsSidecar("not { valid json", { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).toThrow(/not valid JSON/);
  });

  it("throws when sidecar is missing meta", () => {
    expect(() =>
      loadPhysicsSidecar('{"kienzle":{}}', { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).toThrow(/missing meta/);
  });

  it("throws when schema_version mismatches expected", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const text = JSON.stringify(sealed);
    expect(() =>
      loadPhysicsSidecar(text, { expectedSchemaVersion: "999.999.999" }),
    ).toThrow(/schema version mismatch/);
  });

  it("throws when meta.sha256 is wrong format (too short)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const obj = JSON.parse(JSON.stringify(sealed));
    obj.meta.sha256 = "deadbeef";
    expect(() =>
      loadPhysicsSidecar(JSON.stringify(obj), { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).toThrow(/64-char lowercase hex/);
  });

  it("throws when sidecar is tampered after sealing (kc1_1 changed)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const obj = JSON.parse(JSON.stringify(sealed));
    obj.kienzle.P.kc1_1 = 9999;
    expect(() =>
      loadPhysicsSidecar(JSON.stringify(obj), { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).toThrow(/SHA mismatch/);
  });

  it("throws when meta.sha256 is replaced with a fake-but-valid-format hex", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const obj = JSON.parse(JSON.stringify(sealed));
    obj.meta.sha256 = "f".repeat(64);
    expect(() =>
      loadPhysicsSidecar(JSON.stringify(obj), { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION }),
    ).toThrow(/SHA mismatch/);
  });
});

// ============================================================================
// CROSS-VERIFICATION — pure-JS SHA matches Node engine on actual sidecar
// ============================================================================

describe("loadPhysicsSidecar — cross-verification with Node engine", () => {
  it("pureSha256Hex(pureCanonicalize(sealable)) reproduces the engine's seal SHA exactly", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const obj = JSON.parse(JSON.stringify(sealed));
    const { meta, ...payload } = obj;
    const { sha256, ...metaWithoutSha } = meta;
    const sealable = { ...payload, _meta_without_sha: metaWithoutSha };
    const reproduced = pureSha256Hex(pureCanonicalize(sealable));
    expect(reproduced).toBe(sha256);
  });

  it("3 independent loadPhysicsSidecar invocations on the same sealed text all succeed (deterministic verify)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const text = JSON.stringify(sealed);
    const a = loadPhysicsSidecar(text, { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION });
    const b = loadPhysicsSidecar(text, { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION });
    const c = loadPhysicsSidecar(text, { expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION });
    const aMeta = a.meta as Record<string, unknown>;
    const bMeta = b.meta as Record<string, unknown>;
    const cMeta = c.meta as Record<string, unknown>;
    expect(aMeta.sha256).toBe(bMeta.sha256);
    expect(bMeta.sha256).toBe(cMeta.sha256);
  });
});

// ============================================================================
// getBlockAnnotation / getBlockAnnotationsByOp — MS0/U-PPGM09 (schema 1.1.0)
// ============================================================================

function makeBlock(overrides: Partial<BlockAnnotation> = {}): BlockAnnotation {
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

describe("getBlockAnnotation (U-PPGM09) — pure-JS lookup by block_id", () => {
  it("returns null when sidecar.block_annotations is undefined (v1.0.0 back-compat)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const result = getBlockAnnotation(sealed as unknown as Record<string, unknown>, "N100");
    expect(result).toBeNull();
  });

  it("returns null when block_annotations is empty array", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [],
    });
    expect(getBlockAnnotation(sealed as unknown as Record<string, unknown>, "N100")).toBeNull();
  });

  it("returns the matching annotation when block_id present", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [makeBlock({ block_id: "N100" })],
    });
    const got = getBlockAnnotation(sealed as unknown as Record<string, unknown>, "N100");
    expect(got).not.toBeNull();
    expect(got?.block_id).toBe("N100");
    expect(got?.physics_basis).toBe("kienzle");
    expect(got?.emitted.S_rpm).toBe(7000);
  });

  it("returns null when block_id is not in the sidecar", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [makeBlock({ block_id: "N100" }), makeBlock({ block_id: "N110" })],
    });
    expect(getBlockAnnotation(sealed as unknown as Record<string, unknown>, "N999")).toBeNull();
  });

  it("returns the FIRST match in array order (schema guarantees uniqueness, but lookup is stable)", () => {
    // The schema's superRefine catches duplicate block_ids before seal, so
    // a duplicate could only appear via post-seal tamper. Lookup must still
    // be deterministic — first match wins.
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [makeBlock({ block_id: "N100", op_id: "first" })],
    });
    // Manually inject a duplicate to simulate post-seal tampering
    const tampered = JSON.parse(JSON.stringify(sealed)) as Record<string, unknown>;
    const blocks = tampered.block_annotations as unknown[];
    blocks.push({ ...makeBlock({ block_id: "N100", op_id: "second" }) });
    const got = getBlockAnnotation(tampered, "N100");
    expect(got?.op_id).toBe("first");
  });

  it("scans all entries to find a match deep in the array", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [
        makeBlock({ block_id: "N100" }),
        makeBlock({ block_id: "N110" }),
        makeBlock({ block_id: "N120" }),
        makeBlock({ block_id: "N130" }),
        makeBlock({ block_id: "N140" }),
      ],
    });
    const got = getBlockAnnotation(sealed as unknown as Record<string, unknown>, "N130");
    expect(got?.block_id).toBe("N130");
  });

  it("throws when sidecar is null", () => {
    expect(() => getBlockAnnotation(null, "N100")).toThrow(/non-null object/);
  });

  it("throws when sidecar is undefined", () => {
    expect(() => getBlockAnnotation(undefined, "N100")).toThrow(/non-null object/);
  });

  it("throws when block_id is empty string", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    expect(() => getBlockAnnotation(sealed as unknown as Record<string, unknown>, "")).toThrow(
      /non-empty string/,
    );
  });

  it("throws when block_id is not a string", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    expect(() =>
      // @ts-expect-error — runtime rejection of non-string blockId
      getBlockAnnotation(sealed as unknown as Record<string, unknown>, 100),
    ).toThrow(/non-empty string/);
  });

  it("throws when block_annotations is present but not an array (shape violation)", () => {
    const malformed = {
      meta: { schema_version: "1.1.0", sha256: "x".repeat(64) },
      block_annotations: { not: "an array" },
    } as unknown as Record<string, unknown>;
    expect(() => getBlockAnnotation(malformed, "N100")).toThrow(/not an array/);
  });

  it("returns annotation with all schema fields preserved verbatim through the loader", () => {
    const block = makeBlock({
      block_id: "N100",
      op_id: "test_op",
      physics_basis: "taylor",
      confidence: 0.55,
      safety_margin: 1.2,
      source_constants: ["CANONICAL_TAYLOR.M"],
    });
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [block],
    });
    const got = getBlockAnnotation(sealed as unknown as Record<string, unknown>, "N100");
    expect(got).toEqual(block);
  });

  it("works after a full JSON round-trip (sealed -> stringify -> parse -> lookup)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [makeBlock({ block_id: "N100" })],
    });
    const text = JSON.stringify(sealed);
    const loaded = loadPhysicsSidecar(text, {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });
    const got = getBlockAnnotation(loaded, "N100");
    expect(got).not.toBeNull();
    expect(got?.block_id).toBe("N100");
  });

  it("type signature: returned annotation is structurally a SidecarBlockAnnotation", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [makeBlock()],
    });
    const got: SidecarBlockAnnotation | null = getBlockAnnotation(
      sealed as unknown as Record<string, unknown>,
      "N100",
    );
    // Verify required fields exist on the returned shape
    expect(got).not.toBeNull();
    if (got) {
      expect(typeof got.block_id).toBe("string");
      expect(typeof got.op_id).toBe("string");
      expect(typeof got.iso_group).toBe("string");
      expect(typeof got.tool_material).toBe("string");
      expect(typeof got.physics_basis).toBe("string");
      expect(typeof got.confidence).toBe("number");
      expect(typeof got.safety_margin).toBe("number");
      expect(Array.isArray(got.source_constants)).toBe(true);
      expect(typeof got.emitted.S_rpm).toBe("number");
      expect(typeof got.emitted.F_mmpm).toBe("number");
    }
  });
});

describe("getBlockAnnotationsByOp (U-PPGM09) — pure-JS lookup by op_id", () => {
  it("returns empty array when block_annotations is undefined", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    const result = getBlockAnnotationsByOp(
      sealed as unknown as Record<string, unknown>,
      "rough_pocket_1",
    );
    expect(result).toEqual([]);
  });

  it("returns all blocks belonging to the op_id", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [
        makeBlock({ block_id: "N100", op_id: "op_a" }),
        makeBlock({ block_id: "N110", op_id: "op_b" }),
        makeBlock({ block_id: "N120", op_id: "op_a" }),
        makeBlock({ block_id: "N130", op_id: "op_a" }),
      ],
    });
    const got = getBlockAnnotationsByOp(sealed as unknown as Record<string, unknown>, "op_a");
    expect(got).toHaveLength(3);
    expect(got.map((b) => b.block_id)).toEqual(["N100", "N120", "N130"]);
  });

  it("returns empty array when op_id has no matching blocks", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [makeBlock({ op_id: "op_a" })],
    });
    expect(
      getBlockAnnotationsByOp(sealed as unknown as Record<string, unknown>, "op_missing"),
    ).toEqual([]);
  });

  it("preserves array order (no sorting) — block sequence is meaningful", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...FIXED_OPTS,
      block_annotations: [
        makeBlock({ block_id: "N300", op_id: "op_x" }),
        makeBlock({ block_id: "N100", op_id: "op_x" }),
        makeBlock({ block_id: "N200", op_id: "op_x" }),
      ],
    });
    const got = getBlockAnnotationsByOp(sealed as unknown as Record<string, unknown>, "op_x");
    expect(got.map((b) => b.block_id)).toEqual(["N300", "N100", "N200"]);
  });

  it("throws when sidecar is null", () => {
    expect(() => getBlockAnnotationsByOp(null, "op_a")).toThrow(/non-null object/);
  });

  it("throws when opId is empty string", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(FIXED_OPTS);
    expect(() =>
      getBlockAnnotationsByOp(sealed as unknown as Record<string, unknown>, ""),
    ).toThrow(/non-empty string/);
  });

  it("throws on shape violation (block_annotations not array)", () => {
    const malformed = {
      meta: { schema_version: "1.1.0", sha256: "x".repeat(64) },
      block_annotations: "string-not-array",
    } as unknown as Record<string, unknown>;
    expect(() => getBlockAnnotationsByOp(malformed, "op_a")).toThrow(/not an array/);
  });
});
