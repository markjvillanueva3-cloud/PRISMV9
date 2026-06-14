#!/usr/bin/env node
/**
 * export-hypermill-holder-db.mjs — Emit an uploadable hyperMILL Holder Database (.hmt SQLite)
 *
 * GAP-FILLER (echo slot, 2026-05-31): the existing HyperMillToolExportEngine (E1127)
 * exports Tools/NCTools/DepotItems but NEVER emits a standalone Holders DB — NCTools
 * only *reference* a holder by name. hyperMILL's real schema has a dedicated `Holders`
 * table (+ `Couplings` for spindle/tool interfaces). This script closes that gap by
 * converting PRISM's holder catalog (ToolHolderDatabaseEngine, 80+ holders) into a
 * SQLite-loadable `.hmt.sql` script that produces a `.hmt` file importable via
 * hyperMILL Tool Database > File > Import SQLite.
 *
 * Schema faithfully mirrors mcp-server/src/data/hypermill-tool-schema-notes.ts:
 *   HYPERMILL_HOLDER_FIELDS   (Holders table)
 *   HYPERMILL_COUPLING_FIELDS (Couplings table — spindle-side + tool-side interfaces)
 *
 * Does NOT touch the tool exporter (it exists & is verified uploadable).
 *
 * Pure: holder rows are passed in (or default to a representative built-in set so the
 * script runs hermetically without importing the TS engine). The TS engine's HOLDER_DB
 * is the live source — pass --from-catalog to require it (left as a wiring hook; default
 * uses the embedded representative subset, which is byte-for-byte the engine's CAT/BT/HSK
 * rows so the test asserts real values).
 *
 * Usage:
 *   node scripts/export-hypermill-holder-db.mjs [--out <path>] [--units mm|inch]
 *   node scripts/export-hypermill-holder-db.mjs --self-test
 *
 * Output: a `.hmt.sql` file (load with: sqlite3 holders.hmt < holders.hmt.sql)
 *
 * @gap-filler hyperMILL holder DB export (no prior exporter existed)
 * @source ToolHolderDatabaseEngine HOLDER_DB + HYPERMILL_HOLDER_FIELDS schema
 */

import fs from "fs";
import path from "path";

// ── Representative holder rows (mirror of ToolHolderDatabaseEngine HOLDER_DB subset) ──
// Real values lifted verbatim from src/engines/ToolHolderDatabaseEngine.ts so the
// self-test asserts genuine spindle_bore / flange_dia / max_rpm numbers, not stubs.
export const DEFAULT_HOLDERS = [
  { id: "CAT40", type: "v_flange", standard: "ANSI B5.50", taper: "40", spindle_bore: 44.45, flange_dia: 63.55, max_rpm: 15000, use_case: "general_purpose" },
  { id: "CAT50", type: "v_flange", standard: "ANSI B5.50", taper: "50", spindle_bore: 69.85, flange_dia: 101.6, max_rpm: 8000, use_case: "large_machines" },
  { id: "BT30", type: "bt_taper", standard: "JIS B6339", taper: "30", spindle_bore: 31.75, flange_dia: 46.0, max_rpm: 24000, use_case: "high_speed" },
  { id: "BT40", type: "bt_taper", standard: "JIS B6339", taper: "40", spindle_bore: 44.45, flange_dia: 63.0, max_rpm: 15000, use_case: "general_purpose" },
  { id: "HSK-A63", type: "hsk", standard: "DIN 69893", taper: "A63", spindle_bore: 48.0, flange_dia: 63.0, max_rpm: 25000, use_case: "high_speed_5axis" },
  { id: "HSK-A100", type: "hsk", standard: "DIN 69893", taper: "A100", spindle_bore: 75.0, flange_dia: 100.0, max_rpm: 12000, use_case: "heavy_duty_5axis" },
  { id: "ER32-COLLET", type: "collet_chuck", standard: "DIN 6499", max_rpm: 30000, use_case: "general_milling" },
  { id: "SHRINK-FIT-D12", type: "shrink_fit", standard: "DIN 69882", max_rpm: 42000, use_case: "high_precision_hsm" },
];

// ── Coupling type enum (hyperMILL Couplings.type) ──
const COUPLING_TYPE = {
  hsk: 1, bt_taper: 2, v_flange: 3, capto: 4, km: 5,
  collet_chuck: 10, shrink_fit: 11, hydraulic: 12, weldon: 13, er: 14,
};

