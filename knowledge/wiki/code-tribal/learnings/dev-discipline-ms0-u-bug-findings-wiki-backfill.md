# DEV-DISCIPLINE-MS0/U-BUG-FINDINGS-WIKI-BACKFILL — [MAIN] [DEV-DISCIPLINE-MS0]/U-BUG-FINDINGS-WIKI-BACKFILL: dogfood the wiki-gate rule — 3 wiki entries for prior session bug-finding ships

**Commit:** `1539fbc8b223` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:37:33-05:00
**Tags:** dev-discipline-ms0, u-bug-findings-wiki-backfill, auto-distilled

## Subject
[MAIN] [DEV-DISCIPLINE-MS0]/U-BUG-FINDINGS-WIKI-BACKFILL: dogfood the wiki-gate rule — 3 wiki entries for prior session bug-finding ships

## Body
```
[MAIN] [DEV-DISCIPLINE-MS0]/U-BUG-FINDINGS-WIKI-BACKFILL: dogfood the wiki-gate rule — 3 wiki entries for prior session bug-finding ships

Backfills companion knowledge/wiki/lessons/ entries for the three
bug-finding commits earlier in lima session 77971357 that shipped
without wiki coverage — exactly the rot pattern U-BUG-FINDINGS-WIKI-HOOK
just enforced. The new Stop gate would (correctly) flag those commits;
this backfill closes the loop so the gate doesn't dogfood-fire on its
own session.

Entries:
  - knowledge/wiki/lessons/regen-viz-merge-faillod.md
      class: "orchestrators must not continue past failed sub-stage"
      for commit f9dc218d78 (U-REGEN-VIZ-MERGE-FAILLOUD)
      cross-refs: scripts/lib/regen-viz-merge-guard.mjs +
                  reference_u_regen_viz_merge_faillod_2026_05_17

  - knowledge/wiki/lessons/sourcehash-control-byte-doc-drift.md
      class: "spec-vs-code validators MUST use byte-stream reads
              for control-character literals"
      for commit 0bac2d4c2f (U-SOURCEHASH-DOC-ALIGN)
      cross-refs: scripts/rgs-tool-planner.mjs:85 + design.md + punchlist.md

  - knowledge/wiki/lessons/complexity-fallback-cascade.md
      class: "design fallback cascades when a single signal is unreliable"
             + the regex word-boundary trap (\b on truncated stems)
      for commit 3d416cb040 (U-COMPLEXITY-FALLBACK)
      cross-refs: scripts/lib/rgs-complexity.mjs + punchlist.md:29

Each entry follows the schema established in
knowledge/wiki/lessons/bug-findings-wiki-gate.md:
  § Symptom · § Root cause · § Detection · § Prevention ·
  § Prevention check (operational) · § Cross-refs

Memory cross-link via [[bug-findings-wiki-gate]] +
[[reference_u_regen_viz_merge_faillod_2026_05_17]]. Three siblings
also cross-link each other so wiki-precheck-inject picks them up
together when a chat touches related code (regen-viz, rgs-tool-planner,
or any orchestrator-with-pivot-stage pattern).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../wiki/lessons/complexity-fallback-cascade.md    |  75 +++++++++++++++++++++
- knowledge/wiki/lessons/regen-viz-merge-faillod.md  |  62 +++++++++++++++++
- .../lessons/sourcehash-control-byte-doc-drift.md   | Bin 0 -> 4607 bytes
- 3 files changed, 137 insertions(+)

## Lessons surfaced in commit body
- lessons/ entries for the three
- lessons/regen-viz-merge-faillod.md
- lessons/sourcehash-control-byte-doc-drift.md
- lessons/complexity-fallback-cascade.md
- lessons/bug-findings-wiki-gate.md:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1539fbc8b223`
- Milestone envelope: `mcp-server/data/milestones/DEV-DISCIPLINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._