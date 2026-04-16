/**
 * WorkflowTemplateEngine — Canonical CAD/CAM Workflow Sequences
 *
 * Loads extracted hyperMILL/hyperCAD-S workflow knowledge and provides:
 *   1. Part-type matching to canonical workflow templates
 *   2. Operation sequence suggestions for calculator page
 *   3. Template validation against actual operation lists
 *   4. Gap detection (missing steps vs canonical)
 *
 * Data Source: data/extracted-knowledge/hypermill-workflows/*.json
 * Extracted from: hyperMILL documentation (2,666 pages) + canonical patterns
 *
 * @module engines/WorkflowTemplateEngine
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Part complexity classification. */
export type PartComplexity = "simple" | "moderate" | "complex" | "extreme";

/** Process type classification. */
export type ProcessType =
  | "2d_milling"
  | "3d_milling"
  | "5axis_milling"
  | "turning"
  | "mill_turn"
  | "wire_edm"
  | "sinker_edm"
  | "grinding"
  | "die_design"
  | "mold_design"
  | "fixture_design";

/** Single step in a workflow template. */
export interface WorkflowStep {
  step_number: number;
  action: string;
  rationale?: string;
  optional?: boolean;
  alternatives?: string[];
}

/** Complete workflow template. */
export interface WorkflowTemplate {
  id: string;
  name: string;
  process_type: ProcessType;
  complexity: PartComplexity;
  description: string;
  prerequisites: string[];
  steps: WorkflowStep[];
  result: string;
  source: string;
  confidence: number;
}

/** Quick reference lookup. */
export interface QuickReference {
  cad_complex_part: string[];
  cam_2d_part: string[];
  cam_3d_part: string[];
  cam_5axis_part: string[];
  cam_turning?: string[];
  cam_mill_turn?: string[];
}

/** Order of operations guide. */
export interface OrderOfOperations {
  category: string;
  name: string;
  operations: string[];
  rationale: string;
  source: string;
}

/** Loaded workflow data. */
interface WorkflowData {
  extracted_at: string;
  source: string;
  workflows: {
    total: number;
    by_category: Record<string, number>;
    items: Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      prerequisites: string[];
      steps: Array<{ step_number: number; action: string }>;
      result: string;
      source_file: string;
      confidence: number;
    }>;
  };
  order_of_operations: OrderOfOperations[];
  quick_reference: QuickReference;
}

/** Input for sequence suggestion. */
export interface SequenceSuggestionInput {
  process_type: ProcessType;
  part_complexity?: PartComplexity;
  features?: string[];
  material_group?: string;
  machine_type?: string;
}

/** Output from sequence suggestion. */
export interface SequenceSuggestionResult {
  template_id: string;
  template_name: string;
  process_type: ProcessType;
  suggested_sequence: WorkflowStep[];
  quick_reference: string[];
  rationale: string;
  alternatives: WorkflowTemplate[];
  confidence: number;
  warnings: string[];
}

/** Gap analysis result. */
export interface GapAnalysisResult {
  template_id: string;
  provided_operations: string[];
  expected_steps: string[];
  missing_steps: string[];
  extra_steps: string[];
  out_of_order: Array<{ step: string; expected_position: number; actual_position: number }>;
  coverage_pct: number;
  recommendations: string[];
}

// ============================================================================
// CANONICAL TEMPLATES (Built-in fallback)
// ============================================================================

