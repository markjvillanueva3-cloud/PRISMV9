/**
 * GrooveClassificationEngine — LATHE-PRO-MS4b Grooving & Parting Deep Intelligence.
 *
 * Single-entry capstone for all grooving + parting operations on CNC lathes.
 * Classifies groove type (8 types), selects strategy (single-plunge /
 * plunge-and-shift / peck), picks material-specific peck parameters across
 * 7 ISO groups, resolves 4 controller G74/G75 dialects for grooving and
 * 5 controller M-codes for part catcher timing, and delegates force/stress
 * physics to the canonical PartOffForceEngine / PartingGroovingEngine.
 *
 * Units bundled:
 *   U-LPG01 — classify()          8 groove types + strategy selection
 *   U-LPG02 — deepGrooveCycle()   plunge-and-shift + peck + 4 dialects
 *   U-LPG03 — peckParamsForMat()  7 ISO group peck tables + chip strategy
 *   U-LPG04 — partoffOptimize()   feed reduction curve + RPM clamp + blade pick
 *   U-LPG05 — catcherTiming()     peck cutoff + 5 controller catcher M-codes
 *   U-LPG06 — bladeStress()       PartOffForceEngine delegation + L/t chatter gate
 *   Capstone — optimize()          runs the full pipeline for a single groove/part-off call.
 *
 * Physics delegates:
 *   • Parting force + blade stress → PartOffForceEngine.calculate()
 *   • Parting feed curve + RPM clamp → PartingGroovingEngine.run()
 *
 * References:
 *   ISO 3601     — O-ring groove dimensions
 *   DIN 471/472  — Retaining ring (circlip) grooves
 *   DIN 509      — Bearing relief undercuts (Type E/F/G)
 *   DIN 76       — Thread relief grooves
 *   ISO 13715    — Edge definitions
 *   ISO 13399    — Cutting tool data standard
 *   Sandvik CoroCut, Iscar GRIP/DO-GRIP, Kennametal groove/cutoff guide
 *
 * Shipped source of truth — dispatcher action `turning_groove_optimize`
 * (and the narrower turning_groove_* / turning_partoff_* actions) delegate
 * here. Tests import directly AND invoke through the dispatcher.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type GrooveType =
  | "full_radius"
  | "v_groove"
  | "rectangular"
  | "o_ring"
  | "circlip"
  | "thread_relief"
  | "bearing_relief"
  | "face_groove";

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
/** K is cast iron, N is non-ferrous. We add "P_alloy" for alloy steels in peck tables. */
export type PeckISOGroup = ISOGroup | "P_alloy";

export type GroovingController =
  | "fanuc"
  | "haas"
  | "okuma"
  | "siemens";

export type PartCatcherController =
  | "fanuc"
  | "haas"
  | "okuma"
  | "mazak"
  | "citizen";

export type CycleKind = "single_plunge" | "plunge_and_shift" | "peck" | "face_groove";

export interface GrooveGeometry {
  /** Width across the groove in mm (axial dimension for OD/ID grooves). */
  groove_width_mm: number;
  /** Radial depth of the groove in mm. */
  groove_depth_mm: number;
  /** Workpiece diameter at the groove location in mm. */
  workpiece_diameter_mm: number;
  /** Blade/insert width mm (typically 2-6 for parting; 1-3 for narrow grooves). */
  blade_width_mm: number;
  /** Blade overhang mm (length from holder to tip). */
  blade_overhang_mm?: number;
  /** Blade thickness mm (section along radial). Defaults to blade_width. */
  blade_thickness_mm?: number;
  /** true when groove is axial (face groove) rather than OD/ID. */
  face_groove?: boolean;
  /** Hints for specialty grooves (optional). */
  form_hint?: GrooveType;
  /** For circlip/o-ring: nominal shaft diameter → picks table band. */
  nominal_shaft_diameter_mm?: number;
}

