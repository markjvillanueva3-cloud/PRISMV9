/**
 * CAMDeepLearningOrchestratorEngine.test.ts — CAM-EXHAUST-MS0/U-CAM117
 *
 * Exercises the multi-source aggregation logic with full dependency
 * injection — no module mocks. Adapters are deterministic fakes injected
 * via setPhysicsAdapter / setTribalAdapter / setOllamaAdapter /
 * setNVIDIAAdapter. The orchestrator's real aggregation, tie-breaking,
 * disagreement-penalty, escalation, and traceability code are all live.
 *
 * Coverage matrix:
 *   - Full agreement (4-of-4) → high composite confidence, no escalation
 *   - Voices array carries per-source latency + evidence
 *   - 3-of-4 agreement → escalates with reduced composite
 *   - 2-vs-2 weighted split → physics+ollama wins by total weight
 *   - Single available source path
 *   - All sources unavailable → null + escalate
 *   - Source throw is captured as source_threw without crashing
 *   - Adapter not set → unavailable with named errorCode
 *   - disableSources excludes a source
 *   - Custom weights flip the winner
 *   - escalationThreshold extremes
 *   - Bad input (unknown task / empty / non-string)
 *   - Per-task agreement keys (strategy / op_type / tool composite / parameter sort)
 *   - Confidence extraction prefers value.confidence else 0.5 prior
 *   - listSources / getDefaultWeights snapshot / healthCheckAll
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CAMDeepLearningOrchestratorEngine,
  type AGIDecisionTask,
  type MLAdapter,
  type PhysicsAdapter,
  type TribalAdapter,
} from "../engines/CAMDeepLearningOrchestratorEngine";

// ── Adapter fixture factories — production logic remains unmocked ───────────

function physicsReturning(value: unknown, confidence: number, evidence: string): PhysicsAdapter {
  return {
    evaluate: vi.fn(async () => ({ value, confidence, evidence })),
  };
}
function physicsNull(): PhysicsAdapter {
  return { evaluate: vi.fn(async () => null) };
}
function tribalReturning(value: unknown, confidence: number, evidence: string): TribalAdapter {
  return { lookup: vi.fn(async () => ({ value, confidence, evidence })) };
}
function tribalNull(): TribalAdapter {
  return { lookup: vi.fn(async () => null) };
}

function mlOk(parsed: unknown): MLAdapter {
  return {
    async query() {
      return { success: true, parsed, raw: JSON.stringify(parsed) };
    },
    async healthCheck() {
      return { available: true };
    },
  };
}
function mlFail(errorCode: string): MLAdapter {
  return {
    async query() {
      return { success: false, parsed: null, raw: null, errorCode };
    },
    async healthCheck() {
      return { available: false };
    },
  };
}
function mlThrows(message: string): MLAdapter {
  return {
    async query() {
      throw new Error(message);
    },
    async healthCheck() {
      return { available: false };
    },
  };
}

const STRATEGY_VALUE_A = {
  strategy: "adaptive_clearing",
  rationale: "low engagement",
  alternates: ["pocket"],
  confidence: 0.85,
};
const STRATEGY_VALUE_B = {
  strategy: "trochoidal",
  rationale: "different",
  alternates: [],
  confidence: 0.7,
};
const PARAM_VALUE_A = { parameters: { feed: 1500, rpm: 12000 }, confidence: 0.9 };
const PARAM_VALUE_B = { parameters: { feed: 2000, rpm: 8000 }, confidence: 0.6 };
const OP_VALUE_A = { op_type: "face_milling", family: "roughing", confidence: 0.91 };
const TOOL_VALUE_A = {
  tool_family: "endmill",
  diameter_mm: 12,
  flutes: 4,
  rationale: "x",
  confidence: 0.85,
};

beforeEach(() => {
  CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(null);
  CAMDeepLearningOrchestratorEngine.setTribalAdapter(null);
  CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlFail("ollama_unavailable"));
  CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlFail("nvidia_unavailable"));
});

afterEach(() => {
  CAMDeepLearningOrchestratorEngine.resetMLAdapters();
  CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(null);
  CAMDeepLearningOrchestratorEngine.setTribalAdapter(null);
  vi.clearAllMocks();
});

describe("CAMDeepLearningOrchestratorEngine — full agreement", () => {
  it("4 sources agree → composite confidence > 0.8, no escalation", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "Kienzle MRR optimum")
    );
    CAMDeepLearningOrchestratorEngine.setTribalAdapter(
      tribalReturning(STRATEGY_VALUE_A, 0.8, "JM Die 4140 tip")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(STRATEGY_VALUE_A));

    const r = await CAMDeepLearningOrchestratorEngine.decide<typeof STRATEGY_VALUE_A>(
      "strategy_recommend",
      "steel pocket"
    );
    expect(r.value).toEqual(STRATEGY_VALUE_A);
    expect(r.escalateToHuman).toBe(false);
    expect(r.confidence).toBeGreaterThan(0.8);
    expect(r.agreeingSources.sort()).toEqual(
      ["nvidia", "ollama", "physics", "tribal"].sort()
    );
    expect(r.dissentingSources).toEqual([]);
    expect(r.voices.length).toBe(4);
  });

  it("voices array carries per-source latency, weight, evidence", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "Kienzle MRR optimum")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    const phys = r.voices.find((v) => v.source === "physics");
    expect(phys?.evidence).toBe("Kienzle MRR optimum");
    expect(phys?.confidence).toBe(0.9);
    expect(phys?.weight).toBe(1.0);
    const ollama = r.voices.find((v) => v.source === "ollama");
    expect(ollama?.available).toBe(true);
    expect(typeof ollama?.latencyMs).toBe("number");
    expect(ollama?.weight).toBe(0.6);
  });
});

describe("CAMDeepLearningOrchestratorEngine — partial disagreement", () => {
  it("3-of-4 agree → escalate=true with reduced confidence", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "physics says A")
    );
    CAMDeepLearningOrchestratorEngine.setTribalAdapter(
      tribalReturning(STRATEGY_VALUE_A, 0.8, "tribal says A")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(STRATEGY_VALUE_B));

    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.value).toEqual(STRATEGY_VALUE_A);
    expect(r.escalateToHuman).toBe(true);
    expect(r.agreeingSources.sort()).toEqual(
      ["ollama", "physics", "tribal"].sort()
    );
    expect(r.dissentingSources).toContain("nvidia");
    expect(r.confidence).toBeLessThan(0.85);
  });

  it("2-vs-2 split → physics+ollama (1.0+0.6=1.6) beats nvidia+tribal (0.7+0.5=1.2)", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "physics")
    );
    CAMDeepLearningOrchestratorEngine.setTribalAdapter(
      tribalReturning(STRATEGY_VALUE_B, 0.85, "tribal dissent")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(STRATEGY_VALUE_B));

    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.value).toEqual(STRATEGY_VALUE_A);
    expect(r.escalateToHuman).toBe(true);
    expect(r.agreeingSources).toEqual(
      expect.arrayContaining(["physics", "ollama"])
    );
  });
});

describe("CAMDeepLearningOrchestratorEngine — degraded sources", () => {
  it("only physics available → confidence reflects single source unmodified", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.95, "Kienzle")
    );
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.value).toEqual(STRATEGY_VALUE_A);
    expect(r.confidence).toBe(0.95);
    expect(r.escalateToHuman).toBe(false);
    expect(r.agreeingSources).toEqual(["physics"]);
  });

  it("all sources unavailable → value=null, escalate=true", async () => {
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.value).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.escalateToHuman).toBe(true);
    expect(r.rationale).toContain("no source");
  });

  it("Ollama adapter throws → captured as source_threw without crashing orchestrator", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "p")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlThrows("module load failure"));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    const ollamaVote = r.voices.find((v) => v.source === "ollama");
    expect(ollamaVote?.available).toBe(false);
    expect(ollamaVote?.errorCode).toBe("source_threw");
    expect(ollamaVote?.evidence).toContain("module load failure");
    expect(r.value).toEqual(STRATEGY_VALUE_A);
  });

  it("physics adapter unset → physics vote unavailable with no_physics_adapter", async () => {
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    const phys = r.voices.find((v) => v.source === "physics");
    expect(phys?.available).toBe(false);
    expect(phys?.errorCode).toBe("no_physics_adapter");
  });

  it("physics adapter returns null (task not amenable) → unavailable", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(physicsNull());
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(OP_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "operation_classify",
      "p"
    );
    const phys = r.voices.find((v) => v.source === "physics");
    expect(phys?.available).toBe(false);
    expect(phys?.errorCode).toBe("task_not_physics_amenable");
  });

  it("tribal adapter returns null (no match) → unavailable", async () => {
    CAMDeepLearningOrchestratorEngine.setTribalAdapter(tribalNull());
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    const tribal = r.voices.find((v) => v.source === "tribal");
    expect(tribal?.available).toBe(false);
    expect(tribal?.errorCode).toBe("no_tribal_match");
  });
});

describe("CAMDeepLearningOrchestratorEngine — disable + custom weights", () => {
  it("disableSources excludes the source from voting", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "p")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(STRATEGY_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p",
      { disableSources: ["nvidia"] }
    );
    const nvidiaVote = r.voices.find((v) => v.source === "nvidia");
    expect(nvidiaVote?.available).toBe(false);
    expect(nvidiaVote?.errorCode).toBe("disabled");
    expect(r.agreeingSources).not.toContain("nvidia");
  });

  it("custom weights flip the winning group", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "physics")
    );
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(STRATEGY_VALUE_B));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p",
      { weights: { physics: 0.1, nvidia: 2.0 } }
    );
    expect(r.value).toEqual(STRATEGY_VALUE_B);
  });

  it("escalationThreshold=0 → low-confidence single source still ships", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.05, "low confidence")
    );
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p",
      { escalationThreshold: 0 }
    );
    expect(r.confidence).toBeCloseTo(0.05, 2);
    expect(r.escalateToHuman).toBe(false);
  });

  it("escalationThreshold=1 → always escalates regardless of confidence", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.99, "p")
    );
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p",
      { escalationThreshold: 1 }
    );
    expect(r.escalateToHuman).toBe(true);
  });
});

describe("CAMDeepLearningOrchestratorEngine — input validation", () => {
  it("unknown task returns bad_input shape with empty voices", async () => {
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "ghost_task" as never as AGIDecisionTask,
      "p"
    );
    expect(r.value).toBeNull();
    expect(r.escalateToHuman).toBe(true);
    expect(r.rationale).toContain("bad_input");
    expect(r.voices).toEqual([]);
  });

  it("empty prompt returns bad_input", async () => {
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      ""
    );
    expect(r.rationale).toContain("bad_input");
    expect(r.voices).toEqual([]);
  });

  it("non-string prompt returns bad_input", async () => {
    // @ts-expect-error — runtime guard test
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      undefined
    );
    expect(r.rationale).toContain("bad_input");
  });
});

describe("CAMDeepLearningOrchestratorEngine — agreement detection per task kind", () => {
  it("strategy task agreement keyed on 'strategy' field even with different rationale", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(
        { ...STRATEGY_VALUE_A, rationale: "different text" },
        0.9,
        "p"
      )
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.agreeingSources).toEqual(
      expect.arrayContaining(["physics", "ollama"])
    );
  });

  it("operation_classify agreement keyed on 'op_type' field", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(
        { op_type: "face_milling", family: "roughing", confidence: 0.8 },
        0.8,
        "p"
      )
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(OP_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "operation_classify",
      "p"
    );
    expect(r.agreeingSources).toEqual(
      expect.arrayContaining(["physics", "ollama"])
    );
  });

  it("tool_select agreement keyed on family|diameter|flutes composite — different diameter dissents", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(TOOL_VALUE_A, 0.9, "p")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(TOOL_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(
      mlOk({ ...TOOL_VALUE_A, diameter_mm: 16 })
    );
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "tool_select_advisor",
      "p"
    );
    expect(r.agreeingSources).toEqual(
      expect.arrayContaining(["physics", "ollama"])
    );
    expect(r.dissentingSources).toContain("nvidia");
  });

  it("parameter_extract agreement on identical sorted-key serialization", async () => {
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(PARAM_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(PARAM_VALUE_A));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "parameter_extract",
      "p"
    );
    expect(r.value).toEqual(PARAM_VALUE_A);
    expect(r.agreeingSources).toEqual(
      expect.arrayContaining(["ollama", "nvidia"])
    );
  });

  it("parameter_extract dissent — different feed values do not agree", async () => {
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(PARAM_VALUE_A));
    CAMDeepLearningOrchestratorEngine.setNVIDIAAdapter(mlOk(PARAM_VALUE_B));
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "parameter_extract",
      "p"
    );
    expect(r.escalateToHuman).toBe(true);
    expect(r.dissentingSources.length).toBeGreaterThan(0);
  });
});

describe("CAMDeepLearningOrchestratorEngine — confidence extraction", () => {
  it("uses value.confidence field when present", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning({ ...STRATEGY_VALUE_A, confidence: 0.4 }, 0.4, "p")
    );
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.confidence).toBeCloseTo(0.4, 2);
  });

  it("falls back to 0.5 neutral prior when ML response lacks confidence", async () => {
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(
      mlOk({
        strategy: "x",
        rationale: "y",
        alternates: [],
      })
    );
    const r = await CAMDeepLearningOrchestratorEngine.decide(
      "strategy_recommend",
      "p"
    );
    expect(r.confidence).toBeCloseTo(0.5, 2);
  });
});

describe("CAMDeepLearningOrchestratorEngine — meta methods", () => {
  it("listSources returns all 4 source kinds", () => {
    expect(CAMDeepLearningOrchestratorEngine.listSources().sort()).toEqual(
      ["nvidia", "ollama", "physics", "tribal"].sort()
    );
  });

  it("getDefaultWeights matches documented values", () => {
    const w = CAMDeepLearningOrchestratorEngine.getDefaultWeights();
    expect(w.physics).toBe(1.0);
    expect(w.nvidia).toBe(0.7);
    expect(w.ollama).toBe(0.6);
    expect(w.tribal).toBe(0.5);
  });

  it("getDefaultWeights returns a snapshot copy (mutation safe)", () => {
    const w1 = CAMDeepLearningOrchestratorEngine.getDefaultWeights();
    w1.physics = 99;
    const w2 = CAMDeepLearningOrchestratorEngine.getDefaultWeights();
    expect(w2.physics).toBe(1.0);
  });

  it("healthCheckAll reports availability per source", async () => {
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(
      physicsReturning(STRATEGY_VALUE_A, 0.9, "p")
    );
    CAMDeepLearningOrchestratorEngine.setOllamaAdapter(mlOk(STRATEGY_VALUE_A));
    const h = await CAMDeepLearningOrchestratorEngine.healthCheckAll();
    expect(h.physics).toBe(true);
    expect(h.ollama).toBe(true);
    expect(h.nvidia).toBe(false);
    expect(h.tribal).toBe(false);
  });
});
