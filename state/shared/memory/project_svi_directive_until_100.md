---
name: SVI Directive Until Psi=100%
description: SVI and Psi are standing metrics. Auto-refreshed at SessionStart + PreCompact via svi-refresh.mjs. Current Psi=97.7%.
type: project
---

Until **Psi (reachability) = 100%**, treat SVI and Psi as core operating metrics.

## Current Values (as of 2026-04-02)
- SVI: ~3.0 × 10^45
- Psi: 97.7%
- Trend: growing
- **2026-04-01 AUDIT**: 20-agent audit verified actual wiring across all 14 subsystems. WIRED_PCT values updated from stale estimates to audit-verified values. Key corrections: tools 40%→98% (49+ actions covering all 95K tools), machines 60%→95% (69 machine actions), strategies 50%→90% (52 strategy actions), tribal tips 30%→80% (search+indexing). Pipeline reach also updated (PrintToProgram 90%→94%, EDM 38%→72%, QuoteToShip 51%→72%).
- **2026-04-02**: SCIMATH-MS0 complete. 12 new calcDispatcher actions, 12 formulas registered (NUMERICAL category F-NUM-001..012, total 511), 4 algorithm entries added. FormulaRegistry now 28 categories.

## Auto-Refresh (deployed 2026-03-30)
SVI now auto-refreshes via `svi-refresh.mjs` at:
- **SessionStart**: fresh counts before /startup reads them
- **PreCompact**: capture latest state before compacting

This replaced the MCP-server-only auto-watch (which required the server process to be running). The standalone helper scans files directly and writes SVI.json + SVI-compact.md.

## Live Sources
- `H:/prism/state/shared/SVI.json`
- `H:/prism/state/shared/SVI-compact.md`
- `H:/prism/state/shared/SVI-watch-status.json`

## Rules
- Prefer decisions that increase Psi by wiring systems together
- Treat coverage alerts as immediate follow-up work
- New registries, engines, dispatchers, routes are automatic SVI watch targets
- Avoid work that hides or fragments reachability problems

## Stop Condition
This directive stays active until Psi reaches 100% or user explicitly replaces it.

**Why:** Psi measures how much of PRISM's variability space is actually reachable. At 97.7%, the remaining 2.3% is: ~2% corrupt tool records, tribal tip indexing gaps, and ~152 internal helper engines.

**How to apply:** Check SVI-compact.md at session start. After adding engines/dispatchers, verify Psi didn't regress.

## Remaining 2.3% Gap (22,817 units)
- Tools (~19K): ~2% of 95,608 catalog has corrupt/empty records needing data cleanup
- Tribal Tips (~1.5K): 20% of tips need deeper machine/material/operation indexing (U-TK0 in progress)
- Engines (~456): ~12% are internal sub-engines called by wired engines (not user-facing orphans)
- All others (~1.7K): diminishing returns across formulas, algorithms, strategies, handbooks
