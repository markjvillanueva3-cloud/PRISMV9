---
name: concurrency-and-locking-patterns
category: code-tribal
domain: backend-dev
tags: [concurrency, locking, race-condition, atomic-rmw, file-lock, multi-writer, single-writer, pid-lock, lockfile, distributed-coordination]
last_updated: 2026-05-18
---

# Concurrency + Locking Patterns in PRISM

PRISM runs up to 13 concurrent Claude chats writing to the same filesystem on the same machine, plus ~50 background scheduled tasks, plus 5+ generator scripts that share canonical state files. Concurrency bugs in this codebase are not theoretical — they are the second-largest bug class after schema drift (eight separate "last-writer-wins clobber" regressions are documented in CLAUDE.md `## Recent regressions`).

This wiki names the patterns that work, the patterns that fail, and the bug class each addresses.

## The three concurrency regimes

PRISM mixes three regimes that need different tools:

| Regime | Example | Wrong tool | Right tool |
|--------|---------|-----------|-----------|
| **Single-process atomicity** | Append one line to `AGENT_CHAT.jsonl` | No coord | `fs.appendFileSync` (atomic on Win + Linux for <PIPE_BUF) |
| **Single-machine, multi-process** | Two chats writing `roadmap-index.json` | Append | Atomic-rename (tmp → rename) + lockfile |
| **Cross-machine** | PC-A and PC-B both push to a slot | Lockfile on local FS | Per-host suffixes + git as the merge oracle |

