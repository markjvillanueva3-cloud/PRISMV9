/**
 * generate-jm-hypermill-tool-library.ts
 * [JM-FUSION-TOOLS-MS0]/U-JFT-HYPERMILL (slot:romeo)
 *
 * Emits a hyperMILL Tool Database (SQLite .hmt) as DDL + INSERT SQL from JM
 * Die's real crib, gated to each tool's compatible ISO material domains. This
 * is the hyperMILL leg of the goal's "convert the Fusion tool DB to hyperMILL
 * and Mastercam"; it consumes the SAME shared tool model (`lib/jm-tool-model`)
 * as the Mastercam generator, so geometry, the material-compatibility gate, and
 * the physics cutting data (UltimateSpeedFeedEngine.lookupCuttingData) match the
 * Fusion library tool-for-tool.
 *
 * Schema + geometry-parameter mapping + INSERT shapes are adapted from the
 * production HyperMillToolExportEngine (E1127, sqlite.sql v1.53) — replicated
 * here (not imported) because that engine imports the 25 MB toolCatalogEngine
 * at module top, which crashes under tsx (catalogLoader `__dirname`/ESM). The
 * geometry/SQL logic is faithful to E1127; the cutting data is upgraded from
 * E1127's static VC_BASE/FZ_BASE tables to canonical lookupCuttingData.
 *
 * What E1127 does NOT emit and this DOES: a per-tool × per-COMPATIBLE-material
 * `CuttingData` table — the operator's "only populate compatible material
 * domains, accurate cutting data per domain" constraint, materialized as rows.
 *
 * UNITS: geometry is emitted in mm (mm_system_id=1); the shared model already
 * normalized JM's inch crib to mm. The raw 3D holder silhouette is NOT exported
 * (hyperMILL sets it in TOOL Builder — matches E1127's own note); the scalar
 * collision envelope (gauge length, projection, OAL) IS exported via NCTools
 * from REAL JM holder data where present.
 *
 * Materialize the .hmt:  sqlite3 JM-CRIB-hypermill.hmt < JM-CRIB-hypermill.sql
 * Run: cd mcp-server && npx tsx scripts/generate-jm-hypermill-tool-library.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  parseJmCribTools, cuttingDataForGroup, ALL_ISO,
  type JmTool, type IsoGroup, type ParseOpts,
} from "./lib/jm-tool-model.js";

const OUT_DIR = "H:/prism/state/shared/jm-hypermill-tools";

// ── hyperMILL geometry classes (E1127 HM_TYPE subset for JM's tool families) ──
const HM_TYPE: Record<string, number> = {
  Ballmill: 1, Endmill: 2, Radiusmill: 3, Drilltool: 4, ChamferedCutter: 9,
  Tap: 11, BoringBar: 12, ThreadMill: 15, Reamer: 16,
  GeneralTurningTool: 1000, RadialRecessingTool: 1001, ThreadingTool: 1003, PartingTool: 1004,
};

// ISO group → hyperMILL Materials.id / .type (P=1..H=6) and label.
const ISO_ID: Record<IsoGroup, number> = { P: 1, M: 2, K: 3, N: 4, S: 5, H: 6 };
const ISO_LABEL: Record<IsoGroup, string> = {
  P: "Steel (ISO-P)", M: "Stainless Steel (ISO-M)", K: "Cast Iron (ISO-K)",
  N: "Non-Ferrous (ISO-N)", S: "Superalloy/Titanium (ISO-S)", H: "Hardened Steel (ISO-H)",
};
// Cutting-material correction factor for the Materials table (relative to P-steel
// carbide baseline). Vc ratio drives milling_factor_vc; fz ratio drives _fz.
// Derived once from lookupCuttingData against a reference Ø12 carbide end mill.

// ── PRISM tool type → hyperMILL geometry class (E1127 prismTypeToHMClass subset) ─
function toHMClass(prismType: string): string {
  const t = (prismType || "").toLowerCase();
  // Turning family FIRST — a lathe tool ("turning threading", "turning boring")
  // must map to the 1000-series turning classes, never to the rotating
  // ThreadMill(15)/BoringBar(12) milling classes (different kinematics).
  if (t.includes("turn") || t.includes("lathe")) {
    if (t.includes("thread")) return "ThreadingTool";           // single-point turning thread
    if (t.includes("groov")) return "RadialRecessingTool";
    if (t.includes("part") || t.includes("cut-off") || t.includes("cutoff")) return "PartingTool";
    return "GeneralTurningTool";                                // general / boring / facing
  }
  // Rotating (milling / hole-making) families.
  if (t.includes("ball")) return "Ballmill";
  if (t.includes("bull") || t.includes("corner_radius") || t.includes("torus") || t.includes("radius")) return "Radiusmill";
  if (t.includes("chamfer") || t.includes("countersink")) return "ChamferedCutter";
  if (t.includes("tap")) return "Tap";
  if (t.includes("thread")) return "ThreadMill";                // rotating thread mill
  if (t.includes("ream")) return "Reamer";
  if (t.includes("bore") || t.includes("boring")) return "BoringBar"; // milling boring head
  if (t.includes("drill")) return "Drilltool";
  if (t.includes("face") || t.includes("shell") || t.includes("mill") || t.includes("end")) return "Endmill";
  return "Endmill";
}

// ── Geometry parameter builder (E1127 buildGeomParams, JM-relevant classes) ──
interface Geom { p1: number; p2: number; p3: number; p4: number; p5: number; i1: number; oal: number; }
function buildGeom(hmClass: string, t: JmTool): Geom {
  const d = t.diameter_mm > 0 ? t.diameter_mm : 10;
  const cr = t.cornerRadius_mm;
  const fl = t.fluteLength_mm > 0 ? t.fluteLength_mm : d * 3;
  const oal = t.overallLength_mm > 0 ? t.overallLength_mm : d * 6;
  const shank = t.shankDiameter_mm > 0 ? t.shankDiameter_mm : d;
  const flutes = t.flutes > 0 ? t.flutes : 4;
  const pointAngle = t.pointAngle_deg ?? (t.toolMaterial === "hss" ? 118 : 140);
  const pitch = t.threadPitch_mm ?? 1.0;

  switch (hmClass) {
    case "Ballmill":  return { p1: d, p2: 0, p3: 0, p4: 0, p5: shank, i1: flutes, oal };
    case "Endmill":   return { p1: d, p2: fl, p3: shank, p4: 0, p5: 0, i1: flutes, oal };
    case "Radiusmill":return { p1: d, p2: fl, p3: shank, p4: cr > 0 ? cr : d * 0.05, p5: 0, i1: flutes, oal };
    case "Drilltool": return { p1: d, p2: pointAngle, p3: shank, p4: fl, p5: 0, i1: 2, oal };
    case "ChamferedCutter": return { p1: d, p2: t.tipDiameter_mm ?? 0, p3: 45, p4: oal, p5: shank, i1: flutes, oal };
    case "Tap":       return { p1: d, p2: pitch, p3: fl, p4: oal, p5: shank, i1: 1, oal };
    case "ThreadMill":return { p1: d, p2: pitch, p3: fl, p4: oal, p5: shank, i1: flutes, oal };
    case "Reamer":
    case "BoringBar": return { p1: d, p2: 0, p3: fl, p4: oal, p5: shank, i1: flutes, oal };
    case "GeneralTurningTool":
    case "RadialRecessingTool":
    case "PartingTool": return { p1: d, p2: d * 0.25, p3: oal, p4: 0, p5: 0, i1: 1, oal };
    default:          return { p1: d, p2: 0, p3: fl, p4: oal, p5: shank, i1: flutes, oal };
  }
}

// ── SQL helpers (E1127) ──────────────────────────────────────────────────────
function sq(s: string): string { return `'${String(s).replace(/'/g, "''")}'`; }
function fmt(n: number, dec = 4): string { return Number(n).toFixed(dec); }

// ── GeometryClasses seed — DERIVED from HM_TYPE (single source of truth) ──────
// A hand-maintained seed dropped (1003,'ThreadingTool') while JM's turning-thread
// tools map to it, so the .hmt failed to load under `PRAGMA foreign_keys=ON`
// (FOREIGN KEY constraint failed; 3-of-3 scrutiny P1, 2026-06-01). Generating the
// seed from HM_TYPE guarantees every class toHMClass() can ever emit is seeded —
// this FK-orphan gap class can never recur.
const GEOMETRY_CLASS_SEED = Object.entries(HM_TYPE)
  .sort((a, b) => a[1] - b[1])
  .map(([name, id]) => `(${id},'${name}')`)
  .join(",");

// ── Schema DDL (E1127 SQLITE_SCHEMA + the new CuttingData table) ──────────────
const SCHEMA = `-- hyperMILL Tool Database (PRISM/JM Die export) — DDL + data
-- Schema adapted from HyperMillToolExportEngine E1127 (hyperMILL 33.0 sqlite.sql v1.53).
-- Materialize: sqlite3 JM-CRIB-hypermill.hmt < JM-CRIB-hypermill.sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS GeometryClasses (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS CuttingMaterials (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS Materials (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, type INTEGER NOT NULL DEFAULT 1,
  milling_factor_vc REAL NOT NULL DEFAULT 1.0, milling_factor_fz REAL NOT NULL DEFAULT 1.0,
  drilling_factor_vc REAL NOT NULL DEFAULT 1.0, drilling_factor_fz REAL NOT NULL DEFAULT 1.0);
CREATE TABLE IF NOT EXISTS Tools (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  tool_type_id INTEGER NOT NULL REFERENCES GeometryClasses(id),
  cutting_material_id INTEGER NOT NULL DEFAULT 2 REFERENCES CuttingMaterials(id),
  mm_system_id INTEGER NOT NULL DEFAULT 1, total_length REAL NOT NULL DEFAULT 0.0,
  dbl_param1 REAL DEFAULT 0.0, dbl_param2 REAL DEFAULT 0.0, dbl_param3 REAL DEFAULT 0.0,
  dbl_param4 REAL DEFAULT 0.0, dbl_param5 REAL DEFAULT 0.0,
  int_param1 INTEGER DEFAULT 0, ordering_code TEXT DEFAULT '', comment TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS NCTools (
  id INTEGER PRIMARY KEY, tool_id INTEGER NOT NULL REFERENCES Tools(id),
  nc_number_val INTEGER NOT NULL DEFAULT 0, nc_number_str TEXT NOT NULL DEFAULT '',
  nc_name TEXT NOT NULL DEFAULT '', gage_length REAL DEFAULT 0.0, tool_length REAL DEFAULT 0.0,
  usable_length REAL DEFAULT 0.0, preset_diameter REAL DEFAULT 0.0);
CREATE TABLE IF NOT EXISTS DepotItems (
  id INTEGER PRIMARY KEY, nctool_id INTEGER NOT NULL REFERENCES NCTools(id),
  slot_number INTEGER NOT NULL DEFAULT 0);
-- PRISM-added: per-tool × per-COMPATIBLE-material cutting data (E1127 omits this;
-- hyperMILL normally applies cutting data via technology templates — map these
-- rows to your Technologies table on import). vc m/min, fz/ap/ae mm, feed mm/min.
CREATE TABLE IF NOT EXISTS CuttingData (
  id INTEGER PRIMARY KEY, tool_id INTEGER NOT NULL REFERENCES Tools(id),
  material_id INTEGER NOT NULL REFERENCES Materials(id), iso_group TEXT NOT NULL,
  vc_mpm REAL, fz_mm REAL, ap_mm REAL, ae_mm REAL, rpm REAL, feed_mmpm REAL,
  coolant TEXT, use_css INTEGER NOT NULL DEFAULT 0);

INSERT OR IGNORE INTO GeometryClasses (id, name) VALUES ${GEOMETRY_CLASS_SEED};
INSERT OR IGNORE INTO CuttingMaterials (id, name) VALUES
  (1,'HSS'),(2,'Carbide'),(3,'Cermet'),(4,'Ceramic'),(5,'CBN'),(6,'PCD');
`;

export interface HmStats {
  tools: number; skippedNoGeometry: number; cuttingRows: number; gatedOutGroups: number;
  geometryClasses: string[];
}
export interface HmBuildResult { sql: string; stats: HmStats; }

/**
 * Build the complete hyperMILL .hmt SQL (schema + all INSERTs) for a set of
 * JM tools. Pure + deterministic (exported for testing).
 */
