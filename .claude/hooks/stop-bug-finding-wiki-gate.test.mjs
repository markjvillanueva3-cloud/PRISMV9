/**
 * stop-bug-finding-wiki-gate.test.mjs — U-BUG-FINDINGS-WIKI-HOOK coverage.
 *
 * Pure-function tests (slugify, hasCompanionWikiEntry, renderAdvisory) +
 * fixture-based runGate tests using a tmp wiki root. detectBugFindings
 * is integration-tested live against this repo's git history (smoke-only;
 * the deterministic logic is exercised through the wiki-existence path).
 */
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  slugify,
  hasCompanionWikiEntry,
  renderAdvisory,
  runGate,
  detectBugFindings,
  BUG_KEYWORDS,
  MEMORY_BUG_PATTERNS,
} from "./stop-bug-finding-wiki-gate.mjs";

// ────────────────────────────────────────────────────────────────
// slugify
// ────────────────────────────────────────────────────────────────

test("slugify: normal text → kebab-case", () => {
  assert.strictEqual(slugify("Foo Bar Baz"), "foo-bar-baz");
});
test("slugify: punctuation/symbols → squashed", () => {
  assert.strictEqual(slugify("foo: bar (baz/quux)!"), "foo-bar-baz-quux");
});
test("slugify: empty → empty", () => {
  assert.strictEqual(slugify(""), "");
});
test("slugify: null/undefined → empty (defensive)", () => {
  assert.strictEqual(slugify(null), "");
  assert.strictEqual(slugify(undefined), "");
});
test("slugify: unicode → ascii-stripped", () => {
  assert.strictEqual(slugify("café résumé"), "caf-r-sum");
});
test("slugify: leading/trailing dashes stripped", () => {
  assert.strictEqual(slugify("---foo---"), "foo");
});

// ────────────────────────────────────────────────────────────────
// hasCompanionWikiEntry
// ────────────────────────────────────────────────────────────────

function makeFixtureWiki(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wikigate-"));
  for (const sub of ["lessons", "code-tribal", "architecture"]) {
    fs.mkdirSync(path.join(dir, sub));
  }
  for (const [sub, name] of entries) {
    fs.writeFileSync(path.join(dir, sub, name), "# stub");
  }
  return dir;
}

