/**
 * scripts/cad-hermes-builder-driver.mts -- PA3-HERMES-CAD-BUILDER driver (I/O + CLI).
 *
 * U-CAD-HERMES-CAD-BUILDER (slot:delta, operator directive 2026-06-26). The CAD-unit
 * analogue of alpha's hermes-graph-improvement-driver: it READS the git-reconciled
 * CAD-completion status, composes alpha's OpusFastMaxAgentSpecEngine (opus cost table +
 * opus-fast-max builder spec) with the PURE planner (mcp-server/src/engines/CADBuilderFanoutEngine.ts),
 * and RECORDS a prioritized PARALLEL build fan-out plan -- one build cell per autonomous-
 * buildable PENDING CAD unit (builder + physics/test/code reviewers).
 *
 * This script is the I/O + CLI boundary ONLY: the pure planning core lives in the engine
 * mcp-server/src/engines/CADBuilderFanoutEngine.ts (so the hermesDispatcher action
 * `hermes_cad_build_plan` and this driver share ONE planner -- R8).
 *
 * RUN VIA TSX (resolves the NodeNext `.js` -> `.ts` engine import; bare `node` hits the
 * Node-24 dynamic-import trap -- see reference_charlie_train_cycle_tsx_reexec_2026_06_22):
 *   npx tsx scripts/cad-hermes-builder-driver.mts --json
 *   npx tsx scripts/cad-hermes-builder-driver.mts --apply --budget 1500000 --max-cells 8
 *
 * HONESTY (R12): a headless run CANNOT spawn Claude opus sessions. So it PRODUCES + PERSISTS
 * the prioritized opus-fast-max build-fanout PLAN (ledger + a Workflow-ready plan artifact);
 * EXECUTION is consumer-gated -- a live chat / Workflow consumes the plan and fires the batch.
 * The `ok` exit reflects HARNESS health (read status + built a plan), not whether agents ran.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  CADBuilderFanoutEngine,
  DEFAULT_MERGE_GATED_IDS,
  type FanoutPlan,
} from "../mcp-server/src/engines/CADBuilderFanoutEngine.js";
import { OpusFastMaxAgentSpecEngine } from "../mcp-server/src/engines/OpusFastMaxAgentSpecEngine.js";

// ---------------------------------------------------------------------------
// Paths + constants
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
export const STATUS_PATH = path.join(REPO_ROOT, "state/shared/specs/CAD-COMPLETION-STATUS.json");
export const LEDGER_PATH = path.join(REPO_ROOT, "state/shared/cad-hermes-builder-ledger.jsonl");
export const PLAN_PATH = path.join(REPO_ROOT, "state/shared/cad-hermes-builder-plan.json");

const LEDGER_SCHEMA_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// I/O helpers (exported + unit-tested)
// ---------------------------------------------------------------------------

export interface StatusUnit {
  id: string;
  phase?: string;
  gate?: string | null;
  op?: boolean;
  state?: string;
  title?: string;
}
export interface CadStatus {
  results: StatusUnit[];
  shipped: number;
  total: number;
  generated: string | null;
  source: string;
}

/** Fail-soft read of the CAD-completion status. Missing/corrupt -> empty (cron-safe). */
export function loadCadStatus(statusPath: string = STATUS_PATH): CadStatus {
  try {
    const raw = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    const results = Array.isArray(raw.results) ? raw.results : [];
    return {
      results,
      shipped: Number(raw.shipped ?? 0),
      total: Number(raw.total ?? results.length),
      generated: typeof raw.generated === "string" ? raw.generated : null,
      source: statusPath,
    };
  } catch {
    return { results: [], shipped: 0, total: 0, generated: null, source: `${statusPath} (unreadable)` };
  }
}

/**
 * Derive the merge-gated id set from the LIVE status (Arm-B P2: self-clear post-merge).
 * The default set (U-CAD-NURBS-STEP-EMIT / U-CAD-SCALE-COMPLEX) depends on the unmerged
 * smooth-solid emitter. Once `U-MERGE-SLOT-DELTA` is SHIPPED, those units become buildable
 * on trunk -- so return an EMPTY set rather than a frozen literal that keeps excluding them.
 *
 * @param results CAD-completion status results
 * @returns the Set to pass as opts.mergeGatedIds
 */
export function deriveMergeGatedIds(results: StatusUnit[]): Set<string> {
  const merge = (results ?? []).find((u) => u.id === "U-MERGE-SLOT-DELTA");
  const merged = merge && String(merge.state).trim().toUpperCase() === "SHIPPED";
  return merged ? new Set<string>() : new Set(DEFAULT_MERGE_GATED_IDS);
}

