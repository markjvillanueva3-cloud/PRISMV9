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

  /**
   * Calculate conveyor requirements from cutting process parameters using
   * ChipVolumeRate algorithm for operation-specific MRR computation.
   *
   * Instead of accepting a raw mrr_cm3_min input, this method computes
   * the actual MRR from tool engagement geometry (accounting for operation
   * type, chip thinning in side milling, drill cross-section, etc.)
   * and derives the required coolant flow from chip production rate.
   *
   * Falls back to simple Q = ae×ap×Vf if ChipVolumeRate unavailable.
   *
   * References: Altintas (2012); Sandvik (2020)
   */
  calculateFromProcess(input: {
    operation: "milling_slot" | "milling_side" | "milling_face" | "turning" | "drilling" | "boring";
    tool_diameter: number;
    depth_of_cut: number;
    width_of_cut: number;
    feed_rate: number;
    cutting_speed: number;
    n_flutes?: number;
    spindle_power?: number;
    work_material?: "steel" | "aluminum" | "cast_iron" | "stainless" | "titanium";
    chip_type?: "stringy" | "broken" | "powder" | "curled";
    conveyor_type?: "hinge_belt" | "scraper" | "auger" | "magnetic";
    belt_width_mm?: number;
    bin_volume_liters?: number;
    machines_served?: number;
  }): ChipConveyorResult & {
    volume_rate_model_used: boolean;
    computed_mrr_cm3: number;
    cutting_power_kw: number;
    feed_per_tooth: number;
    avg_chip_thickness_mm: number;
    coolant_flow_recommended_lpm: number;
  } {
    const mat = input.work_material ?? "steel";
    let mrrCm3 = 0;
    let powerKW = 0;
    let fz = 0;
    let hAvg = 0;
    let volumeRateUsed = false;

    // Try ChipVolumeRate algorithm for accurate MRR
    try {
      const { ChipVolumeRatePredictor } = require("../algorithms/ChipVolumeRate.js");
      const predictor = new ChipVolumeRatePredictor();
      const cvrResult = predictor.calculate({
        operation: input.operation,
        tool_diameter: input.tool_diameter,
        depth_of_cut: input.depth_of_cut,
        width_of_cut: input.width_of_cut,
        feed_rate: input.feed_rate,
        cutting_speed: input.cutting_speed,
        n_flutes: input.n_flutes,
        spindle_power: input.spindle_power,
      });
      volumeRateUsed = true;
      mrrCm3 = cvrResult.mrr_cm3_per_min;
      powerKW = cvrResult.cutting_power_kw;
      fz = cvrResult.feed_per_tooth;
      hAvg = cvrResult.avg_chip_thickness;
    } catch {
      // Fallback: simple MRR = ae × ap × Vf / 1000 (for milling)
      const D = input.tool_diameter;
      const n = (input.cutting_speed * 1000) / (Math.PI * D);
      if (input.operation.startsWith("milling")) {
        mrrCm3 = (input.width_of_cut * input.depth_of_cut * input.feed_rate) / 1000;
        fz = input.feed_rate / (n * (input.n_flutes ?? 4));
        hAvg = fz * (input.width_of_cut / D);
      } else if (input.operation === "turning") {
        mrrCm3 = (input.depth_of_cut * input.feed_rate * input.cutting_speed * 1000) / 1000;
        fz = input.feed_rate;
        hAvg = input.feed_rate;
      } else if (input.operation === "drilling") {
        mrrCm3 = (Math.PI / 4 * D * D * input.feed_rate * n) / 1000;
        fz = input.feed_rate / 2;
        hAvg = fz;
      } else {
        mrrCm3 = (input.width_of_cut * input.depth_of_cut * input.feed_rate) / 1000;
        fz = input.feed_rate;
        hAvg = fz;
      }
      // Simple power estimate: P = kc × Q / 60000
      const kc = mat === "aluminum" ? 800 : mat === "cast_iron" ? 1200 : 2000; // N/mm²
      powerKW = (kc * mrrCm3 * 1000) / 60000;
    }

    // Coolant flow recommendation: ~2 L/min per cm³/min MRR for steel,
    // scaled by material factor
    const matCoolantFactor: Record<string, number> = {
      steel: 2.0, stainless: 2.5, aluminum: 1.5,
      cast_iron: 1.0, titanium: 3.0,
    };
    const coolantFlow = mrrCm3 * (matCoolantFactor[mat] ?? 2.0);

    // Run base conveyor calculation with the computed MRR
    const baseResult = this.calculate({
      mrr_cm3_min: mrrCm3,
      work_material: mat,
      chip_type: input.chip_type,
      conveyor_type: input.conveyor_type,
      belt_width_mm: input.belt_width_mm,
      bin_volume_liters: input.bin_volume_liters,
      machines_served: input.machines_served,
    });

    return {
      ...baseResult,
      volume_rate_model_used: volumeRateUsed,
      computed_mrr_cm3: r2(mrrCm3),
      cutting_power_kw: r2(powerKW),
      feed_per_tooth: r2(fz),
      avg_chip_thickness_mm: r2(hAvg),
      coolant_flow_recommended_lpm: r1(Math.max(coolantFlow, 3)),
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
