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
 *   dVB/dt = C1 · σ_n · V_s · exp(-C2/θ)  (Usui wear, canonical form)
 *   dθ/dt  = (Q_gen - Q_diss) / (ρ·cp·Vol) (thermal balance)
 *   dδ/dt  = (dF/dVB · dVB/dt) · L³/(3EI)  (deflection from force)
 *   dΣε/dt = |dδ/dt|                        (cumulative error)
 *
 * Where:
 *   σ_n    = contact normal stress on rake face (MPa)
 *   V_s    = V_c / r_chip  (chip sliding velocity, m/min)
 *   r_chip = chip compression ratio (typically 1.5–3.0)
 *   F(VB)  = F0 · (1 + k_vb · VB/VB_ref)   (force grows with wear)
 *   θ_base = θ_amb + C_θ · F^0.6 · V^0.4   (baseline temperature)
 *   Q_gen  = η_heat · F · V / 60            (heat generation, W)
 *   Q_diss = h · A_contact · (θ - θ_amb)    (convective dissipation, W)
 *
 * Monte Carlo: run N ODE integrations with uncertain initial conditions
 *
 * References:
 * - Usui, E., Shirakashi, T. & Kitagawa, T. (1978). "Analytical Prediction
 *   of Three Dimensional Cutting Process — Part 3: Cutting Temperature and
 *   Crater Wear of Carbide Tool". J. Eng. Ind., 100(2), 236–243.
 *   Canonical form: dW/dt = A · σ_n · V_s · exp(-B / T)
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
  usui_C1?: number;         // wear rate coefficient (Usui A)
  usui_C2?: number;         // thermal activation (K) (Usui B)
  wear_force_factor?: number; // k_vb: force increase per mm VB
  wear_limit_mm?: number;    // VB limit (typically 0.3mm)

  /**
   * Normal contact stress on the rake face (MPa).
   * Usui (1978) canonical term: σ_n in dW/dt = A · σ_n · V_s · exp(-B/T).
   * If omitted, estimated as F_c / (a_p · h) when depth/feed are available,
   * otherwise defaults to 500 MPa (typical carbide-on-steel).
   */
  contact_stress_mpa?: number;

  /**
   * Chip compression ratio r_chip = h_chip / h_uncut (dimensionless, typically 1.5–3.0).
   * Used to compute chip sliding velocity: V_s = V_c / r_chip.
   * Default: 2.0
   */
  chip_compression_ratio?: number;

  /** Thermal parameters */
  /** Fraction of cutting energy conducted into the tool (0.1–0.3). Default: 0.2 */
  heat_partition?: number;
  /** Convective heat transfer coefficient at tool surface (W/m^2·K). Default: 500 */
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
   * Usui (1978) canonical wear rate:
   *   dVB/dt = C1 · σ_n · V_s · exp(-C2 / T_K)
   *
   * Where:
   *   C1     = wear coefficient (Usui A)
   *   σ_n    = normal contact stress on rake face (MPa)
   *   V_s    = chip sliding velocity (m/min) = V_c / chip_compression_ratio
   *   C2     = thermal activation energy constant (K) (Usui B)
   *   T_K    = interface temperature (K)
   *
   * @param C1 - Usui wear coefficient A
   * @param C2 - Usui thermal activation constant B (K)
   * @param Vs_m_min - Chip sliding velocity (m/min)
   * @param sigma_n_MPa - Normal contact stress on rake face (MPa)
   * @param tempK - Tool-chip interface temperature (K)
   * @returns Wear rate dVB/dt (mm/min)
   *
   * Reference: Usui, E. et al. (1978). "Analytical Prediction of Three
   * Dimensional Cutting Process — Part 3". J. Eng. Ind., 100(2), 236–243.
   */
  wearRate(
    C1: number, C2: number, Vs_m_min: number,
    sigma_n_MPa: number, tempK: number,
  ): number {
    if (tempK <= 0) return 0;
    return C1 * sigma_n_MPa * Vs_m_min * Math.exp(-C2 / tempK);
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
   * Cutting temperature model with heat partition and convective dissipation.
   *
   * Base temperature (empirical Loewen-Shaw type):
   *   θ_base = θ_amb + C_θ · F^0.6 · V^0.4
   *
   * Thermal balance correction:
   *   Q_gen  = η · F · (V/60)                    (W, heat into tool)
   *   Q_diss = h · A_contact · (θ_base - θ_amb)  (W, convective loss)
   *   Δθ     = (Q_gen - Q_diss) / (h · A_contact) (steady-state correction)
   *
   * A_contact is estimated from tool-chip contact length (~2mm) x depth of cut.
   *
   * @param F - Cutting force (N)
   * @param V_m_min - Cutting speed (m/min)
   * @param ambientC - Ambient temperature (deg C)
   * @param heatPartition - Fraction of cutting power entering tool (0.1–0.3)
   * @param convH - Convective heat transfer coefficient (W/m^2·K)
   * @param depth_mm - Depth of cut (mm), used for contact area estimate
   * @returns Temperature at tool-chip interface (deg C)
   */
  tempFromForce(
    F: number, V_m_min: number, ambientC: number,
    heatPartition: number = 0.2, convH: number = 500,
    depth_mm: number = 2.0,
  ): number {
    const Ctheta = 0.08; // empirical calibration constant
    const thetaBase = ambientC + Ctheta * Math.pow(F, 0.6) * Math.pow(V_m_min, 0.4);

    // Contact area estimate: chip contact length (~2mm) x depth of cut
    const contactLength_m = 0.002; // ~2mm typical tool-chip contact
    const depth_m = depth_mm / 1000;
    const A_contact = contactLength_m * depth_m; // m^2

    // Heat generation into tool (W): η · F · V, with V in m/s
    const V_m_s = V_m_min / 60;
    const Q_gen = heatPartition * F * V_m_s;

    // Convective dissipation at base temperature (W)
    const Q_diss = convH * A_contact * (thetaBase - ambientC);

    // Net thermal correction: positive means hotter than empirical base
    // Steady-state: ΔT = (Q_gen - Q_diss) / (h · A)
    const hA = convH * A_contact;
    if (hA <= 0) return thetaBase;

    const deltaT = (Q_gen - Q_diss) / hA;
    return thetaBase + deltaT;
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
   *
   * State vector: [VB, θ, δ, Σε]
   *
   * The wear ODE uses the canonical Usui (1978) form:
   *   dVB/dt = C1 · σ_n · V_s · exp(-C2 / T_K)
   *
   * @param F0 - Initial cutting force (N)
   * @param Vc - Cutting speed (m/min)
   * @param C1 - Usui wear coefficient A
   * @param C2 - Usui thermal activation constant B (K)
   * @param sigma_n - Normal contact stress on rake face (MPa)
   * @param chipRatio - Chip compression ratio (dimensionless)
   * @param kVB - Wear-force sensitivity factor
   * @param VBref - Reference flank wear for force model (mm)
   * @param VBlimit - Flank wear limit (mm)
   * @param heatPartition - Fraction of cutting power entering tool
   * @param convH - Convective heat transfer coefficient (W/m^2·K)
   * @param ambientC - Ambient temperature (deg C)
   * @param depth_mm - Depth of cut (mm)
   * @param toolD - Tool diameter (mm)
   * @param toolL - Tool overhang (mm)
   * @param toolE - Tool elastic modulus (GPa)
   * @param totalTime_min - Simulation duration (min)
   * @param dt_s - Time step (s)
   * @returns Trajectory points and time to wear limit
   */
  integrateODE(
    F0: number, Vc: number, C1: number, C2: number,
    sigma_n: number, chipRatio: number,
    kVB: number, VBref: number, VBlimit: number,
    heatPartition: number, convH: number, ambientC: number,
    depth_mm: number,
    toolD: number, toolL: number, toolE: number,
    totalTime_min: number, dt_s: number,
  ): { trajectory: TimePoint[]; limitTime: number } {
    const dt_min = dt_s / 60;
    const nSteps = Math.ceil(totalTime_min / dt_min);
    const trajectory: TimePoint[] = [];

    // Chip sliding velocity: V_s = V_c / r_chip (Usui 1978)
    const Vs = Vc / chipRatio;

    let VB = 0;       // flank wear (mm)
    let cumError = 0;  // cumulative dimensional error (µm)
    let limitTime = totalTime_min;
    let limitReached = false;

    for (let step = 0; step <= nSteps; step++) {
      const t = step * dt_min;

      // Current force from wear
      const F = this.forceFromWear(F0, VB, kVB, VBref);
      // Current temperature (with heat partition and convection)
      const theta = this.tempFromForce(F, Vc, ambientC, heatPartition, convH, depth_mm);
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
      // Usui canonical: dVB/dt = C1 · σ_n · V_s · exp(-C2 / T_K)
      const thetaK = theta + 273.15;
      const k1 = this.wearRate(C1, C2, Vs, sigma_n, thetaK);

      const VB2 = VB + 0.5 * dt_min * k1;
      const F2 = this.forceFromWear(F0, VB2, kVB, VBref);
      const th2 = this.tempFromForce(F2, Vc, ambientC, heatPartition, convH, depth_mm) + 273.15;
      const k2 = this.wearRate(C1, C2, Vs, sigma_n, th2);

      const VB3 = VB + 0.5 * dt_min * k2;
      const F3 = this.forceFromWear(F0, VB3, kVB, VBref);
      const th3 = this.tempFromForce(F3, Vc, ambientC, heatPartition, convH, depth_mm) + 273.15;
      const k3 = this.wearRate(C1, C2, Vs, sigma_n, th3);

      const VB4 = VB + dt_min * k3;
      const F4 = this.forceFromWear(F0, VB4, kVB, VBref);
      const th4 = this.tempFromForce(F4, Vc, ambientC, heatPartition, convH, depth_mm) + 273.15;
      const k4 = this.wearRate(C1, C2, Vs, sigma_n, th4);

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
    const ap = input.depth_of_cut_mm;
    const f = input.feed_mm_rev;
    // Usui canonical C1 default: rescaled for dVB/dt = C1 · σ_n · V_s · exp(-C2/T_K).
    // The old simplified form used C1=5e-4 with dVB/dt = C1 · V · exp(-C2/T), but
    // the canonical form multiplies by σ_n (MPa) and divides V by chip_ratio, so
    // C1 must be ~3 orders of magnitude smaller to produce equivalent wear rates.
    // Typical calibrated range: 1e-7 to 1e-5 (Usui 1978, Table 2).
    const C1 = input.usui_C1 ?? 1e-6;
    const C2 = input.usui_C2 ?? 3000;
    const kVB = input.wear_force_factor ?? 3.0;
    const VBref = 0.3;
    const VBlimit = input.wear_limit_mm ?? 0.3;
    const chipRatio = input.chip_compression_ratio ?? 2.0;
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

    // Contact stress: user-provided, or estimate from Fc/(ap*f), or default 500 MPa
    let sigma_n: number;
    if (input.contact_stress_mpa != null) {
      sigma_n = input.contact_stress_mpa;
    } else if (ap > 0 && f > 0) {
      // Estimate: σ_n ≈ F_c / (a_p · f) where a_p and f are in mm
      // Contact area ≈ a_p * f (mm^2), force in N, so stress in MPa (N/mm^2)
      sigma_n = F0 / (ap * f);
    } else {
      // Typical contact stress for carbide-on-steel (Usui 1978 range: 300–800 MPa)
      sigma_n = 500;
    }

    if (chipRatio < 1.0) {
      warnings.push(
        "chip_compression_ratio=" + chipRatio +
        " is below physical minimum of 1.0; clamped to 1.0",
      );
    }
    const chipRatioClamped = Math.max(1.0, chipRatio);

    // Deterministic run
    const { trajectory, limitTime } = this.integrateODE(
      F0, V, C1, C2, sigma_n, chipRatioClamped,
      kVB, VBref, VBlimit,
      heatPart, convH, ambientC, ap,
      toolD, toolL, toolE,
      simTime, dt,
    );

    const last = trajectory[trajectory.length - 1];
    const first = trajectory[0];

    const forceAmp = first.force_N > 0
      ? ((last.force_N - first.force_N) / first.force_N) * 100 : 0;

    // Thermal acceleration: wear rate at end vs start (Usui canonical)
    const Vs = V / chipRatioClamped;
    const thetaStart = first.temp_C + 273.15;
    const thetaEnd = last.temp_C + 273.15;
    const rateStart = this.wearRate(C1, C2, Vs, sigma_n, thetaStart);
    const rateEnd = this.wearRate(C1, C2, Vs, sigma_n, thetaEnd);
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
          sigma_n, chipRatioClamped,
          kVB, VBref, VBlimit,
          heatPart, convH, ambientC, ap,
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
      formula: "dVB/dt=C1·σ_n·V_s·exp(-C2/T_K) [Usui 1978]; " +
        "V_s=V_c/r_chip; " +
        "F(VB)=F0·(1+k_vb·VB/VB_ref); " +
        "θ=θ_base+ΔT_partition; " +
        "Q_gen=η·F·V; Q_diss=h·A·(θ-θ_amb); " +
        "δ=FL³/(3EI); RK4 integration; " +
        "Gain=T_uncoupled/T_coupled",
    };
  }
}

export const thermalWearCouplingEngine = new ThermalWearCouplingEngine();
