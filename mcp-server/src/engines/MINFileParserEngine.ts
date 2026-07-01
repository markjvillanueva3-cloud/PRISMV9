/**
 * MINFileParserEngine — U-LEARN-03
 * =================================
 *
 * Parses Okuma OSP-P300/P200/U100/P100 .MIN lathe programs into a structured
 * {@link MINProgram}.  Operations are segmented at **tool-change boundaries**
 * (T-word change → next T-word change = one operation).  Feeds and speeds
 * are carried forward from the most recent modal state on the cutting
 * line of each operation.
 *
 * Design decisions:
 *
 *   1. **Never throw.** The JM Die corpus has 22,721 files; any one of them
 *      can be torn, wrong encoding, or a third-party post's dialect.
 *      A file that fails parsing produces a MINProgram with
 *      `parse_ok=false` and populated `warnings[]` — never an exception.
 *
 *   2. **Operation-kind inference is conservative.** We classify by the
 *      dominant canned cycle or motion shape inside each tool session.
 *      Ambiguous sessions default to "turning" if G1/G2/G3 motion dominates,
 *      "unknown" otherwise — downstream training code can down-weight
 *      unknowns.
 *
 *   3. **Modal state is respected.** F, S, G96/G97, coolant M-codes are
 *      sticky between lines; we snapshot them at the first motion line
 *      of each operation so feeds/speeds reflect what was actually
 *      commanded at cut.
 *
 *   4. **Pure computation.** No I/O here.  The caller supplies the text;
 *      downstream corpus-pipeline engines own the file crawl, since the
 *      crawl belongs to infrastructure, not to the parser.
 *
 * @module engines/MINFileParserEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import {
  MINProgramSchema,
  ParseMINInputSchema,
  type MINProgram,
  type MINOperation,
  type MINOperationKindT,
  type ParseMINInput,
} from "../schemas/minFileSchema.js";

// --------------------------------------------------------------------------
// Low-level tokenizer
// --------------------------------------------------------------------------

interface Word {
  letter: string;   // "G","M","T","F","S","X","Z","N","O","(", ...
  value: string;    // the raw remainder: "01", "83", "0.2", "( comment )"
}

interface Block {
  lineNumber: number;      // 1-based
  raw: string;
  words: Word[];
  comments: string[];      // "( ... )" payloads
  block_num: number | null;
}

/** Split a line into words; handles parenthetical comments and control chars. */
function tokenizeLine(line: string, lineNumber: number): Block {
  const comments: string[] = [];
  // Extract ( ... ) comments first.
  const deCommented = line.replace(/\(([^)]*)\)/g, (_m, c) => {
    comments.push(String(c).trim());
    return " ";
  });
  // Strip trailing ';' comments (some OSP dialects)
  const semiIdx = deCommented.indexOf(";");
  const body = (semiIdx >= 0 ? deCommented.slice(0, semiIdx) : deCommented).trim();

  const words: Word[] = [];
  let block_num: number | null = null;

  // Regex for address-letter + value (numeric/string/macro).
  // Accept VG/VC-style macros:  VC1, VS100, VD[#500]
  const re = /([A-Za-z]+)\s*([-+]?\d+(?:\.\d+)?|\[[^\]]+\]|#\d+|\([^)]*\))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const letter = m[1];
    const value = (m[2] ?? "").trim();
    if (!letter) continue;
    words.push({ letter, value });
    // Identify block number
    if (letter.toUpperCase() === "N" && value !== "" && block_num === null) {
      const n = Number(value);
      if (Number.isFinite(n)) block_num = n;
    }
  }

  return { lineNumber, raw: line, words, comments, block_num };
}

// --------------------------------------------------------------------------
// Modal-state tracker
// --------------------------------------------------------------------------

interface ModalState {
  tool: string | null;
  toolOffset: string | null;
  spindle_rpm: number | null;
  sfm: number | null;
  css_active: boolean;          // true when last G96 seen
  feed: number | null;
  feed_mode: "per_rev" | "per_min" | "unknown";
  units: "mm" | "inch" | "unknown";
  workOffset: string | null;
  coolant: MINOperation["coolant"];
  cannedCycle: string | null;
  subCalls: string[];
  x: number | null;
  z: number | null;
}

