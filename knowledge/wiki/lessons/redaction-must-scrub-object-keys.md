---
title: A structured-data redactor must scrub object KEYS, not only values
slug: redaction-must-scrub-object-keys
galaxy: blueprint-vision
slot: xray
type: lesson
created: 2026-06-23
tags: [privacy, redaction, blueprint-vision, scrutiny, R12]
---

# A structured-data redactor must scrub object KEYS, not only values

**Context:** U-APP-REDACT-WIRE (commit on `cad-fusion-live-ms0`, slot:xray) wired the shared
`blueprintRedaction.ts` customer-identity redactor into `prism_cad:blueprint_redact`. Per-file 2-arm
scrutiny PASSED the wire; a focused independent re-review of the lib then surfaced a **P1 privacy leak**.

## The bug (two nested layers)

`redactExtraction.walk` (the recursive structured-extraction scrubber) masked every string **VALUE** but
copied every object **KEY** verbatim. So a per-customer map or a title-block whose customer string became a
key round-tripped the identity unredacted:

```js
redactExtraction({ "ITW SHAKEPROOF": { qty: 5 } })
// -> { "ITW SHAKEPROOF": { qty: 5 } }   // LEAK: identity survives in the KEY
```

The first fix scrubbed keys with `redactText(k)` -- but `redactText` uses the **DISTINCTIVE** tier, which
deliberately skips short acronyms (ATF) and common words (ACME/PARKER) to avoid mangling free-text VALUES.
That tier is wrong for a bare key: **29 of 117 JM customers still leaked as keys.** A key that IS exactly a
customer name is unambiguous identity with zero free text to preserve -- so over-redaction safety does not
apply.

## The fix

- A whole-key **EXACT** match against the FULL registry (`ALL_CUSTOMER_NAMES_UPPER`, any tier) masks the
  bare-customer-name key wholesale.
- Longer keys that merely **embed** a distinctive name still get the distinctive scrub (`drawn_for_SEMBLEX`).
- A **collision suffix** (`[REDACTED]#2`) keeps both values when two distinct customer keys mask to the same
  token -- no silent data loss.
- Ordinary field-name keys (`customer`, `material`, `notes`, `qty`) never match a customer-NAME pattern, so
  they pass through untouched -- no over-redaction. The value path is byte-unchanged (`isIdentityKey` still
  receives the original key).

## Two reusable lessons

1. **A redactor that walks structured data must scrub KEYS as well as VALUES.** An identity can BE the key
   (per-customer map, title-block-as-key). Value-only scrubbing is a silent false-negative class.
2. **A tier tuned for free-text over-redaction safety is the WRONG tier for a whole-key match.** "Skip short
   acronyms / common words" protects legit notes, but a key that exactly equals a customer name has no legit
   text to protect -- use the full registry for exact whole-string matches.

Privacy-critical: a false negative leaks a JM customer identity on an exported/shared drawing. The xray
domain doctrine already states "NEVER export training data without anonymization"; this extends it to the
structured-key path.

## Verify

`mcp-server/src/__tests__/blueprintRedaction.test.ts` ("customer-in-KEY leak" + "short-acronym contract
boundary" describes) + `cadDispatcher.blueprintRedact.test.ts` (the "customer used as an OBJECT KEY"
round-trip). 62/62 green. Memory: [[reference_xray_app_redact_wire_2026_06_23]].