export interface LedgerEntry {
  schemaVersion: string;
  tickAt: string;
  source: string;
  ok: boolean;
  reason: string;
  budgetTokens: number;
  maxCells: number;
  cellCount: number;
  agentCount: number;
  totalEstTokens: number;
  perCellTokens: number;
  mergeGatedActive: boolean;
  cells: Array<{ unit: string; phase: string | null; gate: string | null }>;
  refused: Array<{ id: string; reason: string }>;
  excluded: Array<{ id: string; reason: string }>;
}

/** Build a schema-versioned ledger entry from a plan. `tickAt` is injected (no Date.now in lib). */
export function buildLedgerEntry(
  plan: FanoutPlan,
  meta: { tickAt: string; source: string; budgetTokens: number; maxCells: number; mergeGatedActive: boolean },
): LedgerEntry {
  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    tickAt: meta.tickAt,
    source: meta.source,
    ok: plan.ok,
    reason: plan.reason,
    budgetTokens: meta.budgetTokens,
    maxCells: meta.maxCells,
    cellCount: plan.cellCount,
    agentCount: plan.agentCount,
    totalEstTokens: plan.totalEstTokens,
    perCellTokens: plan.perCellTokens,
    mergeGatedActive: meta.mergeGatedActive,
    cells: plan.cells.map((c) => ({ unit: c.unit, phase: c.phase, gate: c.gate })),
    refused: plan.refused,
    excluded: plan.excluded,
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

/** Persist the full Workflow-ready plan (overwrite; the live consumer reads this to fire the batch). */
export function writePlanArtifact(plan: unknown, meta: object, planPath: string = PLAN_PATH): boolean {
  try {
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify({ schemaVersion: LEDGER_SCHEMA_VERSION, ...meta, plan }, null, 2), "utf8");
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

  // Operator kill switch -- pause the harness without unregistering any task.
  if (process.env.PRISM_CAD_HERMES_BUILDER_DISABLE === "1") {
    const payload = { ok: true, skipped: true, reason: "PRISM_CAD_HERMES_BUILDER_DISABLE=1" };
    process.stdout.write(json ? JSON.stringify(payload) + "\n" : "cad-hermes-builder: DISABLED via env, skipping.\n");
    return 0;
  }

  const budgetRaw = Number(argVal("budget", "1500000"));
  const budgetTokens = Number.isFinite(budgetRaw) ? budgetRaw : 1_500_000;
  const maxCellsRaw = Number(argVal("max-cells", "8"));
  const maxCells = Number.isFinite(maxCellsRaw) ? Math.max(1, Math.min(20, Math.trunc(maxCellsRaw))) : 8;
  const apply = hasFlag("apply");

  const status = loadCadStatus();
  const mergeGatedIds = deriveMergeGatedIds(status.results);
  const costTable = OpusFastMaxAgentSpecEngine.costTableFor("opus");
  const builderSpec = OpusFastMaxAgentSpecEngine.opusFastMaxSpec();

  const plan = CADBuilderFanoutEngine.plan({
    units: status.results,
    costTable,
    budgetTokens: Math.max(0, Math.trunc(budgetTokens)),
    builderSpec,
    maxCells,
    opts: { mergeGatedIds },
  });

  if (hasFlag("list")) {
    process.stdout.write(CADBuilderFanoutEngine.render(plan) + "\n");
    return 0;
  }

  let recorded = false;
  let planWritten = false;
  if (apply) {
    const tickAt = new Date().toISOString(); // stamped HERE (CLI boundary), never in the pure lib
    const meta = {
      tickAt,
      source: status.source,
      budgetTokens: plan.budgetTokens, // the CLAMPED value the plan actually used (R12 honesty), not the raw arg
      maxCells,
      mergeGatedActive: mergeGatedIds.size > 0,
    };
    recorded = recordTick(buildLedgerEntry(plan, meta), LEDGER_PATH);
    planWritten = writePlanArtifact(plan, { ...meta, costTable, builderSpec }, PLAN_PATH);
  }

  if (json) {
    process.stdout.write(
      JSON.stringify({ ...plan, recorded, planWritten, applied: apply, mergeGatedActive: mergeGatedIds.size > 0 }) + "\n",
    );
  } else {
    process.stdout.write(
      CADBuilderFanoutEngine.render(plan) +
        `\n  shipped=${status.shipped}/${status.total} mergeGated=${mergeGatedIds.size > 0} recorded=${recorded} planWritten=${planWritten} applied=${apply}\n`,
    );
  }
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
      process.stderr.write(`cad-hermes-builder-driver FATAL: ${err && err.stack ? err.stack : err}\n`);
      process.exit(1);
    });
}
