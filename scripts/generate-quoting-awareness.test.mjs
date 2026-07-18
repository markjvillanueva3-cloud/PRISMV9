/**
 * Tests for generate-quoting-awareness.mjs — pure-core + defensive-default verification.
 * Real-value assertions + adversarial inputs (null/empty/non-array/parse-error), per CLAUDE.md test discipline.
 * Run: node --test scripts/generate-quoting-awareness.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyEngines,
  countQuotingEngines,
  driftFreshness,
  renderHeadline,
  renderAwarenessMd,
  extractHeadline,
  buildAwareness,
} from "./generate-quoting-awareness.mjs";

const ENGINES = [
  "InstantQuoteEngine.ts",
  "QuotingNeuralReasoningBridgeEngine.ts",
  "QuotingDeepReasoningBridgeEngine.ts",
  "QuotingClosedLoopEngine.ts",
  "QuotingTrainingOrchestratorEngine.ts",
  "QuotingCalibrationEngine.ts",
  "QuotingActiveFactorLoaderEngine.ts",
  "WEDMQuoteBridgeEngine.ts",
  "SpeedFeedToQuoteBridgeEngine.ts",
  "CostAlarmEngine.ts",
  "CostAwareRouterEngine.ts",
  "QuoteAnalyticsEngine.ts-1", // anomaly
  "InstantQuoteEngine.test.ts", // excluded
  "README.md", // excluded
];

test("classifyEngines: counts, neural bridges, closed-loop, cross-galaxy, anomalies", () => {
  const c = classifyEngines(ENGINES);
  // quotePrefixed = name STARTS WITH Quote/Quoting only (6 Quoting*). InstantQuote/WEDMQuote/
  // SpeedFeedToQuote are real quote engines but not prefix-Quote — counted elsewhere (broad total / cross-galaxy).
  assert.equal(c.quotePrefixed, 6, "Quote/Quoting prefix engines (excl .test., excl .ts-1)");
  assert.equal(c.costPrefixed, 2, "Cost* engines");
  assert.deepEqual(c.neuralBridges, ["QuotingNeuralReasoningBridgeEngine", "QuotingDeepReasoningBridgeEngine"]);
  assert.equal(c.closedLoop.length, 4, "ClosedLoop+TrainingOrchestrator+Calibration+ActiveFactor");
  assert.ok(c.crossGalaxyBridges.includes("WEDMQuoteBridgeEngine"));
  assert.ok(c.crossGalaxyBridges.includes("SpeedFeedToQuoteBridgeEngine"));
  assert.deepEqual(c.anomalies, ["QuoteAnalyticsEngine.ts-1"], "surfaces .ts-1 backup anomaly");
});

test("classifyEngines: defensive on null/non-array/empty (gotcha #6)", () => {
  for (const bad of [null, undefined, 42, {}, "str"]) {
    const c = classifyEngines(bad);
    assert.equal(c.quotePrefixed, 0);
    assert.deepEqual(c.anomalies, []);
    assert.deepEqual(c.neuralBridges, []);
  }
});

test("countQuotingEngines: broad prefix set, excludes tests", () => {
  assert.equal(countQuotingEngines(["QuoteEngine.ts", "CostX.ts", "EstimatY.ts", "Foo.ts", "QuoteZ.test.ts"]), 3);
  assert.equal(countQuotingEngines(null), 0);
  assert.equal(countQuotingEngines([]), 0);
});

test("driftFreshness: fresh vs stale uses RAW fractional compare (gotcha #2)", () => {
  const now = Date.parse("2026-05-28T12:00:00Z");
  const fresh = driftFreshness(JSON.stringify({ generatedAt: "2026-05-28T09:00:00Z", level: "info" }), now, 6);
  assert.equal(fresh.fresh, true);
  assert.ok(Math.abs(fresh.ageHours - 3) < 1e-6);
  // 6h + 1 min must be STALE (the boundary bug: Math.round(6.0167)=6 would wrongly pass)
  const edge = driftFreshness(JSON.stringify({ generatedAt: "2026-05-28T05:59:00Z" }), now, 6);
  assert.equal(edge.fresh, false, "6h01m is stale — raw compare, not rounded");
});

test("driftFreshness: defensive (missing / parse-error / no-timestamp)", () => {
  assert.equal(driftFreshness("", 1).state, "missing");
  assert.equal(driftFreshness(null, 1).fresh, false);
  assert.equal(driftFreshness("{not json", 1).state, "parse-error");
  assert.equal(driftFreshness(JSON.stringify({ level: "ok" }), 1).ageHours, null);
});

test("driftFreshness: parses the REAL producer contract (ts_iso + alert.level, T16)", () => {
  // latest-drift-alert.json is written by quoting-train-drift-alert.mjs buildDriftStateFile,
  // whose on-disk shape is { schema_version, ts_iso, alert:{level}, summary }: the timestamp is
  // `ts_iso` (NOT generatedAt/timestamp/ts/updatedAt) and the level is NESTED at `alert.level`
  // (NOT top-level `level`). Before T16, driftFreshness read NEITHER producer key, so a perfectly
  // valid drift alert surfaced as state:"unknown" / "drift-alert has no parseable timestamp", and
  // even with the timestamp it would mislabel a real "warn" as "ok" (R12: worse than unknown --
  // it masks a live alert). This feeds the EXACT producer shape and locks the contract so a key
  // rename on either side fails here.
  const now = Date.parse("2026-06-11T12:00:00Z");
  const real = driftFreshness(
    JSON.stringify({ schema_version: "1.0.0", ts_iso: "2026-06-11T09:00:00Z", alert: { level: "warn" }, summary: null }),
    now,
    6,
  );
  assert.ok(Number.isFinite(real.ageHours), "ts_iso must yield a finite ageHours, not null");
  assert.ok(Math.abs(real.ageHours - 3) < 1e-6, "3h old derived from ts_iso");
  assert.equal(real.fresh, true, "3h < 6h freshness window");
  assert.equal(real.state, "warn", "surfaces the real alert.level, not a masked ok/unknown");
  assert.equal(real.note, "fresh");
});

test("driftFreshness: back-compat keeps legacy generatedAt + top-level level working", () => {
  // The fix adds the producer keys (ts_iso, alert.level) as the FIRST fallback but must not break
  // a legacy/alternate emitter using the old generatedAt + top-level level keys.
  const now = Date.parse("2026-06-11T12:00:00Z");
  const legacy = driftFreshness(JSON.stringify({ generatedAt: "2026-06-11T09:00:00Z", level: "alert" }), now, 6);
  assert.ok(Math.abs(legacy.ageHours - 3) < 1e-6);
  assert.equal(legacy.state, "alert");
});

test("renderHeadline + extractHeadline round-trip", () => {
  const { md, headline } = buildAwareness({
    engineNames: ENGINES,
    hookNames: ["cost-bridge-on-quote-accept.mjs", "cost-bridge-on-cad-import.mjs"],
    algoNames: ["PriceBreakOptimizationFormula", "QuoteConfidenceEstimator"],
    feNames: ["QuoteBuilderPage.tsx"],
    settingsText: "{}",
    driftText: JSON.stringify({ generatedAt: "2026-05-28T09:00:00Z", level: "info" }),
    nowMs: Date.parse("2026-05-28T12:00:00Z"),
    generatedAtIso: "2026-05-28",
  });
  assert.ok(headline.startsWith("## Headline"));
  assert.equal(extractHeadline(md), headline, "extractHeadline recovers exactly what renderHeadline produced");
  assert.ok(md.includes("QUOTING-AWARENESS"));
  assert.ok(md.includes("QuotingNeuralReasoningBridgeEngine"), "names the NN bridge (leg 10)");
  assert.ok(md.includes("PSN leg status"), "carries the 11-leg status");
});

test("buildAwareness: counts reflect injected inputs; hooksWired counts settings refs", () => {
  // buildAwareness applies a domain-relevance filter to EVERY injected list (the production
  // contract: inject the raw dir listing, the fn selects quoting-relevant). So inject
  // domain-named files — non-domain names (X/Y/Z, A.tsx) correctly filter to 0.
  const { data } = buildAwareness({
    engineNames: ENGINES,
    hookNames: ["cost-bridge-on-a.mjs", "cost-bridge-on-b.mjs", "unrelated.mjs"], // only cost-bridge counted
    algoNames: ["CostModel.ts", "QuotePrice.ts", "EstimatorCore.ts"], // 3 quoting-relevant .ts kept
    feNames: ["QuoteBuilderPage.tsx", "QuotingDashboard.tsx"], // 2 quoting-named pages kept
    settingsText: "...cost-bridge-on-a.mjs ... cost-bridge-on-b.mjs ...",
    driftText: "",
    nowMs: 0,
  });
  assert.equal(data.counts.hooks, 2, "only cost-bridge-on-*.mjs counted");
  assert.equal(data.counts.hooksWired, 2, "2 cost-bridge refs in settings");
  assert.equal(data.counts.algorithms, 3, "3 quoting-relevant algos survive the domain filter");
  assert.equal(data.counts.frontendPages, 2, "2 quoting-named pages survive the Quote/Quoting filter");
  assert.equal(data.counts.engines, 9, "6 Quoting* + 2 Cost* + 1 InstantQuote (broad anchor); WEDM/SpeedFeed prefixes excluded");
});

test("buildAwareness: ROUTER-AWARE — cost-bridge-dispatch.mjs wires ALL on-disk hooks (gotcha #7 resolved)", () => {
  // The 16 cost-bridge-on-* advisory hooks are wired via the consolidated router
  // cost-bridge-dispatch.mjs (one spawn runs all 16), NOT as individual settings.json
  // entries. So settings with the router + ZERO per-file refs = ALL on-disk hooks wired.
  // The pre-fix per-file count returned 0 here → the false "16 unwired" cry-wolf.
  const { data } = buildAwareness({
    engineNames: ENGINES,
    hookNames: ["cost-bridge-on-a.mjs", "cost-bridge-on-b.mjs", "cost-bridge-on-c.mjs"],
    algoNames: [],
    feNames: [],
    settingsText: '{"hooks":{"PostToolUse":[{"matcher":"mcp__prism__prism_.*","hooks":[{"command":"node .claude/hooks/cost-bridge-dispatch.mjs"}]}]}}',
    driftText: "",
    nowMs: 0,
  });
  assert.equal(data.counts.hooks, 3, "3 cost-bridge-on-* hooks on disk");
  assert.equal(data.counts.hooksWired, 3, "router wires ALL 3 (was 0 under the per-file check → cry-wolf)");
});

test("buildAwareness: per-file wiring still counts when NO router is present (back-compat fallback)", () => {
  const { data } = buildAwareness({
    engineNames: ENGINES,
    hookNames: ["cost-bridge-on-a.mjs", "cost-bridge-on-b.mjs"],
    algoNames: [],
    feNames: [],
    settingsText: "...cost-bridge-on-a.mjs ... (no router wired here)",
    driftText: "",
    nowMs: 0,
  });
  assert.equal(data.counts.hooksWired, 1, "no router → fall back to the legacy per-file ref count");
});

test("extractHeadline: defensive on non-string / no-header", () => {
  assert.equal(extractHeadline(null), "");
  assert.equal(extractHeadline("no header here"), "");
});

test("renderAwarenessMd: stable shape, no crash on minimal data", () => {
  const md = renderAwarenessMd({
    generatedAt: "2026-05-28",
    root: "H:/prism",
    engines: { quotePrefixed: 0, costPrefixed: 0, neuralBridges: [], closedLoop: [], crossGalaxyBridges: [], anomalies: [] },
    algorithms: [],
    frontendPages: [],
    drift: { state: "missing", note: "n/a" },
    nextUnit: "X",
    counts: { engines: 0, hooks: 0, hooksWired: 0, algorithms: 0, frontendPages: 0 },
  });
  assert.ok(md.includes("No .ts-1 disk anomalies detected"));
  assert.ok(md.includes("## PSN leg status"));
});
