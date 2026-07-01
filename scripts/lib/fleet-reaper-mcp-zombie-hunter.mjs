/**
 * MCP-zombie hunter for fleet-reaper-sweep.mjs.
 * =============================================
 *
 * Catches the failure mode that 2026-05-23/slot-golf surfaced: 106 PRISM MCP
 * server processes (node.exe running `mcp-server/dist/index.js`), 46 of them
 * with a DEAD parent claude.exe — collectively holding 38.8 GB RSS. claude-code
 * does not reliably reap its spawned MCP server on parent-process exit (it
 * relies on stdin pipe closure), so /compact / IDE-restart / crash cycles
 * accumulate zombies until the OS hits memory pressure.
 *
 * Detection criteria (ALL must be true):
 *   1. Process name is `node.exe`
 *   2. Command line matches PRISM MCP server: `mcp-server[\\/]dist[\\/]index\.js`
 *      OR `mcp-server.*--prism` (the canonical start commands)
 *   3. Parent PID is NOT in the livePidSet (parent process is dead) OR parent
 *      name is NOT a claude-related process (claude.exe / claude-code.exe /
 *      Code.exe — the IDE host names)
 *   4. Process age >= ageSec floor (default 600s / 10 min). Protects freshly-
 *      spawning MCP servers from a race-condition reap while their parent
 *      IDE is still initialising.
 *   5. NOT in protectedPidSet (sweep's own ancestors/descendants).
 *
 * Pure-core: takes a normalized procs array (snap.procs shape from
 * process-slot-map.mjs) + a livePidSet + opts → classification array.
 * No I/O. Caller (sweep) owns the kill side-effect via reapProcesses().
 *
 * Disable knob: PRISM_FR_HUNT_MCP_ZOMBIE_DISABLE=1
 * Tuning knobs:
 *   PRISM_FR_HUNT_MCP_ZOMBIE_AGE_SEC=N        (default 600 = 10 min)
 *   PRISM_FR_HUNT_MCP_ZOMBIE_CMD_REGEX=regex  (override default detection regex)
 *
 * @module scripts/lib/fleet-reaper-mcp-zombie-hunter
 * @milestone MCP-PERMANENT-FIX-MS0
 * @unit U-MCP-ZOMBIE-HUNTER
 */

export const DEFAULT_MCP_ZOMBIE_AGE_SEC = 600;

// Hard floors / ceilings so an operator typo cannot scorch fresh MCP servers.
const MIN_MCP_ZOMBIE_AGE_SEC = 60;
const MAX_MCP_ZOMBIE_AGE_SEC = 86400;

// Default detection patterns — PRISM MCP server start cmdlines on Win+POSIX.
// MUST match both `node dist/index.js` and `node H:/prism/mcp-server/dist/index.js`.
const DEFAULT_MCP_CMD_REGEX = /mcp-server[\\/]dist[\\/]index\.js/i;

// Names of processes that legitimately host the PRISM MCP — if parent matches
// one of these AND parent is still live, the MCP server is OWNED, not zombie.
const DEFAULT_CLAUDE_PARENT_NAMES = new Set([
  "claude.exe",
  "claude-code.exe",
  "code.exe", // VS Code (claude-code extension host)
  "claude",   // POSIX
]);

function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function ageSec(proc, now) {
  if (!proc || !Number.isFinite(proc.createdMs)) return null;
  return Math.max(0, Math.floor((now - proc.createdMs) / 1000));
}

function isLive(pid, livePidSet) {
  if (!livePidSet || typeof livePidSet.has !== "function") return false;
  return livePidSet.has(pid);
}

function isProtected(pid, protectedPids) {
  if (!protectedPids || typeof protectedPids.has !== "function") return false;
  return protectedPids.has(pid);
}

function isClaudeParentName(name, claudeNames) {
  if (typeof name !== "string") return false;
  return claudeNames.has(name.toLowerCase());
}

function isNodeName(name) {
  if (typeof name !== "string") return false;
  const lower = name.toLowerCase();
  return lower === "node.exe" || lower === "node";
}

