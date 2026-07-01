/**
 * Tests for JMDiePostProcessorLearningEngine
 * (FEATURE-GAP-AUDIT-MS0 / U-GAP-POST-JMDIE-LEARNING).
 *
 * Coverage:
 *  - parseCpsContent: every extracted field, on synthetic + edge-case .cps text
 *  - property extraction: braces in strings/comments/template-literals, nesting
 *  - enhancement-marker + controller-family + process-type inference
 *  - aggregate: enhancement frequency, family roll-up, pattern thresholding
 *  - learn(): injected temp corpus + missing-directory fail-soft path
 *  - query / catalog / stats / reset
 *  - real-corpus E2E (runs only when the JM Die corpus is reachable)
 *  - determinism anti-regression
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  JMDiePostProcessorLearningEngine,
  type PostProcessorProfile,
} from "../engines/JMDiePostProcessorLearningEngine.js";

const Eng = JMDiePostProcessorLearningEngine;

/** A realistic synthetic .cps with braces inside a string AND a comment. */
const SAMPLE_CPS = `/**
  PRISM Master Post Processor — Hurco VM30i
  $Revision: 44100 Enhanced $
  $Date: 2026-05-20 $
  FORKID {241E0993-8BE0-463b-8888-47968B9D7F9F}
  Features: iMachining-style variable feed, chip thinning, rigid tapping G84.2.
*/
description = "PRISM Master — Hurco VM30i";
vendor = "PRISM";
legal = "Copyright (C) 2026";
certificationLevel = 2;
extension = "nc";
capabilities = CAPABILITY_MILLING;

properties = {
  programNumber: {
    title: "Program Number",
    description: "O-code { with brace } in description",
    type: "integer",
    value: 1
  },
  useM140: {
    title: "Use M140",
    type: "boolean",
    value: true
  },
  smoothing: {
    title: "G05.3 Smoothing",
    type: "boolean",
    value: true
  }
};

function onSection() {
  writeBlock("G05.3 P35"); // dialect comment: } stray brace
  writeBlock("M140");
}
`;

/** Haas .cps used by the corpus tests (Ai-Enhanced + iMachining markers). */
const HAAS_CPS =
  'description = "Haas Ai-Enhanced";\n// iMachining\nproperties = { p1: { value: 1 } };';

