/**
 * PhysicsSidecarBuilderEngine tests — MS0/U-PPGM02.
 *
 * Covers the determinism + sealing + verify + atomic-write contract.
 * Reference SHA values are NOT pinned (they depend on canonical constants which
 * recalibrate over time); instead we verify properties: determinism across
 * invocations, mismatch detection on tamper, schema rejection on garbage,
 * round-trip identity through file I/O.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PhysicsSidecarBuilderEngine, type BuildSidecarOptions } from "../engines/PhysicsSidecarBuilderEngine.js";
import {
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  type PostPhysicsSidecar,
} from "../schemas/postPhysicsSidecarSchema.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

// ============================================================================
// FIXTURES
// ============================================================================

function fixedOpts(): BuildSidecarOptions {
  return {
    source_engine_versions: {
      "src/physics/constants.ts": "abcdef1234567890",
      PostProcessorPipelineEngine: "1.0.0",
    },
    constants_source: "src/physics/constants.ts",
    generated_at: "2026-04-29T00:00:00.000Z",
  };
}

function emptyOpts(): BuildSidecarOptions {
  return {
    source_engine_versions: {},
    generated_at: "2026-04-29T00:00:00.000Z",
  };
}

let TMP_DIR: string;

beforeAll(async () => {
  TMP_DIR = await mkdtemp(join(tmpdir(), "physics-sidecar-test-"));
});

afterAll(async () => {
  if (TMP_DIR) await rm(TMP_DIR, { recursive: true, force: true });
});

// ============================================================================
// CANONICALIZE — determinism + key-ordering invariance
// ============================================================================

describe("PhysicsSidecarBuilderEngine.canonicalize — determinism", () => {
  it("canonicalize is byte-identical for objects with different key insertion order", () => {
    const a = { kc1_1: 1800, mc: 0.25, source: "Sandvik" };
    const b = { source: "Sandvik", mc: 0.25, kc1_1: 1800 };
    expect(PhysicsSidecarBuilderEngine.canonicalize(a)).toBe(PhysicsSidecarBuilderEngine.canonicalize(b));
  });

  it("canonicalize emits sorted keys for nested objects", () => {
    const obj = { z: 1, a: { z: 1, a: 0 } };
    const out = PhysicsSidecarBuilderEngine.canonicalize(obj);
    expect(out).toBe('{"a":{"a":0,"z":1},"z":1}');
  });

  it("canonicalize preserves array order (arrays are not sorted)", () => {
    const arr = [3, 1, 2];
    expect(PhysicsSidecarBuilderEngine.canonicalize(arr)).toBe("[3,1,2]");
  });

  it("canonicalize throws on NaN to prevent silent corruption", () => {
    expect(() => PhysicsSidecarBuilderEngine.canonicalize({ x: Number.NaN })).toThrow(/non-finite/);
  });

  it("canonicalize throws on +Infinity to prevent silent corruption", () => {
    expect(() => PhysicsSidecarBuilderEngine.canonicalize({ x: Number.POSITIVE_INFINITY })).toThrow(/non-finite/);
  });
});

// ============================================================================
// COMPUTE SHA-256 — well-known vectors
// ============================================================================

describe("PhysicsSidecarBuilderEngine.computeSha256 — well-known vectors", () => {
  it("empty string SHA-256 is the FIPS 180-4 known constant e3b0c44...b855", () => {
    expect(PhysicsSidecarBuilderEngine.computeSha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("'abc' SHA-256 is FIPS 180-4 known constant ba7816bf...0015ad", () => {
    expect(PhysicsSidecarBuilderEngine.computeSha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("computeSha256 always returns 64-character lowercase hex", () => {
    const s = PhysicsSidecarBuilderEngine.computeSha256("any-input");
    expect(s).toHaveLength(64);
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ============================================================================
// BUILD AND SEAL — happy path
// ============================================================================

describe("PhysicsSidecarBuilderEngine.buildAndSeal — happy path", () => {
  it("returns a sidecar whose meta.schema_version equals current schema version constant", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    expect(sealed.meta.schema_version).toBe(POST_PHYSICS_SIDECAR_SCHEMA_VERSION);
  });

  it("returns a sidecar whose payload kc1_1 values match canonical constants for all 6 ISO groups", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(sealed.kienzle[g].kc1_1).toBe(CANONICAL_KIENZLE[g].kc1_1);
      expect(sealed.taylor[g].C).toBe(CANONICAL_TAYLOR[g].C);
    }
  });

  it("returned sidecar SHA-256 is a 64-char lowercase hex (regex-compliant)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    expect(sealed.meta.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("preserves caller-supplied generated_at timestamp verbatim", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    expect(sealed.meta.generated_at).toBe("2026-04-29T00:00:00.000Z");
  });

  it("preserves caller-supplied source_engine_versions verbatim", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    expect(sealed.meta.source_engine_versions["src/physics/constants.ts"]).toBe("abcdef1234567890");
    expect(sealed.meta.source_engine_versions.PostProcessorPipelineEngine).toBe("1.0.0");
  });

  it("defaults constants_source to 'src/physics/constants.ts' when not supplied", () => {
    const opts = fixedOpts();
    delete opts.constants_source;
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(opts);
    expect(sealed.meta.constants_source).toBe("src/physics/constants.ts");
  });
});

// ============================================================================
// DETERMINISM — same input → same SHA across N invocations
// ============================================================================

describe("PhysicsSidecarBuilderEngine — sealing determinism", () => {
  it("3 invocations with identical opts produce identical SHA values", () => {
    const a = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts()).meta.sha256;
    const b = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts()).meta.sha256;
    const c = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts()).meta.sha256;
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("changing only generated_at changes the SHA (timestamp is in the sealed canonical)", () => {
    const a = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...fixedOpts(),
      generated_at: "2026-04-29T00:00:00.000Z",
    }).meta.sha256;
    const b = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...fixedOpts(),
      generated_at: "2026-04-30T00:00:00.000Z",
    }).meta.sha256;
    expect(a).not.toBe(b);
  });

  it("changing source_engine_versions changes the SHA", () => {
    const a = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts()).meta.sha256;
    const b = PhysicsSidecarBuilderEngine.buildAndSeal({
      ...fixedOpts(),
      source_engine_versions: { ...fixedOpts().source_engine_versions, NewEngine: "2.0.0" },
    }).meta.sha256;
    expect(a).not.toBe(b);
  });
});

// ============================================================================
// VERIFY — round-trip + tamper detection
// ============================================================================

describe("PhysicsSidecarBuilderEngine.verify — round-trip + tamper detection", () => {
  it("verify returns ok=true with reason 'ok' for a freshly sealed sidecar", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const v = PhysicsSidecarBuilderEngine.verify(sealed);
    expect(v.ok).toBe(true);
    expect(v.reason).toBe("ok");
    expect(v.recomputed_sha).toBe(v.expected_sha);
    expect(v.recomputed_sha).toBe(sealed.meta.sha256);
  });

  it("verify returns sha_mismatch when kc1_1 is tampered after sealing", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const tampered = JSON.parse(JSON.stringify(sealed)) as PostPhysicsSidecar;
    tampered.kienzle.P.kc1_1 = 9999;
    const v = PhysicsSidecarBuilderEngine.verify(tampered);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("sha_mismatch");
    expect(v.recomputed_sha).not.toBe(v.expected_sha);
  });

  it("verify returns sha_mismatch when meta.sha256 is replaced with a fake-but-valid hex", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const tampered = JSON.parse(JSON.stringify(sealed)) as PostPhysicsSidecar;
    tampered.meta.sha256 = "f".repeat(64);
    const v = PhysicsSidecarBuilderEngine.verify(tampered);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("sha_mismatch");
  });

  it("verify returns schema_invalid when input is not a valid sidecar shape", () => {
    const v = PhysicsSidecarBuilderEngine.verify({ totally: "wrong" });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("schema_invalid");
    expect(v.recomputed_sha).toBe("");
  });

  it("verify returns schema_invalid when meta.sha256 is the wrong length", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const broken = JSON.parse(JSON.stringify(sealed)) as PostPhysicsSidecar;
    broken.meta.sha256 = "tooshort";
    const v = PhysicsSidecarBuilderEngine.verify(broken);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("schema_invalid");
  });
});

// ============================================================================
// FILE ROUND-TRIP — atomic write + load + verify
// ============================================================================

describe("PhysicsSidecarBuilderEngine — file round-trip", () => {
  it("writeToFile + loadAndVerify round-trip preserves the sidecar identity", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const filepath = join(TMP_DIR, "sidecar-roundtrip.json");
    await PhysicsSidecarBuilderEngine.writeToFile(sealed, filepath);
    const loaded = await PhysicsSidecarBuilderEngine.loadAndVerify(filepath);
    expect(loaded.meta.sha256).toBe(sealed.meta.sha256);
    expect(loaded.kienzle.P.kc1_1).toBe(sealed.kienzle.P.kc1_1);
    expect(loaded.taylor.S.C).toBe(sealed.taylor.S.C);
  });

  it("loadAndVerify throws on tampered file (kc1_1 swapped between write and read)", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const filepath = join(TMP_DIR, "sidecar-tamper.json");
    await PhysicsSidecarBuilderEngine.writeToFile(sealed, filepath);
    // Tamper the on-disk file directly
    const text = await readFile(filepath, "utf8");
    const tampered = JSON.parse(text);
    tampered.kienzle.P.kc1_1 = 9999;
    await writeFile(filepath, JSON.stringify(tampered, null, 2) + "\n", "utf8");
    await expect(PhysicsSidecarBuilderEngine.loadAndVerify(filepath)).rejects.toThrow(/sha_mismatch/);
  });

  it("loadAndVerify throws on a file that is not valid JSON", async () => {
    const filepath = join(TMP_DIR, "not-json.json");
    await writeFile(filepath, "not valid json", "utf8");
    await expect(PhysicsSidecarBuilderEngine.loadAndVerify(filepath)).rejects.toThrow(/not valid JSON/);
  });

  it("writeToFile creates parent directories if they do not exist", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const deep = join(TMP_DIR, "a", "b", "c", "sidecar.json");
    await PhysicsSidecarBuilderEngine.writeToFile(sealed, deep);
    const loaded = await PhysicsSidecarBuilderEngine.loadAndVerify(deep);
    expect(loaded.meta.sha256).toBe(sealed.meta.sha256);
  });
});

// ============================================================================
// ADVERSARIAL / EDGE
// ============================================================================

describe("PhysicsSidecarBuilderEngine — adversarial / edge", () => {
  it("buildAndSeal succeeds with empty source_engine_versions {} (valid, just informational)", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(emptyOpts());
    expect(Object.keys(sealed.meta.source_engine_versions)).toHaveLength(0);
    expect(sealed.meta.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buildAndSeal throws when source_engine_versions is missing", () => {
    expect(() => PhysicsSidecarBuilderEngine.buildAndSeal({} as unknown as BuildSidecarOptions)).toThrow();
  });

  it("buildAndSeal throws when opts is null", () => {
    expect(() => PhysicsSidecarBuilderEngine.buildAndSeal(null as unknown as BuildSidecarOptions)).toThrow();
  });

  it("writeToFile rejects a sidecar with tampered meta.sha256 (would fail schema)", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal(fixedOpts());
    const broken = JSON.parse(JSON.stringify(sealed)) as PostPhysicsSidecar;
    broken.meta.sha256 = "x".repeat(60); // wrong length, fails schema regex
    const filepath = join(TMP_DIR, "should-not-write.json");
    await expect(PhysicsSidecarBuilderEngine.writeToFile(broken, filepath)).rejects.toThrow(/refused/);
  });

  it("changing constants_source changes the SHA", () => {
    const a = PhysicsSidecarBuilderEngine.buildAndSeal({ ...fixedOpts(), constants_source: "src/physics/constants.ts" }).meta.sha256;
    const b = PhysicsSidecarBuilderEngine.buildAndSeal({ ...fixedOpts(), constants_source: "alt/path.ts" }).meta.sha256;
    expect(a).not.toBe(b);
  });
});
