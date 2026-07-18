#!/usr/bin/env node
/**
 * holders-to-fusion-import.mjs (slot:romeo, 2026-06-22)
 *
 * Convert the 643 PRISM tool-holder catalog entries (HAIMER / GUHRING /
 * BIG DAISHOWA, organized by type->brand in state/shared/holder-libraries/)
 * into Fusion 360 holder library entries and import them into the LIVE Fusion
 * session via the drive server's POST /tool-import endpoint.
 *
 * Holder JSON shape is the PROVEN one extracted from a live JM crib tool
 * (PRISM_JM_VMC-01: REGO-FIX CAPTO holder): a `holder` object carrying
 * {description, product-id, vendor, segments:[{upper-diameter, lower-diameter,
 * height}]} with all lengths in INCHES (JM is an inch shop). Catalog dims are
 * mm -> divided by 25.4. The segment profile is a CONSERVATIVE 2-segment
 * envelope (nose + body) derived from the catalog's bore/body/gauge/overall
 * columns -- the catalogs do not carry full step geometry, so this is an
 * approximate collision envelope (documented, not fabricated-precise).
 *
 * Modes:
 *   --probe         POST exactly ONE holder, print the server result (verify
 *                   createFromJson accepts the entry shape BEFORE bulk).
 *   --all           POST every holder, grouped into per-type libraries, batched.
 *   --dry           Emit the JSON to stdout, POST nothing.
 *   --port <n>      Drive-server port (default 18361).
 *   --wrap tool|holder   Entry wrapper to test (default holder). See buildEntry.
 *
 * Verify-before-bulk: run --probe first; only --all after imported==1 confirmed.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "H:/prism/state/shared/holder-libraries";
const ROLLUP = join(OUT_DIR, "holder-database.json");
const MM_PER_IN = 25.4;

const args = process.argv.slice(2);
const MODE = args.includes("--all") ? "all" : args.includes("--probe") ? "probe" : "dry";
const PORT = (() => { const i = args.indexOf("--port"); return i >= 0 ? Number(args[i + 1]) : 18361; })();
const WRAP = (() => { const i = args.indexOf("--wrap"); return i >= 0 ? args[i + 1] : "holder"; })();

function mm2in(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / MM_PER_IN) * 1e6) / 1e6;
}

/** Parse one CSV (header + rows) into array of record objects. */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const rec = {};
    headers.forEach((h, i) => { rec[h.trim()] = (cells[i] ?? "").trim(); });
    return rec;
  });
}

/**
 * Reconstruct a clean designation. The HAIMER catalog source
 * (haimer-holder-catalog.ts) carries 428/489 MANGLED designation strings
 * (e.g. ".12.4", ".11.71)") while the DIMENSIONS are valid -- so we rebuild a
 * canonical name `BRAND-TAPER-TYPE-BORE` mirroring the clean rows' convention
 * (`HAIMER-CAT40-shrink_fit-3.0`). The true vendor order code is lost upstream
 * and needs a catalog re-extraction (flagged separately); this name is for a
 * usable, browsable Fusion library, not a claim of the real part number.
 */
function canonDesignation(rec) {
  const d = (rec.designation || "").trim();
  const good = /[A-Za-z]{2,}/.test(d) && !/^[.\-]/.test(d) && d.length >= 5;
  if (good) return d;
  const bore = Number(rec.bore_max_mm) || Number(rec.bore_min_mm) || 0;
  return [rec.brand, rec.taper, rec.type, bore ? bore.toFixed(1) : null]
    .filter(Boolean).join("-").replace(/\s+/g, "-");
}

