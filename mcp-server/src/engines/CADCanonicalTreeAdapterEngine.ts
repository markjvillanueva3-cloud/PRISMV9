/**
 * CADCanonicalTreeAdapterEngine — CAD-REVERSE-ENGINEER-MS0/U2
 *
 * The missing link between the EXISTING 20,006-file ground-truth corpus
 * and the reverse-engineering engine. `GroundTruthFeatureTreeExtractor`
 * (CAD-GROUND-TRUTH-MS0) already normalizes every .FCStd / .f3d / STEP
 * file into a `CanonicalFeatureTree`; `CADReverseTemplateEngine` (U1)
 * categorizes + names + parameterizes a `CADOperation[]`. The two speak
 * different vocabularies — canonical types are `Extrude / Fillet / Hole`,
 * the draw-stack speaks `feature_extrude / feature_fillet / feature_hole`.
 * This engine translates between them.
 *
 *   cad_feature_tree_extract  (file → CanonicalFeatureTree)   ← exists
 *        │
 *        ▼  toOperations()        ← THIS ENGINE
 *   CADOperation[]
 *        │
 *        ▼  cadReverseTemplateEngine.reverseEngineer()        ← U1
 *   ReverseEngineeredTemplate (categorized, named, round-trip lossless)
 *
 * `reverseEngineerTree()` chains both steps so a corpus batch-driver
 * (U3) calls one method per file.
 *
 * **Honesty note on STEP files.** STEP carries BREP geometry with NO
 * construction history — `GroundTruthFeatureTreeExtractor` emits a
 * single `Body` feature for STEP-only input. A STEP part therefore
 * reverse-engineers to a `Body`-only op stream (which this adapter maps
 * to a single `boolean_union` placeholder). Rich op templates require
 * native authoring files (.FCStd timeline, .f3d timeline). That is a
 * property of the STEP format, not a gap in this engine.
 *
 * Pure: no I/O. Suppressed features are excluded (not in the active
 * model). Body / Component / Spreadsheet / Other are skipped with a
 * recorded reason. Unknown op kinds are skipped + warned rather than
 * emitting an invalid op.
 *
 * Refs: GroundTruthFeatureTreeExtractor (CAD-GROUND-TRUTH-MS0/U-CGT04 —
 * supplies CanonicalFeatureTree); CADReverseTemplateEngine (U1 — consumes
 * CADOperation[]); ICADCodeGenerator (CADOperation contract).
 */

import type {
  CanonicalFeatureTree,
  CanonicalFeature,
  CanonicalFeatureType,
} from "./GroundTruthFeatureTreeExtractor.js";
import type { CADOperation, CADOperationArgs } from "../interfaces/ICADCodeGenerator.js";
import {
  cadReverseTemplateEngine,
  CADReverseTemplateEngine,
  type ReverseEngineeredTemplate,
} from "./CADReverseTemplateEngine.js";

// ── Canonical type → CAD operation kind ──────────────────────────────────────

/**
 * Maps each canonical feature type to a draw-stack op kind. Types that
 * are not authoring operations (Body / Component / Spreadsheet / Other)
 * map to `null` → skipped with a recorded reason.
 */
