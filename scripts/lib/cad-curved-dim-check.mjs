/**
 * cad-curved-dim-check.mjs -- OFFLINE dimensional check for CURVED (cylindrical) generated parts, via the
 * explicit STEP radius entity (slot:delta, U-CAD-CURVED-DIM-CHECK). Corrects a prior over-conclusion (R12):
 * the offline self-check's point-cloud BBOX cannot measure a cylinder's circular diameter, from which it
 * was concluded that curved-part dim convergence "needs the kernel". But the diameter is NOT a point-cloud
 * quantity -- it is the explicit `CYLINDRICAL_SURFACE`/`CIRCLE` RADIUS literal in the STEP, which
 * extractRadiiMm reads directly (unit-resolved). So a generated cylinder's diameter IS measurable offline
 * with no kernel: a "15.88 mm diameter" request generates a STEP whose radius is 7.940 mm -> diameter
 * 15.880 mm, an EXACT match. This closes the curved-part measurement gap that read a spurious "0%".
 *
 * REUSES extractRadiiMm (R8 -- do not re-parse STEP radii). Pure: no I/O.
 *
 * @module scripts/lib/cad-curved-dim-check
 */

import { extractRadiiMm, extractBboxMm } from "./step-dimension-extract.mjs";

const INCH_TO_MM = 25.4;
const NUM = "([0-9]*\\.?[0-9]+)";

/**
 * Parse the requested DIAMETER (mm) from a generation request. Handles "<n> mm diameter", "<n> inch
 * diameter", and the reversed "diameter <n> mm/inch" (dia/Ø abbreviations too). Returns mm, or null when
 * no diameter is stated (the caller then treats the part as not-curved-dim-checkable).
 */
export function parseRequestedDiameterMm(request) {
  const s = String(request || "");
  const DIA = "(?:diameter|dia\\b|\\u00d8|\\u2300)";
  const mm = s.match(new RegExp(`${NUM}\\s*mm\\s*${DIA}`, "i")) || s.match(new RegExp(`${DIA}[^0-9]{0,8}${NUM}\\s*mm`, "i"));
  if (mm) return Number(mm[1]);
  const inch = s.match(new RegExp(`${NUM}\\s*(?:inch|inches|in\\b|"|\\u2033)\\s*${DIA}`, "i")) || s.match(new RegExp(`${DIA}[^0-9]{0,8}${NUM}\\s*(?:inch|inches|in\\b|"|\\u2033)`, "i"));
  if (inch) return Number(inch[1]) * INCH_TO_MM;
  return null;
}

/**
 * Parse the requested axial LENGTH (mm) from a request: "<n> mm/inch long|tall|high|deep|thick|length".
 * Returns mm, or null when no length is stated.
 */
export function parseRequestedLengthMm(request) {
  const s = String(request || "");
  const LEN = "(?:long|tall|high|deep|thick|in\\s+length|length)";
  const mm = s.match(new RegExp(`${NUM}\\s*mm\\s*${LEN}`, "i"));
  if (mm) return Number(mm[1]);
  const inch = s.match(new RegExp(`${NUM}\\s*(?:inch|inches|in\\b|"|\\u2033)\\s*${LEN}`, "i"));
  if (inch) return Number(inch[1]) * INCH_TO_MM;
  return null;
}

/**
 * Offline curved-part dim check. DIAMETER: the radius CLOSEST to requestedDiameter/2 (robust to fillet/hole
 * radii), 2*r vs request. LENGTH (when requested): the bbox `maxExtentMm` -- for a cylinder that IS the
 * axial length, because the circular diameter is NOT vertex-captured so the only vertex-bbox extent is the
 * axis (verified: a "2.92 mm long" cylinder's bbox reads [2.92,0,0]). `accurate` requires BOTH (length only
 * when stated). This is what closes a right-diameter/wrong-length cylinder that the diameter check alone passes.
 * @returns {{applicable,accurate?,requestedDiaMm?,matchedDiaMm?,diaDeltaPct?,requestedLenMm?,matchedLenMm?,lenDeltaPct?,deltaPct?,reason?}}
 */
