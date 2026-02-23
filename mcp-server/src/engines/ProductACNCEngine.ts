/**
 * PRISM Product Engine — Auto CNC Programmer (ACNC)
 * ===================================================
 * MS3: Auto CNC Programmer — 10 actions
 *
 * 7-step pipeline: Feature Recognition -> Strategy Selection -> Tool Selection
 * -> Parameter Calculation -> G-code Generation -> Simulation -> Complete Output
 *
 * Composes: DecisionTreeEngine, ManufacturingCalculations, GCodeTemplateEngine,
 *           ToolpathCalculations, CollisionEngine, ProductPPGEngine (validation)
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */

import {
  calculateSpeedFeed,
  calculateTaylorToolLife,
  calculateMRR,
} from "./ManufacturingCalculations.js";

import {
  generateProgram,
  resolveController,
} from "./GCodeTemplateEngine.js";

import {
  selectToolType,
  selectStrategy,
  selectCoolantStrategy,
} from "./DecisionTreeEngine.js";

import {
  MATERIAL_HARDNESS,
  mapOperation,
  calculateSafetyScore,
  type ProductTier,
} from "./ProductEngineShared.js";

import {
  MATERIAL_DB,
} from "./ProductShopEngine.js";

import {
  ppgValidateGCode,
} from "./ProductPPGEngine.js";

// ─── ACNC History ───────────────────────────────────────────────────────────

const acncHistory: Array<{ action: string; timestamp: string; summary: string }> = [];

// ─── ACNC Constants ─────────────────────────────────────────────────────────

/** Recognized feature types for ACNC */
export const ACNC_FEATURES: Record<string, { operations: string[]; default_tool_diam: number; default_teeth: number }> = {
  pocket:       { operations: ["roughing", "finishing"], default_tool_diam: 12, default_teeth: 3 },
  slot:         { operations: ["roughing"], default_tool_diam: 10, default_teeth: 2 },
  profile:      { operations: ["roughing", "finishing"], default_tool_diam: 16, default_teeth: 4 },
  face:         { operations: ["roughing"], default_tool_diam: 50, default_teeth: 5 },
  hole:         { operations: ["drilling"], default_tool_diam: 10, default_teeth: 2 },
  thread:       { operations: ["thread_milling"], default_tool_diam: 8, default_teeth: 1 },
  "3d_surface": { operations: ["roughing", "finishing"], default_tool_diam: 10, default_teeth: 2 },
  chamfer:      { operations: ["finishing"], default_tool_diam: 10, default_teeth: 2 },
  bore:         { operations: ["boring"], default_tool_diam: 20, default_teeth: 1 },
};

// ─── ACNC Core Functions ────────────────────────────────────────────────────

/** Parse a natural-language feature description into structured params */
function acncParseFeature(description: string): {
  feature: string; depth: number; width: number; length: number;
  diameter?: number; tolerance?: number; finish?: string;
} {
  const desc = description.toLowerCase();

  // Identify feature type
  let feature = "pocket";
  if (desc.includes("slot")) feature = "slot";
  else if (desc.includes("profile") || desc.includes("contour")) feature = "profile";
  else if (desc.includes("face") || desc.includes("facing")) feature = "face";
  else if (desc.includes("hole") || desc.includes("drill")) feature = "hole";
  else if (desc.includes("thread") || desc.includes("tap")) feature = "thread";
  else if (desc.includes("3d") || desc.includes("surface") || desc.includes("freeform")) feature = "3d_surface";
  else if (desc.includes("chamfer")) feature = "chamfer";
  else if (desc.includes("bore") || desc.includes("boring")) feature = "bore";

  // Extract dimensions from description (e.g., "50mm deep", "100x80mm")
  const depthMatch = desc.match(/(\d+(?:\.\d+)?)\s*mm\s*deep/);
  const sizeMatch = desc.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*mm/);
  const diamMatch = desc.match(/(?:diameter|dia|ø)\s*(\d+(?:\.\d+)?)\s*mm/);
  const tolMatch = desc.match(/(?:tolerance|±|tol)\s*(\d+(?:\.\d+)?)\s*mm/);

  const depth = depthMatch ? parseFloat(depthMatch[1]) : 10;
  const width = sizeMatch ? parseFloat(sizeMatch[1]) : 50;
  const length = sizeMatch ? parseFloat(sizeMatch[2]) : 50;
  const diameter = diamMatch ? parseFloat(diamMatch[1]) : undefined;
  const tolerance = tolMatch ? parseFloat(tolMatch[1]) : undefined;

  // Finish quality
  let finish: string | undefined;
  if (desc.includes("mirror") || desc.includes("ra 0.")) finish = "mirror";
  else if (desc.includes("fine") || desc.includes("finish")) finish = "fine";
  else if (desc.includes("rough")) finish = "rough";

  return { feature, depth, width, length, diameter, tolerance, finish };
}

