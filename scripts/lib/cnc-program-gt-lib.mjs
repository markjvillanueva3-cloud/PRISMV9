// scripts/lib/cnc-program-gt-lib.mjs
//
// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
// text, no STEP kernel / GPU / MCP needed. For the 91 perfect parts (print + CAD + program) this turns
// each part into a real (print → dims) supervision pair whose answer key is the program itself.
//
// SCOPE: lathe G-code (Okuma .MIN / Fanuc .nc / .min / .hnc / Mastercam-posted) where X is the
// DIAMETER axis and Z is the LENGTH axis (the JM lathe convention). We extract the machined ENVELOPE
// — max turned diameter (max positive X), overall length (Z travel span) — plus the raw X/Z value
// multiset, as candidate GT dims the print's callouts should corroborate. Units are INCH (JM
// convention, R12 — verified in the STEP CONVERSION_BASED_UNIT('inch')); the caller converts to mm.
//
// PURE: no fs/fetch. The caller reads the program text + supplies it. We do NOT interpret a mill
// program's X/Y/Z as diameter/length (different semantics) — a mill program returns {axis:'mill'} and
// its raw coordinate extents only, never a "diameter".

import { dimType } from "./dimension-set-score.mjs";

const INCH_TO_MM = 25.4;

// The program GT is callout-class DIAMETERS (lathe feed-move feature diameters + overall length; mill
// hole/bore diameters). A non-diameter OCR dim (linear width, chamfer, angle, position, radius) is NOT
// in this answer key, so labeling a correctly-read non-diameter dim "incorrect" vs a diameter GT is a
// FALSE NEGATIVE that biases the calibration toward under-trusting high-agreement dims. The program-GT
// calibration emission therefore adjudicates ONLY the diameter class: a KNOWN non-diameter type is
// excluded; an UNKNOWN type is kept (value-only fallback, mirroring typesCompatible(null,*) = true).
const DIAMETER_TYPES = Object.freeze(new Set(["diameter", "diametral", "dia", "diam"]));

// A G-code address+value token: a letter (X/Z/U/W/I/K/R/D) followed by a signed decimal. We read X/Z
// for lathe envelope; U/W are incremental (skipped for absolute extent). Tolerant of leading-dot
// (.95) and no-space packing (X.95Z.005) — the same engineering-notation the VLM/G-code both emit.
const ADDR_RE = /([XZUWIKRD])\s*([+-]?(?:\d+\.?\d*|\.\d+))/gi;

// Posted-NC text extensions we trust. A .mcx*/.emcam/.vnc/.f3d/.ipt is a CAM/CAD SOURCE (often
// binary), NOT posted G-code — reading it as text scrapes random byte-sequences as fake coordinates
// (the 110206 binary-.mcx-8 → fake X9/203.2mm garbage that scrutiny caught). Allowlist the real ones.
export const NC_TEXT_EXTS = Object.freeze(new Set([".min", ".nc", ".hnc", ".eia", ".tap", ".cnc", ".ngc", ".mpf", ".ptp"]));

/**
 * Pure: is this string plausibly POSTED G-code TEXT (not binary, not a CAM source)? Two guards:
 * (1) ext allowlist (if provided) — reject .mcx-style/.emcam/CAD sources; (2) printable-ratio — a binary
 * file read as utf8 is full of control bytes / replacement chars. Returns {ok, reason}. The runner
 * calls this BEFORE extractProgramGT so binary noise never becomes fake GT (scrutiny P0-1).
 * @param {string} text
 * @param {{ext?:string}} opts
 * @returns {{ok:boolean, reason:string}}
 */
export function isParsableNcText(text, opts = {}) {
  const ext = String(opts.ext || "").toLowerCase();
  if (ext) {
    if (/^\.mcx/.test(ext) || [".emcam", ".vnc", ".f3d", ".ipt", ".sldprt", ".step", ".stp", ".igs", ".iges", ".dxf", ".dwg"].includes(ext)) {
      return { ok: false, reason: `non-NC source extension ${ext} (CAM/CAD, not posted G-code)` };
    }
    if (!NC_TEXT_EXTS.has(ext)) return { ok: false, reason: `extension ${ext} not in NC allowlist` };
  }
  const s = String(text == null ? "" : text);
  if (!s) return { ok: false, reason: "empty" };
  const sample = s.slice(0, 8192);
  // count non-printable (outside tab/newline/CR + printable ASCII + common latin) — binary is full of them.
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) continue;
    if (c >= 32 && c <= 126) continue;
    nonPrintable++;
  }
  const ratio = sample.length ? nonPrintable / sample.length : 1;
  if (ratio > 0.05) return { ok: false, reason: `binary (non-printable ratio ${ratio.toFixed(3)} > 0.05)` };
  return { ok: true, reason: "ok" };
}

/** Is this a LATHE program (X=diameter)? A MILL program scored as lathe mints fake "diameters" from
 * XY positions (scrutiny P0: 9102741.hnc is a Hurco MILL with G17/Y/end-mill yet was force-classed
 * lathe via the .hnc ext + a G81 DRILLING cycle mis-read as turning). The fixes:
 *  - MILL is detected FIRST and VETOES lathe: a real Y-axis move OR G17/G18-with-Y OR explicit
 *    end/face/ball-mill tooling. Lathes have no Y.
 *  - turning signal = TRUE turning cycles only (G70/G71/G72/G75/G76, Okuma NTURN/NBAR) + CSS (G96/G97)
 *    + G50 spindle clamp. Drilling cycles G81-G89 are EXCLUDED (mill + lathe both use them — not a
 *    turning tell).
 *  - extension is a WEAK hint, never an override: .min (Okuma OSP) leans lathe, but .hnc (Hurco) is
 *    mill-OR-lathe so it only counts WITH a turning signal.
 * Conservative: 'lathe' only on a positive turning signal AND no mill veto; else 'mill'/'unknown'. */
