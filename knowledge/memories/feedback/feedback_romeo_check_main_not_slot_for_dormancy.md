---
name: feedback_romeo_check_main_not_slot_for_dormancy
description: "ROMEO (wiring slot) must check engine dormancy against MAIN (cad-fusion-live-ms0), NOT the stale slot/romeo branch"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_romeo_check_main_not_slot_for_dormancy
---


The `slot/romeo` branch is **~3000 commits behind** `cad-fusion-live-ms0` (MAIN). Grepping the **slot worktree** (`H:/prism-slot-romeo`) for `dispatcher refs == 0` gives a FALSE "dormant" signal — an engine can be unwired on stale slot/romeo yet already wired on MAIN.

**Why:** when wiring dormant engines, I checked `H:/prism-slot-romeo/mcp-server/src/tools/dispatchers/` (stale). Three engines showed 0 refs there but were ALREADY wired on MAIN: `LatheProgrammingStyleSelectorEngine` (turningDispatcher `lathe_style_selector_select`→`.selectStyle`), `SwissTypeCollisionEngine` (safetyDispatcher), `SwissTypeIntelligenceEngine` (turningDispatcher) — all as BROKEN stubs (`?? {note: "method not callable"}`, or calling non-existent methods). My slot/romeo re-wires of those 3 were redundant (though functionally superior to the stubs). 6 others (ERPImport, Subprog, Measure, SwissDecide, Turret, BarRemnant) were genuinely 0-ref on MAIN → valid wires. Discovered 2026-06-11 via `memory-relevance-inject` surfacing [[reference_lathe_100pct_wired_2026_05_23]].

**How to apply:** BEFORE wiring any engine on slot/romeo, verify dormancy against **MAIN** — `grep -rln "<EngineName>\b" H:/prism/mcp-server/src/tools/dispatchers/`. 0 refs on MAIN = genuinely dormant (wire it). ≥1 ref on MAIN = already wired (even if a broken stub) → do NOT re-wire on stale slot/romeo (it collides at merge); a stub fix belongs on a fresh-from-MAIN branch, not the 3000-behind slot. Pairs with R8 (read before write) + the duplication guard. Related: [[feedback_romeo_commit_to_slot_branch]] · [[feedback_dont_wire_for_wiring_sake]].
