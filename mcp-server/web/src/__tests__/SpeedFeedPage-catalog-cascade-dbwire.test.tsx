/**
 * SpeedFeedPage-catalog-cascade-dbwire.test.tsx (slot:oscar)
 *
 * Pins the 6 DB-backed cascade companions on SpeedFeedPage: stock, tool-holder,
 * workholding/fixture, coolant-product, coolant-METHOD, and turning-insert. Each is a live
 * <DbBackedSelect> whose pick CASCADES into an EXISTING orchestrator field (so it is wired
 * to the calc consumer, never an orphan): stock -> material + iso_group + hardness; holder ->
 * holder_type; workholding -> workholding_type; coolant product -> coolant_type; coolant
 * method -> coolant_type (via the method-id->enum map); turning insert -> corner_radius_mm
 * (nose radius) + tool_series (ISO). Only the network
 * boundary is stubbed (per-endpoint router); the real fetchers + real DbBackedSelect +
 * real page cascade run. A regression (pick stops filling the field, or wrong field)
 * fails here.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("../hooks/useSpeedFeed", () => ({
  useSpeedFeedOrchestrate: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
  useSpeedFeedOptimize: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
}));

import SpeedFeedPage from "../pages/SpeedFeedPage";

const ok = (result: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ result }) });

// Route each catalog endpoint the page mounts (coating + the 4 cascade companions) to a
// realistic RAW backend payload -- the real fetchers normalize these.
function routeFetch() {
  const fn = vi.fn().mockImplementation((url: string) => {
    const u = String(url);
    if (u.endsWith("/stock/catalog"))
      return ok({
        options: [{ id: "st1", label: "17-4 PH 1.5in RD", detail: "", materialSpec: "17-4 PH", isoGroup: "M", form: "round", sizeLabel: "1.5in", hardnessHrc: 38 }],
        total: 1, source: "database", liveCount: 1, fallbackCount: 0, note: "", forms: ["round"], isoGroups: ["M"],
      });
    if (u.endsWith("/holder/catalog"))
      return ok({ holders: [{ id: "h1", label: "BT40 - Shrink Fit", detail: "BT40", brandLabel: "Haimer", holderType: "SHRINK_FIT", spindleInterface: "BT40", maxRpm: 25000 }] });
    if (u.endsWith("/workholding/catalog"))
      return ok({
        presetOptions: [
          { id: "w1", label: "Kurt Fixture Plate", detail: "", categoryId: "fixture", brandId: "kurt", workholdingId: "fixture-plate" },
          { id: "w2", label: "Schmalz Vacuum Chuck 200", detail: "", categoryId: "fixture", brandId: "schmalz", workholdingId: "vacuum-fixture" },
        ],
        categoryOptions: [{ id: "fixture", label: "Fixture" }],
        total: 2, source: "database", liveCount: 2, fallbackCount: 0, note: "",
      });
    if (u.endsWith("/coolant-product/catalog"))
      return ok({
        options: [{ id: "cp1", label: "Blaser Vasco MQL", detail: "", vendor: "Blaser", vendorCountry: "CH", type: "oil", coolingType: "mql", bestFor: "aluminium" }],
        total: 1, source: "database", liveCount: 1, fallbackCount: 0, note: "", vendors: ["Blaser"], coolingTypes: ["mql"],
      });
    if (u.endsWith("/machine/search"))
      return ok({ machines: [{ id: "m_live", manufacturer: "LiveCo", model: "X1", name: "LiveCo X1", type: "vertical_machining_center", controller: { brand: "Fanuc" }, spindle: { max_rpm: 12000 } }], total: 1, source: "aggregated" });
    if (u.endsWith("/programming/catalog"))
      return ok({ programming: [{ id: "livecam", label: "LiveCAM", vendor: "LiveCAM Inc", kind: "cam", badge: "CAM", summary: "x" }], total: 1, source: "curated" });
    if (u.endsWith("/insert/catalog"))
      return ok({
        options: [{ id: "in1", label: "CNMG432 GC4325", detail: "", manufacturer: "Sandvik", grade: "GC4325", coating: "TiAlN", material: "P", family: "CoroTurn 107" }],
        total: 1, source: "database", liveCount: 1, fallbackCount: 0, note: "", manufacturers: ["Sandvik"], materials: ["P"],
      });
    if (u.endsWith("/coating/catalog"))
      return ok({ options: [{ id: "tialn", label: "TiAlN", detail: "" }], total: 1, source: "database", liveCount: 1, fallbackCount: 0, note: "", recommendedByMaterial: {} });
    if (u.endsWith("/coolant/catalog"))
      return ok({
        // Mirror the REAL DB id set incl. "none" (a no-coolant cut) so a missing-mapping regression
        // -- e.g. "none" silently staying on the default "flood" -- fails here, not on a live machine.
        options: [
          { id: "none", label: "None", detail: "No coolant", effectiveness: 0, factor: null },
          { id: "through-spindle", label: "Through Spindle", detail: "80% cooling - 1.1x factor", effectiveness: 0.8, factor: 1.1 },
          { id: "flood", label: "Flood", detail: "70% cooling", effectiveness: 0.7, factor: 1.0 },
        ],
        total: 3, source: "database", liveCount: 3, fallbackCount: 0, note: "", recommendedByMaterial: {},
      });
    if (u.endsWith("/turning-insert/catalog"))
      return ok({
        options: [{ id: "ti1", label: "CNMG120408 (C 80deg)", detail: "nose 0.8mm", iso: "CNMG120408", ansi: "CNMG432", shapeCode: "C", shapeName: "Rhombic 80deg", noseRadius: 0.8, edges: 4, type: "negative", application: "P" }],
        total: 1, source: "database", liveCount: 1, fallbackCount: 0, note: "", shapes: ["C"],
      });
    return ok({ options: [], total: 0, source: "curated", liveCount: 0, fallbackCount: 0, note: "" });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SpeedFeedPage DB-backed catalog cascades fill existing orchestrator fields", () => {
  it("stock pick cascades material + iso_group + hardness_hrc", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const stock = (await screen.findByLabelText("Raw stock (fills material + ISO + hardness)")) as HTMLSelectElement;
    await waitFor(() => expect(stock).not.toBeDisabled());

    expect((screen.getByLabelText("Material") as HTMLInputElement).value).toBe("4140 prehard"); // default before pick
    fireEvent.change(stock, { target: { value: "st1" } });

    expect((screen.getByLabelText("Material") as HTMLInputElement).value).toBe("17-4 PH");
    expect((screen.getByLabelText("ISO") as HTMLSelectElement).value).toBe("M");
    expect((screen.getByLabelText("HRC") as HTMLInputElement).value).toBe("38");
  });

  it("holder pick maps holderType -> holder_type enum", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const holderCat = (await screen.findByLabelText("Holder catalog (fills holder type)")) as HTMLSelectElement;
    await waitFor(() => expect(holderCat).not.toBeDisabled());

    expect((screen.getByLabelText("Holder") as HTMLSelectElement).value).toBe("ER_collet"); // default
    expect((screen.getByLabelText("Taper") as HTMLSelectElement).value).toBe("CAT40"); // default
    fireEvent.change(holderCat, { target: { value: "h1" } });
    expect((screen.getByLabelText("Holder") as HTMLSelectElement).value).toBe("shrink_fit"); // holderType -> holder_type
    expect((screen.getByLabelText("Taper") as HTMLSelectElement).value).toBe("BT40"); // spindleInterface -> spindle_taper
  });

  it("workholding pick maps categoryId -> workholding_type enum", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const whCat = (await screen.findByLabelText("Workholding / fixture catalog (fills workholding type)")) as HTMLSelectElement;
    await waitFor(() => expect(whCat).not.toBeDisabled());

    expect((screen.getByLabelText("Workholding") as HTMLSelectElement).value).toBe("vise"); // default
    fireEvent.change(whCat, { target: { value: "w1" } });
    expect((screen.getByLabelText("Workholding") as HTMLSelectElement).value).toBe("fixture");
  });

  it("workholding 'fixture' category refines to vacuum via workholdingId token", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const whCat = (await screen.findByLabelText("Workholding / fixture catalog (fills workholding type)")) as HTMLSelectElement;
    await waitFor(() => expect(whCat).not.toBeDisabled());
    fireEvent.change(whCat, { target: { value: "w2" } }); // workholdingId "vacuum-fixture"
    expect((screen.getByLabelText("Workholding") as HTMLSelectElement).value).toBe("vacuum");
  });

  it("insert pick fills insert_grade + tool_grade + tool_series", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const ins = (await screen.findByLabelText("Indexable insert (fills grade + series)")) as HTMLSelectElement;
    await waitFor(() => expect(ins).not.toBeDisabled());
    fireEvent.change(ins, { target: { value: "in1" } });
    expect((screen.getByLabelText("Insert grade") as HTMLInputElement).value).toBe("GC4325");
    expect((screen.getByLabelText("Tool grade") as HTMLInputElement).value).toBe("GC4325");
    expect((screen.getByLabelText("Tool series") as HTMLInputElement).value).toBe("CoroTurn 107");
  });

  it("coolant-product pick maps coolingType -> coolant_type enum", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const cpCat = (await screen.findByLabelText("Coolant product (fills coolant type)")) as HTMLSelectElement;
    await waitFor(() => expect(cpCat).not.toBeDisabled());

    expect((screen.getByLabelText("Coolant") as HTMLSelectElement).value).toBe("flood"); // default
    fireEvent.change(cpCat, { target: { value: "cp1" } });
    expect((screen.getByLabelText("Coolant") as HTMLSelectElement).value).toBe("MQL");
  });

  it("coolant-METHOD pick maps the DB method id -> coolant_type enum (non-identity: through-spindle -> through_tool)", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const cm = (await screen.findByLabelText("Coolant method (fills coolant type; rates effectiveness)")) as HTMLSelectElement;
    await waitFor(() => expect(cm).not.toBeDisabled());

    expect((screen.getByLabelText("Coolant") as HTMLSelectElement).value).toBe("flood"); // default
    // "through-spindle" is NOT an enum value -- the COOLANT_METHOD_TO_TYPE map must translate the
    // hyphenated DB slug to the underscored enum member. A pick that differs from the default proves
    // the mapping fires (an identity passthrough would leave it on "flood" and pass vacuously).
    fireEvent.change(cm, { target: { value: "through-spindle" } });
    expect((screen.getByLabelText("Coolant") as HTMLSelectElement).value).toBe("through_tool");

    // SAFETY: a "None" (no-coolant) pick MUST land coolant_type="dry", NOT silently stay on the
    // default "flood" -- over-claiming 70% cooling on a dry cut would let the calc recommend a
    // too-aggressive Vc and suppress the dry-cut fire warning (Ti/Inconel). Regression guard.
    fireEvent.change(cm, { target: { value: "none" } });
    expect((screen.getByLabelText("Coolant") as HTMLSelectElement).value).toBe("dry");
  });

  it("turning-insert pick fills corner_radius_mm (nose radius) + tool_series (ISO designation)", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    const ti = (await screen.findByLabelText("Turning insert (fills nose radius + ISO series)")) as HTMLSelectElement;
    await waitFor(() => expect(ti).not.toBeDisabled());

    fireEvent.change(ti, { target: { value: "ti1" } });
    // noseRadius 0.8 -> Corner R mm (drives Ra = fz^2/(32*r)); iso "CNMG120408" -> Tool series.
    expect((screen.getByLabelText("Corner R mm") as HTMLInputElement).value).toBe("0.8");
    expect((screen.getByLabelText("Tool series") as HTMLInputElement).value).toBe("CNMG120408");
  });

  it("live machine + CAM catalogs replace the hardcoded lists, keeping JM presets", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    await waitFor(() => expect(screen.getByRole("option", { name: "LiveCo X1" })).toBeTruthy()); // live machine
    expect(screen.getByRole("option", { name: "JM Die - Haas VF-2" })).toBeTruthy(); // JM preset untouched
    expect(screen.getByRole("option", { name: "LiveCAM Inc" })).toBeTruthy(); // live CAM vendor
  });

  it("renders the new companions as live DB selects (source badge from the DB)", async () => {
    routeFetch();
    render(<SpeedFeedPage />);
    // The stock option from the DB is present (not a hardcoded list).
    await waitFor(() => expect(screen.getByRole("option", { name: "17-4 PH 1.5in RD" })).toBeTruthy());
  });
});
