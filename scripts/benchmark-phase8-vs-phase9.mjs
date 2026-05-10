#!/usr/bin/env node
/**
 * benchmark-phase8-vs-phase9.mjs
 *
 * One-shot comparison of the Phase 8 (cleaned) and Phase 9 (unified)
 * blueprint-extraction pipelines over the Docustrata corpus.
 *
 * Goal: decide which pipeline output should feed the print<->program
 * join + downstream training. Apples-to-apples on (doc_id, page_index)
 * keys: coverage, drawing-score agreement, part-number recovery delta.
 *
 * Inputs (defaults; --phase8 / --phase9 / --out override):
 *   H:/prism/Docustrata/.index/phase8-classified-pages.cleaned.jsonl
 *   H:/prism/Docustrata/.index/phase9-unified-pages.jsonl
 *
 * Output:
 *   H:/prism/Docustrata/.index/phase8-vs-phase9-benchmark.json
 */

import * as fs from "node:fs";
import * as readline from "node:readline";

const DRAWING_SCORE_FLOOR = 0.3;
const MAX_LINE_BYTES = 4 * 1024 * 1024;

function parseArgs(argv) {
  const args = { phase8: null, phase9: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phase8") args.phase8 = argv[++i];
    else if (a === "--phase9") args.phase9 = argv[++i];
    else if (a === "--out") args.out = argv[++i];
  }
  args.phase8 ??= "H:/prism/Docustrata/.index/phase8-classified-pages.cleaned.jsonl";
  args.phase9 ??= "H:/prism/Docustrata/.index/phase9-unified-pages.jsonl";
  args.out ??= "H:/prism/Docustrata/.index/phase8-vs-phase9-benchmark.json";
  return args;
}

function partNumbersOf(row) {
  const t2 = row?.tier2;
  if (!t2 || typeof t2 !== "object") return [];
  if (Array.isArray(t2.part_numbers_clean) && t2.part_numbers_clean.length > 0) {
    return t2.part_numbers_clean.filter((p) => typeof p === "string");
  }
  if (Array.isArray(t2.part_numbers)) {
    return t2.part_numbers.filter((p) => typeof p === "string" && p.length > 0);
  }
  return [];
}

