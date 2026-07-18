/**
 * PlaybookRulesDispatcherWiring.test.ts
 *
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-TRIBAL — wiring-gate test for the 7
 * `playbook_rules_*` actions added to the `prism_knowledge` dispatcher.
 *
 * PlaybookRulesEngine (133KB) was the largest single UNWIRED engine — built,
 * 500+ domain-tagged machining rules, but reachable by no dispatcher. This
 * suite proves the wiring is real:
 *
 *  - It invokes THROUGH the dispatcher handler (not the engine singleton).
 *  - The mock MCP server captures the registered `z.enum(ACTIONS)` schema and
 *    RE-RUNS it before every call — so a `playbook_rules_*` action missing
 *    from the enum fails HERE rather than silently passing (the documented
 *    MockMCPServer-bypass trap, CLAUDE.md §RGS-TOOL-AUTOINVOKE-MS1).
 *  - Every assertion checks concrete behaviour (rule counts, domain/category/
 *    severity invariants, exact result shapes) — no presence-only stubs.
 *  - Coverage: happy path per machine domain + ≥3 failure modes + ≥4
 *    adversarial inputs.
 *
 * @milestone FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-TRIBAL
 */

import { describe, it, expect } from "vitest";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";
import { playbookRulesEngine } from "../engines/PlaybookRulesEngine.js";

const PLAYBOOK_ACTIONS = [
  "playbook_rules_query",
  "playbook_rules_stats",
  "playbook_rules_coverage",
  "playbook_rules_search",
  "playbook_rules_by_category",
  "playbook_rules_safety",
  "playbook_rules_get",
] as const;

/**
 * Mock MCP server that captures the tool's input schema AND handler, then
 * re-runs the captured `z.enum(ACTIONS)` schema on every invocation — so an
 * action absent from the dispatcher enum throws here.
 */
function makeHarness() {
  let captured: { schema: any; handler: any } | null = null;
  const server = {
    tool(_name: string, _desc: string, schema: any, handler: any) {
      captured = { schema, handler };
    },
  };
  registerKnowledgeDispatcher(server);
  if (!captured) throw new Error("registerKnowledgeDispatcher registered no tool");
  const { schema, handler } = captured;

  return {
    schema,
    /** Invoke exactly as the MCP SDK would: enum-validate, then run handler. */
    async invoke(action: string, params: Record<string, unknown> = {}) {
      schema.action.parse(action); // wiring proof — throws if not in enum
      const res = await handler({ action, params });
      const text = res?.content?.[0]?.text;
      if (typeof text === "string") {
        try {
          return JSON.parse(text);
        } catch {
          return { _text: text };
        }
      }
      return { _raw: res };
    },
  };
}

/** Lowercased JSON blob of any result — for substring assertions on errors. */
const blob = (r: unknown) => JSON.stringify(r).toLowerCase();

