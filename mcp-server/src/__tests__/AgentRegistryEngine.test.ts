/**
 * AgentRegistryEngine — tests + prism_orchestrate `agent_recommend` wiring E2E.
 *
 * WIRE-UNWIRED-MS0/U-WIRE02 (2026-05-16): this engine was a truly-unwired
 * backend dev-tool (no dispatcher, no test, no consumer). Tests verify the
 * keyword-trigger match logic AND the round-trip through the orchestration
 * dispatcher `agent_recommend` action (inline catalog + the real 134-agent
 * data/state/AGENT_REGISTRY.json).
 *
 * Coverage: happy path · ≥3 failure modes · ≥2 adversarial inputs ·
 * ≥3 category-variability cases · dispatcher round-trip E2E.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  AgentRegistryEngine,
  agentRegistryEngine,
  type AgentEntry,
} from "../engines/AgentRegistryEngine.js";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

const CATALOG: AgentEntry[] = [
  {
    name: "physics-reviewer",
    category: "reviewer",
    description: "Reviews physics formulas against canonical constants",
    triggers: ["physics", "force", "kienzle"],
    costTier: "high",
  },
  {
    name: "dispatcher-wirer",
    category: "prism",
    description: "Wires engines to dispatchers",
    triggers: ["wire", "dispatcher", "engine"],
    costTier: "medium",
  },
  {
    name: "Explore",
    category: "explorer",
    description: "Read-only fan-out search agent",
    triggers: ["search", "explore", "find"],
    costTier: "low",
  },
];

// ───────────────────────── engine-direct tests ──────────────────────────

describe("AgentRegistryEngine — register / get / list", () => {
  it("happy path: register() normalizes triggers (lowercased + deduplicated)", () => {
    const engine = new AgentRegistryEngine();
    const out = engine.register({
      name: "build-doctor",
      category: "prism",
      description: "Fixes TypeScript build errors",
      triggers: ["Build", "BUILD", "build", "Tsc"],
      costTier: "medium",
    });
    expect(out.triggers).toEqual(["build", "tsc"]);
    expect(engine.size()).toBe(1);
    expect(engine.get("build-doctor")!.name).toBe("build-doctor");
  });

  it("registerAll() loads a catalog and get() / list() return entries", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    expect(engine.size()).toBe(3);
    expect(engine.list().map((a) => a.name).sort()).toEqual([
      "Explore",
      "dispatcher-wirer",
      "physics-reviewer",
    ]);
  });

  it("variability — listByCategory filters to a single category", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    expect(engine.listByCategory("reviewer").map((a) => a.name)).toEqual(["physics-reviewer"]);
    expect(engine.listByCategory("explorer").map((a) => a.name)).toEqual(["Explore"]);
    expect(engine.listByCategory("general")).toEqual([]);
  });

  it("unregister() removes an entry and reports the outcome", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    expect(engine.unregister("Explore")).toBe(true);
    expect(engine.unregister("nonexistent-agent")).toBe(false);
    expect(engine.size()).toBe(2);
    expect(engine.get("Explore")).toBeNull();
  });

  it("clear() empties the registry", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    engine.clear();
    expect(engine.size()).toBe(0);
    expect(engine.list()).toEqual([]);
  });
});

describe("AgentRegistryEngine — match()", () => {
  it("happy path: a full-trigger-overlap prompt scores 1.0", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    const m = engine.match("wire the engine to a dispatcher", 3);
    expect(m[0].agent.name).toBe("dispatcher-wirer");
    // all 3 of dispatcher-wirer's triggers hit → 3/3 = 1.
    expect(m[0].score).toBe(1);
    expect(m[0].matchedTriggers.sort()).toEqual(["dispatcher", "engine", "wire"]);
  });

  it("variability — partial overlap yields a fractional score (1 of 3 triggers)", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    const m = engine.match("compute cutting force", 3);
    // physics-reviewer: only `force` of [physics,force,kienzle] hits → 1/3.
    expect(m[0].agent.name).toBe("physics-reviewer");
    expect(m[0].score).toBe(0.3333);
  });

  it("variability — tie on score breaks toward the lower cost tier", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll([
      { name: "z-expensive", category: "other", description: "high cost", triggers: ["deploy"], costTier: "high" },
      { name: "a-cheap", category: "other", description: "low cost", triggers: ["deploy"], costTier: "low" },
    ]);
    const m = engine.match("deploy the build", 3);
    // both score 1/1 = 1; low cost tier wins the tie despite the later name.
    expect(m[0].agent.name).toBe("a-cheap");
    expect(m[1].agent.name).toBe("z-expensive");
  });

  it("variability — a multi-word trigger matches as a substring of the prompt", () => {
    const engine = new AgentRegistryEngine();
    engine.register({
      name: "wear-analyst",
      category: "prism",
      description: "Analyzes tool wear",
      triggers: ["tool wear"],
      costTier: "medium",
    });
    const m = engine.match("diagnose tool wear on the carbide insert", 3);
    expect(m[0].agent.name).toBe("wear-analyst");
    expect(m[0].matchedTriggers).toEqual(["tool wear"]);
  });

  it("respects the limit argument", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    // a prompt that hits all three agents
    const m = engine.match("wire dispatcher physics force search explore", 2);
    expect(m).toHaveLength(2);
  });

  // ── failure modes ──
  it("failure mode — empty prompt yields no matches", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    expect(engine.match("", 3)).toEqual([]);
  });

  it("failure mode — a prompt with no trigger overlap yields no matches", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    expect(engine.match("quarterly revenue projection spreadsheet", 3)).toEqual([]);
  });

  it("failure mode — register() throws on an invalid entry (empty triggers)", () => {
    const engine = new AgentRegistryEngine();
    expect(() =>
      engine.register({
        name: "bad-agent",
        category: "other",
        description: "no triggers",
        triggers: [],
        costTier: "low",
      }),
    ).toThrow(/triggers/i);
  });

  it("failure mode — register() throws on a bad cost tier", () => {
    const engine = new AgentRegistryEngine();
    expect(() =>
      engine.register({
        name: "bad-tier",
        category: "other",
        description: "bad cost tier",
        triggers: ["x"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        costTier: "extreme" as any,
      }),
    ).toThrow(/costTier/i);
  });

  // ── adversarial inputs ──
  it("adversarial — a symbols-only prompt produces no tokens and no matches", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    expect(engine.match("!@#$ %^&* () {}", 3)).toEqual([]);
  });

  it("adversarial — an oversize prompt (5000 chars) classifies without throwing", () => {
    const engine = new AgentRegistryEngine();
    engine.registerAll(CATALOG);
    const huge = "noise ".repeat(800) + "wire dispatcher engine";
    const m = engine.match(huge, 3);
    expect(m[0].agent.name).toBe("dispatcher-wirer");
    expect(m[0].score).toBe(1);
  });

  it("exported singleton matches through the same logic as a fresh instance", () => {
    agentRegistryEngine.clear();
    agentRegistryEngine.registerAll(CATALOG);
    const m = agentRegistryEngine.match("explore and find the search results", 3);
    expect(m[0].agent.name).toBe("Explore");
    agentRegistryEngine.clear();
  });
});

describe("AgentRegistryEngine — loadFromRegistryFile()", () => {
  let tmpFile: string;

  beforeAll(() => {
    tmpFile = path.join(os.tmpdir(), `prism-agent-registry-test-${Date.now()}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({ schemaVersion: "1.0.0", entries: CATALOG }),
      "utf8",
    );
  });

  afterAll(() => {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* tmp cleanup best-effort */
    }
  });

  it("loads entries from a registry JSON file and returns the count", () => {
    const engine = new AgentRegistryEngine();
    const n = engine.loadFromRegistryFile(tmpFile);
    expect(n).toBe(3);
    expect(engine.size()).toBe(3);
    expect(engine.match("wire dispatcher engine", 1)[0].agent.name).toBe("dispatcher-wirer");
  });

  it("throws a descriptive error when the file does not exist", () => {
    const engine = new AgentRegistryEngine();
    expect(() => engine.loadFromRegistryFile(path.join(os.tmpdir(), "no-such-registry-xyz.json"))).toThrow();
  });
});

