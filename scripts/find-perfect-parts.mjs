#!/usr/bin/env node
// scripts/find-perfect-parts.mjs
//
// U-XRAY-PERFECT-PARTS — find part numbers on H: that have the COMPLETE chain: a blueprint (print) +
// a CAD model + a CNC program. These are the "everything we need" parts: a real (print, CAD, program)
// supervision triple for the closed-loop trainer, and reference exemplars for delta/kilo/oscar.
//
// SOURCE (R8 — SEARCH the paid-for extraction, never re-OCR): juliett's blueprint-program join
// (H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl), which already pairs each
// part_number with its blueprints[] + programs[] (programs carry kind:"cad" vs kind:"program") +
// a relations map (has_nc_program / has_cam_project / has_geometry_model / has_2d_drawing).
//
// A part is "perfect" iff: blueprints>0 AND a CAD leg (a kind:cad program OR has_geometry_model /
// has_2d_drawing relation) AND an NC leg (a kind:program program OR has_nc_program relation).
// The CLEAN set adds match_confidence==exact + sane file-count caps (bp<=12, cad<=20, nc<=30) to
// drop PN-normalization collisions (a bare "24000" over-matches hundreds of unrelated prints).
//
// CAVEAT (R12): the join stores FILENAMES, not absolute paths. Resolve a part's files by globbing
// H:/PRISM/JM DIE (CAD + programs) + H:/PRISM/Docustrata (prints) on the PN stem.
//
// USAGE:
//   node scripts/find-perfect-parts.mjs [--join <path>] [--out-dir <dir>] [--confidence exact|any]
//        [--max-bp 12] [--max-cad 20] [--max-nc 30] [--neutral-step-only] [--limit N] [--json]
// EXIT: 0 ok · 3 join not found.

import { existsSync, mkdirSync, writeFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_JOIN = "H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl";
const DEFAULT_OUT = join(REPO_ROOT, "state", "shared", "ocr-training-loop");
const NEUTRAL_CAD_EXT = /\.(stp|step|igs|iges)$/i; // vendor-neutral geometry (most reusable)

/** A program/cad entry's filename, however it's stored. */
function entryName(x) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  return String(x.path || x.disk_path || x.abs_path || x.filename || "");
}

/**
 * Pure: classify one join record's leg-completeness. Returns the per-leg counts + whether it's a
 * perfect triple + whether it carries a neutral-STEP CAD. The single source of the "perfect" rule —
 * both the count summary and the emitted part list flow through it so they can't diverge.
 * @param {object} rec  a blueprint-program-join record
 * @returns {{nbp:number, nCad:number, nNc:number, hasCad:boolean, hasNc:boolean, perfect:boolean,
 *            hasNeutralStep:boolean, confidence:string}}
 */
export function classifyJoinRecord(rec) {
  const r = rec && typeof rec === "object" ? rec : {};
  const nbp = Array.isArray(r.blueprints) ? r.blueprints.length : 0;
  const progs = Array.isArray(r.programs) ? r.programs : [];
  const cadEntries = progs.filter((p) => p && typeof p === "object" && p.kind === "cad");
  const ncEntries = progs.filter((p) => p && typeof p === "object" && p.kind === "program");
  const rel = r.relations && typeof r.relations === "object" && !Array.isArray(r.relations) ? r.relations : {};
  const relList = Array.isArray(r.relations) ? r.relations.map(String) : Object.keys(rel);
  const hasCad = cadEntries.length > 0 || relList.includes("has_geometry_model") || relList.includes("has_2d_drawing");
  const hasNc = ncEntries.length > 0 || relList.includes("has_nc_program");
  const hasNeutralStep = cadEntries.some((c) => NEUTRAL_CAD_EXT.test(entryName(c)));
  return {
    nbp, nCad: cadEntries.length, nNc: ncEntries.length,
    hasCad, hasNc, perfect: nbp > 0 && hasCad && hasNc,
    hasNeutralStep, confidence: String(r.match_confidence == null ? "" : r.match_confidence),
  };
}

/**
 * Pure: does a classified record pass the CLEAN filter (confidence + sane counts)? Drops the
 * PN-normalization collisions (a bare numeric PN matching hundreds of prints).
 */
