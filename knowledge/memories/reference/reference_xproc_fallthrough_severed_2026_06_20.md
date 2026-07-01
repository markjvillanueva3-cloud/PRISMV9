---
name: reference_xproc_fallthrough_severed_2026_06_20
description: "A PSN-SYNERGY cross-wire insertion severed the xproc switch fall-through chain in aiReasoningDispatcher, silently routing ~120 xproc actions to outcome_trace_record instead of routeXprocAction."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.268Z
aliases: reference_xproc_fallthrough_severed_2026_06_20
---


**Bug (silent regression, fixed 2026-06-20 slot:india, commit U-XPROC-FALLTHROUGH-RESTORE).** `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` routes the whole `xproc_*` CrossProcess-neural fleet via a long block of **bare fall-through `case` labels** that terminate in one shared handler `case "xproc_feedbackbus_reset": { result = await routeXprocAction(action, params); break; }`. Commit `0fd90359de [PSN-SYNERGY]/U-OUTCOME-WIRE` (+ `U-RAG-PSN-AI-WIRE`) inserted NEW `case` bodies (`outcome_trace_record`/`outcome_log`/`outcome_query`/`outcome_stats` + `rag_rerank`) **in the middle of that bare-case chain**. In a JS switch, the first `case` with a body+`break` ABOVE which bare cases stack catches them all — so every xproc case above the insertion (`xproc_episodic_stats`, `xproc_online_constants`, `xproc_drift_constants`, `xproc_ewc_constants`, `xproc_symbolic_violations`, and ~115 others) fell into `outcome_trace_record`'s body and returned `outcomeTraceEngine.record(params)` instead of reaching `routeXprocAction`. Only 5 were test-covered (`AIReasoningDispatcher.tier10-wire.test.ts` 19/24); the other ~115 were silently wrong with no test.

**Fix:** gave the last bare xproc case before the insertion (`xproc_outcome_adapter_reset`) its own terminal `{ result = await routeXprocAction(action, params); break; }` handler (mirroring the sibling at `xproc_feedbackbus_reset`), terminating the upper sub-block correctly. tier10-wire 24/24; 0 new tsc errors.

**Why:** inserting a case-with-body into a region of stacked bare fall-through cases is a silent control-flow regression — the inserted body steals every preceding bare case. The cross-wire author (oscar) had no test for the xproc actions above the insertion, so CI stayed green.

**How to apply:** (1) Before inserting a new `case` body into a large dispatcher switch, check whether the surrounding cases are **bare fall-through** (stacked `case "x":` with no body until a shared handler) — if so, insert AFTER the shared handler's `break`, never mid-chain. (2) A switch that mixes bare-fall-through groups with body-cases is fragile; prefer a route-map (`XPROC_ROUTES`) + a single terminal handler per group. (3) When a cross-wire/delegate touches a shared dispatcher, run the OWNING domain's dispatcher-level wire tests, not just your own. Sibling of [[feedback_audit_consumers_when_moving_logic_into_engine]] (changing shared code without checking all consumers). Cross-domain: india owns prism_ai/xproc; the breakage came from a quoting/outcome cross-wire.
