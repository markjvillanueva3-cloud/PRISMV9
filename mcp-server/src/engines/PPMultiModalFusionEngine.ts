/**
 * PPMultiModalFusionEngine — PP-AGI-MS7
 *
 * Combines controller, machine, and material embedding vectors into a
 * unified multi-modal representation for holistic post-processor decisions.
 *
 * Given a machining scenario (controller + machine + material), produces:
 *   - Fused embedding vector (120 dims: 48 controller + 40 machine + 32 material)
 *   - Cross-modal compatibility score (do these three "fit" together?)
 *   - Scenario similarity search (find closest known scenario)
 *   - Gap analysis (what's missing or mismatched in the scenario)
 *
 * Architecture:
 *   Controller embedding (48-dim) ─┐
 *   Machine embedding (40-dim)   ──┼─→ Concatenation (120-dim) → Compatibility scoring
 *   Material embedding (32-dim)  ──┘
 *
 * This is the "brain" that ties together the individual domain encoders
 * from MS0, MS1, and MS3 into actionable post-processor intelligence.
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS7
 * @module PPMultiModalFusionEngine
 */

import {
  ppControllerEmbeddingEngine,
  EMBEDDING_DIM as CTRL_DIM,
} from "./PPControllerEmbeddingEngine.js";

import {
  ppMachineVectorEncoderEngine,
  MACHINE_EMBEDDING_DIM as MACH_DIM,
} from "./PPMachineVectorEncoderEngine.js";

import {
  ppMaterialPropertyVectorEngine,
  MATERIAL_EMBEDDING_DIM as MAT_DIM,
} from "./PPMaterialPropertyVectorEngine.js";

// ── Constants ─────────────────────────────────────────────────────────

export const FUSED_DIM = CTRL_DIM + MACH_DIM + MAT_DIM; // 48 + 40 + 32 = 120

// ── Types ─────────────────────────────────────────────────────────────

export interface ScenarioInput {
  controller_id: string;
  machine_id: string;
  material_id: string;
}

export interface FusedScenario {
  controller_id: string;
  machine_id: string;
  material_id: string;
  fused_vector: number[];
  dimension: number;
  compatibility: CompatibilityScore;
}

export interface CompatibilityScore {
  overall: number;           // 0-1 composite score
  controller_machine: number;// controller-machine fit
  machine_material: number;  // machine-material fit
  controller_material: number;// controller-material fit
  warnings: string[];
}

export interface ScenarioSearchResult {
  query: ScenarioInput;
  nearest: Array<{
    scenario: ScenarioInput;
    cosine_similarity: number;
    compatibility: number;
  }>;
}