export function classifyProgramAxis(text, opts = {}) {
  const t = String(text == null ? "" : text);
  const ext = String(opts.ext || "").toLowerCase();
  const hasCss = /\bG9[67]\b/.test(t);
  const hasSpindleClamp = /\bG50\b/.test(t);
  // TRUE turning cycles only (G70/71/72/75/76) — NOT G81-G89 (those are drilling, used on mills too).
  const hasTurnCycle = /\bG7[01256]\b|NTURN|NBAR/i.test(t);
  const turnSignal = hasCss || hasSpindleClamp || hasTurnCycle;
  // MILL veto: a real Y-axis feed/rapid, an XY-plane select (G17) with Y, or milling tooling words.
  const hasYAxis = /\bY[+-]?[\d.]/i.test(t);
  const hasMillPlane = /\bG17\b/.test(t);
  const hasMillTooling = /\b(end ?mill|face ?mill|ball ?(end|nose)|slot ?drill|chamfer mill)\b/i.test(t);
  const millVeto = hasYAxis || hasMillPlane || hasMillTooling;
  if (millVeto && !hasCss) return "mill"; // CSS is lathe-only; if present it outranks a stray Y
  if (turnSignal) return "lathe";
  if (ext === ".min" && !millVeto) return "lathe"; // Okuma OSP lathe ext, no mill signal
  return millVeto ? "mill" : "unknown";
}

// A rapid move (G0/G00) positions the tool — NOT part geometry. Feed moves (G1/G2/G3) cut metal, so
// their endpoints ARE the machined geometry. We track the modal motion group per line so an X/Z on a
// G0 line is excluded (this is the real fix for X20/X9/X2-clearance noise the magnitude filter missed —
// scrutiny P0-3/P1-1). A value with no motion-group context yet (header) is treated as rapid (excluded).
const RAPID_RE = /\bG0?0\b/;            // G0 or G00
const FEED_RE = /\bG0?[123]\b/;          // G1/G01/G2/G02/G3/G03 (linear + arc feed)
const ARC_RE = /\bG0?[23]\b/;            // G2/G02/G3/G03 (circular feed -- a swept contour, never a callout)

// Coordinate-equality epsilon (inch). Two X (or Z) within this are the "same" position -- so a feed move
// that re-states the modal coordinate is NOT a real change. .0001in is finer than any posted resolution.
const COORD_EPS_IN = 1e-4;

// Above this fraction of FEED moves being CONTOUR (a circular G2/G3 arc, or a diagonal G1 where BOTH X
// and Z change), the part is a CONTOUR/RADIUS/TAPER form whose program sweeps through many distinct
// diameters that the PRINT dimensions with a single R/angle callout -- so the program-diameter set is an
// unreliable answer-key for callout-recall (T-11BT: a G3 radius -> 14-27 "diameters" ~ 3-4 real callouts;
// 05850 stepped -> ~0.2 contour, GT genuine). Tuned from the perfect-parts corpus (stepped ~ 0.13-0.20,
// contour ~ 0.64-0.83); a clean gap at 0.5. Knob: opts.contourThreshold. (R12: don't score OCR against a
// GT we KNOW over-counts -- classify reliability + aggregate recall only over stepped parts, exactly like
// the existing program-not-nc / program-non-lathe skips.)
export const CONTOUR_FRACTION_THRESHOLD = 0.5;
// Below this many feed moves we cannot judge the move-profile reliably -> "insufficient" (caller's choice;
// validate treats insufficient as still-scored -- a tiny program is usually a simple stepped part).
export const MIN_FEED_MOVES_FOR_CLASS = 4;

/**
 * Pure: classify a posted lathe program's GROUND-TRUTH RELIABILITY for callout-recall by its feed-move
 * geometry. A STEPPED part (lands + faces dominate) machines the exact diameters a print labels, so its
 * program-diameter set is a trustworthy answer-key. A CONTOUR part (G2/G3 arcs or diagonal G1 ramps
 * dominate) sweeps through many intermediate diameters that the print dimensions with ONE radius/angle --
 * so scoring OCR against those points structurally ceilings recall and conflates a real OCR miss with a
 * metric artifact. Each feed move is bucketed EXACTLY ONCE: arc (G2/G3) and diagonal (X&Z both change) ->
 * contour; Z-only (X modal) -> land; X-only (Z modal) -> face; neither-changes -> stationary (ignored).
 * Rapids (G0) only update the modal position, never counted. Comments stripped first.
 * @param {string} text  posted G-code text
 * @param {{contourThreshold?:number, minFeedMoves?:number}} [opts]
 * @returns {{feedMoves:number, landMoves:number, faceMoves:number, contourMoves:number,
 *            arcMoves:number, contourFraction:number, gtClass:('stepped'|'contour'|'insufficient'),
 *            gtReliable:boolean}}
 */
