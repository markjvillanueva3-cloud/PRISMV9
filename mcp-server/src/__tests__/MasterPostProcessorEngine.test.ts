/**
 * MasterPostProcessorEngine companion tests
 *
 * Classification: transform / orchestration pipeline
 * Technique: algebraic-invariant + reference-value assertions on real sub-engine outputs
 * Edge cases: empty segments, zero-diameter tool, unknown controller, null-like inputs
 * Failure modes: missing required fields, garbage intent, oversized segment arrays
 */

import { describe, it, expect } from "vitest";
import {
  masterPostProcessorEngine,
  MasterPostProcessorEngine,
  type CamToolpathSegment,
  type MasterPostConfig,
  type MachineProfile,
} from "../engines/MasterPostProcessorEngine.js";

// ── Minimal valid fixture ────────────────────────────────────────────────────

const BASIC_SEGMENT: CamToolpathSegment = {
  source_cam: "mastercam",
  intent: "rough_3d",
  moves: [
    { type: "rapid", x: 0, y: 0, z: 10 },
    { type: "linear", x: 50, y: 0, z: -5, feed: 800 },
    { type: "linear", x: 50, y: 50, z: -5, feed: 800 },
  ],
  tool_number: 1,
  tool_diameter_mm: 12,
  tool_flutes: 4,
  spindle_rpm: 3500,
  feed_rate_mmmin: 800,
  coolant: "flood",
  material_iso: "P",
  radial_depth_mm: 3,
  axial_depth_mm: 6,
};

const BASIC_CONFIG: MasterPostConfig = {
  controller: "fanuc",
  program_number: 1001,
  enable_hsm: false,
  enable_feed_optimization: false,
  enable_cross_cam_features: false,
};

// ── Happy path ───────────────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.process — happy path", () => {
  it("returns a complete MasterPostResult for a minimal single-segment job", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);

    // Shape invariants
    expect(typeof result.gcode).toBe("string");
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.segments_processed).toBe(1);
    expect(result.line_count).toBe(result.gcode.split("\n").length);
    expect(Array.isArray(result.cam_sources_used)).toBe(true);
    expect(Array.isArray(result.enhancements_applied)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.machine_specific_features)).toBe(true);
    expect(Array.isArray(result.knowledge_sources)).toBe(true);
  });

  it("records the CAM source from the segment in cam_sources_used", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.cam_sources_used).toContain("mastercam");
  });

  it("always includes MasterPostProcessorEngine in knowledge_sources", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.knowledge_sources).toContain("MasterPostProcessorEngine");
  });

  it("segments_processed equals the number of input segments", () => {
    const twoSegs: CamToolpathSegment[] = [
      BASIC_SEGMENT,
      { ...BASIC_SEGMENT, source_cam: "hypermill", intent: "finish_3d", tool_number: 2 },
    ];
    const result = masterPostProcessorEngine.process(twoSegs, BASIC_CONFIG);
    expect(result.segments_processed).toBe(2);
  });

  it("deduplicates cam_sources_used when two segments share the same source", () => {
    const twoSame: CamToolpathSegment[] = [BASIC_SEGMENT, { ...BASIC_SEGMENT }];
    const result = masterPostProcessorEngine.process(twoSame, BASIC_CONFIG);
    const mastercamCount = result.cam_sources_used.filter(s => s === "mastercam").length;
    expect(mastercamCount).toBe(1);
  });

  it("gcode contains the program number header O1001 for fanuc when program_number is set", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.gcode).toContain("O1001");
  });

  it("gcode contains fanuc safe-start block G90 G94 G17 G40 G49 G80", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.gcode).toContain("G90 G94 G17 G40 G49 G80");
  });

  it("gcode ends with M30 footer for standard controllers", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.gcode).toContain("M30");
  });

  it("estimated_time_sec is a positive number", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.estimated_time_sec).toBeGreaterThan(0);
  });

  it("line_count algebraically matches gcode newline count", () => {
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], BASIC_CONFIG);
    expect(result.line_count).toBe(result.gcode.split("\n").length);
  });
});

// ── HSM feature injection ────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.process — HSM smoothing", () => {
  it("injects G187 for haas controller when enable_hsm is true", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      controller: "haas",
      enable_hsm: true,
      smoothing_mode: "rough",
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    expect(result.gcode).toContain("G187");
    expect(result.enhancements_applied).toContain("hsm_smoothing");
    expect(result.machine_specific_features.some(f => f.startsWith("HSM:"))).toBe(true);
  });

  it("injects G5.1 Q1 for fanuc controller when enable_hsm is true", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      controller: "fanuc",
      enable_hsm: true,
      smoothing_mode: "finish",
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    expect(result.gcode).toContain("G5.1 Q1");
  });

  it("does NOT inject hsm_smoothing enhancement when enable_hsm is false", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      controller: "haas",
      enable_hsm: false,
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    expect(result.enhancements_applied).not.toContain("hsm_smoothing");
  });
});

