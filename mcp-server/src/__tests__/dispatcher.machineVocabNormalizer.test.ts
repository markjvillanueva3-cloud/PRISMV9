/**
 * dispatcher.machineVocabNormalizer.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-MVN dispatcher wiring (3 actions).
 *
 * Drives all 3 surfaces through the real `prism_data` dispatcher:
 *   - machine_vocab_normalize        → normalize{Manufacturer,Controller,
 *                                        Spindle,Coolant,Capability,ModelId}
 *   - machine_vocab_normalize_record → normalizeMachineRecord
 *   - machine_vocab_catalog          → get{Manufacturers,Controllers,
 *                                        CoolantTypes}
 *
 * The engine-direct suite (`MachineVocabularyNormalizerEngine.test.ts`, 46
 * cases, GREEN-verified before wiring per the pre-wire gate) proves the
 * lookup/fuzzy numerics. This file pins the contracts only a dispatcher
 * round-trip can verify:
 *   1. All 3 actions register on the prism_data Zod enum.
 *   2. The dispatcher wraps every result as { success, data } and surfaces
 *      input-routing errors (missing value, kind='model' w/o manufacturer,
 *      unknown kind, unknown catalog) as success:false WITHOUT throwing.
 *   3. The `kind`-router dispatches to the correct engine method (a
 *      manufacturer value normalized as kind='controller' must NOT return
 *      the manufacturer canonical — proves routing isn't a passthrough).
 *
 * Reference values pinned from the engine's canonical tables (MANUFACTURER_
 * CANONICALS / CONTROLLER_CANONICALS / COOLANT_ALIASES).
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";
import { ACTION_DATA_SCHEMAS } from "../schemas/dataActionSchemas.js";

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

interface NormResult {
  original: string;
  normalized: { id: string; name?: string; vendor?: string; type?: string };
  confidence: number;
  matchType: "exact" | "alias" | "fuzzy" | "pattern" | "default";
}
interface RecordResult {
  manufacturer?: NormResult;
  controller?: NormResult;
  coolant?: NormResult;
  capabilities?: NormResult[];
  overallConfidence: number;
}

let dataHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDataDispatcher(srv as unknown as Parameters<typeof registerDataDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_data");
  if (!t) throw new Error("prism_data not registered");
  dataHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MVN — all 3 schemas registered", () => {
  for (const a of ["machine_vocab_normalize", "machine_vocab_normalize_record", "machine_vocab_catalog"] as const) {
    it(`${a} schema is a usable Zod object`, () => {
      expect(typeof ACTION_DATA_SCHEMAS[a].safeParse).toBe("function");
    });
  }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MVN — schema rejection paths", () => {
  it("normalize rejects an unknown kind", () => {
    expect(ACTION_DATA_SCHEMAS.machine_vocab_normalize.safeParse({
      kind: "frobnicator", value: "x",
    }).success).toBe(false);
  });

  it("normalize rejects an empty value", () => {
    expect(ACTION_DATA_SCHEMAS.machine_vocab_normalize.safeParse({
      kind: "manufacturer", value: "",
    }).success).toBe(false);
  });

  it("normalize rejects a non-positive max_rpm", () => {
    expect(ACTION_DATA_SCHEMAS.machine_vocab_normalize.safeParse({
      kind: "spindle", value: "direct drive", max_rpm: -1,
    }).success).toBe(false);
  });

  it("catalog rejects an unknown 'which'", () => {
    expect(ACTION_DATA_SCHEMAS.machine_vocab_catalog.safeParse({
      which: "spindles",
    }).success).toBe(false);
  });

  it("normalize accepts a minimal manufacturer payload", () => {
    expect(ACTION_DATA_SCHEMAS.machine_vocab_normalize.safeParse({
      kind: "manufacturer", value: "OKUMA",
    }).success).toBe(true);
  });

  it("normalize_record accepts an empty object (all fields optional)", () => {
    expect(ACTION_DATA_SCHEMAS.machine_vocab_normalize_record.safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MVN — prism_data :: machine_vocab_normalize", () => {
  it("manufacturer alias 'OKUMA' → canonical id 'okuma' (alias match)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "manufacturer", value: "OKUMA",
    });
    expect(r.success).toBe(true);
    const d = r.data as NormResult;
    expect(d.normalized.id).toBe("okuma");
    expect(d.normalized.name).toBe("Okuma");
    expect(["exact", "alias"]).toContain(d.matchType);
    expect(d.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("controller 'Fanuc 31i' → FANUC 31i canonical (alias/pattern)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "controller", value: "Fanuc 31i",
    });
    expect(r.success).toBe(true);
    const d = r.data as NormResult;
    expect(d.normalized.id).toBe("fanuc_31i");
    expect(d.normalized.vendor).toBe("FANUC");
  });

  it("coolant 'thru spindle' → through_spindle canonical (alias)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "coolant", value: "thru spindle",
    });
    expect(r.success).toBe(true);
    const d = r.data as NormResult;
    expect(d.normalized.id).toBe("through_spindle");
  });

  it("spindle with max_rpm>15000 + no pattern → direct-drive inference", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "spindle", value: "spindle", max_rpm: 20000,
    });
    expect(r.success).toBe(true);
    const d = r.data as NormResult;
    expect(d.normalized.type).toBe("direct");
  });

  it("capability '5-axis' → axis-category canonical (pattern)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "capability", value: "5-axis simultaneous",
    });
    expect(r.success).toBe(true);
    const d = r.data as NormResult;
    expect(d.matchType).toBe("pattern");
    expect(d.normalized.id).toContain("5");
  });

  it("model normalization requires manufacturer — strips mfr prefix", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "model", value: "Okuma LB3000 EX II", manufacturer: "Okuma",
    });
    expect(r.success).toBe(true);
    const d = r.data as { normalized: string };
    // mfr prefix stripped + Okuma EX-II rule applied → no leading "OKUMA"
    expect(String(d.normalized).startsWith("OKUMA")).toBe(false);
    expect(String(d.normalized)).toContain("LB3000");
  });

  it("ROUTING PROOF: a manufacturer value normalized as kind='controller' goes through normalizeController", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "controller", value: "Okuma",
    });
    expect(r.success).toBe(true);
    const d = r.data as { normalized: { vendor: string; family: string; fullName: string; model: string }; matchType: string; confidence: number };
    // Routed to normalizeController → 'Okuma' is not a known controller, so
    // it falls to the engine's default ControllerCanonical shape:
    //   { vendor:"Unknown", family:"Unknown", fullName:input, model:input }.
    // The manufacturer canonical has NO vendor/family/fullName fields — it
    // carries name/country/machineTypes. `slugify("Okuma")` legitimately
    // collides on id "okuma", so vendor/family/fullName are the
    // discriminating fields proving the controller path actually ran.
    expect(d.normalized.vendor).toBe("Unknown");
    expect(d.normalized.family).toBe("Unknown");
    expect(d.normalized.fullName).toBe("Okuma");
    expect(d.normalized.model).toBe("Okuma");
    expect(d.matchType).toBe("default");
    expect(d.confidence).toBe(0.3);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MVN — input-routing errors → success:false (no throw)", () => {
  it("missing value → success:false", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "manufacturer", value: "   ",
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("value is required");
  });

  it("kind='model' without manufacturer → success:false", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize", {
      kind: "model", value: "LB3000",
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("manufacturer");
  });

  it("unknown catalog 'which' is rejected at the schema boundary (success:false, no throw)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_catalog", {
      which: "robots",
    });
    // `which` is a z.enum — an unknown value is rejected by Zod at the
    // dispatcher boundary BEFORE the case body runs, so the error is a
    // schema-validation message (not the dispatcher's defensive
    // "unknown catalog" guard, which is unreachable-but-correct
    // defense-in-depth). The load-bearing contract: success:false, the
    // engine never sees the bad input, and nothing throws.
    expect(r.success).toBe(false);
    // The engine never ran → no catalog payload came back. (A successful
    // catalog call returns data.catalog as an array; a schema rejection
    // must not.)
    const catalog = (r.data as { catalog?: unknown } | undefined)?.catalog;
    expect(Array.isArray(catalog)).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MVN — prism_data :: machine_vocab_normalize_record", () => {
  it("normalizes a full record + computes overallConfidence as the product", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize_record", {
      manufacturer: "MAZAK",
      controller: "SmoothAi",
      coolant: "high pressure",
      capabilities: ["5-axis", "sub-spindle"],
    });
    expect(r.success).toBe(true);
    const d = r.data as RecordResult;
    expect(d.manufacturer!.normalized.id).toBe("mazak");
    expect(d.controller!.normalized.vendor).toBe("Mazak");
    expect(d.coolant!.normalized.id).toBe("through_spindle");
    expect(d.capabilities!.length).toBe(2);
    expect(d.overallConfidence).toBeGreaterThan(0);
    expect(d.overallConfidence).toBeLessThanOrEqual(1);
  });

  it("an empty record yields overallConfidence 1.0 and no per-field results", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_normalize_record", {});
    expect(r.success).toBe(true);
    const d = r.data as RecordResult;
    expect(d.overallConfidence).toBe(1.0);
    expect(d.manufacturer === undefined).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MVN — prism_data :: machine_vocab_catalog", () => {
  it("returns the manufacturer canonical list (≥ 20 entries, includes Okuma)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_catalog", {
      which: "manufacturers",
    });
    expect(r.success).toBe(true);
    const d = r.data as { which: string; catalog: Array<{ id: string }> };
    expect(d.which).toBe("manufacturers");
    expect(d.catalog.length).toBeGreaterThanOrEqual(20);
    expect(d.catalog.some((m) => m.id === "okuma")).toBe(true);
  });

  it("returns the coolant_types canonical list (includes through_spindle)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_catalog", {
      which: "coolant_types",
    });
    expect(r.success).toBe(true);
    const d = r.data as { catalog: Array<{ id: string }> };
    expect(d.catalog.some((c) => c.id === "through_spindle")).toBe(true);
    expect(d.catalog.some((c) => c.id === "flood")).toBe(true);
  });

  it("returns the controllers canonical list (includes a FANUC entry)", async () => {
    const r = await invokeHandler(dataHandler, "machine_vocab_catalog", {
      which: "controllers",
    });
    expect(r.success).toBe(true);
    const d = r.data as { catalog: Array<{ vendor: string }> };
    expect(d.catalog.some((c) => c.vendor === "FANUC")).toBe(true);
  });
});
