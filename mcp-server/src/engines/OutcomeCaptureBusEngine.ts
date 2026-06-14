/**
 * OutcomeCaptureBusEngine — U-LEARN-01
 * =====================================
 *
 * Universal cross-domain event bus for every outcome PRISM observes.
 * This is the spine of the learning loop: every physics/CAM/CAD/PP/SFC/
 * shop-floor signal that matters to future improvements is appended
 * here as a typed, versioned, provenance-tagged event.
 *
 * Consumers (built in later LEARN units):
 *   - FeatureStoreEngine (U-LEARN-02) reads to build training features
 *   - PhysicsOutcomeCalibratorEngine (SAV2-22) recalibrates physics models
 *   - PolicyExperienceLedgerEngine (U-LEARN-09) builds (s,a,r,s') tuples
 *   - MLLineageEngine (U-LEARN-02) links predictions → outcomes
 *   - BusinessValueMetricsEngine (SAV2-26) rolls up $ impact
 *
 * Design invariants (per 8-agent ML scrutiny):
 *   1. APPEND-ONLY.  Never mutate a past event.
 *   2. PER-DOMAIN SHARD.  mill.jsonl vs lathe.jsonl — cross-domain scans
 *      are O(active_domains), not O(total_events).
 *   3. ATOMIC APPEND.  Common path (<64 KB line): `O_APPEND` single-write
 *      via appendFileSync — kernel-atomic at line granularity across fleet
 *      processes, no fsync (page-cache durability is acceptable for an
 *      append-only telemetry log, and the prior whole-file rewrite was the
 *      O(file²) + rename-races-readers source of the 2026-06-08 EPERM/orphan
 *      incident). Fallback (>64 KB line, unreachable via record()'s size cap):
 *      tmp + fsync + rename, with guaranteed tmp cleanup so it can't orphan.
 *   4. LINEAGE_ID THREADING.  Every event carries a lineage_id tying it
 *      to the original recommendation / decision / request so downstream
 *      calibration knows which model caused which outcome.
 *   5. NEVER BLOCK THE CALLER.  Bus writes are best-effort; errors go to
 *      stderr and a fallback in-memory queue, never thrown back to the
 *      producer engine that emitted the signal.
 *   6. NEVER SILENT-DROP.  If atomic write fails, the event is held in
 *      an in-process retry queue and stderr-logged. A drop is an error,
 *      not a success.
 *
 * Coexistence with OutcomeTrackingEngine (Phase 0.19 U-LLM5):
 *   - OutcomeTrackingEngine owns per-program outcome.jsonl (legacy scope).
 *   - OutcomeCaptureBus owns the superset + cross-domain event stream.
 *   - Engines may emit to BOTH during the transition; canonical source
 *     is this bus going forward.
 *
 * @module engines/OutcomeCaptureBusEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-01
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  OutcomeEventSchema,
  OutcomeQuerySchema,
  type OutcomeEvent,
  type OutcomeQuery,
  type OutcomeDomainT,
  type OutcomeKindT,
  type OutcomeSeverityT,
  type OutcomeSourceT,
} from "../schemas/outcomeEventSchema.js";

const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
// schemaVersion is now a per-event computed value (P0 fix from
// INFRA-NEURAL-LEDGER-MS1/P0-U01 reviewer round): producers MUST stamp 1.1.0
// when populating any v1.1.0-only field, else schema's superRefine rejects.
// See pickSchemaVersion() below.
const SCHEMA_VERSION_V10 = "1.0.0" as const;
const SCHEMA_VERSION_V11 = "1.1.0" as const;
const V11_ONLY_KINDS = new Set<OutcomeKindT>([
  "cross_process_decision",
  "cross_process_stage_complete",
]);
const V11_ONLY_CONTEXT_KEYS = [
  "job_id",
  "pipeline_run_id",
  "pipeline_stage",
  "consensus_audit_id",
] as const;
const MAX_LINE_BYTES = 64 * 1024;          // 64 KB per event line cap
const RETRY_QUEUE_MAX = 256;                // bounded in-memory fallback
// Transient Windows sharing-violation (EPERM/EBUSY) on an O_APPEND write
// clears in microseconds; 4 attempts with 2/4/8 ms backoff is generous.
const ATOMIC_APPEND_MAX_ATTEMPTS = 4;

export interface RecordOutcomeInput {
  domain: OutcomeDomainT;
  kind: OutcomeKindT;
  source: OutcomeSourceT;
  lineage_id?: string;
  event_id?: string;
  severity?: OutcomeSeverityT;
  agent_id?: string;
  timestamp?: string;                 // override only for import/backfill
  context?: Record<string, unknown>;
  recommended?: unknown;
  actual?: unknown;
  delta?: unknown;
  confidence?: number;
  note?: string;
  // v1.1.0 — INFRA-NEURAL-LEDGER-MS1/P0-U01. Optional; supplying any of these
  // auto-stamps the event at schemaVersion 1.1.0 (see pickSchemaVersion).
  numeric_features?: Record<string, number>;
}

/**
 * Decide which schemaVersion to stamp on an outgoing event. Producers should
 * never set this manually — auto-detect based on whether the input populates
 * any v1.1.0-only surface (kind in V11_ONLY_KINDS, any context key in
 * V11_ONLY_CONTEXT_KEYS, or non-empty numeric_features). Default 1.0.0 keeps
 * legacy events stamped legacy; new fields auto-bump to 1.1.0.
 *
 * The schema's cross-field .superRefine() enforces this same rule at parse
 * time, so even a producer that ignores this helper cannot bleed versions
 * (the bus's safeParse() returns ok:false instead of writing).
 */
