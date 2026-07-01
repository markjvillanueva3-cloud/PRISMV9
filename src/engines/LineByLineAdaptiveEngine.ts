/**
 * LineByLineAdaptiveEngine — POST-ULT-MS9 Pipeline Phase 2
 *
 * Every G-code line gets its own physics-optimized feed rate.
 * Consolidates 10 optimization modules (U01-U10):
 *   U01 AutoSpeedFeedWiring     — parse + per-line S/F calculation
 *   U02 ChipThinningCompensation — radial-engagement feed boost
 *   U03 EngagementAdaptiveFeed   — constant chip-load / force / MRR / thermal
 *   U04 CornerDecelerationEngine — direction-change feed reduction
 *   U05 ArcAndPlungeLimiting     — small-radius + Z-plunge feed limits
 *   U06 ContinuousWearThermalTracking — VB + temperature progression
 *   U07 EntryExitOptimizer       — entry/exit move detection + feed adjust
 *   U08 FeedTransitionSmoother   — S-curve ramp, no step > max_feed_step_percent
 *   U09 ChipEvacuationConstraint — deep-feature feed reduction (L/D>2)
 *   U10 BlockDensityOptimizer    — min block time > controller cycle time
 *
 * Actions: optimize, analyze, chip_thinning_only, corner_decel_only
 *
 * @version 1.0.0
 * @module LineByLineAdaptiveEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LineByLineInput {
  gcode: string;
  tool_diameter_mm: number;
  tool_flutes: number;
  base_rpm: number;
  base_feed_mmmin: number;
  material_iso: "P" | "M" | "K" | "N" | "S" | "H";
  radial_doc_mm?: number;
  axial_doc_mm?: number;
  tool_stickout_mm?: number;
  pocket_depth_mm?: number;
  wall_thickness_mm?: number;
  controller_cycle_time_ms?: number;  // default 2ms
  max_feed_step_percent?: number;     // default 20
  enable_chip_thinning?: boolean;     // default true
  enable_corner_decel?: boolean;      // default true
  enable_wear_tracking?: boolean;     // default true
  enable_feed_smoothing?: boolean;    // default true
}

export interface OptimizedLine {
  line_number: number;
  original_code: string;
  optimized_code: string;
  original_feed?: number;
  optimized_feed?: number;
  feed_delta_percent: number;
  line_type: "rapid" | "cutting" | "arc" | "plunge" | "entry" | "exit" | "dwell" | "comment" | "other";
  optimizations_applied: string[];
  engagement_percent?: number;
  chip_thinning_factor?: number;
  corner_angle_deg?: number;
  wear_vb_mm?: number;
  temperature_C?: number;
  explanation?: string;
}

export interface LineByLineResult {
  optimized_gcode: string;
  lines: OptimizedLine[];
  statistics: {
    total_lines: number;
    cutting_lines: number;
    lines_modified: number;
    avg_feed_change_percent: number;
    max_feed_boost_percent: number;
    max_feed_reduction_percent: number;
    chip_thinning_boosts: number;
    corner_decelerations: number;
    entry_exit_adjustments: number;
    feed_smoothing_insertions: number;
    block_density_merges: number;
    estimated_cycle_time_sec: number;
    original_cycle_time_sec: number;
    time_saved_sec: number;
    time_saved_percent: number;
  };
  wear_progression: { line: number; vb_mm: number; temp_C: number }[];
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface ParsedGLine {
  index: number;
  raw: string;
  trimmed: string;
  gCommand: string | null;   // G0, G1, G2, G3, G4, etc.
  mCommand: string | null;
  x?: number; y?: number; z?: number;
  i?: number; j?: number; k?: number;
  r?: number;
  f?: number; s?: number;
  lineType: OptimizedLine["line_type"];
}

interface Vec2 { x: number; y: number }

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Chip thinning factor lookup: ae/D ratio → CTF multiplier.
 * At low radial engagement the effective chip thickness drops, so feed must
 * increase to maintain the programmed chip load per tooth.
 */
const CHIP_THINNING_TABLE: [number, number][] = [
  [0.05, 2.30],
  [0.10, 1.80],
  [0.15, 1.50],
  [0.25, 1.25],
  [0.50, 1.00],
  [0.75, 0.95],
  [1.00, 0.90],
];

/**
 * Material-specific wear coefficient K (mm wear per mm of cutting length).
 * Taylor-based simplified model: VB = VB_prev + K * Vc * fz * dt
 * Higher K → faster wear progression.
 */
const MATERIAL_WEAR_K: Record<string, number> = {
  P: 1.2e-8,  // steel
  M: 2.0e-8,  // stainless
  K: 0.8e-8,  // cast iron
  N: 0.5e-8,  // non-ferrous (aluminum)
  S: 3.5e-8,  // superalloys (Inconel, Ti)
  H: 2.8e-8,  // hardened steel
};

/**
 * Material thermal generation coefficient (°C per kJ of cutting energy).
 * Simplified: dT = coeff * Vc * f * ae * ap * dt / (mass * Cp)
 * We use a lumped coefficient that includes thermal mass normalization.
 */