export function buildHyperMillSql(tools: JmTool[]): HmBuildResult {
  const lines: string[] = [SCHEMA];
  const classesUsed = new Set<string>();
  let toolId = 0, ncId = 0, cdId = 0, cuttingRows = 0, gatedOut = 0, skipped = 0;

  // Materials table (6 ISO groups) — Vc/fz factors relative to P-steel, derived
  // from lookupCuttingData on a reference Ø12 carbide end mill (no inlined consts).
  lines.push("-- Materials (ISO groups; factors relative to P-steel carbide baseline)");
  const refP = cuttingDataForGroup(refTool("P"), "P");
  for (const iso of ALL_ISO) {
    const ref = cuttingDataForGroup(refTool(iso), iso);
    const vcF = refP && ref && refP.vc_mpm > 0 ? ref.vc_mpm / refP.vc_mpm : 1.0;
    const fzF = refP && ref && refP.fz_mm > 0 ? ref.fz_mm / refP.fz_mm : 1.0;
    lines.push(
      `INSERT OR IGNORE INTO Materials (id, name, type, milling_factor_vc, milling_factor_fz, drilling_factor_vc, drilling_factor_fz) VALUES (` +
      `${ISO_ID[iso]}, ${sq(ISO_LABEL[iso])}, ${ISO_ID[iso]}, ${fmt(vcF)}, ${fmt(fzF)}, ${fmt(vcF * 0.9)}, ${fmt(fzF * 0.8)});`,
    );
  }

  const toolInserts: string[] = ["-- Tools (geometry)"];
  const ncInserts: string[] = ["-- NCTools (assembled tool: gauge/holder collision scalars from real JM holders)"];
  const depotInserts: string[] = ["-- DepotItems (magazine slots)"];
  const cdInserts: string[] = ["-- CuttingData (per-tool × per-COMPATIBLE-material; gated)"];

  for (const t of tools) {
    // P2 (scrutiny): drop a tool with no usable geometry rather than emit a 0.00 row.
    if (t.opClass !== "turning" && !(t.diameter_mm > 0)) { skipped++; continue; }
    toolId++;
    const hmClass = toHMClass(t.prismType);
    classesUsed.add(hmClass);
    const typeId = HM_TYPE[hmClass] ?? HM_TYPE.Endmill;
    const cutMatId = t.toolMaterial === "hss" ? 1 : 2;
    const g = buildGeom(hmClass, t);
    const orderingCode = t.partNumber.slice(0, 127);
    const comment = `JM Die crib (${t.sourceFile}); compat ${t.compatibleGroups.join("/")}`.slice(0, 127);
    toolInserts.push(
      `INSERT INTO Tools (id, name, tool_type_id, cutting_material_id, mm_system_id, total_length, ` +
      `dbl_param1, dbl_param2, dbl_param3, dbl_param4, dbl_param5, int_param1, ordering_code, comment) VALUES (` +
      `${toolId}, ${sq(t.name)}, ${typeId}, ${cutMatId}, 1, ${fmt(g.oal)}, ` +
      `${fmt(g.p1)}, ${fmt(g.p2)}, ${fmt(g.p3)}, ${fmt(g.p4)}, ${fmt(g.p5)}, ${g.i1}, ${sq(orderingCode)}, ${sq(comment)});`,
    );

    // NCTools — REAL JM holder collision scalars where present, else infer (E1127).
    ncId++;
    const gage = t.holder.gaugeLength_mm ?? (g.p1 >= 32 ? 100 : g.p1 >= 16 ? 80 : g.p1 >= 6 ? 60 : 50);
    const proj = t.holder.projection_mm ?? Math.max(g.oal - gage, 10);
    const usable = t.fluteLength_mm > 0 ? t.fluteLength_mm : Math.max(proj * 0.5, 5);
    ncInserts.push(
      `INSERT INTO NCTools (id, tool_id, nc_number_val, nc_number_str, nc_name, gage_length, tool_length, usable_length, preset_diameter) VALUES (` +
      `${ncId}, ${toolId}, ${ncId}, ${sq(String(ncId))}, ${sq(t.name)}, ${fmt(gage)}, ${fmt(proj)}, ${fmt(usable)}, ${fmt(g.p1)});`,
    );
    depotInserts.push(`INSERT INTO DepotItems (id, nctool_id, slot_number) VALUES (${ncId}, ${ncId}, ${ncId});`);

    // CuttingData — ONLY compatible ISO groups, only when physics resolves.
    for (const iso of ALL_ISO) {
      if (!t.compatibleGroups.includes(iso)) { gatedOut++; continue; }
      const cd = cuttingDataForGroup(t, iso);
      if (!cd) continue;
      cdId++; cuttingRows++;
      cdInserts.push(
        `INSERT INTO CuttingData (id, tool_id, material_id, iso_group, vc_mpm, fz_mm, ap_mm, ae_mm, rpm, feed_mmpm, coolant, use_css) VALUES (` +
        `${cdId}, ${toolId}, ${ISO_ID[iso]}, ${sq(iso)}, ${fmt(cd.vc_mpm, 2)}, ${fmt(cd.fz_mm, 5)}, ` +
        `${fmt(cd.ap_mm, 3)}, ${fmt(cd.ae_mm, 3)}, ${cd.rpm == null ? "NULL" : fmt(cd.rpm, 1)}, ` +
        `${cd.feed_mmpm == null ? "NULL" : fmt(cd.feed_mmpm, 1)}, ${sq(cd.coolant)}, ${cd.useCSS ? 1 : 0});`,
      );
    }
  }

  lines.push("", ...toolInserts, "", ...ncInserts, "", ...depotInserts, "", ...cdInserts, "");
  return {
    sql: lines.join("\n") + "\n",
    stats: {
      tools: toolId, skippedNoGeometry: skipped, cuttingRows, gatedOutGroups: gatedOut,
      geometryClasses: [...classesUsed].sort(),
    },
  };
}

