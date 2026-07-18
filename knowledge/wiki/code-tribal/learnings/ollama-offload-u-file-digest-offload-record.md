# OLLAMA-OFFLOAD/U-FILE-DIGEST-OFFLOAD-RECORD — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-FILE-DIGEST-OFFLOAD-RECORD (slot:alpha): record the verified file-digest as a visible off-Claude offload

**Commit:** `b46945b8c377` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T13:39:03-05:00
**Tags:** ollama-offload, u-file-digest-offload-record, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-FILE-DIGEST-OFFLOAD-RECORD (slot:alpha): record the verified file-digest as a visible off-Claude offload

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-FILE-DIGEST-OFFLOAD-RECORD (slot:alpha): record the verified file-digest as a visible off-Claude offload

ollama-file-digest.mjs (the "headline free-token lever" -- verified line-anchored digest) recorded NOTHING to offload-stats, so its $0-Claude offloads were 100% invisible to every utilization measurement, and the large-read-digest advisory-decay gate could never see a conversion (could wrongly suppress a working nudge). Adds exported fail-safe recordFileDigestOffload (atomic RMW, never creates the file, never throws -- mirrors recordTieredUsage R11) bumping byHook["ollama-file-digest"] {fired,offloaded>0,tokensSaved}; the dashboard live-byHook scan auto-recognizes an offloaded>0 bucket as a real off-Claude run. Called from CLI main() ONLY on a verified ollama run (source==ollama && verified && !fellBack), tokensSaved = rawFileTokens - digestTokens (floored 0). R7: deliberately does NOT bump the ask-ollama-scoped executedOffloads (a file-digest runs via callOllamaOnce, a distinct lane). +4 R9 tests (fold + executedOffloads-untouched + missing-file + garbage + NaN/neg floor). file-digest 20/20, both parse. Live-shape validation on a COPY of real stats: bucket undefined -> {fired:1,offloaded:1,tokensSaved:1234}. 2-arm scrutiny BOTH PASS (0 findings).
```

## Files touched (3)
- scripts/ollama-file-digest.mjs      | 57 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/ollama-file-digest.test.mjs | 59 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 114 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- tilization measurement, and the large-read-digest advisory-decay gate could never see a conversion (could wrongly suppress a working nudge). Adds exported fail-safe recordFileDigestOffload (atomic RMW, never creates the file, never throws -- mirrors recordTieredUsage R11) bumping byHook["ollama-file-digest"] {fired,offloaded>0,tokensSaved}; the dashboard live-byHook scan auto-recognizes an offloaded>

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b46945b8c377`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._