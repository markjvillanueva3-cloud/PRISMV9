# TSC-FIX/U-TSC-CAM-UNKNOWN-BRIDGE — [MAIN] [TSC-FIX]/U-TSC-CAM-UNKNOWN-BRIDGE: unknown-bridge for 10 WEDM safety-gate engine calls (-10 TS2345)

**Commit:** `86a06e8e3724` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:25:17-05:00
**Tags:** tsc-fix, u-tsc-cam-unknown-bridge, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-CAM-UNKNOWN-BRIDGE: unknown-bridge for 10 WEDM safety-gate engine calls (-10 TS2345)

## Body
```
[MAIN] [TSC-FIX]/U-TSC-CAM-UNKNOWN-BRIDGE: unknown-bridge for 10 WEDM safety-gate engine calls (-10 TS2345)

camDispatcher L6680-6740: ten WEDM safety-gate engine calls
(WEDMUnitTagGate, WEDMHeadClearance, WEDMFlushAdequacy,
WEDMThermalRelease, WEDMControllerDialectVerifier) were passing
the dispatcher's Record<string,any> params directly to engines
that take structurally-typed Input interfaces — TS2345 ten times.

The canonical PRISM unknown-bridge pattern (per CLAUDE.md Recent
regressions log, e.g. commit ce873f7e2 "4 discriminated-union
narrowings", f28fce374 "unknown-bridge for LatheOptimizationConstraints"):
  result = eng.method(params as unknown as Parameters<typeof eng.method>[0]);

Runtime validation runs upstream via validateActionParams() against
the action's Zod schema, so the cast is safe at every call site.

Comment block added above the first cluster documents the pattern
for future readers.

Errors: 787 -> 777 (-10). camDispatcher 42 -> 32.
esbuild full bundle clean (exit 0).
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/camDispatcher.ts | 24 +++++++++++++----------
- 1 file changed, 14 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86a06e8e3724`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._