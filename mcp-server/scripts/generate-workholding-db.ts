/**
 * generate-workholding-db.ts  (JULIETT-DB-COVERAGE-MS0 / U-WORKHOLDING-MIRROR-GEN)
 *
 * Single-source generator: emits the engine-shadowed sections of WorkholdingDB.json
 * FROM the canonical WorkholdingEngine.ts constants. NEVER hand-copy these tables —
 * run this generator so the discovery mirror (loaded by DatabaseRegistry for
 * prism_data:database_search) can never drift from the engine that the live
 * clamping-force safety path actually uses. SAFETY CRITICAL: a drifted friction
 * coefficient or safety factor in the mirror yields a wrong holding-force answer.
 *
 * This is the canonical fix for the orphan-shadow pattern (file-backed DB JSON
 * drifting from engine-inline data) — sister to generate-tolerance-db-iso2768.ts.
 *
 * Drift already observed at first run: the hand-maintained mirror carried only 5 of
 * the engine's 7 SAFETY_FACTORS (missing DRILLING 2.5 + TAPPING 3.0) and 0 of the
 * VACUUM_SEAL_EFFICIENCY / MAGNETIC_PERMEABILITY tables. The generator closes both.
 *
 * Run:  npx tsx mcp-server/scripts/generate-workholding-db.ts
 * Guard: src/__tests__/workholding-db-mirror.test.ts asserts the on-disk JSON == engine.
 */
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  FRICTION_COEFFICIENTS,
  DYNAMIC_FACTORS,
  SAFETY_FACTORS,
  VACUUM_SEAL_EFFICIENCY,
  MAGNETIC_PERMEABILITY,
} from "../src/engines/WorkholdingEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Canonical WorkholdingDB.json path (repo-root data/databases/). */
export const WORKHOLDING_DB_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "data",
  "databases",
  "WorkholdingDB.json",
);

/** Human-readable section captions (presentation layer; data is engine-sourced). */
const DESCRIPTIONS = {
  friction:
    "Static friction coefficient μ by device type and surface condition. VACUUM_FIXTURE and MAGNETIC_CHUCK use 0.0 (area/magnetic-based calculations instead).",
  dynamic:
    "Dynamic force amplification factors — interrupted cuts and entry/exit create impact loads.",
  safety:
    "Minimum safety factors by application. SAFETY CRITICAL — never reduce below these values.",
  vacuumSeal:
    "Vacuum seal efficiency (fraction of theoretical holding force) by seal type and machined-surface roughness band Ra. Source: WorkholdingEngine.VACUUM_SEAL_EFFICIENCY.",
  magneticPerm:
    "Relative magnetic permeability by workpiece material — drives magnetic-chuck holding force. 1.0 = effectively non-magnetic. Source: WorkholdingEngine.MAGNETIC_PERMEABILITY.",
} as const;

/**
 * Build the engine-shadowed sections purely from the WorkholdingEngine constants.
 * Each section carries a `_description` caption + the spread engine table, so the
 * drift-guard test strips `_description` and deep-equals the bare engine const.
 */
export function buildEngineSections(): Record<string, unknown> {
  return {
    friction_coefficients: { _description: DESCRIPTIONS.friction, ...FRICTION_COEFFICIENTS },
    dynamic_force_factors: { _description: DESCRIPTIONS.dynamic, ...DYNAMIC_FACTORS },
    safety_factors: { _description: DESCRIPTIONS.safety, ...SAFETY_FACTORS },
    vacuum_seal_efficiency: { _description: DESCRIPTIONS.vacuumSeal, ...VACUUM_SEAL_EFFICIENCY },
    magnetic_permeability: { _description: DESCRIPTIONS.magneticPerm, ...MAGNETIC_PERMEABILITY },
  };
}

/** Total tabulated workholding rows the engine-sourced sections carry (logging/anti-regression). */
export function workholdingRowCount(): number {
  return (
    Object.keys(FRICTION_COEFFICIENTS).length * Object.keys(FRICTION_COEFFICIENTS.VICE_SMOOTH).length +
    Object.keys(DYNAMIC_FACTORS).length +
    Object.keys(SAFETY_FACTORS).length +
    Object.keys(VACUUM_SEAL_EFFICIENCY).length +
    Object.keys(MAGNETIC_PERMEABILITY).length
  );
}

/**
 * Merge the generated engine sections into WorkholdingDB.json, preserving the
 * JSON-only reference blocks (magnetic_chuck_data, vacuum_fixture_data) and the
 * top metadata. The device/surface lists are DERIVED from the friction table so
 * they cannot drift from it. Atomic (tmp + rename). Idempotent.
 * @returns whether the on-disk content changed + the engine row count.
 */
export function generate(dbPath: string = WORKHOLDING_DB_PATH): { changed: boolean; rows: number } {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as Record<string, unknown>;

  // Fail loud (R12): the generator regenerates the engine-shadowed sections but only
  // PRESERVES the JSON-only reference blocks via the `...db` spread. If the input was
  // truncated/corrupt and lost them, refuse to write a safety-critical mirror that
  // silently dropped reference data rather than emit it half-formed.
  for (const required of ["magnetic_chuck_data", "vacuum_fixture_data"] as const) {
    if (db[required] == null) {
      throw new Error(
        `[generate-workholding-db] refusing to write: input ${dbPath} is missing required JSON-only block '${required}' (truncated/corrupt input?)`,
      );
    }
  }

  const before = JSON.stringify(db);

  const next: Record<string, unknown> = {
    ...db, // preserve metadata + JSON-only reference blocks (magnetic_chuck_data, vacuum_fixture_data)
    version: db.version === "1.0.0" ? "1.1.0" : db.version,
    _generator:
      "Engine-shadowed sections GENERATED from WorkholdingEngine.ts by mcp-server/scripts/generate-workholding-db.ts — DO NOT hand-edit those sections; re-run the generator. Single source of truth = WorkholdingEngine. JSON-only blocks (magnetic_chuck_data, vacuum_fixture_data) are preserved.",
    // Structural lists derived from the friction table so they can never drift from it.
    device_types: Object.keys(FRICTION_COEFFICIENTS),
    surface_conditions: Object.keys(FRICTION_COEFFICIENTS.VICE_SMOOTH),
    ...buildEngineSections(), // overwrite engine-shadowed sections (fixes safety_factors drift + adds 2 tables)
  };

  const after = JSON.stringify(next);
  const changed = before !== after;
  if (changed) {
    const tmp = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, dbPath);
  }
  return { changed, rows: workholdingRowCount() };
}

// Run only when invoked directly via tsx (not when imported by the test).
const invokedDirectly =
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const r = generate();
  console.log(
    `[generate-workholding-db] ${r.changed ? "updated" : "no change"} ${WORKHOLDING_DB_PATH} (engine rows: ${r.rows})`,
  );
}
