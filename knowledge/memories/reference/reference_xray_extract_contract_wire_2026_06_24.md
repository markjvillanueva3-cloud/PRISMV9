---
name: reference_xray_extract_contract_wire_2026_06_24
description: blueprint_extract_contract prism_cad action de-orphans the BlueprintExtractionContract normalizers as an app surface; mirrors the blueprint_redact precedent.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.272Z
aliases: reference_xray_extract_contract_wire_2026_06_24
---


# xray blueprint_extract_contract dispatcher action (2026-06-24, slot xray)

**U-XRAY-EXTRACT-CONTRACT-WIRE.** Made the (previously orphaned) BlueprintExtractionContract
normalizers reachable as an app surface. Sibling to [[reference_xray_drawing_extract_normalizer_2026_06_24]]
+ [[reference_xray_extraction_contract_2026_06_23]].

## What shipped
- `prism_cad:blueprint_extract_contract` action in `cadDispatcher.ts` (enum + case + lazy import).
  Takes a PRE-OBTAINED producer extraction (`fused` = VLM ensemble output OR `drawing` =
  Drawing2DExtractionEngine result), picks the matching normalizer
  (`normalizeFusedToContract`/`normalizeDrawingExtractToContract`), runs
  `validateBlueprintExtractionContract`, returns `{contract, producer, valid, errors}`.
- `POST /api/v1/cad/blueprint-extract-contract` route in `routes/cad.ts` (cad router registered in
  routes/index.ts).
- 5 round-trip tests THROUGH prism_cad (`cadDispatcher.blueprintExtractContract.test.ts`).

## Design (the blueprint_redact precedent)
Like `blueprint_redact` takes a pre-obtained `extraction` (it does NOT run OCR), this action takes a
pre-obtained producer result and only NORMALIZES -- **no producer run, no I/O, no GPU**. The app
obtains the extraction via the producer action first, then calls this for the versioned contract. This
is the honest scope: it does not imply a parser that isn't there (drawing_extract is still
simulated-data-driven; the real DXF parse + the upload->extract route remain producer-side gaps owned
by papa/quebec).
- `exactly-one-of` producer guard: `hasFused === hasDrawing -> dispatcherError` rejects BOTH neither
  AND both (a string-`===` of two booleans).

## Verification facts worth keeping
- The dispatcher serializes via `slimResponse` (`utils/responseSlimmer.ts`): it STRIPS null/undefined +
  EMPTY ARRAYS but KEEPS `false` booleans + `0`. So a returned `errors: []` is stripped (assert
  `errors ?? []`), but `needs_confirm: false` survives. Memory [[reference_slimresponse_strips_empty_arrays]].
- `valid` is a REAL gate, not trivial: the independent reviewer corrupted a contract (`units:"in"` /
  non-numeric value_mm) and `validateBlueprintExtractionContract` returned `valid:false`. The happy path
  is always valid because the normalizer is the conformance boundary -- `valid` is the R15 self-proof
  that a future normalizer drift would be caught.
- 33 tests green (28 contract + 5 dispatcher), tsc-clean, 2-arm scrutiny PASS (wiring-review-agent +
  independent reviewer, 0 P0/P1). Two P2s logged + DECLINED: (1) `typeof===object` accepts arrays/junk ->
  empty contract (matches blueprint_redact; rejecting on "no dimensions" would be WRONG -- a valid
  extraction can be notes/GD&T-only with 0 dims); (2) inline param guard vs Zod input schema (matches the
  whole blueprint_redact cluster convention).

## Method note (R12 wins this session)
Reading the ACTUAL code corrected two doc/assumption errors: `blueprint_redact` was already fully wired
(NOT pending as the plan said) -- verifying first avoided a duplicate build; and the contract normalizers
were confirmed orphaned by grep before building the consumer. "Existence/title != reality -- read the body."
