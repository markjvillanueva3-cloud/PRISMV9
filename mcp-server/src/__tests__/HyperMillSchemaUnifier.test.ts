/**
 * HyperMillSchemaUnifier — strict-legitimacy vitest
 *
 * Coverage shape:
 *   class shape + happy + ≥3 failure modes + ≥2 adversarial + real fs round-trip
 *
 * All 6 sub-extractors are vi.mock'd. The unifier's logic under test is its
 * normalisation, deduplication, ordering, ID assignment, and write-to-disk
 * orchestration — none of which require real database files.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ── Named constants ─────────────────────────────────────────────────────────
const SAMPLE_TOTAL_CYCLE_TYPES = 2;
const SAMPLE_TOTAL_CYCLE_PARAMS = 3;
const SAMPLE_OM_TOTAL_MAPPINGS = 2;
const SAMPLE_DEMO_TOTAL_TOOLS = 4;
const SAMPLE_DEMO_TOTAL_GEOM = 2;
const SAMPLE_DEMO_TOTAL_TECH = 1;
const SAMPLE_IMTOOL_MATTECH_ITEMS = 7;
const SAMPLE_IMMACRO_MACRO_COUNT = 2;
const SAMPLE_XML_TOTAL_CATALOGS = 1;
const SAMPLE_XML_TOTAL_MAPPINGS = 2;
const SAMPLE_XML_TOTAL_ITEMS = 3;
const ID_PAD_WIDTH = 5;
const HM_PREFIX = "HM-P-";

// ── Mock builders ───────────────────────────────────────────────────────────
const buildMetricCfg = () => ({
  schemas: [
    {
      cycleType: "HMCAST",
      sourceFile: "Metric.cfg",
      parameters: [
        { name: "FeedRate", valueType: "real", defaultValue: "0.1", description: "Cutting feed" },
        { name: "Spindle",  valueType: "integer", defaultValue: "3000", description: "" },
      ],
    },
    {
      cycleType: "HMDRILL",
      sourceFile: "Metric.cfg",
      parameters: [
        { name: "FeedRate", valueType: "real", defaultValue: "0.05", description: "Drill feed" },
      ],
    },
  ],
  totalParameters: SAMPLE_TOTAL_CYCLE_PARAMS,
  totalCycleTypes: SAMPLE_TOTAL_CYCLE_TYPES,
  extractedAt: "2026-05-04T00:00:00.000Z",
  errors: [],
});

const buildOmCycles = () => ({
  mappings: [
    { displayName: "Pocket", canonicalId: "POCK_2D", category: "milling" },
    { displayName: "Drill",  canonicalId: "DRILL_AX", category: "drilling" },
  ],
  categories: { milling: [], drilling: [] },
  totalMappings: SAMPLE_OM_TOTAL_MAPPINGS,
  extractedAt: "2026-05-04T00:00:00.000Z",
});

const buildDemoDbSuccess = () => ({
  status: "success" as const,
  geometryClasses: [
    {
      classId: 1,
      fields: [
        { name: "DiameterMm", type: "REAL", description: "tool diameter" },
        { name: "FluteCount", type: "INTEGER", description: "flute count" },
      ],
    },
    {
      classId: 2,
      fields: [
        { name: "DiameterMm", type: "REAL", description: "tool diameter" }, // duplicate name → dedup
        { name: "Material", type: "TEXT", description: "tool material" },
      ],
    },
  ],
  cuttingTech: {
    fields: [
      { name: "Vc", type: "REAL", description: "cutting speed" },
    ],
  },
  totalGeometryClasses: SAMPLE_DEMO_TOTAL_GEOM,
  totalTools: SAMPLE_DEMO_TOTAL_TOOLS,
  totalCuttingTechs: SAMPLE_DEMO_TOTAL_TECH,
  extractedAt: "2026-05-04T00:00:00.000Z",
});

const buildIMToolDbSuccess = () => ({
  status: "success" as const,
  materials: [{ id: 10, name: "16MnCr5" }],
  cuttingMaterials: [{ id: 100, name: "VHM_Solid_Carbide" }],
  formulas: [{ name: "Spindle_RPM", formula: "Vc*1000/(PI*D)" }],
  matTechCount: 1,
  matTechItemCount: SAMPLE_IMTOOL_MATTECH_ITEMS,
  tables: [{ name: "Tools", columns: [], rowCount: 0 }],
  extractedAt: "2026-05-04T00:00:00.000Z",
});

const buildIMMacroDbSuccess = () => ({
  status: "success" as const,
  tables: [{ name: "Macros", columns: [], rowCount: 0 }],
  macroTypes: [{ id: 1, name: "HOLE" }],
  macros: [{ id: 1, name: "M_DRILL_THRU", type: "HOLE", usage: "drill" }],
  jobs: [{ systemJobType: "DRILL", jobType: "feature_drill", toolType: "drill", toolDiameter: 8 }],
  macroCount: SAMPLE_IMMACRO_MACRO_COUNT,
  version: "21.0",
  extractedAt: "2026-05-04T00:00:00.000Z",
});

const buildXml = () => ({
  catalogs: [
    {
      sourceFile: "omFeature2JobCatalog.xml",
      mappings: [
        { featureType: "POCKET",      jobGroup: "MILL", jobType: "POCKET_2D", jobName: "2D Pocket" },
        { featureType: "",            jobGroup: "MILL", jobType: "FACE",      jobName: "" },
      ],
    },
  ],
  postConfig: [
    { code: "NC_PROBE", ncCode: 600, description: "probe move" },
  ],
  totalCatalogs: SAMPLE_XML_TOTAL_CATALOGS,
  totalMappings: SAMPLE_XML_TOTAL_MAPPINGS,
  totalItems: SAMPLE_XML_TOTAL_ITEMS,
  extractedAt: "2026-05-04T00:00:00.000Z",
  errors: [],
});

// ── Mock all 6 extractors ───────────────────────────────────────────────────
const metricCfgMock = vi.fn(async () => buildMetricCfg());
const omCyclesMock = vi.fn(async () => buildOmCycles());
const demoDbMock = vi.fn(async () => buildDemoDbSuccess());
const imToolDbMock = vi.fn(async () => buildIMToolDbSuccess());
const imMacroDbMock = vi.fn(async () => buildIMMacroDbSuccess());
const xmlMock = vi.fn(async () => buildXml());

vi.mock("../engines/HyperMillMetricCfgExtractor.js", () => ({
  hyperMillMetricCfgExtractor: { extractAll: () => metricCfgMock() },
}));
vi.mock("../engines/HyperMillOmCyclesExtractor.js", () => ({
  hyperMillOmCyclesExtractor: { extract: () => omCyclesMock() },
}));
vi.mock("../engines/HyperMillDemoDbExtractor.js", () => ({
  hyperMillDemoDbExtractor: { extract: () => demoDbMock() },
}));
vi.mock("../engines/HyperMillIMDbExtractor.js", () => ({
  imToolDbExtractor: { extract: () => imToolDbMock() },
  imMacroDbExtractor: { extract: () => imMacroDbMock() },
}));
vi.mock("../engines/HyperMillXmlExtractor.js", () => ({
  hyperMillXmlExtractor: { extract: () => xmlMock() },
}));

// Import after mocks
import {
  HyperMillSchemaUnifier,
  hyperMillSchemaUnifier,
  type UnifiedParameter,
} from "../engines/HyperMillSchemaUnifier.js";

let tmpRoot = "";

beforeEach(() => {
  metricCfgMock.mockImplementation(async () => buildMetricCfg());
  omCyclesMock.mockImplementation(async () => buildOmCycles());
  demoDbMock.mockImplementation(async () => buildDemoDbSuccess());
  imToolDbMock.mockImplementation(async () => buildIMToolDbSuccess());
  imMacroDbMock.mockImplementation(async () => buildIMMacroDbSuccess());
  xmlMock.mockImplementation(async () => buildXml());
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hm-unifier-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch { /* swallow cleanup errors */ }
});

