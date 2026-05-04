/**
 * HyperMillACStandardToolDBEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-AC-PPP-TESTS-01
 *
 * Coverage:
 *   1. Class shape + singleton
 *   2. extractACStandardToolDB with non-existent path → status=success, BUILTIN catalog (8 tools), INFO error
 *   3. BUILTIN tool_id identity (8 canonical IDs)
 *   4. AC_EM_001 endmill: D=10, 4F, 6 material compat (P/M/K/N/S/H)
 *   5. AC_TP_001 touch probe: vc/fz/max_speed all 0, no material compat
 *   6. AC_BM_001 ballmill: corner radius == diameter/2
 *   7. stats counts: tool_count, holder_count, material_compat_count, geometry_classes
 *   8. XML directory parses + merges (XML wins on collision)
 *   9. XML single file parses
 *  10. getACToolDBSchema: 29 classes, 7 holder fields, 6 compat fields
 *  11. Adversarial: empty dir, non-XML files, uppercase .XML
 *
 * Strict legitimacy: concrete value assertions only — no toBeDefined/Undefined.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  HyperMillACStandardToolDBEngine,
  hyperMillACStandardToolDBEngine,
  type ACStandardToolRecord,
} from "../engines/HyperMillACStandardToolDBEngine.js";

// Named constants — anti-magic-number
const BUILTIN_TOOL_COUNT = 8;
const SUPPORTED_GEOMETRY_CLASSES = 29;
const HOLDER_FIELD_COUNT = 7;
const MATERIAL_COMPAT_FIELD_COUNT = 6;

// AC_EM_001 spec
const EM_DIAMETER_MM = 10;
const EM_FLUTES = 4;
const EM_GEOMETRY_CLASS_ID = 2;
const EM_VC_BASE = 120;
const EM_FZ_BASE = 0.04;
const EM_MATERIAL_COMPAT_COUNT = 6;

// AC_BM_001 spec
const BM_DIAMETER_MM = 6;
const BM_CORNER_RADIUS_MM = 3;

// Type ID → class name map (engine internal, exposed via parsed XML test)
const TYPE_ID_ENDMILL = 2;
const TYPE_ID_DRILL = 4;
const TYPE_ID_TAP = 11;
const TYPE_ID_TOUCH_PROBE = 2000;

let testRoot: string;

beforeEach(() => {
  testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ac-tooldb-test-"));
});

afterEach(() => {
  try { fs.rmSync(testRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

// helper — fail-fast lookup that returns concrete record (throws if missing)
function findTool(tools: ACStandardToolRecord[], id: string): ACStandardToolRecord {
  const t = tools.find((x) => x.tool_id === id);
  if (!t) throw new Error(`tool_id not found in catalog: ${id}`);
  return t;
}

describe("HyperMillACStandardToolDBEngine — class shape", () => {
  it("exports class with prototype extractACStandardToolDB method", () => {
    expect(typeof HyperMillACStandardToolDBEngine).toBe("function");
    expect(typeof HyperMillACStandardToolDBEngine.prototype.extractACStandardToolDB).toBe("function");
    expect(typeof HyperMillACStandardToolDBEngine.prototype.getACToolDBSchema).toBe("function");
  });

  it("singleton is an instance of the class", () => {
    expect(hyperMillACStandardToolDBEngine instanceof HyperMillACStandardToolDBEngine).toBe(true);
  });
});

describe("HyperMillACStandardToolDBEngine — built-in catalog (path missing)", () => {
  it("non-existent path → status='success'", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/no/such/path/exists");
    expect(r.status).toBe("success");
  });

  it("non-existent path → tools.length == BUILTIN_TOOL_COUNT (8)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/no/such/path/exists");
    expect(r.tools.length).toBe(BUILTIN_TOOL_COUNT);
    expect(r.stats.tool_count).toBe(BUILTIN_TOOL_COUNT);
  });

  it("non-existent path → first error contains 'INFO' and 'not found'", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/no/such/path/exists");
    expect(r.stats.errors.length > 0).toBe(true);
    expect(r.stats.errors[0].includes("INFO")).toBe(true);
    expect(r.stats.errors[0].includes("not found")).toBe(true);
  });

  it("extracted_at is a parseable ISO timestamp", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/no/such/path");
    const ms = Date.parse(r.extracted_at);
    expect(Number.isNaN(ms)).toBe(false);
  });

  it("source_path is preserved verbatim from input", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/foo/bar.xml");
    expect(r.source_path).toBe("/foo/bar.xml");
  });
});

describe("HyperMillACStandardToolDBEngine — built-in tool identity", () => {
  it("catalog includes the 8 canonical tool IDs", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const ids = r.tools.map((t) => t.tool_id).sort();
    expect(ids).toEqual([
      "AC_BM_001",
      "AC_CH_001",
      "AC_DT_001",
      "AC_EM_001",
      "AC_LL_001",
      "AC_RM_001",
      "AC_TA_001",
      "AC_TP_001",
    ]);
  });

  it("AC_EM_001: diameter == 10mm, flutes == 4, class == 'Endmill'", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const em = findTool(r.tools, "AC_EM_001");
    expect(em.diameter_mm).toBe(EM_DIAMETER_MM);
    expect(em.flutes).toBe(EM_FLUTES);
    expect(em.geometry_class).toBe("Endmill");
    expect(em.geometry_class_id).toBe(EM_GEOMETRY_CLASS_ID);
    expect(em.prism_type).toBe("flat_endmill");
  });

  it("AC_EM_001: substrate == 'Carbide', coating == 'TiAlN'", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const em = findTool(r.tools, "AC_EM_001");
    expect(em.substrate).toBe("Carbide");
    expect(em.coating).toBe("TiAlN");
  });

  it("AC_EM_001: cutting data Vc == 120 m/min, fz == 0.04 mm/tooth", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const em = findTool(r.tools, "AC_EM_001");
    expect(em.vc_base_m_min).toBe(EM_VC_BASE);
    expect(em.fz_base_mm).toBe(EM_FZ_BASE);
  });

  it("AC_EM_001: 6 material compat entries in canonical ISO order [P,M,K,N,S,H]", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const em = findTool(r.tools, "AC_EM_001");
    expect(em.material_compat.length).toBe(EM_MATERIAL_COMPAT_COUNT);
    expect(em.material_compat.map((m) => m.iso_group)).toEqual(["P", "M", "K", "N", "S", "H"]);
  });

  it("AC_EM_001: P-group correction factors are nominal (1.0/1.0/1.0)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const em = findTool(r.tools, "AC_EM_001");
    const p = em.material_compat[0];
    expect(p.iso_group).toBe("P");
    expect(p.vc_correction).toBe(1.0);
    expect(p.fz_correction).toBe(1.0);
    expect(p.ap_correction).toBe(1.0);
  });

  it("AC_TP_001 touch probe: class == 'TouchProbe', class_id == 2000, prism_type == 'touch_probe'", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const tp = findTool(r.tools, "AC_TP_001");
    expect(tp.geometry_class).toBe("TouchProbe");
    expect(tp.geometry_class_id).toBe(TYPE_ID_TOUCH_PROBE);
    expect(tp.prism_type).toBe("touch_probe");
  });

  it("AC_TP_001 touch probe: vc/fz/flutes all zero, no material compat", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const tp = findTool(r.tools, "AC_TP_001");
    expect(tp.vc_base_m_min).toBe(0);
    expect(tp.fz_base_mm).toBe(0);
    expect(tp.flutes).toBe(0);
    expect(tp.material_compat).toEqual([]);
  });

  it("AC_TP_001 touch probe: holder max_speed_rpm == 0", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const tp = findTool(r.tools, "AC_TP_001");
    expect(tp.holders.length).toBe(1);
    expect(tp.holders[0].max_speed_rpm).toBe(0);
  });

  it("AC_BM_001 ballmill: D == 6mm, corner_radius == 3mm (D/2 invariant)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const bm = findTool(r.tools, "AC_BM_001");
    expect(bm.diameter_mm).toBe(BM_DIAMETER_MM);
    expect(bm.corner_radius_mm).toBe(BM_CORNER_RADIUS_MM);
    expect(bm.corner_radius_mm * 2).toBe(bm.diameter_mm);
    expect(bm.prism_type).toBe("ball_endmill");
  });

  it("AC_DT_001 drill: prism_type == 'drill', class_id == 4", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const dt = findTool(r.tools, "AC_DT_001");
    expect(dt.prism_type).toBe("drill");
    expect(dt.geometry_class_id).toBe(TYPE_ID_DRILL);
  });

  it("AC_TA_001 tap: prism_type == 'tap', class_id == 11", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const ta = findTool(r.tools, "AC_TA_001");
    expect(ta.prism_type).toBe("tap");
    expect(ta.geometry_class_id).toBe(TYPE_ID_TAP);
  });
});

describe("HyperMillACStandardToolDBEngine — stats counts", () => {
  it("holder_count == sum of holders.length across all tools", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const expected = r.tools.reduce((acc, t) => acc + t.holders.length, 0);
    expect(r.stats.holder_count).toBe(expected);
  });

  it("holder_count >= BUILTIN_TOOL_COUNT (each built-in has ≥1 holder)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    expect(r.stats.holder_count >= BUILTIN_TOOL_COUNT).toBe(true);
  });

  it("material_compat_count == sum of material_compat.length across all tools", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const expected = r.tools.reduce((acc, t) => acc + t.material_compat.length, 0);
    expect(r.stats.material_compat_count).toBe(expected);
  });

  it("geometry_classes is a deduplicated set (length == unique count)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    const unique = new Set(r.stats.geometry_classes);
    expect(unique.size).toBe(r.stats.geometry_classes.length);
  });

  it("geometry_classes includes Endmill, TouchProbe, Tap (from built-ins)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/missing");
    expect(r.stats.geometry_classes.includes("Endmill")).toBe(true);
    expect(r.stats.geometry_classes.includes("TouchProbe")).toBe(true);
    expect(r.stats.geometry_classes.includes("Tap")).toBe(true);
  });
});

describe("HyperMillACStandardToolDBEngine — XML parsing", () => {
  it("XML directory: parsed XML tool merged into catalog (built-ins still present)", () => {
    const xmlPath = path.join(testRoot, "tools.xml");
    const xml = `<?xml version="1.0"?>
<Tools>
  <Tool id="XML_TEST_001" name="Test XML Tool" type_id="2">
    <Manufacturer>TestVendor</Manufacturer>
    <CatalogNumber>XML-T-001</CatalogNumber>
    <Diameter>20</Diameter>
    <CornerRadius>0</CornerRadius>
    <FluteLength>40</FluteLength>
    <OAL>100</OAL>
    <ShankDiameter>20</ShankDiameter>
    <Flutes>3</Flutes>
    <HelixAngle>45</HelixAngle>
    <Substrate>Carbide</Substrate>
    <Coating>AlTiN</Coating>
    <VcBase>180</VcBase>
    <FzBase>0.06</FzBase>
  </Tool>
</Tools>`;
    fs.writeFileSync(xmlPath, xml);

    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    const xmlTool = findTool(r.tools, "XML_TEST_001");
    expect(xmlTool.diameter_mm).toBe(20);
    expect(xmlTool.flutes).toBe(3);
    expect(xmlTool.helix_angle_deg).toBe(45);
    expect(xmlTool.coating).toBe("AlTiN");
    expect(xmlTool.geometry_class).toBe("Endmill");
    expect(xmlTool.prism_type).toBe("flat_endmill");
    // built-ins still present
    const builtin = findTool(r.tools, "AC_EM_001");
    expect(builtin.diameter_mm).toBe(EM_DIAMETER_MM);
  });

  it("XML override: same tool_id as built-in replaces built-in entry", () => {
    const xmlPath = path.join(testRoot, "override.xml");
    const xml = `<Tool id="AC_EM_001" name="OVERRIDE" type_id="2">
    <Diameter>99</Diameter>
    <Flutes>5</Flutes>
  </Tool>`;
    fs.writeFileSync(xmlPath, xml);

    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    const overridden = findTool(r.tools, "AC_EM_001");
    expect(overridden.name).toBe("OVERRIDE");
    expect(overridden.diameter_mm).toBe(99);
    expect(overridden.flutes).toBe(5);
  });

  it("malformed XML produces no parse error and no extra tools (regex matches nothing)", () => {
    const xmlPath = path.join(testRoot, "broken.xml");
    fs.writeFileSync(xmlPath, "<<not valid xml");
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    expect(r.status).toBe("success");
    expect(r.tools.length).toBe(BUILTIN_TOOL_COUNT);
  });

  it("XML file path passed directly (not directory) is parsed", () => {
    const xmlPath = path.join(testRoot, "single.xml");
    fs.writeFileSync(xmlPath, `<Tool id="S1" name="single" type_id="4"></Tool>`);
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(xmlPath);
    const t = findTool(r.tools, "S1");
    expect(t.geometry_class).toBe("Drilltool");
    expect(t.prism_type).toBe("drill");
  });

  it("XML tool defaults: substrate='Carbide', coating='None' when fields missing", () => {
    const xmlPath = path.join(testRoot, "min.xml");
    fs.writeFileSync(xmlPath, `<Tool id="MIN1" name="minimal" type_id="2"></Tool>`);
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    const t = findTool(r.tools, "MIN1");
    expect(t.substrate).toBe("Carbide");
    expect(t.coating).toBe("None");
    expect(t.flutes).toBe(2);
  });
});

describe("HyperMillACStandardToolDBEngine — getACToolDBSchema()", () => {
  it("supported_geometry_classes == 29", () => {
    const s = hyperMillACStandardToolDBEngine.getACToolDBSchema();
    expect(s.supported_geometry_classes).toBe(SUPPORTED_GEOMETRY_CLASSES);
  });

  it("holder_fields has 7 entries including holder_id and max_speed_rpm", () => {
    const s = hyperMillACStandardToolDBEngine.getACToolDBSchema();
    expect(s.holder_fields.length).toBe(HOLDER_FIELD_COUNT);
    expect(s.holder_fields.includes("holder_id")).toBe(true);
    expect(s.holder_fields.includes("max_speed_rpm")).toBe(true);
  });

  it("material_compat_fields has 6 entries including iso_group and vc_correction", () => {
    const s = hyperMillACStandardToolDBEngine.getACToolDBSchema();
    expect(s.material_compat_fields.length).toBe(MATERIAL_COMPAT_FIELD_COUNT);
    expect(s.material_compat_fields.includes("iso_group")).toBe(true);
    expect(s.material_compat_fields.includes("vc_correction")).toBe(true);
  });

  it("output_format string mentions ACStandardToolRecord", () => {
    const s = hyperMillACStandardToolDBEngine.getACToolDBSchema();
    expect(s.output_format.includes("ACStandardToolRecord")).toBe(true);
  });
});

describe("HyperMillACStandardToolDBEngine — adversarial", () => {
  it("empty directory → only built-ins, no 'not found' INFO message (dir exists)", () => {
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    expect(r.status).toBe("success");
    expect(r.tools.length).toBe(BUILTIN_TOOL_COUNT);
    const infoMessages = r.stats.errors.filter((e) => e.includes("not found"));
    expect(infoMessages.length).toBe(0);
  });

  it("non-XML files (.txt, .json) are ignored — tool count stays at 8", () => {
    fs.writeFileSync(path.join(testRoot, "readme.txt"), "ignore me");
    fs.writeFileSync(path.join(testRoot, "data.json"), "{}");
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    expect(r.tools.length).toBe(BUILTIN_TOOL_COUNT);
  });

  it("uppercase .XML extension recognized (case-insensitive match)", () => {
    const xmlPath = path.join(testRoot, "UPPER.XML");
    fs.writeFileSync(xmlPath, `<Tool id="UP1" name="upper" type_id="11"></Tool>`);
    const r = hyperMillACStandardToolDBEngine.extractACStandardToolDB(testRoot);
    const t = findTool(r.tools, "UP1");
    expect(t.geometry_class).toBe("Tap");
    expect(t.prism_type).toBe("tap");
  });
});
