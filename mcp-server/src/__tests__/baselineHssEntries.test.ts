/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-COMPARE-HSS-BASELINE -- HSS (non-carbide) baseline reference rows.
 *
 * The tri-vendor comparison baseline (SpeedFeedBaselineComparatorEngine) was carbide-only, so
 * the SFC could not compare its HSS recommendations against any published reference. These rows
 * add HSS milling baselines for the bread-and-butter HSS materials (P steel / N aluminum /
 * K cast iron). vc/fz are web-verified (cnccookbook HSS speeds/feeds, cross-checked Toolmex/
 * Regal) + physics-reviewer-validated against Machinery's Handbook / ASM HSS milling tables.
 *
 * Honesty guards (R12 / soul refuse "publishing-a-speed-feed-without-uncertainty"):
 *  - one HONEST source per entry (cnccookbook real URL) -- NO fabricated Sandvik/Kennametal
 *    HSS catalog pages; the engine's own <3-source low-power warning is the correct signal.
 *  - mrr omitted (no published full-cut operating point to derive it honestly).
 *  - M-stainless / S-titanium / H-hardened HSS rows intentionally ABSENT (HSS is marginal ->
 *    impossible there; encoding them would be fabricated data with no published grounding).
 */
import { describe, it, expect } from "vitest";
import { speedFeedBaselineComparatorEngine as eng } from "../engines/SpeedFeedBaselineComparatorEngine.js";

describe("HSS non-carbide baseline entries (U-OSC-COMPARE-HSS-BASELINE)", () => {
  it("encodes HSS P-1018 12mm milling-roughing at the web-verified vc=24 m/min, fz=0.05 mm, cnccookbook URL", () => {
    const s = eng.findBaseline("P", "hss", 12, "milling", "roughing")!.sources[0];
    expect(s.source).toBe("cnccookbook");
    expect(s.vc_mpm).toBe(24);                                  // 79 SFM -- canonical HSS 1018 milling
    expect(s.fz_mm).toBe(0.05);                                 // ~0.002 in/tooth HSS 1/2" steel
    expect(s.citation).toBe("cnccookbook.com/hss-end-mill-speeds-and-feeds/");
  });

  it("encodes HSS aluminum (N-6061 10mm: vc=90, fz=0.075) and cast iron (K 12mm: vc=18, fz=0.075)", () => {
    const n = eng.findBaseline("N", "hss", 10, "milling", "roughing")!.sources[0];
    const k = eng.findBaseline("K", "hss", 12, "milling", "roughing")!.sources[0];
    expect(n.vc_mpm).toBe(90);                                  // ~295 SFM -- HSS aluminum practical
    expect(n.fz_mm).toBe(0.075);
    expect(k.vc_mpm).toBe(18);                                  // ~59 SFM -- HSS gray iron ~200 BHN
    expect(k.fz_mm).toBe(0.075);
  });

  it("HSS P-1018 6mm uses a lower chip load than the 12mm (fz 0.025 < 0.05, smaller tool)", () => {
    const fz6 = eng.findBaseline("P", "hss", 6, "milling", "roughing")!.sources[0].fz_mm;
    const fz12 = eng.findBaseline("P", "hss", 12, "milling", "roughing")!.sources[0].fz_mm;
    expect(fz6).toBe(0.025);
    expect(fz12).toBe(0.05);
    expect(fz6).toBeLessThan(fz12);
  });

  it("HSS vc is BELOW the paired carbide entry on each shared material (HSS runs slower)", () => {
    const pHss = eng.findBaseline("P", "hss", 12, "milling", "roughing")!.sources[0].vc_mpm;
    const pCarb = eng.findBaseline("P", "carbide", 12, "milling", "roughing")!.sources[0].vc_mpm;
    const nHss = eng.findBaseline("N", "hss", 10, "milling", "roughing")!.sources[0].vc_mpm;
    const nCarb = eng.findBaseline("N", "carbide", 10, "milling", "roughing")!.sources[0].vc_mpm;
    const kHss = eng.findBaseline("K", "hss", 12, "milling", "roughing")!.sources[0].vc_mpm;
    const kCarb = eng.findBaseline("K", "carbide", 12, "milling", "roughing")!.sources[0].vc_mpm;
    expect(pHss).toBeLessThan(pCarb); // 24 < ~200-230
    expect(nHss).toBeLessThan(nCarb); // 90 < ~600-900
    expect(kHss).toBeLessThan(kCarb); // 18 < ~160-180
  });

  it("does NOT fabricate HSS rows for M-stainless / S-titanium / H-hardened (zero HSS entries there)", () => {
    expect(eng.listBaselines("M").filter(b => b.tool_material === "hss").length).toBe(0);
    expect(eng.listBaselines("S").filter(b => b.tool_material === "hss").length).toBe(0);
    expect(eng.listBaselines("H").filter(b => b.tool_material === "hss").length).toBe(0);
  });

  it("exactly 4 HSS rows fleet-wide, each with a single honest cnccookbook source (no padding)", () => {
    const hss = (["P", "M", "K", "N", "S", "H"] as const).flatMap(iso =>
      eng.listBaselines(iso).filter(b => b.tool_material === "hss"),
    );
    expect(hss.length).toBe(4);                                 // P-12, P-6, N-10, K-12
    expect(hss.filter(e => e.sources.length === 1).length).toBe(4);
    expect(hss.filter(e => e.sources[0].source === "cnccookbook").length).toBe(4);
  });
});

