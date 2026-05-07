// WIRE-EXEMPT: tests in __tests__/engines/mlCorpusU-LEARN-03.test.ts
/**
 * NCFileParserEngine — U-LEARN-03
 * ================================
 *
 * Parses standard G-code .NC files (Haas, Fanuc, Mazak, etc.) into structured
 * {@link NCProgram} objects. Operations are segmented at **tool-change boundaries**
 * (M06 → next M06 = one operation).
 *
 * Key features:
 * - Extracts rich metadata from Mastercam-style comments (DATE, TIME, tool info)
 * - Identifies toolpath types from (TOOLPATH - name) comments
 * - Tracks modal state for feeds/speeds/work offsets
 * - Never throws — returns parse_ok=false with warnings for corrupt files
 *
 * @module engines/NCFileParserEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import {
  NCProgramSchema,
  ParseNCInputSchema,
  type NCProgram,
  type NCOperation,
  type NCOperationKindT,
  type NCToolInfo,
  type NCHeader,
  type ParseNCInput,
} from "../schemas/ncFileSchema.js";

// ── Tokenizer ──────────────────────────────────────────────────────────────

interface Word {
  letter: string;
  value: string;
}

interface Block {
  lineNumber: number;
  raw: string;
  words: Word[];
  comments: string[];
  block_num: number | null;
}

function tokenizeLine(line: string, lineNumber: number): Block {
  const comments: string[] = [];
  // Extract (...) comments
  const deCommented = line.replace(/\(([^)]*)\)/g, (_m, c) => {
    comments.push(String(c).trim());
    return " ";
  });
  // Strip ; comments
  const semiIdx = deCommented.indexOf(";");
  const body = (semiIdx >= 0 ? deCommented.slice(0, semiIdx) : deCommented).trim();

  const words: Word[] = [];
  let block_num: number | null = null;

  const re = /([A-Za-z])([+-]?\d+\.?\d*|\[[^\]]+\]|#\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const letter = m[1]!.toUpperCase();
    const value = (m[2] ?? "").trim();
    words.push({ letter, value });
    if (letter === "N" && value !== "" && block_num === null) {
      const n = Number(value);
      if (Number.isFinite(n)) block_num = n;
    }
  }

  return { lineNumber, raw: line, words, comments, block_num };
}

// ── Modal state ────────────────────────────────────────────────────────────

interface ModalState {
  tool: number | null;
  spindle_rpm: number | null;
  feed: number | null;
  feed_mode: "per_min" | "per_rev" | "unknown";
  units: "inch" | "mm" | "unknown";
  workOffset: string | null;
  coolant: NCOperation["coolant"];
  z: number | null;
  z_min: number | null;
  z_max: number | null;
  motionCounts: { rapid: number; linear: number; arc_cw: number; arc_ccw: number };
  cannedCycles: Set<string>;
}

function newModalState(): ModalState {
  return {
    tool: null,
    spindle_rpm: null,
    feed: null,
    feed_mode: "unknown",
    units: "unknown",
    workOffset: null,
    coolant: "unknown",
    z: null,
    z_min: null,
    z_max: null,
    motionCounts: { rapid: 0, linear: 0, arc_cw: 0, arc_ccw: 0 },
    cannedCycles: new Set(),
  };
}

function applyBlock(b: Block, st: ModalState): { toolChange: boolean; newTool: number | null } {
  let toolChange = false;
  let newTool: number | null = null;

  for (const w of b.words) {
    const n = Number(w.value);
    const valid = Number.isFinite(n);

    switch (w.letter) {
      case "T":
        if (valid && n !== st.tool) {
          newTool = n;
          // Actual change happens at M06
        }
        break;
      case "M":
        if (valid) {
          const mm = Math.floor(n);
          if (mm === 6 && newTool !== null) {
            toolChange = true;
            st.tool = newTool;
          } else if (mm === 8) st.coolant = "flood";
          else if (mm === 7) st.coolant = "mist";
          else if (mm === 9) st.coolant = "off";
          else if (mm === 50) st.coolant = "air";
          else if (mm === 88) st.coolant = "through";
          else if (mm === 3 || mm === 4) { /* spindle on */ }
          else if (mm === 5) { /* spindle off */ }
        }
        break;
      case "S":
        if (valid) st.spindle_rpm = n;
        break;
      case "F":
        if (valid) st.feed = n;
        break;
      case "Z":
        if (valid) {
          st.z = n;
          if (st.z_min === null || n < st.z_min) st.z_min = n;
          if (st.z_max === null || n > st.z_max) st.z_max = n;
        }
        break;
      case "G":
        if (valid) {
          const g = Math.floor(n);
          switch (g) {
            case 0: st.motionCounts.rapid++; break;
            case 1: st.motionCounts.linear++; break;
            case 2: st.motionCounts.arc_cw++; break;
            case 3: st.motionCounts.arc_ccw++; break;
            case 20: st.units = "inch"; break;
            case 21: st.units = "mm"; break;
            case 94: st.feed_mode = "per_min"; break;
            case 95: st.feed_mode = "per_rev"; break;
            case 54: case 55: case 56: case 57: case 58: case 59:
              st.workOffset = `G${g}`;
              break;
            case 73: case 74: case 76: case 80: case 81: case 82: case 83: case 84: case 85: case 86: case 87: case 88: case 89:
              if (g !== 80) st.cannedCycles.add(`G${g}`);
              break;
          }
        }
        break;
    }
  }
  return { toolChange, newTool };
}

