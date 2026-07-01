/**
 * MillProgramAnalyzerEngine — static G-code analysis + setup validation + SPC.
 *
 * STUB-RESCUE (slot:bravo 2026-05-26, U-STUB-HUNT-04, mill-galaxy). Original
 * was a 14-line stub returning {ok:false, stub:true, bytes}. millDispatcher
 * routes 4 actions here (`analyze`/`validate`/`validateSetup`/`analyzeSPC`)
 * — all received the stub. Real implementation now parses G/M-codes,
 * counts blocks, extracts F/S ranges, gates setup against physics rails,
 * and computes SPC basics (mean/sigma/Cp/Cpk).
 *
 * Soul rule (bravo): physics validation defers to MillingForceEngine
 * (canonical Kienzle from src/physics/constants.ts) — NEVER inlined.
 *
 * @version 2.0.0 — restored from stub
 */
import { millingForceEngine, type CalculateInput } from "./MillingForceEngine.js";

// ─── Constants ─────────────────────────────────────────────────────────────
const SPC_DEFAULT_SIGMA_MULTIPLIER = 3;   // ±3σ for Cp/Cpk per ISO 22514
const SHOP_FLOOR_OMEGA_MIN = 0.95;
const SHOP_FLOOR_SX_MIN = 0.98;

// ─── Types ─────────────────────────────────────────────────────────────────
export interface AnalysisResult {
  lineCount: number;
  blockCount: number;
  gCodeUsage: Record<string, number>;
  mCodeUsage: Record<string, number>;
  toolChanges: number;
  coolantStates: { on: number; off: number };
  feedRange: { min: number | null; max: number | null };
  spindleRange: { min: number | null; max: number | null };
  warnings: string[];
  errors: string[];
}

export interface ValidationResult extends AnalysisResult {
  ok: boolean;
}

export interface SetupValidationInput extends CalculateInput {
  machine?: { max_power_kw: number };
  safety_factor?: number;
  omegaMin?: number;
  sxMin?: number;
}

export interface SetupValidationResult {
  ok: boolean;
  power: ReturnType<typeof millingForceEngine.verifyPower>;
  omega: number;
  sx: number;
  violations: string[];
}

export interface SPCInput {
  measurements: number[];
  USL?: number;     // upper spec limit
  LSL?: number;     // lower spec limit
  target?: number;
}

export interface SPCResult {
  n: number;
  mean: number;
  sigma: number;
  min: number;
  max: number;
  range: number;
  Cp: number | null;
  Cpk: number | null;
  withinSpec: boolean | null;
}

