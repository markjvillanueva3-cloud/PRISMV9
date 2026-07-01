# HOTEL/U-CPM-SCHEDULING — [MAIN] [HOTEL]/U-CPM-SCHEDULING (slot:hotel iter16) [BOOTSTRAP-SLOT-ENFORCE]: G5 close-out — Critical Path Method (CPM) scheduling for production/job networks

**Commit:** `044eaba95d4b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T18:01:42-05:00
**Tags:** hotel, u-cpm-scheduling, auto-distilled

## Subject
[MAIN] [HOTEL]/U-CPM-SCHEDULING (slot:hotel iter16) [BOOTSTRAP-SLOT-ENFORCE]: G5 close-out — Critical Path Method (CPM) scheduling for production/job networks

## Body
```
[MAIN] [HOTEL]/U-CPM-SCHEDULING (slot:hotel iter16) [BOOTSTRAP-SLOT-ENFORCE]: G5 close-out — Critical Path Method (CPM) scheduling for production/job networks

NEW ALGORITHM: CriticalPathSchedulingFormula.ts (1 surface, full graph algorithm)

Closes G5 from the ERP-comparison audit. Given a DAG of tasks with durations + precedence constraints, scheduleCriticalPath() returns:
- ES (earliest start) / EF (earliest finish) via forward pass
- LS (latest start)   / LF (latest finish)   via backward pass
- total_slack = LS - ES (delay budget per task)
- critical_path = ordered chain of tasks where slack ≤ tolerance
- project_duration = max EF across all tasks
- topological_order for evaluation traceability

Hotel-soul:
- R12 fail-loud: cycles → throws (graph-integrity gate; unschedulable network refuses to compute rather than produce silently-wrong critical path); unknown predecessor refs, duplicate IDs, negative durations, self-loops all rejected
- deterministic: Kahn topological sort with id-ASC tie-break + successor/predecessor lists sorted for reproducible output
- Kelley-Walker 1959 algorithm: forward pass propagates ES, backward pass propagates LF starting from project_duration; slack = LS - ES

Reference: Kelley & Walker 1959 (DuPont/Remington Rand CPM original); Moder/Phillips/Davis "Project Management with CPM, PERT and Precedence Diagramming" 3e.

Tests 20/20:
- Textbook network (A→B,C; B→D; C→E; D,E→F) — project_duration=12, critical_path=A→C→E→F verified
- Forward pass ES/EF for path A(0,2)→C(2,9)→E(9,11)→F(11,12) numerically correct
- Backward pass shows B,D have slack=2 (non-critical), critical tasks have slack≈0
- Cycle detection: 2-cycle (A↔B), 3-cycle (A→B→C→A), self-loop all throw
- Edge cases: single task → critical; two parallel chains → max wins; zero-duration milestone; topological order preserves precedence
- R12: empty list, unknown predecessor 'GHOST', duplicate id, negative/NaN duration, empty id all throw

DISPATCHER WIRING: businessDispatcher.ts (+1 action: cpm_schedule)
PHONE-APP/PWA WIRING: prismBusiness.ts (+1 typed REST wrapper + 3 result interfaces — CpmTaskInput/CpmScheduledTask/CpmResult)

PSN synergy:
- Algorithms leg: CPM registered as canonical scheduling primitive
- Wiki leg: Kelley-Walker 1959 + Moder/Phillips/Davis references in doc string
- System Viz leg: cpm_schedule action trackable on next regen
- PRISM AI leg: production scheduler can now query the dispatcher for critical-path-aware job sequencing
- Engines leg: future SchedulingEngine can consume this primitive (job + machine + due-date → optimal schedule)

Closes G5 from 13-gap ERP-comparison audit. Total this /goal session: G1+G5+G8+G9+G10+G11+G11ext+G12+G13 = 8 of 13 gaps closed via 6 new algorithms + 3 new engines across 5 attributed commits (iter11/12/15/16) + 1 absorbed commit (iter13+14 in foxtrot a3da9d6c37). Remaining: G2 (AP-invoice OCR), G3 (Quote-to-PO automation), G4 (BOM management), G6 (EDI), G7 (Job Routing Templates).
```

## Files touched (5)
- .../CriticalPathSchedulingFormula.test.ts          | 175 +++++++++++++++
- .../algorithms/CriticalPathSchedulingFormula.ts    | 245 +++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  10 +
- mcp-server/web/src/api/prismBusiness.ts            |  30 +++
- 4 files changed, 460 insertions(+)

## Lessons surfaced in commit body
- wrong critical path); unknown predecessor refs, duplicate IDs, negative durations, self-loops all rejected

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 044eaba95d4b`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._