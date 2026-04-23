/**
 * WEDMRecastDepthPredictorEngine — Recast layer depth using Carslaw & Jaeger.
 *
 * MS-P4-DL-CORE / U-P4-PR-03
 *
 * Carslaw & Jaeger §10.2 eq.(2) (instantaneous point source in semi-infinite
 * solid) gives the temperature profile as
 *
 *     T(z, t) = (Q / (4·ρ·c·(π·α·t)^1.5)) · exp(−z² / (4·α·t))
 *
 * (The factor of 4 in the denominator absorbs the image-source doubling for
 * the semi-infinite half-space.)
 *
 * The recast (re-solidified) layer extends from the surface to the depth
 * z_m where T(z_m, t_pulse) reaches the melting point ΔT_m = T_m − T_amb.
 * Solving for z:
 *
 *     z_m(t) = 2·√(α·t) · √( ln( Q / (4·ρ·c·ΔT_m·(π·α·t)^1.5) ) )
 *
 * For a given pulse energy Q, pulse duration t_on, and material thermal
 * properties (α = thermal diffusivity, ρ = density, c = specific heat,
 * T_m = melting temperature), this is a closed-form depth.
 *
 * Pulse energy Q is approximated by the Klocke energy balance:
 *
 *     Q ≈ V · I · t_on    (joules per spark)
 *
 * with a fraction f_q of energy conducted into the workpiece (Klocke 2013
 * §8.2 — typical f_q = 0.18 for steel, 0.25 for tool steel).
 *
 * LoRA correction layer (rank-r) is added to capture material-specific
 * residuals (oxide layer, microstructure, dielectric flushing).
 *
 * Output: AtomicValue<depth_um>{ value, unit:"um", … }.
 *
 * Invariants (asserted by tests):
 *   1. With LoRA scale=0, predicted depth matches the closed-form within ±2%.
 *   2. Higher discharge current → strictly larger recast depth (monotonic).
 *   3. Higher pulse-on time → strictly larger recast depth (monotonic).
 *   4. AtomicValue shape verified.
 *   5. Rejects NaN / Infinity / non-positive inputs.
 *
 * @module engines/WEDMRecastDepthPredictorEngine
 */

import {
  wedmLoRAAdapterEngine,
  type LoRAAdapter,
} from "./WEDMLoRAAdapterEngine.js";
import { wedmNeighborQueryEngine } from "./WEDMNeighborQueryEngine.js";

// ============================================================================
// MATERIAL THERMAL PROPERTIES
// ============================================================================
//
// Sources:
//   - ASM Handbook Vol. 1 (steel/tool_steel/stainless)
//   - ASM Handbook Vol. 2 (aluminum/copper/brass)
//   - ASM Handbook Vol. 16 (carbide, titanium, inconel — referenced for the
//     PCD/inconel scope of MS-P3-TIER6B; values verified against Touloukian
//     1970 thermal-properties compendium)
//
// Diffusivity α (m²/s), density ρ (kg/m³), specific heat c (J/(kg·K)),
// melting point T_m (K above ambient 295K), workpiece-energy fraction f_q.

export interface MaterialThermalProperties {
  alpha_m2_s: number;
  rho_kg_m3: number;
  cp_J_kgK: number;
  Tm_K: number;       // melting temperature in K (absolute)
  fq: number;         // fraction of pulse energy conducted into workpiece
  source: string;
}

export const RECAST_MATERIALS: Record<string, MaterialThermalProperties> = {
  steel:      { alpha_m2_s: 1.20e-5, rho_kg_m3: 7850, cp_J_kgK: 470, Tm_K: 1773, fq: 0.18, source: "ASM Vol. 1, AISI 1018" },
  tool_steel: { alpha_m2_s: 8.00e-6, rho_kg_m3: 7800, cp_J_kgK: 460, Tm_K: 1700, fq: 0.20, source: "ASM Vol. 1, D2/H13" },
  stainless:  { alpha_m2_s: 4.00e-6, rho_kg_m3: 7900, cp_J_kgK: 500, Tm_K: 1700, fq: 0.16, source: "ASM Vol. 1, 304SS" },
  aluminum:   { alpha_m2_s: 9.70e-5, rho_kg_m3: 2700, cp_J_kgK: 900, Tm_K: 933,  fq: 0.22, source: "ASM Vol. 2, 6061" },
  carbide:    { alpha_m2_s: 2.50e-5, rho_kg_m3:14500, cp_J_kgK: 290, Tm_K: 3140, fq: 0.15, source: "ASM Vol. 16, WC-6%Co" },
  copper:     { alpha_m2_s: 1.11e-4, rho_kg_m3: 8960, cp_J_kgK: 385, Tm_K: 1358, fq: 0.20, source: "ASM Vol. 2" },
  titanium:   { alpha_m2_s: 9.40e-6, rho_kg_m3: 4430, cp_J_kgK: 526, Tm_K: 1941, fq: 0.18, source: "ASM Vol. 16, Ti-6Al-4V" },
  inconel:    { alpha_m2_s: 4.00e-6, rho_kg_m3: 8190, cp_J_kgK: 435, Tm_K: 1609, fq: 0.16, source: "ASM Vol. 16, IN718" },
};

