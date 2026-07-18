---
name: reference_xray_blueprint_ocr_adapter_deferred_2026_06_23
description: BlueprintOCRAdapter is a correctly-DEFERRED interface contract+helper (audit flags it UNWIRED but it must NOT be wired now) -- do not re-investigate; wire only when the eDOCr2/PaddleOCR backends + the validateIntake consumer are built
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.269Z
aliases: reference_xray_blueprint_ocr_adapter_deferred_2026_06_23
---


**WIRINGS-rung investigation (slot:xray, 2026-06-23): `BlueprintOCRAdapter.ts` is a correctly-deferred contract, NOT an actionable orphan.** `scripts/audit-unwired-engines.mjs` lists it among the 6 fleet UNWIRED engines (`suggestedDispatcher: UNKNOWN`), but R8-reading it shows it should NOT be wired now:

- It is `mcp-server/src/engines/BlueprintOCRAdapter.ts` -- 8 `export interface` (ExtractedDimension/GDTCallout/PMIAnnotation/ExtractedMaterial/OCRConfidenceSummary/BlueprintOCRResult/BlueprintOCROptions/BlueprintOCRAdapter) + ONE runtime export `summarizeConfidence()`. So it is NOT type-only (the audit's `isTypeOnlyModule` correctly skips it -- there is a runtime export), but it is a CONTRACT module.
- Its own docstring: "Implementation status: INTERFACE ONLY. Concrete impls (U-OCR-EDOCR2-IMPL, U-OCR-PADDLEOCR-IMPL) deferred to dedicated multi-session ML chats." Shipped 2026-05-23 (slot:kilo, U-OCR-ADAPTER-IFACE).
- ZERO consumers today (no file imports it). The intended consumer is `PrintToProgramPipelineEngine.validateIntake()` "when integrated".

**Decision (R12 + [[feedback_dont_wire_for_wiring_sake_2026_05_16]]): leave it honestly UNWIRED; do NOT wire `summarizeConfidence` to a dispatcher** (premature -- wire-for-wiring's-sake) and do **NOT** tag it `// WIRE-EXEMPT` -- that is for engines reached INDIRECTLY (wrapped by a singleton), which this is not, and `WIRE-EXEMPT` engines are never reclassified by the audit (line 267), so it would HIDE the genuine future wiring work when the backends land. The honest state is "unwired-pending-impl", which stays visible.

**When to wire (future ML chat):** after building a concrete OCR backend (eDOCr2 / PaddleOCR impl of the `BlueprintOCRAdapter` interface) AND integrating `PrintToProgramPipelineEngine.validateIntake()`, wire the adapter + `summarizeConfidence` through `prism_cam:print_to_program_full` (or the cad/blueprint dispatcher) at that time -- with real reference-value tests through the dispatcher.

The other 5 of the 6 fleet UNWIRED engines are peer-domain (AuthEngineV7->prism_auth; SFCProvenanceWireEngine + SFCInferenceGateWireEngine = oscar's LIVE SFC domain; RegressionBaselineEngine + PreMOUKickoffChecklistEngine = dev/business) -- lane-inappropriate to wire from xray. See [[reference_xray_p15_region_routing_arc_complete_2026_06_22]].

---

**RE-CONFIRMED + DECISIVELY CLOSED 2026-06-23 (post-compact, same session).** This decision OSCILLATED within one session: post-compact I lost this memory's context, rediscovered the adapter fresh on the WIRINGS rung, and APPLIED a `// WIRE-EXEMPT:` marker (commit U-XRAY-OCR-ADAPTER-WIRE-EXEMPT, UNWIRED 5->4) -- then the memory-recall hook surfaced THIS file mid-task and I REVERTED it (commit U-XRAY-OCR-ADAPTER-WIRE-EXEMPT-REVERT). The oscillation IS the lesson: a deferred-but-pending asset re-litigated every compact. **Resolution that stops the loop:** the WIRE-EXEMPT marker is NOT re-added (it would permanently hide future wiring -- audit line 267 never reclassifies WIRE-EXEMPT); instead a plain `/** */` docstring note now lives in `BlueprintOCRAdapter.ts` right after the header (does NOT match the audit's `// WIRE-EXEMPT:` line-comment regex, so the file STAYS visible in UNWIRED) telling the next R8-reader exactly why it is deliberately UNWIRED -> resolves the chase in ONE read, no re-tag. **FIRM DIRECTIVE for any future chat (incl. my future self): leave BlueprintOCRAdapter UNWIRED, do NOT tag WIRE-EXEMPT, do NOT re-investigate -- the inline note + this memory are the single source of truth. The only future action is to WIRE it (through prism_cam/blueprint dispatcher with real tests) once a concrete eDOCr2/PaddleOCR impl + the validateIntake consumer exist.** A cleaner systemic fix (a distinct audit "DEFERRED-PENDING-IMPL" category, visible-but-not-actionable, vs the binary UNWIRED/WIRE-EXEMPT) is a future romeo/wiring-domain tooling option -- logged, not built (out of xray lane + tool-batch budget). R7 (surface-dont-blend) + R12 (dont-hide-pending-work).
