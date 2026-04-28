/**
 * aiReasoningDispatcher — U-WIRE18 round-trip suite
 * ===================================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE18 — wires 5 code-gen + approval engines into prism_ai:
 *   - aiGeneratedCodeApprovalGateEngine.getPending → ai_code_gate_pending
 *   - selfModificationProposalEngine.proposeBatch  → ai_self_mod_propose_batch
 *   - selfModificationApprovalEngine.isApproved    → ai_self_mod_is_approved
 *   - aiIntelligenceMaximizer.maximize             → ai_intelligence_maximize
 *   - hookRuleMatcherEngine.match                  → ai_hook_rule_match
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE18
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";

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
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "success" in (parsed as Record<string, unknown>) && (parsed as { success: boolean }).success === false) {
    return { ok: false, data: parsed };
  }
  const p = parsed as Record<string, unknown>;
  return { ok: true, data: p.data ?? parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerAIReasoningDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per engine
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE18 happy paths — round-trip via prism_ai", () => {
  it("ai_code_gate_pending — returns array of pending gate instances", async () => {
    const r = await call(server, "ai_code_gate_pending", {});
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("ai_self_mod_propose_batch — produces ranked Proposal[] from observations", async () => {
    const r = await call(server, "ai_self_mod_propose_batch", {
      observations: [
        {
          kind: "remove-orphan",
          targets: ["src/engines/UnusedEngine.ts"],
          evidence: "No imports detected; unwired_scan flagged it",
          confidence: 0.85,
          estimatedEffortHours: 0.5,
        },
        {
          kind: "merge-duplicates",
          targets: ["src/engines/A.ts", "src/engines/B.ts"],
          evidence: "Both implement Kienzle force calculation with identical signature",
          confidence: 0.7,
          estimatedEffortHours: 2,
        },
      ],
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    const props = r.data as Array<Record<string, unknown>>;
    expect(props.length).toBe(2);
    // Each proposal has id + kind + score
    expect(typeof props[0].id).toBe("string");
    expect(typeof props[0].kind).toBe("string");
    expect(typeof props[0].score).toBe("number");
  });

  it("ai_self_mod_is_approved — returns false for unknown proposal", async () => {
    const r = await call(server, "ai_self_mod_is_approved", {
      proposal_id: "nonexistent_id_zzz",
      proposal_hash: "deadbeef",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.approved).toBe(false);
  });

  it("ai_intelligence_maximize — returns MaximizedRecommendation for steel turning", async () => {
    const r = await call(server, "ai_intelligence_maximize", {
      operation: "turning_od",
      material: "AISI 4140",
      hardness_hrc: 28,
      tool_diameter_mm: 12,
      tool_material: "carbide",
      coating: "TiAlN",
      flutes: 4,
      machine_type: "lathe_2axis",
      spindle_max_rpm: 4000,
      spindle_power_kw: 22,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // MaximizedRecommendation exposes speed_m_min/feed_mm_rev as OptimizedValue objects
    expect(typeof d.speed_m_min).toBe("object");
    expect(typeof d.feed_mm_rev).toBe("object");
  });

  it("ai_hook_rule_match — returns RuleMatch[] for tool+params", async () => {
    const r = await call(server, "ai_hook_rule_match", {
      tool: "Bash",
      params: { command: "rm -rf /" },
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans (≥3 configs per dimension)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE18 variability spans", () => {
  const proposalKinds = ["extract-abstraction", "remove-orphan", "deprecate-low-usage"] as const;
  for (const pk of proposalKinds) {
    it(`ai_self_mod_propose_batch spans kind=${pk}`, async () => {
      const r = await call(server, "ai_self_mod_propose_batch", {
        observations: [
          {
            kind: pk,
            targets: ["src/engines/X.ts"],
            evidence: `Pattern observation for ${pk}`,
            confidence: 0.8,
          },
        ],
      });
      expect(r.ok).toBe(true);
    });
  }

  const operations = ["roughing", "finishing", "milling_pocket"] as const;
  for (const op of operations) {
    it(`ai_intelligence_maximize spans operation=${op}`, async () => {
      const r = await call(server, "ai_intelligence_maximize", {
        operation: op,
        material: "AISI 1045",
      });
      expect(r.ok).toBe(true);
    });
  }

  const tools = ["Bash", "Write", "Edit"] as const;
  for (const t of tools) {
    it(`ai_hook_rule_match spans tool=${t}`, async () => {
      const r = await call(server, "ai_hook_rule_match", { tool: t, params: {} });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — Zod must trip
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE18 input rejection", () => {
  it("ai_self_mod_propose_batch with empty observations array → rejects (min 1)", async () => {
    const r = await call(server, "ai_self_mod_propose_batch", { observations: [] });
    expect(r.ok).toBe(false);
  });

  it("ai_self_mod_propose_batch with bad kind enum → rejects", async () => {
    const r = await call(server, "ai_self_mod_propose_batch", {
      observations: [
        { kind: "invent-something", targets: ["x"], evidence: "y", confidence: 0.5 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("ai_self_mod_propose_batch with confidence > 1 → rejects (max 1)", async () => {
    const r = await call(server, "ai_self_mod_propose_batch", {
      observations: [
        { kind: "remove-orphan", targets: ["x"], evidence: "y", confidence: 1.5 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("ai_self_mod_propose_batch with empty targets array → rejects (min 1)", async () => {
    const r = await call(server, "ai_self_mod_propose_batch", {
      observations: [
        { kind: "remove-orphan", targets: [], evidence: "y", confidence: 0.5 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("ai_self_mod_is_approved without proposal_id → rejects", async () => {
    const r = await call(server, "ai_self_mod_is_approved", { proposal_hash: "abc" });
    expect(r.ok).toBe(false);
  });

  it("ai_self_mod_is_approved with empty proposal_hash → rejects (min 1)", async () => {
    const r = await call(server, "ai_self_mod_is_approved", {
      proposal_id: "p1",
      proposal_hash: "",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_intelligence_maximize without operation → rejects", async () => {
    const r = await call(server, "ai_intelligence_maximize", { material: "AISI 4140" });
    expect(r.ok).toBe(false);
  });

  it("ai_intelligence_maximize with bad operation → rejects (not in OperationType)", async () => {
    const r = await call(server, "ai_intelligence_maximize", {
      operation: "warp_speed_drilling",
      material: "AISI 4140",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_intelligence_maximize with empty material → rejects (min 1)", async () => {
    const r = await call(server, "ai_intelligence_maximize", {
      operation: "roughing",
      material: "",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_hook_rule_match without tool → rejects", async () => {
    const r = await call(server, "ai_hook_rule_match", { params: {} });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE18 adversarial inputs", () => {
  it("ai_self_mod_propose_batch with negative confidence → rejects (min 0)", async () => {
    const r = await call(server, "ai_self_mod_propose_batch", {
      observations: [
        { kind: "remove-orphan", targets: ["x"], evidence: "y", confidence: -0.1 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("ai_intelligence_maximize with negative spindle_max_rpm → rejects (positive)", async () => {
    const r = await call(server, "ai_intelligence_maximize", {
      operation: "roughing",
      material: "AISI 4140",
      spindle_max_rpm: -1000,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_intelligence_maximize with hardness_hrc negative → rejects (nonnegative)", async () => {
    const r = await call(server, "ai_intelligence_maximize", {
      operation: "roughing",
      material: "AISI 4140",
      hardness_hrc: -5,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_self_mod_propose_batch with 101 observations → rejects (max 100)", async () => {
    const obs = Array.from({ length: 101 }, () => ({
      kind: "remove-orphan",
      targets: ["x"],
      evidence: "y",
      confidence: 0.5,
    }));
    const r = await call(server, "ai_self_mod_propose_batch", { observations: obs });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE18 regression guards", () => {
  it("dispatcher tool name is prism_ai", () => {
    expect(server.tools[0]!.name).toBe("prism_ai");
  });

  it("U-WIRE13 ai_lathe_orchestrate still routes", async () => {
    const r = await call(server, "ai_lathe_orchestrate", {
      program: "M30",
      strategy: "fast_path",
    });
    expect(r.ok).toBe(true);
  });

  it("U-WIRE03 ai_material_lookup still routes", async () => {
    const r = await call(server, "ai_material_lookup", { material: "AISI 4140" });
    expect(r.ok).toBe(true);
  });

  it("unknown action returns structured error", async () => {
    const r = await call(server, "definitely_not_a_real_action_uw18_xyz", {});
    expect(r.ok).toBe(false);
  });
});
