# PER-SLOT-CLOSED-LOOP-INTEGRATION/U-PSCL04 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-CLOSED-LOOP-INTEGRATION]/U-PSCL04: extend india-wire to 9 additional non-hygiene slots (slot:alpha 2026-05-28)

**Commit:** `288de9a63b23` · **By:** markjvillanueva3-cloud · **At:** 2026-05-28T12:58:52-05:00
**Tags:** per-slot-closed-loop-integration, u-pscl04, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-CLOSED-LOOP-INTEGRATION]/U-PSCL04: extend india-wire to 9 additional non-hygiene slots (slot:alpha 2026-05-28)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-CLOSED-LOOP-INTEGRATION]/U-PSCL04: extend india-wire to 9 additional non-hygiene slots (slot:alpha 2026-05-28)

Operator directive (final pre-launch check): "include all other that
would need it." Expands U-PSCL02's 11 closed-loop galaxy CLAUDE.md
wires to cover every non-hygiene, non-unallocated slot.

CLAUDE.md additions (9 slots — same consumer template as U-PSCL02):
  alpha    token-optimization     (own efficiency outcomes feed india)
  bravo    hermes-zulu           (agent fleet patterns)
  lima     academy                (course content)
  papa     backend-helper         (code patterns)
  romeo    wiring                 (wiring patterns - direct NN-GRAPH feed)
  sierra   system-viz             (graph mutations - direct GNN feed)
  tango    discovery              (discovery patterns)
  uniform  bug-hunting            (bug class patterns)
  victor   dormant-data           (extraction patterns)

Excluded by design (hygiene-by-allowlist + unallocated):
  golf     fleet-reaper           (intentionally hygiene-only)
  november u-dea                  (unallocated)
  zulu     u-dea                  (unallocated)

MISSING — galaxy engine dirs don't exist yet (auto-tap still captures):
  database (juliett)              - DB infra outside engines/
  frontend (quebec)               - UI app outside engines/
  orchestrator (zulu)            - orchestrator infra outside engines/

CRITICAL CLARIFICATION (added for next chat that audits this):
even without the india-wire section in their CLAUDE.md, the 14 originally-
excluded slots ARE already feeding outcomes into the bus because
outcome-bus-auto-tap.mjs is a slot-agnostic PostToolUse hook (U-PSCL03).
It reads chat-slots.json + SLOT_GALAXY_MAP directly — not the galaxy
CLAUDE.md doctrine. So india learning closes for ALL slots regardless
of the section. The india-wire section gives BEHAVIORAL DOCTRINE via
Bibryam Context Cascade when Claude edits within the galaxy subtree —
it nudges chats to use xproc_outcome_publish / tribal_capture /
xproc_calibration_monitor_record by hand for high-signal events
(beyond what the auto-tap captures).

scripts/append-closed-loop-india-section.mjs is idempotent (marker
guard) so re-runs as new galaxies appear safely add only missing wires.

Coverage: 11 (U-PSCL02) + 9 (this) = 20/25 mapped slots with explicit
doctrine. Remaining 5 (golf intentionally, november/zulu unallocated,
juliett/quebec/zulu missing engine dirs) get india learning via
the slot-agnostic auto-tap.

Refs: U-PSCL01 (18ca66fb61), U-PSCL02 (92c55ee62f), U-PSCL03 (1dbda26868
- the auto-tap hook that makes the doctrine-less slots STILL contribute).
```

## Files touched (11)
- mcp-server/src/engines/academy/CLAUDE.md           | 20 ++++++++++++++++++++
- mcp-server/src/engines/backend-helper/CLAUDE.md    | 20 ++++++++++++++++++++
- mcp-server/src/engines/bug-hunting/CLAUDE.md       | 20 ++++++++++++++++++++
- mcp-server/src/engines/discovery/CLAUDE.md         | 20 ++++++++++++++++++++
- mcp-server/src/engines/dormant-data/CLAUDE.md      | 20 ++++++++++++++++++++
- mcp-server/src/engines/hermes-zulu/CLAUDE.md      | 20 ++++++++++++++++++++
- mcp-server/src/engines/system-viz/CLAUDE.md        | 20 ++++++++++++++++++++
- .../src/engines/token-optimization/CLAUDE.md       | 20 ++++++++++++++++++++
- mcp-server/src/engines/wiring/CLAUDE.md            | 20 ++++++++++++++++++++
- scripts/append-closed-loop-india-section.mjs       | 22 ++++++++++++++++++++++
_(+1 more)_

## Lessons surfaced in commit body
- till captures):
- TILL contribute).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 288de9a63b23`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLOSED-LOOP-INTEGRATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._