export interface GrooveClassifyResult {
  groove_type: GrooveType;
  cycle: CycleKind;
  n_passes: number;
  shift_step_mm: number | null;
  tool_recommendation: string;
  notes: string[];
  source: string;
}

export interface PeckParams {
  iso_group: PeckISOGroup;
  peck_depth_mm: number;
  retract_mm: number;
  full_retract_every_n_pecks: number;
  coolant: "dry" | "flood" | "high_pressure" | "flood_ti";
  chip_strategy: string;
  source: string;
}

export interface DeepCycleOutput {
  controller: GroovingController;
  cycle_code: string;                 // e.g., "G74" or "G75" or "CYCLE93"
  gcode_lines: string[];              // controller-specific lines
  warnings: string[];
  source: string;
}

export interface PartoffOptimizeResult {
  blade_width_mm: number;
  rpm_start: number;
  rpm_end: number;
  rpm_clamp_g50: number;              // max RPM when in CSS
  feed_nominal_mm_rev: number;
  feed_at_center_mm_rev: number;
  feed_curve_mm_rev: Array<{ d_mm: number; feed: number }>;
  warnings: string[];
  source: string;
}

export interface CatcherTimingResult {
  controller: PartCatcherController;
  activate_at_diameter_mm: number;
  m_codes: { advance: string; retract: string };
  dwell_after_advance_s: number;
  peck_block: string[];               // inline peck cutoff G-code snippets
  source: string;
}

export interface BladeStressResult {
  cutting_force_N: number;
  feed_force_N: number;
  total_force_N: number;
  max_blade_stress_MPa: number;
  blade_deflection_um: number;
  /** L/t chatter ratio (overhang / blade thickness). >10 → chatter flag. */
  lt_ratio: number;
  stress_to_yield_fraction: number;   // fraction of 800 MPa HSS-Co baseline
  pass: boolean;
  warnings: string[];
  source: string;
}

export interface GrooveOptimizeInput extends GrooveGeometry {
  material_iso_group: ISOGroup;
  controller?: GroovingController;
  catcher_controller?: PartCatcherController;
  feed_per_rev_mm?: number;           // nominal feed
  cutting_speed_m_min?: number;       // Vc at start diameter
  material_hardness_HRC?: number;
  operation?: "groove" | "partoff";
  /** Blade yield strength MPa (HSS-Co default 800). */
  blade_yield_MPa?: number;
}

export interface GrooveOptimizeResult {
  classify: GrooveClassifyResult;
  peck: PeckParams;
  deep_cycle: DeepCycleOutput;
  partoff: PartoffOptimizeResult | null;
  catcher: CatcherTimingResult | null;
  stress: BladeStressResult;
  reasoning: string[];
  source: string;
}

// ── Reference tables ───────────────────────────────────────────────────────

/** Peck parameters by ISO group. All sizes in "× blade width" for peck_depth. */
const PECK_TABLE: Record<PeckISOGroup, Omit<PeckParams, "iso_group" | "source">> = {
  P: {
    peck_depth_mm: 2.5,             // × blade width placeholder, scaled later
    retract_mm: 0.05,
    full_retract_every_n_pecks: 3,
    coolant: "flood",
    chip_strategy: "steel: peck 2-3× blade; short segmented chip OK",
  },
  P_alloy: {
    peck_depth_mm: 1.75,
    retract_mm: 0.08,
    full_retract_every_n_pecks: 3,
    coolant: "flood",
    chip_strategy: "alloy steel: peck 1.5-2× blade; higher tool pressure",
  },
  M: {
    peck_depth_mm: 1.25,
    retract_mm: 0.10,
    full_retract_every_n_pecks: 2,
    coolant: "high_pressure",
    chip_strategy: "stainless: peck 1-1.5× blade; HIGH-PRESSURE coolant mandatory for chip evacuation",
  },
  K: {
    peck_depth_mm: 2.5,
    retract_mm: 0.05,
    full_retract_every_n_pecks: 4,
    coolant: "dry",
    chip_strategy: "cast iron: peck 2-3× blade; dry OK (graphite chips evacuate)",
  },
  N: {
    peck_depth_mm: 4.0,
    retract_mm: 0.05,
    full_retract_every_n_pecks: 5,
    coolant: "flood",
    chip_strategy: "aluminum: peck 3-5× blade; chip evacuation easy",
  },
  S: {
    peck_depth_mm: 0.75,
    retract_mm: 0.10,
    full_retract_every_n_pecks: 2,
    coolant: "flood_ti",
    chip_strategy: "titanium: peck 0.5-1× blade; FLOOD coolant; short contact time",
  },
  H: {
    peck_depth_mm: 0.4,
    retract_mm: 0.05,
    full_retract_every_n_pecks: 2,
    coolant: "high_pressure",
    chip_strategy: "hardened steel: peck 0.3-0.5× blade; CBN insert required",
  },
};

