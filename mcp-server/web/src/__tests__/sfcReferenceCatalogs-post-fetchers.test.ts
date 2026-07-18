/**
 * sfcReferenceCatalogs-post-fetchers.test.ts (slot:oscar)
 *
 * Pins the 4 POST-catalog fetchers added so the SFC machine / CAM / tool-holder /
 * workholding inputs can be DB-backed (previously only the 6 GET catalogs had
 * fetchers, so those four backend catalogs in routes/data.ts were unreachable from
 * the UI). Each fetcher must: (1) POST the right endpoint, (2) send the right body
 * (mode / calculatorCatalog flag), (3) NORMALIZE the catalog-specific backend
 * envelope into the shared { options[], source, ... } shape DbBackedSelect consumes,
 * and (4) fail soft on a missing array but THROW on a non-2xx (so the UI surfaces a
 * real error rather than a silent-empty list). Only the network boundary is stubbed.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchMachineCatalog,
  fetchProgrammingCatalog,
  fetchHolderCatalog,
  fetchWorkholdingCatalog,
  SFC_CATALOG_FETCHERS,
} from "../api/sfcReferenceCatalogs";

function stubFetch(result: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve({ result }),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchMachineCatalog", () => {
  it("POSTs /machine/search with the calculatorCatalog flag and maps rows to options", async () => {
    const fn = stubFetch({
      machines: [
        {
          id: "src_haas_vf2_vmc_1",
          manufacturer: "Haas",
          model: "VF-2",
          name: "Haas VF-2",
          type: "vertical_machining_center",
          controller: { brand: "Haas", model: "NGC" },
          spindle: { max_rpm: 8100, power_continuous: 22.4 },
        },
      ],
      total: 1,
      source: "aggregated",
    });
    const res = await fetchMachineCatalog();

    expect(fn.mock.calls[0][0]).toBe("/api/v1/data/machine/search");
    expect(fn.mock.calls[0][1].method).toBe("POST");
    const body = JSON.parse(fn.mock.calls[0][1].body);
    expect(body.calculatorCatalog).toBe(true);
    expect(body.mode).toBe("mill");

    expect(res.source).toBe("database");
    expect(res.options).toHaveLength(1);
    const opt = res.options[0];
    expect(opt.id).toBe("src_haas_vf2_vmc_1");
    expect(opt.label).toBe("Haas VF-2");
    expect(opt.maxRpm).toBe(8100);
    expect(opt.detail).toContain("Vertical Machining Center"); // humanized type
    expect(opt.detail).toContain("8,100 RPM");
    expect(res.manufacturers).toEqual(["Haas"]);
  });

  it("synthesizes a label from manufacturer+model when name is absent", async () => {
    stubFetch({ machines: [{ id: "m2", manufacturer: "Mazak", model: "VTC-800" }] });
    const res = await fetchMachineCatalog("lathe");
    expect(res.options[0].label).toBe("Mazak VTC-800");
  });

  it("fails soft to an empty option list when machines is missing", async () => {
    stubFetch({ total: 0 });
    const res = await fetchMachineCatalog();
    expect(res.options).toEqual([]);
    expect(res.manufacturers).toEqual([]);
  });
});

describe("fetchProgrammingCatalog (CAM)", () => {
  it("POSTs /programming/catalog with mode and maps environments + dedups vendors", async () => {
    const fn = stubFetch({
      programming: [
        { id: "mastercam", label: "Mastercam", vendor: "CNC Software", kind: "cam", badge: "CAM", summary: "Dynamic Motion" },
        { id: "fusion360", label: "Fusion 360", vendor: "Autodesk", kind: "cam", badge: "CAM", summary: "Adaptive Clearing" },
      ],
      total: 2,
      source: "curated",
    });
    const res = await fetchProgrammingCatalog();

    expect(fn.mock.calls[0][0]).toBe("/api/v1/data/programming/catalog");
    expect(JSON.parse(fn.mock.calls[0][1].body).mode).toBe("mill");
    expect(res.source).toBe("curated");
    expect(res.fallbackCount).toBe(2);
    expect(res.options.map((o) => o.label)).toEqual(["Mastercam", "Fusion 360"]);
    expect(res.options[0].detail).toContain("Dynamic Motion");
    expect(res.vendors).toEqual(["Autodesk", "CNC Software"]);
  });
});

describe("fetchHolderCatalog", () => {
  it("POSTs /holder/catalog and passes through {id,label,detail} + collects brands", async () => {
    const fn = stubFetch({
      holders: [
        { id: "haimer_power_shrink", label: "Haimer - Power Shrink", detail: "CAT40 - 25000 RPM", brandLabel: "Haimer", holderType: "SHRINK_FIT", spindleInterface: "CAT40", maxRpm: 25000 },
      ],
    });
    const res = await fetchHolderCatalog();
    expect(fn.mock.calls[0][0]).toBe("/api/v1/data/holder/catalog");
    expect(res.source).toBe("database");
    expect(res.options[0].id).toBe("haimer_power_shrink");
    expect(res.options[0].maxRpm).toBe(25000);
    expect(res.brands).toEqual(["Haimer"]);
  });

  it("fails soft when holders is missing", async () => {
    stubFetch({});
    const res = await fetchHolderCatalog();
    expect(res.options).toEqual([]);
  });
});

describe("fetchWorkholdingCatalog (monolith fixture DB surface)", () => {
  it("POSTs /workholding/catalog and maps presetOptions; hybrid source -> database", async () => {
    const fn = stubFetch({
      presetOptions: [
        { id: "kurt_dl640", label: "Kurt DL640 Vise", detail: "40 kN clamp", categoryId: "vise", brandId: "kurt" },
      ],
      categoryOptions: [{ id: "vise", label: "Vise" }],
      total: 1,
      source: "hybrid",
      liveCount: 1,
      fallbackCount: 0,
      note: "monolith",
    });
    const res = await fetchWorkholdingCatalog();
    expect(fn.mock.calls[0][0]).toBe("/api/v1/data/workholding/catalog");
    expect(JSON.parse(fn.mock.calls[0][1].body).mode).toBe("mill");
    expect(res.source).toBe("database"); // hybrid normalizes to database
    expect(res.options[0].id).toBe("kurt_dl640");
    expect(res.options[0].categoryId).toBe("vise");
    expect(res.categories).toEqual([{ id: "vise", label: "Vise" }]);
    expect(res.note).toBe("monolith");
  });
});

describe("registry + error contract", () => {
  it("registers all 10 catalog keys (6 GET + 4 POST)", () => {
    expect(Object.keys(SFC_CATALOG_FETCHERS).sort()).toEqual(
      [
        "coating",
        "coolant",
        "coolant-product",
        "holder",
        "insert",
        "machine",
        "programming",
        "stock",
        "turning-insert",
        "workholding",
      ].sort(),
    );
  });

  it("THROWS on a non-2xx response (never a silent-empty list)", async () => {
    stubFetch({}, false, 503);
    await expect(fetchMachineCatalog()).rejects.toThrow(/machine\/search failed: 503/);
  });
});
