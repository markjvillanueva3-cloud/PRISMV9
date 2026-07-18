#!/usr/bin/env npx tsx
/**
 * mill-print-to-program-roundtrip-accuracy.ts — slot:foxtrot (Milling Wizard)
 * ===========================================================================
 * The MILL analog of whiskey's lathe-print-to-program-roundtrip-accuracy.ts —
 * the TRUE print→program→post roundtrip accuracy measurement the work order
 * asks for ("read print, write program, post g-code, compare to existing
 * programs, ensure our data is optimized") for ALL mill programs in the JM
 * system.
 *
 * WHY THIS CAN EXIST NOW (R12 honest framing):
 *   MillingPrintToProgramEngine.runFullPipeline() already produces a complete
 *   mill program headlessly (intake → features → ops → G-code → safety). This
 *   harness closes the loop against the JM master-programmer corpus:
 *
 *     existing JM mill program  (ground truth, master output: Haas/Hurco/Roku)
 *        │  parse → params + envelope (units: detect G20 inch / G21 mm)
 *        ▼
 *     derive a MillingInput  (stock extents, op-derived features, inferred mat'l)
 *        │  millingPrintToProgramEngine.runFullPipeline()
 *        ▼
 *     regenerated PRISM program  (operations + controller G-code)
 *        │  diff regenerated params vs the ORIGINAL program
 *        ▼
 *     per-program accuracy + corpus aggregate + data-optimization punch list
 *
 * WHAT "ACCURACY" MEANS HERE (NOT byte-match — two correct programmers emit
 * different valid G-code; byte-match is neither achievable nor meaningful):
 *   PARAMETER-ENVELOPE AGREEMENT per operation category —
 *     - op_coverage : did PRISM plan the same op categories the master used?
 *     - rpm_match   : regenerated spindle RPM within ±band of the master's
 *     - feed_match  : regenerated feed (mm/min) within ±band of the master's
 *   Tolerance band default ±35% (machining speeds/feeds legitimately vary by
 *   insert grade / coolant / rigidity; ±35% is the "same ballpark, JM-realistic"
 *   threshold — tunable via --band). Same honesty contract as the lathe rung.
 *
 * MILL IS CLEANER THAN LATHE for the speed axis: mill G-code states spindle RPM
 * (S word) and feed (F word, IPM in the default G94 mode) DIRECTLY — no tool
 * diameter needed to recover them (lathe needs diameter to turn G97 RPM into
 * SFM). So we compare RPM directly. CAVEAT (surfaced in the report): RPM and
 * feed are still COUPLED to tool selection — RPM = Vc·1000/(π·D), feed =
 * fz·flutes·RPM — so a miss can reflect PRISM's Vc/fz physics OR a
 * tool-diameter / flute-count divergence from the master. op_coverage is the
 * cleanest, least-coupled axis.
 *
 * CHIP THICKNESS (the work order's emphasis): ground-truth feed-per-tooth (fz)
 * is NOT extractable from the master G-code alone (needs the tool table:
 * diameter + flute count, which live in the setup sheet, not the program). So
 * we report PRISM's regenerated fz distribution per category as a PRISM-side
 * chip-load surface (honest: this is what PRISM *plans*, not a vs-master diff).
 *
 * MATERIAL INFERENCE (closes the lathe rung's documented #1 limitation): the
 * lathe rung forced 1018/ISO-P for every part, which systematically depressed
 * the speed axis because JM parts are cut in harder material. JM is a DIE shop
 * — its mill corpus is dominated by tool steels (D2, A2, S7, H13, M2) run hard.
 * This harness infers material from the filename + program comments (a die-shop
 * keyword dictionary) so PRISM gets the right ISO group → recommends the right
 * (lower) Vc → the RPM axis is not artificially depressed. Inferred-vs-defaulted
 * counts are reported; the default is a conservative middle (4140 / ISO-P), NOT
 * the most-aggressive case.
 *
 * We DO NOT claim 100% unless the data earns it (R12). The headline is the real
 * measured number; the per-category punch list says WHERE the data needs work.
 *
 * Usage:
 *   npx tsx scripts/mill-print-to-program-roundtrip-accuracy.ts            # 60 stratified
 *   npx tsx scripts/mill-print-to-program-roundtrip-accuracy.ts --sample 120
 *   npx tsx scripts/mill-print-to-program-roundtrip-accuracy.ts --all      # entire corpus (slow)
 *   npx tsx scripts/mill-print-to-program-roundtrip-accuracy.ts --band 0.5
 *   npx tsx scripts/mill-print-to-program-roundtrip-accuracy.ts --dir "ROKU-ROKU"
 *
 * Output:
 *   state/shared/dashboards/mill-roundtrip-accuracy.json
 *   state/shared/dashboards/mill-roundtrip-accuracy.md
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  MillingInput,
  MillingFeature,
  MillingProgramResult,
  MillingController,
} from "../src/engines/MillingPrintToProgramEngine.js";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

// ── tsx-ESM shim (must precede the engine import) ─────────────────
// REQUIRED — same root cause as the lathe harness: ToolCatalogEngine (a
// transitive dep of MillingPrintToProgramEngine) runs its catalog load at
// import time and computes its data dir from the CJS global `__dirname`, which
// is undefined under raw `tsx` ESM. Defining it at catalogLoader's REAL source
// dir (mcp-server/src/data) makes `join(__dirname,"..","data")` resolve back to
// the catalog JSONs. Engine import below is dynamic so this runs first.
(globalThis as Record<string, unknown>).__dirname = join(REPO, "mcp-server", "src", "data");

const { millingPrintToProgramEngine } =
  await import("../src/engines/MillingPrintToProgramEngine.js");

// JM mill corpus roots (VMC programs — Haas/Hurco/Roku-Roku). The lathe corpus
// (CNC LATHE) and EDM/Multus are deliberately excluded (different domains).
const CORPUS_ROOT = "H:/PRISM/JM DIE";
const MILL_DIRS = ["CNC MILL HAAS", "HAAS-HURCO", "HURCO CNC PROGRAMS", "ROKU-ROKU"] as const;
const OUT_DIR = join(REPO, "state", "shared", "dashboards");
const MM_PER_IN = 25.4;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // skip pathological / non-program blobs

// Accept common NC text extensions + extensionless (Haas O-number files).
// `.hnc` is Hurco WinMax NC — the HURCO CNC PROGRAMS + HAAS-HURCO dirs are 100%
// .hnc, so omitting it silently dropped ~36 real JM mill programs (corpus audit
// 2026-06-03). `.min` is Okuma OSP. The rest of those dirs is Mastercam .mcx-N
// (CAM source) + Inventor .ipt/.iam (CAD) — correctly excluded by BLOCK_EXT.
const NC_EXT = /\.(nc|hnc|min|eia|txt|pgm|mpf|cnc|anc|fnc|tap|ngc|prg|pim|sub|h)$/i;
// Hard-blocklist CAM/CAD source + binary/doc files. Critical: Mastercam .mcx-N
// (e.g. "9098614.mcx-8") would otherwise pass the extensionless path and be
// read as 100k lines of binary garbage that fools the param regexes.
const BLOCK_EXT = /\.(mcx|mcx-\d+|mcam|emcam|emc|vnc|prt|sldprt|sldasm|catpart|step|stp|igs|iges|x_t|x_b|dxf|dwg|pdf|xls|xlsx|csv|doc|docx|ppt|pptx|jpg|jpeg|png|gif|bmp|tif|zip|rar|7z|stl|3mf|bak|lnk|db|ini|log|exe|dll)$/i;

// ───────────────────────────── args ─────────────────────────────
interface Args { sample: number; all: boolean; dir: string | null; band: number; seed: number; }
function parseArgs(argv: string[]): Args {
  const a: Args = { sample: 60, all: false, dir: null, band: 0.35, seed: 1337 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--sample") a.sample = parseInt(argv[++i], 10) || a.sample;
    else if (t.startsWith("--sample=")) a.sample = parseInt(t.slice(9), 10) || a.sample;
    else if (t === "--band") a.band = parseFloat(argv[++i]) || a.band;
    else if (t.startsWith("--band=")) a.band = parseFloat(t.slice(7)) || a.band;
    else if (t === "--dir") a.dir = argv[++i];
    else if (t.startsWith("--dir=")) a.dir = t.slice(6);
    else if (t === "--seed") a.seed = parseInt(argv[++i], 10) || a.seed;
  }
  return a;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── corpus walk ──────────────────────────
interface CorpusFile { path: string; rootDir: string; bucket: string; }

function walk(dir: string, rootDir: string, acc: CorpusFile[]): void {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) { walk(fp, rootDir, acc); continue; }
    if (BLOCK_EXT.test(e.name)) continue;          // CAM/CAD/binary — never an NC program
    const hasExt = /\.[a-z0-9-]+$/i.test(e.name);  // dash so "mcx-8"-style ext is recognized
    if (hasExt && !NC_EXT.test(e.name)) continue;  // wrong extension — skip
    acc.push({ path: fp, rootDir, bucket: bucketOf(fp, rootDir) });
  }
}

/** Stratification bucket: the first path segment under the corpus root dir. */
function bucketOf(fp: string, rootDir: string): string {
  const parts = fp.split(/[\\/]/);
  const idx = parts.findIndex((p) => p === rootDir);
  return idx >= 0 && parts[idx + 2] ? `${rootDir}/${parts[idx + 1]}` : rootDir;
}

