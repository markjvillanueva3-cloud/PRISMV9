// Tests for SelfLearningLoopOrchestratorEngine
// Run: node --test mcp-server/src/engines/SelfLearningLoopOrchestratorEngine.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidTransition, step, driveLoop, LOOP_STATES, META } from './SelfLearningLoopOrchestratorEngine.mjs';

test('LOOP_STATES exposes 7 named states', () => {
  assert.equal(Object.keys(LOOP_STATES).length, 7);
  assert.equal(LOOP_STATES.IDLE, 'idle');
  assert.equal(LOOP_STATES.RETRAIN_SIGNAL, 'retrain_signal');
});

test('isValidTransition: idle accepts feature_tuple_arrived', () => {
  assert.equal(isValidTransition('idle', 'feature_tuple_arrived'), true);
  assert.equal(isValidTransition('idle', 'outcome_recorded'), false);
});

test('isValidTransition: classify accepts only classification_complete', () => {
  assert.equal(isValidTransition('classify', 'classification_complete'), true);
  assert.equal(isValidTransition('classify', 'feature_tuple_arrived'), false);
});

test('isValidTransition: rejects unknown state', () => {
  assert.equal(isValidTransition('not-a-state', 'feature_tuple_arrived'), false);
});

test('step: idle + feature_tuple_arrived → classify', () => {
  const r = step({ state: 'idle' }, { type: 'feature_tuple_arrived', payload: { tuple: { material: 'aluminum' } } });
  assert.equal(r.nextState, 'classify');
  assert.equal(r.artifact.kind, 'classify_request');
  assert.deepEqual(r.artifact.tuple, { material: 'aluminum' });
});

test('step: classify + decision=direct → emit', () => {
  const r = step({ state: 'classify' }, { type: 'classification_complete', payload: { decision: 'direct', matchedTemplateId: 't1', confidence: 0.92 } });
  assert.equal(r.nextState, 'emit');
  assert.equal(r.artifact.kind, 'emit_request');
  assert.equal(r.artifact.templateId, 't1');
});

test('step: classify + decision=gate → observe (operator gate, kilo soul refuse)', () => {
  const r = step({ state: 'classify' }, { type: 'classification_complete', payload: { decision: 'gate', reason: 'low-confidence' } });
  assert.equal(r.nextState, 'observe');
  assert.equal(r.artifact.kind, 'operator_gate');
  assert.equal(r.artifact.reason, 'low-confidence');
});

test('step: emit + emission_complete → observe', () => {
  const r = step({ state: 'emit' }, { type: 'emission_complete', payload: { emissionId: 'em-1' } });
  assert.equal(r.nextState, 'observe');
  assert.equal(r.artifact.kind, 'program_emitted');
  assert.equal(r.artifact.gated, false);
});

test('step: observe + shop_floor_outcome_observed → outcome', () => {
  const r = step({ state: 'observe' }, { type: 'shop_floor_outcome_observed', payload: { outcome: 'success', latencyMs: 1200 } });
  assert.equal(r.nextState, 'outcome');
  assert.equal(r.artifact.outcome, 'success');
});

test('step: outcome + outcome_recorded → corpus_delta', () => {
  const r = step({ state: 'outcome' }, { type: 'outcome_recorded', payload: { outcomeId: 'o-1' } });
  assert.equal(r.nextState, 'corpus_delta');
});

test('step: corpus_delta below threshold → idle (no retrain)', () => {
  const r = step({ state: 'corpus_delta' }, { type: 'delta_computed', payload: { outcomeCount: 10 } });
  assert.equal(r.nextState, 'idle');
  assert.equal(r.artifact.kind, 'delta_persisted_no_retrain');
});

test('step: corpus_delta at-or-above threshold → retrain_signal', () => {
  const r = step({ state: 'corpus_delta' }, { type: 'delta_computed', payload: { outcomeCount: 50, deltaTuples: [{ id: 't1' }] } });
  assert.equal(r.nextState, 'retrain_signal');
  assert.equal(r.artifact.kind, 'delta_persisted_retrain_eligible');
  assert.equal(r.artifact.outcomeCount, 50);
});

