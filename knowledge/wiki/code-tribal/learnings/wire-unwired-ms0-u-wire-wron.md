# WIRE-UNWIRED-MS0/U-WIRE-WRON — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WRON: wire WetRunOnCallRotationEngine into prism_dev (7 read-only actions)

**Commit:** `d39a74f07a9a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:58:48-05:00
**Tags:** wire-unwired-ms0, u-wire-wron, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WRON: wire WetRunOnCallRotationEngine into prism_dev (7 read-only actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WRON: wire WetRunOnCallRotationEngine into prism_dev (7 read-only actions)

Wires the in-memory on-call rotation/page/swap state surface. 7
read-only actions through prism_dev. Engine-pair test pre-existed; this
commit ships the dispatcher round-trip suite.

7 read-only actions:
  wron_current_shift       — currentShift(ts) → Shift|null
  wron_pending_escalations — pendingEscalations(nowTs) → Page[]
  wron_get_page            — getPage(pageId) → Page|null
  wron_list_pages          — listPages()
  wron_list_shifts         — listShifts()
  wron_list_swaps          — listSwaps()
  wron_snapshot            — snapshot() → {shifts, swaps, pages, schemaVersion}

DEFER (5 mutating methods, safety-critical surface):
  configureShift   class=state-mutation (rotation config)
  swap             class=state-mutation (records SwapRecord)
  page             class=send-impersonation — would trigger real
                   pager notifications in production
  acknowledge      class=identity-forgery — caller-supplied person_id
                   could impersonate another responder
  sweepEscalations mutates Pages via advanceStage (engine line 346) —
                   should only be driven by a trusted scheduler

Wire-level invariants:
  - found / is_empty discriminators (slim-resistant — null result is
    stripped by slimResponse, but bool found=false survives)
  - pending_count + page_count + shift_count + swap_count exposed
    at top level (engine returns shallow copies, slim-safe)
  - try/catch envelope on currentShift/pendingEscalations because
    engine throws on non-finite ts (lines 177, 325, 367)
  - Zod z.number().finite() guards against NaN/Infinity (DoS)
  - All no-arg endpoints strict (extra params rejected)

Tests: 25/25 PASS dispatcher round-trip + engine-direct seeding in
       beforeAll (mirrors PLIB/SSL pattern).

WIRE-UNWIRED-MS0 progress: 25->26 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.wetRunOnCallRotation.test.ts        | 283 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  31 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  75 +++++-
- 3 files changed, 388 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d39a74f07a9a`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._