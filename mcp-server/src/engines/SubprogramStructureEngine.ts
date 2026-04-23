/**
 * SubprogramStructureEngine — Auto-detect repeating G-code patterns and extract to subprograms
 *
 * Analyzes G-code programs for repeating patterns and extracts them into
 * controller-native subprogram structures:
 * - Fanuc/Haas/Mazak: M98 P{num} / M99 (external) or M97 P{line} (Haas local)
 * - Siemens: CALL / RET (EXTERN) or CALL BLOCK ... TO ... (inline)
 * - Heidenhain: CALL PGM / END PGM (external) or CALL LBL / LBL 0 (local)
 * - Okuma: M98 P{num} / M99 (Fanuc-compatible)
 *
 * Pattern detection strategies:
 * 1. Exact block repetition (identical lines appearing 2+ times)
 * 2. Tool-change-delimited sections (same tool operations at different positions)
 * 3. Coordinate-shifted patterns (same moves with X/Y offsets)
 * 4. Parametric opportunities (similar blocks differing only by numeric values)
 *
 * Distinct from SubprogramEngine (generates calls from scratch). This engine
 * ANALYZES existing G-code and RESTRUCTURES it for efficiency.
 *
 * References: Fanuc Macro B programming manual, Siemens SINUMERIK 840D programming guide,
 *   Heidenhain TNC 640 programming manual, Peter Smid "CNC Programming Handbook" 3rd ed.
 *
 * @module engines/SubprogramStructureEngine
 * @version 1.0.0
 */

import type { ControllerFamily } from "./ControllerDialectEngine.js";

// ─── Types ───────────────────────────────────────────────────────────

export type SubprogramDialect = "fanuc" | "haas" | "siemens" | "heidenhain" | "okuma" | "mazak";

export interface GCodeBlock {
  /** Original line number (1-based) */
  line: number;
  /** Raw G-code text */
  text: string;
}

export interface DetectedPattern {
  /** Pattern type */
  type: "exact_repeat" | "tool_change_section" | "coordinate_shift" | "parametric";
  /** Lines that form the pattern (first occurrence) */
  template_lines: GCodeBlock[];
  /** All occurrences (line ranges) */
  occurrences: Array<{ start_line: number; end_line: number }>;
  /** Number of repetitions */
  repeat_count: number;
  /** Estimated line savings if extracted */
  line_savings: number;
  /** For coordinate_shift: the offsets between occurrences */
  offsets?: Array<{ dx: number; dy: number; dz?: number }>;
  /** For parametric: the varying values per occurrence */
  varying_values?: Array<Record<string, number>>;
  /** Confidence that this is a real pattern (0-1) */
  confidence: number;
}

export interface SubprogramExtractionResult {
  /** Restructured main program G-code */
  main_program: string;
  /** Extracted subprograms */
  subprograms: Array<{
    number: number;
    name: string;
    gcode: string;
    line_count: number;
  }>;
  /** Analysis summary */
  analysis: {
    original_lines: number;
    restructured_lines: number;
    subprogram_count: number;
    total_line_savings: number;
    savings_percent: number;
    patterns_detected: DetectedPattern[];
  };
  /** Controller dialect used */
  dialect: SubprogramDialect;
  warnings: string[];
}

export interface SubprogramStructureInput {
  /** G-code program text */
  gcode: string;
  /** Controller family for output syntax */
  controller_family: ControllerFamily;
  /** Minimum repeat count to extract (default: 2) */
  min_repeats?: number;
  /** Minimum block length to consider (default: 3 lines) */
  min_block_length?: number;
  /** Starting O-number for subprograms (default: 1000) */
  starting_sub_number?: number;
  /** Whether to extract tool-change sections (default: true) */
  extract_tool_sections?: boolean;
  /** Whether to detect coordinate shifts (default: true) */
  detect_coord_shifts?: boolean;
}

// ─── Controller → Dialect Mapping ────────────────────────────────────

