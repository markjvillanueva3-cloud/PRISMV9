#!/usr/bin/env node
/**
 * Hermetic tests for sfc-variability-resume-guard.mjs (v4 — two-task arch).
 *
 * Pins the P0s + P1s from three rounds of per-file scrutiny (2026-05-19):
 *   P0  resume skip = min over workers of max RECORD idx (not filename, not
 *       max) — multi-worker round-robin death must not produce silent gaps.
 *   P0  EMPTY enumeration → "indeterminate", never "dead".
 *   P0  the guard does NOT spawn the batch (a scheduled-task child dies when
 *       the task's job object closes) — it triggers the batch's OWN
 *       on-demand scheduled task. `runGuard` calls `deps.relaunch`, never
 *       spawns.
 *   P1-B  an un-flushed worker resumes at the sidecar's launchSkip, not ~0.
 *   P1-D  a SUBSET of [0,N) flushed is normal, NOT a worker-count mismatch.
 *   P1    cross-PC: a sidecar from another host whose ts is fresh within the
 *       CADENCE-scaled window (HOST_STALENESS_MIN, not the batch runtime) ⇒
 *       presumed alive there ⇒ no relaunch. The guard refreshes the sidecar
 *       ts on every alive-this-host pass so the window never lapses.
 *   P1    the lock is host-keyed (shared H: — one PC must not reap the
 *       other's live lock).
 *
 * Round-robin fact used by fixtures: with N workers, worker w owns 1-based
 * combo idx where (idx-1) % N === w, i.e. idx ≡ (w+1) mod N.
 *
 * Run: node --test scripts/sfc-variability-resume-guard.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOST_STALENESS_MIN,
  GUARD_CADENCE_MIN,
  batchTaskName,
  parseChunkName,
  groupChunksByWorker,
  lastNonEmptyLine,
  maxIdxInChunkText,
  computeResumeSkip,
  decideRelaunch,
  buildBatchArgv,
  classifyAliveFromLines,
  requirePositiveInt,
  pickResumeParams,
  readResumeState,
  readSidecar,
  decideHostOwnership,
  writeSidecar,
  buildSidecarRecord,
  lockPathForHost,
  runGuard,
  parseCliArgs,
} from "./sfc-variability-resume-guard.mjs";

const MIN_MS = 60 * 1000;

// ─── batchTaskName ───────────────────────────────────────────────────────
test("batchTaskName: domain → capitalized on-demand task name", () => {
  assert.equal(batchTaskName("mill"), "PRISM SFC Variability Batch Mill");
  assert.equal(batchTaskName("lathe"), "PRISM SFC Variability Batch Lathe");
});
test("HOST_STALENESS_MIN is cadence-scaled (≥ 2× guard cadence, not batch runtime)", () => {
  // The cross-PC window must track the guard cadence, NOT the 600-min batch
  // runtime — a crashed remote batch must be detectable within a few cadences.
  assert.ok(HOST_STALENESS_MIN >= 2 * GUARD_CADENCE_MIN, "staleness window too short");
  assert.ok(HOST_STALENESS_MIN < 60, "staleness window must not be batch-runtime scale");
});

// ─── parseChunkName ──────────────────────────────────────────────────────
test("parseChunkName: valid name → {workerIdx,startIdx}", () => {
  assert.deepEqual(parseChunkName("chunk-w0-000000200050.jsonl"), { workerIdx: 0, startIdx: 200050 });
  assert.deepEqual(parseChunkName("chunk-w3-000000400049.jsonl"), { workerIdx: 3, startIdx: 400049 });
});
test("parseChunkName: rejects non-string / malformed / wrong ext", () => {
  assert.equal(parseChunkName(null), null);
  assert.equal(parseChunkName(42), null);
  assert.equal(parseChunkName("chunk-w0.jsonl"), null);
  assert.equal(parseChunkName("chunk-wX-000000000001.jsonl"), null);
  assert.equal(parseChunkName("chunk-w0-000000000001.json"), null);
  assert.equal(parseChunkName("notachunk.jsonl"), null);
});

// ─── groupChunksByWorker ─────────────────────────────────────────────────
test("groupChunksByWorker: groups + sorts ascending by startIdx", () => {
  const g = groupChunksByWorker([
    "chunk-w0-000000000500.jsonl",
    "chunk-w0-000000000000.jsonl",
    "chunk-w1-000000000200.jsonl",
    "garbage.txt",
  ]);
  assert.deepEqual(g.get(0).map((x) => x.startIdx), [0, 500]);
  assert.deepEqual(g.get(1).map((x) => x.startIdx), [200]);
  assert.equal(g.has(2), false);
});
test("groupChunksByWorker: non-array → empty map", () => {
  assert.equal(groupChunksByWorker(null).size, 0);
  assert.equal(groupChunksByWorker(undefined).size, 0);
});

// ─── lastNonEmptyLine / maxIdxInChunkText ────────────────────────────────
test("lastNonEmptyLine: trailing blank lines ignored", () => {
  assert.equal(lastNonEmptyLine("a\nb\n\n\n"), "b");
  assert.equal(lastNonEmptyLine(""), null);
  assert.equal(lastNonEmptyLine(42), null);
});
test("maxIdxInChunkText: reads idx from the LAST record, not filename", () => {
  const txt = `{"fp":"a","idx":10001,"in":{},"out":{}}\n{"fp":"b","idx":15000,"in":{},"out":{}}\n`;
  assert.equal(maxIdxInChunkText(txt), 15000);
});
test("maxIdxInChunkText: malformed last line → null", () => {
  assert.equal(maxIdxInChunkText("not json\n"), null);
  assert.equal(maxIdxInChunkText("{\"idx\":\"x\"}\n"), null);
  assert.equal(maxIdxInChunkText(""), null);
});

// ─── computeResumeSkip — THE P0 (min-worker-frontier, no gap) ─────────────
test("P0: skip = MIN over workers of max record idx (no silent gap)", () => {
  // N=4, realizable round-robin: worker w owns idx ≡ (w+1) mod 4.
  const m = new Map([[0, 1001], [1, 998], [2, 399], [3, 1200]]);
  const { skip } = computeResumeSkip(m, 4, 0);
  assert.equal(skip, 399);
});
test("P0 anti-regression: max-frontier would give 1200 — assertion catches it", () => {
  const m = new Map([[0, 1001], [1, 998], [2, 399], [3, 1200]]);
  const { skip } = computeResumeSkip(m, 4, 0);
  assert.notEqual(skip, 1200);
  assert.equal(skip, 399);
});
test("P1-B: un-flushed worker resumes at sidecar launchSkip, NOT ~0", () => {
  const m = new Map([[0, 300001], [1, 290002], [3, 310000]]); // w2 absent
  const { skip, reason } = computeResumeSkip(m, 4, /*priorLaunchSkip*/ 200050);
  assert.equal(skip, 200050);
  assert.match(reason, /sidecar launchSkip/);
});
test("P1-B regression guard: no sidecar + un-flushed worker → skip 0 (safe redo)", () => {
  const m = new Map([[0, 300001], [1, 290002], [3, 310000]]);
  const { skip, reason } = computeResumeSkip(m, 4, /*priorLaunchSkip*/ null);
  assert.equal(skip, 0);
  assert.match(reason, /no sidecar/);
});
test("computeResumeSkip: no records + no sidecar → fresh start 0", () => {
  assert.deepEqual(
    computeResumeSkip(new Map(), 4, null),
    { skip: 0, reason: "no prior run — fresh start" },
  );
});
test("computeResumeSkip: all workers flushed → pure min, sidecar irrelevant", () => {
  const m = new Map([[0, 5001], [1, 5002], [2, 4999], [3, 5000]]);
  const { skip, reason } = computeResumeSkip(m, 4, 999999);
  assert.equal(skip, 4999);
  assert.match(reason, /min-worker-frontier over 4 workers/);
});
test("computeResumeSkip: single worker happy path", () => {
  const { skip } = computeResumeSkip(new Map([[0, 7777]]), 1, 0);
  assert.equal(skip, 7777);
});
test("computeResumeSkip: bad N falls back to default, non-Map defended", () => {
  const { skip } = computeResumeSkip(null, 0, 5000);
  assert.equal(skip, 5000);
});