/** Part catcher M-codes per controller family. */
const CATCHER_M_CODES: Record<PartCatcherController, { advance: string; retract: string }> = {
  fanuc:   { advance: "M21", retract: "M22" },
  haas:    { advance: "M21", retract: "M22" },
  okuma:   { advance: "M71", retract: "M72" },
  mazak:   { advance: "M65", retract: "M66" },
  citizen: { advance: "M28", retract: "M29" },
};

/** Grooving cycle code per controller. */
function cycleCodeFor(controller: GroovingController, axis: "X" | "Z"): string {
  switch (controller) {
    case "fanuc":
    case "haas":
      return axis === "X" ? "G75" : "G74";
    case "okuma":
      return axis === "X" ? "G75" : "G74";
    case "siemens":
      return "CYCLE93";
  }
}

// ── Engine ─────────────────────────────────────────────────────────────────

class GrooveClassificationEngine {
  // ===========================================================================
  // U-LPG01 — classify()
  // ===========================================================================

  classify(geom: GrooveGeometry): GrooveClassifyResult {
    this.validateGeometry(geom);
    const bladeWidth = geom.blade_width_mm;
    const grooveWidth = geom.groove_width_mm;
    const grooveDepth = geom.groove_depth_mm;

    // Step 1 — detect type.
    let type: GrooveType;
    const hint = geom.form_hint;
    if (hint) {
      type = hint;
    } else if (geom.face_groove) {
      type = "face_groove";
    } else if (
      geom.nominal_shaft_diameter_mm !== undefined &&
      grooveDepth < 0.5
    ) {
      // Very shallow groove on a shaft → likely o-ring or circlip.
      type = grooveWidth > 1.5 ? "o_ring" : "circlip";
    } else if (grooveDepth > 3 * grooveWidth) {
      // Very deep narrow groove → rectangular deep cut.
      type = "rectangular";
    } else if (grooveWidth <= bladeWidth * 1.05 && grooveDepth <= grooveWidth) {
      type = "full_radius";
    } else {
      type = "rectangular";
    }

    // Step 2 — select cycle.
    let cycle: CycleKind;
    let nPasses = 1;
    let shift: number | null = null;

    if (type === "face_groove") {
      cycle = "face_groove";
      nPasses = Math.max(1, Math.ceil(grooveWidth / Math.max(bladeWidth, 0.01)));
      shift = null;
    } else if (grooveDepth > 3 * Math.max(grooveWidth, bladeWidth)) {
      cycle = "peck";
      nPasses = Math.max(1, Math.ceil(grooveDepth / 2)); // placeholder; refined by peck engine
      shift = null;
    } else if (grooveWidth > bladeWidth * 1.05) {
      cycle = "plunge_and_shift";
      // 80% blade-width axial shift per Sandvik CoroCut guide.
      shift = bladeWidth * 0.8;
      nPasses = Math.max(1, Math.ceil(grooveWidth / Math.max(shift, 0.01)));
    } else {
      cycle = "single_plunge";
      shift = null;
      nPasses = 1;
    }

    // Step 3 — tool recommendation by type.
    const TOOL_REC: Record<GrooveType, string> = {
      full_radius: "Full-radius insert matching groove R; single plunge.",
      v_groove: "V-insert or angled turn-insert; verify included angle.",
      rectangular: "Flat-bottom grooving insert; multi-pass for wide groove.",
      o_ring: "O-ring grooving insert per ISO 3601; tight width tolerance.",
      circlip: "Sharp-corner grooving insert per DIN 471/472 dimensions.",
      thread_relief: "Thread-relief insert per DIN 76; coordinate with threading op.",
      bearing_relief: "Undercut tool per DIN 509 Type E/F/G.",
      face_groove: "Face-groove insert (axial groove on end face); requires dedicated tool.",
    };

    const notes: string[] = [];
    if (type === "o_ring" && grooveWidth > 5) {
      notes.push("O-ring groove wider than 5 mm — verify against ISO 3601 table (unusual).");
    }
    if (type === "rectangular" && grooveWidth > bladeWidth * 3) {
      notes.push("Rectangular groove width > 3× blade — plunge-and-shift mandatory.");
    }
    if (cycle === "peck") {
      notes.push(`Peck cycle selected (depth/width ratio ${(grooveDepth / Math.max(grooveWidth, 0.01)).toFixed(1)}).`);
    }

    return {
      groove_type: type,
      cycle,
      n_passes: nPasses,
      shift_step_mm: shift,
      tool_recommendation: TOOL_REC[type],
      notes,
      source: "GrooveClassificationEngine.classify (8 groove types, ISO 3601/DIN 471/472/509/76)",
    };
  }

