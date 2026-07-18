# RGS-TOOL-AUTOINVOKE-MS0/U-SURFACE — [MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SURFACE: fold tool-plan surfacing into pick-prefresh-inject (no new hook)

**Commit:** `d967c701effe` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T00:18:17-05:00
**Tags:** rgs-tool-autoinvoke-ms0, u-surface, auto-distilled

## Subject
[MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SURFACE: fold tool-plan surfacing into pick-prefresh-inject (no new hook)

## Body
```
[MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-SURFACE: fold tool-plan surfacing into pick-prefresh-inject (no new hook)

- Extend TRIGGER_RX to match /rgs continue and /continue-roadmap
- /loop only triggers tool-plan injection when a MS::unit id token is present (bare /loop = fast path)
- Add loadSidecar() with module-level mtime cache (avoids re-parsing on repeated calls)
- Add loadToolPlan(unitKey) — reads PRISM_RGS_SIDECAR_PATH sidecar, returns plans[key] or null
- Add extractUnitKey(prompt) — matches MS::UNIT composite keys; bare U-... ids gracefully skipped
- Add buildToolPlanSection() — pipelines/skills/tribal/agents/mcpTools/buildVsIntegrate/complexityTier/rationale/source
- Stale detection: sidecar age >7 days OR entry.stale===true → prefix block with ⚠ STALE PLAN warning
- appendPickedEvent() — always appends {v:1,ts,unitKey,sid,predictedPipelines,event:"picked"} to JSONL; stale-on-pickup event added when stale
- PRISM_RGS_TOOL_PLAN_INJECT=0 knob disables tool-plan section (existing prefresh output unchanged)
- PRISM_RGS_SIDECAR_PATH / PRISM_RGS_PICKED_PATH env overrides for testing
- Single combined additionalContext block (no second hookSpecificOutput emission)
- All existing fast-path + non-trigger behavior byte-unchanged
- 15/15 new node:test cases pass; all existing node:test hook suites unaffected

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../__tests__/pick-prefresh-tool-plan.test.mjs     | 318 +++++++++++++++++++++
- .claude/hooks/pick-prefresh-inject.mjs             | 197 ++++++++++++-
- 2 files changed, 510 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d967c701effe`
- Milestone envelope: `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._