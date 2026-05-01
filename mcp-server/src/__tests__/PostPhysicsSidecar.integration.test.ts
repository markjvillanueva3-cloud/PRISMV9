/**
 * PostPhysicsSidecar — Round-Trip Integration (MS0/U-PPGM05).
 *
 * Cross-component E2E exercises the whole sidecar bridge in one go:
 *   U-PPGM01 schema → U-PPGM02 builder → U-PPGM03 pure-JS loader → U-PPGM04 hook.
 *
 * The unit tests for each piece (PhysicsSidecarBuilderEngine.test.ts,
 * loadPhysicsSidecar.test.ts, NoInlinePhysicsConstantsEngine.test.ts,
 * PostPhysicsSidecarSchema.test.ts) cover branches in isolation. This file
 * verifies the *seam* — that the Node-side builder and the Rhino-portable
 * pure-JS loader agree byte-for-byte, that on-disk tamper is caught at both
 * layers, and that the inline-constants gate would catch a regression in any
 * .cps post that froze a value the sidecar is supposed to carry.
 *
 * Coverage budget per spec: 1 happy path + ≥3 failure modes + ≥2 adversarial.
 *
 * NOTE: This file MUST NOT inline any kc1_1 / Taylor C / tool-modulus literal
 * — when the inline-scanner test needs a "frozen" value, it pulls it through
 * `CANONICAL_KIENZLE` so the constants stay in `src/physics/constants.ts`.
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
  pureSha256Hex,
  pureCanonicalize,
} from "../cps/loadPhysicsSidecar.js";
import {
  POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
  parseSidecarSafe,
} from "../schemas/postPhysicsSidecarSchema.js";
import { NoInlinePhysicsConstantsEngine } from "../hooks/noInlinePhysicsConstants.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// Deterministic timestamp keeps SHA reproducible across test runs.
const FIXED_GENERATED_AT = "2026-04-30T12:00:00.000Z";
const FIXED_VERSIONS = {
  PhysicsSidecarBuilderEngine: "1.0.0",
  postPhysicsSidecarSchema: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
} as const;

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ppgm05-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("PostPhysicsSidecar integration — round-trip across builder + pure-JS loader (U-PPGM05)", () => {
  // ============================================================================
  // HAPPY PATH (1 scenario)
  // ============================================================================

  it("[happy] builder.buildAndSeal → writeToFile → loader (Node + pure-JS) both verify and agree", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });

    // Singleton export must point at the same class.
    expect(physicsSidecarBuilderEngine).toBe(PhysicsSidecarBuilderEngine);

    // Builder's own verify gate.
    const v = PhysicsSidecarBuilderEngine.verify(sealed);
    expect(v.ok).toBe(true);
    expect(v.reason).toBe("ok");
    expect(v.recomputed_sha).toBe(v.expected_sha);
    expect(v.expected_sha).toMatch(/^[0-9a-f]{64}$/);

    // Schema parse — final integrity gate.
    const parsed = parseSidecarSafe(sealed);
    expect(parsed.ok).toBe(true);

    // Atomic disk round-trip.
    const filepath = join(tmpDir, "happy-sidecar.json");
    await PhysicsSidecarBuilderEngine.writeToFile(sealed, filepath);
    const loaded = await PhysicsSidecarBuilderEngine.loadAndVerify(filepath);
    expect(loaded.meta.sha256).toBe(sealed.meta.sha256);

    // Pure-JS loader (the one that runs inside Fusion 360 / HSMWorks Rhino)
    // MUST accept the on-disk text.
    const text = readFileSync(filepath, "utf8");
    const loadedRhino = loadPhysicsSidecar(text, {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });
    expect((loadedRhino.meta as Record<string, unknown>).sha256).toBe(sealed.meta.sha256);

    // Cross-implementation invariant: pureCanonicalize ≡ engine.canonicalize.
    // This is the load-bearing seam — any divergence here produces a phantom
    // SHA mismatch in production once the post tries to verify in Rhino.
    const { meta: _strippedMeta, ...payload } = sealed;
    const { sha256: _strippedSha, ...metaWithoutSha } = sealed.meta;
    void _strippedMeta;
    void _strippedSha;
    const sealable = { ...payload, _meta_without_sha: metaWithoutSha };
    expect(pureCanonicalize(sealable)).toBe(PhysicsSidecarBuilderEngine.canonicalize(sealable));
    expect(pureSha256Hex(pureCanonicalize(sealable))).toBe(sealed.meta.sha256);
  });

  // ============================================================================
  // FAILURE MODES (3 scenarios — each tier of integrity)
  // ============================================================================

  it("[failure 1] tampered payload value — both loaders refuse (SHA mismatch on disk)", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });
    const filepath = join(tmpDir, "tampered.json");
    await PhysicsSidecarBuilderEngine.writeToFile(sealed, filepath);

    // Tamper the file: shift kienzle.P.kc1_1 by +0.5 N/mm² — silent drift
    // simulating a bad merge or a hand-edited "tweaked" sidecar in the field.
    const original = JSON.parse(readFileSync(filepath, "utf8")) as Record<string, unknown>;
    const kienzle = original.kienzle as Record<string, { kc1_1: number; mc: number }>;
    kienzle.P.kc1_1 = kienzle.P.kc1_1 + 0.5;
    writeFileSync(filepath, JSON.stringify(original, null, 2) + "\n", "utf8");

    // Node-side loader rejects.
    await expect(PhysicsSidecarBuilderEngine.loadAndVerify(filepath)).rejects.toThrow(
      /sha_mismatch/,
    );

    // Pure-JS loader rejects with the same fundamental reason.
    const tamperedText = readFileSync(filepath, "utf8");
    expect(() =>
      loadPhysicsSidecar(tamperedText, {
        expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
      }),
    ).toThrow(/SHA mismatch/);
  });

  it("[failure 2] schema_version mismatch — pure-JS loader fails before SHA check", () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });
    const text = JSON.stringify(sealed);
    expect(() =>
      loadPhysicsSidecar(text, { expectedSchemaVersion: "9.9.9" }),
    ).toThrow(/schema version mismatch/);
  });

  it("[failure 3] invalid sha256 format in meta — both layers refuse without recomputing", async () => {
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });
    const broken = {
      ...sealed,
      meta: { ...sealed.meta, sha256: "definitely-not-64-hex-chars" },
    };

    // Builder.verify routes through schema first → schema_invalid (sha regex
    // rejects), not sha_mismatch.
    const v = PhysicsSidecarBuilderEngine.verify(broken);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("schema_invalid");

    // Pure-JS loader's regex (^[0-9a-f]{64}$) catches it before SHA recompute.
    expect(() =>
      loadPhysicsSidecar(JSON.stringify(broken), {
        expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
      }),
    ).toThrow(/64-char lowercase hex/);
  });

  // ============================================================================
  // ADVERSARIAL (2 scenarios)
  // ============================================================================

  it("[adversarial 1] key-order independence — same payload built two ways yields byte-identical SHA", () => {
    const a = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: { Builder: "1.0.0", Schema: POST_PHYSICS_SIDECAR_SCHEMA_VERSION },
      generated_at: FIXED_GENERATED_AT,
    });
    // Same logical inputs, keys constructed in reverse order in the source map.
    const b = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: { Schema: POST_PHYSICS_SIDECAR_SCHEMA_VERSION, Builder: "1.0.0" },
      generated_at: FIXED_GENERATED_AT,
    });
    expect(a.meta.sha256).toBe(b.meta.sha256);

    // Adversarial canonicalisation: a hand-built object with intentionally
    // shuffled keys must hash identically to a "natural" build.
    const naturalPayload = {
      meta: { x: 1, y: 2 },
      data: { alpha: 1, beta: 2, gamma: 3 },
    };
    const shuffledPayload = {
      data: { gamma: 3, alpha: 1, beta: 2 },
      meta: { y: 2, x: 1 },
    };
    expect(PhysicsSidecarBuilderEngine.canonicalize(naturalPayload)).toBe(
      PhysicsSidecarBuilderEngine.canonicalize(shuffledPayload),
    );
    expect(pureCanonicalize(naturalPayload)).toBe(pureCanonicalize(shuffledPayload));
    expect(pureCanonicalize(naturalPayload)).toBe(
      PhysicsSidecarBuilderEngine.canonicalize(naturalPayload),
    );
  });

  it("[adversarial 2] float-precision parity — Node JSON.stringify ≡ pure-JS canonicalize on edge floats", () => {
    // The pure-JS implementation routes numbers through Rhino-portable
    // JSON.stringify (same as Node) — but a future refactor that swaps in a
    // hand-rolled float formatter would silently produce divergent SHAs.
    // Pin the parity now so any drift trips this test, not a phantom MS9
    // canary alarm in the field.
    const cases: unknown[] = [
      { x: 0.1 + 0.2 }, // classic IEEE-754 doublet → "0.30000000000000004"
      { x: 1e-10 },
      { x: 1e21 }, // crosses the JSON exponential-notation cutoff
      { x: -0 }, // JSON.stringify(-0) === "0" — both impls must agree
      { x: 9007199254740992 }, // 2^53, edge of safe-integer range
      { vals: [0.1, 0.2, 0.30000000000000004] },
    ];
    for (const c of cases) {
      expect(pureCanonicalize(c)).toBe(PhysicsSidecarBuilderEngine.canonicalize(c));
      expect(pureSha256Hex(pureCanonicalize(c))).toBe(
        PhysicsSidecarBuilderEngine.computeSha256(PhysicsSidecarBuilderEngine.canonicalize(c)),
      );
    }
    // Non-finite numbers must fail-closed in both implementations.
    expect(() => pureCanonicalize({ x: NaN })).toThrow(/non-finite/);
    expect(() => PhysicsSidecarBuilderEngine.canonicalize({ x: NaN })).toThrow(/non-finite/);
    expect(() => pureCanonicalize({ x: Infinity })).toThrow(/non-finite/);
    expect(() => PhysicsSidecarBuilderEngine.canonicalize({ x: Infinity })).toThrow(/non-finite/);
  });

  it("[adversarial 3] _meta_without_sha envelope collision — payload-injected key cannot smuggle bogus meta", async () => {
    // The sealing envelope is `{ ...payload, _meta_without_sha: metaWithoutSha }`.
    // An attacker who controls the on-disk JSON might try to inject a
    // top-level `_meta_without_sha` payload key hoping to confuse the verifier.
    // Two requirements: schema rejects/strips the bogus key, AND the verifier
    // path never sees it (because spread takes the genuine meta last).
    const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
      source_engine_versions: FIXED_VERSIONS,
      generated_at: FIXED_GENERATED_AT,
    });

    // 1. Forge a sidecar with an extra root-level _meta_without_sha key.
    const forged = {
      ...sealed,
      _meta_without_sha: { schema_version: "0.0.0", attacker: "owned" },
    } as unknown;

    // Schema strips unknown root keys (zod default behaviour); parsed sidecar
    // must NOT carry the bogus key forward.
    const parsed = parseSidecarSafe(forged);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(Object.prototype.hasOwnProperty.call(parsed.sidecar, "_meta_without_sha")).toBe(false);
    }

    // 2. Verify still passes — the legit SHA over the genuine payload is
    // unchanged because the bogus key never participated in canonicalisation.
    const v = PhysicsSidecarBuilderEngine.verify(forged);
    expect(v.ok).toBe(true);
    expect(v.recomputed_sha).toBe(sealed.meta.sha256);

    // 3. Round-trip through the pure-JS loader: the envelope construction
    // `{ ...payload, _meta_without_sha: metaWithoutSha }` makes the genuine
    // meta the LAST property in the spread — it overrides any smuggled
    // payload-level `_meta_without_sha` key. So the loader accepts the
    // forged file (the smuggling attempt has zero effect on the SHA path).
    const filepath = join(tmpDir, "forged.json");
    writeFileSync(filepath, JSON.stringify(forged, null, 2) + "\n", "utf8");
    const text = readFileSync(filepath, "utf8");
    const loaded = loadPhysicsSidecar(text, {
      expectedSchemaVersion: POST_PHYSICS_SIDECAR_SCHEMA_VERSION,
    });
    expect((loaded.meta as Record<string, unknown>).sha256).toBe(sealed.meta.sha256);

    // 4. Architectural gotcha worth documenting: pure-JS loader does NOT run
    // zod, so the bogus root-level _meta_without_sha key SURVIVES in the
    // object the loader returns. Downstream Rhino-side post code must not
    // branch on top-level keys outside the schema (kienzle/taylor/...). This
    // assertion pins the seam — if a future loader change starts stripping,
    // this test flips and forces an explicit decision about the new contract.
    expect(Object.prototype.hasOwnProperty.call(loaded, "_meta_without_sha")).toBe(true);
  });

  it("[adversarial 4] inline-constants scanner blocks a post that froze sidecar values", () => {
    // Pull the canonical P-group kc1_1 through the constants module — no inlined
    // numeric literal lives in this test file. This protects U-PPGM05 itself
    // from violating U-PPGM04.
    const frozenKc11 = CANONICAL_KIENZLE.P.kc1_1;
    expect(Number.isFinite(frozenKc11)).toBe(true);
    expect(frozenKc11).toBeGreaterThan(0);

    // Simulated bad post: hard-coded kc1_1 in a physics-named binding. Exactly
    // the regression a forked post would introduce after a calibration update.
    const badSource = `// Hurco V11 post — fragment\nfunction kienzleForceP(b, h, mc) {\n  var kc1_1 = ${frozenKc11};\n  return kc1_1 * b * Math.pow(h, 1 - mc);\n}\n`;

    const result = NoInlinePhysicsConstantsEngine.scan(badSource, { tier: "shop_floor" });
    expect(result.verdict).toBe("HARD_BLOCK");
    expect(result.summary.high).toBeGreaterThanOrEqual(1);
    expect(result.findings.some((f) => f.constant_class === "kienzle_kc1_1")).toBe(true);

    // scanOrThrow is the build-pipeline gate — must throw on the same input.
    expect(() => NoInlinePhysicsConstantsEngine.scanOrThrow(badSource, { tier: "shop_floor" })).toThrow(
      /HARD_BLOCK/,
    );

    // Inverse property: a post that loads through sidecar.kienzle.P.kc1_1
    // (no literal) must PASS at every tier.
    const goodSource = `function kienzleForceP(b, h, mc, sidecar) {\n  return sidecar.kienzle.P.kc1_1 * b * Math.pow(h, 1 - mc);\n}\n`;
    const goodResult = NoInlinePhysicsConstantsEngine.scan(goodSource, { tier: "shop_floor" });
    expect(goodResult.verdict).toBe("PASS");
    expect(goodResult.findings).toHaveLength(0);
  });
});
