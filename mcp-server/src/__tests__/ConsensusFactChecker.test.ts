/**
 * ConsensusFactCheckerEngine — auto-validates model answers against PRISM truth.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-FACT-CHECK.
 *
 * Tests use real ENGINE_DIGEST (file exists on this machine) plus a
 * synthetic dispatcher action allowlist. No mocks needed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ConsensusFactCheckerEngine } from "../engines/ConsensusFactCheckerEngine.js";

let engine: ConsensusFactCheckerEngine;

beforeEach(async () => {
  engine = new ConsensusFactCheckerEngine();
  await engine.loadKnowledgeBase({
    dispatcherActions: [
      "prism_calc:cutting_force",
      "prism_calc:tool_life",
      "prism_calc:thermal",
      "prism_ai:reason",
      "prism_ai:consensus",
      "prism_ai:codex_exec",
      "prism_dev:build",
      "prism_safety:validate_physics",
    ],
  });
});

describe("ConsensusFactCheckerEngine — engine name validation", () => {
  it("verifies a real engine mention against ENGINE_DIGEST", async () => {
    const r = engine.check("Use the AccessControlListEngine to fan out queries", "gpt-5.5");
    expect(r.totalMentions).toBe(1);
    expect(r.verifiedMentions).toBe(1);
    expect(r.hallucinations).toEqual([]);
    expect(r.verified[0]).toEqual({ kind: "engine", mention: "AccessControlListEngine", modelName: "gpt-5.5" });
    expect(r.factualityScore).toBe(1);
  });

  it("flags a hallucinated engine name", async () => {
    const r = engine.check("Use the SpeedFeedSpaceshipEngine to compute warp drive", "grok-4");
    expect(r.hallucinations).toHaveLength(1);
    expect(r.hallucinations[0].mention).toBe("SpeedFeedSpaceshipEngine");
    expect(r.hallucinations[0].kind).toBe("engine");
    expect(r.hallucinations[0].modelName).toBe("grok-4");
    expect(r.factualityScore).toBe(0);
  });

  it("dedups repeated mentions of the same engine", async () => {
    const r = engine.check("Call AccessControlListEngine once. Then AccessControlListEngine again. And AccessControlListEngine.", "x");
    expect(r.totalMentions).toBe(1);
    expect(r.verifiedMentions).toBe(1);
  });

  it("returns NaN factualityScore when no mentions found", () => {
    const r = engine.check("Just plain prose with no engine names at all.", "x");
    expect(r.totalMentions).toBe(0);
    expect(r.factualityScore).toBeNaN();
  });

  it("suggests closest match for slightly-misspelled engines (edit distance ≤ 2)", () => {
    // AccessControlListEngine is real → typo with one char swap should resolve to it
    const r = engine.check("Use the AcessControlListEngine for auth", "x");
    expect(r.hallucinations).toHaveLength(1);
    expect(r.hallucinations[0].closestMatch).toBe("AccessControlListEngine");
  });

  it("returns null closestMatch for completely fabricated names", () => {
    const r = engine.check("Use the QuantumWarpDriveBlasterEngine to compute the answer", "x");
    expect(r.hallucinations).toHaveLength(1);
    expect(r.hallucinations[0].closestMatch).toBeNull();
  });
});

describe("ConsensusFactCheckerEngine — dispatcher action validation", () => {
  it("verifies a real dispatcher action mention", () => {
    const r = engine.check("Call prism_ai:consensus to fan out", "gpt-5.5");
    expect(r.verifiedMentions).toBe(1);
    expect(r.verified[0]).toEqual({ kind: "dispatcher_action", mention: "prism_ai:consensus", modelName: "gpt-5.5" });
    expect(r.hallucinations).toEqual([]);
  });

  it("flags a hallucinated dispatcher action", () => {
    const r = engine.check("Call prism_ai:fly_to_mars to handle that", "gpt-5.5");
    expect(r.hallucinations).toHaveLength(1);
    expect(r.hallucinations[0].mention).toBe("prism_ai:fly_to_mars");
    expect(r.hallucinations[0].kind).toBe("dispatcher_action");
  });

  it("handles whitespace variations in dispatcher action mentions (prism_ai : reason)", () => {
    const r = engine.check("Use prism_ai : reason to think", "x");
    expect(r.verifiedMentions).toBe(1);
    expect(r.verified[0].mention).toBe("prism_ai:reason");
  });

  it("dedups repeated dispatcher mentions", () => {
    const r = engine.check("Call prism_ai:reason then prism_ai:reason then prism_ai:reason", "x");
    expect(r.totalMentions).toBe(1);
  });

  it("computes factuality across mixed engine + dispatcher mentions", () => {
    const r = engine.check(
      "Use AccessControlListEngine and FakeNonExistentEngine plus call prism_ai:reason and prism_ai:bogus_action",
      "gpt-5.5",
    );
    expect(r.totalMentions).toBe(4);
    expect(r.verifiedMentions).toBe(2);
    expect(r.hallucinations).toHaveLength(2);
    expect(r.factualityScore).toBe(0.5);
  });
});

describe("ConsensusFactCheckerEngine — knowledge base lifecycle", () => {
  it("throws when check() is called before knowledge base is loaded", () => {
    const fresh = new ConsensusFactCheckerEngine();
    expect(() => fresh.check("AccessControlListEngine", "x")).toThrow(/knowledge base not loaded/);
  });

  it("can run check() with an explicitly passed knowledge base (no global state)", async () => {
    const fresh = new ConsensusFactCheckerEngine();
    const kb = await fresh.loadKnowledgeBase({ dispatcherActions: ["prism_x:y"] });
    fresh.reset(); // wipe global state
    const r = fresh.check("Call prism_x:y now", "x", kb);
    expect(r.verifiedMentions).toBe(1);
  });

  it("reset() clears the knowledge base", async () => {
    engine.reset();
    expect(engine.getKnowledgeBase()).toBeNull();
    expect(() => engine.check("AccessControlListEngine", "x")).toThrow(/knowledge base not loaded/);
  });

  it("loadKnowledgeBase populates engines from real ENGINE_DIGEST", () => {
    const kb = engine.getKnowledgeBase()!;
    expect(kb).not.toBeNull();
    // ENGINE_DIGEST on this machine has many engines — assert there's a healthy population
    expect(kb.engines.size).toBeGreaterThan(50);
    expect(kb.dispatcherActions.size).toBe(8);
  });
});

describe("ConsensusFactCheckerEngine — input validation", () => {
  it("rejects non-string text", () => {
    expect(() => engine.check(42 as unknown as string, "x")).toThrow(/string/);
  });

  it("accepts empty string with zero mentions", () => {
    const r = engine.check("", "x");
    expect(r.totalMentions).toBe(0);
    expect(r.factualityScore).toBeNaN();
  });
});
