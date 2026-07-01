/**
 * CuttingFluidLifecycleEngine — Coolant Health Monitoring & Replacement Scheduling
 *
 * Models coolant degradation over time including:
 * - Concentration decay (evaporation + dragout losses)
 * - Bacterial growth (Monod kinetics)
 * - Tramp oil accumulation (first-order ingress)
 * - pH drift (buffer capacity model)
 * - Replacement cost optimization (total cost of ownership)
 *
 * Models:
 * - Concentration decay: C(t) = C0 · exp(-k_loss · t) + R_makeup
 * - Monod bacterial growth: µ = µ_max · S/(K_s + S), dN/dt = µ·N - k_d·N
 * - Tramp oil accumulation: O(t) = O_ss · (1 - exp(-k_oil · t))
 * - pH drift: pH(t) = pH0 - Δ_acid·ln(1 + N(t)/N_ref)
 * - Replacement interval: minimize C_total = C_fluid/T + C_disposal/T + C_downtime/T + C_quality(t)
 *
 * References:
 * - Byers (2006): Metalworking Fluids, 2nd Edition
 * - ASTM E2275: Standard Practice for Evaluating Water-Miscible MWFs
 * - Skerlos et al. (2008): Sustainable MWF Systems
 * - De Chiffre & Belluco (2002): Investigations of Cutting Fluid Performance
 *
 * Actions: coolant_lifecycle (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface CoolantLifecycleInput {
  /** Initial concentration (%) */
  initial_concentration_pct: number;
  /** Target concentration range */
  target_min_pct?: number;
  target_max_pct?: number;
  /** Sump volume (liters) */
  sump_volume_L: number;
  /** Coolant type */
  coolant_type: "semisynthetic" | "synthetic" | "soluble_oil" | "straight_oil";
  /** Machine duty: hours/day the machine runs */
  machine_hours_per_day?: number;
  /** Ambient temperature (°C) — affects evaporation & bacteria */
  ambient_temp_C?: number;
  /** Tramp oil ingress rate (mL/hour) — from hydraulic/way lube leaks */
  tramp_oil_rate_mL_hr?: number;
  /** Skimmer present? */
  skimmer_present?: boolean;
  /** Biocide treatment applied? */
  biocide_applied?: boolean;
  /** Makeup water hardness (ppm CaCO3) */
  water_hardness_ppm?: number;
  /** Cost parameters */
  coolant_cost_per_L?: number;
  disposal_cost_per_L?: number;
  downtime_cost_per_hr?: number;
  sump_change_time_hr?: number;
  /** Simulation horizon (days) */
  horizon_days?: number;
}

export interface DailyState {
  day: number;
  concentration_pct: number;
  bacteria_cfu_mL: number;
  tramp_oil_pct: number;
  pH: number;
  health: "good" | "acceptable" | "warning" | "critical";
}

export interface CoolantLifecycleResult {
  daily_states: DailyState[];
  optimal_change_interval_days: number;
  total_cost_per_day: number;
  fluid_cost_per_day: number;
  disposal_cost_per_day: number;
  downtime_cost_per_day: number;
  quality_risk_cost_per_day: number;
  health_at_horizon: "good" | "acceptable" | "warning" | "critical";
  makeup_volume_L_per_day: number;
  warnings: string[];
  formula: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

interface CoolantProps {
  k_evap: number;         // evaporation rate constant (1/day)
  k_dragout: number;      // dragout loss rate (1/day)
  bacterial_suscept: number; // 0-1 scale
  pH_initial: number;
  pH_buffer_capacity: number; // higher = more resistant to pH drop
  tramp_oil_tolerance_pct: number;
}

const COOLANT_PROPS: Record<string, CoolantProps> = {
  semisynthetic: {
    k_evap: 0.015, k_dragout: 0.008, bacterial_suscept: 0.7,
    pH_initial: 9.2, pH_buffer_capacity: 0.6, tramp_oil_tolerance_pct: 3,
  },
  synthetic: {
    k_evap: 0.012, k_dragout: 0.006, bacterial_suscept: 0.3,
    pH_initial: 9.5, pH_buffer_capacity: 0.8, tramp_oil_tolerance_pct: 2,
  },
  soluble_oil: {
    k_evap: 0.020, k_dragout: 0.010, bacterial_suscept: 0.9,
    pH_initial: 9.0, pH_buffer_capacity: 0.4, tramp_oil_tolerance_pct: 5,
  },
  straight_oil: {
    k_evap: 0.003, k_dragout: 0.004, bacterial_suscept: 0.1,
    pH_initial: 7.0, pH_buffer_capacity: 1.0, tramp_oil_tolerance_pct: 10,
  },
};

// ── Engine ──────────────────────────────────────────────────────────────────

export class CuttingFluidLifecycleEngine {

