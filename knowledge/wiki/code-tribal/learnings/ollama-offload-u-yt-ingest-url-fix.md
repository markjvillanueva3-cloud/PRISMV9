# OLLAMA-OFFLOAD/U-YT-INGEST-URL-FIX — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-YT-INGEST-URL-FIX (slot:zulu): tribal engine ingest was silently DEAD on Windows since ship -- raw absolute path in dynamic import

**Commit:** `35d074884d7a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:31:42-05:00
**Tags:** ollama-offload, u-yt-ingest-url-fix, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-YT-INGEST-URL-FIX (slot:zulu): tribal engine ingest was silently DEAD on Windows since ship -- raw absolute path in dynamic import

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-YT-INGEST-URL-FIX (slot:zulu): tribal engine ingest was silently DEAD on Windows since ship -- raw absolute path in dynamic import

ROOT CAUSE (surfaced by the first promote-youtube-staged --apply):
ingestTips() in youtube-free-extract.mjs dynamic-imported
TribalKnowledgeEngine via import(resolve(...)) -- a raw 'H:\...' path the
Windows ESM loader REJECTS ('Received protocol h:'). Every in-process
ingest since 2026-05-26 failed into the fallback-JSON path SILENTLY
(victor's 12:59 artifact today included). fix: pathToFileURL().href at
BOTH import sites + source-pin regression test (fails if either site
regresses to a raw resolve()).

VALIDATED LIVE: re-ran promote --apply -- promoted=24 videos,
tipsIngested=262 (TribalKnowledge auto-categorized), failed=0, ledger
complete. The 17-day stranded backlog (tramming/chip-thinning/trochoidal/
workholding/5-axis tips) is now in the tribal store + per-video wiki.
59/59 suite. Lesson (fail-loud doctrine): a catch->fallback that 'works'
can mask a 100%-failure primary path for weeks -- the attended promotion
lane exposed it on first use.
```

## Files touched (3)
- scripts/youtube-free-extract.mjs      | 10 +++++++---
- scripts/youtube-free-extract.test.mjs | 17 +++++++++++++++++
- 2 files changed, 24 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- Lesson (fail-loud doctrine): a catch->fallback that 'works'

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35d074884d7a`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._