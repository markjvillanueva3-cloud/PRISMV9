/**
 * Stuck-process hunters for fleet-reaper-sweep.mjs.
 *
 * Catches what the regular reap loop misses by design:
 *   (1) bash.exe shells from hook chains that never finished — claude.exe
 *       parent stayed alive, so the slot-aware reaper leaves them. Claude
 *       hook chains finish in 1–3 s; anything older than ~5 min is wedged.
 *       Real-world finding (slot:golf, 2026-05-21): 3 bashes stuck for
 *       19 h, 3 for 1 h 40, 3 for 31 min — all from live claude.exe.
 *   (2) git fsmonitor--daemon orphans — intentionally detached background
 *       daemons whose original git process exited. The reaper's dead-parent
 *       check normally skips fresh detached procs (the 60 s grace window
 *       protects legit short-lived spawns); fsmonitor runs for hours so it
 *       slips past. Killing it is safe — `git status` re-spawns one on demand.
 *   (3) chat-slots.json entries whose stored PID is dead. The chat-slots
 *       CLI labels these "crashed" and the reaper writes a postmortem but
 *       never reclaims the slot. Stale state confuses the resume-picker.
 *
 * Pure-core: all three functions take a normalized procs array (snap.procs
 * shape from process-slot-map.mjs) + a live-PID Set + opts → classification
 * arrays. No I/O, no PowerShell, no global state. Caller (sweep) owns the
 * kill side-effect via the existing reapProcesses() helper.
 *
 * NOT exported from the sweep's main API surface — wired as an additive
 * step in runSweep, env-gated, fail-soft. Disable knobs:
 *   PRISM_FR_HUNT_STUCK_BASH_DISABLE=1
 *   PRISM_FR_HUNT_FSMONITOR_DISABLE=1
 *   PRISM_FR_HUNT_STALE_SLOT_DISABLE=1
 * Tuning knobs:
 *   PRISM_FR_HUNT_STUCK_BASH_AGE_SEC=N  (default 300 = 5 min)
 *   PRISM_FR_HUNT_FSMONITOR_AGE_SEC=N   (default 7200 = 2 hr)
 *   PRISM_FR_HUNT_ORPHAN_GRACE_SEC=N    (default 60 — protect legit detached spawns)
 */

export const DEFAULT_STUCK_BASH_AGE_SEC = 300;
export const DEFAULT_FSMONITOR_AGE_SEC = 7200;
export const DEFAULT_ORPHAN_GRACE_SEC = 60;

// Hard floors / ceilings so an operator typo (`AGE_SEC=0`) cannot turn this
// hunter into a chainsaw that kills every fresh hook bash. Mirrored from
// the same defensive pattern used for soft-relief and ballast in the sweep.
const MIN_BASH_AGE_SEC = 60;        // < 60 s would reap legit in-flight hooks
const MAX_BASH_AGE_SEC = 86400;     // 24 h
const MIN_FSMONITOR_AGE_SEC = 300;  // < 5 min would reap a freshly-spawned daemon
const MAX_FSMONITOR_AGE_SEC = 604800; // 7 d
const MIN_ORPHAN_GRACE_SEC = 5;
const MAX_ORPHAN_GRACE_SEC = 3600;

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

// A candidate PID is protected when it belongs to the sweep's own process
// tree (self + ancestors + descendants) — the sweep runs FROM a bash hook,
// so its own parent bash.exe and any bash it spawned would otherwise match
// findStuckBashes. Never reap a protected PID. An absent/empty set means
// "no protection info supplied" — the caller MUST pass one in production;
// tests may omit it.
function isProtected(pid, protectedPids) {
  if (!protectedPids || typeof protectedPids.has !== "function") return false;
  return protectedPids.has(pid);
}

// Default name matchers — tunable via opts so a Git upgrade that renames the
// binary (or an MSYS shell that ships `sh.exe` instead of `bash.exe`) doesn't
// silently slip past detection.
const DEFAULT_BASH_NAMES = new Set(["bash.exe", "sh.exe"]);
const DEFAULT_FSMONITOR_REGEX = /fsmonitor[-_]?-?daemon/i;

function isBashName(name, bashNames) {
  if (typeof name !== "string") return false;
  const lower = name.toLowerCase();
  return bashNames.has(lower);
}

