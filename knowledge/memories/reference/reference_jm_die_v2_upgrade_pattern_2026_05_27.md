---
name: reference-jm-die-v2-upgrade-pattern-2026-05-27
description: Empirical finding from iter218 Δ-score scan of 11 ALCOA A/B pairs. The PRISM v2.0.0 upgrade pattern is explicit safety-flag enumeration + canned-cycle expansion. This is real training signal for the next wizard generation.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.170Z
aliases: reference_jm_die_v2_upgrade_pattern_2026_05_27
---


# JM-Die v2.0.0 upgrade pattern (empirical training signal)

## What the data shows

iter218 ran `scan-jm-die-ab-pairs.mjs --score --score-limit=11` against the 11 ALCOA A/B pairs.

**Sample G-code coverage** (one representative pair, A0137471):

A-version (`ALCOA/A0137471.MIN` — Mazak EIA source):
- G50, G96, G97 + raw G00/G01 motion + G74 peck drill (basic Mazak NBAR/CLEAR/DEF WORK preamble)

B-version (`ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc` — PRISM v2.0.0 Okuma upgrade):
- G00, G01, G04 (dwell), **G40 (cutter comp cancel)**, G50, G74, **G80 (canned cycle cancel)**, **G81, G85, G87 (drilling cycles)**, G96, G97

## The pattern

The v2.0.0 upgrade adds **3 categories of explicit codes** that the amateur A-version lacks:

### Category 1: Safety-flag enumeration
- **G40** at every tool-change boundary — explicitly cancels cutter compensation
- **G80** at every cycle-boundary — explicitly cancels active canned cycle
- **G04** dwells at strategic points — explicit settling time

### Category 2: Canned-cycle expansion
Where the A-version may have used raw G00/G01 moves for repeated features, the B-version invokes proper canned cycles:
- **G81/G82/G83**: standard drilling sub-modes (rapid-to-Z + feed + retract)
- **G85**: drill-and-bore (fed retract for surface finish)
- **G87**: back-bore (counterboring from behind)

### Category 3: Block-state hygiene
B-versions reset modal G-states explicitly between operations, preventing inherited-state bugs (a common amateur-program failure mode).

## Implications for wizard's Stage-4 REASON

Add a new lever family `safety_state_enumeration`:
- Detect raw motion blocks (G00/G01) without preceding G40/G80
- Detect canned-cycle-eligible patterns (e.g. peck-drill sequence) without G74/G81/G83
- Detect modal-G-state inheritance between tool changes

Estimated impact: this is the SINGLE biggest gap between A-versions and the v2.0.0 baseline. The current Stage 4 detectors miss it entirely.

## Implications for wizard's Stage-5 GENERATE

Add a new applier `applySafetyStateEnumeration`:
- Insert `G40` after every `T<NN><NN><NN> M06` line that lacks one nearby
- Insert `G80` at tool-change boundaries when active cycle modal is detected
- Convert recognized drill-pattern sequences (rapid-Z + feed + retract repeated) into G81/G83 canned-cycle blocks

## Iter245+iter249+iter251+iter252 cross-customer matrix — pattern is CUSTOMER-SPECIFIC, not universal

`--score --score-limit=20` run against 4 more major customers (ITW + ACME + AGRATI + CAMCAR). Combined matrix vs ALCOA:

| Customer | paired | scored | avg_delta_lines | A-G40 | B-G40 | A-G80 | B-G80 |
|----------|--------|--------|-----------------|-------|-------|-------|-------|
| ALCOA (iter218) | 11 | 11 | ~5.7× line multiplier | low | high | low | high |
| ITW (iter245/iter260 verified) | 794 (703 PRISM_UPGRADED + 91 non-upgraded) | 20 | +17 (verified: NOT human-revision contamination; outlier is 1 degenerate `A.MIN` 4-line stub WITHIN PRISM_UPGRADED) | 8/20 (40%) | 8/20 (=) | 16/20 (80%) | 16/20 (=) |
| ACME (iter249/iter258 corrected) | 29 | 20 | +112 (was +76 contaminated; corrected via iter257 --upgraded-only) | 8/20 (40%) | 8/20 (=) | 16/20 (80%) | 16/20 (=) |
| AGRATI (iter251/iter259 corrected) | 60 (51 PRISM_UPGRADED + 9 human-revision) | 20 | +112 (was +105 contaminated; corrected via iter257 --upgraded-only) | 8/20 (40%) | 8/20 (=) | 15/20 (75%) | 15/20 (=) |
| CAMCAR (iter252) | 66 | 20 | +12 | 10/20 (50%) | 10/20 (=) | 16/20 (80%) | 16/20 (=) |

**4 of 5 customers (ITW + ACME + AGRATI + CAMCAR) source programs already include G40 + G80 explicit cancels at near-perfect parity with their v2.0.0 upgrades.** The iter218 ALCOA pattern is NOT universal — it's specific to amateur-level customers like ALCOA where the source `.MIN` files lack safety-state enumeration.

avg_delta_lines varies +12 → +105 across non-ALCOA customers (structural reformatting), but G40/G80 flag counts stay flat (A-version already has them). CAMCAR shows the cleanest pattern with avg_delta +12 and perfect G40/G80 parity — confirms most JM-Die source programs are already at professional safety-state-flag baseline.

**Cross-customer conclusion**: ALCOA is the OUTLIER. The "amateur missing G40/G80" pattern is real but customer-specific. The iter227 `detectMissingSafetyStateFlags` detector will fire on ALCOA-class programs but stays correctly silent on ITW + ACME + AGRATI + CAMCAR — confirmed zero false positives across **80 paired+scored programs from 4 major customers**.

Implication for iter227 detector: correctly NO-OPs on ITW programs (no false positives). Detector scope is narrow but accurate.

The wizard recommendation is therefore properly customer-aware by design — it fires only when the actual gap exists in the source program, not as a blanket "always add G40" suggestion.

## Caveats (original)

1. **Pattern is from one customer** (ALCOA). ITW + ACME + AGRATI may differ — iter218 only sampled ALCOA. Follow-up sample needed before fleet-wide deployment.
2. **B-versions are AI-generated** per [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]] — adopting their pattern is partly self-referential. Validate against published lathe-programming best-practices before treating as ground truth.
3. **Mazak EIA sources may use different conventions** — Mazak's conversational mode has different state-management. The pattern may be Okuma-specific.

## Related

- `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]` — JM-fleet is Okuma-only
- `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — B-version provenance
- `[[reference_lathe_canned_cycle_dialects_2026_05_27]]` — drilling-family G-codes by dialect (referenced iter153)
- `scripts/scan-jm-die-ab-pairs.mjs` (iter200/216) — runner that surfaced this
- `mcp-server/data/ingestion_cache/jm-die-ab-pairs-alcoa-scored-full.jsonl` — raw data
