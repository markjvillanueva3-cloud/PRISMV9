#!/usr/bin/env node
/**
 * generate-post-processor-scenarios.mjs — PRISM-LAUNCH-READINESS-MS0 P0-U06
 *
 * Generates the post-processor cross-controller validation corpus.
 * Owned by slot:india per JULIETT-12CHAT-ALLOCATION-MS0.
 *
 * Output: state/shared/scenarios/post-processor/batch-<NNN>/
 *   - manifest.json   (corpus metadata + coverage matrix)
 *   - scenarios/<id>.json   (per-scenario spec, one file each)
 *
 * Per india slot soul (post-processor specialist):
 *   - Controller dialect is REQUIRED before any G-code emit
 *   - master_post_generate is the canonical validation oracle (not inline post)
 *   - Cross-controller cross-mapping is STRUCTURAL not textual
 *   - Default safety tier: shop_floor (Ω≥0.95, S(x)≥0.98)
 *   - Program-emit runs at Ω≥0.98
 *
 * Coverage axes (7):
 *   1. controller (5 dialects)
 *   2. operation (drilling / milling / turning / threading / boring)
 *   3. cycle (G81/82/83/84/87 + bore + ream + tap + thread + face + contour + pocket)
 *   4. axis_count (3 / 4 / 5)
 *   5. material (P/M/K/N/S/H ISO groups)
 *   6. envelope (machine size class: small/med/large)
 *   7. dialect_feature (canned-cycle / wcs / tool-change / sub-program / probing)
 *
 * Usage:
 *   node scripts/generate-post-processor-scenarios.mjs                # default 200 (40/controller)
 *   node scripts/generate-post-processor-scenarios.mjs --target 800   # full target
 *   node scripts/generate-post-processor-scenarios.mjs --seed 42      # deterministic
 *   node scripts/generate-post-processor-scenarios.mjs --batch 002    # named batch
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CONTROLLER_FEATURES, CONTROLLER_IDS, SPINDLE_TAPERS, OPTIONAL_FEATURES,
  featureValidForController, filterMachinesByType, spindleForMachine, controllersForMake,
} from './lib/post-processor-catalog.mjs';

// R11 conformance — match sibling generator idiom (generate-priority-queue-features,
// generate-misc-tasks-features) which use fileURLToPath rather than the
// import.meta.dirname Node-20.11+ shortcut. Portable-node fallback safe.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCENARIO_ROOT = path.join(REPO_ROOT, 'state', 'shared', 'scenarios', 'post-processor');

// === Schema ===
// v1.0.0: dialect + envelope size class + dialect_features (legacy, batch-001)
// v2.0.0: + real machine (gwizard) + spindle (catalog) + controller-gated features

export const SCHEMA_VERSION = '2.0.0';

// v1.0.0 legacy 5-controller list — kept for batch-001 compatibility.
// v2.0.0 uses CONTROLLER_FEATURES (7 controllers) from the catalog lib +
// per-machine pairing via controllersForMake().
export const CONTROLLERS = [
  { id: 'fanuc-30i', vendor: 'Fanuc', family: '30i-MODEL B', dialect: 'fanuc' },
  { id: 'okuma-osp-p300', vendor: 'Okuma', family: 'OSP-P300A', dialect: 'okuma' },
  { id: 'haas-ngc', vendor: 'Haas', family: 'NGC', dialect: 'haas' },
  { id: 'heidenhain-itnc640', vendor: 'Heidenhain', family: 'iTNC 640', dialect: 'heidenhain' },
  { id: 'mitsubishi-m800', vendor: 'Mitsubishi', family: 'M800', dialect: 'mitsubishi' },
];

// v2.0.0 — 7 dialects sourced from CONTROLLER_FEATURES catalog
function buildControllerInstance(dialect) {
  const c = CONTROLLER_FEATURES[dialect];
  if (!c) return null;
  const family = c.families[0];
  return {
    id: `${dialect}-${family.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    vendor: c.name.split(' ')[0],
    family,
    dialect,
    market_share: c.market_share,
  };
}

export const OPERATIONS = ['drilling', 'milling', 'turning', 'threading', 'boring'];

// Per-operation cycle list. Some cycles are operation-specific.
// Cycle codes use Fanuc-canonical G-codes; the generator emits the cycle as
// SEMANTIC (drill-peck) and the post-processor maps to dialect-specific code.
export const CYCLES_BY_OPERATION = {
  drilling: ['drill', 'drill-peck', 'drill-deep', 'spot-drill'],
  milling: ['face', 'contour', 'pocket', 'slot', 'helical-bore', 'trochoidal'],
  turning: ['rough-turn', 'finish-turn', 'face-turn', 'groove', 'thread-turn'],
  threading: ['tap-rigid', 'tap-floating', 'thread-mill', 'thread-turn'],
  boring: ['bore', 'bore-back', 'bore-precision', 'ream'],
};

export const AXIS_COUNTS = [3, 4, 5];

export const MATERIALS = [
  { id: 'P-1.0036', group: 'P', name: 'low-carbon steel', kc1: 1800 },
  { id: 'M-316L', group: 'M', name: 'austenitic stainless', kc1: 2100 },
  { id: 'K-GG25', group: 'K', name: 'grey cast iron', kc1: 1100 },
  { id: 'N-6061-T6', group: 'N', name: 'aluminium alloy', kc1: 700 },
  { id: 'S-Inconel-718', group: 'S', name: 'nickel superalloy', kc1: 2800 },
  { id: 'H-D2', group: 'H', name: 'hardened tool steel', kc1: 3200 },
];

// Machine envelope size classes (real shop classes)
export const ENVELOPES = [
  { id: 'small', x_mm: 508, y_mm: 406, z_mm: 508 },     // ~Haas Mini Mill
  { id: 'medium', x_mm: 1016, y_mm: 508, z_mm: 635 },   // ~Haas VF-2
  { id: 'large', x_mm: 1626, y_mm: 813, z_mm: 762 },    // ~Haas VF-4
  { id: 'xl', x_mm: 2032, y_mm: 1016, z_mm: 762 },      // ~VMC large
];

// Dialect-feature axes — what divergent capabilities the scenario exercises
export const DIALECT_FEATURES = [
  'canned-cycle',   // G81/82/83/84 family — diverges Fanuc vs Heidenhain (conversational)
  'wcs',            // G54-G59 vs Heidenhain Q-params
  'tool-change',    // M06 vs vendor-specific
  'sub-program',    // M98/M99 vs L<n> CALL LBL vs $sub
  'probing',        // Renishaw G65 macros vs Heidenhain TCH PROBE
  'rigid-tap',      // M29 prefix (Fanuc) vs Okuma G284 vs Heidenhain CYCL DEF 207
  'high-speed-mill', // AICC/HPCC (Fanuc) vs Super-NURBS (Okuma) vs CNC5/CNC6 (Heidenhain)
];

// === Seeded RNG (deterministic) ===

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function pickN(rng, arr, n) {
  const a = [...arr];
  const out = [];
  for (let i = 0; i < Math.min(n, a.length); i++) {
    const idx = Math.floor(rng() * a.length);
    out.push(a[idx]);
    a.splice(idx, 1);
  }
  return out;
}
function randFloat(rng, min, max, decimals = 2) {
  const v = min + rng() * (max - min);
  return Number(v.toFixed(decimals));
}

// === Scenario builder ===

function buildScenario(rng, id) {
  const controller = pick(rng, CONTROLLERS);
  const operation = pick(rng, OPERATIONS);
  const cycle = pick(rng, CYCLES_BY_OPERATION[operation]);
  const axis_count = pick(rng, AXIS_COUNTS);
  const material = pick(rng, MATERIALS);
  const envelope = pick(rng, ENVELOPES);
  const features = pickN(rng, DIALECT_FEATURES, 1 + Math.floor(rng() * 3));

  // Geometry — bounded by envelope
  const max_xy = Math.min(envelope.x_mm, envelope.y_mm) * 0.8;
  const depth_mm = randFloat(rng, 5, Math.min(envelope.z_mm * 0.6, 200), 2);
  const diameter_mm = randFloat(rng, 1.5, Math.min(50, max_xy * 0.5), 2);
  const rapid_z_mm = randFloat(rng, 25, Math.min(envelope.z_mm * 0.9, 300), 1);
  const pitch_mm = /tap|thread/.test(cycle) ? randFloat(rng, 0.5, 3.0, 2) : null;

  // Expected G-code shape — varies by controller + cycle
  const expected = expectedGCodeShape(controller, cycle, operation, axis_count);

  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    controller: { id: controller.id, vendor: controller.vendor, family: controller.family, dialect: controller.dialect },
    operation,
    cycle,
    axis_count,
    material: { id: material.id, group: material.group, name: material.name },
    envelope,
    geometry: { depth_mm, diameter_mm, pitch_mm, rapid_z_mm },
    dialect_features: features,
    expected_gcode_shape: expected,
    safety_tier: 'shop_floor',
    omega_floor: 0.98,
    sx_floor: 0.98,
    validation: {
      oracle: 'master_post_generate',
      controller_profile_check: 'master_post_get_controller_profile',
      dialect_features_check: 'dialect_features',
      pass_criteria: 'shape_match AND dialect_correct AND validation_pass AND omega_meets_floor',
      reject_on: ['textual-cross-map', 'missing-dialect-resolve', 'softened-master-post-threshold'],
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'generate-post-processor-scenarios.mjs',
      slot_owner: 'india',
      milestone: 'PRISM-LAUNCH-READINESS-MS0',
      unit: 'P0-U06',
    },
  };
}

function expectedGCodeShape(controller, cycle, operation, axis_count) {
  const d = controller.dialect;
  const must_contain = [];
  const must_not_contain = [];
  let lines_min = 20;
  let lines_max = 200;

  // Header expectations — varies by dialect
  if (d === 'fanuc') must_contain.push('%', 'O', 'G90', 'G54');
  else if (d === 'okuma') must_contain.push('%', 'G15 H', 'G94');
  else if (d === 'haas') must_contain.push('%', 'O', 'G90', 'G54');
  else if (d === 'heidenhain') must_contain.push('BEGIN PGM', 'END PGM', 'L M3');
  else if (d === 'mitsubishi') must_contain.push('%', 'O', 'G90');

  // Cycle expectations
  if (/^drill/.test(cycle)) {
    if (d === 'fanuc' || d === 'haas') must_contain.push('G81', 'G80');
    else if (d === 'okuma') must_contain.push('G81', 'G80');
    else if (d === 'heidenhain') must_contain.push('CYCL DEF 200');
  }
  if (cycle === 'drill-peck' || cycle === 'drill-deep') {
    if (d === 'fanuc' || d === 'haas') must_contain.push('G83');
    else if (d === 'heidenhain') must_contain.push('CYCL DEF 203');
  }
  if (cycle === 'tap-rigid') {
    if (d === 'fanuc') must_contain.push('M29', 'G84');
    else if (d === 'okuma') must_contain.push('G284');
    else if (d === 'haas') must_contain.push('G84');
    else if (d === 'heidenhain') must_contain.push('CYCL DEF 207');
  }
  if (cycle.includes('thread-turn')) {
    if (d === 'fanuc') must_contain.push('G76');
    else if (d === 'okuma') must_contain.push('G33');
  }
  if (cycle === 'bore') {
    if (d === 'fanuc' || d === 'haas') must_contain.push('G85');
    else if (d === 'heidenhain') must_contain.push('CYCL DEF 202');
  }

  // Cross-dialect REJECTIONS — guards textual cross-mapping
  if (d === 'fanuc') must_not_contain.push('CYCL DEF', 'BEGIN PGM', 'G15 H');
  if (d === 'okuma') must_not_contain.push('CYCL DEF', 'BEGIN PGM');
  if (d === 'haas') must_not_contain.push('CYCL DEF', 'BEGIN PGM', 'G15 H');
  if (d === 'heidenhain') must_not_contain.push('G54', 'G90', 'G81', 'G83');
  if (d === 'mitsubishi') must_not_contain.push('CYCL DEF', 'BEGIN PGM', 'G15 H');

  // Axis-count expectations
  if (axis_count >= 4) lines_min += 20;
  if (axis_count === 5) {
    lines_min += 30;
    if (d === 'fanuc') must_contain.push('G43.4');
    if (d === 'heidenhain') must_contain.push('M128');
    if (d === 'okuma') must_contain.push('G169');
  }

  // Operation-specific line count tuning
  if (operation === 'milling') { lines_min += 30; lines_max += 200; }
  if (operation === 'turning') { lines_min += 10; lines_max += 80; }

  return { lines_min, lines_max, must_contain, must_not_contain };
}

// === Coverage matrix ===

function coverageMatrix(scenarios) {
  const m = {
    by_controller: {}, by_operation: {}, by_cycle: {}, by_axis_count: {},
    by_material_group: {}, by_envelope: {}, by_dialect_feature: {},
    // v2 axes
    by_machine_make: {}, by_machine_type: {}, by_spindle_taper: {},
    by_spindle_rpm_class: {}, by_optional_feature: {}, by_hp_class: {},
  };
  for (const s of scenarios) {
    m.by_controller[s.controller.id] = (m.by_controller[s.controller.id] || 0) + 1;
    m.by_operation[s.operation] = (m.by_operation[s.operation] || 0) + 1;
    m.by_cycle[s.cycle] = (m.by_cycle[s.cycle] || 0) + 1;
    m.by_axis_count[s.axis_count] = (m.by_axis_count[s.axis_count] || 0) + 1;
    m.by_material_group[s.material.group] = (m.by_material_group[s.material.group] || 0) + 1;
    // v1 envelope (legacy) — null-safe
    if (s.envelope?.id) m.by_envelope[s.envelope.id] = (m.by_envelope[s.envelope.id] || 0) + 1;
    for (const f of (s.dialect_features || [])) m.by_dialect_feature[f] = (m.by_dialect_feature[f] || 0) + 1;
    // v2 dimensions — null-safe
    if (s.machine?.make) m.by_machine_make[s.machine.make] = (m.by_machine_make[s.machine.make] || 0) + 1;
    if (s.machine?.type) m.by_machine_type[s.machine.type] = (m.by_machine_type[s.machine.type] || 0) + 1;
    if (s.spindle?.taper_id) m.by_spindle_taper[s.spindle.taper_id] = (m.by_spindle_taper[s.spindle.taper_id] || 0) + 1;
    if (s.spindle?.hp_class) m.by_hp_class[s.spindle.hp_class] = (m.by_hp_class[s.spindle.hp_class] || 0) + 1;
    if (s.spindle?.max_rpm) {
      const rpmClass = s.spindle.max_rpm < 6000 ? 'low' : (s.spindle.max_rpm < 12000 ? 'med' : 'high');
      m.by_spindle_rpm_class[rpmClass] = (m.by_spindle_rpm_class[rpmClass] || 0) + 1;
    }
    for (const f of (s.optional_features || [])) m.by_optional_feature[f] = (m.by_optional_feature[f] || 0) + 1;
  }
  // Coverage pct = (distinct values present) / (distinct values defined).
  // v2 adds machine/spindle/optional-feature axes; v1-only fields graceful.
  const pct = {
    controller: Object.keys(m.by_controller).length / Math.max(CONTROLLERS.length, CONTROLLER_IDS.length),
    operation: Object.keys(m.by_operation).length / OPERATIONS.length,
    cycle: Object.keys(m.by_cycle).length / (Object.values(CYCLES_BY_OPERATION).flat().length),
    axis_count: Object.keys(m.by_axis_count).length / AXIS_COUNTS.length,
    material: Object.keys(m.by_material_group).length / new Set(MATERIALS.map(x => x.group)).size,
    optional_feature: Object.keys(m.by_optional_feature).length / Math.max(1, OPTIONAL_FEATURES.length),
    spindle_taper: Object.keys(m.by_spindle_taper).length / Math.max(1, SPINDLE_TAPERS.length),
    spindle_rpm_class: Object.keys(m.by_spindle_rpm_class).length / 3,  // low/med/high
    machine_type: Object.keys(m.by_machine_type).length / 3,            // Mill/Lathe/Router
  };
  m.coverage_pct = pct;
  m.composite_coverage = Object.values(pct).reduce((s, v) => s + v, 0) / Object.keys(pct).length;
  return m;
}

// === v2.0.0 scenario builder — real machine × spindle × controller × features ===

function buildScenarioV2(rng, id) {
  // 1. Pick operation first (determines machine type)
  const operation = pick(rng, OPERATIONS);
  const machineType = /turn|lathe/i.test(operation) ? 'Lathe' : 'Mill';
  const machines = filterMachinesByType(machineType);
  const candidates = machines.length > 0 ? machines : filterMachinesByType('Mill');
  const machine = pick(rng, candidates);

  // 2. Pick controller compatible with machine make
  const compatible = controllersForMake(machine.make);
  const controllerDialect = pick(rng, compatible);
  const controller = buildControllerInstance(controllerDialect);
  if (!controller) throw new Error(`unknown-controller-dialect:${controllerDialect}`);

  // 3. Resolve spindle from machine taper
  const spindle = spindleForMachine(machine);

  // 4. Other axes
  const cycle = pick(rng, CYCLES_BY_OPERATION[operation]);
  const axis_count = pick(rng, AXIS_COUNTS);
  const material = pick(rng, MATERIALS);

  // 5. Bound geometry by spindle rpm + machine envelope (use rpm_max as a
  //    feasibility filter — soft cap on tool diameter for high-rpm spindles)
  const max_tool_dia = spindle.max_rpm >= 12000 ? 25 : 50;
  const depth_mm = randFloat(rng, 5, 150, 2);
  const diameter_mm = randFloat(rng, 1.5, max_tool_dia, 2);
  const rapid_z_mm = randFloat(rng, 25, 250, 1);
  const pitch_mm = /tap|thread/.test(cycle) ? randFloat(rng, 0.5, 3.0, 2) : null;

  // 6. Sample optional features, BUT controller-gate each
  //    (per slot soul §3: STRUCTURAL not textual cross-mapping)
  const desired = pickN(rng, OPTIONAL_FEATURES, 2 + Math.floor(rng() * 4));
  const optional_features = desired.filter(f => featureValidForController(f, controllerDialect));
  const rejected_features = desired.filter(f => !featureValidForController(f, controllerDialect));

  // 7. Always-valid HSM gate (most controllers have it, scenario asserts it)
  if (featureValidForController('hsm', controllerDialect) && !optional_features.includes('hsm') && rng() < 0.3) {
    optional_features.push('hsm');
  }
  if (axis_count === 5 && featureValidForController('five_axis_tcp', controllerDialect)) {
    if (!optional_features.includes('five_axis_tcp')) optional_features.push('five_axis_tcp');
  }

  // 8. Expected G-code shape with feature-aware augmentation
  const expected = expectedGCodeShape(controller, cycle, operation, axis_count);
  // Augment must_contain with feature-specific tokens
  const cfeats = CONTROLLER_FEATURES[controllerDialect].features;
  if (optional_features.includes('tsc') && cfeats.tsc?.on) expected.must_contain.push(cfeats.tsc.on);
  if (optional_features.includes('ssv') && cfeats.ssv?.on) expected.must_contain.push(cfeats.ssv.on);
  if (optional_features.includes('hsm') && cfeats.hsm?.code) {
    // HSM code may be multi-token; assert first token
    const tok = String(cfeats.hsm.code).split(' ')[0];
    if (!expected.must_contain.includes(tok)) expected.must_contain.push(tok);
  }

  return {
    id,
    schemaVersion: SCHEMA_VERSION,  // 2.0.0
    controller,
    machine: {
      name: machine.name,
      make: machine.make,
      model: machine.model,
      type: machine.type,
    },
    spindle,
    operation,
    cycle,
    axis_count,
    material: { id: material.id, group: material.group, name: material.name },
    geometry: { depth_mm, diameter_mm, pitch_mm, rapid_z_mm },
    optional_features,
    rejected_features,  // surfaced for fail-loud — never silently dropped
    expected_gcode_shape: expected,
    safety_tier: 'shop_floor',
    omega_floor: 0.98,
    sx_floor: 0.98,
    validation: {
      oracle: 'master_post_generate',
      controller_profile_check: 'master_post_get_controller_profile',
      dialect_features_check: 'dialect_features',
      feature_gate_applied: 'featureValidForController',
      pass_criteria: 'shape_match AND dialect_correct AND validation_pass AND omega_meets_floor AND all_features_controller_supported',
      reject_on: ['textual-cross-map', 'missing-dialect-resolve', 'softened-master-post-threshold', 'feature-not-supported-by-controller'],
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'generate-post-processor-scenarios.mjs',
      slot_owner: 'india',
      milestone: 'PRISM-LAUNCH-READINESS-MS0',
      unit: 'P0-U06',
      schema: 'v2.0.0',
    },
  };
}

// === Stratified generation — guarantee minimum per-controller count ===

export function generateCorpus({ target = 200, seed = 1, batchId = '001', schemaVersion = '2.0.0' }) {
  const rng = mulberry32(seed);

  // v2 stratifies across 7 controllers (CONTROLLER_FEATURES); v1 across 5 (legacy CONTROLLERS).
  const controllerPool = schemaVersion === '2.0.0' ? CONTROLLER_IDS : CONTROLLERS.map(c => c.dialect);
  const perController = Math.ceil(target / controllerPool.length);
  const scenarios = [];
  let counter = 1;

  for (const dialect of controllerPool) {
    for (let i = 0; i < perController; i++) {
      let s;
      if (schemaVersion === '2.0.0') {
        // v2 builder samples real machine + spindle + features (controller-gated).
        // Retry up to 3x to honor stratification (machine pool may not match
        // dialect on first sample — machine.make → controllersForMake constraint).
        let attempts = 0;
        do {
          s = buildScenarioV2(rng, `PP-S-${String(counter).padStart(5, '0')}`);
          attempts++;
        } while (s.controller.dialect !== dialect && attempts < 3);
        // If retry exhausted, FORCE the dialect (machine/controller pairing may
        // be unusual but still valid — operator may retrofit). Fail-loud noted.
        // CRITICAL: must RE-DERIVE expected_gcode_shape with the new controller,
        // otherwise the previous controller's tokens leak (structural validator
        // catches this as `structural-cross-dialect-leak` — slot soul §3).
        // Also recompute optional_features+rejected_features under the new gate.
        if (s.controller.dialect !== dialect) {
          const originalMake = s.machine?.make;
          s.controller = buildControllerInstance(dialect);
          s.metadata.forced_controller = true;
          s.metadata.forced_reason = `original_machine_make_${originalMake}_pool_did_not_yield_${dialect}_after_3_retries`;
          // Re-derive expected_gcode_shape so dialect tokens stay coherent
          s.expected_gcode_shape = expectedGCodeShape(s.controller, s.cycle, s.operation, s.axis_count);
          // Re-gate features against the new controller (drop now-invalid)
          const previouslyOptional = s.optional_features || [];
          s.optional_features = previouslyOptional.filter(f => featureValidForController(f, dialect));
          s.rejected_features = [
            ...(s.rejected_features || []),
            ...previouslyOptional.filter(f => !featureValidForController(f, dialect)),
          ];
          // Re-augment with the new controller's feature tokens (HSM/TSC/SSV/5ax)
          const cfeats = CONTROLLER_FEATURES[dialect].features;
          if (s.optional_features.includes('tsc') && cfeats.tsc?.on) s.expected_gcode_shape.must_contain.push(cfeats.tsc.on);
          if (s.optional_features.includes('ssv') && cfeats.ssv?.on) s.expected_gcode_shape.must_contain.push(cfeats.ssv.on);
          if (s.optional_features.includes('hsm') && cfeats.hsm?.code) {
            const tok = String(cfeats.hsm.code).split(' ')[0];
            if (!s.expected_gcode_shape.must_contain.includes(tok)) s.expected_gcode_shape.must_contain.push(tok);
          }
        }
      } else {
        // v1 legacy path
        const c1 = CONTROLLERS.find(x => x.dialect === dialect);
        s = buildScenario(rng, `PP-S-${String(counter).padStart(5, '0')}`);
        s.controller = { id: c1.id, vendor: c1.vendor, family: c1.family, dialect: c1.dialect };
        s.expected_gcode_shape = expectedGCodeShape(c1, s.cycle, s.operation, s.axis_count);
      }
      scenarios.push(s);
      counter++;
      if (scenarios.length >= target) break;
    }
    if (scenarios.length >= target) break;
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    batchId,
    generatedAt: new Date().toISOString(),
    generator: 'generate-post-processor-scenarios.mjs',
    seed,
    target,
    actual_count: scenarios.length,
    slot_owner: 'india',
    milestone: 'PRISM-LAUNCH-READINESS-MS0',
    unit: 'P0-U06',
    controllers: CONTROLLERS.map(c => c.id),
    coverage: coverageMatrix(scenarios),
    safety: {
      tier: 'shop_floor',
      omega_floor: 0.98,
      sx_floor: 0.98,
      validation_oracle: 'prism_cam:master_post_generate',
    },
  };

  return { manifest, scenarios };
}

// === Emit to disk ===

function emit(corpus, batchId) {
  const batchDir = path.join(SCENARIO_ROOT, `batch-${batchId}`);
  const scenDir = path.join(batchDir, 'scenarios');
  fs.mkdirSync(scenDir, { recursive: true });

  fs.writeFileSync(path.join(batchDir, 'manifest.json'), JSON.stringify(corpus.manifest, null, 2) + '\n', 'utf8');

  for (const s of corpus.scenarios) {
    fs.writeFileSync(path.join(scenDir, `${s.id}.json`), JSON.stringify(s, null, 2) + '\n', 'utf8');
  }

  // Compact index (one line per scenario) — handles v1 + v2 shapes
  const index = corpus.scenarios.map(s => ({
    id: s.id, controller: s.controller.id, operation: s.operation,
    cycle: s.cycle, axis_count: s.axis_count, material: s.material.id,
    ...(s.envelope?.id ? { envelope: s.envelope.id } : {}),
    ...(s.dialect_features ? { dialect_features: s.dialect_features } : {}),
    ...(s.machine ? { machine: `${s.machine.make}/${s.machine.model}`, machine_type: s.machine.type } : {}),
    ...(s.spindle ? { spindle: `${s.spindle.taper_id}@${s.spindle.max_rpm}rpm/${s.spindle.power_hp}hp` } : {}),
    ...(s.optional_features ? { optional_features: s.optional_features } : {}),
  }));
  fs.writeFileSync(path.join(batchDir, 'index.jsonl'),
    index.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');

  return { batchDir, scenarioCount: corpus.scenarios.length };
}

// === CLI ===

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (flag, def) => {
    const i = a.indexOf(flag);
    return i >= 0 ? a[i + 1] : def;
  };
  return {
    target: Number(get('--target', '200')),
    seed: Number(get('--seed', '1')),
    batchId: String(get('--batch', '001')),
  };
}

function main() {
  const opts = parseArgs();
  const corpus = generateCorpus(opts);
  const { batchDir, scenarioCount } = emit(corpus, opts.batchId);

  process.stderr.write(`[post-proc-scenarios] generated ${scenarioCount} scenarios\n`);
  process.stderr.write(`[post-proc-scenarios]   batchId: ${opts.batchId}\n`);
  process.stderr.write(`[post-proc-scenarios]   seed: ${opts.seed} (deterministic)\n`);
  process.stderr.write(`[post-proc-scenarios]   out: ${batchDir}\n`);
  process.stderr.write(`[post-proc-scenarios]   composite coverage: ${(corpus.manifest.coverage.composite_coverage * 100).toFixed(1)}%\n`);
  process.stderr.write(`[post-proc-scenarios]   per-controller:\n`);
  for (const [c, n] of Object.entries(corpus.manifest.coverage.by_controller)) {
    process.stderr.write(`[post-proc-scenarios]     ${c}: ${n}\n`);
  }
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]).replace(/\\/g, '/') : '';
if (invokedFile.endsWith('generate-post-processor-scenarios.mjs')) {
  main();
}
