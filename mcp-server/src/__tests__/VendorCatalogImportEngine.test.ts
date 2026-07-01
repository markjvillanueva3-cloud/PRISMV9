/**
 * VendorCatalogImportEngine.test.ts — real-record coverage for the ERP ingestion of charlie's
 * VENDOR-NETWORK-MS0 vendor-source corpus. Sample records below are verbatim shapes from
 * state/shared/quoting/vendor-sources/{catalog-vendors,imts-exhibitors,thomasnet-shops}.jsonl.
 */

import { describe, it, expect } from "vitest";
import { VendorCatalogImportEngine } from "../engines/VendorCatalogImportEngine.js";

// ── verbatim sample lines from the three real sources ──────────────────────
const CATALOG_VENDOR =
  '{"name":"Accupro","website":"https://www.mscdirect.com/products/accupro-brand","vendor_type":"reseller","categories":["misc"],"reach":"national","regions":["US"],"pricing_access":"catalog","has_api":false,"verified":true,"source_tag":"resources-catalog","notes":"catalogs on disk: 1"}';
const IMTS_BUILDER =
  '{"name":"Haas Automation","website":"https://www.haascnc.com","vendor_type":"machine-builder","categories":["machine-builder"],"reach":"global","regions":["US","EU","ASIA"],"pricing_access":"quote","has_api":false,"verified":true,"source_tag":"imts"}';
const SHOP_SIMPLE =
  '{"name":"United CNC Machining","website":"https://unitedcncmachining.com/","vendor_type":"machine-shop","categories":["machine-shop"],"reach":"local","regions":["US"],"pricing_access":"quote","has_api":false,"verified":true,"source_tag":"thomasnet","notes":"Auburn Hills, MI · processes: milling, edm"}';
const SHOP_CERTED =
  '{"name":"Criterion Precision Machining","website":"https://www.criterionprecision.com/","vendor_type":"machine-shop","categories":["machine-shop","inspection-quality"],"reach":"national","regions":["US"],"pricing_access":"quote","has_api":false,"verified":true,"source_tag":"thomasnet","notes":"Michigan · processes: milling, turning, inspection · certs: ISO 9001, ISO 13485, FDA registered, ITAR"}';

describe("VendorCatalogImportEngine.parseSource", () => {
  it("parses valid jsonl, applies array defaults, and skips blank lines", () => {
    const text = `${CATALOG_VENDOR}\n\n${IMTS_BUILDER}\n`;
    const recs = VendorCatalogImportEngine.parseSource(text);
    expect(recs).toHaveLength(2);
    expect(recs[0].name).toBe("Accupro");
    expect(recs[0].categories).toEqual(["misc"]);
    expect(recs[1].regions).toEqual(["US", "EU", "ASIA"]);
  });

  it("backfills source_tag from opts when the record omits it", () => {
    const recs = VendorCatalogImportEngine.parseSource('{"name":"X","vendor_type":"maker"}', {
      sourceTag: "imts-exhibitors",
    });
    expect(recs[0].source_tag).toBe("imts-exhibitors");
  });

  it("THROWS with line number on malformed JSON (fail-loud)", () => {
    const text = `${CATALOG_VENDOR}\n{not json}`;
    expect(() => VendorCatalogImportEngine.parseSource(text, { sourceTag: "cat" })).toThrow(
      /cat line 2: invalid JSON/,
    );
  });

  it("THROWS on schema violation (missing required name)", () => {
    expect(() => VendorCatalogImportEngine.parseSource('{"vendor_type":"reseller"}')).toThrow(
      /schema violation.*name/,
    );
  });
});

describe("VendorCatalogImportEngine.classifyRole", () => {
  it("routes machine-shop → marketplace-supplier", () => {
    const [r] = VendorCatalogImportEngine.parseSource(SHOP_SIMPLE);
    expect(VendorCatalogImportEngine.classifyRole(r)).toBe("marketplace-supplier");
  });
  it("routes reseller → purchasing-vendor and machine-builder → equipment-vendor", () => {
    const [reseller] = VendorCatalogImportEngine.parseSource(CATALOG_VENDOR);
    const [builder] = VendorCatalogImportEngine.parseSource(IMTS_BUILDER);
    expect(VendorCatalogImportEngine.classifyRole(reseller)).toBe("purchasing-vendor");
    expect(VendorCatalogImportEngine.classifyRole(builder)).toBe("equipment-vendor");
  });
  it("defaults an unknown vendor_type to purchasing-vendor", () => {
    const [r] = VendorCatalogImportEngine.parseSource('{"name":"Mystery Co","vendor_type":"galactic-widget"}');
    expect(VendorCatalogImportEngine.classifyRole(r)).toBe("purchasing-vendor");
  });
});

describe("VendorCatalogImportEngine.slugify", () => {
  it("produces a stable lowercase id", () => {
    expect(VendorCatalogImportEngine.slugify("United CNC Machining")).toBe("united-cnc-machining");
    expect(VendorCatalogImportEngine.slugify("M.A. Ford")).toBe("m-a-ford");
  });
  it("throws on a symbol-only name (cannot form an id)", () => {
    expect(() => VendorCatalogImportEngine.slugify("!!!")).toThrow(/cannot slugify/);
  });
});

