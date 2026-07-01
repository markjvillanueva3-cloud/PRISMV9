// scripts/ollama-stress-test.test.mjs
//
// Real-assertion tests for the PURE analysis core of the Ollama stress harness
// (U-ALPHA-OLLAMA-STRESS). No network: every function is fed synthetic metric
// rows so the knee/frontier math is pinned with reference values.
//
// Run: node scripts/ollama-stress-test.test.mjs   (node:test auto-runs on exit)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  tokPerSec,
  percentile,
  findConcurrencyKnee,
  smallestPassingModel,
  classifyTaskFrontier,
  runConcurrencySweep,
  parseArgs,
  renderReport,
} from "./ollama-stress-test.mjs";

// --- tokPerSec ------------------------------------------------------------

test("tokPerSec: eval_count / (eval_duration ns -> s)", () => {
  assert.equal(tokPerSec({ eval_count: 200, eval_duration: 2e9 }), 100); // 200 tok / 2s
  assert.ok(Math.abs(tokPerSec({ eval_count: 2, eval_duration: 31_450_000 }) - 63.6) < 0.2); // live ref
});

test("tokPerSec: unmeasurable inputs -> 0 (adversarial)", () => {
  assert.equal(tokPerSec(null), 0);
  assert.equal(tokPerSec({}), 0);
  assert.equal(tokPerSec({ eval_count: 0, eval_duration: 1e9 }), 0);
  assert.equal(tokPerSec({ eval_count: 100, eval_duration: 0 }), 0);
  assert.equal(tokPerSec({ eval_count: NaN, eval_duration: 1e9 }), 0);
  assert.equal(tokPerSec({ eval_count: -5, eval_duration: 1e9 }), 0);
});

// --- percentile -----------------------------------------------------------

test("percentile: nearest-rank reference values", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentile(xs, 50), 5);   // ceil(0.5*10)=5 -> idx 4
  assert.equal(percentile(xs, 95), 10);  // ceil(0.95*10)=10 -> idx 9
  assert.equal(percentile(xs, 100), 10);
});

test("percentile: empty -> 0, single -> itself, p clamps (adversarial)", () => {
  assert.equal(percentile([], 50), 0);
  assert.equal(percentile([42], 50), 42);
  assert.equal(percentile([1, 2, 3], -10), 1);   // clamps to 0th
  assert.equal(percentile([1, 2, 3], 999), 3);   // clamps to 100th
  assert.equal(percentile([3, 1, NaN, 2], 50), 2); // filters NaN + sorts
});

// --- findConcurrencyKnee --------------------------------------------------

test("findConcurrencyKnee: plateau -> knee at last profitably-scaling level", () => {
  const rows = [
    { concurrency: 1, aggTokPerSec: 100, p95Ms: 1000 },
    { concurrency: 2, aggTokPerSec: 190, p95Ms: 1100 }, // +90% -> scales
    { concurrency: 4, aggTokPerSec: 200, p95Ms: 1200 }, // +5% -> plateau
  ];
  const k = findConcurrencyKnee(rows);
  assert.equal(k.knee, 2);
  assert.equal(k.saturated, true);
  assert.match(k.rationale, /gain/);
});

test("findConcurrencyKnee: latency blowup caps the knee even if throughput rises", () => {
  const rows = [
    { concurrency: 1, aggTokPerSec: 100, p95Ms: 1000 },
    { concurrency: 2, aggTokPerSec: 200, p95Ms: 5000 }, // +100% tok but p95 5x > 3x baseline
  ];
  const k = findConcurrencyKnee(rows);
  assert.equal(k.knee, 1);
  assert.equal(k.saturated, true);
  assert.match(k.rationale, /p95/);
});

test("findConcurrencyKnee: keeps scaling to the top of the sweep", () => {
  const rows = [
    { concurrency: 1, aggTokPerSec: 100, p95Ms: 1000 },
    { concurrency: 2, aggTokPerSec: 200, p95Ms: 1100 },
    { concurrency: 4, aggTokPerSec: 400, p95Ms: 1200 },
  ];
  const k = findConcurrencyKnee(rows);
  assert.equal(k.knee, 4);
  assert.equal(k.saturated, false);
});

test("findConcurrencyKnee: empty + single-point edge cases", () => {
  assert.deepEqual(findConcurrencyKnee([]), { knee: 0, saturated: false, rationale: "no-data" });
  const one = findConcurrencyKnee([{ concurrency: 1, aggTokPerSec: 50, p95Ms: 900 }]);
  assert.equal(one.knee, 1);
  assert.equal(one.rationale, "single-point");
});

