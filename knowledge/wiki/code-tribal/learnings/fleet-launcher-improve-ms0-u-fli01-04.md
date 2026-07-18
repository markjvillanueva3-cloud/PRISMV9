# FLEET-LAUNCHER-IMPROVE-MS0/U-FLI01-04 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI01-04 (slot:tango): self-regen wrapper + recovery refresh + launch summary/log + smarter liveness-skip

**Commit:** `75cf39dbfa41` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T18:32:32-05:00
**Tags:** fleet-launcher-improve-ms0, u-fli01-04, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI01-04 (slot:tango): self-regen wrapper + recovery refresh + launch summary/log + smarter liveness-skip

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI01-04 (slot:tango): self-regen wrapper + recovery refresh + launch summary/log + smarter liveness-skip

Operator: "make further improvements to the launch prism fleet launcher" (all 4 approved).

U-FLI01 self-regen: the desktop entry LAUNCH-PRISM-FLEET.bat is now a THIN wrapper
that rebuilds the heavy launcher (LAUNCH-PRISM-FLEET.generated.bat) from the CURRENT
chat-slots.json on every launch -> the .bat can never go stale (the frozen-decision
class that caused the papa/sierra/tango bug). A .bat cannot safely overwrite itself
mid-run, so --no-thin lets the wrapper rebuild only the generated file it calls.

U-FLI02 recovery refresh: the wrapper runs recover-today-context.mjs --all before
launch so each slot's context-recovery file is current (works after midnight / more
work; no manual re-run).

U-FLI03 launch summary + log: slot-tab-boot.ps1 logs each tab's decision
(resumed/fresh/skipped/oversized) to state/shared/.fleet-launch-log.jsonl; the
generated launcher runs scripts/fleet-launch-summary.mjs at the end to print an
aggregate "N resumed / N fresh / N skipped (M of 24)" view. Marker-scoped to this
launch, log bounded to 500 lines, fail-soft.

U-FLI04 smarter liveness-skip: a slot already open no longer leaves a dead [SKIP]
tab -- clear message + cancellable 15s countdown then auto-close (press any key to
keep open; knob PRISM_LAUNCH_SKIP_NO_AUTOCLOSE=1; non-interactive -> keep open).

Files: scripts/fleet-launch-summary.mjs (NEW)+test, regenerate-launch-fleet.mjs
(thin wrapper + generated summary step + --no-thin)+test, .gitignore. Deployed
outside repo: slot-tab-boot.ps1 (10 log sites + smarter skip, AST-clean), desktop
LAUNCH-PRISM-FLEET.bat (thin) + .generated.bat (regenerated).

Verified: 7/7 tests; AST parse clean; end-to-end preflight chain (regen --no-thin
keeps wrapper at 1760B, recovery refreshes 11 files, mark writes); both output
modes; summary tally correct. Full fleet launch is the operator's to run.
```

## Files touched (6)
- .gitignore                               |   3 ++
- scripts/fleet-launch-summary.mjs         | 175 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fleet-launch-summary.test.mjs    |  89 ++++++++++++++++++++++++++++++++++++
- scripts/regenerate-launch-fleet.mjs      |  71 ++++++++++++++++++++++++++++-
- scripts/regenerate-launch-fleet.test.mjs |  63 ++++++++++++++++++++++++++
- 5 files changed, 400 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 75cf39dbfa41`
- Milestone envelope: `mcp-server/data/milestones/FLEET-LAUNCHER-IMPROVE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._