---
title: "reference-u-intake-check-wire-peer-absorption-2026-05-23"
name: reference-u-intake-check-wire-peer-absorption-2026-05-23
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_u_intake_check_wire_peer_absorption_2026_05_23.md
promoted_at: 2026-06-06T04:55:56.897Z
source_refs: 3
---

# U-DPM0-INTAKE-CHECK-WIRE — Peer-absorption disclosure (2026-05-23, slot:kilo iter2)

## What shipped

The `print_to_program_check_intake` MCP action is fully wired and tested. Verification:

```bash
$ cd H:/prism/mcp-server && npx vitest run src/__tests__/PrintToProgramCheckIntake.test.ts
PASS (7) FAIL (0)
```

Three changes constitute the complete unit:

| Change | File | Landed in commit |
|---|---|---|
| Engine: new `case "print_to_program_check_intake"` in calculate() switch (maps validateIntake → ValidationResult shape) | `mcp-server/src/engines/PrintToProgramPipelineEngine.ts` | **b925b381df** (slot:whiskey iter7, OBSIDIAN-INTELLIGENCE-MS3/A1 — ABSORBED, not mine) |
| Test: `PrintToProgramCheckIntake.test.ts` (7 vitest cases, all PASS) | `mcp-server/src/__tests__/PrintToProgramCheckIntake.test.ts` | **b925b381df** (slot:whiskey iter7 — ABSORBED, not mine) |
| Dispatcher: action enum `+1` (print_to_program_check_intake) + lazy-load case at lines ~7155-7162 | `mcp-server/src/tools/dispatchers/camDispatcher.ts` | **6ea81d124f** (slot:kilo iter2 — CLEAN) |

## Root cause

3rd recurrence of the pattern documented in [[reference_sf_psn_peer_sweep_recurrence_2026_05_22]] (juliett's 3× peer-sweep finding) and [[reference_u_sfpsn_05_peer_absorption_2026_05_23]] (5/23 same-day juliett finding):

1. **First commit attempt:** `git add` 3 files then `git commit -o` 3 paths. Lock-error on the `git commit` (4MB `index.lock` = active peer write).
2. **Wait 15s + retry:** still 4MB lock.
3. **Wait 45s + retry:** lock cleared; `git commit -o` ran — but during the 60+ seconds of stage-and-wait, peer (slot:whiskey) ran their own commit. The auto-unstage hook tried to unstage foreign files but the engine + test were already-staged by ME, not foreign. Whiskey's commit (whatever set of paths it used) ABSORBED my staged engine + test files into its diff.
4. **My retry then proceeded** — but only the camDispatcher.ts change remained unstaged in the index (because whiskey's commit had already cleared the staging area for the absorbed files). My `git commit -o` shipped only the dispatcher.

`git log --oneline -5 -- <engine>` confirms `b925b381df` is the most recent commit touching the engine, and `git show --stat b925b381df` would show whiskey's intended scope (silent-close-out link) plus my 2 absorbed files.

## Fix applied

**None — disclosure only**, per shared-tree no-history-rewrite discipline ([[feedback_no_git_stash_shared_tree]]). The 2 absorbed files are correctly authored under U-DPM0-INTAKE-CHECK-WIRE (this memo + the kilo-banner commit 6ea81d124f reference); whiskey's commit BANNER is broader than its actual scope but the file content is correct.

## Lessons (carried doctrine — 3rd recurrence in 2 days)

1. **Slot-worktree migration is the ONLY durable fix** — `/checkin-kilo` → step 2c migration to `H:/prism-slot-kilo`. Peer-sweep is impossible from a worktree peers don't share. Memory: [[reference_slot_worktree_activation_2026_05_16]].
2. **In the shared tree, do NOT stage files in advance of `git commit`.** Use `git commit -o <paths> -m "..."` with NO prior `git add` — but that only works for files already in the index (i.e., tracked + modified, NOT new files). NEW files (like my test) MUST be added first, which opens the staging window.
3. **Single-file commits per peer-churn window** — confirmed by juliett 5/22 (only the test file landed clean when committed alone). Multi-file new-test commits invite peer-sweep when the tree is contested.
4. **The `auto-unstage 0 foreign file(s)` hook message is misleading** when the peer commit already swept your files: by the time the hook runs, your files are no longer "staged" in your view of the index because the peer's commit cleared the staging area.

## Cost paid this session (full goal cycle iter 1 + iter 2)

- 3 commits total: 4f213f240c (iter1 config correction, CLEAN), 593a7c31b1 (iter2 audit-extend, CLEAN), 6ea81d124f (iter2 dispatcher wire, CLEAN, 1 file) + b925b381df (peer absorption of my 2 files)
- 1 misattribution requiring this disclosure memo
- ~3 wall-clock minutes burned on lock-contention retry cycles
- Net: complete unit shipped + working dispatcher path + 7/7 test PASS — but commit graph carries permanent slot-attribution drift

## Cross-refs

- [[reference_sf_psn_peer_sweep_recurrence_2026_05_22]] — original 3× juliett finding
- [[reference_u_sfpsn_05_peer_absorption_2026_05_23]] — same-day 5/23 juliett 101-file absorption
- [[reference_kilo_queue_revisit_2026_05_23]] — the audit trail this unit closes
- [[reference_slot_worktree_activation_2026_05_16]] — the durable migration fix
- [[feedback_no_git_stash_shared_tree]] — shared-tree no-rewrite discipline
- CLAUDE.md §Conflict-fork rule + §SLOT-WORKTREE-MS0 — doctrine reference

## Source

Promoted from memory [[reference_u_intake_check_wire_peer_absorption_2026_05_23]] (referenced 3x across the vault). The memory remains the editable source of truth.
