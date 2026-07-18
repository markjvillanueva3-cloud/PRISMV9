#!/usr/bin/env node
// enrich-catalog-cutting-data.mjs — Phase A of the cutting-parameter completeness program.
//
// Charlie's catalog-extractions skeletons (data/catalog-extractions/*.json) carry cutting_data:[]
// (empty by design). This enriches each tool with REAL per-ISO cutting recommendations
// cross-referenced from PRISM's existing trusted sources — imported from the BUILT dist (the data
// lives in .ts, compiled to dist/data/*.js):
//   • ALL_MANUFACTURER_SPEED_FEED (manufacturer-speed-feed-data) — {series, isoGroup, vc_min/max, fz_min/max}
//   • userProvenCuttingData (user-proven-cutting-data) — 1139 production-proven Fusion records
//     (rpm/feedRate/diameter → derived Vc/fz; presetStepdown/presetStepover → ap/ae)
//
// HONEST GRANULARITY (the operator's bar is "truly accurate"):
//   - SERIES match: tool.grade/name matches a known vendor series → that series' exact vc/fz (confidence 0.8)
//   - ISO-AGGREGATE fallback: typical vc/fz range for the tool's ISO group across all known series (confidence 0.5)
//   - ap/ae from production-proven data, aggregated by tool-type × ISO (confidence 0.4, clearly secondary)
//   Every cutting_data entry carries {source, matchType, confidence, caveat}. Tools with no ISO match
//   are loud-flagged (not silently skipped). Phase B (vendor PDFs) refines to per-grade precision.
//
// OUTPUT: a NEW tree data/catalog-extractions-enriched/ — SEPARATE, does NOT overwrite Charlie's
// originals; cross-referenced. + ENRICHMENT-REPORT.json + README.md.
//
// USAGE: node scripts/enrich-catalog-cutting-data.mjs            (dry-run — report only)
//        node scripts/enrich-catalog-cutting-data.mjs --apply    (write enriched tree)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const MCP = "H:/prism/mcp-server";
const DIST = path.join(MCP, "dist/data");
const IN_DIR = path.join(MCP, "data/catalog-extractions");
const OUT_DIR = path.join(MCP, "data/catalog-extractions-enriched");

const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"];

// ── load trusted sources from the built dist (the .ts data compiled to .js) ──────────────────────
async function loadSources() {
  const mf = await import(pathToFileURL(path.join(DIST, "manufacturer-speed-feed-data.js")).href);
  let proven = [];
  try {
    proven = (await import(pathToFileURL(path.join(DIST, "user-proven-cutting-data.js")).href)).userProvenCuttingData || [];
  } catch { /* optional */ }
  return {
    manufacturerSeries: mf.ALL_MANUFACTURER_SPEED_FEED || [],
    lookupSeriesSpeedFeed: typeof mf.lookupSeriesSpeedFeed === "function" ? mf.lookupSeriesSpeedFeed : null,
    proven,
  };
}

// ── per-ISO aggregate of manufacturer vc/fz (the fallback when no series match) ──────────────────
function buildIsoAggregate(series) {
  const agg = {};
  for (const g of ISO_GROUPS) agg[g] = { vc_min: Infinity, vc_max: -Infinity, fz_min: Infinity, fz_max: -Infinity, n: 0 };
  for (const r of series) {
    const g = r.isoGroup;
    if (!agg[g]) continue;
    if (Number.isFinite(r.vc_min)) agg[g].vc_min = Math.min(agg[g].vc_min, r.vc_min);
    if (Number.isFinite(r.vc_max)) agg[g].vc_max = Math.max(agg[g].vc_max, r.vc_max);
    if (Number.isFinite(r.fz_min)) agg[g].fz_min = Math.min(agg[g].fz_min, r.fz_min);
    if (Number.isFinite(r.fz_max)) agg[g].fz_max = Math.max(agg[g].fz_max, r.fz_max);
    agg[g].n++;
  }
  // drop ISO groups with no data; round
  const out = {};
  for (const g of ISO_GROUPS) {
    if (agg[g].n === 0) continue;
    out[g] = {
      vc_min_m_min: round(agg[g].vc_min), vc_max_m_min: round(agg[g].vc_max),
      fz_min_mm: round(agg[g].fz_min, 4), fz_max_mm: round(agg[g].fz_max, 4), seriesSampleSize: agg[g].n,
    };
  }
  return out;
}

