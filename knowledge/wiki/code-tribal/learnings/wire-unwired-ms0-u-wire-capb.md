# WIRE-UNWIRED-MS0/U-WIRE-CAPB — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CAPB: wire CapacitorBankEngine into prism_dev (1 action + engine test)

**Commit:** `9d34c4519794` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:06:37-05:00
**Tags:** wire-unwired-ms0, u-wire-capb, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CAPB: wire CapacitorBankEngine into prism_dev (1 action + engine test)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CAPB: wire CapacitorBankEngine into prism_dev (1 action + engine test)

Wires pure-compute power-factor-correction sizer (IEEE 1036, IEC 60831,
NFPA 70). Engine had no test file; this commit ships both engine-direct
+ dispatcher round-trip.

1 pure-compute action through prism_dev:
  cap_bank_calculate -> calculate(input) returns 8 AtomicValue fields
                        + is_safe + recommendations[]

Wire-level discriminators:
  - is_safe + recommendation_count top-level
  - required_kvar / capacitance_uf / resonance_order flattened
    (saves caller AtomicValue.value unwrap)

Tests: 28/28 PASS (15 dispatcher + 13 engine-direct).

Algebraic invariants:
  - REFERENCE COMPUTATION: Q ≈ 55.3 kVAR for P=100kW, pf 0.75→0.95
    (verified against Math.tan(Math.acos(pf)) reference)
  - LINEARITY: Q scales linearly with P (50/100/200 kW yield 1×/2×/4×)
  - APPARENT POWER: S = P / pf (both before + after)
  - DEMAND REDUCTION: (1 - pf1/pf2) × 100 ≈ 21.05% for 0.75→0.95
  - CURRENT VARIABILITY: higher V → lower I (Ic = Qc·1000/(√3·V))
    verified at 240/480/4160V
  - PF VARIABILITY: lower starting PF needs more correction (verified
    at 0.6/0.75/0.85)
  - SAFETY GATES: pf1>pf2 + target_pf>0.98 trigger named recs

WIRE-UNWIRED-MS0 progress: 27->28 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../src/__tests__/CapacitorBankEngine.test.ts      | 144 +++++++++++++++
- .../src/__tests__/dispatcher.capacitorBank.test.ts | 195 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  20 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  19 +-
- 4 files changed, 377 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9d34c4519794`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._