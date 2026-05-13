#!/usr/bin/env node
// tier: T4
/**
 * Awareness Snapshot Hook — AI-AWARE-HARDEN/U-AWR11
 *
 * Emits a compact JSON snapshot of the PRISM AI awareness state at
 * SessionStart. Schema (exit gate requirement):
 *   {
 *     engines:      { count: N, sample: string[] },
 *     formulas:     { count: N, sample: string[] },
 *     materials:    { count: N },
 *     tools:        { count: N },
 *     extractions:  { completed: string[] },
 *     doNotDuplicate: string[]
 *   }
 *
 * Performance requirement: <500ms execution. We achieve this by:
 *   - Directory counting (no deep reads)
 *   - Static sampling (fixed-size lists)
 *   - Reading extraction-log.json directly (small file)
 *
 * Output: JSON via stdout (console.log) for SessionStart injection.
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(process.env.PRISM_ROOT ?? "H:/prism");
const MCP_SRC = path.join(REPO_ROOT, "mcp-server", "src");
const DATA_DIR = path.join(REPO_ROOT, "mcp-server", "data");

/** Safely count files matching a suffix in a directory (no recursion). */
function countFilesInDir(dir, suffix = "") {
  try {
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir);
    return suffix ? files.filter(f => f.endsWith(suffix)).length : files.length;
  } catch { return 0; }
}

/** Return up to N filenames without extensions from a directory. */
function sampleFilenames(dir, suffix, limit = 5) {
  try {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith(suffix));
    return files.slice(0, limit).map(f => f.replace(suffix, ""));
  } catch { return []; }
}

/** Read a JSON file or return null on any error. */
function readJsonSafe(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw);
  } catch { return null; }
}

/** Build engines snapshot */
function snapshotEngines() {
  const enginesDir = path.join(MCP_SRC, "engines");
  return {
    count: countFilesInDir(enginesDir, ".ts"),
    sample: sampleFilenames(enginesDir, "Engine.ts", 5),
  };
}

/** Build formulas snapshot from registry file or built-in list. */
function snapshotFormulas() {
  // FormulaWiringEngine reports 509 formulas via getStats (built-in + JSON).
  // We can't call the engine synchronously here, so use known baseline + sample.
  const sample = ["F-KIENZLE-001", "F-TAYLOR-001", "F-MRR-001", "F-SVD-001", "F-CHATTER-001"];
  // Count from formula registry file if present
  const regFile = path.join(DATA_DIR, "FORMULA_REGISTRY.json");
  const registry = readJsonSafe(regFile);
  let count = 509; // Known FormulaWiringEngine baseline
  if (registry && typeof registry === "object") {
    if (Array.isArray(registry)) count = registry.length;
    else if (registry.formulaRegistry?.formulas) count = Object.keys(registry.formulaRegistry.formulas).length;
    else if (registry.formulas) count = Array.isArray(registry.formulas) ? registry.formulas.length : Object.keys(registry.formulas).length;
  }
  return { count, sample };
}

/** Materials: count from MaterialDatabaseEngine source or catalog file. */
function snapshotMaterials() {
  // MaterialDatabaseEngine has 28 materials per roadmap.
  // Also have material catalog files in data/materials/.
  const matDir = path.join(DATA_DIR, "materials");
  const catalogCount = countFilesInDir(matDir, ".json");
  return {
    count: 28 + catalogCount,
    sample: ["1045", "4140", "D2", "6061-T6", "Ti-6Al-4V"],
  };
}

/** Tools: count from CATALOG_INDEX.json (reports 54k+ tools). */
function snapshotTools() {
  const catalog = readJsonSafe(path.join(DATA_DIR, "CATALOG_INDEX.json"));
  return {
    count: catalog?.totalEntries ?? 54080,
    sample: ["Sandvik", "Kennametal", "OSG", "Guhring", "Iscar"],
  };
}

/** Extraction log: read completed entries. */
function snapshotExtractions() {
  const log = readJsonSafe(path.join(DATA_DIR, "state", "extraction-log.json"));
  if (!log) return { completed: [] };
  if (Array.isArray(log)) {
    return { completed: log.filter(e => e.status === "completed").map(e => e.id ?? e.name).slice(0, 20) };
  }
  if (log.extractions && Array.isArray(log.extractions)) {
    return { completed: log.extractions.filter(e => e.status === "completed").map(e => e.id ?? e.name).slice(0, 20) };
  }
  if (typeof log === "object") {
    // Dict keyed by ID
    const completed = Object.entries(log)
      .filter(([, v]) => v && typeof v === "object" && v.status === "completed")
      .map(([k]) => k)
      .slice(0, 20);
    return { completed };
  }
  return { completed: [] };
}

/** Do-not-duplicate list: from extraction-log + cross-session-asset-registry. */
function snapshotDoNotDuplicate() {
  const reg = readJsonSafe(path.join(DATA_DIR, "state", "cross-session-asset-registry.json"));
  const extracted = snapshotExtractions().completed;
  const alreadyExtracted = [
    "Mastercam(45)", "hyperMILL(25)", "Okuma(63)", "Fanuc(35)", "Haas(28)", "Titans(42)",
  ];
  const fromReg = reg && typeof reg === "object"
    ? Object.keys(reg).slice(0, 10)
    : [];
  // Merge, dedup, trim
  const all = [...new Set([...alreadyExtracted, ...extracted.slice(0, 5), ...fromReg])];
  return all.slice(0, 15);
}

/** Build the full snapshot. Must be <500ms. */
function buildSnapshot() {
  return {
    engines: snapshotEngines(),
    formulas: snapshotFormulas(),
    materials: snapshotMaterials(),
    tools: snapshotTools(),
    extractions: snapshotExtractions(),
    doNotDuplicate: snapshotDoNotDuplicate(),
  };
}

function main() {
  const t0 = Date.now();
  const snapshot = buildSnapshot();
  const elapsed = Date.now() - t0;

  // Emit Claude SessionStart hook format
  const context = [
    "═══════════════════════════════════════════════════════════════════",
    "PRISM AWARENESS SNAPSHOT (U-AWR11)",
    "═══════════════════════════════════════════════════════════════════",
    `Engines:     ${snapshot.engines.count}  (e.g., ${snapshot.engines.sample.slice(0, 3).join(", ")})`,
    `Formulas:    ${snapshot.formulas.count}  (e.g., ${snapshot.formulas.sample.slice(0, 3).join(", ")})`,
    `Materials:   ${snapshot.materials.count}  (e.g., ${snapshot.materials.sample.slice(0, 3).join(", ")})`,
    `Tools:       ${snapshot.tools.count}  (mfrs: ${snapshot.tools.sample.slice(0, 3).join(", ")})`,
    `Extractions: ${snapshot.extractions.completed.length} completed`,
    `DO NOT DUPLICATE: ${snapshot.doNotDuplicate.slice(0, 5).join(", ")}`,
    "",
    `(Snapshot built in ${elapsed}ms — data via awareness-snapshot.mjs)`,
    "═══════════════════════════════════════════════════════════════════",
  ].join("\n");

  // SessionStart hooks emit { additionalContext: string } on stdout.
  // Also include the raw snapshot for downstream test consumption.
  console.log(JSON.stringify({
    additionalContext: context,
    prismAwarenessSnapshot: snapshot,
    snapshotDurationMs: elapsed,
  }));
}

main();
