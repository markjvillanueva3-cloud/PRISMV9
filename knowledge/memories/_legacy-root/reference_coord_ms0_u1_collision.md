---
name: reference-coord-ms0-u1-collision
description: COORD-MS0/U-COORD01 close-out envelope flip absorbed into peer commit b1e73b4e8 (MACRO-PROGRAM-PIPELINE-MS0/MS0-U3) — 5th absorption collision in 48h. Annotation commit ffebe3857 carries canonical subject so build-milestone-progress.mjs regen picks it up.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.242Z
aliases: reference_coord_ms0_u1_collision
---


# COORD-MS0/U-COORD01 absorbed into MACRO-PROGRAM-PIPELINE commit (5th in 48h)

**When:** 2026-05-13 ~18:50 (charlie slot, claude-8912d4c2)

**What shipped:** AGENT_COORDINATION_SUMMARY.json close-out. All 3 deliverables were already extant (silent close-out debt — code shipped weeks ago, envelope status never flipped):
- Schema: 701 B JSON with schemaVersion 1
- Generator: `.claude/helpers/coordination-summary-generator.mjs` (110 LOC)
- Hot-path reader: `.claude/hooks/coordination-startup-banner.mjs:12` (the unit spec named this `session-awareness-inject.mjs` — renamed during impl)

**Collision:** The substantive edit (4 lines in `mcp-server/data/milestones/COORD-MS0.json` flipping U-COORD01.status pending → complete + adding completed_at/completed_by/ship_notes) was swept into peer commit `b1e73b4e8 [MAIN] [MACRO-PROGRAM-PIPELINE-MS0]/MS0-U3-CLOSEOUT: envelope flip for wafer-insert + top-hat generators`. The peer's commit `git show --stat` confirms 5 lines of COORD-MS0.json + 29 lines of MACRO-PROGRAM-PIPELINE-MS0.json. Files correct + tracked; commit message understates scope.

**Recovery:** Empty annotation commit `ffebe3857 [MAIN] [COORD-MS0]/U-COORD01: re-annotate (close-out subject lost to absorption b1e73b4e8)` so `build-milestone-progress.mjs`'s commit-subject regex `/\[([^\]]+)\]\/(U-[A-Za-z0-9]+...)/` picks up U-COORD01 attribution. Post-regen: MILESTONE_PROGRESS.json shows U-COORD01.shipped=true sha=ffebe3857 commitMilestoneTag=COORD-MS0; COORD-MS0 now 4/12 shipped (was 3/12).

**Pattern — 5th absorption collision in 48 hours:**
1. 2026-05-12 TRAINING-LEARNING-MS0/U1 absorbed into [ACP-MS0]/CLOSE-STATE-U01 (see [[reference_training_learning_ms0_u1_collision]])
2. 2026-05-12 BLUEPRINT-OCR-TRAINING-MS1 spec absorbed into [INFRA-CONSENSUS-WIRE-MS0]/P0-U01 (see [[reference_blueprint_ocr_training_ms1_collision]])
3. 2026-05-13 COORD-MS0/U-COORD04 absorbed into [TRAINING-LEARNING-MS0]/U-TL-U2-CLOSEOUT (see [[reference_coord_ms0_u4_collision]])
4. 2026-05-13 INTEL-OLLAMA-OBSIDIAN-MS0/P22-U03 absorbed into [TRAINING-LEARNING-MS0]/U-TL-U3-CLOSEOUT-V2 (see [[reference_intel_ollama_p22_u03_collision]])
5. 2026-05-13 COORD-MS0/U-COORD01 absorbed into [MACRO-PROGRAM-PIPELINE-MS0]/MS0-U3-CLOSEOUT (THIS)

**Systemic issue:** [[feedback_conflict_fork_rule]] requires forking to a sibling worktree on first contention. But the rule fires AFTER `commit-ownership-guard`/`git-anti-clobber` blocks — and absorption-collisions happen BEFORE those guards fire (because the working tree already has both chats' changes when `git add` runs). The fix needs to fire EARLIER — at `/checkin` or `/pick-unit`. Until then, charlie/delta/echo/foxtrot MUST fork BEFORE editing shared-state files.

**Standing rule going forward:** every chat MUST fork to a worktree at `/checkin` time when active peer chats are present in fleet-status. Edit code in the worktree; cross-worktree-firewall blocks shared-state edits from worktrees, so come back to main tree ONLY for the final close-out commit of envelope+regen surfaces.

**Tests:** 2-of-3 scrutiny PASS (reviewer A + reviewer B both verified the 3 deliverables + envelope integrity). Codex arm FAIL but blockers entirely on peer's SynergyClassifierEngine.ts (commit de919ace4 [AUTO-LEARNING-LOOP-MS0]/U-ALL04) — see [[feedback_scrutiny_codex_captures_peer_work]] for the scrutiny scope limitation.

Companion to [[reference_u_coord11_ipc]] (IPC server exposes same SUMMARY as RPC method for sub-2ms warm reads) and [[reference_h8_coordination_store]] (SQLite WAL replaces WORK_CLAIMS.json — orthogonal coord-state concern).


## Related
[[engines/SynergyClassifierEngine|SynergyClassifierEngine]] • [[skills/helpers|/helpers]] • [[skills/coordination-summary-generator|/coordination-summary-generator]] • [[skills/hooks|/hooks]] • [[skills/coordination-startup-banner|/coordination-startup-banner]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/completed|/completed]] • [[skills/ship|/ship]] • [[skills/checkin|/checkin]]