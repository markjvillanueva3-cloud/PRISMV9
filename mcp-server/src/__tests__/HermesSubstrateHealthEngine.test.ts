/**
 * HermesSubstrateHealthEngine tests -- the pure grader for the Hermes liveness harness.
 *
 * R9: every assertion encodes WHY a verdict matters. The load-bearing invariants:
 *   - A live round-trip that reached Hermes => OK even when the LIFETIME counter is mostly fails
 *     (the 2026-06-29 sierra liveprobe doctrine: a live probe is authoritative, a stale counter is SUSPECT).
 *   - A proxy that is up but authenticated:false is DEGRADED, not OK (cloud lane detached).
 *   - A fallback round-trip is DEGRADED, not OK (local works, Hermes lane did not this call).
 *   - overall = worst-of the components (down > degraded > unknown > ok).
 *   - A missing EXPECTED task / an errored last result is surfaced, not assumed green (R12).
 */
import { describe, it, expect } from "vitest";
import {
  HermesSubstrateHealthEngine,
  type SubstrateProbe,
} from "../engines/HermesSubstrateHealthEngine.js";

/** A fully-healthy probe set (proxy up + authenticated, live Hermes round-trip, all tasks ready). */
function healthyProbe(): SubstrateProbe {
  return {
    proxy: { url: "http://127.0.0.1:8645/health", ok: true, status: "ok", authenticated: true, upstream: "xAI Grok OAuth" },
    roundTrip: { ran: true, source: "hermes", reachedHermes: true, ms: 820 },
    usage: { fired: 13, bySource: { hermes: 1, fail: 12 } },
    tasks: [
      { name: "PRISM Hermes Proxy", state: "Ready", lastRunTime: "2026-06-29T20:00:00Z", lastResult: 0 },
      { name: "PRISM Hermes Cron Prewarm", state: "Ready", lastRunTime: "2026-06-29T22:30:00Z", lastResult: 0 },
    ],
    expectedTasks: ["PRISM Hermes Proxy", "PRISM Hermes Cron Prewarm"],
  };
}

describe("HermesSubstrateHealthEngine.grade -- happy path", () => {
  it("a live Hermes round-trip grades OK even when the LIFETIME counter is 12/13 fails (live probe is authoritative)", () => {
    const r = HermesSubstrateHealthEngine.grade(healthyProbe());
    expect(r.overall).toBe("ok");
    expect(r.summary.roundTripReachedHermes).toBe(true);
    // The historical 12-fail counter must NOT drag the verdict down -- the live round-trip decides.
    const rt = r.components.find((c) => c.component === "round_trip")!;
    expect(rt.verdict).toBe("ok");
    expect(r.recommendations).toHaveLength(0);
  });

  it("renders a one-line summary reflecting the live lane + task counts", () => {
    const line = HermesSubstrateHealthEngine.renderReceipt(HermesSubstrateHealthEngine.grade(healthyProbe()));
    expect(line).toContain("OK");
    expect(line).toContain("proxy=up");
    expect(line).toContain("hermes-lane=live");
    expect(line).toContain("2/2 ready");
  });

  it("a Disabled task (e.g. Zebra) alongside Ready tasks is informational -- it does NOT fail the task component", () => {
    const probe = healthyProbe();
    probe.tasks.push({ name: "PRISM Zebra Orchestrator", state: "Disabled", lastRunTime: null, lastResult: null });
    const r = HermesSubstrateHealthEngine.grade(probe);
    const tasks = r.components.find((c) => c.component === "scheduled_tasks")!;
    expect(tasks.verdict).toBe("ok");
    expect(r.summary.tasksDisabled).toBe(1);
    expect(r.overall).toBe("ok");
  });

  it("an ALL-disabled fleet (ready=0) is DEGRADED, not falsely ok (the disabled branch must not mask zero-ready)", () => {
    // Scrutiny P2 arm B: the ready===0 check must precede the disabled-informational branch.
    const probe = healthyProbe();
    probe.tasks = [
      { name: "PRISM Hermes Proxy", state: "Disabled", lastRunTime: null, lastResult: null },
      { name: "PRISM Hermes Cron Prewarm", state: "Disabled", lastRunTime: null, lastResult: null },
    ];
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "scheduled_tasks")!.verdict).toBe("degraded");
    expect(r.summary.tasksReady).toBe(0);
    expect(r.summary.tasksDisabled).toBe(2);
  });
});

