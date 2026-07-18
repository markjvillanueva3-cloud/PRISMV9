---
name: reference_quebec_launch_2026_06_23
description: Quebec 2026-06-23 launch session - verified the FE commercial spine is essentially COMPLETE (not behind), fixed the #1 launch-quality defect (undefined `primary` Tailwind token broke every primary CTA across 32 components), and built a deterministic launch-readiness verifier harness (anti doc-drift). Wave-1 blockers are cross-slot (papa Stripe-E2E, echo post-safety), not the frontend.
type: reference
slot: quebec
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.138Z
aliases: reference_quebec_launch_2026_06_23
---


# Quebec launch session (2026-06-23, slot:quebec)

Operator /checkin-quebec /goal /loop: reorient on the Codex frontend; assess all FE builds +
roadmaps; complete SFC/post/quoting/ERP frontends + pricing tiers; launch soon. "Utilize Codex's
build, don't start from scratch."

## Honest reorientation (R12)
The operator perceived SFC/post/quoting/ERP FEs as "behind the 3 wizards." **Live code says the
OPPOSITE** -- the FE commercial spine is essentially COMPLETE. The launch docs had drifted TWICE
(v2 said electron/capacitor ZERO + SFC honesty-fixes pending; v3 corrected by re-reading the tree).
Verified live: F1/F2/F4 shipped (`/vendor-compare`->sfc.vendor_parity + `/vibration`->sfc.sld gated,
App.tsx:374-375), electron@31 + capacitor@6.2.1 deps present, pricing.ts canonical (14/14).

## Shipped this session (2 commits, cad-fusion-live-ms0, [MAIN-FORCE], scrutiny PASS)
- **`059ca19684` U-Q-PRIMARY-TOKEN**: the `primary` Tailwind color was UNDEFINED in
  `mcp-server/web/tailwind.config.js`, but the shared `<Button>` primary variant (the DEFAULT
  variant, Button.tsx:7) + 31 components used `bg-/text-/ring-/border-/from-/to-primary-{50..950}`
  -> Tailwind emitted NO CSS -> **invisible primary CTAs across the whole app** (SFC suite, PPG suite,
  post-store, login, all UI primitives). Fix: hoist `brandBlue` const (50..950; 50..900 byte-identical
  to the existing `prism` scale, 950 additive) + `primary: { DEFAULT: brandBlue[600], ...brandBlue }`.
  VALIDATED via tailwind v3.4.17 compile (`.bg-primary-600` now emits, was zero) + binding test
  `tailwindPrimaryToken.test.ts` (6/6, asserts every primary-NNN used in src is defined + primary===prism).
- **`cf4df9ea50` U-Q-LAUNCH-VERIFY-HARNESS**: `scripts/verify-launch-readiness.mjs` -- deterministic
  re-runnable check of the FE launch invariants (primary-token, route-gating, shell-deps, pricing-registry,
  key-files) so reorientation is one command, not a drift-prone doc re-read. 11/11 tests (each check with
  pass+broken input). LIVE = PASS 5/5. Auto-gen punch-list -> `state/shared/specs/LAUNCH-READINESS-LIVE.md`.

## Wave-1 blockers are CROSS-SLOT, not FE (asks posted to AGENT_CHAT)
- **papa** (wave-1): live-Stripe test-mode E2E + entitlement-enforcement E2E through the dispatcher.
- **echo** (wave-1): U-PP-L1 AlarmDB (2588) -> post P5 safety gate (to sell generated G-code).
- **oscar**: confirm F3 (calibration_overrides honored?) + F5 (sf_stochastic vs orchestrate-uncertainty).
- **charlie** (wave-2): quoting accuracy 71% MAPE. **hotel** (wave-3): ERP page-depth audit.

## Pricing -- CONFIRMED COMPLETE (matches directive exactly, no FE work)
Subscription $0/29/79/199/499 (annual=10x) + one-time SFC $299 + one-time single-post $199/ctrl
(+5pack $799 / all $2499) + 19-feature per-seat matrix + creditOnUpgrade. Canonical:
`PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md`; encoded `web/src/data/pricing.ts`.

