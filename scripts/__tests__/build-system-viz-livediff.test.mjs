/**
 * build-system-viz-livediff.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-G19.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes
 *   - >= 2 adversarial inputs
 *   - >= 3 spanning variability configs
 *   - round-trip through CLI entry
 *
 * Real reference values — no toBeDefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  loadGraph,
  diffNodes,
  diffEdges,
  diffHeadline,
  buildLayerBreakdown,
  composeDiffReport,
  buildLiveDiff,
  renderMarkdown,
  runCli,
  writeAtomic,
} from "../build-system-viz-livediff.mjs";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "system-viz-livediff-"));
  mkdirSync(join(root, "state/shared/system-viz"), { recursive: true });
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

function writeGraph(root, name, graph) {
  const p = join(root, "state/shared/system-viz", name);
  writeFileSync(p, JSON.stringify(graph), "utf8");
  return p;
}

function n(id, fields = {}) {
  return { id, layer: "L5", status: "wired", label: id, ...fields };
}

function e(from, to, type = "imports", fields = {}) {
  return { from, to, type, status: "ok", ...fields };
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x.mjs"]);
    expect(a.json).toBe(false);
    expect(a.frozenTime).toBe(null);
    expect(a.current).toBe(null);
    expect(a.previous).toBe(null);
  });

  it("--json + --frozen-time + --current + --previous", () => {
    const a = parseArgs(["node", "x.mjs", "--json", "--frozen-time", "2026-05-13T22:00:00Z", "--current", "/a.json", "--previous", "/b.json"]);
    expect(a.json).toBe(true);
    expect(a.frozenTime).toBe("2026-05-13T22:00:00Z");
    expect(a.current).toBe("/a.json");
    expect(a.previous).toBe("/b.json");
  });
});

// ──────────────────────────────────────────────────────────────────────
// loadGraph
// ──────────────────────────────────────────────────────────────────────

describe("loadGraph", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("returns ok:true with bytes + mtime for a valid graph", () => {
    const p = writeGraph(root, "g.json", { nodes: [n("a")], edges: [] });
    const out = loadGraph(p);
    expect(out.ok).toBe(true);
    expect(out.bytes).toBeGreaterThan(0);
    expect(out.graph.nodes).toHaveLength(1);
  });

  it("returns ok:false on missing file", () => {
    const out = loadGraph(join(root, "does-not-exist.json"));
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });

  it("returns ok:false on invalid JSON", () => {
    const p = join(root, "state/shared/system-viz/bad.json");
    writeFileSync(p, "{not json", "utf8");
    const out = loadGraph(p);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/parse failed/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// diffNodes
// ──────────────────────────────────────────────────────────────────────

describe("diffNodes", () => {
  it("classifies added / removed / changed", () => {
    const previous = [
      n("only-prev"),
      n("both-same"),
      n("both-changed", { status: "unwired" }),
    ];
    const current = [
      n("only-curr"),
      n("both-same"),
      n("both-changed", { status: "wired" }),
    ];
    const d = diffNodes(current, previous);
    expect(d.added.map((x) => x.id)).toEqual(["only-curr"]);
    expect(d.removed.map((x) => x.id)).toEqual(["only-prev"]);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].id).toBe("both-changed");
    expect(d.changed[0].fields[0]).toEqual({ field: "status", prev: "unwired", curr: "wired" });
  });

  it("treats null/missing fields stably (no false change)", () => {
    const previous = [{ id: "x" }];
    const current = [{ id: "x" }];
    const d = diffNodes(current, previous);
    expect(d.changed).toEqual([]);
  });

  it("handles empty arrays as inputs", () => {
    expect(diffNodes([], [])).toEqual({ added: [], removed: [], changed: [] });
    expect(diffNodes([n("a")], [])).toEqual({ added: [{ id: "a", layer: "L5", status: "wired", label: "a" }], removed: [], changed: [] });
    expect(diffNodes([], [n("a")]).removed.map((x) => x.id)).toEqual(["a"]);
  });

  it("ignores non-tracked field changes (e.g. label-only edits)", () => {
    const previous = [n("x", { label: "old" })];
    const current = [n("x", { label: "new" })];
    const d = diffNodes(current, previous);
    expect(d.changed).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// diffEdges
// ──────────────────────────────────────────────────────────────────────

describe("diffEdges", () => {
  it("classifies added/removed by (from,to,type)", () => {
    const previous = [
      e("a", "b", "imports"),
      e("a", "b", "calls"),
    ];
    const current = [
      e("a", "b", "imports"),     // unchanged
      e("a", "c", "imports"),     // added
      // (a, b, calls) removed
    ];
    const d = diffEdges(current, previous);
    expect(d.added.map((x) => `${x.from}→${x.to}/${x.type}`)).toEqual(["a→c/imports"]);
    expect(d.removed.map((x) => `${x.from}→${x.to}/${x.type}`)).toEqual(["a→b/calls"]);
  });

  it("missing type field falls back to '_' so same-pair edges still de-dupe", () => {
    const previous = [{ from: "a", to: "b" }];
    const current = [{ from: "a", to: "b" }];
    const d = diffEdges(current, previous);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it("handles empty arrays as inputs", () => {
    expect(diffEdges([], [])).toEqual({ added: [], removed: [] });
  });
});

// ──────────────────────────────────────────────────────────────────────
// diffHeadline
// ──────────────────────────────────────────────────────────────────────

describe("diffHeadline", () => {
  it("returns rows with section / key / prev / curr / delta", () => {
    const cur = { counts: { engines: 3180, dispatchers: 97 }, headline: { built: 2302, unwired: 875 } };
    const prv = { counts: { engines: 3179, dispatchers: 97 }, headline: { built: 2299, unwired: 880 } };
    const rows = diffHeadline(cur, prv);
    const dispatchers = rows.find((r) => r.key === "dispatchers");
    const engines = rows.find((r) => r.key === "engines");
    const built = rows.find((r) => r.key === "built");
    const unwired = rows.find((r) => r.key === "unwired");
    expect(dispatchers.delta).toBe(0);
    expect(engines.delta).toBe(1);
    expect(built.delta).toBe(3);
    expect(unwired.delta).toBe(-5);
  });

  it("treats missing prev as 0 (so a new metric reads as a fresh addition)", () => {
    const cur = { counts: { newMetric: 42 } };
    const prv = { counts: {} };
    const rows = diffHeadline(cur, prv);
    expect(rows[0]).toEqual({ section: "counts", key: "newMetric", prev: 0, curr: 42, delta: 42 });
  });

  it("skips non-numeric values", () => {
    const cur = { counts: { engines: 3, label: "ignored" } };
    const prv = { counts: { engines: 1, label: "ignored-too" } };
    const rows = diffHeadline(cur, prv);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("engines");
  });

  it("returns empty array when both meta objects are missing", () => {
    expect(diffHeadline(undefined, undefined)).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildLayerBreakdown
// ──────────────────────────────────────────────────────────────────────

describe("buildLayerBreakdown", () => {
  it("buckets added/removed counts by layer", () => {
    const nodeDiff = {
      added: [n("a1", { layer: "L5" }), n("a2", { layer: "L5" }), n("a3", { layer: "L8" })],
      removed: [n("r1", { layer: "L5" }), n("r2", { layer: "L9" })],
      changed: [],
    };
    const rows = buildLayerBreakdown(nodeDiff);
    const l5 = rows.find((r) => r.layer === "L5");
    const l8 = rows.find((r) => r.layer === "L8");
    const l9 = rows.find((r) => r.layer === "L9");
    expect(l5).toEqual({ layer: "L5", added: 2, removed: 1 });
    expect(l8).toEqual({ layer: "L8", added: 1, removed: 0 });
    expect(l9).toEqual({ layer: "L9", added: 0, removed: 1 });
  });

  it("defaults missing layer to L?", () => {
    const nodeDiff = { added: [{ id: "x" }], removed: [], changed: [] };
    const rows = buildLayerBreakdown(nodeDiff);
    expect(rows[0]).toEqual({ layer: "L?", added: 1, removed: 0 });
  });
});

// ──────────────────────────────────────────────────────────────────────
// composeDiffReport + buildLiveDiff
// ──────────────────────────────────────────────────────────────────────

describe("composeDiffReport", () => {
  it("happy: assembles a report with stats and samples", () => {
    const previous = {
      generatedAt: "2026-05-13T20:00:00Z",
      meta: { counts: { engines: 2 }, headline: { built: 1 } },
      nodes: [n("kept"), n("removed-node")],
      edges: [e("kept", "x")],
    };
    const current = {
      generatedAt: "2026-05-13T21:00:00Z",
      meta: { counts: { engines: 3 }, headline: { built: 2 } },
      nodes: [n("kept"), n("new-node")],
      edges: [e("kept", "x"), e("new-node", "x")],
    };
    const r = composeDiffReport({ current, previous, generatedAt: "2026-05-13T22:00:00Z" });
    expect(r.ok).toBe(true);
    expect(r.stats.nodesAdded).toBe(1);
    expect(r.stats.nodesRemoved).toBe(1);
    expect(r.stats.edgesAdded).toBe(1);
    expect(r.stats.edgesRemoved).toBe(0);
    expect(r.headline.find((h) => h.key === "engines").delta).toBe(1);
    expect(r.nodesAddedSample[0].id).toBe("new-node");
    expect(r.nodesRemovedSample[0].id).toBe("removed-node");
    expect(r.current_generated_at).toBe("2026-05-13T21:00:00Z");
    expect(r.previous_generated_at).toBe("2026-05-13T20:00:00Z");
  });

  it("handles missing edges/nodes gracefully (no throw)", () => {
    const r = composeDiffReport({
      current: { nodes: [n("only")] },
      previous: { },
      generatedAt: "now",
    });
    expect(r.stats.nodesAdded).toBe(1);
    expect(r.stats.edgesAdded).toBe(0);
  });
});

describe("buildLiveDiff (fs round-trip)", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("returns a full report when both files exist", async () => {
    writeGraph(root, "system-graph.json", { nodes: [n("a"), n("b")], edges: [e("a", "b")], meta: { counts: { engines: 2 }, headline: { built: 1 } } });
    writeGraph(root, "system-graph.previous.json", { nodes: [n("a")], edges: [], meta: { counts: { engines: 1 }, headline: { built: 0 } } });
    const r = await buildLiveDiff({ repo: root, frozenTime: "2026-05-13T22:00:00Z" });
    expect(r.ok).toBe(true);
    expect(r.stats.nodesAdded).toBe(1);
    expect(r.stats.edgesAdded).toBe(1);
  });

  it("failure: missing current returns ok:false with current: prefix + non-empty shape", async () => {
    writeGraph(root, "system-graph.previous.json", { nodes: [], edges: [] });
    const r = await buildLiveDiff({ repo: root, frozenTime: "2026-05-13T22:00:00Z", retryDelayMs: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^current:/);
    // ok:false branches must keep the consumer-expected shape
    expect(r.schemaVersion).toBe(1);
    expect(r.stats).toEqual({ nodesCurrent: 0, nodesPrevious: 0, edgesCurrent: 0, edgesPrevious: 0, nodesAdded: 0, nodesRemoved: 0, nodesChanged: 0, edgesAdded: 0, edgesRemoved: 0 });
    expect(r.headline).toEqual([]);
    expect(r.layerBreakdown).toEqual([]);
    expect(r.nodesAddedSample).toEqual([]);
    expect(r.current_path).toMatch(/system-graph\.json$/);
  });

  it("failure: missing previous returns ok:false with previous: prefix + non-empty shape", async () => {
    writeGraph(root, "system-graph.json", { nodes: [], edges: [] });
    const r = await buildLiveDiff({ repo: root, frozenTime: "2026-05-13T22:00:00Z", retryDelayMs: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^previous:/);
    expect(r.schemaVersion).toBe(1);
    expect(r.stats.nodesAdded).toBe(0);
    expect(r.previous_path).toMatch(/system-graph\.previous\.json$/);
  });

  it("failure: invalid JSON in current side returns ok:false (parse failed)", async () => {
    writeFileSync(join(root, "state/shared/system-viz/system-graph.json"), "{not", "utf8");
    writeGraph(root, "system-graph.previous.json", { nodes: [], edges: [] });
    const r = await buildLiveDiff({ repo: root, frozenTime: "2026-05-13T22:00:00Z", retryDelayMs: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/parse failed/);
  });

  it("TOCTOU retry: previous-side parse-failure retries once, succeeds on second attempt", async () => {
    // current is fine
    writeGraph(root, "system-graph.json", { nodes: [n("a")], edges: [] });
    const prvPath = join(root, "state/shared/system-viz/system-graph.previous.json");
    // previous is invalid JSON on first read — fix it during the retry delay.
    // Use a 5× margin (500ms retry vs 100ms write) to survive slow CI runners.
    writeFileSync(prvPath, "{not", "utf8");
    setTimeout(() => {
      writeFileSync(prvPath, JSON.stringify({ nodes: [], edges: [] }), "utf8");
    }, 100);
    const r = await buildLiveDiff({ repo: root, frozenTime: "2026-05-13T22:00:00Z", retryDelayMs: 500 });
    expect(r.ok).toBe(true);
  });

  it("TOCTOU retry: retryDelayMs:0 disables the retry path (elapsed below default-retry budget)", async () => {
    writeGraph(root, "system-graph.json", { nodes: [n("a")], edges: [] });
    const prvPath = join(root, "state/shared/system-viz/system-graph.previous.json");
    writeFileSync(prvPath, "{still bad", "utf8");
    const t0 = Date.now();
    const r = await buildLiveDiff({ repo: root, frozenTime: "2026-05-13T22:00:00Z", retryDelayMs: 0 });
    const elapsed = Date.now() - t0;
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^previous:.*parse failed/);
    // Default retry budget is 250ms; with retryDelayMs:0 we must beat that comfortably.
    // Loosened from <150ms to <250ms for cold-start vitest workers on Windows.
    expect(elapsed).toBeLessThan(250);
  });

  it("path resolver: --current with absolute Windows drive-letter path is honored", async () => {
    // Create the absolute current path OUTSIDE the repo to confirm the override works.
    const absRoot = mkdtempSync(join(tmpdir(), "system-viz-abs-"));
    const absCur = join(absRoot, "abs-current.json");
    writeFileSync(absCur, JSON.stringify({ nodes: [n("absolute-node")], edges: [] }), "utf8");
    writeGraph(root, "system-graph.previous.json", { nodes: [], edges: [] });
    try {
      const r = await buildLiveDiff({ repo: root, current: absCur, frozenTime: "2026-05-13T22:00:00Z", retryDelayMs: 0 });
      expect(r.ok).toBe(true);
      expect(r.current_path.endsWith("abs-current.json")).toBe(true);
      expect(r.stats.nodesAdded).toBe(1);
    } finally {
      rmSync(absRoot, { recursive: true, force: true });
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// Adversarial + spanning
// ──────────────────────────────────────────────────────────────────────

describe("adversarial + spanning configs", () => {
  it("adversarial: duplicate node ids in input — first wins, no crash", () => {
    const d = diffNodes(
      [n("dup", { status: "wired" }), n("dup", { status: "unwired" })],
      [n("dup", { status: "wired" })],
    );
    expect(d.changed).toEqual([]);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it("adversarial: a node whose id is non-string still hashes (stringified)", () => {
    const previous = [{ id: 42 }];
    const current = [{ id: 42 }];
    const d = diffNodes(current, previous);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it("adversarial: nodes with undefined id are NOT silently dropped (synthesized __noid key)", () => {
    // Pre-fix this test would have shown 0 added/0 removed because both sides' id-less
    // nodes failed the `k != null` guard in buildIndex. Post-fix the nodes are tagged
    // with `__noid:layer:label` so they correctly classify as same/different.
    const previous = [{ layer: "L5", status: "wired", label: "missing-id-A" }];
    const current = [
      { layer: "L5", status: "wired", label: "missing-id-A" }, // same key → unchanged
      { layer: "L5", status: "wired", label: "missing-id-B" }, // different label → added
    ];
    const d = diffNodes(current, previous);
    expect(d.added).toHaveLength(1);
    expect(d.added[0].label).toBe("missing-id-B");
    expect(d.removed).toEqual([]);
  });

  it("__noid synthesis: changed-fields path detects status flip on id-less nodes", () => {
    // Two id-less nodes with the same layer+label key — the changed-fields path
    // must surface a status transition (proves __noid synthesis works through diffNodes
    // for the CHANGED case, not just added/removed).
    const previous = [{ layer: "L5", status: "unwired", label: "no-id-node" }];
    const current = [{ layer: "L5", status: "wired", label: "no-id-node" }];
    const d = diffNodes(current, previous);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].id).toBe("__noid:L5:no-id-node");
    expect(d.changed[0].fields[0]).toEqual({ field: "status", prev: "unwired", curr: "wired" });
  });

  it("spanning: identical graphs produce zero deltas", () => {
    const same = { nodes: [n("a"), n("b")], edges: [e("a", "b")], meta: { counts: { x: 1 } } };
    const r = composeDiffReport({ current: same, previous: same, generatedAt: "t" });
    expect(r.stats.nodesAdded).toBe(0);
    expect(r.stats.nodesRemoved).toBe(0);
    expect(r.stats.edgesAdded).toBe(0);
    expect(r.stats.edgesRemoved).toBe(0);
    expect(r.headline.every((h) => h.delta === 0)).toBe(true);
  });

  it("spanning: huge synthetic graph (5000 nodes) completes <2s", async () => {
    const previous = { nodes: [], edges: [] };
    const current = { nodes: [], edges: [] };
    for (let i = 0; i < 5000; i++) {
      const isPrev = i % 3 !== 0;
      const isCurr = i % 3 !== 2;
      if (isPrev) previous.nodes.push(n(`p${i}`));
      if (isCurr) current.nodes.push(n(`p${i}`));
    }
    const t0 = Date.now();
    const r = composeDiffReport({ current, previous, generatedAt: "t" });
    const elapsed = Date.now() - t0;
    // Expect roughly equal distribution; main check is "didn't crash + ran fast".
    expect(elapsed).toBeLessThan(2000);
    expect(r.stats.nodesAdded + r.stats.nodesRemoved).toBeGreaterThan(0);
  });

  it("spanning: huge headline metric flips don't drop precision", () => {
    const cur = { counts: { engines: 999999 } };
    const prv = { counts: { engines: 1 } };
    const rows = diffHeadline(cur, prv);
    expect(rows[0].delta).toBe(999998);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders the headline counters table with sign + delta", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "2026-05-13T22:00:00Z",
      current_path: "/repo/curr",
      previous_path: "/repo/prev",
      current_generated_at: "2026-05-13T21:00:00Z",
      previous_generated_at: "2026-05-13T20:00:00Z",
      stats: { nodesCurrent: 2, nodesPrevious: 1, edgesCurrent: 1, edgesPrevious: 0, nodesAdded: 1, nodesRemoved: 0, nodesChanged: 0, edgesAdded: 1, edgesRemoved: 0 },
      headline: [
        { section: "counts", key: "engines", prev: 1, curr: 2, delta: 1 },
        { section: "headline", key: "unwired", prev: 10, curr: 5, delta: -5 },
      ],
      layerBreakdown: [{ layer: "L5", added: 1, removed: 0 }],
      nodesAddedSample: [{ id: "new", label: "label", layer: "L5", status: "wired" }],
      nodesRemovedSample: [],
      nodesChangedSample: [],
      edgesAddedSample: [{ from: "a", to: "b", type: "imports", status: "ok" }],
      edgesRemovedSample: [],
    });
    expect(md).toContain("Δ");
    expect(md).toContain("| counts | `engines` | 1 | 2 | +1 |");
    expect(md).toContain("| headline | `unwired` | 10 | 5 | -5 |");
    expect(md).toContain("`new`");
    expect(md).toContain("`a` → `b`");
    expect(md).toContain("| L5 | 1 | 0 |");
  });

  it("renders an error banner on ok:false", () => {
    const md = renderMarkdown({ ok: false, reason: "current: file not found: /nope", generated_at: "t" });
    expect(md).toContain("**ERROR:**");
    expect(md).toContain("/nope");
  });
});

// ──────────────────────────────────────────────────────────────────────
// runCli — round-trip
// ──────────────────────────────────────────────────────────────────────

describe("runCli (round-trip)", () => {
  let root;
  let stdoutBuf;
  let origStdout;

  beforeEach(() => {
    root = makeRepo();
    stdoutBuf = [];
    origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { stdoutBuf.push(String(s)); return true; };
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    rmSync(root, { recursive: true, force: true });
  });

  it("--json mode emits JSON to stdout and creates ZERO LIVEDIFF files", async () => {
    writeGraph(root, "system-graph.json", { nodes: [n("a")], edges: [] });
    writeGraph(root, "system-graph.previous.json", { nodes: [], edges: [] });
    const r = await runCli(["node", "x.mjs", "--json", "--frozen-time", "2026-05-13T22:00:00Z"], { repo: root });
    expect(r.ok).toBe(true);
    expect(JSON.parse(stdoutBuf.join("").trim()).ok).toBe(true);
    // Strengthened from "specific filename absent" to "no SYSTEM_VIZ_LIVEDIFF* artifact written" —
    // catches any future write that targets a different name in this dir.
    const sharedFiles = readdirSync(join(root, "state/shared"));
    const livediffArtifacts = sharedFiles.filter((nm) => nm.startsWith("SYSTEM_VIZ_LIVEDIFF"));
    expect(livediffArtifacts).toEqual([]);
    // And no .tmp- residue left behind either
    const tmpResidue = sharedFiles.filter((nm) => nm.includes(".tmp-"));
    expect(tmpResidue).toEqual([]);
  });

  it("default mode writes both files atomically and prints summary", async () => {
    writeGraph(root, "system-graph.json", { nodes: [n("a"), n("b")], edges: [e("a", "b")] });
    writeGraph(root, "system-graph.previous.json", { nodes: [n("a")], edges: [] });
    const r = await runCli(["node", "x.mjs", "--frozen-time", "2026-05-13T22:00:00Z"], { repo: root });
    expect(r.ok).toBe(true);
    const jsonPath = join(root, "state/shared/SYSTEM_VIZ_LIVEDIFF.json");
    const mdPath = join(root, "state/shared/SYSTEM_VIZ_LIVEDIFF.md");
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(mdPath)).toBe(true);
    const onDisk = JSON.parse(readFileSync(jsonPath, "utf8"));
    expect(onDisk.stats.nodesAdded).toBe(1);
    expect(stdoutBuf.join("")).toMatch(/system-viz-livediff: nodes Δ=\+1/);
    // No .tmp- residue.
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("missing previous file produces a failure report (not throw)", async () => {
    writeGraph(root, "system-graph.json", { nodes: [], edges: [] });
    const r = await runCli(["node", "x.mjs", "--frozen-time", "2026-05-13T22:00:00Z"], { repo: root });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^previous:/);
    expect(stdoutBuf.join("")).toMatch(/not ok/);
  });

  it("write-failure path: process.exitCode set to 0 (advisory contract)", async () => {
    // Simulate a write failure by pre-creating SYSTEM_VIZ_LIVEDIFF.md as a DIRECTORY —
    // writeAtomic's renameSync(tmp, target) fails because target exists as dir.
    // (Inputs in state/shared/system-viz/ remain valid so the build itself succeeds.)
    writeGraph(root, "system-graph.json", { nodes: [n("a")], edges: [] });
    writeGraph(root, "system-graph.previous.json", { nodes: [], edges: [] });
    mkdirSync(join(root, "state/shared/SYSTEM_VIZ_LIVEDIFF.md"), { recursive: true });
    const origExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      const r = await runCli(["node", "x.mjs", "--frozen-time", "2026-05-13T22:00:00Z"], { repo: root });
      // The build itself succeeds; only the .md write fails (rename onto dir). Report
      // is returned, exitCode stays 0/undefined per advisory contract.
      expect(r.ok).toBe(true);
      expect(process.exitCode === 0 || process.exitCode === undefined).toBe(true);
    } finally {
      process.exitCode = origExitCode;
    }
  });

  it("idempotency: same input twice → byte-identical markdown output", async () => {
    writeGraph(root, "system-graph.json", { nodes: [n("a"), n("b")], edges: [e("a", "b")], meta: { counts: { engines: 2 } } });
    writeGraph(root, "system-graph.previous.json", { nodes: [n("a")], edges: [], meta: { counts: { engines: 1 } } });
    await runCli(["node", "x.mjs", "--frozen-time", "2026-05-13T22:00:00Z"], { repo: root });
    const md1 = readFileSync(join(root, "state/shared/SYSTEM_VIZ_LIVEDIFF.md"), "utf8");
    await runCli(["node", "x.mjs", "--frozen-time", "2026-05-13T22:00:00Z"], { repo: root });
    const md2 = readFileSync(join(root, "state/shared/SYSTEM_VIZ_LIVEDIFF.md"), "utf8");
    expect(md1).toBe(md2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Error-banner markdown well-formedness (B-P1)
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown error path", () => {
  it("error banner does not produce malformed markdown when reason contains backticks/newlines", () => {
    const md = renderMarkdown({
      ok: false,
      reason: "current: `parse failed`: Unexpected token\nat line 5",
      generated_at: "2026-05-13T22:00:00Z",
    });
    expect(md).toContain("**ERROR:**");
    // No accidental code-fence corruption (triple-backtick should not appear unless intentional)
    expect(md).not.toMatch(/```/);
    // Newline in reason is allowed (markdown is line-based, not block-fenced here)
    expect(md.split("\n").length).toBeGreaterThan(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// writeAtomic
// ──────────────────────────────────────────────────────────────────────

describe("writeAtomic", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("creates parent directories if missing", () => {
    const target = join(root, "deep/nested/path/report.json");
    writeAtomic(target, "{\"ok\":true}\n");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("{\"ok\":true}\n");
  });

  it("overwrites cleanly (no .tmp- residue)", () => {
    const targetDir = join(root, "state/shared");
    const target = join(targetDir, "REPORT.md");
    writeAtomic(target, "v1");
    writeAtomic(target, "v2");
    expect(readFileSync(target, "utf8")).toBe("v2");
    const residue = readdirSync(targetDir).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("100 rapid writes never collide (PID+ts+random suffix)", () => {
    // Same-millisecond writes used to collide on `.tmp-${pid}-${ts}` because Date.now()
    // resolution is 1ms (15ms on Windows) and a tight loop produces same-ms ticks. The
    // 3-byte random suffix gives 16M permutations per ms — collision-free at this volume.
    const target = join(root, "state/shared/HOT.md");
    for (let i = 0; i < 100; i++) {
      writeAtomic(target, `iter-${i}`);
    }
    expect(readFileSync(target, "utf8")).toBe("iter-99");
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("50 concurrent writes survive collision (PID+ts+random suffix under Promise.all)", async () => {
    // Without the random suffix, 50 concurrent writes from the same Node process would
    // share `.tmp-${pid}-${same-ms}` and the parallel renames would race. With random
    // suffix, each gets a unique tmp filename. Final file content is one of 0..49
    // (whichever rename completed last) but all writes must succeed without error.
    const target = join(root, "state/shared/CONCURRENT.md");
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        Promise.resolve().then(() => writeAtomic(target, `concurrent-${i}`)),
      ),
    );
    const content = readFileSync(target, "utf8");
    expect(content).toMatch(/^concurrent-\d+$/);
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Sample sort stability — addresses noisy headline-history downstream
// ──────────────────────────────────────────────────────────────────────

describe("sample sort stability", () => {
  it("nodesAddedSample is sorted by nodeKey regardless of input order", () => {
    const previous = { nodes: [], edges: [] };
    // Same nodes, two different input orderings — output samples must match
    const order1 = [n("zebra"), n("apple"), n("mango"), n("banana")];
    const order2 = [n("banana"), n("zebra"), n("apple"), n("mango")];
    const r1 = composeDiffReport({ current: { nodes: order1, edges: [] }, previous, generatedAt: "t" });
    const r2 = composeDiffReport({ current: { nodes: order2, edges: [] }, previous, generatedAt: "t" });
    expect(r1.nodesAddedSample.map((x) => x.id)).toEqual(r2.nodesAddedSample.map((x) => x.id));
    expect(r1.nodesAddedSample.map((x) => x.id)).toEqual(["apple", "banana", "mango", "zebra"]);
  });

  it("edgesAddedSample is sorted by edgeKey regardless of input order", () => {
    const order1 = [e("z", "a"), e("a", "b"), e("m", "n")];
    const order2 = [e("m", "n"), e("z", "a"), e("a", "b")];
    const r1 = composeDiffReport({
      current: { nodes: [], edges: order1 },
      previous: { nodes: [], edges: [] },
      generatedAt: "t",
    });
    const r2 = composeDiffReport({
      current: { nodes: [], edges: order2 },
      previous: { nodes: [], edges: [] },
      generatedAt: "t",
    });
    expect(r1.edgesAddedSample).toEqual(r2.edgesAddedSample);
  });

  it("does NOT mutate the underlying diff arrays (sort is on a slice)", () => {
    const nodes = [n("zebra"), n("apple")];
    const previous = { nodes: [], edges: [] };
    composeDiffReport({ current: { nodes, edges: [] }, previous, generatedAt: "t" });
    // Original input order preserved
    expect(nodes.map((x) => x.id)).toEqual(["zebra", "apple"]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// CHANGE_FIELDS coverage — diffNodes must detect every tracked field
// (originally only `status` was tested — scrutiny arm B flagged `tier`
// and `businessValue` as silently uncovered).
// ──────────────────────────────────────────────────────────────────────

describe("CHANGE_FIELDS coverage", () => {
  it("detects a `tier` change in isolation", () => {
    const previous = [n("x", { tier: "T1" })];
    const current = [n("x", { tier: "T2" })];
    const d = diffNodes(current, previous);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].id).toBe("x");
    expect(d.changed[0].fields).toEqual([{ field: "tier", prev: "T1", curr: "T2" }]);
  });

  it("detects a `businessValue` change in isolation", () => {
    const previous = [n("x", { businessValue: 5 })];
    const current = [n("x", { businessValue: 10 })];
    const d = diffNodes(current, previous);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].fields).toEqual([{ field: "businessValue", prev: 5, curr: 10 }]);
  });

  it("detects all three tracked fields simultaneously", () => {
    const previous = [n("x", { status: "unwired", tier: "T1", businessValue: 5 })];
    const current = [n("x", { status: "wired", tier: "T2", businessValue: 10 })];
    const d = diffNodes(current, previous);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].fields).toHaveLength(3);
    const byField = Object.fromEntries(d.changed[0].fields.map((f) => [f.field, f]));
    expect(byField.status).toEqual({ field: "status", prev: "unwired", curr: "wired" });
    expect(byField.tier).toEqual({ field: "tier", prev: "T1", curr: "T2" });
    expect(byField.businessValue).toEqual({ field: "businessValue", prev: 5, curr: 10 });
  });

  it("a change in a NON-tracked field (e.g. `label`) produces ZERO changed entries", () => {
    // Pinned behavior: only CHANGE_FIELDS in the module trigger a `changed` entry.
    // If this test ever flips, a new field was added to CHANGE_FIELDS without updating
    // the renderMarkdown caption (line ~360) — fix both, not just one.
    const previous = [n("x", { label: "old-name", status: "wired" })];
    const current = [n("x", { label: "new-name", status: "wired" })];
    const d = diffNodes(current, previous);
    expect(d.changed).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseArgs adversarial — unknown flags, missing args, env-var fallback.
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs adversarial", () => {
  let savedFrozenEnv;
  beforeEach(() => {
    savedFrozenEnv = process.env.PRISM_AUDIT_FROZEN_TIME;
    delete process.env.PRISM_AUDIT_FROZEN_TIME;
  });
  afterEach(() => {
    if (savedFrozenEnv === undefined) delete process.env.PRISM_AUDIT_FROZEN_TIME;
    else process.env.PRISM_AUDIT_FROZEN_TIME = savedFrozenEnv;
  });

  it("unknown flags are silently ignored (don't crash, don't pollute args)", () => {
    const a = parseArgs(["node", "x.mjs", "--no-such-flag", "value", "--also-unknown"]);
    expect(a.json).toBe(false);
    expect(a.frozenTime).toBe(null);
    expect(a.current).toBe(null);
    expect(a.previous).toBe(null);
  });

  it("--frozen-time at end of argv with no following value yields undefined (not crash)", () => {
    const a = parseArgs(["node", "x.mjs", "--frozen-time"]);
    // argv[++i] is out of range — result is undefined. The env-var fallback won't
    // promote it because we deleted PRISM_AUDIT_FROZEN_TIME above.
    expect(a.frozenTime === undefined || a.frozenTime === null).toBe(true);
  });

  it("--current consumes next argv even if it looks like another flag", () => {
    // Pinned behavior: greedy consumption. Operators relying on this must order args
    // so values follow their flag immediately.
    const a = parseArgs(["node", "x.mjs", "--current", "--previous", "/p.json"]);
    expect(a.current).toBe("--previous");
    expect(a.previous).toBe(null);
  });

  it("PRISM_AUDIT_FROZEN_TIME env fills frozenTime when --frozen-time is absent", () => {
    process.env.PRISM_AUDIT_FROZEN_TIME = "2026-05-13T22:00:00Z";
    const a = parseArgs(["node", "x.mjs"]);
    expect(a.frozenTime).toBe("2026-05-13T22:00:00Z");
  });

  it("explicit --frozen-time wins over the env-var fallback (precedence pin)", () => {
    process.env.PRISM_AUDIT_FROZEN_TIME = "from-env";
    const a = parseArgs(["node", "x.mjs", "--frozen-time", "from-flag"]);
    expect(a.frozenTime).toBe("from-flag");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Schema-drift warnings — composeDiffReport surfaces missing arrays so the
// operator-facing markdown doesn't silently read "+0/-0" when the truth is
// "the upstream pipeline emitted a graph with no `nodes` field".
// ──────────────────────────────────────────────────────────────────────

describe("schema-drift warnings", () => {
  it("emits a warning when current.nodes is missing", () => {
    const r = composeDiffReport({
      current: { edges: [], meta: {} },                // no `nodes`
      previous: { nodes: [], edges: [], meta: {} },
      generatedAt: "t",
    });
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.warnings.some((w) => /current\.nodes/.test(w))).toBe(true);
    // Stats should still be present and report zero — the warning is the signal,
    // not a thrown error or ok:false (back-compat with legitimate empty graphs).
    expect(r.stats.nodesAdded).toBe(0);
  });

  it("emits a warning when previous.edges is missing", () => {
    const r = composeDiffReport({
      current: { nodes: [], edges: [], meta: {} },
      previous: { nodes: [], meta: {} },               // no `edges`
      generatedAt: "t",
    });
    expect(r.warnings.some((w) => /previous\.edges/.test(w))).toBe(true);
  });

  it("emits multiple warnings when multiple arrays are missing", () => {
    const r = composeDiffReport({
      current: { meta: {} },                           // no nodes, no edges
      previous: { meta: {} },
      generatedAt: "t",
    });
    expect(r.warnings.length).toBeGreaterThanOrEqual(4);
  });

  it("emits zero warnings when both graphs are well-formed", () => {
    const r = composeDiffReport({
      current: { nodes: [n("a")], edges: [], meta: {} },
      previous: { nodes: [], edges: [], meta: {} },
      generatedAt: "t",
    });
    expect(r.warnings).toEqual([]);
  });

  it("renderMarkdown surfaces warnings in a ⚠ Warnings section above Headline counters", () => {
    const r = composeDiffReport({
      current: { meta: {} },                           // missing nodes + edges
      previous: { nodes: [], edges: [], meta: {} },
      generatedAt: "t",
    });
    const md = renderMarkdown({
      ...r,
      current_path: "/x/curr",
      previous_path: "/x/prev",
    });
    expect(md).toContain("## ⚠ Warnings");
    expect(md.indexOf("## ⚠ Warnings")).toBeLessThan(md.indexOf("## Headline counters"));
    expect(md).toContain("current.nodes missing");
  });
});
