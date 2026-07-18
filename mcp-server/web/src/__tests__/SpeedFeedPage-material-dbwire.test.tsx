/**
 * SpeedFeedPage-material-dbwire.test.tsx (slot:oscar)
 *
 * Pins that the Material input on SpeedFeedPage is DB-backed via a native <datalist>
 * seeded from the materials module (was a bare free-text <input> with zero suggestions).
 *
 * WHY a datalist and not a <select>/combobox: material is OPEN-ENDED (the orchestrator
 * resolves any alloy NAME string), so a search-only combobox (SmartMaterialSelector)
 * would REGRESS free-text entry of an off-catalog alloy. A <datalist> keeps the plain
 * text input -- type ANY material -- while surfacing DB suggestions, so it is the
 * non-regressing, contract-preserving wire.
 *
 * Contract preserved: the orchestrator still receives the material NAME string (the
 * input value). The only added behavior is a CASCADE -- when the typed/selected value
 * EXACTLY matches a catalog material, iso_group + hardness_hb auto-fill from that
 * material's real ISO 513 group + hardness. An off-catalog alloy leaves them untouched.
 *
 * Real I/O: only the network boundary (global.fetch, used by the unrelated coating
 * DbBackedSelect on the same page) is stubbed so the page settles; the material datalist
 * is local. Reference values (group, hardness) are read from the live MATERIALS module,
 * so a regression in the cascade mapping fails this test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Mock only the calc hooks (no live calc server in jsdom) -- same pattern as the
// coating-dbwire + blocked-surfacing tests. The material datalist path stays REAL.
vi.mock("../hooks/useSpeedFeed", () => ({
  useSpeedFeedOrchestrate: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
  useSpeedFeedOptimize: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
}));

import SpeedFeedPage from "../pages/SpeedFeedPage";
import { MATERIALS } from "../data/materials";

// The coating DbBackedSelect on the same page fetches on mount. Stub fetch so it settles
// cleanly (curated-empty is fine -- this test is about the material datalist, not coating).
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          result: { options: [], total: 0, source: "curated", liveCount: 0, fallbackCount: 0, note: "" },
        }),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Render + wait for the page (coating select) to settle, then hand back the wired fields. */
async function renderSettled() {
  const view = render(<SpeedFeedPage />);
  await waitFor(() => expect(screen.getByLabelText("Coating")).not.toBeDisabled());
  const material = view.container.querySelector('[data-field="material"]') as HTMLInputElement;
  const iso = view.container.querySelector('[data-field="iso_group"]') as HTMLSelectElement;
  const hb = view.container.querySelector('[data-field="hardness_hb"]') as HTMLInputElement;
  return { ...view, material, iso, hb };
}

