#!/usr/bin/env node
/**
 * build-blueprint-cad-program-pairs.mjs — slot:xray (U-PSGB-XRAY training push, 2026-05-29)
 *
 * Builds the SUPERVISED training-pair spine for blueprint reading: joins the
 * print↔program answer-key (blueprint-program-join-full-v6.jsonl, 76,205 part_numbers)
 * with a part_number→CAD-file index derived from the jm-die files table. The CAD
 * geometry + CNC program ARE the ground-truth labels (operator design 2026-05-29):
 * print = input, CAD+program = labels. No human labeling, no OCR, no GPU.
 *
 * Spec: state/shared/specs/BLUEPRINT-VISION-TRAINING-READINESS-2026-05-29.md §7.
 * R8: reuses juliett's already-built tables — never re-OCRs / re-indexes.
 *
 * Output: state/shared/blueprint-training-pairs.jsonl — one row per part_number:
 *   {part_number, print_docs[], program_files[], cad_files[], has_print, has_program,
 *    has_cad, label_source, train_eligible}
 * train_eligible = has_print && (has_program || has_cad)  (a print with at least one label source).
 *
 * Usage: node scripts/build-blueprint-cad-program-pairs.mjs
 *   [--join <v6.jsonl>] [--files <files.jsonl>] [--out <pairs.jsonl>] [--report-only] [--max N]
 */