  // ===========================================================================
  // U-LPG03 — peckParamsForMat()  (called by U-LPG02 for depth scaling)
  // ===========================================================================

  peckParamsForMat(iso: PeckISOGroup, bladeWidth: number): PeckParams {
    if (bladeWidth <= 0 || !Number.isFinite(bladeWidth)) {
      throw new Error("GrooveClassificationEngine.peckParamsForMat: bladeWidth must be positive finite");
    }
    const row = PECK_TABLE[iso];
    if (!row) {
      throw new Error(`GrooveClassificationEngine.peckParamsForMat: unknown ISO group ${iso}`);
    }
    // Peck depth in the table is × blade width. Scale to actual mm.
    const peckDepth = Math.round(row.peck_depth_mm * bladeWidth * 1000) / 1000;
    return {
      iso_group: iso,
      peck_depth_mm: peckDepth,
      retract_mm: row.retract_mm,
      full_retract_every_n_pecks: row.full_retract_every_n_pecks,
      coolant: row.coolant,
      chip_strategy: row.chip_strategy,
      source: "GrooveClassificationEngine.peckParamsForMat (7 ISO groups, material-specific peck)",
    };
  }

  // ===========================================================================
  // U-LPG02 — deepGrooveCycle()
  // ===========================================================================

  deepGrooveCycle(
    geom: GrooveGeometry,
    classify: GrooveClassifyResult,
    peck: PeckParams,
    controller: GroovingController,
    feedPerRev = 0.08,
  ): DeepCycleOutput {
    this.validateGeometry(geom);
    if (feedPerRev <= 0 || !Number.isFinite(feedPerRev)) {
      throw new Error("deepGrooveCycle: feedPerRev must be positive finite");
    }

    const lines: string[] = [];
    const warnings: string[] = [];
    const axis: "X" | "Z" = geom.face_groove ? "Z" : "X";
    const cycleCode = cycleCodeFor(controller, axis);

    const startDia = geom.workpiece_diameter_mm;
    const finalDia = startDia - 2 * geom.groove_depth_mm;
    const feed = feedPerRev;
    const peckDepth = peck.peck_depth_mm;
    const retract = peck.retract_mm;

    if (classify.cycle === "plunge_and_shift") {
      const shift = classify.shift_step_mm ?? geom.blade_width_mm * 0.8;
      const passes = classify.n_passes;
      lines.push(
        `(${controller.toUpperCase()} PLUNGE-AND-SHIFT GROOVE: passes=${passes}, shift=${shift.toFixed(3)}mm)`,
      );
      for (let i = 0; i < passes; i++) {
        const zPos = i * shift;
        lines.push(`G0 X${startDia.toFixed(3)} Z${zPos.toFixed(3)}`);
        lines.push(`G1 X${finalDia.toFixed(3)} F${feed.toFixed(4)}`);
        lines.push(`G0 X${startDia.toFixed(3)}`);
      }
      lines.push(`(FINISH PASS — clean walls)`);
      lines.push(`G0 X${startDia.toFixed(3)} Z0.000`);
      lines.push(`G1 X${finalDia.toFixed(3)} F${(feed * 0.6).toFixed(4)}`);
    } else if (classify.cycle === "peck") {
      lines.push(
        `(${controller.toUpperCase()} PECK GROOVE: ${cycleCode}, peck=${peckDepth.toFixed(3)}mm, retract=${retract.toFixed(3)}mm)`,
      );
      if (controller === "siemens") {
        lines.push(
          `CYCLE93(SPD:=${startDia.toFixed(3)}, SPL:=0.0, WIDG:=${geom.groove_width_mm.toFixed(3)}, DIAG:=${geom.groove_depth_mm.toFixed(3)}, STA1:=0, VARI:=1, VRT:=${retract.toFixed(3)}, FAL1:=0, IDEP:=${peckDepth.toFixed(3)}, FRF:=1.0)`,
        );
      } else {
        const P = Math.round(peckDepth * 1000);
        const Q = Math.round(retract * 1000);
        lines.push(
          `${cycleCode} X${finalDia.toFixed(3)} Z0.000 P${P} Q${Q} F${feed.toFixed(4)}`,
        );
      }
      if (peck.full_retract_every_n_pecks <= 2) {
        warnings.push(`Every ${peck.full_retract_every_n_pecks}-peck full retract required — verify controller setting or manual flush blocks.`);
      }
    } else if (classify.cycle === "face_groove") {
      lines.push(`(${controller.toUpperCase()} FACE GROOVE)`);
      lines.push(`G0 X${startDia.toFixed(3)} Z2.000`);
      lines.push(`G1 Z-${geom.groove_depth_mm.toFixed(3)} F${feed.toFixed(4)}`);
      lines.push(`G0 Z2.000`);
    } else {
      // single_plunge
      lines.push(`(${controller.toUpperCase()} SINGLE-PLUNGE GROOVE)`);
      lines.push(`G0 X${startDia.toFixed(3)} Z0.000`);
      lines.push(`G1 X${finalDia.toFixed(3)} F${feed.toFixed(4)}`);
      lines.push(`G0 X${startDia.toFixed(3)}`);
    }

    return {
      controller,
      cycle_code: cycleCode,
      gcode_lines: lines,
      warnings,
      source: "GrooveClassificationEngine.deepGrooveCycle (4 controllers: fanuc/haas/okuma/siemens)",
    };
  }

