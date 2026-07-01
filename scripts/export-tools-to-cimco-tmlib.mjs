#!/usr/bin/env node
/**
 * export-tools-to-cimco-tmlib.mjs — fill CIMCO Edit 2026's Tool Library database
 * from PRISM's tool corpus.
 *
 * CIMCO-TOOLDB-FILL-MS0 / U-CTF-EXPORT (slot:romeo, 2026-06-02).
 * Reads a PRISM tool source (default: prism-reference-db/tools.json →
 * stores.EXTRACTED_DETAILED_TOOLS, 720 real tools), converts to canonical mm,
 * classifies + emits CIMCO .tmlib XML grouped by cutter type, and writes the
 * libraries to mcp-server/data/cimco-export/toollibs/ (NEVER to C:).
 *
 * UNITS-FIRST (hard safety rail — a misread is a 25.4× scale error):
 *   EXTRACTED_DETAILED_TOOLS is INCH-native (verified: "0.015\" 2FL Square EM",
 *   diameter 0.015, loc 0.023, oal 1.5, shank 0.125 — inch). Every source store's
 *   native unit must be VERIFIED here (STORE_NATIVE_UNITS) or passed via --native;
 *   an unverified store is REFUSED, never guessed. A per-record marker check +
 *   post-conversion magnitude sanity (0.05–200 mm) catch mislabelled records.
 *
 * Pipeline: source → toCanonicalMm (×25.4 if inch) → cimco-tmlib lib → .tmlib files.
 *
 * Usage:
 *   node scripts/export-tools-to-cimco-tmlib.mjs [--source <json>] [--store <key>]
 *        [--native inch|mm] [--units imperial|metric] [--out <dir>] [--dry-run] [--json]
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  MM_PER_INCH,
  classifyCutterType,
  toolsToLibraryXml,
  parseLibraryXml,
} from "./lib/cimco-tmlib.mjs";

// Native linear units per PRISM source store — VERIFIED by reading real samples.
// Add a store here ONLY after confirming its native unit from real bytes.
const STORE_NATIVE_UNITS = {
  EXTRACTED_DETAILED_TOOLS: "inch",
};

const FILE_LABEL_BY_TYPE = {
  EndMill: "Mills",
  CommonDrill: "Drills",
  SpotDrill: "Spot Drills",
  Countersink: "Counter Sinks",
  TapRightHand: "Taps",
};

// ── arg parsing ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf("--" + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const SRC = String(flag("source", "H:/prism/mcp-server/data/prism-reference-db/tools.json"));
const STORE = String(flag("store", "EXTRACTED_DETAILED_TOOLS"));
const OUTDIR = String(flag("out", "H:/prism/mcp-server/data/cimco-export/toollibs"));
const OUT_UNITS = String(flag("units", "imperial")).toLowerCase() === "metric" ? "Metric" : "Imperial";
const NATIVE_OVERRIDE = flag("native", null);
const DRY = args.includes("--dry-run");
const JSON_OUT = args.includes("--json");

function fail(msg) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: msg }));
  else console.error("ERROR: " + msg);
  process.exit(1);
}

// ── resolve native units (units-first: verified or explicit, never guessed) ────
const native = String(NATIVE_OVERRIDE || STORE_NATIVE_UNITS[STORE] || "").toLowerCase();
if (native !== "inch" && native !== "mm") {
  fail(
    `native units for store "${STORE}" are not verified. Pass --native inch|mm after confirming the store's real units (a wrong choice is a 25.4× scale error).`
  );
}

// ── load source + locate the tool array ───────────────────────────────────────
let doc;
try {
  doc = JSON.parse(fs.readFileSync(SRC, "utf8"));
} catch (e) {
  fail(`cannot read/parse source ${SRC}: ${e.message}`);
}
let store = doc && doc.stores ? doc.stores[STORE] : doc[STORE];
if (store && !Array.isArray(store) && Array.isArray(store.tools)) store = store.tools;
if (!Array.isArray(store)) fail(`store "${STORE}" is not an array of tools in ${SRC}`);

// ── canonicalize one record to mm geometry (or null if unusable/suspicious) ────
const num = (...vals) => {
  for (const v of vals) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
};

/** Per-record unit: explicit marker beats store default (mislabel defence). */
function recordNative(rec, storeDefault) {
  const name = String(rec.name || rec.description || "");
  if (/\d\s*mm\b/i.test(name) || /\bmetric\b/i.test(name)) return "mm";
  if (/\d\/\d|["”]|\binch\b/i.test(name)) return "inch";
  return storeDefault;
}

function toCanonicalMm(rec, storeDefault) {
  const dia = num(rec.diameter, rec.cutting_diameter, rec.dia, rec.cutting_diameter_mm, rec.geometry && rec.geometry.diameter);
  if (!(typeof dia === "number" && dia > 0)) return { skip: "no-diameter" };
  const unit = recordNative(rec, storeDefault);
  const k = unit === "inch" ? MM_PER_INCH : 1;
  const dia_mm = dia * k;
  // magnitude sanity: real cutting-tool diameters live in 0.05–200 mm. Outside →
  // almost certainly a unit/scale mislabel — skip rather than emit a bad envelope.
  if (dia_mm < 0.05 || dia_mm > 200) return { skip: "diameter-out-of-range" };

  const scale = (v) => (typeof v === "number" && Number.isFinite(v) ? v * k : undefined);
  return {
    tool: {
      type: rec.type || rec.category || rec.subcategory,
      name: rec.name || rec.description || rec.partNumber || rec.id || "TOOL",
      tpi: num(rec.tpi, rec.threads_per_inch),
      geometry: {
        diameter: dia_mm,
        flute_length: scale(num(rec.loc, rec.flute_length, rec.cutting_length)),
        overall_length: scale(num(rec.oal, rec.overall_length, rec.length)),
        shank_diameter: scale(num(rec.shank, rec.shank_diameter, rec.shankDiameter)),
        corner_radius: scale(num(rec.corner_radius, rec.cornerRadius)),
        point_angle: num(rec.point_angle, rec.tip_angle, rec.included_angle), // angle: not scaled
        flutes: num(rec.flutes, rec.flute_count),
      },
    },
  };
}

// ── classify + group ──────────────────────────────────────────────────────────
const byType = {};
const skips = { "no-diameter": 0, "diameter-out-of-range": 0, unclassified: 0 };
for (const rec of store) {
  if (!rec || typeof rec !== "object") {
    skips.unclassified++;
    continue;
  }
  const c = toCanonicalMm(rec, native);
  if (c.skip) {
    skips[c.skip] = (skips[c.skip] || 0) + 1;
    continue;
  }
  const cutterType = classifyCutterType(c.tool);
  if (!cutterType || !FILE_LABEL_BY_TYPE[cutterType]) {
    skips.unclassified++;
    continue;
  }
  (byType[cutterType] = byType[cutterType] || []).push(c.tool);
}

// ── emit one .tmlib per cutter type ───────────────────────────────────────────
const unitTag = OUT_UNITS === "Imperial" ? "Inch" : "MM";
const files = [];
let totalExported = 0;
for (const [type, tools] of Object.entries(byType)) {
  const { xml, count, byType: bt } = toolsToLibraryXml(tools, { unitSystem: OUT_UNITS, guidFn: randomUUID });
  const fname = `PRISM ${FILE_LABEL_BY_TYPE[type]} ${unitTag}.tmlib`;
  const fpath = path.join(OUTDIR, fname);
  // self-check: parse our own output back before trusting it
  const reparsed = parseLibraryXml(xml);
  if (reparsed.cutters.length !== count) fail(`round-trip mismatch for ${fname}: wrote ${count}, parsed ${reparsed.cutters.length}`);
  if (!DRY) {
    fs.mkdirSync(OUTDIR, { recursive: true });
    fs.writeFileSync(fpath, xml, "utf8");
  }
  files.push({ file: fname, type, count });
  totalExported += count;
  void bt;
}

// ── manifest ──────────────────────────────────────────────────────────────────
const manifest = {
  schemaVersion: "1.0.0",
  generator: "scripts/export-tools-to-cimco-tmlib.mjs",
  milestone: "CIMCO-TOOLDB-FILL-MS0 / U-CTF-EXPORT",
  source: SRC,
  store: STORE,
  nativeUnits: native,
  outputUnits: OUT_UNITS,
  totalRecords: store.length,
  exported: totalExported,
  skipped: skips,
  files,
  outDir: OUTDIR,
  dryRun: DRY,
  note: "Load via CIMCO Edit Tool Manager → import library. Imperial libs carry inch values; ItemUnitSystem marks each.",
};
if (!DRY) {
  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, "cimco-export-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
}

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: true, ...manifest }, null, 2));
} else {
  console.log(`CIMCO tool-library export ${DRY ? "(DRY RUN) " : ""}— ${STORE} [${native} → ${OUT_UNITS}]`);
  console.log(`  records: ${store.length}  exported: ${totalExported}  skipped: ${JSON.stringify(skips)}`);
  for (const f of files) console.log(`  ${f.file.padEnd(34)} ${f.count}`);
  console.log(`  out: ${OUTDIR}`);
}
