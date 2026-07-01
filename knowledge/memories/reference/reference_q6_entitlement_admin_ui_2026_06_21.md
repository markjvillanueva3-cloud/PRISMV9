---
name: reference_q6_entitlement_admin_ui_2026_06_21
description: Q6 per-seat entitlement admin UI SHIPPED (FE for U-COMM-05) + the refetch-corruption + concurrent-abort P1 lessons
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.136Z
aliases: reference_q6_entitlement_admin_ui_2026_06_21
---


**Q6 -- per-seat entitlement admin UI SHIPPED (2026-06-21, slot:quebec for papa).**

Completes the per-feature entitlement vertical end-to-end (operator's "what a shop allows users to pay for per-feature" ask). FE for the U-COMM-05 backend (`EntitlementOverrideStore` + admin `/entitlements` endpoints; see [[reference_u_comm_05_entitlement_overrides_2026_06_21]]). Part of the commercial-layer launch build ([[reference_comm_layer_backend_shipped_2026_06_21]]).

Commits (cad-fusion-live-ms0):
- `cc19763d9f` -- core: `web/src/types/admin.ts` (`EntitlementUser`/`EntitlementListResult`/`ENFORCEABLE_FEATURES` = the 10 backend `GATED_FEATURES`), `api/admin.ts` (listEntitlements/setEntitlement/setUserPlan unwrap the backend `{result}` envelope), `hooks/useAdmin.ts` (3 hooks), `components/admin/EntitlementsPanel.tsx` (per-user x per-feature toggle grid), `pages/AdminPage.tsx` (Entitlements tab), `__tests__/admin-entitlements-api.test.ts`.
- `7b518c49bf` -- 3-of-3 arm-C P1 fixes (below). 11/11 tests green, tsc clean, 3-of-3 PASS.

**P1 lessons (both real, both caught by scrutiny arm C, FAIL -> fix -> re-verify PASS):**
1. **A refetch-after-mutate on a hook that nulls `data` on entry is a destructive teardown.** `useGetCall.execute` does `setState({data:null,loading:true})` at the start of every call, so the toggle's `list.execute()` refetch tore the whole grid down mid-flight -- and a refetch that then *failed* wiped a mutation that actually SUCCEEDED (success -> corrupted displayed state). FIX: merge the backend's authoritative full per-user override map (POST returns `{result:{userId,overrides}}`; `setOverride` returns the COMPLETE map, not a delta) into a local `patches[userId]` overlay (`patches[u.userId] ?? u.overrides`); never refetch after a toggle. "Load Entitlements" clears the overlay. **Why:** a server-confirmed local merge is both stable and authoritative; a destructive refetch trades correctness for a redundant round-trip.
2. **Serialize mutations when the shared hook uses ONE `AbortController`.** `useApiCall.execute` calls `abortRef.current?.abort()` on entry, so a 2nd toggle aborted the 1st in-flight write -> swallowed to `null` (AbortError) -> silent lost-update. FIX: `disabled={anyBusy}` (busyKey!==null) disables EVERY toggle while one is in flight. **Why:** human clicks are >16ms apart so the committed `disabled` prevents the race; airtight hardening = a `busyRef` re-entrancy latch (logged P2).

**How to apply:** any admin/CRUD grid that mutates one cell at a time -- (a) merge the mutation RESPONSE into local state, do not refetch on a data-nulling hook; (b) if the mutation hook shares an AbortController across calls, serialize the UI (disable-all-while-busy) or give each write its own controller. Pairs with: only offer backend-enforceable keys (`ENFORCEABLE_FEATURES` === `GATED_FEATURES`) so the UI never presents a silent-no-op revoke; FE error extractor must read the NESTED backend `{error:{message}}` shape, not just top-level `.message`.

Remaining launch units (queued, not done): U-COMM-08 (one-time SFC + single-post license keys, backend), U-COMM-07 (operator provisions live Stripe keys -- operator-only), route tier-gating rollout (kilo/oscar/echo gate their feature routes with `requireTier`), Q5 (SFC standalone API exposure). See `state/shared/specs/LAUNCH-ROUTE-GATING-MAP-2026-06-21.md`.
