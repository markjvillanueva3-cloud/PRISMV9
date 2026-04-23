/**
 * WEDMWireBreakPredictorEngine — Probability of wire break per pulse train.
 *
 * MS-P4-DL-CORE / U-P4-PR-02
 *
 * Base model — Weibull hazard for wire fatigue under cyclic spark stress
 * (Rajurkar & Wang 1993, Kunieda et al. 2005):
 *
 *     P(break | t) = 1 − exp(−(t / η)^β)
 *
 * Where η (scale, minutes) and β (shape) depend on:
 *   - peak current (higher I → faster degradation)
 *   - wire diameter (thinner → faster)
 *   - thickness × current density
 *   - tension margin (vs maker spec)
 *
 * The base η is computed from a current/thickness density model, tightened
 * by a LoRA correction layer trained on the residual log-hazard
 * (log_hazard_actual − log_hazard_base).
 *
 * Output: AtomicValue<probability>{ value ∈ [0,1] }.
 *
 * Brier score (calibration metric) is computed by `evaluate(predictions,
 * outcomes)`. Targets:
 *   - Brier ≤ 0.15 on synthetic (default coefficients)
 *   - Calibration curve within ±10% of identity diagonal
 *
 * Invariants (asserted by tests):
 *   1. Probability strictly in [0, 1] for any finite valid input.
 *   2. Higher peak current → strictly higher break probability (monotonic).
 *   3. Thinner wire → strictly higher probability (monotonic).
 *   4. Brier score on synthetic balanced fixture stays ≤ 0.15.
 *   5. Calibration bin error stays ≤ 10% on synthetic.
 *   6. Rejects NaN / Infinity inputs.
 *
 * @module engines/WEDMWireBreakPredictorEngine
 */

import {
  wedmLoRAAdapterEngine,
  type LoRAAdapter,
} from "./WEDMLoRAAdapterEngine.js";
import { wedmNeighborQueryEngine } from "./WEDMNeighborQueryEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WireBreakPredictionInput {
  /** Peak discharge current (A). */
  peakCurrentA: number;
  /** Wire diameter (mm). */
  wireDiameterMm: number;
  /** Workpiece thickness (mm). */
  thicknessMm: number;
  /** Wire tension as fraction of maker max (0..1.5). 1.0 = nominal. */
  tensionFraction?: number;
  /** Pulse-on time (µs). */
  pulseOnUs?: number;
  /** Cumulative cut time on this wire (min) — used for Weibull horizon. */
  cumulativeCutMin?: number;
  /** Wire material. */
  wireMaterial?: "brass" | "coated_brass" | "molybdenum" | "tungsten" | "zinc_coated" | "diffusion_annealed";
  /** Apply trained LoRA correction (default true). */
  useAdapter?: boolean;
  /**
   * MS-P5-GNN / U-P5-GNN-04: optional graph-prior blending. When true and a
   * lattice is loaded, the prediction is weighted toward the neighbor
   * confidence signal. The wire-break prior is a soft "evidence boost"
   * (neighbors don't carry break rates yet), so it acts through a confidence
   * bump — not a probability shift.
   */
  useGraphPrior?: boolean;
  graphPriorWeight?: number;
  /** Material context for the lattice query (default: infer tool_steel). */
  material?: "low_carbon_steel" | "tool_steel" | "stainless_steel" | "hardened_steel" | "aluminum" | "copper" | "brass" | "tungsten_carbide" | "titanium" | "inconel" | "graphite" | "other" | string;
  /** Controller hint for the lattice query (default fanuc). */
  controller?: "fanuc" | "sodick" | "makino" | "mitsubishi" | "agiecharmilles" | "accutex";
  /** Target Ra for lattice query (default 1.6 µm — mid-rough). */
  raTargetUm?: number;
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  confidence: number;
  source: string;
  warning?: string;
}

export interface WireBreakPrediction {
  probability: AtomicValue;
  baseHazard: number;
  correctionDelta: number;
  scaleEta: number;
  shapeBeta: number;
  appliedAdapter: string | null;
  /** MS-P5-GNN: present when graph prior was applied. */
  graphPrior?: {
    weight: number;
    neighborCount: number;
  } | null;
}

export interface WireBreakSample {
  input: WireBreakPredictionInput;
  /** Did the wire break during this prediction window? */
  broke: boolean;
}

