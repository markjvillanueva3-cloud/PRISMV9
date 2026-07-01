// scripts/reconcile-zulu-ledger.test.mjs
// Real-value tests (R9: encode INTENT). The pure checks are tested against the LIVE repo
// for stable, Ollama-independent claims (edge schema, dynamic SLOT_NAMES) so a regression
// in the reconciler logic FAILS the test. The Ollama probe is tested via its failure path
// (unreachable URL) so the suite is deterministic without a running daemon.

import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";

import {
  checkOllamaGenerate,
  checkHermesProxy,
  hermesHealthUrl,
  checkEdgeTypeInSchema,
  checkFileExists,
  checkSourceImports,
  countDispatchersRoutingToConsensus,
  checkSynthesisFreshness,
  checkAiSynergyMean,
  findNewestLedger,
  reconcile,
  CLAIMS,
  readJsonSafe,
  countJsonlLines,
  newestJsonlTs,
  gradeOllamaUtilization,
  gradeHermesUtilization,
  gradeOctopusUtilization,
  gradeObsidianUtilization,
  gradeAutofireCoverage,
  reconcileMetaSystems,
  reconcileMetaSystemsLive,
} from "./reconcile-zulu-ledger.mjs";

const ROOT = "H:/prism";

// reconcile() runs the (slow) Ollama probe; share one result across the integration tests
// instead of invoking it per-test (scrutiny B P1-2: avoids a ~40s double-probe in CI).
let _sharedReport;
async function sharedReconcile() {
  if (!_sharedReport) _sharedReport = await reconcile();
  return _sharedReport;
}

test("checkEdgeTypeInSchema: consensus-of IS in the frozen EDGE_TYPES whitelist (A-13 shipped)", async () => {
  const r = await checkEdgeTypeInSchema("consensus-of");
  assert.equal(r.ok, true, "consensus-of must be a real materialized edge type");
  assert.ok(Array.isArray(r.allTypes) && r.allTypes.length >= 3, "expected >=3 edge types (owned-by-slot/documented-by/embeds/consensus-of)");
});

test("checkEdgeTypeInSchema: a fabricated type is NOT in the whitelist (negative)", async () => {
  const r = await checkEdgeTypeInSchema("totally-not-a-real-edge-type-xyz");
  assert.equal(r.ok, false);
});

test("checkEdgeTypeInSchema: missing schema file reports error, never throws (edge case)", async () => {
  const r = await checkEdgeTypeInSchema("consensus-of", join(ROOT, "scripts/lib/does-not-exist.mjs"));
  assert.equal(r.ok, false);
  assert.equal(r.error, "schema-missing");
});

test("checkSourceImports: slot-task-claim imports dynamic SLOT_NAMES (A-14 fixed, not hardcoded 12)", () => {
  const r = checkSourceImports(join(ROOT, ".claude/helpers/slot-task-claim.mjs"), "SLOT_NAMES");
  assert.equal(r.ok, true, "slot-task-claim must import SLOT_NAMES, proving the slot list is dynamic");
});

test("checkSourceImports: a symbol that is not imported returns ok:false (negative)", () => {
  const r = checkSourceImports(join(ROOT, ".claude/helpers/slot-task-claim.mjs"), "NoSuchSymbolImported12345");
  assert.equal(r.ok, false);
});

test("checkSourceImports: a STRING-LITERAL embedding the import syntax is NOT a real import (no false SHIPPED)", () => {
  const p = join(tmpdir(), `zlr-strlit-${process.pid}.mjs`);
  writeFileSync(p, 'const msg = "import { SLOT_NAMES } from ./x.mjs";\nconst y = 1;\n');
  try {
    assert.equal(checkSourceImports(p, "SLOT_NAMES").ok, false, "an import inside a string literal must not count as a real import");
  } finally {
    rmSync(p, { force: true });
  }
});

test("checkSourceImports: a real top-of-line import returns true (positive control for the anchor fix)", () => {
  const p = join(tmpdir(), `zlr-realimp-${process.pid}.mjs`);
  writeFileSync(p, '  import { SLOT_NAMES } from "./chat-slots.mjs";\nconst y = 1;\n');
  try {
    assert.equal(checkSourceImports(p, "SLOT_NAMES").ok, true, "a genuine import statement (even indented) must be detected");
  } finally {
    rmSync(p, { force: true });
  }
});

test("checkSourceImports: missing file reports error, never throws (edge case)", () => {
  const r = checkSourceImports(join(ROOT, "no/such/file.mjs"), "SLOT_NAMES");
  assert.equal(r.ok, false);
  assert.equal(r.error, "file-missing");
});

test("checkFileExists: true for a real file, false for a fake one", () => {
  assert.equal(checkFileExists(join(ROOT, "scripts/reconcile-zulu-ledger.mjs")).ok, true);
  assert.equal(checkFileExists(join(ROOT, "scripts/__definitely_absent__.mjs")).ok, false);
});

