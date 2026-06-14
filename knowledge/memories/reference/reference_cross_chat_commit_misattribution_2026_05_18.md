---
name: reference-cross-chat-commit-misattribution-2026-05-18
description: 2026-05-18 hotel — iter-3 master-index work (U-MIQ-CAPABILITY-MIN-UTIL, 4 files / +154/-8) got swept into peer juliett's commit cdb5fe23a1 labeled `[JULIETT] [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP`. The work is correct and on disk; only the commit-message banner is wrong. Two juliett commits exist with the IDENTICAL template title (cdb5fe23a1 + ab4ed23db5) committing different file sets. Cross-chat staging-area collision in shared `H:/prism` main tree — exactly what slot-worktree migration was designed to prevent. Hotel had not yet migrated to a slot worktree.
aliases: [cross-chat-commit-misattribution, Cross CHAT Commit Misattribution, reference-cross-chat-commit-misattribution-2026-05-18]
metadata:
  type: reference
---

# Cross-chat commit misattribution — 2026-05-18 hotel/juliett

**Slot:** hotel (`claude-9c7dcf3e`) — was on main tree `H:/prism`, branch `cad-fusion-live-ms0`, no slot worktree migration yet. Juliett peer ran a `git commit -a` (or equivalent) during the same window and swept up my staged iter-3 files.

## The collision

Hotel work in flight (iter-3, U-MIQ-CAPABILITY-MIN-UTIL):
- `mcp-server/src/engines/MasterIndexEngine.ts` (+13/-3)
- `mcp-server/src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts` (+78/-8 by stat — added a `capability min_utilization exemption` describe + scoped pre-existing test to `hit.source === "graph_node"`)
- `knowledge/wiki/architecture/master-index-filter-contract-fix.md` (+46)
- `knowledge/memories/reference/reference_master_index_filter_contract_fix_2026_05_18.md` (+25)

These four files (delta `+154/-8`) landed inside commit:

```
cdb5fe23a1 [JULIETT] [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP: AutoSpeedFeedEngine sync-pipeline skip surfaces as R12 warn (was silent debug)
```

The commit-message BODY describes a `PrintToProgramPipelineEngine.ts S4.5 block` edit — a file that is **NOT in the commit's file list**. Two `[JULIETT] [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP` commits exist on the branch (cdb5fe23a1 + ab4ed23db5); the second contains the wiki-propagation-watchdog work from yet another peer, also misattributed.

## Why this happened

Hotel was committing from the shared main tree (`H:/prism`) on branch `cad-fusion-live-ms0`. The SLOT-WORKTREE-MS0 protection (per-slot `H:/prism-slot-<nato>` worktrees on `slot/<nato>` branches) was NOT active for this hotel chat. When juliett's peer chat ran their commit, both chats' staged paths collapsed into one git index — last-writer-wins on the index → juliett's `git commit` consumed both chats' staged content but kept juliett's own commit message.

This is the **exact failure mode** the slot-worktree migration was designed to prevent. The migration is gradual per-chat per the `/checkin-<slot>` Step 2c cutover; hotel had not migrated yet.

## What's correct on disk

The actual code/doc artifacts in the commit ARE my iter-3 work, byte-for-byte. Git log archaeology can recover the real intent:
- Files touched: 4 (matches my iter-3 ship list exactly)
- Delta size: +154/-8 (matches the diff stat I produced)
- New describe block in test file: `capability min_utilization exemption` (3 cases)
- Wiki section header: `## iter-3 — capability hits exempt from minUtilization (U-MIQ-CAPABILITY-MIN-UTIL)`
- Memory frontmatter description updated to mention iter-3 + 32/32 tests

The juliett-claimed U-CAMX22-VISIBLE-SKIP work (which the message describes — `PrintToProgramPipelineEngine.ts` async-promise swallow + `log.debug → log.warn`) is NOT in this commit and is presumably lost or queued for re-commit.

## How to recover (if needed)

For this hotel iter-3:
- Don't rewrite history — the work is correct and downstream chats may already see it.
- File a regression entry pointing to `cdb5fe23a1` with the note "actual unit is U-MIQ-CAPABILITY-MIN-UTIL, mis-attributed to [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP at commit time" (this memory entry serves that purpose).
- Future audits crawling MILESTONE_PROGRESS by commit-subject will need a manual override entry pointing cdb5fe23a1 to BACKEND-DEV-LOOP/U-MIQ-CAPABILITY-MIN-UTIL.

For juliett (U-CAMX22-VISIBLE-SKIP):
- Inspect `PrintToProgramPipelineEngine.ts` working tree — if the changes the message describes are still present uncommitted, re-stage + re-commit under a new SHA. If reverted, re-do the work.

## Lesson

Two reinforcing doctrines:

1. **[[reference_slot_worktree_activation_2026_05_16]]** — slot worktree migration is not optional in multi-chat sessions. The shared main tree is a shared-index footgun.
2. **[[feedback_chat_lane_discipline]]** — `git commit -a` from any chat in the shared tree is a peer-clobbering operation. The slot-worktree-route hooks (`worktree-commit-route`, `git-add-lane-guard`, `main-tree-write-block`) prevent it once the slot is bound to `slot/<nato>` — but a not-yet-migrated chat is unprotected.

## Sister entries

- `[[reference_master_index_filter_contract_fix_2026_05_18]]` — the actual iter-3 work content
- `[[feedback_conflict_fork_rule]]` — escape hatch when migration isn't available mid-task
- `[[reference_per_slot_claim_ms0_2026_05_16]]` — unit-level peer-claim protection (orthogonal — protects unit selection, not commit staging)
