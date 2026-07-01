# SFC-WIRING-MS0/U-SFC-DEFAULT-ISO-FROM-NAME — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-DEFAULT-ISO-FROM-NAME (slot:oscar): resolve iso_group from material.name so the P/M-milling-roughing default fires for name-only callers

**Commit:** `c212207b0cdb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T13:48:42-05:00
**Tags:** sfc-wiring-ms0, u-sfc-default-iso-from-name, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-DEFAULT-ISO-FROM-NAME (slot:oscar): resolve iso_group from material.name so the P/M-milling-roughing default fires for name-only callers

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-DEFAULT-ISO-FROM-NAME (slot:oscar): resolve iso_group from material.name so the P/M-milling-roughing default fires for name-only callers

The operation+group-scoped shop_recommended default (4fbec2e9fb) gated on an EXPLICIT
input.material.iso_group, so callers passing only material.name (common case) stayed
balanced and the milling-roughing accuracy win never fired for them. Now the scope
resolves the group from the name when iso_group is absent.

Change (SpeedFeedNineAxisOrchestratorEngine.ts translateToUltimate):
  const grp = input.material.iso_group
    ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group;
- getMaterialProfile (UltimateSpeedFeedEngine.ts:3138) is the engine's CANONICAL resolver:
  EXACT alias match via MATERIAL_ALIASES (not a substring scan). So "tool_steel" resolves
  to ISO H -- NEVER mis-read as P -- which a naive "...steel..." substring check would
  wrongly over-speed. Unresolved name -> null -> undefined -> balanced (fail-safe).
- `??` short-circuits when iso_group is set: byte-identical for existing callers; the RAW
  input.material.iso_group still flows to the engine (L819) so downstream physics is
  unchanged; the resolved grp drives ONLY the shop_recommended-vs-balanced goal choice.

Safety: reviewer enumerated every MATERIAL_DB alias -- the ONLY names resolving to P/M are
genuine steels/stainless; every hardened/abrasive name (tool_steel/d2/h13/a2/m2/s7/o1/cpm
-> H, cast iron -> K, Ti/Inconel -> S, aluminum -> N) stays balanced. No over-speed path.

Tests (+2 name-only guards): 125 pass (64 orch + 61 engine), tsc clean. "steel" name (no
iso_group) milling-roughing -> shop_recommended (ratio >0.7); "tool_steel" name -> balanced
(ratio <0.7). 2-arm scrutiny PASS (reviewer + code-analyzer, 0 P0/P1).

Refs: reference_oscar_sfc_shop_recommended_2026_06_19.md. Completes the shop_recommended
default arc (engine core + scoped default + name resolution).
```

## Files touched (3)
- .../src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts    | 31 ++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts    |  8 +++++++-
- 2 files changed, 38 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrongly over-speed. Unresolved name -> null -> undefined -> balanced (fail-safe).
- till flows to the engine (L819) so downstream physics is

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c212207b0cdb`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._