// ─── decideRelaunch ──────────────────────────────────────────────────────
test("decideRelaunch: alive=no, dead=yes, indeterminate=no, junk=no", () => {
  assert.equal(decideRelaunch("alive").relaunch, false);
  assert.equal(decideRelaunch("dead").relaunch, true);
  assert.equal(decideRelaunch("indeterminate").relaunch, false);
  assert.equal(decideRelaunch("weird").relaunch, false);
  assert.equal(decideRelaunch(undefined).relaunch, false);
});

// ─── classifyAliveFromLines — THE fail-open P0 ───────────────────────────
test("P0 fail-open: EMPTY enumeration is indeterminate, never dead", () => {
  assert.equal(classifyAliveFromLines("mill", []), "indeterminate");
});
test("classifyAliveFromLines: non-array → indeterminate", () => {
  assert.equal(classifyAliveFromLines("mill", null), "indeterminate");
  assert.equal(classifyAliveFromLines("mill", "nope"), "indeterminate");
});
test("classifyAliveFromLines: matching cmdline → alive", () => {
  const lines = ["node /x/sfc-variability-batch-run.mjs --domain mill --workers 4"];
  assert.equal(classifyAliveFromLines("mill", lines), "alive");
  assert.equal(classifyAliveFromLines("lathe", lines), "dead");
});
test("classifyAliveFromLines: unrelated procs only → dead", () => {
  assert.equal(classifyAliveFromLines("mill", ["node /usr/bin/tsc", "node server.js"]), "dead");
});