function ocrCharsOf(row) {
  const n = row?.tier2?.ocr_chars;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function drawingScoreOf(row) {
  const s = row?.tier1?.drawing_score;
  return typeof s === "number" && Number.isFinite(s) ? s : null;
}

async function indexPipeline(path, label) {
  if (!fs.existsSync(path)) {
    throw new Error(`${label} input not found at ${path}`);
  }
  const stat = fs.statSync(path);
  const stats = {
    label,
    path,
    fileBytes: stat.size,
    totalLines: 0,
    malformed: 0,
    pagesWithTier2: 0,
    pagesAboveDrawingFloor: 0,
    pagesWithPartNumbers: 0,
    totalOcrChars: 0,
    uniquePartNumbers: new Set(),
    uniqueDocs: new Set(),
    pages: new Map(), // key -> { drawing_score, ocr_chars, part_numbers, has_tier2 }
  };
  const rl = readline.createInterface({
    input: fs.createReadStream(path, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.length === 0) continue;
    stats.totalLines++;
    if (Buffer.byteLength(line, "utf-8") > MAX_LINE_BYTES) {
      stats.malformed++;
      continue;
    }
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      stats.malformed++;
      continue;
    }
    if (typeof row?.doc_id !== "string" || typeof row?.page_index !== "number") {
      stats.malformed++;
      continue;
    }
    stats.uniqueDocs.add(row.doc_id);
    const score = drawingScoreOf(row);
    const hasTier2 = row?.tier2 && typeof row.tier2 === "object";
    const pns = partNumbersOf(row);
    const ocrChars = ocrCharsOf(row);

    if (hasTier2) stats.pagesWithTier2++;
    if (score !== null && score >= DRAWING_SCORE_FLOOR) stats.pagesAboveDrawingFloor++;
    if (pns.length > 0) {
      stats.pagesWithPartNumbers++;
      for (const p of pns) stats.uniquePartNumbers.add(p);
    }
    stats.totalOcrChars += ocrChars;

    const key = `${row.doc_id}::${row.page_index}`;
    stats.pages.set(key, {
      drawing_score: score,
      ocr_chars: ocrChars,
      part_numbers: pns,
      has_tier2: hasTier2,
    });
  }
  return stats;
}

function compareOverlap(a, b) {
  const keysA = new Set(a.pages.keys());
  const keysB = new Set(b.pages.keys());
  let common = 0;
  let scorePairs = 0;
  let scoreAbsDiffSum = 0;
  let scoreSquareDiffSum = 0;
  let bothAboveFloor = 0;
  let onlyAboveFloorInA = 0;
  let onlyAboveFloorInB = 0;
  let pnRecoveryWins = { a: 0, b: 0, tie: 0 };
  for (const k of keysA) {
    if (!keysB.has(k)) continue;
    common++;
    const pa = a.pages.get(k);
    const pb = b.pages.get(k);
    if (pa.drawing_score !== null && pb.drawing_score !== null) {
      scorePairs++;
      const d = pa.drawing_score - pb.drawing_score;
      scoreAbsDiffSum += Math.abs(d);
      scoreSquareDiffSum += d * d;
    }
    const aOver = pa.drawing_score !== null && pa.drawing_score >= DRAWING_SCORE_FLOOR;
    const bOver = pb.drawing_score !== null && pb.drawing_score >= DRAWING_SCORE_FLOOR;
    if (aOver && bOver) bothAboveFloor++;
    else if (aOver) onlyAboveFloorInA++;
    else if (bOver) onlyAboveFloorInB++;
    if (pa.part_numbers.length > pb.part_numbers.length) pnRecoveryWins.a++;
    else if (pb.part_numbers.length > pa.part_numbers.length) pnRecoveryWins.b++;
    else if (pa.part_numbers.length > 0 || pb.part_numbers.length > 0) pnRecoveryWins.tie++;
  }
  return {
    keysOnlyInA: [...keysA].filter((k) => !keysB.has(k)).length,
    keysOnlyInB: [...keysB].filter((k) => !keysA.has(k)).length,
    commonKeys: common,
    scorePairs,
    scoreMAE: scorePairs > 0 ? scoreAbsDiffSum / scorePairs : 0,
    scoreRMSE: scorePairs > 0 ? Math.sqrt(scoreSquareDiffSum / scorePairs) : 0,
    bothAboveFloor,
    onlyAboveFloorInA,
    onlyAboveFloorInB,
    partNumberRecoveryWins: pnRecoveryWins,
  };
}

function summarizePipeline(s) {
  return {
    label: s.label,
    path: s.path,
    file_bytes: s.fileBytes,
    total_lines: s.totalLines,
    malformed: s.malformed,
    unique_docs: s.uniqueDocs.size,
    pages_with_tier2_ocr: s.pagesWithTier2,
    pages_above_drawing_floor_0_3: s.pagesAboveDrawingFloor,
    pages_with_part_numbers: s.pagesWithPartNumbers,
    total_ocr_chars: s.totalOcrChars,
    avg_ocr_chars_per_tier2_page: s.pagesWithTier2 > 0 ? Math.round(s.totalOcrChars / s.pagesWithTier2) : 0,
    unique_part_numbers: s.uniquePartNumbers.size,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const t0 = Date.now();
  const [a, b] = await Promise.all([
    indexPipeline(args.phase8, "phase8"),
    indexPipeline(args.phase9, "phase9"),
  ]);
  const overlap = compareOverlap(a, b);
  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    inputs: { phase8: args.phase8, phase9: args.phase9 },
    pipelines: {
      phase8: summarizePipeline(a),
      phase9: summarizePipeline(b),
    },
    overlap,
    recommendation: pickRecommendation(a, b, overlap),
  };
  fs.writeFileSync(args.out, JSON.stringify(report, null, 2), "utf-8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[benchmark] wrote ${args.out}`);
}

function pickRecommendation(a, b, overlap) {
  // Prefer the pipeline with more pages above drawing floor AND more part
  // numbers recovered. If they disagree, lean toward part-number recovery
  // since that is what the join engine consumes downstream.
  const aWinsCoverage = a.pagesAboveDrawingFloor > b.pagesAboveDrawingFloor;
  const aWinsRecovery = a.uniquePartNumbers.size > b.uniquePartNumbers.size;
  if (aWinsCoverage && aWinsRecovery) return { winner: "phase8", reason: "phase8 leads on both coverage and recovery" };
  if (!aWinsCoverage && !aWinsRecovery) return { winner: "phase9", reason: "phase9 leads on both coverage and recovery" };
  if (aWinsRecovery) return { winner: "phase8", reason: "phase9 has more pages but phase8 recovers more unique part numbers (downstream join driver)" };
  return { winner: "phase9", reason: "phase8 has more pages but phase9 recovers more unique part numbers" };
}

main().catch((err) => {
  console.error("[benchmark] FAIL:", err.message);
  process.exit(1);
});