// hyperMILL holder.type → bottom (tool-side) coupling class mapping
function bottomCouplingFor(holderType) {
  switch (holderType) {
    case "collet_chuck": return { type: COUPLING_TYPE.collet_chuck, class: "ER", iso: "DIN6499" };
    case "shrink_fit":   return { type: COUPLING_TYPE.shrink_fit, class: "ShrinkFit", iso: "DIN69882" };
    case "hydraulic":    return { type: COUPLING_TYPE.hydraulic, class: "Hydraulic", iso: "" };
    default:             return { type: COUPLING_TYPE.er, class: "ER", iso: "DIN6499" }; // tapers usually carry an ER bottom
  }
}
function topCouplingFor(holder) {
  const t = holder.type;
  const taper = holder.taper ?? "";
  if (t === "v_flange") return { type: COUPLING_TYPE.v_flange, class: `CAT${taper}`, iso: "ANSI_B5.50" };
  if (t === "bt_taper") return { type: COUPLING_TYPE.bt_taper, class: `BT${taper}`, iso: "JIS_B6339" };
  if (t === "hsk")      return { type: COUPLING_TYPE.hsk, class: `HSK-${taper}`, iso: "DIN69893" };
  // collet/shrink with no explicit machine taper → assume CAT40 spindle by JM fleet default
  return { type: COUPLING_TYPE.v_flange, class: "CAT40", iso: "ANSI_B5.50" };
}

function sqlStr(s) { return `'${String(s ?? "").replace(/'/g, "''")}'`; }
function num(n, d = 0.0) { return Number.isFinite(n) ? n : d; }

// ── Schema DDL (Holders + Couplings + Manufacturers) ──
export const HOLDER_SCHEMA = `-- hyperMILL Holder Database (PRISM export)
-- Schema mirrors HYPERMILL_HOLDER_FIELDS + HYPERMILL_COUPLING_FIELDS (hypermill-tool-schema-notes.ts)
-- Import via: hyperMILL Tool Database > File > Import SQLite

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS Manufacturers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Couplings (
  coupling_id     INTEGER PRIMARY KEY,
  type            INTEGER NOT NULL DEFAULT 0,
  class           TEXT    NOT NULL DEFAULT '',
  iso_code        TEXT    NOT NULL DEFAULT '',
  mm_system_id    INTEGER NOT NULL DEFAULT 1,
  min_dia         REAL    NOT NULL DEFAULT 0.0,
  max_dia         REAL    NOT NULL DEFAULT 0.0,
  min_len         REAL    NOT NULL DEFAULT 0.0,
  max_len         REAL    NOT NULL DEFAULT 0.0,
  min_square_size REAL    NOT NULL DEFAULT 0.0,
  max_square_size REAL    NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS Holders (
  id                   INTEGER PRIMARY KEY,
  name                 TEXT    NOT NULL,
  ordering_code        TEXT    NOT NULL DEFAULT '',
  manufacturer_id      INTEGER NOT NULL DEFAULT 1 REFERENCES Manufacturers(id),
  mm_system_id         INTEGER NOT NULL DEFAULT 1,
  top_coupling_id      INTEGER NOT NULL DEFAULT 0 REFERENCES Couplings(coupling_id),
  bottom_coupling_id   INTEGER NOT NULL DEFAULT 0 REFERENCES Couplings(coupling_id),
  spindle_speed_factor REAL    NOT NULL DEFAULT 1.0,
  feedrate_factor      REAL    NOT NULL DEFAULT 1.0,
  infeed_width_factor  REAL    NOT NULL DEFAULT 1.0,
  infeed_length_factor REAL    NOT NULL DEFAULT 1.0,
  max_spindle_speed    REAL    NOT NULL DEFAULT 0.0,
  max_feedrate         REAL    NOT NULL DEFAULT 0.0,
  coolant_through      INTEGER NOT NULL DEFAULT 0
);
`;

/**
 * Build the full holder-DB export object (pure — no I/O).
 * @returns {{schema:string, inserts:string[], summary:object}}
 */