// ─── requirePositiveInt ──────────────────────────────────────────────────
test("requirePositiveInt: rejects NaN/0/negative/float, accepts positive int", () => {
  assert.equal(requirePositiveInt("workers", "4"), 4);
  assert.throws(() => requirePositiveInt("workers", "abc"), /invalid --workers/);
  assert.throws(() => requirePositiveInt("workers", "0"), /invalid --workers/);
  assert.throws(() => requirePositiveInt("workers", "-3"), /invalid --workers/);
  assert.throws(() => requirePositiveInt("chunk", "5.5"), /invalid --chunk/);
  assert.throws(() => requirePositiveInt("chunk", undefined), /invalid --chunk/);
});

// ─── pickResumeParams (launcher uses this to turn sidecar → batch args) ──
test("pickResumeParams: full sidecar → its values", () => {
  const p = pickResumeParams({ launchSkip: 400100, workers: 4, chunkSize: 50, maxMinutes: 600 });
  assert.deepEqual(p, { skip: 400100, workers: 4, chunkSize: 50, maxMinutes: 600 });
});
test("pickResumeParams: null sidecar → all defaults, skip 0", () => {
  const p = pickResumeParams(null);
  assert.equal(p.skip, 0);
  assert.equal(p.workers, 4);
  assert.equal(p.chunkSize, 50);
  assert.equal(p.maxMinutes, 600);
});
test("pickResumeParams: partial/invalid fields fall back per-field", () => {
  // launchSkip 0 is valid (≥0); workers -1 invalid → default; chunkSize NaN → default.
  const p = pickResumeParams({ launchSkip: 0, workers: -1, chunkSize: "x", maxMinutes: 720 });
  assert.equal(p.skip, 0);
  assert.equal(p.workers, 4);     // -1 invalid → default
  assert.equal(p.chunkSize, 50);  // "x" invalid → default
  assert.equal(p.maxMinutes, 720); // valid → kept
});
test("pickResumeParams: launchSkip null → skip 0 (not default-workers value)", () => {
  assert.equal(pickResumeParams({ launchSkip: null, workers: 8 }).skip, 0);
  assert.equal(pickResumeParams({ launchSkip: null, workers: 8 }).workers, 8);
});

