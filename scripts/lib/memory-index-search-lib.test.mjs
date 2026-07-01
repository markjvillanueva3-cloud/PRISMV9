// Hermetic node:test suite for memory-index-search-lib.mjs (H7 of
// SYSTEM-SYNERGY-AUDIT). Pure-core only -- fs reads are mocked via
// injected readImpl/readdirImpl/statImpl/existsImpl.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tokenize,
  buildMemoryRecord,
  scoreMemoryRecord,
  enumerateMemoryFiles,
  runMemoryIndexSearch,
  isNodePointerStub,
  nodePointerExclusionEnabled,
  STOPWORDS,
  __test_constants,
} from "./memory-index-search-lib.mjs";

const { W_NAME, W_DESC, W_BODY, W_TYPE, MAX_QUERY_TOKENS } = __test_constants;

// ----- tokenize ---------------------------------------------------------

test("tokenize: splits on non-alphanumeric, lowercases, dedupes", () => {
  const t = tokenize("Shared-Tree Misattribution Class");
  assert.deepEqual(t, ["shared-tree", "misattribution", "class"]);
});

test("tokenize: strips stopwords (the, with, what, etc.)", () => {
  const t = tokenize("what is the misattribution with shared tree");
  assert.ok(!t.includes("what"));
  assert.ok(!t.includes("the"));
  assert.ok(!t.includes("with"));
  assert.ok(t.includes("misattribution"));
});

test("tokenize: drops short tokens below MIN_TOKEN_LEN", () => {
  const t = tokenize("ab abc abcd");
  assert.ok(!t.includes("ab"));
  assert.ok(t.includes("abc"));
  assert.ok(t.includes("abcd"));
});

test("tokenize: caps at MAX_QUERY_TOKENS", () => {
  const text = Array.from({ length: 30 }, (_, i) => `token${i}word`).join(" ");
  const t = tokenize(text);
  assert.ok(t.length <= MAX_QUERY_TOKENS, `got ${t.length} tokens`);
});

test("tokenize: rejects non-strings + empty input", () => {
  assert.deepEqual(tokenize(null), []);
  assert.deepEqual(tokenize(undefined), []);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(42), []);
});

test("tokenize: STOPWORDS export contains the canonical set", () => {
  assert.ok(STOPWORDS.has("the"));
  assert.ok(STOPWORDS.has("memory"));
  assert.ok(STOPWORDS.has("system"));
  assert.ok(!STOPWORDS.has("misattribution"));
});

// ----- buildMemoryRecord ------------------------------------------------

test("buildMemoryRecord: parses frontmatter description", () => {
  const body = `---
name: my-memo
description: A short summary of the fact
metadata:
  type: reference
---

The body opens here.`;
  const rec = buildMemoryRecord({ namespace: "reference", fileName: "my-memo.md", body });
  assert.equal(rec.name, "my-memo");
  assert.equal(rec.namespace, "reference");
  assert.equal(rec.description, "A short summary of the fact");
  assert.ok(rec.opening.startsWith("The body opens"));
});

test("buildMemoryRecord: handles quoted description (single + double)", () => {
  const body1 = `---\ndescription: "Quoted desc"\n---\nbody`;
  const body2 = `---\ndescription: 'Single quoted'\n---\nbody`;
  assert.equal(buildMemoryRecord({ namespace: "reference", fileName: "x.md", body: body1 }).description, "Quoted desc");
  assert.equal(buildMemoryRecord({ namespace: "reference", fileName: "x.md", body: body2 }).description, "Single quoted");
});

test("buildMemoryRecord: no frontmatter → empty description, full body as rest", () => {
  const rec = buildMemoryRecord({ namespace: "reference", fileName: "no-fm.md", body: "Just body text here." });
  assert.equal(rec.description, "");
  assert.ok(rec.opening.startsWith("Just body text"));
});

test("buildMemoryRecord: skips heading-only paragraphs to find first body para", () => {
  const body = `# Heading\n\n## Subheading\n\nThe actual first paragraph here.`;
  const rec = buildMemoryRecord({ namespace: "reference", fileName: "x.md", body });
  assert.ok(rec.opening.startsWith("The actual"), `got: ${rec.opening.slice(0, 50)}`);
});

test("buildMemoryRecord: truncates opening to maxBodyBytes", () => {
  const long = "Lorem ipsum ".repeat(500);
  const rec = buildMemoryRecord({ namespace: "reference", fileName: "x.md", body: long, maxBodyBytes: 100 });
  assert.ok(rec.opening.length <= 100, `got length ${rec.opening.length}`);
});

test("buildMemoryRecord: strips .md from name", () => {
  const rec = buildMemoryRecord({ namespace: "reference", fileName: "foo-bar_2026.md", body: "" });
  assert.equal(rec.name, "foo-bar_2026");
});

test("buildMemoryRecord: returns null on null body or empty fileName", () => {
  assert.equal(buildMemoryRecord({ namespace: "reference", fileName: "", body: "x" }), null);
  assert.equal(buildMemoryRecord({ namespace: "reference", fileName: "x.md", body: null }), null);
});

test("buildMemoryRecord: degrades to default namespace when missing", () => {
  const rec = buildMemoryRecord({ fileName: "x.md", body: "body" });
  assert.equal(rec.namespace, "uncategorized");
});

// ----- scoreMemoryRecord ------------------------------------------------

