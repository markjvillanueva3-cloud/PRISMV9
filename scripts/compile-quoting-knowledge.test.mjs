/**
 * Tests for compile-quoting-knowledge.mjs — pure-core classify/extract/index/match/render.
 * Real-value assertions + adversarial inputs (null/empty/non-array/non-string), per CLAUDE.md.
 * Run: node --test scripts/compile-quoting-knowledge.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDoc, extractMeta, buildIndex, matchEntries, renderDigest, compile, QUOTING_VOCAB,
} from "./compile-quoting-knowledge.mjs";

test("classifyDoc: curated vs generated vs skip", () => {
  // curated wiki
  assert.equal(classifyDoc("knowledge/wiki/architecture/quoting-galaxy.md").tier, "curated");
  assert.equal(classifyDoc("knowledge/wiki/lessons/quoting-filter-conservative-match.md").tier, "curated");
  // generated node-doc stubs — counted, not compiled
  assert.equal(classifyDoc("knowledge/wiki/architecture/actions/business/actual-cost-variance.md").tier, "generated");
  assert.equal(classifyDoc("knowledge/wiki/architecture/combos/combo-quoteengine.md").tier, "generated");
  assert.equal(classifyDoc("knowledge/memories/reference/node_formula_quote.md").tier, "generated");
  // curated memories
  assert.equal(classifyDoc("knowledge/memories/reference/reference_charlie_quoting_data_ceiling.md").source, "memory");
  assert.equal(classifyDoc("knowledge/memories/feedback/feedback_charlie_quoting_no_inline_rates.md").source, "feedback");
  assert.ok(classifyDoc("knowledge/memories/feedback/feedback_charlie_quoting_no_inline_rates.md").keep);
  // galaxy docs
  assert.equal(classifyDoc("mcp-server/src/engines/quoting/CLAUDE.md").source, "galaxy");
});

test("classifyDoc: defensive on null/empty/non-string", () => {
  for (const bad of [null, undefined, 42, "", {}]) {
    const c = classifyDoc(bad);
    assert.equal(c.keep, false);
  }
});

test("extractMeta: frontmatter title+description preferred; keyword extraction", () => {
  const fm = "---\ntitle: Conservative customer match\ndescription: never drop a real customer\n---\nbody about quote pricing margin";
  const m = extractMeta(fm, "knowledge/wiki/lessons/quoting-filter.md");
  assert.equal(m.title, "Conservative customer match");
  assert.equal(m.summary, "never drop a real customer");
  assert.ok(m.keywords.includes("quote") && m.keywords.includes("pricing") && m.keywords.includes("margin"));
});

test("extractMeta: falls back to # heading then basename; first prose line as summary", () => {
  const md = "# Quoting Pipeline Verify\n\nSingle-command health check for the quoting test surface.";
  const m = extractMeta(md, "x/quoting-pipeline-verify.md");
  assert.equal(m.title, "Quoting Pipeline Verify");
  assert.ok(m.summary.startsWith("Single-command health check"));
  // basename fallback
  assert.equal(extractMeta("", "a/b/cost-alarm.md").title, "cost-alarm");
});

test("extractMeta: skips commit-metadata lines for the summary (code-tribal/learnings quality)", () => {
  const commitDoc = "# QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-BRIDGE-SHIM\n\nCommit: 3820f1ed4f96\nBy: someone\nAt: 2026-05-26\n\nBridges the docustrata invoice corpus to the synth baseline via a shim adapter.";
  const m = extractMeta(commitDoc, "knowledge/wiki/code-tribal/learnings/q.md");
  assert.ok(m.summary.startsWith("Bridges the docustrata"), `got: ${m.summary}`);
  assert.ok(!/^commit/i.test(m.summary), "commit-metadata not used as summary");
});

test("extractMeta: defensive on non-string text", () => {
  const m = extractMeta(null, "x/quote-x.md");
  assert.equal(m.title, "quote-x");
  assert.equal(m.summary, "(no summary)");
});

test("buildIndex: curated kept, generated counted, off-domain skipped", () => {
  const docs = [
    { relPath: "knowledge/wiki/architecture/quoting-galaxy.md", text: "# Quoting Galaxy\nquote pricing overview" },
    { relPath: "knowledge/wiki/lessons/quoting-filter.md", text: "# Filter\nconservative match" },
    { relPath: "knowledge/wiki/architecture/actions/business/quote-estimate.md", text: "# stub" }, // generated
    { relPath: "knowledge/memories/reference/reference_charlie_quoting_data_ceiling.md", text: "# Ceiling\ndocustrata inbound only" },
    { relPath: "mcp-server/src/engines/quoting/CLAUDE.md", text: "# Quoting Galaxy CLAUDE\ndomain scope" },
  ];
  const idx = buildIndex(docs);
  assert.equal(idx.counts.curated, 4, "2 wiki + 1 memory + 1 galaxy");
  assert.equal(idx.counts.generated, 1, "the actions/ stub");
  assert.equal(idx.entries.length, 4);
  assert.ok(idx.entries.every((e) => e.id && e.title && Array.isArray(e.keywords)));
});

test("buildIndex: defensive on null/non-array", () => {
  assert.equal(buildIndex(null).entries.length, 0);
  assert.equal(buildIndex(42).counts.curated, 0);
});

test("matchEntries: keyword overlap scores + top-K; defensive", () => {
  const index = {
    entries: [
      { id: "a", title: "Conservative match", summary: "", keywords: ["customer", "filter", "quote"], path: "a" },
      { id: "b", title: "Data ceiling", summary: "", keywords: ["docustrata", "cost"], path: "b" },
      { id: "c", title: "Drift freshness", summary: "", keywords: ["drift", "calibration"], path: "c" },
    ],
  };
  const hits = matchEntries(["docustrata", "revenue"], index, 3).map((e) => e.id);
  assert.deepEqual(hits, ["b"], "only the docustrata entry matches");
  const multi = matchEntries(["quote", "drift"], index, 3).map((e) => e.id).sort();
  assert.deepEqual(multi, ["a", "c"]);
  // defensive
  assert.deepEqual(matchEntries(null, index), []);
  assert.deepEqual(matchEntries(["x"], null), []);
  assert.deepEqual(matchEntries([], index), []);
});

test("renderDigest: stable shape, names counts + sections", () => {
  const idx = buildIndex([
    { relPath: "knowledge/wiki/architecture/quoting-galaxy.md", text: "# Quoting Galaxy\noverview" },
    { relPath: "knowledge/memories/feedback/feedback_charlie_quoting_no_inline_rates.md", text: "# Rates\nnever inline" },
  ]);
  const md = renderDigest(idx, "2026-05-29", "H:/prism");
  assert.ok(md.includes("QUOTING-KNOWLEDGE"));
  assert.ok(md.includes("Quoting Galaxy"));
  assert.ok(md.includes("curated entries"));
  assert.ok(md.includes("## Tribal / feedback"));
});

test("compile: end-to-end on injected docs (no fs)", () => {
  const { md, json } = compile({
    root: "H:/prism",
    docs: [{ relPath: "knowledge/wiki/lessons/quoting-filter.md", text: "# Filter\nconservative customer match for quote pricing" }],
    generatedAtIso: "2026-05-29",
  });
  assert.equal(json.counts.curated, 1);
  assert.equal(json.entries[0].source, "wiki");
  assert.ok(md.includes("quoting-filter.md"));
  assert.ok(QUOTING_VOCAB.includes("quote"));
});
