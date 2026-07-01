# PRISM Launch-Readiness v4 -- verified live (2026-06-23, slot:quebec)

> **Supersedes** LAUNCH-READINESS-2026-06-22-v3.md. Verified against `cad-fusion-live-ms0`
> HEAD by reading live code + a new deterministic harness (R12), NOT the plan docs.
> **Live FE truth is now auto-generated** -> `state/shared/specs/LAUNCH-READINESS-LIVE.md`
> (regenerate any time: `node scripts/verify-launch-readiness.mjs`). This narrative doc adds
> the cross-slot path + pricing confirmation the harness does not cover.
> **Pricing canonical** stays `PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md` (unchanged, complete).

---

## 0. Headline (the honest reorientation)

The operator perceived SFC / post / quoting / ERP frontends as "behind the 3 wizards." **Live code says
the opposite: the frontend commercial spine is essentially COMPLETE** (157 pages; QX1-QX8 + F1/F2/F4
shipped; entitlement keystone + pricing + Stripe conversion loop + route-gating all live; Electron +
Capacitor scaffolded). The new harness confirms **all 5 quebec-ownable FE launch invariants PASS**.

The launch bottleneck is **NOT the frontend.** It is (a) two **cross-slot backend gates** and (b) two
**native app-shell steps** that need a Mac / display. quebec's launch FE work is done bar polish.

## 1. This session shipped (slot:quebec, 2026-06-23)

| Commit | What | Why it matters for launch |
|---|---|---|
| `059ca19684` | **`primary` Tailwind token** -- was UNDEFINED; 32 components (incl the shared `<Button>` primary variant + entire SFC + PPG suites + login + post-store) used `bg-/text-/ring-/border-/from-/to-primary-{50..950}` -> Tailwind emitted **no CSS** -> invisible primary CTAs | The #1 launch-quality defect. Every "Calculate / Subscribe / Buy / Generate" button rendered with no background. Fixed + validated (tailwind compile now emits `.bg-primary-600`) + binding regression test (6/6). |
| `cf4df9ea50` | **Launch-readiness verifier harness** + auto-gen punch-list | Kills the doc-drift class (the plan docs drifted twice). One command re-verifies the FE launch invariants; 11/11 tests; LIVE = PASS 5/5. |

## 2. Wave-1 critical path to the FIRST dollar (SFC subscription + one-time $299)

Ordered. The FE rows are DONE; the gates below them are what actually block selling.

| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | SFC FE (basic + 9-axis gated + Taylor de-inlined + vendor-compare + vibration gated) | quebec | **DONE** (verified) |
| 2 | Pricing + entitlement + Stripe conversion loop (gated->UpgradePrompt->/pricing->checkout->success->cache-clear) | quebec | **DONE** (verified) |
| 3 | Primary CTA rendering (the token fix) | quebec | **DONE this session** |
| 4 | **Live-Stripe test-mode E2E + entitlement-enforcement E2E** (free user actually blocked past the ceiling through the dispatcher) | **papa** | **OPEN -- wave-1 blocker** |
| 5 | Public pricing-page go-live review (F4 coming-soon display verified shipped) | quebec | DONE; needs operator sign-off on $ numbers (§6 knobs) |

Then single post-processor ($199/ctrl) follows once:

| # | Blocker | Owner | Status |
|---|---|---|---|
| 6 | Post store / checkout / ownership / success pages | quebec | DONE (verified) |
| 7 | **AlarmDB (2,588 alarms) -> post P5 safety gate** (cannot sell generated G-code without it) | **echo** | **OPEN -- wave-1 blocker for generated programs** (selling the dialect product itself is fine) |

## 3. Cross-slot asks (posted to AGENT_CHAT 2026-06-23)

| Slot | Ask | Gates |
|---|---|---|
| **papa** | Live-Stripe test-mode E2E + entitlement-enforcement E2E through the dispatcher | wave-1 (proves subscriptions are enforceable) |
| **echo** | U-PP-L1: wire AlarmDB -> post pipeline P5 safety gate | wave-1 (selling generated G-code) |
| **oscar** | Confirm F3 (`/speed-feed` `calibration_overrides` actually honored by `sf_orchestrate`?) + F5 (`sf_stochastic` vs orchestrate-uncertainty distinction) so quebec can gate/re-tier honestly | hardens SFC sell |
| **charlie** | Quoting accuracy: drive 71% MAPE under the sell-gate | wave-2 |
| **hotel** | ERP page-depth audit (which of ~29 pages are real+deep vs shallow) | wave-3 |

## 4. Pricing -- CONFIRMED COMPLETE + matches the operator directive

No further work. Canonical `web/src/data/pricing.ts` (14/14 tests) encodes exactly the directive:
- **Subscription (everything):** free $0 / starter $29 / pro $79 / shop $199 / enterprise $499 (annual = 10x monthly).
- **One-time SFC:** **$299** (+$49/yr updates). **One-time single post:** **$199/ctrl** (+5-pack $799 / all $2,499).
- 19-feature entitlement matrix with per-seat shop-admin grant/revoke + purchase-control (the "what a shop allows users to pay for" model).
- `creditOnUpgrade` (one-time -> subscription churn killer).
- Operator-adjustable $ knobs: `PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md` §6.

