// scripts/batch-ollama-vision-extract.test.mjs
// Tests for the batch runner's pure helpers (U-PSGB-XRAY-BATCH #6).
// The GPU-claim + spawn loop is integration (overnight); these pin the
// checkpoint/worklist/budget logic that governs resume + dedup + stop.
// Run: node --test <file>

import { test } from "node:test";
import assert from "node:assert/strict";
import { sha256, parseCheckpoint, parseWorklist, withinBudget, buildPrintArgs, resolveConcurrency, resolveOllamaParallel, runExtractionPool, runOnePrintAsync } from "./batch-ollama-vision-extract.mjs";
import { EventEmitter } from "node:events";

// ── sha256 ─────────────────────────────────────────────────────────
test("sha256: deterministic + known vector", () => {
  // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256("abc"), sha256("abc"));
  assert.notEqual(sha256("abc"), sha256("abd"));
});
test("sha256: hashes buffers (file contents)", () => {
  assert.equal(sha256(Buffer.from("abc")), sha256("abc"));
});

// ── parseCheckpoint ────────────────────────────────────────────────
test("parseCheckpoint: collects done SHAs", () => {
  const txt = '{"sha":"aaa","path":"p1","ok":true}\n{"sha":"bbb","path":"p2","ok":false}\n';
  const s = parseCheckpoint(txt);
  assert.equal(s.size, 2);
  assert.ok(s.has("aaa") && s.has("bbb"));
});
test("parseCheckpoint: a FAILED entry still marks the sha done (no infinite retry)", () => {
  // both ok:true and ok:false records carry sha → resume skips both (operator
  // re-runs failures explicitly; the batch must not loop forever on a bad print).
  const s = parseCheckpoint('{"sha":"x","ok":false}');
  assert.ok(s.has("x"));
});
test("parseCheckpoint: tolerant of blank/malformed lines + missing sha", () => {
  const txt = '\n  \n{bad json}\n{"path":"no-sha"}\n{"sha":"good"}\n';
  const s = parseCheckpoint(txt);
  assert.equal(s.size, 1);
  assert.ok(s.has("good"));
});
test("parseCheckpoint: empty/non-string → empty set", () => {
  assert.equal(parseCheckpoint("").size, 0);
  assert.equal(parseCheckpoint(null).size, 0);
  assert.equal(parseCheckpoint(undefined).size, 0);
});

// ── parseWorklist ──────────────────────────────────────────────────
test("parseWorklist: paths, skipping blanks + # comments, order-preserving", () => {
  const txt = "# header\nH:/a.pdf\n\n  H:/b.pdf  \n# mid comment\nH:/c.pdf\n";
  assert.deepEqual(parseWorklist(txt), ["H:/a.pdf", "H:/b.pdf", "H:/c.pdf"]);
});
test("parseWorklist: de-duplicates repeated paths (first wins, order kept)", () => {
  assert.deepEqual(parseWorklist("H:/a.pdf\nH:/b.pdf\nH:/a.pdf"), ["H:/a.pdf", "H:/b.pdf"]);
});
test("parseWorklist: empty / non-string → []", () => {
  assert.deepEqual(parseWorklist(""), []);
  assert.deepEqual(parseWorklist("\n\n# only comments\n"), []);
  assert.deepEqual(parseWorklist(null), []);
});

// ── withinBudget ───────────────────────────────────────────────────
test("withinBudget: <=0 budget = unlimited (always true)", () => {
  assert.equal(withinBudget(0, 999999999, 0), true);
  assert.equal(withinBudget(0, 999999999, -5), true);
  assert.equal(withinBudget(0, 999999999, NaN), true);
});
test("withinBudget: true while under, false once exceeded", () => {
  const start = 1_000_000;
  assert.equal(withinBudget(start, start + 5 * 60000, 10), true);   // 5min < 10min
  assert.equal(withinBudget(start, start + 10 * 60000, 10), false); // 10min == budget → stop
  assert.equal(withinBudget(start, start + 11 * 60000, 10), false); // over
});