const AMBIENT_TEMP_K = 295;

// ============================================================================
// TYPES
// ============================================================================

export interface RecastPredictionInput {
  material: keyof typeof RECAST_MATERIALS | string;
  /** Discharge voltage (V). */
  voltageV: number;
  /** Peak discharge current (A). */
  peakCurrentA: number;
  /** Pulse-on time (µs). */
  pulseOnUs: number;
  /** Optional override for fq (energy fraction into workpiece). */
  fqOverride?: number;
  useAdapter?: boolean;
  /**
   * MS-P5-GNN / U-P5-GNN-04: optional graph-prior blending. When true and a
   * lattice is loaded, the closed-form depth is blended with a neighbor-
   * derived prior (default weight 0.2).
   */
  useGraphPrior?: boolean;
  graphPriorWeight?: number;
  /** Controller hint for lattice query. Default fanuc. */
  controller?: "fanuc" | "sodick" | "makino" | "mitsubishi" | "agiecharmilles" | "accutex";
  /** Wire material family for lattice query. Default brass. */
  wireMaterial?: "brass" | "zinc_coated" | "molybdenum" | "tungsten";
  /** Wire diameter (mm) for lattice query. Default 0.25. */
  wireDiameterMm?: number;
  /** Thickness (mm) for lattice query. Default 50. */
  thicknessMm?: number;
  /** Target Ra (µm) for lattice query. Default 1.6. */
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

export interface RecastPredictionResult {
  depth: AtomicValue;
  closedFormDepthUm: number;
  correctionUm: number;
  pulseEnergyJ: number;
  workpieceEnergyJ: number;
  material: string;
  appliedAdapter: string | null;
  graphPrior?: {
    recastUm: number;
    weight: number;
    neighborCount: number;
  } | null;
}

export interface RecastTrainingSample {
  input: RecastPredictionInput;
  measuredDepthUm: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_DIM = 4;
const ADAPTER_PREFIX = "wedm-recast::";

// ============================================================================
// ENGINE
// ============================================================================

class WEDMRecastDepthPredictorEngine {
  predict(input: RecastPredictionInput): RecastPredictionResult {
    this.assertInput(input);
    const matKey = this.resolveMaterial(input.material);
    const props = RECAST_MATERIALS[matKey];

    const t_on_s = input.pulseOnUs * 1e-6;
    const Q = input.voltageV * input.peakCurrentA * t_on_s;
    const fq = input.fqOverride ?? props.fq;
    const Q_workpiece = Q * fq;

    const closedFormDepthM = this.carslawDepth(Q_workpiece, t_on_s, props);
    const closedFormDepthUm = closedFormDepthM * 1e6;

    const useAdapter = input.useAdapter !== false;
    const adapter = useAdapter ? wedmLoRAAdapterEngine.get(`${ADAPTER_PREFIX}${matKey}`) : null;

    let correctionUm = 0;
    if (adapter) {
      const features = this.extractFeatures(input, props, Q_workpiece);
      const W0 = this.zeroMatrix(1, FEATURE_DIM);
      correctionUm = adapter.forward(features, W0).adapterPart[0];
    }

    let depthUm = Math.max(0, closedFormDepthUm + correctionUm);

    // MS-P5-GNN / U-P5-GNN-04: optional graph-prior blend.
    let graphPrior: { recastUm: number; weight: number; neighborCount: number } | null = null;
    if (input.useGraphPrior === true) {
      const gp = this.tryGraphPrior(input, matKey, depthUm);
      if (gp && Number.isFinite(gp.recast)) {
        const w = Math.min(1, Math.max(0, input.graphPriorWeight ?? 0.2));
        depthUm = Math.max(0, (1 - w) * depthUm + w * gp.recast);
        graphPrior = { recastUm: gp.recast, weight: w, neighborCount: gp.neighborCount };
      }
    }

    const baseUncertainty = closedFormDepthUm * 0.08; // ±8% nominal Carslaw fit
    const adapterUncertainty = adapter ? Math.abs(correctionUm) * 0.2 : 0;
    let uncertainty = Math.sqrt(baseUncertainty * baseUncertainty + adapterUncertainty * adapterUncertainty);
    if (graphPrior) uncertainty = uncertainty * Math.sqrt(1 - 0.25 * graphPrior.weight);

    const sourceTag =
      graphPrior && adapter ? "WEDMRecastDepthPredictorEngine:carslaw+lora+gnn" :
      graphPrior ? "WEDMRecastDepthPredictorEngine:carslaw+gnn" :
      adapter ? "WEDMRecastDepthPredictorEngine:carslaw+lora" :
      "WEDMRecastDepthPredictorEngine:carslaw";

    const result: RecastPredictionResult = {
      depth: {
        value: depthUm,
        unit: "um",
        uncertainty,
        confidence: adapter
          ? Math.min(0.95, 0.85 + (graphPrior ? 0.05 * graphPrior.weight : 0))
          : (graphPrior ? 0.75 : 0.7),
        source: sourceTag,
      },
      closedFormDepthUm,
      correctionUm,
      pulseEnergyJ: Q,
      workpieceEnergyJ: Q_workpiece,
      material: matKey,
      appliedAdapter: adapter ? `${ADAPTER_PREFIX}${matKey}` : null,
    };
    if (graphPrior) result.graphPrior = graphPrior;
    return result;
  }