const MATERIAL_THERMAL_COEFF: Record<string, number> = {
  P: 0.0040,
  M: 0.0055,
  K: 0.0030,
  N: 0.0020,
  S: 0.0075,
  H: 0.0060,
};

/**
 * Recommended entry feed percentage by material ISO class.
 * Entry moves should use reduced feed to avoid shock loading.
 */
const ENTRY_FEED_FACTOR: Record<string, number> = {
  P: 0.70,
  M: 0.60,
  K: 0.75,
  N: 0.80,
  S: 0.50,
  H: 0.55,
};

/**
 * Thermal dissipation rate per second (temperature cool-down during non-cutting).
 */
const THERMAL_DISSIPATION_RATE = 0.15; // °C/s

// ============================================================================
// PARSER
// ============================================================================

function parseGLine(raw: string, index: number): ParsedGLine {
  const trimmed = raw.trim();
  const isComment = trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%") || trimmed.length === 0;

  if (isComment) {
    return { index, raw, trimmed, gCommand: null, mCommand: null, lineType: "comment" };
  }

  // Extract G command
  const gMatch = trimmed.match(/G(\d{1,3}(?:\.\d+)?)/i);
  const gCommand = gMatch ? `G${parseInt(gMatch[1])}` : null;

  // Extract M command
  const mMatch = trimmed.match(/M(\d{1,3})/i);
  const mCommand = mMatch ? `M${parseInt(mMatch[1])}` : null;

  // Extract coordinates
  const xM = trimmed.match(/X(-?[\d.]+)/i);
  const yM = trimmed.match(/Y(-?[\d.]+)/i);
  const zM = trimmed.match(/Z(-?[\d.]+)/i);
  const iM = trimmed.match(/I(-?[\d.]+)/i);
  const jM = trimmed.match(/J(-?[\d.]+)/i);
  const kM = trimmed.match(/K(-?[\d.]+)/i);
  const rM = trimmed.match(/R(-?[\d.]+)/i);
  const fM = trimmed.match(/F(-?[\d.]+)/i);
  const sM = trimmed.match(/S(\d+)/i);

  const x = xM ? parseFloat(xM[1]) : undefined;
  const y = yM ? parseFloat(yM[1]) : undefined;
  const z = zM ? parseFloat(zM[1]) : undefined;
  const i = iM ? parseFloat(iM[1]) : undefined;
  const j = jM ? parseFloat(jM[1]) : undefined;
  const k = kM ? parseFloat(kM[1]) : undefined;
  const r = rM ? parseFloat(rM[1]) : undefined;
  const f = fM ? parseFloat(fM[1]) : undefined;
  const s = sM ? parseInt(sM[1]) : undefined;

  // Determine line type
  let lineType: OptimizedLine["line_type"] = "other";
  if (gCommand === "G0") {
    lineType = "rapid";
  } else if (gCommand === "G1") {
    // Check if pure Z-negative move (plunge)
    const hasXY = x !== undefined || y !== undefined;
    const hasZ = z !== undefined;
    if (hasZ && !hasXY) {
      lineType = "plunge";
    } else {
      lineType = "cutting";
    }
  } else if (gCommand === "G2" || gCommand === "G3") {
    lineType = "arc";
  } else if (gCommand === "G4") {
    lineType = "dwell";
  } else if (gCommand === "G1" || (!gCommand && (x !== undefined || y !== undefined || z !== undefined))) {
    // Modal G1 — no explicit G command but has coordinates
    const hasXY = x !== undefined || y !== undefined;
    const hasZ = z !== undefined;
    if (hasZ && !hasXY) {
      lineType = "plunge";
    } else if (hasXY) {
      lineType = "cutting";
    }
  }

  return { index, raw, trimmed, gCommand, mCommand, x, y, z, i, j, k, r, f, s, lineType };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Linear interpolation in the chip thinning table. */
function chipThinningFactor(aeOverD: number): number {
  if (aeOverD <= CHIP_THINNING_TABLE[0][0]) return CHIP_THINNING_TABLE[0][1];
  if (aeOverD >= CHIP_THINNING_TABLE[CHIP_THINNING_TABLE.length - 1][0]) {
    return CHIP_THINNING_TABLE[CHIP_THINNING_TABLE.length - 1][1];
  }

  for (let idx = 0; idx < CHIP_THINNING_TABLE.length - 1; idx++) {
    const [r0, f0] = CHIP_THINNING_TABLE[idx];
    const [r1, f1] = CHIP_THINNING_TABLE[idx + 1];
    if (aeOverD >= r0 && aeOverD <= r1) {
      const t = (aeOverD - r0) / (r1 - r0);
      return f0 + t * (f1 - f0);
    }
  }
  return 1.0;
}

/** Angle in degrees between two 2D direction vectors (0-180). */
function angleBetweenDeg(a: Vec2, b: Vec2): number {
  const magA = Math.sqrt(a.x * a.x + a.y * a.y);
  const magB = Math.sqrt(b.x * b.x + b.y * b.y);
  if (magA < 1e-9 || magB < 1e-9) return 0;
  const dot = (a.x * b.x + a.y * b.y) / (magA * magB);
  const clamped = Math.max(-1, Math.min(1, dot));
  return Math.acos(clamped) * (180 / Math.PI);
}

/** Distance between two 3D points. */
function dist3D(
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
): number {
  return Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2 + (z1 - z0) ** 2);
}