/**
 * Find PRISM MCP server processes worth reaping.
 *
 * @param {Array} procs — normalized [{pid, ppid, name, cmd, createdMs, rssBytes}]
 * @param {Set<number>} livePidSet — PIDs currently alive (incl. parent procs)
 * @param {number} now — current epoch-ms (caller-supplied for testability)
 * @param {Object} opts
 *   - ageSec: minimum age (s) before a candidate qualifies (clamped 60..86400)
 *   - cmdRegex: detection regex override (default matches mcp-server/dist/index.js)
 *   - claudeParentNames: Set of parent-name strings that mark "owned" (default
 *     claude.exe / claude-code.exe / code.exe). A live parent NOT in this set
 *     is treated as a dead chain (e.g. the original claude.exe died and the
 *     MCP server was re-parented to System).
 *   - protectedPids: Set of PIDs to never touch (sweep's own tree).
 *   - procByPid: Map<pid, proc> for parent lookups.
 * @returns {Array} candidates [{pid, ppid, ageSec, rssBytes, reason}]
 *   reason ∈ "dead-parent" | "non-claude-parent" | "no-parent-info"
 */
// ============================================================================
// findStaleOrphanedNodes — second-pass hunter (added 2026-05-26, slot:golf)
// ============================================================================
// Gap closed: findMcpZombies (above) only catches `mcp-server/dist/index.js`
// command-line shape. Real-world zombie class observed this session: 209 stale
// node.exe processes (npx wrappers, chrome-devtools-mcp, claude-flow children,
// fleet-reaper-bash subagents) — all 6+ hours old with RSS=0 or sub-5-MB
// resident set, none matching the MCP server regex.
//
// The RSS=0 + age-threshold combo is a strong zombie signal: a HEALTHY node
// process always holds at least ~30-50 MB resident. A node.exe with effectively
// no resident memory that has lived for hours is a dead-but-not-reaped child
// whose parent abandoned cleanup. Killing it is safe (the process holds no
// in-flight work; OS would page-fault if anything tried to access its address
// space anyway).
//
// Detection criteria (ALL must be true):
//   1. Process name is `node.exe` (or `node` POSIX)
//   2. Process age >= ageSec floor (default 1800s / 30 min)
//   3. RSS in bytes <= rssMaxBytes (default 5 MB)
//   4. NOT in protectedPidSet (sweep's own ancestors + chat-slot pids)
//   5. SAFETY GATE (2026-06-11): cmdline does NOT match the PRISM/fleet worker
//      protect regex -- a node running prism tooling (miner/sidecar/embed/
//      pipeline/mcp/...) is a legit detached worker, NOT an orphan, no matter
//      how low its RSS or whether its launcher exited. This is THE fix for the
//      incident that reaped legit idle fleet nodes and disabled the reaper.
//   6. SAFETY GATE: command line is non-empty (requireForeignCmd, default true)
//      -- an unknowable node is left alone (conservative).
//   7. SAFETY GATE: NO live claude host anywhere in the ancestry chain (a node
//      spawned deep under a live chat is OWNED).
//   8. Parent IS NOT in livePidSet OR (parent live but not a claude/wt/shell
//      host) -- same parent vocabulary as findMcpZombies.
//
// Reaping order of evidence: cmdline-allowlist + ancestry decide ownership;
// RSS/age are tie-breakers AFTER ownership says orphan, never the trigger.
//
// Knobs (sweep-level):
//   PRISM_FR_HUNT_STALE_NODE_DISABLE=1                  (turn off entirely)
//   PRISM_FR_HUNT_STALE_NODE_AGE_SEC=N                  (default 1800)
//   PRISM_FR_HUNT_STALE_NODE_RSS_MAX_BYTES=N            (default 5242880 = 5 MB)
//   PRISM_REAPER_PROTECT_EXTRA=alt|alt                  (extend the protect regex)
// Pure-core opts: protectCmdRegex, requireForeignCmd, claudeParentNames.
//
// Returns the same shape as findMcpZombies for caller uniformity.

export const DEFAULT_STALE_NODE_AGE_SEC = 1800;             // 30 min
export const DEFAULT_STALE_NODE_RSS_MAX_BYTES = 5 * 1024 * 1024;  // 5 MB
const MIN_STALE_NODE_AGE_SEC = 300;                          // 5-min floor (safety)
const MAX_STALE_NODE_AGE_SEC = 86400;                        // 24-h ceiling
const MIN_STALE_NODE_RSS_MAX_BYTES = 0;                      // RSS=0 is the strictest catch
const MAX_STALE_NODE_RSS_MAX_BYTES = 50 * 1024 * 1024;       // 50-MB ceiling to prevent typos scorching live procs

