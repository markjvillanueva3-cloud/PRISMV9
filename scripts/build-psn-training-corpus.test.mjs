#!/usr/bin/env node
/**
 * build-psn-training-corpus.test.mjs — pure-helper coverage for the PSN
 * training-corpus orchestrator. The CLI main() does real fs scans + graph
 * load; those are exercised by the dry-run + the live build run. These
 * tests pin only the pure-input-output helpers against synthetic fixtures.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  extractGraphFeatures,
  extractMemoryDoctrines,
  extractWikiCorpus,
  extractTribalRows,
  extractEngineFeatures,
  extractAlgorithmCorpus,
  extractFormulaCorpus,
  extractPrismAiCorpus,
  hasHeapFlag,
  shouldReexecForHeap,
} from "./build-psn-training-corpus.mjs";

const SCRIPT = fileURLToPath(new URL("./build-psn-training-corpus.mjs", import.meta.url));

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "psn-corpus-"));
}

test("extractGraphFeatures — computes in/out degree + flags ghost status", () => {
  const graph = {
    nodes: [
      { id: "n1", layer: "L7", status: "built" },
      { id: "n2", layer: "L8", status: "ghost.unwired" },
      { id: "ghost.x", layer: "L9", status: "ghost" },
    ],
    edges: [
      { from: "n1", to: "n2", type: "contains" },
      { from: "n1", to: "ghost.x", type: "bridges" },
      { from: "n2", to: "ghost.x", type: "bridges" },
    ],
  };
  const rows = extractGraphFeatures(graph);
  assert.equal(rows.length, 3);
  const byId = Object.fromEntries(rows.map(r => [r.node_id, r]));
  assert.equal(byId.n1.out_degree, 2);
  assert.equal(byId.n1.in_degree, 0);
  assert.equal(byId.n2.in_degree, 1);
  assert.equal(byId.n2.out_degree, 1);
  assert.equal(byId.n2.is_ghost, true);
  assert.equal(byId["ghost.x"].is_ghost, true);
  assert.equal(byId.n1.is_ghost, false);
});

test("extractGraphFeatures — fail-soft on missing fields", () => {
  assert.deepEqual(extractGraphFeatures(null), []);
  assert.deepEqual(extractGraphFeatures({}), []);
  assert.deepEqual(extractGraphFeatures({ nodes: [], edges: [] }), []);
});

test("extractMemoryDoctrines — walks 5 type subdirs + strips frontmatter", () => {
  const root = tmpRoot();
  for (const sub of ["feedback", "reference", "project", "user", "patterns"]) {
    fs.mkdirSync(path.join(root, sub));
  }
  fs.writeFileSync(path.join(root, "feedback", "feedback_test_rule.md"), "---\nname: x\n---\n# Test rule\nThe doctrine body.\n");
  fs.writeFileSync(path.join(root, "reference", "reference_test_data.md"), "no frontmatter here, just body");
  fs.writeFileSync(path.join(root, "feedback", "not_md.txt"), "should be ignored");

  const rows = extractMemoryDoctrines(root);
  assert.equal(rows.length, 2);
  const fb = rows.find(r => r.slug === "feedback_test_rule");
  assert.equal(fb.leg, "obsidian-brain");
  assert.equal(fb.type, "feedback");
  assert.equal(fb.first_line, "# Test rule"); // frontmatter stripped, first non-empty line is the heading
  const ref = rows.find(r => r.slug === "reference_test_data");
  assert.equal(ref.leg, "memories");
  assert.equal(ref.type, "reference");

  fs.rmSync(root, { recursive: true, force: true });
});

test("extractMemoryDoctrines — fail-soft on missing root", () => {
  assert.deepEqual(extractMemoryDoctrines("/nonexistent-xyz"), []);
});

test("extractWikiCorpus — recursive .md walk + size/mtime metadata", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "sub"));
  fs.writeFileSync(path.join(root, "top.md"), "top file");
  fs.writeFileSync(path.join(root, "sub", "nested.md"), "nested content here");
  fs.writeFileSync(path.join(root, "sub", "ignored.txt"), "wrong ext");

  const rows = extractWikiCorpus(root);
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.leg === "wiki"));
  assert.ok(rows.every(r => typeof r.size_bytes === "number" && r.size_bytes > 0));
  assert.ok(rows.every(r => typeof r.mtime === "string"));

  fs.rmSync(root, { recursive: true, force: true });
});

test("extractTribalRows — flags has_embedding + dim correctly", () => {
  const root = tmpRoot();
  const idxPath = path.join(root, "idx.json");
  fs.writeFileSync(idxPath, JSON.stringify({
    entries: [
      { id: "wiki:foo", source: "wiki", domain: "cam", title: "Foo", text: "body of foo", embedding: new Array(768).fill(0.1) },
      { id: "tribal:bar", source: "tribal", domain: "lathe", title: "Bar", text: "body of bar" }, // no embedding
    ],
  }));
  const rows = extractTribalRows(idxPath);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].has_embedding, true);
  assert.equal(rows[0].embedding_dim, 768);
  assert.equal(rows[1].has_embedding, false);
  assert.equal(rows[1].embedding_dim, 0);

  fs.rmSync(root, { recursive: true, force: true });
});

test("extractTribalRows — fail-soft on missing file", () => {
  assert.deepEqual(extractTribalRows("/nonexistent.json"), []);
});

test("extractEngineFeatures — filters to engine nodes only", () => {
  const graph = {
    nodes: [
      { id: "eng.kienzle", layer: "L7", label: "Kienzle", status: "built" },
      { id: "core.scripts", layer: "L6", label: "scripts", status: "built" },
      { id: "L7-engine-something", layer: "L7", subgroup: "engine", label: "Other", status: "built" },
    ],
    edges: [],
  };
  const rows = extractEngineFeatures(graph);
  assert.ok(rows.length >= 1);
  assert.ok(rows.every(r => r.leg === "engines"));
  assert.ok(rows.some(r => r.id === "eng.kienzle"));
});

test("extractAlgorithmCorpus — walks .ts skips .test.ts + extracts docstring", () => {
  const root = tmpRoot();
  fs.writeFileSync(path.join(root, "Foo.ts"), "/** Foo algorithm — does foo things. */\nexport class Foo {}");
  fs.writeFileSync(path.join(root, "Foo.test.ts"), "// test file should skip");
  fs.writeFileSync(path.join(root, "README.md"), "wrong ext");

  const rows = extractAlgorithmCorpus(root);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Foo");
  assert.match(rows[0].doc_excerpt, /Foo algorithm/);

  fs.rmSync(root, { recursive: true, force: true });
});

