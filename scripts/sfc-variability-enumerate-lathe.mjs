#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 Stage 1B — Lathe variability enumerator.
 *
 * Mirrors scripts/sfc-variability-enumerate.mjs (mill) with lathe-specific
 * dimension tables:
 *   - Machine archetypes: 2-axis, slant-bed, sub-spindle, multi-tasking,
 *     Swiss, vertical lathe (VTL), live-tooling lathe
 *   - Operations: turning_rough, turning_finish, boring, parting, grooving,
 *     threading_single_point, drilling_on_lathe
 *   - Strategies: conventional, hsm, hpc, plunge (no trochoidal/adaptive on
 *     a lathe — those are mill-specific engagement modes)
 *   - Tools: turning inserts (CNMG/WNMG/DCMT/TNMG/VNMG/CCMT family),
 *     parting blades, threading inserts (60° ISO + UN), drills (HSS +
 *     carbide), boring bars (steel + carbide-shank + tuned-mass)
 *   - Workholding: 3-jaw, 4-jaw, collet chuck, magnetic, between-centers,
 *     soft jaws, faceplate, expanding mandrel
 *
 * Same compatibility-filter approach: 10+ filters cut raw Cartesian to a
 * tractable enumeration on the order of hundreds of millions.
 *
 * Exports: enumerate() generator + modeEstimate/modeSample/modeEnumerate.
 * The Stage 2 worker (sfc-variability-batch-run.mjs --domain lathe) consumes
 * this directly.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ─── PROGRESS-REPORTING CONSTANTS ─────────────────────────────────────
const ESTIMATE_REPORT_EVERY = 1_000_000;
const FINGERPRINT_HEX_LEN = 16;
const DEFAULT_CHUNK_SIZE = 50_000;
const DEFAULT_SAMPLE_SCAN_CAP = 50_000_000;
const CHUNK_IDX_PAD_WIDTH = 6;
const HEARTBEAT_CHUNK_INTERVAL = 20;

// ─── LATHE ARCHETYPES ─────────────────────────────────────────────────
const LATHE_ARCHETYPES = [
  { id: "lathe-2axis-economy",        axes: 2, max_rpm_band: 3000,  power_kw: 15,  chuck_id: 6,  bed: "flat",      hasSubSpindle: false, liveTooling: false },
  { id: "lathe-2axis-std",            axes: 2, max_rpm_band: 4500,  power_kw: 22,  chuck_id: 8,  bed: "slant",     hasSubSpindle: false, liveTooling: false },
  { id: "lathe-slant-bed-precision",  axes: 2, max_rpm_band: 6000,  power_kw: 30,  chuck_id: 10, bed: "slant",     hasSubSpindle: false, liveTooling: false },
  { id: "lathe-sub-spindle",          axes: 4, max_rpm_band: 5000,  power_kw: 26,  chuck_id: 8,  bed: "slant",     hasSubSpindle: true,  liveTooling: true  },
  { id: "lathe-multitask",            axes: 5, max_rpm_band: 5000,  power_kw: 40,  chuck_id: 10, bed: "slant",     hasSubSpindle: true,  liveTooling: true  },
  { id: "lathe-swiss",                axes: 5, max_rpm_band: 10000, power_kw: 12,  chuck_id: 1.25, bed: "swiss",   hasSubSpindle: true,  liveTooling: true  },
  { id: "lathe-vtl",                  axes: 2, max_rpm_band: 1500,  power_kw: 75,  chuck_id: 40, bed: "vertical",  hasSubSpindle: false, liveTooling: false },
  { id: "lathe-livetool-c-axis",      axes: 3, max_rpm_band: 5000,  power_kw: 30,  chuck_id: 10, bed: "slant",     hasSubSpindle: false, liveTooling: true  },
];

const RIGIDITY_LEVELS = ["medium", "high"]; // lathes don't ship "low" rigidity production-grade
const BED_TYPES_OBSERVED = ["flat", "slant", "swiss", "vertical"];
const MACHINE_AGES = [1, 8, 20];
const TURRET_STATIONS = [8, 12, 16];

const CHUCK_OPTIONS = ["3-jaw", "4-jaw", "collet", "magnetic", "between-centers", "soft-jaws", "faceplate", "expanding-mandrel"];
const CHUCK_STIFFNESS_LEVELS = ["medium", "high"];
const CLAMP_FORCE_KN = [2, 8, 25, 60];

