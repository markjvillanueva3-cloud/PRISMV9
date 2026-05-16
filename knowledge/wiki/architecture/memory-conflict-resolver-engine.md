---
title: MemoryConflictResolverEngine (D3 — semantic memory-key conflict resolution)
kind: architecture
milestone: OBSIDIAN-INTELLIGENCE-MS3/U-CONFLICT-RESOLUTION
status: current
created: 2026-05-16
---

# MemoryConflictResolverEngine — semantic memory-key conflict resolution

OBSIDIAN-INTELLIGENCE-MS3 / U-CONFLICT-RESOLUTION (D3). Ship commit `a6a119663`.

## What it is

When two chats write different content to the same logical **memory key**
(a memo / wiki entry identified by its basename), the naive outcome is
silent last-writer-wins — i.e. data loss. This engine detects the
divergence and preserves **both** versions in
`knowledge/memories/conflicts/<key>.diff.md` with a policy-selected
winner.

```
detectConflict({ key, existing, incoming, windowMs?, policy? })
  → { conflict, reason, winner, winnerRole, existingHash, incomingHash, deltaMs, ... }
resolveConflict(...)  // detect + persist on a real conflict
  → { ...detection, written, file, sectionsInFile, degraded }
```

## Semantic vs file-level — why this is NOT the commit-ownership guard

`commit-ownership-guard` / `file-claim-guard` are **file/git-level locks**:
they run at PreToolUse / pre-commit and *prevent* a second chat from
editing/committing a claimed path. This engine is a **semantic, post-hoc
reconciliation layer**: two chats can legitimately both land a write on
the same logical key without ever tripping a file-claim — vault-mirror
writes (`memory-mirror-to-vault.mjs`) bypass the claim system, cross-
worktree chats hold independent claim state, append-style memo updates
race below a path lock's granularity. This engine catches that race
*after* both writes are known and preserves both. Complementary to, not
a replacement for, the file-level locks.

## Surfaces

| Surface | Path |
|---------|------|
| Engine | `mcp-server/src/engines/MemoryConflictResolverEngine.ts` (`detectConflict`, `resolveConflict`, `sanitizeKey`, `hashContent`, `ConflictPolicySchema`, `MemoryWriteSchema`, frozen `memoryConflictResolverEngine` singleton) |
| Dispatcher | `prism_session:memory_conflict_resolve` (detect + resolve; `file` is a basename — no host-path leak) |
| Schema | `sessionActionSchemas.ts` → `memory_conflict_resolve` (`.strict()`; `existing`/`incoming` shapes match `MemoryWriteSchema`) |
| Test | `mcp-server/src/__tests__/MemoryConflictResolverEngine.test.ts` (50 hermetic cases via `PRISM_MEMORY_CONFLICT_DIR` / `_FROZEN_TIME` / `_LOCK_TIMEOUT_MS`) |
| Conflict log | `knowledge/memories/conflicts/<key>.diff.md` — append-only, one `## Conflict @` section per occurrence |

## Classification

A pair is a CONFLICT (always persisted) when content differs (SHA-256
mismatch) **and** the agents differ. Non-conflicts: `identical-content`
(idempotent re-write / mirror echo), `same-author` (one chat editing its
own memo — author precedence over the window). The `windowMs` only
labels the reason: `concurrent` (within window — a true race) vs
`superseded` (beyond — a sequential overwrite).

## Load-bearing invariants

- **Data-loss invariant** — a cross-agent divergent write is ALWAYS
  persisted, regardless of the timestamp window. Caller clocks are
  unsynchronized across hosts/worktrees, so a window-gated *drop* would
  silently lose exactly the cross-host race this engine exists to catch.
- **Append-only, serialized per key** — the frontmatter header is created
  once (`wx`); each section is a single `appendFileSync`; all create-or-
  append for one key runs inside a **token-stamped advisory lockfile**
  (`<file>.lock`, atomic `renameSync` stale-steal, token-checked release
  so a stale-stolen-then-reacquired lock is never freed by the wrong
  owner). Sections can be neither dropped nor torn.
- **Lock timeout never loses the record** — on `{acquired:false}` the
  full record is spilled to a unique contention-free
  `<key>.diff.locktimeout-<pid>-<hrtime>.md` (`degraded:true`). An
  operator/cron reconciles spills.
- **Unforgeable section count** — counted via an out-of-band
  `<!-- prism:conflict-section -->` sentinel (not the human-readable
  `## Conflict @` heading); embedded copies in memo content are escaped.
- **Constants** — `LOCK_TIMEOUT_MS (90s) > LOCK_STALE_MS (60s)` so a
  crashed-owner lock is always stealable within the wait budget;
  `LOCK_STALE_MS` is sized above the worst-case large-memo hold.

## Knobs

- `PRISM_MEMORY_CONFLICT_DIR` — override the conflicts dir (hermetic tests).
- `PRISM_MEMORY_CONFLICT_FROZEN_TIME` — pin the clock (deterministic audit/tests).
- `PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS` — override the lock wait budget
  (testability — exercises the spill path without a 90 s wait).

## Follow-up (NOT in D3 scope)

- A PostToolUse memory-mirror-race hook calling `resolveConflict` (the
  engine write-path consumer — the natural automatic trigger).
- A reconcile cron/skill folding `*.diff.locktimeout-*` spills +
  `*.lock.stale-*` husks back into the canonical `<key>.diff.md`.
- Dispatcher response could return `winnerRole` + hashes instead of the
  full `winner.content` (up to 5 MB) to bound MCP response size.

Memory: [[reference_d3_conflict_resolution_2026_05_16]]. Sister D-series:
[[action-trace-engine]] (D4), [[reference_d1_provenance_layer]] (D1),
[[reference_e1_ideablock_extractor_2026_05_15]].
