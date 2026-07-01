/**
 * PlaybookSuggestResolutionDispatcherWiring.test.ts
 *
 * U-PB-SUGGEST-RESOLUTION — round-trip wiring proof for the two new
 * `prism_shop_practice` actions: `playbook_suggest_resolutions` (batch) and
 * `playbook_suggest_resolution` (single-pair). This invokes the dispatcher
 * end-to-end (z.enum validation + handler dispatch + engine call + JSON
 * response shape), proving the 5-surface wiring (ACTIONS tuple, handler,
 * ACTION_HANDLERS map, Zod schema, ACTION_SHOP_PRACTICE_SCHEMAS) is real.
 *
 * Follows the captured-server-tool pattern from
 * PlaybookRulesDispatcherWiring.test.ts — the mock MCP server captures the
 * registered `z.enum(ACTIONS)` schema and re-runs it on EVERY invoke, so
 * an action absent from the enum throws here rather than silently passing
 * (CLAUDE.md §RGS-TOOL-AUTOINVOKE-MS1 MockMCPServer-bypass trap).
 */
import { describe, it, expect } from "vitest";
import { registerShopPracticeDispatcher } from "../tools/dispatchers/shopPracticeDispatcher.js";

const NEW_ACTIONS = [
  "playbook_suggest_resolutions",
  "playbook_suggest_resolution",
] as const;

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
      schema.action.parse(action);  // throws if action not in enum
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

