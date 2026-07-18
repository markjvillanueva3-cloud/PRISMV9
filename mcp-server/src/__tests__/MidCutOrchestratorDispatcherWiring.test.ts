import { describe, it, expect } from "vitest";
import {
  midCutDecisionOrchestratorEngine,
  type MidCutDecisionInput,
} from "../engines/MidCutDecisionOrchestratorEngine.js";

/**
 * Dispatcher wiring contract test (GAP-1 closure / foxtrot iter16).
 *
 * Verifies that the params shape used by safetyDispatcher.ts:`midcut_decide`
 * round-trips through the engine without throwing AND that the verdict / feed
 * override / per-channel evidence are populated correctly.
 *
 * The dispatcher branch lives in:
 *   mcp-server/src/tools/dispatchers/safetyDispatcher.ts
 * around the `MIDCUT_ORCHESTRATOR_ACTIONS.has(action)` branch — see also
 * `print-to-cnc-capability-reassessment-2026-05-23.md` for the GAP-1 closure
 * narrative.
 */
describe("safetyDispatcher → midcut_decide wiring", () => {
  it("dispatches a nominal multi-channel input → continue verdict", () => {
    const params: MidCutDecisionInput = {
      ae: { class: "fresh", rms_sigma: 0.5 },
      force: { tangential_force_n: 510, baseline_force_n: 500 },
      vibration: { rms_ms2: 11, baseline_rms_ms2: 10 },
      spindle: {
        current_load_pct: 55,
        warning_pct: 80,
        hold_pct: 90,
        retract_pct: 100,
      },
    };
    const r = midCutDecisionOrchestratorEngine.decide(params);
    expect(r.verdict).toBe("continue");
    expect(r.feed_override_pct.value).toBe(100);
    expect(r.evidence).toHaveLength(4);
  });

  it("dispatches a force-only alarm input → reduce_feed verdict", () => {
    const r = midCutDecisionOrchestratorEngine.decide({
      force: { tangential_force_n: 720, baseline_force_n: 500 },
    });
    expect(r.verdict).toBe("reduce_feed");
    expect(r.feed_override_pct.value).toBeLessThan(100);
    expect(r.evidence[0].channel).toBe("force");
    expect(r.evidence[0].source).toMatch(/Boothroyd/);
  });

  it("dispatches an AE breakage input → abort verdict + feed=0", () => {
    const r = midCutDecisionOrchestratorEngine.decide({ ae: { class: "breakage" } });
    expect(r.verdict).toBe("abort");
    expect(r.feed_override_pct.value).toBe(0);
    expect(r.evidence[0].severity).toBe(1.0);
    expect(r.confidence.value).toBeGreaterThan(0);
  });

  it("dispatches a spindle-spike input → abort with ISO 13374-1 citation", () => {
    const r = midCutDecisionOrchestratorEngine.decide({
      spindle: {
        current_load_pct: 160,
        warning_pct: 80,
        hold_pct: 90,
        retract_pct: 100,
        breakage_spike_pct: 150,
      },
    });
    expect(r.verdict).toBe("abort");
    expect(r.evidence[0].source).toMatch(/ISO 13374|Erdel/);
  });

  it("dispatches max-of-channels: force-pull-off + vibration-reduce + spindle-warning → pull_off", () => {
    const r = midCutDecisionOrchestratorEngine.decide({
      force: { tangential_force_n: 950, baseline_force_n: 500 },   // 1.9× → pull_off
      vibration: { rms_ms2: 28, baseline_rms_ms2: 10 },             // 2.8× → reduce
      spindle: {
        current_load_pct: 82,                                       // ≥ warning → reduce
        warning_pct: 80,
        hold_pct: 90,
        retract_pct: 100,
      },
    });
    expect(r.verdict).toBe("pull_off");
    expect(r.evidence).toHaveLength(3);
    expect(r.evidence.some(e => e.verdict === "pull_off" && e.channel === "force")).toBe(true);
  });

  it("returns AtomicValue-shaped feed_override_pct with integer % unit", () => {
    const r = midCutDecisionOrchestratorEngine.decide({
      ae: { class: "wear", rms_sigma: 4 },
    });
    expect(r.feed_override_pct.unit).toBe("%");
    expect(Number.isInteger(r.feed_override_pct.value)).toBe(true);
    expect(r.feed_override_pct.source).toBe("midcut_orchestrator_v1");
  });

  it("preserves per-channel weights override", () => {
    const r = midCutDecisionOrchestratorEngine.decide({
      ae: { class: "fresh" },
      force: { tangential_force_n: 720, baseline_force_n: 500 },
      weights: { ae: 0.7, force: 0.3 },
    });
    expect(r.verdict).toBe("reduce_feed");
    expect(r.evidence).toHaveLength(2);
  });
});