describe("HermesSubstrateHealthEngine.grade -- lane awareness (U2: the NVIDIA direct-lane finding)", () => {
  it("a DIRECT lane with authenticated:false grades OK (auth is N/A for a direct API endpoint, not a detach)", () => {
    const probe = healthyProbe();
    // The HERMES-NVIDIA-LANE: PROXY_URL repointed at a direct OpenAI-compatible endpoint.
    probe.proxy = { url: "https://integrate.api.nvidia.com/health", ok: true, authenticated: false, lane: "direct" };
    probe.roundTrip = { ran: true, source: "hermes", reachedHermes: true, ms: 9600 }; // the direct lane answered
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "proxy")!.verdict).toBe("ok");
    expect(r.components.find((c) => c.component === "proxy")!.reason).toMatch(/direct lane/i);
    expect(r.overall).toBe("ok");
  });

  it("an OAUTH-PROXY lane with authenticated:false is STILL degraded (the pool is genuinely detached)", () => {
    const probe = healthyProbe();
    probe.proxy = { url: "http://127.0.0.1:8645/health", ok: true, authenticated: false, lane: "oauth-proxy" };
    probe.roundTrip = { ran: true, source: "ollama", reachedHermes: false };
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "proxy")!.verdict).toBe("degraded");
  });

  it("a detached LOCAL OAuth proxy alongside a working DIRECT lane is informational only -- it does NOT drag overall down", () => {
    const probe = healthyProbe();
    probe.proxy = { url: "https://integrate.api.nvidia.com/health", ok: true, authenticated: false, lane: "direct" };
    probe.roundTrip = { ran: true, source: "hermes", reachedHermes: true };
    probe.localProxy = { url: "http://127.0.0.1:8645/health", ok: true, authenticated: false };
    const r = HermesSubstrateHealthEngine.grade(probe);
    const lp = r.components.find((c) => c.component === "local_oauth_proxy")!;
    expect(lp.verdict).toBe("ok"); // informational
    expect(lp.reason).toMatch(/detached/i);
    expect(r.overall).toBe("ok"); // the working direct lane + reached-hermes round-trip
  });
});

