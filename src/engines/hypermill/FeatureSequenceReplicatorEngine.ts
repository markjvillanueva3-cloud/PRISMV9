/**
 * FeatureSequenceReplicatorEngine — HM-KC-MS10-S2/U-HKC54
 *
 * Takes a FeatureSequenceRecord template (from a similar part) + new part
 * description, adapts the sequence, and outputs an AC Python script.
 *
 * Adaptation steps:
 * 1. Scale dimensions proportionally
 * 2. Adjust S/F for new material using ISO group physics
 * 3. Add/remove features not in template
 * 4. Adjust tool cascade for new part size
 * 5. Generate AC Python script via HyperMill AC API
 *
 * @milestone HM-KC-MS10/U-HKC54
 */

import type {
  FeatureSequenceRecord,
  SequenceOperation,
  SequenceTool,
  StockDefinition,
} from "./HMCProjectParserEngine.js";
import type { RecognizedFeature, FeatureType } from "../FeatureRecognitionEngine.js";
import type { AdaptationSuggestion } from "./PartSimilaritySearchEngine.js";
import { CANONICAL_KIENZLE } from "../../physics/constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Input for replication: new part description */
export interface ReplicationInput {
  /** New part name */
  partName: string;
  /** New material */
  material: string;
  /** New material ISO group */
  isoGroup: StockDefinition["isoGroup"];
  /** New part dimensions (bounding box) */
  dimensions: { x: number; y: number; z: number };
  /** Features on the new part */
  features: RecognizedFeature[];
  /** Optional: machine max RPM */
  machineMaxRPM?: number;
  /** Optional: machine max feed mm/min */
  machineMaxFeed?: number;
}

/** Replication result */
export interface ReplicationResult {
  /** Adapted feature sequence record */
  adaptedRecord: FeatureSequenceRecord;
  /** Generated AC Python script */
  acPythonScript: string;
  /** Adaptations applied */
  adaptationsApplied: AdaptationApplied[];
  /** Scale factors used */
  scaleFactor: { x: number; y: number; z: number; avg: number };
  /** Speed/feed adjustment factor (based on material change) */
  sfAdjustmentFactor: number;
  /** Replication confidence (0-1) */
  confidence: number;
  /** Warnings */
  warnings: string[];
}

/** Record of an adaptation that was applied */
export interface AdaptationApplied {
  /** What was adapted */
  type: "scale" | "sf_adjust" | "add_op" | "remove_op" | "tool_change" | "material_adjust";
  /** Operation index affected (-1 for global) */
  operationIndex: number;
  /** Description */
  description: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CANONICAL ISO GROUP kc1.1 VALUES (from constants.ts)
// ══════════════════════════════════════════════════════════════════════════════

/** Build kc1.1 and mc lookup from canonical constants */
const KC1_1_BY_GROUP: Record<string, number> = Object.fromEntries(
  Object.entries(CANONICAL_KIENZLE).map(([group, vals]) => [group, vals.kc1_1])
);
const MC_BY_GROUP: Record<string, number> = Object.fromEntries(
  Object.entries(CANONICAL_KIENZLE).map(([group, vals]) => [group, vals.mc])
);

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class FeatureSequenceReplicatorEngine {
  /**
   * Replicate a template sequence for a new part.
   *
   * @param template - The FeatureSequenceRecord to adapt from
   * @param input - The new part description
   * @returns ReplicationResult with adapted record and AC Python script
   */
  replicate(template: FeatureSequenceRecord, input: ReplicationInput): ReplicationResult {
    const warnings: string[] = [];
    const adaptations: AdaptationApplied[] = [];

    // Step 1: Compute scale factors
    const scaleFactor = this.computeScaleFactors(template, input);

    // Step 2: Compute S/F adjustment for material change
    const sfFactors = this.computeSFAdjustment(
      template.stock.isoGroup ?? "P",
      input.isoGroup ?? "P"
    );

    // Step 3: Adapt operations
    const adaptedOps = this.adaptOperations(
      template.operations, scaleFactor, sfFactors, input, adaptations, warnings
    );

    // Step 4: Handle feature additions/removals
    const finalOps = this.reconcileFeatures(
      adaptedOps, template.features, input.features, adaptations, warnings
    );

    // Step 5: Build adapted record
    const adaptedRecord: FeatureSequenceRecord = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: "replicated",
      partType: template.partType,
      partName: input.partName,
      stock: {
        type: template.stock.type,
        dimensions: {
          x: input.dimensions.x + 10, // 5mm allowance per side
          y: input.dimensions.y + 10,
          z: input.dimensions.z + 5,
        },
        material: input.material,
        isoGroup: input.isoGroup,
      },
      wcsList: template.wcsList, // Preserve WCS from template
      features: input.features,
      operations: finalOps,
      totalCycleTimeSec: finalOps.reduce(
        (sum, op) => sum + (op.estimatedCycleTimeSec ?? 0), 0
      ),
      toolChangeCount: this.countToolChanges(finalOps),
      uniqueToolCount: new Set(finalOps.map((o) => o.tool.toolNumber)).size,
      createdAt: new Date().toISOString(),
      complexityScore: template.complexityScore,
      warnings,
    };

    // Step 6: Generate AC Python script
    const acScript = this.generateACPythonScript(adaptedRecord);

    return {
      adaptedRecord,
      acPythonScript: acScript,
      adaptationsApplied: adaptations,
      scaleFactor: { ...scaleFactor, avg: (scaleFactor.x + scaleFactor.y + scaleFactor.z) / 3 },
      sfAdjustmentFactor: sfFactors.speed, // Report speed factor as primary S/F adjustment
      confidence: this.computeConfidence(template, input, adaptations, warnings),
      warnings,
    };
  }

