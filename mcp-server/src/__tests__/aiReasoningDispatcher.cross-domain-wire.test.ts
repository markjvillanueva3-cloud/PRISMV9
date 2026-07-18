/**
 * aiReasoningDispatcher cross_domain_orchestrate wiring (U-XDOMAIN-ORCH-WIRE).
 *
 * Dark-facade fix: the action probed orchestrate/plan/execute (none exist on
 * CrossDomainOrchestratorEngine) -> always "method not callable". Now routes to the
 * real static `planJob`, which self-validates its input (OrchestrationInputSchema.parse)
 * so a bad call surfaces as a dispatcher error, not a crash.
 */
import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

type AnyAction = Parameters<typeof executeAIReasoningAction>[0];

describe("aiReasoningDispatcher cross_domain_orchestrate — dark-action fix (real planJob)", () => {
  it("returns a real multi-domain plan (plan_id, segments, schemaVersion), NOT 'method not callable'", async () => {
    const r = await executeAIReasoningAction("cross_domain_orchestrate" as AnyAction, {
      features: [
        { id: "f1", type: "pocket" },
        { id: "f2", type: "drill" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as Record<string, unknown>;
    expect(JSON.stringify(data)).not.toMatch(/method not callable/i);
    expect(data.schemaVersion).toBe("1.0.0");
    expect((data.plan_id as string).length).toBeGreaterThan(0);
    expect(Array.isArray(data.segments)).toBe(true);
    expect((data.segments as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(data.total_domains as number).toBeGreaterThanOrEqual(1);
  });

  it("honors a domain_pin (operator override resolves the feature's domain)", async () => {
    const r = await executeAIReasoningAction("cross_domain_orchestrate" as AnyAction, {
      features: [{ id: "f1", type: "pocket", domain_pin: "five_axis" }],
    });
    expect(r.success).toBe(true);
    const data = r.data as { segments: Array<{ domain: string }> };
    expect(data.segments.some((s) => s.domain === "five_axis")).toBe(true);
  });

  it("self-validation: empty features is rejected by the engine (OrchestrationInputSchema .min(1))", async () => {
    const r = await executeAIReasoningAction("cross_domain_orchestrate" as AnyAction, { features: [] });
    expect(r.success).toBe(false);
  });

  it("an unknown feature type resolves to unresolved_features (graceful, not a crash)", async () => {
    const r = await executeAIReasoningAction("cross_domain_orchestrate" as AnyAction, {
      features: [
        { id: "f1", type: "pocket" },
        { id: "f2", type: "no_such_feature_xyz" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as { unresolved_features: Array<{ feature_id: string }> };
    expect(data.unresolved_features.some((u) => u.feature_id === "f2")).toBe(true);
  });
});
