# MCP-RELIABILITY/U-MCP-HARDEN-P2-1 — [MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-P2-1 (slot:golf): slimResponse depth guard now fires at the 4 calcDispatcher SlimLevel sites

**Commit:** `5181350fd756` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T13:25:31-05:00
**Tags:** mcp-reliability, u-mcp-harden-p2-1, auto-distilled

## Subject
[MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-P2-1 (slot:golf): slimResponse depth guard now fires at the 4 calcDispatcher SlimLevel sites

## Body
```
[MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-P2-1 (slot:golf): slimResponse depth guard now fires at the 4 calcDispatcher SlimLevel sites

Scrutiny arm-B P2-1: the 4 calcDispatcher call sites pass getSlimLevel(pressurePct)
(a SlimLevel STRING) in the new maxDepth slot, so `depth >= "L2"` was a NaN-compare
(always false) -> the stack-overflow guard was silently inert on the busiest dispatcher.
Fix: type maxDepth as `number | SlimLevel` and coerce any non-finite value to the default
32 (`cap`). Numeric callers unchanged; the 4 string callers now get an active guard and
type-clean call sites. +2 tests (circular ref under "L2" must not overflow; "L4" must not
alter normal slimming). 8/8 responseSlimmer tests pass.
```

## Files touched (3)
- mcp-server/src/__tests__/responseSlimmer-depth-guard.test.ts | 14 ++++++++++++++
- mcp-server/src/utils/responseSlimmer.ts                      | 14 ++++++++++----
- 2 files changed, 24 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5181350fd756`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._