// ── buildPrintArgs (the reviewer-caught flag-forwarding contract) ──
const RUN = "run.mjs";
function flagsOf(opts) { return buildPrintArgs(RUN, "p.pdf", opts); }
test("buildPrintArgs: base always has --pdf/--part-class/--json/--emit-event", () => {
  const a = flagsOf({ partClass: "electrode" });
  assert.deepEqual(a.slice(0, 7), [RUN, "--pdf", "p.pdf", "--part-class", "electrode", "--json", "--emit-event"]);
});
test("buildPrintArgs: --grayscale FORWARDED (the bug B caught — was silently dropped)", () => {
  assert.ok(flagsOf({ grayscale: true }).includes("--grayscale"));
});
test("buildPrintArgs: --preprocess WINS over --grayscale (no duplicate, matches single runner)", () => {
  const a = flagsOf({ grayscale: true, preprocess: true });
  assert.ok(a.includes("--preprocess"));
  assert.ok(!a.includes("--grayscale"), "preprocess includes grayscale base — no separate --grayscale");
});
test("buildPrintArgs: --deskew only with --preprocess", () => {
  assert.ok(flagsOf({ preprocess: true, deskew: true }).includes("--deskew"));
  assert.ok(!flagsOf({ deskew: true }).includes("--deskew"), "deskew dropped without preprocess");
  assert.ok(!flagsOf({ grayscale: true, deskew: true }).includes("--deskew"));
});
test("buildPrintArgs: rgb default forwards NO render flag", () => {
  const a = flagsOf({});
  assert.ok(!a.includes("--grayscale") && !a.includes("--preprocess"));
});
test("buildPrintArgs: assume-units / max-pages / dpi / timeout forwarded when set", () => {
  const a = flagsOf({ assumeUnits: "in", maxPages: 8, dpi: 200, timeoutMs: 200000 });
  assert.ok(a.includes("--assume-units") && a[a.indexOf("--assume-units") + 1] === "in");
  assert.ok(a.includes("--max-pages") && a[a.indexOf("--max-pages") + 1] === "8");
  assert.ok(a.includes("--dpi") && a[a.indexOf("--dpi") + 1] === "200");
  assert.ok(a.includes("--timeout-ms"));
});
test("buildPrintArgs: maxPages 0 / negative → flag omitted (single runner default governs)", () => {
  assert.ok(!flagsOf({ maxPages: 0 }).includes("--max-pages"));
  assert.ok(!flagsOf({ maxPages: -1 }).includes("--max-pages"));
});

// ── resolveConcurrency (U-CGP-CONCURRENCY) ─────────────────────────
test("resolveConcurrency: explicit --concurrency wins over profile", () => {
  assert.equal(resolveConcurrency(4, 1), 4);
});
test("resolveConcurrency: 0/NaN/undefined CLI falls back to profile", () => {
  assert.equal(resolveConcurrency(0, 3), 3);
  assert.equal(resolveConcurrency(NaN, 2), 2);
  assert.equal(resolveConcurrency(undefined, 3), 3);
});
test("resolveConcurrency: clamps to [1,8] and floors", () => {
  assert.equal(resolveConcurrency(99, 1), 8);
  assert.equal(resolveConcurrency(0, 99), 8);
  assert.equal(resolveConcurrency(1.9, 0), 1);
});
test("resolveConcurrency: both invalid → 1 (serial, safe default)", () => {
  assert.equal(resolveConcurrency(0, 0), 1);
  assert.equal(resolveConcurrency(undefined, undefined), 1);
});

// ── runExtractionPool (the Blackwell parallelism lever) ────────────
function poolArgs(over = {}) {
  return { limit: 0, timeBudgetMin: 0, dryRun: false, checkpoint: "ckpt.jsonl", ...over };
}
function poolDeps(over = {}) {
  const appended = [];
  const base = {
    existsImpl: () => true,
    readImpl: (p) => Buffer.from("CONTENT:" + p),
    appendImpl: (_f, line) => appended.push(line),
    logImpl: () => {},
    errImpl: () => {},
  };
  for (const k of Object.keys(over)) if (over[k] !== undefined) base[k] = over[k];
  return { deps: base, appended };
}

test("pool: concurrency=1 processes every path exactly once (serial back-compat)", async () => {
  const calls = [];
  const { deps } = poolDeps({ runImpl: async (p) => { calls.push(p); return { exit: 0, summary: { pages_ok: 2 } }; }, concurrency: 1 });
  const stats = await runExtractionPool(["a.pdf", "b.pdf", "c.pdf"], poolArgs(), deps);
  assert.deepEqual(calls.sort(), ["a.pdf", "b.pdf", "c.pdf"]);
  assert.equal(stats.attempted, 3);
  assert.equal(stats.ok, 3);
  assert.equal(stats.failed, 0);
});

test("pool: concurrency=3 extracts each path EXACTLY once (claim atomicity)", async () => {
  const calls = [];
  const { deps } = poolDeps({
    runImpl: async (p) => { calls.push(p); await new Promise((r) => setTimeout(r, 3)); return { exit: 0, summary: { pages_ok: 1 } }; },
    concurrency: 3,
  });
  const paths = Array.from({ length: 12 }, (_, i) => "p" + i + ".pdf");
  const stats = await runExtractionPool(paths, poolArgs(), deps);
  assert.equal(calls.length, 12);
  assert.equal(new Set(calls).size, 12, "no path extracted twice");
  assert.equal(stats.attempted, 12);
  assert.equal(stats.ok, 12);
});