  // ===========================================================================
  // U-LPG04 — partoffOptimize()
  // ===========================================================================

  partoffOptimize(
    barDia: number,
    materialIso: ISOGroup,
    cuttingSpeedMpm = 120,
    feedNominalMmRev = 0.08,
  ): PartoffOptimizeResult {
    if (!Number.isFinite(barDia) || barDia <= 0) {
      throw new Error("partoffOptimize: barDia must be positive finite");
    }
    if (!Number.isFinite(cuttingSpeedMpm) || cuttingSpeedMpm <= 0) {
      throw new Error("partoffOptimize: cuttingSpeedMpm must be positive finite");
    }
    if (!Number.isFinite(feedNominalMmRev) || feedNominalMmRev <= 0) {
      throw new Error("partoffOptimize: feedNominalMmRev must be positive finite");
    }

    // Blade width by bar diameter (Sandvik guide).
    let bladeWidth = 2;
    if (barDia > 25 && barDia <= 50) bladeWidth = 3;
    else if (barDia > 50 && barDia <= 100) bladeWidth = 4;
    else if (barDia > 100) bladeWidth = 5;

    // RPM calculation.
    const rpmStart = Math.round((1000 * cuttingSpeedMpm) / (Math.PI * barDia));
    const rpmEnd = Math.round((1000 * cuttingSpeedMpm) / (Math.PI * Math.max(2 * bladeWidth, 2)));
    const rpmClampG50 = Math.min(rpmEnd, 6000); // hard machine clamp

    // Feed curve: reduce at center approach.
    const feedCurve: Array<{ d_mm: number; feed: number }> = [];
    for (const d of [barDia, barDia / 2, 5, 2 * bladeWidth, 0.5]) {
      let feed = feedNominalMmRev;
      if (d < 5) feed = feedNominalMmRev * 0.5;
      if (d < 2 * bladeWidth) feed = feedNominalMmRev * 0.25;
      feedCurve.push({ d_mm: Math.max(d, 0.1), feed: Math.round(feed * 1e4) / 1e4 });
    }
    const feedAtCenter = feedNominalMmRev * 0.25;

    const warnings: string[] = [];
    if (materialIso === "S" || materialIso === "H") {
      warnings.push(`Material ${materialIso}: use peck cutoff (see catcherTiming).`);
    }
    if (rpmEnd > 6000) {
      warnings.push(`G50 clamp applied: native Vc at center would give ${rpmEnd} RPM — clamped to 6000.`);
    }

    return {
      blade_width_mm: bladeWidth,
      rpm_start: rpmStart,
      rpm_end: rpmEnd,
      rpm_clamp_g50: rpmClampG50,
      feed_nominal_mm_rev: feedNominalMmRev,
      feed_at_center_mm_rev: Math.round(feedAtCenter * 1e4) / 1e4,
      feed_curve_mm_rev: feedCurve,
      warnings,
      source: "GrooveClassificationEngine.partoffOptimize (Sandvik blade selection + center-approach feed curve)",
    };
  }

