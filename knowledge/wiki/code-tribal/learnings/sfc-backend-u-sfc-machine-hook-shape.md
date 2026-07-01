# SFC-BACKEND/U-SFC-MACHINE-HOOK-SHAPE — [MAIN-FORCE] [SFC-BACKEND]/U-SFC-MACHINE-HOOK-SHAPE (slot:oscar): bridge flat SFC machine spec into the nested shape the machine-validation hooks read

**Commit:** `fff0dbaa185c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T22:15:13-05:00
**Tags:** sfc-backend, u-sfc-machine-hook-shape, auto-distilled

## Subject
[MAIN-FORCE] [SFC-BACKEND]/U-SFC-MACHINE-HOOK-SHAPE (slot:oscar): bridge flat SFC machine spec into the nested shape the machine-validation hooks read

## Body
```
[MAIN-FORCE] [SFC-BACKEND]/U-SFC-MACHINE-HOOK-SHAPE (slot:oscar): bridge flat SFC machine spec into the nested shape the machine-validation hooks read

Found via the live e2e visual pass: the SFC default JM preset (machine_max_rpm 8100, machine_power_kw 22.4) was BLOCKED -- pre-machine-completeness-gate FALSE-BLOCKED ('INCOMPLETE MACHINE DATA: spindle.max_rpm, spindle.power') and pre-machine-spindle-limits/power-budget silently SKIPPED, because those hooks (MachineValidationHooks.ts) read NESTED machine.spindle.* but the SFC sends FLAT machine_max_rpm/machine_power_kw (the orchestrator/OrchestratorInput contract). So the whole machine-safety hook suite was blind to the SFC's flat spec.

FIX: new pure buildSfcMachinePackage() (sfcMachineBridge.ts) builds { spindle: { max_rpm, power_kw, power_continuous_kw } } from the flat fields (snake_case + camelCase); calcDispatcher sets params.machine from it for sf_orchestrate/sf_quick before the pre-calc hooks run. Additive + scoped: SFC actions only, never overwrites an existing machine, returns undefined for absent/non-positive specs so the gate STILL blocks genuinely-incomplete data (NO weakening). The orchestrator reads only the flat fields, so the physics result is byte-identical -- this is a hook-layer annotation only.

VERIFIED: 7/7 unit tests against the REAL preMachineCompletenessGate (flat-blocks regression anchor, bridged-passes fix, absent-still-blocks no-weakening, exact toEqual shapes); tsc clean for these files (19 pre-existing errors are unrelated CAD/CAM peer files); 2-arm scrutiny PASS -- safety-physics S(x)=1.00 (no gate weakened; sibling spindle/power hooks now VALIDATE = safety-positive) + independent reviewer no findings. NOTE: the live :3100 bridge runs OLD compiled code until rebuilt -- the end-to-end gate-unblock (default-preset calc now producing a result) lands after a bridge rebuild+restart; the in-process unit tests are the proof today. Pairs with U-SFC-SURFACE-BLOCKED (the block is already surfaced in the UI).
```

## Files touched (4)
- mcp-server/src/tools/dispatchers/calcDispatcher.ts | 13 +++++++++++++
- mcp-server/src/utils/sfcMachineBridge.test.ts      | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/utils/sfcMachineBridge.ts           | 46 ++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 116 insertions(+)

## Lessons surfaced in commit body
- TILL blocks genuinely-incomplete data (NO weakening). The orchestrator reads only the flat fields, so the physics result is byte-identical -- this is a hook-layer annotation only.
- till-blocks no-weakening, exact toEqual shapes); tsc clean for these files (19 pre-existing errors are unrelated CAD/CAM peer files); 2-arm scrutiny PASS -- safety-physics S(x)=1.00 (no gate weakened; sibling spindle/power hooks now VALIDATE = safety-positive) + independent reviewer no findings. NOTE: the live :3100 bridge runs OLD compiled code until rebuilt -- the end-to-end gate-unblock (default-p

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fff0dbaa185c`
- Milestone envelope: `mcp-server/data/milestones/SFC-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._