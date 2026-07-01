/**
 * viz-query-heap-reexec -- pure planner for system-viz-query's graph-command
 * guard + heap self-respawn.
 *
 * Extracted (build-once, R15) so two real defects in system-viz-query.mjs are
 * unit-testable WITHOUT spawning a 644 MB graph load:
 *
 *   Defect A (OOM/cost on typo): an UNKNOWN command (incl. `--help` / `-h`)
 *     used to fall all the way through the eager `loadGraph()` (644 MB) and only
 *     THEN hit the `unknown command` else at the bottom of the file -- so
 *     `system-viz-query --help` OOM'd on the default heap instead of printing
 *     usage. `isKnownGraphCmd()` + `GRAPH_USAGE` let the CLI validate the cmd
 *     FIRST and print usage with ZERO graph load.
 *
 *   Defect B (OOM on graph load): `loadGraph()` streams the ~644 MB graph and
 *     needs a generous old-space (the headline short-circuit notes ~16 GB). The
 *     `subgraph` path already self-respawns with a heap bump, but the MAIN
 *     loadGraph() path had NONE -- so every roadmap-candidates / blast-radius /
 *     dispatcher-summary / coverage-by-domain / worktrees / build-order OOM'd on
 *     the default heap. `planHeapRespawn()` mirrors the proven subgraph guard so
 *     BOTH graph paths share one decision (no fork) and the Blackwell box's RAM
 *     is actually used (never fight a low default).
 *
 * This module is PURE: no fs, no process mutation, no child-process call. The
 * side effects (console + spawn) stay in the CLI; planHeapRespawn is testable in
 * isolation. respawnWithHeap performs the spawn but takes an injectable `spawn`,
 * so it is unit-testable without launching a real child.
 */

