/**
 * generate-coolant-db.ts  (JULIETT-DB-COVERAGE-MS0 / U-COOLANT-MIRROR-GEN)
 *
 * Single-source generator: emits the engine-shadowed sections of CoolantDB.json
 * FROM the canonical CoolantValidationEngine.ts constants. NEVER hand-copy these
 * tables — run this generator so the discovery mirror (loaded by DatabaseRegistry
 * for prism_data:database_search) can never drift from the engine the live
 * coolant-validation path actually uses.
 *
 * Canonical fix for the orphan-shadow pattern — sister to generate-workholding-db.ts
 * and generate-tolerance-db-iso2768.ts. At first run the 5 engine tables already
 * matched the hand-maintained mirror (no value drift) — this locks them so they
 * cannot silently diverge in future, and normalizes the one cosmetic mismatch
 * (mql_consumption.GRINDING carried a `note` field that is a code-comment in the
 * engine, not data).
 *
 * Run:  npx tsx mcp-server/scripts/generate-coolant-db.ts
 * Guard: src/__tests__/coolant-db-mirror.test.ts asserts the on-disk JSON == engine.
 */
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  FLOW_REQUIREMENTS,
  PRESSURE_BY_LD,
  MATERIAL_FACTORS,
  MQL_CONSUMPTION,
  RECOMMENDED_COOLANT,
} from "../src/engines/CoolantValidationEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Canonical CoolantDB.json path (repo-root data/databases/). */
export const COOLANT_DB_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "data",
  "databases",
  "CoolantDB.json",
);

/** Human-readable section captions (presentation layer; data is engine-sourced). */
const DESCRIPTIONS = {
  flow: "Flow rate requirements by operation [L/min per mm tool diameter].",
  pressure: "Required coolant pressure by length-to-diameter ratio for drilling [bar].",
  material: "Multiplier on base coolant requirements by material group.",
  mql: "Minimum Quantity Lubrication oil consumption rates [mL/hr] by operation.",
  recommended: "Best coolant type by material group.",
} as const;

/**
 * Build the engine-shadowed sections purely from the CoolantValidationEngine constants.
 * Each section carries a `_description` caption + the spread engine table, so the
 * drift-guard test strips `_description` and deep-equals the bare engine const.
 */
export function buildEngineSections(): Record<string, unknown> {
  return {
    flow_requirements_l_per_min_per_mm: { _description: DESCRIPTIONS.flow, ...FLOW_REQUIREMENTS },
    pressure_by_ld_ratio_bar: { _description: DESCRIPTIONS.pressure, ...PRESSURE_BY_LD },
    material_factors: { _description: DESCRIPTIONS.material, ...MATERIAL_FACTORS },
    mql_consumption_ml_per_hr: { _description: DESCRIPTIONS.mql, ...MQL_CONSUMPTION },
    recommended_coolant_by_material: { _description: DESCRIPTIONS.recommended, ...RECOMMENDED_COOLANT },
  };
}

/** Total tabulated engine-sourced rows the sections carry (logging/anti-regression). */
export function coolantRowCount(): number {
  return (
    Object.keys(FLOW_REQUIREMENTS).length +
    Object.keys(PRESSURE_BY_LD).length +
    Object.keys(MATERIAL_FACTORS).length +
    Object.keys(MQL_CONSUMPTION).length +
    Object.keys(RECOMMENDED_COOLANT).length
  );
}

/**
 * Merge the generated engine sections into CoolantDB.json, preserving the JSON-only
 * reference blocks (coolant_types, through_spindle_coolant) and the top metadata. The
 * `operations` list is DERIVED from FLOW_REQUIREMENTS so it cannot drift from it.
 * Atomic (tmp + rename). Idempotent.
 * @returns whether the on-disk content changed + the engine row count.
 */
export function generate(dbPath: string = COOLANT_DB_PATH): { changed: boolean; rows: number } {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as Record<string, unknown>;

  // Fail loud (R12): the generator regenerates the engine-shadowed sections but only
  // PRESERVES the JSON-only reference blocks via the `...db` spread. If the input was
  // truncated/corrupt and lost them, refuse to write rather than emit a half-formed DB.
  for (const required of ["coolant_types", "through_spindle_coolant"] as const) {
    if (db[required] == null) {
      throw new Error(
        `[generate-coolant-db] refusing to write: input ${dbPath} is missing required JSON-only block '${required}' (truncated/corrupt input?)`,
      );
    }
  }

  const before = JSON.stringify(db);
  const next: Record<string, unknown> = {
    ...db, // preserve metadata + JSON-only blocks (coolant_types, through_spindle_coolant)
    version: db.version === "1.0.0" ? "1.1.0" : db.version,
    _generator:
      "Engine-shadowed sections GENERATED from CoolantValidationEngine.ts by mcp-server/scripts/generate-coolant-db.ts — DO NOT hand-edit those sections; re-run the generator. Single source of truth = CoolantValidationEngine. JSON-only blocks (coolant_types, through_spindle_coolant) are preserved.",
    // Derived from the engine flow table so the op list can never drift from it.
    operations: Object.keys(FLOW_REQUIREMENTS),
    ...buildEngineSections(), // overwrite engine-shadowed sections
  };

  const after = JSON.stringify(next);
  const changed = before !== after;
  if (changed) {
    const tmp = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, dbPath);
  }
  return { changed, rows: coolantRowCount() };
}

// Run only when invoked directly via tsx (not when imported by the test).
const invokedDirectly =
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const r = generate();
  console.log(
    `[generate-coolant-db] ${r.changed ? "updated" : "no change"} ${COOLANT_DB_PATH} (engine rows: ${r.rows})`,
  );
}
