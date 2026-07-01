/**
 * Extract machines from monolith ENHANCED databases into ExtendedMachineProfile format.
 * Outputs TypeScript to stdout for machine-profiles-catalog-ext.ts
 *
 * Usage: node scripts/extract-machines.mjs > src/data/machine-profiles-catalog-ext.ts
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ENHANCED_DIR = "C:/PRISM/data/machines/ENHANCED";

// Brands already in machine-profiles-catalog.ts — skip these
const EXISTING_BRANDS = new Set([
  "haas", "dmg_mori", "mazak", "makino", "okuma", "hermle", "doosan"
]);

const TYPE_MAP = {
  VMC: "VMC", HMC: "HMC", DRILL_TAP: "VMC", "5AXIS": "5axis",
  LATHE: "lathe", TURNING: "lathe", MILL_TURN: "mill_turn",
  WIRE_EDM: "edm_wire", EDM_WIRE: "edm_wire", EDM_SINKER: "edm_sinker",
  SWISS: "swiss", ROUTER: "router", VTL: "vtl", BRIDGE: "bridge",
  mill_turn_center: "mill_turn", vertical_machining_center: "VMC",
  horizontal_machining_center: "HMC",
};

function mapType(t) {
  if (!t) return "VMC";
  return TYPE_MAP[t] || TYPE_MAP[t.toUpperCase()] || "VMC";
}

function hpToKw(hp) { return Math.round((hp || 0) * 0.7457 * 10) / 10; }

function extractTravel(axis) {
  if (!axis) return null;
  if (typeof axis === "object" && axis.max != null) {
    const travel = (axis.min != null) ? axis.max - axis.min : axis.max;
    return { travel: Math.abs(travel), rapid: (axis.rapid_mm_min || axis.rapid_rate || 30000) / 1000 };
  }
  return null;
}

function extractRotary(axis, name) {
  if (!axis || typeof axis !== "object") return null;
  const min = axis.min ?? axis.min_deg ?? -180;
  const max = axis.max ?? axis.max_deg ?? 180;
  const continuous = axis.continuous || false;
  return {
    name,
    min_deg: min,
    max_deg: max,
    continuous,
    ...(axis.rapid_deg_sec ? { rapid_rpm: axis.rapid_deg_sec / 6 } : {}),
    ...(axis.max_torque ? { max_torque_nm: axis.max_torque } : {}),
    ...(axis.clamping_torque ? { clamping_torque_nm: axis.clamping_torque } : {}),
    ...(axis.drive_type ? { drive_type: axis.drive_type } : {}),
  };
}

function brandName(mfr) {
  const map = {
    brother: "Brother", chiron: "Chiron", fanuc: "FANUC", feeler: "Feeler",
    fidia: "Fidia", giddings: "Giddings & Lewis", grob: "GROB",
    hardinge: "Hardinge", hurco: "Hurco", hyundai_wia: "Hyundai WIA",
    kern: "Kern", kitamura: "Kitamura", leadwell: "Leadwell",
    matsuura: "Matsuura", mikron: "Mikron", mhi: "MHI",
    okk: "OKK", roku_roku: "Roku-Roku", sodick: "Sodick",
    soraluce: "Soraluce", spinner: "Spinner", takumi: "Takumi",
    toyoda: "Toyoda", yasda: "Yasda", awea: "AWEA", cincinnati: "Cincinnati",
  };
  return map[mfr.toLowerCase()] || mfr;
}

function convertMachine(m, mfrKey) {
  const brand = brandName(mfrKey);
  const sp = m.spindle || m.main_spindle || {};
  const travels = m.travels || m.work_envelope || m.axis_specs || {};
  const tbl = m.table || {};
  const atc = m.atc || m.tool_changer || {};

  // Linear axes
  const linearAxes = [];
  for (const axName of ["x", "y", "z"]) {
    const ax = travels[axName];
    const info = extractTravel(ax);
    if (info) {
      linearAxes.push({
        name: axName.toUpperCase(),
        travel_mm: info.travel,
        rapid_m_min: info.rapid,
      });
    }
  }

  if (linearAxes.length === 0) return null; // Skip incomplete machines

  // Rotary axes — check travels, then axis_specs
  const rotaryAxes = [];
  const axisSpecs = m.axis_specs || {};
  for (const axName of ["a", "b", "c"]) {
    const ax = travels[axName] || axisSpecs[axName];
    const rot = extractRotary(ax, axName.toUpperCase());
    if (rot) rotaryAxes.push(rot);
  }

  // Spindle power: prefer kW, fallback hp→kW
  const powerKw = (sp.power_unit === "kW" ? sp.power_rating : null) || sp.power_rating || sp.power_kw || hpToKw(sp.peakHp || sp.continuousHp || 0);
  const torqueNm = sp.torque_max || sp.maxTorque_Nm || sp.max_torque || 0;
  const maxRpm = sp.maxRpm || sp.max_rpm || 10000;
  const taper = sp.taper || "BT40";

  // Type mapping
  const machineType = mapType(m.type || m.subtype);

  // Controller — may be string or object
  const ctrl = m.control || m.controller;
  const controller = typeof ctrl === "string" ? ctrl
    : (ctrl?.model ? `${ctrl.manufacturer || ""} ${ctrl.model}`.trim() : ctrl?.brand || "");

  const profile = {
    brand,
    model: m.model || m.id,
    type: machineType,
    controller,
    linear_axes: linearAxes,
    spindle: {
      max_rpm: maxRpm,
      power_kw: powerKw,
      torque_nm: torqueNm,
      taper: taper.replace("Capto_", "HSK-A63"), // Normalize Capto
    },
    tool_changer: {
      type: atc.type || "side_mount",
      capacity: atc.capacity || 20,
      change_time_sec: atc.changeTime_sec || atc.tool_change_time || 3.0,
      ...(atc.maxToolDiameter_mm ? { max_tool_diameter_mm: atc.maxToolDiameter_mm } : {}),
      ...(atc.maxToolLength_mm ? { max_tool_length_mm: atc.maxToolLength_mm } : {}),
      ...(atc.maxToolWeight_kg || atc.max_tool_weight ? { max_tool_weight_kg: atc.maxToolWeight_kg || atc.max_tool_weight } : {}),
    },
  };

  if (rotaryAxes.length > 0) profile.rotary_axes = rotaryAxes;

  // Also check work_envelope for table dimensions
  const we = m.work_envelope || {};
  if (tbl.length_mm && tbl.width_mm) {
    profile.table = {
      length_mm: tbl.length_mm,
      width_mm: tbl.width_mm || tbl.length_mm,
      max_load_kg: tbl.maxLoad_kg || tbl.max_load_capacity || 500,
    };
  } else if (we.table_length && we.table_width) {
    profile.table = {
      length_mm: we.table_length,
      width_mm: we.table_width,
      max_load_kg: we.table_load_capacity || 500,
    };
  } else if (tbl.diameter_mm) {
    profile.rotary_table = {
      diameter_mm: tbl.diameter_mm,
      max_load_kg: tbl.maxLoad_kg || tbl.max_load_capacity || 200,
    };
  }

  if (m.accuracy || m.positioning_accuracy) {
    profile.accuracy = {
      positioning_mm: m.accuracy?.positioning_mm || m.positioning_accuracy || 0.005,
      repeatability_mm: m.accuracy?.repeatability_mm || m.repeatability || 0.003,
    };
  }

  if (m.physical?.weight_kg || m.machine_dimensions?.weight) {
    profile.weight_kg = m.physical?.weight_kg || m.machine_dimensions?.weight;
  }

  return profile;
}

// Suppress console.log from monolith files during require()
const _origLog = console.log;
const _origWarn = console.warn;

// Main
const files = readdirSync(ENHANCED_DIR)
  .filter(f => f.startsWith("PRISM_") && f.endsWith("_v2.js"));

const allProfiles = {};
let totalMachines = 0;

for (const file of files) {
  const mfrKey = file.replace("PRISM_", "").replace("_MACHINE_DATABASE_ENHANCED_v2.js", "").toLowerCase();

  if (EXISTING_BRANDS.has(mfrKey)) continue;

  const filePath = join(ENHANCED_DIR, file);
  const content = readFileSync(filePath, "utf-8");

  // Extract machines via require() — suppress monolith console.log
  let db;
  try {
    console.log = () => {};
    console.warn = () => {};
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    db = require(filePath);
    console.log = _origLog;
    console.warn = _origWarn;
  } catch (e) {
    console.log = _origLog;
    console.warn = _origWarn;
    console.error(`// SKIP ${file}: ${e.message}`);
    continue;
  }

  if (!db?.machines) {
    console.error(`// SKIP ${file}: no machines`);
    continue;
  }

  const machines = Array.isArray(db.machines) ? db.machines : Object.values(db.machines);
  const profiles = [];

  for (const m of machines) {
    const p = convertMachine(m, mfrKey);
    if (p) profiles.push(p);
  }

  if (profiles.length > 0) {
    const arrayName = mfrKey.toUpperCase() + "_PROFILES";
    allProfiles[arrayName] = { brand: brandName(mfrKey), profiles, count: profiles.length };
    totalMachines += profiles.length;
  }
}

// Output TypeScript
console.log(`/**
 * Machine Profiles Catalog Extension — Remaining Manufacturers from Monolith
 *
 * Source: C:/PRISM/data/machines/ENHANCED/ (26 manufacturer databases)
 * Auto-generated by scripts/extract-machines.mjs
 * Generated: ${new Date().toISOString().split("T")[0]}
 *
 * Total: ${totalMachines} machines across ${Object.keys(allProfiles).length} manufacturers
 *
 * @see machine-profiles-catalog.ts for the first 7 brands (59 profiles)
 */

