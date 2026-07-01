# HOTEL-TRANSCRIPT-MINE/U-MINE-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-TRANSCRIPT-MINE]/U-MINE-SCRUTINY-FIX (slot:hotel): close reviewer P0+3xP1 on the transcript miner

**Commit:** `61518eb98827` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:05:04-05:00
**Tags:** hotel-transcript-mine, u-mine-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-TRANSCRIPT-MINE]/U-MINE-SCRUTINY-FIX (slot:hotel): close reviewer P0+3xP1 on the transcript miner

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-TRANSCRIPT-MINE]/U-MINE-SCRUTINY-FIX (slot:hotel): close reviewer P0+3xP1 on the transcript miner

Single-reviewer correctness pass returned FAIL; all 4 findings fixed (R12 - don't ship a FAIL):
- P0 silent-data-loss: ollama() now THROWS on an empty 200-OK response instead of pushing an empty
  map summary into a confident "mined" digest that skip-if-exists resume treats as complete. Fail-loud
  -> no file written -> re-mined next run. (Live run never hit it; a reaper SIGKILL never reaches
  writeFileSync, so only the whole-process-kill resume path was exercised.)
- P1 isNoise over-filter: replaced free includes("hook additional context") (dropped real assistant
  prose merely MENTIONING the phrase) with ANCHORED start-prefix checks. Verified: b5de5424 spine
  49KB -> 68KB (19KB more real content retained).
- P1 isNoise under-filter: also drops <command-message>/<command-name>/<command-args>/
  <task-notification>/<local-command-stdout> chrome + anchored hook-injection headers.
- P1 _COMBINED stale glob: built from THIS run's non-error results, not a blind disk glob; header now
  reports "N of M sessions".
Validated: --force re-run mines clean, node --check passes, all 5 digest section headers retained.
```

## Files touched (4)
- scripts/mine-hotel-transcripts.mjs                |  45 ++++++++++++---
- state/shared/hotel-transcript-mining/_COMBINED.md | 240 ++++++++++++++++++++++++++++++++++++++++----------------------------------------
- state/shared/hotel-transcript-mining/b5de5424.md  |  43 +++++++--------
- 3 files changed, 175 insertions(+), 153 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 61518eb98827`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-TRANSCRIPT-MINE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._