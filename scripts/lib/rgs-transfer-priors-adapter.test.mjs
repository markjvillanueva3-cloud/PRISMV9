/**
 * rgs-transfer-priors-adapter.test.mjs — covers U-LIMA-A8.
 *
 * Test framework: node:test (same as rgs-rie-adapter.test.mjs and
 * rgs-calibration-adapter.test.mjs — the A6/A7 sibling adapters).
 *
 * Run: node --test scripts/lib/rgs-transfer-priors-adapter.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  PIPELINE_CLUSTERS,
  PIPELINE_CLUSTER_MAP,
  TRANSFER_PAIRS,
  DEFAULT_DISCOUNT,
  pipelineToCluster,
  pipelinesInCluster,
  listDonorPipelines,
  makeTransferPriorsOutcomes,
} from "./rgs-transfer-priors-adapter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

// ===========================================================================
// pipelineToCluster
// ===========================================================================

test("pipelineToCluster: returns the cluster for every known pipeline", () => {
  // Spot-check one per cluster — the full map is asserted via PIPELINE_CLUSTER_MAP below.
  assert.equal(pipelineToCluster("/mill"), "mill");
  assert.equal(pipelineToCluster("/lathe"), "lathe");
  assert.equal(pipelineToCluster("/wedm"), "wedm");
  assert.equal(pipelineToCluster("/cam-strategy"), "cam");
  assert.equal(pipelineToCluster("/cad-from-blueprint"), "cad");
  assert.equal(pipelineToCluster("/pdf-learn"), "knowledge");
  assert.equal(pipelineToCluster("/scrutinize"), "review");
  assert.equal(pipelineToCluster("/forge-triple"), "build");
});

test("pipelineToCluster: every key in PIPELINE_CLUSTER_MAP resolves consistently", () => {
  for (const [pipeline, cluster] of Object.entries(PIPELINE_CLUSTER_MAP)) {
    assert.equal(pipelineToCluster(pipeline), cluster, `pipeline ${pipeline} -> ${cluster}`);
    assert.ok(PIPELINE_CLUSTERS.includes(cluster), `cluster ${cluster} must be in PIPELINE_CLUSTERS`);
  }
});

test("pipelineToCluster: unknown / null / undefined / empty all return null", () => {
  assert.equal(pipelineToCluster("not-a-pipeline"), null);
  assert.equal(pipelineToCluster(""), null);
  assert.equal(pipelineToCluster(null), null);
  assert.equal(pipelineToCluster(undefined), null);
  // Non-string inputs — defensive against caller bugs.
  assert.equal(pipelineToCluster(123), null);
  assert.equal(pipelineToCluster({}), null);
  assert.equal(pipelineToCluster([]), null);
});

test("pipelineToCluster: prototype-pollution-style key resolves to null", () => {
  // Object.prototype.hasOwnProperty guard — '__proto__' / 'constructor' /
  // 'toString' must NOT resolve to a real cluster via prototype walk.
  assert.equal(pipelineToCluster("__proto__"), null);
  assert.equal(pipelineToCluster("constructor"), null);
  assert.equal(pipelineToCluster("toString"), null);
});

// ===========================================================================
// pipelinesInCluster
// ===========================================================================

test("pipelinesInCluster: returns frozen, sorted pipeline arrays", () => {
  const mill = pipelinesInCluster("mill");
  assert.ok(Array.isArray(mill));
  assert.ok(mill.length > 0, "mill cluster must have at least one pipeline");
  // Sorted check.
  const sorted = [...mill].sort();
  assert.deepEqual(mill, sorted, "pipelinesInCluster output must be sorted");
  // Frozen check — Object.isFrozen returns true for frozen arrays.
  assert.ok(Object.isFrozen(mill), "returned array must be frozen");
});

test("pipelinesInCluster: every cluster has a pipeline", () => {
  // No empty clusters in the canonical map — guards against typos / orphans.
  for (const cluster of PIPELINE_CLUSTERS) {
    const pipelines = pipelinesInCluster(cluster);
    assert.ok(pipelines.length >= 1, `cluster ${cluster} must have >=1 pipeline`);
  }
});

test("pipelinesInCluster: unknown cluster returns empty frozen array", () => {
  const out = pipelinesInCluster("nonexistent");
  assert.deepEqual(out, []);
  // Frozen empty array — defensive against caller mutation.
  assert.ok(Object.isFrozen(out));
});

// ===========================================================================
// listDonorPipelines
// ===========================================================================

test("listDonorPipelines: mill borrows from lathe + cam", () => {
  const donors = listDonorPipelines("/mill");
  assert.ok(donors.length > 0);
  // Every donor is in lathe or cam cluster.
  for (const d of donors) {
    const cluster = pipelineToCluster(d);
    assert.ok(cluster === "lathe" || cluster === "cam", `donor ${d} cluster must be lathe or cam, got ${cluster}`);
  }
  // /lathe and /cam-strategy specifically present.
  assert.ok(donors.includes("/lathe"), "mill should have /lathe as a donor");
  assert.ok(donors.includes("/cam-strategy"), "mill should have /cam-strategy as a donor");
});

test("listDonorPipelines: lathe borrows from mill + cam (symmetric)", () => {
  const donors = listDonorPipelines("/lathe");
  for (const d of donors) {
    const cluster = pipelineToCluster(d);
    assert.ok(cluster === "mill" || cluster === "cam", `donor ${d} cluster must be mill or cam, got ${cluster}`);
  }
  assert.ok(donors.includes("/mill"));
});

test("listDonorPipelines: wedm has NO donors (EDM physics is non-cutting)", () => {
  assert.deepEqual(listDonorPipelines("/wedm"), []);
});

test("listDonorPipelines: unknown pipeline returns empty array", () => {
  assert.deepEqual(listDonorPipelines("/unknown-pipeline"), []);
  assert.deepEqual(listDonorPipelines(""), []);
  assert.deepEqual(listDonorPipelines(null), []);
});

test("listDonorPipelines: result excludes the target itself", () => {
  for (const pipeline of Object.keys(PIPELINE_CLUSTER_MAP)) {
    const donors = listDonorPipelines(pipeline);
    assert.ok(!donors.includes(pipeline), `donors for ${pipeline} must not include itself`);
  }
});

// ===========================================================================
// Constants — freeze / shape
// ===========================================================================

test("constants: PIPELINE_CLUSTERS is frozen", () => {
  assert.ok(Object.isFrozen(PIPELINE_CLUSTERS));
  assert.equal(PIPELINE_CLUSTERS.length, 8);
});

test("constants: PIPELINE_CLUSTER_MAP is frozen", () => {
  assert.ok(Object.isFrozen(PIPELINE_CLUSTER_MAP));
});

test("constants: TRANSFER_PAIRS is frozen at the outer object level", () => {
  // The inner Sets are not frozen (Set has no Object.freeze equivalent), but
  // the outer object is, so callers can't add new keys at runtime.
  assert.ok(Object.isFrozen(TRANSFER_PAIRS));
  // Symmetric pairs check — if mill->{lathe,cam} then lathe->{mill,...}
  assert.ok(TRANSFER_PAIRS.mill.has("lathe"));
  assert.ok(TRANSFER_PAIRS.lathe.has("mill"));
});

test("constants: DEFAULT_DISCOUNT is a number in (0, 1)", () => {
  assert.equal(typeof DEFAULT_DISCOUNT, "number");
  assert.ok(DEFAULT_DISCOUNT > 0 && DEFAULT_DISCOUNT < 1);
});

// ===========================================================================
// makeTransferPriorsOutcomes — error shape
// ===========================================================================

test("makeTransferPriorsOutcomes: throws on non-function baseReader", () => {
  assert.throws(() => makeTransferPriorsOutcomes(null), { name: "TypeError" });
  assert.throws(() => makeTransferPriorsOutcomes("hello"), { name: "TypeError" });
  assert.throws(() => makeTransferPriorsOutcomes({}), { name: "TypeError" });
});

// ===========================================================================
// makeTransferPriorsOutcomes — own-signal short-circuit
// ===========================================================================

test("makeTransferPriorsOutcomes: nonzero own outcome passes through unchanged", async () => {
  const baseReader = async () => ({ shipped: 3, blocked: 1, reverted: 0 });
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 3, blocked: 1, reverted: 0 });
});

test("makeTransferPriorsOutcomes: own-only when shipped=0 blocked=0 reverted>0 still wins", async () => {
  // Even a single reverted is "signal" — short-circuit.
  const baseReader = async () => ({ shipped: 0, blocked: 0, reverted: 1 });
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 1 });
});

// ===========================================================================
// makeTransferPriorsOutcomes — donor aggregation
// ===========================================================================

test("makeTransferPriorsOutcomes: zero-own + donor signal -> discounted aggregate", async () => {
  // Mock baseReader: /mill is cold, /lathe has signal, /cam-strategy has none.
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 10, blocked: 4, reverted: 2 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  // Default discount 0.5: /lathe's {10,4,2} -> floor({5,2,1}) when this is the
  // only nonzero donor. Other lathe-cluster pipelines + cam-cluster pipelines
  // all return zeros and are summed (additively 0) before discount.
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 5, blocked: 2, reverted: 1 });
});

test("makeTransferPriorsOutcomes: multiple donors summed before discount", async () => {
  // Two donors both supply signal; sum-then-discount.
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 4, blocked: 2, reverted: 0 };
    if (pipeline === "/cam-strategy") return { shipped: 6, blocked: 0, reverted: 2 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  // Sum: shipped=10 blocked=2 reverted=2; discount 0.5 -> {5, 1, 1}
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 5, blocked: 1, reverted: 1 });
});

test("makeTransferPriorsOutcomes: discount=1 yields full donor signal", async () => {
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 8, blocked: 2, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  const wrap = makeTransferPriorsOutcomes(baseReader, { discount: 1 });
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 8, blocked: 2, reverted: 0 });
});

test("makeTransferPriorsOutcomes: discount=0 is identity (skips donor fetch entirely)", async () => {
  let baseCallCount = 0;
  // Heavy donor signal MUST be ignored — discount=0 short-circuits before any donor read.
  // Reviewer A P0-1: tighten the assertion so a future swap of the discount<=0 guard
  // with the own-signal short-circuit can't silently pass this test.
  const baseReader = async ({ pipeline }) => {
    baseCallCount += 1;
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    return { shipped: 100, blocked: 50, reverted: 25 };
  };
  const wrap = makeTransferPriorsOutcomes(baseReader, { discount: 0 });
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // Even with massive donor signal, discount=0 returns zeros.
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 0 });
  // Should have called baseReader ONLY for the own /mill read — no donor fetches.
  assert.equal(baseCallCount, 1, "discount=0 must NOT fetch any donor");
});

test("makeTransferPriorsOutcomes: discount=-1 (DEFAULT fallback) differs from discount=0 (identity)", async () => {
  // Reviewer A P0-4: explicitly verify negative discount falls back to DEFAULT,
  // not to identity — a swapped condition would make both produce zeros and
  // this test would be the only differentiator.
  const mkReader = () => async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 10, blocked: 0, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  const negResult = await makeTransferPriorsOutcomes(mkReader(), { discount: -1 })(
    { pipeline: "/mill", tier: "M", verdict: "build" },
  );
  const zeroResult = await makeTransferPriorsOutcomes(mkReader(), { discount: 0 })(
    { pipeline: "/mill", tier: "M", verdict: "build" },
  );
  // discount=-1 -> DEFAULT_DISCOUNT (0.5) -> floor(10*0.5)=5; discount=0 -> identity (0).
  assert.notDeepEqual(negResult, zeroResult, "negative discount must differ from zero discount");
  assert.equal(negResult.shipped, 5, "discount=-1 uses DEFAULT (0.5)");
  assert.equal(zeroResult.shipped, 0, "discount=0 is identity");
});

test("makeTransferPriorsOutcomes: discount>1 is capped at 1.0", async () => {
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 10, blocked: 0, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  const wrap = makeTransferPriorsOutcomes(baseReader, { discount: 2.5 });
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // 2.5 capped to 1.0 -> full donor signal.
  assert.deepEqual(res, { shipped: 10, blocked: 0, reverted: 0 });
});

test("makeTransferPriorsOutcomes: non-finite discount uses DEFAULT_DISCOUNT", async () => {
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 10, blocked: 0, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  // NaN/-Infinity etc should fall back to DEFAULT_DISCOUNT (0.5) -> floor(10*0.5)=5.
  const wrap = makeTransferPriorsOutcomes(baseReader, { discount: NaN });
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 5, blocked: 0, reverted: 0 });
});

test("makeTransferPriorsOutcomes: negative discount uses DEFAULT_DISCOUNT", async () => {
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 10, blocked: 0, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  // Negative discount is invalid -> falls back to DEFAULT (NOT identity). The
  // adapter is opinionated: a negative is a CALLER BUG, not "disable transfer."
  const wrap = makeTransferPriorsOutcomes(baseReader, { discount: -1 });
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // discount=-1 fails the `>=0` check -> DEFAULT_DISCOUNT (0.5) -> floor(5).
  assert.deepEqual(res, { shipped: 5, blocked: 0, reverted: 0 });
});

// ===========================================================================
// makeTransferPriorsOutcomes — degenerate / fail-soft paths
// ===========================================================================

test("makeTransferPriorsOutcomes: zero own + no donors -> zeros", async () => {
  // /wedm has empty donor set.
  const baseReader = async () => ({ shipped: 0, blocked: 0, reverted: 0 });
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/wedm", tier: "L", verdict: "build" });
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 0 });
});

test("makeTransferPriorsOutcomes: unknown pipeline -> zero-passthrough (no donor table)", async () => {
  const baseReader = async () => ({ shipped: 0, blocked: 0, reverted: 0 });
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/unknown", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 0 });
});

test("makeTransferPriorsOutcomes: baseReader throws -> returns zeros (never throws)", async () => {
  const baseReader = async () => { throw new Error("boom"); };
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 0 });
});

test("makeTransferPriorsOutcomes: one donor throws -> others still aggregated", async () => {
  let donorCallNum = 0;
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") {
      donorCallNum += 1;
      // First donor throws; the rest continue.
      throw new Error("donor /lathe down");
    }
    if (pipeline === "/cam-strategy") return { shipped: 8, blocked: 0, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // /cam-strategy supplied 8 -> floor(8*0.5)=4
  assert.deepEqual(res, { shipped: 4, blocked: 0, reverted: 0 });
  assert.ok(donorCallNum >= 1, "throwing donor should have been called");
});

test("makeTransferPriorsOutcomes: baseReader returns null/undefined -> normalized to zeros", async () => {
  const baseReader = async () => null;
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // null normalize-to-zero -> own is zero -> donor fetch -> donors also return
  // null -> donor aggregate is zero -> output is zeros.
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 0 });
});

test("makeTransferPriorsOutcomes: baseReader returns partial / malformed -> normalized", async () => {
  // Missing fields, NaN, negatives — all coerce to 0; positive own short-circuits.
  const baseReader = async () => ({ shipped: NaN, blocked: -5, reverted: 3 });
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // shipped=NaN->0, blocked=-5->0, reverted=3 -> own is nonzero on reverted -> short-circuit.
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 3 });
});

test("makeTransferPriorsOutcomes: fractional outcome counts are floored", async () => {
  // The contract is integer outcomes; fractional inputs from a buggy upstream
  // must be floored, not rounded (a 0.7 success is < 1 success).
  const baseReader = async ({ pipeline }) => {
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    if (pipeline === "/lathe") return { shipped: 1.7, blocked: 0.3, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  const wrap = makeTransferPriorsOutcomes(baseReader);
  const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // floor(1.7)=1, floor(0.3)=0 -> sum {1,0,0} -> discount 0.5 -> floor(0.5)=0.
  assert.deepEqual(res, { shipped: 0, blocked: 0, reverted: 0 });
});

// ===========================================================================
// makeTransferPriorsOutcomes — donor enumeration count check
// ===========================================================================

test("makeTransferPriorsOutcomes: calls baseReader once per donor + once for own", async () => {
  const calls = [];
  const baseReader = async ({ pipeline }) => {
    calls.push(pipeline);
    if (pipeline === "/mill") return { shipped: 0, blocked: 0, reverted: 0 };
    return { shipped: 0, blocked: 0, reverted: 0 };
  };
  const wrap = makeTransferPriorsOutcomes(baseReader);
  await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
  // One own + N donors for mill = 1 + listDonorPipelines("/mill").length
  const expectedDonors = listDonorPipelines("/mill").length;
  assert.equal(calls.length, 1 + expectedDonors, `expected 1 own + ${expectedDonors} donors`);
  // First call is always own.
  assert.equal(calls[0], "/mill");
});

// ===========================================================================
// Real-data E2E — full integration with makeOutcomesReader if ledger present
// ===========================================================================

test("E2E: integrates with the real makeOutcomesReader against the live ledger", async (t) => {
  const ledgerPath = path.join(REPO_ROOT, "state", "shared", "roadmap-tool-plan-outcomes.jsonl");
  if (!fs.existsSync(ledgerPath)) {
    t.skip("outcomes ledger absent (degenerate-before state) — E2E skipped");
    return;
  }
  // Import the real makeOutcomesReader (CLI's outcomes-reader factory).
  let plannerMod;
  try {
    plannerMod = await import("../rgs-tool-planner.mjs");
  } catch (e) {
    t.skip(`could not import rgs-tool-planner.mjs: ${e.message}`);
    return;
  }
  const { makeOutcomesReader } = plannerMod;
  if (typeof makeOutcomesReader !== "function") {
    t.skip("makeOutcomesReader is not exported from rgs-tool-planner.mjs");
    return;
  }
  const baseReader = makeOutcomesReader();
  const wrap = makeTransferPriorsOutcomes(baseReader);
  // The adapter must not throw on real-world inputs — runs the FULL path.
  for (const pipeline of ["/mill", "/lathe", "/cam-strategy", "/scrutinize"]) {
    const res = await wrap({ pipeline, tier: "M", verdict: "build" });
    assert.equal(typeof res.shipped, "number", `${pipeline}: shipped must be a number`);
    assert.equal(typeof res.blocked, "number", `${pipeline}: blocked must be a number`);
    assert.equal(typeof res.reverted, "number", `${pipeline}: reverted must be a number`);
    assert.ok(res.shipped >= 0, `${pipeline}: shipped >= 0`);
    assert.ok(res.blocked >= 0, `${pipeline}: blocked >= 0`);
    assert.ok(res.reverted >= 0, `${pipeline}: reverted >= 0`);
  }
  t.diagnostic("real-data E2E: outcomes ledger present, adapter wrapped baseReader cleanly");
});

test("E2E: temp ledger with own=zero + donor=signal yields discounted aggregate end-to-end", async (t) => {
  // Build a temp outcomes JSONL that exercises the full path through the real
  // makeOutcomesReader. Validates the contract aside from cache state — we
  // override PRISM_RGS_OUTCOMES_PATH to point at the temp file.
  let plannerMod;
  try {
    plannerMod = await import("../rgs-tool-planner.mjs");
  } catch (e) {
    t.skip(`could not import rgs-tool-planner.mjs: ${e.message}`);
    return;
  }
  const { makeOutcomesReader } = plannerMod;
  if (typeof makeOutcomesReader !== "function") {
    t.skip("makeOutcomesReader not exported");
    return;
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rgs-transfer-e2e-"));
  const tmpLedger = path.join(tmpDir, "outcomes.jsonl");
  // /lathe shipped 4 times in tier M build; /mill never appears (cold).
  const records = [
    { v: 1, ts: Date.now(), unitKey: "MS::U1", outcome: "shipped",
      predictedPipelines: ["/lathe"], tier: "M", verdict: "build" },
    { v: 1, ts: Date.now(), unitKey: "MS::U2", outcome: "shipped",
      predictedPipelines: ["/lathe"], tier: "M", verdict: "build" },
    { v: 1, ts: Date.now(), unitKey: "MS::U3", outcome: "blocked",
      predictedPipelines: ["/lathe"], tier: "M", verdict: "build" },
    { v: 1, ts: Date.now(), unitKey: "MS::U4", outcome: "shipped",
      predictedPipelines: ["/cam-strategy"], tier: "M", verdict: "build" },
  ];
  fs.writeFileSync(tmpLedger, records.map((r) => JSON.stringify(r)).join("\n"));
  const prev = process.env.PRISM_RGS_OUTCOMES_PATH;
  process.env.PRISM_RGS_OUTCOMES_PATH = tmpLedger;
  try {
    const baseReader = makeOutcomesReader();
    const wrap = makeTransferPriorsOutcomes(baseReader);
    const res = await wrap({ pipeline: "/mill", tier: "M", verdict: "build" });
    // /lathe contributed shipped=2, blocked=1; /cam-strategy contributed shipped=1.
    // Aggregate before discount: shipped=3, blocked=1, reverted=0.
    // discount 0.5: floor({1.5, 0.5, 0}) = {1, 0, 0}.
    assert.deepEqual(res, { shipped: 1, blocked: 0, reverted: 0 });
    t.diagnostic("E2E temp ledger: cold /mill received transfer prior from /lathe + /cam-strategy");
  } finally {
    if (prev === undefined) delete process.env.PRISM_RGS_OUTCOMES_PATH;
    else process.env.PRISM_RGS_OUTCOMES_PATH = prev;
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});
