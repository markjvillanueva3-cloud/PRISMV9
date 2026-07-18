/**
 * CAMOperatorGateEngine — CAM-AI-TRAINING-MS0/U-CAMT-OPERATOR-GATE
 *
 * Pre-cut operator readiness gate. Before the spindle turns, every
 * machinist runs a checklist — this engine encodes the canonical 12
 * items + an S(x) score gated against the shop_floor doctrine
 * threshold (≥0.98).
 *
 * Items are split into BLOCKING (S(x) penalty -0.20, must be true to
 * cut) and WARN (penalty -0.02 / -0.05). Operator override is logged
 * but does NOT auto-clear a block.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export type GateItem =
  | "wcs_set"               // WCS origin probed + recorded
  | "tool_offsets_loaded"   // every tool in the program has H + D registered
  | "stock_clamped"         // workholding torqued + verified
  | "doors_closed"          // machine doors fully closed
  | "coolant_ready"         // tank full, lines unobstructed, nozzle aimed
  | "spindle_warm"          // spindle warmed up (≥15 min for precision)
  | "program_reviewed"      // operator walked the program once visually
  | "dry_run_done"          // air-cut dry run completed
  | "first_part_inspected"  // first-piece QC complete for run-mode
  | "tool_breakage_check"   // probe touch-off on each tool pre-cut
  | "e_stop_reachable"      // operator within reach of e-stop
  | "tool_wear_within_limits"; // tool wear sensors / visual check

export type Severity = "block" | "warn_high" | "warn_low";

const ITEM_SEVERITY: Record<GateItem, Severity> = {
  wcs_set:                "block",
  tool_offsets_loaded:    "block",
  stock_clamped:          "block",
  doors_closed:           "block",
  coolant_ready:          "warn_high",
  spindle_warm:           "warn_low",
  program_reviewed:       "warn_high",
  dry_run_done:           "warn_high",
  first_part_inspected:   "warn_low",
  tool_breakage_check:    "warn_high",
  e_stop_reachable:       "block",
  tool_wear_within_limits:"warn_high",
};

const PENALTY: Record<Severity, number> = {
  block:     -0.20,
  warn_high: -0.05,
  warn_low:  -0.02,
};

const BASE_SX = 1.0;
const SHOP_FLOOR_GATE = 0.98;

export interface OperatorChecklist {
  /** Each GateItem → true (PASS) / false (FAIL) / undefined (UNKNOWN, treated as FAIL). */
  items: Partial<Record<GateItem, boolean>>;
  /** Optional list of operator-acknowledged blocking items (does NOT clear them — just records intent). */
  acknowledgedBlocks?: ReadonlyArray<GateItem>;
}

export interface GateResult {
  passed: boolean;
  sxScore: number;
  blockingFailures: ReadonlyArray<GateItem>;
  warnFailures: ReadonlyArray<GateItem>;
  acknowledgedButStillBlocked: ReadonlyArray<GateItem>;
  rationale: string;
}

export class CAMOperatorGateEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMOperatorGateEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Pre-cut operator readiness gate — 12-item checklist with S(x) ≥0.98 shop-floor threshold.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "evaluate",  description: "Score a checklist + return gate result", actions: ["cam_operator_gate_evaluate"] },
      { name: "items",     description: "List GateItem enum + severity",          actions: ["cam_operator_gate_items"] },
      { name: "threshold", description: "Return shop_floor S(x) gate threshold", actions: ["cam_operator_gate_threshold"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMOperatorGateEngine", note: "use typed methods" };
  }

  /** Evaluate a checklist. Missing items are treated as FAIL. */
  evaluate(checklist: OperatorChecklist): GateResult {
    const blockingFailures: GateItem[] = [];
    const warnFailures: GateItem[] = [];
    let sx = BASE_SX;

    const acknowledged = new Set(checklist.acknowledgedBlocks ?? []);
    const acknowledgedButStillBlocked: GateItem[] = [];

    for (const item of Object.keys(ITEM_SEVERITY) as GateItem[]) {
      const passed = checklist.items[item] === true;
      if (passed) continue;
      const severity = ITEM_SEVERITY[item];
      sx += PENALTY[severity];
      if (severity === "block") {
        blockingFailures.push(item);
        if (acknowledged.has(item)) acknowledgedButStillBlocked.push(item);
      } else {
        warnFailures.push(item);
      }
    }

    const sxScore = Math.max(0, sx);
    const passed = blockingFailures.length === 0 && sxScore >= SHOP_FLOOR_GATE;

    const rationale = passed
      ? `S(x)=${sxScore.toFixed(3)} ≥ ${SHOP_FLOOR_GATE} — ready to cut`
      : blockingFailures.length > 0
        ? `${blockingFailures.length} blocking item(s) failed: ${blockingFailures.join(", ")} — S(x)=${sxScore.toFixed(3)}`
        : `S(x)=${sxScore.toFixed(3)} below shop_floor gate ${SHOP_FLOOR_GATE}`;

    return {
      passed,
      sxScore,
      blockingFailures,
      warnFailures,
      acknowledgedButStillBlocked,
      rationale,
    };
  }

  /** All 12 GateItem values + their severities. */
  items(): ReadonlyArray<{ item: GateItem; severity: Severity }> {
    return (Object.keys(ITEM_SEVERITY) as GateItem[]).map((item) => ({
      item,
      severity: ITEM_SEVERITY[item],
    }));
  }

  /** Shop-floor S(x) gate threshold — read-only. */
  threshold(): number {
    return SHOP_FLOOR_GATE;
  }
}

export const camOperatorGateEngine = new CAMOperatorGateEngine();
