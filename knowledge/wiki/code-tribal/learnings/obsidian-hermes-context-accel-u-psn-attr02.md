# OBSIDIAN-HERMES-CONTEXT-ACCEL/U-PSN-ATTR02 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR02: PSN-attribution ledger rotation + fail-loud breadcrumb (papa)

**Commit:** `f03416b662ef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:26:07-05:00
**Tags:** obsidian-hermes-context-accel, u-psn-attr02, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR02: PSN-attribution ledger rotation + fail-loud breadcrumb (papa)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR02: PSN-attribution ledger rotation + fail-loud breadcrumb (papa)

Closes the arm-C 3-of-3 finding on U-PSN-ATTR01: the recordLegConsult tap is LIVE per-prompt across the 26-chat fleet, so the jsonl grew unbounded. One-generation rotation (current -> .1 at a 5MB cap, knob PRISM_PSN_ATTRIBUTION_MAX_BYTES) bounds growth AND the coverage read (file can never exceed cap). Adds a rate-limited first-failure stderr breadcrumb so a persistently-unwritable ledger is a diagnosable, not silent, no-op. Both fail-soft (rotation/breadcrumb never throw into the per-prompt path). +3 rotation tests (15/15); existing append-error test made hermetic.
```

## Files touched (3)
- scripts/lib/psn-attribution-lib.mjs      | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++----
- scripts/lib/psn-attribution-lib.test.mjs | 42 ++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 93 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f03416b662ef`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-HERMES-CONTEXT-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._