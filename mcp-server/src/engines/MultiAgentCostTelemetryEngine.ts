/**
 * MultiAgentCostTelemetryEngine — COST-CASCADE-MS0/U-MULTI-AGENT-COST-TELEMETRY
 * ============================================================================
 *
 * Per-tentacle, per-task-class cost ledger. Multi-LLM cost discipline needs
 * evidence: without a record of which tentacle (Claude / Ollama / Codex /
 * Octopus / K2 …) spent what on which task class, every cascade-calibration
 * decision (U-CASCADE-CALIBRATE) and budget alarm (U-COST-ALARM) is
 * unfounded. This engine is the evidence layer those units consume.
 *
 * Distinct from the existing token-economy engines:
 *   - `TokenEconomyEngine` / `SessionTokenLedgerEngine` track per-SESSION
 *     token budget (am I about to blow the 30k/session ceiling?).
 *   - THIS engine tracks per-CALL, per-TENTACLE, per-TASK-CLASS cost in USD
 *     across the whole multi-LLM fleet, for cost-frontier calibration.
 *   Different key, different consumer, different file. Not a duplicate
 *   (spec baseline: "cost telemetry is partial in ollama-offload-stats.json
 *   only").
 *
 * Storage: append-only JSONL at `mcp-server/data/state/cost-telemetry.jsonl`,
 * one record per line. Size-based rotation: when the active file exceeds
 * `MAX_FILE_BYTES`, it is renamed to `cost-telemetry-<epochMs>.jsonl` and a
 * fresh file is started. `aggregate()` stream-reads (line by line) so a
 * multi-GB ledger never loads into memory; corrupt / partially-written
 * trailing lines are skipped defensively rather than throwing.
 *
 * Resilience (spec failure modes):
 *   - filesystem full / append throws → the record is DROPPED and a
 *     `TELEMETRY_DROPPED` line is logged; `record()` returns `{ok:false}`
 *     but NEVER throws (telemetry must not crash the caller's hot path).
 *   - tentacle returned no usage info → caller passes `inputTokens:null`;
 *     the record is still written (with a `degraded:true` flag) so the gap
 *     is visible in aggregates rather than silently absent.
 *   - ollama / local model ($0) → `costUSD:0` is recorded explicitly, not
 *     omitted, so per-tentacle call counts stay accurate.
 *
 * Design rules: class with static methods (PRISM engine convention); DI for
 * the file path + clock so tests are hermetic; never throw on the caller's
 * path; typed result objects.
 *
 * @module engines/MultiAgentCostTelemetryEngine
 * @milestone COST-CASCADE-MS0/U-MULTI-AGENT-COST-TELEMETRY
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { PATHS } from "../constants.js";

/**
 * Default ledger location. Anchored to `PATHS.MCP_SERVER` (resolved
 * cwd-INDEPENDENTLY from the constants module's own location), NOT
 * `process.cwd()`. The step-3 callers (AISystemRouterEngine + a hook) run
 * from differing cwds (mcp-server/ vs the repo root); a cwd-relative path
 * would silently split the ledger into two files and corrupt every
 * aggregate. Overridable via `deps.filePath` for hermetic tests.
 */
export const DEFAULT_COST_TELEMETRY_PATH = path.join(
  PATHS.MCP_SERVER,
  "data",
  "state",
  "cost-telemetry.jsonl",
);

/** Rotate when the active file exceeds this many bytes (spec: 10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Schema version stamped on every record for forward migration. */
export const COST_TELEMETRY_SCHEMA_VERSION = 1;

/** Known fleet tentacles. Free-form string still accepted (forward-compat). */
export const KNOWN_TENTACLES = [
  "claude",
  "ollama",
  "codex",
  "octopus",
  "k2",
  "gemini",
] as const;

export type Tentacle = (typeof KNOWN_TENTACLES)[number] | string;

export interface CostRecordInput {
  tentacle: Tentacle;
  taskClass: string;
  /** Prompt tokens. `null` when the tentacle reported no usage (degraded). */
  inputTokens: number | null;
  /** Completion tokens. `null` when unknown (degraded). */
  outputTokens: number | null;
  latencyMs: number;
  /** USD cost. MUST be 0 (not omitted) for local/free tentacles. */
  costUSD: number;
  /** Optional free-form context (model id, session, etc.). */
  meta?: Record<string, unknown>;
}

