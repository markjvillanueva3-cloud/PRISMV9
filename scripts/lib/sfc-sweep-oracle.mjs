/**
 * sfc-sweep-oracle.mjs (slot:oscar)
 * =================================================================
 * INDEPENDENT physics cross-check oracle for the SFC exhaustive sweep.
 *
 * The combinatorial sweep's classifier only proves a result is not OBVIOUSLY
 * broken (finite + positive). That is necessary but NOT sufficient for the
 * operator's "all math 100% accurate / guarantees superior parameters" bar:
 * a result can be perfectly finite-and-positive yet SILENTLY WRONG (a unit
 * factor dropped, a formula sign flipped, HSS running faster than carbide,
 * an operation computed as if it were plain milling).
 *
 * This module re-derives the load-bearing invariants from the engine's OWN
 * outputs + the user inputs WITHOUT calling the engine, so a formula/unit bug
 * surfaces as a divergence rather than passing silently. Two lenses:
 *
 *   (A) PER-CELL self-consistency (deterministic, highest confidence):
 *       - RPM    = Vc * 1000 / (pi * D)                 [universal]
 *       - MRR    = ap * ae * (fz * z * RPM) / 1000      [milling ops only]
 *       A divergence here is a hard internal-math inconsistency.
 *
 *   (B) CROSS-CELL monotonic sanity (catches the silent-wrong class):
 *       - HSS Vc must be < carbide Vc for the same material/op/geometry
 *         (HSS always runs slower -- the assessment's "HSS +108% over-speed").
 *       - Cutting-speed ordering by machinability: aluminium (N) > steel (P)
 *         > superalloy (S) for the same tool/op/geometry.
 *
 * pi and the 1000 mm^3->cm^3 / m->mm unit factors are pure mathematics, NOT
 * material physics constants -- they are not imported from constants.ts by
 * design (there is nothing material-specific to centralise). The ISO-speed
 * ordering map below is sanity-check REFERENCE metadata for the oracle, never
 * a value fed into a production cutting calculation.
 */

export const MILLING_OPS = new Set([
  "slot_milling", "profile_milling", "face_milling", "pocket_milling", "adaptive_milling",
]);

/** Canonical machinability ISO group per sweep material (speed-class only -- oracle reference, not a calc input). */
export const MATERIAL_ISO = {
  "6061": "N", "7075": "N",
  "1045": "P", "4140": "P",
  "316": "M", "stainless_steel": "M",
  "GG25": "K", "cast_iron": "K",
  "D2": "H",
  "Inconel 718": "S", "Ti-6Al-4V": "S",
};

/** Rough cutting-speed rank (higher = faster-machinable). Only the strong, uncontroversial gaps are asserted. */
export const ISO_SPEED_RANK = { N: 6, P: 4, K: 3, M: 3, H: 2, S: 1 };

/** RPM from surface speed: n = Vc * 1000 / (pi * D). Vc in m/min, D in mm -> rev/min. */
export function rpmFromVc(vc_m_min, D_mm) {
  if (!(vc_m_min > 0) || !(D_mm > 0)) return null;
  return (vc_m_min * 1000) / (Math.PI * D_mm);
}

/**
 * Per-cell: engine spindle_rpm must equal Vc*1000/(pi*D) within tolerance.
 *
 * tolPct           - relative band for a genuine formula/unit divergence.
 * vcDisplayQuantum - the rounding quantum (m/min) the engine applies to the PUBLISHED
 *   cutting_speed_m_min. ProductEngine.ts:947-948 does `cutting_speed_m_min: Math.round(vc)`
 *   AND `spindle_rpm: Math.round(rpm)` INDEPENDENTLY, where the published rpm derives from the
 *   UNROUNDED internal vc. Re-deriving expected rpm from the ROUNDED published Vc therefore
 *   carries a +/-(quantum/2) m/min error that, at LOW absolute Vc (HSS-on-Ti/Inconel ~7 m/min),
 *   is a few % of rpm yet is NOT a math inconsistency -- it is display rounding. So a divergence
 *   is forgiven only when it is BELOW the rounding floor (the +/-quantum/2 m/min Vc rounding
 *   mapped to rpm, plus the +/-0.5 rpm rounding of the rpm field itself). A real unit/formula bug
 *   (1000x drop, radius-vs-diameter 2x) blows far past this floor and still flags. This mirrors
 *   checkMrrConsistency's absFloor quantum guard -- the rpm check previously lacked one, which
 *   surfaced 245,760+ benign `rpm_inconsistent` flags on low-Vc cells in the 2026-06-30 overnight
 *   sweep (root-caused: display rounding, engine math is exactly consistent). The relative band is
 *   UNCHANGED; only sub-quantum display rounding is forgiven, so real-bug detection is preserved.
 */