// ───────────────────── orchestrationDispatcher E2E ──────────────────────

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerOrchestrationDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("orchestrationDispatcher · agent_recommend wiring (E2E round-trip)", () => {
  let handler: Handler;

  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
    const s = createServer();
    handler = await s.handler;
  });

  it("recommends agents from an inline catalog", async () => {
    const r = await call(handler, "agent_recommend", {
      prompt: "wire the engine into a dispatcher",
      agents: CATALOG,
      limit: 2,
    });
    expect(r.success).toBe(true);
    expect(r.totalAgents).toBe(3);
    expect(r.matchCount).toBe(1);
    expect(r.matches[0].agent.name).toBe("dispatcher-wirer");
    expect(r.matches[0].score).toBe(1);
  });

  it("loads the real 134-agent AGENT_REGISTRY.json when no inline catalog is given", async () => {
    const r = await call(handler, "agent_recommend", {
      prompt: "research and search the codebase for an unknown function",
    });
    expect(r.success).toBe(true);
    // data/state/AGENT_REGISTRY.json ships 134 agents.
    expect(r.totalAgents).toBe(134);
    expect(r.matchCount).toBeGreaterThanOrEqual(1);
  });

  it("failure mode — missing prompt → rejected by the required-field Zod schema", async () => {
    const r = await call(handler, "agent_recommend", { agents: CATALOG });
    expect(r.error).toMatch(/invalid params/i);
    expect(r.error).toMatch(/prompt/i);
  });

  it("failure mode — empty-string prompt is rejected by the Zod schema (.min(1))", async () => {
    const r = await call(handler, "agent_recommend", { prompt: "" });
    expect(r.error).toMatch(/invalid params/i);
    expect(r.error).toMatch(/prompt/i);
  });

  it("failure mode — a bad registryFile path → structured load error", async () => {
    const r = await call(handler, "agent_recommend", {
      prompt: "wire engine",
      registryFile: "Z:/definitely/not/here/registry.json",
    });
    expect(r.error).toMatch(/failed to load agent catalog/i);
  });

  it("adversarial — symbols-only prompt round-trips with zero matches", async () => {
    const r = await call(handler, "agent_recommend", {
      prompt: "!!! ??? *** ###",
      agents: CATALOG,
    });
    expect(r.success).toBe(true);
    expect(r.matchCount).toBe(0);
    // slimResponse strips empty arrays — `matches` is absent, not [].
    expect(r.matches ?? []).toEqual([]);
  });

  it("adversarial — whitespace-only prompt passes the schema but the case rejects it", async () => {
    const r = await call(handler, "agent_recommend", { prompt: "    ", agents: CATALOG });
    expect(r.error).toMatch(/agent_recommend requires/i);
  });
});
