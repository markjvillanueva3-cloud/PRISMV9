---
name: feedback_patch_sibling_queue_strategy
description: "How to handle the state/shared/dashboards/patches/ patch-sibling queue — it auto-replenishes from peer doc-lock deferrals (don't manually full-drain), archive tracked shared-tree files via git rm not bare mv (mv gets reverted), and check the ACTIVE machine profile when a cross-profile patch claims fixed."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.439Z
aliases: feedback_patch_sibling_queue_strategy
---


# Patch-sibling queue: don't manually full-drain; it auto-replenishes

**Rule:** `state/shared/dashboards/patches/*.md` is a **continuously-replenished stream**, not a fixed backlog. With 6-8 concurrent peers, CLAUDE.md/MEMORY.md are frequently peer-locked, and the patch-sibling convention (echo's `U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS` Stop hook) auto-WRITES a patch every time a chat defers a peer-locked doc-reflection. So new patches arrive as fast as you close them — manual full-drain is Sisyphean.

**Why:** verified 2026-06-02 (slot alpha) — main `H:/prism` held ~43 active patch-siblings; archiving 22 of them still left 43 (peers + git restored faster than the manual pass). The real fix is the *auto-apply/auto-archive* half that doesn't exist yet (the gate auto-writes but nothing auto-drains). Until then, treat the queue as a living stream.

**How to apply:**
- **Triage only YOUR lane** (alpha = token/memory/wiki/tribal/obsidian/cag). Leave other-lane patches (cad→delta, lathe→whiskey, hypermill→echo/kilo, system-viz→sierra) for their owners — don't blind-close non-lane work you can't verify (R12).
- **Archive tracked shared-tree files via `git rm` + commit, NOT bare `mv`.** A filesystem `mv` (without git rm) in the shared `H:/prism` tree gets REVERTED by any concurrent peer `git checkout/restore/stash` — the tracked active file reappears, leaving an untracked `_closed/` dupe. The slot worktree (own index, low contention) is where `git rm` archives stick + merge cleanly via golf. See [[reference_shared_tree_git_lock_contention_2026_06_02]].
- **Most CLAUDE-MD-PATCH-\* are doc-deferrals of ALREADY-SHIPPED work** (patch-siblings record shipped work whose doc-splice was peer-locked). Post the `claude-md-collapse-milestones` collapse (main CLAUDE.md = ~494 lean lines), the milestone-section splice is superseded — the canonical home is wiki/memory per the vault schema, which the patches already reference. Verify the wiki/memory home exists, then close; do NOT re-splice into the size-disciplined doc.
- **Cross-profile patch propagation gap:** a patch that claims "fixed in `C:/Users/<X>/.claude/settings.json`" only fixed THAT profile. The `c-to-h-mirror` is C:→H: on one machine, NOT cross-profile/cross-host. On a different active profile (e.g. `wompu` vs `Mark Villanueva`), the fix may be absent — **grep the ACTIVE machine's settings.json before closing a settings-fix patch.** (2026-06-02: the dead `rtk hook claude` PreToolUse:Bash hook was still live on `wompu` 14 days after the kilo patch "fixed" it on another profile — a real per-Bash-call token drain; removed via `scripts/fix-rtk-deadhook-settings.mjs`.)

Related: [[reference_shared_tree_git_lock_contention_2026_06_02]] · [[feedback_commit_to_slot_worktree]] · [[feedback_never_delete_only_disable]].
