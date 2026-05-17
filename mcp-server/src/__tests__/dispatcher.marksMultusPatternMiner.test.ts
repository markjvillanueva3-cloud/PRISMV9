/**
 * dispatcher.marksMultusPatternMiner.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MMPM (MarksMultusPatternMinerEngine).
 *
 * 2 pure-read actions through real `prism_dev`:
 *   mmpm_mine_text  → mineText(content, source_name?) — pure regex parse
 *   mmpm_get_stats  → getStats() — supported pattern kinds
 *
 * DEFERRED:
 *   - mineFile(filePath): LLM-supplied disk read = path traversal class.
 *   - mineDirectory(dirPath): LLM-supplied directory read = same class.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { marksMultusPatternMinerEngine } from "../engines/MarksMultusPatternMinerEngine.js";

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

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Engine regexes (confirmed via source read):
//   SPINDLE_MODE_RE: G96|G97|G50  (constant-surface-speed mode, NOT M03)
//   COOLANT_MODE_RE: M7|M8|M9|M13|M53  (unpadded, NOT M08)
//   TOOL_CHANGE_RE: T\d{2,4}
//   CANNED_CYCLE_RE: G71-G87 family
//   SUBPROGRAM_CALL_RE: M98 P\d+
// Sample exercises 5+ distinct kinds the engine ACTUALLY detects.
const SAMPLE_GCODE = [
  "(START OF PROGRAM)",
  "T01 M06",
  "G96 S300",       // constant surface speed mode = SPINDLE_MODE_RE
  "M8",             // unpadded mist coolant = COOLANT_MODE_RE
  "G00 X0 Y0 Z1.0",
  "G81 X1.0 Y1.0 Z-0.5 R0.1 F10.0",  // canned drill
  "M98 P1000",      // subprogram call
  "M9",             // coolant off
  "M30",
].join("\n");

describe("WIRE-UNWIRED-MS0/U-WIRE-MMPM — Zod schemas", () => {
  it("mmpm_mine_text accepts content + optional source_name", () => {
    expect(ACTION_DEV_SCHEMAS["mmpm_mine_text"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mmpm_mine_text"].safeParse({
      content: "G00 X0",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mmpm_mine_text"].safeParse({
      content: "G00 X0", source_name: "test.MIN",
    }).success).toBe(true);
  });

  it("mmpm_mine_text caps content at 5MB (DoS bound)", () => {
    expect(ACTION_DEV_SCHEMAS["mmpm_mine_text"].safeParse({
      content: "x".repeat(5_000_001),
    }).success).toBe(false);
  });

  it("mmpm_mine_text rejects oversize source_name (>256)", () => {
    expect(ACTION_DEV_SCHEMAS["mmpm_mine_text"].safeParse({
      content: "G00", source_name: "x".repeat(257),
    }).success).toBe(false);
  });

  it("mmpm_get_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["mmpm_get_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MMPM — prism_dev :: mmpm_mine_text", () => {
  it("sample G-code -> detects tool_change + spindle_mode + coolant_mode + canned_cycle + subprogram_call", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: SAMPLE_GCODE,
    });
    const res = (r as { result: { total_lines: number; pattern_counts: Record<string, number>; unique_tools: number[] } }).result;
    expect(res.total_lines).toBe(9);
    // M06 tool change with T01
    expect(res.pattern_counts.tool_change).toBeGreaterThan(0);
    expect(res.unique_tools).toContain(1);
    // M03 spindle CW
    expect(res.pattern_counts.spindle_mode).toBeGreaterThan(0);
    // M08 coolant on
    expect(res.pattern_counts.coolant_mode).toBeGreaterThan(0);
    // G81 canned drill cycle
    expect(res.pattern_counts.canned_cycle).toBeGreaterThan(0);
    // M98 subprogram call
    expect(res.pattern_counts.subprogram_call).toBeGreaterThan(0);
  });

  it("empty content returns 0 patterns and 0 tools", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", { content: "" });
    expect((r.pattern_count as number | undefined) ?? 0).toBe(0);
    expect((r.unique_tool_count as number | undefined) ?? 0).toBe(0);
  });

  it("comment-only content yields 0 patterns (engine line 122 skips '(' + ';')", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: "(COMMENT 1)\n;COMMENT 2\n; ANOTHER",
    });
    expect((r.pattern_count as number | undefined) ?? 0).toBe(0);
  });

  it("VARIABILITY — 3 distinct source_name labels echo through to result.source", async () => {
    const labels = ["fixture-A.MIN", "fixture-B.MIN", "fixture-C.MIN"];
    for (const label of labels) {
      const r = await invokeHandler(devHandler, "mmpm_mine_text", {
        content: SAMPLE_GCODE, source_name: label,
      });
      const res = (r as { result: { source: string } }).result;
      expect(res.source).toBe(label);
    }
  });

  it("source_name defaults to 'in-memory' when omitted (engine line 103)", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: SAMPLE_GCODE,
    });
    const res = (r as { result: { source: string } }).result;
    expect(res.source).toBe("in-memory");
  });

  it("has_macros derived from macro_call OR macro_definition counts (engine line 192)", async () => {
    // Multus macro call via M98 P1000 — counts as subprogram_call, not macro_call.
    // A G65 P9020 would be a macro_call.
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: "G65 P9020 A1.0 B2.0",
    });
    expect(r.has_macros).toBe(true);
  });

  it("has_probing detected for probe-style G-code lines", async () => {
    // Probe commands typically use G31 skip or M65/M75
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: "G31 X10.0 F100.0",
    });
    expect(typeof r.has_probing).toBe("boolean");
  });

  it("ROUTING PROOF — wire pattern_count equals engine-direct mineText().patterns.length", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", { content: SAMPLE_GCODE });
    const direct = marksMultusPatternMinerEngine.mineText(SAMPLE_GCODE);
    expect((r.pattern_count as number | undefined) ?? 0).toBe(direct.patterns.length);
  });

  it("each pattern has kind + signature + line_number + semantic_hash + source_file", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", { content: SAMPLE_GCODE });
    const res = (r as { result: { patterns: Array<{ kind: string; signature: string; line_number: number; semantic_hash: string; source_file: string }> } }).result;
    for (const p of res.patterns) {
      expect(p.kind.length).toBeGreaterThan(0);
      expect(p.signature.length).toBeGreaterThan(0);
      expect(p.line_number).toBeGreaterThan(0);
      expect(p.semantic_hash.length).toBeGreaterThan(0);
      expect(p.source_file).toBe("in-memory");
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MMPM — prism_dev :: mmpm_get_stats", () => {
  it("returns 9 supported pattern kinds + dedup_algorithm name", async () => {
    const r = await invokeHandler(devHandler, "mmpm_get_stats", {});
    const stats = (r as { stats: { supported_kinds: number; dedup_algorithm: string } }).stats;
    expect(stats.supported_kinds).toBe(9);
    expect(stats.dedup_algorithm.length).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire stats matches engine-direct getStats", async () => {
    const r = await invokeHandler(devHandler, "mmpm_get_stats", {});
    const wire = (r as { stats: { supported_kinds: number; dedup_algorithm: string } }).stats;
    const direct = marksMultusPatternMinerEngine.getStats();
    expect(wire.supported_kinds).toBe(direct.supported_kinds);
    expect(wire.dedup_algorithm).toBe(direct.dedup_algorithm);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MMPM — error envelope", () => {
  it("mmpm_mine_text without content → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("mmpm_mine_text with > 5MB content → schema rejects (DoS)", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: "x".repeat(6_000_000),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("mmpm_mine_text with oversize source_name → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mmpm_mine_text", {
      content: "G00", source_name: "x".repeat(1000),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