import type { ExtendedMachineProfile } from "./machine-profiles-catalog.js";
`);

for (const [arrayName, { brand, profiles, count }] of Object.entries(allProfiles)) {
  console.log(`// ${"═".repeat(76)}`);
  console.log(`// ${brand.toUpperCase()} — ${count} machines`);
  console.log(`// ${"═".repeat(76)}\n`);
  console.log(`const ${arrayName}: ExtendedMachineProfile[] = ${JSON.stringify(profiles, null, 2).replace(/"(\w+)":/g, "$1:")};\n`);
}

// Combined export
const allArrayNames = Object.keys(allProfiles);
console.log(`// ${"═".repeat(76)}`);
console.log(`// COMBINED CATALOG EXTENSION`);
console.log(`// ${"═".repeat(76)}\n`);
console.log(`export const EXTENDED_MACHINE_CATALOG_EXT: ExtendedMachineProfile[] = [`);
for (const name of allArrayNames) {
  console.log(`  ...${name},`);
}
console.log(`];\n`);

console.log(`export function getCatalogExtStats(): {`);
console.log(`  total_profiles: number;`);
console.log(`  brands: string[];`);
console.log(`  by_brand: Record<string, number>;`);
console.log(`} {`);
console.log(`  return {`);
console.log(`    total_profiles: EXTENDED_MACHINE_CATALOG_EXT.length,`);
console.log(`    brands: [${allArrayNames.map(n => `"${allProfiles[n].brand}"`).join(", ")}],`);
console.log(`    by_brand: {${allArrayNames.map(n => `"${allProfiles[n].brand}": ${allProfiles[n].count}`).join(", ")}},`);
console.log(`  };`);
console.log(`}`);