  // ===========================================================================
  // U-LPG05 — catcherTiming()
  // ===========================================================================

  catcherTiming(
    bladeWidthMm: number,
    controller: PartCatcherController,
    materialIso: ISOGroup,
  ): CatcherTimingResult {
    if (!Number.isFinite(bladeWidthMm) || bladeWidthMm <= 0) {
      throw new Error("catcherTiming: bladeWidthMm must be positive finite");
    }
    const mCodes = CATCHER_M_CODES[controller];
    if (!mCodes) {
      throw new Error(`catcherTiming: unknown controller ${controller}`);
    }

    // Part-catcher safety rule: activate when d_remaining = 2 × blade_width + 1 mm.
    const activateAt = 2 * bladeWidthMm + 1;

    // Peck cutoff strategy per material.
    const peckBlock: string[] = [];
    if (materialIso === "M") {
      peckBlock.push(
        `(PECK CUTOFF — 304 STAINLESS: peck 2mm, retract 0.3mm, dwell 0.5s)`,
        `G01 X${(2 * bladeWidthMm + 3).toFixed(3)} F0.05`,
        `G04 P500`,
        `G01 X${(2 * bladeWidthMm + 1).toFixed(3)} F0.05`,
      );
    } else if (materialIso === "S") {
      peckBlock.push(
        `(PECK CUTOFF — TITANIUM: peck 1.5mm, retract 0.3mm, HIGH-PRESSURE COOLANT)`,
        `M08`,
        `G01 X${(2 * bladeWidthMm + 2).toFixed(3)} F0.04`,
        `G04 P500`,
      );
    } else if (materialIso === "H") {
      peckBlock.push(
        `(PECK CUTOFF — INCONEL/HARDENED: peck 1mm, retract 0.5mm, HIGH-PRESSURE COOLANT, CBN)`,
        `M08`,
        `G01 X${(2 * bladeWidthMm + 2).toFixed(3)} F0.03`,
        `G04 P1000`,
      );
    } else {
      peckBlock.push(
        `(${materialIso}: no peck required — continuous cutoff)`,
      );
    }

    // Catcher advance + dwell.
    peckBlock.push(
      `(PART CATCHER ADVANCE @ d=${activateAt.toFixed(2)}mm)`,
      `${mCodes.advance}`,
      `G04 P400   (dwell ~0.4s for catcher to position)`,
    );

    return {
      controller,
      activate_at_diameter_mm: Math.round(activateAt * 100) / 100,
      m_codes: mCodes,
      dwell_after_advance_s: 0.4,
      peck_block: peckBlock,
      source: "GrooveClassificationEngine.catcherTiming (5 controllers: fanuc/haas/okuma/mazak/citizen)",
    };
  }

