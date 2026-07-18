/**
 * Tests for extractionPlanExecutor -- drive a blueprint/document extraction routing PLAN to consumer dispatch.
 *
 * Reference-value + invariant tests (R9 -- a test must FAIL when the gate/execution logic changes):
 *  - the SAFETY gate: a commitment consumer (quote/program/inspection/fai/cmm) NEVER auto-fires; it executes
 *    ONLY when its consumer id is in confirmedConsumers (incl. clearing a requires_confirmation route)
 *  - advisory/privacy execute by default; allowedKinds can restrict them
 *  - per-consumer error isolation: a throwing/failing dispatch is recorded, never aborts the rest
 *  - dryRun plans without calling; ineligible routes are skipped; the executor is total on a malformed plan
 *  - the mock callTool proves the executor invokes (dispatcher, action, payload) faithfully
 *
 * @since U-XRAY-EXTRACTION-PLAN-EXECUTOR (2026-06-25, slot xray)
 */
import { describe, it, expect, vi } from "vitest";
import {
  executeExtractionPlan,
  decideRouteDisposition,
  DEFAULT_EXECUTE_KINDS,
  EXTRACTION_PLAN_EXECUTION_VERSION,
  type CallToolFn,
} from "../engines/blueprint-vision/extractionPlanExecutor.js";
import type { ExtractionRoutingPlan, ConsumerRoute, ConsumerKind } from "../engines/blueprint-vision/blueprintExtractionRouter.js";

function mkRoute(over: Partial<ConsumerRoute> & { consumer: string; kind: ConsumerKind }): ConsumerRoute {
  return {
    consumer: over.consumer,
    dispatcher: over.dispatcher ?? "prism_business",
    action: over.action ?? `${over.consumer}_action`,
    kind: over.kind,
    eligible: over.eligible ?? true,
    reason: over.reason ?? "ok",
    requires_confirmation: over.requires_confirmation ?? false,
    blocking_fields: over.blocking_fields ?? 0,
    payload: over.payload ?? { k: over.consumer },
  };
}
function mkPlan(routes: ConsumerRoute[]): ExtractionRoutingPlan {
  return {
    schemaVersion: "1.0.0",
    contract_version: "1.0.0",
    routes,
    summary: { n_eligible: routes.filter((r) => r.eligible).length, n_ready: 0, n_blocked_on_confirm: 0, n_ineligible: 0, n_needs_confirm: 0 },
  };
}
/** a mock callTool that records calls and returns a success envelope (or a configured per-action result). */
function mockCallTool(behavior: Record<string, unknown | ((p: Record<string, unknown>) => unknown)> = {}) {
  return vi.fn(async (tool: string, action: string, params: Record<string, unknown>) => {
    const b = behavior[action];
    if (typeof b === "function") return (b as (p: Record<string, unknown>) => unknown)(params);
    if (b !== undefined) return b;
    return { success: true, data: { tool, action } };
  }) as unknown as CallToolFn & ReturnType<typeof vi.fn>;
}

const ADVISORY = (c: string) => mkRoute({ consumer: c, kind: "advisory", dispatcher: "prism_calc", action: `${c}_act` });
const COMMIT = (c: string, over: Partial<ConsumerRoute> = {}) => mkRoute({ consumer: c, kind: "commitment", dispatcher: "prism_business", action: `${c}_act`, ...over });
const PRIVACY = (c: string) => mkRoute({ consumer: c, kind: "privacy", dispatcher: "prism_cad", action: `${c}_act` });

describe("executeExtractionPlan — default: advisory + privacy execute, commitments do NOT", () => {
  it("fires advisory + privacy via callTool but SKIPS every commitment (no confirmation)", async () => {
    const ct = mockCallTool();
    const plan = mkPlan([ADVISORY("feature_recognize"), PRIVACY("redact"), COMMIT("quote"), COMMIT("print_to_program")]);
    const rep = await executeExtractionPlan(plan, ct);
    expect(rep.summary.executed).toBe(2); // advisory + privacy
    expect(rep.summary.needs_confirmation).toBe(2); // quote + program skipped
    // callTool was invoked ONLY for the 2 non-commitment routes
    expect((ct as any).mock.calls.length).toBe(2);
    const fired = (ct as any).mock.calls.map((c: unknown[]) => c[1]);
    expect(fired.sort()).toEqual(["feature_recognize_act", "redact_act"]);
    // commitment routes carry the actionable skip status
    expect(rep.results.find((r) => r.consumer === "quote")!.status).toBe("skipped-unconfirmed-commitment");
  });

  it("invokes callTool with the EXACT (dispatcher, action, payload) from the route", async () => {
    const ct = mockCallTool();
    const route = mkRoute({ consumer: "redact", kind: "privacy", dispatcher: "prism_cad", action: "blueprint_redact", payload: { extraction: { x: 1 } } });
    await executeExtractionPlan(mkPlan([route]), ct);
    expect((ct as any)).toHaveBeenCalledWith("prism_cad", "blueprint_redact", { extraction: { x: 1 } });
  });
});

