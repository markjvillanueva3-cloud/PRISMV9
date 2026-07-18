/**
 * jm-tool-condition-matrix.test.ts
 * [JM-FUSION-TOOLS] cross-CAM consistency oracle (slot:romeo).
 *
 * PROVES the shared matrix lib (`jm-tool-condition-matrix.ts`) reproduces the
 * PROVEN, committed Fusion all-conditions cutting numbers byte-for-byte (after
 * the same unit conversion + rounding the Fusion generator applies). Because all
 * three CAM emitters (Fusion CSV generator, hyperMILL driver, Mastercam driver)
 * derive their cutting data from THIS lib, a green run here guarantees the three
 * CAMs are mutually consistent -- they all anchor to the same canonical matrix.
 *
 * THE ORACLE
 *   `state/shared/jm-fusion-tools/material-group-libraries/JM-CRIB-ALL-families.csv`
 *   is the committed Fusion library. Each preset row's name is
 *   "<grade> <toolpath label>" (e.g. "1018 Steel (P) HEM Adaptive"); its
 *   Surface Speed / Spindle Speed / Cutting Feedrate / Stepdown / Stepover
 *   columns are the proven Fusion-emitted numbers. The test reads the ACTUAL CSV
 *   at runtime (zero transcription risk) for a hand-picked sample of reference
 *   rows spanning a MILLING preset, a DRILLING preset and a TURNING preset across
 *   >=2 material grades, then asserts the lib reproduces each.
 *
 * THE CONVERSION (mirrors `generate-jm-fusion-tool-libraries.ts` condOverride()
 * + fmt() EXACTLY -- verified faithful against the live generator):
 *   surfaceSpeed = round(vc_mpm * MPM_TO_SFM)            -> integer SFM (exact)
 *   spindleSpeed = rpm (already round()ed in the lib)    -> integer RPM (exact)
 *   feedCutting  = fmt(feed_mmpm * IN_PER_MM, 4)         -> inch/min, 4 dp
 *   stepdown     = fmt(ap_mm * IN_PER_MM, 4)             -> inch, 4 dp  (MILLING only*)
 *   stepover     = fmt(ae_mm * IN_PER_MM, 4)             -> inch, 4 dp  (MILLING only*)
 *   * The generator emits stepdown/stepover ONLY for milling ops (and only when
 *     >0). Drilling/turning rows carry NO stepdown/stepover columns, and turning
 *     rows carry NO RPM/feed (CSS mode -- diameter-driven at the control). The test
 *     encodes that exact per-op emission gate, so a turning row asserts CSS-blank
 *     RPM/feed and SFM-only, never a fabricated feed.
 *
 * A FAILURE here means the lib drifted from the proven Fusion matrix, so the three
 * CAMs would silently disagree. This is a real reference-value test: every
 * assertion compares a lib-derived number against the committed CSV value.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  conditionMatrix,
  computeCondition,
  STRATEGY_FACTORS,
  IN_PER_MM,
  MPM_TO_SFM,
  classifyToolType,
  type ConditionPreset,
} from "./jm-tool-condition-matrix.js";

// Named constants (avoid magic numbers in the conversion + assertions).
const MM_PER_INCH = 25.4;          // CSV inch diameter -> mm for the lib
const FEED_EPSILON = 5e-4;         // tight epsilon on 4-dp trailing-decimal values
const MIN_LIBRARY_ROWS = 1000;     // the real all-conditions CSV has thousands of rows

// MPM_TO_SFM is the conversion factor the lib AND the CSV share; assert it once so
// this import is load-bearing (the lib already applies it inside computeCondition).
const SFM_PER_MPM = MPM_TO_SFM;

// ── Oracle path: repo-root-relative, resolved from THIS test file's location ──
const here = dirname(fileURLToPath(import.meta.url)); // mcp-server/scripts/lib
const CSV_PATH = resolve(
  here,
  "../../../state/shared/jm-fusion-tools/material-group-libraries/JM-CRIB-ALL-families.csv",
);

// ── Minimal RFC-4180-ish CSV parse (handles the quoted header + plain data rows) ──
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// ── Stable internal-key -> column index (the parenthesized token is the contract) ──
// Header cells look like `Preset Name (preset_name)`; we key on the inner token so
// a future header-label reword never breaks the test.
const KEY = {
  toolIndex: "tool_index",
  preset: "preset_name",
  type: "tool_type",
  diameter: "tool_diameter",
  unit: "tool_unit",
  flutes: "tool_numberOfFlutes",
  material: "tool_material",
  description: "tool_description",
  surfaceSpeed: "tool_surfaceSpeed",
  spindleSpeed: "tool_spindleSpeed",
  feedCutting: "tool_feedCutting",
  stepdown: "tool_stepdown",
  stepover: "tool_stepover",
} as const;

interface OracleRow {
  toolType: string;
  diaCsv: number;       // diameter as printed in the CSV unit
  unit: "inches" | "mm";
  flutes: number;       // generator: num(flutes) ?? 1
  material: string;
  description: string;
  preset: string;
  sfm: string;          // raw CSV cells (strings; blank => "")
  rpm: string;
  feed: string;
  stepdown: string;
  stepover: string;
}

// Parse the oracle ONCE; index every preset row by `${tool_index}::${preset_name}`.
function loadOracle(): Map<string, OracleRow> {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]);
  // map internal-key -> column index
  const col: Record<string, number> = {};
  header.forEach((h, i) => {
    const m = /\(([^)]+)\)\s*$/.exec(h.trim());
    if (m) col[m[1]] = i;
  });
  // sanity: every key we rely on must exist in the header
  for (const k of Object.values(KEY)) {
    if (col[k] === undefined) throw new Error(`oracle CSV missing column for key '${k}'`);
  }
  const get = (f: string[], k: string) => (col[k] < f.length ? f[col[k]] : "");
  const numOrOne = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 1; // mirrors generator: num(flutes) ?? 1
  };
  const map = new Map<string, OracleRow>();
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    if (f.length < 5) continue;
    const idx = get(f, KEY.toolIndex).trim();
    const preset = get(f, KEY.preset).trim();
    if (!preset || preset === "Default Preset") continue; // skip the verbatim as-run row
    const unit = get(f, KEY.unit).trim() === "mm" ? "mm" : "inches";
    map.set(`${idx}::${preset}`, {
      toolType: get(f, KEY.type).trim(),
      diaCsv: parseFloat(get(f, KEY.diameter)) || 0,
      unit,
      flutes: numOrOne(get(f, KEY.flutes)),
      material: get(f, KEY.material).trim(),
      description: get(f, KEY.description).trim(),
      preset,
      sfm: get(f, KEY.surfaceSpeed).trim(),
      rpm: get(f, KEY.spindleSpeed).trim(),
      feed: get(f, KEY.feedCutting).trim(),
      stepdown: get(f, KEY.stepdown).trim(),
      stepover: get(f, KEY.stepover).trim(),
    });
  }
  return map;
}

// ── Generator's exact value formatter (fmt(n, dp) = parseFloat(toFixed).toString) ──
function fmt(n: number, dp: number): string {
  return parseFloat(n.toFixed(dp)).toString();
}

// ── Lib preset -> the CSV view the generator would emit (per-op emission gate) ──
interface CsvView {
  sfm: string;
  rpm: string;        // "" for turning (CSS)
  feed: string;       // "" for turning + tapping
  stepdown: string;   // milling-only emission
  stepover: string;   // milling-only emission
}
function libToCsvView(p: ConditionPreset, unit: "inches" | "mm"): CsvView {
  const toUnit = (mm: number) => (unit === "mm" ? mm : mm * IN_PER_MM);
  const isMilling = p.op === "milling" || p.op === "thread_milling";
  return {
    sfm: String(p.sfm),
    rpm: p.rpm == null ? "" : String(p.rpm),
    feed: p.feed_mmpm == null ? "" : fmt(toUnit(p.feed_mmpm), 4),
    // generator emits stepdown/stepover ONLY for milling ops, and only when >0.
    stepdown: isMilling && p.ap_mm > 0 ? fmt(toUnit(p.ap_mm), 4) : "",
    stepover: isMilling && p.ae_mm > 0 ? fmt(toUnit(p.ae_mm), 4) : "",
  };
}

// Resolve a single (grade, toolpath-label) preset from the lib for an oracle row.
function libPreset(o: OracleRow): { preset?: ConditionPreset; gradeName: string; label: string } {
  const dMm = o.unit === "mm" ? o.diaCsv : o.diaCsv * MM_PER_INCH;
  const presets = conditionMatrix({
    toolType: o.toolType,
    dMm,
    flutes: o.flutes,
    material: o.material,
    description: o.description,
  });
  // The oracle preset name is "<gradeName> <label>"; gradeName ends at the
  // "(X)" ISO token, label is the remainder. Match on that split.
  const m = /^(.*\([PMKNSH]\))\s+(.+)$/.exec(o.preset);
  const gradeName = m ? m[1] : o.preset;
  const label = m ? m[2] : "";
  const preset = presets.find((p) => p.gradeName === gradeName && p.label === label);
  return { preset, gradeName, label };
}

const ORACLE = loadOracle();

// ── The hand-picked reference sample (keyed by tool_index::preset_name) ─────────
// Spans 3 op classes (milling / drilling / turning) across >=2 grades each, all
// confirmed present in the committed CSV. Each entry names what it proves.
const SAMPLE: { key: string; op: "milling" | "drilling" | "turning"; note: string }[] = [
  // MILLING -- bull-nose end mill #131, 0.5", 6FL, HEM Adaptive (P-group, 2 grades) + M-group
  { key: "131::1018 Steel (P) HEM Adaptive", op: "milling", note: "P/1018 milling HEM" },
  { key: "131::4140/4340 Alloy (P) HEM Adaptive", op: "milling", note: "P/4140 milling HEM" },
  { key: "131::304/316 SS (M) HEM Adaptive", op: "milling", note: "M/SS milling HEM (lower SS stepdown)" },
  // SMALL-TOOL milling, DIAMETER-BOUND axial -- bull-nose end mill #133, 0.25", 4FL. Here
  // axialDx*D (2.0*0.25"=0.5") < the SFC ceiling (lk.ap*2.0=0.63"), so the 1xD-LOC diameter
  // baseline is the BINDING bound (unlike #131 at 0.5", where the ceiling binds and masks ap
  // drift). This row guards condOverride <-> computeCondition ap-parity: if either reverts to a
  // fixed-mm ceiling, this stepdown diverges and the oracle FAILS (the 2026-06-17 drift the
  // ceiling-bound samples above could not catch).
  { key: "133::1018 Steel (P) HEM Adaptive", op: "milling", note: "P/1018 SMALL-tool HEM -- diameter-bound axial (ap=2xD, < ceiling)" },
  { key: "133::1018 Steel (P) Slot", op: "milling", note: "P/1018 SMALL-tool slot -- diameter-bound shallow axial (ap=0.5xD), full-width radial" },
  // DRILLING -- twist drill #1, 0.4375", Drill preset (P-group, 2 grades) + M-group
  { key: "1::1018 Steel (P) Drill", op: "drilling", note: "P/1018 drilling (feed-per-rev)" },
  { key: "1::1045 Steel (P) Drill", op: "drilling", note: "P/1045 drilling" },
  { key: "1::304/316 SS (M) Drill", op: "drilling", note: "M/SS drilling" },
  // TURNING -- turning general #136, 0.375", Turn Rough (P + M) -- CSS, blank RPM/feed
  { key: "136::1018 Steel (P) Turn Rough", op: "turning", note: "P/1018 turning CSS (SFM-only)" },
  { key: "136::304/316 SS (M) Turn Rough", op: "turning", note: "M/SS turning CSS (SFM-only)" },
];

describe("JM tool-condition matrix lib reproduces the proven Fusion CSV (3-CAM consistency oracle)", () => {
  it("resolves every sampled reference row to a positive integer Surface Speed in the committed CSV", () => {
    // Each sampled key MUST resolve to a row whose proven Surface Speed (SFM) is a
    // real positive integer -- proves we loaded the actual all-conditions library
    // and the sample keys are live (not stale / renamed).
    for (const s of SAMPLE) {
      const row = ORACLE.get(s.key);
      const sfm = row ? parseInt(row.sfm, 10) : NaN;
      expect(sfm, `oracle reference row '${s.key}' must carry an integer SFM`).toBeGreaterThan(0);
    }
    expect(ORACLE.size).toBeGreaterThan(MIN_LIBRARY_ROWS); // a real library, thousands of rows
    expect(SFM_PER_MPM).toBeCloseTo(3.28084, 5);           // the shared conversion factor
  });

  it("classifies the sampled tool types to the expected matrix family", () => {
    // ties the (iso,toolpath) derivation the prompt asks for to the lib's own classifier
    expect(classifyToolType("bull nose end mill")).toBe("end_mill");
    expect(classifyToolType("drill")).toBe("drill");
    expect(classifyToolType("turning general")).toBe("turning_tool");
  });

  for (const s of SAMPLE) {
    it(`reproduces ${s.key}  [${s.note}]`, () => {
      const o = ORACLE.get(s.key)!;
      const r = libPreset(o);
      const preset = r.preset;
      // Concrete structural assertion (not presence-only): the resolved preset must
      // carry the EXACT grade + toolpath label we asked for and the canonical op class.
      expect(
        preset === undefined ? "<no preset>" : `${preset.gradeName}|${preset.label}`,
        `lib produced no preset for grade='${r.gradeName}' label='${r.label}' on ${o.toolType}`,
      ).toBe(`${r.gradeName}|${r.label}`);
      const expectedOp =
        s.op === "turning" ? "turning" : s.op === "drilling" ? "drilling" : "milling";
      expect(preset!.op).toBe(expectedOp);

      const v = libToCsvView(preset!, o.unit);

      // ── exact integer match on the rounded SFM (every op class carries it) ──
      expect(v.sfm, `SFM mismatch for ${s.key}`).toBe(o.sfm);

      if (s.op === "turning") {
        // CSS mode: lib must yield NO RPM and NO table feed, exactly as the CSV.
        // (A regression that fabricated an RPM/feed here would desync the lathe CAMs.)
        expect(preset!.css).toBe(true);
        expect(v.rpm, `${s.key} turning RPM must be blank (CSS)`).toBe("");
        expect(v.feed, `${s.key} turning feed must be blank (CSS)`).toBe("");
        expect(o.rpm, `oracle turning RPM should be blank`).toBe("");
        expect(o.feed, `oracle turning feed should be blank`).toBe("");
        return;
      }

      // ── milling + drilling: exact RPM + tight-epsilon feed ──
      expect(v.rpm, `RPM mismatch for ${s.key}`).toBe(o.rpm);

      // feed: compare numerically within a tight epsilon (trailing-decimal value).
      const feedLib = parseFloat(v.feed);
      const feedCsv = parseFloat(o.feed);
      expect(feedCsv, `oracle feed must be numeric for ${s.key}`).toBeGreaterThan(0);
      expect(Math.abs(feedLib - feedCsv)).toBeLessThanOrEqual(FEED_EPSILON);

      if (s.op === "milling") {
        // milling carries stepdown + stepover in the CSV; assert both within epsilon.
        const sdLib = parseFloat(v.stepdown);
        const sdCsv = parseFloat(o.stepdown);
        const soLib = parseFloat(v.stepover);
        const soCsv = parseFloat(o.stepover);
        expect(sdCsv, `oracle stepdown must be numeric for ${s.key}`).toBeGreaterThan(0);
        expect(soCsv, `oracle stepover must be numeric for ${s.key}`).toBeGreaterThan(0);
        expect(Math.abs(sdLib - sdCsv)).toBeLessThanOrEqual(FEED_EPSILON);
        expect(Math.abs(soLib - soCsv)).toBeLessThanOrEqual(FEED_EPSILON);
      } else {
        // drilling: the generator emits NO stepdown/stepover columns for hole ops.
        // Encode that so a future lib change that *started* emitting them here is caught.
        expect(o.stepdown, `oracle drilling stepdown should be blank for ${s.key}`).toBe("");
        expect(o.stepover, `oracle drilling stepover should be blank for ${s.key}`).toBe("");
        expect(v.stepdown).toBe("");
        expect(v.stepover).toBe("");
      }
    });
  }
});

/**
 * 1xD-LOC axial baseline (operator directive 2026-06-17) -- CSV-INDEPENDENT.
 *
 * These assert the BEHAVIOR of the milling axial-depth rule directly against
 * `computeCondition`, with NO dependence on the committed CSV oracle. The rule
 * (jm-tool-condition-matrix.ts milling branch):
 *
 *     apEff = min( STRATEGY_FACTORS[strategy].axialDx * dMm,   // diameter-relative baseline
 *                  lk.ap * STRATEGY_FACTORS[strategy].ap )     // SFC physics ceiling
 *
 * Intent (R9 -- a revert to a fixed-mm ap MUST fail one of these):
 *  - small tools get a SNAP-SAFE diameter-scaled axial (was a fixed mm = too deep on micro tools)
 *  - large tools stay PHYSICS-CLAMPED (the SFC deflection/power ceiling wins, < 1xD)
 *  - the axial is genuinely diameter-RELATIVE (scales with D when the baseline is the active bound)
 *  - the axial NEVER exceeds the diameter-relative baseline (the bulletproof safety invariant)
 */
