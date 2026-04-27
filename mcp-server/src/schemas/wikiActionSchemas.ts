/**
 * prism_wiki action schemas — KNOWLEDGE-WIKI-MS0 / U-WIKI06
 *
 * Zod v4 schemas for every action exposed on the prism_wiki dispatcher.
 * Engines accept rich record-shaped payloads; rather than re-declare every
 * nested interface, we validate the structural top-level fields and pass
 * through the rest. Each engine method does deeper REAL-DATA validation
 * downstream (drops with structured warning rather than throwing).
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ---- common shapes --------------------------------------------------------

const wikiEntryZ = z.object({
  slug: z.string().min(2).max(80),
  category: z.string().min(2),
  summary: z.string().min(1),
  sources: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
  last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
}).passthrough();

const logEntryZ = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  op: z.string().min(1),
  title: z.string().min(1),
  agent: z.string().min(1),
}).passthrough();

const harvestOptionsZ = z.object({
  patternsDir: z.string().optional(),
  skillDraftDir: z.string().optional(),
  skipSkillDrafts: z.boolean().optional(),
  today: z.string().optional(),
  agent: z.string().optional(),
}).passthrough();

const curateOptionsZ = z.object({
  wikiRoot: z.string().optional(),
  memoriesRoot: z.string().optional(),
  today: z.string().optional(),
  agent: z.string().optional(),
}).passthrough();

const bridgeOptionsZ = z.object({
  wikiRoot: z.string().optional(),
  today: z.string().optional(),
  agent: z.string().optional(),
}).passthrough();

const syncOptionsZ = z.object({
  wikiRoot: z.string().optional(),
  today: z.string().optional(),
  agent: z.string().optional(),
}).passthrough();

const ingestStartZ = z.object({
  rawSource: z.string().min(1),
  rawText: z.string().min(1),
  category: z.string().min(2),
}).passthrough();

const ingestFinalizeZ = z.object({
  rawSource: z.string().min(1),
  category: z.string().min(2),
  prepared: z.record(z.string(), z.any()),
  synthesis: z.string().min(1),
}).passthrough();

const lintOptionsZ = z.object({
  writeReport: z.boolean().optional(),
}).passthrough();

const logReadOptionsZ = z.object({
  limit: z.number().int().min(1).max(10000).optional(),
  since: z.string().optional(),
}).passthrough();

// ---- per-action input shapes ----------------------------------------------

const wikiIngestRunZ = ingestStartZ;
const wikiIngestFinalizeZ = ingestFinalizeZ;
const wikiLintZ = lintOptionsZ;
const wikiHarvestPatternsZ = z.object({
  patterns: z.array(z.record(z.string(), z.any())),
  options: harvestOptionsZ.optional(),
});
const wikiHarvestTribalZ = z.object({ options: curateOptionsZ.optional() });
const wikiHarvestLessonsZ = z.object({
  input: z.record(z.string(), z.any()),
  options: bridgeOptionsZ.optional(),
});
const wikiSyncSelfAwarenessZ = z.object({
  payload: z.record(z.string(), z.any()),
  options: syncOptionsZ.optional(),
});
const wikiIndexReadZ = z.object({}).passthrough();
const wikiIndexUpsertZ = wikiEntryZ;
const wikiLogAppendZ = logEntryZ;
const wikiLogReadZ = logReadOptionsZ;

// ---- export ---------------------------------------------------------------

export const ACTION_WIKI_SCHEMAS: ActionSchemaMap = {
  wiki_ingest_run: wikiIngestRunZ,
  wiki_ingest_finalize: wikiIngestFinalizeZ,
  wiki_lint: wikiLintZ,
  wiki_harvest_patterns: wikiHarvestPatternsZ,
  wiki_harvest_tribal: wikiHarvestTribalZ,
  wiki_harvest_lessons: wikiHarvestLessonsZ,
  wiki_sync_self_awareness: wikiSyncSelfAwarenessZ,
  wiki_index_read: wikiIndexReadZ,
  wiki_index_upsert: wikiIndexUpsertZ,
  wiki_log_append: wikiLogAppendZ,
  wiki_log_read: wikiLogReadZ,
};
