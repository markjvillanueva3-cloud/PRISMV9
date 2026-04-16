/**
 * TribalKnowledgeTrainingEngine — Deep Tribal Wisdom Integration for AI Training
 * ================================================================================
 * This engine deeply incorporates ALL tribal knowledge (3,700+ tips, 296 playbook
 * rules) into the AI training process. It provides:
 *
 *   1. Training data extraction from tribal tips and playbook rules
 *   2. Pattern validation against accumulated shop floor wisdom
 *   3. Anti-pattern detection using playbook rules
 *   4. Context-aware recommendation augmentation
 *   5. Continuous learning from validated tribal patterns
 *
 * Knowledge Sources:
 *   - TribalKnowledgeEngine: 3,700+ tips from 18 CAM systems
 *   - MachiningPlaybookEngine: 296 rules across 40+ categories
 *   - Controller-specific tips (Fanuc, Siemens, Haas, Okuma, Mazak)
 *   - CAM-specific tips (Mastercam, Fusion360, hyperMILL, SolidCAM, etc.)
 *   - WEDM-specific knowledge
 *   - Document-learned tips from PDF extraction
 *
 * Training Integration:
 *   - Converts tips to neural network training patterns
 *   - Extracts feature vectors from playbook conditions
 *   - Builds anti-pattern classifiers from rule exceptions
 *   - Creates contextual embeddings for semantic search
 *
 * @module engines/TribalKnowledgeTrainingEngine
 */

import { log } from "../utils/Logger.js";
import { tribalKnowledgeEngine, KnowledgeTip, KnowledgeCategory, KnowledgeType, KnowledgeDomain } from "./TribalKnowledgeEngine.js";
import { machiningPlaybookEngine, PlaybookRule, RuleCategory, Severity } from "./MachiningPlaybookEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingPattern {
  id: string;
  source_type: "tribal_tip" | "playbook_rule" | "playbook_antipattern";
  category: string;
  subcategory?: string;
  domain?: string;

  /** The core knowledge pattern */
  pattern: string;

  /** Detailed explanation/reasoning */
  reasoning?: string;

  /** Conditions when this applies (from playbook) */
  applicability_conditions: string[];

  /** When NOT to apply (exceptions, anti-patterns) */
  contraindications: string[];

  /** Material groups this applies to */
  material_groups: string[];

  /** Operation types this applies to */
  operation_types: string[];

  /** Machine/controller specificity */
  machine_ids: string[];

  /** Original source reference */
  source: string;

  /** Confidence/severity weighting */
  weight: number;

  /** Keywords for semantic matching */
  keywords: string[];

  /** Feature vector for ML (numeric representation) */
  feature_vector: number[];
}

export interface TrainingDataset {
  patterns: TrainingPattern[];
  anti_patterns: TrainingPattern[];
  category_index: Map<string, TrainingPattern[]>;
  material_index: Map<string, TrainingPattern[]>;
  operation_index: Map<string, TrainingPattern[]>;
  keyword_index: Map<string, TrainingPattern[]>;
  stats: TrainingStats;
}

export interface TrainingStats {
  total_patterns: number;
  total_anti_patterns: number;
  tips_processed: number;
  rules_processed: number;
  categories_covered: string[];
  domains_covered: string[];
  material_groups_covered: string[];
  operation_types_covered: string[];
  avg_confidence: number;
  high_confidence_count: number;
  training_timestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  matching_patterns: TrainingPattern[];
  violated_anti_patterns: TrainingPattern[];
  warnings: string[];
  suggestions: string[];
  tribal_wisdom: string[];
}

export interface RecommendationContext {
  material?: string;
  material_iso?: string;
  operation?: string;
  machine_id?: string;
  controller?: string;
  tolerance_mm?: number;
  surface_finish_ra?: number;
  wall_thickness_mm?: number;
  depth_ratio?: number;
  hardness_hrc?: number;
  keywords?: string[];
}