/**
 * Find bash.exe shells worth killing. Two classes:
 *   - "stuck-with-live-parent": parent claude.exe still running, but the
 *     bash has been alive longer than a hook chain ever should be.
 *   - "orphan-bash": parent dead, bash older than the orphan grace window
 *     (the grace window protects detached short-lived spawns from being
 *     classified as orphans when their parent exits a beat before they do).
 *
 * Only kills bash.exe — never the broader shell family. A misconfigured
 * `ageSec=0` is clamped at MIN_BASH_AGE_SEC so this can never go scorched-
 * earth on the active hook chains keeping the fleet alive.
 *
 * @param {Array} procs — normalized [{pid, ppid, name, cmd, createdMs, rssBytes}]
 * @param {Set<number>|null} livePidSet — set of currently-running PIDs
 * @param {{now?: number, ageSec?: number, orphanGraceSec?: number}} opts
 * @returns {Array<{pid, ppid, ageSec, rssBytes, reason, cmd}>}
 */
export function findStuckBashes(procs, livePidSet, opts = {}) {
  if (!Array.isArray(procs)) return [];
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const threshold = clamp(
    opts.ageSec ?? DEFAULT_STUCK_BASH_AGE_SEC,
    MIN_BASH_AGE_SEC, MAX_BASH_AGE_SEC, DEFAULT_STUCK_BASH_AGE_SEC,
  );
  const grace = clamp(
    opts.orphanGraceSec ?? DEFAULT_ORPHAN_GRACE_SEC,
    MIN_ORPHAN_GRACE_SEC, MAX_ORPHAN_GRACE_SEC, DEFAULT_ORPHAN_GRACE_SEC,
  );
  const bashNames = opts.bashNames instanceof Set ? opts.bashNames : DEFAULT_BASH_NAMES;
  const protectedPids = opts.protectedPids;
  // Optional pid→proc map so the reason string can name the ACTUAL parent
  // (claude.exe vs cmd.exe vs node.exe) instead of asserting "claude" blind.
  const procByPid = opts.procByPid instanceof Map ? opts.procByPid : null;
  const out = [];
  for (const p of procs) {
    if (!p || !isBashName(p.name, bashNames)) continue;
    // SELF-PROTECTION: never reap the sweep's own process tree. The sweep is
    // itself launched from a bash.exe hook — without this guard findStuckBashes
    // would classify its own parent shell as a "stuck hook chain" and kill it
    // mid-sweep. (Scrutiny BLOCKER, reviewer C, 2026-05-21.)
    if (isProtected(p.pid, protectedPids)) continue;
    const age = ageSec(p, now);
    if (age == null) continue; // missing createdMs → can't classify safely → skip
    const parentLive = isLive(p.ppid, livePidSet);
    if (parentLive && age >= threshold) {
      const parent = procByPid ? procByPid.get(p.ppid) : null;
      const parentName = parent && typeof parent.name === "string" ? parent.name : "unknown";
      out.push({
        pid: p.pid, ppid: p.ppid, ageSec: age,
        rssBytes: p.rssBytes || 0,
        reason: `stuck-hook-chain (age=${age}s, live parent ${parentName})`,
        cmd: typeof p.cmd === "string" ? p.cmd.slice(0, 200) : "",
      });
    } else if (!parentLive && age >= grace) {
      out.push({
        pid: p.pid, ppid: p.ppid, ageSec: age,
        rssBytes: p.rssBytes || 0,
        reason: `orphan-bash (age=${age}s, parent ${p.ppid} dead)`,
        cmd: typeof p.cmd === "string" ? p.cmd.slice(0, 200) : "",
      });
    }
  }
  return out;
}

/**
 * Find stale git fsmonitor--daemon processes. fsmonitor intentionally
 * detaches from its parent (`--detach`), so dead-parent is expected. The
 * kill criterion is AGE alone: a fsmonitor that has been running for
 * hours past its useful life is just a 10–20 MB cache holder with stale
 * state. `git status` will re-spawn one in milliseconds on next use.
 *
 * The detection is name + cmd, NOT name alone — bare "git.exe" includes
 * every interactive `git log` / `git diff` invocation, none of which we
 * want to touch.
 *
 * Kill criterion is dead-parent AND age (NOT age alone). fsmonitor `--detach`
 * normally orphans the daemon, so a LIVE parent means the spawning git
 * process is still attached — leave it. (Scrutiny BLOCKER, reviewer C,
 * 2026-05-21: age-alone could kill a daemon mid-operation.)
 *
 * @param {Array} procs — normalized procs
 * @param {Set<number>|null} livePidSet — live PIDs; a fsmonitor with a LIVE
 *   parent is spared (the spawning git is still running).
 * @param {{now?: number, ageSec?: number, protectedPids?: Set<number>}} opts
 */