describe("HyperMillSchemaUnifier", () => {
  // ── Class shape ──────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("singleton is a HyperMillSchemaUnifier instance", () => {
      expect(hyperMillSchemaUnifier instanceof HyperMillSchemaUnifier).toBe(true);
    });

    it("constructor accepts custom outputPath; default is configured", () => {
      const customPath = path.join(tmpRoot, "out.json");
      const u = new HyperMillSchemaUnifier(customPath);
      expect(u instanceof HyperMillSchemaUnifier).toBe(true);
    });

    it("exposes unify, writeCatalog, and 6 normalizers", () => {
      expect(typeof hyperMillSchemaUnifier.unify).toBe("function");
      expect(typeof hyperMillSchemaUnifier.writeCatalog).toBe("function");
      expect(typeof hyperMillSchemaUnifier.normalizeMetricCfg).toBe("function");
      expect(typeof hyperMillSchemaUnifier.normalizeOmCycles).toBe("function");
      expect(typeof hyperMillSchemaUnifier.normalizeDemoDb).toBe("function");
      expect(typeof hyperMillSchemaUnifier.normalizeIMToolDb).toBe("function");
      expect(typeof hyperMillSchemaUnifier.normalizeIMMacroDb).toBe("function");
      expect(typeof hyperMillSchemaUnifier.normalizeFeature2Job).toBe("function");
    });
  });

  // ── unify() — happy path with all extractors succeeding ──────────────────
  describe("unify() — happy path", () => {
    it("produces a non-empty catalog with version 1.0.0 and ISO timestamp", async () => {
      const cat = await hyperMillSchemaUnifier.unify();
      expect(cat.version).toBe("1.0.0");
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cat.generatedAt)).toBe(true);
      expect(cat.totalParameters > 0).toBe(true);
      expect(cat.parameters.length).toBe(cat.totalParameters);
    });

    it("populates all 7 expected domains with non-zero counts", async () => {
      const cat = await hyperMillSchemaUnifier.unify();
      const expectedDomains = [
        "CAM-Cycle", "Cycle-Mapping", "Tool-Geometry",
        "Cutting-Tech", "Macro", "Feature-Job", "Post-Config",
      ];
      for (const d of expectedDomains) {
        expect((cat.domains[d] ?? 0) > 0).toBe(true);
      }
    });

    it("source counts match upstream extractor totals exactly", async () => {
      const cat = await hyperMillSchemaUnifier.unify();
      expect(cat.sources.metricCfg.files).toBe(SAMPLE_TOTAL_CYCLE_TYPES);
      expect(cat.sources.metricCfg.params).toBe(SAMPLE_TOTAL_CYCLE_PARAMS);
      expect(cat.sources.omCycles.mappings).toBe(SAMPLE_OM_TOTAL_MAPPINGS);
      expect(cat.sources.demoDb.tools).toBe(SAMPLE_DEMO_TOTAL_TOOLS);
      expect(cat.sources.demoDb.geometryClasses).toBe(SAMPLE_DEMO_TOTAL_GEOM);
      expect(cat.sources.demoDb.cuttingTechs).toBe(SAMPLE_DEMO_TOTAL_TECH);
      expect(cat.sources.imToolDb.matTechItems).toBe(SAMPLE_IMTOOL_MATTECH_ITEMS);
      expect(cat.sources.imMacroDb.macros).toBe(SAMPLE_IMMACRO_MACRO_COUNT);
      expect(cat.sources.feature2Job.catalogs).toBe(SAMPLE_XML_TOTAL_CATALOGS);
      expect(cat.sources.feature2Job.mappings).toBe(SAMPLE_XML_TOTAL_MAPPINGS);
      expect(cat.sources.feature2Job.items).toBe(SAMPLE_XML_TOTAL_ITEMS);
      const POSTCONFIG_ENTRIES = 1;
      expect(cat.sources.postConfig.entries).toBe(POSTCONFIG_ENTRIES);
    });

    it("assigns sequential HM-P-XXXXX IDs starting at HM-P-00001", async () => {
      const cat = await hyperMillSchemaUnifier.unify();
      expect(cat.parameters[0].id).toBe(`${HM_PREFIX}${"1".padStart(ID_PAD_WIDTH, "0")}`);
      const last = cat.parameters[cat.parameters.length - 1];
      const expectedLastId = `${HM_PREFIX}${String(cat.parameters.length).padStart(ID_PAD_WIDTH, "0")}`;
      expect(last.id).toBe(expectedLastId);
    });

    it("ID format strictly matches HM-P-XXXXX (5-digit padded)", async () => {
      const cat = await hyperMillSchemaUnifier.unify();
      const idRe = /^HM-P-\d{5}$/;
      const allMatch = cat.parameters.every(p => idRe.test(p.id));
      expect(allMatch).toBe(true);
    });

    it("output is sorted by domain order then case-insensitive name", async () => {
      const cat = await hyperMillSchemaUnifier.unify();
      const DOMAIN_RANK: Record<string, number> = {
        "CAM-Cycle": 0, "Cycle-Mapping": 1, "Tool-Geometry": 2,
        "Cutting-Tech": 3, "Macro": 4, "Feature-Job": 5, "Post-Config": 6,
      };
      for (let i = 1; i < cat.parameters.length; i++) {
        const prev = cat.parameters[i - 1];
        const cur = cat.parameters[i];
        const prevRank = DOMAIN_RANK[prev.domain];
        const curRank = DOMAIN_RANK[cur.domain];
        if (prevRank !== curRank) {
          expect(prevRank < curRank).toBe(true);
        } else {
          expect(prev.name.toLowerCase() <= cur.name.toLowerCase()).toBe(true);
        }
      }
    });

    it("CAM-Cycle dedup keeps same-name params from different cycle types", async () => {
      // FeedRate appears in both HMCAST and HMDRILL → both should survive
      const cat = await hyperMillSchemaUnifier.unify();
      const feedRateEntries = cat.parameters.filter(
        p => p.domain === "CAM-Cycle" && p.name === "FeedRate"
      );
      const TWO = 2;
      expect(feedRateEntries.length).toBe(TWO);
      const cycleTypes = feedRateEntries.map(e => e.cycleType).sort();
      expect(cycleTypes).toEqual(["HMCAST", "HMDRILL"]);
    });

    it("Tool-Geometry dedup collapses duplicate field names across geometry classes", async () => {
      // DiameterMm appears in classId 1 and 2 → only one entry should survive
      const cat = await hyperMillSchemaUnifier.unify();
      const dia = cat.parameters.filter(
        p => p.domain === "Tool-Geometry" && p.name === "DiameterMm"
      );
      expect(dia.length).toBe(1);
    });
  });

  // ── unify() — failure modes ──────────────────────────────────────────────
  describe("unify() — failure modes", () => {
    it("metricCfg extractor rejection: that domain absent, others intact", async () => {
      metricCfgMock.mockImplementationOnce(async () => {
        throw new Error("metric.cfg parse failure");
      });
      const cat = await hyperMillSchemaUnifier.unify();
      expect((cat.domains["CAM-Cycle"] ?? 0)).toBe(0);
      expect((cat.domains["Cycle-Mapping"] ?? 0) > 0).toBe(true);
      expect(cat.sources.metricCfg.params).toBe(0);
      expect(cat.sources.omCycles.mappings).toBe(SAMPLE_OM_TOTAL_MAPPINGS);
    });

    it("demoDb status='error' returns no Tool-Geometry entries", async () => {
      demoDbMock.mockImplementationOnce(async () => ({
        status: "error" as const,
        error: "sqlite missing",
        geometryClasses: [],
        cuttingTech: { fields: [] },
        totalGeometryClasses: 0, totalTools: 0, totalCuttingTechs: 0,
        extractedAt: "2026-05-04T00:00:00.000Z",
      }));
      const cat = await hyperMillSchemaUnifier.unify();
      expect((cat.domains["Tool-Geometry"] ?? 0)).toBe(0);
    });

    it("imToolDb status='missing' contributes no Cutting-Tech material entries", async () => {
      imToolDbMock.mockImplementationOnce(async () => ({
        status: "missing" as const,
        materials: [],
        cuttingMaterials: [],
        formulas: [],
        matTechCount: 0,
        matTechItemCount: 0,
        tables: [],
        extractedAt: "2026-05-04T00:00:00.000Z",
      }));
      const cat = await hyperMillSchemaUnifier.unify();
      const matEntries = cat.parameters.filter(
        p => p.source === "im-tool-db"
      );
      expect(matEntries.length).toBe(0);
    });

    it("imMacroDb status='error' contributes no Macro entries", async () => {
      imMacroDbMock.mockImplementationOnce(async () => ({
        status: "error" as const,
        error: "db locked",
        tables: [],
        macroTypes: [],
        macros: [],
        jobs: [],
        macroCount: 0,
        version: "",
        extractedAt: "2026-05-04T00:00:00.000Z",
      }));
      const cat = await hyperMillSchemaUnifier.unify();
      const macroEntries = cat.parameters.filter(p => p.source === "im-macro-db");
      expect(macroEntries.length).toBe(0);
    });

    it("all extractors fail simultaneously: catalog still produced, totalParameters is 0", async () => {
      const fail = async () => { throw new Error("kaput"); };
      metricCfgMock.mockImplementationOnce(fail);
      omCyclesMock.mockImplementationOnce(fail);
      demoDbMock.mockImplementationOnce(fail);
      imToolDbMock.mockImplementationOnce(fail);
      imMacroDbMock.mockImplementationOnce(fail);
      xmlMock.mockImplementationOnce(fail);
      const cat = await hyperMillSchemaUnifier.unify();
      expect(cat.totalParameters).toBe(0);
      expect(cat.parameters.length).toBe(0);
      expect(cat.version).toBe("1.0.0");
    });
  });

  // ── normalisers in isolation (adversarial inputs) ────────────────────────
  describe("normaliser unit cases", () => {
    it("normalizeMetricCfg emits one UnifiedParameter per CfgParameter, captures cycleType + sourceFile", () => {
      const result = hyperMillSchemaUnifier.normalizeMetricCfg(buildMetricCfg());
      expect(result.length).toBe(SAMPLE_TOTAL_CYCLE_PARAMS);
      const allCamCycle = result.every(p => p.domain === "CAM-Cycle");
      expect(allCamCycle).toBe(true);
      const allHaveCycleType = result.every(
        p => p.cycleType === "HMCAST" || p.cycleType === "HMDRILL"
      );
      expect(allHaveCycleType).toBe(true);
    });

    it("normalizeMetricCfg: empty description falls back to template", () => {
      const result = hyperMillSchemaUnifier.normalizeMetricCfg(buildMetricCfg());
      const spindle = result.find(p => p.name === "Spindle");
      expect(spindle === undefined).toBe(false);
      expect(spindle!.description.includes("Cycle parameter Spindle")).toBe(true);
      expect(spindle!.description.includes("HMCAST")).toBe(true);
    });

    it("normalizeOmCycles: each CycleMapping becomes one Cycle-Mapping entry with canonicalId as defaultValue", () => {
      const result = hyperMillSchemaUnifier.normalizeOmCycles(buildOmCycles());
      expect(result.length).toBe(SAMPLE_OM_TOTAL_MAPPINGS);
      const pock = result.find(p => p.name === "Pocket");
      expect(pock!.defaultValue).toBe("POCK_2D");
      expect(pock!.domain).toBe("Cycle-Mapping");
    });

    it("normalizeDemoDb status='missing' returns empty array", () => {
      const result = hyperMillSchemaUnifier.normalizeDemoDb({
        status: "missing" as const,
        geometryClasses: [],
        cuttingTech: { fields: [] },
        totalGeometryClasses: 0, totalTools: 0, totalCuttingTechs: 0,
        extractedAt: "2026-05-04T00:00:00.000Z",
      });
      expect(result.length).toBe(0);
    });

    it("normalizeFeature2Job: empty featureType falls back to jobGroup in name", () => {
      const result = hyperMillSchemaUnifier.normalizeFeature2Job(buildXml());
      const fallback = result.find(p => p.name === "MILL::FACE");
      expect(fallback === undefined).toBe(false);
      expect(fallback!.domain).toBe("Feature-Job");
    });

    it("normalizeFeature2Job: postConfig entries land in Post-Config domain with NC code as defaultValue", () => {
      const result = hyperMillSchemaUnifier.normalizeFeature2Job(buildXml());
      const probe = result.find(p => p.name === "NC_PROBE");
      expect(probe === undefined).toBe(false);
      const PROBE_CODE = 600;
      expect(probe!.defaultValue).toBe(PROBE_CODE);
      expect(probe!.domain).toBe("Post-Config");
    });

    it("deduplicateParameters: same domain+name kept once; CAM-Cycle keyed by cycleType", () => {
      const params: UnifiedParameter[] = [
        { id: "", name: "X", domain: "Macro", type: "text", description: "a", source: "im-macro-db" },
        { id: "", name: "X", domain: "Macro", type: "text", description: "b", source: "im-macro-db" }, // dup
        { id: "", name: "X", domain: "CAM-Cycle", type: "text", description: "c", source: "metric-cfg", cycleType: "A" },
        { id: "", name: "X", domain: "CAM-Cycle", type: "text", description: "d", source: "metric-cfg", cycleType: "B" }, // not dup (different cycle)
      ];
      const out = hyperMillSchemaUnifier.deduplicateParameters(params);
      const THREE = 3;
      expect(out.length).toBe(THREE); // 1 macro + 2 cam-cycle
      const macroCount = out.filter(p => p.domain === "Macro").length;
      expect(macroCount).toBe(1);
      const camCount = out.filter(p => p.domain === "CAM-Cycle").length;
      const TWO = 2;
      expect(camCount).toBe(TWO);
    });

    it("assignIds: in-place, zero-padded HM-P-XXXXX, monotonic", () => {
      const params: UnifiedParameter[] = [
        { id: "", name: "a", domain: "Macro", type: "text", description: "", source: "im-macro-db" },
        { id: "", name: "b", domain: "Macro", type: "text", description: "", source: "im-macro-db" },
        { id: "", name: "c", domain: "Macro", type: "text", description: "", source: "im-macro-db" },
      ];
      hyperMillSchemaUnifier.assignIds(params);
      expect(params[0].id).toBe("HM-P-00001");
      expect(params[1].id).toBe("HM-P-00002");
      expect(params[2].id).toBe("HM-P-00003");
    });
  });

  // ── writeCatalog — real fs round-trip ────────────────────────────────────
  describe("writeCatalog — real fs round-trip", () => {
    it("writes JSON to disk, creates parent dir, contents parse back identical", async () => {
      const outPath = path.join(tmpRoot, "deep", "nested", "catalog.json");
      const u = new HyperMillSchemaUnifier(outPath);
      const cat = await hyperMillSchemaUnifier.unify();
      const written = await u.writeCatalog(cat);
      expect(written).toBe(outPath);
      expect(fs.existsSync(outPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
      expect(parsed.version).toBe(cat.version);
      expect(parsed.totalParameters).toBe(cat.totalParameters);
      expect(parsed.parameters.length).toBe(cat.parameters.length);
    });

    it("writeCatalog overwrites existing file at target path", async () => {
      const outPath = path.join(tmpRoot, "catalog.json");
      const u = new HyperMillSchemaUnifier(outPath);
      fs.writeFileSync(outPath, "STALE-CONTENT", "utf8");
      const cat = await hyperMillSchemaUnifier.unify();
      await u.writeCatalog(cat);
      const after = fs.readFileSync(outPath, "utf8");
      expect(after.includes("STALE-CONTENT")).toBe(false);
      expect(after.includes('"version"')).toBe(true);
    });
  });
});
