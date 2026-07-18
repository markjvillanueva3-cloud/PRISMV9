# SLOT-DRIFT-FIX-MS1/U-SLOT-HEARTBEAT-FIX — [MAIN] [SLOT-DRIFT-FIX-MS1]/U-SLOT-HEARTBEAT-FIX: root-cause + fix doc — heartbeat-keepalive 8ms timeout typo broke chat-slot heartbeat fleet-wide slot:alpha. Root cause: H:/.claude/settings.json wired heartbeat-keepalive.mjs with timeout: 8 (ms). Hook needs ~500ms. So every fire timed out before heartbeat refresh. For weeks. Symptom: idle chats reclaimed by peer /checkin-<slot> --force after 10min CRASH_TTL_MS. Fix live on PC-A (4 settings.json edits): (1) timeout 8 -> 8000 on existing UserPromptSubmit; (2)+(3)+(4) wire heartbeat-keepalive to SessionStart, PostToolUse, Stop chains. settings.json is per-machine (not git-tracked) — PC-B needs same fix. Verified: my slot heartbeat went from 2h+ stale to fresh-within-tool-call on next PostToolUse. Doc: knowledge/wiki/lessons/heartbeat-keepalive-timeout-typo.md + reference memory.

**Commit:** `1d2678026648` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T15:32:27-05:00
**Tags:** slot-drift-fix-ms1, u-slot-heartbeat-fix, auto-distilled

## Subject
[MAIN] [SLOT-DRIFT-FIX-MS1]/U-SLOT-HEARTBEAT-FIX: root-cause + fix doc — heartbeat-keepalive 8ms timeout typo broke chat-slot heartbeat fleet-wide slot:alpha. Root cause: H:/.claude/settings.json wired heartbeat-keepalive.mjs with timeout: 8 (ms). Hook needs ~500ms. So every fire timed out before heartbeat refresh. For weeks. Symptom: idle chats reclaimed by peer /checkin-<slot> --force after 10min CRASH_TTL_MS. Fix live on PC-A (4 settings.json edits): (1) timeout 8 -> 8000 on existing UserPromptSubmit; (2)+(3)+(4) wire heartbeat-keepalive to SessionStart, PostToolUse, Stop chains. settings.json is per-machine (not git-tracked) — PC-B needs same fix. Verified: my slot heartbeat went from 2h+ stale to fresh-within-tool-call on next PostToolUse. Doc: knowledge/wiki/lessons/heartbeat-keepalive-timeout-typo.md + reference memory.

## Body
```
[MAIN] [SLOT-DRIFT-FIX-MS1]/U-SLOT-HEARTBEAT-FIX: root-cause + fix doc — heartbeat-keepalive 8ms timeout typo broke chat-slot heartbeat fleet-wide slot:alpha. Root cause: H:/.claude/settings.json wired heartbeat-keepalive.mjs with timeout: 8 (ms). Hook needs ~500ms. So every fire timed out before heartbeat refresh. For weeks. Symptom: idle chats reclaimed by peer /checkin-<slot> --force after 10min CRASH_TTL_MS. Fix live on PC-A (4 settings.json edits): (1) timeout 8 -> 8000 on existing UserPromptSubmit; (2)+(3)+(4) wire heartbeat-keepalive to SessionStart, PostToolUse, Stop chains. settings.json is per-machine (not git-tracked) — PC-B needs same fix. Verified: my slot heartbeat went from 2h+ stale to fresh-within-tool-call on next PostToolUse. Doc: knowledge/wiki/lessons/heartbeat-keepalive-timeout-typo.md + reference memory.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- ...ence_heartbeat_keepalive_8ms_typo_2026_05_18.md | 26 +++++++
- .../lessons/heartbeat-keepalive-timeout-typo.md    | 79 ++++++++++++++++++++++
- 2 files changed, 105 insertions(+)

## Lessons surfaced in commit body
- lessons/heartbeat-keepalive-timeout-typo.md + reference memory.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1d2678026648`
- Milestone envelope: `mcp-server/data/milestones/SLOT-DRIFT-FIX-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._