// ─── parseCliArgs ────────────────────────────────────────────────────────
test("parseCliArgs: defaults + domain split + NaN rejection", () => {
  const a = parseCliArgs(["--domains", "mill,lathe", "--workers", "8", "--dry-run"]);
  assert.deepEqual(a.domains, ["mill", "lathe"]);
  assert.equal(a.workers, 8);
  assert.equal(a.dryRun, true);
  assert.throws(() => parseCliArgs(["--workers", "x"]), /invalid --workers/);
  assert.throws(() => parseCliArgs(["--domains", ""]), /no --domains given/);
});

// ─── buildBatchArgv ──────────────────────────────────────────────────────
test("buildBatchArgv: exact batch flag contract", () => {
  const argv = buildBatchArgv({
    domain: "mill", workers: 4, maxMinutes: 600, chunkSize: 50,
    skip: 400, outDir: "/out/mill",
  });
  assert.equal(argv[argv.indexOf("--domain") + 1], "mill");
  assert.equal(argv[argv.indexOf("--workers") + 1], "4");
  assert.equal(argv[argv.indexOf("--skip") + 1], "400");
  assert.equal(argv[argv.indexOf("--chunk") + 1], "50");
  assert.equal(argv[argv.indexOf("--max-minutes") + 1], "600");
  assert.equal(argv[argv.indexOf("--out") + 1], "/out/mill");
});

// ─── lockPathForHost ─────────────────────────────────────────────────────
test("lockPathForHost: host-keyed (two PCs do not share one lock)", () => {
  const a = lockPathForHost("PC-A");
  const b = lockPathForHost("PC-B");
  assert.notEqual(a, b);
  assert.match(a, /\.sfc-variability-guard-PC-A\.lock$/);
  // unsafe chars sanitized
  assert.match(lockPathForHost("weird/host:1"), /guard-weird_host_1\.lock$/);
});

// ─── buildSidecarRecord ──────────────────────────────────────────────────
test("buildSidecarRecord: shape + launchSkip floor + null launchSkip", () => {
  const r = buildSidecarRecord({
    host: "PC-X", nowMs: 0, launchSkip: 400.9, workers: 4, chunkSize: 50, maxMinutes: 600,
  });
  assert.equal(r.schemaVersion, "1.0.0");
  assert.equal(r.host, "PC-X");
  assert.equal(r.launchSkip, 400);
  assert.equal(r.workers, 4);
  assert.equal(r.ts, new Date(0).toISOString());
  const r2 = buildSidecarRecord({ host: "PC-X", nowMs: 0, launchSkip: undefined, workers: 4, chunkSize: 50, maxMinutes: 600 });
  assert.equal(r2.launchSkip, null);
});

