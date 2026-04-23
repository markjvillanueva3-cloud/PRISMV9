/**
 * BoxKnowledgeIntegrationEngine — Wire mined Box data into PRISM knowledge bases
 *
 * Takes output from all BOX-MS1 mining engines and feeds into:
 *   - SpeedFeedOrchestratorEngine — calibration data from shop floor programs
 *   - TribalKnowledgeEngine — operation sequencing and safety tips
 *   - MachiningPlaybookEngine — safety rules as enforceable playbook rules
 *   - OkumaDialectKnowledgeEngine — real-world pattern enrichment
 *
 * This is the bridge between raw mining output and PRISM's runtime knowledge.
 *
 * @module BoxKnowledgeIntegrationEngine
 */

import { log } from "../utils/Logger.js";
import type { SpeedFeedMineResult, SpeedFeedCalibrationEntry } from "./SpeedFeedMinerEngine.js";
import type { ToolMineResult } from "./ToolPatternMinerEngine.js";
import type { SequenceMineResult, SequenceDeviation } from "./OperationSequenceMinerEngine.js";
import type { MacroMineResult } from "./MacroPatternMinerEngine.js";
import type { SafetyMineResult, SafetyRule } from "./SafetyPatternMinerEngine.js";
import type { OkumaKnowledgeStats } from "./OkumaDialectKnowledgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface IntegrationInput {
  speed_feed?: SpeedFeedMineResult;
  tool_patterns?: ToolMineResult;
  sequences?: SequenceMineResult;
  macros?: MacroMineResult;
  safety?: SafetyMineResult;
}

export interface IntegrationResult {
  calibration_entries: CalibrationEntry[];
  tribal_tips: TribalTipEntry[];
  playbook_rules: PlaybookRuleEntry[];
  integration_stats: IntegrationStats;
}

export interface CalibrationEntry {
  material: string;
  operation: string;
  machine_type: string;
  recommended_speed: number;
  recommended_feed: number;
  confidence: number;
  source: string;
  css_mode: boolean;
}

export interface TribalTipEntry {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;
}

export interface PlaybookRuleEntry {
  id: string;
  category: string;
  severity: "critical" | "important" | "recommended" | "tip";
  title: string;
  rule: string;
  reasoning: string;
  source: string;
}

