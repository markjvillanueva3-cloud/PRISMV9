// tier: T1
/**
 * emergency-c-temp-sweep.test.mjs -- FLEET-HYGIENE/U-GOLF-ENOSPC-SELFHEAL
 *
 * Fixture-based tests for the ENOSPC self-heal walks. Run:
 *   node --test .claude/hooks/lib/emergency-c-temp-sweep.test.mjs
 *
 * Fixtures live on H: (this suite must be runnable DURING a C: outage).
 * Covers: age gating, symlink non-follow (the agent-transcript hazard),
 * top-level-files-only scoping, NVIDIA recursive delete + dir cleanup,
 * marker throttling, and the disable knob / space-ok guard of emergencySweep.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  markerFresh,
  sweepClaudeTmp,
  sweepTempTopLevel,
  sweepNvidiaCaches,
  emergencySweep,
} from "./emergency-c-temp-sweep.mjs";

const FIX = path.join("H:/prism/.claude/hooks/lib", `.fixture-enospc-${process.pid}`);
const NOW = Date.now();
const OLD = NOW - 60 * 60 * 1000;        // 1h ago  (> 10min output threshold)
const ANCIENT = NOW - 8 * 24 * 3600e3;   // 8d ago  (> 3d temp threshold, > 2h json threshold)
const FRESH = NOW - 30 * 1000;           // 30s ago (< every threshold)

function mk(rel, content = "x", mtimeMs = NOW) {
  const f = path.join(FIX, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  const t = new Date(mtimeMs);
  fs.utimesSync(f, t, t);
  return f;
}

function freshTally() { return { files: 0, bytes: 0, errs: 0 }; }

test.after(() => { try { fs.rmSync(FIX, { recursive: true, force: true }); } catch { /* best-effort */ } });

test("sweepClaudeTmp deletes only old regular .output files", () => {
  const root = path.join(FIX, "claude-a");
  const oldOut = mk("claude-a/H--prism/sess1/tasks/aaa.output", "old-consumed", OLD);
  const freshOut = mk("claude-a/H--prism/sess1/tasks/bbb.output", "in-flight", FRESH);
  const nonOutput = mk("claude-a/H--prism/sess1/tasks/state.json", "keep", OLD);
  const oldJson = mk("claude-a/cache-break-state-x.json", "stale", ANCIENT);
  const freshJson = mk("claude-a/cache-break-state-y.json", "live", FRESH);

  const tally = freshTally();
  sweepClaudeTmp(NOW, tally, root);

  assert.equal(fs.existsSync(oldOut), false, "old .output deleted");
  assert.equal(fs.existsSync(freshOut), true, "fresh .output kept (in-flight)");
  assert.equal(fs.existsSync(nonOutput), true, "non-.output kept");
  assert.equal(fs.existsSync(oldJson), false, "stale cache-break json deleted");
  assert.equal(fs.existsSync(freshJson), true, "fresh cache-break json kept");
  assert.equal(tally.files, 2);
  assert.equal(tally.bytes, "old-consumed".length + "stale".length);
  assert.equal(tally.errs, 0);
});

test("sweepClaudeTmp never follows symlinked .output files (agent transcripts)", (t) => {
  const root = path.join(FIX, "claude-b");
  const transcript = mk("claude-b-target/transcript.jsonl", "PRECIOUS-AGENT-TRANSCRIPT", OLD);
  fs.mkdirSync(path.join(root, "H--prism/sess1/tasks"), { recursive: true });
  const link = path.join(root, "H--prism/sess1/tasks/agent123.output");
  try {
    fs.symlinkSync(transcript, link, "file");
  } catch {
    t.skip("symlink creation needs privileges on this host");
    return;
  }
  // age the symlink itself
  try { fs.lutimesSync(link, new Date(OLD), new Date(OLD)); } catch { /* lutimes optional */ }

  const tally = freshTally();
  sweepClaudeTmp(NOW, tally, root);

  assert.equal(fs.readFileSync(transcript, "utf8"), "PRECIOUS-AGENT-TRANSCRIPT", "transcript target untouched");
  // the symlink entry itself must NOT count as a swept regular file
  assert.equal(tally.files, 0, "symlink not swept as a file");
});

test("sweepTempTopLevel deletes only top-level files older than 3d; never recurses dirs", () => {
  const tmp = path.join(FIX, "temp-a");
  const ancientTop = mk("temp-a/ancient.tmp", "ancient!", ANCIENT);
  const freshTop = mk("temp-a/fresh.tmp", "fresh", FRESH);
  const inDir = mk("temp-a/appdir/ancient-in-dir.tmp", "app-owned", ANCIENT);

  const tally = freshTally();
  sweepTempTopLevel(NOW, tally, tmp);

  assert.equal(fs.existsSync(ancientTop), false, "ancient top-level file deleted");
  assert.equal(fs.existsSync(freshTop), true, "fresh top-level file kept");
  assert.equal(fs.existsSync(inDir), true, "files inside app dirs never touched");
  assert.equal(tally.files, 1);
  assert.equal(tally.bytes, "ancient!".length);
});

test("sweepNvidiaCaches empties known cache dirs recursively and removes empty subdirs", () => {
  const base = path.join(FIX, "nvidia");
  const dx = mk("nvidia/DXCache/sub/shader1.bin", "shader-bytes", FRESH); // age-irrelevant for caches
  const compute = mk("nvidia/ComputeCache/kern.cubin", "cubin", FRESH);
  const unknown = mk("nvidia/SomethingElse/keep.dat", "keep", ANCIENT);

  const tally = freshTally();
  sweepNvidiaCaches(tally, base);

  assert.equal(fs.existsSync(dx), false, "DXCache file deleted regardless of age");
  assert.equal(fs.existsSync(compute), false, "ComputeCache file deleted");
  assert.equal(fs.existsSync(unknown), true, "non-cache NVIDIA dirs untouched");
  assert.equal(fs.existsSync(path.join(base, "DXCache", "sub")), false, "emptied subdir removed");
  assert.equal(fs.existsSync(path.join(base, "DXCache")), true, "cache root dir itself kept");
  assert.equal(tally.files, 2);
  assert.equal(tally.bytes, "shader-bytes".length + "cubin".length);
});

test("markerFresh throttles within the window and rearms after it", () => {
  const marker = path.join(FIX, "marker.last");
  fs.mkdirSync(FIX, { recursive: true });
  const t0 = 1_000_000;
  assert.equal(markerFresh(marker, 120_000, t0), false, "first call proceeds + writes marker");
  assert.equal(markerFresh(marker, 120_000, t0 + 60_000), true, "inside window -> throttled");
  assert.equal(markerFresh(marker, 120_000, t0 + 121_000), false, "after window -> proceeds again");
  assert.equal(fs.readFileSync(marker, "utf8"), String(t0 + 121_000), "marker rewritten on proceed");
});

test("emergencySweep honors the disable knob", () => {
  const r = emergencySweep({ PRISM_EMERGENCY_C_SWEEP_DISABLE: "1" });
  assert.deepEqual(r, { ran: false, reason: "disabled" });
});

test("emergencySweep is a no-op when C: has headroom (space-ok guard)", () => {
  // This suite runs post-recovery: C: free is >500MB, so the guard must skip.
  // (During an actual outage this branch is unreachable -- verified live 2026-07-02.)
  const r = emergencySweep({});
  assert.equal(r.ran, false);
  assert.ok(["space-ok", "throttled"].includes(r.reason), `unexpected: ${r.reason}`);
});
