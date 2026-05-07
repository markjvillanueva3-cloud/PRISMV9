/**
 * WEDMRaPredictorEngine — Klocke base + LoRA correction for surface roughness Ra.
 *
 * MS-P4-DL-CORE / U-P4-PR-01
 *
 * Klocke Ra model (canonical, EDM_PHYSICS.klocke.ra_models):
 *
 *     Ra = k_ra · I_p^α · t_on^β     [µm; I_p in A; t_on in µs]
 *
 * Where (k_ra, α, β) are material-specific (Klocke 2013 Table 8.3,
 * Puertas & Luis 2004). LoRA correction layer (rank-r, default r=4) is
 * trained on the residual Ra_actual − Ra_klocke and added at inference:
 *
 *     Ra_predicted = Klocke(I_p, t_on) + (α/r)·B·A·φ(features)
 *
 * φ encodes a 5-D feature vector:
 *   [log10(I_p), log10(t_on), log10(t_off), log10(thickness_mm), wire_diameter_mm]
 *
 * Material embedding precursor: each material maps to a separate adapter
 * name. The P5 GNN milestone replaces this with a learned embedding.
 *
 * Output: AtomicValue<number>{ value, unit:"um", uncertainty, confidence,
 * source }. Uncertainty is composed from base-model tabulated variance
 * (±10% nominal) and LoRA empirical Fisher diagonal.
 *
 * Invariants (asserted by tests):
 *   1. Klocke base reproduced bit-exact when LoRA scale=0.
 *   2. Predicted Ra against the Klocke closed form on a held-out synthetic
 *      grid stays within ±10% MAE (no LoRA adaptation).
 *   3. AtomicValue shape: value, unit, uncertainty, confidence, source.
 *   4. Rejects NaN / Infinity inputs with a structured error.
 *   5. Spans ≥3 materials (steel, tool_steel, carbide).
 *
 * @module engines/WEDMRaPredictorEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";
import {
  wedmLoRAAdapterEngine,
  type LoRAAdapter,
} from "./WEDMLoRAAdapterEngine.js";
import { wedmNeighborQueryEngine } from "./WEDMNeighborQueryEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type RaMaterialKey = keyof typeof EDM_PHYSICS.klocke.ra_models;

export interface RaPredictionInput {
  material: RaMaterialKey | string;
  peakCurrentA: number;
  pulseOnUs: number;
  /** Optional pulse-off, used as a feature for the LoRA correction. */
  pulseOffUs?: number;
  /** Thickness (mm) — feature only, not in base Klocke model. */
  thicknessMm?: number;
  /** Wire diameter (mm) — feature only. */
  wireDiameterMm?: number;
  /** Allow disabling the LoRA correction layer (default: enabled). */
  useAdapter?: boolean;
  /**
   * MS-P5-GNN / U-P5-GNN-04: when true, blend the model output with a soft
   * prior from WEDMNeighborQueryEngine over the lattice. Default false to
   * preserve backward compatibility with all P4 callers.
   */
  useGraphPrior?: boolean;
  /** Blend weight w in [0,1] for the graph prior (default 0.2). */
  graphPriorWeight?: number;
  /** Optional controller hint for the lattice query (default fanuc). */
  controller?: "fanuc" | "sodick" | "makino" | "mitsubishi" | "agiecharmilles" | "accutex";
  /** Optional wire family for the lattice query (default brass). */
  wireMaterial?: "brass" | "zinc_coated" | "molybdenum" | "tungsten";
  /**
   * Optional target Ra (µm) hint — improves graph-prior accuracy when the
   * caller knows the desired surface finish. Not used by the Klocke base
   * model; only by graph-prior neighbor selection.
   */
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

export interface RaPredictionResult {
  ra: AtomicValue;
  basePart: number;
  correctionPart: number;
  material: string;
  appliedAdapter: string | null;
  features: number[];
  /** MS-P5-GNN: when graph prior was blended, carries the prior value + weight. */
  graphPrior?: {
    raUm: number;
    weight: number;
    neighborCount: number;
  } | null;
}

