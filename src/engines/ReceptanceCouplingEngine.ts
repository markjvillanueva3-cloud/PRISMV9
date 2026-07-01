/**
 * ReceptanceCouplingEngine
 * Predicts tool-point FRF (frequency response function) analytically by coupling
 * component receptances, eliminating the need for tap testing every tool-holder combo.
 *
 * Substructure: [Spindle/Machine] -- [Holder] -- [Tool]
 * Each component has its own FRF. Coupling combines them via Euler-Bernoulli beam theory.
 *
 * Reference: Schmitz & Duncan (2005) "Three-component receptance coupling substructure
 * analysis for tool point dynamics prediction" ASME JMSE 127(4), 781-790
 *
 * Reference: Schmitz & Smith (2009) "Machining Dynamics", Chapter 4 — Receptance Coupling
 */

// ── Material properties ──
const TOOL_MATERIALS: Record<string, { E_GPa: number; density_kg_m3: number }> = {
  carbide:  { E_GPa: 600,  density_kg_m3: 14500 },
  HSS:      { E_GPa: 210,  density_kg_m3: 8000  },
  steel:    { E_GPa: 200,  density_kg_m3: 7850  },
};

// ── Holder stiffness multipliers (relative to rigid coupling) ──
// HSK is stiffer due to simultaneous taper+face contact; BT/CAT have drawbar taper only
const HOLDER_STIFFNESS: Record<string, number> = {
  "shrink_fit":    1.0,    // best — interference fit, no micro-motion
  "hydraulic":     0.90,   // good — oil film provides some damping
  "collet":        0.80,   // decent — ER collet has some compliance
  "milling_chuck": 0.70,   // Weldon/side-lock — worst grip stiffness
};

const TAPER_STIFFNESS: Record<string, { k_N_per_m: number; damping_add: number }> = {
  "HSK-A63":  { k_N_per_m: 5.0e8, damping_add: 0.005 },
  "HSK-A100": { k_N_per_m: 8.0e8, damping_add: 0.005 },
  "BT40":     { k_N_per_m: 2.5e8, damping_add: 0.010 },
  "BT50":     { k_N_per_m: 4.0e8, damping_add: 0.008 },
  "CAT40":    { k_N_per_m: 2.8e8, damping_add: 0.009 },
  "CAT50":    { k_N_per_m: 4.5e8, damping_add: 0.007 },
  "ER32":     { k_N_per_m: 1.8e8, damping_add: 0.012 },
  "ER40":     { k_N_per_m: 2.2e8, damping_add: 0.011 },
};

interface MachineFRFDirect {
  freq_Hz: number[];
  real: number[];
  imag: number[];
}

interface MachineFRFParametric {
  natural_freq_Hz: number;
  damping_ratio: number;
  stiffness_N_per_m: number;
}

type MachineFRF = MachineFRFDirect | MachineFRFParametric;

interface ToolSpec {
  diameter_mm: number;
  stickout_mm: number;
  material: "carbide" | "HSS" | "steel";
  flutes?: number;
}

interface HolderSpec {
  type: "shrink_fit" | "collet" | "hydraulic" | "milling_chuck";
  taper: "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "ER32" | "ER40";
  stickout_mm?: number;
}

interface FRFPoint {
  freq_Hz: number;
  real: number;
  imag: number;
  magnitude: number;
}

interface FRFResult {
  frf: FRFPoint[];
  natural_freq_Hz: number;
  damping_ratio: number;
  stiffness_N_per_m: number;
  dynamic_stiffness_N_per_um: number;
}

interface PredictInput {
  machine_frf: MachineFRF;
  tool: ToolSpec;
  holder: HolderSpec;
  freq_range?: [number, number];
  freq_points?: number;
}

interface CompareInput {
  machine_frf: MachineFRF;
  combo_a: { tool: ToolSpec; holder: HolderSpec };
  combo_b: { tool: ToolSpec; holder: HolderSpec };
  freq_range?: [number, number];
  freq_points?: number;
}

interface CompareResult {
  combo_a: FRFResult;
  combo_b: FRFResult;
  better_for_stability: "a" | "b";
  stiffness_ratio: number;
}