describe("JMDiePostProcessorLearningEngine — parseCpsContent", () => {
  beforeEach(() => Eng.reset());

  it("extracts all declarative globals from a real-shaped .cps", () => {
    const p = Eng.parseCpsContent(SAMPLE_CPS, "PRISM-Master-Hurco-VM30i.cps", 27800);
    expect(p.file).toBe("PRISM-Master-Hurco-VM30i.cps");
    expect(p.sizeBytes).toBe(27800);
    expect(p.vendor).toBe("PRISM");
    expect(p.description).toBe("PRISM Master — Hurco VM30i");
    expect(p.extension).toBe("nc");
    expect(p.certificationLevel).toBe(2);
    expect(p.forkId).toBe("241E0993-8BE0-463b-8888-47968B9D7F9F");
    expect(p.revision).toBe("44100 Enhanced");
  });

  it("infers controller family + machine + process type", () => {
    const p = Eng.parseCpsContent(SAMPLE_CPS, "PRISM-Master-Hurco-VM30i.cps");
    expect(p.controllerFamily).toBe("hurco");
    expect(p.processType).toBe("mill");
    expect(p.machine.toLowerCase()).toContain("hurco");
  });

  it("counts exactly the 3 top-level properties (braces in strings/comments ignored)", () => {
    const p = Eng.parseCpsContent(SAMPLE_CPS, "x.cps");
    expect(p.propertyCount).toBe(3);
    expect(p.properties.sort()).toEqual(["programNumber", "smoothing", "useM140"]);
  });

  it("extracts distinct G/M dialect codes, uppercased + sorted", () => {
    const p = Eng.parseCpsContent(SAMPLE_CPS, "x.cps");
    expect(p.controllerCodes).toContain("G05.3");
    expect(p.controllerCodes).toContain("G84.2");
    expect(p.controllerCodes).toContain("M140");
    expect(p.controllerCodes).toEqual([...new Set(p.controllerCodes)].sort());
  });

  it("detects the 5 enhancement markers present in the sample", () => {
    const p = Eng.parseCpsContent(SAMPLE_CPS, "x.cps");
    expect(p.enhancements.sort()).toEqual(
      [
        "chip_thinning_compensation",
        "imachining_variable_feed",
        "path_smoothing",
        "prism_physics_integration",
        "rigid_tapping",
      ].sort(),
    );
  });

  it("does NOT count nested object keys as top-level properties", () => {
    const nested = `properties = {
      gamma: {
        title: "G",
        presets: { fast: { value: 1 }, slow: { value: 2 } },
        value: "fast"
      }
    };`;
    const p = Eng.parseCpsContent(nested, "n.cps");
    expect(p.properties).toEqual(["gamma"]);
    expect(p.propertyCount).toBe(1);
  });

  it("blanks backtick template literals so their braces do not corrupt the count", () => {
    const tpl = `properties = {
      alpha: { title: \`tip {x} more\`, type: "boolean", value: true },
      beta: { type: "integer", value: 5 }
    };`;
    const p = Eng.parseCpsContent(tpl, "t.cps");
    expect(p.properties.sort()).toEqual(["alpha", "beta"]);
  });

  it("handles escaped quotes inside a property string without terminating early", () => {
    const esc = `properties = {
      one: { title: "say \\"hi\\" { and } brace", type: "string", value: "" },
      two: { type: "integer", value: 2 }
    };`;
    const p = Eng.parseCpsContent(esc, "e.cps");
    expect(p.properties.sort()).toEqual(["one", "two"]);
  });

  it("returns an empty property list when there is no properties block", () => {
    const p = Eng.parseCpsContent('description = "no props";', "np.cps");
    expect(p.properties).toEqual([]);
    expect(p.propertyCount).toBe(0);
  });

  it("returns an empty property list (no throw) on an unbalanced properties block", () => {
    const bad = `properties = {
      a: { type: "boolean", value: true },
      b: { type: "integer", value: 1 }
    `; // never closed
    expect(() => Eng.parseCpsContent(bad, "bad.cps")).not.toThrow();
    expect(Eng.parseCpsContent(bad, "bad.cps").properties).toEqual([]);
  });

  it("handles empty content without throwing", () => {
    const p = Eng.parseCpsContent("", "empty.cps");
    expect(p.vendor).toBeNull();
    expect(p.description).toBeNull();
    expect(p.certificationLevel).toBeNull();
    expect(p.properties).toEqual([]);
    expect(p.enhancements).toEqual([]);
    expect(p.controllerCodes).toEqual([]);
  });

  it("is adversarially safe against non-string content", () => {
    // @ts-expect-error — deliberate adversarial input
    const p = Eng.parseCpsContent(null, "adv.cps");
    expect(p.file).toBe("adv.cps");
    expect(p.description).toBeNull();
    expect(p.properties).toEqual([]);
  });

  it("clamps a negative / NaN / Infinity sizeBytes to 0", () => {
    expect(Eng.parseCpsContent("", "a.cps", -5).sizeBytes).toBe(0);
    expect(Eng.parseCpsContent("", "a.cps", NaN).sizeBytes).toBe(0);
    expect(Eng.parseCpsContent("", "a.cps", Infinity).sizeBytes).toBe(0);
  });

  it("infers lathe vs mill-turn from capabilities", () => {
    const lathe = Eng.parseCpsContent(
      "capabilities = CAPABILITY_TURNING;",
      "OKUMA_LATHE_LB3000.cps",
    );
    expect(lathe.processType).toBe("lathe");
    expect(lathe.controllerFamily).toBe("okuma");

    const mt = Eng.parseCpsContent(
      "capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;",
      "OKUMA_MULTUS_B250.cps",
    );
    expect(mt.processType).toBe("mill-turn");
  });

  it("maps every controller family from the filename", () => {
    expect(Eng.parseCpsContent("", "HAAS_VF2.cps").controllerFamily).toBe("haas");
    expect(Eng.parseCpsContent("", "HURCO_VM30i.cps").controllerFamily).toBe("hurco");
    expect(Eng.parseCpsContent("", "OKUMA_GENOS.cps").controllerFamily).toBe("okuma");
    expect(Eng.parseCpsContent("", "Roku-Roku-Ai.cps").controllerFamily).toBe("roku-roku");
    expect(Eng.parseCpsContent("", "Generic.cps").controllerFamily).toBe("unknown");
  });
});