test("checkSynthesisFreshness: the patterns dir holds the galaxy syntheses (count is plausible)", () => {
  const r = checkSynthesisFreshness();
  assert.equal(r.ok, true, "patterns/<galaxy>_synthesis.md cluster must exist");
  assert.ok(r.count >= 20, `expected >=20 synthesis files for the 34-galaxy fleet, got ${r.count}`);
  assert.ok(r.fresh >= 0 && r.fresh <= r.count, "fresh count must be within [0, count]");
});

test("checkSynthesisFreshness: missing dir reports error, never throws (edge case)", () => {
  const r = checkSynthesisFreshness(24, join(ROOT, "knowledge/memories/__absent__"));
  assert.equal(r.ok, false);
  assert.equal(r.count, 0);
});

test("checkAiSynergyMean: parses a finite mean from the audit", () => {
  const r = checkAiSynergyMean();
  assert.equal(r.ok, true, "AI-SYNERGY-AUDIT.md must be parseable");
  assert.ok(Number.isFinite(r.mean), "mean synergy must parse to a number");
});

test("checkOllamaGenerate: unreachable URL fails cleanly with a numeric ms (deterministic, no daemon)", async () => {
  const r = await checkOllamaGenerate("http://127.0.0.1:6553", "qwen2.5-coder:32b", 1500);
  assert.equal(r.ok, false);
  assert.ok(typeof r.ms === "number" && r.ms >= 0, "ms must be a non-negative number even on failure");
  assert.ok(typeof r.error === "string" && r.error.length > 0, "must surface an error string (fail-loud)");
});

test("CLAIMS registry: every claim has id, ledgerSays, and an async probe", () => {
  assert.ok(Array.isArray(CLAIMS) && CLAIMS.length >= 5);
  for (const c of CLAIMS) {
    assert.ok(typeof c.id === "string" && c.id.length > 0, "claim needs an id");
    assert.ok(c.ledgerSays === "OPEN" || c.ledgerSays === "SHIPPED", "ledgerSays must be OPEN|SHIPPED");
    assert.equal(typeof c.probe, "function", "claim needs a probe()");
  }
});

test("reconcile: detects ledger staleness on the live repo (>=2 OPEN-claimed items verified SHIPPED)", async () => {
  const report = await sharedReconcile();
  assert.equal(report.summary.total, CLAIMS.length, "every claim must be evaluated");
  // A-13 (consensus-of edge), A-14 (dynamic SLOT_NAMES), and A-06 (galaxy-brain-read API, shipped
  // 2026-06-11) are fs/schema-stable SHIPPED facts, all marked OPEN in the ledger => the reconciler
  // must flag >=2 stale. This is the core intent: a stale ledger is detected automatically.
  assert.ok(report.summary.ledgerStaleCount >= 2, `expected >=2 stale ledger items, got ${report.summary.ledgerStaleCount}`);
  // Every result carries a valid verdict + a boolean staleness flag.
  const allowed = new Set(["SHIPPED", "OPEN", "COVERED", "UNKNOWN"]);
  for (const r of report.results) {
    assert.ok(allowed.has(r.verdict), `bad verdict ${r.verdict}`);
    assert.equal(typeof r.ledgerStale, "boolean");
    assert.ok(typeof r.evidence === "string" && r.evidence.length > 0, "evidence must be present");
  }
});

test("reconcile: per-item verdicts are correct for env-independent claims (catches wrong-but-legal verdicts)", async () => {
  const report = await sharedReconcile();
  const byId = Object.fromEntries(report.results.map((r) => [r.id, r]));
  // fs/schema-stable -> deterministic regardless of Ollama/synthesis freshness:
  assert.equal(byId["A-13"].verdict, "SHIPPED", "consensus-of edge IS materialized");
  assert.equal(byId["A-14"].verdict, "SHIPPED", "SLOT_NAMES IS dynamic");
  assert.equal(byId["A-06"].verdict, "SHIPPED", "galaxy-brain-read API shipped at scripts/lib/galaxy-brain-read.mjs (2f695f24e9) + wired into galaxy-reasoning-bridge; reconciler wrong-path bug fixed 2026-06-20 (slot:zulu)");
  // A-04 verdict stays UNKNOWN (per-domain consensus propagation is peer-owned + a scope call),
  // but the EVIDENCE is now deterministic (a source wiring count), not the old handoff-file heuristic.
  assert.equal(byId["A-04"].verdict, "UNKNOWN", "consensus_decide per-domain propagation is peer-owned (infra-consensus-wire), deliberately not zulu-routed");
  assert.match(byId["A-04"].evidence, /MultiModelConsensusEngine|consensus_decide/, "A-04 evidence must be the deterministic wiring count");
  assert.doesNotMatch(byId["A-04"].evidence, /handoff/i, "A-04 must no longer rely on the meaningless handoff-file-existence heuristic");
});