  /**
   * Monod growth rate: µ = µ_max · S / (K_s + S)
   * S = substrate (coolant concentration acts as nutrient)
   */
  monodGrowthRate(
    muMax: number, substrate: number, ks: number,
  ): number {
    if (substrate <= 0) return 0;
    return muMax * substrate / (ks + substrate);
  }

  /**
   * Bacterial population: dN/dt = µ·N - k_d·N
   * Euler step for one day.
   */
  bacteriaStep(
    population: number, growthRate: number, deathRate: number, dt: number,
  ): number {
    const dN = (growthRate - deathRate) * population * dt;
    return Math.max(0, Math.min(1e9, population + dN));
  }

  /**
   * Concentration after evaporation + dragout losses with makeup addition.
   * C(t+dt) = C(t) · exp(-(k_evap + k_dragout) · dt) + makeup_effect
   */
  concentrationStep(
    conc: number, kEvap: number, kDragout: number,
    sumpVolume: number, targetConc: number, dt: number,
  ): { concentration: number; makeup_L: number } {
    const kTotal = kEvap + kDragout;
    const decayed = conc * Math.exp(-kTotal * dt);

    // Auto-topoff: add makeup if below target minimum
    if (decayed >= targetConc * 0.9) {
      return { concentration: decayed, makeup_L: 0 };
    }

    // Calculate makeup needed to restore to target
    const deficit = targetConc - decayed;
    const makeupConc = 100; // concentrate is ~100%
    const makeupFraction = deficit / (makeupConc - decayed);
    const makeupVol = sumpVolume * makeupFraction;
    return {
      concentration: targetConc,
      makeup_L: Math.max(0, makeupVol),
    };
  }

  /**
   * Tramp oil accumulation: O(t) = O_ss · (1 - exp(-k_oil · t)) + skimmer removal
   */
  trampOilStep(
    currentPct: number, ingressRate_mL_hr: number,
    sumpVolume_L: number, hoursPerDay: number,
    skimmerPresent: boolean, dt: number,
  ): number {
    const dailyIngress_mL = ingressRate_mL_hr * hoursPerDay * dt;
    const dailyIngress_L = dailyIngress_mL / 1000;
    const ingressPct = (dailyIngress_L / sumpVolume_L) * 100;

    let newPct = currentPct + ingressPct;

    // Skimmer removes ~60% of surface oil per day
    if (skimmerPresent) {
      newPct *= (1 - 0.6 * dt);
    }

    return Math.max(0, newPct);
  }

  /**
   * pH drift from bacterial acid production:
   * pH(t) = pH0 - (1/buffer) · ln(1 + N/N_ref)
   */
  pHFromBacteria(
    pH0: number, bacteria: number, bufferCapacity: number,
  ): number {
    const N_ref = 1e4; // reference population
    const drop = (1 / bufferCapacity) * Math.log(1 + bacteria / N_ref);
    return Math.max(4.0, pH0 - drop);
  }