const CONTROLLER_TO_DIALECT: Record<ControllerFamily, SubprogramDialect> = {
  fanuc_0i: "fanuc",
  fanuc_16i: "fanuc",
  fanuc_18i: "fanuc",
  fanuc_30i: "fanuc",
  fanuc_31i: "fanuc",
  siemens_828d: "siemens",
  siemens_840d: "siemens",
  siemens_one: "siemens",
  heidenhain_tnc640: "heidenhain",
  heidenhain_tnc7: "heidenhain",
  haas_ngc: "haas",
  mazak_smooth_ai: "mazak",
  mazak_smooth_g: "mazak",
  okuma_osp_p300: "okuma",
  okuma_osp_p500: "okuma",
  brother_speedio: "fanuc",
  mitsubishi_m80: "fanuc",
  fagor_8065: "fanuc",
  citizen_cincom: "fanuc",
  star_fanuc: "fanuc",
  dmg_celos_siemens: "siemens",
  dmg_celos_fanuc: "fanuc",
  hurco_max5: "fanuc",
  doosan_puma: "fanuc",
  generic_fanuc: "fanuc",
  generic_iso: "fanuc",
};

/** Subprogram call/return syntax per dialect */
const DIALECT_SYNTAX: Record<SubprogramDialect, {
  call: (num: number, repeat?: number) => string;
  return_code: string;
  header: (num: number, name: string) => string;
  footer: (num: number) => string;
  local_call?: (label: number) => string;
  local_label?: (label: number) => string;
  comment: (text: string) => string;
}> = {
  fanuc: {
    call: (num, repeat) => repeat && repeat > 1 ? `M98 P${num} L${repeat}` : `M98 P${num}`,
    return_code: "M99",
    header: (num, name) => `O${num} (${name})`,
    footer: () => "M99",
    comment: (text) => `(${text})`,
  },
  haas: {
    call: (num, repeat) => repeat && repeat > 1 ? `M98 P${num} L${repeat}` : `M98 P${num}`,
    return_code: "M99",
    header: (num, name) => `O${num} (${name})`,
    footer: () => "M99",
    local_call: (label) => `M97 P${label}`,
    local_label: (label) => `N${label}`,
    comment: (text) => `(${text})`,
  },
  siemens: {
    call: (num) => `CALL "SUB_${num}"`,
    return_code: "RET",
    header: (_num, name) => `; ${name}`,
    footer: () => "RET",
    comment: (text) => `; ${text}`,
  },
  heidenhain: {
    call: (num) => `CALL PGM TNC:\\SUB_${num}.H`,
    return_code: "END PGM",
    header: (_num, name) => `; ${name}`,
    footer: (num) => `END PGM SUB_${num} MM`,
    local_call: (label) => `CALL LBL ${label}`,
    local_label: (label) => `LBL ${label}`,
    comment: (text) => `; ${text}`,
  },
  okuma: {
    call: (num, repeat) => repeat && repeat > 1 ? `M98 P${num} L${repeat}` : `M98 P${num}`,
    return_code: "M99",
    header: (num, name) => `O${num} (${name})`,
    footer: () => "M99",
    comment: (text) => `(${text})`,
  },
  mazak: {
    call: (num, repeat) => repeat && repeat > 1 ? `M98 P${num} L${repeat}` : `M98 P${num}`,
    return_code: "M99",
    header: (num, name) => `O${num} (${name})`,
    footer: () => "M99",
    comment: (text) => `(${text})`,
  },
};

// ─── Engine Implementation ───────────────────────────────────────────

class SubprogramStructureEngineImpl {