test("countDispatchersRoutingToConsensus: counts only *Dispatcher.ts files containing the marker (fixture)", () => {
  const dir = join(tmpdir(), `zlr-disp-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  try {
    writeFileSync(join(dir, "aiReasoningDispatcher.ts"), "const e = MultiModelConsensusEngine; // a real code route");
    writeFileSync(join(dir, "camDispatcher.ts"), "// just toolpaths, no consensus engine here");
    writeFileSync(join(dir, "cadDispatcher.ts"), "// sequences produced by MultiModelConsensusEngine or other"); // COMMENT-only -> excluded
    writeFileSync(join(dir, "notADispatcher.txt"), "const x = MultiModelConsensusEngine;"); // wrong extension -> excluded
    const r = countDispatchersRoutingToConsensus(dir);
    assert.equal(r.ok, true);
    assert.equal(r.total, 3, "3 *Dispatcher.ts files (the .txt is excluded)");
    // Only the CODE-line match counts; cad's comment-only mention is correctly excluded (3-of-3 P2).
    assert.deepEqual(r.wired.sort(), ["aiReasoningDispatcher.ts"], "comment-only marker (cad) must NOT count as wired");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("countDispatchersRoutingToConsensus: missing dir -> ok:false fail-soft (never throws)", () => {
  const r = countDispatchersRoutingToConsensus(join(tmpdir(), `zlr-nodir-${process.pid}-missing`));
  assert.equal(r.ok, false);
  assert.equal(r.total, 0);
  assert.deepEqual(r.wired, []);
});

test("countDispatchersRoutingToConsensus: LIVE repo -- prism_ai (owner) routes to the consensus engine", () => {
  // Anchors the deterministic probe against the real dispatcher dir: aiReasoningDispatcher MUST be
  // among the wired set (it owns consensus_decide). A regression that breaks the scan fails here.
  const r = countDispatchersRoutingToConsensus(join(ROOT, "mcp-server/src/tools/dispatchers"));
  assert.equal(r.ok, true);
  assert.ok(r.total > 0, "should find dispatcher files in the live repo");
  assert.ok(r.wired.includes("aiReasoningDispatcher.ts"), "prism_ai owns the multi-model consensus engine");
});

test("findNewestLedger: returns the newest ZULU-MASTER-CONTEXT-LEDGER-*.md (snapshot-staleness guard)", () => {
  const newest = findNewestLedger();
  assert.ok(typeof newest === "string" && /^ZULU-MASTER-CONTEXT-LEDGER-.*\.md$/.test(newest), `expected a ledger filename, got ${newest}`);
});

// ---- U-ZLR-META-UTIL: meta-systems utilization grades (pure, fixture-tested) ----

test("readJsonSafe: parses a real JSON artifact, returns null on a missing file (never throws)", () => {
  const real = readJsonSafe(join(ROOT, "package.json"));
  assert.ok(real && typeof real === "object", "must parse a real JSON file");
  assert.equal(readJsonSafe(join(ROOT, "no/such/file.json")), null, "missing file -> null, not a throw");
});

test("countJsonlLines: counts non-blank lines; missing file -> 0 (fail-soft)", () => {
  const p = join(tmpdir(), `zlr-jsonl-${process.pid}.jsonl`);
  writeFileSync(p, '{"a":1}\n\n{"b":2}\n   \n{"c":3}\n');
  try {
    assert.equal(countJsonlLines(p), 3, "3 non-blank JSONL records (blank + whitespace lines excluded)");
  } finally {
    rmSync(p, { force: true });
  }
  assert.equal(countJsonlLines(join(ROOT, "no/such.jsonl")), 0, "missing ledger -> 0, never throws");
});

test("gradeOllamaUtilization: UTILIZED only when offloads>0 AND recent; stale lifetime-count != utilized", () => {
  const now = Date.parse("2026-06-22T23:00:00Z");
  // real-shape fixture (live 2026-06-22) WITH recent lastUpdated -> utilized
  const live = gradeOllamaUtilization({ offloaded: 331, executedOffloads: 20, measuredTokensSaved: 48702, lastUpdated: "2026-06-22T22:58:00Z" }, now);
  assert.equal(live.status, "UTILIZED");
  assert.ok(live.evidence.includes("331") && live.evidence.includes("48702"), "evidence carries the real throughput numbers");
  assert.equal(live.action, null, "a utilized system needs no action");
  // RECENCY GATE: lifetime offloaded>0 but lastUpdated 4+ days stale -> lane went quiet -> NOT utilized
  const stale = gradeOllamaUtilization({ offloaded: 331, executedOffloads: 20, measuredTokensSaved: 48702, lastUpdated: "2026-06-18T00:00:00Z" }, now);
  assert.equal(stale.status, "UNDER-UTILIZED", "a days-stale offload lane with a lifetime count>0 is NOT currently utilized");
  assert.equal(gradeOllamaUtilization({ offloaded: 0, executedOffloads: 0, lastUpdated: "2026-06-22T22:58:00Z" }, now).status, "UNDER-UTILIZED");
  const down = gradeOllamaUtilization(null, now);
  assert.equal(down.status, "DOWN");
  assert.ok(down.action && down.action.length > 0, "DOWN must name a recovery action");
});

test("gradeOllamaUtilization: surfaces the ADOPTION GAP (decisions firing, 0 executed) without falsely degrading the lane", () => {
  const now = Date.parse("2026-06-23T15:10:00Z");
  // live-shape fixture (2026-06-23): 41 offload DECISIONS, ~26.7k est savings, but ask-ollama ran
  // 0 times -> directives injected + ignored. The lane is LIVE (fresh + deciding) so status stays
  // UTILIZED (metaUtilized count + meta-systems-health-inject both key on status), but the gap must
  // be flagged (adoptionGap) AND actionable (non-null action), and the evidence must show the
  // estimated savings left on the table -- not read as "~0 tok saved" (the old misleading line).
  const gap = gradeOllamaUtilization({ offloaded: 41, executedOffloads: 0, estimatedTokensSaved: 26696, measuredTokensSaved: 0, lastUpdated: "2026-06-23T15:07:00Z" }, now);
  assert.equal(gap.status, "UTILIZED", "a live, deciding lane stays UTILIZED (don't degrade the metaUtilized count)");
  assert.equal(gap.adoptionGap, true, "decisions>0 but executions==0 IS the adoption gap");
  assert.ok(gap.action && /adopt|ask-ollama|execut/i.test(gap.action), "the gap must be actionable, not null");
  assert.ok(gap.evidence.includes("26696"), "evidence surfaces the estimated savings left on the table");
  assert.ok(gap.evidence.includes("0 executed"), "evidence makes the 0-execution state explicit");
  // CONTRAST: once executions arrive, the gap closes -> no adoption flag, no action.
  const adopted = gradeOllamaUtilization({ offloaded: 41, executedOffloads: 12, estimatedTokensSaved: 26696, measuredTokensSaved: 8800, lastUpdated: "2026-06-23T15:07:00Z" }, now);
  assert.equal(adopted.adoptionGap, false, "exec>0 closes the adoption gap");
  assert.equal(adopted.action, null, "an adopted, utilized lane needs no action");
});

test("gradeHermesUtilization: UTILIZED at low fail rate + RECENT; DOWN at high fail rate; UNDER when never used OR gone quiet", () => {
  const now = Date.parse("2026-06-22T23:00:00Z");
  // live shape: fired 858, fail 3 -> 0.35% << 10% threshold, used ~9.8h ago (<48h) -> UTILIZED
  const live = gradeHermesUtilization({ byHook: { "ask-hermes": { fired: 858, bySource: { fail: 3 }, lastUsed: "2026-06-22T13:14:43.513Z" } } }, now);
  assert.equal(live.status, "UTILIZED");
  assert.ok(live.evidence.includes("858"), "evidence carries the real call count");
  assert.equal(live.action, null, "a utilized lane needs no action");
  // 5/10 = 50% fail >> 10% -> proxy degraded -> DOWN. Fail rate WINS over recency: even a stale
  // lastUsed must still read DOWN (a lane that errors when called is degraded whenever it was called).
  assert.equal(gradeHermesUtilization({ byHook: { "ask-hermes": { fired: 10, bySource: { fail: 5 }, lastUsed: "2026-06-10T00:00:00Z" } } }, now).status, "DOWN");
  // RECENCY GATE (apply-to-all of the ollama/octopus staleness gate): healthy low-fail lane but the
  // last call was 5+ days ago (>48h) -> went quiet -> UNDER, NOT a phantom-green off the lifetime count.
  const stale = gradeHermesUtilization({ byHook: { "ask-hermes": { fired: 858, bySource: { fail: 3 }, lastUsed: "2026-06-17T13:14:00Z" } } }, now);
  assert.equal(stale.status, "UNDER-UTILIZED", "a days-stale hermes lane with a lifetime count>0 is NOT currently utilized");
  assert.ok(/quiet/i.test(stale.action), "a gone-quiet lane must name the staleness in its action");
  // missing lastUsed (can't confirm freshness) -> not falsely UTILIZED (mirrors ollama's missing-lastUpdated)
  assert.equal(gradeHermesUtilization({ byHook: { "ask-hermes": { fired: 5, bySource: {} } } }, now).status, "UNDER-UTILIZED");
  // no ask-hermes activity at all -> under-utilized (lane exists but unused)
  assert.equal(gradeHermesUtilization({ byHook: {} }, now).status, "UNDER-UTILIZED");
  assert.equal(gradeHermesUtilization(null, now).status, "UNDER-UTILIZED");
});

test("gradeHermesUtilization: LIVE-PROBE gates the DOWN verdict (recovered transient outage != DOWN)", () => {
  const now = Date.parse("2026-06-22T23:00:00Z");
  // The live 2026-06-29 false-positive shape: 9/10 lifetime fail (90% >> 10%), but RECENT (2.7h) and the
  // proxy answers /health healthy NOW. Cumulative fail-rate is SUSPICION, not proof -> must NOT read DOWN.
  const down = { byHook: { "ask-hermes": { fired: 10, bySource: { fail: 9 }, lastUsed: "2026-06-22T20:18:00Z" } } };
  // (a) liveProbe.ok === true -> recovered -> grade by recency. Fresh -> UTILIZED (false alarm killed).
  const recovered = gradeHermesUtilization(down, now, { ok: true, httpStatus: 200, authenticated: true });
  assert.equal(recovered.status, "UTILIZED", "a high lifetime fail-rate with a HEALTHY live proxy is recovered, not DOWN");
  assert.ok(/recovered|live now/i.test(recovered.evidence), "evidence must name the recovery");
  assert.equal(recovered.action, null, "a recovered+utilized lane needs no action");
  // (b) liveProbe.ok === false -> ledger AND probe agree -> confirmed DOWN, evidence names the live failure.
  const confirmed = gradeHermesUtilization(down, now, { ok: false, httpStatus: 0, error: "ECONNREFUSED" });
  assert.equal(confirmed.status, "DOWN", "high fail-rate + a FAILED live probe is a confirmed outage");
  assert.ok(/live probe/i.test(confirmed.evidence) && /ECONNREFUSED/.test(confirmed.evidence), "evidence must name the live-probe failure");
  // (c) liveProbe == null (non-live caller / pure test) -> ledger-only DOWN preserved (back-compat).
  assert.equal(gradeHermesUtilization(down, now).status, "DOWN", "absent a live probe, the ledger-only DOWN behavior is unchanged");
  assert.equal(gradeHermesUtilization(down, now, null).status, "DOWN");
  // (d) recovered but STALE (proxy up now, but no call in >48h) -> UNDER-UTILIZED (recovered, gone quiet),
  //     NOT UTILIZED (it isn't being USED now) and NOT DOWN (it isn't broken).
  const recoveredStale = { byHook: { "ask-hermes": { fired: 10, bySource: { fail: 9 }, lastUsed: "2026-06-17T00:00:00Z" } } };
  assert.equal(gradeHermesUtilization(recoveredStale, now, { ok: true }).status, "UNDER-UTILIZED");
  // (e) a HEALTHY ledger (low fail) ignores the probe entirely -> UTILIZED regardless of probe arg.
  const healthy = { byHook: { "ask-hermes": { fired: 858, bySource: { fail: 3 }, lastUsed: "2026-06-22T13:14:43Z" } } };
  assert.equal(gradeHermesUtilization(healthy, now, { ok: false }).status, "UTILIZED", "a low-fail-rate lane is never pulled DOWN by a probe");
});

test("hermesHealthUrl: a /v1-suffixed base resolves to the ROOT /health (kills the /v1/health 404 false-DOWN)", () => {
  // The fleet default PRISM_HERMES_PROXY_URL is /v1-suffixed; the proxy serves /health at the ORIGIN root.
  assert.equal(hermesHealthUrl("http://127.0.0.1:8645/v1"), "http://127.0.0.1:8645/health");
  assert.equal(hermesHealthUrl("http://127.0.0.1:8645"), "http://127.0.0.1:8645/health");
  assert.equal(hermesHealthUrl("http://127.0.0.1:8645/v1/"), "http://127.0.0.1:8645/health");
  // scheme-less host:port (a common env mistake) -> still a fetchable root /health, never a throw.
  assert.equal(hermesHealthUrl("127.0.0.1:8645/v1"), "http://127.0.0.1:8645/health");
});

test("checkHermesProxy: unreachable proxy fails cleanly (ok:false), no throw (deterministic, no daemon)", async () => {
  const r = await checkHermesProxy("http://127.0.0.1:6553/v1", 1200); // unused high port + /v1 base -> connection refused
  assert.equal(r.ok, false, "an unreachable proxy is not ok");
  assert.equal(typeof r.error, "string", "carries an error string");
  assert.equal(r.authenticated, false);
});

test("checkHermesProxy: live /health responses -- 200+status:ok=up, 200+degraded body=not-ok, /v1 base hits ROOT", async () => {
  const { createServer } = await import("node:http");
  const seen = []; // records the path the probe actually requested -> proves origin-strip
  // Serve /health at the ROOT only (mirrors the real proxy); /v1/health 404s.
  const bodies = { ok: { status: "ok", upstream: "xAI Grok OAuth", authenticated: true }, degraded: { status: "degraded", authenticated: false } };
  let mode = "ok";
  const srv = createServer((req, res) => {
    seen.push(req.url);
    if (req.url === "/health") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(bodies[mode])); }
    else { res.writeHead(404); res.end("path_not_allowed"); }
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  try {
    const port = srv.address().port;
    // (a) /v1-suffixed base + healthy body -> probe MUST hit root /health and read ok (proves the P1 fix).
    const up = await checkHermesProxy(`http://127.0.0.1:${port}/v1`, 1500);
    assert.equal(up.ok, true, "healthy root /health behind a /v1 base -> ok");
    assert.equal(up.authenticated, true);
    assert.equal(seen.at(-1), "/health", "the /v1 base was origin-stripped to root /health, never /v1/health");
    // (b) 200 but status!=="ok" -> degraded -> ok:false (the untested branch arm A flagged; SAFE direction).
    mode = "degraded";
    const deg = await checkHermesProxy(`http://127.0.0.1:${port}`, 1500);
    assert.equal(deg.ok, false, "a 200 with a non-ok status body is degraded, not up");
    assert.ok(/degraded/.test(String(deg.error)), "evidence carries the degraded status");
  } finally {
    await new Promise((r) => srv.close(r)); // R14: close the fixture server
  }
});

