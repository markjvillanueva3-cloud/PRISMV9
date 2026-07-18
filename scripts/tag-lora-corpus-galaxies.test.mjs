// Tests for tag-lora-corpus-galaxies.mjs -- deterministic galaxy-tag recovery for the LoRA corpus.
// Run: node --test scripts/tag-lora-corpus-galaxies.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveGalaxy, galaxyDistribution } from "./tag-lora-corpus-galaxies.mjs";

test("deriveGalaxy -- bridge-reasoning: extracts the galaxy named in the instruction", () => {
  assert.equal(deriveGalaxy({ source: "bridge-reasoning-lora", instruction: "Answer this question about the PRISM academy galaxy, grounded ONLY in the provided context: ..." }), "academy");
  assert.equal(deriveGalaxy({ source: "bridge-reasoning-lora", instruction: "Answer this question about the PRISM agent-orchestration galaxy, grounded ..." }), "agent-orchestration", "hyphenated galaxy slug preserved");
});

test("deriveGalaxy -- cad-* sources -> 'cad' by construction", () => {
  assert.equal(deriveGalaxy({ source: "cad-ground-truth-feature-priors", instruction: "CAD generation from print -- blisk ..." }), "cad");
  assert.equal(deriveGalaxy({ source: "cad-fix-training-corrections", instruction: "" }), "cad");
  assert.equal(deriveGalaxy({ source: "cad-dimension-radii", instruction: "" }), "cad");
});

test("deriveGalaxy -- outcome-bus: dispatcher token -> galaxy", () => {
  assert.equal(deriveGalaxy({ source: "outcome-bus-recommendations", instruction: "PRISM speed_feed constrain. Inputs: machine=haas-vf-2. Provide the recommended parameters." }), "speed-feed");
  assert.equal(deriveGalaxy({ source: "outcome-bus-recommendations", instruction: "PRISM turning rough. Inputs: ..." }), "lathe", "turning dispatcher -> lathe galaxy");
  assert.equal(deriveGalaxy({ source: "outcome-bus-recommendations", instruction: "PRISM unknown_disp foo" }), null, "unknown dispatcher -> null (honest, not guessed)");
});

test("deriveGalaxy -- cross-cutting doctrine sources -> null (left UNTAGGED per the assembler _unclassified contract)", () => {
  // vault-feedback / wiki-canonical are fleet-wide doctrine, NOT galaxy-specific; the assembler
  // deliberately leaves them untagged so the per-galaxy splitter routes them to _unclassified.
  assert.equal(deriveGalaxy({ source: "vault-feedback-lora", instruction: "What is PRISM's rule about adopt ollama offload directives, and how should I apply it?" }), null);
  assert.equal(deriveGalaxy({ source: "wiki-canonical-pairs", instruction: "Explain the PRISM scrutiny gate." }), null);
});

test("deriveGalaxy -- unknown / invalid -> null (R12: leave untagged rather than guess)", () => {
  assert.equal(deriveGalaxy({ source: "mystery-source", instruction: "some unrelated text" }), null);
  assert.equal(deriveGalaxy(null), null);
  assert.equal(deriveGalaxy({}), null);
  assert.equal(deriveGalaxy("not an object"), null);
});

test("deriveGalaxy -- bridge instruction wins over a cross-cutting source name (most-specific first)", () => {
  // a row that is BOTH bridge-style AND from a cross-cutting source: the explicit galaxy wins.
  assert.equal(deriveGalaxy({ source: "vault-feedback-lora", instruction: "Answer this question about the PRISM wedm galaxy: ..." }), "wedm");
});

test("galaxyDistribution -- counts galaxy/domain, buckets missing as (untagged)", () => {
  const rows = [
    { galaxy: "cad" }, { galaxy: "cad" }, { domain: "mill" }, { source: "x" }, {},
  ];
  const d = galaxyDistribution(rows);
  assert.equal(d.get("cad"), 2);
  assert.equal(d.get("mill"), 1);
  assert.equal(d.get("(untagged)"), 2);
});
