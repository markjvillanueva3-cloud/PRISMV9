# BACKEND-DEVTOOLS-HVA/U-HVA-REWIRE-ITER25 — [MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER25: HookDefinition.event optional field — TSC -14

**Commit:** `76dbac6d8ca8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T19:18:40-05:00
**Tags:** backend-devtools-hva, u-hva-rewire-iter25, auto-distilled

## Subject
[MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER25: HookDefinition.event optional field — TSC -14

## Body
```
[MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER25: HookDefinition.event optional field — TSC -14

CadenceDefinitions hooks (and SpecialtyCadences) carry an `event:` string
(dotted event path, e.g. "phase.post-safety-check") that HookRegistry indexes
via indexByEvent (registries/HookRegistry.ts:821). The HookExecutor type def
had silently dropped this field during a prior migration, leaving 14
TS2353 unknown-property errors across the cadence files.

Fix: add optional `event?: string` to HookExecutor.HookDefinition with
explicit JSDoc that this is advisory metadata for the HookRegistry side
of the registration pipeline, not consumed by HookExecutor itself.
Monotonic — adds optional field, preserves existing data, no behavior
change.

TSC: 1180 -> 1166 (-14). Cumulative session: 1259 -> 1166 (-93).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- mcp-server/src/engines/HookExecutor.ts | 6 ++++++
- 1 file changed, 6 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 76dbac6d8ca8`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEVTOOLS-HVA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._