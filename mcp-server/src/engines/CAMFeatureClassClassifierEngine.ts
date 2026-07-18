/**
 * CAMFeatureClassClassifierEngine — CAM-AI-TRAINING-MS0/U-CAMT-FEATURE
 *
 * Given a textual description / GD&T callout / blueprint token, classify
 * it into the canonical FeatureClass enum used by B03 templates and
 * B-CLICK click sequences. Bridges the OCR/PMI-extraction stage (delta
 * pipeline) to the template stack (this MS).
 *
 * Pure rule-based classifier — token-pattern scoring. No ML inference.
 * This is the deterministic baseline; the LoRA-trained model layered on
 * top of CAMLoRADatasetBuilderEngine extends it.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { FeatureClass } from "./CAMTemplateGeneratorEngine.js";

interface FeatureRule {
  feature: FeatureClass;
  /** Lowercase tokens — any match scores +N points. */
  tokens: ReadonlyArray<string>;
  /** Higher weight for tokens that strongly imply the feature. */
  strongTokens?: ReadonlyArray<string>;
}

const RULES: ReadonlyArray<FeatureRule> = [
  { feature: "thru_hole",       tokens: ["through", "thru"], strongTokens: ["thru hole", "through hole"] },
  { feature: "blind_hole",      tokens: ["blind"], strongTokens: ["blind hole"] },
  { feature: "deep_hole",       tokens: ["deep"], strongTokens: ["deep hole", "gun drill"] },
  { feature: "tapped_hole",     tokens: ["tap", "thread", "unc", "unf", "iso", "m6", "m8", "m10"], strongTokens: ["tapped hole", "thread mill", "rigid tap"] },
  { feature: "counterbore",     tokens: ["c'bore", "cbore"], strongTokens: ["counterbore"] },
  { feature: "countersink",     tokens: ["c'sink", "csk"], strongTokens: ["countersink"] },
  { feature: "hole_bore",       tokens: ["bore"], strongTokens: ["bore cycle", "boring bar"] },
  { feature: "hole_ream",       tokens: ["ream"], strongTokens: ["ream cycle"] },
  { feature: "hole",            tokens: ["hole", "drill"], strongTokens: ["drilled hole"] },
  { feature: "pocket",          tokens: ["pocket", "cavity"] },
  { feature: "open_pocket",     tokens: ["open pocket"], strongTokens: ["open pocket"] },
  { feature: "slot",            tokens: ["slot", "keyway"] },
  { feature: "external_thread", tokens: ["external thread", "od thread"] },
  { feature: "internal_thread", tokens: ["internal thread", "id thread"] },
  { feature: "external_profile",tokens: ["outside profile", "external profile", "od"] },
  { feature: "internal_profile",tokens: ["inside profile", "internal profile", "id"] },
  { feature: "ruled_surface",   tokens: ["ruled", "swarf"], strongTokens: ["ruled surface"] },
  { feature: "impeller_blade",  tokens: ["impeller", "blade"], strongTokens: ["impeller blade"] },
  { feature: "blisk",           tokens: ["blisk"] },
  { feature: "face",            tokens: ["face", "top surface"] },
  { feature: "side_wall",       tokens: ["side wall", "wall"] },
  { feature: "chamfer",         tokens: ["chamfer"] },
  { feature: "edge",            tokens: ["edge break", "deburr"] },
  { feature: "groove",          tokens: ["groove"] },
  { feature: "part_off",        tokens: ["part off", "cutoff", "parting"] },
  { feature: "thru_profile",    tokens: ["wire edm"], strongTokens: ["thru profile", "wire edm cut"] },
  { feature: "surface",         tokens: ["surface", "finish"] },
];

export interface ClassificationResult {
  feature: FeatureClass | null;
  score: number;
  alternatives: Array<{ feature: FeatureClass; score: number }>;
  matchedTokens: string[];
}

export class CAMFeatureClassClassifierEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMFeatureClassClassifierEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Token-rule feature-class classifier — text → canonical FeatureClass.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "classify",     description: "Classify a description into a FeatureClass", actions: ["cam_feature_classify"] },
      { name: "list_rules",   description: "All token rules currently registered",       actions: ["cam_feature_rules"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMFeatureClassClassifierEngine", note: "use typed methods" };
  }

  /** Classify a description / callout into the best-scoring FeatureClass. */
  classify(description: string): ClassificationResult {
    const text = (description ?? "").toLowerCase();
    if (!text.trim()) return { feature: null, score: 0, alternatives: [], matchedTokens: [] };
    const scores = new Map<FeatureClass, number>();
    const matched = new Set<string>();
    for (const rule of RULES) {
      let s = 0;
      for (const tok of rule.tokens) {
        if (text.includes(tok)) {
          s += 1;
          matched.add(tok);
        }
      }
      for (const tok of rule.strongTokens ?? []) {
        if (text.includes(tok)) {
          s += 3;
          matched.add(tok);
        }
      }
      if (s > 0) scores.set(rule.feature, (scores.get(rule.feature) ?? 0) + s);
    }
    if (scores.size === 0) return { feature: null, score: 0, alternatives: [], matchedTokens: [] };
    const ranked = [...scores.entries()]
      .map(([feature, score]) => ({ feature, score }))
      .sort((a, b) => b.score - a.score);
    return {
      feature: ranked[0].feature,
      score: ranked[0].score,
      alternatives: ranked.slice(1, 4),
      matchedTokens: [...matched],
    };
  }

  /** Return the full rule set (for documentation / dispatcher introspection). */
  listRules(): ReadonlyArray<FeatureRule> {
    return RULES;
  }
}

export const camFeatureClassClassifierEngine = new CAMFeatureClassClassifierEngine();
