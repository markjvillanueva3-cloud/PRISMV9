---
name: reference_compact_boundary_format_fix_2026_06_10
description: "Alpha constant-compaction root cause + fix — Claude Code transcript compact marker changed isCompactSummary -> compact_boundary, breaking every byte-based ctx estimator."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.528Z
aliases: reference_compact_boundary_format_fix_2026_06_10
---


**Alpha constant-compaction fix (2026-06-10, slot:alpha).** The "alpha keeps compacting"
symptom was a transcript-format regression: Claude Code now marks a compaction with a
`{"type":"system","subtype":"compact_boundary","compactMetadata":{"preTokens":...}}` record,
NOT the legacy `"isCompactSummary":true` flag (verified: 158MB session = `compact_boundary` x13,
zero `isCompactSummary` entries). Every byte-based ctx estimator scanned only the dead legacy
flag -> counted the WHOLE appended transcript -> a 3.3-3.85MB file byte-estimated into the
unguarded [HARD=940K, 1.1xCAP=1.1M] band -> `precompact-auto-trigger.mjs` (tier-T0, PreToolUse)
`decision:block`ed every tool call -> forced /compact -> file only grows -> loop. Second path:
`lastAssistantTokens` read a pre-compact ~950K turn as authoritative right after a high-watermark
compact. The sidecar masked it (reads authoritative per-turn usage = 345K GREEN); the byte path
only fires when the sidecar is stale (>180s, routine under fleet load) + lastAssistantTokens null.

**Fix:** centralized `COMPACT_MARKERS` (current+legacy) + `lastCompactMarkerOffset` in
`scripts/lib/transcript-token-counter.mjs`; updated `precompact-auto-trigger.mjs`
(`findLastCompactOffset` regex + `lastAssistantTokens` boundary-break); propagated to the 3 inline
byte-slice consumers (`token-awareness-sidecar.mjs:90`, `statusline.mjs:90`,
`chat-token-watch.mjs findLastCompactOffsetInBuffer`); de-duped the redundant `--post` PostToolUse
wiring (PreToolUse-only per the hook header). Real BYTE-PATH + ASSISTANT-PATH regression tests
(fail without fix). 48/48 + 16/16 + 39/39.

**Lessons:** (1) centralize harness-format markers so a format change is 1 edit not N;
(2) a byte estimate must never actuate an irreversible action in an unguarded band;
(3) compaction appends to the transcript, never shrinks it -> estimators MUST be boundary-aware;
(4) in the shared `H:/prism` tree `git stash` is GLOBAL and collides with peer stashes -- never
use it for test isolation there. See [[compact-boundary-format-change-constant-compaction]].
