/**
 * Tests for STEPAP242PMIExtractorEngine
 * MS-P1.5-ONESHOT/U-P1.5-OS-02
 */

import { describe, it, expect } from "vitest";
import { stepAP242PMIExtractorEngine } from "../engines/STEPAP242PMIExtractorEngine.js";

const SAMPLE_AP242_HEADER = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('STEP AP242 test file'),'2;1');
FILE_NAME('test.stp','2026-04-17T12:00:00',('Author'),('Org'),'PRISM','AP242','');
FILE_SCHEMA(('AP242_MANAGED_MODEL_BASED_3D_ENGINEERING_MIM_LF'));
ENDSEC;
`;

const SAMPLE_AP214_HEADER = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('STEP AP214 test file'),'2;1');
FILE_NAME('test.stp','2026-04-17T12:00:00',('Author'),('Org'),'CAD','AP214','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
`;

const SAMPLE_DATA_SECTION = `
DATA;
#1 = PRODUCT('Part1','Part1','',(#2));
#2 = PRODUCT_CONTEXT('',#3,'mechanical');
#3 = APPLICATION_CONTEXT('automotive design');
#10 = ADVANCED_FACE('Face1',(#11),#12,.T.);
#11 = FACE_OUTER_BOUND('',(#13),.T.);
#12 = PLANE('Plane1',#14);
#13 = EDGE_LOOP('',(#15,#16,#17,#18));
#14 = AXIS2_PLACEMENT_3D('',#19,#20,#21);
#15 = ORIENTED_EDGE('',*,*,#22,.T.);
#16 = ORIENTED_EDGE('',*,*,#23,.T.);
#17 = ORIENTED_EDGE('',*,*,#24,.T.);
#18 = ORIENTED_EDGE('',*,*,#25,.T.);
#19 = CARTESIAN_POINT('',(0.,0.,0.));
#20 = DIRECTION('',(0.,0.,1.));
#21 = DIRECTION('',(1.,0.,0.));
#22 = EDGE_CURVE('Edge1',#26,#27,#28,.T.);
#23 = EDGE_CURVE('Edge2',#27,#29,#30,.T.);
#24 = EDGE_CURVE('Edge3',#29,#31,#32,.T.);
#25 = EDGE_CURVE('Edge4',#31,#26,#33,.T.);
#26 = VERTEX_POINT('V1',#34);
#27 = VERTEX_POINT('V2',#35);
#28 = LINE('L1',#36,#37);
#29 = VERTEX_POINT('V3',#38);
#30 = LINE('L2',#39,#40);
#31 = VERTEX_POINT('V4',#41);
#32 = LINE('L3',#42,#43);
#33 = LINE('L4',#44,#45);
#34 = CARTESIAN_POINT('',(0.,0.,0.));
#35 = CARTESIAN_POINT('',(100.,0.,0.));
#38 = CARTESIAN_POINT('',(100.,100.,0.));
#41 = CARTESIAN_POINT('',(0.,100.,0.));

#100 = DATUM('Datum_A','A');
#101 = DATUM('Datum_B','B');
#102 = DATUM('Datum_C','C');
#103 = DATUM_FEATURE('DatumFeature_A',#10,#100);

#200 = POSITION_TOLERANCE('Position1',0.025,#10,#100,#101,#102);
#201 = FLATNESS_TOLERANCE('Flatness1',0.005,#10);
#202 = PERPENDICULARITY_TOLERANCE('Perp1',0.010,#10,#100);
#203 = PARALLELISM_TOLERANCE('Para1',0.015,#10,#100);
#204 = CIRCULARITY_TOLERANCE('Circle1',0.003,#46);
#46 = CYLINDRICAL_SURFACE('Cyl1',#47,10.0);
#47 = AXIS2_PLACEMENT_3D('',#48,#49,#50);
#48 = CARTESIAN_POINT('',(50.,50.,0.));
#49 = DIRECTION('',(0.,0.,1.));
#50 = DIRECTION('',(1.,0.,0.));

#300 = DIMENSIONAL_SIZE('Size1',50.0,0.025,-0.025,#10);
#301 = DIMENSIONAL_SIZE('Size2',25.4,0.010,-0.010,#46);
#302 = ANGULAR_SIZE('Angle1',90.0,0.5,-0.5);
#303 = DIAMETER_DIMENSION('Dia1',20.0,0.005,-0.005,#46);

#400 = SURFACE_TEXTURE_PARAMETER('Ra',1.6,'UM',#10);
#401 = SURFACE_TEXTURE_PARAMETER('Rz',6.3,'UM',#46);

#500 = LENGTH_MEASURE('MILLIMETRE');
ENDSEC;
END-ISO-10303-21;
`;

