/**
 * MillLoRATribalAugmentationEngine — Response Augmenter (Mill parity)
 * =====================================================================
 *
 * Augments MillLoRA outputs with mill shop-floor tribal knowledge from
 * the JM Die archive + mill-controller manuals + playbook rules.
 * Injects mill-canonical wisdom (chatter avoidance, TCPM safety,
 * pocket strategy, thermal control) and anti-patterns.
 *
 * Mill parity for LatheLoRATribalAugmentationEngine (LATHE-LORA-MS0
 * U-LLR28) with MILL-CANONICAL extensions:
 *
 *   - Tip sources expanded: jm_die_mill (replaces jm_die for mill scope),
 *     heidenhain, mastercam, hsmworks, makino + lathe-shared {playbook,
 *     community, handbook}
 *   - 8 default JM-Die-mill tips (replacing 8 lathe-turning tips) covering
 *     chatter avoidance on long endmills, 5-axis simul speed/feed,
 *     trochoidal pocketing, TCPM Cycle 19 enable, mold-3D finishing,
 *     vise jaw selection, drill peck-clear, soft-jaw boring
 *   - 4 mill-controller tips (Heidenhain Cyc-19, Mastercam HSM, HSMWorks
 *     adaptive, Makino MAG-series workflow)
 *   - 4 MILL-CANONICAL playbook rules layered on 6 lathe-shared:
 *       mill-rule-001 chatter detection (any "chatter" mention → critical)
 *       mill-rule-002 TCPM safety (5-axis without TCPM enable → critical)
 *       mill-rule-003 long endmill ae (radial step > 0.5d → warning)
 *       mill-rule-004 dry mill on stainless (mandatory coolant → warning)
 *   - Per-tip axis_mode metadata for axis-scoped augmentation
 *
 * @module engines/MillLoRATribalAugmentationEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-TRIBAL-AUGMENTATION (iter98)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Lathe-shared (3) + MILL-CANONICAL (5) tip sources. */
export type MillTipSource =
  | "jm_die_mill"
  | "heidenhain"
  | "mastercam"
  | "hsmworks"
  | "makino"
  | "playbook"
  | "community"
  | "handbook";

export const MILL_CANONICAL_TIP_SOURCES: MillTipSource[] = [
  "jm_die_mill",
  "heidenhain",
  "mastercam",
  "hsmworks",
  "makino",
];

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export interface MillTribalAugTip {
  id: string;
  content: string;
  source: MillTipSource;
  material?: string;
  operation?: string;
  machine?: string;
  controller?: string;
  axis_mode: MillAxisMode;
  keywords: string[];
  priority: number;
  verified: boolean;
}

export interface MillPlaybookRule {
  id: string;
  condition: string;
  action: string;
  rationale: string;
  category: string;
  severity: "info" | "warning" | "critical";
  /** MILL-CANONICAL: which rules are mill-specific (vs lathe-shared). */
  mill_canonical: boolean;
}

export interface MillAugmentationResult {
  original_response: string;
  augmented_response: string;
  tips_applied: MillTribalAugTip[];
  rules_triggered: MillPlaybookRule[];
  warnings: string[];
  confidence_boost: number;
  /** MILL-CANONICAL: count of mill-canonical rules among rules_triggered. */
  mill_canonical_rules_triggered: number;
}

export interface MillAugConfig {
  max_tips_per_response: number;
  min_relevance_score: number;
  include_rationale: boolean;
  warn_on_anti_patterns: boolean;
  source_priority: MillTipSource[];
  /** MILL-CANONICAL: restrict augmentation to a specific axis_mode. */
  axis_mode_filter?: MillAxisMode;
}

const DEFAULT_CONFIG: MillAugConfig = {
  max_tips_per_response: 3,
  min_relevance_score: 0.5,
  include_rationale: true,
  warn_on_anti_patterns: true,
  source_priority: ["jm_die_mill", "heidenhain", "mastercam", "hsmworks", "makino", "playbook", "handbook", "community"],
};

// ═══════════════════════════════════════════════════════════════════════
// MILL-CANONICAL JM DIE TIPS (8 tips replacing lathe-turning set)
// ═══════════════════════════════════════════════════════════════════════