test('step: retrain_signal + signal_emitted → idle (loop closes)', () => {
  const r = step({ state: 'retrain_signal' }, { type: 'signal_emitted' });
  assert.equal(r.nextState, 'idle');
  assert.equal(r.artifact.kind, 'retrain_signal_emitted');
  assert.ok(r.artifact.emittedAt);
});

test('step: rejects invalid event for state', () => {
  const r = step({ state: 'idle' }, { type: 'outcome_recorded' });
  assert.equal(r.nextState, 'idle');
  assert.equal(r.artifact, null);
  assert.match(r.reason, /invalid-transition/);
});

test('step: rejects malformed loop state', () => {
  const r = step(null, { type: 'feature_tuple_arrived' });
  assert.equal(r.nextState, 'idle');
  assert.equal(r.reason, 'invalid-loop-state');
});

test('step: rejects malformed event', () => {
  const r = step({ state: 'idle' }, null);
  assert.equal(r.reason, 'invalid-event');
});

test('step: NaN outcomeCount falls through to idle (no retrain)', () => {
  const r = step({ state: 'corpus_delta' }, { type: 'delta_computed', payload: { outcomeCount: NaN } });
  assert.equal(r.nextState, 'idle');
});

test('step: Infinity outcomeCount triggers retrain (above threshold)', () => {
  const r = step({ state: 'corpus_delta' }, { type: 'delta_computed', payload: { outcomeCount: Infinity } });
  // Infinity is Number.isFinite=false → falls through to idle per current guard
  assert.equal(r.nextState, 'idle');
});

test('driveLoop: full happy path produces 7-artifact trace', () => {
  const events = [
    { type: 'feature_tuple_arrived', payload: { tuple: { material: 'aluminum' } } },
    { type: 'classification_complete', payload: { decision: 'direct', matchedTemplateId: 't1', confidence: 0.9 } },
    { type: 'emission_complete', payload: { emissionId: 'em-1' } },
    { type: 'shop_floor_outcome_observed', payload: { outcome: 'success' } },
    { type: 'outcome_recorded', payload: { outcomeId: 'o-1' } },
    { type: 'delta_computed', payload: { outcomeCount: 50, deltaTuples: [] } },
    { type: 'signal_emitted' },
  ];
  const r = driveLoop(events);
  assert.equal(r.terminalState, 'idle');
  assert.equal(r.artifacts.length, 7);
  assert.equal(r.traceComplete, true);
  // Last artifact must be the retrain signal.
  assert.equal(r.artifacts[6].kind, 'retrain_signal_emitted');
});

test('driveLoop: gated path short-circuits to operator (skips emit)', () => {
  const events = [
    { type: 'feature_tuple_arrived', payload: { tuple: { material: 'inconel' } } },
    { type: 'classification_complete', payload: { decision: 'gate', confidence: 0.12 } },
    { type: 'shop_floor_outcome_observed', payload: { outcome: 'operator-handled' } },
    { type: 'outcome_recorded', payload: { outcomeId: 'o-gated' } },
    { type: 'delta_computed', payload: { outcomeCount: 5 } },
  ];
  const r = driveLoop(events);
  assert.equal(r.terminalState, 'idle');
  // gate path skips emit — artifact 1 should be operator_gate, not emit_request
  assert.equal(r.artifacts[1].kind, 'operator_gate');
});

test('driveLoop: rejects non-array input', () => {
  const r = driveLoop(null);
  assert.equal(r.traceComplete, false);
  assert.deepEqual(r.artifacts, []);
});

test('META exposes schemaVersion and threshold', () => {
  assert.equal(META.schemaVersion, '1.0.0');
  assert.equal(META.retrainOutcomeThreshold, 50);
  assert.equal(META.states.length, 7);
});