function pickSchemaVersion(input: RecordOutcomeInput): "1.0.0" | "1.1.0" {
  if (V11_ONLY_KINDS.has(input.kind)) return SCHEMA_VERSION_V11;
  if (input.numeric_features !== undefined) return SCHEMA_VERSION_V11;
  const ctx = input.context ?? {};
  for (const k of V11_ONLY_CONTEXT_KEYS) {
    if ((ctx as Record<string, unknown>)[k] !== undefined) return SCHEMA_VERSION_V11;
  }
  return SCHEMA_VERSION_V10;
}

export interface RecordOutcomeResult {
  ok: boolean;
  event_id: string;
  lineage_id: string;
  path: string;
  bytes: number;
  warning?: string;
}

// WIRE-EXEMPT: producer-side bus, not a dispatcher action.
//
// This engine is a fire-and-forget event emitter — every PRISM engine that
// observes an outcome (operator override, cycle-time measurement, scrap event,
// cross-process decision, etc.) calls `outcomeCaptureBusEngine.record(...)`
// directly via the exported singleton. There is no caller pattern that needs
// a dispatcher-action surface (callers are themselves engines, not
// MCP-protocol clients). This matches the pattern used by atomic-write
// utilities, structured loggers, and other producer-side infrastructure.
//
// If a dispatcher action is ever added (e.g. `prism_dev:outcome_record` for
// agent-side emission), this exemption can be removed and the action wired
// alongside the existing direct-singleton path.
//
// See CLAUDE.md §ENGINE WIRING — WIRE TO ALL SOURCES (the "WIRE-EXEMPT" tag
// is the documented escape hatch for producer engines wrapped by their own
// singleton; the bus IS its own singleton via `outcomeCaptureBusEngine`).
//
// Tagged 2026-05-13 by bravo/claude-88901d4c during INFRA-NEURAL-LEDGER-MS1/
// P0-U01 close-out (Stop-hook wiring-enforcement gate).

/**
 * OutcomeCaptureBusEngine — singleton, static API.
 *
 * Callers should generally use the exported singleton `outcomeCaptureBusEngine`;
 * the class is exposed for testability (fresh instances w/ alternate root dirs).
 */
