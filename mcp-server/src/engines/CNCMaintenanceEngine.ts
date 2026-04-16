/**
 * CNCMaintenanceEngine — Preventive Maintenance Schedule Calculator
 *
 * Calculates CNC machine maintenance intervals:
 * - Spindle grease/oil change interval
 * - Way lube consumption and refill
 * - Coolant change schedule (pH/concentration decay)
 * - Filter replacement timing
 * - Axis backlash check interval
 * - Annual maintenance cost estimate
 *
 * Key physics: Bearing grease life halves for every 15°C above
 * 70°C base. Coolant pH drops ~0.5 per month without management.
 * Way oil consumption ∝ axis travel distance. Filter differential
 * pressure indicates clogging.
 *
 * Reference: Haas maintenance schedule,
 *            SKF relubrication guide,
 *            Blaser coolant management handbook
 *
 * Actions: cnc_maintenance_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CNCMaintenanceInput {
  machine_hours_per_month?: number;
  spindle_rpm_avg?: number;
  spindle_type?: "belt" | "gear" | "direct" | "integral";
  coolant_type?: "synthetic" | "semi_synthetic" | "soluble_oil";
  coolant_volume_liters?: number;
  ambient_temp_c?: number;
  machine_age_years?: number;
  axes?: number;
  axis_travel_km_per_month?: number;
  has_chip_conveyor?: boolean;
  machine_rate_per_hour?: number;
}

export interface CNCMaintenanceResult {
  spindle_lube_interval: AtomicValue;
  way_lube_consumption: AtomicValue;
  coolant_change_interval: AtomicValue;
  filter_change_interval: AtomicValue;
  backlash_check_interval: AtomicValue;
  annual_maintenance_hours: AtomicValue;
  annual_maintenance_cost: AtomicValue;
  downtime_risk_score: AtomicValue;
  next_major_service: AtomicValue;
  pm_roi: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Base spindle grease interval (hours) by type */
const SPINDLE_LUBE_BASE: Record<string, number> = {
  belt: 2000,
  gear: 1500,
  direct: 5000,   // sealed, longer interval
  integral: 8000, // sealed bearing
};

