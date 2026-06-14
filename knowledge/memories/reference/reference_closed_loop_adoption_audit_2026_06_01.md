---
name: reference_closed_loop_adoption_audit_2026_06_01
description: "AI-SYSTEMS-SWEEP Unit 5: scripts/closed-loop-adoption-audit.mjs — the india-owned 12-row YES/NO matrix of which domain galaxies actually FEED the ai-training closed loop (audited vs AI-TRAINING-ACCESS.md). HONEST result = 3/12 (mill/lathe/wedm only, via emitP2POutcome). Detection is EMIT-ANCHORED, not bare-literal (a 9/12 false-green was caught + fixed in scrutiny). Commit 30df606a87."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.067Z
aliases: reference_closed_loop_adoption_audit_2026_06_01
---


**Shipped (slot india, 2026-06-01, AI-SYSTEMS-IMPROVEMENT-SWEEP Unit 5 "ADOPT-AUDIT"; commit `30df606a87` on slot/india):** `scripts/closed-loop-adoption-audit.mjs` (+ `.test.mjs`, 10/10 node:test) — the measurement substrate that makes closed-loop adoption honestly visible across all 12 domain galaxies. Parses the per-slot table in `state/shared/AI-TRAINING-ACCESS.md`, maps each card domain to its `OutcomeDomain` enum + prescribed feed mechanism, statically scans `mcp-server/src` for WIRED feed call sites, emits `state/shared/dashboards/closed-loop-adoption-audit.{json,md}` (advisory).

**Honest result: 3/12 wired (25%).** Only **mill / lathe / wedm** genuinely feed the loop — via `emitP2POutcome({domain:...})` in the print-to-program engines (`MillingPrintToProgramEngine:2134`, `TurningPrintToProgramEngine:1782`, `WEDMPrintToProgramEngine:988`). The other **9 are genuine gaps** (cad, cam, quoting, business/ERP, post-processor, speed-feed, academy, system-viz, blueprint-vision) — the punch list each owning slot wires per AI-TRAINING-ACCESS.md (AI-T7: india owns the loop, domains wire IN).

**The real feed surface (ground truth, for any future closed-loop work):**
- capture_bus emit verbs: `emitP2POutcome(` (the 6 print-to-program engines: mill/lathe/wedm/sinker_edm/laser/waterjet — `mcp-server/src/utils/p2pOutcomeEmission.ts`), `outcomeCaptureBusEngine.record(`, `universalFeedbackCommandEngine.record*(` (exposed generically via `prism_dev`/devDispatcher.ts:3163, domain-param plumbing), `publishReasoningOutcome(` (Unit 2, prism_ai → domain "other").
- There are **no** direct `outcomeCaptureBusEngine.record` calls outside definitions; all capture_bus feeds go through `emitP2POutcome` or the print-to-program engines.

**Scrutiny-caught P0 (both reviewers FAILed v1):** the first draft used a bare `domain:"<enum>"` co-location heuristic → false-greened cad/cam (matched type-unions, routing tables `{match:/cam/, domain:"cam"}`, and `parameterDomain:"cad"` via the `/i` flag) → inflated headline to **9/12**. An audit reporting adoption its evidence doesn't support violates R12 (worse than useless — it'd hide the real gap). **Fix (schemaVersion 2.0.0):** EMIT-ANCHORED detection — `buildDetectRegex` requires a real feed verb co-located (≤400 chars, either order) with the domain/slot tag, CASE-SENSITIVE (kills `parameterDomain`/`Domain:` collisions) + `(?<![A-Za-z])` boundary, with verb-definition + `/tools/dispatchers/` + `/schemas/` files excluded (so a producer-side action definition is never mistaken for a consumer feed). Load-bearing regression test asserts routing-table/parameterDomain literals do NOT count while real emit feeds DO.

**Lesson (R12 + audit design):** a static-scan audit must anchor on the ACTION VERB (the emit call), never the bare data literal — domain/type/route literals are pervasive non-feed noise. An audit whose "correct" gaps depend on coincidental literal-absence is not trustworthy as the codebase grows. [[feedback_verify_actual_contract_not_proxy]] · [[feedback_mathematical_exhaustive_completeness]].

Sibling sweep units: [[reference_wikilink_graphrank_arm_2026_06_01]] (U1), [[reference_reasoning_outcome_loop_cl5_2026_06_01]] (U2), [[feedback_meta_learning_trigger_intentional_retirement_2026_06_01]] (U3), [[reference_sfc_inference_gate_wire_la1_2026_06_01]] (U4). Spec: `state/shared/specs/AI-SYSTEMS-IMPROVEMENT-SWEEP-2026-05-31.md`. Card: `state/shared/AI-TRAINING-ACCESS.md`.
