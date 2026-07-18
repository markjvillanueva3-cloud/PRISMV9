# ZULU-ORCHESTRATOR/U-CHO02-COMPACT-SCAN-ACCURACY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ORCHESTRATOR]/U-CHO02-COMPACT-SCAN-ACCURACY (slot:bravo): fix readChatPressure false-critical over-report (256KB tail missed the compact marker) -- corrects the already-wired zulu sweep + unblocks zulu-advisory

**Commit:** `d257350cf3a4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T23:46:14-05:00
**Tags:** zulu-orchestrator, u-cho02-compact-scan-accuracy, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ORCHESTRATOR]/U-CHO02-COMPACT-SCAN-ACCURACY (slot:bravo): fix readChatPressure false-critical over-report (256KB tail missed the compact marker) -- corrects the already-wired zulu sweep + unblocks zulu-advisory

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ORCHESTRATOR]/U-CHO02-COMPACT-SCAN-ACCURACY (slot:bravo): fix readChatPressure false-critical over-report (256KB tail missed the compact marker) -- corrects the already-wired zulu sweep + unblocks zulu-advisory

readChatPressure (CHO02) drives 3 zulu-lane consumers: the U-ZULU02 SendKeys sweep
(decides when to /compact a chat), token-awareness, and zulu-advisory-inject. On any
transcript >256KB past its last compact marker it returned found=false and counted
the WHOLE on-disk jsonl as post-compact -> always-critical. Measured live: a 68.5MB
transcript -> 20.5M tokens -> critical regardless of real context fill. So the sweep
over-reported (would /compact chats that did not need it) and zulu-advisory could
never be wired (it would fire /compact on nearly every prompt).

Root cause: readTranscriptBytes large-file path read ONLY the last 256KB
(COMPACT_TAIL_SCAN_BYTES) for the "isCompactSummary":true marker; a chat that
compacted then did >256KB of work pushed the marker out of that window.

Fix:
- Two-tier escalation: fast 256KB tail (common fresh-compact case) -> bounded 16MB
  escalation (LARGE_SCAN_BUDGET_BYTES) ONLY on a tail miss -> over-estimate fallback
  only for genuinely-huge (>16MB post-compact) spans (which ARE correctly critical).
  One fd, bounded memory, escalation read only when needed.
- findLastCompactOffsetInBuffer rewritten to Buffer byte-ops (lastIndexOf/indexOf)
  vs toString().lastIndexOf -- fixes a latent char-index-vs-byte-offset drift that is
  negligible on a 256KB ASCII tail but real over the 16MB window.
- 4 R9 tests (synthetic _io, no live-transcript self-pollution): tier-2 finds a marker
  2MB back the tail misses; tier-3 bounded over-estimate beyond budget; tier-1 no
  needless escalation; byte-accurate offset across multibyte UTF-8. 30/30 pass (all 4
  FAIL on pre-fix code).
- Live fs validation (synthetic 6.5MB transcript, marker 6MB back, 0.5MB post-compact):
  pre-fix found:false/critical/6.5MB -> post-fix found:true/clean/0.50MB/149796 tokens.

Unblocks wiring zulu-advisory-inject (its accuracy gate, commit 9a598c52c7).
```

## Files touched (3)
- scripts/lib/chat-token-watch.mjs      | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++------------------
- scripts/lib/chat-token-watch.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 125 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d257350cf3a4`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ORCHESTRATOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._