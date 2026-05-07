/**
 * CADGeometryComparisonEngine Tests
 * CAD-COMPLETE-MS0/U-CADC26
 *
 * Tests format-agnostic CAD geometry comparison.
 * 100% pass rate REQUIRED — safety-critical machining code.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  cadGeometryComparisonEngine,
  type ComparisonThresholds,
  type GeometryMetrics,
  type ComparisonResult,
  type BatchComparisonResult,
} from "../../engines/CADGeometryComparisonEngine.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("CADGeometryComparisonEngine", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // ENGINE METADATA
  // ─────────────────────────────────────────────────────────────────────────

  describe("Engine Info", () => {
    it("should have correct engine metadata", () => {
      expect(cadGeometryComparisonEngine.info.name).toBe("CADGeometryComparisonEngine");
      expect(cadGeometryComparisonEngine.info.version).toBe("1.0.0");
      expect(cadGeometryComparisonEngine.info.domain).toBe("cad_comparison");
    });

    it("should expose expected capabilities", () => {
      const caps = cadGeometryComparisonEngine.getCapabilities();
      expect(caps.length).toBeGreaterThanOrEqual(5);
      expect(caps.map(c => c.name)).toContain("geometry_extract");
      expect(caps.map(c => c.name)).toContain("geometry_compare");
      expect(caps.map(c => c.name)).toContain("geometry_batch_compare");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  describe("Format Detection", () => {
    it("should detect STEP format from .step extension", () => {
      expect(cadGeometryComparisonEngine.detectFormat("part.step")).toBe("STEP");
      expect(cadGeometryComparisonEngine.detectFormat("PART.STEP")).toBe("STEP");
      expect(cadGeometryComparisonEngine.detectFormat("part.stp")).toBe("STEP");
    });

    it("should detect DXF format from .dxf extension", () => {
      expect(cadGeometryComparisonEngine.detectFormat("drawing.dxf")).toBe("DXF");
      expect(cadGeometryComparisonEngine.detectFormat("DRAWING.DXF")).toBe("DXF");
    });

    it("should detect STL format from .stl extension", () => {
      expect(cadGeometryComparisonEngine.detectFormat("mesh.stl")).toBe("STL");
      expect(cadGeometryComparisonEngine.detectFormat("MESH.STL")).toBe("STL");
    });

    it("should detect IGES format from .iges/.igs extension", () => {
      expect(cadGeometryComparisonEngine.detectFormat("surface.iges")).toBe("IGES");
      expect(cadGeometryComparisonEngine.detectFormat("surface.igs")).toBe("IGES");
    });

    it("should return UNKNOWN for unrecognized extensions", () => {
      expect(cadGeometryComparisonEngine.detectFormat("file.xyz")).toBe("UNKNOWN");
      expect(cadGeometryComparisonEngine.detectFormat("file.txt")).toBe("UNKNOWN");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // THRESHOLD CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  describe("Threshold Configuration", () => {
    beforeEach(() => {
      // Reset to defaults
      cadGeometryComparisonEngine.setThresholds({
        volumeDeltaPercent: 5,
        bboxDeltaPercent: 2,
        topologySimilarityMin: 0.8,
        featureCountDeltaPercent: 20,
      });
    });

    it("should return default thresholds", () => {
      const thresholds = cadGeometryComparisonEngine.getThresholds();
      expect(thresholds.volumeDeltaPercent).toBe(5);
      expect(thresholds.bboxDeltaPercent).toBe(2);
      expect(thresholds.topologySimilarityMin).toBe(0.8);
      expect(thresholds.featureCountDeltaPercent).toBe(20);
    });

    it("should update thresholds partially", () => {
      const updated = cadGeometryComparisonEngine.setThresholds({
        volumeDeltaPercent: 10,
      });
      expect(updated.volumeDeltaPercent).toBe(10);
      expect(updated.bboxDeltaPercent).toBe(2); // unchanged
    });

    it("should update all thresholds", () => {
      const updated = cadGeometryComparisonEngine.setThresholds({
        volumeDeltaPercent: 3,
        bboxDeltaPercent: 1,
        topologySimilarityMin: 0.9,
        featureCountDeltaPercent: 10,
      });
      expect(updated.volumeDeltaPercent).toBe(3);
      expect(updated.bboxDeltaPercent).toBe(1);
      expect(updated.topologySimilarityMin).toBe(0.9);
      expect(updated.featureCountDeltaPercent).toBe(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STEP EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  describe("STEP Metric Extraction", () => {
    const tmpDir = os.tmpdir();

    it("should extract metrics from valid STEP file", () => {
      const stepContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('test'),'2;1');
FILE_NAME('test.step');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('Origin',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P1',(100.0,0.0,0.0));
#3=CARTESIAN_POINT('P2',(100.0,50.0,0.0));
#4=CARTESIAN_POINT('P3',(0.0,50.0,25.0));
#5=VERTEX_POINT('V1',#1);
#6=VERTEX_POINT('V2',#2);
#7=EDGE_CURVE('E1',#5,#6,#10,.T.);
#8=ORIENTED_EDGE('OE1',*,*,#7,.T.);
#9=ADVANCED_FACE('F1',(#20),#30,.T.);
#10=LINE('L1',#1,#11);
#11=CLOSED_SHELL('Shell1',(#9));
#12=MANIFOLD_SOLID_BREP('Solid1',#11);
#13=PLANE('Plane1',#1);
#14=CYLINDRICAL_SURFACE('Cyl1',#1,25.0);
ENDSEC;
END-ISO-10303-21;`;

      const filePath = path.join(tmpDir, `test_step_${Date.now()}.step`);
      fs.writeFileSync(filePath, stepContent);

      try {
        const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);

        expect(metrics.format).toBe("STEP");
        expect(metrics.fileSize).toBeGreaterThan(0);
        expect(metrics.hash).toHaveLength(16);
        expect(metrics.topology.vertexCount).toBe(2);
        expect(metrics.topology.edgeCount).toBeGreaterThan(0);
        expect(metrics.topology.faceCount).toBe(1);
        expect(metrics.topology.shellCount).toBe(1);
        expect(metrics.topology.solidCount).toBe(1);
        expect(metrics.boundingBox.sizeX).toBe(100);
        expect(metrics.boundingBox.sizeY).toBe(50);
        expect(metrics.boundingBox.sizeZ).toBe(25);
        expect(metrics.features.features).toContain("cylinder");
        expect(metrics.features.features).toContain("planar_face");
        expect(metrics.extractionTimeMs).toBeGreaterThanOrEqual(0);
      } finally {
        fs.unlinkSync(filePath);
      }
    });

    it("should handle STEP file with no geometry", () => {
      const emptyStep = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('empty'),'2;1');
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;`;

      const filePath = path.join(tmpDir, `empty_step_${Date.now()}.step`);
      fs.writeFileSync(filePath, emptyStep);

      try {
        const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);
        expect(metrics.format).toBe("STEP");
        expect(metrics.topology.faceCount).toBe(0);
        expect(metrics.parseWarnings).toContain("No faces detected in STEP file");
        expect(metrics.parseWarnings).toContain("No solid bodies detected in STEP file");
      } finally {
        fs.unlinkSync(filePath);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STL EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  describe("STL Metric Extraction", () => {
    const tmpDir = os.tmpdir();

    it("should extract metrics from ASCII STL file", () => {
      const stlContent = `solid test
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 5 10 0
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex 0 0 5
    vertex 10 0 5
    vertex 5 10 5
  endloop
endfacet
endsolid test`;

      const filePath = path.join(tmpDir, `test_stl_${Date.now()}.stl`);
      fs.writeFileSync(filePath, stlContent);

      try {
        const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);

        expect(metrics.format).toBe("STL");
        expect(metrics.topology.faceCount).toBe(2);
        expect(metrics.boundingBox.sizeX).toBe(10);
        expect(metrics.boundingBox.sizeY).toBe(10);
        expect(metrics.boundingBox.sizeZ).toBe(5);
        expect(metrics.surfaceArea).toBeGreaterThan(0);
        expect(metrics.features.features).toContain("mesh");
      } finally {
        fs.unlinkSync(filePath);
      }
    });

    it("should compute STL volume correctly for cube", () => {
      // Simple unit cube (1x1x1) with correct face winding
      // Volume = 1 mm³ (but signed tetrahedron sums to 1)
      const stlContent = `solid cube
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex 1 1 0
    vertex 1 0 0
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex 0 1 0
    vertex 1 1 0
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 1
    vertex 1 0 1
    vertex 1 1 1
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 1
    vertex 1 1 1
    vertex 0 1 1
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 1 0 1
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 1 0 1
    vertex 0 0 1
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 1 0 0
    vertex 1 1 0
    vertex 1 1 1
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 1 0 0
    vertex 1 1 1
    vertex 1 0 1
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 1 0
    vertex 0 1 1
    vertex 1 1 1
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 1 0
    vertex 1 1 1
    vertex 1 1 0
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 0 1
    vertex 0 1 1
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 1 1
    vertex 0 1 0
  endloop
endfacet
endsolid cube`;

      const filePath = path.join(tmpDir, `cube_stl_${Date.now()}.stl`);
      fs.writeFileSync(filePath, stlContent);

      try {
        const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);
        // Signed tetrahedron method for unit cube should give volume ~1
        expect(metrics.volume).toBeGreaterThan(0.9);
        expect(metrics.volume).toBeLessThan(1.1);
        expect(metrics.topology.faceCount).toBe(12); // 12 triangles for a cube
      } finally {
        fs.unlinkSync(filePath);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DXF EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  describe("DXF Metric Extraction", () => {
    const tmpDir = os.tmpdir();

    it("should extract metrics from DXF file with entities", () => {
      const dxfContent = `0
SECTION
2
ENTITIES
0
LINE
10
0.0
20
0.0
11
100.0
21
0.0
0
LINE
10
100.0
20
0.0
11
100.0
21
50.0
0
CIRCLE
10
50.0
20
25.0
40
10.0
0
ARC
10
25.0
20
25.0
40
5.0
50
0.0
51
180.0
0
ENDSEC
0
EOF`;

      const filePath = path.join(tmpDir, `test_dxf_${Date.now()}.dxf`);
      fs.writeFileSync(filePath, dxfContent);

      try {
        const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);

        expect(metrics.format).toBe("DXF");
        expect(metrics.topology.entityTypes.LINE).toBe(2);
        expect(metrics.topology.entityTypes.CIRCLE).toBe(1);
        expect(metrics.topology.entityTypes.ARC).toBe(1);
        expect(metrics.features.features).toContain("line");
        expect(metrics.features.features).toContain("circle");
        expect(metrics.features.features).toContain("arc");
      } finally {
        fs.unlinkSync(filePath);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARISON
  // ─────────────────────────────────────────────────────────────────────────

  describe("Geometry Comparison", () => {
    const tmpDir = os.tmpdir();

    it("should pass comparison for identical files", () => {
      const stepContent = `ISO-10303-21;
HEADER;
ENDSEC;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(50.0,50.0,50.0));
#3=ADVANCED_FACE('F',(#10),#20,.T.);
#4=CLOSED_SHELL('S',(#3));
#5=MANIFOLD_SOLID_BREP('B',#4);
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `comp1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `comp2_${Date.now()}.step`);
      fs.writeFileSync(file1, stepContent);
      fs.writeFileSync(file2, stepContent);

      try {
        const result = cadGeometryComparisonEngine.compare(file1, file2);

        expect(result.overallPassed).toBe(true);
        expect(result.passRate).toBe(1);
        expect(result.metrics.every(m => m.passed)).toBe(true);
        expect(result.topologySimilarity).toBe(1);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });

    it("should fail comparison when volume delta exceeds threshold", () => {
      const original = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(100.0,100.0,100.0));
#3=ADVANCED_FACE('F',(#10),#20,.T.);
ENDSEC;
END-ISO-10303-21;`;

      const generated = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(120.0,100.0,100.0));
#3=ADVANCED_FACE('F',(#10),#20,.T.);
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `vol1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `vol2_${Date.now()}.step`);
      fs.writeFileSync(file1, original);
      fs.writeFileSync(file2, generated);

      try {
        const result = cadGeometryComparisonEngine.compare(file1, file2);

        // Bounding box should fail (20% larger in X)
        const bboxMetric = result.metrics.find(m => m.metric === "Bounding Box");
        expect(bboxMetric?.passed).toBe(false);
        expect(result.overallPassed).toBe(false);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });

    it("should detect topology differences", () => {
      const original = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=ADVANCED_FACE('F1',(#10),#20,.T.);
#3=ADVANCED_FACE('F2',(#10),#20,.T.);
#4=ADVANCED_FACE('F3',(#10),#20,.T.);
#5=CYLINDRICAL_SURFACE('C',#1,10.0);
ENDSEC;
END-ISO-10303-21;`;

      const generated = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=ADVANCED_FACE('F1',(#10),#20,.T.);
#3=PLANE('P',#1);
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `topo1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `topo2_${Date.now()}.step`);
      fs.writeFileSync(file1, original);
      fs.writeFileSync(file2, generated);

      try {
        const result = cadGeometryComparisonEngine.compare(file1, file2);

        expect(result.topologySimilarity).toBeLessThan(0.8);
        const topoMetric = result.metrics.find(m => m.metric === "Topology");
        expect(topoMetric?.passed).toBe(false);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });

    it("should use custom thresholds when provided", () => {
      const original = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(100.0,100.0,100.0));
ENDSEC;
END-ISO-10303-21;`;

      const generated = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(108.0,100.0,100.0));
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `thresh1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `thresh2_${Date.now()}.step`);
      fs.writeFileSync(file1, original);
      fs.writeFileSync(file2, generated);

      try {
        // With default 2% bbox threshold, should fail
        const strictResult = cadGeometryComparisonEngine.compare(file1, file2);
        expect(strictResult.metrics.find(m => m.metric === "Bounding Box")?.passed).toBe(false);

        // With relaxed 10% threshold, should pass
        const relaxedResult = cadGeometryComparisonEngine.compare(file1, file2, {
          bboxDeltaPercent: 10,
        });
        expect(relaxedResult.metrics.find(m => m.metric === "Bounding Box")?.passed).toBe(true);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH COMPARISON
  // ─────────────────────────────────────────────────────────────────────────

  describe("Batch Comparison", () => {
    const tmpDir = os.tmpdir();

    it("should process multiple file pairs", () => {
      const content1 = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(10.0,10.0,10.0));
ENDSEC;
END-ISO-10303-21;`;

      const content2 = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(20.0,20.0,20.0));
ENDSEC;
END-ISO-10303-21;`;

      const files: string[] = [];
      for (let i = 0; i < 4; i++) {
        const f = path.join(tmpDir, `batch_${Date.now()}_${i}.step`);
        fs.writeFileSync(f, i < 2 ? content1 : content2);
        files.push(f);
      }

      try {
        const result = cadGeometryComparisonEngine.batchCompare({
          pairs: [
            { original: files[0], generated: files[1] }, // identical
            { original: files[2], generated: files[3] }, // identical
          ],
        });

        expect(result.totalPairs).toBe(2);
        expect(result.passed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.errors).toBe(0);
        expect(result.passRate).toBe(1);
        expect(result.results).toHaveLength(2);
      } finally {
        files.forEach(f => fs.unlinkSync(f));
      }
    });

    it("should handle mixed pass/fail results", () => {
      const small = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(10.0,10.0,10.0));
ENDSEC;
END-ISO-10303-21;`;

      const large = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(50.0,50.0,50.0));
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `mix1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `mix2_${Date.now()}.step`);
      const file3 = path.join(tmpDir, `mix3_${Date.now()}.step`);
      fs.writeFileSync(file1, small);
      fs.writeFileSync(file2, small);
      fs.writeFileSync(file3, large);

      try {
        const result = cadGeometryComparisonEngine.batchCompare({
          pairs: [
            { original: file1, generated: file2 }, // pass
            { original: file1, generated: file3 }, // fail (5x larger)
          ],
        });

        expect(result.passed).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.passRate).toBe(0.5);
        expect(result.failedFiles).toHaveLength(1);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
        fs.unlinkSync(file3);
      }
    });

    it("should handle file not found errors gracefully", () => {
      const validFile = path.join(tmpDir, `valid_${Date.now()}.step`);
      fs.writeFileSync(validFile, `ISO-10303-21;DATA;ENDSEC;END-ISO-10303-21;`);

      try {
        const result = cadGeometryComparisonEngine.batchCompare({
          pairs: [
            { original: validFile, generated: "/nonexistent/file.step" },
          ],
        });

        expect(result.errors).toBe(1);
        expect(result.errorFiles).toHaveLength(1);
        expect(result.errorFiles[0].error).toContain("not found");
      } finally {
        fs.unlinkSync(validFile);
      }
    });

    it("should compute aggregate metrics", () => {
      const content = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(100.0,100.0,100.0));
#3=ADVANCED_FACE('F',(#10),#20,.T.);
ENDSEC;
END-ISO-10303-21;`;

      const files: string[] = [];
      for (let i = 0; i < 4; i++) {
        const f = path.join(tmpDir, `agg_${Date.now()}_${i}.step`);
        fs.writeFileSync(f, content);
        files.push(f);
      }

      try {
        const result = cadGeometryComparisonEngine.batchCompare({
          pairs: [
            { original: files[0], generated: files[1] },
            { original: files[2], generated: files[3] },
          ],
        });

        expect(result.aggregateMetrics.avgVolumeDelta).toBe(0);
        expect(result.aggregateMetrics.avgBboxDelta).toBe(0);
        expect(result.aggregateMetrics.avgTopologySimilarity).toBe(1);
        expect(result.aggregateMetrics.avgFeatureDelta).toBe(0);
      } finally {
        files.forEach(f => fs.unlinkSync(f));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  describe("Error Handling", () => {
    it("should throw for non-existent file", () => {
      expect(() => {
        cadGeometryComparisonEngine.extractMetrics("/nonexistent/path/file.step");
      }).toThrow("File not found");
    });

    it("should handle unknown format gracefully", () => {
      const tmpDir = os.tmpdir();
      const filePath = path.join(tmpDir, `unknown_${Date.now()}.xyz`);
      fs.writeFileSync(filePath, "random content");

      try {
        const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);
        expect(metrics.format).toBe("UNKNOWN");
        expect(metrics.parseErrors.length).toBeGreaterThan(0);
      } finally {
        fs.unlinkSync(filePath);
      }
    });

    it("should validate input object", () => {
      expect(cadGeometryComparisonEngine.validate(null)).toBe("Input must be an object");
      expect(cadGeometryComparisonEngine.validate("string")).toBe("Input must be an object");
      expect(cadGeometryComparisonEngine.validate({})).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────────────

  describe("Recommendations", () => {
    const tmpDir = os.tmpdir();

    it("should generate recommendations for failed metrics", () => {
      const original = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(100.0,100.0,100.0));
#3=ADVANCED_FACE('F1',(#10),#20,.T.);
#4=ADVANCED_FACE('F2',(#10),#20,.T.);
#5=CYLINDRICAL_SURFACE('C',#1,10.0);
ENDSEC;
END-ISO-10303-21;`;

      const generated = `ISO-10303-21;
DATA;
#1=CARTESIAN_POINT('P',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('P',(150.0,100.0,100.0));
#3=ADVANCED_FACE('F1',(#10),#20,.T.);
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `rec1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `rec2_${Date.now()}.step`);
      fs.writeFileSync(file1, original);
      fs.writeFileSync(file2, generated);

      try {
        const result = cadGeometryComparisonEngine.compare(file1, file2);

        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations.some(r => r.includes("Volume") || r.includes("Bounding"))).toBe(true);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });

    it("should report missing features", () => {
      const original = `ISO-10303-21;
DATA;
#1=CYLINDRICAL_SURFACE('C',#2,10.0);
#2=CARTESIAN_POINT('P',(0.0,0.0,0.0));
ENDSEC;
END-ISO-10303-21;`;

      const generated = `ISO-10303-21;
DATA;
#1=PLANE('P',#2);
#2=CARTESIAN_POINT('P',(0.0,0.0,0.0));
ENDSEC;
END-ISO-10303-21;`;

      const file1 = path.join(tmpDir, `feat1_${Date.now()}.step`);
      const file2 = path.join(tmpDir, `feat2_${Date.now()}.step`);
      fs.writeFileSync(file1, original);
      fs.writeFileSync(file2, generated);

      try {
        const result = cadGeometryComparisonEngine.compare(file1, file2);

        expect(result.recommendations.some(r => r.includes("Missing features") || r.includes("Extra features"))).toBe(true);
      } finally {
        fs.unlinkSync(file1);
        fs.unlinkSync(file2);
      }
    });
  });
});