test("pool: never more than `concurrency` extractions in flight", async () => {
  let inflight = 0, maxInflight = 0;
  const { deps } = poolDeps({
    runImpl: async () => { inflight++; maxInflight = Math.max(maxInflight, inflight); await new Promise((r) => setTimeout(r, 5)); inflight--; return { exit: 0, summary: { pages_ok: 1 } }; },
    concurrency: 3,
  });
  await runExtractionPool(Array.from({ length: 9 }, (_, i) => "q" + i + ".pdf"), poolArgs(), deps);
  assert.equal(maxInflight, 3, "in-flight bounded to concurrency");
});

test("pool: --limit caps attempted even under concurrency", async () => {
  const calls = [];
  const { deps } = poolDeps({ runImpl: async (p) => { calls.push(p); await new Promise((r) => setTimeout(r, 2)); return { exit: 0, summary: { pages_ok: 1 } }; }, concurrency: 3 });
  const stats = await runExtractionPool(["a", "b", "c", "d", "e"], poolArgs({ limit: 2 }), deps);
  assert.equal(stats.attempted, 2);
  assert.equal(calls.length, 2, "no over-claim past the limit");
});

test("pool: dry-run counts attempted but never spawns or checkpoints", async () => {
  let ran = 0;
  const { deps, appended } = poolDeps({ runImpl: async () => { ran++; return { exit: 0, summary: { pages_ok: 1 } }; }, concurrency: 2 });
  const stats = await runExtractionPool(["a", "b"], poolArgs({ dryRun: true }), deps);
  assert.equal(ran, 0, "runImpl must not be called in dry-run");
  assert.equal(appended.length, 0, "no checkpoint writes in dry-run");
  assert.equal(stats.attempted, 2);
});

test("pool: pre-done SHA is skipped (resume), not re-extracted", async () => {
  const calls = [];
  const doneSet = new Set([sha256(Buffer.from("CONTENT:a.pdf"))]);
  const { deps } = poolDeps({ runImpl: async (p) => { calls.push(p); return { exit: 0, summary: { pages_ok: 1 } }; }, concurrency: 2, doneSet });
  const stats = await runExtractionPool(["a.pdf", "b.pdf"], poolArgs(), deps);
  assert.deepEqual(calls, ["b.pdf"]);
  assert.equal(stats.skipped_done, 1);
  assert.equal(stats.attempted, 1);
});

test("pool: two paths with identical content extract ONCE (SHA dedup)", async () => {
  const calls = [];
  const { deps } = poolDeps({ readImpl: () => Buffer.from("SAME"), runImpl: async (p) => { calls.push(p); return { exit: 0, summary: { pages_ok: 1 } }; }, concurrency: 2 });
  const stats = await runExtractionPool(["x.pdf", "y.pdf"], poolArgs(), deps);
  assert.equal(calls.length, 1, "same-SHA dupe extracted once");
  assert.equal(stats.skipped_done, 1);
});

test("pool: missing files counted as skipped_missing, not extracted", async () => {
  const calls = [];
  const { deps } = poolDeps({ existsImpl: (p) => p !== "gone.pdf", runImpl: async (p) => { calls.push(p); return { exit: 0, summary: { pages_ok: 1 } }; }, concurrency: 2 });
  const stats = await runExtractionPool(["here.pdf", "gone.pdf"], poolArgs(), deps);
  assert.equal(stats.skipped_missing, 1);
  assert.deepEqual(calls, ["here.pdf"]);
});

test("pool: a failed print → stats.failed + ok:false checkpoint record (no pool abort)", async () => {
  const { deps, appended } = poolDeps({ runImpl: async (p) => (p === "bad.pdf" ? { exit: 1, summary: null, stderr: "boom" } : { exit: 0, summary: { pages_ok: 1 } }), concurrency: 2 });
  const stats = await runExtractionPool(["bad.pdf", "good.pdf"], poolArgs(), deps);
  assert.equal(stats.ok, 1);
  assert.equal(stats.failed, 1);
  const recs = appended.map((l) => JSON.parse(l));
  const bad = recs.find((r) => r.path === "bad.pdf");
  assert.equal(bad.ok, false);
  assert.equal(bad.err, "boom");
});

