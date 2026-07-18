// SelfLearningLoopOrchestratorEngine.mjs
// Wires the 6 self-learning islands into a deterministic state machine:
//   corpus → classify → emit → observe → outcome → corpus-delta → retrain-signal → idle
// Pure-fn step transitions; each transition takes the previous state + an
// arrival event and returns the next state + the artifact to write.
//
// Per kilo soul (orchestrates, does not implement at each stage): this engine
// is the wire across islands. Actual training/inference live downstream
// (echo for CAM strategy, india for post-processing, dedicated ML chat for
// trainer head).
//
// Islands wired (per CLAUDE.md):
//   1. Training corpus (cam-curriculum-pages/pages.jsonl + 3766 LoRA tuples)
//   2. Template inventory (141 CamTemplates from CAM-AI-TRAINING-MS0)
//   3. TemplateApplicabilityClassifierEngine (this commit)
//   4. Function index (15+ per-software FunctionIndexEngines)
//   5. Outcome ledger (MetaLearningOptimizerEngine accumulator)
//   6. Retrain signal (consumed by trainer chats / NN/GNN tier-5)
//
// Dispatcher contract (WIRED 2026-05-31, CAM-LEARN-LOOP/U-CAM-LOOP-WIRE-CONSUMER):
//   prism_cam:cam_self_learning_loop_step({state, event}) → {nextState, artifact, reason}
//   (Generic FSM; wired via prism_cam to co-locate with the cam_drive_* producer.)
//
// schemaVersion 1.0.0

const SCHEMA_VERSION = '1.0.0';

// Valid loop states. Forward-only progression except for terminal `idle` re-entry.
export const LOOP_STATES = Object.freeze({
  IDLE: 'idle',
  CLASSIFY: 'classify',
  EMIT: 'emit',
  OBSERVE: 'observe',
  OUTCOME: 'outcome',
  CORPUS_DELTA: 'corpus_delta',
  RETRAIN_SIGNAL: 'retrain_signal',
});

// Valid transition events the orchestrator accepts in each state.
const VALID_TRANSITIONS = {
  idle:           ['feature_tuple_arrived'],
  classify:       ['classification_complete'],
  emit:           ['emission_complete', 'emission_gated'],
  observe:        ['shop_floor_outcome_observed'],
  outcome:        ['outcome_recorded'],
  corpus_delta:   ['delta_computed'],
  retrain_signal: ['signal_emitted'],
};

// Minimum number of outcomes before a retrain signal fires. Below this, the
// orchestrator returns to idle after CORPUS_DELTA without triggering retrain.
// Avoids over-training on insufficient evidence per ML expert mode
// (data quality > model complexity).
const RETRAIN_OUTCOME_THRESHOLD = 50;

/**
 * Validate a state-event transition.
 * @param {string} state - current state
 * @param {string} event - arrival event
 * @returns {boolean}
 */
export function isValidTransition(state, event) {
  const allowed = VALID_TRANSITIONS[state];
  if (!allowed) return false;
  return allowed.includes(event);
}

/**
 * Compute the next state of the orchestrator given current state, an arrival
 * event, and the payload. Pure function — no side effects.
 * @param {{state: string, outcomeCount?: number, classifierDecision?: string}} loopState
 * @param {{type: string, payload?: Object}} event
 * @returns {{nextState: string, artifact: Object|null, reason: string}}
 */
