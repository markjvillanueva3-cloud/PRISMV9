// scripts/generate-octopus-consensus-features.test.mjs — octopus-consensus system-viz roost (hermetic).
//
// Verifies the third consumer of the per-galaxy octopus-outcomes feeds: the /system-viz ghost roost.
// Pure generate() projects domain→outcomes into nodes/edges; readAllFeeds reads real published feeds;
// main() (env-overridden to a tmp dir) writes the augmentation. All fs is sandboxed.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generate,
  readAllFeeds,
  main,
  ROOST_ID,
  SCHEMA_VERSION,
} from "./generate-octopus-consensus-features.mjs";
import { publishConsensusOutcome } from "./lib/octopus-consumption-bridge.mjs";

const mk = (tag) => mkdtempSync(join(tmpdir(), tag));

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
