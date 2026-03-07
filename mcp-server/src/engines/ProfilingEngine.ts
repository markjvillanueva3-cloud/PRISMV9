/**
 * ProfilingEngine — 2D/3D Profile Milling Calculator
 *
 * Calculates profile milling parameters:
 * - Radial engagement and stepdown from wall height
 * - Climb vs conventional milling selection
 * - Cutter compensation direction and value
 * - Corner slowdown for sharp internal corners
 * - Wall deflection estimation
 * - Multiple finish passes for thin walls
 *
 * Key physics: In profile (contour) milling the radial
 * engagement is typically light (5-15% of tool dia) for
 * finishing. Thin walls deflect under cutting force —
 * the deflection is proportional to force × L³ / (E × I).
 * Sharp internal corners cause tool engagement spikes,
 * requiring feed reduction or smaller radius.
 *
 * Reference: Sandvik Profile Milling Guide,
 *            Machinery's Handbook Ch.28 (Milling),
 *            Haas Application Notes (Wall Milling)
 *
 * Actions: profile_milling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ProfilingInput {
  wall_height_mm: number;
  wall_thickness_mm?: number;
  tool_diameter_mm: number;
  flutes?: number;
  radial_depth_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  cutting_speed_mpm?: number;
  feed_per_tooth_mm?: number;
  finishing?: boolean;
  min_corner_radius_mm?: number;
  profile_length_mm?: number;
}

export interface ProfilingResult {
  radial_depth: AtomicValue;
  axial_depth: AtomicValue;
  number_of_stepdowns: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  milling_direction: AtomicValue;
  cutter_comp: AtomicValue;
  corner_feed_reduction: AtomicValue;
  wall_deflection: AtomicValue;
  finish_passes: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 120,
  aluminum: 300,
  titanium: 50,
  stainless: 80,
  cast_iron: 100,
};

const DEFAULT_FZ: Record<string, number> = {
  steel: 0.08,
  aluminum: 0.12,
  titanium: 0.05,
  stainless: 0.06,
  cast_iron: 0.10,
};

/** Young's modulus (GPa) */
const YOUNGS_MOD: Record<string, number> = {
  steel: 200,
  aluminum: 70,
  titanium: 114,
  stainless: 193,
  cast_iron: 170,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ProfilingEngine {
  calculate(input: ProfilingInput): ProfilingResult {
    const warnings: string[] = [];
    const H = input.wall_height_mm;
    const Dt = input.tool_diameter_mm;
    const mat = input.material_type ?? "steel";
    const finishing = input.finishing ?? false;
    const flutes = input.flutes ?? 4;
    const wallThick = input.wall_thickness_mm;
    const profileLen = input.profile_length_mm ?? 100;

    // Radial depth
    const ae = input.radial_depth_mm
      ?? (finishing ? Dt * 0.05 : Dt * 0.15);

    // Axial depth (stepdown): full flute for rough, limited for finish
    const ap = finishing
      ? Math.min(H, Dt * 1.0)
      : Math.min(H, Dt * 1.5);
    const nSteps = Math.ceil(H / ap);

    // Cutting speed and RPM
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 120;
    const rpm = r0((Vc * 1000) / (Math.PI * Dt));

    // Feed per tooth
    const baseFz = input.feed_per_tooth_mm ?? DEFAULT_FZ[mat] ?? 0.08;
    const feedRate = r1(baseFz * flutes * rpm);

    // Milling direction: climb preferred for CNC
    const direction = "climb";

    // Cutter compensation: tool radius
    const compValue = Dt / 2;

    // Corner feed reduction: engagement jumps at sharp corners
    const minCornerR = input.min_corner_radius_mm ?? Dt * 0.6;
    let cornerReduction = 1.0;
    if (minCornerR < Dt * 0.5) {
      // Sharp corner — engagement can jump to 180°
      cornerReduction = 0.5;
      warnings.push(
        `Corner radius ${r2(minCornerR)}mm < 50% tool dia — ` +
        "50% feed reduction at corners"
      );
    } else if (minCornerR < Dt * 0.75) {
      cornerReduction = 0.7;
    }

    // Wall deflection estimation (cantilever beam model)
    let wallDeflection = 0;
    let finishPasses = finishing ? 1 : 0;
    if (wallThick && wallThick > 0) {
      const E = (YOUNGS_MOD[mat] ?? 200) * 1000; // MPa
      // Simplified cutting force: Kc × ae × ap × fz
      const Kc = mat === "aluminum" ? 800
        : mat === "titanium" ? 1800 : 1500; // N/mm²
      const force = Kc * ae * Math.min(ap, 5) * baseFz;
      // Cantilever: δ = F × L³ / (3 × E × I)
      // I = (t³ × w) / 12, approximate w = 1mm unit strip
      const I = (Math.pow(wallThick, 3) * 1) / 12;
      wallDeflection = (force * Math.pow(H, 3))
        / (3 * E * I);

      if (wallDeflection > 0.05) {
        warnings.push(
          `Wall deflection ~${r3(wallDeflection)}mm — ` +
          "consider spring passes or support"
        );
        finishPasses = Math.max(finishPasses, 2);
      }
      if (wallDeflection > 0.2) {
        warnings.push(
          "Severe wall deflection — reduce DOC, use backing, " +
          "or wax fill"
        );
        finishPasses = 3;
      }
      if (wallThick < 1 && H > wallThick * 10) {
        warnings.push(
          "Thin wall (thickness:height > 1:10) — " +
          "high risk of chatter and breakage"
        );
      }
    }

    // Cycle time: stepdowns × profile length / feed
    const totalPath = nSteps * profileLen * (1 + finishPasses);
    const cycleTime = feedRate > 0 ? totalPath / feedRate : 0;

    return {
      radial_depth: av(r3(ae), "mm", 0.05,
        finishing ? "5% of Dt (finish)" : "15% of Dt (rough)"),
      axial_depth: av(r2(ap), "mm", 0.1,
        finishing ? "1.0×Dt max" : "1.5×Dt max"),
      number_of_stepdowns: av(nSteps, "steps", 0,
        `${H}mm / ${r2(ap)}mm`),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Ø${Dt}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fz=${baseFz} × ${flutes}fl × ${rpm}rpm`),
      milling_direction: av(1, direction, 0,
        "Climb milling preferred for CNC"),
      cutter_comp: av(r3(compValue), "mm", 0.001,
        "Tool radius for G41/G42"),
      corner_feed_reduction: av(
        r0(cornerReduction * 100), "%", 0,
        cornerReduction < 1
          ? `Reduced for R${r2(minCornerR)}mm corners`
          : "No reduction needed"),
      wall_deflection: av(r3(wallDeflection), "mm", 0.01,
        wallThick
          ? `Cantilever: F×H³/(3EI), t=${wallThick}mm`
          : "No wall thickness specified"),
      finish_passes: av(finishPasses, "passes", 0,
        finishPasses > 1
          ? "Multiple passes for deflection compensation"
          : finishing ? "Single finish pass" : "Roughing — no finish pass"),
      cycle_time: av(r2(cycleTime), "min", 0.1,
        `${nSteps} steps × ${profileLen}mm × ` +
        `${1 + finishPasses} passes`),
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

export const profilingEngine = new ProfilingEngine();