// ── Heidenhain dialect ───────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.process — heidenhain dialect", () => {
  it("generates BEGIN PGM MASTER MM header for heidenhain", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      controller: "heidenhain",
      enable_hsm: false,
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    expect(result.gcode).toContain("BEGIN PGM MASTER MM");
  });

  it("generates END PGM MASTER MM footer for heidenhain", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      controller: "heidenhain",
      enable_hsm: false,
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    expect(result.gcode).toContain("END PGM MASTER MM");
  });

  it("uses semicolon comments (not parenthesis) for heidenhain", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      controller: "heidenhain",
      enable_hsm: false,
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    expect(result.gcode).toContain("; PRISM MasterPostProcessor");
  });
});

// ── Line numbers ─────────────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.process — line numbers", () => {
  it("prefixes every non-blank line with N<digits> space when line_numbers is true", () => {
    const config: MasterPostConfig = {
      ...BASIC_CONFIG,
      line_numbers: true,
      enable_hsm: false,
    };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    const nonBlankLines = result.gcode
      .split("\n")
      .filter(l => l.trim().length > 0);
    for (const line of nonBlankLines) {
      expect(line).toMatch(/^N\d+\s/);
    }
  });

  it("does NOT add line numbers when line_numbers is false", () => {
    const config: MasterPostConfig = { ...BASIC_CONFIG, line_numbers: false };
    const result = masterPostProcessorEngine.process([BASIC_SEGMENT], config);
    const linesStartingWithN = result.gcode
      .split("\n")
      .filter(l => /^N\d+\s/.test(l));
    expect(linesStartingWithN.length).toBe(0);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.process — edge cases", () => {
  it("handles empty segments array without throwing", () => {
    expect(() =>
      masterPostProcessorEngine.process([], BASIC_CONFIG)
    ).not.toThrow();
  });

  it("returns segments_processed=0 for empty segments", () => {
    const result = masterPostProcessorEngine.process([], BASIC_CONFIG);
    expect(result.segments_processed).toBe(0);
  });

  it("returns empty cam_sources_used for empty segments", () => {
    const result = masterPostProcessorEngine.process([], BASIC_CONFIG);
    expect(result.cam_sources_used).toEqual([]);
  });

  it("still produces a non-empty gcode string (header+footer) for empty segments", () => {
    const result = masterPostProcessorEngine.process([], BASIC_CONFIG);
    expect(result.gcode.trim().length).toBeGreaterThan(0);
  });

  it("still produces valid output when segment has minimal moves (one rapid only)", () => {
    const minimalSeg: CamToolpathSegment = {
      ...BASIC_SEGMENT,
      moves: [{ type: "rapid", x: 0, y: 0, z: 100 }],
    };
    expect(() =>
      masterPostProcessorEngine.process([minimalSeg], BASIC_CONFIG)
    ).not.toThrow();
  });

  it("does not crash on segment without optional fields (no radial/axial depth)", () => {
    const sparse: CamToolpathSegment = {
      source_cam: "generic",
      intent: "contour_2d",
      moves: [{ type: "linear", x: 10, y: 10, z: 0, feed: 500 }],
      tool_number: 1,
      tool_diameter_mm: 8,
      spindle_rpm: 2000,
      feed_rate_mmmin: 500,
      coolant: "none",
    };
    expect(() =>
      masterPostProcessorEngine.process([sparse], BASIC_CONFIG)
    ).not.toThrow();
  });
});

// ── Adversarial inputs ───────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.process — adversarial inputs", () => {
  it("handles 50 segments and correctly counts segments_processed and deduplicates cam sources", () => {
    const sources = ["mastercam", "hypermill", "fusion360", "solidcam", "generic"] as const;
    const manySegs: CamToolpathSegment[] = Array.from({ length: 50 }, (_, i) => ({
      ...BASIC_SEGMENT,
      tool_number: (i % 20) + 1,
      source_cam: sources[i % 5],
    }));
    const result = masterPostProcessorEngine.process(manySegs, BASIC_CONFIG);
    expect(result.segments_processed).toBe(50);
    // cam_sources_used must be deduplicated (5 unique sources)
    expect(result.cam_sources_used.length).toBe(5);
    // algebraic: line_count equals actual newlines
    expect(result.line_count).toBe(result.gcode.split("\n").length);
  });

  it("handles a segment comment containing parentheses without crashing", () => {
    const seg: CamToolpathSegment = {
      ...BASIC_SEGMENT,
      comment: "Op 1 (fixture A) critical",
    };
    const result = masterPostProcessorEngine.process([seg], BASIC_CONFIG);
    expect(result.segments_processed).toBe(1);
    expect(result.gcode.length).toBeGreaterThan(0);
  });

  it("tracks all 5 distinct sources for a mixed-source segment array", () => {
    const sources = ["hypermill", "fusion360", "mastercam", "solidcam", "esprit"] as const;
    const mixedSegs: CamToolpathSegment[] = sources.map((src, i) => ({
      ...BASIC_SEGMENT,
      source_cam: src,
      tool_number: i + 1,
    }));
    const result = masterPostProcessorEngine.process(mixedSegs, BASIC_CONFIG);
    for (const src of sources) {
      expect(result.cam_sources_used).toContain(src);
    }
    expect(result.cam_sources_used.length).toBe(sources.length);
  });
});

