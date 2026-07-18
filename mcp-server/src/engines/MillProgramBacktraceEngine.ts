/**
 * MillProgramBacktraceEngine
 * ============================
 *
 * Given a failing block (or inspection deviation Z location) in a mill
 * program, walk backward through the block history to identify the
 * *source cause*:
 *
 *   Lathe-shared block kinds (8):
 *     - tool_change      — ATC swap (mill uses umbrella/swing-arm/chain)
 *     - offset_set       — H/D/length offset write
 *     - wcs_shift        — G54..G59, G92, G10
 *     - feed_set         — F or feed-state change
 *     - spindle_set      — S, M3/M4/M5
 *     - macro_call       — G65/G66 / Heidenhain CYCL CALL
 *     - motion           — G0/G1/G2/G3
 *     - m_code           — M-code event
 *     - comment          — annotation
 *
 *   Mill-canonical block kinds (5 added):
 *     - cutter_comp_set    — G41/G42 D-offset (cutter radius comp; mill-specific)
 *     - tool_length_comp   — G43 H-offset (mill tool-length comp; tighter than lathe)
 *     - rotary_index       — 4th/5th-axis index G68/G68.2 (TCP), B-axis, A-axis
 *     - pallet_change      — M60 / pallet-shuttle event
 *     - probe_cycle        — Renishaw G65 P9811/9814 etc (ties to iter82)
 *
 * Produces an ordered trace of suspected causes ranked by heuristic
 * plausibility (recency × category weight).
 *
 * Distinct from existing:
 *   - LatheProgramBacktraceEngine     : 9-kind lathe taxonomy
 *   - ProgramValidatorEngine           : static pre-run validation
 *   - FailureRootCauseEngine (generic) : shop-floor RCA, not G-code traversal
 *   - This engine                      : 14-kind mill block-stream backtrace
 *
 * References:
 *   - Fanuc 30i-MODEL B "Parameter Manual" §10 (mill tool offset recall)
 *   - Heidenhain TNC 640 user-doc §Cycle 19 (5-axis TCPM)
 *   - Mazak Matrix 2 EIA/ISO programming manual (mill probe + pallet)
 *   - Shigley-style root-cause analysis tree (weight heuristics)
 *
 * @module engines/MillProgramBacktraceEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-PROGRAM-BACKTRACE (iter83)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Default backtrace depth — walk up to N blocks upstream. */
export const DEFAULT_MAX_DEPTH = 50;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillBacktraceBlockKind =
  // Lathe-shared (8)
  | "tool_change"
  | "offset_set"
  | "wcs_shift"
  | "feed_set"
  | "spindle_set"
  | "macro_call"
  | "motion"
  | "m_code"
  | "comment"
  // MILL-CANONICAL (5)
  | "cutter_comp_set"
  | "tool_length_comp"
  | "rotary_index"
  | "pallet_change"
  | "probe_cycle";

/** Mill-canonical block kinds not in lathe taxonomy. */
export const MILL_CANONICAL_BLOCK_KINDS: MillBacktraceBlockKind[] = [
  "cutter_comp_set", "tool_length_comp", "rotary_index", "pallet_change", "probe_cycle",
];

export interface MillBacktraceBlock {
  n: number;
  kind: MillBacktraceBlockKind;
  text?: string;
  params?: Record<string, string | number>;
}

export interface MillProgramBacktraceInput {
  blocks: MillBacktraceBlock[];
  failing_block_n: number;
  max_depth?: number;
}

export interface MillBacktraceCause {
  n: number;
  kind: MillBacktraceBlockKind;
  weight: number;
  rationale: string;
  text?: string;
}

export interface MillProgramBacktraceResult {
  failing_block_n: number;
  causes: MillBacktraceCause[];
  top_suspect?: MillBacktraceCause;
  reasoning: string[];
}

/**
 * Category weights — heuristic plausibility. Mill-canonical kinds
 * (cutter_comp_set, tool_length_comp) get the HIGHEST weights because
 * D-offset and H-offset errors are the dominant defect-mode on mills:
 * mis-set comp shifts every cut by the offset delta, not just one line.
 */
const KIND_WEIGHT: Record<MillBacktraceBlockKind, number> = {
  // Mill-canonical highest weights
  cutter_comp_set: 1.05,    // mill-canonical: D-offset shifts EVERY pocket wall
  tool_length_comp: 1.0,    // mill-canonical: H-offset shifts EVERY Z move
  // Then lathe-shared offsets
  offset_set: 0.95,
  tool_change: 0.9,
  wcs_shift: 0.85,
  rotary_index: 0.8,        // mill-canonical: 4/5-axis TCP frame change
  macro_call: 0.75,
  pallet_change: 0.7,       // mill-canonical: pallet swap may re-zero
  probe_cycle: 0.65,        // mill-canonical: probe may write offset
  feed_set: 0.5,
  spindle_set: 0.4,
  motion: 0.25,
  m_code: 0.2,
  comment: 0.05,
};

