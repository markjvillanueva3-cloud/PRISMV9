# WIRE-UNWIRED-PAPA/U-WIRE-COOLANT-ADAPTER — [MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-COOLANT-ADAPTER (slot:papa->kilo): wire CoolantStrategyAdapter -> prism_cam

**Commit:** `d9097519780f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T13:14:11-05:00
**Tags:** wire-unwired-papa, u-wire-coolant-adapter, auto-distilled

## Subject
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-COOLANT-ADAPTER (slot:papa->kilo): wire CoolantStrategyAdapter -> prism_cam

## Body
```
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-COOLANT-ADAPTER (slot:papa->kilo): wire CoolantStrategyAdapter -> prism_cam

Wire CoolantStrategyAdapter (the orchestration Adapter, NOT the base engine which
is already wired) into prism_cam: coolant_select_orchestrated ->
selectCoolantOrchestrated(req). Hard-filters a domain catalog by operation_type,
scores viable candidates, routes the choice via the pipeline decision orchestrator.
Returns {coolant: CoolantCandidate, decision, no_candidates}.

- schema mirrors OrchestratedCoolantRequest (decision_point required min(1); enums
  for material_iso_group P/M/K/N/S/H + operation_type (8) + objective (5); domain
  loose since CoolantDomain falls back to machining). .passthrough(). Flows into
  MERGED_CAM_SCHEMAS. Inserted at the ACTIONS/schema/switch HEADS (clean anchors).
- type-safe: validated-boundary cast (as unknown as Parameters<...>[0]), no `as any`.
  papa wires the orchestrator method; does NOT edit the adapter's strategy/scoring
  (kilo owns it). Pre-toolpath safety hook does not block a non-toolpath coolant action.
- 8-test suite: engine-direct op-sensitivity (winner.applicable_ops includes the
  requested op -- a stub would fail the filter invariant), delivery-enum membership,
  faithful round-trip (no_candidates:false survives slim, coolant.id string, not
  blocked), 3 schema rejections (missing decision_point / invalid op / invalid ISO).
  tsc 0 new from coolant symbols (total 638 = pre-existing baseline; cam files clean).
  vitest 8/8 PASS.
- 2 per-file scrutiny agents: both VERDICT PASS, 0 P0/P1 (2 deferrable P3s).
- ANTI-SWEEP verified (post the iter8 incident): git-status-first + HUNK-LINE-RANGE
  diff (camDispatcher @1045+@2503, camActionSchemas @4 -- ONLY my insertion points,
  no peer hunks). No keyword-grep.

COMMIT TARGET: galaxy:kilo. kilo not live (no chat-slots heartbeat); its slot/kilo
worktree is a stale 3wk checkout that lacks CoolantStrategyAdapter.ts -> committing
there would dangle. Shared-tree [MAIN-FORCE] fallback w/ (slot:papa->kilo) per
feedback_papa_cross_galaxy_work_commit_to_their_worktrees.

dup-checked all branches: no peer wired this Adapter.
```

## Files touched (4)
- mcp-server/src/__tests__/camDispatcher.uwireCoolantAdapter.test.ts | 132 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/camActionSchemas.ts                         |  16 ++++++++++++++
- mcp-server/src/tools/dispatchers/camDispatcher.ts                  |   9 ++++++++
- 3 files changed, 157 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d9097519780f`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._