function stratifiedSample(files: CorpusFile[], n: number, rng: () => number): CorpusFile[] {
  const buckets = new Map<string, CorpusFile[]>();
  for (const f of files) {
    if (!buckets.has(f.bucket)) buckets.set(f.bucket, []);
    buckets.get(f.bucket)!.push(f);
  }
  for (const arr of buckets.values()) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  const order = [...buckets.keys()];
  const out: CorpusFile[] = [];
  let progress = true;
  while (out.length < n && progress) {
    progress = false;
    for (const b of order) {
      const arr = buckets.get(b)!;
      if (arr.length) { out.push(arr.pop()!); progress = true; if (out.length >= n) break; }
    }
  }
  return out;
}

// ── controller per corpus dir (drives the regen post dialect) ─────
function controllerForDir(rootDir: string): { controller: MillingController; brand: string; machine: MillingInput["machine"] } {
  if (/ROKU/i.test(rootDir)) return { controller: "fanuc", brand: "Roku-Roku", machine: "roku_roku_hsm5" };
  if (/HURCO/i.test(rootDir)) return { controller: "hurco_winmax", brand: "Hurco", machine: "hurco_vm10i" };
  return { controller: "haas_ngc", brand: "Haas", machine: "haas_vf2" }; // CNC MILL HAAS, HAAS-HURCO default
}

// ── material inference (die-shop keyword dictionary) ──────────────
type ISO = "P" | "M" | "K" | "N" | "S" | "H";
interface InferredMaterial { material_name: string; iso_group: ISO; hardness_hrc?: number; is_hardened?: boolean; inferred: boolean; }

