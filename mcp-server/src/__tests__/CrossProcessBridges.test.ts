/**
 * Tests for the 3 cross-process concern bridges (XPROC-FEAT/SFC/POST-01)
 * consumed by ProcessIntelligenceRouterEngine's pipeline stages.
 *
 * These are PURE ROUTING bridges -- they classify the owning process (reusing
 * CrossProcessAIBridge.classify) and delegate the concern compute to a verified
 * orchestrator. The tests assert: (a) deterministic routing decisions with
 * concrete reference values, (b) R12 fail-loud on bad input, (c) dry-run
 * previews skip delegation (so the heavy orchestrators are never invoked in unit
 * tests). The delegated compute is the orchestrators' OWN tested responsibility.
 */

import { describe, it, expect } from "vitest";
import { CrossProcessFeatureBridge } from "../engines/CrossProcessFeatureBridge.js";
import { CrossProcessSpeedFeedBridge } from "../engines/CrossProcessSpeedFeedBridge.js";
import { CrossProcessPostBridge } from "../engines/CrossProcessPostBridge.js";

const SF_ENGINE = "SpeedFeedOrchestratorEngine.compute";
const POST_ENGINE = "MasterPostProcessorUnifiedAGIEngine.generatePost";

describe("CrossProcessFeatureBridge.route", () => {
  it("routes an explicit process override at confidence exactly 1.0 with no warnings", async () => {
    const r = await CrossProcessFeatureBridge.route({
      feature: { kind: "pocket_2d" },
      process: "mill",
    });
    expect(r.routed_to).toBe("mill");
    expect(r.classification.process).toBe("mill");
    expect(r.confidence).toBe(1.0);
    expect(r.warnings).toEqual([]);
    expect(r.feature.kind).toBe("pocket_2d");
  });

  it("routes an external-groove feature to lathe via feature bias (conf == 0.20 boost)", async () => {
    // CrossProcessAIBridge FEATURE_TO_PROCESS_BIAS maps groove_external -> lathe
    // at CONFIDENCE_FEATURE_BOOST (0.20); no keyword matches so that is the score.
    const r = await CrossProcessFeatureBridge.route({ feature: { kind: "groove_external" } });
    expect(r.routed_to).toBe("lathe");
    expect(r.classification.process).toBe("lathe");
    expect(r.confidence).toBeCloseTo(0.2, 5);
  });

  it("routes a mill-keyword intent to mill (keyword scorer)", async () => {
    const r = await CrossProcessFeatureBridge.route({
      feature: { kind: "pocket_2d" },
      intent: "rough this pocket on the VMC",
    });
    expect(r.routed_to).toBe("mill");
    expect(r.classification.matched_signals.length).toBeGreaterThanOrEqual(1);
  });

  it("throws (R12 fail-loud) on whitespace-only feature kind", async () => {
    await expect(
      CrossProcessFeatureBridge.route({ feature: { kind: "   " } }),
    ).rejects.toThrow(/non-empty/);
  });

  it("throws on missing feature object", async () => {
    await expect(
      CrossProcessFeatureBridge.route(
        {} as unknown as Parameters<typeof CrossProcessFeatureBridge.route>[0],
      ),
    ).rejects.toThrow(/feature/);
  });

  it("emits a low-confidence warning (fallback to mill at conf 0.10) on an unknown feature", async () => {
    const r = await CrossProcessFeatureBridge.route({ feature: { kind: "xyz123" } });
    expect(r.routed_to).toBe("mill"); // documented fallback target
    expect(r.confidence).toBeCloseTo(0.1, 5); // CONFIDENCE_DEFAULT_FALLBACK
    expect(r.warnings.some((w) => /low routing confidence/.test(w))).toBe(true);
  });
});

describe("CrossProcessSpeedFeedBridge.recommend", () => {
  it("dry-run returns the routing decision and does NOT compute (no orchestrator_response)", async () => {
    const r = await CrossProcessSpeedFeedBridge.recommend({ process: "mill", dry_run: true });
    expect(r.dry_run).toBe(true);
    expect(r.routed_to).toBe(SF_ENGINE);
    expect(r.classification.process).toBe("mill");
    expect(r.classification.confidence).toBe(1.0);
    expect(r.orchestrator_response).toBe(undefined);
    expect(r.notes).toContain(`routed_to=${SF_ENGINE}`);
  });

  it("throws (R12 fail-loud) on non-dry-run without orchestrator_request", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({ process: "mill" }),
    ).rejects.toThrow(/orchestrator_request/);
  });

  it("throws on missing request object", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend(
        null as unknown as Parameters<typeof CrossProcessSpeedFeedBridge.recommend>[0],
      ),
    ).rejects.toThrow(/request object/);
  });
});

describe("CrossProcessPostBridge.emit", () => {
  it("dry-run returns the routing decision and does NOT emit (no post_response)", async () => {
    const r = await CrossProcessPostBridge.emit({ process: "wedm", dry_run: true });
    expect(r.dry_run).toBe(true);
    expect(r.routed_to).toBe(POST_ENGINE);
    expect(r.classification.process).toBe("wedm");
    expect(r.classification.confidence).toBe(1.0);
    expect(r.post_response).toBe(undefined);
    expect(r.notes).toContain(`routed_to=${POST_ENGINE}`);
  });

  it("throws (R12 fail-loud) on non-dry-run without post_input", async () => {
    await expect(
      CrossProcessPostBridge.emit({ process: "mill" }),
    ).rejects.toThrow(/post_input/);
  });

  it("throws on missing request object", async () => {
    await expect(
      CrossProcessPostBridge.emit(
        undefined as unknown as Parameters<typeof CrossProcessPostBridge.emit>[0],
      ),
    ).rejects.toThrow(/request object/);
  });
});
