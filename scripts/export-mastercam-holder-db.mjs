#!/usr/bin/env node
/**
 * export-mastercam-holder-db.mjs — Mastercam Tool-Holder Library Exporter
 *
 * GAP-FILL (master-post-validation, 2026-05-31): PRISM had a tool exporter
 * (MastercamToolExportEngine / mastercam_tool_export) that embeds holder geometry
 * INSIDE each tool, but NO standalone holder-library exporter. Mastercam keeps
 * holders in a SEPARATE library (Tool Manager → Holders tab) so an operator can
 * assign any holder to any tool. This script emits that standalone holder library.
 *
 * SOURCE DATA (no engine edits — reads canonical definitions only):
 *   - McamHolderType taper standards   ← MastercamToolExportEngine.ts (the 18 enum values)
 *   - per-taper body/gauge geometry    ← STANDARD_HOLDERS below (DIN 69871 / BT / HSK / Capto book values)
 *   - JM mill-fleet taper assignment   ← ground-truth: VMC-01 Hurco=CAT40-class, VMC-02 Okuma 5AX=HSK-A63, etc.
 *
 * OUTPUT (uploadable contract — same as the verified tool exporter):
 *   <out>/PRISM_HOLDERS.mcam-holders   — JSON holder library (Mastercam Tool Manager import target)
 *   <out>/PRISM_HOLDERS.csv            — flat CSV (Mastercam CSV holder import / spreadsheet review)
 *
 * UNITS: mm-native (Mastercam metric library). All geometry is millimeters.
 *        --inch flag emits an additional inch-converted CSV for INCH-configured seats (JM is G20).
 *
 * HONEST FORMAT NOTE: a true binary Mastercam holder library is .tooldb (SQLite).
 *   This emits the documented JSON + CSV interchange that Mastercam's Tool Manager
 *   "Import" accepts for holders; the .tooldb binary requires Mastercam's own writer.
 *   The CSV is the genuinely round-trippable surface.
 *
 * PURE: no network, no engine import, deterministic given --frozen-time.
 *   Run: node scripts/export-mastercam-holder-db.mjs [--out <dir>] [--inch] [--frozen-time <iso>]
 *   Test: node scripts/export-mastercam-holder-db.test.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MM_PER_INCH = 25.4;

/**
 * Standard holder geometry per Mastercam taper standard.
 * body_diameter_mm = nominal flange/body OD; gauge_length_mm = spindle-face → gauge line;
 * pull_stud / taper per the interface standard. Book values (DIN 69871, JIS B6339 (BT),
 * ISO 12164 (HSK), ISO 26623 (Capto)). These are the 18 McamHolderType enum values.
 */
export const STANDARD_HOLDERS = [
  { type: "BT30",          taper: "7/24",      body_diameter_mm: 46,   gauge_length_mm: 48.4,  default_projection_mm: 60,  description: "BT30 7:24 steep taper (JIS B6339)" },
  { type: "BT40",          taper: "7/24",      body_diameter_mm: 63,   gauge_length_mm: 65.4,  default_projection_mm: 90,  description: "BT40 7:24 steep taper (JIS B6339)" },
  { type: "BT50",          taper: "7/24",      body_diameter_mm: 100,  gauge_length_mm: 101.8, default_projection_mm: 130, description: "BT50 7:24 steep taper (JIS B6339)" },
  { type: "CAT40",         taper: "7/24",      body_diameter_mm: 63,   gauge_length_mm: 65.4,  default_projection_mm: 90,  description: "CAT40 / ANSI V-flange 7:24 (DIN 69871 equiv)" },
  { type: "CAT50",         taper: "7/24",      body_diameter_mm: 100,  gauge_length_mm: 101.8, default_projection_mm: 130, description: "CAT50 / ANSI V-flange 7:24" },
  { type: "HSK-A63",       taper: "hollow",    body_diameter_mm: 63,   gauge_length_mm: 50,    default_projection_mm: 80,  description: "HSK-A63 hollow-taper face-contact (ISO 12164)" },
  { type: "HSK-A100",      taper: "hollow",    body_diameter_mm: 100,  gauge_length_mm: 80,    default_projection_mm: 110, description: "HSK-A100 hollow-taper face-contact (ISO 12164)" },
  { type: "HSK-E32",       taper: "hollow",    body_diameter_mm: 32,   gauge_length_mm: 30,    default_projection_mm: 50,  description: "HSK-E32 symmetric HSC hollow-taper (ISO 12164)" },
  { type: "Capto-C4",      taper: "polygon",   body_diameter_mm: 48,   gauge_length_mm: 60,    default_projection_mm: 70,  description: "Coromant Capto C4 polygon taper (ISO 26623)" },
  { type: "Capto-C5",      taper: "polygon",   body_diameter_mm: 63,   gauge_length_mm: 75,    default_projection_mm: 85,  description: "Coromant Capto C5 polygon taper (ISO 26623)" },
  { type: "Capto-C6",      taper: "polygon",   body_diameter_mm: 80,   gauge_length_mm: 95,    default_projection_mm: 105, description: "Coromant Capto C6 polygon taper (ISO 26623)" },
  { type: "KM40",          taper: "km",        body_diameter_mm: 40,   gauge_length_mm: 55,    default_projection_mm: 65,  description: "Kennametal KM40 quick-change" },
  { type: "KM50",          taper: "km",        body_diameter_mm: 50,   gauge_length_mm: 70,    default_projection_mm: 80,  description: "Kennametal KM50 quick-change" },
  { type: "shrink_fit",    taper: "n/a",       body_diameter_mm: 32,   gauge_length_mm: 50,    default_projection_mm: 70,  description: "Shrink-fit chuck (thermal); slim nose for HSC" },
  { type: "collet_ER",     taper: "n/a",       body_diameter_mm: 40,   gauge_length_mm: 60,    default_projection_mm: 75,  description: "ER collet chuck (ER32/ER40 class)" },
  { type: "hydraulic",     taper: "n/a",       body_diameter_mm: 42,   gauge_length_mm: 65,    default_projection_mm: 80,  description: "Hydraulic expansion chuck; high runout control" },
  { type: "milling_chuck", taper: "n/a",       body_diameter_mm: 52,   gauge_length_mm: 70,    default_projection_mm: 90,  description: "Milling chuck (needle-bearing); heavy roughing" },
  { type: "straight_shank",taper: "n/a",       body_diameter_mm: 25,   gauge_length_mm: 40,    default_projection_mm: 55,  description: "Straight-shank / Weldon side-lock" },
];