test("checkHermesProxy: cloud lane (no /health) -> authed /models 200 reports UP (HERMES-NVIDIA-LANE)", async () => {
  const { createServer } = await import("node:http");
  const seen = [];
  // A DIRECT OpenAI-compatible cloud lane (NVIDIA): NO root /health (404), but /v1/models 200.
  const srv = createServer((req, res) => {
    seen.push(`${req.url}|auth=${req.headers.authorization ? "yes" : "no"}`);
    if (req.url === "/v1/models") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ data: [{ id: "meta/llama-3.3-70b-instruct" }] })); }
    else { res.writeHead(404); res.end("no_health_on_cloud_lane"); } // root /health 404s like NVIDIA
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const prev = process.env.PRISM_HERMES_TOKEN;
  const probeTok = "fixture-" + "bearer"; // non-secret test marker; just needs to be non-empty so authHeaders fires
  process.env.PRISM_HERMES_TOKEN = probeTok;
  try {
    const port = srv.address().port;
    const r = await checkHermesProxy(`http://127.0.0.1:${port}/v1`, 1500);
    assert.equal(r.ok, true, "no /health but a 200 /models -> lane is UP (was a false DOWN that degraded the fleet to Ollama)");
    assert.equal(r.authenticated, true);
    assert.ok(seen.some((s) => s.startsWith("/v1/models|auth=yes")), "the /models probe carried the bearer (a direct cloud lane requires it)");
  } finally {
    if (prev === undefined) delete process.env.PRISM_HERMES_TOKEN; else process.env.PRISM_HERMES_TOKEN = prev;
    await new Promise((r) => srv.close(r)); // R14: close the fixture server
  }
});

