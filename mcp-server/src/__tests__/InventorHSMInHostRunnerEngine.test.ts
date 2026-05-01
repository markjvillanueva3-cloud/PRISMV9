import { describe, it, expect, beforeEach } from "vitest";

import {
  InventorHSMInHostRunnerEngine,
  INVENTOR_HSM_RUNNER_PLUGIN_ID,
  INVENTOR_HSM_RUNNER_VERSION,
  INVENTOR_HSM_RUNNER_ENDPOINT,
  HARD_STOP_BUDGET_FRAMES,
  buildRegistration,
  p99,
  countBandTransitions,
  type ScenarioDescriptor,
  type ObservedFrame,
  type ScenarioPlan,
  type ScenarioResult,
} from "../engines/InventorHSMInHostRunnerEngine.js";
import { CAMPluginCommunicationHubEngine } from "../engines/CAMPluginCommunicationHubEngine.js";

function descriptor(over: Partial<ScenarioDescriptor> = {}): ScenarioDescriptor {
  return {
    scenario_id: over.scenario_id ?? "inv-pocket-1",
    category: over.category ?? "pocket_2d",
    part_id: over.part_id ?? "p-1",
    stock_id: over.stock_id ?? "s-1",
    material_id: over.material_id ?? "m-1",
    tool_id: over.tool_id ?? "t-1",
    expected_frame_count: over.expected_frame_count ?? 12,
    expected_band_transitions: over.expected_band_transitions ?? 0,
    deliberate_hard_stop: over.deliberate_hard_stop ?? false,
    latency_p99_budget_ms: over.latency_p99_budget_ms ?? 100,
  };
}

function buildObserved(plan: ScenarioPlan, latency = 1, band = 0, payload_valid = true): ObservedFrame[] {
  return plan.expected_frames.map((f) => ({
    seq: f.seq,
    frame_type: f.frame_type,
    latency_ms: latency,
    hard_stop: false,
    band,
    payload_valid,
  }));
}

function resultFrom(plan: ScenarioPlan, observed: ObservedFrame[], over: Partial<ScenarioResult> = {}): ScenarioResult {
  return {
    scenario_id: plan.scenario_id,
    plugin_id: plan.plugin_id,
    observed,
    frames_in: over.frames_in ?? observed.length,
    frames_delivered: over.frames_delivered ?? observed.length,
    frames_queued: over.frames_queued ?? 0,
    frames_dropped: over.frames_dropped ?? 0,
    frames_unknown_target: over.frames_unknown_target ?? 0,
  };
}