  /** Classify overall health from all parameters. */
  classifyHealth(
    conc: number, targetMin: number, targetMax: number,
    bacteria: number, trampOilPct: number, trampOilTolerance: number,
    pH: number,
  ): "good" | "acceptable" | "warning" | "critical" {
    let score = 0; // 0=good, higher=worse

    // Concentration
    if (conc < targetMin * 0.7 || conc > targetMax * 1.5) score += 3;
    else if (conc < targetMin * 0.85 || conc > targetMax * 1.2) score += 1;

    // Bacteria (CFU/mL thresholds from ASTM E2275)
    if (bacteria > 1e6) score += 3;
    else if (bacteria > 1e5) score += 2;
    else if (bacteria > 1e4) score += 1;

    // Tramp oil
    if (trampOilPct > trampOilTolerance * 1.5) score += 2;
    else if (trampOilPct > trampOilTolerance) score += 1;

    // pH
    if (pH < 7.5) score += 3;
    else if (pH < 8.0) score += 2;
    else if (pH < 8.5) score += 1;

    if (score >= 6) return "critical";
    if (score >= 3) return "warning";
    if (score >= 1) return "acceptable";
    return "good";
  }

  /**
   * Optimize replacement interval by minimizing total daily cost.
   * C_total/day = (C_fluid + C_disposal + C_downtime)/T + C_quality_risk(T)
   */
  optimizeInterval(
    sumpVolume: number, coolantCostPerL: number,
    disposalCostPerL: number, downtimeCostPerHr: number,
    changeTimeHr: number, dailyStates: DailyState[],
  ): { interval: number; cost_per_day: number } {
    let bestInterval = dailyStates.length;
    let bestCost = Infinity;

    const fluidCost = sumpVolume * coolantCostPerL;
    const disposalCost = sumpVolume * disposalCostPerL;
    const downtimeCost = changeTimeHr * downtimeCostPerHr;
    const fixedCost = fluidCost + disposalCost + downtimeCost;

    for (let T = 7; T <= dailyStates.length; T++) {
      const fixedPerDay = fixedCost / T;

      // Quality risk: average of days in warning/critical states
      let qualityRisk = 0;
      for (let d = 0; d < T && d < dailyStates.length; d++) {
        const s = dailyStates[d];
        if (s.health === "critical") qualityRisk += 50;
        else if (s.health === "warning") qualityRisk += 10;
        else if (s.health === "acceptable") qualityRisk += 1;
      }
      qualityRisk /= T;

      const totalPerDay = fixedPerDay + qualityRisk;
      if (totalPerDay < bestCost) {
        bestCost = totalPerDay;
        bestInterval = T;
      }
    }

    return { interval: bestInterval, cost_per_day: bestCost };
  }

