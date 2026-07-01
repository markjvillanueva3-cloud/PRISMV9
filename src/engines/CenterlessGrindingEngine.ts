/**
 * CenterlessGrindingEngine — Centerless Grinding Calculator
 *
 * Calculates centerless grinding parameters:
 * - Work rest blade height and angle
 * - Regulating wheel speed and angle for feed
 * - Grinding wheel speed at contact
 * - Through-feed and infeed modes
 * - Rounding error from center height
 * - Production rate estimation
 *
 * Key physics: The workpiece is supported between the
 * grinding wheel, regulating wheel, and work rest blade.
 * Center height above the grinding/regulating wheel
 * centerline determines rounding. The through-feed rate
 * = π×d×Nr×sin(α) where Nr = regulating RPM, α = reg
 * wheel inclination angle. Too high → chatter, too low
 * → lobing.
 *
 * Reference: Machinery's Handbook Ch.31 (Grinding),
 *            Cincinnati Centerless Grinding Guide,
 *            Studer Schaudt Application Notes
 *
 * Actions: centerless_grinding_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CenterlessGrindingInput {
  workpiece_diameter_mm: number;
  grinding_wheel_diameter_mm?: number;
  regulating_wheel_diameter_mm?: number;
  grinding_wheel_speed_mps?: number;
  regulating_wheel_rpm?: number;
  inclination_angle_deg?: number;
  mode?: "through_feed" | "infeed" | "end_feed";
  stock_removal_mm?: number;
  part_length_mm?: number;
  material_type?: "steel" | "aluminum" | "stainless"
    | "titanium" | "cast_iron";
}

export interface CenterlessGrindingResult {
  center_height: AtomicValue;
  work_rest_blade_angle: AtomicValue;
  grinding_wheel_rpm: AtomicValue;
  regulating_wheel_surface_speed: AtomicValue;
  workpiece_rpm: AtomicValue;
  through_feed_rate: AtomicValue;
  infeed_rate: AtomicValue;
  rounding_error: AtomicValue;
  production_rate: AtomicValue;
  contact_arc_length: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class CenterlessGrindingEngine {
  calculate(input: CenterlessGrindingInput): CenterlessGrindingResult {
    const warnings: string[] = [];
    const dw = input.workpiece_diameter_mm;
    const Dg = input.grinding_wheel_diameter_mm ?? 500;
    const Dr = input.regulating_wheel_diameter_mm ?? 300;
    const Vs = input.grinding_wheel_speed_mps ?? 30;
    const Nr = input.regulating_wheel_rpm ?? 30;
    const alpha = input.inclination_angle_deg ?? 3;
    const mode = input.mode ?? "through_feed";
    const stock = input.stock_removal_mm ?? 0.2;
    const partLen = input.part_length_mm ?? 50;
    const mat = input.material_type ?? "steel";

    // Center height: h = (D_g + D_r + 2×d_w) × d_w / (2×(D_g + D_r + 2×d_w))
    // Simplified: typically 10-15mm above center for small parts
    // Rule of thumb: h ≈ d_w/2 × 0.5 (half the workpiece radius)
    const centerHeight = dw * 0.25;
    // More precise: based on wheel geometry
    const hOptimal = Math.sqrt(
      dw * (Dg + Dr) / (2 * (Dg + Dr + 2 * dw))
    ) * dw * 0.5;

    // Work rest blade angle: typically 30° for through-feed, 0° for infeed
    const bladeAngle = mode === "through_feed" ? 30
      : mode === "infeed" ? 0 : 15;

    // Grinding wheel RPM from surface speed
    const gwRpm = r0((Vs * 1000 * 60) / (Math.PI * Dg));

    // Regulating wheel surface speed (m/min)
    const rwSpeed = (Math.PI * Dr * Nr) / 1000;

    // Workpiece RPM (driven by regulating wheel contact)
    const wpRpm = r0((rwSpeed * 1000) / (Math.PI * dw));

    // Through-feed rate: V_feed = π × d_w × N_r × sin(α)
    const alphaRad = (alpha * Math.PI) / 180;
    const throughFeed = Math.PI * dw * Nr * Math.sin(alphaRad)
      / 1000; // mm/min → m/min conversion
    const throughFeedMmMin = Math.PI * dw * Nr * Math.sin(alphaRad);

    // Infeed rate (for plunge mode)
    const infeedRate = stock / (wpRpm > 0 ? 60 / wpRpm * 5 : 1);

    // Rounding error estimation
    // Lobing occurs when center height ratio creates harmonic
    // errors. Odd-lobe count from h/R ratio.
    const hRatio = centerHeight / (dw / 2);
    const roundingError = hRatio > 0.6 ? 0.005
      : hRatio > 0.3 ? 0.002 : 0.001;

    // Contact arc length with grinding wheel
    const contactArc = Math.sqrt(dw * stock);

    // Production rate
    let prodRate: number;
    if (mode === "through_feed") {
      // parts/min based on through-feed speed and part length
      prodRate = throughFeedMmMin > 0
        ? throughFeedMmMin / (partLen + 5) // 5mm gap between parts
        : 0;
    } else {
      // Infeed: cycle time = spark-in + grind + spark-out
      const grindTime = stock / (infeedRate > 0 ? infeedRate : 0.01);
      const sparkOut = 3; // seconds
      const cycleTime = grindTime + sparkOut + 2; // +2 load/unload
      prodRate = 60 / cycleTime;
    }

    // Warnings
    if (Vs > 45) {
      warnings.push(
        `Grinding speed ${Vs} m/s exceeds typical limit — ` +
        "verify wheel rating"
      );
    }
    if (Vs < 20) {
      warnings.push(
        "Low grinding speed — poor surface finish"
      );
    }
    if (alpha > 6 && mode === "through_feed") {
      warnings.push(
        `High inclination ${alpha}° — risk of spiral marks`
      );
    }
    if (dw < 3) {
      warnings.push(
        "Very small workpiece — deflection and stability concerns"
      );
    }
    if (stock > dw * 0.05) {
      warnings.push(
        "Stock removal > 5% of diameter — use rough and finish passes"
      );
    }
    if (mat === "titanium" || mat === "stainless") {
      warnings.push(
        `${mat} — use open-structure wheel to prevent loading`
      );
    }

    return {
      center_height: av(r2(Math.max(centerHeight, hOptimal)),
        "mm", 0.5,
        "Above wheel centerline"),
      work_rest_blade_angle: av(bladeAngle, "deg", 0,
        mode === "through_feed"
          ? "30° for through-feed"
          : "0° for infeed"),
      grinding_wheel_rpm: av(gwRpm, "rpm", 5,
        `Vs=${Vs}m/s at Ø${Dg}mm`),
      regulating_wheel_surface_speed: av(r2(rwSpeed), "m/min",
        0.1, `π×${Dr}×${Nr}/1000`),
      workpiece_rpm: av(wpRpm, "rpm", 5,
        "From regulating wheel contact"),
      through_feed_rate: av(r1(throughFeedMmMin), "mm/min", 5,
        `π×${dw}×${Nr}×sin(${alpha}°)`),
      infeed_rate: av(r4(infeedRate), "mm/s", 0.001,
        "Stock / (revolutions × time)"),
      rounding_error: av(r4(roundingError), "mm", 0.001,
        `Center height ratio ${r2(hRatio)}`),
      production_rate: av(r1(prodRate), "parts/min", 0.5,
        mode === "through_feed"
          ? "Feed rate / (part length + gap)"
          : "60 / cycle_time"),
      contact_arc_length: av(r3(contactArc), "mm", 0.1,
        "√(d × stock)"),
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

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const centerlessGrindingEngine = new CenterlessGrindingEngine();
