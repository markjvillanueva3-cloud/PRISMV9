/**
 * BlockNumberOptimizer — Post-Processor algorithm #6.2
 *
 * Renumber G-code block numbers (N-words) for operator readability + DNC
 * anchor points. The original N-numbering from CAM is often dense (N1, N2,
 * N3 ...) or sparse with gaps; this normalizes to a configurable stride
 * and strips/preserves per call convention.
 *
 * Strategies:
 *   - "strip"   : remove ALL N-words (controllers default to sequential exec)
 *   - "dense"   : N10, N20, N30 (stride 10, standard convention)
 *   - "sparse"  : N100, N200, N300 (stride 100, for human-readable editing)
 *   - "operation_anchored" : restart numbering at each tool-change (M6), each
 *                            new tool block starts at N100/N200/... — operators
 *                            see "tool 1 is N1xx, tool 2 is N2xx" at a glance.
 *
 * Pure string transform. No I/O. Operates on the FULL g-code text + emits
 * the new text + the stats (lines changed, new N-words emitted).
 *
 * Citations:
 *   Fanuc 30i Operator's Manual §Optional Block Number
 *   ISO 6983-1 §N-word
 *   Haas Mill Programming Manual §Block Numbering (operator-readability convention)
 *
 * @module BlockNumberOptimizer
 * @version 1.0.0
 */

export type RenumberStrategy = "strip" | "dense" | "sparse" | "operation_anchored";

export interface BlockNumberInput {
  gcode: string;
  strategy: RenumberStrategy;
  /** Override stride for `dense`/`sparse`. Default 10 for dense, 100 for sparse. */
  stride?: number;
  /** Starting N-word value. Default 10 (so first emitted block is N10). */
  start?: number;
}

export interface BlockNumberResult {
  gcode: string;
  total_blocks_processed: number;
  n_words_emitted: number;
  n_words_stripped: number;
  notes: string[];
  source: string;
}

const N_WORD_RE = /^\s*N\d+\s*/i;            // matches leading N-word
const TOOL_CHANGE_RE = /\bM0?6\b/;            // M6 or M06 tool-change
const COMMENT_LINE_RE = /^\s*(?:;|\()/;       // skip pure-comment lines

const STRIDE_DEFAULT_DENSE = 10;
const STRIDE_DEFAULT_SPARSE = 100;
const MAX_GCODE_BYTES = 5_000_000;
const MAX_LINES = 200_000;

function emit(reason: string, input?: BlockNumberInput): BlockNumberResult {
  return {
    gcode: input?.gcode ?? "",
    total_blocks_processed: 0,
    n_words_emitted: 0,
    n_words_stripped: 0,
    notes: [reason],
    source: "BlockNumberOptimizer v1.0.0",
  };
}

export function renumber(input: BlockNumberInput): BlockNumberResult {
  if (!input || typeof input.gcode !== "string") return emit("gcode must be a string", input);
  if (input.gcode.length > MAX_GCODE_BYTES) return emit(`gcode exceeds ${MAX_GCODE_BYTES} bytes`, input);
  const validStrats: RenumberStrategy[] = ["strip","dense","sparse","operation_anchored"];
  if (!validStrats.includes(input.strategy)) return emit(`unknown strategy: ${input.strategy}`, input);

  const lines = input.gcode.split(/\r?\n/);
  if (lines.length > MAX_LINES) return emit(`gcode exceeds ${MAX_LINES} lines`, input);

  const stride = Number.isFinite(input.stride) && (input.stride as number) > 0
    ? Math.floor(input.stride as number)
    : (input.strategy === "sparse" ? STRIDE_DEFAULT_SPARSE : STRIDE_DEFAULT_DENSE);
  const startBase = Number.isFinite(input.start) && (input.start as number) >= 0
    ? Math.floor(input.start as number)
    : stride;

  let total_blocks_processed = 0;
  let n_words_emitted = 0;
  let n_words_stripped = 0;
  let toolGroup = 0;                          // increments on each M6
  let opStartN = startBase;
  let counter = startBase;
  const outLines: string[] = [];

  for (const raw of lines) {
    if (raw.length === 0) { outLines.push(raw); continue; }
    if (COMMENT_LINE_RE.test(raw)) { outLines.push(raw); continue; }

    total_blocks_processed++;
    const hadN = N_WORD_RE.test(raw);
    const stripped = raw.replace(N_WORD_RE, "");

    if (hadN) n_words_stripped++;

    if (input.strategy === "strip") {
      outLines.push(stripped);
      continue;
    }

    // operation_anchored: reset N on each tool change BEFORE this block emits
    if (input.strategy === "operation_anchored" && TOOL_CHANGE_RE.test(stripped)) {
      toolGroup++;
      opStartN = startBase + toolGroup * stride * 100;   // tool 0=N10/20..., tool 1=N1010/1020..., etc.
      counter = opStartN;
    }

    outLines.push(`N${counter} ${stripped.trimStart()}`);
    n_words_emitted++;
    counter += stride;
  }

  const notes: string[] = [];
  if (input.strategy === "strip") notes.push(`strip: removed ${n_words_stripped} existing N-words from ${total_blocks_processed} blocks`);
  else notes.push(`${input.strategy}: emitted ${n_words_emitted} N-words at stride ${stride}, starting from N${startBase}`);
  if (n_words_stripped > 0 && input.strategy !== "strip") notes.push(`replaced ${n_words_stripped} pre-existing N-words`);

  return {
    gcode: outLines.join("\n"),
    total_blocks_processed,
    n_words_emitted,
    n_words_stripped,
    notes,
    source: "BlockNumberOptimizer v1.0.0",
  };
}

export const BlockNumberOptimizer = {
  version: "1.0.0" as const,
  renumber,
};