// Kinds that are filtered out (too noisy for backtrace)
const SKIP_KINDS: MillBacktraceBlockKind[] = ["motion", "comment"];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

function rationaleFor(b: MillBacktraceBlock, distance: number): string {
  const tag = `N${b.n} (${distance} blocks upstream)`;
  switch (b.kind) {
    case "cutter_comp_set":
      return `${tag}: G41/G42 cutter radius D-offset set — likely cause of every pocket/contour wall shift`;
    case "tool_length_comp":
      return `${tag}: G43 H-offset set — likely cause of Z-axis depth shift`;
    case "offset_set":
      return `${tag}: offset set — geometry origin candidate`;
    case "tool_change":
      return `${tag}: ATC tool swap — verify wear/length on replaced tool`;
    case "wcs_shift":
      return `${tag}: WCS shift (G54..G59 / G92 / G10) — confirm part datum`;
    case "rotary_index":
      return `${tag}: 4/5-axis rotary index (G68/G68.2 TCPM) — verify TCP frame transformation`;
    case "macro_call":
      return `${tag}: macro call (G65/G66) — inspect macro variables/body`;
    case "pallet_change":
      return `${tag}: pallet shuttle (M60) — verify pallet WCS persisted`;
    case "probe_cycle":
      return `${tag}: probe cycle — may have written offset back to active WCS`;
    case "feed_set":
      return `${tag}: feed change — review cutting load regime`;
    case "spindle_set":
      return `${tag}: spindle state change — verify rpm/orientation`;
    case "m_code":
      return `${tag}: M-code event — coolant/door/orient state`;
    default:
      return `${tag}: candidate upstream cause`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillProgramBacktraceEngineImpl {
  trace(i: MillProgramBacktraceInput): MillProgramBacktraceResult {
    this.validate(i);
    const maxDepth = Math.max(1, i.max_depth ?? DEFAULT_MAX_DEPTH);
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

    const causes: MillBacktraceCause[] = [];
    const start = Math.max(0, failIdx - maxDepth);
    for (let k = failIdx - 1; k >= start; k--) {
      const b = i.blocks[k];
      if (SKIP_KINDS.includes(b.kind)) continue;
      const distance = failIdx - k;
      // Recency factor: 1.0 immediately upstream, 0.0 at the window edge.
      const recency = 1 - distance / Math.max(1, failIdx - start + 1);
      // Combined weight: kind_weight × (0.4 + 0.6 × recency). Recency boost is
      // bounded so a deeply-upstream offset_set isn't completely overwritten
      // by a recent unimportant block.
      const weight = round3(KIND_WEIGHT[b.kind] * (0.4 + 0.6 * recency));
      causes.push({
        n: b.n,
        kind: b.kind,
        weight,
        rationale: rationaleFor(b, distance),
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

  getStats(): {
    block_kinds: MillBacktraceBlockKind[];
    mill_canonical_block_kinds: MillBacktraceBlockKind[];
    default_max_depth: number;
    skip_kinds: MillBacktraceBlockKind[];
    reference: string;
  } {
    return {
      block_kinds: [
        "tool_change", "offset_set", "wcs_shift", "feed_set", "spindle_set",
        "macro_call", "motion", "m_code", "comment",
        "cutter_comp_set", "tool_length_comp", "rotary_index", "pallet_change", "probe_cycle",
      ],
      mill_canonical_block_kinds: MILL_CANONICAL_BLOCK_KINDS,
      default_max_depth: DEFAULT_MAX_DEPTH,
      skip_kinds: SKIP_KINDS,
      reference: "Fanuc 30i-B Parameter Manual §10; Heidenhain TNC 640 Cycle 19 TCPM; Mazak Matrix 2 EIA/ISO; RCA heuristic",
    };
  }

  private validate(i: MillProgramBacktraceInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillProgramBacktraceEngine.trace: input required");
    if (!Array.isArray(i.blocks)) throw new TypeError("blocks[] required");
    if (typeof i.failing_block_n !== "number" || !Number.isFinite(i.failing_block_n)) {
      throw new TypeError("failing_block_n must be a finite number");
    }
  }
}

export const millProgramBacktraceEngine = new MillProgramBacktraceEngineImpl();
export type { MillProgramBacktraceEngineImpl };