// ─── readResumeState (hermetic fs) ───────────────────────────────────────
test("readResumeState: maxIdx from RECORD idx (filename startIdx is lower)", () => {
  const files = { "/out/mill": ["chunk-w0-000000010001.jsonl", "chunk-w0-000000000000.jsonl"] };
  const contents = {
    "/out/mill/chunk-w0-000000010001.jsonl": `{"idx":10001}\n{"idx":15000}\n`,
    "/out/mill/chunk-w0-000000000000.jsonl": `{"idx":1}\n{"idx":5000}\n`,
  };
  const st = readResumeState("/out/mill", {
    readdir: (d) => files[d] || [],
    readFile: (p) => {
      const key = p.replace(/\\/g, "/");
      if (!(key in contents)) throw new Error("ENOENT");
      return contents[key];
    },
  });
  assert.equal(st.perWorkerMaxIdx.get(0), 15000);
  assert.equal(st.maxWorkerIdxSeen, 0);
});
test("readResumeState: corrupt newest chunk → falls back to prior complete chunk", () => {
  // Reviewer A P2-2: a 0-byte/partial newest chunk must not lose the frontier.
  const files = { "/out/mill": ["chunk-w0-000000000000.jsonl", "chunk-w0-000000099999.jsonl"] };
  const contents = {
    "/out/mill/chunk-w0-000000000000.jsonl": `{"idx":1}\n{"idx":5000}\n`,
    "/out/mill/chunk-w0-000000099999.jsonl": ``, // 0-byte (killed mid-write)
  };
  const st = readResumeState("/out/mill", {
    readdir: (d) => files[d] || [],
    readFile: (p) => contents[p.replace(/\\/g, "/")] ?? "",
  });
  assert.equal(st.perWorkerMaxIdx.get(0), 5000); // recovered from the prior chunk
});
test("readResumeState: maxWorkerIdxSeen tracks highest worker", () => {
  const st = readResumeState("/out/mill", {
    readdir: () => ["chunk-w0-000000000000.jsonl", "chunk-w3-000000000000.jsonl"],
    readFile: () => `{"idx":1}\n{"idx":9}\n`,
  });
  assert.equal(st.maxWorkerIdxSeen, 3);
});

// ─── readSidecar / writeSidecar (hermetic) ───────────────────────────────
test("readSidecar: missing/malformed → null; valid → object", () => {
  assert.equal(readSidecar("/out/mill", { readFile: () => { throw new Error("ENOENT"); } }), null);
  assert.equal(readSidecar("/out/mill", { readFile: () => "{not json" }), null);
  const sc = readSidecar("/out/mill", { readFile: () => `{"host":"PC-A","launchSkip":50}` });
  assert.equal(sc.host, "PC-A");
  assert.equal(sc.launchSkip, 50);
});
test("writeSidecar: success true; throwing writer → false (R12 surfaces it)", () => {
  let written = null;
  assert.equal(writeSidecar("/out/mill", { host: "X" }, { writeText: (p, t) => { written = { p, t }; } }), true);
  assert.match(written.p.replace(/\\/g, "/"), /\.resume-state\.json$/);
  assert.equal(writeSidecar("/out/mill", { host: "X" }, { writeText: () => { throw new Error("EACCES"); } }), false);
});

// ─── decideHostOwnership — cross-PC P1 (cadence-scaled window) ────────────
test("P1 cross-PC: other-host sidecar refreshed within window → remote-alive", () => {
  const now = Date.parse("2026-05-19T12:00:00Z");
  const sc = { host: "PC-OTHER", ts: "2026-05-19T11:55:00Z" }; // 5 min ago
  assert.equal(decideHostOwnership(sc, "PC-THIS", now, HOST_STALENESS_MIN * MIN_MS), "remote-alive");
});
test("decideHostOwnership: other-host STALE ts (past staleness window) → clear", () => {
  const now = Date.parse("2026-05-19T12:00:00Z");
  // 30 min ago — past a cadence-scaled window ⇒ the remote guard stopped
  // refreshing ⇒ the remote batch is dead ⇒ safe to take over.
  const sc = { host: "PC-OTHER", ts: "2026-05-19T11:30:00Z" };
  assert.equal(decideHostOwnership(sc, "PC-THIS", now, HOST_STALENESS_MIN * MIN_MS), "clear");
});
test("decideHostOwnership: same host / no sidecar / bad ts → clear", () => {
  const now = Date.parse("2026-05-19T12:00:00Z");
  assert.equal(decideHostOwnership({ host: "PC-THIS", ts: "2026-05-19T11:59:00Z" }, "PC-THIS", now, HOST_STALENESS_MIN * MIN_MS), "clear");
  assert.equal(decideHostOwnership(null, "PC-THIS", now, HOST_STALENESS_MIN * MIN_MS), "clear");
  assert.equal(decideHostOwnership({ host: "PC-OTHER", ts: "garbage" }, "PC-THIS", now, HOST_STALENESS_MIN * MIN_MS), "clear");
});