export interface ScenarioGapAnalysis {
  scenario: ScenarioInput;
  gaps: Array<{
    domain: "controller" | "machine" | "material" | "cross-modal";
    issue: string;
    severity: "info" | "warning" | "critical";
  }>;
  recommendations: string[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPMultiModalFusionEngine {
  /**
   * Fuse controller + machine + material embeddings into a single 120-dim vector
   * with cross-modal compatibility scoring.
   */
  fuse(input: ScenarioInput): FusedScenario | null {
    const ctrlEmb = ppControllerEmbeddingEngine.embed(input.controller_id);
    const machEmb = ppMachineVectorEncoderEngine.embed(input.machine_id);
    const matEmb = ppMaterialPropertyVectorEngine.embed(input.material_id);

    // Allow partial fusion (at least one must be available)
    const ctrlVec = ctrlEmb?.vector ?? new Array(CTRL_DIM).fill(0);
    const machVec = machEmb?.vector ?? new Array(MACH_DIM).fill(0);
    const matVec = matEmb?.vector ?? new Array(MAT_DIM).fill(0);

    if (!ctrlEmb && !machEmb && !matEmb) return null;

    const fused = [...ctrlVec, ...machVec, ...matVec];
    const compatibility = this.scoreCompatibility(ctrlVec, machVec, matVec, input);

    return {
      controller_id: input.controller_id,
      machine_id: input.machine_id,
      material_id: input.material_id,
      fused_vector: fused,
      dimension: FUSED_DIM,
      compatibility,
    };
  }

  /**
   * Search for the most similar known scenarios.
   * Builds a library from all combinations of known controllers × machines × materials
   * (sampled to keep tractable).
   */
  searchSimilar(input: ScenarioInput, k = 5): ScenarioSearchResult | null {
    const queryFused = this.fuse(input);
    if (!queryFused) return null;

    // Build scenario library from known embeddings
    const controllers = ppControllerEmbeddingEngine.embedAll();
    const machines = ppMachineVectorEncoderEngine.embedAll();
    const materials = ppMaterialPropertyVectorEngine.embedAll();

    // Sample: for each machine, pick best controller and a few materials
    const scenarios: Array<{ scenario: ScenarioInput; fused: number[] }> = [];

    for (const mach of machines) {
      // Find best controller for this machine
      const bestCtrl = controllers.reduce((best, c) => {
        const sim = cosineSim(c.vector, queryFused.fused_vector.slice(0, CTRL_DIM));
        return sim > best.sim ? { ctrl: c, sim } : best;
      }, { ctrl: controllers[0], sim: -1 });

      for (const mat of materials.slice(0, 10)) { // sample 10 materials per machine
        const scenario: ScenarioInput = {
          controller_id: bestCtrl.ctrl.controller_id,
          machine_id: mach.machine_id,
          material_id: mat.material_id,
        };
        const fused = [...bestCtrl.ctrl.vector, ...mach.vector, ...mat.vector];
        scenarios.push({ scenario, fused });
      }
    }

    // Score against query
    const scored = scenarios
      .map(s => ({
        scenario: s.scenario,
        cosine_similarity: round4(cosineSim(queryFused.fused_vector, s.fused)),
        compatibility: round4(this.quickCompatibility(s.fused)),
      }))
      .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
      .slice(0, k);

    return { query: input, nearest: scored };
  }

  /**
   * Analyze gaps and mismatches in a machining scenario.
   */
  analyzeGaps(input: ScenarioInput): ScenarioGapAnalysis {
    const gaps: ScenarioGapAnalysis["gaps"] = [];
    const recs: string[] = [];

    const ctrlEmb = ppControllerEmbeddingEngine.embed(input.controller_id);
    const machEmb = ppMachineVectorEncoderEngine.embed(input.machine_id);
    const matEmb = ppMaterialPropertyVectorEngine.embed(input.material_id);

    // Missing embeddings
    if (!ctrlEmb) {
      gaps.push({ domain: "controller", issue: `Unknown controller: ${input.controller_id}`, severity: "critical" });
      recs.push("Use pp_embedding_transfer to infer controller dialect from sample G-code");
    }
    if (!machEmb) {
      gaps.push({ domain: "machine", issue: `Unknown machine: ${input.machine_id}`, severity: "warning" });
      recs.push("Add machine to PostProcessorMachineKinematicsEngine.ingestMachine()");
    }
    if (!matEmb) {
      gaps.push({ domain: "material", issue: `Unknown material: ${input.material_id}`, severity: "warning" });
      recs.push("Use pp_material_nearest to find similar known material");
    }

    if (!ctrlEmb || !machEmb || !matEmb) {
      return { scenario: input, gaps, recommendations: recs };
    }

    // Cross-modal checks
    const ctrlVec = ctrlEmb.vector;
    const machVec = machEmb.vector;
    const matVec = matEmb.vector;

    // 5-axis controller with 3-axis machine?
    const ctrlHasTCPC = ctrlVec[19] === 1; // has_tcpc
    const machIs5Axis = machVec[36] === 1;  // is_5axis
    if (ctrlHasTCPC && !machIs5Axis) {
      gaps.push({ domain: "cross-modal", issue: "Controller has TCPC but machine is not 5-axis", severity: "info" });
    }
    if (machIs5Axis && !ctrlHasTCPC) {
      gaps.push({ domain: "cross-modal", issue: "Machine is 5-axis but controller lacks TCPC — verify manually", severity: "warning" });
      recs.push("Check controller documentation for 5-axis TCP/TCPM support");
    }

    // High-speed controller with low-accel machine?
    const ctrlHasHSC = ctrlVec[17] === 1;
    const machAccel = machVec[31]; // rapid_accel_norm
    if (ctrlHasHSC && machAccel < 0.3) {
      gaps.push({ domain: "cross-modal", issue: "HSC mode available but machine acceleration is low", severity: "info" });
    }

    // Hard material on production machine?
    const matIsHardened = matVec[29] === 1;  // is_hardened
    const matIsHeatResist = matVec[30] === 1; // is_heat_resistant
    const machTier = machVec.slice(14, 19); // tier one-hot
    const isProduction = machTier[0] === 1;
    if ((matIsHardened || matIsHeatResist) && isProduction) {
      gaps.push({
        domain: "cross-modal",
        issue: "Hardened/heat-resistant material on production-tier machine — expect shorter tool life",
        severity: "warning",
      });
      recs.push("Consider precision-tier or better machine for this material");
    }

    // Low-machinability material without coolant-through?
    const matMachinability = matVec[17]; // machinability_norm
    const machCoolantThrough = machVec[29] === 1;
    if (matMachinability < 0.3 && !machCoolantThrough) {
      gaps.push({
        domain: "cross-modal",
        issue: "Low machinability material without through-spindle coolant",
        severity: "warning",
      });
      recs.push("Through-spindle coolant strongly recommended for this material");
    }

    if (gaps.length === 0) {
      recs.push("Scenario looks compatible — no cross-modal issues detected");
    }

    return { scenario: input, gaps, recommendations: recs };
  }

  /** Cosine similarity between two fused vectors. */
  cosineSimilarity(a: number[], b: number[]): number {
    return cosineSim(a, b);
  }

  // ── Private ──────────────────────────────────────────────────────────

  private scoreCompatibility(
    ctrl: number[], mach: number[], mat: number[], input: ScenarioInput,
  ): CompatibilityScore {
    const warnings: string[] = [];

    // Controller-Machine compatibility: do capabilities match?
    const ctrlAxes = ctrl[31] ?? 0;  // max_axes_norm in controller
    const machAxes = mach[5] ?? 0;   // axis_count_norm in machine
    const cmFit = 1 - Math.abs(ctrlAxes - machAxes) * 0.5;

    // Machine-Material: can machine handle this material?
    const machPower = mach[27] ?? 0;  // spindle_power_norm
    const matHardness = mat[12] ?? 0; // hardness_hb_norm
    const mmFit = machPower > 0 ? Math.min(1, machPower / Math.max(matHardness, 0.1)) : 0.5;
    if (matHardness > 0.7 && machPower < 0.4) {
      warnings.push("Hard material may exceed machine spindle capacity");
    }

    // Controller-Material: indirect (via recommended speeds matching controller capability)
    const matSFM = mat[24] ?? 0;     // sfm_rough_norm
    const ctrlBlockRate = ctrl[30] ?? 0; // block_rate_norm
    const cmtFit = 1 - Math.abs(matSFM - ctrlBlockRate) * 0.3;

    const overall = round2((cmFit + mmFit + cmtFit) / 3);

    return {
      overall: Math.max(0, Math.min(1, overall)),
      controller_machine: round2(cmFit),
      machine_material: round2(mmFit),
      controller_material: round2(cmtFit),
      warnings,
    };
  }

  private quickCompatibility(fused: number[]): number {
    // Quick score from fused vector magnitudes
    const ctrl = fused.slice(0, CTRL_DIM);
    const mach = fused.slice(CTRL_DIM, CTRL_DIM + MACH_DIM);
    const mat = fused.slice(CTRL_DIM + MACH_DIM);

    const ctrlMag = Math.sqrt(ctrl.reduce((s, v) => s + v * v, 0));
    const machMag = Math.sqrt(mach.reduce((s, v) => s + v * v, 0));
    const matMag = Math.sqrt(mat.reduce((s, v) => s + v * v, 0));

    // All three should have reasonable magnitude (not empty)
    const minMag = Math.min(ctrlMag, machMag, matMag);
    const maxMag = Math.max(ctrlMag, machMag, matMag);
    return maxMag > 0 ? minMag / maxMag : 0;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

// ── Singleton ─────────────────────────────────────────────────────────

export const ppMultiModalFusionEngine = new PPMultiModalFusionEngine();