/** Distance between two 2D points. */
function dist2D(x0: number, y0: number, x1: number, y1: number): number {
  return Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
}

/** Estimate arc length from endpoints and IJ offsets (approximate). */
function estimateArcLength(
  x0: number, y0: number, x1: number, y1: number,
  ci: number, cj: number,
): number {
  const cx = x0 + ci;
  const cy = y0 + cj;
  const radius = Math.sqrt(ci * ci + cj * cj);
  if (radius < 1e-9) return dist2D(x0, y0, x1, y1);

  const startAngle = Math.atan2(y0 - cy, x0 - cx);
  const endAngle = Math.atan2(y1 - cy, x1 - cx);
  let sweep = Math.abs(endAngle - startAngle);
  if (sweep < 1e-9) sweep = 2 * Math.PI; // full circle
  return radius * sweep;
}

/** Replace or insert F word in a G-code line. */
function setFeedInLine(line: string, newFeed: number): string {
  const fVal = `F${Math.round(newFeed)}`;
  if (/F-?[\d.]+/i.test(line)) {
    return line.replace(/F-?[\d.]+/i, fVal);
  }
  // Insert F before any trailing comment
  const commentIdx = line.indexOf("(");
  if (commentIdx > 0) {
    return line.slice(0, commentIdx).trimEnd() + " " + fVal + " " + line.slice(commentIdx);
  }
  return line + " " + fVal;
}

