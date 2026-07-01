/**
 * OkumaDialectKnowledgeEngine — Comprehensive Okuma OSP dialect knowledge base
 *
 * Provides searchable knowledge about Okuma OSP-P300L/P500L controller dialects,
 * mined from real production programs and cross-referenced with programming manuals.
 *
 * Capabilities:
 *   - G-code / M-code lookup with Okuma-specific parameter details
 *   - Dialect difference mapping (Okuma → Fanuc/Haas equivalents)
 *   - Safety rule enforcement knowledge
 *   - Variable scope and naming convention reference
 *   - Threading, C-axis, bar feeder pattern knowledge
 *   - Real program pattern mining integration
 *
 * Integration points:
 *   - ControllerDialectEngine — syntax reference
 *   - TribalKnowledgeEngine — experience-based tips
 *   - MachiningPlaybookEngine — decision rules
 *   - LathePostProcessorEngine — output dialect formatting
 *   - SpeedFeedMinerEngine — calibration data
 *
 * @module OkumaDialectKnowledgeEngine
 */

import { log } from "../utils/Logger.js";
import {
  OKUMA_DIALECT_KNOWLEDGE,
  type OkumaDialectTip,
  type OkumaKnowledgeCategory,
} from "../data/okuma-dialect-knowledge.js";
import type { OkumaProgram, OkumaToolSection } from "./OkumaOSPParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OkumaKnowledgeSearchInput {
  query?: string;
  category?: OkumaKnowledgeCategory;
  categories?: OkumaKnowledgeCategory[];
  gcode?: string;
  mcode?: string;
  tags?: string[];
  osp_family?: "P200" | "P300" | "P500";
  operation_type?: string;
  machine_type?: "lathe" | "mill_turn" | "multitask";
  min_confidence?: number;
  limit?: number;
}

export interface OkumaKnowledgeSearchResult {
  tips: ScoredTip[];
  total_matches: number;
  query_summary: string;
}

export interface ScoredTip extends OkumaDialectTip {
  relevance_score: number;
}

export interface OkumaDialectDiff {
  okuma_code: string;
  fanuc_equivalent: string;
  description: string;
  critical: boolean;
}

export interface OkumaProgramAnalysis {
  gcodes_used: GCodeUsage[];
  mcodes_used: MCodeUsage[];
  dialect_features: string[];
  safety_issues: SafetyIssue[];
  tips_applicable: ScoredTip[];
  complexity_score: number;
}

export interface GCodeUsage {
  code: string;
  count: number;
  description: string;
  okuma_specific: boolean;
}

export interface MCodeUsage {
  code: string;
  count: number;
  description: string;
}

export interface SafetyIssue {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  tip_id: string;
}

export interface OkumaKnowledgeStats {
  total_tips: number;
  by_category: Record<string, number>;
  gcodes_documented: number;
  mcodes_documented: number;
  dialect_diffs: number;
  safety_rules: number;
  avg_confidence: number;
}

// ============================================================================
// DIALECT DIFFERENCE MAP
// ============================================================================

const DIALECT_DIFFS: OkumaDialectDiff[] = [
  { okuma_code: "G71", fanuc_equivalent: "G76", description: "Threading cycle (Okuma G71 = Fanuc G76)", critical: true },
  { okuma_code: "G85", fanuc_equivalent: "G71", description: "Profile roughing cycle (Okuma G85 = Fanuc G71)", critical: true },
  { okuma_code: "G87", fanuc_equivalent: "G70", description: "Profile finishing cycle (Okuma G87 = Fanuc G70)", critical: true },
  { okuma_code: "G4 F", fanuc_equivalent: "G4 P", description: "Dwell: Okuma F=seconds, Fanuc P=milliseconds", critical: true },
  { okuma_code: "L (arc)", fanuc_equivalent: "R (arc)", description: "Arc radius word: Okuma L = Fanuc R", critical: false },
  { okuma_code: "A (angle)", fanuc_equivalent: "(none)", description: "Angular move parameter (Okuma only)", critical: false },
  { okuma_code: "NAT labels", fanuc_equivalent: "(none)", description: "Tool section labels (Okuma only)", critical: false },
  { okuma_code: "T010101", fanuc_equivalent: "T0101", description: "6-digit vs 4-digit tool codes", critical: false },
  { okuma_code: "/CALL", fanuc_equivalent: "M98", description: "Subroutine call (internal vs external)", critical: false },
  { okuma_code: "/GOTO", fanuc_equivalent: "GOTO", description: "Jump to label vs sequence number", critical: false },
  { okuma_code: "M110/G138", fanuc_equivalent: "M19", description: "C-axis enable (two-step vs one-step)", critical: false },
  { okuma_code: "V1-V100", fanuc_equivalent: "#100-#199", description: "Local variable syntax", critical: false },
  { okuma_code: "VC100+", fanuc_equivalent: "#500-#999", description: "Common/persistent variable syntax", critical: false },
  { okuma_code: "G81 (label)", fanuc_equivalent: "N (block #)", description: "Profile definition: named label vs block numbers", critical: false },
  { okuma_code: "G50 S", fanuc_equivalent: "G50 S", description: "Max RPM clamp (same on both)", critical: false },
];

