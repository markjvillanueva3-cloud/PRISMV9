/**
 * ChipConveyorEngine — Chip Conveyor Sizing & Throughput Calculator
 *
 * Calculates chip evacuation system requirements:
 * - Chip volume rate from MRR
 * - Conveyor belt speed and capacity
 * - Bin fill time estimation
 * - Chip type impact on packing density
 * - Coolant carryoff losses
 * - Auger vs belt vs hinge selection
 *
 * Key physics: Chip volume = MRR / packing_density. Packing
 * density varies: stringy chips ~15%, broken chips ~35%,
 * cast iron ~50%. Belt speed typically 3-10 m/min.
 * Conveyor capacity = belt_width × chip_depth × speed × density.
 *
 * Reference: LNS chip conveyor sizing guide,
 *            Hennig chip management systems,
 *            Mayfran conveyor engineering data
 *
 * Actions: chip_conveyor_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ChipConveyorInput {
  mrr_cm3_min?: number;
  work_material?: "steel" | "aluminum" | "cast_iron"
    | "stainless" | "titanium";
  chip_type?: "stringy" | "broken" | "powder" | "curled";
  conveyor_type?: "hinge_belt" | "scraper" | "auger" | "magnetic";
  belt_width_mm?: number;
  belt_speed_m_min?: number;
  bin_volume_liters?: number;
  machines_served?: number;
  hours_per_shift?: number;
  coolant_on_chips_pct?: number;
}

export interface ChipConveyorResult {
  chip_volume_rate: AtomicValue;
  chip_mass_rate: AtomicValue;
  conveyor_capacity: AtomicValue;
  capacity_utilization: AtomicValue;
  bin_fill_time: AtomicValue;
  coolant_carryoff: AtomicValue;
  bins_per_shift: AtomicValue;
  recommended_conveyor: AtomicValue;
  chip_value_per_shift: AtomicValue;
  conveyor_adequate: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Chip packing density (fraction of solid) */
const PACKING_DENSITY: Record<string, number> = {
  stringy: 0.15,
  broken: 0.35,
  powder: 0.55,
  curled: 0.25,
};

/** Material density (g/cm³) */
const MAT_DENSITY: Record<string, number> = {
  steel: 7.8,
  aluminum: 2.7,
  cast_iron: 7.2,
  stainless: 7.9,
  titanium: 4.5,
};

/** Default chip type by material */
const DEFAULT_CHIP_TYPE: Record<string, string> = {
  steel: "broken",
  aluminum: "stringy",
  cast_iron: "powder",
  stainless: "curled",
  titanium: "broken",
};

/** Scrap value per kg by material */
const SCRAP_VALUE: Record<string, number> = {
  steel: 0.20,
  aluminum: 0.80,
  cast_iron: 0.10,
  stainless: 0.50,
  titanium: 5.00,
};

