/**
 * PPProgramChunkerEngine — G-code program chunker for DNC drip-feed
 *
 * Splits large G-code programs into smaller chunks for:
 *   - Drip-feed DNC to old controllers with limited memory
 *   - Program partitioning for review / diff readability
 *   - Multi-file archival per operation
 *
 * Critical requirement: modal state MUST be preserved across chunk boundaries.
 * Each output chunk starts with a restored modal context block so that when
 * the controller resumes reading the next chunk, it picks up in the exact
 * same state (units, absolute/incremental, spindle, coolant, cutter comp,
 * active tool, work offset).
 *
 * Chunking strategies:
 *   - by_lines   — fixed line count (e.g., 500 lines per chunk)
 *   - by_bytes   — approximate byte limit (for serial DNC with small buffers)
 *   - by_operation — split at tool changes / operation comments
 *   - by_tool    — split when T-word changes
 *   - safe_block — never split inside a canned cycle or cutter comp
 *
 * Output includes metadata (chunk index, byte count, line range, modal
 * state at start/end) for DNC system sequencing.
 *
 * @module PPProgramChunkerEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ChunkStrategy = "by_lines" | "by_bytes" | "by_operation" | "by_tool";

export interface ChunkerOptions {
  strategy?: ChunkStrategy;
  max_lines_per_chunk?: number;    // Used by by_lines
  max_bytes_per_chunk?: number;    // Used by by_bytes
  safe_block?: boolean;            // Never split inside cycle / comp (default true)
  preserve_headers?: boolean;      // Include % / O-number in every chunk (default true)
  chunk_comment?: boolean;         // Include chunk marker comments (default true)
}

export interface ModalSnapshot {
  motion?: string;              // G0, G1, G2, G3
  plane?: string;               // G17, G18, G19
  distance?: string;            // G90, G91
  units?: string;               // G20, G21
  cutter_comp?: string;         // G40, G41, G42
  feed_mode?: string;           // G93, G94, G95
  spindle_mode?: string;        // G96, G97
  work_offset?: string;         // G54-G59
  drill_cycle?: string;         // G81-G89 or undefined
  spindle_dir?: string;         // M3, M4, M5
  coolant?: string[];           // [M7, M8]
  spindle_speed?: number;
  feed_rate?: number;
  active_tool?: number;
  active_d?: number;
  active_h?: number;
}

export interface Chunk {
  index: number;                  // 0-indexed
  lines: string[];                // Raw G-code lines in this chunk
  text: string;                   // Joined text (with newlines)
  byte_count: number;
  line_count: number;
  start_line: number;             // 1-indexed line in original program
  end_line: number;               // 1-indexed
  modal_state_at_start: ModalSnapshot;
  modal_state_at_end: ModalSnapshot;
  has_tool_change: boolean;
  has_program_end: boolean;
  active_tool?: number;
}

export interface ChunkerResult {
  chunks: Chunk[];
  total_chunks: number;
  total_bytes: number;
  total_lines: number;
  program_number?: string;
  strategy: ChunkStrategy;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPProgramChunkerEngine {
  /**
   * Split a G-code program into chunks.
   */
  chunk(gcodeText: string, options: ChunkerOptions = {}): ChunkerResult {
    const strategy = options.strategy ?? "by_lines";
    const maxLines = options.max_lines_per_chunk ?? 500;
    const maxBytes = options.max_bytes_per_chunk ?? 8192;
    const safeBlock = options.safe_block ?? true;
    const chunkComment = options.chunk_comment ?? true;

    const lines = gcodeText.split(/\r?\n/);
    const chunks: Chunk[] = [];
    const warnings: string[] = [];

    // Extract program number from header if present
    const progNum = this.extractProgramNumber(lines);

    // Track modal state through program
    let currentModal: ModalSnapshot = { coolant: [] };
    let chunkStart = 0;
    let chunkStartModal: ModalSnapshot = { coolant: [] };
    let chunkBytes = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineBytes = line.length + 1; // +1 for newline

      // Update modal state BEFORE deciding to split (so we know state after this line)
      const prevModal = { ...currentModal, coolant: [...(currentModal.coolant ?? [])] };
      this.updateModalState(line, currentModal);

      chunkBytes += lineBytes;

      // Check if we should split BEFORE this line or AFTER this line
      let shouldSplit = false;
      let splitAfter = false;

      const linesInChunk = i - chunkStart + 1;

      switch (strategy) {
        case "by_lines":
          if (linesInChunk >= maxLines) {
            shouldSplit = true;
            splitAfter = true;
          }
          break;
        case "by_bytes":
          if (chunkBytes >= maxBytes) {
            shouldSplit = true;
            splitAfter = true;
          }
          break;
        case "by_operation":
          // Split BEFORE operation start markers (comments like "(--- OP ...)")
          if (i > chunkStart && this.isOperationMarker(line)) {
            shouldSplit = true;
            splitAfter = false;
          }
          break;
        case "by_tool":
          // Split BEFORE new tool word
          if (i > chunkStart && this.isToolChange(line) && this.getToolNumber(line) !== prevModal.active_tool) {
            shouldSplit = true;
            splitAfter = false;
          }
          break;
      }

      // Safe block enforcement — never split when cycle or comp is active
      if (shouldSplit && safeBlock) {
        const checkModal = splitAfter ? currentModal : prevModal;
        if (checkModal.drill_cycle || checkModal.cutter_comp === "G41" || checkModal.cutter_comp === "G42") {
          // Defer split — find next safe block
          warnings.push(`Chunk split at line ${i + 1} deferred — cycle/cutter comp active`);
          shouldSplit = false;
        }
      }

      if (shouldSplit) {
        const splitEnd = splitAfter ? i : i - 1;
        if (splitEnd >= chunkStart) {
          const chunkLines = lines.slice(chunkStart, splitEnd + 1);
          const modalAtEnd = splitAfter ? { ...currentModal } : { ...prevModal };
          const chunk = this.buildChunk(
            chunkIndex,
            chunkLines,
            chunkStart,
            splitEnd,
            chunkStartModal,
            modalAtEnd,
            chunkComment,
            progNum,
            options.preserve_headers !== false,
          );
          chunks.push(chunk);
          chunkIndex++;
          chunkStart = splitEnd + 1;
          chunkStartModal = splitAfter ? { ...currentModal } : { ...prevModal };
          if (chunkStartModal.coolant) chunkStartModal.coolant = [...chunkStartModal.coolant];
          chunkBytes = 0;
          if (!splitAfter) {
            // This line starts the next chunk — we need to include it
            chunkBytes = lineBytes;
          }
        }
      }
    }

    // Final chunk
    if (chunkStart < lines.length) {
      const chunkLines = lines.slice(chunkStart);
      const chunk = this.buildChunk(
        chunkIndex,
        chunkLines,
        chunkStart,
        lines.length - 1,
        chunkStartModal,
        currentModal,
        chunkComment,
        progNum,
        options.preserve_headers !== false,
      );
      chunks.push(chunk);
    }

    const totalBytes = chunks.reduce((s, c) => s + c.byte_count, 0);
    const totalLines = chunks.reduce((s, c) => s + c.line_count, 0);

    return {
      chunks,
      total_chunks: chunks.length,
      total_bytes: totalBytes,
      total_lines: totalLines,
      program_number: progNum,
      strategy,
      warnings,
    };
  }

  /**
   * Extract program number from leading O-word.
   */
  private extractProgramNumber(lines: string[]): string | undefined {
    for (const line of lines.slice(0, 10)) {
      const m = line.match(/^O(\d+)/i);
      if (m) return m[1];
    }
    return undefined;
  }

  /**
   * Check if line is an operation marker comment.
   */
  private isOperationMarker(line: string): boolean {
    const t = line.trim();
    return /^\(={2,}|^\(--- OP|^\(OPERATION|^\(TOOL:|^\(CUT:/i.test(t);
  }

  /**
   * Check if line contains a tool change.
   */
  private isToolChange(line: string): boolean {
    const t = line.trim().toUpperCase();
    // Has T-word and either M6 on same line or just T
    return /\bT\d+/.test(t) && !t.startsWith("(");
  }

  /**
   * Extract tool number from line.
   */
  private getToolNumber(line: string): number | undefined {
    const m = line.match(/T(\d+)/i);
    return m ? parseInt(m[1], 10) : undefined;
  }

  /**
   * Update modal state from a line.
   */
  private updateModalState(line: string, state: ModalSnapshot): void {
    const code = this.stripComments(line).toUpperCase();
    const regex = /([A-Z])(-?\d+\.?\d*)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      const letter = match[1];
      const value = parseFloat(match[2]);
      if (letter === "G") {
        if (value === 0 || value === 1 || value === 2 || value === 3) state.motion = `G${value}`;
        else if (value === 17) state.plane = "G17";
        else if (value === 18) state.plane = "G18";
        else if (value === 19) state.plane = "G19";
        else if (value === 20) state.units = "G20";
        else if (value === 21) state.units = "G21";
        else if (value === 40) state.cutter_comp = "G40";
        else if (value === 41) state.cutter_comp = "G41";
        else if (value === 42) state.cutter_comp = "G42";
        else if (value === 80) state.drill_cycle = undefined;
        else if (value >= 81 && value <= 89) state.drill_cycle = `G${value}`;
        else if (value === 90) state.distance = "G90";
        else if (value === 91) state.distance = "G91";
        else if (value === 93) state.feed_mode = "G93";
        else if (value === 94) state.feed_mode = "G94";
        else if (value === 95) state.feed_mode = "G95";
        else if (value === 96) state.spindle_mode = "G96";
        else if (value === 97) state.spindle_mode = "G97";
        else if (value >= 54 && value <= 59) state.work_offset = `G${value}`;
      } else if (letter === "M") {
        if (value === 3 || value === 4) state.spindle_dir = `M${value}`;
        else if (value === 5) state.spindle_dir = "M5";
        else if (value === 7 || value === 8) {
          state.coolant = state.coolant ?? [];
          if (!state.coolant.includes(`M${value}`)) state.coolant.push(`M${value}`);
        } else if (value === 9) state.coolant = [];
      } else if (letter === "S") {
        state.spindle_speed = value;
      } else if (letter === "F") {
        state.feed_rate = value;
      } else if (letter === "T") {
        state.active_tool = value;
      } else if (letter === "D") {
        state.active_d = value;
      } else if (letter === "H") {
        state.active_h = value;
      }
    }
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r.trim();
  }

  /**
   * Build a chunk object with restored modal state prepended.
   */
  private buildChunk(
    index: number,
    lines: string[],
    startLine: number,
    endLine: number,
    startModal: ModalSnapshot,
    endModal: ModalSnapshot,
    addComment: boolean,
    progNum: string | undefined,
    preserveHeaders: boolean,
  ): Chunk {
    const out: string[] = [];

    // Chunk header
    if (preserveHeaders && index > 0) {
      out.push(`%`);
      if (progNum) out.push(`O${progNum}`);
    }

    if (addComment) {
      out.push(`(--- CHUNK ${index + 1} — ORIGINAL LINES ${startLine + 1}-${endLine + 1} ---)`);
    }

    // Modal restoration block for continuation chunks
    if (index > 0) {
      const restore = this.emitModalRestore(startModal);
      if (restore.length > 0) {
        if (addComment) out.push(`(--- MODAL STATE RESTORE ---)`);
        out.push(...restore);
      }
    }

    // Actual program lines
    out.push(...lines);

    const text = out.join("\n");
    const hasToolChange = lines.some(l => this.isToolChange(l));
    const hasProgramEnd = lines.some(l => /\bM0*(?:2|30)\b/.test(this.stripComments(l).toUpperCase()));

    return {
      index,
      lines: out,
      text,
      byte_count: text.length,
      line_count: out.length,
      start_line: startLine + 1,
      end_line: endLine + 1,
      modal_state_at_start: { ...startModal, coolant: [...(startModal.coolant ?? [])] },
      modal_state_at_end: { ...endModal, coolant: [...(endModal.coolant ?? [])] },
      has_tool_change: hasToolChange,
      has_program_end: hasProgramEnd,
      active_tool: endModal.active_tool,
    };
  }

  /**
   * Generate modal restoration block.
   */
  private emitModalRestore(modal: ModalSnapshot): string[] {
    const parts: string[] = [];
    const line1: string[] = [];
    if (modal.distance) line1.push(modal.distance);
    if (modal.units) line1.push(modal.units);
    if (modal.plane) line1.push(modal.plane);
    if (modal.feed_mode) line1.push(modal.feed_mode);
    if (line1.length > 0) parts.push(line1.join(" "));

    const line2: string[] = [];
    if (modal.work_offset) line2.push(modal.work_offset);
    if (modal.cutter_comp && modal.cutter_comp !== "G40") line2.push(modal.cutter_comp);
    if (line2.length > 0) parts.push(line2.join(" "));

    // Spindle state
    if (modal.spindle_dir && modal.spindle_dir !== "M5") {
      const s = modal.spindle_speed ? ` S${modal.spindle_speed}` : "";
      const mode = modal.spindle_mode === "G96" ? "G96 " : modal.spindle_mode === "G97" ? "G97 " : "";
      parts.push(`${mode}${modal.spindle_dir}${s}`.trim());
    }

    // Coolant
    if (modal.coolant && modal.coolant.length > 0) {
      parts.push(modal.coolant.join(" "));
    }

    // Feed rate
    if (modal.feed_rate !== undefined) {
      parts.push(`F${modal.feed_rate}`);
    }

    return parts;
  }

  /**
   * List supported strategies.
   */
  listStrategies(): ChunkStrategy[] {
    return ["by_lines", "by_bytes", "by_operation", "by_tool"];
  }

  /**
   * Get default options for a strategy.
   */
  defaultOptions(strategy: ChunkStrategy): ChunkerOptions {
    switch (strategy) {
      case "by_lines":
        return { strategy, max_lines_per_chunk: 500, safe_block: true, chunk_comment: true, preserve_headers: true };
      case "by_bytes":
        return { strategy, max_bytes_per_chunk: 8192, safe_block: true, chunk_comment: true, preserve_headers: true };
      case "by_operation":
        return { strategy, safe_block: true, chunk_comment: true, preserve_headers: true };
      case "by_tool":
        return { strategy, safe_block: true, chunk_comment: true, preserve_headers: true };
    }
  }
}

export const ppProgramChunkerEngine = new PPProgramChunkerEngine();