describe("HermesSubstrateHealthEngine.grade -- failure modes (R12 fail-loud)", () => {
  it("FAILURE 1: proxy down => overall DOWN with a start-the-proxy recommendation", () => {
    const probe = healthyProbe();
    probe.proxy = { url: "http://127.0.0.1:8645/health", ok: false, error: "ECONNREFUSED" };
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.overall).toBe("down");
    expect(r.components.find((c) => c.component === "proxy")!.verdict).toBe("down");
    expect(r.recommendations.some((x) => /proxy/i.test(x) && /start/i.test(x))).toBe(true);
  });

  it("FAILURE 2: proxy up but authenticated:false => DEGRADED (OAuth pool detached, cloud lane gone)", () => {
    const probe = healthyProbe();
    probe.proxy = { url: "http://127.0.0.1:8645/health", ok: true, status: "ok", authenticated: false };
    // A detached cloud lane also means a live Hermes round-trip cannot truly reach Hermes; model the fallback.
    probe.roundTrip = { ran: true, source: "ollama", reachedHermes: false, error: "no oauth" };
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.overall).toBe("degraded");
    expect(r.components.find((c) => c.component === "proxy")!.verdict).toBe("degraded");
    expect(r.recommendations.some((x) => /oauth/i.test(x))).toBe(true);
  });

  it("FAILURE 3: live round-trip fell back to Ollama => round_trip DEGRADED (Hermes lane unproven this run)", () => {
    const probe = healthyProbe();
    probe.roundTrip = { ran: true, source: "ollama", reachedHermes: false };
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "round_trip")!.verdict).toBe("degraded");
    expect(r.overall).toBe("degraded");
    // The lifetime bySource is surfaced for context, but the LIVE result is what graded it.
    expect(r.components.find((c) => c.component === "round_trip")!.reason).toMatch(/fallback/i);
  });

  it("FAILURE 4: a missing EXPECTED task => task component DEGRADED + re-install recommendation", () => {
    const probe = healthyProbe();
    probe.expectedTasks = ["PRISM Hermes Proxy", "PRISM Hermes Cron Prewarm", "PRISM Hermes Vault Digest"];
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "scheduled_tasks")!.verdict).toBe("degraded");
    expect(r.summary.missingExpected).toContain("PRISM Hermes Vault Digest");
    expect(r.recommendations.some((x) => /install-hermes-tasks/i.test(x))).toBe(true);
  });

  it("FAILURE 5: a task with a non-zero last result => DEGRADED (errored, not assumed green)", () => {
    const probe = healthyProbe();
    probe.tasks[1] = { name: "PRISM Hermes Cron Prewarm", state: "Ready", lastRunTime: "2026-06-29T22:30:00Z", lastResult: 1 };
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.summary.tasksErrored).toBe(1);
    expect(r.components.find((c) => c.component === "scheduled_tasks")!.verdict).toBe("degraded");
  });

  it("a never-run task (result 267011) is counted as never-run, NOT errored", () => {
    const probe = healthyProbe();
    probe.tasks.push({ name: "PRISM Hermes GEPA Weekly", state: "Ready", lastRunTime: null, lastResult: 267011 });
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.summary.tasksNeverRun).toBeGreaterThanOrEqual(1);
    expect(r.summary.tasksErrored).toBe(0);
  });
});

describe("HermesSubstrateHealthEngine.grade -- adversarial / edge", () => {
  it("ADVERSARIAL 1: a non-object probe throws (fail-loud, never a fabricated clean receipt)", () => {
    // R12: an absent/garbage probe must not silently grade OK.
    expect(() => HermesSubstrateHealthEngine.grade(null as unknown as SubstrateProbe)).toThrow(/probe/i);
    expect(() => HermesSubstrateHealthEngine.grade(undefined as unknown as SubstrateProbe)).toThrow(/probe/i);
  });

  it("ADVERSARIAL 2: missing proxy / round-trip sub-probes grade UNKNOWN (not OK) -- absence != health", () => {
    const probe = {
      proxy: {} as unknown as SubstrateProbe["proxy"],
      roundTrip: {} as unknown as SubstrateProbe["roundTrip"],
      tasks: [],
    } as SubstrateProbe;
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "proxy")!.verdict).toBe("unknown");
    expect(r.components.find((c) => c.component === "round_trip")!.verdict).toBe("unknown");
    // unknown is worse than ok, so overall is at least unknown -- never falsely "ok".
    expect(r.overall).not.toBe("ok");
  });

  it("ADVERSARIAL 3: zero tasks registered while tasks are expected => DOWN (the whole fleet is missing)", () => {
    const probe = healthyProbe();
    probe.tasks = [];
    probe.expectedTasks = ["PRISM Hermes Proxy"];
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.components.find((c) => c.component === "scheduled_tasks")!.verdict).toBe("down");
  });

  it("overall is strictly worst-of: one DOWN component dominates many OK ones", () => {
    const probe = healthyProbe();
    probe.proxy = { url: "x", ok: false, error: "down" }; // down
    // round-trip + tasks healthy
    const r = HermesSubstrateHealthEngine.grade(probe);
    expect(r.overall).toBe("down");
  });

  it("schemaVersion is stamped on every receipt", () => {
    expect(HermesSubstrateHealthEngine.grade(healthyProbe()).schemaVersion).toBe(HermesSubstrateHealthEngine.SCHEMA_VERSION);
  });
});