export function checkRpmConsistency(params, v, tolPct = 0.02, vcDisplayQuantum = 1) {
  const D = params.tool_diameter;
  const expected = rpmFromVc(v.cutting_speed_m_min, D);
  const actual = v.spindle_rpm;
  if (expected == null || !(actual > 0)) return null;
  const absDiff = Math.abs(actual - expected);
  const rel = absDiff / expected;
  // Rounding floor: half the Vc display quantum mapped to rpm (dominant at low Vc / small D)
  // + the rpm field's own +/-0.5 integer rounding. D > 0 is guaranteed (expected != null above).
  const absFloor = ((vcDisplayQuantum / 2) * 1000) / (Math.PI * D) + 0.5;
  return rel > tolPct && absDiff > absFloor
    ? { kind: "rpm_inconsistent", expected, actual, relPct: rel, absDiff }
    : null;
}

/**
 * Per-cell (milling only): engine MRR must equal ap*ae*vf/1000 with vf=fz*z*RPM.
 * tolPct  - relative band for genuine formula/unit divergence.
 * absFloor - one MRR display-quantum (cm^3/min). A divergence is only a real
 *   math inconsistency if it exceeds BOTH the relative band AND the rounding floor,
 *   so a tiny correctly-computed MRR quantised to 2 decimals (e.g. 0.2149 -> 0.21)
 *   is NOT mistaken for silent-wrong math, while a 1000x unit drop or a 2x feed
 *   error (abs diff far above one quantum) still flags.
 */
export function checkMrrConsistency(params, v, tolPct = 0.05, absFloor = 0.01) {
  if (!MILLING_OPS.has(params.operation)) return null; // axial ops use a different MRR law
  const ap = params.depth, ae = params.width, z = params.number_of_teeth;
  const fz = v.feed_per_tooth_mm, rpm = v.spindle_rpm;
  if (!(ap > 0 && ae > 0 && z > 0 && fz > 0 && rpm > 0)) return null;
  const vf = fz * z * rpm;                  // mm/min table feed
  const mrrExpected = (ap * ae * vf) / 1000; // cm^3/min
  const mrrActual = v.mrr_cm3_min;
  if (!(mrrActual > 0)) return null;
  const absDiff = Math.abs(mrrActual - mrrExpected);
  const rel = absDiff / mrrExpected;
  return rel > tolPct && absDiff > absFloor
    ? { kind: "mrr_inconsistent", expected: mrrExpected, actual: mrrActual, relPct: rel, absDiff, vf }
    : null;
}

/**
 * Per-cell (milling only) MRR check that uses the engine's OWN published table
 * feed (v.feed_rate_mm_min) instead of reconstructing vf = fz*z*RPM.
 *
 * Use this for engines that apply radial CHIP-THINNING (effective feed != fz*z*RPM,
 * e.g. SpeedFeedOrchestratorEngine): MRR must equal ap*ae*feed_rate/1000 regardless
 * of how feed_rate was derived. This validates the MRR<->feed<->engagement chain
 * without the no-chip-thinning assumption baked into checkMrrConsistency.
 *
 * NOTE: this is the GEOMETRIC (full-engagement) identity. It applies to the geometric
 * ProductEngine path. It does NOT apply to SpeedFeedNineAxisOrchestratorEngine, which
 * multiplies MRR by a per-strategy TOOLPATH_ENGAGEMENT factor (SpeedFeedNineAxisOrchestrator
 * Engine.ts:758) so published MRR is a deliberate ~0.91x effective/average value even for
 * conventional full-slot cuts (root-caused 2026-06-29, slot:oscar -- a modeling choice, NOT a
 * bug). An engagement-aware variant (MRR == ap*ae*feed*engagement[strategy]/1000, using the
 * engine's own exported factor) is queued as U-SFC-ORCH-MRR-ENGAGEMENT.
 */
