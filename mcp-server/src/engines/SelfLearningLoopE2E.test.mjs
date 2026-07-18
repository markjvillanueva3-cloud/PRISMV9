// SelfLearningLoopE2E.test.mjs
// End-to-end round-trip test wiring all 3 self-learning engines.
// Per comprehensive-build directive: must invoke through the integration
// path, not only the engine singletons.

import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './TemplateApplicabilityClassifierEngine.mjs';
import { step, driveLoop, LOOP_STATES } from './SelfLearningLoopOrchestratorEngine.mjs';
import { computeCorpusDelta, shouldRetrain } from './OutcomeFeedbackWireEngine.mjs';

// Canonical template corpus for E2E (3 spanning materials).
const CORPUS = [
  { id: 'tA', material: 'aluminum',  operation: 'pocket-roughing', machine: 'haas-vf2',    toleranceClass: 'standard', geometryClass: 'prismatic' },
  { id: 'tS', material: 'stainless', operation: 'finish-contour',  machine: 'okuma-multus', toleranceClass: 'tight',    geometryClass: 'freeform'  },
  { id: 'tT', material: 'titanium',  operation: 'drilling',         machine: 'mazak-vtc',   toleranceClass: 'standard', geometryClass: 'prismatic' },
];

test('E2E: full loop drives an aluminum direct-hit query to retrain signal', () => {
  // Stage 1: classifier decides on a query that matches template tA exactly.
  const query = { ...CORPUS[0] };
  delete query.id;
  const cResult = classify(query, CORPUS);
  assert.equal(cResult.decision, 'direct');
  assert.equal(cResult.matchedTemplateId, 'tA');

  // Stage 2: orchestrator drives the loop using classifier output.
  const events = [
    { type: 'feature_tuple_arrived', payload: { tuple: query } },
    { type: 'classification_complete', payload: cResult },
    { type: 'emission_complete', payload: { emissionId: 'em-e2e-1' } },
    { type: 'shop_floor_outcome_observed', payload: { outcome: 'success', latencyMs: 1100 } },
    { type: 'outcome_recorded', payload: { outcomeId: 'o-e2e-1' } },
    { type: 'delta_computed', payload: { outcomeCount: 50, deltaTuples: [{ templateId: 'tA' }] } },
    { type: 'signal_emitted' },
  ];
  const loopResult = driveLoop(events);

  assert.equal(loopResult.terminalState, LOOP_STATES.IDLE);
  assert.equal(loopResult.traceComplete, true);
  assert.equal(loopResult.artifacts.length, 7);
  assert.equal(loopResult.artifacts[6].kind, 'retrain_signal_emitted');
});

test('E2E: classifier gates on ambiguous material → orchestrator routes to operator (no emit)', () => {
  // Query has no shared anchors with corpus → low confidence → gate.
  const query = { material: 'magnesium', operation: 'lapping', machine: 'jig-grinder', toleranceClass: 'super-precision', geometryClass: 'thin-wall' };
  const cResult = classify(query, CORPUS);
  assert.equal(cResult.decision, 'gate');

  // Orchestrator must NOT emit a program — must go straight to operator gate.
  const result = step({ state: LOOP_STATES.CLASSIFY }, { type: 'classification_complete', payload: cResult });
  assert.equal(result.nextState, LOOP_STATES.OBSERVE);
  assert.equal(result.artifact.kind, 'operator_gate');
});

test('E2E: 3 spanning materials → 3 outcomes → corpus delta computed', () => {
  // Run 3 production cycles, one per material, each ending in success.
  const cycles = CORPUS.map((tmpl) => {
    const q = { material: tmpl.material, operation: tmpl.operation, machine: tmpl.machine, toleranceClass: tmpl.toleranceClass, geometryClass: tmpl.geometryClass };
    const c = classify(q, CORPUS);
    return { query: q, classifierResult: c, observed: 'success' };
  });
  assert.equal(cycles.length, 3);
  assert.ok(cycles.every((c) => c.classifierResult.decision === 'direct'));

  // Convert cycles to outcome records and compute corpus delta.
  // Need 3 successes per template to trip the FLOOR (3), so replicate each.
  const outcomes = [];
  for (const c of cycles) {
    for (let i = 0; i < 3; i += 1) {
      outcomes.push({
        outcomeId: `o-${c.classifierResult.matchedTemplateId}-${i}`,
        templateId: c.classifierResult.matchedTemplateId,
        decision: c.classifierResult.decision,
        observed: c.observed,
        query: c.query,
      });
    }
  }
  const delta = computeCorpusDelta(outcomes);
  assert.equal(delta.promote.length, 3); // all 3 templates promoted
  assert.equal(delta.demote.length, 0);
  assert.equal(delta.totalConsumed, 9);

  // Final stage: should we retrain? Above threshold + novelty → yes.
  const r = shouldRetrain(delta, 5);
  assert.equal(r.retrain, true);
});

test('E2E: failed outcomes produce demote signals that the orchestrator can act on', () => {
  // Mix of failed runs for one template.
  const outcomes = [
    { outcomeId: 'o-1', templateId: 'tS', decision: 'direct', observed: 'success' },
    { outcomeId: 'o-2', templateId: 'tS', decision: 'direct', observed: 'fail' },
    { outcomeId: 'o-3', templateId: 'tS', decision: 'direct', observed: 'fail' },
    { outcomeId: 'o-4', templateId: 'tS', decision: 'direct', observed: 'fail' },
  ];
  const delta = computeCorpusDelta(outcomes);
  assert.equal(delta.demote.length, 1);
  assert.equal(delta.demote[0].templateId, 'tS');

  // Drive orchestrator with this batch — needs retrain because of novelty.
  const r = shouldRetrain(delta, 4);
  assert.equal(r.retrain, true);
  assert.equal(r.reason, 'novelty-and-threshold-met');
});
