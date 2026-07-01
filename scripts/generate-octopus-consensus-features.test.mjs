// scripts/generate-octopus-consensus-features.test.mjs — octopus-consensus system-viz roost (hermetic).
//
// Verifies the third consumer of the per-galaxy octopus-outcomes feeds: the /system-viz ghost roost.
// Pure generate() projects domain→outcomes into nodes/edges; readAllFeeds reads real published feeds;
// main() (env-overridden to a tmp dir) writes the augmentation. All fs is sandboxed.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generate,
  readAllFeeds,
  main,
  ROOST_ID,
  SCHEMA_VERSION,
  generateAuditLog,
  generateCombined,
  readConsensusDecisions,
  AUDIT_SUMMARY_ID,
} from "./generate-octopus-consensus-features.mjs";
import { publishConsensusOutcome } from "./lib/octopus-consumption-bridge.mjs";

const mk = (tag) => mkdtempSync(join(tmpdir(), tag));

// Reusable real-shape consensus-decisions records (ConsensusAuditLogEngine output).
const DECISION_RECS = [
  { schemaVersion: "1.0.0", ts: "2026-06-20T10:00:00Z", callerEngine: "unknown", question: "q1", voices: ["qwen2.5-coder:32b", "gpt-oss:20b"], finalDecision: "Final Answer: A", agreement: 0.5, tokensTotal: 0, latencyMsTotal: 94000 },
  { schemaVersion: "1.0.0", ts: "2026-06-20T11:00:00Z", callerEngine: "unknown", question: "q2", voices: ["qwen2.5-coder:32b"], finalDecision: "Final Answer: B", agreement: 1.0, tokensTotal: 10, latencyMsTotal: 5000 },
  { schemaVersion: "1.0.0", ts: "2026-06-20T12:00:00Z", callerEngine: "octopus-with-hermes-rag", voices: ["gpt-oss:20b"], finalDecision: "Final Answer: C", agreement: 0.8, tokensTotal: 5, latencyMsTotal: 3000 },
];

// -- consensus audit-log branch (U-OCTOPUS-AUDIT-VIZ) ----------------------

test("generateAuditLog: empty / non-array -> no nodes, no edges", () => {
  for (const v of [[], null, undefined, "x", [null, 3, "s"]]) {
    const r = generateAuditLog(v);
    assert.equal(r.newNodes.length, 0);
    assert.equal(r.newEdges.length, 0);
    assert.equal(r.stats.decisions_total, 0);
  }
});

test("generateAuditLog: aggregates by callerEngine with avg agreement + distinct voices; edges internal-only", () => {
  const r = generateAuditLog(DECISION_RECS);
  const ids = new Set(r.newNodes.map((n) => n.id));
  assert.ok(ids.has(AUDIT_SUMMARY_ID), "summary node present");
  // 1 summary + 2 caller nodes (unknown, octopus-with-hermes-rag)
  assert.equal(r.newNodes.length, 3);
  assert.equal(r.stats.decisions_total, 3);
  assert.equal(r.stats.callers_total, 2);
  // distinct voices across all records, sorted
  assert.deepEqual(r.stats.voices, ["gpt-oss:20b", "qwen2.5-coder:32b"]);
  // overall avg agreement = (0.5 + 1.0 + 0.8) / 3
  assert.ok(Math.abs(r.stats.avg_agreement - (0.5 + 1.0 + 0.8) / 3) < 1e-9);
  // 'unknown' caller has 2 decisions, avg agreement = 0.75
  const unknownNode = r.newNodes.find((n) => n.callerEngine === "unknown");
  assert.equal(unknownNode.decisionCount, 2);
  assert.ok(Math.abs(unknownNode.avgAgreement - 0.75) < 1e-9);
  // latest decision (most recent ts) surfaces for the caller
  assert.match(unknownNode.info, /Final Answer: B/);
  // Edge endpoints: `from` is ROOST_ID (the cluster root, emitted by generateCombined -- the documented
  // connection point) or an emitted node; `to` is always an emitted node. The FULL no-dangling invariant
  // (root present) is verified in the generateCombined test below.
  const validFrom = new Set([ROOST_ID, ...ids]);
  for (const e of r.newEdges) {
    assert.ok(validFrom.has(e.from), `edge.from ${e.from} is root-or-emitted`);
    assert.ok(ids.has(e.to), `edge.to ${e.to} emitted`);
    assert.equal(e.kind, "contains");
  }
});

