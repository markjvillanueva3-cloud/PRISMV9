// scripts/lib/vault-hints.test.mjs
// Real-value tests (R9) for the Gap-6 one-shot grounding leaf. Pure functions with
// injected list/read impls -> deterministic, no live-fs dependency.

import test from "node:test";
import assert from "node:assert/strict";
import {
  tokenizeQuery,
  listMemoryFiles,
  scoreByFilename,
  getVaultHints,
  formatVaultHintsBlock,
} from "./vault-hints.mjs";

// --- tokenizeQuery ---------------------------------------------------------
test("tokenizeQuery: lowercases, splits non-alnum, drops <3-char tokens", () => {
  assert.deepEqual(tokenizeQuery("Okuma G71 Lathe-Threading"), ["okuma", "g71", "lathe", "threading"]);
  assert.deepEqual(tokenizeQuery(""), [], "empty -> []");
  assert.deepEqual(tokenizeQuery("a bc d"), [], "all tokens <3 chars -> []");
  assert.deepEqual(tokenizeQuery(null), [], "null coerces to empty -> []");
  assert.deepEqual(tokenizeQuery(12345), ["12345"], "number coerces via String()");
});

// --- scoreByFilename -------------------------------------------------------
test("scoreByFilename: counts basename token hits, sorts desc; guards bad input", () => {
  const files = [
    { relPath: "a/reference_okuma_lathe.md", basename: "reference_okuma_lathe.md" },
    { relPath: "b/reference_okuma_cycle_dialect.md", basename: "reference_okuma_cycle_dialect.md" },
    { relPath: "c/unrelated_note.md", basename: "unrelated_note.md" },
  ];
  const scored = scoreByFilename(files, ["okuma", "lathe"]);
  assert.equal(scored.length, 2, "only the two okuma files match");
  assert.equal(scored[0].relPath, "a/reference_okuma_lathe.md", "okuma+lathe (score 2) ranks first");
  assert.equal(scored[0].score, 2);
  assert.equal(scored[1].score, 1, "okuma-only (score 1) ranks second");
  // guards
  assert.deepEqual(scoreByFilename(files, []), [], "no tokens -> []");
  assert.deepEqual(scoreByFilename(null, ["x"]), [], "non-array files -> []");
  assert.deepEqual(scoreByFilename([{ relPath: "x" }], ["x"]), [], "entry without basename skipped");
});

// --- listMemoryFiles (injected fs) -----------------------------------------
test("listMemoryFiles: walks *.md, excludes _*.md + pointer indexes + non-md", () => {
  const tree = {
    "/repo/knowledge/memories": [
      { name: "reference", isDirectory: () => true, isFile: () => false },
      { name: "MEMORY.md", isDirectory: () => false, isFile: () => true },        // pointer index -> excluded
      { name: "_stats.md", isDirectory: () => false, isFile: () => true },        // _ prefix -> excluded
      { name: "loose.txt", isDirectory: () => false, isFile: () => true },        // not .md -> excluded
    ],
    "/repo/knowledge/memories/reference": [
      { name: "reference_okuma.md", isDirectory: () => false, isFile: () => true },
    ],
  };
  const files = listMemoryFiles({
    root: "/repo",
    statImpl: () => ({ isDirectory: () => true }),
    readdirImpl: (p) => tree[p.split(/[\\/]+/).join("/")] || [],
  });
  assert.deepEqual(files.map((f) => f.basename), ["reference_okuma.md"], "only the real memory file survives");
  assert.equal(files[0].relPath, "knowledge/memories/reference/reference_okuma.md", "forward-slash relPath");
});

test("listMemoryFiles: fail-soft -- missing dir / readdir throw -> []", () => {
  assert.deepEqual(listMemoryFiles({ root: "/x", statImpl: () => { throw new Error("ENOENT"); } }), [], "stat throw -> []");
  assert.deepEqual(listMemoryFiles({ root: "/x", statImpl: () => ({ isDirectory: () => false }) }), [], "not a dir -> []");
});