test("scoreMemoryRecord: name match scores W_NAME per token", () => {
  const rec = { name: "shared-tree-misattribution", fileName: "shared-tree.md", description: "", opening: "", namespace: "reference" };
  assert.equal(scoreMemoryRecord(rec, ["shared-tree"]), W_NAME);
});

test("scoreMemoryRecord: description match scores W_DESC", () => {
  const rec = { name: "x", fileName: "x.md", description: "the misattribution event", opening: "", namespace: "reference" };
  assert.equal(scoreMemoryRecord(rec, ["misattribution"]), W_DESC);
});

test("scoreMemoryRecord: body match scores W_BODY", () => {
  const rec = { name: "x", fileName: "x.md", description: "", opening: "discusses misattribution at length", namespace: "reference" };
  assert.equal(scoreMemoryRecord(rec, ["misattribution"]), W_BODY);
});

test("scoreMemoryRecord: namespace match scores W_TYPE", () => {
  const rec = { name: "x", fileName: "x.md", description: "", opening: "", namespace: "feedback" };
  assert.equal(scoreMemoryRecord(rec, ["feedback"]), W_TYPE);
});

test("scoreMemoryRecord: stacks all four when query hits everywhere", () => {
  const rec = { name: "feedback-rule", fileName: "feedback-rule.md", description: "feedback for next time", opening: "feedback applies broadly", namespace: "feedback" };
  const s = scoreMemoryRecord(rec, ["feedback"]);
  assert.equal(s, W_NAME + W_DESC + W_BODY + W_TYPE);
});

test("scoreMemoryRecord: zero query tokens → zero score (defensive)", () => {
  const rec = { name: "x", fileName: "x.md", description: "y", opening: "z", namespace: "reference" };
  assert.equal(scoreMemoryRecord(rec, []), 0);
});

test("scoreMemoryRecord: null record → zero score (fail-soft)", () => {
  assert.equal(scoreMemoryRecord(null, ["x"]), 0);
});

// ----- enumerateMemoryFiles ---------------------------------------------

test("enumerateMemoryFiles: walks declared namespaces, filters .md only", () => {
  const fakeFs = {
    "/v/feedback": ["a.md", "b.md", "ignore.txt"],
    "/v/reference": ["c.md"],
    "/v/project": [],
  };
  const files = enumerateMemoryFiles({
    vaultRoot: "/v",
    namespaces: ["feedback", "reference", "project"],
    readdirImpl: (p) => fakeFs[p.replace(/\\/g, "/")] || [],
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(fakeFs, p.replace(/\\/g, "/")),
  });
  assert.equal(files.length, 3);
  assert.ok(files.every((f) => f.fileName.endsWith(".md")));
});

test("enumerateMemoryFiles: skips missing namespaces silently", () => {
  const files = enumerateMemoryFiles({
    vaultRoot: "/v",
    namespaces: ["feedback", "ghost", "reference"],
    readdirImpl: (p) => (p.endsWith("feedback") ? ["a.md"] : []),
    existsImpl: (p) => p.endsWith("feedback"),
  });
  assert.equal(files.length, 1);
});

test("enumerateMemoryFiles: skips MEMORY.md + MEMORY-ARCHIVE.md (index, not memory)", () => {
  const files = enumerateMemoryFiles({
    vaultRoot: "/v",
    namespaces: ["feedback"],
    readdirImpl: () => ["MEMORY.md", "MEMORY-ARCHIVE.md", "real-memo.md"],
    existsImpl: () => true,
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].fileName, "real-memo.md");
});

test("enumerateMemoryFiles: readdir throw → namespace skipped fail-soft", () => {
  const files = enumerateMemoryFiles({
    vaultRoot: "/v",
    namespaces: ["feedback", "reference"],
    readdirImpl: (p) => { if (p.endsWith("feedback")) throw new Error("EACCES"); return ["c.md"]; },
    existsImpl: () => true,
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].namespace, "reference");
});

// ----- runMemoryIndexSearch ---------------------------------------------

function makeFakeVault(files) {
  const dirMap = {};
  for (const f of files) {
    const k = `/v/${f.namespace}`;
    (dirMap[k] = dirMap[k] || []).push(f.fileName);
  }
  const fileMap = Object.fromEntries(files.map((f) => [`/v/${f.namespace}/${f.fileName}`, f.body]));
  return {
    vaultRoot: "/v",
    namespaces: [...new Set(files.map((f) => f.namespace))],
    readdirImpl: (p) => dirMap[p.replace(/\\/g, "/")] || [],
    readFileImpl: (p) => {
      const v = fileMap[p.replace(/\\/g, "/")];
      if (v === undefined) throw new Error("ENOENT " + p);
      return v;
    },
    statImpl: (p) => {
      const b = fileMap[p.replace(/\\/g, "/")];
      if (b === undefined) throw new Error("ENOENT " + p);
      return { size: Buffer.byteLength(b, "utf8") };
    },
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(dirMap, p.replace(/\\/g, "/")),
  };
}

test("runMemoryIndexSearch: end-to-end happy path returns top-K hits", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "shared-tree-misattribution.md",
      body: `---\ndescription: "shared-tree git-add window absorbs peer files"\n---\n\nThis describes the misattribution class.` },
    { namespace: "reference", fileName: "unrelated.md",
      body: `---\ndescription: "completely unrelated topic"\n---\n\nNothing useful.` },
    { namespace: "feedback", fileName: "commit-prefix.md",
      body: `---\ndescription: "use [MAIN] prefix on shared tree"\n---\n\nWhy: misattribution prevention.` },
  ]);
  const { tokens, hits } = runMemoryIndexSearch("shared-tree misattribution", { ...fake, topK: 2 });
  assert.ok(tokens.includes("shared-tree"));
  assert.ok(tokens.includes("misattribution"));
  assert.equal(hits.length, 2);
  assert.equal(hits[0].name, "shared-tree-misattribution");
  assert.ok(hits[0].score >= hits[1].score);
});