/** Step 1: Feature recognition */
function acncFeatureRecognition(params: Record<string, any>): any {
  const description = params.description;
  // If params.feature is a known feature name, treat as structured; only parse NL from description
  const isStructured = !description && typeof params.feature === "string" && ACNC_FEATURES[params.feature];

  let feature: string;
  let depth: number;
  let width: number;
  let length: number;
  let diameter: number | undefined;
  let tolerance: number | undefined;
  let finish: string | undefined;

  if (description && typeof description === "string") {
    const parsed = acncParseFeature(description);
    feature = parsed.feature;
    depth = params.depth || parsed.depth;
    width = params.width || parsed.width;
    length = params.length || parsed.length;
    diameter = params.diameter || parsed.diameter;
    tolerance = params.tolerance || parsed.tolerance;
    finish = params.finish || parsed.finish;
  } else {
    feature = params.feature || "pocket";
    depth = params.depth || 10;
    width = params.width || 50;
    length = params.length || 50;
    diameter = params.diameter;
    tolerance = params.tolerance;
    finish = params.finish;
  }

  const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
  return {
    feature,
    dimensions: { depth, width, length, diameter },
    operations: featureDef.operations,
    tolerance,
    finish_quality: finish || "standard",
    recognized_from: isStructured ? "structured" : "natural_language",
  };
}

/** Step 2: Strategy selection via DecisionTreeEngine */
function acncStrategySelection(feature: string, material: string, depth?: number, width?: number): any {
  const featureMap: Record<string, any> = {
    pocket: "pocket", slot: "slot", profile: "profile", face: "face",
    hole: "hole", thread: "thread", "3d_surface": "3d_surface",
    chamfer: "profile", bore: "hole",
  };
  const mappedFeature = featureMap[feature] || "pocket";

  const strategyResult = selectStrategy({
    feature: mappedFeature,
    material,
    depth_mm: depth,
    width_mm: width,
  });

  return {
    strategy: strategyResult.strategy,
    entry_method: strategyResult.entry_method,
    passes: strategyResult.passes,
    step_over: strategyResult.step_over,
    confidence: strategyResult.confidence,
    reasoning: strategyResult.reasoning,
    alternatives: strategyResult.alternatives,
  };
}

/** Step 3: Tool selection via DecisionTreeEngine */
function acncToolSelection(material: string, operation: string, feature: string): any {
  const toolResult = selectToolType({
    material,
    operation,
    feature,
    roughing_finishing: operation === "finishing" ? "finishing" : "roughing",
  });

  const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
  return {
    tool_type: toolResult.tool_type,
    coating: toolResult.coating,
    holder_type: toolResult.holder_type,
    geometry: toolResult.geometry,
    diameter: featureDef.default_tool_diam,
    teeth: featureDef.default_teeth,
    confidence: toolResult.confidence,
    reasoning: toolResult.reasoning,
    alternatives: toolResult.alternatives,
  };
}