// ─── runGuard end-to-end (injected deps) ─────────────────────────────────
test("runGuard: alive → noop, refreshes sidecar ts (cross-PC window stays fresh)", () => {
  const relaunched = [];
  let sidecarWrite = null;
  const s = runGuard(
    { domains: ["mill"] },
    {
      procEnum: () => ["node /x/sfc-variability-batch-run.mjs --domain mill"],
      readdir: () => [],
      readFile: () => `{"host":"PC-THIS","launchSkip":400100,"workers":4,"chunkSize":50,"maxMinutes":600,"ts":"2026-05-01T00:00:00Z"}`,
      writeText: (p, t) => { if (p.endsWith(".resume-state.json")) sidecarWrite = JSON.parse(t); },
      relaunch: (ctx) => { relaunched.push(ctx); return { triggered: true }; },
      now: () => Date.parse("2026-05-19T12:00:00Z"), hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "noop");
  assert.equal(s.domains[0].sidecarRefreshed, true);
  assert.equal(relaunched.length, 0); // alive → never relaunch
  // ts refreshed to "now"; launchSkip preserved from the old sidecar.
  assert.equal(sidecarWrite.ts, new Date(Date.parse("2026-05-19T12:00:00Z")).toISOString());
  assert.equal(sidecarWrite.launchSkip, 400100);
  assert.equal(sidecarWrite.host, "PC-THIS");
});

test("runGuard: indeterminate (empty enum) → noop, NEVER relaunch", () => {
  const relaunched = [];
  const s = runGuard(
    { domains: ["mill"] },
    {
      procEnum: () => [],
      readdir: () => ["chunk-w0-000000000000.jsonl"],
      readFile: () => `{"idx":50}\n`,
      writeText: () => {},
      relaunch: (ctx) => { relaunched.push(ctx); return { triggered: true }; },
      now: () => 0, hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "noop");
  assert.match(s.domains[0].reason, /indeterminate/);
  assert.equal(relaunched.length, 0);
});

test("P0 two-task: dead → triggers the batch TASK (never spawns), sidecar written first", () => {
  const files = ["chunk-w0-000000000000.jsonl", "chunk-w1-000000000000.jsonl",
                 "chunk-w2-000000000000.jsonl", "chunk-w3-000000000000.jsonl"];
  const last = { 0: 1001, 1: 998, 2: 399, 3: 1200 };
  const calls = []; // ordered log of (writeSidecar | relaunch)
  let sidecarRec = null;
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"], // dead
      readdir: () => files,
      readFile: (p) => {
        const key = p.replace(/\\/g, "/");
        if (key.endsWith(".resume-state.json")) throw new Error("ENOENT"); // no sidecar
        const w = Number(key.match(/chunk-w(\d+)-/)[1]);
        return `{"idx":1}\n{"idx":${last[w]}}\n`;
      },
      writeText: (p, t) => {
        if (p.endsWith(".resume-state.json")) { sidecarRec = JSON.parse(t); calls.push("write"); }
      },
      relaunch: (ctx) => { calls.push("relaunch:" + ctx.domain + ":" + ctx.skip); return { triggered: true }; },
      now: () => 0, hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "relaunched");
  assert.equal(s.domains[0].skip, 399);                       // min(1001,998,399,1200)
  assert.equal(s.domains[0].batchTask, "PRISM SFC Variability Batch Mill");
  assert.equal(s.domains[0].sidecarWritten, true);
  // Sidecar MUST be written BEFORE the task is triggered (launcher reads it).
  assert.deepEqual(calls, ["write", "relaunch:mill:399"]);
  assert.equal(sidecarRec.launchSkip, 399);
  assert.equal(sidecarRec.host, "PC-THIS");
});

test("runGuard: relaunch failure (schtasks throws) → action relaunch-failed, surfaced", () => {
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => ["chunk-w0-000000000000.jsonl", "chunk-w1-000000000000.jsonl",
                      "chunk-w2-000000000000.jsonl", "chunk-w3-000000000000.jsonl"],
      readFile: (p) => p.replace(/\\/g, "/").endsWith(".resume-state.json")
        ? (() => { throw new Error("ENOENT"); })()
        : `{"idx":1}\n{"idx":500}\n`,
      writeText: () => {},
      relaunch: () => { throw new Error("schtasks /run exit 1: task not found"); },
      now: () => 0, hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "relaunch-failed");
  assert.match(s.domains[0].triggerError, /task not found/);
});