describe("InventorHSMInHostRunnerEngine", () => {
  beforeEach(() => {
    InventorHSMInHostRunnerEngine.resetAll();
    CAMPluginCommunicationHubEngine.resetRegistry();
  });

  describe("constants", () => {
    it("plugin_id, version, endpoint, hard_stop_budget exposed at module + class level", () => {
      expect(INVENTOR_HSM_RUNNER_PLUGIN_ID).toBe("inventor-hsm-inhost-runner");
      expect(INVENTOR_HSM_RUNNER_VERSION).toBe("1.0.0");
      expect(INVENTOR_HSM_RUNNER_ENDPOINT).toBe("ws://localhost:7421/inhost/inventor_hsm");
      expect(HARD_STOP_BUDGET_FRAMES).toBe(3);
      expect(InventorHSMInHostRunnerEngine.INVENTOR_HSM_RUNNER_PLUGIN_ID).toBe(INVENTOR_HSM_RUNNER_PLUGIN_ID);
      expect(InventorHSMInHostRunnerEngine.HARD_STOP_BUDGET_FRAMES).toBe(HARD_STOP_BUDGET_FRAMES);
    });
  });

  describe("buildRegistration / register", () => {
    it("returns canonical registration record with target=inventor_hsm and 6 capabilities", () => {
      const reg = buildRegistration();
      expect(reg.plugin_id).toBe(INVENTOR_HSM_RUNNER_PLUGIN_ID);
      expect(reg.target).toBe("inventor_hsm");
      expect(reg.transport).toBe("websocket");
      expect(reg.endpoint).toBe(INVENTOR_HSM_RUNNER_ENDPOINT);
      expect(reg.version).toBe(INVENTOR_HSM_RUNNER_VERSION);
      expect(reg.capabilities).toEqual(["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"]);
    });

    it("accepts override plugin_id and version", () => {
      const reg = buildRegistration("custom-runner", "2.5.0");
      expect(reg.plugin_id).toBe("custom-runner");
      expect(reg.version).toBe("2.5.0");
      expect(reg.target).toBe("inventor_hsm");
    });

    it("register() inserts the plugin into the hub registry", () => {
      const reg = InventorHSMInHostRunnerEngine.register();
      const all = CAMPluginCommunicationHubEngine.registered();
      const hubReg = all.find((r) => r.plugin_id === reg.plugin_id);
      expect(hubReg?.plugin_id).toBe(INVENTOR_HSM_RUNNER_PLUGIN_ID);
      expect(hubReg?.target).toBe("inventor_hsm");
    });
  });

  describe("p99", () => {
    it("returns 0 for empty arrays (no frames implies no measurable latency)", () => {
      expect(p99([])).toBe(0);
    });

    it("returns the only value for a single-element array", () => {
      expect(p99([42])).toBe(42);
    });

    it("returns the highest sample for a 100-element ramp (nearest-rank: idx ceil(0.99*100)-1 == 98)", () => {
      const ramp = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
      expect(p99(ramp)).toBe(99);
    });

    it("nearest-rank computes correctly on 50 unsorted samples", () => {
      const samples = [10, 5, 8, 7, 1, 2, 3, 9, 6, 4, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
      // ceil(0.99*50)-1 = 49 -> sorted[49] = 50
      expect(p99(samples)).toBe(50);
    });
  });

  describe("countBandTransitions", () => {
    it("returns 0 for fewer than 2 observed frames", () => {
      expect(countBandTransitions([])).toBe(0);
      expect(countBandTransitions([{ seq: 0, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true }])).toBe(0);
    });

    it("counts 0<->non-zero transitions independently of red vs yellow", () => {
      const obs: ObservedFrame[] = [
        { seq: 0, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true },
        { seq: 1, frame_type: "force", latency_ms: 1, hard_stop: false, band: 1, payload_valid: true },
        { seq: 2, frame_type: "force", latency_ms: 1, hard_stop: false, band: 2, payload_valid: true },
        { seq: 3, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true },
      ];
      // 0 -> 1 (transition), 1 -> 2 (no transition, both non-zero), 2 -> 0 (transition) = 2
      expect(countBandTransitions(obs)).toBe(2);
    });

    it("re-sorts by seq so out-of-order arrival doesn't fool the counter", () => {
      const obs: ObservedFrame[] = [
        { seq: 2, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true },
        { seq: 0, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true },
        { seq: 1, frame_type: "force", latency_ms: 1, hard_stop: false, band: 1, payload_valid: true },
      ];
      // sorted by seq: 0(0), 1(1), 2(0) -> 0->1 + 1->0 = 2
      expect(countBandTransitions(obs)).toBe(2);
    });
  });

  describe("planScenario", () => {
    it("expands expected_frame_count into N/6 cycles of the 6 overlay types in fixed order", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ expected_frame_count: 12 }));
      expect(plan.expected_frames).toHaveLength(12);
      expect(plan.expected_frames.slice(0, 6).map((f) => f.frame_type)).toEqual([
        "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
      ]);
      expect(plan.expected_frames.slice(6, 12).map((f) => f.frame_type)).toEqual([
        "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
      ]);
      expect(plan.expected_frames.map((f) => f.seq)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it("throws when expected_frame_count is not a multiple of 6", () => {
      try {
        InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ expected_frame_count: 13 }));
        throw new Error("should have thrown");
      } catch (e) {
        expect((e as Error).message).toMatch(/multiple of 6/);
      }
    });

    it("scenarios_planned increments per-session and is isolated between sessions", () => {
      InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ scenario_id: "a" }));
      InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ scenario_id: "b" }));
      InventorHSMInHostRunnerEngine.planScenario("s-2", descriptor({ scenario_id: "c" }));
      expect(InventorHSMInHostRunnerEngine.getStats("s-1").scenarios_planned).toBe(2);
      expect(InventorHSMInHostRunnerEngine.getStats("s-2").scenarios_planned).toBe(1);
    });

    it("getPlan returns the stored plan and null when missing", () => {
      InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ scenario_id: "stored" }));
      const stored = InventorHSMInHostRunnerEngine.getPlan("s-1", "stored");
      expect(stored?.scenario_id).toBe("stored");
      expect(InventorHSMInHostRunnerEngine.getPlan("s-1", "missing")).toBeNull();
      expect(InventorHSMInHostRunnerEngine.getPlan("s-no", "stored")).toBeNull();
    });
  });

  describe("frameToEnvelope", () => {
    it("emits a HubFrameEnvelope with target=inventor_hsm and the planned seq", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const env = InventorHSMInHostRunnerEngine.frameToEnvelope(plan.expected_frames[3], '{"k":1}');
      expect(env.target).toBe("inventor_hsm");
      expect(env.seq).toBe(3);
      expect(env.frame_type).toBe("thermal");
      expect(env.payload).toBe('{"k":1}');
      expect(env.hard_stop).toBe(false);
    });
  });

  describe("summarize — happy path", () => {
    it("all 7 assertions pass when observed matches plan exactly", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan, 1, 0, true);
      const result = resultFrom(plan, observed);
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, result);
      expect(sum.overall_pass).toBe(true);
      expect(sum.assertions).toHaveLength(7);
      expect(sum.assertions.every((a) => a.pass)).toBe(true);
      expect(sum.frame_count).toBe(12);
      expect(sum.latency_p99_ms).toBe(1);
    });

    it("scenarios_passed increments and total_frames_observed accumulates", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan);
      InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const stats = InventorHSMInHostRunnerEngine.getStats("s-1");
      expect(stats.scenarios_passed).toBe(1);
      expect(stats.scenarios_failed).toBe(0);
      expect(stats.scenarios_summarized).toBe(1);
      expect(stats.total_frames_observed).toBe(12);
    });
  });

  describe("summarize — frame_arrival failures", () => {
    it("missing frames fail frame_arrival with metric.missing populated", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan).slice(0, 10); // drop last 2
      const result = resultFrom(plan, observed, { frames_in: 12, frames_delivered: 10, frames_dropped: 2 });
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, result);
      const arrival = sum.assertions.find((a) => a.name === "frame_arrival");
      expect(arrival?.pass).toBe(false);
      expect(arrival?.metric?.observed).toBe(10);
      expect(arrival?.metric?.expected).toBe(12);
    });

    it("duplicate seq numbers fail frame_arrival with metric.duplicate populated", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan);
      observed[5] = { ...observed[5], seq: 4 }; // duplicate seq=4
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const arrival = sum.assertions.find((a) => a.name === "frame_arrival");
      expect(arrival?.pass).toBe(false);
      expect(arrival?.metric?.duplicate).toBeGreaterThanOrEqual(1);
    });
  });

  describe("summarize — latency_p99", () => {
    it("p99 above budget fails the assertion with the budget number reported", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ latency_p99_budget_ms: 50 }));
      const observed = buildObserved(plan, 200);
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const lat = sum.assertions.find((a) => a.name === "latency_p99");
      expect(lat?.pass).toBe(false);
      expect(lat?.metric?.budget_ms).toBe(50);
      expect(lat?.metric?.p99_ms).toBe(200);
    });
  });

  describe("summarize — hard_stop_trigger", () => {
    it("deliberate violation must fire hard_stop within HARD_STOP_BUDGET_FRAMES of first red band", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1",
        descriptor({ deliberate_hard_stop: true, expected_band_transitions: 1 }));
      const observed = buildObserved(plan);
      observed[5] = { ...observed[5], band: 2 };          // first red at seq 5
      observed[7] = { ...observed[7], hard_stop: true };  // hard_stop at seq 7 -> distance 2 (within budget 3)
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const hs = sum.assertions.find((a) => a.name === "hard_stop_trigger");
      expect(hs?.pass).toBe(true);
      expect(sum.hard_stop_at_seq).toBe(7);
    });

    it("deliberate violation without hard_stop fails the assertion", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1",
        descriptor({ deliberate_hard_stop: true, expected_band_transitions: 1 }));
      const observed = buildObserved(plan);
      observed[5] = { ...observed[5], band: 2 };
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const hs = sum.assertions.find((a) => a.name === "hard_stop_trigger");
      expect(hs?.pass).toBe(false);
      expect(hs?.detail).toMatch(/deliberate violation set but no hard_stop observed/i);
    });

    it("hard_stop fired without deliberate flag fails the assertion", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ deliberate_hard_stop: false }));
      const observed = buildObserved(plan);
      observed[5] = { ...observed[5], hard_stop: true };
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const hs = sum.assertions.find((a) => a.name === "hard_stop_trigger");
      expect(hs?.pass).toBe(false);
      expect(hs?.detail).toMatch(/unexpected hard_stop/i);
    });
  });

  describe("summarize — session_stats_reconcile + encoder_schema + reconnect_drain", () => {
    it("delivered+queued+dropped+unknown != frames_in fails session_stats_reconcile", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan);
      const result = resultFrom(plan, observed, { frames_in: 12, frames_delivered: 5, frames_queued: 3, frames_dropped: 1, frames_unknown_target: 1 });
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, result);
      const stats = sum.assertions.find((a) => a.name === "session_stats_reconcile");
      expect(stats?.pass).toBe(false);
      // 5+3+1+1 = 10, frames_in=12 -> mismatch
    });

    it("any payload_valid=false fails encoder_schema with invalid count surfaced", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan);
      observed[2] = { ...observed[2], payload_valid: false };
      observed[5] = { ...observed[5], payload_valid: false };
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, resultFrom(plan, observed));
      const enc = sum.assertions.find((a) => a.name === "encoder_schema");
      expect(enc?.pass).toBe(false);
      expect(enc?.metric?.invalid).toBe(2);
    });

    it("frames_dropped > 0 fails reconnect_drain", () => {
      const plan = InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor());
      const observed = buildObserved(plan);
      const result = resultFrom(plan, observed, { frames_dropped: 4, frames_in: 16, frames_delivered: 12 });
      const sum = InventorHSMInHostRunnerEngine.summarize("s-1", plan, result);
      const drain = sum.assertions.find((a) => a.name === "reconnect_drain");
      expect(drain?.pass).toBe(false);
      expect(drain?.metric?.dropped).toBe(4);
    });
  });

  describe("session lifecycle", () => {
    it("resetSession clears stats for one session but leaves others intact", () => {
      InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ scenario_id: "a" }));
      InventorHSMInHostRunnerEngine.planScenario("s-2", descriptor({ scenario_id: "b" }));
      InventorHSMInHostRunnerEngine.resetSession("s-1");
      expect(InventorHSMInHostRunnerEngine.getStats("s-1").scenarios_planned).toBe(0);
      expect(InventorHSMInHostRunnerEngine.getStats("s-2").scenarios_planned).toBe(1);
    });

    it("resetAll wipes every session", () => {
      InventorHSMInHostRunnerEngine.planScenario("s-1", descriptor({ scenario_id: "a" }));
      InventorHSMInHostRunnerEngine.planScenario("s-2", descriptor({ scenario_id: "b" }));
      InventorHSMInHostRunnerEngine.resetAll();
      expect(InventorHSMInHostRunnerEngine.getStats("s-1").scenarios_planned).toBe(0);
      expect(InventorHSMInHostRunnerEngine.getStats("s-2").scenarios_planned).toBe(0);
    });

    it("getStats on unknown session returns empty zeros", () => {
      const stats = InventorHSMInHostRunnerEngine.getStats("ghost");
      expect(stats).toEqual({
        scenarios_planned: 0,
        scenarios_summarized: 0,
        scenarios_passed: 0,
        scenarios_failed: 0,
        total_frames_observed: 0,
      });
    });
  });

  describe("schema validation", () => {
    it("ScenarioDescriptor rejects empty scenario_id", () => {
      try {
        InventorHSMInHostRunnerEngine.planScenario("s-1", { ...descriptor(), scenario_id: "" });
        throw new Error("should have thrown");
      } catch (e) {
        expect(String(e)).toMatch(/scenario_id|String|min/i);
      }
    });

    it("ScenarioDescriptor rejects negative latency_p99_budget_ms", () => {
      try {
        InventorHSMInHostRunnerEngine.planScenario("s-1", { ...descriptor(), latency_p99_budget_ms: -5 });
        throw new Error("should have thrown");
      } catch (e) {
        expect(String(e)).toMatch(/positive|greater/i);
      }
    });

    it("ScenarioDescriptor rejects expected_frame_count <= 0", () => {
      try {
        InventorHSMInHostRunnerEngine.planScenario("s-1", { ...descriptor(), expected_frame_count: 0 });
        throw new Error("should have thrown");
      } catch (e) {
        expect(String(e)).toMatch(/positive|greater/i);
      }
    });
  });

  describe("end-to-end aggregate", () => {
    it("runs 3 scenarios end-to-end and accumulates stats correctly", () => {
      const sess = "s-e2e";
      for (let i = 0; i < 3; i++) {
        const plan = InventorHSMInHostRunnerEngine.planScenario(sess, descriptor({ scenario_id: `e2e-${i}` }));
        const observed = buildObserved(plan);
        InventorHSMInHostRunnerEngine.summarize(sess, plan, resultFrom(plan, observed));
      }
      const stats = InventorHSMInHostRunnerEngine.getStats(sess);
      expect(stats.scenarios_planned).toBe(3);
      expect(stats.scenarios_passed).toBe(3);
      expect(stats.scenarios_failed).toBe(0);
      expect(stats.scenarios_summarized).toBe(3);
      expect(stats.total_frames_observed).toBe(36);
    });

    it("mixed pass+fail scenarios separate cleanly in stats", () => {
      const sess = "s-mixed";
      const planA = InventorHSMInHostRunnerEngine.planScenario(sess, descriptor({ scenario_id: "good" }));
      InventorHSMInHostRunnerEngine.summarize(sess, planA, resultFrom(planA, buildObserved(planA)));
      const planB = InventorHSMInHostRunnerEngine.planScenario(sess, descriptor({ scenario_id: "bad" }));
      const badObserved = buildObserved(planB).slice(0, 6); // missing frames -> arrival fail
      InventorHSMInHostRunnerEngine.summarize(sess, planB,
        resultFrom(planB, badObserved, { frames_in: 12, frames_delivered: 6, frames_dropped: 6 }));
      const stats = InventorHSMInHostRunnerEngine.getStats(sess);
      expect(stats.scenarios_passed).toBe(1);
      expect(stats.scenarios_failed).toBe(1);
    });
  });
});
