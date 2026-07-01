#!/usr/bin/env node
/**
 * psn-prompt-checklist-inject.test.mjs — pin gating heuristic + checklist
 * render markers for U-PSN-PROMPT-CHECKLIST-INJECT (golf 2026-05-24).
 *
 * Strategy: import the pure functions (no stdin / process.exit dependencies)
 * and verify shouldInject's gating decisions + buildChecklist's required
 * markers. The full hook integration (stdin → emit) is exercised by the
 * harness in production; tests cover the load-bearing pure logic.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { shouldInject, buildChecklist } from "./psn-prompt-checklist-inject.mjs";

/* ---------- shouldInject ---------- */

describe("shouldInject — gating heuristic", () => {
  // Fire-path tests pin { enabled: true }: the module-level ENABLED constant is
  // captured from PRISM_PSN_CHECKLIST_INJECT_DISABLE at IMPORT time, so a deploy
  // that sets the kill-switch (as this fleet does) would otherwise make every
  // fire-path assertion env-dependent. The ambient-disable path is covered by the
  // "SKIPS when knob disabled" case below; this tests the GATING LOGIC hermetically.
  it("FIRES on a normal substantive prompt", () => {
    assert.equal(shouldInject("can you update the system-viz skill to surface PSN legs", { enabled: true }), true);
  });

  it("SKIPS when knob disabled (opts override)", () => {
    assert.equal(shouldInject("a long enough prompt that would normally fire", { enabled: false }), false);
  });

  it("SKIPS on empty / whitespace / non-string", () => {
    assert.equal(shouldInject(""), false);
    assert.equal(shouldInject("   "), false);
    assert.equal(shouldInject(null), false);
    assert.equal(shouldInject(undefined), false);
    assert.equal(shouldInject(42), false);
  });

  it("SKIPS on prompts shorter than the minLen floor (default 15)", () => {
    // "ok thanks!" = 10 chars — below default 15
    assert.equal(shouldInject("ok thanks!"), false);
    assert.equal(shouldInject("yes"), false);
  });

  it("HONORS custom opts.minLen", () => {
    assert.equal(shouldInject("short!", { minLen: 5, enabled: true }), true); // 6 > 5
    assert.equal(shouldInject("longer prompt!", { minLen: 100, enabled: true }), false); // < 100
  });

  it("SKIPS a bare slash-command (already routed)", () => {
    assert.equal(shouldInject("/checkin-golf"), false);
    assert.equal(shouldInject("/system-viz"), false);
    assert.equal(shouldInject("/fleet-reaper  "), false); // trailing ws, still bare
  });

  it("FIRES on a slash-command WITH work-order args", () => {
    assert.equal(shouldInject("/checkin-golf /loop [5m] /goal build the auto-invoke hook", { enabled: true }), true);
    assert.equal(shouldInject("/loop 5m /goal high-roi-build", { enabled: true }), true);
  });

  it("BOUNDARY: exact minLen passes the threshold check", () => {
    // length 15, default minLen 15 — passes (the rule is `< minLen` skips)
    assert.equal(shouldInject("123456789012345", { enabled: true }), true);
  });
});

/* ---------- buildChecklist ---------- */

describe("buildChecklist — render markers", () => {
  it("includes the stable header anchor", () => {
    const out = buildChecklist("anything");
    assert.match(out, /## 🎯 PSN-CHECKLIST/);
  });

  it("U-PSN-CHECKLIST-DEDUP (2026-05-25 alpha): NO prompt-length line — dedup requires byte-identical body across prompts", () => {
    // Per-prompt content would defeat session-keyed content-hash dedup. The
    // model can see prompt length directly from the prompt itself.
    const out1 = buildChecklist("hello world!");      // 12 chars
    const out2 = buildChecklist("a different prompt of different length"); // 38 chars
    assert.equal(out1, out2, "checklist must be byte-identical for any prompt (enables session-keyed dedup)");
    assert.doesNotMatch(out1, /Prompt length: \d+ chars/, "no per-prompt-length line");
  });

  it("lists ALL 6 checklist items (forcing-function items)", () => {
    const out = buildChecklist("test");
    assert.match(out, /Master-index pre-search hits/);
    assert.match(out, /Wiki precheck entry exists/);
    assert.match(out, /Memory-vault hit relevant/);
    assert.match(out, /Could a `prism_\*` MCP dispatcher answer this/);
    assert.match(out, /duplicationGuardEngine\.mustCheckBeforeCreating/);
    assert.match(out, /PSN leg/);
  });

  it("names all 11 PSN legs (canonical list) so the model can't claim ignorance", () => {
    const out = buildChecklist("test");
    for (const leg of ["Obsidian brain", "PRISM OS", "Wiki", "Memories", "Tribal", "System Viz", "Engines", "Algorithms", "Formulas", "NN/GNN", "PRISM AI"]) {
      assert.ok(out.includes(leg), `must name PSN leg: ${leg}`);
    }
  });

  it("names the kill-switch knob (operator escape hatch)", () => {
    const out = buildChecklist("test");
    assert.match(out, /PRISM_PSN_CHECKLIST_INJECT_DISABLE=1/);
  });

  it("references the /system-viz skill as the PSN-legs catalog", () => {
    const out = buildChecklist("test");
    assert.match(out, /\/system-viz/);
    assert.match(out, /PSN-11-legs/);
  });

  it("ADVERSARIAL: handles non-string prompt without throwing", () => {
    // Be defensive — never throw from a hook even on null/undefined/non-string.
    // Body is now prompt-agnostic so the assertion just checks no-throw + header presence.
    const out = buildChecklist(null);
    assert.match(out, /## 🎯 PSN-CHECKLIST/);
    assert.doesNotMatch(out, /Prompt length/);
  });

  it("stays compact — under 1200 chars (token-budget guard)", () => {
    // PSN-CHECKLIST fires on EVERY substantive prompt. Hard ceiling so a
    // future edit can't balloon it past the token-savings target. Current
    // baseline ~900 chars; ceiling at 1200 leaves headroom.
    const out = buildChecklist("a representative-length operator prompt for measurement");
    assert.ok(out.length < 1200, `checklist length ${out.length} exceeds 1200-char ceiling`);
  });
});
