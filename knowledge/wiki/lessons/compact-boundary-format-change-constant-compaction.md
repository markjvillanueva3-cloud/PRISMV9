---
title: Transcript compact-boundary format change drove the alpha constant-compaction loop
date: 2026-06-10
slot: alpha
tags: [compaction, token-awareness, transcript, precompact, regression, format-drift]
severity: high
related: [[token-awareness-ms0]] [[reference_compaction_optimal_2026_05_22]] [[ollama-pipeline-ms0]]
---

# Compact-boundary format change -> constant compaction (alpha)

## Symptom
The alpha slot was "constantly compacting" -- it would `/compact`, lose its work, and
re-compact almost immediately, never making progress on its actual task.

## Root cause (verified against live transcripts 2026-06-10)
Claude Code changed how it marks a compaction in the session transcript JSONL:

- **Legacy:** a per-message flag `"isCompactSummary":true`.
- **Current (2026-06):** a dedicated system record
  `{"type":"system","subtype":"compact_boundary","content":"Conversation compacted",
  "compactMetadata":{"trigger":"auto","preTokens":702495,...}}` -- NO `usage` block,
  NO `isCompactSummary` flag.

Evidence: a 158MB session showed `subtype:"compact_boundary"` x13 (matching ~13
compactions) and **zero** `isCompactSummary`-flagged entries.

Every byte-based context estimator scanned only for the dead legacy flag, so for any
current-build transcript the scan found no boundary and counted the **whole accumulated
transcript** (the JSONL is appended-to on compact, never truncated). At ~3.5 bytes/token,
a transcript of **3.29-3.85MB byte-estimates into the [HARD=940K, 1.1xCAP=1.1M] band** --
which slipped *under* the only guard (the `>1.1xcap` "TOKEN_COUNT_SUSPECT" suppress, added
2026-05-21) and *over* the HARD threshold. Result in the tier-T0 `precompact-auto-trigger.mjs`
(wired PreToolUse): `decision:block` on every tool call -> the model obeys, runs
`/precompact` -> `/compact` -> the file only grows -> the boundary is still unrecognized ->
block again. A self-sustaining loop. Alpha is worst-hit: it is the heaviest-injection slot
(largest, fastest-growing transcript) and auto-resumes (re-loading a large transcript).

A second, independent loop path: `lastAssistantTokens()` read the latest assistant `usage`
block; right after a high-watermark compact, before any post-compact assistant turn exists,
that is the **pre-compact** turn (cache_read ~ preTokens, up to ~950K), treated as
authoritative (the byte sanity-floor does NOT apply to the assistant source) -> unsuppressed
HARD block.

## Why the sidecar masked it
`token-awareness-sidecar.mjs` reports the *correct* ctx (live: 345K GREEN) because
`extractLatestCtx` reads the authoritative per-turn `usage` block, not bytes. The bug only
bites when the sidecar is stale (>180s -- routine on turns >3min under fleet load) AND
`lastAssistantTokens` returns null, handing control to the broken byte path.

## Fix (WIRE -> TEST -> VALIDATE -> all consumers)
Make every compact-boundary scanner recognize BOTH formats:
- `scripts/lib/transcript-token-counter.mjs` (canonical): added `COMPACT_MARKERS`
  (current + legacy) + pure `lastCompactMarkerOffset`; `sliceAfterLastCompact` +
  `isCompactSummaryBlock` updated.
- `.claude/hooks/precompact-auto-trigger.mjs`: `findLastCompactOffset` regex matches both;
  `lastAssistantTokens` breaks at a `compact_boundary` record (never reads pre-compact usage
  as current).
- Propagated to the 3 inline byte-slice consumers: `token-awareness-sidecar.mjs`,
  `.claude/statusline.mjs`, `scripts/lib/chat-token-watch.mjs`.
- Wiring de-dup: removed the redundant `precompact-auto-trigger.mjs --post` (PostToolUse)
  invocation from user settings (the hook's own header says PreToolUse-only; project settings
  had already neutered it). Sidecar refresh on PostToolUse kept.

Real regression tests added (fail without the fix): BYTE PATH (current `compact_boundary`
precedes huge pre-compact bytes -> no block) + ASSISTANT PATH (pre-compact ~950K across a
boundary -> no block). transcript-token-counter 48/48, precompact-auto-trigger 16/16,
chat-token-watch 39/39.

## Lessons
1. **A transcript/format marker the harness emits can change under you.** Any code that
   scans the transcript for a magic string is format-coupled; centralize the marker
   (one `COMPACT_MARKERS`) so the next change is one edit, not N (this bug touched 5 files
   that each had their own copy).
2. **A byte-derived estimate must never silently actuate an irreversible action** (here
   `/compact`) when it lands in an *unguarded* band. The 2026-05-21 guard only covered
   `>1.1xcap`; the [HARD, 1.1xcap] band was unguarded and invisible (no ledger entry).
3. **Compaction appends to the on-disk transcript; it never shrinks the file.** Any
   byte-size estimator MUST be compact-boundary-aware or it will read pre-compact bloat as
   current context forever.
4. **Prefer the authoritative per-turn `usage` block over byte estimates.** The sidecar
   survived precisely because it reads usage, not bytes.
5. **In the shared tree, `git stash` is global and collides with peer stashes.** Do not use
   `git stash` for test-isolation in `H:/prism`; use a worktree or direct file comparison.
