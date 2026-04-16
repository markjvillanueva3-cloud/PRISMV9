/**
 * WaterjetEngine — Abrasive Waterjet Cutting Calculations
 *
 * Calculates parameters for waterjet cutting:
 * - Pump pressure and flow rate
 * - Abrasive flow rate by material
 * - Cutting speed by thickness and quality
 * - Kerf width estimation
 * - Taper and surface finish prediction
 * - Pierce time for starting holes
 *
 * Key physics: Waterjet cutting uses ultra-high pressure
 * water (2000-6000 bar) mixed with abrasive garnet to
 * erode material. Cutting speed is inversely proportional
 * to thickness² and proportional to pressure. Taper
 * increases at higher speeds. Quality grades Q1-Q5 trade
 * speed for edge finish.
 *
 * Reference: OMAX waterjet cutting calculator,
 *            Flow International cutting models,
 *            Hashish "Waterjet machining model" 1989
 *
 * Actions: waterjet_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface WaterjetInput {
  material_thickness_mm: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "glass" | "stone" | "composite";
  quality_grade?: 1 | 2 | 3 | 4 | 5; // Q1=fast, Q5=fine
  pump_pressure_bar?: number;
  orifice_diameter_mm?: number;
  nozzle_diameter_mm?: number;
}

export interface WaterjetResult {
  cutting_speed: AtomicValue;
  pump_pressure: AtomicValue;
  water_flow_rate: AtomicValue;
  abrasive_flow_rate: AtomicValue;
  kerf_width: AtomicValue;
  taper_angle: AtomicValue;
  predicted_ra: AtomicValue;
  pierce_time: AtomicValue;
  cost_per_meter: AtomicValue;
  quality_grade: number;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Machinability index (relative to mild steel = 100) */
const MACHINABILITY: Record<string, number> = {
  steel: 100,
  aluminum: 250,
  titanium: 45,
  stainless: 70,
  glass: 200,
  stone: 180,
  composite: 150,
};

/** Ra (µm) by quality grade */
const RA_BY_QUALITY: Record<number, number> = {
  1: 25, 2: 12.5, 3: 6.3, 4: 3.2, 5: 1.6,
};

/** Speed factor by quality grade (relative to Q3) */
const SPEED_FACTOR: Record<number, number> = {
  1: 3.0, 2: 1.8, 3: 1.0, 4: 0.5, 5: 0.2,
};

// ── Engine ─────────────────────────────────────────────────────────

export class WaterjetEngine {
  /**
   * Calculate waterjet cutting parameters.
   */
  calculate(input: WaterjetInput): WaterjetResult {
    const warnings: string[] = [];
    const t = input.material_thickness_mm;
    const mat = input.material_type ?? "steel";
    const Q = input.quality_grade ?? 3;
    const pressure = input.pump_pressure_bar ?? 4000;
    const orifice = input.orifice_diameter_mm ?? 0.35;
    const nozzle = input.nozzle_diameter_mm ?? 1.02;

    // Machinability factor
    const machinability = (MACHINABILITY[mat] ?? 100) / 100;

    // Base cutting speed (mm/min) for 25mm steel at Q3, 4000 bar
    // Empirical: ~150 mm/min baseline
    const baseSpeed = 150;

    // Speed = base × machinability × (25/t)^1.3 × quality × (P/4000)^0.6
    const thicknessFactor = Math.pow(25 / Math.max(t, 1), 1.3);
    const qualityFactor = SPEED_FACTOR[Q] ?? 1.0;
    const pressureFactor = Math.pow(pressure / 4000, 0.6);

    const cuttingSpeed = baseSpeed
      * machinability
      * thicknessFactor
      * qualityFactor
      * pressureFactor;

    // Water flow rate (L/min)
    // Q_water = Cd × A × √(2P/ρ) — simplified
    const areaOrifice = Math.PI * Math.pow(orifice / 2, 2);
    const pressurePa = pressure * 1e5;
    const waterFlow = 0.65 * areaOrifice
      * Math.sqrt(2 * pressurePa / 1000) * 60; // L/min

    // Abrasive flow rate: typically 200-500 g/min
    const abrasiveFlow = t > 50
      ? 500
      : Math.max(200, Math.round(200 + t * 4));

    // Kerf width ≈ nozzle diameter + 0.1-0.2mm
    const kerfWidth = nozzle + 0.15;

    // Taper angle (degrees) — increases with speed
    // Minimal at Q5, significant at Q1
    const taperDeg = Q <= 2 ? 0.5 : (Q <= 3 ? 0.2 : 0.05);

    // Surface finish
    const ra = RA_BY_QUALITY[Q] ?? 6.3;

    // Pierce time (seconds)
    // Proportional to thickness, inversely to pressure
    const pierceTime = t < 5
      ? 1
      : Math.round(t * 0.3 * (4000 / pressure));

    // Cost per meter (simplified: $/m)
    // Abrasive cost dominates: ~$0.30/kg garnet
    const abrasiveKgPerMin = abrasiveFlow / 1000;
    const metersPerMin = cuttingSpeed / 1000;
    const abrasiveCostPerM = metersPerMin > 0
      ? (abrasiveKgPerMin * 0.30) / metersPerMin
      : 0;
    // Add water + power + depreciation overhead ~$1/min
    const overheadPerM = metersPerMin > 0
      ? 1.0 / metersPerMin
      : 0;
    const costPerMeter = abrasiveCostPerM + overheadPerM;

    // Warnings
    if (t > 200) {
      warnings.push(
        "Thickness > 200mm — very slow cutting, " +
        "verify jet coherence"
      );
    }
    if (t > 150 && Q >= 4) {
      warnings.push(
        "Thick material + high quality — " +
        "extremely slow, consider alternative process"
      );
    }
    if (pressure < 2500) {
      warnings.push(
        "Low pump pressure — cutting speed significantly reduced"
      );
    }
    if (mat === "composite") {
      warnings.push(
        "Composite material — verify delamination risk, " +
        "reduce pressure if needed"
      );
    }
    if (mat === "titanium" && t > 50) {
      warnings.push(
        "Thick titanium — very slow, " +
        "consider wire EDM as alternative"
      );
    }

    return {
      cutting_speed: av(r1(cuttingSpeed), "mm/min", 0.2,
        "Hashish model: base×M×T×Q×P factors"),
      pump_pressure: av(pressure, "bar", 0.05,
        "Pump operating pressure"),
      water_flow_rate: av(r2(waterFlow), "L/min", 0.1,
        "Cd × A × √(2P/ρ)"),
      abrasive_flow_rate: av(abrasiveFlow, "g/min", 0.1,
        "Based on material thickness"),
      kerf_width: av(r2(kerfWidth), "mm", 0.05,
        "nozzle_dia + 0.15"),
      taper_angle: av(taperDeg, "deg", 0.2,
        "Quality-dependent taper"),
      predicted_ra: av(ra, "µm", 0.15,
        "By quality grade Q" + Q),
      pierce_time: av(pierceTime, "s", 0.2,
        "thickness × 0.3 × P_factor"),
      cost_per_meter: av(r2(costPerMeter), "$/m", 0.25,
        "abrasive + overhead"),
      quality_grade: Q,
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

export const waterjetEngine = new WaterjetEngine();