describe("JMDiePostProcessorLearningEngine — aggregate", () => {
  beforeEach(() => Eng.reset());

  const mkProfile = (
    file: string,
    family: PostProcessorProfile["controllerFamily"],
    enhancements: string[],
  ): PostProcessorProfile => ({
    file,
    sizeBytes: 1000,
    controllerFamily: family,
    machine: file.replace(/\.cps$/, ""),
    processType: "mill",
    vendor: "PRISM",
    description: null,
    extension: "nc",
    certificationLevel: null,
    forkId: null,
    revision: null,
    properties: ["a", "b"],
    propertyCount: 2,
    enhancements,
    controllerCodes: ["G00", "G01"],
  });

  it("counts enhancement frequency across the corpus", () => {
    const corpus = Eng.aggregate(
      [
        mkProfile("h1.cps", "hurco", ["path_smoothing", "rigid_tapping"]),
        mkProfile("h2.cps", "hurco", ["path_smoothing"]),
        mkProfile("a1.cps", "haas", ["path_smoothing", "imachining_variable_feed"]),
      ],
      "/synthetic",
    );
    expect(corpus.enhancementFrequency.path_smoothing).toBe(3);
    expect(corpus.enhancementFrequency.rigid_tapping).toBe(1);
    expect(corpus.enhancementFrequency.imachining_variable_feed).toBe(1);
    expect(corpus.profileCount).toBe(3);
  });

  it("rolls up by controller family", () => {
    const corpus = Eng.aggregate(
      [
        mkProfile("h1.cps", "hurco", ["path_smoothing"]),
        mkProfile("h2.cps", "hurco", ["rigid_tapping"]),
        mkProfile("a1.cps", "haas", ["imachining_variable_feed"]),
      ],
      "/synthetic",
    );
    expect(corpus.byControllerFamily.hurco.count).toBe(2);
    expect(corpus.byControllerFamily.haas.count).toBe(1);
    expect(corpus.byControllerFamily.hurco.enhancements.sort()).toEqual([
      "path_smoothing",
      "rigid_tapping",
    ]);
  });

  it("emits a learned pattern only when family support is >= 50%", () => {
    const corpus = Eng.aggregate(
      [
        // path_smoothing in 3/4 hurco posts (75% — pattern)
        mkProfile("h1.cps", "hurco", ["path_smoothing", "rigid_tapping"]),
        mkProfile("h2.cps", "hurco", ["path_smoothing"]),
        mkProfile("h3.cps", "hurco", ["path_smoothing"]),
        // rigid_tapping in only 1/4 hurco posts (25% — NOT a pattern)
        mkProfile("h4.cps", "hurco", []),
      ],
      "/synthetic",
    );
    const smoothing = corpus.patterns.find(
      (p) => p.controllerFamily === "hurco" && p.enhancement === "path_smoothing",
    );
    expect(smoothing?.support).toBe(3);
    expect(smoothing?.familySize).toBe(4);
    expect(smoothing?.confidence).toBe(0.75);
    expect(smoothing?.recommendation).toContain("hurco");

    const rigid = corpus.patterns.find(
      (p) => p.controllerFamily === "hurco" && p.enhancement === "rigid_tapping",
    );
    expect(rigid).toBe(undefined); // 25% < 50% threshold → not a pattern
  });

  it("sorts patterns by descending confidence", () => {
    const corpus = Eng.aggregate(
      [
        mkProfile("h1.cps", "hurco", ["path_smoothing"]),
        mkProfile("h2.cps", "hurco", ["path_smoothing"]),
        mkProfile("a1.cps", "haas", ["imachining_variable_feed"]),
        mkProfile("a2.cps", "haas", []),
      ],
      "/synthetic",
    );
    expect(corpus.patterns.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < corpus.patterns.length; i++) {
      expect(corpus.patterns[i - 1].confidence).toBeGreaterThanOrEqual(
        corpus.patterns[i].confidence,
      );
    }
  });

  it("handles a non-array profile input without throwing", () => {
    // @ts-expect-error — deliberate adversarial input
    const corpus = Eng.aggregate(null, "/synthetic");
    expect(corpus.profileCount).toBe(0);
    expect(corpus.patterns).toEqual([]);
  });
});

