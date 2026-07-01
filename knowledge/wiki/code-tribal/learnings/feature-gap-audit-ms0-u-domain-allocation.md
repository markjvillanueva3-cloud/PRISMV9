# FEATURE-GAP-AUDIT-MS0/U-DOMAIN-ALLOCATION — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-DOMAIN-ALLOCATION: forge-audit-v2 + 12-chat domain re-allocation

**Commit:** `b72faff96d58` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T15:50:33-05:00
**Tags:** feature-gap-audit-ms0, u-domain-allocation, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-DOMAIN-ALLOCATION: forge-audit-v2 + 12-chat domain re-allocation

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-DOMAIN-ALLOCATION: forge-audit-v2 + 12-chat domain re-allocation

Work order: /forge-audit-v2 to find unplanned features, then break PRISM tasks
into 12 chats by domain (each chat owns one PRISM system domain).

forge-audit-v2: 6 parallel agents scanned specs, handoffs, unwired engines, the
v8.89 extracted/ monolith (895 files file-by-file), Resources/ (164K files), and
JM DIE/ (174K files). Headline gap: 674 unwired engines, ~595 absent from any
roadmap (lathe 77, wire 73, misc 328); plus the monolith's digest=0 features
(CAD geometry kernel, CAM toolpath primitives, ERP subsystem, 220-courses
academy, 2500-alarm controller DB). 64 curated gap units captured in
FEATURE-GAP-UNITS-2026-05-17.json.

allocate-domains-to-slots.mjs: keyword-classifies every ROADMAP-CONSOLIDATED
unit (cam rule ordered before mill — HYPERMILL contains MILL) + merges the gap
units (wave:GAP, lead each queue) -> re-keys slot-task-queues.json into a domain
partition. 3235 units across 13 domain slots: alpha=mill bravo=lathe
charlie=wire delta=cad echo=cam foxtrot=tribal hotel=erp india=post
juliett=speedfeed kilo=print2prog lima=academy mike=misc golf=database.
Atomic, advisory, preserves all non-queues top-level keys.

Per-file 2-reviewer gate on the allocator: PASS/PASS. Audit doc MD+HTML.
4-surface doc reflection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (8)
- CLAUDE.md                                          |     2 +
- .../wiki/architecture/per-slot-rgs-allocation.md   |    28 +
- scripts/allocate-domains-to-slots.mjs              |   226 +
- state/shared/slot-task-queues.json                 | 35870 ++++++++++++++++++-
- .../shared/specs/FEATURE-GAP-AUDIT-2026-05-17.html |   169 +
- state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.md |   141 +
- .../shared/specs/FEATURE-GAP-UNITS-2026-05-17.json |    76 +
- 7 files changed, 35678 insertions(+), 834 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b72faff96d58`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._