// --- smallestPassingModel -------------------------------------------------

test("smallestPassingModel: returns the smallest by param count that meets threshold", () => {
  const rows = [
    { model: "qwen2.5-coder:32b", passRate: 1 },
    { model: "qwen2.5-coder:1.5b", passRate: 1 },
    { model: "qwen2.5-coder:7b", passRate: 0.5 },
  ];
  assert.equal(smallestPassingModel(rows, 1), "qwen2.5-coder:1.5b"); // smallest passes
});

test("smallestPassingModel: skips small failures, returns first passing up the ladder", () => {
  const rows = [
    { model: "qwen2.5-coder:1.5b", passRate: 0.5 },
    { model: "qwen2.5-coder:7b", passRate: 1 },
    { model: "qwen2.5-coder:32b", passRate: 1 },
  ];
  assert.equal(smallestPassingModel(rows, 1), "qwen2.5-coder:7b");
});

test("smallestPassingModel: none pass -> null (adversarial)", () => {
  const rows = [
    { model: "qwen2.5-coder:1.5b", passRate: 0.3 },
    { model: "qwen2.5-coder:32b", passRate: 0.66 },
  ];
  assert.equal(smallestPassingModel(rows, 1), null);
});

// --- classifyTaskFrontier -------------------------------------------------

const LADDER = ["qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5-coder:32b"];
const rowsWith = (passes) => LADDER.map((m, i) => ({ model: m, passRate: passes[i] }));

test("classifyTaskFrontier: trivial-local when the smallest model passes", () => {
  const f = classifyTaskFrontier(rowsWith([1, 1, 1, 1]));
  assert.equal(f.verdict, "trivial-local");
  assert.equal(f.smallestPassing, "qwen2.5-coder:1.5b");
  assert.equal(f.beyondLocal, false);
});

test("classifyTaskFrontier: large-local when only the biggest passes", () => {
  const f = classifyTaskFrontier(rowsWith([0, 0, 0, 1]));
  assert.equal(f.verdict, "large-local");
  assert.equal(f.smallestPassing, "qwen2.5-coder:32b");
});

test("classifyTaskFrontier: mid-local when a middle model is the first to pass", () => {
  const f = classifyTaskFrontier(rowsWith([0, 1, 1, 1]));
  assert.equal(f.verdict, "mid-local");
  assert.equal(f.smallestPassing, "qwen2.5-coder:7b");
});

test("classifyTaskFrontier: beyond-local when nothing passes -> stays on Claude", () => {
  const f = classifyTaskFrontier(rowsWith([0, 0.3, 0.6, 0.9]));
  assert.equal(f.verdict, "beyond-local");
  assert.equal(f.smallestPassing, null);
  assert.equal(f.beyondLocal, true);
});

test("classifyTaskFrontier: low sample size flags confident:false (R12 honesty)", () => {
  // n=1 -> a single Bernoulli trial -> not a routing-grade verdict.
  const lowN = classifyTaskFrontier(rowsWith([1, 1, 1, 1]), 1, 1);
  assert.equal(lowN.confident, false);
  assert.equal(lowN.sampleSize, 1);
  assert.equal(lowN.verdict, "trivial-local"); // verdict still computed, just flagged
  // n=3 -> meets MIN_CONFIDENT_N -> confident.
  const okN = classifyTaskFrontier(rowsWith([1, 1, 1, 1]), 1, 3);
  assert.equal(okN.confident, true);
  assert.equal(okN.sampleSize, 3);
  // unknown n -> not flagged (back-compat with callers that omit it).
  assert.equal(classifyTaskFrontier(rowsWith([1, 1, 1, 1])).confident, true);
});

test("renderReport: surfaces (low-n) flag + ADVISORY caveat for low-sample verdicts", () => {
  const md = renderReport({
    url: "http://x", host: "H",
    tier: { perTask: [{
      task: "json-extract", category: "extraction",
      perModel: [{ model: "qwen2.5-coder:1.5b", passRate: 1, passed: 1, total: 1 }],
      frontier: { verdict: "trivial-local", smallestPassing: "qwen2.5-coder:1.5b", confident: false, sampleSize: 1 },
    }] },
  });
  assert.match(md, /low-n/);
  assert.match(md, /ADVISORY/);
  assert.match(md, /1\/1/); // discloses the passed/total denominator
});

// --- runConcurrencySweep wedge guard (R16) --------------------------------

