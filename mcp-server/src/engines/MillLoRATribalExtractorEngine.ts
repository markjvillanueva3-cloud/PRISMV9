/**
 * MillLoRATribalExtractorEngine — Tribal Knowledge Extractor (Mill parity)
 * =========================================================================
 *
 * Extracts mill shop-floor tribal knowledge from operator-provided text.
 * Converts unstructured operator wisdom into structured training data
 * scoped per-axis_mode and per-mill-canonical category.
 *
 * Mill parity for LatheLoRATribalExtractorEngine (LATHE-LORA-MS0 U-LLR38)
 * with MILL-CANONICAL extensions:
 *
 *   - Mill-canonical category vocabulary (5 mill-specific on top of 9
 *     lathe-shared): chatter (separated from troubleshooting because
 *     chatter is a tool-damage-class signal), pocket_strategy,
 *     five_axis_strategy, tcpm, thermal
 *   - Mill-canonical keyword maps (end mill / face mill / ball mill /
 *     TCPM / pocket / 5-axis / Heidenhain / Mastercam / etc.)
 *   - Axis-mode metadata on every TribalTip (3_axis / 4_axis_index /
 *     5_axis_simul / shared) auto-inferred from text keywords
 *   - toTrainingExample emits mill-context prompt (not lathe-context)
 *
 * @module engines/MillLoRATribalExtractorEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-TRIBAL-EXTRACTOR (iter97)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Lathe-shared (9) + MILL-CANONICAL (5) tribal categories. */
export type MillTribalCategory =
  // Lathe-shared
  | "tool_selection"
  | "parameters"
  | "material"
  | "workholding"
  | "surface_finish"
  | "safety"
  | "troubleshooting"
  | "setup"
  | "general"
  // MILL-CANONICAL
  | "chatter"             // critical: separated from troubleshooting
  | "pocket_strategy"     // 2.5D / 3D pocketing wisdom
  | "five_axis_strategy"  // 5-axis simul + index strategies
  | "tcpm"                // tool center point management (Heidenhain Cyc19 / Fanuc G43.4)
  | "thermal";            // thermal growth, coolant strategy

export const MILL_CANONICAL_CATEGORIES: MillTribalCategory[] = [
  "chatter",
  "pocket_strategy",
  "five_axis_strategy",
  "tcpm",
  "thermal",
];

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export interface MillTribalTip {
  id: string;
  raw_text: string;
  condition: string;
  recommendation: string;
  category: MillTribalCategory;
  keywords: string[];
  confidence: number;
  author?: string;
  source?: string;
  created_at: number;
  /** MILL-CANONICAL: auto-inferred axis_mode from text keywords. */
  axis_mode: MillAxisMode;
}

export interface MillTribalConfig {
  min_confidence: number;
  max_keyword_count: number;
  max_tips_in_memory: number;
  enable_auto_categorization: boolean;
  /** MILL-CANONICAL: enable axis_mode auto-inference from text. */
  enable_axis_inference: boolean;
}

const DEFAULT_CONFIG: MillTribalConfig = {
  min_confidence: 0.3,
  max_keyword_count: 10,
  max_tips_in_memory: 1000,
  enable_auto_categorization: true,
  enable_axis_inference: true,
};

/** Category keyword map (mill-canonical entries replace lathe-specific). */
const CATEGORY_KEYWORDS: Record<MillTribalCategory, string[]> = {
  // Lathe-shared, mill-relevant ones kept
  tool_selection: ["insert", "grade", "tool", "carbide", "ceramic", "cbn", "end mill", "endmill", "face mill", "ball mill", "drill", "tap"],
  parameters: ["sfm", "feed", "rpm", "depth", "doc", "ae", "ap", "speed", "fz", "chipload"],
  material: ["steel", "stainless", "aluminum", "titanium", "inconel", "hardened", "tool steel", "graphite"],
  workholding: ["vise", "fixture", "clamp", "jaw", "soft jaw", "mag chuck", "magnetic"],
  surface_finish: ["finish", "ra", "surface", "polish", "roughness"],
  safety: ["safety", "crash", "collision", "emergency", "guard"],
  troubleshooting: ["broken", "scrap", "reject", "bad", "fail"],
  setup: ["setup", "probe", "offset", "touch", "zero", "align", "renishaw"],
  general: [],
  // MILL-CANONICAL
  chatter: ["chatter", "vibration", "resonance", "regen", "lobe", "tlusty"],
  pocket_strategy: ["pocket", "slot", "trochoidal", "adaptive", "rest", "hsm", "high speed"],
  five_axis_strategy: ["5-axis", "5 axis", "5_axis", "five axis", "simultaneous", "indexed", "swarf", "flowline", "rotary"],
  tcpm: ["tcpm", "rtcp", "g43.4", "cycle 19", "cycle19", "transform", "heidenhain"],
  thermal: ["thermal", "coolant", "flood", "mql", "cryo", "growth", "expansion", "warm-up", "warmup"],
};

