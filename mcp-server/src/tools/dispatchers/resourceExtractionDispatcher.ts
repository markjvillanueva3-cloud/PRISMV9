/**
 * prism_resource_extraction — Content Extraction Pipeline Dispatcher
 * AI-AWARE-HARDEN: Wires 7 extraction engines for comprehensive content processing
 *
 * 14 actions:
 *   archive_discover   — Discover archives in a directory
 *   archive_analyze    — Analyze archive contents without extracting
 *   classify_dark      — Classify hard-to-extract content
 *   dark_report        — Generate dark content assessment report
 *   ocr_process        — Process image with OCR
 *   ocr_stats          — Get OCR processing statistics
 *   drawing_extract    — Extract data from 2D drawing
 *   drawing_summary    — Get extraction summary for a drawing
 *   office_process     — Process office document
 *   office_search      — Search office documents by keyword/part number
 *   log_harvest        — Harvest machine log data
 *   log_alarms         — Get all alarms from harvested logs
 *   coordinate_register — Register a terminal session for coordination
 *   coordinate_claim    — Claim next work item from queue
 *
 * Engines: ArchiveCrawlerEngine, DarkContentClassifierEngine, ImageOCRPipelineEngine,
 *          Drawing2DExtractionEngine, OfficeDocumentPipelineEngine, MachineLogHarvesterEngine,
 *          CrossTerminalCoordinationEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";

// ── Actions ────────────────────────────────────────────────────

const ACTIONS = [
  "archive_discover",
  "archive_analyze",
  "classify_dark",
  "dark_report",
  "ocr_process",
  "ocr_stats",
  "drawing_extract",
  "drawing_summary",
  "office_process",
  "office_search",
  "log_harvest",
  "log_alarms",
  "coordinate_register",
  "coordinate_claim",
] as const;

type ExtractionAction = typeof ACTIONS[number];

// ── Lazy engine accessors ──────────────────────────────────────

let _archive: any, _dark: any, _ocr: any, _drawing: any, _office: any, _log: any, _coord: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "archive":
      return _archive ??= (await import("../../engines/ArchiveCrawlerEngine.js")).ArchiveCrawlerEngine;
    case "dark":
      return _dark ??= (await import("../../engines/DarkContentClassifierEngine.js")).DarkContentClassifierEngine;
    case "ocr":
      return _ocr ??= (await import("../../engines/ImageOCRPipelineEngine.js")).ImageOCRPipelineEngine;
    case "drawing":
      return _drawing ??= (await import("../../engines/Drawing2DExtractionEngine.js")).Drawing2DExtractionEngine;
    case "office":
      return _office ??= (await import("../../engines/OfficeDocumentPipelineEngine.js")).OfficeDocumentPipelineEngine;
    case "log":
      return _log ??= (await import("../../engines/MachineLogHarvesterEngine.js")).MachineLogHarvesterEngine;
    case "coord":
      return _coord ??= (await import("../../engines/CrossTerminalCoordinationEngine.js")).CrossTerminalCoordinationEngine;
    default:
      throw new Error(`Unknown extraction engine: ${name}`);
  }
}

// ── Registration ───────────────────────────────────────────────

/**
 * Registers the prism_resource_extraction dispatcher on the MCP server.
 * @param server - MCP server instance
 */
