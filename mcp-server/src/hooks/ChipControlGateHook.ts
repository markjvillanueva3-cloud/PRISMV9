/**
 * ChipControlGateHook — LATHE-PRO-MS7 FORGE-TRIPLE
 *
 * BLOCKS emission of turning programs that carry unresolved chip-wrapping
 * risk. Fires before any action that finalises a turning program for
 * unattended or production runs, and reads two caller-supplied reports:
 *   - `chip_wrapping_score`  (0-100, from TurningChipWrappingRiskEngine)
 *   - `chip_unmanned_verdict` ("GREEN" / "YELLOW" / "RED" from TurningChipUnmannedScoreEngine)
 *
 * Block rules:
 *   - chip_unmanned_verdict === "RED"  → BLOCK
 *   - chip_wrapping_score >= 60 with zero mitigations → BLOCK
 *   - chip_wrapping_score >= 25 without any mitigation supplied → BLOCK
 *
 * Bypass: `skipChipControlGate: true`.
 *
 * @module hooks/ChipControlGateHook
 * @milestone LATHE-PRO-MS7 / U-LPC06
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";

const GUARDED_ACTIONS = new Set([
  "turning_chip_analysis",
  "turning_assemble_program",
  "turning_swiss_channel_emit",
  "lathe_chip_breaking",
  "mill_turn_multi_channel",
]);

const chipControlGate: HookDefinition = {
  id: "chip-control-gate",
  name: "Chip Control Gate",
  description:
    "BLOCKS turning programs with unresolved chip-wrapping risk (score ≥ 60 " +
    "without mitigations, or ≥ 25 with none applied, or RED unmanned verdict).",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["lathe", "chip-control", "wrapping", "lights-out", "safety"],
  handler: (ctx: HookContext): HookResult => {
    const data = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";
    if (!GUARDED_ACTIONS.has(action)) {
      return hookSuccess(chipControlGate, "Not a guarded turning action", {
        data: { skipped: true },
      });
    }
    if (data.skipChipControlGate === true) {
      return hookSuccess(chipControlGate, "Gate bypassed by caller flag", {
        data: { bypass: true },
      });
    }

    const verdict = data.chip_unmanned_verdict;
    if (verdict === "RED") {
      return hookBlock(
        chipControlGate,
        "Chip-management verdict is RED — attended production only. " +
          "Mitigate chip wrapping / conveyor / filter before running unattended.",
        { data: { verdict } },
      );
    }

    const score = typeof data.chip_wrapping_score === "number" ? data.chip_wrapping_score : null;
    const mitigations = Array.isArray(data.chip_wrapping_mitigations)
      ? data.chip_wrapping_mitigations.length
      : typeof data.chip_wrapping_mitigations === "number"
        ? data.chip_wrapping_mitigations
        : 0;

    if (score !== null && score >= 60 && mitigations === 0) {
      return hookBlock(
        chipControlGate,
        `Chip-wrapping risk ${score}/100 is HIGH/EXTREME with zero mitigations applied. ` +
          `Apply oscillating feed, forced peck, speed cap, or high-pressure coolant before emission.`,
        { data: { score, mitigations } },
      );
    }
    if (score !== null && score >= 25 && mitigations === 0) {
      return hookBlock(
        chipControlGate,
        `Chip-wrapping risk ${score}/100 with zero mitigations applied. ` +
          `Select at least one mitigation (oscillating feed / forced peck) before program emission.`,
        { data: { score, mitigations } },
      );
    }

    if (verdict === "YELLOW") {
      return hookSuccess(
        chipControlGate,
        "Chip-management verdict YELLOW — operator check required during run.",
        { data: { verdict } },
      );
    }

    return hookSuccess(chipControlGate, "Chip control OK");
  },
};

export const CHIP_CONTROL_GATE_HOOKS: HookDefinition[] = [chipControlGate];
export { chipControlGate };
