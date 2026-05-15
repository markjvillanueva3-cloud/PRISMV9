/**
 * E2E wire test for OBSIDIAN-PRISM-OS-MS0/U-WIRE-TRIBAL-ENRICH —
 * TribalEnrichmentCoordinatorEngine wired into `prism_shop_practice` as
 * 5 actions:
 *   tribal_enrich · tribal_enrich_check · tribal_enrich_tips_only
 *   tribal_enrich_playbook_only · tribal_enrich_controller_only
 *
 * Verifies (a) all 5 actions appear in both the dispatcher enum AND have a
 * matching ACTION_HANDLERS entry / source case, (b) all 5 schemas exist in
 * ACTION_SHOP_PRACTICE_SCHEMAS, (c) Zod boundary correctly rejects bad enums
 * + missing required fields + negative physical quantities and accepts the
 * documented snake_case shape, (d) an in-process round-trip via a fake MCP
 * server drives every new action through the real switch → Zod → singleton
 * path and asserts deterministic response invariants — including the
 * count-equals-length identity that ties the dispatcher payload back to the
 * underlying engine arrays.
 *
 * Follows the SkillTierRegistryEngine wire template (recipe in
 * `reference_skill_tier_wire_pattern`). The EnrichmentInput is snake_case
 * end-to-end, so no snake→camel remap test is needed.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";

const NEW_ACTIONS = [
  "tribal_enrich",
  "tribal_enrich_check",
  "tribal_enrich_tips_only",
  "tribal_enrich_playbook_only",
  "tribal_enrich_controller_only",
] as const;

const DISPATCHER_PATH = path.resolve(
  __dirname, "..", "tools", "dispatchers", "shopPracticeDispatcher.ts",
);

// ============================================================================
// Source-grep: enum + ACTION_HANDLERS registration + lazy-import discipline
// ============================================================================

describe("tribal-enrich wire — dispatcher source registration", () => {
  it("each new action appears at least twice in shopPracticeDispatcher.ts (enum + ACTION_HANDLERS)", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    for (const a of NEW_ACTIONS) {
      // Word-boundary match — catches BOTH the quoted form in the ACTIONS
      // tuple (`"tribal_enrich"`) and the bare-identifier map key
      // (`tribal_enrich: handleTribalEnrich`). Unlike switch-based dispatchers
      // (like skillScriptDispatcher), shopPracticeDispatcher uses an
      // ACTION_HANDLERS object so the action name appears unquoted at the
      // call-site. \b correctly excludes `tribal_enrich_check` from matching
      // `tribal_enrich` (the trailing `_` is a JS word char, so \b is absent).
      const re = new RegExp(`\\b${a}\\b`, "g");
      const occurrences = (src.match(re) || []).length;
      // ≥2: once in the ACTIONS tuple, once as the ACTION_HANDLERS key — proves
      // we didn't add the enum entry without wiring the route, or vice-versa.
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("each new action key has a handler binding in ACTION_HANDLERS", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    for (const a of NEW_ACTIONS) {
      // Loose match: `<action>: handle<Anything>`. Trailing comma is normal.
      const re = new RegExp(`^\\s*${a}:\\s*handle[A-Za-z]+,?\\s*$`, "m");
      expect(src).toMatch(re);
    }
  });

  it("dispatcher uses a lazy import for TribalEnrichmentCoordinatorEngine (no top-level static import)", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    // Top-level static import would defeat the lazy-load convention and slow
    // MCP cold start — every wired engine MUST be imported inside its handler.
    expect(src).not.toMatch(/^import[^;]*TribalEnrichmentCoordinatorEngine/m);
    expect(src).toMatch(/await\s+import\(\s*["'`].*TribalEnrichmentCoordinatorEngine\.js["'`]\s*\)/);
  });

  it("dispatcher destructures the singleton, never instantiates a new instance", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    expect(src).toMatch(/\{\s*tribalEnrichmentCoordinatorEngine\s*\}/);
    expect(src).not.toMatch(/new\s+TribalEnrichmentCoordinatorEngine\s*\(/);
  });

  it("ACTIONS tuple lists exactly one occurrence per new action (no accidental duplicates)", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    // Scope to the ACTIONS literal so we don't count occurrences inside handler
    // bodies. Slice from the first `const ACTIONS = [` through the closing `]`.
    const actionsBlock = src.slice(
      src.indexOf("const ACTIONS = ["),
      src.indexOf("] as const;"),
    );
    for (const a of NEW_ACTIONS) {
      const occurrences = actionsBlock.split(`"${a}"`).length - 1;
      expect(occurrences).toBe(1);
    }
  });
});

// ============================================================================
// Schema map registration
// ============================================================================

describe("tribal-enrich wire — schema map registration", () => {
  it("registers all 5 schemas in ACTION_SHOP_PRACTICE_SCHEMAS with a working safeParse", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const map = ACTION_SHOP_PRACTICE_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const a of NEW_ACTIONS) {
      expect(typeof map[a]?.safeParse).toBe("function");
    }
  });
});

// ============================================================================
// Zod validation — tribal_enrich (and shared input shape used by 4 of 5 actions)
// ============================================================================

describe("tribal-enrich wire — Zod validation: tribal_enrich", () => {
  it("accepts the bare minimum (process_type only)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({ process_type: "grinding" });
    expect(r.success).toBe(true);
  });

  it("accepts a fully-populated input", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({
      process_type: "wire_edm",
      material: "D2",
      controller: "fanuc",
      thickness_mm: 10,
      tolerance_mm: 0.01,
      surface_finish_Ra_um: 0.8,
      is_thin_wall: true,
      hardness_hrc: 58,
    });
    expect(r.success).toBe(true);
  });

  it("rejects when process_type is missing", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects an unknown process_type enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({ process_type: "laser_cutting" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown controller enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({
      process_type: "milling",
      controller: "yaskawa",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a negative thickness_mm (positive constraint)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({
      process_type: "milling",
      thickness_mm: -1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects a negative tolerance_mm (positive constraint)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({
      process_type: "milling",
      tolerance_mm: -0.05,
    });
    expect(r.success).toBe(false);
  });

  it("passes extra fields through (.passthrough()) instead of erroring", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({
      process_type: "milling",
      future_field_42: "ignored",
    });
    expect(r.success).toBe(true);
  });

  it("accepts every documented ProcessType enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    for (const process_type of ["wire_edm", "sinker_edm", "milling", "turning", "grinding", "multi_axis"] as const) {
      const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({ process_type });
      expect(r.success).toBe(true);
    }
  });

  it("accepts every documented Controller enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    for (const controller of [
      "fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles",
      "siemens", "haas", "okuma", "mazak",
    ] as const) {
      const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich"]!.safeParse({
        process_type: "wire_edm",
        controller,
      });
      expect(r.success).toBe(true);
    }
  });
});

// ============================================================================
// Zod validation — tribal_enrich_controller_only (controller is required)
// ============================================================================

describe("tribal-enrich wire — Zod validation: tribal_enrich_controller_only", () => {
  it("rejects when controller is missing", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich_controller_only"]!.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects an unknown controller enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich_controller_only"]!.safeParse({ controller: "yaskawa" });
    expect(r.success).toBe(false);
  });

  it("accepts a known controller", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const r = ACTION_SHOP_PRACTICE_SCHEMAS["tribal_enrich_controller_only"]!.safeParse({ controller: "mazak" });
    expect(r.success).toBe(true);
  });
});

// ============================================================================
// In-process round-trip — drive the real `tool()` closure end-to-end
// ============================================================================

type MockTool = {
  name: string;
  description: string;
  paramSchema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: { type: string; text: string }[];
  }>;
};

async function buildHandler(): Promise<MockTool["handler"]> {
  const captured: MockTool[] = [];
  const fakeServer = {
    tool(name: string, description: string, paramSchema: unknown, handler: MockTool["handler"]) {
      captured.push({ name, description, paramSchema, handler });
    },
  };
  const { registerShopPracticeDispatcher } = await import("../tools/dispatchers/shopPracticeDispatcher.js");
  registerShopPracticeDispatcher(
    fakeServer as unknown as Parameters<typeof registerShopPracticeDispatcher>[0],
  );
  const tool = captured.find((t) => t.name === "prism_shop_practice");
  if (!tool) throw new Error("prism_shop_practice not registered by dispatcher");
  return tool.handler;
}

function parseResponse(out: unknown): Record<string, unknown> {
  // Success path: MCP content envelope `{content:[{type,text:JSON.stringify(payload)}]}`.
  // Error path: `dispatcherError(...)` returns a RAW `{success:false,error,...}`
  // object (NOT wrapped in content[]). Handle both shapes so Zod-rejected
  // round-trips are observable from the test, not silently masked.
  if (out !== null && typeof out === "object") {
    const o = out as Record<string, unknown>;
    if (Array.isArray(o.content)) {
      const text = (o.content as { type: string; text: string }[])[0]?.text;
      if (typeof text === "string") return JSON.parse(text) as Record<string, unknown>;
    }
    return o;
  }
  throw new Error("unexpected response shape");
}

describe("tribal-enrich wire — in-process dispatcher round-trip", () => {
  it("tribal_enrich routes to the live engine and the merged_advisory carries the uppercased Process line", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich",
      params: { process_type: "milling", material: "4140 steel" },
    });
    const body = parseResponse(out);
    expect(Array.isArray(body.tribal_tips)).toBe(true);
    expect(Array.isArray(body.playbook_rules)).toBe(true);
    expect(Array.isArray(body.controller_tips)).toBe(true);
    expect(typeof body.merged_advisory).toBe("string");
    expect(Array.isArray(body.knowledge_sources)).toBe(true);
    // merged_advisory is deterministic — the dispatcher must have forwarded
    // process_type all the way to buildMergedAdvisory() in the engine.
    expect((body.merged_advisory as string)).toContain("Process: MILLING");
    expect((body.merged_advisory as string)).toContain("Material: 4140 steel");
  });

  it("tribal_enrich knowledge_sources.length equals the count of non-empty result arrays (round-trip invariant)", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich",
      params: { process_type: "turning", material: "stainless 316", controller: "okuma" },
    });
    const body = parseResponse(out);
    const tips = body.tribal_tips as unknown[];
    const rules = body.playbook_rules as unknown[];
    const ctrlTips = body.controller_tips as unknown[];
    const sources = body.knowledge_sources as unknown[];
    const expected =
      (tips.length > 0 ? 1 : 0) +
      (rules.length > 0 ? 1 : 0) +
      (ctrlTips.length > 0 ? 1 : 0);
    expect(sources.length).toBe(expected);
  });

  it("tribal_enrich rejects via the Zod boundary when process_type is missing AND the user-facing error names the failing field", async () => {
    const handler = await buildHandler();
    const out = await handler({ action: "tribal_enrich", params: {} });
    const body = parseResponse(out);
    // dispatcherError shape: { success:false, error, action, dispatcher, ... }
    // The `error` field MUST carry the Zod issue text (e.g. mentioning
    // `process_type`) — NOT the dispatcher name string. A previous bug in this
    // file passed the dispatcher name in the `error` arg slot and the Zod
    // diagnostics into the `dispatcher` slot, making every validation failure
    // surface as `error: "prism_shop_practice"` (opaque to callers). Pin the
    // field-name substring here so any future regression of the argument
    // order fails THIS test, not silently in production.
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
    expect(body.error as string).toMatch(/process_type/i);
    expect(body.dispatcher).toBe("prism_shop_practice");
    expect(body.action).toBe("tribal_enrich");
  });

  it("tribal_enrich rejects an unknown process_type at the Zod boundary AND the error mentions the bad value", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich",
      params: { process_type: "laser_cutting" },
    });
    const body = parseResponse(out);
    expect(body.success).toBe(false);
    // The Zod issue should mention either the field name, the bad value, or
    // an "Invalid"/"option" keyword — anything proving the issue text reached
    // the user-facing `error` field (vs. the swallowed-dispatcher-name bug).
    expect(body.error as string).toMatch(/process_type|laser_cutting|Invalid|option/i);
  });

  it("tribal_enrich_check returns { has_knowledge: boolean, process_type } that echoes the requested process_type", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich_check",
      params: { process_type: "wire_edm", controller: "fanuc" },
    });
    const body = parseResponse(out);
    expect(typeof body.has_knowledge).toBe("boolean");
    expect(body.process_type).toBe("wire_edm");
  });

  it("tribal_enrich_tips_only returns { count, tips } and count is identical to tips.length", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich_tips_only",
      params: { process_type: "milling", material: "aluminum 6061" },
    });
    const body = parseResponse(out);
    expect(Array.isArray(body.tips)).toBe(true);
    expect(body.count).toBe((body.tips as unknown[]).length);
  });

  it("tribal_enrich_playbook_only returns { count, rules } and count is identical to rules.length", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich_playbook_only",
      params: { process_type: "turning", material: "stainless 316" },
    });
    const body = parseResponse(out);
    expect(Array.isArray(body.rules)).toBe(true);
    expect(body.count).toBe((body.rules as unknown[]).length);
  });

  it("tribal_enrich_controller_only returns { count, controller, controller_tips } and count is identical to controller_tips.length", async () => {
    const handler = await buildHandler();
    const out = await handler({
      action: "tribal_enrich_controller_only",
      params: { controller: "fanuc" },
    });
    const body = parseResponse(out);
    expect(body.controller).toBe("fanuc");
    expect(Array.isArray(body.controller_tips)).toBe(true);
    expect(body.count).toBe((body.controller_tips as unknown[]).length);
  });

  it("tribal_enrich_controller_only rejects when controller is missing AND the user-facing error names the failing field", async () => {
    const handler = await buildHandler();
    const out = await handler({ action: "tribal_enrich_controller_only", params: {} });
    const body = parseResponse(out);
    expect(body.success).toBe(false);
    // Same argument-order regression guard as the tribal_enrich case above.
    expect(body.error as string).toMatch(/controller/i);
    expect(body.dispatcher).toBe("prism_shop_practice");
  });
});

// ============================================================================
// Anti-regression — the wire must not break any of the 23 pre-existing actions
// ============================================================================

describe("tribal-enrich wire — anti-regression on a pre-existing action", () => {
  it("the same handler still routes 'tribal_search' to the live TribalKnowledgeEngine and returns the documented { count, tips } envelope", async () => {
    const handler = await buildHandler();
    const out = await handler({ action: "tribal_search", params: { query: "milling" } });
    const body = parseResponse(out);
    // Real invariant: count must equal tips.length. The dispatcher's
    // handleTribalSearch maps the engine's KnowledgeTip[] into a uniform
    // { count, tips: [{id,title,body,category,...}] } envelope; a regression
    // in the routing would either crash, hit dispatcherError(), or return a
    // shape where count and tips disagree.
    expect(typeof body.count).toBe("number");
    expect(Array.isArray(body.tips)).toBe(true);
    expect(body.count).toBe((body.tips as unknown[]).length);
  });
});
