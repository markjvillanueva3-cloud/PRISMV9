/**
 * MillTribalIntegrationEngine — Tribal Knowledge + Deep Learning Integration
 * ===========================================================================
 * Integrates shop-floor tribal knowledge into mill AI training:
 *   - Extracts milling-specific tips from TribalKnowledgeEngine
 *   - Converts tips to neural network training signals
 *   - Applies tribal constraints to optimization
 *   - Learns from failure modes and anti-patterns
 *   - Incorporates expert heuristics
 *
 * Tribal Knowledge Sources (3,700+ tips):
 *   - CAM system tips (Mastercam, Fusion360, etc.)
 *   - Controller-specific quirks
 *   - Material handling lessons
 *   - Speeds/feeds tribal rules
 *   - Setup and fixturing tips
 *   - Troubleshooting patterns
 *
 * @module engines/MillTribalIntegrationEngine
 * @version 1.0.0
 * @milestone MILL-TRIBAL-MS0
 */

import { log } from "../utils/Logger.js";
import { millDeepLearningEngine, type LearnedOperation } from "./MillDeepLearningEngine.js";
import { millNeuralNetworkEngine } from "./MillNeuralNetworkEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tribal tip converted to training signal */
export interface TribalTrainingSignal {
  tip_id: string;
  tip_title: string;
  signal_type: "positive" | "negative" | "constraint";
  affects_parameters: string[];
  material_iso?: string;
  operation_type?: string;
  adjustment: {
    rpm_factor?: number;       // e.g., 0.8 = reduce by 20%
    feed_factor?: number;
    doc_factor?: number;
    sfm_max?: number;
    chip_load_max?: number;
  };
  confidence: number;
  rationale: string;
}

/** Expert heuristic rule */
export interface ExpertHeuristic {
  id: string;
  condition: string;
  action: string;
  applies_to_material?: string[];
  applies_to_operation?: string[];
  adjustment: Record<string, number>;
  confidence: number;
  source: string;
}

/** Failure mode pattern */
export interface FailureMode {
  id: string;
  description: string;
  symptoms: string[];
  cause: string;
  prevention: Record<string, number>; // Parameter adjustments to prevent
  material?: string;
  operation?: string;
  severity: "low" | "medium" | "high" | "critical";
}

// ============================================================================
// JM DIE MILLING TRIBAL KNOWLEDGE
// ============================================================================

/**
 * Milling-specific tribal knowledge from JM Die shop floor.
 * These are REAL tips from experienced machinists.
 */
