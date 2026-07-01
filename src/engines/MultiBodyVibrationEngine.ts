/**
 * MultiBodyVibrationEngine — Coupled Tool-Holder-Workpiece Dynamics
 *
 * Models the machining system as coupled mass-spring-damper bodies:
 * tool + holder + spindle + workpiece + fixture. Predicts system natural
 * frequencies and coupled chatter modes invisible to single-body analysis.
 *
 * Physics: [M]{ẍ} + [C]{ẋ} + [K]{x} = {F(t)}
 * Method: Receptance Coupling Substructure Analysis (RCSA)
 *
 * References:
 *   - Schmitz & Smith (2009): Machining Dynamics — RCSA method
 *   - Altintas (2012): Manufacturing Automation — stability lobes
 *   - Ewins (2000): Modal Testing — FRF fundamentals
 *
 * @module MultiBodyVibrationEngine
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ComponentProps {
  name: string;
  mass_kg: number;
  stiffness_N_m: number;    // N/m
  damping_ratio: number;    // ζ (0-1)
  natural_freq_Hz?: number; // computed if not provided
}

export interface SystemComponent {
  id: string;
  props: ComponentProps;
  /** Connection to next component (null = free end) */
  connected_to?: string;
}

export interface SystemModel {
  components: SystemComponent[];
  M: number[][];  // mass matrix
  C: number[][];  // damping matrix
  K: number[][];  // stiffness matrix
  n_dof: number;  // degrees of freedom
}

export interface FRFPoint {
  freq_Hz: number;
  real: number;
  imag: number;
  magnitude: number;
  phase_deg: number;
}

export interface SystemFRF {
  /** Frequency response function points */
  points: FRFPoint[];
  /** Natural frequencies (peaks) */
  natural_frequencies_Hz: number[];
  /** Peak magnitudes at natural frequencies */
  peak_magnitudes: number[];
  /** Damping ratios at peaks (half-power bandwidth) */
  damping_ratios: number[];
  /** Frequency range analyzed */
  freq_range_Hz: [number, number];
}

export interface CoupledMode {
  frequency_Hz: number;
  magnitude: number;
  /** Mode shape — relative amplitude per DOF */
  mode_shape: number[];
  /** Which components contribute most */
  dominant_components: string[];
  /** Would single-body analysis find this? */
  visible_to_single_body: boolean;
}

export interface StabilityResult {
  /** RPM values */
  rpm_values: number[];
  /** Critical depth of cut at each RPM (mm) */
  ap_limit_mm: number[];
  /** Stable/unstable classification at each RPM */
  stable: boolean[];
  /** Maximum stable depth across all RPMs */
  max_stable_ap_mm: number;
  /** RPM for maximum stable depth */
  optimal_rpm: number;
  /** Comparison with single-body lobes */
  single_body_max_ap_mm: number;
  /** Coupled modes that reduce stability */
  limiting_modes: CoupledMode[];
}

// ─── Predefined Component Libraries ─────────────────────────────────

const TOOL_LIBRARY: Record<string, ComponentProps> = {
  "endmill_10mm": { name: "10mm Carbide Endmill", mass_kg: 0.05, stiffness_N_m: 8e6, damping_ratio: 0.02 },
  "endmill_20mm": { name: "20mm Carbide Endmill", mass_kg: 0.12, stiffness_N_m: 25e6, damping_ratio: 0.02 },
  "endmill_6mm": { name: "6mm Carbide Endmill", mass_kg: 0.02, stiffness_N_m: 2e6, damping_ratio: 0.025 },
  "boring_bar_16mm": { name: "16mm Boring Bar", mass_kg: 0.15, stiffness_N_m: 3e6, damping_ratio: 0.03 },
};

