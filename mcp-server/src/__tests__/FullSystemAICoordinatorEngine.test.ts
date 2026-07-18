/**
 * FullSystemAICoordinatorEngine tests — Tier-2 coordinator contract
 * ==================================================================
 *
 * Verifies the Tier-1 → Tier-2 → Tier-3 command path:
 *   - Coordinator-boundary schema gate rejects bad input with structured error
 *   - Valid mfg intents (mill/lathe/wedm) route through
 *     ProcessIntelligenceRouterEngine.orchestrate
 *   - Returned result carries `coordinator_metadata` audit envelope
 *   - Coordinator publishes outcome event tagged `coordinator_dispatch`
 *   - Telemetry failures NEVER throw — they land in `lastPublishError`
 *   - Coordinator metadata is structurally valid per CoordinatorMetadataSchema
 *
 * Tests are hermetic — no disk writes, no real router calls. The router
 * import is mocked via vitest's vi.mock so the contract assertion is on
 * the coordinator's own behavior, not the downstream Tier-3 engines (those
 * have their own hermetic test suites in P0-U02/U03/U04).
 *
 * @milestone PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-AI-TIER1-TIER2
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  FullSystemAICoordinatorEngine,
  COORDINATOR_VERSION,
  COORDINATOR_STAGE,
  COORDINATOR_OUTCOME_TOPIC,
  CoordinatorMetadataSchema,
} from "../engines/FullSystemAICoordinatorEngine.js";
import type { DomainAGIIntent, DomainAGIResult } from "../schemas/domainAGIContract.js";
import { DOMAIN_AGI_CONTRACT_VERSION } from "../schemas/domainAGIContract.js";

// Mock the router so the test verifies coordinator behavior in isolation
// (per-domain orchestration is tested in MillingAGIMasterEngine.test.ts etc.).
vi.mock("../engines/ProcessIntelligenceRouterEngine.js", () => {
  return {
    ProcessIntelligenceRouterEngine: {
      orchestrate: vi.fn(async (intent: DomainAGIIntent): Promise<DomainAGIResult> => ({
        schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
        success: true,
        decisions: [
          {
            kind: "strategy",
            value: `mock-${intent.domain}-strategy`,
            confidence: 0.9,
            source: "mock-router",
          },
        ],
        confidence: 0.9,
        outcomes: [],
        warnings: [],
      })),
    },
  };
});

/** Builder for a minimally valid DomainAGIIntent (mill domain). */
function makeMillIntent(): DomainAGIIntent {
  return {
    schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
    domain: "mill",
    action: "roughing",
    material: "1018-steel",
    blueprint: { path: "fixtures/test-part.step" },
    features: [{ id: "F-001", kind: "pocket", dimensions: { diameter_mm: 12.5, depth_mm: 30 } }],
    machine: { id: "JM-DIE-VF2-001", rigidity_tier: "medium" },
    constraints: {},
    consensusRequired: false,
  };
}

