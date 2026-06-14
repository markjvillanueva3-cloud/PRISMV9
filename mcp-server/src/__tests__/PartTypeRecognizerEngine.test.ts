import { describe, it, expect } from "vitest";
import {
  partTypeRecognizerEngine as rec,
  PartTypeRecognizerEngine,
  type PartFeatureSignature,
} from "../engines/PartTypeRecognizerEngine.js";

describe("PartTypeRecognizerEngine", () => {
  it("exports a singleton with recognize()", () => {
    expect(rec).toBeInstanceOf(PartTypeRecognizerEngine);
    expect(typeof rec.recognize).toBe("function");
  });

  it("throws on missing bbox or feature_counts", () => {
    expect(() => rec.recognize({ domain: "mill" } as unknown as PartFeatureSignature)).toThrow(/bbox_mm \+ feature_counts/);
  });

  it("classifies mill micro-mill when bbox ≤ 25mm", () => {
    const r = rec.recognize({ domain: "mill", bbox_mm: { x: 20, y: 15, z: 10 }, feature_counts: { pocket: 2 } });
    expect(r.part_class).toBe("micro-mill");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies mill aerospace-pocket when superalloy + ribs + pockets", () => {
    const r = rec.recognize({
      domain: "mill",
      bbox_mm: { x: 300, y: 200, z: 80 },
      feature_counts: { pocket: 6, rib: 4 },
      material: "Ti-6Al-4V",
    });
    expect(r.part_class).toBe("aerospace-pocket");
    expect(r.signals.some(s => /Ti-6Al-4V|ribs=4/.test(s))).toBe(true);
  });

  it("classifies mill thin-wall when min_wall ≤ 1.0mm", () => {
    const r = rec.recognize({
      domain: "mill",
      bbox_mm: { x: 200, y: 100, z: 50 },
      feature_counts: { pocket: 2 },
      min_wall_mm: 0.8,
    });
    expect(r.part_class).toBe("thin-wall");
  });

  it("classifies mill deep-pocket when depth/planar > 5", () => {
    const r = rec.recognize({
      domain: "mill",
      bbox_mm: { x: 60, y: 60, z: 400 },
      feature_counts: { pocket: 1 },
      max_depth_mm: 350,
    });
    expect(r.part_class).toBe("deep-pocket");
  });

  it("classifies mill prismatic as fallback for non-extreme prismatic", () => {
    const r = rec.recognize({
      domain: "mill",
      bbox_mm: { x: 100, y: 80, z: 50 },
      feature_counts: { pocket: 3, hole: 4 },
    });
    expect(r.part_class).toBe("prismatic");
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("classifies lathe shaft when L/D > 3 and thread ratio < 50%", () => {
    const r = rec.recognize({
      domain: "lathe",
      bbox_mm: { x: 400, y: 25, z: 25 },
      feature_counts: { groove: 1, hole: 1, fillet: 1, chamfer: 1 },
    });
    expect(r.part_class).toBe("shaft");
  });

  it("classifies lathe bushing when L/D ≤ 1.5 + bore", () => {
    const r = rec.recognize({
      domain: "lathe",
      bbox_mm: { x: 40, y: 50, z: 50 },
      feature_counts: { hole: 1 },
    });
    expect(r.part_class).toBe("bushing");
  });

  it("classifies lathe thread-only when threads ≥ 50% of features", () => {
    const r = rec.recognize({
      domain: "lathe",
      bbox_mm: { x: 50, y: 20, z: 20 },
      feature_counts: { thread: 3, groove: 1 },
    });
    expect(r.part_class).toBe("thread-only");
  });

  it("classifies lathe swiss-medical when dia ≤ 32mm + Ra ≤ 0.4μm", () => {
    const r = rec.recognize({
      domain: "lathe",
      bbox_mm: { x: 80, y: 12, z: 12 },
      feature_counts: { groove: 1 },
      surface_finish_ra_um: 0.2,
    });
    expect(r.part_class).toBe("swiss-medical");
  });

  it("classifies wire-edm punch-die when mating_pair + IT5", () => {
    const r = rec.recognize({
      domain: "wire-edm",
      bbox_mm: { x: 100, y: 80, z: 30 },
      feature_counts: { slot: 4 },
      tolerance_class: "IT5",
      has_mating_pair: true,
    });
    expect(r.part_class).toBe("punch-die");
  });

  it("classifies wire-edm pcd-form when material=PCD", () => {
    const r = rec.recognize({
      domain: "wire-edm",
      bbox_mm: { x: 50, y: 50, z: 5 },
      feature_counts: { slot: 1 },
      material: "PCD",
    });
    expect(r.part_class).toBe("pcd-form");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies wire-edm aerospace-slot when superalloy + slot", () => {
    const r = rec.recognize({
      domain: "wire-edm",
      bbox_mm: { x: 200, y: 100, z: 30 },
      feature_counts: { slot: 3 },
      material: "Inconel 718",
    });
    expect(r.part_class).toBe("aerospace-slot");
  });

  it("returns unclassified with confidence 0 when no rule matches", () => {
    const r = rec.recognize({
      domain: "mill",
      bbox_mm: { x: 500, y: 500, z: 500 },
      feature_counts: {},
    });
    expect(r.part_class).toBe("unclassified");
    expect(r.confidence).toBe(0);
  });
});
