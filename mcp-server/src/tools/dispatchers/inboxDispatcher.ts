/**
 * Inbox Dispatcher — DocuRead document intake, classification, and part matching
 *
 * 13 actions: inbox_ingest, inbox_list, inbox_get, inbox_match_part,
 *            inbox_batch_ingest, inbox_search, inbox_stats, inbox_update_status,
 *            inbox_seed_jm_corpus (indexed-only doc-archive — U-JMDOC07),
 *            inbox_seed_jm_viewer (viewer-only raw scans/prints — U-JMDOC08),
 *            inbox_seed_jm_manifest (DocuStrata manifest doc pointers — U-JMDOC09),
 *            inbox_seed_jm_financial (DocuStrata financial docs, link-only pointers — U-JMDOC10),
 *            inbox_population_status (closed-loop JM-corpus coverage query — U-JMDOC-SYNERGY-STATUS)
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
  "inbox_seed_jm_corpus",
  "inbox_seed_jm_viewer",
  "inbox_seed_jm_manifest",
  "inbox_seed_jm_financial",
  "inbox_population_status",
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
inbox_batch_ingest (multi-doc), inbox_search (full-text), inbox_stats (dashboard), inbox_update_status (workflow),
inbox_seed_jm_corpus (bulk-index pre-classified JM-Die corpus docs — supply 'records' or omit to stream the inventory live),
inbox_seed_jm_viewer (bulk-index raw part-library scans/prints as viewer-only archive — supply 'records' or omit to stream live),
inbox_seed_jm_manifest (archive DocuStrata manifest docs as searchable pointers — supply 'records' or omit to stream live),
inbox_seed_jm_financial (archive DocuStrata financial docs as LINK-ONLY pointers; NO AR/AP/GL records — supply 'records' or omit to stream live),
inbox_population_status (closed-loop query — report JM-corpus population coverage: shipped %, doc volume, customers, gate status; reads the population dashboard, fail-soft, no params).
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

          case "inbox_seed_jm_corpus": {
            // Bulk-index pre-classified JM-Die doc-archive documents (U-JMDOC07, JM-DOC-POPULATION-MS0).
            // Test path: caller supplies params.records. Live path: stream jm-file-inventory.jsonl and
            // pre-filter to the allowlisted non-financial doc-archive tuples before seeding (the engine
            // re-filters too — financial buckets can never be archived here, hotel financial-discipline soul).
            if (Array.isArray(params.records)) {
              result = documentInboxEngine.seedFromJMCorpus(params.records as any);
              break;
            }
            const { JM_DOC_ARCHIVE_ALLOWLIST } = await import("../../engines/DocumentInboxEngine.js");
            const fs = await import("node:fs");
            const nodePath = await import("node:path");
            const readline = await import("node:readline");
            const rel = "state/shared/databases/jm-file-inventory.jsonl";
            const candidates = [
              nodePath.resolve(process.cwd(), "..", rel),
              nodePath.resolve(process.cwd(), rel),
              nodePath.resolve("H:/PRISM", rel),
            ];
            const src = candidates.find((p) => fs.existsSync(p));
            if (!src) {
              throw new Error(`jm-file-inventory.jsonl not found (looked in: ${candidates.join(", ")}) — run scripts/jm-die-full-corpus-ingest.mjs first`);
            }
            const records: any[] = [];
            await new Promise<void>((resolveP, rejectP) => {
              const rl = readline.createInterface({ input: fs.createReadStream(src, "utf8"), crlfDelay: Infinity });
              rl.on("line", (line) => {
                const t = line.trim();
                if (!t) return;
                let rec: any;
                try { rec = JSON.parse(t); } catch { return; }
                if (rec && JM_DOC_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) records.push(rec);
              });
              rl.on("close", () => resolveP());
              rl.on("error", (e) => rejectP(e));
            });
            // Slim the response: the live path seeds ~109K docs — return a count + sample instead of
            // JSON-stringifying the full 109K-element item_ids array through MCP.
            const { item_ids: seededIds, ...seedRest } = documentInboxEngine.seedFromJMCorpus(records);
            result = { ...seedRest, source_path: src, filtered_records: records.length, item_id_count: seededIds.length, item_ids_sample: seededIds.slice(0, 5) };
            break;
          }

          case "inbox_seed_jm_viewer": {
            // Bulk-index raw part-library scans/prints as VIEWER-ONLY archived items (U-JMDOC08).
            // Test path: caller supplies params.records. Live path: stream jm-file-inventory.jsonl and
            // pre-filter to the viewer-only allowlist (the engine re-filters; only scan/print tuples seed).
            if (Array.isArray(params.records)) {
              result = documentInboxEngine.seedViewerArchive(params.records as any);
              break;
            }
            const { JM_VIEWER_ARCHIVE_ALLOWLIST } = await import("../../engines/DocumentInboxEngine.js");
            const fsv = await import("node:fs");
            const nodePathV = await import("node:path");
            const readlineV = await import("node:readline");
            const relV = "state/shared/databases/jm-file-inventory.jsonl";
            const candidatesV = [
              nodePathV.resolve(process.cwd(), "..", relV),
              nodePathV.resolve(process.cwd(), relV),
              nodePathV.resolve("H:/PRISM", relV),
            ];
            const srcV = candidatesV.find((p) => fsv.existsSync(p));
            if (!srcV) {
              throw new Error(`jm-file-inventory.jsonl not found (looked in: ${candidatesV.join(", ")}) — run scripts/jm-die-full-corpus-ingest.mjs first`);
            }
            const recordsV: any[] = [];
            await new Promise<void>((resolveP, rejectP) => {
              const rl = readlineV.createInterface({ input: fsv.createReadStream(srcV, "utf8"), crlfDelay: Infinity });
              rl.on("line", (line) => {
                const t = line.trim();
                if (!t) return;
                let rec: any;
                try { rec = JSON.parse(t); } catch { return; }
                if (rec && JM_VIEWER_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) recordsV.push(rec);
              });
              rl.on("close", () => resolveP());
              rl.on("error", (e) => rejectP(e));
            });
            const { item_ids: viewerIds, ...viewerRest } = documentInboxEngine.seedViewerArchive(recordsV);
            result = { ...viewerRest, source_path: srcV, filtered_records: recordsV.length, item_id_count: viewerIds.length, item_ids_sample: viewerIds.slice(0, 5) };
            break;
          }

          case "inbox_seed_jm_manifest": {
            // Archive DocuStrata manifest documents as searchable inbox POINTERS (U-JMDOC09).
            // Test path: caller supplies params.records. Live path: stream jm-file-inventory.jsonl and
            // pre-filter to the manifest allowlist (docustrata_manifest/doc only; financial+quote excluded).
            if (Array.isArray(params.records)) {
              result = documentInboxEngine.seedManifestPointers(params.records as any);
              break;
            }
            const { JM_MANIFEST_ARCHIVE_ALLOWLIST } = await import("../../engines/DocumentInboxEngine.js");
            const fsm = await import("node:fs");
            const nodePathM = await import("node:path");
            const readlineM = await import("node:readline");
            const relM = "state/shared/databases/jm-file-inventory.jsonl";
            const candidatesM = [
              nodePathM.resolve(process.cwd(), "..", relM),
              nodePathM.resolve(process.cwd(), relM),
              nodePathM.resolve("H:/PRISM", relM),
            ];
            const srcM = candidatesM.find((p) => fsm.existsSync(p));
            if (!srcM) {
              throw new Error(`jm-file-inventory.jsonl not found (looked in: ${candidatesM.join(", ")}) — run scripts/jm-die-full-corpus-ingest.mjs first`);
            }
            const recordsM: any[] = [];
            await new Promise<void>((resolveP, rejectP) => {
              const rl = readlineM.createInterface({ input: fsm.createReadStream(srcM, "utf8"), crlfDelay: Infinity });
              rl.on("line", (line) => {
                const t = line.trim();
                if (!t) return;
                let rec: any;
                try { rec = JSON.parse(t); } catch { return; }
                if (rec && JM_MANIFEST_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) recordsM.push(rec);
              });
              rl.on("close", () => resolveP());
              rl.on("error", (e) => rejectP(e));
            });
            const { item_ids: manifestIds, ...manifestRest } = documentInboxEngine.seedManifestPointers(recordsM);
            result = { ...manifestRest, source_path: srcM, filtered_records: recordsM.length, item_id_count: manifestIds.length, item_ids_sample: manifestIds.slice(0, 5) };
            break;
          }

          case "inbox_seed_jm_financial": {
            // Archive DocuStrata FINANCIAL documents as LINK-ONLY inbox POINTERS (U-JMDOC10).
            // These are EVIDENCE attached to customers/jobs, NOT discrete AR/AP/GL records — the engine
            // creates zero financial objects (financial_guard="true"; hotel financial-discipline soul).
            // Test path: caller supplies params.records. Live path: stream jm-file-inventory.jsonl and
            // pre-filter to the financial allowlist (the engine re-filters; only the 8 financial tuples seed).
            if (Array.isArray(params.records)) {
              result = documentInboxEngine.seedFinancialPointers(params.records as any);
              break;
            }
            const { JM_FINANCIAL_ARCHIVE_ALLOWLIST } = await import("../../engines/DocumentInboxEngine.js");
            const fsf = await import("node:fs");
            const nodePathF = await import("node:path");
            const readlineF = await import("node:readline");
            const relF = "state/shared/databases/jm-file-inventory.jsonl";
            const candidatesF = [
              nodePathF.resolve(process.cwd(), "..", relF),
              nodePathF.resolve(process.cwd(), relF),
              nodePathF.resolve("H:/PRISM", relF),
            ];
            const srcF = candidatesF.find((p) => fsf.existsSync(p));
            if (!srcF) {
              throw new Error(`jm-file-inventory.jsonl not found (looked in: ${candidatesF.join(", ")}) — run scripts/jm-die-full-corpus-ingest.mjs first`);
            }
            const recordsF: any[] = [];
            await new Promise<void>((resolveP, rejectP) => {
              const rl = readlineF.createInterface({ input: fsf.createReadStream(srcF, "utf8"), crlfDelay: Infinity });
              rl.on("line", (line) => {
                const t = line.trim();
                if (!t) return;
                let rec: any;
                try { rec = JSON.parse(t); } catch { return; }
                if (rec && JM_FINANCIAL_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) recordsF.push(rec);
              });
              rl.on("close", () => resolveP());
              rl.on("error", (e) => rejectP(e));
            });
            const { item_ids: financialIds, ...financialRest } = documentInboxEngine.seedFinancialPointers(recordsF);
            result = { ...financialRest, source_path: srcF, filtered_records: recordsF.length, item_id_count: financialIds.length, item_ids_sample: financialIds.slice(0, 5) };
            break;
          }

          case "inbox_population_status": {
            // Closed-loop app-user surface: report JM-corpus population coverage (U-JMDOC-SYNERGY-STATUS,
            // JM-DOC-POPULATION-MS0). Read-only: surfaces the pre-generated jm-population-status.json
            // dashboard (built by scripts/jm-population-status.mjs from ledger+registry+corpus). Fail-soft
            // when the dashboard has not been generated yet; freshness-aware (flags >24h stale).
            const fsP = await import("node:fs");
            const nodePathP = await import("node:path");
            const relP = "state/shared/dashboards/jm-population-status.json";
            const candidatesP = [
              nodePathP.resolve(process.cwd(), "..", relP),
              nodePathP.resolve(process.cwd(), relP),
              nodePathP.resolve("H:/PRISM", relP),
            ];
            const srcP = candidatesP.find((p) => fsP.existsSync(p));
            if (!srcP) {
              result = {
                populated: false,
                reason: "jm-population-status.json not generated yet — run scripts/jm-population-status.mjs",
                looked_in: candidatesP,
              };
              break;
            }
            let snapshot: any;
            try {
              snapshot = JSON.parse(fsP.readFileSync(srcP, "utf8"));
            } catch (e: any) {
              result = { populated: false, reason: `population status unreadable: ${e.message}`, source_path: srcP };
              break;
            }
            const genMs = Date.parse(snapshot.generated_at ?? "");
            const ageMs = Number.isFinite(genMs) ? Date.now() - genMs : null;
            result = {
              populated: (snapshot.shipped_volume ?? 0) > 0,
              milestone: snapshot.milestone,
              coverage_pct: snapshot.shipped_coverage_pct,
              shipped_volume: snapshot.shipped_volume,
              deferred_volume: snapshot.deferred_volume,
              pending_volume: snapshot.pending_volume,
              total_documents: snapshot.total_documents,
              customers: snapshot.customers,
              financial_guarded: snapshot.financial_guarded,
              gate_green: snapshot.gate_green,
              tuples: snapshot.tuples,
              by_disposition: snapshot.by_disposition,
              pending_detail: snapshot.pending_detail,
              generated_at: snapshot.generated_at,
              age_ms: ageMs,
              stale: ageMs === null ? null : ageMs > 24 * 60 * 60 * 1000,
              source_path: srcP,
            };
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
  log.info("✅ Registered: prism_inbox dispatcher (13 actions — DocuRead)");
}