export function programGtReliability(text, opts = {}) {
  const code = String(text == null ? "" : text).replace(/\([^)]*\)/g, " ");
  const threshold = Number.isFinite(opts.contourThreshold) ? opts.contourThreshold : CONTOUR_FRACTION_THRESHOLD;
  const minFeed = Number.isFinite(opts.minFeedMoves) ? opts.minFeedMoves : MIN_FEED_MOVES_FOR_CLASS;
  let modal = "rapid";
  let cx = null, cz = null;
  let feedMoves = 0, landMoves = 0, faceMoves = 0, contourMoves = 0, arcMoves = 0;
  for (const line of code.split(/\r?\n/)) {
    if (FEED_RE.test(line)) modal = "feed";
    else if (RAPID_RE.test(line)) modal = "rapid";
    const isArc = ARC_RE.test(line);
    const xm = line.match(/X\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
    const zm = line.match(/Z\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
    if (!xm && !zm) continue; // a coordinate-less line (F-only, G-only) never moves the tool
    const nx = xm ? Number(xm[1]) : cx;
    const nz = zm ? Number(zm[1]) : cz;
    // "changed" = a token is present AND it differs from the modal value (or there is no modal yet).
    const xChanged = xm != null && (cx === null || (Number.isFinite(nx) && Math.abs(nx - cx) > COORD_EPS_IN));
    const zChanged = zm != null && (cz === null || (Number.isFinite(nz) && Math.abs(nz - cz) > COORD_EPS_IN));
    if (modal === "feed") {
      feedMoves++;
      if (isArc || (xChanged && zChanged)) contourMoves++; // arc OR diagonal G1 -> swept contour
      else if (zChanged && !xChanged) landMoves++;          // Z advances at constant X -> cylinder (callout)
      else if (xChanged && !zChanged) faceMoves++;          // X moves at constant Z -> shoulder/bore (callout)
      // neither changed (a re-stated position) -> stationary, not counted into a geometry bucket
      if (isArc) arcMoves++;
    }
    cx = nx; cz = nz;
  }
  const contourFraction = feedMoves ? +(contourMoves / feedMoves).toFixed(3) : 0;
  let gtClass;
  if (feedMoves < minFeed) gtClass = "insufficient";
  else gtClass = contourFraction > threshold ? "contour" : "stepped";
  // "stepped" is reliable; "insufficient" defaults reliable (a tiny program is usually a simple step part --
  // the caller still scores it but should weight a 1-3 move part lightly); "contour" is NOT reliable.
  const gtReliable = gtClass !== "contour";
  return { feedMoves, landMoves, faceMoves, contourMoves, arcMoves, contourFraction, gtClass, gtReliable };
}

/**
 * Pure: collapse a sorted ascending list of diameters into clusters within relTol of each other, each
 * represented by the cluster MAX (the finished/as-left OD a callout dimensions — a roughing ramp
 * approaches the final dia from the stock side, so the largest in a tight cluster is the kept feature).
 * Approximates print-callout diameters from a dense roughing-pass feed set. Returns ascending reps.
 * @param {number[]} sortedAsc  distinct diameters, ascending
 * @param {number} relTol  fractional gap below which two diameters are the "same" feature (e.g. 0.03)
 * @returns {number[]}
 */
export function clusterDiameters(sortedAsc, relTol = 0.03) {
  const xs = (Array.isArray(sortedAsc) ? sortedAsc : []).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!xs.length) return [];
  const reps = [];
  let clusterMax = xs[0];
  let prev = xs[0];
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i];
    // same cluster if within relTol of the PREVIOUS value (a continuous ramp stays one cluster).
    if (prev > 0 && (v - prev) / prev <= relTol) { clusterMax = v; }
    else { reps.push(+clusterMax.toFixed(4)); clusterMax = v; }
    prev = v;
  }
  reps.push(+clusterMax.toFixed(4));
  return reps;
}

/**
 * Pure: extract CALLOUT-CLASS ground-truth dims from a posted lathe program. The key correctness fix
 * (scrutiny P0-3): GT is the set of FEED-MOVE (G1/G2/G3) endpoint diameters + the turned envelope —
 * NOT every toolpath vertex (a roughing pass steps in ~.003in increments → ~121 points a print never
 * dimensions; using those as the recall denominator structurally ceilings even a perfect OCR at ~8%).
 * Rapids (G0) are excluded as positioning, not geometry. Comments are stripped first.
 *
 * Returns: featureDiametersIn (distinct feed X, the OD/ID steps a print calls out) + envelope
 * (maxDiameterIn, lengthIn) + the raw feed X/Z (for precision scoring) + nToolpathPoints (ALL coords,
 * for context — NOT the recall denominator). The caller's recall uses featureDiametersIn + envelope.
 * @param {string} text  posted G-code text (caller pre-checks isParsableNcText)
 * @param {{ext?:string}} opts
 * @returns {{axis, featureDiametersIn:number[], maxDiameterIn:(number|null), lengthIn:(number|null),
 *            calloutDimsIn:number[], xValues:number[], zValues:number[], nToolpathPoints:number}}
 */
