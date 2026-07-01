---
title: "reference-memory-compact-null-holder-fix-2026-05-26"
name: reference-memory-compact-null-holder-fix-2026-05-26
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_memory_compact_null_holder_fix_2026_05_26.md
promoted_at: 2026-06-06T04:55:54.915Z
source_refs: 3
---

# memory-compact null-holder regression fix (2026-05-26, slot alpha)

**Symptom:** MEMORY.md re-grew from 13973B (2026-05-20 last OK) to 24382B (2026-05-26 CRITICAL, 99.19% of the 24576B Anthropic-harness truncation ceiling) fleet-wide. Every Stop-hook auto-compact was a silent no-op for ~6 hours. Per [[feedback_psn_definition]] PSN leg #4 (Memories) was actively degrading cross-session recall.

**Root cause:** `scripts/memory-compact.mjs` `acquireLock()` line 188-191 (pre-2026-05-26) computed `ageEffective` as `!Number.isFinite(holder.ts) || holder.ts > now + 24h ? Infinity : now - holder.ts`. When the lockfile was unreadable/corrupt, `holder` stayed `null`, then `holder.ts` re-threw `Cannot read properties of null (reading 'ts')`. The script wrapped its main in `try/catch` and returned `{ok:false, reason:"threw"}` — `stop-memory-size-watchdog.mjs` fail-soft-degraded the throw to advisory-only and the 12h advisory throttle silenced even the warning.

**The trigger artifact:** `C:/Users/wompu/.claude/projects/H--prism/memory/.memory-compact.lock` was a 0-byte stale lockfile (prior compaction was killed mid-write — disk error, process kill, or the conflict-fork incident 2026-05-23). `JSON.parse("")` throws → `holder=null` → next-line null-deref.

**Boris #1 verification (live numbers, not asserted):**
- pre-fix: MEMORY.md 24378B (99.19%) · auto-compact returns `{ok:false, reason:"threw"}` · 0-byte stale lock present
- post-fix: MEMORY.md 12280B (49.97%) · auto-compact returns `{ok:true, archived:N, kept:43}` · lock cleaned up
- regression tests: 3 new node:test cases (`0-byte stale lockfile steals cleanly`, `corrupt-JSON holder steals cleanly`, `holder with missing ts steals cleanly`), 33/33 PASS total
- fail-loud per [[feedback_r5_thru_r12_doctrine]] R12: explicit `!holder` guard, regression test reference inline

**Fix:** `!holder || !Number.isFinite(holder.ts) || holder.ts > now + 24h` — null-guard added to the first clause of `ageEffective`. Stale-stealable semantics preserved (a missing holder is still treated as stale). `scripts/memory-compact.test.mjs` adds 3 regression tests for the null/corrupt/missing-ts holder paths.

**PSN synergy (per /goal):**
- Leg #1 (Obsidian brain): this reference file feeds the auto-memory pipeline; the next Stop runs `stop-obsidian-memory-feed.mjs` which copies it into `knowledge/memories/reference/`.
- Leg #4 (Memories): fix restores the auto-compact pipeline; MEMORY.md regrowth bounded.
- Leg #6 (System Viz): forge-audit roost `ghost.forge_audit_token_context_2026_05_26` (`U-MEMORY-MD-AUTO-PRUNE` child) re-classified from `critical` → `resolved` on next regen.

**Cross-refs:** [[reference_forge_audit_token_context_2026_05_26]] U-MEMORY-MD-AUTO-PRUNE · [[feedback_never_delete_only_disable]] · `state/shared/memory-size-history.jsonl` (timestamps the regression window) · `scripts/memory-compact.mjs:183-197`.

## Source

Promoted from memory [[reference_memory_compact_null_holder_fix_2026_05_26]] (referenced 3x across the vault). The memory remains the editable source of truth.
