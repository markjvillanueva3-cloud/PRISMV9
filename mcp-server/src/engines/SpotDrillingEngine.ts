/**
 * SpotDrillingEngine — Spot Drill / Center Drill Calculator
 *
 * Calculates spot drilling parameters:
 * - Spot depth for desired countersink diameter
 * - Point angle matching between spot and twist drill
 * - Feed/speed for spot drills and center drills
 * - Dwell time for clean surface
 * - Centering accuracy vs point angle mismatch
 *
 * Key physics: The spot drill creates a conical surface that
 * guides the subsequent twist drill. If the spot angle is
 * smaller than the drill point angle, the drill walks on
 * a ring contact. If larger, the drill self-centers at the
 * point. Best practice: spot angle ≤ drill point angle.
 * Depth = (diameter / 2) / tan(angle/2).
 *
 * Reference: Machinery's Handbook Ch.27 (Drilling),
 *            Guhring Spot Drill Application Guide,
 *            DIN 333 (Center drills)
 *
 * Actions: spot_drilling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpotDrillingInput {
  spot_drill_diameter_mm: number;
  spot_drill_angle_deg?: number;
  subsequent_drill_diameter_mm?: number;
  subsequent_drill_angle_deg?: number;
  desired_spot_diameter_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  tool_type?: "spot_drill" | "center_drill" | "chamfer_mill";
  flutes?: number;
}

export interface SpotDrillingResult {
  spot_depth: AtomicValue;
  spot_surface_diameter: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  feed_per_rev: AtomicValue;
  dwell_time: AtomicValue;
  angle_match: AtomicValue;
  centering_quality: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 60,
  aluminum: 150,
  titanium: 25,
  stainless: 40,
  cast_iron: 50,
  brass: 80,
};

const DEFAULT_FR: Record<string, number> = {
  steel: 0.08,
  aluminum: 0.12,
  titanium: 0.05,
  stainless: 0.06,
  cast_iron: 0.10,
  brass: 0.10,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SpotDrillingEngine {
  calculate(input: SpotDrillingInput): SpotDrillingResult {
    const warnings: string[] = [];
    const Ds = input.spot_drill_diameter_mm;
    const spotAngle = input.spot_drill_angle_deg ?? 90;
    const mat = input.material_type ?? "steel";
    const toolType = input.tool_type ?? "spot_drill";
    const flutes = input.flutes
      ?? (toolType === "center_drill" ? 2 : 4);

    const drillDia = input.subsequent_drill_diameter_mm;
    const drillAngle = input.subsequent_drill_angle_deg ?? 118;

    // Desired spot diameter: default to drill diameter or 2/3 of spot drill
    const desiredDia = input.desired_spot_diameter_mm
      ?? (drillDia ? Math.min(drillDia, Ds * 0.8) : Ds * 0.67);

    // Spot depth from geometry: d = (D/2) / tan(angle/2)
    const halfAngleRad = ((spotAngle / 2) * Math.PI) / 180;
    const spotDepth = (desiredDia / 2) / Math.tan(halfAngleRad);

    // Actual surface diameter at that depth
    const surfaceDia = 2 * spotDepth * Math.tan(halfAngleRad);

    // Validate spot drill is large enough
    if (desiredDia > Ds) {
      warnings.push(
        `Desired spot ${r2(desiredDia)}mm > spot drill ` +
        `${Ds}mm — increase tool size`
      );
    }

    // Angle matching check
    let angleMatch = 0; // 0=bad, 1=ok, 2=ideal
    let centeringQuality = 0;
    if (drillDia) {
      const angleDiff = spotAngle - drillAngle;
      if (angleDiff < -5) {
        // Spot angle much smaller — ring contact, drill walks
        angleMatch = 0;
        centeringQuality = 30;
        warnings.push(
          `Spot angle ${spotAngle}° < drill angle ` +
          `${drillAngle}° — drill may walk on ring contact`
        );
      } else if (angleDiff <= 5) {
        // Close match
        angleMatch = 1;
        centeringQuality = 80;
      } else {
        // Spot angle larger — drill self-centers at point
        angleMatch = 2;
        centeringQuality = 95;
      }

      // Check spot diameter vs drill diameter
      if (desiredDia > drillDia * 1.2) {
        warnings.push(
          "Spot diameter > 120% of drill — unnecessarily large"
        );
        centeringQuality = Math.min(centeringQuality, 70);
      }
      if (desiredDia < drillDia * 0.5) {
        warnings.push(
          "Spot diameter < 50% of drill — may not fully guide"
        );
        centeringQuality = Math.min(centeringQuality, 60);
      }
    } else {
      angleMatch = 1;
      centeringQuality = 75;
    }

    // Cutting parameters — use effective diameter (2/3 of spot dia)
    const Deff = desiredDia * 0.67;
    const Vc = DEFAULT_VC[mat] ?? 60;
    const rpm = r0((Vc * 1000) / (Math.PI * Math.max(Deff, 3)));
    const fr = DEFAULT_FR[mat] ?? 0.08;
    const feedRate = r1(fr * rpm);

    // Dwell for clean surface (0.5-1.5 revolutions)
    const dwellRevs = mat === "aluminum" ? 0.5
      : mat === "stainless" || mat === "titanium" ? 1.5 : 1.0;
    const dwellTime = rpm > 0 ? r3((dwellRevs / rpm) * 60) : 0.1;

    // Center drill specific warnings
    if (toolType === "center_drill" && desiredDia > 6) {
      warnings.push(
        "Center drills are fragile — use spot drill for " +
        "diameters > 6mm"
      );
    }

    return {
      spot_depth: av(r3(spotDepth), "mm", 0.02,
        `(${r2(desiredDia)}/2) / tan(${spotAngle / 2}°)`),
      spot_surface_diameter: av(r2(surfaceDia), "mm", 0.02,
        "2 × depth × tan(half_angle)"),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Deff=${r2(Deff)}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fr=${fr} mm/rev × ${rpm} rpm`),
      feed_per_rev: av(fr, "mm/rev", 0.01,
        `${mat} default`),
      dwell_time: av(dwellTime, "sec", 0.05,
        `${dwellRevs} revolutions at bottom`),
      angle_match: av(angleMatch, "score", 0,
        angleMatch === 2 ? "Ideal: spot > drill angle"
          : angleMatch === 1 ? "OK: angles close"
          : "Poor: spot < drill angle"),
      centering_quality: av(centeringQuality, "%", 5,
        "Based on angle match and diameter ratio"),
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

export const spotDrillingEngine = new SpotDrillingEngine();