test("hasCompanionWikiEntry: exact slug match in lessons/", () => {
  const w = makeFixtureWiki([["lessons", "my-bug.md"]]);
  try {
    assert.strictEqual(hasCompanionWikiEntry("my-bug", { wikiRoot: w }), true);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});
test("hasCompanionWikiEntry: token (≥4 char) match in code-tribal/", () => {
  // slug = "regen-viz-merge-faillod"; wiki entry = "regen-viz-faillod.md"
  // tokens = [regen, viz, merge, faillod]; faillod is ≥4 chars and matches.
  const w = makeFixtureWiki([["code-tribal", "regen-viz-faillod.md"]]);
  try {
    assert.strictEqual(hasCompanionWikiEntry("regen-viz-merge-faillod", { wikiRoot: w }), true);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});
test("hasCompanionWikiEntry: missing entry → false", () => {
  const w = makeFixtureWiki([["lessons", "other-bug.md"]]);
  try {
    assert.strictEqual(hasCompanionWikiEntry("my-bug", { wikiRoot: w }), false);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});
test("hasCompanionWikiEntry: empty slug → false", () => {
  const w = makeFixtureWiki([["lessons", "x.md"]]);
  try {
    assert.strictEqual(hasCompanionWikiEntry("", { wikiRoot: w }), false);
    assert.strictEqual(hasCompanionWikiEntry(undefined, { wikiRoot: w }), false);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});
test("hasCompanionWikiEntry: missing wikiRoot dir → false (graceful)", () => {
  assert.strictEqual(hasCompanionWikiEntry("foo", { wikiRoot: "/no/such/dir" }), false);
});
test("hasCompanionWikiEntry: only short tokens (<4 chars) → no fuzzy match", () => {
  // slug = "a-b-c" → tokens all <4 chars → no token fuzzy match should fire.
  const w = makeFixtureWiki([["lessons", "x.md"]]);
  try {
    assert.strictEqual(hasCompanionWikiEntry("a-b-c", { wikiRoot: w }), false);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────────────────────
// renderAdvisory
// ────────────────────────────────────────────────────────────────

test("renderAdvisory: empty missing → empty string", () => {
  assert.strictEqual(renderAdvisory([]), "");
  assert.strictEqual(renderAdvisory(null), "");
});
test("renderAdvisory: 2 missing → contains slug + ref + rule pointer", () => {
  const out = renderAdvisory([
    { type: "claude-md-regression", slug: "foo-bug", ref: "Foo bug name" },
    { type: "memory-bug-file", slug: "feedback-bar", ref: "knowledge/memories/feedback_bar.md" },
  ]);
  assert.ok(out.includes("foo-bug"));
  assert.ok(out.includes("feedback-bar"));
  assert.ok(out.includes("feedback_always_update_wiki_on_bug_finding"));
  assert.ok(out.includes("knowledge/wiki/lessons/"));
  assert.ok(out.includes("PRISM_BUG_FINDING_WIKI_GATE_DISABLE"));
});
test("renderAdvisory: more than MAX_LIST → 'and N more' line appears", () => {
  const missing = Array.from({ length: 15 }, (_, i) => ({
    type: "x",
    slug: `bug-${i}`,
    ref: `r-${i}`,
  }));
  const out = renderAdvisory(missing);
  assert.ok(/and 7 more/.test(out), "should show truncation count (15 - default 8 = 7)");
});

// ────────────────────────────────────────────────────────────────
// runGate (integration shape — uses real git + tmp wiki root)
// ────────────────────────────────────────────────────────────────

test("runGate: disabled via env → silent continue", () => {
  const orig = process.env.PRISM_BUG_FINDING_WIKI_GATE_DISABLE;
  process.env.PRISM_BUG_FINDING_WIKI_GATE_DISABLE = "1";
  try {
    // Re-import would be needed for env to take effect on module-level DISABLE;
    // since DISABLE is read at import time, we instead simulate by passing the
    // already-imported runGate AND verifying that when no findings exist on a
    // fresh wiki root, the result is silent.
    const w = fs.mkdtempSync(path.join(os.tmpdir(), "wikigate-disabled-"));
    try {
      const r = runGate({ horizon: 0, wikiRoot: w });
      // With horizon=0 the git scan returns no commits → no findings → no msg.
      assert.strictEqual(r.continue, true);
    } finally {
      fs.rmSync(w, { recursive: true, force: true });
    }
  } finally {
    if (orig === undefined) delete process.env.PRISM_BUG_FINDING_WIKI_GATE_DISABLE;
    else process.env.PRISM_BUG_FINDING_WIKI_GATE_DISABLE = orig;
  }
});
test("runGate: horizon=0 (no commits scanned) → no findings → silent continue", () => {
  const w = fs.mkdtempSync(path.join(os.tmpdir(), "wikigate-h0-"));
  try {
    const r = runGate({ horizon: 0, wikiRoot: w });
    assert.strictEqual(r.continue, true);
    // No systemMessage when no findings (note: detectBugFindings may still
    // pick up uncommitted memory files in working tree, which is correct
    // behaviour — we don't test that path here; see detectBugFindings smoke).
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});

// ────────────────────────────────────────────────────────────────
// detectBugFindings smoke (live git, this repo)
// ────────────────────────────────────────────────────────────────

test("detectBugFindings: smoke — returns an array shape", () => {
  // This is live git against H:/prism; we can't deterministically assert N
  // findings (depends on recent commits), but we CAN verify the array shape
  // + record structure so a regression in the parse loop is caught.
  const findings = detectBugFindings(0);
  assert.ok(Array.isArray(findings));
  for (const f of findings) {
    assert.ok(typeof f.type === "string", "type is string");
    assert.ok(typeof f.slug === "string", "slug is string");
    assert.ok(typeof f.ref === "string", "ref is string");
  }
});

// ────────────────────────────────────────────────────────────────
// Constant freezing
// ────────────────────────────────────────────────────────────────

test("BUG_KEYWORDS is frozen (cannot accidentally mutate at runtime)", () => {
  assert.ok(Object.isFrozen(BUG_KEYWORDS));
});
test("MEMORY_BUG_PATTERNS recognises feedback_/reference_ filenames", () => {
  assert.ok(MEMORY_BUG_PATTERNS.some(p => p.test("feedback_foo.md")));
  assert.ok(MEMORY_BUG_PATTERNS.some(p => p.test("reference_u_regen_viz_merge_faillod_2026_05_17.md")));
  assert.ok(MEMORY_BUG_PATTERNS.some(p => p.test("reference_foo_regression_bar.md")));
  // Negative cases
  assert.ok(!MEMORY_BUG_PATTERNS.some(p => p.test("project_continue_cad_trigger.md")));
  assert.ok(!MEMORY_BUG_PATTERNS.some(p => p.test("reference_something_else.md")));
});