const CANONICAL_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "canonical-cad-die",
    name: "Complex Die Part Design",
    process_type: "die_design",
    complexity: "complex",
    description: "CAD workflow for die and tooling design with EDM electrodes",
    prerequisites: ["Customer model (STEP/IGES)", "Shrinkage factors", "Material specs"],
    steps: [
      { step_number: 1, action: "Import customer model (STEP/IGES)" },
      { step_number: 2, action: "Analyze part geometry (undercuts, draft angles)" },
      { step_number: 3, action: "Define parting line/surface" },
      { step_number: 4, action: "Create core and cavity separation" },
      { step_number: 5, action: "Add draft angles to vertical faces" },
      { step_number: 6, action: "Design electrode geometry (if EDM needed)", optional: true },
      { step_number: 7, action: "Add spark gap offset to electrodes", optional: true },
      { step_number: 8, action: "Create holder/blank geometry" },
      { step_number: 9, action: "Add alignment features" },
      { step_number: 10, action: "Export for CAM" },
    ],
    result: "Die components ready for CAM programming",
    source: "hyperCAD-S + JM Die best practice",
    confidence: 0.95,
  },
  {
    id: "canonical-cam-2d",
    name: "2D Milling Program",
    process_type: "2d_milling",
    complexity: "simple",
    description: "Standard CAM workflow for 2.5D prismatic parts",
    prerequisites: ["CAD model imported", "Stock defined", "Machine selected"],
    steps: [
      { step_number: 1, action: "Define stock/blank geometry" },
      { step_number: 2, action: "Set machine and coordinate system" },
      { step_number: 3, action: "Create work origin (NCS)" },
      { step_number: 4, action: "Select tool(s) for operations" },
      { step_number: 5, action: "Face milling (top surface)" },
      { step_number: 6, action: "Contour roughing (outer profile)" },
      { step_number: 7, action: "Contour finishing (outer profile)" },
      { step_number: 8, action: "Pocket roughing (if pockets exist)", optional: true },
      { step_number: 9, action: "Pocket finishing", optional: true },
      { step_number: 10, action: "Drilling operations" },
      { step_number: 11, action: "Chamfer/deburr operations" },
      { step_number: 12, action: "Verify toolpath simulation" },
      { step_number: 13, action: "Generate NC code" },
    ],
    result: "Verified NC code ready for machine",
    source: "hyperMILL recommended workflow",
    confidence: 0.95,
  },
  {
    id: "canonical-cam-3d",
    name: "3D Freeform Milling",
    process_type: "3d_milling",
    complexity: "complex",
    description: "CAM workflow for complex freeform surfaces",
    prerequisites: ["CAD model imported", "Stock defined", "Machine selected"],
    steps: [
      { step_number: 1, action: "Import model and define stock" },
      { step_number: 2, action: "Analyze geometry (steep vs shallow regions)" },
      { step_number: 3, action: "Create boundary curves for regions" },
      { step_number: 4, action: "Select roughing strategy (3D roughing/adaptive)" },
      { step_number: 5, action: "Calculate and verify roughing" },
      { step_number: 6, action: "Rest roughing (smaller tool)" },
      { step_number: 7, action: "3D finishing - Z-level for steep areas", rationale: "Better surface on vertical walls" },
      { step_number: 8, action: "3D finishing - scallop/flowline for shallow areas", rationale: "Uniform cusp height" },
      { step_number: 9, action: "Pencil milling for corners" },
      { step_number: 10, action: "Rest finishing if needed", optional: true },
      { step_number: 11, action: "Chamfer/blend operations" },
      { step_number: 12, action: "Full simulation verification" },
      { step_number: 13, action: "Post-process" },
    ],
    result: "Verified NC code with optimized surface finish",
    source: "hyperMILL 3D best practice",
    confidence: 0.95,
  },
  {
    id: "canonical-cam-5axis",
    name: "5-Axis Multi-Sided Part",
    process_type: "5axis_milling",
    complexity: "extreme",
    description: "CAM workflow for simultaneous 5-axis or 3+2 positioning",
    prerequisites: ["CAD model imported", "Stock defined", "5-axis machine selected"],
    steps: [
      { step_number: 1, action: "Import model and stock" },
      { step_number: 2, action: "Define machine kinematics" },
      { step_number: 3, action: "Analyze access requirements" },
      { step_number: 4, action: "Plan indexing positions (3+2)" },
      { step_number: 5, action: "Create work origins per index" },
      { step_number: 6, action: "5-axis roughing (if needed)", optional: true },
      { step_number: 7, action: "3+2 operations per orientation", rationale: "More rigid than simultaneous" },
      { step_number: 8, action: "Swarf cutting for ruled surfaces", optional: true },
      { step_number: 9, action: "5-axis contouring for freeform" },
      { step_number: 10, action: "Flow milling for blends", optional: true },
      { step_number: 11, action: "Collision checking per operation" },
      { step_number: 12, action: "Optimize tool axis transitions" },
      { step_number: 13, action: "Full machine simulation" },
      { step_number: 14, action: "Post-process with rotary output" },
    ],
    result: "Collision-free 5-axis program",
    source: "hyperMILL 5-axis best practice",
    confidence: 0.95,
  },
  {
    id: "canonical-cam-turning",
    name: "Turning Program",
    process_type: "turning",
    complexity: "moderate",
    description: "Standard CAM workflow for lathe programming",
    prerequisites: ["CAD model imported", "Stock defined", "Lathe selected"],
    steps: [
      { step_number: 1, action: "Define raw stock (bar/blank)" },
      { step_number: 2, action: "Set spindle and chuck" },
      { step_number: 3, action: "Face operation" },
      { step_number: 4, action: "OD roughing (longitudinal)" },
      { step_number: 5, action: "OD finishing" },
      { step_number: 6, action: "ID roughing (if hollow)", optional: true },
      { step_number: 7, action: "ID finishing", optional: true },
      { step_number: 8, action: "Grooving operations", optional: true },
      { step_number: 9, action: "Threading (if required)", optional: true },
      { step_number: 10, action: "Cutoff operation" },
      { step_number: 11, action: "Verify clearances" },
      { step_number: 12, action: "Post-process" },
    ],
    result: "Verified NC code ready for lathe",
    source: "hyperMILL TURN recommended workflow",
    confidence: 0.95,
  },
  {
    id: "canonical-cam-mill-turn",
    name: "Mill-Turn Program",
    process_type: "mill_turn",
    complexity: "extreme",
    description: "CAM workflow for combined turning and milling",
    prerequisites: ["CAD model imported", "Stock defined", "Mill-turn machine selected"],
    steps: [
      { step_number: 1, action: "Define stock and machine" },
      { step_number: 2, action: "Plan spindle transfers" },
      { step_number: 3, action: "Main spindle turning ops" },
      { step_number: 4, action: "Live tooling milling ops" },
      { step_number: 5, action: "Sub-spindle transfer", optional: true },
      { step_number: 6, action: "Sub-spindle turning ops", optional: true },
      { step_number: 7, action: "Back-work milling ops", optional: true },
      { step_number: 8, action: "Verify synchronization" },
      { step_number: 9, action: "Full simulation" },
      { step_number: 10, action: "Post-process" },
    ],
    result: "Synchronized mill-turn program",
    source: "hyperMILL MILL-TURN best practice",
    confidence: 0.95,
  },
  {
    id: "canonical-cam-wire-edm",
    name: "Wire EDM Program",
    process_type: "wire_edm",
    complexity: "moderate",
    description: "CAM workflow for wire EDM programming",
    prerequisites: ["CAD model imported", "Material + thickness defined", "WEDM machine selected"],
    steps: [
      { step_number: 1, action: "Import 2D geometry or extract from 3D" },
      { step_number: 2, action: "Define wire diameter and material" },
      { step_number: 3, action: "Set workpiece material and thickness" },
      { step_number: 4, action: "Create threading point" },
      { step_number: 5, action: "Define approach/lead-in" },
      { step_number: 6, action: "Program rough cut (main cut)" },
      { step_number: 7, action: "Program skim cuts (1-4 passes)", rationale: "Progressive surface improvement" },
      { step_number: 8, action: "Add no-core handling if needed", optional: true },
      { step_number: 9, action: "Verify cut sequence" },
      { step_number: 10, action: "Post-process" },
    ],
    result: "Wire EDM program with skim cuts",
    source: "JM Die WEDM best practice",
    confidence: 0.95,
  },
];