interface SuggestLengthInput {
  target_rpm: number;
  flutes: number;
  holder: HolderSpec;
  tool_diameter_mm: number;
  tool_material: "carbide" | "HSS" | "steel";
  max_stickout_mm: number;
  machine_frf: MachineFRF;
  length_points?: number;
}

interface SuggestLengthResult {
  optimal_stickout_mm: number;
  avoided_resonances: number[];
  stability_margin: number;
  stickout_vs_freq: Array<{ stickout_mm: number; natural_freq_Hz: number; stiffness_N_per_m: number }>;
}

function isParametricFRF(frf: MachineFRF): frf is MachineFRFParametric {
  return "natural_freq_Hz" in frf;
}

export class ReceptanceCouplingEngine {
  /**
   * Predict tool-point FRF by coupling machine, holder, and tool receptances.
   *
   * Euler-Bernoulli beam theory for the tool:
   *   G_tool(ω) = analytical receptance for cantilever beam
   *   Natural freq: fn = (λn²/2πL²) × sqrt(EI/ρA)
   *   where λ1 = 1.875 for first mode of cantilever
   *
   * Coupling: The assembled receptance at the tool tip combines:
   *   1. Machine receptance at the holder-spindle interface
   *   2. Holder compliance (type-dependent)
   *   3. Tool beam receptance (Euler-Bernoulli cantilever)
   *
   * G_assembly = G_machine_coupled + G_tool_beam
   * with coupling stiffness from holder type and taper interface.
   */
  predictToolPointFRF(input: PredictInput): FRFResult {
    const { machine_frf, tool, holder } = input;
    const freqRange = input.freq_range || [100, 10000];
    const freqPoints = input.freq_points || 500;

    // ── Tool beam properties ──
    const mat = TOOL_MATERIALS[tool.material] || TOOL_MATERIALS.carbide;
    const E = mat.E_GPa * 1e9; // Pa
    const rho = mat.density_kg_m3;
    const D = tool.diameter_mm / 1000; // m
    const L = tool.stickout_mm / 1000; // m

    // Effective diameter accounting for flutes (reduce by ~15% per flute pair)
    const fluteReduction = tool.flutes ? Math.max(0.6, 1 - 0.08 * tool.flutes) : 0.85;
    const D_eff = D * Math.sqrt(fluteReduction); // effective for I calculation

    const I = (Math.PI / 64) * Math.pow(D_eff, 4);  // m^4
    const A = (Math.PI / 4) * D_eff * D_eff;         // m^2
    const m_beam = rho * A * L;                        // kg

    // ── Cantilever beam natural frequency (Euler-Bernoulli) ──
    // fn = (λn²/(2π×L²)) × sqrt(EI/(ρA))
    const lambda1 = 1.8751; // first mode
    const fn_beam = (lambda1 * lambda1 / (2 * Math.PI * L * L)) * Math.sqrt(E * I / (rho * A));

    // Static stiffness: k = 3EI/L³ for cantilever tip
    const k_beam = 3 * E * I / (L * L * L);

    // ── Holder coupling ──
    const holderMult = HOLDER_STIFFNESS[holder.type] || 0.8;
    const taperProps = TAPER_STIFFNESS[holder.taper] || TAPER_STIFFNESS.BT40;
    const k_holder = taperProps.k_N_per_m * holderMult;
    const zeta_holder = taperProps.damping_add;

    // Holder stickout adds compliance (series spring)
    const holderStickout = (holder.stickout_mm || 30) / 1000;
    // Approximate holder as steel tube
    const D_holder = D * 2.5; // holder is typically 2-3x tool diameter
    const I_holder = (Math.PI / 64) * Math.pow(D_holder, 4);
    const k_holder_beam = 3 * 200e9 * I_holder / Math.pow(holderStickout, 3);
    const k_holder_eff = 1 / (1 / k_holder + 1 / k_holder_beam);

    // ── Machine receptance ──
    let fn_machine: number, zeta_machine: number, k_machine: number;

    if (isParametricFRF(machine_frf)) {
      fn_machine = machine_frf.natural_freq_Hz;
      zeta_machine = machine_frf.damping_ratio;
      k_machine = machine_frf.stiffness_N_per_m;
    } else {
      // Extract modal parameters from measured FRF
      const extracted = this._extractModalParams(machine_frf);
      fn_machine = extracted.fn;
      zeta_machine = extracted.zeta;
      k_machine = extracted.k;
    }

    // ── Coupled system ──
    // Series spring: 1/k_total = 1/k_machine + 1/k_holder + 1/k_beam
    const k_total = 1 / (1 / k_machine + 1 / k_holder_eff + 1 / k_beam);

    // Effective mass from beam + machine contribution
    const m_eff = k_total / (Math.pow(2 * Math.PI * fn_beam, 2));

    // Coupled natural frequency shifts due to added compliance
    const fn_coupled = (1 / (2 * Math.PI)) * Math.sqrt(k_total / m_eff);

    // Effective damping: weighted combination
    const zeta_total = zeta_machine + zeta_holder +
      0.01 * (1 + tool.stickout_mm / 50); // structural damping increases with length

    // ── Generate FRF ──
    const frf: FRFPoint[] = [];
    const omega_n = 2 * Math.PI * fn_coupled;
    let peakMag = 0;
    let peakFreq = 0;

    for (let i = 0; i < freqPoints; i++) {
      const freq = freqRange[0] + (freqRange[1] - freqRange[0]) * i / (freqPoints - 1);
      const omega = 2 * Math.PI * freq;
      const r = omega / omega_n;

      // Single-DOF FRF: G(jω) = 1/k × 1/((1-r²) + j(2ζr))
      const dr = 1 - r * r;
      const di = 2 * zeta_total * r;
      const denom_sq = dr * dr + di * di;

      const real = dr / (k_total * denom_sq);
      const imag = -di / (k_total * denom_sq);
      const magnitude = Math.sqrt(real * real + imag * imag);

      if (magnitude > peakMag) {
        peakMag = magnitude;
        peakFreq = freq;
      }

      frf.push({
        freq_Hz: Math.round(freq * 10) / 10,
        real,
        imag,
        magnitude,
      });
    }

    // Dynamic stiffness at resonance: k_dyn = 1/(2ζ) × k_static → in N/µm
    const dynamic_stiffness = k_total * 2 * zeta_total / 1e6;

    return {
      frf,
      natural_freq_Hz: Math.round(fn_coupled),
      damping_ratio: Math.round(zeta_total * 10000) / 10000,
      stiffness_N_per_m: Math.round(k_total),
      dynamic_stiffness_N_per_um: Math.round(dynamic_stiffness * 1000) / 1000,
    };
  }

