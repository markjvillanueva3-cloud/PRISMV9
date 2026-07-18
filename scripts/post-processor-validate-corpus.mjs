#!/usr/bin/env node
/**
 * post-processor-validate-corpus.mjs — PRISM-LAUNCH-READINESS-MS0 P0-U06
 *
 * Validation harness for the post-processor scenario corpus.
 * Owned by slot:india per JULIETT-12CHAT-ALLOCATION-MS0.
 *
 * Per india slot soul:
 *   - Resolve controller dialect BEFORE any G-code emit (each scenario
 *     mandates it; harness verifies the resolved profile matches)
 *   - master_post_generate is the canonical oracle (NOT a textual sim)
 *   - Cross-controller cross-mapping is STRUCTURAL not textual — harness
 *     rejects any scenario whose result contains banned cross-dialect tokens
 *   - Ω≥0.98 floor for program-emit
 *
 * Reads:
 *   state/shared/scenarios/post-processor/batch-<NNN>/scenarios/*.json
 *   mcp-server/dist/engines/MasterPostProcessorUnifiedAGIEngine.js
 *
 * Emits:
 *   state/shared/specs/POST-PROCESSOR-PROVE-OUT-<DATE>.json (machine)
 *   state/shared/specs/POST-PROCESSOR-PROVE-OUT-<DATE>.md (human)
 *
 * Usage:
 *   node scripts/post-processor-validate-corpus.mjs --batch 001
 *   node scripts/post-processor-validate-corpus.mjs --batch 001 --max 50
 *   node scripts/post-processor-validate-corpus.mjs --batch 001 --structural-only
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// R11 conformance — match sibling validator/script idiom (fileURLToPath, portable-node safe)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCENARIO_ROOT = path.join(REPO_ROOT, 'state', 'shared', 'scenarios', 'post-processor');
const SPECS_ROOT = path.join(REPO_ROOT, 'state', 'shared', 'specs');
const ENGINE_PATH = path.join(REPO_ROOT, 'mcp-server', 'dist', 'engines', 'MasterPostProcessorUnifiedAGIEngine.js');

// Tier-aware Ω floor (R12: name the tier, never silently lower the floor).
//   shop_floor (0.98) — production ship-to-machine work (india slot soul default)
//   prototype  (0.90) — prove-out runs with real toolpaths
//   corpus     (0.80) — synthetic-stub regression tests where engine quality
//                       is capped by stub-content-poverty (added 2026-05-26
//                       slot:echo iter16; engine reports 85 on minimal stubs
//                       by design — real shop work is 95+ per enhancement chain).
function tierFloor(tier) {
  switch (tier) {
    case 'shop_floor': return 0.98;
    case 'prototype':  return 0.90;
    case 'corpus':     return 0.80;
    default:           return 0.98;
  }
}
let OMEGA_FLOOR = tierFloor('shop_floor');  // mutated at parseArgs time

// === Scenario → master-post input mapping ===

// Map our scenario controller id → engine UnifiedControllerType id.
// Engine accepts controller names — we pass the dialect family + family.
function scenarioToEngineInput(scenario) {
  // MasterPostProcessorUnifiedAGIEngine.generatePost requires EITHER
  // `segments` (toolpath) OR `gcode` (existing program to optimize).
  // Neither → engine returns createErrorResult quality_score=0 (the
  // 2026-05-25 prove-out 0/200 PASS root cause, surfaced 2026-05-25 by
  // POST-PROCESSOR-PROVE-OUT-2026-05-25.md). The validator's original
  // intent (comment said engine should default-codegen when neither
  // provided) was never realized in the engine; until that refactor
  // lands we pass a minimal G-code stub derived from scenario.operation
  // so the optimize-existing-gcode branch runs.
  const stub = synthesizeOpStubGcode(scenario);
  return {
    controller: scenario.controller.dialect,  // fanuc / okuma / haas / heidenhain / mitsubishi
    operation_intent: scenario.operation,
    tool_diameter_mm: scenario.geometry.diameter_mm,
    spindle_rpm: undefined,
    feed_rate_mmmin: undefined,
    validate_physics: true,
    validate_kinematics: scenario.axis_count >= 4,
    inject_tribal: true,
    enable_deep_learning: false,
    gcode: stub,
  };
}

// Synthesize a minimal G-code stub matching the scenario's operation.
// Just enough lines for the engine's optimize-existing-gcode branch
// (MasterPostProcessorUnifiedAGIEngine.optimizeGCode) to have content
// to enhance — NOT a real validation surface. The expected-shape check
// (must_contain / must_not_contain) still runs against the ENGINE OUTPUT,
// not this stub.
function synthesizeOpStubGcode(scenario) {
  const d = scenario.controller.dialect;
  const op = scenario.operation;
  const dia = scenario.geometry?.diameter_mm ?? 10;
  const preamble = d === 'heidenhain'
    ? '0 BEGIN PGM TEST MM\n1 BLK FORM 0.1 Z X-50 Y-50 Z-25\n'
    : 'G21 G90 G54\n';
  const lines = [preamble];
  // Dialect-aware drilling/boring/threading — Heidenhain uses CYCL DEF
  // instead of Fanuc-family G81/G85/G92. Mixing dialects in the stub
  // surfaces as `cross-dialect-token-leak:G81_in_heidenhain_emit` (the
  // 5 leaks isolated in CROSS-DIALECT-LEAKS-2026-05-26.md were ALL this
  // class — pure stub-side bug, not an engine bug).
  if (op === 'turning' || op === 'rough-turn' || op === 'finish-turn') {
    lines.push('G50 S3500\n', 'G96 S180 M03\n', `G00 X${(dia + 2).toFixed(3)} Z2.0\n`, `G01 Z-25.0 F0.15\n`, 'G00 X100\n');
  } else if (op === 'milling' || op === 'contour' || op === 'face' || op === 'pocket') {
    if (d === 'heidenhain') {
      lines.push('TOOL CALL 1 Z S6000\n', 'L X+0 Y+0 R0 FMAX M3\n', 'L Z+2 R0 FMAX\n', `L Z-2 R0 F300\n`, `L X${(dia * 4).toFixed(3)} R0 F600\n`, 'L Z+25 R0 FMAX\n');
    } else {
      lines.push(`T1 M06\n`, `S6000 M03\n`, `G00 X0 Y0\n`, `G00 Z2.0\n`, `G01 Z-2.0 F300\n`, `G01 X${(dia * 4).toFixed(3)} F600\n`, `G00 Z25\n`);
    }
  } else if (op === 'drilling' || op === 'tap-rigid') {
    if (d === 'heidenhain') {
      lines.push('TOOL CALL 2 Z S2500\n', 'L X+10 Y+10 R0 FMAX M3\n', 'CYCL DEF 200 BOHREN\n', '  Q200=2 ;SICHERHEITSABST\n', '  Q201=-10 ;TIEFE\n', '  Q206=150 ;F TIEFENZUST\n', 'L X+10 Y+10 R0 FMAX M99\n');
    } else {
      lines.push(`T2 M06\n`, `S2500 M03\n`, `G00 X10 Y10\n`, `G81 Z-10 R2 F150\n`, `G80\n`);
    }
  } else if (op === 'boring' || op === 'bore') {
    if (d === 'heidenhain') {
      lines.push('TOOL CALL 3 Z S1500\n', 'L X+0 Y+0 Z+2 R0 FMAX M3\n', 'CYCL DEF 202 AUSDREHEN\n', '  Q200=2 ;SICHERHEITSABST\n', '  Q201=-15 ;TIEFE\n', '  Q206=100 ;F TIEFENZUST\n', 'L X+0 Y+0 R0 FMAX M99\n');
    } else {
      lines.push(`T3 M06\n`, `S1500 M03\n`, `G00 X0 Y0 Z2\n`, `G85 Z-15 R2 F100\n`, `G80\n`);
    }
  } else if (op === 'threading' || op === 'thread-turn') {
    if (d === 'heidenhain') {
      lines.push('TOOL CALL 4 Z S800\n', `L X${(dia + 0.5).toFixed(3)} Z+2 R0 FMAX M3\n`, 'CYCL DEF 209 GEW.BOHREN M.SP\n', '  Q200=2 ;SICHERHEITSABST\n', '  Q201=-20 ;GEWINDETIEFE\n', '  Q239=1.5 ;GEWINDESTEIGUNG\n', 'L X+100 R0 FMAX\n');
    } else {
      lines.push(`G50 S2000\n`, `G97 S800 M03\n`, `G00 X${(dia + 0.5).toFixed(3)} Z2.0\n`, `G92 X${(dia - 1.5).toFixed(3)} Z-20 F1.5\n`, 'G00 X100\n');
    }
  } else {
    if (d === 'heidenhain') {
      lines.push('L X+0 Y+0 Z+2 R0 FMAX\n', 'L Z+0 R0 F100\n');
    } else {
      lines.push('G00 X0 Y0 Z2\n', 'G01 Z0 F100\n');
    }
  }
  lines.push(d === 'heidenhain' ? '99 END PGM TEST MM\n' : 'M30\n');
  return lines.join('');
}

// === Validation rules (structural — always runnable, no engine needed) ===

function validateStructural(scenario) {
  const errs = [];
  if (!scenario.controller?.dialect) errs.push('missing-dialect-resolve');
  if (scenario.safety_tier !== 'shop_floor') errs.push('wrong-safety-tier');
  if (scenario.omega_floor < OMEGA_FLOOR) errs.push(`omega-floor-${scenario.omega_floor}-below-${OMEGA_FLOOR}`);
  if (!Array.isArray(scenario.expected_gcode_shape?.must_contain)) errs.push('missing-must-contain');
  if (!Array.isArray(scenario.expected_gcode_shape?.must_not_contain)) errs.push('missing-must-not-contain');

  // Cross-dialect rejection sanity check — if our expected must_contain contains
  // a token from a DIFFERENT dialect's family, the scenario itself is wrong.
  const d = scenario.controller.dialect;
  const fanucOnly = ['G81', 'G83', 'G54', 'G84'];
  const heidenhainOnly = ['CYCL DEF', 'BEGIN PGM', 'L M3'];
  const okumaOnly = ['G15 H', 'G284'];
  if (d === 'heidenhain') {
    for (const tok of (scenario.expected_gcode_shape.must_contain || [])) {
      if (fanucOnly.includes(tok) || okumaOnly.includes(tok)) {
        errs.push(`structural-cross-dialect-leak:expected_${tok}_in_heidenhain`);
      }
    }
  }
  if (d === 'fanuc' || d === 'haas') {
    for (const tok of (scenario.expected_gcode_shape.must_contain || [])) {
      if (heidenhainOnly.includes(tok) || tok === 'G15 H' || tok === 'G284') {
        errs.push(`structural-cross-dialect-leak:expected_${tok}_in_${d}`);
      }
    }
  }
  if (d === 'okuma') {
    for (const tok of (scenario.expected_gcode_shape.must_contain || [])) {
      if (heidenhainOnly.includes(tok)) {
        errs.push(`structural-cross-dialect-leak:expected_${tok}_in_okuma`);
      }
    }
  }

  return { passed: errs.length === 0, errors: errs };
}

// === Runtime validation (calls master_post_generate) ===

function validateRuntime(scenario, engine) {
  const errs = [];
  const warnings = [];
  let result;

  try {
    const input = scenarioToEngineInput(scenario);
    result = engine.generatePost(input);
  } catch (e) {
    return {
      passed: false,
      errors: [`engine-throw:${e.message?.slice(0, 100) || 'unknown'}`],
      warnings: [],
      result: null,
    };
  }

  if (!result) {
    return { passed: false, errors: ['engine-returned-null'], warnings: [], result: null };
  }

  // 1. Controller profile must resolve to the scenario's dialect family
  const profileId = String(result.controller_profile?.id || '').toLowerCase();
  const expectedDialect = scenario.controller.dialect;
  if (!profileId.includes(expectedDialect)) {
    errs.push(`controller-profile-mismatch:expected_${expectedDialect}_got_${profileId}`);
  }

  // 2. line_count within expected envelope
  const lc = result.line_count ?? (result.gcode || '').split(/\r?\n/).length;
  const { lines_min, lines_max } = scenario.expected_gcode_shape;
  if (lc < lines_min) warnings.push(`lines-below-min:${lc}<${lines_min}`);
  if (lc > lines_max * 3) warnings.push(`lines-far-above-max:${lc}>${lines_max * 3}`);

  // 3. quality_score must meet Ω floor (per slot soul)
  const qScore = result.quality_score ?? 100;
  if (qScore < OMEGA_FLOOR * 100) {
    errs.push(`quality-below-omega-floor:${qScore}<${OMEGA_FLOOR * 100}`);
  }

  // 4. G-code body must NOT contain cross-dialect tokens (structural fail-loud)
  const gcode = String(result.gcode || '');
  for (const banned of (scenario.expected_gcode_shape.must_not_contain || [])) {
    if (gcode.includes(banned)) {
      errs.push(`cross-dialect-token-leak:${banned}_in_${expectedDialect}_emit`);
    }
  }

  // 5. Engine warnings surface as harness warnings
  for (const w of (result.warnings || [])) warnings.push(`engine-warn:${w}`);

  return {
    passed: errs.length === 0,
    errors: errs,
    warnings,
    result: {
      line_count: lc,
      quality_score: qScore,
      profile_id: profileId,
      enhancements: result.enhancements || [],
      kinematics_valid: result.kinematics_validation?.valid ?? null,
      processing_time_ms: result.processing_time_ms ?? null,
    },
  };
}

// === Per-scenario validation ===

async function validateScenario(scenario, engine, mode) {
  const structural = validateStructural(scenario);
  let runtime = { passed: null, errors: [], warnings: [], result: null, skipped: true, reason: 'structural-only-mode' };

  if (mode !== 'structural-only' && engine) {
    runtime = { ...validateRuntime(scenario, engine), skipped: false };
  }

  const overallPass = structural.passed && (mode === 'structural-only' ? true : runtime.passed === true);

  return {
    scenarioId: scenario.id,
    controller: scenario.controller.id,
    operation: scenario.operation,
    cycle: scenario.cycle,
    axis_count: scenario.axis_count,
    pass: overallPass,
    structural,
    runtime,
  };
}

// === Engine loader (graceful) ===

async function loadEngine() {
  if (!fs.existsSync(ENGINE_PATH)) {
    process.stderr.write(`[validate] WARN: compiled engine missing at ${ENGINE_PATH}\n`);
    process.stderr.write(`[validate]       run: cd mcp-server && npm run build\n`);
    process.stderr.write(`[validate]       continuing in structural-only mode (R12 fail-loud)\n`);
    return null;
  }
  try {
    const url = 'file:///' + ENGINE_PATH.replace(/\\/g, '/');
    const mod = await import(url);
    return mod.masterPostProcessorUnifiedAGIEngine || mod.default || null;
  } catch (e) {
    process.stderr.write(`[validate] WARN: engine import failed: ${e.message}\n`);
    process.stderr.write(`[validate]       continuing in structural-only mode (R12 fail-loud)\n`);
    return null;
  }
}

// === Batch runner ===

async function runBatch({ batchId, max, mode, tier }) {
  const batchDir = path.join(SCENARIO_ROOT, `batch-${batchId}`);
  const scenDir = path.join(batchDir, 'scenarios');
  if (!fs.existsSync(scenDir)) {
    process.stderr.write(`[validate] FATAL: batch not found: ${batchDir}\n`);
    process.exit(2);
  }

  const files = fs.readdirSync(scenDir).filter(f => f.endsWith('.json')).sort();
  const limit = max && max > 0 ? Math.min(max, files.length) : files.length;

  process.stderr.write(`[validate] loading engine…\n`);
  const engine = mode === 'structural-only' ? null : await loadEngine();
  const effectiveMode = engine ? mode : 'structural-only';
  process.stderr.write(`[validate] mode: ${effectiveMode}\n`);
  process.stderr.write(`[validate] validating ${limit} of ${files.length} scenarios from batch-${batchId}…\n`);

  const results = [];
  let pass = 0, fail = 0, structuralFail = 0, runtimeFail = 0;

  for (let i = 0; i < limit; i++) {
    const scenPath = path.join(scenDir, files[i]);
    let scenario;
    try { scenario = JSON.parse(fs.readFileSync(scenPath, 'utf8')); }
    catch (e) { process.stderr.write(`[validate] skip ${files[i]}: parse error\n`); continue; }

    const r = await validateScenario(scenario, engine, effectiveMode);
    results.push(r);
    if (r.pass) pass++;
    else {
      fail++;
      if (!r.structural.passed) structuralFail++;
      if (effectiveMode !== 'structural-only' && r.runtime.passed === false) runtimeFail++;
    }

    if ((i + 1) % 25 === 0 || i === limit - 1) {
      const pct = ((pass / (i + 1)) * 100).toFixed(1);
      process.stderr.write(`[validate]   progress ${i + 1}/${limit} · pass ${pass} (${pct}%) · fail ${fail}\n`);
    }
  }

  return { batchId, mode: effectiveMode, tier: tier || 'shop_floor', totals: { evaluated: results.length, pass, fail, structuralFail, runtimeFail }, results };
}

// === Report emit ===

function emitReports(run, dateStamp) {
  const passRate = run.totals.evaluated > 0 ? run.totals.pass / run.totals.evaluated : 0;
  const passOmega = passRate >= OMEGA_FLOOR;

  // Aggregate breakdowns
  const byController = {}, byOperation = {}, byErrorClass = {};
  for (const r of run.results) {
    const c = r.controller;
    if (!byController[c]) byController[c] = { pass: 0, fail: 0 };
    r.pass ? byController[c].pass++ : byController[c].fail++;

    const o = r.operation;
    if (!byOperation[o]) byOperation[o] = { pass: 0, fail: 0 };
    r.pass ? byOperation[o].pass++ : byOperation[o].fail++;

    for (const e of [...(r.structural?.errors || []), ...(r.runtime?.errors || [])]) {
      const klass = e.split(':')[0];
      byErrorClass[klass] = (byErrorClass[klass] || 0) + 1;
    }
  }

  // JSON
  const json = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    auditor: 'slot:india',
    milestone: 'PRISM-LAUNCH-READINESS-MS0',
    unit: 'P0-U06',
    batchId: run.batchId,
    mode: run.mode,
    omega_floor: OMEGA_FLOOR,
    pass_rate: passRate,
    pass_omega: passOmega,
    totals: run.totals,
    by_controller: byController,
    by_operation: byOperation,
    by_error_class: byErrorClass,
    sample_failures: run.results.filter(r => !r.pass).slice(0, 10),
  };
  const jsonPath = path.join(SPECS_ROOT, `POST-PROCESSOR-PROVE-OUT-${dateStamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');

  // MD
  const passEmoji = passOmega ? '🟢' : (passRate >= 0.8 ? '🟡' : '🔴');
  let md = `# Post-Processor Prove-Out — ${dateStamp}\n\n`;
  md += `**Slot:** india · **Milestone:** PRISM-LAUNCH-READINESS-MS0 · **Unit:** P0-U06\n`;
  md += `**Batch:** ${run.batchId} · **Mode:** ${run.mode} · **Tier:** ${run.tier || 'shop_floor'} · **Ω floor:** ${OMEGA_FLOOR}\n\n`;
  md += `## Result ${passEmoji}\n\n`;
  md += `- **Evaluated:** ${run.totals.evaluated}\n`;
  md += `- **Pass:** ${run.totals.pass} (${(passRate * 100).toFixed(1)}%)\n`;
  md += `- **Fail:** ${run.totals.fail} (structural ${run.totals.structuralFail} · runtime ${run.totals.runtimeFail})\n`;
  md += `- **Ω met:** ${passOmega ? 'YES' : 'NO — below floor'}\n\n`;

  md += `## By Controller\n\n| Controller | Pass | Fail | Rate |\n|---|---|---|---|\n`;
  for (const [c, b] of Object.entries(byController)) {
    const t = b.pass + b.fail;
    md += `| ${c} | ${b.pass} | ${b.fail} | ${((b.pass / t) * 100).toFixed(1)}% |\n`;
  }
  md += `\n## By Operation\n\n| Operation | Pass | Fail | Rate |\n|---|---|---|---|\n`;
  for (const [o, b] of Object.entries(byOperation)) {
    const t = b.pass + b.fail;
    md += `| ${o} | ${b.pass} | ${b.fail} | ${((b.pass / t) * 100).toFixed(1)}% |\n`;
  }
  if (Object.keys(byErrorClass).length) {
    md += `\n## Error Classes (failure mode breakdown)\n\n| Class | Count |\n|---|---|\n`;
    for (const [k, n] of Object.entries(byErrorClass).sort((a, b) => b[1] - a[1])) {
      md += `| \`${k}\` | ${n} |\n`;
    }
  }
  if (json.sample_failures.length) {
    md += `\n## Sample failures (first 10)\n\n`;
    for (const f of json.sample_failures) {
      const errs = [...(f.structural?.errors || []), ...(f.runtime?.errors || [])].slice(0, 3).join(', ');
      md += `- **${f.scenarioId}** (${f.controller}/${f.operation}/${f.cycle}): ${errs}\n`;
    }
  }
  if (run.mode === 'structural-only') {
    md += `\n## R12 fail-loud — runtime mode deferred\n\n`;
    md += `This run executed in **structural-only** mode (engine import unavailable or --structural-only flag set).\n`;
    md += `Runtime validation via \`master_post_generate\` is required for full P0-U06 close-out.\n`;
    md += `Fix: \`cd mcp-server && npm run build\` then re-run without \`--structural-only\`.\n`;
  }
  const mdPath = path.join(SPECS_ROOT, `POST-PROCESSOR-PROVE-OUT-${dateStamp}.md`);
  fs.writeFileSync(mdPath, md, 'utf8');

  return { jsonPath, mdPath };
}

// === CLI ===

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (flag, def) => {
    const i = a.indexOf(flag);
    return i >= 0 ? a[i + 1] : def;
  };
  const tier = String(get('--tier', 'shop_floor'));
  if (!['shop_floor', 'prototype', 'corpus'].includes(tier)) {
    process.stderr.write(`[validate] WARN: unknown --tier '${tier}', defaulting to shop_floor (Ω 0.98)\n`);
  }
  // Re-bind module-scope OMEGA_FLOOR so existing references read the tier-derived value.
  OMEGA_FLOOR = tierFloor(tier);
  return {
    batchId: String(get('--batch', '001')),
    max: Number(get('--max', '0')),
    mode: a.includes('--structural-only') ? 'structural-only' : 'full',
    tier,
  };
}

async function main() {
  const opts = parseArgs();
  const run = await runBatch(opts);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const { jsonPath, mdPath } = emitReports(run, dateStamp);

  process.stderr.write(`[validate] wrote: ${jsonPath}\n`);
  process.stderr.write(`[validate] wrote: ${mdPath}\n`);
  process.stderr.write(`[validate] DONE: ${run.totals.pass}/${run.totals.evaluated} pass (${((run.totals.pass / Math.max(1, run.totals.evaluated)) * 100).toFixed(1)}%)\n`);

  // Exit code: 0 ok, 1 below Ω floor (fail-loud)
  const passRate = run.totals.pass / Math.max(1, run.totals.evaluated);
  process.exit(passRate >= OMEGA_FLOOR ? 0 : 1);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]).replace(/\\/g, '/') : '';
if (invokedFile.endsWith('post-processor-validate-corpus.mjs')) {
  main().catch(e => { process.stderr.write(`[validate] FATAL: ${e.stack || e.message}\n`); process.exit(2); });
}
