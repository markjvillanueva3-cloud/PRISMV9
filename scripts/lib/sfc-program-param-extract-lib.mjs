// scripts/lib/sfc-program-param-extract-lib.mjs
//
// SFC-JM-ACCURACY -- extract the PROGRAMMED cutting parameters (spindle speed,
// feed, tool, modes) from a CNC program, so PRISM's Speed/Feed Calculator can be
// validated against what the shop ACTUALLY ran.
//
// Operator goal (2026-06-24): "utilize ALL JM die parts and programs first to run
// full live tests of parameters ... our programs are mostly written by amateurs so
// don't trust the speeds, feeds and parameters, use them as the GUIDELINE to test
// against". This lib is the EXTRACTION half -- it pulls the as-programmed S/F/T per
// tool out of the G-code. The comparison half (sfc-program-validate) feeds each
// extracted op to speedFeedOrchestratorEngine.compute() and classifies divergence.
//
// DISTINCT from the existing CNC libs (cnc-ground-truth-lib = dimension presence;
// cnc-program-gt-lib = machined X/Z envelope). Neither extracts speeds/feeds; this
// one does ONLY speeds/feeds/tools. It reuses tokenizeNc + detectUnits from
// cnc-ground-truth-lib (one tokenizer, no fork) and the NC_TEXT_EXTS allowlist from
// cnc-program-gt-lib (so binary .mcx/.f3d are never text-scraped into fake numbers).
//
// PURE: no fs / no fetch. Caller reads the program text + supplies it.

import { tokenizeNc, detectUnits } from "./cnc-ground-truth-lib.mjs";
import { NC_TEXT_EXTS } from "./cnc-program-gt-lib.mjs";

// Re-export the text-extension allowlist so a corpus walker has one source of truth.
export { NC_TEXT_EXTS };

// Spindle programming mode.
//   css = G96 constant-surface-speed (S is a surface speed: sfm if inch, m/min if metric)
//   rpm = G97 direct rpm                (S is rev/min)
// Lathe defaults to CSS on many controls; mill is always rpm. We do NOT assume a
// default -- `unknown` until a G96/G97 is seen.
export const SPINDLE_MODE = Object.freeze({ CSS: "css", RPM: "rpm", UNKNOWN: "unknown" });

// Feed programming mode.
//   per_min = G94 (units/min: ipm inch, mm/min metric)  -- mill default
//   per_rev = G95 (units/rev: ipr inch, mm/rev metric)   -- lathe default
export const FEED_MODE = Object.freeze({ PER_MIN: "per_min", PER_REV: "per_rev", UNKNOWN: "unknown" });

// Motion G-words that constitute a real cutting move (feed motion, not rapid).
const CUTTING_MOTION = new Set([1, 2, 3]);

/**
 * Resolve a controller T-word into a physical tool number.
 * Lathe Txxyy packs tool(xx)+offset(yy): T0101 -> tokenizes to 101 -> tool 1.
 * Mill T5 -> 5. Heuristic: a value >= 100 is treated as 4-digit lathe T (tool =
 * floor/100); below 100 it is the literal tool number. `raw` preserved for audit.
 */
export function resolveToolNumber(raw) {
  if (raw == null || !Number.isFinite(raw)) return null;
  const t = Math.trunc(Math.abs(raw));
  if (t === 0) return 0;
  return t >= 100 ? Math.trunc(t / 100) : t;
}

/**
 * Extract the distinct programmed cutting-parameter sets from a CNC program.
 *
 * @param {string} content  full program text
 * @param {object} [opts]
 * @param {string} [opts.filePath]   used only for the NC_TEXT_EXTS gate + label
 * @param {boolean}[opts.skipExtGate] bypass the extension allowlist (for raw snippets/tests)
 * @returns {object} { units, ok, reason, ops[], tools[] }
 */