export interface BrierEvaluation {
  /** Mean squared error of probability vs outcome. */
  brierScore: number;
  count: number;
  /** Per-bin reliability diagram. */
  bins: { binCenter: number; meanPredicted: number; meanActual: number; count: number }[];
  /** Worst-case |meanPredicted − meanActual| across bins with ≥1 sample. */
  maxCalibrationError: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_DIM = 5;
const ADAPTER_NAME = "wedm-break::default";
const DEFAULT_BETA = 1.6;            // Weibull shape, brass wire, JM Die fit
const NOMINAL_SCALE_BASIS_MIN = 25;  // η for I=8A, dw=0.25mm, t=20mm at tension 1.0
const TENSION_PENALTY = 0.5;         // η ← η · (1 − TENSION_PENALTY · max(0, tension−1))
const CURRENT_DENSITY_PENALTY = 0.65; // η ← η · exp(−CURRENT_DENSITY_PENALTY · J/J_ref)

const WIRE_AREA_REF_MM2 = Math.PI * 0.25 * 0.25 / 4; // dw=0.25 mm
const CURRENT_REF_A = 8;
const THICKNESS_REF_MM = 20;

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWireBreakPredictorEngine {
  predict(input: WireBreakPredictionInput, horizonMin?: number): WireBreakPrediction {
    this.assertFinite(input);
    if (input.peakCurrentA <= 0) throw new Error("WEDMWireBreakPredictorEngine: peakCurrentA must be > 0");
    if (input.wireDiameterMm <= 0) throw new Error("WEDMWireBreakPredictorEngine: wireDiameterMm must be > 0");
    if (input.thicknessMm <= 0) throw new Error("WEDMWireBreakPredictorEngine: thicknessMm must be > 0");

    const { eta, beta } = this.weibullScaleShape(input);
    const t = horizonMin ?? input.cumulativeCutMin ?? eta; // default: predict at η (≈63rd-pct)
    const baseHazardLog = -Math.pow(Math.max(t, 0) / eta, beta);
    const baseProb = 1 - Math.exp(baseHazardLog);

    const useAdapter = input.useAdapter !== false;
    const adapter = useAdapter ? wedmLoRAAdapterEngine.get(ADAPTER_NAME) : null;
    let correctionDelta = 0;
    if (adapter) {
      const features = this.extractFeatures(input, t);
      const W0 = this.zeroMatrix(1, FEATURE_DIM);
      correctionDelta = adapter.forward(features, W0).adapterPart[0];
    }

    const logitBase = this.logit(baseProb);
    const logitAdjusted = logitBase + correctionDelta;
    const probability = this.sigmoid(logitAdjusted);
    const clamped = Math.min(1 - 1e-9, Math.max(1e-9, probability));

    let uncertainty = Math.min(0.4, 0.05 + Math.abs(correctionDelta) * 0.1);

    // MS-P5-GNN / U-P5-GNN-04: graph-prior as evidence-boost (reduces uncertainty).
    let graphPrior: { weight: number; neighborCount: number } | null = null;
    let confidence = adapter ? 0.85 : 0.7;
    if (input.useGraphPrior === true) {
      const gp = this.tryGraphPrior(input);
      if (gp && gp.neighborCount > 0) {
        const w = this.clamp01(input.graphPriorWeight ?? 0.2);
        graphPrior = { weight: w, neighborCount: gp.neighborCount };
        uncertainty = uncertainty * Math.sqrt(1 - 0.25 * w);
        confidence = Math.min(0.95, confidence + 0.05 * w);
      }
    }

    const sourceTag =
      graphPrior && adapter ? "WEDMWireBreakPredictorEngine:weibull+lora+gnn" :
      graphPrior ? "WEDMWireBreakPredictorEngine:weibull+gnn" :
      adapter ? "WEDMWireBreakPredictorEngine:weibull+lora" :
      "WEDMWireBreakPredictorEngine:weibull";

    const result: WireBreakPrediction = {
      probability: {
        value: clamped,
        unit: "probability",
        uncertainty,
        confidence,
        source: sourceTag,
      },
      baseHazard: baseProb,
      correctionDelta,
      scaleEta: eta,
      shapeBeta: beta,
      appliedAdapter: adapter ? ADAPTER_NAME : null,
    };
    if (graphPrior) result.graphPrior = graphPrior;
    return result;
  }

  /** MS-P5-GNN U-P5-GNN-04: pull graph prior, returns null on any error. */
  private tryGraphPrior(input: WireBreakPredictionInput): { neighborCount: number } | null {
    try {
      if (wedmNeighborQueryEngine.size() === 0) {
        wedmNeighborQueryEngine.loadFromLattice();
      }
      if (wedmNeighborQueryEngine.size() === 0) return null;
      const cellMat = this.resolveLatticeMaterial(input.material ?? "tool_steel");
      if (!cellMat) return null;
      const wire = this.resolveLatticeWire(input.wireMaterial);
      const prior = wedmNeighborQueryEngine.getNeighborPriorBreakProb({
        mat: cellMat,
        mach: input.controller ?? "fanuc",
        wire,
        wireDiameterMm: input.wireDiameterMm,
        thicknessMm: input.thicknessMm,
        raTargetUm: input.raTargetUm ?? 1.6,
        peakCurrentA: input.peakCurrentA,
        pulseOnUs: input.pulseOnUs,
      }, 5);
      if (!prior) return null;
      return { neighborCount: prior.neighborCount };
    } catch {
      return null;
    }
  }

  private resolveLatticeMaterial(material: string): (
    | "low_carbon_steel" | "tool_steel" | "stainless_steel" | "hardened_steel"
    | "aluminum" | "copper" | "brass" | "tungsten_carbide" | "titanium"
    | "inconel" | "graphite"
  ) | null {
    const m = (material || "").toLowerCase();
    if (m === "steel" || m === "low_carbon_steel") return "low_carbon_steel";
    if (m === "tool_steel" || ["d2","a2","m2","s7"].includes(m)) return "tool_steel";
    if (m === "hardened_steel" || m === "h13") return "hardened_steel";
    if (m === "stainless_steel" || ["ss","304","316"].includes(m)) return "stainless_steel";
    if (m === "aluminum" || ["al","6061","7075"].includes(m)) return "aluminum";
    if (m === "tungsten_carbide" || ["wc","carbide"].includes(m)) return "tungsten_carbide";
    if (m === "titanium" || ["ti","ti6al4v"].includes(m)) return "titanium";
    if (m === "inconel" || m === "in718") return "inconel";
    if (m === "copper" || m === "cu") return "copper";
    if (m === "brass") return "brass";
    if (m === "graphite") return "graphite";
    return "tool_steel"; // safe default for WEDM
  }

  private resolveLatticeWire(w?: string): "brass" | "zinc_coated" | "molybdenum" | "tungsten" {
    if (w === "molybdenum") return "molybdenum";
    if (w === "tungsten") return "tungsten";
    if (w === "coated_brass" || w === "zinc_coated" || w === "diffusion_annealed") return "zinc_coated";
    return "brass";
  }

  /**
   * Train the LoRA correction on a batch of (input, broke) outcomes.
   * Targets are residual logit (logit(actual_rate) − logit(base_prob)).
   * Outcomes are aggregated into bins by features for a stable target.
   */
  trainAdapter(
    samples: WireBreakSample[],
    options: { epochs?: number; lr?: number; rank?: number; alpha?: number; seed?: number } = {}
  ): { adapterName: string; epochs: number; finalLoss: number; sampleCount: number } {
    const epochs = Math.max(1, Math.floor(options.epochs ?? 50));
    const lr = options.lr ?? 5e-2;
    const rank = options.rank ?? 4;
    const alpha = options.alpha ?? 8;

    const validSamples = samples.filter((s) =>
      Number.isFinite(s.input.peakCurrentA)
      && Number.isFinite(s.input.wireDiameterMm)
      && Number.isFinite(s.input.thicknessMm)
      && typeof s.broke === "boolean"
    );
    if (validSamples.length === 0) {
      return { adapterName: ADAPTER_NAME, epochs: 0, finalLoss: 0, sampleCount: 0 };
    }

    wedmLoRAAdapterEngine.remove(ADAPTER_NAME);
    const adapter = wedmLoRAAdapterEngine.create({
      name: ADAPTER_NAME,
      rank,
      alpha,
      dIn: FEATURE_DIM,
      dOut: 1,
      seed: options.seed ?? 42,
    });

    const W0 = this.zeroMatrix(1, FEATURE_DIM);

    let lastLoss = 0;
    for (let e = 0; e < epochs; e++) {
      let epochLoss = 0;
      for (const s of validSamples) {
        const horizon = s.input.cumulativeCutMin ?? this.weibullScaleShape(s.input).eta;
        const baseProb = 1 - Math.exp(-Math.pow(horizon / this.weibullScaleShape(s.input).eta, DEFAULT_BETA));
        const baseLogit = this.logit(this.clamp01(baseProb));
        const targetLogit = this.logit(this.clamp01(s.broke ? 0.95 : 0.05));
        const features = this.extractFeatures(s.input, horizon);
        epochLoss += adapter.step(features, [targetLogit - baseLogit], W0, lr).lossDelta;
      }
      lastLoss = epochLoss;
    }

    return { adapterName: ADAPTER_NAME, epochs, finalLoss: lastLoss, sampleCount: validSamples.length };
  }

  /**
   * Brier score + calibration evaluation across a batch of predictions.
   */
  evaluate(samples: WireBreakSample[], horizonMin?: number, binCount: number = 10): BrierEvaluation {
    if (samples.length === 0) {
      return { brierScore: 0, count: 0, bins: [], maxCalibrationError: 0 };
    }
    const bins = Array.from({ length: binCount }, (_, i) => ({
      binCenter: (i + 0.5) / binCount,
      sumPred: 0, sumActual: 0, count: 0,
    }));
    let sse = 0;
    for (const s of samples) {
      const pred = this.predict(s.input, horizonMin).probability.value;
      const obs = s.broke ? 1 : 0;
      sse += (pred - obs) ** 2;
      const rawIdx = Math.floor(pred * binCount);
      const idx = Math.min(binCount - 1, Math.max(0, isFinite(rawIdx) ? rawIdx : 0));
      bins[idx].sumPred += pred;
      bins[idx].sumActual += obs;
      bins[idx].count += 1;
    }
    let maxCalErr = 0;
    const binsOut = bins.map((b) => {
      const mp = b.count === 0 ? 0 : b.sumPred / b.count;
      const ma = b.count === 0 ? 0 : b.sumActual / b.count;
      const err = b.count === 0 ? 0 : Math.abs(mp - ma);
      if (err > maxCalErr) maxCalErr = err;
      return { binCenter: b.binCenter, meanPredicted: mp, meanActual: ma, count: b.count };
    });
    return { brierScore: sse / samples.length, count: samples.length, bins: binsOut, maxCalibrationError: maxCalErr };
  }

  hasAdapter(): boolean {
    return wedmLoRAAdapterEngine.get(ADAPTER_NAME) !== null;
  }

  removeAdapter(): boolean {
    return wedmLoRAAdapterEngine.remove(ADAPTER_NAME);
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  private weibullScaleShape(input: WireBreakPredictionInput): { eta: number; beta: number } {
    const tensionFrac = input.tensionFraction ?? 1.0;
    const wireArea = (Math.PI * input.wireDiameterMm * input.wireDiameterMm) / 4;
    const currentDensity = input.peakCurrentA / wireArea;
    const refDensity = CURRENT_REF_A / WIRE_AREA_REF_MM2;
    const thicknessRatio = input.thicknessMm / THICKNESS_REF_MM;

    let eta = NOMINAL_SCALE_BASIS_MIN;
    eta *= Math.exp(-CURRENT_DENSITY_PENALTY * (currentDensity / refDensity - 1));
    eta *= Math.max(0.2, 1 - TENSION_PENALTY * Math.max(0, tensionFrac - 1));
    eta /= Math.max(0.5, thicknessRatio);
    if (eta <= 0.1) eta = 0.1;

    let beta = DEFAULT_BETA;
    if (input.wireMaterial === "molybdenum" || input.wireMaterial === "tungsten") beta = 2.2;
    if (input.wireMaterial === "coated_brass" || input.wireMaterial === "diffusion_annealed") beta = 1.4;

    return { eta, beta };
  }

  private extractFeatures(input: WireBreakPredictionInput, horizon: number): number[] {
    // Normalize each feature to roughly [-1, +1] so LoRA training stays
    // numerically stable even with small synthetic batches.
    const ip = Math.max(0.001, input.peakCurrentA);
    const dw = Math.max(0.001, input.wireDiameterMm);
    const thk = Math.max(0.001, input.thicknessMm);
    const tens = input.tensionFraction ?? 1.0;
    const t = Math.max(0.001, horizon);
    return [
      (Math.log10(ip) - 0.9) / 0.5,    // I=8A nominal → ~0
      (dw - 0.25) / 0.15,              // dw=0.25mm → 0
      (Math.log10(thk) - 1.3) / 0.5,   // 20mm → 0
      (tens - 1),                       // 1.0 → 0
      (Math.log10(t) - 1.0) / 0.5,     // 10 min → 0
    ];
  }

  private logit(p: number): number {
    const c = this.clamp01(p);
    return Math.log(c / (1 - c));
  }
  private sigmoid(z: number): number { return 1 / (1 + Math.exp(-z)); }
  private clamp01(p: number): number { return Math.min(1 - 1e-9, Math.max(1e-9, p)); }

  private assertFinite(input: WireBreakPredictionInput): void {
    const fields: Array<[string, number | undefined]> = [
      ["peakCurrentA", input.peakCurrentA],
      ["wireDiameterMm", input.wireDiameterMm],
      ["thicknessMm", input.thicknessMm],
      ["tensionFraction", input.tensionFraction],
      ["pulseOnUs", input.pulseOnUs],
      ["cumulativeCutMin", input.cumulativeCutMin],
    ];
    for (const [name, v] of fields) {
      if (v !== undefined && !Number.isFinite(v)) {
        throw new Error(`WEDMWireBreakPredictorEngine: ${name} must be finite (got ${v})`);
      }
    }
  }

  private zeroMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  }
}

export const wedmWireBreakPredictorEngine = new WEDMWireBreakPredictorEngine();
export { WEDMWireBreakPredictorEngine };
