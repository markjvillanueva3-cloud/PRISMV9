/**
 * LatheProgramBacktraceEngine
 * =============================
 *
 * Given a failing block (or inspection deviation Z location) in a turning
 * program, walk backward through the block history to identify the
 * *source cause*:
 *   - offending tool (T-code)
 *   - offending offset (H/D/WCS) set in an earlier block
 *   - offending feed / spindle state set by a prior M-code
 *   - upstream macro call that established the failing geometry
 *
 * Produces an ordered trace of suspected causes ranked by heuristic
 * plausibility (recency × category weight).
 *
 * Distinct from existing:
 *   - ProgramValidatorEngine          : static pre-run validation
 *   - FailureRootCauseEngine (generic): shop-floor RCA, not G-code traversal
 *   - This engine                     : block-stream backtrace for lathe
 *
 * References:
 *   - Fanuc 30i-MODEL B "Parameter Manual" §10 (tool offset recall)
 *   - Shigley-style root-cause analysis tree (for weight heuristics)
 *
 * @module engines/LatheProgramBacktraceEngine
 * @milestone LATHE-PRO-MS12
 */

export type BacktraceBlockKind =
  | "tool_change"
  | "offset_set"
  | "wcs_shift"
  | "feed_set"
  | "spindle_set"
  | "macro_call"
  | "motion"
  | "m_code"
  | "comment";

export interface BacktraceBlock {
  n: number;
  kind: BacktraceBlockKind;
  /** Raw block text (optional, for reporting) */
  text?: string;
  /** Parsed params (tool_id, offset_value, feed, rpm, macro_name…) */
  params?: Record<string, string | number>;
}

export interface LatheProgramBacktraceInput {
  blocks: BacktraceBlock[];
  /** Block N to backtrace from (the failing block) */
  failing_block_n: number;
  /** Max history depth to walk (default 50) */
  max_depth?: number;
}

export interface BacktraceCause {
  n: number;
  kind: BacktraceBlockKind;
  weight: number;
  rationale: string;
  text?: string;
}

export interface LatheProgramBacktraceResult {
  failing_block_n: number;
  causes: BacktraceCause[];
  top_suspect?: BacktraceCause;
  reasoning: string[];
}

const KIND_WEIGHT: Record<BacktraceBlockKind, number> = {
  offset_set: 1.0,
  tool_change: 0.9,
  wcs_shift: 0.85,
  macro_call: 0.75,
  feed_set: 0.5,
  spindle_set: 0.4,
  motion: 0.25,
  m_code: 0.2,
  comment: 0.05,
};

class LatheProgramBacktraceEngineImpl {
  trace(i: LatheProgramBacktraceInput): LatheProgramBacktraceResult {
    const maxDepth = Math.max(1, i.max_depth ?? 50);
    const failIdx = i.blocks.findIndex((b) => b.n === i.failing_block_n);
    const reasoning: string[] = [];

    if (failIdx < 0) {
      reasoning.push(`Failing block N${i.failing_block_n} not found in stream`);
      return {
        failing_block_n: i.failing_block_n,
        causes: [],
        reasoning,
      };
    }

    const causes: BacktraceCause[] = [];
    const start = Math.max(0, failIdx - maxDepth);
    for (let k = failIdx - 1; k >= start; k--) {
      const b = i.blocks[k];
      if (b.kind === "motion" || b.kind === "comment") continue;
      const recency = 1 - (failIdx - k) / (failIdx - start + 1);
      const weight = round3(KIND_WEIGHT[b.kind] * (0.4 + 0.6 * recency));
      causes.push({
        n: b.n,
        kind: b.kind,
        weight,
        rationale: rationaleFor(b, failIdx - k),
        text: b.text,
      });
    }

    causes.sort((a, b) => b.weight - a.weight);
    const top = causes[0];

    reasoning.push(`Walked ${failIdx - start} blocks back from N${i.failing_block_n}`);
    reasoning.push(`${causes.length} candidate cause(s); top: ${top?.kind ?? "none"} @ N${top?.n ?? "-"}`);
    if (top) reasoning.push(top.rationale);

    return {
      failing_block_n: i.failing_block_n,
      causes,
      top_suspect: top,
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return { reference: "Fanuc 30i-B Parameter Manual §10 offset recall; RCA weighting heuristic" };
  }
}

function rationaleFor(b: BacktraceBlock, distance: number): string {
  const tag = `N${b.n} (${distance} blocks upstream)`;
  switch (b.kind) {
    case "offset_set":
      return `${tag}: offset set — likely geometry origin`;
    case "tool_change":
      return `${tag}: tool swap — verify wear/orientation on replaced tool`;
    case "wcs_shift":
      return `${tag}: WCS shift — confirm part datum transfer`;
    case "macro_call":
      return `${tag}: macro call — inspect macro variables/body`;
    case "feed_set":
      return `${tag}: feed change — review cutting load regime`;
    case "spindle_set":
      return `${tag}: spindle state change — verify surface speed`;
    case "m_code":
      return `${tag}: M-code event — coolant/door/orient state`;
    default:
      return `${tag}: candidate upstream cause`;
  }
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheProgramBacktraceEngine = new LatheProgramBacktraceEngineImpl();
export type { LatheProgramBacktraceEngineImpl };
