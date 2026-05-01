/**
 * CAMInHostResultsBridgeEngine — U-CAMTEST15
 * ===========================================
 *
 * PHASE-8: Server-side aggregator for the in-host runner result envelopes
 * that arrive over CAMPluginCommunicationHub. Collects per-scenario
 * BundleResult outputs (from U-CAMTEST14) keyed by scenario_id × host,
 * tracks pass/fail aggregates, and persists to
 * `data/state/CAM_INHOST_RESULTS.json` so the U-CAMTEST16 nightly CI
 * orchestrator can render a dashboard from a single source of truth.
 *
 * In-memory store + lazy persistence: ingestEnvelope mutates the store
 * synchronously; persist() flushes to disk on demand. Tests can swap the
 * path so production state is never touched.
 *
 * @module engines/CAMInHostResultsBridgeEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST15
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  AssertionNameSchema,
  BundleResultSchema,
  type BundleResult,
} from "./CAMInHostAssertionBundleEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const FixtureHostSchema = z.enum([
  "fusion360", "hypermill", "inventor_hsm", "mastercam",
]);
export type FixtureHost = z.infer<typeof FixtureHostSchema>;

export const FixtureCategorySchema = z.enum([
  "pocket_2d", "contour_2d", "drilling", "threading",
  "surface_3d", "multi_axis", "turning",
]);
export type FixtureCategory = z.infer<typeof FixtureCategorySchema>;

export const ResultEnvelopeSchema = z.object({
  scenario_id: z.string().min(1),
  host: FixtureHostSchema,
  category: FixtureCategorySchema,
  bundle: BundleResultSchema,
  timestamp_ms: z.number().int().nonnegative(),
});
export type ResultEnvelope = z.infer<typeof ResultEnvelopeSchema>;

export const ResultsFileSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  envelopes: z.array(ResultEnvelopeSchema),
  written_at_ms: z.number().int().nonnegative(),
});
export type ResultsFile = z.infer<typeof ResultsFileSchema>;

export const SummarySchema = z.object({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  by_host: z.record(FixtureHostSchema, z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  })),
  by_category: z.record(FixtureCategorySchema, z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  })),
  by_assertion: z.record(AssertionNameSchema, z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  })),
});
export type Summary = z.infer<typeof SummarySchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_RESULTS_PATH = "data/state/CAM_INHOST_RESULTS.json";

const ALL_HOSTS: FixtureHost[] = [
  "fusion360", "hypermill", "inventor_hsm", "mastercam",
];

const ALL_CATEGORIES: FixtureCategory[] = [
  "pocket_2d", "contour_2d", "drilling", "threading",
  "surface_3d", "multi_axis", "turning",
];

// ── Internal store ───────────────────────────────────────────────────────────
// Keyed by `${host}::${scenario_id}`. The same scenario_id may run on
// multiple hosts so the host part is part of the key. A re-ingest of an
// existing key replaces the old envelope (last write wins) — runners
// retry scenarios on transient errors so this is the correct policy.

const STORE = new Map<string, ResultEnvelope>();

function keyOf(host: FixtureHost, scenario_id: string): string {
  return `${host}::${scenario_id}`;
}

function emptySubcounts<K extends string>(keys: readonly K[]): Record<K, { total: number; passed: number; failed: number }> {
  const out = {} as Record<K, { total: number; passed: number; failed: number }>;
  for (const k of keys) out[k] = { total: 0, passed: 0, failed: 0 };
  return out;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMInHostResultsBridgeEngine {
  static readonly SCHEMA_VERSION = SCHEMA_VERSION;
  static readonly DEFAULT_RESULTS_PATH = DEFAULT_RESULTS_PATH;
  static readonly ALL_HOSTS = ALL_HOSTS;
  static readonly ALL_CATEGORIES = ALL_CATEGORIES;

  /** Ingest a fully-formed envelope (validates schema). Last write wins on key. */
  static ingestEnvelope(env: ResultEnvelope): ResultEnvelope {
    const e = ResultEnvelopeSchema.parse(env);
    STORE.set(keyOf(e.host, e.scenario_id), e);
    return e;
  }

  /** Convenience for runner-side code that already has the bundle but not the wrapper. */
  static ingestBundle(args: {
    scenario_id: string;
    host: FixtureHost;
    category: FixtureCategory;
    bundle: BundleResult;
    timestamp_ms?: number;
  }): ResultEnvelope {
    const env: ResultEnvelope = {
      scenario_id: args.scenario_id,
      host: args.host,
      category: args.category,
      bundle: args.bundle,
      timestamp_ms: args.timestamp_ms ?? Date.now(),
    };
    return CAMInHostResultsBridgeEngine.ingestEnvelope(env);
  }

  /** All envelopes (defensive copy of values). */
  static list(): ResultEnvelope[] {
    return Array.from(STORE.values());
  }

  /** Envelopes for one host. */
  static listByHost(host: FixtureHost): ResultEnvelope[] {
    const h = FixtureHostSchema.parse(host);
    return CAMInHostResultsBridgeEngine.list().filter(e => e.host === h);
  }

  /** Envelopes for one category. */
  static listByCategory(category: FixtureCategory): ResultEnvelope[] {
    const c = FixtureCategorySchema.parse(category);
    return CAMInHostResultsBridgeEngine.list().filter(e => e.category === c);
  }

  /** All envelopes whose bundle.overall_pass is false. */
  static listFailures(): ResultEnvelope[] {
    return CAMInHostResultsBridgeEngine.list().filter(e => !e.bundle.overall_pass);
  }

  /** Single envelope by host + scenario_id. */
  static get(host: FixtureHost, scenario_id: string): ResultEnvelope | null {
    return STORE.get(keyOf(host, scenario_id)) ?? null;
  }

  /** Total count. */
  static count(): number {
    return STORE.size;
  }

  /** Aggregated summary across all dimensions of interest. */
  static summarize(): Summary {
    const all = CAMInHostResultsBridgeEngine.list();
    const by_host = emptySubcounts(ALL_HOSTS);
    const by_category = emptySubcounts(ALL_CATEGORIES);
    const by_assertion = emptySubcounts(AssertionNameSchema.options);
    let passed = 0;
    let failed = 0;
    for (const e of all) {
      const ok = e.bundle.overall_pass;
      if (ok) passed += 1; else failed += 1;
      by_host[e.host].total += 1;
      by_host[e.host][ok ? "passed" : "failed"] += 1;
      by_category[e.category].total += 1;
      by_category[e.category][ok ? "passed" : "failed"] += 1;
      for (const a of e.bundle.assertions) {
        by_assertion[a.name].total += 1;
        by_assertion[a.name][a.pass ? "passed" : "failed"] += 1;
      }
    }
    return SummarySchema.parse({ total: all.length, passed, failed, by_host, by_category, by_assertion });
  }

  /** Reset the in-memory store. Tests use this between cases. */
  static reset(): void {
    STORE.clear();
  }

  /** Write the current store to a JSON file (creates parent directory if needed). */
  static persist(target_path: string = DEFAULT_RESULTS_PATH): { path: string; written_at_ms: number; envelopes: number } {
    const file: ResultsFile = ResultsFileSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      envelopes: CAMInHostResultsBridgeEngine.list(),
      written_at_ms: Date.now(),
    });
    fs.mkdirSync(path.dirname(target_path), { recursive: true });
    fs.writeFileSync(target_path, JSON.stringify(file, null, 2), "utf8");
    return { path: target_path, written_at_ms: file.written_at_ms, envelopes: file.envelopes.length };
  }

  /** Load envelopes from a JSON file (replaces the in-memory store). */
  static load(source_path: string = DEFAULT_RESULTS_PATH): { path: string; envelopes: number } {
    if (!fs.existsSync(source_path)) {
      throw new Error(`CAMInHostResultsBridge: results file not found at "${source_path}"`);
    }
    const raw = fs.readFileSync(source_path, "utf8");
    const parsed = ResultsFileSchema.parse(JSON.parse(raw));
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`CAMInHostResultsBridge: schema version mismatch at "${source_path}" — file is ${parsed.schemaVersion}, engine is ${SCHEMA_VERSION}`);
    }
    STORE.clear();
    for (const env of parsed.envelopes) {
      STORE.set(keyOf(env.host, env.scenario_id), env);
    }
    return { path: source_path, envelopes: STORE.size };
  }

  /** Sanity-check the in-memory store. */
  static auditBridge(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const all = CAMInHostResultsBridgeEngine.list();
    // Every envelope must round-trip its schema (envelopes get parsed on
    // ingest already, but a tampered store could still be off).
    for (const e of all) {
      try { ResultEnvelopeSchema.parse(e); }
      catch (err) { errors.push(`envelope schema failed for ${e.host}/${e.scenario_id}: ${(err as Error).message}`); }
    }
    // Summary subtotals must equal the envelope count.
    const sum = CAMInHostResultsBridgeEngine.summarize();
    if (sum.passed + sum.failed !== sum.total) {
      errors.push(`summary mismatch: passed(${sum.passed}) + failed(${sum.failed}) ≠ total(${sum.total})`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const camInHostResultsBridgeEngine = CAMInHostResultsBridgeEngine;
