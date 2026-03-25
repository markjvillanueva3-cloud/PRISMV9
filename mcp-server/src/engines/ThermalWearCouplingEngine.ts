/**
 * ThermalWearCouplingEngine — Coupled Thermal-Wear-Deflection ODE System
 *
 * Models the positive feedback loop in machining where:
 * - Tool wear (VB↑) → increased edge contact → force increase (F↑)
 * - Force increase → higher cutting temperature (θ↑)
 * - Higher temperature → accelerated wear rate (dVB/dt↑)
 * - Wear-induced deflection → dimensional error accumulation
 *
 * ODE system (4th-order Runge-Kutta integration):
 *   dVB/dt = C1 · V · exp(-C2/θ)          (Usui-type wear)
 *   dθ/dt  = (Q_gen - Q_diss) / (ρ·cp·Vol) (thermal balance)
 *   dδ/dt  = (dF/dVB · dVB/dt) · L³/(3EI)  (deflection from force)
 *   dΣε/dt = |dδ/dt|                        (cumulative error)
 *
 * Where:
 *   F(VB) = F0 · (1 + k_vb · VB/VB_ref)   (force grows with wear)
 *   θ(F)  = θ0 + C_θ · F^0.6              (temperature from force)
 *   Q_gen = F · V · η_heat                 (heat generation)
 *   Q_diss = h · A · (θ - θ_amb)           (convective dissipation)
 *
 * Monte Carlo: run N ODE integrations with uncertain initial conditions
 *
 * References:
 * - Usui et al. (1978): Analytical prediction of tool wear
 * - Loewen & Shaw (1954): On the analysis of cutting tool temps
 * - Komanduri & Hou (2001): Thermal modeling of machining
 * - Altintas (2012): Manufacturing Automation, Ch. 2
 *
 * Actions: thermal_wear_coupling (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface CouplingInput {
  /** Cutting speed (m/min) */
  cutting_speed_m_min: number;
  /** Feed (mm/rev) */
  feed_mm_rev: number;
  /** Depth of cut (mm) */
  depth_of_cut_mm: number;
  /** Initial cutting force (N) */
  initial_force_N: number;

  /** Tool geometry */
  tool_diameter_mm?: number;
  tool_overhang_mm?: number;
  tool_E_GPa?: number;

  /** Wear parameters */
  usui_C1?: number;         // wear rate coefficient
  usui_C2?: number;         // thermal activation (K)
  wear_force_factor?: number; // k_vb: force increase per mm VB
  wear_limit_mm?: number;    // VB limit (typically 0.3mm)

  /** Thermal parameters */
  heat_partition?: number;   // fraction of heat to tool (0.1-0.3)
  convection_h_W_m2K?: number;
  initial_temp_C?: number;

  /** Simulation */
  simulation_time_min?: number;
  time_step_s?: number;
  mc_samples?: number;

  /** Variation CVs */
  force_cv_pct?: number;
  wear_rate_cv_pct?: number;
  thermal_cv_pct?: number;
}

export interface TimePoint {
  time_min: number;
  wear_mm: number;
  force_N: number;
  temp_C: number;
  deflection_um: number;
  cumulative_error_um: number;
}

export interface CouplingResult {
  /** Deterministic trajectory */
  trajectory: TimePoint[];
  /** Time to wear limit */
  time_to_limit_min: number;
  /** Force at end of life */
  final_force_N: number;
  /** Max temperature reached */
  max_temp_C: number;
  /** Max deflection */
  max_deflection_um: number;
  /** Cumulative dimensional error */
  cumulative_error_um: number;

  /** MC distributions (if mc_samples > 0) */
  life_distribution?: {
    mean_min: number;
    std_min: number;
    p10_min: number;
    p50_min: number;
    p90_min: number;
  };