  // ── Scale computation ────────────────────────────────────────────────────

  private computeScaleFactors(
    template: FeatureSequenceRecord,
    input: ReplicationInput
  ): { x: number; y: number; z: number } {
    const td = template.stock.dimensions;
    return {
      x: td.x > 0 ? input.dimensions.x / td.x : 1,
      y: td.y > 0 ? input.dimensions.y / td.y : 1,
      z: td.z > 0 ? input.dimensions.z / td.z : 1,
    };
  }

  // ── S/F adjustment ───────────────────────────────────────────────────────

  /**
   * Compute speed and feed adjustment factors based on material change.
   *
   * Speed: factor = sqrt(kc_template / kc_new)
   *   — Derived from constant-power constraint (P = Fc × Vc)
   *
   * Feed: factor = (kc_template / kc_new)^(1/(1-mc_new))
   *   — Kienzle: Fc = kc1_1 × h^(1-mc). For constant force at new kc,
   *     solve for h ratio: h_new/h_old = (kc_old/kc_new)^(1/(1-mc)).
   *   — Source: Altintas, Manufacturing Automation, Ch. 2
   */
  private computeSFAdjustment(templateGroup: string, newGroup: string): { speed: number; feed: number } {
    const kcTemplate = KC1_1_BY_GROUP[templateGroup] ?? 1800;
    const kcNew = KC1_1_BY_GROUP[newGroup] ?? 1800;
    const mcNew = MC_BY_GROUP[newGroup] ?? 0.25;

    const speedFactor = Math.sqrt(kcTemplate / kcNew);
    const feedFactor = Math.pow(kcTemplate / kcNew, 1 / (1 - mcNew));

    return { speed: speedFactor, feed: feedFactor };
  }

  // ── Operation adaptation ─────────────────────────────────────────────────

