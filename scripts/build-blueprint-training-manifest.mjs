#!/usr/bin/env node
/**
 * build-blueprint-training-manifest.mjs — slot:xray (U-PSGB-XRAY training push, 2026-05-29)
 *
 * Partitions the DocuStrata classified index into training-readiness buckets so the
 * operator knows EXACTLY how many real blueprints need the GPU-OCR run before the
 * LoRA corpus can be assembled. Spec: state/shared/specs/BLUEPRINT-VISION-TRAINING-READINESS-2026-05-29.md (§4.1).
 *
 * DATA FINDING it acts on: text-layer docs skew to business paperwork (invoices/quotes/POs);
 * real blueprints are scanned drawings (mostly needs_ocr). So we partition by print-likeness
 * (print_score + inferred_role), NOT by has_text_layer alone.
 *
 * Pure: NO OCR, NO Ollama, NO PDF reads. Streams the index line-by-line (the 66MB file is
 * never JSON.parse'd whole). In-session-runnable. R8: reads juliett's already-extracted index.
 *
 * Usage:
 *   node scripts/build-blueprint-training-manifest.mjs [--index <path>] [--out <path>]
 *        [--print-score-min N] [--sample N] [--json]
 * Defaults: index=H:/PRISM/Docustrata/.index/documents-classified-v3.jsonl
 *           out=state/shared/blueprint-training-partition.json  print-score-min=1  sample=25
 */
import { createReadStream, writeFileSync, renameSync, existsSync } from "node:fs";

const PRINT_ROLE_RE = /(draw|print|blueprint|dimension|gd&?t|geometric|part[_\s-]?(spec|drawing)|engineering[_\s-]?drawing|machining)/i;

/** Pure: classify one index record into a training-readiness bucket. */
export function classifyDoc(rec, printScoreMin = 1) {
  if (!rec || typeof rec !== "object") return "non_blueprint";
  const score = Number(rec.print_score);
  const role = String(rec.inferred_role_v2 || rec.inferred_role || "");
  const printLike =
    (Number.isFinite(score) && score >= printScoreMin) || PRINT_ROLE_RE.test(role);
  if (!printLike) return "non_blueprint";
  const needsOcr =
    rec.needs_real_ocr === true || rec.needs_ocr === true || rec.has_text_layer !== true;
  return needsOcr ? "blueprint_needs_ocr" : "blueprint_text_ready";
}

/** Pure: fold a record into the running aggregate. */
export function foldRecord(agg, rec, opts) {
  const { printScoreMin, sample } = opts;
  const bucket = classifyDoc(rec, printScoreMin);
  agg.counts[bucket] = (agg.counts[bucket] || 0) + 1;
  agg.total += 1;
  // print_score histogram (clamped buckets) — lets the operator tune --print-score-min
  const s = Number(rec.print_score);
  const hk = !Number.isFinite(s) ? "NaN" : s <= -5 ? "<=-5" : s < 0 ? "[-4,-1]" : s === 0 ? "0" : s <= 4 ? "[1,4]" : ">=5";
  agg.printScoreHistogram[hk] = (agg.printScoreHistogram[hk] || 0) + 1;
  if (bucket !== "non_blueprint" && agg.samples[bucket].length < sample) {
    agg.samples[bucket].push({
      id: rec.id, disk_path: rec.disk_path, role: rec.inferred_role_v2 || rec.inferred_role,
      print_score: rec.print_score, has_text_layer: rec.has_text_layer === true, needs_ocr: rec.needs_ocr === true,
    });
  }
  return agg;
}

export function emptyAgg() {
  return {
    counts: { blueprint_text_ready: 0, blueprint_needs_ocr: 0, non_blueprint: 0 },
    total: 0, printScoreHistogram: {},
    samples: { blueprint_text_ready: [], blueprint_needs_ocr: [] },
  };
}

async function streamIndex(indexPath, opts) {
  return new Promise((resolve, reject) => {
    const agg = emptyAgg();
    let buf = "", bad = 0;
    const rs = createReadStream(indexPath, { encoding: "utf8" });
    rs.on("data", (d) => {
      buf += d; let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        try { foldRecord(agg, JSON.parse(line), opts); } catch { bad += 1; }
      }
    });
    rs.on("error", reject);
    rs.on("close", () => {
      if (buf.trim()) { try { foldRecord(agg, JSON.parse(buf), opts); } catch { bad += 1; } }
      agg.malformedLinesSkipped = bad;
      resolve(agg);
    });
  });
}

function parseArgs(argv) {
  const a = { index: "H:/PRISM/Docustrata/.index/documents-classified-v3.jsonl",
    out: "state/shared/blueprint-training-partition.json", printScoreMin: 1, sample: 25, json: false };
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--index") a.index = argv[++i];
    else if (v === "--out") a.out = argv[++i];
    else if (v === "--print-score-min") a.printScoreMin = Number(argv[++i]);
    else if (v === "--sample") a.sample = Number(argv[++i]);
    else if (v === "--json") a.json = true;
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv);
  if (!existsSync(a.index)) {
    console.error(`[manifest] FAIL: index not found: ${a.index}`);
    process.exit(2);
  }
  const agg = await streamIndex(a.index, { printScoreMin: a.printScoreMin, sample: a.sample });
  const out = {
    schemaVersion: "1.0.0", kind: "blueprint-training-partition", builder: "build-blueprint-training-manifest.mjs",
    owner_slot: "xray", index: a.index, printScoreMin: a.printScoreMin,
    total: agg.total, counts: agg.counts, printScoreHistogram: agg.printScoreHistogram,
    malformedLinesSkipped: agg.malformedLinesSkipped, samples: agg.samples,
    note: "ADVISORY. print-likeness = print_score>=min OR inferred_role matches drawing/print pattern. blueprint_needs_ocr = the GPU-OCR work-list (spec §4.4). Tune --print-score-min via the histogram. mustHumanVerify before training.",
  };
  const tmp = a.out + ".tmp";
  writeFileSync(tmp, JSON.stringify(out, null, 2));
  renameSync(tmp, a.out);
  if (a.json) { process.stdout.write(JSON.stringify(out.counts) + "\n"); }
  else {
    console.log(`[manifest] total=${agg.total} → ${a.out}`);
    console.log(`  blueprint_text_ready : ${agg.counts.blueprint_text_ready} (no-OCR seed)`);
    console.log(`  blueprint_needs_ocr  : ${agg.counts.blueprint_needs_ocr} (GPU-OCR work-list, §4.4)`);
    console.log(`  non_blueprint        : ${agg.counts.non_blueprint} (business docs — charlie/hotel)`);
    console.log(`  print_score histogram: ${JSON.stringify(agg.printScoreHistogram)}`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch((e) => { console.error("[manifest] ERROR:", e?.message || e); process.exit(1); });
}
