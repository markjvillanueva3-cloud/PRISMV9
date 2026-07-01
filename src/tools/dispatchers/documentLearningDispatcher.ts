/**
 * Document Learning Dispatcher — CC-EXT-MS0 U06
 *
 * MCP tool for extracting knowledge from text documents (PDFs, notes, articles,
 * academic papers). Wraps the Python cad-engine document extraction pipeline.
 *
 * Actions:
 *   - doc_upload:   Register a document for extraction
 *   - doc_extract:  Run extraction on a registered document
 *   - doc_list:     List extracted document knowledge
 *   - doc_get:      Get a specific document's knowledge
 *   - doc_delete:   Delete a document's knowledge
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_DOCUMENT_LEARNING_SCHEMAS } from "../../schemas/documentLearningActionSchemas.js";
import { hookExecutor, type HookContext } from "../../engines/HookExecutor.js";
import { PATHS } from "../../constants.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const execFileAsync = promisify(execFile);
// __filename and import.meta.dirname are CommonJS globals

const ACTIONS = [
  "doc_upload",
  "doc_extract",
  "doc_list",
  "doc_get",
  "doc_delete",
] as const;

// Path to Python and cad-engine — uses centralized PATHS.PYTHON
const PYTHON_PATH = PATHS.PYTHON;
const CAD_ENGINE_DIR = path.resolve(
  process.env.PRISM_CAD_ENGINE_DIR || path.join(import.meta.dirname, "../../../../cad-engine")
);

// Knowledge storage directory
const KNOWLEDGE_DIR = path.resolve(
  process.env.PRISM_KNOWLEDGE_DIR || path.join(CAD_ENGINE_DIR, "knowledge_store")
);

interface DocumentRecord {
  id: string;
  file_path: string;
  title: string | null;
  format: string;
  status: "pending" | "extracting" | "complete" | "failed";
  created_at: string;
  knowledge_path: string | null;
  error: string | null;
}

// In-memory document registry (persisted to JSON)
const REGISTRY_PATH = path.join(KNOWLEDGE_DIR, "_registry.json");

function loadRegistry(): Record<string, DocumentRecord> {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
    }
  } catch (e) {
    log.warn("[doc_learning] Failed to load registry:", { error: String(e) });
  }
  return {};
}

function saveRegistry(registry: Record<string, DocumentRecord>): void {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function generateDocId(filePath: string): string {
  const stem = path.basename(filePath, path.extname(filePath));
  const safe = stem.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
  return `doc-${safe}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleDocUpload(params: Record<string, any>): Promise<any> {
  const filePath = params.file_path as string;
  if (!filePath) {
    return { error: "file_path is required" };
  }

  if (!fs.existsSync(filePath)) {
    return { error: `File not found: ${filePath}` };
  }

  const docId = params.document_id || generateDocId(filePath);
  const title = params.title || null;
  const ext = path.extname(filePath).toLowerCase();
  const formatMap: Record<string, string> = {
    ".pdf": "pdf", ".md": "markdown", ".markdown": "markdown",
    ".txt": "text", ".html": "html", ".htm": "html",
  };
  const format = formatMap[ext] || "unknown";

  const record: DocumentRecord = {
    id: docId,
    file_path: path.resolve(filePath),
    title,
    format,
    status: "pending",
    created_at: new Date().toISOString(),
    knowledge_path: null,
    error: null,
  };

  const registry = loadRegistry();
  registry[docId] = record;
  saveRegistry(registry);

  return {
    document_id: docId,
    status: "pending",
    format,
    message: `Document registered. Run doc_extract with document_id="${docId}" to extract knowledge.`,
  };
}

async function handleDocExtract(params: Record<string, any>): Promise<any> {
  const docId = params.document_id as string;
  if (!docId) {
    return { error: "document_id is required" };
  }

  const registry = loadRegistry();
  const record = registry[docId];
  if (!record) {
    return { error: `Document not found: ${docId}` };
  }

  // Update status
  record.status = "extracting";
  saveRegistry(registry);

  try {
    // Build Python extraction script
    const forceDomain = params.force_domain || null;
    const script = `
import sys, json
sys.path.insert(0, ${JSON.stringify(CAD_ENGINE_DIR)})
from src.document_extract import extract_from_document
result = extract_from_document(
    file_path=${JSON.stringify(record.file_path)},
    title=${JSON.stringify(record.title)},
    force_domain=${forceDomain ? JSON.stringify(forceDomain) : "None"},
    document_id=${JSON.stringify(docId)},
)
print(json.dumps(result.to_dict()))
`;

    const { stdout, stderr } = await execFileAsync(
      PYTHON_PATH,
      ["-c", script],
      { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr && !stdout) {
      throw new Error(stderr.substring(0, 500));
    }

    const extractionResult = JSON.parse(stdout.trim());

    // Save knowledge
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    const knowledgePath = path.join(KNOWLEDGE_DIR, `${docId}.json`);
    fs.writeFileSync(knowledgePath, JSON.stringify(extractionResult.knowledge, null, 2));

    record.status = "complete";
    record.knowledge_path = knowledgePath;
    record.error = null;
    saveRegistry(registry);

    // Bridge: ingest extracted knowledge into TribalKnowledgeEngine for unified search
    let ingestedCount = 0;
    try {
      const knowledge = extractionResult.knowledge;
      if (knowledge && Array.isArray(knowledge.tips || knowledge.items || knowledge.entries)) {
        const rawTips = knowledge.tips || knowledge.items || knowledge.entries;
        const { tribalKnowledgeEngine } = require("../../engines/TribalKnowledgeEngine.js");
        const tribalTips = rawTips.map((item: any, i: number) => ({
          id: `TK-DL-${docId}-${String(i + 1).padStart(3, "0")}`,
          title: item.title || item.name || `Document tip ${i + 1}`,
          body: item.body || item.content || item.text || "",
          category: item.category || "general",
          tags: [...(item.tags || []), "document-learned-auto", `doc:${docId}`],
          material_groups: item.material_groups || undefined,
          operation_types: item.operation_types || undefined,
          confidence: item.confidence || 70,
          source: `document:${record.title || docId}`,
          created_at: new Date().toISOString().slice(0, 10),
          usage_count: 0,
        }));
        ingestedCount = tribalKnowledgeEngine.ingest(tribalTips);
      }
    } catch { /* tribal knowledge ingestion is best-effort */ }

    return {
      document_id: docId,
      status: "complete",
      is_valid: extractionResult.is_valid,
      stats: extractionResult.knowledge?.extraction_stats || {},
      validation: extractionResult.validation_results || {},
      errors: extractionResult.errors || [],
      tribal_tips_ingested: ingestedCount,
    };
  } catch (e: any) {
    record.status = "failed";
    record.error = e.message?.substring(0, 500) || "Unknown error";
    saveRegistry(registry);

    return {
      document_id: docId,
      status: "failed",
      error: record.error,
    };
  }
}

