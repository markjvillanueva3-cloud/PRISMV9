/**
 * Tests for domainAGIAdapterKit — INFRA-AGI-ROUTER-MS2/P1-U01
 * ────────────────────────────────────────────────────────────
 *
 * Coverage strategy:
 *   - vitestConsensusGuard: throws in VITEST context (observed via Vitest's
 *     runtime env var); engine name is interpolated into the error message
 *   - makeDefaultConsensusVote: factory returns a function that closes over
 *     engineName + callerEngine; the returned function throws via the guard
 *   - makeFailResult: shape conforms to DomainAGIResult contract (success=false
 *     with populated error; empty decisions/outcomes; confidence=0)
 *   - makeOutcomeEvent: v1.1.0 event with correct domain/kind/context fields;
 *     consensus_audit_id present iff input.consensusAuditId is set
 *   - rollupJointConfidence: product math; vacuous-truth edge case (empty=1.0);
 *     monotonicity (more decisions → no greater confidence)
 *   - publishOutcomeToFeedbackBus: delegation to feedbackBusEngine.publish
 *     (asserted via subscriber sees published events)
 *   - Constants: ORCHESTRATE_OUTCOME_TOPIC + ORCHESTRATE_STAGE match contract
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ORCHESTRATE_OUTCOME_TOPIC,
  ORCHESTRATE_STAGE,
  vitestConsensusGuard,
  makeDefaultConsensusVote,
  publishOutcomeToFeedbackBus,
  makeFailResult,
  makeOutcomeEvent,
  rollupJointConfidence,
  type OutcomeEventInput,
} from "../engines/domainAGIAdapterKit.js";
import {
  DOMAIN_AGI_CONTRACT_VERSION,
  DomainAGIResultSchema,
  type DomainAGIIntent,
} from "../schemas/domainAGIContract.js";
import { OutcomeEventSchema } from "../schemas/outcomeEventSchema.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";

function makeIntent(overrides: Partial<DomainAGIIntent> = {}): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "wedm",
    action: "rough_cut",
    features: [{ id: "F-1", kind: "profile", dimensions: { thickness_mm: 20 } }],
    material: "D2",
    constraints: {},
    consensusRequired: false,
    ...overrides,
  };
}

describe("domainAGIAdapterKit — constants", () => {
  it("ORCHESTRATE_OUTCOME_TOPIC matches the OutcomeCaptureBus contract", () => {
    expect(ORCHESTRATE_OUTCOME_TOPIC).toBe("outcome.recorded");
  });

  it("ORCHESTRATE_STAGE is the canonical pipeline-stage token", () => {
    expect(ORCHESTRATE_STAGE).toBe("domain_agi_orchestrate");
  });
});

describe("domainAGIAdapterKit — vitestConsensusGuard", () => {
  // VITEST is set to "true" by the vitest runtime — verify both the runtime
  // invariant AND the guard's resulting throw.
  it("throws when VITEST env is set (current test process)", () => {
    expect(process.env.VITEST).toBe("true");
    expect(() => vitestConsensusGuard("MyEngine")).toThrow(
      /MyEngine\.orchestrate.*consensusRequired=true.*test runner/i,
    );
  });

  it("throws with the engine name interpolated into the message", () => {
    try {
      vitestConsensusGuard("WireEDMAGIOrchestrator");
      expect.fail("guard should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const msg = (err as Error).message;
      expect(msg).toContain("WireEDMAGIOrchestrator.orchestrate");
      // Remediation hint must be present so a developer hitting this in CI
      // knows exactly what to do (R12 — fail-loud with actionable detail).
      expect(msg).toContain("opts.consensusDecide");
    }
  });
});

describe("domainAGIAdapterKit — makeDefaultConsensusVote", () => {
  it("returns a function that closes over engineName for the VITEST guard", async () => {
    const vote = makeDefaultConsensusVote({
      engineName: "MillingAGIMasterEngine",
      callerEngine: "MillingAGIMasterEngine",
    });
    // VITEST env is set — the guard inside the returned fn should throw
    // with the engineName we passed (not a generic message).
    await expect(
      vote({ question: "q?", options: ["a", "b"], decisionKind: "tool" }),
    ).rejects.toThrow(/MillingAGIMasterEngine\.orchestrate/);
  });

  it("can be constructed with different engineName + callerEngine pairs", async () => {
    const lathe = makeDefaultConsensusVote({
      engineName: "LatheAGIKnowledgeUnificationEngine",
      callerEngine: "LatheAGIKnowledgeUnificationEngine",
    });
    const wedm = makeDefaultConsensusVote({
      engineName: "WireEDMAGIOrchestrator",
      callerEngine: "WireEDMAGIOrchestrator",
    });
    // Each closure carries its own engineName — interpolated independently.
    await expect(
      lathe({ question: "?", options: ["x", "y"], decisionKind: "strategy" }),
    ).rejects.toThrow(/LatheAGIKnowledgeUnificationEngine/);
    await expect(
      wedm({ question: "?", options: ["x", "y"], decisionKind: "strategy" }),
    ).rejects.toThrow(/WireEDMAGIOrchestrator/);
  });
});

describe("domainAGIAdapterKit — makeFailResult", () => {
  it("returns a DomainAGIResult with success=false and populated error", () => {
    const result = makeFailResult({
      code: "SAFETY_FLOOR_VIOLATED",
      message: "Tier-6 gate hard-blocked",
      stage: "tier6_geom_gate",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SAFETY_FLOOR_VIOLATED");
    expect(result.error?.message).toBe("Tier-6 gate hard-blocked");
    expect(result.error?.stage).toBe("tier6_geom_gate");
    expect(result.schemaVersion).toBe(DOMAIN_AGI_CONTRACT_VERSION);
    expect(result.decisions).toEqual([]);
    expect(result.outcomes).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it("the returned shape passes DomainAGIResultSchema validation", () => {
    // The contract's superRefine enforces "success=false MUST populate
    // error" — this is a structural invariant the kit must preserve.
    const result = makeFailResult({
      code: "INVALID_INTENT",
      message: "Validation failed",
      stage: "router_validation",
    });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe("domainAGIAdapterKit — makeOutcomeEvent", () => {
  function makeInput(overrides: Partial<OutcomeEventInput> = {}): OutcomeEventInput {
    return {
      intent: makeIntent(),
      lineageId: "lineage-abc-123",
      jobId: "wedm-agi-job-test-456",
      engineName: "WireEDMAGIOrchestrator",
      domain: "wedm",
      decisionKind: "strategy",
      value: "single_pass_rough_high_energy",
      confidence: 0.8,
      ...overrides,
    };
  }

  it("builds a v1.1.0 cross_process_decision event", () => {
    const event = makeOutcomeEvent(makeInput());
    expect(event.schemaVersion).toBe("1.1.0");
    expect(event.kind).toBe("cross_process_decision");
    expect(event.domain).toBe("wedm");
    expect(event.severity).toBe("info");
    expect(event.source).toBe("system");
    expect(event.lineage_id).toBe("lineage-abc-123");
    expect(event.confidence).toBe(0.8);
    expect(event.recommended).toBe("single_pass_rough_high_energy");
  });

  it("context carries engine + action + material + pipeline_stage + job_id", () => {
    const event = makeOutcomeEvent(makeInput());
    expect(event.context.engine).toBe("WireEDMAGIOrchestrator");
    expect(event.context.action).toBe("rough_cut");
    expect(event.context.material).toBe("D2");
    expect(event.context.operation).toBe("strategy");
    expect(event.context.pipeline_stage).toBe(ORCHESTRATE_STAGE);
    expect(event.context.job_id).toBe("wedm-agi-job-test-456");
  });

  it("omits consensus_audit_id when not provided (R12 — never fabricate pointers)", () => {
    const event = makeOutcomeEvent(makeInput({ consensusAuditId: undefined }));
    // Concrete absence assertion — the KEY must not be on the object at all.
    // (event.context.consensus_audit_id===undefined would pass even if the
    // key existed with value undefined; `in` check rejects both forms.)
    expect("consensus_audit_id" in event.context).toBe(false);
    expect(Object.keys(event.context)).not.toContain("consensus_audit_id");
  });

  it("includes consensus_audit_id when provided", () => {
    const event = makeOutcomeEvent(makeInput({ consensusAuditId: "audit-xyz-789" }));
    expect(event.context.consensus_audit_id).toBe("audit-xyz-789");
  });

  it("carries the correct domain when the engine is for a different domain (decoupling)", () => {
    // Engine NAME and contract DOMAIN are intentionally separate fields —
    // verify the kit doesn't conflate them.
    const event = makeOutcomeEvent(
      makeInput({
        engineName: "MillingAGIMasterEngine",
        domain: "mill",
        intent: makeIntent({ domain: "mill", action: "roughing", material: "1018-steel" }),
      }),
    );
    expect(event.domain).toBe("mill");
    expect(event.context.engine).toBe("MillingAGIMasterEngine");
    expect(event.context.action).toBe("roughing");
    expect(event.context.material).toBe("1018-steel");
  });

  it("event passes OutcomeEventSchema validation", () => {
    const event = makeOutcomeEvent(makeInput());
    const parsed = OutcomeEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
  });

  it("event_id is a unique UUID per call (R12 — never duplicate event ids)", () => {
    const e1 = makeOutcomeEvent(makeInput());
    const e2 = makeOutcomeEvent(makeInput());
    expect(e1.event_id).not.toBe(e2.event_id);
    // RFC 4122 uuid v4 regex (loose — accepts any v4 / hex shape):
    expect(e1.event_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("domainAGIAdapterKit — rollupJointConfidence", () => {
  it("computes joint probability (product) for serial decisions", () => {
    // 0.9 * 0.8 * 0.7 = 0.504
    const c = rollupJointConfidence([
      { confidence: 0.9 },
      { confidence: 0.8 },
      { confidence: 0.7 },
    ]);
    expect(c).toBeCloseTo(0.504, 10);
  });

  it("returns 1.0 for empty decisions (vacuous truth — no decisions = no uncertainty)", () => {
    expect(rollupJointConfidence([])).toBe(1);
  });

  it("returns single confidence when only one decision", () => {
    expect(rollupJointConfidence([{ confidence: 0.85 }])).toBeCloseTo(0.85, 10);
  });

  it("is monotonically non-increasing in decision count (more picks = same-or-less confidence)", () => {
    const c1 = rollupJointConfidence([{ confidence: 0.9 }]);
    const c2 = rollupJointConfidence([{ confidence: 0.9 }, { confidence: 0.95 }]);
    const c3 = rollupJointConfidence([
      { confidence: 0.9 },
      { confidence: 0.95 },
      { confidence: 0.99 },
    ]);
    // Adding a confidence < 1 must NOT increase the rollup.
    expect(c2).toBeLessThanOrEqual(c1);
    expect(c3).toBeLessThanOrEqual(c2);
  });

  it("collapses to 0 if any decision has 0 confidence (absorbing element)", () => {
    expect(
      rollupJointConfidence([{ confidence: 0.9 }, { confidence: 0 }, { confidence: 0.8 }]),
    ).toBe(0);
  });
});

describe("domainAGIAdapterKit — publishOutcomeToFeedbackBus", () => {
  let received: unknown[];
  let handle: ReturnType<typeof feedbackBusEngine.subscribe> | null;

  beforeEach(() => {
    received = [];
    // Subscribe to the canonical topic so we can verify publish delegation.
    // feedbackBusEngine.subscribe returns a SubscriptionHandle, not an
    // unsubscribe fn — detach by handle in afterEach.
    handle = feedbackBusEngine.subscribe(ORCHESTRATE_OUTCOME_TOPIC, (e) => {
      received.push(e);
    });
  });

  afterEach(() => {
    if (handle) feedbackBusEngine.unsubscribe(handle);
  });

  it("publishes the event to the feedback bus under ORCHESTRATE_OUTCOME_TOPIC", async () => {
    const event = makeOutcomeEvent({
      intent: makeIntent(),
      lineageId: "lineage-pub-1",
      jobId: "wedm-agi-job-pub-1",
      engineName: "WireEDMAGIOrchestrator",
      domain: "wedm",
      decisionKind: "safety",
      value: "tier6=pass S(x)=0.95",
      confidence: 0.95,
    });
    publishOutcomeToFeedbackBus(event);
    // publish() uses queueMicrotask for async fan-out — yield once so the
    // subscriber callback runs before we assert.
    await new Promise((resolve) => setImmediate(resolve));
    expect(received.length).toBeGreaterThanOrEqual(1);
    // FeedbackBusEngine wraps the payload in a FeedbackEvent: { topic, ts, payload }.
    // Our published event lives in `.payload`.
    const last = received[received.length - 1] as { topic: string; payload: { event_id: string } };
    expect(last.topic).toBe(ORCHESTRATE_OUTCOME_TOPIC);
    expect(last.payload.event_id).toBe(event.event_id);
  });
});
