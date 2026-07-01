// scripts/synergy-ask.test.mjs
// Tests for the system-viz + obsidian-vault -> ollama synergy combiner.
// Verifies the JOIN semantics (vault-first merge, dedup, id->path resolution,
// grounded prompt) + an injected-deps end-to-end (no real subprocesses).
// Run: node scripts/synergy-ask.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isVaultHit, mergeHits, idToVaultPath, snippetOf, buildGroundedPrompt, synergyAsk, extractKeywords,
} from "./synergy-ask.mjs";

test("extractKeywords: drops stopwords + short tokens, dedups, caps -- the AND-matcher fix", () => {
  // the exact live failure case: a 10-word question -> distinctive keywords only
  assert.deepEqual(
    extractKeywords("how does PRISM offload mechanical work to ollama to save tokens"),
    ["prism", "offload", "mechanical", "ollama", "tokens"],
  );
  assert.deepEqual(extractKeywords("what is X?"), []); // all stopwords / too short -> caller falls back to whole question
  assert.deepEqual(extractKeywords(null), []);
  assert.ok(extractKeywords("alpha beta gamma delta epsilon zeta eta").length <= 5); // capped
});

test("isVaultHit: wiki.* and memory_* are vault-backed; engines/scripts are not", () => {
  assert.equal(isVaultHit({ id: "wiki.lessons.foo" }), true);
  assert.equal(isVaultHit({ id: "memory_reference.reference_foo" }), true);
  assert.equal(isVaultHit({ id: "eng.mill.cuttingforceengine" }), false);
  assert.equal(isVaultHit({ id: "script.regen-viz" }), false);
  assert.equal(isVaultHit(null), false);
  assert.equal(isVaultHit({}), false);
});

test("mergeHits: vault hits first, deduped by id, capped at k, source-tagged", () => {
  const graph = [
    { id: "eng.mill.x", label: "Mill X" },
    { id: "wiki.lessons.dup", label: "Dup (graph copy)" },
    { id: "script.y", label: "Script Y" },
  ];
  const brain = [
    { id: "wiki.lessons.dup", label: "Dup (vault copy)" },
    { id: "memory_reference.ref_z", label: "Ref Z" },
  ];
  const merged = mergeHits(graph, brain, 10);
  // vault entries lead
  assert.equal(merged[0].source, "vault");
  assert.equal(merged[1].source, "vault");
  // dedup: wiki.lessons.dup appears once (the brain copy, first)
  assert.equal(merged.filter(h => h.id === "wiki.lessons.dup").length, 1);
  assert.equal(merged.find(h => h.id === "wiki.lessons.dup").label, "Dup (vault copy)");
  // structural graph nodes tagged 'graph' and come after vault
  const millX = merged.find(h => h.id === "eng.mill.x");
  assert.equal(millX.source, "graph");
  assert.ok(merged.indexOf(millX) > merged.findIndex(h => h.source === "vault"));
  // a graph hit that is vault-namespaced is tagged vault (wiki.lessons.dup proves it)
});

test("mergeHits: cap k truncates", () => {
  const graph = Array.from({ length: 30 }, (_, i) => ({ id: `eng.e${i}`, label: `E${i}` }));
  assert.equal(mergeHits(graph, [], 5).length, 5);
  assert.deepEqual(mergeHits(null, null, 5), []);
});

test("mergeHits: reserves graph slots so a vault-HEAVY result still combines (not vault-only)", () => {
  // The real-world failure mode: the vault holds a node per commit, so a documented
  // query returns far more vault hits than k -> pure vault-first eviction would yield
  // ZERO graph hits, and the "combiner" would ground vault-only. The reservation must
  // keep structural graph hits present.
  const vaultHeavy = Array.from({ length: 20 }, (_, i) => ({ id: `wiki.lessons.v${i}`, label: `V${i}` }));
  const graph = [{ id: "eng.a", label: "A" }, { id: "disp.b", label: "B" }, { id: "script.c", label: "C" }];
  const merged = mergeHits(graph, vaultHeavy, 12); // (graphHits, brainHits=vault, k=12)
  assert.equal(merged.length, 12, "cap honored");
  assert.equal(merged[0].source, "vault", "vault still leads (obsidian emphasis preserved)");
  const graphCount = merged.filter(h => h.source === "graph").length;
  assert.equal(graphCount, 3, "all 3 structural graph hits survive (reserve=min(4,3,4)=3) -- NOT vault-only");
  assert.equal(merged.filter(h => h.source === "vault").length, 9, "rest is vault");
});

