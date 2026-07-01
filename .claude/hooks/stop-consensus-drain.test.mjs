// tier: T4
// Tests for .claude/hooks/stop-consensus-drain.mjs
// (INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTOFIRE; refactored import-safe + covered 2026-06-10, slot:bravo).
//
// node:test -- hermetic: queueDepth/pickDrainer take explicit paths and run() takes an
// injected spawnImpl, so NO real queue, drainer, or child process is touched. Verifies the
// Stop hook spawns the drainer ONLY when the queue is non-empty AND a drainer exists, and
// never throws (Stop must never block).
//
// Run: node --test H:/prism/.claude/hooks/stop-consensus-drain.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { queueDepth, pickDrainer, run, resolveNodeBin } from "./stop-consensus-drain.mjs";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "scd-drain-"));
const QUEUE = path.join(TMP, "queue.jsonl");
const DRAINER = path.join(TMP, "drainer.mjs");
const LOG = path.join(TMP, "drain.log"); // hermetic log target so tests never touch the real drain log
fs.writeFileSync(DRAINER, "// fake drainer\n");

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best-effort */ } });

test("queueDepth: missing file = 0; empty = 0; counts non-blank lines only", () => {
  assert.equal(queueDepth(path.join(TMP, "nope.jsonl")), 0);
  fs.writeFileSync(QUEUE, "");
  assert.equal(queueDepth(QUEUE), 0);
  fs.writeFileSync(QUEUE, "a\n\n  \nb\nc\n"); // 3 non-blank lines
  assert.equal(queueDepth(QUEUE), 3);
});

test("pickDrainer: returns first existing candidate; null when none exist", () => {
  assert.equal(pickDrainer([path.join(TMP, "missing1.mjs"), DRAINER]), DRAINER);
  assert.equal(pickDrainer([path.join(TMP, "missing1.mjs"), path.join(TMP, "missing2.mjs")]), null);
});

test("run: empty queue -> {continue:true}, drainer NEVER spawned (zero overhead)", () => {
  fs.writeFileSync(QUEUE, "");
  let spawned = false;
  const r = run({ queuePath: QUEUE, candidates: [DRAINER], spawnImpl: () => { spawned = true; return { unref() {} }; } });
  assert.deepEqual(r, { continue: true });
  assert.equal(spawned, false); // depth 0 short-circuits before spawn
});

test("run: non-empty queue + drainer present -> spawns a REAL node bin with heap flag + --max=1, tees to log", () => {
  fs.writeFileSync(QUEUE, "x\ny\n"); // depth 2
  let bin = null;
  let args = null;
  let opts = null;
  let unrefed = false;
  const r = run({
    queuePath: QUEUE,
    candidates: [DRAINER],
    logPath: LOG,
    heapMb: 4096,
    nodeBin: "H:/Tools/nodejs/node.exe",
    spawnImpl: (b, a, o) => { bin = b; args = a; opts = o; return { unref() { unrefed = true; } }; },
  });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /queue=2/);
  assert.match(r.systemMessage, /spawned/);
  assert.match(r.systemMessage, /heap=4096MB/);
  // ROOT-CAUSE FIX: spawns the real node .exe, NOT the extensionless portable-node shim
  // (cp.spawn of an extensionless file ENOENTs async -> uncatchable -> silent dead autofire).
  assert.equal(bin, "H:/Tools/nodejs/node.exe");
  assert.ok(!/portable-node$/.test(bin), "must NOT spawn the extensionless portable-node shim");
  // node heap flag FIRST (before the script), then drainer, then --max=1
  assert.equal(args[0], "--max-old-space-size=4096");
  assert.equal(args[1], DRAINER);
  assert.equal(args[2], "--max=1");
  assert.equal(opts.detached, true);
  // stdio is redirected to the log fd (NOT "ignore") so a drain failure is no longer silent (R12)
  assert.ok(Array.isArray(opts.stdio), "stdio must be a fd array (log redirect), not 'ignore'");
  assert.equal(opts.stdio[0], "ignore");        // no stdin
  assert.equal(typeof opts.stdio[1], "number");  // stdout -> log fd
  assert.equal(opts.stdio[1], opts.stdio[2]);    // stderr -> same log fd
  assert.equal(unrefed, true);                   // child.unref() called so Stop is not held
  assert.ok(fs.existsSync(LOG), "the log file is created");
});