The single biggest mistake is **using single-machine tools on cross-machine writes** (e.g. assuming `fs.writeFileSync` is atomic across machines because both share the H: drive — it isn't; SMB silently coalesces).

## Pattern 1 — Atomic-rename for canonical state files

The pattern: write to `<path>.tmp.<pid>`, fsync, rename → `<path>`. Rename is atomic on NTFS and ext4 at the inode level — a reader either sees the old file or the new file, never a half-written one.

```js
// scripts/lib/atomic-write.mjs (canonical helper)
export function atomicWriteJson(filePath, obj) {
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, filePath);
}
```

**Files that MUST atomic-write** (CLAUDE.md `## Recent regressions` shows what happens when they don't):
- `state/shared/system-viz/system-graph.json` — 3 writers (`generate-system-viz.mjs`, `regen-viz.mjs`, `system-viz-add-node.mjs`). Once-corrupted = downstream wiki regen wipes the merged 372K-node graph.
- `mcp-server/data/roadmap-index.json` — 5 writers, 3 still non-atomic at HEAD (2026-05-17 audit F4). A reader mid-write sees truncated JSON; a `register-*` run after `close-out-milestone` re-introduces stale `pending` status.
- `state/shared/.fleet-reaper-actions.jsonl` — append-only is fine; truncate-then-rewrite is not.

**The R8 dedup-preflight rule**: before writing a new state-file writer, grep for existing writers (`rg "writeFileSync.*${basename}"`). If >1 writer exists and any is non-atomic, **fix the existing writers first** before adding yours. Adding a 4th non-atomic writer makes the race 33% more likely; making the existing 3 atomic eliminates it.

## Pattern 2 — Lockfile for "only one process at a time"

For operations that must serialize (e.g. only one `regen-viz` run at a time), use a PID lockfile:

```js
// scripts/lib/pid-lock.mjs (canonical helper)
export function acquirePidLock(lockPath, opts = {}) {
  const { staleMs = 5 * 60 * 1000 } = opts;
  try {
    // O_EXCL atomic create — fails if file exists
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
    fs.closeSync(fd);
    return { ok: true, release: () => fs.unlinkSync(lockPath) };
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    // Check if holder is alive
    const existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (Date.now() - existing.at > staleMs) {
      fs.unlinkSync(lockPath);
      return acquirePidLock(lockPath, opts); // retry once
    }
    if (!isPidAlive(existing.pid)) {
      fs.unlinkSync(lockPath);
      return acquirePidLock(lockPath, opts);
    }
    return { ok: false, holder: existing };
  }
}
```

**Stale-lock detection MUST check BOTH**:
1. Age threshold (`now - at > staleMs`)
2. PID liveness (`isPidAlive(pid)`)

Without BOTH, a process that crashes inside a fresh lock window blocks the resource indefinitely. **The 2026-05-18 ancient `maintenance.lock` regression** (26 days old, 0 bytes, blocked all `git gc` for ~26 days) was a missing-staleness-check class — `git-lock-sweeper.mjs` knew about `.git/index.lock` but not `.git/objects/maintenance.lock`. The fix was to extend the `TOP_LOCKS` array — but the deeper lesson is to use a SOURCE-of-truth allowlist that hooks register into, not a hand-maintained array per cleanup tool.

## Pattern 3 — Append-only JSONL for multi-writer logs

For high-frequency multi-writer logs (`AGENT_CHAT.jsonl`, telemetry, error-memory), append-only JSONL is the right primitive. **Why JSONL beats JSON-array for multi-writer**:

- `fs.appendFileSync(path, JSON.stringify(obj) + '\n')` is **atomic** for writes <PIPE_BUF (4096 bytes on Linux, slightly different on Windows but in practice safe for sub-1KB log lines).
- No read-modify-write — no need to load the existing array, parse it, append, re-serialize, re-write.
- A reader can stream the file line-by-line; corruption in one line doesn't break the rest.

**When append-only is wrong**: when entries need to be UPDATED later (status flips, outcome recording). Then you need PATTERN 4.

## Pattern 4 — Lockfile-guarded atomic RMW for mutable JSON

For state where existing entries get updated (`slot-task-claims.json`, `chat-slots.json`, `MILESTONE_PROGRESS.json`), the pattern is:

```js
function rmw(filePath, mutator) {
  const lock = acquirePidLock(`${filePath}.lock`);
  if (!lock.ok) throw new Error(`locked by ${lock.holder.pid}`);
  try {
    const cur = readJsonOrDefault(filePath, {});
    const next = mutator(structuredClone(cur));
    if (next === cur) return; // no-op, skip write
    atomicWriteJson(filePath, next);
  } finally {
    lock.release();
  }
}
```

Three invariants:
1. **Read-after-lock** — the read MUST be inside the lock, not before.
2. **structuredClone before mutate** — never mutate the cur object; the mutator should return a NEW object.
3. **No-op skip-write** — saves N writes when nothing changed (cuts contention).

**The 2026-05-17 `slot-task-claims.json` race** was solved with exactly this pattern. The prior approach (a JSON array read, scanned, mutated in-place, re-written) had a 12% race rate at 13-slot fleet load; the lockfile-guarded RMW dropped it to ~0%.

## Pattern 5 — Single-writer designation for hot files

Some files are too hot to lock (e.g. `system-graph.json` at 370 MB). For these, designate ONE canonical writer; everyone else becomes read-only or routes through the canonical writer.

**Anti-pattern**: 3 scripts independently produce `system-graph.json` with DIFFERENT shapes (`generate-system-viz.mjs` emits a 20K-node 10-layer architecture graph; `regen-viz.mjs` emits a 372K-node merged FS-coverage graph). Last-writer-wins → silent graph degradation → master-index goes BM25-only fleet-wide.

**Fix**: separate output paths. `generate-system-viz.mjs` → `architecture-graph.json`; `regen-viz.mjs` → `system-graph.json`. The 2026-05-17 `U-VIZ-SPLIT-OUT-FILE` commit `dd735c1871` did exactly this. Cost: zero — they always WERE different products; sharing a path was the bug.

**General rule**: when N writers produce N different shapes for the same path, the path is wrong. Make the paths match the shapes.

## Pattern 6 — Per-host suffixes for cross-machine state

PRISM runs on 2 PCs (PC-A "MarkV" + PC-B). When both write a state file:

```js
const HOST = os.hostname();
const path = `state/shared/.fleet-reaper-enum-cache-${HOST}.json`;
```

Per-host suffixes mean PC-A and PC-B don't ping-pong overwriting each other. The merge is via git — `git pull` shows both files; readers iterate the directory. The 2026-05-18 `U-FR-S2` enumeration cache shipped exactly this pattern.

**When cross-machine state needs merging** (e.g. `chat-slots.json` shared across PCs): git IS the merge oracle. Don't try to merge by code — just commit-and-push, let git surface conflicts to the operator. Auto-merging concurrent slot claims is a footgun (the 2-PC fleet doesn't have a real-time consensus protocol).

## Pattern 7 — Watchdog timeouts on subprocess spawns

`child_process.spawn` with a stuck child can deadlock the parent. Always set a timeout:

```js
const r = spawnSync('node', ['-e', code], {
  timeout: 5000,
  killSignal: 'SIGKILL',
});
if (r.signal === 'SIGKILL') throw new Error('subprocess timed out');
```

The 2026-05-18 watchdog-trip (Bash `ran 30936ms (SLOW > 30000ms)`) was a Get-ChildItem on the wiki/.hook-cache directory that returned 78+ files; the right fix wasn't a longer timeout — it was a more specific glob (the cache dir didn't need to be scanned for backend-dev tagging anyway).

