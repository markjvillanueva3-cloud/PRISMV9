/**
 * dispatcher.agentSpecializationProfile.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-ASP dispatcher wiring.
 *
 * Drives 3 read-only actions through real `prism_agent` (note: this dispatcher
 * uses okResult() which DOES wrap responses in {success, data} — different from
 * the raw-result dispatchers wired in this milestone's earlier units).
 *
 *   - agent_profile_get   → AgentSpecializationProfileEngine.getProfile(id)
 *   - agent_profile_list  → AgentSpecializationProfileEngine.listProfiles(filters?)
 *   - agent_profile_stats → AgentSpecializationProfileEngine.getStats()
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerAgentDispatcher } from "../tools/dispatchers/agentDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let agentHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerAgentDispatcher(srv as unknown as Parameters<typeof registerAgentDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_agent");
  if (!t) throw new Error("prism_agent not registered");
  agentHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASP — prism_agent :: agent_profile_list", () => {
  it("returns {success:true, data:{profiles, count}} with at least one builtin profile", async () => {
    const r = await invokeHandler(agentHandler, "agent_profile_list", {});
    expect(r.success).toBe(true);
    const data = r.data as { profiles: Array<{ profile_id: string }>; count: number };
    expect(Array.isArray(data.profiles)).toBe(true);
    // Engine ships with builtin profiles seeded in constructor — count > 0
    expect(data.count).toBeGreaterThan(0);
    expect(data.profiles.length).toBe(data.count);
    // Each profile must have a profile_id string
    for (const p of data.profiles) {
      expect(typeof p.profile_id).toBe("string");
      expect(p.profile_id.length).toBeGreaterThan(0);
    }
  });

  it("optional family filter narrows results to that family only", async () => {
    const allR = await invokeHandler(agentHandler, "agent_profile_list", {});
    const allData = allR.data as { profiles: Array<{ family: string }> };
    // Pick any family that exists in the unfiltered set
    expect(allData.profiles.length).toBeGreaterThan(0);
    const targetFamily = allData.profiles[0].family;

    const filteredR = await invokeHandler(agentHandler, "agent_profile_list", {
      filters: { family: targetFamily },
    });
    expect(filteredR.success).toBe(true);
    const filteredData = filteredR.data as { profiles: Array<{ family: string }>; count: number };
    expect(filteredData.count).toBeGreaterThan(0);
    expect(filteredData.count).toBeLessThanOrEqual(allData.profiles.length);
    // Every returned profile MUST match the requested family
    for (const p of filteredData.profiles) {
      expect(p.family).toBe(targetFamily);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASP — prism_agent :: agent_profile_get", () => {
  it("known profile_id → returns the matching profile", async () => {
    // Use list to get a real profile_id (avoid hardcoding what the engine seeds)
    const listR = await invokeHandler(agentHandler, "agent_profile_list", {});
    const listData = listR.data as { profiles: Array<{ profile_id: string; name: string }> };
    const knownId = listData.profiles[0].profile_id;
    const expectedName = listData.profiles[0].name;

    const r = await invokeHandler(agentHandler, "agent_profile_get", { profile_id: knownId });
    expect(r.success).toBe(true);
    const data = r.data as { profile: { profile_id?: string; name?: string } | null };
    expect(data.profile).not.toBe(null);
    expect(data.profile?.profile_id).toBe(knownId);
    // ROUTING PROOF: name must match what listProfiles returned (same underlying engine state)
    expect(data.profile?.name).toBe(expectedName);
  });

  it("unknown profile_id → returns {profile: null} (engine semantic, not error)", async () => {
    const r = await invokeHandler(agentHandler, "agent_profile_get", {
      profile_id: "definitely-does-not-exist-zzzz-9999",
    });
    expect(r.success).toBe(true);
    const data = r.data as { profile: unknown };
    expect(data.profile).toBe(null);
  });

  it("missing profile_id → dispatcher returns success:false", async () => {
    const r = await invokeHandler(agentHandler, "agent_profile_get", {});
    expect(r.success).toBe(false);
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/profile_id|required/i);
  });

  it("camelCase profileId alias also works", async () => {
    const listR = await invokeHandler(agentHandler, "agent_profile_list", {});
    const listData = listR.data as { profiles: Array<{ profile_id: string }> };
    const knownId = listData.profiles[0].profile_id;

    const r = await invokeHandler(agentHandler, "agent_profile_get", { profileId: knownId });
    expect(r.success).toBe(true);
    const data = r.data as { profile: { profile_id?: string } | null };
    expect(data.profile?.profile_id).toBe(knownId);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASP — prism_agent :: agent_profile_stats", () => {
  it("returns ProfileStats with consistent profile counts", async () => {
    const r = await invokeHandler(agentHandler, "agent_profile_stats", {});
    expect(r.success).toBe(true);
    const data = r.data as {
      total_profiles?: number;
      profiles_by_family?: Record<string, number>;
      profiles_by_tier?: Record<string, number>;
      profiles_by_pattern?: Record<string, number>;
    };
    // total_profiles is required by ProfileStats interface
    expect(typeof data.total_profiles).toBe("number");
    expect(data.total_profiles).toBeGreaterThan(0);
    // Cross-check: sum of profiles_by_family === total_profiles
    if (data.profiles_by_family) {
      const familySum = Object.values(data.profiles_by_family).reduce((a, b) => a + b, 0);
      expect(familySum).toBe(data.total_profiles);
    }
  });
});
