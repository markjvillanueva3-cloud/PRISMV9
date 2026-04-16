/**
 * PPAGICapabilityMatrixEngine — PP-AGI per-machine capability map
 *
 * For each machine in the shop, shows exactly what PP-AGI can do:
 *   - Which controller dialect is supported (and how well)
 *   - Which operations are validated (roughing, finishing, 5-axis, EDM)
 *   - Which optimizations are available (adaptation, greedy optimizer)
 *   - Which safety rules apply
 *   - What templates exist for this machine
 *   - Overall readiness score (0-100%)
 *
 * This is the "shop owner's dashboard" — shows ROI and coverage gaps
 * at a glance for the entire machine inventory.
 *
 * @module PPAGICapabilityMatrixEngine
 */

import { ppMachineSpecificPostEngine } from "./PPMachineSpecificPostEngine.js";
import { ppControllerAdaptationEngine } from "./PPControllerAdaptationEngine.js";
import { ppControllerEmbeddingEngine } from "./PPControllerEmbeddingEngine.js";
import { ppScenarioTemplateLibraryEngine } from "./PPScenarioTemplateLibraryEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface MachineCapability {
  machine_id: string;
  machine_name: string;
  controller_id: string;

  readiness_score: number;  // 0-100

  dialect: {
    supported: boolean;
    confidence: "high" | "medium" | "low";
    adaptation_profile: boolean;
    notes: string[];
  };

  operations: {
    roughing: OperationSupport;
    finishing: OperationSupport;
    drilling: OperationSupport;
    five_axis: OperationSupport;
    turning: OperationSupport;
    edm: OperationSupport;
  };

  features: {
    physics_validation: boolean;
    safety_rules: boolean;
    greedy_optimization: boolean;
    g_code_generation: boolean;
    program_analysis: boolean;
    template_matching: boolean;
  };

  templates: {
    count: number;
    best_match_label?: string;
  };

  gaps: string[];
}

export interface OperationSupport {
  supported: boolean;
  validated: boolean;
  notes?: string;
}

