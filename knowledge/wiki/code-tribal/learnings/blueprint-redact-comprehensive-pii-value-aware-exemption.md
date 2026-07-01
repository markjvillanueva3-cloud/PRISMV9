---
title: Blueprint redaction — comprehensive PII detection + value-aware grade exemption
slug: blueprint-redact-comprehensive-pii-value-aware-exemption
galaxy: blueprint-vision
slot: xray
created: 2026-06-25
type: code-tribal
tags: [privacy, redaction, pii, over-redaction, under-redaction, R12]
---

# Blueprint redaction: comprehensive PII detection + value-aware grade exemption

**Commits:** `618237fa34` (router redact comprehensive PII) · `9ff067db37` (value-aware grade guard) ·
prefix-tighten. Slot xray, 2026-06-25.

## What broke (twice) — two opposite redaction failure modes

1. **Under-protection (false-negative):** the `blueprintExtractionRouter` `redact` consumer gated
   eligibility on `Boolean(title_block.customer)` ONLY. PII in a **note**, the **`source` print PATH**, or
   a **non-customer identity field** (company/vendor/part_number/work_order) → "nothing to redact" while
   that un-redacted data flowed downstream. A redaction-eligibility predicate must detect PII across **all**
   identity surfaces, not one field — the shared `redactExtraction()` audit already walks them all; the
   router just wasn't using it.

2. **Over- → under-protection tension:** fixing #1 surfaced that a hyphenated **material grade**
   ("AISI-1045") matches the part-number regex `[A-Z]{1,4}-\d{3,6}` → false-flagged a clean part +
   corrupted the material to `[REDACTED]` in the auto-delivered artifact (over-redaction). The first fix —
   a **blanket pass-through** of known non-PII spec keys (material/finish/size) — then **leaked a customer
   name embedded in a mislabeled spec value** ("MATERIAL: 4140 PER ITW SPEC", "FINISH: ITW"). That is
   under-redaction, the **safety-critical** direction.

## The rule

- **A privacy exemption must be VALUE-aware, never a blanket key/field pass-through.** A key that is
  "usually non-PII" still carries free text where a customer name can hide. The correct fix: run the full
  scrub on the exempt field, suppress ONLY the specific false-positive token (a genuine material grade via
  `looksLikeMaterialGrade` — a standards/alloy prefix + a short 3-4 digit grade), so embedded customer
  names + real part numbers still mask while a clean grade is preserved.
- **Over-protection is recoverable; under-protection is a leak that is not.** When you fix an
  over-redaction false-positive, prove you did not open an under-redaction hole (test the embedded-PII case).
- **A routing/plan privacy route must not echo cleartext PII** — name field PATHS, not the value.
- **Keep the exemption prefix-set tight.** MS (Military-Standard part prefix) and HR/CD (process
  abbreviations) are not grade prefixes — including them widened the leak surface for zero grade coverage.
- **Bound the blast radius:** the value-aware behavior is opt-in (`protectGrades` defaults false), so the
  LoRA export, the `blueprint_redact` text path, and note free-text scrubbing stay byte-identical.

## Detection

3-of-3 scrutiny arm C caught the under-redaction hole the first commit introduced (PASS→FAIL→fix→PASS).
The per-file 2-arm gate's code-analyzer caught the original over-redaction. Both were found by an
**adversarial live probe**, not by the green test suite — the suite was green because the embedded-PII
direction was untested. Always test the dangerous direction explicitly.

Related: [[reference_xray_redact_comprehensive_pii_2026_06_25]] ·
[[blueprint-vision-app-integration-plan-2026-06-23]] (Phase 3) ·
[[reference_xray_app_redact_wire_2026_06_23]] (the redact-lib + key-leak precedent).