import { spawnSync as defaultSpawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Commands whose dispatch lives AFTER `loadGraph()` in system-viz-query.mjs.
 * Keep this in sync with the if/else chain there -- it is the single source of
 * the known-graph-command set the CLI's unknown-command guard validates against.
 *
 * `find` is normally short-circuited by the find-cache path BEFORE loadGraph and
 * never reaches the graph path; it is kept here so that IF that short-circuit is
 * ever removed the (documented, currently-unreachable) `else if (cmd === "find")`
 * fallback at the bottom of system-viz-query.mjs still routes correctly instead
 * of being rejected as unknown.
 */
export const GRAPH_CMDS = Object.freeze([
  "headline",
  "roadmap-candidates",
  "blast-radius",
  "dispatcher-summary",
  "coverage-by-domain",
  "worktrees",
  "build-order",
  "find",
]);

const GRAPH_CMD_SET = new Set(GRAPH_CMDS);

/**
 * True iff `cmd` is a graph-loading command (and therefore legitimately reaches
 * loadGraph()). Anything else -- `--help`, `-h`, a typo, an empty string -- is
 * NOT a graph command and must be handled WITHOUT loading the graph.
 *
 * @param {unknown} cmd
 * @returns {boolean}
 */
export function isKnownGraphCmd(cmd) {
  return typeof cmd === "string" && GRAPH_CMD_SET.has(cmd);
}

/**
 * Extract the effective `--max-old-space-size` value (in MB) from a flags string
 * (e.g. a NODE_OPTIONS value), or null if none. Accepts `=` or space separators;
 * if the flag appears multiple times the LAST wins (node's own semantics).
 *
 * @param {unknown} s
 * @returns {number|null}
 */
export function maxOldSpaceMb(s) {
  if (typeof s !== "string") return null;
  let m;
  let val = null;
  const re = /--max-old-space-size[=\s](\d+)/g;
  while ((m = re.exec(s)) !== null) val = parseInt(m[1], 10);
  return Number.isFinite(val) ? val : null;
}

/**
 * Plan a one-shot self-respawn that re-launches the script under an explicit
 * `--max-old-space-size`. Pure: returns the DECISION; the CLI performs the spawn.
 *
 * `shouldRespawn` is FALSE when EITHER:
 *   (a) we are already inside the respawned child (`env[breakerVar]` set) -- the
 *       infinite-loop breaker, OR
 *   (b) the caller already passed `--max-old-space-size` in execArgv -- respect
 *       an explicit heap rather than overriding it.
 *
 * `heapMb` is sanitized to a positive-integer string: a missing / empty / "0" /
 * non-numeric `env[heapVar]` falls back to `defaultMb` (the old inline subgraph
 * form `env[X] || "4096"` mishandled "0" -> `--max-old-space-size=0` and "abc"
 * -> a node launch error; this planner fixes both, fail-safe).
 *
 * @param {object} o
 * @param {string[]} [o.execArgv]  typically process.execArgv
 * @param {Record<string,string|undefined>} [o.env]  typically process.env
 * @param {string} o.breakerVar  loop-breaker env var name (e.g. PRISM_VIZQUERY_REEXEC)
 * @param {string} o.heapVar     heap-override env var name (e.g. PRISM_VIZQUERY_HEAP_MB)
 * @param {number} o.defaultMb   default old-space ceiling in MB when unset/garbage
 * @returns {{shouldRespawn: boolean, heapMb: string, breakerVar: string}}
 */
export function planHeapRespawn({ execArgv = [], env = {}, breakerVar, heapVar, defaultMb } = {}) {
  if (!breakerVar || !heapVar) {
    throw new Error("planHeapRespawn: breakerVar + heapVar are required");
  }
  if (!Number.isFinite(defaultMb) || defaultMb <= 0) {
    throw new Error(`planHeapRespawn: defaultMb must be a positive number (got ${defaultMb})`);
  }
  const heapInExecArgv = Array.isArray(execArgv)
    && execArgv.some((a) => typeof a === "string" && a.startsWith("--max-old-space-size"));
  // NODE_OPTIONS can carry a heap ceiling too (NOT visible in execArgv). BUT on this
  // box the harness sets NODE_OPTIONS=--max-old-space-size=384 -- the very LOW cap we
  // exist to lift. So a NODE_OPTIONS heap counts as "already handled" ONLY when it is
  // >= the heap we want (defaultMb); a SMALLER one must NOT suppress the respawn -- the
  // respawn passes its own --max-old-space-size CLI flag, which overrides NODE_OPTIONS
  // in the child. An explicit execArgv flag is a deliberate per-invocation choice and
  // is always respected.
  const nodeOptionsHeapMb = maxOldSpaceMb(env.NODE_OPTIONS);
  const nodeOptionsAdequate = nodeOptionsHeapMb != null && nodeOptionsHeapMb >= defaultMb;
  const hasHeapFlag = heapInExecArgv || nodeOptionsAdequate;
  const alreadyRespawned = !!env[breakerVar];
  const shouldRespawn = !alreadyRespawned && !hasHeapFlag;

  const raw = env[heapVar];
  const parsed = raw != null ? parseInt(raw, 10) : NaN;
  const heapMb = Number.isFinite(parsed) && parsed > 0 ? String(parsed) : String(Math.floor(defaultMb));

  return { shouldRespawn, heapMb, breakerVar };
}

/**
 * Perform the one-shot heap self-respawn (the spawn side of planHeapRespawn).
 * Re-launches the script under `--max-old-space-size=<heapMb>` with the breaker
 * env set, inheriting stdio so the child's output + exit code pass straight
 * through. The single place the spawn block lives (build-once, R15) -- the three
 * CLI call sites (system-viz-query x2, system-viz-node-dispatch) just call this.
 *
 * `spawn` is injectable (defaults to child_process.spawnSync) so this is
 * unit-testable WITHOUT launching a real child.
 *
 * @returns {{respawned: boolean, status: number|null, error?: Error}}
 *   respawned=false -> caller proceeds to load the graph in-process.
 *   respawned=true  -> caller should `process.exit(status)` (status is the child's
 *                      exit code, or 1 on a spawn error / signal-kill; R12: a dead
 *                      child is NEVER reported as success).
 */
export function respawnWithHeap({
  scriptUrl,
  argv = process.argv.slice(2),
  execArgv = process.execArgv,
  env = process.env,
  breakerVar,
  heapVar,
  defaultMb,
  spawn = defaultSpawnSync,
  execPath = process.execPath,
} = {}) {
  const plan = planHeapRespawn({ execArgv, env, breakerVar, heapVar, defaultMb });
  if (!plan.shouldRespawn) return { respawned: false, status: null };
  const scriptPath = typeof scriptUrl === "string" && scriptUrl.startsWith("file:")
    ? fileURLToPath(scriptUrl)
    : scriptUrl;
  const res = spawn(
    execPath,
    [`--max-old-space-size=${plan.heapMb}`, scriptPath, ...argv],
    { stdio: "inherit", env: { ...env, [plan.breakerVar]: "1" } },
  );
  if (res && res.error) return { respawned: true, status: 1, error: res.error };
  return { respawned: true, status: typeof res?.status === "number" ? res.status : 1 };
}

/**
 * Usage text printed by the help / unknown-command guard -- WITHOUT a graph load.
 * Mirrors the cmd set above; the cheap commands are listed so a caller who typo'd
 * a cheap command is steered to the no-load path rather than the 644 MB load.
 */
export const GRAPH_USAGE = [
  "system-viz-query <command> [params] [--json]",
  "",
  "Cheap commands (no 644MB graph load):",
  "  find <query> [--brain-only]   case-insensitive node search (find-cache)",
  "  subgraph <query>              connected neighborhood (sidecars only)",
  "  node-card <id> [<id>...]      token-cheap read-by-id",
  "  near <id> [--k N]             768d semantic nearest-neighbor",
  "  doc-nodes <docOrSlug>         graph node(s) a vault doc documents",
  "  canvas | canvas-doc <doc>     Obsidian system-map summary / lookup",
  "  octopus [<caller>]            octopus consensus audit summary",
  "  cache-status                  sidecar freshness gate (exit 0=fresh)",
  "",
  "Graph commands (load the full graph; auto heap-bumped):",
  "  headline                      one-line headline summary",
  "  roadmap-candidates            unwired + pending-merge + drift",
  "  build-order                   atomic-first master roadmap",
  "  blast-radius <nodeId>         upstream/downstream BFS",
  "  dispatcher-summary            dispatcher categories + counts",
  "  coverage-by-domain            wired-ratio per domain",
  "  worktrees                     git worktree fleet grouped by verdict",
  "",
  "Add --json for machine-readable output.",
  "Heap knobs: PRISM_VIZQUERY_HEAP_MB (default 8192), PRISM_SUBGRAPH_HEAP_MB (default 4096).",
].join("\n");
