#!/usr/bin/env node
// closed-loop-driver.mjs
// End-to-end driver that wires the 4 self-learning engines to actually
// TICK the loop on a (material, operation, machine, tolerance, geometry)
// query. Demonstrates idle → classify → retrieve → emit → observe →
// outcome → corpus_delta → retrain_signal in YOLO mode (no operator gate
// pauses; gated decisions still route to operator-gate artifact).
//
// Per /goal 2026-05-26: "finish building closed loop self learning, self
// improving system + run it in yolo-mode".
//
// Usage:
//   node closed-loop-driver.mjs                      # built-in demo input
//   node closed-loop-driver.mjs --input '<json>'     # custom feature tuple
//   node closed-loop-driver.mjs --yolo               # auto-emit even on gate
//
// Per kilo soul: gated decisions still surface as operator_gate artifacts;
// YOLO flag bypasses the gate for autonomous learning runs but the artifact
// is still emitted with confidence + reason for audit.

import { classify } from '../mcp-server/src/engines/TemplateApplicabilityClassifierEngine.mjs';
import { step, driveLoop, LOOP_STATES } from '../mcp-server/src/engines/SelfLearningLoopOrchestratorEngine.mjs';
import { computeCorpusDelta, shouldRetrain } from '../mcp-server/src/engines/OutcomeFeedbackWireEngine.mjs';
import { retrieve, listAvailableToolpaths } from '../mcp-server/src/engines/ToolpathTipRetrieverEngine.mjs';
import fs from 'node:fs';
import path from 'node:path';

const CATALOG_PATH = 'H:/prism-slot-kilo/mcp-server/data/state/cam-toolpath-catalog.json';
const TRACE_OUT = 'H:/prism-slot-kilo/state/shared/closed-loop-trace.jsonl';
const SCHEMA_VERSION = '1.0.0';

function loadTemplatesFromCatalog() {
  const cat = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const templates = [];
  for (const [software, swData] of Object.entries(cat.softwares)) {
    for (const tp of swData.toolpaths) {
      templates.push({
        id: `${software.replace('_', '-')}-${tp.slug}`,
        software,
        toolpath: tp.slug,
        material: 'generic',
        operation: tp.category,
        machine: 'generic',
        toleranceClass: 'standard',
        geometryClass: 'prismatic',
      });
    }
  }
  return templates;
}

function tickOne(query, templates, opts = {}) {
  const trace = [];
  const append = (artifact) => { if (artifact) trace.push(artifact); };

  // Stage 1: classify
  const classifyResult = classify(query, templates);
  append({ stage: 'classify', result: classifyResult, ts: new Date().toISOString() });

  // Stage 2: orchestrator → idle → classify state
  let loopState = { state: LOOP_STATES.IDLE };
  const idleToClassify = step(loopState, { type: 'feature_tuple_arrived', payload: { tuple: query } });
  append({ stage: 'orchestrator:idle->classify', result: idleToClassify });
  loopState = { ...loopState, state: idleToClassify.nextState };

  // Stage 3: classify → emit OR gate
  const classifyDecided = step(loopState, { type: 'classification_complete', payload: classifyResult });
  append({ stage: 'orchestrator:classify->next', result: classifyDecided });
  loopState = { ...loopState, state: classifyDecided.nextState };

  // Stage 4: retrieve tips for the decision
  let retrievalResult = null;
  if (classifyResult.matchedTemplateId) {
    const tpl = templates.find((t) => t.id === classifyResult.matchedTemplateId);
    if (tpl) {
      retrievalResult = retrieve({
        software: tpl.software,
        toolpath: tpl.toolpath,
        materialHint: query.material,
        featureHint: query.geometryClass,
        topK: 3,
      });
      append({ stage: 'retrieve', software: tpl.software, toolpath: tpl.toolpath, result: retrievalResult });
    }
  }

  // Stage 5: emit (in YOLO mode, always emit even if gated decision)
  if (loopState.state === LOOP_STATES.EMIT || (opts.yolo && classifyResult.decision === 'gate')) {
    const emitResult = step(
      { state: LOOP_STATES.EMIT },
      { type: 'emission_complete', payload: { emissionId: `em-${Date.now()}` } }
    );
    append({ stage: 'orchestrator:emit->observe', result: emitResult });
    loopState = { ...loopState, state: emitResult.nextState };
  }

  // Stage 6: simulate observe (in real production, shop floor reports outcome)
  // For YOLO-driver, we synthesize a successful outcome for the loop test.
  if (loopState.state === LOOP_STATES.OBSERVE) {
    const observeResult = step(loopState, {
      type: 'shop_floor_outcome_observed',
      payload: { outcome: 'success', latencyMs: 1234 },
    });
    append({ stage: 'orchestrator:observe->outcome', result: observeResult });
    loopState = { ...loopState, state: observeResult.nextState };

    const outcomeResult = step(loopState, {
      type: 'outcome_recorded',
      payload: { outcomeId: `o-${Date.now()}` },
    });
    append({ stage: 'orchestrator:outcome->corpus_delta', result: outcomeResult });
    loopState = { ...loopState, state: outcomeResult.nextState };
  }

  // Stage 7: compute corpus delta from a synthetic outcome batch
  // (in production this batch is the meta-learning-optimizer ledger window)
  const syntheticOutcomes = [{
    outcomeId: `o-${Date.now()}`,
    templateId: classifyResult.matchedTemplateId || '_compose_',
    decision: classifyResult.decision,
    observed: 'success',
    query,
  }];
  const delta = computeCorpusDelta(syntheticOutcomes);
  append({ stage: 'corpus_delta', result: delta });

  // Stage 8: shouldRetrain decision (low threshold for demo)
  const retrainDecision = shouldRetrain(delta, 1);
  append({ stage: 'retrain_decision', result: retrainDecision });

  return { terminalState: loopState.state, trace, retrievalResult, classifyResult };
}

