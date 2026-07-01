# CLAUDE.md patch sibling — cross-chat commit misattribution (hotel iter-3)

**Surface:** `H:/prism/CLAUDE.md` (golf-slot-only per OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF — `claude-md-golf-only-guard.mjs` hard-blocks work-chat Edit/Write)
**Written by:** claude-9c7dcf3e (hotel slot) — 2026-05-19T00:30:00Z
**Reason for patch-sibling:** `## Recent regressions` is a golf-drained inbox; work chats cannot Edit CLAUDE.md directly. Append protocol per JULIETT-12CHAT-ALLOCATION-MS0 PATCH-SIBLING convention.

## Append to `## Recent regressions` section (TOP — newest-first)

```
- 2026-05-18 | **Cross-chat commit misattribution — hotel iter-3 master-index work swept into peer juliett's commit** — hotel (`claude-9c7dcf3e`) was committing from the shared `H:/prism` main tree (branch `cad-fusion-live-ms0`), NOT slot-worktree-migrated. iter-3 `U-MIQ-CAPABILITY-MIN-UTIL` (4 files, +154/-8: `MasterIndexEngine.ts` capability-hit minUtilization exemption + 3 regression tests + wiki + memory) was staged when peer **juliett** ran a `git commit -a` from the same shared tree — both chats' staged paths collapsed into one git index, juliett's commit consumed hotel's content but kept juliett's own message → landed in `cdb5fe23a1` mislabeled `[JULIETT] [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP` (whose own described `PrintToProgramPipelineEngine.ts` edit is NOT in that commit's file list). Two `[JULIETT] [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP` commits exist (`cdb5fe23a1` + `ab4ed23db5`) committing different file sets — both cross-chat-swept. | fix: NONE — do NOT rewrite history (work is byte-correct on disk + in git + downstream-visible; rewriting breaks peers who already pulled). The 32/32 iter-3 tests pass; only the commit banner is wrong. Recovery is documentation, not git surgery: this entry + [[reference_cross_chat_commit_misattribution_2026_05_18]] are the manual override pointer (`cdb5fe23a1` real unit = `BACKEND-DEV-LOOP/U-MIQ-CAPABILITY-MIN-UTIL`) for any future MILESTONE_PROGRESS audit that crawls commit subjects. | root cause: SLOT-WORKTREE-MS0 protection (`worktree-commit-route` + `git-add-lane-guard` + `main-tree-write-block`) only arms once a chat is bound to a `slot/<nato>` branch; hotel had not migrated (gradual per-chat `/checkin-<slot>` Step 2c cutover) → unprotected shared index. | observed-by: claude-9c7dcf3e slot hotel, `/checkin-hotel /goal` BACKEND-DEV-LOOP arc. | lesson: untracked (`??`) doc files are SAFE from a peer `git commit -a` sweep (it only stages modified-tracked) — commit them with explicit pathspec `git commit -- <paths>`, never `-a`, when on the shared tree pre-migration. | verify: `git -C H:/prism show --stat cdb5fe23a1` → 4 files incl. `mcp-server/src/engines/MasterIndexEngine.ts` + `MasterIndexFilters.dispatcher.e2e.test.ts` (NOT the `PrintToProgramPipelineEngine.ts` the message describes); `cd H:/prism/mcp-server && node ./node_modules/vitest/vitest.mjs run src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts` → 32 passed.
```

## Apply protocol

When golf next drains the regression inbox (twice-daily F1 tool) or claims the golf slot:
1. Prepend the bullet above to the `## Recent regressions` section (newest-first ordering, immediately after the two `<!-- ... -->` comment lines).
2. Commit with subject `[BACKEND-DEV-LOOP]/U-MIQ-CAPABILITY-MIN-UTIL: append misattribution regression bullet from patch sibling`.
3. Delete this patch file.

## Cross-refs

- Memory: `knowledge/memories/reference/reference_cross_chat_commit_misattribution_2026_05_18.md` (indexed in MEMORY.md)
- Sister: `reference_master_index_filter_contract_fix_2026_05_18.md` (the actual iter-3 work content)
- Doctrine: [[reference_slot_worktree_activation_2026_05_16]] · [[feedback_chat_lane_discipline]] · [[feedback_conflict_fork_rule]]