test("runMemoryIndexSearch: empty query → empty hits (no tokens)", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "x.md", body: "body" },
  ]);
  const r = runMemoryIndexSearch("", fake);
  assert.equal(r.hits.length, 0);
});

test("runMemoryIndexSearch: only stopword query → empty hits", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "x.md", body: "the system has memory" },
  ]);
  const r = runMemoryIndexSearch("the the the with which what", fake);
  assert.equal(r.hits.length, 0);
});

test("runMemoryIndexSearch: empty vault → empty hits (no crash)", () => {
  const r = runMemoryIndexSearch("anything", {
    vaultRoot: "/v",
    namespaces: ["feedback"],
    readdirImpl: () => [],
    readFileImpl: () => "",
    statImpl: () => ({ size: 0 }),
    existsImpl: () => true,
  });
  assert.equal(r.hits.length, 0);
});

test("runMemoryIndexSearch: zero-byte file gets skipped, not crash", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "empty.md", body: "" },
    { namespace: "reference", fileName: "full.md", body: "---\ndescription: misattribution\n---\nbody" },
  ]);
  const { hits } = runMemoryIndexSearch("misattribution", fake);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, "full");
});

test("runMemoryIndexSearch: total-bytes cap halts after limit (DoS guard)", () => {
  const big = "x ".repeat(3000);
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "a.md", body: `---\ndescription: misattribution\n---\n${big}` },
    { namespace: "reference", fileName: "b.md", body: `---\ndescription: misattribution\n---\n${big}` },
    { namespace: "reference", fileName: "c.md", body: `---\ndescription: misattribution\n---\n${big}` },
  ]);
  const r = runMemoryIndexSearch("misattribution", { ...fake, maxTotalBytes: 10_000, topK: 5 });
  assert.ok(r.hits.length >= 1, "should still surface at least one hit before cap");
  assert.ok(r.hits.length <= 3, "should not scan beyond cap-limited count");
});

test("runMemoryIndexSearch: deterministic tie-break by name asc", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "zzz.md", body: `---\ndescription: misattribution\n---\nbody` },
    { namespace: "reference", fileName: "aaa.md", body: `---\ndescription: misattribution\n---\nbody` },
  ]);
  const r = runMemoryIndexSearch("misattribution", { ...fake, topK: 2 });
  assert.equal(r.hits.length, 2);
  assert.equal(r.hits[0].name, "aaa", "alphabetical tie-break — aaa before zzz");
});

// ----- parseAliases + W_ALIAS wiring (PSN-ENHANCE-MS0/U-PSN-MASTER-INDEX-ALIASES) ----

import { parseAliases } from "./memory-index-search-lib.mjs";
const { W_ALIAS } = __test_constants;

test("parseAliases: inline array shape — aliases: [a, b, c]", () => {
  const fm = `name: x\ndescription: y\naliases: [PSK kernel, PSK-syscall, prism-syscall]\ntype: feedback`;
  assert.deepEqual(parseAliases(fm), ["PSK kernel", "PSK-syscall", "prism-syscall"]);
});

test("parseAliases: inline JSON shape — aliases: [\"a\", \"b\"]", () => {
  const fm = `aliases: ["alpha alias", "beta alias"]`;
  assert.deepEqual(parseAliases(fm), ["alpha alias", "beta alias"]);
});

test("parseAliases: YAML block shape — aliases:\\n  - a\\n  - b", () => {
  const fm = `name: x\naliases:\n  - psn\n  - PRISM Synergy Network\n  - 11-leg map\ntype: feedback`;
  assert.deepEqual(parseAliases(fm), ["psn", "PRISM Synergy Network", "11-leg map"]);
});

test("parseAliases: missing aliases field → []", () => {
  const fm = `name: x\ndescription: y\ntype: feedback`;
  assert.deepEqual(parseAliases(fm), []);
});

test("parseAliases: dupes deduped case-insensitive, first-occurrence wins", () => {
  const fm = `aliases: [PSN, psn, Psn, MOC, moc]`;
  assert.deepEqual(parseAliases(fm), ["PSN", "MOC"]);
});

test("parseAliases: empty + whitespace-only items dropped", () => {
  const fm = `aliases: [, real, , also-real,   ]`;
  assert.deepEqual(parseAliases(fm), ["real", "also-real"]);
});

test("parseAliases: null/non-string → [] (fail-soft)", () => {
  assert.deepEqual(parseAliases(null), []);
  assert.deepEqual(parseAliases(undefined), []);
  assert.deepEqual(parseAliases(42), []);
  assert.deepEqual(parseAliases(""), []);
});

test("buildMemoryRecord: surfaces aliases[] from frontmatter", () => {
  const body = `---
name: feedback-psk-kernel
description: PSK syscall kernel
aliases: [PSK kernel, PSK-syscall, prism-syscall]
type: feedback
---

Body here.`;
  const rec = buildMemoryRecord({ namespace: "feedback", fileName: "feedback-psk-kernel.md", body });
  assert.deepEqual(rec.aliases, ["PSK kernel", "PSK-syscall", "prism-syscall"]);
});

