/**
 * CAMToolLibraryEngine — strict-legitimacy tests
 * Coverage: class shape, schemas, library CRUD, search filters,
 * material-aware recommended params, JSON/CSV/XML export, adversarial inputs.
 */
import { describe, it, expect } from "vitest";
import {
  CAMToolLibraryEngine,
  camToolLibraryEngine,
  ToolTypeSchema,
  ToolMaterialSchema,
  ToolCoatingSchema,
  type CAMTool,
} from "../engines/CAMToolLibraryEngine.js";

const TOOL_TYPE_OPTIONS_COUNT = 15;
const TOOL_MATERIAL_OPTIONS_COUNT = 7;
const TOOL_COATING_OPTIONS_COUNT = 8;
const SEED_TOOL_COUNT_MIN = 2;
const TEST_TOOL_DIAMETER = 8.0;
const TEST_FLUTE_LENGTH = 20;
const TEST_FLUTE_COUNT = 3;
const TEST_REC_RPM = 10000;
const TEST_REC_FEED = 1800;
const TEST_MAX_STEPOVER = 4.0;
const TEST_MAX_STEPDOWN = 8.0;

const buildTool = (over: Partial<Omit<CAMTool, "id">> = {}): Omit<CAMTool, "id"> => ({
  name: "TestEM",
  type: "end_mill",
  material: "carbide",
  coating: "tialn",
  geometry: {
    diameter: TEST_TOOL_DIAMETER,
    fluteLength: TEST_FLUTE_LENGTH,
    overallLength: 60,
    shankDiameter: TEST_TOOL_DIAMETER,
    fluteCount: TEST_FLUTE_COUNT,
  },
  speeds: { minRPM: 1000, maxRPM: 20000, recommendedRPM: TEST_REC_RPM },
  feeds: {
    minFeed: 100,
    maxFeed: 5000,
    recommendedFeed: TEST_REC_FEED,
    plungeFeed: 200,
  },
  limits: {
    maxStepover: TEST_MAX_STEPOVER,
    maxStepdown: TEST_MAX_STEPDOWN,
    minChipload: 0.04,
    maxChipload: 0.12,
  },
  materials: ["aluminum", "steel"],
  ...over,
});

describe("CAMToolLibraryEngine — class shape + schemas", () => {
  it("static methods are callable end-to-end", () => {
    const lib = CAMToolLibraryEngine.createLibrary("ShapeProbe");
    expect(lib.id.startsWith("LIB-")).toBe(true);
    const tool = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool());
    expect(tool!.id.startsWith("TOOL-")).toBe(true);
    expect(CAMToolLibraryEngine.getTool(tool!.id)?.id).toBe(tool!.id);
    expect(CAMToolLibraryEngine.searchTools({ type: "end_mill" }).length).toBeGreaterThan(0);
    expect(CAMToolLibraryEngine.getRecommendedParams(tool!.id, "aluminum")?.rpm).toBeGreaterThan(0);
    expect(CAMToolLibraryEngine.exportLibrary(lib.id, "json")?.includes("ShapeProbe")).toBe(true);
    expect(CAMToolLibraryEngine.getLibrary(lib.id)?.id).toBe(lib.id);
    expect(CAMToolLibraryEngine.listLibraries().some((l) => l.id === lib.id)).toBe(true);
    expect(CAMToolLibraryEngine.getAllTools().length).toBeGreaterThan(0);
  });

  it("singleton is instance of class", () => {
    expect(camToolLibraryEngine instanceof CAMToolLibraryEngine).toBe(true);
  });

  it("schemas enumerate the documented values", () => {
    expect(ToolTypeSchema.options.length).toBe(TOOL_TYPE_OPTIONS_COUNT);
    expect(ToolMaterialSchema.options.length).toBe(TOOL_MATERIAL_OPTIONS_COUNT);
    expect(ToolCoatingSchema.options.length).toBe(TOOL_COATING_OPTIONS_COUNT);
    expect(ToolTypeSchema.options).toContain("ball_mill");
    expect(ToolMaterialSchema.options).toContain("carbide");
    expect(ToolCoatingSchema.options).toContain("alcrn");
  });

  it("getSelfAwareness reports name and seed tool count", () => {
    const sa = CAMToolLibraryEngine.getSelfAwareness();
    expect(sa.name).toBe("CAMToolLibraryEngine");
    expect(sa.toolCount).toBeGreaterThanOrEqual(SEED_TOOL_COUNT_MIN);
  });

  it("seeded tools include TOOL-001 + TOOL-002", () => {
    expect(CAMToolLibraryEngine.getTool("TOOL-001")?.name.includes("End Mill")).toBe(true);
    expect(CAMToolLibraryEngine.getTool("TOOL-002")?.type).toBe("ball_mill");
  });
});

