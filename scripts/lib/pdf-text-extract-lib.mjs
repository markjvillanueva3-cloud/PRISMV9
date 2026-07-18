// scripts/lib/pdf-text-extract-lib.mjs
//
// U-TDP07 — Deterministic engineering-print text extractor (pure core).
//
// CAD-exported PDFs (SolidWorks, Fusion, Inventor) emit dimension callouts as
// embedded text strings in a canonical multi-token form. Example from a real
// JM Die carbide-tip print:
//
//   '5.00'      ← nominal
//   'n'         ← Ø glyph (PyMuPDF maps Ø codepoint to glyph-name 'n')
//   '- .10'     ← lower tolerance
//   '.10'       ← upper tolerance
//   '+'
//   'mm'
//
// This lib accepts the joined PyMuPDF text and emits BlueprintExtraction-shape
// dimensions WITHOUT calling any LLM. Higher precision than a 1.8B vision
// model on the 3.5% of the JM Die corpus that has embedded text.
//
// PURE: no fs, no network. Caller does the PDF read.
//
// Sample of recoverable patterns (canonical token stream order, NOT regex):
//   bilateral-Ø:     <n> 'n' '- .X' '.Y' '+' 'mm'  → diameter <n>, +Y/-X
//   bilateral-plain: <n> '- .X' '.Y' '+' 'mm'      → linear <n>, +Y/-X
//   unilateral:      '<n> - .X' '.Y' '+' 'mm'      → linear <n>, +Y/-X (oddly-grouped)
//   stuck:           '<n>mm'                        → linear <n>, no tol
//   radius:          'R<n>mm'                       → radius <n>
//   chamfer:         '.X X <a>° CHAMFER'            → chamfer X, <a>°
//   angle:           '<a>°'                         → angle <a>
//   relief-pattern:  'Air Flat <n>mm deep' + '<count> x <angle>°'
//                                                   → cross_drilled_relief_holes
//   material:        line starts 'Material:'
//   surface:         line starts 'Surface:'
//   roughness:       'Ra <n>' (sometimes prefixed with check-mark glyph)

