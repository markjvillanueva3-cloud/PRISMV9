/**
 * prism_wiki — Knowledge-Wiki Dispatcher
 *
 * 11 actions across 6 wiki engines:
 *   WikiIngestRouterEngine        (2): wiki_ingest_run, wiki_ingest_finalize
 *   WikiLintEngine                (1): wiki_lint
 *   WikiPatternHarvesterEngine    (1): wiki_harvest_patterns
 *   WikiCodingTribalEngine        (1): wiki_harvest_tribal
 *   WikiErrorLearningBridgeEngine (1): wiki_harvest_lessons
 *   WikiSelfAwarenessSyncEngine   (1): wiki_sync_self_awareness
 *   WikiIndexMaintainerEngine     (2): wiki_index_read, wiki_index_upsert
 *   WikiLogAppenderEngine         (2): wiki_log_append, wiki_log_read
 *
 * Surfaces the Karpathy LLM-Wiki protocol (see WIKI_SCHEMA.md) as MCP actions:
 * a 5-stage Ollama→Claude ingest pipeline, a safety-aware lint, three
 * pattern-harvest bridges, a self-awareness sync that materialises AGI/DL/
 * SONA outputs into wiki/, and direct read/write of the index + log surfaces.
 *
 * Lazy engine imports keep cold-start fast — registered engines are only
 * imported on first action call, not on dispatcher registration.
 *
 * @milestone KNOWLEDGE-WIKI-MS0
 * @unit U-WIKI06
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import {
  dispatcherError,
  dispatcherResult,
  validateActionParams,
} from "../../utils/dispatcherMiddleware.js";
import { ACTION_WIKI_SCHEMAS } from "../../schemas/wikiActionSchemas.js";

// ---- lazy engine cache ----------------------------------------------------

let _ingest: any;
let _lint: any;
let _patterns: any;
let _tribal: any;
let _lessons: any;
let _selfAware: any;
let _index: any;
let _logEng: any;

async function getIngestEngine(): Promise<any> {
  return _ingest ??= (
    await import("../../engines/WikiIngestRouterEngine.js")
  ).wikiIngestRouterEngine;
}
async function getLintEngine(): Promise<any> {
  return _lint ??= (await import("../../engines/WikiLintEngine.js")).wikiLintEngine;
}
async function getPatternsEngine(): Promise<any> {
  return _patterns ??= (
    await import("../../engines/WikiPatternHarvesterEngine.js")
  ).wikiPatternHarvesterEngine;
}
async function getTribalEngine(): Promise<any> {
  return _tribal ??= (
    await import("../../engines/WikiCodingTribalEngine.js")
  ).wikiCodingTribalEngine;
}
async function getLessonsEngine(): Promise<any> {
  return _lessons ??= (
    await import("../../engines/WikiErrorLearningBridgeEngine.js")
  ).wikiErrorLearningBridgeEngine;
}
async function getSelfAwareEngine(): Promise<any> {
  return _selfAware ??= (
    await import("../../engines/WikiSelfAwarenessSyncEngine.js")
  ).wikiSelfAwarenessSyncEngine;
}
async function getIndexEngine(): Promise<any> {
  return _index ??= (
    await import("../../engines/WikiIndexMaintainerEngine.js")
  ).wikiIndexMaintainerEngine ??
    new (await import("../../engines/WikiIndexMaintainerEngine.js")).WikiIndexMaintainerEngine();
}
async function getLogEngine(): Promise<any> {
  return _logEng ??= (
    await import("../../engines/WikiLogAppenderEngine.js")
  ).wikiLogAppenderEngine ??
    new (await import("../../engines/WikiLogAppenderEngine.js")).WikiLogAppenderEngine();
}

// ---- action surface -------------------------------------------------------

const ACTIONS = [
  "wiki_ingest_run",
  "wiki_ingest_finalize",
  "wiki_lint",
  "wiki_harvest_patterns",
  "wiki_harvest_tribal",
  "wiki_harvest_lessons",
  "wiki_sync_self_awareness",
  "wiki_index_read",
  "wiki_index_upsert",
  "wiki_log_append",
  "wiki_log_read",
] as const;

const actionEnum = z.enum(ACTIONS);

/**
 * Registers the prism_wiki dispatcher.
 * @param server MCP server instance
 */
export function registerWikiDispatcher(server: any): void {
  server.tool(
    "prism_wiki",
    `Knowledge-Wiki — Karpathy LLM-Wiki protocol surfaced as MCP actions.
6 engines, 11 actions covering 5-stage ingest, safety lint, 3 harvesters,
self-awareness sync, and direct index/log surfaces.
Actions: ${ACTIONS.join(", ")}.
Inputs are passed verbatim to each engine; engines do REAL-DATA validation
internally (drop with structured warning rather than throw).`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_wiki] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_WIKI_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_wiki"
        );
      }

      try {
        switch (action) {
          case "wiki_ingest_run": {
            const eng = await getIngestEngine();
            const result = await eng.runIngest(params);
            return dispatcherResult(result);
          }
          case "wiki_ingest_finalize": {
            const eng = await getIngestEngine();
            const result = await eng.finalizeIngest(params);
            return dispatcherResult(result);
          }
          case "wiki_lint": {
            const eng = await getLintEngine();
            const result = await eng.lint(params);
            return dispatcherResult(result);
          }
          case "wiki_harvest_patterns": {
            const eng = await getPatternsEngine();
            const result = await eng.harvest(params.patterns ?? [], params.options ?? {});
            return dispatcherResult(result);
          }
          case "wiki_harvest_tribal": {
            const eng = await getTribalEngine();
            const result = await eng.curate(params.options ?? {});
            return dispatcherResult(result);
          }
          case "wiki_harvest_lessons": {
            const eng = await getLessonsEngine();
            const result = await eng.bridge(params.input ?? {}, params.options ?? {});
            return dispatcherResult(result);
          }
          case "wiki_sync_self_awareness": {
            const eng = await getSelfAwareEngine();
            const result = await eng.syncAll(params.payload ?? {}, params.options ?? {});
            return dispatcherResult(result);
          }
          case "wiki_index_read": {
            const eng = await getIndexEngine();
            const result = await eng.read();
            return dispatcherResult(result);
          }
          case "wiki_index_upsert": {
            const eng = await getIndexEngine();
            const result = await eng.upsert(params);
            return dispatcherResult(result);
          }
          case "wiki_log_append": {
            const eng = await getLogEngine();
            const result = await eng.append(params);
            return dispatcherResult(result);
          }
          case "wiki_log_read": {
            const eng = await getLogEngine();
            const result = await eng.read(params);
            return dispatcherResult(result);
          }
          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_wiki");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_wiki");
      }
    }
  );
}
