// scripts/lib/vault-precheck-lib.test.mjs
// Real-value tests (R9) for the Gap-8 vault-precheck shared lib. Pure functions with injected
// fs impls -> deterministic, no live-fs dependency.

import test from "node:test";
import assert from "node:assert/strict";
import {
  tokenize, listFiles, extractExcerpt, buildEntries, scoreEntry, loadSidecar,
  sidecarStaleness, SCAN_TARGETS, BODY_SCORE_CAP,
} from "./vault-precheck-lib.mjs";

// --- SCAN_TARGETS (cross-root config) --------------------------------------
test("SCAN_TARGETS: covers knowledge/ AND state/shared/specs", () => {
  const roots = SCAN_TARGETS.map((t) => t.root);
  assert.ok(roots.some((r) => r.endsWith("knowledge")), "knowledge root present");
  assert.ok(roots.some((r) => r.endsWith("state/shared") || r.endsWith("state\\shared")), "specs root present");
  const specsTarget = SCAN_TARGETS.find((t) => t.buckets.includes("specs"));
  assert.ok(specsTarget, "a target scans the 'specs' bucket");
});

// --- tokenize --------------------------------------------------------------
test("tokenize: lowercases, splits, drops <3-char + stopwords", () => {
  assert.deepEqual(tokenize("Okuma OSP Threading"), ["okuma", "osp", "threading"]);
  assert.deepEqual(tokenize("the and for"), [], "pure stopwords -> []");
  assert.deepEqual(tokenize("a bc"), [], "all <3-char -> []");
  assert.deepEqual(tokenize(""), [], "empty -> []");
  assert.deepEqual(tokenize(null), [], "null -> []");
  assert.ok(!tokenize("use the gsd protocol").includes("use"), "'use' is a stopword");
});

// --- extractExcerpt --------------------------------------------------------
test("extractExcerpt: strips frontmatter, collapses whitespace, caps length", () => {
  const md = "---\nname: foo\ntype: reference\n---\n\nOkuma OSP threading uses the G71 cycle.\n\nMore body.";
  const ex = extractExcerpt(md, 40);
  assert.ok(!ex.includes("name: foo"), "YAML frontmatter stripped");
  assert.ok(ex.startsWith("Okuma OSP threading"), "body starts after frontmatter");
  assert.ok(ex.length <= 40, "capped at 40");
  assert.equal(extractExcerpt(null), "", "null -> ''");
  assert.equal(extractExcerpt("   spaced   out   ", 100), "spaced out", "whitespace collapsed");
  // no frontmatter -> whole body (capped)
  assert.equal(extractExcerpt("plain body text", 100), "plain body text");
});

// --- scoreEntry ------------------------------------------------------------
test("scoreEntry: basename strong (+2 exact / +1 prefix), excerpt weak (+1), body NOT double-counted, capped", () => {
  // basename exact match
  assert.equal(scoreEntry({ basename: "okuma_threading", excerpt: "" }, ["okuma"]), 2, "exact basename token +2");
  // prefix
  assert.equal(scoreEntry({ basename: "threading_guide", excerpt: "" }, ["thread"]), 1, "prefix basename +1");
  // body recall: token in excerpt but not basename -> +1
  assert.equal(scoreEntry({ basename: "dev_protocol", excerpt: "okuma osp threading g71" }, ["okuma"]), 1, "body-only hit +1");
  // NOT double-counted: token in BOTH basename and excerpt -> only the +2 basename
  assert.equal(scoreEntry({ basename: "okuma_guide", excerpt: "okuma okuma okuma" }, ["okuma"]), 2, "basename hit not re-counted in body");
  // body cap: many body hits capped at BODY_SCORE_CAP
  const manyBody = scoreEntry({ basename: "x", excerpt: "aaa bbb ccc ddd eee" }, ["aaa", "bbb", "ccc", "ddd", "eee"]);
  assert.equal(manyBody, BODY_SCORE_CAP, "body contribution capped");
  // legacy parity: no excerpt -> basename-only behaves as the old hook
  assert.equal(scoreEntry({ basename: "gsd_quick", excerpt: "" }, ["gsd", "quick"]), 4, "two exact basename tokens +2 each");
  // guards
  assert.equal(scoreEntry(null, ["x"]), 0, "null entry -> 0");
  assert.equal(scoreEntry({ basename: "x" }, "notarray"), 0, "non-array tokens -> 0");
});

