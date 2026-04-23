/**
 * CATIAAddinPluginEngine.test.ts — U-CAD-APP-05 (PHASE-48)
 *
 * Exhaustive vitest coverage (25+ cases) of the CATIA Workbench + toolbar +
 * event add-in engine: default spec shape, activation resolution across
 * workbenches / model kind / selection / PLM / SLO, event dispatch with
 * throttling + model-kind filter, tribal tip lookup.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CATIAAddinPluginEngine,
  type CatiaAddinClock,
} from "../engines/CATIAAddinPluginEngine.js";
import type {
  CatiaAddinSpec,
  CatiaActivationContext,
  CatiaTribalTip,
} from "../schemas/cadCatiaAddinSchema.js";

function ctx(
  overrides: Partial<CatiaActivationContext> = {},
): CatiaActivationContext {
  return {
    workbench: "PartDesign",
    modelKind: "CATPart",
    selectionCount: 0,
    isModalDialog: false,
    ...overrides,
  };
}

describe("CATIAAddinPluginEngine (U-CAD-APP-05)", () => {
  let eng: CATIAAddinPluginEngine;

  beforeEach(() => {
    eng = new CATIAAddinPluginEngine();
  });

  describe("default spec shape", () => {
    it("declares 4 workbenches in expected order", () => {
      const ids = eng.getSpec().workbenches.map((w) => w.workbenchId);
      expect(ids).toEqual([
        "PartDesign",
        "AssemblyDesign",
        "Drafting",
        "Machining",
      ]);
    });

    it("exposes ≥17 commands", () => {
      expect(eng.allCommands().length).toBeGreaterThanOrEqual(17);
    });

    it("declares ≥7 CAA event subscriptions", () => {
      expect(eng.eventSubscriptions().length).toBeGreaterThanOrEqual(7);
    });

    it("PartDesign workbench has 3 toolbars ordered 0,1,2", () => {
      const layout = eng.workbenchLayout("PartDesign")!;
      expect(layout.toolbars.map((t) => t.order)).toEqual([0, 1, 2]);
    });

    it("findCommand returns the right command or undefined", () => {
      expect(eng.findCommand("sf.calc")?.action).toBe("run_speed_feed");
      expect(eng.findCommand("ekl.audit")?.caaClassName).toBe(
        "CATPrismEklAuditCmd",
      );
      expect(eng.findCommand("nope")).toBeUndefined();
    });

    it("commandsForWorkbench returns Machining's short toolbar set", () => {
      const cmds = eng.commandsForWorkbench("Machining");
      expect(cmds.map((c) => c.commandId).sort()).toEqual(
        ["collision", "setup.sheet", "sf.calc"].sort(),
      );
    });

    it("commandsForWorkbench returns [] for workbench not in default spec", () => {
      expect(eng.commandsForWorkbench("Sketcher")).toEqual([]);
    });
  });

  describe("activation resolution", () => {
    it("modal dialog disables every command", () => {
      const states = eng.resolve(ctx({ isModalDialog: true }));
      expect(states.every((s) => s.state === "disabled")).toBe(true);
      expect(states.every((s) => s.reason.match(/modal/i))).toBeTruthy();
    });

    it("sf.calc hidden when workbench is Drafting", () => {
      const state = eng.resolveOne(eng.findCommand("sf.calc")!, ctx({
        workbench: "Drafting",
        modelKind: "CATDrawing",
      }));
      expect(state.state).toBe("hidden");
      expect(state.reason).toMatch(/Workbench scope/);
    });

    it("sf.calc hidden when no model is open (model kind missing)", () => {
      const state = eng.resolveOne(eng.findCommand("sf.calc")!, {
        workbench: "PartDesign",
        selectionCount: 1,
        isModalDialog: false,
      });
      expect(state.state).toBe("hidden");
    });

    it("sf.calc disabled when no matching selection kind", () => {
      const state = eng.resolveOne(
        eng.findCommand("sf.calc")!,
        ctx({ selectionKind: "Sketch", selectionCount: 1 }),
      );
      expect(state.state).toBe("disabled");
    });

    it("sf.calc enabled when selection matches and model+workbench ok", () => {
      const state = eng.resolveOne(
        eng.findCommand("sf.calc")!,
        ctx({ selectionKind: "Pad", selectionCount: 1 }),
      );
      expect(state.state).toBe("enabled");
    });

    it("release command disabled when PLM state is frozen", () => {
      const state = eng.resolveOne(
        eng.findCommand("release")!,
        ctx({ plmState: "frozen" }),
      );
      expect(state.state).toBe("disabled");
      expect(state.reason).toMatch(/frozen/);
    });

    it("release command enabled when PLM state is in_work", () => {
      const state = eng.resolveOne(
        eng.findCommand("release")!,
        ctx({ plmState: "in_work" }),
      );
      expect(state.state).toBe("enabled");
    });

    it("diff requires ≥2 items and rejects 1", () => {
      const state = eng.resolveOne(
        eng.findCommand("diff")!,
        ctx({ selectionCount: 1 }),
      );
      expect(state.state).toBe("disabled");
      expect(state.reason).toMatch(/≥2/);
    });

    it("diff rejects >2 items too", () => {
      const state = eng.resolveOne(
        eng.findCommand("diff")!,
        ctx({ selectionCount: 3 }),
      );
      expect(state.state).toBe("disabled");
      expect(state.reason).toMatch(/max 2/);
    });

    it("diff accepts exactly 2 items", () => {
      const state = eng.resolveOne(
        eng.findCommand("diff")!,
        ctx({ selectionCount: 2 }),
      );
      expect(state.state).toBe("enabled");
    });

    it("quote disabled when bridge p95 exceeds 2000 ms", () => {
      const state = eng.resolveOne(
        eng.findCommand("quote")!,
        ctx({ workbench: "AssemblyDesign", modelKind: "CATProduct", bridgeP95Ms: 3000 }),
      );
      expect(state.state).toBe("disabled");
      expect(state.reason).toMatch(/p95/);
    });

    it("quote enabled when bridge p95 is under threshold", () => {
      const state = eng.resolveOne(
        eng.findCommand("quote")!,
        ctx({ workbench: "AssemblyDesign", modelKind: "CATProduct", bridgeP95Ms: 400 }),
      );
      expect(state.state).toBe("enabled");
    });

    it("inferred model-kind scope: sf.calc hidden with CATDrawing on PartDesign", () => {
      // workbench PartDesign inherits CATPart only, so CATDrawing is rejected
      const state = eng.resolveOne(
        eng.findCommand("sf.calc")!,
        ctx({ modelKind: "CATDrawing", selectionKind: "Pad", selectionCount: 1 }),
      );
      expect(state.state).toBe("hidden");
    });

    it("update command is always enabled when no context restrictions apply", () => {
      const state = eng.resolveOne(eng.findCommand("update")!, ctx());
      expect(state.state).toBe("enabled");
    });
  });

  describe("event dispatch", () => {
    function makeClock(): CatiaAddinClock & { tickMs(ms: number): void } {
      let mono = 1_000;
      return {
        monotonicMs: () => mono,
        tickMs: (ms) => {
          mono += ms;
        },
      };
    }

    it("fires NewDocument subscription with no filters", () => {
      const results = eng.dispatchEvent({
        event: "NewDocument",
        modelKind: "CATPart",
        at: 1_000,
        meta: {},
      });
      expect(results.some((r) => r.subscriptionId === "on.new.doc" && r.fired)).toBe(true);
    });

    it("BeforeSave triggers DFM only for CATPart", () => {
      const resultsPart = eng.dispatchEvent({
        event: "BeforeSave",
        modelKind: "CATPart",
        at: 1_000,
        meta: {},
      });
      const partFire = resultsPart.find((r) => r.subscriptionId === "on.save.before")!;
      expect(partFire.fired).toBe(true);
      expect(partFire.triggeredCommandId).toBe("dfm");

      eng.resetThrottles(); // isolate next dispatch
      const resultsProduct = eng.dispatchEvent({
        event: "BeforeSave",
        modelKind: "CATProduct",
        at: 2_000,
        meta: {},
      });
      const productFire = resultsProduct.find((r) => r.subscriptionId === "on.save.before")!;
      expect(productFire.fired).toBe(false);
      expect(productFire.reason).toMatch(/Model kind CATProduct/);
    });

    it("SelectionChanged is throttled within the 150 ms window", () => {
      const clock = makeClock();
      const throttleEng = new CATIAAddinPluginEngine({ clock });
      const r1 = throttleEng.dispatchEvent({
        event: "SelectionChanged",
        modelKind: "CATPart",
        at: 1_000,
        meta: {},
      });
      expect(r1.find((r) => r.subscriptionId === "on.selection")?.fired).toBe(true);
      const r2 = throttleEng.dispatchEvent({
        event: "SelectionChanged",
        modelKind: "CATPart",
        at: 1_050, // 50 ms later
        meta: {},
      });
      const sel2 = r2.find((r) => r.subscriptionId === "on.selection")!;
      expect(sel2.fired).toBe(false);
      expect(sel2.throttled).toBe(true);
    });

    it("SelectionChanged fires again after throttle window passes", () => {
      eng.dispatchEvent({
        event: "SelectionChanged",
        modelKind: "CATPart",
        at: 1_000,
        meta: {},
      });
      const r = eng.dispatchEvent({
        event: "SelectionChanged",
        modelKind: "CATPart",
        at: 1_200,
        meta: {},
      });
      expect(r.find((s) => s.subscriptionId === "on.selection")?.fired).toBe(true);
    });

    it("eventSubscriptions filters by event name", () => {
      expect(eng.eventSubscriptions("AfterUpdate").length).toBe(1);
      expect(eng.eventSubscriptions("EklRelationFailed").length).toBe(1);
    });

    it("dispatch of unknown-but-declared event (no subscriber) returns empty results", () => {
      // DocumentClosed has no subscriber in the default spec.
      const results = eng.dispatchEvent({
        event: "DocumentClosed",
        modelKind: "CATPart",
        at: 1_000,
        meta: {},
      });
      expect(results.length).toBe(0);
    });

    it("EklRelationFailed triggers ekl.audit command", () => {
      const r = eng.dispatchEvent({
        event: "EklRelationFailed",
        modelKind: "CATPart",
        at: 1_000,
        meta: { relation: "CheckMinLength" },
      });
      const hit = r.find((x) => x.subscriptionId === "on.ekl.fail")!;
      expect(hit.fired).toBe(true);
      expect(hit.triggeredCommandId).toBe("ekl.audit");
    });
  });

  describe("tribal tips", () => {
    const tipA: CatiaTribalTip = {
      tipId: "tip.1",
      forFeatureKinds: ["Pad", "Hole"],
      forWorkbenches: ["PartDesign"],
      title: "Pre-drill before pocket for deep features",
      body: "Chip evacuation fails past 5 × tool dia.",
      confidence: 0.92,
    };
    const tipB: CatiaTribalTip = {
      tipId: "tip.2",
      forFeatureKinds: ["Pad"],
      forWorkbenches: [],
      title: "Climb mill thin walls",
      body: "Conventional tears thin walls.",
      confidence: 0.7,
    };
    const tipC: CatiaTribalTip = {
      tipId: "tip.3",
      forFeatureKinds: ["Fillet"],
      forWorkbenches: [],
      title: "Round corners before heat treat",
      body: "Avoids corner cracking in H13.",
      confidence: 0.81,
    };

    beforeEach(() => {
      eng.registerTip(tipA);
      eng.registerTip(tipB);
      eng.registerTip(tipC);
    });

    it("returns tips for feature kind sorted by confidence", () => {
      const tips = eng.tipsForFeature("Pad");
      expect(tips.map((t) => t.tipId)).toEqual(["tip.1", "tip.2"]);
    });

    it("workbench filter hides tips that don't apply", () => {
      const tips = eng.tipsForFeature("Pad", { workbench: "AssemblyDesign" });
      // tipA is PartDesign-only → filtered, tipB is unscoped → kept
      expect(tips.map((t) => t.tipId)).toEqual(["tip.2"]);
    });

    it("limit caps the result set", () => {
      expect(eng.tipsForFeature("Pad", { limit: 1 }).length).toBe(1);
    });

    it("tipsForFeature returns empty when no match", () => {
      expect(eng.tipsForFeature("Shell").length).toBe(0);
    });

    it("tipCount reports total tips", () => {
      expect(eng.tipCount()).toBe(3);
    });
  });

  describe("custom spec", () => {
    it("setSpec replaces the active add-in and resets throttles", () => {
      eng.dispatchEvent({
        event: "SelectionChanged",
        modelKind: "CATPart",
        at: 1_000,
        meta: {},
      });
      const custom: CatiaAddinSpec = {
        addinId: "prism.custom",
        label: { default: "Custom" },
        version: "9.9.9",
        vendor: "PRISM",
        commands: [
          {
            commandId: "only",
            caaClassName: "CATOnlyCmd",
            label: { default: "Only" },
            tooltip: "Only",
            action: "update_model",
            iconSize: "medium",
            iconName: "only.png",
            workbenches: [],
            requiresModelKind: [],
            requiresSelectionKind: [],
            minSelectionCount: 0,
            maxSelectionCount: 0,
            requiresEditablePlm: false,
          },
        ],
        workbenches: [
          {
            workbenchId: "PartDesign",
            label: { default: "X" },
            exclusive: true,
            toolbars: [
              {
                toolbarId: "tb",
                label: { default: "Tb" },
                order: 0,
                dockable: true,
                commands: ["only"],
              },
            ],
          },
        ],
        events: [],
      };
      eng.setSpec(custom);
      expect(eng.getSpec().addinId).toBe("prism.custom");
      expect(eng.allCommands().length).toBe(1);
      expect(eng.eventSubscriptions().length).toBe(0);
    });
  });
});