/** Build a conservative inch segment envelope from catalog mm dims (tip -> up). */
function buildSegments(rec) {
  const bore = mm2in(rec.bore_max_mm) ?? mm2in(rec.bore_min_mm); // nose bore (in)
  // Body OD: published value, else a conservative collar ~1.8x the bore, else 1in.
  const body = mm2in(rec.body_dia_mm) ?? (bore ? Math.round(bore * 1.8 * 1e6) / 1e6 : 1.0);
  const overall = mm2in(rec.overall_mm) ?? Math.max(body * 1.5, 1.0);
  const gauge = mm2in(rec.gauge_mm) ?? overall * 0.5;
  // Nose collar: a touch larger than the bore so the tool clears; fall back to
  // 60% of body when no bore is published.
  const noseDia = bore ? Math.min(body, bore + 0.2) : body * 0.6;
  const noseH = Math.max(Math.min(gauge * 0.4, overall * 0.3), 0.05);
  const bodyH = Math.max(overall - noseH, 0.1);
  return [
    { "upper-diameter": noseDia, "lower-diameter": noseDia, height: Math.round(noseH * 1e6) / 1e6 },
    { "upper-diameter": body, "lower-diameter": body, height: Math.round(bodyH * 1e6) / 1e6 },
  ];
}

/** Build a Fusion import entry for one holder. `wrap` selects the candidate shape. */
function buildEntry(rec, wrap) {
  const name = canonDesignation(rec);
  const holder = {
    description: name,
    "product-id": name,
    vendor: rec.brand || "",
    segments: buildSegments(rec),
  };
  if (wrap === "tool") {
    // Holder carried on a minimal blank tool (the proven holders-on-tools shape).
    return {
      BMC: 1,
      description: holder.description,
      "product-id": holder["product-id"],
      type: "holder",
      unit: "inches",
      vendor: holder.vendor,
      geometry: {},
      holder,
    };
  }
  // Standalone holder entry (to be validated empirically by --probe).
  return {
    description: holder.description,
    "product-id": holder["product-id"],
    type: "holder",
    unit: "inches",
    vendor: holder.vendor,
    "holder-type": rec.type,
    taper: rec.taper,
    holder,
  };
}

async function postImport(port, libraryName, tools) {
  const body = JSON.stringify({ library_name: libraryName, tools });
  const res = await fetch(`http://127.0.0.1:${port}/tool-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return res.json();
}

function loadAllHolders() {
  if (!existsSync(ROLLUP)) throw new Error(`missing ${ROLLUP}`);
  const rollup = JSON.parse(readFileSync(ROLLUP, "utf8"));
  const out = [];
  for (const leaf of rollup.leaves || []) {
    const p = join(OUT_DIR, leaf.path);
    if (!existsSync(p)) { console.error(`WARN missing leaf ${p}`); continue; }
    for (const rec of parseCsv(readFileSync(p, "utf8"))) out.push(rec);
  }
  return out;
}

async function main() {
  const holders = loadAllHolders();
  console.error(`loaded ${holders.length} holders from ${ROLLUP}`);

  if (MODE === "probe") {
    const rec = holders[0];
    const entry = buildEntry(rec, WRAP);
    console.error(`PROBE wrap=${WRAP} holder=${entry.description}`);
    const r = await postImport(PORT, "PRISM_HOLDERS_PROBE", [entry]);
    console.log(JSON.stringify(r, null, 2));
    console.error(r.imported === 1 ? "PROBE OK -- format accepted" : "PROBE FAILED -- adjust wrapper/shape");
    return;
  }

  if (MODE === "dry") {
    const sample = buildEntry(holders[0], WRAP);
    console.log(JSON.stringify({ count: holders.length, sample }, null, 2));
    return;
  }

  // --all: group by holder type, one library per type (brand kept as a field).
  const byType = {};
  for (const rec of holders) {
    const t = (rec.type || "misc").toUpperCase();
    (byType[t] ||= []).push(buildEntry(rec, WRAP));
  }
  let grand = 0;
  for (const [type, entries] of Object.entries(byType)) {
    const lib = `PRISM_HOLDERS_${type}`;
    // Batch <=1000/request per the server cap.
    for (let i = 0; i < entries.length; i += 1000) {
      const batch = entries.slice(i, i + 1000);
      const r = await postImport(PORT, lib, batch);
      console.log(`${lib} [${i}-${i + batch.length}]: imported=${r.imported}/${r.total} method=${r.method} ${r.error || ""}`);
      grand += r.imported || 0;
    }
  }
  console.error(`TOTAL imported across types: ${grand}`);
}

main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