// Ordered most-specific → least. Each entry: keyword regex → material.
const MATERIAL_RULES: Array<{ re: RegExp; m: Omit<InferredMaterial, "inferred"> }> = [
  { re: /\bCARBIDE\b|\bCARB\b/i,                  m: { material_name: "Tungsten Carbide", iso_group: "H", hardness_hrc: 70, is_hardened: true } },
  { re: /\bH13\b/i,                               m: { material_name: "H13 Tool Steel", iso_group: "H", hardness_hrc: 50, is_hardened: true } },
  { re: /\bD2\b/i,                                m: { material_name: "D2 Tool Steel", iso_group: "H", hardness_hrc: 58, is_hardened: true } },
  { re: /\bA2\b/i,                                m: { material_name: "A2 Tool Steel", iso_group: "H", hardness_hrc: 58, is_hardened: true } },
  { re: /\bS7\b/i,                                m: { material_name: "S7 Tool Steel", iso_group: "H", hardness_hrc: 56, is_hardened: true } },
  { re: /\bM2\b|\bM4\b|\bHSS\b/i,                 m: { material_name: "M2 HSS", iso_group: "H", hardness_hrc: 62, is_hardened: true } },
  { re: /\bO1\b|\bA6\b|\bP20\b/i,                 m: { material_name: "P20 Mold Steel", iso_group: "P", hardness_hrc: 30 } },
  { re: /\b4140\b|\b4150\b|\b4340\b|\bPH\b/i,     m: { material_name: "4140 Alloy Steel", iso_group: "P", hardness_hrc: 28 } },
  { re: /\b3(0[0-9]|1[0-9])\b|STAINLESS|\bSS\b|\b17-?4\b/i, m: { material_name: "304 Stainless", iso_group: "M" } },
  { re: /\bINCONEL\b|\b718\b|\bHASTELLOY\b|\bTITANIUM\b|\bTI-?6/i, m: { material_name: "Inconel 718", iso_group: "S" } },
  { re: /\bALUM|\bAL\b|\b6061\b|\b7075\b|\b2024\b|\bMIC-?6\b/i, m: { material_name: "6061 Aluminum", iso_group: "N" } },
  { re: /\bBRASS\b|\bBRONZE\b|\bBRS\b|\bC360\b/i, m: { material_name: "Brass C360", iso_group: "N" } },
  { re: /\bCAST\b|\bIRON\b|\bGRAY\b|\bDUCTILE\b/i, m: { material_name: "Gray Cast Iron", iso_group: "K" } },
  { re: /\b1018\b|\b1045\b|\bA36\b|\bCRS\b|\bHRS\b|\bMILD\b/i, m: { material_name: "1018 Steel", iso_group: "P" } },
];

const DEFAULT_MATERIAL: Omit<InferredMaterial, "inferred"> =
  { material_name: "4140 Alloy Steel", iso_group: "P", hardness_hrc: 28 };

function inferMaterial(fileName: string, headComments: string): InferredMaterial {
  const hay = `${fileName} ${headComments}`;
  for (const rule of MATERIAL_RULES) {
    if (rule.re.test(hay)) return { ...rule.m, inferred: true };
  }
  return { ...DEFAULT_MATERIAL, inferred: false };
}

// ─────────────── mill ground-truth extraction ────────────────────
type OpCat = "drill" | "tap" | "bore" | "ream" | "thread" | "mill_cut";

interface GroundTruth {
  tools: Set<string>;
  units: "inch" | "mm";
  feedMode: "ipm" | "ipr";       // G94 vs G95 (mill default ipm)
  cats: Set<OpCat>;
  rpmByCat: Record<string, number[]>;
  feedByCat: Record<string, number[]>;   // normalized to mm/min
  xExtent: number; yExtent: number;      // mm
  maxDepth: number;                       // mm (deepest |Z| below 0)
  usable: boolean;
  feedReliable: boolean;                  // false for Okuma .MIN (OSP feed semantics differ from ISO G94)
}

const RE_TOOL = /\bT(\d{1,4})\b/;
const RE_S = /\bS(\d+(?:\.\d+)?)/i;
const RE_F = /\bF(\d*\.\d+|\d+\.?\d*)\b/i;
const RE_X = /\bX(-?\d*\.?\d+)/i;
const RE_Y = /\bY(-?\d*\.?\d+)/i;
const RE_Z = /\bZ(-?\d*\.?\d+)/i;
const RE_GMOVE = /\bG0?([0123])\b/;
// canned-cycle families
const RE_DRILL = /\bG8([123])\b|\bG73\b/;    // G81/82/83/73
const RE_TAP = /\bG8(4)\b|\bG74\b/;          // G84 rigid / G74 reverse tap
const RE_BORE = /\bG8([5-9])\b|\bG76\b/;     // G85..89 + G76 fine bore
const RE_CANCEL = /\bG80\b/;

function clampNum(n: number, lo: number, hi: number): boolean { return Number.isFinite(n) && n >= lo && n <= hi; }