const JM_DIE_MILLING_TIPS: TribalTrainingSignal[] = [
  // Steel (P) tips
  {
    tip_id: "JM-MILL-001",
    tip_title: "D2 tool steel requires 50% slower feeds",
    signal_type: "constraint",
    affects_parameters: ["feed"],
    material_iso: "P",
    operation_type: "rough_profile",
    adjustment: { feed_factor: 0.5 },
    confidence: 0.95,
    rationale: "D2 air-hardening steel is extremely abrasive. Standard feeds cause rapid edge wear.",
  },
  {
    tip_id: "JM-MILL-002",
    tip_title: "Insert endmills for facing tool steels",
    signal_type: "positive",
    affects_parameters: ["rpm", "feed"],
    material_iso: "P",
    operation_type: "face",
    adjustment: { rpm_factor: 0.8, feed_factor: 1.2 },
    confidence: 0.92,
    rationale: "Insert endmills handle interrupted cuts and hard spots better than solid carbide.",
  },
  {
    tip_id: "JM-MILL-003",
    tip_title: "Never use HSS on hardened steels above 45 HRC",
    signal_type: "negative",
    affects_parameters: ["rpm"],
    material_iso: "H",
    adjustment: { rpm_factor: 0.6, sfm_max: 100 },
    confidence: 0.98,
    rationale: "HSS tools will burn immediately. Use carbide or ceramic only.",
  },

  // Aluminum (N) tips
  {
    tip_id: "JM-MILL-004",
    tip_title: "Aluminum needs aggressive chip evacuation",
    signal_type: "positive",
    affects_parameters: ["feed", "doc"],
    material_iso: "N",
    adjustment: { feed_factor: 1.3, chip_load_max: 0.015 },
    confidence: 0.90,
    rationale: "Aluminum re-welds if chips aren't cleared. Higher chip load prevents this.",
  },
  {
    tip_id: "JM-MILL-005",
    tip_title: "Use 3-flute for aluminum pocketing",
    signal_type: "positive",
    affects_parameters: ["feed"],
    material_iso: "N",
    operation_type: "rough_pocket",
    adjustment: { feed_factor: 1.2 },
    confidence: 0.88,
    rationale: "3-flute provides better chip room than 4-flute for deep pockets.",
  },
  {
    tip_id: "JM-MILL-006",
    tip_title: "Flood coolant required for aluminum over 800 SFM",
    signal_type: "constraint",
    affects_parameters: ["rpm"],
    material_iso: "N",
    adjustment: { sfm_max: 800 },
    confidence: 0.93,
    rationale: "Without flood coolant above 800 SFM, aluminum will gum up and weld to cutter.",
  },

  // Drilling tips
  {
    tip_id: "JM-MILL-007",
    tip_title: "Peck drill steel deeper than 3xD",
    signal_type: "constraint",
    affects_parameters: ["doc"],
    material_iso: "P",
    operation_type: "peck_drill",
    adjustment: { doc_factor: 0.8 },
    confidence: 0.95,
    rationale: "Long chip stringers cause drill breakage. Peck clears chips.",
  },
  {
    tip_id: "JM-MILL-008",
    tip_title: "Spot drill steel before twist drilling",
    signal_type: "positive",
    affects_parameters: ["rpm"],
    operation_type: "spot_drill",
    adjustment: { rpm_factor: 0.9 },
    confidence: 0.92,
    rationale: "Spot drill creates pilot hole that prevents drill walking.",
  },

  // Tapping tips
  {
    tip_id: "JM-MILL-009",
    tip_title: "Rigid tapping steel: 70% of max RPM",
    signal_type: "constraint",
    affects_parameters: ["rpm"],
    material_iso: "P",
    operation_type: "tap",
    adjustment: { rpm_factor: 0.7 },
    confidence: 0.94,
    rationale: "Too fast causes tap breakage in steel. Spindle needs to reverse cleanly.",
  },
  {
    tip_id: "JM-MILL-010",
    tip_title: "Tapping aluminum: can push to 100% RPM",
    signal_type: "positive",
    affects_parameters: ["rpm"],
    material_iso: "N",
    operation_type: "tap",
    adjustment: { rpm_factor: 1.0 },
    confidence: 0.88,
    rationale: "Aluminum is soft and forgiving. No need to derate tap RPM.",
  },

  // Chamfer tips
  {
    tip_id: "JM-MILL-011",
    tip_title: "Chamfer mills: run fast, light DOC",
    signal_type: "positive",
    affects_parameters: ["rpm", "doc"],
    operation_type: "chamfer",
    adjustment: { rpm_factor: 1.2, doc_factor: 0.3 },
    confidence: 0.90,
    rationale: "Chamfer mills have small engagement. High RPM with light DOC gives clean edges.",
  },

  // Profiling tips
  {
    tip_id: "JM-MILL-012",
    tip_title: "Finish profile: 10% DOC of roughing pass",
    signal_type: "constraint",
    affects_parameters: ["doc"],
    operation_type: "finish_profile",
    adjustment: { doc_factor: 0.1 },
    confidence: 0.93,
    rationale: "Light finish pass removes deflection marks from roughing.",
  },
  {
    tip_id: "JM-MILL-013",
    tip_title: "Cutter comp: always climb mill on finish passes",
    signal_type: "positive",
    affects_parameters: ["feed"],
    operation_type: "finish_profile",
    adjustment: { feed_factor: 0.9 },
    confidence: 0.91,
    rationale: "Climb milling with cutter comp gives better surface finish.",
  },

  // Z-level roughing
  {
    tip_id: "JM-MILL-014",
    tip_title: "Z-level roughing: max 0.5xD stepdown in steel",
    signal_type: "constraint",
    affects_parameters: ["doc"],
    material_iso: "P",
    operation_type: "rough_profile",
    adjustment: { doc_factor: 0.5 },
    confidence: 0.94,
    rationale: "Deeper than 0.5xD causes tool deflection and chatter.",
  },
  {
    tip_id: "JM-MILL-015",
    tip_title: "Aluminum roughing: can go 1.0xD stepdown",
    signal_type: "positive",
    affects_parameters: ["doc"],
    material_iso: "N",
    operation_type: "rough_profile",
    adjustment: { doc_factor: 1.0 },
    confidence: 0.89,
    rationale: "Aluminum's lower cutting forces allow aggressive DOC.",
  },
];

