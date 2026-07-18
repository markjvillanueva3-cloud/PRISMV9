---
name: reference_untracked_strays_main_tree_2026_06_18
description: "cad-fusion-live-ms0 working dir has UNTRACKED stray engines (13,479 uncommitted) -- the tsc-error + unwired-engine counts are inflated by un-merged slot-branch work, not just committed-codebase gaps (slot:papa 2026-06-18)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.231Z
aliases: reference_untracked_strays_main_tree_2026_06_18
---


**Untracked strays inflate the tsc/unwired signals (slot:papa 2026-06-18, BUILD-QUALITY-PAPA).** Discovered while triaging the unwired-engine list with `tsc-route-by-owner.mjs`.

**The finding:** `mcp-server/src/engines/BayesianAcquisitionRefiner.ts` is **git-untracked** (`git status` shows `??`) on branch `cad-fusion-live-ms0` — it exists in the WORKING DIRECTORY (from an un-merged `slot/tango` branch, per its docstring) but was never committed on this branch. The Quality Dashboard shows **13,479 uncommitted** changes — a large fraction are untracked files like this (un-merged slot work + strays).

**Why it matters (recalibrates the tsc campaign + unwired audit):** `tsc --noEmit` and `audit-unwired-engines.mjs` both scan the **working directory**, which INCLUDES untracked files. So:
- The "89 tsc errors" and the "15 unwired engines" PARTLY reflect un-merged slot-branch work sitting in the working dir, NOT purely committed-codebase gaps.
- A chat trying to `git commit <stray>.ts` via pathspec gets "pathspec did not match any file(s) known to git" (it's untracked, not modified) — committing it requires `git add` which adds the WHOLE engine (an integration decision, not a clean tag/fix).
- This is why the priority-queue/BUILD_STATE keep offering "wire <engine>" for engines that are strays or closure-input/test-infra (false-positives).

**Owner / next step:** this is **git-tree-hygiene + integration** (golf owns fleet hygiene; GIT-TREE-REMEDIATION). The proper fix is to reconcile the un-merged slot branches into the integration branch (or prune genuine strays) so the working dir == the committed tree, after which the tsc/unwired counts become trustworthy. Papa should NOT blanket-`git add` untracked engines (conflates "add engine to branch" with "fix it").

**Papa's safe actions in this state:** (1) work on TRACKED files only (scripts/, tracked engines) so commits are clean; (2) tag verified-non-wireable engines WIRE-EXEMPT in the working dir (e.g. BayesianAcquisitionRefiner = closure-input — `refine()` takes `acquisitionFn:(x)=>number`, cannot cross a JSON dispatcher boundary) so the tag rides along when golf integrates the file; (3) surface the count-inflation so the fleet doesn't over-trust the raw tsc/unwired numbers. **NOT a new discovery** — the untracked main-tree state is KNOWN: golf documented it 2026-05-30 ([[reference_main_tree_untracked_work_2026_05_30]], then 34,200 untracked; now ~13,479, improving). This memo's net-new angle is the *build-signal* consequence: because tsc + the unwired-audit scan the working dir, those untracked files INFLATE the error/unwired counts. Sibling: [[reference_tsc_route_tool_2026_06_18]] · [[reference_papa_tsc_infra_2026_06_17]].