export interface EnhancedRecommendation {
  original_recommendation: string;
  tribal_validations: string[];
  playbook_rules_applied: string[];
  anti_patterns_avoided: string[];
  confidence_boost: number;
  warnings: string[];
  senior_machinist_says: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Category weights for training prioritization */
const CATEGORY_WEIGHTS: Record<string, number> = {
  // Critical categories (weight 1.0)
  safety: 1.0,
  anti_pattern: 1.0,
  sequencing: 0.95,
  datum: 0.95,

  // Important categories (weight 0.8-0.9)
  tooling: 0.9,
  speeds_feeds: 0.9,
  fixturing: 0.85,
  thin_wall: 0.85,
  threading: 0.85,
  hole_making: 0.85,

  // Standard categories (weight 0.6-0.8)
  surface_finish: 0.8,
  roughing: 0.8,
  finishing: 0.8,
  tool_selection: 0.75,
  material_tip: 0.75,
  workholding: 0.75,
  chip_control: 0.7,
  thermal: 0.7,
  coolant_strategy: 0.7,

  // Specialized (weight 0.5-0.7)
  "5axis": 0.7,
  grinding: 0.65,
  turning: 0.65,
  edm: 0.65,
  adaptive: 0.65,
  hsm: 0.65,

  // Default
  general: 0.5,
};

/** Severity to weight mapping */
const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 1.0,
  important: 0.8,
  recommended: 0.6,
  tip: 0.4,
};

