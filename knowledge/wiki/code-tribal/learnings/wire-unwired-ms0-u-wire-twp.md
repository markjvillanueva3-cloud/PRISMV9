# WIRE-UNWIRED-MS0/U-WIRE-TWP — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TWP: wire TurningWearPredictionEngine into prism_turning (3 actions)

**Commit:** `7021ef2a5b22` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:08:09-05:00
**Tags:** wire-unwired-ms0, u-wire-twp, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TWP: wire TurningWearPredictionEngine into prism_turning (3 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TWP: wire TurningWearPredictionEngine into prism_turning (3 actions)

Wires TurningWearPredictionEngine (LATHE-PRO-MS1 U-LPR14/U-LPR15/U-LPR16,
478 LOC, orphan in dispatcher graph since LPR16 ship — zero dispatcher refs)
into prism_turning. Three new actions:

  - turning_wear_per_op     → accumulatePerOperation (Usui dW/dt = A·σn·Vs·exp(-B/θ))
  - turning_wear_chip_form  → predictChipForm        (ISO-group → chip type → wear mode)
  - turning_wear_batch_life → predictBatchLife       (parts/edge + change schedule + Vc opt)

Physics surface (preserved exactly from engine):
  - Usui A/B coefficients per ISO group P/M/K/N/S/H
  - Kienzle Fc = kc1.1 · ap · f^(1-mc)
  - Loewen-Shaw interface temperature
  - VB_max = 300µm (ISO 3685:1993)
  - Sandvik chip-form taxonomy (5 types) + chipbreaker class (F/M/R)
  - Taylor T ∝ Vc^(-1/n) for Vc-adjustment optimization

Dispatcher contract details:
  - 3 cases share one lazy import (cold-start cost amortized).
  - The engine's station_wear is Record<number, …> — JSON.stringify coerces
    numeric Record keys to strings on the wire; round-trip tests assert
    look-up by string-keyed station (1 → "1") to pin the contract.
  - predictChipForm takes positional args (iso, Vc, f, ap) but dispatcher
    reshapes from struct {iso_group, vc_m_min, f_mm_rev, ap_mm} — tests
    cover all 4 fields via separate semantic assertions.

4-surface coverage:
  ✓ schema   — 3 Zod schemas + _isoGroup + _turningWearOp helpers + 3 exports
  ✓ dispatcher — 3 ACTIONS enum entries + batch case block (single lazy import)
  ✓ engine-direct test — turning-wear-prediction.test.ts (pre-existing)
  ✓ dispatcher round-trip — 27 new cases:
        3 schema registration
        9 schema rejection (unknown iso, empty ops, negative ap, zero passes,
                             missing/zero vc_m_min, missing batch_quantity,
                             non-integer batch_quantity, minimal accept)
        4 turning_wear_per_op round-trip (per-op + per-station, finite-numeric
            guarantees, station_wear string-key survival, Kienzle linearity
            in ap (Fc scales 1.8–2.2× when ap doubles))
        5 turning_wear_chip_form round-trip (continuous@nominal, BUE@low-Vc,
            segmented+thermal-crack@superalloy, F@light-cut, R@heavy-cut)
        4 turning_wear_batch_life round-trip (baseline cost, custom cost
            propagation, Vc-opt fires for unreachable target + suggests
            LOWER Vc, Vc-opt absent when target omitted)
        2 dispatcher-boundary rejection (per_op + chip_form)
  Total: 27/27 vitest green (in addition to engine-direct suite).

Tsc baseline: zero new errors on touched files.

References:
  Usui, Shirakashi & Kitagawa (1978), "Analytical Prediction of Cutting Tool Wear"
  Loewen & Shaw (1954), "On the Analysis of Cutting Tool Temperatures", Trans ASME
  Altintas, "Manufacturing Automation," §§2.3 (Kienzle), 4.5 (wear)
  Sandvik "Metalcutting Technical Guide" Ch. 4 — chip form classification
  ISO 3685:1993 — Tool-life testing with single-point turning tools

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.turningWearPrediction.test.ts       | 398 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     |  72 ++++
- .../src/tools/dispatchers/turningDispatcher.ts     |  38 ++
- 3 files changed, 508 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7021ef2a5b22`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._