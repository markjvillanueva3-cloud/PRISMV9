/**
 * Leftover tool-subprocess hunter for fleet-reaper-sweep.mjs.
 * ==========================================================
 *
 * GAP CLOSED (operator directive 2026-06-11, slot:golf): chats spawn tool
 * subprocesses (the Bash tool runs `git`, `grep`, `rg`, `awk`, `sed`, `find`;
 * the Grep tool runs `rg`) and occasionally one is orphaned when the owning
 * chat finishes with it. The existing hunters cover only part of the named
 * families:
 *   - node.exe ......... findStaleOrphanedNodes + findMcpZombies (RSS/age based)
 *   - bash.exe/sh.exe .. findStuckBashes (live-parent-too-old OR orphaned)
 *   - git fsmonitor .... findFsmonitorOrphans (the daemon shape only)
 * NOT covered anywhere: orphaned `grep` / `rg` / `awk` / `sed` / `find`, and a
 * NON-fsmonitor orphaned `git` (e.g. a `git log`/`git diff` whose bash exited).
 * This hunter catches exactly that uncovered tool-subprocess leftover class.
 *
 * cmd.exe / pwsh / powershell / wt / conhost are DELIBERATELY EXCLUDED: they are
 * interactive shells (a foreign user `cmd` is not a leftover and reaping it is
 * the 2026-06-11-class incident). node/bash/sh are owned by the sibling hunters
 * above -- including them here would double-claim with no benefit.
 *
 * TWO-SNAPSHOT / PERSISTENCE: this hunter is PURE per-sweep DETECTION. The
 * load-bearing false-orphan guard (a tool subprocess whose parent shell exits
 * microseconds before the child, in a single instantaneous snapshot, is a LIVE
 * subprocess mid-completion -- NOT a leftover) is handled TWO ways, layered:
 *   (1) hasLiveClaudeAncestor -- if a live claude host sits anywhere up the
 *       chain the subprocess is OWNED and skipped here-and-now;
 *   (2) the CALLER routes these candidates through the existing
 *       updateLedger()/shouldReap() confirm-clock (firstSeenAt), which DROPS any
 *       candidate absent from the next sweep and refuses to reap until it has
 *       persisted across sweeps for killAfterMs. A transient orphan therefore
 *       vanishes before it can ever be reaped. That multi-sweep confirm is
 *       strictly STRONGER than a 2-point snapshot check.
 * So the hunter itself never kills -- it returns candidates; the sweep's ledger
 * gate + reapProcesses() allowlist own the actual side-effect.
 *
 * SAFETY GATES (ALL must pass before a process is even a candidate):
 *   1. name is in the leftover tool family (git/grep/rg/awk/sed/find by default)
 *   2. NOT in protectedPidSet (sweep's own ancestors/descendants)
 *   3. age >= ageSec floor (default 300s / 5 min -- a healthy tool subprocess
 *      completes in seconds; minutes-old means hung/abandoned)
 *   4. cmdline does NOT match the long-running TOOL-DAEMON protect regex
 *      (fsmonitor / --daemon / tail -f / inotifywait / watchman / watch). NOTE:
 *      this deliberately does NOT reuse the node-worker protect regex
 *      (buildStaleNodeProtectRegex), whose tree-path patterns ([\\/]prism[\\/],
 *      [\\/]scripts[\\/]) would protect EVERY repo-searching grep/git -- i.e.
 *      exactly the transient leftovers this hunter exists to clean. A tool
 *      subprocess does not become a protected worker by referencing the repo; a
 *      legit long-running tool subprocess is either a daemon (protected here) or
 *      has a live owned parent (protected by gate 7 / the ancestry guard).
 *   5. requireForeignCmd (default true): an empty/unknowable cmdline is left
 *      alone (cannot confirm foreign -> conservative skip)
 *   6. NO live claude host anywhere in the ancestry chain (the in-flight-search
 *      false-orphan guard)
 *   7. parent is dead OR (live but NOT a legit shell/claude owned-parent)
 *
 * Pure-core: takes a normalized procs array (snap.procs shape from
 * process-slot-map.mjs) + a livePidSet + opts -> classification array. No I/O.
 *
 * Disable knob (sweep-level):  PRISM_FR_HUNT_LEFTOVER_DISABLE=1
 * Tuning knobs (sweep-level):
 *   PRISM_FR_HUNT_LEFTOVER_AGE_SEC=N         (default 300 = 5 min)
 *   PRISM_FR_HUNT_LEFTOVER_FAMILIES=a,b,c    (override the tool-name family set)
 *   PRISM_REAPER_PROTECT_EXTRA=alt|alt       (extend the shared protect regex)
 *
 * @module scripts/lib/fleet-reaper-leftover-hunter
 * @milestone GOLF-FLEET-ENFORCE-MS0
 * @unit U-FR-LEFTOVER-HUNTER
 */

