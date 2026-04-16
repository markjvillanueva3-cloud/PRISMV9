/**
 * RampingEngine — Ramp Entry Strategy Calculations
 *
 * Calculates parameters for ramp milling entry strategies:
 * - Linear ramp: angle, length, feed reduction
 * - Helical ramp: helix diameter, pitch, feed compensation
 * - Plunge-to-ramp transition guidance
 * - Maximum ramp angle by tool geometry
 *
 * Key physics: Ramping avoids the full-width slot entry
 * that causes excessive radial load. The ramp angle
 * determines axial engagement rate. Helical ramping
 * distributes the entry over the full pocket perimeter,
 * reducing load further. Feed must be reduced during
 * ramping (typically 50-70% of normal) due to center
 * cutting conditions.
 *
 * Reference: Sandvik ramping guide (C-2920:28),
 *            Kennametal end mill ramping tables,
 *            Machinery's Handbook Ch.24
 *
 * Actions: linear_ramp_calc, helical_ramp_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface LinearRampInput {
  tool_diameter_mm: number;
  num_flutes?: number;
  target_depth_mm: number;
  slot_width_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  max_ramp_angle_deg?: number;
}

export interface LinearRampResult {
  ramp_angle: AtomicValue;
  ramp_length: AtomicValue;
  ramp_feed: AtomicValue;
  normal_feed: AtomicValue;
  feed_reduction: AtomicValue;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  num_ramp_passes: AtomicValue;
  depth_per_pass: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

export interface HelicalRampInput {
  tool_diameter_mm: number;
  num_flutes?: number;
  pocket_diameter_mm: number;
  target_depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  max_ramp_angle_deg?: number;
}

export interface HelicalRampResult {
  helix_diameter: AtomicValue;
  ramp_angle: AtomicValue;
  pitch_per_revolution: AtomicValue;
  num_revolutions: AtomicValue;
  ramp_feed: AtomicValue;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  cycle_time: AtomicValue;
  radial_engagement: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Ramp cutting speeds (m/min) — reduced from normal */
const RAMP_SPEEDS: Record<string, number> = {
  P: 150, M: 80, K: 180, N: 350, S: 25, H: 50,
};

/** Normal feed per tooth (mm/tooth) by ISO group */
const NORMAL_FZ: Record<string, number> = {
  P: 0.10, M: 0.07, K: 0.12, N: 0.10, S: 0.05, H: 0.04,
};

/** Max ramp angle (deg) by flute count */
function defaultMaxAngle(flutes: number): number {
  if (flutes <= 2) return 3;
  if (flutes <= 3) return 5;
  if (flutes <= 4) return 8;
  return 10;
}

// ── Engine ─────────────────────────────────────────────────────────

export class RampingEngine {
  /**
   * Calculate linear ramp entry parameters.
   */
  linearRamp(input: LinearRampInput): LinearRampResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.tool_diameter_mm;
    const z = input.num_flutes ?? 4;
    const depth = input.target_depth_mm;
    const slotW = input.slot_width_mm ?? D;

    // Max ramp angle
    const maxAngle = input.max_ramp_angle_deg
      ?? defaultMaxAngle(z);

    // Ramp angle: use max or limit by slot length
    const rampAngle = Math.min(maxAngle, 10);
    const angleRad = (rampAngle * Math.PI) / 180;

    // Ramp length = depth / tan(angle)
    const rampLength = depth / Math.tan(angleRad);

    // Speed and feed
    const vc = RAMP_SPEEDS[iso] ?? 150;
    const rpm = (vc * 1000) / (Math.PI * D);
    const fzNormal = NORMAL_FZ[iso] ?? 0.10;

    // Feed reduction during ramp: 50-70% of normal
    // More reduction for steeper angles
    const feedReduction = 0.5 + (1 - rampAngle / 15) * 0.2;
    const fzRamp = fzNormal * feedReduction;
    const rampFeed = fzRamp * z * rpm;
    const normalFeed = fzNormal * z * rpm;

    // Number of ramp passes (if depth exceeds single ramp)
    const maxDepthPerPass = D * 0.5;
    const numPasses = Math.ceil(depth / maxDepthPerPass);
    const depthPerPass = depth / numPasses;

    // Cycle time for ramping portion
    const totalRampDist = rampLength * numPasses;
    const cycleTime = rampFeed > 0
      ? totalRampDist / rampFeed
      : 0;