// Parent-name whitelist — if the parent IS live AND is one of these, the node
// child is presumed owned. Otherwise (live but unowned parent, OR dead parent),
// the node child is a zombie candidate.
const DEFAULT_OWNED_PARENT_NAMES = new Set([
  "claude.exe",
  "claude-code.exe",
  "code.exe",
  "claude",
  "wt.exe",            // Windows Terminal — wt is a legit interactive parent
  "windowsterminal.exe",
  "cmd.exe",           // operator may be in a cmd shell
  "powershell.exe",
  "pwsh.exe",
  "bash.exe",
  "sh.exe",
  "node.exe",          // node spawning node is legit (npm scripts, dispatchers)
]);

// ---------------------------------------------------------------------------
// LEGIT-FLEET-WORKER PROTECT (2026-06-11, slot:golf -- fix for the incident that
// disabled the whole reaper). The ORIGINAL premise -- "RSS=0/sub-5MB node = dead
// orphan, safe to kill" -- is FALSE for a large legit class: detached PRISM
// workers (nohup / scheduled-task / background-&) have a DEAD parent BY DESIGN
// AND sit at RSS~0 when idle (paged-out, blocked on Ollama/disk I/O, parked
// between work units, or just-spawned). The 2026-06-11 incident reaped exactly
// these (galaxy miners, *-sidecar embedders, vault/blueprint pipelines), causing
// fleet-wide work loss -> operator hard-disabled the reaper.
//
// The reliable discriminator is the COMMAND LINE, not RSS/age/parent: a node
// running PRISM tooling (under the prism tree, or in the named worker/MCP
// families) is a legit fleet worker regardless of how little memory it holds or
// whether its launcher exited. This regex is intentionally HIGH-RECALL (over-
// protection is the SAFE direction -- the operator's complaint was OVER-reaping;
// a genuinely foreign zombie like a global npx wrapper or an out-of-tree
// chrome-devtools-mcp will NOT match and is still caught).
const PRISM_WORKER_PROTECT_PATTERNS = [
  "[\\\\/]prism[\\\\/]",                       // anything running code under the prism repo tree
  "[\\\\/](scripts|\\.claude)[\\\\/]",          // relative invocations of prism tooling
  // ANCHORED: only the PRISM MCP server's dist/index.js -- a bare `dist/index.js`
  // would protect every foreign npm tool (chrome-devtools-mcp/dist/index.js,
  // claude-flow/dist/index.js) that the hunter is SUPPOSED to reap (reviewer-C BLOCKER-1).
  "mcp-server", "mcp-http-bridge", "mcp-server-supervisor", "mcp-server[\\\\/]dist[\\\\/]index\\.js",
  "mcp-health-watchdog", "mcp-server-watchdog", "--prism",
  "mine-[a-z0-9-]*transcript", "-sidecar", "build-memory", "embed",
  "galaxy-", "vault-", "fleet-", "ollama", "pipeline", "blueprint-ocr",
  "corpus", "synthesis", "tribal-index", "consolidate-graph", "regen-viz",
  "lora", "reaper", "watchdog", "memory-monitor",
];

export const DEFAULT_PRISM_WORKER_PROTECT_REGEX =
  new RegExp(PRISM_WORKER_PROTECT_PATTERNS.join("|"), "i");

const MAX_ANCESTRY_DEPTH = 12; // cycle/length guard for the parent walk

/**
 * Compose the stale-node protect regex from the high-recall default plus an
 * operator-supplied extra source (pipe-delimited alternation fragments, e.g.
 * PRISM_REAPER_PROTECT_EXTRA). Invalid fragments are dropped, never thrown --
 * a bad env value must NOT crash the reaper, and on total failure we fall back
 * to the (always-valid) default so protection never silently disappears.
 *
 * @param {string} [extraSource] -- extra alternation (e.g. "foo-worker|bar-daemon")
 * @returns {RegExp}
 */