describe("JMDiePostProcessorLearningEngine — learn() with an injected corpus", () => {
  let tmp: string;

  beforeEach(() => {
    Eng.reset();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-post-"));
  });

  it("reads, parses, and aggregates a temp .cps corpus", () => {
    fs.writeFileSync(path.join(tmp, "HURCO_A.cps"), SAMPLE_CPS, "utf8");
    fs.writeFileSync(
      path.join(tmp, "HAAS_B.cps"),
      'description = "Haas Ai-Enhanced";\ncapabilities = CAPABILITY_MILLING;\n' +
        "// iMachining adaptive feed, chip thinning\nproperties = { p1: { value: 1 } };",
      "utf8",
    );
    fs.writeFileSync(path.join(tmp, "notes.txt"), "ignored — not a .cps", "utf8");

    const corpus = Eng.learn(tmp);
    expect(corpus.profileCount).toBe(2); // .txt skipped
    expect(corpus.warning).toBe(undefined);
    expect(corpus.sourceDir).toBe(tmp);
    expect(corpus.profiles.map((p) => p.controllerFamily).sort()).toEqual([
      "haas",
      "hurco",
    ]);
    expect(corpus.enhancementFrequency.imachining_variable_feed).toBe(2);
  });

  it("caches the corpus and reset() forces a re-learn", () => {
    fs.writeFileSync(path.join(tmp, "HURCO_A.cps"), SAMPLE_CPS, "utf8");
    const first = Eng.learn(tmp);
    expect(first.profileCount).toBe(1);
    expect(Eng.getCorpus()).toBe(first); // cached identity
    Eng.reset();
    fs.writeFileSync(path.join(tmp, "HAAS_B.cps"), 'description = "x";', "utf8");
    const relearned = Eng.learn(tmp);
    expect(relearned).not.toBe(first);
    expect(relearned.profileCount).toBe(2);
  });

  it("supports queryByController / getEnhancementCatalog / getStats on the learned corpus", () => {
    fs.writeFileSync(path.join(tmp, "HURCO_A.cps"), SAMPLE_CPS, "utf8");
    fs.writeFileSync(path.join(tmp, "HAAS_B.cps"), HAAS_CPS, "utf8");
    Eng.learn(tmp);

    const hurco = Eng.queryByController("hurco");
    expect(hurco).toHaveLength(1);
    expect(hurco[0].file).toBe("HURCO_A.cps");
    expect(Eng.queryByController("not-a-family")).toEqual([]);

    // SAMPLE_CPS → 5 enhancements, HAAS_CPS → {ai_enhanced, imachining} → 6 distinct.
    const catalog = Eng.getEnhancementCatalog();
    expect(catalog).toHaveLength(6);
    for (let i = 1; i < catalog.length; i++) {
      expect(catalog[i - 1].count).toBeGreaterThanOrEqual(catalog[i].count);
    }
    const imach = catalog.find((c) => c.enhancement === "imachining_variable_feed");
    expect(imach?.count).toBe(2);
    expect(imach?.posts.sort()).toEqual(["HAAS_B.cps", "HURCO_A.cps"]);

    const stats = Eng.getStats();
    expect(stats.profileCount).toBe(2);
    expect(stats.families.hurco).toBe(1);
    expect(stats.families.haas).toBe(1);
    expect(stats.distinctEnhancements).toBe(6);
    expect(stats.warning).toBe(undefined);
  });
});