    // Warnings
    if (rampAngle > 5 && z <= 2) {
      warnings.push(
        "Steep ramp with 2-flute tool — " +
        "reduce angle or use 3+ flute cutter"
      );
    }
    if (slotW < D * 1.05) {
      warnings.push(
        "Slot width ≈ tool diameter — " +
        "full-width ramping, high radial load"
      );
    }
    if (depth > D * 3) {
      warnings.push(
        "Deep ramp entry — consider helical ramp instead"
      );
    }

    return {
      ramp_angle: av(r1(rampAngle), "deg", 0.05,
        "Max angle for flute count"),
      ramp_length: av(r1(rampLength), "mm", 0.1,
        "depth / tan(angle)"),
      ramp_feed: av(Math.round(rampFeed), "mm/min", 0.1,
        "fz_ramp × z × RPM"),
      normal_feed: av(Math.round(normalFeed), "mm/min", 0.1,
        "fz × z × RPM"),
      feed_reduction: av(
        Math.round(feedReduction * 100), "%", 0.05,
        "Reduced for center-cutting conditions"
      ),
      cutting_speed: av(vc, "m/min", 0.1,
        "Ramp speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D)"),
      num_ramp_passes: av(numPasses, "passes", 0,
        "depth / max_depth_per_pass"),
      depth_per_pass: av(r2(depthPerPass), "mm", 0.05,
        "depth / num_passes"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "ramp_dist / ramp_feed"),
      warnings,
    };
  }

  /**
   * Calculate helical ramp entry parameters.
   */
  helicalRamp(input: HelicalRampInput): HelicalRampResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.tool_diameter_mm;
    const z = input.num_flutes ?? 4;
    const pocketDia = input.pocket_diameter_mm;
    const depth = input.target_depth_mm;

    // Helix diameter = pocket diameter - tool diameter
    // Tool center traces this circle
    const helixDia = pocketDia - D;
    if (helixDia <= 0) {
      warnings.push(
        "Pocket too small for helical ramp — " +
        "use linear ramp or drill entry"
      );
    }
    const effectiveHelixDia = Math.max(helixDia, D * 0.2);

    // Ramp angle
    const maxAngle = input.max_ramp_angle_deg
      ?? defaultMaxAngle(z);
    const rampAngle = Math.min(maxAngle, 10);

    // Pitch per revolution
    const helixCircumference = Math.PI * effectiveHelixDia;
    const angleRad = (rampAngle * Math.PI) / 180;
    const pitchPerRev = helixCircumference * Math.tan(angleRad);

    // Number of revolutions
    const numRevs = pitchPerRev > 0
      ? Math.ceil(depth / pitchPerRev)
      : 1;

    // Speed and feed
    const vc = RAMP_SPEEDS[iso] ?? 150;
    const rpm = (vc * 1000) / (Math.PI * D);
    const fzNormal = NORMAL_FZ[iso] ?? 0.10;
    const fzRamp = fzNormal * 0.6; // 60% for helical
    const rampFeed = fzRamp * z * rpm;

    // Radial engagement (ae) = (pocket_dia - helix_dia) / 2 = D/2
    const ae = D / 2;
    const radialEngagement = (ae / D) * 100;

    // Cycle time: total helix path length / feed
    const totalPath = helixCircumference * numRevs;
    const cycleTime = rampFeed > 0 ? totalPath / rampFeed : 0;

    if (pocketDia < D * 1.5) {
      warnings.push(
        "Tight pocket — limited helix diameter, " +
        "high radial engagement"
      );
    }
    if (depth > D * 5) {
      warnings.push(
        "Very deep helical ramp — " +
        "verify tool stickout and deflection"
      );
    }

    return {
      helix_diameter: av(r2(effectiveHelixDia), "mm", 0.05,
        "pocket_dia - tool_dia"),
      ramp_angle: av(r1(rampAngle), "deg", 0.05,
        "Max angle for flute count"),
      pitch_per_revolution: av(r3(pitchPerRev), "mm", 0.1,
        "helix_circumference × tan(angle)"),
      num_revolutions: av(numRevs, "rev", 0,
        "depth / pitch_per_rev"),
      ramp_feed: av(Math.round(rampFeed), "mm/min", 0.1,
        "60% of normal feed"),
      cutting_speed: av(vc, "m/min", 0.1,
        "Ramp speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D)"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "helix_path / ramp_feed"),
      radial_engagement: av(
        r1(radialEngagement), "%", 0.05,
        "ae / D × 100"
      ),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const rampingEngine = new RampingEngine();
