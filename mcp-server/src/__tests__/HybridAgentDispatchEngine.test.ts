/**
 * HybridAgentDispatchEngine.test.ts -- DOMAIN-SOUL-AGENTS / U3.
 *
 * Verifies the Claude/Hermes/Ollama lane selector: safety-write ALWAYS claude,
 * dark-proxy degrades, single-agent stays claude, fan-out review goes free. Real
 * decision assertions (R9), not toBeDefined.
 */
import { describe, it, expect } from "vitest";
import {
  HybridAgentDispatchEngine,
  MIN_FANOUT_FOR_HERMES,
  type HybridDispatchRequest,
} from "../engines/HybridAgentDispatchEngine.js";

function req(over: Partial<HybridDispatchRequest> = {}): HybridDispatchRequest {
  return {
    agent: "charlie-quoting",
    task_kind: "review",
    hermes_healthy: true,
    ollama_healthy: true,
    parallelism: 4,
    ...over,
  };
}

describe("HybridAgentDispatchEngine.selectLane", () => {
  it("fan-out review + Hermes healthy -> hermes free lane, degrade chain hermes->ollama->claude", () => {
    const v = HybridAgentDispatchEngine.selectLane(req());
    expect(v.lane).toBe("hermes");
    expect(v.free_lane).toBe(true);
    expect(v.fallback_chain).toEqual(["hermes", "ollama", "claude"]);
  });

  it("SAFETY: safety_write ALWAYS claude even with a healthy proxy + high fan-out", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ task_kind: "safety_write", parallelism: 16 }));
    expect(v.lane).toBe("claude");
    expect(v.free_lane).toBe(false);
    expect(v.fallback_chain).toEqual(["claude"]);
    expect(v.reason).toMatch(/safety-critical/i);
  });

  it("dark proxy + Ollama up + fan-out review -> ollama free lane (degrade ollama->claude)", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ hermes_healthy: false }));
    expect(v.lane).toBe("ollama");
    expect(v.free_lane).toBe(true);
    expect(v.fallback_chain).toEqual(["ollama", "claude"]);
  });

  it("dark proxy + Ollama down -> claude (no free lane available)", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ hermes_healthy: false, ollama_healthy: false }));
    expect(v.lane).toBe("claude");
    expect(v.free_lane).toBe(false);
  });

  it("single agent (parallelism=1) -> claude (free-lane setup not worth it)", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ parallelism: 1 }));
    expect(v.lane).toBe("claude");
    expect(v.reason).toMatch(/single agent/i);
  });

  it("exactly MIN_FANOUT_FOR_HERMES is enough to use the free lane", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ parallelism: MIN_FANOUT_FOR_HERMES }));
    expect(v.lane).toBe("hermes");
  });

  it("build task is NOT free-lane-eligible (write path) -> claude even at fan-out", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ task_kind: "build", parallelism: 8 }));
    expect(v.lane).toBe("claude");
    expect(v.reason).toMatch(/not free-lane-eligible/i);
  });

  it("force_claude override beats a healthy fan-out review", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ force_claude: true }));
    expect(v.lane).toBe("claude");
    expect(v.reason).toMatch(/force_claude/i);
  });

  it("audit + research + plan + draft are all free-lane-eligible at fan-out", () => {
    for (const k of ["audit", "research", "plan", "draft"] as const) {
      const v = HybridAgentDispatchEngine.selectLane(req({ task_kind: k }));
      expect(v.lane).toBe("hermes");
    }
  });

  // ---- failure modes -----------------------------------------------------
  it("FAILURE: invalid task_kind -> safe default claude", () => {
    const v = HybridAgentDispatchEngine.selectLane({ ...req(), task_kind: "nonsense" } as unknown as HybridDispatchRequest);
    expect(v.lane).toBe("claude");
    expect(v.reason).toMatch(/invalid request/i);
  });

  it("FAILURE: missing agent name -> safe default claude", () => {
    const v = HybridAgentDispatchEngine.selectLane({ ...req(), agent: "" });
    expect(v.lane).toBe("claude");
  });

  it("FAILURE: hermes_healthy not a boolean -> safe default claude", () => {
    const v = HybridAgentDispatchEngine.selectLane({ ...req(), hermes_healthy: "yes" as unknown as boolean });
    expect(v.lane).toBe("claude");
  });

  // ---- adversarial inputs ------------------------------------------------
  it("ADVERSARIAL: parallelism=0 is below schema min -> safe default claude (not a crash)", () => {
    const v = HybridAgentDispatchEngine.selectLane({ ...req(), parallelism: 0 });
    expect(v.lane).toBe("claude");
  });

  it("ADVERSARIAL: huge parallelism past the cap -> safe default claude (schema bound)", () => {
    const v = HybridAgentDispatchEngine.selectLane({ ...req(), parallelism: 9999 });
    expect(v.lane).toBe("claude");
  });

  it("ADVERSARIAL: safety_write + force_claude both set -> claude (no contradiction crash)", () => {
    const v = HybridAgentDispatchEngine.selectLane(req({ task_kind: "safety_write", force_claude: true }));
    expect(v.lane).toBe("claude");
  });
});