const JM_DIE_MILL_TIPS: MillTribalAugTip[] = [
  {
    id: "jmm-001",
    content: "On long carbide endmills (L:D > 4:1), cap ae at 0.3D to avoid regen chatter — drop fz to 0.05mm if tone changes.",
    source: "jm_die_mill",
    operation: "contour",
    axis_mode: "3_axis",
    keywords: ["endmill", "long", "chatter", "ae", "regen"],
    priority: 9,
    verified: true,
  },
  {
    id: "jmm-002",
    content: "For 5-axis simultaneous on Inconel 718, set fz to 0.04mm and use TCPM Cycle 19 with high-pressure coolant.",
    source: "jm_die_mill",
    operation: "5_axis_simul",
    material: "inconel",
    controller: "heidenhain",
    axis_mode: "5_axis_simul",
    keywords: ["5-axis", "inconel", "tcpm", "coolant"],
    priority: 10,
    verified: true,
  },
  {
    id: "jmm-003",
    content: "Trochoidal pocketing on hardened tool steel: ae 0.1D, ap 1.5D, fz from chipload chart × 1.2 — chip thinning compensates.",
    source: "jm_die_mill",
    operation: "pocket_2_5d",
    material: "tool_steel",
    axis_mode: "3_axis",
    keywords: ["trochoidal", "pocket", "tool steel", "chipload", "thinning"],
    priority: 9,
    verified: true,
  },
  {
    id: "jmm-004",
    content: "When TCPM solver faults on Heidenhain TNC 640, check that PLANE SPATIAL is active before Cycle 19 ON.",
    source: "jm_die_mill",
    controller: "heidenhain",
    axis_mode: "5_axis_simul",
    keywords: ["tcpm", "heidenhain", "plane", "cycle 19", "fault"],
    priority: 10,
    verified: true,
  },
  {
    id: "jmm-005",
    content: "Mold-3D finishing on P20: use 6mm ball mill, ae 0.05mm, fz 0.03mm, climb-mill only — no conventional milling.",
    source: "jm_die_mill",
    operation: "pocket_3d",
    material: "p20",
    axis_mode: "3_axis",
    keywords: ["mold", "p20", "ball mill", "climb", "finish"],
    priority: 8,
    verified: true,
  },
  {
    id: "jmm-006",
    content: "Vise jaw soft-jaw rule: bore jaws on the workholding vise — never on a separate setup; eliminates Abbe error.",
    source: "jm_die_mill",
    operation: "boring",
    axis_mode: "3_axis",
    keywords: ["vise", "soft jaw", "bore", "abbe", "fixture"],
    priority: 8,
    verified: true,
  },
  {
    id: "jmm-007",
    content: "Drill deeper than 3xD: peck-clear every 2xD on stainless to break chips — full retract above the workpiece.",
    source: "jm_die_mill",
    operation: "drill",
    material: "stainless",
    axis_mode: "3_axis",
    keywords: ["drill", "peck", "stainless", "chip", "retract"],
    priority: 9,
    verified: true,
  },
  {
    id: "jmm-008",
    content: "Magnetic chuck workholding on the Makino: verify part is grounded (gauss meter check) before any cut — floating part = collision.",
    source: "jm_die_mill",
    operation: "setup",
    machine: "makino",
    axis_mode: "3_axis",
    keywords: ["magnetic", "chuck", "makino", "ground", "workholding"],
    priority: 10,
    verified: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// MILL CONTROLLER + CAM TIPS (4 tips)
// ═══════════════════════════════════════════════════════════════════════

const MILL_CONTROLLER_TIPS: MillTribalAugTip[] = [
  {
    id: "hdh-001",
    content: "Heidenhain Cycle 19 PLANE SPATIAL: angles SPA/SPB/SPC follow ISO Z-Y-X order — different from Mazak post.",
    source: "heidenhain",
    controller: "heidenhain",
    axis_mode: "5_axis_simul",
    keywords: ["heidenhain", "cycle 19", "plane", "spatial", "iso"],
    priority: 9,
    verified: true,
  },
  {
    id: "mc-001",
    content: "Mastercam Dynamic Mill: tool engagement angle drives chipload — set Stepover by chip thinning calc, not by % diameter.",
    source: "mastercam",
    controller: "mastercam",
    axis_mode: "3_axis",
    keywords: ["mastercam", "dynamic", "engagement", "chipload", "stepover"],
    priority: 8,
    verified: true,
  },
  {
    id: "hsm-001",
    content: "HSMWorks Adaptive: tolerance smaller than ae/10 makes solver explode — keep tolerance proportional to stepover.",
    source: "hsmworks",
    controller: "hsmworks",
    axis_mode: "3_axis",
    keywords: ["hsmworks", "adaptive", "tolerance", "ae"],
    priority: 7,
    verified: true,
  },
  {
    id: "mak-001",
    content: "Makino MAG-series 5-axis: tilt-table swap before each cycle. Verify B-axis brake released and table at zero before retrace.",
    source: "makino",
    machine: "makino",
    axis_mode: "5_axis_simul",
    keywords: ["makino", "mag", "tilt", "brake", "5-axis"],
    priority: 9,
    verified: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// PLAYBOOK RULES (6 lathe-shared + 4 MILL-CANONICAL)
// ═══════════════════════════════════════════════════════════════════════

const PLAYBOOK_RULES: MillPlaybookRule[] = [
  // Lathe-shared (6)
  {
    id: "rule-001",
    condition: "SFM > 500 for steel",
    action: "Reduce SFM to max 500 SFM",
    rationale: "Excessive SFM causes rapid insert wear and potential tool failure",
    category: "safety",
    severity: "warning",
    mill_canonical: false,
  },
  {
    id: "rule-002",
    condition: "No spindle limit in program",
    action: "Add spindle speed clamp before any CSS / SFM-driven block",
    rationale: "Without spindle limit, runaway RPM on small features is possible",
    category: "safety",
    severity: "critical",
    mill_canonical: false,
  },
  {
    id: "rule-003",
    condition: "DOC > 0.200\" for finishing",
    action: "Reduce DOC to < 0.020\" for finish passes",
    rationale: "Heavy DOC ruins surface finish and causes chatter",
    category: "quality",
    severity: "warning",
    mill_canonical: false,
  },
  {
    id: "rule-005",
    condition: "No coolant specified for steel",
    action: "Enable flood coolant M08",
    rationale: "Dry machining steel causes heat buildup and rapid wear",
    category: "tool_life",
    severity: "warning",
    mill_canonical: false,
  },
  {
    id: "rule-006",
    condition: "Rapid (G00) toward part",
    action: "Verify clearance before rapid approach",
    rationale: "Rapid collision with part = catastrophic damage",
    category: "safety",
    severity: "critical",
    mill_canonical: false,
  },
  {
    id: "rule-007",
    condition: "Tap without rigid-tap mode",
    action: "Enable rigid tap (M29 / G84) before tapping cycle",
    rationale: "Float-tap on a CNC mill snaps taps — rigid tap synchronizes Z to spindle",
    category: "tool_life",
    severity: "warning",
    mill_canonical: false,
  },
  // MILL-CANONICAL (4)
  {
    id: "mill-rule-001",
    condition: "Mention of chatter in cut response",
    action: "Reduce ae by 50% and/or change spindle speed by 10-15% to dodge the lobe",
    rationale: "Chatter damages tools immediately and produces scrap; never continue cutting through chatter",
    category: "chatter",
    severity: "critical",
    mill_canonical: true,
  },
  {
    id: "mill-rule-002",
    condition: "5-axis simultaneous block without TCPM/Cycle19 enable",
    action: "Enable TCPM (M128 / G43.4 / Cycle 19) before any 5-axis simul block",
    rationale: "Without TCPM, the rotary axes move but the tool-tip path is wrong — guaranteed scrap or collision",
    category: "tcpm",
    severity: "critical",
    mill_canonical: true,
  },
  {
    id: "mill-rule-003",
    condition: "Long endmill (L:D > 4:1) with ae > 0.5D",
    action: "Cap ae at 0.3D and use trochoidal for slot-style cuts",
    rationale: "Long-reach endmills regen-chatter past 0.5D radial step — the lobe diagram for L:D>4 is unforgiving",
    category: "chatter",
    severity: "warning",
    mill_canonical: true,
  },
  {
    id: "mill-rule-004",
    condition: "Stainless steel mill cut without coolant",
    action: "Enable flood coolant or MQL with stainless-formulated lubricant",
    rationale: "Stainless work-hardens with friction heat; dry mill on stainless = built-up edge + tool death in minutes",
    category: "tool_life",
    severity: "warning",
    mill_canonical: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRATribalAugmentationEngine {
  private config: MillAugConfig = { ...DEFAULT_CONFIG };
  private tips: MillTribalAugTip[] = [...JM_DIE_MILL_TIPS, ...MILL_CONTROLLER_TIPS];
  private rules: MillPlaybookRule[] = [...PLAYBOOK_RULES];

  setConfig(config: Partial<MillAugConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillAugConfig {
    return { ...this.config };
  }

  addTip(tip: MillTribalAugTip): void {
    this.tips.push(tip);
  }

  addRule(rule: MillPlaybookRule): void {
    this.rules.push(rule);
  }

  getTips(source?: MillTipSource): MillTribalAugTip[] {
    return typeof source === "string" ? this.tips.filter((t) => t.source === source) : [...this.tips];
  }

  getRules(category?: string): MillPlaybookRule[] {
    return typeof category === "string" ? this.rules.filter((r) => r.category === category) : [...this.rules];
  }

  /** MILL-CANONICAL: filter tips by axis_mode. */
  getTipsByAxisMode(axis: MillAxisMode): MillTribalAugTip[] {
    return this.tips.filter((t) => t.axis_mode === axis);
  }

  /** MILL-CANONICAL: enumerate ONLY mill-canonical rules. */
  getMillCanonicalRules(): MillPlaybookRule[] {
    return this.rules.filter((r) => r.mill_canonical);
  }

  private calculateRelevance(tip: MillTribalAugTip, response: string, query: string): number {
    const combined = `${response} ${query}`.toLowerCase();
    let score = 0;
    const matched = tip.keywords.filter((k) => combined.includes(k.toLowerCase()));
    score += (matched.length / Math.max(1, tip.keywords.length)) * 0.55;
    if (tip.material && combined.includes(tip.material.toLowerCase())) score += 0.12;
    if (tip.operation && combined.includes(tip.operation.toLowerCase())) score += 0.12;
    if (tip.machine && combined.includes(tip.machine.toLowerCase())) score += 0.08;
    if (tip.controller && combined.includes(tip.controller.toLowerCase())) score += 0.08;
    score += (tip.priority / 10) * 0.1;
    return Math.min(1, score);
  }

  findRelevantTips(response: string, query: string): Array<{ tip: MillTribalAugTip; relevance: number }> {
    // MILL-CANONICAL: optionally restrict by axis_mode
    const pool = this.config.axis_mode_filter
      ? this.tips.filter((t) => t.axis_mode === this.config.axis_mode_filter || t.axis_mode === "shared")
      : this.tips;

    const scored = pool.map((tip) => ({ tip, relevance: this.calculateRelevance(tip, response, query) }));
    return scored
      .filter((s) => s.relevance >= this.config.min_relevance_score)
      .sort((a, b) => {
        const aScore = a.relevance + a.tip.priority / 10;
        const bScore = b.relevance + b.tip.priority / 10;
        return bScore - aScore;
      })
      .slice(0, this.config.max_tips_per_response);
  }

  checkRules(response: string, query: string): MillPlaybookRule[] {
    const lower = response.toLowerCase();
    const combined = `${response} ${query}`.toLowerCase();
    const triggered: MillPlaybookRule[] = [];

    for (const rule of this.rules) {
      let matches = false;

      // Lathe-shared rules
      if (rule.id === "rule-001") {
        const sfmMatch = response.match(/(\d+)\s*sfm/i);
        if (sfmMatch && parseInt(sfmMatch[1]) > 500 && lower.includes("steel")) matches = true;
      } else if (rule.id === "rule-002") {
        if (lower.includes("g96") && !lower.includes("g50")) matches = true;
      } else if (rule.id === "rule-003") {
        const docMatch = response.match(/0\.(\d{3})/);
        if (docMatch && parseInt(docMatch[1]) > 200 && lower.includes("finish")) matches = true;
      } else if (rule.id === "rule-005") {
        if (
          lower.includes("steel") &&
          !lower.includes("coolant") &&
          !lower.includes("m08") &&
          !lower.includes("flood")
        ) {
          matches = true;
        }
      } else if (rule.id === "rule-006") {
        if (lower.includes("g00") && !lower.includes("clearance") && !lower.includes("verify")) matches = true;
      } else if (rule.id === "rule-007") {
        if (lower.includes("tap") && !lower.includes("rigid") && !lower.includes("m29") && !lower.includes("g84")) {
          matches = true;
        }
      }

      // MILL-CANONICAL rules
      else if (rule.id === "mill-rule-001") {
        // any chatter mention → critical
        if (combined.includes("chatter") || combined.includes("vibration") || combined.includes("regen")) matches = true;
      } else if (rule.id === "mill-rule-002") {
        // 5-axis simul without TCPM enable
        const hasSimul = combined.includes("5-axis") || combined.includes("simul") || combined.includes("simultaneous");
        const hasTcpm =
          combined.includes("tcpm") ||
          combined.includes("m128") ||
          combined.includes("g43.4") ||
          combined.includes("cycle 19") ||
          combined.includes("cycle19");
        if (hasSimul && !hasTcpm) matches = true;
      } else if (rule.id === "mill-rule-003") {
        // long endmill + aggressive ae
        const longMention =
          combined.includes("long") || combined.match(/l:d\s*>\s*4/i) || combined.match(/l\/d\s*>\s*4/i);
        const aeMatch = response.match(/ae\s*[=:]?\s*0?\.(\d+)\s*d/i);
        if (longMention && aeMatch && parseInt(aeMatch[1]) >= 5) matches = true;
      } else if (rule.id === "mill-rule-004") {
        // stainless + no coolant
        if (
          combined.includes("stainless") &&
          !combined.includes("coolant") &&
          !combined.includes("flood") &&
          !combined.includes("mql")
        ) {
          matches = true;
        }
      }

      if (matches) triggered.push(rule);
    }
    return triggered;
  }

  augment(response: string, query: string): MillAugmentationResult {
    const relevantTips = this.findRelevantTips(response, query);
    const triggeredRules = this.checkRules(response, query);
    const warnings: string[] = [];

    let augmented = response;
    const criticalRules = triggeredRules.filter((r) => r.severity === "critical");
    if (criticalRules.length > 0 && this.config.warn_on_anti_patterns) {
      const criticalWarnings = criticalRules.map((r) => `[CRITICAL] ${r.action}. ${r.rationale}`);
      warnings.push(...criticalWarnings);
      augmented = `${response}\n\n---\nCritical Safety Notes:\n${criticalWarnings.join("\n")}`;
    }

    if (relevantTips.length > 0) {
      const tipTexts = relevantTips.map(({ tip }) => {
        let text = `Tip: ${tip.content}`;
        if (this.config.include_rationale && tip.source !== "handbook") {
          text += ` (Source: ${tip.source}, axis: ${tip.axis_mode})`;
        }
        return text;
      });
      augmented += `\n\nShop Floor Tips:\n${tipTexts.join("\n")}`;
    }

    const otherRules = triggeredRules.filter((r) => r.severity !== "critical");
    for (const rule of otherRules) {
      warnings.push(`${rule.severity.toUpperCase()}: ${rule.action}`);
    }

    const millCanonicalRulesTriggered = triggeredRules.filter((r) => r.mill_canonical).length;
    const confidenceBoost = Math.min(
      0.15,
      relevantTips.length * 0.03 + (criticalRules.length > 0 ? 0.05 : 0) + (millCanonicalRulesTriggered > 0 ? 0.03 : 0),
    );

    return {
      original_response: response,
      augmented_response: augmented,
      tips_applied: relevantTips.map((t) => t.tip),
      rules_triggered: triggeredRules,
      warnings,
      confidence_boost: confidenceBoost,
      mill_canonical_rules_triggered: millCanonicalRulesTriggered,
    };
  }

  searchTips(keyword: string): MillTribalAugTip[] {
    const lower = keyword.toLowerCase();
    return this.tips.filter(
      (t) => t.keywords.some((k) => k.toLowerCase().includes(lower)) || t.content.toLowerCase().includes(lower),
    );
  }

  getTipsByMaterial(material: string): MillTribalAugTip[] {
    const lower = material.toLowerCase();
    return this.tips.filter(
      (t) =>
        t.material?.toLowerCase() === lower ||
        t.keywords.some((k) => k.toLowerCase() === lower),
    );
  }

  getTipsByOperation(operation: string): MillTribalAugTip[] {
    const lower = operation.toLowerCase();
    return this.tips.filter(
      (t) =>
        t.operation?.toLowerCase() === lower ||
        t.keywords.some((k) => k.toLowerCase() === lower),
    );
  }

  getStats(): {
    total_tips: number;
    tips_by_source: Record<string, number>;
    total_rules: number;
    rules_by_severity: Record<string, number>;
    mill_canonical_rules: number;
    tips_by_axis: Record<string, number>;
  } {
    const tipsBySource: Record<string, number> = {};
    const tipsByAxis: Record<string, number> = {};
    for (const tip of this.tips) {
      tipsBySource[tip.source] = (tipsBySource[tip.source] ?? 0) + 1;
      tipsByAxis[tip.axis_mode] = (tipsByAxis[tip.axis_mode] ?? 0) + 1;
    }
    const rulesBySeverity: Record<string, number> = { info: 0, warning: 0, critical: 0 };
    let canonical = 0;
    for (const rule of this.rules) {
      rulesBySeverity[rule.severity]++;
      if (rule.mill_canonical) canonical++;
    }
    return {
      total_tips: this.tips.length,
      tips_by_source: tipsBySource,
      total_rules: this.rules.length,
      rules_by_severity: rulesBySeverity,
      mill_canonical_rules: canonical,
      tips_by_axis: tipsByAxis,
    };
  }

  reset(): void {
    this.tips = [...JM_DIE_MILL_TIPS, ...MILL_CONTROLLER_TIPS];
    this.rules = [...PLAYBOOK_RULES];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRATribalAugmentationEngine = new MillLoRATribalAugmentationEngine();
export { MillLoRATribalAugmentationEngine };
