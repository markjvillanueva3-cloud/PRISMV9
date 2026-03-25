/**
 * AutoPrintToProgramBridgeEngine — Automated File-to-Program Pipeline
 *
 * THE MISSING LINK: Chains file parsers → feature extraction → program generation
 * into a single automated pipeline. Accepts raw text (from PDF OCR), STEP file
 * content, IGES file content, or DXF content and produces a complete CNC program.
 *
 * Pipeline:
 *   1. Detect input format (text/STEP/IGES/DXF)
 *   2. Parse → extract dimensions, features, material, tolerances
 *   3. Convert to MachinableFeature[] (the format PrintToProgramPipelineEngine needs)
 *   4. Auto-detect milling vs turning from feature types and geometry
 *   5. Route to appropriate pipeline (mill PTP or turning PTP)
 *   6. Return complete G-code program + setup sheet
 *
 * Wires together (all existing engines):
 *   - BlueprintOCREngine (606L) — text → dimensions/GD&T
 *   - PDFBlueprintDimensionExtractorEngine (439L) — text → dimensions
 *   - StepImportEngine — STEP → mesh/features
 *   - IGESImportEngine (543L) — IGES → geometry
 *   - DXFParserEngine — DXF → 2D boundaries
 *   - PrintToGeometryEngine (522L) — blueprint → CadQuery 3D
 *   - PrintToProgramPipelineEngine (~1200L) — milling programs
 *   - TurningPrintToProgramEngine (1004L) — turning programs
 *   - TurningProgramAssemblerEngine (2615L) — advanced turning
 *
 * @module engines/AutoPrintToProgramBridgeEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type InputFormat = "text" | "step" | "iges" | "dxf" | "auto";
export type ProcessType = "milling" | "turning" | "mill_turn" | "auto";

export interface AutoPTPInput {
  /** Raw content — text extracted from PDF, or file content as string */
  content: string;
  /** Input format hint — "auto" will detect from content */
  format?: InputFormat;
  /** Force process type — "auto" will detect from features */
  process_type?: ProcessType;
  /** Material override — if not detected from drawing */
  material_name?: string;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Machine specification */
  machine_brand?: string;
  machine_model?: string;
  controller?: "fanuc" | "haas" | "mazak" | "okuma" | "siemens";
  max_spindle_rpm?: number;
  max_power_kW?: number;
  /** Stock override */
  stock_diameter_mm?: number;
  stock_length_mm?: number;
  stock_x_mm?: number;
  stock_y_mm?: number;
  stock_z_mm?: number;
  /** Optimization */
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";
  /** Options */
  include_setup_sheet?: boolean;
  include_tool_list?: boolean;
  units?: "mm" | "inch";
}

export interface AutoPTPResult {
  success: boolean;
  detected_format: InputFormat;
  detected_process: ProcessType;
  part_number?: string;
  material?: string;
  features_detected: number;
  features_classified: Array<{ id: string; type: string; dimensions: Record<string, number>; position?: { x: number; y: number; z?: number } }>;
  program_text: string;
  program_line_count: number;
  cycle_time_sec: number;
  tool_list: Array<{ tool_number: number; description: string; diameter_mm?: number }>;
  setup_sheet?: Record<string, unknown>;
  pipeline_used: string;
  confidence_score: number;
  warnings: Array<{ stage: string; severity: string; message: string }>;
  stages_completed: string[];
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

function detectFormat(content: string): InputFormat {
  const trimmed = content.trim();
  // STEP file starts with ISO-10303-21 or FILE_DESCRIPTION
  if (trimmed.includes("ISO-10303-21") || trimmed.includes("FILE_DESCRIPTION")) return "step";
  // IGES starts with S section (80-char records with S in col 73)
  if (trimmed.length > 80 && (trimmed[72] === "S" || trimmed.includes("                                                                        S"))) return "iges";
  // DXF starts with 0 / SECTION
  if (trimmed.startsWith("0") && trimmed.includes("SECTION") && trimmed.includes("ENTITIES")) return "dxf";
  // Everything else is treated as blueprint text
  return "text";
}

function detectProcessType(features: Array<{ type: string }>): ProcessType {
  const turningTypes = new Set(["od_straight", "od_taper", "od_contour", "od_shoulder",
    "id_bore", "id_contour", "id_taper", "face", "groove_od", "groove_id", "thread_od",
    "thread_id", "part_off", "drill_center", "knurl", "od_profile"]);
  const millingTypes = new Set(["pocket", "slot", "boss", "contour", "face_mill",
    "drill_pattern", "tap_pattern", "surface_3d", "profile_2d"]);

  let turningCount = 0;
  let millingCount = 0;
  for (const f of features) {
    if (turningTypes.has(f.type)) turningCount++;
    else if (millingTypes.has(f.type)) millingCount++;
  }

  if (turningCount > 0 && millingCount > 0) return "mill_turn";
  if (turningCount > millingCount) return "turning";
  return "milling";
}

// ============================================================================
// ENGINE
// ============================================================================

export class AutoPrintToProgramBridgeEngine {
  readonly name = "AutoPrintToProgramBridgeEngine";
  readonly version = "1.0.0";