test("P1-B integration: un-flushed interior worker + sidecar → resume at launchSkip", () => {
  const files = ["chunk-w0-000000200050.jsonl", "chunk-w1-000000200050.jsonl",
                 "chunk-w3-000000200050.jsonl"]; // w2 absent
  const last = { 0: 300001, 1: 290002, 3: 310000 };
  let relaunchCtx = null;
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => files,
      readFile: (p) => {
        const key = p.replace(/\\/g, "/");
        if (key.endsWith(".resume-state.json")) {
          return `{"host":"PC-THIS","launchSkip":200050,"workers":4,"ts":"2026-05-01T00:00:00Z"}`;
        }
        const w = Number(key.match(/chunk-w(\d+)-/)[1]);
        return `{"idx":1}\n{"idx":${last[w]}}\n`;
      },
      writeText: () => {},
      relaunch: (ctx) => { relaunchCtx = ctx; return { triggered: true }; },
      now: () => Date.parse("2026-05-19T00:00:00Z"), hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "relaunched");
  assert.equal(s.domains[0].skip, 200050); // NOT 0 — the P1-B fix
  assert.equal(relaunchCtx.skip, 200050);
});

test("P1-D: subset of [0,N) flushed, workerIdx<N, sidecar matches → resume (NOT mismatch)", () => {
  let relaunched = false;
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => ["chunk-w0-000000000000.jsonl"], // only w0 flushed
      readFile: (p) => p.replace(/\\/g, "/").endsWith(".resume-state.json")
        ? `{"host":"PC-THIS","launchSkip":0,"workers":4,"ts":"2026-05-01T00:00:00Z"}`
        : `{"idx":1}\n{"idx":5}\n`,
      writeText: () => {},
      relaunch: () => { relaunched = true; return { triggered: true }; },
      now: () => Date.parse("2026-05-19T00:00:00Z"), hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "relaunched");
  assert.equal(relaunched, true);
});

test("P1-D mismatch: a chunk with workerIdx ≥ configured N → fail-safe noop", () => {
  let relaunched = false;
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => ["chunk-w0-000000000000.jsonl", "chunk-w5-000000000000.jsonl"],
      readFile: (p) => p.replace(/\\/g, "/").endsWith(".resume-state.json")
        ? (() => { throw new Error("ENOENT"); })()
        : `{"idx":1}\n{"idx":9}\n`,
      writeText: () => {},
      relaunch: () => { relaunched = true; return { triggered: true }; },
      now: () => 0, hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "noop");
  assert.match(s.domains[0].reason, /used > 4 workers/);
  assert.equal(relaunched, false);
});

test("runGuard: sidecar worker-count disagreement → fail-safe noop", () => {
  let relaunched = false;
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => ["chunk-w0-000000000000.jsonl"],
      readFile: (p) => p.replace(/\\/g, "/").endsWith(".resume-state.json")
        ? `{"host":"PC-THIS","launchSkip":0,"workers":2,"ts":"2026-05-01T00:00:00Z"}`
        : `{"idx":1}\n{"idx":9}\n`,
      writeText: () => {},
      relaunch: () => { relaunched = true; return { triggered: true }; },
      now: () => Date.parse("2026-05-19T00:00:00Z"), hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "noop");
  assert.match(s.domains[0].reason, /worker-count mismatch/);
  assert.equal(relaunched, false);
});