test("reconcileMetaSystemsLive: injected healthy probe clears the DOWN-ledger false alarm; healthy ledger does NO probe", async () => {
  const now = Date.parse("2026-06-29T13:00:00Z");
  // DOWN-ledger fixture + an injected HEALTHY probe -> hermes verdict is NOT DOWN (false alarm gone),
  // while the other 3 substrates are graded exactly as the sync path. Injected probe = deterministic, no IO.
  const downStats = { offloaded: 5, executedOffloads: 5, measuredTokensSaved: 100, lastUpdated: "2026-06-29T12:55:00Z", byHook: { "ask-hermes": { fired: 10, bySource: { fail: 9 }, lastUsed: "2026-06-29T10:18:00Z" } } };
  const out = await reconcileMetaSystemsLive({
    stats: downStats,
    freshness: { ok: true, count: 34, fresh: 34, stalestH: 1 },
    queueCount: 0, processedCount: 50, lastDrainAgeH: 1,
    nowMs: now,
    hermesLiveProbe: { ok: true, httpStatus: 200, authenticated: true }, // injected -> no network
  });
  const hermes = out.find((v) => v.system === "hermes");
  assert.notEqual(hermes.status, "DOWN", "an injected healthy probe must clear the cumulative-fail-rate false DOWN");
  // The SYNC path over the SAME stats still reports DOWN (the bug it fixes) -> proves the gate is load-bearing.
  const syncHermes = reconcileMetaSystems({ stats: downStats, freshness: { ok: true, count: 34, fresh: 34, stalestH: 1 }, queueCount: 0, processedCount: 50, lastDrainAgeH: 1, nowMs: now }).find((v) => v.system === "hermes");
  assert.equal(syncHermes.status, "DOWN", "sync (no-probe) path still false-alarms -> the live gate is what removes it");
});

