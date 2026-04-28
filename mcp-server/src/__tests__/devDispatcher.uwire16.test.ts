/**
 * devDispatcher — U-WIRE16 round-trip suite
 * ===========================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE16 — wires 5 test infra engines into prism_dev:
 *   - testASTAnalyzerEngine.analyze              → dev_test_ast_analyze
 *   - testCoverageIndexEngine.uncoveredEngines   → dev_test_coverage_uncovered
 *   - testRegistryAdapterEngine.getMaterialByISO → dev_test_registry_get_material
 *   - testResourceRegistryEngine.filter          → dev_test_resource_filter
 *   - skillGapAnalyzerEngine.analyze             → dev_skill_gap_analyze
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE16
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
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content || raw.content.length === 0) {
    return { ok: false, data: { rawEnvelope: raw } };
  }
  const text = raw.content[0]!.text;
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
describe("U-WIRE16 happy paths — round-trip via prism_dev", () => {
  it("dev_test_ast_analyze — returns structured AST analysis for a known engine", async () => {
    const r = await call(server, "dev_test_ast_analyze", {
      file_path: "src/engines/AwarenessQueryEngine.ts",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // EngineFileAnalysis includes filePath + className + publicMethods array (from engine schema)
    expect(typeof d).toBe("object");
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });

  it("dev_test_coverage_uncovered — returns array of engines lacking test coverage", async () => {
    const r = await call(server, "dev_test_coverage_uncovered", {});
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("dev_test_registry_get_material — returns Kienzle/Taylor params for ISO P", async () => {
    const r = await call(server, "dev_test_registry_get_material", { iso_group: "P" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // Engine returns { kc1_1, mc, taylor_C, taylor_n, source }
    expect(typeof d.kc1_1).toBe("number");
    expect(typeof d.mc).toBe("number");
    expect(typeof d.taylor_C).toBe("number");
    expect(typeof d.taylor_n).toBe("number");
    // Canonical kc1.1 for P = 1800 N/mm²
    expect(d.kc1_1).toBe(1800);
  });

  it("dev_test_resource_filter — returns array (empty or populated) for lathe filter", async () => {
    const r = await call(server, "dev_test_resource_filter", { process: "lathe" });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("dev_skill_gap_analyze — returns gap analysis structure", async () => {
    const r = await call(server, "dev_skill_gap_analyze", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(typeof d).toBe("object");
    // GapAnalysis exposes at least one of: gaps[], stats, summary
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans (≥3 configs per dimension)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE16 variability spans", () => {
  const isoGroups = ["P", "M", "K"] as const;
  for (const iso of isoGroups) {
    it(`dev_test_registry_get_material spans iso_group=${iso}`, async () => {
      const r = await call(server, "dev_test_registry_get_material", { iso_group: iso });
      expect(r.ok).toBe(true);
      const d = r.data as Record<string, unknown>;
      // Each ISO group must return distinct, positive Kienzle kc1.1
      expect(typeof d.kc1_1).toBe("number");
      expect((d.kc1_1 as number) > 0).toBe(true);
    });
  }

  const processes = ["mill", "lathe", "wire_edm"] as const;
  for (const proc of processes) {
    it(`dev_test_resource_filter spans process=${proc}`, async () => {
      const r = await call(server, "dev_test_resource_filter", { process: proc });
      expect(r.ok).toBe(true);
    });
  }

  const coverages = ["tutorial", "regression", "adversarial"] as const;
  for (const cov of coverages) {
    it(`dev_test_resource_filter spans coverage=${cov}`, async () => {
      const r = await call(server, "dev_test_resource_filter", { coverage: cov });
      expect(r.ok).toBe(true);
    });
  }

  const enginePaths = [
    "src/engines/AwarenessQueryEngine.ts",
    "src/engines/AISystemSynchronizerEngine.ts",
    "src/engines/AICapabilityMaximizerEngine.ts",
  ];
  for (const ep of enginePaths) {
    it(`dev_test_ast_analyze spans engine path=${ep.split("/").pop()}`, async () => {
      const r = await call(server, "dev_test_ast_analyze", { file_path: ep });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — Zod validation must trip
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE16 input rejection", () => {
  it("dev_test_ast_analyze without file_path → rejects", async () => {
    const r = await call(server, "dev_test_ast_analyze", {});
    expect(r.ok).toBe(false);
  });

  it("dev_test_ast_analyze with empty file_path → rejects (min 1)", async () => {
    const r = await call(server, "dev_test_ast_analyze", { file_path: "" });
    expect(r.ok).toBe(false);
  });

  it("dev_test_registry_get_material without iso_group → rejects", async () => {
    const r = await call(server, "dev_test_registry_get_material", {});
    expect(r.ok).toBe(false);
  });

  it("dev_test_registry_get_material with bad iso_group → rejects (not in P/M/K/N/S/H)", async () => {
    const r = await call(server, "dev_test_registry_get_material", { iso_group: "Z" });
    expect(r.ok).toBe(false);
  });

  it("dev_test_resource_filter with bad process enum → rejects", async () => {
    const r = await call(server, "dev_test_resource_filter", { process: "warp_drive" });
    expect(r.ok).toBe(false);
  });

  it("dev_test_resource_filter with bad coverage enum → rejects", async () => {
    const r = await call(server, "dev_test_resource_filter", { coverage: "magic" });
    expect(r.ok).toBe(false);
  });

  it("dev_test_resource_filter with bad difficulty enum → rejects", async () => {
    const r = await call(server, "dev_test_resource_filter", { difficulty: "godlike" });
    expect(r.ok).toBe(false);
  });

  it("dev_skill_gap_analyze with negative min_usage_threshold → rejects (nonnegative)", async () => {
    const r = await call(server, "dev_skill_gap_analyze", { min_usage_threshold: -5 });
    expect(r.ok).toBe(false);
  });

  it("dev_skill_gap_analyze with zero max_usage_threshold → rejects (positive)", async () => {
    const r = await call(server, "dev_skill_gap_analyze", { max_usage_threshold: 0 });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs — bounds + type confusion
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE16 adversarial inputs", () => {
  it("dev_test_ast_analyze with non-existent path returns engine result (engine handles missing files)", async () => {
    const r = await call(server, "dev_test_ast_analyze", {
      file_path: "src/engines/DefinitelyNonExistentEngine_xyz.ts",
    });
    // Schema accepts (any string ≥1 char); engine reports back. Either ok with empty/error data
    // OR a structured error. Both legitimate; just must not crash.
    expect(typeof r.ok).toBe("boolean");
  });

  it("dev_test_registry_get_material lowercase 'p' → rejects (enum is case-sensitive)", async () => {
    const r = await call(server, "dev_test_registry_get_material", { iso_group: "p" });
    expect(r.ok).toBe(false);
  });

  it("dev_skill_gap_analyze with non-integer min_usage_threshold → rejects (int)", async () => {
    const r = await call(server, "dev_skill_gap_analyze", { min_usage_threshold: 3.5 });
    expect(r.ok).toBe(false);
  });

  it("dev_test_ast_analyze with non-string file_path → rejects", async () => {
    const r = await call(server, "dev_test_ast_analyze", { file_path: 12345 });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE16 regression guards", () => {
  it("dispatcher tool registered as prism_dev", () => {
    const tool = server.tools.find(t => t.name === "prism_dev");
    expect(tool?.name).toBe("prism_dev");
    expect(typeof tool?.handler).toBe("function");
  });

  it("U-WIRE15 dev_capability_metrics still routes", async () => {
    const r = await call(server, "dev_capability_metrics", {});
    expect(r.ok).toBe(true);
  });

  it("U-WIRE15 dev_awareness_find_similar still routes", async () => {
    const r = await call(server, "dev_awareness_find_similar", {
      keywords: ["force"],
      limit: 3,
    });
    expect(r.ok).toBe(true);
  });

  it("pre-U-WIRE self_awareness_recommend still routes", async () => {
    const r = await call(server, "self_awareness_recommend", { task: "build a new engine" });
    expect(r.ok).toBe(true);
  });

  it("unknown action returns structured error", async () => {
    const r = await call(server, "definitely_not_a_real_dev_action_uw16_xyz", {});
    expect(r.ok).toBe(false);
  });
});
