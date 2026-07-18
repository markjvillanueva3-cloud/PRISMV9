---
name: business_synthesis
description: "[auto-synth · verify] Compounding synthesis of the business domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: business
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T17:57:24.592Z
  sourceHash: b6fc4e6fd212
  advisoryOnly: true
  mustHumanVerify: true
---

# business — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Audit‑driven wiring cycle** – Every major component is first audited (e.g., `ENGINE-AUDIT`, `AI‑SYNERGY‑AUDIT`) and then marked as *UNWIRED* or *WIRING‑DEFERRED* before a concrete wire is applied.  The pattern repeats across domains: `[reference/reference_post_ship_engine_audit-u-audit-backlog-status]`, `[reference/reference_ai_synergy_content_validated_2026_06_13]`, `[reference/reference_papa_wire_unwired_v2_1_extension_2026_06_15]`.
- **Slot‑enforcement bootstrap** – New services are allocated a named *slot* (bravo, charlie, echo, india, xray, etc.) and must pass a `BOOTSTRAP-SLOT-ENFORCE` step before any wiring.  Seen in `[reference/reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-c1-pilot-classifier]`, `[reference/reference_post_ship_quoting-synergy-ms0-u-qp-training-status-ui-test]`, `[reference/reference_cimco-integration-ms0-u-cimco-closed-loop-status]`.
- **Deferred interface contracts** – Certain adapters (e.g., OCR, GNN evaluation) are deliberately left *UNWIRED* until downstream back‑ends become stable.  The contract is recorded but not acted on: `[reference/reference_xray_blueprint_ocr_adapter_deferred_2026_06_23]`, `[reference/reference_post_ship_ai-systems-gnn-u-gnn-nneval-deferred-fence]`.
- **Full‑coverage closure directives** – When a subsystem reaches 100 % coverage (lathe, CAD, AI‑GNN), an operator directive triggers a final audit sweep and closes the slot.  Examples: `[reference/reference_lathe_100pct_wired_2026_05_23]`, `[reference/reference_cad_completion-u-cad-status-refresh]`.
- **Audit rerun → incremental wiring** – Re‑auditing after an initial wire often uncovers additional “CLEAN” engines that must be wired in the same session.  Documented in `[reference/reference_papa_wire_unwired_v2_1_extension_2026_06_15]`.

## Key decisions & rules
- **Wire only after backend readiness** – The `BlueprintOCRAdapter` remains deferred until both `eDOCr2` and `PaddleOCR` back‑ends are shipped.  (see `[reference/reference_xray_blueprint_ocr_adapter_deferred_2026_06_23]`).
- **Slot naming must be unique and hierarchical** – Slots follow a predictable taxonomy (`bravo`, `charlie`, `echo`, `india`, `xray`, etc.) and are referenced consistently across audits and wiring actions.  Violations trigger the `BOOTSTRAP-SLOT-ENFORCE` guard.
- **Content‑validated scores supersede proxy metrics** – The AI‑SYNERGY audit’s “content‑validated” status (34/34) is required before any production rollout of galaxy‑AI docs.  (`[reference/reference_ai_synergy_content_validated_2026_06_13]`).
- **Deferred fences guard side‑effects** – For GNN evaluation, the `NNEVAL-DEFERRED-FENCE` must block bare‑CLI writes until the deployment gate is confirmed (see `[reference/reference_post_ship_ai-systems-gnn-u-gnn-nneval-deferred-fence]`).
- **Audit flags drive immediate action** – An audit flag of `UNWIRED` → trigger a wiring ticket; `DEFERRED` → create a contract record but no ticket; `CLEAN` → mark as ready for immediate wire.  This rule is applied uniformly across all listed memories.

## Open threads
- **Finalize OCR pipeline wiring** – The `BlueprintOCRAdapter` remains deferred pending backend integration; schedule alignment with `eDOCr2`/`PaddleOCR` release is still open. (`[reference/reference_xray_blueprint_ocr_adapter_deferred_2026_06_23]`)
- **Complete remaining GNN deferred fences** – While most GNN components are wired, the deferred evaluation fence (`U-GNN-NNEVAL-DEFERRED-FENCE`) still blocks production writes; a decision on when to lift it is pending. (`[reference/reference_post_ship_ai-systems-gnn-u-gnn-nneval-deferred-fence]`)
- **Audit‑rerun discovery process** – The pattern of finding extra CLEAN engines after an audit rerun (PAPA v2.1) suggests a need for a systematic “post‑wire audit” step; formalizing this as a rule is still under discussion. (`[reference/reference_papa_wire_unwired_v2_1_extension_2026_06_15]`)
- **Slot‑enforce edge cases** – Some slots (e.g., `victor` in `[reference/reference_post_ship_wire-business-direct-ms0-u-victor-business-direct]`) lack explicit bootstrap enforcement documentation; clarification is required to avoid accidental wiring.