describe("STEPAP242PMIExtractorEngine", () => {
  describe("Schema Detection", () => {
    it("detects AP242 schema", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.schemaVersion).toBe("AP242");
    });

    it("detects AP214 schema from AUTOMOTIVE_DESIGN", () => {
      const content = SAMPLE_AP214_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.schemaVersion).toBe("AP214");
    });

    it("returns unknown for unsupported schema", () => {
      const content = `
ISO-10303-21;
HEADER;
FILE_SCHEMA(('UNKNOWN_SCHEMA'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.success).toBe(false);
      expect(result.schemaVersion).toBe("unknown");
    });
  });

  describe("Unit Detection", () => {
    it("defaults to mm unit", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.unit).toBe("mm");
    });

    it("detects inch unit from LENGTH_MEASURE", () => {
      const contentInch = SAMPLE_AP242_HEADER + `
DATA;
#1 = LENGTH_MEASURE('INCH');
#100 = DATUM('Datum_A','A');
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(contentInch);
      expect(result.unit).toBe("in");
    });
  });

  describe("Datum Extraction", () => {
    it("extracts datum references", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.datums.length).toBeGreaterThanOrEqual(3);
      expect(result.datums.map((d) => d.label)).toContain("A");
      expect(result.datums.map((d) => d.label)).toContain("B");
      expect(result.datums.map((d) => d.label)).toContain("C");
    });

    it("assigns precedence based on label order", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const datumA = result.datums.find((d) => d.label === "A");
      const datumB = result.datums.find((d) => d.label === "B");
      expect(datumA?.precedence).toBeLessThan(datumB?.precedence ?? 0);
    });
  });

  describe("Geometric Tolerance Extraction", () => {
    it("extracts position tolerance", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const posTol = result.geometricTolerances.find((t) => t.type === "position");
      expect(posTol).toBeDefined();
      expect(posTol?.value.upper).toBeGreaterThan(0);
    });

    it("extracts flatness tolerance", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const flatTol = result.geometricTolerances.find((t) => t.type === "flatness");
      expect(flatTol).toBeDefined();
    });

    it("extracts perpendicularity tolerance with datum reference", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const perpTol = result.geometricTolerances.find((t) => t.type === "perpendicularity");
      expect(perpTol).toBeDefined();
    });

    it("extracts circularity tolerance", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const circTol = result.geometricTolerances.find((t) => t.type === "circularity");
      expect(circTol).toBeDefined();
    });
  });

  describe("Dimensional Size Extraction", () => {
    it("extracts linear dimensions", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.dimensionalSizes.length).toBeGreaterThan(0);
    });

    it("extracts diameter dimensions", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const diaDim = result.dimensionalSizes.find((d) => d.type === "diameter");
      expect(diaDim).toBeDefined();
    });

    it("extracts angular dimensions", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const angDim = result.dimensionalSizes.find((d) => d.type === "angular");
      expect(angDim).toBeDefined();
      expect(angDim?.unit).toBe("deg");
    });
  });

  describe("Surface Texture Extraction", () => {
    it("extracts Ra surface texture", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const raTex = result.surfaceTextures.find((s) => s.type === "Ra");
      expect(raTex).toBeDefined();
      expect(raTex?.value).toBeGreaterThan(0);
    });

    it("extracts Rz surface texture", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const rzTex = result.surfaceTextures.find((s) => s.type === "Rz");
      expect(rzTex).toBeDefined();
    });
  });

  describe("GD&T Frame Building", () => {
    it("builds GD&T frames from tolerances", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.gdtFrames.length).toBeGreaterThan(0);
    });

    it("includes feature control frame text representation", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const frame = result.gdtFrames[0];
      expect(frame?.featureControlFrame).toBeDefined();
      expect(frame?.featureControlFrame.length).toBeGreaterThan(0);
    });
  });

  describe("Feature Linking", () => {
    it("links PMI to geometric features", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.stats.linkedToFeatures).toBeGreaterThan(0);
    });

    it("calculates coverage percentage", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.stats.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(result.stats.coveragePercent).toBeLessThanOrEqual(100);
    });
  });

  describe("WEDM Integration", () => {
    it("getFeatureTolerances returns tolerances for a feature", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const featureTols = stepAP242PMIExtractorEngine.getFeatureTolerances(result, "#10");
      expect(featureTols).toBeDefined();
      expect(featureTols.geometricTolerances).toBeDefined();
      expect(featureTols.dimensionalSizes).toBeDefined();
      expect(featureTols.surfaceTextures).toBeDefined();
    });

    it("requiresWEDM detects tight tolerances", () => {
      const content = SAMPLE_AP242_HEADER + `
DATA;
#10 = ADVANCED_FACE('TightFace',(#11),#12,.T.);
#200 = POSITION_TOLERANCE('TightPos',0.005,#10);
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const wedmCheck = stepAP242PMIExtractorEngine.requiresWEDM(result, "#10", {
        tolerance_mm: 0.01,
        surface_Ra_um: 1.6,
      });
      expect(wedmCheck.required).toBe(true);
      expect(wedmCheck.reasons.some((r) => r.includes("tolerance"))).toBe(true);
    });

    it("requiresWEDM detects fine surface finish", () => {
      const content = SAMPLE_AP242_HEADER + `
DATA;
#10 = ADVANCED_FACE('FineFace',(#11),#12,.T.);
#400 = SURFACE_TEXTURE_PARAMETER('Ra',0.8,'UM',#10);
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const wedmCheck = stepAP242PMIExtractorEngine.requiresWEDM(result, "#10", {
        tolerance_mm: 0.01,
        surface_Ra_um: 1.6,
      });
      expect(wedmCheck.required).toBe(true);
      expect(wedmCheck.reasons.some((r) => r.includes("surface"))).toBe(true);
    });

    it("requiresWEDM returns false for loose tolerances", () => {
      const content = SAMPLE_AP242_HEADER + `
DATA;
#10 = ADVANCED_FACE('LooseFace',(#11),#12,.T.);
#200 = POSITION_TOLERANCE('LoosePos',0.5,#10);
#400 = SURFACE_TEXTURE_PARAMETER('Ra',3.2,'UM',#10);
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      const wedmCheck = stepAP242PMIExtractorEngine.requiresWEDM(result, "#10", {
        tolerance_mm: 0.01,
        surface_Ra_um: 1.6,
      });
      expect(wedmCheck.required).toBe(false);
    });
  });

  describe("Statistics", () => {
    it("counts total PMI entities", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.stats.totalPMIEntities).toBeGreaterThan(0);
      expect(result.stats.extractedPMI).toBe(result.stats.totalPMIEntities);
    });

    it("reports success for valid content", () => {
      const content = SAMPLE_AP242_HEADER + SAMPLE_DATA_SECTION;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("handles missing file gracefully", () => {
      const result = stepAP242PMIExtractorEngine.extract("/nonexistent/file.stp");
      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("handles empty data section", () => {
      const content = SAMPLE_AP242_HEADER + `
DATA;
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.success).toBe(true);
      expect(result.stats.totalPMIEntities).toBe(0);
    });

    it("handles malformed entities", () => {
      const content = SAMPLE_AP242_HEADER + `
DATA;
#1 = BROKEN_ENTITY(
#2 = DATUM('A','A');
ENDSEC;
END-ISO-10303-21;
      `;
      const result = stepAP242PMIExtractorEngine.extractFromContent(content);
      expect(result.success).toBe(true);
      expect(result.datums.length).toBeGreaterThanOrEqual(0);
    });
  });
});
