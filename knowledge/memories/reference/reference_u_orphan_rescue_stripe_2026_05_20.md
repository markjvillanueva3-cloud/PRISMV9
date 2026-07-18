---
name: reference-u-orphan-rescue-stripe-2026-05-20
description: Wired StripeBillingEngine (orphan at MCP layer, live at HTTP-route layer) into businessDispatcher via new `billing_stripe_status` action (+1 action, anti-regression OK)
aliases: reference_u_orphan_rescue_stripe_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.239Z
---


**Slot kilo, 2026-05-20, commit `b288df94e2`.** MISC-TASKS-INVENTORY claimed StripeBillingEngine was "completely orphaned" but verification revealed it's used by `src/routes/billing.ts` (Express route layer) AND `src/__tests__/v7-integration.test.ts` — *route-layer wired, MCP-layer orphan*. The dispatcher surface for billing already exists via `BillingEngine` (canonical, no network) at 8 actions: `billing_get_plans|get_post_prices|calc_post_price|create_checkout|create_portal|create_post_checkout|handle_webhook|stats`. StripeBillingEngine is the Stripe-adapter sibling (per BillingEngine.ts comment: "A future StripeAdapterEngine can wrap this engine to execute real Stripe API calls").

**Decision:** rather than duplicate the 8-action billing surface (which would double the dispatcher footprint), exposed a single `billing_stripe_status` action that surfaces `StripeBillingEngine.stats()` (testMode/version/method list/plan count). Closes the orphan-rescue without surface duplication.

**Wiring (4 surgical edits to `mcp-server/src/tools/dispatchers/businessDispatcher.ts`):**
1. Added `let _stripeBilling: any;` after `let _billing: any;` (line 113) — lazy cache
2. Added `case "stripeBilling"` in `getEngine()` switch (line ~336): `_stripeBilling ??= new (await import("../../engines/StripeBillingEngine.js")).StripeBillingEngine({ testMode: true })` — testMode default safe; matches the existing `_billing` lazy-load pattern
3. Added `"billing_stripe_status",` to `ACTIONS` z.enum after `"billing_stats",` (line 760) — alphabetically and section-grouped under Billing/Stripe block
4. Added `case "billing_stripe_status":` to the main switch after `case "billing_stats":` (line ~3700): `result = engine.stats()`

**Anti-regression:** +1 action (168→169 in the Billing/Stripe section's contribution). Existing 36 tests in `stripe-billing.test.ts` still PASS (engine untouched, no surface modified). `tsc --noEmit` clean for `businessDispatcher.ts` + `StripeBillingEngine.ts`.

**Architecture note (for future close-outs):** PRISM bills via TWO engines: `BillingEngine` (self-contained, deterministic, Stripe-shaped output, MCP dispatcher surface) + `StripeBillingEngine` (real Stripe SDK via HTTP routes). They are not duplicates — they are intentional split between business-logic (MCP) and integration (HTTP). Future "wire-the-orphan" claims about either engine should verify which layer ([routes/billing.ts] vs [businessDispatcher.ts]) is the alleged wiring target.

**MISC-TASKS-INVENTORY entry was misleading** — said "completely orphaned engine". Reality: HTTP-layer wired, MCP-layer was the gap. [[feedback_verify_actual_contract_not_proxy]] applies.

**Commit format:** `[MAIN] [ORPHAN-RESCUE]/U-ORPHAN-RESCUE-STRIPE (slot:kilo): ...` — matches the existing `OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-*` precedent on this file (PreventiveMaintenanceEngine `2b4e0ec3e4`, EquipmentAssetEngine `63c4960748`).

**Commit landed after 9 retries** against shared-tree `.git/index.lock` peer contention (12+ active slot chats writing concurrently). [[feedback_no_git_stash_shared_tree]] applies. Documents the same class as the prior session (P6-U02 envelope edit) but THIS commit landed — earlier session's envelope-doc edit was lost to peer-clobber before commit retry could succeed.

verify: `git show --stat b288df94e2` (1 file, +14 lines)
