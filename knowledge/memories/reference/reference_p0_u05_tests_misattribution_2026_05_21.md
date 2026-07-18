---
name: reference-p0-u05-tests-misattribution-2026-05-21
description: P0-U05-TESTS (5 add'l router-boundary tests) absorbed into peer commit 2f228f6f1d (slot:juliett) due to shared-tree git-add window race — work shipped, banner wrong
aliases: reference_p0_u05_tests_misattribution_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.719Z
---


# P0-U05-TESTS shipped under juliett's banner — git-add window misattribution

2026-05-21, slot charlie /loop iter 4. After [[reference_infra_agi_router_ms2_p0_complete_2026_05_21]] the Stop hook blocked because `ProcessIntelligenceRouterEngine-orchestrate.test.ts` had only 6 cases (stop_on_unwired_assets requires ≥10). Added 5 more router-boundary tests (schema-version mismatch, null intent, missing-domain, stage-namespace check, input-immutability) totaling 11 cases.

**What happened:** the shared `H:/prism` tree was under heavy peer-commit contention (slot:juliett running FEATURE-GAP-AUDIT-MS0 + slot:echo running GOAL-SYNERGY meta-roost work). My `git commit -- <pathspec>` polled `.git/index.lock` for ~45s in the previous tool turn before the lock cleared. During that window, juliett's `git add` swept up my unstaged 5-test extension along with juliett's `SF-AUTOPILOT-ALIAS-RECONCILE` work — `git status -s ProcessIntelligenceRouterEngine-orchestrate.test.ts` returned empty (file already committed under SOMEONE'S commit), and `git log -3` showed commit `2f228f6f1d` (slot:juliett) listing the file with `83 +++++-` insertions.

**Diff verification:** `git show 2f228f6f1d -- mcp-server/src/__tests__/ProcessIntelligenceRouterEngine-orchestrate.test.ts` confirms ALL 5 tests + the `DOMAIN_AGI_CONTRACT_VERSION` import upgrade are in juliett's commit, exactly as I wrote them (comments, assertions, the R12 fail-loud null-intent test, the input-immutability snapshot pattern). Nothing was dropped; nothing was modified.

**Test result post-absorption:** `npx vitest run ProcessIntelligenceRouterEngine-orchestrate.test.ts` → **11/11 PASS**. `grep -c "^    it(" ...` → 11 cases. The ≥10-case Stop-hook gate is now satisfied — P0-U05-TESTS work effectively shipped, just under the wrong banner.

**Misattribution pattern — same class as:**
- [[reference_iter2_html_adopt_misattribution_2026_05_18]] — lima's iter2 HTML-adopt work swept into a peer commit
- [[reference_h8_misattribution_2026_05_20]] — echo's H8 stop-hook-aggregator absorbed into hotel's U-COST-DASHBOARD
- [[reference_sf_miner_misattribution_2026_05_21]] — recent SF-miner banner mismatch

**Why this keeps happening:** the shared-tree git-add window is ~milliseconds, but on a busy fleet (4-8 active slots committing simultaneously) those windows STACK. `git commit -- <pathspec>` is supposed to be pathspec-scoped, but the underlying staging happens against the WHOLE index — if a peer's `git add` lands its index update between my `commit`-time stage and `commit`-time write, my changes ride along on their commit's index state. Auto-unstage-foreign-files hook helps but only on OUR commit attempts, not on PEER `git add`s that absorb our unstaged work.

**The SLOT-WORKTREE-MS0 cutover is the canonical fix** ([[reference_slot_worktree_activation_2026_05_16]]): once charlie is on `slot/charlie` branch in `H:/prism-slot-charlie`, peer slots can't touch the same index. This session is still on `cad-fusion-live-ms0` in the shared tree because the loop bootstrapped from a chat that never ran `/checkin-charlie` Step 2c cutover. Future iterations should run the cutover before resuming `/loop` to eliminate this misattribution class entirely.

**Not blocking** — the work is in HEAD, the file has 11 tests, the Stop hook unblocks. Banner correction at the milestone level is via close-out doc reflection: MILESTONE_PROGRESS rebuild will index 2f228f6f1d's commit subject (`[FEATURE-GAP-AUDIT-MS0]/U-SF-AUTOPILOT-ALIAS-RECONCILE`) so the P0-U05-TESTS file change won't be credited to INFRA-AGI-ROUTER-MS2. To fix the credit attribution, manually add to the `[INFRA-AGI-ROUTER-MS2]` block in `state/shared/MILESTONE_PROGRESS.json` referencing 2f228f6f1d's file delta — or accept the misattribution and let the wiki+CLAUDE.md trail carry the real story (this entry + [[reference_infra_agi_router_ms2_p0_complete_2026_05_21]]).

**Next** — close iteration; /loop iter 5 starts INFRA-AGI-ROUTER-MS2 P1 (extract `domainAGIAdapterKit.ts` to deduplicate ~80 lines of contract-adapter scaffolding across P0-U02 mill / P0-U03 lathe / P0-U04 wedm). Predecessors: [[reference_infra_agi_router_ms2_p0_complete_2026_05_21]] · [[reference_infra_agi_router_ms2_p0_u04_2026_05_21]] · [[reference_infra_agi_router_ms2_p0_u03_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u02_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u01_2026_05_20]] · [[feedback_no_git_stash_for_test_investigation_2026_05_21]] · [[reference_iter2_html_adopt_misattribution_2026_05_18]] · [[reference_h8_misattribution_2026_05_20]].
