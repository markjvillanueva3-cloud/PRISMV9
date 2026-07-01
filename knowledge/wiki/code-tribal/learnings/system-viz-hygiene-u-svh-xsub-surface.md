# SYSTEM-VIZ-HYGIENE/U-SVH-XSUB-SURFACE — [MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-XSUB-SURFACE (slot:sierra): surface A3 embeds-degradation sidecar in the sierra graph-health inject (close the write-only/silent loop)

**Commit:** `8d5a8cac193f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T16:55:45-05:00
**Tags:** system-viz-hygiene, u-svh-xsub-surface, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-XSUB-SURFACE (slot:sierra): surface A3 embeds-degradation sidecar in the sierra graph-health inject (close the write-only/silent loop)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-XSUB-SURFACE (slot:sierra): surface A3 embeds-degradation sidecar in the sierra graph-health inject (close the write-only/silent loop)

The A3 cross-substrate-warnings.json sidecar (cf676916ec) had ZERO consumers -- itself silent. Add pure exported formatEmbedsWarning() + a sibling surface block in renderBlock (parity with the cross-substrate-drift block) so the sierra per-prompt graph-health header shows embeds-edge-type collapse. Shared SURFACE_WINDOW_MS (24h half-open). main() entrypoint-guarded so the hook is importable by its test. 12 tests (7 pure helper + 5 E2E through the real hook via stdin). 2-agent scrutiny PASS 0 P0/P1. Live-validated vs the real sierra binding (763MB GREEN regen; embeds-DEGRADED rendered embedsEdges=0 oracleLoaded=no).
```

## Files touched (3)
- .claude/hooks/sierra-graph-health-inject.mjs      |  45 +++++++++++++++++++++++++++++++++++++++--
- .claude/hooks/sierra-graph-health-inject.test.mjs | 142 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 185 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8d5a8cac193f`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._