// ── ap/ae (depth/width of cut) aggregate from production-proven data, by tool-type × ISO ──────────
// material is freetext in proven data → map to ISO; Vc derived from rpm+diameter+unit; ap=stepdown, ae=stepover.
const MAT_ISO = [
  [/inconel|hastelloy|waspaloy|rene|superalloy|nimonic/i, "S"], [/titanium|ti-?6|ti6/i, "S"],
  [/stainless|316|304|17-4|15-5|ss\b|duplex/i, "M"],
  [/alum|6061|7075|2024|5052|aluminium/i, "N"], [/brass|bronze|copper|cu\b/i, "N"],
  [/cast.?iron|gray.?iron|ductile|\bgg\b|\bgcc?\b/i, "K"],
  [/hardened|tool.?steel|d2|a2|h13|m2|hrc|>50|52100/i, "H"],
  [/steel|carbon|alloy.?steel|4140|4340|1018|1045|p20|mild/i, "P"],
];
function materialToIso(m) {
  if (!m) return null;
  for (const [re, g] of MAT_ISO) if (re.test(m)) return g;
  return null;
}
function buildDocAggregate(proven) {
  // key: toolType|iso -> {ap:[..], ae:[..]}
  const acc = {};
  for (const r of proven) {
    const iso = materialToIso(r.material);
    if (!iso || !r.toolType) continue;
    const ap = num(r.presetStepdown); const ae = num(r.presetStepover);
    if (!(ap > 0) && !(ae > 0)) continue;
    const key = `${r.toolType}|${iso}`;
    (acc[key] ||= { ap: [], ae: [] });
    if (ap > 0) acc[key].ap.push(ap);
    if (ae > 0) acc[key].ae.push(ae);
  }
  const out = {};
  for (const [key, v] of Object.entries(acc)) {
    out[key] = {
      ap_min_mm: v.ap.length ? round(Math.min(...v.ap), 3) : null,
      ap_max_mm: v.ap.length ? round(Math.max(...v.ap), 3) : null,
      ae_min_mm: v.ae.length ? round(Math.min(...v.ae), 3) : null,
      ae_max_mm: v.ae.length ? round(Math.max(...v.ae), 3) : null,
      sampleSize: Math.max(v.ap.length, v.ae.length),
    };
  }
  return out;
}

// map a catalog tool.type to the proven-data toolType vocabulary (for ap/ae lookup)
function toolTypeKey(t) {
  if (!t) return null;
  if (/endmill|end_mill/i.test(t)) return "flat_end_mill";
  if (/drill/i.test(t)) return "drill";
  if (/milling_insert|face/i.test(t)) return "face_mill";
  return null; // turning/threading inserts: ap/ae from proven-mill data not applicable
}

const round = (x, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : NaN);

// Derive the ISO groups a tool serves. Priority: explicit material_groups (vendor-stated ISO letters)
// → else infer from application_scenarios descriptions (the catalog's own stated material intent, e.g.
// "Geometry: aluminum" → N). Never fabricates beyond what the catalog states.
function deriveIso(tool) {
  const explicit = Array.isArray(tool.material_groups) ? tool.material_groups.filter((g) => ISO_GROUPS.includes(g)) : [];
  if (explicit.length) return { iso: explicit, isoSource: "material_groups" };
  const set = new Set();
  for (const s of tool.application_scenarios || []) {
    const g = materialToIso(s?.description || "");
    if (g) set.add(g);
  }
  return set.size ? { iso: [...set], isoSource: "application-scenario" } : { iso: [], isoSource: null };
}

