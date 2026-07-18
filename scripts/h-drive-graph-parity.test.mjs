/**
 * H-DRIVE-VAULT-SYNERGY / U-3 -- graph<->vault parity tests.
 *
 * Pure computeParity hermetically (both directions + prism aggregate + L9-only-not-a-gap + guards);
 * collectGraphDomains via an injected fake stream AND via the REAL streamGraphArray on a tiny
 * fixture graph (proves the streaming wiring, not just a fake); loadCoverage real-fs. node:test,
 * real-value assertions, >=3 failure/edge modes, fail-on-revert guards.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY
 * @unit U-3
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { namespaceForName, collectGraphDomains, computeParity, loadCoverage } from "./h-drive-graph-parity.mjs";

const GATE = fileURLToPath(new URL("./h-drive-graph-parity.mjs", import.meta.url));

const top = (name, hasNote) => ({ scope: "H:/ top-level", name, hasNote, fileCount: 10 });
const prismSub = (name, hasNote) => ({ scope: "H:/prism subdirs", name, hasNote });
const tallyOf = (entries) => new Map(entries.map(([ns, fileNodes, total]) => [ns, { namespace: ns, l9: 0, l11: 0, l12: fileNodes, fileNodes, total: total ?? fileNodes }]));

test("namespaceForName: base name; prism + prism-* collapse to prism", () => {
  assert.equal(namespaceForName("alpha"), "alpha");
  assert.equal(namespaceForName("prism"), "prism");
  assert.equal(namespaceForName("prism-slot-papa"), "prism");
  assert.equal(namespaceForName("H:/foo/"), "foo");
  assert.equal(namespaceForName("H:\\bar"), "bar");
  assert.equal(namespaceForName(""), "");
});

test("clean parity: graph ns matches a noted top-level domain -> both, ok=true", () => {
  const r = computeParity({ graphDomains: tallyOf([["alpha", 5]]), coverageDomains: [top("alpha", true)] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.graphOnly, []);
  assert.equal(r.both.length, 1);
  assert.equal(r.both[0].namespace, "alpha");
});

test("graphOnly (domain-without-note): graph has files but vault note absent -> gates", () => {
  const r = computeParity({ graphDomains: tallyOf([["alpha", 5]]), coverageDomains: [top("alpha", false)] });
  assert.equal(r.ok, false);
  assert.equal(r.graphOnly.length, 1);
  assert.equal(r.graphOnly[0].reason, "domain-without-note");
  assert.equal(r.graphOnly[0].fileNodes, 5);
});

test("graphOnly (no-vault-domain): graph has files for an uncategorized namespace -> gates", () => {
  const r = computeParity({ graphDomains: tallyOf([["beta", 3]]), coverageDomains: [top("alpha", true)] });
  assert.equal(r.ok, false);
  assert.equal(r.graphOnly[0].namespace, "beta");
  assert.equal(r.graphOnly[0].reason, "no-vault-domain");
});

test("vaultOnly is ADVISORY: a noted domain with no graph file-nodes does NOT gate", () => {
  const r = computeParity({ graphDomains: tallyOf([["alpha", 5]]), coverageDomains: [top("alpha", true), top("gamma", true)] });
  assert.equal(r.ok, true); // graphOnly empty
  assert.equal(r.vaultOnly.length, 1);
  assert.equal(r.vaultOnly[0].name, "gamma");
});

test("prism collapses to an aggregate, never per-subdir graphOnly", () => {
  const tally = tallyOf([["prism", 100, 120], ["alpha", 5]]);
  const r = computeParity({ graphDomains: tally, coverageDomains: [top("alpha", true), prismSub("mcp-server", true), prismSub("scripts", true), prismSub("web", false)] });
  assert.equal(r.ok, true);
  assert.equal(r.prismAggregate.graphFileNodes, 100);
  assert.equal(r.prismAggregate.graphTotalNodes, 120);
  assert.equal(r.prismAggregate.vaultSubdirNotes, 2); // only hasNote:true subdirs counted
  assert.ok(!r.graphOnly.some((g) => g.namespace === "prism"));
});

test("an L9-only namespace (0 file-nodes) is NOT a graph-only gap -- fail-on-revert guard", () => {
  // root marker with no L11/L12 files must not be flagged as drift.
  const tally = new Map([["delta", { namespace: "delta", l9: 1, l11: 0, l12: 0, fileNodes: 0, total: 1 }]]);
  const r = computeParity({ graphDomains: tally, coverageDomains: [] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.graphOnly, []);
});

test("null/empty guards: non-Map graphDomains + null coverageDomains never throw", () => {
  const a = computeParity({ graphDomains: null, coverageDomains: null });
  assert.equal(a.ok, true);
  assert.equal(a.graphNamespaces, 0);
  assert.equal(a.vaultTopLevelDomains, 0);
  const b = computeParity({ graphDomains: tallyOf([["x", 1]]), coverageDomains: undefined });
  assert.equal(b.ok, false); // 'x' has files, no domain -> graphOnly
});

test("collectGraphDomains via injected fake stream tallies L9/L11/L12 and ignores other layers", () => {
  const nodes = [
    { id: "a", layer: "L9", namespace: "alpha" },
    { id: "b", layer: "L11", namespace: "alpha" },
    { id: "c", layer: "L12", namespace: "alpha" },
    { id: "d", layer: "L12", namespace: "alpha" },
    { id: "e", layer: "L4", namespace: "x" }, // non-fs layer -> ignored
    { id: "f", layer: "L12" }, // missing namespace -> "(none)"
  ];
  const fakeStream = (_p, _k, onEl) => { nodes.forEach((n, i) => onEl(n, i)); return nodes.length; };
  const { byNs, nodesScanned } = collectGraphDomains("ignored", { stream: fakeStream });
  assert.equal(nodesScanned, 6);
  const a = byNs.get("alpha");
  assert.deepEqual([a.l9, a.l11, a.l12, a.fileNodes, a.total], [1, 1, 2, 3, 4]);
  assert.equal(byNs.has("x"), false); // L4 ignored
  assert.equal(byNs.get("(none)").fileNodes, 1);
});

test("collectGraphDomains via the REAL streamGraphArray on a tiny fixture graph (wiring oracle)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-parity-"));
  try {
    const g = path.join(tmp, "graph.json");
    fs.writeFileSync(g, JSON.stringify({
      nodes: [
        { id: "a", layer: "L9", namespace: "alpha" },
        { id: "b", layer: "L11", namespace: "alpha" },
        { id: "c", layer: "L12", namespace: "alpha" },
        { id: "z", layer: "L10", namespace: "ignoreme" },
      ],
      edges: [],
    }));
    const { byNs, nodesScanned } = collectGraphDomains(g); // DEFAULT real streamGraphArray
    assert.equal(nodesScanned, 4);
    const a = byNs.get("alpha");
    assert.equal(a.fileNodes, 2); // L11 + L12
    assert.equal(a.l9, 1);
    assert.equal(byNs.has("ignoreme"), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("collectGraphDomains on a missing/garbage graph -> 0 nodes scanned (fail-soft)", () => {
  const { nodesScanned } = collectGraphDomains(path.join(os.tmpdir(), "no-such-graph-xyz.json"));
  assert.equal(nodesScanned, 0);
});

test("fsCoverageDetected=false when EVERY fs node fell into (none) -- no namespaced fs layer", () => {
  // Mirrors the live merged graph: L9 use `subgroup` (no namespace), L11 are ghost nodes, no L12.
  const tally = new Map([["(none)", { namespace: "(none)", l9: 100, l11: 5000, l12: 0, fileNodes: 5000, total: 5100 }]]);
  const r = computeParity({ graphDomains: tally, coverageDomains: [top("alpha", true)] });
  assert.equal(r.fsCoverageDetected, false);
  assert.equal(r.realFileNodes, 0); // (none) excluded
});

test("fsCoverageDetected=true when a real namespace carries fs file-nodes", () => {
  const r = computeParity({ graphDomains: tallyOf([["alpha", 5]]), coverageDomains: [top("alpha", true)] });
  assert.equal(r.fsCoverageDetected, true);
  assert.equal(r.realFileNodes, 5);
});

// -- CLI exit-code oracles (subprocess) --
test("CLI exit 2 when the graph lacks the namespaced fs-coverage layer (no false PARITY OK)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-parity-cli-"));
  try {
    const g = path.join(tmp, "graph.json");
    // L9 with subgroup (no namespace) + ghost L11 (no namespace) + no L12 -> all (none).
    fs.writeFileSync(g, JSON.stringify({ nodes: [{ id: "fs.x", layer: "L9", subgroup: "prism" }, { id: "ghost.y", layer: "L11" }], edges: [] }));
    const c = path.join(tmp, "cov.json");
    fs.writeFileSync(c, JSON.stringify({ domains: [top("alpha", true)] }));
    const r = spawnSync(process.execPath, [GATE, "--json", "--graph", g, "--coverage", c], { encoding: "utf8" });
    assert.equal(r.status, 2, r.stdout + r.stderr);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.measurementFailure, true);
    assert.equal(parsed.fsCoverageDetected, false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI exit 0 (clean) / 1 (drift) / 2 (missing graph) with a namespaced fs-coverage graph", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-parity-cli-"));
  try {
    const g = path.join(tmp, "graph.json");
    fs.writeFileSync(g, JSON.stringify({ nodes: [{ id: "a", layer: "L12", namespace: "alpha" }, { id: "b", layer: "L11", namespace: "alpha" }], edges: [] }));
    const covClean = path.join(tmp, "clean.json");
    fs.writeFileSync(covClean, JSON.stringify({ domains: [top("alpha", true)] }));
    const covDrift = path.join(tmp, "drift.json");
    fs.writeFileSync(covDrift, JSON.stringify({ domains: [top("alpha", false)] }));
    const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: "utf8" });

    const clean = run(["--graph", g, "--coverage", covClean]);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);

    const drift = run(["--graph", g, "--coverage", covDrift]);
    assert.equal(drift.status, 1, drift.stdout + drift.stderr);
    assert.match(drift.stdout, /DRIFT/);

    const badGraph = run(["--graph", path.join(tmp, "missing.json"), "--coverage", covClean]);
    assert.equal(badGraph.status, 2, badGraph.stdout + badGraph.stderr);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("loadCoverage: valid parses; corrupt/missing -> null", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-parity-"));
  try {
    const good = path.join(tmp, "c.json");
    fs.writeFileSync(good, JSON.stringify({ domains: [top("alpha", true)] }));
    assert.equal(loadCoverage(good).domains.length, 1);
    const bad = path.join(tmp, "bad.json");
    fs.writeFileSync(bad, "{nope");
    assert.equal(loadCoverage(bad), null);
    assert.equal(loadCoverage(path.join(tmp, "missing.json")), null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