test("generateAuditLog: missing callerEngine -> 'unknown'; non-numeric agreement ignored in avg", () => {
  const r = generateAuditLog([
    { ts: "2026-06-20T10:00:00Z", finalDecision: "X", agreement: "n/a", voices: "not-an-array" },
    { ts: "2026-06-20T11:00:00Z", callerEngine: "", finalDecision: "Y", agreement: 0.6 },
  ]);
  // both fall into 'unknown' (missing + empty-string caller)
  assert.equal(r.stats.callers_total, 1);
  const node = r.newNodes.find((n) => n.callerEngine === "unknown");
  assert.equal(node.decisionCount, 2);
  // only the 0.6 agreement counts (the string is ignored)
  assert.ok(Math.abs(node.avgAgreement - 0.6) < 1e-9);
});

test("generateCombined: emits the root when ONLY the audit log has data (audit nodes never dangle)", () => {
  const r = generateCombined({}, DECISION_RECS);
  const ids = new Set(r.newNodes.map((n) => n.id));
  assert.ok(ids.has(ROOST_ID), "root emitted for audit-only input");
  assert.ok(ids.has(AUDIT_SUMMARY_ID));
  for (const e of r.newEdges) {
    assert.ok(ids.has(e.from) && ids.has(e.to), "no dangling edge");
  }
  // per-domain + audit both contribute when both present
  const both = generateCombined({ mill: [{ verdict: "v", confidence: 0.9, voiceCount: 1, successCount: 1, at: "2026-06-01T00:00:00Z" }] }, DECISION_RECS);
  const bothIds = new Set(both.newNodes.map((n) => n.id));
  assert.ok(bothIds.has(`${ROOST_ID}.mill`) && bothIds.has(AUDIT_SUMMARY_ID), "both branches present");
});

