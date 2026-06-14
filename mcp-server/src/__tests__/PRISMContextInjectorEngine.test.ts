/**
 * PRISMContextInjectorEngine.test.ts — per-engine test split for the
 * U-GO-C6 wiring-enforce Stop gate (one test file per engine name).
 *
 * Covers composeContext (pure) + buildContext (lazy-imports the real
 * master-index search lib). 13 tests, all hard-asserted.
 */

import { describe, it, expect } from "vitest";
import {
  composeContext,
  prismContextInjectorEngine,
  PRISMContextInjectorEngine,
} from "../engines/PRISMContextInjectorEngine.js";

// ───────────────────────────────────────────────────────────────────────────
// composeContext — pure
// ───────────────────────────────────────────────────────────────────────────

describe("composeContext — pure", () => {
  it("returns empty text + facts on empty hits", () => {
    const r = composeContext([], 2000, "ask");
    expect(r.text).toBe("");
    expect(r.facts).toEqual([]);
    expect(r.budget).toBe(2000);
    expect(r.prompt).toBe("ask");
  });

  it("returns empty text on non-array hits (defensive)", () => {
    const r = composeContext(null as unknown as unknown[], 2000, "ask");
    expect(r.text).toBe("");
    expect(r.facts).toEqual([]);
  });

  it("composes a markdown blob from valid hits with layer/status/label/info", () => {
    const r = composeContext(
      [
        { layer: "L7", status: "built", label: "KienzleForceEngine", info: "Cutting-force model" },
        { layer: "L10", status: "wiki", id: "kienzle-physics", info: "" },
      ],
      2000,
      "kienzle?",
    );
    expect(r.text).toContain("### Relevant PRISM context");
    expect(r.text).toContain("[L7/built] KienzleForceEngine");
    expect(r.text).toContain("Cutting-force model");
    expect(r.text).toContain("[L10/wiki] kienzle-physics");
    expect(r.facts).toEqual(["KienzleForceEngine", "kienzle-physics"]);
  });

  it("falls back to '?' placeholders for hits missing fields", () => {
    const r = composeContext([{ id: "only-id" }, { label: "only-label" }, {}], 2000, "x");
    expect(r.text).toContain("[?/?] only-id");
    expect(r.text).toContain("[?/?] only-label");
    expect(r.text).toContain("[?/?] ?");
  });

  it("truncates with ellipsis when the blob exceeds the budget AND preserves the head", () => {
    const huge = Array.from({ length: 50 }, (_, i) => ({
      layer: "L7", status: "built", label: `x`.repeat(200), id: `n${i}`, info: "y".repeat(200),
    }));
    const r = composeContext(huge, 500, "x");
    expect(r.text.length).toBeLessThanOrEqual(500);
    expect(r.text.endsWith("…")).toBe(true);
    expect(r.text.startsWith("### Relevant PRISM context")).toBe(true);
    expect(r.text).toContain("[L7/built]");
  });

  it("missing keys falls back to 'this file'", () => {
    const out = composeContext([{ layer: "L7", id: "n1", info: "" }], 2000, "");
    expect(out.text).toContain("### Relevant PRISM context");
  });

  it("skips null/non-object entries in the hits array (defensive)", () => {
    const r = composeContext(
      [null, "string", 42, { layer: "L7", status: "built", label: "Engine" }] as unknown[],
      2000,
      "ok",
    );
    expect(r.facts).toEqual(["Engine"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// buildContext — lazy lib import + budget clamping
// ───────────────────────────────────────────────────────────────────────────

describe("PRISMContextInjectorEngine.buildContext — fail-open", () => {
  it("returns an empty context for an empty prompt", async () => {
    const r = await prismContextInjectorEngine.buildContext("");
    expect(r.text).toBe("");
    expect(r.facts).toEqual([]);
    expect(r.prompt).toBe("");
  });

  it("clamps a negative / non-finite modelBudget to the DEFAULT_BUDGET", async () => {
    const r = await prismContextInjectorEngine.buildContext("", { modelBudget: -100 });
    expect(r.budget).toBe(2000);
  });

  it("clamps an oversize modelBudget to the MAX_BUDGET", async () => {
    const r = await prismContextInjectorEngine.buildContext("", { modelBudget: 999_999 });
    expect(r.budget).toBe(8000);
  });

  it("clamps a NaN modelBudget to the default", async () => {
    const r = await prismContextInjectorEngine.buildContext("", { modelBudget: Number.NaN });
    expect(r.budget).toBe(2000);
  });

  it("CLAMPS UP a small modelBudget to MIN_BUDGET", async () => {
    const r = await prismContextInjectorEngine.buildContext("", { modelBudget: 50 });
    expect(r.budget).toBe(200);
  });

  it("returns a real InjectedContext for a high-certainty prompt — hard-asserts lib integration", async () => {
    const r = await prismContextInjectorEngine.buildContext("kienzle cutting force model");
    expect(typeof r.text).toBe("string");
    expect(Array.isArray(r.facts)).toBe(true);
    expect(r.budget).toBeGreaterThan(0);
    expect(r.prompt).toBe("kienzle cutting force model");
    const populated = r.facts.length > 0 && r.text.startsWith("### Relevant PRISM context");
    const failOpenEmpty = r.facts.length === 0 && r.text === "";
    expect(populated || failOpenEmpty).toBe(true);
    expect(populated).toBe(true); // R12 fail-loud on healthy graph
  });

  it("exposes the class constructor for downstream wiring", () => {
    expect(typeof PRISMContextInjectorEngine).toBe("function");
    const fresh = new PRISMContextInjectorEngine();
    expect(typeof fresh.buildContext).toBe("function");
  });
});
