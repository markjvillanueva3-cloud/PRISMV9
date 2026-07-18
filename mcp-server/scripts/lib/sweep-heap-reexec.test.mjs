/**
 * Tests for sweep-heap-reexec.mjs -- the SFC-sweep "relaunch with a bigger heap" guard.
 * Run: node scripts/lib/sweep-heap-reexec.test.mjs   (node:test auto-runs on exit)
 *
 * Verifies the INTENT (R9): full-mode with a default heap relaunches with --max-old-space-size;
 * prod-mode / already-bumped / breaker / opt-out do NOT relaunch; the spawned child env actually
 * carries the heap flag + breaker (the contract that the child WILL get the heap).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldReexecForHeap,
  resolveHeapMb,
  buildHeapChildEnv,
  reexecForHeapIfNeeded,
} from "./sweep-heap-reexec.mjs";

test("shouldReexecForHeap: full mode with clean env -> true", () => {
  assert.equal(shouldReexecForHeap(["--mode", "full"], {}), true);
  assert.equal(shouldReexecForHeap(["--no-vendor", "--mode", "full", "--out", "x"], {}), true);
});

test("shouldReexecForHeap: prod / missing / wrong value -> false", () => {
  assert.equal(shouldReexecForHeap(["--mode", "prod"], {}), false);
  assert.equal(shouldReexecForHeap([], {}), false); // no --mode at all
  assert.equal(shouldReexecForHeap(["--mode"], {}), false); // --mode with no value
  assert.equal(shouldReexecForHeap(["--mode", "fullish"], {}), false); // not exactly "full"
});

test("shouldReexecForHeap: breaker / opt-out suppress relaunch", () => {
  assert.equal(shouldReexecForHeap(["--mode", "full"], { PRISM_SFC_SWEEP_HEAP_REEXEC: "1" }), false);
  assert.equal(shouldReexecForHeap(["--mode", "full"], { PRISM_SFC_SWEEP_NO_HEAP_REEXEC: "1" }), false);
});

test("shouldReexecForHeap: NODE_OPTIONS already carries a heap flag -> false (both separators)", () => {
  assert.equal(shouldReexecForHeap(["--mode", "full"], { NODE_OPTIONS: "--max-old-space-size=8192" }), false);
  assert.equal(shouldReexecForHeap(["--mode", "full"], { NODE_OPTIONS: "--max_old_space_size=8192" }), false);
  assert.equal(
    shouldReexecForHeap(["--mode", "full"], { NODE_OPTIONS: "--enable-source-maps --max-old-space-size=4096" }),
    false,
  );
});

test("resolveHeapMb: default 32768; knob override; invalid -> default", () => {
  assert.equal(resolveHeapMb({}), 32768);
  assert.equal(resolveHeapMb({ PRISM_SFC_SWEEP_HEAP_MB: "16384" }), 16384);
  assert.equal(resolveHeapMb({ PRISM_SFC_SWEEP_HEAP_MB: "0" }), 32768); // non-positive -> default
  assert.equal(resolveHeapMb({ PRISM_SFC_SWEEP_HEAP_MB: "abc" }), 32768); // NaN -> default
  assert.equal(resolveHeapMb({ PRISM_SFC_SWEEP_HEAP_MB: "8192.9" }), 8192); // floored
});

test("buildHeapChildEnv: appends heap flag + sets breaker, preserving existing NODE_OPTIONS", () => {
  const clean = buildHeapChildEnv({}, 32768);
  assert.equal(clean.NODE_OPTIONS, "--max-old-space-size=32768");
  assert.equal(clean.PRISM_SFC_SWEEP_HEAP_REEXEC, "1");

  const withExisting = buildHeapChildEnv({ NODE_OPTIONS: "--enable-source-maps", FOO: "bar" }, 16384);
  assert.equal(withExisting.NODE_OPTIONS, "--enable-source-maps --max-old-space-size=16384");
  assert.equal(withExisting.FOO, "bar"); // unrelated env preserved
  assert.equal(withExisting.PRISM_SFC_SWEEP_HEAP_REEXEC, "1");
});

test("reexecForHeapIfNeeded: non-full mode does NOT spawn", () => {
  let spawned = 0;
  const verdict = reexecForHeapIfNeeded("file:///x/sfc.mjs", {
    argv: ["--mode", "prod"],
    env: {},
    runner: () => {
      spawned++;
      return { status: 0 };
    },
    exit: () => {
      throw new Error("exit must not be called when no relaunch");
    },
  });
  assert.equal(spawned, 0);
  assert.deepEqual(verdict, { reexec: false, reason: "no-heap-reexec-needed" });
});

test("reexecForHeapIfNeeded: full mode spawns with heap flag + breaker, exits with child status", () => {
  let captured = null;
  let exitCode = null;
  reexecForHeapIfNeeded("file:///C:/x/sfc.mjs", {
    argv: ["--mode", "full", "--no-vendor"],
    env: { NODE_OPTIONS: "--enable-source-maps" },
    execArgv: ["--import", "tsx"],
    execPath: "/usr/bin/node",
    runner: (cmd, cmdArgs, opts) => {
      captured = { cmd, cmdArgs, opts };
      return { status: 0 };
    },
    exit: (c) => {
      exitCode = c; // injected non-exiting exit so the fn returns
    },
  });
  // execPath preserved; execArgv (tsx loader) preserved; script + argv forwarded
  assert.equal(captured.cmd, "/usr/bin/node");
  assert.deepEqual(captured.cmdArgs.slice(0, 2), ["--import", "tsx"]); // execArgv kept
  assert.ok(captured.cmdArgs.some((a) => a.endsWith("sfc.mjs")));
  assert.ok(captured.cmdArgs.includes("--no-vendor")); // user argv forwarded
  // The child env actually carries the heap flag (the real contract) + breaker, with existing
  // NODE_OPTIONS preserved.
  assert.equal(captured.opts.env.NODE_OPTIONS, "--enable-source-maps --max-old-space-size=32768");
  assert.equal(captured.opts.env.PRISM_SFC_SWEEP_HEAP_REEXEC, "1");
  assert.equal(captured.opts.windowsHide, true);
  assert.equal(exitCode, 0); // exits with child.status
});

test("reexecForHeapIfNeeded: a child that fails to start exits 1 (fail loud)", () => {
  let exitCode = null;
  reexecForHeapIfNeeded("file:///C:/x/sfc.mjs", {
    argv: ["--mode", "full"],
    env: {},
    runner: () => ({ error: new Error("ENOENT") }),
    exit: (c) => {
      exitCode = c;
    },
  });
  assert.equal(exitCode, 1);
});
