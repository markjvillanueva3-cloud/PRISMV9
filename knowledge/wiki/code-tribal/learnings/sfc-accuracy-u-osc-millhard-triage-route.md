# SFC-ACCURACY/U-OSC-MILLHARD-TRIAGE-ROUTE — [MAIN-FORCE] [SFC-ACCURACY]/U-OSC-MILLHARD-TRIAGE-ROUTE (slot:oscar): triage the ~107 MILL-HARD-MS1 failures + route to foxtrot (mill-hardening domain)

**Commit:** `55dac1597c2a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T17:08:55-05:00
**Tags:** sfc-accuracy, u-osc-millhard-triage-route, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-MILLHARD-TRIAGE-ROUTE (slot:oscar): triage the ~107 MILL-HARD-MS1 failures + route to foxtrot (mill-hardening domain)

## Body
```
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-MILLHARD-TRIAGE-ROUTE (slot:oscar): triage the ~107 MILL-HARD-MS1 failures + route to foxtrot (mill-hardening domain)

MILL-HARD-MS1.test.ts has ~107 PRE-EXISTING failures (108 before any oscar commit this session -- verified
not regressions). Oscar root-caused them (live-probed the orchestrator): they are spec-first tests for an
INCOMPLETE mill-hardening milestone -- 3 unbuilt SpeedFeedOrchestratorEngine output features:
(1) hardness-aware tool-steel ISO classification (~25: D2@30HRC should be annealed/P but the orchestrator
fuzzy-matches D2->hardened_steel/H ignoring hardness_hrc -- a real tool-steel SFC accuracy gap);
(2) the `ai_reasoning` output structure (~20: field is UNDEFINED, never populated);
(3) top-level force/MRR field names (~7: tests expect `tangential_force_N` top-level; orchestrator exposes
forces under a different shape -- a field-name mismatch, the underlying Kienzle force IS correct).
NONE are oscar-core Kienzle/Taylor/SFC-physics bugs. This is foxtrot's mill-hardening domain + a substantial
feature build outside oscar's SFC-physics lane, so oscar TRIAGED + ROUTED rather than built out-of-lane (R7 +
domain-galaxy doctrine: MILL-HARD = foxtrot). Full root-cause + per-feature build recommendations +
operator-verify-if-stale note in the spec; chat-bus work-handoff posted to foxtrot. Oscar made ZERO changes
to MILL-HARD-MS1 or the mill features (failing-set diffed before/after the HSS work = net 0).
```

## Files touched (2)
- state/shared/specs/MILL-HARD-MS1-TRIAGE-FOR-FOXTROT-2026-06-25.md | 63 +++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 63 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 55dac1597c2a`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._