// ── enrich one tool record ───────────────────────────────────────────────────────────────────────
function enrichTool(tool, ctx) {
  const { iso: isoList, isoSource } = deriveIso(tool);
  if (!isoList.length) return { cutting_data: [], unmatched: true, reason: "no-iso-group" };
  // inferred-from-scenario ISO is less certain than vendor-stated → scale confidence down a notch
  const isoConfFactor = isoSource === "application-scenario" ? 0.85 : 1;

  // try a series match on grade or name
  let seriesHit = null;
  if (ctx.lookupSeriesSpeedFeed) {
    for (const key of [tool.grade, tool.name].filter((s) => s && s !== "unknown")) {
      try {
        const hit = ctx.lookupSeriesSpeedFeed(key);
        if (hit && Number.isFinite(hit.vc_min)) { seriesHit = { ...hit, matchedOn: key }; break; }
      } catch { /* helper may throw on miss */ }
    }
  }

  const cutting_data = [];
  for (const iso of isoList) {
    const docKey = toolTypeKey(tool.type) ? `${toolTypeKey(tool.type)}|${iso}` : null;
    const doc = docKey ? ctx.docAgg[docKey] : null;
    if (seriesHit && seriesHit.isoGroup === iso) {
      cutting_data.push({
        iso_group: iso,
        vc_min_m_min: round(seriesHit.vc_min), vc_max_m_min: round(seriesHit.vc_max),
        fz_min_mm: round(seriesHit.fz_min, 4), fz_max_mm: round(seriesHit.fz_max, 4),
        ap_min_mm: doc?.ap_min_mm ?? null, ap_max_mm: doc?.ap_max_mm ?? null,
        ae_min_mm: doc?.ae_min_mm ?? null, ae_max_mm: doc?.ae_max_mm ?? null,
        source: "manufacturer-speed-feed-data", matchType: `series:${seriesHit.series}(${seriesHit.matchedOn})`,
        isoSource, confidence: round(0.8 * isoConfFactor, 2),
        caveat: "per-series vendor range; ap/ae from production-proven data if present. Verify vs vendor catalog (Phase B).",
      });
    } else {
      const a = ctx.isoAgg[iso];
      if (!a) { continue; }
      cutting_data.push({
        iso_group: iso,
        vc_min_m_min: a.vc_min_m_min, vc_max_m_min: a.vc_max_m_min,
        fz_min_mm: a.fz_min_mm, fz_max_mm: a.fz_max_mm,
        ap_min_mm: doc?.ap_min_mm ?? null, ap_max_mm: doc?.ap_max_mm ?? null,
        ae_min_mm: doc?.ae_min_mm ?? null, ae_max_mm: doc?.ae_max_mm ?? null,
        source: "iso-aggregate(manufacturer-speed-feed)", matchType: "iso-group-aggregate",
        isoSource, seriesSampleSize: a.seriesSampleSize, confidence: round(0.5 * isoConfFactor, 2),
        caveat: "typical range for ISO group across known vendor series; NOT grade-specific. Phase B refines.",
      });
    }
  }
  return { cutting_data, unmatched: cutting_data.length === 0, reason: cutting_data.length === 0 ? "no-iso-aggregate" : null };
}

