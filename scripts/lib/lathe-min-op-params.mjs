/**
 * lathe-min-op-params.mjs -- slot:whiskey  [reference-side .MIN per-op param extractor]
 * ==========================================================================
 * Parses ONE Okuma .MIN program's text into per-operation cutting params
 * `{operation_type, cutting_speed_m_min, feed_mm_rev, sfm, feed_ipr}`, the
 * REFERENCE side that `lathe-pair-accuracy.mjs` scores a PRISM-generated program
 * against (exact per-pair closeness, not cloud band membership).
 *
 * The parse logic (G96/G97 spindle-mode modal SFM, IPR feed, op classification,
 * centerline-drill detection) is the PROVEN logic from `parseProgram` in
 * scripts/lathe-jmdie-param-accuracy-harness.mjs (Rung A) -- replicated here as
 * the CANONICAL reusable home so the new pair-accuracy harness does not re-spawn
 * the whole Rung A harness just to parse one file.
 *
 * MIGRATION NOTE (R12, flagged not silent): the Rung A harness still carries its
 * own inline copy (it ends with an UNGUARDED `main()`, so it cannot be imported
 * without running the 16K-corpus scan, and it has no test). The harness should be
 * refactored to `import { parseMinOpParams } from "./lib/lathe-min-op-params.mjs"`
 * + a main-guard, in a follow-up where a `--sample` run can verify no drift. Until
 * then this lib is the single source for NEW consumers; keep the two in sync.
 *
 * R5: pure text parsing, no I/O / network / engine imports -- unit-testable.
 * UNITS: .MIN is an inch shop -> SFM + IPR. We ALSO emit metric
 * (cutting_speed_m_min, feed_mm_rev) so the output plugs straight into
 * scoreOpPair (which converts metric -> imperial via the shared converters).
 */

import { SFM_PER_M_MIN } from "./lathe-band-score.mjs";

/** 1 inch = 25.4 mm (feed IPR -> mm/rev). */
export const MM_PER_INCH = 25.4;

const RE_G96 = /\bG96\s*S(\d+(?:\.\d+)?)/i;
const RE_G97 = /\bG97\s*S(\d+(?:\.\d+)?)/i;
const RE_FEED = /\bF(\d*\.\d+|\d+\.?\d*)\b/i;
const RE_X = /\bX(-?\d*\.?\d+)/i;
const RE_MOVE = /\bG0?([0123])\b/;
const RE_G50 = /\bG50\s*S(\d+(?:\.\d+)?)/i;

/**
 * Classify a cut by feed regime + thread/drill flags -- mirrors the Rung A harness.
 * thread/drill are named explicitly; otherwise IPR magnitude splits rough vs finish.
 * (lathe-band-score's classifyOpBand maps "thread" -> specialty -> excluded from scoring.)
 */
export function classifyMinOp({ feedIpr, isThread, isDrill }) {
  if (isThread) return "thread";
  if (isDrill) return "drill";
  if (feedIpr == null) return "rapid";
  if (feedIpr >= 0.006) return "rough";
  if (feedIpr > 0) return "finish";
  return "other";
}

/**
 * Parse a single .MIN program's text into per-op params + program-level flags.
 * @param {string} text  raw .MIN program text
 * @returns {{ops: Array<{operation_type:string, sfm:number|null, feed_ipr:number|null,
 *            cutting_speed_m_min:number|null, feed_mm_rev:number|null}>,
 *            usesG96:boolean, usesG97:boolean, g50cap:number|null}}
 */
export function parseMinOpParams(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  let mode = null;          // 'css' | 'rpm'
  let curSpeed = null;      // sfm if css, rpm if rpm
  let lastX = null;         // diameter inch
  let modalFeed = null;
  let usesG96 = false, usesG97 = false, g50cap = null;
  const ops = [];

  for (const raw of lines) {
    const upper = String(raw).trim().toUpperCase();
    if (!upper) continue;

    const mG50 = upper.match(RE_G50);
    if (mG50) { const v = parseFloat(mG50[1]); if (v > 0) g50cap = Math.max(g50cap ?? 0, v); }

    const mG96 = upper.match(RE_G96);
    if (mG96) { usesG96 = true; mode = "css"; curSpeed = parseFloat(mG96[1]); }
    const mG97 = upper.match(RE_G97);
    if (mG97) { usesG97 = true; mode = "rpm"; curSpeed = parseFloat(mG97[1]); }

    const isThreadLine = /\bG33\b/.test(upper) || /THREAD/.test(upper);

    const mX = upper.match(RE_X);
    if (mX) lastX = Math.abs(parseFloat(mX[1]));

    const mFeed = upper.match(RE_FEED);
    if (mFeed) modalFeed = parseFloat(mFeed[1]);

    const mMove = upper.match(RE_MOVE);
    const isCut = mMove && (mMove[1] === "1" || mMove[1] === "2" || mMove[1] === "3");
    if (!isCut) continue;

    // IPR sane band (<1 in/rev); larger F is mm/min or a code, not a per-rev feed.
    const feedIpr = modalFeed && modalFeed > 0 && modalFeed < 1 ? modalFeed : null;
    // Centerline drill = a LINEAR (G1) Z-only plunge on/near center, NOT a restated-X turning pass.
    const lineHasZ = /\bZ-?\.?\d/.test(upper);
    const isDrill = mMove[1] === "1" && lineHasZ && mX == null && lastX != null && lastX < 0.03;

    let sfm = null;
    if (mode === "css" && curSpeed) sfm = curSpeed;
    else if (mode === "rpm" && curSpeed && lastX && lastX > 0.02) sfm = (Math.PI * lastX * curSpeed) / 12;

    ops.push({
      operation_type: classifyMinOp({ feedIpr, isThread: isThreadLine, isDrill }),
      sfm,
      feed_ipr: feedIpr,
      cutting_speed_m_min: sfm == null ? null : sfm / SFM_PER_M_MIN,
      feed_mm_rev: feedIpr == null ? null : feedIpr * MM_PER_INCH,
      // Cut diameter (X is a diameter word on Okuma lathes) at this op, for OD-vs-near-center
      // discrimination downstream: a G97 cut at X~0.04in really IS ~7 SFM (correct physics, not a
      // parse bug), but pairing PRISM's OD-finish against it is apples-to-oranges. The representative
      // scorer (lathe-pair-accuracy) filters on this so near-center finish ops don't confound the %.
      dia_in: lastX,
      dia_mm: lastX == null ? null : lastX * MM_PER_INCH,
    });
  }

  return { ops, usesG96, usesG97, g50cap };
}