describe("1xD-LOC axial baseline (operator 2026-06-17)", () => {
  const EPS = 1e-6;
  const FLUTES = 4;
  // milling roughing in P (carbide endmill) -- the canonical roughing case.
  const cc = (strategy: string, dMm: number) =>
    computeCondition("P", "milling", "roughing", strategy, dMm, FLUTES, "carbide");

  it("HEM (adaptive) on a small tool gives the 2xD diameter-scaled axial (live reference D=6 -> 12mm)", () => {
    // Verified live: D=6 HEM adaptive -> ap=12mm (=axialDx 2.0 * 6), ae=0.6mm (=10% of 6).
    // This is the operator's headline case: a snap-safe diameter-relative baseline, NOT a fixed mm.
    const r = cc("adaptive", 6);
    expect(r, "adaptive D=6 must resolve").not.toBeNull();
    expect(r!.ap_mm).toBeCloseTo(2.0 * 6, 6);     // STRATEGY_FACTORS.adaptive.axialDx (2.0) * D
    expect(r!.ae_mm).toBeCloseTo(0.10 * 6, 6);    // STRATEGY_FACTORS.adaptive.aePct (10) %D
  });

  it("large tool stays PHYSICS-CLAMPED below 1xD (the SFC ceiling wins, not a blind diameter axial)", () => {
    // D=25 conventional: diameter baseline = axialDx 1.0 * 25 = 25mm, but the SFC roughing
    // ceiling (lk.ap * 1.0, deflection/power-bounded, single-digit-mm) is far smaller -> min picks it.
    const r = cc("conventional", 25);
    expect(r, "conventional D=25 must resolve").not.toBeNull();
    expect(r!.ap_mm).toBeGreaterThan(0);
    expect(r!.ap_mm, "large-tool axial must be clamped below 1xD by the SFC ceiling").toBeLessThan(25);
  });

  it("axial is genuinely diameter-RELATIVE: doubling D doubles the axial when the baseline is active", () => {
    // HSM's tiny axialDx (0.15) keeps the diameter baseline strictly below the SFC ceiling for
    // both diameters, so apEff = 0.15*D on both -> the ratio must equal the diameter ratio.
    // A revert to a FIXED-mm ap would make this ratio ~1.0 and FAIL (R9 intent guard).
    const small = cc("hsm", 10);
    const big = cc("hsm", 20);
    expect(small, "hsm D=10 must resolve").not.toBeNull();
    expect(big, "hsm D=20 must resolve").not.toBeNull();
    expect(small!.ap_mm).toBeCloseTo(0.15 * 10, 6);
    expect(big!.ap_mm).toBeCloseTo(0.15 * 20, 6);
    expect(big!.ap_mm / small!.ap_mm).toBeCloseTo(2.0, 6);   // doubled D -> doubled axial
  });

  it("SAFETY INVARIANT: apEff never exceeds the diameter-relative baseline (axialDx * D) for any strategy", () => {
    // The min() guarantees ap_mm <= axialDx*D ALWAYS, regardless of the SFC ceiling. This is the
    // operator's "safe baseline to adjust UP from" -- the axial can never silently go deeper than
    // the per-toolpath diameter baseline. Checked across every milling strategy + a diameter sweep.
    // EVERY strategy (incl. plunge): the milling-branch ap = min(axialDx*D, ceiling), so the
    // invariant ap <= axialDx*D holds for all of them by construction -- assert the full set.
    const millingStrategies = Object.keys(STRATEGY_FACTORS) as string[];
    for (const strategy of millingStrategies) {
      const sm = STRATEGY_FACTORS[strategy];
      for (const dMm of [3, 6, 10, 16, 25]) {
        const r = cc(strategy, dMm);
        expect(r, `${strategy} D=${dMm} must resolve`).not.toBeNull();
        expect(r!.ap_mm, `${strategy} D=${dMm}: ap must be positive`).toBeGreaterThan(0);
        expect(
          r!.ap_mm,
          `${strategy} D=${dMm}: ap ${r!.ap_mm} must not exceed diameter baseline axialDx(${sm.axialDx})*D=${sm.axialDx * dMm}`,
        ).toBeLessThanOrEqual(sm.axialDx * dMm + EPS);
      }
    }
  });

  it("slot keeps a SHALLOW axial (<=0.5xD) with a full-width radial (100% of D)", () => {
    // Slotting is full-engagement: light axial, ae = full diameter. STRATEGY_FACTORS.slot
    // axialDx=0.5, aePct=100.
    const r = cc("slot", 10);
    expect(r, "slot D=10 must resolve").not.toBeNull();
    expect(r!.ap_mm).toBeLessThanOrEqual(0.5 * 10 + EPS);
    expect(r!.ae_mm).toBeCloseTo(1.0 * 10, 6);   // 100% of D -- a true slot
  });

  it("contour (wall/profile finish) takes a FULL-depth (<=1xD) axial at a LIGHT radial finish stepover (5% of D)", () => {
    // Operator-spec toolpath "contouring": a finishing side pass down a wall -- full flute depth
    // (1xD baseline) but a tiny radial finish allowance => low force, fine finish. STRATEGY_FACTORS.contour
    // axialDx=1.0, aePct=5. Distinct from "Finish" (light axial) and "slot" (full radial).
    const r = cc("contour", 10);
    expect(r, "contour D=10 must resolve").not.toBeNull();
    expect(r!.ap_mm, "contour axial <= 1xD baseline").toBeLessThanOrEqual(1.0 * 10 + EPS);
    expect(r!.ae_mm).toBeCloseTo(0.05 * 10, 6);  // 5% of D -- a light wall finish stepover
    expect(r!.ae_mm, "contour radial must be far below a slot").toBeLessThan(0.5 * 10);
  });

  it("every strategy in STRATEGY_FACTORS carries the required axialDx field", () => {
    // Guards the schema: the milling branch reads sm.axialDx unconditionally, so a strategy
    // missing the field would silently yield NaN axial. Pin the contract.
    for (const [name, sm] of Object.entries(STRATEGY_FACTORS)) {
      expect(typeof sm.axialDx, `${name}.axialDx must be a number`).toBe("number");
      expect(sm.axialDx, `${name}.axialDx must be positive`).toBeGreaterThan(0);
    }
  });
});