export interface AdapterTrainingSample {
  /** Same shape as RaPredictionInput, plus actual measured Ra. */
  input: RaPredictionInput;
  measuredRaUm: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_DIM = 5;
const ADAPTER_PREFIX = "wedm-ra::";
const DEFAULT_RANK = 4;
const DEFAULT_ALPHA = 8;
const KLOCKE_NOMINAL_UNCERTAINTY_PCT = 0.10; // ±10 % per Klocke 2013

// ============================================================================
// ENGINE
// ============================================================================

class WEDMRaPredictorEngine {
  /**
   * Predict Ra (µm) using the Klocke base model plus the per-material
   * LoRA correction (if one has been trained).
   */
  predict(input: RaPredictionInput): RaPredictionResult {
    const features = this.extractFeatures(input);
    const material = this.resolveMaterial(input.material);
    const base = this.klockeBase(material, input.peakCurrentA, input.pulseOnUs);

    const useAdapter = input.useAdapter !== false;
    const adapterName = `${ADAPTER_PREFIX}${material}`;
    const adapter = useAdapter ? wedmLoRAAdapterEngine.get(adapterName) : null;

    let correction = 0;
    if (adapter) {
      const W0 = this.zeroMatrix(1, FEATURE_DIM);
      const fwd = adapter.forward(features, W0);
      correction = fwd.adapterPart[0];
    }

    const rawPrediction = base + correction;

    // MS-P5-GNN / U-P5-GNN-04: optional graph-prior blending.
    let graphPrior: { raUm: number; weight: number; neighborCount: number } | null = null;
    let finalRa = rawPrediction;
    if (input.useGraphPrior === true) {
      graphPrior = this.tryGraphPrior(input, material, rawPrediction);
      if (graphPrior) {
        const w = this.clamp01(input.graphPriorWeight ?? 0.2);
        finalRa = (1 - w) * rawPrediction + w * graphPrior.raUm;
        graphPrior.weight = w;
      }
    }

    const baseUncertainty = base * KLOCKE_NOMINAL_UNCERTAINTY_PCT;
    const adapterUncertainty = adapter
      ? this.adapterUncertainty(adapter, features) * Math.abs(correction || 1) * 0.5
      : 0;
    let uncertainty = Math.sqrt(
      baseUncertainty * baseUncertainty + adapterUncertainty * adapterUncertainty
    );
    // Graph prior narrows uncertainty (more evidence) but only slightly.
    if (graphPrior) uncertainty = uncertainty * Math.sqrt(1 - 0.25 * graphPrior.weight);

    const sourceTag =
      graphPrior && adapter ? "WEDMRaPredictorEngine:klocke+lora+gnn" :
      graphPrior ? "WEDMRaPredictorEngine:klocke+gnn" :
      adapter ? "WEDMRaPredictorEngine:klocke+lora" :
      "WEDMRaPredictorEngine:klocke";

    const result: RaPredictionResult = {
      ra: {
        value: finalRa,
        unit: "um",
        uncertainty,
        confidence: adapter
          ? Math.min(0.95, 0.7 + adapter.steps * 0.005 + (graphPrior ? 0.03 : 0))
          : (graphPrior ? 0.73 : 0.7),
        source: sourceTag,
      },
      basePart: base,
      correctionPart: correction,
      material,
      appliedAdapter: adapter ? adapterName : null,
      features,
    };
    // Only attach graphPrior key when graph prior was actually applied; this
    // keeps the "no prior" return shape byte-equivalent to the pre-P5 API.
    if (graphPrior) result.graphPrior = graphPrior;
    return result;
  }

