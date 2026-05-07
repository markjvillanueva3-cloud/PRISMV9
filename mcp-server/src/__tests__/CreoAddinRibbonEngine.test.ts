/**
 * CreoAddinRibbonEngine.test.ts — U-CAD-APP-02 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreoAddinRibbonEngine } from "../engines/CreoAddinRibbonEngine.js";
import type { TribalTip } from "../schemas/cadCreoRibbonSchema.js";

describe("CreoAddinRibbonEngine (U-CAD-APP-02)", () => {
  let eng: CreoAddinRibbonEngine;

  beforeEach(() => {
    eng = new CreoAddinRibbonEngine();
  });

  describe("default spec", () => {
    it("has four groups in order", () => {
      const spec = eng.getSpec();
      expect(spec.groups.map((g) => g.groupId)).toEqual([
        "programming",
        "quality",
        "cost",
        "system",
      ]);
    });

    it("exposes expected buttons", () => {
      expect(eng.findButton("sf.calc")?.label).toBe("Speed/Feed");
      expect(eng.findButton("dfm")?.action).toBe("run_dfm");
      expect(eng.findButton("regen")).toBeDefined();
      expect(eng.findButton("nonexistent")).toBeUndefined();
    });

    it("allButtons returns all 10", () => {
      expect(eng.allButtons().length).toBe(10);
    });
  });

  describe("activation resolution", () => {
    it("all buttons disabled when modal dialog is open", () => {
      const states = eng.resolve({
        modelKind: "part",
        isModalDialog: true,
      });
      expect(states.every((s) => s.state === "disabled")).toBe(true);
      expect(states.every((s) => s.reason.includes("modal"))).toBe(true);
    });

    it("sf.calc hidden when model kind missing", () => {
      const state = eng.resolveOne(eng.findButton("sf.calc")!, {
        isModalDialog: false,
      });
      expect(state.state).toBe("hidden");
    });

    it("sf.calc hidden when model kind is drawing", () => {
      const state = eng.resolveOne(eng.findButton("sf.calc")!, {
        modelKind: "drawing",
        selectionKind: "extrude",
        isModalDialog: false,
      });
      expect(state.state).toBe("hidden");
    });

    it("sf.calc disabled when no matching selection", () => {
      const state = eng.resolveOne(eng.findButton("sf.calc")!, {
        modelKind: "part",
        selectionKind: "sketch",
        isModalDialog: false,
      });
      expect(state.state).toBe("disabled");
    });

    it("sf.calc enabled when selection + model ok", () => {
      const state = eng.resolveOne(eng.findButton("sf.calc")!, {
        modelKind: "part",
        selectionKind: "extrude",
        isModalDialog: false,
      });
      expect(state.state).toBe("enabled");
    });

    it("quote disabled when bridge p95 exceeds threshold", () => {
      const state = eng.resolveOne(eng.findButton("quote")!, {
        modelKind: "part",
        bridgeP95Ms: 3000,
        isModalDialog: false,
      });
      expect(state.state).toBe("disabled");
      expect(state.reason).toMatch(/p95/);
    });

    it("quote enabled when bridge p95 under threshold", () => {
      const state = eng.resolveOne(eng.findButton("quote")!, {
        modelKind: "part",
        bridgeP95Ms: 500,
        isModalDialog: false,
      });
      expect(state.state).toBe("enabled");
    });

    it("regen button with no requirements is always enabled outside modal", () => {
      const state = eng.resolveOne(eng.findButton("regen")!, {
        isModalDialog: false,
      });
      expect(state.state).toBe("enabled");
    });
  });

  describe("tribal tips", () => {
    const tipA: TribalTip = {
      tipId: "tip.1",
      forFeatureKinds: ["extrude", "hole"],
      title: "Use peck drilling on L/D > 5",
      body: "Chip evacuation is the failure mode.",
      confidence: 0.9,
    };
    const tipB: TribalTip = {
      tipId: "tip.2",
      forFeatureKinds: ["extrude"],
      title: "Climb mill thin-wall pockets",
      body: "Conventional milling tears thin walls.",
      confidence: 0.7,
    };
    const tipC: TribalTip = {
      tipId: "tip.3",
      forFeatureKinds: ["round"],
      title: "Round corners before heat treat",
      body: "Avoids cracking.",
      confidence: 0.8,
    };

    beforeEach(() => {
      eng.registerTip(tipA);
      eng.registerTip(tipB);
      eng.registerTip(tipC);
    });

    it("returns tips matching feature kind", () => {
      const tips = eng.tipsForFeature("extrude");
      expect(tips.length).toBe(2);
      expect(tips[0].tipId).toBe("tip.1"); // higher confidence first
    });

    it("returns empty for unmatched kind", () => {
      expect(eng.tipsForFeature("shell").length).toBe(0);
    });

    it("respects limit", () => {
      expect(eng.tipsForFeature("extrude", 1).length).toBe(1);
    });

    it("tipCount reports total tips", () => {
      expect(eng.tipCount()).toBe(3);
    });
  });

  describe("custom spec", () => {
    it("setSpec replaces the active ribbon", () => {
      eng.setSpec({
        tabId: "custom.tab",
        label: "Custom",
        version: "1.0.0",
        groups: [
          {
            groupId: "g",
            label: "G",
            order: 0,
            buttons: [
              {
                buttonId: "b",
                label: "B",
                tooltip: "b",
                action: "regenerate",
                iconSize: "medium",
              },
            ],
          },
        ],
      });
      expect(eng.allButtons().length).toBe(1);
      expect(eng.getSpec().tabId).toBe("custom.tab");
    });
  });
});
