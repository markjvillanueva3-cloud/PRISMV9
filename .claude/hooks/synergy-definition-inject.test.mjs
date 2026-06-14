// tier: T2
// Tests for synergy-definition-inject.mjs (operator synergy-definition directive).
// Run: node --test .claude/hooks/synergy-definition-inject.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSynergyContext } from "./synergy-definition-inject.mjs";

test("injects on 'synergy'", () => {
  const c = buildSynergyContext("please synergy the post-processor galaxy");
  assert.ok(c && c.includes("all-substrates directive"));
  assert.ok(c.includes("11-leg PSN") && c.includes("Hermes") && c.includes("model-switch"));
});

test("injects on synergize / synergized / synergizing (verb forms)", () => {
  for (const w of ["synergize", "synergized", "synergizing", "synergistic", "synergies"]) {
    assert.ok(buildSynergyContext(`go ${w} it`), `should match ${w}`);
  }
});

test("does NOT inject when the word is absent", () => {
  assert.equal(buildSynergyContext("build the lathe post processor"), null);
  assert.equal(buildSynergyContext("optimize tokens"), null);
});

test("word-boundary: does not false-match a substring inside another word", () => {
  // 'synergetics' would match \bsynerg... so we accept it; but 'resynergize' has a boundary issue --
  // \b before 'synerg' requires a non-word char, so 'resynergize' should NOT match (no boundary).
  assert.equal(buildSynergyContext("resynergizeXYZ"), null);
});

test("tolerates null / non-string / empty input (no throw)", () => {
  assert.equal(buildSynergyContext(null), null);
  assert.equal(buildSynergyContext(42), null);
  assert.equal(buildSynergyContext(""), null);
  assert.equal(buildSynergyContext(undefined), null);
});

test("the injected block names a bounded apply-loop with a done-signal (anti unbounded-rewrite)", () => {
  const c = buildSynergyContext("synergize everything");
  assert.ok(c.includes("SCOPE"));
  assert.ok(c.toLowerCase().includes("done-signal"));
  assert.ok(c.includes("never as an unbounded fleet rewrite") || c.includes("unbounded fleet rewrite"));
});