  calculate(action: string, params: Record<string, unknown>): Promise<AutoPTPResult> {
    switch (action) {
      case "auto_print_to_program":
        return this.runAutoPipeline(params as unknown as AutoPTPInput);
      case "auto_detect_format":
        return Promise.resolve(this.detectOnly(params));
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private detectOnly(params: Record<string, unknown>): AutoPTPResult {
    const content = (params.content as string) || "";
    const format = detectFormat(content);
    return {
      success: true, detected_format: format, detected_process: "auto",
      features_detected: 0, features_classified: [], program_text: "",
      program_line_count: 0, cycle_time_sec: 0, tool_list: [],
      pipeline_used: "detection_only", confidence_score: 0.9,
      warnings: [], stages_completed: ["format_detection"],
    };
  }

  /**
   * Main automated pipeline:
   * 1. Detect format → 2. Parse → 3. Extract features → 4. Classify →
   * 5. Route to mill/turn pipeline → 6. Generate program
   */
  async runAutoPipeline(input: AutoPTPInput): Promise<AutoPTPResult> {
    log.info(`[AutoPTPBridge] Starting automated pipeline`);
    const warnings: AutoPTPResult["warnings"] = [];
    const stages: string[] = [];

    // ── Stage 1: Format Detection ──
    const format = input.format === "auto" || !input.format
      ? detectFormat(input.content)
      : input.format;
    stages.push(`format_detection: ${format}`);
    log.info(`[AutoPTPBridge] Detected format: ${format}`);

    // ── Stage 2: Parse Content ──
    let dimensions: Array<{ type: string; nominal: number; tolerance_plus: number; tolerance_minus: number; unit: string }> = [];
    let features: Array<{ id: string; type: string; dimensions: Record<string, number>; position?: { x: number; y: number; z?: number } }> = [];
    let material: string | undefined = input.material_name;
    let partNumber: string | undefined;
    let partType: "prismatic" | "cylindrical" | "hybrid" = "prismatic";
    let overallDims = { x: 0, y: 0, z: 0 };

    if (format === "text") {
      // Use BlueprintOCREngine for text parsing
      try {
        const ocrMod = await import("./BlueprintOCREngine.js");
        const ocrResult = ocrMod.blueprintOCREngine.analyzeBlueprint(input.content, { unit: (input.units || "mm") as "mm" | "in" });
        if (ocrResult && typeof ocrResult === "object") {
          const ocr = ocrResult as any;
          dimensions = (ocr.dimensions || []).map((d: any) => ({
            type: d.type || "linear", nominal: d.value ?? d.nominal ?? 0,
            tolerance_plus: d.tolerance_plus ?? 0.1, tolerance_minus: d.tolerance_minus ?? 0.1,
            unit: d.unit || input.units || "mm",
          }));
          material = material || ocr.title_block?.material;
          partNumber = ocr.title_block?.part_number;
          features = this.dimensionsToFeatures(dimensions, ocr);
        }
        stages.push("text_parsing: BlueprintOCREngine");
      } catch (err) {
        warnings.push({ stage: "parsing", severity: "warning", message: `BlueprintOCREngine failed: ${err}` });
        // Fallback to PDFBlueprintDimensionExtractorEngine
        try {
          const { pdfBlueprintDimensionExtractorEngine } = await import("./PDFBlueprintDimensionExtractorEngine.js");
          const pdfResult = pdfBlueprintDimensionExtractorEngine.extractDimensions({
            text_content: input.content,
            drawing_units: input.units as "mm" | "inch",
          });
          dimensions = (pdfResult.dimensions || []) as any[];
          features = this.dimensionsToFeatures(dimensions, pdfResult as any);
          stages.push("text_parsing: PDFBlueprintDimensionExtractor (fallback)");
        } catch { stages.push("text_parsing: FAILED"); }
      }
    } else if (format === "step") {
      try {
        // StepImportEngine requires a file_path, not raw content.
        // If content looks like a file path, use it directly. Otherwise warn.
        const { stepImportEngine } = await import("./StepImportEngine.js");
        const isPath = input.content.endsWith(".step") || input.content.endsWith(".stp") || input.content.includes("\\") || input.content.includes("/");
        if (isPath) {
          const stepResult = await stepImportEngine.analyzeStep({ file_path: input.content });
          if (stepResult) {
            const step = stepResult as any;
            features = (step.manufacturing_features || []).map((f: any, i: number) => ({
              id: `F${i + 1}`, type: f.type || "pocket", dimensions: f.dimensions || {},
            }));
            overallDims = step.bounding_box || overallDims;
          }
          stages.push("step_parsing: StepImportEngine (file path)");
        } else {
          warnings.push({ stage: "parsing", severity: "info", message: "STEP content provided as string — StepImportEngine requires file_path. Pass file path instead." });
          stages.push("step_parsing: SKIPPED (need file path)");
        }
      } catch (err) {
        warnings.push({ stage: "parsing", severity: "critical", message: `STEP import failed: ${err}` });
        stages.push("step_parsing: FAILED");
      }
    } else if (format === "iges") {
      try {
        const { igesImportEngine } = await import("./IGESImportEngine.js");
        const igesResult = igesImportEngine.extractGeometry({ content: input.content });
        if (igesResult) {
          // Convert IGES geometry to features
          features = this.igesGeometryToFeatures(igesResult);
        }
        stages.push("iges_parsing: IGESImportEngine");
      } catch (err) {
        warnings.push({ stage: "parsing", severity: "critical", message: `IGES import failed: ${err}` });
        stages.push("iges_parsing: FAILED");
      }
    } else if (format === "dxf") {
      try {
        const { dxfParserEngine } = await import("./DXFParserEngine.js");
        const dxfResult = (dxfParserEngine as any).calculate?.("dxf_parse", { content: input.content }) ||
                          (dxfParserEngine as any).parse?.(input.content);
        if (dxfResult) {
          features = this.dxfToFeatures(dxfResult);
        }
        stages.push("dxf_parsing: DXFParserEngine");
      } catch (err) {
        warnings.push({ stage: "parsing", severity: "warning", message: `DXF import failed: ${err}` });
        stages.push("dxf_parsing: FAILED");
      }
    }

    if (features.length === 0 && dimensions.length > 0) {
      features = this.dimensionsToFeatures(dimensions, {});
    }

    if (features.length === 0) {
      return {
        success: false, detected_format: format, detected_process: "auto",
        features_detected: 0, features_classified: [], program_text: "(No features detected — check input format and content)",
        program_line_count: 0, cycle_time_sec: 0, tool_list: [],
        pipeline_used: "none", confidence_score: 0.1,
        warnings: [...warnings, { stage: "extraction", severity: "critical", message: "No machinable features extracted from input" }],
        stages_completed: stages,
      };
    }

    stages.push(`feature_extraction: ${features.length} features`);

    // ── Stage 3: Detect Process Type ──
    const processType = input.process_type === "auto" || !input.process_type
      ? detectProcessType(features)
      : input.process_type;
    stages.push(`process_detection: ${processType}`);

    // Detect cylindrical vs prismatic
    const hasDiameters = features.some(f => f.dimensions.diameter_mm || f.dimensions.od_mm);
    const hasODProfile = features.some(f => f.type.startsWith("od_") || f.type === "face" || f.type === "part_off");
    if (hasDiameters && hasODProfile) partType = "cylindrical";

    // ── Stage 4: Build pipeline input and route ──
    const isoGroup = input.material_iso_group || this.guessISOGroup(material || "steel");

    let programText = "";
    let cycleTime = 0;
    let toolList: AutoPTPResult["tool_list"] = [];
    let confidence = 0.7;
    let pipelineUsed = "";
    let setupSheet: Record<string, unknown> | undefined;

    if (processType === "turning") {
      // Route to TurningPrintToProgramEngine
      try {
        const { turningPrintToProgramEngine } = await import("./TurningPrintToProgramEngine.js");
        const turningInput = {
          part_number: partNumber || "AUTO-TURN",
          material: { material_name: material || "Steel", iso_group: isoGroup },
          bar_stock_od_mm: input.stock_diameter_mm || this.inferStockOD(features),
          part_length_mm: input.stock_length_mm || this.inferPartLength(features),
          max_spindle_rpm: input.max_spindle_rpm || 4000,
          max_power_kW: input.max_power_kW || 15,
          controller: input.controller,
          features: features.map((f, i) => ({
            id: f.id || `F${i + 1}`,
            type: f.type as any,
            od_mm: f.dimensions.diameter_mm || f.dimensions.od_mm,
            id_mm: f.dimensions.bore_diameter_mm || f.dimensions.id_mm,
            length_mm: f.dimensions.length_mm || f.dimensions.depth_mm || 20,
            depth_mm: f.dimensions.depth_mm,
            width_mm: f.dimensions.width_mm,
            diameter_mm: f.dimensions.diameter_mm,
            thread_pitch_mm: f.dimensions.pitch_mm,
            groove_width_mm: f.dimensions.groove_width_mm,
            groove_depth_mm: f.dimensions.groove_depth_mm,
            tolerance_mm: f.dimensions.tolerance_mm,
            surface_finish_Ra_um: f.dimensions.surface_finish_Ra_um,
          })),
          optimization_target: input.optimization_target || "balanced",
        };
        const result = turningPrintToProgramEngine.calculate("turning_print_to_program", turningInput as any);
        programText = (result as any).program_text || "";
        cycleTime = (result as any).estimated_cycle_time_sec || 0;
        toolList = ((result as any).operations || []).map((op: any) => ({
          tool_number: op.tool?.tool_number || 0,
          description: `${op.tool?.insert_type || "tool"} ${op.tool?.holder_style || ""}`,
          diameter_mm: op.tool?.nose_radius_mm ? op.tool.nose_radius_mm * 2 : undefined,
        }));
        confidence = (result as any).confidence_score || 0.8;
        setupSheet = { setup_notes: (result as any).setup_notes };
        pipelineUsed = "TurningPrintToProgramEngine";
        stages.push("program_generation: turning pipeline");
      } catch (err) {
        warnings.push({ stage: "generation", severity: "critical", message: `Turning pipeline failed: ${err}` });
        pipelineUsed = "FAILED";
      }
    } else {
      // Route to PrintToProgramPipelineEngine (milling)
      try {
        const { printToProgramPipelineEngine } = await import("./PrintToProgramPipelineEngine.js");
        const millingInput = {
          part_number: partNumber || "AUTO-MILL",
          material: {
            material_name: material || "Steel",
            specification: "",
            iso_group: isoGroup,
          },
          stock_size: {
            x: input.stock_x_mm || overallDims.x + 3 || 100,
            y: input.stock_y_mm || overallDims.y + 3 || 80,
            z: input.stock_z_mm || overallDims.z + 3 || 30,
          },
          dimensions: dimensions.map((d, i) => ({
            id: `D${i + 1}`,
            type: d.type,
            nominal_mm: d.nominal,
            tolerance: { plus: d.tolerance_plus, minus: d.tolerance_minus },
            confidence: 0.85,
          })),
          features: features.map((f, i) => ({
            id: f.id || `F${i + 1}`,
            type: this.mapToMillingFeatureType(f.type),
            dimensions: f.dimensions,
            position: f.position,
          })),
          machine_brand: input.machine_brand,
          machine_model: input.machine_model,
          max_spindle_rpm: input.max_spindle_rpm || 10000,
          max_power_kW: input.max_power_kW || 15,
          optimization_target: input.optimization_target || "balanced",
        };
        const result = printToProgramPipelineEngine.calculate("print_to_program_full", millingInput as any) as any;
        if (result && typeof result === "object") {
          const r = result;
          programText = (r.program_text as string) || "";
          cycleTime = (r.estimated_cycle_time_sec as number) || 0;
          confidence = (r.confidence_score as number) || 0.75;
          pipelineUsed = "PrintToProgramPipelineEngine";
          stages.push("program_generation: milling pipeline");
        }
      } catch (err) {
        warnings.push({ stage: "generation", severity: "critical", message: `Milling pipeline failed: ${err}` });
        pipelineUsed = "FAILED";
      }
    }

    return {
      success: programText.length > 0,
      detected_format: format,
      detected_process: processType,
      part_number: partNumber,
      material: material,
      features_detected: features.length,
      features_classified: features,
      program_text: programText,
      program_line_count: programText.split("\n").length,
      cycle_time_sec: Math.round(cycleTime),
      tool_list: toolList,
      setup_sheet: setupSheet,
      pipeline_used: pipelineUsed,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
      stages_completed: stages,
    };
  }

  // ── Helper: Convert parsed dimensions to MachinableFeature[] ──
  private dimensionsToFeatures(
    dims: Array<{ type: string; nominal: number; tolerance_plus?: number; tolerance_minus?: number }>,
    context: Record<string, unknown>,
  ): AutoPTPResult["features_classified"] {
    const features: AutoPTPResult["features_classified"] = [];
    let idx = 1;

    for (const d of dims) {
      if (d.type === "diameter" && d.nominal > 0) {
        features.push({
          id: `F${idx++}`,
          type: d.nominal > 50 ? "od_straight" : "hole",
          dimensions: { diameter_mm: d.nominal, depth_mm: 20 },
        });
      } else if (d.type === "linear" && d.nominal > 0) {
        features.push({
          id: `F${idx++}`,
          type: "face",
          dimensions: { length_mm: d.nominal },
        });
      }
    }

    // Extract threads from context
    const threads = (context.threads as Array<{ spec: string; major_diameter?: number; pitch_mm?: number }>) || [];
    for (const t of threads) {
      features.push({
        id: `F${idx++}`,
        type: "thread_od",
        dimensions: { diameter_mm: t.major_diameter || 10, pitch_mm: t.pitch_mm || 1.5, length_mm: 15 },
      });
    }

    return features;
  }

  // ── Helper: Convert IGES geometry to features ──
  private igesGeometryToFeatures(igesResult: any): AutoPTPResult["features_classified"] {
    const features: AutoPTPResult["features_classified"] = [];
    const entities = igesResult?.entities || igesResult?.geometry || [];
    let idx = 1;

    for (const entity of entities) {
      if (entity.type_name === "circular_arc" || entity.type === 100) {
        features.push({
          id: `F${idx++}`,
          type: "hole",
          dimensions: { diameter_mm: (entity.radius || 5) * 2, depth_mm: 10 },
        });
      } else if (entity.type_name === "line" || entity.type === 110) {
        // Lines define profile geometry
        features.push({
          id: `F${idx++}`,
          type: "face",
          dimensions: { length_mm: entity.length || 50 },
        });
      }
    }

    return features;
  }

  // ── Helper: Convert DXF entities to features ──
  private dxfToFeatures(dxfResult: any): AutoPTPResult["features_classified"] {
    const features: AutoPTPResult["features_classified"] = [];
    const circles = dxfResult?.circles || dxfResult?.entities?.filter?.((e: any) => e.type === "CIRCLE") || [];
    let idx = 1;

    for (const c of circles) {
      features.push({
        id: `F${idx++}`,
        type: "hole",
        dimensions: { diameter_mm: (c.radius || c.r || 5) * 2, depth_mm: 10 },
        position: { x: c.center?.x || c.x || 0, y: c.center?.y || c.y || 0 },
      });
    }

    return features;
  }

  // ── Helper: Guess ISO group from material name ──
  private guessISOGroup(mat: string): "P" | "M" | "K" | "N" | "S" | "H" {
    const m = mat.toLowerCase();
    if (m.includes("stainless") || m.includes("ss") || m.includes("304") || m.includes("316")) return "M";
    if (m.includes("cast iron") || m.includes("gray") || m.includes("ductile") || m.includes("cfrp")) return "K";
    if (m.includes("aluminum") || m.includes("al ") || m.includes("6061") || m.includes("7075") || m.includes("brass") || m.includes("copper") || m.includes("plastic") || m.includes("nylon") || m.includes("delrin")) return "N";
    if (m.includes("titanium") || m.includes("inconel") || m.includes("hastelloy") || m.includes("ti-6al")) return "S";
    if (m.includes("hardened") || m.includes("hrc") || m.includes("hard")) return "H";
    return "P"; // Default steel
  }

  // ── Helper: Map generic feature type to milling feature type ──
  private mapToMillingFeatureType(type: string): string {
    const map: Record<string, string> = {
      hole: "through_hole", pocket: "pocket", slot: "slot", boss: "boss",
      contour: "contour_profile", face: "face_mill", thread: "tapped_hole",
      chamfer: "chamfer", fillet: "fillet", counterbore: "counterbore",
      countersink: "countersink", keyway: "slot",
    };
    return map[type] || type;
  }

  // ── Helper: Infer stock OD from turning features ──
  private inferStockOD(features: AutoPTPResult["features_classified"]): number {
    let maxOD = 50;
    for (const f of features) {
      const d = f.dimensions.diameter_mm || f.dimensions.od_mm || 0;
      if (d > maxOD) maxOD = d;
    }
    return Math.ceil(maxOD / 5) * 5 + 5; // Round up to next 5mm + 5mm oversize
  }

  // ── Helper: Infer part length from features ──
  private inferPartLength(features: AutoPTPResult["features_classified"]): number {
    let totalLength = 0;
    for (const f of features) {
      const l = f.dimensions.length_mm || f.dimensions.depth_mm || 0;
      if (l > totalLength) totalLength = l;
    }
    return totalLength > 0 ? totalLength + 5 : 75; // +5mm stock allowance
  }
}

/** Singleton instance. */
export const autoPrintToProgramBridgeEngine = new AutoPrintToProgramBridgeEngine();
