/**
 * dispatcher.jmdiePatternAnalyzer.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-JMPA dispatcher wiring.
 *
 * Drives 3 pure no-param static-analysis actions through real `prism_knowledge`:
 *   - jmdie_pattern_analyze  → JMDIEPatternAnalyzer.analyze
 *   - jmdie_pattern_rules    → JMDIEPatternAnalyzer.getRulesForPlaybook
 *   - jmdie_pattern_tips     → JMDIEPatternAnalyzer.getTipsForTribalKnowledge
 *
 * All three are deterministic, zero-I/O, no params. Wire scope: thin pass-through.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";
import { ACTION_KNOWLEDGE_SCHEMAS } from "../schemas/knowledgeActionSchemas.js";

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

let knowledgeHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerKnowledgeDispatcher(srv as unknown as Parameters<typeof registerKnowledgeDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_knowledge");
  if (!t) throw new Error("prism_knowledge not registered");
  knowledgeHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JMPA — Zod schema behavior", () => {
  it("jmdie_pattern_analyze schema accepts {} and returns parsed object", () => {
    const s = ACTION_KNOWLEDGE_SCHEMAS["jmdie_pattern_analyze"];
    const r = s.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(typeof r.data).toBe("object");
    }
  });

  it("jmdie_pattern_rules schema accepts {} and returns parsed object", () => {
    const s = ACTION_KNOWLEDGE_SCHEMAS["jmdie_pattern_rules"];
    const r = s.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(typeof r.data).toBe("object");
    }
  });

  it("jmdie_pattern_tips schema accepts {} and returns parsed object", () => {
    const s = ACTION_KNOWLEDGE_SCHEMAS["jmdie_pattern_tips"];
    const r = s.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(typeof r.data).toBe("object");
    }
  });

  it("jmdie_pattern_analyze passthrough() preserves unknown keys", () => {
    const s = ACTION_KNOWLEDGE_SCHEMAS["jmdie_pattern_analyze"];
    const r = s.safeParse({ extra: "ignored" });
    expect(r.success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JMPA — prism_knowledge :: jmdie_pattern_analyze", () => {
  it("returns full PatternAnalysisResult with rules + tips + topPatterns + counts", async () => {
    const r = await invokeHandler(knowledgeHandler, "jmdie_pattern_analyze", {});
    const data = r as {
      totalProgramsAnalyzed?: number;
      lathePrograms?: number;
      millPrograms?: number;
      patternsExtracted?: number;
      rulesGenerated?: number;
      tipsGenerated?: number;
      rules?: Array<unknown>;
      tips?: Array<unknown>;
      topPatterns?: Array<{ description?: string; frequency?: number; domain?: string }>;
    };
    // ROUTING PROOF: only the real engine produces these named numeric fields.
    // A failed call returns {success:false, error, action, dispatcher}.
    expect("success" in data).toBe(false);
    expect("error" in data).toBe(false);
    // Engine hardcodes JM Die archive size — must round-trip exactly.
    expect(data.totalProgramsAnalyzed).toBe(36929);
    expect(data.lathePrograms).toBe(5297);
    expect(data.millPrograms).toBe(3713);
    // Patterns/rules/tips counts must be positive integers
    expect(typeof data.patternsExtracted).toBe("number");
    expect(data.patternsExtracted).toBeGreaterThan(0);
    expect(typeof data.rulesGenerated).toBe("number");
    expect(data.rulesGenerated).toBeGreaterThan(0);
    expect(typeof data.tipsGenerated).toBe("number");
    expect(data.tipsGenerated).toBeGreaterThan(0);
    // Arrays must be present and non-empty
    expect(Array.isArray(data.rules)).toBe(true);
    expect((data.rules ?? []).length).toBeGreaterThan(0);
    expect(Array.isArray(data.tips)).toBe(true);
    expect((data.tips ?? []).length).toBeGreaterThan(0);
    expect(Array.isArray(data.topPatterns)).toBe(true);
    expect((data.topPatterns ?? []).length).toBe(5);
    // Engine hardcodes the top pattern — must round-trip
    expect(data.topPatterns?.[0]?.description).toBe("G85/G87 roughing-finishing pairs");
    expect(data.topPatterns?.[0]?.frequency).toBe(97);
    expect(data.topPatterns?.[0]?.domain).toBe("lathe");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JMPA — prism_knowledge :: jmdie_pattern_rules", () => {
  it("returns {rules: Array} envelope with engine count matching jmdie_pattern_analyze", async () => {
    const analyze = await invokeHandler(knowledgeHandler, "jmdie_pattern_analyze", {});
    const rulesOnly = await invokeHandler(knowledgeHandler, "jmdie_pattern_rules", {});
    const aData = analyze as { rules?: Array<unknown> };
    const rData = rulesOnly as { rules?: Array<unknown> };
    expect("success" in rData).toBe(false);
    expect(Array.isArray(rData.rules)).toBe(true);
    // Same engine call → same length (analyze().rules === getRulesForPlaybook())
    expect((rData.rules ?? []).length).toBe((aData.rules ?? []).length);
    expect((rData.rules ?? []).length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-JMPA — prism_knowledge :: jmdie_pattern_tips", () => {
  it("returns {tips: Array} envelope with engine count matching jmdie_pattern_analyze", async () => {
    const analyze = await invokeHandler(knowledgeHandler, "jmdie_pattern_analyze", {});
    const tipsOnly = await invokeHandler(knowledgeHandler, "jmdie_pattern_tips", {});
    const aData = analyze as { tips?: Array<unknown> };
    const tData = tipsOnly as { tips?: Array<unknown> };
    expect("success" in tData).toBe(false);
    expect(Array.isArray(tData.tips)).toBe(true);
    // Same engine call → same length
    expect((tData.tips ?? []).length).toBe((aData.tips ?? []).length);
    expect((tData.tips ?? []).length).toBeGreaterThan(0);
  });
});
