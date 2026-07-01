#!/usr/bin/env node
// Real-fixture tests for galaxy-brain-startup-inject (HERMES-ZULU-A06 SessionStart consumer).
// node:test (repo convention for .mjs hooks). Run: node galaxy-brain-startup-inject.test.mjs
// No mocks (R9): a real temp master-MEMORY.md fixture + a real empty prismRoot exercise the
// genuine readGalaxyBrain integration. Reference-value asserts, not toBeDefined stubs.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveSlotName, buildStartupInjection } from "./galaxy-brain-startup-inject.mjs";

// ---- fixtures -------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gbsi-"));
const EMPTY_ROOT = path.join(tmp, "empty-root");           // prismRoot with NO galaxy files
fs.mkdirSync(EMPTY_ROOT, { recursive: true });
const MASTER = path.join(tmp, "MEMORY.md");
fs.writeFileSync(MASTER, [
  "# PRISM Project Memory",
  "### Galaxy brain back-pointers",
  "- [galaxy:hermes-zulu] mcp-server/src/engines/hermes-zulu/MEMORY.md -- orchestration substrate",
  "- [galaxy:quoting] mcp-server/src/engines/quoting/MEMORY.md -- print-to-quote",
  "- [galaxy:mill] mcp-server/src/engines/mill/MEMORY.md -- milling wizard",
  "- [galaxy:pdf-corpus-mill] mcp-server/src/engines/pdf-corpus-mill/MEMORY.md -- mill PDFs",
  "",
].join("\n"), "utf8");
const NO_MASTER = path.join(tmp, "does-not-exist.md");

const slotsDoc = { slots: {
  bravo: { chatId: "claude-abc12345" },
  november: { chatId: "claude-nov00000" },
} };

// ---- resolveSlotName ------------------------------------------------------
test("resolveSlotName: exact chatId match", () => {
  assert.equal(resolveSlotName("claude-abc12345", slotsDoc), "bravo");
});
test("resolveSlotName: stable-id short form (full uuid starts-with short hex)", () => {
  assert.equal(resolveSlotName("abc12345-fb5e-7000-aaaa-bbbbbbbbbbbb", slotsDoc), "bravo");
});
test("resolveSlotName: no match -> null", () => {
  assert.equal(resolveSlotName("claude-zzzzzzzz", slotsDoc), null);
});
test("resolveSlotName: null/empty inputs -> null (adversarial)", () => {
  assert.equal(resolveSlotName(null, slotsDoc), null);
  assert.equal(resolveSlotName("claude-abc12345", null), null);
  assert.equal(resolveSlotName("", slotsDoc), null);
  assert.equal(resolveSlotName("claude-abc12345", {}), null);
});

// ---- buildStartupInjection (happy) ----------------------------------------
test("buildStartupInjection: happy -- bravo->hermes-zulu, master back-pointer present", () => {
  const out = buildStartupInjection({
    sessionId: "claude-abc12345", slotsDoc, prismRoot: EMPTY_ROOT, masterMemoryPath: MASTER,
  });
  assert.ok(typeof out === "string", "emits a string card");
  assert.match(out, /Galaxy master-brain -- hermes-zulu \(slot bravo, compound recall @ SessionStart\)/);
  assert.match(out, /galaxy-brain: hermes-zulu \(compound recall\)/);
  assert.match(out, /MASTER brain: - \[galaxy:hermes-zulu\]/, "carries the exact back-pointer row");
  // 4 distinct galaxies in the fixture -> cross-recall count exactly 4.
  assert.match(out, /fleet knows 4 galaxies/);
  assert.match(out, /PRISM_GALAXY_BRAIN_STARTUP_DISABLE=1/, "carries the disable knob");
});

test("buildStartupInjection: back-pointer anchored -- 'mill' never matches 'pdf-corpus-mill'", () => {
  // Resolve a slot mapped to mill and confirm we get the mill row, not the substring trap.
  const millSlots = { slots: { foxtrot: { chatId: "claude-fox11111" } } };
  const out = buildStartupInjection({
    sessionId: "claude-fox11111", slotsDoc: millSlots, prismRoot: EMPTY_ROOT, masterMemoryPath: MASTER,
  });
  assert.match(out, /MASTER brain: - \[galaxy:mill\] mcp-server\/src\/engines\/mill\//);
  assert.doesNotMatch(out, /pdf-corpus-mill\/MEMORY/, "must not pick the pdf-corpus-mill row");
});

// ---- buildStartupInjection (failure / fail-soft) --------------------------
test("buildStartupInjection: unmapped slot (november) -> null", () => {
  assert.equal(buildStartupInjection({
    sessionId: "claude-nov00000", slotsDoc, prismRoot: EMPTY_ROOT, masterMemoryPath: MASTER,
  }), null);
});
test("buildStartupInjection: unresolvable session -> null", () => {
  assert.equal(buildStartupInjection({
    sessionId: "claude-zzzzzzzz", slotsDoc, prismRoot: EMPTY_ROOT, masterMemoryPath: MASTER,
  }), null);
});
test("buildStartupInjection: master absent AND no local synthesis -> null (no noise)", () => {
  assert.equal(buildStartupInjection({
    sessionId: "claude-abc12345", slotsDoc, prismRoot: EMPTY_ROOT, masterMemoryPath: NO_MASTER,
  }), null);
});
test("buildStartupInjection: master absent but LOCAL synthesis present -> still emits", () => {
  // Build a prismRoot that HAS a local synthesis file for hermes-zulu, master absent.
  const root2 = path.join(tmp, "with-synth");
  const synthDir = path.join(root2, "knowledge", "memories", "patterns");
  fs.mkdirSync(synthDir, { recursive: true });
  fs.writeFileSync(path.join(synthDir, "hermes-zulu_synthesis.md"),
    "# hermes-zulu synthesis\nReal compounded patterns for the orchestration substrate.\n", "utf8");
  const out = buildStartupInjection({
    sessionId: "claude-abc12345", slotsDoc, prismRoot: root2, masterMemoryPath: NO_MASTER,
  });
  assert.ok(typeof out === "string", "emits when local synthesis exists even with absent master");
  assert.match(out, /LOCAL synthesis \(\d+B\): .*orchestration substrate/);
  assert.match(out, /MASTER brain: ABSENT/);
});
test("buildStartupInjection: empty opts -> null (adversarial)", () => {
  assert.equal(buildStartupInjection({}), null);
  assert.equal(buildStartupInjection(), null);
});