export function step(loopState, event) {
  if (!loopState || typeof loopState !== 'object') {
    return { nextState: LOOP_STATES.IDLE, artifact: null, reason: 'invalid-loop-state' };
  }
  if (!event || typeof event !== 'object' || !event.type) {
    return { nextState: loopState.state, artifact: null, reason: 'invalid-event' };
  }
  if (!isValidTransition(loopState.state, event.type)) {
    return {
      nextState: loopState.state,
      artifact: null,
      reason: `invalid-transition-from-${loopState.state}-via-${event.type}`,
    };
  }
  const payload = event.payload || {};
  switch (loopState.state) {
    case LOOP_STATES.IDLE:
      return {
        nextState: LOOP_STATES.CLASSIFY,
        artifact: { kind: 'classify_request', tuple: payload.tuple || null },
        reason: 'feature-tuple-arrived',
      };
    case LOOP_STATES.CLASSIFY: {
      // Gated decisions skip emission and go straight to observe (operator
      // takes the wheel). Direct/override/compose go to emit.
      const decision = payload.decision || 'gate';
      if (decision === 'gate') {
        return {
          nextState: LOOP_STATES.OBSERVE,
          artifact: { kind: 'operator_gate', reason: payload.reason || 'classifier-uncertainty', confidence: payload.confidence || 0 },
          reason: 'classifier-gated-to-operator',
        };
      }
      return {
        nextState: LOOP_STATES.EMIT,
        artifact: { kind: 'emit_request', decision, templateId: payload.matchedTemplateId || null, confidence: payload.confidence || 0 },
        reason: 'classifier-decided',
      };
    }
    case LOOP_STATES.EMIT:
      return {
        nextState: LOOP_STATES.OBSERVE,
        artifact: { kind: 'program_emitted', emissionId: payload.emissionId || null, gated: event.type === 'emission_gated' },
        reason: 'program-emitted-awaiting-shop-floor-outcome',
      };
    case LOOP_STATES.OBSERVE:
      return {
        nextState: LOOP_STATES.OUTCOME,
        artifact: { kind: 'outcome_record', outcome: payload.outcome || null, latencyMs: payload.latencyMs || 0 },
        reason: 'shop-floor-outcome-observed',
      };
    case LOOP_STATES.OUTCOME:
      return {
        nextState: LOOP_STATES.CORPUS_DELTA,
        artifact: { kind: 'outcome_persisted', outcomeId: payload.outcomeId || null },
        reason: 'outcome-recorded-computing-corpus-delta',
      };
    case LOOP_STATES.CORPUS_DELTA: {
      // Decide whether to fire a retrain signal or short-circuit to idle.
      const outcomeCount = Number(payload.outcomeCount || loopState.outcomeCount || 0);
      if (!Number.isFinite(outcomeCount) || outcomeCount < RETRAIN_OUTCOME_THRESHOLD) {
        return {
          nextState: LOOP_STATES.IDLE,
          artifact: { kind: 'delta_persisted_no_retrain', outcomeCount, threshold: RETRAIN_OUTCOME_THRESHOLD },
          reason: 'insufficient-outcomes-for-retrain-returning-idle',
        };
      }
      return {
        nextState: LOOP_STATES.RETRAIN_SIGNAL,
        artifact: { kind: 'delta_persisted_retrain_eligible', outcomeCount, deltaTuples: payload.deltaTuples || [] },
        reason: 'outcome-threshold-met-firing-retrain',
      };
    }
    case LOOP_STATES.RETRAIN_SIGNAL:
      return {
        nextState: LOOP_STATES.IDLE,
        artifact: { kind: 'retrain_signal_emitted', emittedAt: new Date().toISOString() },
        reason: 'retrain-signal-emitted-loop-closed',
      };
    default:
      return { nextState: LOOP_STATES.IDLE, artifact: null, reason: 'unknown-state-resetting' };
  }
}

/**
 * Drive the loop to completion synchronously given a chain of events.
 * Returns the trace of all artifacts emitted plus the terminal state.
 * Caps at MAX_ITERATIONS to prevent runaway in case of mis-wired events.
 * @param {Array<{type: string, payload?: Object}>} events
 * @param {Object} initialState - starting loop state, defaults to {state:'idle'}
 * @returns {{terminalState: string, artifacts: Array, traceComplete: boolean}}
 */
export function driveLoop(events, initialState = { state: LOOP_STATES.IDLE }) {
  if (!Array.isArray(events)) {
    return { terminalState: initialState.state, artifacts: [], traceComplete: false };
  }
  const MAX_ITERATIONS = events.length + 10; // small headroom for safety; pure fn so no real cost
  let state = { ...initialState };
  const artifacts = [];
  let iterations = 0;
  for (const event of events) {
    if (iterations >= MAX_ITERATIONS) break;
    const result = step(state, event);
    artifacts.push(result.artifact);
    state = { ...state, state: result.nextState };
    iterations += 1;
  }
  return {
    terminalState: state.state,
    artifacts,
    traceComplete: iterations === events.length,
  };
}

export const META = {
  schemaVersion: SCHEMA_VERSION,
  states: Object.values(LOOP_STATES),
  retrainOutcomeThreshold: RETRAIN_OUTCOME_THRESHOLD,
};