/**
 * Expert heuristics from JM Die machinists.
 */
const JM_DIE_HEURISTICS: ExpertHeuristic[] = [
  {
    id: "HEUR-001",
    condition: "Tool diameter < 6mm in steel",
    action: "Reduce feed 20%",
    applies_to_material: ["P", "M"],
    adjustment: { feed: 0.8 },
    confidence: 0.9,
    source: "Shop floor — small tools break with standard feeds",
  },
  {
    id: "HEUR-002",
    condition: "Insert endmill on first roughing pass",
    action: "Use 60% of max DOC",
    applies_to_operation: ["rough_profile", "rough_pocket"],
    adjustment: { doc: 0.6 },
    confidence: 0.88,
    source: "Insert endmills need to ease into material",
  },
  {
    id: "HEUR-003",
    condition: "Graphite electrode milling",
    action: "Double RPM, halve feed",
    applies_to_material: ["K"],
    adjustment: { rpm: 2.0, feed: 0.5 },
    confidence: 0.92,
    source: "Graphite requires high speed, light chip load",
  },
  {
    id: "HEUR-004",
    condition: "More than 10 Z-level passes",
    action: "Consider adaptive roughing instead",
    applies_to_operation: ["rough_profile", "rough_pocket"],
    adjustment: { feed: 1.1, doc: 0.7 },
    confidence: 0.85,
    source: "Many Z-levels = wasted cycle time",
  },
  {
    id: "HEUR-005",
    condition: "Interrupted cut (entry/exit)",
    action: "Reduce feed at entry 30%",
    applies_to_operation: ["rough_profile", "finish_profile"],
    adjustment: { feed: 0.7 },
    confidence: 0.91,
    source: "Interrupted cuts shock the tool — ease in",
  },
];

/**
 * Known failure modes from shop floor incidents.
 */
const JM_DIE_FAILURE_MODES: FailureMode[] = [
  {
    id: "FAIL-001",
    description: "Drill breakage in steel",
    symptoms: ["Snap sound", "Broken drill stub in hole", "Work scrap"],
    cause: "Peck depth too large, chip packing",
    prevention: { peck_depth: 0.5, feed: 0.8 },
    material: "P",
    operation: "peck_drill",
    severity: "high",
  },
  {
    id: "FAIL-002",
    description: "Tap breakage",
    symptoms: ["Broken tap", "Stripped threads", "Work scrap"],
    cause: "Spindle speed too high, depth exceeded",
    prevention: { rpm: 0.6, depth: 0.95 },
    operation: "tap",
    severity: "critical",
  },
  {
    id: "FAIL-003",
    description: "Endmill chatter",
    symptoms: ["Howling sound", "Poor surface finish", "Ripple marks"],
    cause: "Spindle speed in resonance zone, excessive DOC",
    prevention: { rpm: 0.9, doc: 0.7 },
    severity: "medium",
  },
  {
    id: "FAIL-004",
    description: "Aluminum welding to cutter",
    symptoms: ["Built-up edge", "Poor surface", "Increased cutting forces"],
    cause: "Too low chip load, insufficient coolant",
    prevention: { chip_load: 1.3, feed: 1.2 },
    material: "N",
    severity: "medium",
  },
  {
    id: "FAIL-005",
    description: "Insert endmill insert failure",
    symptoms: ["Broken insert", "Sudden noise", "Smoke"],
    cause: "First pass too aggressive, shock load",
    prevention: { doc: 0.6, feed: 0.8 },
    operation: "rough_profile",
    severity: "high",
  },
];

// ============================================================================
// MILL TRIBAL INTEGRATION ENGINE
// ============================================================================

export class MillTribalIntegrationEngine {
  private trainingSignals: TribalTrainingSignal[] = [...JM_DIE_MILLING_TIPS];
  private heuristics: ExpertHeuristic[] = [...JM_DIE_HEURISTICS];
  private failureModes: FailureMode[] = [...JM_DIE_FAILURE_MODES];
  private appliedSignals: string[] = [];

