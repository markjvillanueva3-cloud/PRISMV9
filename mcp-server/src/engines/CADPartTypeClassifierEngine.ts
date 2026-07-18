/**
 * CADPartTypeClassifierEngine — CAM-AI-TRAINING-MS0/U-CAMT-PART-CLASSIFIER
 *
 * Classifies a CAD part into a high-level PartType (turbine_blade /
 * impeller / mold_block / fixture_plate / shaft / bracket / housing /
 * gear / spindle / fastener / die_section / electrode / sheet_metal /
 * casting_blank / forging_blank / weldment) from feature counts +
 * dimensions + material hints.
 *
 * Pure rule-table classifier. Returns a PartType + confidence + the
 * rules that fired. Confidence ≥ 0.7 = high; 0.4-0.7 = ambiguous;
 * < 0.4 = "unknown".
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { FeatureClass } from "./CAMFeatureClassClassifierEngine.js";

export type PartType =
  | "turbine_blade"
  | "impeller"
  | "mold_block"
  | "die_section"
  | "electrode"
  | "fixture_plate"
  | "sub_plate"
  | "shaft"
  | "bracket"
  | "housing"
  | "gear"
  | "spindle_holder"
  | "fastener"
  | "sheet_metal"
  | "casting_blank"
  | "forging_blank"
  | "weldment"
  | "tool_body"
  | "prismatic_block"
  | "unknown";

export interface PartContext {
  features: ReadonlyArray<FeatureClass>;
  /** Bounding box mm — used for shaft/block aspect-ratio heuristics. */
  bbox?: { x: number; y: number; z: number };
  /** Material spec from blueprint or CAD attribute. */
  materialHint?: string;
  /** Filename / part-number hint — text-matched against PART_NAME_HINTS. */
  partNameHint?: string;
}

export interface ClassificationResult {
  partType: PartType;
  confidence: number;
  rulesFired: ReadonlyArray<string>;
}

const PART_NAME_HINTS: Array<{ pattern: RegExp; partType: PartType; weight: number }> = [
  { pattern: /turbine[\s_-]?blade|airfoil/i, partType: "turbine_blade", weight: 0.9 },
  { pattern: /impeller|compressor[\s_-]?wheel/i, partType: "impeller", weight: 0.9 },
  { pattern: /mold[\s_-]?(block|core|cavity)|injection[\s_-]?mold/i, partType: "mold_block", weight: 0.85 },
  { pattern: /die[\s_-]?(section|insert)/i, partType: "die_section", weight: 0.85 },
  { pattern: /electrode|graphite[\s_-]?electrode/i, partType: "electrode", weight: 0.9 },
  { pattern: /fixture|jig|workhold/i, partType: "fixture_plate", weight: 0.7 },
  { pattern: /sub[\s_-]?plate|tooling[\s_-]?plate/i, partType: "sub_plate", weight: 0.8 },
  { pattern: /shaft|axle/i, partType: "shaft", weight: 0.85 },
  { pattern: /bracket|mount/i, partType: "bracket", weight: 0.7 },
  { pattern: /housing|enclosure|cover/i, partType: "housing", weight: 0.75 },
  { pattern: /(?:spur[\s_-]?gear|helical[\s_-]?gear|bevel[\s_-]?gear|worm[\s_-]?gear|gear[\s_-]?(?:wheel|tooth|set)|(?:^|[\s_-])gear(?:[\s_-]|$)|sprocket|pinion)/i, partType: "gear", weight: 0.85 },
  { pattern: /spindle[\s_-]?holder|tool[\s_-]?holder|chuck/i, partType: "spindle_holder", weight: 0.8 },
  { pattern: /bolt|screw|nut|fastener|stud/i, partType: "fastener", weight: 0.8 },
  { pattern: /sheet|stamping/i, partType: "sheet_metal", weight: 0.7 },
  { pattern: /casting/i, partType: "casting_blank", weight: 0.75 },
  { pattern: /forging/i, partType: "forging_blank", weight: 0.75 },
  { pattern: /weld(ed|ment)/i, partType: "weldment", weight: 0.7 },
  { pattern: /tool[\s_-]?body|mill[\s_-]?body|drill[\s_-]?body/i, partType: "tool_body", weight: 0.7 },
];

