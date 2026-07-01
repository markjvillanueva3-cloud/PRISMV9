# COMPACTION-BOUNDARY-FIX/U-CBF01 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [COMPACTION-BOUNDARY-FIX]/U-CBF01 (slot:alpha): fix alpha constant-compaction -- recognize current compact_boundary transcript marker (was isCompactSummary)

**Commit:** `0a966b569621` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T23:52:56-05:00
**Tags:** compaction-boundary-fix, u-cbf01, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [COMPACTION-BOUNDARY-FIX]/U-CBF01 (slot:alpha): fix alpha constant-compaction -- recognize current compact_boundary transcript marker (was isCompactSummary)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [COMPACTION-BOUNDARY-FIX]/U-CBF01 (slot:alpha): fix alpha constant-compaction -- recognize current compact_boundary transcript marker (was isCompactSummary)

Root cause (verified vs live transcripts 2026-06-10): Claude Code changed how it
marks a compaction in the session JSONL -- now a system record
{"type":"system","subtype":"compact_boundary","compactMetadata":{"preTokens":..}}
instead of the legacy per-message "isCompactSummary":true flag (a 158MB session
shows compact_boundary x13, ZERO isCompactSummary entries). Every byte-based ctx
estimator scanned only the dead legacy flag -> found no boundary -> counted the
WHOLE appended transcript (appended on /compact, never truncated). At 3.5 B/tok a
3.29-3.85MB transcript byte-estimates into the UNGUARDED [HARD=940K, 1.1xCAP=1.1M]
band (the >1.1xcap suspect-suppress only catches >1.1M) -> precompact-auto-trigger
(tier-T0, PreToolUse) decision:block every tool call -> /precompact -> /compact ->
file only grows, boundary still unseen -> loop. Alpha worst-hit. 2nd path:
lastAssistantTokens read a pre-compact ~950K turn as authoritative right after a
high-watermark compact. The sidecar masked it (reads authoritative usage = 345K
GREEN); the byte path only fires when the sidecar is stale (>180s, routine).

Fix: centralized COMPACT_MARKERS (current+legacy) + lastCompactMarkerOffset in
transcript-token-counter.mjs; findLastCompactOffset regex + lastAssistantTokens
boundary-break in precompact-auto-trigger.mjs; propagated to the 3 inline byte-
slice consumers (token-awareness-sidecar.mjs, statusline.mjs, chat-token-watch.mjs).
Real BYTE/ASSISTANT-PATH regression tests (FAIL pre-fix). 48/48 + 16/16 + 39/39;
per-file 2-reviewer PASS. Companion (mirror/auto-feed, outside repo): de-duped the
redundant --post PostToolUse wiring; wiki lesson + memory written.

Lessons: centralize harness-format markers (1 edit not N); a byte estimate must
never actuate /compact in an unguarded band; compaction appends-never-shrinks ->
estimators MUST be boundary-aware; shared-tree git stash is GLOBAL (peer collision).
```

## Files touched (9)
- .claude/hooks/__tests__/precompact-auto-trigger.test.mjs                    | 62 +++++++++++++++++++++++++++
- .claude/hooks/precompact-auto-trigger.mjs                                   | 18 +++++++-
- .claude/hooks/token-awareness-sidecar.mjs                                   |  7 +++-
- .claude/statusline.mjs                                                      |  7 +++-
- .../wiki/lessons/compact-boundary-format-change-constant-compaction.md      | 84 +++++++++++++++++++++++++++++++++++++
- scripts/lib/__tests__/transcript-token-counter.test.mjs                     | 40 ++++++++++++++++++
- scripts/lib/chat-token-watch.mjs                                            | 13 +++++-
- scripts/lib/transcript-token-counter.mjs                                    | 42 ++++++++++++++++---
- 8 files changed, 262 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till unseen -> loop. Alpha worst-hit. 2nd path:
- lesson + memory written.
- Lessons: centralize harness-format markers (1 edit not N); a byte estimate must

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a966b569621`
- Milestone envelope: `mcp-server/data/milestones/COMPACTION-BOUNDARY-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._