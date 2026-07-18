/**
 * CapacityMonteCarloEngine — PCCA-MS6 U02
 *
 * Monte Carlo simulation for capacity planning and inventory service level.
 * Models stochastic demand, machine downtime, setup variation, and scrap
 * to produce probabilistic capacity forecasts with confidence intervals.
 *
 * Key models:
 *   - Machine availability: exponential MTBF/MTTR (Dhillon, 2006)
 *   - Demand variability: normal distribution with seasonal adjustment
 *   - Setup time: log-normal (SMED observations, Shingo 1985)
 *   - Scrap rate: beta distribution bounded [0, max_scrap]
 *   - OEE: availability × performance × quality (Nakajima, 1988)
 *
 * References:
 *   - Hopp & Spearman, "Factory Physics" (3rd ed.)
 *   - Nakajima, "Introduction to TPM" (1988)
 *   - Shingo, "A Revolution in Manufacturing: The SMED System" (1985)
 *
 * @module engines/CapacityMonteCarloEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CapacitySimInput {
  /** Available machines */
  machines: {
    id: string;
    name: string;
    hours_per_shift: number;
    shifts_per_day: number;
    days_per_week: number;
    mtbf_hours: number;          // mean time between failures
    mttr_hours: number;          // mean time to repair
    setup_time_min_mean: number; // mean setup time (minutes)
    setup_time_min_stddev: number;
    cycle_time_min_mean: number; // per-part cycle time
    cycle_time_min_stddev: number;
  }[];

  /** Demand forecast */
  demand: {
    parts_per_week_mean: number;
    parts_per_week_stddev: number;
    seasonal_factor?: number;    // 1.0 = normal, 1.5 = 50% above
  };

  /** Quality */
  scrap_rate_mean: number;       // e.g., 0.02 = 2%
  scrap_rate_max: number;        // upper bound e.g., 0.10

  /** Simulation parameters */
  num_simulations?: number;      // default 5000
  horizon_weeks?: number;        // default 12
  target_service_level?: number; // default 0.95 (95%)
}