  // ===========================================================================
  // U-LPG06 — bladeStress()
  // ===========================================================================

  async bladeStress(
    barDiaMm: number,
    bladeWidthMm: number,
    feedMmRev: number,
    cuttingSpeedMpm: number,
    materialIso: ISOGroup,
    overhangMm: number,
    bladeThicknessMm: number,
    bladeYieldMPa = 800,
    stressFractionCeiling = 0.5,
    ltRatioCeiling = 10,
  ): Promise<BladeStressResult> {
    const { partOffForceEngine } = await import("./PartOffForceEngine.js");
    // Map ISO group → material string for PartOffForceEngine.
    const matMap: Record<ISOGroup, string> = {
      P: "steel",
      M: "stainless",
      K: "cast_iron",
      N: "aluminum",
      S: "titanium",
      H: "inconel",
    };
    const material = matMap[materialIso] ?? "steel";

    const result = partOffForceEngine.calculate({
      bar_diameter_mm: barDiaMm,
      bore_diameter_mm: 0,
      blade_width_mm: bladeWidthMm,
      feed_per_rev_mm: feedMmRev,
      cutting_speed_m_min: cuttingSpeedMpm,
      material,
      material_hardness_HRC: 0,
    });

    const ltRatio = overhangMm > 0 && bladeThicknessMm > 0
      ? Math.round((overhangMm / bladeThicknessMm) * 100) / 100
      : 0;
    const stressFraction = Math.round((result.max_blade_stress_MPa / bladeYieldMPa) * 1000) / 1000;

    const warnings: string[] = [];
    if (ltRatio > ltRatioCeiling) {
      warnings.push(`L/t ratio ${ltRatio} > ${ltRatioCeiling} — HIGH chatter probability. Reduce overhang or use damped blade.`);
    }
    if (stressFraction > stressFractionCeiling) {
      warnings.push(`Blade stress ${(stressFraction * 100).toFixed(1)}% of yield — exceeds ${(stressFractionCeiling * 100).toFixed(0)}% safety factor. Reduce feed.`);
    }

    return {
      cutting_force_N: result.tangential_force_N,
      feed_force_N: result.feed_force_N,
      total_force_N: result.total_force_N,
      max_blade_stress_MPa: result.max_blade_stress_MPa,
      blade_deflection_um: result.blade_deflection_um,
      lt_ratio: ltRatio,
      stress_to_yield_fraction: stressFraction,
      pass: stressFraction <= stressFractionCeiling && ltRatio <= ltRatioCeiling,
      warnings,
      source: "GrooveClassificationEngine.bladeStress (delegates PartOffForceEngine + L/t chatter gate)",
    };
  }

  // ===========================================================================
  // Capstone — optimize()
  // ===========================================================================