  /** MS-P5-GNN U-P5-GNN-04: pull graph-derived recast prior, null on any error. */
  private tryGraphPrior(
    input: RecastPredictionInput,
    matKey: string,
    _modelRecastUm: number,
  ): { recast: number; neighborCount: number } | null {
    try {
      if (wedmNeighborQueryEngine.size() === 0) {
        wedmNeighborQueryEngine.loadFromLattice();
      }
      if (wedmNeighborQueryEngine.size() === 0) return null;
      const cellMat = this.resolveLatticeMaterial(matKey);
      if (!cellMat) return null;
      const prior = wedmNeighborQueryEngine.getNeighborPriorRecastUm({
        mat: cellMat,
        mach: input.controller ?? "fanuc",
        wire: input.wireMaterial ?? "brass",
        wireDiameterMm: input.wireDiameterMm ?? 0.25,
        thicknessMm: input.thicknessMm ?? 50,
        raTargetUm: input.raTargetUm ?? 1.6,
        peakCurrentA: input.peakCurrentA,
        pulseOnUs: input.pulseOnUs,
      }, 5);
      if (!prior) return null;
      return { recast: prior.recast, neighborCount: prior.neighborCount };
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
    return "tool_steel";
  }

  trainAdapter(
    material: string,
    samples: RecastTrainingSample[],
    options: { epochs?: number; lr?: number; rank?: number; alpha?: number; seed?: number } = {}
  ): { adapterName: string; epochs: number; finalLoss: number; sampleCount: number } {
    const matKey = this.resolveMaterial(material);
    const props = RECAST_MATERIALS[matKey];
    const adapterName = `${ADAPTER_PREFIX}${matKey}`;
    const epochs = Math.max(1, Math.floor(options.epochs ?? 50));
    const lr = options.lr ?? 5e-2;
    const rank = options.rank ?? 4;
    const alpha = options.alpha ?? 8;

    const valid = samples.filter((s) =>
      Number.isFinite(s.measuredDepthUm)
      && Number.isFinite(s.input.voltageV)
      && Number.isFinite(s.input.peakCurrentA)
      && Number.isFinite(s.input.pulseOnUs)
    );
    if (valid.length === 0) {
      return { adapterName, epochs: 0, finalLoss: 0, sampleCount: 0 };
    }

    wedmLoRAAdapterEngine.remove(adapterName);
    const adapter = wedmLoRAAdapterEngine.create({
      name: adapterName, rank, alpha, dIn: FEATURE_DIM, dOut: 1, seed: options.seed ?? 42,
    });
    const W0 = this.zeroMatrix(1, FEATURE_DIM);
    let lastLoss = 0;
    for (let e = 0; e < epochs; e++) {
      let epochLoss = 0;
      for (const s of valid) {
        const t_on_s = s.input.pulseOnUs * 1e-6;
        const Q = s.input.voltageV * s.input.peakCurrentA * t_on_s;
        const fq = s.input.fqOverride ?? props.fq;
        const Q_w = Q * fq;
        const closedUm = this.carslawDepth(Q_w, t_on_s, props) * 1e6;
        const features = this.extractFeatures(s.input, props, Q_w);
        epochLoss += adapter.step(features, [s.measuredDepthUm - closedUm], W0, lr).lossDelta;
      }
      lastLoss = epochLoss;
    }

    return { adapterName, epochs, finalLoss: lastLoss, sampleCount: valid.length };
  }

  hasAdapter(material: string): boolean {
    const k = this.resolveMaterial(material);
    return wedmLoRAAdapterEngine.get(`${ADAPTER_PREFIX}${k}`) !== null;
  }

  removeAdapter(material: string): boolean {
    const k = this.resolveMaterial(material);
    return wedmLoRAAdapterEngine.remove(`${ADAPTER_PREFIX}${k}`);
  }

  /**
   * Pure Carslaw-Jaeger §10.7 closed form, exposed for tests/audits.
   * Returns depth in METERS.
   */
  carslawDepthMeters(Q_workpiece_J: number, t_on_s: number, material: keyof typeof RECAST_MATERIALS): number {
    const props = RECAST_MATERIALS[material];
    return this.carslawDepth(Q_workpiece_J, t_on_s, props);
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  private carslawDepth(Q_J: number, t_s: number, props: MaterialThermalProperties): number {
    if (Q_J <= 0 || t_s <= 0) return 0;
    const piAlphaT = Math.PI * props.alpha_m2_s * t_s;
    if (piAlphaT <= 0) return 0;
    const piAlphaT_1p5 = piAlphaT * Math.sqrt(piAlphaT); // (π·α·t)^1.5
    const denom = 4 * props.rho_kg_m3 * props.cp_J_kgK * (props.Tm_K - AMBIENT_TEMP_K) * piAlphaT_1p5;
    if (denom <= 0) return 0;
    const ratio = Q_J / denom;
    if (ratio <= 1) return 0; // surface temperature did not reach melting
    const lnTerm = Math.log(ratio);
    if (lnTerm <= 0) return 0;
    return 2 * Math.sqrt(props.alpha_m2_s * t_s) * Math.sqrt(lnTerm);
  }

  private resolveMaterial(material: string): keyof typeof RECAST_MATERIALS {
    const key = (material || "").toLowerCase();
    const mapped: Record<string, keyof typeof RECAST_MATERIALS> = {
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
    if (key in RECAST_MATERIALS) return key as keyof typeof RECAST_MATERIALS;
    return "steel";
  }

  private extractFeatures(input: RecastPredictionInput, props: MaterialThermalProperties, Q_workpiece_J: number): number[] {
    // Normalize features to ~[-3, +3] range so LoRA training stays stable
    // even with small samples and modest learning rates.
    return [
      (Math.log10(Math.max(1e-9, Q_workpiece_J)) + 3) / 3, // typical: log10(1mJ)=-3 → 0
      (Math.log10(Math.max(0.001, input.pulseOnUs)) - 0.5),  // pulseOn 3µs ≈ 0
      (input.peakCurrentA - 8) / 8,                          // 8A nominal
      Math.log10(Math.max(1e-9, props.alpha_m2_s)) + 5,      // typical: log10(1e-5)=-5 → 0
    ];
  }

  private assertInput(input: RecastPredictionInput): void {
    const fields: Array<[string, number | undefined]> = [
      ["voltageV", input.voltageV],
      ["peakCurrentA", input.peakCurrentA],
      ["pulseOnUs", input.pulseOnUs],
      ["fqOverride", input.fqOverride],
    ];
    for (const [name, v] of fields) {
      if (v !== undefined && !Number.isFinite(v)) {
        throw new Error(`WEDMRecastDepthPredictorEngine: ${name} must be finite (got ${v})`);
      }
    }
    if (input.voltageV <= 0) throw new Error("WEDMRecastDepthPredictorEngine: voltageV must be > 0");
    if (input.peakCurrentA <= 0) throw new Error("WEDMRecastDepthPredictorEngine: peakCurrentA must be > 0");
    if (input.pulseOnUs <= 0) throw new Error("WEDMRecastDepthPredictorEngine: pulseOnUs must be > 0");
  }

  private zeroMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  }
}

export const wedmRecastDepthPredictorEngine = new WEDMRecastDepthPredictorEngine();
export { WEDMRecastDepthPredictorEngine };
