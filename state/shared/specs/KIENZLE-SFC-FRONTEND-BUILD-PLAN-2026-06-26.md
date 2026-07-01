# Kienzle Speed-Feed — SFC Frontend Build Plan (slot:oscar, 2026-06-26)

> Source: 7-agent recon workflow `wf_87d16e85-c71` (design-feature spec + FE/BE wiring audit +
> design→backend capability map + canonical-data reconciliation + closed-loop accuracy baseline →
> synthesis), then **R12-verified** against live code. Operator work order: finish the new
> Claude-Design Kienzle Speed-Feed page, wire all SFC backend to its consumers, closed-loop test
> cutting-parameter accuracy, fine-tune. oscar OWNS the SFC frontend (operator directive 2026-06-22).

## Design source
`mcp-server/web/design-imports/kienzle-app-build/Kienzle Speed-Feed.dc.html` (727 lines). 3-column SFC
studio: left 4-section input (machine/material+stock/tool+holder/cut), center 3D cut viewport + 6-tab
chart panel, right results (4 SOLVE-FOR modes, aggression, solve-notes, rpm/feed cards, load+safety
donuts, force/deflection/life/wear/temp/confidence, entry-move, radar, vs-old). Its inline `solve()` is
a **client approximation** — the production page sources cutting numbers from the **real backend**.

## VERIFIED architecture decisions
- **Material physics: backend-only.** Design MAT table DIVERGES from canonical (`constants.ts`):
  ti64 kc 1450 vs canonical 2800 (−48%, under-states force → over-feeds — SAFETY-CRITICAL);
  4140 Taylor C 200 vs canonical 320 (−37.5%). **Delete the design MAT table; never port it.** Page
  sends material `id` + iso hint; `sf_orchestrate` resolves kc/mc/Taylor via
  `AISI_CUTTING_COEFFICIENTS` → `CANONICAL_KIENZLE/TAYLOR[iso]` fallback. (oscar-soul: no inline constants.)
- **Machine specs: backend-sourced.** `GET /api/v1/shop/machines` (`shopConfigurationEngine`). Design
  MACH catalog deleted. **Pre-req U-KSF-01:** the 5 JM mills (VMC-01..05) lack `max_rpm`/`max_power_kw`
  in `ShopConfigurationEngine.ts:324-357` (lathes have them) → orchestrator can't cap mill rpm/power.
- **Reuse the existing hook:** `useSpeedFeedOrchestrate` (`web/src/hooks/useSpeedFeed.ts`) →
  `sfOrchestrate` (`web/src/api/speedfeed.ts`) → `POST /api/v1/speed-feed/orchestrate`
  (`src/routes/speedfeed.ts:14`) → `prism_calc:sf_orchestrate` → `SpeedFeedOrchestratorEngine.compute`
  (`OrchestratorResult` interface `SpeedFeedOrchestratorEngine.ts:264-309`). No new hook/api needed.
- **iOS tokens** (fleet default, `web/src/index.css`): `rounded-ios-{sm,md,lg,xl}`, `shadow-ios-{1,2}`,
  `font-mono` numerics, `prism-glow-{cyan,violet,emerald,amber,red}`, `prism-chip`, `.ios-select`.
  SFC pages set `document.body.setAttribute('data-sf-density','compact')` on mount (clear on unmount).
  Toggles need `aria-pressed`; 44px tap targets (`min-h-11`); WCAG-AA.

## Adapter map (`OrchestratorResult` → design slot) — field names VERIFIED at :264-309
WIRED: rpm←`spindle_rpm`; feed←`feed_rate_mmmin`(÷25.4 ipm); fz←`feed_per_tooth_mm`(÷25.4 ipt);
sfm←`cutting_speed_mpm`(×3.281); MRR←`mrr_cm3min`(÷16.387 in³); Fc←`tangential_force_N`;
deflThou←`deflection_um`(÷25.4); toolLife←`tool_life_min`; confidence←`overall_confidence`(×100);
Ra←`surface_finish_Ra_um`(×39.37 µin); power←`power_kw`; torque←`torque_Nm`; iso/kc/hardness←
`resolved_material.*`; machine labels←`resolved_machine.*`; warnings←`safety_checks[]`(sorted, cap 4);
uncertainty CV←`uncertainty.*`; limiting←`limiting_factors[]`; stability←`stability_assessment`.
NEEDS_WIRING (adapter compose, no backend change): load%←`limiting_factors[power_kw].utilization_pct`;
safety-S←compose from `safety_checks` severities + worst `limiting_factors` utilization.
GAP→client fallback (`kienzleDerive.ts`): parts-per-edge, edge-wear, cut-temp (unless CONVERGE),
6 chart curves (client sweep), 4-mode radar (4× `sf_orchestrate`), entry-move, vs-old baseline.

## Build order (units)
- **U-KSF-01** (backend, FIRST): add `max_rpm`/`max_power_kw` to VMC-01..05 in `ShopConfigurationEngine.ts`
  (OEM-verified specs). Test via spindle-cap assertion + parity probe. Verifiable, no UI. SCOPED to mills
  (lathes already populated = whiskey's domain). Also confirm S7/H13/D2/A2 resolve to canonical H/K fallback.
- **U-KSF-02** (Tier A pure FE core): `pages/kienzle/data/kienzleCatalogs.ts` (display metadata only, ZERO
  kc/Taylor) + `lib/kienzleGeometry.ts` (3D viewport, pure) + `lib/kienzleCharts.ts` (6-tab curve samplers)
  + `lib/kienzleDerive.ts` (GAP fallbacks) + R9 tests (feed/vc identities, monotone lobe).
- **U-KSF-03**: `lib/kienzleAdapter.ts` + test with a real captured `sf_orchestrate` fixture.
- **U-KSF-04**: components (`KienzleInputColumn/Viewport/ChartPanel/ResultsColumn`) — per-file 2-arm scrutiny.
- **U-KSF-05**: `pages/KienzleSpeedFeedPage.tsx` + `App.tsx` route (`kienzle-speed-feed`, near line 208/427)
  + mount wire (`sf_resolve_material` for badge seeding) + 4-mode radar fan-out (`Promise.allSettled`).
- **U-KSF-06**: resurrect dead wire `/api/v1/sfc/deflection` as a cross-check consumer.
- **U-KSF-07** (closed-loop accuracy): run `sfc-engine-parity-probe.mjs` + `sfc-panel-validate-probe.mjs`
  + live `:3100` `/api/v1/speed-feed/orchestrate` probe + physics-invariant check (feed/vc identity) +
  optimize_for regression; record numbers; tune levers (`CANONICAL_TAYLOR` C/n → `CANONICAL_KIENZLE`
  kc/mc → optimize_for weighting → DL calibration); re-run.

## Top risks
1. Material-constant leak (design MAT) = over-aggressive feeds (ti64 −48% kc). Mitigation: delete the table; no client kc/mc/Taylor anywhere; no-inline-constants hook blocks it.
2. Mill machine specs missing (VMC-01..05 null rpm/hp). Mitigation: U-KSF-01 first, independently verifiable.
3. 4-mode radar = 4× round-trips per solve. Mitigation: debounce + `Promise.allSettled`; promote to a single `sf_multi_mode_compare` action only if p95 latency is bad (measure first).

## Status (live)
- [x] Reorient + recon + verification.  - [ ] U-KSF-01..07 (building).