test("resolveNodeBin: returns the running node when it is a real node binary (never the shim)", () => {
  // a real node execPath is preferred + returned as-is
  const realExec = "H:/Tools/nodejs/node.exe";
  assert.equal(resolveNodeBin(realExec, (p) => p === realExec), realExec);
  // if execPath is somehow the extensionless shim, fall through to a known real .exe install
  const got = resolveNodeBin("H:/.claude/bin/portable-node", (p) => p === "H:/Tools/nodejs/node.exe");
  assert.equal(got, "H:/Tools/nodejs/node.exe");
  assert.ok(!/portable-node$/.test(got), "must never resolve to the extensionless portable-node shim");
  // ADVERSARIAL (the P1 the basename-anchor fix closes): execPath IS the shim AND the shim EXISTS on
  // disk. The old `/node(\.exe)?$/` regex false-matched `portable-node` and returned it (re-arming
  // the ENOENT bug). The anchored regex must reject it and fall through to the real install.
  const adversarial = resolveNodeBin("H:/.claude/bin/portable-node", () => true);
  assert.ok(!/portable-node$/.test(adversarial), "shim-exists-on-disk must NOT resolve to the shim (basename anchor rejects portable-node)");
  assert.equal(adversarial, "H:/Tools/nodejs/node.exe", "rejects the shim, takes the first real-install fallback");
  // sanity: the anchored regex accepts bare `node` and `node.exe`, rejects `portable-node`
  assert.equal(resolveNodeBin("/usr/bin/node", (p) => p === "/usr/bin/node"), "/usr/bin/node");
  // last resort: nothing on disk -> return execPath rather than throw (still a real binary)
  assert.equal(resolveNodeBin("C:/some/node.exe", () => false), "C:/some/node.exe");
});

test("run: heapMb is honored (Blackwell doctrine -- never the 432MB default)", () => {
  fs.writeFileSync(QUEUE, "x\n");
  let args = null;
  run({ queuePath: QUEUE, candidates: [DRAINER], logPath: LOG, heapMb: 2048, spawnImpl: (_b, a) => { args = a; return { unref() {} }; } });
  assert.equal(args[0], "--max-old-space-size=2048");
});

test("run: log-open failure falls back to stdio:'ignore' but STILL spawns (logging never blocks Stop)", () => {
  fs.writeFileSync(QUEUE, "x\n");
  let opts = null;
  let spawned = false;
  const throwingFs = { openSync: () => { throw new Error("EACCES"); }, closeSync: () => {} };
  const r = run({
    queuePath: QUEUE,
    candidates: [DRAINER],
    logPath: "/no/such/dir/drain.log",
    fsImpl: throwingFs,
    spawnImpl: (_b, _a, o) => { spawned = true; opts = o; return { unref() {} }; },
  });
  assert.equal(spawned, true, "a log-open failure must NOT prevent the drain spawn");
  assert.equal(opts.stdio, "ignore");
  assert.match(r.systemMessage, /log=unavailable/);
});

test("run: non-empty queue but NO drainer -> reports not-found, never spawns", () => {
  fs.writeFileSync(QUEUE, "x\ny\nz\n");
  let spawned = false;
  const r = run({ queuePath: QUEUE, candidates: [path.join(TMP, "none.mjs")], spawnImpl: () => { spawned = true; return {}; } });
  assert.match(r.systemMessage, /drainer not found/);
  assert.match(r.systemMessage, /queue=3/);
  assert.equal(spawned, false);
});

test("run: a throwing spawn never propagates (Stop must never block)", () => {
  fs.writeFileSync(QUEUE, "x\n");
  const r = run({ queuePath: QUEUE, candidates: [DRAINER], logPath: LOG, spawnImpl: () => { throw new Error("spawn boom"); } });
  assert.equal(r.continue, true);                // swallowed -> still continues
  assert.match(r.systemMessage, /spawned/);      // reports the attempt; does not crash Stop
});
