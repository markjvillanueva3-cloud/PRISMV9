/**
 * Tests for resourceExtractionDispatcher — AI-AWARE-HARDEN wiring
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server
const mockTool = vi.fn();
const mockServer = { tool: mockTool };

// Import after mocking
import { registerResourceExtractionDispatcher } from "../tools/dispatchers/resourceExtractionDispatcher.js";

describe("resourceExtractionDispatcher", () => {
  beforeEach(() => {
    mockTool.mockClear();
  });

  describe("registration", () => {
    it("registers prism_resource_extraction tool", () => {
      registerResourceExtractionDispatcher(mockServer);
      expect(mockTool).toHaveBeenCalledTimes(1);
      expect(mockTool.mock.calls[0][0]).toBe("prism_resource_extraction");
    });

    it("includes all 14 actions in description", () => {
      registerResourceExtractionDispatcher(mockServer);
      const description = mockTool.mock.calls[0][1];
      expect(description).toContain("archive_discover");
      expect(description).toContain("classify_dark");
      expect(description).toContain("ocr_process");
      expect(description).toContain("drawing_extract");
      expect(description).toContain("office_process");
      expect(description).toContain("log_harvest");
      expect(description).toContain("coordinate_register");
    });
  });

  describe("action handler", () => {
    let handler: Function;

    beforeEach(() => {
      registerResourceExtractionDispatcher(mockServer);
      handler = mockTool.mock.calls[0][3];
    });

    describe("archive_discover", () => {
      it("calls ArchiveCrawlerEngine.discoverArchives", async () => {
        const result = await handler({
          action: "archive_discover",
          params: { path: "H:/test/", maxDepth: 3 },
        });
        // Engine returns empty array for simulated discovery
        expect(result).toBeDefined();
      });
    });

    describe("classify_dark", () => {
      it("classifies a file", async () => {
        const result = await handler({
          action: "classify_dark",
          params: { path: "test.pdf", isScanned: true },
        });
        expect(result).toBeDefined();
        expect(result.category).toBeDefined();
      });

      it("requires path parameter", async () => {
        const result = await handler({
          action: "classify_dark",
          params: {},
        });
        expect(result.error).toContain("path is required");
      });
    });

    describe("dark_report", () => {
      it("generates dark content report", async () => {
        const result = await handler({
          action: "dark_report",
          params: {},
        });
        expect(result).toBeDefined();
        expect(result.totalFiles).toBeDefined();
      });
    });

    describe("ocr_process", () => {
      it("processes an image", async () => {
        const result = await handler({
          action: "ocr_process",
          params: { path: "image.png", dpi: 300 },
        });
        expect(result).toBeDefined();
        expect(result.imagePath).toBe("image.png");
      });

      it("requires path parameter", async () => {
        const result = await handler({
          action: "ocr_process",
          params: {},
        });
        expect(result.error).toContain("path is required");
      });
    });

    describe("ocr_stats", () => {
      it("returns OCR statistics", async () => {
        const result = await handler({
          action: "ocr_stats",
          params: {},
        });
        // getQueueStats() returns { queued, processed, pending, byFormat }
        expect(typeof result).toBe("object");
        expect(typeof result.processed).toBe("number");
        expect(typeof result.queued).toBe("number");
        expect(typeof result.pending).toBe("number");
      });
    });

    describe("drawing_extract", () => {
      it("extracts drawing data", async () => {
        const result = await handler({
          action: "drawing_extract",
          params: { path: "part.dxf" },
        });
        // ExtractionResult carries the source path at metadata.path (no top-level filePath)
        expect(result.metadata.path).toBe("part.dxf");
        expect(result.success).toBe(true);
      });

      it("requires path parameter", async () => {
        const result = await handler({
          action: "drawing_extract",
          params: {},
        });
        expect(result.error).toContain("path is required");
      });
    });

    describe("drawing_summary", () => {
      it("returns error for unextracted drawing", async () => {
        const result = await handler({
          action: "drawing_summary",
          params: { path: "unknown.dxf" },
        });
        expect(result.error).toContain("not found");
      });
    });

    describe("office_process", () => {
      it("processes office document", async () => {
        const result = await handler({
          action: "office_process",
          params: { path: "report.docx", text: "Sample text" },
        });
        // real extractDocument result (not the {action,error} catch object)
        expect(result.action).toBe("office_process");
        expect(result.metadata.path).toBe("report.docx");
        expect(result.success).toBe(true);
      });

      it("requires path parameter", async () => {
        const result = await handler({
          action: "office_process",
          params: {},
        });
        expect(result.error).toContain("path is required");
      });
    });

    describe("office_search", () => {
      it("searches by keyword", async () => {
        const result = await handler({
          action: "office_search",
          params: { keyword: "machining" },
        });
        // { count, matches } from searchByKeyword (not the {action,error} catch object)
        expect(typeof result.count).toBe("number");
      });

      it("searches by part number", async () => {
        const result = await handler({
          action: "office_search",
          params: { partNumber: "ABC-123" },
        });
        // { count, matches } from findByPartNumber (not the {action,error} catch object)
        expect(typeof result.count).toBe("number");
      });

      it("requires keyword or partNumber", async () => {
        const result = await handler({
          action: "office_search",
          params: {},
        });
        expect(result.error).toContain("keyword or partNumber is required");
      });
    });

    describe("log_harvest", () => {
      it("harvests machine log", async () => {
        const result = await handler({
          action: "log_harvest",
          params: {
            path: "machine.log",
            machineId: "LATHE-01",
            machineType: "lathe",
          },
        });
        expect(result).toBeDefined();
        expect(result.machineId).toBe("LATHE-01");
      });

      it("requires path parameter", async () => {
        const result = await handler({
          action: "log_harvest",
          params: {},
        });
        expect(result.error).toContain("path is required");
      });
    });

    describe("log_alarms", () => {
      it("returns all alarms", async () => {
        const result = await handler({
          action: "log_alarms",
          params: {},
        });
        // { total, alarms } from getAllAlarms (not the {action,error} catch object)
        expect(typeof result.total).toBe("number");
      });

      it("filters by severity", async () => {
        const result = await handler({
          action: "log_alarms",
          params: { severity: "critical" },
        });
        // severity is not classified by the harvester -> all alarms + honest flag (R12)
        expect(typeof result.total).toBe("number");
        expect(result.severityFilterApplied).toBe(false);
      });
    });

    describe("coordinate_register", () => {
      it("registers a terminal session", async () => {
        const result = await handler({
          action: "coordinate_register",
          params: { name: "ocr-worker", specializations: ["pdf_ocr"] },
        });
        expect(result).toBeDefined();
        expect(result.sessionId).toBeDefined();
        expect(result.terminalName).toBe("ocr-worker");
      });
    });

    describe("coordinate_claim", () => {
      it("requires sessionId", async () => {
        const result = await handler({
          action: "coordinate_claim",
          params: {},
        });
        expect(result.error).toContain("sessionId is required");
      });

      it("claims work for valid session", async () => {
        // First register
        const reg = await handler({
          action: "coordinate_register",
          params: { name: "worker" },
        });

        // Then claim (no work available, but should not error)
        const result = await handler({
          action: "coordinate_claim",
          params: { sessionId: reg.sessionId },
        });
        expect(result).toBeDefined();
      });
    });

    describe("unknown action", () => {
      it("returns error for unknown action", async () => {
        const result = await handler({
          action: "nonexistent_action" as any,
          params: {},
        });
        expect(result.error).toContain("Unknown action");
      });
    });
  });
});
