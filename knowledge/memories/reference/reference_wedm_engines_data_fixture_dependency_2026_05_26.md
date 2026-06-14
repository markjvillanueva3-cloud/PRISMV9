---
name: reference-wedm-engines-data-fixture-dependency-2026-05-26
description: WEDM* engines have a hidden filesystem dependency on data/state/WEDM_CAUSAL_GRAPH.json that breaks slot-worktree wiring without a fixture-copy step
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.036Z
aliases: reference_wedm_engines_data_fixture_dependency_2026_05_26
---


# WEDM* engines — hidden filesystem dependency (U-DEA-november-EXTRA83 rollback)

**Discovered:** 2026-05-26 during DEA-MS0 EXTRA83 wiring attempt (slot:november).

## Symptom
Calling `wedmWhatIfSimulatorEngine.simulate({...})` from a slot worktree throws:
```
ENOENT: no such file or directory, open 'H:\prism-slot-november\mcp-server\data\state\WEDM_CAUSAL_GRAPH.json'
```

## Root cause
`WEDMWhatIfSimulatorEngine` constructor injects `wedmProcessCausalityEngine` (the singleton from `WEDMProcessCausalityEngine.ts`). That engine eagerly reads `mcp-server/data/state/WEDM_CAUSAL_GRAPH.json` on construction. The file exists in `H:/prism/mcp-server/data/state/` (9.4 KB) but is NOT propagated to slot worktrees by the slot-worktree-cutover routine — only `src/`, `package.json`, `tsconfig.json`, and `.claude/` are routed.

This breaks any `wedm*` engine wiring from a slot worktree without a fixture-copy pre-step.

## Affected engines (unwired, all likely affected)
- `WEDMWhatIfSimulatorEngine` (confirmed)
- `WEDMMaintenanceSchedulerEngine` (likely — same causal-graph dep)
- `WEDMWireThreadingMinEngine` (likely)
- `WEDMPostDialectRouterEngine` (depends on dialect-rule data, likely similar)
- `WesternElectricRulesEngine` (SPC rules — likely self-contained)
- `ISO13485QMSEngine`, `ISO14971RiskManagementEngine`, `CAPAWorkflowEngine`,
  `DesignHistoryFileEngine` — pure-logic, no graph dep, safe to wire

## Workaround for future WEDM engine wiring
Two options:
1. **Fixture-copy at slot-cutover time** — add `data/state/WEDM_*.json` to the slot-worktree cutover routine (broader fix; benefits every WEDM engine simultaneously)
2. **Lazy-load with graceful empty-graph fallback** — modify `WEDMProcessCausalityEngine` to catch ENOENT and serve an empty graph; would let every WEDM engine wire from a fresh slot worktree without a fixture-copy

## Follow-up unit
`U-DEA-november-EXTRA83-WEDM-DATA-FIXTURE` — pick option 1 or 2, then return to EXTRA83 to wire `WEDMWhatIfSimulatorEngine` with the data dependency resolved.

## Doctrine link
R12 fail-loud — rather than wire a broken engine + add `try/catch` to hide the data dependency, we surface the gap as a real finding and pivot to a different unblocked engine. The engine itself isn't "wrong" — its packaging assumption (engine + data co-located) is incompatible with the slot-worktree filesystem-isolation model.