export function buildStaleNodeProtectRegex(extraSource) {
  const extra = typeof extraSource === "string" ? extraSource.trim() : "";
  if (!extra) return DEFAULT_PRISM_WORKER_PROTECT_REGEX;
  try {
    return new RegExp(PRISM_WORKER_PROTECT_PATTERNS.join("|") + "|" + extra, "i");
  } catch {
    return DEFAULT_PRISM_WORKER_PROTECT_REGEX; // bad extra -> keep default protection
  }
}

/**
 * True if `cmd` identifies a legit PRISM/fleet worker that must never be reaped
 * by the stale-node 2nd-pass, regardless of RSS/age/parent.
 */
function isProtectedWorkerCmd(cmd, regex) {
  if (typeof cmd !== "string" || cmd.length === 0) return false;
  const re = regex instanceof RegExp ? regex : DEFAULT_PRISM_WORKER_PROTECT_REGEX;
  return re.test(cmd);
}

/**
 * Walk the parent chain (bounded, cycle-guarded). Returns true if ANY ancestor
 * is a LIVE claude-host process (claude.exe / claude-code.exe / code.exe). This
 * is the "deeper ancestry" check the single-level parent-name test missed: a
 * legit node spawned several frames under a live chat (npm script -> node ->
 * node, or a dispatcher subprocess) has a non-claude immediate parent but a
 * live claude ancestor -- it is OWNED, not orphaned.
 */
function hasLiveClaudeAncestor(proc, procByPid, livePidSet, claudeNames) {
  if (!proc || !procByPid || typeof procByPid.get !== "function") return false;
  const names = claudeNames instanceof Set ? claudeNames : DEFAULT_CLAUDE_PARENT_NAMES;
  const seen = new Set();
  let cur = proc;
  for (let depth = 0; depth < MAX_ANCESTRY_DEPTH; depth++) {
    if (!cur || !Number.isFinite(cur.ppid)) return false;
    if (seen.has(cur.ppid)) return false; // cycle guard
    seen.add(cur.ppid);
    const parent = procByPid.get(cur.ppid);
    if (!parent) return false; // chain leaves the snapshot -- cannot confirm
    if (isLive(parent.pid, livePidSet) && isClaudeParentName(parent.name, names)) {
      return true;
    }
    cur = parent;
  }
  return false;
}

export function findStaleOrphanedNodes(procs, livePidSet, now, opts = {}) {
  if (!Array.isArray(procs) || procs.length === 0) return [];
  const ageFloor = clamp(
    opts.ageSec ?? DEFAULT_STALE_NODE_AGE_SEC,
    MIN_STALE_NODE_AGE_SEC,
    MAX_STALE_NODE_AGE_SEC,
    DEFAULT_STALE_NODE_AGE_SEC,
  );
  const rssMax = clamp(
    opts.rssMaxBytes ?? DEFAULT_STALE_NODE_RSS_MAX_BYTES,
    MIN_STALE_NODE_RSS_MAX_BYTES,
    MAX_STALE_NODE_RSS_MAX_BYTES,
    DEFAULT_STALE_NODE_RSS_MAX_BYTES,
  );
  const ownedParents = opts.ownedParentNames instanceof Set
    ? opts.ownedParentNames
    : DEFAULT_OWNED_PARENT_NAMES;
  const claudeNames = opts.claudeParentNames instanceof Set
    ? opts.claudeParentNames
    : DEFAULT_CLAUDE_PARENT_NAMES;
  const protectCmdRegex = opts.protectCmdRegex instanceof RegExp
    ? opts.protectCmdRegex
    : DEFAULT_PRISM_WORKER_PROTECT_REGEX;
  // requireForeignCmd (default TRUE): a node with NO command-line info cannot be
  // confirmed foreign, so it is NOT reaped on the stale path -- the cost of a
  // false-positive reap of a legit worker far exceeds missing one ambiguous
  // zombie (age + the next sweep-with-cmdline still catch it).
  const requireForeignCmd = opts.requireForeignCmd !== false;
  const protectedPids = opts.protectedPids;
  const procByPid = opts.procByPid;

  const zombies = [];
  for (const p of procs) {
    if (!p || !Number.isFinite(p.pid)) continue;
    if (!isNodeName(p.name)) continue;
    if (isProtected(p.pid, protectedPids)) continue;

    const a = ageSec(p, now);
    if (a === null || a < ageFloor) continue;

    const rss = Number.isFinite(p.rssBytes) ? p.rssBytes : 0;
    if (rss > rssMax) continue; // healthy resident size -> not a zombie

    // --- SAFETY GATES (2026-06-11 incident fix) -- evaluated BEFORE parent
    // classification so a legit fleet worker is never even classified a
    // candidate. RSS/age/parent are NOT sufficient orphan evidence alone.
    const cmd = typeof p.cmd === "string" ? p.cmd : "";
    // 1. cmdline-allowlist: running PRISM/fleet tooling -> legit, never reap.
    if (isProtectedWorkerCmd(cmd, protectCmdRegex)) continue;
    // 2. conservative no-cmdline skip: cannot confirm foreign -> do not reap.
    if (requireForeignCmd && cmd.length === 0) continue;
    // 3. deeper ancestry: a live claude host anywhere up the chain -> owned.
    if (hasLiveClaudeAncestor(p, procByPid, livePidSet, claudeNames)) continue;

    // Classify by parent state -- same vocabulary as findMcpZombies.
    let reason = null;
    if (!Number.isFinite(p.ppid)) {
      reason = "no-parent-info";
    } else if (!isLive(p.ppid, livePidSet)) {
      reason = "dead-parent";
    } else {
      const parent = procByPid && typeof procByPid.get === "function"
        ? procByPid.get(p.ppid)
        : null;
      const parentName = parent && typeof parent.name === "string" ? parent.name.toLowerCase() : "";
      if (parentName && ownedParents.has(parentName)) {
        continue; // live legit parent → not a zombie
      }
      reason = "non-claude-parent";
    }

    zombies.push({
      pid: p.pid,
      ppid: p.ppid,
      ageSec: a,
      rssBytes: rss,
      reason,
    });
  }
  return zombies;
}

