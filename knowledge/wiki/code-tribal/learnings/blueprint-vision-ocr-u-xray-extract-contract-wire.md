# BLUEPRINT-VISION-OCR/U-XRAY-EXTRACT-CONTRACT-WIRE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-CONTRACT-WIRE (slot:xray): blueprint_extract_contract action de-orphans the contract normalizers as an app surface

**Commit:** `99024cb51185` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:46:52-05:00
**Tags:** blueprint-vision-ocr, u-xray-extract-contract-wire, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-CONTRACT-WIRE (slot:xray): blueprint_extract_contract action de-orphans the contract normalizers as an app surface

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-CONTRACT-WIRE (slot:xray): blueprint_extract_contract action de-orphans the contract normalizers as an app surface

Mirrors the blueprint_redact precedent: a prism_cad action that takes a PRE-OBTAINED producer extraction (VLM 'fused' OR Drawing2DExtractionEngine 'drawing'), picks the matching normalizer (normalizeFusedToContract / normalizeDrawingExtractToContract), validates, and returns the versioned mm-canonical BlueprintExtractionContract + a real schema-validation verdict. No producer run / no I/O / no GPU (the app calls the producer action first). Enum entry + case + lazy import + POST /api/v1/cad/blueprint-extract-contract route. exactly-one-of-producer guard rejects neither AND both. 5 round-trip tests THROUGH prism_cad (inch->mm 0.5in->12.7mm proven through the dispatcher; valid verified as a real gate, not trivial -- a corrupted contract returns valid:false). 33 tests green (28 contract + 5 dispatcher), tsc-clean, 2-arm scrutiny PASS (wiring-review + independent reviewer, 0 P0/P1). The contract normalizers are now reachable; Phase-1 route owner chains producer->this action.
```

## Files touched (4)
- mcp-server/src/__tests__/cadDispatcher.blueprintExtractContract.test.ts | 111 ++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/cad.ts                                            |  11 ++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                       |  34 ++++++++++++
- 3 files changed, 156 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 99024cb51185`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._