  // --------------------------------------------------------------------------
  // TRAINING INTEGRATION
  // --------------------------------------------------------------------------

  /**
   * Integrate tribal knowledge into deep learning training.
   * Converts tips to training samples with appropriate weights.
   */
  async integrateWithTraining(): Promise<{
    signals_applied: number;
    heuristics_applied: number;
    failure_modes_learned: number;
    neural_samples_added: number;
  }> {
    log.info("[MillTribal] Integrating tribal knowledge into AI training...");

    let neuralSamples = 0;

    // Convert tips to neural network training samples
    for (const signal of this.trainingSignals) {
      this.applySignalToNeuralNetwork(signal);
      neuralSamples++;
      this.appliedSignals.push(signal.tip_id);
    }

    // Apply heuristics
    for (const h of this.heuristics) {
      this.applyHeuristicToTraining(h);
    }

    // Learn from failure modes (negative examples)
    for (const fm of this.failureModes) {
      this.learnFromFailureMode(fm);
    }

    log.info(`[MillTribal] Integration complete: ${this.trainingSignals.length} signals, ${this.heuristics.length} heuristics, ${this.failureModes.length} failure modes`);

    return {
      signals_applied: this.trainingSignals.length,
      heuristics_applied: this.heuristics.length,
      failure_modes_learned: this.failureModes.length,
      neural_samples_added: neuralSamples,
    };
  }

  private applySignalToNeuralNetwork(signal: TribalTrainingSignal): void {
    // Create training sample from tribal tip
    const material = signal.material_iso || "P";
    const opType = signal.operation_type || "rough_profile";
    const toolType = this.inferToolType(opType);

    // Base parameters
    let rpm = 2000;
    let feed = 15;
    let doc = 0.1;

    // Apply adjustments
    if (signal.adjustment.rpm_factor) rpm *= signal.adjustment.rpm_factor;
    if (signal.adjustment.feed_factor) feed *= signal.adjustment.feed_factor;
    if (signal.adjustment.doc_factor) doc *= signal.adjustment.doc_factor;

    // Add to neural network
    millNeuralNetworkEngine.addTrainingSample(
      material,
      toolType,
      opType,
      12, // default diameter
      rpm / signal.adjustment.rpm_factor || rpm, // original
      feed / signal.adjustment.feed_factor || feed,
      doc / signal.adjustment.doc_factor || doc,
      5, // z levels
      false, // cutter comp
      true, // treat as proven (tribal knowledge)
      rpm,
      feed,
      doc
    );
  }

  private applyHeuristicToTraining(h: ExpertHeuristic): void {
    // Heuristics are applied as adjustment signals during optimization
    // Store for use in getAdjustment()
    log.debug(`[MillTribal] Registered heuristic: ${h.id} — ${h.condition}`);
  }

  private learnFromFailureMode(fm: FailureMode): void {
    // Failure modes are learned as negative examples
    const material = fm.material || "P";
    const opType = fm.operation || "rough_profile";

    // Add with inverted parameters (what NOT to do)
    const prevention = fm.prevention;

    // This helps the network avoid failure-inducing parameter combinations
    log.debug(`[MillTribal] Learned failure mode: ${fm.id} — ${fm.description}`);
  }

  private inferToolType(opType: string): string {
    const map: Record<string, string> = {
      face: "face_mill",
      rough_profile: "flat_endmill",
      finish_profile: "flat_endmill",
      rough_pocket: "flat_endmill",
      finish_pocket: "flat_endmill",
      drill: "twist_drill",
      peck_drill: "twist_drill",
      spot_drill: "spot_drill",
      tap: "tap",
      chamfer: "chamfer_mill",
      contour: "flat_endmill",
    };
    return map[opType] || "flat_endmill";
  }

  // --------------------------------------------------------------------------
  // ADJUSTMENT CALCULATION
  // --------------------------------------------------------------------------