// ============================================================================
// Original findMcpZombies — unchanged behavior.
// ============================================================================
export function findMcpZombies(procs, livePidSet, now, opts = {}) {
  if (!Array.isArray(procs) || procs.length === 0) return [];
  const ageFloor = clamp(
    opts.ageSec ?? DEFAULT_MCP_ZOMBIE_AGE_SEC,
    MIN_MCP_ZOMBIE_AGE_SEC,
    MAX_MCP_ZOMBIE_AGE_SEC,
    DEFAULT_MCP_ZOMBIE_AGE_SEC,
  );
  const cmdRegex = opts.cmdRegex instanceof RegExp ? opts.cmdRegex : DEFAULT_MCP_CMD_REGEX;
  const claudeNames = opts.claudeParentNames instanceof Set
    ? opts.claudeParentNames
    : DEFAULT_CLAUDE_PARENT_NAMES;
  const protectedPids = opts.protectedPids;
  const procByPid = opts.procByPid;

  const zombies = [];
  for (const p of procs) {
    if (!p || !Number.isFinite(p.pid)) continue;
    if (!isNodeName(p.name)) continue;
    if (typeof p.cmd !== "string" || !cmdRegex.test(p.cmd)) continue;
    if (isProtected(p.pid, protectedPids)) continue;

    const a = ageSec(p, now);
    if (a === null || a < ageFloor) continue;

    // Classify zombie type
    let reason = null;
    if (!Number.isFinite(p.ppid)) {
      reason = "no-parent-info";
    } else if (!isLive(p.ppid, livePidSet)) {
      reason = "dead-parent";
    } else {
      // Parent IS live — check if it's a claude-related process. If parent
      // is alive but is NOT claude.exe/claude-code.exe/code.exe, the MCP
      // server was orphaned and re-parented (Windows: re-parented to
      // System / svchost / explorer.exe) — still a zombie.
      const parent = procByPid && typeof procByPid.get === "function"
        ? procByPid.get(p.ppid)
        : null;
      if (parent && isClaudeParentName(parent.name, claudeNames)) {
        continue; // owned — keep alive
      }
      reason = "non-claude-parent";
    }

    zombies.push({
      pid: p.pid,
      ppid: p.ppid,
      ageSec: a,
      rssBytes: Number.isFinite(p.rssBytes) ? p.rssBytes : 0,
      reason,
    });
  }
  return zombies;
}