/** Coolant life (months) by type */
const COOLANT_LIFE: Record<string, number> = {
  synthetic: 12,
  semi_synthetic: 6,
  soluble_oil: 4,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CNCMaintenanceEngine {
  calculate(input: CNCMaintenanceInput): CNCMaintenanceResult {
    const warnings: string[] = [];
    const hrsMonth = input.machine_hours_per_month ?? 200;
    const avgRpm = input.spindle_rpm_avg ?? 6000;
    const sType = input.spindle_type ?? "belt";
    const coolType = input.coolant_type ?? "semi_synthetic";
    const coolVol = input.coolant_volume_liters ?? 200;
    const ambTemp = input.ambient_temp_c ?? 22;
    const age = input.machine_age_years ?? 5;
    const nAxes = input.axes ?? 3;
    const travelKm = input.axis_travel_km_per_month ?? 50;
    const hasConveyor = input.has_chip_conveyor ?? true;
    const machRate = input.machine_rate_per_hour ?? 85;

    // Spindle lubrication interval
    let spindleLubeHrs = SPINDLE_LUBE_BASE[sType] ?? 2000;
    // Derate for high RPM (above 10000, reduce by 20%)
    if (avgRpm > 10000) spindleLubeHrs *= 0.8;
    if (avgRpm > 15000) spindleLubeHrs *= 0.8;
    // Derate for high ambient
    if (ambTemp > 30) spindleLubeHrs *= 0.85;
    // Age factor
    if (age > 10) spindleLubeHrs *= 0.8;

    // Way lube consumption (liters/month)
    // ~0.5L per 100km of axis travel
    const wayLubePerMonth = travelKm * 0.005 * nAxes;

    // Coolant change interval
    let coolantMonths = COOLANT_LIFE[coolType] ?? 6;
    if (ambTemp > 28) coolantMonths *= 0.7;
    if (!hasConveyor) coolantMonths *= 0.8; // more contamination
    if (age > 8) coolantMonths *= 0.85;

    // Filter change interval (hours)
    const filterHrs = hasConveyor ? 500 : 300;

    // Backlash check interval (months)
    let backlashMonths = 6;
    if (age > 7) backlashMonths = 3;
    if (age > 12) backlashMonths = 2;

    // Annual maintenance hours
    const spindleServicesYear = (hrsMonth * 12) / spindleLubeHrs;
    const coolantChangesYear = 12 / coolantMonths;
    const filterChangesYear = (hrsMonth * 12) / filterHrs;
    const backlashChecksYear = 12 / backlashMonths;

    const annualPmHours =
      spindleServicesYear * 2 +     // 2hr per spindle service
      coolantChangesYear * 4 +       // 4hr per coolant change
      filterChangesYear * 0.5 +      // 30min per filter
      backlashChecksYear * 1 +       // 1hr per backlash check
      12;                            // 12hr annual (way covers, wipers, etc)

    // Annual cost
    const laborCost = annualPmHours * 45; // $45/hr maintenance labor
    const partsCost = annualPmHours * 30; // $30/hr avg parts
    const downtimeCost = annualPmHours * machRate;
    const annualCost = laborCost + partsCost + downtimeCost;

    // Downtime risk score (0-100)
    let riskScore = 20; // baseline
    if (age > 10) riskScore += 20;
    if (age > 15) riskScore += 15;
    if (hrsMonth > 300) riskScore += 10;
    if (avgRpm > 12000) riskScore += 10;
    if (!hasConveyor) riskScore += 5;
    riskScore = Math.min(riskScore, 100);

    // Next major service (hours until)
    const spindleLubeRemaining = spindleLubeHrs -
      (hrsMonth % spindleLubeHrs);

    // PM ROI (estimated savings from avoided breakdowns)
    // Rule of thumb: $1 PM saves $5-10 in reactive maintenance
    const pmRoi = 600; // % typical

    // Warnings
    if (age > 10 && backlashMonths > 3) {
      warnings.push(
        `Machine age ${age}yr — increase backlash check frequency`
      );
    }
    if (coolantMonths < 3) {
      warnings.push(
        "Coolant life <3 months — consider upgrading to synthetic"
      );
    }
    if (riskScore > 60) {
      warnings.push(
        `Downtime risk score ${riskScore}/100 — ` +
        "schedule comprehensive PM soon"
      );
    }
    if (hrsMonth > 400) {
      warnings.push(
        `High utilization ${hrsMonth}hr/month — ` +
        "shorten PM intervals by 20%"
      );
    }
    if (annualCost > 20000) {
      warnings.push(
        `Annual maintenance $${r0(annualCost)} — ` +
        "evaluate rebuild vs replacement"
      );
    }

    return {
      spindle_lube_interval: mkAv(r0(spindleLubeHrs), "hours", 50,
        `${sType}, ${avgRpm} avg RPM`),
      way_lube_consumption: mkAv(r1(wayLubePerMonth), "L/month", 0.2,
        `${travelKm}km × ${nAxes} axes`),
      coolant_change_interval: mkAv(r1(coolantMonths), "months", 0.5,
        `${coolType}, ${ambTemp}°C`),
      filter_change_interval: mkAv(filterHrs, "hours", 20,
        hasConveyor ? "With conveyor" : "No conveyor"),
      backlash_check_interval: mkAv(backlashMonths, "months", 0,
        `Machine age ${age} years`),
      annual_maintenance_hours: mkAv(r1(annualPmHours), "hours", 2,
        "All PM tasks combined"),
      annual_maintenance_cost: mkAv(r0(annualCost), "$/year", 200,
        "Labor + parts + downtime"),
      downtime_risk_score: mkAv(riskScore, "score", 5,
        "0=low → 100=high risk"),
      next_major_service: mkAv(r0(spindleLubeRemaining), "hours", 20,
        "Until next spindle service"),
      pm_roi: mkAv(pmRoi, "%", 50,
        "$1 PM saves $5-10 reactive"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }

export const cncMaintenanceEngine = new CNCMaintenanceEngine();