// --- getVaultHints (injected list + read) ----------------------------------
const FIXTURE_FILES = [
  { relPath: "knowledge/memories/reference/reference_okuma_lathe_threading.md", basename: "reference_okuma_lathe_threading.md" },
  { relPath: "knowledge/memories/reference/reference_misc.md", basename: "reference_misc.md" },
];
const FIXTURE_BODIES = {
  "knowledge/memories/reference/reference_okuma_lathe_threading.md":
    "---\nname: x\ntype: reference\n---\n\nOkuma OSP threading is the single-line G71 cycle, not Fanuc G76.\n",
};

test("getVaultHints: happy -- returns top-N with frontmatter-stripped excerpts", () => {
  const hints = getVaultHints("okuma lathe threading", {
    root: "/repo",
    listImpl: () => FIXTURE_FILES,
    readImpl: (p) => FIXTURE_BODIES[p.split(/[\\/]+/).slice(-4).join("/")] ?? FIXTURE_BODIES[Object.keys(FIXTURE_BODIES).find((k) => p.endsWith(k.split("/").pop()))] ?? "",
  });
  assert.equal(hints.length, 1, "only the okuma file matches the query tokens");
  assert.equal(hints[0].relPath, FIXTURE_FILES[0].relPath);
  assert.ok(hints[0].excerpt.startsWith("Okuma OSP threading"), "frontmatter stripped, content kept");
  assert.ok(!hints[0].excerpt.includes("---"), "no frontmatter fence in excerpt");
});

test("getVaultHints: excerpt is capped at excerptChars", () => {
  const longBody = "---\nx\n---\n" + "Z".repeat(500);
  const hints = getVaultHints("okuma", {
    root: "/repo",
    excerptChars: 40,
    listImpl: () => [FIXTURE_FILES[0]],
    readImpl: () => longBody,
  });
  assert.equal(hints[0].excerpt.length, 40, "excerpt truncated to cap");
});

test("getVaultHints: failure + adversarial modes all yield [] (never throw)", () => {
  const opts = { root: "/repo", listImpl: () => FIXTURE_FILES, readImpl: () => "x" };
  assert.deepEqual(getVaultHints("", opts), [], "empty query -> []");
  assert.deepEqual(getVaultHints("ab", opts), [], "all-short tokens -> []");
  assert.deepEqual(getVaultHints("zzzznomatch", opts), [], "no filename match -> []");
  assert.deepEqual(getVaultHints("okuma", { ...opts, topN: 0 }), [], "topN 0 -> []");
  assert.deepEqual(getVaultHints("okuma", { ...opts, topN: NaN }), getVaultHints("okuma", opts), "NaN topN -> default");
  // fs error per file -> empty excerpt, not a throw
  const h = getVaultHints("okuma", { root: "/repo", listImpl: () => [FIXTURE_FILES[0]], readImpl: () => { throw new Error("EACCES"); } });
  assert.equal(h.length, 1);
  assert.equal(h[0].excerpt, "", "unreadable file -> empty excerpt, no throw");
});

// --- formatVaultHintsBlock -------------------------------------------------
test("formatVaultHintsBlock: renders a block, or '' when empty (no-match injects nothing)", () => {
  assert.equal(formatVaultHintsBlock([]), "", "no hints -> empty string");
  assert.equal(formatVaultHintsBlock(null), "", "null -> empty string");
  const block = formatVaultHintsBlock([{ relPath: "a/b.md", score: 2, excerpt: "hello" }]);
  assert.ok(block.startsWith("## "), "has a markdown header");
  assert.ok(block.includes("- a/b.md: hello"), "renders relPath + excerpt");
  // a hint with no excerpt renders the path only (no trailing ': ')
  assert.ok(formatVaultHintsBlock([{ relPath: "a/b.md", score: 1, excerpt: "" }]).includes("- a/b.md\n"));
});
