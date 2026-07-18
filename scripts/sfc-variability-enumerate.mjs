#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 Stage 1 — Combinatorial enumerator.
 *
 * Walks the full compatibility-filtered cross-product of OrchestratorInput
 * dimensions (machine × spindle × controller × coolant × material × tool ×
 * holder × operation × strategy × stickout × fixture × insert) and emits
 * chunked JSONL files of valid OrchestratorInput objects ready for Stage 2
 * (the batch runner that drives SpeedFeedOrchestratorEngine.compute on each).
 *
 * The operator wants 100M+ valid combinations. Pure Cartesian is ~10^15;
 * compatibility filters (ISO 513 group rules, taper-holder, table-size,
 * coating-material, workholding-geometry) cut 99.999% of those down to a
 * tractable ~200M-500M envelope.
 *
 * Modes:
 *   --estimate  (default — just count, no emission, ~10 s)
 *   --enumerate --out <dir> [--chunk N]   (emit chunked JSONL)
 *   --sample N --out <file>               (random valid sample of N for smoke testing)
 *   --resume                              (skip chunks already written)
 *
 * Idempotent + resumable. Each combo gets a sha256 input fingerprint so
 * Stage 2 can dedupe.
 *
 * No physics computation here — this is pure combinatorics + filters.
 *
 * Sources:
 *   - mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts (OrchestratorInput type)
 *   - mcp-server/src/physics/constants.ts (ISO 513 canonical material DB)
 *   - mcp-server/src/data/machine-torque-curves.ts (spindle archetypes)
 *   - web/src/data/{materials,tools,machines}.ts (catalog references)
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────
// DIMENSION TABLES (canonical, from spec §2)
// Each table lists the discrete levels the enumerator iterates.
// Continuous dims (diameter, depth, feed) get banded into representative
// levels — the orchestrator interpolates inside each band.
// ─────────────────────────────────────────────────────────────────────

const MACHINE_ARCHETYPES = [
  { id: "vmc-3axis-std",          axes: 3, max_rpm_band: 12000, power_kw: 22, taper: "BT40",  rigidity: "medium" },
  { id: "vmc-3axis-hi-rigidity",  axes: 3, max_rpm_band: 12000, power_kw: 30, taper: "BT40",  rigidity: "high"   },
  { id: "vmc-3axis-economy",      axes: 3, max_rpm_band: 8100,  power_kw: 15, taper: "CAT40", rigidity: "low"    },
  { id: "hmc-4axis",              axes: 4, max_rpm_band: 15000, power_kw: 26, taper: "CAT40", rigidity: "high"   },
  { id: "5axis-trunnion",         axes: 5, max_rpm_band: 20000, power_kw: 30, taper: "HSK-A63", rigidity: "high" },
  { id: "5axis-swivel-head",      axes: 5, max_rpm_band: 24000, power_kw: 35, taper: "HSK-A63", rigidity: "high" },
  { id: "bridge-mill",            axes: 3, max_rpm_band: 8000,  power_kw: 45, taper: "BT50",  rigidity: "high"   },
  { id: "gantry",                 axes: 5, max_rpm_band: 12000, power_kw: 50, taper: "HSK-A100", rigidity: "high"},
  { id: "mill-turn",              axes: 5, max_rpm_band: 12000, power_kw: 30, taper: "CAPTO",  rigidity: "high"  },
  { id: "swiss",                  axes: 5, max_rpm_band: 10000, power_kw: 12, taper: "ER",     rigidity: "high"  },
];

const RIGIDITY_LEVELS  = ["low", "medium", "high"];
const GUIDEWAY_TYPES   = ["box", "linear", "hydrostatic"];
const MACHINE_AGES     = [1, 8, 20]; // years: new, midlife, aging
const PRELOAD_LEVELS   = ["light", "medium", "heavy"];
const TORQUE_CURVES    = ["constant-torque", "constant-power", "peaked", "flat"];
const AXIS_ACCEL_BANDS = [2.0, 5.0, 10.0]; // m/s^2
const AXIS_JERK_BANDS  = [10, 50, 100];    // m/s^3

