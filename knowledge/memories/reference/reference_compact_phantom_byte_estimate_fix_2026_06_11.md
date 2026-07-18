---
name: compact-phantom-byte-estimate-fix-2026-06-11
description: "Constant false /compact nudges fleet-wide: chat-token-watch's byte-estimate FALLBACK over-reports (post-compact JSONL bloat / 3.5 -> 1.86M 'tokens' on a 1M window = impossible). Classified critical -> zulu /compact every turn. Fix: SUSPECT guard downgrades >1.1x-cap byte-estimates critical->warn (commit 7b8dbde2dd, slot:alpha). Complements the 2026-06-10 sidecar-first fix."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.528Z
aliases: reference_compact_phantom_byte_estimate_fix_2026_06_11
---


# Compaction false-nudge phantom fix (slot:alpha 2026-06-11, operator-directed)

**Operator: "fix the auto compaction... so all chats can continue without stopping all the time saying you hit context area to compact."**

## Root cause (verified LIVE on this session)
`chat-token-watch.readChatPressure` has TWO paths: (1) sidecar-first (authoritative per-turn `usage`, fixed 2026-06-10 [[reference_cho02_sidecar_first_2026_06_10]]); (2) byte-estimate FALLBACK (post-compact transcript JSONL bytes / 3.5) used when no fresh sidecar -- e.g. **slot=unknown** (the zulu read) or sidecar >180s stale. The JSONL redundantly logs every turn's FULL hook-injection + FULL tool outputs, so it OVER-reports massively. This 26MB session: real post-compact span = 5.5MB JSONL -> byte-est **1.86M "tokens"** -- PHYSICALLY IMPOSSIBLE (window holds <=1M; if it were that full the API would have auto-compacted). That phantom classified **critical** -> `decideClearOrCompact` -> zulu "/compact recommended" EVERY turn, and `zulu-orchestrator-sweep` would auto-SendKeys /compact. (This same phantom is why I mis-read my own context as "deep YELLOW" and kept refusing to continue -- I was a victim of the bug I was sent to fix.)

## Why precompact-auto-trigger (the HARD block) did NOT block
It already self-protects: a byte-est > 1.1x CONTEXT_CAP trips its `TOKEN_COUNT_SUSPECT` floor and SUPPRESSES the block. `chat-token-watch` lacked that parity guard -> its advisory + sweep consumers kept nudging.

## Fix (commit 7b8dbde2dd, U-FIBA-COMPACT-PHANTOM-FIX)
Parity guard in `readChatPressure` byte-estimate path: `tokens > 1.1 x CONTEXT_CAP` (1M, knob `PRISM_CHAT_TOKEN_CONTEXT_CAP`) -> impossible-as-real -> `suspect:true` + downgrade false `critical` -> `warn` (= zulu **advise-only "build on"**, NOT /compact). Sidecar path untouched (real critical still fires); in-window 940K-1.1M still critical (conservative). Constants `DEFAULT_CONTEXT_CAP_TOKENS` + `SUSPECT_FACTOR`. **Shared lib -> ALL consumers fixed at once: zulu-advisory-inject, zulu-orchestrator-sweep, zulu-orchestrator-lib.** 42/42 tests (3 new). LIVE: this session critical->warn, compact-decision->advise-only.

## Follow-ups (NOT done)
- `statusline.mjs` shows the raw byte-number (display-only, doesn't STOP chats -- low priority).
- `transcript-token-counter.mjs` could take the same suspect guard for any other byte consumers.
- DEEPER root cause: the byte/token ratio (3.5) is wrong for the redundant JSONL; a better fix is always-authoritative-usage, but the sidecar covers active chats (180s TTL). The suspect guard is the surgical stop-the-false-nudge fix.

Related: [[reference_cho02_sidecar_first_2026_06_10]] · [[reference_cho02_compact_scan_accuracy_2026_06_09]] · [[reference_fleet_injection_budget_audit_2026_06_11]] · the 2026-06-10 compact-boundary-format regression [[compact-boundary-format-change-constant-compaction]].
