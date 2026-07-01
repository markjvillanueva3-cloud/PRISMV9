# PRISM Launch Status — 2026-06-23 (evening, slot:quebec)

> **Supersedes** the readiness/gap claims in `PRODUCT-LAUNCH-COMPLETION-PLAN-2026-06-20.md`
> and `LAUNCH-EXECUTION-DELTA-2026-06-22.md` (both still say Electron/Capacitor = ZERO —
> **now false**, verified live this session). Pricing canonical stays
> `PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md`. The ONE re-runnable source of truth is the
> harness: `node scripts/verify-launch-readiness.mjs` → `LAUNCH-READINESS-LIVE.md`.

## TL;DR (R12-honest)
The beachhead product — **SFC + a single post-processor + subscription/one-time billing** — is
**code-complete**. The operator's recurring premise ("SFC/post/quoting/ERP should be much further
along than the wizards") is **inverted**: those backends are the deepest in the repo, and across the
last four sessions quebec has shipped the FE exposure + the whole commercial spine. The remaining
launch items are **operator action** + **cross-slot E2E proofs** + genuinely-deferred waves —
**not missing quebec FE code.** Harness: **9/9 PASS**.

## What is BUILT (verified live this session, with evidence)

### Frontend product surfaces — COMPLETE
- **SFC** (`/speed-feed-calc`): 9-axis advanced panel (`AdvancedSpeedFeedPanel.tsx`), vendor-parity
  compare (`/vendor-compare`→`sfc.vendor_parity`), SLD/chatter (`/vibration`→`sfc.sld`), tool-life
  curve sourced from the **canonical backend** (`sfcApi.toolLife`→`prism_calc:tool_life`; the inlined
  Taylor constants in `AdvancedCharts.tsx` were removed — QX3 safety/doctrine violation closed).
- **Post-processor**: store (`PostProcessorStorePage` — owned-controller display via
  `billingApi.getLicenses()`, "Owned/Included/Buy"), generator (`/ppg`, `/ppg-lite`, gated
  `post.generate`), **PREVIEW-ONLY safety fence** (`postExportSafety.ts` — unvalidated G-code stamped
  `_PREVIEW_unvalidated.nc` so it can never masquerade as machine-ready).
- **Commercial/entitlement layer**: `FeatureGate` + `UpgradePrompt` + reactive `GatedError` (403→upgrade)
  wired across 11 paid pages; `useEntitlement` live-plan hook; `requireTier` middleware on the paid
  SFC route; checkout outcome page + Stripe redirect; customer signup + login-token fix.
- **Pricing** (`web/src/data/pricing.ts`, 14/14 tests): subscription $0/$29/$79/$199/$499 (annual=10×)
  + **one-time SFC $299** + **one-time single post $199/controller** (+5-pack $799 / all $2,499) +
  19-feature per-seat entitlement matrix + `creditOnUpgrade`. **Matches the operator directive exactly.**

### Channels — COMPLETE (the 06-22 doc's "ZERO" is stale)
- **Electron desktop**: `web/electron/{main,preload}.cjs`, `electron@31` + `electron-builder@25`,
  `electron:build/dist/nsis` scripts, NSIS installer config (appId `tools.prism.app`). Dev-runnable;
  signing/visual-test need a display + operator.
- **iOS + Android**: `capacitor.config.json` + full native `ios/` (Xcode project, AppDelegate.swift)
  and `android/` (gradle, AndroidManifest) projects; `@capacitor/{core,ios,android,cli}@6.2.1`; the
  Vite `dist/` is already copied into both. `npx cap add ios|android` was actually run. **Building the
  signed binaries needs Xcode (macOS) / Android SDK — not available on this Windows box.**
- **One Vite `dist/` → all three shells** (web + electron + capacitor) — every finished page ships in
  every form factor for free.

### Backend / safety launch gates — VERIFIED (now harness-checked)
- **Stripe webhook security**: `routes/billing.ts` `createBillingWebhookRouter()` (U-COMM-02) verifies
  the signature (raw body, live-mode rejects forged events → 400); the old insecure handler was removed.
- **Entitlement enforcement**: `requireTier(...)` middleware wired on the paid SFC `/calculate` route.
- **Post safety**: `PostProcessorPipelineEngine` P5 stage `5.1b_alarm_check` cross-references
  `AlarmRegistry` + RPM/feed exceedance, plus `5.10_omega_safety_gate`.

## What REMAINS for launch (NOT quebec FE code)
| Item | Owner | Type | Note |
|---|---|---|---|
| Provision Stripe **LIVE keys** + live test charge (U-COMM-07) | **operator** | action | the only hard gate to first revenue |
| Entitlement + live-Stripe **E2E proof** through the dispatcher | papa | verification | middleware coded; needs an E2E test, not a build |
| Quoting accuracy (**71% MAPE**) | charlie | WAVE 2 | do NOT sell quotes until it clears its gate (charlie active now) |
| ERP page-depth audit | hotel | WAVE 3 | not a beachhead blocker |
| Signed desktop/mobile binaries | operator/quebec | action | needs display (electron signing) + Xcode/Android SDK |

## This session's build (slot:quebec)
Extended `scripts/verify-launch-readiness.mjs` from **5 FE invariants → 9 launch-gate checks** by adding
4 deterministic **cross-slot + safety** checks (`commerce.webhook-sig`, `commerce.entitlement-enforced`,
`safety.post-alarmdb-gate`, `safety.post-export-fence`) — so ONE re-runnable command reports the
**whole-product** launch state instead of deferring cross-slot gates to a drift-prone doc (the exact
failure mode this harness was built to kill). Tests **19/19** (each new check pass + broken input, R9).
Live: **9/9 PASS**. Cron alert label corrected (`launch-readiness-cron.mjs`).

## Stack utilization (operator directive)
Harness (build-on, not rebuild) ✓ · loop-engineering (bookended loop-state) ✓ · obsidian vault (read
prior 4 sessions before acting) ✓ · launch-readiness CRON (live, 7:13 AM daily) ✓. No ultracode/Hermes
fan-out — prior session proved mechanical fan-out gets Claude-rate-limited; this was a focused
single-file harness build where fan-out adds cost, not value (R5).

_slot:quebec, 2026-06-23 evening. The drifted dated plans are retained for history; trust the harness output._