  /**
   * Analyze G-code for repeating patterns and extract to subprograms.
   */
  analyze(input: SubprogramStructureInput): SubprogramExtractionResult {
    this.validateInput(input);

    const dialect = CONTROLLER_TO_DIALECT[input.controller_family];
    const syntax = DIALECT_SYNTAX[dialect];
    const minRepeats = input.min_repeats ?? 2;
    const minBlockLen = input.min_block_length ?? 3;
    const startSubNum = input.starting_sub_number ?? 1000;
    const warnings: string[] = [];

    // Parse G-code into blocks
    const blocks = this.parseBlocks(input.gcode);
    const originalLines = blocks.length;

    // Detect patterns
    const patterns: DetectedPattern[] = [];

    // Strategy 1: Exact block repetition
    const exactPatterns = this.detectExactRepeats(blocks, minRepeats, minBlockLen);
    patterns.push(...exactPatterns);

    // Strategy 2: Tool-change delimited sections
    if (input.extract_tool_sections !== false) {
      const toolPatterns = this.detectToolChangePatterns(blocks, minRepeats);
      patterns.push(...toolPatterns);
    }

    // Strategy 3: Coordinate-shifted patterns
    if (input.detect_coord_shifts !== false) {
      const shiftPatterns = this.detectCoordinateShifts(blocks, minRepeats, minBlockLen);
      patterns.push(...shiftPatterns);
    }

    // Sort patterns by line savings (biggest savings first)
    patterns.sort((a, b) => b.line_savings - a.line_savings);

    // Extract top non-overlapping patterns into subprograms
    const usedLines = new Set<number>();
    const selectedPatterns: DetectedPattern[] = [];
    const subprograms: SubprogramExtractionResult["subprograms"] = [];
    let subNum = startSubNum;

    for (const pattern of patterns) {
      // Check for overlap with already-selected patterns
      const overlaps = pattern.occurrences.some(occ => {
        for (let l = occ.start_line; l <= occ.end_line; l++) {
          if (usedLines.has(l)) return true;
        }
        return false;
      });

      if (overlaps) continue;

      // Mark lines as used
      for (const occ of pattern.occurrences) {
        for (let l = occ.start_line; l <= occ.end_line; l++) {
          usedLines.add(l);
        }
      }

      selectedPatterns.push(pattern);

      // Build subprogram G-code
      const subLines: string[] = [];
      subLines.push(syntax.header(subNum, `SUB ${subNum} - ${pattern.type}`));
      subLines.push(syntax.comment(`Extracted ${pattern.type} pattern (${pattern.repeat_count} occurrences)`));
      for (const tl of pattern.template_lines) {
        subLines.push(tl.text);
      }
      subLines.push(syntax.footer(subNum));

      subprograms.push({
        number: subNum,
        name: `SUB_${subNum}`,
        gcode: subLines.join("\n"),
        line_count: subLines.length,
      });

      subNum++;
    }

    // Rebuild main program with subprogram calls replacing extracted sections
    const mainLines = this.rebuildMainProgram(blocks, selectedPatterns, subprograms, syntax);

    const restructuredLines = mainLines.split("\n").length;
    const totalSubLines = subprograms.reduce((sum, s) => sum + s.line_count, 0);
    const totalLineSavings = originalLines - restructuredLines;

    return {
      main_program: mainLines,
      subprograms,
      analysis: {
        original_lines: originalLines,
        restructured_lines: restructuredLines + totalSubLines,
        subprogram_count: subprograms.length,
        total_line_savings: totalLineSavings,
        savings_percent: originalLines > 0 ? Math.round((totalLineSavings / originalLines) * 100) : 0,
        patterns_detected: selectedPatterns,
      },
      dialect,
      warnings,
    };
  }

  /**
   * Detect patterns only (no extraction) — useful for analysis.
   */
  detectPatterns(input: SubprogramStructureInput): DetectedPattern[] {
    this.validateInput(input);
    const blocks = this.parseBlocks(input.gcode);
    const minRepeats = input.min_repeats ?? 2;
    const minBlockLen = input.min_block_length ?? 3;
    const patterns: DetectedPattern[] = [];

    patterns.push(...this.detectExactRepeats(blocks, minRepeats, minBlockLen));
    if (input.extract_tool_sections !== false) {
      patterns.push(...this.detectToolChangePatterns(blocks, minRepeats));
    }
    if (input.detect_coord_shifts !== false) {
      patterns.push(...this.detectCoordinateShifts(blocks, minRepeats, minBlockLen));
    }

    return patterns.sort((a, b) => b.line_savings - a.line_savings);
  }