  async optimize(input: GrooveOptimizeInput): Promise<GrooveOptimizeResult> {
    this.validateGeometry(input);
    const controller: GroovingController = input.controller ?? "fanuc";
    const catcherController: PartCatcherController =
      input.catcher_controller ?? "fanuc";
    const feed = input.feed_per_rev_mm ?? 0.08;
    const vc = input.cutting_speed_m_min ?? 120;
    const bladeOverhang = input.blade_overhang_mm ?? input.blade_width_mm * 4;
    const bladeThickness = input.blade_thickness_mm ?? input.blade_width_mm;

    // Map ISO → peck group. Default P is "P" coarse; "P_alloy" must be requested explicitly.
    const classify = this.classify(input);
    const peck = this.peckParamsForMat(input.material_iso_group, input.blade_width_mm);
    const deep = this.deepGrooveCycle(input, classify, peck, controller, feed);

    const isPartoff = input.operation === "partoff";
    const partoff = isPartoff
      ? this.partoffOptimize(input.workpiece_diameter_mm, input.material_iso_group, vc, feed)
      : null;
    const catcher = isPartoff
      ? this.catcherTiming(
          partoff?.blade_width_mm ?? input.blade_width_mm,
          catcherController,
          input.material_iso_group,
        )
      : null;

    const stress = await this.bladeStress(
      input.workpiece_diameter_mm,
      input.blade_width_mm,
      feed,
      vc,
      input.material_iso_group,
      bladeOverhang,
      bladeThickness,
      input.blade_yield_MPa ?? 800,
    );

    const reasoning = this.buildReasoning(classify, peck, stress, partoff, catcher);

    return {
      classify,
      peck,
      deep_cycle: deep,
      partoff,
      catcher,
      stress,
      reasoning,
      source:
        "GrooveClassificationEngine.optimize (MS4b capstone: classify + cycle + peck + partoff + catcher + stress)",
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private validateGeometry(g: Partial<GrooveGeometry>): void {
    const req: Array<[string, number | undefined]> = [
      ["groove_width_mm", g.groove_width_mm],
      ["groove_depth_mm", g.groove_depth_mm],
      ["workpiece_diameter_mm", g.workpiece_diameter_mm],
      ["blade_width_mm", g.blade_width_mm],
    ];
    for (const [k, v] of req) {
      if (v === undefined || !Number.isFinite(v)) {
        throw new Error(`GrooveClassificationEngine: ${k} must be finite, got ${v}`);
      }
      if ((v as number) <= 0) {
        throw new Error(`GrooveClassificationEngine: ${k} must be positive, got ${v}`);
      }
    }
  }

  private buildReasoning(
    classify: GrooveClassifyResult,
    peck: PeckParams,
    stress: BladeStressResult,
    partoff: PartoffOptimizeResult | null,
    catcher: CatcherTimingResult | null,
  ): string[] {
    const lines: string[] = [];
    lines.push(
      `Classify: ${classify.groove_type} → ${classify.cycle} (${classify.n_passes} pass${classify.n_passes > 1 ? "es" : ""}).`,
    );
    lines.push(
      `Peck: ISO ${peck.iso_group} → ${peck.peck_depth_mm.toFixed(3)}mm deep, retract ${peck.retract_mm}mm, ${peck.coolant} coolant.`,
    );
    lines.push(
      `Blade stress: ${stress.cutting_force_N.toFixed(0)} N Fc → ${stress.max_blade_stress_MPa.toFixed(0)} MPa (${(stress.stress_to_yield_fraction * 100).toFixed(1)}% yield), L/t=${stress.lt_ratio} → ${stress.pass ? "PASS" : "FAIL"}.`,
    );
    if (partoff) {
      lines.push(
        `Parting: blade ${partoff.blade_width_mm}mm, RPM ${partoff.rpm_start}→${partoff.rpm_end} (G50 clamp ${partoff.rpm_clamp_g50}), feed ${partoff.feed_nominal_mm_rev}→${partoff.feed_at_center_mm_rev} at center.`,
      );
    }
    if (catcher) {
      lines.push(
        `Catcher: ${catcher.controller} ${catcher.m_codes.advance}/${catcher.m_codes.retract} @ d=${catcher.activate_at_diameter_mm}mm.`,
      );
    }
    for (const w of stress.warnings) lines.push(`  ⚠ ${w}`);
    return lines;
  }
}

export const grooveClassificationEngine = new GrooveClassificationEngine();
export { GrooveClassificationEngine };