test("buildMemoryRecord: no aliases → empty array (back-compat)", () => {
  const body = `---\ndescription: legacy memo\n---\nbody`;
  const rec = buildMemoryRecord({ namespace: "reference", fileName: "legacy.md", body });
  assert.deepEqual(rec.aliases, []);
});

test("scoreMemoryRecord: alias match scores W_ALIAS per token", () => {
  const rec = {
    name: "feedback-psk-kernel",
    fileName: "feedback-psk-kernel.md",
    description: "",
    opening: "",
    namespace: "feedback",
    aliases: ["psk-syscall", "prism-syscall-kernel"],
  };
  assert.equal(scoreMemoryRecord(rec, ["psk-syscall"]), W_ALIAS);
});

test("scoreMemoryRecord: alias + name double-count (when token hits both)", () => {
  const rec = {
    name: "psn-definition",
    fileName: "feedback-psn-definition.md",
    description: "",
    opening: "",
    namespace: "feedback",
    aliases: ["psn-map"],
  };
  // tok "psn" hits BOTH name and alias
  assert.equal(scoreMemoryRecord(rec, ["psn"]), W_NAME + W_ALIAS);
});

test("scoreMemoryRecord: missing aliases field (legacy sidecar record) → no crash, no W_ALIAS contribution", () => {
  const rec = { name: "x", fileName: "x.md", description: "y", opening: "", namespace: "reference" };
  // Should still score W_NAME from "x" + W_DESC from "y"
  assert.equal(scoreMemoryRecord(rec, ["x"]), W_NAME);
  assert.equal(scoreMemoryRecord(rec, ["y"]), W_DESC);
});

test("scoreMemoryRecord: aliases as non-array (defensive) → ignored, no crash", () => {
  const rec = { name: "x", fileName: "x.md", description: "", opening: "", namespace: "reference", aliases: "not-an-array" };
  assert.equal(scoreMemoryRecord(rec, ["foo"]), 0);
});

test("runMemoryIndexSearch end-to-end: alias-only query promotes hit above non-alias", () => {
  const aliasMatcher = {
    namespace: "feedback",
    fileName: "feedback-psk-kernel.md",
    body: `---\ndescription: kernel design\naliases: [psk-syscall, prism-syscall]\n---\nThe kernel body text.`,
  };
  const slugOnlyMatcher = {
    namespace: "feedback",
    fileName: "feedback-other-kernel.md",
    body: `---\ndescription: other kernel notes\n---\nThe other kernel body text.`,
  };
  const fake = makeFakeVault([aliasMatcher, slugOnlyMatcher]);
  const r = runMemoryIndexSearch("psk-syscall kernel", { ...fake, topK: 2 });
  assert.equal(r.hits.length, 2);
  // alias-bearing memo MUST rank first — psk-syscall hits alias W_ALIAS + "kernel" hits body/desc
  assert.equal(r.hits[0].fileName, "feedback-psk-kernel.md", `alias-promoted hit should be first, got: ${r.hits[0].fileName}`);
});

// ----- node-pointer stub exclusion (MEMORY-RECALL-NODE-POINTER-EXCLUDE) ------

test("isNodePointerStub: matches node_*/node-* prefixes only, not real memos", () => {
  assert.equal(isNodePointerStub("node_algorithm_alg_adaptivecontrollermodel.md"), true);
  assert.equal(isNodePointerStub("node-engine-foo.md"), true);
  assert.equal(isNodePointerStub("NODE_Engine_Foo.md"), true); // case-insensitive
  assert.equal(isNodePointerStub("reference_node_pointer_design.md"), false); // real memo that merely mentions node
  assert.equal(isNodePointerStub("feedback_psk_kernel.md"), false);
  assert.equal(isNodePointerStub(null), false);
  assert.equal(isNodePointerStub(undefined), false);
});

test("nodePointerExclusionEnabled: default-ON, PRISM_RECALL_INCLUDE_NODE_POINTERS=1 restores", () => {
  const prev = process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS;
  try {
    delete process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS;
    assert.equal(nodePointerExclusionEnabled(), true, "default excludes node pointers");
    process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS = "1";
    assert.equal(nodePointerExclusionEnabled(), false, "knob=1 keeps node pointers");
    process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS = "0";
    assert.equal(nodePointerExclusionEnabled(), true, "knob=0 still excludes");
  } finally {
    if (prev === undefined) delete process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS;
    else process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS = prev;
  }
});

test("runMemoryIndexSearch: node_* stub that MATCHES the query is excluded by default", () => {
  // A node pointer and a real memo both match 'adaptive controller'. Without the
  // exclusion the thin pointer crowds the result; with it (default) only the real memo ranks.
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "node_algorithm_alg_adaptivecontroller.md",
      body: `---\ndescription: "Node-indexed pointer — algorithm AdaptiveController → wiki path"\n---\nadaptive controller pointer.` },
    { namespace: "reference", fileName: "reference_adaptive_controller_tuning.md",
      body: `---\ndescription: "adaptive controller tuning notes — real substantive memo"\n---\nadaptive controller gains and tuning.` },
  ]);
  const r = runMemoryIndexSearch("adaptive controller", { ...fake, topK: 10 });
  const names = r.hits.map((h) => h.fileName);
  assert.ok(!names.includes("node_algorithm_alg_adaptivecontroller.md"), "node pointer stub must be excluded by default");
  assert.ok(names.includes("reference_adaptive_controller_tuning.md"), "the real memo must survive");
});