const LATHE_CONTROLLERS = [
  "fanuc-30i-lathe",
  "fanuc-0i-lathe",
  "siemens-840d-lathe",
  "okuma-osp-p300l",
  "mazak-smoothx-lathe",
  "mitsubishi-m700-lathe",
  "haas-ngc-lathe",
];

const COOLANT_TYPES = ["flood", "MQL", "dry", "through_tool", "cryogenic"];
const COOLANT_PRESSURE_BAR = [1, 5, 20, 70];
const COOLANT_CONC_PCT = [5, 10, 15];

// Lathe materials — same ISO 513 spectrum as mill, but each gets a
// roughness-state band (annealed → cold-drawn → quench-tempered).
const MATERIALS = [
  // P — Steel
  ["1045", "P", [180, 220, 260]],
  ["4140", "P", [220, 280, 320]],
  ["4340", "P", [240, 300, 340]],
  ["1018", "P", [120, 150, 180]],
  ["1215", "P", [140, 160, 180]],
  ["12L14", "P", [140, 160, 180]],
  ["8620", "P", [180, 220, 260]],
  // M — Stainless
  ["304",    "M", [150, 180, 200]],
  ["316",    "M", [160, 190, 220]],
  ["303",    "M", [140, 170, 190]],
  ["17-4PH", "M", [300, 350, 400]],
  ["2205",   "M", [240, 270, 300]],
  // K — Cast iron
  ["GG25",  "K", [180, 200, 220]],
  ["GGG50", "K", [170, 190, 210]],
  // N — Non-ferrous (heavy lathe usage)
  ["6061",  "N", [80,  95,  110]],
  ["7075",  "N", [130, 150, 170]],
  ["2024",  "N", [110, 120, 140]],
  ["C360",  "N", [70,  80,  90 ]],
  ["C110",  "N", [40,  50,  60 ]],
  // S — Superalloys (less common but critical for aerospace)
  ["IN718",    "S", [340, 380, 420]],
  ["Ti6Al4V",  "S", [320, 340, 360]],
  ["Ti-CP2",   "S", [180, 200, 220]],
  // H — Hard turning
  ["4140HRC50", "H", [470, 500, 530]],
  ["52100HRC60","H", [580, 620, 660]],
  ["D2HRC60",   "H", [600, 620, 650]],
];

const LATHE_OPERATIONS = [
  "turning_rough",
  "turning_finish",
  "boring",
  "parting",
  "grooving",
  "threading_single_point",
  "drilling_on_lathe",
  "facing",
  "chamfering",
];

const CUT_TYPES = ["roughing", "semi_finishing", "finishing"];
const LATHE_STRATEGIES = ["conventional", "hsm", "hpc", "plunge"];

// Insert geometries (ISO 1832 + Sandvik catalog):
const INSERT_SHAPES = [
  "CNMG",  // 80° rhomboid — general purpose
  "WNMG",  // 80° trigon — heavy roughing
  "DCMT",  // 55° rhomboid — finishing
  "TNMG",  // 60° triangle — medium duty
  "VBMT",  // 35° rhomboid — finish profiling
  "VNMG",  // 35° rhomboid — profile rough
  "CCMT",  // 80° rhomboid — light cuts
  "RCMT",  // round — copy/finish
];
const INSERT_GRADES = ["CVD-coated", "PVD-coated", "uncoated-carbide", "cermet", "CBN", "PCD"];
const NOSE_RADII_MM = [0.2, 0.4, 0.8, 1.2, 1.6, 2.4];
const INSERT_SIZES = [9, 12, 16, 19]; // IC diameter mm

// Boring bar configurations:
const BORING_BAR_LD = [3, 4, 6, 8, 10]; // L/D ratio
const BORING_BAR_SHANKS = ["steel", "carbide", "tuned-mass-damped"];

// Drills on lathe:
const DRILL_DIAMS = [3, 6, 10, 12, 16, 20, 25, 32];

// Threading insert profiles:
const THREAD_FORMS = ["60-ISO", "60-UN", "55-Whitworth", "ACME", "trapezoidal"];

// Optimize-for:
const OPTIMIZE_FOR = ["tool_life", "productivity", "surface_finish", "balanced", "cost"];

// ─── COMPATIBILITY FILTERS ────────────────────────────────────────────

