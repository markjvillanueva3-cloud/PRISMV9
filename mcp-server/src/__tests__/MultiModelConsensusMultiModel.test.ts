// MultiModelConsensusMultiModel.test.ts
//
// OCTOPUS-HERMES-MULTIMODEL + OCTOPUS-HERMES-AGENTS -- normalizeHermesGrokModels is the pure
// de-dupe/trim guard that prevents seating the same voice twice (R7), now extended so each entry is
// a bare model string OR an agent spec {model, system?, name?}: a persona voice with its own
// system-prompt + a label so N personas on ONE model are N DISTINCT voices. Tested without any
// network. The seating + ledger halves are proven by the dispatch-mapper tests + live tsx validation.

import { describe, it, expect } from "vitest";
import {
  normalizeHermesGrokModels,
  hermesAgentLenses,
  shouldSeatHermesLenses,
  resolveHermesVoices,
} from "../engines/MultiModelConsensusEngine.js";

describe("normalizeHermesGrokModels (OCTOPUS-HERMES-MULTIMODEL / -AGENTS)", () => {
  it("dedupes repeated models -- R7, never double-weight one voice", () => {
    expect(normalizeHermesGrokModels(["grok-4.3", "grok-4.3", "grok-build-0.1"])).toEqual([
      { model: "grok-4.3" },
      { model: "grok-build-0.1" },
    ]);
  });

  it("trims surrounding whitespace and drops empty/whitespace-only entries", () => {
    expect(normalizeHermesGrokModels([" grok-4.3 ", "", "   ", "grok-build-0.1"])).toEqual([
      { model: "grok-4.3" },
      { model: "grok-build-0.1" },
    ]);
  });

  it("drops invalid entries (no model string); a spec WITH a model survives", () => {
    expect(
      normalizeHermesGrokModels([
        "grok-4.3",
        42 as unknown as string,
        null as unknown as string,
        undefined as unknown as string,
        {} as unknown as string, // object without a `model` -> dropped
        { model: "grok-build-0.1" }, // valid spec -> kept
      ]),
    ).toEqual([{ model: "grok-4.3" }, { model: "grok-build-0.1" }]);
  });

  it("undefined / non-array input -> []", () => {
    expect(normalizeHermesGrokModels(undefined)).toEqual([]);
    expect(normalizeHermesGrokModels("grok-4.3" as unknown as string[])).toEqual([]);
  });

  it("preserves first-seen order across duplicates", () => {
    expect(normalizeHermesGrokModels(["c", "a", "b", "a", "c"])).toEqual([
      { model: "c" },
      { model: "a" },
      { model: "b" },
    ]);
  });

  it("empty array -> []", () => {
    expect(normalizeHermesGrokModels([])).toEqual([]);
  });

  // OCTOPUS-HERMES-AGENTS: persona voices
  it("carries the persona system + name from an agent spec; trims them", () => {
    expect(
      normalizeHermesGrokModels([{ model: "grok-4.3", system: "  be skeptical  ", name: " adversarial " }]),
    ).toEqual([{ model: "grok-4.3", system: "be skeptical", name: "adversarial" }]);
  });

  it("TWO distinct personas on the SAME model are BOTH kept (distinct names = distinct voices)", () => {
    expect(
      normalizeHermesGrokModels([
        { model: "grok-4.3", system: "safety", name: "safety-first" },
        { model: "grok-4.3", system: "refute", name: "adversarial" },
      ]),
    ).toEqual([
      { model: "grok-4.3", system: "safety", name: "safety-first" },
      { model: "grok-4.3", system: "refute", name: "adversarial" },
    ]);
  });

  it("dedupes by voice IDENTITY (name) -- same name twice is one voice (R7)", () => {
    expect(
      normalizeHermesGrokModels([
        { model: "grok-4.3", name: "safety-first", system: "a" },
        { model: "grok-build-0.1", name: "safety-first", system: "b" }, // same name -> dropped
      ]),
    ).toEqual([{ model: "grok-4.3", system: "a", name: "safety-first" }]);
  });

  it("empty system/name on a spec -> omitted (model-only voice, back-compat shape)", () => {
    expect(normalizeHermesGrokModels([{ model: "grok-4.3", system: "  ", name: "" }])).toEqual([
      { model: "grok-4.3" },
    ]);
  });
});

describe("hermesAgentLenses (default 5-lens persona panel)", () => {
  it("returns 5 distinct-named persona voices, all on one model, each with a system prompt", () => {
    const v = hermesAgentLenses("grok-4.3");
    expect(v).toHaveLength(5);
    expect(v.every((x) => x.model === "grok-4.3")).toBe(true);
    expect(v.every((x) => typeof x.system === "string" && x.system.length > 0)).toBe(true);
    expect(new Set(v.map((x) => x.name)).size).toBe(5); // all distinct -> 5 distinct voices
    expect(v.map((x) => x.name)).toEqual([
      "safety-first",
      "root-cause",
      "fastest-unblock",
      "distributed-ownership",
      "adversarial",
    ]);
  });

  it("round-trips through normalizeHermesGrokModels as 5 distinct voices", () => {
    expect(normalizeHermesGrokModels(hermesAgentLenses("grok-4.3"))).toHaveLength(5);
  });
});

describe("shouldSeatHermesLenses (OCTOPUS-HERMES-AGENTS default-ON, operator max-pro 2026-06-25)", () => {
  it("DEFAULT ON: silent caller + no knob -> true (drastically increase utilization)", () => {
    expect(shouldSeatHermesLenses(undefined, undefined)).toBe(true);
  });
  it("global knob PRISM_OCTOPUS_HERMES_AGENTS=0 opts out when the caller is silent", () => {
    expect(shouldSeatHermesLenses(undefined, "0")).toBe(false);
  });
  it("explicit false wins (opt-out), even with no knob", () => {
    expect(shouldSeatHermesLenses(false, undefined)).toBe(false);
  });
  it("explicit true wins -- overrides the global knob (per-call beats global)", () => {
    expect(shouldSeatHermesLenses(true, "0")).toBe(true);
  });
  it("knob set to anything but '0' does NOT opt out", () => {
    expect(shouldSeatHermesLenses(undefined, "1")).toBe(true);
  });
});

describe("resolveHermesVoices (merge explicit specs + default lens panel)", () => {
  it("seatLenses:true with no explicit -> the 5 lens voices", () => {
    expect(resolveHermesVoices({ seatLenses: true, lensModel: "grok-4.3" })).toHaveLength(5);
  });
  it("seatLenses:false -> only the explicit voices (no panel)", () => {
    expect(resolveHermesVoices({ hermesGrokModels: ["grok-4.3"], seatLenses: false })).toEqual([{ model: "grok-4.3" }]);
  });
  it("seatLenses:false + nothing -> []", () => {
    expect(resolveHermesVoices({ seatLenses: false })).toEqual([]);
  });
  it("an explicit voice sharing a lens NAME overrides that lens (first-seen wins) -> still 5 total", () => {
    const out = resolveHermesVoices({
      hermesGrokModels: [{ model: "grok-build-0.1", name: "adversarial", system: "custom refuter" }],
      seatLenses: true,
      lensModel: "grok-4.3",
    });
    expect(out).toHaveLength(5); // explicit adversarial replaces the default adversarial lens (dedup by name)
    const adv = out.find((v) => v.name === "adversarial");
    expect(adv).toEqual({ model: "grok-build-0.1", name: "adversarial", system: "custom refuter" });
  });
});
