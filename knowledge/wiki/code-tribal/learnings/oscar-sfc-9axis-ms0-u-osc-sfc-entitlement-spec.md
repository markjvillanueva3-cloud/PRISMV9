# OSCAR-SFC-9AXIS-MS0/U-OSC-SFC-ENTITLEMENT-SPEC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SFC-ENTITLEMENT-SPEC (slot:oscar): entitlement+Stripe gate spec for /api/v1/sfc — #1 SFC revenue blocker (design-only)

**Commit:** `72a24b1ee751` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:23:39-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-sfc-entitlement-spec, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SFC-ENTITLEMENT-SPEC (slot:oscar): entitlement+Stripe gate spec for /api/v1/sfc — #1 SFC revenue blocker (design-only)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SFC-ENTITLEMENT-SPEC (slot:oscar): entitlement+Stripe gate spec for /api/v1/sfc — #1 SFC revenue blocker (design-only)

Grounds the gap in verified state: StripeBillingEngine testMode (mock), billing.ts:88 webhook signature = commented-out TODO, routes/sfc.ts requireFields-only (SFC free to anyone). Spec: 3 fail-closed middlewares before createSfcRouter; tier x entitlement matrix; Stripe checkout/webhook-fix/portal; sub-ms entitlement cache; 6 verify channels; provider-agnostic; Phase-2 Electron license deferred. Web-first, no fork dependency.
```

## Files touched (2)
- state/shared/specs/SFC-ENTITLEMENT-GATE-SPEC-2026-06-06.md | 128 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 128 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 72a24b1ee751`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._