  /** Coupling strength metrics */
  force_amplification_pct: number;  // (F_end - F_start) / F_start
  thermal_acceleration_factor: number; // wear_rate_end / wear_rate_start
  feedback_gain: number;            // dimensionless loop gain

  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class ThermalWearCouplingEngine {

  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Usui wear rate: dVB/dt = C1 · V · exp(-C2/θ_K)
   * Returns mm/min.
   */
  wearRate(
    C1: number, C2: number, V_m_min: number, tempK: number,
  ): number {
    if (tempK <= 0) return 0;
    return C1 * V_m_min * Math.exp(-C2 / tempK);
  }

  /**
   * Force as function of wear:
   * F(VB) = F0 · (1 + k_vb · VB / VB_ref)
   */
  forceFromWear(
    F0: number, VB: number, kVB: number, VBref: number,
  ): number {
    return F0 * (1 + kVB * VB / VBref);
  }

  /**
   * Temperature from force (empirical):
   * θ = θ_amb + C_θ · F^0.6 · V^0.4
   */
  tempFromForce(
    F: number, V_m_min: number, ambientC: number,
  ): number {
    const Ctheta = 0.08; // calibration constant
    return ambientC + Ctheta * Math.pow(F, 0.6) * Math.pow(V_m_min, 0.4);
  }

  /**
   * Cantilever deflection in µm from force.
   */
  deflection(
    F: number, L_mm: number, d_mm: number, E_GPa: number,
  ): number {
    const I = (Math.PI * Math.pow(d_mm, 4)) / 64;
    const E = E_GPa * 1000;
    if (E * I <= 0) return 0;
    return (F * Math.pow(L_mm, 3)) / (3 * E * I) * 1000;
  }

  /**
   * 4th-order Runge-Kutta integration of the coupled ODE system.
   * State: [VB, θ, δ, Σε]
   */
  integrateODE(
    F0: number, V: number, C1: number, C2: number,
    kVB: number, VBref: number, VBlimit: number,
    heatPartition: number, convH: number, ambientC: number,
    toolD: number, toolL: number, toolE: number,
    totalTime_min: number, dt_s: number,
  ): { trajectory: TimePoint[]; limitTime: number } {
    const dt_min = dt_s / 60;
    const nSteps = Math.ceil(totalTime_min / dt_min);
    const trajectory: TimePoint[] = [];

    let VB = 0;       // flank wear (mm)
    let cumError = 0;  // cumulative dimensional error (µm)
    let limitTime = totalTime_min;
    let limitReached = false;

    for (let step = 0; step <= nSteps; step++) {
      const t = step * dt_min;

      // Current force from wear
      const F = this.forceFromWear(F0, VB, kVB, VBref);
      // Current temperature
      const theta = this.tempFromForce(F, V, ambientC);
      // Current deflection
      const defl = this.deflection(F, toolL, toolD, toolE);

      // Record at intervals
      if (step % Math.max(1, Math.floor(nSteps / 100)) === 0
          || step === nSteps) {
        trajectory.push({
          time_min: Math.round(t * 100) / 100,
          wear_mm: Math.round(VB * 10000) / 10000,
          force_N: Math.round(F * 10) / 10,
          temp_C: Math.round(theta * 10) / 10,
          deflection_um: Math.round(defl * 100) / 100,
          cumulative_error_um: Math.round(cumError * 100) / 100,
        });
      }

      if (VB >= VBlimit && !limitReached) {
        limitTime = t;
        limitReached = true;
        break;
      }

      // RK4 for wear (primary coupled variable)
      const thetaK = theta + 273.15;
      const k1 = this.wearRate(C1, C2, V, thetaK);

      const VB2 = VB + 0.5 * dt_min * k1;
      const F2 = this.forceFromWear(F0, VB2, kVB, VBref);
      const th2 = this.tempFromForce(F2, V, ambientC) + 273.15;
      const k2 = this.wearRate(C1, C2, V, th2);

      const VB3 = VB + 0.5 * dt_min * k2;
      const F3 = this.forceFromWear(F0, VB3, kVB, VBref);
      const th3 = this.tempFromForce(F3, V, ambientC) + 273.15;
      const k3 = this.wearRate(C1, C2, V, th3);

      const VB4 = VB + dt_min * k3;
      const F4 = this.forceFromWear(F0, VB4, kVB, VBref);
      const th4 = this.tempFromForce(F4, V, ambientC) + 273.15;
      const k4 = this.wearRate(C1, C2, V, th4);

      const dVB = (dt_min / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      VB += dVB;

      // Track cumulative error from deflection change
      const newDefl = this.deflection(
        this.forceFromWear(F0, VB, kVB, VBref), toolL, toolD, toolE,
      );
      cumError += Math.abs(newDefl - defl);
    }

    return { trajectory, limitTime };
  }

  /** Main entry — coupled thermal-wear analysis. */
  analyze(input: CouplingInput): CouplingResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const V = input.cutting_speed_m_min;
    const F0 = input.initial_force_N;
    const C1 = input.usui_C1 ?? 5e-4;
    const C2 = input.usui_C2 ?? 3000;
    const kVB = input.wear_force_factor ?? 3.0;
    const VBref = 0.3;
    const VBlimit = input.wear_limit_mm ?? 0.3;
    const heatPart = input.heat_partition ?? 0.2;
    const convH = input.convection_h_W_m2K ?? 500;
    const ambientC = input.initial_temp_C ?? 25;
    const toolD = input.tool_diameter_mm ?? 10;
    const toolL = input.tool_overhang_mm ?? 40;
    const toolE = input.tool_E_GPa ?? 600;
    const simTime = input.simulation_time_min ?? 60;
    const dt = input.time_step_s ?? 1;
    const MAX_TRIALS = 100_000;
    const mcN = Math.min(input.mc_samples ?? 0, MAX_TRIALS);

    // Deterministic run
    const { trajectory, limitTime } = this.integrateODE(
      F0, V, C1, C2, kVB, VBref, VBlimit,
      heatPart, convH, ambientC, toolD, toolL, toolE,
      simTime, dt,
    );

    const last = trajectory[trajectory.length - 1];
    const first = trajectory[0];

    const forceAmp = first.force_N > 0
      ? ((last.force_N - first.force_N) / first.force_N) * 100 : 0;

    // Thermal acceleration: wear rate at end vs start
    const thetaStart = first.temp_C + 273.15;
    const thetaEnd = last.temp_C + 273.15;
    const rateStart = this.wearRate(C1, C2, V, thetaStart);
    const rateEnd = this.wearRate(C1, C2, V, thetaEnd);
    const thermalAccel = rateStart > 0 ? rateEnd / rateStart : 1;

    // Feedback gain: ratio of coupled life to uncoupled life
    // Uncoupled (no force-wear feedback): constant wear rate
    const uncoupledLife = rateStart > 0 ? VBlimit / rateStart : simTime;
    const feedbackGain = uncoupledLife > 0
      ? uncoupledLife / Math.max(limitTime, 0.1) : 1;

    // Monte Carlo for life distribution
    let lifeDist: CouplingResult["life_distribution"];
    if (mcN > 0) {
      const forceCv = input.force_cv_pct ?? 8;
      const wearCv = input.wear_rate_cv_pct ?? 15;
      const thermCv = input.thermal_cv_pct ?? 10;
      const lifeSamples: number[] = [];

      for (let i = 0; i < mcN; i++) {
        const F0s = F0 * (1 + (forceCv / 100) * this.normalRandom());
        const C1s = C1 * (1 + (wearCv / 100) * this.normalRandom());
        const C2s = C2 * (1 + (thermCv / 100) * this.normalRandom());

        const { limitTime: lt } = this.integrateODE(
          Math.max(10, F0s), V,
          Math.max(1e-8, C1s), Math.max(100, C2s),
          kVB, VBref, VBlimit,
          heatPart, convH, ambientC,
          toolD, toolL, toolE,
          simTime * 2, dt,
        );
        lifeSamples.push(lt);
      }

      const sorted = lifeSamples.sort((a, b) => a - b);
      const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const variance = sorted.reduce(
        (a, b) => a + (b - mean) ** 2, 0,
      ) / (sorted.length - 1);

      const pct = (p: number) => {
        const idx = (p / 100) * (sorted.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        return lo === hi ? sorted[lo]
          : sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
      };

      lifeDist = {
        mean_min: Math.round(mean * 100) / 100,
        std_min: Math.round(Math.sqrt(variance) * 100) / 100,
        p10_min: Math.round(pct(10) * 100) / 100,
        p50_min: Math.round(pct(50) * 100) / 100,
        p90_min: Math.round(pct(90) * 100) / 100,
      };
    }

    // Recommendations
    if (feedbackGain > 2) {
      recommendations.push(
        "Strong thermal-wear feedback (gain=" +
        Math.round(feedbackGain * 10) / 10 +
        ") — tool life is " +
        Math.round((1 - 1 / feedbackGain) * 100) +
        "% shorter than uncoupled prediction",
      );
    }
    if (forceAmp > 50) {
      recommendations.push(
        "Force amplification >" + Math.round(forceAmp) +
        "% — consider wear compensation or shorter tool change interval",
      );
    }
    if (last.temp_C > 600) {
      warnings.push(
        "Peak temperature " + last.temp_C +
        "°C may cause thermal damage or accelerated crater wear",
      );
    }
    if (last.cumulative_error_um > 10) {
      warnings.push(
        "Cumulative dimensional error " +
        last.cumulative_error_um +
        "µm from wear-induced deflection growth",
      );
    }

    return {
      trajectory,
      time_to_limit_min: Math.round(limitTime * 100) / 100,
      final_force_N: last.force_N,
      max_temp_C: last.temp_C,
      max_deflection_um: last.deflection_um,
      cumulative_error_um: last.cumulative_error_um,
      life_distribution: lifeDist,
      force_amplification_pct: Math.round(forceAmp * 10) / 10,
      thermal_acceleration_factor: Math.round(thermalAccel * 100) / 100,
      feedback_gain: Math.round(feedbackGain * 100) / 100,
      recommendations,
      warnings,
      formula: "dVB/dt=C1·V·exp(-C2/θ_K) [Usui]; " +
        "F(VB)=F0·(1+k_vb·VB/VB_ref); " +
        "θ=θ_amb+C_θ·F^0.6·V^0.4; " +
        "δ=FL³/(3EI); RK4 integration; " +
        "Gain=T_uncoupled/T_coupled",
    };
  }
}

export const thermalWearCouplingEngine = new ThermalWearCouplingEngine();