export interface CostRecord extends CostRecordInput {
  schemaVersion: number;
  ts: string;
  /** True when inputTokens/outputTokens were null (usage unknown). */
  degraded: boolean;
}

export type CostResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string; cause?: unknown };

export interface TentacleAggregate {
  tentacle: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  /** Calls whose token counts were unknown (excluded from token sums). */
  degradedCalls: number;
}

export interface TaskClassAggregate {
  taskClass: string;
  calls: number;
  costUSD: number;
}

export interface CostAggregate {
  windowHours: number;
  sinceIso: string;
  totalCalls: number;
  totalCostUSD: number;
  byTentacle: TentacleAggregate[];
  byTaskClass: TaskClassAggregate[];
}

export interface CostTelemetryDeps {
  filePath?: string;
  /** Injectable clock (ms). Defaults to Date.now. */
  now?: () => number;
  maxFileBytes?: number;
}

function isFiniteNonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function isFiniteNonNeg(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

export class MultiAgentCostTelemetryEngine {
  /**
   * Resolve the ledger path with call-time precedence:
   *   1. explicit `deps.filePath`        (hermetic tests / callers)
   *   2. `PRISM_COST_TELEMETRY_PATH` env (ops relocation; consistent with
   *      the `resolvePath(... envNames)` convention in src/constants.ts —
   *      lets a wire test point at a tmp ledger WITHOUT writing the shared
   *      prod file, and lets operators move the ledger off the default)
   *   3. `DEFAULT_COST_TELEMETRY_PATH`   (cwd-independent mcp-server anchor)
   * Read at call time (not module load) so a per-call env change takes
   * effect — the engine never caches the resolved path.
   */
  private static resolvePath(deps: CostTelemetryDeps): string {
    if (deps.filePath) return deps.filePath;
    const env = process.env.PRISM_COST_TELEMETRY_PATH;
    if (typeof env === "string" && env.trim() !== "") return env;
    return DEFAULT_COST_TELEMETRY_PATH;
  }

  private static resolveNow(deps: CostTelemetryDeps): number {
    return (deps.now ?? Date.now)();
  }

  /**
   * Validate a record input. Returns the error string + offending field, or
   * `null` when the input is acceptable. `inputTokens`/`outputTokens` may be
   * `null` (degraded) but if a number must be a non-negative integer.
   */
  static validate(input: CostRecordInput): { error: string; field: string } | null {
    if (!input || typeof input !== "object") {
      return { error: "input required", field: "input" };
    }
    if (typeof input.tentacle !== "string" || input.tentacle.trim() === "") {
      return { error: "tentacle required", field: "tentacle" };
    }
    if (typeof input.taskClass !== "string" || input.taskClass.trim() === "") {
      return { error: "taskClass required", field: "taskClass" };
    }
    if (input.inputTokens !== null && !isFiniteNonNegInt(input.inputTokens)) {
      return {
        error: "inputTokens must be a non-negative integer or null",
        field: "inputTokens",
      };
    }
    if (input.outputTokens !== null && !isFiniteNonNegInt(input.outputTokens)) {
      return {
        error: "outputTokens must be a non-negative integer or null",
        field: "outputTokens",
      };
    }
    if (!isFiniteNonNeg(input.latencyMs)) {
      return {
        error: "latencyMs must be a non-negative finite number",
        field: "latencyMs",
      };
    }
    if (!isFiniteNonNeg(input.costUSD)) {
      return {
        error: "costUSD must be a non-negative finite number (0 for local/free)",
        field: "costUSD",
      };
    }
    return null;
  }

  /**
   * Append one cost record to the ledger. NEVER throws — telemetry must not
   * crash the caller's hot path. On a filesystem failure the record is
   * dropped and a `TELEMETRY_DROPPED` line is best-effort logged; the result
   * is `{ok:false}` so a caller that cares can react.
   *
   * @param input - the per-call cost record.
   * @param deps - optional filePath / clock / rotation-size injection.
   * @returns `{ok:true,value:CostRecord}` on success.
   */
  static record(
    input: CostRecordInput,
    deps: CostTelemetryDeps = {},
  ): CostResult<CostRecord> {
    const bad = this.validate(input);
    if (bad) return { ok: false, error: bad.error, field: bad.field };

    const filePath = this.resolvePath(deps);
    const rec: CostRecord = {
      schemaVersion: COST_TELEMETRY_SCHEMA_VERSION,
      ts: new Date(this.resolveNow(deps)).toISOString(),
      tentacle: input.tentacle,
      taskClass: input.taskClass,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      latencyMs: input.latencyMs,
      costUSD: input.costUSD,
      degraded: input.inputTokens === null || input.outputTokens === null,
      ...(input.meta ? { meta: input.meta } : {}),
    };

    try {
      this.rotateIfNeeded(filePath, deps);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      // Atomic single-line append. On both POSIX (write < PIPE_BUF) and
      // Win32 (append handle), a single newline-terminated write does not
      // interleave with a concurrent appender — line integrity is preserved
      // even under the 1000-call/min burst the spec calls out.
      fs.appendFileSync(filePath, JSON.stringify(rec) + "\n", "utf8");
      return { ok: true, value: rec };
    } catch (e) {
      this.logDropped(filePath, rec, e);
      return {
        ok: false,
        error: `TELEMETRY_DROPPED: ${e instanceof Error ? e.message : String(e)}`,
        cause: e,
      };
    }
  }

  /**
   * Accumulate one already-parsed record into the running maps. Pure;
   * shared by the streaming driver so the per-line logic is tested once.
   */
  private static accumulate(
    r: Partial<CostRecord>,
    sinceMs: number,
    tMap: Map<string, TentacleAggregate>,
    cMap: Map<string, TaskClassAggregate>,
    counters: { totalCalls: number; totalCostUSD: number },
  ): void {
    if (typeof r.ts !== "string") return;
    const recMs = Date.parse(r.ts);
    if (!Number.isFinite(recMs) || recMs < sinceMs) return;
    if (typeof r.tentacle !== "string" || typeof r.taskClass !== "string") {
      return;
    }
    const cost = isFiniteNonNeg(r.costUSD) ? r.costUSD : 0;
    const degraded = r.degraded === true;
    const inTok = isFiniteNonNegInt(r.inputTokens) ? r.inputTokens : 0;
    const outTok = isFiniteNonNegInt(r.outputTokens) ? r.outputTokens : 0;

    counters.totalCalls += 1;
    counters.totalCostUSD += cost;

    const t = tMap.get(r.tentacle) ?? {
      tentacle: r.tentacle,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      degradedCalls: 0,
    };
    t.calls += 1;
    t.costUSD += cost;
    if (degraded) {
      t.degradedCalls += 1;
    } else {
      t.inputTokens += inTok;
      t.outputTokens += outTok;
    }
    tMap.set(r.tentacle, t);

    const c = cMap.get(r.taskClass) ?? {
      taskClass: r.taskClass,
      calls: 0,
      costUSD: 0,
    };
    c.calls += 1;
    c.costUSD += cost;
    cMap.set(r.taskClass, c);
  }

  /**
   * Stream ONE segment file line-by-line via `readline` over a read
   * stream — never loads the whole file into memory (true streaming, not
   * `readFileSync`). Corrupt / partial lines are skipped defensively. A
   * file that vanished mid-read (rotation race) resolves silently.
   */
  private static streamSegment(
    file: string,
    sinceMs: number,
    tMap: Map<string, TentacleAggregate>,
    cMap: Map<string, TaskClassAggregate>,
    counters: { totalCalls: number; totalCostUSD: number },
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      let stream: fs.ReadStream;
      try {
        stream = fs.createReadStream(file, { encoding: "utf8" });
      } catch {
        resolve();
        return;
      }
      stream.on("error", () => resolve()); // vanished mid-read → skip
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });
      rl.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let r: Partial<CostRecord>;
        try {
          r = JSON.parse(trimmed) as Partial<CostRecord>;
        } catch {
          return; // defensive: skip a corrupt/partial line, do not throw
        }
        this.accumulate(r, sinceMs, tMap, cMap, counters);
      });
      rl.on("close", () => resolve());
      rl.on("error", () => resolve());
    });
  }

  /**
   * Aggregate the ledger over the trailing `windowHours`. TRUE streaming:
   * each segment is read line-by-line via `readline` over a read stream so
   * an arbitrarily large ledger never loads into memory. Includes BOTH the
   * active file AND every rotated `<base>-<...>.jsonl` segment in the same
   * directory — so a window that spans one or more rotations is not
   * silently truncated at the last rotation. Corrupt / partially-written
   * lines are skipped (defensive read), not thrown. Async (streaming I/O).
   *
   * @param windowHours - trailing window; must be a positive finite number.
   * @param deps - optional filePath / clock injection.
   * @returns per-tentacle + per-task-class sums over the window.
   */
  static async aggregate(
    windowHours: number,
    deps: CostTelemetryDeps = {},
  ): Promise<CostResult<CostAggregate>> {
    if (!isFiniteNonNeg(windowHours) || windowHours <= 0) {
      return {
        ok: false,
        error: "windowHours must be a positive finite number",
        field: "windowHours",
      };
    }
    const filePath = this.resolvePath(deps);
    const nowMs = this.resolveNow(deps);
    const sinceMs = nowMs - windowHours * 3_600_000;
    const sinceIso = new Date(sinceMs).toISOString();

    const tMap = new Map<string, TentacleAggregate>();
    const cMap = new Map<string, TaskClassAggregate>();
    const counters = { totalCalls: 0, totalCostUSD: 0 };

    // Enumerate the active file + every rotated segment of the SAME base
    // (`<base>.jsonl` and `<base>-*.jsonl`) living in the ledger dir.
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, ".jsonl");
    // Escape regex metachars in the (possibly tmp-test) base.
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const segRe = new RegExp(`^${escaped}(-.+)?\\.jsonl$`);

    let segments: string[];
    try {
      if (!fs.existsSync(dir)) {
        return {
          ok: true,
          value: {
            windowHours,
            sinceIso,
            totalCalls: 0,
            totalCostUSD: 0,
            byTentacle: [],
            byTaskClass: [],
          },
        };
      }
      segments = fs
        .readdirSync(dir)
        .filter((f) => segRe.test(f))
        .map((f) => path.join(dir, f));
    } catch (e) {
      return {
        ok: false,
        error: `aggregate dir-scan failed: ${e instanceof Error ? e.message : String(e)}`,
        cause: e,
      };
    }

    for (const seg of segments) {
      await this.streamSegment(seg, sinceMs, tMap, cMap, counters);
    }

    return {
      ok: true,
      value: {
        windowHours,
        sinceIso,
        totalCalls: counters.totalCalls,
        totalCostUSD: Number(counters.totalCostUSD.toFixed(6)),
        byTentacle: [...tMap.values()].sort((a, b) => b.costUSD - a.costUSD),
        byTaskClass: [...cMap.values()].sort((a, b) => b.costUSD - a.costUSD),
      },
    };
  }

  /**
   * Rename the active file out of the way when it exceeds the rotation
   * threshold so the next append starts a fresh file. Rotation failure is
   * swallowed (best-effort) — a too-large file is still appendable; losing
   * a rotation is far less bad than dropping the record.
   */
  private static rotateIfNeeded(
    filePath: string,
    deps: CostTelemetryDeps,
  ): void {
    const cap = deps.maxFileBytes ?? MAX_FILE_BYTES;
    try {
      if (!fs.existsSync(filePath)) return;
      const sz = fs.statSync(filePath).size;
      if (sz < cap) return;
      // Rotate to an UNCONDITIONALLY-unique name: <base>-<ms>-<pid>-<rand>.
      // No existsSync precheck — that was a TOCTOU window where two
      // same-ms appenders could both pick the same name and the second
      // renameSync would clobber a full ~10 MB segment. A fresh random
      // suffix cannot collide, so the race is eliminated by construction.
      const target = path.join(
        path.dirname(filePath),
        `${path.basename(filePath, ".jsonl")}-${this.resolveNow(deps)}-${process.pid}-${Math.random().toString(36).slice(2, 8)}.jsonl`,
      );
      fs.renameSync(filePath, target);
    } catch {
      /* best-effort: keep appending to the oversized file */
    }
  }

  private static logDropped(
    filePath: string,
    rec: CostRecord,
    cause: unknown,
  ): void {
    try {
      const dropLog = path.join(
        path.dirname(filePath),
        "cost-telemetry-dropped.log",
      );
      fs.mkdirSync(path.dirname(dropLog), { recursive: true });
      fs.appendFileSync(
        dropLog,
        `${new Date().toISOString()} TELEMETRY_DROPPED ${rec.tentacle}/${rec.taskClass} ${cause instanceof Error ? cause.message : String(cause)}\n`,
        "utf8",
      );
    } catch {
      /* the drop log itself failed — nothing more we can safely do */
    }
  }
}

export const multiAgentCostTelemetryEngine = MultiAgentCostTelemetryEngine;
