/**
 * scripts/hermes-graph-improvement-driver.mts
 *
 * U-ALPHA-HERMES-GRAPH-IMPROVE (slot:alpha). The engineered LOOP that drives
 * PARALLEL OPUS-FAST-MAX hermes agents to improve the system-viz graphs alpha
 * developed -- the missing graph-improvement consumer of the proven Hermes fan-out
 * chain (HermesParallelFanoutPlannerEngine -> ZuluWaveScheduler -> autonomous driver).
 *
 * This script is the I/O + CLI boundary ONLY: the pure planning core lives in
 * GraphImprovementFanoutEngine (so the hermesDispatcher action `hermes_graph_improve_plan`
 * and this cron driver share ONE planner -- R8). The driver READS the live graph-gap
 * queue from disk, calls the engine, and RECORDS the tick to a JSONL ledger.
 *
 * RUN VIA TSX (resolves the NodeNext `.js` -> `.ts` engine imports; bare `node` hits
 * the Node-24 dynamic-import trap -- see reference_charlie_train_cycle_tsx_reexec_2026_06_22):
 *   npx tsx scripts/hermes-graph-improvement-driver.mts --dry --json
 *   npx tsx scripts/hermes-graph-improvement-driver.mts --apply --budget 1500000 --count 12
 *
 * ONE TICK: read real graph gaps (LEVERAGE-WIRING-QUEUE.json -- each unwired engine is
 * a missing engine->dispatcher edge) -> engine plans the opus-fast-max fan-out ->
 * record the prioritized plan to the ledger (the PSN feed-up a live chat / Workflow
 * then consumes to actually fire the parallel batch).
 *
 * HONESTY (R12): a headless cron CANNOT spawn Claude opus sessions. So the cron
 * PRODUCES + PERSISTS the prioritized opus fan-out plan; EXECUTION is consumer-gated.
 * The `ok` exit reflects HARNESS health (read gaps + built a plan), not whether agents ran.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";
import {
  GraphImprovementFanoutEngine,
  type GraphImprovementPlan,
  type WiringQueueEntry,
} from "../mcp-server/src/engines/GraphImprovementFanoutEngine.js";
import { type AgentSpec } from "../mcp-server/src/engines/OpusFastMaxAgentSpecEngine.js";

// ---------------------------------------------------------------------------
// Paths + constants
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
export const QUEUE_PATH = path.join(REPO_ROOT, "state/shared/system-viz/LEVERAGE-WIRING-QUEUE.json");
export const BUILD_STATE_PATH = path.join(REPO_ROOT, "state/shared/BUILD_STATE.json");
export const LEDGER_PATH = path.join(REPO_ROOT, "state/shared/hermes-graph-improvement-ledger.jsonl");

const LEDGER_SCHEMA_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// I/O helpers (exported + unit-tested)
// ---------------------------------------------------------------------------

export interface WiringQueue {
  queue: WiringQueueEntry[];
  totals: { domains?: number; unwiredEngines?: number; needInference?: number };
  source: string;
  /** When the queue's source graph was generated (ISO). Drives the staleness guard. */
  graphGeneratedAt: string | null;
}

/** Default: a queue whose source graph is older than this many days is STALE. */
export const QUEUE_STALE_DAYS = 7;

/** Fail-soft read of the leverage wiring queue. Missing/corrupt -> empty (cron-safe). */
export function loadWiringQueue(queuePath: string = QUEUE_PATH): WiringQueue {
  try {
    const raw = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    const queue = Array.isArray(raw.queue) ? raw.queue : [];
    return {
      queue,
      totals: raw.totals ?? {},
      source: queuePath,
      graphGeneratedAt: typeof raw.graphGeneratedAt === "string" ? raw.graphGeneratedAt : null,
    };
  } catch {
    return { queue: [], totals: {}, source: `${queuePath} (unreadable)`, graphGeneratedAt: null };
  }
}

/**
 * PURE staleness check. The leverage queue is a SNAPSHOT of graph gaps; if it is weeks
 * old, the loop plans fan-outs for engines wired since (the empirical failure mode:
 * 118 stale "unwired" -> 4 after a fresh regen, 114 already wired). Both timestamps are
 * injected so this is deterministic/testable (no Date.now in the lib).
 *
 * @param graphGeneratedAt ISO of the queue's source graph (null -> treated as stale/unknown)
 * @param nowIso current time (ISO)
 * @param thresholdDays staleness threshold (default QUEUE_STALE_DAYS)
 * @returns { ageDays, stale } -- ageDays is null when graphGeneratedAt is null/unparseable
 */
