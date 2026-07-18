---
name: reference-fleet-reaper-ship-collision
description: FLEET-REAPER-MS0 ship absorbed into peer commit 307de0713 (collision #7 — 2026-05-14)
aliases: reference_fleet_reaper_ship_collision
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.576Z
---


[[reference_fleet_reaper|FLEET-REAPER]]-MS0 shipped 2026-05-14 (slot golf/hygiene, claude-21b6f638,
1M-context Opus 4.7). All 9 [[reference_fleet_reaper|fleet-reaper]] files committed at sha `307de0713`
— **but the commit SUBJECT is a peer's: `[MAIN] [CLEANUP-MS0]/U-CLEANUP-G10:
viz-output-size watchdog — system-viz byte tracker + archive`.** This is
collision #7 in the H:/prism shared-tree multi-chat thrash sequence:

1. `reference_training_learning_ms0_u1_collision` — 5ae6f77c7
2. `reference_blueprint_ocr_training_ms1_collision` — 847b8ec8b
3. `reference_intel_ollama_p22_u03_collision`
4. `reference_coord_ms0_u4_collision` — b12074821
5. `reference_u_coord08_harden_ship` — f26565281 (engine)
6. `reference_u_coord08_harden_ship` — d912739b1 (test)
7. **[[reference_fleet_reaper|FLEET-REAPER]]-MS0 — 307de0713** (this entry)

**What landed in `307de0713`:**
- `scripts/fleet-reaper-sweep.mjs` (851 LOC — the brain)
- `.claude/helpers/process-slot-map.mjs` (606 LOC — PID→slot classifier)
- `.claude/helpers/fleet-reaper.test.mjs` (815 LOC, 66 vitest cases all green)
- `.claude/hooks/fleet-reaper-stop.mjs` (159 LOC)
- `.claude/helpers/install-fleet-reaper-task.ps1` (144 LOC)
- `.claude/commands/fleet-reaper.md` (197 LOC — force-added via `-f`, .claude/commands/ is gitignored but 24 sibling skills are already tracked)
- `knowledge/wiki/architecture/fleet-reaper.md` (139 LOC)
- `knowledge/wiki/architecture/.skill-triggers-fingerprint` (regen marker)
- `.gitignore` (+3: runtime artifacts)
- **2915 insertions / 1 deletion, 9 files** — verified via `git show --stat 307de0713`

**NOT in the commit (still uncommitted in working tree):**
- `CLAUDE.md` — auto-unstaged by `peer-file-isolation` hook (peer claude-82c64812 touched it 30m ago). Add as follow-up commit when peer claim ages out.
- `knowledge/wiki/architecture/_skill-triggers.jsonl` — same hook, same peer.

**Commit message structure (the giveaway):**
- Subject: peer's G10 unit
- First body section: peer's G10 deliverables (truncated at `per.`)
- Second body section: my full [[reference_fleet_reaper|FLEET-REAPER]]-MS0 commit message starting with `Files:` block — verbatim from `.commit-msg-fleet-reaper.txt`
- `--stat`: shows ONLY my 9 [[reference_fleet_reaper|fleet-reaper]] files (none of peer's viz-output-size files)

This indicates: peer pre-staged files for G10 but the commit-ownership-guard
swept my staged files in too. My commit-msg file was passed via `-F`, the
peer's was inline `-m` — git concatenated bodies but git's content tree was
ONLY my files.

**Verification (anyone, anytime):**
```bash
git -C H:/PRISM ls-files \
  .claude/helpers/process-slot-map.mjs \
  scripts/fleet-reaper-sweep.mjs \
  .claude/commands/fleet-reaper.md \
  knowledge/wiki/architecture/fleet-reaper.md \
  .claude/hooks/fleet-reaper-stop.mjs
# All 5 should print — they're committed.

git -C H:/PRISM log --oneline -- scripts/fleet-reaper-sweep.mjs
# → 307de0713 [MAIN] [CLEANUP-MS0]/U-CLEANUP-G10: ...
```

**3-of-3 scrutiny ledger** (session `claude-21b6f638` at
`mcp-server/data/state/SCRUTINY_LEDGER.json`):
- arm A (reviewer holistic): PASS — literal-ask mapping complete, 6 files mutually consistent, safety invariant verified across every classifyProcess branch.
- arm B (reviewer independent): PASS — 66 real-value assertions, firstSeenAt preservation + drift-guard pin canonical chat-slots values.
- arm C (analyst): PASS.
`cleared: true` in ledger.

**Do NOT re-create** the files — they ship. **Do NOT re-commit** under a
fresh subject — that would duplicate the file content in history. Just
document the collision and move on, per the standing pattern in
[[feedback_conflict_fork_rule]].

**Doctrine for future [[reference_fleet_reaper|fleet-reaper]] changes:**
Fork to `H:/prism-fleet-reaper` worktree for U-FLEET-REAPER02+ to avoid
collision #8 — per [[reference_reverse_merge_then_ff_only]] +
[[feedback_conflict_fork_rule]]. The shared-tree pattern is the precursor
to [[SLOT-WORKTREE-MS0]] (per-slot worktrees that prevent this thrash by
structure rather than by recovery tooling).

**Related:** [[reference_fleet_reaper]] (the architecture summary) ·
[[feedback_conflict_fork_rule]] · [[reference_reverse_merge_then_ff_only]] ·
[[reference_training_learning_ms0_u1_collision]] ·
[[reference_blueprint_ocr_training_ms1_collision]] ·
[[reference_coord_ms0_u4_collision]] ·
[[reference_u_coord08_harden_ship]] · wiki at
`knowledge/wiki/architecture/fleet-reaper.md`.
