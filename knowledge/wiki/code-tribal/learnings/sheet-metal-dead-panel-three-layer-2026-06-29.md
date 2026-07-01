---
title: Sheet-metal dead pricing panel — three compounding causes across three layers
tags: [quoting, dead-panel, flat-nested, redaction, frontend, R12, R16, R9, live-simulation]
slot: charlie
date: 2026-06-29
commits: [e0d81c90fa, db0e682b99, 168b73e203, 8eb9e2e31c]
---

# Sheet-metal dead pricing panel — three compounding causes

A LIVE front-end simulation against the running `:3100` server (operator: *"run full live
simulations to test the new front end build"*) found `SheetMetalQuotePage` showing null /
crashing pricing on every quote. It had **three independent causes**, each masking the next —
a textbook case of why "fixed one layer → done" is a half-truth.

## The three layers

1. **Engine input mismatch** (`e0d81c90fa`). The FE form sends `{length_mm, width_mm}` and omits
   `perimeter_mm`, but `SheetMetalQuoteEngine` reads `flat_length_mm / flat_width_mm /
   perimeter_mm` directly → `undefined * undefined = NaN` → null price. **Fix:** normalize input
   at the top of `quote()` — alias `length_mm → flat_length_mm`, derive a rectangular perimeter
   `2*(L+W)` when none supplied; explicit `flat_*`/`perimeter_mm` win via `??` (backward-compat).

2. **Nested→flat shape mismatch** (`db0e682b99`). The engine returns a NESTED result
   (`pricing.unit_price`, `costs.material.total`, `lead_time.total_standard_days`); the page
   reads FLAT keys (`result.unit_price`, `result.material_cost`, …) and calls `.toFixed()`. Even
   with real pricing flowing, `undefined.toFixed` → crash. **Fix:** route-level
   `adaptSheetMetalFlat` unwraps the `{type,text}` prism_business envelope → maps nested→flat,
   **engine-computed fields only** (no fabricated values, R12).

3. **Anon page crash** (`8eb9e2e31c`). A 3-of-3 scrutiny gate on layer 2 **FAILed all three arms**:
   the route fix left the ANON path crashing. The page built `breakdown` unconditionally and
   called `row.value.toFixed()` / `unit_price.toFixed()` with NO guard. For an anon caller the
   adapter correctly OMITS the cost bars (redaction strips the cost basis) → `undefined.toFixed`
   TypeError → React render crash. The adapter's own doc-comment had **falsely claimed** "the
   page's breakdown filter naturally skips them" — no such filter existed. **Fix (FE):** filter
   breakdown to finite-number bars + gate the cost panel on `length > 0` + null-safe every
   tile/`.toFixed` (`typeof === 'number' ? … : '--'`) + correct `types.ts` to the real wire
   (cost fields optional, price/total/lead nullable). NEW page-RENDER test (3/3) that exercises
   the real consumer against the production wire.

## Lessons

- **A dead panel can have MULTIPLE compounding causes across layers** (engine input → route
  shape → page render). Fixing one and claiming "fixed" is the half-truth a 3-of-3 must catch
  (R16 — "looks done on pass 1 is not done"). I shipped layers 1+2 thinking done; the gate
  caught 3.
- **A pure-adapter / engine test cannot catch a page-render crash.** Write a test that RENDERS
  the real page consumer against the production wire shape — the anon-redacted shape (cost keys
  ABSENT) is the one that crashes (R9). The render test has proven teeth: revert the page guards
  → it FAILS with the exact `null.toFixed` error.
- **Redaction and render interact.** When the backend redacts cost fields for anon, the FE must
  gracefully render the redacted shape (filter / gate / null-safe), never assume every field is
  present.
- **A doc-comment that claims a downstream guard exists must be verified** (R12) — mine asserted
  a page filter that wasn't there, which is how the partial fix shipped.
- Same flat/nested dead-panel class as the CostEstimatorPage + estimate-flow fixes — now bitten
  on sheet-metal too. The route's envelope shape depends on the DISPATCHER (`prism_business` =
  `{type,text}`), not the route.

## Found-by

LIVE simulation, not static audit — the Phase D route→UI matrix had passed sheet-metal as
"wired" (the route exists and the page calls it); only running a real quote through the live
server surfaced the null/crash. **Live-sim > static wiring audit** for catching shape/render bugs.