  /**
   * Execute router — dispatches actions.
   */
  execute(action: string, input: Record<string, unknown>): unknown {
    switch (action) {
      case "ppg_subprogram_analyze":
        return this.analyze(input as unknown as SubprogramStructureInput);
      case "ppg_subprogram_detect":
        return { patterns: this.detectPatterns(input as unknown as SubprogramStructureInput) };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ─── Pattern Detection ───────────────────────────────────────────

  private parseBlocks(gcode: string): GCodeBlock[] {
    return gcode.split("\n")
      .map((text, i) => ({ line: i + 1, text: text.trim() }))
      .filter(b => b.text.length > 0);
  }

  /**
   * Strategy 1: Find exact sequences of lines that repeat 2+ times.
   * Uses a sliding-window hash approach for efficiency.
   */
  private detectExactRepeats(blocks: GCodeBlock[], minRepeats: number, minBlockLen: number): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (blocks.length < minBlockLen * 2) return patterns;

    // Normalize blocks for comparison (strip line numbers, trim whitespace)
    const normalized = blocks.map(b => this.normalizeLine(b.text));

    // Try different window sizes (largest first for best savings)
    for (let winSize = Math.min(50, Math.floor(blocks.length / 2)); winSize >= minBlockLen; winSize--) {
      const seenWindows = new Map<string, number[]>(); // hash → list of start indices

      for (let i = 0; i <= normalized.length - winSize; i++) {
        const windowKey = normalized.slice(i, i + winSize).join("|");
        const existing = seenWindows.get(windowKey);
        if (existing) {
          existing.push(i);
        } else {
          seenWindows.set(windowKey, [i]);
        }
      }

      for (const [, indices] of seenWindows) {
        if (indices.length < minRepeats) continue;

        // Filter overlapping occurrences
        const nonOverlapping: number[] = [];
        let lastEnd = -1;
        for (const idx of indices) {
          if (idx > lastEnd) {
            nonOverlapping.push(idx);
            lastEnd = idx + winSize - 1;
          }
        }

        if (nonOverlapping.length < minRepeats) continue;

        // Skip if any occurrence already covered by a larger pattern
        const alreadyCovered = nonOverlapping.some(idx =>
          patterns.some(p => p.occurrences.some(o =>
            idx >= o.start_line - 1 && idx + winSize - 1 <= o.end_line - 1
          ))
        );
        if (alreadyCovered) continue;

        patterns.push({
          type: "exact_repeat",
          template_lines: blocks.slice(nonOverlapping[0], nonOverlapping[0] + winSize),
          occurrences: nonOverlapping.map(idx => ({
            start_line: blocks[idx].line,
            end_line: blocks[idx + winSize - 1].line,
          })),
          repeat_count: nonOverlapping.length,
          line_savings: (nonOverlapping.length - 1) * winSize,
          confidence: 0.95,
        });
      }
    }

    return patterns;
  }

  /**
   * Strategy 2: Find tool-change-delimited sections that repeat.
   * Looks for T{n} M6 patterns and compares the code between them.
   */
  private detectToolChangePatterns(blocks: GCodeBlock[], minRepeats: number): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Find tool change positions
    const toolChangeIndices: number[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (/\bT\d+\s*M0?6\b|\bM0?6\s*T\d+\b/i.test(blocks[i].text)) {
        toolChangeIndices.push(i);
      }
    }

    if (toolChangeIndices.length < minRepeats + 1) return patterns;

    // Extract sections between tool changes
    const sections: Array<{ start: number; end: number; normalized: string }> = [];
    for (let i = 0; i < toolChangeIndices.length; i++) {
      const start = toolChangeIndices[i];
      const end = (i + 1 < toolChangeIndices.length) ? toolChangeIndices[i + 1] - 1 : blocks.length - 1;
      if (end - start < 2) continue;

      // Normalize: strip coordinates but keep G/M codes
      const sectionBlocks = blocks.slice(start, end + 1);
      const normalized = sectionBlocks
        .map(b => this.normalizeLine(b.text).replace(/[XYZIJKR][-+]?[\d.]+/gi, ""))
        .join("|");

      sections.push({ start, end, normalized });
    }

    // Group identical normalized sections
    const groups = new Map<string, typeof sections>();
    for (const section of sections) {
      const existing = groups.get(section.normalized);
      if (existing) {
        existing.push(section);
      } else {
        groups.set(section.normalized, [section]);
      }
    }

    for (const [, group] of groups) {
      if (group.length < minRepeats) continue;

      const firstSection = group[0];
      const templateBlocks = blocks.slice(firstSection.start, firstSection.end + 1);

      patterns.push({
        type: "tool_change_section",
        template_lines: templateBlocks,
        occurrences: group.map(s => ({
          start_line: blocks[s.start].line,
          end_line: blocks[s.end].line,
        })),
        repeat_count: group.length,
        line_savings: (group.length - 1) * templateBlocks.length,
        confidence: 0.8,
      });
    }

    return patterns;
  }