const TYPE_TO_KIND: Record<CanonicalFeatureType, string | null> = {
  Sketch: "sketch_create",
  Extrude: "feature_extrude",
  Revolve: "feature_revolve",
  Sweep: "feature_sweep",
  Loft: "feature_loft",
  Fillet: "feature_fillet",
  Chamfer: "feature_chamfer",
  Hole: "feature_hole",
  Pattern: "feature_pattern_linear", // refined to _circular by sourceType heuristic
  Mirror: "feature_mirror",
  Shell: "feature_shell",
  Body: "boolean_union", // STEP single-body placeholder
  Component: null,
  Spreadsheet: null,
  Other: null,
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface SkippedFeature {
  id: string;
  type: string;
  reason: "non-authoring" | "suppressed" | "unknown-op-kind";
}

export interface AdaptResult {
  ops: CADOperation[];
  skipped: SkippedFeature[];
  warnings: string[];
  /** Count of features in the source tree (before filtering). */
  sourceFeatureCount: number;
}

export interface ReverseEngineerTreeResult {
  template: ReverseEngineeredTemplate;
  adapt: AdaptResult;
  sourceFile: string;
  sourceFormat: string;
}

export interface AdapterStats {
  totalTreesAdapted: number;
  totalOpsEmitted: number;
  totalFeaturesSkipped: number;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADCanonicalTreeAdapterEngine {
  private totalTreesAdapted = 0;
  private totalOpsEmitted = 0;
  private totalFeaturesSkipped = 0;

  /**
   * Translate a CanonicalFeatureTree into a draw-stack `CADOperation[]`.
   * Suppressed features and non-authoring types are filtered out; their
   * exclusion is recorded in `skipped`.
   */
  toOperations(tree: CanonicalFeatureTree): AdaptResult {
    if (!tree || typeof tree !== "object" || !Array.isArray(tree.features)) {
      throw new TypeError("toOperations: tree must be a CanonicalFeatureTree with a features array");
    }
    this.totalTreesAdapted++;

    const ops: CADOperation[] = [];
    const skipped: SkippedFeature[] = [];
    const warnings: string[] = [];

    for (const feat of tree.features) {
      if (!feat || typeof feat !== "object" || typeof feat.type !== "string") {
        warnings.push("dropped malformed feature (missing type)");
        continue;
      }
      if (feat.suppressed === true) {
        skipped.push({ id: feat.id, type: feat.type, reason: "suppressed" });
        continue;
      }
      const baseKind = TYPE_TO_KIND[feat.type as CanonicalFeatureType];
      if (baseKind === undefined) {
        // Type not in the canonical enum at all — defensive.
        skipped.push({ id: feat.id, type: feat.type, reason: "unknown-op-kind" });
        warnings.push(`feature ${feat.id}: unrecognized canonical type '${feat.type}'`);
        continue;
      }
      if (baseKind === null) {
        skipped.push({ id: feat.id, type: feat.type, reason: "non-authoring" });
        continue;
      }
      const kind = this.refineKind(baseKind, feat);
      if (!CADReverseTemplateEngine.isKnownOpKind(kind)) {
        skipped.push({ id: feat.id, type: feat.type, reason: "unknown-op-kind" });
        warnings.push(`feature ${feat.id}: '${kind}' not in the CAD operation vocabulary`);
        continue;
      }
      ops.push({
        kind: kind as CADOperation["kind"],
        args: this.paramsToArgs(feat.parameters),
        operationId: feat.id,
        description: feat.name,
      });
    }

    this.totalOpsEmitted += ops.length;
    this.totalFeaturesSkipped += skipped.length;

    return { ops, skipped, warnings, sourceFeatureCount: tree.features.length };
  }

  /**
   * One-call file→template path: adapt the tree then reverse-engineer it.
   * This is what the corpus batch-driver (U3) calls per file.
   */
  reverseEngineerTree(tree: CanonicalFeatureTree): ReverseEngineerTreeResult {
    const adapt = this.toOperations(tree);
    const template = cadReverseTemplateEngine.reverseEngineer(adapt.ops);
    return {
      template,
      adapt,
      sourceFile: tree.sourceFile,
      sourceFormat: tree.sourceFormat,
    };
  }

  /**
   * Pattern → linear/circular discrimination. The canonical type is just
   * "Pattern"; the source-format type string usually carries the axis
   * kind (FreeCAD "PartDesign::PolarPattern", Fusion "circular").
   */
  private refineKind(baseKind: string, feat: CanonicalFeature): string {
    if (baseKind !== "feature_pattern_linear") return baseKind;
    const src = (feat.sourceType ?? "").toLowerCase();
    if (src.includes("polar") || src.includes("circular") || src.includes("radial")) {
      return "feature_pattern_circular";
    }
    return "feature_pattern_linear";
  }

  /** CanonicalFeature.parameters → CADOperationArgs (scalar-compatible). */
  private paramsToArgs(parameters: CanonicalFeature["parameters"]): CADOperationArgs {
    const args: CADOperationArgs = {};
    if (!parameters || typeof parameters !== "object") return args;
    for (const [key, value] of Object.entries(parameters)) {
      // FeatureParameterSchema = number | string | boolean | null —
      // all assignable to CADOperationArgs scalar values.
      if (
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        value === null
      ) {
        args[key] = value;
      }
    }
    return args;
  }

  getStats(): AdapterStats {
    return {
      totalTreesAdapted: this.totalTreesAdapted,
      totalOpsEmitted: this.totalOpsEmitted,
      totalFeaturesSkipped: this.totalFeaturesSkipped,
    };
  }

  _resetForTests(): void {
    this.totalTreesAdapted = 0;
    this.totalOpsEmitted = 0;
    this.totalFeaturesSkipped = 0;
  }

  /** Exposed for the corpus driver / tests — the canonical→kind table. */
  static getTypeMapping(): Readonly<Record<string, string | null>> {
    return { ...TYPE_TO_KIND };
  }
}

export const cadCanonicalTreeAdapterEngine = new CADCanonicalTreeAdapterEngine();
