/**
 * ToolChangeSequencer — Post-Processor algorithm #6.4
 *
 * Generates a controller-correct tool-change sequence: retract → orient →
 * (M19 spindle orient if required) → M6 tool change → re-engage. Wrong
 * sequence crashes the carousel against the spindle (no retract) or destroys
 * the side cutter (no orient on TSC machines).
 *
 * Controller variants (cited operator manuals):
 *   Fanuc/Haas: G91 G28 Z0 (machine-zero retract) → M19 (if TSC) → T## M6
 *   Okuma:      G91 G30 P1 Z0 → M19 → T## M6
 *   Heidenhain: TOOL CALL n (inline retract + change)
 *   Mazak:      G91 G28 Z0 → M19 → T## M6
 *   Siemens:    G91 G30 → M19 → T="..." M6
 *
 * Optional manual-stop (M00) AFTER tool change for operator verification
 * (setup-sheet calls this "operator verifies tool offset before next op").
 *
 * @module ToolChangeSequencer
 * @version 1.0.0
 */

export type ToolChangeController = "fanuc" | "haas" | "okuma" | "heidenhain" | "mazak" | "siemens";

export interface ToolChangeInput {
  controller: ToolChangeController;
  /** Next tool number to call. Range [1, 999]. */
  tool_number: number;
  /** Tool description for setup-sheet comment block. */
  tool_description?: string;
  /** Insert M00 (operator stop) after change for verification. */
  insert_operator_stop?: boolean;
  /** Spindle requires orient (M19) before change — TSC machines, ATC magazines. */
  spindle_orient_required?: boolean;
}

export interface ToolChangeResult {
  blocks: string[];
  retract_block: string;
  tool_change_block: string;
  orient_block: string | null;
  operator_stop_inserted: boolean;
  notes: string[];
  source: string;
}

interface ControllerToolChangeMap {
  retract: string;
  orient: string;
  changeFormat: (n: number) => string;
  supportsInlineRetract: boolean;   // Heidenhain TOOL CALL handles retract inline
}

const TC_MAP: Record<ToolChangeController, ControllerToolChangeMap> = {
  fanuc:       { retract: "G91 G28 Z0", orient: "M19", changeFormat: n => `T${String(n).padStart(2, "0")} M6`, supportsInlineRetract: false },
  haas:        { retract: "G91 G28 Z0", orient: "M19", changeFormat: n => `T${String(n).padStart(2, "0")} M6`, supportsInlineRetract: false },
  okuma:       { retract: "G91 G30 P1 Z0", orient: "M19", changeFormat: n => `T${String(n).padStart(2, "0")} M6`, supportsInlineRetract: false },
  heidenhain:  { retract: "L Z+250 R0 FMAX M91", orient: "M19", changeFormat: n => `TOOL CALL ${n}`, supportsInlineRetract: true },
  mazak:       { retract: "G91 G28 Z0", orient: "M19", changeFormat: n => `T${String(n).padStart(2, "0")} M6`, supportsInlineRetract: false },
  siemens:     { retract: "G91 G30 Z0 D0", orient: "M19", changeFormat: n => `T="T${String(n).padStart(2, "0")}" M6`, supportsInlineRetract: false },
};

const TOOL_MIN = 1;
const TOOL_MAX = 999;

function emit(reason: string): ToolChangeResult {
  return {
    blocks: [],
    retract_block: "",
    tool_change_block: "",
    orient_block: null,
    operator_stop_inserted: false,
    notes: [reason],
    source: "ToolChangeSequencer v1.0.0",
  };
}

export function generateSequence(input: ToolChangeInput): ToolChangeResult {
  if (!input) return emit("missing input");
  if (!TC_MAP[input.controller]) return emit(`unknown controller: ${input.controller}`);
  if (!Number.isFinite(input.tool_number)) return emit("tool_number not finite");
  if (input.tool_number < TOOL_MIN || input.tool_number > TOOL_MAX) return emit(`tool_number ${input.tool_number} outside [${TOOL_MIN}, ${TOOL_MAX}]`);
  if (!Number.isInteger(input.tool_number)) return emit("tool_number must be integer");

  const map = TC_MAP[input.controller];
  const blocks: string[] = [];
  const notes: string[] = [];

  if (input.tool_description) {
    blocks.push(`(TOOL ${input.tool_number}: ${input.tool_description})`);
  }

  // Heidenhain inline retract: TOOL CALL handles retract; skip explicit retract block
  let retract = map.retract;
  let orient: string | null = null;
  if (!map.supportsInlineRetract) {
    blocks.push(`${retract} (retract to machine zero before tool change)`);
  } else {
    notes.push(`${input.controller} TOOL CALL handles retract inline — no explicit retract block emitted`);
    retract = `(inline in ${map.changeFormat(input.tool_number)})`;
  }

  if (input.spindle_orient_required) {
    orient = map.orient;
    blocks.push(`${orient} (orient spindle for ATC/TSC)`);
  }

  const change = map.changeFormat(input.tool_number);
  blocks.push(`${change}`);

  let opStop = false;
  if (input.insert_operator_stop) {
    blocks.push("M00 (operator stop — verify tool offset)");
    opStop = true;
  }

  return {
    blocks,
    retract_block: retract,
    tool_change_block: change,
    orient_block: orient,
    operator_stop_inserted: opStop,
    notes,
    source: "ToolChangeSequencer v1.0.0",
  };
}

export const ToolChangeSequencer = {
  version: "1.0.0" as const,
  generateSequence,
};
