#!/usr/bin/env node
/**
 * hermes-substrate-health.mjs -- LIVE liveness harness for the Hermes substrate.
 *
 * The I/O boundary for HermesSubstrateHealthEngine (the pure grader). The operator's
 * "harden first, then loop" directive (2026-06-29): before building a parallel work-loop
 * on Hermes, PROVE the substrate works. Ten Hermes scheduled tasks are registered + Ready,
 * but `ask-hermes` historically fell back to Ollama 12/13 calls -- "Ready" is not proof.
 *
 * This runner gathers a LIVE SubstrateProbe and grades it:
 *   1. Proxy /health -- reuses checkHermesProxy() from reconcile-zulu-ledger.mjs (R8 clone-don't-fork;
 *      the origin-strip /v1 -> root /health is already correct there, avoiding the /v1/health 404 false-DOWN).
 *   2. A REAL ask-hermes round-trip (`ask <q> --json`) -- the decision-time authority. We read the
 *      answering `source` to learn if the Hermes lane works NOW (vs the stale lifetime counter).
 *   3. The 10 expected Hermes scheduled tasks via `schtasks /Query` -- state + last result.
 *
 * Appends one graded receipt to state/shared/hermes-substrate-health.jsonl (append-only ledger).
 * Read-only w.r.t. the Hermes install + tasks: it only PROBES, never mutates.
 *
 * Usage:
 *   node scripts/hermes-substrate-health.mjs [--json] [--no-roundtrip] [--quiet]
 * Exit: 0 = harness ran (regardless of verdict -- a DOWN substrate is a successful PROBE).
 *       2 = harness itself could not run (engine import / ledger write error).
 *
 * Exported for tests: gatherProbe(deps), main(argv, deps).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { checkHermesProxy, hermesHealthUrl } from "./reconcile-zulu-ledger.mjs";

// ---------------------------------------------------------------------------
// tsx self-reexec guard (Node-24 .js->.ts dynamic-import trap, per
// reference_charlie_train_cycle_tsx_reexec). This .mjs imports the .ts engine
// dynamically inside main(); under bare `node` that import throws ERR_MODULE_NOT_FOUND
// (type-strip does not rewrite a .js specifier to its .ts sibling). So a scheduled task
// can call bare `node scripts/hermes-substrate-health.mjs` and we self-relaunch under tsx.
// Mirrors the proven planTsxReexec in scripts/quoting-train-cycle.mjs (clone, R8).
// ---------------------------------------------------------------------------
const TSX_LOADER_RE = /tsx[\\/](?:dist[\\/])?(?:loader|preflight|cli)/i;
/** True iff already running under the tsx loader. */
export function isUnderTsx(execArgv = process.execArgv) {
  return Array.isArray(execArgv) && execArgv.some((a) => TSX_LOADER_RE.test(String(a)));
}
/** Resolve the tsx CLI under mcp-server; null if absent. */
export function resolveTsxCli(cwd = process.cwd()) {
  const cli = path.resolve(cwd, "mcp-server/node_modules/tsx/dist/cli.mjs");
  return existsSync(cli) ? cli : null;
}
/** Decide whether to re-exec under tsx. reexec only when NOT under tsx, breaker unset, tsx present. */
export function planTsxReexec({ execArgv = process.execArgv, env = process.env, cwd = process.cwd() } = {}) {
  if (isUnderTsx(execArgv)) return { reexec: false, reason: "already-under-tsx", tsxCli: null };
  if (env.PRISM_HSH_REEXEC === "1") return { reexec: false, reason: "reexec-breaker-set", tsxCli: null };
  if (env.PRISM_HSH_NO_REEXEC === "1") return { reexec: false, reason: "reexec-disabled", tsxCli: null };
  const tsxCli = resolveTsxCli(cwd);
  if (!tsxCli) return { reexec: false, reason: "tsx-absent", tsxCli: null };
  return { reexec: true, reason: "bare-node-needs-tsx", tsxCli };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const ASK_HERMES = path.join(REPO_ROOT, "scripts", "ask-hermes.mjs");
const LEDGER_PATH = path.join(REPO_ROOT, "state", "shared", "hermes-substrate-health.jsonl");
const PROXY_URL = process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";

/** The 10 Hermes scheduled tasks the install fleet registers (the expected set). */
export const EXPECTED_TASKS = [
  "PRISM Hermes Cron Prewarm",
  "PRISM Hermes Dream-Cycle Synth",
  "PRISM Hermes GEPA Weekly",
  "PRISM Hermes Graph Improvement",
  "PRISM Hermes Proxy",
  "PRISM Hermes Self-Reflect Weekly",
  "PRISM Hermes Skill Loop",
  "PRISM Hermes Vault Digest",
  "PRISM Hermes-Obsidian Bridge",
  "PRISM Zebra Orchestrator",
];

/** Windows result code for "task has not yet run". */
const TASK_NEVER_RUN = 267011;

/**
 * Run a real ask-hermes round-trip and report whether it REACHED Hermes (vs fell back).
 * `ask <q> --json` exits 0 on a Hermes answer OR an Ollama-fallback answer; we read the
 * answering source. A non-zero exit (or unparseable output) => ran:false.
 * Injectable spawn for tests.
 */
export function probeRoundTrip(deps = {}) {
  const spawn = deps.spawn || execFileSync;
  const q = "Reply with the single word: PONG. (Hermes substrate liveness probe.)";
  const t0 = Date.now();
  try {
    const out = spawn(
      process.execPath,
      [ASK_HERMES, "ask", q, "--json", "--timeout", "30000", "--max-tokens", "16"],
      { encoding: "utf8", timeout: 45_000, windowsHide: true },
    );
    const ms = Date.now() - t0;
    // ask-hermes --json writes a single JSON object; the answering path is in `source`
    // ("hermes" = reached Hermes; "ollama-fallback"/"none" = fell back). A parse failure
    // is genuinely UNKNOWN -- never substring-sniff "hermes" out of raw stdout, because the
    // Ollama-fallback --json object itself carries a `hermesError` key (contains "hermes"),
    // which would flip a real fallback into a false reachedHermes:true (scrutiny P2, both arms).
    let parsed = null;
    try {
      parsed = JSON.parse(String(out).trim().split(/\n/).filter(Boolean).pop() || "{}");
    } catch {
      parsed = null;
    }
    const source = parsed && typeof parsed.source === "string" ? parsed.source : "unknown";
    return { ran: true, source, reachedHermes: source === "hermes", ms, error: null };
  } catch (e) {
    const err = e || {};
    if (err.killed || err.signal) {
      return { ran: false, source: "timeout", reachedHermes: false, ms: Date.now() - t0, error: `ask-hermes timed out (killed)` };
    }
    return { ran: false, source: "error", reachedHermes: false, ms: Date.now() - t0, error: String(err.stderr || err.message || err).slice(0, 300) };
  }
}

/**
 * Query the expected Hermes scheduled tasks via schtasks. Returns a ScheduledTaskProbe[].
 * A task that is not registered is simply absent from the result (the engine flags it via
 * expectedTasks). Injectable spawn for tests. Fail-soft: a query error => state "Unknown".
 */
export function probeTasks(deps = {}) {
  const spawn = deps.spawn || execFileSync;
  const names = deps.expectedTasks || EXPECTED_TASKS;
  const out = [];
  for (const name of names) {
    try {
      const raw = spawn("schtasks", ["/Query", "/TN", name, "/V", "/FO", "LIST"], {
        encoding: "utf8",
        timeout: 15_000,
        windowsHide: true,
      });
      const text = String(raw);
      const stateM = text.match(/^\s*Status:\s*(.+)$/im) || text.match(/^\s*Scheduled Task State:\s*(.+)$/im);
      const lastRunM = text.match(/^\s*Last Run Time:\s*(.+)$/im);
      const lastResultM = text.match(/^\s*Last Result:\s*(.+)$/im);
      const stateRaw = stateM ? stateM[1].trim() : "Unknown";
      // schtasks "Status" = Ready|Running|Disabled; normalize.
      const state = /disabled/i.test(stateRaw) ? "Disabled" : /running/i.test(stateRaw) ? "Running" : /ready/i.test(stateRaw) ? "Ready" : stateRaw;
      const lastRunRaw = lastRunM ? lastRunM[1].trim() : null;
      const lastRunTime = lastRunRaw && !/never|n\/a/i.test(lastRunRaw) ? lastRunRaw : null;
      let lastResult = null;
      if (lastResultM) {
        const v = lastResultM[1].trim();
        const n = v.startsWith("0x") ? parseInt(v, 16) : parseInt(v, 10);
        lastResult = Number.isFinite(n) ? n : null;
      }
      out.push({ name, state, lastRunTime, lastResult });
    } catch {
      // Not registered, or schtasks unavailable -> omit (engine's expectedTasks flags it).
    }
  }
  return out;
}

/** Read the lifetime ask-hermes usage counters (the SUSPECT-not-verdict historical signal). */
export function readUsage(deps = {}) {
  const readFile = deps.readFile || ((p) => fs.readFileSync(p, "utf8"));
  const statsPath = deps.statsPath || path.join(REPO_ROOT, "mcp-server", "data", "state", "ollama-offload-stats.json");
  try {
    const s = JSON.parse(readFile(statsPath));
    const h = s?.byHook?.["ask-hermes"] || s?.byHook?.["hermes"] || null;
    if (!h) return undefined;
    return { fired: Number(h.fired || 0), bySource: h.bySource || {} };
  } catch {
    return undefined;
  }
}

/** Gather the full live SubstrateProbe. Async (the proxy probe is async). Injectable for tests. */
export async function gatherProbe(deps = {}) {
  const proxyFn = deps.checkProxy || checkHermesProxy;
  const healthFn = deps.healthUrl || hermesHealthUrl;
  const proxyRaw = await proxyFn(PROXY_URL);
  // A DIRECT OpenAI-compatible lane (e.g. PRISM_HERMES_PROXY_URL repointed at the NVIDIA
  // integrate endpoint -- the HERMES-NVIDIA-LANE, ask-hermes.mjs:79) is NOT the local OAuth
  // proxy: it has no OAuth pool, so its /health reporting authenticated:false (or 404) is
  // EXPECTED, not a detach. We flag the lane so the engine doesn't grade a healthy direct
  // lane "degraded" purely for authenticated:false (U2: the harness's own live finding).
  const isDirectLane = !/127\.0\.0\.1:8645|localhost:8645/.test(PROXY_URL);
  const proxy = {
    url: healthFn(PROXY_URL),
    ok: proxyRaw.ok === true,
    status: proxyRaw.ok ? "ok" : null,
    authenticated: typeof proxyRaw.authenticated === "boolean" ? proxyRaw.authenticated : null,
    upstream: proxyRaw.upstream ?? null,
    error: proxyRaw.error ?? null,
    lane: isDirectLane ? "direct" : "oauth-proxy",
  };
  // Also probe the canonical LOCAL :8645 OAuth proxy so the receipt is honest about the
  // OAuth pool state even when the configured lane is a direct endpoint. Best-effort.
  let localProxy = null;
  if (isDirectLane) {
    try {
      const localRaw = await proxyFn("http://127.0.0.1:8645/v1");
      localProxy = {
        url: healthFn("http://127.0.0.1:8645/v1"),
        ok: localRaw.ok === true,
        authenticated: typeof localRaw.authenticated === "boolean" ? localRaw.authenticated : null,
        error: localRaw.error ?? null,
      };
    } catch {
      localProxy = null;
    }
  }
  const roundTrip = deps.skipRoundTrip
    ? { ran: false, source: "skipped", reachedHermes: false, error: "round-trip skipped (--no-roundtrip)" }
    : probeRoundTrip(deps);
  const tasks = probeTasks(deps);
  const usage = readUsage(deps);
  const probe = { proxy, roundTrip, usage, tasks, expectedTasks: deps.expectedTasks || EXPECTED_TASKS };
  if (localProxy) probe.localProxy = localProxy;
  return probe;
}

/** Append a graded receipt to the ledger (append-only, schemaVersion-stamped). */
export function appendReceipt(receipt, deps = {}) {
  const append = deps.append || ((p, line) => fs.appendFileSync(p, line));
  const ledgerPath = deps.ledgerPath || LEDGER_PATH;
  const stampedAt = deps.now || new Date().toISOString();
  const row = { stampedAt, ...receipt };
  append(ledgerPath, JSON.stringify(row) + "\n");
  return row;
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const json = argv.includes("--json");
  const quiet = argv.includes("--quiet");
  const skipRoundTrip = argv.includes("--no-roundtrip");
  const log = (...a) => { if (!quiet) console.log(...a); };

  // The pure grader is a .ts engine; import it dynamically AFTER the tsx-reexec guard
  // (the run-as-main block re-execs under tsx if we're under bare node), or accept an
  // injected engine for tests (which run under vitest/tsx and resolve the .ts natively).
  const HermesSubstrateHealthEngine =
    deps.engine || (await import("../mcp-server/src/engines/HermesSubstrateHealthEngine.js")).HermesSubstrateHealthEngine;

  let probe;
  try {
    probe = await gatherProbe({ ...deps, skipRoundTrip });
  } catch (e) {
    console.error(`[hermes-substrate-health] probe failed: ${String(e?.message || e)}`);
    return { exitCode: 2 };
  }

  const receipt = HermesSubstrateHealthEngine.grade(probe);
  let row;
  try {
    row = appendReceipt(receipt, deps);
  } catch (e) {
    console.error(`[hermes-substrate-health] ledger write failed: ${String(e?.message || e)}`);
    return { exitCode: 2 };
  }

  if (json) {
    log(JSON.stringify({ receipt, probe: { proxy: probe.proxy, roundTrip: probe.roundTrip, taskCount: probe.tasks.length } }, null, 2));
  } else {
    log(HermesSubstrateHealthEngine.renderReceipt(receipt));
    for (const c of receipt.components) log(`  - ${c.component}: ${c.verdict.toUpperCase()} -- ${c.reason}`);
    for (const r of receipt.recommendations) log(`  -> ${r}`);
  }
  return { exitCode: 0, receipt: row };
}

// Run-as-main guard (skipped under test import).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  // tsx self-reexec: under bare node the dynamic .ts engine import would throw; relaunch
  // under tsx once (breaker PRISM_HSH_REEXEC=1 on the child prevents an infinite loop).
  const plan = planTsxReexec();
  if (plan.reexec) {
    const child = spawnSync(process.execPath, [plan.tsxCli, process.argv[1], ...process.argv.slice(2)], {
      stdio: "inherit",
      env: { ...process.env, PRISM_HSH_REEXEC: "1" },
      windowsHide: true,
    });
    process.exit(typeof child.status === "number" ? child.status : 1);
  } else {
    main().then((r) => { process.exitCode = r.exitCode; }).catch((e) => {
      console.error(`[hermes-substrate-health] fatal: ${String(e?.message || e)}`);
      process.exitCode = 2;
    });
  }
}