function newModalState(): ModalState {
  return {
    tool: null, toolOffset: null,
    spindle_rpm: null, sfm: null, css_active: false,
    feed: null, feed_mode: "unknown",
    units: "unknown",
    workOffset: null,
    coolant: "unknown",
    cannedCycle: null,
    subCalls: [],
    x: null, z: null,
  };
}

/** Parse a T-word like "T0101" into {tool, offset}. Okuma often uses T0101. */
function parseTWord(v: string): { tool: string; offset: string | null } {
  const raw = v.replace(/^0+/, "");  // strip leading zeros for numeric sort
  if (v.length >= 4 && /^\d+$/.test(v)) {
    // Okuma style: TnnOO — first half tool, second half offset
    const half = Math.floor(v.length / 2);
    return { tool: v.slice(0, half), offset: v.slice(half) };
  }
  return { tool: raw || v, offset: null };
}

/** Apply a single block's modal side-effects. */
function applyBlock(b: Block, st: ModalState): { toolChanged: boolean } {
  let toolChanged = false;
  for (const w of b.words) {
    const L = w.letter.toUpperCase();
    const n = Number(w.value);
    const valid = Number.isFinite(n);

    if (L === "T" && w.value !== "") {
      const parsed = parseTWord(w.value);
      const newTool = `T${w.value}`;
      if (newTool !== st.tool) toolChanged = true;
      st.tool = newTool;
      st.toolOffset = parsed.offset;
    } else if (L === "S" && valid) {
      if (st.css_active) st.sfm = n; else st.spindle_rpm = n;
    } else if (L === "F" && valid) {
      st.feed = n;
    } else if (L === "X" && valid) {
      st.x = n;
    } else if (L === "Z" && valid) {
      st.z = n;
    } else if (L === "G" && valid) {
      const g = Math.floor(n);
      switch (g) {
        case 20: st.units = "inch"; break;
        case 21: st.units = "mm"; break;
        // U-MINPARSE-UNITS-CYCLE-FIX (2026-06-22, slot:alpha): G70/G71 are NOT units here.
        // On Okuma OSP lathe MIN files, inch/mm is set by G20/G21 (above); G70/G71/G72 are
        // LAP turning cycles (G70 finish, G71 longitudinal-rough, G72 facing-rough). Mapping
        // G70->inch / G71->mm (the obsolete pre-G20/G21 Fanuc convention) silently flipped
        // st.units to "mm" on EVERY roughing-cycle block -> header.units corrupted to "mm"
        // for an inch program (a 25.4x scale hazard; UNITS-FIRST rail). VALIDATED on the live
        // JM corpus: ~1500 MIN files had 0x G20/G21 and 72x G71, every G71 a roughing cycle
        // (`G71 X.. Z.. B60 D.003 U.001 H.. F..`), never a standalone units command. G70/G71/
        // G72 are now classified ONLY as canned cycles (the case below + the cannedForOp scan
        // in the op loop). Undeclared units honestly stay "unknown" (defer to the JM inch
        // default downstream; never fabricate "mm"). [[reference_minparse_units_cycle_collision_2026_06_22]]
        case 94: st.feed_mode = "per_min"; break;
        case 95: st.feed_mode = "per_rev"; break;
        case 96: st.css_active = true; break;
        case 97: st.css_active = false; break;
        case 54: case 55: case 56: case 57: case 58: case 59:
          st.workOffset = `G${g}`; break;
        case 71: case 72: case 70: case 83: case 74: case 75: case 76: case 81: case 84:
          st.cannedCycle = `G${g}`; break;
        default: break;
      }
    } else if (L === "M" && valid) {
      const mm = Math.floor(n);
      switch (mm) {
        case 8: st.coolant = "flood"; break;
        case 7: st.coolant = "mist"; break;
        case 9: st.coolant = "off"; break;
        case 50: st.coolant = "air"; break;
        case 88: st.coolant = "through"; break;
        case 98: {
          // subprogram call: look for P-word
          const pw = b.words.find((q) => q.letter.toUpperCase() === "P");
          if (pw) st.subCalls.push(`M98 P${pw.value}`);
          break;
        }
        default: break;
      }
    }
  }
  return { toolChanged };
}

