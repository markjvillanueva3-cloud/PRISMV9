/**
 * ThermalNeuralPredictorEngine — Neural Network for Cutting Temperature Prediction
 *
 * MILL-AGI Phase 0.3: Neural Network Inference Layer — Unit 5
 *
 * LSTM-based recurrent network for predicting cutting zone temperatures with:
 *   - Physics-informed temperature evolution (heat generation + conduction)
 *   - Sequence modeling for thermal history effects
 *   - Heat partition prediction (chip, tool, workpiece)
 *   - Coating degradation temperature thresholds
 *
 * Architecture:
 *   Input: 10 features per timestep + 5 static features
 *   LSTM: 32 hidden units, 1 layer
 *   Output: 4 values (T_interface, T_tool, T_chip, heat_partition)
 *
 * Physics Model (Loewen-Shaw):
 *   T = T_0 + (F_c × V_c × β) / (ρ × c_p × A_c × V_c)
 *   β = heat partition to tool (0.1-0.3 typical)
 *
 * References:
 *   [1] Loewen & Shaw (1954) "On the Analysis of Cutting Tool Temperatures"
 *       Trans. ASME 76(2)
 *   [2] Komanduri & Hou (2000) "Thermal Modeling of the Metal Cutting Process"
 *       Int. J. Mech. Sci.
 *   [3] MIT 2.008 — Thermal effects in machining
 *
 * @module engines/ThermalNeuralPredictorEngine
 * @milestone MILL-AGI-P0/U-P0.3-05
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ThermalInputFeatures {
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    thermal_conductivity_w_mk?: number;
    specific_heat_j_kgk?: number;
    density_kg_m3?: number;
  };
  tool: {
    material: "carbide" | "ceramic" | "cbn" | "pcd" | "hss";
    coating?: "uncoated" | "TiN" | "TiAlN" | "AlTiN" | "DLC";
    thermal_conductivity_w_mk?: number;
  };
  conditions: {
    cutting_speed_mpm: number;
    feed_per_tooth_mm: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
    cutting_force_n: number;
  };
  coolant: {
    type: "dry" | "flood" | "mql" | "cryogenic";
    flow_rate_lpm?: number;
    temperature_c?: number;
  };
  history?: {
    cutting_time_s: number;
    previous_temps_c?: number[];
  };
}

export interface ThermalPrediction {
  temperatures: {
    interface_c: number;
    tool_surface_c: number;
    chip_c: number;
    workpiece_c: number;
  };
  heat_partition: {
    to_chip: number;
    to_tool: number;
    to_workpiece: number;
    to_coolant: number;
  };
  physics_base: {
    loewen_shaw_c: number;
    steady_state_c: number;
  };
  neural_correction: number;
  coating_status: {
    max_temp_c: number;
    current_temp_c: number;
    degradation_risk: "none" | "low" | "moderate" | "high" | "critical";
  };
  thermal_damage_risk: "none" | "low" | "moderate" | "high";
  recommendations: string[];
  confidence: number;
  inference_time_ms: number;
}

interface LSTMState {
  h: number[];
  c: number[];
}

// ============================================================================
// MATERIAL THERMAL PROPERTIES
// ============================================================================

const MATERIAL_THERMAL: Record<string, { k: number; cp: number; rho: number }> = {
  P: { k: 50, cp: 480, rho: 7850 },
  M: { k: 15, cp: 500, rho: 8000 },
  K: { k: 50, cp: 460, rho: 7200 },
  N: { k: 170, cp: 900, rho: 2700 },
  S: { k: 7, cp: 520, rho: 4500 },
  H: { k: 25, cp: 420, rho: 7800 },
};

const TOOL_THERMAL: Record<string, { k: number; maxTemp: number }> = {
  carbide: { k: 80, maxTemp: 800 },
  ceramic: { k: 30, maxTemp: 1200 },
  cbn: { k: 100, maxTemp: 1400 },
  pcd: { k: 500, maxTemp: 700 },
  hss: { k: 40, maxTemp: 550 },
};

const COATING_MAX_TEMP: Record<string, number> = {
  uncoated: 600,
  TiN: 600,
  TiAlN: 900,
  AlTiN: 1100,
  DLC: 350,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ThermalNeuralPredictorEngine {
  private lstmWeights: {
    Wi: number[][];
    Wf: number[][];
    Wc: number[][];
    Wo: number[][];
    Ui: number[][];
    Uf: number[][];
    Uc: number[][];
    Uo: number[][];
    bi: number[];
    bf: number[];
    bc: number[];
    bo: number[];
  };
  private outputWeights: { W: number[][]; b: number[] };
  private hiddenSize = 32;
  // No training/checkpoint path exists for this LSTM -- the Xavier init below is RANDOM,
  // so an ungated forward pass would randomize the interface temperature +-20% per process
  // start (nondeterministic thermal safety output). Until a real trained checkpoint loader
  // lands, the neural correction is gated to 0 and predictions are the deterministic
  // Loewen-Shaw physics base (row 2 of the verified SFC fix-plan; same class as the
  // ForceNeuralPredictorEngine gate, U-OSC-SFC-FORCENEURAL-GATE-CANONICAL).
  private weightsTrained = false;

  constructor() {
    this.lstmWeights = this.initializeLSTMWeights();
    this.outputWeights = this.initializeOutputWeights();
  }

  /**
   * Predict cutting temperatures using physics-LSTM hybrid.
   */
  predict(input: ThermalInputFeatures): ThermalPrediction {
    const startTime = performance.now();

    const features = this.extractFeatures(input);

    const physicsBase = this.computeLoewenShawTemperature(input);

    const lstmState = this.initLSTMState();
    const lstmOutput = this.lstmForward(features, lstmState);

    // Untrained (random Xavier) weights -> correction 0: deterministic physics base, never a
    // random +-20% swing on a thermal safety quantity. Flips live only via weightsTrained.
    const neuralCorrection = this.weightsTrained ? lstmOutput[0] : 0;
    const heatPartitionCorrection = this.weightsTrained ? lstmOutput.slice(1, 4) : [0, 0, 0];

    const interfaceTemp = physicsBase.loewen_shaw_c * (1 + neuralCorrection * 0.2);
    const temperatures = this.computeTemperatureDistribution(
      interfaceTemp,
      input,
      physicsBase
    );

    const heatPartition = this.computeHeatPartition(input, heatPartitionCorrection);

    const coatingStatus = this.assessCoatingStatus(
      temperatures.tool_surface_c,
      input.tool.coating ?? "uncoated"
    );

    const thermalDamageRisk = this.assessThermalDamageRisk(temperatures, input);

    const recommendations = this.generateRecommendations(
      temperatures,
      coatingStatus,
      thermalDamageRisk,
      input
    );

    const confidence = this.computeConfidence(input);

    const inferenceTime = performance.now() - startTime;

    log.debug(
      `[ThermalNeural] T_int=${interfaceTemp.toFixed(0)}°C, T_tool=${temperatures.tool_surface_c.toFixed(0)}°C, risk=${thermalDamageRisk} in ${inferenceTime.toFixed(1)}ms`
    );

    return {
      temperatures,
      heat_partition: heatPartition,
      physics_base: physicsBase,
      neural_correction: neuralCorrection,
      coating_status: coatingStatus,
      thermal_damage_risk: thermalDamageRisk,
      recommendations,
      confidence,
      inference_time_ms: inferenceTime,
    };
  }

  /**
   * Extract feature vector from input.
   */
  extractFeatures(input: ThermalInputFeatures): number[] {
    const matProps = MATERIAL_THERMAL[input.material.iso_group] ?? MATERIAL_THERMAL.P;
    const toolProps = TOOL_THERMAL[input.tool.material] ?? TOOL_THERMAL.carbide;

    const isoIndex = ["P", "M", "K", "N", "S", "H"].indexOf(input.material.iso_group);
    const coolantIndex = ["dry", "flood", "mql", "cryogenic"].indexOf(input.coolant.type);

    const features = [
      isoIndex / 5,
      (input.material.thermal_conductivity_w_mk ?? matProps.k) / 200,
      (input.material.specific_heat_j_kgk ?? matProps.cp) / 1000,
      (input.material.density_kg_m3 ?? matProps.rho) / 10000,
      (input.tool.thermal_conductivity_w_mk ?? toolProps.k) / 500,
      input.conditions.cutting_speed_mpm / 500,
      input.conditions.feed_per_tooth_mm / 0.5,
      input.conditions.axial_depth_mm / 20,
      input.conditions.cutting_force_n / 2000,
      coolantIndex / 3,
      (input.coolant.flow_rate_lpm ?? 10) / 50,
      (input.coolant.temperature_c ?? 20) / 50,
      (input.history?.cutting_time_s ?? 0) / 600,
    ];

    if (input.history?.previous_temps_c && input.history.previous_temps_c.length > 0) {
      const avgPrevTemp =
        input.history.previous_temps_c.reduce((a, b) => a + b, 0) /
        input.history.previous_temps_c.length;
      features.push(avgPrevTemp / 1000);
    } else {
      features.push(0.2);
    }

    const coatingIndex = ["uncoated", "TiN", "TiAlN", "AlTiN", "DLC"].indexOf(
      input.tool.coating ?? "uncoated"
    );
    features.push(coatingIndex / 4);

    return features;
  }

  /**
   * Compute Loewen-Shaw analytical temperature.
   */
  computeLoewenShawTemperature(input: ThermalInputFeatures): {
    loewen_shaw_c: number;
    steady_state_c: number;
  } {
    const matProps = MATERIAL_THERMAL[input.material.iso_group] ?? MATERIAL_THERMAL.P;

    const Fc = input.conditions.cutting_force_n;
    const Vc = input.conditions.cutting_speed_mpm / 60;
    const Ac = input.conditions.feed_per_tooth_mm * input.conditions.axial_depth_mm;

    const P_cut = Fc * Vc;

    const beta = 0.15;

    const T_rise = (P_cut * beta) / (matProps.rho * matProps.cp * Ac * Vc * 1e-6);

    const T_0 = input.coolant.temperature_c ?? 20;
    const T_interface = T_0 + Math.min(T_rise, 1200);

    const coolantFactor =
      input.coolant.type === "cryogenic"
        ? 0.4
        : input.coolant.type === "flood"
          ? 0.6
          : input.coolant.type === "mql"
            ? 0.8
            : 1.0;

    const T_steady = T_interface * coolantFactor;

    return {
      loewen_shaw_c: T_interface,
      steady_state_c: T_steady,
    };
  }

  /**
   * LSTM forward pass.
   */
  lstmForward(features: number[], state: LSTMState): number[] {
    const x = features;
    const h_prev = state.h;
    const c_prev = state.c;

    const i_gate = this.sigmoid(this.addVectors(
      this.matVecMul(this.lstmWeights.Wi, x),
      this.matVecMul(this.lstmWeights.Ui, h_prev),
      this.lstmWeights.bi
    ));

    const f_gate = this.sigmoid(this.addVectors(
      this.matVecMul(this.lstmWeights.Wf, x),
      this.matVecMul(this.lstmWeights.Uf, h_prev),
      this.lstmWeights.bf
    ));

    const c_tilde = this.tanh(this.addVectors(
      this.matVecMul(this.lstmWeights.Wc, x),
      this.matVecMul(this.lstmWeights.Uc, h_prev),
      this.lstmWeights.bc
    ));

    const c_new = this.addVectors(
      this.hadamard(f_gate, c_prev),
      this.hadamard(i_gate, c_tilde)
    );

    const o_gate = this.sigmoid(this.addVectors(
      this.matVecMul(this.lstmWeights.Wo, x),
      this.matVecMul(this.lstmWeights.Uo, h_prev),
      this.lstmWeights.bo
    ));

    const h_new = this.hadamard(o_gate, this.tanh(c_new));

    const output = this.addVectors(
      this.matVecMul(this.outputWeights.W, h_new),
      this.outputWeights.b
    );

    return output;
  }

  /**
   * Compute temperature distribution from interface temperature.
   */
  computeTemperatureDistribution(
    interfaceTemp: number,
    input: ThermalInputFeatures,
    physicsBase: { loewen_shaw_c: number; steady_state_c: number }
  ): ThermalPrediction["temperatures"] {
    const matProps = MATERIAL_THERMAL[input.material.iso_group] ?? MATERIAL_THERMAL.P;

    const kRatio = (input.tool.thermal_conductivity_w_mk ?? 80) / matProps.k;

    const toolTemp = interfaceTemp * (0.7 + 0.1 * kRatio);

    const chipTemp = interfaceTemp * 0.95;

    const coolantFactor =
      input.coolant.type === "cryogenic"
        ? 0.3
        : input.coolant.type === "flood"
          ? 0.5
          : input.coolant.type === "mql"
            ? 0.7
            : 0.9;

    const workpieceTemp = interfaceTemp * 0.4 * coolantFactor + (input.coolant.temperature_c ?? 20);

    return {
      interface_c: interfaceTemp,
      tool_surface_c: toolTemp,
      chip_c: chipTemp,
      workpiece_c: workpieceTemp,
    };
  }

  /**
   * Compute heat partition ratios.
   */
  computeHeatPartition(
    input: ThermalInputFeatures,
    neuralCorrection: number[]
  ): ThermalPrediction["heat_partition"] {
    let toChip = 0.75;
    let toTool = 0.15;
    let toWorkpiece = 0.08;
    let toCoolant = 0.02;

    if (input.coolant.type === "flood") {
      toCoolant = 0.15;
      toChip -= 0.1;
      toTool -= 0.03;
    } else if (input.coolant.type === "cryogenic") {
      toCoolant = 0.30;
      toChip -= 0.2;
      toTool -= 0.05;
      toWorkpiece -= 0.03;
    } else if (input.coolant.type === "dry") {
      toCoolant = 0;
      toWorkpiece += 0.02;
    }

    toChip += neuralCorrection[0] * 0.1;
    toTool += neuralCorrection[1] * 0.05;
    toWorkpiece += neuralCorrection[2] * 0.05;

    const total = toChip + toTool + toWorkpiece + toCoolant;
    return {
      to_chip: toChip / total,
      to_tool: toTool / total,
      to_workpiece: toWorkpiece / total,
      to_coolant: toCoolant / total,
    };
  }

  /**
   * Assess coating thermal status.
   */
  assessCoatingStatus(
    toolTemp: number,
    coating: string
  ): ThermalPrediction["coating_status"] {
    const maxTemp = COATING_MAX_TEMP[coating] ?? 600;
    const ratio = toolTemp / maxTemp;

    let risk: ThermalPrediction["coating_status"]["degradation_risk"];
    if (ratio < 0.6) risk = "none";
    else if (ratio < 0.75) risk = "low";
    else if (ratio < 0.9) risk = "moderate";
    else if (ratio < 1.0) risk = "high";
    else risk = "critical";

    return {
      max_temp_c: maxTemp,
      current_temp_c: toolTemp,
      degradation_risk: risk,
    };
  }

  /**
   * Assess overall thermal damage risk.
   */
  assessThermalDamageRisk(
    temps: ThermalPrediction["temperatures"],
    input: ThermalInputFeatures
  ): ThermalPrediction["thermal_damage_risk"] {
    const toolMaxTemp = TOOL_THERMAL[input.tool.material]?.maxTemp ?? 800;

    if (temps.tool_surface_c > toolMaxTemp) return "high";
    if (temps.interface_c > 900) return "high";
    if (temps.tool_surface_c > toolMaxTemp * 0.85) return "moderate";
    if (temps.interface_c > 700) return "moderate";
    if (temps.interface_c > 500) return "low";
    return "none";
  }

  /**
   * Generate recommendations.
   */
  generateRecommendations(
    temps: ThermalPrediction["temperatures"],
    coatingStatus: ThermalPrediction["coating_status"],
    thermalRisk: ThermalPrediction["thermal_damage_risk"],
    input: ThermalInputFeatures
  ): string[] {
    const recs: string[] = [];

    if (thermalRisk === "high" || thermalRisk === "moderate") {
      recs.push("Reduce cutting speed to lower interface temperature");
    }

    if (coatingStatus.degradation_risk === "high" || coatingStatus.degradation_risk === "critical") {
      recs.push(`Coating ${input.tool.coating} at risk — consider higher temp coating`);
    }

    if (input.coolant.type === "dry" && temps.interface_c > 500) {
      recs.push("Add MQL or flood coolant to reduce thermal load");
    }

    if (temps.workpiece_c > 150 && input.material.iso_group === "N") {
      recs.push("Workpiece heating may affect dimensional stability");
    }

    if (input.tool.material === "pcd" && temps.tool_surface_c > 600) {
      recs.push("PCD tool near thermal limit — reduce MRR");
    }

    return recs;
  }

  /**
   * Compute prediction confidence.
   */
  computeConfidence(input: ThermalInputFeatures): number {
    let confidence = 0.85;

    if (input.history?.cutting_time_s && input.history.cutting_time_s > 60) {
      confidence += 0.05;
    }

    if (input.coolant.type === "cryogenic") confidence -= 0.1;

    if (input.material.iso_group === "S") confidence -= 0.05;

    return Math.max(Math.min(confidence, 0.95), 0.5);
  }

  /**
   * Get model metadata.
   */
  getModelMetadata(): {
    modelId: string;
    architecture: string;
    hiddenSize: number;
    inputFeatures: number;
    outputFeatures: number;
  } {
    return {
      modelId: "thermal-neural-predictor-v1",
      architecture: "LSTM",
      hiddenSize: this.hiddenSize,
      inputFeatures: 15,
      outputFeatures: 4,
    };
  }

  /**
   * Validate input.
   */
  validateInput(input: ThermalInputFeatures): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!["P", "M", "K", "N", "S", "H"].includes(input.material.iso_group)) {
      errors.push("Invalid ISO material group");
    }
    if (!["carbide", "ceramic", "cbn", "pcd", "hss"].includes(input.tool.material)) {
      errors.push("Invalid tool material");
    }
    if (input.conditions.cutting_speed_mpm <= 0) errors.push("Cutting speed must be positive");
    if (input.conditions.cutting_force_n <= 0) errors.push("Cutting force must be positive");

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE — LSTM HELPERS
  // ============================================================================

  private initLSTMState(): LSTMState {
    return {
      h: Array(this.hiddenSize).fill(0),
      c: Array(this.hiddenSize).fill(0),
    };
  }

  private initializeLSTMWeights() {
    const inputSize = 15;
    const xavier = (rows: number, cols: number): number[][] =>
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (Math.random() * 2 - 1) * Math.sqrt(2 / (rows + cols)))
      );

    const zeros = (size: number): number[] => Array(size).fill(0);

    return {
      Wi: xavier(inputSize, this.hiddenSize),
      Wf: xavier(inputSize, this.hiddenSize),
      Wc: xavier(inputSize, this.hiddenSize),
      Wo: xavier(inputSize, this.hiddenSize),
      Ui: xavier(this.hiddenSize, this.hiddenSize),
      Uf: xavier(this.hiddenSize, this.hiddenSize),
      Uc: xavier(this.hiddenSize, this.hiddenSize),
      Uo: xavier(this.hiddenSize, this.hiddenSize),
      bi: zeros(this.hiddenSize),
      bf: Array(this.hiddenSize).fill(1),
      bc: zeros(this.hiddenSize),
      bo: zeros(this.hiddenSize),
    };
  }

  private initializeOutputWeights() {
    const xavier = (rows: number, cols: number): number[][] =>
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (Math.random() * 2 - 1) * Math.sqrt(2 / (rows + cols)))
      );

    return {
      W: xavier(this.hiddenSize, 4),
      b: Array(4).fill(0),
    };
  }

  private matVecMul(mat: number[][], vec: number[]): number[] {
    const result: number[] = [];
    for (let j = 0; j < mat[0].length; j++) {
      let sum = 0;
      for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * mat[i][j];
      }
      result.push(sum);
    }
    return result;
  }

  private addVectors(...vectors: number[][]): number[] {
    const result = Array(vectors[0].length).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < v.length; i++) {
        result[i] += v[i];
      }
    }
    return result;
  }

  private hadamard(a: number[], b: number[]): number[] {
    return a.map((v, i) => v * b[i]);
  }

  private sigmoid(x: number[]): number[] {
    return x.map((v) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
  }

  private tanh(x: number[]): number[] {
    return x.map((v) => Math.tanh(v));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const thermalNeuralPredictorEngine = new ThermalNeuralPredictorEngine();
