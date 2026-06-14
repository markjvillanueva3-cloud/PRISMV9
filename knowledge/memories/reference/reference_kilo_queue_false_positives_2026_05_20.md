---
name: reference-kilo-queue-false-positives-2026-05-20
description: "2026-05-20 kilo /loop iter 2 — both remaining kilo-queue paths (route-orphan rescue + DOMAIN-PIPELINE-MS0 ORCHESTRATE_FULL) verified as false positives; no clean build-and-wire unit remains"
aliases: reference_kilo_queue_false_positives_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.184Z
---


# Kilo task queue — remaining units are false positives (2026-05-20)

Second kilo /loop iteration this session. After [[reference_u_wire_fluid_pumps_2026_05_20|U-WIRE-FLUID-PUMPS]]-5 (iter 1,
the one genuinely-clean cluster) the remaining kilo queue was investigated end
to end. **Both candidate paths resolve to false positives — no clean
build-and-wire unit remains.** No new code shipped this iteration; the
deliverable is the verified finding below.

## Path 1 — route-orphan rescue: exhausted

`src/routes/` imports 38 engines; 7 have zero `src/tools/dispatchers/` refs
(`WEDMQuoteBridgeEngine`, `WEDMJobCreatorEngine`, `WEDMInvoiceLineEngine`,
`WEDMOverageApprovalEngine`, `WEDMSafetyEnvelopeEngine`, `LayeredAssetCheckEngine`,
`ShopStateEngine`). **All 7 are deliberately route-only by documented design** —
read each route file's header before treating a zero-dispatcher engine as an
orphan:

- `wedm-erp.ts` header: *"Engines are called directly rather than through the
  dispatcher because this is a focused vertical and the dispatcher layer would
  only add indirection without adding value."*
- `asset-check.ts`: exists so short-lived PreToolUse hooks (not MCP clients) can
  query the long-lived MCP server over HTTP — MCP-wiring it is pointless.
- `shopLive.ts`: WebSocket live-state vertical; `ShopStateEngine` is the
  canonical state owner.

The route-wired/MCP-orphan signal (see [[reference_u_wire_fluid_pumps_2026_05_20]],
[[reference_u_orphan_rescue_stripe_2026_05_20]]) still needs a per-candidate
read — a zero-dispatcher engine in an HTTP route file is often route-only by
intent. StripeBillingEngine was the exception, not the rule.

## Path 2 — DOMAIN-PIPELINE-MS0 `U-DPM0-PRINT2PROG-ORCHESTRATE_FULL`: false "missing"

The DOMAIN-PIPELINE-MS0 envelope (`mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json`,
`advisory_only:true` + `must_human_verify:true`) routes exactly **one** unit to
slot kilo: `U-DPM0-PRINT2PROG-ORCHESTRATE_FULL`, `current_engine:
PrintToProgramOrchestratorEngine`, `current_status: missing`.

That engine name does not exist — but the capability does. The real full
print-to-program orchestrator is **`PrintToProgramPipelineEngine.ts` (143.7K)**,
wired 4× into `prism_cam` (`print_to_program_full`, `print_to_program_enhanced`,
`print_to_program_plan`, `print_to_program_validate`) plus
`AutoPrintToProgramBridgeEngine` → `auto_print_to_program`. Building a new
`PrintToProgramOrchestratorEngine` would be duplication-guard-blocked
(`duplicationGuardEngine.mustCheckBeforeCreating()` throws) and an R7/R8
violation. The config's engine-name guess is wrong; the stage is built+wired.

## Other notes

- The priority-queue picker (`priority-queue.mjs --pick --slot kilo`)
  over-surfaces cross-slot units: it returned `U-DPM0-WIRE-PRINT_OCR`, which the
  envelope shows is `domain:wire, slot:charlie` (Wire-EDM lane, not kilo). The
  milestone envelope's `slot` field is authoritative — always cross-check.
- Remaining kilo-tagged `U-GAP-P2P-*` units (JM-DIE part-library training
  corpus, blueprint-OCR dimension extraction, macro intelligence) are large
  multi-session data/ML units, not one-iteration build-and-wire units.

## Rule for future kilo loops

The kilo build queue is currently false-positive-dominated. Before building:
(1) read the route-file header for any route-orphan; (2) for any
DOMAIN-PIPELINE-MS0 "missing" cell, grep `ENGINE_DIGEST.md` + `ls src/engines/`
for the *capability* (not the config's guessed engine name) before treating it
as a gap — that envelope is `must_human_verify`. The operator-side fix for the
ORCHESTRATE_FULL false positive is to correct `current_engine` →
`PrintToProgramPipelineEngine` + `current_status` → `built` in
`state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json` and re-run
`scripts/extract-domain-pipeline-units.mjs`.

See [[reference_u_wire_fluid_pumps_2026_05_20]], [[feedback_high_roi_backend_first_slot_queue]].
