// scripts/regen-wiki-index-meta.test.mjs
//
// OBSIDIAN-VAULT-OPS / U-VAULT-INDEX-META — tests for computeIndexMeta().
//
// Guards the surgical metadata-stamp fix for the frozen wiki/index.md: it must
// refresh last_verified + the bootstrap prose count IN PLACE without touching any
// entry line, must count entries from live `- [[slug]]` lines, must be idempotent,
// and must report (not silently succeed) when neither metadata line is present.
//
// Real reference assertions: exact stamped strings, exact entry counts, byte
// preservation of entry lines. No stubs.

import test from "node:test";
import assert from "node:assert/strict";
import { computeIndexMeta } from "./regen-wiki-index-meta.mjs";

const FIXTURE = `---
title: PRISM Wiki Index
category: meta
last_verified: 2026-05-08
author: hybrid
---

# PRISM Wiki Index

> LLM-maintained catalog.
Last bootstrap: 2026-05-08 — 770 entries total (575 engines + 96 dispatchers + 99 memories)

## architecture
- [[alpha-entry]] — first
- [[bravo-entry]] — second
- [[charlie-entry]] — third
`;

test("happy — stamps last_verified + bootstrap prose, counts 3 entries", () => {
  const { changed, next, entryCount, stampedFrontmatter, stampedProse } =
    computeIndexMeta(FIXTURE, "2026-06-08");
  assert.equal(changed, true);
  assert.equal(entryCount, 3, "counted the three `- [[ ]]` entry lines");
  assert.equal(stampedFrontmatter, true);
  assert.equal(stampedProse, true);
  assert.match(next, /^last_verified: 2026-06-08$/m);
  assert.match(next, /^Last refreshed: 2026-06-08 — 3 catalog entries/m);
  assert.doesNotMatch(next, /Last bootstrap:/, "stale bootstrap prose replaced");
});

test("entry bodies are byte-preserved — only metadata lines change", () => {
  const { next } = computeIndexMeta(FIXTURE, "2026-06-08");
  for (const line of ["- [[alpha-entry]] — first", "- [[bravo-entry]] — second", "- [[charlie-entry]] — third"]) {
    assert.ok(next.includes(line), `entry line preserved verbatim: ${line}`);
  }
  assert.ok(next.includes("## architecture"), "category header preserved");
  assert.ok(next.includes("# PRISM Wiki Index"), "title preserved");
});

test("idempotent — re-stamping an already-current file is a no-op", () => {
  const once = computeIndexMeta(FIXTURE, "2026-06-08").next;
  const twice = computeIndexMeta(once, "2026-06-08");
  assert.equal(twice.changed, false, "second run with same date makes no change");
  assert.equal(twice.next, once);
});

test("re-stamps a previously-refreshed file on a new date", () => {
  const day1 = computeIndexMeta(FIXTURE, "2026-06-08").next;
  const day2 = computeIndexMeta(day1, "2026-06-09");
  assert.equal(day2.changed, true);
  assert.match(day2.next, /^last_verified: 2026-06-09$/m);
  assert.match(day2.next, /^Last refreshed: 2026-06-09 — 3 catalog entries/m);
});

test("edge — zero entries counts 0, still stamps", () => {
  const empty = `---\nlast_verified: 2026-05-08\n---\n\n# PRISM Wiki Index\nLast bootstrap: 2026-05-08 — 770 entries total\n`;
  const { entryCount, next, changed } = computeIndexMeta(empty, "2026-06-08");
  assert.equal(entryCount, 0);
  assert.equal(changed, true);
  assert.match(next, /— 0 catalog entries/);
});

test("fail-loud signal — no metadata lines → stampedFrontmatter/Prose both false", () => {
  const noMeta = `# PRISM Wiki Index\n\n## architecture\n- [[x]] — y\n`;
  const { stampedFrontmatter, stampedProse, changed } = computeIndexMeta(noMeta, "2026-06-08");
  assert.equal(stampedFrontmatter, false);
  assert.equal(stampedProse, false);
  assert.equal(changed, false, "nothing stamped → caller exits non-zero (R12)");
});

test("adversarial — entry-like text in prose is NOT miscounted (only line-start `- [[`)", () => {
  const tricky = `---\nlast_verified: 2026-05-08\n---\nLast bootstrap: 2026-05-08 — 770 entries total\nSee also - [[inline-ref]] mid-sentence.\n- [[real-entry]] — counts\n`;
  const { entryCount } = computeIndexMeta(tricky, "2026-06-08");
  assert.equal(entryCount, 1, "only the line-start `- [[` counts, not the mid-sentence one");
});