test("P1 cross-PC: dead locally but other-host sidecar fresh → noop, no relaunch", () => {
  let relaunched = false;
  const s = runGuard(
    { domains: ["mill"], workers: 4, maxMinutes: 600 },
    {
      procEnum: () => ["node unrelated.js"], // host-local enum: dead
      readdir: () => ["chunk-w0-000000000000.jsonl"],
      readFile: (p) => p.replace(/\\/g, "/").endsWith(".resume-state.json")
        ? `{"host":"PC-OTHER","launchSkip":0,"workers":4,"ts":"2026-05-19T11:58:00Z"}`
        : `{"idx":1}\n{"idx":9}\n`,
      writeText: () => {},
      relaunch: () => { relaunched = true; return { triggered: true }; },
      now: () => Date.parse("2026-05-19T12:00:00Z"), // 2 min after sidecar ts → within window
      hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "noop");
  assert.equal(s.domains[0].aliveState, "indeterminate");
  assert.match(s.domains[0].reason, /PC-OTHER/);
  assert.equal(relaunched, false);
});

test("P1 cross-PC: dead locally + other-host sidecar STALE → relaunch (take over)", () => {
  // Remote guard stopped refreshing (host crashed) → stale ts → take over.
  let relaunched = false;
  const s = runGuard(
    { domains: ["mill"], workers: 4 },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => ["chunk-w0-000000000000.jsonl", "chunk-w1-000000000000.jsonl",
                      "chunk-w2-000000000000.jsonl", "chunk-w3-000000000000.jsonl"],
      readFile: (p) => p.replace(/\\/g, "/").endsWith(".resume-state.json")
        ? `{"host":"PC-OTHER","launchSkip":0,"workers":4,"ts":"2026-05-19T10:00:00Z"}` // 2h stale
        : `{"idx":1}\n{"idx":9}\n`,
      writeText: () => {},
      relaunch: () => { relaunched = true; return { triggered: true }; },
      now: () => Date.parse("2026-05-19T12:00:00Z"),
      hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "relaunched");
  assert.equal(relaunched, true);
});

test("runGuard: kill switch disables everything", () => {
  const prev = process.env.PRISM_SFC_VARIABILITY_GUARD_DISABLE;
  process.env.PRISM_SFC_VARIABILITY_GUARD_DISABLE = "1";
  try {
    const s = runGuard({ domains: ["mill"] }, { procEnum: () => { throw new Error("must not be called"); } });
    assert.equal(s.disabled, true);
    assert.equal(s.domains.length, 0);
  } finally {
    if (prev === undefined) delete process.env.PRISM_SFC_VARIABILITY_GUARD_DISABLE;
    else process.env.PRISM_SFC_VARIABILITY_GUARD_DISABLE = prev;
  }
});

test("runGuard: unknown domain → skip", () => {
  const s = runGuard({ domains: ["plasma"] }, { procEnum: () => ["x"], now: () => 0, hostname: () => "PC-THIS" });
  assert.equal(s.domains[0].action, "skip");
  assert.equal(s.domains[0].reason, "unknown domain");
});

test("runGuard: dryRun never relaunches, never writes", () => {
  const relaunched = [];
  let wrote = false;
  const s = runGuard(
    { domains: ["lathe"], dryRun: true },
    {
      procEnum: () => ["node unrelated.js"],
      readdir: () => [], readFile: () => { throw new Error("ENOENT"); },
      writeText: () => { wrote = true; },
      relaunch: (ctx) => { relaunched.push(ctx); return { triggered: true }; },
      now: () => 0, hostname: () => "PC-THIS",
    },
  );
  assert.equal(s.domains[0].action, "would-relaunch");
  assert.equal(s.domains[0].skip, 0);
  assert.equal(s.domains[0].batchTask, "PRISM SFC Variability Batch Lathe");
  assert.equal(relaunched.length, 0);
  assert.equal(wrote, false);
});