const CONTROLLERS = [
  "fanuc-30i", "fanuc-31i",
  "siemens-840d", "siemens-one",
  "heidenhain-tnc640",
  "haas-ngc",
  "okuma-osp-p300m",
  "mazak-smoothx", "mazak-smoothai",
  "mitsubishi-m800",
];

const COOLANT_TYPES         = ["flood", "mist", "MQL", "dry", "cryogenic", "through_tool"];
const COOLANT_PRESSURE_BAR  = [1, 5, 20, 70, 300];
const COOLANT_CONC_PCT      = [5, 10, 15];

// ISO 513 materials with archetype hardness states.
// Names map to canonical-material-DB keys; condition cycles annealed/hard/PH.
const MATERIALS = [
  // P — Steel
  ["1045", "P", [180, 220, 260]],
  ["4140", "P", [220, 280, 320]],
  ["4340", "P", [240, 300, 340]],
  ["1018", "P", [120, 150, 180]],
  ["1215", "P", [140, 160, 180]],
  ["D2",   "P", [200, 220, 240]],
  ["H13",  "P", [200, 220, 240]],
  ["A2",   "P", [200, 220, 240]],
  // M — Stainless
  ["304",    "M", [150, 180, 200]],
  ["316",    "M", [160, 190, 220]],
  ["430",    "M", [150, 170, 190]],
  ["17-4PH", "M", [300, 350, 400]],
  ["2205",   "M", [240, 270, 300]],
  // K — Cast iron
  ["GG25",  "K", [180, 200, 220]],
  ["GGG50", "K", [170, 190, 210]],
  ["GGG70", "K", [230, 250, 270]],
  // N — Non-ferrous
  ["6061", "N", [80,  95,  110]],
  ["7075", "N", [130, 150, 170]],
  ["2024", "N", [110, 120, 140]],
  ["C360", "N", [70,  80,  90 ]],
  ["C110", "N", [40,  50,  60 ]],
  // S — Superalloys
  ["IN718",    "S", [340, 380, 420]],
  ["IN625",    "S", [260, 290, 320]],
  ["Ti6Al4V",  "S", [320, 340, 360]],
  ["Ti-CP2",   "S", [180, 200, 220]],
  ["Waspaloy", "S", [360, 380, 400]],
  // H — Hardened steel
  ["4140HRC50", "H", [470, 500, 530]],
  ["D2HRC60",   "H", [600, 620, 650]],
  ["H13HRC48",  "H", [460, 480, 510]],
];

const OPERATIONS  = ["milling", "drilling", "tapping", "reaming", "boring", "thread_milling", "turning"];
const CUT_TYPES   = ["roughing", "semi_finishing", "finishing"];
const STRATEGIES  = ["conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot"];

// Holder types valid per spindle taper:
const HOLDER_BY_TAPER = {
  "BT30":     ["ER_collet", "shrink_fit", "milling_chuck"],
  "BT40":     ["ER_collet", "shrink_fit", "hydraulic", "milling_chuck", "Weldon"],
  "BT50":     ["ER_collet", "shrink_fit", "hydraulic", "milling_chuck", "Weldon"],
  "CAT40":    ["ER_collet", "shrink_fit", "hydraulic", "milling_chuck", "Weldon"],
  "CAT50":    ["ER_collet", "shrink_fit", "hydraulic", "milling_chuck", "Weldon"],
  "HSK-A63":  ["ER_collet", "shrink_fit", "hydraulic", "milling_chuck"],
  "HSK-A100": ["ER_collet", "shrink_fit", "hydraulic", "milling_chuck"],
  "HSK-E40":  ["ER_collet", "shrink_fit"],
  "CAPTO":    ["shrink_fit", "milling_chuck"],
  "ER":       ["ER_collet"],
};