const HOLDER_LIBRARY: Record<string, ComponentProps> = {
  "shrink_fit": { name: "Shrink Fit Holder", mass_kg: 0.8, stiffness_N_m: 150e6, damping_ratio: 0.01 },
  "collet_er32": { name: "ER32 Collet Chuck", mass_kg: 1.0, stiffness_N_m: 80e6, damping_ratio: 0.015 },
  "hydraulic": { name: "Hydraulic Chuck", mass_kg: 1.2, stiffness_N_m: 120e6, damping_ratio: 0.02 },
  "milling_chuck": { name: "Milling Chuck", mass_kg: 0.9, stiffness_N_m: 60e6, damping_ratio: 0.018 },
};

const SPINDLE_LIBRARY: Record<string, ComponentProps> = {
  "bt40_12000": { name: "BT40 12000rpm Spindle", mass_kg: 25, stiffness_N_m: 200e6, damping_ratio: 0.03 },
  "hsk63_20000": { name: "HSK63 20000rpm Spindle", mass_kg: 18, stiffness_N_m: 350e6, damping_ratio: 0.025 },
  "cat50_8000": { name: "CAT50 8000rpm Spindle", mass_kg: 40, stiffness_N_m: 400e6, damping_ratio: 0.035 },
};

const WORKPIECE_LIBRARY: Record<string, ComponentProps> = {
  "block_small": { name: "Small Block (100x100x50)", mass_kg: 4, stiffness_N_m: 500e6, damping_ratio: 0.005 },
  "block_medium": { name: "Medium Block (200x200x100)", mass_kg: 30, stiffness_N_m: 800e6, damping_ratio: 0.005 },
  "thin_wall": { name: "Thin Wall (2mm)", mass_kg: 0.5, stiffness_N_m: 5e6, damping_ratio: 0.008 },
  "long_part": { name: "Long Shaft (L/D=8)", mass_kg: 2, stiffness_N_m: 15e6, damping_ratio: 0.01 },
};

// ─── Engine ─────────────────────────────────────────────────────────

export class MultiBodyVibrationEngine {

  /**
   * Assemble system matrices [M], [C], [K] from component chain.
   * Each component adds one DOF. Components are connected in series.
   */
  assembleSystem(components: SystemComponent[]): SystemModel {
    const n = components.length;
    const M = Array.from({ length: n }, () => Array(n).fill(0));
    const C = Array.from({ length: n }, () => Array(n).fill(0));
    const K = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      const { mass_kg, stiffness_N_m, damping_ratio } = components[i].props;
      const c_i = 2 * damping_ratio * Math.sqrt(stiffness_N_m * mass_kg); // critical damping

      // Mass matrix (diagonal)
      M[i][i] = mass_kg;

      // Stiffness matrix (tridiagonal for series connection)
      if (i === 0) {
        K[i][i] = stiffness_N_m;
      } else {
        K[i][i] += stiffness_N_m;
        K[i - 1][i - 1] += stiffness_N_m;
        K[i][i - 1] = -stiffness_N_m;
        K[i - 1][i] = -stiffness_N_m;
      }

      // Damping matrix (same structure as K)
      if (i === 0) {
        C[i][i] = c_i;
      } else {
        C[i][i] += c_i;
        C[i - 1][i - 1] += c_i;
        C[i][i - 1] = -c_i;
        C[i - 1][i] = -c_i;
      }
    }

