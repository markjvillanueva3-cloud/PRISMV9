#!/usr/bin/env node
// scripts/harvest-pdf-text-batch.mjs
//
// U-TDP07 corpus harvest CLI — Node consumer half.
//
// Reads JSONL on stdin from harvest-pdf-text-batch.py, runs the U-TDP07
// embedded-text parser on each PDF's text, aggregates per-part-class stats,
// and emits a single accuracy-report JSON at end.
//
// USAGE:
//   python scripts/harvest-pdf-text-batch.py <root> | node scripts/harvest-pdf-text-batch.mjs --out <report.json>
//
// Per-class output:
//   - pdf_count
//   - mean_dims_per_pdf, median_dims_per_pdf
//   - mean_confidence, p95_confidence
//   - kind_histogram

import { createInterface } from "node:readline";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, exit, stdin } from "node:process";

import { extractDimensionsFromText } from "./lib/pdf-text-extract-lib.mjs";
import { inferPartClass } from "./lib/print-harvester-lib.mjs";

function parseArgs(args) {
  const out = { out: null, json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out") out.out = args[++i];
    else if (a === "--json") out.json = true;
  }
  return out;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(arr) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function main() {
  const args = parseArgs(argv.slice(2));

  // Per-class buckets
  const buckets = new Map();
  let totalLines = 0;
  let extractedOk = 0;
  let extractedNothing = 0;

  const rl = createInterface({ input: stdin });
  for await (const line of rl) {
    if (!line.trim()) continue;
    totalLines++;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (!row.text) continue;

    const partClass = inferPartClass(row.path);
    if (!buckets.has(partClass)) {
      buckets.set(partClass, {
        part_class: partClass,
        pdf_count: 0,
        dims: [],
        confidences: [],
        kinds: new Map(),
        with_material: 0,
        with_surface: 0,
        with_ra: 0,
        zero_dim_count: 0,
      });
    }
    const b = buckets.get(partClass);
    b.pdf_count++;

    const r = extractDimensionsFromText(row.text);
    if (!r.success) {
      extractedNothing++;
      continue;
    }
    const e = r.extraction;
    if (e.dimensions.length === 0) {
      b.zero_dim_count++;
      b.confidences.push(e.confidence);
      continue;
    }
    extractedOk++;
    b.dims.push(e.dimensions.length);
    b.confidences.push(e.confidence);
    if (e.material) b.with_material++;
    if (e.surface_treatment) b.with_surface++;
    if (e.surface_roughness_ra_um != null) b.with_ra++;
    for (const d of e.dimensions) {
      b.kinds.set(d.kind, (b.kinds.get(d.kind) || 0) + 1);
    }
  }

  // Finalize per-class stats
  const perClass = [];
  for (const b of buckets.values()) {
    const sortedConf = [...b.confidences].sort((a, c) => a - c);
    const meanConf = b.confidences.length
      ? b.confidences.reduce((s, c) => s + c, 0) / b.confidences.length
      : null;
    const meanDims = b.dims.length
      ? b.dims.reduce((s, c) => s + c, 0) / b.dims.length
      : 0;
    const kindHist = {};
    for (const [k, v] of b.kinds.entries()) kindHist[k] = v;
    perClass.push({
      part_class: b.part_class,
      pdf_count: b.pdf_count,
      pdfs_with_dims: b.dims.length,
      zero_dim_count: b.zero_dim_count,
      mean_dims_per_pdf: Number(meanDims.toFixed(2)),
      median_dims_per_pdf: median(b.dims),
      mean_confidence: meanConf !== null ? Number(meanConf.toFixed(3)) : null,
      p95_confidence: Number(percentile(sortedConf, 0.95)?.toFixed(3) ?? 0),
      with_material: b.with_material,
      with_surface_treatment: b.with_surface,
      with_surface_roughness: b.with_ra,
      kind_histogram: kindHist,
    });
  }
  perClass.sort((a, b) => b.pdf_count - a.pdf_count);

  const report = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    totals: {
      pdfs_seen: totalLines,
      pdfs_with_dims_extracted: extractedOk,
      pdfs_zero_dims: totalLines - extractedOk - extractedNothing,
      pdfs_parse_failed: extractedNothing,
    },
    per_class: perClass,
    source: "U-TDP07 embedded-text",
  };

  if (args.out) {
    const outPath = resolve(args.out);
    const d = dirname(outPath);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    process.stderr.write(`report -> ${outPath}\n`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  // Quick human-readable summary on stderr
  process.stderr.write(`\n=== U-TDP07 corpus extraction summary ===\n`);
  process.stderr.write(`pdfs_seen: ${report.totals.pdfs_seen}\n`);
  process.stderr.write(`pdfs_with_dims: ${report.totals.pdfs_with_dims_extracted} (${(100*report.totals.pdfs_with_dims_extracted/Math.max(1,report.totals.pdfs_seen)).toFixed(1)}%)\n`);
  process.stderr.write(`pdfs_zero_dims: ${report.totals.pdfs_zero_dims}\n`);
  process.stderr.write(`\nTop 10 classes by PDF count:\n`);
  for (const c of perClass.slice(0, 10)) {
    process.stderr.write(`  ${c.part_class.padEnd(20)} pdfs=${String(c.pdf_count).padEnd(6)} with_dims=${String(c.pdfs_with_dims).padEnd(6)} mean_dims=${String(c.mean_dims_per_pdf).padEnd(7)} mean_conf=${c.mean_confidence}\n`);
  }
  exit(0);
}

main().catch((e) => {
  process.stderr.write(`FATAL: ${e instanceof Error ? e.message : String(e)}\n`);
  exit(2);
});