test("readConsensusDecisions: reads JSONL tail; absent -> []; torn line skipped", () => {
  assert.deepEqual(readConsensusDecisions(join(tmpdir(), "no-such-decisions-xyz.jsonl")), []);
  const dir = mk("octo-decisions-");
  try {
    const p = join(dir, "consensus-decisions.jsonl");
    writeFileSync(p, JSON.stringify(DECISION_RECS[0]) + "\n" + JSON.stringify(DECISION_RECS[1]) + "\n{torn-partial", "utf8");
    const recs = readConsensusDecisions(p);
    assert.equal(recs.length, 2, "2 valid records, torn line skipped");
    assert.equal(recs[0].callerEngine, "unknown");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -- pure generate() -------------------------------------------------------

test("generate: empty / no-consensus input → no nodes, no edges (no island root)", () => {
  assert.deepEqual(generate({}), { newNodes: [], newEdges: [], stats: { domains_total: 0, domains_with_consensus: 0, outcomes_total: 0, by_domain: {} } });
  // domains present but all empty → still nothing (root only emitted when ≥1 has consensus)
  const r = generate({ mill: [], lathe: [] });
  assert.equal(r.newNodes.length, 0);
  assert.equal(r.newEdges.length, 0);
  assert.equal(r.stats.domains_total, 2);
  assert.equal(r.stats.domains_with_consensus, 0);
});

test("generate: one root + one node/galaxy with latest verdict; contains edges are internal-only", () => {
  const r = generate({
    mill: [
      { verdict: "older", confidence: 0.4, voiceCount: 1, successCount: 1, at: "2026-06-01T00:00:00Z" },
      { verdict: "use climb milling 0.08", confidence: 0.91, voiceCount: 3, successCount: 3, at: "2026-06-01T01:00:00Z" },
    ],
    lathe: [{ verdict: "CSS 1200", confidence: 0.7, voiceCount: 2, successCount: 2, at: "2026-06-01T02:00:00Z" }],
  });
  const ids = new Set(r.newNodes.map((n) => n.id));
  assert.ok(ids.has(ROOST_ID), "root present");
  assert.ok(ids.has(`${ROOST_ID}.mill`));
  assert.ok(ids.has(`${ROOST_ID}.lathe`));
  // latest (most-recent-LAST) verdict wins for mill
  const mill = r.newNodes.find((n) => n.id === `${ROOST_ID}.mill`);
  assert.match(mill.label, /use climb milling 0\.08/);
  assert.match(mill.info, /3\/3 voices/);
  assert.equal(mill.outcomeCount, 2);
  // EVERY edge target/source must be an emitted node — no dangling edges into the wider graph
  for (const e of r.newEdges) {
    assert.ok(ids.has(e.from), `edge.from ${e.from} is an emitted node`);
    assert.ok(ids.has(e.to), `edge.to ${e.to} is an emitted node`);
    assert.equal(e.kind, "contains");
  }
  assert.equal(r.stats.domains_with_consensus, 2);
  assert.equal(r.stats.outcomes_total, 3);
});

test("generate: missing/garbage fields render safe placeholders (never throws)", () => {
  const r = generate({ wedm: [{ verdict: 42, confidence: "x", voiceCount: null, at: undefined }] });
  const node = r.newNodes.find((n) => n.id === `${ROOST_ID}.wedm`);
  assert.ok(node, "node emitted despite garbage fields");
  assert.match(node.info, /conf=n\/a/);
  assert.match(node.info, /0\/0 voices/);
});

// -- readAllFeeds + main() (E2E with a sandboxed feed dir) ----------------

test("readAllFeeds: reads real published feeds; absent dir → {}", () => {
  assert.deepEqual(readAllFeeds(join(tmpdir(), "octo-viz-absent-xyz")), {});
  const dir = mk("octo-viz-feeds-");
  try {
    publishConsensusOutcome("mill", { verdict: "v-mill", confidence: 0.9 }, { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: [{ id: "a", verdict: "answered" }], successCount: 1 });
    publishConsensusOutcome("cam", { verdict: "v-cam", confidence: 0.8 }, { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: [{ id: "a", verdict: "answered" }], successCount: 1 });
    const feeds = readAllFeeds(dir);
    assert.deepEqual(Object.keys(feeds).sort(), ["cam", "mill"]);
    assert.equal(feeds.mill[feeds.mill.length - 1].verdict, "v-mill");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E main(): publish → generate roost augmentation file (env-overridden to tmp dirs)", () => {
  const feedDir = mk("octo-viz-e2e-feed-");
  const outDir = mk("octo-viz-e2e-out-");
  const outPath = join(outDir, "octopus-consensus-augmentation.json");
  const savedFeed = process.env.PRISM_OCTOPUS_OUTCOMES_DIR;
  const savedOut = process.env.PRISM_OCTOPUS_CONSENSUS_OUT;
  try {
    publishConsensusOutcome("mill", { verdict: "E2E viz verdict", confidence: 0.9 },
      { baseDir: feedDir, at: "2026-06-01T00:00:00Z", voices: [{ id: "a", verdict: "answered" }, { id: "b", verdict: "answered" }], successCount: 2 });
    process.env.PRISM_OCTOPUS_OUTCOMES_DIR = feedDir;
    process.env.PRISM_OCTOPUS_CONSENSUS_OUT = outPath;
    main();
    const aug = JSON.parse(readFileSync(outPath, "utf8"));
    assert.equal(aug.schemaVersion, SCHEMA_VERSION);
    assert.ok(aug.newNodes.some((n) => n.id === ROOST_ID), "root node written");
    const mill = aug.newNodes.find((n) => n.id === `${ROOST_ID}.mill`);
    assert.ok(mill, "mill consensus node written");
    assert.match(mill.label, /E2E viz verdict/);
    assert.equal(aug.stats.domains_with_consensus, 1);
  } finally {
    if (savedFeed === undefined) delete process.env.PRISM_OCTOPUS_OUTCOMES_DIR; else process.env.PRISM_OCTOPUS_OUTCOMES_DIR = savedFeed;
    if (savedOut === undefined) delete process.env.PRISM_OCTOPUS_CONSENSUS_OUT; else process.env.PRISM_OCTOPUS_CONSENSUS_OUT = savedOut;
    rmSync(feedDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
});
