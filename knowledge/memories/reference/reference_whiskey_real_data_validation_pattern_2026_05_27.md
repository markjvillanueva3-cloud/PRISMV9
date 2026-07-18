---
name: reference-whiskey-real-data-validation-pattern-2026-05-27
description: Empirical pattern from running iter123-iter157 wizard against 3 real JM-Die programs across 2 customers. Documents what real-data validation revealed that synthetic fixtures hid.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.261Z
aliases: reference_whiskey_real_data_validation_pattern_2026_05_27
---


# Real-data validation findings (iter145-iter157)

## Programs validated

| Customer | File | Chars | Lines | G-codes | T-format | Comments |
|----------|------|-------|-------|---------|----------|----------|
| ALCOA | A0137471.MIN | 1081 | 93 | G50/G96/G97/G74/G00-03/G04 | Mazak 6-digit | none |
| ALCOA | PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc | 6115 | 205 | (same) | (same) | "PRISM v2.0.0 Upgrade" header |
| ALCOA | A100-A-0626.MIN | ~1.5K | ~120 | G81/G85/G87/G96/G97 | Mazak 6-digit | none |
| ITW | 025-325218-01.MIN | 972 | 85 | G81/G85/G87/G96/G97 | Mazak 6-digit | T-block comments like "(Rough OD and face)" |

## Bugs found + fixed by real-data validation

| iter | bug | symptom | fix |
|------|-----|---------|-----|
| 148 | silent CRLF→LF normalization | proposed_chars 1081→989 | preserve eol on rejoin |
| 150 | operation inference defaulted to "finishing" for drilling programs | wrong insert pick | OPERATION_FROM_GCODE rule table |
| 151 | bridge.resolve missed Mazak 6-digit T-format | "no match" throw | T-number candidate expansion T010101→T0101→T01 |
| 153 | drilling-family G-codes G81/G85/G87 not in rule table | misclassified as facing | extend drilling family to G74/G81-89 |
| 154 | over-normalization on mixed-eol B-version | 6115→6227 char drift | byte-exact passthrough when changes_applied=0 |
| 156 | ignored T-block parenthesized comments | weaker operation inference | priority-2 comment-pattern signal between operation_sequence and G-code inference |

## Cross-program consistency (proves wizard is stable)

All 3 programs (ALCOA × 2 + ITW × 1):
- parseBlocks: never crashes, line-count matches lines-in-file
- validateThreading: correctly returns clean (none of them have threading)
- bridge.resolve (T010101 Mazak): all resolve to Kennametal KCM35 (synthetic corpus default)
- runStage4_Reason: surfaces 1 P0 tooling recommendation per program
- runStage5_Generate: byte-exact round-trip (no levers fire — programs already have G50; no G71→missing G70; no G92 thread)

## What real-data validation surfaced that synthetic fixtures didn't

1. **Line-ending diversity** — real files mix CRLF/LF; synthetic fixtures were uniform LF
2. **Mazak EIA dialect headers** — real files have NBAR/CLEAR/DEF WORK/NSTRT preambles; synthetic fixtures used canonical Fanuc
3. **6-digit T-format** — real Mazak files use T<NN><NN><NN>; synthetic fixtures used Fanuc T<NN><NN>
4. **Drilling canned-cycle variety** — real files use G81/G85/G87 routinely; synthetic fixtures focused on G71/G92
5. **Inline T-block comments** — real files have parenthesized operation hints; synthetic fixtures had none

## Synthetic fixture vs real-data gap conclusion

**The 5 P0 engines passed all 85 synthetic-fixture hermetic tests. Running them against the FIRST real JM-Die program (iter145) surfaced bug #1 within minutes. Iter145→iter157 = 6 distinct bugs + 3 regression test suites locking them in.**

Lesson per [[feedback_verify_actual_contract_not_proxy]]: **synthetic fixtures verify intent but not all real-world conditions**. Run against real data ASAP after initial green-test landing.

## What the wizard correctly does NOT do

Across 3 programs, none of these false-positives fired:
- ❌ No spurious safety-gate recommendation (all 3 already have G50)
- ❌ No spurious G92→G76 substitution (none have G92)
- ❌ No spurious G70 insertion (none have G71 → no missing finish-pass)
- ❌ No CRLF/LF normalization (post-iter154 fix)

The single P0 the wizard surfaces ("document insert in T-block comment") is the EXACT improvement these amateur programs need — and matches what the operator's v2.0.0 upgrade pass added (the B-version A0137471.nc has rich metadata comments at the top).

## Pickup for next session

Highest-value next iters (in priority order):
1. **More real-program coverage** — try a program WITH G71 roughing or WITH G76 threading to actually exercise the structural levers
2. **CLI scan-runner for AB-locator** — iter136 pure helpers + fs.glob for `JM DIE/CNC LATHE/**/*.MIN`
3. **Refresh shop-tool-library bridge with real ALCOA tool-list** — currently fixtures-only
4. **Refresh master-index corpus with real vendor PDFs** — operator wget Sumitomo BNX, Kennametal catalog, etc. (per iter118 design)
5. **MCP dispatcher action `prism_lathe:query_vendor_tribal`** — wire iter132 engine to dispatcher (per iter111 design)

## Related

- [[reference_whiskey_lathe_session_close_iter143_2026_05_27]] — pre-validation session-close
- [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]] — corrects an assumption about B-versions
- [[feedback_verify_actual_contract_not_proxy]] — doctrine that motivated this validation pass
- [[reference_whiskey_lathe_design_memo_verification_checklist_2026_05_27]] — pre-flight for next session