import { createReadStream, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CAD_EXT = new Set(["step", "stp", "dxf", "dwg", "sldprt", "ipt", "iam", "idw", "3dm", "f3d", "f3z", "igs", "iges", "stl", "x_t", "sat"]);

/** Pure: canonical PN form — uppercase, strip non-alphanumeric. */
export function normalizePN(s) {
  if (s == null) return "";
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Pure: candidate part-numbers extractable from a filename stem.
 *  Returns the full normalized stem (>=5) + every digit-run of length>=4. JM PNs
 *  span 1-20 digits but the corpus mass is 4-9 digits (14,394 v6 PNs are 4-digit,
 *  ~19% of the corpus) — the prior >=5 digit-run floor was blind to EVERY 4-digit
 *  PN, missing CAD files genuinely named "1005 HAMMERHOB.ipt". Every candidate is
 *  gated by knownPNs membership downstream, so a 4-digit run only matches an ACTUAL
 *  JM PN (false positives bounded — a year like 2020 matches only if 2020 is a real
 *  PN). 3-digit runs are deliberately NOT extracted (468 known 3-digit PNs but
 *  3-digit runs appear as revs/dates in most filenames → noise > +46 PN gain). */
export function candidatePNs(stem) {
  const out = new Set();
  const norm = normalizePN(stem);
  if (norm.length >= 5) out.add(norm);
  const digitRuns = String(stem || "").match(/\d{4,}/g) || [];
  for (const r of digitRuns) out.add(r);
  return [...out];
}

/** Pure: is this file a CAD geometry file (vs program/other)? */
export function isCadFile(ext) {
  return CAD_EXT.has(String(ext || "").toLowerCase().replace(/^\./, ""));
}

function streamLines(path, onObj) {
  return new Promise((resolve, reject) => {
    let buf = "", bad = 0;
    const rs = createReadStream(path, { encoding: "utf8" });
    rs.on("data", (d) => {
      buf += d; let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        try { onObj(JSON.parse(line)); } catch { bad += 1; }
      }
    });
    rs.on("error", reject);
    rs.on("close", () => {
      if (buf.trim()) { try { onObj(JSON.parse(buf)); } catch { bad += 1; } }
      resolve(bad);
    });
  });
}

/** Build pn(normalized) → cad_files[] from the files table. Pure-ish (injectable streamer for tests). */
export function indexCadByPN(fileRecords, knownPNs) {
  const cadByPN = new Map();
  for (const o of fileRecords) {
    const ext = o.ext;
    if (!isCadFile(ext)) continue;
    const stem = o.stem || o.name || o.path || "";
    for (const cand of candidatePNs(stem)) {
      if (!knownPNs.has(cand)) continue;
      if (!cadByPN.has(cand)) cadByPN.set(cand, []);
      const arr = cadByPN.get(cand);
      if (arr.length < 12) arr.push({ path: o.path, ext: String(ext).toLowerCase(), customer: o.customer, kind: o.kind, matched_via: cand });
    }
  }
  return cadByPN;
}

async function main() {
  const args = process.argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const JOIN = get("--join", "H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl");
  const FILES = get("--files", "mcp-server/data/jm-die-database/tables/files.jsonl");
  const OUT = get("--out", "state/shared/blueprint-training-pairs.jsonl");
  const reportOnly = args.includes("--report-only");
  const max = Number(get("--max", "0")) || 0;
  for (const [label, p] of [["join", JOIN], ["files", FILES]]) {
    if (!existsSync(p)) { console.error(`[pairs] FAIL: ${label} not found: ${p}`); process.exit(2); }
  }

  // Pass 1: collect known normalized PNs from the v6 join.
  const knownPNs = new Set();
  const joinRows = [];
  await streamLines(JOIN, (o) => {
    const pn = normalizePN(o.part_number_normalized || o.part_number);
    if (!pn) return;
    knownPNs.add(pn);
    if (!max || joinRows.length < max) joinRows.push({ pn, raw: o.part_number, blueprints: o.blueprints || [], programs: o.programs || [], match_confidence: o.match_confidence, print_customers: o.print_customers || [] });
  });

  // Pass 2: build pn→CAD index from files table (only PNs we know).
  const fileRecs = [];
  await streamLines(FILES, (o) => fileRecs.push(o));
  const cadByPN = indexCadByPN(fileRecs, knownPNs);

  // Join + emit.
  const stats = { total_part_numbers: joinRows.length, with_print: 0, with_program: 0, with_cad: 0, full_triple: 0, train_eligible: 0, cad_files_matched: 0 };
  const lines = [];
  for (const r of joinRows) {
    const cad = cadByPN.get(r.pn) || [];
    const hasPrint = (r.blueprints || []).length > 0;
    const hasProgram = (r.programs || []).length > 0;
    const hasCad = cad.length > 0;
    if (hasPrint) stats.with_print++;
    if (hasProgram) stats.with_program++;
    if (hasCad) { stats.with_cad++; stats.cad_files_matched += cad.length; }
    if (hasPrint && hasProgram && hasCad) stats.full_triple++;
    const trainEligible = hasPrint && (hasProgram || hasCad);
    if (trainEligible) stats.train_eligible++;
    const labelSource = [hasCad && "cad", hasProgram && "program"].filter(Boolean).join("+") || "none";
    lines.push(JSON.stringify({
      part_number: r.raw, part_number_normalized: r.pn,
      print_docs: (r.blueprints || []).map((b) => ({ doc_id: b.doc_id, filename: b.filename, drawing_score: b.drawing_score })),
      program_files: r.programs, cad_files: cad,
      has_print: hasPrint, has_program: hasProgram, has_cad: hasCad,
      label_source: labelSource, train_eligible: trainEligible,
      match_confidence: r.match_confidence, print_customers: r.print_customers,
    }));
  }

  if (!reportOnly) {
    mkdirSync(dirname(OUT), { recursive: true });
    const tmp = OUT + ".tmp";
    writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""));
    renameSync(tmp, OUT);
  }
  console.log(`[pairs] ${reportOnly ? "(report-only) " : "→ " + OUT + " "}`);
  console.log(`  total part_numbers   : ${stats.total_part_numbers}`);
  console.log(`  with print           : ${stats.with_print}`);
  console.log(`  with CNC program     : ${stats.with_program}`);
  console.log(`  with CAD file        : ${stats.with_cad}  (${stats.cad_files_matched} CAD files matched)`);
  console.log(`  FULL TRIPLE (P+Prog+CAD): ${stats.full_triple}`);
  console.log(`  TRAIN-ELIGIBLE (print + ≥1 label): ${stats.train_eligible}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch((e) => { console.error("[pairs] ERROR:", e?.message || e); process.exit(1); });
}
