---
name: atomic-write-idempotency-patterns
category: software-engineering
domain: backend-dev
tags: [atomic-write, idempotency, race-condition, data-integrity, ai-development]
last_updated: 2026-05-18
---

# Atomic-Write + Idempotency Patterns

PRISM scatters many writers across many chats. Without atomic-write + idempotency, the shared-state files (system-graph, MILESTONE_PROGRESS, tribal-embed-index, chat-slots) get last-writer-wins clobber or corrupt mid-write. Two patterns are load-bearing.

## Atomic write — temp + rename

```js
function atomicWriteJSON(outPath, obj) {
  const tmp = outPath + ".tmp." + process.pid + "." + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, outPath);
}
```

Rename is atomic on POSIX and on Windows (since NTFS). A reader that opens the file mid-write either sees the OLD contents (rename not yet committed) or the NEW contents (rename done) — never a half-written file.

**Failure modes the simple pattern misses:**

1. **Crash between write and rename** → orphan `.tmp.<pid>.<ts>` file. Garbage-collect at startup or in a sweeper. PRISM `state/shared/` has 29 orphaned tmp files (~5.6 MB) from prior crashed writes — proof the failure is live.
2. **Concurrent writers race the rename** → last rename wins, prior writer's data lost silently. Add a lockfile (`flock` POSIX or `O_EXCL` on Windows). PRISM's `system-graph.json` has 3 independent writers — one of them fixed its OUT_FILE, the other 2 still race.
3. **No `fsync` before rename** → kernel buffer + crash = empty file. For critical state, `fs.fdatasyncSync(fd)` before close + rename. Not needed for advisory caches.

**Choose the right pattern by criticality:**

| File class | Pattern | Example |
|------------|---------|---------|
| Append-only ledger | `appendFileSync` + JSONL | `tribal-citation-log.jsonl`, `error-memory.json` |
| Read-mostly state | atomic write + lockfile | `chat-slots.json`, `slot-task-claims.json` |
| Critical state | atomic write + lockfile + fsync | `roadmap-index.json` (TODO) |
| Hot path | SQLite + WAL | `H8 coordination store` |

## Idempotency — design the operation so re-running is a no-op

Three invariants every idempotent operation honors:

1. **Read current state first.** Decide what to do based on the observed state, not the assumed state.
2. **Short-circuit on already-done.** If the target is already at the desired state, return `{done:true, reason:"already"}` without writing.
3. **Plan/apply split.** Plan is pure (no side effects). Apply is the only place writes happen. Same plan twice = same result.

Example (the U-TRIBAL-BACKEND-DEV-WIRE retagger):

```js
function classify(entry) {
  if (entry.domain === TARGET_DOMAIN) return { retag: false, reason: "already" };
  const score = scoreEntry(entry);
  if (entry.source === "memory" && score >= 2) return { retag: true, reason: `memory+kw${score}` };
  if (entry.source === "external" && score >= 4) return { retag: true, reason: `external+kw${score}` };
  return { retag: false, reason: "below-threshold" };
}

function planRetag(idx) {
  // pure — no side effects
  return idx.entries.map((e, i) => ({ ...classify(e), idx: i, id: e.id }))
                    .filter(p => p.retag);
}

function applyPlan(idx, plan) {
  // shallow-clone + targeted mutation only
  const next = { ...idx, entries: idx.entries.slice() };
  for (const step of plan) next.entries[step.idx] = { ...next.entries[step.idx], domain: TARGET_DOMAIN };
  return next;
}
```

First run: 34 retags. Second run: 0 retags / 34 already / 390 skipped. **Verified by running `--apply` then re-running `--apply`; the second invocation reports 0 retags and the file's `retaggedCount` doesn't change.**

## Partial-failure tolerance

If `applyPlan` crashes mid-iteration (out of memory, file lock, etc.), the on-disk file is unchanged because the write is atomic. The next `--apply` reads the (still-old) state, computes the (still-same) plan, and re-attempts. **The operation is crash-safe AS A WHOLE if both atomic-write AND idempotency hold.**

## When idempotency breaks (real PRISM bugs)

- **Side-effects in plan phase** — e.g. plan() emits a "started" event before any mutation; replay double-emits.
- **Time-based idempotency keys** — e.g. `id: Date.now()` differs each run; the same logical operation gets two records.
- **Order-dependent state** — e.g. retag affects entries[5]'s embedding, which affects entries[6]'s classification; rerun produces different output.
- **Schema drift between writers** — writer-A bumps the schema, writer-B still uses the old shape; both run on the same file and one silently corrupts the other.

The U-SEED-GHOST-COMPACT bug (2026-05-18) is a sibling — different writer, but the same shared-file failure-class: `JSON.stringify(g, null, 2)` exceeded V8's max-string-length at scale → silent crash mid-write → 681 ghost nodes never seeded → GNN tier-5 dormant by data.

## Related

- [[fail-loud-r12-patterns]] — write-failure must be loud
- [[karpathy-12-rule-discipline]] — R8 (read before write)
- CLAUDE.md §"Recent regressions" 2026-05-17 — roadmap-index.json has 5 writers, 3 non-atomic
- CLAUDE.md §"## Recent regressions" 2026-05-18 — U-SEED-GHOST-COMPACT
