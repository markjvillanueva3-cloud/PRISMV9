/**
 * FolderScannerEngine tests — INGEST-MS0 / U-ING01
 *
 * Tests recursive scanning, file classification, change detection,
 * state persistence, and seed domain inference against JM Die data.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { folderScannerEngine } from "../engines/FolderScannerEngine.js";

// Create a temp directory for test files
function createTestDir(): string {
  const dir = path.join(os.tmpdir(), `prism-scanner-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTestFile(dir: string, name: string, content = ""): string {
  const filePath = path.join(dir, name);
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanDir(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

describe("FolderScannerEngine", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    folderScannerEngine.resetAllState();
  });

  afterEach(() => {
    cleanDir(testDir);
  });

  // ── FILE CLASSIFICATION ──────────────────────────────────────────────

  describe("classifyFile", () => {
    it("classifies CNC programs", () => {
      expect(folderScannerEngine.classifyFile("A-11-10715-0-A.MIN")).toBe("cnc_program");
      expect(folderScannerEngine.classifyFile("program.nc")).toBe("cnc_program");
      expect(folderScannerEngine.classifyFile("part.hnc")).toBe("cnc_program");
      expect(folderScannerEngine.classifyFile("tool.tap")).toBe("cnc_program");
    });

    it("classifies CAM files", () => {
      expect(folderScannerEngine.classifyFile("9091904.mcx-8")).toBe("cam_file");
      expect(folderScannerEngine.classifyFile("old_file.mcx")).toBe("cam_file");
      expect(folderScannerEngine.classifyFile("wire.esp")).toBe("cam_file");
    });

    it("classifies CAD files", () => {
      expect(folderScannerEngine.classifyFile("part.ipt")).toBe("cad_file");
      expect(folderScannerEngine.classifyFile("assembly.iam")).toBe("cad_file");
      expect(folderScannerEngine.classifyFile("model.stp")).toBe("cad_file");
      expect(folderScannerEngine.classifyFile("model.step")).toBe("cad_file");
      expect(folderScannerEngine.classifyFile("HAAS VF-1.SLDPRT")).toBe("cad_file");
    });

    it("classifies drawings", () => {
      expect(folderScannerEngine.classifyFile("12345.dwg")).toBe("drawing");
      expect(folderScannerEngine.classifyFile("12345.dxf")).toBe("drawing");
    });

    it("classifies documents", () => {
      expect(folderScannerEngine.classifyFile("print.pdf")).toBe("pdf");
      expect(folderScannerEngine.classifyFile("employees.xlsx")).toBe("spreadsheet");
      expect(folderScannerEngine.classifyFile("data.csv")).toBe("spreadsheet");
    });

    it("classifies images", () => {
      expect(folderScannerEngine.classifyFile("photo.jpg")).toBe("image");
      expect(folderScannerEngine.classifyFile("scan.png")).toBe("image");
      expect(folderScannerEngine.classifyFile("blueprint.tif")).toBe("image");
    });

    it("returns other for unknown extensions", () => {
      expect(folderScannerEngine.classifyFile("readme.txt")).toBe("other");
      expect(folderScannerEngine.classifyFile("setup.exe")).toBe("other");
    });

    it("handles case-insensitive matching", () => {
      expect(folderScannerEngine.classifyFile("PART.MIN")).toBe("cnc_program");
      expect(folderScannerEngine.classifyFile("Model.STP")).toBe("cad_file");
      expect(folderScannerEngine.classifyFile("PRINT.PDF")).toBe("pdf");
    });
  });

  // ── SEED DOMAIN INFERENCE ────────────────────────────────────────────

  describe("inferSeedDomain", () => {
    it("infers programs from path", () => {
      expect(folderScannerEngine.inferSeedDomain("H:/prism/JM Die/CNC LATHE/ACME/test.MIN", "H:/prism/JM Die")).toBe("programs");
    });

    it("infers prints from drawing path", () => {
      expect(folderScannerEngine.inferSeedDomain("H:/prism/JM Die/Prints/drawing.pdf", "H:/prism/JM Die")).toBe("prints");
    });

    it("infers employee domain from path", () => {
      expect(folderScannerEngine.inferSeedDomain("H:/prism/JM Die/Employee Database/roster.xlsx", "H:/prism/JM Die")).toBe("employee_database");
    });

    it("infers tool holders from path", () => {
      expect(folderScannerEngine.inferSeedDomain("H:/prism/JM Die/Tool Holders/cat40.pdf", "H:/prism/JM Die")).toBe("tool_holders");
    });

    it("infers from file type when path is ambiguous", () => {
      expect(folderScannerEngine.inferSeedDomain("H:/prism/JM Die/misc/part.MIN", "H:/prism/JM Die")).toBe("programs");
      expect(folderScannerEngine.inferSeedDomain("H:/prism/JM Die/misc/drawing.dwg", "H:/prism/JM Die")).toBe("prints");
    });
  });

  // ── SCANNING ─────────────────────────────────────────────────────────

  describe("scan", () => {
    it("scans directory and finds all files", () => {
      writeTestFile(testDir, "program1.MIN", "G0 X0 Z0");
      writeTestFile(testDir, "program2.MIN", "G1 X10 Z-5 F0.01");
      writeTestFile(testDir, "drawing.pdf", "fake-pdf");

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.total_files).toBe(3);
      expect(result.new_files).toBe(3);
      expect(result.changed_files).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it("classifies files by type", () => {
      writeTestFile(testDir, "prog.MIN");
      writeTestFile(testDir, "model.mcx-8");
      writeTestFile(testDir, "print.pdf");
      writeTestFile(testDir, "data.xlsx");

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.by_type["cnc_program"]).toBe(1);
      expect(result.by_type["cam_file"]).toBe(1);
      expect(result.by_type["pdf"]).toBe(1);
      expect(result.by_type["spreadsheet"]).toBe(1);
    });

    it("scans nested directories", () => {
      writeTestFile(testDir, "ACME/part1.MIN");
      writeTestFile(testDir, "ACME/part2.MIN");
      writeTestFile(testDir, "AGRATI/part3.MIN");

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.total_files).toBe(3);
      expect(result.files[0].parent_folder).toBeDefined();
    });

    it("skips $RECYCLE.BIN and dot directories", () => {
      writeTestFile(testDir, ".hidden/secret.txt");
      writeTestFile(testDir, "$RECYCLE.BIN/deleted.txt");
      writeTestFile(testDir, "valid.MIN");

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.total_files).toBe(1);
    });

    it("returns error for non-existent path", () => {
      const result = folderScannerEngine.scan({ root_path: path.join(testDir, "nonexistent") });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.total_files).toBe(0);
    });

    it("records relative paths", () => {
      writeTestFile(testDir, "customer/part.MIN");
      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.files[0].relative_path).toBe("customer/part.MIN");
    });
  });

  // ── CHANGE DETECTION ─────────────────────────────────────────────────

  describe("change detection", () => {
    it("detects new files on second scan", () => {
      writeTestFile(testDir, "existing.MIN");
      folderScannerEngine.scan({ root_path: testDir });

      writeTestFile(testDir, "new_file.MIN");
      const result = folderScannerEngine.scan({ root_path: testDir });

      expect(result.new_files).toBe(1);
      expect(result.files.length).toBe(1); // only new/changed returned by default
      expect(result.files[0].filename).toBe("new_file.MIN");
      expect(result.files[0].is_new).toBe(true);
    });

    it("detects changed files by mtime", () => {
      const filePath = writeTestFile(testDir, "changing.MIN", "original");
      folderScannerEngine.scan({ root_path: testDir });

      // Modify the file (need to wait for mtime to change)
      const origStat = fs.statSync(filePath);
      fs.utimesSync(filePath, origStat.atime, new Date(origStat.mtime.getTime() + 1000));

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.changed_files).toBe(1);
      expect(result.files[0].is_changed).toBe(true);
    });

    it("skips unchanged files by default", () => {
      writeTestFile(testDir, "stable.MIN");
      folderScannerEngine.scan({ root_path: testDir });

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.files.length).toBe(0); // no new or changed
      expect(result.unchanged_files).toBe(1);
    });

    it("includes unchanged files when requested", () => {
      writeTestFile(testDir, "stable.MIN");
      folderScannerEngine.scan({ root_path: testDir });

      const result = folderScannerEngine.scan({ root_path: testDir, include_unchanged: true });
      expect(result.files.length).toBe(1);
    });
  });

  // ── FILTERING ────────────────────────────────────────────────────────

  describe("filtering", () => {
    it("filters by file type", () => {
      writeTestFile(testDir, "prog.MIN");
      writeTestFile(testDir, "model.mcx-8");
      writeTestFile(testDir, "print.pdf");

      const result = folderScannerEngine.scan({
        root_path: testDir,
        file_types: ["cnc_program"],
      });
      expect(result.total_files).toBe(1);
      expect(result.files[0].file_type).toBe("cnc_program");
    });
  });

  // ── STATE MANAGEMENT ─────────────────────────────────────────────────

  describe("state management", () => {
    it("getState returns scan state after scan", () => {
      writeTestFile(testDir, "test.MIN");
      folderScannerEngine.scan({ root_path: testDir });

      const state = folderScannerEngine.getState(testDir);
      expect(state).not.toBeNull();
      expect(state!.total_files_tracked).toBe(1);
      expect(state!.last_scan_at).toBeDefined();
    });

    it("getSummary returns aggregate stats", () => {
      writeTestFile(testDir, "test.MIN");
      folderScannerEngine.scan({ root_path: testDir });

      const summary = folderScannerEngine.getSummary();
      expect(summary.roots_tracked).toBeGreaterThanOrEqual(1);
      expect(summary.total_files_tracked).toBeGreaterThanOrEqual(1);
    });

    it("resetState forces full rescan", () => {
      writeTestFile(testDir, "test.MIN");
      folderScannerEngine.scan({ root_path: testDir });

      folderScannerEngine.resetState(testDir);
      expect(folderScannerEngine.getState(testDir)).toBeNull();

      const result = folderScannerEngine.scan({ root_path: testDir });
      expect(result.new_files).toBe(1); // all files are "new" after reset
    });
  });

  // ── REAL JM DIE DATA (integration test, skips if path unavailable) ──

  describe("JM Die integration", () => {
    const jmDieRoot = "H:/prism/JM Die";
    const jmDieExists = fs.existsSync(jmDieRoot);

    it.skipIf(!jmDieExists)("scans JM Die CNC LATHE folder", () => {
      const result = folderScannerEngine.scan({
        root_path: path.join(jmDieRoot, "CNC LATHE"),
        file_types: ["cnc_program"],
      });
      expect(result.total_files).toBeGreaterThan(5000);
      expect(result.errors.length).toBeLessThan(10);
      expect(result.scan_duration_ms).toBeLessThan(30000);
    });

    it.skipIf(!jmDieExists)("scans JM Die WIRE EDM folder", () => {
      const result = folderScannerEngine.scan({
        root_path: path.join(jmDieRoot, "WIRE EDM"),
      });
      expect(result.total_files).toBeGreaterThan(1000);
    });

    it.skipIf(!jmDieExists)("scans JM Die ROKU-ROKU folder", () => {
      const result = folderScannerEngine.scan({
        root_path: path.join(jmDieRoot, "ROKU-ROKU"),
      });
      expect(result.total_files).toBeGreaterThan(500);
    });
  });
});
