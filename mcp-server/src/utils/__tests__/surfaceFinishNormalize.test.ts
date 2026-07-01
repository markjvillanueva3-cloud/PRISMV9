// Tests for the surface-finish callout normalizer (U-XRAY-SURFACE-FINISH-NORMALIZE, TS
// port). Reference values are pinned identical to the canonical .mjs side
// (scripts/lib/ollama-vision-extract-lib.test.mjs) so the cross-boundary clone stays in sync.
import { describe, it, expect } from "vitest";
import {
  normalizeSurfaceFinish,
  resolveSurfaceFinishRa,
  mapSurfaceFinishCallout,
  mapSurfaceFinishes,
  selectPartDefaultFinish,
  ISO_N_GRADE_RA_UM,
} from "../surfaceFinishNormalize.js";

// micron sign built via fromCharCode (pure-ASCII source, exercises the Unicode match)
const MU = String.fromCharCode(0xb5);
const GMU = String.fromCharCode(0x3bc);

describe("normalizeSurfaceFinish", () => {
  it("RMS treated as microinch Ra-equivalent (63 RMS = 1.6002 um)", () => {
    const r = normalizeSurfaceFinish("63 RMS");
    expect(r.ra_um).toBe(1.6002);
    expect(r.system).toBe("RMS");
    expect(r.resolved).toBe(true);
    expect(r.assumed).toBe(false);
  });

  it("explicit microinch (both micron signs + word) -> um", () => {
    expect(normalizeSurfaceFinish("125 " + MU + "in").ra_um).toBe(3.175);
    expect(normalizeSurfaceFinish("250 " + GMU + "in").ra_um).toBe(6.35);
    expect(normalizeSurfaceFinish("32 microinch").ra_um).toBe(0.8128);
    expect(normalizeSurfaceFinish("125 " + MU + "in").system).toBe("Ra-uin");
  });

  it("microinch written with the inch double-quote (parity with .mjs)", () => {
    // 25 is in the um-preferred series -> without the quote branch this silently read as 25 um
    expect(normalizeSurfaceFinish("25" + MU + '"')).toMatchObject({ ra_um: 0.635, system: "Ra-uin", assumed: false });
    expect(normalizeSurfaceFinish('10u"')).toMatchObject({ ra_um: 0.254, system: "Ra-uin", assumed: false });
  });

  it("explicit micrometre -> um unchanged", () => {
    expect(normalizeSurfaceFinish("Ra 0.8 " + MU + "m").ra_um).toBe(0.8);
    expect(normalizeSurfaceFinish("0.8" + MU + "m").ra_um).toBe(0.8);
    expect(normalizeSurfaceFinish("1.6 micron").ra_um).toBe(1.6);
  });

  it("ISO 1302 N-grades from table", () => {
    expect(normalizeSurfaceFinish("N6").ra_um).toBe(0.8);
    expect(normalizeSurfaceFinish("N7").ra_um).toBe(1.6);
    expect(normalizeSurfaceFinish("N1").ra_um).toBe(0.025);
    expect(normalizeSurfaceFinish("N12").ra_um).toBe(50);
    expect(normalizeSurfaceFinish("N6").system).toBe("ISO-N");
  });

  it("bare preferred-series number disambiguated + assumed flag", () => {
    expect(normalizeSurfaceFinish("Ra 0.4")).toMatchObject({ ra_um: 0.4, system: "Ra-um", assumed: true });
    // 32 / 63 are microinch-preferred -> uin, NOT 32 um (the magnitude trap)
    expect(normalizeSurfaceFinish("32")).toMatchObject({ ra_um: 0.8128, system: "Ra-uin", assumed: true });
    expect(normalizeSurfaceFinish("63").ra_um).toBe(1.6002);
  });

  it("bare >50 no-unit -> microinch assumed", () => {
    expect(normalizeSurfaceFinish("100")).toMatchObject({ ra_um: 2.54, system: "Ra-uin", assumed: true });
  });

  it("explicit unit token wins over RMS/Rq shorthand", () => {
    expect(normalizeSurfaceFinish("Rq 0.4 " + MU + "m").ra_um).toBe(0.4);
    expect(normalizeSurfaceFinish("Rq 0.4 " + MU + "m").system).toBe("Ra-um");
    expect(normalizeSurfaceFinish("63 RMS").system).toBe("RMS");
  });

  // failure modes: never a silent guess (R12)
  it("ambiguous bare number -> resolved=false, ra_um=null", () => {
    const r = normalizeSurfaceFinish("Ra 10");
    expect(r.resolved).toBe(false);
    expect(r.ra_um).toBeNull();
  });

  it("negative callout never silently resolves", () => {
    const a = normalizeSurfaceFinish("-5 " + MU + "in");
    expect(a.resolved).toBe(false);
    expect(a.ra_um).toBeNull();
    expect(normalizeSurfaceFinish("Ra -0.8 " + MU + "m").ra_um).toBeNull();
  });

  it("no numeric value / empty / null -> resolved=false", () => {
    expect(normalizeSurfaceFinish("smooth finish").resolved).toBe(false);
    expect(normalizeSurfaceFinish("").resolved).toBe(false);
    expect(normalizeSurfaceFinish(null).ra_um).toBeNull();
    expect(normalizeSurfaceFinish(undefined).resolved).toBe(false);
  });

  it("invalid grade N13 not matched as N-grade", () => {
    const r = normalizeSurfaceFinish("N13");
    expect(r.resolved).toBe(false);
    expect(r.system).toBeNull();
  });

  // adversarial: number-anchored detection must not fire on bare words
  it("unit-substring words without a number never resolve", () => {
    expect(normalizeSurfaceFinish("ruin").resolved).toBe(false);
    expect(normalizeSurfaceFinish("aluminum").resolved).toBe(false);
  });

  it("ISO_N_GRADE_RA_UM frozen with exact ISO 1302 values", () => {
    expect(Object.isFrozen(ISO_N_GRADE_RA_UM)).toBe(true);
    expect(ISO_N_GRADE_RA_UM.N1).toBe(0.025);
    expect(ISO_N_GRADE_RA_UM.N5).toBe(0.4);
    expect(ISO_N_GRADE_RA_UM.N8).toBe(3.2);
    expect(ISO_N_GRADE_RA_UM.N12).toBe(50);
    expect(Object.keys(ISO_N_GRADE_RA_UM)).toHaveLength(12);
  });
});

