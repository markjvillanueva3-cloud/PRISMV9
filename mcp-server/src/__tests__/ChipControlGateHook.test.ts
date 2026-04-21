/**
 * ChipControlGateHook — unit tests (MS7 / U-LPC06)
 */
import { describe, it, expect } from "vitest";
import { chipControlGate } from "../hooks/ChipControlGateHook.js";

function ctx(action: string, data: Record<string, unknown> = {}) {
  return { target: { action, data } } as any;
}

describe("ChipControlGateHook", () => {
  it("skips non-turning actions", () => {
    const r = chipControlGate.handler(ctx("some_other_action"));
    expect(r.success).toBe(true);
    expect(r.data?.skipped).toBe(true);
  });

  it("bypasses when skipChipControlGate=true", () => {
    const r = chipControlGate.handler(ctx("turning_chip_analysis", { skipChipControlGate: true }));
    expect(r.success).toBe(true);
    expect(r.data?.bypass).toBe(true);
  });

  it("BLOCKS on chip_unmanned_verdict=RED", () => {
    const r = chipControlGate.handler(ctx("turning_assemble_program", { chip_unmanned_verdict: "RED" }));
    expect(r.success).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("passes YELLOW with operator-check advisory", () => {
    const r = chipControlGate.handler(ctx("turning_assemble_program", { chip_unmanned_verdict: "YELLOW" }));
    expect(r.success).toBe(true);
    expect(String(r.message)).toMatch(/operator check/);
  });

  it("BLOCKS on risk ≥ 60 with zero mitigations", () => {
    const r = chipControlGate.handler(
      ctx("turning_assemble_program", { chip_wrapping_score: 75, chip_wrapping_mitigations: 0 }),
    );
    expect(r.success).toBe(false);
    expect(String(r.message)).toMatch(/HIGH\/EXTREME/);
  });

  it("BLOCKS on risk ≥ 25 with zero mitigations", () => {
    const r = chipControlGate.handler(
      ctx("turning_assemble_program", { chip_wrapping_score: 40, chip_wrapping_mitigations: 0 }),
    );
    expect(r.success).toBe(false);
    expect(String(r.message)).toMatch(/zero mitigations/);
  });

  it("allows risk ≥ 25 when mitigations applied", () => {
    const r = chipControlGate.handler(
      ctx("turning_assemble_program", { chip_wrapping_score: 35, chip_wrapping_mitigations: 2 }),
    );
    expect(r.success).toBe(true);
  });

  it("mitigation count can be supplied as array or number", () => {
    const asArray = chipControlGate.handler(
      ctx("turning_assemble_program", {
        chip_wrapping_score: 40,
        chip_wrapping_mitigations: ["oscillating_feed", "forced_peck"],
      }),
    );
    expect(asArray.success).toBe(true);

    const asNumber = chipControlGate.handler(
      ctx("turning_assemble_program", { chip_wrapping_score: 40, chip_wrapping_mitigations: 2 }),
    );
    expect(asNumber.success).toBe(true);
  });

  it("passes when no reports supplied (no evidence = no block)", () => {
    const r = chipControlGate.handler(ctx("turning_assemble_program"));
    expect(r.success).toBe(true);
  });

  it("guards multi-channel action as well", () => {
    const r = chipControlGate.handler(
      ctx("mill_turn_multi_channel", { chip_wrapping_score: 80, chip_wrapping_mitigations: 0 }),
    );
    expect(r.success).toBe(false);
  });

  it("BLOCK response carries verdict in data", () => {
    const r = chipControlGate.handler(ctx("turning_chip_analysis", { chip_unmanned_verdict: "RED" }));
    expect(r.data?.verdict).toBe("RED");
  });

  it("hook definition has expected metadata", () => {
    expect(chipControlGate.id).toBe("chip-control-gate");
    expect(chipControlGate.mode).toBe("blocking");
    expect(chipControlGate.enabled).toBe(true);
    expect(chipControlGate.tags).toContain("wrapping");
  });
});
