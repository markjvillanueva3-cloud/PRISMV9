/**
 * VendorCostIndexEngine tests — QUOTING-SYNERGY-MS0 / U-QP-COST-BASIS-WIRE (slot:charlie 2026-06-01).
 *
 * Two layers: a hermetic synthetic fixture (always runs — pins parsing + edge logic) and a
 * real-file oracle against the production jm-vendor-cost-index.json (skip-safe — pins the real
 * category medians derived from 20,736 AP line-items). Real assertions, no toBeDefined stubs.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VendorCostIndexEngine, vendorCostIndexEngine } from "../engines/VendorCostIndexEngine.js";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS } from "../schemas/quotingActionSchemas.js";

const FIXTURE = {
  schemaVersion: "1.0.0",
  totals: { records: 100, grossSpend: 5000, creditTotal: 50, netSpend: 4950, vendorCount: 3 },
  categories: {
    material: { count: 40, spend: 2000, vendorCount: 2, unitCost: { min: 1, median: 5.5, max: 99, n: 38 } },
    "outside-process": { count: 30, spend: 1500, vendorCount: 1, unitCost: { min: 0, median: 3.25, max: 50, n: 30 } },
    "freight-shipping": { count: 10, spend: 200, vendorCount: 2, unitCost: { min: 4, median: 17, max: 80, n: 10 } },
  },
  vendors: {
    "ACME STEEL": { count: 12, spend: 1800, categories: { material: 12 }, firstDate: "01/01/2020", lastDate: "12/31/2020" },
    "FastFreight LLC": { count: 5, spend: 200, categories: { "freight-shipping": 5 } },
  },
};

let TMP: string;
let FIXTURE_PATH: string;
let CORRUPT_PATH: string;
const MISSING_PATH = join(tmpdir(), "vci-does-not-exist-xyz.json");
const REAL_PATH = "H:/prism/state/shared/quoting/jm-vendor-cost-index.json";

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "vci-"));
  FIXTURE_PATH = join(TMP, "index.json");
  CORRUPT_PATH = join(TMP, "corrupt.json");
  writeFileSync(FIXTURE_PATH, JSON.stringify(FIXTURE), "utf-8");
  writeFileSync(CORRUPT_PATH, "{ not valid json ,,", "utf-8");
});
afterAll(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

describe("VendorCostIndexEngine — synthetic fixture (hermetic)", () => {
  const eng = () => new VendorCostIndexEngine();

  it("load(): parses schema/totals/categories/vendors", () => {
    const r = eng().load(FIXTURE_PATH);
    expect(r.ok).toBe(true);
    expect(r.schemaVersion).toBe("1.0.0");
    expect(r.totals.records).toBe(100);
    expect(r.totals.vendorCount).toBe(3);
    expect(r.totals.netSpend).toBe(4950);
  });

  it("listCategories(): returns all category names", () => {
    const cats = eng().listCategories(FIXTURE_PATH);
    expect(cats.length).toBe(3);
    expect(cats).toContain("material");
    expect(cats).toContain("outside-process");
    expect(cats).toContain("freight-shipping");
  });

  it("getCategoryPrior(): returns the real unitCost stat (spans 3 categories)", () => {
    const e = eng();
    expect(e.getCategoryPrior("material", FIXTURE_PATH)?.unitCost?.median).toBe(5.5);
    expect(e.getCategoryPrior("material", FIXTURE_PATH)?.unitCost?.n).toBe(38);
    expect(e.getCategoryPrior("material", FIXTURE_PATH)?.count).toBe(40);
    expect(e.getCategoryPrior("outside-process", FIXTURE_PATH)?.unitCost?.median).toBe(3.25);
    expect(e.getCategoryPrior("freight-shipping", FIXTURE_PATH)?.unitCost?.median).toBe(17);
  });

  it("getCategoryPrior(): unknown category → null (failure mode)", () => {
    expect(eng().getCategoryPrior("nonexistent-category", FIXTURE_PATH)).toBeNull();
  });

  it("categoryForQuoteSlot(): maps quote slots to index categories, garbage → null", () => {
    const e = eng();
    expect(e.categoryForQuoteSlot("material")).toBe("material");
    expect(e.categoryForQuoteSlot("outside_process")).toBe("outside-process");
    expect(e.categoryForQuoteSlot("Outside-Process")).toBe("outside-process"); // case-insensitive
    expect(e.categoryForQuoteSlot("freight")).toBe("freight-shipping");
    expect(e.categoryForQuoteSlot("tooling")).toBe("tooling-consumable");
    expect(e.categoryForQuoteSlot("inspection")).toBe("inspection-quality");
    expect(e.categoryForQuoteSlot("overhead")).toBe("overhead-utility");
    expect(e.categoryForQuoteSlot("garbage-slot")).toBeNull();
    expect(e.categoryForQuoteSlot(null)).toBeNull();
    expect(e.categoryForQuoteSlot("")).toBeNull();
  });

  it("getVendorSpend(): case-insensitive lookup, missing → null", () => {
    const e = eng();
    expect(e.getVendorSpend("ACME STEEL", FIXTURE_PATH)?.spend).toBe(1800);
    expect(e.getVendorSpend("acme steel", FIXTURE_PATH)?.spend).toBe(1800); // case-insensitive
    expect(e.getVendorSpend("Nobody Inc", FIXTURE_PATH)).toBeNull();
  });

  it("prior(): category-specific + all-categories convenience shapes", () => {
    const e = eng();
    const one = e.prior({ category: "material", indexPath: FIXTURE_PATH });
    expect(one.ok).toBe(true);
    expect(one.category).toBe("material");
    expect(one.prior?.unitCost?.median).toBe(5.5);
    expect(one.totals.records).toBe(100);
    const all = e.prior({ indexPath: FIXTURE_PATH });
    expect(all.ok).toBe(true);
    expect(Object.keys(all.categories ?? {}).length).toBe(3);
  });

  it("adversarial: null/empty category + null vendor are safe (no throw → null)", () => {
    const e = eng();
    expect(e.getCategoryPrior(null, FIXTURE_PATH)).toBeNull();
    expect(e.getCategoryPrior(undefined, FIXTURE_PATH)).toBeNull();
    expect(e.getCategoryPrior("", FIXTURE_PATH)).toBeNull();
    expect(e.getVendorSpend(null, FIXTURE_PATH)).toBeNull();
    expect(e.getVendorSpend("", FIXTURE_PATH)).toBeNull();
  });

  it("fail-soft: missing file → ok:false, empty shape, no throw (failure mode)", () => {
    const r = eng().load(MISSING_PATH);
    expect(r.ok).toBe(false);
    expect(r.totals.records).toBe(0);
    expect(Object.keys(r.categories).length).toBe(0);
    expect(eng().getCategoryPrior("material", MISSING_PATH)).toBeNull();
  });

  it("fail-soft: corrupt JSON → ok:false, no throw (failure mode)", () => {
    const r = eng().load(CORRUPT_PATH);
    expect(r.ok).toBe(false);
    expect(r.totals.records).toBe(0);
  });

  it("singleton is exported and usable", () => {
    expect(vendorCostIndexEngine).toBeInstanceOf(VendorCostIndexEngine);
    expect(vendorCostIndexEngine.categoryForQuoteSlot("material")).toBe("material");
  });
});

describe("VendorCostIndexEngine — real cost-index oracle (skip-safe)", () => {
  const present = existsSync(REAL_PATH);
  it.skipIf(!present)("real jm-vendor-cost-index.json: 7 categories + real medians from 20,736 AP line-items", () => {
    const e = new VendorCostIndexEngine();
    const r = e.load(REAL_PATH);
    expect(r.ok).toBe(true);
    expect(r.totals.records).toBe(20736);
    expect(r.totals.vendorCount).toBe(174);
    const cats = e.listCategories(REAL_PATH);
    expect(cats.length).toBe(7);
    // real per-category medians (derived from the AP ledger) — pin the exact values
    expect(e.getCategoryPrior("material", REAL_PATH)?.unitCost?.median).toBe(3.39);
    expect(e.getCategoryPrior("outside-process", REAL_PATH)?.unitCost?.median).toBe(3.25);
    expect(e.getCategoryPrior("freight-shipping", REAL_PATH)?.unitCost?.median).toBe(17.27);
    expect(e.getCategoryPrior("inspection-quality", REAL_PATH)?.unitCost?.median).toBe(160);
    expect(e.getCategoryPrior("tooling-consumable", REAL_PATH)?.unitCost?.median).toBe(33.87);
    expect(e.getCategoryPrior("misc", REAL_PATH)?.unitCost?.median).toBe(38.14);
    expect(e.getCategoryPrior("overhead-utility", REAL_PATH)?.unitCost?.median).toBe(58.96);
    // slot mapping resolves to a real category that exists in the index
    const slotCat = e.categoryForQuoteSlot("material");
    expect(slotCat && e.getCategoryPrior(slotCat, REAL_PATH)?.unitCost?.median).toBe(3.39);
  });
});

describe("VendorCostIndexEngine — prism_quoting dispatcher contract (wiring round-trip)", () => {
  it("cost_index_prior is a registered action; schema accepts valid + rejects unknown category", () => {
    expect(quotingActionEnum.options).toContain("cost_index_prior");
    const s = QUOTING_ACTION_SCHEMAS.cost_index_prior;
    expect(s.safeParse({ category: "material" }).success).toBe(true);
    expect(s.safeParse({}).success).toBe(true); // category optional → all-categories mode
    expect(s.safeParse({ category: "not-a-real-category" }).success).toBe(false);
  });

  it("round-trip: schema-parsed params → engine.prior() returns the category prior", () => {
    const parsed = QUOTING_ACTION_SCHEMAS.cost_index_prior.safeParse({ category: "material", indexPath: FIXTURE_PATH });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const out = new VendorCostIndexEngine().prior(parsed.data as { category?: string; indexPath?: string });
      expect(out.ok).toBe(true);
      expect(out.category).toBe("material");
      expect(out.prior?.unitCost?.median).toBe(5.5);
      expect(out.totals.records).toBe(100);
    }
  });
});
