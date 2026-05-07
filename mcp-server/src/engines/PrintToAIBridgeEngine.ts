/**
 * PrintToAIBridgeEngine.ts
 *
 * Bridge connecting print/drawing interpretation engines to the Machining
 * Intelligence Orchestrator. Takes OCR output or parsed features and routes
 * them through AI subsystems for intelligent decision-making.
 *
 * Pipeline:
 *   1. Accept print data (OCR text, extracted features, material callouts)
 *   2. Resolve ambiguities using reasoning engines
 *   3. Generate MachiningContext from extracted data
 *   4. Route to MachiningIntelligenceOrchestratorEngine
 *   5. Return AI-enhanced machining plan with reasoning chain
 *
 * Integrates:
 *   - BlueprintVisionOCREngine — text extraction
 *   - MaterialCalloutParserEngine — material identification
 *   - AmbiguityResolutionEngine — feature disambiguation
 *   - MachiningIntelligenceOrchestratorEngine — AI orchestration
 *   - AISubsystemRegistry — capability queries
 *
 * @module engines/PrintToAIBridgeEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_MATERIAL_DB } from "../physics/constants.js";
import type { MachiningContext, MachiningPlan } from "./MachiningIntelligenceOrchestratorEngine.js";

// ==================== TYPE DEFINITIONS ====================

export interface PrintInput {
  ocr_text?: string;
  extracted_dimensions?: ExtractedDimension[];
  material_callout?: string;
  gdt_callouts?: GDTCallout[];
  detected_features?: DetectedFeature[];
  file_type?: "pdf" | "step" | "iges" | "dxf";
  confidence?: number;
}

export interface ExtractedDimension {
  nominal: number;
  unit: "mm" | "inch";
  tolerance_plus?: number;
  tolerance_minus?: number;
  dimension_type: "linear" | "diameter" | "radius" | "angle";
  feature_id?: string;
}

export interface GDTCallout {
  symbol: string;
  value: number;
  unit: "mm" | "inch";
  datum?: string;
  modifier?: string;
}

export interface DetectedFeature {
  id: string;
  type: "hole" | "pocket" | "slot" | "boss" | "thread" | "groove" | "face" | "contour";
  dimensions: Record<string, number>;
  position?: { x: number; y: number; z: number };
  confidence: number;
}

export interface MaterialResolution {
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  confidence: number;
  alternatives: { name: string; confidence: number }[];
  reasoning: string[];
}

export interface FeatureResolution {
  resolved_features: ResolvedFeature[];
  ambiguities_found: number;
  ambiguities_resolved: number;
  reasoning: string[];
}

export interface ResolvedFeature {
  id: string;
  type: string;
  operation_type: "roughing" | "finishing" | "drilling" | "threading";
  priority: number;
  dimensions: Record<string, number>;
  tolerance_class: "tight" | "standard" | "loose";
}

export interface PrintToAIPlan extends MachiningPlan {
  print_analysis: {
    material_resolution: MaterialResolution;
    feature_resolution: FeatureResolution;
    machine_recommendation: MachineRecommendation;
    estimated_cycle_time_min: number;
    estimated_cost: number;
  };
}

export interface MachineRecommendation {
  primary: string;
  alternatives: string[];
  rationale: string[];
  capability_match: number;
  cost_factor: number;
}

// ==================== ENGINE IMPLEMENTATION ====================

class PrintToAIBridgeEngine {
  /**
   * Main entry point: Process print input through AI pipeline
   */
  async processFromPrint(input: PrintInput): Promise<PrintToAIPlan> {
    const startTime = Date.now();
    const reasoning: string[] = [];

    reasoning.push(`[PRINT-AI] Starting print-to-AI processing`);
    reasoning.push(`[PRINT-AI] Input type: ${input.file_type || "text"}, confidence: ${(input.confidence || 0) * 100}%`);

    // Step 1: Resolve material from callout
    const materialResolution = await this.resolveMaterial(input.material_callout, reasoning);

    // Step 2: Resolve features and ambiguities
    const featureResolution = await this.resolveFeatures(input.detected_features || [], reasoning);

    // Step 3: Determine machine type and operation
    const machineRecommendation = await this.recommendMachine(featureResolution, materialResolution, reasoning);

    // Step 4: Build MachiningContext
    const context = this.buildContext(input, materialResolution, featureResolution, machineRecommendation);

    // Step 5: Route to orchestrator
    const { machiningIntelligenceOrchestratorEngine } = await import("./MachiningIntelligenceOrchestratorEngine.js");
    const basePlan = await machiningIntelligenceOrchestratorEngine.orchestrate(context);

    // Step 6: Enhance with print analysis
    const cycleTime = this.estimateCycleTime(featureResolution, basePlan);
    const cost = this.estimateCost(cycleTime, materialResolution, machineRecommendation);

    reasoning.push(`[PRINT-AI] Complete in ${Date.now() - startTime}ms`);

    return {
      ...basePlan,
      reasoning_chain: [...reasoning, ...basePlan.reasoning_chain],
      print_analysis: {
        material_resolution: materialResolution,
        feature_resolution: featureResolution,
        machine_recommendation: machineRecommendation,
        estimated_cycle_time_min: cycleTime,
        estimated_cost: cost,
      },
    };
  }

  /**
   * Resolve material from callout text
   */
  async resolveMaterial(callout: string | undefined, reasoning: string[]): Promise<MaterialResolution> {
    const defaultMaterial = {
      material_name: "Steel_4140",
      iso_group: "P" as const,
      confidence: 0.5,
      alternatives: [],
      reasoning: ["No material callout provided, defaulting to Steel 4140"],
    };

    if (!callout) {
      reasoning.push("[MATERIAL] No callout provided, using default Steel 4140");
      return defaultMaterial;
    }

    const upperCallout = callout.toUpperCase();
    reasoning.push(`[MATERIAL] Analyzing callout: "${callout}"`);

    // Common material patterns
    const patterns: { regex: RegExp; material: string; iso: "P" | "M" | "K" | "N" | "S" | "H" }[] = [
      { regex: /4140|4340|8620|1045|1018|A36/i, material: "Steel_4140", iso: "P" },
      { regex: /304|316|17-4|15-5|STAINLESS/i, material: "Stainless_304", iso: "M" },
      { regex: /6061|7075|2024|ALUMINUM|AL\b/i, material: "Aluminum_6061", iso: "N" },
      { regex: /TI6AL4V|TITANIUM|TI\b/i, material: "Ti6Al4V", iso: "S" },
      { regex: /INCONEL|718|625|HASTELLOY/i, material: "Inconel_718", iso: "S" },
      { regex: /CAST\s*IRON|GRAY\s*IRON/i, material: "Cast_Iron_Gray", iso: "K" },
      { regex: /D2|A2|O1|M2|H13|TOOL\s*STEEL/i, material: "D2_Tool_Steel", iso: "H" },
      { regex: /BRASS|BRONZE|COPPER/i, material: "Brass_360", iso: "N" },
    ];

    for (const { regex, material, iso } of patterns) {
      if (regex.test(upperCallout)) {
        reasoning.push(`[MATERIAL] Matched "${material}" (ISO ${iso}) with high confidence`);
        return {
          material_name: material,
          iso_group: iso,
          confidence: 0.92,
          alternatives: [],
          reasoning: [`Matched pattern "${regex.source}" in callout`],
        };
      }
    }

    // Fuzzy search in material database
    const candidates: { name: string; score: number }[] = [];
    for (const matName of Object.keys(CANONICAL_MATERIAL_DB)) {
      const score = this.fuzzyMatch(upperCallout, matName.toUpperCase());
      if (score > 0.3) {
        candidates.push({ name: matName, score });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const matData = CANONICAL_MATERIAL_DB[best.name];

      reasoning.push(`[MATERIAL] Fuzzy matched "${best.name}" with score ${(best.score * 100).toFixed(0)}%`);

      return {
        material_name: best.name,
        iso_group: matData?.iso_group || "P",
        confidence: best.score,
        alternatives: candidates.slice(1, 4).map(c => ({ name: c.name, confidence: c.score })),
        reasoning: [`Fuzzy match score: ${best.score.toFixed(2)}`],
      };
    }

    reasoning.push("[MATERIAL] No match found, using default");
    return defaultMaterial;
  }

  /**
   * Resolve features and handle ambiguities
   */
  async resolveFeatures(features: DetectedFeature[], reasoning: string[]): Promise<FeatureResolution> {
    reasoning.push(`[FEATURES] Processing ${features.length} detected features`);

    if (features.length === 0) {
      return {
        resolved_features: [],
        ambiguities_found: 0,
        ambiguities_resolved: 0,
        reasoning: ["No features provided"],
      };
    }

    const resolved: ResolvedFeature[] = [];
    let ambiguities = 0;
    let resolvedCount = 0;

    for (const feature of features) {
      // Check for low confidence (ambiguous)
      if (feature.confidence < 0.7) {
        ambiguities++;
        reasoning.push(`[FEATURES] Ambiguity detected: ${feature.type} (${(feature.confidence * 100).toFixed(0)}% confidence)`);

        // Apply disambiguation heuristics
        const disambiguated = this.disambiguateFeature(feature);
        if (disambiguated.confidence > feature.confidence) {
          resolvedCount++;
          reasoning.push(`[FEATURES] Resolved ${feature.type} → ${disambiguated.type}`);
        }
      }

      // Determine operation type
      const opType = this.determineOperationType(feature);

      // Determine tolerance class
      const tolClass = this.determineToleranceClass(feature.dimensions);

      resolved.push({
        id: feature.id,
        type: feature.type,
        operation_type: opType,
        priority: this.calculateFeaturePriority(feature, opType),
        dimensions: feature.dimensions,
        tolerance_class: tolClass,
      });
    }

    // Sort by priority
    resolved.sort((a, b) => a.priority - b.priority);

    return {
      resolved_features: resolved,
      ambiguities_found: ambiguities,
      ambiguities_resolved: resolvedCount,
      reasoning: [`Processed ${features.length} features, ${ambiguities} ambiguities, ${resolvedCount} resolved`],
    };
  }

  /**
   * Recommend machine based on features and material
   */
  async recommendMachine(
    features: FeatureResolution,
    material: MaterialResolution,
    reasoning: string[]
  ): Promise<MachineRecommendation> {
    reasoning.push("[MACHINE] Analyzing machine requirements");

    // Determine if turning or milling
    const featureTypes = features.resolved_features.map(f => f.type);
    const hasRotationalFeatures = featureTypes.some(t =>
      ["groove", "thread"].includes(t) || featureTypes.filter(f => f === "face").length > 2
    );
    const hasPrismaticFeatures = featureTypes.some(t =>
      ["pocket", "slot", "boss"].includes(t)
    );

    let machineType: string;
    let alternatives: string[];

    if (hasRotationalFeatures && !hasPrismaticFeatures) {
      machineType = "CNC Lathe";
      alternatives = ["CNC Turning Center", "Swiss-Type Lathe"];
      reasoning.push("[MACHINE] Rotational features detected → Lathe recommended");
    } else if (hasPrismaticFeatures && !hasRotationalFeatures) {
      machineType = "3-Axis Mill";
      alternatives = ["VMC", "5-Axis Mill"];
      reasoning.push("[MACHINE] Prismatic features detected → Mill recommended");
    } else if (hasRotationalFeatures && hasPrismaticFeatures) {
      machineType = "Mill-Turn Center";
      alternatives = ["5-Axis Mill-Turn", "CNC Lathe + Mill"];
      reasoning.push("[MACHINE] Mixed features detected → Mill-Turn recommended");
    } else {
      machineType = "3-Axis Mill";
      alternatives = ["VMC"];
      reasoning.push("[MACHINE] Default to 3-Axis Mill");
    }

    // Adjust for difficult materials
    if (["S", "H"].includes(material.iso_group)) {
      reasoning.push(`[MACHINE] Difficult material (ISO ${material.iso_group}) may require rigid setup`);
    }

    return {
      primary: machineType,
      alternatives,
      rationale: reasoning.filter(r => r.includes("[MACHINE]")),
      capability_match: 0.88,
      cost_factor: 1.0,
    };
  }

  /**
   * Build MachiningContext from resolved data
   */
  private buildContext(
    input: PrintInput,
    material: MaterialResolution,
    features: FeatureResolution,
    machine: MachineRecommendation
  ): MachiningContext {
    // Determine machine type
    const machineType = machine.primary.toLowerCase().includes("lathe") ? "lathe"
      : machine.primary.toLowerCase().includes("5-axis") || machine.primary.toLowerCase().includes("5 axis") ? "5axis"
      : "mill";

    // Determine primary operation
    const ops = features.resolved_features.map(f => f.operation_type);
    const primaryOp = ops.includes("roughing") ? "roughing"
      : ops.includes("finishing") ? "finishing"
      : ops.includes("drilling") ? "drilling"
      : "roughing";

    // Extract stock dimensions from features
    const dims = input.extracted_dimensions || [];
    const maxDim = Math.max(...dims.map(d => d.nominal), 100);

    return {
      machine_type: machineType,
      operation_type: primaryOp,
      material: {
        name: material.material_name,
        iso_group: material.iso_group,
      },
      tool: {
        type: primaryOp === "drilling" ? "drill" : "endmill",
        diameter_mm: Math.min(maxDim / 10, 20),
        flutes: 4,
        material: "carbide",
      },
      geometry: {
        stock_dimensions_mm: [maxDim, maxDim * 0.6, maxDim * 0.4],
        feature_complexity: features.resolved_features.length > 10 ? "complex"
          : features.resolved_features.length > 3 ? "moderate"
          : "simple",
      },
      constraints: {},
    };
  }

  /**
   * Estimate cycle time from features and plan
   */
  private estimateCycleTime(features: FeatureResolution, plan: MachiningPlan): number {
    const baseTime = 5; // Setup time
    const mrr = plan.predictions.mrr_cm3_min;
    const featureCount = features.resolved_features.length;

    // Rough estimate: 2 min per feature + material removal time
    const volumeEstimate = featureCount * 10; // cm³ rough estimate
    const machiningTime = volumeEstimate / (mrr || 1);

    return baseTime + machiningTime + featureCount * 1.5;
  }

  /**
   * Estimate cost based on cycle time and machine
   */
  private estimateCost(cycleTime: number, material: MaterialResolution, machine: MachineRecommendation): number {
    const hourlyRate = machine.primary.includes("5-Axis") ? 150
      : machine.primary.includes("Mill-Turn") ? 125
      : 85;

    const materialMultiplier = ["S", "H"].includes(material.iso_group) ? 1.3 : 1.0;

    return (cycleTime / 60) * hourlyRate * materialMultiplier * machine.cost_factor;
  }

  // ==================== HELPER METHODS ====================

  private fuzzyMatch(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.8;

    let matches = 0;
    const aWords = a.split(/[\s_-]+/);
    const bWords = b.split(/[\s_-]+/);

    for (const aw of aWords) {
      for (const bw of bWords) {
        if (aw === bw) matches++;
        else if (aw.includes(bw) || bw.includes(aw)) matches += 0.5;
      }
    }

    return matches / Math.max(aWords.length, bWords.length);
  }

  private disambiguateFeature(feature: DetectedFeature): DetectedFeature {
    // Simple disambiguation rules
    const dims = feature.dimensions;

    if (feature.type === "hole" && dims.depth && dims.diameter) {
      if (dims.depth / dims.diameter > 10) {
        return { ...feature, type: "hole", confidence: 0.85 };
      }
    }

    if (feature.type === "pocket" && dims.width && dims.length) {
      if (Math.abs(dims.width - dims.length) < 0.1) {
        return { ...feature, type: "pocket", confidence: 0.80 };
      }
    }

    return feature;
  }

  private determineOperationType(feature: DetectedFeature): "roughing" | "finishing" | "drilling" | "threading" {
    switch (feature.type) {
      case "hole": return "drilling";
      case "thread": return "threading";
      case "face":
      case "contour": return "finishing";
      default: return "roughing";
    }
  }

  private determineToleranceClass(dims: Record<string, number>): "tight" | "standard" | "loose" {
    // Check for tight tolerance indicators
    const hasTightTol = Object.entries(dims).some(([key, val]) => {
      if (key.includes("tolerance") && Math.abs(val) < 0.05) return true;
      return false;
    });

    if (hasTightTol) return "tight";

    const hasLooseTol = Object.entries(dims).some(([key, val]) => {
      if (key.includes("tolerance") && Math.abs(val) > 0.5) return true;
      return false;
    });

    if (hasLooseTol) return "loose";
    return "standard";
  }

  private calculateFeaturePriority(feature: DetectedFeature, opType: string): number {
    // Lower priority = do first
    const typePriority: Record<string, number> = {
      face: 1,
      roughing: 2,
      pocket: 3,
      slot: 4,
      hole: 5,
      drilling: 5,
      boss: 6,
      contour: 7,
      finishing: 8,
      thread: 9,
      threading: 9,
      groove: 10,
    };

    return typePriority[feature.type] || typePriority[opType] || 5;
  }
}

export const printToAIBridgeEngine = new PrintToAIBridgeEngine();