describe("FullSystemAICoordinatorEngine", () => {
  beforeEach(() => {
    FullSystemAICoordinatorEngine.lastPublishError = null;
    vi.clearAllMocks();
  });

  describe("coordinate() — happy path", () => {
    it("dispatches a valid mill intent and returns a CoordinatedDomainAGIResult", async () => {
      const intent = makeMillIntent();
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      expect(result.success).toBe(true);
      expect(result.schemaVersion).toBe(DOMAIN_AGI_CONTRACT_VERSION);
      expect(result.coordinator_metadata.routed_to).toBe("mill");
      expect(result.coordinator_metadata.tier).toBe("tier-2");
      expect(result.coordinator_metadata.coordinator_version).toBe(COORDINATOR_VERSION);
    });

    it("dispatches a lathe intent through the same coordinator path", async () => {
      const intent: DomainAGIIntent = {
        ...makeMillIntent(),
        domain: "lathe",
        action: "turning",
      };
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      expect(result.success).toBe(true);
      expect(result.coordinator_metadata.routed_to).toBe("lathe");
    });

    it("dispatches a wedm intent through the same coordinator path", async () => {
      const intent: DomainAGIIntent = {
        ...makeMillIntent(),
        domain: "wedm",
        action: "rough_cut",
      };
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      expect(result.success).toBe(true);
      expect(result.coordinator_metadata.routed_to).toBe("wedm");
    });

    it("preserves the router's decisions[] in the coordinated result", async () => {
      const intent = makeMillIntent();
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].value).toBe("mock-mill-strategy");
      expect(result.decisions[0].source).toBe("mock-router");
    });
  });

  describe("coordinate() — schema gate", () => {
    it("rejects an intent missing required `domain` field with INVALID_INTENT", async () => {
      const bad = { schemaVersion: DOMAIN_AGI_CONTRACT_VERSION, action: "roughing" } as unknown as DomainAGIIntent;
      const result = await FullSystemAICoordinatorEngine.coordinate(bad);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      expect(result.error?.stage).toBe("coordinator_validation");
    });

    it("rejects an intent with an unknown domain", async () => {
      const bad = {
        ...makeMillIntent(),
        domain: "ceramics" as DomainAGIIntent["domain"],
      };
      const result = await FullSystemAICoordinatorEngine.coordinate(bad);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
    });

    it("attaches coordinator_metadata on validation failure (tier + version + fallback domain)", async () => {
      const bad = { schemaVersion: DOMAIN_AGI_CONTRACT_VERSION } as unknown as DomainAGIIntent;
      const result = await FullSystemAICoordinatorEngine.coordinate(bad);

      expect(result.coordinator_metadata.tier).toBe("tier-2");
      expect(result.coordinator_metadata.coordinator_version).toBe(COORDINATOR_VERSION);
      // Domain unknown on validation failure → falls back to "mill" per pickCoarseDomain.
      expect(result.coordinator_metadata.routed_to).toBe("mill");
    });
  });

  describe("coordinate() — outcome publish", () => {
    it("publishes a coordinator_dispatch outcome event on success", async () => {
      const intent = makeMillIntent();
      const publisher = vi.fn();
      await FullSystemAICoordinatorEngine.coordinate(intent, { publishOutcome: publisher });

      expect(publisher).toHaveBeenCalledTimes(1);
      const event = publisher.mock.calls[0][0] as Record<string, unknown>;
      expect(event.topic).toBe(COORDINATOR_OUTCOME_TOPIC);
      expect(event.kind).toBe("coordinator_dispatch");
      expect((event.context as Record<string, unknown>).pipeline_stage).toBe(COORDINATOR_STAGE);
      expect(event.success).toBe(true);
    });

    it("does NOT throw when the publisher throws — telemetry never breaks the hot path", async () => {
      const intent = makeMillIntent();
      const failingPublisher = vi.fn(() => {
        throw new Error("bus offline");
      });

      const result = await FullSystemAICoordinatorEngine.coordinate(intent, {
        publishOutcome: failingPublisher,
      });

      expect(result.success).toBe(true);
      expect(FullSystemAICoordinatorEngine.lastPublishError?.message).toBe("bus offline");
    });

    it("does NOT throw when the publisher returns a rejected Promise", async () => {
      const intent = makeMillIntent();
      const failingPublisher = vi.fn(async () => {
        throw new Error("async bus offline");
      });

      const result = await FullSystemAICoordinatorEngine.coordinate(intent, {
        publishOutcome: failingPublisher,
      });

      expect(result.success).toBe(true);
      expect(FullSystemAICoordinatorEngine.lastPublishError?.message).toBe("async bus offline");
    });
  });

  describe("routeSpecialist() — Tier-2 → Tier-3 (U-BRIDGE-AI-TIER2-TIER3)", () => {
    it("routes safety to OmegaSafetyScoreEngine with prism_safety:omega_score action", async () => {
      const result = await FullSystemAICoordinatorEngine.routeSpecialist("safety", {
        material: "1018-steel",
        operation: "roughing",
      });

      expect(result.success).toBe(true);
      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].kind).toBe("route");
      const decisionValue = result.decisions[0].value as Record<string, unknown>;
      expect(decisionValue.specialist_engine).toBe("OmegaSafetyScoreEngine");
      expect(decisionValue.dispatcher_action).toBe("prism_safety:omega_score");
    });

    it("routes quality to QualityPredictionEngine with prism_quality:predict action", async () => {
      const result = await FullSystemAICoordinatorEngine.routeSpecialist("quality", { spc_window: 30 });

      expect(result.success).toBe(true);
      const decisionValue = result.decisions[0].value as Record<string, unknown>;
      expect(decisionValue.specialist_engine).toBe("QualityPredictionEngine");
      expect(decisionValue.dispatcher_action).toBe("prism_quality:predict");
    });

    it("routes cad to CADAIStateMachineEngine", async () => {
      const result = await FullSystemAICoordinatorEngine.routeSpecialist("cad", { blueprint_path: "x.step" });
      const decisionValue = result.decisions[0].value as Record<string, unknown>;
      expect(decisionValue.specialist_engine).toBe("CADAIStateMachineEngine");
    });

    it("routes cam to CAMSpeedFeedBridgeEngine", async () => {
      const result = await FullSystemAICoordinatorEngine.routeSpecialist("cam", { target: "Mastercam" });
      const decisionValue = result.decisions[0].value as Record<string, unknown>;
      expect(decisionValue.specialist_engine).toBe("CAMSpeedFeedBridgeEngine");
    });

    it("preserves payload passthrough in the routing decision", async () => {
      const payload = { specific_key: "specific_value", nested: { a: 1 } };
      const result = await FullSystemAICoordinatorEngine.routeSpecialist("safety", payload);
      const decisionValue = result.decisions[0].value as Record<string, unknown>;
      expect(decisionValue.payload_passthrough).toEqual(payload);
    });

    it("publishes a specialist_route outcome event", async () => {
      const publisher = vi.fn();
      await FullSystemAICoordinatorEngine.routeSpecialist("safety", {}, { publishOutcome: publisher });

      expect(publisher).toHaveBeenCalledTimes(1);
      const event = publisher.mock.calls[0][0] as Record<string, unknown>;
      expect(event.kind).toBe("specialist_route");
      expect(event.domain).toBe("safety");
      expect((event.context as Record<string, unknown>).specialist_engine).toBe("OmegaSafetyScoreEngine");
    });

    it("non-mfg routing telemetry failure does not break the hot path", async () => {
      const failingPublisher = vi.fn(() => {
        throw new Error("specialist route bus offline");
      });

      const result = await FullSystemAICoordinatorEngine.routeSpecialist("safety", {}, {
        publishOutcome: failingPublisher,
      });

      expect(result.success).toBe(true);
      expect(FullSystemAICoordinatorEngine.lastPublishError?.message).toBe("specialist route bus offline");
    });
  });

  describe("coordinator_metadata", () => {
    it("contains all CoordinatorMetadataSchema fields with valid shapes", async () => {
      const intent = makeMillIntent();
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      const parsed = CoordinatorMetadataSchema.safeParse(result.coordinator_metadata);
      expect(parsed.success).toBe(true);
    });

    it("reports non-negative routing_ms", async () => {
      const intent = makeMillIntent();
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      expect(result.coordinator_metadata.routing_ms).toBeGreaterThanOrEqual(0);
    });

    it("ISO timestamps are well-formed and received_at <= completed_at", async () => {
      const intent = makeMillIntent();
      const result = await FullSystemAICoordinatorEngine.coordinate(intent);

      const recv = new Date(result.coordinator_metadata.coordinator_received_at);
      const comp = new Date(result.coordinator_metadata.coordinator_completed_at);
      expect(Number.isFinite(recv.getTime())).toBe(true);
      expect(Number.isFinite(comp.getTime())).toBe(true);
      expect(recv.getTime()).toBeLessThanOrEqual(comp.getTime());
    });
  });
});
