// Tests for backfill-memory-descriptions.mjs (U-SIERRA-MEMORY-DESC-BACKFILL, slot:sierra).
// The two pure seams -- classify + insertDescription -- carry the file-mutation risk, so they get
// reference-value tests incl. the BOM class bug that silently excluded memos from recall
// (U-MEMO-EMBED-BOM-FIX lesson) and YAML-injection escaping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, insertDescription } from "./backfill-memory-descriptions.mjs";

const FM = (inner) => `---\n${inner}\n---\n\nbody text\n`;

test("classify: description present -> has", () => {
  assert.equal(classify(FM('name: x\ndescription: "already here"')), "has");
});

test("classify: frontmatter without description -> missing", () => {
  assert.equal(classify(FM("name: x\nmetadata:\n  type: reference")), "missing");
});

test("classify: no frontmatter (MEMORY.md-style index) -> no-frontmatter", () => {
  assert.equal(classify("# PRISM Project Memory\n- [a](a.md)\n"), "no-frontmatter");
});

test("classify: BOM-prefixed frontmatter is still parsed (silent-exclusion class bug)", () => {
  assert.equal(classify("﻿" + FM("name: x\ndescription: y")), "has");
  assert.equal(classify("﻿" + FM("name: x")), "missing");
});

test("classify: description in BODY only does not count (frontmatter is the surface)", () => {
  assert.equal(classify(FM("name: x") + "description: fake\n"), "missing");
});

test("classify: non-string / unreadable -> read-failed", () => {
  assert.equal(classify(null), "read-failed");
});

test("insertDescription: lands right after the name: line", () => {
  const out = insertDescription(FM("name: my-memo\nmetadata:\n  type: reference"), "A summary.");
  assert.match(out, /name: my-memo\ndescription: "A summary\."\nmetadata:/);
  assert.equal(classify(out), "has");
});

test("insertDescription: no name line -> lands right after opening ---", () => {
  const out = insertDescription(FM("metadata:\n  type: reference"), "A summary.");
  assert.match(out, /^---\ndescription: "A summary\."\nmetadata:/);
});

test("insertDescription: preserves a leading BOM byte-exactly", () => {
  const out = insertDescription("﻿" + FM("name: x"), "S.");
  assert.equal(out.charCodeAt(0), 0xfeff);
  assert.equal(classify(out), "has");
});

test("insertDescription: escapes double quotes + backslashes + collapses newlines (YAML-safe)", () => {
  const out = insertDescription(FM("name: x"), 'He said "5\\8" bore\nnext line');
  assert.match(out, /description: "He said \\"5\\\\8\\" bore next line"/);
});

test("insertDescription: body below frontmatter is untouched byte-for-byte", () => {
  const src = FM("name: x") ;
  const out = insertDescription(src, "S.");
  const bodyIdx = src.indexOf("\n---\n");
  assert.equal(out.slice(out.indexOf("\n---\n")), src.slice(bodyIdx));
});

test("insertDescription: adversarial -- no frontmatter at all -> null, never a corrupted write", () => {
  assert.equal(insertDescription("plain text file\n", "S."), null);
});
