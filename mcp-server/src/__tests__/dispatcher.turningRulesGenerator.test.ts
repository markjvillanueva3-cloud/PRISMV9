/**
 * dispatcher.turningRulesGenerator.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-TRG dispatcher wiring (2 actions).
 *
 * Drives both surfaces through the real `prism_turning` dispatcher:
 *   - turning_rules_generate → TurningRulesGeneratorEngine.generate
 *   - turning_rules_stats    → TurningRulesGeneratorEngine.getStats
 *
 * The engine-direct suite (`TurningRulesGeneratorEngine.test.ts`, 14 cases,
 * confirmed GREEN before wiring) proves the rule-table numerics. This file
 * pins three contracts only a dispatcher round-trip can verify:
 *   1. Both actions register on the prism_turning Zod enum.
 *   2. The dispatcher wraps every engine result as { success, data }.
 *   3. The CONDITIONAL rule-family gating survives the wire: a material-only
 *      context yields zero rules by design (not an error), while each added
 *      context field unlocks exactly its rule family — the documented engine
 *      contract that a naive caller would otherwise mistake for a bug.
 *
 * Reference values pinned from the engine's published reference tables:
 *   Sandvik Coromant 2023 (Vc), Machinery's Handbook 31e (fn, ap).
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

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

interface MachiningRule {
  id: string;
  kind: string;
  name: string;
  conditions: Record<string, string | number>;
  bounds: { min?: number; max?: number; unit: string; field: string };
  priority: number;
  source: string;
}
interface RuleSet {
  context: Record<string, unknown>;
  rules: MachiningRule[];
  generated_at: string;
  rule_count_by_kind: Record<string, number>;
}
interface RulesStats {
  rule_kinds: string[];
  supported_iso_groups: string[];
  supported_operations: string[];
  rules_generated: number;
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRG — schema registration + rejection", () => {
  it("turning_rules_generate is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse).toBe("function");
  });

  it("turning_rules_stats is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.turning_rules_stats.safeParse).toBe("function");
  });

  it("generate rejects a missing material", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse({
      iso_group: "P",
    }).success).toBe(false);
  });

  it("generate rejects an empty-string material (min:1)", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse({
      material: "",
    }).success).toBe(false);
  });

  it("generate rejects an unknown iso_group", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse({
      material: "4140", iso_group: "X",
    }).success).toBe(false);
  });

  it("generate rejects an unknown operation", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse({
      material: "4140", operation: "honing",
    }).success).toBe(false);
  });

  it("generate rejects an unknown machine_class", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse({
      material: "4140", machine_class: "gantry",
    }).success).toBe(false);
  });

  it("generate accepts a material-only context", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_generate.safeParse({
      material: "4140",
    }).success).toBe(true);
  });

  it("stats accepts an empty payload", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_rules_stats.safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRG — prism_turning :: turning_rules_generate", () => {
  it("material-only context → success:true with ZERO rules (documented gating)", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "4140",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    // slimResponse strips the empty rules[] from the wire — inverse-check
    // the documented zero-rule gating (pattern from dispatcher.lathePartoff).
    expect((data.rules ?? []).length).toBe(0);
    // context echoes back regardless of slimming (non-empty object).
    expect(data.context.material).toBe("4140");
  });

  it("iso_group P unlocks exactly the two velocity_envelope rules with Sandvik bounds", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "1045", iso_group: "P",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    const vc = data.rules.filter((x) => x.kind === "velocity_envelope");
    expect(vc.length).toBe(2); // rough + finish (no operation filter)
    const rough = vc.find((x) => x.conditions.operation === "roughing")!;
    const finish = vc.find((x) => x.conditions.operation === "finishing")!;
    // Sandvik Coromant 2023, ISO-P: rough [180,260], finish [260,400] m/min
    expect(rough.bounds.min).toBe(180);
    expect(rough.bounds.max).toBe(260);
    expect(finish.bounds.min).toBe(260);
    expect(finish.bounds.max).toBe(400);
    expect(rough.bounds.field).toBe("Vc_m_min");
  });

  it("iso_group + operation=roughing yields only the roughing velocity rule + feed + DoC", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "1045", iso_group: "P", operation: "roughing",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    const vc = data.rules.filter((x) => x.kind === "velocity_envelope");
    expect(vc.length).toBe(1);
    expect(vc[0]!.conditions.operation).toBe("roughing");
    // Machinery's Handbook 31e: roughing fn [0.2,0.5], ap [1.5,6.0]
    const fn = data.rules.find((x) => x.kind === "feed_envelope")!;
    const ap = data.rules.find((x) => x.kind === "doc_envelope")!;
    expect(fn.bounds.min).toBe(0.2);
    expect(fn.bounds.max).toBe(0.5);
    expect(ap.bounds.min).toBe(1.5);
    expect(ap.bounds.max).toBe(6.0);
  });

  it("machine_class=swiss adds a spindle_constraint with the 12000 RPM cap", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "303", machine_class: "swiss",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    const sp = data.rules.find((x) => x.kind === "spindle_constraint")!;
    expect(sp.bounds.max).toBe(12000);
    expect(sp.bounds.field).toBe("rpm");
    expect(sp.priority).toBe(10);
  });

  it("tool_type containing 'carbide' yields the carbide L/D=6 chatter constraint", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "4340", tool_type: "solid carbide boring bar",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    const ch = data.rules.find((x) => x.kind === "chatter_constraint")!;
    expect(ch.bounds.max).toBe(6); // LD_LIMITS.carbide
    expect(ch.bounds.field).toBe("l_over_d");
    expect(ch.conditions.tool_body).toBe("carbide");
  });

  it("tool_type with 'anti-vibration' infers the dampened L/D=10 limit", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "4340", tool_type: "anti-vibration silent boring bar",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    const ch = data.rules.find((x) => x.kind === "chatter_constraint")!;
    expect(ch.bounds.max).toBe(10); // LD_LIMITS.dampened
    expect(ch.conditions.tool_body).toBe("dampened");
  });

  it("full context produces all five rule families and a consistent count map", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      material: "Ti-6Al-4V",
      iso_group: "S",
      operation: "finishing",
      tool_type: "heavy metal bar",
      machine_class: "mill_turn",
    });
    expect(r.success).toBe(true);
    const data = r.data as RuleSet;
    const kinds = new Set(data.rules.map((x) => x.kind));
    expect(kinds.has("velocity_envelope")).toBe(true);
    expect(kinds.has("feed_envelope")).toBe(true);
    expect(kinds.has("doc_envelope")).toBe(true);
    expect(kinds.has("spindle_constraint")).toBe(true);
    expect(kinds.has("chatter_constraint")).toBe(true);
    // rule_count_by_kind must sum to rules.length
    const sum = Object.values(data.rule_count_by_kind).reduce((a, b) => a + b, 0);
    expect(sum).toBe(data.rules.length);
    // ISO-S finishing Vc [60,120] (Sandvik 2023)
    const vc = data.rules.find((x) => x.kind === "velocity_envelope")!;
    expect(vc.bounds.min).toBe(60);
    expect(vc.bounds.max).toBe(120);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRG — prism_turning :: turning_rules_stats", () => {
  it("returns the capability surface with all six ISO groups + seven operations", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_stats", {});
    expect(r.success).toBe(true);
    const data = r.data as RulesStats;
    expect(data.rule_kinds).toEqual([
      "velocity_envelope", "feed_envelope", "doc_envelope",
      "spindle_constraint", "chatter_constraint",
    ]);
    expect(data.supported_iso_groups.sort()).toEqual(["H", "K", "M", "N", "P", "S"]);
    expect(data.supported_operations).toContain("roughing");
    expect(data.supported_operations).toContain("parting");
    expect(data.supported_operations.length).toBe(7);
    expect(typeof data.rules_generated).toBe("number");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRG — dispatcher-boundary rejection", () => {
  it("rejects a generate payload with no material (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "turning_rules_generate", {
      iso_group: "P",
    });
    expect(r.success).not.toBe(true);
  });
});