const FEATURE_TO_PARTTYPE: Partial<Record<FeatureClass, ReadonlyArray<{ partType: PartType; weight: number }>>> = {
  impeller_blade: [
    { partType: "impeller", weight: 0.9 },
    { partType: "turbine_blade", weight: 0.6 },
  ],
  ruled_surface: [
    { partType: "turbine_blade", weight: 0.5 },
    { partType: "mold_block", weight: 0.4 },
  ],
  external_profile: [
    { partType: "shaft", weight: 0.5 },
  ],
};

export class CADPartTypeClassifierEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADPartTypeClassifierEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Classifies CAD parts into high-level PartType (20 categories).",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "classify",  description: "Classify part → PartType",  actions: ["cad_part_classify"] },
      { name: "types",     description: "List PartType enum",        actions: ["cad_part_types"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CADPartTypeClassifierEngine", note: "use typed methods" };
  }

  classify(ctx: PartContext): ClassificationResult {
    const scores = new Map<PartType, number>();
    const rules: string[] = [];

    // Rule layer 1: part name pattern matching (strong signal).
    if (ctx.partNameHint) {
      for (const hint of PART_NAME_HINTS) {
        if (hint.pattern.test(ctx.partNameHint)) {
          this.addScore(scores, hint.partType, hint.weight);
          rules.push(`name-match:${hint.partType}`);
        }
      }
    }

    // Rule layer 2: feature classes.
    for (const f of ctx.features) {
      const mapped = FEATURE_TO_PARTTYPE[f];
      if (mapped) {
        for (const entry of mapped) {
          this.addScore(scores, entry.partType, entry.weight);
          rules.push(`feature-${f}:${entry.partType}`);
        }
      }
    }

    // Rule layer 3: shape heuristics (aspect ratio).
    if (ctx.bbox) {
      const { x, y, z } = ctx.bbox;
      const dims = [x, y, z].sort((a, b) => b - a);
      const aspect = dims[0] / Math.max(0.01, dims[2]);
      if (aspect > 8 && dims[0] > 50) {
        this.addScore(scores, "shaft", 0.4);
        rules.push("aspect-long:shaft");
      }
      const isCubic = aspect < 2;
      if (isCubic && dims[0] > 100) {
        this.addScore(scores, "prismatic_block", 0.45);
        rules.push("aspect-cubic:prismatic_block");
      }
    }

    // Rule layer 4: material hints.
    if (ctx.materialHint && /graphite/i.test(ctx.materialHint)) {
      this.addScore(scores, "electrode", 0.6);
      rules.push("material-graphite:electrode");
    }
    if (ctx.materialHint && /tool[\s_-]?steel|D-?2|A-?2|H-?13/i.test(ctx.materialHint)) {
      this.addScore(scores, "die_section", 0.4);
      this.addScore(scores, "mold_block", 0.3);
      rules.push("material-toolsteel:die/mold");
    }

    // Pick max.
    let best: PartType = "unknown";
    let bestScore = 0;
    for (const [pt, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        best = pt;
      }
    }
    return {
      partType: bestScore >= 0.4 ? best : "unknown",
      confidence: Math.min(1.0, bestScore),
      rulesFired: rules,
    };
  }

  types(): ReadonlyArray<PartType> {
    return [
      "turbine_blade", "impeller", "mold_block", "die_section", "electrode",
      "fixture_plate", "sub_plate", "shaft", "bracket", "housing",
      "gear", "spindle_holder", "fastener", "sheet_metal", "casting_blank",
      "forging_blank", "weldment", "tool_body", "prismatic_block", "unknown",
    ];
  }

  private addScore(scores: Map<PartType, number>, pt: PartType, w: number) {
    scores.set(pt, (scores.get(pt) ?? 0) + w);
  }
}

export const cadPartTypeClassifierEngine = new CADPartTypeClassifierEngine();