describe("CAMToolLibraryEngine — library lifecycle", () => {
  it("createLibrary issues an LIB- id and stores fields", () => {
    const lib = CAMToolLibraryEngine.createLibrary("TestLib", "desc", "mastercam");
    expect(lib.id.startsWith("LIB-")).toBe(true);
    expect(lib.name).toBe("TestLib");
    expect(lib.description).toBe("desc");
    expect(lib.camSystem).toBe("mastercam");
    expect(lib.tools.length).toBe(0);
  });

  it("addToolToLibrary appends and updates timestamp", () => {
    const lib = CAMToolLibraryEngine.createLibrary("Lib1");
    const t0 = lib.updatedAt;
    const tool = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool());
    expect(tool).not.toBe(undefined);
    expect(tool!.id.startsWith("TOOL-")).toBe(true);
    const updated = CAMToolLibraryEngine.getLibrary(lib.id)!;
    expect(updated.tools.length).toBe(1);
    expect(updated.updatedAt >= t0).toBe(true);
  });

  it("addToolToLibrary returns undefined on missing library", () => {
    expect(
      CAMToolLibraryEngine.addToolToLibrary("LIB-MISSING", buildTool()),
    ).toBe(undefined);
  });

  it("listLibraries reflects createLibrary calls", () => {
    const before = CAMToolLibraryEngine.listLibraries().length;
    CAMToolLibraryEngine.createLibrary("LibA");
    CAMToolLibraryEngine.createLibrary("LibB");
    expect(CAMToolLibraryEngine.listLibraries().length).toBe(before + 2);
  });
});

describe("CAMToolLibraryEngine — searchTools", () => {
  it("filters by type", () => {
    const results = CAMToolLibraryEngine.searchTools({ type: "ball_mill" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((t) => t.type === "ball_mill")).toBe(true);
  });

  it("filters by min/max diameter range", () => {
    const results = CAMToolLibraryEngine.searchTools({
      minDiameter: 0,
      maxDiameter: 7,
    });
    expect(results.every((t) => t.geometry.diameter <= 7)).toBe(true);
  });

  it("filters by targetMaterial substring (case-insensitive)", () => {
    const results = CAMToolLibraryEngine.searchTools({ targetMaterial: "alum" });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((t) =>
        t.materials.some((m) => m.toLowerCase().includes("alum")),
      ),
    ).toBe(true);
  });

  it("returns empty when no tool matches", () => {
    const results = CAMToolLibraryEngine.searchTools({
      targetMaterial: "unobtainium-xyz",
    });
    expect(results.length).toBe(0);
  });
});

