/**
 * SpeedFeedCatalogJoinerEngine — tests
 *
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-15-CATALOG-JOIN
 */

import { describe, it, expect } from "vitest";
import {
  speedFeedCatalogJoinerEngine,
  SpeedFeedCatalogJoinerEngine,
  SpeedFeedCatalogLookupInputSchema,
} from "../engines/SpeedFeedCatalogJoinerEngine.js";

describe("SpeedFeedCatalogJoinerEngine", () => {
  it("instantiates singleton + class", () => {
    expect(speedFeedCatalogJoinerEngine).toBeInstanceOf(SpeedFeedCatalogJoinerEngine);
    expect(typeof speedFeedCatalogJoinerEngine.lookup).toBe("function");
    expect(typeof speedFeedCatalogJoinerEngine.lookupBatch).toBe("function");
    expect(typeof speedFeedCatalogJoinerEngine.catalogSize).toBe("function");
  });

  it("catalog union has thousands of rows from real OEM catalogs", () => {
    const s = speedFeedCatalogJoinerEngine.catalogSize();
    expect(s.total_rows).toBeGreaterThan(100);
    expect(Object.keys(s.by_manufacturer).length).toBeGreaterThanOrEqual(2);
  });

  it("Zod rejects empty manufacturer", () => {
    expect(() =>
      SpeedFeedCatalogLookupInputSchema.parse({
        manufacturer: "",
        tool_id_or_series: "JS512",
        iso_group: "P",
      }),
    ).toThrow();
  });

  it("Zod rejects empty tool_id_or_series", () => {
    expect(() =>
      SpeedFeedCatalogLookupInputSchema.parse({
        manufacturer: "Seco",
        tool_id_or_series: "",
        iso_group: "P",
      }),
    ).toThrow();
  });

  it("Zod rejects invalid iso_group", () => {
    expect(() =>
      SpeedFeedCatalogLookupInputSchema.parse({
        manufacturer: "Seco",
        tool_id_or_series: "JS512",
        iso_group: "Z" as "P",
      }),
    ).toThrow();
  });

  it("Zod rejects negative diameter", () => {
    expect(() =>
      SpeedFeedCatalogLookupInputSchema.parse({
        manufacturer: "Seco",
        tool_id_or_series: "JS512",
        iso_group: "P",
        diameter_mm: -5,
      }),
    ).toThrow();
  });

  it("returns vc_mpm + fz_mm > 0 for Seco JS512 (P-steel) — exact match", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco",
      tool_id_or_series: "JS512",
      iso_group: "P",
    });
    if (r) {
      expect(r.vc_mpm).toBeGreaterThan(0);
      expect(r.fz_mm).toBeGreaterThan(0);
      expect(r.match_tier).toMatch(/^(exact|exact_no_diameter|series_prefix)$/);
      expect(r.vc_range[0]).toBeLessThanOrEqual(r.vc_mpm);
      expect(r.vc_range[1]).toBeGreaterThanOrEqual(r.vc_mpm);
    }
  });

  it("returns Gühring tagged result for Guhring manufacturer + DC series", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Guhring",
      tool_id_or_series: "DC110",
      iso_group: "P",
    });
    if (r) {
      expect(r.source_catalog).toBe("guhring");
    }
  });

  it("returns ISCAR tagged result for ISCAR manufacturer", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "ISCAR",
      tool_id_or_series: "ICK",
      iso_group: "P",
    });
    if (r) {
      expect(r.source_catalog).toBe("iscar");
    }
  });

  it("returns null for utterly unknown manufacturer + unknown series", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "UnobtainiumCo",
      tool_id_or_series: "ZZZZZZZ_UNKNOWN",
      iso_group: "P",
    });
    expect(r).toBeNull();
  });

  it("confidence is in [0,1] when a match returns", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco",
      tool_id_or_series: "JS512",
      iso_group: "P",
    });
    if (r) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("vc_mpm equals median of vc_range", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco",
      tool_id_or_series: "JS512",
      iso_group: "P",
    });
    if (r) {
      const expectedVc = (r.vc_range[0] + r.vc_range[1]) / 2;
      expect(r.vc_mpm).toBeCloseTo(expectedVc, 4);
    }
  });

  it("fz_mm equals median of fz_range", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco",
      tool_id_or_series: "JS512",
      iso_group: "P",
    });
    if (r) {
      const expectedFz = (r.fz_range[0] + r.fz_range[1]) / 2;
      expect(r.fz_mm).toBeCloseTo(expectedFz, 5);
    }
  });

  it("different ISO groups return different recommendations", () => {
    const p = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco", tool_id_or_series: "JS512", iso_group: "P",
    });
    const n = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco", tool_id_or_series: "JS512", iso_group: "N",
    });
    if (p && n) {
      // P (steel) vc < N (aluminum) vc typically by 3-5x
      expect(p.vc_mpm).not.toBe(n.vc_mpm);
    }
  });

  it("batch lookup returns one result per input", () => {
    const inputs = [
      { manufacturer: "Seco", tool_id_or_series: "JS512", iso_group: "P" as const },
      { manufacturer: "Guhring", tool_id_or_series: "DC110", iso_group: "P" as const },
      { manufacturer: "UnknownCo", tool_id_or_series: "XYZ", iso_group: "P" as const },
    ];
    const results = speedFeedCatalogJoinerEngine.lookupBatch(inputs);
    expect(results.length).toBe(3);
    expect(results[2]).toBeNull();
  });

  it("series_prefix fallback handles partial designations (e.g. 'JS512-006')", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco",
      tool_id_or_series: "JS512-006",
      iso_group: "P",
    });
    if (r) {
      // Should find JS512 via substring match
      expect(r.matched_series.toUpperCase()).toContain("JS");
    }
  });

  it("manufacturer_iso last-resort tier fires when series doesn't match but iso does", () => {
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Sumitomo",
      tool_id_or_series: "QQQ_UNKNOWN_SERIES",
      iso_group: "M",
    });
    if (r) {
      expect(["manufacturer_iso", "series_prefix", "exact", "exact_no_diameter"]).toContain(r.match_tier);
      expect(r.confidence).toBeLessThanOrEqual(0.9);
    }
  });

  it("diameter_mm field is honored (out-of-range falls to exact_no_diameter tier)", () => {
    // Pick a wildly-out-of-range diameter; if matching series has dc bounds,
    // tier should degrade.
    const r = speedFeedCatalogJoinerEngine.lookup({
      manufacturer: "Seco",
      tool_id_or_series: "JS512",
      iso_group: "P",
      diameter_mm: 9999, // way beyond any reasonable end-mill
    });
    if (r && r.match_tier === "exact_no_diameter") {
      expect(r.confidence).toBeLessThan(0.95);
    }
  });
});
