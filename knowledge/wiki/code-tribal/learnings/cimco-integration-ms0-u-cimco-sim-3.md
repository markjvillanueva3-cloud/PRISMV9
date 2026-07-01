# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-3 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-3 (slot:echo): cimco-ui-map.mjs ribbon navigation FSM + seed + tests

**Commit:** `fe540cc61c8e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T14:19:32-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-3, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-3 (slot:echo): cimco-ui-map.mjs ribbon navigation FSM + seed + tests

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-3 (slot:echo): cimco-ui-map.mjs ribbon navigation FSM + seed + tests

The per-step-verify FSM that drives the CIMCO Edit Machine-Simulation ribbon
reliably (fixes spec sec A2's "tab-invoke intermittently fails when the ribbon
isn't built yet"). Models the ribbon as a graph: screens=states, accDoDefaultAction
invokes=transitions. send -> RE-PROBE -> confirm expected screen -> next hop;
STOPS loud on drift. Clones scripts/winmax-ui-map.mjs structure; cimco-sim-driver.mjs
(SIM-2) live `drive` mode wires to navigateLive in SIM-5.

KEY ADAPTATION (CIMCO != WinMax): WinMax fingerprints by Edit AutomationIds (softkeys
graphical). CIMCO's Codejock XTP ribbon exposes ~1530 NAMED readable MSAA controls
(spec sec A7), so a screen signature = the set of distinctive named controls present
in a --op map read; transitions = --op invoke --name <X>. No vision tiebreak needed.

SAFETY (spec sec A4/B/E): navigateLive cannot return ok:true from an unrealized/
drifted/blocked landing (per-step verify, realization-floor halt); --allow-actions
only on invoke (not the read-only map probe); mock/fixture-only this unit.

FILES: scripts/cimco-ui-map.mjs (FSM) + state/shared/cimco/cimco-ui-map.json (seed:
editor/backplot/machine-sim-running + 2 transitions, control names from spec sec A7's
verified ribbon) + scripts/cimco-ui-map.test.mjs (31 tests, all green).

Per-file 2-reviewer scrutiny: code-analyzer + reviewer BOTH independently caught the
SUPERSET-STATE mis-ID hazard (machine-sim-running is a superset of backplot; disjoint
discriminators + larger-wins tiebreak would mis-ID the running state as backplot and
re-invoke Machine Simulation from an already-running state on real metal). Fixed via
discriminatorAbsent (backplot requires Solid Model ABSENT -> mutually exclusive).
Also fixed: count->walked realization floor (raw walked count), driver timeout
fail-CLOSED on ANY status===null (was &&!stdout, let partial-stdout timeout slip a
stale result), specificity-match confidence discounted to 0.9, record-screen oversize
seed warning, header test-claim corrected. The superset fix is pinned by a test
(running 5-control set resolves to machine-sim-running, never backplot).

Scope: U-CIMCO-SIM-3 (FSM + seed). NOT machine-bind (SIM-4), run-sim/finished-detect
(SIM-5), report-read (SIM-6), dispatcher (SIM-7), or live VMC-01 E2E.
```

## Files touched (7)
- data/databases/DB_MANIFEST.json                     |  48 +++++++---
- mcp-server/src/engines/JMDiePartLibraryEngine.ts    | 261 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-ui-map.mjs                            | 392 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-ui-map.test.mjs                       | 307 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/cimco/cimco-ui-map.json                |  51 +++++++++++
- state/shared/databases/jm-part-library-summary.json | 110 ++++++++++++++++++++++
- 6 files changed, 1157 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fe540cc61c8e`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._