test("extractFormulaCorpus + extractPrismAiCorpus — graph-derived filters", () => {
  const graph = {
    nodes: [
      { id: "formula.kc11", layer: "L9", label: "kc1.1", status: "built" },
      { id: "reg.knowledgebaseregistry.entry.kb-uni-algos", layer: "L10", label: "KB Uni Algos", status: "built" },
      { id: "disp.aireasoningdispatcher.action.ai_reason", layer: "L10", label: "AI Reason", status: "built" },
      { id: "core.unrelated", layer: "L6", label: "Other", status: "built" },
    ],
    edges: [],
  };
  const formulas = extractFormulaCorpus(graph);
  assert.ok(formulas.some(r => r.id === "formula.kc11"));
  assert.ok(formulas.every(r => r.leg === "formulas"));

  const prismAi = extractPrismAiCorpus(graph);
  assert.equal(prismAi.length, 2);
  assert.ok(prismAi.every(r => r.leg === "prism-ai"));
});

// --- heap-guard (OOM regression 2026-06-25, slot:papa) ---

// The bare-launch E2E loads the ~550MB graph + builds ~568K rows; give it room.
const HEAP_E2E_TIMEOUT_MS = 240000;

test("hasHeapFlag -- detects an explicit --max-old-space-size in execArgv", () => {
  assert.equal(hasHeapFlag(["--max-old-space-size=16384"]), true);
  assert.equal(hasHeapFlag(["--max-old-space-size=8192", "--inspect"]), true);
  assert.equal(hasHeapFlag([]), false);
  assert.equal(hasHeapFlag(["--inspect"]), false);
  assert.equal(hasHeapFlag(null), false);
});

test("shouldReexecForHeap -- re-execs on a bare default launch (the OOM path)", () => {
  // bare `node build-psn-training-corpus.mjs` must bump the heap before the graph load
  assert.equal(shouldReexecForHeap([], {}, []), true);
  // --dry-run STILL loads the full graph -> not a cheap-mode skip
  assert.equal(shouldReexecForHeap(["--dry-run"], {}, []), true);
});

test("shouldReexecForHeap -- does NOT re-exec when already bumped / inside child / opted out", () => {
  assert.equal(shouldReexecForHeap([], { PRISM_PSN_CORPUS_REEXEC: "1" }, []), false);
  assert.equal(shouldReexecForHeap([], { PRISM_PSN_CORPUS_NO_REEXEC: "1" }, []), false);
  assert.equal(shouldReexecForHeap([], {}, ["--max-old-space-size=16384"]), false);
});

test("entry self-reexec prevents the OOM on a bare default launch (E2E)", () => {
  // Pre-fix this FATAL'd with "Ineffective mark-compacts near heap limit" at ~378MB
  // even on --dry-run. The entry guard must re-exec with a heap bump so a bare
  // `node build-psn-training-corpus.mjs --dry-run` (NO --max-old-space-size, clean
  // env, NODE_OPTIONS scrubbed) completes 0 and never OOMs. FAILS if the guard is removed.
  const env = { ...process.env };
  delete env.PRISM_PSN_CORPUS_REEXEC; // ensure we exercise the re-exec path
  delete env.NODE_OPTIONS;            // ensure no ambient heap bump masks the test
  const r = spawnSync(process.execPath, [SCRIPT, "--dry-run"], {
    encoding: "utf8", env, timeout: HEAP_E2E_TIMEOUT_MS,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  assert.ok(!/heap out of memory|Ineffective mark-compacts/i.test(out), `must not OOM; tail: ${out.slice(-400)}`);
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}; tail: ${out.slice(-400)}`);
});