// ============================================================================
// ENGINE
// ============================================================================

class WorkflowTemplateEngine {
  private templates: WorkflowTemplate[] = [];
  private quickReference: QuickReference | null = null;
  private orderOfOperations: OrderOfOperations[] = [];
  private loaded = false;

  /**
   * Load workflow data from extracted JSON files.
   */
  load(): void {
    if (this.loaded) return;

    const workflowDir = join(process.cwd(), "data/extracted-knowledge/hypermill-workflows");

    // Start with canonical templates
    this.templates = [...CANONICAL_TEMPLATES];

    // Try to load extracted workflows
    if (existsSync(workflowDir)) {
      try {
        const files = readdirSync(workflowDir)
          .filter(f => f.startsWith("hypermill-workflows-") && f.endsWith(".json"))
          .sort()
          .reverse();

        if (files.length > 0) {
          const latestFile = join(workflowDir, files[0]);
          const data: WorkflowData = JSON.parse(readFileSync(latestFile, "utf-8"));

          // Load quick reference
          if (data.quick_reference) {
            this.quickReference = data.quick_reference;
          }

          // Load order of operations
          if (data.order_of_operations) {
            this.orderOfOperations = data.order_of_operations;
          }

          // Convert extracted workflows to templates (only high-confidence ones)
          for (const item of data.workflows.items) {
            if (item.confidence >= 0.85 && item.steps.length >= 3) {
              const processType = this.inferProcessType(item.category, item.name);
              if (processType) {
                this.templates.push({
                  id: item.id,
                  name: item.name || `${item.category} Workflow`,
                  process_type: processType,
                  complexity: this.inferComplexity(item.steps.length),
                  description: item.description || "",
                  prerequisites: item.prerequisites || [],
                  steps: item.steps.map(s => ({
                    step_number: s.step_number,
                    action: s.action,
                  })),
                  result: item.result || "",
                  source: item.source_file,
                  confidence: item.confidence,
                });
              }
            }
          }

          log.info(`WorkflowTemplateEngine: Loaded ${this.templates.length} templates, ${this.orderOfOperations.length} order guides`);
        }
      } catch (err) {
        log.warn(`WorkflowTemplateEngine: Error loading extracted workflows: ${err}`);
      }
    }

    this.loaded = true;
  }