// ============================================================================
// G/M CODE DESCRIPTION MAPS (for program analysis)
// ============================================================================

const GCODE_DESCRIPTIONS: Record<string, { desc: string; okuma_specific: boolean }> = {
  "G0": { desc: "Rapid positioning", okuma_specific: false },
  "G1": { desc: "Linear interpolation (+ A-word angular)", okuma_specific: false },
  "G2": { desc: "Arc CW (L-radius)", okuma_specific: false },
  "G3": { desc: "Arc CCW (L-radius)", okuma_specific: false },
  "G4": { desc: "Dwell (F=seconds)", okuma_specific: true },
  "G10": { desc: "Offset setting", okuma_specific: false },
  "G28": { desc: "Home position return", okuma_specific: false },
  "G50": { desc: "Max RPM clamp", okuma_specific: false },
  "G71": { desc: "Threading cycle (NOT roughing)", okuma_specific: true },
  "G74": { desc: "Peck drilling (D/L params)", okuma_specific: true },
  "G76": { desc: "Short-form arc in profile", okuma_specific: true },
  "G80": { desc: "Canned cycle cancel", okuma_specific: false },
  "G81": { desc: "Profile label definition", okuma_specific: true },
  "G85": { desc: "Profile roughing cycle", okuma_specific: true },
  "G87": { desc: "Profile finishing cycle", okuma_specific: true },
  "G94": { desc: "Feed per minute", okuma_specific: false },
  "G95": { desc: "Feed per revolution", okuma_specific: false },
  "G96": { desc: "Constant surface speed (CSS)", okuma_specific: false },
  "G97": { desc: "Direct RPM", okuma_specific: false },
  "G119": { desc: "Spindle orient for C-axis", okuma_specific: true },
  "G136": { desc: "C-axis interpolation cancel", okuma_specific: true },
  "G138": { desc: "C-axis interpolation enable", okuma_specific: true },
  "G140": { desc: "Graphics lock", okuma_specific: true },
  "G180": { desc: "Graphics cancel", okuma_specific: true },
  "G270": { desc: "Graphics visibility", okuma_specific: true },
};

const MCODE_DESCRIPTIONS: Record<string, string> = {
  "M0": "Mandatory program stop",
  "M1": "Optional stop",
  "M2": "Program end",
  "M3": "Spindle CW",
  "M4": "Spindle CCW",
  "M5": "Spindle stop",
  "M8": "Coolant on (flood)",
  "M9": "Coolant off",
  "M12": "Feed per minute override",
  "M13": "Spindle CW + coolant",
  "M15": "Controller-specific",
  "M30": "Program end + rewind",
  "M32": "Right-hand thread",
  "M33": "Left-hand thread",
  "M41": "Low gear range",
  "M42": "High gear range",
  "M50": "Flood coolant",
  "M51": "Mist coolant",
  "M73": "Threading spring passes",
  "M75": "Threading constant infeed",
  "M109": "C-axis off",
  "M110": "C-axis on",
  "M146": "C-axis lock",
  "M147": "C-axis unlock",
};

// ============================================================================
// ENGINE
// ============================================================================

export class OkumaDialectKnowledgeEngine {
  private readonly tips: OkumaDialectTip[];

  constructor() {
    this.tips = [...OKUMA_DIALECT_KNOWLEDGE];
  }

  // ── Search ──────────────────────────────────────────────────────────────