test("gradeOctopusUtilization: gates on drain RECENCY, not lifetime count (kills the phantom-green)", () => {
  // healthy trickle: backlog but the drain RAN recently -> by-design -> UTILIZED
  const healthy = gradeOctopusUtilization({ queueCount: 54, processedCount: 130, lastDrainAgeH: 2 });
  assert.equal(healthy.status, "UTILIZED", "a large queue with a RECENT drain is by-design trickle");
  assert.ok(healthy.evidence.includes("130") && healthy.evidence.includes("54"));
  // FELL BEHIND: same lifetime counts but last drain 80h ago (>48h) -> NOT by-design -> UNDER.
  // This is the live 2026-06-22 condition (last drain 06-19, 54 queued): must NOT read green.
  const behind = gradeOctopusUtilization({ queueCount: 54, processedCount: 130, lastDrainAgeH: 80 });
  assert.equal(behind.status, "UNDER-UTILIZED", "a 3-day-stale drain with a growing queue must NOT read UTILIZED");
  assert.ok(/fell behind/i.test(behind.evidence), "must name the fallen-behind drain");
  // recency UNKNOWN (torn processed.jsonl -> null age) atop a backlog -> needs-attention, NOT green
  const unknown = gradeOctopusUtilization({ queueCount: 30, processedCount: 100, lastDrainAgeH: null });
  assert.equal(unknown.status, "UNDER-UTILIZED", "unknown drain recency over a backlog must fail to needs-attention, never false-green");
  assert.ok(/unknown/i.test(unknown.evidence), "must name the unknown recency");
  // queue fully drained -> utilized regardless of drain age
  assert.equal(gradeOctopusUtilization({ queueCount: 0, processedCount: 130, lastDrainAgeH: 999 }).status, "UTILIZED");
  // queued but NOTHING ever processed -> stalled drain
  const stalled = gradeOctopusUtilization({ queueCount: 12, processedCount: 0 });
  assert.equal(stalled.status, "UNDER-UTILIZED");
  assert.ok(/stall/i.test(stalled.evidence), "a 0-processed non-empty queue must be flagged as a stalled drain");
  // never invoked at all
  assert.equal(gradeOctopusUtilization({ queueCount: 0, processedCount: 0 }).status, "UNDER-UTILIZED");
});

