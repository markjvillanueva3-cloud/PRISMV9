// cimco-machine-index.mjs — index the CIMCO machine-definition library (.mcfg corpus).
//
// Runs readMachineDef() across every CIMCO Edit machine definition and emits a structured
// inventory: what kinematic models ship, their orientation/units/axes/collision config. This
// is the foundation the DB galaxies (juliett/romeo) ingest, and the catalog the machining
// galaxies (foxtrot/whiskey) clone JM's real machines from.
//
// Source corpus: H:/prism/resources/cimco-2026/CIMCOEdit/MachineCfg/*.mcfg (verified 2026-06-02).
// Output: state/shared/cimco/machine-index.json (schema-versioned state JSON).
//
// Wiki: [[cimco-verification-simulation-integration]] · Memory: reference_cimco_install_corpus_2026_06_02

import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readMachineDef } from "./cimco-control-map.mjs";

export const DEFAULT_CORPUS = "H:/prism/resources/cimco-2026/CIMCOEdit/MachineCfg";
export const DEFAULT_OUT = "H:/prism/state/shared/cimco/machine-index.json";

/**
 * Build the machine-library index by reading every .mcfg in `corpusDir`.
 * Per-file parse errors are captured (not thrown) so one bad file never blanks the index.
 * @returns {{schemaVersion,generatedFrom,machineCount,errorCount,byOrientation,byUnit,
 *   unresolvedUnits:string[], machines:Array, errors:Array}}
 */
export function buildMachineIndex(corpusDir = DEFAULT_CORPUS) {
  let entries;
  try {
    entries = readdirSync(corpusDir).filter((f) => f.toLowerCase().endsWith(".mcfg"));
  } catch (e) {
    throw new Error(`cimco MachineCfg dir not readable: ${corpusDir} (${e.code || e.message})`);
  }

  const machines = [];
  const errors = [];
  for (const f of entries.sort()) {
    const p = `${corpusDir}/${f}`;
    try {
      const m = readMachineDef(p);
      machines.push({
        file: f,
        displayName: m.displayName,
        orientation: m.orientation,
        unit: m.unit,
        unitsResolved: m.unitsResolved,
        unitSource: m.unitSource,
        unitsInferred: m.unitsInferred,
        inferenceConfidence: m.inferenceConfidence,
        maxLinearRange: m.maxLinearRange,
        axes: m.axes,
        axisCount: m.axes.length,
        collisionPairs: m.collisionPairs.length,
        hasRevolver: !!m.revolver,
        toolchangePositions: m.toolchangePositions,
        maxCuttingFeedrate: m.maxCuttingFeedrate,
        warnings: m.warnings,
      });
    } catch (e) {
      errors.push({ file: f, error: e.message });
    }
  }

  const byOrientation = {};
  const byUnit = {};
  const byUnitSource = {};
  for (const m of machines) {
    const o = m.orientation || "unknown";
    byOrientation[o] = (byOrientation[o] || 0) + 1;
    byUnit[m.unit] = (byUnit[m.unit] || 0) + 1;
    const src = m.unitSource || "unknown";
    byUnitSource[src] = (byUnitSource[src] || 0) + 1;
  }

  return {
    // 1.1.0: + unitSource / unitsInferred / inferenceConfidence / maxLinearRange per machine, and
    // byUnitSource / unitsInferred / unitsUnknown rollups (U-CIMCO-MCFG-UNITS-INFER, 2026-06-03).
    schemaVersion: "1.1.0",
    generatedFrom: corpusDir,
    machineCount: machines.length,
    errorCount: errors.length,
    byOrientation,
    byUnit,
    byUnitSource,
    // unresolvedUnits = NOT authoritatively declared in Header.Unit (inferred + truly-unknown).
    // Kept under its original name for back-compat; the honest split follows in the two lists below.
    unresolvedUnits: machines.filter((m) => !m.unitsResolved).map((m) => m.file),
    // INFERRED: best-guess mm from kinematic magnitude — usable but MUST be verified vs the real machine.
    unitsInferred: machines.filter((m) => m.unitsInferred).map((m) => m.file),
    // TRULY UNKNOWN: no declaration AND no usable magnitude signal — never use for geometry until resolved.
    unitsUnknown: machines.filter((m) => m.unit === "unknown").map((m) => m.file),
    machines,
    errors,
  };
}

/** Build + write the index to disk (creates parent dir). Returns a summary. */
export function writeMachineIndex(outPath = DEFAULT_OUT, corpusDir = DEFAULT_CORPUS) {
  const idx = buildMachineIndex(corpusDir);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(idx, null, 2) + "\n");
  return {
    outPath,
    machineCount: idx.machineCount,
    errorCount: idx.errorCount,
    byOrientation: idx.byOrientation,
    byUnit: idx.byUnit,
    byUnitSource: idx.byUnitSource,
    unresolved: idx.unresolvedUnits.length, // not authoritatively declared (inferred + unknown)
    inferred: idx.unitsInferred.length,
    unitsUnknown: idx.unitsUnknown.length,
  };
}

// ─── CLI (argv-guarded) ──────────────────────────────────────────────────────
function _main(argv) {
  let out = DEFAULT_OUT;
  let corpus = DEFAULT_CORPUS;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--corpus") corpus = argv[++i];
  }
  try {
    const s = writeMachineIndex(out, corpus);
    process.stdout.write(JSON.stringify(s) + "\n");
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
}

const _argv1 = process.argv[1];
if (_argv1 && (_argv1.endsWith("cimco-machine-index.mjs") || _argv1.endsWith("cimco-machine-index"))) {
  process.exit(_main(process.argv.slice(2)));
}