export function isCleanPerfect(cls, opts = {}) {
  if (!cls.perfect) return false;
  const wantConf = opts.confidence || "exact";
  if (wantConf !== "any" && cls.confidence !== wantConf) return false;
  if (cls.nbp > (opts.maxBp ?? 12)) return false;
  if (cls.nCad > (opts.maxCad ?? 20)) return false;
  if (cls.nNc > (opts.maxNc ?? 30)) return false;
  if (opts.neutralStepOnly && !cls.hasNeutralStep) return false;
  return true;
}

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    join: get("--join", DEFAULT_JOIN),
    outDir: get("--out-dir", DEFAULT_OUT),
    confidence: get("--confidence", "exact"),
    maxBp: num("--max-bp", 12), maxCad: num("--max-cad", 20), maxNc: num("--max-nc", 30),
    neutralStepOnly: has("--neutral-step-only"),
    limit: num("--limit", 0),
    json: has("--json"),
  };
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (!existsSync(opts.join)) { console.error(`ERROR: join not found: ${opts.join}`); return 3; }
  mkdirSync(opts.outDir, { recursive: true });

  let total = 0, perfectAll = 0, perfectExact = 0;
  const clean = [];
  const rl = createInterface({ input: createReadStream(opts.join, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    let rec; try { rec = JSON.parse(t); } catch { continue; }
    total++;
    const cls = classifyJoinRecord(rec);
    if (cls.perfect) { perfectAll++; if (cls.confidence === "exact") perfectExact++; }
    if (isCleanPerfect(cls, opts)) {
      const progs = rec.programs || [];
      const firstOf = (kind) => { const e = progs.find((p) => p && p.kind === kind); return e ? entryName(e) : null; };
      const bp0 = Array.isArray(rec.blueprints) && rec.blueprints[0] ? entryName(rec.blueprints[0]) : null;
      clean.push({
        part_number: String(rec.part_number),
        part_number_normalized: rec.part_number_normalized,
        customers: (rec.print_customers || []).slice(0, 3),
        customer_corroborated_n: rec.customer_corroborated_n || 0,
        counts: { blueprints: cls.nbp, cad: cls.nCad, nc_programs: cls.nNc },
        has_neutral_step: cls.hasNeutralStep,
        sample_print: bp0, sample_cad: firstOf("cad"), sample_nc: firstOf("program"),
      });
    }
  }
  clean.sort((a, b) =>
    (Number(b.has_neutral_step) - Number(a.has_neutral_step)) ||
    (b.customer_corroborated_n - a.customer_corroborated_n) ||
    ((b.counts.cad + b.counts.nc_programs) - (a.counts.cad + a.counts.nc_programs)));
  const out = opts.limit > 0 ? clean.slice(0, opts.limit) : clean;

  const report = {
    schemaVersion: "1.0.0", generated_from: opts.join,
    criteria: `match_confidence=${opts.confidence} AND blueprints>0 AND cad>0 AND nc_programs>0 AND counts<=(bp ${opts.maxBp},cad ${opts.maxCad},nc ${opts.maxNc})${opts.neutralStepOnly ? " AND neutral-STEP CAD" : ""}`,
    total_join_records: total, perfect_any_confidence: perfectAll, perfect_exact: perfectExact,
    clean_perfect: clean.length, with_neutral_step_cad: clean.filter((p) => p.has_neutral_step).length,
    note: "Join stores FILENAMES not paths — resolve via glob of H:/PRISM/JM DIE (cad+programs) + H:/PRISM/Docustrata (prints) on the PN stem. Prints are scanned PDFs (filename = scan timestamp); spot-check the print depicts the part before using as a label source.",
    parts: out,
  };
  const outPath = join(opts.outDir, "perfect-print-cad-program-parts.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`\n📦 PERFECT PARTS (print + CAD + CNC program) — ${total} join records scanned`);
  console.log(`  perfect (any confidence): ${perfectAll} · perfect (exact): ${perfectExact}`);
  console.log(`  clean (exact + sane counts): ${clean.length} · with neutral STEP/IGES CAD: ${report.with_neutral_step_cad}`);
  console.log(`  → ${outPath}`);
  for (const p of out.slice(0, 12)) {
    console.log(`    ${p.part_number.padEnd(18)} bp=${p.counts.blueprints} cad=${p.counts.cad} nc=${p.counts.nc_programs} corrob=${p.customer_corroborated_n}${p.has_neutral_step ? " [STEP]" : ""} ${JSON.stringify(p.customers.slice(0, 1))}`);
  }
  if (opts.json) console.log(JSON.stringify({ total, perfectAll, perfectExact, clean: clean.length, neutralStep: report.with_neutral_step_cad }));
  return 0;
}

const invokedDirectly = argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().then((code) => exit(code)).catch((e) => { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); });
}