describe("U-WIRE-BACKLOG-TRIBAL — PlaybookRulesEngine wired into prism_knowledge", () => {
  // ── wiring proof ──────────────────────────────────────────────────────────
  it("all 7 playbook_rules_* actions are present in the registered z.enum(ACTIONS)", () => {
    const h = makeHarness();
    for (const a of PLAYBOOK_ACTIONS) {
      // z.enum().parse() echoes the value back on success — assert that exact echo.
      expect(h.schema.action.parse(a)).toBe(a);
    }
  });

  it("an action NOT in the enum is rejected (proves the gate is live, not bypassed)", () => {
    const h = makeHarness();
    const parsed = h.schema.action.safeParse("playbook_rules_does_not_exist");
    expect(parsed.success).toBe(false);
  });

  // ── playbook_rules_stats — happy path, cross-checked against the engine ────
  it("playbook_rules_stats returns real counts that match the engine and sum correctly", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_stats");
    const engineStats = playbookRulesEngine.getStats();
    expect(r.total).toBe(engineStats.total);
    expect(r.total).toBeGreaterThan(0);
    expect(r.byDomain.lathe + r.byDomain.mill + r.byDomain.wedm + r.byDomain.general).toBe(r.total);
    expect(r.bySeverity.critical).toBeGreaterThan(0);
  });

  // ── playbook_rules_query — no filter + per-domain variability ──────────────
  it("playbook_rules_query with no filter returns every rule", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_query");
    expect(r.count).toBe(playbookRulesEngine.getStats().total);
    expect(Array.isArray(r.rules)).toBe(true);
    expect(r.rules.length).toBe(r.count);
  });

  it.each(["lathe", "mill", "wedm", "general"])(
    "playbook_rules_query domain=%s returns only that domain's rules",
    async (domain) => {
      const h = makeHarness();
      const r = await h.invoke("playbook_rules_query", { domain });
      expect(r.count).toBeGreaterThan(0);
      expect(r.count).toBeLessThanOrEqual(playbookRulesEngine.getStats().total);
      for (const rule of r.rules) expect(rule.domain).toBe(domain);
    },
  );

  it("playbook_rules_query severity_min=critical returns only critical rules", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_query", { severity_min: "critical" });
    expect(r.count).toBeGreaterThan(0);
    for (const rule of r.rules) expect(rule.severity).toBe("critical");
  });

  it("playbook_rules_query severity_min=tip (lowest severity) returns the full set", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_query", { severity_min: "tip" });
    expect(r.count).toBe(playbookRulesEngine.getStats().total);
  });

  // ── playbook_rules_coverage ───────────────────────────────────────────────
  it("playbook_rules_coverage reports 4 domains with a consistent actual+gap=target", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_coverage");
    expect(Array.isArray(r.coverage)).toBe(true);
    expect(r.coverage.length).toBe(4);
    expect(r.coverage.map((c: { domain: string }) => c.domain).sort()).toEqual([
      "general",
      "lathe",
      "mill",
      "wedm",
    ]);
    for (const c of r.coverage) {
      expect(typeof c.target).toBe("number");
      expect(typeof c.actual).toBe("number");
      expect(c.actual + c.gap).toBe(c.target);
    }
  });

  // ── playbook_rules_search ─────────────────────────────────────────────────
  it("playbook_rules_search matches the keyword against rule text", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_search", { keyword: "coolant" });
    expect(r.count).toBeGreaterThan(0);
    for (const rule of r.rules) {
      const hay = `${rule.title} ${rule.rule} ${rule.reasoning} ${rule.category}`.toLowerCase();
      expect(hay).toContain("coolant");
    }
  });

  // ── playbook_rules_by_category ────────────────────────────────────────────
  it("playbook_rules_by_category returns only rules in that category", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_by_category", { category: "safety" });
    expect(r.count).toBeGreaterThan(0);
    for (const rule of r.rules) expect(rule.category).toBe("safety");
  });

  // ── playbook_rules_safety ─────────────────────────────────────────────────
  it("playbook_rules_safety returns safety / anti_pattern / critical-severity rules", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_safety");
    expect(r.count).toBeGreaterThan(0);
    for (const rule of r.rules) {
      const ok =
        rule.category === "safety" ||
        rule.category === "anti_pattern" ||
        rule.severity === "critical";
      expect(ok).toBe(true);
    }
  });

  // ── playbook_rules_get — happy path (id discovered at runtime) ────────────
  it("playbook_rules_get retrieves a rule by its real id with full structure", async () => {
    const h = makeHarness();
    const all = await h.invoke("playbook_rules_query");
    const knownId = all.rules[0].id;
    expect(typeof knownId).toBe("string");
    const r = await h.invoke("playbook_rules_get", { id: knownId });
    expect(r.rule.id).toBe(knownId);
    expect(typeof r.rule.category).toBe("string");
    expect(typeof r.rule.severity).toBe("string");
    expect(typeof r.rule.domain).toBe("string");
  });

  // ── FAILURE MODE 1 — unknown rule id ──────────────────────────────────────
  it("playbook_rules_get on an unknown id returns a 'not found' error (rule:null elided by slimResponse)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_get", { id: "DEFINITELY-NOT-A-RULE-9999" });
    // The handler returns { rule: null, error }; the dispatcher's slimResponse
    // strips the null field for token efficiency — the consumer sees { error }.
    expect(r).toEqual({ error: "rule not found: DEFINITELY-NOT-A-RULE-9999" });
  });

  // ── FAILURE MODE 2 — empty keyword rejected by the action schema ──────────
  it("playbook_rules_search with an empty keyword is rejected by the schema (min 1)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_search", { keyword: "" });
    expect(blob(r)).toContain("invalid");
  });

  // ── FAILURE MODE 3 — unknown category, fail-soft empty result ─────────────
  it("playbook_rules_by_category with an unknown category returns count 0 (empty rules[] elided by slimResponse)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_by_category", { category: "not_a_real_category" });
    // Handler returns { rules: [], count: 0 }; slimResponse elides the empty array.
    expect(r).toEqual({ count: 0 });
  });

  // ── ADVERSARIAL 1 — non-array `categories` rejected by the schema ─────────
  it("playbook_rules_query with a string `categories` is rejected (schema enforces array)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_query", { categories: "safety" });
    expect(blob(r)).toContain("invalid");
  });

  // ── ADVERSARIAL 2 — non-string `id` rejected by the schema ────────────────
  it("playbook_rules_get with a numeric id is rejected (schema enforces string)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_get", { id: 12345 });
    expect(blob(r)).toContain("invalid");
  });

  // ── ADVERSARIAL 3 — whitespace id passes min(1) but resolves to no rule ───
  it("playbook_rules_get with a whitespace-only id resolves to a 'not found' error without crashing", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_get", { id: "   " });
    // "   " passes the schema's min(1) but matches no rule id; slimResponse
    // elides the rule:null field, leaving only the error.
    expect(Object.keys(r)).toEqual(["error"]);
    expect(r.error).toContain("rule not found");
  });

  // ── ADVERSARIAL 4 — keyword that matches nothing → empty, not an error ────
  it("playbook_rules_search with a no-match keyword returns count 0 (empty rules[] elided by slimResponse)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_rules_search", { keyword: "zzqx_nonexistent_keyword_qx" });
    // Handler returns { rules: [], count: 0 }; slimResponse elides the empty array.
    expect(r).toEqual({ count: 0 });
  });
});