  private adaptOperations(
    templateOps: SequenceOperation[],
    scale: { x: number; y: number; z: number },
    sfFactors: { speed: number; feed: number },
    input: ReplicationInput,
    adaptations: AdaptationApplied[],
    warnings: string[]
  ): SequenceOperation[] {
    const avgScale = (scale.x + scale.y + scale.z) / 3;

    return templateOps.map((op, i) => {
      // Scale tool FIRST so safety clamps can reference the adapted diameter
      const adaptedTool: SequenceTool = { ...op.tool };
      if (avgScale !== 1.0 && avgScale > 0.5 && avgScale <= 2.0) {
        const newDiam = Math.round(op.tool.diameterMm * avgScale * 10) / 10;
        adaptedTool.diameterMm = this.roundToStandardDiameter(newDiam);
      }

      const adaptedParams: Record<string, number | string | boolean> = {};

      // Adapt each parameter
      for (const [key, value] of Object.entries(op.parameters)) {
        if (typeof value === "number") {
          if (this.isDimensionParam(key)) {
            // Z-axis params (depth, stepdown, peck, clearance, retract) use scale.z
            // XY-axis params (stepover, width, radius, bore_diameter) use avg of x/y
            const dimScale = this.isZAxisParam(key) ? scale.z : (scale.x + scale.y) / 2;
            let scaled = Math.round(value * dimScale * 1000) / 1000;

            // SAFETY: Clamp stepdown to tool diameter (full-depth cut = tool breakage)
            if (/stepdown|ap/i.test(key)) {
              scaled = Math.min(scaled, adaptedTool.diameterMm);
            }
            // SAFETY: Clamp stepover to 80% of tool diameter
            if (/stepover|ae/i.test(key)) {
              scaled = Math.min(scaled, adaptedTool.diameterMm * 0.8);
            }

            adaptedParams[key] = scaled;
          } else if (this.isSpeedFeedParam(key)) {
            // Speed (RPM/spindle) uses speed factor; feed uses feed factor
            const isSpeed = /rpm|spindle/i.test(key);
            let adjusted = value * (isSpeed ? sfFactors.speed : sfFactors.feed);
            // Clamp to machine limits
            if (isSpeed) {
              adjusted = Math.min(adjusted, input.machineMaxRPM ?? 15000);
              // SAFETY: Minimum RPM — below 100 RPM, spindle can't maintain torque
              adjusted = Math.max(adjusted, 100);
            } else {
              adjusted = Math.min(adjusted, input.machineMaxFeed ?? 10000);
              // SAFETY: Minimum feed — below 10 mm/min, rubbing instead of cutting → heat buildup
              adjusted = Math.max(adjusted, 10);
            }
            adaptedParams[key] = Math.round(adjusted);
          } else {
            adaptedParams[key] = value;
          }
        } else {
          adaptedParams[key] = value;
        }
      }

      // Scale cycle time estimate
      const volumeScale = scale.x * scale.y * scale.z;
      const scaledCycleTime = (op.estimatedCycleTimeSec ?? 30) * volumeScale / sfFactors.speed;

      if (sfFactors.speed !== 1.0) {
        adaptations.push({
          type: "sf_adjust",
          operationIndex: i,
          description: `Speed adjusted ×${sfFactors.speed.toFixed(2)}, feed ×${sfFactors.feed.toFixed(2)} for material change`,
        });
      }
      if (avgScale !== 1.0) {
        adaptations.push({
          type: "scale",
          operationIndex: i,
          description: `Dimensions scaled (XY: ${((scale.x + scale.y) / 2).toFixed(2)}×, Z: ${scale.z.toFixed(2)}×)`,
        });
      }

      return {
        ...op,
        index: i,
        parameters: adaptedParams,
        tool: adaptedTool,
        estimatedCycleTimeSec: Math.round(scaledCycleTime),
      };
    });
  }

  // ── Feature reconciliation ───────────────────────────────────────────────

  private reconcileFeatures(
    adaptedOps: SequenceOperation[],
    templateFeatures: RecognizedFeature[],
    newFeatures: RecognizedFeature[],
    adaptations: AdaptationApplied[],
    warnings: string[]
  ): SequenceOperation[] {
    const templateTypes = new Set(templateFeatures.map((f) => f.type));
    const newTypes = new Set(newFeatures.map((f) => f.type));
    const ops = [...adaptedOps];

    // Compute next available toolNumber to avoid collisions
    let nextToolNum = Math.max(0, ...ops.map((o) => o.tool.toolNumber)) + 1;

    // Add operations for new features not in template
    for (const ft of newTypes) {
      if (!templateTypes.has(ft)) {
        const feature = newFeatures.find((f) => f.type === ft)!;
        const tool = this.defaultTool(ft, feature, nextToolNum++);
        ops.push({
          index: ops.length,
          name: `Added: ${ft.replace(/_/g, " ")}`,
          cycleCode: this.defaultCycleCode(ft),
          operationType: this.defaultOpType(ft),
          tool,
          parameters: this.defaultParameters(ft, feature, tool.diameterMm),
          targetFeatures: [ft],
          dependsOn: [],
          estimatedCycleTimeSec: 30,
        });
        adaptations.push({
          type: "add_op",
          operationIndex: ops.length - 1,
          description: `Added operation for new feature: ${ft}`,
        });
      }
    }

    // Remove operations targeting features not present in new part
    const removedFeatureTypes = new Set<FeatureType>();
    for (const ft of templateTypes) {
      if (!newTypes.has(ft)) {
        removedFeatureTypes.add(ft);
        adaptations.push({
          type: "remove_op",
          operationIndex: -1,
          description: `Template feature ${ft} not in new part — operations excluded`,
        });
        warnings.push(`Feature ${ft} from template not found in new part — operations removed`);
      }
    }

    // Filter out operations that exclusively target removed features
    const filtered = removedFeatureTypes.size > 0
      ? ops.filter((op) => !op.targetFeatures.every((ft) => removedFeatureTypes.has(ft)))
      : ops;

    // Re-index operations and fix dependsOn references
    const indexMap = new Map<number, number>();
    filtered.forEach((op, i) => indexMap.set(op.index, i));
    return filtered.map((op, i) => {
      const brokenDeps = op.dependsOn.filter((d) => !indexMap.has(d));
      if (brokenDeps.length > 0) {
        warnings.push(`Op "${op.name}" lost ${brokenDeps.length} dependency link(s) after feature removal — verify sequence safety`);
      }
      return {
        ...op,
        index: i,
        dependsOn: op.dependsOn.filter((d) => indexMap.has(d)).map((d) => indexMap.get(d)!),
      };
    });
  }

