/**
 * FixtureCadIngesterEngine Test Suite
 * =====================================
 *
 * LATHE-AWARE-HARDEN MS6 U-LAT44 — Validates fixture CAD ingestion
 * (.ipt/.iam/.step/.iges) with platform-aware fallback.
 *
 * @milestone LATHE-AWARE-HARDEN MS6
 * @unit U-LAT44
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fixtureCadIngesterEngine } from "../engines/FixtureCadIngesterEngine.js";

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cad-"));
});

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

function writeFile(name: string, content: string): string {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content);
  return p;
}

describe("FixtureCadIngesterEngine", () => {
  // ── File kind detection ──────────────────────────────────────────────

  describe("ingestFile() — file kind detection", () => {
    it("returns inventor_part for .ipt extension", async () => {
      const p = writeFile("soft_jaw.ipt", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("inventor_part");
    });

    it("returns inventor_assembly for .iam extension", async () => {
      const p = writeFile("chuck_assembly.iam", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("inventor_assembly");
    });

    it("returns step for .step extension", async () => {
      const p = writeFile("chuck.step", "DATA;\nENDSEC;");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("step");
    });

    it("returns step for .stp extension", async () => {
      const p = writeFile("chuck.stp", "DATA;\nENDSEC;");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("step");
    });

    it("returns iges for .iges extension", async () => {
      const p = writeFile("jaw.iges", "S      1\nG      1\n");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("iges");
    });

    it("returns unknown for missing file", async () => {
      const r = await fixtureCadIngesterEngine.ingestFile("H:/ghost.xyz");
      expect(r.file_kind).toBe("unknown");
      expect(r.parse_warnings.some((w) => /not found/.test(w))).toBe(true);
    });

    it("returns unknown for unsupported extension", async () => {
      const p = writeFile("unknown.xyz", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("unknown");
    });
  });

  // ── Filename component classification ────────────────────────────────

  describe("component classification from filename", () => {
    it("classifies soft_jaw.ipt as soft_jaw kind", async () => {
      const p = writeFile("soft_jaw_ALCOA_die_001.ipt", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.components.length).toBeGreaterThan(0);
      expect(r.components[0]!.kind).toBe("soft_jaw");
    });

    it("classifies chuck.iam as chuck kind", async () => {
      const p = writeFile("chuck_3jaw_200mm.iam", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.components[0]?.kind).toBe("chuck");
    });

    it("classifies tailstock.iges as tailstock kind", async () => {
      const p = writeFile("tailstock_mt4.iges", "S      1\n");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.components[0]?.kind).toBe("tailstock");
    });

    it("classifies steady_rest.ipt as steady_rest kind", async () => {
      const p = writeFile("steady_rest_3point.ipt", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.components[0]?.kind).toBe("steady_rest");
    });
  });

  // ── Inventor platform handling ───────────────────────────────────────

  describe("inventor platform handling", () => {
    it("reports platform_supported=true on Windows", async () => {
      const p = writeFile("win_chuck.ipt", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p, {
        force_platform: "win32",
      });
      expect(r.platform_supported).toBe(true);
    });

    it("reports platform_supported=false on Linux/macOS", async () => {
      const p = writeFile("linux_chuck.ipt", "");
      const r = await fixtureCadIngesterEngine.ingestFile(p, {
        force_platform: "linux",
      });
      expect(r.platform_supported).toBe(false);
      expect(r.parse_warnings.some((w) => /Windows/.test(w))).toBe(true);
      expect(r.fallback_suggestion).toContain("STEP");
    });
  });

  // ── STEP delegation ──────────────────────────────────────────────────

  describe("STEP ingestion delegates to step engine", () => {
    it("extracts components from STEP PRODUCT entities", async () => {
      const step = `DATA;
#10 = CARTESIAN_POINT('origin',(0.0,0.0,0.0));
#11 = CARTESIAN_POINT('pt2',(50.0,0.0,0.0));
#20 = DIRECTION('x',(1.0,0.0,0.0));
#30 = AXIS2_PLACEMENT_3D('chuck_mount',#10,#20);
#40 = PRODUCT('3JAW_CHUCK_200mm','','',(#1));
ENDSEC;`;
      const p = writeFile("chuck.step", step);
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.components.length).toBeGreaterThan(0);
      expect(r.components[0]!.kind).toBe("chuck");
    });

    it("computes bounding_box from axis placements", async () => {
      const step = `DATA;
#10 = CARTESIAN_POINT('a',(0.0,0.0,0.0));
#11 = CARTESIAN_POINT('b',(100.0,50.0,25.0));
#20 = DIRECTION('x',(1.0,0.0,0.0));
#30 = AXIS2_PLACEMENT_3D('p1',#10,#20);
#31 = AXIS2_PLACEMENT_3D('p2',#11,#20);
ENDSEC;`;
      const p = writeFile("bb_test.step", step);
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.bounding_box).toBeDefined();
      expect(r.bounding_box!.span_mm.x).toBe(100);
      expect(r.bounding_box!.span_mm.y).toBe(50);
      expect(r.bounding_box!.span_mm.z).toBe(25);
    });
  });

  // ── IGES handling ────────────────────────────────────────────────────

  describe("IGES ingestion", () => {
    it("parses IGES S/G sections", async () => {
      const iges = `S      1                                                                S      1
G      2                                                                G      2
`;
      const p = writeFile("jaw.iges", iges);
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.file_kind).toBe("iges");
    });

    it("warns on IGES with no S/G sections", async () => {
      const p = writeFile("notreally.iges", "random content");
      const r = await fixtureCadIngesterEngine.ingestFile(p);
      expect(r.parse_warnings.some((w) => /IGES/.test(w))).toBe(true);
    });
  });

  // ── ingestDirectory() ────────────────────────────────────────────────

  describe("ingestDirectory()", () => {
    it("returns empty results for missing directory", async () => {
      const r = await fixtureCadIngesterEngine.ingestDirectory("H:/ghost_fixtures");
      expect(r.results.length).toBe(0);
    });

    it("processes all CAD files in a directory", async () => {
      const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cad-dir-"));
      try {
        fs.writeFileSync(path.join(dirA, "a.step"), "DATA;\nENDSEC;");
        fs.writeFileSync(path.join(dirA, "b.iges"), "S 1\nG 1\n");
        fs.writeFileSync(path.join(dirA, "c.ipt"), "");
        const r = await fixtureCadIngesterEngine.ingestDirectory(dirA);
        expect(r.results.length).toBe(3);
        expect(r.summary.step).toBe(1);
        expect(r.summary.iges).toBe(1);
        expect(r.summary.inventor_part).toBe(1);
      } finally {
        fs.rmSync(dirA, { recursive: true, force: true });
      }
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports supported extensions", () => {
      const stats = fixtureCadIngesterEngine.getStats();
      expect(stats.supported_extensions).toContain(".ipt");
      expect(stats.supported_extensions).toContain(".step");
      expect(stats.supported_extensions).toContain(".iges");
    });

    it("reports component classes", () => {
      const stats = fixtureCadIngesterEngine.getStats();
      expect(stats.component_classes).toContain("chuck");
      expect(stats.component_classes).toContain("soft_jaw");
    });

    it("documents fallback chain", () => {
      const stats = fixtureCadIngesterEngine.getStats();
      expect(stats.fallback_chain).toContain("STEP");
    });
  });
});
