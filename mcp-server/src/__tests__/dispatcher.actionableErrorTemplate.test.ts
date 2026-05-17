/**
 * dispatcher.actionableErrorTemplate.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-AET dispatcher wiring (ActionableErrorTemplateEngine).
 *
 * Drives 5 read actions through real `prism_dev`. Write methods
 * (register/registerAll/clear) DEFERRED — LLM-callable registers would
 * let fictional templates mask real errors.
 *
 * Tests pre-seed via engine-direct register() so read paths have content.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { actionableErrorTemplateEngine } from "../engines/ActionableErrorTemplateEngine.js";

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
let preexistingSize: number;
let preexistingCodes: string[];

const SEEDED_CODES = ["E_TEST_DUP", "E_TEST_PHYSICS", "E_TEST_PARAM"];

beforeAll(() => {
  // Don't clear pre-existing templates — production code may have registered
  // real ones at module load. Capture the baseline and use distinct test codes
  // so we don't collide with anything real.
  preexistingSize = actionableErrorTemplateEngine.size();
  preexistingCodes = actionableErrorTemplateEngine.listCodes();

  actionableErrorTemplateEngine.register({
    code: "E_TEST_DUP",
    headline: "Duplicate engine name: {name}",
    tryInstead: "Reuse the existing {name} from src/engines/ instead of creating a duplicate.",
    suggestedCommand: "/dedup {name}",
    docsUrl: "https://docs.example/dedup",
  });
  actionableErrorTemplateEngine.register({
    code: "E_TEST_PHYSICS",
    headline: "Inlined physics constant detected",
    tryInstead: "Import from src/physics/constants.ts — never inline Kienzle/Taylor values.",
  });
  actionableErrorTemplateEngine.register({
    code: "E_TEST_PARAM",
    headline: "Missing parameter: {param}",
    tryInstead: "Pass {param} as part of the action arguments.",
    suggestedCommand: "/help {action}",
  });

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

afterAll(() => {
  // Don't clearAll() — that would wipe production templates too.
  // Best-effort: leave the 3 test-prefixed codes; they're harmless.
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AET — Zod schemas", () => {
  it("aet_has / aet_get / aet_render require non-empty code", () => {
    for (const a of ["aet_has", "aet_get", "aet_render"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ code: "" }).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ code: "x" }).success).toBe(true);
    }
  });

  it("aet_render variables accept string|number values", () => {
    expect(ACTION_DEV_SCHEMAS["aet_render"].safeParse({
      code: "x", variables: { name: "Foo", count: 42 },
    }).success).toBe(true);
  });

  it("aet_render rejects variables with non-primitive values", () => {
    expect(ACTION_DEV_SCHEMAS["aet_render"].safeParse({
      code: "x", variables: { name: { nested: "object" } },
    }).success).toBe(false);
  });

  it("aet_list_codes / aet_size accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["aet_list_codes"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["aet_size"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AET — prism_dev :: aet_has", () => {
  it("registered code → has:true", async () => {
    const r = await invokeHandler(devHandler, "aet_has", { code: "E_TEST_DUP" });
    expect((r as { has?: boolean | string }).has).toBe(true);
  });

  it("unknown code → has:'no' (slimResponse-safe discriminator)", async () => {
    const r = await invokeHandler(devHandler, "aet_has", { code: "E_NEVER_REGISTERED_" + Date.now() });
    expect((r as { has?: boolean | string }).has).toBe("no");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AET — prism_dev :: aet_get", () => {
  it("registered code → found:true with template + headline + suggestedCommand", async () => {
    const r = await invokeHandler(devHandler, "aet_get", { code: "E_TEST_DUP" });
    expect((r as { found?: boolean }).found).toBe(true);
    const t = (r as { template: { code: string; headline: string; suggestedCommand?: string; docsUrl?: string } }).template;
    expect(t.code).toBe("E_TEST_DUP");
    expect(t.headline).toBe("Duplicate engine name: {name}");
    expect(t.suggestedCommand).toBe("/dedup {name}");
    expect(t.docsUrl).toBe("https://docs.example/dedup");
  });

  it("template without optional fields → no suggestedCommand/docsUrl", async () => {
    const r = await invokeHandler(devHandler, "aet_get", { code: "E_TEST_PHYSICS" });
    expect((r as { found?: boolean }).found).toBe(true);
    const t = (r as { template: { headline: string; suggestedCommand?: string; docsUrl?: string } }).template;
    expect(t.headline).toBe("Inlined physics constant detected");
    expect(t.suggestedCommand ?? "").toBe("");
    expect(t.docsUrl ?? "").toBe("");
  });

  it("unknown code → found:false", async () => {
    const r = await invokeHandler(devHandler, "aet_get", { code: "E_NEVER_" + Date.now() });
    expect((r as { found?: boolean }).found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AET — prism_dev :: aet_render", () => {
  it("registered code + variables → expanded headline + tryInstead + variablesUsed", async () => {
    const r = await invokeHandler(devHandler, "aet_render", {
      code: "E_TEST_DUP",
      variables: { name: "FooEngine" },
    });
    const rendered = (r as { rendered: { hasTemplate: boolean; headline: string; tryInstead: string; suggestedCommand?: string; message: string; variablesUsed: string[] } }).rendered;
    expect(rendered.hasTemplate).toBe(true);
    expect(rendered.headline).toBe("Duplicate engine name: FooEngine");
    expect(rendered.tryInstead).toBe("Reuse the existing FooEngine from src/engines/ instead of creating a duplicate.");
    expect(rendered.suggestedCommand).toBe("/dedup FooEngine");
    expect(rendered.message).toContain("[E_TEST_DUP]");
    expect(rendered.message).toContain("Try instead:");
    expect(rendered.message).toContain("Suggested command:");
    expect(rendered.variablesUsed).toEqual(["name"]);
  });

  it("unknown code → hasTemplate:'no' generic fallback (slimResponse strips false)", async () => {
    const r = await invokeHandler(devHandler, "aet_render", { code: "E_UNKNOWN_TEMPLATE_" + Date.now() });
    const rendered = (r as { rendered: { hasTemplate?: boolean | string; headline: string; tryInstead: string } }).rendered;
    // slimResponse strips `false` → hasTemplate may be undefined or absent
    // (rendered shape from engine sets hasTemplate:false; wire strips false)
    expect((rendered.hasTemplate as boolean | string | undefined) ?? false).toBe(false);
    expect(rendered.headline).toMatch(/^Error: E_UNKNOWN_TEMPLATE_/);
    expect(rendered.tryInstead).toMatch(/no template registered/i);
  });

  it("missing variable → placeholder left intact (caller can detect missing vars)", async () => {
    const r = await invokeHandler(devHandler, "aet_render", { code: "E_TEST_PARAM" });
    const rendered = (r as { rendered: { headline: string; tryInstead: string; variablesUsed: string[] } }).rendered;
    expect(rendered.headline).toBe("Missing parameter: {param}");
    expect(rendered.tryInstead).toContain("{param}");
    expect((rendered.variablesUsed as string[] | undefined) ?? []).toEqual([]);
  });

  it("VARIABILITY — 3 distinct templates render 3 distinct headlines", async () => {
    const headlines: string[] = [];
    for (const code of SEEDED_CODES) {
      const r = await invokeHandler(devHandler, "aet_render", { code });
      headlines.push((r as { rendered: { headline: string } }).rendered.headline);
    }
    expect(new Set(headlines).size).toBe(3);
  });

  it("ROUTING PROOF — wire rendered byte-equals engine-direct render() with same vars", async () => {
    const vars = { name: "BarEngine" };
    const r = await invokeHandler(devHandler, "aet_render", { code: "E_TEST_DUP", variables: vars });
    const wire = (r as { rendered: unknown }).rendered;
    const direct = actionableErrorTemplateEngine.render("E_TEST_DUP", vars);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AET — prism_dev :: aet_list_codes + size", () => {
  it("list_codes contains all 3 seeded codes + pre-existing", async () => {
    const r = await invokeHandler(devHandler, "aet_list_codes", {});
    const codes = (r as { codes?: string[] }).codes ?? [];
    for (const seeded of SEEDED_CODES) {
      expect(codes).toContain(seeded);
    }
    expect((r as { count?: number }).count).toBe(codes.length);
  });

  it("size = preexistingSize + 3 seeded (no duplicates registered)", async () => {
    const r = await invokeHandler(devHandler, "aet_size", {});
    expect((r as { size?: number }).size).toBe(preexistingSize + 3);
    expect(preexistingCodes.length).toBe(preexistingSize);
  });

  it("ROUTING PROOF — wire code set equals engine-direct listCodes()", async () => {
    const r = await invokeHandler(devHandler, "aet_list_codes", {});
    const wire = ((r as { codes?: string[] }).codes ?? []).slice().sort();
    const direct = actionableErrorTemplateEngine.listCodes().slice().sort();
    expect(wire).toEqual(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-AET — error envelope", () => {
  it("aet_has without code → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "aet_has", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("aet_render with empty code → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "aet_render", { code: "" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("aet_render variables with object value → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "aet_render", {
      code: "E_TEST_DUP", variables: { name: { wrong: "shape" } },
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
