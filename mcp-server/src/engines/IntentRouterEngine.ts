/**
 * IntentRouterEngine — Natural Language to Action Routing
 *
 * AGENT ROADMAP: U-AGT11 (MS4)
 *
 * Routes natural language intents to optimal dispatcher actions:
 * - "Calculate speed and feed for D2" → prism_calc:speed_feed
 * - "Quote this part" → prism_business:quote_estimate
 * - "What machine should I use?" → prism_cam:machine_selection
 *
 * Uses keyword matching, pattern recognition, and confidence scoring
 * to find the best matching action(s) for user intent.
 *
 * @module engines/IntentRouterEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Route match result */
export interface RouteMatch {
  dispatcher: string;
  action: string;
  fullAction: string;
  confidence: number;
  matchReason: string[];
  parameters: Record<string, unknown>;
  alternatives: AlternativeRoute[];
}

/** Alternative route option */
export interface AlternativeRoute {
  dispatcher: string;
  action: string;
  fullAction: string;
  confidence: number;
  reason: string;
}

/** Intent classification */
export interface IntentClassification {
  category: IntentCategory;
  subcategory?: string;
  entities: ExtractedEntity[];
  confidence: number;
}

/** Intent category */
export type IntentCategory =
  | "calculation"
  | "quote"
  | "selection"
  | "query"
  | "validation"
  | "generation"
  | "analysis"
  | "comparison"
  | "learning"
  | "general";

/** Extracted entity */
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  normalized?: string;
  confidence: number;
}

/** Entity type */
export type EntityType =
  | "material"
  | "machine"
  | "tool"
  | "operation"
  | "dimension"
  | "speed"
  | "feed"
  | "tolerance"
  | "hardness"
  | "quantity"
  | "customer"
  | "part";

/** Routing rule */
interface RoutingRule {
  patterns: RegExp[];
  keywords: string[];
  dispatcher: string;
  action: string;
  entityRequirements?: EntityType[];
  priority: number;
}