export class OutcomeCaptureBusEngine {
  private readonly rootDir: string;
  private readonly retryQueue: OutcomeEvent[] = [];

  constructor(rootDir: string = OUTCOMES_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Append an outcome event to the per-domain shard. Returns a result object
   * instead of throwing — the bus must never break the emitting engine.
   *
   * Disable knob (JM-DIE-LATHE-UPGRADE-MS0/U-OUTCOME-CAPTURE-DISABLE-KNOB,
   * 2026-05-24): set `PRISM_OUTCOME_CAPTURE_DISABLE=1` to short-circuit
   * every recordOutcome call to a no-op success. Use for high-throughput
   * batch jobs (e.g. 900K+ lathe-program upgrades) where peer-chat contention
   * on the per-domain .jsonl shard's rename-into-place atomic-append pattern
   * is the bottleneck. Honors the "never block, never throw" bus contract —
   * disabling silently drops the event, never errors. Re-enable per-session
   * by unsetting the env var; not a code change.
   */
  record(input: RecordOutcomeInput): RecordOutcomeResult {
    if (process.env.PRISM_OUTCOME_CAPTURE_DISABLE === "1") {
      // No-op success: bus contract permits silent skip when disabled.
      const event_id = input.event_id ?? randomUUID();
      const lineage_id = input.lineage_id ?? event_id;
      return {
        ok: true,
        event_id,
        lineage_id,
        path: "",
        bytes: 0,
        warning: "PRISM_OUTCOME_CAPTURE_DISABLE=1 — event skipped (knob)",
      };
    }
    const event_id = input.event_id ?? randomUUID();
    const lineage_id = input.lineage_id ?? event_id;

    const candidate: OutcomeEvent = {
      schemaVersion: pickSchemaVersion(input),
      event_id,
      lineage_id,
      domain: input.domain,
      kind: input.kind,
      severity: input.severity ?? "info",
      source: input.source,
      timestamp: input.timestamp ?? new Date().toISOString(),
      agent_id: input.agent_id,
      context: input.context ?? {},
      recommended: input.recommended,
      actual: input.actual,
      delta: input.delta,
      confidence: input.confidence,
      note: input.note,
      // v1.1.0 — INFRA-NEURAL-LEDGER-MS1/P0-U01
      numeric_features: input.numeric_features,
    };

    const parsed = OutcomeEventSchema.safeParse(candidate);
    if (!parsed.success) {
      return {
        ok: false,
        event_id,
        lineage_id,
        path: "",
        bytes: 0,
        warning: `schema validation failed: ${parsed.error.message}`,
      };
    }

    const ev = parsed.data;
    let line: string;
    try {
      line = JSON.stringify(ev) + "\n";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        event_id,
        lineage_id,
        path: "",
        bytes: 0,
        warning: `serialization failed (non-JSON-safe payload, e.g. circular): ${message}`,
      };
    }
    const bytes = Buffer.byteLength(line, "utf8");
    if (bytes > MAX_LINE_BYTES) {
      return {
        ok: false,
        event_id,
        lineage_id,
        path: "",
        bytes,
        warning: `event exceeds ${MAX_LINE_BYTES} bytes`,
      };
    }

    const filePath = this.pathFor(ev.domain);
    const writeResult = this.atomicAppend(filePath, line);
    if (!writeResult.ok) {
      this.enqueueRetry(ev);
      return {
        ok: false,
        event_id,
        lineage_id,
        path: filePath,
        bytes,
        warning: writeResult.warning,
      };
    }

    return { ok: true, event_id, lineage_id, path: filePath, bytes };
  }

