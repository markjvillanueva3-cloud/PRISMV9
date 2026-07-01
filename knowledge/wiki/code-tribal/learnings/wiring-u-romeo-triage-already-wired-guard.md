# WIRING/U-ROMEO-TRIAGE-ALREADY-WIRED-GUARD — [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-ALREADY-WIRED-GUARD (slot:romeo): catch audit false-negatives (engines a dispatcher already routes to)

**Commit:** `0f01a00fcf81` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T22:44:17-05:00
**Tags:** wiring, u-romeo-triage-already-wired-guard, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-ALREADY-WIRED-GUARD (slot:romeo): catch audit false-negatives (engines a dispatcher already routes to)

## Body
```
[MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-ALREADY-WIRED-GUARD (slot:romeo): catch audit false-negatives (engines a dispatcher already routes to)

VERIFICATION-DRIVEN FIND: ran an exhaustive per-engine sweep of all 18 'unwired'
engines (grep each vs the dispatcher tree + read source). 16 confirmed correctly
classified. 2 surfaced:
- reactiveChainBootstrap: its only dispatcher 'ref' is a COMMENT (// Skipped (3):
  ... reactiveChainBootstrap) -> correctly WIRE-EXEMPT (no live wire).
- XProcNeuralAutoFireEngine: GENUINELY ALREADY WIRED -- aiReasoningDispatcher routes
  xproc_autofire_{activate,deactivate,status} -> import(.../XProcNeuralAutoFireEngine.js)
  .xProcNeuralAutoFireDispatch (routes :719-721, cases :2823-2825, export :493). But
  audit-unwired-engines.mjs LISTS IT UNWIRED -> a confirmed audit FALSE-NEGATIVE: the
  audit's reference detection misses engines wired via a *Dispatch WRAPPER-EXPORT (the
  dispatcher imports the engine FILE but calls a dispatch fn, not the singleton).

FIX (romeo-lane, the triage harness): added alreadyDispatcherWired() -- scans a
COMMENT-STRIPPED dispatcher corpus for the engine's source import (<Engine>.js).
classify() now runs this FIRST and returns a new ALREADY-WIRED verdict (owner=tango)
so romeo never double-wires a wired engine and the audit miss is surfaced. Added the
5th bucket to the run aggregation/JSON/markdown (section: 'ALREADY-WIRED -- audit
false-negative, flag tango'). Comment-aware so reactiveChainBootstrap's comment is
NOT mistaken for a wire (the same comment-strip discipline as the array-dispatch fix).

Live: XProc 1 cross-domain -> ALREADY-WIRED bucket; partition 0 wireable / 1 cross /
14 exempt / 2 review / 1 already-wired = 18 (complete). +4 tests (ALREADY-WIRED
regression on XProc, comment-not-counted on reactiveChainBootstrap, unreferenced
engine not flagged, partition includes the new bucket); repointed 4 logic-fixture
tests off now-wired engines (CounterfactualMill/TransferLearning/XProc/MITCourse all
became ALREADY-WIRED -- correct) to synthetic/non-wired fixtures. 20/20 pass.

TANGO HANDOFF: audit-unwired-engines.mjs should detect *Dispatch wrapper-export
wiring (match import(.../<Engine>.js) not just the singleton symbol); XProc is the
proof case, likely not the only one fleet-wide.
```

## Files touched (4)
- scripts/romeo-wiring-triage.mjs      | 47 ++++++++++++++++++++++++++++++++++++++++++++---
- scripts/romeo-wiring-triage.test.mjs | 61 +++++++++++++++++++++++++++++++++++++++++++++++--------------
- state/shared/ROMEO-WIRING-QUEUE.md   |  7 +++++--
- 3 files changed, 96 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0f01a00fcf81`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._