describe("JMDiePostProcessorLearningEngine — missing corpus", () => {
  beforeEach(() => Eng.reset());

  it("returns a fail-soft warning corpus when the directory is absent", () => {
    const missing = path.join(os.tmpdir(), "jmdie-does-not-exist-" + Date.now());
    const corpus = Eng.learn(missing);
    expect(corpus.profileCount).toBe(0);
    expect(corpus.profiles).toEqual([]);
    expect(corpus.patterns).toEqual([]);
    expect(corpus.warning).toMatch(/directory not found/i);
  });

  it("getStats surfaces the warning when the corpus is unavailable", () => {
    const missing = path.join(os.tmpdir(), "jmdie-missing-" + Date.now());
    Eng.learn(missing);
    expect(Eng.getStats().warning).toMatch(/directory not found/i);
  });

  it("getEnhancementCatalog returns an empty array on an unavailable corpus", () => {
    const missing = path.join(os.tmpdir(), "jmdie-empty-cat-" + Date.now());
    Eng.learn(missing);
    expect(Eng.getEnhancementCatalog()).toEqual([]);
  });
});

describe("JMDiePostProcessorLearningEngine — getCorpus lazy init", () => {
  beforeEach(() => Eng.reset());

  it("lazily learns then caches the corpus on first access", () => {
    const c1 = Eng.getCorpus();
    expect(c1.schemaVersion).toBe("1.0.0");
    expect(Array.isArray(c1.profiles)).toBe(true);
    expect(Eng.getCorpus()).toBe(c1); // second access returns the cached instance
  });
});

describe("JMDiePostProcessorLearningEngine — real JM Die corpus (gated)", () => {
  const realDir = Eng.resolveSourceDir();

  beforeEach(() => Eng.reset());

  (realDir ? it : it.skip)("learns from the 12 PRISM-modified .cps posts", () => {
    const corpus = Eng.learn(realDir!);
    expect(corpus.warning).toBe(undefined);
    expect(corpus.profileCount).toBeGreaterThanOrEqual(10);
    expect(Object.keys(corpus.byControllerFamily).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(corpus.enhancementFrequency).length).toBeGreaterThanOrEqual(1);
    expect(corpus.patterns.length).toBeGreaterThanOrEqual(1);
    for (const p of corpus.profiles) {
      expect(p.file.toLowerCase()).toMatch(/\.cps$/);
      expect(["haas", "hurco", "okuma", "roku-roku", "unknown"]).toContain(
        p.controllerFamily,
      );
    }
  });
});

describe("JMDiePostProcessorLearningEngine — determinism anti-regression", () => {
  beforeEach(() => Eng.reset());

  it("learn() over the same corpus yields identical aggregates on re-run", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-det-"));
    fs.writeFileSync(path.join(tmp, "HURCO_A.cps"), SAMPLE_CPS, "utf8");
    fs.writeFileSync(path.join(tmp, "HAAS_B.cps"), HAAS_CPS, "utf8");

    const a = Eng.learn(tmp);
    Eng.reset();
    const b = Eng.learn(tmp);

    expect(b.profileCount).toBe(a.profileCount);
    expect(b.schemaVersion).toBe("1.0.0");
    expect(b.patterns.map((p) => p.id).sort()).toEqual(
      a.patterns.map((p) => p.id).sort(),
    );
    expect(b.enhancementFrequency).toEqual(a.enhancementFrequency);
  });
});

// ──────────────────────────────────────────────────────────────────────
// INDIA-POST-GAPS (india /loop 2026-05-22) — gapReport()
// per-post + corpus-wide enhancement-gap analysis
// ──────────────────────────────────────────────────────────────────────

/** Hurco CPS carrying smoothing + chip-thinning + aggressiveness + rigid-tap. */
const HURCO_FULL_GAP = `description = "PRISM Hurco Full";
vendor = "PRISM";
extension = "nc";
capabilities = CAPABILITY_MILLING;
properties = { p: { value: 1 } };
// G05.3 path smoothing, chip-thinning compensation, aggressiveness control, rigid tapping
`;