test("newestJsonlTs: returns the LAST record's timestamp (ms); null on missing/empty/un-timestamped", () => {
  const p = join(tmpdir(), `zlr-ts-${process.pid}.jsonl`);
  writeFileSync(p, '{"ts":"2026-06-01T00:00:00Z"}\n{"ts":"2026-06-19T19:47:45.279Z"}\n');
  try {
    assert.equal(newestJsonlTs(p), Date.parse("2026-06-19T19:47:45.279Z"), "append-only -> the LAST line is the newest record");
  } finally {
    rmSync(p, { force: true });
  }
  assert.equal(newestJsonlTs(join(ROOT, "no/such.jsonl")), null, "missing file -> null");
  const p2 = join(tmpdir(), `zlr-nots-${process.pid}.jsonl`);
  writeFileSync(p2, '{"foo":1}\n');
  try {
    assert.equal(newestJsonlTs(p2), null, "a record with no recognized timestamp key -> null");
  } finally {
    rmSync(p2, { force: true });
  }
  // torn/partial FINAL line (crash mid-append) -> walk back to the newest PARSEABLE record, not null
  const p3 = join(tmpdir(), `zlr-torn-${process.pid}.jsonl`);
  writeFileSync(p3, '{"drained_at":"2026-06-21T01:38:32.585Z"}\n{"drained_at":"2026-06-22T10:00:00Z","part\n');
  try {
    assert.equal(newestJsonlTs(p3), Date.parse("2026-06-21T01:38:32.585Z"), "a torn final line must fall back to the newest intact record, never null (would disable the recency gate)");
  } finally {
    rmSync(p3, { force: true });
  }
});

test("gradeObsidianUtilization: gates on COUNT (not mtime) -> a quiet-but-populated corpus is UTILIZED", () => {
  // the A-16 phantom-OPEN fix: 34 present, all mtime OLD -> still UTILIZED (mtime != staleness)
  const quiet = gradeObsidianUtilization({ ok: true, count: 34, fresh: 0, stalestH: 200 });
  assert.equal(quiet.status, "UTILIZED", "an old-mtime but fully-populated synthesis corpus is utilized");
  assert.ok(/informational/.test(quiet.evidence), "evidence must mark mtime as informational, not a gate");
  // genuinely under-built (only a handful of galaxies synthesized)
  assert.equal(gradeObsidianUtilization({ ok: true, count: 5, fresh: 5, stalestH: 1 }).status, "UNDER-UTILIZED");
  // dir unreadable
  assert.equal(gradeObsidianUtilization({ ok: false, error: "dir-missing" }).status, "DOWN");
});

test("reconcileMetaSystems: injected fixtures -> 4 verdicts each with system/status/evidence/action", () => {
  const now = Date.parse("2026-06-22T23:00:00Z");
  const out = reconcileMetaSystems({
    stats: { offloaded: 5, executedOffloads: 5, measuredTokensSaved: 100, lastUpdated: "2026-06-22T22:55:00Z", byHook: { "ask-hermes": { fired: 100, bySource: { fail: 1 }, lastUsed: "2026-06-22T22:50:00Z" } } },
    freshness: { ok: true, count: 34, fresh: 30, stalestH: 50 },
    queueCount: 10,
    processedCount: 100,
    lastDrainAgeH: 1,
    nowMs: now,
  });
  assert.equal(out.length, 4, "exactly 4 meta-systems graded");
  assert.deepEqual(out.map((m) => m.system).sort(), ["hermes", "obsidian", "octopus", "ollama"]);
  for (const m of out) {
    assert.ok(["UTILIZED", "UNDER-UTILIZED", "DOWN"].includes(m.status), `bad status ${m.status}`);
    assert.ok(typeof m.evidence === "string" && m.evidence.length > 0, "every grade carries evidence");
    assert.ok(m.status === "UTILIZED" ? m.action === null : typeof m.action === "string", "non-utilized must name an action");
  }
  // all-healthy fixtures -> all 4 utilized
  assert.ok(out.every((m) => m.status === "UTILIZED"), "healthy fixtures must grade 4/4 UTILIZED");
});

