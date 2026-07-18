# HOTEL/U-TOOL-LIFE-ECON-REPLACE — [MAIN] [HOTEL]/U-TOOL-LIFE-ECON-REPLACE (slot:hotel iter15) [BOOTSTRAP-SLOT-ENFORCE]: G10 close-out — Tool-Life Economic Replacement Formula (per-tool TCO break-even)

**Commit:** `f6a98430f8be` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T17:56:19-05:00
**Tags:** hotel, u-tool-life-econ-replace, auto-distilled

## Subject
[MAIN] [HOTEL]/U-TOOL-LIFE-ECON-REPLACE (slot:hotel iter15) [BOOTSTRAP-SLOT-ENFORCE]: G10 close-out — Tool-Life Economic Replacement Formula (per-tool TCO break-even)

## Body
```
[MAIN] [HOTEL]/U-TOOL-LIFE-ECON-REPLACE (slot:hotel iter15) [BOOTSTRAP-SLOT-ENFORCE]: G10 close-out — Tool-Life Economic Replacement Formula (per-tool TCO break-even)

NEW ALGORITHM: ToolLifeEconomicReplacementFormula.ts (3 surfaces — pure functions, R12 fail-loud, dimensionally consistent)

Closes G10 from the ERP-comparison audit. Sibling to Gilbert 1950 min-cost cutting velocity (already shipped via gilbert-econ-speed-wire); this one is the per-tool economic-life decision — given a tool's purchase price + change-out labor + scrap risk for late changes, at what tool life T* is the next change economically justified?

Surfaces:
- costPerCutMinute(input, t_cut_min) — \$/cut-min = (tool_price/edges + regrind + changeout*(labor+machine)) / T
- economicLife(input, scrap_risk_per_hr, part_value_avg) — closed-form T* = sqrt(2*K_fixed / (lambda*V))
- replacementSchedule(input, ..., actual_lives_min[]) — per-sample TCO + flagging (below/near/above economic)

Hotel-soul: R12 fail-loud, deterministic, dimensional consistency contract, NOT a Kienzle/Taylor physics formula (pure economic optimization — no constants.ts).
Reference: Trent & Wright Metal Cutting 4e Ch.5; Boothroyd & Knight Fundamentals 3e §3.9.

Tests 19/19: components reconcile, 1/T scaling, linear changeout sensitivity, closed-form T* directly verified, comparative statics (higher risk -> shorter T*, higher part value -> shorter T*), flagging at 0.5/1.0/2.0 multiples of T*, R12 throughout.

DISPATCHER WIRING: businessDispatcher.ts (+3 actions + 3 case handlers)
PHONE-APP/PWA WIRING: prismBusiness.ts (+3 typed REST wrappers + 4 result interfaces)

PSN synergy: Algorithms (canonical TCO primitive) + Wiki (Trent/Wright + Boothroyd/Knight refs) + System Viz (3 new dispatcher actions) + PRISM AI (per-tool TCO queryable for cross-domain reasoning).

Closes G10 from 13-gap ERP-comparison audit. Total this /goal session: G1+G8+G9+G10+G11+G12+G13 = 7 of 13 gaps closed via 5 new algorithms (Haversine, Amortization, ReorderPoint, PriceBreak, ABC, ToolLife) + 2 new engines (VendorRegion, RecurringExpense, ARAging — 3 actually) across 4 commits (iter11-15).

ATTRIBUTION NOTE: iter12+13+14 work (10 files, 1825 LOC, 320 tests for Amortization/Recurring/ROP/AR/PriceBreak/ABC) shipped under foxtrot commit a3da9d6c37 due to shared-tree peer-absorption race — see [[feedback_commit_to_slot_worktree]]. Functionality shipped, attribution lost. This iter15 commit recovers attribution for the ToolLife work.
```

## Files touched (5)
- .../ToolLifeEconomicReplacementFormula.test.ts     | 158 ++++++++++++++
- .../ToolLifeEconomicReplacementFormula.ts          | 230 +++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  26 +++
- mcp-server/web/src/api/prismBusiness.ts            |  28 +++
- 4 files changed, 442 insertions(+)

## Lessons surfaced in commit body
- NOTE: iter12+13+14 work (10 files, 1825 LOC, 320 tests for Amortization/Recurring/ROP/AR/PriceBreak/ABC) shipped under foxtrot commit a3da9d6c37 due to shared-tree peer-absorption race — see [[feedback_commit_to_slot_worktree]]. Functionality shipped, attribution lost. This iter15 commit recovers attribution for the ToolLife work.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f6a98430f8be`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._