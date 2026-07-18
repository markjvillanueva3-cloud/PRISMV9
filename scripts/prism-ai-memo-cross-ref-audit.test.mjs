#!/usr/bin/env node
/**
 * Tests for prism-ai-memo-cross-ref-audit.mjs (/goal synergy iter 13, echo).
 *
 * Run: node --test scripts/prism-ai-memo-cross-ref-audit.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  listPrismAiEngines,
  walkMemoFiles,
  countEngineRefs,
  audit,
  SCHEMA_VERSION,
  SAMPLE_MEMO_CAP,
  MAX_MISSING,
} from "./prism-ai-memo-cross-ref-audit.mjs";

// ───────────────────────── exports ─────────────────────────

test("exports + constants stable", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
  assert.equal(SAMPLE_MEMO_CAP, 5);
  assert.equal(MAX_MISSING, 50);
  assert.equal(typeof listPrismAiEngines, "function");
  assert.equal(typeof walkMemoFiles, "function");
  assert.equal(typeof countEngineRefs, "function");
  assert.equal(typeof audit, "function");
});

// ───────────────────────── listPrismAiEngines ─────────────────────────

test("listPrismAiEngines: returns sorted PRISM*Engine.ts files only", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prism-eng-"));
  // Mixed-shape directory: 3 valid + 4 ignored
  writeFileSync(path.join(dir, "PRISMSelfAwarenessEngine.ts"), "");
  writeFileSync(path.join(dir, "PRISMCreativeReasoningEngine.ts"), "");
  writeFileSync(path.join(dir, "PRISMLoRAAdapterEngine.ts"), "");
  writeFileSync(path.join(dir, "PRISMSelfAwarenessEngine.js"), "");      // wrong ext
  writeFileSync(path.join(dir, "OtherEngine.ts"), "");                    // not PRISM-prefixed
  writeFileSync(path.join(dir, "PRISMConfig.ts"), "");                    // missing Engine suffix
  writeFileSync(path.join(dir, "prismLowerCase.ts"), "");                 // case-sensitive
  const r = listPrismAiEngines(dir);
  assert.deepEqual(r, [
    "PRISMCreativeReasoningEngine",
    "PRISMLoRAAdapterEngine",
    "PRISMSelfAwarenessEngine",
  ], "sorted asc + extension stripped + filter strict");
  rmSync(dir, { recursive: true, force: true });
});

test("listPrismAiEngines: empty dir / missing dir / null → empty array", () => {
  assert.deepEqual(listPrismAiEngines(null), []);
  assert.deepEqual(listPrismAiEngines(""), []);
  assert.deepEqual(listPrismAiEngines("/no/such/dir/anywhere"), []);
  const dir = mkdtempSync(path.join(tmpdir(), "prism-empty-"));
  assert.deepEqual(listPrismAiEngines(dir), []);
  rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── walkMemoFiles ─────────────────────────

test("walkMemoFiles: recursive .md walk with stable relative paths", () => {
  const root = mkdtempSync(path.join(tmpdir(), "prism-walk-"));
  mkdirSync(path.join(root, "feedback"), { recursive: true });
  mkdirSync(path.join(root, "reference"), { recursive: true });
  writeFileSync(path.join(root, "feedback", "a.md"), "alpha");
  writeFileSync(path.join(root, "reference", "b.md"), "bravo");
  writeFileSync(path.join(root, "ignored.txt"), "not markdown");   // ignored
  writeFileSync(path.join(root, "reference", ".hidden.md"), "h");  // included (hidden start ok)
  const memos = walkMemoFiles(root, root);
  const paths = memos.map((m) => m.path).sort();
  assert.deepEqual(paths, [
    "feedback/a.md",
    "reference/.hidden.md",
    "reference/b.md",
  ]);
  // Paths must use forward slashes regardless of platform (cross-machine stable).
  for (const m of memos) assert.ok(!m.path.includes("\\"), `forward-slash paths only: ${m.path}`);
  rmSync(root, { recursive: true, force: true });
});

test("walkMemoFiles: missing/null/empty input → empty array (fail-soft)", () => {
  assert.deepEqual(walkMemoFiles(null), []);
  assert.deepEqual(walkMemoFiles(""), []);
  assert.deepEqual(walkMemoFiles("/no/such/dir/anywhere"), []);
});

// ───────────────────────── countEngineRefs ─────────────────────────

test("countEngineRefs: strict matches engine class name exactly", () => {
  const memos = [
    { path: "a.md", content: "use PRISMCreativeReasoningEngine.explore() to fan out" },
    { path: "b.md", content: "no engine here, just prose about creativity" },
    { path: "c.md", content: "see PRISMCreativeReasoningEngine docs" },
  ];
  const r = countEngineRefs("PRISMCreativeReasoningEngine", memos);
  assert.equal(r.strict, 2);
  assert.deepEqual(r.sampleMemos, ["a.md", "c.md"]);
});

test("countEngineRefs: lenient picks up case-folded stem mentions", () => {
  const memos = [
    { path: "a.md", content: "the creative reasoning engine helps fan out" },
    { path: "b.md", content: "CreativeReasoning is the topic" },
    { path: "c.md", content: "completely unrelated to brainstorm tools" },
  ];
  const r = countEngineRefs("PRISMCreativeReasoningEngine", memos);
  // Lenient stem = "CreativeReasoning"; case-folded matches both a and b
  // (a.md = "creative reasoning" — has both words but lacks the camelcase
  // concatenation, so the lenient substring miss is OK). b.md DOES match.
  assert.equal(r.strict, 0);
  assert.equal(r.lenient, 1);
});

test("countEngineRefs: strict count ≤ lenient count (invariant)", () => {
  const memos = [
    { path: "a.md", content: "PRISMSelfAwarenessEngine and SelfAwareness everywhere" },
    { path: "b.md", content: "SelfAwareness lowercase variant: selfawareness" },
    { path: "c.md", content: "neither here" },
  ];
  const r = countEngineRefs("PRISMSelfAwarenessEngine", memos);
  assert.ok(r.strict <= r.lenient, `strict (${r.strict}) must be <= lenient (${r.lenient})`);
  // Strict: only a.md contains "PRISMSelfAwarenessEngine" → 1
  assert.equal(r.strict, 1);
  // Lenient (per-memo, not per-occurrence): a.md and b.md both contain
  // "selfawareness" case-folded → 2. The counter increments once per memo
  // that satisfies the predicate, not once per occurrence within the memo.
  assert.equal(r.lenient, 2);
});

test("countEngineRefs: SAMPLE_MEMO_CAP enforced", () => {
  const memos = Array.from({ length: 20 }, (_, i) => ({
    path: `m${i}.md`,
    content: "PRISMSelfAwarenessEngine reference",
  }));
  const r = countEngineRefs("PRISMSelfAwarenessEngine", memos);
  assert.equal(r.strict, 20);
  assert.equal(r.sampleMemos.length, SAMPLE_MEMO_CAP, "sampleMemos capped at SAMPLE_MEMO_CAP");
});

test("countEngineRefs: zero memos → zero counts, no samples", () => {
  const r = countEngineRefs("PRISMSelfAwarenessEngine", []);
  assert.equal(r.strict, 0);
  assert.equal(r.lenient, 0);
  assert.deepEqual(r.sampleMemos, []);
});

test("countEngineRefs: lenient guard — empty stem doesn't count every memo", () => {
  // Hypothetical engine name "PRISMEngine" → stripped to empty string.
  // Without the guard, EVERY memo would match the empty-string substring.
  const memos = [
    { path: "a.md", content: "anything" },
    { path: "b.md", content: "any other content" },
  ];
  const r = countEngineRefs("PRISMEngine", memos);
  assert.equal(r.strict, 0); // no memo contains "PRISMEngine" literal
  assert.equal(r.lenient, 0, "empty stem must not match every memo (guarded)");
});

// ───────────────────────── audit ─────────────────────────

test("audit: full path — 3 engines, 4 memos, mixed coverage", () => {
  const realEngines = ["PRISMCreativeReasoningEngine", "PRISMLoRAAdapterEngine", "PRISMSelfAwarenessEngine"];
  const memos = [
    { path: "a.md", content: "PRISMSelfAwarenessEngine here" },
    { path: "b.md", content: "PRISMCreativeReasoningEngine + PRISMSelfAwarenessEngine" },
    { path: "c.md", content: "no engine refs here" },
    { path: "d.md", content: "creative reasoning prose (lenient only)" },
  ];
  const r = audit(realEngines, memos);
  assert.equal(r.schemaVersion, SCHEMA_VERSION);
  assert.equal(r.stats.engineCount, 3);
  assert.equal(r.stats.memoCount, 4);
  // Strict: SelfAwareness=2, Creative=1, LoRA=0 → 1 missing
  assert.equal(r.stats.missing, 1);
  // Coverage: 2/3 = 0.6666... → rounded to 4 decimal places
  assert.equal(r.stats.coverage, 0.6667);
  // Missing list contains only the LoRA engine (strict zero)
  assert.deepEqual(r.missingFromMemos, ["PRISMLoRAAdapterEngine"]);
  // engines[] has all 3 with per-engine counts
  assert.equal(r.engines.length, 3);
  const loRA = r.engines.find((e) => e.name === "PRISMLoRAAdapterEngine");
  assert.equal(loRA.strictCount, 0);
});

test("audit: empty inputs → empty audit, coverage=0", () => {
  const r = audit([], []);
  assert.equal(r.stats.engineCount, 0);
  assert.equal(r.stats.memoCount, 0);
  assert.equal(r.stats.missing, 0);
  assert.equal(r.stats.coverage, 0, "no divide-by-zero blow-up");
  assert.deepEqual(r.engines, []);
  assert.deepEqual(r.missingFromMemos, []);
});

test("audit: all engines covered → missing=0, coverage=1", () => {
  const engines = ["PRISMCreativeReasoningEngine", "PRISMSelfAwarenessEngine"];
  const memos = [
    { path: "a.md", content: "PRISMCreativeReasoningEngine + PRISMSelfAwarenessEngine" },
  ];
  const r = audit(engines, memos);
  assert.equal(r.stats.missing, 0);
  assert.equal(r.stats.coverage, 1);
  assert.deepEqual(r.missingFromMemos, []);
});

test("audit: null/array-shape inputs → fail-soft (no throw)", () => {
  // Defensive: callers may pass null when corpus walk failed.
  const r1 = audit(null, null);
  assert.equal(r1.stats.engineCount, 0);
  const r2 = audit(["PRISMEngineX"], null);
  assert.equal(r2.stats.memoCount, 0);
  assert.equal(r2.stats.missing, 1);
  const r3 = audit(null, [{ path: "a", content: "X" }]);
  assert.equal(r3.stats.engineCount, 0);
});

test("audit: missingFromMemos hard-capped at MAX_MISSING", () => {
  const engines = Array.from({ length: MAX_MISSING + 10 }, (_, i) => `PRISMEngine${i}Engine`);
  const memos = []; // none → all engines missing
  const r = audit(engines, memos);
  assert.equal(r.stats.missing, engines.length, "stats.missing counts full set");
  assert.equal(r.missingFromMemos.length, MAX_MISSING, "list capped at MAX_MISSING");
});

test("audit: same input twice → identical output (deterministic on shape)", () => {
  // Note: top-level .generatedAt timestamps will differ. Strip them.
  const engines = ["PRISMCreativeReasoningEngine", "PRISMSelfAwarenessEngine"];
  const memos = [{ path: "a.md", content: "PRISMSelfAwarenessEngine" }];
  const a = audit(engines, memos);
  const b = audit(engines, memos);
  // Strip generatedAt for deterministic comparison.
  delete a.generatedAt;
  delete b.generatedAt;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live engine dir + memo vault → audit shape correct", () => {
  // Resolve from this test file location. Run only when the live corpora exist
  // (CI may skip; local dev hits this for free).
  const root = path.resolve(__dirname_or_root());
  const engineDir = path.join(root, "mcp-server/src/engines");
  const memoDir = path.join(root, "knowledge/memories");
  if (!existsSync(engineDir) || !existsSync(memoDir)) {
    console.log("  SKIP: live corpora missing");
    return;
  }
  const engines = listPrismAiEngines(engineDir);
  if (engines.length === 0) { console.log("  SKIP: no PRISM*Engine.ts files"); return; }
  const memos = walkMemoFiles(memoDir, root);
  if (memos.length === 0) { console.log("  SKIP: no memos walked"); return; }
  const r = audit(engines, memos);
  assert.equal(r.schemaVersion, SCHEMA_VERSION);
  assert.ok(r.stats.engineCount >= 1, "at least one PRISM engine in real corpus");
  assert.ok(r.stats.memoCount >= 1, "at least one memo in real corpus");
  assert.ok(r.stats.coverage >= 0 && r.stats.coverage <= 1, "coverage clamped to [0,1]");
  // Sanity: PRISMSelfAwarenessEngine is the most-referenced PRISM-AI engine
  // in the fleet (CLAUDE.md mentions it heavily, memos cite it via the
  // `.recommendAIFeatures()` pattern). If it's missing, the audit shape is
  // probably broken (path/encoding bug) — fail loud.
  const selfAware = r.engines.find((e) => e.name === "PRISMSelfAwarenessEngine");
  if (selfAware) {
    assert.ok(selfAware.strictCount > 0 || selfAware.lenientCount > 0,
      "PRISMSelfAwarenessEngine should have at least one memo reference in the live vault");
  }
});

/** Resolve repo root from this test file's location — node:test runs from cwd
 * but we want the path to be cwd-independent so the E2E test isn't fragile. */
function __dirname_or_root() {
  // This file lives at scripts/ — go up one to repo root.
  return path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")), "..");
}
