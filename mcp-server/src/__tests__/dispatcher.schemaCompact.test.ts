/**
 * dispatcher.schemaCompact.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-SCH dispatcher wiring.
 *
 * Drives all 5 actions through real `prism_dev`. Every method is pure
 * (no I/O, no mutation), so the full surface is wired without defers.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { schemaCompactEngine } from "../engines/SchemaCompactEngine.js";

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

// A representative JSON-schema-like body with verbose metadata that the
// compactor should strip: description, title, examples, default.
const VERBOSE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Speed Feed Input",
  description: "Inputs for the speed-feed calculator",
  type: "object",
  properties: {
    diameter_mm: {
      type: "number",
      description: "Tool diameter in millimeters",
      examples: [10, 12, 16],
      default: 12,
    },
    flutes: {
      type: "integer",
      description: "Number of flutes (Z)",
      default: 4,
    },
    material: {
      type: "string",
      description: "ISO material group",
      enum: ["P", "M", "K", "N", "S", "H"],
    },
  },
  required: ["diameter_mm", "flutes", "material"],
};

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — Zod schemas", () => {
  it("sch_compact requires schema object", () => {
    expect(ACTION_DEV_SCHEMAS["sch_compact"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["sch_compact"].safeParse({ schema: {} }).success).toBe(true);
  });

  it("sch_compact_with_stats requires schema object", () => {
    expect(ACTION_DEV_SCHEMAS["sch_compact_with_stats"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["sch_compact_with_stats"].safeParse({ schema: {} }).success).toBe(true);
  });

  it("sch_to_type_signature requires schema object", () => {
    expect(ACTION_DEV_SCHEMAS["sch_to_type_signature"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["sch_to_type_signature"].safeParse({ schema: {} }).success).toBe(true);
  });

  it("sch_compact_all requires non-empty schemas array", () => {
    expect(ACTION_DEV_SCHEMAS["sch_compact_all"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["sch_compact_all"].safeParse({ schemas: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["sch_compact_all"].safeParse({
      schemas: [{ name: "x", schema: {} }],
    }).success).toBe(true);
  });

  it("sch_compact_all caps at 500 entries (DoS guard)", () => {
    const big = Array.from({ length: 501 }, (_, i) => ({ name: `s${i}`, schema: {} }));
    expect(ACTION_DEV_SCHEMAS["sch_compact_all"].safeParse({ schemas: big }).success).toBe(false);
  });

  it("sch_one_liner requires schema object", () => {
    expect(ACTION_DEV_SCHEMAS["sch_one_liner"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["sch_one_liner"].safeParse({ schema: {} }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — prism_dev :: sch_compact", () => {
  it("strips description / title / examples / default metadata", async () => {
    const r = await invokeHandler(devHandler, "sch_compact", { schema: VERBOSE_SCHEMA });
    const compact = (r as { compact: Record<string, unknown> }).compact;
    const serialized = JSON.stringify(compact);
    expect(serialized).not.toMatch(/"description"/);
    expect(serialized).not.toMatch(/"title"/);
    expect(serialized).not.toMatch(/"examples"/);
    expect(serialized).not.toMatch(/"default"/);
    expect(serialized).not.toMatch(/"\$schema"/);
  });

  it("preserves load-bearing fields (type, properties, required, enum)", async () => {
    const r = await invokeHandler(devHandler, "sch_compact", { schema: VERBOSE_SCHEMA });
    const compact = (r as { compact: Record<string, unknown> }).compact;
    expect(compact.type).toBe("object");
    expect(typeof compact.properties).toBe("object");
    expect(Array.isArray(compact.required)).toBe(true);
  });

  it("ROUTING PROOF — wire compact byte-equals engine-direct compact()", async () => {
    const r = await invokeHandler(devHandler, "sch_compact", { schema: VERBOSE_SCHEMA });
    const wire = (r as { compact: unknown }).compact;
    const direct = schemaCompactEngine.compact(VERBOSE_SCHEMA);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — prism_dev :: sch_compact_with_stats", () => {
  it("returns {originalTokens, compactTokens, savings, savingsPercent}", async () => {
    const r = await invokeHandler(devHandler, "sch_compact_with_stats", { schema: VERBOSE_SCHEMA });
    const s = (r as { stats: { originalTokens: number; compactTokens: number; savings: number; savingsPercent: number } }).stats;
    expect(typeof s.originalTokens).toBe("number");
    expect(typeof s.compactTokens).toBe("number");
    expect(s.compactTokens).toBeLessThan(s.originalTokens);
    expect(s.savings).toBe(s.originalTokens - s.compactTokens);
  });

  it("savings ≥ 0 even on an already-compact schema (no negative savings)", async () => {
    const r = await invokeHandler(devHandler, "sch_compact_with_stats", {
      schema: { type: "object", properties: { x: { type: "number" } } },
    });
    const s = (r as { stats: { savings: number; savingsPercent: number } }).stats;
    expect(s.savings).toBeGreaterThanOrEqual(0);
    expect(s.savingsPercent).toBeGreaterThanOrEqual(0);
  });

  it("ROUTING PROOF — wire stats per-field equal engine-direct compactWithStats()", async () => {
    const r = await invokeHandler(devHandler, "sch_compact_with_stats", { schema: VERBOSE_SCHEMA });
    const wire = (r as { stats: { originalTokens: number; compactTokens: number; savings: number; savingsPercent: number } }).stats;
    const direct = schemaCompactEngine.compactWithStats(VERBOSE_SCHEMA);
    expect(wire.originalTokens).toBe(direct.originalTokens);
    expect(wire.compactTokens).toBe(direct.compactTokens);
    expect(wire.savings).toBe(direct.savings);
    expect(wire.savingsPercent).toBe(direct.savingsPercent);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — prism_dev :: sch_to_type_signature", () => {
  it("returns a non-empty string signature for an object schema", async () => {
    const r = await invokeHandler(devHandler, "sch_to_type_signature", { schema: VERBOSE_SCHEMA });
    const sig = (r as { signature?: string }).signature ?? "";
    expect(sig.length).toBeGreaterThan(0);
    expect((r as { length?: number }).length).toBe(sig.length);
  });

  it("ROUTING PROOF — wire signature string-equals engine-direct toTypeSignature()", async () => {
    const r = await invokeHandler(devHandler, "sch_to_type_signature", { schema: VERBOSE_SCHEMA });
    const wire = (r as { signature?: string }).signature ?? "";
    const direct = schemaCompactEngine.toTypeSignature(VERBOSE_SCHEMA);
    expect(wire).toBe(direct);
  });

  it("VARIABILITY — string / number / array / enum / union shapes all yield distinct signatures", async () => {
    const cases = [
      { name: "string-only", schema: { type: "string" } },
      { name: "number-only", schema: { type: "number" } },
      { name: "array-of-string", schema: { type: "array", items: { type: "string" } } },
      { name: "enum-3", schema: { type: "string", enum: ["a", "b", "c"] } },
    ];
    const sigs: string[] = [];
    for (const c of cases) {
      const r = await invokeHandler(devHandler, "sch_to_type_signature", { schema: c.schema });
      sigs.push((r as { signature?: string }).signature ?? "");
    }
    const distinct = new Set(sigs);
    expect(distinct.size).toBe(sigs.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — prism_dev :: sch_compact_all", () => {
  it("compacts each entry and preserves name", async () => {
    const r = await invokeHandler(devHandler, "sch_compact_all", {
      schemas: [
        { name: "schema_a", schema: VERBOSE_SCHEMA },
        { name: "schema_b", schema: { type: "string", description: "drop me" } },
      ],
    });
    const compacted = (r as { compacted?: Array<{ name: string; compact: string }> }).compacted ?? [];
    expect(compacted.length).toBe(2);
    expect(compacted[0]!.name).toBe("schema_a");
    expect(compacted[1]!.name).toBe("schema_b");
    expect(compacted[1]!.compact).not.toMatch(/"description"/);
    expect((r as { count?: number }).count).toBe(2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — prism_dev :: sch_one_liner", () => {
  it("returns the 'N→M tokens (P% saved)' summary format", async () => {
    const r = await invokeHandler(devHandler, "sch_one_liner", { schema: VERBOSE_SCHEMA });
    const summary = (r as { summary?: string }).summary ?? "";
    expect(summary).toMatch(/\d+→\d+ tokens \(\d+% saved\)/);
  });

  it("ROUTING PROOF — wire summary string-equals engine-direct oneLiner()", async () => {
    const r = await invokeHandler(devHandler, "sch_one_liner", { schema: VERBOSE_SCHEMA });
    const wire = (r as { summary?: string }).summary;
    const direct = schemaCompactEngine.oneLiner(VERBOSE_SCHEMA);
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCH — error envelope", () => {
  it("sch_compact without schema → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "sch_compact", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("sch_compact_all with empty schemas → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "sch_compact_all", { schemas: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