/** Axis-mode inference keywords. */
const AXIS_KEYWORDS: Record<MillAxisMode, string[]> = {
  "5_axis_simul": ["5-axis", "5 axis", "5_axis", "five axis", "simultaneous", "tcpm", "rtcp", "swarf", "flowline"],
  "4_axis_index": ["4-axis", "4 axis", "4_axis", "four axis", "indexed", "indexing", "rotary"],
  "3_axis": ["3-axis", "3 axis", "3_axis", "three axis", "vmc", "vertical mill"],
  "shared": [],
};

const CONDITION_PATTERNS = [
  /when\s+(.+?)[,.]/i,
  /if\s+(.+?)[,.]/i,
  /for\s+(.+?)[,.]/i,
  /during\s+(.+?)[,.]/i,
];

const RECOMMENDATION_PATTERNS = [
  /(?:use|try|reduce|increase|set|apply)\s+(.+?)[.!]/i,
  /(?:should|need\s+to|must)\s+(.+?)[.!]/i,
];

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRATribalExtractorEngine {
  private config: MillTribalConfig = { ...DEFAULT_CONFIG };
  private tips: MillTribalTip[] = [];

  setConfig(config: Partial<MillTribalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillTribalConfig {
    return { ...this.config };
  }

  categorizeText(text: string): MillTribalCategory {
    const lower = text.toLowerCase();

    // MILL-CANONICAL priority rules — fire BEFORE generic keyword scoring.
    // Order reflects mill-shop priority: chatter is tool-damage-class so it
    // wins over everything; TCPM/thermal/pocket/5-axis follow in order of
    // mill operational specificity.
    if (lower.includes("chatter") || lower.includes("vibration") || lower.includes("regen")) {
      return "chatter";
    }
    if (
      lower.includes("tcpm") ||
      lower.includes("rtcp") ||
      lower.includes("g43.4") ||
      lower.includes("cycle 19") ||
      lower.includes("cycle19")
    ) {
      return "tcpm";
    }
    if (
      lower.includes("coolant") ||
      lower.includes("thermal") ||
      lower.includes("flood") ||
      lower.includes("mql") ||
      lower.includes("cryo")
    ) {
      return "thermal";
    }
    if (
      lower.includes("pocket") ||
      lower.includes("trochoidal") ||
      lower.includes("adaptive") ||
      lower.includes("slot")
    ) {
      return "pocket_strategy";
    }
    if (
      lower.includes("5-axis") ||
      lower.includes("5 axis") ||
      lower.includes("5_axis") ||
      lower.includes("five axis") ||
      lower.includes("simultaneous") ||
      lower.includes("swarf") ||
      lower.includes("flowline")
    ) {
      return "five_axis_strategy";
    }

    // Generic keyword scoring across remaining categories.
    // Word-boundary match (escaped) so short keywords like "ra" don't
    // match substrings of unrelated words (e.g. "random").
    let bestCategory: MillTribalCategory = "general";
    let bestScore = 0;
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if ((MILL_CANONICAL_CATEGORIES as readonly string[]).includes(category)) continue;
      let score = 0;
      for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "i");
        if (re.test(lower)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category as MillTribalCategory;
      }
    }
    return bestCategory;
  }

  /**
   * MILL-CANONICAL: infer axis_mode from text keywords.
   * Returns most-specific axis match (5 > 4 > 3 > shared).
   */
  inferAxisMode(text: string): MillAxisMode {
    const lower = text.toLowerCase();
    const order: MillAxisMode[] = ["5_axis_simul", "4_axis_index", "3_axis"];
    for (const axis of order) {
      for (const kw of AXIS_KEYWORDS[axis]) {
        if (lower.includes(kw)) return axis;
      }
    }
    return "shared";
  }

  extractKeywords(text: string): string[] {
    const STOP_WORDS = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "for",
      "in", "on", "at", "by", "with", "from", "and", "or", "but", "if", "then",
      "when", "while", "that", "this", "these", "those", "it", "as", "not",
    ]);
    const words = text.toLowerCase().match(/\b[a-z][a-z0-9]+\b/g) ?? [];
    const freq: Record<string, number> = {};
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] ?? 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.max_keyword_count)
      .map(([w]) => w);
  }

  extractCondition(text: string): string {
    for (const pattern of CONDITION_PATTERNS) {
      const m = text.match(pattern);
      if (m) return m[1].trim();
    }
    const firstPart = text.split(/[,.]/)[0];
    return firstPart ? firstPart.trim() : "";
  }

  extractRecommendation(text: string): string {
    for (const pattern of RECOMMENDATION_PATTERNS) {
      const m = text.match(pattern);
      if (m) return m[1].trim();
    }
    const parts = text.split(/[,.]/);
    const last = parts[parts.length - 1] || parts[parts.length - 2] || "";
    return last.trim();
  }

  computeConfidence(condition: string, recommendation: string, keywords: string[]): number {
    let score = 0;
    if (condition && condition.length > 3) score += 0.3;
    if (recommendation && recommendation.length > 3) score += 0.4;
    if (keywords.length > 0) score += Math.min(0.3, keywords.length * 0.05);
    return Math.min(1.0, score);
  }

  extractTip(
    rawText: string,
    metadata?: { author?: string; source?: string; axis_mode?: MillAxisMode },
  ): MillTribalTip | null {
    const condition = this.extractCondition(rawText);
    const recommendation = this.extractRecommendation(rawText);
    const keywords = this.extractKeywords(rawText);
    const confidence = this.computeConfidence(condition, recommendation, keywords);
    if (confidence < this.config.min_confidence) return null;

    const category = this.config.enable_auto_categorization ? this.categorizeText(rawText) : "general";
    const axis_mode =
      metadata?.axis_mode ?? (this.config.enable_axis_inference ? this.inferAxisMode(rawText) : "shared");

    const tip: MillTribalTip = {
      id: `tribal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      raw_text: rawText,
      condition,
      recommendation,
      category,
      keywords,
      confidence,
      author: metadata?.author,
      source: metadata?.source,
      created_at: Date.now(),
      axis_mode,
    };

    this.tips.push(tip);
    if (this.tips.length > this.config.max_tips_in_memory) {
      this.tips = this.tips.slice(-this.config.max_tips_in_memory);
    }
    return tip;
  }

  extractBatch(texts: string[]): MillTribalTip[] {
    const out: MillTribalTip[] = [];
    for (const text of texts) {
      const tip = this.extractTip(text);
      if (tip) out.push(tip);
    }
    return out;
  }

  findByCategory(category: MillTribalCategory): MillTribalTip[] {
    return this.tips.filter((t) => t.category === category);
  }

  findByKeyword(keyword: string): MillTribalTip[] {
    const lower = keyword.toLowerCase();
    return this.tips.filter(
      (t) => t.keywords.some((k) => k.includes(lower)) || t.raw_text.toLowerCase().includes(lower),
    );
  }

  /** MILL-CANONICAL: find tips by axis_mode. */
  findByAxisMode(axis: MillAxisMode): MillTribalTip[] {
    return this.tips.filter((t) => t.axis_mode === axis);
  }

  /** MILL-CANONICAL: emits a mill-context training example. */
  toTrainingExample(tip: MillTribalTip): { prompt: string; completion: string } {
    const axisContext = tip.axis_mode === "shared" ? "mill operations" : `${tip.axis_mode.replace("_", "-")} mill operations`;
    return {
      prompt: `In ${axisContext}, ${tip.condition ? `when ${tip.condition}` : "for best practice"}, what do you recommend?`,
      completion: tip.recommendation || tip.raw_text,
    };
  }

  getTips(limit?: number): MillTribalTip[] {
    const list = [...this.tips];
    return typeof limit === "number" ? list.slice(-limit) : list;
  }

  getStats(): {
    total_tips: number;
    avg_confidence: number;
    high_confidence_count: number;
    category_distribution: Record<string, number>;
    axis_distribution: Record<string, number>;
    mill_canonical_count: number;
  } {
    const total = this.tips.length;
    if (total === 0) {
      return {
        total_tips: 0,
        avg_confidence: 0,
        high_confidence_count: 0,
        category_distribution: {},
        axis_distribution: {},
        mill_canonical_count: 0,
      };
    }
    const sumConf = this.tips.reduce((s, t) => s + t.confidence, 0);
    const highConf = this.tips.filter((t) => t.confidence >= 0.7).length;
    const catDist: Record<string, number> = {};
    const axisDist: Record<string, number> = {};
    let canonicalCount = 0;
    for (const t of this.tips) {
      catDist[t.category] = (catDist[t.category] ?? 0) + 1;
      axisDist[t.axis_mode] = (axisDist[t.axis_mode] ?? 0) + 1;
      if ((MILL_CANONICAL_CATEGORIES as readonly string[]).includes(t.category)) canonicalCount++;
    }
    return {
      total_tips: total,
      avg_confidence: sumConf / total,
      high_confidence_count: highConf,
      category_distribution: catDist,
      axis_distribution: axisDist,
      mill_canonical_count: canonicalCount,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    const lines = [
      "Mill Tribal Extractor Summary",
      "=============================",
      `Total Tips: ${stats.total_tips}`,
      `Avg Confidence: ${stats.avg_confidence.toFixed(3)}`,
      `High Confidence (>=0.7): ${stats.high_confidence_count}`,
      `Mill-Canonical Categorized: ${stats.mill_canonical_count}`,
      "",
      "Categories:",
    ];
    for (const [cat, count] of Object.entries(stats.category_distribution)) {
      lines.push(`  ${cat}: ${count}`);
    }
    return lines.join("\n");
  }

  clear(): void {
    this.tips = [];
  }

  reset(): void {
    this.tips = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRATribalExtractorEngine = new MillLoRATribalExtractorEngine();
export { MillLoRATribalExtractorEngine };