export function extractProgramGT(text, opts = {}) {
  const raw = String(text == null ? "" : text);
  const axis = classifyProgramAxis(raw, opts);
  const code = raw.replace(/\([^)]*\)/g, " "); // strip ( … ) comments before any coordinate read

  // Walk line by line, tracking modal motion (sticky across lines until changed). Collect X/Z under a
  // FEED group as machined geometry; values under a RAPID group (or no group yet) are positioning.
  let modal = "rapid"; // header before any motion word → treat as rapid (excluded)
  const feedX = [], feedZ = [], allX = [], allZ = [];
  for (const line of code.split(/\r?\n/)) {
    if (FEED_RE.test(line)) modal = "feed";
    else if (RAPID_RE.test(line)) modal = "rapid";
    let m; ADDR_RE.lastIndex = 0;
    while ((m = ADDR_RE.exec(line)) !== null) {
      const letter = m[1].toUpperCase();
      const v = Number(m[2]);
      if (!Number.isFinite(v)) continue;
      if (letter === "X") { allX.push(v); if (modal === "feed") feedX.push(v); }
      else if (letter === "Z") { allZ.push(v); if (modal === "feed") feedZ.push(v); }
    }
  }
  // Distinct feed-move diameters (|X|, rounded to .001in, >0) = the OD/ID values the tool fed to.
  const featureDiametersIn = [...new Set(feedX.map((v) => +Math.abs(v).toFixed(3)))].filter((v) => v > 0).sort((a, b) => a - b);
  const maxDiameterIn = featureDiametersIn.length ? Math.max(...featureDiametersIn) : null;
  const lengthIn = feedZ.length ? +(Math.max(...feedZ) - Math.min(...feedZ)).toFixed(4) : null;
  // P1 (scrutiny): a roughing pass feeds through MANY intermediate diameters in ~.003in steps that a
  // print never dimensions — inflating the recall denominator. CLUSTER feed diameters within clusterTol
  // (default 3%) into one representative (the cluster MAX = the as-left/finished OD a callout labels),
  // approximating callout-class dims. The recall denominator is then this clustered set + length.
  const clusterTol = Number.isFinite(opts.clusterTol) ? opts.clusterTol : 0.03;
  const clusteredDiametersIn = clusterDiameters(featureDiametersIn, clusterTol);
  const calloutDimsIn = [...clusteredDiametersIn];
  if (lengthIn != null && lengthIn > 0) calloutDimsIn.push(lengthIn);
  // GT-reliability classification (additive): is the program-diameter set a TRUSTWORTHY callout answer-key,
  // or does the part sweep a contour the print dimensions with R/angle? The caller (validate) aggregates
  // callout-recall ONLY over reliable (stepped) parts -- scoring OCR against a contour part's swept
  // diameters conflates a real miss with a metric artifact (R12). Same threshold + opts pass-through.
  const reliability = programGtReliability(raw, opts);
  return {
    axis,
    featureDiametersIn,                       // raw distinct feed diameters (transparency)
    clusteredDiametersIn,                     // roughing-ramp-collapsed → ~callout-class
    maxDiameterIn: maxDiameterIn != null ? +maxDiameterIn.toFixed(4) : null,
    lengthIn,
    calloutDimsIn,                            // clusteredDiameters + length = the recall denominator
    xValues: feedX, zValues: feedZ,          // feed-move values (for precision scoring)
    nToolpathPoints: allX.length + allZ.length, // ALL coords (context only — NOT the recall denominator)
    contourFraction: reliability.contourFraction, // diagonal+arc feed-move fraction
    gtClass: reliability.gtClass,             // 'stepped' | 'contour' | 'insufficient'
    gtReliable: reliability.gtReliable,       // false for contour parts (exclude from callout-recall)
    moveProfile: {                            // transparency: the bucketed feed-move counts behind the class
      feedMoves: reliability.feedMoves, landMoves: reliability.landMoves,
      faceMoves: reliability.faceMoves, contourMoves: reliability.contourMoves, arcMoves: reliability.arcMoves,
    },
  };
}

/**
 * Pure: does an OCR'd dimension value (in mm) match ANY program GT coordinate (converted to mm),
 * within a relative tolerance? Returns the best match + its program value, or null. relTol default
 * 0.02 (2%) — generous enough for OCR rounding + the program rounding to .001in, tight enough that a
 * spurious dim won't match. Both compared in mm.
 * @param {number} dimMm  an OCR'd dimension in mm
 * @param {number[]} programXZin  the program's part X+Z values (inch)
 * @param {{relTol?:number}} opts
 * @returns {{matched:boolean, programMm:(number|null), relErr:(number|null)}}
 */
export function dimMatchesProgram(dimMm, programXZin, opts = {}) {
  const relTol = Number.isFinite(opts.relTol) ? opts.relTol : 0.02;
  if (!Number.isFinite(dimMm) || dimMm === 0 || !Array.isArray(programXZin)) return { matched: false, programMm: null, relErr: null };
  let best = null;
  for (const xin of programXZin) {
    const pmm = Math.abs(xin) * INCH_TO_MM;
    if (pmm === 0) continue;
    const relErr = Math.abs(dimMm - pmm) / pmm;
    if (best === null || relErr < best.relErr) best = { programMm: +pmm.toFixed(4), relErr: +relErr.toFixed(5) };
  }
  if (!best) return { matched: false, programMm: null, relErr: null };
  return { matched: best.relErr <= relTol, programMm: best.programMm, relErr: best.relErr };
}

