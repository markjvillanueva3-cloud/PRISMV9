/**
 * SpeedFeedOutcomeFeedbackBridge-bus-capture.test.ts
 * ==================================================
 * Proves the R12 fix for the hardwired-`return true` bug (galaxy CLAUDE.md S5.5 / S12,
 * flagged by the bravo 2026-06-11 sweep): `tryBusCapture()` now calls the REAL
 * sfcOutcomeWire bus (`captureSFC`) and surfaces its `ok` flag, so
 * `stats().bus_capture_success_rate_pct` is a truthful metric instead of a fabricated 100%.
 *
 * R9 contract: every assertion encodes WHY -- the key test (mixed ratio) FAILS against the
 * old hardwired `return true` (which would always report 100%). captureSFC is mocked so we
 * control bus success/failure deterministically and avoid the real recordEmission side effect.
 *
 * Coverage: happy (ok:true) + 3 failure/edge (ok:false, throws, undefined-return, empty buffer)
 *           + 2 adversarial (throws, undefined) + wiring proof + machine fallback.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the canonical bus middleware so we control capture success WITHOUT the real
// recordEmission side effect (the sibling SFC engine tests mock it for the same reason).
vi.mock("../middleware/sfcOutcomeWire.js", () => ({ captureSFC: vi.fn() }));

import { captureSFC } from "../middleware/sfcOutcomeWire.js";
import { SpeedFeedOutcomeFeedbackBridgeEngine } from "../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js";

const mockCapture = vi.mocked(captureSFC);

// capture() reads only ~12 fields off NineAxisInput/Result; the cast avoids constructing the
// full types. The assertions verify REAL bus-capture behavior, so this is not a stub seam
// (mirrors the established seed pattern in calcDispatcher.speedfeed-outcome-wire.test.ts).
// `machine: null` means OMIT machine entirely (do NOT pass undefined -- that triggers the
// default param and keeps "VMC-01", which is not the same as an absent machine.name).
function mkInput(machine: string | null = "VMC-01", material = "4140", dia = 10) {
  const base: Record<string, unknown> = { material: { name: material }, tooling: { tool_diameter_mm: dia } };
  if (machine !== null) base.machine = { name: machine };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal capture() seed
  return base as any;
}
function mkResult() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal capture() seed
  return {
    mode: "balanced",
    sfc: { resolved: { iso_group: "P", tool_material: "carbide", operation: "milling", cut_type: "slot" } },
    recommendation: { cutting_speed_mpm: 120, feed_per_tooth_mm: 0.05, mrr_cm3min: 30, tool_life_min: 45 },
  } as any;
}
const OK = { ok: true, lineage_id: "L1", event_id: "E1", summary: {} };
const FAIL = { ok: false, lineage_id: "", event_id: "", summary: {}, warning: "wire-engine threw" };

describe("SpeedFeedOutcomeFeedbackBridge -- real bus capture (R12 hardwired-true fix)", () => {
  let eng: SpeedFeedOutcomeFeedbackBridgeEngine;
  beforeEach(() => {
    eng = new SpeedFeedOutcomeFeedbackBridgeEngine();
    mockCapture.mockReset();
  });

  it("happy: captureSFC ok:true -> bus_capture_ok true and rate 100%", () => {
    mockCapture.mockReturnValue(OK as never);
    const rec = eng.capture(mkInput(), mkResult());
    expect(rec.bus_capture_ok).toBe(true);
    expect(eng.stats().bus_capture_success_rate_pct).toBe(100);
  });

  it("REAL metric: captureSFC ok:false -> bus_capture_ok false and rate 0% (proves NOT hardwired-true)", () => {
    mockCapture.mockReturnValue(FAIL as never);
    const rec = eng.capture(mkInput(), mkResult());
    expect(rec.bus_capture_ok).toBe(false);
    expect(eng.stats().bus_capture_success_rate_pct).toBe(0);
  });

  it("R9 intent: 2 ok + 1 fail -> rate 66.67% (the metric tracks reality; old hardwired-true gave 100%)", () => {
    mockCapture
      .mockReturnValueOnce(OK as never)
      .mockReturnValueOnce(OK as never)
      .mockReturnValueOnce(FAIL as never);
    eng.capture(mkInput(), mkResult());
    eng.capture(mkInput(), mkResult());
    eng.capture(mkInput(), mkResult());
    const s = eng.stats();
    expect(s.records_count).toBe(3);
    expect(s.bus_capture_success_rate_pct).toBeCloseTo(66.67, 1);
  });

  it("adversarial: captureSFC throws -> bus_capture_ok false (telemetry failure never claims success)", () => {
    mockCapture.mockImplementation(() => { throw new Error("bus exploded"); });
    const rec = eng.capture(mkInput(), mkResult());
    expect(rec.bus_capture_ok).toBe(false);
    expect(eng.stats().bus_capture_success_rate_pct).toBe(0);
  });

  it("adversarial: captureSFC returns undefined -> bus_capture_ok false (defensive against malformed bus)", () => {
    mockCapture.mockReturnValue(undefined as never);
    const rec = eng.capture(mkInput(), mkResult());
    expect(rec.bus_capture_ok).toBe(false);
  });

  it("wiring proof: captureSFC called once with the NineAxis engine tag, action, and the recommendation payload", () => {
    mockCapture.mockReturnValue(OK as never);
    const result = mkResult();
    eng.capture(mkInput("MILL-3"), result);
    expect(mockCapture).toHaveBeenCalledTimes(1);
    const arg = mockCapture.mock.calls[0]![0] as {
      engine: string; action?: string; context?: { machine_id?: string; operation?: string }; recommended: unknown;
    };
    expect(arg.engine).toBe("SpeedFeedNineAxisOrchestratorEngine");
    expect(arg.action).toBe("sfc_nine_axis_run");
    expect(arg.context?.machine_id).toBe("MILL-3");
    expect(arg.context?.operation).toBe("milling");
    expect(arg.recommended).toBe(result.recommendation);
  });

  it("machine_name fallback: machine.name absent -> capture keyed under default_3axis_vmc", () => {
    mockCapture.mockReturnValue(OK as never);
    eng.capture(mkInput(null), mkResult());
    const arg = mockCapture.mock.calls[0]![0] as { context?: { machine_id?: string } };
    expect(arg.context?.machine_id).toBe("default_3axis_vmc");
  });

  it("boundary: empty buffer -> rate 0 and records_count 0 (no fabricated success on zero records)", () => {
    const s = eng.stats();
    expect(s.bus_capture_success_rate_pct).toBe(0);
    expect(s.records_count).toBe(0);
  });
});