test("runMemoryIndexSearch: opts.excludeNodePointers=false restores node pointers (knob path)", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "node_algorithm_alg_adaptivecontroller.md",
      body: `---\ndescription: "Node-indexed pointer — algorithm AdaptiveController → wiki path"\n---\nadaptive controller pointer.` },
    { namespace: "reference", fileName: "reference_adaptive_controller_tuning.md",
      body: `---\ndescription: "adaptive controller tuning notes — real substantive memo"\n---\nadaptive controller gains and tuning.` },
  ]);
  const r = runMemoryIndexSearch("adaptive controller", { ...fake, topK: 10, excludeNodePointers: false });
  const names = r.hits.map((h) => h.fileName);
  assert.ok(names.includes("node_algorithm_alg_adaptivecontroller.md"), "knob off → node pointer included");
});

test("runMemoryIndexSearch: a memo merely PREFIXED differently (not node_) is never excluded", () => {
  const fake = makeFakeVault([
    { namespace: "reference", fileName: "reference_node_graph_design.md",
      body: `---\ndescription: "node graph design — real memo about the node_* convention itself"\n---\nnode graph design rationale.` },
  ]);
  const r = runMemoryIndexSearch("node graph design", { ...fake, topK: 10 });
  assert.ok(r.hits.map((h) => h.fileName).includes("reference_node_graph_design.md"), "real memo discussing nodes must survive");
});

// The SIDECAR path is the production default (source: sidecar/hybrid). The two
// tests above use makeFakeVault (no sidecar) → they only cover the live-scan skip.
// These cover the sidecar-loop skip — the load-bearing guard — so deleting it
// fails a test instead of silently restoring the 72%-noise regression (R9).
function fakeSidecarOpts(records, extra = {}) {
  const SC = "/sc.json";
  return {
    sidecarPath: SC,
    hybrid: false, // force BM25-only → deterministic source:'sidecar' (no dense fusion)
    existsImpl: (p) => p.replace(/\\/g, "/") === SC, // sidecar exists; ns dirs do not → no staleness downgrade
    readFileImpl: (p) => {
      if (p.replace(/\\/g, "/") === SC) {
        return JSON.stringify({ schemaVersion: "1.0.0", sourceMtimeMs: 1, records });
      }
      throw new Error("ENOENT " + p);
    },
    ...extra,
  };
}

const SIDECAR_NODE_RECS = [
  { name: "node_algorithm_alg_adaptivecontroller", fileName: "node_algorithm_alg_adaptivecontroller.md",
    namespace: "reference", description: "Node-indexed pointer — algorithm AdaptiveController → wiki path",
    aliases: [], opening: "adaptive controller pointer" },
  { name: "reference_adaptive_controller_tuning", fileName: "reference_adaptive_controller_tuning.md",
    namespace: "reference", description: "adaptive controller tuning notes — real substantive memo",
    aliases: [], opening: "adaptive controller gains and tuning" },
];

test("runMemoryIndexSearch: SIDECAR path excludes node_* stub by default (production-default guard)", () => {
  const r = runMemoryIndexSearch("adaptive controller", { ...fakeSidecarOpts(SIDECAR_NODE_RECS), topK: 10 });
  assert.equal(r.source, "sidecar", "must exercise the sidecar loop, not live-scan");
  const names = r.hits.map((h) => h.fileName);
  assert.ok(!names.includes("node_algorithm_alg_adaptivecontroller.md"), "sidecar-loop skip must drop the node stub");
  assert.ok(names.includes("reference_adaptive_controller_tuning.md"), "the real memo must survive the sidecar path");
});

test("runMemoryIndexSearch: SIDECAR path restores node_* with opts.excludeNodePointers=false", () => {
  const r = runMemoryIndexSearch("adaptive controller",
    { ...fakeSidecarOpts(SIDECAR_NODE_RECS), topK: 10, excludeNodePointers: false });
  assert.equal(r.source, "sidecar");
  assert.ok(r.hits.map((h) => h.fileName).includes("node_algorithm_alg_adaptivecontroller.md"),
    "knob off → node stub included on the sidecar path too");
});

// ----- Qdrant ANN dense arm (HMEMV09) ----------------------------------------
// The hybrid recall path now sources dense candidates from the Qdrant HNSW index
// (collection prism_memories) instead of re-loading the 21.9MB sidecar on every
// prompt, with the linear scan kept as a fail-soft fallback. All curl I/O is
// injected so these are hermetic (no live Qdrant required).

import { denseRankViaQdrant, tryHybridFuse, packInt8 } from "./memory-index-search-lib.mjs";

const qdrantOk = (points) => () => JSON.stringify({ status: "ok", result: points });

test("denseRankViaQdrant: maps result[].payload.node_id + score to {key,sim} in order", () => {
  const out = denseRankViaQdrant([0.1, 0.2], {
    execImpl: qdrantOk([
      { id: 1, score: 0.91, payload: { node_id: "feedback/a" } },
      { id: 2, score: 0.42, payload: { node_id: "reference/b" } },
    ]),
  });
  assert.deepEqual(out, [{ key: "feedback/a", sim: 0.91 }, { key: "reference/b", sim: 0.42 }]);
});