test("reconcile: report carries metaSystems + summary.metaTotal===5 incl autofire (integration, live repo)", async () => {
  const report = await sharedReconcile();
  // 5th substrate (six-domain autofire) added 2026-06-30: the live reconcile() path now
  // computes buildCoverage() and grades the per-domain auto-firing layer.
  assert.ok(Array.isArray(report.metaSystems) && report.metaSystems.length === 5, "report must include 5 meta-systems");
  assert.equal(report.summary.metaTotal, 5);
  assert.ok(report.summary.metaUtilized >= 0 && report.summary.metaUtilized <= 5, "metaUtilized within [0,5]");
  assert.ok(report.metaSystems.find((m) => m.system === "autofire"), "autofire substrate present in the live roll-up");
});

// ---- six-domain autofire arm (gradeAutofireCoverage + the 5th meta-substrate) ----

test("gradeAutofireCoverage: all-fire + all-wired -> UTILIZED, silent (no action)", () => {
  const cov = { rollup: { allFire: true, allWired: true, gatesVerifiedTotal: 70, verifyBacklog: 8 }, rows: [{ key: "mill", fires: true, bundleWired: true }] };
  const v = gradeAutofireCoverage(cov);
  assert.equal(v.system, "autofire");
  assert.equal(v.status, "UTILIZED");
  assert.equal(v.action, null);
  assert.ok(v.evidence.includes("70 verified gates"));
});

test("gradeAutofireCoverage: a non-firing domain -> DOWN naming the broken domain + recovery action", () => {
  const cov = { rollup: { allFire: false, allWired: true, gatesVerifiedTotal: 58, verifyBacklog: 8 }, rows: [{ key: "lathe", fires: false, bundleWired: true }, { key: "mill", fires: true, bundleWired: true }] };
  const v = gradeAutofireCoverage(cov);
  assert.equal(v.status, "DOWN");
  assert.ok(v.evidence.includes("lathe"), "names the broken domain");
  assert.ok(v.action && v.action.includes("six-domain-autofire-coverage.mjs"));
});

test("gradeAutofireCoverage: an un-wired domain -> DOWN naming it", () => {
  const cov = { rollup: { allFire: true, allWired: false, gatesVerifiedTotal: 70, verifyBacklog: 8 }, rows: [{ key: "cam", fires: true, bundleWired: false }] };
  const v = gradeAutofireCoverage(cov);
  assert.equal(v.status, "DOWN");
  assert.ok(v.evidence.includes("cam"));
});

test("gradeAutofireCoverage: unreadable coverage -> DOWN, never silently green (fail-loud)", () => {
  for (const bad of [null, undefined, {}, { rollup: null }, { rows: 5 }]) {
    const v = gradeAutofireCoverage(bad);
    assert.equal(v.status, "DOWN", `bad coverage ${JSON.stringify(bad)} must be DOWN`);
    assert.ok(v.action && v.action.length > 0, "DOWN must name a recovery action");
  }
});

test("reconcileMetaSystems: autofireCoverage omitted -> 4 substrates (no churn); supplied -> 5 incl autofire", () => {
  const base = { stats: { offloaded: 1, executedOffloads: 1, lastUpdated: "2026-06-30T18:00:00Z" }, freshness: { ok: true, count: 34, fresh: 34, stalestH: 1 }, queueCount: 0, processedCount: 50, lastDrainAgeH: 1, nowMs: Date.parse("2026-06-30T18:01:00Z") };
  const four = reconcileMetaSystems(base);
  assert.equal(four.length, 4, "pure sync call stays at 4 (back-compat)");
  assert.ok(!four.find((m) => m.system === "autofire"), "no autofire substrate without a coverage snapshot");
  const cov = { rollup: { allFire: true, allWired: true, gatesVerifiedTotal: 70, verifyBacklog: 8 }, rows: [] };
  const five = reconcileMetaSystems({ ...base, autofireCoverage: cov });
  assert.equal(five.length, 5);
  assert.equal(five.find((m) => m.system === "autofire").status, "UTILIZED");
});

test("LIVE reconcileMetaSystemsLive: computes the autofire arm from the real 6 libs -> UTILIZED", async () => {
  const out = await reconcileMetaSystemsLive({
    stats: { offloaded: 1, executedOffloads: 1, lastUpdated: "2026-06-30T18:00:00Z" },
    freshness: { ok: true, count: 34, fresh: 34, stalestH: 1 },
    queueCount: 0, processedCount: 50, lastDrainAgeH: 1, nowMs: Date.parse("2026-06-30T18:01:00Z"),
  });
  const af = out.find((m) => m.system === "autofire");
  assert.ok(af, "autofire substrate present in the live roll-up");
  assert.equal(af.status, "UTILIZED", "all 6 domains fire live -> UTILIZED");
});

test("reconcile: A-16 is SHIPPED on the live repo (count-gated, NOT mtime -> phantom-OPEN killed)", async () => {
  const report = await sharedReconcile();
  const a16 = report.results.find((r) => r.id === "A-16");
  // The reflection corpus is built+populated (34 galaxies); the old mtime gate gave a FALSE OPEN
  // when galaxies were quiet. count>=30 must now read SHIPPED regardless of mtime age.
  assert.equal(a16.verdict, "SHIPPED", "A-16 must be SHIPPED (synthesis corpus populated); mtime is informational");
});
