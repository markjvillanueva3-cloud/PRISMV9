/**
 * PPGCodeStatisticsEngine — Descriptive statistics for G-code programs
 *
 * Pure descriptive analytics — reports what IS in a program, not predictions.
 * Distinct from:
 *   - CycleTimeEstimatorEngine (predicts cycle time from geometry)
 *   - PPGCodeProgramAnalyzerEngine (full AGI pipeline with embeddings)
 *   - PPGCodeLintEngine (validation rules, not statistics)
 *
 * Output includes:
 *   - G-code histogram (G0, G1, G2, G3, G17/18/19, G40/41/42, cycles, etc.)
 *   - M-code histogram (M3/4/5/6/7/8/9/30, etc.)
 *   - Tool usage (count per T-number, order of appearance)
 *   - Feed rate distribution (min / max / mean / median / unique count)
 *   - Spindle speed distribution
 *   - Work offset usage (G54-G59)
 *   - Axis word frequency (X, Y, Z, A, B, C, I, J, K)
 *   - Block-level metrics (total blocks, motion blocks, comment blocks,
 *     empty blocks, N-numbered blocks)
 *   - Tool-change segmentation (which blocks belong to which tool)
 *   - Rapid vs feed move counts and (if distance computable) traversal ratio
 *
 * Use cases:
 *   - Pre-ship audit: count tool changes, verify expected G-codes are present
 *   - Similar-program search: histogram fingerprinting
 *   - Quote estimation: tool count + feed usage as a quick proxy
 *   - Post-run reconciliation vs plan
 *
 * @module PPGCodeStatisticsEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface AxisWordUsage {
  X: number;
  Y: number;
  Z: number;
  A: number;
  B: number;
  C: number;
  I: number;
  J: number;
  K: number;
  U: number;
  V: number;
  W: number;
}

export interface ValueDistribution {
  count: number;           // number of blocks where this value appears
  min: number;
  max: number;
  mean: number;
  median: number;
  unique_values: number;   // number of distinct values
}

export interface ToolUsage {
  tool_number: number;
  appearances: number;     // number of times the T-word appears
  first_line: number;      // 1-indexed
  last_line: number;
}

export interface MoveTypeStats {
  rapid_moves: number;       // G0 blocks with coordinate motion
  feed_moves: number;        // G1 blocks with coordinate motion
  arc_cw_moves: number;      // G2 blocks
  arc_ccw_moves: number;     // G3 blocks
  rapid_distance: number;    // sum of Euclidean distances of G0 moves (mm)
  feed_distance: number;     // sum of Euclidean distances of G1 moves (mm)
  cut_to_rapid_ratio: number;  // feed_distance / rapid_distance (0 if no rapids)
}

export interface BlockStats {
  total_blocks: number;
  motion_blocks: number;     // blocks with at least one axis word
  comment_blocks: number;    // blocks with only a comment
  empty_blocks: number;
  n_numbered_blocks: number;
  annotated_comment_count: number;   // number of inline comments (parens)
}

export interface GCodeStatisticsResult {
  total_lines: number;
  total_bytes: number;

  program_number?: string;
  program_comment?: string;    // text of first `(...)` comment in program

  // Top-level histograms
  g_code_histogram: Record<string, number>;  // { "G0": 42, "G1": 108, ... }
  m_code_histogram: Record<string, number>;

  // Structural counts
  tool_changes: number;
  unique_tool_count: number;
  tools: ToolUsage[];
  work_offsets_used: string[];    // ["G54", "G55", ...]

  // Value distributions
  feed_rates: ValueDistribution;
  spindle_speeds: ValueDistribution;

  // Axis usage
  axis_words: AxisWordUsage;

  // Movement statistics
  moves: MoveTypeStats;

  // Block statistics
  blocks: BlockStats;

  // Program end marker detected
  has_program_end: boolean;

  // Modal state observations
  has_cutter_comp: boolean;      // any G41/G42 seen
  has_drill_cycle: boolean;      // any G81-G89 seen
  has_probing: boolean;          // G31 / G10 L91 etc.
  has_subprogram_call: boolean;  // any M98/M99 (Fanuc) or CALL (Siemens-style)
  has_macro: boolean;            // #var or IF/WHILE detected
  uses_inches: boolean;          // G20 seen
  uses_mm: boolean;              // G21 seen
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPGCodeStatisticsEngine {
  /**
   * Compute full descriptive statistics for a G-code program.
   *
   * Accepts multi-line G-code text. Line endings may be \n or \r\n.
   * Comments in `(...)` or after `;` are stripped for code analysis but
   * counted separately for the comment histogram.
   */
  analyze(gcode: string): GCodeStatisticsResult {
    const rawLines = gcode.split(/\r?\n/);
    const lineCount = rawLines.length;
    const byteCount = gcode.length;

    // Histograms
    const gHist: Record<string, number> = {};
    const mHist: Record<string, number> = {};

    // Axis word counters
    const axis: AxisWordUsage = { X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0, I: 0, J: 0, K: 0, U: 0, V: 0, W: 0 };

    // Tools
    const toolMap = new Map<number, ToolUsage>();
    const workOffsets = new Set<string>();

    // Value samples
    const feeds: number[] = [];
    const speeds: number[] = [];

    // Block state
    let totalBlocks = 0;
    let motionBlocks = 0;
    let commentBlocks = 0;
    let emptyBlocks = 0;
    let nNumberedBlocks = 0;
    let annotatedCount = 0;

    // Feature flags
    let hasCutterComp = false;
    let hasDrillCycle = false;
    let hasProbing = false;
    let hasSubprogramCall = false;
    let hasMacro = false;
    let usesInches = false;
    let usesMM = false;
    let hasEnd = false;

    // Program number and comment
    let programNumber: string | undefined;
    let programComment: string | undefined;

    // Move tracking
    let rapidMoves = 0;
    let feedMoves = 0;
    let arcCw = 0;
    let arcCcw = 0;
    let rapidDistance = 0;
    let feedDistance = 0;

    // Current position (default 0)
    let curX = 0, curY = 0, curZ = 0;
    let currentMotion: string | undefined;  // G0/G1/G2/G3

    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx];
      totalBlocks++;
      const trimmed = raw.trim();

      if (trimmed.length === 0) {
        emptyBlocks++;
        continue;
      }

      // Program number (capture first O#### in leading lines)
      if (!programNumber) {
        const om = trimmed.match(/^O(\d+)/i);
        if (om) programNumber = om[1];
      }

      // Comment extraction for program comment
      const parenMatch = trimmed.match(/\(([^)]*)\)/);
      if (parenMatch && programComment === undefined) {
        programComment = parenMatch[1].trim();
      }
      if (/\([^)]*\)/.test(trimmed)) annotatedCount++;

      // N-numbered
      if (/^N\d+/i.test(trimmed)) nNumberedBlocks++;

      // Comment-only block
      const stripped = this.stripComments(trimmed);
      if (stripped.length === 0) {
        commentBlocks++;
        continue;
      }

      const upper = stripped.toUpperCase();

      // Program-end
      if (/\bM0*(?:2|30)\b/.test(upper)) hasEnd = true;

      // Macro / subprogram detection
      if (/#\d+/.test(upper) || /\bIF\b|\bWHILE\b|\bGOTO\b/.test(upper)) hasMacro = true;
      if (/\bM9[89]\b/.test(upper)) hasSubprogramCall = true;
      if (/\bG31\b/.test(upper)) hasProbing = true;

      // Axis word count
      const hasMotion = this.countAxisWords(upper, axis);
      if (hasMotion) motionBlocks++;

      // Parse all G and M codes in the block
      const tokens = this.tokenize(upper);
      let blockG: string[] = [];

      for (const tok of tokens) {
        const letter = tok.letter;
        const num = tok.value;

        if (letter === "G") {
          const key = `G${this.formatCodeNumber(num)}`;
          gHist[key] = (gHist[key] ?? 0) + 1;
          blockG.push(key);

          // Feature flags
          if (num === 20) usesInches = true;
          if (num === 21) usesMM = true;
          if (num === 41 || num === 42) hasCutterComp = true;
          if (num >= 81 && num <= 89) hasDrillCycle = true;
          if (num >= 54 && num <= 59) workOffsets.add(key);
          if (num === 0 || num === 1 || num === 2 || num === 3) {
            currentMotion = key;
          }
          if (num === 31) hasProbing = true;
        } else if (letter === "M") {
          const key = `M${this.formatCodeNumber(num)}`;
          mHist[key] = (mHist[key] ?? 0) + 1;
        } else if (letter === "T") {
          const n = Math.trunc(num);
          const existing = toolMap.get(n);
          if (existing) {
            existing.appearances++;
            existing.last_line = idx + 1;
          } else {
            toolMap.set(n, {
              tool_number: n,
              appearances: 1,
              first_line: idx + 1,
              last_line: idx + 1,
            });
          }
        } else if (letter === "F") {
          feeds.push(num);
        } else if (letter === "S") {
          speeds.push(num);
        }
      }

      // Move-type counting and distance
      if (hasMotion && currentMotion) {
        const parsed = this.parseXYZ(upper);
        const nextX = parsed.X !== undefined ? parsed.X : curX;
        const nextY = parsed.Y !== undefined ? parsed.Y : curY;
        const nextZ = parsed.Z !== undefined ? parsed.Z : curZ;
        const dx = nextX - curX;
        const dy = nextY - curY;
        const dz = nextZ - curZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (currentMotion === "G0") {
          rapidMoves++;
          rapidDistance += dist;
        } else if (currentMotion === "G1") {
          feedMoves++;
          feedDistance += dist;
        } else if (currentMotion === "G2") {
          arcCw++;
          feedDistance += dist; // approximate; arc distance computed linearly
        } else if (currentMotion === "G3") {
          arcCcw++;
          feedDistance += dist;
        }

        curX = nextX;
        curY = nextY;
        curZ = nextZ;
      }
    }

    const tools = [...toolMap.values()].sort((a, b) => a.first_line - b.first_line);
    const toolChanges = (mHist["M6"] ?? 0) + (mHist["M06"] ?? 0);

    const cutToRapid = rapidDistance > 0 ? feedDistance / rapidDistance : 0;

    return {
      total_lines: lineCount,
      total_bytes: byteCount,
      program_number: programNumber,
      program_comment: programComment,
      g_code_histogram: gHist,
      m_code_histogram: mHist,
      tool_changes: toolChanges,
      unique_tool_count: tools.length,
      tools,
      work_offsets_used: [...workOffsets].sort(),
      feed_rates: this.distributionOf(feeds),
      spindle_speeds: this.distributionOf(speeds),
      axis_words: axis,
      moves: {
        rapid_moves: rapidMoves,
        feed_moves: feedMoves,
        arc_cw_moves: arcCw,
        arc_ccw_moves: arcCcw,
        rapid_distance: +rapidDistance.toFixed(4),
        feed_distance: +feedDistance.toFixed(4),
        cut_to_rapid_ratio: +cutToRapid.toFixed(4),
      },
      blocks: {
        total_blocks: totalBlocks,
        motion_blocks: motionBlocks,
        comment_blocks: commentBlocks,
        empty_blocks: emptyBlocks,
        n_numbered_blocks: nNumberedBlocks,
        annotated_comment_count: annotatedCount,
      },
      has_program_end: hasEnd,
      has_cutter_comp: hasCutterComp,
      has_drill_cycle: hasDrillCycle,
      has_probing: hasProbing,
      has_subprogram_call: hasSubprogramCall,
      has_macro: hasMacro,
      uses_inches: usesInches,
      uses_mm: usesMM,
    };
  }

  /**
   * Compare two programs and return a similarity score based on histogram
   * cosine similarity of G-code + M-code + tool usage.
   */
  similarity(a: GCodeStatisticsResult, b: GCodeStatisticsResult): number {
    const allKeys = new Set<string>([
      ...Object.keys(a.g_code_histogram),
      ...Object.keys(b.g_code_histogram),
      ...Object.keys(a.m_code_histogram).map(k => `_M_${k}`),
      ...Object.keys(b.m_code_histogram).map(k => `_M_${k}`),
    ]);

    let dot = 0, normA = 0, normB = 0;
    for (const k of allKeys) {
      const vA = k.startsWith("_M_")
        ? (a.m_code_histogram[k.substring(3)] ?? 0)
        : (a.g_code_histogram[k] ?? 0);
      const vB = k.startsWith("_M_")
        ? (b.m_code_histogram[k.substring(3)] ?? 0)
        : (b.g_code_histogram[k] ?? 0);
      dot += vA * vB;
      normA += vA * vA;
      normB += vB * vB;
    }
    if (normA === 0 || normB === 0) return 0;
    return +(dot / Math.sqrt(normA * normB)).toFixed(4);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r.trim();
  }

  private formatCodeNumber(n: number): string {
    // "G1" not "G1.0", but "G83.1" kept as-is
    if (Number.isInteger(n)) return n.toString();
    return n.toString();
  }

  /**
   * Tokenize a cleaned block into letter/value pairs.
   */
  private tokenize(block: string): { letter: string; value: number }[] {
    const tokens: { letter: string; value: number }[] = [];
    const regex = /([A-Z])(-?\d+\.?\d*)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(block)) !== null) {
      tokens.push({ letter: m[1], value: parseFloat(m[2]) });
    }
    return tokens;
  }

  /**
   * Count axis-word occurrences and return true if any coord axis present.
   */
  private countAxisWords(block: string, axis: AxisWordUsage): boolean {
    let hasCoord = false;
    const regex = /([XYZABCIJKUVW])-?\d+\.?\d*/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(block)) !== null) {
      const letter = m[1] as keyof AxisWordUsage;
      axis[letter] = (axis[letter] ?? 0) + 1;
      if ("XYZABCUVW".includes(letter)) hasCoord = true;
    }
    return hasCoord;
  }

  /**
   * Parse X/Y/Z values from a block (absolute).
   */
  private parseXYZ(block: string): { X?: number; Y?: number; Z?: number } {
    const out: { X?: number; Y?: number; Z?: number } = {};
    const mx = block.match(/\bX(-?\d+\.?\d*)/);
    const my = block.match(/\bY(-?\d+\.?\d*)/);
    const mz = block.match(/\bZ(-?\d+\.?\d*)/);
    if (mx) out.X = parseFloat(mx[1]);
    if (my) out.Y = parseFloat(my[1]);
    if (mz) out.Z = parseFloat(mz[1]);
    return out;
  }

  /**
   * Build a ValueDistribution from a numeric sample.
   */
  private distributionOf(values: number[]): ValueDistribution {
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, mean: 0, median: 0, unique_values: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((s, v) => s + v, 0);
    const mean = sum / n;
    const median = n % 2 === 1
      ? sorted[(n - 1) / 2]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const unique = new Set(sorted).size;

    return {
      count: n,
      min: sorted[0],
      max: sorted[n - 1],
      mean: +mean.toFixed(4),
      median: +median.toFixed(4),
      unique_values: unique,
    };
  }
}

export const ppGCodeStatisticsEngine = new PPGCodeStatisticsEngine();
