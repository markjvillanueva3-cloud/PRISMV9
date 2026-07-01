#!/usr/bin/env node
/**
 * hermes-work-loop-driver.mts -- the plan+draft-only parallel Hermes work loop (HERMES-WORK-LOOP-MS0/U4).
 *
 * The harness that turns the operator's "engineered loops + harnesses to launch parallel Hermes
 * agents with vault + PRISM-MCP context to speed up tasks" into a running loop -- by COMPOSING the
 * machinery that already exists (R8/dedup; it builds NO new planner/runner):
 *
 *   HermesWorkSourceFeederEngine.toSubtasks()   -- 4 work sources -> deduped, risk-classified Subtask[]
 *     -> HermesAutonomousDriveRunnerEngine.drive({ subtasks, maxParallel, gateEnabled, executor })
 *          -- the EXISTING default-OFF-gated bounded-parallel wave runner
 *     with an INJECTED executor that fires ONE ask-hermes agent per subtask, attaching:
 *          - the Obsidian VAULT (ask-hermes --with-context: top-3 memory-vault excerpts + PRISM identity)
 *          - a PRISM-MCP capability digest (the unit's relevant prism_* dispatcher actions, read-only)
 *
 * Each agent's output (plan + optional draft diff + analysis) is appended to
 *   state/shared/hermes-work-loop-ledger.jsonl  (append-only, schemaVersion, per-unit receipt)
 * for a HUMAN or a live Claude to review + commit. It NEVER commits code (operator decision 2:
 * "Plan + draft only, human commits"). The executor is read-only w.r.t. the repo.
 *
 * SAFETY: the runner's OWN default-OFF gate is reused -- drive() refuses to execute unless
 * PRISM_HERMES_AUTONOMOUS_DRIVE=1 OR --gate. We add NO second gate. A registered cron task is
 * inert until gated. The exit code reflects HARNESS health (read + planned + fired + recorded),
 * NOT whether agents produced mergeable code (R12).
 *
 * Usage:
 *   node scripts/hermes-work-loop-driver.mts [--gate] [--max-units N] [--max-parallel N] [--json] [--quiet] [--dry-run]
 *   --gate       : enable the runner's autonomous-drive gate for this run (else it plans + records but the wave is gated off)
 *   --dry-run    : feed + classify + write the PLANNED ledger, but never spawn an agent (proves the pipeline with $0)
 * Exit: 0 = harness ran. 2 = harness itself could not run (engine import / source-read / ledger-write error).
 *
 * Exported for tests: assembleContext, buildExecutor, gatherHeldClaims, loadWorkSources,
 *   appendLedgerRow, main, plus the tsx-reexec guard.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
// Canonical claim-store reader + peer-claim filter (R8 -- reuse, never re-parse the CLI shape).
// slot-task-claim.mjs is pure ESM with no top-level side effects (verified); a static import is
// safe under tsx and resolves relative to this .mts.
import {
  readStore as claimHelperReadStore,
  peerClaimedSet as claimHelperPeerClaimedSet,
} from "../.claude/helpers/slot-task-claim.mjs";

// ---------------------------------------------------------------------------
// tsx self-reexec guard (Node-24 .js->.ts dynamic-import trap, per
// reference_charlie_train_cycle_tsx_reexec). This .mts imports the .ts feeder + runner engines
// dynamically inside main(); under bare `node` that import throws ERR_MODULE_NOT_FOUND. A
// scheduled task can call bare `node scripts/hermes-work-loop-driver.mts` and we self-relaunch
// under tsx. Clone of the proven planTsxReexec in scripts/hermes-substrate-health.mjs (R8).
// ---------------------------------------------------------------------------
const TSX_LOADER_RE = /tsx[\\/](?:dist[\\/])?(?:loader|preflight|cli)/i;
/** True iff already running under the tsx loader. */
export function isUnderTsx(execArgv: string[] = process.execArgv): boolean {
  return Array.isArray(execArgv) && execArgv.some((a) => TSX_LOADER_RE.test(String(a)));
}
/** Resolve the tsx CLI under mcp-server; null if absent. */
export function resolveTsxCli(cwd: string = process.cwd()): string | null {
  const cli = path.resolve(cwd, "mcp-server/node_modules/tsx/dist/cli.mjs");
  return existsSync(cli) ? cli : null;
}
/** Decide whether to re-exec under tsx. reexec only when NOT under tsx, breaker unset, tsx present. */
export function planTsxReexec(
  { execArgv = process.execArgv, env = process.env, cwd = process.cwd() }:
    { execArgv?: string[]; env?: NodeJS.ProcessEnv; cwd?: string } = {},
): { reexec: boolean; reason: string; tsxCli: string | null } {
  if (isUnderTsx(execArgv)) return { reexec: false, reason: "already-under-tsx", tsxCli: null };
  if (env.PRISM_HWL_REEXEC === "1") return { reexec: false, reason: "reexec-breaker-set", tsxCli: null };
  if (env.PRISM_HWL_NO_REEXEC === "1") return { reexec: false, reason: "reexec-disabled", tsxCli: null };
  const tsxCli = resolveTsxCli(cwd);
  if (!tsxCli) return { reexec: false, reason: "tsx-absent", tsxCli: null };
  return { reexec: true, reason: "bare-node-needs-tsx", tsxCli };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const ASK_HERMES = path.join(REPO_ROOT, "scripts", "ask-hermes.mjs");
const LEDGER_PATH = path.join(REPO_ROOT, "state", "shared", "hermes-work-loop-ledger.jsonl");
const LEDGER_SCHEMA_VERSION = "1.0.0";

// The 4 operator-chosen work sources. Each is read + normalized into WorkSourceUnit[] by
// loadWorkSources(); the feeder maps/dedupes/classifies. (R12: a missing source file is logged
// + skipped, not fatal -- a partial feed still drives a useful loop.)
const SOURCE_FILES = {
  roadmap: path.join(REPO_ROOT, "state", "shared", "specs", "ROADMAP-CONSOLIDATED.json"),
  research: path.join(REPO_ROOT, "state", "shared", "specs", "MISC-TASKS-INVENTORY.json"),
  wiringDir: path.join(REPO_ROOT, "state", "shared"), // UNWIRED-ENGINE-AUDIT-<date>.json (newest)
} as const;

/** A normalized work-source row -- mirrors the feeder's WorkSourceUnit shape. */
export interface RawWorkUnit {
  unit_id: string;
  title: string;
  source: "roadmap" | "research" | "wiring" | "synthesis";
  domain?: string;
  detail?: string;
  milestone?: string;
}

/**
 * Read the 4 work-source files and normalize each into RawWorkUnit[]. PURE-ish: file reads only,
 * no spawn. A missing/malformed source is skipped (logged via the returned `skipped` list), never
 * thrown -- the feeder + driver tolerate a partial feed. `readJson` is injectable for tests.
 */
export function loadWorkSources(
  deps: { readJson?: (p: string) => unknown; listDir?: (p: string) => string[]; files?: typeof SOURCE_FILES } = {},
): { units: RawWorkUnit[]; skipped: string[] } {
  const readJson = deps.readJson ?? ((p: string) => JSON.parse(fs.readFileSync(p, "utf8")));
  const listDir = deps.listDir ?? ((p: string) => fs.readdirSync(p));
  const files = deps.files ?? SOURCE_FILES;
  const units: RawWorkUnit[] = [];
  const skipped: string[] = [];

  // 1. roadmap -- ROADMAP-CONSOLIDATED.pending_units[] {unit_id,title,milestone,source}
  try {
    const j = readJson(files.roadmap) as { pending_units?: Array<Record<string, unknown>> };
    for (const u of j.pending_units ?? []) {
      if (typeof u.unit_id === "string" && typeof u.title === "string") {
        units.push({
          unit_id: u.unit_id,
          title: u.title,
          source: "roadmap",
          milestone: typeof u.milestone === "string" ? u.milestone : undefined,
        });
      }
    }
  } catch (e) {
    skipped.push(`roadmap: ${(e as Error).message}`);
  }

  // 2. research -- MISC-TASKS-INVENTORY.items[] {title,evidence,milestone_or_unit_id}
  try {
    const j = readJson(files.research) as { items?: Array<Record<string, unknown>> };
    for (const it of j.items ?? []) {
      const id = typeof it.milestone_or_unit_id === "string" ? it.milestone_or_unit_id : null;
      if (id && typeof it.title === "string") {
        units.push({
          unit_id: id,
          title: it.title,
          source: "research",
          detail: typeof it.evidence === "string" ? it.evidence : undefined,
        });
      }
    }
  } catch (e) {
    skipped.push(`research: ${(e as Error).message}`);
  }

  // 3. wiring -- the NEWEST UNWIRED-ENGINE-AUDIT-<date>.json .unwiredEngines[] {engine,suggestedDispatcher}
  try {
    const audits = listDir(files.wiringDir)
      .filter((f) => /^UNWIRED-ENGINE-AUDIT-.*\.json$/.test(f))
      .sort();
    const newest = audits[audits.length - 1];
    if (newest) {
      const j = readJson(path.join(files.wiringDir, newest)) as { unwiredEngines?: Array<Record<string, unknown>> };
      for (const w of j.unwiredEngines ?? []) {
        if (typeof w.engine === "string") {
          units.push({
            unit_id: w.engine,
            title: `Wire unwired engine ${w.engine} to its dispatcher`,
            source: "wiring",
            domain: typeof w.suggestedDispatcher === "string" ? w.suggestedDispatcher : undefined,
            detail: typeof w.suggestedDispatcher === "string" ? `suggested: ${w.suggestedDispatcher}` : undefined,
          });
        }
      }
    } else {
      skipped.push("wiring: no UNWIRED-ENGINE-AUDIT-*.json found");
    }
  } catch (e) {
    skipped.push(`wiring: ${(e as Error).message}`);
  }

  return { units, skipped };
}

/**
 * Return the set of candidate unit_ids claimed by a PEER slot, so the feeder excludes them (a
 * Hermes agent must never race a live work slot). REUSES the canonical `slot-task-claim.mjs`
 * exports `readStore` + `peerClaimedSet` (R8 -- a re-implementation introduced a real array-vs-map
 * shape bug; `list --json` emits `claims` as an ARRAY via Object.values, while `peerClaimedSet`
 * reads the in-memory `store.claims` MAP correctly and already handles expiry + own-identity).
 *
 * `mySlot`/`myChatId` identify THIS loop so its own claims are NOT treated as peer claims. When
 * either is absent, `peerClaimedSet` is correctly MOST-RESTRICTIVE (every active claim is a peer
 * claim) -- the safe default for an identity-less loop. Fail-soft: any read/import error -> empty
 * set (the feeder degrades to no-claim-filter, which only RISKS overlap, never blocks the loop).
 * `readStoreImpl`/`peerClaimedSetImpl` injectable for tests.
 */
export function gatherHeldClaims(
  unitIds: string[],
  deps: {
    readStoreImpl?: () => { claims?: Record<string, unknown>; readOnly?: boolean; reason?: string };
    peerClaimedSetImpl?: (store: unknown, mySlot: string | undefined, myChatId: string | undefined, unitIds: string[], nowIso: string) => Set<string>;
    mySlot?: string;
    myChatId?: string;
    nowIso?: string;
    /** Surface a non-fatal warning (R12 -- a corrupt/schema-mismatched claim store is fail-soft
     *  but must NOT be invisible: readStore returns a {readOnly, reason} sentinel instead of
     *  throwing, so the loop would silently run with NO peer-claim filter unless we log it). */
    onWarn?: (msg: string) => void;
  } = {},
): string[] {
  try {
    const readStore = deps.readStoreImpl ?? claimHelperReadStore;
    const peerClaimedSet = deps.peerClaimedSetImpl ?? claimHelperPeerClaimedSet;
    if (!readStore || !peerClaimedSet) return [];
    const store = readStore();
    // A readOnly sentinel means the store was corrupt / schema-mismatched / unreadable. peerClaimedSet
    // on it returns an empty set (claims:{}), so the loop runs with NO claim filter -- the SAFE
    // direction (risks overlap, never a wrong commit -- the loop never commits), but the corruption
    // must be surfaced, not swallowed (R12). The loop still continues.
    if (store && store.readOnly) {
      deps.onWarn?.(`claim store unreadable (${store.reason ?? "unknown reason"}) -> running WITHOUT a peer-claim filter (may overlap a live slot; the loop never commits)`);
    }
    const nowIso = deps.nowIso ?? new Date().toISOString();
    return [...peerClaimedSet(store, deps.mySlot, deps.myChatId, unitIds, nowIso)];
  } catch {
    return []; // fail-soft: no claim filter rather than blocking the loop
  }
}

/**
 * Assemble the per-subtask agent prompt: the unit's work + a PRISM-MCP capability digest (the
 * relevant prism_* dispatcher actions, read-only -- so the agent knows which PRISM capability to
 * reason about). The Obsidian VAULT is attached separately by ask-hermes `--with-context`. PURE.
 *
 * @param posture plan|draft -- a draft posture asks for a concrete diff; plan asks for analysis only.
 */
export function assembleContext(
  subtask: { subtask_id: string; description: string; domain: string },
  posture: "plan" | "draft",
  mcpDigest: string,
): string {
  const ask = posture === "draft"
    ? "Produce: (1) a concise PLAN, (2) a concrete DRAFT diff or code sketch a human can review + commit. Do NOT claim it is committed -- a human commits."
    : "Produce a concise PLAN / analysis only. No code changes.";
  return [
    `# Hermes work-loop unit: ${subtask.subtask_id} (domain: ${subtask.domain})`,
    ``,
    `## Task`,
    subtask.description,
    ``,
    `## Relevant PRISM MCP capabilities (read-only -- reason about these, do not invent actions)`,
    mcpDigest,
    ``,
    `## What to produce`,
    ask,
  ].join("\n");
}

/**
 * A tiny static PRISM-MCP capability digest keyed by domain keyword. NOT a live MCP call (the
 * driver is read-only + sandboxed); a curated pointer so the agent reasons about the right
 * dispatcher. Falls back to the universal set. PURE.
 */
export function mcpDigestFor(domain: string, description: string): string {
  const hay = `${domain} ${description}`.toLowerCase();
  const lines: string[] = [];
  if (/mill|speed|feed|force|kienzle|cutting/.test(hay)) lines.push("- prism_calc (physics: cutting_force, speed_feed, tool_life)");
  if (/lathe|turning|okuma/.test(hay)) lines.push("- prism_turning (lathe ops, single-point thread, chuck force)");
  if (/wedm|edm|wire/.test(hay)) lines.push("- prism_edm (wire/sinker EDM, WEDM-P2P pipeline)");
  if (/cam|toolpath|post|fusion|mastercam|hypermill/.test(hay)) lines.push("- prism_cam / prism_pp (toolpath + post-processor generation)");
  if (/cad|geometry|feature/.test(hay)) lines.push("- prism_cad (geometry, feature recognition, dfm)");
  if (/quote|cost|estimat|erp|business/.test(hay)) lines.push("- prism_business / prism_quoting (cost, quote, ERP)");
  if (/wire|wiring|dispatcher|engine/.test(hay)) lines.push("- prism_dev (build/test/wiring audit), prism_session (dispatcher_map)");
  if (lines.length === 0) lines.push("- prism_session:dispatcher_map_compact (discover the right dispatcher), prism_dev (build/test)");
  return lines.join("\n");
}

/**
 * Build the SubtaskExecutor injected into HermesAutonomousDriveRunnerEngine.drive(). Each call
 * fires ONE ask-hermes agent for the subtask: cloud lane -> `ask` mode (Grok reasoning); local
 * lane -> `summarize` mode (Ollama). `--with-context` attaches the vault. The agent's output (the
 * plan/draft) is appended to the ledger -- NEVER committed. Returns {ok, output} for the runner.
 *
 * @param classifiedById  subtask_id -> {lane, posture, risk, source} from the feeder.
 * @param deps  spawn (ask-hermes), append (ledger), dryRun (skip the spawn), now (timestamp).
 */
export function buildExecutor(
  classifiedById: Map<string, { lane: "cloud" | "local"; posture: "plan" | "draft"; risk: string; source: string }>,
  deps: {
    spawn?: (exe: string, args: string[], input: string) => string;
    append?: (path: string, line: string) => void;
    ledgerPath?: string;
    dryRun?: boolean;
    now?: () => string;
  } = {},
): (subtask: { subtask_id: string; description: string; domain: string }) => Promise<{ ok: boolean; output?: string; error?: string }> {
  const spawn = deps.spawn ?? ((exe, args, input) =>
    execFileSync(exe, args, { encoding: "utf8", input, windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024 }));
  const append = deps.append ?? ((p: string, line: string) => fs.appendFileSync(p, line));
  const ledgerPath = deps.ledgerPath ?? LEDGER_PATH;
  const now = deps.now ?? (() => new Date().toISOString());

  return async (subtask) => {
    const cls = classifiedById.get(subtask.subtask_id) ?? { lane: "local", posture: "plan", risk: "read-only", source: "roadmap" };
    // ALWAYS `ask` -- the literal-query mode. The file-modes (summarize/explain/...) treat the
    // positional arg as a FILE PATH; passing a literal prompt to `summarize` hits ask-hermes's
    // lenient not-a-file fallback (a noisy advisory + the wrong code path). The cloud-vs-local
    // lane is NOT the ask-hermes mode -- it's the proxy's own Hermes/Ollama routing; the driver
    // records `lane` in the ledger row for the reviewer, but the invocation mode is always `ask`.
    const mode = "ask";
    const prompt = assembleContext(subtask, cls.posture, mcpDigestFor(subtask.domain, subtask.description));

    let agentOutput = "";
    let ok = true;
    let error: string | undefined;
    if (deps.dryRun) {
      agentOutput = "[dry-run: agent not spawned]";
    } else {
      try {
        // ask-hermes ask <input> --with-context --json  (vault attached, machine-readable).
        // `ask` takes the literal prompt as the positional input; --with-context prepends vault excerpts.
        agentOutput = spawn(process.execPath, [ASK_HERMES, mode, prompt, "--with-context", "--json"], prompt);
      } catch (e) {
        ok = false;
        error = `ask-hermes failed: ${(e as Error).message}`;
        agentOutput = error;
      }
    }

    // Append the per-unit receipt -- plan/draft for HUMAN review. NEVER a commit.
    const row = appendLedgerRow(
      {
        subtask_id: subtask.subtask_id,
        domain: subtask.domain,
        lane: cls.lane,
        posture: cls.posture,
        risk: cls.risk,
        source: cls.source,
        mode,
        ok,
        error,
        agentOutput: agentOutput.slice(0, 20000), // bound the row
        committed: false, // ALWAYS false -- operator decision 2: plan+draft-only, human commits
      },
      { append, ledgerPath, now: now() },
    );

    return { ok, output: row.committed === false ? `recorded plan/draft for ${subtask.subtask_id} (not committed)` : undefined, error };
  };
}

/** Append one schema-stamped, timestamped receipt row to the work-loop ledger. PURE w.r.t. logic. */
export function appendLedgerRow(
  receipt: Record<string, unknown>,
  deps: { append: (path: string, line: string) => void; ledgerPath: string; now: string },
): Record<string, unknown> {
  const row = { schemaVersion: LEDGER_SCHEMA_VERSION, stampedAt: deps.now, ...receipt };
  deps.append(deps.ledgerPath, JSON.stringify(row) + "\n");
  return row;
}

/** Parse the CLI flags. PURE. */
export function parseArgs(argv: string[]): {
  gate: boolean; json: boolean; quiet: boolean; dryRun: boolean; maxUnits: number; maxParallel: number;
} {
  const has = (f: string) => argv.includes(f);
  const num = (f: string, dflt: number) => {
    const i = argv.indexOf(f);
    if (i >= 0 && argv[i + 1]) { const n = Number(argv[i + 1]); if (Number.isFinite(n) && n > 0) return Math.floor(n); }
    return dflt;
  };
  return {
    gate: has("--gate") || process.env.PRISM_HERMES_AUTONOMOUS_DRIVE === "1",
    json: has("--json"),
    quiet: has("--quiet"),
    dryRun: has("--dry-run"),
    maxUnits: num("--max-units", 6),
    maxParallel: num("--max-parallel", 3),
  };
}

/**
 * The harness. Read sources -> feed -> drive (gated) with the ask-hermes executor -> ledger.
 * Returns { exitCode, summary }. NEVER commits. Engines imported dynamically (post tsx-reexec).
 */
export async function main(
  argv: string[],
  deps: {
    loadSources?: typeof loadWorkSources;
    gatherClaims?: typeof gatherHeldClaims;
    makeExecutor?: typeof buildExecutor;
    feeder?: { toSubtasks: (req: unknown) => { subtasks: Array<{ subtask: { subtask_id: string; description: string; domain: string }; risk: string; executor_lane: "cloud" | "local"; posture: "plan" | "draft"; source: string }>; excludedClaimed: number; excludedMalformed: number; excludedDuplicate: number; consideredCount: number } };
    runner?: { drive: (opts: Record<string, unknown>) => Promise<{ ran: boolean; gated: boolean; reason: string | null; aggregate?: unknown }> };
    log?: (msg: string) => void;
  } = {},
): Promise<{ exitCode: number; summary: Record<string, unknown> }> {
  const args = parseArgs(argv);
  const log = deps.log ?? ((m: string) => { if (!args.quiet) process.stderr.write(m + "\n"); });

  try {
    // 1. Engines -- dynamic import (tsx-reexec already happened in the run-as-main block).
    const feeder = deps.feeder ?? (await import("../mcp-server/src/engines/HermesWorkSourceFeederEngine.js")).HermesWorkSourceFeederEngine;
    const runner = deps.runner ?? (await import("../mcp-server/src/engines/HermesAutonomousDriveRunnerEngine.js")).HermesAutonomousDriveRunnerEngine;

    // 2. Read + normalize the 4 work sources.
    const loadSources = deps.loadSources ?? loadWorkSources;
    const { units, skipped } = loadSources();
    log(`work-loop: ${units.length} candidate unit(s) from sources; ${skipped.length} source(s) skipped`);

    // 3. Held-claims (peer slots) -> feed (dedupe + risk-classify). This loop's OWN identity (so
    //    its own claims aren't treated as peer claims) comes from env if present; absent identity
    //    -> peerClaimedSet is most-restrictive (every active claim is a peer claim), the safe
    //    default for an identity-less cron run.
    const gatherClaims = deps.gatherClaims ?? gatherHeldClaims;
    const mySlot = process.env.PRISM_HERMES_LOOP_SLOT || undefined;
    const myChatId = process.env.CLAUDE_CODE_SESSION_ID || undefined;
    const heldClaims = gatherClaims(units.map((u) => u.unit_id), {
      mySlot,
      myChatId,
      onWarn: (m) => log(`work-loop: ${m}`), // R12 -- a corrupt claim store is logged, not swallowed
    });
    const fed = feeder.toSubtasks({ sources: units, heldClaims, maxUnits: args.maxUnits });
    log(`work-loop: ${fed.subtasks.length} subtask(s) after dedup/claim-filter (excludedClaimed=${fed.excludedClaimed}, dup=${fed.excludedDuplicate}, malformed=${fed.excludedMalformed})`);

    if (fed.subtasks.length === 0) {
      const summary = { ranAgents: 0, picked: 0, gated: args.gate, dryRun: args.dryRun, skippedSources: skipped, reason: "no-units-after-filter" };
      if (args.json) process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
      return { exitCode: 0, summary };
    }

    // 4. Build the executor (one ask-hermes agent per subtask, vault+MCP context, ledger-record-never-commit).
    const classifiedById = new Map(fed.subtasks.map((s) => [s.subtask.subtask_id, { lane: s.executor_lane, posture: s.posture, risk: s.risk, source: s.source }]));
    const makeExecutor = deps.makeExecutor ?? buildExecutor;
    const executor = makeExecutor(classifiedById, { dryRun: args.dryRun });

    // 5. Drive -- the runner's OWN default-OFF gate decides whether the wave fires. We pass it
    //    through; we add NO second gate. drive() never throws on an executor rejection.
    const driveResult = await runner.drive({
      subtasks: fed.subtasks.map((s) => s.subtask),
      executor,
      maxParallel: args.maxParallel,
      gateEnabled: args.gate,
      parent_task_id: "hermes-work-loop",
    });

    // DriveRunResult shape (verified live): { ran, gated, reason, aggregate, trace }. `ran` is
    // whether the wave executed (gate open + subtasks present); a gated-off run is ran:false.
    // The executor fired once per subtask iff ran -- so ranAgents == picked when ran.
    const summary = {
      ranAgents: driveResult.ran ? fed.subtasks.length : 0,
      picked: fed.subtasks.length,
      gated: args.gate,
      dryRun: args.dryRun,
      driveRan: driveResult.ran,
      driveReason: driveResult.reason ?? null,
      excludedClaimed: fed.excludedClaimed,
      excludedDuplicate: fed.excludedDuplicate,
      excludedMalformed: fed.excludedMalformed,
      skippedSources: skipped,
      ledger: LEDGER_PATH,
      committed: false, // operator decision 2 -- the loop NEVER commits code
    };
    if (args.json) process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    log(`work-loop: done -- gated=${args.gate} driveRan=${driveResult.ran} (${driveResult.reason ?? "ran"}); ledger=${LEDGER_PATH}; NO commits`);
    return { exitCode: 0, summary };
  } catch (e) {
    log(`work-loop: HARNESS FAILURE (fail-loud): ${(e as Error).message}`);
    if (args.json) process.stdout.write(JSON.stringify({ error: (e as Error).message }, null, 2) + "\n");
    return { exitCode: 2, summary: { error: (e as Error).message } };
  }
}

// ---------------------------------------------------------------------------
// run-as-main: tsx-reexec guard, then main().
// ---------------------------------------------------------------------------
const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  const plan = planTsxReexec();
  if (plan.reexec && plan.tsxCli) {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(process.execPath, [plan.tsxCli, fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      stdio: "inherit",
      env: { ...process.env, PRISM_HWL_REEXEC: "1" },
      windowsHide: true,
    });
    process.exit(r.status ?? 0);
  } else {
    const { exitCode } = await main(process.argv.slice(2));
    process.exit(exitCode);
  }
}
