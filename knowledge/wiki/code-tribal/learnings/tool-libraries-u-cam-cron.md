# TOOL-LIBRARIES/U-CAM-CRON — [MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-CRON (slot:romeo): nightly regen->validate->place cron

**Commit:** `609884ecc6e2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:04:01-05:00
**Tags:** tool-libraries, u-cam-cron, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-CRON (slot:romeo): nightly regen->validate->place cron

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-CRON (slot:romeo): nightly regen->validate->place cron

Iter 7 -- the operator's requested 'cron'. Closes the self-maintaining loop: a Windows scheduled
task runs the libraries fresh into the seats every night, deterministically (no Claude tokens).

- scripts/cam-tool-library-cron.mjs: orchestrator chaining the harness (emit+validate all 3
  formats) -> placement (deliver into seats) ONLY when every library validates; appends one
  JSONL audit line per run; exits non-zero on any failure so the scheduler surfaces a bad night.
- .claude/helpers/install-cam-tool-library-cron.ps1: registers 'PRISM CAM Tool Library Regen'
  (daily 03:17, user-level/no-elevation, idempotent -Force, 30-min limit, --experimental-sqlite
  for the .hmt build). Script + node live on H:/ (NOT %TEMP% -- avoids the 0xFFFD0000 cron-temp
  failure mode, [[reference_cron_temp_path_failure_2026_06_11]]).
- VERIFIED LIVE: task registered + run-once -> LastTaskResult=0; CRON-LOG ok=true valid=true,
  61,246 tools regenerated + placed (61,246 built into .hmt).
- No duplicate: distinct from the Claude-driven autonomous JM-CAM build-loop crons (different
  mechanism + JM-crib scope). Tests: cron 3/3 + self-test 5/5.
```

## Files touched (5)
- .claude/helpers/install-cam-tool-library-cron.ps1 | 39 ++++++++++++++++++++
- scripts/cam-tool-library-cron.mjs                 | 90 +++++++++++++++++++++++++++++++++++++++++++++
- scripts/cam-tool-library-cron.test.mjs            | 35 ++++++++++++++++++
- state/shared/tool-libraries/.gitignore            |  2 +
- 4 files changed, 166 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 609884ecc6e2`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._