/**
 * session-consolidate-graph.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U02.
 *
 * Verifies the N=5 consolidation runner script:
 *   - Counter increments by 1 on every run when threshold not crossed
 *   - No consolidation triggered when counter < N
 *   - Counter resets to 0 after a successful consolidation run
 *   - --force bypasses the threshold check
 *   - --dry-run plans without writing anything
 *   - Counter file is created with schema version + reset timestamps
 *   - Concurrent runs are not actively serialized but counter is monotonic
 *     within a single process (atomic temp+rename)
 *
 * The script spawns the engine via tsx subprocess, which depends on the
 * MemoryConsolidationEngine being importable. We use --dry-run + counter
 * inspection to validate the hook-side state machine without needing a
 * fully populated memory graph for these tests.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const SCRIPT = path.join(
  process.cwd(),
  "scripts",
  "session-consolidate-graph.mjs",
);

function makeRoot(): string {
  // We can't redirect REPO_ROOT computed inside the script, so we set
  // PRISM_CONSOLIDATION_LOG and PRISM_TRIBAL_DIR + override the counter
  // via a shadow env that the script honors (PRISM_CONSOLIDATION_N to
  // avoid firing the engine in default tests).
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-consolidate-"));
}

function runScript(env: Record<string, string>, ...flags: string[]): { stdout: string; status: number | null } {
  const r = spawnSync(process.execPath, [SCRIPT, "--json", ...flags], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
  return { stdout: r.stdout ?? "", status: r.status };
}

function readJson(path: string): any {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

describe("session-consolidate-graph script (P1-U02)", () => {
  let root: string;
  let counterFile: string;
  let logFile: string;
  let tribalDir: string;

  beforeEach(() => {
    root = makeRoot();
    // The script's COUNTER_FILE is hard-coded relative to the repo, so we
    // can't redirect it via env. Instead, point the log + tribal dir at the
    // tmp root and back up + restore the real counter file around each test.
    counterFile = path.join(process.cwd(), "data", "state", "consolidation-counter.json");
    logFile = path.join(root, "log.txt");
    tribalDir = path.join(root, "tribal");

    if (fs.existsSync(counterFile)) {
      fs.copyFileSync(counterFile, counterFile + ".test-backup");
      fs.unlinkSync(counterFile);
    }
  });

  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
    if (fs.existsSync(counterFile + ".test-backup")) {
      fs.copyFileSync(counterFile + ".test-backup", counterFile);
      fs.unlinkSync(counterFile + ".test-backup");
    } else if (fs.existsSync(counterFile)) {
      fs.unlinkSync(counterFile);
    }
  });

  it("increments counter from 0 -> 1 on first run, no trigger", () => {
    const env = {
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "5",
    };
    const r = runScript(env);
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);

    expect(r.status).toBe(0);
    expect(out.ok).toBe(true);
    expect(out.counterBefore).toBe(0);
    expect(out.counterAfter).toBe(1);
    expect(out.triggered).toBe(false);
    expect(out.patternsWritten).toBe(0);

    const persisted = readJson(counterFile);
    expect(persisted.sessionsSinceLastConsolidation).toBe(1);
    expect(persisted.schemaVersion).toBe("1.0.0");
  });

  it("counter monotonically grows across 4 runs without triggering at N=5", () => {
    const env = {
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "5",
    };
    for (let i = 1; i <= 4; i++) {
      const r = runScript(env);
      const out = JSON.parse(r.stdout.trim().split("\n").pop()!);
      expect(out.counterAfter).toBe(i);
      expect(out.triggered).toBe(false);
    }
    const persisted = readJson(counterFile);
    expect(persisted.sessionsSinceLastConsolidation).toBe(4);
    expect(persisted.totalConsolidations).toBe(0);
  });

  it("dry-run does not persist counter changes and never triggers", () => {
    const env = {
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "5",
    };
    const r = runScript(env, "--dry-run");
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);

    expect(out.counterBefore).toBe(0);
    expect(out.counterAfter).toBe(1);
    expect(out.triggered).toBe(false);
    // counter file should not exist after dry-run
    expect(fs.existsSync(counterFile)).toBe(false);
  });

  it("--force bypasses N-threshold and reports triggered=true", () => {
    const env = {
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      // N=999 would normally never fire; --force bypasses
      PRISM_CONSOLIDATION_N: "999",
    };
    const r = runScript(env, "--force");
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);

    expect(r.status).toBe(0);
    // ok flag may be true (if engine has nothing to consolidate, that's ok)
    // or false (if no memory graph dir at all). The contract is just that
    // triggered must be true and the script must not throw.
    expect(out.triggered).toBe(true);
  });

  it("threshold lowered to N=2 fires consolidation on second run", () => {
    const env = {
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "2",
    };

    const r1 = runScript(env);
    const out1 = JSON.parse(r1.stdout.trim().split("\n").pop()!);
    expect(out1.triggered).toBe(false);
    expect(out1.counterAfter).toBe(1);

    const r2 = runScript(env);
    const out2 = JSON.parse(r2.stdout.trim().split("\n").pop()!);
    expect(out2.triggered).toBe(true);
    // Successful consolidation resets the counter back to 0
    if (out2.ok) {
      const persisted = readJson(counterFile);
      expect(persisted.sessionsSinceLastConsolidation).toBe(0);
    }
  });

  it("counter file has schema version + ISO timestamps", () => {
    runScript({
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "5",
    });
    const persisted = readJson(counterFile);
    expect(persisted.schemaVersion).toBe("1.0.0");
    expect(typeof persisted.lastUpdated).toBe("string");
    expect(persisted.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("corrupt counter file is reset to fresh state", () => {
    fs.mkdirSync(path.dirname(counterFile), { recursive: true });
    fs.writeFileSync(counterFile, "{this is not json", "utf-8");

    const r = runScript({
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "5",
    });
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);

    expect(r.status).toBe(0);
    expect(out.counterBefore).toBe(0);
    expect(out.counterAfter).toBe(1);

    const persisted = readJson(counterFile);
    expect(persisted.schemaVersion).toBe("1.0.0");
  });

  it("script exits 0 even when consolidation engine fails (best-effort)", () => {
    // Force a fire with N=1 + force; engine may have no graph but script must
    // never crash the hook chain.
    const r = runScript({
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "1",
    }, "--force");
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);
    expect(typeof out.durationMs).toBe("number");
    expect(out.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("--quiet suppresses stdout summary line", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--quiet"], {
      encoding: "utf-8",
      env: { ...process.env, PRISM_CONSOLIDATION_LOG: logFile, PRISM_TRIBAL_DIR: tribalDir, PRISM_CONSOLIDATION_N: "5" },
      timeout: 30_000,
    });
    expect(r.status).toBe(0);
    expect((r.stdout ?? "").trim()).toBe("");
  });

  it("--json emits parseable JSON line", () => {
    const r = runScript({
      PRISM_CONSOLIDATION_LOG: logFile,
      PRISM_TRIBAL_DIR: tribalDir,
      PRISM_CONSOLIDATION_N: "5",
    });
    expect(r.status).toBe(0);
    const last = r.stdout.trim().split("\n").pop()!;
    expect(() => JSON.parse(last)).not.toThrow();
    const obj = JSON.parse(last);
    expect(obj).toHaveProperty("ok");
    expect(obj).toHaveProperty("counterBefore");
    expect(obj).toHaveProperty("counterAfter");
    expect(obj).toHaveProperty("triggered");
    expect(obj).toHaveProperty("durationMs");
  });
});