/** Hurco CPS missing rigid-tap — lags HURCO_FULL_GAP by one family enhancement. */
const HURCO_LAGGING_GAP = `description = "PRISM Hurco Lagging";
vendor = "PRISM";
extension = "nc";
capabilities = CAPABILITY_MILLING;
properties = { q: { value: 1 } };
// G05.3 smoothing, chip-thinning, aggressiveness
`;

describe("JMDiePostProcessorLearningEngine — gapReport", () => {
  beforeEach(() => Eng.reset());

  it("returns a fully-shaped report on an unreachable corpus", () => {
    const missing = path.join(os.tmpdir(), "jmdie-gap-empty-" + Date.now());
    Eng.learn(missing);
    const r = Eng.gapReport();
    expect(r.schemaVersion).toBe("1.0.0");
    expect(r.profileCount).toBe(0);
    expect(r.postGaps).toEqual([]);
    expect(r.corpusWideGaps).toEqual([]);
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(typeof r.warning).toBe("string");
    expect((r.warning ?? "").length).toBeGreaterThan(0);
  });

  it("surfaces corpus-wide gaps for markers with <50% adoption", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-cw-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.profileCount).toBe(2);
    for (const g of r.corpusWideGaps) {
      expect(g.coverage).toBeLessThan(0.5);
      expect(g.absentFrom).toBe(2 - g.presentIn);
    }
    // Markers absent from BOTH posts (e.g. imachining_variable_feed,
    // load_monitoring) must appear with coverage 0.
    const absentEntirely = r.corpusWideGaps.filter((g) => g.coverage === 0);
    expect(absentEntirely.length).toBeGreaterThan(0);
  });

  it("flags a post that lags its family in missingFamilyPatterns", () => {
    // HURCO_FULL_GAP carries rigid_tapping; HURCO_LAGGING_GAP does not.
    // Support 1/2 = 0.5 ≥ threshold → rigid_tapping IS a family pattern,
    // so the lagging post must list it as missing.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-fam-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.postGaps.map((g) => g.file).sort()).toEqual([
      "HURCO_FULL.cps",
      "HURCO_LAGGING.cps",
    ]);
    const lagging = r.postGaps.find((g) => g.file === "HURCO_LAGGING.cps")!;
    const full = r.postGaps.find((g) => g.file === "HURCO_FULL.cps")!;
    expect(lagging.controllerFamily).toBe("hurco");
    expect(full.controllerFamily).toBe("hurco");
    expect(lagging.missingFamilyPatterns).toContain("rigid_tapping");
    expect(full.missingFamilyPatterns).not.toContain("rigid_tapping");
    expect(lagging.valueScore).toBeLessThan(full.valueScore);
  });

  it("valueScore is in [0,1] for every post", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-vs-"));
    fs.writeFileSync(path.join(tmp, "HURCO_X.cps"), HURCO_FULL_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.postGaps.length).toBe(1);
    for (const pg of r.postGaps) {
      expect(pg.valueScore).toBeGreaterThanOrEqual(0);
      expect(pg.valueScore).toBeLessThanOrEqual(1);
    }
  });

  it("single-post family yields empty missingFamilyPatterns for that post", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-solo-"));
    fs.writeFileSync(path.join(tmp, "HURCO_SOLO.cps"), HURCO_FULL_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.postGaps.map((g) => g.file)).toEqual(["HURCO_SOLO.cps"]);
    expect(r.postGaps[0]!.controllerFamily).toBe("hurco");
    expect(r.postGaps[0]!.missingFamilyPatterns).toEqual([]);
  });

  it("postGaps sort: most-lagging post ranks before the full sibling", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-sort-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.postGaps.length).toBe(2);
    expect(r.postGaps[0]!.file).toBe("HURCO_LAGGING.cps");
    expect(r.postGaps[1]!.file).toBe("HURCO_FULL.cps");
  });

  it("is deterministic — same corpus → identical report", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-det-"));
    fs.writeFileSync(path.join(tmp, "HURCO_A.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_B.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const r1 = Eng.gapReport();
    Eng.reset();
    Eng.learn(tmp);
    const r2 = Eng.gapReport();
    expect(r2.postGaps.map((g) => g.file)).toEqual(r1.postGaps.map((g) => g.file));
    expect(r2.corpusWideGaps).toEqual(r1.corpusWideGaps);
    expect(r2.recommendations).toEqual(r1.recommendations);
  });

  it("recommendations include corpus-wide rollouts AND per-post gaps", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-rec-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.recommendations.some((rec) => rec.startsWith("Roll out"))).toBe(true);
    expect(
      r.recommendations.some((rec) => rec.includes("HURCO_LAGGING.cps")),
    ).toBe(true);
  });

  it("includes the warning field when the corpus is unreachable", () => {
    const missing = path.join(os.tmpdir(), "jmdie-gap-warn-" + Date.now());
    Eng.learn(missing);
    const r = Eng.gapReport();
    expect(typeof r.warning).toBe("string");
    expect((r.warning ?? "").length).toBeGreaterThan(0);
  });

  it("corpusWideGaps preserves coverage/presentIn/absentFrom invariant", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-gap-inv-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const r = Eng.gapReport();
    expect(r.corpusWideGaps.length).toBeGreaterThan(0);
    for (const g of r.corpusWideGaps) {
      expect(g.presentIn + g.absentFrom).toBe(r.profileCount);
      expect(g.presentIn).toBeGreaterThanOrEqual(0);
      expect(g.absentFrom).toBeGreaterThanOrEqual(0);
    }
  });
});

