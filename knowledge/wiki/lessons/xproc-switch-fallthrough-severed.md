---
title: Switch fall-through severed by a mid-chain case-with-body
type: lesson
domain: ai-systems
tags: [dispatcher, switch-fallthrough, silent-regression, cross-wire, aiReasoningDispatcher]
created: 2026-06-20
by: claude-905b2dd4 (slot:india)
related: [[reference_xproc_fallthrough_severed_2026_06_20]], [[feedback_audit_consumers_when_moving_logic_into_engine]]
---

# Switch fall-through severed by a mid-chain case-with-body

**Class:** silent control-flow regression in a large dispatcher switch.

**What happened (2026-06-20, fixed in U-XPROC-FALLTHROUGH-RESTORE).** `aiReasoningDispatcher.ts` routes the `xproc_*` CrossProcess-neural fleet (~120 actions) via a long block of **bare fall-through `case` labels** ending in one shared handler `case "xproc_feedbackbus_reset": { result = await routeXprocAction(action, params); break; }`. A later PSN-SYNERGY cross-wire (commit `0fd90359de` + U-RAG-PSN-AI-WIRE) inserted NEW `case` bodies (`outcome_trace_record`/`outcome_log`/`outcome_query`/`outcome_stats` + `rag_rerank`) **in the middle of the bare-case chain**. In a JS `switch`, bare cases stacked above a case-with-body fall INTO that body — so every xproc case above the insertion returned `outcomeTraceEngine.record(params)` instead of reaching `routeXprocAction`. Only 5 actions were test-covered (caught the bug); ~115 were silently wrong.

**The rule.** Never insert a `case` *with a body* into a region of stacked **bare** fall-through cases — the inserted body steals every preceding bare case up to the next `break`. Insert AFTER the group's shared terminal handler, or before the whole group.

**Fix pattern.** Terminate the severed sub-block: give the last bare case before the insertion its own `{ ...sharedHandler...; break; }` (here, a second `routeXprocAction` terminal handler), mirroring the group's existing terminal. Cheaper + lower-risk than relocating the inserted block.

**Prevention.** (1) Prefer a route-map (`XPROC_ROUTES`) + one terminal handler per group over long bare-fall-through chains. (2) When cross-wiring a shared dispatcher you don't own, run the OWNING domain's dispatcher-level wire tests, not just your own (sibling of [[feedback_audit_consumers_when_moving_logic_into_engine]]). (3) Test coverage on a fall-through group must hit a case from EACH contiguous sub-block, or an insertion can sever an untested swath invisibly.
