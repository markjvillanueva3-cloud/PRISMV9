/**
 * sfc-backend-search-wire.test.tsx (slot:oscar)
 *
 * Pins the fix for the SfcCalculatorPage Smart*Selector DEAD BACKEND WIRES: the
 * selectors read `res.results`, but POST /<x>/search returns `{ result: { <key>: [] } }`,
 * so the DB search silently yielded [] and the page fell back to the tiny local lists.
 *
 * Two layers: (1) the pure `unwrapSearchRows` helper handles the real `result.<key>`
 * shape (+ legacy/bare fallbacks); (2) SmartMaterialSelector end-to-end -- a backend
 * row in `{result:{materials:[...]}}` with NESTED registry fields renders under its
 * TRUE ISO group (proving both the unwrap and the nested-field mapping).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { unwrapSearchRows, dataApi } from "../api/data";
import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";

// Keep the REAL unwrapSearchRows; mock only the network methods on dataApi.
vi.mock("../api/data", async (importActual) => {
  const actual = await importActual<typeof import("../api/data")>();
  return { ...actual, dataApi: { ...actual.dataApi, searchMaterials: vi.fn() } };
});

describe("unwrapSearchRows", () => {
  it("reads the real `result.<key>` envelope the routes return", () => {
    const rows = unwrapSearchRows({ result: { materials: [{ id: "a" }, { id: "b" }], total: 2 } }, "materials");
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("DEAD-WIRE proof: the old `results` key on a `result.materials` body yields [] (the bug); the right key fixes it", () => {
    const body = { result: { tools: [{ id: "t1" }] } };
    // The selectors used to read a top-level `results` array that does not exist:
    expect(unwrapSearchRows(body, "results")).toEqual([]);
    // The correct key returns the rows:
    expect(unwrapSearchRows(body, "tools").map((r) => r.id)).toEqual(["t1"]);
  });

  it("tolerates a legacy top-level `results` array and a bare array", () => {
    expect(unwrapSearchRows({ results: [{ id: "x" }] }, "machines").map((r) => r.id)).toEqual(["x"]);
    expect(unwrapSearchRows([{ id: "y" }], "machines").map((r) => r.id)).toEqual(["y"]);
  });

  it("filters non-object rows and returns [] for malformed payloads", () => {
    expect(unwrapSearchRows({ result: { tools: [null, 5, "s", { id: "ok" }] } }, "tools").map((r) => r.id)).toEqual(["ok"]);
    expect(unwrapSearchRows(null, "tools")).toEqual([]);
    expect(unwrapSearchRows({ result: {} }, "tools")).toEqual([]);
  });
});

describe("SmartMaterialSelector backend DB search (dead wire fixed)", () => {
  const mockSearch = vi.mocked(dataApi.searchMaterials);

  beforeEach(() => {
    vi.useFakeTimers();
    mockSearch.mockReset();
    try { localStorage.clear(); } catch { /* jsdom */ }
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders a backend material from {result:{materials}} under its TRUE ISO group (nested fields mapped)", async () => {
    // A registry-shaped row: ISO group is nested under classification, hardness under
    // mechanical.hardness.brinell. A flat-only read would default this to P/Steel/200HB.
    mockSearch.mockResolvedValue({
      result: {
        materials: [
          { material_id: "hast-c276", name: "Hastelloy C276", classification: { iso_group: "S" }, mechanical: { hardness: { brinell: 210 } } },
        ],
        total: 1,
        hasMore: false,
      },
    } as never);

    render(<SmartMaterialSelector value={null} onChange={vi.fn()} />);
    const input = screen.getByLabelText("Search materials") as HTMLInputElement;
    fireEvent.focus(input);
    // A query that matches NO local material, so only the backend row can satisfy it.
    fireEvent.change(input, { target: { value: "hastelloy" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(mockSearch).toHaveBeenCalledWith({ query: "hastelloy", limit: 50 });
    // The backend row renders (was [] before the unwrap fix) ...
    expect(screen.getByText("Hastelloy C276")).toBeTruthy();
    // ... and under "S - Superalloys", proving classification.iso_group mapped to S
    // (a flat-only read would have filed it under "P - Steel").
    expect(screen.getByText(/Superalloys/)).toBeTruthy();
  });
});