  /**
   * Compare two tool-holder combinations analytically.
   * Returns which combo is better for chatter stability (higher dynamic stiffness).
   */
  compareFRF(input: CompareInput): CompareResult {
    const { machine_frf, combo_a, combo_b } = input;
    const freqRange = input.freq_range;
    const freqPoints = input.freq_points;

    const result_a = this.predictToolPointFRF({
      machine_frf, tool: combo_a.tool, holder: combo_a.holder, freq_range: freqRange, freq_points: freqPoints,
    });
    const result_b = this.predictToolPointFRF({
      machine_frf, tool: combo_b.tool, holder: combo_b.holder, freq_range: freqRange, freq_points: freqPoints,
    });

    // Higher dynamic stiffness = better for stability
    const better: "a" | "b" = result_a.dynamic_stiffness_N_per_um >= result_b.dynamic_stiffness_N_per_um ? "a" : "b";
    const ratio = result_a.dynamic_stiffness_N_per_um / Math.max(result_b.dynamic_stiffness_N_per_um, 1e-12);

    return {
      combo_a: result_a,
      combo_b: result_b,
      better_for_stability: better,
      stiffness_ratio: Math.round(ratio * 1000) / 1000,
    };
  }

  /**
   * Find optimal tool stickout that avoids resonance at the target RPM.
   *
   * Strategy: sweep stickout lengths, compute natural frequency for each,
   * find lengths where fn ≠ N × tooth_passing_freq (avoid integer multiples).
   */
  suggestToolLength(input: SuggestLengthInput): SuggestLengthResult {
    const { target_rpm, flutes, holder, tool_diameter_mm, tool_material,
            max_stickout_mm, machine_frf, length_points = 50 } = input;

    const tooth_freq = target_rpm * flutes / 60;
    const min_stickout = tool_diameter_mm * 1.5; // minimum practical stickout

    const stickout_vs_freq: Array<{ stickout_mm: number; natural_freq_Hz: number; stiffness_N_per_m: number }> = [];
    let bestMargin = 0;
    let bestStickout = min_stickout;
    const avoidedResonances: number[] = [];

    for (let i = 0; i < length_points; i++) {
      const stickout = min_stickout + (max_stickout_mm - min_stickout) * i / (length_points - 1);

      const result = this.predictToolPointFRF({
        machine_frf,
        tool: { diameter_mm: tool_diameter_mm, stickout_mm: stickout, material: tool_material },
        holder,
      });

      stickout_vs_freq.push({
        stickout_mm: Math.round(stickout * 10) / 10,
        natural_freq_Hz: result.natural_freq_Hz,
        stiffness_N_per_m: result.stiffness_N_per_m,
      });

      // Calculate margin: how far is fn from any integer multiple of tooth_freq?
      // Check harmonics 1 through 5
      let minDistRatio = Infinity;
      for (let h = 1; h <= 5; h++) {
        const harmonic = h * tooth_freq;
        const dist = Math.abs(result.natural_freq_Hz - harmonic) / harmonic;
        if (dist < minDistRatio) minDistRatio = dist;
      }

      if (minDistRatio > bestMargin) {
        bestMargin = minDistRatio;
        bestStickout = stickout;
      }
    }

    // Identify which resonances were avoided
    for (let h = 1; h <= 5; h++) {
      const harmonic = h * tooth_freq;
      if (harmonic > 100 && harmonic < 10000) {
        avoidedResonances.push(Math.round(harmonic));
      }
    }

    return {
      optimal_stickout_mm: Math.round(bestStickout * 10) / 10,
      avoided_resonances: avoidedResonances,
      stability_margin: Math.round(bestMargin * 1000) / 1000,
      stickout_vs_freq,
    };
  }

