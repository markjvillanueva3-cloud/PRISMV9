/**
 * expand-system-viz-l12-files.test.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
 *
 * Real-value behavioural tests for the 8 exported pure helpers + key
 * structural invariants from the per-file-scrutiny gate. Uses plain
 * node:assert because the helpers/ vitest harness has a pre-existing
 * infra bug (same workaround as mirror-c-to-h.test.mjs +
 * add-ollama-skill-policy-frontmatter.test.mjs).
 *
 * Run: node H:/prism/scripts/expand-system-viz-l12-files.test.mjs
 */
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  shortHash,
  canonicalRel,
  namespaceForRoot,
  makeFileNodeId,
  makeBundleNodeId,
  makeSourceNodeId,
  classifyDir,
  walkDir,
  buildAugment,
  mergeIntoGraph,
} from "./expand-system-viz-l12-files.mjs";

let passed = 0;
let failed = 0;
const failures = [];

function it(name, fn) {
  try { fn(); passed++; process.stdout.write("."); }
  catch (err) { failed++; failures.push({ name, err }); process.stdout.write("F"); }
}

// ---------- helpers for tests ----------
// Claude's harness sets os.tmpdir() to H:/prism/.cache/temp/* which is
// (correctly) in the production SKIP_PATH_SUBSTRINGS list. Tests need a
// tmp space OUTSIDE that, so we use H:/prism/.cache/test-tmp/ instead.
const TEST_TMP_ROOT = "H:/prism/.cache/test-tmp";
try { fs.mkdirSync(TEST_TMP_ROOT, { recursive: true }); } catch { /* exists */ }
function makeTmpDir(prefix = "viz-l12-test-") {
  const d = fs.mkdtempSync(path.join(TEST_TMP_ROOT, prefix));
  return d.replace(/\\/g, "/");
}
function writeTree(root, tree) {
  for (const [rel, content] of Object.entries(tree)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}
function makeMinimalGraph() {
  // Mimics the existing system-graph.json shape AFTER L0..L10 generation.
  return {
    schemaVersion: "2.1.0",
    generatedAt: new Date().toISOString(),
    meta: { totals: { nodes: 2, edges: 1, layers: 11 } },
    layers: [
      { id: "L9", name: "Filesystem", y: -9.0, color: "#94a3b8" },
      { id: "L10", name: "Vault", y: -11.0, color: "#a855f7" },
    ],
    nodes: [
      { id: "fs.prism", layer: "L9", subgroup: "fs", label: "prism", color: "#94a3b8" },
      { id: "vault.mem.foo", layer: "L10", subgroup: "feedback", label: "foo", color: "#a855f7" },
    ],
    edges: [{ from: "vault.mem.foo", to: "fs.prism", type: "in", status: "active", intensity: 0.3 }],
  };
}

// ===========================================================================
// shortHash
// ===========================================================================
it("shortHash returns 12-char hex deterministically", () => {
  const a = shortHash("foo");
  assert.equal(a.length, 12);
  assert.match(a, /^[0-9a-f]{12}$/);
  assert.equal(shortHash("foo"), a);
});
it("shortHash distinguishes distinct strings", () => {
  assert.notEqual(shortHash("foo"), shortHash("bar"));
  assert.notEqual(shortHash("prism::a.ts"), shortHash("prism::b.ts"));
});
it("shortHash coerces non-string input", () => {
  assert.equal(shortHash(123).length, 12);
  assert.equal(shortHash(null).length, 12);
});
it("shortHash adversarial: empty string + undefined + objects", () => {
  // P1 fix from reviewer B: lock adversarial-input contract so refactors
  // that add .trim() / .toLowerCase() don't silently break null-safety.
  assert.equal(shortHash("").length, 12, "empty string hashes");
  assert.equal(shortHash(undefined).length, 12, "undefined coerces to 'undefined' string");
  assert.equal(shortHash({}).length, 12, "object coerces via String()");
});

// ===========================================================================
// canonicalRel
// ===========================================================================
it("canonicalRel strips walkRoot prefix (forward slash)", () => {
  assert.equal(canonicalRel("H:/prism/src/a.ts", "H:/prism"), "src/a.ts");
});
it("canonicalRel normalizes Windows backslash input", () => {
  assert.equal(canonicalRel("H:\\prism\\src\\a.ts", "H:/prism"), "src/a.ts");
  assert.equal(canonicalRel("H:/prism/src/a.ts", "H:\\prism"), "src/a.ts");
});
it("canonicalRel handles trailing-slash walkRoot", () => {
  assert.equal(canonicalRel("H:/prism/x.md", "H:/prism/"), "x.md");
});
it("canonicalRel returns '' for path === walkRoot", () => {
  assert.equal(canonicalRel("H:/prism", "H:/prism"), "");
});
it("canonicalRel returns null for path outside walkRoot (no silent fallthrough)", () => {
  assert.equal(canonicalRel("H:/Tools/x", "H:/prism"), null);
  assert.equal(canonicalRel("H:/prismother/x", "H:/prism"), null); // prefix match without trailing slash
});
it("canonicalRel adversarial: null + undefined coerce safely", () => {
  // P1 fix from reviewer B: lock null-safety contract.
  // null/undefined absPath coerce via String() and won't match any walkRoot
  // unless that walkRoot is the literal string "null"/"undefined" — return null.
  assert.equal(canonicalRel(null, "H:/prism"), null, "null absPath");
  assert.equal(canonicalRel(undefined, "H:/prism"), null, "undefined absPath");
});
it("namespaceForRoot adversarial: empty string + non-path inputs", () => {
  // P1 fix from reviewer B: empty string returns ".." (path.basename of "")
  // is "" — locked here so a refactor adding .toLowerCase or .trim won't
  // change this contract silently.
  assert.equal(namespaceForRoot(""), "", "empty string");
  assert.equal(namespaceForRoot("/"), "", "bare slash");
});

// ===========================================================================
// namespaceForRoot — worktree canonicalization
// ===========================================================================
it("namespaceForRoot collapses prism + prism-* to shared 'prism' namespace", () => {
  assert.equal(namespaceForRoot("H:/prism"), "prism");
  assert.equal(namespaceForRoot("H:/prism-cad-complete"), "prism");
  assert.equal(namespaceForRoot("H:/prism-foo"), "prism");
  assert.equal(namespaceForRoot("H:/prism-intel-p8"), "prism");
});
it("namespaceForRoot keeps non-prism roots distinct", () => {
  assert.equal(namespaceForRoot("H:/.claude"), ".claude");
  assert.equal(namespaceForRoot("H:/Tools"), "Tools");
  assert.equal(namespaceForRoot("H:/prism-backups"), "prism"); // intentional: shares canonicals with main; docstring states prism-* family
});
it("namespaceForRoot tolerates trailing slash + backslash", () => {
  assert.equal(namespaceForRoot("H:/prism/"), "prism");
  assert.equal(namespaceForRoot("H:\\prism\\"), "prism");
});

// ===========================================================================
// makeFileNodeId + makeBundleNodeId + makeSourceNodeId
// ===========================================================================
it("makeFileNodeId is deterministic same-namespace-same-path", () => {
  assert.equal(makeFileNodeId("prism", "src/a.ts"), makeFileNodeId("prism", "src/a.ts"));
});
it("makeFileNodeId differs across namespaces (no merge collision)", () => {
  assert.notEqual(makeFileNodeId("prism", "src/a.ts"), makeFileNodeId(".claude", "src/a.ts"));
});
it("makeFileNodeId differs across paths (no path collision)", () => {
  assert.notEqual(makeFileNodeId("prism", "src/a.ts"), makeFileNodeId("prism", "src/b.ts"));
});
it("makeFileNodeId id shape is 'fs.file.<12hex>'", () => {
  assert.match(makeFileNodeId("prism", "x.ts"), /^fs\.file\.[0-9a-f]{12}$/);
});
it("makeBundleNodeId id shape is 'fs.bundle.<12hex>'", () => {
  assert.match(makeBundleNodeId("prism", "node_modules/foo"), /^fs\.bundle\.[0-9a-f]{12}$/);
});
it("makeSourceNodeId includes basename so different walk roots distinguish", () => {
  const a = makeSourceNodeId("H:/prism");
  const b = makeSourceNodeId("H:/prism-foo");
  assert.notEqual(a, b);
  assert.ok(a.endsWith(".prism"), `expected ends with .prism: ${a}`);
  assert.ok(b.endsWith(".prism-foo"), `expected ends with .prism-foo: ${b}`);
});

// ===========================================================================
// classifyDir — bundle-vs-individual heuristic
// ===========================================================================
it("classifyDir empty → individual/empty", () => {
  assert.deepEqual(classifyDir([], {}), { mode: "individual", reason: "empty" });
});
it("classifyDir at-threshold (500) → bundle", () => {
  const files = Array.from({ length: 500 }, (_, i) => ({ ext: ".ts", name: `f${i}.ts` }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "bundle");
  assert.match(v.reason, /count>=500/);
});
it("classifyDir below-threshold normal → individual", () => {
  const files = Array.from({ length: 50 }, (_, i) => ({ ext: ".ts" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "individual");
  assert.equal(v.reason, "normal");
});
it("classifyDir binary-heavy 100% at 25 files → bundle", () => {
  const files = Array.from({ length: 25 }, () => ({ ext: ".png" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "bundle");
  assert.match(v.reason, /binary-heavy/);
});
it("classifyDir binary-heavy below floor (5 files) → individual", () => {
  // 5 < BINARY_HEAVY_MIN_FILES (20). Even 100% binary should NOT bundle.
  const files = Array.from({ length: 5 }, () => ({ ext: ".png" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "individual");
});
it("classifyDir binary-heavy below ratio (50%) → individual", () => {
  const files = Array.from({ length: 30 }, (_, i) => ({ ext: i < 15 ? ".png" : ".ts" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "individual");
});
it("classifyDir data-heavy (.json) at 35 files → bundle (NOT binary-heavy)", () => {
  // 35 files, 100% .json → data-heavy ≥ 70% AND ≥ 30 → bundle.
  // .json is in DATA_HEAVY_EXTS but NOT BINARY_EXTS — so we expect the
  // data-heavy reason label, not the binary-heavy one. (.pdf is in BOTH;
  // for it the binary-heavy check fires first and labels accordingly.)
  const files = Array.from({ length: 35 }, () => ({ ext: ".json" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "bundle", `expected bundle: ${JSON.stringify(v)}`);
  assert.match(v.reason, /data-heavy/, `expected data-heavy reason, got: ${v.reason}`);
});
it("classifyDir mixed .json + .log + .md (data-heavy mix) at 40 files → bundle", () => {
  // Realistic mix: state/logs/docs subdirectory. All are data-heavy exts.
  const files = [
    ...Array.from({ length: 15 }, () => ({ ext: ".json" })),
    ...Array.from({ length: 10 }, () => ({ ext: ".log" })),
    ...Array.from({ length: 15 }, () => ({ ext: ".md" })),
  ];
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "bundle");
  assert.match(v.reason, /data-heavy/);
});
it("classifyDir data-heavy below floor (15 files) → individual", () => {
  // Below DATA_HEAVY_MIN_FILES floor (30) — should NOT bundle even at 100% data.
  const files = Array.from({ length: 15 }, () => ({ ext: ".json" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "individual");
});
it("classifyDir code-heavy (mostly .ts/.mjs) stays individual even at 40 files", () => {
  // 40 .ts files — not data-heavy, not binary-heavy, not over count threshold.
  // Should stay individual (these are valuable in the graph).
  const files = Array.from({ length: 40 }, () => ({ ext: ".ts" }));
  const v = classifyDir(files, { bundleThreshold: 500 });
  assert.equal(v.mode, "individual", `code-heavy dirs must NOT bundle: ${JSON.stringify(v)}`);
});
it("classifyDir custom bundleThreshold respected", () => {
  const files = Array.from({ length: 10 }, () => ({ ext: ".ts" }));
  assert.equal(classifyDir(files, { bundleThreshold: 10 }).mode, "bundle");
  assert.equal(classifyDir(files, { bundleThreshold: 11 }).mode, "individual");
});

// ===========================================================================
// walkDir — filesystem traversal
// ===========================================================================
it("walkDir collects files at expected relpaths", () => {
  const root = makeTmpDir();
  try {
    writeTree(root, {
      "a.ts": "a",
      "src/b.ts": "b",
      "src/sub/c.md": "c",
    });
    const out = walkDir(root, {});
    const rels = out.files.map((f) => f.rel).sort();
    assert.deepEqual(rels, ["a.ts", "src/b.ts", "src/sub/c.md"]);
    assert.equal(out.stats.filesWalked, 3);
    assert.ok(out.stats.dirsWalked >= 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
it("walkDir skips SKIP_DIRS (node_modules, __pycache__, .git)", () => {
  const root = makeTmpDir();
  try {
    writeTree(root, {
      "keep.ts": "x",
      "node_modules/foo/bar.js": "skip",
      "__pycache__/baz.pyc": "skip",
      ".git/objects/xx/yy": "skip",
    });
    const out = walkDir(root, {});
    const rels = out.files.map((f) => f.rel).sort();
    assert.deepEqual(rels, ["keep.ts"]);
    assert.ok(out.stats.skipped >= 3, `expected ≥3 skipped, got ${out.stats.skipped}`);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
it("walkDir maxFiles cap → truncated + partial dir NOT recorded (P1-4 fix)", () => {
  const root = makeTmpDir();
  try {
    writeTree(root, {
      "manyDir/a.ts": "1",
      "manyDir/b.ts": "2",
      "manyDir/c.ts": "3",
      "manyDir/d.ts": "4",
      "manyDir/e.ts": "5",
    });
    const out = walkDir(root, { maxFiles: 3 });
    assert.equal(out.stats.truncated, true);
    assert.equal(out.stats.filesWalked, 3);
    // P1-4 invariant: a dir we only partially observed must NOT appear in
    // dirs Map (would mis-feed classifyDir with partial data).
    assert.equal(out.dirs.has("manyDir"), false, "partial dir leaked into dirs Map");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
it("walkDir captures size + ext + isBinary correctly", () => {
  const root = makeTmpDir();
  try {
    writeTree(root, {
      "x.ts": "hello world",
      "y.png": Buffer.alloc(100, 0),
    });
    const out = walkDir(root, {});
    const x = out.files.find((f) => f.name === "x.ts");
    const y = out.files.find((f) => f.name === "y.png");
    assert.equal(x.ext, ".ts");
    assert.equal(x.isBinary, false);
    assert.equal(x.size, 11);
    assert.equal(y.ext, ".png");
    assert.equal(y.isBinary, true);
    assert.equal(y.size, 100);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
it("walkDir handles missing root gracefully (no throw, 0 files)", () => {
  const out = walkDir("H:/__NONEXISTENT_PATH_FOR_TEST__", {});
  assert.equal(out.stats.filesWalked, 0);
});

// ===========================================================================
// buildAugment — node/edge construction
// ===========================================================================
it("buildAugment emits L9 source + L12 file for tiny dir", () => {
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  const sourceNodes = aug.nodes.filter((n) => n.kind === "fs.source");
  assert.equal(sourceNodes.length, 1, "exactly one source node");
  // P0-2 fix: source node on L9, NOT L11.
  assert.equal(sourceNodes[0].layer, "L9", "source must be L9, not L11");
  const fileNodes = aug.nodes.filter((n) => n.kind === "fs.file");
  assert.equal(fileNodes.length, 1);
  assert.equal(fileNodes[0].layer, "L12");
  // P0-4 fix: walkRoot field present on file node.
  assert.equal(fileNodes[0].walkRoot, "H:/prism");
});
it("buildAugment emits L11 bundle for >500-file dir, NO L12 files for bundled dir", () => {
  const bigList = Array.from({ length: 600 }, (_, i) => ({ rel: `bin/f${i}.bin`, dir: "bin", name: `f${i}.bin`, ext: ".bin", size: 1, isBinary: true }));
  const walked = {
    files: bigList,
    dirs: new Map([["bin", bigList]]),
    stats: { filesWalked: 600, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  const bundleNodes = aug.nodes.filter((n) => n.kind === "fs.bundle");
  const fileNodes = aug.nodes.filter((n) => n.kind === "fs.file");
  assert.equal(bundleNodes.length, 1, "exactly one bundle node for the bin dir");
  assert.equal(bundleNodes[0].layer, "L11");
  assert.equal(bundleNodes[0].fileCount, 600);
  assert.equal(fileNodes.length, 0, "no L12 file nodes for a bundled dir");
  // Coverage: filesInBundles should = 600.
  assert.equal(aug.summary.filesInBundles, 600);
  assert.equal(aug.summary.filesAsNodes, 0);
});
it("buildAugment coverage ratio is 1.0 when every file represented", () => {
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  assert.equal(aug.summary.coverageRatio, 1.0);
});
it("buildAugment determinism: same input → same node ids", () => {
  const files = [
    { rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false },
    { rel: "src/b.ts", dir: "src", name: "b.ts", ext: ".ts", size: 20, isBinary: false },
  ];
  const walked = {
    files,
    dirs: new Map([["", [files[0]]], ["src", [files[1]]]]),
    stats: { filesWalked: 2, dirsWalked: 2, skipped: 0, truncated: false },
  };
  const a = buildAugment(walked, "H:/prism", {});
  const b = buildAugment(walked, "H:/prism", {});
  const aIds = a.nodes.map((n) => n.id).sort();
  const bIds = b.nodes.map((n) => n.id).sort();
  assert.deepEqual(aIds, bIds);
});

// ===========================================================================
// mergeIntoGraph — the heart of the per-file-scrutiny gate
// ===========================================================================
it("mergeIntoGraph preserves L0-L10 nodes (regression guard)", () => {
  const graph = makeMinimalGraph();
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  const merged = mergeIntoGraph(graph, aug);
  // The existing L9/L10 nodes must survive.
  assert.ok(merged.nodes.some((n) => n.id === "fs.prism"), "L9 fs.prism survives");
  assert.ok(merged.nodes.some((n) => n.id === "vault.mem.foo"), "L10 vault.mem.foo survives");
});
it("mergeIntoGraph idempotent on same-root re-walk (no duplicate counts)", () => {
  const graph = makeMinimalGraph();
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug1 = buildAugment(walked, "H:/prism", {});
  const m1 = mergeIntoGraph(graph, aug1);
  const aug2 = buildAugment(walked, "H:/prism", {});
  const m2 = mergeIntoGraph(m1, aug2);
  // Idempotency: node count after 2nd merge = after 1st merge.
  assert.equal(m2.nodes.length, m1.nodes.length, `expected same node count, got ${m1.nodes.length} → ${m2.nodes.length}`);
  // Edge count too.
  assert.equal(m2.edges.length, m1.edges.length);
});
it("mergeIntoGraph cross-root canonical: H:/prism + H:/prism-foo share fileId, ONE node, TWO edges", () => {
  const graph = makeMinimalGraph();
  const fileRec = { rel: "src/a.ts", dir: "src", name: "a.ts", ext: ".ts", size: 10, isBinary: false };
  const walked = {
    files: [fileRec],
    dirs: new Map([["src", [fileRec]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug1 = buildAugment(walked, "H:/prism", {});
  const aug2 = buildAugment(walked, "H:/prism-foo", {});
  // Sanity: the file-node id is the SAME from both walks (canonical dedup).
  const f1 = aug1.nodes.find((n) => n.kind === "fs.file");
  const f2 = aug2.nodes.find((n) => n.kind === "fs.file");
  assert.equal(f1.id, f2.id, "canonical file ids must match across worktrees");
  // Source ids must differ (one source per walkRoot).
  const s1 = aug1.nodes.find((n) => n.kind === "fs.source");
  const s2 = aug2.nodes.find((n) => n.kind === "fs.source");
  assert.notEqual(s1.id, s2.id);

  // Merge both.
  const m1 = mergeIntoGraph(graph, aug1);
  const m2 = mergeIntoGraph(m1, aug2);
  // EXACTLY ONE canonical file node (cross-root dedup invariant).
  const canonical = m2.nodes.filter((n) => n.id === f1.id);
  assert.equal(canonical.length, 1, `expected 1 canonical file node, got ${canonical.length}`);
  // TWO sources (one per walkRoot).
  const sources = m2.nodes.filter((n) => n.kind === "fs.source");
  assert.equal(sources.length, 2);
  // The canonical file must have edges to BOTH sources.
  const edgesFromCanonical = m2.edges.filter((e) => e.from === f1.id);
  const toIds = new Set(edgesFromCanonical.map((e) => e.to));
  assert.ok(toIds.has(s1.id), "edge to source1 missing");
  assert.ok(toIds.has(s2.id), "edge to source2 missing");
});
it("mergeIntoGraph declares L11 + L12 layers exactly once even after multiple merges", () => {
  const graph = makeMinimalGraph();
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  let m = mergeIntoGraph(graph, aug);
  m = mergeIntoGraph(m, aug);
  m = mergeIntoGraph(m, aug);
  const l11Count = m.layers.filter((l) => l.id === "L11").length;
  const l12Count = m.layers.filter((l) => l.id === "L12").length;
  assert.equal(l11Count, 1, `L11 declared ${l11Count} times`);
  assert.equal(l12Count, 1, `L12 declared ${l12Count} times`);
});
it("mergeIntoGraph bumps schemaVersion 2.1.0 → 2.2.0", () => {
  const graph = makeMinimalGraph(); // starts at 2.1.0
  // P1 fix from reviewer B: assert the precondition explicitly + with a
  // clear message so a future refactor that changes the fixture to "2.2.0"
  // doesn't make this assertion vacuously pass.
  assert.equal(graph.schemaVersion, "2.1.0", "fixture precondition: starts at 2.1.0");
  assert.equal(graph.meta.schemaVersion, undefined, "fixture precondition: meta.schemaVersion absent");
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  const merged = mergeIntoGraph(graph, aug);
  // The bump lands on meta.schemaVersion (downstream consumers key here);
  // the top-level field can stay at 2.1.0 for backward-read compat.
  assert.equal(merged.meta.schemaVersion, "2.2.0", "bump fired");
});
it("mergeIntoGraph fsCoverage overwrite refreshes lastWalkedAt", () => {
  // P1 fix from reviewer B: stale-timestamp regression guard.
  // Same walkRoot merged twice → second fsCoverage entry's lastWalkedAt
  // must be > first's. Use a busy-wait until Date.now() ticks past a clear
  // millisecond boundary (kept synchronous because the it() harness above
  // doesn't await Promises — async would float).
  const graph = makeMinimalGraph();
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug1 = buildAugment(walked, "H:/prism", {});
  const m1 = mergeIntoGraph(graph, aug1);
  const t1 = m1.meta.fsCoverage["prism::H:/prism"].lastWalkedAt;
  // Busy-wait ≥2ms so a fresh new Date().toISOString() in the second merge
  // produces a strictly-greater string. ISO-8601 strings compare lexically
  // when they share the same prefix (YYYY-MM-DDTHH:MM:SS.sss…Z).
  const waitUntil = Date.now() + 2;
  while (Date.now() <= waitUntil) { /* spin */ }
  const aug2 = buildAugment(walked, "H:/prism", {});
  const m2 = mergeIntoGraph(m1, aug2);
  const t2 = m2.meta.fsCoverage["prism::H:/prism"].lastWalkedAt;
  assert.ok(t2 > t1, `fsCoverage.lastWalkedAt must refresh: t1=${t1} t2=${t2}`);
});
it("mergeIntoGraph records dedupedAgainstCanonical on cross-root sequential merge", () => {
  // P1 fix from reviewer B: the headline cross-root feature (canonical dedup)
  // exposes a counter via fsCoverage; lock that the counter is populated.
  const graph = makeMinimalGraph();
  const fileRec = { rel: "src/a.ts", dir: "src", name: "a.ts", ext: ".ts", size: 10, isBinary: false };
  const walked = {
    files: [fileRec],
    dirs: new Map([["src", [fileRec]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug1 = buildAugment(walked, "H:/prism", {});
  const aug2 = buildAugment(walked, "H:/prism-foo", {});
  const m1 = mergeIntoGraph(graph, aug1);
  const m2 = mergeIntoGraph(m1, aug2);
  // Walk #1: 0 canonicals existed before, dedupedAgainstCanonical = 0.
  const cov1 = m2.meta.fsCoverage["prism::H:/prism"];
  // Walk #2: 1 canonical (the file) already existed from walk #1, so the
  // file-node is deduped; the source node is unique so NOT deduped.
  // Net: dedupedAgainstCanonical >= 1 for the second walk.
  const cov2 = m2.meta.fsCoverage["prism::H:/prism-foo"];
  assert.equal(typeof cov1.dedupedAgainstCanonical, "number", "first walk records counter");
  assert.equal(typeof cov2.dedupedAgainstCanonical, "number", "second walk records counter");
  assert.equal(cov1.dedupedAgainstCanonical, 0, "first walk: no canonicals to dedup against");
  assert.ok(cov2.dedupedAgainstCanonical >= 1, `second walk should dedup ≥1 canonical: got ${cov2.dedupedAgainstCanonical}`);
});
it("mergeIntoGraph records fsCoverage in meta for /loop progress tracking", () => {
  const graph = makeMinimalGraph();
  const walked = {
    files: [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }],
    dirs: new Map([["", [{ rel: "a.ts", dir: "", name: "a.ts", ext: ".ts", size: 10, isBinary: false }]]]),
    stats: { filesWalked: 1, dirsWalked: 1, skipped: 0, truncated: false },
  };
  const aug = buildAugment(walked, "H:/prism", {});
  const merged = mergeIntoGraph(graph, aug);
  assert.ok(merged.meta.fsCoverage, "fsCoverage block present");
  const cov = merged.meta.fsCoverage["prism::H:/prism"];
  assert.ok(cov, `fsCoverage key 'prism::H:/prism' present (got: ${Object.keys(merged.meta.fsCoverage)})`);
  assert.equal(cov.filesWalked, 1);
  assert.equal(cov.coverageRatio, 1.0);
  assert.ok(cov.lastWalkedAt, "lastWalkedAt timestamp recorded");
});

// ===========================================================================
// End-to-end walk + augment + merge round-trip (file-system integration)
// ===========================================================================
it("end-to-end: walkDir → buildAugment → mergeIntoGraph on a real temp tree", () => {
  const root = makeTmpDir();
  try {
    writeTree(root, {
      "a.ts": "x",
      "src/b.ts": "y",
      "src/c.ts": "z",
    });
    const walked = walkDir(root, {});
    assert.equal(walked.stats.filesWalked, 3);
    const aug = buildAugment(walked, root, {});
    assert.equal(aug.summary.filesWalked, 3);
    assert.equal(aug.summary.coverageRatio, 1.0);
    const graph = makeMinimalGraph();
    const merged = mergeIntoGraph(graph, aug);
    // Counts: 2 original L9/L10 + 1 L9 source + 3 L12 files = 6 nodes total.
    assert.equal(merged.nodes.length, 6);
    // Layers declaration: original 2 + L11 + L12 = 4 (we only add layers we
    // need; even though no bundle was emitted this time, L11 is still
    // declared for forward consumers — keeps schema stable across runs).
    assert.equal(merged.layers.length, 4);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// ===========================================================================
// Report
// ===========================================================================
process.stdout.write(`\n\n${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write("\nFailures:\n");
  for (const f of failures) process.stdout.write(`  ✗ ${f.name}\n    ${f.err && f.err.message}\n`);
  process.exit(1);
}
process.exit(0);
