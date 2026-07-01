# FLEET-TASK-HEALTH/U-FTH-WIKI-LESSON — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-FTH-WIKI-LESSON (slot:golf): compound the cry-wolf→marker fix into the wiki

**Commit:** `7f19be6b91ec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:05:17-05:00
**Tags:** fleet-task-health, u-fth-wiki-lesson, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-FTH-WIKI-LESSON (slot:golf): compound the cry-wolf→marker fix into the wiki

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-FTH-WIKI-LESSON (slot:golf): compound the cry-wolf→marker fix into the wiki

Companion wiki lesson for 4141daf9d8 (U-FTH-MIGRATION-FREEZE-MARKER), satisfying
the bug-finding→wiki gate doctrine ([[feedback_always_update_wiki_on_bug_finding]]).
Captures the reusable pattern — a watchdog tolerating a temporary/broad/fluctuating
expected-bad state must gate on a MARKER (one operator flag), not an enumerated
list (which drifts the moment the set moves or the state ends), and must NEVER let
the marker excuse load-bearing items. Also records the R8 self-catch (built the
static-list first pass before reading the investigation memory that already said
static-list is wrong).

Serves the goal's wiki+tribal-knowledge surface: knowledge/wiki/lessons/, sibling
to fleet-task-health-discovery-drift + fleet-task-health-recovery; semantic recall
already indexes it (cosine 0.74).
```

## Files touched (2)
- knowledge/wiki/lessons/fleet-task-health-cry-wolf-migration-marker.md | 75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 75 insertions(+)

## Lessons surfaced in commit body
- LESSON (slot:golf): compound the cry-wolf→marker fix into the wiki
- lesson for 4141daf9d8 (U-FTH-MIGRATION-FREEZE-MARKER), satisfying
- wrong).
- lessons/, sibling

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7f19be6b91ec`
- Milestone envelope: `mcp-server/data/milestones/FLEET-TASK-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._