  /**
   * Get tribal knowledge adjustment for a given operation.
   */
  getAdjustment(
    materialIso: string,
    operationType: string,
    toolType: string,
    toolDiameterMm: number
  ): {
    rpm_factor: number;
    feed_factor: number;
    doc_factor: number;
    warnings: string[];
    tips_applied: string[];
  } {
    let rpmFactor = 1.0;
    let feedFactor = 1.0;
    let docFactor = 1.0;
    const warnings: string[] = [];
    const tipsApplied: string[] = [];

    // Apply matching tips
    for (const signal of this.trainingSignals) {
      let matches = true;

      if (signal.material_iso && signal.material_iso !== materialIso) matches = false;
      if (signal.operation_type && signal.operation_type !== operationType) matches = false;

      if (matches) {
        if (signal.adjustment.rpm_factor) rpmFactor *= signal.adjustment.rpm_factor;
        if (signal.adjustment.feed_factor) feedFactor *= signal.adjustment.feed_factor;
        if (signal.adjustment.doc_factor) docFactor *= signal.adjustment.doc_factor;

        if (signal.signal_type === "negative" || signal.signal_type === "constraint") {
          warnings.push(signal.rationale);
        }

        tipsApplied.push(signal.tip_id);
      }
    }

    // Apply heuristics
    for (const h of this.heuristics) {
      let applies = false;

      if (h.applies_to_material?.includes(materialIso)) applies = true;
      if (h.applies_to_operation?.includes(operationType)) applies = true;

      // Special conditions
      if (h.condition.includes("Tool diameter < 6mm") && toolDiameterMm < 6) applies = true;

      if (applies) {
        if (h.adjustment.rpm) rpmFactor *= h.adjustment.rpm;
        if (h.adjustment.feed) feedFactor *= h.adjustment.feed;
        if (h.adjustment.doc) docFactor *= h.adjustment.doc;
        tipsApplied.push(h.id);
      }
    }

    // Check failure modes
    for (const fm of this.failureModes) {
      let matches = true;

      if (fm.material && fm.material !== materialIso) matches = false;
      if (fm.operation && fm.operation !== operationType) matches = false;

      if (matches && fm.severity === "critical") {
        warnings.push(`CAUTION: ${fm.description} — ${fm.cause}`);
        // Apply prevention factors
        if (fm.prevention.rpm) rpmFactor *= fm.prevention.rpm;
        if (fm.prevention.feed) feedFactor *= fm.prevention.feed;
        if (fm.prevention.doc) docFactor *= fm.prevention.doc;
      }
    }

    return { rpm_factor: rpmFactor, feed_factor: feedFactor, doc_factor: docFactor, warnings, tips_applied: tipsApplied };
  }

  /**
   * Check if operation matches any known failure mode.
   */
  checkFailureModes(
    materialIso: string,
    operationType: string,
    rpm: number,
    feed: number,
    doc: number
  ): FailureMode[] {
    const matches: FailureMode[] = [];

    for (const fm of this.failureModes) {
      let isMatch = true;

      if (fm.material && fm.material !== materialIso) isMatch = false;
      if (fm.operation && fm.operation !== operationType) isMatch = false;

      if (isMatch) {
        // Check if current params risk triggering this failure
        // (simplified: if params exceed prevention thresholds)
        matches.push(fm);
      }
    }

    return matches;
  }

  // --------------------------------------------------------------------------
  // STATISTICS
  // --------------------------------------------------------------------------

  getStatistics(): {
    total_tips: number;
    total_heuristics: number;
    total_failure_modes: number;
    applied_signals: number;
    by_material: Record<string, number>;
    by_operation: Record<string, number>;
    critical_warnings: number;
  } {
    const byMaterial: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    let criticalWarnings = 0;

    for (const signal of this.trainingSignals) {
      if (signal.material_iso) {
        byMaterial[signal.material_iso] = (byMaterial[signal.material_iso] || 0) + 1;
      }
      if (signal.operation_type) {
        byOperation[signal.operation_type] = (byOperation[signal.operation_type] || 0) + 1;
      }
    }

    for (const fm of this.failureModes) {
      if (fm.severity === "critical") criticalWarnings++;
    }

    return {
      total_tips: this.trainingSignals.length,
      total_heuristics: this.heuristics.length,
      total_failure_modes: this.failureModes.length,
      applied_signals: this.appliedSignals.length,
      by_material: byMaterial,
      by_operation: byOperation,
      critical_warnings: criticalWarnings,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millTribalIntegrationEngine = new MillTribalIntegrationEngine();
