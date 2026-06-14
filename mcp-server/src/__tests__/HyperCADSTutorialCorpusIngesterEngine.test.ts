/**
 * HyperCADSTutorialCorpusIngesterEngine — vitest suite (CAD-DRAW-MAX-MS0/P1-U08).
 *
 * Closed-form assertions on tutorial-prose → tip extraction. Verifies the
 * scaffold contract: empty input is a no-op, taxonomy is exposed, op-kind
 * matching is case-insensitive, GD&T category routing matches the
 * TolSignal encoder taxonomy, R12 fail-loud on non-array.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperCADSTutorialCorpusIngesterEngine,
  hyperCADSTutorialCorpusIngesterEngine,
} from "../engines/HyperCADSTutorialCorpusIngesterEngine.js";

describe("HyperCADSTutorialCorpusIngesterEngine — P1-U08 scaffold", () => {
  let eng: HyperCADSTutorialCorpusIngesterEngine;
  beforeEach(() => {
    eng = new HyperCADSTutorialCorpusIngesterEngine();
  });

  it("empty corpus returns zero-count IngestResult with stable shape", () => {
    const result = eng.ingest([]);
    expect(result.documentsScanned).toBe(0);
    expect(result.totalTipsEmitted).toBe(0);
    expect(result.totalGdtMentions).toBe(0);
    expect(Object.keys(result.tipsByOpKind).length).toBe(0);
    expect(result.gdtConventions.length).toBe(0);
  });

  it("R12 fail-loud: non-array input throws TypeError", () => {
    expect(() => eng.ingest(null as never)).toThrow(TypeError);
    expect(() => eng.ingest("nope" as never)).toThrow(TypeError);
    expect(() => eng.ingest({} as never)).toThrow(TypeError);
  });

  it("malformed doc (missing text or source) is skipped, valid doc still ingested", () => {
    const result = eng.ingest([
      { source: "good.md", text: "Use the extrude command for the boss feature." },
      { source: "bad.md" } as never,
      { text: "no source" } as never,
    ]);
    expect(result.documentsScanned).toBe(3);
    expect(result.totalTipsEmitted).toBe(1);
    expect(result.tipsByOpKind["feature_extrude"].length).toBe(1);
    expect(eng.getStats().totalDocumentsScanned).toBe(1);
  });

  it("feature_extrude tips extracted from 3 distinct sentences with exact source attribution", () => {
    const result = eng.ingest([{
      source: "lesson.md",
      text: "First extrude the sketch. Apply a pad of twenty millimeters. The extrusion direction matters.",
    }]);
    const tips = result.tipsByOpKind["feature_extrude"];
    expect(tips.length).toBe(3);
    expect(tips[0].source).toBe("lesson.md");
    expect(tips[0].opKind).toBe("feature_extrude");
    expect(tips[1].source).toBe("lesson.md");
    expect(tips[2].source).toBe("lesson.md");
  });

  it("feature_fillet matches fillet/round-over/edge round → 3 exact tips", () => {
    const result = eng.ingest([{
      source: "f.md",
      text: "Apply a fillet to all sharp corners. Round-over the leading edge. Use edge round 2mm.",
    }]);
    expect(result.tipsByOpKind["feature_fillet"].length).toBe(3);
  });

  it("case-insensitive: 'EXTRUDE' + 'Sketch' produce exactly 1 tip each in distinct buckets", () => {
    const result = eng.ingest([{
      source: "case.md",
      text: "Open the EXTRUDE dialog. Then create a Sketch on the top face.",
    }]);
    expect(result.tipsByOpKind["feature_extrude"].length).toBe(1);
    expect(result.tipsByOpKind["sketch_create"].length).toBe(1);
  });

  it("boolean operations route to 3 distinct opKind buckets, exactly 1 each", () => {
    const result = eng.ingest([{
      source: "bool.md",
      text: "Boolean union combines bodies. Boolean subtract removes material. Boolean intersect overlapping regions.",
    }]);
    expect(result.tipsByOpKind["boolean_union"].length).toBe(1);
    expect(result.tipsByOpKind["boolean_subtract"].length).toBe(1);
    expect(result.tipsByOpKind["boolean_intersect"].length).toBe(1);
  });

  it("linear vs circular patterns bucket distinctly, exactly 1 each", () => {
    const result = eng.ingest([{
      source: "pat.md",
      text: "Create a linear pattern of holes. Use a circular pattern for the gear teeth.",
    }]);
    expect(result.tipsByOpKind["feature_pattern_linear"].length).toBe(1);
    expect(result.tipsByOpKind["feature_pattern_circular"].length).toBe(1);
  });

  it("export keywords route to step/iges/stl buckets, exactly 1 each", () => {
    const result = eng.ingest([{
      source: "exp.md",
      text: "Export to STEP for machining downstream. Now Export as IGES for legacy systems. Mesh export to STL for printing.",
    }]);
    expect(result.tipsByOpKind["export_step"].length).toBe(1);
    expect(result.tipsByOpKind["export_iges"].length).toBe(1);
    expect(result.tipsByOpKind["export_stl"].length).toBe(1);
  });

  it("GD&T routing: position/flatness/perpendicularity captured with full text", () => {
    const result = eng.ingest([{
      source: "gdt.md",
      text: "Apply true position to the bolt circle. Flatness is critical on the seal face. Perpendicularity controls the bore axis.",
    }]);
    expect(result.gdtConventions.length).toBe(3);
    expect(result.totalGdtMentions).toBe(3);
    const bySymbol: Record<string, string> = {};
    for (const g of result.gdtConventions) bySymbol[g.symbol] = g.text;
    expect(bySymbol["position"].includes("bolt circle")).toBe(true);
    expect(bySymbol["flatness"].includes("seal face")).toBe(true);
    expect(bySymbol["perpendicularity"].includes("bore axis")).toBe(true);
  });

  it("sentence shorter than TIP_TEXT_MIN_LENGTH (12) is filtered → zero tips", () => {
    const result = eng.ingest([{ source: "lim.md", text: "Extrude." }]);
    expect(result.totalTipsEmitted).toBe(0);
    expect(result.tipsByOpKind["feature_extrude"] === undefined).toBe(true);
  });

  it("sentence longer than TIP_TEXT_MAX_LENGTH (512) is filtered → zero tips", () => {
    const longSentence = "extrude " + "x".repeat(600) + ".";
    const result = eng.ingest([{ source: "lim.md", text: longSentence }]);
    expect(result.totalTipsEmitted).toBe(0);
  });

  it("multi-document ingest produces exact sums across 3 docs", () => {
    const result = eng.ingest([
      { source: "doc1.md", text: "Use the extrude tool for the main body." },
      { source: "doc2.md", text: "The fillet radius affects stress concentration." },
      { source: "doc3.md", text: "Position tolerance controls hole locations." },
    ]);
    expect(result.documentsScanned).toBe(3);
    // doc1 → feature_extrude (1), doc2 → feature_fillet (1),
    // doc3 → feature_hole (1, the word "hole") = 3 op tips total
    expect(result.totalTipsEmitted).toBe(3);
    expect(result.totalGdtMentions).toBe(1);
    expect(eng.getStats().totalDocumentsScanned).toBe(3);
    expect(result.tipsByOpKind["feature_extrude"].length).toBe(1);
    expect(result.tipsByOpKind["feature_fillet"].length).toBe(1);
    expect(result.tipsByOpKind["feature_hole"].length).toBe(1);
    expect(result.gdtConventions[0].symbol).toBe("position");
  });

  it("getStats accumulates exactly across 2 ingest runs", () => {
    eng.ingest([{ source: "a.md", text: "Extrude this profile by ten millimeters." }]);
    eng.ingest([{ source: "b.md", text: "Apply a fillet on the leading edge." }]);
    const stats = eng.getStats();
    expect(stats.totalIngestRuns).toBe(2);
    expect(stats.totalDocumentsScanned).toBe(2);
    expect(stats.totalTipsEmitted).toBe(2);
  });

  it("_resetForTests zeroes all 3 counters to exact zero", () => {
    eng.ingest([{ source: "a.md", text: "Extrude this profile body." }]);
    expect(eng.getStats().totalIngestRuns).toBe(1);
    eng._resetForTests();
    const stats = eng.getStats();
    expect(stats.totalIngestRuns).toBe(0);
    expect(stats.totalDocumentsScanned).toBe(0);
    expect(stats.totalTipsEmitted).toBe(0);
  });

  it("static getOpKindTaxonomy returns exactly 15 expected op-kind strings", () => {
    const taxonomy = HyperCADSTutorialCorpusIngesterEngine.getOpKindTaxonomy();
    expect(taxonomy.length).toBe(15);
    expect(taxonomy.indexOf("sketch_create") >= 0).toBe(true);
    expect(taxonomy.indexOf("feature_extrude") >= 0).toBe(true);
    expect(taxonomy.indexOf("export_step") >= 0).toBe(true);
    expect(taxonomy.indexOf("boolean_intersect") >= 0).toBe(true);
  });

  it("static getGdtSymbolTaxonomy returns exactly 5 canonical GD&T symbols", () => {
    const taxonomy = HyperCADSTutorialCorpusIngesterEngine.getGdtSymbolTaxonomy();
    expect(taxonomy.length).toBe(5);
    const set = new Set(taxonomy);
    expect(set.has("position")).toBe(true);
    expect(set.has("flatness")).toBe(true);
    expect(set.has("perpendicularity")).toBe(true);
    expect(set.has("parallelism")).toBe(true);
    expect(set.has("concentricity")).toBe(true);
  });

  it("singleton export uses its own counter independent of new instances", () => {
    hyperCADSTutorialCorpusIngesterEngine._resetForTests();
    const result = hyperCADSTutorialCorpusIngesterEngine.ingest([
      { source: "s.md", text: "Use the sketch command first." },
    ]);
    expect(result.tipsByOpKind["sketch_create"].length).toBe(1);
    expect(eng.getStats().totalIngestRuns).toBe(0);
    hyperCADSTutorialCorpusIngesterEngine._resetForTests();
  });

  it("OpTip shape: opKind='feature_chamfer', source matches, text contains keyword", () => {
    const result = eng.ingest([{
      source: "shape.md",
      text: "Apply a chamfer to soften the exposed edge.",
    }]);
    const tip = result.tipsByOpKind["feature_chamfer"][0];
    expect(tip.opKind).toBe("feature_chamfer");
    expect(tip.source).toBe("shape.md");
    expect(tip.text.includes("chamfer")).toBe(true);
    expect(tip.text.length >= 12).toBe(true);
  });
});
