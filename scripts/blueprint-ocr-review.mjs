#!/usr/bin/env node
// scripts/blueprint-ocr-review.mjs
//
// U-PSGB-XRAY-REVIEW — morning-review digest for the overnight batch OCR run.
// Reads the outcome_record events the batch emitted (blueprint-accuracy-events.jsonl)
// + optional batch summary, and produces an actionable accuracy report: success
// rate, confidence distribution, per-print dims found, unit-resolution rate,
// datum-deficient GD&T, and the punch-lists (low-confidence / no-dims / unresolved-
// unit prints) an operator should eyeball. GPU-free; the consumer of the batch.
//
// USAGE: node scripts/blueprint-ocr-review.mjs [--events <f>] [--summary <f>] [--json] [--low-conf 0.70] [--samples 5]

import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_EVENTS = join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");
// The OCR per-field confidence floor below which a field needs operator-confirm
// (the verified shipped gate — see reference_xray_confidence_thresholds_reconciled).
export const DEFAULT_LOW_CONF = 0.70;

/** Pure: confidence band label for a 0..1 score. */
export function confidenceBand(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return "unknown";
  if (n >= 0.9) return "high(>=0.9)";
  if (n >= 0.7) return "ok(0.7-0.9)";
  if (n >= 0.5) return "low(0.5-0.7)";
  return "poor(<0.5)";
}

/**
 * Pure: aggregate OCR outcome_record events into a review digest.
 * @param {object[]} events  parsed JSONL objects (any shape; only outcome_records w/ extraction count)
 * @param {{lowConf?:number, samples?:number}} [opts]
 */
export function aggregateEvents(events, opts = {}) {
  const lowConf = Number.isFinite(opts.lowConf) ? opts.lowConf : DEFAULT_LOW_CONF;
  const sampleCap = Number.isFinite(opts.samples) ? opts.samples : 5;
  const bands = { "high(>=0.9)": 0, "ok(0.7-0.9)": 0, "low(0.5-0.7)": 0, "poor(<0.5)": 0, unknown: 0 };
  const out = {
    extraction_events: 0,
    prints_with_dims: 0,
    prints_no_dims: 0,
    total_dimensions: 0,
    total_gdt: 0,
    total_unit_resolved: 0,
    total_unit_dims: 0,
    datum_deficient_gdt: 0,
    confidence_bands: bands,
    low_confidence_prints: [],
    no_dims_prints: [],
    unresolved_unit_prints: [],
    samples: [],
  };
  for (const ev of Array.isArray(events) ? events : []) {
    const ex = ev && ev.payload && ev.payload.extraction;
    if (!ex || typeof ex !== "object") continue;
    out.extraction_events++;
    const conf = Number(ex.confidence);
    bands[confidenceBand(conf)]++;
    const dims = Array.isArray(ex.dimensions) ? ex.dimensions : [];
    const gdt = Array.isArray(ex.gdt) ? ex.gdt : [];
    out.total_dimensions += dims.length;
    out.total_gdt += gdt.length;
    out.datum_deficient_gdt += gdt.filter((g) => g && g.datum_deficient).length;
    const ur = ex.unit_resolution || {};
    out.total_unit_resolved += Number(ur.dimensions_unit_resolved) || 0;
    out.total_unit_dims += Number(ur.dimensions_total) || 0;
    const tag = { pdf: ev.payload.pdf_path, page: ev.payload.page_index, conf, dims: dims.length, pn: (ex.title_block || {}).part_number, title: (ex.title_block || {}).title };
    if (dims.length > 0) out.prints_with_dims++; else { out.prints_no_dims++; if (out.no_dims_prints.length < 50) out.no_dims_prints.push(tag); }
    if (Number.isFinite(conf) && conf < lowConf && out.low_confidence_prints.length < 50) out.low_confidence_prints.push(tag);
    if (ur.dimensions_total > 0 && (ur.dimensions_unit_resolved || 0) < ur.dimensions_total && out.unresolved_unit_prints.length < 50) out.unresolved_unit_prints.push(tag);
    if (out.samples.length < sampleCap && dims.length > 0) {
      out.samples.push({ ...tag, units: ex.units, dims_sample: dims.slice(0, 6).map((d) => ({ type: d.type, mm: d.nominal_mm, raw: d.raw_text })) });
    }
  }
  out.avg_dims_per_print = out.extraction_events ? +(out.total_dimensions / out.extraction_events).toFixed(1) : 0;
  out.unit_resolved_rate = out.total_unit_dims ? +(out.total_unit_resolved / out.total_unit_dims).toFixed(3) : null;
  out.ok_rate = out.extraction_events ? +(out.prints_with_dims / out.extraction_events).toFixed(3) : null;
  return out;
}

