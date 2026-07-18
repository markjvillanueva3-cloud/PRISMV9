---
name: reference_oscar_sfc_stale_fork_gap_false_positive_2026_06_15
description: LESSON (2026-06-15, slot:oscar) -- a base-model gap audit run on the slot/oscar worktree produced mostly FALSE-POSITIVE gaps because slot/oscar is 2,945 commits behind cad-fusion-live-ms0 (the integration branch), where substrate->vc / coolant->vc / hardness->kc were ALREADY solved (better-cited). Built U-PF-SUBSTRATE then REVERTED it on discovery. Rule: audit the INTEGRATION branch, not a stale slot fork, before declaring a base-model gap or building physics to close it.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.712Z
aliases: reference_oscar_sfc_stale_fork_gap_false_positive_2026_06_15
---


# SFC base-model gap audit on a stale fork = false positives (2026-06-15, slot:oscar)

## What happened
Operator: "give more accurate cutting data than gwizard/hsmadvisor across ALL sfc inputs (coolant
regimes/coating/substrate/hardness/machine/toolpath)." I ran a 6-agent citation-grounded audit of the SFC
engine, produced a gap map + build program (U-PF-MAP, commit a866edf2fc), and started building
U-PF-SUBSTRATE (a per-(tool,ISO) substrate->Vc factor). A memory recall surfaced prior commits
`658c8280fe` + `585584e3ae` -- I stopped and verified.

## The finding (why I reverted)
- `slot/oscar` is **2,945 commits BEHIND `cad-fusion-live-ms0`** (the integration branch), 163 ahead.
  It diverged at `4a55dc9`, BEFORE the OSCAR-SFC-9AXIS-MS0 work landed on the integration branch.
- The audit agents read the STALE slot/oscar tree, so most "gaps" were FALSE POSITIVES. On
  cad-fusion-live-ms0:
  - **substrate->vc SOLVED**: `tool-material-speed-override.ts` `getMaterialSpecificToolSpeedFactor` --
    per-(tool,ISO) cited cells (HSS x K 0.13 Machinery's Handbook 30th; ceramic x S 6.5 Kennametal;
    CBN x H 1.4). My U-PF-SUBSTRATE was the SAME idea but uncited round numbers -> strictly inferior.
  - **coolant->vc SOLVED** (the operator's MOST-emphasized item): `CoolantVcModifier` (6 ISO x 5 coolant,
    cited, tested, dispatcher-wired) consumed by calculate(); header says "do NOT fork a 2nd table."
  - **hardness->kc SOLVED**: `ISO_SUBGROUP_KC1`/`getSubgroupKc1` ARE consumed (only "dead" on the stale fork).
  - **coating->vc still OPEN even there (0 refs)** -- the one genuinely remaining gap.
- I REVERTED my U-PF-SUBSTRATE edits (constants.ts + engine + test) -- committing them would have been an
  inferior duplicate that conflicts with proven integration-branch code at merge.

## The rule (fleet-wide)
**Before declaring a base-model gap or building physics to close it, audit the INTEGRATION branch
(`cad-fusion-live-ms0`), not just your slot worktree** -- a slot fork can be thousands of commits stale, so
in-tree absence != fleet absence. This is the cross-branch form of "never claim absence without a deep
search" ([[feedback_never_claim_absence_without_deep_search]]) + "read before write" (R8). When a memory/
graph node hints a thing exists elsewhere, verify the integration branch with
`git show cad-fusion-live-ms0:<path>` + `git rev-list --count HEAD..cad-fusion-live-ms0` BEFORE building.

## What survives this session (still valid, net-new on slot/oscar)
- U-FT-CATALOG-COMPARE + U-FT-CATALOG-BIAS-REPORT (the OEM-milling comparison + bias report) -- net-new,
  committed, validated. See [[reference_oscar_sfc_closed_loop_finish_2026_06_15]].
- The gap-analysis METHOD + the coating->vc finding (the one real open gap).
- The U-PF-MAP spec now carries a CRITICAL CORRECTION header pointing here.

## Next correct action
SYNC slot/oscar to cad-fusion-live-ms0 (golf integration / rebase) BEFORE any further SFC base-model work;
then the only genuinely-open base-model gap to build is **coating->vc** (cited per-(coating,ISO) multiplier,
relative to baseParams.coatings[0]), on the proven foundation. [[reference_oscar_sfc_physics_fidelity_program_2026_06_15]]