  /**
   * Search the knowledge base with flexible filtering and relevance scoring.
   */
  search(input: OkumaKnowledgeSearchInput): OkumaKnowledgeSearchResult {
    let candidates = [...this.tips];

    // Category filter
    if (input.category) {
      candidates = candidates.filter(t => t.category === input.category);
    }
    if (input.categories?.length) {
      candidates = candidates.filter(t => input.categories!.includes(t.category));
    }

    // G-code filter
    if (input.gcode) {
      const code = input.gcode.toUpperCase();
      candidates = candidates.filter(
        t => t.gcodes?.includes(code) || t.title.toUpperCase().includes(code) || t.body.toUpperCase().includes(code),
      );
    }

    // M-code filter
    if (input.mcode) {
      const code = input.mcode.toUpperCase();
      candidates = candidates.filter(
        t => t.mcodes?.includes(code) || t.title.toUpperCase().includes(code) || t.body.toUpperCase().includes(code),
      );
    }

    // Tag filter
    if (input.tags?.length) {
      candidates = candidates.filter(t =>
        input.tags!.some(tag => t.tags.includes(tag)),
      );
    }

    // OSP family filter
    if (input.osp_family) {
      candidates = candidates.filter(t => t.osp_family.includes(input.osp_family!));
    }

    // Operation type filter
    if (input.operation_type) {
      candidates = candidates.filter(
        t => !t.operation_types || t.operation_types.includes(input.operation_type!),
      );
    }

    // Machine type filter
    if (input.machine_type) {
      candidates = candidates.filter(
        t => !t.machine_types || t.machine_types.includes(input.machine_type!),
      );
    }

    // Confidence filter
    if (input.min_confidence) {
      candidates = candidates.filter(t => t.confidence >= input.min_confidence!);
    }

    // Score by relevance
    const scored: ScoredTip[] = candidates.map(t => ({
      ...t,
      relevance_score: this._scoreRelevance(t, input),
    }));

    scored.sort((a, b) => b.relevance_score - a.relevance_score);

    const limit = input.limit ?? 20;
    const results = scored.slice(0, limit);

    return {
      tips: results,
      total_matches: scored.length,
      query_summary: this._buildQuerySummary(input, scored.length),
    };
  }

  // ── Lookup ──────────────────────────────────────────────────────────────

  /**
   * Look up a specific G-code's Okuma dialect details.
   */
  lookupGCode(code: string): OkumaDialectTip | undefined {
    const upper = code.toUpperCase().replace(/\s/g, "");
    return this.tips.find(t => t.gcodes?.includes(upper));
  }

  /**
   * Look up a specific M-code's Okuma dialect details.
   */
  lookupMCode(code: string): OkumaDialectTip | undefined {
    const upper = code.toUpperCase().replace(/\s/g, "");
    return this.tips.find(t => t.mcodes?.includes(upper));
  }

  /**
   * Get a tip by ID.
   */
  lookupById(id: string): OkumaDialectTip | undefined {
    return this.tips.find(t => t.id === id);
  }

  // ── Dialect Differences ─────────────────────────────────────────────────

  /**
   * Get the complete Okuma-to-Fanuc dialect difference map.
   */
  getDialectDiffs(): OkumaDialectDiff[] {
    return [...DIALECT_DIFFS];
  }

  /**
   * Get only critical dialect differences (ones that will cause crashes if confused).
   */
  getCriticalDiffs(): OkumaDialectDiff[] {
    return DIALECT_DIFFS.filter(d => d.critical);
  }

  /**
   * Translate an Okuma G-code to its Fanuc equivalent (if different).
   */
  translateToFanuc(okumaCode: string): string | null {
    const upper = okumaCode.toUpperCase().trim();
    const diff = DIALECT_DIFFS.find(d => d.okuma_code.toUpperCase().startsWith(upper));
    return diff ? diff.fanuc_equivalent : null;
  }

  // ── Program Analysis ────────────────────────────────────────────────────

  /**
   * Analyze a parsed Okuma program and return knowledge-enriched analysis.
   */
  analyzeProgram(program: OkumaProgram): OkumaProgramAnalysis {
    const gcodeUsage = this._extractGCodes(program);
    const mcodeUsage = this._extractMCodes(program);
    const dialectFeatures = this._identifyDialectFeatures(program);
    const safetyIssues = this._checkSafety(program);
    const applicableTips = this._findApplicableTips(program);
    const complexity = this._computeComplexity(program);

    return {
      gcodes_used: gcodeUsage,
      mcodes_used: mcodeUsage,
      dialect_features: dialectFeatures,
      safety_issues: safetyIssues,
      tips_applicable: applicableTips,
      complexity_score: complexity,
    };
  }

  // ── Statistics ──────────────────────────────────────────────────────────

