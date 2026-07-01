# FLEET-REAPER-MS3/U-FR-MS3-C — [MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-C: per-chat-tree compact advisory

**Commit:** `51b2d04a10dd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T21:31:52-05:00
**Tags:** fleet-reaper-ms3, u-fr-ms3-c, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-C: per-chat-tree compact advisory

## Body
```
[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-C: per-chat-tree compact advisory

Fires when a SINGLE chat's claude.exe tree exceeds the per-chat threshold
(default 2 GB) BEFORE system-wide critical, naming WHICH slot to /compact.
Complementary to (not replacement of) the existing critical-memory-compact-
nudge — the latter requires system-wide critical first; this fires per-tree.

evaluateChatTreeAdvisories is pure (env/ledger/nowMs/perTree injected):
- Cooldown 30-min default per (slot, "per-chat-threshold")
- CLEAR-ON-DROP semantic: chat that emitted then dropped below threshold
  then re-bloated fires fresh advisory immediately (reason:"drop-clear")
- Tree-with-no-slot falls back to `tree-<PID>` (MS1 graceful degradation)
- Threshold knob clamped [256, 16384] MB; cooldown clamped [60, 86400] sec
- Audit log: JSONL append-only at state/shared/.fleet-memory-chat-advisories.jsonl,
  rotated at 1 MB → .1 backup

Wiring in runOnce: reads chatAdv ledger; calls evaluateChatTreeAdvisories;
appends sweep record (always when ledger has history — needed for drop-detection
chain); emits one AGENT_CHAT.jsonl record per advisory with kind="per-chat-advisory".
Gated on !dryRun && !noAdvisory; LEGACY PARITY preserved.

Files:
- scripts/fleet-memory-monitor.mjs (+constants, +readChatAdvisoryLedger,
  +appendChatAdvisorySweepRecord, +evaluateChatTreeAdvisories, runOnce wiring)
- scripts/__tests__/fleet-memory-monitor-chat-advisory.test.mjs (new, 16 cases,
  incl. REAL-DATA E2E spanning 4 sweeps: emit→cooldown-suppress→drop→re-emit
  against a real tmpdir ledger file)

Knobs: PRISM_FM_CHAT_ADVISORY_DISABLE=1 (kill switch) ·
  PRISM_FM_CHAT_THRESHOLD_MB (256..16384, default 2048) ·
  PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC (60..86400, default 1800)

Tests: 61/61 PASS (45 pre-existing fleet-memory-monitor + 16 new).
Per-file scrutiny: 2 reviewers PASS/PASS, 0 P0/P1.

Spec: state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md §U-FR-MS3-C
```

## Files touched (3)
- .../fleet-memory-monitor-chat-advisory.test.mjs    | 318 +++++++++++++++++++++
- scripts/fleet-memory-monitor.mjs                   | 209 +++++++++++++-
- 2 files changed, 525 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 51b2d04a10dd`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._