test("denseRankViaQdrant: empty / non-array queryVec → null and NO curl", () => {
  let called = false;
  const exec = () => { called = true; return qdrantOk([])(); };
  assert.equal(denseRankViaQdrant([], { execImpl: exec }), null);
  assert.equal(denseRankViaQdrant(null, { execImpl: exec }), null);
  assert.equal(denseRankViaQdrant("nope", { execImpl: exec }), null);
  assert.equal(called, false, "must not spawn curl on bad input");
});

test("denseRankViaQdrant: empty Qdrant result array → null (fallback signal)", () => {
  assert.equal(denseRankViaQdrant([1], { execImpl: qdrantOk([]) }), null);
});

test("denseRankViaQdrant: curl throw (Qdrant down) → null", () => {
  assert.equal(denseRankViaQdrant([1], { execImpl: () => { throw new Error("curl: (7) connection refused"); } }), null);
});

test("denseRankViaQdrant: non-JSON / empty stdout → null", () => {
  assert.equal(denseRankViaQdrant([1], { execImpl: () => "not json <html>" }), null);
  assert.equal(denseRankViaQdrant([1], { execImpl: () => "" }), null);
});

test("denseRankViaQdrant: Qdrant error body (no result array) → null", () => {
  assert.equal(
    denseRankViaQdrant([1], { execImpl: () => JSON.stringify({ status: { error: "Collection not found" } }) }),
    null,
  );
});

test("denseRankViaQdrant: points missing payload.node_id are skipped, valid kept", () => {
  const out = denseRankViaQdrant([1], {
    execImpl: qdrantOk([
      { id: 1, score: 0.9, payload: { node_id: "feedback/a" } },
      { id: 2, score: 0.8, payload: {} },     // no node_id → skip
      { id: 3, score: 0.7 },                  // no payload → skip
      { id: 4, score: 0.6, payload: { node_id: "reference/d" } },
    ]),
  });
  assert.deepEqual(out, [{ key: "feedback/a", sim: 0.9 }, { key: "reference/d", sim: 0.6 }]);
});

// Build a fake embeddings-sidecar JSON string (int8-packed vectors) for the
// fallback-arm tests. dim is set to the test vector length so the model-mismatch
// guard does not false-trigger.
function fakeEmbSidecarJson(recs, dim) {
  const records = recs.map((r) => {
    const p = packInt8(r.vec);
    return { key: r.key, name: r.name, fileName: r.fileName, namespace: r.namespace, vec: p.b64, norm: p.norm };
  });
  return JSON.stringify({ schemaVersion: "1.0.0", dim, model: "nomic-embed-text", records });
}

test("tryHybridFuse: Qdrant arm supplies dense keys, fused + hydrated WITHOUT loading the sidecar", () => {
  const byKey = new Map([
    ["feedback/a", { name: "a", fileName: "a.md", namespace: "feedback", description: "", opening: "" }],
    ["reference/b", { name: "b", fileName: "b.md", namespace: "reference", description: "", opening: "" }],
  ]);
  const out = tryHybridFuse({
    query: "anything",
    bm25Ranked: [{ name: "a", fileName: "a.md", namespace: "feedback" }], // recordKey → feedback/a
    byKey,
    opts: {
      embeddingsSidecarPath: "/emb.json",
      existsImpl: (p) => p.replace(/\\/g, "/") === "/emb.json",          // sidecar "present" (gate only)
      embedQueryImpl: () => [0.1, 0.2, 0.3],                             // query embed succeeds
      embedDim: 3,                                                        // match the 3-d test vector
      denseRankViaQdrantImpl: () => [{ key: "reference/b", sim: 0.9 }, { key: "feedback/a", sim: 0.5 }],
      readFileImpl: () => { throw new Error("sidecar must NOT be read when Qdrant serves"); },
      now: 1000,
    },
  });
  assert.ok(Array.isArray(out) && out.length === 2, "both fused keys hydrate");
  const names = out.map((r) => r.name).sort();
  assert.deepEqual(names, ["a", "b"]);
});

test("tryHybridFuse: Qdrant down (null) → falls back to linear scan over the sidecar", () => {
  const recs = [
    { key: "feedback/a", name: "a", fileName: "a.md", namespace: "feedback", vec: [1, 0, 0] },
    { key: "reference/b", name: "b", fileName: "b.md", namespace: "reference", vec: [0, 1, 0] },
  ];
  const embJson = fakeEmbSidecarJson(recs, 3);
  const byKey = new Map(recs.map((r) => [r.key, { name: r.name, fileName: r.fileName, namespace: r.namespace, description: "", opening: "" }]));
  const out = tryHybridFuse({
    query: "anything",
    bm25Ranked: [],
    byKey,
    opts: {
      embeddingsSidecarPath: "/emb.json",
      existsImpl: (p) => p.replace(/\\/g, "/") === "/emb.json",
      readFileImpl: (p) => { if (p.replace(/\\/g, "/") === "/emb.json") return embJson; throw new Error("ENOENT " + p); },
      statImpl: () => ({ mtimeMs: 1 }),
      embedQueryImpl: () => [1, 0, 0],                 // closest to record "a" (vec [1,0,0])
      embedDim: 3,                                     // exercise the Qdrant arm (then it returns null)
      denseRankViaQdrantImpl: () => null,              // Qdrant DOWN → fallback
      now: 1000,
    },
  });
  assert.ok(Array.isArray(out) && out.length >= 1, "scan fallback must produce hits");
  assert.equal(out[0].name, "a", "query [1,0,0] ranks record a (vec [1,0,0]) first via the scan fallback");
});