export function extractCuttingParams(content, opts = {}) {
  const { filePath = null, skipExtGate = false } = opts;

  if (typeof content !== "string" || content.length === 0) {
    return { units: "unknown", ok: false, reason: "empty-content", ops: [], tools: [] };
  }
  if (!skipExtGate && filePath) {
    const dot = filePath.lastIndexOf(".");
    const ext = dot >= 0 ? filePath.slice(dot).toLowerCase() : "";
    if (!NC_TEXT_EXTS.has(ext)) {
      return { units: "unknown", ok: false, reason: `non-nc-text-ext:${ext || "none"}`, ops: [], tools: [] };
    }
  }

  const units = detectUnits(content);
  const tokens = tokenizeNc(content);

  // Modal machine state carried across lines.
  let curTool = null;          // resolved tool number
  let curToolRaw = null;
  let spindleMode = SPINDLE_MODE.UNKNOWN;
  let curSpindle = null;       // S value under the active spindleMode
  let feedMode = FEED_MODE.UNKNOWN;
  let curFeed = null;          // F value under the active feedMode
  let spindleClampRpm = null;  // G50 Sxxxx clamp (max rpm, NOT a cutting speed)

  // Distinct (tool, spindleMode, spindle, feedMode, feed) parameter sets -> one op.
  // A program repeats the same S/F across hundreds of motion lines; we want the
  // distinct programmed intents, which is exactly what SFC predicts one of.
  const seen = new Map();
  const ops = [];

  for (const op of tokens) {
    const g = op.g;
    const w = op.words;

    // spindle mode latches
    if (g.includes(96)) spindleMode = SPINDLE_MODE.CSS;
    else if (g.includes(97)) spindleMode = SPINDLE_MODE.RPM;

    // feed mode latches
    if (g.includes(94)) feedMode = FEED_MODE.PER_MIN;
    else if (g.includes(95)) feedMode = FEED_MODE.PER_REV;

    // G50 S clamp (lathe max-rpm clamp) is NOT a cutting spindle command
    const isG50Clamp = g.includes(50) && typeof w.S === "number";
    if (isG50Clamp) {
      spindleClampRpm = w.S;
    } else if (typeof w.S === "number") {
      curSpindle = w.S;
    }

    // tool change
    if (typeof w.T === "number") {
      curToolRaw = w.T;
      curTool = resolveToolNumber(w.T);
      curFeed = null; // new tool, new geometry -> reset feed expectation
    }

    // feed value
    if (typeof w.F === "number" && w.F > 0) {
      curFeed = w.F;
    }

    // emit a cutting op on a real feed motion that has a programmed feed + spindle
    const isCuttingMotion = g.some((n) => CUTTING_MOTION.has(n));
    if (isCuttingMotion && curFeed != null && curSpindle != null) {
      const key = `${curTool}|${spindleMode}|${curSpindle}|${feedMode}|${curFeed}`;
      if (!seen.has(key)) {
        const rec = {
          toolNumber: curTool,
          toolRaw: curToolRaw,
          spindleMode,
          spindleValue: curSpindle,
          feed: curFeed,
          feedMode,
          spindleClampRpm,
          sample: key,
        };
        seen.set(key, rec);
        ops.push(rec);
      }
    }
  }

  // Per-tool rollup.
  const toolMap = new Map();
  for (const rec of ops) {
    const tk = `${rec.toolNumber}|${rec.spindleMode}`;
    let t = toolMap.get(tk);
    if (!t) {
      t = { toolNumber: rec.toolNumber, spindleMode: rec.spindleMode, maxSpindle: null, minFeed: null, maxFeed: null, opCount: 0 };
      toolMap.set(tk, t);
    }
    t.opCount += 1;
    if (rec.spindleValue != null) t.maxSpindle = t.maxSpindle == null ? rec.spindleValue : Math.max(t.maxSpindle, rec.spindleValue);
    if (rec.feed != null) {
      t.minFeed = t.minFeed == null ? rec.feed : Math.min(t.minFeed, rec.feed);
      t.maxFeed = t.maxFeed == null ? rec.feed : Math.max(t.maxFeed, rec.feed);
    }
  }

  return {
    units,
    ok: ops.length > 0,
    reason: ops.length > 0 ? null : "no-cutting-ops",
    ops,
    tools: [...toolMap.values()],
  };
}
