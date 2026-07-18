# SFC-PAGE-CLOSED-LOOP/U-SFC-MATERIAL-CANONICAL — [MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-MATERIAL-CANONICAL (slot:oscar): rewire ProductEngine inline MATERIAL_HARDNESS kc/mc/Taylor-C/n to canonical constants

**Commit:** `4ad8a0116b54` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T14:32:12-05:00
**Tags:** sfc-page-closed-loop, u-sfc-material-canonical, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-MATERIAL-CANONICAL (slot:oscar): rewire ProductEngine inline MATERIAL_HARDNESS kc/mc/Taylor-C/n to canonical constants

## Body
```
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-MATERIAL-CANONICAL (slot:oscar): rewire ProductEngine inline MATERIAL_HARDNESS kc/mc/Taylor-C/n to canonical constants

The SFC page (ProductEngine.sfcCalculate) carried its own INLINE MATERIAL_HARDNESS
table whose kc1_1/mc/Taylor C/n DIVERGED from the canonical source of truth
src/physics/constants.ts -- most consequentially 1045 steel Taylor C=250 vs the
ISO-3685 canonical 350, so the customer-facing page published tool life ~4x too
SHORT (live ~2.2 min vs ~9 min). Violated soul refuse inline-physics-constants.

Fix (R8 surgical): keep MATERIAL_HARDNESS shape (all ~6 consumers untouched) but
COMPOSE its kc1_1/mc/C/n at module load from canonical -- per-material
AISI_CUTTING_COEFFICIENTS override -> per-ISO CANONICAL_KIENZLE/CANONICAL_TAYLOR
fallback (mirrors buildMaterialPhysics precedence). resolveMaterial unknown-path
fallback also canonicalized (C=250 -> 350). +2 R9 canonical-bound tool-life locks
that fail on a revert to inline 250.

Vendor-parity RESOLVED: C=350 confirmed canonical by 3 in-repo sources
(AISI_CUTTING_COEFFICIENTS, CANONICAL_TAYLOR.P, physics/CLAUDE.md) + Machinery's
Handbook/Kennametal. physics-reviewer PASS (no P0/P1; temper-strip + TDZ verified).
26/26 page + 75/75 SFC-path tests; changed files type-clean.
```

## Files touched (3)
- .../sfc-jm-fleet-page-closed-loop.test.ts          |  46 ++++++++
- mcp-server/src/engines/ProductEngine.ts            | 127 ++++++++++++++++-----
- 2 files changed, 146 insertions(+), 27 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ad8a0116b54`
- Milestone envelope: `mcp-server/data/milestones/SFC-PAGE-CLOSED-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._