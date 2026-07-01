/**
 * post-processor-catalog.mjs — sourced from PRISM real catalogs.
 *
 * Owned by slot:india (P0-U06 / PRISM-LAUNCH-READINESS-MS0).
 *
 * Two data sources, BOTH internal:
 *   1. mcp-server/src/data/gwizard-machines.json — 99 real machines
 *      (Bridgeport, Haas, Mazak, DMG MORI, etc.) with taperType, rpmLimit,
 *      hpLimit, type (Mill/Lathe/Router).
 *   2. mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts line 320+
 *      — controller-features catalog (HSM code, TSC codes, probing presence,
 *      5-ax TCP mode, SSV, coolant types) for 7 controllers.
 *
 * This lib presents BOTH as clean APIs the scenario generator + validation
 * harness can sample/cross-check without re-deriving.
 *
 * Per india slot soul §3: cross-mapping is STRUCTURAL not textual — each
 * controller's feature set is a hard gate, NEVER textually substituted.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// R11 conformance — sibling lib idiom (master-index-search-lib + others use fileURLToPath)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GWIZARD_PATH = path.join(REPO_ROOT, 'mcp-server', 'src', 'data', 'gwizard-machines.json');

// === Controller feature matrix — sourced from MasterPostProcessorUnifiedAGIEngine line 320-475 ===
//
// IMPORTANT: feature codes change per controller; this is a CROSS-MAP REJECTION
// guard not a substitution table.

export const CONTROLLER_FEATURES = {
  fanuc: {
    id: 'fanuc',
    name: 'Fanuc',
    families: ['0i-TF', '0i-MF', '30i', '31i-B', '31i-B5', '32i-B'],
    market_share: 0.35,
    features: {
      hsm: { code: 'G5.1 Q1', modes: ['R5.0', 'R0.01'] },
      five_axis_tcp: 'G43.4',
      coolant: ['flood', 'mist'],
      tsc: false,                // no through-spindle by default
      probing: false,            // no native probing
      ssv: false,                // no spindle speed variation
    },
  },
  siemens: {
    id: 'siemens',
    name: 'Siemens SINUMERIK',
    families: ['840D sl', '828D', '808D'],
    market_share: 0.25,
    features: {
      hsm: { code: 'CYCLE832', modes: ['(0.05,1)', '(0.005,1)'] },
      five_axis_tcp: 'TRAORI(1)',
      coolant: ['flood'],
      tsc: false,
      probing: false,
      ssv: false,
    },
  },
  haas: {
    id: 'haas',
    name: 'Haas NGC',
    families: ['NGC'],
    market_share: 0.15,
    features: {
      hsm: { code: 'G187', modes: ['P1', 'P2', 'P3'] },
      five_axis_tcp: 'G234',
      coolant: ['flood', 'mist', 'air', 'tsc'],
      tsc: { on: 'M88', off: 'M89' },
      probing: { type: 'wips', probe: 'G65 P9832', toolSetter: 'G65 P9023' },
      ssv: { on: 'G10', off: 'G11', range: '5-15%' },
    },
  },
  okuma: {
    id: 'okuma',
    name: 'Okuma OSP',
    families: ['OSP-P300M', 'OSP-P300L', 'OSP-P300A'],
    market_share: 0.10,
    features: {
      hsm: { code: 'G08 P1', modes: ['P1', 'P5'] },
      five_axis_tcp: 'G169',
      coolant: ['flood', 'air', 'tsc'],
      tsc: { on: 'M51', off: 'M59' },
      probing: { probe: 'G65 P9810', toolSetter: 'G65 P9820' },
      ssv: { on: 'M695', off: 'M694', range: '3-20%' },
      cas: 'Collision Avoidance System',
    },
  },
  mazak: {
    id: 'mazak',
    name: 'Mazak Mazatrol',
    families: ['SmoothG', 'SmoothX', 'SmoothAi'],
    market_share: 0.08,
    features: {
      hsm: { code: 'G5.1 Q1', modes: ['R5.0', 'R0.01'] },
      five_axis_tcp: 'G43.4',
      coolant: ['flood', 'mist', 'tsc'],
      tsc: { on: 'M51', off: 'M09' },
      probing: false,
      ssv: false,
    },
  },
  heidenhain: {
    id: 'heidenhain',
    name: 'Heidenhain TNC',
    families: ['TNC 640', 'TNC 620', 'TNC 530'],
    market_share: 0.05,
    features: {
      hsm: { code: 'M120', modes: ['LA5.0', 'LA0.01'] },
      five_axis_tcp: 'FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS',
      coolant: ['flood'],
      tsc: false,
      probing: false,
      ssv: false,
    },
  },
  mitsubishi: {
    id: 'mitsubishi',
    name: 'Mitsubishi MELDAS',
    families: ['M800', 'M80'],
    market_share: 0.02,
    features: {
      hsm: { code: 'G05.1 Q1', modes: ['R5.0'] },
      five_axis_tcp: 'G43.4',
      coolant: ['flood'],
      tsc: false,
      probing: false,
      ssv: false,
    },
  },
};

export const CONTROLLER_IDS = Object.keys(CONTROLLER_FEATURES);

// === Spindle taper catalog — real industry standards ===

export const SPINDLE_TAPERS = [
  { id: 'BT30', drawbar: 'standard', max_rpm_typical: 12000, hp_class: 'light' },
  { id: 'BT40', drawbar: 'standard', max_rpm_typical: 10000, hp_class: 'medium' },
  { id: 'BT50', drawbar: 'standard', max_rpm_typical: 6000, hp_class: 'heavy' },
  { id: 'CAT40', drawbar: 'standard', max_rpm_typical: 10000, hp_class: 'medium' },
  { id: 'CAT50', drawbar: 'standard', max_rpm_typical: 6000, hp_class: 'heavy' },
  { id: 'HSK63', drawbar: 'HSK', max_rpm_typical: 20000, hp_class: 'high-speed' },
  { id: 'HSK100', drawbar: 'HSK', max_rpm_typical: 15000, hp_class: 'heavy-hsm' },
  { id: 'R8', drawbar: 'manual', max_rpm_typical: 4200, hp_class: 'manual-mill' },
];

// === Optional features — controller-gated ===

export const OPTIONAL_FEATURES = [
  'tsc',                  // through-spindle coolant (haas/okuma/mazak)
  'hpc',                  // high-pressure coolant (typically vendor add-on, controller-agnostic)
  'mql',                  // minimum-quantity lubrication (vendor add-on)
  'flood',                // standard coolant (all controllers)
  'mist',                 // mist coolant (fanuc/haas/mazak)
  'air',                  // air blast (haas/okuma)
  'probing_wips',         // Haas WIPS
  'probing_renishaw',     // Renishaw G65 macros (Fanuc-style)
  'probing_heidenhain',   // TCH PROBE (heidenhain native)
  'ssv',                  // spindle speed variation (haas/okuma)
  'hsm',                  // high-speed-machining mode (all controllers, vendor codes)
  'five_axis_tcp',        // 5-axis tool-center-point (only valid for axis_count==5)
  'cas',                  // Okuma Collision Avoidance System
  'atc',                  // automatic tool changer (machine-level, not controller)
  'sub_spindle',          // lathe sub-spindle
  'live_tooling',         // lathe live-tooling (mill-turn)
  'bar_feeder',           // lathe bar feeder
  'gantry_loader',        // machine-level
];

/**
 * Is `feature` valid for `controllerId`? Returns true iff the controller
 * catalog declares the capability (or feature is controller-agnostic).
 *
 * Per india slot soul §3: this is the structural cross-map guard — used
 * by the generator to NEVER assign a feature to a controller that doesn't
 * support it (textual cross-mapping = silent failure mode).
 */