export function findFsmonitorOrphans(procs, livePidSet, opts = {}) {
  if (!Array.isArray(procs)) return [];
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const threshold = clamp(
    opts.ageSec ?? DEFAULT_FSMONITOR_AGE_SEC,
    MIN_FSMONITOR_AGE_SEC, MAX_FSMONITOR_AGE_SEC, DEFAULT_FSMONITOR_AGE_SEC,
  );
  const re = opts.fsmonitorRegex instanceof RegExp ? opts.fsmonitorRegex : DEFAULT_FSMONITOR_REGEX;
  const protectedPids = opts.protectedPids;
  const out = [];
  for (const p of procs) {
    if (!p || typeof p.name !== "string") continue;
    // Some Git distributions name the binary `git-fsmonitor--daemon.exe`
    // directly (not just "git.exe" with a fsmonitor arg). Detect both.
    const nameLower = p.name.toLowerCase();
    const cmd = typeof p.cmd === "string" ? p.cmd : "";
    const nameMatchesFsmonitor = re.test(nameLower);
    const isGitWithFsmonArg = nameLower === "git.exe" && re.test(cmd);
    if (!nameMatchesFsmonitor && !isGitWithFsmonArg) continue;
    if (isProtected(p.pid, protectedPids)) continue;
    // Spare a daemon whose spawning git is still alive — only reap true orphans.
    if (isLive(p.ppid, livePidSet)) continue;
    const age = ageSec(p, now);
    if (age == null || age < threshold) continue;
    out.push({
      pid: p.pid, ppid: p.ppid, ageSec: age,
      rssBytes: p.rssBytes || 0,
      reason: `stale-fsmonitor (age=${age}s)`,
      cmd: cmd.slice(0, 200),
    });
  }
  return out;
}

/**
 * Find chat-slots.json entries whose state.pid is no longer alive.
 * Returns descriptors only — caller decides what to do (typically: emit a
 * caveat advising `chat-slots reclaim`, or invoke that helper directly).
 *
 * Why not auto-reclaim here: chat-slots.mjs owns the canonical reclaim
 * logic (file locking, schema bump, terminal-pin rebind). Re-implementing
 * it here would fork the source of truth for slot reclaim — exactly the
 * conflict pattern feedback_conflict_fork_rule.md says don't.
 *
 * @param {object|null} slotsData — parsed chat-slots.json (`{slots:[...]}`)
 * @param {Set<number>|null} livePidSet
 * @returns {Array<{slot, chatId, deadPid, lastHeartbeat}>}
 */
export function findStaleSlotPidEntries(slotsData, livePidSet) {
  if (!slotsData || !slotsData.slots) return [];
  // chat-slots.json canonical on-disk shape is a RECORD keyed by slot name
  // (`{slots: {alpha: {chatId, pid, ...}, bravo: {...}}}`). The CLI's status
  // action transforms it to an array of `{slot, status, state, ageMs}` rows
  // for human display. Accept both so this works whether the caller feeds
  // raw JSON or CLI output (and so a future schema bump that flips shape
  // doesn't silently break detection).
  const entries = [];
  if (Array.isArray(slotsData.slots)) {
    // CLI-shape: `[{slot, state: {chatId, pid, lastHeartbeat}}]`
    for (const row of slotsData.slots) {
      if (!row || !row.state) continue;
      entries.push({
        slot: String(row.slot || ""),
        chatId: row.state.chatId,
        pid: row.state.pid,
        lastHeartbeat: row.state.lastHeartbeat,
      });
    }
  } else if (typeof slotsData.slots === "object") {
    // Record-shape (canonical on-disk): `{alpha: {chatId, pid, lastHeartbeat}}`.
    // Some entries are `null` for unclaimed slots — skip those.
    for (const [slotName, state] of Object.entries(slotsData.slots)) {
      if (!state || typeof state !== "object") continue;
      entries.push({
        slot: String(slotName),
        chatId: state.chatId,
        pid: state.pid,
        lastHeartbeat: state.lastHeartbeat,
      });
    }
  }
  const out = [];
  for (const e of entries) {
    if (!e.pid) continue;
    const pid = Number(e.pid);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    if (isLive(pid, livePidSet)) continue;
    out.push({
      slot: e.slot,
      chatId: String(e.chatId || ""),
      deadPid: pid,
      lastHeartbeat: e.lastHeartbeat || null,
    });
  }
  return out;
}

