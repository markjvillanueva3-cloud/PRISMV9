# QUOTING-SYNERGY-MS0/U-QP-AWARENESS-GEN-ROUTER-AWARE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-AWARENESS-GEN-ROUTER-AWARE (slot:charlie): restore awareness generator + fix the cry-wolf at root

**Commit:** `9d06bfd385d6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:38:20-05:00
**Tags:** quoting-synergy-ms0, u-qp-awareness-gen-router-aware, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-AWARENESS-GEN-ROUTER-AWARE (slot:charlie): restore awareness generator + fix the cry-wolf at root

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-AWARENESS-GEN-ROUTER-AWARE (slot:charlie): restore awareness generator + fix the cry-wolf at root

The quoting-awareness generator (scripts/generate-quoting-awareness.mjs) lived on
slot/charlie (commit 2451375423) but was never merged to this branch, so the
injected QUOTING-AWARENESS.md was a frozen stale snapshot — and its wiring-check
was the bug: hooksWired = (settingsText.match(/cost-bridge-on-/g)||[]).length
counted PER-FILE settings refs → 0, because the 16 cost-bridge-on-* hooks are
wired via the consolidated router cost-bridge-dispatch.mjs (1 spawn, all 16
rules), NOT individually. Hence the false '16 unwired / gotcha #7 deferred'
injected into every charlie session.

FIX (router-aware): routerWired = /cost-bridge-dispatch\.mjs/.test(settingsText);
hooksWired = routerWired ? hookNames.length : individualRefs. Recognizes the
consolidation pattern; falls back to per-file count if anyone wires them
individually (back-compat).

Recovered the generator + its test from git (2451375423), applied the fix, +2
tests (router-wires-all + no-router-fallback). 11/11 pass. LIVE-VALIDATED: regen
from the real filesystem now emits '16 cost-bridge hooks (16 wired)' and refreshed
stale counts (32→34 engines). This SUPERSEDES the hand-correction in
U-QP-COST-BRIDGE-WIRING-TRUTH (root fix > band-aid) — the awareness is
self-refreshing + accurate again.

Same cry-wolf CLASS as the fleet-task-health migration-freeze fix earlier this
session (a health/awareness counter blind to a consolidation pattern), now fixed
at the generator. NOTE: the slot/charlie copy still has the buggy version —
reconcile on next charlie-worktree merge. See reference_charlie_slot_misidentified_golf_2026_06_09.
```

## Files touched (4)
- scripts/generate-quoting-awareness.mjs      | 230 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/generate-quoting-awareness.test.mjs | 167 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/quoting/QUOTING-AWARENESS.md   |   8 ++---
- 3 files changed, 401 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- gotcha #7 deferred'
- NOTE: the slot/charlie copy still has the buggy version —

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9d06bfd385d6`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._