/**
 * Pure: score one part's OCR dims against its program GT. The recall denominator is the CALLOUT-CLASS
 * GT (`calloutDimsIn` = distinct feed-move feature diameters + overall length) — the dims a print
 * actually labels — NOT every toolpath vertex (scrutiny P0-3: a 121-point denominator structurally
 * ceilings even perfect OCR at ~8% and would falsely fail the corpus). Recall = fraction of
 * callout-class GT corroborated by SOME OCR dim. Precision = fraction of OCR dims that match SOME
 * callout-class GT. Together: "did the OCR read the dimensions the part is actually machined to?"
 * @param {number[]} ocrDimsMm  OCR'd dimensions (mm)
 * @param {object} programGT     from extractProgramGT (uses .calloutDimsIn)
 * @param {{relTol?:number}} opts
 * @returns {{gtCount:number, gtMatched:number, recall:number, ocrCount:number, ocrMatched:number,
 *            precision:number, matchedPairs:Array, toolpathPoints:number}}
 */
export function scorePartAgainstProgram(ocrDimsMm, programGT, opts = {}) {
  const ocr = (Array.isArray(ocrDimsMm) ? ocrDimsMm : []).filter((d) => Number.isFinite(d) && d > 0);
  // callout-class GT (feature diameters + length) — the print-level dims, not toolpath points.
  const calloutIn = programGT && Array.isArray(programGT.calloutDimsIn) ? programGT.calloutDimsIn : [];
  const gtDistinct = [...new Set(calloutIn.map((v) => +Math.abs(v).toFixed(3)))].filter((v) => v > 0);
  const relTol = Number.isFinite(opts.relTol) ? opts.relTol : 0.02;

  let gtMatched = 0;
  for (const gin of gtDistinct) {
    const gmm = gin * INCH_TO_MM;
    if (ocr.some((d) => Math.abs(d - gmm) / gmm <= relTol)) gtMatched++;
  }
  const matchedPairs = [];
  let ocrMatched = 0;
  for (const d of ocr) {
    const mr = dimMatchesProgram(d, gtDistinct, { relTol });
    if (mr.matched) { ocrMatched++; matchedPairs.push({ ocrMm: +d.toFixed(4), programMm: mr.programMm, relErr: mr.relErr }); }
  }
  return {
    gtCount: gtDistinct.length, gtMatched, recall: gtDistinct.length ? +(gtMatched / gtDistinct.length).toFixed(4) : 0,
    ocrCount: ocr.length, ocrMatched, precision: ocr.length ? +(ocrMatched / ocr.length).toFixed(4) : 0,
    matchedPairs: matchedPairs.slice(0, 20),
    toolpathPoints: programGT && Number.isFinite(programGT.nToolpathPoints) ? programGT.nToolpathPoints : 0,
  };
}

/**
 * Pure: the program-GT analog of the synthetic `perDimCorrectness` -- turn a part's fused OCR dimensions
 * into {f, correct} calibration samples using the CNC program as the answer key (REAL machined GT, not
 * synthetic). For each fused dim: f = agreement fraction (corroboration / n_models); correct = the dim
 * matches a callout-class machined diameter within relTol (the SAME dimMatchesProgram contract the recall
 * scorer uses -- gtDistinct is INCH, dimMm is mm, the matcher converts internally). Only dims from a
 * >=minModels ensemble are emitted: a single-model dim has no real agreement signal (f would be the model
 * agreeing with itself), the same corroboration gate buildTrainsetRow applies. Returns [] when the part
 * has no callout GT (correctness cannot be labeled without an answer key).
 *
 * This is the bridge that lets the closed-loop calibration corpus be grounded in REAL programs
 * (tag these source:"program-gt") rather than only synthetic prints -- feeding the durable
 * calibration-sample-store so P(correct | agreement f) reflects real-scan domain shift, not clean synthetic.
 * @param {Array<{value_mm:number, corroboration:number, n_models:number, type?:string}>} fusedDims
 * @param {object} programGT  from extractProgramGT / extractMillProgramGT (uses .calloutDimsIn)
 * @param {{relTol?:number, minModels?:number, diameterOnly?:boolean}} opts
 *   diameterOnly (default true): adjudicate ONLY diameter-class dims (the GT carries diameters), so a
 *   correctly-read non-diameter dim is EXCLUDED rather than mislabeled incorrect. Pass false to emit all.
 * @returns {Array<{f:number, correct:boolean}>}
 */
export function programGtAgreementSamples(fusedDims, programGT, opts = {}) {
  const relTol = Number.isFinite(opts.relTol) ? opts.relTol : 0.02;
  const minModels = Number.isFinite(opts.minModels) ? opts.minModels : 2;
  const diameterOnly = opts.diameterOnly !== false; // default ON: adjudicate only the GT's diameter class
  const calloutIn = programGT && Array.isArray(programGT.calloutDimsIn) ? programGT.calloutDimsIn : [];
  const gtDistinct = [...new Set(calloutIn.map((v) => +Math.abs(v).toFixed(3)))].filter((v) => v > 0);
  if (gtDistinct.length === 0) return []; // no callout answer-key -> correctness is unlabelable
  const out = [];
  for (const d of (Array.isArray(fusedDims) ? fusedDims : [])) {
    if (!d || !Number.isFinite(d.value_mm) || d.value_mm <= 0) continue;
    // adjudicate ONLY the diameter class the program GT carries: drop a KNOWN non-diameter type (linear/
    // angle/radius/position) -- it has no diameter answer-key, so labeling a correctly-read one incorrect
    // is a false negative that biases the calibration. UNKNOWN type is kept (value-only fallback).
    if (diameterOnly) { const dt = dimType(d); if (dt != null && !DIAMETER_TYPES.has(dt)) continue; }
    const nm = Number.isFinite(d.n_models) && d.n_models > 0 ? d.n_models : 0;
    if (nm < minModels) continue; // need >=2 models for a real agreement fraction
    const corr = Number.isFinite(d.corroboration) ? d.corroboration : 0;
    const f = corr / nm;
    if (!(f > 0 && f <= 1)) continue; // out-of-range agreement -> not a usable sample
    const correct = dimMatchesProgram(d.value_mm, gtDistinct, { relTol }).matched;
    out.push({ f: +f.toFixed(4), correct });
  }
  return out;
}

