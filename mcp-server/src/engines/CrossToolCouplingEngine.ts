/**
 * CrossToolCouplingEngine — Multi-Tool Dynamic Coupling Analysis
 *
 * MILL-AGI Phase 2 (MILL-MS7): Physics Hardening — Cross-Tool Interactions
 *
 * Models dynamic interactions between multiple tools cutting simultaneously:
 *   - Gang tooling on lathes (multiple tools on turret)
 *   - Multi-spindle machines (parallel spindles)
 *   - Mill-turn with live tooling + turning
 *   - Twin-spindle facing operations
 *
 * Key Physics:
 *   - Force superposition: Propagation through workpiece/fixture
 *   - Vibration coupling: Mode shapes can couple between tools
 *   - Chatter synchronization: In-phase vs out-of-phase regeneration
 *   - Cross-talk: Tool i's chatter frequency exciting tool j
 *   - Phase relationships: Timing between cuts affects stability
 *
 * Mathematical Model:
 *   - Coupled ODEs: M·ẍ + C·ẋ + K·x = F(t, x)
 *   - Cross-coupling stiffness: K_ij = f(workpiece, fixture)
 *   - Modal coupling coefficient: η_ij = φ_i · φ_j (mode overlap)
 *   - Regenerative delay: τ_i = 60/(N_i × z_i)
 *
 * References:
 *   [1] Budak & Altintas (1998) "Analytical Prediction of Chatter Stability
 *       in Milling—Part II: Application of the General Formulation to
 *       Common Milling Systems" J. Dyn. Sys. Meas. Control
 *   [2] Altintas, Y. (2012) "Manufacturing Automation" Ch. 5 — Multi-axis
 *   [3] Merdol & Altintas (2004) "Multi Frequency Solution of Chatter Stability
 *       for Low Immersion Milling" CIRP Annals
 *   [4] MIT 2.830 Lecture Notes — Multi-tool vibration coupling
 *
 * @module engines/CrossToolCouplingEngine
 * @milestone MILL-AGI-P2/MILL-MS7-03
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolStation {
  id: string;
  position_mm: { x: number; y: number; z: number };
  modal_frequency_hz: number;
  modal_damping: number;
  modal_stiffness_n_per_um: number;
  spindle_rpm: number;
  flute_count: number;
  cutting_force_n: number;
  active: boolean;
}

export interface WorkpieceProperties {
  material: string;
  elastic_modulus_gpa: number;
  density_kg_m3: number;
  geometry: "bar" | "plate" | "disc" | "shaft" | "complex";
  length_mm: number;
  diameter_mm?: number;
  width_mm?: number;
  thickness_mm?: number;
}

export interface FixtureProperties {
  type: "chuck" | "vise" | "fixture_plate" | "collet" | "faceplate";
  stiffness_n_per_um: number;
  damping_ratio: number;
  support_points: number;
}

export interface CouplingInput {
  tools: ToolStation[];
  workpiece: WorkpieceProperties;
  fixture: FixtureProperties;
}

export interface CouplingMatrix {
  size: number;
  stiffness_coupling: number[][];
  damping_coupling: number[][];
  force_transmission: number[][];
}

export interface CoupledMode {
  frequency_hz: number;
  damping_ratio: number;
  participation_factors: Record<string, number>;
  mode_type: "localized" | "coupled" | "global";
}

export interface StabilitySummary {
  overall_stable: boolean;
  limiting_tool_id: string;
  limiting_ap_mm: number;
  interaction_factor: number;
  synchronization_risk: "none" | "low" | "moderate" | "high";
}

export interface CrossToolResult {
  coupling_matrix: CouplingMatrix;
  coupled_modes: CoupledMode[];
  stability: StabilitySummary;
  force_distribution: Record<string, { direct_n: number; coupled_n: number }>;
  chatter_frequencies_hz: number[];
  phase_relationships: Array<{
    tool_i: string;
    tool_j: string;
    phase_deg: number;
    coupling_strength: number;
  }>;
  recommendations: string[];
  warnings: string[];
  confidence: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CrossToolCouplingEngine {
  /**
   * Analyze cross-tool coupling for multi-tool setup.
   */
  analyze(input: CouplingInput): CrossToolResult {
    const startTime = performance.now();

    const activeTools = input.tools.filter((t) => t.active);
    if (activeTools.length < 2) {
      return this.singleToolResult(input.tools[0]);
    }

    const couplingMatrix = this.buildCouplingMatrix(activeTools, input.workpiece, input.fixture);

    const coupledModes = this.computeCoupledModes(activeTools, couplingMatrix);

    const forceDistribution = this.computeForceDistribution(activeTools, couplingMatrix);

    const phaseRelationships = this.computePhaseRelationships(activeTools);

    const chatterFreqs = this.identifyChatterFrequencies(coupledModes, activeTools);

    const stability = this.assessStability(activeTools, coupledModes, couplingMatrix);

    const warnings = this.generateWarnings(activeTools, stability, couplingMatrix);
    const recommendations = this.generateRecommendations(activeTools, stability, phaseRelationships);

    const confidence = this.computeConfidence(input, activeTools.length);

    const duration = performance.now() - startTime;
    log.debug(
      `[CrossTool] ${activeTools.length} tools, ${coupledModes.length} modes, stable=${stability.overall_stable} in ${duration.toFixed(1)}ms`
    );

    return {
      coupling_matrix: couplingMatrix,
      coupled_modes: coupledModes,
      stability,
      force_distribution: forceDistribution,
      chatter_frequencies_hz: chatterFreqs,
      phase_relationships: phaseRelationships,
      recommendations,
      warnings,
      confidence,
    };
  }

  /**
   * Build stiffness/damping coupling matrix between tool stations.
   */
  buildCouplingMatrix(
    tools: ToolStation[],
    workpiece: WorkpieceProperties,
    fixture: FixtureProperties
  ): CouplingMatrix {
    const n = tools.length;

    const K: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const C: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const F: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    const wpStiffness = this.computeWorkpieceStiffness(workpiece);

    for (let i = 0; i < n; i++) {
      K[i][i] = tools[i].modal_stiffness_n_per_um;
      C[i][i] = tools[i].modal_damping;

      for (let j = i + 1; j < n; j++) {
        const distance = this.computeDistance(tools[i].position_mm, tools[j].position_mm);

        const coupling = this.computeCouplingCoefficient(
          distance,
          wpStiffness,
          fixture.stiffness_n_per_um
        );

        K[i][j] = coupling * Math.min(K[i][i], K[j][j]) * 0.1;
        K[j][i] = K[i][j];

        C[i][j] = coupling * Math.min(C[i][i], C[j][j]) * 0.05;
        C[j][i] = C[i][j];

        F[i][j] = coupling * 0.3;
        F[j][i] = F[i][j];
      }
    }

    return {
      size: n,
      stiffness_coupling: K,
      damping_coupling: C,
      force_transmission: F,
    };
  }

  /**
   * Compute coupled system modes from individual tool modes.
   */
  computeCoupledModes(tools: ToolStation[], matrix: CouplingMatrix): CoupledMode[] {
    const modes: CoupledMode[] = [];
    const n = tools.length;

    for (let i = 0; i < n; i++) {
      const baseFreq = tools[i].modal_frequency_hz;

      let freqShift = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          freqShift += (matrix.stiffness_coupling[i][j] / matrix.stiffness_coupling[i][i]) * 0.05;
        }
      }

      const participation: Record<string, number> = {};
      for (let j = 0; j < n; j++) {
        if (i === j) {
          participation[tools[j].id] = 1.0;
        } else {
          participation[tools[j].id] = matrix.stiffness_coupling[i][j] / matrix.stiffness_coupling[i][i];
        }
      }

      const maxOff = Math.max(...Object.entries(participation).filter(([k]) => k !== tools[i].id).map(([, v]) => v));
      const modeType: CoupledMode["mode_type"] =
        maxOff < 0.1 ? "localized" : maxOff < 0.3 ? "coupled" : "global";

      modes.push({
        frequency_hz: baseFreq * (1 + freqShift),
        damping_ratio: tools[i].modal_damping,
        participation_factors: participation,
        mode_type: modeType,
      });
    }

    const globalModeFreq = tools.reduce((sum, t) => sum + t.modal_frequency_hz, 0) / n;
    const globalParticipation: Record<string, number> = {};
    tools.forEach((t) => (globalParticipation[t.id] = 1 / n));

    modes.push({
      frequency_hz: globalModeFreq * 0.8,
      damping_ratio: 0.03,
      participation_factors: globalParticipation,
      mode_type: "global",
    });

    return modes.sort((a, b) => a.frequency_hz - b.frequency_hz);
  }

  /**
   * Compute force distribution including cross-coupling effects.
   */
  computeForceDistribution(
    tools: ToolStation[],
    matrix: CouplingMatrix
  ): Record<string, { direct_n: number; coupled_n: number }> {
    const result: Record<string, { direct_n: number; coupled_n: number }> = {};
    const n = tools.length;

    for (let i = 0; i < n; i++) {
      let coupledForce = 0;

      for (let j = 0; j < n; j++) {
        if (i !== j) {
          coupledForce += tools[j].cutting_force_n * matrix.force_transmission[i][j];
        }
      }

      result[tools[i].id] = {
        direct_n: tools[i].cutting_force_n,
        coupled_n: coupledForce,
      };
    }

    return result;
  }

  /**
   * Compute phase relationships between tool tooth passages.
   */
  computePhaseRelationships(
    tools: ToolStation[]
  ): CrossToolResult["phase_relationships"] {
    const relationships: CrossToolResult["phase_relationships"] = [];
    const n = tools.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const toothFreq_i = (tools[i].spindle_rpm * tools[i].flute_count) / 60;
        const toothFreq_j = (tools[j].spindle_rpm * tools[j].flute_count) / 60;

        const freqRatio = toothFreq_i / toothFreq_j;

        let phase: number;
        let strength: number;
        if (Math.abs(freqRatio - 1) < 0.01) {
          phase = 0;
          strength = 1.0;
        } else if (Math.abs(freqRatio - 2) < 0.05 || Math.abs(freqRatio - 0.5) < 0.05) {
          phase = 90;
          strength = 0.5;
        } else {
          phase = (360 * (freqRatio % 1));
          strength = 0.1 / Math.abs(freqRatio - Math.round(freqRatio));
          strength = Math.min(strength, 0.8);
        }

        relationships.push({
          tool_i: tools[i].id,
          tool_j: tools[j].id,
          phase_deg: phase,
          coupling_strength: strength,
        });
      }
    }

    return relationships;
  }

  /**
   * Identify potential chatter frequencies from coupled modes.
   */
  identifyChatterFrequencies(modes: CoupledMode[], tools: ToolStation[]): number[] {
    const freqs: number[] = [];

    for (const mode of modes) {
      if (mode.damping_ratio < 0.05) {
        freqs.push(mode.frequency_hz);
      }
    }

    for (const tool of tools) {
      const toothFreq = (tool.spindle_rpm * tool.flute_count) / 60;
      for (let k = 1; k <= 3; k++) {
        const harmonic = k * toothFreq;
        for (const mode of modes) {
          if (Math.abs(harmonic - mode.frequency_hz) / mode.frequency_hz < 0.1) {
            if (!freqs.includes(mode.frequency_hz)) {
              freqs.push(mode.frequency_hz);
            }
          }
        }
      }
    }

    return [...new Set(freqs)].sort((a, b) => a - b);
  }

  /**
   * Assess overall stability considering coupling effects.
   */
  assessStability(
    tools: ToolStation[],
    modes: CoupledMode[],
    matrix: CouplingMatrix
  ): StabilitySummary {
    let minStability = Infinity;
    let limitingTool = tools[0].id;

    for (const tool of tools) {
      const baseAp = this.estimateStableDepth(tool);

      const couplingReduction = this.computeCouplingStabilityReduction(
        tool,
        tools,
        matrix
      );

      const effectiveAp = baseAp * (1 - couplingReduction);

      if (effectiveAp < minStability) {
        minStability = effectiveAp;
        limitingTool = tool.id;
      }
    }

    const globalModes = modes.filter((m) => m.mode_type === "global");
    const lowDampingGlobal = globalModes.some((m) => m.damping_ratio < 0.02);

    const syncRisk: StabilitySummary["synchronization_risk"] = lowDampingGlobal
      ? "high"
      : globalModes.length > 1
        ? "moderate"
        : globalModes.length > 0
          ? "low"
          : "none";

    const interactionFactor = this.computeInteractionFactor(matrix);

    return {
      overall_stable: minStability > 0.5,
      limiting_tool_id: limitingTool,
      limiting_ap_mm: minStability,
      interaction_factor: interactionFactor,
      synchronization_risk: syncRisk,
    };
  }

  /**
   * Generate warnings for problematic conditions.
   */
  generateWarnings(
    tools: ToolStation[],
    stability: StabilitySummary,
    matrix: CouplingMatrix
  ): string[] {
    const warnings: string[] = [];

    if (!stability.overall_stable) {
      warnings.push(`Unstable condition — limit depth on ${stability.limiting_tool_id}`);
    }

    if (stability.synchronization_risk === "high") {
      warnings.push("High risk of synchronized chatter between tools");
    }

    if (stability.interaction_factor > 0.3) {
      warnings.push(`Strong tool interaction (${(stability.interaction_factor * 100).toFixed(0)}%) — consider phasing`);
    }

    const rpmMatch = tools.filter(
      (t, i, arr) =>
        i > 0 && Math.abs(t.spindle_rpm - arr[0].spindle_rpm) / arr[0].spindle_rpm < 0.05
    );
    if (rpmMatch.length > 0) {
      warnings.push("Multiple tools at similar RPM — phase-locked chatter possible");
    }

    return warnings;
  }

  /**
   * Generate recommendations for improved stability.
   */
  generateRecommendations(
    tools: ToolStation[],
    stability: StabilitySummary,
    phases: CrossToolResult["phase_relationships"]
  ): string[] {
    const recs: string[] = [];

    if (!stability.overall_stable) {
      recs.push(`Reduce depth on ${stability.limiting_tool_id} to below ${stability.limiting_ap_mm.toFixed(2)}mm`);
    }

    const strongCouplings = phases.filter((p) => p.coupling_strength > 0.5);
    if (strongCouplings.length > 0) {
      const pair = strongCouplings[0];
      recs.push(
        `Adjust RPM ratio between ${pair.tool_i} and ${pair.tool_j} to reduce coupling`
      );
    }

    if (stability.synchronization_risk !== "none") {
      recs.push("Consider staggering tool engagement timing");
    }

    if (stability.interaction_factor > 0.2) {
      recs.push("Increase fixture stiffness or add damping");
    }

    if (tools.length > 2) {
      recs.push("Sequence operations to minimize simultaneous cutting");
    }

    return recs;
  }

  /**
   * Validate input parameters.
   */
  validateInput(input: CouplingInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.tools.length === 0) errors.push("At least one tool required");

    for (const tool of input.tools) {
      if (tool.modal_frequency_hz <= 0) errors.push(`Tool ${tool.id}: invalid frequency`);
      if (tool.spindle_rpm <= 0) errors.push(`Tool ${tool.id}: invalid RPM`);
      if (tool.flute_count < 1) errors.push(`Tool ${tool.id}: invalid flute count`);
    }

    if (input.workpiece.elastic_modulus_gpa <= 0) errors.push("Invalid workpiece modulus");
    if (input.fixture.stiffness_n_per_um <= 0) errors.push("Invalid fixture stiffness");

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private singleToolResult(tool: ToolStation | undefined): CrossToolResult {
    const defaultTool = tool ?? {
      id: "single",
      modal_frequency_hz: 1000,
      modal_stiffness_n_per_um: 50,
      modal_damping: 0.03,
      cutting_force_n: 100,
    };

    return {
      coupling_matrix: {
        size: 1,
        stiffness_coupling: [[defaultTool.modal_stiffness_n_per_um]],
        damping_coupling: [[defaultTool.modal_damping]],
        force_transmission: [[1]],
      },
      coupled_modes: [
        {
          frequency_hz: defaultTool.modal_frequency_hz,
          damping_ratio: defaultTool.modal_damping,
          participation_factors: { [defaultTool.id]: 1.0 },
          mode_type: "localized",
        },
      ],
      stability: {
        overall_stable: true,
        limiting_tool_id: defaultTool.id,
        limiting_ap_mm: 5.0,
        interaction_factor: 0,
        synchronization_risk: "none",
      },
      force_distribution: {
        [defaultTool.id]: { direct_n: defaultTool.cutting_force_n, coupled_n: 0 },
      },
      chatter_frequencies_hz: [],
      phase_relationships: [],
      recommendations: [],
      warnings: [],
      confidence: 0.95,
    };
  }

  private computeWorkpieceStiffness(wp: WorkpieceProperties): number {
    const E = wp.elastic_modulus_gpa * 1e9;
    const L = wp.length_mm / 1000;

    if (wp.geometry === "bar" || wp.geometry === "shaft") {
      const D = (wp.diameter_mm ?? 50) / 1000;
      const I = (Math.PI * Math.pow(D, 4)) / 64;
      return (3 * E * I) / Math.pow(L, 3) / 1e6;
    } else if (wp.geometry === "plate") {
      const t = (wp.thickness_mm ?? 10) / 1000;
      const w = (wp.width_mm ?? 100) / 1000;
      const I = (w * Math.pow(t, 3)) / 12;
      return (3 * E * I) / Math.pow(L, 3) / 1e6;
    }

    return 100;
  }

  private computeDistance(
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number }
  ): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
    );
  }

  private computeCouplingCoefficient(
    distance_mm: number,
    wpStiffness: number,
    fixtureStiffness: number
  ): number {
    const baseCoeff = 1 / (1 + distance_mm / 50);

    const stiffnessRatio = wpStiffness / (wpStiffness + fixtureStiffness);

    return baseCoeff * stiffnessRatio;
  }

  private estimateStableDepth(tool: ToolStation): number {
    const k = tool.modal_stiffness_n_per_um;
    const zeta = tool.modal_damping;
    const kc = 2000;

    return (k * zeta * 2) / kc;
  }

  private computeCouplingStabilityReduction(
    tool: ToolStation,
    allTools: ToolStation[],
    matrix: CouplingMatrix
  ): number {
    const idx = allTools.findIndex((t) => t.id === tool.id);
    if (idx < 0) return 0;

    let reduction = 0;
    for (let j = 0; j < allTools.length; j++) {
      if (j !== idx) {
        reduction += matrix.stiffness_coupling[idx][j] / matrix.stiffness_coupling[idx][idx];
      }
    }

    return Math.min(reduction, 0.5);
  }

  private computeInteractionFactor(matrix: CouplingMatrix): number {
    let offDiagSum = 0;
    let diagSum = 0;

    for (let i = 0; i < matrix.size; i++) {
      diagSum += matrix.stiffness_coupling[i][i];
      for (let j = 0; j < matrix.size; j++) {
        if (i !== j) {
          offDiagSum += Math.abs(matrix.stiffness_coupling[i][j]);
        }
      }
    }

    return diagSum > 0 ? offDiagSum / diagSum : 0;
  }

  private computeConfidence(input: CouplingInput, toolCount: number): number {
    let confidence = 0.85;

    if (toolCount > 4) confidence -= 0.1;
    else if (toolCount > 2) confidence -= 0.05;

    if (input.workpiece.geometry === "complex") confidence -= 0.1;

    if (input.fixture.support_points >= 4) confidence += 0.05;

    return Math.max(Math.min(confidence, 0.95), 0.5);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const crossToolCouplingEngine = new CrossToolCouplingEngine();
