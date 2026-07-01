# QUOTING-SYNERGY-MS0/U-QP-CONSUME-FMV-DEDUP — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CONSUME-FMV-DEDUP (slot:charlie): canonical confidence-gated material-cost primitive [MAIN-FORCE]

**Commit:** `bc089a30cc1e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T00:32:32-05:00
**Tags:** quoting-synergy-ms0, u-qp-consume-fmv-dedup, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CONSUME-FMV-DEDUP (slot:charlie): canonical confidence-gated material-cost primitive [MAIN-FORCE]

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CONSUME-FMV-DEDUP (slot:charlie): canonical confidence-gated material-cost primitive [MAIN-FORCE]

DEDUP (R8) of the cost-basis->FMV lever: the volume->cost primitive
(materialCostForVolume) AND the FMV material_cost_per_part_override slot both already
existed; InstantQuoteEngine RE-IMPLEMENTED the high-confidence gate inline. Makes the
gate canonical+reusable and closes a latent risk.

- materialCostForVolume gains opts.minConfidence ('high'|'low-n'); default 'low-n' is
  byte-identical back-compat. 'high' REFUSES low-n AP-ledger outliers (D2 -> $251/in3,
  ~40x other tool steels) -> reason 'below-min-confidence'. CONF_RANK ordinal (no price const).
- Defense-in-depth: malformed high-conf row usd_per_in3<=0 -> advisory-only (reviewer-A P2 auto-fix).
- InstantQuoteEngine dedup'd onto the primitive (minConfidence:'high'); byte-equivalent.
- minConfidence exposed through prism_quoting:material_cost_basis schema+dispatcher.
- 27 tests; tsc clean (my files); 2-reviewer per-file scrutiny PASS/PASS 0 P0/P1.
- LIVE-VALIDATED vs real basis: H13 $6.19/S7 $4.91/A2 $5.58/4140 $6.48/1045 $3.39 consumed;
  D2 default $1006.61 outlier -> high-gate REFUSED.

Lane: committed to cad-fusion-live-ms0 trunk via [MAIN-FORCE] -- slot/charlie is 3486 behind
and lacks the materialCostForVolume dependency entirely; quoting galaxy develops on the trunk
(cf ba9631271f, 492197ab37).
```

## Files touched (6)
- mcp-server/src/__tests__/MaterialCostBasisWire.test.ts | 65 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/InstantQuoteEngine.ts           | 22 +++++++++-----------
- mcp-server/src/engines/VendorCostIndexEngine.ts        | 26 +++++++++++++++++++++--
- mcp-server/src/schemas/quotingActionSchemas.ts         |  1 +
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts  |  4 ++--
- 5 files changed, 102 insertions(+), 16 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bc089a30cc1e`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._