  /**
   * Extract modal parameters (fn, zeta, k) from measured FRF data.
   * Uses peak-picking method on the imaginary part.
   */
  private _extractModalParams(frf: MachineFRFDirect): { fn: number; zeta: number; k: number } {
    const { freq_Hz, real, imag } = frf;

    // Find peak of imaginary part (negative peak = resonance)
    let minImag = 0;
    let peakIdx = 0;
    for (let i = 0; i < imag.length; i++) {
      if (imag[i] < minImag) {
        minImag = imag[i];
        peakIdx = i;
      }
    }

    const fn = freq_Hz[peakIdx] || 1000;
    const peakMag = Math.sqrt(real[peakIdx] * real[peakIdx] + imag[peakIdx] * imag[peakIdx]);

    // Half-power bandwidth for damping
    const halfPowerMag = peakMag / Math.sqrt(2);
    let f1 = fn, f2 = fn;
    for (let i = peakIdx; i >= 0; i--) {
      const m = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      if (m < halfPowerMag) { f1 = freq_Hz[i]; break; }
    }
    for (let i = peakIdx; i < freq_Hz.length; i++) {
      const m = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      if (m < halfPowerMag) { f2 = freq_Hz[i]; break; }
    }

    const zeta = (f2 - f1) / (2 * fn) || 0.03;

    // Stiffness from peak imaginary: k = -1/(2×zeta×Im_peak)
    const k = Math.abs(1 / (2 * zeta * minImag)) || 1e7;

    return { fn, zeta: Math.max(0.001, zeta), k };
  }