test("runConcurrencySweep: aborts escalation when a level wedges, skips higher levels", async () => {
  // Succeed for the first 3 calls (c=1 -> 1 call, c=2 -> 2 calls), then every
  // later call fails -> c=4 produces zero successes -> wedge detected.
  let n = 0;
  const callFn = async () => {
    n++;
    return n <= 3
      ? { ok: true, eval_count: 100, eval_duration: 1e9, totalMs: 100, tokPerSec: 100 }
      : { ok: false, reason: "wedged" };
  };
  const res = await runConcurrencySweep({ model: "m", levels: [1, 2, 4, 8], callFn });
  assert.equal(res.wedgedAt, 4);
  const c8 = res.rows.find((r) => r.concurrency === 8);
  assert.equal(c8.skipped, true);
  assert.match(c8.reason, /aborted-after-wedge-at-c4/);
  // c=8 was NOT actually executed (only 3 ok + 4 failed = 7 calls; c=8 would add 8 more).
  assert.equal(n, 7);
});

test("runConcurrencySweep: threads numCtx through to every call (the no-tradeoff fix)", async () => {
  const seen = [];
  const callFn = async (_m, _p, o) => { seen.push(o.numCtx); return { ok: true, eval_count: 50, eval_duration: 1e9, totalMs: 80, tokPerSec: 50 }; };
  await runConcurrencySweep({ model: "m", levels: [1, 2], numCtx: 4096, callFn });
  assert.equal(seen.length, 3);              // 1 + 2 calls
  assert.ok(seen.every((c) => c === 4096));  // every request got the small context
});

test("runConcurrencySweep: no wedge -> runs all levels, wedgedAt null", async () => {
  const callFn = async () => ({ ok: true, eval_count: 50, eval_duration: 1e9, totalMs: 80, tokPerSec: 50 });
  const res = await runConcurrencySweep({ model: "m", levels: [1, 2], callFn });
  assert.equal(res.wedgedAt, null);
  assert.equal(res.rows.length, 2);
  assert.ok(res.rows.every((r) => !r.skipped));
});

test("renderReport: surfaces the WEDGE warning + recovery hint when wedgedAt set", () => {
  const md = renderReport({
    url: "http://x", host: "H",
    concurrency: { model: "m", wedgedAt: 8, knee: { knee: 4, rationale: "x" }, rows: [
      { concurrency: 4, ok: 4, failed: 0, aggTokPerSec: 200, p50Ms: 100, p95Ms: 200, wallMs: 300 },
      { concurrency: 8, ok: 0, failed: 0, aggTokPerSec: 0, p50Ms: 0, p95Ms: 0, wallMs: 0, skipped: true, reason: "aborted-after-wedge-at-c8" },
    ] },
  });
  assert.match(md, /WEDGE/);
  assert.match(md, /ollama-wedge-guard\.mjs --recover/);
  assert.match(md, /\(skipped\)/);
});

// --- parseArgs + renderReport ---------------------------------------------

test("parseArgs: defaults + overrides", () => {
  const d = parseArgs([]);
  assert.equal(d.sweep, "all");
  assert.deepEqual(d.concurrency, [1, 2, 4]); // default stops at 4 (c=8 wedges the box)
  const o = parseArgs(["--sweep", "concurrency", "--model", "gpt-oss:20b", "--concurrency", "1,2,4", "--include-120b", "--json"]);
  assert.equal(o.sweep, "concurrency");
  assert.equal(o.model, "gpt-oss:20b");
  assert.deepEqual(o.concurrency, [1, 2, 4]);
  assert.equal(o.include120b, true);
  assert.equal(o.json, true);
});

test("renderReport: emits frontier + knee sections from a report object", () => {
  const md = renderReport({
    url: "http://x", host: "H",
    tier: { perTask: [{ task: "classify-enum", category: "classification", perModel: [{ model: "qwen2.5-coder:1.5b", passRate: 1 }], frontier: { verdict: "trivial-local", smallestPassing: "qwen2.5-coder:1.5b" } }] },
    concurrency: { model: "gpt-oss:20b", rows: [{ concurrency: 1, ok: 1, failed: 0, aggTokPerSec: 50, p50Ms: 100, p95Ms: 120, wallMs: 130 }], knee: { knee: 1, rationale: "single-point" } },
  });
  assert.match(md, /Model-tier capability frontier/);
  assert.match(md, /trivial-local/);
  assert.match(md, /Concurrency ceiling -- gpt-oss:20b/);
  assert.match(md, /Knee:\*\* c=1/);
});