/**
 * JM Die mill fleet → taper interface. Ground-truth machine roster
 * (VMC-01..05). Each machine pulls the matching subset of STANDARD_HOLDERS
 * so the operator can upload a per-machine holder library.
 */
export const JM_FLEET_TAPERS = {
  "VMC-01": { name: "Hurco VM30i",        tapers: ["CAT40", "BT40", "collet_ER", "shrink_fit"] },
  "VMC-02": { name: "Okuma M460V-5AX",    tapers: ["HSK-A63", "shrink_fit", "hydraulic", "collet_ER"] },
  "VMC-03": { name: "Haas VF-2",          tapers: ["CAT40", "collet_ER", "milling_chuck"] },
  "VMC-04": { name: "Haas OM-2",          tapers: ["CAT40", "collet_ER", "shrink_fit"] },
  "VMC-05": { name: "Roku-Roku HC 658-II",tapers: ["HSK-E32", "shrink_fit", "collet_ER"] },
};

/** Build the full holder-library object (pure). */
export function buildHolderLibrary({ now = new Date().toISOString(), fleet = false } = {}) {
  const holders = STANDARD_HOLDERS.map((h, i) => ({
    holder_number: i + 1,
    id: `PRISM-HOLDER-${h.type.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`,
    type: h.type,
    taper_interface: h.taper,
    description: h.description,
    body_diameter_mm: h.body_diameter_mm,
    gauge_length_mm: h.gauge_length_mm,
    projection_mm: h.default_projection_mm,
    units: "mm",
  }));

  const lib = {
    format: "mcam-holders",
    library_name: "PRISM_HOLDERS",
    file_name: "PRISM_HOLDERS.mcam-holders",
    holders,
    metadata: {
      generated_by: "PRISM export-mastercam-holder-db.mjs (GAP-FILL master-post-validation)",
      generated_at: now,
      holder_count: holders.length,
      source: "MastercamToolExportEngine McamHolderType enum + DIN69871/BT/HSK/Capto book geometry",
      units: "mm",
      version: "2025.1",
    },
  };
  if (fleet) {
    lib.fleet_assignments = Object.entries(JM_FLEET_TAPERS).map(([id, m]) => ({
      machine_id: id,
      machine_name: m.name,
      holder_types: m.tapers,
      holder_count: m.tapers.length,
    }));
  }
  return lib;
}

/** CSV serializer (Mastercam Tool-Manager holder CSV import surface). */
export function holderLibraryToCSV(lib, { inch = false } = {}) {
  const f = inch ? 4 : 3;
  const conv = (mm) => inch ? +(mm / MM_PER_INCH).toFixed(f) : mm;
  const unit = inch ? "in" : "mm";
  const header = [
    "holder_number", "id", "type", "taper_interface", "description",
    `body_diameter_${unit}`, `gauge_length_${unit}`, `projection_${unit}`,
  ].join(",");
  const rows = lib.holders.map((h) =>
    [
      h.holder_number,
      h.id,
      h.type,
      h.taper_interface,
      `"${h.description.replace(/"/g, '""')}"`,
      conv(h.body_diameter_mm),
      conv(h.gauge_length_mm),
      conv(h.projection_mm),
    ].join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

// ─── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { out: "H:/prism/state/shared/master-post-validation/exports/mastercam", inch: false, fleet: true, now: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") a.out = argv[++i];
    else if (argv[i] === "--inch") a.inch = true;
    else if (argv[i] === "--no-fleet") a.fleet = false;
    else if (argv[i] === "--frozen-time") a.now = argv[++i];
  }
  if (!a.now && process.env.PRISM_AUDIT_FROZEN_TIME) a.now = process.env.PRISM_AUDIT_FROZEN_TIME;
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const lib = buildHolderLibrary({ now: args.now ?? new Date().toISOString(), fleet: args.fleet });

  const jsonPath = resolve(outDir, lib.file_name);
  writeFileSync(jsonPath, JSON.stringify(lib, null, 2));

  const csvPath = resolve(outDir, "PRISM_HOLDERS.csv");
  writeFileSync(csvPath, holderLibraryToCSV(lib, { inch: false }));

  const out = { json: jsonPath, csv: csvPath, holder_count: lib.holders.length };
  if (args.inch) {
    const inchPath = resolve(outDir, "PRISM_HOLDERS.inch.csv");
    writeFileSync(inchPath, holderLibraryToCSV(lib, { inch: true }));
    out.inch_csv = inchPath;
  }
  console.log(JSON.stringify(out, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  main();
}