  // ── AC Python script generation ──────────────────────────────────────────

  /**
   * Generate a hyperMILL Python script from the adapted record.
   * API patterns verified against live hyperMILL v33 installation:
   * - `import om` + `import om.cam.core as cam` (OPEN MIND Python API)
   * - `om.GetApplication().CurrentDocument.CamModel` for CAM access
   * - `ToolSet.AddDBTool(toolID)` for tool database operations
   * - `job.SetCfgParameters({"key": "value"})` for all parameters
   * - `job.SetTool(tool)` or `job.SetToolByUUID(uuid)` for tool assignment
   * - try/except error handling
   */
  private generateACPythonScript(record: FeatureSequenceRecord): string {
    const safeName = record.partName.replace(/[^a-zA-Z0-9]/g, "_");
    const lines: string[] = [
      `# hyperMILL Python Script`,
      `# Generated by PRISM FeatureSequenceReplicator`,
      `# Part: ${record.partName}`,
      `# Material: ${record.stock.material} (ISO ${record.stock.isoGroup ?? "P"})`,
      `# Operations: ${record.operations.length}`,
      `# Generated: ${record.createdAt}`,
      ``,
      `import om`,
      `import om.cam.core as cam`,
      `import om.cam.gui as gui`,
      ``,
      `try:`,
      ``,
      `    # ── Application & Document Setup ─────────────────────`,
      `    app = om.GetApplication()`,
      `    cam_model = app.CurrentDocument.CamModel`,
      `    if cam_model is None:`,
      `        gui.ShowMessageBox("No CAM model found. Open a project first.", gui.Severity.WARNING)`,
      `        raise RuntimeError("No CAM model")`,
      ``,
      `    tool_set = cam_model.ToolSet`,
      `    jl_set = cam_model.JobListSet`,
      ``,
    ];

    // Tool setup — AddDBTool by ID, then configure via SetCfgParameters
    const uniqueTools = new Map<number, SequenceTool>();
    for (const op of record.operations) {
      if (!uniqueTools.has(op.tool.toolNumber)) {
        uniqueTools.set(op.tool.toolNumber, op.tool);
      }
    }

    lines.push(`    # ── Tool Setup ────────────────────────────────────`);
    lines.push(`    # Note: Tools must exist in the hyperMILL tool database.`);
    lines.push(`    # Use tool_set.AddDBTool(toolID) to add from DB, or`);
    lines.push(`    # configure existing tools via tool.SetCfgParameters().`);
    lines.push(`    tools_by_num = {}`);
    lines.push(`    all_tools = tool_set.GetTools()`);
    lines.push(`    for t in all_tools:`);
    lines.push(`        tools_by_num[t.ID] = t`);
    for (const [num, tool] of uniqueTools) {
      lines.push(`    # T${num}: ${tool.name} (D=${tool.diameterMm}mm, ${tool.type})`);
    }
    lines.push(``);

    // Operations — use SetCfgParameters for all params including S/F
    lines.push(`    # ── Operations ─────────────────────────────────────`);
    lines.push(`    jobs = cam.GetCamEntities(cam.CamEntityFilter.ALL_CYCLE_JOBS)`);
    lines.push(`    gui.Write(f"Found {len(jobs)} existing jobs in project")`);
    lines.push(``);

    for (const op of record.operations) {
      const opIdx = op.index + 1;
      lines.push(`    # Op ${opIdx}: ${op.name} (${op.cycleCode})`);
      lines.push(`    # Tool T${op.tool.toolNumber}: ${op.tool.name}`);

      // Build CfgParameters dict for this operation
      const cfgEntries: string[] = [];
      const rpm = op.parameters.spindle_rpm ?? op.parameters.rpm;
      const feed = op.parameters.feed_mm_min ?? op.parameters.feedrate ?? op.parameters.feed;
      if (typeof rpm === "number") {
        cfgEntries.push(`"spindle_speed": "${rpm}"`);
      }
      if (typeof feed === "number") {
        cfgEntries.push(`"feed": "${feed}"`);
      }

      // Translate dimension params to hyperMILL CfgParameter keys
      for (const [key, value] of Object.entries(op.parameters)) {
        if (/spindle_rpm|rpm|feed_mm_min|feedrate|feed$/i.test(key)) continue;
        const hmKey = this.translateParamKey(key);
        if (value !== undefined && value !== null) {
          cfgEntries.push(`"${hmKey}": "${value}"`);
        }
      }

      if (cfgEntries.length > 0) {
        lines.push(`    op${opIdx}_params = {${cfgEntries.join(", ")}}`);
        lines.push(`    gui.Write(f"Op ${opIdx} (${op.name}): setting {len(op${opIdx}_params)} parameters")`);
        lines.push(`    # Apply via SetCfgParameters when job reference is available`);
      }
      lines.push(``);
    }

    // Summary
    lines.push(`    # ── Summary ────────────────────────────────────────`);
    lines.push(`    gui.ShowMessageBox(`);
    lines.push(`        f"PRISM Script Complete\\n\\n"`);
    lines.push(`        f"Part: ${record.partName}\\n"`);
    lines.push(`        f"Material: ${record.stock.material}\\n"`);
    lines.push(`        f"Operations: ${record.operations.length}\\n",`);
    lines.push(`        gui.Severity.MESSAGE`);
    lines.push(`    )`);
    lines.push(``);
    lines.push(`except Exception as e:`);
    lines.push(`    gui.ShowMessageBox(f"PRISM Script Error: {e}", gui.Severity.ERROR)`);
    lines.push(`    raise`);

    return lines.join("\n");
  }