function parseGroundTruth(text: string, fileName: string, isOkuma: boolean): GroundTruth {
  const gt: GroundTruth = {
    tools: new Set(), units: "inch", feedMode: "ipm", cats: new Set(),
    rpmByCat: {}, feedByCat: {},
    xExtent: 0, yExtent: 0, maxDepth: 0, usable: false,
    // Okuma OSP (.MIN) feed words do not follow ISO G94 ipm semantics reliably
    // (observed: F1.0-style values that scale to an implausible ~1 IPM). Until a
    // dedicated OSP feed parser exists, EXCLUDE Okuma feeds from the feed axis —
    // RPM (unambiguous) and op-coverage are still scored. Next-rung item.
    feedReliable: !isOkuma,
  };

  // Units + feed mode: first occurrence wins; JM mill default = inch + ipm.
  if (/\bG21\b/.test(text)) gt.units = "mm";
  else if (/\bG20\b/.test(text)) gt.units = "inch";
  if (/\bG95\b/.test(text)) gt.feedMode = "ipr";

  // Filename keyword coverage hints.
  const up = fileName.toUpperCase();
  if (/TAP\b|THREAD|THD/.test(up)) gt.cats.add("tap");
  if (/DRILL|DRL|HOLE/.test(up)) gt.cats.add("drill");
  if (/BORE/.test(up)) gt.cats.add("bore");
  if (/REAM/.test(up)) gt.cats.add("ream");
  if (/FACE|POCKET|CONTOUR|PROFILE|MILL|SLOT/.test(up)) gt.cats.add("mill_cut");

  let modalS: number | null = null;
  let modalF: number | null = null;
  let lastT: string | null = null;
  let cannedCat: OpCat | null = null; // active canned cycle category (until G80)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  const inchToMm = (f: number) => (gt.units === "inch" ? f * MM_PER_IN : f);
  // Normalize a master feed word to mm/min. Handles both G94 (ipm / mm-min) and
  // G95 (per-rev) — for per-rev we recover mm/min via the modal spindle RPM, so
  // G95 programs (common on Okuma .MIN) still contribute a comparable feed sample.
  const feedMmMin = (f: number, rpm: number | null): number | null => {
    if (!Number.isFinite(f) || f <= 0) return null;
    const perUnit = gt.units === "inch" ? f * MM_PER_IN : f;
    const v = gt.feedMode === "ipr" ? (rpm != null ? perUnit * rpm : NaN) : perUnit;
    return clampNum(v, 1, 50000) ? v : null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("(") || line.startsWith(";")) continue;
    const u = line.toUpperCase();

    // Tool count: T-word and its M06 are often on separate lines (N50 T1 / M06),
    // so track the most-recent T-word and bank it whenever an M06 fires.
    const mT = u.match(RE_TOOL);
    if (mT) lastT = mT[1];
    if (/\bM0?6\b/.test(u) && lastT) gt.tools.add(lastT);

    const mS = u.match(RE_S);
    if (mS) { const s = parseFloat(mS[1]); if (clampNum(s, 30, 60000)) modalS = s; }
    const mF = u.match(RE_F);
    if (mF) { const f = parseFloat(mF[1]); if (f > 0) modalF = f; }

    // Canned-cycle transitions (these set the active op category + sample params).
    if (RE_CANCEL.test(u)) { cannedCat = null; }
    let cycleHere: OpCat | null = null;
    if (RE_DRILL.test(u)) cycleHere = "drill";
    else if (RE_TAP.test(u)) cycleHere = "tap";
    else if (RE_BORE.test(u)) cycleHere = "bore";
    if (cycleHere) { cannedCat = cycleHere; gt.cats.add(cycleHere); }

    // Coordinate extents (XY footprint, deepest Z) for stock derivation.
    const mX = u.match(RE_X); const mY = u.match(RE_Y); const mZ = u.match(RE_Z);
    if (mX) { const x = parseFloat(mX[1]); if (clampNum(x, -1000, 1000)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }
    if (mY) { const y = parseFloat(mY[1]); if (clampNum(y, -1000, 1000)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }
    if (mZ) { const z = parseFloat(mZ[1]); if (clampNum(z, -1000, 1000) && z < 0) gt.maxDepth = Math.max(gt.maxDepth, inchToMm(Math.abs(z))); }

    // Parameter sampling.
    // (a) Under an active canned cycle: this line's F is the cycle feed; modalS is the rpm.
    if (cannedCat && (cycleHere || /\bG9[89]\b/.test(u) || mZ)) {
      if (modalS != null) (gt.rpmByCat[cannedCat] ??= []).push(modalS);
      const fv = modalF != null ? feedMmMin(modalF, modalS) : null;
      if (fv != null && gt.feedReliable) (gt.feedByCat[cannedCat] ??= []).push(fv);
      continue;
    }

    // (b) A G1/G2/G3 feed move not under a canned cycle → mill_cut.
    const mMove = u.match(RE_GMOVE);
    const isCut = mMove && (mMove[1] === "1" || mMove[1] === "2" || mMove[1] === "3");
    if (isCut && (mX || mY)) {
      gt.cats.add("mill_cut");
      if (modalS != null) (gt.rpmByCat["mill_cut"] ??= []).push(modalS);
      const fv = modalF != null ? feedMmMin(modalF, modalS) : null;
      if (fv != null && gt.feedReliable) (gt.feedByCat["mill_cut"] ??= []).push(fv);
    }
  }

  if (isFinite(minX) && isFinite(maxX)) gt.xExtent = inchToMm(Math.max(0, maxX - minX));
  if (isFinite(minY) && isFinite(maxY)) gt.yExtent = inchToMm(Math.max(0, maxY - minY));
  // NC-program signature: % / M30 / M02 / O-number. CAM-source and binary blobs
  // lack these as \b-delimited tokens, so requiring one rejects garbage that the
  // param regexes might otherwise be fooled by (e.g. a Mastercam .mcx read as text).
  const hasNcSig = /(^|\r?\n)\s*%/.test(text) || /\bM30\b/i.test(text)
    || /\bM0?2\b/i.test(text) || /\bO\d{3,6}\b/.test(text);
  // "Usable" = NC signature AND ≥1 recovered spindle/feed parameter sample.
  gt.usable = hasNcSig && (Object.keys(gt.rpmByCat).length > 0 || Object.keys(gt.feedByCat).length > 0);
  return gt;
}

function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// ─────────── derive a MillingInput from the ground truth ──────────
function deriveInput(gt: GroundTruth, partNumber: string, mat: InferredMaterial,
                     dirInfo: ReturnType<typeof controllerForDir>): MillingInput {
  // Stock from XY footprint (+ envelope) and deepest cut; floors keep degenerate
  // single-op programs from producing zero-volume stock.
  const sx = Math.max(25, gt.xExtent > 1 ? gt.xExtent * 1.1 : 100);
  const sy = Math.max(25, gt.yExtent > 1 ? gt.yExtent * 1.1 : 100);
  const depth = Math.max(2, gt.maxDepth > 0.5 ? gt.maxDepth : 10);
  const sz = Math.max(depth + 6, 25);

  const features: MillingFeature[] = [];
  let fid = 0;
  const nextId = () => `F${++fid}`;

  // A face + closed pocket cover the milling (mill_cut) op category — present in
  // essentially every prismatic mill part.
  features.push({ id: nextId(), type: "face", width_mm: sx, length_mm: sy, depth_mm: 0.5, surface_finish_Ra_um: 1.6 });
  if (gt.cats.has("mill_cut") || gt.cats.size === 0) {
    features.push({ id: nextId(), type: "pocket_closed", width_mm: sx * 0.5, length_mm: sy * 0.5, depth_mm: depth, corner_radius_mm: 6, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 });
  }
  if (gt.cats.has("drill")) {
    features.push({ id: nextId(), type: "hole_through", diameter_mm: Math.max(3, Math.min(20, depth)), depth_mm: sz, position: { x: sx * 0.25, y: sy * 0.25, z: 0 } });
  }
  if (gt.cats.has("tap")) {
    features.push({ id: nextId(), type: "thread_internal", diameter_mm: 8, depth_mm: Math.min(depth, 16), thread_pitch_mm: 1.25, position: { x: sx * 0.75, y: sy * 0.25, z: 0 } });
  }
  if (gt.cats.has("bore") || gt.cats.has("ream")) {
    features.push({ id: nextId(), type: "bore_finish", diameter_mm: 25, depth_mm: depth, tolerance_mm: 0.02, surface_finish_Ra_um: 0.8, position: { x: sx * 0.5, y: sy * 0.75, z: 0 } });
  }

  return {
    part_number: partNumber,
    material: { material_name: mat.material_name, iso_group: mat.iso_group,
      ...(mat.hardness_hrc != null ? { hardness_hrc: mat.hardness_hrc } : {}),
      ...(mat.is_hardened ? { is_hardened: true } : {}) },
    stock_size: { x: sx, y: sy, z: sz },
    features,
    controller: dirInfo.controller,
    machine: dirInfo.machine,
    machine_brand: dirInfo.brand,
    optimization_target: "balanced",
  } as unknown as MillingInput;
}

// ─────────── regenerated-program param extraction ────────────────
function regenCatOf(opType: string): OpCat {
  if (/tap/.test(opType)) return "tap";
  if (/ream/.test(opType)) return "ream";
  if (/bore/.test(opType)) return "bore";
  if (/thread/.test(opType)) return "thread";
  if (/drill/.test(opType)) return "drill";
  return "mill_cut";
}

interface RegenParams {
  cats: Set<OpCat>;
  rpmByCat: Record<string, number[]>;
  feedByCat: Record<string, number[]>;       // mm/min
  fzByCat: Record<string, number[]>;          // feed-per-tooth mm (chip thickness)
  ok: boolean;
  toolCount: number;
}
function regenParams(result: MillingProgramResult): RegenParams {
  const rp: RegenParams = { cats: new Set(), rpmByCat: {}, feedByCat: {}, fzByCat: {}, ok: result.success, toolCount: result.total_tool_changes };
  for (const op of result.operations) {
    const cat = regenCatOf(op.operation_type);
    rp.cats.add(cat);
    const cp = op.cutting_params;
    if (!cp) continue;
    if (typeof cp.spindle_rpm === "number" && cp.spindle_rpm > 0) (rp.rpmByCat[cat] ??= []).push(cp.spindle_rpm);
    if (typeof cp.feed_mm_min === "number" && cp.feed_mm_min > 0) (rp.feedByCat[cat] ??= []).push(cp.feed_mm_min);
    if (typeof cp.feed_per_tooth_mm === "number" && cp.feed_per_tooth_mm > 0) (rp.fzByCat[cat] ??= []).push(cp.feed_per_tooth_mm);
  }
  return rp;
}

// ─────────────────────────── scoring ─────────────────────────────
function withinBand(orig: number, regen: number, band: number): boolean {
  if (orig <= 0) return false;
  const ratio = regen / orig;
  return ratio >= (1 - band) && ratio <= (1 + band);
}

interface AxisScore { matched: number; compared: number; }
// Only score categories the master used AND PRISM also planned (both medians
// present). A category PRISM never planned is an OP-COVERAGE gap (its own axis),
// NOT a parameter miss — counting it here would double-penalize one coverage
// failure across both rpm + feed (per-file scrutiny P1, 2026-06-03).
function scoreParam(origBy: Record<string, number[]>, regenBy: Record<string, number[]>, band: number): AxisScore {
  let matched = 0, compared = 0;
  for (const cat of Object.keys(origBy)) {
    const o = median(origBy[cat]);
    if (o == null) continue;
    const r = median(regenBy[cat] ?? []);
    if (r == null) continue; // PRISM didn't plan this op category — op-coverage axis captures it
    compared++;
    if (withinBand(o, r, band)) matched++;
  }
  return { matched, compared };
}

// ───────────────────────────── main ─────────────────────────────
async function main() {
  const args = parseArgs(process.argv);
  const t0 = Date.now();

  const all: CorpusFile[] = [];
  for (const d of MILL_DIRS) {
    if (args.dir && !d.toUpperCase().includes(args.dir.toUpperCase())) continue;
    walk(join(CORPUS_ROOT, d), d, all);
  }
  const rng = mulberry32(args.seed);
  const files = args.all ? all : stratifiedSample(all, Math.min(args.sample, all.length), rng);

  const perProgram: Array<Record<string, unknown>> = [];
  let nRegenFail = 0, nParseErr = 0, nSkipped = 0, nTooBig = 0, nRegenCritical = 0;
  let nInferredMat = 0, nDefaultMat = 0;
  const matHistogram: Record<string, number> = {};
  const accScores: number[] = [];
  let opMatched = 0, opCompared = 0, rpmMatched = 0, rpmCompared = 0, feedMatched = 0, feedCompared = 0;
  const missByCat: Record<string, { rpm: number; feed: number; op: number }> = {};
  const fzByCatCorpus: Record<string, number[]> = {};
  // Systematic-bias accumulators: regen/master ratio per category (geomean'd at
  // the end). This is the single most actionable "ensure data is optimized"
  // signal — it says whether PRISM is consistently fast/slow, not just off-band.
  const rpmRatioByCat: Record<string, number[]> = {};
  const feedRatioByCat: Record<string, number[]> = {};

  for (const cf of files) {
    let text: string;
    try {
      const sz = statSync(cf.path).size;
      if (sz > MAX_FILE_BYTES) { nTooBig++; continue; }
      text = readFileSync(cf.path, "latin1");
    } catch { nParseErr++; continue; }

    const fileName = cf.path.split(/[\\/]/).pop()!;
    const isOkuma = /\.min$/i.test(fileName); // Okuma OSP — feeds excluded, RPM kept
    const gt = parseGroundTruth(text, fileName, isOkuma);
    if (!gt.usable) { nSkipped++; continue; }

    const mat = inferMaterial(fileName, text.slice(0, 2000));
    if (mat.inferred) nInferredMat++; else nDefaultMat++;
    matHistogram[mat.material_name] = (matHistogram[mat.material_name] ?? 0) + 1;

    let dirInfo = controllerForDir(cf.rootDir);
    if (isOkuma) dirInfo = { controller: "okuma_osp", brand: "Okuma", machine: "okuma_mu4000v" }; // .MIN = Okuma OSP, not the dir's default
    let result: MillingProgramResult;
    try {
      result = millingPrintToProgramEngine.runFullPipeline(deriveInput(gt, fileName.replace(NC_EXT, ""), mat, dirInfo));
    } catch { nRegenFail++; continue; }
    const rp = regenParams(result);
    // Exclude critical-fail regens from scoring: the engine returns success=false
    // when a critical safety/envelope check rejected the plan, so its params are
    // untrustworthy. Count + disclose; never let a rejected plan score (R12 + per-file scrutiny P1).
    if (!rp.ok) { nRegenCritical++; continue; }

    // op coverage: of the categories the master used, how many did PRISM plan?
    let opM = 0, opC = 0;
    for (const cat of gt.cats) { opC++; if (rp.cats.has(cat)) opM++; else (missByCat[cat] ??= { rpm: 0, feed: 0, op: 0 }).op++; }

    const rpm = scoreParam(gt.rpmByCat, rp.rpmByCat, args.band);
    const feed = scoreParam(gt.feedByCat, rp.feedByCat, args.band);
    for (const cat of Object.keys(gt.rpmByCat)) {
      const o = median(gt.rpmByCat[cat]); const r = median(rp.rpmByCat[cat] ?? []);
      if (o != null && (r == null || !withinBand(o, r, args.band))) (missByCat[cat] ??= { rpm: 0, feed: 0, op: 0 }).rpm++;
    }
    for (const cat of Object.keys(gt.feedByCat)) {
      const o = median(gt.feedByCat[cat]); const r = median(rp.feedByCat[cat] ?? []);
      if (o != null && (r == null || !withinBand(o, r, args.band))) (missByCat[cat] ??= { rpm: 0, feed: 0, op: 0 }).feed++;
    }
    for (const [cat, arr] of Object.entries(rp.fzByCat)) (fzByCatCorpus[cat] ??= []).push(...arr);
    // Systematic-bias capture (only when BOTH master + regen have a median).
    for (const cat of Object.keys(gt.rpmByCat)) {
      const o = median(gt.rpmByCat[cat]); const r = median(rp.rpmByCat[cat] ?? []);
      if (o != null && r != null && o > 0) (rpmRatioByCat[cat] ??= []).push(r / o);
    }
    for (const cat of Object.keys(gt.feedByCat)) {
      const o = median(gt.feedByCat[cat]); const r = median(rp.feedByCat[cat] ?? []);
      if (o != null && r != null && o > 0) (feedRatioByCat[cat] ??= []).push(r / o);
    }

    opMatched += opM; opCompared += opC;
    rpmMatched += rpm.matched; rpmCompared += rpm.compared;
    feedMatched += feed.matched; feedCompared += feed.compared;

    // Headline accuracy = PHYSICS axes only (RPM + feed). op-coverage is EXCLUDED
    // because deriveInput synthesizes a feature for every master category, making
    // op-coverage ~tautologically 100% — folding it in would pad the number (R12,
    // per-file scrutiny P1). op-coverage is still reported as its own axis below.
    const axesCompared = rpm.compared + feed.compared;
    const axesMatched = rpm.matched + feed.matched;
    const acc = axesCompared > 0 ? axesMatched / axesCompared : null;
    if (acc != null) accScores.push(acc);

    if (perProgram.length < 250) {
      // Diagnostic medians: the actual master-vs-regen numbers per category, so a
      // miss is actionable ("master mill_cut 3000 RPM, PRISM 9000 → 3× fast").
      const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);
      const catDetail: Record<string, Record<string, number | null>> = {};
      for (const cat of gt.cats) {
        catDetail[cat] = {
          master_rpm: r1(median(gt.rpmByCat[cat] ?? [])),
          regen_rpm: r1(median(rp.rpmByCat[cat] ?? [])),
          master_feed_mm_min: r1(median(gt.feedByCat[cat] ?? [])),
          regen_feed_mm_min: r1(median(rp.feedByCat[cat] ?? [])),
        };
      }
      perProgram.push({
        file: fileName, bucket: cf.bucket, controller: dirInfo.controller,
        material: mat.material_name, mat_inferred: mat.inferred, units: gt.units, feed_mode: gt.feedMode,
        regen_ok: rp.ok, regen_tools: rp.toolCount, master_tools: gt.tools.size,
        op_coverage: `${opM}/${opC}`, rpm_match: `${rpm.matched}/${rpm.compared}`, feed_match: `${feed.matched}/${feed.compared}`,
        accuracy_pct: acc == null ? null : Math.round(acc * 1000) / 10,
        master_cats: [...gt.cats], regen_cats: [...rp.cats],
        cat_detail: catDetail,
      });
    }
  }

  const N = accScores.length;
  const meanAcc = N ? accScores.reduce((a, b) => a + b, 0) / N : 0;
  const sorted = [...accScores].sort((a, b) => a - b);
  const p = (q: number) => N ? Math.round(sorted[Math.min(N - 1, Math.floor(q * (N - 1)))] * 1000) / 10 : null;
  const fzSummary = Object.fromEntries(
    Object.entries(fzByCatCorpus).map(([c, arr]) => [c, { median_fz_mm: median(arr), n: arr.length }]),
  );
  const geomean = (arr: number[]) => (arr.length ? Math.exp(arr.reduce((a, b) => a + Math.log(b), 0) / arr.length) : null);
  const r2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);
  const biasOf = (by: Record<string, number[]>) => Object.fromEntries(
    Object.entries(by).map(([c, a]) => [c, { regen_over_master: r2(geomean(a)), n: a.length }]),
  );

  const report = {
    schemaVersion: "1.0.0",
    generated_at: new Date(t0).toISOString(),
    domain: "mill",
    rung: "B — TRUE print→program→post roundtrip (regenerate via MillingPrintToProgramEngine, diff vs JM master mill program)",
    honest_note:
      "Headline accuracy = PHYSICS PARAMETER-ENVELOPE AGREEMENT (spindle-RPM + feed within ±band) over op categories the " +
      "master used AND PRISM independently planned — NOT byte-match. op-coverage is reported as a SEPARATE diagnostic axis, " +
      "NOT folded into the headline: deriveInput synthesizes a feature for every detected master category, so op-coverage is " +
      "near-tautological (a derive-path sanity check, not an independent accuracy signal). Features are derived from the " +
      "master program (no paired print PDF yet), so a miss reflects PRISM physics/data OR derived-input divergence — the " +
      "per-category punch list + systematic-bias say which. Critical-fail regens are excluded. This is the real measured " +
      "number; it is NOT asserted as 100% unless the data earns it (R12).",
    KNOWN_LIMITATIONS: {
      tool_coupling:
        "RPM (=Vc·1000/(π·D)) and feed (=fz·flutes·RPM) are COUPLED to tool selection. A miss can reflect PRISM's Vc/fz " +
        "physics OR a tool-diameter / flute-count divergence from the master (the program states no tool geometry). " +
        "op_coverage is the cleanest, least-coupled axis.",
      ground_truth_fz:
        "Ground-truth feed-per-tooth (chip thickness) is NOT extractable from the master G-code (needs the tool table: " +
        "diameter + flute count, which live in the setup sheet). So fz is reported as PRISM's PLANNED chip-load surface " +
        "per category, not a vs-master diff.",
      material_default:
        "Material is inferred from filename + comments via a die-shop keyword dictionary; unmatched parts default to " +
        "4140 / ISO-P (conservative middle, NOT the most-aggressive case). Defaulted parts may mis-set Vc and depress the " +
        "RPM axis. The inferred/defaulted split + material histogram are in this report.",
      feature_inference:
        "Features (face/pocket/holes/threads/bores) are synthesized from detected op categories + coordinate extents, NOT " +
        "from a paired engineering drawing. Geometry-exact feature recovery is the next rung (print↔program pairing).",
      okuma_feed_excluded:
        "Okuma .MIN (OSP) feed words do not follow ISO G94 ipm semantics reliably (observed F1.0-style values scaling to ~1 " +
        "IPM, implausible for milling), so .MIN programs are EXCLUDED from the feed axis — their RPM + op-coverage are still " +
        "scored. A dedicated OSP feed parser is the next-rung fix; until then the feed-axis number reflects Haas/Fanuc/Hurco " +
        "(confirmed G94 ipm) programs only.",
      op_coverage_tautological:
        "op-coverage is NOT in the headline. deriveInput builds a feature for every detected master op category, so op-coverage " +
        "runs ~100% by construction — it confirms the category→feature→op→category derive path round-trips, NOT that PRISM plans " +
        "the right ops from a print. Read it as a sanity check; the physics axes (RPM/feed) carry the real signal.",
      critical_regens_excluded:
        "Regens where the engine returned success=false (a critical safety/envelope check rejected the plan) are counted " +
        "(corpus.regen_critical) but EXCLUDED from scoring — their params are untrustworthy by definition.",
      param_axis_scope:
        "The RPM/feed axes score ONLY categories the master used AND PRISM also planned (both medians present). A category PRISM " +
        "never planned is an op-coverage gap captured on that axis — not double-penalized as an RPM+feed miss.",
    },
    config: { band_pct: Math.round(args.band * 100), sample_mode: args.all ? "full" : "stratified", seed: args.seed, dir_filter: args.dir },
    corpus: {
      roots: MILL_DIRS, root_path: CORPUS_ROOT,
      scanned_total: all.length, regenerated: N,
      regen_failures: nRegenFail, regen_critical: nRegenCritical, parse_errors: nParseErr,
      skipped_no_groundtruth: nSkipped, skipped_too_big: nTooBig,
      reconciliation: "scanned_total ≈ regenerated + regen_failures + regen_critical + parse_errors + skipped_no_groundtruth + skipped_too_big (− unsampled when not --all)",
    },
    material_inference: { inferred: nInferredMat, defaulted: nDefaultMat, histogram: matHistogram },
    runtime_ms: Date.now() - t0,
    headline: {
      mean_accuracy_pct: Math.round(meanAcc * 1000) / 10,
      median_accuracy_pct: p(0.5), p25: p(0.25), p75: p(0.75),
      programs_scored: N,
    },
    axes: {
      op_coverage_pct: opCompared ? Math.round((opMatched / opCompared) * 1000) / 10 : null,
      rpm_in_band_pct: rpmCompared ? Math.round((rpmMatched / rpmCompared) * 1000) / 10 : null,
      feed_in_band_pct: feedCompared ? Math.round((feedMatched / feedCompared) * 1000) / 10 : null,
      op_n: opCompared, rpm_n: rpmCompared, feed_n: feedCompared,
    },
    systematic_bias_regen_over_master: {
      note: "geomean(regen/master) per category. ~1.0 = aligned; >1 PRISM faster, <1 slower. Most actionable data-optimization signal.",
      rpm: biasOf(rpmRatioByCat),
      feed: biasOf(feedRatioByCat),
    },
    prism_chip_load_surface_fz_mm: fzSummary,
    punch_list_by_category: Object.fromEntries(
      Object.entries(missByCat).sort((a, b) => (b[1].rpm + b[1].feed + b[1].op) - (a[1].rpm + a[1].feed + a[1].op)),
    ),
    programs_sampled: perProgram,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, "mill-roundtrip-accuracy.json");
  const mdPath = join(OUT_DIR, "mill-roundtrip-accuracy.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, renderMd(report));
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    ok: true, programs_scored: N, regen_failures: nRegenFail, skipped_no_groundtruth: nSkipped,
    mean_accuracy_pct: report.headline.mean_accuracy_pct,
    op_coverage_pct: report.axes.op_coverage_pct,
    rpm_in_band_pct: report.axes.rpm_in_band_pct,
    feed_in_band_pct: report.axes.feed_in_band_pct,
    material_inferred: nInferredMat, material_defaulted: nDefaultMat,
    json: jsonPath, md: mdPath, runtime_ms: report.runtime_ms,
  }, null, 2));
  // Hard-exit after the report is written: the engine holds heavy material/tool
  // registries + fire-and-forget outcome emissions; draining them during node
  // teardown OOMs on a memory-pressured fleet host (same lesson as the lathe rung).
  process.exit(0);
}

