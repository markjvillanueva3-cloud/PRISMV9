---
name: reference_xray_redact_comprehensive_pii_2026_06_25
description: "Auto-redaction hardening — the blueprint extraction router redact consumer's PII false-negative + the over-vs-under-redaction tension (slot xray, 2026-06-25)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_redact_comprehensive_pii_2026_06_25
---


# Auto-redaction hardening (slot xray, 2026-06-25, cad-fusion-live-ms0)

3-unit close of the operator "auto redaction" ask on `/checkin-xray`. Commits `618237fa34` +
`9ff067db37` + the MS/HR/CD tighten. The blueprint OCR/reading + app-integration backend was already
mature (Phase-1 upload→extract→contract→route shipped); the genuine in-lane gap was the **redaction
enforcement**, the operator's explicit ask.

## The bug (R12 privacy false-negative)
`blueprintExtractionRouter.ts` `redact` consumer gated eligibility on `Boolean(title_block.customer)`
ONLY. A part whose PII was in a **note** ("MADE FOR SEMBLEX"), the **`source` print PATH** (paths embed
the customer/part number), or a **non-customer title-block identity field** (company/vendor/part_number/
work_order) reported "nothing to redact" — while that same un-redacted title_block/source flowed into the
quote/print_to_program/job_create payloads. The reason also leaked the cleartext customer name into the
plan, and the payload echoed the raw contract.

## The fix
Delegate eligibility to the shared `redactExtraction()` audit (walks the WHOLE contract: ~30 identity
keys + notes/gdt free text + source path). Reason names PII **field paths** (never the cleartext value).
Payload **auto-delivers** the redacted artifact `{redacted_extraction, pii_fields, n_redactions}` — so
redaction is automatic, not a second `blueprint_redact` call. `redactExtraction` also backs the standalone
`prism_cad:blueprint_redact` action, so the fix covers both.

## THE LESSON — over-redaction fix opened an under-redaction hole (the dangerous direction)
The first cut stopped a hyphenated material grade ("AISI-1045", which matches the part-number regex
`[A-Z]{1,4}-\d{3,6}`) from being mistaken for a part number by **blanket-passing** known non-PII spec keys
(material/finish/size/...) through verbatim. 3-of-3 scrutiny arm C caught (live) that the blanket
pass-through then **leaked a customer name embedded in a mislabeled spec value** ("MATERIAL: 4140 PER ITW
SPEC", "FINISH: ITW") — under-redaction, the safety-critical direction. Fix: a **value-aware** exemption —
run the full scrub on spec fields with a `protectGrades` option that suppresses ONLY a genuine
material-grade token (`looksLikeMaterialGrade`: standards/alloy prefix AISI/SAE/AL/SS/C/UNS/... + a short
3-4 digit grade) from the part-number pattern. So embedded customer names + real part numbers in a spec
value ARE masked; only a clean grade is preserved. `protectGrades` defaults false → LoRA export
(`applyAnonymizationPatterns`), the `blueprint_redact` text path, and note free-text scrubbing are
byte-identical (bounded blast radius). A 3-of-3 P2 (MS/HR/CD prefixes = a military-part prefix + 2 process
abbreviations, not grade prefixes) was tightened out.

**Generalizable:** a privacy exemption must be VALUE-aware, never a blanket key/field pass-through — a key
that is "usually non-PII" still carries free text where a customer name can hide. And: the over-protection
direction (false-positive redaction) is recoverable; the under-protection direction (a leak) is not —
when fixing over-redaction, verify you did not open an under-redaction hole. See
[[feedback_audit_consumers_when_moving_logic_into_engine]] sibling.

## Tests / evidence
130 tests green across redaction+router+LoRA+quoting-intake+drawingRoute; tsc clean. R9 regression tests
genuinely fail on the old code (PII-in-notes/source/part_number eligibility flip; AISI-1045 over-redaction;
embedded-customer under-redaction). 3-of-3 PASS. App-plan Phase 3 (auto-redaction) is now backend-hardened;
the quebec render toggle stays the remaining frontend piece.

Wiki: [[blueprint-vision-app-integration-plan-2026-06-23]] Phase 3 · code-tribal
[[blueprint-redact-comprehensive-pii-value-aware-exemption]].
