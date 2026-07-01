# TOKEN-EFFICIENCY-INJECT/U-ROUTE-SAVINGS-BAND-GATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-ROUTE-SAVINGS-BAND-GATE (slot:bravo): rate-band gate on the SessionStart route-savings banner -- emit only on a fleet-wide band change (5pp) or 24h refresh, not the same 0.4%-below-target nag every session

**Commit:** `4cbcfdaf60c6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:03:40-05:00
**Tags:** token-efficiency-inject, u-route-savings-band-gate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-ROUTE-SAVINGS-BAND-GATE (slot:bravo): rate-band gate on the SessionStart route-savings banner -- emit only on a fleet-wide band change (5pp) or 24h refresh, not the same 0.4%-below-target nag every session

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-ROUTE-SAVINGS-BAND-GATE (slot:bravo): rate-band gate on the SessionStart route-savings banner -- emit only on a fleet-wide band change (5pp) or 24h refresh, not the same 0.4%-below-target nag every session

Backlog #6b from reference_injection_surface_token_audit_2026_06_10. The banner
fired 10,210x at a persistently 0.4% take-rate -- the single largest persistent
SessionStart waster by bytes x fires x (1-take). FIX: rate-BAND gate. computeRateBand
buckets the measured rate into 5pp bands; shouldEmitBanner emits only when the band
moved since last shown fleet-wide (either direction) or the last show is >24h old.
Band-state file is OWNED by this hook (NOT the route-suggest sidecar, which the
telemetry collector writes -- avoids a second-writer race). formatBanner output is
byte-identical (refactored to share rateOf() -- single-sourced rate, R7).

LIVE A/B (real sidecar, 10210 fires / 0.4% / band b0): run1 emits 322B banner + writes
state; identical run2 suppresses (0B). Quality-preserved: operator still sees every
real rate movement + a daily heartbeat; /route-suggest-stats always available.

Knobs: PRISM_ROUTE_SAVINGS_BANNER_BAND=0 (legacy), _BAND_WIDTH_PCT, _BANNER_MAX_SILENT_MS,
_STATE/PRISM_ROUTE_SUGGEST_SIDECAR (test overrides). 41/41 tests.
```

## Files touched (3)
- .claude/hooks/__tests__/route-savings-session-start-banner.test.mjs | 228 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- .claude/hooks/route-savings-session-start-inject.mjs                | 136 ++++++++++++++++++++++++++++++++++---
- 2 files changed, 353 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till sees every

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4cbcfdaf60c6`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._