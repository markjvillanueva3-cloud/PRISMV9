/**
 * SpeedFeedPage-coating-dbwire.test.tsx (slot:oscar)
 *
 * Pins that the Coating input on SpeedFeedPage is DB-backed via <DbBackedSelect> +
 * the /coating/catalog fetcher (was a hardcoded 8-item COATINGS array). Exercises the
 * REAL fetcher (fetchCoatingCatalog -> fetchCatalog -> fetch) + REAL DbBackedSelect +
 * REAL page render -- only the network boundary (global.fetch) is stubbed, and the
 * orchestrate/optimize calc hooks are mocked (no live calc server in jsdom). The
 * backend contract is preserved: the <option> VALUE is the catalog LABEL ("TiAlN"),
 * exactly the string the orchestrator already receives for tool_coating -- a
 * regression to the id ("tialn") or back to a hardcoded list fails this test.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock only the calc hooks (no live calc server in jsdom) -- same pattern as
// SpeedFeedPage-blocked-surfacing.test.tsx. The reference-catalog fetch path stays REAL.
vi.mock("../hooks/useSpeedFeed", () => ({
  useSpeedFeedOrchestrate: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
  useSpeedFeedOptimize: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
}));

import SpeedFeedPage from "../pages/SpeedFeedPage";

// Stub the REAL network boundary: DbBackedSelect -> fetchCoatingCatalog -> fetchCatalog
// -> fetch('/api/v1/data/coating/catalog'). The { result } envelope is unwrapped by the
// real fetcher. Fixture mimics the live shape (id = slug, label = display) + includes a
// coating (AlTiSiN) absent from the removed hardcoded set to prove the DB is the source.
// The page mounts several DB-backed selects (coating + stock/holder/workholding/
// coolant-product cascade companions), so the fetch stub MUST be endpoint-aware --
// only the /coating/catalog endpoint returns coatings; every other catalog endpoint
// returns an empty list so coating options never bleed into another select.
function stubCoatingFetch() {
  const empty = (result: Record<string, unknown> = {}) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: { options: [], total: 0, source: "curated", liveCount: 0, fallbackCount: 0, note: "", ...result } }),
    });
  const fn = vi.fn().mockImplementation((url: string) => {
    if (String(url).endsWith("/coating/catalog")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: {
              options: [
                { id: "tialn", label: "TiAlN", detail: "PVD - 3300 HV" },
                { id: "altin", label: "AlTiN", detail: "PVD - 3500 HV" },
                { id: "altisin", label: "AlTiSiN", detail: "PVD - 3700 HV" },
              ],
              total: 3,
              source: "database",
              liveCount: 3,
              fallbackCount: 0,
              note: "",
              recommendedByMaterial: {},
            },
          }),
      });
    }
    if (String(url).endsWith("/holder/catalog")) return empty({ holders: [] });
    if (String(url).endsWith("/workholding/catalog")) return empty({ presetOptions: [], categoryOptions: [] });
    return empty();
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SpeedFeedPage coating select is DB-backed (live /coating/catalog via the real fetcher)", () => {
  it("GETs the coating catalog endpoint and renders an option absent from the old hardcoded set", async () => {
    const fetchFn = stubCoatingFetch();
    render(<SpeedFeedPage />);
    const coating = screen.getByLabelText("Coating") as HTMLSelectElement;
    await waitFor(() => expect(coating).not.toBeDisabled());

    // The real fetcher hit the real endpoint path (the page now mounts several DB
    // selects, so coating is one of several calls -- assert it was made, not that it
    // was first).
    expect(fetchFn).toHaveBeenCalled();
    expect(fetchFn.mock.calls.some((c: unknown[]) => c[0] === "/api/v1/data/coating/catalog")).toBe(true);
    // Sourced from the DB, not the removed 8-item COATINGS array.
    expect(screen.getByRole("option", { name: "AlTiSiN" })).toBeTruthy();
  });

  it("preserves the tool_coating contract: option value is the LABEL, default stays selected", async () => {
    stubCoatingFetch();
    render(<SpeedFeedPage />);
    const coating = screen.getByLabelText("Coating") as HTMLSelectElement;
    await waitFor(() => expect(coating).not.toBeDisabled());

    const opt = screen.getByRole("option", { name: "TiAlN" }) as HTMLOptionElement;
    expect(opt.value).toBe("TiAlN"); // the LABEL, NOT the id "tialn"
    expect(coating.value).toBe("TiAlN"); // the page's default tool_coating stays selected
  });

  it("keeps the 'Catalog default' placeholder option (empty value)", async () => {
    stubCoatingFetch();
    render(<SpeedFeedPage />);
    const coating = screen.getByLabelText("Coating") as HTMLSelectElement;
    await waitFor(() => expect(coating).not.toBeDisabled());
    const placeholder = screen.getByRole("option", { name: "Catalog default" }) as HTMLOptionElement;
    expect(placeholder.value).toBe("");
  });
});
