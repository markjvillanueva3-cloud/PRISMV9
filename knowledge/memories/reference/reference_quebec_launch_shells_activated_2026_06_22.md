---
name: reference_quebec_launch_shells_activated_2026_06_22
description: Quebec session 2026-06-22(b) — verified the FE commercial spine is essentially complete (QX1-8/QX3/QX4b all shipped), activated+hardened the Electron + Capacitor 6 app shells, fixed an untracked web/package.json bug, and wrote LAUNCH-READINESS v3.
type: reference
slot: quebec
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.139Z
aliases: reference_quebec_launch_shells_activated_2026_06_22
---


# Quebec launch session 2026-06-22 (b) — shells activated, FE spine verified complete

Operator /checkin-quebec /goal /loop: reorient, assess all chats/roadmaps/frontends, complete
SFC/post/quoting/ERP frontends + pricing, launch soon. THIRD run of this same directive.

## Reorientation truth (R12 — the docs were STALE; verified live)
The prior plan docs (LAUNCH-EXECUTION-DELTA v2) listed items as pending that were ALREADY SHIPPED:
- **QX1-QX8 + QX3 (SFC Taylor de-inline) + QX4b (owned-controllers) are ALL SHIPPED.** Commercial spine
  (pricing.ts + PricingPage + SubscriptionPage + entitlement keystone + admin + license keys), the
  Stripe conversion loop, route gating, SFC 9-axis exposure, and the Taylor safety de-inline
  (`lib/toolLifeCurve.ts`, commit `2ec4e1e904`) all landed in prior sessions.
- Web app: **157 pages** (was 102). Quoting = 10 FE pages, ERP/business = 29 FE pages — DEEP, not missing.
- **The FE is NOT the launch bottleneck.** The web app is wave-1 SFC launch-capable today. The hard
  blockers are CROSS-SLOT backend gates: echo post-G-code safety (AlarmDB->P5, U-PP-L1) + papa
  live-Stripe/entitlement E2E. Quoting (charlie, 71% MAPE) = wave-2; ERP (hotel) = wave-3.

## Shipped this session
- **U-Q-SHELL-ACTIVATE** (`13ba7f2e1a`): activated Electron (`electron@31`+`electron-builder@25`,
  scripts `electron:start/dev/build`; HashRouter-when-desktop was already done in `lib/desktopRouter.ts`)
  + Capacitor 6.2.1 (`@capacitor/core/android/ios`+`cli`, scripts `cap:copy/sync`+`mobile:add:*`).
  `appShell.test.ts` guards secure defaults + config + scripts. 3-of-3 scrutiny PASS.
- **U-Q-SHELL-HARDEN** (`a0d3146f89`): closed the 3-of-3 P2s — electron-builder `build` block
  (`directories.output: dist_electron`, no Vite-dist collision) + main.cjs scheme-allowlist on
  `setWindowOpenHandler` (https/http/mailto only, no file:// to OS) + `will-navigate` origin pin. 19/19 tests.
- **LAUNCH-READINESS-2026-06-22-v3.md** (`state/shared/specs/`): verified-live completion plan, supersedes v2.

## BUG FOUND (R12, bug-finding) — web manifest was never git-tracked
`mcp-server/web/package.json` + `package-lock.json` were **never tracked** (not gitignored — verified
`git check-ignore` empty), though every OTHER package.json in the repo IS tracked (root, mcp-server,
cqask/ui, mcp-cadquery/frontend, mcp-dev-tools). A fresh clone could not `npm install` the web frontend.
Prior sessions' dep edits (pricing deps, etc.) lived only locally. Now tracked (committed in 13ba7f2e1a).
Lesson: when a manifest shows `??` while sibling src files are tracked, check it's an oversight not an ignore.

## Remaining (next quebec pickups — all NON-launch-blocking)
- SFC standalone panel parity: port SLD/chatter + vendor tri-compare + calibration from the 12.9k-LOC
  `CalculatorPage` studio to `SfcCalculatorPage`, each gated (`sfc.sld`/`sfc.vendor_parity`/`sfc.calibration`).
  Raises SFC 0.85->0.95. Bounded multi-file port.
- Electron visual launch-test (needs a display) + signing; native `npx cap add ios|android` (needs Xcode/Android SDK).
- Per-route 403->upgrade UX rollout as each backend owner gates their route.

## Cross-slot asks (launch-gating — in LAUNCH-READINESS v3 §4)
echo: AlarmDB->post P5 safety gate (wave-1 blocker). papa: live-Stripe + entitlement E2E (wave-1 blocker).
charlie: quoting accuracy under sell-gate (wave-2). hotel: ERP depth audit (wave-3).

## SFC entitlement-honesty audit (same session, continuation) — scrutiny caught a bad fix
Attempted to gate `sfc.sld`/`sfc.vendor_parity`/`sfc.calibration` as `FEATURE_NOT_YET_LIVE`
(commit `61fb30b63d`) because they had no UI on `SfcCalculatorPage`. **3-of-3 scrutiny FAILed it →
REVERTED `80530cee81`.** Two failures: (1) premise under-verified — I checked only `SfcCalculatorPage`
+ speedfeed/sfc routes and MISSED that `sfc.sld` is LIVE on the ungated `/vibration` page
(`VibrationPage` → `/api/v1/vibration/*`) and `sfc.calibration` is partly reachable via `/speed-feed`
`calibration_overrides`; (2) I ran only `pricing.test.ts`, not the sibling `entitlement.test.ts` +
`FeatureGate.test.tsx` that own `canUseFeature` — my change broke 3 of their pre-existing assertions
(shipped partial-green = R12 violation). **LESSON (feedback): verify a "feature is unimplemented" claim
against EVERY page/route (grep ALL of web/src + routes), not one page; and run the sibling test files
that own the function you changed, not just the file you edited.** The scrutiny surfaced 5 real gaps,
documented in `state/shared/specs/SFC-ENTITLEMENT-FINDINGS-2026-06-22.md` (commit `de2a9f17fc`):
F1 vendor_parity genuinely unimplemented but advertised + granted by the $299 perpetual; F2 `/vibration`
ungated → `sfc.sld` (paid) free to all (revenue leak); F3 `/speed-feed` calibration_overrides effect
unverified (oscar); F4 pricing matrix shows "Included" for not-yet-live quoting/erp (display contradiction);
F5 `sfc.stochastic` orphaned. **F2 (gate the leak) + F4 (matrix coming-soon) are the two to do before the
public pricing page ships — clean quebec follow-ups, each needs its own full test run.**

Lane: slot/quebec worktree DORMANT; fleet commits `[MAIN-FORCE]` on cad-fusion-live-ms0 via
`PRISM_GIT_ADD_LANE_DISABLE=1 git add <files> && git commit` (one bash call). ASCII-only in code.
Related: [[reference_quebec_launch_frontend_2026_06_22]] · [[reference_quebec_commercial_spine_2026_06_21]].
