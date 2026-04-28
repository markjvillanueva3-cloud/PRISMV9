/**
 * devDispatcher — U-WIRE15 round-trip suite
 * ===========================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE15 — wires 5 self-awareness/AI-meta engines into prism_dev:
 *   - awarenessQueryEngine.findSimilarAsync       → dev_awareness_find_similar
 *   - awarenessBootstrapEngine.compute            → dev_awareness_bootstrap_report
 *   - aiCapabilityMaximizerEngine.computeMetrics  → dev_capability_metrics
 *   - aiSystemSynchronizerEngine.recommend        → dev_system_recommend_engines
 *   - aiAutoUtilizationEngine.analyze             → dev_auto_utilize_analyze
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE15
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: unknown }> {
  const tool = server.tools.find(t => t.name === "prism_dev");
  if (!tool) throw new Error("prism_dev not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  // Some dispatchers emit a structured error directly without the content envelope
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content?: { type: string; text: string }[] };
  if (!envelope.content || envelope.content.length === 0) {
    return { ok: false, data: { rawEnvelope: raw } };
  }
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per engine
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE15 happy paths — round-trip via prism_dev", () => {
  it("dev_awareness_find_similar — returns array of similarity matches", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: ["cutting", "force"],
      types: ["engine", "formula"],
      limit: 5,
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("dev_awareness_bootstrap_report — returns AwarenessReport with signals", async () => {
    const r = await call(server, "dev_awareness_bootstrap_report", {});
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // AwarenessReport has signals[] + threshold + ready (boolean)
    expect(typeof d.threshold).toBe("number");
    expect(typeof d.ready).toBe("boolean");
  });

  it("dev_capability_metrics — returns capability metrics", async () => {
    const r = await call(server, "dev_capability_metrics", {});
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // CapabilityMetrics has reasoning_engines / patterns / etc — at minimum > 0 keys
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });

  it("dev_system_recommend_engines — returns recommendation with action+confidence", async () => {
    const r = await call(server, "dev_system_recommend_engines", {
      type: "reason",
      domain: "cutting force",
      description: "Calculate cutting force using Kienzle model for AISI 4140",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // AIRecommendation has action + reasoning + confidence
    expect(typeof d.action).toBe("string");
    expect(typeof d.reasoning).toBe("string");
    expect(typeof d.confidence).toBe("number");
    expect((d.confidence as number) >= 0 && (d.confidence as number) <= 1).toBe(true);
  });

  it("dev_auto_utilize_analyze — returns utilization recommendation", async () => {
    const r = await call(server, "dev_auto_utilize_analyze", {
      input: "calculate cutting force for steel turning",
      context: { domain_focus: "lathe", recent_engines: ["KienzleForceModel"] },
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // UtilizationRecommendation has primary/alternatives/auto_invoke/reasoning
    expect("auto_invoke" in d || "primary" in d || "reasoning" in d).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans (≥3 configs per dimension)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE15 variability spans", () => {
  const taskTypes = ["build", "optimize", "reason"] as const;
  for (const tt of taskTypes) {
    it(`dev_system_recommend_engines spans type=${tt}`, async () => {
      const r = await call(server, "dev_system_recommend_engines", {
        type: tt,
        domain: "manufacturing",
        description: `${tt} a new manufacturing capability`,
      });
      expect(r.ok).toBe(true);
    });
  }

  const assetTypes = ["engine", "algorithm", "skill"] as const;
  for (const at of assetTypes) {
    it(`dev_awareness_find_similar spans types=[${at}]`, async () => {
      const r = await call(server, "dev_awareness_find_similar", {
        keywords: ["force"],
        types: [at],
        limit: 3,
      });
      expect(r.ok).toBe(true);
    });
  }

  const inputs = [
    "I need to extract knowledge from a PDF",
    "Generate G-code for a lathe operation",
    "What hooks are available for build validation",
  ];
  for (const inp of inputs) {
    it(`dev_auto_utilize_analyze spans diverse input scenarios (len=${inp.length})`, async () => {
      const r = await call(server, "dev_auto_utilize_analyze", { input: inp });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — Zod validation must trip
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE15 input rejection", () => {
  it("dev_awareness_find_similar without keywords → rejects", async () => {
    const r = await call(server, "dev_awareness_find_similar", { limit: 5 });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_find_similar with empty keywords array → rejects (min 1)", async () => {
    const r = await call(server, "dev_awareness_find_similar", { keywords: [] });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_find_similar with bad asset type → rejects", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: ["force"],
      types: ["definitely_not_an_asset_type"],
    });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_find_similar with limit > 100 → rejects", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: ["force"],
      limit: 500,
    });
    expect(r.ok).toBe(false);
  });

  it("dev_system_recommend_engines without type → rejects", async () => {
    const r = await call(server, "dev_system_recommend_engines", {
      domain: "manufacturing",
      description: "do something",
    });
    expect(r.ok).toBe(false);
  });

  it("dev_system_recommend_engines with bad type enum → rejects", async () => {
    const r = await call(server, "dev_system_recommend_engines", {
      type: "invent_something",
      domain: "manufacturing",
      description: "do something",
    });
    expect(r.ok).toBe(false);
  });

  it("dev_system_recommend_engines with empty domain → rejects (min 1)", async () => {
    const r = await call(server, "dev_system_recommend_engines", {
      type: "reason",
      domain: "",
      description: "do something",
    });
    expect(r.ok).toBe(false);
  });

  it("dev_auto_utilize_analyze with empty input → rejects (min 1)", async () => {
    const r = await call(server, "dev_auto_utilize_analyze", { input: "" });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs — bounds + type confusion
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE15 adversarial inputs", () => {
  it("dev_awareness_find_similar with negative limit → rejects (positive)", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: ["force"],
      limit: -10,
    });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_find_similar with non-integer limit → rejects (int)", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: ["force"],
      limit: 3.7,
    });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_find_similar with empty-string keyword → rejects (min 1)", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: [""],
    });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_find_similar with 51 keywords → rejects (max 50)", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: Array.from({ length: 51 }, (_, i) => `kw${i}`),
    });
    expect(r.ok).toBe(false);
  });

  it("dev_awareness_bootstrap_report with negative now_ms → rejects (positive)", async () => {
    const r = await call(server, "dev_awareness_bootstrap_report", { now_ms: -1 });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE15 regression guards", () => {
  it("dispatcher tool registered as prism_dev", () => {
    const tool = server.tools.find(t => t.name === "prism_dev");
    expect(tool?.name).toBe("prism_dev");
    expect(typeof tool?.handler).toBe("function");
  });

  it("pre-existing self_awareness_recommend still routes", async () => {
    const r = await call(server, "self_awareness_recommend", { task: "build a new engine" });
    expect(r.ok).toBe(true);
  });

  it("pre-existing self_awareness_find still routes (sanity for unrelated dev action)", async () => {
    const r = await call(server, "self_awareness_find", { query: "cutting force" });
    expect(r.ok).toBe(true);
  });

  it("unknown action returns structured error", async () => {
    const r = await call(server, "definitely_not_a_real_dev_action_xyz", {});
    expect(r.ok).toBe(false);
  });
});