function main() {
  const argv = process.argv.slice(2);
  const yolo = argv.includes('--yolo');
  const inputIdx = argv.indexOf('--input');
  const inputJson = inputIdx >= 0 ? argv[inputIdx + 1] : null;

  // Three test queries spanning material × decision-class — exercises the
  // full kNN-decision space (direct hit, override, compose, gate).
  const queries = inputJson ? [JSON.parse(inputJson)] : [
    {
      label: 'aluminum-pocket-direct-hit',
      material: 'aluminum',
      operation: '2.5-axis-mill',
      machine: 'haas-vf2',
      toleranceClass: 'standard',
      geometryClass: 'prismatic',
    },
    {
      label: 'inconel-rough-override',
      material: 'inconel',
      operation: '3d-rough',
      machine: 'mazak-vtc',
      toleranceClass: 'tight',
      geometryClass: 'freeform',
    },
    {
      label: 'unknown-feature-gate',
      material: 'magnesium',
      operation: 'lapping',
      machine: 'jig-grinder',
      toleranceClass: 'super-precision',
      geometryClass: 'thin-wall',
    },
  ];

  const templates = loadTemplatesFromCatalog();
  const availableToolpaths = listAvailableToolpaths();
  const driverStats = {
    schemaVersion: SCHEMA_VERSION,
    startedAt: new Date().toISOString(),
    yolo,
    templatesLoaded: templates.length,
    toolpathsAvailableInCorpus: availableToolpaths.length,
    queries: queries.length,
    ticks: [],
  };

  if (!fs.existsSync(path.dirname(TRACE_OUT))) fs.mkdirSync(path.dirname(TRACE_OUT), { recursive: true });
  fs.writeFileSync(TRACE_OUT, ''); // reset trace file

  for (const q of queries) {
    const result = tickOne(q, templates, { yolo });
    driverStats.ticks.push({
      label: q.label,
      query: q,
      decision: result.classifyResult.decision,
      matchedTemplateId: result.classifyResult.matchedTemplateId,
      retrievalOk: result.retrievalResult?.ok,
      retrievalTipCount: result.retrievalResult?.tipCount || 0,
      terminalState: result.terminalState,
      traceStages: result.trace.length,
    });
    for (const artifact of result.trace) {
      fs.appendFileSync(TRACE_OUT, JSON.stringify({ query: q.label, ...artifact }) + '\n');
    }
  }

  driverStats.finishedAt = new Date().toISOString();
  process.stdout.write(JSON.stringify(driverStats, null, 2) + '\n');
}

main();
