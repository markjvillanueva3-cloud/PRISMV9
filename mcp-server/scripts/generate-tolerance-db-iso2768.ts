/**
 * generate-tolerance-db-iso2768.ts  (JULIETT-DB-COVERAGE-MS0 / U-DB-MIRROR-GEN)
 *
 * Single-source generator: emits the ISO 2768 section of ToleranceDB.json FROM
 * the canonical ToleranceEngine constants. NEVER hand-copy these tables — run
 * this generator so the discovery mirror (loaded by DatabaseRegistry for
 * prism_data:database_search) can never drift from the engine that the live
 * calc path actually uses. This is the canonical fix for the orphan-shadow
 * pattern (file-backed DB JSON drifting from engine-inline data).
 *
 * Run:  npx tsx mcp-server/scripts/generate-tolerance-db-iso2768.ts
 * Guard: src/__tests__/tolerance-db-mirror.test.ts asserts the on-disk JSON == engine.
 */
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  ISO2768_LINEAR,
  ISO2768_RADIUS_CHAMFER,
  ISO2768_ANGULAR,
  ISO2768_STRAIGHTNESS_FLATNESS,
  ISO2768_PERPENDICULARITY,
  ISO2768_SYMMETRY,
  ISO2768_CIRCULAR_RUNOUT,
} from "../src/engines/ToleranceEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Canonical ToleranceDB.json path (repo-root data/databases/). */
export const TOLERANCE_DB_PATH = path.resolve(__dirname, "..", "..", "data", "databases", "ToleranceDB.json");

/** Build the ISO 2768 discovery section purely from the engine constants. */
export function buildIso2768Section(): Record<string, unknown> {
  return {
    _source:
      "GENERATED from ToleranceEngine.ts ISO2768_* constants by mcp-server/scripts/generate-tolerance-db-iso2768.ts — DO NOT hand-edit; re-run the generator. Single source of truth = ToleranceEngine.",
    standards: ["ISO 2768-1:1989", "ISO 2768-2:1989"],
    linear_mm: ISO2768_LINEAR,
    external_radius_chamfer_mm: ISO2768_RADIUS_CHAMFER,
    angular_deg: ISO2768_ANGULAR,
    geometric: {
      straightness_flatness_mm: ISO2768_STRAIGHTNESS_FLATNESS,
      perpendicularity_mm: ISO2768_PERPENDICULARITY,
      symmetry_mm: ISO2768_SYMMETRY,
      circular_runout_mm: ISO2768_CIRCULAR_RUNOUT,
    },
  };
}

/** Total tabulated ISO 2768 rows the section carries (for logging/anti-regression). */
export function iso2768RowCount(): number {
  return (
    ISO2768_LINEAR.length +
    ISO2768_RADIUS_CHAMFER.length +
    ISO2768_ANGULAR.length +
    ISO2768_STRAIGHTNESS_FLATNESS.length +
    ISO2768_PERPENDICULARITY.length +
    ISO2768_SYMMETRY.length +
    Object.keys(ISO2768_CIRCULAR_RUNOUT).length
  );
}

/**
 * Merge the generated ISO 2768 section into ToleranceDB.json (preserving the
 * existing ISO 286 content), atomically (tmp + rename). Idempotent.
 * @returns whether the on-disk section changed + the row count.
 */
export function generate(dbPath: string = TOLERANCE_DB_PATH): { changed: boolean; rows: number } {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as Record<string, unknown>;
  const section = buildIso2768Section();
  const before = JSON.stringify(db.iso2768 ?? null);
  db.iso2768 = section;
  if (db.version === "1.0.0") db.version = "1.1.0";
  const after = JSON.stringify(section);
  const changed = before !== after;
  if (changed) {
    const tmp = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dbPath);
  }
  return { changed, rows: iso2768RowCount() };
}

// Run only when invoked directly via tsx (not when imported by the test).
const invokedDirectly =
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const r = generate();
  console.log(
    `[generate-tolerance-db-iso2768] ${r.changed ? "updated" : "no change"} ${TOLERANCE_DB_PATH} (ISO 2768 rows: ${r.rows})`,
  );
}
