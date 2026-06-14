/**
 * Tests for U-CAD-VOLUME-METRIC (compare() defect #1): STEP/IGES "volume" is a bounding-box
 * PROXY, not true solid volume. extractMetrics now tags volumeMethod + warns; compare() marks
 * the Volume metric ADVISORY (never false-fails) when the two files' volume methods differ.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cadGeometryComparisonEngine } from "../../engines/CADGeometryComparisonEngine.js";

function tmp(name: string, body: string): string {
  const f = path.join(os.tmpdir(), `prism-volmethod-${name}-${body.length}.${name.split(".").pop()}`);
  fs.writeFileSync(f, body, "utf8");
  return f;
}
function step(points: Array<[number, number, number]>): string {
  const pts = points.map((p, i) => `#${100 + i}=CARTESIAN_POINT('',(${p[0]},${p[1]},${p[2]}));`).join("\n");
  return `ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\n#10=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );\n${pts}\nENDSEC;\nEND-ISO-10303-21;\n`;
}
const STL_TETRA =
  "solid t\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 10 0 0\nvertex 0 10 0\nendloop\nendfacet\n" +
  "facet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 0 10 0\nvertex 0 0 10\nendloop\nendfacet\nendsolid t\n";

describe("U-CAD-VOLUME-METRIC volume-method tagging", () => {
  it("STEP extractMetrics tags volumeMethod 'bbox-proxy' + emits a proxy warning", () => {
    const f = tmp("a.step", step([[0, 0, 0], [10, 0, 0], [0, 20, 0], [0, 0, 30]]));
    try {
      const m = cadGeometryComparisonEngine.extractMetrics(f);
      expect(m.volumeMethod).toBe("bbox-proxy");
      // bbox-proxy volume = 10*20*30 = 6000 (NOT a solid volume)
      expect(m.volume).toBeCloseTo(6000, 3);
      expect(m.parseWarnings.some((w) => /bounding-box proxy/i.test(w))).toBe(true);
    } finally {
      fs.unlinkSync(f);
    }
  });

  it("real blisk.stp tags volumeMethod 'bbox-proxy' (the 451.5M reading is a bbox, not solid)", () => {
    const ref = "H:/PRISM/resources/CAD FILES/blisk.stp";
    if (!fs.existsSync(ref)) return; // skip-loud if the reference is absent on this host
    const m = cadGeometryComparisonEngine.extractMetrics(ref);
    expect(m.volumeMethod).toBe("bbox-proxy");
    expect(m.volume).toBeGreaterThan(0);
  });

  it("STL extractMetrics tags volumeMethod 'mesh' (real signed-tet integration)", () => {
    const f = tmp("a.stl", STL_TETRA);
    try {
      const m = cadGeometryComparisonEngine.extractMetrics(f);
      expect(m.volumeMethod).toBe("mesh");
    } finally {
      fs.unlinkSync(f);
    }
  });

  it("compare proxy-vs-proxy gates normally and annotates the bbox-proxy nature", () => {
    const a = tmp("a.step", step([[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]]));
    const b = tmp("b.step", step([[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]]));
    try {
      const r = cadGeometryComparisonEngine.compare(a, b);
      const vol = r.metrics.find((mm) => mm.metric === "Volume")!;
      expect(vol.passed).toBe(true); // identical -> 0% delta, gated normally (methods match)
      expect(vol.details).toMatch(/bbox-proxy/i);
    } finally {
      fs.unlinkSync(a);
      fs.unlinkSync(b);
    }
  });

  it("compare with DIFFERING volume methods (STEP bbox-proxy vs STL mesh) is ADVISORY, never false-fails", () => {
    const stepF = tmp("a.step", step([[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]]));
    const stlF = tmp("b.stl", STL_TETRA);
    try {
      const r = cadGeometryComparisonEngine.compare(stepF, stlF);
      const vol = r.metrics.find((mm) => mm.metric === "Volume")!;
      // bbox-proxy (10*10*10=1000) vs mesh (~tiny) would be a huge bogus delta -> must NOT fail
      expect(vol.passed).toBe(true);
      expect(vol.details).toMatch(/ADVISORY|methods differ/i);
    } finally {
      fs.unlinkSync(stepF);
      fs.unlinkSync(stlF);
    }
  });
});
