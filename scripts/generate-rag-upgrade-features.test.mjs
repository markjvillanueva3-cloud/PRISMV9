#!/usr/bin/env node
/**
 * generate-rag-upgrade-features.test.mjs — node:test suite for the
 * RAG-UPGRADE-MS0 system-viz augmentation generator.
 *
 * Run: node --test scripts/generate-rag-upgrade-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeId, parseStatusTable, generate,
  RAG_UNITS, RAG_ROOST_ID, STATE_STYLE,
} from "./generate-rag-upgrade-features.mjs";

// A minimal spec fixture with a Status table in the exact shape the live spec
// uses — emoji + word, then the next `##` section that must end the table.
const SPEC = `# RAG-UPGRADE-MS0

## Units
blah blah

## Status (live)

| Unit | State | Evidence |
|---|---|---|
| U-RAG-5 | ✅ DONE | eval harness |
| U-RAG-1 | ✅ DONE | \`e07edcbf76\` audit fix |
| U-RAG-2 | ✅ DONE | rerank in 4 hooks |
| U-RAG-3 | ⏳ PENDING | contextual retrieval |
| U-RAG-4 | 🟡 PARTIAL | edge-ordering done, synergy pending |
| U-RAG-6 | ⏸ DEFERRED | GPU embedder |

## Sequence
this line is past the table and must NOT be parsed | U-RAG-9 | DONE |
`;

// ── safeId ───────────────────────────────────────────────────────────────────
test("safeId: lowercases, spaces→dash, dashes collapse (underscores kept)", () => {
  assert.equal(safeId("U-RAG-2"), "u-rag-2");
  assert.equal(safeId("Foo  Bar"), "foo-bar");   // run of non-id chars → one dash
  assert.equal(safeId("a__b"), "a__b");          // `_` is a valid id char — kept
});

test("safeId: path-traversal chars are sanitized away (no `..` survives)", () => {
  // `.` and `/` are not in [a-z0-9_-] — the char-class replace strips them, so
  // a traversal sequence is neutralized before the explicit `..` guard.
  assert.equal(safeId("../etc"), "etc");
  assert.equal(safeId(".."), "x");               // collapses to empty → fallback
  assert.ok(!safeId("a/../b").includes(".."), "never emits a `..` fragment");
});

test("safeId: empty / null → 'x'", () => {
  assert.equal(safeId(""), "x");
  assert.equal(safeId(null), "x");
  assert.equal(safeId(undefined), "x");
});

// ── parseStatusTable ─────────────────────────────────────────────────────────
test("parseStatusTable: extracts every U-RAG row with state + evidence", () => {
  const m = parseStatusTable(SPEC);
  assert.equal(m.size, 6, "all 6 unit rows parsed");
  assert.equal(m.get("U-RAG-1").state, "done");
  assert.equal(m.get("U-RAG-3").state, "pending");
  assert.equal(m.get("U-RAG-4").state, "partial");
  assert.equal(m.get("U-RAG-6").state, "deferred");
  assert.match(m.get("U-RAG-1").evidence, /e07edcbf76/);
});

test("parseStatusTable: state matched on bare keyword (emoji-agnostic)", () => {
  // no emoji, lowercase keyword — must still resolve.
  const m = parseStatusTable("## Status\n| U-RAG-2 | done | x |\n");
  assert.equal(m.get("U-RAG-2").state, "done");
});

test("parseStatusTable: header + separator rows are NOT parsed as units", () => {
  const m = parseStatusTable(SPEC);
  // the `| Unit | State | Evidence |` and `|---|---|---|` rows have no U-RAG-N
  assert.ok(!m.has("Unit"));
});

test("parseStatusTable: stops at the next `## ` section", () => {
  const m = parseStatusTable(SPEC);
  // the `## Sequence` line carries a fake `| U-RAG-9 | DONE |` — must be ignored
  assert.ok(!m.has("U-RAG-9"), "rows after the Status section must not parse");
});

test("parseStatusTable: missing Status section → empty Map", () => {
  assert.equal(parseStatusTable("# Doc\n## Units\nno status here").size, 0);
});

test("parseStatusTable: non-string input → empty Map (no throw)", () => {
  assert.equal(parseStatusTable(null).size, 0);
  assert.equal(parseStatusTable(undefined).size, 0);
  assert.equal(parseStatusTable(42).size, 0);
});

test("parseStatusTable: unrecognized state keyword → 'unknown'", () => {
  const m = parseStatusTable("## Status\n| U-RAG-2 | ❓ MAYBE | x |\n");
  assert.equal(m.get("U-RAG-2").state, "unknown");
});

// ── generate ─────────────────────────────────────────────────────────────────
test("generate: emits roost + one child per unit (7 nodes)", () => {
  const { newNodes, stats } = generate(SPEC, []);
  assert.equal(newNodes.length, 7, "1 roost + 6 units");
  assert.equal(newNodes[0].id, RAG_ROOST_ID);
  assert.equal(newNodes[0].kind, "ghost-roost");
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.emitted, 6);
  assert.deepEqual(stats.byState, { done: 3, partial: 1, pending: 1, deferred: 1, unknown: 0 });
});

test("generate: children are color-coded by parsed state", () => {
  const { newNodes } = generate(SPEC, []);
  const byId = Object.fromEntries(newNodes.map((n) => [n.id, n]));
  assert.equal(byId["ghost.rag_upgrade.u-rag-2"].color, STATE_STYLE.done.color);
  assert.equal(byId["ghost.rag_upgrade.u-rag-2"].state, "done");
  assert.equal(byId["ghost.rag_upgrade.u-rag-3"].color, STATE_STYLE.pending.color);
  assert.equal(byId["ghost.rag_upgrade.u-rag-4"].color, STATE_STYLE.partial.color);
  assert.equal(byId["ghost.rag_upgrade.u-rag-6"].color, STATE_STYLE.deferred.color);
});

test("generate: every child carries parent + milestone + UNIT_LAYER", () => {
  const { newNodes } = generate(SPEC, []);
  for (const n of newNodes.slice(1)) {
    assert.equal(n.parent, RAG_ROOST_ID);
    assert.equal(n.milestone, "RAG-UPGRADE-MS0");
    assert.equal(n.kind, "rag-upgrade-unit");
    assert.equal(n.ghost, true);
  }
});

test("generate: a unit absent from the Status table → 'unknown' (gray), not dropped", () => {
  // spec with NO Status table — all 6 units still render, all unknown.
  const { newNodes, stats } = generate("# Doc\nno status", []);
  assert.equal(newNodes.length, 7, "roost + all 6 units still emitted");
  assert.equal(stats.byState.unknown, 6);
  for (const n of newNodes.slice(1)) {
    assert.equal(n.state, "unknown");
    assert.equal(n.color, STATE_STYLE.unknown.color);
  }
});

test("generate: idempotent — existing node ids are skipped", () => {
  const first = generate(SPEC, []);
  const allIds = first.newNodes.map((n) => n.id);
  const second = generate(SPEC, allIds);
  assert.equal(second.newNodes.length, 0, "re-run with existing ids emits nothing");
  assert.equal(second.stats.roostEmitted, 0);
  assert.equal(second.stats.skipped, 6);
});

test("generate: non-string spec → roost + 6 unknown units (fail-soft, no throw)", () => {
  const { newNodes } = generate(null, []);
  assert.equal(newNodes.length, 7);
  assert.equal(newNodes[0].id, RAG_ROOST_ID);
});

test("generate: child labels start with the unit id and are length-capped", () => {
  const { newNodes } = generate(SPEC, []);
  for (let i = 0; i < RAG_UNITS.length; i++) {
    const child = newNodes[i + 1];
    assert.ok(child.label.startsWith(RAG_UNITS[i].id + " · "));
    assert.ok(child.label.length <= 80);
  }
});