export function checkMrrFromFeedRate(params, v, tolPct = 0.05, absFloor = 0.01) {
  if (!MILLING_OPS.has(params.operation)) return null;
  const ap = params.depth, ae = params.width;
  const vf = v.feed_rate_mm_min;
  if (!(ap > 0 && ae > 0 && vf > 0)) return null;
  const mrrExpected = (ap * ae * vf) / 1000;
  const mrrActual = v.mrr_cm3_min;
  if (!(mrrActual > 0)) return null;
  const absDiff = Math.abs(mrrActual - mrrExpected);
  const rel = absDiff / mrrExpected;
  return rel > tolPct && absDiff > absFloor
    ? { kind: "mrr_feedrate_inconsistent", expected: mrrExpected, actual: mrrActual, relPct: rel, absDiff }
    : null;
}

/**
 * Chip-thinning sanity: published table feed must be >= the geometric fz*z*RPM
 * (radial chip-thinning RAISES the programmed feed to hold chip load; it never
 * lowers it). A feed_rate materially BELOW fz*z*RPM means the chip-thinning sign
 * was inverted -- the silent-wrong class that would UNDER-feed and rub.
 */
export function checkChipThinningDirection(params, v, slackPct = 0.05) {
  if (!MILLING_OPS.has(params.operation)) return null;
  const z = params.number_of_teeth, fz = v.feed_per_tooth_mm, rpm = v.spindle_rpm, vf = v.feed_rate_mm_min;
  if (!(z > 0 && fz > 0 && rpm > 0 && vf > 0)) return null;
  const geom = fz * z * rpm;
  // full-slot/near-full radial engagement has no thinning -> allow equality within slack
  return vf < geom * (1 - slackPct)
    ? { kind: "chip_thinning_inverted", feedRate: vf, geometricFeed: geom, ratio: vf / geom }
    : null;
}

/** Run all per-cell oracle checks; returns an array of violations (empty = clean). */
export function perCellOracle(params, v) {
  const out = [];
  const r = checkRpmConsistency(params, v);
  if (r) out.push(r);
  const m = checkMrrConsistency(params, v);
  if (m) out.push(m);
  return out;
}

/**
 * Cross-cell record accumulator. Key on every axis EXCEPT the one being compared,
 * so matched cells differ only in (tool_material) or (material) respectively.
 */
export function cellKeyExcludingToolMaterial(p) {
  return [p.material, p.tool_diameter, p.number_of_teeth, p.operation, p.coolant_type, p.depth, p.width].join("|");
}
export function cellKeyExcludingMaterial(p) {
  return [p.tool_diameter, p.number_of_teeth, p.tool_material, p.operation, p.coolant_type, p.depth, p.width].join("|");
}

/** Classify a tool_material string into the carbide/hss speed class (case-insensitive). */
export function defaultToolMatClass(params) {
  const tm = String(params.tool_material || "").toLowerCase();
  if (tm.includes("carbide")) return "carbide";
  if (tm === "hss" || tm.includes("high_speed") || tm.includes("high-speed")) return "hss";
  return "other";
}

/**
 * Build a CrossCellOracle that records (Vc per tool-material class) and (Vc per ISO
 * group) for each matched-cell key, then reports monotonic violations.
 *
 * opts lets a caller adapt it to a different sweep's axes (clone-don't-fork):
 *  - toolMatKey(params)   -> matched-cell key excluding tool material  (default: productSFC axes)
 *  - materialKey(params)  -> matched-cell key excluding material       (default: productSFC axes)
 *  - isoOf(params)        -> ISO group letter for the cell             (default: MATERIAL_ISO[name])
 *  - toolMatClass(params) -> "carbide" | "hss" | "other"               (default: case-insensitive)
 */