// --------------------------------------------------------------------------
// Operation-kind inference
// --------------------------------------------------------------------------

function inferKind(op: Partial<MINOperation>, blocks: Block[]): MINOperationKindT {
  const cycles = new Set((op.canned_cycles ?? []).map((c) => c.toUpperCase()));
  if (cycles.has("G76") || cycles.has("G71.4")) return "threading";
  if (cycles.has("G74")) {
    // G74 can be grooving OR face-drilling OR tap.  Decide by whether we see
    // M29 (rigid tap gate) or a Q-word (drill peck).
    const saw_m29 = blocks.some((b) => b.words.some((w) =>
      w.letter.toUpperCase() === "M" && Number(w.value) === 29));
    if (saw_m29) return "rigid_tap";
    return "grooving";
  }
  if (cycles.has("G75")) return "grooving";
  if (cycles.has("G83") || cycles.has("G81")) return "drilling";
  if (cycles.has("G84")) return "rigid_tap";
  if (cycles.has("G31")) return "probing";
  if (cycles.has("G71") || cycles.has("G70") || cycles.has("G72")) return "turning";
  if (cycles.has("G10") || cycles.has("G11")) return "transfer";

  // No canned cycle → fall back to motion-shape heuristic.
  let g1Lines = 0;
  for (const b of blocks) {
    for (const w of b.words) {
      if (w.letter.toUpperCase() !== "G") continue;
      const g = Math.floor(Number(w.value));
      if (g === 1 || g === 2 || g === 3) { g1Lines++; break; }
    }
  }
  if (g1Lines >= 3) return "turning";
  return "unknown";
}

// --------------------------------------------------------------------------
// Main class
// --------------------------------------------------------------------------

export interface ParseResult {
  ok: boolean;
  program: MINProgram;
  warnings: string[];
}

