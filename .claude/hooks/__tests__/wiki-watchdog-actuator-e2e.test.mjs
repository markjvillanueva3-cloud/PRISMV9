// tier: T3
/**
 * iter14 — real-subprocess E2E oracle for the iter13 actuator.
 *
 * Locks the iter10 lesson the hard way: hermetic unit tests that fake the
 * filesystem can pass while the production wiring is 100% broken (iter10's
 * 75%-false-positive probe-path bug was invisible to its 13/13 hermetic test
 * suite because no test ever invoked the script as a subprocess). This oracle
 * spawns the actual hook as a child process with a real (sandboxed) repo tree
 * and asserts the stamp file actually gets written.
 *
 * Test fixture:
 *   - tmpdir/scripts/wiki-propagation-watchdog.mjs    (stub — exits 0)
 *   - tmpdir/scripts/system-viz-on-commit.mjs         (stub — exits 0)
 *   - tmpdir/state/shared/wiki-propagation-watchdog.jsonl  (fake CRITICAL row)
 *
 * Env:
 *   PRISM_WIKI_WATCHDOG_REPO_ROOT=<tmpdir>
 *   PRISM_WIKI_WATCHDOG_AUTO_RECOVER=1
 *
 * Assertions:
 *   - Hook stdout starts with {"continue":true ...}
 *   - state/shared/.wiki-watchdog-recover-system-viz.stamp got written
 *   - additionalContext contains "auto-recovery: spawned"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "wiki-propagation-watchdog-stop.mjs",
);

/** Build a sandboxed repo tree the hook can drive against. */
function buildSandbox() {
  const root = mkdtempSync(join(tmpdir(), "wiki-watchdog-e2e-"));
  // scripts/ — stub watchdog + the recovery target
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(
    join(root, "scripts", "wiki-propagation-watchdog.mjs"),
    "#!/usr/bin/env node\nprocess.exit(0);\n",
  );
  writeFileSync(
    join(root, "scripts", "system-viz-on-commit.mjs"),
    "#!/usr/bin/env node\nprocess.exit(0);\n",
  );
  // state/shared/ — telemetry file (with critical row) + space for stamps
  mkdirSync(join(root, "state", "shared"), { recursive: true });
  return root;
}

/** Write a telemetry row representing the given staleness state. */
function writeTelemetry(root, row) {
  writeFileSync(
    join(root, "state", "shared", "wiki-propagation-watchdog.jsonl"),
    JSON.stringify(row) + "\n",
  );
}