export interface CapacitySimResult {
  summary: {
    mean_weekly_capacity: number;
    p5_capacity: number;
    p50_capacity: number;
    p95_capacity: number;
    mean_oee: number;
    mean_utilization: number;
    service_level_met: boolean;
    stockout_probability: number;
  };
  per_machine: {
    id: string;
    name: string;
    mean_availability: number;
    mean_parts_per_week: number;
    bottleneck_probability: number;
  }[];
  risk_factors: string[];
  oee_decomposition: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  };
  confidence_interval: {
    level: number;
    lower: number;
    upper: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Box-Muller transform: generate normally distributed random number. */
function normalRandom(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

/** Log-normal random variable. */
function logNormalRandom(mean: number, stddev: number): number {
  if (stddev <= 0 || mean <= 0) return mean;
  const variance = stddev * stddev;
  const mu = Math.log(mean * mean / Math.sqrt(variance + mean * mean));
  const sigma = Math.sqrt(Math.log(1 + variance / (mean * mean)));
  return Math.exp(normalRandom(mu, sigma));
}

/** Exponential random: time until next event with given mean. */
function exponentialRandom(mean: number): number {
  return -mean * Math.log(Math.random() || 1e-10);
}

/** Beta-distributed random between 0 and max. Approximation via normal clamped. */
function betaRandom(mean: number, max: number): number {
  const stddev = (max - mean) / 3; // ~99.7% within [0, max]
  return Math.max(0, Math.min(max, normalRandom(mean, stddev)));
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ============================================================================
// ENGINE
// ============================================================================

export class CapacityMonteCarloEngine {
  static simulate(input: CapacitySimInput): CapacitySimResult {
    const N = input.num_simulations ?? 5000;
    const weeks = input.horizon_weeks ?? 12;
    const targetSL = input.target_service_level ?? 0.95;
    const seasonal = input.demand.seasonal_factor ?? 1.0;

    const weeklyCapacities: number[] = [];
    const machineBottleneckCounts = new Map<string, number>();
    const machineAvailabilities = new Map<string, number[]>();

    for (const m of input.machines) {
      machineBottleneckCounts.set(m.id, 0);
      machineAvailabilities.set(m.id, []);
    }

    // Run N simulations
    for (let sim = 0; sim < N; sim++) {
      let totalPartsThisWeek = 0;
      let minMachineOutput = Infinity;
      let bottleneckId = "";

      for (const machine of input.machines) {
        // Machine availability (MTBF/MTTR model)
        const weekHours = machine.hours_per_shift * machine.shifts_per_day * machine.days_per_week;
        let availableHours = 0;
        let t = 0;
        while (t < weekHours) {
          const upTime = exponentialRandom(machine.mtbf_hours);
          const availUp = Math.min(upTime, weekHours - t);
          availableHours += availUp;
          t += upTime;
          if (t < weekHours) {
            const repairTime = exponentialRandom(machine.mttr_hours);
            t += repairTime;
          }
        }
        const availability = Math.min(1, availableHours / weekHours);
        machineAvailabilities.get(machine.id)!.push(availability);

        // Setup time per batch (log-normal)
        const setupMin = logNormalRandom(machine.setup_time_min_mean, machine.setup_time_min_stddev);

        // Available production minutes
        const prodMinutes = Math.max(0, availableHours * 60 - setupMin);

        // Per-part cycle time (normal, clamped >0)
        const cycleTime = Math.max(0.1, normalRandom(machine.cycle_time_min_mean, machine.cycle_time_min_stddev));

        // Scrap rate (beta-ish)
        const scrap = betaRandom(input.scrap_rate_mean, input.scrap_rate_max);

        // Good parts from this machine this week
        const rawParts = Math.floor(prodMinutes / cycleTime);
        const goodParts = Math.round(rawParts * (1 - scrap));

        totalPartsThisWeek += goodParts;

        if (goodParts < minMachineOutput) {
          minMachineOutput = goodParts;
          bottleneckId = machine.id;
        }
      }

      weeklyCapacities.push(totalPartsThisWeek);
      machineBottleneckCounts.set(bottleneckId, (machineBottleneckCounts.get(bottleneckId) ?? 0) + 1);
    }

    // Sort for percentile calculations
    weeklyCapacities.sort((a, b) => a - b);

    const meanCapacity = weeklyCapacities.reduce((a, b) => a + b, 0) / N;
    const p5 = percentile(weeklyCapacities, 0.05);
    const p50 = percentile(weeklyCapacities, 0.50);
    const p95 = percentile(weeklyCapacities, 0.95);

    // Demand comparison
    const weeklyDemand = input.demand.parts_per_week_mean * seasonal;
    const stockoutCount = weeklyCapacities.filter(c => c < weeklyDemand).length;
    const stockoutProb = stockoutCount / N;
    const slMet = (1 - stockoutProb) >= targetSL;

    // OEE decomposition (average across machines)
    const availabilities = input.machines.map(m => {
      const avails = machineAvailabilities.get(m.id) ?? [];
      return avails.length > 0 ? avails.reduce((a, b) => a + b, 0) / avails.length : 0.9;
    });
    const avgAvailability = availabilities.reduce((a, b) => a + b, 0) / availabilities.length;
    const quality = 1 - input.scrap_rate_mean;
    const performance = Math.min(1, meanCapacity / (input.machines.reduce((sum, m) => {
      const weekMin = m.hours_per_shift * m.shifts_per_day * m.days_per_week * 60;
      return sum + weekMin / m.cycle_time_min_mean;
    }, 0)));
    const oee = avgAvailability * performance * quality;

    // Per-machine results
    const perMachine = input.machines.map(m => {
      const avails = machineAvailabilities.get(m.id) ?? [];
      const meanAvail = avails.length > 0 ? avails.reduce((a, b) => a + b, 0) / avails.length : 0;
      const bnProb = (machineBottleneckCounts.get(m.id) ?? 0) / N;
      const weekMin = m.hours_per_shift * m.shifts_per_day * m.days_per_week * 60;
      const partsPerWeek = Math.round(meanAvail * weekMin / m.cycle_time_min_mean * quality);
      return { id: m.id, name: m.name, mean_availability: Math.round(meanAvail * 1000) / 1000, mean_parts_per_week: partsPerWeek, bottleneck_probability: Math.round(bnProb * 100) / 100 };
    });

    // Risk factors
    const risks: string[] = [];
    if (stockoutProb > 0.1) risks.push(`High stockout risk (${Math.round(stockoutProb * 100)}%) — capacity below demand`);
    if (avgAvailability < 0.85) risks.push(`Low machine availability (${Math.round(avgAvailability * 100)}%) — check maintenance schedule`);
    if (oee < 0.60) risks.push(`OEE below 60% (${Math.round(oee * 100)}%) — significant improvement potential`);
    const topBottleneck = perMachine.sort((a, b) => b.bottleneck_probability - a.bottleneck_probability)[0];
    if (topBottleneck && topBottleneck.bottleneck_probability > 0.5) {
      risks.push(`${topBottleneck.name} is bottleneck in ${Math.round(topBottleneck.bottleneck_probability * 100)}% of simulations`);
    }

    return {
      summary: {
        mean_weekly_capacity: Math.round(meanCapacity),
        p5_capacity: Math.round(p5),
        p50_capacity: Math.round(p50),
        p95_capacity: Math.round(p95),
        mean_oee: Math.round(oee * 1000) / 1000,
        mean_utilization: Math.round(performance * 1000) / 1000,
        service_level_met: slMet,
        stockout_probability: Math.round(stockoutProb * 1000) / 1000,
      },
      per_machine: perMachine,
      risk_factors: risks,
      oee_decomposition: {
        availability: Math.round(avgAvailability * 1000) / 1000,
        performance: Math.round(performance * 1000) / 1000,
        quality: Math.round(quality * 1000) / 1000,
        oee: Math.round(oee * 1000) / 1000,
      },
      confidence_interval: {
        level: 0.90,
        lower: Math.round(p5),
        upper: Math.round(p95),
      },
    };
  }
}

export const capacityMonteCarloEngine = new CapacityMonteCarloEngine();