describe("CAMToolLibraryEngine — getRecommendedParams material variability", () => {
  it("aluminum increases RPM relative to baseline", () => {
    const lib = CAMToolLibraryEngine.createLibrary("recA");
    const t = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool())!;
    const al = CAMToolLibraryEngine.getRecommendedParams(t.id, "aluminum")!;
    const steel = CAMToolLibraryEngine.getRecommendedParams(t.id, "steel")!;
    expect(al.rpm).toBeGreaterThan(steel.rpm);
  });

  it("titanium reduces stepover and stepdown vs aluminum", () => {
    const lib = CAMToolLibraryEngine.createLibrary("recB");
    const t = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool())!;
    const ti = CAMToolLibraryEngine.getRecommendedParams(t.id, "titanium")!;
    const al = CAMToolLibraryEngine.getRecommendedParams(t.id, "aluminum")!;
    expect(ti.stepover).toBeLessThan(al.stepover);
    expect(ti.stepdown).toBeLessThan(al.stepdown);
  });

  it("hardened material is the most aggressive reduction", () => {
    const lib = CAMToolLibraryEngine.createLibrary("recC");
    const t = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool())!;
    const hard = CAMToolLibraryEngine.getRecommendedParams(t.id, "hardened")!;
    const ti = CAMToolLibraryEngine.getRecommendedParams(t.id, "titanium")!;
    expect(hard.rpm).toBeLessThan(ti.rpm);
    expect(hard.feed).toBeLessThan(ti.feed);
  });

  it("returns undefined for unknown tool id", () => {
    expect(
      CAMToolLibraryEngine.getRecommendedParams("TOOL-NOPE-9999", "aluminum"),
    ).toBe(undefined);
  });

  it("chipload = (min+max)/2 of tool limits", () => {
    const lib = CAMToolLibraryEngine.createLibrary("recD");
    const t = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool())!;
    const r = CAMToolLibraryEngine.getRecommendedParams(t.id, "aluminum")!;
    // (0.04 + 0.12) / 2 = 0.08 → rounded to 3 decimals
    expect(r.chipload).toBe(0.08);
  });
});

describe("CAMToolLibraryEngine — exportLibrary", () => {
  it("JSON export round-trips through JSON.parse", () => {
    const lib = CAMToolLibraryEngine.createLibrary("ExpJSON");
    CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool());
    const out = CAMToolLibraryEngine.exportLibrary(lib.id, "json")!;
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe("ExpJSON");
    expect(parsed.tools.length).toBe(1);
  });

  it("CSV export starts with header line and includes one row per tool", () => {
    const lib = CAMToolLibraryEngine.createLibrary("ExpCSV");
    CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool({ name: "RowA" }));
    CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool({ name: "RowB" }));
    const csv = CAMToolLibraryEngine.exportLibrary(lib.id, "csv")!;
    expect(csv.startsWith("ID,Name,Type,Material,Diameter")).toBe(true);
    const dataLines = csv.split("\n").slice(1);
    expect(dataLines.length).toBe(2);
    expect(csv.includes("RowA")).toBe(true);
    expect(csv.includes("RowB")).toBe(true);
  });

  it("XML export contains prolog + ToolLibrary root + Tool element", () => {
    const lib = CAMToolLibraryEngine.createLibrary("ExpXML");
    CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool());
    const xml = CAMToolLibraryEngine.exportLibrary(lib.id, "xml")!;
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml.includes('<ToolLibrary name="ExpXML">')).toBe(true);
    expect(xml.includes("<Tool ")).toBe(true);
  });

  it("returns undefined for unknown library id", () => {
    expect(
      CAMToolLibraryEngine.exportLibrary("LIB-MISSING-Z", "json"),
    ).toBe(undefined);
  });
});

describe("CAMToolLibraryEngine — adversarial inputs", () => {
  it("getTool returns undefined for empty id", () => {
    expect(CAMToolLibraryEngine.getTool("")).toBe(undefined);
  });

  it("searchTools with no filters returns all tools", () => {
    const all = CAMToolLibraryEngine.getAllTools();
    const search = CAMToolLibraryEngine.searchTools({});
    expect(search.length).toBe(all.length);
  });

  it("searchTools accepts both type AND material filters together", () => {
    const results = CAMToolLibraryEngine.searchTools({
      type: "end_mill",
      material: "carbide",
    });
    expect(
      results.every((t) => t.type === "end_mill" && t.material === "carbide"),
    ).toBe(true);
  });

  it("recommended params for material with no rule (e.g. brass) returns baseline values", () => {
    const lib = CAMToolLibraryEngine.createLibrary("recBrass");
    const t = CAMToolLibraryEngine.addToolToLibrary(lib.id, buildTool())!;
    const r = CAMToolLibraryEngine.getRecommendedParams(t.id, "brass")!;
    // No factor adjustment → rpm = recommendedRPM × 1.0
    expect(r.rpm).toBe(TEST_REC_RPM);
  });
});