const HOLDER_GAUGE_BANDS  = [60, 100, 160]; // mm: short, standard, extended
const HOLDER_TIR_BANDS    = [2, 5, 10];      // µm
const HOLDER_BALANCE_GRADES = [2.5, 6.3];   // G-grade

// Tool families (per the dispatcher input contract):
const TOOL_MATERIALS = ["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"];
const TOOL_COATINGS  = ["TiAlN", "AlTiN", "TiN", "AlCrN", "DLC", "Uncoated", "CVD", "PCD", "CBN"];
const TOOL_DIAM_BANDS = [3, 6, 10, 12, 16, 20, 25, 32, 50, 63]; // mm
const TOOL_FLUTE_OPTIONS = [2, 3, 4, 5, 6, 8];
const TOOL_HELIX_BANDS = [30, 38, 45]; // deg
const TOOL_CORNER_RAD  = [0, 0.4, 0.8, 1.2, 2.0]; // mm
const TOOL_STICKOUT_LD = [2, 3, 4, 5, 6, 8]; // L/D ratio

// Insert grades + nose radii (only used when geometry is indexable):
const INSERT_GRADES = ["CVD-coated", "PVD-coated", "uncoated-carbide", "cermet", "CBN", "PCD"];
const INSERT_SHAPES = ["CNMG", "WCMT", "APMT", "DCMT", "TCMT", "VBMT"];
const INSERT_NOSE   = [0.2, 0.4, 0.8, 1.2];

// Workholding:
const WORKHOLDING_TYPES = ["vise", "fixture", "vacuum", "magnetic", "collet", "chuck", "tombstone"];
const WORKHOLDING_STIFFNESS = ["low", "medium", "high"];
const CLAMP_FORCE_KN    = [1, 5, 20, 50];

// Optimize-for axes:
const OPTIMIZE_FOR = ["tool_life", "productivity", "surface_finish", "balanced", "cost"];

// ─────────────────────────────────────────────────────────────────────
// COMPATIBILITY FILTERS — cut 99.999% of raw Cartesian.
// Each returns true if the combo is physically/manufacturably valid.
// ─────────────────────────────────────────────────────────────────────

/** Coating × ISO group compatibility (ISO 513 + Sandvik CoroKey). */
function coatingFitsIsoGroup(coating, iso) {
  // Same matrix as web/src/data/tools.ts COATINGS.avoidFor, codified here.
  const avoid = {
    TiAlN:    ["N"],
    AlTiN:    ["N"],
    TiN:      ["S", "H"],
    AlCrN:    [],
    DLC:      ["P", "M", "S", "H"],
    Uncoated: ["S", "H"],
    CVD:      ["N", "S"],
    PCD:      ["P", "M", "S", "H", "K"],
    CBN:      ["N"],
  };
  return !(avoid[coating] ?? []).includes(iso);
}

/** Tool material × ISO group sanity (PCD substrate only for N, CBN for H+K, etc.). */
function toolMaterialFitsIso(toolMaterial, iso) {
  if (toolMaterial === "pcd")    return iso === "N";
  if (toolMaterial === "cbn")    return iso === "H" || iso === "K";
  if (toolMaterial === "ceramic") return iso === "S" || iso === "K";
  if (toolMaterial === "cermet")  return iso === "P" || iso === "M";
  if (toolMaterial === "hss")     return iso !== "S" && iso !== "H"; // HSS dies in hot+hard
  return true; // carbide is universal
}

/** Operation × tool-family compatibility — only milling tools do milling, etc. */
function operationFitsToolFamily(operation, toolFamily) {
  if (operation === "milling")        return toolFamily === "endmill" || toolFamily === "face_mill";
  if (operation === "drilling")       return toolFamily === "drill";
  if (operation === "tapping")        return toolFamily === "tap";
  if (operation === "reaming")        return toolFamily === "reamer";
  if (operation === "boring")         return toolFamily === "boring_bar" || toolFamily === "insert";
  if (operation === "thread_milling") return toolFamily === "thread_mill";
  if (operation === "turning")        return toolFamily === "insert" || toolFamily === "boring_bar";
  return false;
}

