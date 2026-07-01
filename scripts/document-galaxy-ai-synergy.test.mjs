// Tests for buildAiSynergySection (U-GALAXY-AI-DISCOVERABILITY, slot:bravo 2026-06-14).
// R9: the generated section must (a) yield >=3 distinct recognized AI terms (clears the gap) and
// (b) tell the TRUTH about owner vs consumer (a false "consumer" on an owner = a lie, R12).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAiSynergySection, shouldTargetGalaxy } from "./document-galaxy-ai-synergy.mjs";
import { distinctAiTerms, DISCOVERABILITY_TERMS_FOR_FULL, GAP_FLOOR } from "./lib/ai-synergy-audit-lib.mjs";

test("consumer section: labelled consumer + carries the marker", () => {
  const s = buildAiSynergySection("quality", { aiEngineCount: 0 });
  assert.match(s, /## AI Synergy \(PSN leg #10\)/);
  assert.match(s, /consumer/i);
  assert.match(s, /aiEngineCount` 0/);
  assert.match(s, /quality/); // galaxy threaded into the bridge invocation
});

test("owner section cites REAL engines + dispatcher actions, not 'consumer' (R12 honesty)", () => {
  const s = buildAiSynergySection("wedm", {
    aiEngineCount: 14,
    engineExamples: ["WEDMLoRAAdapterEngine", "WEDMAnalogicalReasoningEngine"],
    dispatcherExamples: ["wedm_post_agie_generate"],
  });
  assert.match(s, /OWNS 14 AI engine/);
  assert.match(s, /WEDMLoRAAdapterEngine/);
  assert.match(s, /wedm_post_agie_generate/);
  assert.doesNotMatch(s, /\bconsumer\b/); // an owner must NOT be called a consumer
});

test("R9: BOTH variants yield >=3 distinct AI terms -> clear the discoverability bar", () => {
  for (const sig of [{ aiEngineCount: 0 }, { aiEngineCount: 5, engineExamples: ["FooDeepLearningEngine"] }]) {
    const terms = distinctAiTerms(buildAiSynergySection("g", sig));
    assert.ok(terms.size >= DISCOVERABILITY_TERMS_FOR_FULL, `expected >=${DISCOVERABILITY_TERMS_FOR_FULL}, got ${terms.size}: ${[...terms]}`);
    const claudeScore = Math.min(1, terms.size / DISCOVERABILITY_TERMS_FOR_FULL);
    assert.ok(0.6 * claudeScore + 0.4 * 0 >= GAP_FLOOR, "worst-case disc must clear GAP_FLOOR");
  }
});

test("domain angle threaded when known (consumer with a GALAXY_ANGLE entry)", () => {
  const s = buildAiSynergySection("business", { aiEngineCount: 0 });
  assert.match(s, /Domain angle:.*ERP/);
});

// --- shouldTargetGalaxy: the two selection modes (U-LORA-OWNER-COVERAGE) ---
const RICH = "this galaxy uses GNN and LoRA and RAG and neural embedding reasoning"; // >=3 distinct AI terms

test("discoverability mode: below the >=3-term bar -> target; at/above bar -> skip", () => {
  const owner = { signals: { aiEngineCount: 5 } };
  assert.equal(shouldTargetGalaxy(owner, "plain prose, zero ai vocabulary", "discoverability"), true);
  assert.equal(shouldTargetGalaxy(owner, RICH, "discoverability"), false); // already discoverable
});

test("lora-owner-coverage: marker-less OWNER is targeted EVEN above the discoverability bar", () => {
  // the exact case U-LORA-OWNER-COVERAGE exists for: mill/cad/cam/ai-training (>=3 terms, no marker)
  assert.equal(shouldTargetGalaxy({ signals: { aiEngineCount: 19 } }, RICH, "lora-owner-coverage"), true);
  assert.equal(shouldTargetGalaxy({ signals: { aiEngineCount: 19 } }, RICH, "discoverability"), false); // contrast: would be skipped
});

test("lora-owner-coverage: consumer (aiEngineCount 0) is NOT targeted -- no boilerplate padding (R12)", () => {
  assert.equal(shouldTargetGalaxy({ signals: { aiEngineCount: 0 } }, RICH, "lora-owner-coverage"), false);
  assert.equal(shouldTargetGalaxy({ signals: {} }, RICH, "lora-owner-coverage"), false); // missing count -> 0
});

test("marker already present -> never re-target in EITHER mode (idempotent)", () => {
  const withMarker = "intro text\n\n## AI Synergy (PSN leg #10)\n\nbody";
  assert.equal(shouldTargetGalaxy({ signals: { aiEngineCount: 19 } }, withMarker, "lora-owner-coverage"), false);
  assert.equal(shouldTargetGalaxy({ signals: { aiEngineCount: 0 } }, withMarker, "discoverability"), false);
});

test("non-string CLAUDE.md text -> false (defensive, never throws)", () => {
  assert.equal(shouldTargetGalaxy({ signals: { aiEngineCount: 5 } }, undefined, "lora-owner-coverage"), false);
});