describe("ceramic + CBN non-carbide baseline entries (U-OSC-COMPARE-CERAMIC-CBN-BASELINE)", () => {
  it("encodes ceramic gray-iron turning (K, vc=600, fz=0.30) with 2 honest sources (ntk + iscar)", () => {
    const e = eng.findBaseline("K", "ceramic", 25, "turning", "roughing")!;
    expect(e.tool_material).toBe("ceramic");
    expect(e.cut_type).toBe("roughing");
    expect(e.sources.map(s => s.source).sort()).toEqual(["iscar", "ntk"]);
    expect(e.sources[0].vc_mpm).toBe(600);                  // NTK ceramic cast-iron
    expect(e.sources[0].fz_mm).toBe(0.3);
  });

  it("encodes ceramic Inconel turning as FINISHING (S, vc=400, fz=0.15, ntk) -- not roughing", () => {
    const e = eng.findBaseline("S", "ceramic", 25, "turning", "finishing")!;
    expect(e.cut_type).toBe("finishing");                   // physics-reviewer correction: ceramic-on-Inconel is a finish regime
    expect(e.sources[0].source).toBe("ntk");
    expect(e.sources[0].vc_mpm).toBe(400);
    expect(e.sources[0].fz_mm).toBe(0.15);
  });

  it("encodes CBN hard-turning (H, vc=180, fz=0.10, ap=0.2, tungaloy) as finishing", () => {
    const e = eng.findBaseline("H", "cbn", 25, "turning", "finishing")!;
    expect(e.cut_type).toBe("finishing");
    expect(e.sources[0].source).toBe("tungaloy");
    expect(e.sources[0].vc_mpm).toBe(180);                  // Tungaloy 60 HRC cited point
    expect(e.sources[0].fz_mm).toBe(0.1);
    expect(e.sources[0].reference_ap_mm).toBe(0.2);
  });

  it("does NOT fabricate ceramic rows for ductile P-steel / N-aluminum (ceramic chips there)", () => {
    expect(eng.listBaselines("P").filter(b => b.tool_material === "ceramic").length).toBe(0);
    expect(eng.listBaselines("N").filter(b => b.tool_material === "ceramic").length).toBe(0);
  });

  it("does NOT fabricate CBN rows for soft P-steel / N-aluminum (CBN only for hardened ferrous)", () => {
    expect(eng.listBaselines("P").filter(b => b.tool_material === "cbn").length).toBe(0);
    expect(eng.listBaselines("N").filter(b => b.tool_material === "cbn").length).toBe(0);
  });

  it("exactly 3 ceramic/cbn rows, citing only the REAL vendors ntk/iscar/tungaloy (no fabricated sandvik ceramic pages)", () => {
    const adv = (["K", "S", "H"] as const).flatMap(iso =>
      eng.listBaselines(iso).filter(b => b.tool_material === "ceramic" || b.tool_material === "cbn"),
    );
    expect(adv.length).toBe(3);
    const srcs = [...new Set(adv.flatMap(e => e.sources.map(s => s.source)))].sort();
    expect(srcs).toEqual(["iscar", "ntk", "tungaloy"]);
  });
});