export class MINFileParserEngine {
  parse(input: ParseMINInput): ParseResult {
    const parsed = ParseMINInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        warnings: [`schema validation failed: ${parsed.error.message}`],
        program: this.emptyProgram("<invalid>", [`schema validation failed: ${parsed.error.message}`]),
      };
    }
    const { text, source_path, max_lines } = parsed.data;

    const warnings: string[] = [];
    let lines: string[] = [];
    try {
      // Normalize line endings; respect max_lines cap.
      const split = text.replace(/\r\n?/g, "\n").split("\n");
      if (split.length > max_lines) {
        warnings.push(`truncated: ${split.length} lines > max_lines ${max_lines}`);
      }
      lines = split.slice(0, max_lines);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      warnings.push(`line split failed: ${m}`);
      return { ok: false, warnings, program: this.emptyProgram(source_path, warnings) };
    }

    const blocks: Block[] = [];
    for (let i = 0; i < lines.length; i++) {
      try {
        blocks.push(tokenizeLine(lines[i]!, i + 1));
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        warnings.push(`tokenize failed at line ${i + 1}: ${m}`);
      }
    }

    // Header detection — find first O-word (program number) anywhere in the
    // opening block stream; most Okuma programs put it on line 1 but some
    // dialects emit leading comments first.
    let programNumber: string | null = null;
    for (const b of blocks) {
      const o = b.words.find((w) => w.letter.toUpperCase() === "O" && w.value !== "");
      if (o) { programNumber = `O${o.value}`; break; }
      if (b.words.length > 2) break;          // stopped looking after a real code block
    }
    const firstComment = blocks.find((b) => b.comments.length > 0)?.comments[0] ?? null;

    // Detect end code
    let endCode: MINProgram["end_code"] = "none";
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]!;
      for (const w of b.words) {
        if (w.letter.toUpperCase() !== "M") continue;
        const mm = Math.floor(Number(w.value));
        if (mm === 30) { endCode = "M30"; break; }
        if (mm === 2)  { endCode = "M02"; break; }
        if (mm === 99) { endCode = "M99"; break; }
      }
      if (endCode !== "none") break;
    }
    const isSub = endCode === "M99" ? "sub" : (endCode === "M30" || endCode === "M02") ? "main" : "unknown";

    // Walk blocks, segmenting at T-change boundaries.
    const operations: MINOperation[] = [];
    let state = newModalState();
    let currentOpStart = 0;
    let currentOpKindHint: string | null = null;
    let currentOpBlocks: Block[] = [];
    let opIndex = 0;
    let workOffsetFirst: string | null = null;
    let unitsFirst: "mm" | "inch" | "unknown" = "unknown";
    const macrosSeen = new Set<string>();
    const toolsSeen = new Set<string>();
    const cannedForOp = new Set<string>();

    const flushOp = (endBlockIdx: number): void => {
      const startBlock = blocks[currentOpStart];
      const endBlock = blocks[Math.max(currentOpStart, endBlockIdx - 1)];
      if (!startBlock || !endBlock) return;
      const op: MINOperation = {
        index: opIndex++,
        kind: "setup",
        tool_id: state.tool ?? "",
        tool_offset: state.toolOffset ?? undefined,
        block_range: [startBlock.lineNumber, endBlock.lineNumber],
        line_count: endBlockIdx - currentOpStart,
        spindle_rpm: state.spindle_rpm,
        surface_speed_sfm: state.sfm,
        feed_rate: state.feed,
        feed_mode: state.feed_mode,
        z_start: null,
        z_end: state.z,
        x_min: null,
        x_max: null,
        coolant: state.coolant,
        canned_cycles: Array.from(cannedForOp),
        subprograms_called: [...state.subCalls],
        comments: currentOpBlocks.flatMap((b) => b.comments).slice(0, 16),
        warnings: [],
      };
      // Recompute X/Z extrema from block scan (authoritative)
      let zFirst: number | null = null;
      let xmin = Number.POSITIVE_INFINITY;
      let xmax = Number.NEGATIVE_INFINITY;
      for (const b of currentOpBlocks) {
        for (const w of b.words) {
          const L = w.letter.toUpperCase();
          const n = Number(w.value);
          if (!Number.isFinite(n)) continue;
          if (L === "Z") { if (zFirst === null) zFirst = n; op.z_end = n; }
          if (L === "X") { xmin = Math.min(xmin, n); xmax = Math.max(xmax, n); }
        }
      }
      op.z_start = zFirst;
      if (Number.isFinite(xmin)) op.x_min = xmin;
      if (Number.isFinite(xmax)) op.x_max = xmax;

      // Classify — setup is only for the pre-first-tool block
      if (currentOpKindHint === "setup") {
        op.kind = "setup";
      } else {
        op.kind = inferKind(op, currentOpBlocks);
      }
      operations.push(op);
      // Reset per-op accumulators
      currentOpBlocks = [];
      cannedForOp.clear();
      state.subCalls = [];
    };

    currentOpKindHint = "setup";
    const peekNewTool = (b: Block): string | null => {
      for (const w of b.words) {
        if (w.letter.toUpperCase() === "T" && w.value !== "") return `T${w.value}`;
      }
      return null;
    };
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]!;
      // Detect tool change BEFORE committing block's modal updates, so the
      // flushed prior op sees its own modal state (not the new tool's).
      const peek = peekNewTool(b);
      const willChange = peek !== null && peek !== state.tool;
      if (willChange && currentOpBlocks.length > 0) {
        flushOp(i);
        currentOpStart = i;
        currentOpKindHint = "operation";
        currentOpBlocks = [];
      } else if (willChange && currentOpBlocks.length === 0) {
        // First block of program is already a tool change — this op is an
        // operation, not setup.  Flip the hint so inferKind can classify it.
        currentOpKindHint = "operation";
      }
      currentOpBlocks.push(b);
      // Track macro vars (VC/VS/VD/VG) + canned cycles for this op
      for (const w of b.words) {
        if (/^V[CDGS]$/i.test(w.letter)) macrosSeen.add(`${w.letter.toUpperCase()}${w.value}`);
        if (w.letter.toUpperCase() === "G" && Number.isFinite(Number(w.value))) {
          const g = Math.floor(Number(w.value));
          if ([70,71,72,74,75,76,81,83,84,31,10,11].includes(g)) {
            cannedForOp.add(`G${g}`);
          }
        }
      }
      applyBlock(b, state);
      if (workOffsetFirst === null && state.workOffset) workOffsetFirst = state.workOffset;
      if (unitsFirst === "unknown" && state.units !== "unknown") unitsFirst = state.units;
      if (state.tool) toolsSeen.add(state.tool);
    }
    // Final op tail
    if (currentOpBlocks.length > 0 || operations.length === 0) {
      flushOp(blocks.length);
    }

    const program: MINProgram = {
      schemaVersion: "1.0.0",
      source_path,
      total_lines: lines.length,
      blocks_parsed: blocks.length,
      header: {
        program_number: programNumber,
        first_comment: firstComment,
        units: unitsFirst,
        work_offset: workOffsetFirst,
        is_main_or_sub: isSub,
      },
      operations,
      tools_used: Array.from(toolsSeen),
      macros_used: Array.from(macrosSeen),
      end_code: endCode,
      warnings,
      parse_ok: true,
    };

    // Defensive: revalidate against schema so downstream code can trust the shape.
    const check = MINProgramSchema.safeParse(program);
    if (!check.success) {
      warnings.push(`post-parse schema mismatch: ${check.error.message}`);
      program.parse_ok = false;
    }

    return { ok: program.parse_ok, program, warnings };
  }

  /**
   * Summarize a parsed program into training-row feature shape.
   * Each operation becomes one feature row with (tool, feed, sfm, rpm,
   * coolant, kind, canned_cycles[], x_span, z_span, line_count).
   * This is what TrainingExampleAssemblerEngine will join with run logs.
   */
  summarizeAsFeatures(prog: MINProgram): Array<Record<string, unknown>> {
    return prog.operations.map((op) => {
      const x_span = (op.x_min != null && op.x_max != null) ? op.x_max - op.x_min : null;
      const z_span = (op.z_start != null && op.z_end != null) ? Math.abs(op.z_end - op.z_start) : null;
      return {
        source_path: prog.source_path,
        program_number: prog.header.program_number,
        op_index: op.index,
        op_kind: op.kind,
        tool_id: op.tool_id,
        tool_offset: op.tool_offset ?? null,
        spindle_rpm: op.spindle_rpm,
        surface_speed_sfm: op.surface_speed_sfm,
        feed_rate: op.feed_rate,
        feed_mode: op.feed_mode,
        coolant: op.coolant,
        canned_cycles: op.canned_cycles,
        x_span,
        z_span,
        line_count: op.line_count,
        units: prog.header.units,
      };
    });
  }

  private emptyProgram(source_path: string, warnings: string[]): MINProgram {
    return {
      schemaVersion: "1.0.0",
      source_path,
      total_lines: 0,
      blocks_parsed: 0,
      header: {
        program_number: null, first_comment: null, units: "unknown",
        work_offset: null, is_main_or_sub: "unknown",
      },
      operations: [],
      tools_used: [],
      macros_used: [],
      end_code: "none",
      warnings,
      parse_ok: false,
    };
  }

  static getSelfAwareness() {
    return {
      name: "MINFileParserEngine",
      purpose: "Parse Okuma .MIN lathe programs into structured operations",
      milestone: "PSAU P2.5-LEARN U-LEARN-03",
      capabilities: ["parse", "summarizeAsFeatures"],
      inputs: ["Okuma .MIN program text"],
      outputs: ["MINProgram with operations[] segmented at tool-change boundaries"],
      never_throws: true,
      consumers: ["TrainingExampleAssemblerEngine","JMDieTrainingCorpusEngine"],
    };
  }
}

export const minFileParserEngine = new MINFileParserEngine();
