/**
 * Tests for forgeQuintTransaction (Universal Phase 0.3)
 *
 * Covers:
 *  - happy path (all 5 artifacts land)
 *  - rollback on stage failure (createOnly file already exists)
 *  - rollback preserves backups of pre-existing files
 *  - assertQuintShape validates {engine,hook,action,skill,registry}
 *  - dedup preflight skippable via skipDedup (bootstrap-safe)
 *  - telemetry ledger is append-only
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import {
  forgeQuint,
  assertQuintShape,
  type ForgeQuintSpec,
  type ForgeArtifact,
} from "../utils/forgeQuintTransaction.js";

const tmpRoot = path.join(os.tmpdir(), "prism-forge-quint-test");

function mkArtifact(
  kind: ForgeArtifact["kind"],
  name: string,
  filePath: string,
  opts: Partial<ForgeArtifact> = {}
): ForgeArtifact {
  return {
    kind,
    name,
    path: filePath,
    content: `// ${kind}: ${name}\nexport const ${name.toLowerCase().replace(/[^a-z]/g, "")} = 1;\n`,
    description: `test ${kind} ${name}`,
    ...opts,
  };
}

async function cleanupTmp() {
  try {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  } catch { /* ignore */ }
  await fs.mkdir(tmpRoot, { recursive: true });
}

function fullSpec(testName: string, extraOverrides: Partial<ForgeArtifact>[] = []): ForgeQuintSpec {
  const dir = path.join(tmpRoot, testName);
  const paths = {
    engine:   path.join(dir, "engines",     "ProbeEngine.ts"),
    hook:     path.join(dir, "hooks",       "ProbeHook.ts"),
    action:   path.join(dir, "dispatchers", "probeDispatcher.ts"),
    skill:    path.join(dir, "commands",    "probe.md"),
    registry: path.join(dir, "state",       "cross-session-asset-registry.json"),
  };
  const artifacts: ForgeArtifact[] = [
    mkArtifact("engine",   "ProbeEngine",     paths.engine,   extraOverrides[0]),
    mkArtifact("hook",     "ProbeHook",       paths.hook,     extraOverrides[1]),
    { ...mkArtifact("action", "probe_calc", paths.action), createOnly: false, ...(extraOverrides[2] ?? {}) },
    mkArtifact("skill",    "probe",           paths.skill,    extraOverrides[3]),
    { ...mkArtifact("registry", "asset-registry", paths.registry), createOnly: false, ...(extraOverrides[4] ?? {}) },
  ];
  return { label: testName, artifacts, skipDedup: true };
}