test("idToVaultPath: wiki + nested-wiki + memory; null for non-vault", () => {
  assert.equal(idToVaultPath("wiki.lessons.verified-ollama-offload"), "knowledge/wiki/lessons/verified-ollama-offload.md");
  assert.equal(idToVaultPath("wiki.code-tribal.learnings.foo"), "knowledge/wiki/code-tribal/learnings/foo.md");
  assert.equal(idToVaultPath("memory_reference.reference_token_savings_baseline"), "knowledge/memories/reference/reference_token_savings_baseline.md");
  assert.equal(idToVaultPath("memory_feedback.feedback_x"), "knowledge/memories/feedback/feedback_x.md");
  // live system-viz vault namespaces (the snippet-resolution fix)
  assert.equal(idToVaultPath("vault.mem.reference.reference_offloader_cat_fix_2026_05_16"), "knowledge/memories/reference/reference_offloader_cat_fix_2026_05_16.md");
  assert.equal(idToVaultPath("vault.mem.galaxies.post-processor.reference_x"), "knowledge/memories/galaxies/post-processor/reference_x.md");
  assert.equal(idToVaultPath("vault.wiki.lessons.foo"), "knowledge/wiki/lessons/foo.md");
  assert.equal(isVaultHit({ id: "vault.mem.reference.x" }), true);
  assert.equal(idToVaultPath("eng.mill.x"), null);
  assert.equal(idToVaultPath(null), null);
});

test("snippetOf: strips YAML frontmatter, collapses whitespace, caps length", () => {
  const body = "---\ntitle: X\nname: x\n---\n\n# Heading\n\nThe real content line one.\nLine two.\n";
  const s = snippetOf(body, 200);
  assert.ok(!s.includes("title:"), "frontmatter stripped");
  assert.ok(s.includes("The real content line one."));
  assert.ok(!s.includes("\n"), "newlines collapsed");
  assert.equal(snippetOf("x".repeat(500), 100).length, 100);
  assert.equal(snippetOf(null), "");
});

test("buildGroundedPrompt: question + [VAULT]/[GRAPH] tags + excerpts + no-invent instruction", () => {
  const hits = [
    { id: "wiki.lessons.a", label: "A", source: "vault" },
    { id: "eng.b", label: "B", source: "graph" },
  ];
  const p = buildGroundedPrompt("how does X work?", hits, { "wiki.lessons.a": "excerpt text here" });
  assert.match(p, /Question: how does X work\?/);
  assert.match(p, /\[VAULT\] wiki\.lessons\.a/);
  assert.match(p, /\[GRAPH\] eng\.b/);
  assert.match(p, /excerpt: excerpt text here/);
  assert.match(p, /do not invent/i);
});

test("synergyAsk end-to-end with injected deps (no real subprocess)", async () => {
  const calls = [];
  const deps = {
    vizQuery: async (q, brainOnly) => {
      calls.push({ q, brainOnly });
      return brainOnly
        ? [{ id: "memory_reference.ref_a", label: "Ref A" }]
        : [{ id: "eng.x", label: "Eng X" }, { id: "wiki.lessons.b", label: "Wiki B" }];
    },
    resolveSnippets: () => ({ "memory_reference.ref_a": "a snippet" }),
    seekCard: () => null, // hermetic: do not touch the real node-card offset index
    ask: async (prompt) => {
      assert.match(prompt, /Ref A/); // grounding reached the model
      return "Grounded answer citing memory_reference.ref_a.";
    },
  };
  const r = await synergyAsk("what is X?", { k: 10 }, deps);
  // both viz modes were queried (graph + vault)
  assert.deepEqual(calls.map(c => c.brainOnly), [false, true]);
  assert.equal(r.answer, "Grounded answer citing memory_reference.ref_a.");
  assert.equal(r.grounding.vault, 2); // ref_a + wiki.lessons.b
  assert.equal(r.grounding.graph, 1); // eng.x
  assert.equal(r.grounding.snippets, 1);
  assert.ok(r.sources.some(s => s.id === "memory_reference.ref_a" && s.source === "vault"));
});

test("synergyAsk: ollama-down (empty answer) still returns grounding (fail-soft)", async () => {
  const deps = {
    vizQuery: async () => [{ id: "wiki.lessons.a", label: "A" }],
    resolveSnippets: () => ({}),
    ask: async () => "", // ollama unreachable
  };
  const r = await synergyAsk("q?", {}, deps);
  assert.equal(r.answer, "");
  assert.ok(r.grounding.total >= 1, "grounding still surfaced even with no ollama answer");
  assert.equal(r.grounded, true, "grounding present -> grounded:true");
});