    return { components, M, C, K, n_dof: n };
  }

  /**
   * Compute system FRF via receptance at the tool tip (first DOF).
   * H(ω) = [K - ω²M + jωC]⁻¹ — we compute the (0,0) element.
   * For a chain system, use forward/backward sweep instead of full inversion.
   */
  computeSystemFRF(
    system: SystemModel,
    freqRange?: [number, number],
    numPoints?: number,
  ): SystemFRF {
    const [fMin, fMax] = freqRange ?? [10, 5000];
    const N = numPoints ?? 500;
    const points: FRFPoint[] = [];
    const n = system.n_dof;

    for (let i = 0; i <= N; i++) {
      const f = fMin + (fMax - fMin) * (i / N);
      const omega = 2 * Math.PI * f;

      // Build dynamic stiffness matrix: D = K - ω²M + jωC
      // For simplicity, solve 2×2 or use direct formula for chain systems
      // General case: compute det and cofactors for H(0,0)

      // For the chain system, compute tip FRF using impedance coupling
      let realPart = 0;
      let imagPart = 0;

      if (n === 1) {
        const k = system.K[0][0];
        const m = system.M[0][0];
        const c = system.C[0][0];
        const denom_r = k - omega * omega * m;
        const denom_i = omega * c;
        const denom2 = denom_r * denom_r + denom_i * denom_i;
        realPart = denom_r / denom2;
        imagPart = -denom_i / denom2;
      } else {
        // For multi-DOF: build impedance from ground up
        // Z_tip = k1 - ω²m1 + jωc1 + (coupling to rest of chain)
        // Recursive impedance for series chain:
        // Z_n = k_n - ω²m_n + jωc_n (last body, grounded)
        // Z_i = k_i - ω²m_i + jωc_i + k_{i+1}²/(Z_{i+1})

        // Start from the grounded end (last component)
        let Zr = system.K[n - 1][n - 1] - omega * omega * system.M[n - 1][n - 1];
        let Zi = omega * system.C[n - 1][n - 1];

        // Sweep backward to tip
        for (let j = n - 2; j >= 0; j--) {
          const k_coupling = Math.abs(system.K[j][j + 1]); // coupling stiffness
          const m_j = system.M[j][j];
          const k_j = system.K[j][j] - k_coupling; // self stiffness minus coupling
          const c_j = system.C[j][j];

          // Coupling impedance: k_c² / Z_{j+1}
          const Zden = Zr * Zr + Zi * Zi;
          const coupR = k_coupling * k_coupling * Zr / Zden;
          const coupI = -k_coupling * k_coupling * Zi / Zden;

          Zr = (k_j + k_coupling) - omega * omega * m_j + coupR;
          Zi = omega * c_j + coupI;
        }

        // FRF = 1/Z_tip
        const Zden = Zr * Zr + Zi * Zi;
        realPart = Zr / Zden;
        imagPart = -Zi / Zden;
      }

      const magnitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
      const phase = Math.atan2(imagPart, realPart) * 180 / Math.PI;

      points.push({
        freq_Hz: parseFloat(f.toFixed(2)),
        real: realPart,
        imag: imagPart,
        magnitude,
        phase_deg: parseFloat(phase.toFixed(2)),
      });
    }

    // Find peaks (natural frequencies)
    const naturalFreqs: number[] = [];
    const peakMags: number[] = [];
    const dampingRatios: number[] = [];

    for (let i = 1; i < points.length - 1; i++) {
      if (points[i].magnitude > points[i - 1].magnitude &&
          points[i].magnitude > points[i + 1].magnitude &&
          points[i].magnitude > points[0].magnitude * 2) {
        naturalFreqs.push(points[i].freq_Hz);
        peakMags.push(points[i].magnitude);

        // Half-power bandwidth for damping
        const halfPower = points[i].magnitude / Math.SQRT2;
        let f1 = points[i].freq_Hz;
        let f2 = points[i].freq_Hz;
        for (let j = i - 1; j >= 0; j--) {
          if (points[j].magnitude < halfPower) { f1 = points[j].freq_Hz; break; }
        }
        for (let j = i + 1; j < points.length; j++) {
          if (points[j].magnitude < halfPower) { f2 = points[j].freq_Hz; break; }
        }
        const zeta = (f2 - f1) / (2 * points[i].freq_Hz);
        dampingRatios.push(parseFloat(Math.max(zeta, 0.001).toFixed(4)));
      }
    }

    return {
      points,
      natural_frequencies_Hz: naturalFreqs,
      peak_magnitudes: peakMags,
      damping_ratios: dampingRatios,
      freq_range_Hz: [fMin, fMax],
    };
  }

  /**
   * Identify coupled modes — which frequencies are system modes vs single-component.
   */
  predictCoupledModes(system: SystemModel, frf: SystemFRF): CoupledMode[] {
    const modes: CoupledMode[] = [];

    // Compute individual component natural frequencies
    const componentFreqs = system.components.map(c => {
      const fn = c.props.natural_freq_Hz ??
        (1 / (2 * Math.PI)) * Math.sqrt(c.props.stiffness_N_m / c.props.mass_kg);
      return { id: c.id, freq: fn };
    });

    for (let i = 0; i < frf.natural_frequencies_Hz.length; i++) {
      const sysFreq = frf.natural_frequencies_Hz[i];
      const magnitude = frf.peak_magnitudes[i];

      // Check if this system frequency is near any single-component frequency
      const nearComponent = componentFreqs.find(cf =>
        Math.abs(cf.freq - sysFreq) / sysFreq < 0.15
      );

      // Estimate mode shape (simplified — based on mass participation)
      const modeShape = system.components.map(c => {
        const compFreq = c.props.natural_freq_Hz ??
          (1 / (2 * Math.PI)) * Math.sqrt(c.props.stiffness_N_m / c.props.mass_kg);
        // Components near system frequency contribute more
        const freqRatio = sysFreq / compFreq;
        return 1 / (1 + (freqRatio - 1) ** 2 * 10);
      });

      // Normalize mode shape
      const maxShape = Math.max(...modeShape);
      const normalizedShape = modeShape.map(s => parseFloat((s / maxShape).toFixed(3)));

      // Dominant components: those with > 50% participation
      const dominant = system.components
        .filter((_, idx) => normalizedShape[idx] > 0.5)
        .map(c => c.id);

      modes.push({
        frequency_Hz: sysFreq,
        magnitude,
        mode_shape: normalizedShape,
        dominant_components: dominant,
        visible_to_single_body: !!nearComponent,
      });
    }

    return modes;
  }

  /**
   * Compute coupled stability lobes using the system FRF.
   * ap_lim = -1 / (2*Kf*Re[G(ω_c)]) where Kf is cutting force coefficient.
   */
  stabilityLobesCoupled(
    system: SystemModel,
    frf: SystemFRF,
    flute_count: number,
    kc1_1: number,
    rpmRange?: [number, number],
    numRPM?: number,
  ): StabilityResult {
    const [rpmMin, rpmMax] = rpmRange ?? [1000, 20000];
    const N = numRPM ?? 200;
    const rpmValues: number[] = [];
    const apLimits: number[] = [];
    const stableFlags: boolean[] = [];

    // Cutting force coefficient for stability (tangential)
    const Kt = kc1_1; // N/mm²

    for (let i = 0; i <= N; i++) {
      const rpm = rpmMin + (rpmMax - rpmMin) * (i / N);
      rpmValues.push(Math.round(rpm));

      // Tooth passing frequency
      const ftooth = rpm * flute_count / 60;

      // Find FRF value near tooth passing frequency
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let j = 0; j < frf.points.length; j++) {
        const dist = Math.abs(frf.points[j].freq_Hz - ftooth);
        if (dist < bestDist) { bestDist = dist; bestIdx = j; }
      }

      const G_real = frf.points[bestIdx].real;

      // Stability limit: ap_lim = -1 / (2 * Kt * Re[G])
      // Only valid when Re[G] < 0 (negative real part = unstable zone)
      let apLim: number;
      if (G_real < 0) {
        apLim = -1 / (2 * Kt * G_real * 1e-6); // convert to mm
        apLim = Math.min(apLim, 50); // cap at reasonable value
      } else {
        apLim = 50; // unconditionally stable at this RPM
      }

      apLimits.push(parseFloat(Math.max(apLim, 0.01).toFixed(3)));
      stableFlags.push(apLim > 0.5); // stable if > 0.5mm depth possible
    }

    // Find optimal RPM (maximum stable depth)
    let maxAp = 0;
    let optRPM = rpmMin;
    for (let i = 0; i < apLimits.length; i++) {
      if (apLimits[i] > maxAp) {
        maxAp = apLimits[i];
        optRPM = rpmValues[i];
      }
    }

    // Single-body comparison (tool only)
    const toolOnly = this.assembleSystem([system.components[0]]);
    const toolFRF = this.computeSystemFRF(toolOnly, frf.freq_range_Hz, 200);
    let singleBodyMax = 0;
    for (let i = 0; i <= N; i++) {
      const rpm = rpmMin + (rpmMax - rpmMin) * (i / N);
      const ftooth = rpm * flute_count / 60;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let j = 0; j < toolFRF.points.length; j++) {
        const dist = Math.abs(toolFRF.points[j].freq_Hz - ftooth);
        if (dist < bestDist) { bestDist = dist; bestIdx = j; }
      }
      const G_real = toolFRF.points[bestIdx].real;
      if (G_real < 0) {
        const ap = Math.min(-1 / (2 * Kt * G_real * 1e-6), 50);
        singleBodyMax = Math.max(singleBodyMax, ap);
      } else {
        singleBodyMax = Math.max(singleBodyMax, 50);
      }
    }

    // Find limiting coupled modes
    const modes = this.predictCoupledModes(system, frf);
    const limitingModes = modes.filter(m => !m.visible_to_single_body);

    return {
      rpm_values: rpmValues,
      ap_limit_mm: apLimits,
      stable: stableFlags,
      max_stable_ap_mm: parseFloat(maxAp.toFixed(3)),
      optimal_rpm: optRPM,
      single_body_max_ap_mm: parseFloat(singleBodyMax.toFixed(3)),
      limiting_modes: limitingModes,
    };
  }

  /**
   * Quick setup from library components.
   */
  quickSetup(
    toolKey: string,
    holderKey: string,
    spindleKey: string,
    workpieceKey?: string,
  ): SystemModel {
    const components: SystemComponent[] = [
      { id: "tool", props: TOOL_LIBRARY[toolKey] ?? TOOL_LIBRARY["endmill_10mm"] },
      { id: "holder", props: HOLDER_LIBRARY[holderKey] ?? HOLDER_LIBRARY["shrink_fit"] },
      { id: "spindle", props: SPINDLE_LIBRARY[spindleKey] ?? SPINDLE_LIBRARY["bt40_12000"] },
    ];
    if (workpieceKey) {
      components.push({ id: "workpiece", props: WORKPIECE_LIBRARY[workpieceKey] ?? WORKPIECE_LIBRARY["block_medium"] });
    }
    return this.assembleSystem(components);
  }

  /**
   * Dispatcher-compatible calculate method.
   */
  calculate(input: {
    action: "assemble_system" | "compute_frf" | "coupled_modes" | "stability_lobes" | "quick_setup";
    [key: string]: unknown;
  }): unknown {
    switch (input.action) {
      case "assemble_system":
        return this.assembleSystem(input.components as SystemComponent[]);

      case "compute_frf": {
        const system = input.system as SystemModel;
        return this.computeSystemFRF(system, input.freq_range as [number, number], input.num_points as number);
      }

      case "coupled_modes": {
        const system = input.system as SystemModel;
        const frf = input.frf as SystemFRF;
        return this.predictCoupledModes(system, frf);
      }

      case "stability_lobes": {
        const system = input.system as SystemModel;
        const frf = input.frf as SystemFRF;
        return this.stabilityLobesCoupled(
          system, frf,
          input.flute_count as number,
          input.kc1_1 as number,
          input.rpm_range as [number, number],
        );
      }

      case "quick_setup":
        return this.quickSetup(
          input.tool as string, input.holder as string,
          input.spindle as string, input.workpiece as string | undefined,
        );

      default:
        return { error: `Unknown action: ${input.action}` };
    }
  }
}
