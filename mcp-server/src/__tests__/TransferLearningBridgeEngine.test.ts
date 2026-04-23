import { describe, it, expect, beforeEach } from "vitest";
import {
  TransferLearningBridgeEngine,
  type SolvedProblem,
} from "../engines/TransferLearningBridgeEngine.js";

const seed: readonly SolvedProblem[] = [
  {
    id: "mill-adaptive-spindle-load",
    domain: "milling",
    title: "Adaptive spindle load control under variable DOC",
    description:
      "Milling with a variable depth-of-cut pocket caused spindle load spikes that tripped the overload. Solved by adaptive feedrate override driven by real-time spindle power sampling at 1 kHz and a PI controller clamping feed between 30% and 150% of nominal.",
    tags: ["adaptive", "spindle", "load", "pi-controller", "feedrate-override"],
    solution:
      "1 kHz spindle power sampling + PI controller clamping feed override to [0.3, 1.5]× nominal, tripped below 85% of motor rating.",
  },
  {
    id: "turn-adaptive-rpm-thin-wall",
    domain: "turning",
    title: "Adaptive RPM on thin-wall shafts to suppress chatter",
    description:
      "Finish turning a long thin-wall shaft produced chatter at the rear bearing. Fixed by spindle speed variation (sinusoidal ±7% around nominal, 2 Hz) to break up regenerative feedback, plus coolant pressure boost at the tool.",
    tags: ["adaptive", "spindle", "chatter", "sinusoidal-variation"],
    solution: "Spindle speed variation ±7% at 2 Hz breaks regenerative chatter on slender parts.",
  },
  {
    id: "grind-adaptive-infeed-burn",
    domain: "grinding",
    title: "Adaptive infeed to avoid thermal burn on hardened steel",
    description:
      "Surface grinding M2 tool steel at 62 HRC with a new wheel would burn during sparkout. Solved with infeed ramped by measured spindle power — held below 4 kW at the workpiece to stay below the burn threshold documented in Malkin.",
    tags: ["adaptive", "infeed", "thermal-burn", "spindle-power"],
    solution: "Infeed ramp gated on spindle power ≤4 kW prevents burn on 62 HRC M2.",
  },
  {
    id: "wedm-adaptive-servo-gap",
    domain: "wire-edm",
    title: "Adaptive servo voltage for tall-part gap stability",
    description:
      "Wire EDM cutting 150 mm tall D2 would wire-break at ~60% depth. Solved by adaptive servo voltage — drop gap voltage by 8% when average ignition delay exceeds 3 µs, tightening the gap.",
    tags: ["adaptive", "servo", "gap-voltage", "wire-break"],
    solution: "Servo voltage −8% when ignition delay >3µs stabilises tall-part cuts.",
  },
  {
    id: "weld-adaptive-current-gap",
    domain: "welding",
    title: "Adaptive MIG current on variable gap fit-up",
    description:
      "MIG robot welding with ±1.5mm gap variation caused burn-through or cold lap. Fixed with seam-tracking laser driving current scaling ±15% proportional to measured gap width.",
    tags: ["adaptive", "current", "seam-tracking", "gap"],
    solution: "Laser seam-tracking → current ±15% proportional to gap eliminates burn-through.",
  },
  {
    id: "mill-thermal-growth-zero",
    domain: "milling",
    title: "Compensate thermal growth during 6h production run",
    description:
      "Long run dropping to Z zero overnight drifts 18 µm. Fixed with Renishaw probe zeroing every 30 min and linear correction in fixture offset G54.2.",
    tags: ["thermal", "compensation", "probing"],
    solution: "30-minute probe zeroing keeps Z within 3 µm over 6h.",
  },
];

