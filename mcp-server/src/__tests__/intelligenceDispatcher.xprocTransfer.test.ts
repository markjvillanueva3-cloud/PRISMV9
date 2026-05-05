/**
 * intelligenceDispatcher.xprocTransfer.test.ts — U-XPROC-NEURAL-T1-03
 * dispatcher round-trip tests for the 3 transfer-learning actions:
 *   xproc_transfer_classify / xproc_transfer_pairs / xproc_transfer_check
 *
 * @see src/engines/CrossProcessTransferLearningEngine.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(
    server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

describe("intelligenceDispatcher xproc_transfer_* (U-XPROC-NEURAL-T1-03)", () => {
  it("xproc_transfer_classify maps a known material to its cluster", async () => {
    const body = await invoke("xproc_transfer_classify", { material: "AISI 4140" });
    expect(body.success).toBe(true);
    expect(body.material).toBe("AISI 4140");
    expect(body.cluster).toBe("carbon_steel");
  });

  it("xproc_transfer_classify maps a tool-steel pattern to hardened_steel", async () => {
    const body = await invoke("xproc_transfer_classify", { material: "D2 tool steel" });
    expect(body.cluster).toBe("hardened_steel");
  });

  it("xproc_transfer_classify returns null cluster for unclassifiable material", async () => {
    const body = await invoke("xproc_transfer_classify", { material: "unobtainium-99" });
    expect(body.success).toBe(true);
    expect(body.cluster).toBeNull();
  });

  it("xproc_transfer_classify without material returns dispatcher error", async () => {
    const body = await invoke("xproc_transfer_classify", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("material");
  });

  it("xproc_transfer_pairs returns 6 pairs and 9 clusters", async () => {
    const body = await invoke("xproc_transfer_pairs");
    expect(body.success).toBe(true);
    expect(body.count).toBe(6);
    const pairs = body.pairs as Array<[string, string]>;
    expect(pairs.length).toBe(6);
    for (const [s, t] of pairs) {
      expect(typeof s).toBe("string");
      expect(typeof t).toBe("string");
      expect(s).not.toBe(t);
    }
    const clusters = body.clusters as string[];
    expect(clusters.length).toBe(9);
  });

  it("xproc_transfer_check confirms a known trusted material pair", async () => {
    const body = await invoke("xproc_transfer_check", {
      source: "AISI 4140",
      target: "Stainless 304",
    });
    expect(body.success).toBe(true);
    expect(body.sourceCluster).toBe("carbon_steel");
    expect(body.targetCluster).toBe("stainless_steel");
    expect(body.trusted).toBe(true);
  });

  it("xproc_transfer_check rejects an untrusted pair", async () => {
    const body = await invoke("xproc_transfer_check", {
      source: "Delrin",
      target: "Ti-6Al-4V",
    });
    expect(body.success).toBe(true);
    expect(body.sourceCluster).toBe("plastics");
    expect(body.targetCluster).toBe("exotic");
    expect(body.trusted).toBe(false);
  });

  it("xproc_transfer_check accepts cluster names directly", async () => {
    const body = await invoke("xproc_transfer_check", {
      source: "carbon_steel",
      target: "hardened_steel",
    });
    expect(body.success).toBe(true);
    expect(body.trusted).toBe(true);
  });

  it("xproc_transfer_check without source/target returns dispatcher error", async () => {
    const body = await invoke("xproc_transfer_check", { source: "carbon_steel" });
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("source");
  });
});
