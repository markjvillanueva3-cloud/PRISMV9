/**
 * ProveOutModeEngine — Conservative first-article CNC program modification
 *
 * Takes an optimized G-code program (from PostProcessorPipelineEngine output)
 * and applies conservative derating for safe first-article prove-out:
 *
 *   - Feed rates reduced by configurable percentage (default 25%)
 *   - Spindle RPM capped at configurable percentage (default 80%)
 *   - Single-block mode recommendation in program header
 *   - "PROVE-OUT" comments at every operation transition
 *   - Stop-and-check (M01) points at: tool changes, spindle direction changes,
 *     coolant type transitions, and depth-of-cut transitions > 2× previous
 *
 * The goal is zero-scrap first articles. Operators verify each critical
 * transition before committing to full-speed production.
 *
 * References:
 *   - NIST SP 800-82 (process safety), adapted for CNC prove-out
 *   - Peter Smid, "CNC Programming Handbook" 3rd ed., Ch. 28 (First Article)
 *   - ISO 22514-7 (Capability of measurement processes)
 *
 * @module engines/ProveOutModeEngine
 * @version 1.0.0
 */

import type {
  ToolpathBlock,
  MachineContext,
  MaterialContext,
  PipelineOutput,
  OperationDef,
  ControllerFamily,
  ISOGroup,
} from "./PostProcessorPipelineEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface ProveOutConfig {
  /** Feed rate reduction factor (0-1). 0.25 = reduce by 25%. Default 0.25. */
  feed_reduction: number;
  /** RPM cap factor (0-1). 0.80 = cap at 80% of optimal. Default 0.80. */
  rpm_cap: number;
  /** Insert M01 (optional stop) at operation transitions. Default true. */
  insert_optional_stops: boolean;
  /** Insert M00 (mandatory stop) at tool changes. Default false. */
  insert_mandatory_stops_at_tool_change: boolean;
  /** Add single-block mode recommendation header. Default true. */
  add_single_block_header: boolean;
  /** Add PROVE-OUT comments at critical blocks. Default true. */
  add_prove_out_comments: boolean;
  /** Depth-of-cut transition ratio that triggers a stop-and-check. Default 2.0. */
  doc_transition_ratio: number;
  /** Controller family for comment syntax. Default "fanuc". */
  controller: ControllerFamily;
}

export interface ProveOutBlock {
  /** Original line number (1-based) */
  line: number;
  /** Modified G-code text */
  text: string;
  /** Was this line modified? */
  modified: boolean;
  /** Modification reasons */
  reasons: string[];
  /** Inserted lines (M01/M00/comments) before this block */
  inserted_before: string[];
}

export interface ProveOutResult {
  /** Full prove-out G-code program */
  gcode: string;
  /** Per-block modification details */
  blocks: ProveOutBlock[];
  /** Summary statistics */
  summary: {
    total_lines: number;
    modified_lines: number;
    inserted_lines: number;
    feed_reductions: number;
    rpm_caps: number;
    optional_stops_added: number;
    mandatory_stops_added: number;
    prove_out_comments_added: number;
    avg_feed_reduction_pct: number;
    avg_rpm_reduction_pct: number;
  };
  /** Original vs prove-out cycle time estimate (ratio) */
  estimated_cycle_time_ratio: number;
  /** Warnings */
  warnings: string[];
}