function d(x: unknown): string { return x == null ? "—" : String(x); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- report is a wide ad-hoc shape; md render is presentation-only
function renderMd(r: any): string {
  const h = r.headline, a = r.axes, m = r.material_inference;
  let md = `# JM Die Mill — Print→Program ROUNDTRIP Accuracy (Rung B)\n\n`;
  md += `_Generated ${r.generated_at} · ${r.config.sample_mode} sample · ${h.programs_scored} programs regenerated & scored `;
  md += `(${r.corpus.regen_failures} regen failures, ${r.corpus.parse_errors} parse errors, ${r.corpus.skipped_no_groundtruth} skipped) · ±${r.config.band_pct}% band · ${r.runtime_ms} ms_\n\n`;
  md += `> ${r.honest_note}\n\n`;
  md += `## Headline accuracy — PHYSICS axes only (RPM + feed; REAL measured, NOT asserted 100%)\n\n`;
  md += `- **Mean parameter-envelope accuracy: ${d(h.mean_accuracy_pct)}%** _(spindle-RPM + feed only; op-coverage excluded as tautological)_\n`;
  md += `- Median ${d(h.median_accuracy_pct)}% · p25 ${d(h.p25)}% · p75 ${d(h.p75)}%\n`;
  md += `- corpus: scanned ${d(r.corpus.scanned_total)} · regenerated ${d(r.corpus.regenerated)} · regen-fail ${d(r.corpus.regen_failures)} · regen-critical ${d(r.corpus.regen_critical)} · parse-err ${d(r.corpus.parse_errors)} · skipped-no-groundtruth ${d(r.corpus.skipped_no_groundtruth)} · skipped-too-big ${d(r.corpus.skipped_too_big)}\n\n`;
  md += `## Per-axis agreement (vs JM master mill program)\n\n`;
  md += `| axis | in-band % | n compared | notes |\n|----|----|----|----|\n`;
  md += `| op coverage (diagnostic — NOT in headline) | ${d(a.op_coverage_pct)} | ${d(a.op_n)} | ~tautological: a feature is synthesized per master cat |\n`;
  md += `| spindle RPM | ${d(a.rpm_in_band_pct)} | ${d(a.rpm_n)} | coupled to Vc AND tool diameter |\n`;
  md += `| feed (mm/min) | ${d(a.feed_in_band_pct)} | ${d(a.feed_n)} | coupled to fz, flutes, RPM |\n\n`;
  md += `## Systematic bias — geomean(regen / master) per category\n\n`;
  md += `_~1.0 = aligned · >1 PRISM faster than the master · <1 PRISM slower. The clearest "which way to tune the data" signal._\n\n`;
  md += `| op category | RPM bias (×) | feed bias (×) |\n|----|----|----|\n`;
  const biasCats = new Set([...Object.keys(r.systematic_bias_regen_over_master.rpm), ...Object.keys(r.systematic_bias_regen_over_master.feed)]);
  for (const cat of biasCats) {
    const rb = r.systematic_bias_regen_over_master.rpm[cat]; const fb = r.systematic_bias_regen_over_master.feed[cat];
    md += `| ${cat} | ${d(rb?.regen_over_master)} (n=${d(rb?.n ?? 0)}) | ${d(fb?.regen_over_master)} (n=${d(fb?.n ?? 0)}) |\n`;
  }
  md += `\n## Material inference (closes the lathe rung's #1 limitation)\n\n`;
  md += `- inferred from filename/comments: **${d(m.inferred)}** · defaulted to 4140/ISO-P: **${d(m.defaulted)}**\n`;
  md += `- histogram: ${Object.entries(r.material_inference.histogram).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}\n\n`;
  md += `## PRISM planned chip-load surface (fz, mm/tooth — work-order chip-thickness axis)\n\n`;
  md += `_Ground-truth fz is not in the G-code (needs tool table); this is what PRISM PLANS per category._\n\n`;
  md += `| op category | median fz (mm) | n ops |\n|----|----|----|\n`;
  for (const [cat, v] of Object.entries(r.prism_chip_load_surface_fz_mm) as Array<[string, { median_fz_mm: number | null; n: number }]>) {
    md += `| ${cat} | ${d(v.median_fz_mm)} | ${d(v.n)} |\n`;
  }
  md += `\n## Data-optimization punch list (most-divergent op categories)\n\n`;
  md += `| op category | RPM misses | feed misses | op-coverage misses |\n|----|----|----|----|\n`;
  for (const [cat, mm] of Object.entries(r.punch_list_by_category) as Array<[string, { rpm: number; feed: number; op: number }]>) {
    md += `| ${cat} | ${mm.rpm} | ${mm.feed} | ${mm.op} |\n`;
  }
  md += `\n### Known limitations (read before quoting the headline)\n`;
  for (const [k, v] of Object.entries(r.KNOWN_LIMITATIONS) as Array<[string, string]>) md += `- **${k}**: ${v}\n`;
  md += `\n_Full data: \`state/shared/dashboards/mill-roundtrip-accuracy.json\`. Sister lathe rung: \`lathe-roundtrip-accuracy.json\`._\n`;
  return md;
}

main().catch((e) => { console.error("mill roundtrip harness failed:", e); process.exit(1); });
