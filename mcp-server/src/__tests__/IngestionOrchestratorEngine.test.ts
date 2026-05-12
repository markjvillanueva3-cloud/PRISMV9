/**
 * IngestionOrchestratorEngine tests — INGEST-MS0 / U-ING02
 *
 * Tests file routing, batch processing, status tracking, retry logic,
 * and integration with FolderScannerEngine output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { ScannedFile } from "../engines/FolderScannerEngine.js";
import { ingestionOrchestratorEngine } from "../engines/IngestionOrchestratorEngine.js";

function makeFile(overrides: Partial<ScannedFile> = {}): ScannedFile {
  return {
    file_path: "H:/prism/JM Die/CNC LATHE/ACME/test.MIN",
    relative_path: "CNC LATHE/ACME/test.MIN",
    filename: "test.MIN",
    extension: ".min",
    file_type: "cnc_program",
    size_bytes: 1024,
    mtime_ms: Date.now(),
    parent_folder: "ACME",
    seed_domain: "programs",
    is_new: true,
    is_changed: false,
    ...overrides,
  };
}

describe("IngestionOrchestratorEngine", () => {
  beforeEach(() => {
    ingestionOrchestratorEngine.reset();
  });

  // ── ROUTING ──────────────────────────────────────────────────────────

  describe("routeFile", () => {
    it("routes CNC programs to program_census", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "cnc_program" }))).toBe("program_census");
    });

    it("routes CAM files to cad_index", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "cam_file" }))).toBe("cad_index");
    });

    it("routes CAD files to cad_index", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "cad_file" }))).toBe("cad_index");
    });

    it("routes drawings to cad_index", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "drawing" }))).toBe("cad_index");
    });

    it("routes PDFs to document_inbox", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "pdf" }))).toBe("document_inbox");
    });

    it("routes spreadsheets to spreadsheet_import", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "spreadsheet" }))).toBe("spreadsheet_import");
    });

    it("routes images to image_ocr", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "image" }))).toBe("image_ocr");
    });

    it("routes archives to archive_extract", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "archive" }))).toBe("archive_extract");
    });

    it("skips post_processor files", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "post_processor" }))).toBe("skip");
    });

    it("skips unknown file types", () => {
      expect(ingestionOrchestratorEngine.routeFile(makeFile({ file_type: "other" }))).toBe("skip");
    });
  });

  // ── BATCH PROCESSING (DRY RUN) ──────────────────────────────────────

  describe("processBatch (dry_run)", () => {
    it("processes batch in dry run mode", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN", filename: "a.MIN", file_type: "cnc_program" }),
        makeFile({ file_path: "H:/test/b.pdf", filename: "b.pdf", file_type: "pdf" }),
        makeFile({ file_path: "H:/test/c.xlsx", filename: "c.xlsx", file_type: "spreadsheet" }),
      ];

      const result = await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });
      expect(result.total_files).toBe(3);
      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.by_target["program_census"]).toBe(1);
      expect(result.by_target["document_inbox"]).toBe(1);
      expect(result.by_target["spreadsheet_import"]).toBe(1);
    });

    it("skips files with skip target", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN", file_type: "cnc_program" }),
        makeFile({ file_path: "H:/test/b.cps", file_type: "post_processor" }),
        makeFile({ file_path: "H:/test/c.txt", file_type: "other" }),
      ];

      const result = await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });
      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(2);
    });

    it("filters by target", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN", file_type: "cnc_program" }),
        makeFile({ file_path: "H:/test/b.pdf", file_type: "pdf" }),
      ];

      const result = await ingestionOrchestratorEngine.processBatch({
        files,
        dry_run: true,
        targets: ["program_census"],
      });
      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("filters by seed domain", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN", seed_domain: "programs" }),
        makeFile({ file_path: "H:/test/b.pdf", seed_domain: "prints" }),
      ];

      const result = await ingestionOrchestratorEngine.processBatch({
        files,
        dry_run: true,
        seed_domain: "programs",
      });
      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("skips already-completed files", async () => {
      const files = [
        makeFile({ file_path: "H:/test/done.MIN", file_type: "cnc_program" }),
      ];

      // First run
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });
      // Manually mark complete
      const record = ingestionOrchestratorEngine.getFileStatus("H:/test/done.MIN");
      if (record) record.status = "complete";

      // Second run should skip
      const result = await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });
      expect(result.skipped).toBe(1);
    });
  });

  // ── STATUS TRACKING ──────────────────────────────────────────────────

  describe("status tracking", () => {
    it("tracks file status after dry run", async () => {
      const files = [makeFile({ file_path: "H:/test/tracked.MIN" })];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      const status = ingestionOrchestratorEngine.getFileStatus("H:/test/tracked.MIN");
      expect(status).not.toBeNull();
      expect(status!.target).toBe("program_census");
      expect(status!.status).toBe("pending"); // dry run sets pending
    });

    it("getByStatus returns filtered records", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN" }),
        makeFile({ file_path: "H:/test/b.MIN" }),
      ];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      const pending = ingestionOrchestratorEngine.getByStatus("pending");
      expect(pending.length).toBe(2);
    });

    it("getByTarget returns filtered records", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN", file_type: "cnc_program" }),
        makeFile({ file_path: "H:/test/b.pdf", file_type: "pdf" }),
      ];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      const programs = ingestionOrchestratorEngine.getByTarget("program_census");
      expect(programs.length).toBe(1);
      const docs = ingestionOrchestratorEngine.getByTarget("document_inbox");
      expect(docs.length).toBe(1);
    });

    it("getStats returns aggregate counts", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN" }),
        makeFile({ file_path: "H:/test/b.MIN" }),
        makeFile({ file_path: "H:/test/c.MIN" }),
      ];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      const stats = ingestionOrchestratorEngine.getStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.last_run_at).toBeTruthy();
    });
  });

  // ── RETRY LOGIC ──────────────────────────────────────────────────────

  describe("retry logic", () => {
    it("retryFailed resets a failed record to pending", async () => {
      const files = [makeFile({ file_path: "H:/test/fail.MIN" })];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      // Manually set to failed
      const record = ingestionOrchestratorEngine.getFileStatus("H:/test/fail.MIN");
      if (record) { record.status = "failed"; record.error = "test error"; }

      const result = ingestionOrchestratorEngine.retryFailed("H:/test/fail.MIN");
      expect(result).toBe(true);

      const updated = ingestionOrchestratorEngine.getFileStatus("H:/test/fail.MIN");
      expect(updated!.status).toBe("pending");
      expect(updated!.error).toBeNull();
    });

    it("retryFailed returns false for non-failed records", () => {
      expect(ingestionOrchestratorEngine.retryFailed("H:/test/nonexistent.MIN")).toBe(false);
    });

    it("retryAllFailed resets all failed records", async () => {
      const files = [
        makeFile({ file_path: "H:/test/a.MIN" }),
        makeFile({ file_path: "H:/test/b.MIN" }),
      ];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      // Manually fail both
      for (const f of files) {
        const rec = ingestionOrchestratorEngine.getFileStatus(f.file_path);
        if (rec) { rec.status = "failed"; rec.error = "test"; }
      }

      const count = ingestionOrchestratorEngine.retryAllFailed();
      expect(count).toBe(2);
    });
  });

  // ── RESET ────────────────────────────────────────────────────────────

  describe("reset", () => {
    it("clears all state", async () => {
      const files = [makeFile({ file_path: "H:/test/a.MIN" })];
      await ingestionOrchestratorEngine.processBatch({ files, dry_run: true });

      ingestionOrchestratorEngine.reset();

      const stats = ingestionOrchestratorEngine.getStats();
      expect(stats.total).toBe(0);
      expect(ingestionOrchestratorEngine.getFileStatus("H:/test/a.MIN")).toBeNull();
    });
  });

  // ── LIVE PROCESSING (non-dry-run) ────────────────────────────────────

  describe("live processing", () => {
    it("processes CNC programs and records result IDs", async () => {
      const files = [
        makeFile({
          file_path: "H:/prism/JM Die/CNC LATHE/ACME/test.MIN",
          relative_path: "CNC LATHE/ACME/test.MIN",
          file_type: "cnc_program",
        }),
      ];

      const result = await ingestionOrchestratorEngine.processBatch({ files });
      expect(result.succeeded).toBe(1);

      const status = ingestionOrchestratorEngine.getFileStatus(files[0].file_path);
      expect(status!.status).toBe("complete");
      expect(status!.result_id).toContain("census:");
      expect(status!.processed_at).toBeTruthy();
    });

    it("processes CAD files and records result IDs", async () => {
      const files = [
        makeFile({
          file_path: "H:/prism/JM Die/ROKU-ROKU/ACME/model.mcx-8",
          relative_path: "ROKU-ROKU/ACME/model.mcx-8",
          filename: "model.mcx-8",
          file_type: "cam_file",
        }),
      ];

      const result = await ingestionOrchestratorEngine.processBatch({ files });
      expect(result.succeeded).toBe(1);

      const status = ingestionOrchestratorEngine.getFileStatus(files[0].file_path);
      expect(status!.result_id).toContain("cad:");
    });
  });
});
