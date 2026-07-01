# SFC Entitlement / Launch-Honesty Findings — 2026-06-22 (slot:quebec)

> Surfaced by a 3-of-3 adversarial scrutiny of a quebec attempt to gate "unimplemented"
> advanced SFC features as `FEATURE_NOT_YET_LIVE`. **That commit (`61fb30b63d`) was REVERTED
> (`80530cee81`)** — its premise was under-verified (it only checked `SfcCalculatorPage` +
> the speedfeed/sfc routes and MISSED the `/vibration` + `/speed-feed` pages) and it broke 3
> pre-existing tests. Net code change this round: zero. But the scrutiny verified 5 real
> issues worth fixing properly. **Lesson (R12/R8): verify a "feature is unimplemented" claim
> against EVERY page/route, not one page, before gating it — and run the sibling test files
> that own the changed function, not just the one you edited.**

## The 5 verified findings (with owner + correct fix)

### F1 — `sfc.vendor_parity` backend EXISTS (oscar); the gap is the FE wiring, NOT the feature (quebec) [PREMISE CORRECTED 2026-06-22(c)]
- **CORRECTION (R12/R8, verified 2026-06-22(c)):** the original F1 claim "genuinely unimplemented" was
  STALE/UNDER-VERIFIED. oscar already shipped the vendor-parity BACKEND:
  - Engine `mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts` (OSCAR-SFC-3WAY-MS0/U-TRI-COMPARE) —
    PRISM x baseline(literature) x HSMAdvisor(live) x G-Wizard(crib) on one axis basis + consensus +
    per-vendor published deltas (`U-OSC-COMPARE-PER-VENDOR`, commit `4c544db4ae`: explicit
    PRISM-vs-G-Wizard(CNCCookbook) + PRISM-vs-HSMAdvisor(published) deltas in `baseline_detail.per_source`).
  - Dispatcher action `prism_calc:speed_feed_tri_compare` — wired `calcDispatcher.ts:1119` + case `:9816`
    (`speedFeedTriComparatorEngine.run`), shipped `U-OSC-WIRE-TRIVENDOR` 2026-06-08.
  - So vendor_parity is **backend-implemented, frontend-unwired** — NOT unimplemented.
- **The real gap (all quebec):** (1) NO HTTP bridge route exposes `speed_feed_tri_compare`
  (`mcp-server/src/routes/speedfeed.ts` has orchestrate/quick/stochastic/resolve/compare/optimize/
  inventory-select/tool-roi — no `tri-compare`); (2) no FE api client / hook; (3) no page consuming it.
  The matrix/card/grant that "oversell" it are then HONEST once the FE lands.
- **CORRECTED FIX (comprehensive route R13 — do NOT retract the $299 grant):** quebec wires the vertical
  slice: (a) HTTP route `POST /speed-feed/tri-compare` -> `callTool("prism_calc","speed_feed_tri_compare",body)`
  (mirror the `/compare` route exactly, `speedfeed.ts:60-66`); (b) FE api client `sfTriCompare` + types in
  `api/speedfeed.ts`; (c) hook `useSpeedFeedTriCompare` in `hooks/useSpeedFeed.ts`; (d) a `VendorComparePage`
  (or a gated tab) rendering the 4-system table (PRISM/baseline/HSMAdvisor/G-Wizard x vc/fz/rpm/feed/mrr) +
  the `prism_vs_consensus` verdict + per-vendor `baseline_detail` deltas, with loading/error/empty states;
  (e) route it + gate `<FeatureGate feature="sfc.vendor_parity">`; (f) add to `routeFeatureGates.test.ts`
  EXPECTED_GATES + api/hook tests. Backend I/O contract verified live (TriCompareInput/TriCompareResult,
  engine lines 75-201). This is a real quebec FE build (~6 files) — start it on a FRESH token budget.
- **Backend I/O contract (verified live, for the next chat):** input `{material:{iso_group|name,hardness},
  tooling:{tool_diameter_mm,flutes,tool_material,...}, toolpath:{operation,cut_type,axial/radial_depth_mm},
  optimization_mode, include_baseline/hsmadvisor/gwizard}` -> output `{systems:[{system,available,axes:{vc_mpm,
  fz_mm,rpm,feed_mmmin,mrr_cm3min},source_note,aligned?}], consensus, prism_vs_consensus:{per_axis:[{axis,
  prism,consensus,delta_pct,verdict,agreement}],overall_agreement,verdict_summary}, baseline_detail:{per_source},
  warnings}`. HSMAdvisor/G-Wizard degrade to `available:false` (not installed) — the FE must render that honestly.

### F2 — `/vibration` page is UNGATED → `sfc.sld` (a paid feature) is free to everyone (quebec) **[revenue leak]**
- **Verified:** `VibrationPage.tsx` (route `/vibration`, `App.tsx:373`) is live + ungated, consuming the full
  SLD/chatter backend (`useVibrationStabilityLobes`/`Chatter`/`Modal`/`Damping` → `/api/v1/vibration/*`,
  `api/vibration.ts:23-27`). So `sfc.sld` IS a shipped, working feature — but reachable by ANY signed-in user
  including `free`, while the matrix sells it as starter+.
- **Fix:** wrap the `/vibration` route (or page body) in `<FeatureGate feature="sfc.sld">` so it matches the
  matrix (starter+). This is the highest-ROI fix — it plugs a paid feature leaking for free.

### F3 — `/speed-feed` accepts `calibration_overrides`; `sfc.calibration` may be reachable (quebec+oscar)
- **Verified:** `SpeedFeedPage.tsx` (route `/speed-feed`, ungated) sends `calibration_overrides`
  (vc_factor/power_factor/kc1_1_factor/ra_factor/taylor_*) into `/speed-feed/orchestrate`
  (`SpeedFeedPage.tsx:302-308,628-639`) and renders a `stability_assessment`.