## Anti-patterns observed in PRISM

- **Spinning retry without backoff**: `while (locked) { sleep(10); }` → CPU storm under contention. Use `setTimeout` with exponential backoff (50, 100, 200, 400 ms).
- **Lock-free "I'll just check first"**: `if (!exists) write()` is a TOCTOU race. Use O_EXCL atomic create or the lockfile pattern.
- **Locking the wrong granularity**: holding a lock on `MILESTONE_PROGRESS.json` for the entire reconcile loop. Hold the lock ONLY around the read-mutate-write of the single milestone being updated.
- **Stale-lock cleanup that doesn't check PID liveness**: leads to "I cleaned up the stale lock and then 5 minutes later the rightful holder finished its work and now the file is corrupt." Always check `isPidAlive`.

## Bug-class taxonomy (from CLAUDE.md `## Recent regressions`)

| Bug class | Pattern that prevents it | Example commit |
|-----------|--------------------------|----------------|
| Last-writer-wins clobber | Pattern 1 (atomic-rename) + Pattern 5 (single-writer) | `dd735c1871` (system-graph split) |
| Mid-write truncated JSON | Pattern 1 (atomic-rename) | (5 of 5 roadmap-index writers — 3 still pending) |
| Ancient stale lock | Pattern 2 with BOTH age + PID-liveness check | git-lock-sweeper.mjs commit-graph-chain.lock fix 2026-05-18 |
| Cross-machine racing | Pattern 6 (per-host suffix) | `U-FR-S2` 2026-05-18 |
| TOCTOU race | O_EXCL atomic create | (multiple slot-task-claims fixes) |
| Read-before-lock | Pattern 4 (lock-then-read) | `U-CK06` slot-task-claim canonical refactor |

## When to break the rules

PRISM's atomic-write helper allocates a buffer for the entire JSON serialization, which is fine at <1 MB but problematic at 370 MB. For `system-graph.json` regen, the pattern is: stream-build, write to a `.staging` file, fsync, rename. The 2026-05-18 `U-VIZ-FIND-CACHE` saved-original-once-restore-at-suite-exit pattern is a worktree variant of this — atomic at the test-suite boundary, not the per-test boundary.

Streaming + atomic-rename combines the two patterns; pure atomic-rename on a 370 MB write momentarily doubles disk usage. Acceptable when transient; not acceptable for a 5 TB merged dataset.

## See also

- [[atomic-write-idempotency-patterns]] — single-writer atomicity mechanics
- [[multi-chat-coordination]] — the 26-chat fleet's slot system
- [[fail-loud-r12-patterns]] — surfacing concurrency failures honestly
- [[hermetic-test-patterns]] — testing concurrency without flake
- [[hook-lifecycle-anatomy]] — concurrent hook firing across chats