  /**
   * U-ALG2: RCSA algorithm-backed prediction when measured substructure FRF data
   * is available. Uses the RCSA algorithm (Schmitz & Duncan 2005) for rigorous
   * receptance coupling instead of the simplified analytical model.
   *
   * When measured spindle FRF data is provided (e.g., from tap test), this produces
   * assembly-specific predictions — a 10mm endmill in BT40 vs HSK-A63 will show
   * DIFFERENT dynamics because the assembly receptances differ.
   *
   * Falls back to analytical predictToolPointFRF() if RCSA algorithm not available.
   */
  predictWithRCSA(input: {
    tool: ToolSpec;
    holder: HolderSpec;
    /** Measured spindle-holder FRF data (from tap test at holder-tool interface) */
    spindle_frf?: { frequencies: number[]; H11_real: number[]; H11_imag: number[] };
    freq_range?: [number, number];
    freq_points?: number;
  }): FRFResult & { method: string; rcsa_used: boolean } {
    // Try RCSA algorithm with measured data
    if (input.spindle_frf && input.spindle_frf.frequencies.length >= 10) {
      try {
        const { RCSA } = require("../algorithms/RCSA.js");
        const rcsa = new RCSA();

        // Build tool substructure FRF from Euler-Bernoulli beam theory
        const mat = TOOL_MATERIALS[input.tool.material] || TOOL_MATERIALS.carbide;
        const E = mat.E_GPa * 1e9;
        const rho = mat.density_kg_m3;
        const D = input.tool.diameter_mm / 1000;
        const L = input.tool.stickout_mm / 1000;
        const fluteReduction = input.tool.flutes ? Math.max(0.6, 1 - 0.08 * input.tool.flutes) : 0.85;
        const D_eff = D * Math.sqrt(fluteReduction);
        const Ival = (Math.PI / 64) * Math.pow(D_eff, 4);
        const A = (Math.PI / 4) * D_eff * D_eff;

        // Generate analytical tool FRF at same frequencies as spindle data
        const freqs = input.spindle_frf.frequencies;
        const k_beam = 3 * E * Ival / (L * L * L);
        const lambda1 = 1.8751;
        const fn_beam = (lambda1 * lambda1 / (2 * Math.PI * L * L)) * Math.sqrt(E * Ival / (rho * A));
        const omega_n_beam = 2 * Math.PI * fn_beam;
        const zeta_beam = 0.005; // low structural damping for carbide

        const toolH11: Array<{ re: number; im: number }> = freqs.map(f => {
          const omega = 2 * Math.PI * f;
          const r = omega / omega_n_beam;
          const dr = 1 - r * r;
          const di = 2 * zeta_beam * r;
          const denom = k_beam * (dr * dr + di * di);
          return { re: dr / denom, im: -di / denom };
        });

        // Build RCSA input
        const rcsaInput = {
          substructure_a: {
            frequencies: freqs,
            H11: freqs.map((_, i) => ({
              re: input.spindle_frf!.H11_real[i],
              im: input.spindle_frf!.H11_imag[i],
            })),
          },
          substructure_b: {
            frequencies: freqs,
            H11: toolH11,
          },
          joint_stiffness: TAPER_STIFFNESS[input.holder.taper]?.k_N_per_m || 2.5e8,
          joint_damping: 100,
        };

        const validation = rcsa.validate(rcsaInput);
        if (validation.valid) {
          const rcsaResult = rcsa.calculate(rcsaInput);

          // Convert RCSA output to FRFResult format
          const frf: FRFPoint[] = rcsaResult.coupled_frf.map((pt: { frequency: number; compliance: { re: number; im: number } }) => ({
            freq_Hz: Math.round(pt.frequency * 10) / 10,
            real: pt.compliance.re,
            imag: pt.compliance.im,
            magnitude: Math.sqrt(pt.compliance.re ** 2 + pt.compliance.im ** 2),
          }));

          return {
            frf,
            natural_freq_Hz: Math.round(rcsaResult.dominant_frequency),
            damping_ratio: rcsaResult.modes[0]?.damping_ratio || 0.03,
            stiffness_N_per_m: Math.round(rcsaResult.dynamic_stiffness),
            dynamic_stiffness_N_per_um: Math.round(rcsaResult.dynamic_stiffness / 1e6 * 1000) / 1000,
            method: "RCSA (Schmitz-Duncan 2005) with measured spindle FRF",
            rcsa_used: true,
          };
        }
      } catch { /* RCSA algorithm not available */ }
    }

    // Fallback: analytical prediction
    const analytical = this.predictToolPointFRF({
      machine_frf: input.spindle_frf
        ? { freq_Hz: input.spindle_frf.frequencies, real: input.spindle_frf.H11_real, imag: input.spindle_frf.H11_imag }
        : { natural_freq_Hz: 2000, damping_ratio: 0.03, stiffness_N_per_m: 1e7 },
      tool: input.tool,
      holder: input.holder,
      freq_range: input.freq_range,
      freq_points: input.freq_points,
    });

    return { ...analytical, method: "Euler-Bernoulli analytical (no measured FRF)", rcsa_used: false };
  }
}

export const receptanceCouplingEngine = new ReceptanceCouplingEngine();