test("tryHybridFuse: opts.qdrant=false skips Qdrant entirely, uses the sidecar scan", () => {
  let qdrantCalled = false;
  const recs = [{ key: "feedback/a", name: "a", fileName: "a.md", namespace: "feedback", vec: [1, 0, 0] }];
  const embJson = fakeEmbSidecarJson(recs, 3);
  const byKey = new Map([["feedback/a", { name: "a", fileName: "a.md", namespace: "feedback", description: "", opening: "" }]]);
  const out = tryHybridFuse({
    query: "x",
    bm25Ranked: [],
    byKey,
    opts: {
      qdrant: false,
      embeddingsSidecarPath: "/emb.json",
      existsImpl: (p) => p.replace(/\\/g, "/") === "/emb.json",
      readFileImpl: (p) => { if (p.replace(/\\/g, "/") === "/emb.json") return embJson; throw new Error("ENOENT"); },
      statImpl: () => ({ mtimeMs: 1 }),
      embedQueryImpl: () => [1, 0, 0],
      denseRankViaQdrantImpl: () => { qdrantCalled = true; return [{ key: "feedback/a", sim: 1 }]; },
      now: 1000,
    },
  });
  assert.equal(qdrantCalled, false, "opts.qdrant=false must never call the Qdrant arm");
  assert.ok(Array.isArray(out) && out[0].name === "a", "sidecar scan still produces the hit");
});

test("tryHybridFuse: query-embed failure trips the circuit and returns null (BM25-only)", () => {
  let tripped = false;
  const out = tryHybridFuse({
    query: "x",
    bm25Ranked: [],
    byKey: new Map(),
    opts: {
      embeddingsSidecarPath: "/emb.json",
      existsImpl: (p) => p.replace(/\\/g, "/") === "/emb.json",
      embedQueryImpl: () => null,                      // ollama embed down
      writeFileImpl: () => { tripped = true; },        // tripEmbedCircuit
      denseRankViaQdrantImpl: () => { throw new Error("must not reach Qdrant without a query vector"); },
      now: 1000,
    },
  });
  assert.equal(out, null);
  assert.equal(tripped, true, "a failed query-embed must trip the circuit breaker");
});

// ----- HMEMV02 explainable retrieval ----------------------------------------
import { matchedTokens } from "./memory-index-search-lib.mjs";

test("matchedTokens: returns the query tokens present in the record's fields", () => {
  const rec = { name: "obsidian-hermes-accel", fileName: "obsidian-hermes-accel.md",
    description: "recall acceleration", opening: "vault dense arm", namespace: "reference", aliases: [] };
  assert.deepEqual(matchedTokens(rec, ["obsidian", "recall", "missing"]), ["obsidian", "recall"]);
});

test("matchedTokens: matches alias + namespace; empty on no-match / bad input (fail-soft)", () => {
  const rec = { name: "x", fileName: "x.md", description: "", opening: "", namespace: "feedback", aliases: ["psk-kernel"] };
  assert.deepEqual(matchedTokens(rec, ["psk-kernel", "feedback"]), ["psk-kernel", "feedback"]);
  assert.deepEqual(matchedTokens(rec, ["nope"]), []);
  assert.deepEqual(matchedTokens(null, ["x"]), []);
  assert.deepEqual(matchedTokens(rec, []), []);
});

test("tryHybridFuse: each fused record carries _explain (arm, denseSim, bm25Score)", () => {
  const byKey = new Map([
    ["feedback/a", { name: "a", fileName: "a.md", namespace: "feedback", description: "", opening: "" }],
    ["reference/b", { name: "b", fileName: "b.md", namespace: "reference", description: "", opening: "" }],
  ]);
  const out = tryHybridFuse({
    query: "x",
    bm25Ranked: [{ name: "a", fileName: "a.md", namespace: "feedback", score: 7.5 }],  // recordKey feedback/a
    byKey,
    opts: {
      embeddingsSidecarPath: "/emb.json",
      existsImpl: (p) => p.replace(/\\/g, "/") === "/emb.json",
      embedQueryImpl: () => [0.1, 0.2, 0.3],
      embedDim: 3,
      denseRankViaQdrantImpl: () => [{ key: "reference/b", sim: 0.91 }, { key: "feedback/a", sim: 0.42 }],
      readFileImpl: () => { throw new Error("no sidecar read"); },
      now: 1000,
    },
  });
  const a = out.find((r) => r.name === "a");
  const b = out.find((r) => r.name === "b");
  // a is in BOTH arms: qdrant dense (sim 0.42) + bm25 (score 7.5)
  assert.equal(a._explain.denseArm, "qdrant");
  assert.equal(a._explain.denseSim, 0.42);
  assert.equal(a._explain.bm25Score, 7.5);
  // b is dense-only (qdrant), no bm25 entry
  assert.equal(b._explain.denseArm, "qdrant");
  assert.equal(b._explain.denseSim, 0.91);
  assert.equal(b._explain.bm25Score, null);
});

test("runMemoryIndexSearch: BM25-only hits carry explanation (denseArm null, bm25Score=score)", () => {
  const recs = [
    { name: "misattribution-note", fileName: "misattribution-note.md", namespace: "reference",
      description: "shared tree misattribution", aliases: [], opening: "details" },
  ];
  const r = runMemoryIndexSearch("misattribution shared-tree", { ...fakeSidecarOpts(recs), topK: 3 });
  assert.equal(r.source, "sidecar");
  const h = r.hits[0];
  assert.ok(h.explanation, "hit must carry an explanation object");
  assert.equal(h.explanation.denseArm, null, "BM25-only path has no dense arm");
  assert.equal(typeof h.explanation.bm25Score, "number");
  assert.equal(h.explanation.bm25Score, h.score, "BM25-only: bm25Score == score");
  assert.ok(h.explanation.matchedTokens.includes("misattribution"));
  assert.equal(h.explanation.corpus, "reference");
});