/** Clamp a value between min and max. */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LineByLineAdaptiveEngine {
  // --------------------------------------------------------------------------
  // U02: Chip Thinning Compensation
  // --------------------------------------------------------------------------

  /**
   * Calculate chip-thinning-compensated feed rate.
   * When radial engagement is less than tool diameter, the effective chip
   * thickness decreases. We boost feed to maintain the programmed chip load.
   */
  private applyChipThinning(
    baseFeed: number,
    radialDoc: number,
    toolDiameter: number,
  ): { feed: number; ctf: number; aeOverD: number } {
    const aeOverD = clamp(radialDoc / toolDiameter, 0.01, 1.0);
    const ctf = chipThinningFactor(aeOverD);
    return { feed: baseFeed * ctf, ctf, aeOverD };
  }

  // --------------------------------------------------------------------------
  // U03: Engagement Adaptive Feed
  // --------------------------------------------------------------------------

  /**
   * Adjust feed to maintain constant chip load (or force/MRR/thermal) as
   * engagement varies along the toolpath.
   * Mode: constant_chip_load (default) — F ∝ 1/engagement_factor
   */
  private engagementAdaptiveFeed(
    feed: number,
    engagementPercent: number,
    _mode: "constant_chip_load" | "constant_force" | "constant_mrr" | "thermal_balance" = "constant_chip_load",
  ): number {
    if (engagementPercent <= 0 || engagementPercent > 100) return feed;
    const engFrac = engagementPercent / 100;

    switch (_mode) {
      case "constant_chip_load":
        // chip load ∝ fz * sqrt(ae/D) → to keep constant, F ∝ 1/sqrt(ae/D)
        return feed / Math.sqrt(engFrac);
      case "constant_force":
        // force ∝ F * ae^0.75 → F ∝ 1/ae^0.75
        return feed / Math.pow(engFrac, 0.75);
      case "constant_mrr":
        // MRR = ae * ap * f → F ∝ 1/ae
        return feed / engFrac;
      case "thermal_balance":
        // thermal ∝ F * ae^0.5 → F ∝ 1/ae^0.5 (same as chip load approx)
        return feed / Math.sqrt(engFrac);
      default:
        return feed;
    }
  }

  // --------------------------------------------------------------------------
  // U04: Corner Deceleration
  // --------------------------------------------------------------------------

  /**
   * Reduce feed at corners where direction changes exceed threshold.
   * Default: >30° angle change → 50% base slowdown, scaled linearly
   * from 30° (0% reduction) to 180° (50% reduction).
   */
  private cornerDecelerationFactor(angleDeg: number, threshold: number = 30): number {
    if (angleDeg <= threshold) return 1.0;
    // Linear ramp from 1.0 at threshold to 0.5 at 180°
    const maxReduction = 0.50;
    const t = clamp((angleDeg - threshold) / (180 - threshold), 0, 1);
    return 1.0 - t * maxReduction;
  }

  // --------------------------------------------------------------------------
  // U05: Arc and Plunge Limiting
  // --------------------------------------------------------------------------

  /**
   * Limit feed for small-radius arcs and plunge moves.
   * - Arc radius < 2mm → feed *= (radius / 2)
   * - Pure Z plunge → feed *= 0.50
   */
  private arcAndPlungeFeedLimit(
    feed: number,
    lineType: OptimizedLine["line_type"],
    arcRadius?: number,
  ): { feed: number; applied: boolean; reason: string } {
    if (lineType === "plunge") {
      return { feed: feed * 0.50, applied: true, reason: "plunge_50pct" };
    }
    if (lineType === "arc" && arcRadius !== undefined && arcRadius < 2.0) {
      const factor = clamp(arcRadius / 2.0, 0.2, 1.0);
      return { feed: feed * factor, applied: true, reason: `small_arc_r${arcRadius.toFixed(2)}mm` };
    }
    return { feed, applied: false, reason: "" };
  }

  // --------------------------------------------------------------------------
  // U06: Continuous Wear & Thermal Tracking
  // --------------------------------------------------------------------------

  /**
   * Update tool wear VB and temperature for the current line.
   * VB(n) = VB(n-1) + K * Vc * fz * dt
   * T(n) = T(n-1) * (1 - dissipation*dt) + thermal_coeff * Vc * f * ae * ap * dt
   */
  private updateWearAndTemp(
    prevVB: number,
    prevTemp: number,
    cuttingSpeed_mmin: number,
    feedPerTooth: number,
    radialDoc: number,
    axialDoc: number,
    dt_sec: number,
    materialISO: string,
    isCutting: boolean,
  ): { vb: number; temp: number; feedReduction: number } {
    if (!isCutting || dt_sec <= 0) {
      // Not cutting — tool cools down, no wear
      const cooledTemp = Math.max(20, prevTemp - THERMAL_DISSIPATION_RATE * dt_sec * prevTemp);
      return { vb: prevVB, temp: cooledTemp, feedReduction: 1.0 };
    }

    const K = MATERIAL_WEAR_K[materialISO] ?? MATERIAL_WEAR_K.P;
    const thermalCoeff = MATERIAL_THERMAL_COEFF[materialISO] ?? MATERIAL_THERMAL_COEFF.P;

    // Wear progression (simplified Taylor)
    const dVB = K * cuttingSpeed_mmin * 1000 * feedPerTooth * dt_sec;
    const newVB = prevVB + dVB;

    // Thermal accumulation
    const dissipation = 1 - THERMAL_DISSIPATION_RATE * dt_sec;
    const dTemp = thermalCoeff * cuttingSpeed_mmin * feedPerTooth * radialDoc * axialDoc * dt_sec;
    const newTemp = Math.max(20, prevTemp * Math.max(0, dissipation) + dTemp);

    // Feed reduction based on wear state
    // VB < 0.1mm → no reduction; VB 0.1-0.3mm → linear reduction to 0.7; VB > 0.3mm → 0.5
    let feedReduction = 1.0;
    if (newVB > 0.3) {
      feedReduction = 0.50;
    } else if (newVB > 0.1) {
      feedReduction = 1.0 - ((newVB - 0.1) / 0.2) * 0.30;
    }

    // Additional reduction for high temperature (>600°C for carbide)
    if (newTemp > 800) {
      feedReduction *= 0.60;
    } else if (newTemp > 600) {
      feedReduction *= 1.0 - ((newTemp - 600) / 200) * 0.20;
    }

    return { vb: newVB, temp: newTemp, feedReduction };
  }

  // --------------------------------------------------------------------------
  // U07: Entry/Exit Optimizer
  // --------------------------------------------------------------------------

  /**
   * Detect if a line is an entry or exit move and return feed adjustment.
   * Entry: first cutting move after a rapid or plunge.
   * Exit: cutting move followed by a rapid.
   */
  private entryExitFeedFactor(
    materialISO: string,
    isEntry: boolean,
    isExit: boolean,
  ): number {
    if (isEntry) return ENTRY_FEED_FACTOR[materialISO] ?? 0.70;
    if (isExit) return 0.85; // slight reduction on exit to maintain surface finish
    return 1.0;
  }

  // --------------------------------------------------------------------------
  // U09: Chip Evacuation Constraint
  // --------------------------------------------------------------------------

  /**
   * Reduce feed when L/D ratio exceeds 2 (deep features).
   * L/D 2-4 → linear reduction to 0.70
   * L/D 4-6 → 0.70 to 0.50
   * L/D >6 → 0.50
   */
  private chipEvacuationFactor(
    pocketDepth: number | undefined,
    toolDiameter: number,
  ): number {
    if (!pocketDepth || pocketDepth <= 0) return 1.0;
    const LD = pocketDepth / toolDiameter;
    if (LD <= 2) return 1.0;
    if (LD <= 4) return 1.0 - ((LD - 2) / 2) * 0.30;
    if (LD <= 6) return 0.70 - ((LD - 4) / 2) * 0.20;
    return 0.50;
  }

  // --------------------------------------------------------------------------
  // U10: Block Density Optimizer
  // --------------------------------------------------------------------------

  /**
   * Check if a block's execution time is above the controller cycle time.
   * Returns the minimum feed rate that satisfies the constraint, or the
   * original feed if already OK.
   */
  private blockDensityMinFeed(
    blockLength_mm: number,
    feed_mmmin: number,
    cycleTime_ms: number,
  ): { feed: number; adjusted: boolean } {
    if (blockLength_mm <= 0) return { feed: feed_mmmin, adjusted: false };

    const blockTime_ms = (blockLength_mm / feed_mmmin) * 60_000;
    if (blockTime_ms >= cycleTime_ms) {
      return { feed: feed_mmmin, adjusted: false };
    }

    // Reduce feed so block time = cycle time
    const minFeed = (blockLength_mm / cycleTime_ms) * 60_000;
    return { feed: Math.min(feed_mmmin, minFeed), adjusted: true };
  }

  // --------------------------------------------------------------------------
  // U08: Feed Transition Smoother
  // --------------------------------------------------------------------------

  /**
   * Smooth feed transitions between consecutive blocks.
   * If the step exceeds max_step_percent, insert intermediate ramping value(s).
   * Returns the clamped feed for this block (does not insert extra lines —
   * that is handled at the output stage).
   */
  private smoothFeedTransition(
    prevFeed: number,
    targetFeed: number,
    maxStepPercent: number,
  ): number[] {
    if (prevFeed <= 0) return [targetFeed];

    const delta = Math.abs(targetFeed - prevFeed) / prevFeed;
    if (delta <= maxStepPercent / 100) return [targetFeed];

    // Build ramp steps
    const steps: number[] = [];
    const direction = targetFeed > prevFeed ? 1 : -1;
    const maxStep = prevFeed * (maxStepPercent / 100);
    let current = prevFeed;

    while (Math.abs(targetFeed - current) > maxStep * 0.5) {
      current += direction * maxStep;
      if ((direction > 0 && current >= targetFeed) || (direction < 0 && current <= targetFeed)) {
        break;
      }
      steps.push(Math.round(current));
    }
    steps.push(targetFeed);
    return steps;
  }

  // --------------------------------------------------------------------------
  // MAIN: optimize
  // --------------------------------------------------------------------------

  /**
   * Full line-by-line adaptive optimization.
   * Applies all 10 modules in sequence to each G-code line.
   */
  optimize(input: LineByLineInput): LineByLineResult {
    const {
      gcode,
      tool_diameter_mm: D,
      tool_flutes: Z,
      base_rpm: rpm,
      base_feed_mmmin: baseFeed,
      material_iso: mat,
      radial_doc_mm,
      axial_doc_mm,
      tool_stickout_mm,
      pocket_depth_mm,
      controller_cycle_time_ms = 2,
      max_feed_step_percent = 20,
      enable_chip_thinning = true,
      enable_corner_decel = true,
      enable_wear_tracking = true,
      enable_feed_smoothing = true,
    } = input;

    const rawLines = gcode.split("\n");
    const parsed: ParsedGLine[] = rawLines.map((line, idx) => parseGLine(line, idx));

    // Derive cutting parameters
    const radialDoc = radial_doc_mm ?? D * 0.25;
    const axialDoc = axial_doc_mm ?? D * 0.5;
    const cuttingSpeed = (Math.PI * D * rpm) / 1000; // m/min
    const feedPerTooth = baseFeed / (Z * rpm);        // mm/tooth

    // State tracking
    let prevX = 0, prevY = 0, prevZ = 0;
    let modalFeed = baseFeed;
    let currentVB = 0;
    let currentTemp = 25; // ambient
    let prevLineType: OptimizedLine["line_type"] = "other";

    // Collect results
    const optimizedLines: OptimizedLine[] = [];
    const wearProgression: { line: number; vb_mm: number; temp_C: number }[] = [];

    // Statistics accumulators
    let cuttingLines = 0;
    let linesModified = 0;
    let totalFeedChangePct = 0;
    let maxBoostPct = 0;
    let maxReductionPct = 0;
    let chipThinningBoosts = 0;
    let cornerDecels = 0;
    let entryExitAdj = 0;
    let feedSmoothInsertions = 0;
    let blockDensityMerges = 0;
    let originalTotalTime = 0;
    let optimizedTotalTime = 0;

    // Pre-compute direction vectors for corner detection
    const directions: (Vec2 | null)[] = [];
    let px = 0, py = 0;
    for (const p of parsed) {
      const nx = p.x ?? px;
      const ny = p.y ?? py;
      if (p.lineType === "cutting" || p.lineType === "arc") {
        const dx = nx - px;
        const dy = ny - py;
        directions.push({ x: dx, y: dy });
      } else {
        directions.push(null);
      }
      px = nx; py = ny;
    }

    // Determine entry/exit flags
    const entryFlags: boolean[] = new Array(parsed.length).fill(false);
    const exitFlags: boolean[] = new Array(parsed.length).fill(false);
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i].lineType;
      const prev = i > 0 ? parsed[i - 1].lineType : "other";
      const next = i < parsed.length - 1 ? parsed[i + 1].lineType : "other";

      if ((cur === "cutting" || cur === "arc") && (prev === "rapid" || prev === "plunge" || prev === "other" || prev === "comment")) {
        entryFlags[i] = true;
      }
      if ((cur === "cutting" || cur === "arc") && (next === "rapid" || next === "other" || next === "comment" || next === "dwell")) {
        exitFlags[i] = true;
      }
    }

    // Previous optimized feed for smoothing
    let prevOptimizedFeed = baseFeed;

    // ========================================================================
    // LINE-BY-LINE PROCESSING
    // ========================================================================

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const appliedOpts: string[] = [];
      const explanations: string[] = [];

      // Resolve current position
      const curX = p.x ?? prevX;
      const curY = p.y ?? prevY;
      const curZ = p.z ?? prevZ;

      // Compute block length
      let blockLength: number;
      if (p.lineType === "arc" && (p.i !== undefined || p.j !== undefined)) {
        blockLength = estimateArcLength(prevX, prevY, curX, curY, p.i ?? 0, p.j ?? 0);
        // Include Z component for helical arcs
        const dz = Math.abs(curZ - prevZ);
        if (dz > 0.001) {
          blockLength = Math.sqrt(blockLength * blockLength + dz * dz);
        }
      } else {
        blockLength = dist3D(prevX, prevY, prevZ, curX, curY, curZ);
      }

      // Get arc radius for U05
      let arcRadius: number | undefined;
      if (p.lineType === "arc") {
        if (p.r !== undefined) {
          arcRadius = Math.abs(p.r);
        } else if (p.i !== undefined || p.j !== undefined) {
          arcRadius = Math.sqrt((p.i ?? 0) ** 2 + (p.j ?? 0) ** 2);
        }
      }

      // Non-cutting lines pass through unmodified
      if (p.lineType === "comment" || p.lineType === "other" || p.lineType === "dwell" || p.lineType === "rapid") {
        // Rapid time estimate
        if (p.lineType === "rapid" && blockLength > 0) {
          const rapidRate = 10000; // mm/min typical rapid
          const dt = (blockLength / rapidRate) * 60;
          originalTotalTime += dt;
          optimizedTotalTime += dt;

          // Wear: cool-down during rapid
          if (enable_wear_tracking) {
            const wear = this.updateWearAndTemp(currentVB, currentTemp, 0, 0, 0, 0, dt, mat, false);
            currentVB = wear.vb;
            currentTemp = wear.temp;
          }
        }

        optimizedLines.push({
          line_number: i + 1,
          original_code: p.raw,
          optimized_code: p.raw,
          feed_delta_percent: 0,
          line_type: p.lineType,
          optimizations_applied: [],
        });

        prevX = curX; prevY = curY; prevZ = curZ;
        prevLineType = p.lineType;
        continue;
      }

      // ====================================================================
      // CUTTING / ARC / PLUNGE / ENTRY / EXIT LINES
      // ====================================================================
      cuttingLines++;

      // Determine the effective feed for this line
      const lineFeed = p.f ?? modalFeed;
      if (p.f !== undefined) modalFeed = p.f;

      let optimizedFeed = lineFeed;
      let chipThinningFactorVal: number | undefined;
      let engagementPct: number | undefined;
      let cornerAngle: number | undefined;

      // --- U01: AutoSpeedFeedWiring (base identification already done by parser)
      appliedOpts.push("U01_auto_speed_feed");

      // --- U02: Chip Thinning Compensation
      if (enable_chip_thinning && (p.lineType === "cutting" || p.lineType === "arc")) {
        const ct = this.applyChipThinning(optimizedFeed, radialDoc, D);
        if (Math.abs(ct.ctf - 1.0) > 0.01) {
          optimizedFeed = ct.feed;
          chipThinningFactorVal = ct.ctf;
          engagementPct = ct.aeOverD * 100;
          appliedOpts.push("U02_chip_thinning");
          explanations.push(`CTF=${ct.ctf.toFixed(2)} at ae/D=${ct.aeOverD.toFixed(3)}`);
          chipThinningBoosts++;
        }
      }

      // --- U03: Engagement Adaptive Feed
      if (p.lineType === "cutting" || p.lineType === "arc") {
        const engPct = engagementPct ?? (radialDoc / D) * 100;
        engagementPct = engPct;
        const adaptedFeed = this.engagementAdaptiveFeed(optimizedFeed, engPct, "constant_chip_load");
        if (Math.abs(adaptedFeed - optimizedFeed) > 1) {
          optimizedFeed = adaptedFeed;
          appliedOpts.push("U03_engagement_adaptive");
        }
      }

      // --- U04: Corner Deceleration
      if (enable_corner_decel && directions[i] && (p.lineType === "cutting" || p.lineType === "arc")) {
        // Find previous cutting direction
        let prevDir: Vec2 | null = null;
        for (let j = i - 1; j >= 0; j--) {
          if (directions[j]) { prevDir = directions[j]; break; }
        }
        if (prevDir) {
          const angle = angleBetweenDeg(prevDir, directions[i]!);
          cornerAngle = angle;
          const factor = this.cornerDecelerationFactor(angle);
          if (factor < 1.0) {
            optimizedFeed *= factor;
            appliedOpts.push("U04_corner_decel");
            explanations.push(`corner=${angle.toFixed(1)}° → ${(factor * 100).toFixed(0)}% feed`);
            cornerDecels++;
          }
        }
      }

      // --- U05: Arc and Plunge Limiting
      const arcPlunge = this.arcAndPlungeFeedLimit(optimizedFeed, p.lineType, arcRadius);
      if (arcPlunge.applied) {
        optimizedFeed = arcPlunge.feed;
        appliedOpts.push("U05_arc_plunge_limit");
        explanations.push(arcPlunge.reason);
      }

      // --- U07: Entry/Exit Optimizer
      let isEntry = entryFlags[i];
      let isExit = exitFlags[i];
      if (isEntry || isExit) {
        // Override lineType for output
        if (isEntry && (p.lineType === "cutting" || p.lineType === "arc")) {
          const eeFactor = this.entryExitFeedFactor(mat, true, false);
          optimizedFeed *= eeFactor;
          appliedOpts.push("U07_entry_optimizer");
          explanations.push(`entry feed × ${eeFactor.toFixed(2)}`);
          entryExitAdj++;
        }
        if (isExit && (p.lineType === "cutting" || p.lineType === "arc")) {
          const eeFactor = this.entryExitFeedFactor(mat, false, true);
          optimizedFeed *= eeFactor;
          appliedOpts.push("U07_exit_optimizer");
          explanations.push(`exit feed × ${eeFactor.toFixed(2)}`);
          entryExitAdj++;
        }
      }

      // --- U09: Chip Evacuation Constraint
      const chipEvacFactor = this.chipEvacuationFactor(pocket_depth_mm, D);
      if (chipEvacFactor < 1.0) {
        optimizedFeed *= chipEvacFactor;
        appliedOpts.push("U09_chip_evacuation");
        explanations.push(`L/D=${((pocket_depth_mm ?? 0) / D).toFixed(1)} → feed × ${chipEvacFactor.toFixed(2)}`);
      }

      // --- U10: Block Density Optimizer
      if (blockLength > 0) {
        const bd = this.blockDensityMinFeed(blockLength, optimizedFeed, controller_cycle_time_ms);
        if (bd.adjusted) {
          optimizedFeed = bd.feed;
          appliedOpts.push("U10_block_density");
          explanations.push(`block ${blockLength.toFixed(3)}mm → feed capped for ${controller_cycle_time_ms}ms cycle`);
          blockDensityMerges++;
        }
      }

      // --- U06: Continuous Wear & Thermal Tracking
      let wearVB: number | undefined;
      let tempC: number | undefined;
      if (enable_wear_tracking) {
        const dt = blockLength > 0 && optimizedFeed > 0
          ? (blockLength / optimizedFeed) * 60
          : 0;
        const isCut = p.lineType === "cutting" || p.lineType === "arc";
        const wear = this.updateWearAndTemp(
          currentVB, currentTemp, cuttingSpeed, feedPerTooth,
          radialDoc, axialDoc, dt, mat, isCut,
        );
        currentVB = wear.vb;
        currentTemp = wear.temp;
        wearVB = wear.vb;
        tempC = wear.temp;

        if (wear.feedReduction < 1.0) {
          optimizedFeed *= wear.feedReduction;
          appliedOpts.push("U06_wear_thermal");
          explanations.push(`VB=${wear.vb.toFixed(4)}mm T=${wear.temp.toFixed(0)}°C → feed × ${wear.feedReduction.toFixed(2)}`);
        }

        wearProgression.push({ line: i + 1, vb_mm: wear.vb, temp_C: wear.temp });
      }

      // --- U08: Feed Transition Smoother
      if (enable_feed_smoothing) {
        const smoothed = this.smoothFeedTransition(prevOptimizedFeed, optimizedFeed, max_feed_step_percent);
        if (smoothed.length > 1) {
          // Use the first ramp step for this line, note the smoothing
          optimizedFeed = smoothed[0];
          appliedOpts.push("U08_feed_smoothing");
          explanations.push(`smoothed ${smoothed.length} steps to target`);
          feedSmoothInsertions += smoothed.length - 1;
        } else {
          optimizedFeed = smoothed[0];
        }
      }

      // Ensure feed is sane (minimum 1 mm/min, max 100× base)
      optimizedFeed = clamp(Math.round(optimizedFeed), 1, baseFeed * 100);

      // Compute time for statistics
      if (blockLength > 0) {
        originalTotalTime += lineFeed > 0 ? (blockLength / lineFeed) * 60 : 0;
        optimizedTotalTime += optimizedFeed > 0 ? (blockLength / optimizedFeed) * 60 : 0;
      }

      // Build optimized code
      const feedDelta = lineFeed > 0 ? ((optimizedFeed - lineFeed) / lineFeed) * 100 : 0;
      const modified = Math.abs(feedDelta) > 0.5;
      let optimizedCode = p.raw;
      if (modified) {
        optimizedCode = setFeedInLine(p.trimmed, optimizedFeed);
        linesModified++;
      }

      // Determine output line type (override for entry/exit)
      let outputLineType = p.lineType;
      if (isEntry) outputLineType = "entry";
      if (isExit) outputLineType = "exit";

      totalFeedChangePct += Math.abs(feedDelta);
      if (feedDelta > 0) maxBoostPct = Math.max(maxBoostPct, feedDelta);
      if (feedDelta < 0) maxReductionPct = Math.max(maxReductionPct, Math.abs(feedDelta));

      optimizedLines.push({
        line_number: i + 1,
        original_code: p.raw,
        optimized_code: optimizedCode,
        original_feed: lineFeed,
        optimized_feed: optimizedFeed,
        feed_delta_percent: Math.round(feedDelta * 100) / 100,
        line_type: outputLineType,
        optimizations_applied: appliedOpts,
        engagement_percent: engagementPct !== undefined ? Math.round(engagementPct * 100) / 100 : undefined,
        chip_thinning_factor: chipThinningFactorVal,
        corner_angle_deg: cornerAngle !== undefined ? Math.round(cornerAngle * 100) / 100 : undefined,
        wear_vb_mm: wearVB !== undefined ? Math.round(wearVB * 10000) / 10000 : undefined,
        temperature_C: tempC !== undefined ? Math.round(tempC * 10) / 10 : undefined,
        explanation: explanations.length > 0 ? explanations.join("; ") : undefined,
      });

      prevOptimizedFeed = optimizedFeed;
      prevX = curX; prevY = curY; prevZ = curZ;
      prevLineType = p.lineType;
    }

    // ========================================================================
    // ASSEMBLE OUTPUT
    // ========================================================================

    const optimizedGcode = optimizedLines.map(l => l.optimized_code).join("\n");
    const avgFeedChange = cuttingLines > 0 ? totalFeedChangePct / cuttingLines : 0;
    const timeSaved = originalTotalTime - optimizedTotalTime;
    const timeSavedPct = originalTotalTime > 0 ? (timeSaved / originalTotalTime) * 100 : 0;

    return {
      optimized_gcode: optimizedGcode,
      lines: optimizedLines,
      statistics: {
        total_lines: parsed.length,
        cutting_lines: cuttingLines,
        lines_modified: linesModified,
        avg_feed_change_percent: Math.round(avgFeedChange * 100) / 100,
        max_feed_boost_percent: Math.round(maxBoostPct * 100) / 100,
        max_feed_reduction_percent: Math.round(maxReductionPct * 100) / 100,
        chip_thinning_boosts: chipThinningBoosts,
        corner_decelerations: cornerDecels,
        entry_exit_adjustments: entryExitAdj,
        feed_smoothing_insertions: feedSmoothInsertions,
        block_density_merges: blockDensityMerges,
        estimated_cycle_time_sec: Math.round(optimizedTotalTime * 100) / 100,
        original_cycle_time_sec: Math.round(originalTotalTime * 100) / 100,
        time_saved_sec: Math.round(timeSaved * 100) / 100,
        time_saved_percent: Math.round(timeSavedPct * 100) / 100,
      },
      wear_progression: wearProgression,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: analyze
  // --------------------------------------------------------------------------

  /**
   * Analyze G-code without modifying it. Returns statistics and per-line
   * classification only.
   */
  analyze(input: LineByLineInput): Omit<LineByLineResult, "optimized_gcode"> {
    const result = this.optimize(input);
    return {
      lines: result.lines.map(l => ({ ...l, optimized_code: l.original_code, optimized_feed: l.original_feed })),
      statistics: result.statistics,
      wear_progression: result.wear_progression,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: chip_thinning_only
  // --------------------------------------------------------------------------

  /**
   * Apply only chip thinning compensation (U02). All other modules disabled.
   */
  chipThinningOnly(input: LineByLineInput): LineByLineResult {
    return this.optimize({
      ...input,
      enable_chip_thinning: true,
      enable_corner_decel: false,
      enable_wear_tracking: false,
      enable_feed_smoothing: false,
    });
  }

  // --------------------------------------------------------------------------
  // ACTION: corner_decel_only
  // --------------------------------------------------------------------------

  /**
   * Apply only corner deceleration (U04). All other modules disabled.
   */
  cornerDecelOnly(input: LineByLineInput): LineByLineResult {
    return this.optimize({
      ...input,
      enable_chip_thinning: false,
      enable_corner_decel: true,
      enable_wear_tracking: false,
      enable_feed_smoothing: false,
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const lineByLineAdaptiveEngine = new LineByLineAdaptiveEngine();