test("synergyAsk: ZERO grounding short-circuits -- never calls ollama, cannot invent (R5/R12)", async () => {
  // The skill promises "no PRISM grounding -> says so plainly; does not invent".
  // Enforce it in CODE: with 0 hits the LLM must NOT be called at all -- an
  // ungrounded prompt can only hallucinate. askCalled===false IS the proof that
  // no invented answer can leak through.
  let askCalled = false;
  const deps = {
    vizQuery: async () => [], // no graph + no vault hits for any keyword
    resolveSnippets: () => ({}),
    ask: async () => { askCalled = true; return "INVENTED ANSWER THAT MUST NOT LEAK"; },
  };
  const r = await synergyAsk("totally unknown xyzzy frobnicator question", {}, deps);
  assert.equal(askCalled, false, "ollama must NOT be called when grounding is empty (no invention possible)");
  assert.equal(r.grounded, false);
  assert.equal(r.grounding.total, 0);
  assert.equal(r.answer, "", "no invented answer leaks through on zero grounding");
  assert.deepEqual(r.sources, []);
});

test("synergyAsk: grounded answer sets grounded:true and DOES call ollama", async () => {
  let askCalled = false;
  const deps = {
    vizQuery: async (q, brainOnly) => (brainOnly
      ? [{ id: "memory_reference.ref_a", label: "A" }]
      : [{ id: "eng.x", label: "X" }]),
    resolveSnippets: () => ({ "memory_reference.ref_a": "snip" }),
    seekCard: () => null, // hermetic
    ask: async () => { askCalled = true; return "grounded answer"; },
  };
  const r = await synergyAsk("what is X?", {}, deps);
  assert.equal(askCalled, true, "with grounding present the LLM IS consulted");
  assert.equal(r.grounded, true);
  assert.equal(r.answer, "grounded answer");
});

test("synergyAsk: GRAPH hits get node-card meta grounding (node-card x synergy-ask)", async () => {
  // The asymmetry being fixed: vault hits get .md snippets; graph hits used to
  // contribute only "id :: label". seekCard (cheap offset-index seek, no graph
  // load) now enriches graph hits with layer/kind/status/info/noteCount.
  let askedPrompt = "";
  const deps = {
    vizQuery: async (q, brainOnly) => (brainOnly ? [] : [{ id: "eng.mill", label: "mill" }]),
    resolveSnippets: () => ({}),
    seekCard: (id) => (id === "eng.mill"
      ? { card: { id, label: "mill", layer: "L5", kind: "eng", status: "stub", info: "Mill: 71/72 engines wired", noteCount: 16 } }
      : null),
    ask: async (prompt) => { askedPrompt = prompt; return "answer"; },
  };
  const r = await synergyAsk("how many mill engines", {}, deps);
  assert.equal(r.grounding.graph, 1);
  assert.equal(r.grounding.cards, 1, "the graph hit was enriched with a node-card");
  assert.match(askedPrompt, /meta: L5\/eng\/stub -- Mill: 71\/72 engines wired \[16 docs\]/);
});

test("buildGroundedPrompt: cardsById adds a meta line for graph hits", () => {
  const hits = [{ id: "eng.b", label: "B", source: "graph" }];
  const cards = { "eng.b": { layer: "L5", kind: "eng", status: "wired", info: "does B", noteCount: 3 } };
  const p = buildGroundedPrompt("q?", hits, {}, cards);
  assert.match(p, /\[GRAPH\] eng\.b/);
  assert.match(p, /meta: L5\/eng\/wired -- does B \[3 docs\]/);
});

test("synergyAsk: vault hits are NOT card-seeked (they already get snippets)", async () => {
  let seekCalled = 0;
  const deps = {
    vizQuery: async (q, brainOnly) => (brainOnly ? [{ id: "memory_reference.r", label: "R" }] : []),
    resolveSnippets: () => ({ "memory_reference.r": "snip" }),
    seekCard: () => { seekCalled++; return null; },
    ask: async () => "a",
  };
  const r = await synergyAsk("q?", {}, deps);
  assert.equal(seekCalled, 0, "a vault-only hit never triggers a card seek");
  assert.equal(r.grounding.cards, 0);
});
