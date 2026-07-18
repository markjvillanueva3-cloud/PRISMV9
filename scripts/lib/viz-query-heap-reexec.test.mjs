/**
 * Tests for viz-query-heap-reexec (the system-viz-query OOM-on-help + missing
 * Blackwell heap guard fix). Pure planner -> no graph load, no spawn.
 *
 * Run: node scripts/lib/viz-query-heap-reexec.test.mjs   (node:test auto-runs on
 * exit). `node --test <file>` reports 0 tests in this env -- run the file directly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import {
  GRAPH_CMDS,
  GRAPH_USAGE,
  isKnownGraphCmd,
  maxOldSpaceMb,
  planHeapRespawn,
  respawnWithHeap,
} from "./viz-query-heap-reexec.mjs";

// ---- isKnownGraphCmd -------------------------------------------------------

test("isKnownGraphCmd: every graph-loading command is recognized", () => {
  for (const c of [
    "headline",
    "roadmap-candidates",
    "blast-radius",
    "dispatcher-summary",
    "coverage-by-domain",
    "worktrees",
    "build-order",
    "find",
  ]) {
    assert.equal(isKnownGraphCmd(c), true, `${c} should be a known graph cmd`);
  }
});

test("isKnownGraphCmd: help / typo / empty are NOT graph commands (Defect A)", () => {
  // The exact symptom: `--help` must not be treated as a graph cmd, so the CLI
  // prints usage WITHOUT a 644MB loadGraph() (the OOM that motivated this fix).
  assert.equal(isKnownGraphCmd("--help"), false);
  assert.equal(isKnownGraphCmd("-h"), false);
  assert.equal(isKnownGraphCmd("help"), false);
  assert.equal(isKnownGraphCmd("rodmap-candidates"), false); // typo
  assert.equal(isKnownGraphCmd("subgraph"), false); // cheap short-circuit, not a post-loadGraph cmd
  assert.equal(isKnownGraphCmd(""), false);
});

test("isKnownGraphCmd: adversarial non-string inputs are false, never throw", () => {
  assert.equal(isKnownGraphCmd(null), false);
  assert.equal(isKnownGraphCmd(undefined), false);
  assert.equal(isKnownGraphCmd(123), false);
  assert.equal(isKnownGraphCmd({}), false);
  assert.equal(isKnownGraphCmd(["headline"]), false);
});

test("GRAPH_CMDS is the frozen single-source allowlist (8 entries)", () => {
  assert.equal(GRAPH_CMDS.length, 8);
  assert.equal(Object.isFrozen(GRAPH_CMDS), true);
  // find is intentionally included for the documented short-circuit-removed fallback.
  assert.ok(GRAPH_CMDS.includes("find"));
});

// ---- planHeapRespawn: respawn decision -------------------------------------

const VIZ = { breakerVar: "PRISM_VIZQUERY_REEXEC", heapVar: "PRISM_VIZQUERY_HEAP_MB", defaultMb: 16384 };

test("planHeapRespawn: clean launch respawns with the default heap (Defect B)", () => {
  const p = planHeapRespawn({ execArgv: [], env: {}, ...VIZ });
  assert.equal(p.shouldRespawn, true);
  assert.equal(p.heapMb, "16384");
  assert.equal(p.breakerVar, "PRISM_VIZQUERY_REEXEC");
});

test("planHeapRespawn: breaker env set => no respawn (infinite-loop breaker)", () => {
  const p = planHeapRespawn({ execArgv: [], env: { PRISM_VIZQUERY_REEXEC: "1" }, ...VIZ });
  assert.equal(p.shouldRespawn, false);
});

test("planHeapRespawn: explicit --max-old-space-size in execArgv => no respawn", () => {
  const p = planHeapRespawn({ execArgv: ["--max-old-space-size=8192"], env: {}, ...VIZ });
  assert.equal(p.shouldRespawn, false);
});

// ---- planHeapRespawn: heap sanitization ------------------------------------

test("planHeapRespawn: a valid heap override is honored", () => {
  assert.equal(planHeapRespawn({ env: { PRISM_VIZQUERY_HEAP_MB: "8192" }, ...VIZ }).heapMb, "8192");
});

test("planHeapRespawn: garbage heap override falls back to default (fail-safe)", () => {
  // The old inline subgraph form `env[X] || "4096"` shipped these as-is:
  //   "0"   -> --max-old-space-size=0   (broken heap)
  //   "abc" -> --max-old-space-size=abc (node launch error)
  // The planner fixes both by falling back to the default.
  assert.equal(planHeapRespawn({ env: { PRISM_VIZQUERY_HEAP_MB: "0" }, ...VIZ }).heapMb, "16384");
  assert.equal(planHeapRespawn({ env: { PRISM_VIZQUERY_HEAP_MB: "-5" }, ...VIZ }).heapMb, "16384");
  assert.equal(planHeapRespawn({ env: { PRISM_VIZQUERY_HEAP_MB: "abc" }, ...VIZ }).heapMb, "16384");
  assert.equal(planHeapRespawn({ env: { PRISM_VIZQUERY_HEAP_MB: "" }, ...VIZ }).heapMb, "16384");
});

// ---- planHeapRespawn: subgraph parity (build-once, R15) ---------------------

test("planHeapRespawn: subgraph params reproduce the old inline decision (parity)", () => {
  const SUB = { breakerVar: "PRISM_SUBGRAPH_REEXEC", heapVar: "PRISM_SUBGRAPH_HEAP_MB", defaultMb: 4096 };
  // Normal case: old `process.env.PRISM_SUBGRAPH_HEAP_MB || "4096"` -> "4096".
  assert.deepEqual(planHeapRespawn({ execArgv: [], env: {}, ...SUB }), {
    shouldRespawn: true,
    heapMb: "4096",
    breakerVar: "PRISM_SUBGRAPH_REEXEC",
  });
  // Old-bug case the migration FIXES: "0" no longer becomes --max-old-space-size=0.
  assert.equal(planHeapRespawn({ env: { PRISM_SUBGRAPH_HEAP_MB: "0" }, ...SUB }).heapMb, "4096");
  // Breaker parity.
  assert.equal(planHeapRespawn({ env: { PRISM_SUBGRAPH_REEXEC: "1" }, ...SUB }).shouldRespawn, false);
});

// ---- planHeapRespawn: contract guards (adversarial) ------------------------

test("planHeapRespawn: missing breakerVar/heapVar throws (contract)", () => {
  assert.throws(() => planHeapRespawn({ heapVar: "X", defaultMb: 100 }), /breakerVar \+ heapVar/);
  assert.throws(() => planHeapRespawn({ breakerVar: "X", defaultMb: 100 }), /breakerVar \+ heapVar/);
});

test("planHeapRespawn: non-positive / non-finite defaultMb throws (contract)", () => {
  assert.throws(() => planHeapRespawn({ breakerVar: "B", heapVar: "H", defaultMb: 0 }), /defaultMb/);
  assert.throws(() => planHeapRespawn({ breakerVar: "B", heapVar: "H", defaultMb: -1 }), /defaultMb/);
  assert.throws(() => planHeapRespawn({ breakerVar: "B", heapVar: "H", defaultMb: NaN }), /defaultMb/);
});

// ---- planHeapRespawn: NODE_OPTIONS-awareness -------------------------------

test("planHeapRespawn: NODE_OPTIONS heap suppresses respawn ONLY when >= the wanted heap", () => {
  // VIZ.defaultMb = 16384.
  // Adequate (>= wanted) -> no respawn (don't double-apply a heap already big enough).
  assert.equal(planHeapRespawn({ env: { NODE_OPTIONS: "--max-old-space-size=16384" }, ...VIZ }).shouldRespawn, false);
  assert.equal(planHeapRespawn({ env: { NODE_OPTIONS: "--enable-source-maps --max-old-space-size=20000" }, ...VIZ }).shouldRespawn, false);
  // STINGY (< wanted) -> MUST still respawn to override. This is the exact regression
  // that broke the live CLIs: the harness sets NODE_OPTIONS=--max-old-space-size=384
  // (the low cap this whole module exists to lift); treating it as "handled" left every
  // graph CLI running on 384MB. The respawn's own CLI flag overrides NODE_OPTIONS.
  assert.equal(planHeapRespawn({ env: { NODE_OPTIONS: "--max-old-space-size=384" }, ...VIZ }).shouldRespawn, true);
  assert.equal(planHeapRespawn({ env: { NODE_OPTIONS: "--max-old-space-size=8192" }, ...VIZ }).shouldRespawn, true);
  // No heap in NODE_OPTIONS -> respawn.
  assert.equal(planHeapRespawn({ env: { NODE_OPTIONS: "--enable-source-maps" }, ...VIZ }).shouldRespawn, true);
});

test("maxOldSpaceMb: parses =/space, last-wins, and null cases", () => {
  assert.equal(maxOldSpaceMb("--max-old-space-size=384"), 384);
  assert.equal(maxOldSpaceMb("--enable-source-maps --max-old-space-size=8192"), 8192);
  assert.equal(maxOldSpaceMb("--max-old-space-size 4096"), 4096);
  assert.equal(maxOldSpaceMb("--max-old-space-size=100 --max-old-space-size=200"), 200); // last wins
  assert.equal(maxOldSpaceMb("--enable-source-maps"), null);
  assert.equal(maxOldSpaceMb(""), null);
  assert.equal(maxOldSpaceMb(undefined), null);
  assert.equal(maxOldSpaceMb(null), null);
});

// ---- respawnWithHeap (injected spawn -> no real child) ---------------------

function makeSpawn(result) {
  const calls = [];
  const fn = (execPath, args, opts) => { calls.push({ execPath, args, opts }); return result; };
  fn.calls = calls;
  return fn;
}

test("respawnWithHeap: no respawn needed -> {respawned:false}, spawn NOT called", () => {
  const spawn = makeSpawn({ status: 0 });
  const r = respawnWithHeap({ scriptUrl: "file:///x/foo.mjs", env: { PRISM_VIZQUERY_REEXEC: "1" }, spawn, ...VIZ });
  assert.deepEqual(r, { respawned: false, status: null });
  assert.equal(spawn.calls.length, 0);
});

test("respawnWithHeap: clean launch spawns with heap flag + breaker env + argv, returns child status", () => {
  const spawn = makeSpawn({ status: 0 });
  const r = respawnWithHeap({
    scriptUrl: "/abs/foo.mjs", argv: ["coverage-by-domain", "--json"],   // plain path -> passthrough
    execArgv: [], env: {}, execPath: "/usr/bin/node", spawn, ...VIZ,
  });
  assert.equal(r.respawned, true);
  assert.equal(r.status, 0);
  assert.equal(spawn.calls.length, 1);
  const c = spawn.calls[0];
  assert.equal(c.execPath, "/usr/bin/node");
  assert.equal(c.args[0], "--max-old-space-size=16384");
  assert.equal(c.args[1], "/abs/foo.mjs");
  assert.deepEqual(c.args.slice(2), ["coverage-by-domain", "--json"]);
  assert.equal(c.opts.stdio, "inherit");
  assert.equal(c.opts.env.PRISM_VIZQUERY_REEXEC, "1");   // breaker set on child
});

test("respawnWithHeap: a file:// scriptUrl is converted to an OS path (portable round-trip)", () => {
  // Real callers pass import.meta.url (a file:// URL). Build one portably so the
  // assertion holds on Windows (file:///C:/...) and POSIX (file:///...) alike.
  const abs = process.platform === "win32" ? "C:\\tmp\\foo.mjs" : "/tmp/foo.mjs";
  const url = pathToFileURL(abs).href;
  const spawn = makeSpawn({ status: 0 });
  respawnWithHeap({ scriptUrl: url, argv: [], execArgv: [], env: {}, spawn, ...VIZ });
  assert.equal(spawn.calls[0].args[1], abs);             // file:// URL -> real OS path
});

test("respawnWithHeap: spawn error -> status 1 + error (R12: dead child never success)", () => {
  const err = new Error("ENOENT");
  const spawn = makeSpawn({ error: err });
  const r = respawnWithHeap({ scriptUrl: "/x.mjs", argv: [], execArgv: [], env: {}, spawn, ...VIZ });
  assert.equal(r.respawned, true);
  assert.equal(r.status, 1);
  assert.equal(r.error, err);
});

test("respawnWithHeap: signal-kill (status null) -> status 1, never 0 (R12)", () => {
  const spawn = makeSpawn({ status: null, signal: "SIGKILL" });
  const r = respawnWithHeap({ scriptUrl: "/x.mjs", argv: [], execArgv: [], env: {}, spawn, ...VIZ });
  assert.equal(r.status, 1);
});

// ---- GRAPH_USAGE -----------------------------------------------------------

test("GRAPH_USAGE is ASCII-only, non-empty, and lists both tiers", () => {
  assert.ok(GRAPH_USAGE.length > 0);
  assert.ok(/no 644MB graph load/.test(GRAPH_USAGE)); // cheap tier
  assert.ok(/auto heap-bumped/.test(GRAPH_USAGE)); // graph tier
  // ASCII-only (the ascii-guard contract for code files): no byte > 0x7f.
  assert.ok(/^[\x00-\x7f]*$/.test(GRAPH_USAGE), "GRAPH_USAGE must be ASCII-only");
});
