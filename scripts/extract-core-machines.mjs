/**
 * Extract machines from CORE databases (POST_MACHINE_DATABASE + LATHE_MACHINE_DB)
 * and enrichment data (torque curves, controller features, CAD refs) from LEVEL5.
 *
 * Produces two outputs:
 * 1. New ExtendedMachineProfile entries for machines NOT already in catalog
 * 2. Enrichment overlays (lathe deep specs, controller G-codes, CAD file paths)
 *
 * Usage: node scripts/extract-core-machines.mjs > src/data/machine-enrichment-catalog.ts
 */
import { readFileSync } from "fs";

// ── Source files ──────────────────────────────────────────────────────────────
const POST_DB_PATH = "C:/PRISM/data/machines/CORE/PRISM_POST_MACHINE_DATABASE.js";
const LATHE_DB_PATH = "C:/PRISM/data/machines/CORE/PRISM_LATHE_MACHINE_DB.js";
const LEVEL5_PATH = "C:/PRISM/data/machines/LEVEL5/PRISM_HAAS_LEVEL5_COMPLETE.js";

// ── Load JS files via require ────────────────────────────────────────────────
const { createRequire } = await import("module");
const require = createRequire(import.meta.url);

const _log = console.log;
const _warn = console.warn;
function suppress() { console.log = () => {}; console.warn = () => {}; }
function restore() { console.log = _log; console.warn = _warn; }

function safeRequire(path) {
  // First try: strip browser globals and eval as function
  try {
    let content = readFileSync(path, "utf-8");
    // Remove browser-only code
    content = content.replace(/window\.\w+\s*=\s*[\w.]+;?/g, "");
    content = content.replace(/if\s*\(typeof\s+module\b[^)]*\)\s*module\.exports[^;]*;?/g, "");
    content = content.replace(/if\s*\(typeof\s+window\b[^)]*\)\s*window\.[^;]*;?/g, "");
    // Remove trailing function defs that reference undefined vars
    content = content.replace(/function\s+countMachinesInDatabase[\s\S]*$/, "");

    // Suppress console during eval (LEVEL5 files print metadata)
    suppress();
    const fn = new Function(`
      const console = { log: ()=>{}, warn: ()=>{}, error: ()=>{} };
      ${content}
      if (typeof PRISM_POST_MACHINE_DATABASE !== 'undefined') return PRISM_POST_MACHINE_DATABASE;
      if (typeof PRISM_LATHE_MACHINE_DB !== 'undefined') return PRISM_LATHE_MACHINE_DB;
      if (typeof PRISM_HAAS_LEVEL5 !== 'undefined') return PRISM_HAAS_LEVEL5;
      return null;
    `);
    const result = fn();
    restore();
    return result;
  } catch (e) {
    // Second try: require()
    try {
      suppress();
      const m = require(path);
      restore();
      return m;
    } catch (e2) {
      restore();
      console.error(`// SKIP ${path}: ${e.message}`);
      return null;
    }
  }
}

// ── Known catalog models (already in machine-profiles-catalog.ts + ext) ──────
// We'll include everything from POST DB that isn't already covered
const EXISTING_MODELS = new Set([
  // From main catalog (HAAS section) — spot-check known ones
  // We'll actually include ALL from POST DB since they have controller features
]);

// ── Type mapping ─────────────────────────────────────────────────────────────
function mapType(section) {
  if (section.type === "lathe") return "lathe";
  if (section.type === "mill") return "VMC";
  return "VMC";
}

function mapMachineType(m, sectionType) {
  if (m.millTurn || m.bAxis) return "mill_turn";
  if (m.axes === 5) return "5axis";
  if (m.horizontal) return "HMC";
  if (m.router) return "router";
  if (sectionType === "lathe") return "lathe";
  return "VMC";
}