// ─── Helpers (pure) ───────────────────────────────────────────────────────
function tokenize(line: string): string {
  return line.split(/[(;]/)[0].trim();   // strip parenthetical / semicolon comments
}

function extractWord(line: string, letter: string): number | null {
  const re = new RegExp(`\\b${letter}([\\-\\d.]+)`, "i");
  const m = line.match(re);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

// ─── Engine ───────────────────────────────────────────────────────────────
export class MillProgramAnalyzerEngine {
  /** Pure: static G/M-code analysis. */
  analyze(program: string): AnalysisResult {
    if (typeof program !== "string") {
      throw new Error("MillProgramAnalyzerEngine: program must be a string");
    }
    const gCodeUsage: Record<string, number> = {};
    const mCodeUsage: Record<string, number> = {};
    let toolChanges = 0;
    let coolantOn = 0;
    let coolantOff = 0;
    let feedMin: number | null = null;
    let feedMax: number | null = null;
    let spindleMin: number | null = null;
    let spindleMax: number | null = null;
    const warnings: string[] = [];
    const errors: string[] = [];
    const lines = program.split(/\r?\n/);
    let blockCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const clean = tokenize(raw);
      if (!clean) continue;
      blockCount += 1;
      // Track G/M-codes
      const gMatches = clean.matchAll(/\bG(\d+)/gi);
      for (const m of gMatches) {
        const key = `G${m[1].padStart(2, "0")}`;
        gCodeUsage[key] = (gCodeUsage[key] || 0) + 1;
      }
      const mMatches = clean.matchAll(/\bM(\d+)/gi);
      for (const m of mMatches) {
        const key = `M${m[1].padStart(2, "0")}`;
        mCodeUsage[key] = (mCodeUsage[key] || 0) + 1;
        // M06=tool change; M07/M08=coolant on; M09=coolant off
        const code = Number(m[1]);
        if (code === 6) toolChanges += 1;
        else if (code === 7 || code === 8) coolantOn += 1;
        else if (code === 9) coolantOff += 1;
      }
      // F (feed) + S (spindle)
      const f = extractWord(clean, "F");
      if (f !== null && f > 0) {
        feedMin = feedMin === null ? f : Math.min(feedMin, f);
        feedMax = feedMax === null ? f : Math.max(feedMax, f);
      }
      const s = extractWord(clean, "S");
      if (s !== null && s > 0) {
        spindleMin = spindleMin === null ? s : Math.min(spindleMin, s);
        spindleMax = spindleMax === null ? s : Math.max(spindleMax, s);
      }
      // Safety warnings
      if (mCodeUsage["M00"] && i < lines.length - 1) {
        // mid-program M00 is fine; just inform
      }
    }
    // Cross-checks
    if (Object.keys(gCodeUsage).length === 0) {
      warnings.push("no G-codes detected — program may be empty or comment-only");
    }
    if (toolChanges > 0 && coolantOn === 0) {
      warnings.push("tool changes present but no coolant-on (M07/M08) detected");
    }
    if (feedMin === null && blockCount > 0) {
      warnings.push("no feed (F) words detected");
    }
    if (spindleMin === null && blockCount > 0) {
      warnings.push("no spindle (S) words detected");
    }
    return {
      lineCount: lines.length,
      blockCount,
      gCodeUsage,
      mCodeUsage,
      toolChanges,
      coolantStates: { on: coolantOn, off: coolantOff },
      feedRange: { min: feedMin, max: feedMax },
      spindleRange: { min: spindleMin, max: spindleMax },
      warnings,
      errors,
    };
  }

  /** Validate = analyze + ok flag (true iff errors.length === 0). */
  validate(program: string): ValidationResult {
    const a = this.analyze(program);
    return { ...a, ok: a.errors.length === 0 };
  }

  /**
   * Pre-cut setup validation: defers physics to MillingForceEngine
   * (canonical Kienzle), gates on shop_floor Ω/S(x) by default.
   */
  validateSetup(input: SetupValidationInput): SetupValidationResult {
    const violations: string[] = [];
    const power = millingForceEngine.verifyPower(input);
    if (!power.pass) {
      violations.push(`spindle power: required ${power.required_power_kw.toFixed(2)} kW exceeds machine max ${power.machine_max_power_kw} kW`);
    }
    // Omega proxy: sigmoid on (required/max). Healthy headroom (required ≪ max)
    // → omega → 1. Approaching max → omega drops sharply. ω = 1/(1+(req/max)^4).
    const omega = power.machine_max_power_kw === null || power.machine_max_power_kw <= 0
      ? 1.0
      : 1 / (1 + Math.pow(power.required_power_kw / power.machine_max_power_kw, 4));
    const omegaMin = input.omegaMin ?? SHOP_FLOOR_OMEGA_MIN;
    if (omega < omegaMin) {
      violations.push(`omega ${omega.toFixed(3)} < required ${omegaMin}`);
    }
    // S(x) proxy: blends power-margin headroom + safety-factor adequacy.
    // Passes shop_floor when power.pass AND safety_factor ≥ default 1.25.
    const sfRatio = Math.min(1, power.safety_factor / 1.25);
    const sx = power.pass ? Math.min(1, omega * 0.5 + sfRatio * 0.5) : 0;
    const sxMin = input.sxMin ?? SHOP_FLOOR_SX_MIN;
    if (sx < sxMin) {
      violations.push(`S(x) ${sx.toFixed(3)} < required ${sxMin}`);
    }
    return { ok: violations.length === 0, power, omega, sx, violations };
  }

  /** SPC: mean, sigma (population), Cp, Cpk per ISO 22514. */
  analyzeSPC(input: SPCInput): SPCResult {
    if (!Array.isArray(input?.measurements)) {
      throw new Error("MillProgramAnalyzerEngine.analyzeSPC: measurements must be an array");
    }
    const xs = input.measurements.filter((x) => Number.isFinite(x));
    const n = xs.length;
    if (n === 0) {
      return {
        n: 0,
        mean: 0,
        sigma: 0,
        min: 0,
        max: 0,
        range: 0,
        Cp: null,
        Cpk: null,
        withinSpec: null,
      };
    }
    const mean = xs.reduce((s, x) => s + x, 0) / n;
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
    const sigma = Math.sqrt(variance);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const range = max - min;
    let Cp: number | null = null;
    let Cpk: number | null = null;
    let withinSpec: boolean | null = null;
    const { USL, LSL } = input;
    if (typeof USL === "number" && typeof LSL === "number" && sigma > 0) {
      Cp = (USL - LSL) / (2 * SPC_DEFAULT_SIGMA_MULTIPLIER * sigma);
      const Cpu = (USL - mean) / (SPC_DEFAULT_SIGMA_MULTIPLIER * sigma);
      const Cpl = (mean - LSL) / (SPC_DEFAULT_SIGMA_MULTIPLIER * sigma);
      Cpk = Math.min(Cpu, Cpl);
      withinSpec = min >= LSL && max <= USL;
    } else if (typeof USL === "number" || typeof LSL === "number") {
      withinSpec = (USL === undefined || max <= USL) && (LSL === undefined || min >= LSL);
    }
    return { n, mean, sigma, min, max, range, Cp, Cpk, withinSpec };
  }
}

export const millProgramAnalyzerEngine = new MillProgramAnalyzerEngine();