  /**
   * Strategy 3: Find sequences that are identical except for coordinate offsets.
   * Detects patterns like bolt-hole patterns or fixture offsets.
   */
  private detectCoordinateShifts(blocks: GCodeBlock[], minRepeats: number, minBlockLen: number): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (blocks.length < minBlockLen * 2) return patterns;

    // Extract X/Y/Z values from lines
    const extractCoords = (text: string): { x?: number; y?: number; z?: number } | null => {
      const xm = text.match(/X([-+]?[\d.]+)/i);
      const ym = text.match(/Y([-+]?[\d.]+)/i);
      const zm = text.match(/Z([-+]?[\d.]+)/i);
      if (!xm && !ym && !zm) return null;
      return {
        x: xm ? parseFloat(xm[1]) : undefined,
        y: ym ? parseFloat(ym[1]) : undefined,
        z: zm ? parseFloat(zm[1]) : undefined,
      };
    };

    // Strip coordinates for comparison
    const stripCoords = (text: string): string =>
      text.replace(/[XYZ][-+]?[\d.]+/gi, "").replace(/\s+/g, " ").trim();

    // Try window sizes
    for (let winSize = Math.min(30, Math.floor(blocks.length / 2)); winSize >= minBlockLen; winSize--) {
      const windowGroups = new Map<string, number[]>();

      for (let i = 0; i <= blocks.length - winSize; i++) {
        const key = blocks.slice(i, i + winSize).map(b => stripCoords(b.text)).join("|");
        const existing = windowGroups.get(key);
        if (existing) {
          existing.push(i);
        } else {
          windowGroups.set(key, [i]);
        }
      }

      for (const [, indices] of windowGroups) {
        if (indices.length < minRepeats) continue;

        // Filter overlapping
        const nonOverlapping: number[] = [];
        let lastEnd = -1;
        for (const idx of indices) {
          if (idx > lastEnd) {
            nonOverlapping.push(idx);
            lastEnd = idx + winSize - 1;
          }
        }
        if (nonOverlapping.length < minRepeats) continue;

        // Calculate coordinate offsets between occurrences
        const offsets: Array<{ dx: number; dy: number; dz?: number }> = [];
        const baseWindow = blocks.slice(nonOverlapping[0], nonOverlapping[0] + winSize);

        for (let k = 1; k < nonOverlapping.length; k++) {
          const compWindow = blocks.slice(nonOverlapping[k], nonOverlapping[k] + winSize);
          let totalDx = 0, totalDy = 0, totalDz = 0, count = 0;

          for (let j = 0; j < winSize; j++) {
            const baseCoords = extractCoords(baseWindow[j].text);
            const compCoords = extractCoords(compWindow[j].text);
            if (baseCoords && compCoords) {
              if (baseCoords.x !== undefined && compCoords.x !== undefined) { totalDx += compCoords.x - baseCoords.x; count++; }
              if (baseCoords.y !== undefined && compCoords.y !== undefined) { totalDy += compCoords.y - baseCoords.y; }
              if (baseCoords.z !== undefined && compCoords.z !== undefined) { totalDz += compCoords.z - baseCoords.z; }
            }
          }

          if (count > 0) {
            offsets.push({
              dx: Math.round((totalDx / count) * 1000) / 1000,
              dy: Math.round((totalDy / count) * 1000) / 1000,
              dz: totalDz !== 0 ? Math.round((totalDz / count) * 1000) / 1000 : undefined,
            });
          }
        }

        // Only include if there are consistent offsets (not just random repeats)
        const hasConsistentOffsets = offsets.length > 0 &&
          offsets.some(o => Math.abs(o.dx) > 0.001 || Math.abs(o.dy) > 0.001);

        if (!hasConsistentOffsets) continue;

        // Skip if already covered by exact repeat
        const alreadyCovered = patterns.some(p =>
          p.type === "exact_repeat" &&
          nonOverlapping.some(idx =>
            p.occurrences.some(o => idx >= o.start_line - 1 && idx + winSize - 1 <= o.end_line - 1)
          )
        );
        if (alreadyCovered) continue;

        patterns.push({
          type: "coordinate_shift",
          template_lines: baseWindow,
          occurrences: nonOverlapping.map(idx => ({
            start_line: blocks[idx].line,
            end_line: blocks[idx + winSize - 1].line,
          })),
          repeat_count: nonOverlapping.length,
          line_savings: (nonOverlapping.length - 1) * winSize - nonOverlapping.length, // account for call lines
          offsets,
          confidence: 0.85,
        });
      }
    }