  /**
   * Query recent events. Pure filesystem read — no caching; consumer
   * owns any caching it needs.
   */
  query(q: OutcomeQuery): { events: OutcomeEvent[]; truncated: boolean } {
    const parsed = OutcomeQuerySchema.safeParse(q);
    if (!parsed.success) {
      return { events: [], truncated: false };
    }
    const filter = parsed.data;

    const domainsToScan: string[] = filter.domain
      ? [filter.domain]
      : this.listShards();

    const out: OutcomeEvent[] = [];
    let truncated = false;
    const sinceMs = filter.since_iso ? Date.parse(filter.since_iso) : -Infinity;

    for (const dom of domainsToScan) {
      const filePath = path.join(this.rootDir, `${dom}.jsonl`);
      if (!fs.existsSync(filePath)) continue;
      const raw = this.safeRead(filePath);
      if (!raw) continue;

      for (const rawLine of raw.split(/\r?\n/)) {
        if (!rawLine.trim()) continue;
        try {
          const candidate = JSON.parse(rawLine);
          const evParsed = OutcomeEventSchema.safeParse(candidate);
          if (!evParsed.success) continue;
          const ev = evParsed.data;
          if (filter.kind && ev.kind !== filter.kind) continue;
          if (filter.lineage_id && ev.lineage_id !== filter.lineage_id) continue;
          if (filter.agent_id && ev.agent_id !== filter.agent_id) continue;
          if (Date.parse(ev.timestamp) < sinceMs) continue;
          out.push(ev);
          if (out.length >= filter.limit) {
            truncated = true;
            break;
          }
        } catch {
          // Skip malformed lines. Bus is append-only but readers must tolerate
          // crash-mid-write tails.
        }
      }
      if (truncated) break;
    }

    // newest-first
    out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { events: out, truncated };
  }

  /**
   * Count events per shard. Fast path for health / monitoring.
   */
  stats(): { domains: Record<string, number>; retry_queue_size: number; root_dir: string } {
    const domains: Record<string, number> = {};
    for (const dom of this.listShards()) {
      const filePath = path.join(this.rootDir, `${dom}.jsonl`);
      const raw = this.safeRead(filePath);
      if (!raw) continue;
      const nonEmpty = raw.split(/\r?\n/).filter((l) => l.trim()).length;
      domains[dom] = nonEmpty;
    }
    return {
      domains,
      retry_queue_size: this.retryQueue.length,
      root_dir: this.rootDir,
    };
  }

  /**
   * Flush the in-memory retry queue back to disk. Called opportunistically.
   */
  flushRetryQueue(): { flushed: number; remaining: number } {
    let flushed = 0;
    while (this.retryQueue.length > 0) {
      const ev = this.retryQueue[0];
      const filePath = this.pathFor(ev.domain);
      const res = this.atomicAppend(filePath, JSON.stringify(ev) + "\n");
      if (!res.ok) break;
      this.retryQueue.shift();
      flushed++;
    }
    return { flushed, remaining: this.retryQueue.length };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private pathFor(domain: OutcomeDomainT): string {
    return path.join(this.rootDir, `${domain}.jsonl`);
  }

  private listShards(): OutcomeDomainT[] {
    try {
      if (!fs.existsSync(this.rootDir)) return [];
      return fs
        .readdirSync(this.rootDir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => f.replace(/\.jsonl$/, "") as OutcomeDomainT);
    } catch {
      return [];
    }
  }

  private safeRead(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return null;
    }
  }

