/**
 * WEDM print→program closed-loop ACCURACY harness (slot:mike)
 * ---------------------------------------------------------------------------
 * Work order (2026-06-02): "prove accuracy of print→CNC programs for JM wire
 * programs … read print, write program, post the g-code, compare to existing
 * programs … check calculations & parameters relative to thickness / hardness /
 * compound material."
 *
 * Iteration 1 scope = the PARAMETER-SELECTION layer:
 *   - Parse the REAL JM wire-EDM ground-truth programs (.NC + FIOCCHI .txt).
 *   - Drive the canonical JM shop predictor `getJMDiePatternForMaterial()`.
 *   - Score whether PRISM reproduces the SHOP's actual E-code family / pass-count
 *     / H-offsets / feed-rates / taper choice, and at WHAT thickness band.
 *   - Surface honest gaps (uncalibrated thresholds, unreachable families,
 *     missing compound/exotic material handling).
 *
 * This is NOT the full G-code emission test (that drives WEDMPrintToProgramEngine
 * — iteration 2). It is fail-loud: programs the model cannot reproduce score 0,
 * and declared-but-unreachable JM families are reported as MODEL GAPS.
 *
 * Honest corpus note: `.MIN` files under WIRE EDM/ are Okuma LATHE programs
 * (G96/G97/G50/G85 NTURN) — excluded. See memory reference_min_files_not_wire_programs.
 *
 * Run:  cd mcp-server && npx tsx scripts/wedm-print-to-program-accuracy.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getJMDiePatternForMaterial,
  detectECodeFamily,
  JM_DIE_ECODE_FAMILY_DISTRIBUTION,
} from "../src/data/jm-die-wedm-program-patterns.js";
import { selectECodeFamily, JM_DIE_ECODE_FAMILIES } from "../src/data/jm-die-wedm-tech-tables.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../../"); // H:/prism

// ---------------------------------------------------------------------------
// Ground-truth corpus (raw wire-EDM G-code only — verified, not .MIN lathe files)
// material + needs_taper are the print-derived inputs the program itself omits.
// ---------------------------------------------------------------------------
interface GroundTruthSpec {
  id: string;
  path: string;
  material: string; // print-derived
  isProduction: boolean; // false = trivial/test cut (excluded from scoring mean)
  partNote: string;
}

const GROUND_TRUTH: GroundTruthSpec[] = [
  {
    id: "ITW-SHAKEPROOF-500-30540",
    path: "JM DIE/WIRE EDM/ITW SHAKEPROOF 500-30540-24000-04.NC",
    material: "D2",
    isProduction: true,
    partNote: "shakeproof lock washer profile (hex + arc), thin",
  },
  {
    id: "NOZE-TEST",
    path: "JM DIE/WIRE EDM/NOZE TEST.NC",
    material: "stainless",
    isProduction: true,
    partNote: "nozzle test, 4-axis UV taper",
  },
  {
    id: "FIOCCHI-38CAL-CANNELURE",
    path: "JM DIE/WIRE EDM/FIOCCHI/38 CAL CANNELURE 30TPI.txt",
    material: "D2",
    isProduction: true,
    partNote: "38 cal cannelure forming die, heavy/thick",
  },
  {
    id: "WIRE-5IN-SQUARE",
    path: "JM DIE/WIRE EDM/Wire Program - 5 inch square.NC",
    material: "unknown",
    isProduction: false,
    partNote: "trivial 5in square test cut (no E-codes)",
  },
];

// ---------------------------------------------------------------------------
// Real G-code parser → canonical ground-truth structure
// ---------------------------------------------------------------------------
interface ParsedProgram {
  e_codes: string[]; // distinct, in first-seen order
  pass_count: number; // distinct E-codes (passes per profile)
  h_offsets: Record<string, number>; // from "H1 =.0085 + H175" header
  feed_rates: number[]; // per-pass feed (ipm), in pass order
  m_codes: string[]; // distinct
  uses_taper: boolean; // U/V axis present
  e_code_family: string;
  move_count: number;
  raw_lines: number;
}

function parseWireProgram(text: string): ParsedProgram {
  const lines = text.split(/\r?\n/);
  const hOffsets: Record<string, number> = {};
  const eOrder: string[] = [];
  const feedByPass: Record<number, number> = {};
  const eByPass: Record<number, string> = {};
  const mSet = new Set<string>();
  let usesTaper = false;
  let moveCount = 0;

  // header offsets: "H1 =.0085 + H175"  /  "H175 = 0.0000"
  const hRe = /^\s*(H\d+)\s*=\s*([+\-]?\.?\d*\.?\d+)/;
  // pass line: "N50 E1221 H1 F.12 (PASS=1)"  (F optional → inherits prior)
  const eRe = /\bE(\d{3,4})\b(?:\s+H\d+)?(?:\s+F(\.?\d*\.?\d+))?[^\n]*?\(PASS=(\d+)\)/i;
  // bare E without PASS label (rare)
  const eBareRe = /\bE(\d{3,4})\b/;

  for (const line of lines) {
    const hm = line.match(hRe);
    if (hm) {
      const v = parseFloat(hm[2].startsWith(".") ? "0" + hm[2] : hm[2]);
      if (!Number.isNaN(v)) hOffsets[hm[1]] = v;
    }
    for (const tok of line.match(/\bM\d{1,3}\b/g) ?? []) mSet.add(tok);
    if (/\bG[0-3]\b/.test(line) && /[XY]-?\.?\d/.test(line)) moveCount++;
    if (/\bU-?\.?\d/.test(line) && /\bV-?\.?\d/.test(line)) usesTaper = true;

    const em = line.match(eRe);
    if (em) {
      const eCode = "E" + em[1];
      const pass = parseInt(em[3], 10);
      if (!eByPass[pass]) eByPass[pass] = eCode;
      if (!eOrder.includes(eCode)) eOrder.push(eCode);
      if (em[2] !== undefined) {
        const f = parseFloat(em[2].startsWith(".") ? "0" + em[2] : em[2]);
        if (!Number.isNaN(f) && feedByPass[pass] === undefined) feedByPass[pass] = f;
      }
    } else {
      const eb = line.match(eBareRe);
      if (eb && /\bH\d+\b/.test(line)) {
        const eCode = "E" + eb[1];
        if (!eOrder.includes(eCode)) eOrder.push(eCode);
      }
    }
  }

  // feed-rate inheritance: a pass with no explicit F inherits the previous pass feed
  const passNums = Object.keys(eByPass).map(Number).sort((a, b) => a - b);
  const feeds: number[] = [];
  let lastFeed = NaN;
  for (const p of passNums) {
    if (feedByPass[p] !== undefined) lastFeed = feedByPass[p];
    if (!Number.isNaN(lastFeed)) feeds.push(lastFeed);
  }

  return {
    e_codes: eOrder,
    pass_count: eOrder.length,
    h_offsets: hOffsets,
    feed_rates: feeds,
    m_codes: [...mSet].sort(),
    uses_taper: usesTaper,
    e_code_family: detectECodeFamily(eOrder),
    move_count: moveCount,
    raw_lines: lines.length,
  };
}

// ---------------------------------------------------------------------------
// Thickness sweep: find the band where the predictor reproduces GT family
// ---------------------------------------------------------------------------
function thicknessBandForFamily(
  material: string,
  needsTaper: boolean,
  targetFamily: string,
): { lo_mm: number | null; hi_mm: number | null; anyMatch: boolean; sample?: ReturnType<typeof getJMDiePatternForMaterial> } {
  let lo: number | null = null;
  let hi: number | null = null;
  let sample: ReturnType<typeof getJMDiePatternForMaterial> | undefined;
  for (let t = 0.5; t <= 80; t += 0.5) {
    const pred = getJMDiePatternForMaterial(material, t, needsTaper);
    if (pred.e_code_family === targetFamily) {
      if (lo === null) lo = t;
      hi = t;
      if (!sample) sample = pred;
    }
  }
  return { lo_mm: lo, hi_mm: hi, anyMatch: lo !== null, sample };
}

// ---------------------------------------------------------------------------
// Numeric comparison helpers
// ---------------------------------------------------------------------------
function offsetAccuracy(
  predicted: Record<string, number>,
  truth: Record<string, number>,
): { pairs: number; maxAbsErr: number; meanAbsErr: number; exact: boolean } {
  const keys = Object.keys(truth).filter((k) => k !== "H175");
  let sum = 0;
  let max = 0;
  let n = 0;
  for (const k of keys) {
    if (predicted[k] === undefined) continue;
    const err = Math.abs(predicted[k] - truth[k]);
    sum += err;
    max = Math.max(max, err);
    n++;
  }
  return { pairs: n, maxAbsErr: max, meanAbsErr: n ? sum / n : NaN, exact: n > 0 && max < 1e-9 };
}

function feedAccuracy(predicted: number[], truth: number[]): { pairs: number; maxAbsErr: number; meanAbsErr: number; exact: boolean } {
  const n = Math.min(predicted.length, truth.length);
  let sum = 0;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const err = Math.abs(predicted[i] - truth[i]);
    sum += err;
    max = Math.max(max, err);
  }
  return { pairs: n, maxAbsErr: max, meanAbsErr: n ? sum / n : NaN, exact: n > 0 && max < 1e-9 };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
interface ProgramResult {
  id: string;
  material: string;
  isProduction: boolean;
  parsed: ParsedProgram;
  familyMatch: boolean;
  thicknessBand: { lo_mm: number | null; hi_mm: number | null };
  passCountMatch: boolean;
  offsetExact: boolean;
  offsetMaxAbsErrIn: number;
  feedExact: boolean;
  feedMaxAbsErrIpm: number;
  taperMatch: boolean;
  score: number; // 0..1
  gaps: string[];
}

function scoreProgram(spec: GroundTruthSpec, parsed: ParsedProgram): ProgramResult {
  const gaps: string[] = [];

  // trivial / non-parameterized programs: report but don't fake a score
  if (parsed.e_codes.length === 0) {
    return {
      id: spec.id, material: spec.material, isProduction: spec.isProduction, parsed,
      familyMatch: false, thicknessBand: { lo_mm: null, hi_mm: null },
      passCountMatch: false, offsetExact: false, offsetMaxAbsErrIn: NaN,
      feedExact: false, feedMaxAbsErrIpm: NaN, taperMatch: true, score: NaN,
      gaps: ["no E-codes — non-parameterized test program; not scoreable as a print→program reproduction"],
    };
  }

  const band = thicknessBandForFamily(spec.material, parsed.uses_taper, parsed.e_code_family);
  const familyMatch = band.anyMatch;
  if (!familyMatch) {
    gaps.push(
      `MODEL GAP: predictor cannot reproduce GT family '${parsed.e_code_family}' for material='${spec.material}' taper=${parsed.uses_taper} at ANY thickness 0.5–80mm`,
    );
  }

  const pred = band.sample;
  const passCountMatch = !!pred && pred.num_passes === parsed.pass_count;
  if (pred && !passCountMatch) gaps.push(`pass_count: predicted ${pred.num_passes} vs GT ${parsed.pass_count}`);

  const oa = pred ? offsetAccuracy(pred.h_offsets, parsed.h_offsets) : { pairs: 0, maxAbsErr: NaN, meanAbsErr: NaN, exact: false };
  const fa = pred ? feedAccuracy(pred.feed_rates_ipm, parsed.feed_rates) : { pairs: 0, maxAbsErr: NaN, meanAbsErr: NaN, exact: false };
  if (pred && oa.pairs > 0 && !oa.exact) gaps.push(`H-offset max abs err ${(oa.maxAbsErr).toFixed(5)}" over ${oa.pairs} passes`);
  if (pred && fa.pairs > 0 && !fa.exact) gaps.push(`feed max abs err ${(fa.maxAbsErr).toFixed(3)} ipm over ${fa.pairs} passes`);

  // taper: predictor uses taper iff needs_taper input — so this echoes the input;
  // the real check is that the GT family aligns with taper usage.
  const taperMatch = parsed.uses_taper ? parsed.e_code_family.includes("taper") : !parsed.e_code_family.includes("taper");
  if (!taperMatch) gaps.push(`taper/family mismatch: uses_taper=${parsed.uses_taper} but family='${parsed.e_code_family}'`);

  // weighted score
  let score = 0;
  score += familyMatch ? 0.35 : 0;
  score += passCountMatch ? 0.15 : 0;
  score += oa.exact ? 0.25 : (oa.pairs > 0 ? 0.25 * Math.max(0, 1 - oa.maxAbsErr / 0.001) : 0); // 0.001" tol band
  score += fa.exact ? 0.15 : (fa.pairs > 0 ? 0.15 * Math.max(0, 1 - fa.maxAbsErr / 0.05) : 0); // 0.05 ipm tol band
  score += taperMatch ? 0.1 : 0;

  return {
    id: spec.id, material: spec.material, isProduction: spec.isProduction, parsed,
    familyMatch, thicknessBand: { lo_mm: band.lo_mm, hi_mm: band.hi_mm },
    passCountMatch, offsetExact: oa.exact, offsetMaxAbsErrIn: oa.maxAbsErr,
    feedExact: fa.exact, feedMaxAbsErrIpm: fa.maxAbsErr, taperMatch,
    score, gaps,
  };
}

function checkReachableFamilies(): {
  declared: string[];
  registry: string[];
  patternsReachable: string[];
  patternsUnreachable: string[];
  techTableReachable: string[];
  techTableUnreachable: string[];
} {
  // Every family JM declares it uses must be PRODUCIBLE by a selector. If not →
  // that selector can never emit it = MODEL GAP. We test BOTH divergent selectors
  // (R7): patterns.ts getJMDiePatternForMaterial vs tech-tables.ts selectECodeFamily.
  const declared = Object.keys(JM_DIE_ECODE_FAMILY_DISTRIBUTION);
  const registry = JM_DIE_ECODE_FAMILIES.map((f) => f.id);
  const materials = ["D2", "A2", "S7", "M2", "H13", "stainless", "carbide", "1018", "A36", "brass", "copper", "inconel", "ti6al4v", "17-4PH", "CPM"];

  const patternsReachable = new Set<string>();
  for (const m of materials)
    for (const taper of [false, true])
      for (let t = 0.5; t <= 160; t += 0.5)
        patternsReachable.add(getJMDiePatternForMaterial(m, t, taper).e_code_family);

  const techReachable = new Set<string>();
  for (const m of materials)
    for (const taperAngle of [0, 2.5])
      for (const tol of [0.05, 0.004, 0.002])
        for (const ra of [0.8, 0.4, 0.15])
          for (let t = 0.5; t <= 160; t += 5) {
            const fam = selectECodeFamily({ material: m, taper_angle_deg: taperAngle, tolerance_mm: tol, target_ra_um: ra, thickness_mm: t });
            if (fam) techReachable.add(fam.id);
          }

  return {
    declared,
    registry,
    patternsReachable: [...patternsReachable].sort(),
    patternsUnreachable: declared.filter((f) => !patternsReachable.has(f)),
    techTableReachable: [...techReachable].sort(),
    techTableUnreachable: registry.filter((f) => !techReachable.has(f)),
  };
}

function main() {
  const results: ProgramResult[] = [];
  for (const spec of GROUND_TRUTH) {
    const full = resolve(REPO, spec.path);
    if (!existsSync(full)) {
      console.error(`!! MISSING ground truth: ${spec.path}`);
      continue;
    }
    const parsed = parseWireProgram(readFileSync(full, "utf8"));
    results.push(scoreProgram(spec, parsed));
  }

  const reach = checkReachableFamilies();

  // ---- console report ----
  console.log("\n================ WEDM print→program ACCURACY (iter-1: parameter layer) ================\n");
  const scored = results.filter((r) => r.isProduction && !Number.isNaN(r.score));
  for (const r of results) {
    const sc = Number.isNaN(r.score) ? "n/a " : (r.score * 100).toFixed(1).padStart(5) + "%";
    const band = r.thicknessBand.lo_mm === null ? "—" : `${r.thicknessBand.lo_mm}–${r.thicknessBand.hi_mm}mm`;
    console.log(`• ${r.id.padEnd(28)} [${sc}]  fam=${r.parsed.e_code_family.padEnd(22)} passes=${r.parsed.pass_count} taper=${r.parsed.uses_taper ? "Y" : "n"}  reproduce@thk=${band}`);
    if (r.parsed.feed_rates.length) console.log(`    GT feeds(ipm)=${JSON.stringify(r.parsed.feed_rates)}  GT H=${JSON.stringify(r.parsed.h_offsets)}`);
    for (const g of r.gaps) console.log(`    ⚠ ${g}`);
  }
  const mean = scored.length ? scored.reduce((a, r) => a + r.score, 0) / scored.length : 0;
  console.log(`\nMean reproduction accuracy (production programs, n=${scored.length}): ${(mean * 100).toFixed(1)}%`);
  console.log(`  ⚠ This is a REGRESSION-LOCK over the predictor's OWN calibration set, NOT out-of-sample accuracy:`);
  console.log(`    getJMDiePatternForMaterial was hand-derived from these exact ${scored.length} programs, and they are the`);
  console.log(`    entire raw-G-code wire corpus. 100% means "constants still match their source" — it cannot fall until`);
  console.log(`    held-out programs are added (see --heldout TODO). Real model gaps are in the reachability audit below.`);

  console.log("\n---- declared-vs-reachable JM E-code families (R7: two divergent selectors) ----");
  console.log(`declared families:        ${reach.declared.join(", ")}`);
  console.log(`registry (tech-tables):   ${reach.registry.length} → ${reach.registry.join(", ")}`);
  console.log(`patterns.ts  reachable:   ${reach.patternsReachable.join(", ")}`);
  if (reach.patternsUnreachable.length)
    console.log(`  ⚠ patterns.ts getJMDiePatternForMaterial can NEVER emit: ${reach.patternsUnreachable.join(", ")}  (silent-fallback selector — feeds WEDMNeuralTrainingEngine)`);
  console.log(`tech-tables  reachable:   ${reach.techTableReachable.join(", ")}`);
  if (reach.techTableUnreachable.length)
    console.log(`  ⚠ tech-tables selectECodeFamily can NEVER emit: ${reach.techTableUnreachable.join(", ")}`);
  else
    console.log(`  ✓ tech-tables selectECodeFamily reaches all ${reach.registry.length} registry families`);

  // ---- persisted report ----
  const outDir = resolve(REPO, "state/shared/wedm-p2p-accuracy");
  mkdirSync(outDir, { recursive: true });
  const report = {
    schemaVersion: "1.0.0",
    generatedBy: "wedm-print-to-program-accuracy.ts (slot:mike)",
    note: "iter-1 = parameter-selection layer (getJMDiePatternForMaterial). Not full G-code emission. meanReproductionAccuracyPct is a REGRESSION-LOCK over the predictor's own N=3 calibration set (the entire raw-G-code wire corpus), NOT out-of-sample accuracy — it cannot drop below 100% until a held-out corpus is added. The genuine print->program gaps live in patternsUnreachable / techTableUnreachable (R7 divergent selectors).",
    corpus: { rawWireGCode: scored.length, excludedTrivial: results.length - scored.length, minFilesExcluded: "Okuma lathe — see reference_min_files_not_wire_programs" },
    meanReproductionAccuracyPct: +(mean * 100).toFixed(2),
    results,
    declaredFamilies: reach.declared,
    registryFamilies: reach.registry,
    patternsReachable: reach.patternsReachable,
    patternsUnreachable: reach.patternsUnreachable,
    techTableReachable: reach.techTableReachable,
    techTableUnreachable: reach.techTableUnreachable,
  };
  writeFileSync(resolve(outDir, "accuracy-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nReport → state/shared/wedm-p2p-accuracy/accuracy-report.json\n`);
}

main();