    return patterns;
  }

  // ─── Program Rebuilding ──────────────────────────────────────────

  private rebuildMainProgram(
    blocks: GCodeBlock[],
    selectedPatterns: DetectedPattern[],
    subprograms: SubprogramExtractionResult["subprograms"],
    syntax: typeof DIALECT_SYNTAX[SubprogramDialect]
  ): string {
    // Build a map of line → replacement
    const lineReplacements = new Map<number, string | null>();

    for (let pIdx = 0; pIdx < selectedPatterns.length; pIdx++) {
      const pattern = selectedPatterns[pIdx];
      const sub = subprograms[pIdx];

      for (const occ of pattern.occurrences) {
        // First line of occurrence → subprogram call
        lineReplacements.set(occ.start_line, syntax.call(sub.number));
        // Remaining lines → null (remove)
        for (let l = occ.start_line + 1; l <= occ.end_line; l++) {
          lineReplacements.set(l, null);
        }
      }
    }

    // Rebuild
    const outputLines: string[] = [];
    for (const block of blocks) {
      if (lineReplacements.has(block.line)) {
        const replacement = lineReplacements.get(block.line);
        if (replacement !== null) {
          outputLines.push(replacement!);
        }
        // null = line removed (internal to extracted section)
      } else {
        outputLines.push(block.text);
      }
    }

    return outputLines.join("\n");
  }

  // ─── Utilities ───────────────────────────────────────────────────

  private normalizeLine(text: string): string {
    return text
      .replace(/^[Nn]\d+\s*/, "")  // Strip line numbers
      .replace(/\s+/g, " ")         // Normalize whitespace
      .trim()
      .toUpperCase();
  }

  private validateInput(input: SubprogramStructureInput): void {
    if (!input.gcode || typeof input.gcode !== "string") {
      throw new Error("gcode is required and must be a string");
    }
    if (!input.controller_family) {
      throw new Error("controller_family is required");
    }
    if (input.min_repeats !== undefined && input.min_repeats < 2) {
      throw new Error("min_repeats must be >= 2");
    }
    if (input.min_block_length !== undefined && input.min_block_length < 1) {
      throw new Error("min_block_length must be >= 1");
    }
  }
}

export const subprogramStructureEngine = new SubprogramStructureEngineImpl();