// -----------------------------------------------------------------------------
// MILL ground-truth (U-XRAY-MILL-PROGRAM-GT) -- broaden the closed-loop measurement to MILL parts.
//
// A mill program's X/Y are POSITIONS, not feature dimensions (unlike a lathe's X=diameter), so the
// lathe extractor above SKIPS mill (classifyProgramAxis -> 'mill' -> validate skips it). That makes the
// whole MILL share of the perfect-parts corpus invisible to the closed loop. The machined feature
// dimensions a PRINT actually labels come from two reliable, plain-text mill sources:
//   1. HOLE diameters named in tool-change comments -- (.250 DRILL), (1/2 REAM), (.531 C'BORE). A
//      drilled / reamed / bored / counterbored / spot-faced hole is dimensioned on the print BY its
//      diameter, so the comment diameter IS the print callout. EXCLUDED on purpose (R12 -- never mint a
//      GT a print does not carry):
//        - TAP-DRILL diameters (.201 for 1/4-20): a THREADED hole is dimensioned by its THREAD callout
//          ("1/4-20"), never the tap-drill diameter; that value is not on the print and would be false GT.
//        - END-MILL / BALL / FACE-MILL / CHAMFER TOOL diameters: the pocket/contour a cutter makes is
//          dimensioned by geometry, not the cutter diameter.
//      (A c'bore / c'sink / ream / bore diameter is INCLUDED even when the comment also names a thread --
//       the c'bore FOR a 1/4-20 SHCS is still a dimensioned diameter.)
//   2. BORE / circular-pocket diameters from a FULL-CIRCLE G2/G3 arc -- geometric: a circular
//      interpolation that returns to its start point is a bore / round pocket whose diameter = 2*radius,
//      radius = sqrt(I^2 + J^2) from the incremental center offset (ISO 6983 G02/G03). A partial arc (a
//      contour fillet) is NOT a feature diameter and is excluded -- only a closed circle counts.
//
// Output MIRRORS extractProgramGT (axis / calloutDimsIn / featureDiametersIn / nToolpathPoints +
// gt-reliability) so scorePartAgainstProgram + the validate runner consume mill GT with NO downstream
// change. GT is reliable iff >=1 hole/bore feature was found; an empty mill GT is gtReliable:false
// ('mill-no-features') so the runner SKIPS it -- scoring OCR against an empty GT would mint a fake
// recall=0 (the same honesty rule the contour guard enforces above). Units INCH (JM); caller x25.4 -> mm.

const DIAMETER_MAX_IN = 6; // a tool diameter above this inch bound is an angle/qty/tool-number misread, not a dia
// Fractional-inch: 1/2, 27/64, or a mixed number 1-1/4 / 1 1/4.
const FRACTION_IN_RE = /\d+\s*[- ]\s*\d+\s*\/\s*\d+|\d+\s*\/\s*\d+/;
const XYZ_COORD_RE = /[XYZ]\s*[+-]?(?:\d+\.?\d*|\.\d+)/gi;
const BORE_EPS_IN = 1e-4; // a G2/G3 endpoint within this of its start = a closed (full) circle
const BORE_MAX_IN = 24;   // a 2*radius beyond a realistic JM machine envelope (~24in) is a misparsed arc center, not a bore

/**
 * Pure: parse a fractional-inch string to a decimal. Handles a simple fraction ("27/64" -> 0.421875) and
 * a mixed number ("1-1/4" or "1 1/4" -> 1.25). Returns null if `str` is not a fraction (a plain decimal or
 * integer is not this function's job). Six-place rounded so 1/3-style repeats are stable.
 * @param {string} str
 * @returns {number|null}
 */
export function fractionToDecimal(str) {
  const s = String(str == null ? "" : str).trim();
  let m = s.match(/^(\d+)\s*[- ]\s*(\d+)\s*\/\s*(\d+)$/); // mixed: whole [-| ] num/den
  if (m) { const w = +m[1], n = +m[2], d = +m[3]; return d > 0 ? +(w + n / d).toFixed(6) : null; }
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);                    // simple: num/den
  if (m) { const n = +m[1], d = +m[2]; return d > 0 ? +(n / d).toFixed(6) : null; }
  return null;
}

/**
 * Pure: pull the first plausible DIAMETER value (inch) out of a tool-comment string -- a decimal-pointed
 * number first (the dominant shop form), else a fraction. Bounded to 0 < v < DIAMETER_MAX_IN so an angle
 * ("82 DEG"), a feed, or a tool number is never read as a diameter. Returns null if none.
 * @param {string} comment
 * @returns {number|null}
 */