describe("resolveSurfaceFinishRa (dimension-level wiring helper)", () => {
  it("numeric passes through unchanged", () => {
    expect(resolveSurfaceFinishRa(0.8)).toBe(0.8);
    expect(resolveSurfaceFinishRa(1.6)).toBe(1.6);
  });
  it("string callout normalized", () => {
    expect(resolveSurfaceFinishRa("63 RMS")).toBe(1.6002);
    expect(resolveSurfaceFinishRa("N6")).toBe(0.8);
    expect(resolveSurfaceFinishRa("125 " + MU + "in")).toBe(3.175);
  });
  it("null / unresolvable -> undefined (no silent guess)", () => {
    expect(resolveSurfaceFinishRa(null)).toBe(undefined);
    expect(resolveSurfaceFinishRa("Ra 10")).toBe(undefined);
    expect(resolveSurfaceFinishRa("smooth")).toBe(undefined);
  });
});

describe("mapSurfaceFinishCallout / mapSurfaceFinishes (part-level channel)", () => {
  it("model-supplied numeric ra_um kept as primary (no recovery tag)", () => {
    const c = mapSurfaceFinishCallout({ ra_um: 0.8, location: "all machined", raw_text: "Ra 0.8" });
    expect(c).toEqual({ ra_um: 0.8, location: "all machined", raw_text: "Ra 0.8" });
  });
  it("text callout recovered when no numeric ra_um", () => {
    const c = mapSurfaceFinishCallout({ location: "bore", raw_text: "63 RMS" });
    expect(c).toMatchObject({ ra_um: 1.6002, location: "bore", raw_text: "63 RMS", finish_system: "RMS", assumed: false });
  });
  it("N-grade callout recovered", () => {
    expect(mapSurfaceFinishCallout({ raw_text: "N6" })).toMatchObject({ ra_um: 0.8, finish_system: "ISO-N" });
  });
  it("unresolvable raw_text kept with ra_um null (no guess)", () => {
    const c = mapSurfaceFinishCallout({ raw_text: "Ra 10" });
    expect(c).toMatchObject({ ra_um: null, raw_text: "Ra 10" });
    expect(c?.finish_system).toBe(undefined);
  });
  it("empty / signal-less / non-object entry -> null", () => {
    expect(mapSurfaceFinishCallout({})).toBe(null);
    expect(mapSurfaceFinishCallout(null)).toBe(null);
    expect(mapSurfaceFinishCallout("x")).toBe(null);
  });
  it("mapSurfaceFinishes maps array + drops empty entries", () => {
    const arr = mapSurfaceFinishes([{ raw_text: "63 RMS" }, {}, { ra_um: 0.4, location: "face", raw_text: "Ra 0.4" }]);
    expect(arr).toHaveLength(2);
    expect(arr[0].ra_um).toBe(1.6002);
    expect(arr[1].ra_um).toBe(0.4);
  });
  it("mapSurfaceFinishes on non-array -> []", () => {
    expect(mapSurfaceFinishes("nope")).toEqual([]);
    expect(mapSurfaceFinishes(null)).toEqual([]);
  });
});