function streamEvents(path) {
  return new Promise((resolve_) => {
    const evs = [];
    if (!existsSync(path)) { resolve_(evs); return; }
    const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }) });
    rl.on("line", (l) => { const s = l.trim(); if (!s) return; try { evs.push(JSON.parse(s)); } catch { /* skip */ } });
    rl.on("close", () => resolve_(evs));
    rl.on("error", () => resolve_(evs));
  });
}

async function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const eventsFile = get("--events", DEFAULT_EVENTS);
  const summaryFile = get("--summary", null);
  const asJson = args.includes("--json");
  const lowConf = Number(get("--low-conf", String(DEFAULT_LOW_CONF))) || DEFAULT_LOW_CONF;
  const samples = Number(get("--samples", "5")) || 5;

  const events = await streamEvents(eventsFile);
  const agg = aggregateEvents(events, { lowConf, samples });
  let batchSummary = null;
  if (summaryFile && existsSync(summaryFile)) { try { batchSummary = JSON.parse(readFileSync(summaryFile, "utf8")); } catch { /* ignore */ } }

  if (asJson) {
    console.log(JSON.stringify({ events_file: eventsFile, batch_summary: batchSummary, digest: agg }, null, 2));
    exit(0);
  }
  console.log("=== Blueprint OCR — overnight review digest ===");
  console.log("events file : " + eventsFile + (events.length ? "" : "  (EMPTY — batch has not run yet)"));
  if (batchSummary) console.log(`batch       : attempted=${batchSummary.attempted} ok=${batchSummary.ok} failed=${batchSummary.failed} skipped(done)=${batchSummary.skipped_done} elapsed=${batchSummary.elapsed_min}min budget_hit=${batchSummary.budget_hit}`);
  console.log(`extraction events : ${agg.extraction_events}`);
  console.log(`prints with dims  : ${agg.prints_with_dims}  (ok_rate=${agg.ok_rate})   no-dims: ${agg.prints_no_dims}`);
  console.log(`dimensions total  : ${agg.total_dimensions}  (avg ${agg.avg_dims_per_print}/print)   GD&T: ${agg.total_gdt} (datum-deficient ${agg.datum_deficient_gdt})`);
  console.log(`unit-resolved rate: ${agg.unit_resolved_rate} (${agg.total_unit_resolved}/${agg.total_unit_dims} dims)`);
  console.log("confidence bands  : " + Object.entries(agg.confidence_bands).map(([k, v]) => k + "=" + v).join("  "));
  console.log(`flagged: low-confidence(<${lowConf})=${agg.low_confidence_prints.length}  no-dims=${agg.no_dims_prints.length}  unresolved-units=${agg.unresolved_unit_prints.length}`);
  for (const s of agg.samples) {
    console.log(`\n  SAMPLE p${s.page} conf=${s.conf} pn=${s.pn || "?"} title=${s.title || "?"} units=${s.units}`);
    console.log("    " + s.pdf);
    for (const d of s.dims_sample) console.log(`      - ${d.type}: ${d.mm != null ? d.mm.toFixed(3) + "mm" : "(unresolved)"}  «${d.raw || ""}»`);
  }
  if (agg.low_confidence_prints.length) {
    console.log(`\n  LOW-CONFIDENCE punch list (first ${Math.min(10, agg.low_confidence_prints.length)}):`);
    for (const p of agg.low_confidence_prints.slice(0, 10)) console.log(`    conf=${p.conf} dims=${p.dims} ${p.pdf}`);
  }
  exit(0);
}

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMainModule) main().catch((e) => { console.error("[review] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); });