describe("TransferLearningBridgeEngine", () => {
  let engine: TransferLearningBridgeEngine;

  beforeEach(() => {
    engine = new TransferLearningBridgeEngine();
    engine.registerMany(seed);
  });

  it("registers and reports size", () => {
    expect(engine.size()).toBe(seed.length);
  });

  it("list returns all in stable id order", () => {
    const ids = engine.list().map((p) => p.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("rejects invalid problems", () => {
    const e = new TransferLearningBridgeEngine();
    expect(() => e.register({ ...seed[0], id: "" })).toThrow(/id required/);
    expect(() => e.register({ ...seed[0], domain: "" })).toThrow(/domain required/);
    expect(() => e.register({ ...seed[0], title: "" })).toThrow(/title required/);
    expect(() => e.register({ ...seed[0], description: "" })).toThrow(/description required/);
    expect(() => e.register({ ...seed[0], solution: "" })).toThrow(/solution required/);
  });

  it("rejects empty query", () => {
    expect(() => engine.findAnalogies("")).toThrow(/query description required/);
    expect(() => engine.findAnalogies({ description: "   " })).toThrow();
  });

  // ─── Phase 0.18 U-AGI3 Exit Gate ──────────────────────────────────
  it('exit gate: findAnalogies("adaptive spindle") returns ≥1 cross-domain match', () => {
    const start = Date.now();
    const matches = engine.findAnalogies({
      description: "adaptive spindle",
      domain: "milling",
    });
    const elapsed = Date.now() - start;

    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.some((m) => m.crossDomain)).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });

  it("ranks semantically closer problems higher", () => {
    const matches = engine.findAnalogies({
      description: "adaptive spindle load override with power sampling",
      domain: "turning",
    });
    expect(matches.length).toBeGreaterThan(0);
    // The milling spindle-load problem shares "adaptive", "spindle", "load", "override",
    // "power", "sampling" — it must outrank any cold-start thermal match.
    expect(matches[0].problem.id).toBe("mill-adaptive-spindle-load");
  });

  it("cross-domain boost actually flips rank when scores are near-tied", () => {
    // Same-domain near-tie vs. cross-domain near-tie → cross-domain wins.
    const e = new TransferLearningBridgeEngine();
    e.register({
      id: "same-dom",
      domain: "milling",
      title: "Adaptive spindle load same-domain",
      description: "adaptive spindle load control milling",
      tags: ["adaptive", "spindle"],
      solution: "x",
    });
    e.register({
      id: "cross-dom",
      domain: "turning",
      title: "Adaptive spindle load cross-domain",
      description: "adaptive spindle load control milling",
      tags: ["adaptive", "spindle"],
      solution: "x",
    });
    const matches = e.findAnalogies({ description: "adaptive spindle load control milling", domain: "milling" });
    expect(matches[0].problem.id).toBe("cross-dom");
    expect(matches[0].crossDomain).toBe(true);
  });

  it("crossDomainOnly filters out same-domain problems", () => {
    const all = engine.findAnalogies({ description: "adaptive spindle", domain: "milling" });
    const cross = engine.findAnalogies(
      { description: "adaptive spindle", domain: "milling" },
      { crossDomainOnly: true },
    );
    expect(cross.every((m) => m.crossDomain)).toBe(true);
    expect(cross.every((m) => m.problem.domain !== "milling")).toBe(true);
    expect(cross.length).toBeLessThan(all.length);
  });

  it("returns empty for minScore above all candidates", () => {
    const matches = engine.findAnalogies(
      { description: "adaptive spindle" },
      { minScore: 0.99 },
    );
    expect(matches).toEqual([]);
  });

  it("respects limit", () => {
    const matches = engine.findAnalogies({ description: "adaptive", domain: "milling" }, { limit: 2 });
    expect(matches.length).toBeLessThanOrEqual(2);
  });

  it("tag overlap raises score via Jaccard term", () => {
    const noTags = engine.findAnalogies({ description: "adaptive spindle load", domain: "turning" });
    const withTags = engine.findAnalogies({
      description: "adaptive spindle load",
      domain: "turning",
      tags: ["adaptive", "spindle", "load", "pi-controller"],
    });
    const a = noTags.find((m) => m.problem.id === "mill-adaptive-spindle-load")!;
    const b = withTags.find((m) => m.problem.id === "mill-adaptive-spindle-load")!;
    expect(b.jaccard).toBeGreaterThan(a.jaccard);
    expect(b.score).toBeGreaterThan(a.score);
  });

  it("idempotent registration (same id overwrites)", () => {
    const before = engine.size();
    engine.register({ ...seed[0], title: "Updated title" });
    expect(engine.size()).toBe(before);
    const got = engine.list().find((p) => p.id === seed[0].id)!;
    expect(got.title).toBe("Updated title");
  });

  it("clear resets state", () => {
    engine.clear();
    expect(engine.size()).toBe(0);
    expect(engine.list()).toEqual([]);
  });

  it("unrelated query produces low scores", () => {
    // Nothing in the seed mentions "calibrate probe touch offset". The
    // milling thermal-growth problem mentions probing, but other fields
    // dominate — expect all scores comfortably below 1.0.
    const matches = engine.findAnalogies({ description: "purchase order approval workflow" });
    expect(matches.every((m) => m.score < 0.5)).toBe(true);
  });
});
