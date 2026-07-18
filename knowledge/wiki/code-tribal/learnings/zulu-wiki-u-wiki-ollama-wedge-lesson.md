# ZULU-WIKI/U-WIKI-OLLAMA-WEDGE-LESSON — [MAIN-FORCE] [ZULU-WIKI]/U-WIKI-OLLAMA-WEDGE-LESSON (slot:zulu): wiki lesson for the disabled-task-brick + heavy-canary bug classes

**Commit:** `07fe88a06873` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T08:52:08-05:00
**Tags:** zulu-wiki, u-wiki-ollama-wedge-lesson, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-WIKI]/U-WIKI-OLLAMA-WEDGE-LESSON (slot:zulu): wiki lesson for the disabled-task-brick + heavy-canary bug classes

## Body
```
[MAIN-FORCE] [ZULU-WIKI]/U-WIKI-OLLAMA-WEDGE-LESSON (slot:zulu): wiki lesson for the disabled-task-brick + heavy-canary bug classes

Bug-finding->wiki gate close for U-WEDGE-GUARD-AUTOWIRE + U-ZLR-GEN-PROBE-FAST. Two general failure classes: (1) a Stop+Start recovery must Enable a disabled task first or it bricks the service it heals; (2) a liveness canary must use a fast model, not a heavy one (conflates endpoint-alive with heavy-model-resident -> false-alarms on cold start). Cross-links [[reference_zulu_ollama_wedge_selfheal_2026_06_23]] + [[hermes-proxy-silent-degradation-missing-aiohttp-2026-06-23]].
```

## Files touched (2)
- knowledge/wiki/lessons/ollama-wedge-recovery-disabled-task-brick-2026-06-23.md | 32 ++++++++++++++++++++++++++++++++
- 1 file changed, 32 insertions(+)

## Lessons surfaced in commit body
- LESSON (slot:zulu): wiki lesson for the disabled-task-brick + heavy-canary bug classes

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 07fe88a06873`
- Milestone envelope: `mcp-server/data/milestones/ZULU-WIKI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._