describe("U-PB-SUGGEST-RESOLUTION — round-trip wiring through prism_shop_practice", () => {
  // ── wiring proof ──────────────────────────────────────────────────────────
  it("both new actions are in the registered z.enum(ACTIONS)", () => {
    const h = makeHarness();
    for (const a of NEW_ACTIONS) {
      // z.enum().parse() echoes the value back on success
      expect(h.schema.action.parse(a)).toBe(a);
    }
  });

  it("an action NOT in the enum is rejected (proves the gate is live)", () => {
    const h = makeHarness();
    const parsed = h.schema.action.safeParse("playbook_suggest_resolution_typo");
    expect(parsed.success).toBe(false);
  });

  // ── playbook_suggest_resolutions (batch) ──────────────────────────────────
  it("playbook_suggest_resolutions returns a structurally-valid ResolutionReport", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_suggest_resolutions");
    // Dispatcher wraps the engine result in { success: true, report: {...} }
    expect(r.success).toBe(true);
    expect(typeof r.report).toBe("object");
    expect(typeof r.report.conflictCount).toBe("number");
    expect(Array.isArray(r.report.proposals)).toBe(true);
    expect(r.report.conflictCount).toBe(r.report.proposals.length);
    expect(typeof r.report.byDecision).toBe("object");
    expect(typeof r.report.byDecision.evidence).toBe("number");
    expect(typeof r.report.byDecision.severity).toBe("number");
    expect(typeof r.report.byDecision.ambiguous).toBe("number");
    expect(typeof r.report.ambiguousCount).toBe("number");
    // byDecision buckets must sum to conflictCount (invariant — survives corpus drift)
    const sum = r.report.byDecision.evidence + r.report.byDecision.severity + r.report.byDecision.ambiguous;
    expect(sum).toBe(r.report.conflictCount);
    // ambiguousCount mirrors byDecision.ambiguous
    expect(r.report.ambiguousCount).toBe(r.report.byDecision.ambiguous);
  });

  it("playbook_suggest_resolutions ignores caller-supplied params (batch takes no input)", async () => {
    const h = makeHarness();
    const r1 = await h.invoke("playbook_suggest_resolutions");
    const r2 = await h.invoke("playbook_suggest_resolutions", { irrelevant: "value", bogus: 42 });
    expect(r1.report.conflictCount).toBe(r2.report.conflictCount);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  // ── playbook_suggest_resolution (single-pair) — input validation ──────────
  it("playbook_suggest_resolution rejects missing ruleIdA/ruleIdB/parameter with concrete error", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_suggest_resolution", {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect(r.error).toContain("ruleIdA");
    expect(r.error).toContain("ruleIdB");
    expect(r.error).toContain("parameter");
  });

  it("playbook_suggest_resolution rejects invalid parameter enum value (R12: no silent coercion)", async () => {
    const h = makeHarness();
    // The schema layer rejects "not_a_real_parameter" BEFORE the handler runs
    // via the strict z.enum(CONFLICT_PARAMETER) on the flat-payload alias.
    // Reviewer B P1-1 — narrow assertion: bad input must surface as an error
    // response (no `success:true` echo would mean silent coercion, the exact
    // R12 violation this test exists to catch). The proposal field name
    // `"parameter"` appears in EVERY success response, so DO NOT use
    // blob.includes("parameter") as a disjunct — it's load-bearing on the
    // happy path and would mask a real R12 regression.
    const r = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: "RA",
      ruleIdB: "RB",
      parameter: "not_a_real_parameter",
    });
    // Must NOT be a success response (would mean silent coercion)
    expect(r.success).not.toBe(true);
    // Must carry a concrete rejection marker — either schema-layer
    // (`dispatcherError` "Validation failed") or handler-layer (`success:false`
    // with a parameter-enum allowlist).
    const blob = JSON.stringify(r).toLowerCase();
    // Schema-layer zod-v4 message: "parameter: invalid option: expected one of ..."
    // Handler-layer message:        "playbook_suggest_resolution requires conflict.{...}. parameter must be one of: ..."
    // Both are concrete + R12-honest; either passes. The proposal field name
    // "parameter" is NOT used as a marker (it appears in every success response).
    expect(blob).toMatch(/invalid option|invalid_enum_value|expected one of|must be one of|requires conflict\./);
  });

  it("playbook_suggest_resolution rejects oversized ruleIdA (length cap >256)", async () => {
    const h = makeHarness();
    const oversized = "X".repeat(300);
    const r = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: oversized,
      ruleIdB: "RB",
      parameter: "feedrate",
    });
    // Reviewer B P1-2 — tighten: must NOT be a success response, and must
    // carry a concrete length-related error marker.
    expect(r.success).not.toBe(true);
    const blob = JSON.stringify(r).toLowerCase();
    expect(blob).toMatch(/too.?big|too.?long|max.{0,20}256|≤256|validation failed/);
  });

  it("playbook_suggest_resolution rejects empty ruleIdA (min length 1)", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: "",
      ruleIdB: "RB",
      parameter: "feedrate",
    });
    // Reviewer B P1-3 — tighten: must NOT succeed, and must carry a
    // concrete min-length / required-field marker.
    expect(r.success).not.toBe(true);
    const blob = JSON.stringify(r).toLowerCase();
    expect(blob).toMatch(/too.?small|min.{0,20}1|non-empty|requires.*ruleida|validation failed/);
  });

  // ── playbook_suggest_resolution (single-pair) — happy path ────────────────
  it("playbook_suggest_resolution with stale rule ids returns ambiguous + R12 warning", async () => {
    const h = makeHarness();
    // Use ids that almost certainly aren't in the canonical corpus — the
    // R12 warning path is the documented behavior for stale input.
    const r = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: "TEST_STALE_NEVER_EXISTS_A",
      ruleIdB: "TEST_STALE_NEVER_EXISTS_B",
      parameter: "feedrate",
    });
    expect(r.success).toBe(true);
    expect(typeof r.proposal).toBe("object");
    expect(r.proposal.ruleIdA).toBe("TEST_STALE_NEVER_EXISTS_A");
    expect(r.proposal.ruleIdB).toBe("TEST_STALE_NEVER_EXISTS_B");
    expect(r.proposal.parameter).toBe("feedrate");
    expect(r.proposal.decidedBy).toBe("ambiguous");
    expect(r.proposal.winnerId).toBe(null);
    expect(r.proposal.loserId).toBe(null);
    expect(r.proposal.confidence).toBe(0);
    expect(r.proposal.ambiguous).toBe(true);
    // R12 fail-loud: warning field present, names BOTH stale ids
    expect(typeof r.proposal.warning).toBe("string");
    expect(r.proposal.warning).toContain("Neither rule found in corpus");
    expect(r.proposal.warning).toContain("TEST_STALE_NEVER_EXISTS_A");
    expect(r.proposal.warning).toContain("TEST_STALE_NEVER_EXISTS_B");
    // R12 rationale honesty — must NOT lie with "human judgment required"
    expect(r.proposal.rationale).toContain("Ambiguous —");
    expect(r.proposal.rationale.includes("human judgment required")).toBe(false);
  });

  it("playbook_suggest_resolution accepts both flat AND nested {conflict:{...}} payloads", async () => {
    const h = makeHarness();
    const flat = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: "STALE_A_FLAT",
      ruleIdB: "STALE_B_FLAT",
      parameter: "feedrate",
    });
    const nested = await h.invoke("playbook_suggest_resolution", {
      conflict: {
        ruleIdA: "STALE_A_NESTED",
        ruleIdB: "STALE_B_NESTED",
        parameter: "feedrate",
      },
    });
    expect(flat.success).toBe(true);
    expect(nested.success).toBe(true);
    expect(flat.proposal.ruleIdA).toBe("STALE_A_FLAT");
    expect(nested.proposal.ruleIdA).toBe("STALE_A_NESTED");
  });

  it("playbook_suggest_resolution accepts all 5 ConflictParameter enum values and echoes each back", async () => {
    // Reviewer B P1-4 — this test specifically exercises enum-coverage at the
    // schema + handler layers. Rule ids are intentionally stale, so the engine
    // exercises its R12 warning path (verified separately in the stale-ids
    // test above). The evidence/severity decision branches are tested through
    // PlaybookSuggestResolution.test.ts engine tests with real corpus rules.
    const h = makeHarness();
    const parameters = ["feedrate", "spindle_speed", "depth_of_cut", "width_of_cut", "coolant"];
    for (const p of parameters) {
      const r = await h.invoke("playbook_suggest_resolution", {
        ruleIdA: `TEST_${p}_A`,
        ruleIdB: `TEST_${p}_B`,
        parameter: p,
      });
      expect(r.success).toBe(true);
      expect(r.proposal.parameter).toBe(p);
    }
  });

  it("playbook_suggest_resolution accepts optional directionA/directionB without breaking", async () => {
    const h = makeHarness();
    const r = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: "DIR_A",
      ruleIdB: "DIR_B",
      parameter: "spindle_speed",
      directionA: "increase",
      directionB: "decrease",
    });
    expect(r.success).toBe(true);
    expect(r.proposal.parameter).toBe("spindle_speed");
  });

  // ── response shape conformance ────────────────────────────────────────────
  it("dispatcher wraps the result with {success, ...} consistent across both actions", async () => {
    const h = makeHarness();
    const r1 = await h.invoke("playbook_suggest_resolutions");
    const r2 = await h.invoke("playbook_suggest_resolution", {
      ruleIdA: "X",
      ruleIdB: "Y",
      parameter: "coolant",
    });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    // Different result keys per action — batch uses `report`, single uses `proposal`
    expect("report" in r1).toBe(true);
    expect("proposal" in r2).toBe(true);
  });
});
