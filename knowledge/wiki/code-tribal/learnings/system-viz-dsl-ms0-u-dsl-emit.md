# SYSTEM-VIZ-DSL-MS0/U-DSL-EMIT — surface shortcodes in master-index hits

**Commit:** `ed5bda2c834b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T19:44:34-05:00
**Tags:** system-viz-dsl-ms0, u-dsl-emit, auto-distilled

## Subject
[SYSTEM-VIZ-DSL-MS0]/U-DSL-EMIT: surface shortcodes in master-index hits

## Body
```
[SYSTEM-VIZ-DSL-MS0]/U-DSL-EMIT: surface shortcodes in master-index hits

Wires CODE_SYSTEM_INDEX.json reverse-lookup into master-index-precheck-inject.mjs (UserPromptSubmit T2). Every hit whose label matches a known shortcode gets a [PREFIX####] prefix in the emitted reminder, so cross-references in prompts are 50-80% token-cheaper.

Token efficiency demonstration:
  before: '• [L13/built] WiringBatchExecutorEngine (5 tokens)'
  after:  '• [L13/built] [GH0038] WiringBatchExecutorEngine (~7 tokens but reusable as GH0038 downstream)'

Verified resolves for new categories:
  - WiringBatchExecutorEngine → GH0038 (L13 ghost)
  - checkin → SK0043 (skill)
  - aabb_overlap → AC0001 (action)

E/D/A/S/H/U/V/SV/T/C/R/M (file-tree categories) use path-keyed reverse map — those resolve via dispatcher_map_compact, not by class name. Not a regression — same as v2.0.0 behavior.

Architecture:
  - mtime-cached read of CODE_SYSTEM_INDEX.json (~600KB)
  - peer regen via regen-dsl-shortcodes.mjs invalidates cache automatically
  - kill-switch: PRISM_MASTER_INDEX_DSL_EMIT=0
  - fail-safe: index missing/corrupt → silently falls back to no-prefix
  - additive: existing hit shape preserved, prefix is opt-in via label match

Closes the visible-value gap from U-DSL-EXTEND + U-DSL-SUPP-EXTRACT (4,180 + 8,592 = 12,772 codes now reachable via reverse-lookup in every prompt).
```

## Files touched (2)
- .claude/hooks/master-index-precheck-inject.mjs | 31 ++++++++++++++++++++++++--
- 1 file changed, 29 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed5bda2c834b`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-DSL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._