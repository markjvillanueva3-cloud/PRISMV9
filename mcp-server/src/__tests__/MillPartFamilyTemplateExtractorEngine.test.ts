/**
 * MillPartFamilyTemplateExtractorEngine.test.ts
 *
 * Reference-value tests for TRAINING-LEARNING-MS0/U2 (Mill template extractor).
 * Every assertion checks a specific value — no presence-only / toBeDefined /
 * toBeTruthy / toBeFalsy / toBeUndefined patterns (mirrors lathe sibling).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  MillPartFamilyTemplateExtractorEngine,
  millPartFamilyTemplateExtractorEngine,
  MILL_TEMPLATE_FAMILIES,
  defaultMillSnapshotPath,
  defaultMillTemplateDir,
  type MillCorpusSnapshot,
  type MillTrainingTemplate,
} from "../engines/MillPartFamilyTemplateExtractorEngine.js";

function fixtureSnapshot(overrides: Partial<MillCorpusSnapshot> = {}): MillCorpusSnapshot {
  return {
    schemaVersion: 1,
    generated_at: "2026-05-13T15:00:00.000Z",
    corpus_root_hint: "H:/PRISM/JM DIE/CNC MILL",
    source_index: "H:/PRISM/Docustrata/.index/jm-die-index-v2.json",
    total_mill_entries: 1000,
    total_classified_entries: 920,
    classification_coverage: 0.92,
    families: {
      "plate": {
        count: 250,
        customers: { ITW: 120, ALCOA: 75, OPTIMAS: 35, SFS: 20 },
        ext_breakdown: { ".nc": 120, ".mcam": 80, ".ipt": 50 },
        kind_breakdown: { g_code: 200, cam_project: 50 },
        sample_paths: [
          "H:/PRISM/JM DIE/CNC MILL/ITW/PLATE-001.nc",
          "H:/PRISM/JM DIE/CNC MILL/ALCOA/PLATE-77.nc",
          "H:/PRISM/JM DIE/CNC MILL/SFS/PLATE-AL.mcam",
        ],
      },
      "bracket-housing": {
        count: 180,
        customers: { ITW: 90, ALCOA: 60, OPTIMAS: 30 },
        ext_breakdown: { ".nc": 100, ".mcam": 70, ".ipt": 10 },
        kind_breakdown: { g_code: 150, cam_project: 30 },
        sample_paths: [
          "H:/PRISM/JM DIE/CNC MILL/ITW/BRACKET-001.nc",
          "H:/PRISM/JM DIE/CNC MILL/ALCOA/HOUSING-12.nc",
        ],
      },
      "taptite-mill": {
        count: 75,
        customers: { ITW: 50, HOLO_KROME: 25 },
        ext_breakdown: { ".nc": 70, ".mcam": 5 },
        kind_breakdown: { g_code: 75 },
        sample_paths: ["H:/PRISM/JM DIE/CNC MILL/ITW/TAPTITE-mill-22.nc"],
      },
      "electrode-mill": {
        count: 100,
        customers: { ITW: 60, ALCOA: 40 },
        ext_breakdown: { ".nc": 95, ".mcam": 5 },
        kind_breakdown: { g_code: 100 },
        sample_paths: ["H:/PRISM/JM DIE/CNC MILL/ITW/ELECTRODE-mill-7.nc"],
      },
      "unknown": {
        count: 80,
        customers: { ITW: 50, ALCOA: 30 },
        ext_breakdown: { ".nc": 80 },
        kind_breakdown: { g_code: 80 },
        sample_paths: ["H:/PRISM/JM DIE/CNC MILL/MISC/uncategorized.nc"],
      },
    },
    historical_sf_disclaimer:
      "Historical S/F values are DATA, NOT GROUND TRUTH (feedback_box_programs_amateur).",
    warnings: [],
    ...overrides,
  };
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mill-tpl-test-"));
}

let tempDir = "";
beforeEach(() => {
  tempDir = makeTempDir();
});
afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("Mill template family taxonomy", async () => {
  it("exposes exactly 8 family names with the spec list", async () => {
    expect(MILL_TEMPLATE_FAMILIES).toEqual([
      "taptite-mill",
      "electrode-mill",
      "plate",
      "bracket-housing",
      "mold-die-insert",
      "aerospace-bracket",
      "sheet-metal-fixture",
      "unknown",
    ]);
  });

  it("does NOT include lathe-only families (no cross-domain bleed)", async () => {
    const latheOnly = ["wafer-insert", "casing", "top-hat-casing", "shaft", "flange", "tube"];
    for (const f of latheOnly) {
      expect((MILL_TEMPLATE_FAMILIES as ReadonlyArray<string>).includes(f)).toBe(false);
    }
  });
});

describe("catalogCorpus", async () => {
  it("returns per-family counts + coverage from in-memory snapshot", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = eng.catalogCorpus({ snapshot: snap });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.total_mill_entries).toBe(1000);
    expect(result.total_classified_entries).toBe(920);
    expect(result.classification_coverage).toBeCloseTo(0.92, 3);
    expect(result.families).toHaveLength(5);
    const plate = result.families.find((f) => f.family === "plate");
    expect(plate?.count).toBe(250);
    expect(plate?.top_customers[0]).toEqual({ customer: "ITW", count: 120 });
    expect(result.source_index).toBe("H:/PRISM/Docustrata/.index/jm-die-index-v2.json");
    expect(result.snapshot_generated_at).toBe("2026-05-13T15:00:00.000Z");
  });

  it("loads snapshot from disk when only a path is provided", async () => {
    const snap = fixtureSnapshot();
    const file = path.join(tempDir, "_corpus-scan.json");
    fs.writeFileSync(file, JSON.stringify(snap), "utf8");
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.catalogCorpus({ snapshotPath: file });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.total_mill_entries).toBe(1000);
    expect(result.classification_coverage).toBeCloseTo(0.92, 3);
  });

  it("returns snapshot_not_found when path is missing", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.catalogCorpus({ snapshotPath: path.join(tempDir, "nope.json") });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("snapshot_not_found");
  });

  it("returns snapshot_malformed_json on unparseable input", async () => {
    const file = path.join(tempDir, "bad.json");
    fs.writeFileSync(file, "{not json", "utf8");
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.catalogCorpus({ snapshotPath: file });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("snapshot_malformed_json");
  });

  it("returns snapshot_missing_families when families field is absent", async () => {
    const file = path.join(tempDir, "noFam.json");
    fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1 }), "utf8");
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.catalogCorpus({ snapshotPath: file });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("snapshot_missing_families");
  });

  it("returns snapshot_wrong_schema when schemaVersion is non-numeric", async () => {
    const file = path.join(tempDir, "wrong.json");
    fs.writeFileSync(file, JSON.stringify({ families: {}, schemaVersion: "1" }), "utf8");
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.catalogCorpus({ snapshotPath: file });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("snapshot_wrong_schema");
  });
});

describe("extractTemplate", async () => {
  it("happy path: extracts `plate` family with reference values + writes file", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = await eng.extractTemplate("plate", { snapshot: snap, outDir: tempDir });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const t = result.template;
    expect(t.family).toBe("plate");
    expect(t.controller_baseline).toBe(null);
    expect(t.run_count).toBe(250);
    expect(t.representative_parts).toHaveLength(3);
    expect(t.customers_top[0]).toEqual({ customer: "ITW", count: 120 });
    expect(t.ext_breakdown[".nc"]).toBe(120);
    expect(t.kind_breakdown.g_code).toBe(200);
    expect(t.variability.cycle_time_sec).toBe(null);
    expect(t.variability.dim_cpk).toBe(null);
    expect(t.variability.tool_life_min).toBe(null);
    expect(t.sx_score_distribution).toBe(null);
    expect(t.classification_coverage_at_extract).toBeCloseTo(0.92, 3);
    expect(t.historical_sf_note).toContain("DATA, NOT GROUND TRUTH");
    expect(result.written_to).toBe(path.join(tempDir, "plate.json"));
    expect(fs.existsSync(result.written_to as string)).toBe(true);
  });

  it("dry-run does NOT write a file (written_to=null, file absent)", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = await eng.extractTemplate("plate", { snapshot: snap, outDir: tempDir, dryRun: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.written_to).toBe(null);
    expect(fs.existsSync(path.join(tempDir, "plate.json"))).toBe(false);
  });

  it("written file is valid JSON with the expected schemaVersion and matches the in-memory template", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = await eng.extractTemplate("bracket-housing", { snapshot: snap, outDir: tempDir });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const raw = fs.readFileSync(result.written_to as string, "utf8");
    const parsed = JSON.parse(raw) as MillTrainingTemplate;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.family).toBe("bracket-housing");
    expect(parsed.run_count).toBe(180);
    expect(parsed.controller_baseline).toBe(null);
    expect(parsed.customers_top[0]).toEqual({ customer: "ITW", count: 90 });
  });

  it("NEGATIVE: unknown family returns ok:false / error:'unknown_family'", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = await eng.extractTemplate("not-a-real-family", { snapshot: snap, outDir: tempDir });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("unknown_family");
    expect(result.family).toBe("not-a-real-family");
  });

  it("NEGATIVE: family-not-in-snapshot returns ok:false / error:'family_not_in_snapshot'", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = await eng.extractTemplate("mold-die-insert", { snapshot: snap, outDir: tempDir });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("family_not_in_snapshot");
    expect(result.family).toBe("mold-die-insert");
  });

  it("NEGATIVE: missing snapshot path propagates error code as 'snapshot_not_found'", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = await eng.extractTemplate("plate", {
      snapshotPath: path.join(tempDir, "nope.json"),
      outDir: tempDir,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("snapshot_not_found");
  });

  it("ADVERSARIAL: prototype-pollution payload in snapshot does NOT mutate Object.prototype", async () => {
    const file = path.join(tempDir, "evil.json");
    const evil = {
      schemaVersion: 1,
      families: {
        plate: {
          count: 1,
          customers: {},
          ext_breakdown: {},
          kind_breakdown: {},
          sample_paths: [],
        },
      },
    };
    const rawJson = JSON.stringify(evil).replace(
      '"schemaVersion":1',
      '"schemaVersion":1,"__proto__":{"polluted":"yes"}'
    );
    fs.writeFileSync(file, rawJson, "utf8");
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = await eng.extractTemplate("plate", { snapshotPath: file, outDir: tempDir });
    expect(result.ok).toBe(true);
    const polluted = ({} as Record<string, unknown>).polluted;
    expect(polluted).toBe(undefined);
  });

  it("ADVERSARIAL: extreme negative count is preserved verbatim in run_count", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const weird = fixtureSnapshot({
      families: {
        plate: {
          count: -42,
          customers: {},
          ext_breakdown: {},
          kind_breakdown: {},
          sample_paths: [],
        },
      },
    });
    const result = await eng.extractTemplate("plate", { snapshot: weird, outDir: tempDir });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.template.run_count).toBe(-42);
  });
});

describe("extractAllTemplates", async () => {
  it("extracts every family in the snapshot + 0 skipped for valid taxonomy", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot();
    const result = await eng.extractAllTemplates({ snapshot: snap, outDir: tempDir });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.extracted).toHaveLength(5);
    expect(result.skipped).toHaveLength(0);
    for (const e of result.extracted) {
      expect(fs.existsSync(e.written_to as string)).toBe(true);
    }
  });

  it("skips families whose name is not in the mill taxonomy + extracts the valid ones", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const snap = fixtureSnapshot({
      families: {
        plate: { count: 1, customers: {}, ext_breakdown: {}, kind_breakdown: {}, sample_paths: [] },
        "bogus-family-not-allowed": {
          count: 1,
          customers: {},
          ext_breakdown: {},
          kind_breakdown: {},
          sample_paths: [],
        },
      },
    });
    const result = await eng.extractAllTemplates({ snapshot: snap, outDir: tempDir });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.extracted.map((e) => e.family)).toEqual(["plate"]);
    expect(result.skipped[0].family).toBe("bogus-family-not-allowed");
    expect(result.skipped[0].reason).toBe("unknown_family");
  });
});

describe("listTemplates + getTemplate", async () => {
  it("returns empty list when outDir is missing", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.listTemplates({ outDir: path.join(tempDir, "absent") });
    expect(result.ok).toBe(true);
    expect(result.templates).toHaveLength(0);
  });

  it("lists templates after extractAll + sorts alphabetically by family", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    await eng.extractAllTemplates({ snapshot: fixtureSnapshot(), outDir: tempDir });
    const result = eng.listTemplates({ outDir: tempDir });
    expect(result.ok).toBe(true);
    expect(result.templates).toHaveLength(5);
    expect(result.templates.map((t) => t.family)).toEqual([
      "bracket-housing",
      "electrode-mill",
      "plate",
      "taptite-mill",
      "unknown",
    ]);
  });

  it("ignores files starting with `_` (corpus-scan snapshot lives there)", async () => {
    fs.writeFileSync(path.join(tempDir, "_corpus-scan.json"), "{}", "utf8");
    fs.writeFileSync(
      path.join(tempDir, "plate.json"),
      JSON.stringify({ schemaVersion: 1, family: "plate" }),
      "utf8"
    );
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.listTemplates({ outDir: tempDir });
    expect(result.ok).toBe(true);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].family).toBe("plate");
  });

  it("ignores files that don't match a valid mill family name", async () => {
    fs.writeFileSync(
      path.join(tempDir, "lathe-only-family.json"),
      JSON.stringify({ schemaVersion: 1 }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(tempDir, "plate.json"),
      JSON.stringify({ schemaVersion: 1, family: "plate" }),
      "utf8"
    );
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const result = eng.listTemplates({ outDir: tempDir });
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].family).toBe("plate");
  });

  it("getTemplate returns null for missing family file", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const got = eng.getTemplate("plate", { outDir: tempDir });
    expect(got).toBe(null);
  });

  it("getTemplate round-trips an extracted template (write → read → compare run_count)", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    await eng.extractTemplate("plate", { snapshot: fixtureSnapshot(), outDir: tempDir });
    const loaded = eng.getTemplate("plate", { outDir: tempDir });
    expect(loaded?.family).toBe("plate");
    expect(loaded?.run_count).toBe(250);
    expect(loaded?.controller_baseline).toBe(null);
  });

  it("getTemplate returns null for invalid family name", async () => {
    const eng = new MillPartFamilyTemplateExtractorEngine();
    const got = eng.getTemplate("definitely-not-a-family", { outDir: tempDir });
    expect(got).toBe(null);
  });
});

describe("Default paths", async () => {
  it("defaultMillSnapshotPath respects PRISM_MILL_CORPUS_SNAPSHOT override", async () => {
    const override = "C:/tmp/some/path/snap.json";
    const prev = process.env.PRISM_MILL_CORPUS_SNAPSHOT;
    process.env.PRISM_MILL_CORPUS_SNAPSHOT = override;
    try {
      expect(defaultMillSnapshotPath()).toBe(override);
    } finally {
      if (prev === undefined) delete process.env.PRISM_MILL_CORPUS_SNAPSHOT;
      else process.env.PRISM_MILL_CORPUS_SNAPSHOT = prev;
    }
  });

  it("defaultMillTemplateDir respects PRISM_MILL_TEMPLATE_DIR override", async () => {
    const override = "C:/tmp/some/path/dir";
    const prev = process.env.PRISM_MILL_TEMPLATE_DIR;
    process.env.PRISM_MILL_TEMPLATE_DIR = override;
    try {
      expect(defaultMillTemplateDir()).toBe(override);
    } finally {
      if (prev === undefined) delete process.env.PRISM_MILL_TEMPLATE_DIR;
      else process.env.PRISM_MILL_TEMPLATE_DIR = prev;
    }
  });
});

describe("Engine singleton export", async () => {
  it("singleton catalogCorpus returns ok:true with expected total on a fixture", async () => {
    const result = millPartFamilyTemplateExtractorEngine.catalogCorpus({
      snapshot: fixtureSnapshot(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.total_mill_entries).toBe(1000);
  });

  it("singleton is a constructed MillPartFamilyTemplateExtractorEngine", async () => {
    expect(millPartFamilyTemplateExtractorEngine.constructor.name).toBe(
      "MillPartFamilyTemplateExtractorEngine"
    );
  });
});