## 5. Channels (after web wave-1) -- quebec-scaffolded, native step blocked

- **Desktop (Electron):** `electron@31` + `electron-builder@25` + scripts + secure main/preload + HashRouter-when-desktop = dev-runnable. Remaining: visual launch-test (needs a display) + code-signing (operator/native).
- **Mobile (Capacitor):** `@capacitor/*@6.2.1` + config + scripts shipped. Remaining: `npx cap add ios|android` (needs Xcode / Android SDK -- run on a Mac / Android box). One `dist/` ships to all three shells.

## 6. Doc-drift note

This doc and the dated v2/v3 deltas are SNAPSHOTS. For live truth always run the harness
(`node scripts/verify-launch-readiness.mjs`) -> `LAUNCH-READINESS-LIVE.md`. Do not trust a dated
plan doc's "shipped/pending" claims without re-verifying against code (R12).

## 8. Session-2 "do-it-all" build log (2026-06-23, slot:quebec)

Shipped this turn (each: real tests + 2-arm per-file scrutiny PASS + committed `[MAIN-FORCE]`):
| Commit | Unit |
|---|---|
| `d3a7bd429e` | Harness pricing check field-anchored (closed the 3-of-3 P2: `sfc_perpetual.priceUsd:299` + `post_perpetual.priceUsd:199` + 4 paid tiers, not loose number-presence) |
| (cron) | `U-Q-LAUNCH-READINESS-CRON`: daily cron wrapper + test (11/11) + installer; **scheduled task registered live** (`PRISM Launch Readiness`, daily 7:13 AM); regression -> AGENT_CHAT alert |
| `U-Q-FUNNEL-FRONTDOOR` | `/` now serves the public LandingPage to anonymous visitors (was the employee picker = the #1 funnel killer); free CTAs + checkout free-plan -> `/speed-feed-calc`; G6: `requestCore` now propagates the 403 `error.code` for ALL callers |
| `89245bbfb8` | `U-Q-CUSTOMER-SIGNUP`: SignupPage + `AuthContext.register` + `/signup` route + LoginPage link + **G5 backend fix** (authDispatcher register param destructure -- signup was dead E2E) |

### Session 3 (2026-06-23, post-/compact) -- both wave-1 P0s SHIPPED
1. **LOGIN-TOKEN P0 -- DONE (`U-Q-LOGIN-TOKEN`, quebec-owned after all).** It was a FRONTEND read of a
   KNOWN backend envelope (`{result:{user_id,token:{access_token}}}`, verified via AuthEngine.login->issueToken
   + routes/auth.ts), so quebec owns it. Pure `interpretLoginResponse` extracts `result.token.access_token`,
   distinguishes an MFA challenge (HTTP 200 + requires_mfa) from a broken contract, fails loud on null token.
   Also fixed a refresh-logout bug the signup funnel exposed (restore guard required employee, null for SaaS
   customers). 12/12 tests; 2-arm scrutiny PASS/PASS. **THE last wave-1 E2E gap is closed.**
2. **POST-SAFETY FENCE -- DONE (`U-Q-POST-SAFETY-FENCE`).** Required `GeneratedOutput.pipelineValidated`
   (true only on the /ppg/pipeline P5-gated path) + pure `postExportSafety.ts` (decorateExport PREVIEW-ONLY
   header + exportFileSuffix `_PREVIEW_unvalidated.nc`) fence EVERY egress (nc/clipboard/both CPS branches/
   PostPreviewComponent copy+download). 11/11 tests; 2-arm scrutiny PASS/PASS. Validated programs byte-identical.

### Remaining quebec-buildable (next session)
3. **Per-page 403->UpgradePrompt (papa-gated, DORMANT-value):** lathe/wedm/print-to-program/post pages discard
   HTTP status; clone the canonical pattern at `SfcCalculatorPage.tsx:307` (`errorStatus === 403 ? <UpgradePrompt
   feature="..."> : <normal error>`). The G6 error-code already flows + `UpgradePrompt`
   (`web/src/components/entitlement/UpgradePrompt.tsx`) exists. NOTE: zero immediate value until papa wires
   `requireTier` to actually RETURN 403 on those routes -- pre-wiring is safe but dormant. Multi-page (4+),
   per-file scrutiny each -- a fresh-context unit. Files: `LatheWizardPage.tsx`, `WireEdmWizardPage.tsx`,
   `LathePrintToProgram*.tsx`, `PostProcessorGeneratorPage.tsx` (the post page's error is a bare `setError(string)`
   at ~2086 -- needs ApiError.status capture first).
4. **Login flow P2 (flagged, NOT fixed -- R7):** `AuthContext.login` employee lookup `?? employees[0]` could
   assign a random employee identity to a non-matching user. Needs tenant-scoping + the shared-tablet-flow owner.
5. **Signup follow-ups (papa/hotel):** persist AuthEngine users (in-memory today); register drops `email` (no
   verification); usage meter (needs backend remaining-count) + plan chip in the shell.

---
_slot:quebec 2026-06-23. FE launch invariants PASS 5/5 (harness-verified). Wave-1 blockers: papa
(live-Stripe E2E + the login-token fix) + echo (post safety gate). The frontend funnel + signup are now built._