/** Strategy × operation gate — trochoidal doesn't apply to drilling, etc. */
function strategyFitsOperation(strategy, operation) {
  if (operation === "drilling" || operation === "tapping" || operation === "reaming") {
    return strategy === "conventional" || strategy === "plunge";
  }
  if (operation === "turning") {
    return strategy === "conventional" || strategy === "hsm" || strategy === "hpc";
  }
  return true; // milling, thread_milling, boring accept all
}

/** Stickout L/D × tool diameter sanity — extreme L/D needs special considerations. */
function stickoutFitsToolFamily(ld, toolFamily) {
  if (toolFamily === "drill") return ld <= 5;       // drills above 5×D need peck specialty
  if (toolFamily === "face_mill") return ld <= 2;   // face mills are stubby
  return ld <= 8;                                    // endmills go to 8×D
}

/** Cut type × strategy — finishing isn't done with trochoidal etc. */
function cutTypeFitsStrategy(cutType, strategy) {
  if (cutType === "finishing") return ["conventional", "hsm"].includes(strategy);
  if (cutType === "roughing")  return ["conventional", "adaptive", "trochoidal", "hpc", "plunge", "slot"].includes(strategy);
  return true;
}

/** Tap drills are 2-flute — tapping is 0/spiral-flute; reaming is 6+. */
function flutesFitToolFamily(flutes, toolFamily) {
  if (toolFamily === "drill")       return flutes === 2;
  if (toolFamily === "reamer")      return flutes >= 4;
  if (toolFamily === "face_mill")   return flutes >= 4;
  if (toolFamily === "thread_mill") return flutes >= 3;
  return true;
}

/** Spindle taper ↔ tool diameter sanity (BT30 won't hold 63 mm face mills). */
function taperFitsToolDiameter(taper, diam) {
  if (taper === "ER" || taper === "HSK-E40" || taper === "BT30") return diam <= 12;
  if (taper === "BT40" || taper === "CAT40" || taper === "HSK-A63" || taper === "CAPTO") return diam <= 32;
  return true; // BT50/CAT50/HSK-A100 carry anything
}

/** Workholding × workpiece compatibility — magnetic only for ferrous, vacuum for flat, etc. */
function workholdingFitsIso(workholding, iso) {
  if (workholding === "magnetic") return ["P", "M", "K", "H"].includes(iso);
  return true;
}

/** Coolant × ISO group — dry impractical on M/S/H typically. */
function coolantFitsIso(coolant, iso) {
  if (coolant === "dry" && (iso === "M" || iso === "S")) return false;
  if (coolant === "cryogenic" && (iso === "N" || iso === "K")) return false; // cryo wasted on cast iron / aluminum
  return true;
}

/** Tool family resolution — derive from operation + diameter band heuristics. */
function toolFamiliesForOp(operation) {
  if (operation === "milling")         return ["endmill", "face_mill"];
  if (operation === "drilling")        return ["drill"];
  if (operation === "tapping")         return ["tap"];
  if (operation === "reaming")         return ["reamer"];
  if (operation === "boring")          return ["boring_bar", "insert"];
  if (operation === "thread_milling")  return ["thread_mill"];
  if (operation === "turning")         return ["insert", "boring_bar"];
  return [];
}

// ─────────────────────────────────────────────────────────────────────
// COMBO BUILDER
// ─────────────────────────────────────────────────────────────────────

/**
 * Build a single OrchestratorInput from selected dimension values.
 * Lazy — only emits fields with non-default values.
 */