// ── Tool info parser ───────────────────────────────────────────────────────

function parseToolComment(comment: string): NCToolInfo | null {
  // Pattern: T1 - 0.25 BULL-NOSED ENDMILL - H1 - D1 - D0.2500" - R0.0300"
  const tMatch = comment.match(/^T(\d+)\s*[-–]\s*(.+)/);
  if (!tMatch) return null;

  const tool_number = parseInt(tMatch[1]!, 10);
  const rest = tMatch[2]!;

  let diameter_in: number | null = null;
  let diameter_mm: number | null = null;
  let corner_radius: number | null = null;
  let holder_offset: string | null = null;
  let diameter_offset: string | null = null;

  // Extract H offset
  const hMatch = rest.match(/H(\d+)/);
  if (hMatch) holder_offset = `H${hMatch[1]}`;

  // Extract D offset
  const dOffMatch = rest.match(/\s+D(\d+)\s/);
  if (dOffMatch) diameter_offset = `D${dOffMatch[1]}`;

  // Extract diameter D0.2500"
  const diamMatch = rest.match(/D([\d.]+)["']/);
  if (diamMatch) diameter_in = parseFloat(diamMatch[1]!);

  // Extract radius R0.0300"
  const radMatch = rest.match(/R([\d.]+)["']?/);
  if (radMatch) corner_radius = parseFloat(radMatch[1]!);

  // Convert to mm if we have inches
  if (diameter_in !== null) diameter_mm = diameter_in * 25.4;

  // Extract description (before the first - H or - D)
  const descMatch = rest.match(/^([^-]+)/);
  const description = descMatch ? descMatch[1]!.trim() : rest.trim();

  return {
    tool_number,
    diameter_in,
    diameter_mm,
    corner_radius,
    description,
    holder_offset,
    diameter_offset,
  };
}

// ── Operation kind inference ───────────────────────────────────────────────

function inferKind(toolpathName: string | null, cycles: Set<string>): NCOperationKindT {
  const name = (toolpathName ?? "").toLowerCase();

  if (name.includes("rough")) return "roughing";
  if (name.includes("finish")) return "finishing";
  if (name.includes("drill")) return "drilling";
  if (name.includes("tap")) return "tapping";
  if (name.includes("bore")) return "boring";
  if (name.includes("face")) return "facing";
  if (name.includes("contour")) return "contouring";
  if (name.includes("pocket")) return "pocketing";
  if (name.includes("slot")) return "slotting";
  if (name.includes("thread")) return "threading";
  if (name.includes("engrav")) return "engraving";
  if (name.includes("probe")) return "probing";

  // Infer from canned cycles
  if (cycles.has("G84")) return "tapping";
  if (cycles.has("G83") || cycles.has("G81") || cycles.has("G73")) return "drilling";
  if (cycles.has("G85") || cycles.has("G86") || cycles.has("G87") || cycles.has("G88") || cycles.has("G89")) return "boring";
  if (cycles.has("G76")) return "threading";

  return "unknown";
}

// ── Main parser ────────────────────────────────────────────────────────────

export interface NCParseResult {
  ok: boolean;
  program: NCProgram;
  warnings: string[];
}

export class NCFileParserEngine {
  parse(input: ParseNCInput): NCParseResult {
    const parsed = ParseNCInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        warnings: [`schema validation: ${parsed.error.message}`],
        program: this.emptyProgram("<invalid>", [`schema validation: ${parsed.error.message}`]),
      };
    }
    const { text, source_path, max_lines } = parsed.data;

    const warnings: string[] = [];
    let lines: string[];
    try {
      // Handle empty input specially - split("") gives [""], not []
      if (!text.trim()) {
        lines = [];
      } else {
        const split = text.replace(/\r\n?/g, "\n").split("\n");
        if (split.length > max_lines) {
          warnings.push(`truncated: ${split.length} lines > max_lines ${max_lines}`);
        }
        lines = split.slice(0, max_lines);
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      warnings.push(`split failed: ${m}`);
      return { ok: false, warnings, program: this.emptyProgram(source_path, warnings) };
    }

    const blocks: Block[] = [];
    for (let i = 0; i < lines.length; i++) {
      try {
        blocks.push(tokenizeLine(lines[i]!, i + 1));
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        warnings.push(`tokenize L${i + 1}: ${m}`);
      }
    }

    // ── Header extraction ──────────────────────────────────────────────────
    const header: NCHeader = {
      program_number: null,
      title: null,
      date: null,
      time: null,
      units: "unknown",
      controller: "unknown",
      cam_system: "unknown",
      stock_left: null,
      compensation_type: "unknown",
    };
    const tools: NCToolInfo[] = [];

    for (const b of blocks) {
      // Program number
      const oWord = b.words.find(w => w.letter === "O");
      if (oWord && header.program_number === null) {
        header.program_number = `O${oWord.value}`;
        // Title often follows in same line comments
        if (b.comments.length > 0 && !header.title) {
          header.title = b.comments[0]!;
        }
      }

      // Parse header comments
      for (const c of b.comments) {
        const cu = c.toUpperCase();
        if (cu.startsWith("DATE")) {
          const m = c.match(/DATE\s*[-:]\s*(.+)/i);
          if (m) header.date = m[1]!.trim();
        }
        if (cu.startsWith("TIME")) {
          const m = c.match(/TIME\s*[-:]\s*(.+)/i);
          if (m) header.time = m[1]!.trim();
        }
        if (cu.includes("COMPENSATION TYPE")) {
          if (cu.includes("COMPUTER")) header.compensation_type = "computer";
          else if (cu.includes("CONTROL")) header.compensation_type = "control";
        }
        if (cu.includes("STOCK LEFT")) {
          const m = c.match(/STOCK LEFT[^=]*=\s*([\d.]+)/i);
          if (m) header.stock_left = parseFloat(m[1]!);
        }

        // Tool definitions
        if (/^T\d+\s*[-–]/.test(c)) {
          const ti = parseToolComment(c);
          if (ti && !tools.find(t => t.tool_number === ti.tool_number)) {
            tools.push(ti);
          }
        }
      }

      // Units from G20/G21
      for (const w of b.words) {
        if (w.letter === "G") {
          const g = Math.floor(Number(w.value));
          if (g === 20) header.units = "inch";
          if (g === 21) header.units = "mm";
        }
      }
    }

    // Detect CAM system from comment patterns
    const allComments = blocks.flatMap(b => b.comments).join(" ").toUpperCase();
    if (allComments.includes("MASTERCAM") || allComments.includes("TOOLPATH -")) {
      header.cam_system = "mastercam";
    } else if (allComments.includes("HYPERMILL")) {
      header.cam_system = "hypermill";
    } else if (allComments.includes("FUSION")) {
      header.cam_system = "fusion360";
    }

    // Detect controller from G-code dialect
    if (blocks.some(b => b.words.some(w => w.letter === "G" && w.value === "17"))) {
      // G17/G18/G19 present → likely Fanuc/Haas
      if (header.units === "inch") header.controller = "haas";
      else header.controller = "fanuc";
    }

    // ── Operation segmentation ─────────────────────────────────────────────
    const operations: NCOperation[] = [];
    let state = newModalState();
    let currentOpStart = 0;
    let currentOpBlocks: Block[] = [];
    let opIndex = 0;
    let currentToolpathName: string | null = null;
    let pendingTool: number | null = null;
    let z_overall_max: number | null = null;
    let z_overall_min: number | null = null;

    const flushOp = (endBlockIdx: number): void => {
      if (currentOpBlocks.length === 0) return;
      const startBlock = currentOpBlocks[0]!;
      const endBlock = currentOpBlocks[currentOpBlocks.length - 1]!;

      const op: NCOperation = {
        index: opIndex++,
        kind: inferKind(currentToolpathName, state.cannedCycles),
        tool_number: state.tool ?? 0,
        tool_info: tools.find(t => t.tool_number === state.tool),
        toolpath_name: currentToolpathName,
        block_range: [startBlock.lineNumber, endBlock.lineNumber],
        line_count: currentOpBlocks.length,
        spindle_rpm: state.spindle_rpm,
        feed_rate: state.feed,
        feed_mode: state.feed_mode,
        z_max: state.z_max,
        z_min: state.z_min,
        work_offset: state.workOffset,
        coolant: state.coolant,
        motion_count: { ...state.motionCounts },
        canned_cycles: Array.from(state.cannedCycles),
        comments: currentOpBlocks.flatMap(b => b.comments).slice(0, 20),
        warnings: [],
      };
      operations.push(op);

      // Update overall Z
      if (state.z_max !== null && (z_overall_max === null || state.z_max > z_overall_max)) {
        z_overall_max = state.z_max;
      }
      if (state.z_min !== null && (z_overall_min === null || state.z_min < z_overall_min)) {
        z_overall_min = state.z_min;
      }

      // Reset per-op state
      currentOpBlocks = [];
      currentToolpathName = null;
      state.z_min = null;
      state.z_max = null;
      state.motionCounts = { rapid: 0, linear: 0, arc_cw: 0, arc_ccw: 0 };
      state.cannedCycles = new Set();
    };

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]!;

      // Detect toolpath name from comment
      for (const c of b.comments) {
        if (c.toUpperCase().startsWith("TOOLPATH -") || c.toUpperCase().startsWith("TOOLPATH-")) {
          const m = c.match(/TOOLPATH\s*[-–]\s*(.+)/i);
          if (m) currentToolpathName = m[1]!.trim();
        }
      }

      // Check for pending tool
      const tWord = b.words.find(w => w.letter === "T");
      if (tWord) {
        const tn = Number(tWord.value);
        if (Number.isFinite(tn)) pendingTool = tn;
      }

      // Check for tool change (M06)
      const hasM06 = b.words.some(w => w.letter === "M" && Math.floor(Number(w.value)) === 6);
      if (hasM06 && pendingTool !== null && currentOpBlocks.length > 0) {
        flushOp(i);
        currentOpStart = i;
        state.tool = pendingTool;
        pendingTool = null;
      } else if (hasM06 && pendingTool !== null) {
        state.tool = pendingTool;
        pendingTool = null;
      }

      currentOpBlocks.push(b);
      applyBlock(b, state);
    }

    // Final op
    if (currentOpBlocks.length > 0) {
      flushOp(blocks.length);
    }

    // Detect end code
    let endCode: NCProgram["end_code"] = "none";
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]!;
      for (const w of b.words) {
        if (w.letter !== "M") continue;
        const mm = Math.floor(Number(w.value));
        if (mm === 30) { endCode = "M30"; break; }
        if (mm === 2)  { endCode = "M02"; break; }
        if (mm === 99) { endCode = "M99"; break; }
        if (mm === 0)  { endCode = "M00"; break; }
      }
      if (endCode !== "none") break;
    }

    const program: NCProgram = {
      schemaVersion: "1.0.0",
      source_path,
      total_lines: lines.length,
      blocks_parsed: blocks.length,
      header,
      tools,
      operations,
      z_overall_max,
      z_overall_min,
      end_code: endCode,
      warnings,
      parse_ok: true,
    };

    const check = NCProgramSchema.safeParse(program);
    if (!check.success) {
      warnings.push(`post-parse schema mismatch: ${check.error.message}`);
      program.parse_ok = false;
    }

    return { ok: program.parse_ok, program, warnings };
  }

  /**
   * Convert parsed program to feature rows for ML training.
   */
  summarizeAsFeatures(prog: NCProgram): Array<Record<string, unknown>> {
    return prog.operations.map((op) => ({
      source_path: prog.source_path,
      program_number: prog.header.program_number,
      op_index: op.index,
      op_kind: op.kind,
      toolpath_name: op.toolpath_name,
      tool_number: op.tool_number,
      tool_diameter_in: op.tool_info?.diameter_in ?? null,
      tool_diameter_mm: op.tool_info?.diameter_mm ?? null,
      corner_radius: op.tool_info?.corner_radius ?? null,
      spindle_rpm: op.spindle_rpm,
      feed_rate: op.feed_rate,
      feed_mode: op.feed_mode,
      coolant: op.coolant,
      canned_cycles: op.canned_cycles,
      z_max: op.z_max,
      z_min: op.z_min,
      z_span: op.z_max !== null && op.z_min !== null ? Math.abs(op.z_max - op.z_min) : null,
      motion_rapid: op.motion_count.rapid,
      motion_linear: op.motion_count.linear,
      motion_arc: op.motion_count.arc_cw + op.motion_count.arc_ccw,
      line_count: op.line_count,
      units: prog.header.units,
      controller: prog.header.controller,
      cam_system: prog.header.cam_system,
    }));
  }

  private emptyProgram(source_path: string, warnings: string[]): NCProgram {
    return {
      schemaVersion: "1.0.0",
      source_path,
      total_lines: 0,
      blocks_parsed: 0,
      header: {
        program_number: null,
        title: null,
        date: null,
        time: null,
        units: "unknown",
        controller: "unknown",
        cam_system: "unknown",
        stock_left: null,
        compensation_type: "unknown",
      },
      tools: [],
      operations: [],
      z_overall_max: null,
      z_overall_min: null,
      end_code: "none",
      warnings,
      parse_ok: false,
    };
  }

  static getSelfAwareness() {
    return {
      name: "NCFileParserEngine",
      purpose: "Parse standard G-code .NC files (Haas, Fanuc, Mazak) into structured operations",
      milestone: "PSAU P2.5-LEARN U-LEARN-03",
      capabilities: ["parse", "summarizeAsFeatures"],
      inputs: ["Standard G-code .NC file text"],
      outputs: ["NCProgram with operations[] segmented at tool-change boundaries"],
      never_throws: true,
      consumers: ["TrainingExampleAssemblerEngine", "JMDieTrainingCorpusEngine"],
    };
  }
}

export const ncFileParserEngine = new NCFileParserEngine();