/** Reference Ø12 carbide end mill for the Materials Vc/fz factor derivation. */
function refTool(_iso: IsoGroup): JmTool {
  return {
    index: 0, sourceFile: "ref", name: "ref", manufacturer: "ref", partNumber: "", description: "",
    comment: "", prismType: "end mill", opClass: "milling", nativeUnit: "mm",
    diameter_mm: 12, cornerRadius_mm: 0, fluteLength_mm: 36, overallLength_mm: 72, shankDiameter_mm: 12,
    flutes: 4, pointAngle_deg: null, tipDiameter_mm: null, threadPitch_mm: null,
    toolMaterial: "carbide", coatingHint: "carbide",
    holder: { description: "", vendor: "", productId: "", gaugeLength_mm: null, overallLength_mm: null, projection_mm: null, segmentsRaw: "", shaftSegmentsRaw: "" },
    compatibleGroups: ALL_ISO,
  };
}

function writeReadme(stats: HmStats): void {
  const o: string[] = [];
  o.push("# JM Die — hyperMILL Tool Database (.hmt SQL)\n");
  o.push(`Generated ${stats.tools} tools (${stats.cuttingRows} compatibility-gated cutting rows) from JM's real Fusion crib.`);
  o.push(`Skipped ${stats.skippedNoGeometry} tool(s) with no usable cutting geometry (fail-loud, not silently zero-filled).\n`);
  o.push("## Materialize the .hmt database");
  o.push("```\nsqlite3 JM-CRIB-hypermill.hmt < JM-CRIB-hypermill.sql\n```");
  o.push("Then in hyperMILL: Tool Database → File → Import SQLite → select `JM-CRIB-hypermill.hmt`.\n");
  o.push("## What's inside");
  o.push("- **Tools** — geometry (dbl_param mapping per E1127 sqlite.sql v1.53), mm (mm_system_id=1).");
  o.push("- **NCTools** — assembled-tool gauge length + projection (collision scalars) from REAL JM holder data where present; inferred from diameter only when the crib row lacked it.");
  o.push("- **Materials** — 6 ISO groups (P/M/K/N/S/H) with Vc/fz factors relative to P-steel, from `UltimateSpeedFeedEngine.lookupCuttingData`.");
  o.push("- **CuttingData** — per-tool × per-COMPATIBLE-material Vc/fz/ap/ae/RPM/feed. Each tool carries rows ONLY for the ISO groups its coating+substrate is metallurgically compatible with (operator constraint). vc m/min, fz/ap/ae mm, feed mm/min.\n");
  o.push(`Geometry classes used: ${stats.geometryClasses.join(", ")}.\n`);
  o.push("## Honest limitations (R12)");
  o.push("- The raw 3D holder/shaft silhouette is NOT exported (hyperMILL builds it in TOOL Builder; matches E1127). The scalar collision envelope (gauge/projection/OAL) IS exported.");
  o.push("- `projection` derived from assembly−holder gauge length where both exist; otherwise falls back to overall length (an UPPER BOUND on stickout — conservative for collision, verify before trusting as exact).");
  o.push("- hyperMILL applies cutting data via technology templates; the `CuttingData` table is PRISM-added — map it to your Technologies table on import.");
  o.push("- Cutting data are physics starting points (Kienzle/Taylor) — verify on the machine for rigidity/coolant/finish.");
  o.push("\n_Generated by `scripts/generate-jm-hypermill-tool-library.ts` — JM-FUSION-TOOLS-MS0/U-JFT-HYPERMILL (slot:romeo). Schema adapted from HyperMillToolExportEngine E1127._");
  writeFileSync(join(OUT_DIR, "README.md"), o.join("\n") + "\n", "utf-8");
}

function main(): void {
  const opts: ParseOpts = {};
  const tools = parseJmCribTools(opts);
  const { sql, stats } = buildHyperMillSql(tools);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "JM-CRIB-hypermill.sql"), sql, "utf-8");
  writeReadme(stats);
  console.log(`GENERATED hyperMILL .hmt SQL: ${stats.tools} tools, ${stats.cuttingRows} gated cutting rows, ${stats.skippedNoGeometry} skipped (no geometry).`);
  console.log(`Geometry classes: ${stats.geometryClasses.join(", ")}`);
  console.log(`Output: ${OUT_DIR}`);
}

// Run only when executed directly (not when imported by the test).
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("generate-jm-hypermill-tool-library")) main();