export function curvedDimCheck(request, stepText, { tolPct = 2 } = {}) {
  const reqDia = parseRequestedDiameterMm(request);
  if (reqDia == null || !(reqDia > 0)) return { applicable: false, reason: "no requested diameter" };
  const { radiiMm } = extractRadiiMm(stepText || "");
  if (!radiiMm.length) return { applicable: false, reason: "no radii in STEP (unknown unit or no circular feature)" };
  const targetR = reqDia / 2;
  let best = null;
  for (const r of radiiMm) { const d = Math.abs(r - targetR); if (best === null || d < best.d) best = { r, d }; }
  const matchedDiaMm = best.r * 2;
  const diaDeltaPct = (Math.abs(matchedDiaMm - reqDia) / reqDia) * 100;
  const diaAccurate = diaDeltaPct <= tolPct;
  // LENGTH (axial extent): the point-cloud bbox alone CANNOT isolate a curved part's AXIAL length -- for a
  // disc-with-a-hole or a plate the largest extent (old `maxExtentMm`) is the DIAMETER or the footprint, which
  // false-FAILED a right-diameter part on length (live 2026-07-05: 27 curved gens sunk this way, diameter fine).
  // Since the DIAMETER is already known (matchedDiaMm, the reliable radius entity), recover the axial length by
  // REMOVING the diameter-matching and near-zero PRINCIPAL extents (extractBboxMm returns dims=[L,W,H] desc):
  // exactly ONE survivor is the unambiguous axial length (plain cylinder [L,0,0]->[L]; disc [D,D,L]->[L]);
  // 0 or >=2 survivors mean a featured/plate/degenerate part whose axial length is NOT isolable from a point
  // bbox -> length is ADVISORY (unmeasured), never a false fail (R12). A wrong-length PLAIN cylinder still fails.
  const reqLen = parseRequestedLengthMm(request);
  let matchedLenMm = null, lenDeltaPct = null, lenAccurate = null, lenReliable = false;
  if (reqLen != null && reqLen > 0) {
    const bb = extractBboxMm(stepText || "");
    const dims = bb && Array.isArray(bb.dims) ? bb.dims : null;
    if (dims && dims.length) {
      const D = matchedDiaMm;
      const isCrossSection = (x) => D > 0 && Math.abs(x - D) / D <= 0.05; // an OD/hole circular cross-section extent
      const nonZero = dims.filter((x) => x > 0.01);
      // A PLAIN cylinder's point bbox is [L,0,0] -- the SOLE non-zero extent IS the axial length, even when a
      // (wrong) L lands within 5% of D. Do NOT let the cross-section filter absorb it: that regressed a
      // wrong-length near-cubic cylinder to a false PASS (arm-A scrutiny, confirmed 2026-07-05). Strip the
      // circular cross-section extents ONLY when >=2 non-zero extents remain (disc [D,D,L] / featured / plate),
      // where the filter is what isolates the axial extent from the two diameter extents.
      const axial = nonZero.length <= 1 ? nonZero : nonZero.filter((x) => !isCrossSection(x));
      if (axial.length === 1) { // unambiguous axial length
        matchedLenMm = axial[0];
        lenDeltaPct = (Math.abs(matchedLenMm - reqLen) / reqLen) * 100;
        lenAccurate = lenDeltaPct <= tolPct;
        lenReliable = true;
      }
      // else: featured/plate/degenerate -> axial length advisory (diameter is still the reliable verdict)
    }
  }
  const accurate = diaAccurate && (lenAccurate === null ? true : lenAccurate);
  return {
    applicable: true,
    accurate,
    requestedDiaMm: +reqDia.toFixed(3),
    matchedDiaMm: +matchedDiaMm.toFixed(3),
    diaDeltaPct: +diaDeltaPct.toFixed(2),
    requestedLenMm: reqLen != null ? +reqLen.toFixed(3) : null,
    matchedLenMm: matchedLenMm != null ? +matchedLenMm.toFixed(3) : null,
    lenDeltaPct: lenDeltaPct != null ? +lenDeltaPct.toFixed(2) : null,
    lenReliable, // true only when the axial length was unambiguously isolated (plain cylinder / disc)
    deltaPct: +Math.max(diaDeltaPct, lenDeltaPct ?? 0).toFixed(2), // worst of the two (headline)
  };
}