  /**
   * Get knowledge base statistics.
   */
  stats(): OkumaKnowledgeStats {
    const byCategory: Record<string, number> = {};
    let gcodeCount = 0;
    let mcodeCount = 0;

    for (const tip of this.tips) {
      byCategory[tip.category] = (byCategory[tip.category] ?? 0) + 1;
      if (tip.gcodes?.length) gcodeCount += tip.gcodes.length;
      if (tip.mcodes?.length) mcodeCount += tip.mcodes.length;
    }

    const avgConf = this.tips.length > 0
      ? Math.round(this.tips.reduce((s, t) => s + t.confidence, 0) / this.tips.length)
      : 0;

    return {
      total_tips: this.tips.length,
      by_category: byCategory,
      gcodes_documented: gcodeCount,
      mcodes_documented: mcodeCount,
      dialect_diffs: DIALECT_DIFFS.length,
      safety_rules: this.tips.filter(t => t.category === "safety").length,
      avg_confidence: avgConf,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _scoreRelevance(tip: OkumaDialectTip, input: OkumaKnowledgeSearchInput): number {
    let score = tip.confidence / 100;

    // Exact G-code match bonus
    if (input.gcode && tip.gcodes?.includes(input.gcode.toUpperCase())) {
      score += 0.5;
    }

    // Exact M-code match bonus
    if (input.mcode && tip.mcodes?.includes(input.mcode.toUpperCase())) {
      score += 0.5;
    }

    // Query text match scoring
    if (input.query) {
      const query = input.query.toLowerCase();
      const tokens = query.split(/\s+/);
      let matchCount = 0;
      const searchText = `${tip.title} ${tip.body} ${tip.tags.join(" ")}`.toLowerCase();
      for (const token of tokens) {
        if (searchText.includes(token)) matchCount++;
      }
      score += (matchCount / tokens.length) * 0.4;
    }

    // Tag overlap bonus
    if (input.tags?.length) {
      const overlap = input.tags.filter(t => tip.tags.includes(t)).length;
      score += (overlap / input.tags.length) * 0.2;
    }

    return Math.round(score * 1000) / 1000;
  }

  private _buildQuerySummary(input: OkumaKnowledgeSearchInput, matchCount: number): string {
    const parts: string[] = [];
    if (input.query) parts.push(`query="${input.query}"`);
    if (input.category) parts.push(`category=${input.category}`);
    if (input.gcode) parts.push(`G-code=${input.gcode}`);
    if (input.mcode) parts.push(`M-code=${input.mcode}`);
    if (input.tags?.length) parts.push(`tags=[${input.tags.join(",")}]`);
    if (input.osp_family) parts.push(`family=${input.osp_family}`);
    return `${matchCount} matches for ${parts.join(", ") || "all tips"}`;
  }

  private _extractGCodes(program: OkumaProgram): GCodeUsage[] {
    const counts = new Map<string, number>();

    for (const line of program.rawLines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith("(") || trimmed.startsWith("N") && !trimmed.match(/^N\d/)) continue;

      const matches = trimmed.matchAll(/G(\d+\.?\d*)/g);
      for (const m of matches) {
        const code = `G${m[1]}`;
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([code, count]) => {
        const info = GCODE_DESCRIPTIONS[code];
        return {
          code,
          count,
          description: info?.desc ?? "Unknown",
          okuma_specific: info?.okuma_specific ?? false,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private _extractMCodes(program: OkumaProgram): MCodeUsage[] {
    const counts = new Map<string, number>();

    for (const line of program.rawLines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith("(")) continue;

      const matches = trimmed.matchAll(/M(\d+)/g);
      for (const m of matches) {
        const code = `M${m[1]}`;
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([code, count]) => ({
        code,
        count,
        description: MCODE_DESCRIPTIONS[code] ?? "Machine-specific",
      }))
      .sort((a, b) => b.count - a.count);
  }

  private _identifyDialectFeatures(program: OkumaProgram): string[] {
    const features: string[] = [];

    if (program.toolSections.some(s => s.label.startsWith("NAT"))) {
      features.push("NAT tool section labels");
    }
    if (program.toolSections.some(s => s.toolCode && s.toolCode.replace(/^T/i, "").length === 6)) {
      features.push("6-digit tool codes");
    }
    if (program.hasCAxis) features.push("C-axis positioning (M110/G138)");
    if (program.hasLiveTooling) features.push("Live tooling");
    if (program.hasBarFeeder) features.push("Bar feeder loop (/CALL OBAR)");
    if (program.hasThreading) features.push("Okuma G71 threading");
    if (program.hasMacroVariables) features.push("V/VC macro variables");
    if (program.subroutineCalls.length > 0) features.push("/CALL subroutines");

    // Check for angular moves (A word)
    const hasAngular = program.rawLines.some(l =>
      /G1.*A\d+/i.test(l) && !l.trim().startsWith("("),
    );
    if (hasAngular) features.push("Angular moves (A parameter)");

    // Check for L-radius arcs
    const hasLRadius = program.rawLines.some(l =>
      /G[23].*L\d*\./i.test(l) && !l.trim().startsWith("("),
    );
    if (hasLRadius) features.push("L-radius arcs (Okuma arc format)");

    // Check for DEF WORK
    const hasGraphics = program.rawLines.some(l =>
      l.trim().toUpperCase().startsWith("DEF WORK"),
    );
    if (hasGraphics) features.push("DEF WORK graphics block");

    return features;
  }

  private _checkSafety(program: OkumaProgram): SafetyIssue[] {
    const issues: SafetyIssue[] = [];

    // CSS without G50
    const usesCSS = program.toolSections.some(s => s.speedMode === "css");
    if (usesCSS && program.safety.g50MaxRPM.length === 0) {
      issues.push({
        severity: "critical",
        code: "CSS_NO_CLAMP",
        message: "Program uses G96 (CSS) without G50 speed clamp — spindle will over-speed at small diameters",
        tip_id: "okuma_safety_g50",
      });
    }

    // No spindle stop before end
    if (!program.safety.hasSpindleStop) {
      issues.push({
        severity: "warning",
        code: "NO_SPINDLE_STOP",
        message: "No M5 spindle stop found before program end",
        tip_id: "okuma_safety_spindle_stop",
      });
    }

    // Insufficient retracts
    if (program.toolSections.length > 1 &&
        program.safety.retractPositions.length < program.toolSections.length - 1) {
      issues.push({
        severity: "warning",
        code: "MISSING_RETRACTS",
        message: `Only ${program.safety.retractPositions.length} safe retracts for ${program.toolSections.length} tool sections`,
        tip_id: "okuma_safety_retract",
      });
    }

    // Coolant imbalance
    if (program.safety.coolantOnCount > 0 && program.safety.coolantOffCount === 0) {
      issues.push({
        severity: "warning",
        code: "COOLANT_IMBALANCE",
        message: "Coolant turned on but never turned off",
        tip_id: "okuma_safety_coolant",
      });
    }

    // Bar feeder without loop
    if (program.hasBarFeeder) {
      const hasLoop = program.rawLines.some(l => /\/GOTO\s+NBAR/i.test(l));
      if (!hasLoop) {
        issues.push({
          severity: "warning",
          code: "BARFEEDER_NO_LOOP",
          message: "Bar feeder program without /GOTO NBAR loop — only one part will run",
          tip_id: "okuma_safety_barfeeder_loop",
        });
      }
    }

    return issues;
  }

  private _findApplicableTips(program: OkumaProgram): ScoredTip[] {
    const tags: string[] = [];

    if (program.hasThreading) tags.push("threading");
    if (program.hasCAxis) tags.push("c-axis");
    if (program.hasBarFeeder) tags.push("bar-feeder");
    if (program.hasLiveTooling) tags.push("live-tooling");
    if (program.hasMacroVariables) tags.push("macro", "variable");

    for (const section of program.toolSections) {
      if (section.speedMode === "css") tags.push("css");
      for (const op of section.operations) {
        if (op.type === "drill" || op.type === "peck_drill") tags.push("drilling");
        if (op.type === "groove" || op.type === "cutoff") tags.push("grooving");
      }
    }

    if (tags.length === 0) return [];

    const result = this.search({ tags: [...new Set(tags)], limit: 10 });
    return result.tips;
  }

  private _computeComplexity(program: OkumaProgram): number {
    let score = 0;

    // Tool count
    score += Math.min(program.toolSections.length * 10, 50);

    // Feature flags
    if (program.hasCAxis) score += 15;
    if (program.hasLiveTooling) score += 15;
    if (program.hasBarFeeder) score += 10;
    if (program.hasThreading) score += 10;
    if (program.hasMacroVariables) score += 10;

    // Line count contribution (diminishing returns)
    score += Math.min(Math.log2(program.lineCount + 1) * 3, 20);

    // Subroutine complexity
    score += Math.min(program.subroutineCalls.length * 5, 15);

    return Math.min(Math.round(score), 100);
  }
}

export const okumaDialectKnowledgeEngine = new OkumaDialectKnowledgeEngine();