export function registerResourceExtractionDispatcher(server: any): void {
  server.tool(
    "prism_resource_extraction",
    `Content extraction pipeline — archives, OCR, drawings, office docs, machine logs, dark content classification, multi-terminal coordination.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in the params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: ExtractionAction;
      params?: Record<string, any>;
    }) => {
      log.info(`[prism_resource_extraction] Action: ${action}`);
      let result: any;

      try {
        // Normalize params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer optional */ }

        switch (action) {
          // ── Archive Actions ───────────────────────────────────
          case "archive_discover": {
            const engine = await getEngine("archive");
            const basePath = params.path || params.basePath || "H:/PRISM/resources/";
            const maxDepth = params.maxDepth || params.max_depth || 5;
            result = await engine.discoverArchives(basePath, maxDepth);
            break;
          }

          case "archive_analyze": {
            const engine = await getEngine("archive");
            const archivePath = params.path || params.archivePath || params.archive_path;
            if (!archivePath) {
              return { error: "path is required for archive_analyze" };
            }
            result = await engine.analyzeArchive(archivePath);
            break;
          }

          // ── Dark Content Actions ──────────────────────────────
          case "classify_dark": {
            const engine = await getEngine("dark");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for classify_dark" };
            }
            const metadata = {
              hasTextLayer: params.hasTextLayer ?? params.has_text_layer,
              isScanned: params.isScanned ?? params.is_scanned,
              isEncrypted: params.isEncrypted ?? params.is_encrypted,
              isCorrupted: params.isCorrupted ?? params.is_corrupted,
              dpi: params.dpi,
            };
            result = engine.classifyFile(filePath, metadata);
            break;
          }

          case "dark_report": {
            const engine = await getEngine("dark");
            result = engine.generateReport();
            break;
          }

          // ── OCR Actions ───────────────────────────────────────
          case "ocr_process": {
            const engine = await getEngine("ocr");
            const imagePath = params.path || params.imagePath || params.image_path;
            if (!imagePath) {
              return { error: "path is required for ocr_process" };
            }
            const options: any = {};
            if (params.text || params.simulatedText) {
              options.simulatedText = params.text || params.simulatedText;
            }
            if (params.dpi || params.simulatedDpi) {
              options.simulatedDpi = params.dpi || params.simulatedDpi;
            }
            result = engine.processImage(imagePath, options);
            break;
          }

          case "ocr_stats": {
            const engine = await getEngine("ocr");
            result = engine.getStatistics();
            break;
          }

          // ── Drawing Actions ───────────────────────────────────
          case "drawing_extract": {
            const engine = await getEngine("drawing");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for drawing_extract" };
            }
            const options: any = {};
            if (params.dimensions) {
              options.simulatedDimensions = params.dimensions;
            }
            if (params.titleBlock || params.title_block) {
              options.simulatedTitleBlock = params.titleBlock || params.title_block;
            }
            result = engine.extractDrawing(filePath, options);
            break;
          }

          case "drawing_summary": {
            const engine = await getEngine("drawing");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for drawing_summary" };
            }
            result = engine.getSummary(filePath);
            if (!result) {
              return { error: "Drawing not found — extract it first" };
            }
            break;
          }

          // ── Office Document Actions ───────────────────────────
          case "office_process": {
            const engine = await getEngine("office");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for office_process" };
            }
            const options: any = {};
            if (params.text || params.simulatedText) {
              options.simulatedText = params.text || params.simulatedText;
            }
            if (params.tables || params.simulatedTables) {
              options.simulatedTables = params.tables || params.simulatedTables;
            }
            result = engine.processDocument(filePath, options);
            break;
          }

          case "office_search": {
            const engine = await getEngine("office");
            const keyword = params.keyword || params.query;
            const partNumber = params.partNumber || params.part_number;
            if (partNumber) {
              result = engine.searchByPartNumber(partNumber);
            } else if (keyword) {
              result = engine.searchByKeyword(keyword);
            } else {
              return { error: "keyword or partNumber is required for office_search" };
            }
            break;
          }

          // ── Machine Log Actions ───────────────────────────────
          case "log_harvest": {
            const engine = await getEngine("log");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for log_harvest" };
            }
            const options: any = {};
            if (params.machineId || params.machine_id) {
              options.machineId = params.machineId || params.machine_id;
            }
            if (params.machineType || params.machine_type) {
              options.machineType = params.machineType || params.machine_type;
            }
            if (params.lines || params.simulatedLines) {
              options.simulatedLines = params.lines || params.simulatedLines;
            }
            result = engine.harvestLog(filePath, options);
            break;
          }

          case "log_alarms": {
            const engine = await getEngine("log");
            const severity = params.severity;
            if (severity) {
              result = engine.getAlarmsBySeverity(severity);
            } else {
              result = engine.getAllAlarms();
            }
            break;
          }

          // ── Coordination Actions ──────────────────────────────
          case "coordinate_register": {
            const engine = await getEngine("coord");
            const terminalName = params.name || params.terminalName || params.terminal_name || "unnamed";
            const specializations = params.specializations || [];
            result = engine.registerSession(terminalName, specializations);
            break;
          }

          case "coordinate_claim": {
            const engine = await getEngine("coord");
            const sessionId = params.sessionId || params.session_id;
            if (!sessionId) {
              return { error: "sessionId is required for coordinate_claim" };
            }
            result = engine.claimWork(sessionId);
            break;
          }

          default:
            return { error: `Unknown action: ${action}` };
        }

        return slimResponse({ action, ...result });
      } catch (err: any) {
        log.error(`[prism_resource_extraction] ${action} failed: ${err.message}`);
        return { error: err.message, action };
      }
    }
  );
}

export default registerResourceExtractionDispatcher;