test("tryHybridFuse: hybrid=false short-circuits BEFORE any Qdrant/embed work (back-compat)", () => {
  let touched = false;
  const out = tryHybridFuse({
    query: "x",
    bm25Ranked: [],
    byKey: new Map(),
    opts: {
      hybrid: false,
      existsImpl: () => { touched = true; return true; },
      embedQueryImpl: () => { touched = true; return [1]; },
      denseRankViaQdrantImpl: () => { touched = true; return [{ key: "a", sim: 1 }]; },
    },
  });
  assert.equal(out, null);
  assert.equal(touched, false, "hybrid:false must not touch fs / embed / Qdrant");
});

test("tryHybridFuse: no sidecar AND Qdrant disabled → null (no embed cost)", () => {
  let embedded = false;
  const out = tryHybridFuse({
    query: "x",
    bm25Ranked: [],
    byKey: new Map(),
    opts: {
      qdrant: false,                                   // qdrant off
      embeddingsSidecarPath: "/emb.json",
      existsImpl: () => false,                          // sidecar absent
      embedQueryImpl: () => { embedded = true; return [1]; },
      now: 1000,
    },
  });
  assert.equal(out, null);
  assert.equal(embedded, false, "no dense source → must not pay the query-embed cost");
});

test("tryHybridFuse: wrong-dim query SKIPS the Qdrant arm (symmetric dim guard), uses scan", () => {
  // embedDim defaults to 768; a 3-d query must NOT be POSTed to the 768-d collection.
  let qdrantCalled = false;
  const recs = [{ key: "feedback/a", name: "a", fileName: "a.md", namespace: "feedback", vec: [1, 0, 0] }];
  const embJson = fakeEmbSidecarJson(recs, 3);
  const byKey = new Map([["feedback/a", { name: "a", fileName: "a.md", namespace: "feedback", description: "", opening: "" }]]);
  const out = tryHybridFuse({
    query: "x",
    bm25Ranked: [],
    byKey,
    opts: {
      embeddingsSidecarPath: "/emb.json",
      existsImpl: (p) => p.replace(/\\/g, "/") === "/emb.json",
      readFileImpl: (p) => { if (p.replace(/\\/g, "/") === "/emb.json") return embJson; throw new Error("ENOENT"); },
      statImpl: () => ({ mtimeMs: 1 }),
      embedQueryImpl: () => [1, 0, 0],                 // length 3 != default embedDim 768
      denseRankViaQdrantImpl: () => { qdrantCalled = true; return [{ key: "feedback/a", sim: 1 }]; },
      now: 1000,
    },
  });
  assert.equal(qdrantCalled, false, "wrong-dim query must not reach the Qdrant arm");
  assert.ok(Array.isArray(out) && out[0].name === "a", "scan arm (dim 3) still serves the hit");
});

test("denseRankViaQdrant: duplicate node_id points are deduped (first/highest-score wins)", () => {
  const out = denseRankViaQdrant([1], {
    execImpl: qdrantOk([
      { id: 1, score: 0.9, payload: { node_id: "feedback/a" } },
      { id: 2, score: 0.7, payload: { node_id: "feedback/a" } },  // dup key (impossible via FNV id, defensive)
      { id: 3, score: 0.5, payload: { node_id: "reference/b" } },
    ]),
  });
  assert.deepEqual(out, [{ key: "feedback/a", sim: 0.9 }, { key: "reference/b", sim: 0.5 }]);
});

test("runMemoryIndexSearch: a throwing dense arm degrades to BM25-only, never propagates (P1)", () => {
  // Sidecar BM25 records + a Qdrant impl that THROWS. The fuse-call wrap in
  // runMemoryIndexSearch must swallow it and return source:'sidecar' (BM25-only),
  // never throw into the synchronous hook.
  const SC = "/bm25.json";
  const EMB = "/emb.json";
  const bm25Records = [
    { name: "misattribution-note", fileName: "misattribution-note.md", namespace: "reference",
      description: "shared tree misattribution", aliases: [], opening: "details" },
  ];
  const r = runMemoryIndexSearch("misattribution", {
    sidecarPath: SC,
    embeddingsSidecarPath: EMB,
    topK: 3,
    existsImpl: (p) => { const n = p.replace(/\\/g, "/"); return n === SC || n === EMB; },
    readFileImpl: (p) => {
      const n = p.replace(/\\/g, "/");
      if (n === SC) return JSON.stringify({ schemaVersion: "1.0.0", sourceMtimeMs: 1, records: bm25Records });
      throw new Error("ENOENT " + p);
    },
    statImpl: () => ({ mtimeMs: 1 }),
    embedQueryImpl: () => [1, 2, 3],
    embedDim: 3,
    denseRankViaQdrantImpl: () => { throw new Error("boom from the dense arm"); },
    now: 1000,
  });
  assert.equal(r.source, "sidecar", "throw in the fuse must degrade to BM25-only");
  assert.equal(r.hits[0].name, "misattribution-note", "BM25 hit still returned");
});
