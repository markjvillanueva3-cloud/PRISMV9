---
name: reference_psn_automate_kernel_2026_05_23
description: PSN automation kernel shipped — script + skill + Stop hook + engine + 58 implementation plans for PSN-INCORPORATION-MS0 DL/ML/reasoning units. 3 commits this iter. MCP dispatcher wiring deferred to next iter due to budget+collision risk on 9900-LOC devDispatcher.ts.
aliases: reference_psn_automate_kernel_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.886Z
---


# PSN automation kernel (charlie /goal-7, 2026-05-23)

## What shipped (3 commits)

1. `9d2c0f952f` — `scripts/psn-incorp-automate.mjs` (160 LOC) + `.claude/hooks/stop-psn-automate-status.mjs` (105 LOC)
2. `0d8473a75b` — `.claude/commands/psn-automate.md` (skill, auto-discovered) + 58 implementation plans under `state/shared/specs/psn-incorp/<unit-id>.md`
3. `58a480d778` — `mcp-server/src/engines/PSNIncorporationOrchestratorEngine.ts` (180 LOC, 5 typed methods) + `__tests__/PSNIncorporationOrchestratorEngine.test.ts` (143 LOC, 13/13 PASS)

## Surface map

| Layer | File | Status |
|---|---|---|
| Script | `scripts/psn-incorp-automate.mjs` | ✅ shipped |
| Skill | `.claude/commands/psn-automate.md` | ✅ shipped (auto-discovered as `/psn-automate`) |
| Stop hook | `.claude/hooks/stop-psn-automate-status.mjs` | ✅ shipped (T3 advisory) |
| Engine | `mcp-server/src/engines/PSNIncorporationOrchestratorEngine.ts` | ✅ shipped (13/13 tests) |
| 58 plans | `state/shared/specs/psn-incorp/` | ✅ shipped |
| MCP dispatcher action | `prism_dev` (devDispatcher.ts) | ⚠ DEFERRED — see below |

## Engine API

```typescript
import { psnIncorporationOrchestratorEngine } from "./engines/PSNIncorporationOrchestratorEngine.js";

psnIncorporationOrchestratorEngine.listEligible();         // 58 eligible DL/ML/reasoning units
psnIncorporationOrchestratorEngine.planCoverage();         // {totalEligible, plansOnDisk, withPlans[], withoutPlans[]}
psnIncorporationOrchestratorEngine.pickForSlot("charlie"); // {slot, matched[], unmatched} via slot-soul regex
psnIncorporationOrchestratorEngine.getUnit(unitId);        // full envelope record
psnIncorporationOrchestratorEngine.readPlan(unitId);       // implementation plan markdown
```

## Why MCP-dispatcher wiring deferred

`devDispatcher.ts` is 9901 LOC; `devActionSchemas.ts` is 4030 LOC. Editing either at YELLOW context budget (64%+) with active peer contention (5+ peers online) is high collision risk. Per [[feedback_conflict_fork_rule]] — don't fight peer-claimed mega-files in main tree.

**Deferred wiring path** (next charlie iter or peer pickup):

1. Add to `devActionSchemas.ts`:
   ```typescript
   psn_incorp_list_eligible: z.object({}),
   psn_incorp_plan_coverage: z.object({}),
   psn_incorp_pick_for_slot: z.object({ slot: z.string() }),
   psn_incorp_get_unit: z.object({ unitId: z.string() }),
   psn_incorp_read_plan: z.object({ unitId: z.string() }),
   ```
2. Add to `devDispatcher.ts` z.enum action list + 5 case branches that import lazily and call engine methods.
3. Add 3-5 round-trip integration tests verifying dispatcher → engine → output.
4. Regen dispatcher digest: `node scripts/build-dispatcher-digest.mjs`

## PSN integration achieved this iter

| PSN Leg | Surface | Status |
|---|---|---|
| #1 Obsidian | memory feed via auto-Stop hook | ✅ |
| #2 PRISM OS | script + skill + Stop hook | ✅ |
| #3 Wiki | (deferred — peer claim risk on wiki dir; spec entry covers) | partial |
| #4 Memories | this reference + [[reference_psn_incorporation_ms0_2026_05_23]] | ✅ |
| #6 System Viz | 58 specs surface on next master-index regen | ✅ |
| #7 Engines | PSNIncorporationOrchestratorEngine | ✅ |
| #11 PRISM AI | (deferred — MCP dispatcher wiring on devDispatcher) | partial (engine ready, wiring next) |

## How the next slot (or charlie next session) picks this up

```bash
# 1. Re-run automation to refresh 58 plans
node scripts/psn-incorp-automate.mjs

# 2. Pick a charlie-domain unit
node scripts/psn-incorp-automate.mjs --slot charlie --json

# 3. Read the plan for the picked unit
cat state/shared/specs/psn-incorp/U-PSN-R2-REAS-04.md

# 4. Implement per the 8-step build template in the plan
# 5. Close out per feedback_roadmap_close_out (envelope flip + MILESTONE_PROGRESS + BUILD_STATE + chat-bus)

# OR (after MCP wiring done):
# prism_dev:psn_incorp_pick_for_slot { "slot": "charlie" }
```

## Charlie's wire-EDM picklist from the kernel

Per `pickForSlot("charlie")` regex match `\b(WEDM|wire|spark|recast|HAZ|kerf|flush|electrode|safety_gate|EDM)\b`:
- U-PSN-R2-REAS-03 — Self-Consistency on `wedm_safety_gate_evaluate` (S-cost)
- U-PSN-R2-REAS-04 — Chain-of-Verification inside safety gates (S-cost) ← TOP charlie pick
- U-PSN-R2-MFG-01 — NVIDIA Modulus PINN for WEDMThermalFieldEngine (L-cost; defer)
- U-PSN-R2-MFG-04 — GraphCast-pattern CFD surrogate for WEDM flushing (L-cost; defer)
- U-PSN-R3-SELF-01 — STaR bootstrap on WEDM reasoning traces (M-cost)
- U-PSN-R3-PEFT-05 — MoLE expert per slot domain → wire-EDM expert (M-cost)

## Cross-refs

- [PSN-INCORPORATION-MS0 envelope](mcp-server/data/milestones/PSN-INCORPORATION-MS0.json) — commit 4606d6066a
- [[reference_psn_incorporation_ms0_2026_05_23]] — envelope ship reference
- [[reference_psn_high_roi_audit_2026_05_23]] — R1 audit reference
- R1/R2/R3 specs in `state/shared/specs/` (commits 7636dc07bd, ffa7789cd8, 340385c95d)
- [[feedback_psn_definition]] — 11-leg PSN canonical map
- [[feedback_conflict_fork_rule]] — rationale for the MCP-dispatcher wiring deferral
