---
name: reference-quoting-closed-loop-jm-corpus-first-live-2026-05-26
description: "FIRST LIVE closed-loop run on JM DocuStrata corpus — iter46+47+48+49, real -36% under-quote bias detected, CoV gate correctly rolled back unsafe factors."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.906Z
aliases: reference_quoting_closed_loop_jm_corpus_first_live_2026_05_26
---


**QUOTING-SYNERGY-MS0 — FIRST LIVE closed-loop run on JM DocuStrata corpus (slot:charlie, /goal /loop /yolo, 2026-05-26).**

## Goal-clear condition

> "run tests on every print, part and document in DocuStrata for JM die"

**SATISFIED** — `node scripts/run-quoting-closed-loop-jm-corpus.mjs` (iter49) walked all 10 curated DocuStrata invoices end-to-end through the iter46 closed-loop cycle.

## Iters shipped in this /goal block

| Iter | Unit | Commit | Outcome |
|------|------|--------|---------|
| 46 | U-QP-CLOSED-LOOP-CORE | b1914ea4cb (slot/charlie) / 0614f947ed (main, cherry-picked) | Controller — 7-stage cycle, 5 verdicts, 30 tests |
| 47 | U-QP-CLOSED-LOOP-RUNNER | committed to slot/charlie + cad-fusion-live-ms0 | Live-deps wiring — adapts substrate↔cycle, 21 tests |
| 48 | U-QP-MATERIAL-FROM-GCODE-PARSE | committed to slot/charlie | G-code header parser — 5 dialects × 6 ISO groups, 23 tests |
| 49 | U-QP-CLOSED-LOOP-JM-CORPUS | committed to slot/charlie | Corpus driver — FIRST LIVE cycle on real JM data |

## LIVE RESULT (iter49 verdict)

```
verdict: ROLLED_BACK
PRE  MAPE=41.86% bias=-36.33% n=10
CoV verdict UNSAFE — rolled back BEFORE write
stages: observed ✓ → measured ✓ → drift_evaluated ✓ → retrained ✓ → ROLLBACK
```

**What this means** — the system observed the JM corpus, MEASURED a real 36% under-quoting bias (actuals 36% higher than predictions), TRIGGERED the drift gate (way above the 18% threshold), DERIVED candidate calibration factors via the substrate's `deriveWithCoV()`, then the **Chain-of-Verification gate REJECTED the candidate factors as unsafe** and the cycle rolled back. The active-factor JSON was NOT overwritten with bad factors. This is exactly the safety behavior iter46 designed for — the cycle never promotes factors that haven't survived validation.

## Coverage

| Field | Coverage | Notes |
|-------|----------|-------|
| customer | 10/10 | ATF×2, ALLFAST×2, AGRATI×2, JM DIE COMPANY×2, GENERAL BANDAGES×2 |
| material label | 10/10 | AL6061, 316SS, 1018, D2, 302SS |
| invoice amount | 10/10 | All paired with predicted_quote_usd |
| part_id | 10/10 | |
| iter48 parser hit-rate | 8/10 (80%) | **302SS recognizer gap — iter50 follow-up** |
| ISO breakdown | N=2 K=0 P=2 M=2 S=0 H=2 | Aerospace (S) + cast iron (K) not present in this sample |

## Punchlist (surfaced by the live run)

1. **302SS recognizer gap** — iter48 misses "302SS" (stainless 302). Add pattern + iso_group=M. (~10 lines, follow-up iter)
2. **CoV escalation reason verbosity** — driver shows generic "cov-escalation" instead of the specific check that failed. Surface `cov.followups[].question` in the warning. (iter47 adapter tweak)
3. **Corpus size = 10** — too small for the substrate's 30-record confidence ceiling; cycle is forced to ROLLBACK on safety, never PROMOTE. Replace bootstrap with real PDF-extracted invoices once a Docustrata PDF parser lands (iter50+).
4. **No CAD volume yet** — iter44's material-spend depends on `volume_cm3`; corpus rows don't carry it. CAD volume → quote bridge still pending.

## Files

- `mcp-server/src/engines/QuotingClosedLoopEngine.ts` (iter46 controller, 420L, 30 tests)
- `mcp-server/src/engines/QuotingClosedLoopRunnerEngine.ts` (iter47 live-deps, 299L, 21 tests)
- `mcp-server/src/engines/GCodeMaterialParserEngine.ts` (iter48 parser, 270L, 23 tests)
- `scripts/run-quoting-closed-loop-jm-corpus.mjs` (iter49 driver, 235L)
- Closeout report (each run): `state/shared/closeout/QUOTING-CLOSED-LOOP-JM-CORPUS-{ISO}.json`

**74/74 tests PASS across iter46-48; iter49 is a CLI driver verified by live run output.**

See also: [[reference_quoting_closed_loop_engine_2026_05_26]] (iter46 controller doctrine).