  /**
   * Suggest operation sequence for given process type and context.
   */
  suggestSequence(input: SequenceSuggestionInput): SequenceSuggestionResult {
    this.load();

    const warnings: string[] = [];

    // Find matching templates
    const matching = this.templates.filter(t => t.process_type === input.process_type);

    if (matching.length === 0) {
      warnings.push(`No templates found for process type: ${input.process_type}`);
      // Fall back to quick reference
      const quickRef = this.getQuickReference(input.process_type);
      return {
        template_id: "quick-ref",
        template_name: `${input.process_type} Quick Reference`,
        process_type: input.process_type,
        suggested_sequence: quickRef.map((action, i) => ({ step_number: i + 1, action })),
        quick_reference: quickRef,
        rationale: "Using quick reference (no specific template match)",
        alternatives: [],
        confidence: 0.7,
        warnings,
      };
    }

    // Sort by confidence and complexity match
    const sorted = matching.sort((a, b) => {
      // Prefer complexity match
      if (input.part_complexity) {
        const aMatch = a.complexity === input.part_complexity ? 1 : 0;
        const bMatch = b.complexity === input.part_complexity ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      // Then by confidence
      return b.confidence - a.confidence;
    });

    const best = sorted[0];
    const alternatives = sorted.slice(1, 4);

    // Build rationale
    let rationale = `Using ${best.name} template`;
    if (best.source) {
      rationale += ` (source: ${best.source})`;
    }

    // Get quick reference for this process
    const quickRef = this.getQuickReference(input.process_type);

    return {
      template_id: best.id,
      template_name: best.name,
      process_type: best.process_type,
      suggested_sequence: best.steps,
      quick_reference: quickRef,
      rationale,
      alternatives,
      confidence: best.confidence,
      warnings,
    };
  }

  /**
   * Analyze gaps between provided operations and canonical template.
   */
  analyzeGaps(process_type: ProcessType, provided_operations: string[]): GapAnalysisResult {
    this.load();

    // Find canonical template
    const template = this.templates.find(t =>
      t.process_type === process_type && t.id.startsWith("canonical-")
    );

    if (!template) {
      return {
        template_id: "none",
        provided_operations,
        expected_steps: [],
        missing_steps: [],
        extra_steps: provided_operations,
        out_of_order: [],
        coverage_pct: 0,
        recommendations: [`No canonical template found for ${process_type}`],
      };
    }

    const expectedSteps = template.steps
      .filter(s => !s.optional)
      .map(s => s.action.toLowerCase());

    const providedLower = provided_operations.map(o => o.toLowerCase());

    // Find missing (fuzzy match)
    const missing: string[] = [];
    const matched: Map<string, number> = new Map();

    for (let i = 0; i < expectedSteps.length; i++) {
      const expected = expectedSteps[i];
      const matchIdx = providedLower.findIndex((p, j) =>
        !matched.has(p) && this.fuzzyMatch(expected, p)
      );
      if (matchIdx === -1) {
        missing.push(template.steps[i].action);
      } else {
        matched.set(providedLower[matchIdx], i);
      }
    }

    // Find extra operations
    const extra = provided_operations.filter((_, i) => !matched.has(providedLower[i]));

    // Check order
    const outOfOrder: Array<{ step: string; expected_position: number; actual_position: number }> = [];
    let lastExpectedPos = -1;
    for (let i = 0; i < providedLower.length; i++) {
      const expectedPos = matched.get(providedLower[i]);
      if (expectedPos !== undefined) {
        if (expectedPos < lastExpectedPos) {
          outOfOrder.push({
            step: provided_operations[i],
            expected_position: expectedPos + 1,
            actual_position: i + 1,
          });
        }
        lastExpectedPos = Math.max(lastExpectedPos, expectedPos);
      }
    }

    const coveragePct = Math.round((matched.size / expectedSteps.length) * 100);

    // Build recommendations
    const recommendations: string[] = [];
    if (missing.length > 0) {
      recommendations.push(`Missing steps: ${missing.join(", ")}`);
    }
    if (outOfOrder.length > 0) {
      recommendations.push(`Out of order: ${outOfOrder.map(o => o.step).join(", ")}`);
    }
    if (coveragePct < 80) {
      recommendations.push(`Coverage is ${coveragePct}% — review template for completeness`);
    }

    return {
      template_id: template.id,
      provided_operations,
      expected_steps: template.steps.map(s => s.action),
      missing_steps: missing,
      extra_steps: extra,
      out_of_order: outOfOrder,
      coverage_pct: coveragePct,
      recommendations,
    };
  }

  /**
   * Get all templates for a process type.
   */
  getTemplatesForProcess(process_type: ProcessType): WorkflowTemplate[] {
    this.load();
    return this.templates.filter(t => t.process_type === process_type);
  }

  /**
   * Get order of operations guides.
   */
  getOrderOfOperations(): OrderOfOperations[] {
    this.load();
    return this.orderOfOperations;
  }

  /**
   * Get quick reference for process type.
   */
  getQuickReference(process_type: ProcessType): string[] {
    this.load();

    if (!this.quickReference) {
      // Fall back to canonical template
      const template = this.templates.find(t =>
        t.process_type === process_type && t.id.startsWith("canonical-")
      );
      return template ? template.steps.map(s => s.action) : [];
    }

    switch (process_type) {
      case "die_design":
      case "mold_design":
      case "fixture_design":
        return this.quickReference.cad_complex_part || [];
      case "2d_milling":
        return this.quickReference.cam_2d_part || [];
      case "3d_milling":
        return this.quickReference.cam_3d_part || [];
      case "5axis_milling":
        return this.quickReference.cam_5axis_part || [];
      case "turning":
        return this.quickReference.cam_turning || this.templates.find(t => t.id === "canonical-cam-turning")?.steps.map(s => s.action) || [];
      case "mill_turn":
        return this.quickReference.cam_mill_turn || this.templates.find(t => t.id === "canonical-cam-mill-turn")?.steps.map(s => s.action) || [];
      default:
        return [];
    }
  }

  /**
   * Get all available process types.
   */
  getAvailableProcessTypes(): ProcessType[] {
    this.load();
    return [...new Set(this.templates.map(t => t.process_type))];
  }

  // ── Private helpers ─────────────────────────────────────────

  private inferProcessType(category: string, name: string): ProcessType | null {
    const lower = `${category} ${name}`.toLowerCase();

    if (lower.includes("5-axis") || lower.includes("5axis") || lower.includes("5x")) {
      return "5axis_milling";
    }
    if (lower.includes("3d") || lower.includes("freeform") || lower.includes("surface")) {
      return "3d_milling";
    }
    if (lower.includes("2d") || lower.includes("pocket") || lower.includes("contour")) {
      return "2d_milling";
    }
    if (lower.includes("turn") && lower.includes("mill")) {
      return "mill_turn";
    }
    if (lower.includes("turn") || lower.includes("lathe")) {
      return "turning";
    }
    if (lower.includes("wire") || lower.includes("wedm")) {
      return "wire_edm";
    }
    if (lower.includes("sinker") || lower.includes("sedm")) {
      return "sinker_edm";
    }
    if (lower.includes("grind")) {
      return "grinding";
    }
    if (lower.includes("die")) {
      return "die_design";
    }
    if (lower.includes("mold") || lower.includes("mould")) {
      return "mold_design";
    }
    if (lower.includes("fixture") || lower.includes("jig")) {
      return "fixture_design";
    }
    if (lower.includes("cad")) {
      return "die_design"; // Default CAD to die design for JM Die context
    }
    if (lower.includes("cam") || lower.includes("mill")) {
      return "2d_milling"; // Default CAM to 2D
    }

    return null;
  }

  private inferComplexity(stepCount: number): PartComplexity {
    if (stepCount <= 5) return "simple";
    if (stepCount <= 10) return "moderate";
    if (stepCount <= 15) return "complex";
    return "extreme";
  }

  private fuzzyMatch(expected: string, provided: string): boolean {
    // Direct substring match
    if (provided.includes(expected) || expected.includes(provided)) {
      return true;
    }

    // Key word matching
    const expectedWords = expected.split(/\s+/).filter(w => w.length > 3);
    const providedWords = provided.split(/\s+/).filter(w => w.length > 3);

    const matchCount = expectedWords.filter(ew =>
      providedWords.some(pw => pw.includes(ew) || ew.includes(pw))
    ).length;

    return matchCount >= Math.ceil(expectedWords.length * 0.5);
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const workflowTemplateEngine = new WorkflowTemplateEngine();
