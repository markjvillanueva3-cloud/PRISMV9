/**
 * Inbox Dispatcher — DocuRead document intake, classification, and part matching
 *
 * 8 actions: inbox_ingest, inbox_list, inbox_get, inbox_match_part,
 *            inbox_batch_ingest, inbox_search, inbox_stats, inbox_update_status
 *
 * Orchestrates DocumentInboxEngine for unified document intake pipeline.
 * Accepts prints, POs, invoices, material certs, and auto-matches to part numbers.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INBOX_SCHEMAS } from "../../schemas/inboxActionSchemas.js";

const ACTIONS = [
  "inbox_ingest",
  "inbox_list",
  "inbox_get",
  "inbox_match_part",
  "inbox_batch_ingest",
  "inbox_search",
  "inbox_stats",
  "inbox_update_status",
] as const;

/**
 * Registers the inbox dispatcher on the MCP server.
 * @param server - MCP server instance
 */
export function registerInboxDispatcher(server: any): void {
  server.tool(
    "prism_inbox",
    `DocuRead document inbox — intake, classify, and match manufacturing documents to part numbers.
Actions: inbox_ingest (accept doc), inbox_list (filter/sort), inbox_get (detail), inbox_match_part (manual match),
inbox_batch_ingest (multi-doc), inbox_search (full-text), inbox_stats (dashboard), inbox_update_status (workflow).
Params: inbox_ingest needs 'filename' + 'content_base64'. inbox_get needs 'id'. inbox_search needs 'query'.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_inbox] Action: ${action}`);
      let result: any;
      try {
        // Normalize params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, ACTION_INBOX_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_inbox"
          );
        }

        // Lazy-load engine
        const { documentInboxEngine } = await import("../../engines/DocumentInboxEngine.js");

        switch (action) {
          case "inbox_ingest": {
            result = await documentInboxEngine.ingest({
              content_base64: params.content_base64,
              file_path: params.file_path,
              filename: params.filename,
              mime_type: params.mime_type,
              type_hint: params.type_hint,
              source: params.source_type ? {
                type: params.source_type,
                origin: params.source_origin,
              } : undefined,
              tags: params.tags,
              ingested_by: params.ingested_by,
              skip_classification: params.skip_classification,
              skip_matching: params.skip_matching,
            });
            break;
          }

          case "inbox_list": {
            result = documentInboxEngine.list({
              status: params.status,
              document_type: params.document_type,
              part_number: params.part_number,
              date_from: params.date_from,
              date_to: params.date_to,
              tags: params.tags,
              query: params.query,
              limit: params.limit,
              offset: params.offset,
              sort_by: params.sort_by,
              sort_order: params.sort_order,
            });
            break;
          }

          case "inbox_get": {
            const item = documentInboxEngine.get(params.id);
            if (!item) {
              result = { error: `Inbox item '${params.id}' not found` };
            } else {
              result = { item };
            }
            break;
          }

          case "inbox_match_part": {
            result = await documentInboxEngine.matchPart(
              params.inbox_id,
              params.part_number,
              params.part_id
            );
            break;
          }

          case "inbox_batch_ingest": {
            const inputs = (params.items || []).map((item: any) => ({
              content_base64: item.content_base64,
              filename: item.filename,
              mime_type: item.mime_type,
              type_hint: item.type_hint,
              tags: item.tags,
              ingested_by: params.ingested_by,
            }));
            result = await documentInboxEngine.batchIngest(inputs);
            break;
          }

          case "inbox_search": {
            const items = documentInboxEngine.search(params.query, params.limit);
            result = { items, count: items.length };
            break;
          }

          case "inbox_stats": {
            result = documentInboxEngine.stats();
            break;
          }

          case "inbox_update_status": {
            result = documentInboxEngine.updateStatus(params.id, params.status, params.note);
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }

        return { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        log.error(`[prism_inbox] Error: ${error.message}`);
        return dispatcherError(error, action, "prism_inbox");
      }
    }
  );
  log.info("✅ Registered: prism_inbox dispatcher (8 actions — DocuRead)");
}