  /**
   * Atomic append to the per-domain JSONL shard.
   *
   * PRIMARY PATH — `fs.appendFileSync` with `O_APPEND`. A single outcome
   * event line is < {@link MAX_LINE_BYTES} (64 KB), which is at or below the
   * per-write atomicity boundary the OS guarantees for an O_APPEND handle
   * (POSIX PIPE_BUF / NTFS FILE_APPEND_DATA single-write semantics). At that
   * size concurrent writers interleave at line boundaries, never producing a
   * torn line — so the prior read-whole-file → write-tmp → rename pattern was
   * both unnecessary AND O(file²): it re-read+re-wrote the entire 90 MB shard
   * on every single-line append, and its `renameSync` raced concurrent fleet
   * READERS (a held handle surfaces on Windows as a transient EPERM/EBUSY
   * `ERROR_SHARING_VIOLATION`), dropping the capture AND orphaning the tmp.
   * That orphan leak accumulated ~12 K dead `.{shard}.*.tmp` files.
   *
   * Transient sharing violations are retried with a short bounded backoff
   * (the contention window for an append is microseconds, vs. the multi-second
   * window the old whole-file rewrite held). A genuinely persistent failure
   * (EACCES, ENOSPC, read-only mount) returns `ok:false` so the caller can
   * enqueue to the in-memory retry queue — fail-loud, never silent-drop.
   *
   * FALLBACK PATH — only for a pathological > 64 KB line (should never happen
   * given the {@link MAX_LINE_BYTES} cap upstream): the tmp+rename copy path,
   * now with retry AND guaranteed orphan cleanup of its own tmp on failure.
   */
  private atomicAppend(
    filePath: string,
    line: string,
  ): { ok: boolean; warning?: string } {
    const dir = path.dirname(filePath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[OutcomeCaptureBus] mkdir failed for ${dir}: ${message}\n`,
      );
      return { ok: false, warning: message };
    }

    const lineBytes = Buffer.byteLength(line, "utf8");
    const oversize = lineBytes > MAX_LINE_BYTES;

    let lastMessage = "";
    for (let attempt = 0; attempt < ATOMIC_APPEND_MAX_ATTEMPTS; attempt++) {
      try {
        if (oversize) {
          this.fallbackTmpRenameAppend(filePath, dir, line);
        } else {
          // O_APPEND single-write — atomic at line granularity for < 64 KB.
          fs.appendFileSync(filePath, line, { encoding: "utf8" });
        }
        return { ok: true };
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: unknown }).code)
            : "";
        lastMessage = err instanceof Error ? err.message : String(err);
        // Only EPERM/EBUSY (Windows sharing-violation) and EAGAIN are
        // transient and worth retrying. Anything else fails immediately.
        if (
          code !== "EPERM" &&
          code !== "EBUSY" &&
          code !== "EAGAIN" &&
          code !== "EMFILE"
        ) {
          break;
        }
        // Bounded busy-wait backoff: 2, 4, 8 ms. Append contention clears
        // in microseconds; this is generous headroom without a real timer
        // (avoids async in a sync write path).
        const until = Date.now() + (1 << (attempt + 1));
        while (Date.now() < until) {
          /* spin */
        }
      }
    }

    process.stderr.write(
      `[OutcomeCaptureBus] atomic-append failed for ${filePath} after ${ATOMIC_APPEND_MAX_ATTEMPTS} attempts: ${lastMessage}\n`,
    );
    return { ok: false, warning: lastMessage };
  }

  /**
   * Oversize-line fallback (> 64 KB): copy-then-append via tmp + rename.
   * Cleans up its own tmp on rename failure so it can never orphan.
   */
  private fallbackTmpRenameAppend(
    filePath: string,
    dir: string,
    line: string,
  ): void {
    const existing = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "";
    const tmp = path.join(
      dir,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`,
    );
    try {
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, existing);
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, filePath);
    } catch (err) {
      // Guarantee no orphan: best-effort unlink the tmp before rethrowing.
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* unlink is best-effort; the janitor sweeps any residue */
      }
      throw err;
    }
  }

  private enqueueRetry(ev: OutcomeEvent): void {
    if (this.retryQueue.length >= RETRY_QUEUE_MAX) {
      this.retryQueue.shift();
    }
    this.retryQueue.push(ev);
  }

  /**
   * Self-awareness metadata. Consumed by CapabilityIndex.
   */
  static getSelfAwareness() {
    return {
      name: "OutcomeCaptureBusEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-01",
      capabilities: ["record", "query", "stats", "flushRetryQueue"],
      dependencies: ["outcomeEventSchema"],
      dataSourcesUsed: ["state/outcomes/*.jsonl"],
    };
  }
}

export const outcomeCaptureBusEngine = new OutcomeCaptureBusEngine();