function makeInput({ machine, rigidity, guideway, age, preload, torqueCurve, accel, jerk,
                     controller, coolantType, pressure, conc,
                     materialName, iso, hardness,
                     operation, cutType, strategy,
                     holderType, holderGauge, holderTir, holderBalance,
                     toolFamily, toolMaterial, coating, diameter, flutes, helix, corner, stickoutLd,
                     insertGrade, insertShape, insertNose,
                     workholding, whStiffness, clampForce,
                     optimizeFor }) {
  const stickoutMm = +(diameter * stickoutLd).toFixed(2);
  return {
    machine_name: machine.id,
    machine_type: machine.id.startsWith("5axis") ? "5axis"
                : machine.id.startsWith("vmc") ? "vertical_mill"
                : machine.id.startsWith("hmc") ? "horizontal_mill"
                : machine.id === "mill-turn" ? "lathe"
                : machine.id === "swiss" ? "swiss"
                : "vertical_mill",
    machine_power_kw: machine.power_kw,
    machine_max_rpm:  machine.max_rpm_band,
    machine_rigidity: rigidity,
    machine_guideway: guideway,
    machine_age_years: age,
    machine_axis_accel_m_s2: accel,
    machine_axis_jerk_m_s3:  jerk,
    spindle_taper:           machine.taper,
    spindle_bearing_preload: preload,
    controller,
    coolant_type:           coolantType,
    coolant_pressure_bar:   pressure,
    coolant_concentration_pct: conc,
    material:    materialName,
    iso_group:   iso,
    hardness_hb: hardness,
    operation,
    cut_type:    cutType,
    strategy,
    holder_type:           holderType,
    holder_gauge_length_mm: holderGauge,
    holder_tir_mm:          holderTir,
    holder_balanced_g:      holderBalance,
    tool_diameter_mm: diameter,
    flutes,
    tool_material:    toolMaterial,
    tool_coating:     coating,
    helix_angle_deg:  helix,
    corner_radius_mm: corner,
    tool_stickout_mm: stickoutMm,
    insert_grade: insertGrade ?? undefined,
    insert_shape: insertShape ?? undefined,
    nose_radius_mm: insertNose ?? undefined,
    workholding_type:      workholding,
    workholding_stiffness: whStiffness,
    clamping_force_kN:     clampForce,
    spindle_torque_curve_archetype: torqueCurve,
    optimize_for: optimizeFor,
  };
}

function fingerprint(obj) {
  // Sort keys for deterministic SHA-256.
  const ordered = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash("sha256").update(ordered).digest("hex").slice(0, 16);
}

// ─────────────────────────────────────────────────────────────────────
// ENUMERATOR (generator — never holds full result in memory)
// ─────────────────────────────────────────────────────────────────────