/** Routing result */
export interface RoutingResult {
  success: boolean;
  match?: RouteMatch;
  intent: IntentClassification;
  rawInput: string;
  routingTimeMs: number;
  suggestions?: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class IntentRouterEngine {
  /** Routing rules for dispatcher actions */
  private readonly rules: RoutingRule[] = [
    // Calculation rules
    {
      patterns: [
        /speed\s*(and|&)?\s*feed/i,
        /calculate.*speed/i,
        /what.*sfm/i,
        /rpm.*for/i,
        /feed.*rate/i
      ],
      keywords: ["speed", "feed", "sfm", "rpm", "ipr", "ipm", "fpt"],
      dispatcher: "prism_calc",
      action: "speed_feed",
      entityRequirements: ["material"],
      priority: 10
    },
    {
      patterns: [
        /cutting\s*force/i,
        /calculate.*force/i,
        /how\s*much\s*force/i,
        /kienzle/i
      ],
      keywords: ["force", "kienzle", "cutting", "thrust", "radial"],
      dispatcher: "prism_calc",
      action: "cutting_force",
      priority: 9
    },
    {
      patterns: [
        /tool\s*life/i,
        /how\s*long.*tool/i,
        /taylor.*equation/i,
        /when.*replace/i
      ],
      keywords: ["life", "taylor", "wear", "replace", "duration"],
      dispatcher: "prism_calc",
      action: "tool_life",
      priority: 9
    },
    {
      patterns: [
        /deflection/i,
        /how\s*much.*bend/i,
        /tool.*flex/i
      ],
      keywords: ["deflection", "bend", "flex", "sag"],
      dispatcher: "prism_calc",
      action: "deflection",
      priority: 8
    },
    {
      patterns: [
        /power.*required/i,
        /spindle\s*power/i,
        /how\s*much\s*power/i,
        /machine.*handle/i
      ],
      keywords: ["power", "spindle", "hp", "kw", "watt"],
      dispatcher: "prism_calc",
      action: "power_requirement",
      priority: 8
    },

    // Quote rules
    {
      patterns: [
        /quote.*part/i,
        /how\s*much.*cost/i,
        /price.*job/i,
        /estimate.*cost/i,
        /bid.*project/i
      ],
      keywords: ["quote", "estimate", "cost", "price", "bid", "proposal"],
      dispatcher: "prism_business",
      action: "quote_estimate",
      priority: 10
    },
    {
      patterns: [
        /lead\s*time/i,
        /when.*ready/i,
        /delivery.*date/i,
        /how\s*long.*make/i
      ],
      keywords: ["lead", "delivery", "time", "schedule", "when"],
      dispatcher: "prism_business",
      action: "lead_time",
      priority: 8
    },

    // Machine selection rules
    {
      patterns: [
        /which\s*machine/i,
        /what\s*machine/i,
        /select.*machine/i,
        /best\s*machine/i,
        /machine.*use/i
      ],
      keywords: ["machine", "select", "choose", "best", "lathe", "mill"],
      dispatcher: "prism_cam",
      action: "machine_selection",
      priority: 9
    },
    {
      patterns: [
        /which\s*tool/i,
        /what\s*tool/i,
        /select.*tool/i,
        /best\s*tool/i,
        /recommend.*tool/i
      ],
      keywords: ["tool", "insert", "endmill", "drill", "recommend"],
      dispatcher: "prism_cam",
      action: "tool_selection",
      priority: 9
    },

    // CAD/CAM rules
    {
      patterns: [
        /toolpath/i,
        /generate.*path/i,
        /cam.*strategy/i
      ],
      keywords: ["toolpath", "path", "strategy", "roughing", "finishing"],
      dispatcher: "prism_cam",
      action: "toolpath_strategy",
      priority: 8
    },
    {
      patterns: [
        /g-?code/i,
        /nc\s*program/i,
        /post.*process/i
      ],
      keywords: ["gcode", "nc", "program", "post", "output"],
      dispatcher: "prism_cam",
      action: "post_process",
      priority: 7
    },

    // Material rules
    {
      patterns: [
        /material.*properties/i,
        /what.*about.*material/i,
        /material.*data/i,
        /hardness.*of/i
      ],
      keywords: ["material", "properties", "hardness", "tensile", "composition"],
      dispatcher: "prism_data",
      action: "material_lookup",
      priority: 8
    },

    // Validation rules
    {
      patterns: [
        /validate.*program/i,
        /check.*code/i,
        /verify.*nc/i,
        /safe.*run/i
      ],
      keywords: ["validate", "verify", "check", "safe", "collision"],
      dispatcher: "prism_validate",
      action: "program_check",
      priority: 9
    },
    {
      patterns: [
        /simulate/i,
        /preview.*cut/i,
        /show.*toolpath/i
      ],
      keywords: ["simulate", "preview", "visualization", "playback"],
      dispatcher: "prism_validate",
      action: "simulation",
      priority: 7
    },

    // Quality rules
    {
      patterns: [
        /surface\s*finish/i,
        /roughness/i,
        /ra\s*value/i
      ],
      keywords: ["finish", "roughness", "ra", "surface", "quality"],
      dispatcher: "prism_quality",
      action: "surface_finish",
      priority: 8
    },
    {
      patterns: [
        /tolerance/i,
        /precision/i,
        /accuracy/i,
        /how\s*accurate/i
      ],
      keywords: ["tolerance", "precision", "accuracy", "capability"],
      dispatcher: "prism_quality",
      action: "tolerance_analysis",
      priority: 8
    },

    // Safety rules
    {
      patterns: [
        /is.*safe/i,
        /safe.*run/i,
        /danger/i,
        /risk.*assessment/i
      ],
      keywords: ["safe", "safety", "danger", "risk", "hazard"],
      dispatcher: "prism_safety",
      action: "safety_check",
      priority: 10
    }
  ];

  /** Entity extraction patterns */
  private readonly entityPatterns: Record<EntityType, RegExp[]> = {
    material: [
      /\b(D2|S7|M2|A2|H13|4140|1018|6061|7075|1045)\b/gi,
      /\b(Ti-?6Al-?4V|Inconel|Hastelloy|Monel)\b/gi,
      /\b(stainless|steel|aluminum|titanium|carbide)\b/gi,
      /\b(tool\s*steel|carbon\s*steel|alloy\s*steel)\b/gi
    ],
    hardness: [
      /(\d+)\s*(HRC|HB|HV)/gi,
      /hardness.*?(\d+)/i,
      /(hardened|annealed|normalized)/gi
    ],
    machine: [
      /\b(Okuma|Haas|Hurco|Mazak|DMG|Roku-Roku|Mitsubishi)\b/gi,
      /\b(lathe|mill|EDM|grinder|swiss)\b/gi,
      /\b(LB\d+|VF\d+|VM\d+)\b/gi
    ],
    tool: [
      /\b(endmill|drill|tap|reamer|boring\s*bar|insert)\b/gi,
      /(\d+\.?\d*)\s*(mm|inch|")\s*(diameter|dia\.?|ø)/gi,
      /\b(carbide|HSS|ceramic|CBN|PCD)\b/gi
    ],
    operation: [
      /\b(roughing|finishing|semi-?finish|facing|turning|milling|drilling|boring|threading)\b/gi,
      /\b(OD|ID|face|groove|thread)\b/gi
    ],
    dimension: [
      /(\d+\.?\d*)\s*(mm|inch|"|in)\b/gi,
      /(\d+\.?\d*)\s*x\s*(\d+\.?\d*)/gi,
      /diameter.*?(\d+\.?\d*)/i
    ],
    speed: [
      /(\d+)\s*(SFM|RPM|m\/min)/gi,
      /speed.*?(\d+)/i
    ],
    feed: [
      /(\d+\.?\d*)\s*(IPR|IPM|mm\/rev|mm\/min)/gi,
      /feed.*?(\d+\.?\d*)/i
    ],
    tolerance: [
      /[±+\-]\s*(\d+\.?\d*)/gi,
      /(\d+\.?\d*)\s*(thou|micron)/gi,
      /tolerance.*?(\d+\.?\d*)/i
    ],
    quantity: [
      /(\d+)\s*(parts?|pieces?|pcs?|qty)/gi,
      /quantity.*?(\d+)/i,
      /batch.*?(\d+)/i
    ],
    customer: [
      /customer.*?([A-Z][a-zA-Z\s]+)/i,
      /for\s+([A-Z][a-zA-Z\s]+)\s+(job|order)/i
    ],
    part: [
      /part\s*(#|number|no\.?)?\s*(\w+)/i,
      /drawing\s*(\w+)/i,
      /job\s*(\w+)/i
    ]
  };

  /**
   * Route an intent to the best matching action
   */
  route(input: string): RoutingResult {
    const startTime = Date.now();

    // Classify intent
    const intent = this.classifyIntent(input);

    // Find matching rules
    const matches = this.findMatches(input, intent);

    // Sort by score
    matches.sort((a, b) => b.confidence - a.confidence);

    const routingTimeMs = Date.now() - startTime;

    if (matches.length === 0) {
      return {
        success: false,
        intent,
        rawInput: input,
        routingTimeMs,
        suggestions: this.generateSuggestions(intent)
      };
    }

    const bestMatch = matches[0];
    const alternatives = matches.slice(1, 4).map(m => ({
      dispatcher: m.dispatcher,
      action: m.action,
      fullAction: m.fullAction,
      confidence: m.confidence,
      reason: m.matchReason[0] || "Similar intent"
    }));

    return {
      success: true,
      match: { ...bestMatch, alternatives },
      intent,
      rawInput: input,
      routingTimeMs
    };
  }

  /**
   * Classify the intent category
   */
  classifyIntent(input: string): IntentClassification {
    const lower = input.toLowerCase();
    const entities = this.extractEntities(input);

    // Detect category - order matters! More specific patterns first
    let category: IntentCategory = "general";
    let confidence = 0.5;

    // Quote patterns (check before calculation since "how much" overlaps)
    if (/quote|cost|price|estimate|bid|how\s*much.*cost/i.test(lower)) {
      category = "quote";
      confidence = 0.9;
    } else if (/calculate|compute|how\s*much.*force|how\s*much.*power|what.*is.*the.*value|what.*is.*the.*force/i.test(lower)) {
      category = "calculation";
      confidence = 0.85;
    } else if (/select|choose|which|best|recommend/i.test(lower)) {
      category = "selection";
      confidence = 0.85;
    } else if (/what|tell.*about|show|get|find|look\s*up/i.test(lower)) {
      category = "query";
      confidence = 0.7;
    } else if (/validate|verify|check|safe/i.test(lower)) {
      category = "validation";
      confidence = 0.85;
    } else if (/generate|create|make|produce/i.test(lower)) {
      category = "generation";
      confidence = 0.8;
    } else if (/analyze|assess|evaluate/i.test(lower)) {
      category = "analysis";
      confidence = 0.8;
    } else if (/compare|versus|vs|better|worse/i.test(lower)) {
      category = "comparison";
      confidence = 0.85;
    } else if (/learn|teach|explain|why/i.test(lower)) {
      category = "learning";
      confidence = 0.75;
    }

    // Detect subcategory based on entities
    let subcategory: string | undefined;
    if (entities.some(e => e.type === "material")) {
      subcategory = "material-related";
    } else if (entities.some(e => e.type === "machine")) {
      subcategory = "machine-related";
    } else if (entities.some(e => e.type === "tool")) {
      subcategory = "tooling-related";
    }

    return { category, subcategory, entities, confidence };
  }

  /**
   * Extract entities from input
   */
  extractEntities(input: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [type, patterns] of Object.entries(this.entityPatterns)) {
      for (const pattern of patterns) {
        const matches = input.matchAll(new RegExp(pattern.source, "gi"));
        for (const match of matches) {
          entities.push({
            type: type as EntityType,
            value: match[0],
            normalized: this.normalizeEntity(type as EntityType, match[0]),
            confidence: 0.8
          });
        }
      }
    }

    // Deduplicate by normalized value
    const seen = new Set<string>();
    return entities.filter(e => {
      const key = `${e.type}:${e.normalized || e.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Normalize entity value
   */
  private normalizeEntity(type: EntityType, value: string): string {
    switch (type) {
      case "material":
        return value.toUpperCase().replace(/\s+/g, "");
      case "hardness":
        return value.toUpperCase();
      case "machine":
        return value;
      default:
        return value.toLowerCase();
    }
  }

  /**
   * Find matching rules
   */
  private findMatches(input: string, intent: IntentClassification): RouteMatch[] {
    const matches: RouteMatch[] = [];
    const lower = input.toLowerCase();
    const words = new Set(lower.split(/\s+/));

    for (const rule of this.rules) {
      const matchReasons: string[] = [];
      let score = 0;

      // Pattern matching
      for (const pattern of rule.patterns) {
        if (pattern.test(input)) {
          score += 30;
          matchReasons.push(`Pattern match: ${pattern.source.slice(0, 20)}...`);
        }
      }

      // Keyword matching
      const keywordMatches = rule.keywords.filter(k => words.has(k) || lower.includes(k));
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 10;
        matchReasons.push(`Keywords: ${keywordMatches.join(", ")}`);
      }

      // Entity requirement bonus
      if (rule.entityRequirements) {
        const hasRequired = rule.entityRequirements.every(req =>
          intent.entities.some(e => e.type === req)
        );
        if (hasRequired) {
          score += 15;
          matchReasons.push("Has required entities");
        }
      }

      // Priority bonus
      score += rule.priority;

      if (score > 15) {
        // Normalize to 0-1
        const confidence = Math.min(1, score / 100);

        matches.push({
          dispatcher: rule.dispatcher,
          action: rule.action,
          fullAction: `${rule.dispatcher}:${rule.action}`,
          confidence,
          matchReason: matchReasons,
          parameters: this.extractParameters(input, intent, rule),
          alternatives: []
        });
      }
    }

    return matches;
  }

  /**
   * Extract parameters for action
   */
  private extractParameters(
    input: string,
    intent: IntentClassification,
    rule: RoutingRule
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Add entities as parameters
    for (const entity of intent.entities) {
      switch (entity.type) {
        case "material":
          params.material = entity.normalized || entity.value;
          break;
        case "hardness":
          params.hardness = entity.value;
          break;
        case "machine":
          params.machine = entity.value;
          break;
        case "tool":
          params.tool = entity.value;
          break;
        case "operation":
          params.operation = entity.normalized || entity.value;
          break;
        case "dimension":
          params.dimension = entity.value;
          break;
        case "speed":
          params.speed = entity.value;
          break;
        case "feed":
          params.feed = entity.value;
          break;
        case "tolerance":
          params.tolerance = entity.value;
          break;
        case "quantity":
          params.quantity = entity.value;
          break;
      }
    }

    return params;
  }

  /**
   * Generate suggestions for failed routing
   */
  private generateSuggestions(intent: IntentClassification): string[] {
    const suggestions: string[] = [];

    switch (intent.category) {
      case "calculation":
        suggestions.push("Try: 'Calculate speed and feed for D2 at 58 HRC'");
        suggestions.push("Try: 'What cutting force for 0.100 DOC?'");
        break;
      case "quote":
        suggestions.push("Try: 'Quote this part for 100 pieces'");
        suggestions.push("Try: 'Estimate cost for job ABC'");
        break;
      case "selection":
        suggestions.push("Try: 'Which machine should I use for D2?'");
        suggestions.push("Try: 'Recommend a tool for finishing aluminum'");
        break;
      case "query":
        suggestions.push("Try: 'What are the properties of D2?'");
        suggestions.push("Try: 'Show me the Okuma LB15 specs'");
        break;
      default:
        suggestions.push("Try being more specific about what you need");
        suggestions.push("Include material, operation, or machine details");
    }

    return suggestions;
  }

  /**
   * Get all available routes
   */
  getAvailableRoutes(): { dispatcher: string; action: string; keywords: string[] }[] {
    return this.rules.map(r => ({
      dispatcher: r.dispatcher,
      action: r.action,
      keywords: r.keywords
    }));
  }

  /**
   * Add a custom routing rule
   */
  addRule(rule: {
    patterns: string[];
    keywords: string[];
    dispatcher: string;
    action: string;
    priority?: number;
  }): void {
    this.rules.push({
      patterns: rule.patterns.map(p => new RegExp(p, "i")),
      keywords: rule.keywords,
      dispatcher: rule.dispatcher,
      action: rule.action,
      priority: rule.priority || 5
    });
  }

  /**
   * Get routing statistics
   */
  getStats(): { totalRules: number; dispatchers: string[]; topKeywords: string[] } {
    const dispatchers = [...new Set(this.rules.map(r => r.dispatcher))];
    const allKeywords = this.rules.flatMap(r => r.keywords);
    const keywordCounts = new Map<string, number>();
    for (const kw of allKeywords) {
      keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
    }
    const topKeywords = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw]) => kw);

    return {
      totalRules: this.rules.length,
      dispatchers,
      topKeywords
    };
  }
}

// Export singleton
export const intentRouterEngine = new IntentRouterEngine();