export function makeCrossCellOracle(opts = {}) {
  const toolMatKey = opts.toolMatKey || cellKeyExcludingToolMaterial;
  const materialKey = opts.materialKey || cellKeyExcludingMaterial;
  const isoOf = opts.isoOf || ((p) => MATERIAL_ISO[p.material]);
  const toolMatClass = opts.toolMatClass || defaultToolMatClass;

  const byToolMat = new Map(); // key -> { carbide?:vc, hss?:vc }
  const byMaterialIso = new Map(); // key -> Map<isoGroup, {vc, material}>

  function record(params, v) {
    const vc = v && v.cutting_speed_m_min;
    if (!(vc > 0)) return;

    const cls = toolMatClass(params);
    const tmKey = toolMatKey(params);
    const slot = byToolMat.get(tmKey) || {};
    // keep the first seen per tool-material class (cells are deterministic)
    if ((cls === "carbide" || cls === "hss") && slot[cls] == null) slot[cls] = vc;
    byToolMat.set(tmKey, slot);

    const iso = isoOf(params);
    if (iso && cls === "carbide") {
      // only compare material speed-class on a single tool-material class to avoid confound
      const mKey = materialKey(params);
      const m = byMaterialIso.get(mKey) || new Map();
      if (!m.has(iso)) m.set(iso, { vc, material: params.material });
      byMaterialIso.set(mKey, m);
    }
  }

  function violations({ maxReport = 500 } = {}) {
    const out = [];
    // (1) HSS must never run FASTER than carbide for the same cell. Strict ">" is deliberate:
    //     EQUAL Vc is benign and routinely legitimate -- both tool materials clamp to the same
    //     value when the machine RPM (or any shared) cap binds (verified: D6 aluminium finishing
    //     clamps both carbide+HSS to rpm=12000 -> vc=226). Only HSS STRICTLY faster is unphysical
    //     and unexplainable by a cap. (A cap-aware refinement to catch "equal when NOT capped" --
    //     a genuine un-derate -- is queued as U-SFC-XCELL-CAP-AWARE; it needs per-cell rpm+max_rpm.)
    for (const [key, slot] of byToolMat) {
      if (slot.carbide > 0 && slot.hss > 0 && slot.hss > slot.carbide) {
        out.push({ kind: "hss_not_slower_than_carbide", key, carbideVc: slot.carbide, hssVc: slot.hss });
        if (out.length >= maxReport) return out;
      }
    }
    // (2) Machinability speed ordering: a much-faster class must not return a slower Vc.
    for (const [key, m] of byMaterialIso) {
      const entries = [...m.entries()];
      for (let i = 0; i < entries.length; i++) {
        for (let j = 0; j < entries.length; j++) {
          if (i === j) continue;
          const [isoA, a] = entries[i];
          const [isoB, b] = entries[j];
          const rankA = ISO_SPEED_RANK[isoA], rankB = ISO_SPEED_RANK[isoB];
          // assert only STRONG gaps (rank diff >= 2) to avoid border noise (M~K), and only a
          // STRICT inversion (a.vc < b.vc): EQUAL Vc is benign cap-binding -- at small diameter
          // every material whose ideal Vc exceeds cap*pi*D/1000 clamps to the SAME machine-RPM-cap
          // value (D6 + 12000rpm -> 226 for N,P,K alike), collapsing the ordering legitimately.
          if (rankA - rankB >= 2 && a.vc < b.vc) {
            out.push({
              kind: "speed_ordering_violation", key,
              faster: { iso: isoA, material: a.material, vc: a.vc },
              slower: { iso: isoB, material: b.material, vc: b.vc },
            });
            if (out.length >= maxReport) return out;
          }
        }
      }
    }
    return out;
  }

  return { record, violations, _byToolMat: byToolMat, _byMaterialIso: byMaterialIso };
}
