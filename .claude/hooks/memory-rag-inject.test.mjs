// Hermetic node:test suite for memory-rag-inject.mjs.
//
// TOKEN-SAVINGS rank-7 (memory-injector-dedup, slot:alpha 2026-06-04): proves the
// hook (1) no longer spawns cmd.exe/tsx/a temp .mts subprocess, (2) gates on the
// recall keywords, (3) dedups vs memory-index-precheck-inject, and (4) renders an
// injection block equivalent to the shared runMemoryIndexSearch lib output.
//
// Pure-core only: the hook's IO/stdin pipeline is guarded behind INVOKED_DIRECTLY
// so importing it here runs no spawn / no stdin / no exit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  hasRecallKeyword,
  precheckCoversPrompt,
  renderRecallBlock,
} from "./memory-rag-inject.mjs";
import { runMemoryIndexSearch } from "../../scripts/lib/memory-index-search-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = join(HERE, "memory-rag-inject.mjs");
const HOOK_SRC = readFileSync(HOOK_PATH, "utf8");

// ----- (1) NO SUBPROCESS: the whole point of the unit ----------------------

test("source no longer spawns cmd.exe / tsx / a temp .mts subprocess", () => {
  // The retired implementation shelled out via child_process.spawn -> cmd.exe
  // -> tsx -> a temp bootstrap .mts. None of that CODE may remain. We strip line
  // comments + block comments first so prose describing what was retired (this
  // file's own header docs the retirement) cannot trip the assertions — only
  // executable source is checked.
  const code = HOOK_SRC
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments (keep :// in urls)
  assert.ok(!/from\s+["']node:child_process["']/.test(code), "must not import node:child_process");
  assert.ok(!/\bspawn\s*\(/.test(code), "must not call spawn(");
  assert.ok(!/\bexecFileSync?\s*\(/.test(code), "must not call exec/execFile");
  assert.ok(!/cmd\.exe/i.test(code), "must not invoke cmd.exe");
  assert.ok(!/writeFileSync\s*\([^)]*\.mts/.test(code), "must not write a temp .mts bootstrap");
  assert.ok(!/import\([^)]*ObsidianMemoryRagEngine/.test(code), "must not import the never-existent engine");
  assert.ok(!/pathToFileURL/.test(code), "must not dynamic-import an engine module");
});

test("source imports the shared pure-core search lib", () => {
  assert.match(
    HOOK_SRC,
    /import\s*\{\s*runMemoryIndexSearch\s*\}\s*from\s*["'][^"']*memory-index-search-lib\.mjs["']/,
    "must import runMemoryIndexSearch from memory-index-search-lib.mjs",
  );
});

// ----- (2) recall-keyword gate ---------------------------------------------

test("hasRecallKeyword: fires on each canonical recall keyword", () => {
  for (const kw of ["remember", "recall", "previous", "last time", "earlier", "prior", "before", "context from"]) {
    assert.equal(hasRecallKeyword(`please ${kw} the post processor decision`), true, `keyword: ${kw}`);
  }
});

test("hasRecallKeyword: case-insensitive", () => {
  assert.equal(hasRecallKeyword("RECALL how we wired it"), true);
  assert.equal(hasRecallKeyword("What did we decide PREVIOUSLY"), true); // 'previous' is a substring of 'previously'
});

test("hasRecallKeyword: no false-fire on a plain non-recall prompt", () => {
  assert.equal(hasRecallKeyword("build me a new dispatcher action for milling"), false);
  assert.equal(hasRecallKeyword("optimize the speed and feed for this tool"), false);
});

test("hasRecallKeyword: rejects empty/null/non-string", () => {
  assert.equal(hasRecallKeyword(""), false);
  assert.equal(hasRecallKeyword(null), false);
  assert.equal(hasRecallKeyword(undefined), false);
  assert.equal(hasRecallKeyword(42), false);
});

// ----- (3) dedup deferral vs memory-index-precheck-inject ------------------

test("precheckCoversPrompt: defers when precheck enabled (default) and enough tokens", () => {
  // precheck default-on, default min-tokens=2 -> a 2-token recall prompt is covered.
  assert.equal(precheckCoversPrompt(2, {}), true);
  assert.equal(precheckCoversPrompt(5, {}), true);
});

test("precheckCoversPrompt: does NOT defer when below precheck min-token gate", () => {
  assert.equal(precheckCoversPrompt(1, {}), false);
  assert.equal(precheckCoversPrompt(0, {}), false);
});

test("precheckCoversPrompt: does NOT defer when precheck is disabled (this hook is the fallback)", () => {
  assert.equal(precheckCoversPrompt(5, { PRISM_MEMORY_INDEX_INJECT: "0" }), false);
});

test("precheckCoversPrompt: honors a non-default precheck min-token gate", () => {
  // If precheck requires 4 tokens, a 3-token prompt is NOT covered -> rag fires.
  assert.equal(precheckCoversPrompt(3, { PRISM_MEMORY_INDEX_MIN_TOKENS: "4" }), false);
  assert.equal(precheckCoversPrompt(4, { PRISM_MEMORY_INDEX_MIN_TOKENS: "4" }), true);
});

// ----- (4) injection output equivalent to the shared lib -------------------

test("renderRecallBlock: renders exactly the shared-lib hits, with a distinct header", () => {
  // Drive both the render and the equivalence assertion off the SAME lib output,
  // so we prove the hook surfaces precisely what runMemoryIndexSearch returns.
  const { tokens, hits } = runMemoryIndexSearch("recall the slot worktree commit discipline", { topK: 3 });
  const block = renderRecallBlock(tokens, hits);

  // Distinct from the precheck injector's "Memory vault pre-search" header so
  // the two surfaces are never byte-identical (the dedup intent, fallback path).
  assert.match(block, /## 🧠 Memory recall/);
  assert.ok(!block.includes("Memory vault pre-search"), "must not duplicate the precheck header");

  // Every lib hit must appear in the rendered block, in the lib's order.
  let cursor = 0;
  for (const h of hits) {
    const needle = `[[${h.name}]]`;
    const idx = block.indexOf(needle, cursor);
    assert.ok(idx !== -1, `hit ${h.name} must be rendered`);
    assert.ok(idx >= cursor, `hits must render in lib order (${h.name})`);
    cursor = idx + needle.length;
    // namespace + score are surfaced too
    assert.ok(block.includes(`[${h.namespace}]`), `namespace ${h.namespace} surfaced`);
  }
  // Query tokens echoed for transparency
  assert.ok(block.includes(tokens.join(", ")), "query tokens echoed");
});

test("renderRecallBlock: handles a synthetic hit set deterministically (no fs dependence)", () => {
  const tokens = ["worktree", "commit"];
  const hits = [
    { namespace: "feedback", name: "feedback_commit_to_slot_worktree", score: 9.5, description: "slot-worktree commit discipline" },
    { namespace: "reference", name: "reference_slot_worktree_activation", score: 6.0, description: "" },
  ];
  const block = renderRecallBlock(tokens, hits);
  assert.match(block, /top 2 vault hits/);
  assert.match(block, /\[feedback\] \[\[feedback_commit_to_slot_worktree\]\] \(score: 9\.5\)/);
  assert.match(block, /\[reference\] \[\[reference_slot_worktree_activation\]\] \(score: 6\.0\)/);
  // no-description hit renders without a trailing em-dash blob
  assert.ok(!/\[\[reference_slot_worktree_activation\]\] \(score: 6\.0\) —/.test(block));
  assert.match(block, /worktree, commit/);
});
