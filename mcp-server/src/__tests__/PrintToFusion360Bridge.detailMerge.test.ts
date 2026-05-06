import { describe, it, expect } from "vitest";
import { PrintToFusion360Bridge, type DetailView } from "../engines/PrintToFusion360Bridge.js";
import type { ExtractedDimension } from "../engines/BlueprintOCREngine.js";

const bridge = new PrintToFusion360Bridge();

function dim(id: string, type: ExtractedDimension["type"], nominal: number, locationHint?: string, rawText?: string): ExtractedDimension {
  return {
    id,
    type,
    nominal,
    unit: "mm",
    raw_text: rawText ?? `${nominal}`,
    confidence: 0.9,
    location_hint: locationHint,
  };
}

describe("PrintToFusion360Bridge.mergeDetailViews — basic merge semantics", () => {
  it("returns macro dims unchanged when details is empty", () => {
    const macro = [
      dim("DIM-1", "linear", 100, "Length"),
      dim("DIM-2", "diameter", 23.876, "Outer Flange"),
    ];
    const merged = bridge.mergeDetailViews(macro, []);
    expect(merged.replaced).toBe(0);
    expect(merged.appended).toBe(0);
    expect(merged.dimensions.length).toBe(2);
    expect(merged.dimensions[0]?.nominal).toBe(100);
    expect(merged.dimensions[1]?.nominal).toBe(23.876);
  });

  it("replaces macro dim when detail dim shares location_hint (case-insensitive)", () => {
    const macro = [dim("DIM-1", "diameter", 23.88, "outer flange")];
    const detail: DetailView = {
      id: "A",
      scale: 4,
      dimensions: [dim("DET-1", "diameter", 23.876, "OUTER FLANGE", "Ø.94 ±.002")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.replaced).toBe(1);
    expect(merged.appended).toBe(0);
    expect(merged.dimensions.length).toBe(1);
    expect(merged.dimensions[0]?.nominal).toBe(23.876);
    expect(merged.dimensions[0]?.raw_text).toBe("Ø.94 ±.002");
  });

  it("appends detail-only dimensions (angular taper not in macro)", () => {
    const macro = [dim("DIM-1", "diameter", 23.876, "Outer Flange")];
    const detail: DetailView = {
      id: "A",
      dimensions: [
        dim("DET-1", "angular", 1, "Face taper", "1°"),
        dim("DET-2", "angular", 8, "Base chamfer", "8°"),
      ],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.replaced).toBe(0);
    expect(merged.appended).toBe(2);
    expect(merged.dimensions.length).toBe(3);
    const angular = merged.dimensions.filter((d) => d.type === "angular");
    expect(angular.length).toBe(2);
    expect(angular.map((d) => d.nominal).sort()).toEqual([1, 8]);
  });

  it("preserves macro dim id when detail replaces it (provenance)", () => {
    const macro = [dim("DIM-MACRO-7", "diameter", 23.88, "outer flange")];
    const detail: DetailView = {
      id: "A",
      dimensions: [dim("DET-OVERRIDE", "diameter", 23.876, "outer flange")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.dimensions[0]?.id).toBe("DIM-MACRO-7");
    expect(merged.dimensions[0]?.nominal).toBe(23.876); // detail value wins
  });

  it("normalizes whitespace for hint matching (multiple spaces collapse)", () => {
    const macro = [dim("DIM-1", "diameter", 23.88, "outer    flange  ")];
    const detail: DetailView = {
      id: "A",
      dimensions: [dim("DET-1", "diameter", 23.876, "Outer flange")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.replaced).toBe(1);
  });

  it("appends detail dim when location_hint differs from any macro hint", () => {
    const macro = [dim("DIM-1", "diameter", 23.876, "Outer Flange")];
    const detail: DetailView = {
      id: "A",
      dimensions: [dim("DET-1", "diameter", 19.2, "Mid Flange")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.replaced).toBe(0);
    expect(merged.appended).toBe(1);
    expect(merged.dimensions.length).toBe(2);
  });
});

describe("PrintToFusion360Bridge.mergeDetailViews — orphan detection", () => {
  it("flags detail as orphan when refers_to does not match any macro feature", () => {
    const macro = [dim("DIM-1", "diameter", 23.876, "Outer Flange")];
    const detail: DetailView = {
      id: "A",
      refers_to: ["Inner Bore"],
      dimensions: [dim("DET-1", "diameter", 5, "Inner Bore")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.orphan_details).toEqual(["A"]);
    // Still merged — orphan flag is informational, not a reject.
    expect(merged.appended).toBe(1);
  });

  it("does not flag orphan when refers_to matches a macro location_hint", () => {
    const macro = [dim("DIM-1", "diameter", 23.876, "Outer Flange")];
    const detail: DetailView = {
      id: "A",
      refers_to: ["Outer Flange"],
      dimensions: [dim("DET-1", "diameter", 23.876, "Outer Flange")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.orphan_details.length).toBe(0);
  });

  it("does not flag orphan when refers_to is empty (treated as 'matches everything')", () => {
    const macro = [dim("DIM-1", "diameter", 23.876, "Outer Flange")];
    const detail: DetailView = {
      id: "A",
      dimensions: [dim("DET-1", "diameter", 5, "New Feature")],
    };
    const merged = bridge.mergeDetailViews(macro, [detail]);
    expect(merged.orphan_details.length).toBe(0);
  });
});

describe("PrintToFusion360Bridge.mergeDetailViews — multi-detail aggregation", () => {
  it("two details both contributing → counts are summed", () => {
    const macro = [
      dim("DIM-1", "diameter", 23.88, "Outer Flange"),
      dim("DIM-2", "linear", 100, "Length"),
    ];
    const detailA: DetailView = {
      id: "A",
      dimensions: [
        dim("DET-A1", "diameter", 23.876, "outer flange"),
        dim("DET-A2", "angular", 1, "face taper"),
      ],
    };
    const detailB: DetailView = {
      id: "B",
      dimensions: [dim("DET-B1", "angular", 8, "base chamfer")],
    };
    const merged = bridge.mergeDetailViews(macro, [detailA, detailB]);
    expect(merged.replaced).toBe(1);
    expect(merged.appended).toBe(2);
    expect(merged.dimensions.length).toBe(4); // 2 macro - 1 replaced + 1 (replacement) + 2 appended
  });

  it("two details replacing the same macro dim → second wins (last-write semantics)", () => {
    const macro = [dim("DIM-1", "diameter", 23.88, "Outer Flange")];
    const detailA: DetailView = {
      id: "A",
      dimensions: [dim("DET-A1", "diameter", 23.876, "outer flange")],
    };
    const detailB: DetailView = {
      id: "B",
      dimensions: [dim("DET-B1", "diameter", 23.880, "outer flange", "Ø.940 (revised)")],
    };
    const merged = bridge.mergeDetailViews(macro, [detailA, detailB]);
    expect(merged.replaced).toBe(2); // both detail dims replaced (counter is total replacement events)
    expect(merged.dimensions.length).toBe(1);
    expect(merged.dimensions[0]?.raw_text).toBe("Ø.940 (revised)");
  });
});

describe("PrintToFusion360Bridge.buildBridgeScriptWithDetails — end-to-end", () => {
  it("delegates to buildBridgeScript with merged dimensions and surfaces merge counts", () => {
    const macro: ExtractedDimension[] = [
      dim("DIM-1", "diameter", 23.88, "Outer Flange"),
    ];
    const details: DetailView[] = [
      {
        id: "A",
        scale: 4,
        dimensions: [
          dim("DET-1", "diameter", 23.876, "outer flange"),
          dim("DET-2", "angular", 1, "face taper", "1°"),
        ],
      },
    ];
    const result = bridge.buildBridgeScriptWithDetails(
      { dimensions: macro, partName: "Punch" },
      details,
    );
    expect(result.detail_merge.replaced).toBe(1);
    expect(result.detail_merge.appended).toBe(1);
    expect(result.detail_merge.orphan_details).toEqual([]);
    // Provenance still reports the dimension count from the merged stream.
    expect(result.provenance.dimensionCount).toBe(2);
  });

  it("empty details array produces same dimension count as buildBridgeScript", () => {
    const macro: ExtractedDimension[] = [
      dim("DIM-1", "diameter", 23.88, "Outer Flange"),
      dim("DIM-2", "linear", 100, "Length"),
    ];
    const withDetails = bridge.buildBridgeScriptWithDetails(
      { dimensions: macro, partName: "Punch" },
      [],
    );
    const withoutDetails = bridge.buildBridgeScript({ dimensions: macro, partName: "Punch" });
    expect(withDetails.detail_merge.replaced).toBe(0);
    expect(withDetails.detail_merge.appended).toBe(0);
    expect(withDetails.provenance.dimensionCount).toBe(withoutDetails.provenance.dimensionCount);
  });
});