/**
 * Build the protected-PID set: the sweep's own process tree — self +
 * every ancestor + every descendant. Both kill-emitting hunters exclude
 * these so the sweep can never reap the bash.exe that launched it, the
 * scheduled-task host, or a bash it spawned this run.
 *
 * Pure + total: bounded ancestor walk (cycle-guarded), bounded descendant
 * BFS (visited-set), tolerates a non-array procs input or a bad selfPid.
 *
 * @param {Array} procs — normalized [{pid, ppid, ...}]
 * @param {number} selfPid — the sweep process's own PID
 * @returns {Set<number>}
 */
export function buildProtectedPidSet(procs, selfPid) {
  const set = new Set();
  if (!Number.isInteger(selfPid) || selfPid <= 0) return set;
  set.add(selfPid);
  if (!Array.isArray(procs) || procs.length === 0) return set;

  const byPid = new Map();
  const childrenOf = new Map();
  for (const p of procs) {
    if (!p || !Number.isInteger(p.pid)) continue;
    byPid.set(p.pid, p);
    if (Number.isInteger(p.ppid)) {
      if (!childrenOf.has(p.ppid)) childrenOf.set(p.ppid, []);
      childrenOf.get(p.ppid).push(p.pid);
    }
  }

  // Ancestors: walk ppid upward. Only protect ancestors that are REAL tracked
  // processes — a root ppid that isn't in the enumeration (OS pseudo-root) is
  // never a hunter target anyway, so adding it would be imprecise noise.
  // Cycle-guarded by the set + a hop ceiling.
  let cur = byPid.get(selfPid);
  let hops = 0;
  while (cur && Number.isInteger(cur.ppid) && cur.ppid > 0 && hops < 64) {
    const parent = byPid.get(cur.ppid);
    if (!parent) break;           // ppid not a tracked process → stop
    if (set.has(cur.ppid)) break; // cycle / already seen
    set.add(cur.ppid);
    cur = parent;
    hops += 1;
  }

  // Descendants: BFS from self, visited-guarded.
  const queue = [selfPid];
  while (queue.length > 0) {
    const pid = queue.shift();
    const kids = childrenOf.get(pid) || [];
    for (const kid of kids) {
      if (!set.has(kid)) {
        set.add(kid);
        queue.push(kid);
      }
    }
  }
  return set;
}

/**
 * Convenience: run all three hunters in one call, returning a uniform
 * report. The sweep uses this so its wiring stays as one try/catch.
 */
export function runStuckHunters({
  procs,
  livePidSet,
  slotsData,
  now,
  stuckBashAgeSec,
  fsmonitorAgeSec,
  orphanGraceSec,
  protectedPids,
  procByPid,
  enableStuckBash = true,
  enableFsmonitor = true,
  enableStaleSlot = true,
} = {}) {
  // protectedPids threads the sweep's own process tree (self + ancestors +
  // descendants) into both kill-emitting hunters so neither can reap the
  // sweep itself. The stale-slot hunter is advisory (no kill) so it needs no
  // protection. procByPid lets the bash hunter name the real parent process.
  const stuckBashes = enableStuckBash
    ? findStuckBashes(procs, livePidSet, {
        now, ageSec: stuckBashAgeSec, orphanGraceSec, protectedPids, procByPid,
      })
    : [];
  const fsmonitorOrphans = enableFsmonitor
    ? findFsmonitorOrphans(procs, livePidSet, { now, ageSec: fsmonitorAgeSec, protectedPids })
    : [];
  const staleSlotEntries = enableStaleSlot
    ? findStaleSlotPidEntries(slotsData, livePidSet)
    : [];
  return { stuckBashes, fsmonitorOrphans, staleSlotEntries };
}
