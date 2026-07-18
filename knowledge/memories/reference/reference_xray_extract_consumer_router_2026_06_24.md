---
name: reference_xray_extract_consumer_router_2026_06_24
description: "xray blueprint extraction->feature-consumer fan-out router (the \"apply to ALL prism features\" backbone), 2026-06-24"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.272Z
aliases: reference_xray_extract_consumer_router_2026_06_24
---


**U-XRAY-EXTRACT-CONSUMER-ROUTER** (slot xray, 2026-06-24, commit `b7fe4242ea` on cad-fusion-live-ms0).

The executable "apply blueprint reading to ALL prism app features" backbone from
[[blueprint-vision-app-integration-plan-2026-06-23]]. The `BlueprintExtractionContract`
NORMALIZED one part's extraction but nothing turned it into ACTION.

**What shipped:** `mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts` (pure, total) —
`routeExtractionToConsumers(contract, opts)` maps a validated contract -> an `ExtractionRoutingPlan`:
which downstream prism feature each extraction can drive, with per-consumer eligibility, a
contract-derived `payload`, and — for COMMITMENT consumers (quote=money / program=machine motion /
inspection=acceptance) — a `requires_confirmation` confirm-gate that blocks on any below-floor
`needs_confirm` field (`blocking_fields` = count). Advisory (feature_recognize/cad_reconstruct/
material_resolve) + privacy (redact) consumers are NEVER confirmidence-gated. 7 consumers, data-driven
`CONSUMERS` table.

**6 mapped dispatcher actions (all disk-verified):** quote=`prism_business:blueprint_to_quote`,
material_resolve=`prism_business:blueprint_resolve_material`, feature_recognize=`prism_cad:feature_recognize`,
cad_reconstruct=`prism_cad:blueprint_to_all_cads`, redact=`prism_cad:blueprint_redact`,
print_to_program=`prism_cam:print_to_program_full`, inspection_plan=`prism_quality:blueprint_inspection_plan`.

**Wiring:** `prism_cad:blueprint_extract_route` (cadDispatcher, mirrors `blueprint_extract_contract`) +
`POST /api/v1/cad/blueprint-extract-route` (routes/cad.ts). App chain:
producer -> `blueprint_extract_contract` -> `blueprint_extract_route` -> confirm-gated fan-out plan.

**Schema fix (root-cause):** `blueprintExtractionContractSchema`'s 5 array fields
(dimensions/gdt/notes/profiles/surface_finishes) are now `.default([])` — a contract that round-trips
through the dispatcher's `slimResponse` (which strips empty arrays) re-validates cleanly. Input-only
relaxation; output type stays `T[]`; 28 contract tests unaffected.

**Eligibility rules:** quote = dims OR material; program/feature/cad_reconstruct = dims>0; inspection =
gd&t>0 OR dims>0; redact = title-block carries a (trimmed-non-empty) customer = PII; material_resolve =
material OR title-block(object) OR notes.

**Tests:** 15 router unit + 5 prism_cad round-trip (`cadDispatcher.blueprintExtractRoute.test.ts`) = 20
new; 53 affected green; tsc-clean. Real reference-value/invariant/adversarial (confirm-gate, summary
identities `n_eligible=n_ready+n_blocked`, malformed-contract totality). Adversarial test caught a real
defensive gap mid-build (`title_block:42` treated as a material source -> fixed to require object).

**Scrutiny:** per-file 2-arm (code-analyzer + reviewer) both PASS. Both arms flagged 2 P2s — FIXED in-pass:
(1) `summary.n_needs_confirm` was mirrored from the upstream summary -> now RECOMPUTED from the field
flags so the banner can never disagree with the array-derived gate; (2) REST surface parity (the
contract had a REST proxy, the route didn't) -> added.

**NOT a dup of `ExtractionIntelligenceRouter`** (that routes extracted KNOWLEDGE -> codebase wiring
targets; this routes a part's EXTRACTION CONTRACT -> manufacturing feature consumers). Different input,
output, lifecycle (pure vs stateful+I/O).

**Lessons:** an adversarial defensive test earns its keep (caught the non-object title_block gap); when a
contract travels through a response slimmer, make the schema arrays `.default([])` rather than loosening
the consumer; a display-mirror of a self-reported field should be recomputed from the source-of-truth so
it can't drift from the safety gate. Sibling of [[reference_xray_extract_contract_wire_2026_06_24]] +
[[reference_xray_drawing_extract_normalizer_2026_06_24]] + [[reference_xray_extraction_contract_2026_06_23]].