/** Run the hook as a subprocess, returning the parsed verdict + stdout. */
function runHook(root, extraEnv = {}) {
  const result = spawnSync(
    process.execPath,
    [HOOK_PATH],
    {
      input: "{}",
      env: {
        ...process.env,
        PRISM_WIKI_WATCHDOG_REPO_ROOT: root,
        // Force-flat throttle so the inner watchdog spawn can run too; the
        // RECOVERY actuator has its OWN per-stage stamp + cooldown.
        PRISM_WIKI_WATCHDOG_THROTTLE_MS: "1",
        ...extraEnv,
      },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    /* leave parsed=null on garbage stdout */
  }
  return { result, parsed };
}

describe("E2E — iter13 actuator end-to-end (subprocess oracle)", () => {
  test("AUTO_RECOVER=1 + critical-aged telemetry → recovery stamp written + advisory emitted", () => {
    const root = buildSandbox();
    try {
      // Fake-critical row: system-viz 10h stale (> 8h hard threshold).
      writeTelemetry(root, {
        ts: new Date().toISOString(),
        status: "critical",
        staleCount: 1,
        stages: [
          {
            stage: "system-viz",
            stale: true,
            ageHrs: 10.5,
            reason: "10.5h > 4h",
          },
        ],
      });
      const { result, parsed } = runHook(root, {
        PRISM_WIKI_WATCHDOG_AUTO_RECOVER: "1",
      });
      assert.equal(result.status, 0, `hook exit code: ${result.status}`);
      assert.ok(parsed, `hook produced unparseable stdout: ${result.stdout}`);
      assert.equal(parsed.continue, true);
      const ctx =
        parsed.hookSpecificOutput &&
        parsed.hookSpecificOutput.additionalContext;
      assert.ok(ctx, `expected additionalContext, got: ${JSON.stringify(parsed)}`);
      assert.match(ctx, /auto-recovery: spawned/);
      assert.match(ctx, /stage=system-viz/);
      // The recovery stamp MUST exist after the hook returns.
      const stampPath = join(
        root,
        "state",
        "shared",
        ".wiki-watchdog-recover-system-viz.stamp",
      );
      assert.ok(
        existsSync(stampPath),
        `recovery stamp not written at ${stampPath}`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("AUTO_RECOVER unset → no stamp, no recovery line", () => {
    const root = buildSandbox();
    try {
      writeTelemetry(root, {
        ts: new Date().toISOString(),
        status: "critical",
        staleCount: 1,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 10.5, reason: "10.5h > 4h" },
        ],
      });
      const { result, parsed } = runHook(root, {});
      assert.equal(result.status, 0);
      assert.ok(parsed);
      assert.equal(parsed.continue, true);
      const ctx =
        parsed.hookSpecificOutput &&
        parsed.hookSpecificOutput.additionalContext;
      // ctx may be absent or present (with only watchdog launched line) — but
      // it must NOT contain auto-recovery
      if (ctx) {
        assert.doesNotMatch(ctx, /auto-recovery: spawned/);
      }
      const stampPath = join(
        root,
        "state",
        "shared",
        ".wiki-watchdog-recover-system-viz.stamp",
      );
      assert.equal(
        existsSync(stampPath),
        false,
        "recovery stamp must NOT be written when AUTO_RECOVER is unset",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("AUTO_RECOVER=1 + clean telemetry → no recovery action", () => {
    const root = buildSandbox();
    try {
      writeTelemetry(root, {
        ts: new Date().toISOString(),
        status: "clean",
        staleCount: 0,
        stages: [{ stage: "system-viz", stale: false, ageHrs: 0.5 }],
      });
      const { result, parsed } = runHook(root, {
        PRISM_WIKI_WATCHDOG_AUTO_RECOVER: "1",
      });
      assert.equal(result.status, 0);
      assert.ok(parsed);
      assert.equal(parsed.continue, true);
      const stampPath = join(
        root,
        "state",
        "shared",
        ".wiki-watchdog-recover-system-viz.stamp",
      );
      assert.equal(existsSync(stampPath), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("AUTO_RECOVER=1 + warn-band age (< hard threshold) → no recovery", () => {
    const root = buildSandbox();
    try {
      // system-viz warn threshold=4h, hard=8h → 5h is warn-only
      writeTelemetry(root, {
        ts: new Date().toISOString(),
        status: "warn",
        staleCount: 1,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 5.0, reason: "5h > 4h" },
        ],
      });
      const { result, parsed } = runHook(root, {
        PRISM_WIKI_WATCHDOG_AUTO_RECOVER: "1",
      });
      assert.equal(result.status, 0);
      assert.ok(parsed);
      assert.equal(parsed.continue, true);
      const stampPath = join(
        root,
        "state",
        "shared",
        ".wiki-watchdog-recover-system-viz.stamp",
      );
      assert.equal(existsSync(stampPath), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("recovery cooldown — second invocation within 1h does not re-spawn", () => {
    const root = buildSandbox();
    try {
      writeTelemetry(root, {
        ts: new Date().toISOString(),
        status: "critical",
        staleCount: 1,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 50, reason: "50h > 4h" },
        ],
      });
      // First run — should spawn + stamp
      const a = runHook(root, { PRISM_WIKI_WATCHDOG_AUTO_RECOVER: "1" });
      assert.equal(a.result.status, 0);
      const stampPath = join(
        root,
        "state",
        "shared",
        ".wiki-watchdog-recover-system-viz.stamp",
      );
      assert.ok(existsSync(stampPath), "first run must write stamp");
      // Second run — stamp exists, cooldown should suppress
      const b = runHook(root, { PRISM_WIKI_WATCHDOG_AUTO_RECOVER: "1" });
      assert.equal(b.result.status, 0);
      assert.ok(b.parsed);
      const ctx =
        b.parsed.hookSpecificOutput &&
        b.parsed.hookSpecificOutput.additionalContext;
      if (ctx) {
        assert.doesNotMatch(
          ctx,
          /auto-recovery: spawned/,
          "second run must NOT respawn",
        );
        assert.match(
          ctx,
          /cooldown active/,
          "second run should report cooldown",
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("PRISM_WIKI_WATCHDOG_DISABLE=1 short-circuits the actuator", () => {
    const root = buildSandbox();
    try {
      writeTelemetry(root, {
        ts: new Date().toISOString(),
        status: "critical",
        staleCount: 1,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 50, reason: "50h > 4h" },
        ],
      });
      const { result, parsed } = runHook(root, {
        PRISM_WIKI_WATCHDOG_AUTO_RECOVER: "1",
        PRISM_WIKI_WATCHDOG_DISABLE: "1",
      });
      assert.equal(result.status, 0);
      assert.ok(parsed);
      assert.equal(parsed.continue, true);
      // No advisory, no recovery, no stamps (whole hook is no-op)
      const stampPath = join(
        root,
        "state",
        "shared",
        ".wiki-watchdog-recover-system-viz.stamp",
      );
      assert.equal(existsSync(stampPath), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