  private clamp01(x: number): number {
    if (!Number.isFinite(x) || x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  /**
   * Try to obtain a graph prior from WEDMNeighborQueryEngine. Returns null on
   * any error (engine not loaded, empty lattice, bad resolve) — graph-prior
   * must be additive, never failure-propagating, per the P5 design contract.
   */
  private tryGraphPrior(
    input: RaPredictionInput,
    material: string,
    modelRa: number,
  ): { raUm: number; weight: number; neighborCount: number } | null {
    try {
      if (wedmNeighborQueryEngine.size() === 0) {
        wedmNeighborQueryEngine.loadFromLattice();
      }
      if (wedmNeighborQueryEngine.size() === 0) return null;
      const cellMat = this.resolveLatticeMaterial(material);
      if (!cellMat) return null;
      // If the caller supplied a raTargetUm hint, prefer it over the Klocke
      // base for neighbor selection — this is the intended XAI contract: the
      // user says "I want Ra 0.8 µm" and the prior finds lattice cells that
      // reach that target. Without a hint we fall back to the model's own Ra
      // as a best-effort.
      const raHint = Number.isFinite(input.raTargetUm) && (input.raTargetUm as number) > 0
        ? (input.raTargetUm as number)
        : modelRa;
      const prior = wedmNeighborQueryEngine.getNeighborPriorRaUm({
        mat: cellMat,
        mach: input.controller ?? "fanuc",
        wire: input.wireMaterial ?? "brass",
        wireDiameterMm: input.wireDiameterMm ?? 0.25,
        thicknessMm: input.thicknessMm ?? 50,
        raTargetUm: Math.max(0.2, Math.min(6.3, raHint)),
        peakCurrentA: input.peakCurrentA,
        pulseOnUs: input.pulseOnUs,
        pulseOffUs: input.pulseOffUs,
      }, 5);
      if (!prior || !Number.isFinite(prior.ra)) return null;
      return { raUm: prior.ra, weight: 0, neighborCount: prior.neighborCount };
    } catch {
      return null;
    }
  }

  /**
   * Map predictor material key → lattice material enum. Returns null when
   * the material doesn't have a lattice equivalent (graph prior inapplicable).
   */
  private resolveLatticeMaterial(material: string): (
    | "low_carbon_steel" | "tool_steel" | "stainless_steel" | "hardened_steel"
    | "aluminum" | "copper" | "brass" | "tungsten_carbide" | "titanium"
    | "inconel" | "graphite"
  ) | null {
    const m = material.toLowerCase();
    if (m === "steel" || m === "low_carbon_steel") return "low_carbon_steel";
    if (m === "tool_steel" || m === "d2" || m === "a2" || m === "m2" || m === "s7") return "tool_steel";
    if (m === "hardened_steel" || m === "h13") return "hardened_steel";
    if (m === "stainless_steel" || m === "ss" || m === "304" || m === "316") return "stainless_steel";
    if (m === "aluminum" || m === "al" || m === "6061" || m === "7075") return "aluminum";
    if (m === "tungsten_carbide" || m === "wc" || m === "carbide") return "tungsten_carbide";
    if (m === "titanium" || m === "ti" || m === "ti6al4v") return "titanium";
    if (m === "inconel" || m === "in718") return "inconel";
    if (m === "copper" || m === "cu") return "copper";
    if (m === "brass") return "brass";
    if (m === "graphite") return "graphite";
    return null;
  }

  /**
   * Train the per-material LoRA correction on a batch of (input, measured)
   * samples. Creates the adapter on first call. Returns the per-step loss
   * trace for diagnostics.
   */
  trainAdapter(
    material: string,
    samples: AdapterTrainingSample[],
    options: { epochs?: number; lr?: number; rank?: number; alpha?: number; seed?: number } = {}
  ): { adapterName: string; epochs: number; finalLoss: number; sampleCount: number } {
    const matKey = this.resolveMaterial(material);
    const adapterName = `${ADAPTER_PREFIX}${matKey}`;
    const epochs = Math.max(1, Math.floor(options.epochs ?? 50));
    const lr = options.lr ?? 5e-2;
    const rank = options.rank ?? DEFAULT_RANK;
    const alpha = options.alpha ?? DEFAULT_ALPHA;

    const cleanSamples = samples
      .filter((s) => Number.isFinite(s.measuredRaUm) && Number.isFinite(s.input.peakCurrentA) && Number.isFinite(s.input.pulseOnUs))
      .map((s) => {
        const features = this.extractFeatures(s.input);
        const base = this.klockeBase(matKey, s.input.peakCurrentA, s.input.pulseOnUs);
        return {
          x: features,
          target: [s.measuredRaUm - base], // train on residual
        };
      });

    if (cleanSamples.length === 0) {
      return { adapterName, epochs: 0, finalLoss: 0, sampleCount: 0 };
    }

    wedmLoRAAdapterEngine.remove(adapterName);
    const adapter = wedmLoRAAdapterEngine.create({
      name: adapterName,
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
      for (const s of cleanSamples) {
        epochLoss += adapter.step(s.x, s.target, W0, lr).lossDelta;
      }
      lastLoss = epochLoss;
    }

    return { adapterName, epochs, finalLoss: lastLoss, sampleCount: cleanSamples.length };
  }

  hasAdapter(material: string): boolean {
    const matKey = this.resolveMaterial(material);
    return wedmLoRAAdapterEngine.get(`${ADAPTER_PREFIX}${matKey}`) !== null;
  }

  removeAdapter(material: string): boolean {
    const matKey = this.resolveMaterial(material);
    return wedmLoRAAdapterEngine.remove(`${ADAPTER_PREFIX}${matKey}`);
  }

  /** Lookup canonical Klocke coefficients for a material (test convenience). */
  getKlockeCoefficients(material: string): { k_ra: number; alpha: number; beta: number; source: string } {
    const matKey = this.resolveMaterial(material);
    const m = EDM_PHYSICS.klocke.ra_models[matKey as RaMaterialKey];
    return { ...m };
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  private resolveMaterial(material: string): RaMaterialKey {
    const key = (material || "").toLowerCase();
    const mapped: Record<string, RaMaterialKey> = {
      "p20": "tool_steel", "h13": "tool_steel", "d2": "tool_steel", "m2": "tool_steel",
      "a2": "tool_steel", "s7": "tool_steel", "tool_steel": "tool_steel",
      "1018": "steel", "4140": "steel", "carbon_steel": "steel", "alloy_steel": "steel", "steel": "steel",
      "304": "stainless", "316": "stainless", "stainless": "stainless",
      "6061": "aluminum", "7075": "aluminum", "aluminum": "aluminum",
      "wc": "carbide", "carbide": "carbide", "tungsten_carbide": "carbide",
      "ti": "titanium", "ti-6al-4v": "titanium", "titanium": "titanium",
      "in718": "inconel", "inconel": "inconel",
      "copper": "copper",
    };
    if (mapped[key]) return mapped[key];
    if (key in EDM_PHYSICS.klocke.ra_models) return key as RaMaterialKey;
    return "steel"; // safe default; warning surfaced via telemetry
  }

  private klockeBase(material: RaMaterialKey, peakCurrentA: number, pulseOnUs: number): number {
    if (!Number.isFinite(peakCurrentA) || !Number.isFinite(pulseOnUs)) {
      throw new Error(`WEDMRaPredictorEngine: peakCurrentA and pulseOnUs must be finite (got ${peakCurrentA}, ${pulseOnUs})`);
    }
    if (peakCurrentA <= 0 || pulseOnUs <= 0) {
      throw new Error(`WEDMRaPredictorEngine: peakCurrentA and pulseOnUs must be > 0 (got ${peakCurrentA}, ${pulseOnUs})`);
    }
    const m = EDM_PHYSICS.klocke.ra_models[material];
    return m.k_ra * Math.pow(peakCurrentA, m.alpha) * Math.pow(pulseOnUs, m.beta);
  }

  private extractFeatures(input: RaPredictionInput): number[] {
    if (!Number.isFinite(input.peakCurrentA) || !Number.isFinite(input.pulseOnUs)) {
      throw new Error(`WEDMRaPredictorEngine: peakCurrentA and pulseOnUs must be finite`);
    }
    const ip = Math.max(0.001, input.peakCurrentA);
    const ton = Math.max(0.001, input.pulseOnUs);
    const toff = Math.max(0.001, input.pulseOffUs ?? 1);
    const thk = Math.max(0.001, input.thicknessMm ?? 10);
    const dw = Math.max(0.001, input.wireDiameterMm ?? 0.25);
    return [
      Math.log10(ip),
      Math.log10(ton),
      Math.log10(toff),
      Math.log10(thk),
      dw,
    ];
  }

  private zeroMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  }

  private adapterUncertainty(adapter: LoRAAdapter, features: number[]): number {
    const f = adapter.fisherDiag();
    let s = 0;
    for (let i = 0; i < f.A.length; i++) {
      for (let j = 0; j < f.A[i].length; j++) {
        s += f.A[i][j] * features[j] * features[j];
      }
    }
    return Math.sqrt(s / Math.max(1, f.steps));
  }
}

export const wedmRaPredictorEngine = new WEDMRaPredictorEngine();
export { WEDMRaPredictorEngine };