describe("executeExtractionPlan — the commitment confirm-gate (safety)", () => {
  it("a commitment fires ONLY when its consumer id is in confirmedConsumers", async () => {
    const ct = mockCallTool();
    const plan = mkPlan([COMMIT("quote"), COMMIT("print_to_program")]);
    const rep = await executeExtractionPlan(plan, ct, { confirmedConsumers: ["quote"] });
    expect(rep.results.find((r) => r.consumer === "quote")!.status).toBe("executed");
    expect(rep.results.find((r) => r.consumer === "print_to_program")!.status).toBe("skipped-unconfirmed-commitment");
    expect((ct as any).mock.calls.map((c: unknown[]) => c[1])).toEqual(["quote_act"]); // ONLY the confirmed one fired
  });

  it("a requires_confirmation commitment STILL only fires when explicitly confirmed (the confirmation clears the below-floor fields)", async () => {
    const ct = mockCallTool();
    const route = COMMIT("inspection_plan", { requires_confirmation: true, blocking_fields: 3, dispatcher: "prism_quality" });
    // not confirmed -> skipped with the below-floor reason
    const a = await executeExtractionPlan(mkPlan([route]), ct);
    expect(a.results[0].status).toBe("skipped-unconfirmed-commitment");
    expect(a.results[0].reason).toContain("below-floor");
    expect((ct as any).mock.calls.length).toBe(0);
    // confirmed -> fires
    const b = await executeExtractionPlan(mkPlan([route]), ct, { confirmedConsumers: ["inspection_plan"] });
    expect(b.results[0].status).toBe("executed");
  });

  it("confirming an advisory consumer is harmless (advisory already executes; no double-fire)", async () => {
    const ct = mockCallTool();
    const rep = await executeExtractionPlan(mkPlan([ADVISORY("feature_recognize")]), ct, { confirmedConsumers: ["feature_recognize"] });
    expect(rep.summary.executed).toBe(1);
    expect((ct as any).mock.calls.length).toBe(1);
  });
});

describe("executeExtractionPlan — allowedKinds + eligibility filters", () => {
  it("allowedKinds: ['advisory'] executes advisory but SKIPS privacy as skipped-kind", async () => {
    const ct = mockCallTool();
    const rep = await executeExtractionPlan(mkPlan([ADVISORY("a"), PRIVACY("redact")]), ct, { allowedKinds: ["advisory"] });
    expect(rep.results.find((r) => r.consumer === "a")!.status).toBe("executed");
    expect(rep.results.find((r) => r.consumer === "redact")!.status).toBe("skipped-kind");
  });

  it("an ineligible route is skipped-ineligible and never dispatched", async () => {
    const ct = mockCallTool();
    const rep = await executeExtractionPlan(mkPlan([mkRoute({ consumer: "a", kind: "advisory", eligible: false })]), ct);
    expect(rep.results[0].status).toBe("skipped-ineligible");
    expect((ct as any).mock.calls.length).toBe(0);
  });

  it("DEFAULT_EXECUTE_KINDS is advisory + privacy (the safe default; commitment excluded)", () => {
    expect([...DEFAULT_EXECUTE_KINDS].sort()).toEqual(["advisory", "privacy"]);
  });
});