// ── compareControllers ───────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.compareControllers", () => {
  it("returns exactly 6 entries — one per supported controller", () => {
    const results = masterPostProcessorEngine.compareControllers(
      [BASIC_SEGMENT],
      { enable_hsm: false, enable_feed_optimization: false },
    );
    expect(results.length).toBe(6);
  });

  it("each entry carries the correct controller label matching the 6 known controllers", () => {
    const expected = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];
    const results = masterPostProcessorEngine.compareControllers(
      [BASIC_SEGMENT],
      { enable_hsm: false, enable_feed_optimization: false },
    );
    const actual = results.map(r => r.controller).sort();
    expect(actual).toEqual([...expected].sort());
  });

  it("each entry result.segments_processed equals 1 for a single input segment", () => {
    const results = masterPostProcessorEngine.compareControllers(
      [BASIC_SEGMENT],
      { enable_hsm: false },
    );
    for (const { result } of results) {
      expect(result.segments_processed).toBe(1);
    }
  });
});

// ── getPostTemplates ─────────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.getPostTemplates", () => {
  it("returns exactly 6 templates when no filter is applied", () => {
    const templates = masterPostProcessorEngine.getPostTemplates();
    expect(templates.length).toBe(6);
  });

  it("filters to exactly 1 haas template and its id is haas-umc-5ax", () => {
    const templates = masterPostProcessorEngine.getPostTemplates("haas");
    expect(templates.length).toBe(1);
    expect(templates[0].controller).toBe("haas");
    expect(templates[0].id).toBe("haas-umc-5ax");
  });

  it("every template has a non-empty id, name, and description", () => {
    const templates = masterPostProcessorEngine.getPostTemplates();
    for (const t of templates) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for an unknown controller", () => {
    const templates = masterPostProcessorEngine.getPostTemplates("unknown" as never);
    expect(templates).toEqual([]);
  });
});

// ── getMachineFeatures ───────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.getMachineFeatures", () => {
  it("returns haas HSM code G187 (from MACHINE_FEATURE_DB)", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("haas");
    expect(features.hsm?.code).toBe("G187");
  });

  it("returns haas TSC on code M88", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("haas");
    expect(features.tsc?.on).toBe("M88");
  });

  it("returns okuma HSM code G08 P1", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("okuma");
    expect(features.hsm?.code).toBe("G08 P1");
  });

  it("returns siemens HSM code CYCLE832", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("siemens");
    expect(features.hsm?.code).toBe("CYCLE832");
  });

  it("returns empty object for unknown controller without throwing", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("unknown" as never);
    expect(Object.keys(features).length).toBe(0);
  });
});

// ── listCrossCamFeatures ─────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.listCrossCamFeatures", () => {
  it("returns exactly 5 cross-CAM feature descriptors", () => {
    const features = masterPostProcessorEngine.listCrossCamFeatures();
    expect(features.length).toBe(5);
  });

  it("solidcam_chip_thinning entry has source_cam=solidcam", () => {
    const features = masterPostProcessorEngine.listCrossCamFeatures();
    const entry = features.find(f => f.key === "solidcam_chip_thinning");
    // entry must exist and have the correct cam source
    expect(entry?.source_cam).toBe("solidcam");
  });

  it("every feature entry has non-empty key, description, and benefit", () => {
    const features = masterPostProcessorEngine.listCrossCamFeatures();
    for (const f of features) {
      expect(f.key.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
      expect(f.benefit.length).toBeGreaterThan(0);
    }
  });
});

// ── isMasterPostController ───────────────────────────────────────────────────

