/**
 * CADFeatureRecognitionEngine tests — restoration coverage (U-STUB-HUNT-10).
 * Slot:bravo 2026-05-27. Real concrete-value assertions only.
 */
import { describe, it, expect } from "vitest";
import { CADFeatureRecognitionEngine, cadFeatureRecognitionEngine } from "../engines/CADFeatureRecognitionEngine.js";

describe("CADFeatureRecognitionEngine.extractFeatures — holes", () => {
  it("recognizes a single hole with confidence 0.9", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({
      holes: [{ center: { x: 0, y: 0, z: 0 }, diameter_mm: 6, depth_mm: 10 }],
    });
    expect(r.features).toHaveLength(1);
    expect(r.features[0].type).toBe("hole");
    expect(r.features[0].id).toBe("hole-0");
    expect(r.features[0].confidence).toBe(0.9);
    expect(r.counts.hole).toBe(1);
    expect(r.confidence).toBe(0.9);
  });

  it("rejects holes with non-positive diameter", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({
      holes: [{ center: { x: 0, y: 0, z: 0 }, diameter_mm: 0 }],
    });
    expect(r.features).toHaveLength(0);
    expect(r.counts.hole).toBe(0);
  });
});

describe("CADFeatureRecognitionEngine.extractFeatures — pockets vs slots", () => {
  const squarePocket = {
    pockets: [{
      boundary: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }],
      depth_mm: 5,
    }],
  };
  const longSlot = {
    pockets: [{
      boundary: [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, { x: 100, y: 5, z: 0 }, { x: 0, y: 5, z: 0 }],
      depth_mm: 3,
    }],
  };

  it("square boundary (aspect=1) → pocket with confidence 0.9", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures(squarePocket);
    expect(r.features[0].type).toBe("pocket");
    expect(r.features[0].confidence).toBe(0.9);
    expect((r.features[0].details as Record<string, unknown>).aspect_ratio).toBe(1);
    expect(r.counts.pocket).toBe(1);
    expect(r.counts.slot).toBe(0);
  });

  it("elongated boundary (aspect=20) → slot with confidence 0.7", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures(longSlot);
    expect(r.features[0].type).toBe("slot");
    expect(r.features[0].confidence).toBe(0.7);
    expect((r.features[0].details as Record<string, unknown>).length_mm).toBe(100);
    expect((r.features[0].details as Record<string, unknown>).width_mm).toBe(5);
    expect(r.counts.slot).toBe(1);
    expect(r.counts.pocket).toBe(0);
  });
});

describe("CADFeatureRecognitionEngine.extractFeatures — fillets + chamfers", () => {
  it("recognizes fillet with edgeId and radius", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({
      fillets: [{ edgeId: "e1", radius_mm: 2 }, { edgeId: 5, radius_mm: 3 }],
    });
    expect(r.features).toHaveLength(2);
    expect(r.features[0].type).toBe("fillet");
    expect(r.features[1].type).toBe("fillet");
    expect(r.counts.fillet).toBe(2);
  });

  it("recognizes chamfer with default angle 45°", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({
      chamfers: [{ edgeId: "e2", offset_mm: 1.5 }],
    });
    expect(r.features[0].type).toBe("chamfer");
    expect((r.features[0].details as Record<string, unknown>).angle_deg).toBe(45);
    expect(r.counts.chamfer).toBe(1);
  });

  it("rejects fillets with non-positive radius", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({ fillets: [{ edgeId: "x", radius_mm: 0 }] });
    expect(r.features).toHaveLength(0);
  });
});

describe("CADFeatureRecognitionEngine.extractFeatures — aggregate behaviour", () => {
  it("aggregate confidence = mean of per-feature confidences", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({
      holes: [{ center: { x: 0, y: 0, z: 0 }, diameter_mm: 6 }],        // 0.9
      fillets: [{ edgeId: 1, radius_mm: 2 }],                            // 0.7
    });
    expect(r.confidence).toBeCloseTo((0.9 + 0.7) / 2, 6);
  });

  it("empty geometry → low confidence 0.4 + zero counts", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({});
    expect(r.features).toHaveLength(0);
    expect(r.confidence).toBe(0.4);
    expect(r.counts.hole).toBe(0);
    expect(r.counts.pocket).toBe(0);
    expect(r.counts.slot).toBe(0);
    expect(r.counts.fillet).toBe(0);
    expect(r.counts.chamfer).toBe(0);
  });

  it("null/undefined geometry returns empty result without throwing", () => {
    const a = cadFeatureRecognitionEngine.extractFeatures(null);
    const b = cadFeatureRecognitionEngine.extractFeatures(undefined);
    expect(a.features).toHaveLength(0);
    expect(b.features).toHaveLength(0);
  });

  it("mixed input — 2 holes + 1 pocket + 1 fillet — counts and total", () => {
    const r = cadFeatureRecognitionEngine.extractFeatures({
      holes: [
        { center: { x: 0, y: 0, z: 0 }, diameter_mm: 6 },
        { center: { x: 10, y: 0, z: 0 }, diameter_mm: 4 },
      ],
      pockets: [{ boundary: [{ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { x: 8, y: 8, z: 0 }, { x: 0, y: 8, z: 0 }], depth_mm: 3 }],
      fillets: [{ edgeId: "e", radius_mm: 1.5 }],
    });
    expect(r.features).toHaveLength(4);
    expect(r.counts.hole).toBe(2);
    expect(r.counts.pocket).toBe(1);
    expect(r.counts.fillet).toBe(1);
  });
});

describe("class identity", () => {
  it("fresh instance matches singleton extractFeatures output", () => {
    const eng = new CADFeatureRecognitionEngine();
    const input = { holes: [{ center: { x: 0, y: 0, z: 0 }, diameter_mm: 5 }] };
    expect(eng.extractFeatures(input)).toEqual(cadFeatureRecognitionEngine.extractFeatures(input));
  });
});
