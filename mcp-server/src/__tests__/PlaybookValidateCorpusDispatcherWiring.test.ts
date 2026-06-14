/**
 * PlaybookValidateCorpusDispatcherWiring.test.ts
 *
 * U-PB-VALIDATE-CORPUS — round-trip wiring proof for the new
 * `prism_shop_practice` action `playbook_validate_corpus`. Invokes the
 * dispatcher end-to-end (z.enum validation + handler dispatch + engine
 * call + JSON response shape).
 *
 * Mirrors the captured-server-tool pattern from
 * PlaybookRelatedGraphDispatcherWiring.test.ts.
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

describe("U-PB-VALIDATE-CORPUS — round-trip wiring through prism_shop_practice", () => {
  // ── wiring proof ───────────────────────────────────────────────────────
  it("playbook_validate_corpus is in the registered z.enum(ACTIONS)", () => {
    const h = makeHarness();
    expect(h.schema.action.parse("playbook_validate_corpus")).toBe("playbook_validate_corpus");
  });

  it("typo'd action variant is rejected (proves enum gate is live)", () => {
    const h = makeHarness();
    const parsed = h.schema.action.safeParse("playbook_validate_corpu");
    expect(parsed.success).toBe(false);
  });

  // ── happy path — no inputs required ───────────────────────────────────
  it("returns success:true with a structurally-valid report on no inputs", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    expect(r.success).toBe(true);
    expect(typeof r.report).toBe("object");
    // All 7 keys present in every report
    expect(typeof r.report.totalRules).toBe("number");
    expect(Array.isArray(r.report.duplicateIds)).toBe(true);
    expect(Array.isArray(r.report.orphans)).toBe(true);
    expect(Array.isArray(r.report.unresolvedRefs)).toBe(true);
    expect(Array.isArray(r.report.cycles)).toBe(true);
    expect(Array.isArray(r.report.schemaIssues)).toBe(true);
    expect(typeof r.report.healthScore).toBe("number");
  });

  it("response shape {success:true, report:{...}} matches sibling playbook actions", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    const keys = Object.keys(r).sort();
    expect(keys).toEqual(["report", "success"]);
  });

  it("canonical corpus: totalRules > 0", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    expect(r.report.totalRules).toBeGreaterThan(0);
  });

  it("healthScore is a finite number in [0,1]", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    expect(Number.isFinite(r.report.healthScore)).toBe(true);
    expect(r.report.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.report.healthScore).toBeLessThanOrEqual(1);
  });

  // ── R12: arrays surface, never undefined ──────────────────────────────
  // Strong contract: each field MUST be an Array instance — `undefined` would
  // fail Array.isArray, blocking a class of R12 violations where an empty
  // finding gets silently elided from the response.
  it("report arrays are Array instances (R12 — empty-array NOT undefined)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    expect(r.report.duplicateIds).toBeInstanceOf(Array);
    expect(r.report.orphans).toBeInstanceOf(Array);
    expect(r.report.unresolvedRefs).toBeInstanceOf(Array);
    expect(r.report.cycles).toBeInstanceOf(Array);
    expect(r.report.schemaIssues).toBeInstanceOf(Array);
  });

  // ── purity: two calls return identical reports ────────────────────────
  it("two consecutive invocations return structurally-identical reports (pure read)", async () => {
    const h1 = makeHarness();
    const h2 = makeHarness();
    const r1 = await h1.invoke("playbook_validate_corpus", {});
    const r2 = await h2.invoke("playbook_validate_corpus", {});
    expect(r1.report.totalRules).toBe(r2.report.totalRules);
    expect(r1.report.healthScore).toBe(r2.report.healthScore);
    expect(JSON.stringify(r1.report.duplicateIds)).toBe(JSON.stringify(r2.report.duplicateIds));
    expect(JSON.stringify(r1.report.cycles)).toBe(JSON.stringify(r2.report.cycles));
  });

  // ── passthrough: unknown fields don't crash ───────────────────────────
  it("passthrough schema: unknown extra params are tolerated, response intact", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {
      this_field_is_unknown: 42,
      another_unknown: "string",
    });
    expect(r.success).toBe(true);
    expect(typeof r.report).toBe("object");
    // Output unchanged by extra inputs (purity)
    expect(r.report.totalRules).toBeGreaterThan(0);
  });

  // ── canonical corpus invariant: no duplicate ids ──────────────────────
  it("canonical corpus: no duplicateIds (corruption sentinel)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    expect(r.report.duplicateIds).toEqual([]);
  });

  // ── canonical corpus: schemaIssues yield rule-id strings (not '<unidentified>') ──
  it("canonical corpus: every schemaIssue entry has a non-empty rule id (if any issues)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    for (const issue of r.report.schemaIssues) {
      expect(typeof issue.id).toBe("string");
      expect(issue.id.length).toBeGreaterThan(0);
      expect(Array.isArray(issue.issues)).toBe(true);
      expect(issue.issues.length).toBeGreaterThan(0);
    }
  });

  // ── canonical corpus: every unresolvedRef pairs fromId + missingId ────
  it("canonical corpus: every unresolvedRef carries fromId + missingId (R12 pair)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_validate_corpus", {});
    for (const ref of r.report.unresolvedRefs) {
      expect(typeof ref.fromId).toBe("string");
      expect(ref.fromId.length).toBeGreaterThan(0);
      expect(typeof ref.missingId).toBe("string");
      expect(ref.missingId.length).toBeGreaterThan(0);
    }
  });
});