describe("selectPartDefaultFinish (part-level default for dimension inheritance)", () => {
  const mk = (ra_um: number | null, location: string | null): any => ({ ra_um, location, raw_text: "x" });
  it("single all-over finish (location matches) is the default", () => {
    expect(selectPartDefaultFinish([mk(1.6, "all machined surfaces")])).toMatchObject({ ra_um: 1.6 });
  });
  it("single finish with no location is treated as all-over", () => {
    expect(selectPartDefaultFinish([mk(0.8, null)])).toMatchObject({ ra_um: 0.8 });
  });
  it("'unless otherwise noted' qualifies as all-over", () => {
    expect(selectPartDefaultFinish([mk(3.2, "Ra 3.2 unless otherwise noted")])).toMatchObject({ ra_um: 3.2 });
  });
  it("a location-specific finish is NOT applied globally", () => {
    expect(selectPartDefaultFinish([mk(0.8, "bore ID")])).toBe(null);
  });
  it("two competing all-over finishes -> null (ambiguous, no guess)", () => {
    expect(selectPartDefaultFinish([mk(1.6, "all over"), mk(0.4, "unless noted")])).toBe(null);
  });
  it("one all-over + one location-specific -> the all-over one", () => {
    expect(selectPartDefaultFinish([mk(1.6, "all over"), mk(0.4, "bore")])).toMatchObject({ ra_um: 1.6 });
  });
  it("a finish with null ra_um is ineligible", () => {
    expect(selectPartDefaultFinish([mk(null, "all")])).toBe(null);
  });
  it("empty / non-array -> null", () => {
    expect(selectPartDefaultFinish([])).toBe(null);
    expect(selectPartDefaultFinish(null as unknown as [])).toBe(null);
  });
  it("ra_um <= 0 is ineligible (no absurd part default from a mis-read 0)", () => {
    expect(selectPartDefaultFinish([mk(0, "all over")])).toBe(null);
    expect(selectPartDefaultFinish([mk(-1, "all over")])).toBe(null);
  });
  it("feature-noun strings with an all-over word are NOT treated as all-over", () => {
    expect(selectPartDefaultFinish([mk(0.8, "all 4 holes")])).toBe(null);
    expect(selectPartDefaultFinish([mk(0.8, "overall length")])).toBe(null);
    expect(selectPartDefaultFinish([mk(0.8, "typical bore")])).toBe(null);
  });
});