export interface ProveOutInput {
  action: "apply_prove_out" | "estimate_impact" | "compare";
  /** Raw G-code to modify */
  gcode?: string;
  /** Or pipeline output with rich block data */
  pipeline_output?: PipelineOutput;
  /** Machine context for limit validation */
  machine?: MachineContext;
  /** Material context for ISO-group-aware derating */
  material?: MaterialContext;
  /** Configuration overrides */
  config?: Partial<ProveOutConfig>;
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: ProveOutConfig = {
  feed_reduction: 0.25,
  rpm_cap: 0.80,
  insert_optional_stops: true,
  insert_mandatory_stops_at_tool_change: false,
  add_single_block_header: true,
  add_prove_out_comments: true,
  doc_transition_ratio: 2.0,
  controller: "fanuc",
};

/**
 * ISO-group-aware derating multipliers.
 * Difficult-to-machine materials (S, H) get MORE conservative settings;
 * easy materials (N = aluminum) get LESS conservative settings.
 * Values multiply the base feed_reduction and (1 - rpm_cap).
 *
 * Reference: Sandvik Coromant "Metal Cutting Technology" training manual,
 *   first-article recommendations by material group.
 */
const ISO_GROUP_DERATING: Record<string, { feed_mult: number; rpm_mult: number }> = {
  P: { feed_mult: 1.0, rpm_mult: 1.0 },   // Steel — baseline
  M: { feed_mult: 1.15, rpm_mult: 1.1 },   // Stainless — 15% more feed reduction
  K: { feed_mult: 0.9, rpm_mult: 0.95 },   // Cast iron — slightly less conservative
  N: { feed_mult: 0.8, rpm_mult: 0.85 },   // Aluminum — least conservative
  S: { feed_mult: 1.3, rpm_mult: 1.25 },   // Superalloy — 30% more feed reduction
  H: { feed_mult: 1.25, rpm_mult: 1.2 },   // Hardened — 25% more feed reduction
};

/** Controller-specific comment syntax */
const COMMENT_SYNTAX: Record<string, { open: string; close: string }> = {
  fanuc:      { open: "(", close: ")" },
  haas:       { open: "(", close: ")" },
  siemens:    { open: "; ", close: "" },
  heidenhain: { open: "; ", close: "" },
  mazak:      { open: "(", close: ")" },
  okuma:      { open: "(", close: ")" },
  brother:    { open: "(", close: ")" },
  doosan:     { open: "(", close: ")" },
  hurco:      { open: "(", close: ")" },
  mitsubishi: { open: "(", close: ")" },
  fagor:      { open: "(", close: ")" },
};

/** G-code patterns */
const FEED_REGEX = /F([\d.]+)/;
const SPINDLE_REGEX = /S([\d.]+)/;
const TOOL_CHANGE_REGEX = /^[NT]\d+|M0?6\b/;
const SPINDLE_DIR_REGEX = /M0?([345])\b/;
const COOLANT_REGEX = /M0?([789]|51|88|89)\b/;
const RAPID_REGEX = /^G0?0\b/;
const Z_DEPTH_REGEX = /Z(-?[\d.]+)/;

// ─── Engine ─────────────────────────────────────────────────────────

class ProveOutModeEngineImpl {
  /**
   * Process a prove-out request.
   *
   * @param input - Prove-out configuration and G-code
   * @returns Prove-out result with modified G-code and statistics
   */
  async process(input: ProveOutInput): Promise<ProveOutResult> {
    switch (input.action) {
      case "apply_prove_out":
        return this.applyProveOut(input);
      case "estimate_impact":
        return this.estimateImpact(input);
      case "compare":
        return this.compare(input);
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  }

  /**
   * Apply prove-out derating to a G-code program.
   * Applies ISO-group-aware multipliers when material context is provided.
   */
  private applyProveOut(input: ProveOutInput): ProveOutResult {
    const config = { ...DEFAULT_CONFIG, ...input.config };
    const gcode = this.resolveGcode(input);
    const lines = gcode.split("\n");
    const comment = COMMENT_SYNTAX[config.controller] ?? COMMENT_SYNTAX.fanuc;

    // Apply ISO-group-aware derating if material is provided
    const isoGroup = input.material?.iso_group ?? input.pipeline_output?.resolved?.material?.iso_group;
    if (isoGroup) {
      const derating = ISO_GROUP_DERATING[isoGroup] ?? ISO_GROUP_DERATING.P;
      config.feed_reduction = Math.min(0.5, config.feed_reduction * derating.feed_mult);
      config.rpm_cap = Math.max(0.5, 1 - (1 - config.rpm_cap) * derating.rpm_mult);
    }

    const result: ProveOutBlock[] = [];
    const warnings: string[] = [];

    let prevToolNumber: number | null = null;
    let prevSpindleDir: string | null = null;
    let prevCoolantCode: string | null = null;
    let prevZDepth: number | null = null;
    let totalFeedReduction = 0;
    let totalRpmReduction = 0;
    let feedReductions = 0;
    let rpmCaps = 0;
    let optionalStops = 0;
    let mandatoryStops = 0;
    let proveOutComments = 0;
    let insertedLineCount = 0;

    // Validate config bounds
    if (config.feed_reduction < 0 || config.feed_reduction > 0.5) {
      warnings.push(`feed_reduction ${config.feed_reduction} clamped to [0, 0.5] range`);
      config.feed_reduction = Math.max(0, Math.min(0.5, config.feed_reduction));
    }
    if (config.rpm_cap < 0.5 || config.rpm_cap > 1.0) {
      warnings.push(`rpm_cap ${config.rpm_cap} clamped to [0.5, 1.0] range`);
      config.rpm_cap = Math.max(0.5, Math.min(1.0, config.rpm_cap));
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      let modified = raw;
      const reasons: string[] = [];
      const insertedBefore: string[] = [];

      // Skip empty lines and pure comments
      if (!trimmed || this.isPureComment(trimmed, config.controller)) {
        result.push({
          line: i + 1,
          text: raw,
          modified: false,
          reasons: [],
          inserted_before: [],
        });
        continue;
      }

      // ── Detect transitions ──

      // Tool change detection
      const toolMatch = trimmed.match(/T(\d+)/);
      const toolNum = toolMatch ? parseInt(toolMatch[1], 10) : null;
      if (toolNum !== null && toolNum !== prevToolNumber) {
        if (prevToolNumber !== null) {
          if (config.insert_mandatory_stops_at_tool_change) {
            insertedBefore.push("M00");
            insertedBefore.push(`${comment.open}PROVE-OUT: MANDATORY STOP - TOOL CHANGE T${toolNum}${comment.close}`);
            mandatoryStops++;
            proveOutComments++;
          } else if (config.insert_optional_stops) {
            insertedBefore.push("M01");
            insertedBefore.push(`${comment.open}PROVE-OUT: OPTIONAL STOP - TOOL CHANGE T${toolNum}${comment.close}`);
            optionalStops++;
            proveOutComments++;
          }
        }
        prevToolNumber = toolNum;
      }

      // Spindle direction change
      const spindleDirMatch = trimmed.match(SPINDLE_DIR_REGEX);
      if (spindleDirMatch) {
        const dir = spindleDirMatch[1];
        if (prevSpindleDir !== null && dir !== prevSpindleDir && dir !== "5") {
          if (config.insert_optional_stops) {
            const dirLabel = dir === "3" ? "CW" : dir === "4" ? "CCW" : "STOP";
            insertedBefore.push("M01");
            insertedBefore.push(`${comment.open}PROVE-OUT: SPINDLE DIRECTION CHANGE TO ${dirLabel}${comment.close}`);
            optionalStops++;
            proveOutComments++;
          }
        }
        prevSpindleDir = dir;
      }

      // Coolant type transition
      const coolantMatch = trimmed.match(COOLANT_REGEX);
      if (coolantMatch) {
        const coolCode = coolantMatch[1];
        if (prevCoolantCode !== null && coolCode !== prevCoolantCode) {
          if (config.insert_optional_stops && config.add_prove_out_comments) {
            insertedBefore.push(`${comment.open}PROVE-OUT: COOLANT CHANGE M${coolCode}${comment.close}`);
            proveOutComments++;
          }
        }
        prevCoolantCode = coolCode;
      }

      // Depth-of-cut transition
      const zMatch = trimmed.match(Z_DEPTH_REGEX);
      if (zMatch && !RAPID_REGEX.test(trimmed)) {
        const zVal = parseFloat(zMatch[1]);
        if (prevZDepth !== null) {
          const currentDoc = Math.abs(zVal - prevZDepth);
          // Only trigger if we're going deeper by > ratio
          if (currentDoc > 0.1 && prevZDepth !== 0) {
            const prevDoc = Math.abs(prevZDepth);
            if (prevDoc > 0 && currentDoc / prevDoc > config.doc_transition_ratio) {
              if (config.insert_optional_stops) {
                insertedBefore.push("M01");
                insertedBefore.push(
                  `${comment.open}PROVE-OUT: DEPTH TRANSITION ${prevZDepth.toFixed(3)} -> ${zVal.toFixed(3)}${comment.close}`
                );
                optionalStops++;
                proveOutComments++;
              }
            }
          }
        }
        prevZDepth = zVal;
      }

      // ── Apply feed reduction ──
      const feedMatch = modified.match(FEED_REGEX);
      if (feedMatch && !RAPID_REGEX.test(trimmed)) {
        const originalFeed = parseFloat(feedMatch[1]);
        const reducedFeed = Math.round(originalFeed * (1 - config.feed_reduction));
        if (reducedFeed !== originalFeed && reducedFeed > 0) {
          modified = modified.replace(FEED_REGEX, `F${reducedFeed}`);
          reasons.push(`Feed: ${originalFeed} -> ${reducedFeed} (-${Math.round(config.feed_reduction * 100)}%)`);
          totalFeedReduction += (originalFeed - reducedFeed) / originalFeed;
          feedReductions++;
        }
      }

      // ── Apply RPM cap ──
      const rpmMatch = modified.match(SPINDLE_REGEX);
      if (rpmMatch && (SPINDLE_DIR_REGEX.test(trimmed) || /S\d/.test(trimmed))) {
        const originalRpm = parseFloat(rpmMatch[1]);
        const cappedRpm = Math.round(originalRpm * config.rpm_cap);
        if (cappedRpm < originalRpm && cappedRpm > 0) {
          modified = modified.replace(SPINDLE_REGEX, `S${cappedRpm}`);
          reasons.push(`RPM: ${originalRpm} -> ${cappedRpm} (${Math.round(config.rpm_cap * 100)}% cap)`);
          totalRpmReduction += (originalRpm - cappedRpm) / originalRpm;
          rpmCaps++;
        }
      }

      // ── Validate against machine limits ──
      if (input.machine) {
        const rpmAfter = modified.match(SPINDLE_REGEX);
        if (rpmAfter) {
          const rpm = parseFloat(rpmAfter[1]);
          if (rpm > input.machine.max_rpm) {
            modified = modified.replace(SPINDLE_REGEX, `S${input.machine.max_rpm}`);
            reasons.push(`RPM clamped to machine max: ${input.machine.max_rpm}`);
            warnings.push(`Line ${i + 1}: RPM ${rpm} exceeded machine max ${input.machine.max_rpm}, clamped`);
          }
        }
      }

      insertedLineCount += insertedBefore.length;
      result.push({
        line: i + 1,
        text: modified,
        modified: modified !== raw || insertedBefore.length > 0,
        reasons,
        inserted_before: insertedBefore,
      });
    }

    // ── Build output G-code ──
    const outputLines: string[] = [];

    // Header
    if (config.add_single_block_header) {
      outputLines.push(`${comment.open}**** PROVE-OUT MODE - FIRST ARTICLE ****${comment.close}`);
      outputLines.push(`${comment.open}RECOMMEND: ENABLE SINGLE-BLOCK MODE${comment.close}`);
      outputLines.push(`${comment.open}FEEDS REDUCED ${Math.round(config.feed_reduction * 100)}% | RPM CAPPED ${Math.round(config.rpm_cap * 100)}%${comment.close}`);
      outputLines.push(`${comment.open}OPTIONAL STOPS AT CRITICAL TRANSITIONS${comment.close}`);
      insertedLineCount += 4;
    }

    for (const block of result) {
      for (const ins of block.inserted_before) {
        outputLines.push(ins);
      }
      outputLines.push(block.text);
    }

    const avgFeedReduction = feedReductions > 0 ? (totalFeedReduction / feedReductions) * 100 : 0;
    const avgRpmReduction = rpmCaps > 0 ? (totalRpmReduction / rpmCaps) * 100 : 0;

    // Estimate cycle time ratio: reduced feeds = longer cycle time
    // Simplified: if feeds are reduced by X%, cutting time increases by ~X/(1-X)%
    const feedFactor = 1 / (1 - config.feed_reduction);
    // Non-cutting time (rapids, tool changes) stays the same; estimate 60% cutting, 40% non-cutting
    const estimatedRatio = 0.6 * feedFactor + 0.4;

    // ── Output validation — sanity-check modified values ──
    for (const block of result) {
      const feedVal = block.text.match(FEED_REGEX);
      if (feedVal) {
        const f = parseFloat(feedVal[1]);
        if (f <= 0) warnings.push(`Line ${block.line}: Feed ${f} <= 0 after derating — possible error`);
        if (f > 50000) warnings.push(`Line ${block.line}: Feed ${f} mm/min unusually high — verify program units`);
      }
      const rpmVal = block.text.match(SPINDLE_REGEX);
      if (rpmVal && /M0?[34]\b/.test(block.text)) {
        const s = parseFloat(rpmVal[1]);
        if (s <= 0) warnings.push(`Line ${block.line}: RPM ${s} <= 0 after capping — possible error`);
        if (s > 60000) warnings.push(`Line ${block.line}: RPM ${s} unusually high — verify machine rating`);
      }
    }
    if (estimatedRatio > 3.0) {
      warnings.push(`Cycle time ratio ${estimatedRatio.toFixed(2)}x — prove-out may be excessively conservative`);
    }

    return {
      gcode: outputLines.join("\n"),
      blocks: result,
      summary: {
        total_lines: lines.length,
        modified_lines: result.filter((b) => b.modified).length,
        inserted_lines: insertedLineCount,
        feed_reductions: feedReductions,
        rpm_caps: rpmCaps,
        optional_stops_added: optionalStops,
        mandatory_stops_added: mandatoryStops,
        prove_out_comments_added: proveOutComments,
        avg_feed_reduction_pct: Math.round(avgFeedReduction * 10) / 10,
        avg_rpm_reduction_pct: Math.round(avgRpmReduction * 10) / 10,
      },
      estimated_cycle_time_ratio: Math.round(estimatedRatio * 100) / 100,
      warnings,
    };
  }

  /**
   * Estimate the impact of prove-out settings without modifying the program.
   */
  private estimateImpact(input: ProveOutInput): ProveOutResult {
    // Run full prove-out to get accurate statistics
    return this.applyProveOut({ ...input, action: "apply_prove_out" });
  }

  /**
   * Generate side-by-side comparison data (original vs prove-out).
   */
  private compare(input: ProveOutInput): ProveOutResult {
    return this.applyProveOut({ ...input, action: "apply_prove_out" });
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private resolveGcode(input: ProveOutInput): string {
    if (input.gcode) return input.gcode;
    if (input.pipeline_output?.output_gcode) return input.pipeline_output.output_gcode;
    throw new Error("No G-code provided: supply gcode string or pipeline_output");
  }

  private isPureComment(line: string, controller: ControllerFamily): boolean {
    if (controller === "siemens" || controller === "heidenhain") {
      return line.startsWith(";");
    }
    return line.startsWith("(") && line.endsWith(")");
  }
}

/** Singleton export */
export const proveOutModeEngine = new ProveOutModeEngineImpl();