describe("SpeedFeedPage material input is DB-backed via a <datalist> (non-regressing free-text)", () => {
  it("renders a datalist seeded from EVERY catalog material and points the input at it", async () => {
    const { container, material } = await renderSettled();

    expect(material).toBeTruthy();
    expect(material.getAttribute("list")).toBe("sfc-material-suggestions");

    const list = container.querySelector("datalist#sfc-material-suggestions");
    expect(list).toBeTruthy();
    const options = Array.from(list!.querySelectorAll("option")) as HTMLOptionElement[];
    // Every material in the module is offered as a suggestion (count-proven, not "looks seeded").
    expect(options.length).toBe(MATERIALS.length);
    const names = options.map((o) => o.value);
    expect(names).toContain("AISI 4140 Alloy Steel");
    expect(names).toContain("Inconel 718");
    expect(names).toContain("6061-T6 Aluminum");
  });

  it("cascades iso_group + hardness_hb from a recognized catalog material (real ISO/hardness values)", async () => {
    const { material, iso, hb } = await renderSettled();

    // Page defaults before any material change.
    expect(iso.value).toBe("P");
    expect(hb.value).toBe("300");

    // 6061-T6 Aluminum -> group N, hardness 95 HB (live MATERIALS reference values).
    const al = MATERIALS.find((m) => m.name === "6061-T6 Aluminum")!;
    expect(al.group).toBe("N");
    expect(al.hardness).toBe(95);
    fireEvent.change(material, { target: { value: "6061-T6 Aluminum" } });

    expect(material.value).toBe("6061-T6 Aluminum"); // orchestrator still receives the NAME string
    expect(iso.value).toBe("N"); // cascaded from the catalog material
    expect(hb.value).toBe("95"); // cascaded from the catalog material
  });

  it("is data-driven, not hardcoded to one material (a second catalog reference cascades differently)", async () => {
    const { material, iso, hb } = await renderSettled();

    // Inconel 718 -> group S, hardness 380 HB. A mapping hardcoded to 6061 would fail here.
    const inconel = MATERIALS.find((m) => m.name === "Inconel 718")!;
    expect(inconel.group).toBe("S");
    expect(inconel.hardness).toBe(380);
    fireEvent.change(material, { target: { value: "Inconel 718" } });

    expect(iso.value).toBe("S");
    expect(hb.value).toBe("380");
  });

  it("PRESERVES free-text entry of an off-catalog alloy (no regression) and does not fabricate a cascade", async () => {
    const { material, iso, hb } = await renderSettled();

    // An alloy not in the catalog (e.g. a proprietary grade) must still be enterable.
    expect(MATERIALS.find((m) => m.name === "Vascomax C300")).toBeUndefined();
    fireEvent.change(material, { target: { value: "Vascomax C300" } });

    expect(material.value).toBe("Vascomax C300"); // free-text fully preserved
    expect(iso.value).toBe("P"); // untouched -- no fabricated ISO group for an unknown alloy
    expect(hb.value).toBe("300"); // untouched -- no fabricated hardness
  });

  it("matches catalog names case-insensitively but keeps the user's typed string verbatim", async () => {
    const { material, iso, hb } = await renderSettled();

    // Lowercased name still cascades (case-insensitive match) ...
    fireEvent.change(material, { target: { value: "inconel 718" } });
    expect(iso.value).toBe("S");
    expect(hb.value).toBe("380");
    // ... while the orchestrator receives exactly what the user typed (not the canonical case).
    expect(material.value).toBe("inconel 718");
  });

  it("FILLS but never WIPES: a later off-catalog entry retains the prior cascade's iso/hardness", async () => {
    const { material, iso, hb } = await renderSettled();

    // Cascade from a recognized material ...
    fireEvent.change(material, { target: { value: "Inconel 718" } });
    expect(iso.value).toBe("S");
    expect(hb.value).toBe("380");

    // ... then type an off-catalog alloy: material updates to free-text, but the cascade
    // must NOT reset iso/hardness (wiping a populated value would be the more surprising bug).
    fireEvent.change(material, { target: { value: "Vascomax C300" } });
    expect(material.value).toBe("Vascomax C300");
    expect(iso.value).toBe("S"); // retained, not wiped
    expect(hb.value).toBe("380"); // retained, not wiped
  });

  it("clears a stale HRC when a catalog material cascades (HB becomes authoritative)", async () => {
    const { container, material, hb } = await renderSettled();

    // User first sets an HRC by hand (e.g. for an unknown hardened alloy) ...
    const hrc = container.querySelector('[data-field="hardness_hrc"]') as HTMLInputElement;
    fireEvent.change(hrc, { target: { value: "55" } });
    expect(hrc.value).toBe("55");

    // ... then selects a catalog material, which is Brinell-defined: HB fills, the now-stale
    // HRC is dropped so the orchestrator never receives a conflicting HB/HRC pair.
    fireEvent.change(material, { target: { value: "AISI 4140 Alloy Steel" } });
    expect(hb.value).toBe("280"); // cascaded HB (materials.ts reference)
    expect(hrc.value).toBe(""); // stale HRC cleared
  });
});
