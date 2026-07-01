---
name: reference_quebec_vendor_compare_fe_2026_06_22
description: Quebec wired the vendor tri-compare FE vertical slice (sfc.vendor_parity) 2026-06-22 -- the corrected F1 -- after the pre-grep master-graph caught that the backend already existed (oscar), turning a planned grant-retraction into a build.
type: reference
slot: quebec
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.140Z
aliases: reference_quebec_vendor_compare_fe_2026_06_22
---


# Quebec vendor tri-compare FE (2026-06-22) -- the corrected F1

Operator /checkin-quebec /goal /loop (4th run of the same launch directive) + "build". Closed the
SFC entitlement-honesty findings (F1-F5) on quebec's side.

## Shipped (cad-fusion-live-ms0, [MAIN-FORCE])
- **F4 `647bf46e55`** -- pricing comparison matrix renders not-yet-live cells (quoting/erp) as "Soon"
  not a green "Included" check. New pure `matrixCellToken(feature,plan)` in `web/src/data/pricing.ts`
  + `CellMark` Soon branch. 2-of-2 scrutiny PASS.
- **F2 `61b471dd11`** -- gated the `/vibration` route to `sfc.sld` (App.tsx) -- it was an ungated
  revenue leak (a paid feature reachable free). Added `['vibration','sfc.sld']` to routeFeatureGates
  EXPECTED_GATES so the gate cannot silently re-drop. 2-of-2 PASS.
- **F1 `a97e573e3e` (+ test follow-up)** -- the vendor tri-compare FE VERTICAL SLICE. See below.
- Findings doc + handoff updated; F3 (calibration_overrides) + F5 (sf_stochastic policy) are oscar-entangled.

## F1 -- the catch + the build (the important part)
The original F1 finding said `sfc.vendor_parity` was "genuinely unimplemented but advertised + granted
by the $299 perpetual" -- which would lead to RETRACTING it from the grant (the direction of the earlier
reverted FAIL `61fb30b63d`). **The pre-grep master-graph surfaced `U-OSC-COMPARE-PER-VENDOR`**, and live
verification proved the premise STALE: oscar already built the backend --
`SpeedFeedTriComparatorEngine.ts` (PRISM x baseline x HSMAdvisor x G-Wizard + per-vendor published deltas)
wired as `prism_calc:speed_feed_tri_compare` (`calcDispatcher.ts:9874`). The gap was purely FE.

So the comprehensive route (R13) was to **WIRE the FE, not retract the grant** -- making the $299 grant
honest by delivering the feature. The 8-file vertical slice:
1. HTTP route `POST /api/v1/speed-feed/tri-compare` (`routes/speedfeed.ts`) forwarding to the action,
   mirroring `/compare`.
2. `web/src/types/speedfeed.ts` -- `TriCompareInput`/`TriCompareResult` mirroring the engine exports.
3. `web/src/api/speedfeed.ts` -- `sfTriCompare` unwraps the `{result:{success,result}}` double-envelope
   (dispatcher `{success,result}` + route `{result}`) to a clean `TriCompareResult`, throws on failure.
4. `web/src/hooks/useSpeedFeed.ts` -- `useSpeedFeedTriCompare` (the custom `useApiCall`, NOT TanStack).
5. `web/src/pages/VendorComparePage.tsx` -- input form + 4-system table + `prism_vs_consensus` verdict
   badges + per-vendor deltas + loading/error/empty; `available:false` vendors (HSMAdvisor/G-Wizard not
   installed) render the honest reason, never a fabricated number (quebec soul).
6. `App.tsx` -- lazy route `/vendor-compare` gated `<FeatureGate feature="sfc.vendor_parity">`.
7. routeFeatureGates EXPECTED_GATES + `VendorComparePage.test.tsx` (7) + `speedfeedApi.test.ts` (4 -- the
   real unwrap, closing an arm-C P2). 3-of-3 scrutiny PASS.

## Lessons (reinforced)
- **Verify "feature unimplemented" against the master graph + dispatcher + engine, NOT just FE pages.**
  The pre-grep graph inject is load-bearing -- it caught the exact under-verification that caused the
  reverted FAIL. [[feedback_never_claim_absence_without_deep_search]]
- **Backend-exists-but-FE-unwired = WIRE it (R13), do not retract the advertised grant.** Cheaper for the
  customer's trust + honest at launch. The dual nature (engine wired, no HTTP route, no FE) is common.
- **Run vitest/tsc FROM `mcp-server/web`** -- a `cd /h/prism` for git leaves the persistent CWD at repo
  root, where vitest hits the wrong config + tsc checks the backend (61 pre-existing unrelated errors).
- Per-chat handoff `--terminal` must be the 8-hex chatId (`claude-e67fc612`), not the full UUID (HS-01).

Related: [[reference_quebec_launch_shells_activated_2026_06_22]] (F2/F4 + the reverted FAIL) ·
[[reference_oscar_sfc_frontend_wiring_map_2026_06_22]] (oscar's SFC FE map).
