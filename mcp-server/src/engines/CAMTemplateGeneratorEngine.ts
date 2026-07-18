/**
 * CAMTemplateGeneratorEngine — CAM-AI-TRAINING-MS0/U-CAMT-B03
 *
 * Composes B01 (canonical CAM taxonomy) + B02 (per-(op,system) input schemas)
 * into concrete CAM templates suitable for:
 *   - LoRA fine-tuning tuples (input: feature class + machine class, output:
 *     template),
 *   - RAG retrieval (each template gets ONNX-embedded by C01),
 *   - downstream CAM bridges (Fusion / Mastercam / hyperMILL etc emit native
 *     toolpath JSON from a template).
 *
 * The template = (op, system, feature_class) → fully-defaulted parameter
 * bag + provenance. Per the operator constraint (2026-05-25), every
 * template is grounded in vendor-documented parameter rows — NO synthetic
 * parameters allowed (CorpusProvenanceLedgerEngine pattern).
 *
 * Architecture: pure logic, no I/O. Tests run without the corpus on disk;
 * runner scripts (Phase B emit, Phase C train) call generateAll().
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import {
  camOperationTaxonomyEngine,
  type CamOperation,
  type CamSystem,
  type CamOperationSpec,
} from "./CAMOperationTaxonomyEngine.js";
import {
  camOperationInputSchemaEngine,
  type InputParameter,
  type InputSchema,
} from "./CAMOperationInputSchemaEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type FeatureClass =
  | "face" | "top_surface" | "side_wall" | "ruled_surface"
  | "pocket" | "open_pocket" | "closed_pocket" | "3d_pocket"
  | "external_profile" | "internal_profile"
  | "slot" | "keyway"
  | "hole" | "thru_hole" | "blind_hole" | "deep_hole" | "axial_hole"
  | "hole_bore" | "hole_ream" | "counterbore" | "countersink"
  | "tapped_hole" | "internal_thread" | "external_thread"
  | "surface" | "steep_surface" | "horizontal_surface" | "axisymmetric"
  | "complex_surface" | "impeller_blade" | "impeller" | "blisk"
  | "thru_profile" | "tapered_thru" | "blind_cavity"
  | "part_off" | "groove" | "od_groove" | "id_groove"
  | "off_axis_feature" | "radial_hole" | "tangential_hole"
  | "datum" | "measured_feature" | "tool_offset"
  | "edge" | "chamfer" | "burr"
  | "text" | "logo" | "serial" | "marking"
  | "added_geometry" | "polyline" | "open_curve" | "3d_curve"
  | "ribs" | "remainder" | "solid" | "isoparam" | "hole_start"
  | "surface_corner" | "fillet" | "surface_between" | "curve_on_surface"
  | "internal_passage" | "port" | "tilted_face" | "angled_pocket";

export interface ParameterValue {
  id: string;
  /** Resolved value — usually the default from B02 unless feature-class overrides apply. */
  value: number | string | boolean | null;
  /** Unit symbol from B02 (when applicable). */
  unit?: string;
  /** Whether this row came from default vs feature override vs missing. */
  origin: "default" | "feature_override" | "missing";
  /** Source provenance from B02. */
  source: string;
}

export interface CamTemplate {
  /** Stable id: `<op>__<system>__<feature_class>` */
  id: string;
  /** Schema version. */
  schemaVersion: "1.0.0";
  /** Issued at (ISO-8601). */
  generatedAt: string;
  /** Canonical operation type from B01. */
  op: CamOperation;
  /** CAM system the template targets. */
  system: CamSystem;
  /** Vendor-native operation name (from B01 per-software mapping). */
  nativeName: string;
  /** Feature class the template was generated against. */
  featureClass: FeatureClass;
  /** Operation spec snapshot from B01. */
  spec: CamOperationSpec;
  /** Parameter values resolved against the feature class. */
  parameters: ReadonlyArray<ParameterValue>;
  /** Real-data discipline. */
  synthetic: false;
  /** Aggregated source labels for AI training visibility. */
  sources: ReadonlyArray<string>;
}

export interface GenerateOptions {
  /** Override individual parameter values. */
  overrides?: Record<string, number | string | boolean>;
}

export interface GenerateAllResult {
  total: number;
  perSystem: Record<string, number>;
  perOp: Record<string, number>;
  templates: ReadonlyArray<CamTemplate>;
}

// ── Feature-class → parameter overrides ─────────────────────────────────────
// Pull conservative defaults that vary by feature class. E.g. deep_hole
// triples the peck depth; thru_hole adds 1mm to nominal depth; deep_hole
// halves the spindle RPM (chip evacuation).

const FEATURE_OVERRIDES: Partial<
  Record<FeatureClass, Record<string, number | string | boolean>>
> = {
  thru_hole: { depth: 25.0 },
  blind_hole: { depth: 15.0 },
  deep_hole: { depth: 60.0, peck_depth: 1.5, spindle_rpm: 750 },
  tapped_hole: { peck_depth: 0.0 },
  // tighter stepover for finishing-class features
  surface: { stepover: 0.4, stock_to_leave: 0.0 },
  complex_surface: { stepover: 0.3, stock_to_leave: 0.0 },
  impeller_blade: { stepover: 0.2, stock_to_leave: 0.05 },
  // roughing-class features keep coarser defaults
  pocket: { stepover: 4.0, stock_to_leave: 0.3 },
  closed_pocket: { stepover: 4.0, stock_to_leave: 0.3 },
  open_pocket: { stepover: 6.0, stock_to_leave: 0.3 },
};