/** Operation × tool-family. */
function operationFitsToolFamily(op, family) {
  if (op === "turning_rough" || op === "turning_finish" || op === "facing" || op === "chamfering") {
    return family === "insert";
  }
  if (op === "boring") return family === "boring_bar";
  if (op === "parting" || op === "grooving") return family === "parting_blade";
  if (op === "threading_single_point") return family === "threading_insert";
  if (op === "drilling_on_lathe") return family === "drill";
  return false;
}

/** Strategy × operation. */
function strategyFitsOperation(strategy, op) {
  if (op === "drilling_on_lathe") return strategy === "conventional" || strategy === "plunge";
  if (op === "threading_single_point") return strategy === "conventional";
  if (op === "parting" || op === "grooving") return strategy === "plunge" || strategy === "conventional";
  return true; // turning ops accept hsm/hpc/conventional
}

/** Cut type × strategy. */
function cutTypeFitsStrategy(cut, strategy) {
  if (cut === "finishing") return strategy === "conventional" || strategy === "hsm";
  return true;
}

/** Insert shape × operation — round inserts don't thread, narrow inserts don't rough. */
function shapeFitsOperation(shape, op) {
  if (op === "threading_single_point") return false; // threading inserts are separate family
  if (op === "parting" || op === "grooving") return false; // separate family
  if (op === "boring") return ["CCMT", "DCMT", "VBMT", "TNMG"].includes(shape);
  if (op === "turning_rough") return ["CNMG", "WNMG", "TNMG", "VNMG", "RCMT"].includes(shape);
  if (op === "turning_finish") return ["DCMT", "VBMT", "CCMT", "RCMT"].includes(shape);
  return true;
}

/** Tool-material × ISO group. */
function gradeFitsIso(grade, iso) {
  if (grade === "PCD") return iso === "N";
  if (grade === "CBN") return iso === "H" || iso === "K";
  if (grade === "cermet") return iso === "P" || iso === "M";
  return true;
}

/** Bed type × machine archetype consistency. */
function bedFitsArchetype(bed, archId) {
  if (archId === "lathe-swiss") return bed === "swiss";
  if (archId === "lathe-vtl") return bed === "vertical";
  if (archId === "lathe-2axis-economy") return bed === "flat" || bed === "slant";
  return bed === "slant" || bed === "flat";
}

/** Workholding × archetype. */
function chuckFitsArchetype(chuck, archId) {
  if (archId === "lathe-swiss") return chuck === "collet";
  if (archId === "lathe-vtl") return chuck === "4-jaw" || chuck === "faceplate" || chuck === "magnetic" || chuck === "soft-jaws";
  if (chuck === "between-centers") return archId !== "lathe-vtl";
  return true;
}

/** Coolant × ISO. */
function coolantFitsIso(coolant, iso) {
  if (coolant === "dry" && (iso === "M" || iso === "S")) return false;
  if (coolant === "cryogenic" && (iso === "N" || iso === "K")) return false;
  return true;
}

/** L/D × boring bar shank — long L/D needs damped or carbide shank. */
function boringBarShankFitsLD(shank, ld) {
  if (ld >= 8) return shank === "carbide" || shank === "tuned-mass-damped";
  if (ld >= 6) return shank !== "steel" || ld === 6;
  return true;
}

/** Drill diameter × spindle chuck capacity (chuck_id is chuck/jaw size, drill must be smaller). */
function drillFitsChuck(drillDiam, chuckId) {
  return drillDiam < chuckId * 25.4; // chuck_id in inches → mm
}

