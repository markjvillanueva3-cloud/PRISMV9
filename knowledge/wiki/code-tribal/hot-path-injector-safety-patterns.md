---
title: Hot-path injector & shared-state safety patterns
type: code-tribal
domain: dev-infra
slot: golf
created: 2026-06-01
tags: [hooks, injector, hot-path, throttle, shared-state, concurrency, recall]
related:
  - "[[context-economy-injector-knobs]]"
  - "[[reference_memory_recall_supersede_exclusion_2026_06_01]]"
---

# Hot-path injector & shared-state safety patterns

Reusable patterns for UserPromptSubmit/PreToolUse injectors and any code that touches a
shared hot path read by all 26 chats. Distilled from the MEMORY-RECALL hardening
(supersession exclusion, per-galaxy domain boost, prompt-hash throttle), golf 2026-06-01.

## 1. Scoring tweaks on a shared hot-path: ADDITIVE · RELEVANCE-GATED · OPT-IN

When biasing a recall/search score (e.g. a per-galaxy domain boost), three invariants
keep the fragile hot-path from ever degrading:

- **Additive only** — never subtract from other records. A cross-domain hit's absolute
  score is untouched, so a strong match can't be hidden; the bias can only re-order at
  the top-K margin.
- **Relevance-gated** — apply the boost only to records that ALREADY scored > 0 on the
  query (`if (base <= 0) continue;` BEFORE `score = base + boost(...)`). An off-topic
  record is never injected just because some context (e.g. the active slot) is set.
- **Opt-in** — the default (no bias param) must be byte-identical to legacy behavior.
  `const boost = opts.boost ?? null;` → a null boost is a no-op.

Result: the change can ONLY help, never regress, and ships safely without a flag day.

## 2. Per-session throttle: PER-SESSION FILES + FAIL-OPEN (never a shared writer)

A /loop re-submits the SAME prompt each tick; a naive per-prompt injector re-injects an
identical block every tick (context burn). Throttle it — but:

- **Per-session state files** (`state/<dir>/<sessionId>.json`), NOT one shared file. 26
  chats sharing one file = lost-update races (the tribal-embed-index 4-writer bug). One
  file per session = zero contention.
- **Fail-OPEN** — any missing session id / I/O error / ttl<=0 ⇒ do NOT throttle (inject).
  A throttle that fails closed silently suppresses recall — worse than the burn it prevents.
- **Bound the dir** — per-session files accumulate forever (every /compact rotates the id).
  GC files untouched > 24h on the write path (cheap because the dir stays small), and add
  a dir-local `.gitignore` (`*` + `!.gitignore`) so transient state is never committed.
  This is the repo's named per-session-file leak class (cf. tmp-orphan-janitor, 16GB leak).
- **Sanitize the session id** before using it in a path (`replace(/[^a-zA-Z0-9._-]/g,'')`)
  — path-traversal guard.

## 3. Build-time filter > query-time filter (single source of exclusion)

To drop records (e.g. superseded memories) from recall, filter at the SIDECAR BUILD, not
at query time: the dense/embeddings sidecar derives from the BM25 sidecar, so one
build-time filter covers both arms. Keep the query-time live-scan fallback consistent for
when the sidecar is stale. And when a record leaves the source, make `--resume` rebuilds
EVICT it (intersect prior results against the live key set) — else the dense arm retains
stale vectors and diverges.

## 4. Editing a harness-exec file (`.claude/hooks/*.mjs`) from a slot worktree

Cross-worktree writes to harness-exec files are HARD-blocked (they change which hooks fire
fleet-wide). The documented override is `PRISM_CROSS_WORKTREE_BYPASS=1`; apply the edit,
parse-check (`node --check`), smoke-test, then **commit atomically** so no cross-tree
uncommitted drift lingers. "Any slot can wire hooks" — but commit it immediately.
