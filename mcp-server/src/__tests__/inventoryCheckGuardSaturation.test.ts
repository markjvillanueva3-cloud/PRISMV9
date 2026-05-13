/**
 * inventory-check-guard saturation arm — U-AWARE02 close-out.
 *
 * Verifies detectSaturatedCategories() (pure function exported for testing
 * by the hook script) fires only when the user prompt names a category AND
 * that category exceeds its saturation threshold.
 *
 * Hook lives at `.claude/hooks/inventory-check-guard.mjs` (off the
 * mcp-server tsconfig path), so we import it via the absolute file URL.
 */
import { describe, it, expect } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Set lib mode BEFORE import so the side-effecting hook entrypoint is skipped.
process.env.PRISM_INVENTORY_GUARD_AS_LIB = "1";

const HOOK_URL = pathToFileURL(
  resolve("H:/prism/.claude/hooks/inventory-check-guard.mjs"),
).href;

const mod = (await import(/* @vite-ignore */ HOOK_URL)) as {
  detectSaturatedCategories: (
    inv: Record<string, unknown> | null,
    message: string,
  ) => Array<{ key: string; count: number; threshold: number }> | null;
  SATURATION_THRESHOLDS: Readonly<Record<string, number>>;
};

const { detectSaturatedCategories, SATURATION_THRESHOLDS } = mod;

describe("detectSaturatedCategories — input guards", () => {
  it("returns null when inv is null (inventory missing)", () => {
    const r = detectSaturatedCategories(null, "create a new engine");
    expect(r).toBe(null);
  });

  it("returns null when message is empty", () => {
    const r = detectSaturatedCategories({ engines: 10000 }, "");
    expect(r).toBe(null);
  });

  it("returns null when message names no recognized category", () => {
    const r = detectSaturatedCategories({ engines: 10000 }, "make breakfast");
    expect(r).toBe(null);
  });
});

describe("detectSaturatedCategories — threshold gating", () => {
  it("does NOT fire when category count is below threshold", () => {
    const r = detectSaturatedCategories(
      { engines: SATURATION_THRESHOLDS.engines - 1 },
      "create a new engine",
    );
    expect(r).toBe(null);
  });

  it("does NOT fire when count exactly equals threshold (strict >)", () => {
    const r = detectSaturatedCategories(
      { engines: SATURATION_THRESHOLDS.engines },
      "create a new engine",
    );
    expect(r).toBe(null);
  });

  it("FIRES when count exceeds threshold AND keyword present", () => {
    const r = detectSaturatedCategories(
      { engines: SATURATION_THRESHOLDS.engines + 1 },
      "create a new engine",
    );
    expect(r === null).toBe(false);
    expect(Array.isArray(r)).toBe(true);
    expect(r!.length).toBe(1);
    expect(r![0].key).toBe("engines");
    expect(r![0].count).toBe(SATURATION_THRESHOLDS.engines + 1);
    expect(r![0].threshold).toBe(SATURATION_THRESHOLDS.engines);
  });

  it("does NOT fire when threshold is exceeded but the user didn't name the category", () => {
    const r = detectSaturatedCategories(
      { engines: SATURATION_THRESHOLDS.engines + 1000 },
      "I would like coffee",
    );
    expect(r).toBe(null);
  });
});

describe("detectSaturatedCategories — multi-category & word boundaries", () => {
  it("fires for BOTH categories when message names both and both saturated", () => {
    const r = detectSaturatedCategories(
      {
        engines: SATURATION_THRESHOLDS.engines + 1,
        dispatchers: SATURATION_THRESHOLDS.dispatchers + 1,
      },
      "I want to create an engine and also a new dispatcher",
    );
    expect(r === null).toBe(false);
    expect(r!.length).toBe(2);
    const keys = r!.map((h) => h.key).sort();
    expect(keys).toEqual(["dispatchers", "engines"]);
  });

  it("only fires for the saturated category when one is below threshold", () => {
    const r = detectSaturatedCategories(
      {
        engines: SATURATION_THRESHOLDS.engines + 1,
        dispatchers: SATURATION_THRESHOLDS.dispatchers - 1,
      },
      "create an engine and a dispatcher",
    );
    expect(r === null).toBe(false);
    expect(r!.length).toBe(1);
    expect(r![0].key).toBe("engines");
  });

  it("word-boundary regex does NOT match 'engineering' as 'engine' intent", () => {
    const r = detectSaturatedCategories(
      { engines: SATURATION_THRESHOLDS.engines + 1 },
      "we should explore engineering principles",
    );
    expect(r).toBe(null);
  });

  it("word-boundary regex does NOT match 'actionable' as 'action' intent", () => {
    const r = detectSaturatedCategories(
      { actions: SATURATION_THRESHOLDS.actions + 1 },
      "the report should be actionable",
    );
    expect(r).toBe(null);
  });

  it("plural 'engines' triggers the engines category", () => {
    const r = detectSaturatedCategories(
      { engines: SATURATION_THRESHOLDS.engines + 1 },
      "we have too many engines already",
    );
    expect(r === null).toBe(false);
    expect(r![0].key).toBe("engines");
  });
});

describe("detectSaturatedCategories — defensive numeric coercion", () => {
  it("treats missing category count as 0 (never saturated)", () => {
    const r = detectSaturatedCategories({}, "create a hook");
    expect(r).toBe(null);
  });

  it("treats stringified count as a number", () => {
    const r = detectSaturatedCategories(
      { engines: String(SATURATION_THRESHOLDS.engines + 100) },
      "create a new engine",
    );
    expect(r === null).toBe(false);
    expect(r![0].count).toBe(SATURATION_THRESHOLDS.engines + 100);
  });

  it("rejects NaN-coerced category count (returns 0, no fire)", () => {
    const r = detectSaturatedCategories(
      { engines: "not-a-number" },
      "create a new engine",
    );
    expect(r).toBe(null);
  });
});

describe("SATURATION_THRESHOLDS — structural invariants", () => {
  it("freezes thresholds (catches accidental mutation)", () => {
    expect(Object.isFrozen(SATURATION_THRESHOLDS)).toBe(true);
  });

  it("includes the 6 expected categories with positive integers", () => {
    const expected = ["engines", "dispatchers", "actions", "algorithms", "hooks_registry", "skills"];
    for (const k of expected) {
      const v = SATURATION_THRESHOLDS[k];
      expect(typeof v).toBe("number");
      expect(v > 0).toBe(true);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
