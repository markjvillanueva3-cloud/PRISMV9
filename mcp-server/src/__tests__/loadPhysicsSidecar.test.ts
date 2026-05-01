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
} from "../cps/loadPhysicsSidecar.js";
import { PhysicsSidecarBuilderEngine } from "../engines/PhysicsSidecarBuilderEngine.js";
import { POST_PHYSICS_SIDECAR_SCHEMA_VERSION } from "../schemas/postPhysicsSidecarSchema.js";

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