// Long-running TOOL-DAEMON shapes that must NOT be reaped even when orphaned:
// git fsmonitor--daemon, `tail -f`, inotifywait, watchman, generic `--daemon` /
// `watch` invocations. This is the leftover hunter's OWN, purpose-specific
// allowlist -- intentionally NOT the node-worker protect regex (whose tree-path
// patterns would over-protect every repo-searching grep/git). See the gate-4
// note in the module header for the rationale.
const LEFTOVER_DAEMON_PROTECT_PATTERNS = [
  "fsmonitor",
  "--daemon\\b",
  "\\bdaemon\\b",
  "inotifywait",
  "watchman",
  "\\btail\\b.*\\s-f\\b",
  "\\bwatch\\b",
];

export const DEFAULT_LEFTOVER_PROTECT_REGEX =
  new RegExp(LEFTOVER_DAEMON_PROTECT_PATTERNS.join("|"), "i");

/**
 * Compose the leftover protect regex from the daemon default plus an operator
 * extra (PRISM_REAPER_PROTECT_EXTRA). Fail-soft: a bad extra is dropped and the
 * always-valid default is kept, so protection never silently disappears.
 *
 * @param {string} [extraSource]
 * @returns {RegExp}
 */
export function resolveLeftoverProtectRegex(extraSource) {
  const extra = typeof extraSource === "string" ? extraSource.trim() : "";
  if (!extra) return DEFAULT_LEFTOVER_PROTECT_REGEX;
  try {
    return new RegExp(LEFTOVER_DAEMON_PROTECT_PATTERNS.join("|") + "|" + extra, "i");
  } catch {
    return DEFAULT_LEFTOVER_PROTECT_REGEX;
  }
}

export const DEFAULT_LEFTOVER_AGE_SEC = 300; // 5 min
const MIN_LEFTOVER_AGE_SEC = 60; // 1-min hard floor (safety -- never reap fresh)
const MAX_LEFTOVER_AGE_SEC = 86400; // 24-h ceiling (typo guard)

// The tool-subprocess families this hunter owns. node/bash/sh are EXCLUDED
// (sibling hunters own them); cmd/pwsh/powershell/wt/conhost are EXCLUDED
// (interactive shells, never a leftover). Names normalized lower-case, with and
// without the Windows `.exe` suffix.
export const DEFAULT_LEFTOVER_TOOL_NAMES = new Set([
  "git",
  "grep",
  "rg",
  "awk",
  "sed",
  "find",
]);

// Parent-name whitelist -- a LIVE parent in this set means the tool subprocess
// is owned (an in-flight Bash/Grep tool invocation), not a leftover. Mirrors the
// stale-node hunter's DEFAULT_OWNED_PARENT_NAMES (kept local -- the sibling does
// not export it; these names are stable shell/host identities).
const DEFAULT_OWNED_PARENT_NAMES = new Set([
  "claude.exe",
  "claude-code.exe",
  "code.exe",
  "claude",
  "wt.exe",
  "windowsterminal.exe",
  "cmd.exe",
  "powershell.exe",
  "pwsh.exe",
  "bash.exe",
  "sh.exe",
  "node.exe",
]);

const DEFAULT_CLAUDE_PARENT_NAMES = new Set([
  "claude.exe",
  "claude-code.exe",
  "code.exe",
  "claude",
]);

const MAX_ANCESTRY_DEPTH = 12;

// --- tiny pure helpers (same semantics as the sibling hunters; not exported
//     there, replicated locally to avoid coupling to another lib's internals) --

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

/** Normalize a process name to its bare lower-case tool name (drops `.exe`). */
function normalizeToolName(name) {
  if (typeof name !== "string") return "";
  return name.toLowerCase().replace(/\.exe$/, "");
}

function isLeftoverToolName(name, families) {
  const bare = normalizeToolName(name);
  if (!bare) return false;
  return families.has(bare);
}

function isProtectedDaemonCmd(cmd, regex) {
  if (typeof cmd !== "string" || cmd.length === 0) return false;
  const re = regex instanceof RegExp ? regex : DEFAULT_LEFTOVER_PROTECT_REGEX;
  return re.test(cmd);
}