/** Conveyor capacity factor (relative) */
const CONVEYOR_CAPACITY: Record<string, number> = {
  hinge_belt: 1.0,
  scraper: 0.7,
  auger: 0.5,
  magnetic: 0.6,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ChipConveyorEngine {
  calculate(input: ChipConveyorInput): ChipConveyorResult {
    const warnings: string[] = [];
    const mat = input.work_material ?? "steel";
    const mrr = input.mrr_cm3_min ?? 50;
    const chipType = input.chip_type
      ?? DEFAULT_CHIP_TYPE[mat] as "stringy" | "broken" | "powder" | "curled"
      ?? "broken";
    const convType = input.conveyor_type ?? "hinge_belt";
    const beltW = input.belt_width_mm ?? 300;
    const beltSpeed = input.belt_speed_m_min ?? 5;
    const binVol = input.bin_volume_liters ?? 500;
    const nMachines = input.machines_served ?? 1;
    const shiftHrs = input.hours_per_shift ?? 8;
    const coolantPct = input.coolant_on_chips_pct ?? 15;

    const matDens = MAT_DENSITY[mat] ?? 7.8;
    const packDens = PACKING_DENSITY[chipType] ?? 0.25;

    // Chip volume rate (loose chips, cm³/min)
    const chipVolRate = packDens > 0
      ? mrr / packDens : mrr;
    const totalChipVol = chipVolRate * nMachines;

    // Chip mass rate (kg/min)
    const chipMassRate = (mrr * matDens / 1000) * nMachines;

    // Conveyor capacity (cm³/min)
    // Belt cross-section: width × ~50mm chip depth
    const chipDepth = 50; // mm typical
    const convFactor = CONVEYOR_CAPACITY[convType] ?? 1.0;
    const convCapacity = (beltW / 10) * (chipDepth / 10) *
      (beltSpeed * 100) * convFactor; // cm³/min

    const capUtil = convCapacity > 0
      ? (totalChipVol / convCapacity) * 100 : 100;

    // Bin fill time
    const chipVolPerMin = totalChipVol / 1000; // liters/min
    const binFillTime = chipVolPerMin > 0
      ? binVol / chipVolPerMin : 9999;

    // Coolant carryoff (liters/hour)
    const chipMassPerHour = chipMassRate * 60;
    const coolantCarryoff = chipMassPerHour * (coolantPct / 100) /
      1.0; // ~1 kg/L for coolant

    // Bins per shift
    const shiftMin = shiftHrs * 60;
    const binsPerShift = binFillTime > 0
      ? Math.ceil(shiftMin / binFillTime) : 1;

    // Chip scrap value per shift
    const scrapVal = SCRAP_VALUE[mat] ?? 0.20;
    const chipMassPerShift = chipMassRate * shiftMin;
    const chipValuePerShift = chipMassPerShift * scrapVal;

    // Conveyor adequate?
    const adequate = capUtil <= 80;

    // Recommended conveyor
    let recConv: string;
    if (mat === "cast_iron") recConv = "magnetic (ferrous powder)";
    else if (chipType === "stringy") recConv = "hinge_belt (handles tangles)";
    else if (mrr > 100) recConv = "hinge_belt (high volume)";
    else recConv = "scraper (general purpose)";

    // Warnings
    if (!adequate) {
      warnings.push(
        `Conveyor at ${r0(capUtil)}% capacity — ` +
        "risk of chip jam, increase belt speed or width"
      );
    }
    if (chipType === "stringy" && convType === "auger") {
      warnings.push(
        "Auger conveyor not suited for stringy chips — " +
        "use hinge belt instead"
      );
    }
    if (binFillTime < 60) {
      warnings.push(
        `Bin fills in ${r0(binFillTime)}min — ` +
        "increase bin size or add auto-dump"
      );
    }
    if (coolantCarryoff > 5) {
      warnings.push(
        `Coolant carryoff ${r1(coolantCarryoff)} L/hr — ` +
        "add chip wringer to recover coolant"
      );
    }
    if (mat === "aluminum" && convType === "magnetic") {
      warnings.push(
        "Magnetic conveyor won't work for non-ferrous aluminum"
      );
    }
    if (binsPerShift > 5) {
      warnings.push(
        `${binsPerShift} bin changes per shift — ` +
        "consider larger bin or auto-dump system"
      );
    }

    return {
      chip_volume_rate: av(r1(totalChipVol), "cm³/min", 2,
        `MRR ${mrr} / packing ${packDens} × ${nMachines} machines`),
      chip_mass_rate: av(r2(chipMassRate), "kg/min", 0.1,
        `MRR × ${matDens} g/cm³`),
      conveyor_capacity: av(r0(convCapacity), "cm³/min", 10,
        `${beltW}mm × ${chipDepth}mm × ${beltSpeed}m/min`),
      capacity_utilization: av(r1(capUtil), "%", 2,
        "Chip volume / conveyor capacity × 100"),
      bin_fill_time: av(r0(Math.min(binFillTime, 9999)), "min", 5,
        `${binVol}L / ${r2(chipVolPerMin)} L/min`),
      coolant_carryoff: av(r1(coolantCarryoff), "L/hr", 0.5,
        `${coolantPct}% on ${r1(chipMassPerHour)} kg/hr`),
      bins_per_shift: av(binsPerShift, "changes", 0,
        `${shiftHrs}hr shift / ${r0(binFillTime)}min fill`),
      recommended_conveyor: av(0, recConv, 0,
        `Based on ${mat}, ${chipType} chips`),
      chip_value_per_shift: av(r1(chipValuePerShift), "$/shift", 1,
        `${r1(chipMassPerShift)}kg × $${scrapVal}/kg`),
      conveyor_adequate: av(adequate ? 1 : 0,
        adequate ? "YES" : "NO", 0,
        `${r0(capUtil)}% utilization`),
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

export const chipConveyorEngine = new ChipConveyorEngine();