  /** Main entry — simulate coolant lifecycle and optimize replacement. */
  simulate(input: CoolantLifecycleInput): CoolantLifecycleResult {
    const warnings: string[] = [];
    const props = COOLANT_PROPS[input.coolant_type] ?? COOLANT_PROPS.semisynthetic;

    const horizon = input.horizon_days ?? 90;
    const targetMin = input.target_min_pct ?? (input.initial_concentration_pct * 0.8);
    const targetMax = input.target_max_pct ?? (input.initial_concentration_pct * 1.3);
    const hoursPerDay = input.machine_hours_per_day ?? 16;
    const ambientTemp = input.ambient_temp_C ?? 22;
    const trampOilRate = input.tramp_oil_rate_mL_hr ?? 0.5;
    const skimmer = input.skimmer_present ?? false;
    const biocide = input.biocide_applied ?? false;
    const waterHardness = input.water_hardness_ppm ?? 150;
    const coolantCost = input.coolant_cost_per_L ?? 8;
    const disposalCost = input.disposal_cost_per_L ?? 2;
    const downtimeCost = input.downtime_cost_per_hr ?? 150;
    const changeTime = input.sump_change_time_hr ?? 2;

    // Temperature scaling (bacteria grow faster in warmth, evaporation increases)
    const tempFactor = Math.exp(0.05 * (ambientTemp - 22));
    const kEvap = props.k_evap * tempFactor * (hoursPerDay / 24);
    const kDragout = props.k_dragout * (hoursPerDay / 24);

    // Monod parameters for bacteria
    const muMax = 0.3 * props.bacterial_suscept * tempFactor; // 1/day
    const ks = 3; // half-saturation (% concentration)
    const kDeath = biocide ? 0.15 : 0.02; // biocide increases death rate

    // Initial state
    let conc = input.initial_concentration_pct;
    let bacteria = 100; // CFU/mL initial (low)
    let trampOil = 0;
    let totalMakeup = 0;

    const dailyStates: DailyState[] = [];

    for (let day = 0; day < horizon; day++) {
      // 1. Concentration
      const concResult = this.concentrationStep(
        conc, kEvap, kDragout, input.sump_volume_L, input.initial_concentration_pct, 1,
      );
      conc = concResult.concentration;
      totalMakeup += concResult.makeup_L;

      // 2. Bacteria (Monod)
      const mu = this.monodGrowthRate(muMax, conc, ks);
      bacteria = this.bacteriaStep(bacteria, mu, kDeath, 1);

      // 3. Tramp oil
      trampOil = this.trampOilStep(
        trampOil, trampOilRate, input.sump_volume_L, hoursPerDay, skimmer, 1,
      );

      // 4. pH
      const pH = this.pHFromBacteria(props.pH_initial, bacteria, props.pH_buffer_capacity);

      // 5. Health classification
      const health = this.classifyHealth(
        conc, targetMin, targetMax,
        bacteria, trampOil, props.tramp_oil_tolerance_pct, pH,
      );

      dailyStates.push({
        day: day + 1,
        concentration_pct: Math.round(conc * 100) / 100,
        bacteria_cfu_mL: Math.round(bacteria),
        tramp_oil_pct: Math.round(trampOil * 100) / 100,
        pH: Math.round(pH * 100) / 100,
        health,
      });
    }

    // Optimize replacement interval
    const optimal = this.optimizeInterval(
      input.sump_volume_L, coolantCost, disposalCost, downtimeCost, changeTime, dailyStates,
    );

    // Cost breakdown
    const fluidPerDay = (input.sump_volume_L * coolantCost) / optimal.interval
      + (totalMakeup / horizon) * coolantCost;
    const disposalPerDay = (input.sump_volume_L * disposalCost) / optimal.interval;
    const downtimePerDay = (changeTime * downtimeCost) / optimal.interval;

    // Warnings
    if (waterHardness > 300) {
      warnings.push("Hard water (>300 ppm) may cause residue buildup and reduce emulsion stability");
    }
    if (waterHardness < 50) {
      warnings.push("Soft water (<50 ppm) may cause excessive foaming");
    }
    if (!skimmer && trampOilRate > 1) {
      warnings.push("High tramp oil ingress without skimmer — add belt/disk skimmer");
    }
    if (ambientTemp > 30) {
      warnings.push("High ambient temperature accelerates bacterial growth — monitor pH daily");
    }

    const lastState = dailyStates[dailyStates.length - 1];

    return {
      daily_states: dailyStates,
      optimal_change_interval_days: optimal.interval,
      total_cost_per_day: Math.round((fluidPerDay + disposalPerDay + downtimePerDay) * 100) / 100,
      fluid_cost_per_day: Math.round(fluidPerDay * 100) / 100,
      disposal_cost_per_day: Math.round(disposalPerDay * 100) / 100,
      downtime_cost_per_day: Math.round(downtimePerDay * 100) / 100,
      quality_risk_cost_per_day: Math.round((optimal.cost_per_day - (fluidPerDay + disposalPerDay + downtimePerDay)) * 100) / 100,
      health_at_horizon: lastState.health,
      makeup_volume_L_per_day: Math.round((totalMakeup / horizon) * 100) / 100,
      warnings,
      formula: "C(t)=C0·exp(-k·t)+makeup; Monod: µ=µ_max·S/(K_s+S); " +
        "dN/dt=(µ-k_d)·N; O(t)=ingress-skimmer; " +
        "pH=pH0-(1/buf)·ln(1+N/N_ref); " +
        "TCO=min[(C_fluid+C_disp+C_down)/T+C_quality(T)]",
    };
  }
}

export const cuttingFluidLifecycleEngine = new CuttingFluidLifecycleEngine();