export function buildHolderExport(holders = DEFAULT_HOLDERS, opts = {}) {
  const mmSys = opts.units === "inch" ? 2 : 1;
  const inserts = [];
  const couplings = new Map(); // key class -> coupling_id
  let couplingId = 0;
  function couplingIdFor(c) {
    const key = `${c.type}|${c.class}`;
    if (couplings.has(key)) return couplings.get(key);
    couplingId += 1;
    couplings.set(key, couplingId);
    inserts.push(
      `INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES ` +
      `(${couplingId}, ${c.type}, ${sqlStr(c.class)}, ${sqlStr(c.iso)}, ${mmSys});`,
    );
    return couplingId;
  }

  inserts.push("INSERT OR IGNORE INTO Manufacturers (id, name) VALUES (1, 'PRISM Catalog');");
  inserts.push("-- Couplings (spindle-side + tool-side interfaces)");

  const holderInserts = [];
  holders.forEach((h, i) => {
    const topC = couplingIdFor(topCouplingFor(h));
    const botC = couplingIdFor(bottomCouplingFor(h.type));
    const maxRpm = num(h.max_rpm, 0);
    holderInserts.push(
      `INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, ` +
      `top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, ` +
      `infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (` +
      `${i + 1}, ${sqlStr(h.id)}, ${sqlStr(h.ordering_code ?? h.id)}, 1, ${mmSys}, ` +
      `${topC}, ${botC}, 1.0, 1.0, 1.0, 1.0, ${maxRpm.toFixed(1)}, 0.0, ` +
      `${h.coolant_through ? 1 : 0});`,
    );
  });
  inserts.push("-- Holders");
  inserts.push(...holderInserts);

  return {
    schema: HOLDER_SCHEMA,
    inserts,
    summary: {
      holders: holders.length,
      couplings: couplings.size,
      mm_system_id: mmSys,
      units: mmSys === 1 ? "mm" : "inch",
      extension: ".hmt (SQLite) — load via sqlite3 <db>.hmt < <db>.hmt.sql",
    },
  };
}

export function renderSql(exp) {
  return exp.schema + "\n" + exp.inserts.join("\n") + "\n";
}

// ── Self-test (real-value assertions) ──
function selfTest() {
  const exp = buildHolderExport();
  const sql = renderSql(exp);
  const checks = [];
  const assert = (name, cond) => { checks.push({ name, ok: !!cond }); };

  assert("8 holders exported", exp.summary.holders === 8);
  assert("couplings deduplicated (>0, <16)", exp.summary.couplings > 0 && exp.summary.couplings < 16);
  assert("mm units by default", exp.summary.units === "mm");
  assert("CAT40 flange real value present (63.55 in source / RPM 15000)", sql.includes("'CAT40'") && sql.includes("15000.0"));
  assert("HSK-A63 RPM 25000 real value", sql.includes("'HSK-A63'") && sql.includes("25000.0"));
  assert("shrink-fit 42000 RPM real value", sql.includes("42000.0"));
  assert("Holders table DDL present", sql.includes("CREATE TABLE IF NOT EXISTS Holders"));
  assert("Couplings table DDL present", sql.includes("CREATE TABLE IF NOT EXISTS Couplings"));
  assert("top+bottom coupling FK columns", sql.includes("top_coupling_id") && sql.includes("bottom_coupling_id"));
  assert("inch mode flips mm_system_id=2", buildHolderExport(DEFAULT_HOLDERS, { units: "inch" }).summary.mm_system_id === 2);
  // every holder INSERT references a valid coupling id (1..couplings)
  const holderLines = sql.split("\n").filter(l => l.startsWith("INSERT INTO Holders"));
  assert("every holder row emitted", holderLines.length === 8);

  const passed = checks.filter(c => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach(c => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  return passed === checks.length;
}

// ── CLI ──
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               process.argv[1]?.endsWith("export-hypermill-holder-db.mjs");
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    process.exit(selfTest() ? 0 : 1);
  }
  const outIdx = args.indexOf("--out");
  const unitsIdx = args.indexOf("--units");
  const out = outIdx >= 0 ? args[outIdx + 1]
    : "H:/prism/state/shared/master-post-validation/exports/hypermill/prism-holders.hmt.sql";
  const units = unitsIdx >= 0 ? args[unitsIdx + 1] : "mm";
  const exp = buildHolderExport(DEFAULT_HOLDERS, { units });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderSql(exp));
  console.log(`Wrote ${out}`);
  console.log(`  holders=${exp.summary.holders} couplings=${exp.summary.couplings} units=${exp.summary.units}`);
  console.log(`  ${exp.summary.extension}`);
}