function* enumerate() {
  for (const machine of MACHINE_ARCHETYPES) {
    for (const rigidity of RIGIDITY_LEVELS) {
      for (const guideway of GUIDEWAY_TYPES) {
        for (const age of MACHINE_AGES) {
          for (const preload of PRELOAD_LEVELS) {
            for (const torqueCurve of TORQUE_CURVES) {
              for (const accel of AXIS_ACCEL_BANDS) {
                for (const jerk of AXIS_JERK_BANDS) {
                  for (const controller of CONTROLLERS) {
                    for (const coolantType of COOLANT_TYPES) {
                      const pressures = coolantType === "dry" ? [0] : COOLANT_PRESSURE_BAR;
                      const concs     = (coolantType === "dry" || coolantType === "MQL") ? [0] : COOLANT_CONC_PCT;
                      for (const pressure of pressures) {
                        for (const conc of concs) {
                          for (const [materialName, iso, hardnessBands] of MATERIALS) {
                            if (!coolantFitsIso(coolantType, iso)) continue;
                            for (const hardness of hardnessBands) {
                              for (const operation of OPERATIONS) {
                                for (const cutType of CUT_TYPES) {
                                  for (const strategy of STRATEGIES) {
                                    if (!strategyFitsOperation(strategy, operation)) continue;
                                    if (!cutTypeFitsStrategy(cutType, strategy)) continue;
                                    const holderCandidates = HOLDER_BY_TAPER[machine.taper] ?? [];
                                    for (const holderType of holderCandidates) {
                                      for (const holderGauge of HOLDER_GAUGE_BANDS) {
                                        for (const holderTir of HOLDER_TIR_BANDS) {
                                          for (const holderBalance of HOLDER_BALANCE_GRADES) {
                                            const toolFamilies = toolFamiliesForOp(operation);
                                            for (const toolFamily of toolFamilies) {
                                              for (const toolMaterial of TOOL_MATERIALS) {
                                                if (!toolMaterialFitsIso(toolMaterial, iso)) continue;
                                                for (const coating of TOOL_COATINGS) {
                                                  if (!coatingFitsIsoGroup(coating, iso)) continue;
                                                  for (const diameter of TOOL_DIAM_BANDS) {
                                                    if (!taperFitsToolDiameter(machine.taper, diameter)) continue;
                                                    for (const flutes of TOOL_FLUTE_OPTIONS) {
                                                      if (!flutesFitToolFamily(flutes, toolFamily)) continue;
                                                      for (const helix of TOOL_HELIX_BANDS) {
                                                        for (const corner of TOOL_CORNER_RAD) {
                                                          for (const stickoutLd of TOOL_STICKOUT_LD) {
                                                            if (!stickoutFitsToolFamily(stickoutLd, toolFamily)) continue;
                                                            const insertSets = (toolFamily === "insert" || toolFamily === "boring_bar")
                                                              ? cartesian(INSERT_GRADES, INSERT_SHAPES, INSERT_NOSE)
                                                              : [[null, null, null]];
                                                            for (const [insertGrade, insertShape, insertNose] of insertSets) {
                                                              for (const workholding of WORKHOLDING_TYPES) {
                                                                if (!workholdingFitsIso(workholding, iso)) continue;
                                                                for (const whStiffness of WORKHOLDING_STIFFNESS) {
                                                                  for (const clampForce of CLAMP_FORCE_KN) {
                                                                    for (const optimizeFor of OPTIMIZE_FOR) {
                                                                      yield makeInput({
                                                                        machine, rigidity, guideway, age, preload, torqueCurve, accel, jerk,
                                                                        controller, coolantType, pressure, conc,
                                                                        materialName, iso, hardness,
                                                                        operation, cutType, strategy,
                                                                        holderType, holderGauge, holderTir, holderBalance,
                                                                        toolFamily, toolMaterial, coating, diameter, flutes, helix, corner, stickoutLd,
                                                                        insertGrade, insertShape, insertNose,
                                                                        workholding, whStiffness, clampForce,
                                                                        optimizeFor,
                                                                      });
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

function* cartesian(...arrays) {
  if (arrays.length === 0) { yield []; return; }
  const [head, ...rest] = arrays;
  for (const value of head) {
    for (const tail of cartesian(...rest)) {
      yield [value, ...tail];
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// MODES
// ─────────────────────────────────────────────────────────────────────

function modeEstimate({ maxCount = Infinity, every = 1_000_000 } = {}) {
  let count = 0;
  const start = Date.now();
  for (const _ of enumerate()) {
    count++;
    if (count % every === 0) {
      const elapsedSec = (Date.now() - start) / 1000;
      const rate = Math.round(count / elapsedSec);
      process.stderr.write(`[enumerate] ${count.toLocaleString()} valid combos · ${rate.toLocaleString()}/s · ${elapsedSec.toFixed(1)}s\n`);
    }
    if (count >= maxCount) break;
  }
  const total = Date.now() - start;
  return { count, elapsed_ms: total, rate_per_sec: Math.round(count / (total / 1000)) };
}

function modeSample({ n, outFile }) {
  const reservoir = [];
  let seen = 0;
  for (const combo of enumerate()) {
    seen++;
    if (reservoir.length < n) {
      reservoir.push(combo);
    } else {
      const j = Math.floor(Math.random() * seen);
      if (j < n) reservoir[j] = combo;
    }
    if (seen > 50_000_000) break; // cap reservoir scan to keep sample mode quick
  }
  const lines = reservoir.map((c) => JSON.stringify({ fingerprint: fingerprint(c), input: c }));
  writeFileSync(outFile, lines.join("\n") + "\n", "utf8");
  return { sampled: reservoir.length, seen };
}

function modeEnumerate({ outDir, chunkSize = 50_000, resume = false }) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  let chunkIdx = 0;
  let inChunk = 0;
  let totalEmitted = 0;
  let chunkFile = resolve(outDir, `chunk-${String(chunkIdx).padStart(6, "0")}.jsonl`);
  if (resume) {
    // Skip already-written chunks.
    while (existsSync(chunkFile)) {
      chunkIdx++;
      chunkFile = resolve(outDir, `chunk-${String(chunkIdx).padStart(6, "0")}.jsonl`);
    }
  }
  let chunkLines = [];
  const start = Date.now();
  for (const combo of enumerate()) {
    chunkLines.push(JSON.stringify({ fingerprint: fingerprint(combo), input: combo }));
    inChunk++;
    if (inChunk >= chunkSize) {
      writeFileSync(chunkFile, chunkLines.join("\n") + "\n", "utf8");
      totalEmitted += inChunk;
      chunkIdx++;
      chunkFile = resolve(outDir, `chunk-${String(chunkIdx).padStart(6, "0")}.jsonl`);
      chunkLines = [];
      inChunk = 0;
      if (chunkIdx % 20 === 0) {
        const elapsedSec = (Date.now() - start) / 1000;
        process.stderr.write(`[enumerate] emitted ${totalEmitted.toLocaleString()} (chunk ${chunkIdx}) · ${Math.round(totalEmitted / elapsedSec).toLocaleString()}/s\n`);
      }
    }
  }
  if (chunkLines.length > 0) {
    writeFileSync(chunkFile, chunkLines.join("\n") + "\n", "utf8");
    totalEmitted += chunkLines.length;
  }
  return { chunks: chunkIdx + 1, totalEmitted, elapsed_ms: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { mode: "estimate" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--estimate") args.mode = "estimate";
    else if (a === "--enumerate") args.mode = "enumerate";
    else if (a === "--sample") { args.mode = "sample"; args.n = Number(argv[++i]); }
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--chunk") args.chunkSize = Number(argv[++i]);
    else if (a === "--resume") args.resume = true;
    else if (a === "--max") args.maxCount = Number(argv[++i]);
    else if (a === "--every") args.every = Number(argv[++i]);
  }
  return args;
}

const _entryPath = process.argv[1] ? `file://${process.argv[1].replace(/\\/g, "/")}` : null;
if (_entryPath && import.meta.url === _entryPath) {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "estimate") {
    const result = modeEstimate({ maxCount: args.maxCount ?? Infinity, every: args.every ?? 1_000_000 });
    console.log(JSON.stringify({ mode: "estimate", ...result }, null, 2));
  } else if (args.mode === "sample") {
    if (!args.out) { console.error("--sample requires --out <file>"); process.exit(1); }
    const result = modeSample({ n: args.n, outFile: args.out });
    console.log(JSON.stringify({ mode: "sample", ...result }, null, 2));
  } else if (args.mode === "enumerate") {
    if (!args.out) { console.error("--enumerate requires --out <dir>"); process.exit(1); }
    const result = modeEnumerate({ outDir: args.out, chunkSize: args.chunkSize ?? 50_000, resume: args.resume });
    console.log(JSON.stringify({ mode: "enumerate", ...result }, null, 2));
  }
}

export { enumerate, fingerprint, makeInput, modeEstimate, modeSample, modeEnumerate,
         MACHINE_ARCHETYPES, MATERIALS, OPERATIONS, CONTROLLERS, COOLANT_TYPES,
         coatingFitsIsoGroup, toolMaterialFitsIso, operationFitsToolFamily,
         strategyFitsOperation, stickoutFitsToolFamily, cutTypeFitsStrategy,
         flutesFitToolFamily, taperFitsToolDiameter, workholdingFitsIso, coolantFitsIso };