test("pool: a REJECTING runImpl is caught — failed print, no pool abort (structural fail-soft)", async () => {
  const { deps, appended } = poolDeps({
    runImpl: async (p) => { if (p === "throws.pdf") throw new Error("boom"); return { exit: 0, summary: { pages_ok: 1 } }; },
    concurrency: 2,
  });
  const stats = await runExtractionPool(["throws.pdf", "ok.pdf"], poolArgs(), deps);
  assert.equal(stats.ok, 1);
  assert.equal(stats.failed, 1, "the rejecting print counts as failed, pool continued");
  const bad = appended.map((l) => JSON.parse(l)).find((r) => r.path === "throws.pdf");
  assert.equal(bad.ok, false);
  assert.match(bad.err, /runImpl threw: boom/);
});

test("pool: time-budget trip sets budget_hit and stops claiming", async () => {
  const calls = [];
  const { deps } = poolDeps({ now: () => 10 * 60000, startMs: 0, runImpl: async (p) => { calls.push(p); return { exit: 0, summary: { pages_ok: 1 } }; }, concurrency: 2 });
  const stats = await runExtractionPool(["a", "b", "c"], poolArgs({ timeBudgetMin: 1 }), deps);
  assert.equal(stats.budget_hit, true);
  assert.equal(calls.length, 0, "nothing claimed once over budget");
});

// ── runOnePrintAsync via injected fake child (no real 3-min spawn) ──
function fakeChild() {
  const c = new EventEmitter();
  c.stdout = new EventEmitter(); c.stdout.setEncoding = () => {};
  c.stderr = new EventEmitter(); c.stderr.setEncoding = () => {};
  c.kill = () => { c.killed = true; };
  return c;
}

test("runOnePrintAsync: close 0 + JSON stdout → parsed summary, killed:false", async () => {
  const child = fakeChild();
  const p = runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => child });
  queueMicrotask(() => { child.stdout.emit("data", JSON.stringify({ pages_ok: 3, pages_processed: 3 })); child.emit("close", 0); });
  const r = await p;
  assert.equal(r.exit, 0);
  assert.deepEqual(r.summary, { pages_ok: 3, pages_processed: 3 });
  assert.equal(r.killed, false);
});

test("runOnePrintAsync: non-JSON stdout → summary null (no throw)", async () => {
  const child = fakeChild();
  const p = runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => child });
  queueMicrotask(() => { child.stdout.emit("data", "not json"); child.stderr.emit("data", "warn"); child.emit("close", 1); });
  const r = await p;
  assert.equal(r.exit, 1);
  assert.equal(r.summary, null);
  assert.equal(r.stderr, "warn");
});

test("runOnePrintAsync: child 'error' event RESOLVES (never rejects)", async () => {
  const child = fakeChild();
  const p = runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => child });
  queueMicrotask(() => child.emit("error", new Error("ENOENT")));
  const r = await p;
  assert.equal(r.exit, null);
  assert.match(r.stderr, /spawn error: ENOENT/);
});

test("runOnePrintAsync: spawn throw RESOLVES with spawn-failed shape", async () => {
  const r = await runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => { throw new Error("EACCES"); } });
  assert.equal(r.exit, null);
  assert.match(r.stderr, /spawn failed: EACCES/);
});

test("runOnePrintAsync: timeout SIGKILLs the child and resolves killed:true (scrutiny P1-3)", async () => {
  const child = fakeChild();
  const p = runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => child, spawnTimeoutMs: 5 });
  const r = await p; // never emit close → the 5ms timer fires
  assert.equal(r.killed, true);
  assert.equal(r.exit, null);
  assert.match(r.stderr, /timeout after 5ms/);
  assert.equal(child.killed, true, "child was SIGKILLed on timeout");
});

test("runOnePrintAsync: a late close after timeout is a no-op (settled double-resolve guard)", async () => {
  const child = fakeChild();
  const r = await runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => child, spawnTimeoutMs: 5 });
  assert.equal(r.killed, true);
  // emitting a late close must NOT throw or change the already-settled result
  child.stdout.emit("data", JSON.stringify({ pages_ok: 9 }));
  child.emit("close", 0);
  assert.equal(r.killed, true, "result unchanged after late close");
});

// ── resolveOllamaParallel (U-CGP-CONCURRENCY P0-1 — honest inference bound) ──
test("resolveOllamaParallel: parses a set integer value (floored)", () => {
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "4" }), 4);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "1" }), 1);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "2.9" }), 2);
});
test("resolveOllamaParallel: unset/blank/invalid/≤0 → null (unverified, never assumed)", () => {
  assert.equal(resolveOllamaParallel({}), null);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "" }), null);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "   " }), null);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "abc" }), null);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "0" }), null);
  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "-3" }), null);
});