export interface IntegrationStats {
  calibration_entries_generated: number;
  tribal_tips_generated: number;
  playbook_rules_generated: number;
  source_programs: number;
  materials_covered: string[];
  operations_covered: string[];
  safety_rules_count: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class BoxKnowledgeIntegrationEngine {
  /**
   * Integrate all mined data into PRISM-compatible knowledge entries.
   */
  integrate(input: IntegrationInput): IntegrationResult {
    const calibration: CalibrationEntry[] = [];
    const tribal: TribalTipEntry[] = [];
    const playbook: PlaybookRuleEntry[] = [];
    const materials = new Set<string>();
    const operations = new Set<string>();
    let sourcePrograms = 0;

    // ── Speed/Feed → Calibration ────────────────────────────────────────
    if (input.speed_feed) {
      sourcePrograms = Math.max(sourcePrograms, input.speed_feed.summary.programs_analyzed);

      for (const cal of input.speed_feed.calibration_data) {
        calibration.push({
          material: cal.material,
          operation: cal.operation,
          machine_type: cal.machine_type,
          recommended_speed: cal.recommended_speed,
          recommended_feed: cal.recommended_feed,
          confidence: cal.confidence,
          source: "box_audit_speed_feed_mining",
          css_mode: cal.source === "physics_corrected",
        });
        materials.add(cal.material);
        operations.add(cal.operation);
      }

      // Add outlier warnings as tribal tips (stddev indicates outlier dispersion)
      for (const stat of input.speed_feed.stats) {
        if (stat.speed_stddev > stat.speed_mean * 0.3) {
          tribal.push({
            id: `box_sf_outlier_${stat.material}_${stat.operation}`,
            title: `Speed/feed outliers: ${stat.material} ${stat.operation}`,
            body: `High variation in speeds/feeds for ${stat.material} ${stat.operation} on ${stat.machine_type} (stddev=${stat.speed_stddev.toFixed(0)}). Median speed: ${stat.speed_median}, median feed: ${stat.feed_median}. Review flagged programs for potential errors or intentional deviations.`,
            category: "speeds_feeds",
            tags: [stat.material, stat.operation, "outlier", "box-audit"],
            confidence: 70,
            source: "box_audit_speed_feed_mining",
          });
        }
      }
    }

    // ── Tool Patterns → Tribal Tips ─────────────────────────────────────
    if (input.tool_patterns) {
      sourcePrograms = Math.max(sourcePrograms, input.tool_patterns.stats.total_programs);

      // Station assignment patterns
      for (const sp of input.tool_patterns.station_patterns.slice(0, 12)) {
        tribal.push({
          id: `box_tool_station_${sp.station}`,
          title: `Station T${String(sp.station).padStart(2, "0")} — ${sp.most_common_operation}`,
          body: `Tool station ${sp.station} is most commonly used for ${sp.most_common_operation} (${sp.usage_count} occurrences). ${sp.css_pct}% use CSS mode. Common descriptions: ${sp.common_descriptions.join(", ") || "N/A"}. Speed range: ${sp.typical_speed_range[0]}-${sp.typical_speed_range[1]} RPM.`,
          category: "tooling",
          tags: ["station-assignment", sp.most_common_operation, "box-audit"],
          confidence: Math.min(95, 50 + sp.usage_count * 5),
          source: "box_audit_tool_pattern_mining",
        });
      }

      // Insert patterns
      for (const ip of input.tool_patterns.insert_patterns) {
        tribal.push({
          id: `box_insert_r${ip.nose_radius.toFixed(3).replace(".", "")}`,
          title: `Insert R${ip.nose_radius} — ${ip.operations.join(", ")}`,
          body: `Nose radius ${ip.nose_radius}" used for ${ip.operations.join(", ")} operations. Found on stations: ${ip.typical_stations.map(s => `T${String(s).padStart(2, "0")}`).join(", ")}. Frequency: ${ip.frequency} programs.`,
          category: "tooling",
          tags: ["insert", "nose-radius", "box-audit"],
          confidence: Math.min(90, 50 + ip.frequency * 5),
          source: "box_audit_tool_pattern_mining",
        });
      }

      // Turret templates
      for (const tt of input.tool_patterns.turret_templates) {
        tribal.push({
          id: `box_turret_${tt.name.toLowerCase().replace(/\s+/g, "_")}`,
          title: `Turret template: ${tt.name}`,
          body: `${tt.complexity} complexity, ${tt.typical_tool_count} tools. Station layout: ${tt.stations.map(s => `T${String(s.station).padStart(2, "0")}=${s.operation}`).join(", ")}. Used in ${tt.frequency} programs (e.g., ${tt.example_programs.join(", ")}).`,
          category: "setup",
          tags: ["turret-layout", "template", tt.complexity, "box-audit"],
          confidence: Math.min(85, 40 + tt.frequency * 10),
          source: "box_audit_tool_pattern_mining",
        });
      }
    }

    // ── Sequence Patterns → Tribal Tips + Playbook Rules ────────────────
    if (input.sequences) {
      sourcePrograms = Math.max(sourcePrograms, input.sequences.stats.total_programs);

      // Standard sequences as tips
      for (const pat of input.sequences.patterns.filter(p => p.frequency >= 3).slice(0, 5)) {
        tribal.push({
          id: `box_seq_${pat.sequence.join("_").substring(0, 40)}`,
          title: `Standard operation sequence (${pat.frequency} programs)`,
          body: `Operation order: ${pat.sequence.join(" → ")}. Used by ${pat.frequency} programs. This is the proven shop floor sequence for this operation set.`,
          category: "setup",
          tags: ["operation-sequence", "standard", "box-audit"],
          confidence: Math.min(95, 60 + pat.frequency * 3),
          source: "box_audit_sequence_mining",
        });
      }

      // Risky sequences as playbook rules
      for (const dev of input.sequences.deviations) {
        if (dev.severity === "error") {
          playbook.push({
            id: `box_seq_risk_${dev.operation.replace(/[^a-z0-9]/gi, "_")}`,
            category: "sequencing",
            severity: "critical",
            title: `Risky sequence: ${dev.operation}`,
            rule: dev.reason,
            reasoning: `Detected in program ${dev.program_id} (${dev.filename}) during Box drive audit. This sequence can cause tool breakage, part damage, or machine crash.`,
            source: "box_audit_sequence_mining",
          });
        }
      }
    }

    // ── Safety Patterns → Playbook Rules ────────────────────────────────
    if (input.safety) {
      sourcePrograms = Math.max(sourcePrograms, input.safety.stats.total_programs);

      for (const rule of input.safety.safety_rules) {
        playbook.push({
          id: `box_safety_${rule.id.toLowerCase()}`,
          category: rule.severity === "critical" ? "safety" : "setup_strategy",
          severity: rule.severity === "critical" ? "critical" : "recommended",
          title: rule.title,
          rule: rule.description,
          reasoning: `Established from ${rule.source_program_count} real production programs. ${rule.typical_values}. Enforcement: ${rule.enforcement}.`,
          source: "box_audit_safety_mining",
        });
      }

      // Speed clamp patterns as tribal tips
      for (const clamp of input.safety.speed_clamps.slice(0, 5)) {
        tribal.push({
          id: `box_g50_${clamp.max_rpm}`,
          title: `G50 S${clamp.max_rpm} — ${clamp.operations.join(", ") || "general"}`,
          body: `G50 S${clamp.max_rpm} used in ${clamp.frequency} programs for ${clamp.operations.join(", ") || "general CSS operations"}. This is a shop-validated safe maximum RPM value.`,
          category: "safety",
          tags: ["g50", "speed-clamp", "css", "box-audit"],
          confidence: Math.min(95, 60 + clamp.frequency * 3),
          source: "box_audit_safety_mining",
        });
      }
    }

    // ── Macro Patterns → Tribal Tips ────────────────────────────────────
    if (input.macros && input.macros.stats.programs_with_macros > 0) {
      // Variable naming convention tips
      const dimVars = input.macros.variable_patterns
        .filter(v => v.typical_purpose.includes("dimension") || v.typical_purpose.includes("diameter"))
        .slice(0, 5);

      if (dimVars.length > 0) {
        tribal.push({
          id: "box_macro_var_dims",
          title: "Okuma macro variable convention — Part dimensions",
          body: `Part dimension variables: ${dimVars.map(v => `${v.name}=${v.typical_purpose} (range ${v.range[0]}-${v.range[1]})`).join(", ")}. This naming convention should be followed in all new parametric programs.`,
          category: "setup",
          tags: ["macro", "variable", "convention", "box-audit"],
          confidence: 80,
          source: "box_audit_macro_mining",
        });
      }

      // RPM formula patterns
      for (const formula of input.macros.rpm_formulas) {
        tribal.push({
          id: `box_macro_rpm_${formula.unit_system}`,
          title: `RPM calculation formula (${formula.unit_system})`,
          body: formula.description,
          category: "speeds_feeds",
          tags: ["macro", "rpm", "formula", formula.unit_system, "box-audit"],
          confidence: 90,
          source: "box_audit_macro_mining",
        });
      }
    }

    return {
      calibration_entries: calibration,
      tribal_tips: tribal,
      playbook_rules: playbook,
      integration_stats: {
        calibration_entries_generated: calibration.length,
        tribal_tips_generated: tribal.length,
        playbook_rules_generated: playbook.length,
        source_programs: sourcePrograms,
        materials_covered: [...materials],
        operations_covered: [...operations],
        safety_rules_count: input.safety?.safety_rules.length ?? 0,
      },
    };
  }
}

export const boxKnowledgeIntegrationEngine = new BoxKnowledgeIntegrationEngine();
