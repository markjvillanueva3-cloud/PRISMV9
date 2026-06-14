/**
 * PlaybookRelatedGraphDispatcherWiring.test.ts
 *
 * U-PB-RELATED-GRAPH — round-trip wiring proof for the new
 * `prism_shop_practice` action `playbook_related_graph`. Invokes the
 * dispatcher end-to-end (z.enum validation + schema-layer rejection
 * + handler dispatch + engine call + JSON response shape).
 *
 * Mirrors the captured-server-tool pattern from
 * PlaybookSuggestResolutionDispatcherWiring.test.ts.
 */
import { describe, it, expect } from "vitest";
import { registerShopPracticeDispatcher } from "../tools/dispatchers/shopPracticeDispatcher.js";

function makeHarness() {
  let captured: { schema: any; handler: any } | null = null;
  const server = {
    tool(_name: string, _desc: string, schema: any, handler: any) {
      captured = { schema, handler };
    },
  };
  registerShopPracticeDispatcher(server);
  if (!captured) throw new Error("registerShopPracticeDispatcher registered no tool");
  const { schema, handler } = captured;
  return {
    schema,
    async invoke(action: string, params: Record<string, unknown> = {}) {
      schema.action.parse(action);  // wiring proof — throws if not in enum
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

describe("U-PB-RELATED-GRAPH — round-trip wiring through prism_shop_practice", () => {
  // ── wiring proof ──────────────────────────────────────────────────────────
  it("playbook_related_graph is in the registered z.enum(ACTIONS)", () => {
    const h = makeHarness();
    expect(h.schema.action.parse("playbook_related_graph")).toBe("playbook_related_graph");
  });

  it("typo'd action variant is rejected (proves enum gate is live)", () => {
    const h = makeHarness();
    const parsed = h.schema.action.safeParse("playbook_related_graf");
    expect(parsed.success).toBe(false);
  });

  // ── input validation ─────────────────────────────────────────────────────
  it("rejects missing ruleId with concrete error", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", {});
    // Schema layer rejects (ruleId required) OR handler asBoundedString returns null.
    expect(r.success).not.toBe(true);
    const blob = JSON.stringify(r).toLowerCase();
    // zod-v4 actual message: "ruleid: invalid input: expected string, received undefined"
    // handler-layer fallback: "playbook_related_graph requires ruleid..."
    expect(blob).toMatch(/invalid input|invalid_type|expected string|received undefined|playbook_related_graph requires/);
  });

  it("rejects empty ruleId (min length 1)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "" });
    expect(r.success).not.toBe(true);
    const blob = JSON.stringify(r).toLowerCase();
    expect(blob).toMatch(/too.?small|min|non-empty|playbook_related_graph requires/);
  });

  it("rejects oversized ruleId (>256 chars)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "X".repeat(300) });
    expect(r.success).not.toBe(true);
    const blob = JSON.stringify(r).toLowerCase();
    expect(blob).toMatch(/too.?big|too.?long|max.{0,20}256|≤256|validation/);
  });

  it("rejects maxDepth out-of-bounds (negative)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001", maxDepth: -1 });
    // Schema-layer zod min(0) rejection
    expect(r.success).not.toBe(true);
  });

  it("rejects maxDepth out-of-bounds (>10)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001", maxDepth: 11 });
    expect(r.success).not.toBe(true);
  });

  it("rejects maxDepth non-integer (fractional)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001", maxDepth: 1.5 });
    // Schema zod int() rejects fractional values
    expect(r.success).not.toBe(true);
  });

  // ── happy path on real corpus rule ───────────────────────────────────────
  it("returns a structurally-valid report for a real corpus rule", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001" });
    expect(r.success).toBe(true);
    expect(typeof r.report).toBe("object");
    expect(r.report.rootId).toBe("SEQ-001");
    expect(r.report.maxDepth).toBe(2);  // default
    expect(Array.isArray(r.report.nodes)).toBe(true);
    expect(Array.isArray(r.report.edges)).toBe(true);
    expect(Array.isArray(r.report.unresolvedRefs)).toBe(true);
    expect(Array.isArray(r.report.cycleEdges)).toBe(true);
    expect(typeof r.report.truncated).toBe("boolean");
    // Invariant: nodes[0] is always the root
    expect(r.report.nodes[0].rule.id).toBe("SEQ-001");
    expect(r.report.nodes[0].hopDepth).toBe(0);
    // Invariant: all hopDepths in [0, maxDepth]
    const allValid = r.report.nodes.every(
      (n: any) => n.hopDepth >= 0 && n.hopDepth <= r.report.maxDepth,
    );
    expect(allValid).toBe(true);
  });

  it("returns success:false with concrete error when rule not in corpus", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", {
      ruleId: "NEVER_EXISTS_IN_CORPUS_X",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect(r.error).toContain("not found in corpus");
    expect(r.error).toContain("NEVER_EXISTS_IN_CORPUS_X");
  });

  it("honors caller-supplied maxDepth (echoes in report.maxDepth)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001", maxDepth: 0 });
    expect(r.success).toBe(true);
    expect(r.report.maxDepth).toBe(0);
    // depth=0 returns ONLY the root
    expect(r.report.nodes).toHaveLength(1);
    expect(r.report.edges).toEqual([]);
  });

  it("maxDepth=10 (upper bound) accepted at schema layer", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001", maxDepth: 10 });
    expect(r.success).toBe(true);
    expect(r.report.maxDepth).toBe(10);
  });

  // ── response shape conformance ───────────────────────────────────────────
  it("response shape {success:true, report:{...}} matches sibling playbook actions", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_related_graph", { ruleId: "SEQ-001", maxDepth: 1 });
    expect(r.success).toBe(true);
    // Top-level keys are exactly {success, report}
    const keys = Object.keys(r).sort();
    expect(keys).toEqual(["report", "success"]);
  });
});
