/**
 * GenerativeProcessEngine.ts — R10-Rev3
 * ======================================
 * Generates complete process plans from feature descriptions.
 * Feature recognition, setup planning, operation sequencing,
 * parameter optimization, and cost estimation.
 *
 * Key capabilities:
 *   - Feature classification (pocket, hole, slot, contour, face, thread, chamfer)
 *   - Setup minimization by access direction grouping
 *   - Operation sequencing (rough → semi-finish → finish)
 *   - Tool selection with change minimization
 *   - Parameter optimization via existing PRISM calc patterns
 *   - Cycle time and cost estimation
 *   - Risk assessment per operation
 *
 * 10 dispatcher actions:
 *   genplan_plan, genplan_features, genplan_setups, genplan_operations,
 *   genplan_optimize, genplan_tools, genplan_cycle, genplan_cost,
 *   genplan_risk, genplan_get
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type FeatureType =
  | "pocket" | "hole" | "slot" | "contour" | "face"
  | "thread" | "chamfer" | "fillet" | "boss" | "bore";

export type AccessDirection = "top" | "bottom" | "left" | "right" | "front" | "back";

export type OperationPhase = "roughing" | "semi_finishing" | "finishing";

export type ToolType =
  | "endmill" | "face_mill" | "drill" | "tap" | "reamer"
  | "boring_bar" | "chamfer_mill" | "ball_endmill" | "thread_mill"
  | "center_drill" | "spot_drill";

export interface FeatureInput {
  id?: string;
  type: FeatureType;
  dimensions: { length_mm?: number; width_mm?: number; depth_mm?: number; diameter_mm?: number };
  tolerance_mm?: number;
  surface_finish_um?: number;
  access_direction?: AccessDirection;
  thread_spec?: string;      // e.g. "M8x1.25"
  through?: boolean;
  count?: number;            // for hole patterns
}

export interface RecognizedFeature {
  feature_id: string;
  type: FeatureType;
  subtype: string;
  dimensions: Record<string, number>;
  tolerance_mm: number;
  surface_finish_um: number;
  access_direction: AccessDirection;
  complexity: "simple" | "moderate" | "complex";
  requires_special_tooling: boolean;
  special_tooling_note?: string;
  operations_needed: string[];
}

export interface Setup {
  setup_number: number;
  access_direction: AccessDirection;
  features: string[];      // feature_ids
  fixture_type: string;
  wcs: string;             // e.g. "G54", "G55"
  estimated_time_min: number;
}

export interface PlannedOperation {
  operation_id: string;
  setup_number: number;
  sequence: number;
  feature_id: string;
  phase: OperationPhase;
  description: string;
  tool: ToolSelection;
  parameters: CuttingParams;
  estimated_time_min: number;
  risk_level: "low" | "medium" | "high";
  risk_notes: string[];
}

export interface ToolSelection {
  tool_number: number;
  tool_type: ToolType;
  diameter_mm: number;
  description: string;
  holder: string;
  stickout_mm: number;
  flutes: number;
  coating: string;
}

export interface CuttingParams {
  vc_m_min: number;
  rpm: number;
  fz_mm: number;
  feed_mm_min: number;
  ap_mm: number;
  ae_mm: number;
  strategy: string;
}

export interface ProcessPlan {
  plan_id: string;
  material: string;
  part_name: string;
  batch_size: number;
  features: RecognizedFeature[];
  setups: Setup[];
  operations: PlannedOperation[];
  tool_list: ToolSelection[];
  total_cycle_time_min: number;
  total_cost_usd: number;
  cost_breakdown: CostBreakdown;
  risk_summary: RiskSummary;
  created_at: string;
}

export interface CostBreakdown {
  machine_time_cost_usd: number;
  tool_cost_usd: number;
  fixture_cost_usd: number;
  material_cost_usd: number;
  setup_cost_usd: number;
  total_per_part_usd: number;
  total_batch_usd: number;
}

export interface RiskSummary {
  overall_risk: "low" | "medium" | "high";
  high_risk_operations: number;
  medium_risk_operations: number;
  warnings: string[];
}

// ─── Material Cutting Data ──────────────────────────────────────────────────

interface MaterialCuttingData {
  name: string;
  hardness_hrc?: number;
  density_g_cm3: number;
  cost_per_kg_usd: number;
  vc_endmill_m_min: number;
  vc_drill_m_min: number;
  vc_face_m_min: number;
  fz_endmill_mm: number;
  fz_drill_mm: number;
  machinability_factor: number;  // 1.0 = baseline (4140 steel)
}

const MATERIAL_DATA: Record<string, MaterialCuttingData> = {
  "7075": {
    name: "Aluminum 7075-T6", density_g_cm3: 2.81, cost_per_kg_usd: 8.5,
    vc_endmill_m_min: 300, vc_drill_m_min: 120, vc_face_m_min: 400,
    fz_endmill_mm: 0.15, fz_drill_mm: 0.12, machinability_factor: 2.5,
  },
  "6061": {
    name: "Aluminum 6061-T6", density_g_cm3: 2.70, cost_per_kg_usd: 6.0,
    vc_endmill_m_min: 350, vc_drill_m_min: 140, vc_face_m_min: 450,
    fz_endmill_mm: 0.18, fz_drill_mm: 0.14, machinability_factor: 3.0,
  },
  "4140": {
    name: "AISI 4140 Steel", density_g_cm3: 7.85, cost_per_kg_usd: 2.5,
    vc_endmill_m_min: 180, vc_drill_m_min: 80, vc_face_m_min: 220,
    fz_endmill_mm: 0.12, fz_drill_mm: 0.10, machinability_factor: 1.0,
  },
  "304": {
    name: "304 Stainless Steel", density_g_cm3: 8.0, cost_per_kg_usd: 5.0,
    vc_endmill_m_min: 120, vc_drill_m_min: 50, vc_face_m_min: 150,
    fz_endmill_mm: 0.08, fz_drill_mm: 0.06, machinability_factor: 0.6,
  },
  "ti64": {
    name: "Ti-6Al-4V", density_g_cm3: 4.43, cost_per_kg_usd: 45.0,
    vc_endmill_m_min: 55, vc_drill_m_min: 25, vc_face_m_min: 70,
    fz_endmill_mm: 0.06, fz_drill_mm: 0.05, machinability_factor: 0.35,
  },
  "cast_iron": {
    name: "Gray Cast Iron FC250", density_g_cm3: 7.2, cost_per_kg_usd: 1.8,
    vc_endmill_m_min: 160, vc_drill_m_min: 90, vc_face_m_min: 200,
    fz_endmill_mm: 0.15, fz_drill_mm: 0.12, machinability_factor: 1.2,
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const SHOP_RATE = 185;          // $/hr
const SETUP_TIME_MIN = 20;      // Average setup time
const TOOL_CHANGE_SEC = 8;      // ATC tool change
const WCS_LIST = ["G54", "G55", "G56", "G57", "G58", "G59"];

// ─── Plan Storage ───────────────────────────────────────────────────────────

const planHistory: ProcessPlan[] = [];

// ─── Helper Functions ───────────────────────────────────────────────────────

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

function findMaterial(name: string): MaterialCuttingData | undefined {
  const key = name.toLowerCase();
  if (key.includes("7075") || key === "aluminum" || key === "aluminium") return MATERIAL_DATA["7075"];
  if (key.includes("6061")) return MATERIAL_DATA["6061"];
  if (key.includes("4140") || key === "steel") return MATERIAL_DATA["4140"];
  if (key.includes("304") || key.includes("stainless")) return MATERIAL_DATA["304"];
  if (key.includes("ti") || key.includes("titanium")) return MATERIAL_DATA["ti64"];
  if (key.includes("cast") || key.includes("iron")) return MATERIAL_DATA["cast_iron"];
  return undefined;
}

// ─── Feature Recognition ────────────────────────────────────────────────────

function recognizeFeature(input: FeatureInput, index: number): RecognizedFeature {
  const fid = input.id ?? `F${String(index + 1).padStart(2, "0")}`;
  const dims = input.dimensions;
  const tol = input.tolerance_mm ?? 0.05;
  const finish = input.surface_finish_um ?? 6.3;
  const dir = input.access_direction ?? "top";
  const count = input.count ?? 1;

  let subtype = "";
  let complexity: RecognizedFeature["complexity"] = "simple";
  let specialTooling = false;
  let specialNote: string | undefined;
  const opsNeeded: string[] = [];

  switch (input.type) {
    case "pocket": {
      const depth = dims.depth_mm ?? 10;
      const width = dims.width_mm ?? 50;
      const aspect = depth / Math.max(width, 1);
      subtype = input.through ? "through_pocket" : aspect > 3 ? "deep_pocket" : aspect > 1 ? "medium_pocket" : "open_pocket";
      complexity = aspect > 3 ? "complex" : aspect > 1 ? "moderate" : "simple";
      opsNeeded.push("roughing", "semi_finishing");
      if (finish <= 3.2 || tol <= 0.02) opsNeeded.push("finishing");
      if (aspect > 4) { specialTooling = true; specialNote = `Deep pocket (${round1(aspect)}:1 aspect ratio) requires extended-reach endmill or long-series tooling`; }
      break;
    }
    case "hole": {
      const d = dims.diameter_mm ?? 10;
      subtype = input.through ? "through_hole" : "blind_hole";
      if (tol <= 0.01) { subtype = "precision_hole"; complexity = "moderate"; }
      opsNeeded.push("center_drill", "drill");
      if (tol <= 0.025) opsNeeded.push("ream");
      if (count > 1) subtype += `_pattern_x${count}`;
      break;
    }
    case "bore": {
      subtype = tol <= 0.025 ? "precision_bore" : "standard_bore";
      complexity = tol <= 0.01 ? "complex" : "moderate";
      opsNeeded.push("rough_bore", "finish_bore");
      specialTooling = true;
      specialNote = `Bore Ø${dims.diameter_mm}mm at ±${tol}mm requires boring bar with fine adjustment`;
      break;
    }
    case "slot": {
      subtype = input.through ? "through_slot" : "closed_slot";
      const depth = dims.depth_mm ?? 10;
      const width = dims.width_mm ?? 10;
      if (depth / width > 2) { complexity = "moderate"; subtype = "deep_slot"; }
      opsNeeded.push("roughing", "finishing");
      break;
    }
    case "thread": {
      const spec = input.thread_spec ?? "M10x1.5";
      subtype = `tapped_${spec}`;
      complexity = "moderate";
      opsNeeded.push("center_drill", "tap_drill", "tap");
      break;
    }
    case "contour": {
      subtype = finish <= 1.6 ? "precision_contour" : "standard_contour";
      complexity = finish <= 1.6 ? "complex" : "moderate";
      opsNeeded.push("roughing", "finishing");
      if (finish <= 0.8) opsNeeded.push("super_finishing");
      break;
    }
    case "face": {
      subtype = finish <= 1.6 ? "precision_face" : "standard_face";
      complexity = finish <= 1.6 ? "moderate" : "simple";
      opsNeeded.push("face_mill");
      if (finish <= 1.6) opsNeeded.push("finish_face");
      break;
    }
    case "chamfer": {
      subtype = "edge_chamfer";
      opsNeeded.push("chamfer");
      break;
    }
    case "fillet": {
      subtype = "internal_fillet";
      complexity = "moderate";
      opsNeeded.push("ball_endmill_finish");
      break;
    }
    case "boss": {
      subtype = "raised_boss";
      complexity = "moderate";
      opsNeeded.push("roughing", "finishing");
      break;
    }
  }

  return {
    feature_id: fid,
    type: input.type,
    subtype,
    dimensions: { ...dims } as Record<string, number>,
    tolerance_mm: tol,
    surface_finish_um: finish,
    access_direction: dir,
    complexity,
    requires_special_tooling: specialTooling,
    special_tooling_note: specialNote,
    operations_needed: opsNeeded,
  };
}

// ─── Setup Planning ─────────────────────────────────────────────────────────

function planSetups(features: RecognizedFeature[]): Setup[] {
  // Group features by access direction
  const dirGroups = new Map<AccessDirection, string[]>();
  for (const f of features) {
    const list = dirGroups.get(f.access_direction) ?? [];
    list.push(f.feature_id);
    dirGroups.set(f.access_direction, list);
  }

  const setups: Setup[] = [];
  let setupNum = 1;
  for (const [dir, featureIds] of dirGroups) {
    const fixture = dir === "top" || dir === "bottom" ? "6\" Kurt vise" :
      dir === "left" || dir === "right" ? "Angle plate + vise" :
      "Custom fixture plate";

    // Estimate time for this setup's features
    const featureCount = featureIds.length;
    const complexFeatures = features.filter(f => featureIds.includes(f.feature_id) && f.complexity === "complex").length;
    const estimatedTime = featureCount * 5 + complexFeatures * 8; // rough estimate

    setups.push({
      setup_number: setupNum,
      access_direction: dir,
      features: featureIds,
      fixture_type: fixture,
      wcs: WCS_LIST[Math.min(setupNum - 1, 5)],
      estimated_time_min: round1(estimatedTime),
    });
    setupNum++;
  }

  return setups;
}

// ─── Tool Selection ─────────────────────────────────────────────────────────

function selectTool(
  feature: RecognizedFeature,
  phase: OperationPhase,
  opType: string,
): ToolSelection {
  const d = feature.dimensions;
  let toolDia = 12; // default
  let toolType: ToolType = "endmill";
  let desc = "";
  let holder = "ER32 collet";
  let stickout = 60;
  let flutes = 4;
  let coating = "AlTiN";

  if (opType.includes("center_drill") || opType.includes("spot_drill")) {
    toolType = "center_drill";
    toolDia = 3;
    desc = "90° center drill Ø3mm";
    flutes = 2;
    stickout = 40;
  } else if (opType.includes("drill") || opType === "tap_drill") {
    toolType = "drill";
    toolDia = d.diameter_mm ? d.diameter_mm * (opType === "tap_drill" ? 0.83 : 1) : 10;
    toolDia = round1(toolDia);
    desc = `Carbide drill Ø${toolDia}mm`;
    flutes = 2;
    coating = "TiAlN";
    stickout = Math.max(toolDia * 5, 50);
  } else if (opType.includes("tap")) {
    toolType = "tap";
    const spec = feature.subtype.replace("tapped_", "");
    toolDia = d.diameter_mm ?? 10;
    desc = `Spiral flute tap ${spec}`;
    flutes = 3;
    holder = "Tension/compression tap holder";
    stickout = 50;
    coating = "TiN";
  } else if (opType.includes("ream")) {
    toolType = "reamer";
    toolDia = d.diameter_mm ?? 10;
    desc = `Carbide reamer Ø${toolDia}mm H7`;
    flutes = 6;
    coating = "TiN";
    stickout = Math.max(toolDia * 4, 50);
  } else if (opType.includes("bore")) {
    toolType = "boring_bar";
    toolDia = d.diameter_mm ? d.diameter_mm * 0.7 : 20;
    toolDia = round1(toolDia);
    desc = phase === "finishing"
      ? `Fine boring bar for Ø${d.diameter_mm}mm`
      : `Rough boring bar for Ø${d.diameter_mm}mm`;
    flutes = 1;
    holder = "Boring head";
    stickout = Math.max((d.depth_mm ?? 30) + 20, 50);
    coating = "AlTiN";
  } else if (opType.includes("chamfer")) {
    toolType = "chamfer_mill";
    toolDia = 10;
    desc = "90° chamfer mill Ø10mm";
    flutes = 3;
    stickout = 45;
  } else if (opType.includes("ball") || opType.includes("fillet")) {
    toolType = "ball_endmill";
    const radius = d.width_mm ?? 3;
    toolDia = radius * 2;
    desc = `Ball endmill R${radius}mm`;
    flutes = 2;
    stickout = 50;
  } else if (opType.includes("face_mill") || opType.includes("finish_face")) {
    toolType = "face_mill";
    toolDia = 50;
    desc = "Indexable face mill Ø50mm";
    flutes = 5;
    holder = "BT40 face mill arbor";
    stickout = 55;
    coating = "CVD";
  } else {
    // Endmill for pocket/slot/contour/boss roughing/finishing
    const featureWidth = d.width_mm ?? d.diameter_mm ?? 50;
    if (phase === "roughing") {
      toolDia = Math.min(featureWidth * 0.6, 20);
      toolDia = Math.max(Math.round(toolDia), 6);
      desc = `Roughing endmill Ø${toolDia}mm`;
      flutes = feature.type === "pocket" && (d.depth_mm ?? 0) > 30 ? 3 : 4;
    } else if (phase === "semi_finishing") {
      toolDia = Math.min(featureWidth * 0.5, 16);
      toolDia = Math.max(Math.round(toolDia), 6);
      desc = `Finishing endmill Ø${toolDia}mm`;
      flutes = 4;
    } else {
      toolDia = Math.min(featureWidth * 0.4, 12);
      toolDia = Math.max(Math.round(toolDia), 4);
      desc = `Precision endmill Ø${toolDia}mm`;
      flutes = feature.surface_finish_um <= 1.6 ? 5 : 4;
    }
    stickout = Math.max((d.depth_mm ?? 10) + 15, 40);
  }

  return {
    tool_number: 0, // assigned during dedup
    tool_type: toolType,
    diameter_mm: round1(toolDia),
    description: desc,
    holder,
    stickout_mm: round1(stickout),
    flutes,
    coating,
  };
}

// ─── Operation Sequencing ───────────────────────────────────────────────────

function sequenceOperations(
  features: RecognizedFeature[],
  setups: Setup[],
  mat: MaterialCuttingData,
): PlannedOperation[] {
  const operations: PlannedOperation[] = [];
  const toolMap = new Map<string, ToolSelection>(); // tool dedup

  for (const setup of setups) {
    const setupFeatures = features.filter(f => setup.features.includes(f.feature_id));

    // Sort: faces first, then pockets (rough before finish), holes, threads, chamfers last
    const priority: Record<string, number> = {
      face: 0, face_mill: 0, finish_face: 1,
      roughing: 2, semi_finishing: 3,
      center_drill: 4, drill: 5, tap_drill: 5, ream: 6,
      rough_bore: 7, finish_bore: 8,
      finishing: 9, super_finishing: 10,
      ball_endmill_finish: 11,
      tap: 12, chamfer: 13,
    };

    const rawOps: Array<{ feature: RecognizedFeature; opType: string; phase: OperationPhase }> = [];

    for (const feat of setupFeatures) {
      for (const opType of feat.operations_needed) {
        const phase: OperationPhase =
          opType.includes("rough") || opType === "center_drill" || opType === "drill" || opType === "tap_drill" || opType === "face_mill"
            ? "roughing"
            : opType.includes("finish") || opType === "ream" || opType === "tap" || opType === "chamfer" || opType.includes("ball")
              ? "finishing"
              : "semi_finishing";
        rawOps.push({ feature: feat, opType, phase });
      }
    }

    // Sort by priority
    rawOps.sort((a, b) => (priority[a.opType] ?? 50) - (priority[b.opType] ?? 50));

    let seq = 1;
    for (const { feature, opType, phase } of rawOps) {
      const tool = selectTool(feature, phase, opType);
      // Dedup tools by description
      const toolKey = tool.description;
      if (!toolMap.has(toolKey)) {
        tool.tool_number = toolMap.size + 1;
        toolMap.set(toolKey, tool);
      }
      const assignedTool = toolMap.get(toolKey)!;

      const params = calculateParams(feature, phase, opType, assignedTool, mat);
      const time = estimateOperationTime(feature, phase, opType, params, mat);
      const { risk, notes } = assessOperationRisk(feature, phase, opType, params);

      const opId = `OP${String(setup.setup_number).padStart(1, "0")}-${String(seq).padStart(2, "0")}`;
      operations.push({
        operation_id: opId,
        setup_number: setup.setup_number,
        sequence: seq,
        feature_id: feature.feature_id,
        phase,
        description: `${phase.replace("_", " ")} — ${feature.type} ${feature.feature_id} — ${opType}`,
        tool: { ...assignedTool },
        parameters: params,
        estimated_time_min: round1(time),
        risk_level: risk,
        risk_notes: notes,
      });
      seq++;
    }
  }

  return operations;
}

// ─── Parameter Calculation ──────────────────────────────────────────────────

function calculateParams(
  feature: RecognizedFeature,
  phase: OperationPhase,
  opType: string,
  tool: ToolSelection,
  mat: MaterialCuttingData,
): CuttingParams {
  const d = tool.diameter_mm;
  const flutes = tool.flutes;

  let vc: number;
  let fz: number;
  let ap: number;
  let ae: number;
  let strategy: string;

  if (tool.tool_type === "drill" || tool.tool_type === "center_drill" || tool.tool_type === "spot_drill") {
    vc = mat.vc_drill_m_min;
    fz = mat.fz_drill_mm;
    ap = 0; // N/A for drilling
    ae = d; // full diameter
    strategy = "peck_drill";
  } else if (tool.tool_type === "tap") {
    vc = mat.vc_drill_m_min * 0.3;
    fz = 0; // pitch-driven
    ap = 0;
    ae = d;
    strategy = "rigid_tap";
  } else if (tool.tool_type === "reamer") {
    vc = mat.vc_drill_m_min * 0.5;
    fz = 0.05;
    ap = 0;
    ae = 0.1; // minimal stock
    strategy = "ream";
  } else if (tool.tool_type === "boring_bar") {
    vc = mat.vc_endmill_m_min * 0.8;
    fz = phase === "finishing" ? 0.04 : 0.08;
    ap = phase === "finishing" ? 0.1 : 1.0;
    ae = ap; // radial depth for boring
    strategy = phase === "finishing" ? "fine_bore" : "rough_bore";
  } else if (tool.tool_type === "face_mill") {
    vc = mat.vc_face_m_min;
    fz = mat.fz_endmill_mm * 0.8;
    ap = phase === "finishing" ? 0.3 : 2.0;
    ae = d * 0.65;
    strategy = "face_milling";
  } else if (tool.tool_type === "chamfer_mill") {
    vc = mat.vc_endmill_m_min * 0.7;
    fz = 0.05;
    ap = 1.0;
    ae = 1.0;
    strategy = "chamfer";
  } else if (tool.tool_type === "ball_endmill") {
    vc = mat.vc_endmill_m_min * 0.8;
    fz = mat.fz_endmill_mm * 0.6;
    ap = d * 0.05;
    ae = d * 0.1;
    strategy = "scallop_finishing";
  } else {
    // Endmill
    const phaseFactor = phase === "roughing" ? 1.0 : phase === "semi_finishing" ? 0.85 : 0.7;
    vc = mat.vc_endmill_m_min * phaseFactor;
    fz = mat.fz_endmill_mm * phaseFactor;

    if (phase === "roughing") {
      ap = Math.min(d * 1.0, feature.dimensions.depth_mm ?? 10);
      ae = d * 0.5;
      strategy = feature.type === "pocket" ? "adaptive_clearing" : "conventional_roughing";
    } else if (phase === "semi_finishing") {
      ap = Math.min(d * 0.5, feature.dimensions.depth_mm ?? 10);
      ae = d * 0.3;
      strategy = "contour_parallel";
    } else {
      ap = Math.min(feature.dimensions.depth_mm ?? 10, d * 2);
      ae = 0.2; // spring pass
      strategy = feature.surface_finish_um <= 1.6 ? "high_speed_finishing" : "contour_finish";
    }
  }

  const rpm = round1((vc * 1000) / (Math.PI * d));
  const feed = round1(fz * flutes * rpm);

  return {
    vc_m_min: round1(vc),
    rpm,
    fz_mm: round2(fz),
    feed_mm_min: feed,
    ap_mm: round2(ap),
    ae_mm: round2(ae),
    strategy,
  };
}

// ─── Time Estimation ────────────────────────────────────────────────────────

function estimateOperationTime(
  feature: RecognizedFeature,
  phase: OperationPhase,
  opType: string,
  params: CuttingParams,
  mat: MaterialCuttingData,
): number {
  const d = feature.dimensions;
  const feed = Math.max(params.feed_mm_min, 10);
  const count = feature.type === "hole" || feature.type === "thread"
    ? parseInt(feature.subtype.match(/x(\d+)/)?.[1] ?? "1")
    : 1;

  if (opType === "center_drill" || opType === "spot_drill") {
    return 0.2 * count;
  }
  if (opType === "drill" || opType === "tap_drill") {
    const depth = d.depth_mm ?? 20;
    return round1((depth / feed + 0.1) * count);
  }
  if (opType === "tap") {
    return 0.3 * count;
  }
  if (opType === "ream") {
    const depth = d.depth_mm ?? 20;
    return round1((depth / feed + 0.15) * count);
  }
  if (opType.includes("bore")) {
    const depth = d.depth_mm ?? 30;
    const passes = phase === "finishing" ? 2 : Math.ceil(3 / Math.max(params.ap_mm, 0.1));
    return round1(depth / feed * passes + 0.3);
  }
  if (opType === "chamfer") {
    return 0.5;
  }
  if (opType.includes("ball")) {
    const area = (d.length_mm ?? 20) * (d.width_mm ?? 20);
    return round1(area / (feed * Math.max(params.ae_mm, 0.1)) / 1000 + 0.5);
  }
  if (opType.includes("face")) {
    const area = (d.length_mm ?? 100) * (d.width_mm ?? 80);
    const passes = Math.ceil(area / (50 * 0.65 * 50));
    return round1(passes * 0.5 + 0.2);
  }

  // Pocket/slot/contour/boss milling
  const volume = (d.length_mm ?? 50) * (d.width_mm ?? 30) * (d.depth_mm ?? 10) / 1000; // cm³
  const mrr = (params.ap_mm * params.ae_mm * feed) / 1000; // cm³/min
  if (mrr < 0.01) return 2.0; // minimum time
  const cuttingTime = volume / mrr;

  // Phase adjustments
  if (phase === "roughing") return round1(cuttingTime * 1.2); // 20% overhead for rapids
  if (phase === "semi_finishing") return round1(cuttingTime * 0.5); // Less material
  return round1(cuttingTime * 0.3 + 0.5); // Finishing: light stock + spring passes
}

// ─── Risk Assessment ────────────────────────────────────────────────────────

function assessOperationRisk(
  feature: RecognizedFeature,
  phase: OperationPhase,
  opType: string,
  params: CuttingParams,
): { risk: "low" | "medium" | "high"; notes: string[] } {
  const notes: string[] = [];
  let riskScore = 0;

  // Tight tolerances
  if (feature.tolerance_mm <= 0.01) {
    riskScore += 2;
    notes.push(`Tight tolerance (±${feature.tolerance_mm}mm) requires thermal stability and tool measurement`);
  } else if (feature.tolerance_mm <= 0.025) {
    riskScore += 1;
    notes.push(`Moderate tolerance (±${feature.tolerance_mm}mm) — verify tool runout`);
  }

  // Deep features
  const depth = feature.dimensions.depth_mm ?? 0;
  const width = feature.dimensions.width_mm ?? feature.dimensions.diameter_mm ?? 50;
  if (depth / width > 4) {
    riskScore += 2;
    notes.push(`High aspect ratio (${round1(depth / width)}:1) — risk of chatter and deflection`);
  } else if (depth / width > 2) {
    riskScore += 1;
    notes.push(`Moderate depth ratio — monitor for chatter`);
  }

  // Fine surface finish
  if (feature.surface_finish_um <= 0.8) {
    riskScore += 2;
    notes.push(`Very fine finish requirement (Ra ${feature.surface_finish_um}μm) — requires polished tools and stable setup`);
  } else if (feature.surface_finish_um <= 1.6) {
    riskScore += 1;
  }

  // Special tooling
  if (feature.requires_special_tooling) {
    riskScore += 1;
    if (feature.special_tooling_note) notes.push(feature.special_tooling_note);
  }

  const risk = riskScore >= 3 ? "high" : riskScore >= 1 ? "medium" : "low";
  if (notes.length === 0) notes.push("Standard operation — no special concerns");

  return { risk, notes };
}

// ─── Cost Estimation ────────────────────────────────────────────────────────

function estimateCost(
  operations: PlannedOperation[],
  setups: Setup[],
  mat: MaterialCuttingData,
  batchSize: number,
  partVolume_cm3: number,
): CostBreakdown {
  const totalCycleTime = operations.reduce((sum, op) => sum + op.estimated_time_min, 0);
  const toolChanges = operations.length;
  const toolChangeTime = (toolChanges * TOOL_CHANGE_SEC) / 60;
  const totalMachineTime = totalCycleTime + toolChangeTime;

  const machineTimeCost = round2((totalMachineTime / 60) * SHOP_RATE);
  const toolCost = round2(operations.length * 0.5); // ~$0.50 tool cost per operation (amortized)
  const fixtureCost = round2(setups.length * 50 / Math.max(batchSize, 1)); // Fixture amortized
  const materialCost = round2(partVolume_cm3 * mat.density_g_cm3 / 1000 * mat.cost_per_kg_usd * 1.15); // 15% chip waste
  const setupCost = round2((setups.length * SETUP_TIME_MIN / 60 * SHOP_RATE) / Math.max(batchSize, 1));
  const totalPerPart = round2(machineTimeCost + toolCost + fixtureCost + materialCost + setupCost);

  return {
    machine_time_cost_usd: machineTimeCost,
    tool_cost_usd: toolCost,
    fixture_cost_usd: fixtureCost,
    material_cost_usd: materialCost,
    setup_cost_usd: setupCost,
    total_per_part_usd: totalPerPart,
    total_batch_usd: round2(totalPerPart * batchSize),
  };
}

// ─── Risk Summary ───────────────────────────────────────────────────────────

function buildRiskSummary(operations: PlannedOperation[]): RiskSummary {
  const high = operations.filter(o => o.risk_level === "high").length;
  const medium = operations.filter(o => o.risk_level === "medium").length;
  const warnings: string[] = [];

  if (high > 0) warnings.push(`${high} high-risk operation(s) require careful verification`);
  if (medium > 2) warnings.push(`Multiple medium-risk operations — consider dry run first`);

  const specialOps = operations.filter(o => o.risk_notes.some(n => !n.includes("Standard operation")));
  for (const op of specialOps.slice(0, 3)) {
    warnings.push(`${op.operation_id}: ${op.risk_notes[0]}`);
  }

  return {
    overall_risk: high > 0 ? "high" : medium > 0 ? "medium" : "low",
    high_risk_operations: high,
    medium_risk_operations: medium,
    warnings,
  };
}

// ─── Tool List Dedup ────────────────────────────────────────────────────────

function buildToolList(operations: PlannedOperation[]): ToolSelection[] {
  const seen = new Map<number, ToolSelection>();
  for (const op of operations) {
    if (!seen.has(op.tool.tool_number)) {
      seen.set(op.tool.tool_number, { ...op.tool });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.tool_number - b.tool_number);
}

// ─── Main Plan Generation ───────────────────────────────────────────────────

function generatePlan(
  material: string,
  featureInputs: FeatureInput[],
  partName?: string,
  batchSize?: number,
): ProcessPlan {
  const mat = findMaterial(material);
  if (!mat) {
    return {
      plan_id: `PP-${Date.now()}`,
      material,
      part_name: partName ?? "Unknown",
      batch_size: batchSize ?? 1,
      features: [],
      setups: [],
      operations: [],
      tool_list: [],
      total_cycle_time_min: 0,
      total_cost_usd: 0,
      cost_breakdown: {
        machine_time_cost_usd: 0, tool_cost_usd: 0, fixture_cost_usd: 0,
        material_cost_usd: 0, setup_cost_usd: 0, total_per_part_usd: 0, total_batch_usd: 0,
      },
      risk_summary: { overall_risk: "high", high_risk_operations: 0, medium_risk_operations: 0, warnings: [`Unknown material: ${material}`] },
      created_at: new Date().toISOString(),
    };
  }

  const batch = batchSize ?? 1;
  const features = featureInputs.map((f, i) => recognizeFeature(f, i));
  const setups = planSetups(features);
  const operations = sequenceOperations(features, setups, mat);
  const toolList = buildToolList(operations);

  const totalCycleTime = round1(
    operations.reduce((s, o) => s + o.estimated_time_min, 0) +
    (operations.length * TOOL_CHANGE_SEC) / 60
  );

  // Estimate part volume from features
  const partVolume_cm3 = features.reduce((sum, f) => {
    const d = f.dimensions;
    return sum + ((d.length_mm ?? 50) * (d.width_mm ?? 30) * (d.depth_mm ?? 10)) / 1000;
  }, 0) * 1.5; // 1.5x for bounding box

  const costBreakdown = estimateCost(operations, setups, mat, batch, partVolume_cm3);
  const riskSummary = buildRiskSummary(operations);

  // Update setup times from actual operations
  for (const setup of setups) {
    const setupOps = operations.filter(o => o.setup_number === setup.setup_number);
    setup.estimated_time_min = round1(setupOps.reduce((s, o) => s + o.estimated_time_min, 0));
  }

  const plan: ProcessPlan = {
    plan_id: `PP-${Date.now()}`,
    material: mat.name,
    part_name: partName ?? "Part",
    batch_size: batch,
    features,
    setups,
    operations,
    tool_list: toolList,
    total_cycle_time_min: totalCycleTime,
    total_cost_usd: costBreakdown.total_per_part_usd,
    cost_breakdown: costBreakdown,
    risk_summary: riskSummary,
    created_at: new Date().toISOString(),
  };

  planHistory.push(plan);
  return plan;
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export function generativeProcess(
  action: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  switch (action) {
    case "genplan_plan": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      const partName = params.part_name as string | undefined;
      const batchSize = params.batch_size as number | undefined;
      if (features.length === 0) {
        return { error: "No features provided. Supply an array of feature descriptions." };
      }
      const plan = generatePlan(material, features, partName, batchSize);
      return {
        plan_id: plan.plan_id,
        material: plan.material,
        part_name: plan.part_name,
        batch_size: plan.batch_size,
        feature_count: plan.features.length,
        setup_count: plan.setups.length,
        operation_count: plan.operations.length,
        tool_count: plan.tool_list.length,
        total_cycle_time_min: plan.total_cycle_time_min,
        total_cost_usd: plan.total_cost_usd,
        cost_breakdown: plan.cost_breakdown,
        risk_summary: plan.risk_summary,
        setups: plan.setups,
        operations: plan.operations.map(o => ({
          operation_id: o.operation_id,
          setup: o.setup_number,
          seq: o.sequence,
          feature: o.feature_id,
          phase: o.phase,
          description: o.description,
          tool: `T${o.tool.tool_number} ${o.tool.description}`,
          vc: o.parameters.vc_m_min,
          rpm: o.parameters.rpm,
          feed: o.parameters.feed_mm_min,
          strategy: o.parameters.strategy,
          time_min: o.estimated_time_min,
          risk: o.risk_level,
        })),
        tool_list: plan.tool_list,
      };
    }

    case "genplan_features": {
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      return {
        feature_count: recognized.length,
        features: recognized,
        complexity_summary: {
          simple: recognized.filter(f => f.complexity === "simple").length,
          moderate: recognized.filter(f => f.complexity === "moderate").length,
          complex: recognized.filter(f => f.complexity === "complex").length,
        },
        special_tooling_required: recognized.filter(f => f.requires_special_tooling).map(f => ({
          feature: f.feature_id,
          note: f.special_tooling_note,
        })),
      };
    }

    case "genplan_setups": {
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      return {
        setup_count: setups.length,
        setups,
        feature_distribution: setups.map(s => ({
          setup: s.setup_number,
          direction: s.access_direction,
          feature_count: s.features.length,
          features: s.features,
        })),
      };
    }

    case "genplan_operations": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const mat = findMaterial(material);
      if (!mat) return { error: `Unknown material: ${material}` };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      const operations = sequenceOperations(recognized, setups, mat);
      return {
        operation_count: operations.length,
        operations: operations.map(o => ({
          id: o.operation_id,
          setup: o.setup_number,
          seq: o.sequence,
          feature: o.feature_id,
          phase: o.phase,
          description: o.description,
          tool: `T${o.tool.tool_number} ${o.tool.description}`,
          time_min: o.estimated_time_min,
        })),
      };
    }

    case "genplan_optimize": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const mat = findMaterial(material);
      if (!mat) return { error: `Unknown material: ${material}` };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      const operations = sequenceOperations(recognized, setups, mat);
      return {
        optimization_summary: {
          material: mat.name,
          machinability_factor: mat.machinability_factor,
          total_operations: operations.length,
          unique_tools: buildToolList(operations).length,
        },
        parameters: operations.map(o => ({
          operation_id: o.operation_id,
          feature: o.feature_id,
          phase: o.phase,
          vc_m_min: o.parameters.vc_m_min,
          rpm: o.parameters.rpm,
          fz_mm: o.parameters.fz_mm,
          feed_mm_min: o.parameters.feed_mm_min,
          ap_mm: o.parameters.ap_mm,
          ae_mm: o.parameters.ae_mm,
          strategy: o.parameters.strategy,
        })),
      };
    }

    case "genplan_tools": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const mat = findMaterial(material);
      if (!mat) return { error: `Unknown material: ${material}` };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      const operations = sequenceOperations(recognized, setups, mat);
      const tools = buildToolList(operations);
      return {
        tool_count: tools.length,
        tools,
        tool_change_count: operations.length,
        estimated_tool_change_time_min: round1((operations.length * TOOL_CHANGE_SEC) / 60),
      };
    }

    case "genplan_cycle": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const mat = findMaterial(material);
      if (!mat) return { error: `Unknown material: ${material}` };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      const operations = sequenceOperations(recognized, setups, mat);
      const toolChangeTime = round1((operations.length * TOOL_CHANGE_SEC) / 60);
      const cuttingTime = round1(operations.reduce((s, o) => s + o.estimated_time_min, 0));
      return {
        cutting_time_min: cuttingTime,
        tool_change_time_min: toolChangeTime,
        total_cycle_time_min: round1(cuttingTime + toolChangeTime),
        by_setup: setups.map(s => {
          const ops = operations.filter(o => o.setup_number === s.setup_number);
          return {
            setup: s.setup_number,
            direction: s.access_direction,
            operations: ops.length,
            time_min: round1(ops.reduce((sum, o) => sum + o.estimated_time_min, 0)),
          };
        }),
        by_phase: {
          roughing_min: round1(operations.filter(o => o.phase === "roughing").reduce((s, o) => s + o.estimated_time_min, 0)),
          semi_finishing_min: round1(operations.filter(o => o.phase === "semi_finishing").reduce((s, o) => s + o.estimated_time_min, 0)),
          finishing_min: round1(operations.filter(o => o.phase === "finishing").reduce((s, o) => s + o.estimated_time_min, 0)),
        },
      };
    }

    case "genplan_cost": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      const batchSize = (params.batch_size as number) ?? 1;
      if (features.length === 0) return { error: "No features provided" };
      const mat = findMaterial(material);
      if (!mat) return { error: `Unknown material: ${material}` };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      const operations = sequenceOperations(recognized, setups, mat);
      const partVolume = recognized.reduce((sum, f) => {
        const d = f.dimensions;
        return sum + ((d.length_mm ?? 50) * (d.width_mm ?? 30) * (d.depth_mm ?? 10)) / 1000;
      }, 0) * 1.5;
      const cost = estimateCost(operations, setups, mat, batchSize, partVolume);
      return {
        batch_size: batchSize,
        material: mat.name,
        shop_rate_usd_hr: SHOP_RATE,
        cost_breakdown: cost,
      };
    }

    case "genplan_risk": {
      const material = (params.material as string) ?? "steel";
      const features = (params.features as FeatureInput[]) ?? [];
      if (features.length === 0) return { error: "No features provided" };
      const mat = findMaterial(material);
      if (!mat) return { error: `Unknown material: ${material}` };
      const recognized = features.map((f, i) => recognizeFeature(f, i));
      const setups = planSetups(recognized);
      const operations = sequenceOperations(recognized, setups, mat);
      const summary = buildRiskSummary(operations);
      return {
        risk_summary: summary,
        high_risk_details: operations
          .filter(o => o.risk_level === "high")
          .map(o => ({ operation: o.operation_id, feature: o.feature_id, notes: o.risk_notes })),
        medium_risk_details: operations
          .filter(o => o.risk_level === "medium")
          .map(o => ({ operation: o.operation_id, feature: o.feature_id, notes: o.risk_notes })),
      };
    }

    case "genplan_get": {
      const planId = params.plan_id as string | undefined;
      if (!planId) return { error: "plan_id required" };
      const plan = planHistory.find(p => p.plan_id === planId);
      if (!plan) return { error: `Plan ${planId} not found`, available: planHistory.map(p => p.plan_id) };
      return plan as unknown as Record<string, unknown>;
    }

    default:
      return { error: `Unknown action: ${action}`, available_actions: [
        "genplan_plan", "genplan_features", "genplan_setups", "genplan_operations",
        "genplan_optimize", "genplan_tools", "genplan_cycle", "genplan_cost",
        "genplan_risk", "genplan_get",
      ]};
  }
}