// ─── COMBO BUILDER ────────────────────────────────────────────────────
function makeInput({ arch, rigidity, bed, age, turret, chuck, chuckStiff, clampForce,
                     controller, coolant, pressure, conc,
                     materialName, iso, hardness,
                     operation, cutType, strategy,
                     toolFamily, shape, grade, nose, size,
                     boringLd, boringShank, drillDiam, threadForm,
                     optimizeFor }) {
  // Map archetype + tool family + size into orchestrator's flat input shape.
  const input = {
    machine_name: arch.id,
    machine_type: "lathe",
    machine_power_kw: arch.power_kw,
    machine_max_rpm: arch.max_rpm_band,
    machine_rigidity: rigidity,
    machine_age_years: age,
    spindle_taper: bed === "swiss" ? "ER" : "lathe_turret",
    controller,
    coolant_type: coolant,
    coolant_pressure_bar: pressure,
    coolant_concentration_pct: conc,
    material: materialName,
    iso_group: iso,
    hardness_hb: hardness,
    operation,
    cut_type: cutType,
    strategy,
    workholding_type: chuck === "3-jaw" || chuck === "4-jaw" ? "chuck" : (chuck === "collet" ? "collet" : "fixture"),
    workholding_stiffness: chuckStiff,
    clamping_force_kN: clampForce,
    optimize_for: optimizeFor,
    spindle_bed_type: bed,
    turret_stations: turret,
  };
  if (toolFamily === "insert") {
    input.insert_shape = shape;
    input.insert_grade = grade;
    input.nose_radius_mm = nose;
    input.tool_diameter_mm = size;
    input.flutes = 1; // single-edge insert
    input.tool_material = grade === "PCD" ? "pcd" : grade === "CBN" ? "cbn" : grade === "cermet" ? "cermet" : "carbide";
  } else if (toolFamily === "boring_bar") {
    input.boring_bar_ld = boringLd;
    input.boring_bar_shank = boringShank;
    input.tool_diameter_mm = Math.max(6, Math.round(size * 0.8));
    input.tool_stickout_mm = (boringLd ?? 4) * input.tool_diameter_mm;
    input.flutes = 1;
    input.tool_material = "carbide";
  } else if (toolFamily === "drill") {
    input.tool_diameter_mm = drillDiam;
    input.flutes = 2;
    input.tool_material = "carbide";
  } else if (toolFamily === "threading_insert") {
    input.thread_form = threadForm;
    input.tool_diameter_mm = size;
    input.flutes = 1;
    input.tool_material = "carbide";
  } else if (toolFamily === "parting_blade") {
    input.tool_diameter_mm = 3; // typical 3mm parting width
    input.parting_blade_width_mm = 3;
    input.flutes = 1;
    input.tool_material = "carbide";
  }
  return input;
}

function fingerprint(obj) {
  const ordered = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash("sha256").update(ordered).digest("hex").slice(0, FINGERPRINT_HEX_LEN);
}

