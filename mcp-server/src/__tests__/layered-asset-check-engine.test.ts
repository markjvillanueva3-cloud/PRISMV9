/**
 * Tests for LayeredAssetCheckEngine (PP-INFRA-LAYERED-CHECK)
 */

import { describe, it, expect } from "vitest";
import {
  LayeredAssetCheckEngine,
  type NameCheckOutcome,
  type BandCheckOutcome,
  type NameChecker,
  type BandChecker,
} from "../engines/LayeredAssetCheckEngine.js";

function nameChecker(outcome: NameCheckOutcome): NameChecker {
  return () => outcome;
}
function asyncNameChecker(outcome: NameCheckOutcome): NameChecker {
  return async () => outcome;
}
function bandChecker(outcome: BandCheckOutcome): BandChecker {
  return () => outcome;
}
function throwingBand(): BandChecker {
  return () => {
    throw new Error("band checker must not be called for exact name match");
  };
}

describe("LayeredAssetCheckEngine", () => {
  describe("construction", () => {
    it("requires a name checker", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new LayeredAssetCheckEngine({} as any)).toThrow(/name/);
    });

    it("rejects non-function band checker", () => {
      expect(
        () =>
          new LayeredAssetCheckEngine({
            name: nameChecker({ match: "none" }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            band: "not a function" as any,
          })
      ).toThrow(/band/);
    });

    it("accepts a name checker alone (no band)", () => {
      expect(
        () => new LayeredAssetCheckEngine({ name: nameChecker({ match: "none" }) })
      ).not.toThrow();
    });
  });

  describe("input validation", () => {
    const engine = new LayeredAssetCheckEngine({ name: nameChecker({ match: "none" }) });

    it("rejects invalid type", async () => {
      await expect(() =>
        engine.check({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: "gadget" as any,
          proposedName: "X",
          description: "d",
        })
      ).rejects.toThrow(/type/);
    });

    it("rejects empty proposedName", async () => {
      await expect(() =>
        engine.check({ type: "engine", proposedName: "", description: "d" })
      ).rejects.toThrow(/proposedName/);
    });

    it("rejects non-array keywords", async () => {
      await expect(() =>
        engine.check({
          type: "engine",
          proposedName: "X",
          description: "d",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          keywords: "foo" as any,
        })
      ).rejects.toThrow(/keywords/);
    });
  });

  describe("exact name match — short-circuits", () => {
    it("returns block without calling band checker", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "exact", matchedName: "KienzleForceModel" }),
        band: throwingBand(),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "KienzleForceModel",
        description: "same thing",
      });
      expect(r.decision).toBe("block");
      expect(r.semanticLayer).toBeNull();
      expect(r.reason).toContain("exact name collision");
    });
  });

  describe("fuzzy name match", () => {
    it("fuzzy + red semantic → block", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "fuzzy", matchedName: "TransferLearning", similarity: 0.9 }),
        band: bandChecker({ band: "red", topMatchName: "TransferLearning", topSimilarity: 0.92 }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "TransferLearningBridge",
        description: "cross-domain transfer",
      });
      expect(r.decision).toBe("block");
      expect(r.reason).toMatch(/fuzzy name collision/);
      expect(r.reason).toMatch(/semantic red/);
    });

    it("fuzzy + green semantic → warn", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "fuzzy", matchedName: "TransferMachine", similarity: 0.88 }),
        band: bandChecker({ band: "green" }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "TransferLearningBridge",
        description: "different concept",
      });
      expect(r.decision).toBe("warn");
    });

    it("fuzzy alone (no band checker) → warn", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "fuzzy", matchedName: "FooEngine", similarity: 0.87 }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "FooThingEngine",
        description: "different",
      });
      expect(r.decision).toBe("warn");
      expect(r.semanticLayer).toBeNull();
    });

    it("reason includes matched asset name and formatted similarity", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "fuzzy", matchedName: "TransferLearning", similarity: 0.875 }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "TransferLearningBridge",
        description: "x",
      });
      expect(r.reason).toContain("TransferLearning");
      expect(r.reason).toContain("0.8750");
    });
  });

  describe("name clear — semantic layer decides", () => {
    it("no band checker → proceed", async () => {
      const engine = new LayeredAssetCheckEngine({ name: nameChecker({ match: "none" }) });
      const r = await engine.check({
        type: "engine",
        proposedName: "CompletelyNewThing",
        description: "d",
      });
      expect(r.decision).toBe("proceed");
      expect(r.semanticLayer).toBeNull();
    });

    it("band=green → proceed", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "none" }),
        band: bandChecker({ band: "green" }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "NewThing",
        description: "d",
      });
      expect(r.decision).toBe("proceed");
      expect(r.semanticLayer?.band).toBe("green");
    });

    it("band=yellow → warn", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "none" }),
        band: bandChecker({
          band: "yellow",
          topMatchName: "BorderlineAsset",
          topSimilarity: 0.78,
        }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "NewThing",
        description: "d",
      });
      expect(r.decision).toBe("warn");
      expect(r.reason).toMatch(/borderline/);
      expect(r.reason).toContain("BorderlineAsset");
    });

    it("band=red → block", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "none" }),
        band: bandChecker({
          band: "red",
          topMatchName: "ExistingAsset",
          topSimilarity: 0.91,
        }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "NewThing",
        description: "d",
      });
      expect(r.decision).toBe("block");
      expect(r.reason).toMatch(/semantic duplicate/);
      expect(r.recommendation).toMatch(/extend|justify/);
    });
  });

  describe("async checkers", () => {
    it("awaits async name checker", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: asyncNameChecker({ match: "exact", matchedName: "X" }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "X",
        description: "d",
      });
      expect(r.decision).toBe("block");
    });

    it("awaits async band checker", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "none" }),
        band: async () => ({ band: "red", topMatchName: "Z", topSimilarity: 0.99 }),
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "New",
        description: "d",
      });
      expect(r.decision).toBe("block");
    });
  });

  describe("result shape", () => {
    it("always returns all layer outcomes in the result", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "none" }),
        band: bandChecker({ band: "yellow", topMatchName: "Z", topSimilarity: 0.77 }),
      });
      const r = await engine.check({
        type: "action",
        proposedName: "NewAction",
        description: "d",
      });
      expect(r.nameLayer).toBeDefined();
      expect(r.semanticLayer).toBeDefined();
      expect(r.recommendation.length).toBeGreaterThan(0);
    });

    it("formatSim handles missing similarity gracefully", async () => {
      const engine = new LayeredAssetCheckEngine({
        name: nameChecker({ match: "fuzzy", matchedName: "X" }), // no similarity field
      });
      const r = await engine.check({
        type: "engine",
        proposedName: "Y",
        description: "d",
      });
      expect(r.reason).toContain("?");
    });
  });
});