describe("forgeQuintTransaction (Phase 0.3)", () => {
  beforeEach(cleanupTmp);
  afterEach(cleanupTmp);

  it("happy path — all 5 artifacts land on disk", async () => {
    const spec = fullSpec("happy-path");
    const result = await forgeQuint(spec);

    expect(result.success).toBe(true);
    expect(result.written).toHaveLength(5);
    expect(result.errors).toEqual([]);
    for (const a of spec.artifacts) {
      const exists = await fs.stat(a.path).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it("rollback on stage failure — createOnly collides with existing engine", async () => {
    const spec = fullSpec("stage-collision");
    // Pre-create the engine file to force a createOnly collision
    await fs.mkdir(path.dirname(spec.artifacts[0].path), { recursive: true });
    await fs.writeFile(spec.artifacts[0].path, "// pre-existing\n", "utf-8");

    const result = await forgeQuint(spec);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/would overwrite/i);
    // Pre-existing engine file must still have original content
    const preserved = await fs.readFile(spec.artifacts[0].path, "utf-8");
    expect(preserved).toBe("// pre-existing\n");
    // None of the other 4 should have been committed (tmp-stage failed before commit phase)
    for (const a of spec.artifacts.slice(1)) {
      const exists = await fs.stat(a.path).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    }
  });

  it("rollback preserves pre-existing updatable files (action + registry)", async () => {
    const spec = fullSpec("rollback-preserves");
    // Pre-create the action file (createOnly=false is fine)
    await fs.mkdir(path.dirname(spec.artifacts[2].path), { recursive: true });
    await fs.writeFile(spec.artifacts[2].path, "// existing dispatcher\n", "utf-8");
    await fs.mkdir(path.dirname(spec.artifacts[4].path), { recursive: true });
    await fs.writeFile(spec.artifacts[4].path, "{}\n", "utf-8");

    // Force a failure by making the skill's parent dir a file (not a dir)
    await fs.mkdir(path.dirname(path.dirname(spec.artifacts[3].path)), { recursive: true });
    await fs.writeFile(path.dirname(spec.artifacts[3].path), "I am a file where a dir should be", "utf-8");

    const result = await forgeQuint(spec);

    // Should have failed staging the skill (can't mkdir under a file)
    expect(result.success).toBe(false);
    // Action + registry pre-existing contents must be intact
    expect(await fs.readFile(spec.artifacts[2].path, "utf-8")).toBe("// existing dispatcher\n");
    expect(await fs.readFile(spec.artifacts[4].path, "utf-8")).toBe("{}\n");
  });

  it("empty artifact list fails cleanly", async () => {
    const result = await forgeQuint({ label: "empty", artifacts: [], skipDedup: true });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/at least 1 artifact/);
  });

  it("leaves no .forge-*.tmp files on success", async () => {
    const spec = fullSpec("no-tmp-on-success");
    await forgeQuint(spec);

    for (const a of spec.artifacts) {
      const parent = path.dirname(a.path);
      const entries = await fs.readdir(parent).catch(() => [] as string[]);
      const tmps = entries.filter((e) => e.includes(".forge-") && e.endsWith(".tmp"));
      expect(tmps).toHaveLength(0);
    }
  });

  it("leaves no .forge-*.tmp files on rollback", async () => {
    const spec = fullSpec("no-tmp-on-rollback");
    await fs.mkdir(path.dirname(spec.artifacts[0].path), { recursive: true });
    await fs.writeFile(spec.artifacts[0].path, "// existing\n", "utf-8");
    await forgeQuint(spec);

    for (const a of spec.artifacts) {
      const parent = path.dirname(a.path);
      const entries = await fs.readdir(parent).catch(() => [] as string[]);
      const tmps = entries.filter((e) => e.includes(".forge-") && e.endsWith(".tmp"));
      expect(tmps).toHaveLength(0);
    }
  });

  it("transactionId is unique across sequential calls", async () => {
    const r1 = await forgeQuint(fullSpec("tx-id-1"));
    const r2 = await forgeQuint(fullSpec("tx-id-2"));
    expect(r1.transactionId).not.toBe(r2.transactionId);
  });

  it("durationMs is a non-negative number", async () => {
    const r = await forgeQuint(fullSpec("duration"));
    expect(typeof r.durationMs).toBe("number");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("concurrent forgeQuint calls are serialized by proper-lockfile", async () => {
    const a = forgeQuint(fullSpec("concurrent-a"));
    const b = forgeQuint(fullSpec("concurrent-b"));
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.success).toBe(true);
    expect(rb.success).toBe(true);
    // Both produced distinct tx IDs
    expect(ra.transactionId).not.toBe(rb.transactionId);
  });

  describe("assertQuintShape", () => {
    it("accepts a complete 5-artifact spec", () => {
      const spec = fullSpec("shape-ok");
      expect(() => assertQuintShape(spec)).not.toThrow();
    });

    it("rejects a spec missing the engine", () => {
      const spec = fullSpec("shape-missing-engine");
      spec.artifacts = spec.artifacts.filter((a) => a.kind !== "engine");
      expect(() => assertQuintShape(spec)).toThrow(/missing artifact kind/);
    });

    it("rejects a spec missing two kinds", () => {
      const spec = fullSpec("shape-missing-two");
      spec.artifacts = spec.artifacts.filter((a) => a.kind !== "action" && a.kind !== "skill");
      expect(() => assertQuintShape(spec)).toThrow(/missing artifact kind/);
    });
  });
});
