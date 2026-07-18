# WIRE-UNWIRED-MS0/U-WIRE-ISA — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ISA: wire InverseStackupAllocatorEngine into prism_dev (2 actions)

**Commit:** `b41f9bf57daa` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T04:37:13-05:00
**Tags:** wire-unwired-ms0, u-wire-isa, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ISA: wire InverseStackupAllocatorEngine into prism_dev (2 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ISA: wire InverseStackupAllocatorEngine into prism_dev (2 actions)

Wires the inverse tolerance stackup allocator (LATHE-PRO-MS8) into
prism_dev. Given an assembly/functional tolerance budget, allocates
across component tolerances using one of 5 methods:
  - equal: same share per component
  - cost_weighted: Sutherland 1975 / Chase 1988 cost model
                   Ti ∝ (cost_weight)^(1/(k+2))
  - capability_weighted (Cpk): Ti ∝ 1 / Cpk
  - worst_case: arithmetic sum (conservative)
  - rss: root-sum-square (independent terms)

References: Chase 1988, Nigam 1995, ASME Y14.5-2018 §9.

Actions (both pure — no state mutation, no defer needed):
  - isa_allocate → allocate({assembly_tolerance_mm, method, components[]})
  - isa_stats    → getStats() — list 5 methods + cost models

DoS guards in schema:
  - assembly_tolerance_mm > 0
  - components: min 1, max 100 (DoS guard)
  - method enum: exactly the 5 AllocationMethod values
  - sign: union of 1 | -1 literals (matches engine type)

Test suite: 16 cases (6 schema + 2 stats + 5 allocate + 3 error) including:
  - VARIABILITY: all 5 allocation methods exercised (above the ≥3 floor)
  - Equal method invariant: 3 components → same allocated_tolerance_mm
  - Worst-case ≥ RSS conservativeness: wc method's wc-sum ≤ rss method's
  - Infeasibility: T=0.001 below 3×0.005 min → feasible:false
                   (slimResponse strips false; nullish-coalesce safe)
  - ROUTING PROOF: wire allocations byte-equal engine-direct allocate()
    (1e-9 tolerance for floating-point parity)

Pre-wire gate: existing InverseStackupAllocatorEngine test suite 11/11
PASS unmodified.

Session running total: 25 backend-dev wires / 110 actions / 25 engines.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.inverseStackupAllocator.test.ts     | 212 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  21 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  17 +-
- 3 files changed, 249 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b41f9bf57daa`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._