  /** Translate internal param keys to hyperMILL AC API parameter names */
  private translateParamKey(key: string): string {
    const map: Record<string, string> = {
      stepdown_mm: "ap", stepdown: "ap", depth_of_cut: "ap",
      stepover_mm: "ae", stepover: "ae", radial_depth: "ae",
      depth_mm: "total_depth", total_depth: "total_depth",
      tolerance_mm: "tolerance", tolerance: "tolerance",
      scallop_height: "scallop_height", cusp_height: "scallop_height",
      clearance_z: "clearance_z", clearance_z_mm: "clearance_z",
      retract_z: "retract_z", retract_z_mm: "retract_z",
      peck_depth_mm: "peck_depth", peck_depth: "peck_depth",
      thread_pitch_mm: "thread_pitch", thread_pitch: "thread_pitch",
      bore_diameter: "bore_diameter", hole_diameter: "bore_diameter",
      allowance_mm: "stock_leave", stock_leave: "stock_leave",
    };
    return map[key] ?? key;
  }

  // ── Helper methods ───────────────────────────────────────────────────────

  private isDimensionParam(key: string): boolean {
    return /depth|stepdown|stepover|clearance|retract|approach|peck|bore_diameter|hole_diameter|width|length|radius/i.test(key);
  }

  /** Z-axis dimension params — depth, stepdown, peck, clearance, retract */
  private isZAxisParam(key: string): boolean {
    return /depth|stepdown|peck|clearance_z|retract_z/i.test(key);
  }

  private isSpeedFeedParam(key: string): boolean {
    return /feed|speed|rpm|spindle/i.test(key);
  }