export function extractDiameterToken(comment) {
  const c = String(comment == null ? "" : comment);
  // 1. a decimal immediately BEFORE a DIA/DIAM keyword is unambiguously the diameter (".531 DIA") -- this
  //    resolves a "diameter-second" layout like "C'BORE .250 DEEP .531 DIA" (depth first, diameter second).
  const diaFirst = c.match(/(\d*\.\d+)\s*(?:DIA\b|DIAM)/i);
  if (diaFirst) { const v = Number(diaFirst[1]); if (v > 0 && v < DIAMETER_MAX_IN) return +v.toFixed(4); }
  // 2. else the first in-bound decimal that is NOT a depth/angle/pitch value -- ".250 DEEP", "82 DEG",
  //    ".050 DP", "20 TPI" are not diameters. A BARE integer (no decimal point) is never a diameter.
  for (const m of c.matchAll(/(\d*\.\d+)\s*([A-Za-z.]*)/g)) {
    const v = Number(m[1]); if (!(v > 0 && v < DIAMETER_MAX_IN)) continue;
    if (/^(DEEP|DP|DEPTH|DEG|TPI|PITCH)/i.test(m[2] || "")) continue;
    return +v.toFixed(4);
  }
  // 3. fractional-inch fallback (1/2, 27/64, 1-1/4)
  const fm = c.match(FRACTION_IN_RE);
  if (fm) { const v = fractionToDecimal(fm[0]); if (v != null && v > 0 && v < DIAMETER_MAX_IN) return v; }
  return null;
}

/**
 * Pure: classify ONE tool-change comment and (when it is a print-dimensioned HOLE feature) extract its
 * diameter. Returns {kind, diameterIn}. kind in drill|ream|bore|cbore|csk|spot (hole features, diameter
 * emitted) | tap (tap-drill / thread, diameter SUPPRESSED) | mill-tool (end/ball/face/chamfer cutter,
 * suppressed) | null (no recognizable feature). The suppression rules encode the R12 correctness point:
 * a tap-drill diameter and an end-mill diameter are NOT dimensions a print carries.
 * @param {string} comment  the text inside one ( ... )
 * @returns {{kind:(string|null), diameterIn:(number|null)}}
 */