async function handleDocList(_params: Record<string, any>): Promise<any> {
  const registry = loadRegistry();
  const documents = Object.values(registry).map((r) => ({
    id: r.id,
    title: r.title,
    format: r.format,
    status: r.status,
    created_at: r.created_at,
  }));

  return {
    count: documents.length,
    documents,
  };
}

async function handleDocGet(params: Record<string, any>): Promise<any> {
  const docId = params.document_id as string;
  if (!docId) {
    return { error: "document_id is required" };
  }

  const registry = loadRegistry();
  const record = registry[docId];
  if (!record) {
    return { error: `Document not found: ${docId}` };
  }

  let knowledge = null;
  if (record.knowledge_path && fs.existsSync(record.knowledge_path)) {
    knowledge = JSON.parse(fs.readFileSync(record.knowledge_path, "utf-8"));
  }

  return {
    document: {
      id: record.id,
      title: record.title,
      format: record.format,
      status: record.status,
      created_at: record.created_at,
      file_path: record.file_path,
    },
    knowledge,
  };
}

async function handleDocDelete(params: Record<string, any>): Promise<any> {
  const docId = params.document_id as string;
  if (!docId) {
    return { error: "document_id is required" };
  }

  const registry = loadRegistry();
  const record = registry[docId];
  if (!record) {
    return { error: `Document not found: ${docId}` };
  }

  // Delete knowledge file
  if (record.knowledge_path && fs.existsSync(record.knowledge_path)) {
    fs.unlinkSync(record.knowledge_path);
  }

  delete registry[docId];
  saveRegistry(registry);

  return { deleted: docId, message: "Document knowledge deleted successfully" };
}

const ACTION_HANDLERS: Record<string, (p: Record<string, any>) => Promise<any>> = {
  doc_upload: handleDocUpload,
  doc_extract: handleDocExtract,
  doc_list: handleDocList,
  doc_get: handleDocGet,
  doc_delete: handleDocDelete,
};

// ---------------------------------------------------------------------------
// REGISTRATION
// ---------------------------------------------------------------------------

/** Registers document learning dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerDocumentLearningDispatcher(server: any): void {
  server.tool(
    "prism_doc_learn",
    "Document knowledge extraction: upload PDFs/notes/articles/academic papers, extract CAD/CAM/SHOP knowledge, query stored document knowledge. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_doc_learn] Action: ${action}`);

      const params: Record<string, any> = { ...rawParams };

      try {
        // Normalize params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_DOCUMENT_LEARNING_SCHEMAS);
        if (!validation.valid) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              error: `Invalid params for ${action}`, details: validation.errors, action,
            }) }],
          };
        }

        // Pre-hooks
        const hookCtx = {
          operation: action,
          target: { type: "knowledge" as const, id: action, data: params },
          metadata: { dispatcher: "documentLearningDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as unknown as Partial<HookContext>);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        const handler = ACTION_HANDLERS[action];
        if (!handler) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              error: `Unknown action: ${action}`,
              available: ACTIONS,
            }) }],
          };
        }

        const result = await handler(params);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        log.error(`[prism_doc_learn] ${action} failed:`, err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            error: err.message || "Internal error",
            action,
          }) }],
        };
      }
    }
  );

  log.info(`[prism_doc_learn] Registered ${ACTIONS.length} actions`);
}
