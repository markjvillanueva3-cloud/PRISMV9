// Test -- stage-hermes-knowledge-tips.mjs pure helpers (the wave-3 generalization).
// Covers the new glob discovery (discoverSpecs) + the [CITE?] confidence down-weight.
// Run: node scripts/stage-hermes-knowledge-tips.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverSpecs, confidenceFor } from "./stage-hermes-knowledge-tips.mjs";

// -- discoverSpecs: GLOB the specs dir, derive wave from filename, sort by wave --
test("discoverSpecs: globs HERMES-KNOWLEDGE-ENRICHMENT-*.md, derives wave, sorts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "specs-"));
  const dir = path.join(root, "state", "shared", "specs");
  fs.mkdirSync(dir, { recursive: true });
  // out of order + a WAVE3 + the PRIMARY-DOMAINS baseline (wave 1) + a decoy non-match
  fs.writeFileSync(path.join(dir, "HERMES-KNOWLEDGE-ENRICHMENT-WAVE3-2026-06-30.md"), "# w3");
  fs.writeFileSync(path.join(dir, "HERMES-KNOWLEDGE-ENRICHMENT-PRIMARY-DOMAINS-2026-06-29.md"), "# w1");
  fs.writeFileSync(path.join(dir, "HERMES-KNOWLEDGE-ENRICHMENT-WAVE2-2026-06-29.md"), "# w2");
  fs.writeFileSync(path.join(dir, "SOME-OTHER-SPEC.md"), "# not a hermes spec");
  const specs = discoverSpecs(root);
  assert.equal(specs.length, 3);                          // decoy excluded
  assert.deepEqual(specs.map((s) => s.wave), [1, 2, 3]);  // PRIMARY-DOMAINS=1, sorted ascending
  assert.match(specs[0].path, /PRIMARY-DOMAINS/);         // wave 1 first
  assert.match(specs[2].file, /WAVE3/);                   // wave 3 last
  fs.rmSync(root, { recursive: true, force: true });
});
test("discoverSpecs: a future WAVE4 auto-flows without code change (durability)", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "specs4-"));
  const dir = path.join(root, "state", "shared", "specs");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "HERMES-KNOWLEDGE-ENRICHMENT-WAVE4-2026-07-15.md"), "# w4");
  const specs = discoverSpecs(root);
  assert.equal(specs.length, 1);
  assert.equal(specs[0].wave, 4);                          // parsed from WAVE4 -> stable hk-w4-* ids
  fs.rmSync(root, { recursive: true, force: true });
});
test("discoverSpecs: missing specs dir -> [] (never throws)", () => {
  assert.deepEqual(discoverSpecs("/no/such/root"), []);
});

// -- confidenceFor: tag -> confidence, with the [CITE?] down-weight --
test("confidenceFor: [C]=70, [N]=55, [ARITH?]=40, default=50", () => {
  assert.equal(confidenceFor("[C]"), 70);
  assert.equal(confidenceFor("[N]"), 55);
  assert.equal(confidenceFor("[ARITH?]"), 40);
  assert.equal(confidenceFor(""), 50);
  assert.equal(confidenceFor(null), 50);
});
test("confidenceFor: [CITE?] caps at 45 (citation-unverified is weaker recall)", () => {
  assert.equal(confidenceFor("[N] [CITE?]"), 45);         // 55 -> capped 45
  assert.equal(confidenceFor("[C] [CITE?]"), 45);         // 70 -> capped 45
  assert.equal(confidenceFor("[ARITH?] [CITE?]"), 40);    // 40 already below 45 -> stays 40 (min)
});