export function queueStaleness(
  graphGeneratedAt: string | null,
  nowIso: string,
  thresholdDays: number = QUEUE_STALE_DAYS,
): { ageDays: number | null; stale: boolean } {
  if (!graphGeneratedAt) return { ageDays: null, stale: true }; // unknown age -> treat as stale (fail-loud)
  const gen = Date.parse(graphGeneratedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(gen) || !Number.isFinite(now)) return { ageDays: null, stale: true };
  const ageDays = (now - gen) / 86_400_000;
  return { ageDays, stale: ageDays > thresholdDays };
}

/**
 * Regenerate the leverage wiring queue from the (fresh) architecture-graph before planning,
 * so the loop targets CURRENT gaps. Spawns scripts/leverage-ranked-wiring-queue.mjs (which
 * reads the OOM-safe 67MB arch graph, NOT the 644MB merged graph). Fail-soft: a regen failure
 * leaves the existing queue in place (the staleness guard then warns) and never throws.
 *
 * @param spawnFn injectable spawnSync (tests pass a fake; default = node:child_process)
 * @returns { ok, reason } -- ok=true when the generator exited 0
 */
export function refreshQueue(
  spawnFn?: (cmd: string, args: string[], opts: Record<string, unknown>) => { status: number | null; error?: Error },
): { ok: boolean; reason: string } {
  try {
    // Default = the top-level ESM spawnSync (an .mts has no `require`); tests inject a fake.
    const spawn =
      spawnFn ??
      ((cmd: string, args: string[], opts: Record<string, unknown>) =>
        spawnSync(cmd, args, opts as Parameters<typeof spawnSync>[2]));
    const gen = path.join(REPO_ROOT, "scripts/leverage-ranked-wiring-queue.mjs");
    const r = spawn(process.execPath, [gen], { cwd: REPO_ROOT, timeout: 120_000, windowsHide: true });
    if (r.error) return { ok: false, reason: `regen-spawn-error:${r.error.message}` };
    return r.status === 0 ? { ok: true, reason: "regenerated" } : { ok: false, reason: `regen-exit-${r.status}` };
  } catch (e) {
    return { ok: false, reason: `regen-threw:${e instanceof Error ? e.message : String(e)}` };
  }
}

export interface LedgerEntry {
  schemaVersion: string;
  tickAt: string;
  source: string;
  ok: boolean;
  reason: string;
  budgetTokens: number;
  desiredAgents: number;
  recommendedParallel: number;
  spawned: number;
  gapsTotal: number;
  /** Source-graph generation time + staleness (R12: a stale gap source plans obsolete work). */
  graphGeneratedAt: string | null;
  queueAgeDays: number | null;
  queueStale: boolean;
  agentBatch: Array<{ subtask_id: string; slot: string; spec: AgentSpec }>;
}

/** Build a schema-versioned ledger entry from a plan. `tickAt` is injected (no Date.now in lib). */
export function buildLedgerEntry(
  plan: GraphImprovementPlan,
  meta: {
    tickAt: string;
    source: string;
    budgetTokens: number;
    desiredAgents: number;
    graphGeneratedAt?: string | null;
    queueAgeDays?: number | null;
    queueStale?: boolean;
  },
): LedgerEntry {
  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    tickAt: meta.tickAt,
    source: meta.source,
    graphGeneratedAt: meta.graphGeneratedAt ?? null,
    queueAgeDays: meta.queueAgeDays ?? null,
    queueStale: meta.queueStale ?? false,
    ok: plan.ok,
    reason: plan.reason,
    budgetTokens: meta.budgetTokens,
    desiredAgents: meta.desiredAgents,
    recommendedParallel: plan.opus.recommended_parallel,
    spawned: plan.agentBatch.length,
    gapsTotal: Number(plan.totals?.unwiredEngines ?? 0),
    agentBatch: plan.agentBatch.map((a) => ({ subtask_id: a.subtask_id, slot: a.slot, spec: a.spec })),
  };
}