## Channels (quebec-scaffolded, native step blocked)
Electron dev-runnable (visual test + signing need a display/operator). Capacitor scaffolded
(`npx cap add ios|android` needs Xcode/Android SDK). One `dist/` -> all 3 shells.

## Session 2 -- "do it all" (same day, 4 more units shipped)
Operator "do it all" -> built the 3 offered items + papa/echo FE help, each tested + 2-arm scrutiny PASS:
- **Harness pricing field-anchored** (`d3a7bd429e`): sfc_perpetual.priceUsd:299 / post_perpetual:199 / 4 tiers, not loose numbers (closed the 3-of-3 P2).
- **Launch-readiness CRON** (`U-Q-LAUNCH-READINESS-CRON`): wrapper+test(11/11)+installer; **scheduled task REGISTERED LIVE** (PRISM Launch Readiness, 7:13 AM daily); regression -> AGENT_CHAT alert.
- **Funnel front-door + G6** (`U-Q-FUNNEL-FRONTDOOR`): `/` serves public LandingPage to anonymous (was the employee picker = #1 funnel killer); free CTAs -> /speed-feed-calc; requestCore now propagates the 403 error.code for ALL callers.
- **Customer signup** (`89245bbfb8`): SignupPage + AuthContext.register + /signup + G5 backend fix (authDispatcher register param destructure -- signup was dead E2E).
- **4-agent ultracode audit** of onboarding/funnel/papa-403/echo-post (file:line gaps in v4 doc).

**NEW P0 found (papa-owned, posted):** `AuthContext.tsx:135` login() reads wrong token path -> token UNDEFINED (login+signup both blocked E2E; /login returns {result:{token:{access_token}}}). The last wave-1 E2E gap.
**Deferred (spec'd to file:line in v4 doc):** post-safety honesty fence (PREVIEW-ONLY watermark on local-fallback G-code, P0 SAFETY) + per-page 403->UpgradePrompt (papa-gated).

## Session 3 -- post-compact, both wave-1 P0s SHIPPED (2026-06-23, slot:quebec)
Re-fired the launch loop post-/compact; took the two quebec-ownable wave-1 P0s I had deferred
at deep context. Each: full verify + per-file 2-arm scrutiny (round-2 PASS/PASS after a FAIL).

- **`U-Q-LOGIN-TOKEN`** (THE last wave-1 E2E blocker): AuthContext.login read `data.data?.token ?? data.token`
  but the VERIFIED envelope (AuthEngine.login->issueToken; routes/auth.ts:19-24) is
  `{result:{user_id,token:{access_token,...}}}` -- neither read path existed, so NO session ever got a
  bearer token (login + signup both dead E2E). I had deferred this to papa "can't validate", but it is a
  FRONTEND read of a KNOWN backend envelope -> quebec-owned once the contract is read (R8/R12). Fix: pure
  `interpretLoginResponse` (extract result.token.access_token; distinguish MFA challenge {requires_mfa:true}
  at HTTP 200 from a broken contract -- scrutiny arm B caught the blanket throw swallowing MFA; surface the
  backend error; fail loud on null token). Also fixed a refresh-logout bug the signup funnel exposed: restore
  guard required parsed.employee (null for fresh SaaS customers) -> dropped it, require the string token only.
  authToken.test.ts 12/12. Flagged (P2, NOT fixed -- R7): login() employee lookup `?? employees[0]` could
  assign a random employee identity to a non-matching user; needs tenant-scoping + tablet-flow owner.
- **`U-Q-POST-SAFETY-FENCE`** (P0 SAFETY): PostProcessorGeneratorPage's 3 build paths -- /ppg/pipeline
  (the only P5-safety-gated, machine-ready output), /ppg/template, offline fallback -- ALL downloaded as
  `_PRISM_optimized.nc`, so un-validated G-code could reach a machine. Fix: new pure `postExportSafety.ts`
  (decorateExport stamps a PREVIEW-ONLY comment header; exportFileSuffix -> _PREVIEW_unvalidated.nc when not
  validated; fail-safe on undefined) + REQUIRED `GeneratedOutput.pipelineValidated` (compiler-forces all 3
  sites) + fenced EVERY egress (nc download, clipboard, both Download-CPS branches, PostPreviewComponent
  copy+download). Scrutiny round-1 caught 2 egress gaps I missed (CPS button + PostPreviewComponent's own
  clipboard write) -> round-2 PASS. postExportSafety.test.ts 11/11. Harness still PASS 5/5.

## LESSON (R12): per-file 2-arm scrutiny is load-bearing for SAFETY completeness
Both P0s round-1 FAIL'd on a gap MY self-check missed: login swallowed the MFA path; the fence missed 2 of
4+ egress paths. Enumerate EVERY egress/branch (don't trust "looks complete" on pass 1 -- R16). A safety
fence must cover ALL exits or it is a false sense of safety.

## Session 4 -- "build" + ultracode: reactive 403->UpgradePrompt SHIPPED across all 11 gated pages
Built the per-page 403 gate that was queued. Foundation + 11 pages, 5 commits (cc31dc3e89 +
WIRE-1..4), tsc-clean throughout, 41/41 pure tests.
- **`U-Q-GATED-ERROR`** (cc31dc3e89): new `<GatedError error feature fallback>` in
  `web/src/components/entitlement/` -- the REACTIVE companion to the proactive `<FeatureGate>`.
  Composes `isEntitlementError` (403 ApiError) + `useEntitlement().plan` + `UpgradePrompt`.
  DORMANT-safe: cheap hook-free predicate checked FIRST (split GateUpgrade child), so a no-error
  mount never fetches billing. 2-arm scrutiny PASS/PASS (P1 dormant-fetch fix). 10-case test (CI/jsdom).
- **WIRE-1..4**: wired GatedError into 11 pages -- wizard.lathe/mill/wedm, print_to_cnc, post.generate,
  quoting x4 (NOT-YET-LIVE -> "coming soon"), cadcam x2. Each: gateError state holds the caught error
  OBJECT, setGateError in every catch (+ reset where a non-catch setError path exists), wrap the
  existing error UI as the GatedError fallback (byte-preserved -> identical until a 403 flows).
  - LathePrintToProgram used RAW fetch -> threw plain Error; FIXED to `throw new ApiError(status,...)`
    so its 403 is detectable (else dormant-forever).
  - WireEdm: only the main solve render wired; the 2nd render is in WedmApprovalErpPanel sub-component
    (error is a PROP, gateError out of scope) -- tsc CAUGHT the scope error, reverted that site (R8/R12).

## LESSON (ultracode fan-out): a Workflow of N concurrent Claude subagents gets RATE-LIMITED
The wire-gated-error-403 Workflow (11 wire + 11 verify = ~22 agents) completed only 2/11 -- 9 failed
on "Server is temporarily limiting requests". Per [[feedback_ultracode_fanout_local_gpu_not_claude]] +
[[feedback_workflow_concurrency_and_local_routing_2026_06_08]]: mechanical fan-out must route to the
local GPU (Ollama), NOT N concurrent Claude subagents; bound concurrency to <=3-4. I wired the 9
remaining pages SERIALLY by hand (proven pattern from the 2 agent examples). The fanout-gate that
blocks Workflow is the SAME cost-cap -- ultracode --force-fanout overrides it but doesn't change the
upstream API rate limit. For mechanical multi-file edits: serial-self or small batches, not big fan-out.

## Next quebec (cross-slot gates remain; FE wave-1 is DONE)
quebec FE wave-1 is complete. Remaining are CROSS-SLOT: papa (live-Stripe E2E + the now-fixed login envelope
proven through the dispatcher), echo (AlarmDB->post P5), charlie (quoting accuracy), oscar (F3/F5), hotel (ERP depth).
Next quebec-buildable: per-page 403->UpgradePrompt (lathe/wedm/print-to-program/post discard HTTP status via
errorMessage()) -- pre-buildable behind the G6 error-code that already flows, dormant until papa returns 403.
Related: [[reference_quebec_launch_frontend_2026_06_22]] · [[feedback_frontend_codex]] · [[reference_sfc_frontend_exposure_build_2026_06_20]].
