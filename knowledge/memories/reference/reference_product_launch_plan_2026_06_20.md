---
name: reference_product_launch_plan_2026_06_20
description: "Product-launch completion plan + pricing design across SFC/post-proc/quoting/ERP — verified current-state, dependency-ordered units, pricing tiers, critical path. The launch-readiness source of truth as of 2026-06-20."
type: reference
slot: quebec
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.123Z
aliases: reference_product_launch_plan_2026_06_20
---


Ultracode fan-out (5 verified sonnet assessors + orchestrator synthesis, slot:quebec) produced the launch plan at `state/shared/specs/PRODUCT-LAUNCH-COMPLETION-PLAN-2026-06-20.md`.

**Cross-cutting insight:** every saleable product (SFC, post-proc, quoting, ERP) has the SAME shape — **deep backend, thin/unwired frontend, absent commercial layer.** So the plan is NOT 4 product builds; it is (1) ONE shared commercial layer built once, (2) per-product frontend exposure, (3) product-specific P0s.

**Verified launch-readiness (evidence-based upper bounds, "files exist != works"):** web app 0.55 · SFC 0.38 · post-proc 0.42 · quoting 0.28 · ERP 0.45 · **billing/entitlement 0.25** · Electron 0.0 (zero code) · iOS/Android 0.05 (zero scaffold, Capacitor doctrine only). Fleet: 730 ms / 5751 units / 1849 shipped (32%).

**Keystone finding:** billing infra EXISTS (`StripeBillingEngine` + `BillingEngine` + `routes/billing.ts` + `AuthEngineV7` TierLimits) but is NOT launch-safe — 5 P0s: webhook sig verification COMMENTED OUT (`routes/billing.ts:88-91`); `billingPortal` NullRef; 3 conflicting plan catalogs; **NO per-feature entitlement enforcement** (the #1 blocker); frontend can't checkout. Pricing is weeks, not months, away.

**Recommended launch (R12-honest):** lead with **SFC + a single post-processor** (most-built backends, simplest one-time pricing). Quoting deferred to Wave 2 — it's an ACCURACY problem (71.1% MAPE, ~10 real pairs), not a build gap. ERP Wave 3 (page depth unverified). Electron/mobile post-web-launch.

**Critical path to first revenue:** shared commercial layer (U-COMM-01→03→08: reconcile catalogs → entitlement middleware → license keys) ∥ SFC frontend exposure (U-SFC-L1/L2) ∥ post-proc AlarmDB→P5 safety + integrate 12 slot/echo commits (U-PP-L1/L3).

**Pricing PROPOSAL (operator sign-off pending):** subscription tiers Free/$0 · SFC Pro $19mo · Post Pro $19/ctrl mo · Shop $149mo · Shop Plus $349mo · Enterprise $799+. One-time: **SFC $299**, **single post $249/controller**, all-posts bundle $1,499. Entitlement = plan-ceiling (AuthEngineV7 TierLimits) + per-seat admin grants (the operator's "what a shop allows users to pay for").

**6 operator decisions gate the build** (plan §7): confirm sequence · sign off pricing · single-vs-multi-tenant · provision Stripe live keys · U-LEGAL-13 defer? · verify corpus/credential paths.

Related: [[reference_oscar_sfc_validation_honest_2026_06_19]] (oscar's SFC-vs-GWizard/HSMAdvisor validation, same "launch soon" framing) · [[reference_frontend-app_transcript_synthesis]] · plan owner slots: oscar(SFC) echo(post) charlie(quote) hotel(ERP) papa(billing-backend) quebec(frontend).