// --- listFiles -------------------------------------------------------------
test("listFiles: filters md/json/txt, caps, fail-soft on missing dir", () => {
  const fakeEntries = [
    { name: "a.md", isFile: () => true },
    { name: "b.json", isFile: () => true },
    { name: "c.png", isFile: () => true },
    { name: "sub", isFile: () => false },
  ];
  const files = listFiles("/fake", { existsImpl: () => true, readdirImpl: () => fakeEntries });
  assert.equal(files.length, 2, "only .md + .json kept (.png + dir excluded)");
  assert.deepEqual(listFiles("/missing", { existsImpl: () => false }), [], "missing dir -> []");
});

// --- buildEntries ----------------------------------------------------------
test("buildEntries: extracts basename+excerpt per file, tracks youngest mtime", () => {
  const filesByDir = { "claude-md": ["doc.md"], "specs": ["audit.md"] };
  const r = buildEntries({
    // multi-root: knowledge/ AND the specs root, repo-relative paths
    targets: [
      { root: "/repo/knowledge", buckets: ["claude-md"] },
      { root: "/repo/state/shared", buckets: ["specs"] },
    ],
    repoRoot: "/repo",
    listImpl: (dir) => {
      const bucket = dir.split(/[\\/]/).pop();
      return (filesByDir[bucket] || []).map((f) => `${dir}/${f}`);
    },
    readFileImpl: () => "---\nx: 1\n---\nBody content here.",
    statImpl: () => ({ mtimeMs: 12345 }),
  });
  const cm = r.entries.find((e) => e.bucket === "claude-md");
  assert.ok(cm, "claude-md entry built");
  assert.equal(cm.basename, "doc", "basename lowercased, ext stripped");
  assert.equal(cm.excerpt, "Body content here.", "excerpt frontmatter-stripped");
  assert.equal(cm.relPath, "knowledge/claude-md/doc.md", "relPath is REPO-relative (knowledge root)");
  // CROSS-ROOT (Gap 8 cross-root): the specs root also contributes, repo-relative
  const sp = r.entries.find((e) => e.bucket === "specs");
  assert.ok(sp, "specs entry built from the second root");
  assert.equal(sp.relPath, "state/shared/specs/audit.md", "specs relPath is REPO-relative (specs root)");
  assert.equal(r.youngestMtimeMs, 12345, "youngest mtime tracked");
  assert.equal(r.entries.length, 2, "one entry per existing file across both roots");
});

// --- loadSidecar -----------------------------------------------------------
test("loadSidecar: present+valid -> doc; missing/malformed/wrong-shape -> null", () => {
  const valid = JSON.stringify({ schemaVersion: 1, sourceMtimeMs: 1, entries: [{ basename: "x", excerpt: "y" }] });
  assert.ok(loadSidecar({ existsImpl: () => true, readFileImpl: () => valid }), "valid sidecar loads");
  assert.equal(loadSidecar({ existsImpl: () => false }), null, "missing -> null");
  assert.equal(loadSidecar({ existsImpl: () => true, readFileImpl: () => "{bad json" }), null, "malformed -> null");
  assert.equal(loadSidecar({ existsImpl: () => true, readFileImpl: () => '{"entries":"notarray"}' }), null, "wrong-shape -> null");
});

// --- sidecarStaleness (regen decision) -------------------------------------
test("sidecarStaleness: absent -> regen; dir newer than sidecar -> stale; else fresh", () => {
  // absent sidecar
  assert.deepEqual(
    sidecarStaleness({ existsImpl: () => false }),
    { regen: true, reason: "absent" },
    "absent sidecar -> regen",
  );
  // sidecar exists, all dirs older -> fresh
  const fresh = sidecarStaleness({
    existsImpl: () => true,
    statImpl: (p) => ({ mtimeMs: p.includes("vault-precheck-sidecar") ? 1000 : 500 }),
  });
  assert.deepEqual(fresh, { regen: false, reason: "fresh" }, "sidecar newer than all dirs -> fresh");
  // a dir newer than the sidecar -> stale
  const stale = sidecarStaleness({
    existsImpl: () => true,
    statImpl: (p) => ({ mtimeMs: p.includes("vault-precheck-sidecar") ? 1000 : 5000 }),
  });
  assert.deepEqual(stale, { regen: true, reason: "stale" }, "a SCAN_DIR newer than the sidecar -> stale");
});
