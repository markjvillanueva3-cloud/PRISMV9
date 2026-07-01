/**
 * E2E wire test for BRIDGE-WIRING/U-BRIDGE-WIRE-TRIBAL — wires the 3 genuinely
 * unwired Tribal engines into `prism_shop_practice` as 10 new actions:
 *
 *   PlaybookRulesEngine (4):
 *     playbook_rules_query · playbook_rules_search ·
 *     playbook_rules_safety · playbook_rules_stats
 *   LatheLoRATribalAugmentationEngine (3):
 *     lathe_lora_tribal_augment · lathe_lora_tribal_find_tips ·
 *     lathe_lora_tribal_aug_stats
 *   LatheLoRATribalExtractorEngine (3):
 *     lathe_lora_tribal_extract · lathe_lora_tribal_extract_batch ·
 *     lathe_lora_tribal_extractor_stats
 *
 * Verifies (a) every action appears in both the dispatcher enum AND the
 * ACTION_HANDLERS map, (b) every schema is registered in
 * ACTION_SHOP_PRACTICE_SCHEMAS, (c) the Zod boundary rejects missing /
 * empty / bad-enum input and accepts the documented snake_case shape,
 * (d) an in-process round-trip via a fake MCP server drives each action
 * through the real z.enum → Zod → singleton path and asserts deterministic
 * response invariants (the count-equals-length identity), and (e) the wire
 * does not regress any pre-existing action.
 *
 * Follows the tribal-enrich wire-test template (shopPracticeDispatcher.
 * tribal-enrich-wire.test.ts). Engines are pre-existing singletons —
 * PlaybookRulesEngine ships a non-empty rule corpus at module load and the
 * augmentation engine ships JM-Die/Okuma tips, so round-trip invariants are
 * deterministic; the extractor engine starts empty and accumulates, so its
 * assertions are structural (count===length), never absolute counts.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";

const NEW_ACTIONS = [
  "playbook_rules_query",
  "playbook_rules_search",
  "playbook_rules_safety",
  "playbook_rules_stats",
  "lathe_lora_tribal_augment",
  "lathe_lora_tribal_find_tips",
  "lathe_lora_tribal_aug_stats",
  "lathe_lora_tribal_extract",
  "lathe_lora_tribal_extract_batch",
  "lathe_lora_tribal_extractor_stats",
] as const;

const DISPATCHER_PATH = path.resolve(
  __dirname, "..", "tools", "dispatchers", "shopPracticeDispatcher.ts",
);

// ============================================================================
// Source-grep: enum + ACTION_HANDLERS registration + lazy-import discipline
// ============================================================================

describe("tribal-bridge wire — dispatcher source registration", () => {
  it("each new action appears at least twice in shopPracticeDispatcher.ts (enum + ACTION_HANDLERS)", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    for (const a of NEW_ACTIONS) {
      // \b word-boundary match catches BOTH the quoted ACTIONS-tuple entry and
      // the bare-identifier ACTION_HANDLERS key. The trailing `_` in
      // `lathe_lora_tribal_extract_batch` is a JS word char, so \b correctly
      // distinguishes it from `lathe_lora_tribal_extract`.
      const re = new RegExp(`\\b${a}\\b`, "g");
      const occurrences = (src.match(re) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("each new action key has a handler binding in ACTION_HANDLERS", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    for (const a of NEW_ACTIONS) {
      const re = new RegExp(`^\\s*${a}:\\s*handle[A-Za-z]+,?\\s*$`, "m");
      expect(src).toMatch(re);
    }
  });

  it("dispatcher uses lazy imports for all 3 newly wired engines (no top-level static import)", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    for (const engine of [
      "PlaybookRulesEngine",
      "LatheLoRATribalAugmentationEngine",
      "LatheLoRATribalExtractorEngine",
    ]) {
      // A top-level static import defeats the lazy-load convention and slows
      // MCP cold start — every wired engine MUST be imported inside its handler.
      expect(src).not.toMatch(new RegExp(`^import[^;]*\\b${engine}\\b`, "m"));
      expect(src).toMatch(
        new RegExp(`await\\s+import\\(\\s*["'\`].*${engine}\\.js["'\`]\\s*\\)`),
      );
    }
  });

  it("dispatcher destructures the engine singletons, never instantiates new instances", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    for (const singleton of [
      "playbookRulesEngine",
      "latheLoRATribalAugmentationEngine",
      "latheLoRATribalExtractorEngine",
    ]) {
      expect(src).toMatch(new RegExp(`\\{\\s*${singleton}\\s*\\}`));
    }
    expect(src).not.toMatch(/new\s+PlaybookRulesEngine\s*\(/);
    expect(src).not.toMatch(/new\s+LatheLoRATribalAugmentationEngine\s*\(/);
    expect(src).not.toMatch(/new\s+LatheLoRATribalExtractorEngine\s*\(/);
  });

  it("ACTIONS tuple lists exactly one occurrence per new action (no accidental duplicates)", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
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

describe("tribal-bridge wire — schema map registration", () => {
  it("registers all 10 schemas in ACTION_SHOP_PRACTICE_SCHEMAS with a working safeParse", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    const map = ACTION_SHOP_PRACTICE_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const a of NEW_ACTIONS) {
      expect(typeof map[a]?.safeParse).toBe("function");
    }
  });
});

// ============================================================================
// Zod validation — happy path + failure modes + adversarial input
// ============================================================================

describe("tribal-bridge wire — Zod validation: playbook_rules_query", () => {
  it("accepts an empty object (all filters optional → whole corpus)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_query"]!.safeParse({}).success).toBe(true);
  });

  it("accepts every documented domain enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    for (const domain of ["lathe", "mill", "wedm", "general", "all"] as const) {
      expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_query"]!.safeParse({ domain }).success).toBe(true);
    }
  });

  it("accepts every documented severity_min enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    for (const severity_min of ["critical", "important", "recommended", "tip"] as const) {
      expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_query"]!.safeParse({ severity_min }).success).toBe(true);
    }
  });

  it("rejects an unknown domain enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_query"]!.safeParse({ domain: "swiss" }).success).toBe(false);
  });

  it("rejects an unknown severity_min enum value", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_query"]!.safeParse({ severity_min: "fatal" }).success).toBe(false);
  });

  it("rejects a categories array containing an empty string (adversarial)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_query"]!.safeParse({ categories: [""] }).success).toBe(false);
  });
});

describe("tribal-bridge wire — Zod validation: playbook_rules_search", () => {
  it("accepts a non-empty keyword", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_search"]!.safeParse({ keyword: "feed" }).success).toBe(true);
  });

  it("rejects a missing keyword", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_search"]!.safeParse({}).success).toBe(false);
  });

  it("rejects an empty-string keyword (min length 1)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["playbook_rules_search"]!.safeParse({ keyword: "" }).success).toBe(false);
  });
});

describe("tribal-bridge wire — Zod validation: lathe_lora_tribal_augment", () => {
  it("accepts a response + query pair", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_augment"]!.safeParse({
      response: "Use 250 SFM for 4140.", query: "turning 4140 steel",
    }).success).toBe(true);
  });

  it("rejects a missing response", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_augment"]!.safeParse({ query: "x" }).success).toBe(false);
  });

  it("rejects a missing query", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_augment"]!.safeParse({ response: "x" }).success).toBe(false);
  });

  it("rejects an empty-string response (min length 1, adversarial)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_augment"]!.safeParse({
      response: "", query: "x",
    }).success).toBe(false);
  });
});

describe("tribal-bridge wire — Zod validation: lathe_lora_tribal_extract*", () => {
  it("extract accepts text with optional provenance", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_extract"]!.safeParse({
      text: "When turning D2, reduce SFM by 20%.", author: "John", source: "operator:John",
    }).success).toBe(true);
  });

  it("extract rejects missing text", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_extract"]!.safeParse({}).success).toBe(false);
  });

  it("extract rejects an empty-string text (min length 1)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_extract"]!.safeParse({ text: "" }).success).toBe(false);
  });

  it("extract_batch accepts a non-empty array of non-empty texts", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_extract_batch"]!.safeParse({
      texts: ["When roughing, take 0.15 DOC.", "If chatter, reduce RPM."],
    }).success).toBe(true);
  });

  it("extract_batch rejects an empty array (min length 1)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_extract_batch"]!.safeParse({ texts: [] }).success).toBe(false);
  });

  it("extract_batch rejects an array containing an empty string (adversarial)", async () => {
    const { ACTION_SHOP_PRACTICE_SCHEMAS } = await import("../schemas/shopPracticeActionSchemas.js");
    expect(ACTION_SHOP_PRACTICE_SCHEMAS["lathe_lora_tribal_extract_batch"]!.safeParse({
      texts: ["valid text", ""],
    }).success).toBe(false);
  });
});

// ============================================================================
// In-process round-trip — drive the real `tool()` closure end-to-end
// ============================================================================

type MockTool = {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: { type: string; text: string }[];
  }>;
};

async function buildHandler(): Promise<MockTool["handler"]> {
  const captured: MockTool[] = [];
  const fakeServer = {
    tool(name: string, _description: string, _paramSchema: unknown, handler: MockTool["handler"]) {
      captured.push({ name, handler });
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
  // Error path: dispatcherError(...) returns a RAW `{success:false,error,...}` object.
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

describe("tribal-bridge wire — round-trip: PlaybookRulesEngine", () => {
  it("playbook_rules_query with no filters returns the whole corpus; count===rules.length and corpus is non-empty", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "playbook_rules_query", params: {} }));
    expect(Array.isArray(body.rules)).toBe(true);
    expect(body.count).toBe((body.rules as unknown[]).length);
    // PlaybookRulesEngine merges MachiningPlaybookEngine rules + DOMAIN_RULES at
    // module load — the corpus is never empty.
    expect(body.count as number).toBeGreaterThan(0);
  });

  it("playbook_rules_query honours the domain filter — every returned rule carries the requested domain (4-domain variability)", async () => {
    const handler = await buildHandler();
    for (const domain of ["lathe", "mill", "wedm", "general"] as const) {
      const body = parseResponse(await handler({ action: "playbook_rules_query", params: { domain } }));
      const rules = body.rules as Array<{ domain: string }>;
      for (const r of rules) expect(r.domain).toBe(domain);
    }
  });

  it("playbook_rules_query severity_min='critical' is a strict subset of severity_min='tip'", async () => {
    const handler = await buildHandler();
    const crit = parseResponse(await handler({ action: "playbook_rules_query", params: { severity_min: "critical" } }));
    const all = parseResponse(await handler({ action: "playbook_rules_query", params: { severity_min: "tip" } }));
    // severity_min is a ceiling: 'critical' keeps only critical rules, 'tip'
    // keeps every severity — so the critical set can never exceed the tip set.
    expect(crit.count as number).toBeLessThanOrEqual(all.count as number);
  });

  it("playbook_rules_search returns { keyword, count, rules } with count===rules.length", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "playbook_rules_search", params: { keyword: "feed" } }));
    expect(body.keyword).toBe("feed");
    expect(Array.isArray(body.rules)).toBe(true);
    expect(body.count).toBe((body.rules as unknown[]).length);
  });

  it("playbook_rules_safety returns only safety / anti_pattern / critical rules", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "playbook_rules_safety", params: {} }));
    const rules = body.safety_rules as Array<{ category: string; severity: string }>;
    expect(Array.isArray(rules)).toBe(true);
    expect(body.count).toBe(rules.length);
    for (const r of rules) {
      expect(
        r.category === "safety" || r.category === "anti_pattern" || r.severity === "critical",
      ).toBe(true);
    }
  });

  it("playbook_rules_stats returns stats with a positive total and a 4-domain coverage report", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "playbook_rules_stats", params: {} }));
    const stats = body.stats as { total: number; byDomain: Record<string, number> };
    const coverage = body.coverage as Array<{ domain: string; target: number; actual: number }>;
    expect(stats.total).toBeGreaterThan(0);
    // stats.total must equal the sum of the per-domain counts — proves the
    // engine classified every rule into exactly one domain bucket.
    const domainSum = Object.values(stats.byDomain).reduce((a, b) => a + b, 0);
    expect(domainSum).toBe(stats.total);
    expect(coverage.length).toBe(4);
  });
});

describe("tribal-bridge wire — round-trip: LatheLoRATribalAugmentationEngine", () => {
  it("lathe_lora_tribal_augment returns an AugmentationResult that preserves the original response", async () => {
    const handler = await buildHandler();
    const response = "For D2 tool steel turning, run 180 SFM.";
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_augment",
      params: { response, query: "D2 tool steel turning" },
    }));
    expect(body.original_response).toBe(response);
    expect(typeof body.augmented_response).toBe("string");
    // The augmented response is the original plus appended tribal content —
    // it must always contain the original verbatim.
    expect((body.augmented_response as string)).toContain(response);
    expect(Array.isArray(body.tips_applied)).toBe(true);
    expect(Array.isArray(body.rules_triggered)).toBe(true);
    expect(Array.isArray(body.warnings)).toBe(true);
    expect(typeof body.confidence_boost).toBe("number");
  });

  it("lathe_lora_tribal_find_tips returns { count, matches } with count===matches.length", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_find_tips",
      params: { response: "Roughing a cold heading die.", query: "die roughing deflection" },
    }));
    expect(Array.isArray(body.matches)).toBe(true);
    expect(body.count).toBe((body.matches as unknown[]).length);
  });

  it("lathe_lora_tribal_aug_stats returns stats with numeric tip/rule totals", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "lathe_lora_tribal_aug_stats", params: {} }));
    const stats = body.stats as { total_tips: number; total_rules: number };
    expect(typeof stats.total_tips).toBe("number");
    expect(typeof stats.total_rules).toBe("number");
    expect(stats.total_tips).toBeGreaterThanOrEqual(0);
  });

  it("lathe_lora_tribal_augment tolerates a very long response without crashing (adversarial)", async () => {
    const handler = await buildHandler();
    const longResponse = "Turning 4140. ".repeat(2000);
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_augment",
      params: { response: longResponse, query: "4140" },
    }));
    expect(body.original_response).toBe(longResponse);
    expect(typeof body.augmented_response).toBe("string");
  });
});

describe("tribal-bridge wire — round-trip: LatheLoRATribalExtractorEngine", () => {
  it("lathe_lora_tribal_extract returns { extracted, tip } for a well-formed operator note", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_extract",
      params: {
        text: "When turning hardened D2, reduce SFM by 20% and use heavy flood coolant.",
        author: "Tester", source: "operator:Tester",
      },
    }));
    expect(typeof body.extracted).toBe("boolean");
    if (body.extracted) {
      const tip = body.tip as { condition: string; recommendation: string; confidence: number };
      expect(typeof tip.condition).toBe("string");
      expect(typeof tip.recommendation).toBe("string");
      expect(tip.confidence).toBeGreaterThanOrEqual(0);
    } else {
      expect(body.tip).toBeNull();
    }
  });

  it("lathe_lora_tribal_extract returns extracted:false (not a crash) for low-signal junk text (adversarial)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_extract",
      params: { text: "." },
    }));
    // A single-char input cannot meet the min-confidence bar — the engine must
    // return a structured {extracted:false, tip:null}, never throw.
    expect(body.extracted).toBe(false);
    expect(body.tip).toBeNull();
  });

  it("lathe_lora_tribal_extract_batch returns { input_count, extracted_count, tips } with the documented invariants", async () => {
    const handler = await buildHandler();
    const texts = [
      "When roughing slender dies, take 0.150 DOC max to avoid deflection.",
      "If chatter appears, reduce RPM and increase feed.",
      "zzz",
    ];
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_extract_batch",
      params: { texts },
    }));
    expect(body.input_count).toBe(texts.length);
    expect(body.extracted_count).toBe((body.tips as unknown[]).length);
    // Extraction filters on confidence — the extracted count can never exceed
    // the number of input texts.
    expect(body.extracted_count as number).toBeLessThanOrEqual(texts.length);
  });

  it("lathe_lora_tribal_extractor_stats returns the documented stats shape + a string summary", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "lathe_lora_tribal_extractor_stats", params: {} }));
    // ExtractorEngine.getStats() shape: { total_tips, avg_confidence,
    // high_confidence_count, category_distribution } — pin every field so a
    // future rename of the engine return type fails THIS test.
    const stats = body.stats as {
      total_tips: number;
      avg_confidence: number;
      high_confidence_count: number;
      category_distribution: Record<string, number>;
    };
    expect(typeof stats.total_tips).toBe("number");
    expect(stats.total_tips).toBeGreaterThanOrEqual(0);
    expect(typeof stats.avg_confidence).toBe("number");
    expect(typeof stats.high_confidence_count).toBe("number");
    expect(typeof stats.category_distribution).toBe("object");
    expect(typeof body.summary).toBe("string");
    // getSummary() is derived from getStats() — it must echo the tip count.
    expect(body.summary as string).toContain(`Total Tips: ${stats.total_tips}`);
  });
});

// ============================================================================
// Zod-boundary round-trip — bad params must surface as dispatcherError
// ============================================================================

describe("tribal-bridge wire — Zod boundary rejects bad params end-to-end", () => {
  it("playbook_rules_search with no keyword surfaces a dispatcherError naming the failing field", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "playbook_rules_search", params: {} }));
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
    expect(body.error as string).toMatch(/keyword/i);
    expect(body.dispatcher).toBe("prism_shop_practice");
    expect(body.action).toBe("playbook_rules_search");
  });

  it("lathe_lora_tribal_augment with a missing query surfaces a dispatcherError", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_augment", params: { response: "x" },
    }));
    expect(body.success).toBe(false);
    expect(body.error as string).toMatch(/query/i);
  });

  it("lathe_lora_tribal_extract_batch with an empty array surfaces a dispatcherError", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "lathe_lora_tribal_extract_batch", params: { texts: [] },
    }));
    expect(body.success).toBe(false);
    expect(body.error as string).toMatch(/texts/i);
  });

  it("playbook_rules_query with an unknown domain enum surfaces a dispatcherError", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "playbook_rules_query", params: { domain: "swiss" },
    }));
    expect(body.success).toBe(false);
    expect(body.error as string).toMatch(/domain|swiss|Invalid|option/i);
  });
});

// ============================================================================
// Anti-regression — the wire must not break a pre-existing action
// ============================================================================

describe("tribal-bridge wire — anti-regression on a pre-existing action", () => {
  it("the same handler still routes 'tribal_enrich_check' to the live coordinator engine", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "tribal_enrich_check", params: { process_type: "turning" },
    }));
    expect(typeof body.has_knowledge).toBe("boolean");
    expect(body.process_type).toBe("turning");
  });

  it("ACTIONS count is non-decreasing — the wire only adds, never removes", async () => {
    const src = await fsp.readFile(DISPATCHER_PATH, "utf8");
    const actionsBlock = src.slice(
      src.indexOf("const ACTIONS = ["),
      src.indexOf("] as const;"),
    );
    const total = (actionsBlock.match(/"[a-z_]+"/g) || []).length;
    // 23 pre-existing actions + 10 newly wired = 33 minimum.
    expect(total).toBeGreaterThanOrEqual(33);
  });
});