/** Append a ledger entry (O_APPEND, fail-soft). Returns true on write. */
export function recordTick(entry: LedgerEntry, ledgerPath: string = LEDGER_PATH): boolean {
  try {
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.appendFileSync(ledgerPath, JSON.stringify(entry) + "\n", { encoding: "utf8", flag: "a" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argVal(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<number> {
  const json = hasFlag("json");

  // Operator kill switch -- pause the cron-driven loop without unregistering the task.
  if (process.env.PRISM_HERMES_GRAPH_IMPROVE_DISABLE === "1") {
    const payload = { ok: true, skipped: true, reason: "PRISM_HERMES_GRAPH_IMPROVE_DISABLE=1" };
    process.stdout.write(json ? JSON.stringify(payload) + "\n" : "graph-improve: DISABLED via env, skipping.\n");
    return 0;
  }

  // NaN-guard each arg (a non-numeric hand-invoked --budget/--count must not throw the engine):
  // mirror the count/max-subtasks defaults so a bad --budget falls back instead of NaN -> reject.
  const budgetRaw = Number(argVal("budget", "1500000"));
  const budgetTokens = Number.isFinite(budgetRaw) ? budgetRaw : 1_500_000;
  const desiredAgents = Number(argVal("count", "12"));
  const maxSubtasks = Number(argVal("max-subtasks", "12"));
  const apply = hasFlag("apply");

  // --refresh: regenerate the leverage queue from the fresh arch-graph BEFORE planning, so the
  // loop targets CURRENT gaps (the stale snapshot once reported 118 unwired vs 4 after regen).
  let refreshResult: { ok: boolean; reason: string } | null = null;
  if (hasFlag("refresh")) refreshResult = refreshQueue();

  const q = loadWiringQueue();
  const stale = queueStaleness(q.graphGeneratedAt, new Date().toISOString());
  if (hasFlag("list")) {
    const rows = q.queue
      .slice()
      .sort((a, b) => (b.leverageScore ?? 0) - (a.leverageScore ?? 0))
      .map((e) => `  ${String(e.domain).padEnd(14)} unwired=${String(e.unwired).padEnd(4)} leverage=${e.leverageScore ?? 0}`);
    process.stdout.write(`graph-improve gaps (${q.queue.length} domains, ${q.totals.unwiredEngines ?? "?"} unwired):\n${rows.join("\n")}\n`);
    return 0;
  }

  const plan = GraphImprovementFanoutEngine.plan({
    queue: q.queue,
    totals: q.totals,
    budgetTokens: Math.max(0, Math.trunc(budgetTokens)),
    desiredAgents: Math.max(1, Math.min(20, Math.trunc(desiredAgents) || 1)),
    maxSubtasks: Math.max(1, Math.min(20, Math.trunc(maxSubtasks) || 12)),
  });

  let recorded = false;
  if (apply) {
    // tickAt is stamped HERE (CLI boundary), never inside the pure lib/engine.
    const entry = buildLedgerEntry(plan, {
      tickAt: new Date().toISOString(),
      source: q.source,
      budgetTokens,
      desiredAgents,
      graphGeneratedAt: q.graphGeneratedAt,
      queueAgeDays: stale.ageDays,
      queueStale: stale.stale,
    });
    recorded = recordTick(entry, LEDGER_PATH);
  }

  // R12: a stale gap source plans obsolete work -- surface it LOUD (never silent).
  const staleNote = stale.stale
    ? `\n  WARNING: gap source STALE (graphGeneratedAt=${q.graphGeneratedAt ?? "unknown"}, age=${stale.ageDays?.toFixed(1) ?? "?"}d > ${QUEUE_STALE_DAYS}d) -- run with --refresh or regenerate the leverage queue.`
    : "";
  const refreshNote = refreshResult ? ` refresh=${refreshResult.ok ? "ok" : refreshResult.reason}` : "";

  if (json) {
    process.stdout.write(
      JSON.stringify({ ...plan, recorded, applied: apply, queueStale: stale.stale, queueAgeDays: stale.ageDays, refresh: refreshResult }) + "\n",
    );
  } else {
    process.stdout.write(GraphImprovementFanoutEngine.renderBatch(plan) + `\n  recorded=${recorded} applied=${apply}${refreshNote}${staleNote}\n`);
  }
  // Harness-ok: we read gaps + built a plan. A budget-refused tick is still a recorded,
  // completed attempt (exit 0) so a brief budget squeeze does not flap the scheduled task.
  return 0;
}

// Run-as-main guard: execute the CLI only when invoked directly (tests import the helpers).
const invokedDirectly = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    return Boolean(argv1) && import.meta.url.replace(/\\/g, "/").endsWith(argv1.split("/").pop() || " ");
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main()
    .then((code) => process.exit(typeof code === "number" ? code : 0))
    .catch((err) => {
      process.stderr.write(`hermes-graph-improvement-driver FATAL: ${err && err.stack ? err.stack : err}\n`);
      process.exit(1);
    });
}