const NUM_RE = /^-?\d+(?:\.\d+)?$/;
const NUM_DOT_LEAD_RE = /^-?\.\d+$/;
const SIGNED_DOT_RE = /^[-+]\s*\.?\d+(?:\.\d+)?$/;
const RADIUS_RE = /^R(\d+(?:\.\d+)?)\s*mm?$/i;
const STUCK_MM_RE = /^(\d+(?:\.\d+)?)mm$/i;
const ANGLE_RE = /^(\d+(?:\.\d+)?)\s*°$/;
const CHAMFER_RE = /^\.?(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)\s*°\s*CHAMFER$/i;
const RA_RE = /Ra\s*(\d+(?:\.\d+)?)/i;
const MATERIAL_RE = /^Material:\s*(.+)$/i;
const SURFACE_RE = /^Surface:\s*(.+)$/i;
const GRADE_RE = /^Grade\s*\[HRC\]:\s*(.+)$/i;
const AIR_FLAT_RE = /^Air Flat\s+\.?(\d+(?:\.\d+)?)\s*mm\s+deep$/i;
const PATTERN_RE = /^(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*°$/;
const UNILATERAL_LINEAR_RE = /^(\d+(?:\.\d+)?)\s*-\s*\.?(\d+(?:\.\d+)?)$/; // "20.00 - .00"
const CHAMFER_SIZE_TOL_RE = /^\.?(\d+(?:\.\d+)?)\s*-\s*\.?(\d+(?:\.\d+)?)$/; // ".30 - .00"

// Diameter glyphs PyMuPDF may emit for the Ø codepoint depending on font:
// 'n' (most common on shop SolidWorks fonts), 'Ø', '⌀', 'O', 'phi'.
const DIA_GLYPH_TOKENS = new Set(["n", "Ø", "⌀", "O", "o", "phi", "Phi", "PHI"]);

// Kind-classification thresholds. Tuned against the JM Die canonical templates
// (CADClassFeatureLibraryEngine.canonicalTemplates) and the carbide-tip family
// drawings. Tighten by feature-class as the corpus grows.
const FILLET_LEADING_EDGE_MAX_MM = 2.0;
const FILLET_SHOULDER_MAX_MM = 5.0;
const OIL_HOLE_TIGHT_TOL_BAND_MM = 0.05;
const OIL_HOLE_MAX_BORE_MM = 3.0;
const OIL_HOLE_FALLBACK_BORE_MM = 1.5;
const STEPPED_AXIS_DIA_MIN_MM = 8.0;
const STEPPED_AXIS_DIA_MAX_MM = 25.0;
const CHAMFER_ANGLE_TOLERANCE_DEG = 1.0;
const CHAMFER_NOMINAL_DEG = 45.0;
const WORKING_TIP_ANGLE_MIN_DEG = 100.0;
const WORKING_TIP_ANGLE_MAX_DEG = 170.0;
const RELIEF_PATTERN_COUNT_MIN = 2;
const RELIEF_PATTERN_COUNT_MAX = 12;

function toLines(rawText) {
  if (typeof rawText !== "string") return [];
  return rawText.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
}

function parseSignedTolLine(s) {
  // accepts: "- .10", "-.10", "+ .05", "+.05", ".10"
  // returns: { sign: -1|+1, value: number } or null
  if (!s) return null;
  const t = s.trim();
  const m = t.match(/^([-+]?)\s*\.?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  let valStr = m[2];
  // ".10" → 0.10
  if (!valStr.includes(".") && t.startsWith(".")) valStr = "0." + valStr;
  if (!valStr.includes(".") && t.replace(/^[-+]/, "").startsWith(".")) valStr = "0." + valStr;
  // If original token started with ".", numeric value is fractional (0.X).
  if (t.replace(/^[-+]\s*/, "").startsWith(".")) {
    valStr = "0." + m[2].replace(/^0?\./, "");
  }
  const v = Number(valStr);
  if (!Number.isFinite(v)) return null;
  return { sign, value: v };
}

/**
 * Recognize a "split" tolerance triple in the token stream at index i.
 * Expected forms (after the leading nominal token):
 *   (i)   tolA      e.g. '- .10' or '-.02'
 *   (i+1) tolB      e.g. '.10' or '.00'
 *   (i+2) '+'
 *   (i+3) 'mm'
 *
 * Returns { upper, lower, advance } or null on no-match.
 */
function tryParseToleranceTriple(lines, i) {
  if (i + 3 >= lines.length) return null;
  const t0 = lines[i];
  const t1 = lines[i + 1];
  const t2 = lines[i + 2];
  const t3 = lines[i + 3];
  // The "+" token may have a trailing space; the "mm" token may be "mm" exactly.
  if (t2.trim() !== "+") return null;
  if (t3.trim().toLowerCase() !== "mm") return null;
  const a = parseSignedTolLine(t0);
  const b = parseSignedTolLine(t1);
  if (!a || !b) return null;
  // Assign sign-aware: the one with explicit "-" is lower, "+ <num>" or unsigned-".10" after a "-" is upper.
  // Convention: if t0 starts with "-", it's lower; t1 is upper (paired with "+").
  let lower, upper;
  if (t0.trim().startsWith("-")) {
    lower = -Math.abs(a.value);
    upper = +Math.abs(b.value);
  } else if (t0.trim().startsWith("+")) {
    upper = +Math.abs(a.value);
    lower = -Math.abs(b.value);
  } else {
    // Ambiguous (no leading sign on first tolerance line). Treat as +/- pair.
    upper = +Math.abs(a.value);
    lower = -Math.abs(b.value);
  }
  return { upper, lower, advance: 4 };
}

/**
 * Heuristic kind-classification from dimension geometry.
 * Drives mapping into the PRISM canonical feature taxonomy used elsewhere
 * (CADClassFeatureLibraryEngine, GroundTruthRegistry).
 */
function classifyKind(d) {
  // d: { kind:'diameter'|'linear'|'radius'|'chamfer'|'angle', nominal, tolerance? }
  if (d.kind === "chamfer") return "bevel_face_chamfer";
  if (d.kind === "radius") {
    if (d.nominal <= FILLET_LEADING_EDGE_MAX_MM) return "leading_edge_fillet";
    if (d.nominal <= FILLET_SHOULDER_MAX_MM) return "shoulder_fillet";
    return "blade_root_fillet";
  }
  if (d.kind === "diameter") {
    const tolBand = d.tolerance ? Math.abs(d.tolerance.upper - d.tolerance.lower) : null;
    if (tolBand !== null && tolBand <= OIL_HOLE_TIGHT_TOL_BAND_MM && d.nominal <= OIL_HOLE_MAX_BORE_MM) {
      return "central_oil_hole";
    }
    if (d.nominal <= OIL_HOLE_FALLBACK_BORE_MM) return "central_oil_hole";
    return "stepped_revolved_axis";
  }
  if (d.kind === "linear") return "stepped_revolved_axis";
  if (d.kind === "angle") {
    if (Math.abs(d.nominal - CHAMFER_NOMINAL_DEG) <= CHAMFER_ANGLE_TOLERANCE_DEG) return "bevel_face_chamfer";
    return "working_tip_taper";
  }
  return d.kind;
}

export function extractDimensionsFromText(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { success: false, error: "empty text", extraction: null };
  }
  const lines = toLines(rawText);
  const dimensions = [];
  let material = null;
  let surface = null;
  let grade = null;
  let roughnessRa = null;
  // For relief-pattern composition (Air Flat + N x angle°)
  let pendingAirFlatDepth = null;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln) continue;

    // Material/surface/grade
    let m;
    if ((m = ln.match(MATERIAL_RE))) { material = m[1].trim(); continue; }
    if ((m = ln.match(SURFACE_RE))) { surface = m[1].trim(); continue; }
    if ((m = ln.match(GRADE_RE))) { grade = m[1].trim(); continue; }

    // Surface roughness: 'Ra 0.05' (may be in same line as check-mark glyph)
    const raMatch = ln.match(RA_RE);
    if (raMatch && roughnessRa === null) {
      roughnessRa = Number(raMatch[1]);
      continue;
    }

    // Chamfer (single-line form): ".30 X 45.0° CHAMFER"
    if ((m = ln.match(CHAMFER_RE))) {
      const sizeStr = ln.startsWith(".") ? "0." + m[1] : m[1];
      const size = Number(sizeStr);
      const angle = Number(m[2]);
      const dim = { kind: "chamfer", nominal: size, angle_deg: angle };
      const canonical = classifyKind(dim);
      dimensions.push({ kind: canonical, nominal: size, meta: { type: "chamfer", angle_deg: angle, source: "embedded-text" } });
      continue;
    }

    // Radius: "R1.00mm"
    if ((m = ln.match(RADIUS_RE))) {
      const r = Number(m[1]);
      const canonical = classifyKind({ kind: "radius", nominal: r });
      dimensions.push({ kind: canonical, nominal: r, meta: { type: "radius", source: "embedded-text" } });
      continue;
    }

    // Stuck-mm form: "4.00mm" or "70.00mm"
    if ((m = ln.match(STUCK_MM_RE))) {
      const v = Number(m[1]);
      const canonical = classifyKind({ kind: "linear", nominal: v });
      dimensions.push({ kind: canonical, nominal: v, meta: { type: "linear", source: "embedded-text" } });
      continue;
    }

    // Angle: "20.0°" or "150.0°"
    if ((m = ln.match(ANGLE_RE))) {
      const a = Number(m[1]);
      const canonical = classifyKind({ kind: "angle", nominal: a });
      dimensions.push({ kind: canonical, nominal: a, meta: { type: "angle", angle_deg: a, source: "embedded-text" } });
      continue;
    }

    // Relief-pattern composition: "Air Flat .05mm deep" then later "3 x 120°"
    if ((m = ln.match(AIR_FLAT_RE))) {
      pendingAirFlatDepth = Number((ln.includes(".") && !m[1].includes(".")) ? "0." + m[1] : m[1]);
      continue;
    }
    if ((m = ln.match(PATTERN_RE))) {
      const count = Number(m[1]);
      const spacing = Number(m[2]);
      if (pendingAirFlatDepth !== null && count >= 2 && count <= 12) {
        dimensions.push({
          kind: "cross_drilled_relief_holes",
          nominal: pendingAirFlatDepth,
          meta: {
            type: "relief_pattern",
            count,
            spacing_deg: spacing,
            depth_mm: pendingAirFlatDepth,
            source: "embedded-text",
          },
        });
        pendingAirFlatDepth = null;
        continue;
      }
    }

    // Unilateral linear: "20.00 - .00" then ".10" + "+" + "mm"
    if ((m = ln.match(UNILATERAL_LINEAR_RE)) && i + 3 < lines.length) {
      const nominal = Number(m[1]);
      const lowerVal = Number("0." + m[2].replace(/^0?\./, ""));
      const upperLine = lines[i + 1];
      const plusLine = lines[i + 2];
      const mmLine = lines[i + 3];
      if (plusLine.trim() === "+" && mmLine.trim().toLowerCase() === "mm") {
        const upperParsed = parseSignedTolLine(upperLine);
        if (upperParsed) {
          dimensions.push({
            kind: classifyKind({ kind: "linear", nominal, tolerance: { upper: upperParsed.value, lower: -lowerVal } }),
            nominal,
            tolerance: { upper: +Math.abs(upperParsed.value), lower: -Math.abs(lowerVal) },
            meta: { type: "linear", source: "embedded-text" },
          });
          i += 3;
          continue;
        }
      }
    }

    // Bare-number nominal followed by diameter-glyph + tolerance-triple
    // e.g.  '5.00'  'n'  '- .10'  '.10'  '+'  'mm'
    if (NUM_RE.test(ln)) {
      const nominal = Number(ln);
      // Lookahead for 'n' (Ø glyph)
      if (i + 1 < lines.length && DIA_GLYPH_TOKENS.has(lines[i + 1].trim())) {
        const trip = tryParseToleranceTriple(lines, i + 2);
        if (trip) {
          const dim = { kind: "diameter", nominal, tolerance: { upper: trip.upper, lower: trip.lower } };
          const canonical = classifyKind(dim);
          dimensions.push({
            kind: canonical,
            nominal,
            tolerance: { upper: trip.upper, lower: trip.lower },
            meta: { type: "diameter", source: "embedded-text" },
          });
          i += 1 + trip.advance;
          continue;
        }
        // diameter without recovered tolerance → still record
        const canonical = classifyKind({ kind: "diameter", nominal });
        dimensions.push({ kind: canonical, nominal, meta: { type: "diameter", source: "embedded-text" } });
        i += 1;
        continue;
      }
      // Bare nominal followed by tolerance-triple (no diameter glyph) → linear bilateral
      const trip = tryParseToleranceTriple(lines, i + 1);
      if (trip) {
        const dim = { kind: "linear", nominal, tolerance: { upper: trip.upper, lower: trip.lower } };
        const canonical = classifyKind(dim);
        dimensions.push({
          kind: canonical,
          nominal,
          tolerance: { upper: trip.upper, lower: trip.lower },
          meta: { type: "linear", source: "embedded-text" },
        });
        i += trip.advance;
        continue;
      }
    }
  }

  // Confidence heuristic:
  //   0.95 if ≥3 toleranced dims AND material/surface present
  //   0.85 if ≥2 toleranced dims
  //   0.70 if ≥1 toleranced dim
  //   0.50 if only untoleranced dims
  //   0.10 if no dims at all (caller should fall back to vision)
  const tolCount = dimensions.filter((d) => d.tolerance).length;
  let confidence;
  if (dimensions.length === 0) confidence = 0.10;
  else if (tolCount >= 3 && material && surface) confidence = 0.95;
  else if (tolCount >= 2) confidence = 0.85;
  else if (tolCount >= 1) confidence = 0.70;
  else confidence = 0.50;

  return {
    success: true,
    error: null,
    extraction: {
      confidence,
      dimensions,
      material,
      surface_treatment: surface,
      hardness_grade: grade,
      surface_roughness_ra_um: roughnessRa,
      source: "pdf-embedded-text",
    },
  };
}

// Test surface — exported so the test file can probe internals.
export const _internals = {
  parseSignedTolLine,
  tryParseToleranceTriple,
  classifyKind,
  toLines,
};