export function featureValidForController(feature, controllerId) {
  const c = CONTROLLER_FEATURES[controllerId];
  if (!c) return false;
  const f = c.features;
  switch (feature) {
    case 'tsc': return Boolean(f.tsc);
    case 'mist': return f.coolant.includes('mist');
    case 'air': return f.coolant.includes('air');
    case 'flood': return f.coolant.includes('flood');
    case 'probing_wips': return Boolean(f.probing) && f.probing.type === 'wips';
    case 'probing_renishaw': return Boolean(f.probing) && /G65/.test(f.probing.probe || '');
    case 'probing_heidenhain': return controllerId === 'heidenhain';
    case 'ssv': return Boolean(f.ssv);
    case 'hsm': return Boolean(f.hsm);
    case 'five_axis_tcp': return Boolean(f.five_axis_tcp);
    case 'cas': return Boolean(f.cas);
    // Controller-agnostic (machine/vendor add-ons)
    case 'hpc': case 'mql': case 'atc':
    case 'sub_spindle': case 'live_tooling':
    case 'bar_feeder': case 'gantry_loader':
      return true;
    default: return false;
  }
}

// === gwizard-machines.json loader (real machine catalog) ===

let _machinesCache = null;
export function loadMachines() {
  if (_machinesCache) return _machinesCache;
  const raw = JSON.parse(fs.readFileSync(GWIZARD_PATH, 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.values(raw).find(v => Array.isArray(v)) || [];
  _machinesCache = list.map(m => ({
    name: m.name,
    make: m.make,
    model: m.model,
    type: m.type,                // 'Mill' | 'Lathe' | 'Router' | ...
    taperType: m.taperType,      // 'BT' | 'CAT' | 'HSK' | 'R8' | 'Other'
    taperSize: m.taperSize,      // 30 / 40 / 50 / 63 / 100
    rpm_max: m.rpmLimit,
    rpm_min: m.rpmMinLimit,
    feed_max_ipm: m.feedLimit,
    hp_max: m.hpLimit,
  }));
  return _machinesCache;
}

export function filterMachinesByType(type /* 'Mill'|'Lathe'|'Router' */) {
  return loadMachines().filter(m => m.type === type);
}

/**
 * Resolve a spindle catalog entry for a machine by taperType+taperSize.
 * Falls back to a synthesized spindle when the machine's taper is unusual.
 */
export function spindleForMachine(machine) {
  const t = String(machine.taperType || '').toUpperCase();
  const sz = machine.taperSize;
  // Map machine taperType+size → SPINDLE_TAPERS id
  let id;
  if (t === 'BT' && sz === 30) id = 'BT30';
  else if (t === 'BT' && sz === 40) id = 'BT40';
  else if (t === 'BT' && sz === 50) id = 'BT50';
  else if (t === 'CAT' && sz === 40) id = 'CAT40';
  else if (t === 'CAT' && sz === 50) id = 'CAT50';
  else if (t === 'HSK' && sz === 63) id = 'HSK63';
  else if (t === 'HSK' && sz === 100) id = 'HSK100';
  else if (t === 'R8') id = 'R8';
  const catalog = SPINDLE_TAPERS.find(s => s.id === id) || null;

  return {
    taper_id: id || `${t}${sz || ''}`,
    taper_type: t,
    taper_size: sz,
    max_rpm: machine.rpm_max,
    min_rpm: machine.rpm_min,
    power_hp: machine.hp_max,
    drive_type: (machine.rpm_max || 0) >= 12000 ? 'direct-drive' : 'belt-or-gear',
    hp_class: catalog?.hp_class || 'unknown',
  };
}

// === v3.0.0 — CFME adapter (P0-U06.7 dedup, expands controllers 7→17) ===

const CFME_PATH = path.join(REPO_ROOT, 'mcp-server', 'dist', 'engines', 'ControllerFeatureMatrixEngine.js');

let _cfmeCache = null;

/**
 * Load CFME `CONTROLLER_MATRIX` via the compiled engine — 17 fully-detailed
 * controller variants with 25-axis ControllerFeatureSet schema. Adapter
 * pattern per P0-U06.7 — replaces inline CONTROLLER_FEATURES drift surface
 * with single source of truth (mcp-server/src/engines/ControllerFeatureMatrixEngine.ts).
 *
 * Returns null + warns if compiled engine missing (R12 fail-loud; caller
 * falls back to v2 inline CONTROLLER_FEATURES).
 *
 * Each entry shape (verified from src lines 120-1400):
 *   { controller: 'fanuc-0i-f', family: 'Fanuc 0i-F', features: {<25-axis>}, key_gcodes: {...}, notes: [...] }
 */
export async function loadCFMEControllers() {
  if (_cfmeCache) return _cfmeCache;
  if (!fs.existsSync(CFME_PATH)) {
    process.stderr.write(`[post-proc-catalog] WARN: CFME engine not compiled at ${CFME_PATH}\n`);
    process.stderr.write(`[post-proc-catalog]       fall back: v2 inline CONTROLLER_FEATURES (7 variants)\n`);
    return null;
  }
  try {
    const url = 'file:///' + CFME_PATH.replace(/\\/g, '/');
    const mod = await import(url);
    const engine = mod.controllerFeatureMatrixEngine || mod.default?.controllerFeatureMatrixEngine || null;
    if (!engine || typeof engine.listControllers !== 'function') {
      process.stderr.write(`[post-proc-catalog] WARN: CFME loaded but engine accessor missing\n`);
      return null;
    }
    // listControllers() returns {total, controllers: [{controller, family, variant, year}]}
    // For each, getController() returns full {features, key_gcodes, notes}.
    const summary = engine.listControllers();
    const ids = (summary?.controllers || []).map(c => c.controller);
    const matrix = ids.map(id => {
      const full = engine.getController(id);
      // Skip error responses ({error, available})
      return (full && !full.error) ? full : null;
    }).filter(Boolean);
    if (matrix.length === 0) {
      process.stderr.write(`[post-proc-catalog] WARN: CFME engine returned no controllers\n`);
      return null;
    }
    _cfmeCache = matrix;
    return matrix;
  } catch (e) {
    process.stderr.write(`[post-proc-catalog] WARN: CFME import failed: ${e.message}\n`);
    return null;
  }
}

/**
 * v3 feature-axis check — uses the CFME 25-axis ControllerFeatureSet directly
 * when available, falls back to v2 6-feature gate when CFME is not loaded.
 *
 * v3 axes (CFME superset):
 *   hsm_smoothing · ai_contour · look_ahead_blocks · tcp_rtcp · tilted_workplane
 *   · extended_cycles · rigid_tapping · deep_hole_drilling · probing_cycles
 *   · macro_programming · conversational · subprograms · nurbs · spline · helical
 *   · polar_interpolation · max_axes · max_channels · max_wcs · max_tools
 *   · max_program_size · ssv · thermal_comp · collision_avoidance · adaptive_control
 *
 * @param {string} axis     CFME feature axis name (snake_case)
 * @param {string} controllerKey  CFME controller id (e.g. 'fanuc-0i-f')
 * @param {Array}  cfmeMatrix    optional preloaded matrix; pass to avoid re-load
 */
export function cfmeFeatureValid(axis, controllerKey, cfmeMatrix) {
  if (!cfmeMatrix) return false;
  const entry = cfmeMatrix.find(c =>
    c.controller === controllerKey ||
    c.controller?.toLowerCase().replace(/[^a-z0-9]/g, '') === controllerKey?.toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (!entry || !entry.features) return false;
  const v = entry.features[axis];
  if (v == null) return false;
  // CFME nested shape — most axes are {supported: boolean, type/code/name: string, ...}
  if (typeof v === 'object' && 'supported' in v) return Boolean(v.supported);
  // Numeric ranges (max_axes, max_channels, max_wcs, max_tools, max_program_size) → truthy if > 0
  if (typeof v === 'number') return v > 0;
  // Bare booleans (rare; some axes flatten)
  if (typeof v === 'boolean') return v;
  // String codes
  if (typeof v === 'string') return v.length > 0;
  return false;
}

/**
 * v3 — extract the dialect-specific token a feature emits (the engine's
 * .code / .type / .name nested field). Useful to AUGMENT must_contain when
 * a scenario activates that feature.
 *
 * Returns null if feature absent or unsupported.
 */
export function cfmeFeatureToken(axis, controllerKey, cfmeMatrix) {
  if (!cfmeMatrix) return null;
  const entry = cfmeMatrix.find(c =>
    c.controller === controllerKey ||
    c.controller?.toLowerCase().replace(/[^a-z0-9]/g, '') === controllerKey?.toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (!entry?.features?.[axis]) return null;
  const v = entry.features[axis];
  if (typeof v !== 'object') return null;
  if (!v.supported) return null;
  // Per dim() at engine line 1466-1473, the token-bearing keys vary by axis:
  return v.code || v.type || v.name || v.mode || null;
}

/**
 * v3 enumeration helper — full set of controllers from CFME, falling back to
 * the v2 inline CONTROLLER_IDS when CFME isn't loaded.
 *
 * Useful for generators that want max controller variability without binding
 * to the inline 7-entry catalog.
 */
export function getControllerIdsExtended(cfmeMatrix) {
  if (Array.isArray(cfmeMatrix) && cfmeMatrix.length > 0) {
    return cfmeMatrix.map(c => c.controller).filter(Boolean);
  }
  return CONTROLLER_IDS;  // v2 fallback (7 entries)
}

/**
 * Map machine -> compatible controllers (heuristic, by make).
 * Real shops sometimes pair non-canonical controllers; this is the *typical*
 * pairing surface for the scenario generator.
 */
export function controllersForMake(make) {
  const m = String(make || '').toLowerCase();
  if (/haas/.test(m)) return ['haas'];
  if (/okuma/.test(m)) return ['okuma'];
  if (/mazak/.test(m)) return ['mazak'];
  if (/dmg|deckel|gildemeister/.test(m)) return ['heidenhain', 'siemens'];
  if (/hermle|grob/.test(m)) return ['heidenhain'];
  if (/makino|mori|mori-seiki/.test(m)) return ['fanuc'];
  if (/mitsubishi/.test(m)) return ['mitsubishi'];
  if (/fadal|hurco|bridgeport|fryer/.test(m)) return ['fanuc'];   // common retrofits
  return ['fanuc'];  // industry default
}