export interface CapabilityMatrix {
  timestamp: number;
  total_machines: number;
  avg_readiness: number;
  machines: MachineCapability[];
  shop_summary: {
    fully_supported: number;
    partially_supported: number;
    minimal_support: number;
  };
  top_gaps: string[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPAGICapabilityMatrixEngine {
  /**
   * Generate the full capability matrix for all JM Die machines.
   */
  generateMatrix(): CapabilityMatrix {
    const allMachines = ppMachineSpecificPostEngine.listMachines();
    const capabilities: MachineCapability[] = allMachines.map(m =>
      this.assessMachine(m.id));

    const scores = capabilities.map(c => c.readiness_score);
    const avgReadiness = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    const fully = capabilities.filter(c => c.readiness_score >= 80).length;
    const partial = capabilities.filter(c => c.readiness_score >= 50 && c.readiness_score < 80).length;
    const minimal = capabilities.filter(c => c.readiness_score < 50).length;

    // Aggregate gaps
    const gapCounts = new Map<string, number>();
    for (const c of capabilities) {
      for (const g of c.gaps) {
        gapCounts.set(g, (gapCounts.get(g) ?? 0) + 1);
      }
    }
    const topGaps = [...gapCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([gap, count]) => `${gap} (${count} machines)`);

    return {
      timestamp: Date.now(),
      total_machines: allMachines.length,
      avg_readiness: avgReadiness,
      machines: capabilities,
      shop_summary: { fully_supported: fully, partially_supported: partial, minimal_support: minimal },
      top_gaps: topGaps,
    };
  }

  /**
   * Assess a single machine's PP-AGI capabilities.
   */
  assessMachine(machineId: string): MachineCapability {
    const machine = ppMachineSpecificPostEngine.getMachine(machineId);
    if (!machine) {
      return this.unknownMachine(machineId);
    }

    const config = ppMachineSpecificPostEngine.generateConfig(machineId);
    const gaps: string[] = [];

    // Dialect support
    const ctrlEmb = ppControllerEmbeddingEngine.embed(machine.controller_id);
    const hasAdaptation = ppControllerAdaptationEngine.hasProfile(machine.controller_id);
    const dialectConf: MachineCapability["dialect"]["confidence"] =
      hasAdaptation ? "high" : ctrlEmb ? "medium" : "low";
    const dialectNotes = ppControllerAdaptationEngine.getNotes(machine.controller_id);

    if (!hasAdaptation) gaps.push("No controller adaptation profile");

    // Operation support
    const isMill = machine.axis_count >= 3 && machine.max_rpm > 0;
    const isLathe = machine.machine_name.toLowerCase().includes("lb") ||
                    machine.machine_name.toLowerCase().includes("lu") ||
                    machine.machine_name.toLowerCase().includes("lathe");
    const is5Axis = machine.axis_count >= 5;
    const isEDM = machine.machine_name.toLowerCase().includes("edm") ||
                  machine.machine_name.toLowerCase().includes("mitsubishi");

    const operations: MachineCapability["operations"] = {
      roughing: { supported: isMill || isLathe, validated: isMill },
      finishing: { supported: isMill || isLathe, validated: isMill },
      drilling: { supported: isMill, validated: isMill },
      five_axis: {
        supported: is5Axis,
        validated: is5Axis && !!config?.tcpc,
        notes: is5Axis ? (config?.tcpc ? "TCPC available" : "No TCPC configured") : "Not a 5-axis machine",
      },
      turning: { supported: isLathe, validated: false, notes: isLathe ? "Turning dialect not yet validated" : undefined },
      edm: { supported: isEDM, validated: false, notes: isEDM ? "EDM post not yet validated" : undefined },
    };

    if (isLathe && !operations.turning.validated) gaps.push("Turning operations not yet validated");
    if (isEDM && !operations.edm.validated) gaps.push("EDM post processor not yet validated");
    if (is5Axis && !config?.tcpc) gaps.push("5-axis TCPC not configured");

    // Features
    const features: MachineCapability["features"] = {
      physics_validation: true,
      safety_rules: true,
      greedy_optimization: isMill, // only for milling currently
      g_code_generation: !!config,
      program_analysis: true,
      template_matching: true,
    };

    // Templates
    const templates = ppScenarioTemplateLibraryEngine.search(machine.machine_name, 5);
    const templateCount = templates.length;
    if (templateCount === 0) gaps.push("No proven templates for this machine");

    // Readiness score
    let score = 0;
    if (config) score += 20;                          // post config available
    if (hasAdaptation) score += 15;                    // controller adaptation
    if (dialectConf !== "low") score += 10;            // dialect known
    if (features.greedy_optimization) score += 10;     // optimization
    if (templateCount > 0) score += 10;                // templates exist
    if (operations.roughing.validated) score += 10;    // roughing validated
    if (operations.finishing.validated) score += 10;   // finishing validated
    if (is5Axis && config?.tcpc) score += 10;          // 5-axis ready
    if (machine.validation === "verified") score += 5; // verified data
    score = Math.min(100, score);

    return {
      machine_id: machineId,
      machine_name: machine.machine_name,
      controller_id: machine.controller_id,
      readiness_score: score,
      dialect: {
        supported: !!ctrlEmb,
        confidence: dialectConf,
        adaptation_profile: hasAdaptation,
        notes: dialectNotes,
      },
      operations,
      features,
      templates: {
        count: templateCount,
        best_match_label: templates[0]?.label,
      },
      gaps,
    };
  }

  /**
   * Get machines sorted by readiness (highest first).
   */
  getRankedMachines(): Array<{ id: string; name: string; readiness: number }> {
    const matrix = this.generateMatrix();
    return matrix.machines
      .map(m => ({ id: m.machine_id, name: m.machine_name, readiness: m.readiness_score }))
      .sort((a, b) => b.readiness - a.readiness);
  }

  /**
   * Get machines that need attention (readiness < 50%).
   */
  getMachinesNeedingAttention(): MachineCapability[] {
    const matrix = this.generateMatrix();
    return matrix.machines.filter(m => m.readiness_score < 50);
  }

  private unknownMachine(id: string): MachineCapability {
    return {
      machine_id: id, machine_name: "UNKNOWN", controller_id: "unknown",
      readiness_score: 0,
      dialect: { supported: false, confidence: "low", adaptation_profile: false, notes: ["Machine not in inventory"] },
      operations: {
        roughing: { supported: false, validated: false },
        finishing: { supported: false, validated: false },
        drilling: { supported: false, validated: false },
        five_axis: { supported: false, validated: false },
        turning: { supported: false, validated: false },
        edm: { supported: false, validated: false },
      },
      features: {
        physics_validation: false, safety_rules: false,
        greedy_optimization: false, g_code_generation: false,
        program_analysis: false, template_matching: false,
      },
      templates: { count: 0 },
      gaps: ["Machine not in PP-AGI inventory"],
    };
  }
}

export const ppAGICapabilityMatrixEngine = new PPAGICapabilityMatrixEngine();