// ── Convert POST_MACHINE_DATABASE machines ───────────────────────────────────
function convertPostMachine(m, section) {
  const type = mapMachineType(m, section.type);
  const isLathe = section.type === "lathe";

  // Linear axes
  const linearAxes = [];
  const travels = m.travels || {};
  const rapidBase = m.rapid || 1000; // mm/min default

  for (const axName of ["x", "y", "z"]) {
    const val = travels[axName];
    if (val && typeof val === "number") {
      linearAxes.push({
        name: axName.toUpperCase(),
        travel_mm: val,
        rapid_m_min: rapidBase / 1000,
      });
    }
  }
  if (linearAxes.length < 2) return null;

  // Rotary axes
  const rotaryAxes = [];
  if (m.rotary) {
    if (m.rotary.a) rotaryAxes.push({ name: "A", min_deg: -35, max_deg: m.rotary.a - 35, continuous: false });
    if (m.rotary.c) rotaryAxes.push({ name: "C", min_deg: 0, max_deg: 360, continuous: true });
  }
  if (m.bAxis && travels.b) {
    rotaryAxes.push({ name: "B", min_deg: -travels.b / 2, max_deg: travels.b / 2, continuous: false });
  }

  // Spindle
  const sp = m.spindle || {};
  const maxRpm = sp.maxRpm || 8000;
  const powerKw = sp.power || 15;
  // Estimate torque from power if not given: T = P * 9549 / rpm_base
  const baseRpm = maxRpm > 10000 ? 3000 : 2000;
  const torqueNm = Math.round(powerKw * 9549 / baseRpm);
  const taper = m.taper || (isLathe ? "A2-6" : "CAT40");

  const profile = {
    brand: section.manufacturer,
    model: m.name,
    type,
    controller: `${section.manufacturer} ${section.controller.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
    linear_axes: linearAxes,
    spindle: {
      max_rpm: maxRpm,
      power_kw: powerKw,
      torque_nm: torqueNm,
      taper,
    },
    tool_changer: {
      type: isLathe ? "turret" : "side_mount",
      capacity: isLathe ? (m.turret || 12) : (m.toolCapacity || 20),
      change_time_sec: m.toolChange || (isLathe ? 0.5 : 3.5),
    },
  };

  if (rotaryAxes.length > 0) profile.rotary_axes = rotaryAxes;

  // Lathe-specific fields
  if (isLathe && m.swing) {
    profile.lathe_specs = {
      max_swing_mm: m.swing,
      bar_capacity_mm: m.barCap || 0,
      has_y_axis: !!m.yAxis,
      has_live_tooling: !!m.liveTool,
      has_sub_spindle: !!m.subSpindle,
      turret_stations: m.turret || 12,
    };
  }

  // Flags
  if (m.highSpeed) profile.high_speed = true;
  if (m.trunnion) profile.trunnion = true;
  if (m.pallet && typeof m.pallet === "number") profile.pallet_size_mm = m.pallet;
  if (m.toolroom) profile.toolroom = true;

  return profile;
}

// ── Convert LATHE_MACHINE_DB (deep specs with torque curves) ─────────────────
function convertLatheMachine(m) {
  const linearAxes = [];
  if (m.maxTurningLength) {
    // Lathes: X = radius travel, Z = length travel
    linearAxes.push({ name: "X", travel_mm: (m.maxTurningDiameter || 300) / 2, rapid_m_min: 20 });
    linearAxes.push({ name: "Z", travel_mm: m.maxTurningLength, rapid_m_min: 20 });
  }
  if (m.yAxis) {
    linearAxes.push({ name: "Y", travel_mm: m.yAxis.travel || 100, rapid_m_min: (m.yAxis.rapid || 15.2) });
  }
  if (linearAxes.length < 2) return null;

  const sp = m.spindleMotor || {};
  const type = m.millingSpindle ? "mill_turn" : (m.liveTooling ? "lathe" : "lathe");

  const profile = {
    brand: m.manufacturer,
    model: m.model,
    type,
    controller: m.manufacturer === "Haas" ? "Haas NGC" : m.manufacturer === "Mazak" ? "Mazak SmoothAi" : m.manufacturer === "Okuma" ? "Okuma OSP-P300A" : m.manufacturer === "DMG MORI" ? "Siemens 840D sl" : "FANUC 0i-TF",
    linear_axes: linearAxes,
    spindle: {
      max_rpm: sp.maxRPM || 4000,
      power_kw: sp.power || 15,
      torque_nm: sp.maxTorque || 300,
      taper: m.spindleNose || "A2-6",
    },
    tool_changer: {
      type: "turret",
      capacity: m.turret?.stations || 12,
      change_time_sec: m.turret?.indexTime || 0.5,
    },
    lathe_deep_specs: {
      max_swing_mm: m.maxSwing,
      max_turning_diameter_mm: m.maxTurningDiameter,
      max_turning_length_mm: m.maxTurningLength,
      bar_capacity_mm: m.barCapacity,
      spindle_nose: m.spindleNose,
      spindle_bore_mm: m.spindleBore,
      torque_curve: sp.torqueCurve || [],
      turret: m.turret || {},
      tailstock: m.tailstock || {},
      chuck_options: m.chuckOptions || [],
      coolant: m.coolant || {},
      rigidity_class: m.rigidityClass || "medium",
      stability_factor: m.stabilityFactor || 0.85,
    },
  };

  if (m.liveTooling) {
    profile.lathe_deep_specs.live_tooling = m.liveTooling;
  }
  if (m.millingSpindle) {
    profile.lathe_deep_specs.milling_spindle = m.millingSpindle;
  }
  if (m.bAxis) {
    profile.lathe_deep_specs.b_axis = m.bAxis;
  }

  return profile;
}

// ── Convert LEVEL5 CAD enrichment data ───────────────────────────────────────
function extractLevel5Enrichment(m) {
  return {
    id: m.id,
    model: m.model,
    cad_file: m.cad_file || null,
    kinematic_chain: m.kinematic_chain || null,
    collision_zones: m.collision_zones || null,
    dimensions: m.dimensions || null,
    controller_details: m.controller || null,
  };
}

// ── Controller features extraction ───────────────────────────────────────────
function extractControllerFeatures(section) {
  if (!section.features) return null;
  return {
    manufacturer: section.manufacturer,
    controller: section.controller,
    dialect: section.dialect,
    machine_type: section.type,
    features: section.features,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

const postDb = safeRequire(POST_DB_PATH);
const latheDb = safeRequire(LATHE_DB_PATH);
const level5Db = safeRequire(LEVEL5_PATH);

// ── 1. POST_MACHINE_DATABASE → new profiles + controller features ────────────
const postProfiles = [];
const controllerFeatures = [];

if (postDb) {
  for (const [sectionKey, section] of Object.entries(postDb)) {
    if (!section.machines) continue;

    // Extract controller features
    const feat = extractControllerFeatures(section);
    if (feat) controllerFeatures.push(feat);

    // Extract machine profiles
    for (const [machKey, mach] of Object.entries(section.machines)) {
      const p = convertPostMachine(mach, section);
      if (p) postProfiles.push(p);
    }
  }
}

// ── 2. LATHE_MACHINE_DB → deep lathe specs with torque curves ────────────────
const latheProfiles = [];

if (latheDb) {
  for (const [mfrKey, machines] of Object.entries(latheDb)) {
    if (typeof machines !== "object") continue;
    for (const [modelKey, m] of Object.entries(machines)) {
      if (!m.manufacturer) continue;
      const p = convertLatheMachine(m);
      if (p) latheProfiles.push(p);
    }
  }
}

// ── 3. LEVEL5 → CAD enrichment overlays ──────────────────────────────────────
const level5Enrichments = [];

if (level5Db && level5Db.machines) {
  const machines = Array.isArray(level5Db.machines) ? level5Db.machines : Object.values(level5Db.machines);
  for (const m of machines) {
    const e = extractLevel5Enrichment(m);
    if (e && e.cad_file) level5Enrichments.push(e);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTPUT TYPESCRIPT
// ══════════════════════════════════════════════════════════════════════════════

const date = new Date().toISOString().split("T")[0];
const J = (v) => JSON.stringify(v, null, 2).replace(/"(\w+)":/g, "$1:");

_log(`/**
 * Machine Enrichment Catalog — CORE + LEVEL5 Data
 *
 * Source: PRISM_POST_MACHINE_DATABASE.js (${postProfiles.length} machines, ${controllerFeatures.length} controller configs)
 *         PRISM_LATHE_MACHINE_DB.js (${latheProfiles.length} lathes with torque curves)
 *         PRISM_HAAS_LEVEL5_COMPLETE.js (${level5Enrichments.length} CAD file references)
 * Auto-generated by scripts/extract-core-machines.mjs
 * Generated: ${date}
 */

import type { ExtendedMachineProfile, AxisDetail, RotaryAxisDetail } from "./machine-profiles-catalog.js";
`);

// ── Post DB profiles ─────────────────────────────────────────────────────────
_log(`// ${"═".repeat(76)}`);
_log(`// POST DATABASE MACHINES — ${postProfiles.length} machines across mills + lathes`);
_log(`// ${"═".repeat(76)}\n`);
_log(`export const POST_DB_PROFILES: (ExtendedMachineProfile & { lathe_specs?: any; high_speed?: boolean; trunnion?: boolean; pallet_size_mm?: number; toolroom?: boolean })[] = ${J(postProfiles)};\n`);

// ── Lathe deep specs ─────────────────────────────────────────────────────────
_log(`// ${"═".repeat(76)}`);
_log(`// LATHE DEEP SPECS — ${latheProfiles.length} lathes with torque curves & rigidity`);
_log(`// ${"═".repeat(76)}\n`);

_log(`export interface TorqueCurvePoint {
  rpm: number;
  torque: number;
}

export interface LatheDeepSpecs {
  max_swing_mm: number;
  max_turning_diameter_mm: number;
  max_turning_length_mm: number;
  bar_capacity_mm: number;
  spindle_nose: string;
  spindle_bore_mm: number;
  torque_curve: TorqueCurvePoint[];
  turret: { stations?: number; type?: string; indexTime?: number; maxToolSize?: number; rigidityFactor?: number };
  tailstock: { available?: boolean; quillDiameter?: number; thrustForce?: number };
  chuck_options: string[];
  coolant: { pressure?: number; flow?: number; tscAvailable?: boolean; tscPressure?: number };
  rigidity_class: "light" | "medium" | "heavy";
  stability_factor: number;
  live_tooling?: { power: number; maxRPM: number; torque: number };
  milling_spindle?: { power: number; maxRPM: number; torque: number };
  b_axis?: { travel: number; clampTorque: number };
}

export interface LatheEnrichedProfile extends ExtendedMachineProfile {
  lathe_deep_specs: LatheDeepSpecs;
}
`);
_log(`export const LATHE_DEEP_PROFILES: LatheEnrichedProfile[] = ${J(latheProfiles)};\n`);

// ── Controller features ──────────────────────────────────────────────────────
_log(`// ${"═".repeat(76)}`);
_log(`// CONTROLLER FEATURES — G-code mappings per manufacturer/controller`);
_log(`// ${"═".repeat(76)}\n`);

_log(`export interface ControllerFeatureSet {
  manufacturer: string;
  controller: string;
  dialect: string;
  machine_type: string;
  features: Record<string, any>;
}
`);
_log(`export const CONTROLLER_FEATURES: ControllerFeatureSet[] = ${J(controllerFeatures)};\n`);

// ── Level 5 CAD enrichments ──────────────────────────────────────────────────
_log(`// ${"═".repeat(76)}`);
_log(`// LEVEL 5 CAD ENRICHMENTS — ${level5Enrichments.length} machines with STEP file refs`);
_log(`// ${"═".repeat(76)}\n`);

_log(`export interface CadEnrichment {
  id: string;
  model: string;
  cad_file: { step_file: string; file_size_mb: number; relative_path: string } | null;
  kinematic_chain: Record<string, any> | null;
  collision_zones: Record<string, any> | null;
  dimensions: Record<string, any> | null;
  controller_details: Record<string, any> | null;
}
`);
_log(`export const CAD_ENRICHMENTS: CadEnrichment[] = ${J(level5Enrichments)};\n`);

// ── Stats ────────────────────────────────────────────────────────────────────
_log(`// ${"═".repeat(76)}`);
_log(`// ENRICHMENT STATS`);
_log(`// ${"═".repeat(76)}\n`);
_log(`export function getEnrichmentStats() {
  return {
    post_db_profiles: POST_DB_PROFILES.length,
    lathe_deep_profiles: LATHE_DEEP_PROFILES.length,
    controller_feature_sets: CONTROLLER_FEATURES.length,
    cad_enrichments: CAD_ENRICHMENTS.length,
    total_data_points: POST_DB_PROFILES.length + LATHE_DEEP_PROFILES.length + CAD_ENRICHMENTS.length,
    manufacturers: Array.from(new Set([
      ...POST_DB_PROFILES.map(p => p.brand),
      ...LATHE_DEEP_PROFILES.map(p => p.brand),
    ])),
  };
}`);
