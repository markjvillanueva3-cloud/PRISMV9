import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// U-VIZ-HEADLINE-FALLBACK-OBSERVABLE (sierra) -- the `headline` cheap-path
// short-circuit must (a) emit NOTHING to stderr on the happy path, and (b) emit
// a clear stderr diagnostic when it falls through to the full-graph loadGraph
// (so a meta-read regression is visible, not silently masked). E2E via spawn
// against a small fixture graph (loadGraph works on a sub-256MB fixture).
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUERY = path.join(__dirname, "system-viz-query.mjs");

function fixtureGraph() {
  const p = path.join(os.tmpdir(), `prism-hl-e2e-${process.pid}.json`);
  const g = {
    schemaVersion: "9.9.9",
    generatedAt: "2026-06-23T00:00:00.000Z",
    meta: {
      counts: { engines: 42, dispatchers: 7, actions: 99, tests: 13, formulas: 5 },
      headline: { built: 40, unwired: 2, pendingFE: 1, drift: 3, wikiEntries: 1234 },
      totals: { nodes: 50, edges: 80, layers: 4 },
      worktrees: { total: 0, KEEP: 0, MERGE: 0, PRUNE: 0, INVESTIGATE: 0 },
    },
    nodes: Array.from({ length: 50 }, (_, i) => ({ id: `n${i}`, label: `L${i}` })),
    edges: Array.from({ length: 80 }, () => ({ from: "n0", to: "n1" })),
    layers: [1, 2, 3, 4],
  };
  fs.writeFileSync(p, JSON.stringify(g));
  return p;
}

function runHeadline(graphPath, extraEnv = {}) {
  const r = spawnSync(process.execPath, [QUERY, "headline"], {
    encoding: "utf8",
    env: { ...process.env, PRISM_VIZ_GRAPH_PATH: graphPath, ...extraEnv },
  });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

test("happy path: cheap headline emits the headline to stdout, NOTHING to stderr", () => {
  const p = fixtureGraph();
  try {
    const { status, stdout, stderr } = runHeadline(p);
    assert.equal(status, 0, `exit ${status}; stderr=${stderr}`);
    assert.match(stdout, /PRISM headline/);
    assert.match(stdout, /50n \/ 80e \/ 4 layers/);
    // No spurious fallback diagnostic on the happy path.
    assert.doesNotMatch(stderr, /falling back to full-graph/);
  } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

test("forced fallback (tiny maxBytes): still prints headline + emits the stderr diagnostic", () => {
  const p = fixtureGraph();
  try {
    // 10 bytes can't contain meta -> readGraphMeta throws -> short-circuit falls
    // through to the full-graph path (works on this small fixture).
    const { status, stdout, stderr } = runHeadline(p, { PRISM_VIZ_HEADLINE_MAXBYTES: "10" });
    assert.equal(status, 0, `exit ${status}; stderr=${stderr}`);
    assert.match(stdout, /PRISM headline/); // fallback still produces output
    assert.match(stdout, /50n \/ 80e \/ 4 layers/);
    // the degraded path is now OBSERVABLE on stderr (not silently masked)
    assert.match(stderr, /headline: cheap meta read unavailable/);
    assert.match(stderr, /falling back to full-graph loadGraph/);
  } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

test("stderr diagnostic does NOT pollute --json stdout", () => {
  const p = fixtureGraph();
  try {
    const r = spawnSync(process.execPath, [QUERY, "headline", "--json"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_VIZ_GRAPH_PATH: p, PRISM_VIZ_HEADLINE_MAXBYTES: "10" },
    });
    assert.equal(r.status, 0);
    // stdout must be parseable JSON (the diagnostic went to stderr, not stdout)
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.counts.engines, 42);
    assert.equal(parsed.nodes, 50);
    assert.match(r.stderr || "", /falling back to full-graph/);
  } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});
