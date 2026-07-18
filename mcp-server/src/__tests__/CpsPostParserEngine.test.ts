/**
 * CpsPostParserEngine.test.ts -- companion unit test (R9, U-PP-CPS-PARSER-TEST)
 *
 * CpsPostParserEngine (pure regex parser for Fusion 360 .cps posts) had NO companion test.
 * It is the foundation of the dual-track .cps surface + Track-B CIMCO byte-equiv validation
 * (ECHO-ULTIMATE-ROADMAP v2 G1), so its extraction correctness matters. Every assertion below
 * feeds a hand-built synthetic .cps with KNOWN field values and asserts the parsed profile --
 * each FAILS if a regex/extractor changes (R9 intent, not behavior).
 *
 * Note: parseFile caches by FILENAME only (ignoring content) -- a deliberate immutable-file
 * perf choice, but a latent cross-directory same-basename staleness edge. Tests clearCache()
 * between cases to stay isolated; the caching behavior itself is covered explicitly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { cpsPostParserEngine } from "../engines/CpsPostParserEngine.js";

const eng = cpsPostParserEngine;

// A synthetic Fusion .cps exercising every extractor. Directives are column-0 anchored
// (the metadata regexes are ^-multiline). createFormat configs are flat (no nested braces).
const SYNTH_CPS = `description = "PRISM Synthetic Mill Post";
vendor = "PRISM";
vendorUrl = "https://prism.local";
legal = "Copyright (C) PRISM";
certificationLevel = 2;
extension = "nc";
longDescription = "Synthetic post for parser testing";
programNameIsInteger = false;

capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;

tolerance = spatial(0.01, MM);
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000.0, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowSpiralMoves = false;
allowedCircularPlanes = undefined;
probeMultipleFeatures = true;
highFeedrate = (unit == MM) ? 5000 : 200;

var xyzFormat = createFormat({decimals:3, forceDecimal:true});
var feedFormat = createFormat({prefix:"F", decimals:1});
var gFormat = createFormat({prefix:"G", decimals:0});
var mFormat = createFormat({prefix:"M", decimals:0});
var xOutput = createVariable({prefix:"X"}, xyzFormat);

properties = {
  writeMachine: { title: "Write machine", description: "Output the machine settings", group: "general", type: "boolean", value: true, scope: "post" },
  coolantMode: { title: "Coolant", description: "Coolant control", group: "preferences", type: "enum", values: [ { title: "Flood", id: "flood" }, { title: "Off", id: "off" } ], value: "flood", scope: "post" }
};

wcsDefinitions = {
  useZeroOffset: false,
  wcs: [ { name: "Standard", format: "G", range: [54, 59] } ]
};

function onComment(text) {
  gMotionModal.format(0); // rapid
}

function onSection() {
  gFormat.format(43); // tool length comp
  mFormat.format(8); // coolant on
}

function onCyclePoint(x, y, z) {
  switch (cycleType) {
  case "drilling":
    gCycleModal.format(81); // drill
    break;
  case "tapping":
    gCycleModal.format(84);
    break;
  case "boring":
    gCycleModal.format(85);
    break;
  }
}
`;

beforeEach(() => eng.clearCache());

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- metadata extraction", () => {
  it("extracts description/vendor/legal/extension/cert level/long description", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-meta.cps");
    expect(p.metadata.description).toBe("PRISM Synthetic Mill Post");
    expect(p.metadata.vendor).toBe("PRISM");
    expect(p.metadata.vendorUrl).toBe("https://prism.local");
    expect(p.metadata.legal).toBe("Copyright (C) PRISM");
    expect(p.metadata.certificationLevel).toBe(2);
    expect(p.metadata.extension).toBe("nc");
    expect(p.metadata.longDescription).toBe("Synthetic post for parser testing");
    expect(p.metadata.programNameIsInteger).toBe(false);
  });

  it("extracts tolerances (spatial MM) and minimum chord length", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-tol.cps");
    expect(p.metadata.tolerances.spatial_mm).toBe(0.01);
    expect(p.metadata.tolerances.minimumChordLength_mm).toBe(0.25);
  });

  it("extracts circular limits (radius mm + sweep rad via toRad)", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-circ.cps");
    expect(p.metadata.circularLimits.minimumRadius_mm).toBe(0.01);
    expect(p.metadata.circularLimits.maximumRadius_mm).toBe(1000);
    expect(p.metadata.circularLimits.minimumSweep_rad).toBe(0.01);
    expect(p.metadata.circularLimits.maximumSweep_rad).toBe(180);
  });

  it("extracts helical/spiral flags, probe flag, and conditional highFeedrate {mm,inch}", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-flags.cps");
    expect(p.metadata.helicalMoves).toBe(true);
    expect(p.metadata.spiralMoves).toBe(false);
    expect(p.metadata.probeMultipleFeatures).toBe(true);
    expect(p.metadata.highFeedrate).toEqual({ mm: 5000, inch: 200 });
  });
});

// ---------------------------------------------------------------------------
// Capabilities / fingerprint
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- capabilities + fingerprint", () => {
  it("milling + machine simulation -> fingerprint 'mill+sim', turning false", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-caps.cps");
    expect(p.metadata.capabilities.milling).toBe(true);
    expect(p.metadata.capabilities.machineSimulation).toBe(true);
    expect(p.metadata.capabilities.turning).toBe(false);
    expect(p.metadata.capabilities.fingerprint).toBe("mill+sim");
  });

  it("milling + turning -> fingerprint 'mill+turn'", () => {
    const cps = `capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;\n`;
    const p = eng.parseFile(cps, "synth-millturn.cps");
    expect(p.metadata.capabilities.fingerprint).toBe("mill+turn");
  });

  it("no capabilities line -> fingerprint 'unknown' (adversarial)", () => {
    const p = eng.parseFile(`description = "no caps";\n`, "synth-nocaps.cps");
    expect(p.metadata.capabilities.fingerprint).toBe("unknown");
  });

  it("inspection inferred from filename even without a capability token", () => {
    const p = eng.parseFile(`description = "probe";\n`, "fanuc-inspection.cps");
    expect(p.metadata.capabilities.inspection).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- properties", () => {
  it("parses both top-level properties with type/default/scope", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-props.cps");
    expect(p.properties).toHaveLength(2);
    expect(p.rawPropertyCount).toBe(2);

    const wm = p.properties.find((x) => x.name === "writeMachine")!;
    expect(wm.type).toBe("boolean");
    expect(wm.defaultValue).toBe(true);
    expect(wm.group).toBe("general");
    expect(wm.scope).toBe("post");
  });

  it("parses an enum property's values array and string default", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-enum.cps");
    const cm = p.properties.find((x) => x.name === "coolantMode")!;
    expect(cm.type).toBe("enum");
    expect(cm.defaultValue).toBe("flood");
    expect(cm.values).toHaveLength(2);
    expect(cm.values).toEqual([
      { title: "Flood", id: "flood" },
      { title: "Off", id: "off" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- format definitions", () => {
  it("extracts createFormat decimals/prefix and a createVariable format reference", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-fmt.cps");
    expect(p.rawFormatCount).toBe(5); // xyz, feed, g, m, xOutput

    const xyz = p.formats.find((f) => f.variableName === "xyzFormat")!;
    expect(xyz.decimals).toBe(3);

    const feed = p.formats.find((f) => f.variableName === "feedFormat")!;
    expect(feed.prefix).toBe("F");
    expect(feed.decimals).toBe(1);

    const xo = p.formats.find((f) => f.variableName === "xOutput")!;
    expect(xo.prefix).toBe("X");
    expect(xo.type).toBe("ref:xyzFormat");
  });
});

// ---------------------------------------------------------------------------
// G/M codes
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- G/M code tables", () => {
  it("extracts gFormat/gModal codes with inline comments and mFormat codes", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-gm.cps");
    expect(p.gCodes["G0"]).toBe("rapid");
    expect(p.gCodes["G43"]).toBe("tool length comp");
    expect(p.mCodes["M8"]).toBe("coolant on");
  });
});

// ---------------------------------------------------------------------------
// WCS
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- WCS definition", () => {
  it("extracts useZeroOffset + a named G54-59 range", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-wcs.cps");
    expect(p.wcsDefinition?.useZeroOffset).toBe(false);
    expect(p.wcsDefinition?.ranges).toEqual([{ name: "Standard", format: "G", range: [54, 59] }]);
  });

  it("no wcsDefinitions block -> wcsDefinition is undefined", () => {
    const p = eng.parseFile(`description = "x";\n`, "synth-nowcs.cps");
    expect(p.wcsDefinition).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cycle support
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- canned cycle detection", () => {
  it("detects drilling/tapping/boring + the G81/G84/G85 cycle codes and case names", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-cycles.cps");
    expect(p.cycleSupport.hasDrilling).toBe(true);
    expect(p.cycleSupport.hasTapping).toBe(true);
    expect(p.cycleSupport.hasBoring).toBe(true);
    expect(p.cycleSupport.hasProbing).toBe(false);
    expect(p.cycleSupport.detectedCycles).toEqual(
      expect.arrayContaining(["G81", "G84", "G85", "boring", "drilling", "tapping"]),
    );
  });

  it("no onCycle/onCyclePoint handler -> empty cycle support", () => {
    const p = eng.parseFile(`description = "no cycles";\n`, "synth-nocycle.cps");
    expect(p.cycleSupport.detectedCycles).toHaveLength(0);
    expect(p.cycleSupport.hasDrilling).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// include flags
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- include flags", () => {
  it("includeFormats=false yields no formats", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-noformats.cps", false, true);
    expect(p.formats).toHaveLength(0);
    expect(p.rawFormatCount).toBe(0);
  });

  it("includeCycles=false yields empty cycle support even with cycle handlers present", () => {
    const p = eng.parseFile(SYNTH_CPS, "synth-nocycles.cps", true, false);
    expect(p.cycleSupport.detectedCycles).toHaveLength(0);
    expect(p.cycleSupport.hasDrilling).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cache + adversarial + router
// ---------------------------------------------------------------------------

describe("CpsPostParserEngine -- cache, adversarial, router", () => {
  it("parseFile caches by filename (returns the same profile object on re-parse)", () => {
    const a = eng.parseFile(SYNTH_CPS, "cache-key.cps");
    const b = eng.parseFile("description = \"different\";\n", "cache-key.cps");
    expect(b).toBe(a); // same reference -- cache is keyed by filename, not content
    expect(eng.cacheSize).toBe(1);
  });

  it("clearCache empties the cache", () => {
    eng.parseFile(SYNTH_CPS, "to-clear.cps");
    expect(eng.cacheSize).toBe(1);
    eng.clearCache();
    expect(eng.cacheSize).toBe(0);
  });

  it("empty content parses to an empty-but-valid profile (no crash) -- adversarial", () => {
    const p = eng.parseFile("", "empty.cps");
    expect(p.metadata.description).toBe("");
    expect(p.metadata.capabilities.fingerprint).toBe("unknown");
    expect(p.properties).toHaveLength(0);
    expect(p.formats).toHaveLength(0);
    expect(p.cycleSupport.detectedCycles).toHaveLength(0);
  });

  it("execute() throws on an unknown action", () => {
    expect(() => eng.execute("bogus_action", {})).toThrow(/Unknown action/);
  });

  it("cpsParse throws when neither file path nor directory is given -- adversarial", () => {
    expect(() => eng.execute("cps_parse", {})).toThrow(/cps_file_path or cps_directory/);
  });
});
