/**
 * Tests for CamOutcomeFeedbackAdapterEngine (U-CAM-LOOP-WIRE-CONSUMER).
 *
 * The adapter is the schema bridge that closes the CAM self-learning loop. The
 * load-bearing test is the REAL round-trip: record a cam event through the REAL
 * OutcomeCaptureBus → query it back → adapt → feed the REAL OutcomeFeedbackWire
 * pure fns (isValidOutcome / computeCorpusDelta) and assert they ACCEPT it. That
 * is the proof the two halves actually connect — before this adapter, every real
 * bus event was rejected by isValidOutcome (the dead-consumer gap).
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CamOutcomeFeedbackAdapterEngine, type BusEventLike } from "../engines/CamOutcomeFeedbackAdapterEngine.js";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import { isValidOutcome, computeCorpusDelta } from "../engines/OutcomeFeedbackWireEngine.mjs";

function camDriveEvent(over: Partial<BusEventLike> = {}): BusEventLike {
  return {
    event_id: "ev-1",
    lineage_id: "RECIPE_A:run-1",
    kind: "recommendation_emitted",
    timestamp: "2026-05-31T00:00:00.000Z",
    context: { engine: "CAMDriveRecipeEngine", action: "cam_drive_recipe_execute", cam_system: "fusion360" },
    actual: { postedOk: true, gateBlocks: 0, stepsRun: 5 },
    ...over,
  };
}

describe("CamOutcomeFeedbackAdapterEngine — deriveObserved rule table", () => {
  it("maps explicit success kinds → success", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "first_article_pass" })).toBe("success");
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "collision_avoided" })).toBe("success");
  });
  it("maps explicit fail kinds → fail", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "scrap_event" })).toBe("fail");
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "tool_break" })).toBe("fail");
  });
  it("maps operator_override → partial (recommendation adjusted, not rejected)", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "operator_override" })).toBe("partial");
  });
  it("derives success from actual.postedOk=true with no gate blocks", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved(camDriveEvent())).toBe("success");
  });
  it("derives partial when posted but a step was gated/aborted", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved(camDriveEvent({ actual: { postedOk: true, gateBlocks: 2 } }))).toBe("partial");
  });
  it("derives fail from actual.postedOk=false", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved(camDriveEvent({ actual: { postedOk: false, gateBlocks: 1 } }))).toBe("fail");
  });
  it("returns null (drop, do not fabricate) when no signal is present", () => {
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "cycle_time_measurement", actual: {} })).toBeNull();
    expect(CamOutcomeFeedbackAdapterEngine.deriveObserved({ kind: "recommendation_emitted" })).toBeNull();
  });
});

describe("CamOutcomeFeedbackAdapterEngine — resolveTemplateId", () => {
  it("parses recipeId from a recipeId:runId lineage", () => {
    expect(CamOutcomeFeedbackAdapterEngine.resolveTemplateId(camDriveEvent())).toBe("RECIPE_A");
  });
  it("prefers an explicit context.template_id", () => {
    expect(
      CamOutcomeFeedbackAdapterEngine.resolveTemplateId({ lineage_id: "X:y", context: { template_id: "TPL_42" } }),
    ).toBe("TPL_42");
  });
  it("falls back to the bare lineage when no colon, then to _compose_", () => {
    expect(CamOutcomeFeedbackAdapterEngine.resolveTemplateId({ lineage_id: "BARE" })).toBe("BARE");
    expect(CamOutcomeFeedbackAdapterEngine.resolveTemplateId({})).toBe("_compose_");
  });
});

describe("CamOutcomeFeedbackAdapterEngine — busEventToWireOutcome", () => {
  it("maps a full cam-drive event to a complete WireOutcome", () => {
    const w = CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome(camDriveEvent());
    expect(w).not.toBeNull();
    expect(w!.outcomeId).toBe("ev-1");
    expect(w!.templateId).toBe("RECIPE_A");
    expect(w!.decision).toBe("cam_drive_recipe_execute"); // from context.action
    expect(w!.observed).toBe("success");
    expect(w!.timestamp).toBe("2026-05-31T00:00:00.000Z");
  });
  it("returns null when event_id is missing (cannot score an unidentified outcome)", () => {
    expect(CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome(camDriveEvent({ event_id: undefined }))).toBeNull();
  });
  it("returns null when no observed signal can be derived (drop, not fabricate)", () => {
    expect(CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome({ event_id: "e", kind: "other", actual: {} })).toBeNull();
  });
  it("decision falls back to kind when context.action is absent", () => {
    const w = CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome({ event_id: "e", kind: "first_article_pass" });
    expect(w!.decision).toBe("first_article_pass");
  });
  it("keeps only finite numeric_features", () => {
    const w = CamOutcomeFeedbackAdapterEngine.busEventToWireOutcome(
      camDriveEvent({ numeric_features: { rpm: 1200, bad: Infinity, also_bad: NaN } as unknown as Record<string, number> }),
    );
    expect(w!.measuredFeatures).toEqual({ rpm: 1200 });
  });
});

describe("CamOutcomeFeedbackAdapterEngine — batch", () => {
  it("maps a batch and reports dropped count honestly", () => {
    const res = CamOutcomeFeedbackAdapterEngine.busEventsToWireOutcomes([
      camDriveEvent({ event_id: "a" }),
      camDriveEvent({ event_id: undefined }), // dropped (no id)
      { event_id: "c", kind: "other", actual: {} }, // dropped (no signal)
      camDriveEvent({ event_id: "d", kind: "scrap_event" }),
    ]);
    expect(res.outcomes.length).toBe(2);
    expect(res.dropped).toBe(2);
  });
  it("handles a non-array input without throwing", () => {
    expect(CamOutcomeFeedbackAdapterEngine.busEventsToWireOutcomes(null as unknown as BusEventLike[])).toEqual({ outcomes: [], dropped: 0 });
  });
});

describe("CamOutcomeFeedbackAdapterEngine — REAL round-trip (closes the loop)", () => {
  it("bus event → adapter → the REAL OutcomeFeedbackWire ACCEPTS it (isValidOutcome + computeCorpusDelta promote)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cam-loop-rt-"));
    try {
      const bus = new OutcomeCaptureBusEngine(root);
      // 3 successful CAM-drive runs of the same recipe → should reach the promotion floor.
      for (let i = 1; i <= 3; i++) {
        const r = bus.record({
          domain: "cam",
          kind: "recommendation_emitted",
          source: "system",
          lineage_id: `RECIPE_A:run-${i}`,
          confidence: 1,
          context: { engine: "CAMDriveRecipeEngine", action: "cam_drive_recipe_execute", cam_system: "fusion360" },
          actual: { postedOk: true, gateBlocks: 0, stepsRun: 5 },
        });
        expect(r.ok).toBe(true);
      }
      const { events } = bus.query({ domain: "cam", limit: 100 });
      expect(events.length).toBe(3);

      const { outcomes, dropped } = CamOutcomeFeedbackAdapterEngine.busEventsToWireOutcomes(events as BusEventLike[]);
      expect(dropped).toBe(0);
      expect(outcomes.length).toBe(3);
      // the REAL consumer validator accepts every mapped outcome (the gap was: it rejected all)
      for (const o of outcomes) expect(isValidOutcome(o)).toBe(true);

      // and the REAL corpus-delta computation promotes the recipe (success>=3, fail==0)
      const delta = computeCorpusDelta(outcomes);
      expect(delta.totalConsumed).toBe(3);
      expect(delta.skipped).toBe(0);
      expect(delta.promote.map((p: { templateId: string }) => p.templateId)).toContain("RECIPE_A");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