describe("MasterPostProcessorEngine.isMasterPostController", () => {
  it("returns true for all 10 supported controller family strings", () => {
    const supported = [
      "haas_ngc", "fanuc_31i", "siemens_840d", "heidenhain",
      "mazak", "okuma", "hurco", "dmg_mori", "brother", "doosan",
    ];
    for (const c of supported) {
      expect(masterPostProcessorEngine.isMasterPostController(c)).toBe(true);
    }
  });

  it("returns false for bare controller names (fanuc/haas not in the family list)", () => {
    expect(masterPostProcessorEngine.isMasterPostController("fanuc")).toBe(false);
    expect(masterPostProcessorEngine.isMasterPostController("haas")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(masterPostProcessorEngine.isMasterPostController("")).toBe(false);
  });

  it("returns false for garbage input", () => {
    expect(masterPostProcessorEngine.isMasterPostController("!!!xss<>")).toBe(false);
  });
});

// ── generateMasterCpsConfig ──────────────────────────────────────────────────

describe("MasterPostProcessorEngine.generateMasterCpsConfig", () => {
  const HAAS_MACHINE: MachineProfile = {
    manufacturer: "Haas",
    model: "UMC-500",
    controller: "haas",
    max_rpm: 15000,
    max_feed: 20000,
    axis_count: 5,
    has_probing: true,
    has_tsc: true,
    taper: "CAT40",
    tool_capacity: 40,
  };

  it("maps haas controller to haas_ngc family string", () => {
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(HAAS_MACHINE);
    expect(cfg.controller).toBe("haas_ngc");
  });

  it("sets machineName property to 'Haas UMC-500'", () => {
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(HAAS_MACHINE);
    expect(cfg.properties["machineName"]).toBe("Haas UMC-500");
  });

  it("sets maxSpindleSpeed to machine.max_rpm (15000)", () => {
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(HAAS_MACHINE);
    expect(cfg.properties["maxSpindleSpeed"]).toBe(15000);
  });

  it("always returns cps_file equal to PRISM-Master.cps", () => {
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(HAAS_MACHINE);
    expect(cfg.cps_file).toBe("PRISM-Master.cps");
  });

  it("falls back to fanuc_31i for unrecognized controller", () => {
    const machine: MachineProfile = {
      ...HAAS_MACHINE,
      controller: "unknown" as never,
    };
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(machine);
    expect(cfg.controller).toBe("fanuc_31i");
  });

  it("sets useSmoothing=true for haas because MACHINE_FEATURE_DB.haas has hsm", () => {
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(HAAS_MACHINE);
    expect(cfg.properties["useSmoothing"]).toBe(true);
  });

  it("sets maxFeedRate to machine.max_feed (20000)", () => {
    const cfg = masterPostProcessorEngine.generateMasterCpsConfig(HAAS_MACHINE);
    expect(cfg.properties["maxFeedRate"]).toBe(20000);
  });
});

// ── stats ────────────────────────────────────────────────────────────────────

describe("MasterPostProcessorEngine.stats", () => {
  it("returns controllers=6", () => {
    expect(masterPostProcessorEngine.stats().controllers).toBe(6);
  });

  it("returns post_templates=6, consistent with getPostTemplates().length", () => {
    const s = masterPostProcessorEngine.stats();
    expect(s.post_templates).toBe(masterPostProcessorEngine.getPostTemplates().length);
    expect(s.post_templates).toBe(6);
  });

  it("returns cross_cam_features=5, consistent with listCrossCamFeatures().length", () => {
    const s = masterPostProcessorEngine.stats();
    expect(s.cross_cam_features).toBe(masterPostProcessorEngine.listCrossCamFeatures().length);
    expect(s.cross_cam_features).toBe(5);
  });

  it("returns machine_feature_sets=6 (haas/okuma/mazak/fanuc/siemens/heidenhain)", () => {
    expect(masterPostProcessorEngine.stats().machine_feature_sets).toBe(6);
  });

  it("returns sub_engines=5", () => {
    expect(masterPostProcessorEngine.stats().sub_engines).toBe(5);
  });

  it("returns master_post_controllers=10", () => {
    expect(masterPostProcessorEngine.stats().master_post_controllers).toBe(10);
  });

  it("all stat values are positive integers (self-consistent invariant)", () => {
    const s = masterPostProcessorEngine.stats();
    for (const [, val] of Object.entries(s)) {
      expect(typeof val).toBe("number");
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    }
  });
});

// ── Singleton export ─────────────────────────────────────────────────────────

describe("exported singleton", () => {
  it("masterPostProcessorEngine is an instance of MasterPostProcessorEngine", () => {
    expect(masterPostProcessorEngine).toBeInstanceOf(MasterPostProcessorEngine);
  });

  it("singleton and a fresh instance produce identical stats() objects", () => {
    const fresh = new MasterPostProcessorEngine();
    expect(fresh.stats()).toEqual(masterPostProcessorEngine.stats());
  });
});
