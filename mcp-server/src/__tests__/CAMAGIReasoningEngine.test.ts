/**
 * CAMAGIReasoningEngine tests — production surface (U-CAM76)
 * ===========================================================================
 * Coverage:
 *   - Happy: each of context-overlap / capability-bias / template-hint paths
 *   - 3 failure modes: unknown CAM, no options, no scoring overlap (zero-confidence)
 *   - 2+ adversarial: empty context, options with NaN-like content, oversize options list
 *   - 3+ spanning CAMs: hyperMILL, Mastercam, SolidCAM (PowerMill, NX-CAM)
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMAGIReasoningEngine,
  camAGIReasoningEngine,
} from "../engines/CAMAGIReasoningEngine.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const reasoner = new CAMAGIReasoningEngine(loader);

describe("CAMAGIReasoningEngine — construction", () => {
  it("constructs and exposes reason()", () => {
    expect(reasoner).toBeInstanceOf(CAMAGIReasoningEngine);
    expect(typeof reasoner.reason).toBe("function");
  });
  it("default singleton is a CAMAGIReasoningEngine", () => {
    expect(camAGIReasoningEngine).toBeInstanceOf(CAMAGIReasoningEngine);
  });
});

describe("CAMAGIReasoningEngine — happy path", () => {
  it("template-hint path: 'thin wall titanium' on hyperMILL prefers trochoidal over face-mill", () => {
    const r = reasoner.reason({
      target_cam: "hypermill",
      decision_context: "thin wall titanium pocket — best strategy?",
      options: ["trochoidal", "face-mill", "drilling"],
    });
    expect(r.decision).toBe("trochoidal");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.reasoning_chain.length).toBeGreaterThanOrEqual(5);
    expect(r.reasoning_chain[0]).toMatch(/tokenized/);
    expect(r.candidates[0].option).toBe("trochoidal");
    expect(r.candidates[0].parts.template_hint).toBeGreaterThan(0);
  });

  it("capability-bias path: 'high-speed dynamic' on Mastercam prefers dynamic over adaptive", () => {
    const r = reasoner.reason({
      target_cam: "mastercam",
      decision_context: "high-speed dynamic motion for 2D pocket",
      options: ["dynamic", "adaptive", "drilling"],
    });
    expect(r.decision).toBe("dynamic");
    expect(r.candidates[0].parts.capability_bias).toBeGreaterThan(0);
  });

  it("context-overlap path: option whose name appears in context wins", () => {
    const r = reasoner.reason({
      target_cam: "fusion360",
      decision_context: "I want to use scallop pattern on a curved surface",
      options: ["scallop", "parallel", "drilling"],
    });
    expect(r.decision).toBe("scallop");
    expect(r.candidates[0].parts.context_overlap).toBeGreaterThan(0);
  });

  it("variability across CAMs: same context yields different ranking on different CAMs", () => {
    const ctx = "5-axis impeller blade roughing";
    const opts = ["maxx_machining", "vortex", "adaptive"];
    const hm = reasoner.reason({ target_cam: "hypermill", decision_context: ctx, options: opts });
    const pm = reasoner.reason({ target_cam: "powermill", decision_context: ctx, options: opts });
    expect(hm.decision).toBe("maxx_machining");      // hyperMILL capability hits 'maxx'
    expect(pm.decision).toBe("vortex");              // PowerMill capability hits 'vortex'
  });

  it("solidcam imachining wins for pocket cavity context (template_hint)", () => {
    const r = reasoner.reason({
      target_cam: "solidcam",
      decision_context: "deep cavity pocket roughing in 4140 steel",
      options: ["imachining", "drilling", "thread-mill"],
    });
    expect(r.decision).toBe("imachining");
  });
});

describe("CAMAGIReasoningEngine — failure modes", () => {
  it("unknown CAM slug returns null decision and explanatory chain", () => {
    const r = reasoner.reason({
      target_cam: "not-a-cam",
      decision_context: "anything",
      options: ["a", "b"],
    });
    expect(r.decision).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.candidates).toHaveLength(0);
    expect(r.reasoning_chain[0]).toMatch(/unknown CAM slug/);
  });

  it("no options returns null decision, chain says 'requires ≥1 candidate'", () => {
    const r = reasoner.reason({
      target_cam: "hypermill",
      decision_context: "anything",
      options: [],
    });
    expect(r.decision).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.reasoning_chain[0]).toMatch(/requires/);
  });

  it("zero-overlap context → all scores zero → decision is null, abstaining", () => {
    const r = reasoner.reason({
      target_cam: "hypermill",
      decision_context: "xyzzy plover quux",
      options: ["foo", "bar", "baz"],
    });
    expect(r.decision).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.candidates.every((c) => c.total === 0)).toBe(true);
    expect(r.reasoning_chain[r.reasoning_chain.length - 1]).toMatch(/abstaining/);
  });
});

describe("CAMAGIReasoningEngine — adversarial inputs", () => {
  it("empty decision_context still ranks via capability bias only", () => {
    const r = reasoner.reason({
      target_cam: "hypermill",
      decision_context: "",
      options: ["maxx_machining", "drilling", "tap"],
    });
    expect(r.decision).toBe("maxx_machining");
    expect(r.candidates[0].parts.context_overlap).toBe(0);
    expect(r.candidates[0].parts.capability_bias).toBeGreaterThan(0);
  });

  it("oversize options list (50 entries) still completes deterministically; result ordering stable across runs", () => {
    const opts = Array.from({ length: 50 }, (_, i) => `option_${i}`);
    opts.push("trochoidal");
    const r1 = reasoner.reason({ target_cam: "hypermill", decision_context: "thin wall pocket", options: opts });
    const r2 = reasoner.reason({ target_cam: "hypermill", decision_context: "thin wall pocket", options: opts });
    expect(r1.candidates).toHaveLength(51);
    expect(r1.decision).toBe("trochoidal");
    expect(r1.candidates.map((c) => c.option)).toEqual(r2.candidates.map((c) => c.option));
  });

  it("identical-score ties resolve alphabetically (deterministic)", () => {
    const r = reasoner.reason({
      target_cam: "fusion360",
      decision_context: "totally unrelated context xyzzy",
      options: ["zeta", "alpha", "mu"],
    });
    // All zero scores; alphabetical winner = "alpha", but decision is null because score=0
    expect(r.candidates[0].option).toBe("alpha");
    expect(r.candidates[1].option).toBe("mu");
    expect(r.candidates[2].option).toBe("zeta");
    expect(r.decision).toBeNull();
  });

  it("non-string options gracefully tokenize (e.g. 'op-with-numbers-123')", () => {
    const r = reasoner.reason({
      target_cam: "hypermill",
      decision_context: "5-axis trochoidal",
      options: ["op-with-numbers-123", "trochoidal-v2", "drill"],
    });
    expect(r.decision).toBe("trochoidal-v2");
  });
});

describe("CAMAGIReasoningEngine — telemetry pass-through", () => {
  it("attaches catalog_coverage_pct + catalog_param_count for known CAM", () => {
    const r = reasoner.reason({
      target_cam: "hypermill",
      decision_context: "anything",
      options: ["a"],
    });
    expect(typeof r.catalog_coverage_pct).toBe("number");
    expect(typeof r.catalog_param_count).toBe("number");
    expect(r.catalog_coverage_pct).toBeGreaterThanOrEqual(0);
    expect(r.catalog_coverage_pct).toBeLessThanOrEqual(100);
  });
});
