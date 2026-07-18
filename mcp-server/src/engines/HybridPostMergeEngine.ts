/**
 * HybridPostMergeEngine — Merge post-processor features from multiple CAM systems.
 *
 * When using zone decomposition (roughing in one CAM, finishing in another),
 * this engine merges G-code outputs into a unified program with proper
 * safe transitions, tool management, and coordinate system handling.
 *
 * Addresses: "How to combine Mastercam roughing with hyperMILL 5-axis finishing."
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface PostSegment {
  cam_source: string;
  operation: string;
  controller: "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";
  gcode_lines: string[];
  work_offset: string;         // G54, G55, etc.
  tool_number: number;
  tool_name: string;
  coolant_mode: "flood" | "mist" | "tsc" | "air" | "off";
  is_5axis: boolean;
  estimated_time_min: number;
}

export interface MergeInput {
  segments: PostSegment[];
  machine: {
    controller: "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";
    has_atc: boolean;
    max_tools: number;
    has_probing: boolean;
  };
  options?: {
    add_safe_transitions: boolean;
    renumber_tools: boolean;
    unify_work_offset: boolean;
    add_operation_comments: boolean;
    add_time_estimates: boolean;
    add_stop_between_segments: boolean;
  };
}

export interface MergeConflict {
  type: "tool_number" | "work_offset" | "controller_mismatch" | "coolant" | "5axis_mode";
  segment_a: number;
  segment_b: number;
  description: string;
  resolution: string;
  auto_resolved: boolean;
}

export interface MergedProgram {
  header: string[];
  body: string[];
  footer: string[];
  total_lines: number;
  total_tools: number;
  total_time_min: number;
  tool_list: Array<{ t_number: number; name: string; from_cam: string }>;
  conflicts: MergeConflict[];
  transition_blocks: number;
}

export interface MergeResult {
  program: MergedProgram;
  segment_map: Array<{
    segment_index: number;
    cam_source: string;
    operation: string;
    start_line: number;
    end_line: number;
    tool: string;
  }>;
  quality_score: number; // 0-100
  warnings: string[];
}

const SAFE_START: Record<string, string[]> = {
  fanuc:      ["G90 G80 G40 G49 G17", "G91 G28 Z0", "G28 X0 Y0"],
  haas:       ["G90 G80 G40 G49 G17", "G91 G28 Z0", "G28 X0 Y0"],
  siemens:    ["G90 G40 G17 SUPA D0", "G75 X0 Y0 Z0"],
  heidenhain: ["L Z+0 R0 FMAX M91", "CYCL DEF 247 DATUM SETTING"],
  mazak:      ["G90 G80 G40 G49 G17", "G91 G28 Z0"],
  okuma:      ["G90 G80 G40 G49 G17 G15 H0", "G91 G28 Z0"],
};

const COOLANT_ON: Record<string, Record<string, string>> = {
  fanuc: { flood: "M8", mist: "M7", tsc: "M88", air: "M51", off: "M9" },
  haas:  { flood: "M8", mist: "M7", tsc: "M88", air: "M7",  off: "M9" },
  siemens: { flood: "M8", mist: "M7", tsc: "M88", air: "M7", off: "M9" },
  heidenhain: { flood: "M8", mist: "M7", tsc: "M51", air: "M7", off: "M9" },
  mazak: { flood: "M8", mist: "M7", tsc: "M88", air: "M51", off: "M9" },
  okuma: { flood: "M8", mist: "M7", tsc: "M88", air: "M51", off: "M9" },
};

export class HybridPostMergeEngine {
  compute(input: MergeInput): AtomicValue<MergeResult> {
    const { segments, machine } = input;
    const opts = {
      add_safe_transitions: true,
      renumber_tools: true,
      unify_work_offset: true,
      add_operation_comments: true,
      add_time_estimates: true,
      add_stop_between_segments: false,
      ...input.options,
    };

    const controller = machine.controller;
    const conflicts: MergeConflict[] = [];
    const warnings: string[] = [];

    // ── Conflict Detection ──
    this.detectConflicts(segments, machine, conflicts);

    // ── Tool Renumbering ──
    const toolMap = new Map<string, number>();
    let nextTool = 1;
    const toolList: MergedProgram["tool_list"] = [];

    for (const seg of segments) {
      const key = `${seg.tool_name}_${seg.cam_source}`;
      if (!toolMap.has(key)) {
        const tNum = opts.renumber_tools ? nextTool++ : seg.tool_number;
        toolMap.set(key, tNum);
        toolList.push({ t_number: tNum, name: seg.tool_name, from_cam: seg.cam_source });
      }
    }

    // ── Build Program ──
    const header: string[] = [];
    const body: string[] = [];
    const footer: string[] = [];
    const segMap: MergeResult["segment_map"] = [];

    // Header
    header.push(`(HYBRID PROGRAM — ${segments.length} SEGMENTS FROM ${new Set(segments.map(s => s.cam_source)).size} CAM SYSTEMS)`);
    header.push(`(GENERATED: ${new Date().toISOString().slice(0, 10)})`);
    header.push(`(CONTROLLER: ${controller.toUpperCase()})`);
    header.push("(TOOL LIST)");
    for (const t of toolList) {
      header.push(`(T${t.t_number} — ${t.name} — FROM ${t.from_cam})`);
    }
    header.push("");
    header.push(...SAFE_START[controller] || SAFE_START.fanuc);

    // Unified work offset
    const workOffset = opts.unify_work_offset ? segments[0]?.work_offset || "G54" : "";
    if (workOffset) header.push(workOffset);

    let lineCount = header.length;
    let transitionBlocks = 0;
    let totalTime = 0;

    // Body — merge each segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const startLine = lineCount + 1;

      // Operation comment
      if (opts.add_operation_comments) {
        body.push("");
        body.push(`(═══ SEGMENT ${i + 1}: ${seg.operation} — FROM ${seg.cam_source.toUpperCase()} ═══)`);
        if (opts.add_time_estimates) {
          body.push(`(EST. TIME: ${seg.estimated_time_min.toFixed(1)} MIN)`);
        }
        lineCount += 3;
      }

      // Safe transition between segments
      if (i > 0 && opts.add_safe_transitions) {
        const prev = segments[i - 1];
        const transition = this.buildTransition(prev, seg, controller, toolMap, opts);
        body.push(...transition);
        lineCount += transition.length;
        transitionBlocks += transition.length;
      }

      // Tool call (if different from previous or first segment)
      const tKey = `${seg.tool_name}_${seg.cam_source}`;
      const tNum = toolMap.get(tKey) || seg.tool_number;
      if (i === 0 || segments[i - 1].tool_number !== seg.tool_number ||
          segments[i - 1].tool_name !== seg.tool_name) {
        body.push(`T${tNum} M6`);
        body.push(`G43 H${tNum} Z100.`);
        lineCount += 2;
      }

      // Work offset
      if (!opts.unify_work_offset && seg.work_offset) {
        body.push(seg.work_offset);
        lineCount++;
      }

      // Coolant
      const coolantCode = COOLANT_ON[controller]?.[seg.coolant_mode] || "M8";
      body.push(coolantCode);
      lineCount++;

      // 5-axis mode enable
      if (seg.is_5axis) {
        const tcpmCode = this.tcpmCode(controller);
        body.push(tcpmCode);
        lineCount++;
      }

      // Filter and add G-code lines (strip existing headers/footers from source)
      const filtered = this.filterGcode(seg.gcode_lines, seg.cam_source);
      body.push(...filtered);
      lineCount += filtered.length;

      // 5-axis mode disable
      if (seg.is_5axis) {
        body.push(this.tcpmOffCode(controller));
        lineCount++;
      }

      // Optional stop
      if (opts.add_stop_between_segments && i < segments.length - 1) {
        body.push("M1 (OPTIONAL STOP BETWEEN SEGMENTS)");
        lineCount++;
      }

      const endLine = lineCount;
      segMap.push({
        segment_index: i,
        cam_source: seg.cam_source,
        operation: seg.operation,
        start_line: startLine,
        end_line: endLine,
        tool: `T${tNum} ${seg.tool_name}`,
      });

      totalTime += seg.estimated_time_min;
    }

    // Footer
    footer.push("");
    footer.push("M9 (COOLANT OFF)");
    footer.push(...(SAFE_START[controller] || SAFE_START.fanuc));
    footer.push("M30");
    footer.push("%");

    const totalLines = header.length + body.length + footer.length;

    // Quality score
    let quality = 100;
    quality -= conflicts.filter(c => !c.auto_resolved).length * 15;
    quality -= warnings.length * 5;
    if (!opts.add_safe_transitions) quality -= 10;
    quality = Math.max(0, Math.min(100, quality));

    const program: MergedProgram = {
      header,
      body,
      footer,
      total_lines: totalLines,
      total_tools: toolList.length,
      total_time_min: Math.round(totalTime * 10) / 10,
      tool_list: toolList,
      conflicts,
      transition_blocks: transitionBlocks,
    };

    return {
      value: {
        program,
        segment_map: segMap,
        quality_score: quality,
        warnings,
      },
      unit: "merged_program",
      formula: "zone_merge+safe_transition+tool_renumber",
      confidence: quality / 100,
    };
  }

  private detectConflicts(
    segments: PostSegment[],
    machine: MergeInput["machine"],
    conflicts: MergeConflict[]
  ): void {
    // Tool number conflicts
    const toolNums = new Map<number, number[]>();
    segments.forEach((s, i) => {
      const arr = toolNums.get(s.tool_number) || [];
      arr.push(i);
      toolNums.set(s.tool_number, arr);
    });
    for (const [tNum, indices] of toolNums) {
      if (indices.length > 1) {
        const names = indices.map(i => segments[i].tool_name);
        if (new Set(names).size > 1) {
          conflicts.push({
            type: "tool_number",
            segment_a: indices[0],
            segment_b: indices[1],
            description: `T${tNum} assigned to "${names[0]}" and "${names[1]}"`,
            resolution: "Auto-renumbered tools sequentially",
            auto_resolved: true,
          });
        }
      }
    }

    // Controller mismatch
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].controller !== machine.controller) {
        conflicts.push({
          type: "controller_mismatch",
          segment_a: i,
          segment_b: -1,
          description: `Segment ${i} uses ${segments[i].controller} but machine is ${machine.controller}`,
          resolution: "G-code syntax differences may need manual review",
          auto_resolved: false,
        });
      }
    }

    // Tool count exceeds ATC capacity
    const uniqueTools = new Set(segments.map(s => `${s.tool_name}_${s.cam_source}`)).size;
    if (uniqueTools > machine.max_tools) {
      conflicts.push({
        type: "tool_number",
        segment_a: 0,
        segment_b: segments.length - 1,
        description: `${uniqueTools} tools needed but ATC holds ${machine.max_tools}`,
        resolution: "May need tool sharing or manual tool change",
        auto_resolved: false,
      });
    }
  }

  private buildTransition(
    prev: PostSegment,
    next: PostSegment,
    controller: string,
    toolMap: Map<string, number>,
    opts: { add_safe_transitions: boolean }
  ): string[] {
    const lines: string[] = [];

    // Coolant off
    lines.push("M9");

    // Cancel 5-axis if previous was 5-axis
    if (prev.is_5axis && !next.is_5axis) {
      lines.push(this.tcpmOffCode(controller));
    }

    // Safe retract
    lines.push("G91 G28 Z0");

    // Cancel cutter comp
    lines.push("G40");

    return lines;
  }

  private tcpmCode(controller: string): string {
    switch (controller) {
      case "fanuc": return "G43.4 H1";
      case "haas": return "G234";
      case "siemens": return "TRAORI";
      case "heidenhain": return "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS";
      case "mazak": return "G43.4 H1";
      case "okuma": return "G43.4 H1";
      default: return "G43.4 H1";
    }
  }

  private tcpmOffCode(controller: string): string {
    switch (controller) {
      case "fanuc": return "G49";
      case "haas": return "G49";
      case "siemens": return "TRAFOOF";
      case "heidenhain": return "FUNCTION TCPM RESET";
      case "mazak": return "G49";
      case "okuma": return "G49";
      default: return "G49";
    }
  }

  /**
   * Dispatcher execute wrapper — POST-ULT pattern.
   * Single action `post_hybrid_merge` routes to compute().
   * Throws on unknown action (R12 fail-loud).
   */
  execute(action: string, params: any): unknown {
    switch (action) {
      case "post_hybrid_merge":
        return this.compute(params as MergeInput);
      default:
        throw new Error(`HybridPostMergeEngine.execute: unknown action "${action}"`);
    }
  }

  private filterGcode(lines: string[], camSource: string): string[] {
    // Strip headers, footers, and program numbers from source CAM output
    return lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed === "%") return false;
      if (trimmed.startsWith("O") && /^O\d+/.test(trimmed)) return false;
      if (trimmed === "M30" || trimmed === "M2") return false;
      if (trimmed === "M9" && lines.indexOf(line) < 3) return false; // skip header coolant-off
      // Keep everything else
      return true;
    });
  }
}

export const hybridPostMergeEngine = new HybridPostMergeEngine();
