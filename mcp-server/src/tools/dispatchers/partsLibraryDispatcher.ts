/**
 * prism_parts — Parts Library & File Storage Dispatcher
 *
 * 16 actions: file_upload, file_download, file_get_versions, file_attach,
 *   file_get_attachments, file_find_by_hash, file_delete, file_list, file_stats,
 *   part_create, part_search, part_get, part_add_revision, part_list_revisions,
 *   part_find_similar, part_deduplicate, part_stats
 *
 * Phase 6 Session 6-2: File Upload + CAD Storage + Parts Library
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { PARTS_LIBRARY_ACTION_SCHEMAS } from "../../schemas/partsLibraryActionSchemas.js";

const ACTIONS = [
  "file_upload", "file_download", "file_get_versions", "file_attach",
  "file_get_attachments", "file_find_by_hash", "file_delete", "file_list", "file_stats",
  "part_create", "part_search", "part_get", "part_add_revision", "part_list_revisions",
  "part_find_similar", "part_deduplicate", "part_stats",
  // U-PPL-D3 / MS-PRINT-PROGRAM-LOOP Track D: ArchiveToPartsCatalogIngesterEngine
  "part_ingest_from_archive",
  // JM-DOC-POPULATION-MS0 / U-JMDOC05: bulk metadata seed of structural part_library/other rows
  "part_seed_jm_corpus",
] as const;

export function registerPartsLibraryDispatcher(server: any): void {
  server.tool(
    "prism_parts",
    `Parts Library & File Storage — upload files with SHA-256 dedup, revision-controlled parts catalog, file attachments to quotes/jobs/quality records.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_parts] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, PARTS_LIBRARY_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action, "prism_parts"
          );
        }

        switch (action) {
          // ── File Storage Actions ──
          case "file_upload": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = await fileStorageEngine.upload({
              content: params.content as string,
              original_name: params.original_name as string,
              mime_type: params.mime_type as string | undefined,
              uploaded_by: params.uploaded_by as string | undefined,
              existing_file_id: params.existing_file_id as string | undefined,
              change_description: params.change_description as string | undefined,
            });
            break;
          }

          case "file_download": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            const dl = await fileStorageEngine.download(
              params.file_id as string,
              params.version as number | undefined
            );
            result = {
              original_name: dl.original_name,
              mime_type: dl.mime_type,
              size_bytes: dl.size_bytes,
              version: dl.version,
              sha256: dl.sha256,
              content_base64: dl.content.toString("base64"),
            };
            break;
          }

          case "file_get_versions": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = fileStorageEngine.getVersions(params.file_id as string);
            break;
          }

          case "file_attach": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = fileStorageEngine.attach({
              file_id: params.file_id as string,
              entity_type: params.entity_type as string,
              entity_id: params.entity_id as string,
              attachment_type: params.attachment_type as string | undefined,
              notes: params.notes as string | undefined,
              attached_by: params.attached_by as string | undefined,
            });
            break;
          }

          case "file_get_attachments": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = fileStorageEngine.getAttachments(
              params.entity_type as string,
              params.entity_id as string
            );
            break;
          }

          case "file_find_by_hash": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            const found = fileStorageEngine.findByHash(params.sha256 as string);
            result = found ?? { found: false, message: "No file matches this hash" };
            break;
          }

          case "file_delete": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = fileStorageEngine.delete(params.file_id as string);
            break;
          }

          case "file_list": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = fileStorageEngine.listFiles({
              mime_type: params.mime_type as string | undefined,
              uploaded_by: params.uploaded_by as string | undefined,
              limit: params.limit as number | undefined,
              offset: params.offset as number | undefined,
            });
            break;
          }

          case "file_stats": {
            const { fileStorageEngine } = await import("../../engines/FileStorageEngine.js");
            result = fileStorageEngine.getStats();
            break;
          }

          // ── Parts Library Actions ──
          case "part_create": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = partsLibraryEngine.create({
              part_number: params.part_number as string,
              name: params.name as string,
              description: params.description as string | undefined,
              material_id: params.material_id as string | undefined,
              material_name: params.material_name as string | undefined,
              customer_id: params.customer_id as string | undefined,
              tags: params.tags as string[] | undefined,
              status: params.status as any,
              created_by: params.created_by as string | undefined,
              cad_file_id: params.cad_file_id as string | undefined,
              drawing_file_id: params.drawing_file_id as string | undefined,
              initial_change_description: params.initial_change_description as string | undefined,
            });
            break;
          }

          case "part_search": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = partsLibraryEngine.search({
              query: params.query as string | undefined,
              tags: params.tags as string[] | undefined,
              material_id: params.material_id as string | undefined,
              customer_id: params.customer_id as string | undefined,
              status: params.status as string | undefined,
              limit: params.limit as number | undefined,
              offset: params.offset as number | undefined,
            });
            break;
          }

          case "part_get": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            if (params.part_number) {
              result = partsLibraryEngine.getByPartNumber(params.part_number as string);
            } else if (params.part_id) {
              result = partsLibraryEngine.get(params.part_id as string);
            } else {
              throw new Error("Either part_id or part_number is required");
            }
            if (!result) {
              result = { found: false, message: "Part not found" };
            }
            break;
          }

          case "part_add_revision": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = partsLibraryEngine.addRevision({
              part_id: params.part_id as string,
              revision: params.revision as string | undefined,
              cad_file_id: params.cad_file_id as string | undefined,
              drawing_file_id: params.drawing_file_id as string | undefined,
              change_description: params.change_description as string,
              changed_by: params.changed_by as string | undefined,
            });
            break;
          }

          case "part_list_revisions": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = partsLibraryEngine.listRevisions(params.part_id as string);
            break;
          }

          case "part_find_similar": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = await partsLibraryEngine.findSimilar({
              part_id: params.part_id as string | undefined,
              material: params.material as string | undefined,
              iso_group: params.iso_group as string | undefined,
              dimensions: params.dimensions as any,
              features: params.features as string[] | undefined,
              tolerances: params.tolerances as any,
              surface_finish_ra: params.surface_finish_ra as number | undefined,
              operations: params.operations as string[] | undefined,
              limit: params.limit as number | undefined,
            });
            break;
          }

          case "part_deduplicate": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = partsLibraryEngine.deduplicate();
            break;
          }

          case "part_stats": {
            const { partsLibraryEngine } = await import("../../engines/PartsLibraryEngine.js");
            result = partsLibraryEngine.getStats();
            break;
          }

          // ── U-PPL-D3 / MS-PRINT-PROGRAM-LOOP Track D: ArchiveToPartsCatalogIngester ──
          case "part_ingest_from_archive": {
            const { archiveToPartsCatalogIngesterEngine } = await import(
              "../../engines/ArchiveToPartsCatalogIngesterEngine.js"
            );
            // Optional link-enrichment: when join_jsonl_path OR input_program_paths
            // is supplied, lazy-load the composite link index BEFORE the ingest so
            // each PN's primary program can carry a print pointer. FAIL-LOUD: a
            // missing/corrupt join file throws and the dispatcher catch wraps that
            // into dispatcherError so the operator sees a structured envelope.
            const joinJsonlPath =
              typeof params.join_jsonl_path === "string" ? params.join_jsonl_path : undefined;
            const inputProgramPaths = Array.isArray(params.input_program_paths)
              ? (params.input_program_paths as unknown[]).filter(
                  (p): p is string => typeof p === "string",
                )
              : undefined;
            let linkIndex: import("../../engines/ProgramPrintLinkIndexEngine.js").ProgramPrintLinkIndex | undefined;
            if (joinJsonlPath !== undefined || inputProgramPaths !== undefined) {
              const { loadLinkIndex } = await import(
                "../../engines/ProgramPrintLinkIndexEngine.js"
              );
              linkIndex = await loadLinkIndex({ joinJsonlPath, inputProgramPaths });
            }
            result = archiveToPartsCatalogIngesterEngine.ingestArchive({
              entries: (params.entries ?? []) as Parameters<
                typeof archiveToPartsCatalogIngesterEngine.ingestArchive
              >[0]["entries"],
              linkIndex,
              dryRun: params.dryRun !== false,
              limit: typeof params.limit === "number" ? params.limit : undefined,
              tagFromEntry: params.tagFromEntry !== false,
            });
            break;
          }

          // ── JM-DOC-POPULATION-MS0 / U-JMDOC05: bulk metadata seed ──
          case "part_seed_jm_corpus": {
            // Bulk-seed the STRUCTURAL part_library/other ledger rows into the
            // parts catalog as revision-controlled metadata (slot:hotel).
            // Test path: caller supplies params.records. Live path: stream
            // jm-file-inventory.jsonl and pre-filter to structural part_library/other
            // rows before seeding (the engine re-filters too — identical structural
            // gate, so the seeded count reconciles to the ledger's 30,890).
            const { partsLibraryEngine, isStructuralPartLibraryOther } = await import(
              "../../engines/PartsLibraryEngine.js"
            );
            if (Array.isArray(params.records)) {
              result = partsLibraryEngine.seedFromJMCorpus(params.records as any);
              break;
            }
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
              throw new Error(
                `jm-file-inventory.jsonl not found (looked in: ${candidates.join(", ")}) — run scripts/jm-die-full-corpus-ingest.mjs first`,
              );
            }
            const records: any[] = [];
            await new Promise<void>((resolveP, rejectP) => {
              const rl = readline.createInterface({ input: fs.createReadStream(src, "utf8"), crlfDelay: Infinity });
              rl.on("line", (line) => {
                const t = line.trim();
                if (!t) return;
                let rec: any;
                try { rec = JSON.parse(t); } catch { return; }
                if (rec && isStructuralPartLibraryOther(rec)) records.push(rec);
              });
              rl.on("close", () => resolveP());
              rl.on("error", (e) => rejectP(e));
            });
            // Slim the response: the live path seeds ~30,890 rows — return counts +
            // a sample instead of JSON-stringifying the full part_ids array via MCP.
            const { part_ids: seededPartIds, ...seedRest } = partsLibraryEngine.seedFromJMCorpus(records);
            result = {
              ...seedRest,
              source_path: src,
              filtered_records: records.length,
              part_id_count: seededPartIds.length,
              part_ids_sample: seededPartIds.slice(0, 5),
            };
            break;
          }

          default:
            throw new Error(`Unknown parts library action: ${action}`);
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse({ success: true, action, data: result })) }] };
      } catch (err: any) {
        log.error(`[prism_parts] Error in ${action}: ${err.message}`);
        return dispatcherError(err.message, action, "prism_parts");
      }
    }
  );
}