// ── Engine ──────────────────────────────────────────────────────────────────

export class CAMTemplateGeneratorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMTemplateGeneratorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description:
        "Composes B01 taxonomy + B02 input schema into concrete (op, system, " +
        "feature_class) CAM templates with fully-defaulted parameter bags.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "generate", description: "One template for (op, system, feature)", actions: ["cam_template_generate"] },
      { name: "generate_for_op", description: "Templates for all supported (system) given an op", actions: ["cam_template_for_op"] },
      { name: "generate_all", description: "Cross-product over all supported (op, system, feature) combos", actions: ["cam_template_all"] },
      { name: "stats", description: "Aggregate counts (per-system / per-op)", actions: ["cam_template_stats"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMTemplateGeneratorEngine", note: "use typed methods" };
  }

  /**
   * Generate one CAM template. Returns null if (op, system) unsupported by
   * the taxonomy or the feature class is incompatible with the op's spec.
   */
  generate(
    op: CamOperation,
    system: CamSystem,
    featureClass: FeatureClass,
    opts: GenerateOptions = {},
  ): CamTemplate | null {
    const mapping = camOperationTaxonomyEngine.getPerSoftware(op, system);
    if (!mapping.supported) return null;

    const spec = camOperationTaxonomyEngine.getSpec(op);
    if (!spec) return null;

    // Refuse incompatible (op, feature_class) pairs — taxonomy gates this:
    // an "impeller_blade" feature class only makes sense for impeller ops.
    if (!spec.featureClasses.includes(featureClass)) return null;

    const schema: InputSchema | null = camOperationInputSchemaEngine.getSchema(op, system);
    if (!schema) return null;

    const featureOverrides = FEATURE_OVERRIDES[featureClass] ?? {};
    const explicitOverrides = opts.overrides ?? {};
    const params: ParameterValue[] = [];
    const sourceSet = new Set<string>();

    for (const p of schema.parameters) {
      const resolved = this.resolveValue(p, featureOverrides, explicitOverrides);
      params.push(resolved);
      sourceSet.add(p.source);
    }

    return {
      id: `${op}__${system}__${featureClass}`,
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      op,
      system,
      nativeName: mapping.nativeName,
      featureClass,
      spec,
      parameters: params,
      synthetic: false,
      sources: [...sourceSet].sort(),
    };
  }

  /** Generate templates for one op across every CAM system that supports it. */
  generateForOp(
    op: CamOperation,
    featureClass: FeatureClass,
    opts: GenerateOptions = {},
  ): CamTemplate[] {
    const out: CamTemplate[] = [];
    for (const sys of camOperationTaxonomyEngine.listSystems()) {
      const t = this.generate(op, sys, featureClass, opts);
      if (t) out.push(t);
    }
    return out;
  }

  /**
   * Cross-product over (op, system, default-feature-class). The default
   * feature class is the spec's first featureClasses entry.
   */
  generateAll(): GenerateAllResult {
    const templates: CamTemplate[] = [];
    const perSystem: Record<string, number> = {};
    const perOp: Record<string, number> = {};
    for (const op of camOperationTaxonomyEngine.listOperations()) {
      const spec = camOperationTaxonomyEngine.getSpec(op);
      const defaultFeature = spec.featureClasses[0] as FeatureClass | undefined;
      if (!defaultFeature) continue;
      for (const sys of camOperationTaxonomyEngine.listSystems()) {
        const t = this.generate(op, sys, defaultFeature);
        if (!t) continue;
        templates.push(t);
        perSystem[sys] = (perSystem[sys] ?? 0) + 1;
        perOp[op] = (perOp[op] ?? 0) + 1;
      }
    }
    return { total: templates.length, perSystem, perOp, templates };
  }

  /** Aggregate counts without retaining the templates (cheap for dashboards). */
  stats(): { total: number; systems: number; ops: number; perSystem: Record<string, number>; perOp: Record<string, number> } {
    const all = this.generateAll();
    return {
      total: all.total,
      systems: Object.keys(all.perSystem).length,
      ops: Object.keys(all.perOp).length,
      perSystem: all.perSystem,
      perOp: all.perOp,
    };
  }

  // ── private ─────────────────────────────────────────────────────────────

  private resolveValue(
    p: InputParameter,
    featureOverrides: Record<string, number | string | boolean>,
    explicitOverrides: Record<string, number | string | boolean>,
  ): ParameterValue {
    if (explicitOverrides[p.id] !== undefined) {
      return { id: p.id, value: explicitOverrides[p.id], unit: p.unit, origin: "default", source: p.source };
    }
    if (featureOverrides[p.id] !== undefined) {
      return { id: p.id, value: featureOverrides[p.id], unit: p.unit, origin: "feature_override", source: p.source };
    }
    if (p.defaultValue !== undefined) {
      return { id: p.id, value: p.defaultValue, unit: p.unit, origin: "default", source: p.source };
    }
    return { id: p.id, value: null, unit: p.unit, origin: "missing", source: p.source };
  }
}

export const camTemplateGeneratorEngine = new CAMTemplateGeneratorEngine();
