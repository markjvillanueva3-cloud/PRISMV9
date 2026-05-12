/**
 * HarvestPipelineEngine — Tests for harvest orchestration
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HarvestPipelineEngine,
  type HarvestRecord,
} from "../engines/HarvestPipelineEngine.js";
import type { ScannedFile } from "../engines/FolderScannerEngine.js";

function makeFile(overrides: Partial<ScannedFile> = {}): ScannedFile {
  return {
    file_path: overrides.file_path ?? "/test/file.nc",
    relative_path: "file.nc",
    filename: "file.nc",
    extension: ".nc",
    file_type: overrides.file_type ?? "cnc_program",
    size_bytes: 1024,
    mtime_ms: Date.now(),
    parent_folder: "/test",
    seed_domain: overrides.seed_domain ?? "programs",
    is_new: true,
    is_changed: false,
    ...overrides,
  };
}

describe("HarvestPipelineEngine", () => {
  describe("getRoutes", () => {
    it("has routes for 8 file types", () => {
      const routes = HarvestPipelineEngine.getRoutes();
      expect(routes.length).toBe(8);
      expect(routes.map(r => r.fileType)).toContain("cnc_program");
      expect(routes.map(r => r.fileType)).toContain("post_processor");
      expect(routes.map(r => r.fileType)).toContain("probing_cycle");
      expect(routes.map(r => r.fileType)).toContain("cad_file");
      expect(routes.map(r => r.fileType)).toContain("tool_database");
      expect(routes.map(r => r.fileType)).toContain("pdf");
      expect(routes.map(r => r.fileType)).toContain("formula_script");
    });

    it("routes CNC programs to UnifiedProgramParserEngine", () => {
      const route = HarvestPipelineEngine.getRoute("cnc_program");
      expect(route).toBeDefined();
      expect(route!.engineName).toBe("UnifiedProgramParserEngine");
      expect(route!.method).toBe("parseFile");
    });

    it("routes probing cycles to ProbingCycleEngine", () => {
      const route = HarvestPipelineEngine.getRoute("probing_cycle");
      expect(route).toBeDefined();
      expect(route!.engineName).toBe("ProbingCycleEngine");
    });

    it("returns null for unsupported types", () => {
      const route = HarvestPipelineEngine.getRoute("image");
      expect(route).toBeNull();
    });
  });

  describe("queueFiles", () => {
    it("queues supported files as pending", () => {
      const files = [
        makeFile({ file_path: "/test/a.nc", file_type: "cnc_program" }),
        makeFile({ file_path: "/test/b.pdf", file_type: "pdf", extension: ".pdf", filename: "b.pdf" }),
      ];
      const result = HarvestPipelineEngine.queueFiles(files);
      expect(result.queued).toBe(2);
      expect(result.unsupported).toBe(0);
    });

    it("skips unsupported file types", () => {
      const files = [
        makeFile({ file_path: "/test/c.jpg", file_type: "image", extension: ".jpg" }),
      ];
      const result = HarvestPipelineEngine.queueFiles(files);
      expect(result.queued).toBe(0);
      expect(result.unsupported).toBe(1);
    });

    it("queues resource-specific types correctly", () => {
      const files = [
        makeFile({ file_path: "/test/d.cyc", file_type: "probing_cycle", extension: ".cyc" }),
        makeFile({ file_path: "/test/e.js", file_type: "formula_script", extension: ".js" }),
      ];
      const result = HarvestPipelineEngine.queueFiles(files);
      expect(result.queued).toBe(2);
    });
  });

  describe("markComplete / markFailed", () => {
    it("marks a file as complete with extracted item count", () => {
      const files = [makeFile({ file_path: "/test/mark.nc" })];
      HarvestPipelineEngine.queueFiles(files);
      HarvestPipelineEngine.markComplete("/test/mark.nc", 5);
      const pending = HarvestPipelineEngine.getPendingFiles("cnc_program");
      expect(pending.find(r => r.filePath === "/test/mark.nc")).toBeUndefined();
    });

    it("marks a file as failed with error", () => {
      const files = [makeFile({ file_path: "/test/fail.nc" })];
      HarvestPipelineEngine.queueFiles(files);
      HarvestPipelineEngine.markFailed("/test/fail.nc", "parse error");
      const progress = HarvestPipelineEngine.getProgress();
      expect(progress.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe("retryFailed", () => {
    it("resets failed records to pending", () => {
      const files = [makeFile({ file_path: "/test/retry.nc" })];
      HarvestPipelineEngine.queueFiles(files);
      HarvestPipelineEngine.markFailed("/test/retry.nc", "temp error");
      const retried = HarvestPipelineEngine.retryFailed();
      expect(retried).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getSummary", () => {
    it("returns summary with routes and status counts", () => {
      const summary = HarvestPipelineEngine.getSummary();
      expect(summary.routes).toHaveLength(8);
      expect(summary.totalRecords).toBeGreaterThanOrEqual(0);
      expect(typeof summary.totalItemsExtracted).toBe("number");
    });
  });
});
