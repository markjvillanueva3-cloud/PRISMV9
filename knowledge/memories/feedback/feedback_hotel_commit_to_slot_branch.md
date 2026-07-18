---
name: feedback_hotel_commit_to_slot_branch
description: "RULE (operator 2026-06-10) — the hotel slot stages + commits its work to its OWN NATO-named branch `slot/hotel` (in the H:/prism-slot-hotel worktree), never directly to the shared MAIN tree. Resolves the multi-chat contention hotel hit on cad-fusion-live-ms0's businessDispatcher.ts."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_hotel_commit_to_slot_branch
---


# RULE — hotel commits to its own `slot/hotel` branch, not shared MAIN

**Operator directive (2026-06-10):** *"make a memory and rule for your domain to stage and commit to your own chat slot nato named branch to git tree."*

The hotel slot stages and commits its work to its **own NATO-named branch `slot/hotel`** — the branch checked out in the `H:/prism-slot-hotel` worktree. It does **not** commit directly to the shared MAIN tree (`cad-fusion-live-ms0` in `H:/prism`).

**Why:** On 2026-06-10, building the CRM auto-seed fix, hotel hit **active multi-chat contention** on MAIN's `mcp-server/src/tools/dispatchers/businessDispatcher.ts` — another chat was editing it live (git `M` + line numbers shifted +10 mid-session) and it carried *their* uncommitted changes. Committing there would have (a) clobbered their in-flight work and (b) swept their uncommitted changes into a hotel commit. Committing to hotel's own `slot/hotel` branch eliminates cross-chat thrash on shared HEAD and keeps hotel's work independently mergeable. This is the CLAUDE.md §Lane discipline + conflict-fork rule, now made the hotel default (also revives SLOT-WORKTREE-MS0, which shipped but the fleet never migrated onto — see [[reference_slot_worktree_activation_2026_05_16]]).

**How to apply:**
1. **Work in the `H:/prism-slot-hotel` worktree** (already on `slot/hotel`). Verify: `git -C H:/prism-slot-hotel rev-parse --abbrev-ref HEAD` → `slot/hotel`.
2. **Stage ONLY your own files** — `git add <specific paths>`, NEVER `git add -A`/`-u`. The worktree carries unrelated `M` files from other processes (e.g. mass `M .claude/commands-archive/*` from mirror/reference-inject); sweeping them into a hotel commit is a clobber.
3. **Commit prefix** `[hotel] [SCOPE]/U-ID: title` (slot-keyed; the slot/hotel branch is hotel's own, so the slot-commit-enforce/commit-ownership guards pass with this prefix).
4. **Sync-before-dispatcher-work:** ✅ **RECONCILED 2026-06-10** — `git merge cad-fusion-live-ms0 -X theirs` (merge `70566db`) brought slot/hotel CURRENT with main (was 4114 behind + 34K CRLF phantom-mods; `git checkout -- .` cleared the CRLF first, backup branch `backup/slot-hotel-pre-reconcile-2026-06-10` preserves the pre-state). 0 conflicts; slot/hotel = main + hotel's 27 unmerged files. npm-install'd → buildable (49/49 customer tests green). The CRM auto-seed (`c500f1b346`) shipped on this reconciled base. **Re-sync the same way whenever main diverges materially again** (was stale: HEAD 2026-05-30 vs MAIN's 05-31..06-10 NETPLAT-wiring/de-stub/iOS). Before building work that edits a MAIN-canonical file (the 879-action `businessDispatcher.ts` — the worktree copy is the stale 441-action one per [[reference_hotel_domain_status_2026_06_10]] §9), first bring `slot/hotel` current with `cad-fusion-live-ms0` (`git merge` or rebase) so you build on a non-stale base and merge-back is clean. **Engine-additive NEW files** (new `*.ts` engines/constants/tests) can be committed directly to `slot/hotel` without a sync — they don't collide.
5. **Reconcile to main:** golf merges `slot/hotel` → main per the §9 cross-tree cadence (build engine files in slot → golf merges → wire the new dispatcher action in MAIN post-merge). Hotel does not push to main directly.

**Anti-pattern that triggered this rule:** editing/committing `H:/prism` (cad-fusion-live-ms0) files while other chats are live in that shared tree. Hotel's soul already refuses `silent-financial-clobber`; this extends the no-clobber discipline to git. Related: [[feedback_commit_prefix_main_on_slot_tree]] (the inverse — when you MUST touch shared main, prefix `[MAIN]`), [[feedback_hotel_domain_status_2026_06_10]] (the work this rule governs).