export function parseToolComment(comment) {
  const c = String(comment == null ? "" : comment);
  const U = c.toUpperCase();
  // milling cutter -> cut feature is dimensioned by geometry, not the cutter diameter. Suppress.
  const isMillTool = /END\s*MILL|ENDMILL|\bEM\b|BALL\s*(END|NOSE|MILL)|FACE\s*MILL|CHAMFER|THREAD\s*MILL|SLOT\s*DRILL|DOVETAIL|FLY\s*CUT/i.test(U);
  // thread context -- a tapped hole is dimensioned by its thread, never the tap-drill diameter. The
  // size-dash-pitch `\d+-\d+` excludes a trailing `/` so a MIXED FRACTION ("1-15/32 DRILL", a 1.469"
  // drill) is NOT misread as a thread series and silently dropped (live: JM corpus has 1-15/32 drills).
  const isThread = /\bTAP\b|\bTHREAD\b|\bUNC\b|\bUNF\b|\bUNEF\b|\bNPT\b|\bNPTF\b|\b\d+\s*-\s*\d+\b(?!\s*\/)|\bM\d+(?:\.\d+)?\s*[xX]/i.test(c);
  // hole-feature keyword (most-specific first: c'bore/c'sink before bore/drill).
  const holeKind =
    /C['` ]?\s*BORE|COUNTERBORE/i.test(c) ? "cbore" :
    /C['` ]?\s*SINK|COUNTERSINK|\bCSK\b|\bC'?SK\b/i.test(c) ? "csk" :
    /\bREAM/i.test(c) ? "ream" :
    /\bBORE\b/i.test(c) ? "bore" :
    // SPOT FACE / SPOTFACE only -- a bare "SPOT" is a spot DRILL (a center mark / chamfer-start), NOT a
    // print-dimensioned diameter; only a spot FACE (a fastener bearing-surface counterbore) is. (Live
    // validation, ALL STAR.NC: "(T1|.25 SPOT|...)" was a .25 spot drill, not a dia .25 callout.)
    /\bSPOT\s*FACE|\bSPOTFACE\b/i.test(c) ? "spot" :
    /\bDRILL\b/i.test(c) ? "drill" : null;
  if (isMillTool) return { kind: "mill-tool", diameterIn: null };
  // a DRILL in a thread context is a tap drill -> suppress; a c'bore/ream/bore for a tapped hole keeps its dia.
  if (holeKind === "drill" && isThread) return { kind: "tap", diameterIn: null };
  if (!holeKind) return { kind: null, diameterIn: null };
  return { kind: holeKind, diameterIn: extractDiameterToken(c) };
}

const MILL_HOLE_KINDS = Object.freeze(new Set(["drill", "ream", "bore", "cbore", "csk", "spot"]));

/**
 * Pure: distinct hole-class diameters (inch, ascending) named across all ( ... ) tool comments in a mill
 * program. Tap-drills + end-mill/ball/face/chamfer tools contribute nothing (parseToolComment suppresses
 * their diameter). Comments are the source here (the OPPOSITE of the coordinate parser, which strips them).
 * @param {string} text
 * @returns {number[]}
 */
export function extractMillHoleDiameters(text) {
  const t = String(text == null ? "" : text);
  const out = [];
  for (const m of t.matchAll(/\(([^)]*)\)/g)) {
    const { kind, diameterIn } = parseToolComment(m[1]);
    if (diameterIn != null && MILL_HOLE_KINDS.has(kind)) out.push(+diameterIn.toFixed(4));
  }
  return [...new Set(out.map((v) => +v.toFixed(3)))].filter((v) => v > 0).sort((a, b) => a - b);
}

/**
 * Pure: bore / round-pocket diameters (inch, ascending) from FULL-CIRCLE G2/G3 arcs. A circular feed that
 * returns to its start point (endpoint within BORE_EPS_IN of the modal start) is a closed circle whose
 * radius = sqrt(I^2 + J^2) (incremental center offset); diameter = 2*radius. A partial arc (a contour
 * fillet, endpoint not equal to start) is NOT a feature diameter and is excluded. Helical bores (Z ramps
 * while X/Y circle) still register -- only the X/Y closure is tested. Comments stripped first so a
 * commented "G3" never parses.
 * @param {string} text
 * @returns {number[]}
 */
export function extractMillBoreDiameters(text) {
  const code = String(text == null ? "" : text).replace(/\([^)]*\)/g, " ");
  const out = [];
  let cx = null, cy = null;
  // SCOPE: I/J-center arcs only (the standard closed-circle form); an R-format full circle is not
  // expressible (a single R is ambiguous over 360deg) so R-arcs are correctly out of scope. Uppercase
  // G2/G3 (posted code is uppercase) -- matches the rest of this lib's case-sensitive G-code handling.
  for (const line of code.split(/\r?\n/)) {
    const isArc = ARC_RE.test(line);
    const xm = line.match(/X\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
    const ym = line.match(/Y\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
    const im = line.match(/I\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
    const jm = line.match(/J\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
    const nx = xm ? Number(xm[1]) : cx;
    const ny = ym ? Number(ym[1]) : cy;
    if (isArc && im && jm && cx !== null && cy !== null) {
      const I = Number(im[1]), J = Number(jm[1]);
      const radius = Math.sqrt(I * I + J * J);
      const closed = Math.abs((Number.isFinite(nx) ? nx : cx) - cx) < BORE_EPS_IN && Math.abs((Number.isFinite(ny) ? ny : cy) - cy) < BORE_EPS_IN;
      const dia = +(2 * radius).toFixed(4);
      // bound the emitted diameter -- a runaway/misparsed arc center (I999999) must not mint a junk bore
      // into the recall denominator (the metric-artifact class the contour guard above also defends).
      if (closed && dia > 0 && dia < BORE_MAX_IN) out.push(dia);
    }
    cx = nx; cy = ny;
  }
  return [...new Set(out.map((v) => +v.toFixed(3)))].filter((v) => v > 0).sort((a, b) => a - b);
}

/**
 * Pure: extract CALLOUT-CLASS ground-truth dims from a posted MILL program -- the hole/bore feature
 * diameters a print labels. Returns the SAME shape as extractProgramGT (so scorePartAgainstProgram + the
 * validate runner are unchanged): calloutDimsIn = distinct hole + bore diameters (inch). gtReliable iff
 * >=1 feature was found ('mill-holes'); an empty mill GT ('mill-no-features') is NOT reliable so the
 * caller skips it rather than scoring OCR against nothing. A mill part has no single turned-length axis
 * (its envelope is stock, not a callout) -> lengthIn null.
 * @param {string} text  posted mill G-code text (caller pre-checks isParsableNcText)
 * @param {{ext?:string}} [opts]
 * @returns {object}  mirrors extractProgramGT's return contract
 */
export function extractMillProgramGT(text /*, opts */) {
  const raw = String(text == null ? "" : text);
  const holeDiametersIn = extractMillHoleDiameters(raw);
  const boreDiametersIn = extractMillBoreDiameters(raw);
  const calloutDimsIn = [...new Set([...holeDiametersIn, ...boreDiametersIn].map((v) => +v.toFixed(3)))].filter((v) => v > 0).sort((a, b) => a - b);
  let nToolpathPoints = 0;
  for (const line of raw.replace(/\([^)]*\)/g, " ").split(/\r?\n/)) {
    const m = line.match(XYZ_COORD_RE); if (m) nToolpathPoints += m.length;
  }
  const gtReliable = calloutDimsIn.length > 0;
  return {
    axis: "mill",
    featureDiametersIn: calloutDimsIn,        // hole+bore dia (transparency + the validate feature_diameters_in field)
    holeDiametersIn,                          // from tool-comment hole callouts
    boreDiametersIn,                          // from full-circle G2/G3 arcs
    clusteredDiametersIn: calloutDimsIn,      // mill features are already discrete (no roughing-ramp clustering)
    maxDiameterIn: calloutDimsIn.length ? +Math.max(...calloutDimsIn).toFixed(4) : null,
    lengthIn: null,                           // a mill part has no single turned-length axis
    calloutDimsIn,                            // the recall denominator (consumed by scorePartAgainstProgram)
    xValues: [], zValues: [],
    nToolpathPoints,                          // ALL X/Y/Z coords (context only -- NOT the recall denominator)
    contourFraction: 0,
    gtClass: gtReliable ? "mill-holes" : "mill-no-features",
    gtReliable,
    moveProfile: { holes: holeDiametersIn.length, bores: boreDiametersIn.length },
  };
}

export { INCH_TO_MM };