// ─── ENUMERATOR ───────────────────────────────────────────────────────
function* enumerate() {
  for (const arch of LATHE_ARCHETYPES) {
    for (const rigidity of RIGIDITY_LEVELS) {
      for (const bed of BED_TYPES_OBSERVED) {
        if (!bedFitsArchetype(bed, arch.id)) continue;
        for (const age of MACHINE_AGES) {
          for (const turret of TURRET_STATIONS) {
            for (const chuck of CHUCK_OPTIONS) {
              if (!chuckFitsArchetype(chuck, arch.id)) continue;
              for (const chuckStiff of CHUCK_STIFFNESS_LEVELS) {
                for (const clampForce of CLAMP_FORCE_KN) {
                  for (const controller of LATHE_CONTROLLERS) {
                    for (const coolant of COOLANT_TYPES) {
                      const pressures = coolant === "dry" ? [0] : COOLANT_PRESSURE_BAR;
                      const concs = (coolant === "dry" || coolant === "MQL") ? [0] : COOLANT_CONC_PCT;
                      for (const pressure of pressures) {
                        for (const conc of concs) {
                          for (const [materialName, iso, hardnessBands] of MATERIALS) {
                            if (!coolantFitsIso(coolant, iso)) continue;
                            for (const hardness of hardnessBands) {
                              for (const operation of LATHE_OPERATIONS) {
                                for (const cutType of CUT_TYPES) {
                                  for (const strategy of LATHE_STRATEGIES) {
                                    if (!strategyFitsOperation(strategy, operation)) continue;
                                    if (!cutTypeFitsStrategy(cutType, strategy)) continue;
                                    // Tool family selection per operation:
                                    const family =
                                      (operation === "turning_rough" || operation === "turning_finish" || operation === "facing" || operation === "chamfering") ? "insert" :
                                      operation === "boring" ? "boring_bar" :
                                      (operation === "parting" || operation === "grooving") ? "parting_blade" :
                                      operation === "threading_single_point" ? "threading_insert" :
                                      operation === "drilling_on_lathe" ? "drill" : null;
                                    if (!family) continue;
                                    if (!operationFitsToolFamily(operation, family)) continue;

                                    if (family === "insert") {
                                      for (const shape of INSERT_SHAPES) {
                                        if (!shapeFitsOperation(shape, operation)) continue;
                                        for (const grade of INSERT_GRADES) {
                                          if (!gradeFitsIso(grade, iso)) continue;
                                          for (const nose of NOSE_RADII_MM) {
                                            for (const size of INSERT_SIZES) {
                                              for (const optimizeFor of OPTIMIZE_FOR) {
                                                yield makeInput({
                                                  arch, rigidity, bed, age, turret, chuck, chuckStiff, clampForce,
                                                  controller, coolant, pressure, conc,
                                                  materialName, iso, hardness,
                                                  operation, cutType, strategy,
                                                  toolFamily: family, shape, grade, nose, size,
                                                  optimizeFor,
                                                });
                                              }
                                            }
                                          }
                                        }
                                      }
                                    } else if (family === "boring_bar") {
                                      for (const grade of INSERT_GRADES) {
                                        if (!gradeFitsIso(grade, iso)) continue;
                                        for (const nose of NOSE_RADII_MM) {
                                          for (const size of INSERT_SIZES) {
                                            for (const boringLd of BORING_BAR_LD) {
                                              for (const boringShank of BORING_BAR_SHANKS) {
                                                if (!boringBarShankFitsLD(boringShank, boringLd)) continue;
                                                for (const optimizeFor of OPTIMIZE_FOR) {
                                                  yield makeInput({
                                                    arch, rigidity, bed, age, turret, chuck, chuckStiff, clampForce,
                                                    controller, coolant, pressure, conc,
                                                    materialName, iso, hardness,
                                                    operation, cutType, strategy,
                                                    toolFamily: family, shape: null, grade, nose, size,
                                                    boringLd, boringShank,
                                                    optimizeFor,
                                                  });
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    } else if (family === "drill") {
                                      for (const drillDiam of DRILL_DIAMS) {
                                        if (!drillFitsChuck(drillDiam, arch.chuck_id)) continue;
                                        for (const optimizeFor of OPTIMIZE_FOR) {
                                          yield makeInput({
                                            arch, rigidity, bed, age, turret, chuck, chuckStiff, clampForce,
                                            controller, coolant, pressure, conc,
                                            materialName, iso, hardness,
                                            operation, cutType, strategy,
                                            toolFamily: family,
                                            drillDiam,
                                            optimizeFor,
                                          });
                                        }
                                      }
                                    } else if (family === "threading_insert") {
                                      for (const threadForm of THREAD_FORMS) {
                                        for (const grade of INSERT_GRADES) {
                                          if (!gradeFitsIso(grade, iso)) continue;
                                          for (const size of INSERT_SIZES) {
                                            for (const optimizeFor of OPTIMIZE_FOR) {
                                              yield makeInput({
                                                arch, rigidity, bed, age, turret, chuck, chuckStiff, clampForce,
                                                controller, coolant, pressure, conc,
                                                materialName, iso, hardness,
                                                operation, cutType, strategy,
                                                toolFamily: family, grade, size, threadForm,
                                                optimizeFor,
                                              });
                                            }
                                          }
                                        }
                                      }
                                    } else if (family === "parting_blade") {
                                      for (const grade of INSERT_GRADES) {
                                        if (!gradeFitsIso(grade, iso)) continue;
                                        for (const optimizeFor of OPTIMIZE_FOR) {
                                          yield makeInput({
                                            arch, rigidity, bed, age, turret, chuck, chuckStiff, clampForce,
                                            controller, coolant, pressure, conc,
                                            materialName, iso, hardness,
                                            operation, cutType, strategy,
                                            toolFamily: family, grade,
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

// ─── MODES ────────────────────────────────────────────────────────────
function modeEstimate({ maxCount = Infinity, every = ESTIMATE_REPORT_EVERY } = {}) {
  let count = 0;
  const start = Date.now();
  for (const _ of enumerate()) {
    count++;
    if (count % every === 0) {
      const elapsedSec = (Date.now() - start) / 1000;
      const rate = Math.round(count / elapsedSec);
      process.stderr.write(`[enum-lathe] ${count.toLocaleString()} valid combos · ${rate.toLocaleString()}/s · ${elapsedSec.toFixed(1)}s\n`);
    }
    if (count >= maxCount) break;
  }
  const total = Date.now() - start;
  return { count, elapsed_ms: total, rate_per_sec: Math.round(count / (total / 1000)) };
}

async function modeSample({ n, outFile }) {
  const reservoir = [];
  let seen = 0;
  for (const combo of enumerate()) {
    seen++;
    if (reservoir.length < n) reservoir.push(combo);
    else {
      const j = Math.floor(Math.random() * seen);
      if (j < n) reservoir[j] = combo;
    }
    if (seen > DEFAULT_SAMPLE_SCAN_CAP) break;
  }
  const lines = reservoir.map((c) => JSON.stringify({ fingerprint: fingerprint(c), input: c }));
  await writeFile(outFile, lines.join("\n") + "\n", "utf8");
  return { sampled: reservoir.length, seen };
}

async function pathExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function modeEnumerate({ outDir, chunkSize = DEFAULT_CHUNK_SIZE, resume = false }) {
  if (!(await pathExists(outDir))) await mkdir(outDir, { recursive: true });
  let chunkIdx = 0;
  let inChunk = 0;
  let totalEmitted = 0;
  let chunkFile = resolve(outDir, `chunk-${String(chunkIdx).padStart(CHUNK_IDX_PAD_WIDTH, "0")}.jsonl`);
  if (resume) {
    while (await pathExists(chunkFile)) {
      chunkIdx++;
      chunkFile = resolve(outDir, `chunk-${String(chunkIdx).padStart(CHUNK_IDX_PAD_WIDTH, "0")}.jsonl`);
    }
  }
  let chunkLines = [];
  const start = Date.now();
  for (const combo of enumerate()) {
    chunkLines.push(JSON.stringify({ fingerprint: fingerprint(combo), input: combo }));
    inChunk++;
    if (inChunk >= chunkSize) {
      await writeFile(chunkFile, chunkLines.join("\n") + "\n", "utf8");
      totalEmitted += inChunk;
      chunkIdx++;
      chunkFile = resolve(outDir, `chunk-${String(chunkIdx).padStart(CHUNK_IDX_PAD_WIDTH, "0")}.jsonl`);
      chunkLines = [];
      inChunk = 0;
      if (chunkIdx % HEARTBEAT_CHUNK_INTERVAL === 0) {
        const elapsedSec = (Date.now() - start) / 1000;
        process.stderr.write(`[enum-lathe] emitted ${totalEmitted.toLocaleString()} (chunk ${chunkIdx}) · ${Math.round(totalEmitted / elapsedSec).toLocaleString()}/s\n`);
      }
    }
  }
  if (chunkLines.length > 0) {
    await writeFile(chunkFile, chunkLines.join("\n") + "\n", "utf8");
    totalEmitted += chunkLines.length;
  }
  return { chunks: chunkIdx + 1, totalEmitted, elapsed_ms: Date.now() - start };
}

// ─── CLI ──────────────────────────────────────────────────────────────
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

const _modulePath = fileURLToPath(import.meta.url);
const _isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(_modulePath);
if (_isEntry) {
  const args = parseArgs(process.argv.slice(2));
  const runMode = async () => {
    if (args.mode === "estimate") {
      const r = modeEstimate({ maxCount: args.maxCount ?? Infinity, every: args.every ?? ESTIMATE_REPORT_EVERY });
      return { mode: "estimate", ...r };
    }
    if (args.mode === "sample") {
      if (!args.out) throw new Error("--sample requires --out <file>");
      const r = await modeSample({ n: args.n, outFile: args.out });
      return { mode: "sample", ...r };
    }
    if (args.mode === "enumerate") {
      if (!args.out) throw new Error("--enumerate requires --out <dir>");
      const r = await modeEnumerate({ outDir: args.out, chunkSize: args.chunkSize ?? DEFAULT_CHUNK_SIZE, resume: args.resume });
      return { mode: "enumerate", ...r };
    }
    throw new Error(`unknown mode: ${args.mode}`);
  };
  void runMode()
    .then((res) => { console.log(JSON.stringify(res, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}

export {
  enumerate, fingerprint, makeInput, modeEstimate, modeSample, modeEnumerate,
  LATHE_ARCHETYPES, MATERIALS, LATHE_OPERATIONS, LATHE_CONTROLLERS,
  operationFitsToolFamily, strategyFitsOperation, cutTypeFitsStrategy,
  shapeFitsOperation, gradeFitsIso, bedFitsArchetype, chuckFitsArchetype,
  coolantFitsIso, boringBarShankFitsLD, drillFitsChuck,
};
