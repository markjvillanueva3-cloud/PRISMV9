# WIRING/U-WIRE-OPERATOR-PREFS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-OPERATOR-PREFS (slot:romeo): OperatorPreferencesEngine -> prism_session (set/get/apply)

**Commit:** `7ec7c1724996` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T14:11:52-05:00
**Tags:** wiring, u-wire-operator-prefs, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-OPERATOR-PREFS (slot:romeo): OperatorPreferencesEngine -> prism_session (set/get/apply)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-OPERATOR-PREFS (slot:romeo): OperatorPreferencesEngine -> prism_session (set/get/apply)

Second genuine-orphan wire from the classifier-aware hunt (b902ac2024). Per-operator preference store +
override applier (speed/feed bias, surface-finish priority, coolant, safety margin, chip-break, per-machine
notes), tenant-scoped. 3 actions: operator_prefs_set/get/apply. Verified GENUINE_ORPHAN + type-(a)
self-contained (zero-arg singleton, no existing prefs surface) via scripts/classify-engine-reachability.mjs.
8 round-trip tests THROUGH prism_session (set->get singleton round-trip; defaults fallback; apply=true with
prefs / fail-soft without; schema-reject missing tenantId; enum-accept). tsc-clean.
```

## Files touched (4)
- .../src/__tests__/sessionDispatcher.operator-prefs-wire.test.ts  | 126 +++++++++++++++++++++++++++++
- mcp-server/src/schemas/sessionActionSchemas.ts                   |  43 ++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts            |  54 +++++++++++++
- 3 files changed, 223 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7ec7c1724996`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._