// -- Dispatcher-contract lock (U-PP-JMDIE-LEARN-UNDARK, 2026-06-24) --------------
// The camDispatcher actions jmdie_post_enhancement_ranking + jmdie_post_recommendations
// previously called getEnhancementRanking()/getRecommendations() -- methods that DO NOT
// exist -- so they silently returned {note:"not callable"} (R12 lie). They now call the
// REAL static methods getEnhancementCatalog() + gapReport().recommendations. These tests
// lock the engine-side contract the dispatcher depends on (engine unit tests alone could
// not catch a dispatcher name-mismatch).
describe("JMDiePostProcessorLearningEngine -- dispatcher contract (U-PP-JMDIE-LEARN-UNDARK)", () => {
  it("exposes getEnhancementCatalog -- the real method jmdie_post_enhancement_ranking now calls", () => {
    expect(typeof Eng.getEnhancementCatalog).toBe("function");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-contract-rank-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const ranking = Eng.getEnhancementCatalog();
    expect(Array.isArray(ranking)).toBe(true);
    expect(ranking.length).toBeGreaterThan(0);
    // ranked by DESCENDING count -- the "ranking" the dispatcher advertises
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1]!.count).toBeGreaterThanOrEqual(ranking[i]!.count);
    }
    expect(typeof ranking[0]!.enhancement).toBe("string");
    expect(Array.isArray(ranking[0]!.posts)).toBe(true);
  });

  it("gapReport().recommendations is the string[] jmdie_post_recommendations now returns", () => {
    expect(typeof Eng.gapReport).toBe("function");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-contract-rec-"));
    fs.writeFileSync(path.join(tmp, "HURCO_FULL.cps"), HURCO_FULL_GAP, "utf8");
    fs.writeFileSync(path.join(tmp, "HURCO_LAGGING.cps"), HURCO_LAGGING_GAP, "utf8");
    Eng.learn(tmp);
    const recs = Eng.gapReport().recommendations;
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    expect(typeof recs[0]).toBe("string");
  });

  it("[regression] the phantom method names the dispatcher used to call do NOT exist", () => {
    // Re-pointing the dispatcher back to these names would re-introduce the silent fallback.
    expect("getEnhancementRanking" in Eng).toBe(false);
    expect("getRecommendations" in Eng).toBe(false);
  });
});
