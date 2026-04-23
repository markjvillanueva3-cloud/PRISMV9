/**
 * AutomaticPipelineComposerEngine — Phase 0.24 U-INT3
 *
 * Automatically composes processing pipelines from available assets.
 * Creates optimal workflows by chaining engines, formulas, and strategies.
 *
 * @module engines/AutomaticPipelineComposerEngine
 */

import { log } from "../utils/Logger.js";

export interface PipelineStage {
  id: string;
  name: string;
  assetType: "engine" | "formula" | "algorithm" | "strategy";
  assetId: string;
  inputs: string[];
  outputs: string[];
  estimatedDuration: number;
}

export interface ComposedPipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  totalEstimatedDuration: number;
  confidence: number;
  warnings: string[];
}

export interface CompositionRequest {
  objective: string;
  inputs: string[];
  requiredOutputs: string[];
  constraints?: {
    maxStages?: number;
    maxDuration?: number;
    preferredAssets?: string[];
  };
}

class AutomaticPipelineComposerEngine {
  private templates: Map<string, PipelineStage[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    log.info("[AutomaticPipelineComposer] Loading pipeline templates...");
    await this.loadTemplates();
    this.initialized = true;
    log.info(`[AutomaticPipelineComposer] Loaded ${this.templates.size} templates`);
  }

  private async loadTemplates(): Promise<void> {
    this.templates.set("speed_feed", [
      { id: "sf_1", name: "Material Analysis", assetType: "engine", assetId: "MaterialPropertiesEngine", inputs: ["material_spec"], outputs: ["material_props"], estimatedDuration: 50 },
      { id: "sf_2", name: "Force Calculation", assetType: "formula", assetId: "kienzle_formula", inputs: ["material_props", "cutting_params"], outputs: ["cutting_force"], estimatedDuration: 100 },
      { id: "sf_3", name: "Speed Optimization", assetType: "engine", assetId: "SpeedFeedOrchestratorEngine", inputs: ["cutting_force", "tool_spec"], outputs: ["optimal_params"], estimatedDuration: 200 },
    ]);

    this.templates.set("tool_selection", [
      { id: "ts_1", name: "Feature Analysis", assetType: "engine", assetId: "FeatureRecognitionEngine", inputs: ["geometry"], outputs: ["features"], estimatedDuration: 150 },
      { id: "ts_2", name: "Tool Matching", assetType: "engine", assetId: "ToolSelectionEngine", inputs: ["features", "material"], outputs: ["tool_candidates"], estimatedDuration: 100 },
      { id: "ts_3", name: "Tool Ranking", assetType: "algorithm", assetId: "weighted_scoring", inputs: ["tool_candidates", "constraints"], outputs: ["ranked_tools"], estimatedDuration: 50 },
    ]);

    this.templates.set("quality_prediction", [
      { id: "qp_1", name: "Process Params", assetType: "engine", assetId: "ProcessParameterEngine", inputs: ["machining_params"], outputs: ["process_state"], estimatedDuration: 80 },
      { id: "qp_2", name: "Surface Prediction", assetType: "formula", assetId: "surface_finish_formula", inputs: ["process_state", "tool_spec"], outputs: ["predicted_Ra"], estimatedDuration: 100 },
      { id: "qp_3", name: "Tolerance Check", assetType: "engine", assetId: "ToleranceValidationEngine", inputs: ["predicted_Ra", "requirements"], outputs: ["validation_result"], estimatedDuration: 50 },
    ]);
  }

  async compose(request: CompositionRequest): Promise<ComposedPipeline> {
    await this.initialize();
    const { objective, inputs, requiredOutputs, constraints = {} } = request;

    const bestTemplate = this.findBestTemplate(objective, requiredOutputs);
    const stages = this.adaptTemplate(bestTemplate, inputs, constraints);
    const warnings = this.validatePipeline(stages, requiredOutputs);

    const totalDuration = stages.reduce((sum, s) => sum + s.estimatedDuration, 0);
    const confidence = this.calculateConfidence(stages, warnings);

    return {
      id: `pipeline_${Date.now()}`,
      name: `Auto-composed: ${objective.slice(0, 30)}`,
      stages,
      totalEstimatedDuration: totalDuration,
      confidence,
      warnings,
    };
  }

  private findBestTemplate(objective: string, outputs: string[]): PipelineStage[] {
    const objLower = objective.toLowerCase();

    if (objLower.includes("speed") || objLower.includes("feed")) {
      return this.templates.get("speed_feed") || [];
    }
    if (objLower.includes("tool") || objLower.includes("select")) {
      return this.templates.get("tool_selection") || [];
    }
    if (objLower.includes("quality") || objLower.includes("surface")) {
      return this.templates.get("quality_prediction") || [];
    }

    return this.templates.get("speed_feed") || [];
  }

  private adaptTemplate(
    template: PipelineStage[],
    inputs: string[],
    constraints: { maxStages?: number; maxDuration?: number; preferredAssets?: string[] }
  ): PipelineStage[] {
    let stages = [...template];

    if (constraints.maxStages) {
      stages = stages.slice(0, constraints.maxStages);
    }

    return stages;
  }

  private validatePipeline(stages: PipelineStage[], requiredOutputs: string[]): string[] {
    const warnings: string[] = [];
    const allOutputs = new Set(stages.flatMap(s => s.outputs));

    for (const req of requiredOutputs) {
      if (!allOutputs.has(req)) {
        warnings.push(`Required output "${req}" may not be produced`);
      }
    }

    if (stages.length === 0) {
      warnings.push("Pipeline has no stages");
    }

    return warnings;
  }

  private calculateConfidence(stages: PipelineStage[], warnings: string[]): number {
    if (stages.length === 0) return 0;
    const baseConfidence = 0.9;
    const warningPenalty = warnings.length * 0.1;
    return Math.max(0.1, baseConfidence - warningPenalty);
  }

  async listTemplates(): Promise<string[]> {
    await this.initialize();
    return Array.from(this.templates.keys());
  }

  async getTemplate(name: string): Promise<PipelineStage[] | null> {
    await this.initialize();
    return this.templates.get(name) || null;
  }

  reset(): void {
    this.templates.clear();
    this.initialized = false;
    log.info("[AutomaticPipelineComposer] Reset");
  }
}

export const automaticPipelineComposerEngine = new AutomaticPipelineComposerEngine();
