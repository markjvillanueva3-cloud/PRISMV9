# MCAT-MS0 Unwired Source Recovery Ledger

Date: 2026-04-02  
Parent milestone: `MCAT-MS0`  
Lane: `MCAT-MS0 / P1-U01 support`  
Roadmap unit: `U-MVAR05`

Derived from:

- [MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_VARIABILITY_CENSUS_2026-04-02.json)
- [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json)

## Intent

Turn every discovered source family into an explicit recovery, promotion, fallback-retirement, or metadata-reconciliation action so the remaining MCAT work is dependency-ordered instead of anecdotal.

## Summary

- Source families discovered: `36`
- Families needing recovery or promotion: `22`
- P0 denominator-recovery families: `3`
- P1 promotion/fallback-retirement families: `11`
- Baseline/no-action families: `14`

## Recovery Waves

- W2-fallback-retirement: `12` families, domains=workholding:5, calculator_fallback:4, cam_toolpaths:2, materials:1
- W0-denominator-recovery: `5` families, domains=tools:3, machines:1, materials:1
- W1-backend-promotion: `5` families, domains=tools:3, cam_toolpaths:1, materials:1

## Highest-Priority Families

- [tools] `tool_intended_historical_corpus` -> recover_missing_corpus (P0, W0-denominator-recovery)
- [tools] `tool_registry_active_unique_ids` -> reconcile_live_root_counts (P0, W0-denominator-recovery)
- [tools] `tool_registry_raw_rows` -> reconcile_live_root_counts (P0, W0-denominator-recovery)
- [cam_toolpaths] `backend_strategy_registry_header` -> promote_backend_surface (P1, W1-backend-promotion)
- [tools] `indexable_milling_toolholding` -> promote_backend_surface (P1, W1-backend-promotion)
- [tools] `toolholders` -> extend_holder_surface (P1, W1-backend-promotion)
- [tools] `turning_holders_expanded` -> promote_backend_surface (P1, W1-backend-promotion)
- [cam_toolpaths] `calculator_programming_environments` -> retire_fallback_surface (P1, W2-fallback-retirement)
- [cam_toolpaths] `calculator_toolpaths` -> retire_fallback_surface (P1, W2-fallback-retirement)
- [workholding] `chucks` -> replace_fallback_with_backend_surface (P1, W2-fallback-retirement)
- [workholding] `collets` -> replace_fallback_with_backend_surface (P1, W2-fallback-retirement)
- [workholding] `fixtures` -> replace_fallback_with_backend_surface (P1, W2-fallback-retirement)
- [workholding] `toolholders` -> replace_fallback_with_backend_surface (P1, W2-fallback-retirement)
- [workholding] `vises` -> replace_fallback_with_backend_surface (P1, W2-fallback-retirement)
- [machines] `machine_registry_header_claim` -> reconcile_metadata_claims (P2, W0-denominator-recovery)
- [materials] `material_registry_header_claim` -> reconcile_metadata_claims (P2, W0-denominator-recovery)

## Dominant Blockers

- Calculator still renders only a tiny static fallback for this domain.: `5` families
- Live backend parity does not exist yet for this fallback surface.: `4` families
- Lathe-style tooling layout is missing a published turret interface. (63 machines): `3` families
- Mill spindle interface is unpublished, so holder legality cannot be resolved. (8 machines): `3` families
- Zero-holder legality for gang:gang (34 machines): `3` families
- Zero-holder legality for turret:disc (7 machines): `3` families
- 337 calculator toolpaths are static while backend strategy registry headline is 762+ Strategies across 5 major categories.: `2` families
- Active live root counts still disagree with the intended corpus and SVI headline.: `2` families
- Published headers still disagree with live data on disk.: `2` families
- 13,967 active unique ids are still far below the 95,608 intended tool corpus.: `1` families
- 337 calculator toolpaths are still static versus 762+ Strategies across 5 major categories in the backend registry headline.: `1` families
- Currently documented or referenced, but not yet committed to a canonical live role.: `1` families
- Present on disk but not part of the current live registry load path.: `1` families

## Current Read

- `W0-denominator-recovery` is led by the tool corpus gap and metadata drift: the active tool roots still expose only `13967` unique tool ids versus the intended `95608`.
- `W1-backend-promotion` is led by holder and tooling families already present in backend truth but not fully promoted into calculator legality, especially swiss/gang and ambiguous turret-interface gaps.
- `W2-fallback-retirement` is led by workholding plus CAM/toolpath surfaces, where the calculator still uses static fallback data despite richer backend or reference corpora.

## Next

- Start `U-MVAR06` thin live proof only after the highest-priority `W0` and `W1` families are named and assigned to concrete implementation slices.
