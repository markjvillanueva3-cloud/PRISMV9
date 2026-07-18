/**
 * PostProcessorTrainerEngine — Calibrate PRISM post processor output from mined programs
 *
 * Compares PRISM-generated code structure against real production programs:
 *   1. Parse a reference program into abstract operations
 *   2. Identify structural elements (tool changes, speed modes, cycles, safety codes)
 *   3. Compare against expected dialect patterns for the controller
 *   4. Report differences (structural mismatches vs. S/F value differences)
 *   5. Generate dialect calibration patches
 *
 * Goal: PRISM output structurally identical to shop-written code
 * (S/F values will differ — that's the optimization)
 *
 * @module PostProcessorTrainerEngine
 */

import { log } from "../utils/Logger.js";
import { controllerKnowledgeDBEngine } from "./ControllerKnowledgeDBEngine.js";
import type { ControllerFamily } from "./ControllerKnowledgeDBEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Structural element extracted from a program */
export interface StructuralElement {
  type: "tool_change" | "speed_mode" | "canned_cycle" | "safety_code" |
        "coolant" | "subroutine" | "comment_style" | "line_format";
  line: number;
  code: string;
  details: string;
}

/** Difference between reference and generated programs */
export interface DialectDiff {
  /** Difference category */
  category: "structure" | "format" | "code_choice" | "parameter" | "order";
  /** Severity: critical = wrong G-code, minor = formatting */
  severity: "critical" | "major" | "minor";
  /** Description of difference */
  description: string;
  /** Line in reference */
  ref_line?: number;
  /** What reference has */
  ref_value: string;
  /** What generated has */
  gen_value: string;
  /** Suggested fix */
  fix: string;
}

/** Dialect calibration patch */
export interface DialectPatch {
  controller: ControllerFamily;
  patches: Array<{
    rule: string;
    from: string;
    to: string;
    reason: string;
  }>;
  confidence: number;
}

/** Trainer input */
export interface PostTrainerInput {
  /** Reference program lines (real production code) */
  reference_lines: string[];
  /** Generated program lines (PRISM output) */
  generated_lines: string[];
  /** Controller family */
  controller: ControllerFamily;
}

