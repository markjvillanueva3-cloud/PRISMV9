# LAUNCH-FE/U-Q-GATED-ERROR — [MAIN-FORCE] [LAUNCH-FE]/U-Q-GATED-ERROR (slot:quebec): reactive 403->UpgradePrompt primitive -- the companion to FeatureGate for the page error path

**Commit:** `cc31dc3e8956` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T12:18:08-05:00
**Tags:** launch-fe, u-q-gated-error, auto-distilled

## Subject
[MAIN-FORCE] [LAUNCH-FE]/U-Q-GATED-ERROR (slot:quebec): reactive 403->UpgradePrompt primitive -- the companion to FeatureGate for the page error path

## Body
```
[MAIN-FORCE] [LAUNCH-FE]/U-Q-GATED-ERROR (slot:quebec): reactive 403->UpgradePrompt primitive -- the companion to FeatureGate for the page error path

<FeatureGate> gates a feature PROACTIVELY (client-side can(feature) -> no API call
for a wrong-plan user). The reactive half was missing: when a page DID call a gated
dispatcher and the backend requireTier returned 403, every page surfaced a raw error
string instead of an upgrade CTA (the named launch gap -- lathe/wedm/print/post/quote/
cad pages discard HTTP status). GatedError closes it.

New <GatedError error feature fallback compact className> composes the canonical pieces:
- isEntitlementError(err) = err instanceof ApiError && status===403 (the single 403-gate
  definition) -> renders <UpgradePrompt feature currentPlan>; any other error/null ->
  fallback (the page's normal error UI).
- DORMANT-SAFE: the cheap hook-free isEntitlementError predicate is checked FIRST, so a
  no-error / non-gate mount never calls useEntitlement (no wasted GET /billing/status
  across the many pages that mount this) and renders the fallback exactly as before --
  wiring it in ahead of papa's backend gate changes nothing user-visible until 403s flow.
- split GateUpgrade child keeps the useEntitlement hook Rules-of-Hooks-safe while making
  the dormant path hook-free (scrutiny P1 fix).
- Router-ancestor contract + registry-string test-dependency documented (scrutiny P2s).

Reuses ALL existing entitlement infra (UpgradePrompt, useEntitlement, isEntitlementError,
pricing registry) -- no duplication (FeatureGate=proactive, SfcGateNotice=SFC-code-specific,
GatedError=generic reactive; the three are legitimately distinct per 2-arm scrutiny).

GatedError.test.tsx 10 cases (403->CTA + feature-variability + 500/401/null/non-ApiError/
plain-Error fallthrough + not-yet-live "coming soon" + compact-forwarding + empty-render).
Render tests need jsdom (absent here -> CI); the gate logic isEntitlementError is pure +
covered by entitlement.test.ts 18/18. tsc clean (1 pre-existing calculatorData error untouched).
Per-file 2-arm scrutiny PASS/PASS (P1 dormant-fetch + P2 docs/test fixed).

Consumers (11 gated pages) wired in the follow-up commit.
```

## Files touched (4)
- mcp-server/web/src/__tests__/GatedError.test.tsx         | 120 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/entitlement/GatedError.tsx |  59 +++++++++++++++++++++++++++
- mcp-server/web/src/components/entitlement/index.ts       |   1 +
- 3 files changed, 180 insertions(+)

## Lessons surfaced in commit body
- wrong-plan user). The reactive half was missing: when a page DID call a gated
- til 403s flow.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cc31dc3e8956`
- Milestone envelope: `mcp-server/data/milestones/LAUNCH-FE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._