- **Unverified:** whether `sf_orchestrate` actually HONORS `calibration_overrides` (could be a dead input).
- **Fix:** oscar confirms orchestrate honors the overrides. If yes → `sfc.calibration` is live (do NOT gate
  not-yet-live) and `/speed-feed` should be gated to it; if the overrides are dead → that's a separate bug to log.

### F4 — Pricing matrix shows "Included" green-checks for not-yet-live features (quebec) **[pre-existing]**
- **Verified:** `PricingPage.tsx` renders `entitlementLabel(ENTITLEMENT_MATRIX[fk][plan])` = "Included" for the
  per-plan cells (`PricingPage.tsx:236-242`), while the `FEATURE_NOT_YET_LIVE` "coming soon" badge appears ONLY
  in the left label cell (`PricingPage.tsx:230-234`). So `quoting`/`erp` (legitimately not-yet-live TODAY) show
  a green "Included" check in the same row that says "coming soon" — a contradiction a prospect sees.
- **Fix (clean, in-lane, independent of F1-F3):** in the matrix cell render, when `isNotYetLive(fk)`, render
  "Soon"/em-dash instead of the included-check. Fixes quoting/erp now and any future not-yet-live feature. Add a
  test. This is the safest standalone improvement.

### F5 — `sfc.stochastic` is two-sided: a free-leaking advisory AND an orphaned dedicated endpoint (quebec+oscar) [INVESTIGATED 2026-06-22(c)]
- **Verified (the orphan):** `sfStochastic`/`useSpeedFeedStochastic` (`api/speedfeed.ts:229`, `hooks/useSpeedFeed.ts:42`)
  + backend `/speed-feed/stochastic` (the dedicated `sf_stochastic` full-Monte-Carlo endpoint) exist, but grep finds
  ZERO non-test consumers -- the dedicated heavy-MC feature has NO UI. A pro+ user paying for `sfc.stochastic` cannot
  reach the dedicated endpoint.
- **Verified (the free leak):** the orchestrate result's `uncertainty` block (CI95 / cv% / chatter probability / weibull /
  sobol) IS surfaced -- `UncertaintyAdvisoryBanner` renders it on `SpeedFeedPage.tsx:657` (route `/speed-feed`, which is
  in `MUST_STAY_OPEN` -- ungated, the free funnel entry). So the *substance* of stochastic uncertainty is reachable by
  ANY user incl free, while the matrix sells `sfc.stochastic` as pro+.
- **The decision (oscar-owned, NOT a clean unilateral quebec build):** does `sfc.stochastic` mean (a) the orchestrate
  uncertainty block (already shown -- then either re-tier it to free in the matrix, or gate the banner, but gating an
  advisory on the open funnel page is a UX/funnel call), or (b) the dedicated `sf_stochastic` full-MC (orphaned -- then
  wire a UI, likely INTO the existing `AdvancedSpeedFeedPanel` to avoid duplicating the uncertainty banner)? oscar owns
  whether `sf_stochastic` is materially deeper than the orchestrate uncertainty. Do NOT build a second stochastic UI
  speculatively (dup risk vs the banner) nor gate the funnel page without the funnel owner's sign-off.
- **Recommended:** oscar confirms the sf_stochastic-vs-orchestrate-uncertainty distinction; then quebec either wires the
  dedicated MC into the gated AdvancedSpeedFeedPanel (consistent with F1's wire-don't-retract) or re-tiers the matrix row.
  Lowest priority of the five; not a launch blocker.

## Recommended order (safest-first)
1. **F4 — SHIPPED 2026-06-22(c), commit `647bf46e55`** (matrix coming-soon display via `matrixCellToken`;
   pricing.test.ts +5; 2-of-2 scrutiny PASS). quebec.
2. **F2 — SHIPPED 2026-06-22(c), commit `61b471dd11`** (gated `/vibration` to `sfc.sld` + EXPECTED_GATES
   entry; plugged the paid-feature-for-free leak; 2-of-2 scrutiny PASS). quebec.
3. **F3** (oscar confirms `calibration_overrides` effect) → then gate `/speed-feed` or confirm calibration live.
4. **F1 — SHIPPED 2026-06-22(c), commits `a97e573e3e` (FE vertical slice) + test follow-up.** Wired the
   vendor tri-compare FE (HTTP route `/speed-feed/tri-compare` → api `sfTriCompare` → hook → `VendorComparePage`
   → gated `<FeatureGate feature="sfc.vendor_parity">` route `/vendor-compare` → routeFeatureGates EXPECTED_GATES
   + 11 tests). The $299 grant + Starter "vendor tri-compare" bullet are now HONEST (feature is live), NOT
   retracted. 3-of-3 scrutiny PASS. quebec.
5. **F5 — INVESTIGATED 2026-06-22(c): two-sided + oscar-owned (see F1-style detail above).** The dedicated
   `sf_stochastic` endpoint is orphaned (no UI) AND the orchestrate uncertainty advisory leaks free on the open
   `/speed-feed` funnel page. Needs oscar's sf_stochastic-vs-orchestrate-uncertainty call before quebec wires/re-tiers.
   Lowest priority; not a launch blocker. quebec+oscar.

_None of these are wave-1 launch blockers for the SFC SUBSCRIPTION itself (basic + 9-axis are genuinely live + gated).
F2 (the free leak) and F4 (the honesty contradiction) are the two worth doing before any public pricing page goes live._