describe("executeExtractionPlan — per-consumer error isolation", () => {
  it("a throwing dispatch is recorded as error and does NOT abort the remaining routes", async () => {
    const ct = mockCallTool({
      boom_act: () => { throw new Error("dispatcher exploded"); },
    });
    const plan = mkPlan([ADVISORY("ok1"), mkRoute({ consumer: "boom", kind: "advisory", action: "boom_act" }), ADVISORY("ok2")]);
    const rep = await executeExtractionPlan(plan, ct);
    expect(rep.summary.executed).toBe(2); // ok1 + ok2 still ran
    expect(rep.summary.errored).toBe(1);
    const boom = rep.results.find((r) => r.consumer === "boom")!;
    expect(boom.status).toBe("error");
    expect(boom.error).toBe("dispatcher exploded");
  });

  it("a {success:false} failure envelope is recorded as error (not a false 'executed')", async () => {
    const ct = mockCallTool({ fail_act: { success: false, error: "bad input" } });
    const rep = await executeExtractionPlan(mkPlan([mkRoute({ consumer: "fail", kind: "advisory", action: "fail_act" })]), ct);
    expect(rep.results[0].status).toBe("error");
  });

  it("a plain {error} object is treated as a failure envelope", async () => {
    const ct = mockCallTool({ e_act: { error: "nope" } });
    const rep = await executeExtractionPlan(mkPlan([mkRoute({ consumer: "e", kind: "advisory", action: "e_act" })]), ct);
    expect(rep.results[0].status).toBe("error");
  });
});

describe("executeExtractionPlan — dryRun", () => {
  it("dryRun marks each gate-cleared route as planned and calls NOTHING", async () => {
    const ct = mockCallTool();
    const plan = mkPlan([ADVISORY("a"), COMMIT("quote"), PRIVACY("redact")]);
    const rep = await executeExtractionPlan(plan, ct, { confirmedConsumers: ["quote"], dryRun: true });
    expect(rep.dryRun).toBe(true);
    expect(rep.summary.planned).toBe(3); // a + redact + (confirmed) quote
    expect(rep.summary.executed).toBe(0);
    expect((ct as any).mock.calls.length).toBe(0);
  });
});

describe("executeExtractionPlan — adversarial / total (never throws)", () => {
  it("a malformed plan with no routes array -> empty report, no throw", async () => {
    const ct = mockCallTool();
    const rep = await executeExtractionPlan({ schemaVersion: "1.0.0", routes: "nope" } as unknown as ExtractionRoutingPlan, ct);
    expect(rep.results).toEqual([]);
    expect(rep.summary.executed).toBe(0);
    expect((ct as any).mock.calls.length).toBe(0);
  });

  it("a gate-cleared route missing dispatcher/action -> error, never a bad dispatch", async () => {
    const ct = mockCallTool();
    const bad = mkRoute({ consumer: "x", kind: "advisory", dispatcher: "", action: "" });
    const rep = await executeExtractionPlan(mkPlan([bad]), ct);
    expect(rep.results[0].status).toBe("error");
    expect((ct as any).mock.calls.length).toBe(0);
  });

  it("propagates the plan schemaVersion as plan_version (drift trip-wire) + stamps execution version", async () => {
    const rep = await executeExtractionPlan(mkPlan([ADVISORY("a")]), mockCallTool());
    expect(rep.schemaVersion).toBe(EXTRACTION_PLAN_EXECUTION_VERSION);
    expect(rep.plan_version).toBe("1.0.0");
  });
});

describe("decideRouteDisposition — the pure gate", () => {
  const confirmed = new Set<string>(["quote"]);
  it("ineligible -> skipped-ineligible", () => {
    expect(decideRouteDisposition(mkRoute({ consumer: "a", kind: "advisory", eligible: false }), DEFAULT_EXECUTE_KINDS, confirmed)!.status).toBe("skipped-ineligible");
  });
  it("commitment not confirmed -> skipped-unconfirmed-commitment; confirmed -> null (proceed)", () => {
    expect(decideRouteDisposition(COMMIT("program"), DEFAULT_EXECUTE_KINDS, confirmed)!.status).toBe("skipped-unconfirmed-commitment");
    expect(decideRouteDisposition(COMMIT("quote"), DEFAULT_EXECUTE_KINDS, confirmed)).toBeNull();
  });
  it("advisory in allowedKinds -> null; privacy excluded by allowedKinds -> skipped-kind", () => {
    expect(decideRouteDisposition(ADVISORY("a"), ["advisory"], confirmed)).toBeNull();
    expect(decideRouteDisposition(PRIVACY("redact"), ["advisory"], confirmed)!.status).toBe("skipped-kind");
  });
});