/** Knowledge type weights */
const KNOWLEDGE_TYPE_WEIGHTS: Record<string, number> = {
  anti_pattern: 1.0,
  failure_mode: 0.95,
  rule: 0.9,
  correction: 0.85,
  workaround: 0.8,
  machine_quirk: 0.8,
  post_quirk: 0.8,
  heuristic: 0.7,
  setup_lesson: 0.7,
  tip: 0.6,
  quote_correction: 0.5,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TribalKnowledgeTrainingEngine {
  private dataset: TrainingDataset | null = null;
  private lastTraining: Date | null = null;
  private trainingVersion = 0;

  /**
   * Build the full training dataset from tribal tips and playbook rules.
   * This is the main training method that extracts all patterns.
   */
  buildTrainingDataset(): TrainingDataset {
    const startTime = Date.now();
    log.info("[TribalTraining] Building training dataset from tribal knowledge...");

    const patterns: TrainingPattern[] = [];
    const antiPatterns: TrainingPattern[] = [];

    // ---- PHASE 1: Extract patterns from tribal tips ----
    const allTips = this.getAllTribalTips();
    log.info(`[TribalTraining] Processing ${allTips.length} tribal tips...`);

    for (const tip of allTips) {
      const pattern = this.tipToTrainingPattern(tip);
      if (pattern.source_type === "playbook_antipattern" ||
          tip.knowledge_type === "anti_pattern" ||
          tip.knowledge_type === "failure_mode") {
        antiPatterns.push(pattern);
      } else {
        patterns.push(pattern);
      }
    }

    // ---- PHASE 2: Extract patterns from playbook rules ----
    const allRules = this.getAllPlaybookRules();
    log.info(`[TribalTraining] Processing ${allRules.length} playbook rules...`);

    for (const rule of allRules) {
      const rulePatterns = this.ruleToTrainingPatterns(rule);
      for (const p of rulePatterns) {
        if (p.source_type === "playbook_antipattern") {
          antiPatterns.push(p);
        } else {
          patterns.push(p);
        }
      }
    }

    // ---- PHASE 3: Build indexes for fast lookup ----
    const categoryIndex = new Map<string, TrainingPattern[]>();
    const materialIndex = new Map<string, TrainingPattern[]>();
    const operationIndex = new Map<string, TrainingPattern[]>();
    const keywordIndex = new Map<string, TrainingPattern[]>();

    const allPatterns = [...patterns, ...antiPatterns];

    for (const p of allPatterns) {
      // Category index
      if (!categoryIndex.has(p.category)) {
        categoryIndex.set(p.category, []);
      }
      categoryIndex.get(p.category)!.push(p);

      // Material index
      for (const mat of p.material_groups) {
        if (!materialIndex.has(mat)) {
          materialIndex.set(mat, []);
        }
        materialIndex.get(mat)!.push(p);
      }

      // Operation index
      for (const op of p.operation_types) {
        if (!operationIndex.has(op)) {
          operationIndex.set(op, []);
        }
        operationIndex.get(op)!.push(p);
      }

      // Keyword index
      for (const kw of p.keywords) {
        const kwLower = kw.toLowerCase();
        if (!keywordIndex.has(kwLower)) {
          keywordIndex.set(kwLower, []);
        }
        keywordIndex.get(kwLower)!.push(p);
      }
    }

    // ---- PHASE 4: Compute statistics ----
    const categoriesSet = new Set<string>();
    const domainsSet = new Set<string>();
    const materialsSet = new Set<string>();
    const operationsSet = new Set<string>();
    let totalWeight = 0;
    let highConfCount = 0;

    for (const p of allPatterns) {
      categoriesSet.add(p.category);
      if (p.domain) domainsSet.add(p.domain);
      for (const m of p.material_groups) materialsSet.add(m);
      for (const o of p.operation_types) operationsSet.add(o);
      totalWeight += p.weight;
      if (p.weight >= 0.8) highConfCount++;
    }

    const stats: TrainingStats = {
      total_patterns: patterns.length,
      total_anti_patterns: antiPatterns.length,
      tips_processed: allTips.length,
      rules_processed: allRules.length,
      categories_covered: [...categoriesSet],
      domains_covered: [...domainsSet],
      material_groups_covered: [...materialsSet],
      operation_types_covered: [...operationsSet],
      avg_confidence: allPatterns.length > 0 ? totalWeight / allPatterns.length : 0,
      high_confidence_count: highConfCount,
      training_timestamp: new Date().toISOString(),
    };

    this.dataset = {
      patterns,
      anti_patterns: antiPatterns,
      category_index: categoryIndex,
      material_index: materialIndex,
      operation_index: operationIndex,
      keyword_index: keywordIndex,
      stats,
    };

    this.lastTraining = new Date();
    this.trainingVersion++;

    const elapsed = Date.now() - startTime;
    log.info(`[TribalTraining] Dataset built in ${elapsed}ms: ${patterns.length} patterns, ${antiPatterns.length} anti-patterns`);

    return this.dataset;
  }

  /**
   * Get all tribal tips from the engine.
   */
  private getAllTribalTips(): KnowledgeTip[] {
    // Access the engine's tips via search with no filters (returns all)
    const searchResult = tribalKnowledgeEngine.search({
      limit: 10000,  // Get all
      min_confidence: 0,  // No confidence filter
    });
    return searchResult.tips;
  }

  /**
   * Get all playbook rules.
   */
  private getAllPlaybookRules(): PlaybookRule[] {
    // Use advise with no filters to get all rules
    const result = machiningPlaybookEngine.advise({});
    return result.rules;
  }

  /**
   * Convert a tribal tip to a training pattern.
   */
  private tipToTrainingPattern(tip: KnowledgeTip): TrainingPattern {
    const isAntiPattern = tip.knowledge_type === "anti_pattern" ||
                          tip.knowledge_type === "failure_mode" ||
                          tip.title.toLowerCase().includes("never") ||
                          tip.title.toLowerCase().includes("don't") ||
                          tip.body.toLowerCase().includes("avoid");

    const categoryWeight = CATEGORY_WEIGHTS[tip.category] ?? CATEGORY_WEIGHTS.general;
    const typeWeight = KNOWLEDGE_TYPE_WEIGHTS[tip.knowledge_type ?? "tip"] ?? 0.6;
    const confidenceWeight = (tip.confidence ?? 70) / 100;

    // Extract keywords from title and body
    const keywords = this.extractKeywords(tip.title + " " + tip.body);

    // Build feature vector (simplified for now)
    const featureVector = this.buildFeatureVector(tip);

    return {
      id: `tip_${tip.id}`,
      source_type: isAntiPattern ? "playbook_antipattern" : "tribal_tip",
      category: tip.category,
      subcategory: tip.subcategory,
      domain: tip.domain,
      pattern: tip.body,
      reasoning: undefined,  // Tips don't have separate reasoning
      applicability_conditions: this.extractConditions(tip),
      contraindications: [],  // Tips don't usually have explicit contraindications
      material_groups: tip.material_groups ?? [],
      operation_types: tip.operation_types ?? [],
      machine_ids: tip.machine_ids ?? [],
      source: tip.source,
      weight: categoryWeight * typeWeight * confidenceWeight,
      keywords,
      feature_vector: featureVector,
    };
  }

  /**
   * Convert a playbook rule to training patterns.
   * May produce multiple patterns (one for the rule, one for each exception as anti-pattern).
   */
  private ruleToTrainingPatterns(rule: PlaybookRule): TrainingPattern[] {
    const patterns: TrainingPattern[] = [];

    const isAntiPattern = rule.category === "anti_pattern";
    const categoryWeight = CATEGORY_WEIGHTS[rule.category] ?? CATEGORY_WEIGHTS.general;
    const severityWeight = SEVERITY_WEIGHTS[rule.severity];

    // Extract keywords
    const keywords = this.extractKeywords(rule.title + " " + rule.rule + " " + rule.reasoning);

    // Extract material groups from conditions
    const materialGroups = this.extractMaterialGroupsFromConditions(rule.conditions);
    const operationTypes = this.extractOperationTypesFromConditions(rule.conditions);

    // Build feature vector
    const featureVector = this.buildFeatureVectorFromRule(rule);

    // Main rule pattern
    patterns.push({
      id: `rule_${rule.id}`,
      source_type: isAntiPattern ? "playbook_antipattern" : "playbook_rule",
      category: rule.category,
      subcategory: undefined,
      domain: undefined,
      pattern: rule.rule,
      reasoning: rule.reasoning,
      applicability_conditions: this.conditionsToStrings(rule.conditions),
      contraindications: rule.exceptions,
      material_groups: materialGroups,
      operation_types: operationTypes,
      machine_ids: [],
      source: rule.source,
      weight: categoryWeight * severityWeight,
      keywords,
      feature_vector: featureVector,
    });

    // Each exception becomes a "when to break the rule" pattern
    for (let i = 0; i < rule.exceptions.length; i++) {
      patterns.push({
        id: `rule_${rule.id}_exception_${i}`,
        source_type: "playbook_rule",
        category: rule.category,
        subcategory: "exception",
        domain: undefined,
        pattern: `EXCEPTION to ${rule.title}: ${rule.exceptions[i]}`,
        reasoning: `This is an exception to the rule "${rule.rule}"`,
        applicability_conditions: [],
        contraindications: [],
        material_groups: materialGroups,
        operation_types: operationTypes,
        machine_ids: [],
        source: rule.source,
        weight: categoryWeight * severityWeight * 0.7,  // Exceptions have slightly lower weight
        keywords: [...keywords, "exception"],
        feature_vector: featureVector,
      });
    }

    return patterns;
  }

  /**
   * Extract keywords from text for indexing.
   */
  private extractKeywords(text: string): string[] {
    // Common machining terms to extract
    const keywordPatterns = [
      // Materials
      /\b(steel|aluminum|titanium|inconel|brass|copper|carbide|d2|m2|s7|a2|h13|4140|304|316|6061|7075)\b/gi,
      // Operations
      /\b(rough|finish|face|drill|bore|tap|ream|mill|turn|grind|edm|thread|chamfer|deburr)\b/gi,
      // Tools
      /\b(endmill|insert|drill|tap|reamer|boring bar|face mill|ball nose|bull nose)\b/gi,
      // Parameters
      /\b(speed|feed|rpm|sfm|ipm|doc|woc|chipload|mrr|torque|power)\b/gi,
      // Concepts
      /\b(tolerance|surface|deflection|chatter|vibration|coolant|chip|burr|datum)\b/gi,
      // CAM/Controller
      /\b(mastercam|fusion|hypermill|fanuc|siemens|haas|okuma|mazak)\b/gi,
    ];

    const keywords = new Set<string>();
    for (const pattern of keywordPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const m of matches) {
          keywords.add(m.toLowerCase());
        }
      }
    }

    return [...keywords];
  }

  /**
   * Build a numeric feature vector from a tip.
   */
  private buildFeatureVector(tip: KnowledgeTip): number[] {
    // Simple feature vector: [category_encoded, confidence, has_material, has_operation, has_machine]
    const categoryIndex = Object.keys(CATEGORY_WEIGHTS).indexOf(tip.category);
    return [
      categoryIndex >= 0 ? categoryIndex / Object.keys(CATEGORY_WEIGHTS).length : 0.5,
      (tip.confidence ?? 70) / 100,
      (tip.material_groups?.length ?? 0) > 0 ? 1 : 0,
      (tip.operation_types?.length ?? 0) > 0 ? 1 : 0,
      (tip.machine_ids?.length ?? 0) > 0 ? 1 : 0,
    ];
  }

  /**
   * Build a numeric feature vector from a rule.
   */
  private buildFeatureVectorFromRule(rule: PlaybookRule): number[] {
    const categoryIndex = Object.keys(CATEGORY_WEIGHTS).indexOf(rule.category);
    const severityIndex = ["tip", "recommended", "important", "critical"].indexOf(rule.severity);
    return [
      categoryIndex >= 0 ? categoryIndex / Object.keys(CATEGORY_WEIGHTS).length : 0.5,
      severityIndex >= 0 ? severityIndex / 4 : 0.5,
      rule.conditions.length > 0 ? 1 : 0,
      rule.exceptions.length > 0 ? 1 : 0,
      rule.related_rules?.length ?? 0 > 0 ? 1 : 0,
    ];
  }

  /**
   * Extract conditions from a tip as strings.
   */
  private extractConditions(tip: KnowledgeTip): string[] {
    const conditions: string[] = [];
    if (tip.material_groups?.length) {
      conditions.push(`Material: ${tip.material_groups.join(", ")}`);
    }
    if (tip.operation_types?.length) {
      conditions.push(`Operation: ${tip.operation_types.join(", ")}`);
    }
    if (tip.machine_ids?.length) {
      conditions.push(`Machine: ${tip.machine_ids.join(", ")}`);
    }
    if (tip.workholding_type) {
      conditions.push(`Workholding: ${tip.workholding_type}`);
    }
    return conditions;
  }

  /**
   * Convert playbook conditions to readable strings.
   */
  private conditionsToStrings(conditions: PlaybookRule["conditions"]): string[] {
    return conditions.map(c => {
      switch (c.type) {
        case "always": return "Always applies";
        case "material_iso": return `Material ISO groups: ${(c as { groups: string[] }).groups.join(", ")}`;
        case "feature_present": return `Features present: ${(c as { features: string[] }).features.join(", ")}`;
        case "tolerance_below": return `Tolerance < ${(c as { threshold_mm: number }).threshold_mm}mm`;
        case "wall_thickness_below": return `Wall thickness < ${(c as { threshold_mm: number }).threshold_mm}mm`;
        case "depth_ratio_above": return `L/D ratio > ${(c as { ld_ratio: number }).ld_ratio}`;
        case "surface_finish_below": return `Surface finish Ra < ${(c as { ra_um: number }).ra_um}um`;
        case "batch_size_above": return `Batch size > ${(c as { count: number }).count}`;
        case "machine_axes": return `Machine axes >= ${(c as { min_axes: number }).min_axes}`;
        case "operation_type": return `Operation: ${(c as { operations: string[] }).operations.join(", ")}`;
        case "hardness_above": return `Hardness > ${(c as { hrc: number }).hrc} HRC`;
        default: return JSON.stringify(c);
      }
    });
  }

  /**
   * Extract material groups from conditions.
   */
  private extractMaterialGroupsFromConditions(conditions: PlaybookRule["conditions"]): string[] {
    const groups: string[] = [];
    for (const c of conditions) {
      if (c.type === "material_iso") {
        groups.push(...(c as { groups: string[] }).groups);
      }
    }
    return groups;
  }

  /**
   * Extract operation types from conditions.
   */
  private extractOperationTypesFromConditions(conditions: PlaybookRule["conditions"]): string[] {
    const ops: string[] = [];
    for (const c of conditions) {
      if (c.type === "operation_type") {
        ops.push(...(c as { operations: string[] }).operations);
      }
      if (c.type === "feature_present") {
        ops.push(...(c as { features: string[] }).features);
      }
    }
    return ops;
  }

  // ==========================================================================
  // VALIDATION & RECOMMENDATION METHODS
  // ==========================================================================

  /**
   * Validate a proposed action/parameter against tribal knowledge.
   * Returns whether it aligns with shop floor wisdom.
   */
  validateAgainstTribalKnowledge(
    context: RecommendationContext,
    proposedAction: string
  ): ValidationResult {
    if (!this.dataset) {
      this.buildTrainingDataset();
    }

    const matchingPatterns: TrainingPattern[] = [];
    const violatedAntiPatterns: TrainingPattern[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const tribalWisdom: string[] = [];

    // Find relevant patterns by context
    const relevantPatterns = this.findRelevantPatterns(context);
    const proposedLower = proposedAction.toLowerCase();

    for (const pattern of relevantPatterns) {
      // Check if the proposed action aligns with the pattern
      const patternKeywords = pattern.keywords;
      const matchCount = patternKeywords.filter(kw => proposedLower.includes(kw)).length;

      if (matchCount > 0) {
        if (pattern.source_type === "playbook_antipattern") {
          // Check if violating an anti-pattern
          const violationScore = matchCount / patternKeywords.length;
          if (violationScore > 0.3) {
            violatedAntiPatterns.push(pattern);
            warnings.push(`WARNING: ${pattern.pattern.substring(0, 100)}...`);
          }
        } else {
          matchingPatterns.push(pattern);
          tribalWisdom.push(pattern.pattern);
        }
      }
    }

    // Check for contraindications
    for (const pattern of matchingPatterns) {
      for (const contra of pattern.contraindications) {
        if (proposedLower.includes(contra.toLowerCase())) {
          warnings.push(`Contraindication: ${contra}`);
        }
      }
    }

    // Generate suggestions from high-weight patterns
    const topPatterns = relevantPatterns
      .filter(p => p.source_type !== "playbook_antipattern")
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    for (const p of topPatterns) {
      if (!matchingPatterns.includes(p)) {
        suggestions.push(`Consider: ${p.pattern.substring(0, 80)}...`);
      }
    }

    const totalWeight = matchingPatterns.reduce((sum, p) => sum + p.weight, 0);
    const violationWeight = violatedAntiPatterns.reduce((sum, p) => sum + p.weight, 0);
    const confidence = matchingPatterns.length > 0
      ? Math.min(1, totalWeight / matchingPatterns.length) * (1 - violationWeight * 0.5)
      : 0.5;

    return {
      valid: violatedAntiPatterns.length === 0,
      confidence,
      matching_patterns: matchingPatterns,
      violated_anti_patterns: violatedAntiPatterns,
      warnings,
      suggestions,
      tribal_wisdom: tribalWisdom.slice(0, 5),
    };
  }

  /**
   * Enhance a recommendation with tribal knowledge validation.
   */
  enhanceRecommendation(
    context: RecommendationContext,
    originalRecommendation: string
  ): EnhancedRecommendation {
    const validation = this.validateAgainstTribalKnowledge(context, originalRecommendation);

    // Find playbook rules that apply
    const playbookRules = validation.matching_patterns
      .filter(p => p.source_type === "playbook_rule")
      .map(p => `${p.id}: ${p.pattern.substring(0, 60)}...`);

    // Find anti-patterns avoided
    const antiPatternsAvoided = this.findAvoindedAntiPatterns(context, originalRecommendation);

    // Generate senior machinist wisdom
    const seniorMachinistSays = this.generateSeniorMachinistSays(context, validation);

    return {
      original_recommendation: originalRecommendation,
      tribal_validations: validation.tribal_wisdom,
      playbook_rules_applied: playbookRules,
      anti_patterns_avoided: antiPatternsAvoided.map(p => p.pattern.substring(0, 60) + "..."),
      confidence_boost: validation.valid ? 0.1 : -0.2,
      warnings: validation.warnings,
      senior_machinist_says: seniorMachinistSays,
    };
  }

  /**
   * Find patterns relevant to a given context.
   */
  private findRelevantPatterns(context: RecommendationContext): TrainingPattern[] {
    if (!this.dataset) {
      this.buildTrainingDataset();
    }

    const relevant = new Set<TrainingPattern>();

    // Search by material
    if (context.material) {
      const matPatterns = this.dataset!.material_index.get(context.material.toLowerCase()) ?? [];
      for (const p of matPatterns) relevant.add(p);
    }

    // Search by material ISO
    if (context.material_iso) {
      const isoPatterns = this.dataset!.material_index.get(context.material_iso) ?? [];
      for (const p of isoPatterns) relevant.add(p);
    }

    // Search by operation
    if (context.operation) {
      const opPatterns = this.dataset!.operation_index.get(context.operation.toLowerCase()) ?? [];
      for (const p of opPatterns) relevant.add(p);
    }

    // Search by keywords
    if (context.keywords) {
      for (const kw of context.keywords) {
        const kwPatterns = this.dataset!.keyword_index.get(kw.toLowerCase()) ?? [];
        for (const p of kwPatterns) relevant.add(p);
      }
    }

    // If no specific filters, return top patterns by weight
    if (relevant.size === 0) {
      return [...this.dataset!.patterns, ...this.dataset!.anti_patterns]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 50);
    }

    return [...relevant];
  }

  /**
   * Find anti-patterns that the recommendation correctly avoids.
   */
  private findAvoindedAntiPatterns(
    context: RecommendationContext,
    recommendation: string
  ): TrainingPattern[] {
    if (!this.dataset) return [];

    const relevantAntiPatterns = this.dataset.anti_patterns.filter(ap => {
      // Check if anti-pattern is relevant to context
      if (context.material && ap.material_groups.length > 0) {
        if (!ap.material_groups.some(m =>
          m.toLowerCase().includes(context.material!.toLowerCase()))) {
          return false;
        }
      }
      return true;
    });

    // Return anti-patterns that the recommendation does NOT violate
    const recLower = recommendation.toLowerCase();
    return relevantAntiPatterns.filter(ap => {
      // Check if recommendation contains anti-pattern keywords
      const violates = ap.keywords.some(kw => recLower.includes(kw));
      return !violates;
    });
  }

  /**
   * Generate "senior machinist says" wisdom based on context.
   */
  private generateSeniorMachinistSays(
    context: RecommendationContext,
    validation: ValidationResult
  ): string {
    // Get top tribal wisdom
    if (validation.tribal_wisdom.length > 0) {
      return `Senior machinists say: "${validation.tribal_wisdom[0]}"`;
    }

    // Generate context-specific wisdom
    if (context.wall_thickness_mm && context.wall_thickness_mm < 2) {
      return "Senior machinists say: \"Thin walls need love — light cuts, sharp tools, and patience.\"";
    }
    if (context.hardness_hrc && context.hardness_hrc > 50) {
      return "Senior machinists say: \"Hard material means slow speeds, rigid setup, and CBN or ceramic tools.\"";
    }
    if (context.depth_ratio && context.depth_ratio > 5) {
      return "Senior machinists say: \"Long reach needs light touch — reduce feed as depth increases.\"";
    }

    return "Senior machinists say: \"When in doubt, slow down and listen to the cut.\"";
  }

  // ==========================================================================
  // TRAINING API
  // ==========================================================================

  /**
   * Get training statistics.
   */
  getTrainingStats(): TrainingStats | null {
    return this.dataset?.stats ?? null;
  }

  /**
   * Get the full training dataset.
   */
  getTrainingDataset(): TrainingDataset | null {
    return this.dataset;
  }

  /**
   * Check if training data needs refresh.
   */
  needsRefresh(): boolean {
    if (!this.lastTraining) return true;
    // Refresh if older than 1 hour
    const ageMs = Date.now() - this.lastTraining.getTime();
    return ageMs > 60 * 60 * 1000;
  }

  /**
   * Get patterns for a specific category.
   */
  getPatternsByCategory(category: string): TrainingPattern[] {
    if (!this.dataset) {
      this.buildTrainingDataset();
    }
    return this.dataset!.category_index.get(category) ?? [];
  }

  /**
   * Get patterns for a specific material.
   */
  getPatternsByMaterial(material: string): TrainingPattern[] {
    if (!this.dataset) {
      this.buildTrainingDataset();
    }
    return this.dataset!.material_index.get(material.toLowerCase()) ?? [];
  }

  /**
   * Get all anti-patterns (things to avoid).
   */
  getAllAntiPatterns(): TrainingPattern[] {
    if (!this.dataset) {
      this.buildTrainingDataset();
    }
    return this.dataset!.anti_patterns;
  }

  /**
   * Get training data summary for AI context injection.
   */
  getTrainingSummary(): string {
    const stats = this.getTrainingStats();
    if (!stats) {
      return "Training data not loaded. Call buildTrainingDataset() first.";
    }

    return `
TRIBAL KNOWLEDGE TRAINING DATA
==============================
Patterns: ${stats.total_patterns} (${stats.high_confidence_count} high-confidence)
Anti-patterns: ${stats.total_anti_patterns}
Tips processed: ${stats.tips_processed}
Playbook rules: ${stats.rules_processed}
Categories: ${stats.categories_covered.length} (${stats.categories_covered.slice(0, 10).join(", ")}...)
Materials: ${stats.material_groups_covered.length} groups
Operations: ${stats.operation_types_covered.length} types
Average confidence: ${(stats.avg_confidence * 100).toFixed(1)}%
Training version: ${this.trainingVersion}
Last trained: ${stats.training_timestamp}
    `.trim();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const tribalKnowledgeTrainingEngine = new TribalKnowledgeTrainingEngine();