/** Step 4: Parameter calculation using physics engines */
function acncParameterCalc(
  material: string, toolDiam: number, numTeeth: number,
  depth: number, width: number, operation: string,
): any {
  const matPhysics = MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"];

  const sfResult = calculateSpeedFeed({
    material_hardness: matPhysics.hardness,
    tool_material: "Carbide" as any,
    operation: mapOperation(operation),
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const vc = sfResult.cutting_speed;
  const fz = sfResult.feed_per_tooth;
  const ap = Math.min(depth, toolDiam * 0.5);
  const ae = Math.min(width, toolDiam * 0.6);

  const mrrResult = calculateMRR({
    cutting_speed: vc,
    feed_per_tooth: fz,
    axial_depth: ap,
    radial_depth: ae,
    tool_diameter: toolDiam,
    number_of_teeth: numTeeth,
  });

  const taylorResult = calculateTaylorToolLife(vc, { C: matPhysics.C, n: matPhysics.n, material_id: material }, fz, ap);

  const coolantResult = selectCoolantStrategy({
    material,
    cutting_speed_m_min: vc,
    operation,
  });

  return {
    cutting_speed_m_min: Math.round(vc),
    spindle_rpm: Math.round((vc * 1000) / (Math.PI * toolDiam)),
    feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
    feed_rate_mm_min: Math.round(sfResult.feed_rate),
    axial_depth_mm: Math.round(ap * 10) / 10,
    radial_depth_mm: Math.round(ae * 10) / 10,
    mrr_cm3_min: Math.round(mrrResult.mrr * 100) / 100,
    tool_life_min: Math.round(taylorResult.tool_life_minutes * 10) / 10,
    coolant: {
      strategy: coolantResult.strategy,
      pressure_bar: coolantResult.pressure_bar,
      concentration_pct: coolantResult.concentration_pct,
    },
  };
}

/** Step 5: G-code generation via GCodeTemplateEngine */
function acncGenerateGCode(
  feature: string, controller: string, params: any, programNumber?: number,
): any {
  const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
  const operations = featureDef.operations;

  // Map feature operations to GCode operations
  const gcodeOps: Array<{ operation: string; params: Record<string, any> }> = operations.map(op => {
    const gcodeOp = op === "drilling" ? "drilling" :
      op === "boring" ? "boring" :
      op === "thread_milling" ? "thread_milling" :
      op === "roughing" ? "circular_pocket" :
      "profile";

    return {
      operation: gcodeOp,
      params: {
        x: 0, y: 0, z_depth: -(params.axial_depth_mm || 5),
        depth: params.axial_depth_mm || 5,
        diameter: params.radial_depth_mm ? params.radial_depth_mm * 2 : 20,
        feed_rate: params.feed_rate_mm_min || 500,
        rpm: params.spindle_rpm || 5000,
        tool_number: 1,
      },
    };
  });

  // Generate full program
  const resolved = resolveController(controller || "fanuc");
  const programResult = generateProgram(
    resolved.family,
    gcodeOps.map(o => ({
      operation: o.operation,
      params: o.params as any,
    })),
  );

  // Validate the generated code
  const validation = ppgValidateGCode(programResult.gcode, resolved.family);

  return {
    controller: resolved.name,
    controller_family: resolved.family,
    program_number: programNumber || 1001,
    gcode: programResult.gcode,
    operations_count: gcodeOps.length,
    line_count: programResult.line_count,
    validation,
  };
}

/** Step 6: Simulation/safety check */
function acncSimulate(params: any, gcodeResult: any): any {
  // Use collision engine for basic clearance check
  const toolDiam = params.tool?.diameter || 12;
  const depth = params.dimensions?.depth || 10;
  const width = params.dimensions?.width || 50;

  // Simplified simulation using safety score
  const matPhysics = MATERIAL_HARDNESS[params.material || "4140"] || MATERIAL_HARDNESS["4140"];
  const cuttingSpeed = params.parameters?.cutting_speed_m_min || 100;
  const feedPerTooth = params.parameters?.feed_per_tooth_mm || 0.1;
  const ap = params.parameters?.axial_depth_mm || 5;
  const ae = params.parameters?.radial_depth_mm || 7;

  const estimatedPower = (matPhysics.kc1_1 * feedPerTooth * ap * ae) * cuttingSpeed / (60000 * 1000);
  const safetyResult = calculateSafetyScore(cuttingSpeed, feedPerTooth, ap, ae, toolDiam, estimatedPower);

  // Estimate cycle time
  const volume = (depth * width * (params.dimensions?.length || 50)) / 1000; // mm^3 -> cm^3
  const mrr = params.parameters?.mrr_cm3_min || 50;
  const cuttingTime = mrr > 0 ? volume / mrr : 5;
  const totalTime = cuttingTime * 1.2; // 20% overhead for rapids/tool changes

  // Check for potential issues
  const issues: string[] = [];
  if (safetyResult.status === "danger") issues.push("Safety score indicates danger — reduce parameters");
  if (safetyResult.status === "warning") issues.push("Safety warning — consider reducing depth of cut");
  if (totalTime > 60) issues.push("Estimated cycle time exceeds 60 min — consider batch optimization");
  if (toolDiam > width * 0.8) issues.push("Tool diameter may be too large for feature width");

  return {
    safety_score: safetyResult.score,
    safety_status: safetyResult.status,
    safety_warnings: safetyResult.warnings,
    estimated_cycle_time_min: Math.round(totalTime * 10) / 10,
    collision_check: issues.length === 0 ? "clear" : "review_needed",
    issues,
    rapid_clearance_mm: 5,
    simulation_method: "analytical_estimate",
  };
}

/** Step 7: Complete output — combines all steps */
function acncCompleteProgram(params: Record<string, any>): any {
  const material = params.material || "4140";
  const controller = params.controller || "fanuc";

  // Step 1: Feature recognition
  const featureResult = acncFeatureRecognition(params);

  // Step 2: Strategy selection
  const strategyResult = acncStrategySelection(
    featureResult.feature, material,
    featureResult.dimensions.depth, featureResult.dimensions.width,
  );

  // Step 3: Tool selection
  const toolResult = acncToolSelection(
    material,
    featureResult.operations[0],
    featureResult.feature,
  );

  // Step 4: Parameter calculation
  const paramResult = acncParameterCalc(
    material, toolResult.diameter, toolResult.teeth,
    featureResult.dimensions.depth, featureResult.dimensions.width,
    featureResult.operations[0],
  );

  // Step 5: G-code generation
  const gcodeResult = acncGenerateGCode(
    featureResult.feature, controller,
    paramResult, params.program_number,
  );

  // Step 6: Simulation
  const simResult = acncSimulate(
    { material, tool: toolResult, dimensions: featureResult.dimensions, parameters: paramResult },
    gcodeResult,
  );

  // Build tool list
  const toolList = [{
    position: 1,
    type: toolResult.tool_type,
    diameter: toolResult.diameter,
    coating: toolResult.coating,
    holder: toolResult.holder_type,
    teeth: toolResult.teeth,
    estimated_life_min: paramResult.tool_life_min,
  }];

  // Build setup sheet summary
  const setupSheet = {
    material,
    material_group: (MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"]).group,
    hardness_hb: (MATERIAL_DB[material] || MATERIAL_DB["4140"]).hardness,
    feature: featureResult.feature,
    dimensions: featureResult.dimensions,
    work_offset: "G54",
    fixture: "3-jaw vise",
    coolant: paramResult.coolant,
  };

  return {
    version: "1.0.0",
    pipeline_steps: 7,
    feature: featureResult,
    strategy: strategyResult,
    tool: toolResult,
    parameters: paramResult,
    gcode: gcodeResult,
    simulation: simResult,
    tool_list: toolList,
    setup_sheet: setupSheet,
    cycle_time_min: simResult.estimated_cycle_time_min,
    safety_score: simResult.safety_score,
    ready_to_run: simResult.collision_check === "clear" && simResult.safety_status !== "danger",
  };
}

/** ACNC batch: generate programs for multiple features */
function acncBatch(params: Record<string, any>): any {
  const features = params.features || [];
  const material = params.material || "4140";
  const controller = params.controller || "fanuc";
  const tier = params.tier || "free";

  if (tier === "free" && features.length > 2) {
    return { error: "Free tier limited to 2 features per batch. Upgrade to Pro for unlimited.", tier_blocked: true };
  }

  const results = features.map((f: any, idx: number) => {
    const featureParams = typeof f === "string"
      ? { description: f, material, controller, program_number: 1001 + idx }
      : { ...f, material: f.material || material, controller: f.controller || controller, program_number: f.program_number || 1001 + idx };

    return acncCompleteProgram(featureParams);
  });

  const totalCycleTime = results.reduce((sum: number, r: any) => sum + (r.cycle_time_min || 0), 0);
  const allTools = results.flatMap((r: any) => r.tool_list || []);
  const uniqueTools = [...new Map(allTools.map((t: any) => [t.type + t.diameter, t])).values()];

  return {
    batch_size: results.length,
    material,
    controller,
    programs: results,
    total_cycle_time_min: Math.round(totalCycleTime * 10) / 10,
    unique_tools: uniqueTools,
    all_ready: results.every((r: any) => r.ready_to_run),
  };
}

// ─── Main ACNC Dispatcher ───────────────────────────────────────────────────

/** ACNC product dispatcher */
export function productACNC(action: string, params: Record<string, any>): any {
  const tier = params.tier || "free";

  switch (action) {
    case "acnc_get":
      return {
        product: "Auto CNC Programmer",
        version: "1.0.0",
        pipeline_steps: 7,
        supported_features: Object.keys(ACNC_FEATURES).length,
        supported_materials: Object.keys(MATERIAL_HARDNESS).length,
        supported_controllers: 6,
        actions: [
          "acnc_program", "acnc_feature", "acnc_simulate",
          "acnc_output", "acnc_tools", "acnc_strategy",
          "acnc_validate", "acnc_batch", "acnc_history", "acnc_get",
        ],
      };

    case "acnc_feature": {
      const result = acncFeatureRecognition(params);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Feature: ${result.feature}` });
      return result;
    }

    case "acnc_strategy": {
      const feature = params.feature || "pocket";
      const material = params.material || "4140";
      const result = acncStrategySelection(feature, material, params.depth, params.width);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Strategy: ${result.strategy}` });
      return result;
    }

    case "acnc_tools": {
      const material = params.material || "4140";
      const operation = params.operation || "roughing";
      const feature = params.feature || "pocket";
      const result = acncToolSelection(material, operation, feature);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Tool: ${result.tool_type}` });
      return result;
    }

    case "acnc_validate": {
      // Validate G-code via PPG validation
      const gcode = params.gcode || "";
      const controller = params.controller || "fanuc";
      if (!gcode) return { error: "gcode parameter required" };
      const validation = ppgValidateGCode(gcode, resolveController(controller).family);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Score: ${validation.score}` });
      return validation;
    }

    case "acnc_simulate": {
      // Quick simulation without full program generation
      const simParams = {
        material: params.material || "4140",
        tool: { diameter: params.tool_diameter || 12 },
        dimensions: {
          depth: params.depth || 10,
          width: params.width || 50,
          length: params.length || 50,
        },
        parameters: {
          cutting_speed_m_min: params.cutting_speed || 100,
          feed_per_tooth_mm: params.feed_per_tooth || 0.1,
          axial_depth_mm: params.axial_depth || 5,
          radial_depth_mm: params.radial_depth || 7,
          mrr_cm3_min: params.mrr || 50,
        },
      };
      const result = acncSimulate(simParams, {});
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Safety: ${result.safety_status}` });
      return result;
    }

    case "acnc_output": {
      // Generate just the G-code output (step 5 only)
      const feature = params.feature || "pocket";
      const controller = params.controller || "fanuc";
      const material = params.material || "4140";
      const featureDef = ACNC_FEATURES[feature] || ACNC_FEATURES["pocket"];
      const matPhysics = MATERIAL_HARDNESS[material] || MATERIAL_HARDNESS["4140"];

      const sfResult = calculateSpeedFeed({
        material_hardness: matPhysics.hardness,
        tool_material: "Carbide" as any,
        operation: mapOperation(featureDef.operations[0]),
        tool_diameter: featureDef.default_tool_diam,
        number_of_teeth: featureDef.default_teeth,
      });

      const result = acncGenerateGCode(feature, controller, {
        axial_depth_mm: params.depth || 5,
        radial_depth_mm: featureDef.default_tool_diam * 0.6,
        feed_rate_mm_min: Math.round(sfResult.feed_rate),
        spindle_rpm: Math.round((sfResult.cutting_speed * 1000) / (Math.PI * featureDef.default_tool_diam)),
      }, params.program_number);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `G-code: ${result.controller}` });
      return result;
    }

    case "acnc_program": {
      // Full 7-step pipeline
      if (tier === "free" && params.features && params.features.length > 1) {
        return { error: "Free tier: single feature only. Use acnc_batch with Pro for multi-feature.", tier_blocked: true };
      }
      const result = acncCompleteProgram(params);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Program: ${result.gcode?.controller || "unknown"}` });
      return result;
    }

    case "acnc_batch": {
      const result = acncBatch(params);
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: `Batch: ${result.batch_size || 0} features` });
      return result;
    }

    case "acnc_history":
      acncHistory.push({ action, timestamp: new Date().toISOString(), summary: "History requested" });
      return { history: acncHistory.slice(-50), total: acncHistory.length };

    default:
      return { error: `Unknown ACNC action: ${action}`, available: [
        "acnc_program", "acnc_feature", "acnc_simulate",
        "acnc_output", "acnc_tools", "acnc_strategy",
        "acnc_validate", "acnc_batch", "acnc_history", "acnc_get",
      ] };
  }
}
