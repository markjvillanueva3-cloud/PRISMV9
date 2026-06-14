#!/usr/bin/env node
/**
 * build-wiki-leaf-index.test.mjs — node:test
 *
 * Covers the two exported pure helpers AND a real subprocess integration oracle
 * for the "writer-without-reader" fix: the generator originally walked ONLY
 * knowledge/wiki/code-tribal/, leaving software-engineering/, lessons/, … wikis
 * invisible to wiki-precheck-inject. The HAND_WIKI_DIRS generalization fixes it.
 *
 * The integration test is a FAIL-ON-REVERT oracle: it drives the indexer via
 * PRISM_WIKI_HAND_DIRS (a knob the pre-fix code did not read). Pre-fix code ignores
 * it, walks the real production code-tribal/ instead, and finds NONE of the three
 * tmp entries → the first `assert.ok` throws. Post-fix all three index with
 * `type = <dir-basename>`. Either way the test fails iff the generalization is
 * absent (Karpathy R9: a test that can't fail when the logic regresses is worthless).
 *
 * Pure helpers are imported; the indexer body runs as a subprocess (main() is not
 * exported by design — importing the module must not trigger a real regen) driven
 * by the env overrides the generator already exposes for exactly this.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseFrontmatter, normalizeBoostKeywords } from "./build-wiki-leaf-index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN = resolve(__dirname, "build-wiki-leaf-index.mjs");

// ── parseFrontmatter — scalar behavior is byte-identical to the original parser ──
test("parseFrontmatter: scalar keys", () => {
  const fm = parseFrontmatter("---\ntitle: Hello\ntype: engine\n---\nbody");
  assert.equal(fm.title, "Hello");
  assert.equal(fm.type, "engine");
});

test("parseFrontmatter: strips wrapping quotes on scalars", () => {
  const fm = parseFrontmatter(`---\ntitle: "Quoted Title"\n---\n`);
  assert.equal(fm.title, "Quoted Title");
});

test("parseFrontmatter: no frontmatter → null-proto empty object", () => {
  const fm = parseFrontmatter("no frontmatter here");
  assert.equal(Object.getPrototypeOf(fm), null);
  assert.equal(Object.keys(fm).length, 0);
});

test("parseFrontmatter: __proto__ key cannot pollute reads", () => {
  const fm = parseFrontmatter("---\n__proto__: evil\ntitle: Safe\n---\n");
  assert.equal(fm.title, "Safe");
  assert.equal(({}).polluted, undefined);
});

test("parseFrontmatter: boost_keywords inline array", () => {
  const fm = parseFrontmatter(`---\nboost_keywords: [hook, "settings.json", mjs]\n---\n`);
  assert.deepEqual(fm.boost_keywords, ["hook", "settings.json", "mjs"]);
});

test("parseFrontmatter: boost_keywords block sequence", () => {
  const fm = parseFrontmatter("---\nboost_keywords:\n  - alpha\n  - beta\n---\n");
  assert.deepEqual(fm.boost_keywords, ["alpha", "beta"]);
});

// ── normalizeBoostKeywords ──
test("normalizeBoostKeywords: lowercases, trims, drops non-strings, caps", () => {
  const out = normalizeBoostKeywords([" Hook ", "MJS", 42, "", "settings"]);
  assert.deepEqual(out, ["hook", "mjs", "settings"]);
});

test("normalizeBoostKeywords: absent/empty → null", () => {
  assert.equal(normalizeBoostKeywords(undefined), null);
  assert.equal(normalizeBoostKeywords([]), null);
  assert.equal(normalizeBoostKeywords([1, 2]), null);
});

test("normalizeBoostKeywords: bare string wraps to one-element array", () => {
  assert.deepEqual(normalizeBoostKeywords("Solo"), ["solo"]);
});

// ── Integration oracle: hand-written wiki dirs all index (fail-on-revert) ──
function runIndexer(envOverrides) {
  execFileSync(process.execPath, [GEN], {
    env: { ...process.env, ...envOverrides },
    stdio: "pipe",
  });
}

test("integration: software-engineering + lessons + code-tribal all index with dir-basename type", () => {
  const root = mkdtempSync(join(tmpdir(), "leafidx-"));
  try {
    const arch = join(root, "architecture");
    const se = join(root, "software-engineering");
    const lessons = join(root, "lessons");
    const ct = join(root, "code-tribal");
    for (const d of [arch, se, lessons, ct]) mkdirSync(d, { recursive: true });

    writeFileSync(join(arch, "anengine.md"), "---\ntitle: An Engine\ntype: engine\n---\n# E\n> arch entry\n");
    writeFileSync(join(se, "fail-loud-r12-patterns.md"), "---\nname: fail-loud-r12-patterns\ncategory: software-engineering\n---\n# Fail Loud R12\n> the fail-loud doctrine\n");
    writeFileSync(join(lessons, "a-regression.md"), "---\nname: a-regression\n---\n# A Regression\n> a regression lesson\n");
    writeFileSync(join(ct, "dispatcher-wiring-pattern.md"), "---\nname: dispatcher-wiring-pattern\n---\n# CT\n> code tribal entry\n");
    // Override type via frontmatter — must win over the dir-basename default.
    writeFileSync(join(se, "typed.md"), "---\nname: typed\ntype: custom-type\n---\n# Typed\n> explicit type wins\n");
    // Index/noise files must be skipped.
    writeFileSync(join(se, "index.md"), "---\ntitle: idx\n---\n# Index\n> should be skipped\n");
    writeFileSync(join(se, "_orphans-rescue.md"), "---\ntitle: orphans\n---\n# Orphans\n> should be skipped\n");

    runIndexer({
      PRISM_WIKI_ARCH_DIR: arch,
      PRISM_WIKI_TRIBAL_DIR: join(root, "no-tribal"),
      PRISM_WIKI_MEMORIES_DIR: join(root, "no-memories"),
      PRISM_WIKI_HAND_DIRS: [ct, se, lessons].join(","),
    });

    const lines = readFileSync(join(arch, "_leaf-index.jsonl"), "utf8")
      .split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const byName = Object.fromEntries(lines.map((r) => [r.name, r]));

    // The fix: these would be ABSENT on the pre-fix code-tribal-only walk.
    assert.ok(byName["fail-loud-r12-patterns"], "software-engineering entry must be indexed");
    assert.equal(byName["fail-loud-r12-patterns"].type, "software-engineering");
    assert.ok(byName["a-regression"], "lessons entry must be indexed");
    assert.equal(byName["a-regression"].type, "lessons");
    assert.ok(byName["dispatcher-wiring-pattern"], "code-tribal entry must be indexed");
    assert.equal(byName["dispatcher-wiring-pattern"].type, "code-tribal");

    // Frontmatter type override wins over dir-basename default.
    assert.equal(byName["typed"].type, "custom-type");

    // Index/noise files skipped.
    assert.equal(byName["index"], undefined, "index.md must be skipped");
    assert.equal(byName["_orphans-rescue"], undefined, "_-prefixed files must be skipped");

    // Architecture entry still present (no regression to the primary corpus).
    assert.ok(byName["anengine"], "architecture entry must still index");
    assert.equal(byName["anengine"].type, "engine");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Source-invariant guard (deterministic, fast — no real-tree walk): the default
// HAND_WIKI_DIRS list MUST keep every hand-written wiki sub-tree, and it MUST keep
// honoring PRISM_WIKI_CODE_TRIBAL_DIR for back-compat. A subprocess test of the
// default branch would walk the real ~80-file production tree (slow + coupled to
// repo state), so this asserts the source contract directly instead.
test("source invariant: default HAND_WIKI_DIRS lists every hand-written dir + honors CODE_TRIBAL_DIR back-compat", () => {
  const src = readFileSync(GEN, "utf8");
  for (const dir of [
    "code-tribal", "software-engineering", "lessons", "concepts", "patterns",
    "decisions", "consensus", "coordination", "entities", "os", "reference",
    "trajectories", "ux-design", "summaries",
  ]) {
    assert.ok(
      new RegExp(`["'\\\`]${dir}["'\\\`]`).test(src) || src.includes(`"${dir}"`),
      `HAND_WIKI_DIRS default list must include ${dir}`,
    );
  }
  assert.ok(
    src.includes("PRISM_WIKI_CODE_TRIBAL_DIR"),
    "PRISM_WIKI_CODE_TRIBAL_DIR back-compat env override must be preserved",
  );
});

// Cross-file coupling guard (the half-stagnation the unit fixes): every dir
// basename build-wiki-leaf-index emits as a `type` must be in build-wiki-embeddings
// CONCEPT_TYPES, or those entries are BM25-recallable but never embedded
// (cosine-blind). Reviewers flagged this as the one missing guard — the soft
// `|| true` fallthrough makes it non-load-bearing TODAY, but a future tightening
// would resurrect the half-fix with nothing watching. This test is that watcher.
test("cross-file invariant: HAND_WIKI_DIRS basenames ⊆ build-wiki-embeddings CONCEPT_TYPES", () => {
  const genSrc = readFileSync(GEN, "utf8");
  const embSrc = readFileSync(resolve(__dirname, "build-wiki-embeddings.mjs"), "utf8");

  // HAND_WIKI_DIRS default-array basenames: the join(WIKI_ROOT, "<name>") literals
  // plus the code-tribal slot (which uses PRISM_WIKI_CODE_TRIBAL_DIR || join(...)).
  const arrM = genSrc.match(/HAND_WIKI_DIRS[\s\S]*?\[([\s\S]*?)\];/);
  assert.ok(arrM, "HAND_WIKI_DIRS default array literal must be parseable");
  const basenames = [...arrM[1].matchAll(/join\(WIKI_ROOT,\s*"([^"]+)"\)/g)].map((m) => m[1]);
  basenames.push("code-tribal"); // the first slot's default when CODE_TRIBAL_DIR unset
  assert.ok(basenames.length >= 14, `expected ≥14 hand-wiki dirs, got ${basenames.length}`);

  const ctM = embSrc.match(/const CONCEPT_TYPES = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(ctM, "CONCEPT_TYPES Set literal must be parseable");
  const conceptTypes = new Set([...ctM[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));

  const missing = basenames.filter((b) => !conceptTypes.has(b));
  assert.deepEqual(
    missing, [],
    `every HAND_WIKI_DIRS basename must be in build-wiki-embeddings CONCEPT_TYPES; missing: ${missing.join(", ")}`,
  );
});