describe("VendorCatalogImportEngine.extractProcesses / extractCerts", () => {
  it("lifts notes processes into canonical SupplierProcess enums, dropping non-process tokens", () => {
    const [shop] = VendorCatalogImportEngine.parseSource(SHOP_CERTED);
    // "processes: milling, turning, inspection" → mill, turn (inspection has no process enum → dropped)
    expect(VendorCatalogImportEngine.extractProcesses(shop)).toEqual(["mill", "turn"]);
  });
  it("maps bare 'edm' → wedm and dedupes", () => {
    const [shop] = VendorCatalogImportEngine.parseSource(SHOP_SIMPLE);
    expect(VendorCatalogImportEngine.extractProcesses(shop)).toEqual(["mill", "wedm"]);
  });
  it("lifts notes certs into canonical Certification codes, dropping non-canonical (ISO 13485, FDA)", () => {
    const [shop] = VendorCatalogImportEngine.parseSource(SHOP_CERTED);
    expect(VendorCatalogImportEngine.extractCerts(shop)).toEqual(["ISO9001", "ITAR"]);
  });
  it("returns empty arrays when notes carry no processes/certs", () => {
    const [reseller] = VendorCatalogImportEngine.parseSource(CATALOG_VENDOR);
    expect(VendorCatalogImportEngine.extractProcesses(reseller)).toEqual([]);
    expect(VendorCatalogImportEngine.extractCerts(reseller)).toEqual([]);
  });
});

describe("VendorCatalogImportEngine.toCapabilityHint (marketplace bridge)", () => {
  it("lifts a job shop into a marketplace-ready capability hint", () => {
    const [shop] = VendorCatalogImportEngine.parseSource(SHOP_CERTED);
    const hint = VendorCatalogImportEngine.toCapabilityHint(shop);
    expect(hint).not.toBeNull();
    expect(hint!.supplierId).toBe("criterion-precision-machining");
    expect(hint!.processes).toEqual(["mill", "turn"]);
    expect(hint!.certifications).toEqual(["ISO9001", "ITAR"]);
    expect(hint!.region).toBe("US");
    expect(hint!.sourceTag).toBe("thomasnet");
  });
  it("returns null for a non-shop vendor (a tool reseller is not a supplier)", () => {
    const [reseller] = VendorCatalogImportEngine.parseSource(CATALOG_VENDOR);
    expect(VendorCatalogImportEngine.toCapabilityHint(reseller)).toBeNull();
  });
});

describe("VendorCatalogImportEngine.importSources + summary + query", () => {
  const sources = [
    { text: `${CATALOG_VENDOR}`, sourceTag: "catalog-vendors" },
    { text: `${IMTS_BUILDER}`, sourceTag: "imts-exhibitors" },
    { text: `${SHOP_SIMPLE}\n${SHOP_CERTED}`, sourceTag: "thomasnet-shops" },
  ];

  it("routes the corpus to the three ERP buckets + builds marketplace hints", () => {
    const r = VendorCatalogImportEngine.importSources(sources);
    expect(r.records).toHaveLength(4);
    expect(r.purchasingVendors.map((v) => v.name)).toEqual(["Accupro"]);
    expect(r.equipmentVendors.map((v) => v.name)).toEqual(["Haas Automation"]);
    expect(r.marketplaceSuppliers).toHaveLength(2);
    expect(r.capabilityHints).toHaveLength(2);
    expect(r.capabilityHints.map((h) => h.supplierId)).toContain("united-cnc-machining");
  });

  it("summarizes by role / vendor_type / region / source with correct tallies", () => {
    const r = VendorCatalogImportEngine.importSources(sources);
    expect(r.summary.total).toBe(4);
    expect(r.summary.byRole["marketplace-supplier"]).toBe(2);
    expect(r.summary.byRole["purchasing-vendor"]).toBe(1);
    expect(r.summary.byRole["equipment-vendor"]).toBe(1);
    expect(r.summary.marketplaceCandidates).toBe(2);
    expect(r.summary.verified).toBe(4);
    expect(r.summary.bySource["thomasnet"]).toBe(2); // both shop records carry source_tag "thomasnet"
  });

  it("queries by role, region, category, verified, and api flag", () => {
    const r = VendorCatalogImportEngine.importSources(sources);
    expect(VendorCatalogImportEngine.query(r.records, { role: "marketplace-supplier" })).toHaveLength(2);
    expect(VendorCatalogImportEngine.query(r.records, { category: "inspection-quality" })).toHaveLength(1);
    expect(VendorCatalogImportEngine.query(r.records, { verifiedOnly: true })).toHaveLength(4);
    expect(VendorCatalogImportEngine.query(r.records, { hasApi: true })).toHaveLength(0);
    expect(VendorCatalogImportEngine.query(r.records, { region: "EU" })).toHaveLength(1); // Haas
  });
});
