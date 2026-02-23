/**
 * EnergyMonitoringEngine — R23-MS1
 *
 * Tracks machine energy consumption, builds operation power profiles,
 * analyzes demand patterns, and benchmarks energy efficiency across
 * the shop floor.
 *
 * Actions:
 *   en_consumption  — Track/query machine energy consumption
 *   en_profile      — Build power profile for an operation or machine
 *   en_demand       — Analyze power demand patterns and peaks
 *   en_benchmark    — Benchmark energy efficiency across machines/operations
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsumptionInput {
  machine_id?: string;
  operation?: string;
  date_from?: string;
  date_to?: string;
  granularity?: "hourly" | "shift" | "daily" | "weekly";
  include_breakdown?: boolean;
}

interface ProfileInput {
  machine_id?: string;
  operation?: string;
  material?: string;
  include_phases?: boolean;
  include_recommendations?: boolean;
}

interface DemandInput {
  facility?: string;
  date_from?: string;
  date_to?: string;
  peak_threshold_kw?: number;
  include_forecast?: boolean;
  forecast_periods?: number;
}

interface BenchmarkInput {
  machine_ids?: string[];
  operation?: string;
  metric?: "kwh_per_part" | "kwh_per_kg" | "efficiency_ratio" | "all";
  period?: string;
  include_recommendations?: boolean;
}

// ---------------------------------------------------------------------------
// Seeded data — machine energy profiles
// ---------------------------------------------------------------------------

interface MachineEnergyProfile {
  machine_id: string;
  machine_type: string;
  rated_power_kw: number;
  idle_power_kw: number;
  spindle_power_kw: number;
  axis_power_kw: number;
  coolant_power_kw: number;
  auxiliary_power_kw: number;
  power_factor: number;
  annual_energy_kwh: number;
}

const MACHINE_ENERGY_DB: MachineEnergyProfile[] = [
  { machine_id: "cnc_3axis_01", machine_type: "cnc_3axis", rated_power_kw: 22, idle_power_kw: 3.2, spindle_power_kw: 15, axis_power_kw: 2.5, coolant_power_kw: 1.5, auxiliary_power_kw: 0.8, power_factor: 0.85, annual_energy_kwh: 48400 },
  { machine_id: "cnc_5axis_01", machine_type: "cnc_5axis", rated_power_kw: 37, idle_power_kw: 5.1, spindle_power_kw: 25, axis_power_kw: 4.2, coolant_power_kw: 2.0, auxiliary_power_kw: 1.2, power_factor: 0.87, annual_energy_kwh: 81400 },
  { machine_id: "cnc_lathe_01", machine_type: "cnc_lathe", rated_power_kw: 18, idle_power_kw: 2.5, spindle_power_kw: 12, axis_power_kw: 1.8, coolant_power_kw: 1.2, auxiliary_power_kw: 0.5, power_factor: 0.83, annual_energy_kwh: 39600 },
  { machine_id: "cnc_grinder_01", machine_type: "cnc_grinder", rated_power_kw: 15, idle_power_kw: 2.0, spindle_power_kw: 10, axis_power_kw: 1.5, coolant_power_kw: 1.0, auxiliary_power_kw: 0.5, power_factor: 0.82, annual_energy_kwh: 33000 },
  { machine_id: "cnc_edm_01", machine_type: "cnc_edm", rated_power_kw: 8, idle_power_kw: 1.5, spindle_power_kw: 0, axis_power_kw: 1.0, coolant_power_kw: 3.5, auxiliary_power_kw: 2.0, power_factor: 0.78, annual_energy_kwh: 17600 },
  { machine_id: "cnc_5axis_02", machine_type: "cnc_5axis", rated_power_kw: 45, idle_power_kw: 6.0, spindle_power_kw: 30, axis_power_kw: 5.5, coolant_power_kw: 2.5, auxiliary_power_kw: 1.5, power_factor: 0.88, annual_energy_kwh: 99000 },
  { machine_id: "cnc_lathe_02", machine_type: "cnc_lathe", rated_power_kw: 30, idle_power_kw: 3.8, spindle_power_kw: 20, axis_power_kw: 3.0, coolant_power_kw: 1.8, auxiliary_power_kw: 0.8, power_factor: 0.84, annual_energy_kwh: 66000 },
  { machine_id: "furnace_01", machine_type: "heat_treat", rated_power_kw: 120, idle_power_kw: 8.0, spindle_power_kw: 0, axis_power_kw: 0, coolant_power_kw: 0, auxiliary_power_kw: 5.0, power_factor: 0.92, annual_energy_kwh: 264000 },
  { machine_id: "plating_line_01", machine_type: "surface_treatment", rated_power_kw: 35, idle_power_kw: 4.0, spindle_power_kw: 0, axis_power_kw: 0, coolant_power_kw: 0, auxiliary_power_kw: 8.0, power_factor: 0.80, annual_energy_kwh: 77000 },
  { machine_id: "cmm_01", machine_type: "inspection", rated_power_kw: 3, idle_power_kw: 1.2, spindle_power_kw: 0, axis_power_kw: 0.8, coolant_power_kw: 0, auxiliary_power_kw: 0.5, power_factor: 0.90, annual_energy_kwh: 6600 },
];

// Operation energy multipliers (fraction of rated power)
interface OperationEnergyProfile {
  operation: string;
  power_fraction: number; // of rated power
  ramp_up_minutes: number;
  steady_state_minutes: number;
  ramp_down_minutes: number;
  idle_fraction: number; // between operations
}

const OPERATION_ENERGY_DB: OperationEnergyProfile[] = [
  { operation: "rough_turning", power_fraction: 0.75, ramp_up_minutes: 0.5, steady_state_minutes: 20, ramp_down_minutes: 0.3, idle_fraction: 0.15 },
  { operation: "finish_turning", power_fraction: 0.45, ramp_up_minutes: 0.3, steady_state_minutes: 15, ramp_down_minutes: 0.2, idle_fraction: 0.12 },
  { operation: "rough_milling", power_fraction: 0.80, ramp_up_minutes: 0.5, steady_state_minutes: 25, ramp_down_minutes: 0.3, idle_fraction: 0.18 },
  { operation: "finish_milling", power_fraction: 0.40, ramp_up_minutes: 0.3, steady_state_minutes: 18, ramp_down_minutes: 0.2, idle_fraction: 0.10 },
  { operation: "drilling", power_fraction: 0.55, ramp_up_minutes: 0.2, steady_state_minutes: 8, ramp_down_minutes: 0.1, idle_fraction: 0.20 },
  { operation: "grinding", power_fraction: 0.65, ramp_up_minutes: 0.4, steady_state_minutes: 22, ramp_down_minutes: 0.3, idle_fraction: 0.15 },
  { operation: "heat_treatment", power_fraction: 0.90, ramp_up_minutes: 30, steady_state_minutes: 120, ramp_down_minutes: 60, idle_fraction: 0.05 },
  { operation: "surface_treatment", power_fraction: 0.70, ramp_up_minutes: 5, steady_state_minutes: 45, ramp_down_minutes: 3, idle_fraction: 0.08 },
  { operation: "inspection", power_fraction: 0.60, ramp_up_minutes: 0.2, steady_state_minutes: 12, ramp_down_minutes: 0.1, idle_fraction: 0.25 },
  { operation: "deburring", power_fraction: 0.20, ramp_up_minutes: 0.1, steady_state_minutes: 8, ramp_down_minutes: 0.1, idle_fraction: 0.30 },
];

// Material hardness multiplier (harder materials = more energy)
const MATERIAL_ENERGY_MULTIPLIER: Record<string, number> = {
  "aluminum_6061": 0.65,
  "aluminum_7075": 0.72,
  "steel_1045": 1.00,
  "steel_4140": 1.15,
  "steel_4340": 1.22,
  "stainless_304": 1.30,
  "stainless_316": 1.35,
  "titanium_6al4v": 1.65,
  "inconel_718": 1.90,
  "hastelloy_x": 2.05,
  "tungsten_carbide": 2.40,
  "cast_iron": 0.85,
};

// Electricity rates ($/kWh) by time-of-use
const ELECTRICITY_RATES = {
  off_peak: 0.065,     // 10pm-6am
  mid_peak: 0.095,     // 6am-12pm, 6pm-10pm
  on_peak: 0.145,      // 12pm-6pm
  demand_charge: 12.50, // $/kW per month for peak demand
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  return Math.abs(s.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}

function getMachine(id: string): MachineEnergyProfile {
  return MACHINE_ENERGY_DB.find((m) => m.machine_id === id) ?? MACHINE_ENERGY_DB[0];
}

function getOperation(op: string): OperationEnergyProfile {
  return OPERATION_ENERGY_DB.find((o) => o.operation === op) ?? OPERATION_ENERGY_DB[0];
}

function getMaterialMultiplier(mat: string): number {
  const key = mat.toLowerCase().replace(/[\s-]+/g, "_");
  for (const [k, v] of Object.entries(MATERIAL_ENERGY_MULTIPLIER)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// en_consumption — Track/query energy consumption
// ---------------------------------------------------------------------------

function trackConsumption(input: ConsumptionInput) {
  const { machine_id, operation, granularity = "daily", include_breakdown = true } = input;

  const machines = machine_id
    ? MACHINE_ENERGY_DB.filter((m) => m.machine_id === machine_id)
    : MACHINE_ENERGY_DB;

  if (machines.length === 0) {
    return { error: `Machine '${machine_id}' not found`, available: MACHINE_ENERGY_DB.map((m) => m.machine_id) };
  }

  // Generate consumption data per machine
  const consumption = machines.map((m) => {
    const seed = hashStr(m.machine_id) % 1000;
    const dailyKwh = m.annual_energy_kwh / 365;

    // Simulate 7 days of data
    const days = 7;
    const dailyData = Array.from({ length: days }, (_, i) => {
      const variation = 1 + ((seed + i * 17) % 20 - 10) / 100; // +/- 10%
      const dayKwh = dailyKwh * variation;
      const peakKw = m.rated_power_kw * (0.6 + ((seed + i * 7) % 30) / 100);

      // Time-of-use breakdown
      const offPeakFraction = 0.20 + ((seed + i) % 10) / 100;
      const onPeakFraction = 0.35 + ((seed + i * 3) % 10) / 100;
      const midPeakFraction = 1 - offPeakFraction - onPeakFraction;

      return {
        date: new Date(Date.now() - (days - i) * 86400000).toISOString().slice(0, 10),
        total_kwh: Math.round(dayKwh * 100) / 100,
        peak_demand_kw: Math.round(peakKw * 10) / 10,
        operating_hours: 16 + ((seed + i) % 5),
        idle_hours: 8 - ((seed + i) % 5),
        cost_usd: Math.round(
          (dayKwh * offPeakFraction * ELECTRICITY_RATES.off_peak +
            dayKwh * midPeakFraction * ELECTRICITY_RATES.mid_peak +
            dayKwh * onPeakFraction * ELECTRICITY_RATES.on_peak) * 100
        ) / 100,
        ...(include_breakdown
          ? {
              breakdown: {
                spindle_kwh: Math.round(dayKwh * (m.spindle_power_kw / m.rated_power_kw) * 100) / 100,
                axes_kwh: Math.round(dayKwh * (m.axis_power_kw / m.rated_power_kw) * 100) / 100,
                coolant_kwh: Math.round(dayKwh * (m.coolant_power_kw / m.rated_power_kw) * 100) / 100,
                auxiliary_kwh: Math.round(dayKwh * (m.auxiliary_power_kw / m.rated_power_kw) * 100) / 100,
                idle_kwh: Math.round(m.idle_power_kw * (8 - ((seed + i) % 5)) * 100) / 100,
              },
            }
          : {}),
      };
    });

    const totalKwh = dailyData.reduce((s, d) => s + d.total_kwh, 0);
    const totalCost = dailyData.reduce((s, d) => s + d.cost_usd, 0);
    const avgDailyKwh = totalKwh / days;

    return {
      machine_id: m.machine_id,
      machine_type: m.machine_type,
      rated_power_kw: m.rated_power_kw,
      period: { days, granularity },
      summary: {
        total_kwh: Math.round(totalKwh * 100) / 100,
        avg_daily_kwh: Math.round(avgDailyKwh * 100) / 100,
        total_cost_usd: Math.round(totalCost * 100) / 100,
        avg_daily_cost_usd: Math.round((totalCost / days) * 100) / 100,
        peak_demand_kw: Math.max(...dailyData.map((d) => d.peak_demand_kw)),
        energy_intensity_kwh_per_hour: Math.round((avgDailyKwh / 16) * 100) / 100,
      },
      daily_data: granularity === "daily" ? dailyData : undefined,
    };
  });

  // Fleet summary
  const fleetTotal = consumption.reduce((s, c) => s + c.summary.total_kwh, 0);
  const fleetCost = consumption.reduce((s, c) => s + c.summary.total_cost_usd, 0);

  return {
    query: { machine_id: machine_id ?? "all", operation: operation ?? "all", granularity },
    generated_at: new Date().toISOString(),
    fleet_summary: {
      machines_monitored: consumption.length,
      total_kwh: Math.round(fleetTotal * 100) / 100,
      total_cost_usd: Math.round(fleetCost * 100) / 100,
      avg_cost_per_machine_usd: Math.round((fleetCost / consumption.length) * 100) / 100,
      highest_consumer: consumption.reduce((a, b) => (a.summary.total_kwh > b.summary.total_kwh ? a : b)).machine_id,
      peak_fleet_demand_kw: consumption.reduce((s, c) => s + c.summary.peak_demand_kw, 0),
    },
    machines: consumption,
  };
}

// ---------------------------------------------------------------------------
// en_profile — Build power profile for operation/machine
// ---------------------------------------------------------------------------

function buildProfile(input: ProfileInput) {
  const {
    machine_id = "cnc_5axis_01",
    operation = "rough_milling",
    material = "steel_4140",
    include_phases = true,
    include_recommendations = true,
  } = input;

  const machine = getMachine(machine_id);
  const opProfile = getOperation(operation);
  const matMultiplier = getMaterialMultiplier(material);

  // Calculate power for each phase
  const steadyPower = machine.rated_power_kw * opProfile.power_fraction * matMultiplier;
  const rampUpPower = steadyPower * 0.6; // average during ramp
  const rampDownPower = steadyPower * 0.4;
  const idlePower = machine.idle_power_kw;

  // Energy per cycle
  const rampUpEnergy = (rampUpPower * opProfile.ramp_up_minutes) / 60;
  const steadyEnergy = (steadyPower * opProfile.steady_state_minutes) / 60;
  const rampDownEnergy = (rampDownPower * opProfile.ramp_down_minutes) / 60;
  const totalCycleMinutes = opProfile.ramp_up_minutes + opProfile.steady_state_minutes + opProfile.ramp_down_minutes;
  const totalCycleEnergy = rampUpEnergy + steadyEnergy + rampDownEnergy;

  // Specific energy consumption (SEC)
  const mrr_cm3_min = operation.includes("rough") ? 25 : operation.includes("finish") ? 8 : 15;
  const volumeRemoved = mrr_cm3_min * opProfile.steady_state_minutes;
  const sec = volumeRemoved > 0 ? totalCycleEnergy / (volumeRemoved / 1000) : 0; // kWh/dm³

  // Efficiency metrics
  const productivePowerFraction = steadyEnergy / totalCycleEnergy;
  const energyEfficiency = productivePowerFraction * (1 - opProfile.idle_fraction);

  const phases = include_phases
    ? [
        { phase: "ramp_up", duration_min: opProfile.ramp_up_minutes, avg_power_kw: Math.round(rampUpPower * 10) / 10, energy_kwh: Math.round(rampUpEnergy * 1000) / 1000 },
        { phase: "steady_state", duration_min: opProfile.steady_state_minutes, avg_power_kw: Math.round(steadyPower * 10) / 10, energy_kwh: Math.round(steadyEnergy * 1000) / 1000 },
        { phase: "ramp_down", duration_min: opProfile.ramp_down_minutes, avg_power_kw: Math.round(rampDownPower * 10) / 10, energy_kwh: Math.round(rampDownEnergy * 1000) / 1000 },
      ]
    : undefined;

  const recommendations = include_recommendations
    ? [
        ...(matMultiplier > 1.5 ? [`High-energy material (${material}, multiplier ${matMultiplier}x) — consider optimized toolpath strategies to reduce cutting forces`] : []),
        ...(opProfile.idle_fraction > 0.20 ? [`High idle fraction (${Math.round(opProfile.idle_fraction * 100)}%) — investigate setup reduction (SMED) to improve energy utilization`] : []),
        ...(energyEfficiency < 0.5 ? [`Low energy efficiency (${Math.round(energyEfficiency * 100)}%) — review spindle utilization and non-productive time`] : []),
        ...(steadyPower > machine.rated_power_kw * 0.85 ? ["Operating near rated power — monitor for thermal derating and consider load balancing"] : []),
        productivePowerFraction > 0.8 ? "Good power utilization during productive phase" : "Consider reducing non-productive power draws (auxiliary, coolant standby)",
      ]
    : undefined;

  return {
    machine_id,
    machine_type: machine.machine_type,
    operation,
    material,
    material_multiplier: matMultiplier,
    power_profile: {
      rated_power_kw: machine.rated_power_kw,
      steady_state_power_kw: Math.round(steadyPower * 10) / 10,
      peak_power_kw: Math.round(steadyPower * 1.15 * 10) / 10, // 15% transient peak
      idle_power_kw: machine.idle_power_kw,
      power_factor: machine.power_factor,
    },
    cycle: {
      total_duration_minutes: Math.round(totalCycleMinutes * 10) / 10,
      total_energy_kwh: Math.round(totalCycleEnergy * 1000) / 1000,
      specific_energy_kwh_per_dm3: Math.round(sec * 1000) / 1000,
      material_removal_rate_cm3_min: mrr_cm3_min,
      volume_removed_cm3: Math.round(volumeRemoved),
    },
    efficiency: {
      productive_power_fraction: Math.round(productivePowerFraction * 10000) / 10000,
      energy_efficiency: Math.round(energyEfficiency * 10000) / 10000,
      idle_fraction: opProfile.idle_fraction,
    },
    phases,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// en_demand — Analyze power demand patterns
// ---------------------------------------------------------------------------

function analyzeDemand(input: DemandInput) {
  const {
    facility = "main_shop",
    peak_threshold_kw = 200,
    include_forecast = true,
    forecast_periods = 4,
  } = input;

  const seed = hashStr(facility);

  // Generate 30 days of hourly demand data (summarized as daily)
  const days = 30;
  const dailyDemand = Array.from({ length: days }, (_, i) => {
    const isWeekday = (i % 7) < 5;
    const baseDemand = isWeekday ? 180 : 60; // kW base load
    const variation = ((seed + i * 13) % 40 - 20);
    const peakDemand = baseDemand + 80 + ((seed + i * 7) % 60);

    return {
      date: new Date(Date.now() - (days - i) * 86400000).toISOString().slice(0, 10),
      is_weekday: isWeekday,
      avg_demand_kw: Math.round((baseDemand + variation) * 10) / 10,
      peak_demand_kw: Math.round(peakDemand * 10) / 10,
      min_demand_kw: Math.round((baseDemand * 0.3 + variation * 0.5) * 10) / 10,
      total_kwh: Math.round((baseDemand + variation) * (isWeekday ? 16 : 8) * 10) / 10,
      peak_exceeded: peakDemand > peak_threshold_kw,
      cost_usd: Math.round(
        (baseDemand + variation) * (isWeekday ? 16 : 8) * ELECTRICITY_RATES.mid_peak * 100
      ) / 100,
    };
  });

  // Demand statistics
  const avgDemand = dailyDemand.reduce((s, d) => s + d.avg_demand_kw, 0) / days;
  const maxPeak = Math.max(...dailyDemand.map((d) => d.peak_demand_kw));
  const peakExceedances = dailyDemand.filter((d) => d.peak_exceeded).length;
  const totalKwh = dailyDemand.reduce((s, d) => s + d.total_kwh, 0);
  const totalCost = dailyDemand.reduce((s, d) => s + d.cost_usd, 0);
  const demandCharge = Math.round(maxPeak * ELECTRICITY_RATES.demand_charge * 100) / 100;

  // Load factor = average demand / peak demand
  const loadFactor = avgDemand / maxPeak;

  // Time-of-use analysis
  const weekdayDays = dailyDemand.filter((d) => d.is_weekday);
  const weekendDays = dailyDemand.filter((d) => !d.is_weekday);

  // Demand forecast (simple linear trend)
  let forecast;
  if (include_forecast) {
    const xMean = (days - 1) / 2;
    const yMean = avgDemand;
    let num = 0, den = 0;
    dailyDemand.forEach((d, i) => {
      num += (i - xMean) * (d.avg_demand_kw - yMean);
      den += (i - xMean) ** 2;
    });
    const slope = den > 0 ? num / den : 0;

    forecast = Array.from({ length: forecast_periods }, (_, i) => ({
      period: `week_${i + 1}`,
      projected_avg_kw: Math.round((yMean + slope * (days + i * 7)) * 10) / 10,
      projected_peak_kw: Math.round((maxPeak + slope * (i + 1) * 3) * 10) / 10,
      projected_weekly_kwh: Math.round((yMean + slope * (days + i * 7)) * 112 * 10) / 10, // 16h * 7 days
      trend: slope > 0.5 ? "increasing" : slope < -0.5 ? "decreasing" : "stable",
    }));
  }

  return {
    facility,
    analysis_period_days: days,
    generated_at: new Date().toISOString(),
    summary: {
      avg_demand_kw: Math.round(avgDemand * 10) / 10,
      max_peak_demand_kw: Math.round(maxPeak * 10) / 10,
      load_factor: Math.round(loadFactor * 10000) / 10000,
      total_energy_kwh: Math.round(totalKwh),
      total_energy_cost_usd: Math.round(totalCost * 100) / 100,
      demand_charge_usd: demandCharge,
      total_bill_usd: Math.round((totalCost + demandCharge) * 100) / 100,
      peak_exceedances: peakExceedances,
      peak_threshold_kw,
    },
    patterns: {
      weekday_avg_kw: Math.round(
        (weekdayDays.reduce((s, d) => s + d.avg_demand_kw, 0) / Math.max(weekdayDays.length, 1)) * 10
      ) / 10,
      weekend_avg_kw: Math.round(
        (weekendDays.reduce((s, d) => s + d.avg_demand_kw, 0) / Math.max(weekendDays.length, 1)) * 10
      ) / 10,
      weekday_to_weekend_ratio: weekendDays.length > 0
        ? Math.round(
            (weekdayDays.reduce((s, d) => s + d.avg_demand_kw, 0) / weekdayDays.length) /
            (weekendDays.reduce((s, d) => s + d.avg_demand_kw, 0) / weekendDays.length) * 100
          ) / 100
        : 0,
    },
    daily_data: dailyDemand.slice(-7), // last 7 days
    forecast,
    recommendations: [
      ...(loadFactor < 0.5 ? ["Low load factor — consider shifting loads to off-peak hours to flatten demand curve"] : []),
      ...(peakExceedances > 5 ? [`${peakExceedances} peak exceedances — implement demand response strategy to reduce peak charges`] : []),
      ...(demandCharge > totalCost * 0.3 ? ["Demand charges exceed 30% of energy cost — peak shaving or battery storage could reduce costs"] : []),
      loadFactor > 0.7 ? "Good load factor — demand management is effective" : "Consider load staggering to improve load factor",
    ],
  };
}

// ---------------------------------------------------------------------------
// en_benchmark — Benchmark energy efficiency
// ---------------------------------------------------------------------------

function benchmarkEnergy(input: BenchmarkInput) {
  const {
    machine_ids,
    operation = "rough_milling",
    metric = "all",
    include_recommendations = true,
  } = input;

  const machines = machine_ids
    ? MACHINE_ENERGY_DB.filter((m) => machine_ids.includes(m.machine_id))
    : MACHINE_ENERGY_DB;

  const opProfile = getOperation(operation);

  // Benchmark each machine
  const benchmarks = machines.map((m) => {
    const seed = hashStr(m.machine_id);
    const steadyPower = m.rated_power_kw * opProfile.power_fraction;
    const cycleMinutes = opProfile.ramp_up_minutes + opProfile.steady_state_minutes + opProfile.ramp_down_minutes;
    const cycleEnergy = steadyPower * cycleMinutes / 60;

    // Parts per day (simulated)
    const partsPerDay = 8 + (seed % 12);
    const kwhPerPart = cycleEnergy;
    const kwhPerKg = cycleEnergy / (2.5 + (seed % 30) / 10); // 2.5-5.5 kg part weight

    // Efficiency ratio: productive energy / total energy consumed
    const totalDailyKwh = m.annual_energy_kwh / 365;
    const productiveKwh = kwhPerPart * partsPerDay;
    const efficiencyRatio = Math.min(productiveKwh / totalDailyKwh, 0.95);

    // Energy intensity rating (1-5 stars)
    let rating: number;
    if (efficiencyRatio > 0.70) rating = 5;
    else if (efficiencyRatio > 0.55) rating = 4;
    else if (efficiencyRatio > 0.40) rating = 3;
    else if (efficiencyRatio > 0.25) rating = 2;
    else rating = 1;

    return {
      machine_id: m.machine_id,
      machine_type: m.machine_type,
      operation,
      metrics: {
        kwh_per_part: Math.round(kwhPerPart * 1000) / 1000,
        kwh_per_kg: Math.round(kwhPerKg * 1000) / 1000,
        efficiency_ratio: Math.round(efficiencyRatio * 10000) / 10000,
        daily_production_kwh: Math.round(productiveKwh * 100) / 100,
        daily_total_kwh: Math.round(totalDailyKwh * 100) / 100,
        idle_waste_kwh: Math.round((totalDailyKwh - productiveKwh) * 100) / 100,
        parts_per_day: partsPerDay,
      },
      rating: {
        stars: rating,
        label: rating >= 4 ? "excellent" : rating >= 3 ? "good" : rating >= 2 ? "fair" : "poor",
      },
      cost: {
        energy_cost_per_part_usd: Math.round(kwhPerPart * ELECTRICITY_RATES.mid_peak * 1000) / 1000,
        daily_energy_cost_usd: Math.round(totalDailyKwh * ELECTRICITY_RATES.mid_peak * 100) / 100,
        annual_energy_cost_usd: Math.round(m.annual_energy_kwh * ELECTRICITY_RATES.mid_peak * 100) / 100,
      },
    };
  });

  // Sort by efficiency
  benchmarks.sort((a, b) => b.metrics.efficiency_ratio - a.metrics.efficiency_ratio);

  // Fleet statistics
  const avgEfficiency = benchmarks.reduce((s, b) => s + b.metrics.efficiency_ratio, 0) / benchmarks.length;
  const bestMachine = benchmarks[0];
  const worstMachine = benchmarks[benchmarks.length - 1];
  const totalAnnualCost = benchmarks.reduce((s, b) => s + b.cost.annual_energy_cost_usd, 0);
  const potentialSavings = benchmarks.reduce((s, b) => {
    const gap = bestMachine.metrics.efficiency_ratio - b.metrics.efficiency_ratio;
    return s + gap * b.cost.annual_energy_cost_usd;
  }, 0);

  return {
    operation,
    metric: metric === "all" ? ["kwh_per_part", "kwh_per_kg", "efficiency_ratio"] : [metric],
    generated_at: new Date().toISOString(),
    fleet_summary: {
      machines_benchmarked: benchmarks.length,
      avg_efficiency_ratio: Math.round(avgEfficiency * 10000) / 10000,
      best_performer: { machine_id: bestMachine.machine_id, efficiency: bestMachine.metrics.efficiency_ratio },
      worst_performer: { machine_id: worstMachine.machine_id, efficiency: worstMachine.metrics.efficiency_ratio },
      total_annual_energy_cost_usd: Math.round(totalAnnualCost),
      potential_annual_savings_usd: Math.round(potentialSavings),
    },
    rankings: benchmarks,
    recommendations: include_recommendations
      ? [
          ...(potentialSavings > 5000 ? [`$${Math.round(potentialSavings)} annual savings potential by bringing all machines to best-performer efficiency`] : []),
          ...(worstMachine.rating.stars <= 2 ? [`${worstMachine.machine_id} rated '${worstMachine.rating.label}' — prioritize for energy audit`] : []),
          ...(avgEfficiency < 0.5 ? ["Fleet average efficiency below 50% — review idle time management and load scheduling"] : []),
          benchmarks.length > 5 ? "Consider energy monitoring IoT sensors for real-time consumption tracking" : "Small fleet — manual monitoring with weekly reviews is adequate",
        ]
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeEnergyMonitoringAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "en_consumption":
      return trackConsumption(params as unknown as ConsumptionInput);
    case "en_profile":
      return buildProfile(params as unknown as ProfileInput);
    case "en_demand":
      return analyzeDemand(params as unknown as DemandInput);
    case "en_benchmark":
      return benchmarkEnergy(params as unknown as BenchmarkInput);
    default:
      throw new Error(`EnergyMonitoringEngine: unknown action "${action}"`);
  }
}
