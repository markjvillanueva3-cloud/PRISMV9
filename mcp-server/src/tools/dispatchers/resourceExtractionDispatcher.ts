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
import * as fs from "fs";
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
  // U-XRAY-DOCUMENT-EXTRACT-CONTRACT -- normalize an office/document extraction -> versioned DocumentExtractionContract
  "document_extract_contract",
  // U-XRAY-DOCUMENT-EXTRACT-ROUTER -- route a validated contract -> the document-knowledge consumers
  "document_extract_route",
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
            // processImage(imagePath, simulatedText, simulatedConfidence) is POSITIONAL.
            // dpi is image-registration metadata (read by the low-DPI quality gate), so
            // register it first rather than passing it to processImage.
            const ocrDpi = params.dpi || params.simulatedDpi;
            if (ocrDpi) engine.registerImage(imagePath, { dpi: Number(ocrDpi) });
            const simulatedText = params.text || params.simulatedText || "";
            const simulatedConfidence = params.confidence ?? params.simulatedConfidence ?? 0.85;
            result = engine.processImage(imagePath, simulatedText, Number(simulatedConfidence));
            break;
          }

          case "ocr_stats": {
            const engine = await getEngine("ocr");
            result = engine.getQueueStats();
            break;
          }

          // ── Drawing Actions ───────────────────────────────────
          case "drawing_extract": {
            const engine = await getEngine("drawing");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for drawing_extract" };
            }
            // extractDrawing(path, { entities, dimensions, annotations, layers }) -- match the
            // engine's simulatedData keys (the prior simulated* keys were silently dropped).
            const options: any = {};
            if (params.dimensions) options.dimensions = params.dimensions;
            if (params.entities) options.entities = params.entities;
            if (params.layers) options.layers = params.layers;
            if (params.annotations) options.annotations = params.annotations;
            // title-block fields feed partInfo extraction, which scans annotations.
            const tb = params.titleBlock || params.title_block;
            if (tb && typeof tb === "object") {
              options.annotations = [
                ...(options.annotations || []),
                ...Object.entries(tb).map(([k, v]) => `${k}: ${v}`),
              ];
            }
            // U-XRAY-DRAWING-EXTRACT-REAL-DXF: when no explicit dims/entities are supplied,
            // feed the engine the real DXF text so it parses for real (engine stays I/O-free;
            // the dispatcher is the I/O layer). Caller-supplied `content` wins; otherwise read
            // the .dxf at `filePath`. Read failures are logged + skipped (engine returns the
            // prior empty-success result -- back-compat for missing-file / simulated callers).
            if (!options.entities && !options.dimensions) {
              if (typeof params.content === "string") {
                options.content = params.content;
              } else if (String(filePath).toLowerCase().endsWith(".dxf")) {
                try {
                  // Size-cap an untrusted uploaded file before reading it whole into memory
                  // (DoS guard -- the DXF group cap bounds tokenization, not the initial read).
                  const MAX_DXF_BYTES = 64 * 1024 * 1024;
                  const sz = fs.statSync(filePath).size;
                  if (sz > MAX_DXF_BYTES) {
                    log.warn(`[drawing_extract] skipping ${filePath}: ${sz} bytes exceeds ${MAX_DXF_BYTES}-byte cap`);
                  } else {
                    options.content = fs.readFileSync(filePath, "utf-8");
                  }
                } catch (e) {
                  log.warn(`[drawing_extract] could not read ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
                }
              }
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
            result = engine.getResult(filePath);
            if (!result) {
              return { error: "Drawing not found -- extract it first" };
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
            // extractDocument(path, { sections, tables, metadata }) -- the engine derives text from
            // section content, so wrap a raw text param as a paragraph section (prior simulatedText/
            // simulatedTables keys were silently dropped AND processDocument never existed).
            const officeOpts: any = {};
            const sections: any[] = [];
            const officeText = params.text || params.simulatedText;
            if (officeText) sections.push({ type: "paragraph", content: String(officeText) });
            if (Array.isArray(params.sections)) sections.push(...params.sections);
            if (sections.length) officeOpts.sections = sections;
            if (params.tables || params.simulatedTables) officeOpts.tables = params.tables || params.simulatedTables;
            result = engine.extractDocument(filePath, officeOpts);
            break;
          }

          case "office_search": {
            const engine = await getEngine("office");
            const keyword = params.keyword || params.query;
            const partNumber = params.partNumber || params.part_number;
            // findByPartNumber / searchByKeyword return ExtractionResult[]; wrap in an object with a
            // stable count so slimResponse (which strips empty arrays) never erases a 0-match result.
            let matches: any[];
            if (partNumber) {
              matches = engine.findByPartNumber(partNumber);
            } else if (keyword) {
              matches = engine.searchByKeyword(keyword);
            } else {
              return { error: "keyword or partNumber is required for office_search" };
            }
            result = { count: matches.length, matches };
            break;
          }

          case "document_extract_contract": {
            // U-XRAY-DOCUMENT-EXTRACT-CONTRACT -- normalize an office/document extraction into the
            // versioned DocumentExtractionContract the document-feature consumers bind to (sibling of
            // blueprint_extract_contract). Pure + in-process: the caller obtains the extraction via
            // office_process first, then calls this to get the stable contract. No producer run, no I/O.
            const ex = params.extraction ?? params.extractedData ?? params.result ?? params.office ?? params.ocr ?? params.ingestion;
            if (ex == null || typeof ex !== "object") {
              return { error: "document_extract_contract requires extraction (an OfficeDocumentPipelineEngine ExtractionResult, an ImageOCRPipelineEngine OCRResult, or a documentLearning IngestionResult -- or its extractedData/items)" };
            }
            const mod = await import("../../schemas/DocumentExtractionContract.js");
            const opts: any = {};
            if (typeof params.confirmFloor === "number") opts.confirmFloor = params.confirmFloor;
            if (typeof params.entryConfidence === "number") opts.entryConfidence = params.entryConfidence;
            if (typeof params.source === "string") opts.source = params.source;
            if (typeof params.docType === "string") opts.docType = params.docType;
            // producer selects the normalizer: "ocr" (ImageOCRPipelineEngine), "doclearn"
            // (documentLearning IngestionResult), vs "office" (default).
            const producer = params.producer === "ocr" || params.ocr != null ? "ocr"
              : params.producer === "doclearn" || params.ingestion != null ? "doclearn"
              : "office";
            const contract = producer === "ocr" ? mod.normalizeOcrExtractToContract(ex, opts)
              : producer === "doclearn" ? mod.normalizeDocLearningToContract(ex, opts)
              : mod.normalizeOfficeExtractToContract(ex, opts);
            const validation = mod.validateDocumentExtractionContract(contract);
            result = { contract, producer, valid: validation.ok, errors: validation.errors ?? [] };
            break;
          }

          case "document_extract_route": {
            // U-XRAY-DOCUMENT-EXTRACT-ROUTER -- given a VALIDATED DocumentExtractionContract (chain
            // document_extract_contract -> this), return the fan-out plan: which document-knowledge
            // consumers (tool-crib lookup / speeds-feeds / tribal capture) the entries can drive, with
            // per-consumer payloads + the tribal confirm-gate. Pure + in-process.
            const docContract = params.contract;
            if (docContract == null || typeof docContract !== "object") {
              return { error: "document_extract_route requires contract (a DocumentExtractionContract; obtain it via document_extract_contract first)" };
            }
            const mod = await import("../../schemas/DocumentExtractionContract.js");
            const validation = mod.validateDocumentExtractionContract(docContract);
            if (!validation.ok) {
              return { error: `document_extract_route: invalid contract -- ${(validation.errors ?? []).join("; ")}` };
            }
            const routerMod = await import("../../engines/blueprint-vision/documentExtractionRouter.js");
            const rOpts = params.includeIneligible === false ? { includeIneligible: false } : {};
            const plan = routerMod.routeDocumentToConsumers(validation.data!, rOpts);
            // CLOSE-THE-LOOPS-MS0: emit at the impure dispatcher boundary so routeDocumentToConsumers stays pure.
            try {
              const { emitPipelineOutcome } = await import("../../engines/pipelineOutcomeEmit.js");
              emitPipelineOutcome({
                domain: "doc_read",
                engineName: "documentExtractionRouter",
                outcomeEventId: "document_routed",
                inline: { doc_type: plan.doc_type, consumer_count: plan.routes.length },
                adapted: {
                  n_eligible: plan.summary.n_eligible,
                  n_ready: plan.summary.n_ready,
                  n_blocked: plan.summary.n_blocked_on_confirm,
                },
                reward: { objective: "other", raw_value: plan.summary.n_ready, sign_convention: "maximize" },
                metadata: { contract_version: plan.contract_version },
              });
            } catch { /* emit is advisory -- never block the route result */ }
            result = { plan };
            break;
          }

          // ── Machine Log Actions ───────────────────────────────
          case "log_harvest": {
            const engine = await getEngine("log");
            const filePath = params.path || params.filePath || params.file_path;
            if (!filePath) {
              return { error: "path is required for log_harvest" };
            }
            // harvestFile(path, content: string) -- enrich the pure harvest result with the
            // caller-supplied machine context the engine itself does not track.
            const machineId = params.machineId || params.machine_id;
            const machineType = params.machineType || params.machine_type;
            const rawLines = params.content ?? params.lines ?? params.simulatedLines;
            const content = Array.isArray(rawLines) ? rawLines.join("\n") : (rawLines ?? "");
            const harvest = engine.harvestFile(filePath, content);
            result = {
              ...harvest,
              ...(machineId ? { machineId } : {}),
              ...(machineType ? { machineType } : {}),
            };
            break;
          }

          case "log_alarms": {
            const engine = await getEngine("log");
            const severity = params.severity;
            const all = engine.getAllAlarms();
            // The harvester records alarm CODES with no severity classification, so a severity filter
            // cannot be honored from the data model -- return all + flag it honestly (R12), never fabricate.
            result = severity
              ? { ...all, severityFilter: severity, severityFilterApplied: false,
                  note: "alarm severity is not classified by the harvester; returning all alarms" }
              : all;
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