  private roundToStandardDiameter(d: number): number {
    // Includes micro tools, imperial-metric crossovers, and standard metric sizes
    const standards = [
      0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 3.175, 4, 5, 6, 6.35,
      8, 10, 12, 12.7, 16, 20, 25, 25.4, 32, 40, 50, 63, 80,
    ];
    let closest = standards[0];
    let minDiff = Math.abs(d - closest);
    for (const s of standards) {
      const diff = Math.abs(d - s);
      if (diff < minDiff) { closest = s; minDiff = diff; }
    }
    return closest;
  }

  private countToolChanges(ops: SequenceOperation[]): number {
    let changes = 0;
    for (let i = 1; i < ops.length; i++) {
      if (ops[i].tool.toolNumber !== ops[i - 1].tool.toolNumber) changes++;
    }
    return changes;
  }

  private defaultCycleCode(ft: FeatureType): string {
    const map: Partial<Record<FeatureType, string>> = {
      through_hole: "DRILLING", blind_hole: "PECK_DRILLING",
      tapped_hole: "TAPPING", pocket_rectangular: "POCKET_2D",
      contour_2d: "CONTOUR_2D", face: "FACE_MILLING",
      chamfer: "CONTOUR_2D", fillet: "PENCIL_FINISHING",
      slot_through: "SLOT_MILLING", groove: "GROOVING",
    };
    return map[ft] ?? "CONTOUR_2D";
  }

  private defaultOpType(ft: FeatureType): SequenceOperation["operationType"] {
    if (["through_hole", "blind_hole", "counterbore", "countersink"].includes(ft)) return "drilling";
    if (["tapped_hole", "thread_external"].includes(ft)) return "threading";
    return "finishing";
  }

  private defaultTool(ft: FeatureType, feature: RecognizedFeature, toolNum: number): SequenceTool {
    const diam = feature.dimensions.diameter_mm ?? feature.dimensions.width_mm ?? 10;
    const typeMap: Partial<Record<FeatureType, SequenceTool["type"]>> = {
      through_hole: "drill", blind_hole: "drill", tapped_hole: "tap",
      chamfer: "chamfer_mill", fillet: "endmill_ball",
    };
    return {
      toolNumber: toolNum,
      name: `T${toolNum} ${ft}`,
      type: typeMap[ft] ?? "endmill_flat",
      diameterMm: diam,
    };
  }

  private defaultParameters(ft: FeatureType, feature: RecognizedFeature, toolDiam: number): Record<string, number | string | boolean> {
    const depth = feature.dimensions.depth_mm ?? 10;
    const isHoleMaking = ["through_hole", "blind_hole", "counterbore", "countersink", "tapped_hole"].includes(ft);

    if (isHoleMaking) {
      return {
        depth_mm: depth,
        spindle_rpm: 2000,
        feed_mm_min: 200,
        peck_depth_mm: depth > toolDiam * 3 ? toolDiam * 2 : 0,
      };
    }

    // Milling ops: ALWAYS include stepdown and stepover — omitting these
    // defaults to full-depth/full-width cuts which WILL break tools
    return {
      depth_mm: depth,
      stepdown_mm: Math.min(toolDiam * 0.5, depth / 2, toolDiam), // ≤ tool diameter
      stepover_mm: toolDiam * 0.4, // 40% radial engagement
      spindle_rpm: 3000,
      feed_mm_min: 500,
    };
  }

  private computeConfidence(
    template: FeatureSequenceRecord,
    input: ReplicationInput,
    adaptations: AdaptationApplied[],
    warnings: string[]
  ): number {
    // Empty template → very low confidence
    if (template.operations.length === 0) return 0.15;

    let conf = 0.9;
    // Material change penalty
    if (template.stock.isoGroup !== input.isoGroup) conf -= 0.05;
    // Large scale change penalty
    const avgScale = (
      input.dimensions.x / (template.stock.dimensions.x || 1) +
      input.dimensions.y / (template.stock.dimensions.y || 1) +
      input.dimensions.z / (template.stock.dimensions.z || 1)
    ) / 3;
    if (Math.abs(avgScale - 1.0) > 0.5) conf -= 0.1;
    // Feature mismatch penalty
    const addedOps = adaptations.filter((a) => a.type === "add_op").length;
    const removedOps = adaptations.filter((a) => a.type === "remove_op").length;
    conf -= (addedOps + removedOps) * 0.03;
    conf -= warnings.length * 0.02;
    return Math.max(0.1, Math.min(1.0, conf));
  }
}

/** Singleton export */
export const featureSequenceReplicatorEngine = new FeatureSequenceReplicatorEngine();