/** Trainer result */
export interface PostTrainerResult {
  /** Structural elements found in reference */
  ref_structure: StructuralElement[];
  /** Structural elements found in generated */
  gen_structure: StructuralElement[];
  /** Differences found */
  diffs: DialectDiff[];
  /** Calibration patches to apply */
  patches: DialectPatch;
  /** Match percentage (0-100) */
  structural_match_pct: number;
  /** Summary */
  summary: {
    critical_diffs: number;
    major_diffs: number;
    minor_diffs: number;
    total_ref_elements: number;
    total_gen_elements: number;
    match_pct: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class PostProcessorTrainerEngine {
  /**
   * Compare reference and generated programs, produce dialect calibration.
   */
  train(input: PostTrainerInput): PostTrainerResult {
    const refStructure = this._extractStructure(input.reference_lines, input.controller);
    const genStructure = this._extractStructure(input.generated_lines, input.controller);
    const diffs = this._findDiffs(refStructure, genStructure, input);
    const patches = this._generatePatches(diffs, input.controller);

    const critical = diffs.filter(d => d.severity === "critical").length;
    const major = diffs.filter(d => d.severity === "major").length;
    const minor = diffs.filter(d => d.severity === "minor").length;

    const totalElements = refStructure.length;
    const matchPct = totalElements > 0
      ? Math.round((1 - critical / totalElements) * 100)
      : 100;

    log.info(
      `[PostProcessorTrainer] ${input.controller}: ${matchPct}% match, ` +
      `${critical} critical, ${major} major, ${minor} minor diffs`,
    );

    return {
      ref_structure: refStructure,
      gen_structure: genStructure,
      diffs,
      patches,
      structural_match_pct: matchPct,
      summary: {
        critical_diffs: critical,
        major_diffs: major,
        minor_diffs: minor,
        total_ref_elements: refStructure.length,
        total_gen_elements: genStructure.length,
        match_pct: matchPct,
      },
    };
  }

  // ── Private ─────────────────────────────────────────────────────────

  /** Extract structural elements from program lines */
  private _extractStructure(
    lines: string[],
    controller: ControllerFamily,
  ): StructuralElement[] {
    const elements: StructuralElement[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim().toUpperCase();

      // Tool changes
      if (/^T\d{2}/.test(trimmed)) {
        const tFormat = trimmed.match(/^(T\d+)/)?.[1] ?? "";
        elements.push({
          type: "tool_change",
          line: i + 1,
          code: tFormat,
          details: `Tool change: ${tFormat} (${tFormat.length}-digit format)`,
        });
      }

      // Speed mode
      if (/G96/.test(trimmed)) {
        elements.push({ type: "speed_mode", line: i + 1, code: "G96", details: "CSS mode" });
      }
      if (/G97/.test(trimmed)) {
        elements.push({ type: "speed_mode", line: i + 1, code: "G97", details: "RPM mode" });
      }
      if (/G50\s+S/.test(trimmed)) {
        elements.push({ type: "safety_code", line: i + 1, code: "G50", details: "Speed clamp" });
      }

      // Canned cycles
      if (/G85/.test(trimmed)) elements.push({ type: "canned_cycle", line: i + 1, code: "G85", details: "OD roughing (Okuma)" });
      if (/G87/.test(trimmed)) elements.push({ type: "canned_cycle", line: i + 1, code: "G87", details: "OD finishing (Okuma)" });
      if (/G71/.test(trimmed) && controller === "okuma") {
        elements.push({ type: "canned_cycle", line: i + 1, code: "G71", details: "Threading (Okuma)" });
      }
      if (/G74/.test(trimmed)) elements.push({ type: "canned_cycle", line: i + 1, code: "G74", details: "Peck drill" });
      if (/G83/.test(trimmed)) elements.push({ type: "canned_cycle", line: i + 1, code: "G83", details: "Peck drill (Fanuc)" });

      // Safety codes
      if (/\bM1\b/.test(trimmed)) elements.push({ type: "safety_code", line: i + 1, code: "M1", details: "Optional stop" });
      if (/\bM5\b/.test(trimmed) && !/M50/.test(trimmed)) {
        elements.push({ type: "safety_code", line: i + 1, code: "M5", details: "Spindle stop" });
      }
      if (/\bM30\b/.test(trimmed)) elements.push({ type: "safety_code", line: i + 1, code: "M30", details: "Program end" });

      // Coolant
      if (/\bM8\b/.test(trimmed)) elements.push({ type: "coolant", line: i + 1, code: "M8", details: "Coolant ON" });
      if (/\bM9\b/.test(trimmed)) elements.push({ type: "coolant", line: i + 1, code: "M9", details: "Coolant OFF" });

      // Comment style
      if (/^\(/.test(trimmed)) elements.push({ type: "comment_style", line: i + 1, code: "()", details: "Parenthetical comment" });
    }

    return elements;
  }

  /** Find structural differences between reference and generated */
  private _findDiffs(
    refStructure: StructuralElement[],
    genStructure: StructuralElement[],
    input: PostTrainerInput,
  ): DialectDiff[] {
    const diffs: DialectDiff[] = [];

    // Check tool change format
    const refTools = refStructure.filter(e => e.type === "tool_change");
    const genTools = genStructure.filter(e => e.type === "tool_change");
    if (refTools.length !== genTools.length) {
      diffs.push({
        category: "structure",
        severity: "critical",
        description: `Tool change count mismatch: ref=${refTools.length}, gen=${genTools.length}`,
        ref_value: `${refTools.length} tool changes`,
        gen_value: `${genTools.length} tool changes`,
        fix: "Match tool count to reference program",
      });
    }

    // Check tool code format (6-digit vs 4-digit vs 2-digit)
    if (refTools.length > 0 && genTools.length > 0) {
      const refLen = refTools[0].code.length;
      const genLen = genTools[0].code.length;
      if (refLen !== genLen) {
        diffs.push({
          category: "format",
          severity: "major",
          description: `Tool code format: ref uses ${refLen}-char (${refTools[0].code}), gen uses ${genLen}-char (${genTools[0].code})`,
          ref_value: refTools[0].code,
          gen_value: genTools[0].code,
          fix: `Use ${refLen}-character T-codes`,
        });
      }
    }

    // Check safety codes present in both
    const refSafety = new Set(refStructure.filter(e => e.type === "safety_code").map(e => e.code));
    const genSafety = new Set(genStructure.filter(e => e.type === "safety_code").map(e => e.code));
    for (const code of refSafety) {
      if (!genSafety.has(code)) {
        diffs.push({
          category: "structure",
          severity: "critical",
          description: `Safety code ${code} missing from generated program`,
          ref_value: `${code} present`,
          gen_value: `${code} MISSING`,
          fix: `Add ${code} to generated output`,
        });
      }
    }

    // Check canned cycle dialect
    const refCycles = refStructure.filter(e => e.type === "canned_cycle");
    const genCycles = genStructure.filter(e => e.type === "canned_cycle");
    for (const rc of refCycles) {
      const matchInGen = genCycles.find(gc => gc.code === rc.code);
      if (!matchInGen) {
        // Check for dialect equivalent
        const equivalent = this._findEquivalent(rc.code, input.controller);
        const genEquiv = genCycles.find(gc => gc.code === equivalent);
        if (genEquiv) {
          diffs.push({
            category: "code_choice",
            severity: "major",
            description: `Wrong cycle dialect: ref uses ${rc.code} (${rc.details}), gen uses ${genEquiv.code}`,
            ref_line: rc.line,
            ref_value: rc.code,
            gen_value: genEquiv.code,
            fix: `Use ${rc.code} instead of ${genEquiv.code} for ${input.controller} dialect`,
          });
        }
      }
    }

    // Check coolant balance
    const refM8 = refStructure.filter(e => e.code === "M8").length;
    const refM9 = refStructure.filter(e => e.code === "M9").length;
    const genM8 = genStructure.filter(e => e.code === "M8").length;
    const genM9 = genStructure.filter(e => e.code === "M9").length;
    if (refM8 !== genM8 || refM9 !== genM9) {
      diffs.push({
        category: "structure",
        severity: "minor",
        description: `Coolant pattern: ref M8=${refM8}/M9=${refM9}, gen M8=${genM8}/M9=${genM9}`,
        ref_value: `M8×${refM8}, M9×${refM9}`,
        gen_value: `M8×${genM8}, M9×${genM9}`,
        fix: "Match coolant on/off pattern",
      });
    }

    return diffs;
  }

  /** Find Fanuc equivalent of an Okuma-specific code */
  private _findEquivalent(code: string, controller: ControllerFamily): string | null {
    if (controller === "okuma") {
      const map: Record<string, string> = {
        G85: "G71",  // Okuma roughing → Fanuc roughing
        G87: "G70",  // Okuma finishing → Fanuc finishing
        G71: "G76",  // Okuma threading → Fanuc threading
      };
      return map[code] ?? null;
    }
    return null;
  }

  /** Generate calibration patches from diffs */
  private _generatePatches(
    diffs: DialectDiff[],
    controller: ControllerFamily,
  ): DialectPatch {
    const patches: DialectPatch["patches"] = [];

    for (const diff of diffs) {
      if (diff.severity === "critical" || diff.severity === "major") {
        patches.push({
          rule: diff.category,
          from: diff.gen_value,
          to: diff.ref_value,
          reason: diff.description,
        });
      }
    }

    return {
      controller,
      patches,
      confidence: diffs.length === 0 ? 1.0 : Math.max(0.3, 1.0 - diffs.length * 0.1),
    };
  }
}

export const postProcessorTrainerEngine = new PostProcessorTrainerEngine();
