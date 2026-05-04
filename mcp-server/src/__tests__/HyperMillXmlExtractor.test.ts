/**
 * Tests for HyperMillXmlExtractor — CAM-EXHAUST-MS0
 *
 * Covers (real fs round-trips via os.tmpdir):
 *  - Class shape (Feature2JobExtractor, PostConfigExtractor, HyperMillXmlExtractor singletons)
 *  - parseFile happy path (catalog name, groups, mappings, items, variables)
 *  - Active vs _rem variable distinction
 *  - Self-closing definition tag handling
 *  - parseItem rejects when both ID and Type are missing
 *  - PostConfig parse: entries, comments, blank lines, trim semantics
 *  - discoverFiles only returns omFeature2JobCatalog*.xml files (sorted)
 *  - Failure modes (missing dir, missing file, malformed XML)
 *  - Adversarial inputs (empty file, mixed line endings, oversize content,
 *    quote variants, unicode content)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  Feature2JobExtractor,
  PostConfigExtractor,
  HyperMillXmlExtractor,
  feature2JobExtractor,
  postConfigExtractor,
  hyperMillXmlExtractor,
} from "../engines/HyperMillXmlExtractor.js";

// ============================================================================
// Named constants
// ============================================================================
const EXPECTED_GROUP_COUNT = 2;
const EXPECTED_MAPPING_COUNT = 3;
const EXPECTED_DRILL_ITEM_COUNT = 1;
const EXPECTED_ACTIVE_VAR_COUNT = 1;
const EXPECTED_REM_VAR_COUNT = 1;
const EXPECTED_POST_ENTRY_COUNT = 3;
const FOUND_FILE_COUNT = 2;
const OVERSIZE_MAPPING_COUNT = 1000;
const ORCH_TOTAL_MAPPINGS = 6; // 2 files × 3 mappings
const ORCH_TOTAL_ITEMS = 4;    // 2 files × 2 items

// Sample XML — well-formed, two groups, three mappings, items + variables
const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Feature2Job_Catalog Name="openmind">
  <Feature2Job_Group ID="2D" Name="Grp2D|2D-Cycles" />
  <Feature2Job_Group ID="DRILL" Name="GrpDrill|Drilling-Cycles" />
  <Feature2Job_Definition Feature_Type="Simple_Hole" Job_Group="DRILL" Job_Name="Dril|2D Drilling" Job_Type="DRIL" Feature_Catalog="openmind">
    <Feature2Job_Item ID="1" Name="GeoHole|Geometry of hole" Type="ContourAsPointWithDepth" Job_Parameter="Contour" Expression="Point=Position;Depth=Depth;Diameter=Diameter" Active="1" />
    <Feature2Job_Variable Name="FeatDiameter" Type="Real" Expression="Value=Diameter" />
    <Feature2Job_Variable_rem Name="DisabledVar" Type="Real" Expression="Value=Old" />
  </Feature2Job_Definition>
  <Feature2Job_Definition Feature_Type="Pocket" Job_Group="2D" Job_Name="Pkt|2D Pocket" Job_Type="PKT" />
  <Feature2Job_Definition Feature_Type="Slot_Closed" Job_Group="2D" Job_Name="Slot|2D Slot" Job_Type="SLT" Feature_Catalog="openmind">
    <Feature2Job_Item ID="TS_1" Name="ContourGeo|Slot Contour" Type="Curve" Job_Parameter="Contour" Expression="Curves=Curves" Active="0" />
  </Feature2Job_Definition>
</Feature2Job_Catalog>
`;

// Sample post config — three valid entries, comments, blank line
const SAMPLE_PPFC = `# This is a comment
# Another line of header
  *cwArcZ   702,helix or arc with z
  *spdRpm   703,spindle speed RPM

  *feedMM   704,feed mm/min
# trailing comment
`;

describe("HyperMillXmlExtractor", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hm-xml-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Class shape / singletons
  // ──────────────────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("Feature2JobExtractor singleton is constructed", () => {
      expect(feature2JobExtractor).toBeInstanceOf(Feature2JobExtractor);
    });

    it("PostConfigExtractor singleton is constructed", () => {
      expect(postConfigExtractor).toBeInstanceOf(PostConfigExtractor);
    });

    it("HyperMillXmlExtractor singleton is constructed", () => {
      expect(hyperMillXmlExtractor).toBeInstanceOf(HyperMillXmlExtractor);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Feature2JobExtractor.parseFile (no fs)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Feature2JobExtractor.parseFile", () => {
    it("captures catalog name, groups, mappings, items, and variables", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(SAMPLE_XML, "omFeature2JobCatalog.xml");
      expect(c.catalogName).toBe("openmind");
      expect(c.sourceFile).toBe("omFeature2JobCatalog.xml");
      expect(c.groups).toHaveLength(EXPECTED_GROUP_COUNT);
      expect(c.groups[0].id).toBe("2D");
      expect(c.groups[0].name).toBe("Grp2D|2D-Cycles");
      expect(c.groups[1].id).toBe("DRILL");
      expect(c.mappings).toHaveLength(EXPECTED_MAPPING_COUNT);
    });

    it("first definition has 1 item and 2 variables (active + rem)", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(SAMPLE_XML, "x.xml");
      const drill = c.mappings.find((m) => m.featureType === "Simple_Hole")!;
      expect(drill.items).toHaveLength(EXPECTED_DRILL_ITEM_COUNT);
      const item = drill.items[0];
      expect(item.id).toBe("1");
      expect(item.type).toBe("ContourAsPointWithDepth");
      expect(item.jobParameter).toBe("Contour");
      expect(item.expression).toMatch(/Point=Position/);
      expect(item.active).toBe(true);

      const activeVars = drill.variables.filter((v) => !v.isRem);
      const remVars = drill.variables.filter((v) => v.isRem);
      expect(activeVars).toHaveLength(EXPECTED_ACTIVE_VAR_COUNT);
      expect(remVars).toHaveLength(EXPECTED_REM_VAR_COUNT);
      expect(activeVars[0].name).toBe("FeatDiameter");
      expect(remVars[0].name).toBe("DisabledVar");
    });

    it("self-closing Definition tag becomes a mapping with no items", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(SAMPLE_XML, "x.xml");
      const pocket = c.mappings.find((m) => m.featureType === "Pocket")!;
      expect(pocket.items).toHaveLength(0);
      expect(pocket.variables).toHaveLength(0);
    });

    it("Active='0' produces active=false on the item", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(SAMPLE_XML, "x.xml");
      const slot = c.mappings.find((m) => m.featureType === "Slot_Closed")!;
      expect(slot.items[0].active).toBe(false);
    });

    it("Feature_Catalog defaults to empty string when absent", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(SAMPLE_XML, "x.xml");
      const pocket = c.mappings.find((m) => m.featureType === "Pocket")!;
      expect(pocket.featureCatalog).toBe("");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // parseItem / parseVariable
  // ──────────────────────────────────────────────────────────────────────────
  describe("parseItem / parseVariable", () => {
    let e: Feature2JobExtractor;
    beforeEach(() => {
      e = new Feature2JobExtractor(tmpRoot);
    });

    it("parseItem returns null when both ID and Type are missing", () => {
      const item = e.parseItem(`<Feature2Job_Item Name="orphan" />`);
      expect(item).toBe(null);
    });

    it("parseItem returns object when ID present but Type missing", () => {
      const item = e.parseItem(`<Feature2Job_Item ID="42" Name="x" />`)!;
      expect(item.id).toBe("42");
      expect(item.type).toBe("");
      expect(item.name).toBe("x");
    });

    it("parseVariable returns null when Name is missing", () => {
      const v = e.parseVariable(`<Feature2Job_Variable Type="Real" />`, false);
      expect(v).toBe(null);
    });

    it("parseVariable preserves isRem flag for _rem variant", () => {
      const v = e.parseVariable(
        `<Feature2Job_Variable_rem Name="z" Type="Real" Expression="Value=z" />`,
        true,
      )!;
      expect(v.isRem).toBe(true);
      expect(v.name).toBe("z");
      expect(v.expression).toBe("Value=z");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // discoverFiles + extractAll (real fs)
  // ──────────────────────────────────────────────────────────────────────────
  describe("discoverFiles + extractAll", () => {
    it("only returns omFeature2JobCatalog*.xml entries, sorted", async () => {
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog.xml"), SAMPLE_XML);
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog_5X.xml"), SAMPLE_XML);
      await fs.writeFile(path.join(tmpRoot, "otherFile.xml"), SAMPLE_XML);
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog.txt"), "text only");

      const e = new Feature2JobExtractor(tmpRoot);
      const files = await e.discoverFiles();
      expect(files).toHaveLength(FOUND_FILE_COUNT);
      for (const f of files) {
        expect(path.basename(f).startsWith("omFeature2JobCatalog")).toBe(true);
        expect(path.basename(f).endsWith(".xml")).toBe(true);
      }
      const sorted = [...files].sort();
      expect(files).toEqual(sorted);
    });

    it("extractAll parses all discovered files into catalogs[]", async () => {
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog.xml"), SAMPLE_XML);
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog_5X.xml"), SAMPLE_XML);
      const e = new Feature2JobExtractor(tmpRoot);
      const result = await e.extractAll();
      expect(result.catalogs).toHaveLength(FOUND_FILE_COUNT);
      expect(result.errors).toHaveLength(0);
      expect(result.catalogs[0].mappings.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PostConfigExtractor
  // ──────────────────────────────────────────────────────────────────────────
  describe("PostConfigExtractor", () => {
    it("parse() extracts all valid entries, ignoring comments and blank lines", () => {
      const e = new PostConfigExtractor(path.join(tmpRoot, "irrelevant.cfg"));
      const entries = e.parse(SAMPLE_PPFC);
      expect(entries).toHaveLength(EXPECTED_POST_ENTRY_COUNT);
      expect(entries[0].code).toBe("*cwArcZ");
      expect(entries[0].ncCode).toBe("702");
      expect(entries[0].description).toBe("helix or arc with z");
    });

    it("description is trimmed of trailing whitespace", () => {
      const e = new PostConfigExtractor(path.join(tmpRoot, "x.cfg"));
      const entries = e.parse("  *abc   100,  spaced description   \n");
      expect(entries).toHaveLength(1);
      expect(entries[0].description).toBe("spaced description");
    });

    it("extract() reads file and returns entries", async () => {
      const cfgPath = path.join(tmpRoot, "omPPFC.cfg");
      await fs.writeFile(cfgPath, SAMPLE_PPFC);
      const e = new PostConfigExtractor(cfgPath);
      const result = await e.extract();
      expect(result.entries).toHaveLength(EXPECTED_POST_ENTRY_COUNT);
      expect(result.errors).toHaveLength(0);
    });

    it("missing file returns empty entries + error message", async () => {
      const e = new PostConfigExtractor(path.join(tmpRoot, "nope-does-not-exist.cfg"));
      const result = await e.extract();
      expect(result.entries).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/cannot read/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Orchestrator end-to-end
  // ──────────────────────────────────────────────────────────────────────────
  describe("HyperMillXmlExtractor.extract (orchestrator)", () => {
    it("aggregates catalogs + post config + counts", async () => {
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog.xml"), SAMPLE_XML);
      await fs.writeFile(path.join(tmpRoot, "omFeature2JobCatalog_5X.xml"), SAMPLE_XML);
      const cfgPath = path.join(tmpRoot, "omPPFC.cfg");
      await fs.writeFile(cfgPath, SAMPLE_PPFC);

      const orch = new HyperMillXmlExtractor(tmpRoot, cfgPath);
      const result = await orch.extract();

      expect(result.totalCatalogs).toBe(FOUND_FILE_COUNT);
      expect(result.totalMappings).toBe(ORCH_TOTAL_MAPPINGS);
      expect(result.totalItems).toBe(ORCH_TOTAL_ITEMS);
      expect(result.postConfig).toHaveLength(EXPECTED_POST_ENTRY_COUNT);
      expect(result.errors).toHaveLength(0);
      expect(result.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Failure modes
  // ──────────────────────────────────────────────────────────────────────────
  describe("failure modes", () => {
    it("discoverFiles throws when directory does not exist", async () => {
      const e = new Feature2JobExtractor(path.join(tmpRoot, "nope"));
      await expect(e.discoverFiles()).rejects.toThrow(/cannot read directory/);
    });

    it("orchestrator surfaces failure when catalog dir is missing", async () => {
      const orch = new HyperMillXmlExtractor(
        path.join(tmpRoot, "nope-cat-dir"),
        path.join(tmpRoot, "nope.cfg"),
      );
      await expect(orch.extract()).rejects.toThrow();
    });

    it("malformed XML (no closing tag) still parses available content", () => {
      const broken = `<Feature2Job_Catalog Name="openmind">
  <Feature2Job_Group ID="2D" Name="g" />
  <Feature2Job_Definition Feature_Type="X" Job_Group="2D" Job_Name="X" Job_Type="X">
    <Feature2Job_Item ID="1" Type="T" />
`; // intentionally unclosed
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(broken, "broken.xml");
      expect(c.catalogName).toBe("openmind");
      expect(c.mappings).toHaveLength(1);
      expect(c.mappings[0].items).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Adversarial inputs
  // ──────────────────────────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("empty XML content yields empty catalog with default name 'unknown'", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile("", "empty.xml");
      expect(c.catalogName).toBe("unknown");
      expect(c.groups).toHaveLength(0);
      expect(c.mappings).toHaveLength(0);
    });

    it("Windows CRLF line endings parse identically to LF", () => {
      const e = new Feature2JobExtractor(tmpRoot);
      const crlf = SAMPLE_XML.replace(/\n/g, "\r\n");
      const a = e.parseFile(SAMPLE_XML, "lf.xml");
      const b = e.parseFile(crlf, "crlf.xml");
      expect(b.mappings).toHaveLength(a.mappings.length);
      expect(b.groups).toHaveLength(a.groups.length);
    });

    it("single-quoted attributes parse equivalently to double-quoted", () => {
      const single = `<Feature2Job_Catalog Name='openmind'>
  <Feature2Job_Group ID='2D' Name='g' />
</Feature2Job_Catalog>`;
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(single, "s.xml");
      expect(c.catalogName).toBe("openmind");
      expect(c.groups).toHaveLength(1);
    });

    it("post config with only comments returns no entries", () => {
      const e = new PostConfigExtractor(path.join(tmpRoot, "x.cfg"));
      expect(e.parse("# only\n# comments\n")).toHaveLength(0);
    });

    it("oversize XML (1000 mappings) parses without crashing", () => {
      const big: string[] = ["<Feature2Job_Catalog Name=\"openmind\">"];
      for (let i = 0; i < OVERSIZE_MAPPING_COUNT; i++) {
        big.push(
          `  <Feature2Job_Definition Feature_Type="F${i}" Job_Group="2D" Job_Name="N${i}" Job_Type="T${i}" />`,
        );
      }
      big.push("</Feature2Job_Catalog>");
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(big.join("\n"), "big.xml");
      expect(c.mappings).toHaveLength(OVERSIZE_MAPPING_COUNT);
    });

    it("unicode in attribute values is preserved", () => {
      const xml = `<Feature2Job_Catalog Name="openmind">
  <Feature2Job_Group ID="2D" Name="Tür|Pößket" />
</Feature2Job_Catalog>`;
      const e = new Feature2JobExtractor(tmpRoot);
      const c = e.parseFile(xml, "uni.xml");
      expect(c.groups[0].name).toBe("Tür|Pößket");
    });
  });
});

describe("HyperMillXmlExtractor — dispatcher wiring (camDispatcher.ts)", () => {
  const dispatcherPath = path.resolve(
    process.cwd(),
    "src/tools/dispatchers/camDispatcher.ts",
  );

  const XMLEXT_ACTIONS = [
    "cam_hypermill_xml_parse_feature2job",
    "cam_hypermill_xml_parse_post_config",
    "cam_hypermill_xml_extract_post_config",
    "cam_hypermill_xml_extract_all",
  ] as const;

  const ACTION_COUNT_EXPECTED = 4;

  it("registers all 4 cam_hypermill_xml_* enum entries", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    expect(XMLEXT_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of XMLEXT_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _hmXmlExtractor singleton", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    expect(src).toMatch(/_hmXmlExtractor\s*:\s*any/);
  });

  it("registers a hmXmlExtractor case in the lazy getter switch", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re =
      /case\s+"hmXmlExtractor"\s*:\s*return\s+_hmXmlExtractor\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/HyperMillXmlExtractor\.js"\s*\)\)\.hyperMillXmlExtractor/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    for (const action of XMLEXT_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("parse_feature2job case imports Feature2JobExtractor and calls parseFile", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_xml_parse_feature2job"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("Feature2JobExtractor");
    expect(body).toContain("parseFile");
    expect(body).toMatch(/params\.content\s*\?\?\s*params\.xml/);
    expect(body).toContain("mappingCount");
    expect(body).toContain("groupCount");
  });

  it("parse_post_config case imports PostConfigExtractor and calls parse (PURE, no I/O)", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_xml_parse_post_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("PostConfigExtractor");
    expect(body).toContain(".parse(");
    expect(body).toMatch(/params\.content\s*\?\?\s*params\.cfg/);
    expect(body).toContain("count");
  });

  it("extract_post_config case routes to PostConfigExtractor.extract with file_path override support", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_xml_extract_post_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("PostConfigExtractor");
    expect(body).toContain(".extract()");
    expect(body).toMatch(/params\.file_path\s*\?\?\s*params\.filePath/);
    expect(body).toContain("errors");
  });

  it("extract_all case uses singleton when no path overrides; instantiates fresh otherwise", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_xml_extract_all"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain('getEngine("hmXmlExtractor")');
    expect(body).toContain("HyperMillXmlExtractor");
    expect(body).toMatch(/params\.catalog_dir\s*\?\?\s*params\.catalogDir/);
    expect(body).toMatch(/params\.post_config_path\s*\?\?\s*params\.postConfigPath/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    for (const action of XMLEXT_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("imports Feature2JobExtractor and PostConfigExtractor as named exports (subclass usage)", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    expect(src).toMatch(/\{\s*Feature2JobExtractor\s*\}\s*=\s*await\s+import\(\s*"\.\.\/\.\.\/engines\/HyperMillXmlExtractor\.js"\s*\)/);
    expect(src).toMatch(/\{\s*PostConfigExtractor\s*\}\s*=\s*await\s+import\(\s*"\.\.\/\.\.\/engines\/HyperMillXmlExtractor\.js"\s*\)/);
  });
});