/**
 * Walk the parent chain (bounded, cycle-guarded). True if ANY ancestor is a LIVE
 * claude host -- the subprocess is OWNED by a live chat (e.g. a grep mid-search
 * whose immediate bash parent already exited in the snapshot race, but the chat
 * above it is alive). This is THE guard against reaping a peer chat's in-flight
 * tool subprocess.
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

/**
 * Find leftover tool subprocesses worth reaping (after ledger confirm).
 *
 * @param {Array}        procs       normalized [{pid, ppid, name, cmd, createdMs, rssBytes}]
 * @param {Set<number>}  livePidSet  PIDs currently alive (incl. parent procs)
 * @param {number}       now         current epoch-ms (caller-supplied for testability)
 * @param {Object}       opts
 *   - ageSec: min age (s) before a candidate qualifies (clamped 60..86400)
 *   - families: Set<string> of bare tool names to hunt (default git/grep/rg/awk/sed/find)
 *   - ownedParentNames: Set of parent-name strings that mark "owned" (live in-flight)
 *   - claudeParentNames: Set of claude-host names for the ancestry guard
 *   - protectCmdRegex: RegExp allowlist of PRISM/fleet-worker cmdlines (default shared)
 *   - requireForeignCmd: default true -- skip processes with no cmdline (conservative)
 *   - protectedPids: Set of PIDs to never touch (sweep's own tree)
 *   - procByPid: Map<pid, proc> for parent + ancestry lookups
 * @returns {Array} candidates [{pid, ppid, name, ageSec, reason, cmd}]
 *   reason is one of "dead-parent" | "non-claude-parent" | "no-parent-info"
 */
export function findLeftoverToolProcs(procs, livePidSet, now, opts = {}) {
  if (!Array.isArray(procs) || procs.length === 0) return [];

  const ageFloor = clamp(
    opts.ageSec ?? DEFAULT_LEFTOVER_AGE_SEC,
    MIN_LEFTOVER_AGE_SEC,
    MAX_LEFTOVER_AGE_SEC,
    DEFAULT_LEFTOVER_AGE_SEC,
  );
  const families = opts.families instanceof Set && opts.families.size > 0
    ? opts.families
    : DEFAULT_LEFTOVER_TOOL_NAMES;
  const ownedParents = opts.ownedParentNames instanceof Set
    ? opts.ownedParentNames
    : DEFAULT_OWNED_PARENT_NAMES;
  const claudeNames = opts.claudeParentNames instanceof Set
    ? opts.claudeParentNames
    : DEFAULT_CLAUDE_PARENT_NAMES;
  const protectCmdRegex = opts.protectCmdRegex instanceof RegExp
    ? opts.protectCmdRegex
    : DEFAULT_LEFTOVER_PROTECT_REGEX;
  const requireForeignCmd = opts.requireForeignCmd !== false;
  const protectedPids = opts.protectedPids;
  const procByPid = opts.procByPid;

  const leftovers = [];
  for (const p of procs) {
    if (!p || !Number.isFinite(p.pid)) continue;
    if (!isLeftoverToolName(p.name, families)) continue;
    if (isProtected(p.pid, protectedPids)) continue;

    const a = ageSec(p, now);
    if (a === null || a < ageFloor) continue;

    const cmd = typeof p.cmd === "string" ? p.cmd : "";
    // 1. tool-daemon allowlist: fsmonitor / tail -f / inotifywait / watch ->
    //    a long-running tool daemon, never reap (NOT the repo-search greps).
    if (isProtectedDaemonCmd(cmd, protectCmdRegex)) continue;
    // 2. conservative no-cmdline skip: cannot confirm foreign -> do not reap.
    if (requireForeignCmd && cmd.length === 0) continue;
    // 3. deeper ancestry: a live claude host anywhere up the chain -> owned
    //    (the in-flight tool-subprocess false-orphan -- the load-bearing guard).
    if (hasLiveClaudeAncestor(p, procByPid, livePidSet, claudeNames)) continue;

    // Classify by parent state.
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
        continue; // live legit shell/claude parent -> in-flight tool subprocess, not a leftover
      }
      reason = "non-claude-parent";
    }

    leftovers.push({
      pid: p.pid,
      ppid: p.ppid,
      name: normalizeToolName(p.name),
      ageSec: a,
      reason,
      cmd: cmd.slice(0, 200),
    });
  }
  return leftovers;
}

/**
 * Resolve the tool-name family Set from an env override string
 * (PRISM_FR_HUNT_LEFTOVER_FAMILIES="git,grep,rg"). Fail-soft: empty / invalid ->
 * the default family set, so a bad env value can never silently widen the blast
 * radius (e.g. to cmd / pwsh) nor disable the hunter's coverage.
 *
 * @param {string} [src]
 * @returns {Set<string>}
 */
export function resolveLeftoverFamilies(src) {
  if (typeof src !== "string" || src.trim().length === 0) {
    return DEFAULT_LEFTOVER_TOOL_NAMES;
  }
  const NEVER = new Set(["cmd", "pwsh", "powershell", "wt", "windowsterminal", "conhost"]);
  const names = src
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\.exe$/, ""))
    .filter((s) => s.length > 0 && !NEVER.has(s));
  return names.length > 0 ? new Set(names) : DEFAULT_LEFTOVER_TOOL_NAMES;
}
