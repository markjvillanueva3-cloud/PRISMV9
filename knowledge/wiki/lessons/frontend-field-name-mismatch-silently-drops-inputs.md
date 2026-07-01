---
title: A field-name mismatch silently drops every user input across a frontend-backend chain
created: 2026-06-25
slot: oscar
tags: [frontend, integration, sfc, silent-drop, field-mismatch, testing, lesson]
commits: [U-SFC-PAGE-DEPTH-WIDTH, U-SFC-PAGE-MACHINE-LIMITS, U-SFC-OPTIMIZE-FOR-REQUEST]
related: [[extracted-value-without-unit-label-is-a-scale-bomb]] [[sfc-frontend-ownership-u-sfc-fe-degate]] [[reference_oscar_sfc_page_dropped_inputs_2026_06_25]]
---

# A field-name mismatch silently drops every user input across a frontend-backend chain

Distilled from the SFC web page wiring (slot:oscar, 2026-06-25). Hit THREE times in one session -- a recurring
integration bug class worth a standing rule.

## The class

A page collects a user input, the backend reads it under a DIFFERENT key, and NOTHING in between maps the two.
The input is silently dropped; the engine falls back to a default; every downstream number is computed at the
wrong operating point. No error, no failed test -- the page "renders + has green logic tests", and the engine
"has passing unit tests" -- but they were never tested TOGETHER end-to-end.

Three instances this session, same class:
- **depth/width:** the page posted `depth`/`width`; `ProductEngine.sfcCalculate` read only `depth_of_cut`/
  `width_of_cut`. Customer geometry ignored -> engine used `toolDiam*0.5` -> every force/MRR/power/safety
  number at the wrong depth. (TDD-proven: `depth:8` returned `depth_of_cut_mm:6`.)
- **machine limits:** the page collected the selected machine but `handleCalculate` never sent
  `spindleMaxRpm`/`spindlePowerKw` -> the engine's rpm/power clamp never fired -> the page could publish an
  unreachable spindle speed.
- **optimize_for:** the goal selector existed in the engine but no request field carried it until wired.

## The rules

1. **Verify field names across the WHOLE chain, end to end:** page state -> request body -> route -> dispatcher
   schema (does it `.passthrough()` or strip unknown keys?) -> normalizeParams/aliases -> engine param. One
   rename anywhere = a silent drop. (The depth/width fix added `depth`/`width` aliases on the engine side;
   the machine/optimize_for fixes added the missing request fields.)
2. **Add a test that a NON-DEFAULT input CHANGES the output.** A test that only checks "renders" or "logic is
   green" cannot catch a dropped input -- the engine still returns a (default) number. The load-bearing test
   is: pass `X=8`, assert the result reflects 8, not the default. This is the only test that fails when the
   wiring breaks.
3. **Make the page->request mapping a PURE, exported helper** (e.g. `buildSfcCalcRequest`) so the field-name
   contract is unit-testable without rendering the page. A mapping buried in a component handler is untestable
   and is exactly where the drop hides.
4. **A `.passthrough()` dispatcher schema is your friend here** -- it carries an unlisted field straight to the
   engine, so the only place a rename can drop the value is the page->request mapping (rule 3) or the engine
   read (rule 1). Trace it once and the silent-drop surface collapses to those two points.

## Why "looks done" lies

The SFC page had a 234/234 green page-test layer while silently dropping the customer's depth, width, and
machine limits. "Renders + green logic" is NOT "the inputs reach the engine." The per-file scrutiny + an
end-to-end "non-default input changes output" test are what surface it. Sibling lesson (modeling, not wiring):
[[extracted-value-without-unit-label-is-a-scale-bomb]].
