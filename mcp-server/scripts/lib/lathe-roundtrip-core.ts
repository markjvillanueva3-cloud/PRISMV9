/**
 * lathe-roundtrip-core.ts — shared substrate for the lathe print→program
 * roundtrip ACCURACY tools (slot:whiskey, WHISKEY-LATHE-ACCURACY-MS0).
 * ==========================================================================
 * Single source of truth for: JM Okuma .MIN ground-truth parsing, .MIN→TurningInput
 * derivation, regenerated-program parameter extraction, scoring, and corpus
 * sampling. Consumed by BOTH:
 *   - lathe-print-to-program-roundtrip-accuracy.ts  (one-shot scorer / Rung B)
 *   - lathe-closed-loop-trainer.ts                   (train/test calibration learner)
 * so the two report numbers are produced by the IDENTICAL parser (no drift).
 *
 * UNITS (R-units-first): .MIN is INCH (JM convention) — X/Z inch, F = IPR,
 * G96 S### = SFM (ft/min). TurningInput is MM. SFM compared in ft/min on both
 * sides; IPR compared in in/rev on both sides. All conversions centralized here.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  TurningInput,
  TurningFeature,
  TurningProgramResult,
} from "../../src/engines/TurningPrintToProgramEngine.js";

export const MM_PER_IN = 25.4;
export const M_PER_MIN_TO_SFM = 3.280839895; // 1 m/min = 3.28084 ft/min (SFM)
// lib is at mcp-server/scripts/lib/ → repo root is four up.
export const REPO = resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
export const CORPUS = "H:/PRISM/JM DIE/CNC LATHE";

export type OpCat = "rough" | "finish" | "drill" | "thread" | "groove" | "part_off";

export interface GroundTruth {
  toolStations: Set<string>;
  maxX_in: number;
  maxAbsZ_in: number;
  sfmByCat: Record<string, number[]>;
  iprByCat: Record<string, number[]>;
  cats: Set<OpCat>;
  hasThread: boolean; hasDrill: boolean; hasGroove: boolean; hasPartoff: boolean;
}

export interface RegenParams {
  cats: Set<OpCat>;
  sfmByCat: Record<string, number[]>;
  iprByCat: Record<string, number[]>;
  ok: boolean;
  toolCount: number;
}

export interface AxisScore { matched: number; compared: number; }

// ───────────── engine loader (tsx-ESM shim, memoized) ─────────────
// REQUIRED: importing the engine pulls in ToolCatalogEngine → catalogLoader.ts,
// which reads the CJS global `__dirname` at module-load. That is undefined under
// raw tsx ESM (works in vitest + esbuild dist). Define it at catalogLoader's real
// source dir BEFORE the dynamic import so its `join(__dirname,"..","data")` lands
// on src/data where the catalog JSONs live. Verified: engine import throws
// "ReferenceError: __dirname is not defined" without this.
let _engine: { runPipeline(i: TurningInput): TurningProgramResult } | null = null;
export async function getTurningEngine(): Promise<{ runPipeline(i: TurningInput): TurningProgramResult }> {
  if (_engine) return _engine;
  (globalThis as Record<string, unknown>).__dirname = join(REPO, "mcp-server", "src", "data");
  const mod = await import("../../src/engines/TurningPrintToProgramEngine.js");
  _engine = mod.turningPrintToProgramEngine;
  return _engine;
}

// ───────────────────────── corpus walk/sample ────────────────────
export function walkMin(dir: string, acc: string[]): void {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) walkMin(fp, acc);
    else if (/\.min$/i.test(e.name)) acc.push(fp);
  }
}
export function customerOf(fp: string): string {
  const parts = fp.split(/[\\/]/);
  const idx = parts.findIndex((p) => p.toUpperCase() === "CNC LATHE");
  return idx >= 0 && parts[idx + 2] ? parts[idx + 1] : "_root";
}
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function stratifiedSample(files: string[], n: number, rng: () => number): string[] {
  const buckets = new Map<string, string[]>();
  for (const f of files) {
    const c = customerOf(f);
    if (!buckets.has(c)) buckets.set(c, []);
    buckets.get(c)!.push(f);
  }
  for (const arr of buckets.values()) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  const order = [...buckets.keys()];
  const out: string[] = [];
  let progress = true;
  while (out.length < n && progress) {
    progress = false;
    for (const c of order) {
      const arr = buckets.get(c)!;
      if (arr.length) { out.push(arr.pop()!); progress = true; if (out.length >= n) break; }
    }
  }
  return out;
}

// ───────────────── OSP ground-truth extraction (INCH) ────────────
const RE_TOOL = /\bT(\d{4,8})\b/;
const RE_G96 = /\bG96\s*S(\d+(?:\.\d+)?)/i;
const RE_G97 = /\bG97\s*S(\d+(?:\.\d+)?)/i;
const RE_FEED = /\bF(\d*\.\d+|\d+\.?\d*)\b/i;
const RE_X = /\bX(-?\d*\.?\d+)/i;
const RE_Z = /\bZ(-?\d*\.?\d+)/i;
const RE_MOVE = /\bG0?([0123])\b/;

export function parseGroundTruth(text: string, fileName: string): GroundTruth {
  const gt: GroundTruth = {
    toolStations: new Set(), maxX_in: 0, maxAbsZ_in: 0,
    sfmByCat: {}, iprByCat: {}, cats: new Set(),
    hasThread: false, hasDrill: false, hasGroove: false, hasPartoff: false,
  };
  const up = fileName.toUpperCase();
  if (/THREAD|THD|TAP|ACME|UNC|UNF/.test(up)) gt.hasThread = true;
  if (/CUTOFF|CUT-OFF|PART-?OFF|COFF|PARTOFF/.test(up)) gt.hasPartoff = true;
  if (/GROOVE|GRV/.test(up)) gt.hasGroove = true;

  let mode: "css" | "rpm" | null = null;
  let curSpeed: number | null = null;
  let lastX: number | null = null;
  let modalFeed: number | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const upper = raw.trim().toUpperCase();

    const mTool = upper.match(RE_TOOL);
    if (mTool) gt.toolStations.add(mTool[1].slice(0, 2));

    const mG96 = upper.match(RE_G96);
    if (mG96) { mode = "css"; curSpeed = parseFloat(mG96[1]); }
    const mG97 = upper.match(RE_G97);
    if (mG97) { mode = "rpm"; curSpeed = parseFloat(mG97[1]); }

    const isThreadLine = /\bG33\b|\bG76\b|THREAD/.test(upper);
    if (isThreadLine) gt.hasThread = true;
    if (/\bG75\b/.test(upper)) gt.hasGroove = true;

    const mX = upper.match(RE_X);
    if (mX) { lastX = Math.abs(parseFloat(mX[1])); if (lastX < 100) gt.maxX_in = Math.max(gt.maxX_in, lastX); }
    const mZ = upper.match(RE_Z);
    if (mZ) { const z = Math.abs(parseFloat(mZ[1])); if (z < 200) gt.maxAbsZ_in = Math.max(gt.maxAbsZ_in, z); }

    const mFeed = upper.match(RE_FEED);
    if (mFeed) modalFeed = parseFloat(mFeed[1]);

    const mMove = upper.match(RE_MOVE);
    const isCut = mMove && (mMove[1] === "1" || mMove[1] === "2" || mMove[1] === "3");
    if (!isCut) continue;

    const feedIpr = modalFeed && modalFeed > 0 && modalFeed < 1 ? modalFeed : null;
    const lineHasX = mX != null;
    const lineHasZ = /\bZ-?\.?\d/.test(upper);
    const isLinear = mMove![1] === "1";
    const isDrill = isLinear && lineHasZ && !lineHasX && lastX != null && lastX < 0.03;

    let sfm: number | null = null;
    if (mode === "css" && curSpeed) sfm = curSpeed;
    else if (mode === "rpm" && curSpeed && lastX && lastX > 0.02) sfm = (Math.PI * lastX * curSpeed) / 12;

    let cat: OpCat;
    if (isThreadLine) { cat = "thread"; gt.hasThread = true; }
    else if (isDrill) { cat = "drill"; gt.hasDrill = true; }
    else if (feedIpr != null && feedIpr >= 0.006) cat = "rough";
    else if (feedIpr != null && feedIpr > 0) cat = "finish";
    else continue;

    gt.cats.add(cat);
    if (feedIpr != null) (gt.iprByCat[cat] ??= []).push(feedIpr);
    if (sfm != null && isFinite(sfm) && sfm > 0 && sfm < 5000) (gt.sfmByCat[cat] ??= []).push(sfm);
  }
  if (gt.hasThread) gt.cats.add("thread");
  if (gt.hasGroove) gt.cats.add("groove");
  if (gt.hasPartoff) gt.cats.add("part_off");
  return gt;
}

export function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// ───────────── derive a TurningInput from the .MIN (INCH→MM) ──────
export function deriveInput(gt: GroundTruth, partNumber: string): TurningInput {
  const odIn = gt.maxX_in > 0.05 ? gt.maxX_in : 1.0;
  const lenIn = gt.maxAbsZ_in > 0.05 ? gt.maxAbsZ_in : 1.0;
  const odMm = odIn * MM_PER_IN;
  const lenMm = lenIn * MM_PER_IN;

  const features: TurningFeature[] = [];
  let fid = 0;
  const nextId = () => `F${++fid}`;

  features.push({ id: nextId(), type: "od_straight", od_mm: odMm * 0.9, length_mm: lenMm, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 });
  if (gt.hasDrill || gt.cats.has("drill")) {
    features.push({ id: nextId(), type: "drill_through", length_mm: lenMm, diameter_mm: Math.max(3, odMm * 0.25) });
  }
  if (gt.hasGroove || gt.cats.has("groove")) {
    features.push({ id: nextId(), type: "groove_od", od_mm: odMm * 0.9, length_mm: 3, groove_width_mm: 3, groove_depth_mm: 2 });
  }
  if (gt.hasThread || gt.cats.has("thread")) {
    features.push({ id: nextId(), type: "thread_od", od_mm: odMm * 0.9, length_mm: Math.min(lenMm, 20), thread_pitch_mm: 1.5 });
  }
  if (gt.hasPartoff || gt.cats.has("part_off")) {
    features.push({ id: nextId(), type: "part_off", od_mm: odMm, length_mm: 3 });
  }

  return {
    part_number: partNumber,
    material: { material_name: "1018 Steel", iso_group: "P" },
    bar_stock_od_mm: odMm,
    part_length_mm: lenMm,
    features,
    controller: "okuma",
    machine_brand: "Okuma",
  } as unknown as TurningInput;
}

// ───────────── regenerated-program param extraction ──────────────
export function regenCatOf(opType: string): OpCat | null {
  if (/thread/.test(opType)) return "thread";
  if (/drill|center_drill|bore/.test(opType)) return "drill";
  if (/groove/.test(opType)) return "groove";
  if (/part_off/.test(opType)) return "part_off";
  if (/rough/.test(opType)) return "rough";
  if (/finish/.test(opType)) return "finish";
  return null;
}

export function regenParams(result: TurningProgramResult): RegenParams {
  const rp: RegenParams = { cats: new Set(), sfmByCat: {}, iprByCat: {}, ok: result.success, toolCount: result.total_tool_changes };
  for (const op of result.operations) {
    const cat = regenCatOf(op.operation_type);
    if (!cat) continue;
    rp.cats.add(cat);
    const cp = op.cutting_params;
    if (cp) {
      if (typeof cp.cutting_speed_m_min === "number" && cp.cutting_speed_m_min > 0) {
        (rp.sfmByCat[cat] ??= []).push(cp.cutting_speed_m_min * M_PER_MIN_TO_SFM);
      }
      if (typeof cp.feed_mm_rev === "number" && cp.feed_mm_rev > 0) {
        (rp.iprByCat[cat] ??= []).push(cp.feed_mm_rev / MM_PER_IN);
      }
    }
  }
  return rp;
}

// ─────────────────────────── scoring ─────────────────────────────
export function withinBand(orig: number, regen: number, band: number): boolean {
  if (orig <= 0) return false;
  const ratio = regen / orig;
  return ratio >= (1 - band) && ratio <= (1 + band);
}

export function scoreParam(
  origBy: Record<string, number[]>, regenBy: Record<string, number[]>, band: number,
): AxisScore {
  let matched = 0, compared = 0;
  for (const cat of Object.keys(origBy)) {
    const o = median(origBy[cat]);
    const r = median(regenBy[cat] ?? []);
    if (o == null) continue;
    if (r == null) { compared++; continue; }
    compared++;
    if (withinBand(o, r, band)) matched++;
  }
  return { matched, compared };
}