function main() {
  const APPLY = process.argv.includes("--apply");
  return loadSources().then((src) => {
    const ctx = {
      lookupSeriesSpeedFeed: src.lookupSeriesSpeedFeed,
      isoAgg: buildIsoAggregate(src.manufacturerSeries),
      docAgg: buildDocAggregate(src.proven),
    };

    const files = fs.existsSync(IN_DIR) ? fs.readdirSync(IN_DIR).filter((f) => f.endsWith(".json")) : [];
    const report = {
      schemaVersion: "1.0.0", generatedFromSession: "claude-a6304a93/juliett", phase: "A",
      mode: APPLY ? "apply" : "dry-run", generatedBy: "scripts/enrich-catalog-cutting-data.mjs",
      sources: { manufacturerSeries: src.manufacturerSeries.length, provenRecords: src.proven.length },
      isoAggregate: ctx.isoAgg, vendors: {}, totals: { tools: 0, enriched: 0, seriesMatched: 0, unmatched: 0, cuttingDataEntries: 0 },
      note: "Per-ISO cutting recommendations attached to charlie's catalog skeletons from existing trusted sources. SEPARATE tree; charlie's originals untouched. Honest granularity (series/ISO-aggregate) + confidence + caveat. Phase B (vendor PDFs) refines to per-grade.",
    };
    const enrichedByVendor = {};

    for (const f of files) {
      let cat;
      try { cat = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), "utf8")); } catch (e) { report.vendors[f] = { error: "parse:" + e.message.slice(0, 80) }; continue; }
      const tools = cat.raw_tools || cat.tools || [];
      const vstat = { file: f, tools: tools.length, enriched: 0, seriesMatched: 0, unmatched: 0, cuttingDataEntries: 0 };
      const outTools = [];
      for (const t of tools) {
        const e = enrichTool(t, ctx);
        const isSeries = e.cutting_data.some((c) => c.matchType?.startsWith("series:"));
        if (e.cutting_data.length) { vstat.enriched++; vstat.cuttingDataEntries += e.cutting_data.length; }
        if (isSeries) vstat.seriesMatched++;
        if (e.unmatched) vstat.unmatched++;
        outTools.push({ ...t, cutting_data: e.cutting_data, _enrichment: { unmatched: e.unmatched, reason: e.reason } });
      }
      enrichedByVendor[f] = { ...cat, _enrichedBy: report.generatedBy, _enrichedAt: report.generatedFromSession, raw_tools: outTools };
      report.vendors[f] = vstat;
      report.totals.tools += vstat.tools; report.totals.enriched += vstat.enriched;
      report.totals.seriesMatched += vstat.seriesMatched; report.totals.unmatched += vstat.unmatched;
      report.totals.cuttingDataEntries += vstat.cuttingDataEntries;
    }

    // print summary
    console.log(`\n=== enrich-catalog-cutting-data (${report.mode}) ===`);
    console.log(`sources: ${report.sources.manufacturerSeries} manufacturer series, ${report.sources.provenRecords} proven records`);
    console.log(`ISO aggregate (vc m/min): ` + ISO_GROUPS.filter((g) => ctx.isoAgg[g]).map((g) => `${g}:${ctx.isoAgg[g].vc_min_m_min}-${ctx.isoAgg[g].vc_max_m_min}`).join("  "));
    console.log(`tools: ${report.totals.tools}  enriched: ${report.totals.enriched}  series-matched: ${report.totals.seriesMatched}  unmatched: ${report.totals.unmatched}  cutting_data entries: ${report.totals.cuttingDataEntries}`);
    for (const [f, v] of Object.entries(report.vendors)) console.log(`  ${f.replace("-monolith-extracted.json", "").padEnd(12)} tools ${String(v.tools).padStart(3)}  enriched ${String(v.enriched).padStart(3)}  series ${String(v.seriesMatched).padStart(3)}  unmatched ${String(v.unmatched).padStart(3)}`);

    if (APPLY) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      for (const f of fs.readdirSync(OUT_DIR)) if (/\.(json|md)$/i.test(f)) fs.rmSync(path.join(OUT_DIR, f), { force: true });
      for (const [f, data] of Object.entries(enrichedByVendor)) {
        const out = f.replace(".json", "-enriched.json");
        const tmp = path.join(OUT_DIR, `${out}.${process.pid}.tmp`);
        fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
        fs.renameSync(tmp, path.join(OUT_DIR, out));
      }
      fs.writeFileSync(path.join(OUT_DIR, "ENRICHMENT-REPORT.json"), JSON.stringify(report, null, 2));
      fs.writeFileSync(path.join(OUT_DIR, "README.md"),
        "# Catalog cutting-data enrichment (Phase A)\n\n" +
        `Enriches Charlie's \`../catalog-extractions/\` tool skeletons (which ship \`cutting_data:[]\`) with REAL per-ISO ` +
        `cutting recommendations cross-referenced from \`manufacturer-speed-feed-data\` (${report.sources.manufacturerSeries} vendor series) ` +
        `+ \`user-proven-cutting-data\` (${report.sources.provenRecords} production records), via the built dist.\n\n` +
        `**This is a SEPARATE tree — Charlie's originals are untouched.** Each \`cutting_data\` entry carries \`source\`, \`matchType\` ` +
        `(series-match = confidence 0.8, ISO-aggregate fallback = 0.5), and a \`caveat\`. Tools with no ISO group are loud-flagged ` +
        `(\`_enrichment.unmatched\`). **Granularity is per-ISO, NOT per-grade** — Phase B (vendor PDF parsing) refines to grade precision.\n\n` +
        `Totals: ${report.totals.tools} tools, ${report.totals.enriched} enriched (${report.totals.seriesMatched} series-matched), ` +
        `${report.totals.unmatched} unmatched, ${report.totals.cuttingDataEntries} cutting_data entries. See ENRICHMENT-REPORT.json.\n\n` +
        "Regenerate: `node scripts/enrich-catalog-cutting-data.mjs --apply` (requires `cd mcp-server && npm run build` first so dist/data is current).\n");
      console.log(`\nwrote ${Object.keys(enrichedByVendor).length} enriched catalogs + ENRICHMENT-REPORT.json + README.md -> ${path.relative("H:/prism", OUT_DIR).replace(/\\/g, "/")}`);
    } else {
      console.log(`\n(dry-run — re-run with --apply to write ${Object.keys(enrichedByVendor).length} enriched catalogs to ${path.relative("H:/prism", OUT_DIR).replace(/\\/g, "/")})`);
    }
    return report;
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error("FATAL:", e?.stack || e); process.exitCode = 1; });
}

export { buildIsoAggregate, buildDocAggregate, materialToIso, toolTypeKey, enrichTool };
